"""
AI Analysis routes - Using the same analyzer as the bot
"""
import re
import sys
import asyncio
from pathlib import Path
import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from .auth import get_current_user
from .premium import is_user_premium, get_user_limits
from ..database import execute_query, execute_write
from ._prices import fetch_ohlcv

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

_SYMBOL_RE = re.compile(r'^[\^A-Z0-9.\-=]{1,30}$')


def _safe(value, default=None, ndigits=None):
    """Convert a value to a JSON-safe Python scalar, replacing NaN/Inf with default."""
    try:
        v = float(value)
        if np.isnan(v) or np.isinf(v):
            return default
        return round(v, ndigits) if ndigits is not None else v
    except Exception:
        return default


def _sanitize(obj):
    """Recursively walk a dict/list and replace any NaN/Inf float with None."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float):
        if obj != obj or obj == float("inf") or obj == float("-inf"):  # NaN or Inf
            return None
        return obj
    # numpy scalars
    try:
        f = float(obj)
        if f != f or f == float("inf") or f == float("-inf"):
            return None
        return f
    except Exception:
        return obj


# ── Scan quota helpers ──────────────────────────────────────────────────────

async def _get_scans_today(user_id: int) -> int:
    from datetime import date
    today = date.today().isoformat()
    result = await execute_query(
        "SELECT COUNT(*) as cnt FROM web_scan_usage WHERE user_id = ? AND created_at LIKE ?",
        (user_id, f"{today}%")
    )
    return result[0]["cnt"] if result else 0


async def _check_scan_limit(user: dict) -> dict:
    user_id = user.get("id")
    limits  = await get_user_limits(user)
    daily   = limits.get("scanner_scans_per_day", 2)
    scans   = await _get_scans_today(user_id)
    if daily == -1:
        return {"can_scan": True, "scans_today": scans, "daily_limit": -1, "remaining": -1, "is_premium": True}
    remaining = max(0, daily - scans)
    return {
        "can_scan":    remaining > 0,
        "scans_today": scans,
        "daily_limit": daily,
        "remaining":   remaining,
        "is_premium":  False,
    }


async def _record_scan(user_id: int, market: str) -> None:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        "INSERT INTO web_scan_usage (user_id, market, created_at) VALUES (?, ?, ?)",
        (user_id, market, now)
    )


@router.get("/{symbol}")
@limiter.limit("10/minute")
async def analyze_asset(
    request: Request,
    symbol: str,
    timeframe: str = Query(default="1d", pattern="^(5m|15m|30m|1h|4h|1d|3d|1w|1mo)$")
):
    """Get AI analysis for an asset"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()

    try:
        # Get historical data
        period_map = {
            "5m":  "5d",  "15m": "5d",  "30m": "10d",
            "1h":  "1mo", "4h":  "3mo", "1d":  "6mo",
            "3d":  "1y",  "1w":  "2y",  "1mo": "5y",
        }
        # Map frontend timeframe keys to valid yfinance intervals
        interval_map = {"3d": "1d", "1w": "1wk"}
        actual_interval = interval_map.get(timeframe, timeframe)
        hist = await fetch_ohlcv(symbol, period=period_map.get(timeframe, "1mo"), interval=actual_interval)

        if hist.empty or len(hist) < 20:
            raise HTTPException(status_code=400, detail="Insufficient data for analysis")

        # Calculate technical indicators
        close = hist['Close']
        high = hist['High']
        low = hist['Low']
        volume = hist['Volume']

        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]

        # MACD
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        macd_hist = macd - signal

        # EMAs
        ema20 = close.ewm(span=20, adjust=False).mean()
        ema50 = close.ewm(span=50, adjust=False).mean()
        ema200 = close.ewm(span=200, adjust=False).mean() if len(close) >= 200 else None

        # Bollinger Bands
        bb_mid = close.rolling(window=20).mean()
        bb_std = close.rolling(window=20).std()
        bb_upper = bb_mid + (bb_std * 2)
        bb_lower = bb_mid - (bb_std * 2)

        # ATR
        tr = pd.concat([
            high - low,
            abs(high - close.shift(1)),
            abs(low - close.shift(1))
        ], axis=1).max(axis=1)
        atr = tr.rolling(window=14).mean().iloc[-1]

        # ADX
        adx_period = 14
        plus_dm = pd.Series(
            np.where((high.diff() > -low.diff()) & (high.diff() > 0), high.diff(), 0.0),
            index=high.index
        )
        minus_dm = pd.Series(
            np.where((-low.diff() > high.diff()) & (-low.diff() > 0), -low.diff(), 0.0),
            index=low.index
        )
        atr14 = tr.rolling(adx_period).mean()
        plus_di = 100 * (plus_dm.rolling(adx_period).mean() / atr14.replace(0, np.nan))
        minus_di = 100 * (minus_dm.rolling(adx_period).mean() / atr14.replace(0, np.nan))
        di_sum = (plus_di + minus_di).replace(0, np.nan)
        dx = 100 * (plus_di - minus_di).abs() / di_sum
        adx_val = float(dx.rolling(adx_period).mean().iloc[-1])
        if np.isnan(adx_val):
            adx_val = 0.0
        current_plus_di = float(plus_di.iloc[-1]) if not np.isnan(plus_di.iloc[-1]) else 0.0
        current_minus_di = float(minus_di.iloc[-1]) if not np.isnan(minus_di.iloc[-1]) else 0.0

        # Stochastic Oscillator (%K and %D)
        stoch_period = 14
        stoch_high = high.rolling(stoch_period).max()
        stoch_low = low.rolling(stoch_period).min()
        stoch_range = (stoch_high - stoch_low).replace(0, np.nan)
        stoch_k = 100 * (close - stoch_low) / stoch_range
        stoch_d = stoch_k.rolling(3).mean()
        current_stoch_k = float(stoch_k.iloc[-1]) if not np.isnan(stoch_k.iloc[-1]) else 50.0
        current_stoch_d = float(stoch_d.iloc[-1]) if not np.isnan(stoch_d.iloc[-1]) else 50.0

        # Bollinger %B
        bb_range = (bb_upper - bb_lower).replace(0, np.nan)
        bb_percent_b = float(((close.iloc[-1] - bb_lower.iloc[-1]) / (bb_upper.iloc[-1] - bb_lower.iloc[-1])) * 100)
        if np.isnan(bb_percent_b):
            bb_percent_b = 50.0

        # Fibonacci retracement levels (from 3-month high/low)
        lookback = min(60, len(close))
        fib_high = float(high.tail(lookback).max())
        fib_low = float(low.tail(lookback).min())
        fib_range_val = fib_high - fib_low
        fibonacci = {
            "high": round(fib_high, 2),
            "low": round(fib_low, 2),
            "levels": {
                "0": round(fib_high, 2),
                "23.6": round(fib_high - 0.236 * fib_range_val, 2),
                "38.2": round(fib_high - 0.382 * fib_range_val, 2),
                "50.0": round(fib_high - 0.5 * fib_range_val, 2),
                "61.8": round(fib_high - 0.618 * fib_range_val, 2),
                "78.6": round(fib_high - 0.786 * fib_range_val, 2),
                "100": round(fib_low, 2),
            }
        }

        # Current values — drop NaN (intraday last bar may be incomplete)
        close_clean = close.dropna()
        current_price = float(close_clean.iloc[-1])
        prev_price    = float(close_clean.iloc[-2]) if len(close_clean) >= 2 else current_price
        price_change  = ((current_price - prev_price) / prev_price * 100) if prev_price else 0.0

        # Volume analysis — use last non-NaN bar
        vol_clean = volume.dropna()
        avg_volume = volume.rolling(window=20).mean().dropna().iloc[-1] if len(volume) >= 20 else vol_clean.mean()
        current_volume = float(vol_clean.iloc[-1]) if not vol_clean.empty else 0.0
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

        # ── OBV (On-Balance Volume) ────────────────────────────────────────
        try:
            obv = (np.sign(close.diff()) * volume).fillna(0).cumsum()
            obv_ema = obv.ewm(span=20, adjust=False).mean()
            _obv_last = _safe(obv.iloc[-1], 0)
            _obv_ema_last = _safe(obv_ema.iloc[-1], 0)
            obv_trend = "bullish" if _obv_last > _obv_ema_last else "bearish"
            obv_slope = _safe(obv.diff(5).iloc[-1], 0)
        except Exception:
            obv_trend = "neutral"
            obv_slope = 0.0

        # ── Williams %R ────────────────────────────────────────────────────
        try:
            wr_period = 14
            wr_high = high.rolling(wr_period).max()
            wr_low  = low.rolling(wr_period).min()
            wr_range = (wr_high - wr_low).replace(0, np.nan)
            williams_r = -100 * (wr_high - close) / wr_range
            current_wr = _safe(williams_r.iloc[-1], -50.0)
        except Exception:
            current_wr = -50.0

        # ── CMF (Chaikin Money Flow) ────────────────────────────────────────
        try:
            clv = ((close - low) - (high - close)) / (high - low).replace(0, np.nan)
            cmf_raw = (clv * volume).rolling(20).sum() / volume.rolling(20).sum().replace(0, np.nan)
            current_cmf = _safe(cmf_raw.iloc[-1], 0.0)
        except Exception:
            current_cmf = 0.0

        # ── Multi-period momentum ──────────────────────────────────────────
        try:
            momentum_3d  = _safe((current_price - close.iloc[-4])  / close.iloc[-4]  * 100, 0.0) if len(close) > 3  else 0.0
            momentum_5d  = _safe((current_price - close.iloc[-6])  / close.iloc[-6]  * 100, 0.0) if len(close) > 5  else 0.0
            momentum_10d = _safe((current_price - close.iloc[-11]) / close.iloc[-11] * 100, 0.0) if len(close) > 10 else 0.0
            momentum_20d = _safe((current_price - close.iloc[-21]) / close.iloc[-21] * 100, 0.0) if len(close) > 20 else 0.0
        except Exception:
            momentum_3d = momentum_5d = momentum_10d = momentum_20d = 0.0

        # ── RSI Divergence detection ───────────────────────────────────────
        rsi_divergence = "none"
        try:
            if len(rsi.dropna()) >= 10:
                rsi_recent = rsi.dropna().tail(10)
                price_recent = close.loc[rsi_recent.index]
                price_swing_high = float(price_recent.iloc[:-3].max())
                price_swing_low  = float(price_recent.iloc[:-3].min())
                rsi_swing_high   = float(rsi_recent.iloc[:-3].max())
                rsi_swing_low    = float(rsi_recent.iloc[:-3].min())
                p_last = float(price_recent.iloc[-1])
                r_last = float(rsi_recent.iloc[-1])
                if not any(np.isnan(v) for v in [price_swing_high, price_swing_low, rsi_swing_high, rsi_swing_low, p_last, r_last]):
                    if p_last >= price_swing_high * 0.98 and r_last < rsi_swing_high * 0.95:
                        rsi_divergence = "bearish"
                    elif p_last <= price_swing_low * 1.02 and r_last > rsi_swing_low * 1.05:
                        rsi_divergence = "bullish"
        except Exception:
            rsi_divergence = "none"

        # ── Conviction signals ─────────────────────────────────────────────
        bullish_signals: list[str] = []
        bearish_signals: list[str] = []

        if current_rsi < 30:   bullish_signals.append("RSI survendu (<30)")
        elif current_rsi > 70: bearish_signals.append("RSI suracheté (>70)")
        elif 40 <= current_rsi <= 55: bullish_signals.append("RSI en zone neutre-haussière")

        if macd_hist.iloc[-1] > 0 and float(macd_hist.iloc[-2]) <= 0:
            bullish_signals.append("Croisement haussier MACD")
        elif macd_hist.iloc[-1] < 0 and float(macd_hist.iloc[-2]) >= 0:
            bearish_signals.append("Croisement baissier MACD")
        elif macd_hist.iloc[-1] > 0:
            bullish_signals.append("MACD positif")
        else:
            bearish_signals.append("MACD négatif")

        if current_price > float(ema20.iloc[-1]):  bullish_signals.append("Prix > EMA20")
        else:                                        bearish_signals.append("Prix < EMA20")
        if current_price > float(ema50.iloc[-1]):  bullish_signals.append("Prix > EMA50")
        else:                                        bearish_signals.append("Prix < EMA50")
        if ema200 is not None:
            if current_price > float(ema200.iloc[-1]): bullish_signals.append("Prix > EMA200 (zone dorée)")
            else:                                        bearish_signals.append("Prix < EMA200")

        if adx_val > 25:
            if current_plus_di > current_minus_di: bullish_signals.append(f"ADX fort ({adx_val:.0f}) tendance haussière")
            else:                                   bearish_signals.append(f"ADX fort ({adx_val:.0f}) tendance baissière")

        if current_stoch_k < 20:  bullish_signals.append("Stochastique survendu")
        elif current_stoch_k > 80: bearish_signals.append("Stochastique suracheté")
        if current_stoch_k > current_stoch_d and current_stoch_k < 75:
            bullish_signals.append("Croisement haussier Stochastique")
        elif current_stoch_k < current_stoch_d and current_stoch_k > 25:
            bearish_signals.append("Croisement baissier Stochastique")

        if current_wr < -80:  bullish_signals.append("Williams %R survendu")
        elif current_wr > -20: bearish_signals.append("Williams %R suracheté")

        if obv_trend == "bullish" and obv_slope > 0: bullish_signals.append("OBV en tendance haussière")
        elif obv_trend == "bearish" and obv_slope < 0: bearish_signals.append("OBV en tendance baissière")

        if current_cmf > 0.15:   bullish_signals.append(f"CMF positif ({current_cmf:.2f}) — afflux d'argent")
        elif current_cmf < -0.15: bearish_signals.append(f"CMF négatif ({current_cmf:.2f}) — sortie d'argent")

        if rsi_divergence == "bullish":  bullish_signals.append("Divergence haussière RSI/Prix")
        elif rsi_divergence == "bearish": bearish_signals.append("Divergence baissière RSI/Prix")

        if current_price < float(bb_lower.iloc[-1]):  bullish_signals.append("Prix sous la bande Bollinger basse")
        elif current_price > float(bb_upper.iloc[-1]): bearish_signals.append("Prix au-dessus de la bande Bollinger haute")

        if volume_ratio > 1.5:  bullish_signals.append(f"Volume élevé ({volume_ratio:.1f}x la moyenne)")
        elif volume_ratio < 0.5: bearish_signals.append("Volume très faible")

        if momentum_10d > 5:   bullish_signals.append(f"Momentum 10j fort (+{momentum_10d:.1f}%)")
        elif momentum_10d < -5: bearish_signals.append(f"Momentum 10j faible ({momentum_10d:.1f}%)")

        total_conviction_signals = len(bullish_signals) + len(bearish_signals)
        conviction_score = int(len(bullish_signals) / total_conviction_signals * 100) if total_conviction_signals > 0 else 50

        # ── IMPROVED 5-COMPONENT SCORING ──────────────────────────────────

        # 1. TECHNICAL SCORE (oscillators: RSI, MACD, Stochastic, Williams %R, Bollinger)
        technical_score = 50

        if current_rsi < 25:   technical_score += 20
        elif current_rsi < 30: technical_score += 15
        elif current_rsi < 40: technical_score += 8
        elif current_rsi > 80: technical_score -= 20
        elif current_rsi > 70: technical_score -= 15
        elif current_rsi > 60: technical_score -= 5

        if macd_hist.iloc[-1] > 0 and float(macd_hist.iloc[-2]) <= 0:
            technical_score += 20
        elif macd_hist.iloc[-1] < 0 and float(macd_hist.iloc[-2]) >= 0:
            technical_score -= 20
        elif macd_hist.iloc[-1] > 0:
            technical_score += 8
        else:
            technical_score -= 8

        if rsi_divergence == "bullish":  technical_score += 12
        elif rsi_divergence == "bearish": technical_score -= 12

        if current_stoch_k < 20 and current_stoch_k > current_stoch_d:   technical_score += 8
        elif current_stoch_k > 80 and current_stoch_k < current_stoch_d: technical_score -= 8
        elif current_stoch_k < 30: technical_score += 4
        elif current_stoch_k > 70: technical_score -= 4

        if current_wr < -80:   technical_score += 7
        elif current_wr > -20: technical_score -= 7

        if current_price < float(bb_lower.iloc[-1]):   technical_score += 5
        elif current_price > float(bb_upper.iloc[-1]): technical_score -= 5

        technical_score = max(0, min(100, technical_score))

        # 2. TREND SCORE (EMA alignment + ADX strength)
        trend_score = 50

        if current_price > float(ema20.iloc[-1]):  trend_score += 8
        else:                                        trend_score -= 8
        if current_price > float(ema50.iloc[-1]):  trend_score += 12
        else:                                        trend_score -= 12
        if ema200 is not None:
            if current_price > float(ema200.iloc[-1]): trend_score += 15
            else:                                        trend_score -= 15

        if adx_val > 30:
            if current_plus_di > current_minus_di: trend_score += 12
            else:                                   trend_score -= 12
        elif adx_val > 20:
            if current_plus_di > current_minus_di: trend_score += 6
            else:                                   trend_score -= 6

        trend_score = max(0, min(100, trend_score))

        # 3. VOLUME SCORE (OBV, CMF, volume ratio)
        volume_score = 50

        if obv_trend == "bullish" and obv_slope > 0:   volume_score += 18
        elif obv_trend == "bearish" and obv_slope < 0: volume_score -= 18
        elif obv_trend == "bullish":                    volume_score += 8
        else:                                            volume_score -= 8

        if current_cmf > 0.2:    volume_score += 15
        elif current_cmf > 0.1:  volume_score += 8
        elif current_cmf < -0.2: volume_score -= 15
        elif current_cmf < -0.1: volume_score -= 8

        if volume_ratio > 2.0:   volume_score += 12
        elif volume_ratio > 1.5: volume_score += 8
        elif volume_ratio > 1.2: volume_score += 4
        elif volume_ratio < 0.5: volume_score -= 10
        elif volume_ratio < 0.8: volume_score -= 5

        volume_score = max(0, min(100, volume_score))

        # 4. MOMENTUM SCORE (multi-period: 3d, 10d, 20d)
        momentum_score = 50

        if momentum_3d > 3:    momentum_score += 8
        elif momentum_3d > 1:  momentum_score += 4
        elif momentum_3d < -3: momentum_score -= 8
        elif momentum_3d < -1: momentum_score -= 4

        if momentum_10d > 8:    momentum_score += 15
        elif momentum_10d > 4:  momentum_score += 9
        elif momentum_10d > 1:  momentum_score += 4
        elif momentum_10d < -8: momentum_score -= 15
        elif momentum_10d < -4: momentum_score -= 9
        elif momentum_10d < -1: momentum_score -= 4

        if momentum_20d > 15:    momentum_score += 18
        elif momentum_20d > 8:   momentum_score += 10
        elif momentum_20d > 3:   momentum_score += 5
        elif momentum_20d < -15: momentum_score -= 18
        elif momentum_20d < -8:  momentum_score -= 10
        elif momentum_20d < -3:  momentum_score -= 5

        momentum_score = max(0, min(100, momentum_score))

        # 5. VOLATILITY / STABILITY SCORE
        bb_width_pct = _safe(
            (bb_upper.iloc[-1] - bb_lower.iloc[-1]) / bb_mid.iloc[-1] * 100, 20.0
        ) if _safe(bb_mid.iloc[-1], 0) > 0 else 20.0
        relative_atr = _safe(atr / current_price * 100, 2.0) if current_price > 0 else 2.0

        if bb_width_pct < 5:    volatility_score = 80  # tight band = low volatility
        elif bb_width_pct < 10: volatility_score = 65
        elif bb_width_pct < 18: volatility_score = 55
        elif bb_width_pct < 28: volatility_score = 40
        else:                   volatility_score = 30

        if relative_atr > 5:   volatility_score -= 10
        elif relative_atr < 1: volatility_score += 5
        volatility_score = max(0, min(100, volatility_score))

        # FINAL WEIGHTED SCORE
        final_score = int(
            technical_score  * 0.30 +
            trend_score      * 0.25 +
            volume_score     * 0.20 +
            momentum_score   * 0.20 +
            volatility_score * 0.05
        )
        final_score = max(0, min(100, final_score))

        # Determine trend (based on EMA alignment + ADX)
        if current_price > float(ema20.iloc[-1]) > float(ema50.iloc[-1]) and (ema200 is None or current_price > float(ema200.iloc[-1])):
            trend = "BULLISH"
        elif current_price > float(ema20.iloc[-1]) > float(ema50.iloc[-1]):
            trend = "BULLISH"
        elif current_price < float(ema20.iloc[-1]) < float(ema50.iloc[-1]):
            trend = "BEARISH"
        else:
            trend = "NEUTRAL"

        # Support/Resistance levels
        recent_low = low.tail(20).min()
        recent_high = high.tail(20).max()

        # Signal
        if final_score >= 75:
            signal_text = "STRONG BUY"
            signal_emoji = "🔥"
        elif final_score >= 60:
            signal_text = "BUY"
            signal_emoji = "🟢"
        elif final_score >= 40:
            signal_text = "HOLD"
            signal_emoji = "🟡"
        elif final_score >= 25:
            signal_text = "SELL"
            signal_emoji = "🟠"
        else:
            signal_text = "STRONG SELL"
            signal_emoji = "🔴"

        # Get fundamental data
        import yfinance as yf
        ticker = await asyncio.get_event_loop().run_in_executor(
            None, lambda: yf.Ticker(symbol)
        )
        info = ticker.info or {}

        # Fundamental metrics
        fundamentals = {
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "profit_margin": info.get("profitMargins"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
            "debt_to_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "beta": info.get("beta"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "50d_avg": info.get("fiftyDayAverage"),
            "200d_avg": info.get("twoHundredDayAverage"),
            "avg_volume": info.get("averageVolume"),
            "shares_outstanding": info.get("sharesOutstanding"),
            "short_ratio": info.get("shortRatio"),
            "target_price": info.get("targetMeanPrice"),
            "target_high": info.get("targetHighPrice"),
            "target_low": info.get("targetLowPrice"),
            "recommendation": info.get("recommendationKey"),
            "num_analysts": info.get("numberOfAnalystOpinions"),
        }

        # Company info
        company_info = {
            "name": info.get("shortName") or info.get("longName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "country": info.get("country"),
            "employees": info.get("fullTimeEmployees"),
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
        }

        # Get recent news (handles both old and new yfinance formats)
        news_items = []
        try:
            news = ticker.news[:5] if hasattr(ticker, 'news') and ticker.news else []
            for item in news:
                content = item.get("content") or {}
                provider = content.get("provider") or {}

                # Title: top-level or nested
                title = item.get("title") or content.get("title") or ""

                # Publisher: top-level or nested
                publisher = (
                    item.get("publisher")
                    or provider.get("displayName")
                    or "Yahoo Finance"
                )

                # Link: try all known yfinance field locations
                click_through = content.get("clickThroughUrl") or {}
                canonical     = content.get("canonicalUrl") or {}
                link = (
                    item.get("link")
                    or content.get("url")
                    or (click_through.get("url") if isinstance(click_through, dict) else click_through)
                    or (canonical.get("url") if isinstance(canonical, dict) else canonical)
                    or ""
                )
                if isinstance(link, dict):
                    link = link.get("url", "")

                # Date: Unix timestamp or ISO string
                date = item.get("providerPublishTime")
                if not date:
                    pub_date_str = item.get("pubDate") or content.get("pubDate") or ""
                    if pub_date_str:
                        try:
                            from datetime import timezone
                            dt = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
                            date = int(dt.timestamp())
                        except Exception:
                            date = None

                # Type
                item_type = item.get("type") or item.get("contentType") or ""

                if title:
                    news_items.append({
                        "title": title,
                        "publisher": publisher,
                        "link": link,
                        "date": date,
                        "type": item_type,
                    })

            # Translate titles to French
            try:
                import sys
                sys.path.insert(0, "/app")
                from utils.translate import translate_news_items
                news_items = translate_news_items(news_items)
            except Exception:
                pass
        except Exception:
            pass

        # Historical performance
        hist_1m = ((close.iloc[-1] - close.iloc[-22]) / close.iloc[-22] * 100) if len(close) > 22 else None
        hist_3m = ((close.iloc[-1] - close.iloc[-66]) / close.iloc[-66] * 100) if len(close) > 66 else None
        hist_6m = ((close.iloc[-1] - close.iloc[-132]) / close.iloc[-132] * 100) if len(close) > 132 else None
        hist_ytd = None
        try:
            ytd_start = close[close.index.year == close.index[-1].year].iloc[0]
            hist_ytd = ((close.iloc[-1] - ytd_start) / ytd_start * 100)
        except Exception:
            pass

        performance = {
            "1d": round(price_change, 2),
            "1w": round(((close.iloc[-1] - close.iloc[-6]) / close.iloc[-6] * 100), 2) if len(close) > 6 else None,
            "1m": round(hist_1m, 2) if hist_1m else None,
            "3m": round(hist_3m, 2) if hist_3m else None,
            "6m": round(hist_6m, 2) if hist_6m else None,
            "ytd": round(hist_ytd, 2) if hist_ytd else None,
        }

        # Volatility analysis
        daily_returns = close.pct_change().dropna()
        volatility_20d = daily_returns.tail(20).std() * np.sqrt(252) * 100
        volatility_60d = daily_returns.tail(60).std() * np.sqrt(252) * 100 if len(daily_returns) > 60 else None

        # Price targets based on ATR multiples + trend context
        atr_mult_bull = 4.0 if trend == "BULLISH" else 2.5
        atr_mult_base = 2.0 if trend == "BULLISH" else 1.0
        atr_mult_bear = -2.0 if trend != "BEARISH" else -4.0

        target_bull = round(current_price + atr * atr_mult_bull, 2)
        target_base = round(current_price + atr * atr_mult_base, 2)
        target_bear = round(current_price + atr * atr_mult_bear, 2)

        # Fundamental score (enhanced)
        fundamental_score = 50
        if fundamentals.get("pe_ratio"):
            pe = fundamentals["pe_ratio"]
            if 0 < pe < 12:   fundamental_score += 15
            elif pe < 18:     fundamental_score += 8
            elif pe < 30:     fundamental_score += 2
            elif pe > 60:     fundamental_score -= 15
            elif pe > 40:     fundamental_score -= 8
        if fundamentals.get("peg_ratio"):
            peg = fundamentals["peg_ratio"]
            if 0 < peg < 1:   fundamental_score += 12
            elif peg < 2:     fundamental_score += 5
            elif peg > 3:     fundamental_score -= 8
        if fundamentals.get("revenue_growth"):
            rg = fundamentals["revenue_growth"]
            if rg > 0.20:  fundamental_score += 12
            elif rg > 0.10: fundamental_score += 7
            elif rg > 0:    fundamental_score += 3
            elif rg < -0.05: fundamental_score -= 10
        if fundamentals.get("earnings_growth"):
            eg = fundamentals["earnings_growth"]
            if eg > 0.20:  fundamental_score += 8
            elif eg > 0.10: fundamental_score += 4
            elif eg < -0.10: fundamental_score -= 8
        if fundamentals.get("profit_margin"):
            pm = fundamentals["profit_margin"]
            if pm > 0.25:  fundamental_score += 8
            elif pm > 0.15: fundamental_score += 4
            elif pm < 0:   fundamental_score -= 12
        if fundamentals.get("roe"):
            roe = fundamentals["roe"]
            if roe > 0.20:  fundamental_score += 6
            elif roe > 0.12: fundamental_score += 3
            elif roe < 0:   fundamental_score -= 6
        if fundamentals.get("debt_to_equity"):
            de = fundamentals["debt_to_equity"]
            if de < 30:    fundamental_score += 5
            elif de > 150: fundamental_score -= 8
            elif de > 80:  fundamental_score -= 4
        if fundamentals.get("current_ratio"):
            cr = fundamentals["current_ratio"]
            if cr > 2.0:   fundamental_score += 4
            elif cr < 1.0: fundamental_score -= 6
        fundamental_score = max(0, min(100, fundamental_score))

        # Analyst sentiment
        analyst_sentiment = "neutral"
        if fundamentals.get("recommendation"):
            rec = fundamentals["recommendation"].lower()
            if "buy" in rec or "strong" in rec:
                analyst_sentiment = "bullish"
            elif "sell" in rec or "under" in rec:
                analyst_sentiment = "bearish"

        result = {
            "symbol": symbol,
            "timeframe": timeframe,
            "company": company_info,
            "price": {
                "current": _safe(current_price, 0.0, 2),
                "change": _safe(price_change, 0.0, 2),
                "high_24h": _safe(high.iloc[-1], 0.0, 2),
                "low_24h": _safe(low.iloc[-1], 0.0, 2),
            },
            "score": {
                "total": final_score,
                "technical": int(technical_score),
                "trend": int(trend_score),
                "volume": int(volume_score),
                "momentum": int(momentum_score),
                "volatility": int(volatility_score),
                "fundamental": fundamental_score,
                "conviction": conviction_score,
            },
            "conviction": {
                "score": conviction_score,
                "bullish_signals": bullish_signals,
                "bearish_signals": bearish_signals,
                "total_signals": total_conviction_signals,
            },
            "signal": {
                "text": signal_text,
                "emoji": signal_emoji
            },
            "trend": trend,
            "indicators": {
                "rsi": {
                    "value": _safe(current_rsi, 50.0, 1),
                    "signal": "oversold" if current_rsi < 30 else "overbought" if current_rsi > 70 else "neutral",
                    "divergence": rsi_divergence,
                },
                "macd": {
                    "value": _safe(macd.iloc[-1], 0.0, 4),
                    "signal_line": _safe(signal.iloc[-1], 0.0, 4),
                    "histogram": _safe(macd_hist.iloc[-1], 0.0, 4),
                    "signal": "bullish" if _safe(macd_hist.iloc[-1], 0) > 0 else "bearish"
                },
                "ema": {
                    "ema20": _safe(ema20.iloc[-1], None, 2),
                    "ema50": _safe(ema50.iloc[-1], None, 2),
                    "ema200": _safe(ema200.iloc[-1], None, 2) if ema200 is not None else None
                },
                "bollinger": {
                    "upper": _safe(bb_upper.iloc[-1], None, 2),
                    "middle": _safe(bb_mid.iloc[-1], None, 2),
                    "lower": _safe(bb_lower.iloc[-1], None, 2),
                    "position": "upper" if current_price > _safe(bb_upper.iloc[-1], current_price + 1)
                                else "lower" if current_price < _safe(bb_lower.iloc[-1], current_price - 1)
                                else "middle",
                    "percent_b": _safe(bb_percent_b, 50.0, 1),
                    "width_pct": _safe(bb_width_pct, 20.0, 1),
                },
                "adx": {
                    "value": _safe(adx_val, 0.0, 1),
                    "plus_di": _safe(current_plus_di, 0.0, 1),
                    "minus_di": _safe(current_minus_di, 0.0, 1),
                    "signal": "strong_bull" if adx_val > 25 and current_plus_di > current_minus_di
                              else "strong_bear" if adx_val > 25
                              else "weak",
                },
                "stochastic": {
                    "k": _safe(current_stoch_k, 50.0, 1),
                    "d": _safe(current_stoch_d, 50.0, 1),
                    "signal": "oversold" if current_stoch_k < 20 else "overbought" if current_stoch_k > 80 else "neutral",
                },
                "williams_r": {
                    "value": _safe(current_wr, -50.0, 1),
                    "signal": "oversold" if current_wr < -80 else "overbought" if current_wr > -20 else "neutral",
                },
                "obv": {
                    "trend": obv_trend,
                    "slope": "up" if obv_slope > 0 else "down",
                },
                "cmf": {
                    "value": _safe(current_cmf, 0.0, 3),
                    "signal": "bullish" if current_cmf > 0.1 else "bearish" if current_cmf < -0.1 else "neutral",
                },
                "momentum": {
                    "3d":  _safe(momentum_3d,  0.0, 2),
                    "5d":  _safe(momentum_5d,  0.0, 2),
                    "10d": _safe(momentum_10d, 0.0, 2),
                    "20d": _safe(momentum_20d, 0.0, 2),
                },
                "atr": _safe(atr, 0.0, 4),
                "atr_pct": _safe(relative_atr, 2.0, 2),
                "volume_ratio": _safe(volume_ratio, 1.0, 2),
            },
            "fibonacci": fibonacci,
            "levels": {
                "support":    _safe(recent_low, None, 2),
                "resistance": _safe(recent_high, None, 2),
                "pivot":      _safe((recent_high + recent_low + current_price) / 3, None, 2),
            },
            "risk": {
                "suggested_sl":              _safe(current_price - (atr * 2), None, 2),
                "suggested_tp":              _safe(current_price + (atr * 3), None, 2),
                "suggested_sl_tight":        _safe(current_price - atr, None, 2),
                "suggested_tp_conservative": _safe(current_price + (atr * 1.5), None, 2),
                "risk_reward": 1.5,
                "atr_stop_pct": _safe(atr / current_price * 200, None, 2),
            },
            "fundamentals": fundamentals,
            "performance": performance,
            "volatility": {
                "20d": _safe(volatility_20d, None, 2),
                "60d": _safe(volatility_60d, None, 2) if volatility_60d is not None else None,
            },
            "targets": {
                "bull": _safe(target_bull, None, 2),
                "base": _safe(target_base, None, 2),
                "bear": _safe(target_bear, None, 2),
                "analyst_mean": fundamentals.get("target_price"),
                "analyst_high": fundamentals.get("target_high"),
                "analyst_low":  fundamentals.get("target_low"),
            },
            "analyst_sentiment": analyst_sentiment,
            "news": news_items,
        }

        return _sanitize(result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan-limit")
async def get_scan_limit(current_user: dict = Depends(get_current_user)):
    """Get user's remaining daily scan quota."""
    return await _check_scan_limit(current_user)


ASSET_NAMES: dict[str, str] = {
    # ── Indices ────────────────────────────────────────────────────────────
    "^FCHI": "CAC 40", "^GDAXI": "DAX 40", "^STOXX50E": "Euro Stoxx 50",
    "^FTSE": "FTSE 100", "^N225": "Nikkei 225", "^HSI": "Hang Seng",
    "000001.SS": "Shanghai Composite", "^KS11": "KOSPI", "^BSESN": "SENSEX",
    "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "NASDAQ Composite",
    "^RUT": "Russell 2000",
    # ── ETFs ───────────────────────────────────────────────────────────────
    "SPY": "SPDR S&P 500", "QQQ": "Invesco QQQ (NASDAQ)", "DIA": "SPDR Dow Jones",
    "IWM": "iShares Russell 2000", "XLK": "Tech Select SPDR", "XLF": "Financial Select SPDR",
    "XLE": "Energy Select SPDR",
    # ── Commodities ────────────────────────────────────────────────────────
    "GC=F": "Or (Gold)", "SI=F": "Argent (Silver)", "PL=F": "Platine",
    "PA=F": "Palladium", "CL=F": "Pétrole Brut WTI", "BZ=F": "Pétrole Brent",
    "NG=F": "Gaz Naturel", "HO=F": "Fioul de Chauffage", "RB=F": "Essence (Gasoline)",
    "HG=F": "Cuivre", "ALI=F": "Aluminium",
    "ZC=F": "Maïs", "ZW=F": "Blé", "ZS=F": "Soja",
    "KC=F": "Café", "SB=F": "Sucre", "CT=F": "Coton",
    "OJ=F": "Jus d'Orange", "CC=F": "Cacao", "LBS=F": "Bois d'Œuvre",
    "LE=F": "Bœuf (Live Cattle)", "GF=F": "Bœuf Engraissé", "HE=F": "Porc (Lean Hogs)",
    # ── Crypto ─────────────────────────────────────────────────────────────
    "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum", "BNB-USD": "BNB", "XRP-USD": "XRP",
    "SOL-USD": "Solana", "ADA-USD": "Cardano", "AVAX-USD": "Avalanche",
    "DOT-USD": "Polkadot", "MATIC-USD": "Polygon", "ATOM-USD": "Cosmos",
    "NEAR-USD": "NEAR Protocol", "APT-USD": "Aptos", "SUI-USD": "Sui",
    "SEI-USD": "Sei", "TIA-USD": "Celestia", "INJ-USD": "Injective",
    "MINA-USD": "Mina Protocol", "EGLD-USD": "MultiversX", "FTM-USD": "Fantom",
    "HBAR-USD": "Hedera", "ALGO-USD": "Algorand", "ICP-USD": "Internet Computer",
    "ARB-USD": "Arbitrum", "OP-USD": "Optimism",
    "UNI-USD": "Uniswap", "LINK-USD": "Chainlink", "AAVE-USD": "Aave",
    "MKR-USD": "Maker", "CRV-USD": "Curve DAO", "LDO-USD": "Lido DAO",
    "GMX-USD": "GMX", "DYDX-USD": "dYdX", "PENDLE-USD": "Pendle",
    "JUP-USD": "Jupiter", "ORCA-USD": "Orca",
    "GRT-USD": "The Graph", "FIL-USD": "Filecoin", "RNDR-USD": "Render",
    "OCEAN-USD": "Ocean Protocol", "ROSE-USD": "Oasis Network",
    "ANKR-USD": "Ankr", "ENS-USD": "Ethereum Name Service", "SNX-USD": "Synthetix",
    "IMX-USD": "Immutable X", "SAND-USD": "The Sandbox", "MANA-USD": "Decentraland",
    "AXS-USD": "Axie Infinity", "GALA-USD": "Gala Games",
    "BEAM-USD": "Beam", "MAGIC-USD": "Treasure (MAGIC)", "PRIME-USD": "Echelon Prime",
    "DOGE-USD": "Dogecoin", "SHIB-USD": "Shiba Inu", "PEPE-USD": "Pepe",
    "FLOKI-USD": "Floki", "BONK-USD": "Bonk", "WIF-USD": "dogwifhat",
    "LTC-USD": "Litecoin", "BCH-USD": "Bitcoin Cash", "XLM-USD": "Stellar",
    "ETC-USD": "Ethereum Classic", "XMR-USD": "Monero", "ZEC-USD": "Zcash",
    "BAT-USD": "Basic Attention Token", "ZIL-USD": "Zilliqa",
    "IOTA-USD": "IOTA", "VET-USD": "VeChain", "HOT-USD": "Holo",
    # ── Japon ──────────────────────────────────────────────────────────────
    "7203.T": "Toyota", "9984.T": "SoftBank Group", "6758.T": "Sony Group",
    "6861.T": "Keyence", "7974.T": "Nintendo", "9433.T": "KDDI",
    "6501.T": "Hitachi", "6702.T": "Fujitsu", "6752.T": "Panasonic",
    "4063.T": "Shin-Etsu Chemical", "8306.T": "Mitsubishi UFJ", "9432.T": "NTT",
    "7267.T": "Honda Motor", "2914.T": "Japan Tobacco", "6594.T": "Nidec",
    "6367.T": "Daikin Industries",
    # ── Hong Kong / Chine ──────────────────────────────────────────────────
    "9988.HK": "Alibaba Group", "0700.HK": "Tencent Holdings",
    "0941.HK": "China Mobile", "1299.HK": "AIA Group",
    "0939.HK": "CCB (Construction Bank)", "9618.HK": "JD.com",
    "3690.HK": "Meituan", "9999.HK": "NetEase", "6690.HK": "Haier Smart Home",
    "1810.HK": "Xiaomi", "9888.HK": "Baidu",
    # ── Corée du Sud ───────────────────────────────────────────────────────
    "005930.KS": "Samsung Electronics", "000660.KS": "SK Hynix",
    "035420.KS": "NAVER", "051910.KS": "LG Chem",
    "035720.KS": "Kakao", "068270.KS": "Celltrion",
    "207940.KS": "Samsung Biologics", "003670.KS": "POSCO Holdings",
    # ── Inde ───────────────────────────────────────────────────────────────
    "RELIANCE.NS": "Reliance Industries", "TCS.NS": "Tata Consultancy",
    "INFY.NS": "Infosys", "HDFCBANK.NS": "HDFC Bank",
    "WIPRO.NS": "Wipro", "ICICIBANK.NS": "ICICI Bank",
    "BHARTIARTL.NS": "Bharti Airtel", "ADANIENT.NS": "Adani Enterprises",
    "TATAMOTORS.NS": "Tata Motors", "BAJFINANCE.NS": "Bajaj Finance",
    "SUNPHARMA.NS": "Sun Pharma", "LTIM.NS": "LTIMindtree",
    # ── Singapour / Taïwan / Australie ─────────────────────────────────────
    "D05.SI": "DBS Group", "O39.SI": "OCBC Bank", "U11.SI": "UOB",
    "2330.TW": "TSMC", "2317.TW": "Hon Hai (Foxconn)", "2308.TW": "Delta Electronics",
    "CBA.AX": "Commonwealth Bank", "BHP.AX": "BHP Group",
    "CSL.AX": "CSL Limited", "WES.AX": "Wesfarmers", "ANZ.AX": "ANZ Bank",
    # ── Europe (tickers peu lisibles) ──────────────────────────────────────
    "ASML.AS": "ASML Holding", "INGA.AS": "ING Groep",
    "PHIA.AS": "Philips", "AD.AS": "Ahold Delhaize",
    "UMI.BR": "Umicore", "ABI.BR": "AB InBev",
    "NESN.SW": "Nestlé", "ROG.SW": "Roche", "NOVN.SW": "Novartis", "UHR.SW": "Swatch Group",
    "SAN.MC": "Banco Santander", "IBE.MC": "Iberdrola", "TEF.MC": "Telefónica",
    "ISP.MI": "Intesa Sanpaolo", "ENI.MI": "Eni", "ENEL.MI": "Enel",
    "VOW3.DE": "Volkswagen", "SIE.DE": "Siemens", "BAS.DE": "BASF",
    "BAYN.DE": "Bayer", "ALV.DE": "Allianz", "MBG.DE": "Mercedes-Benz",
    "SAP.DE": "SAP", "ADS.DE": "Adidas", "IFX.DE": "Infineon",
    "DHER.DE": "Delivery Hero", "DBK.DE": "Deutsche Bank",
    "ENR.DE": "Siemens Energy", "RWE.DE": "RWE",
    "ULVR.L": "Unilever", "SHEL.L": "Shell", "AZN.L": "AstraZeneca",
    "HSBA.L": "HSBC", "BP.L": "BP", "GSK.L": "GSK",
    "LSEG.L": "London Stock Exchange", "RIO.L": "Rio Tinto",
    "GLEN.L": "Glencore", "DGE.L": "Diageo", "BA.L": "BAE Systems",
    "TSCO.L": "Tesco",
    "MC.PA": "LVMH", "OR.PA": "L'Oréal", "AIR.PA": "Airbus",
    "SAN.PA": "Sanofi", "BNP.PA": "BNP Paribas", "SU.PA": "Schneider Electric",
    "TTE.PA": "TotalEnergies", "EN.PA": "Bouygues", "CA.PA": "Carrefour",
    "SAF.PA": "Safran", "RMS.PA": "Hermès", "CS.PA": "AXA",
    "DSY.PA": "Dassault Systèmes", "EL.PA": "EssilorLuxottica",
    "SGO.PA": "Saint-Gobain", "STM.PA": "STMicroelectronics",
    "VIE.PA": "Veolia", "RI.PA": "Pernod Ricard",
    "ACA.PA": "Crédit Agricole", "GLE.PA": "Société Générale",
    "HO.PA": "Thales", "ERF.PA": "Eurofins Scientific",
    "ALO.PA": "Alstom", "TCH.PA": "Téléperformance",
    "EDEN.PA": "Edenred", "CRBP2.PA": "Crédit Agricole Île-de-France",
}


@router.get("/scan/{market_key}")
@limiter.limit("2/minute")
async def scan_market(
    request: Request,
    market_key: str,
    min_score: int = Query(default=60, ge=0, le=100),
    limit: int = Query(default=20, le=50),
    opportunity_type: str = Query(default="all"),
    current_user: dict = Depends(get_current_user),
):
    """Scan a market for opportunities — parallel, enriched scoring (RSI+MACD+EMA+Volume+Momentum)"""
    from config import MARKETS

    # ── Quota check ────────────────────────────────────────────────────────
    quota = await _check_scan_limit(current_user)
    if not quota["can_scan"]:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Limite quotidienne atteinte. Passez Premium pour des scans illimités.",
                "scans_today": quota["scans_today"],
                "daily_limit": quota["daily_limit"],
                "remaining": 0,
            }
        )

    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    assets = MARKETS[market_key]["assets"]

    async def _analyze(symbol: str):
        try:
            hist = await fetch_ohlcv(symbol, period="3mo", interval="1d")
            if hist is None or len(hist) < 20:
                return None

            close  = hist["Close"].astype(float)
            high   = hist["High"].astype(float)
            low    = hist["Low"].astype(float)
            vol    = hist["Volume"].astype(float)
            n      = len(close)

            price    = float(close.iloc[-1])
            if price <= 0:
                return None

            # ── Performance ────────────────────────────────
            chg_1d = float((price - close.iloc[-2]) / close.iloc[-2] * 100) if n >= 2 else 0.0
            chg_1w = float((price - close.iloc[-5]) / close.iloc[-5] * 100) if n >= 5 else 0.0
            chg_1m = float((price - close.iloc[-22]) / close.iloc[-22] * 100) if n >= 22 else 0.0

            # ── RSI ────────────────────────────────────────
            delta = close.diff()
            gain  = delta.where(delta > 0, 0.0).rolling(14).mean()
            loss  = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
            rsi   = float(100 - 100 / (1 + gain.iloc[-1] / loss.iloc[-1])) if float(loss.iloc[-1]) > 0 else 50.0

            # ── MACD ───────────────────────────────────────
            ema12 = close.ewm(span=12, adjust=False).mean()
            ema26 = close.ewm(span=26, adjust=False).mean()
            macd  = ema12 - ema26
            sig   = macd.ewm(span=9, adjust=False).mean()
            macd_val    = float(macd.iloc[-1])
            macd_above  = macd_val > float(sig.iloc[-1])
            macd_cross  = macd_above and float(macd.iloc[-2]) <= float(sig.iloc[-2])  # fresh bull cross

            # ── EMA trend ──────────────────────────────────
            ema20  = float(close.ewm(span=20, adjust=False).mean().iloc[-1])
            ema50  = float(close.ewm(span=50, adjust=False).mean().iloc[-1]) if n >= 50 else ema20
            above_ema20 = price > ema20
            above_ema50 = price > ema50

            # ── Volume ─────────────────────────────────────
            avg_vol   = float(vol.mean())
            cur_vol   = float(vol.iloc[-1])
            vol_ratio = cur_vol / avg_vol if avg_vol > 0 else 1.0
            vol_spike = vol_ratio > 1.8

            # ── 52-week range ──────────────────────────────
            high_52w = float(high.max())
            low_52w  = float(low.min())
            near_breakout  = (price / high_52w) >= 0.96   # within 4% of 52w high
            near_support   = (price / low_52w) <= 1.10    # within 10% of 52w low
            pct_from_high  = (price - high_52w) / high_52w * 100

            # ── Bollinger Band ─────────────────────────────
            bb_mid  = close.rolling(20).mean()
            bb_std  = close.rolling(20).std()
            bb_up   = float((bb_mid + 2 * bb_std).iloc[-1])
            bb_low_ = float((bb_mid - 2 * bb_std).iloc[-1])
            bb_pct  = float((price - bb_low_) / (bb_up - bb_low_) * 100) if bb_up != bb_low_ else 50.0
            bb_squeeze = float((bb_up - bb_low_) / float(bb_mid.iloc[-1]) * 100) < 5.0

            # ── Scoring ────────────────────────────────────
            score = 50

            # RSI (max ±25)
            if rsi < 25:        score += 25
            elif rsi < 32:      score += 18
            elif rsi < 40:      score += 10
            elif rsi > 78:      score -= 22
            elif rsi > 70:      score -= 12
            elif rsi > 60:      score -= 5

            # MACD (max +18)
            if macd_cross:      score += 18
            elif macd_above:    score += 9
            else:               score -= 8

            # EMA trend (max +12)
            if above_ema20 and above_ema50: score += 12
            elif above_ema20:               score += 6
            elif not above_ema20 and not above_ema50: score -= 10

            # Volume (max +10)
            if vol_spike:               score += 10
            elif vol_ratio > 1.3:       score += 5
            elif vol_ratio < 0.6:       score -= 5

            # Momentum 1 week (max +10)
            if chg_1w > 8:      score += 10
            elif chg_1w > 4:    score += 6
            elif chg_1w > 1.5:  score += 3
            elif chg_1w < -8:   score -= 10
            elif chg_1w < -4:   score -= 6

            # Near breakout bonus / near support bounce bonus
            if near_breakout and macd_above:  score += 5
            if near_support and rsi < 40:     score += 5

            # Bollinger squeeze pending breakout
            if bb_squeeze and vol_spike:  score += 5

            score = max(0, min(100, int(score)))

            # ── Signal & trend label ───────────────────────
            if score >= 80:   signal = "STRONG BUY"
            elif score >= 65: signal = "BUY"
            elif score >= 45: signal = "HOLD"
            elif score >= 30: signal = "SELL"
            else:             signal = "STRONG SELL"

            if above_ema20 and above_ema50 and macd_above:    trend = "HAUSSIER"
            elif not above_ema20 and not above_ema50:          trend = "BAISSIER"
            else:                                               trend = "NEUTRE"

            # ── Opportunity tags ───────────────────────────
            tags = []
            opp_type = "momentum"
            if macd_cross:
                tags.append("Croisement MACD")
                opp_type = "breakout"
            if rsi < 35:
                tags.append(f"RSI survendu ({rsi:.0f})")
                opp_type = "reversal"
            if vol_spike:
                tags.append(f"Vol. x{vol_ratio:.1f}")
            if near_breakout:
                tags.append("Proche 52w high")
                opp_type = "breakout"
            if bb_squeeze:
                tags.append("Squeeze BB")
                opp_type = "breakout"
            if chg_1w > 5 and not tags:
                tags.append(f"+{chg_1w:.1f}% / semaine")
            if near_support and rsi < 40:
                tags.append("Rebond support")
                opp_type = "reversal"
            opportunity = " · ".join(tags[:2]) if tags else "Momentum"

            return {
                "symbol":       symbol,
                "name":         ASSET_NAMES.get(symbol, symbol),
                "price":        round(price, 4),
                "change":       round(chg_1d, 2),
                "change_1w":    round(chg_1w, 2),
                "change_1m":    round(chg_1m, 2),
                "score":        score,
                "signal":       signal,
                "rsi":          round(rsi, 1),
                "volume_ratio": round(vol_ratio, 2),
                "trend":        trend,
                "opportunity":  opportunity,
                "opp_type":     opp_type,
                "macd_signal":  "HAUSSIER" if macd_above else "BAISSIER",
                "near_breakout": near_breakout,
                "pct_from_high": round(pct_from_high, 1),
            }
        except Exception:
            return None

    # ── Run ALL assets in parallel (batches of 30) ──────────────────────
    batch_size = 30
    all_results = []
    for i in range(0, len(assets), batch_size):
        batch = assets[i:i + batch_size]
        batch_res = await asyncio.gather(*[_analyze(s) for s in batch])
        all_results.extend(batch_res)

    results = [r for r in all_results if r is not None and r["score"] >= min_score]

    # Filter by opportunity type if requested
    if opportunity_type != "all":
        results = [r for r in results if r["opp_type"] == opportunity_type]

    results.sort(key=lambda x: x["score"], reverse=True)

    # Record the scan usage (non-blocking)
    await _record_scan(current_user["id"], market_key)
    # Refresh quota after recording
    new_quota = await _check_scan_limit(current_user)

    return {
        "market":         market_key,
        "min_score":      min_score,
        "total_scanned":  len(assets),
        "results":        results[:limit],
        "quota": {
            "scans_today": new_quota["scans_today"],
            "daily_limit": new_quota["daily_limit"],
            "remaining":   new_quota["remaining"],
            "is_premium":  new_quota["is_premium"],
        }
    }


@router.get("/{symbol}/chart")
@limiter.limit("10/minute")
async def get_chart_data(
    request: Request,
    symbol: str,
    timeframe: str = Query(default="1d", pattern="^(5m|15m|30m|1h|4h|1d|3d|1w|1mo)$"),
    current_user: dict = Depends(get_current_user),
):
    """Return OHLCV candles + technical overlays + future projection (premium only)."""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    if not await is_user_premium(current_user):
        raise HTTPException(
            status_code=403, detail="Cette fonctionnalité est réservée aux membres Premium"
        )

    import pandas as pd
    import numpy as np
    from fastapi import HTTPException
    from ._prices import fetch_ohlcv

    period_map = {
        "5m":  ("5d",   "5m"),
        "15m": ("10d",  "15m"),
        "30m": ("10d",  "30m"),
        "1h":  ("2mo",  "1h"),
        "4h":  ("3mo",  "1h"),
        "1d":  ("1y",   "1d"),
        "3d":  ("2y",   "1d"),
        "1w":  ("3y",   "1wk"),
        "1mo": ("10y",  "1mo"),
    }
    fetch_period, fetch_interval = period_map[timeframe]

    try:
        hist = await fetch_ohlcv(symbol, period=fetch_period, interval=fetch_interval)

        if hist.empty or len(hist) < 10:
            raise HTTPException(status_code=400, detail="Données insuffisantes pour ce symbole")

        # Resample to synthetic intervals not natively supported by yfinance
        if timeframe == "4h":
            hist = hist.resample("4h").agg({
                "Open": "first", "High": "max", "Low": "min",
                "Close": "last", "Volume": "sum"
            }).dropna()
        elif timeframe == "3d":
            hist = hist.resample("3D").agg({
                "Open": "first", "High": "max", "Low": "min",
                "Close": "last", "Volume": "sum"
            }).dropna()

        hist.index = hist.index.tz_localize(None) if hist.index.tzinfo is not None else hist.index

        close = hist["Close"]
        n = len(close)

        # ── Candles ────────────────────────────────────────────────────────────
        candles = []
        for ts, row in hist.iterrows():
            candles.append({
                "time":   int(ts.timestamp()),
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),     4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row["Volume"]),
            })

        # ── EMA overlays ───────────────────────────────────────────────────────
        def _ema_series(span):
            vals = close.ewm(span=span, adjust=False).mean()
            return [
                {"time": int(ts.timestamp()), "value": round(float(v), 4)}
                for ts, v in zip(hist.index, vals)
                if not np.isnan(v)
            ]

        ema20_data  = _ema_series(20)
        ema50_data  = _ema_series(50)
        ema200_data = _ema_series(200) if n >= 200 else []

        # ── Bollinger Bands (20, 2σ) ───────────────────────────────────────────
        bb_mid  = close.rolling(20).mean()
        bb_std  = close.rolling(20).std()
        bb_upper = bb_mid + 2 * bb_std
        bb_lower = bb_mid - 2 * bb_std

        def _bb_series(s):
            return [
                {"time": int(ts.timestamp()), "value": round(float(v), 4)}
                for ts, v in zip(hist.index, s)
                if not np.isnan(v)
            ]

        bollinger = {
            "upper":  _bb_series(bb_upper),
            "middle": _bb_series(bb_mid),
            "lower":  _bb_series(bb_lower),
        }

        # ── Key levels ────────────────────────────────────────────────────────
        recent = hist.tail(20)
        support    = round(float(recent["Low"].min()), 4)
        resistance = round(float(recent["High"].max()), 4)
        pivot      = round((resistance + support + float(close.iloc[-1])) / 3, 4)

        # ── Future projection (précision améliorée) ────────────────────────────
        last_price = float(close.iloc[-1])
        last_ts    = hist.index[-1]

        # -- 1. Régression quadratique à poids exponentiels -------------------
        #    Les données récentes ont un poids proche de 1, les anciennes ~e^-2
        x = np.arange(n, dtype=float)
        w = np.exp(np.linspace(-2.0, 0.0, n))          # poids décroissants vers le passé
        coeffs2 = np.polyfit(x, close.values.astype(float), 2, w=w)

        # Dérivée du polynôme en x=n-1 → tendance instantanée (pente locale)
        # poly ax²+bx+c → dérivée 2ax+b
        local_slope = 2 * coeffs2[0] * (n - 1) + coeffs2[1]

        # -- 2. ATR sur 14 périodes (volatilité réelle des traders) -----------
        tr = pd.concat([
            hist["High"] - hist["Low"],
            (hist["High"] - hist["Close"].shift(1)).abs(),
            (hist["Low"]  - hist["Close"].shift(1)).abs(),
        ], axis=1).max(axis=1)
        atr14 = float(tr.rolling(14).mean().iloc[-1])
        if np.isnan(atr14) or atr14 == 0:
            atr14 = float(close.std()) * 0.01

        # -- 3. Facteur RSI : dévie légèrement la trajectoire ----------------
        #    RSI > 60 → léger biais haussier, RSI < 40 → léger biais baissier
        rsi_raw = 100 - 100 / (1 + (
            close.diff().clip(lower=0).rolling(14).mean() /
            (-close.diff().clip(upper=0).rolling(14).mean()).replace(0, 1e-9)
        ))
        current_rsi = float(rsi_raw.iloc[-1]) if not np.isnan(rsi_raw.iloc[-1]) else 50.0
        momentum_bias = (current_rsi - 50) / 50 * atr14 * 0.15  # ±15 % d'ATR max

        # -- 4. Mean-reversion vers EMA20 ------------------------------------
        ema20_last = float(close.ewm(span=20, adjust=False).mean().iloc[-1])
        mean_rev_force = (ema20_last - last_price) * 0.08  # rappel doux

        # -- 5. Temps delta entre bougies ------------------------------------
        if n >= 2:
            delta_sec = int((hist.index[-1] - hist.index[-2]).total_seconds())
        else:
            delta_sec = 86400

        # -- 6. Génération des points de projection --------------------------
        n_future = max(8, n // 5)
        projection = []
        for i in range(1, n_future + 1):
            # Tendance quadratique projetée depuis le dernier point
            trend = local_slope * i + coeffs2[0] * i * i * 0.3  # amortir le quadratique
            # Rappel progressif vers EMA + biais RSI (effet décroissant)
            correction = (mean_rev_force + momentum_bias) * np.exp(-i / (n_future * 0.6))
            base = last_price + trend + correction
            # Bandes ATR : s'élargissent en racine du temps (marche aléatoire)
            band = atr14 * (i ** 0.5) * 1.5
            future_ts = int(last_ts.timestamp()) + delta_sec * i
            projection.append({
                "time":  future_ts,
                "value": round(max(base, 0.0001), 4),
                "upper": round(max(base + band, 0.0001), 4),
                "lower": round(max(base - band, 0.0001), 4),
            })

        # Tendance générale de la projection
        proj_trend = "bullish" if local_slope > 0 else "bearish"

        return {
            "symbol":     symbol.upper(),
            "timeframe":  timeframe,
            "candles":    candles,
            "ema20":      ema20_data,
            "ema50":      ema50_data,
            "ema200":     ema200_data,
            "bollinger":  bollinger,
            "projection": projection,
            "projection_meta": {
                "trend":         proj_trend,
                "rsi":           round(current_rsi, 1),
                "atr":           round(atr14, 4),
                "target":        round(projection[-1]["value"], 4) if projection else last_price,
                "target_upper":  round(projection[-1]["upper"], 4) if projection else last_price,
                "target_lower":  round(projection[-1]["lower"], 4) if projection else last_price,
            },
            "levels": {
                "support":    support,
                "resistance": resistance,
                "pivot":      pivot,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des données: {str(e)}")
