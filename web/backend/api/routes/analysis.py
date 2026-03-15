"""
AI Analysis routes - Using the same analyzer as the bot
"""
import re
import sys
import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from .auth import get_current_user
from .premium import is_user_premium

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

_SYMBOL_RE = re.compile(r'^[\^A-Z0-9.\-=]{1,30}$')


@router.get("/{symbol}")
@limiter.limit("10/minute")
async def analyze_asset(
    request: Request,
    symbol: str,
    timeframe: str = Query(default="1d", pattern="^(5m|15m|1h|4h|1d)$")
):
    """Get AI analysis for an asset"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    import pandas as pd
    import numpy as np
    from ._prices import fetch_ohlcv

    try:
        # Get historical data
        period_map = {
            "5m": "5d", "15m": "5d", "1h": "1mo",
            "4h": "3mo", "1d": "6mo"
        }
        hist = await fetch_ohlcv(symbol, period=period_map.get(timeframe, "1mo"), interval=timeframe)

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

        # Current values
        current_price = close.iloc[-1]
        prev_price = close.iloc[-2]
        price_change = ((current_price - prev_price) / prev_price) * 100

        # Volume analysis
        avg_volume = volume.rolling(window=20).mean().iloc[-1]
        current_volume = volume.iloc[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

        # Calculate scores
        technical_score = 50

        # RSI contribution
        if current_rsi < 30:
            technical_score += 15  # Oversold = bullish signal
        elif current_rsi > 70:
            technical_score -= 15  # Overbought = bearish signal
        elif 40 <= current_rsi <= 60:
            technical_score += 5  # Neutral

        # MACD contribution
        if macd_hist.iloc[-1] > 0 and macd_hist.iloc[-2] <= 0:
            technical_score += 15  # Bullish crossover
        elif macd_hist.iloc[-1] < 0 and macd_hist.iloc[-2] >= 0:
            technical_score -= 15  # Bearish crossover
        elif macd_hist.iloc[-1] > 0:
            technical_score += 5
        else:
            technical_score -= 5

        # EMA contribution
        if current_price > ema20.iloc[-1]:
            technical_score += 5
        if current_price > ema50.iloc[-1]:
            technical_score += 5
        if ema200 is not None and current_price > ema200.iloc[-1]:
            technical_score += 10

        # Volume contribution
        volume_score = min(100, int(volume_ratio * 50))

        # Momentum
        momentum_5d = ((current_price - close.iloc[-6]) / close.iloc[-6]) * 100 if len(close) > 5 else 0
        momentum_score = 50 + min(25, max(-25, momentum_5d * 5))

        # Final score
        final_score = int(
            technical_score * 0.4 +
            volume_score * 0.3 +
            momentum_score * 0.3
        )
        final_score = max(0, min(100, final_score))

        # Determine trend
        if current_price > ema20.iloc[-1] > ema50.iloc[-1]:
            trend = "BULLISH"
        elif current_price < ema20.iloc[-1] < ema50.iloc[-1]:
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

                # Link: top-level or nested
                link = item.get("link") or content.get("url") or ""
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

        # Price targets based on technicals
        target_bull = round(current_price * 1.15, 2)  # +15%
        target_base = round(current_price * 1.05, 2)  # +5%
        target_bear = round(current_price * 0.90, 2)  # -10%

        # Adjust based on trend
        if trend == "BULLISH":
            target_bull = round(current_price * 1.20, 2)
            target_base = round(current_price * 1.10, 2)
        elif trend == "BEARISH":
            target_base = round(current_price * 0.95, 2)
            target_bear = round(current_price * 0.80, 2)

        # Fundamental score
        fundamental_score = 50
        if fundamentals.get("pe_ratio"):
            pe = fundamentals["pe_ratio"]
            if pe < 15:
                fundamental_score += 10
            elif pe > 30:
                fundamental_score -= 10
        if fundamentals.get("revenue_growth"):
            rg = fundamentals["revenue_growth"]
            if rg > 0.1:
                fundamental_score += 10
            elif rg < 0:
                fundamental_score -= 10
        if fundamentals.get("profit_margin"):
            pm = fundamentals["profit_margin"]
            if pm > 0.15:
                fundamental_score += 5
            elif pm < 0:
                fundamental_score -= 10
        fundamental_score = max(0, min(100, fundamental_score))

        # Analyst sentiment
        analyst_sentiment = "neutral"
        if fundamentals.get("recommendation"):
            rec = fundamentals["recommendation"].lower()
            if "buy" in rec or "strong" in rec:
                analyst_sentiment = "bullish"
            elif "sell" in rec or "under" in rec:
                analyst_sentiment = "bearish"

        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "company": company_info,
            "price": {
                "current": round(current_price, 2),
                "change": round(price_change, 2),
                "high_24h": round(high.iloc[-1], 2),
                "low_24h": round(low.iloc[-1], 2)
            },
            "score": {
                "total": final_score,
                "technical": int(technical_score),
                "volume": volume_score,
                "momentum": int(momentum_score),
                "fundamental": fundamental_score
            },
            "signal": {
                "text": signal_text,
                "emoji": signal_emoji
            },
            "trend": trend,
            "indicators": {
                "rsi": {
                    "value": round(current_rsi, 1),
                    "signal": "oversold" if current_rsi < 30 else "overbought" if current_rsi > 70 else "neutral"
                },
                "macd": {
                    "value": round(macd.iloc[-1], 4),
                    "signal_line": round(signal.iloc[-1], 4),
                    "histogram": round(macd_hist.iloc[-1], 4),
                    "signal": "bullish" if macd_hist.iloc[-1] > 0 else "bearish"
                },
                "ema": {
                    "ema20": round(ema20.iloc[-1], 2),
                    "ema50": round(ema50.iloc[-1], 2),
                    "ema200": round(ema200.iloc[-1], 2) if ema200 is not None else None
                },
                "bollinger": {
                    "upper": round(bb_upper.iloc[-1], 2),
                    "middle": round(bb_mid.iloc[-1], 2),
                    "lower": round(bb_lower.iloc[-1], 2),
                    "position": "upper" if current_price > bb_upper.iloc[-1] else "lower" if current_price < bb_lower.iloc[-1] else "middle",
                    "percent_b": round(bb_percent_b, 1),
                },
                "adx": {
                    "value": round(adx_val, 1),
                    "plus_di": round(current_plus_di, 1),
                    "minus_di": round(current_minus_di, 1),
                    "signal": "strong" if adx_val > 25 else "weak",
                },
                "stochastic": {
                    "k": round(current_stoch_k, 1),
                    "d": round(current_stoch_d, 1),
                    "signal": "oversold" if current_stoch_k < 20 else "overbought" if current_stoch_k > 80 else "neutral",
                },
                "atr": round(atr, 4),
                "volume_ratio": round(volume_ratio, 2)
            },
            "fibonacci": fibonacci,
            "levels": {
                "support": round(recent_low, 2),
                "resistance": round(recent_high, 2),
                "pivot": round((recent_high + recent_low + current_price) / 3, 2)
            },
            "risk": {
                "suggested_sl": round(current_price - (atr * 2), 2),
                "suggested_tp": round(current_price + (atr * 3), 2),
                "risk_reward": 1.5
            },
            "fundamentals": fundamentals,
            "performance": performance,
            "volatility": {
                "20d": round(volatility_20d, 2),
                "60d": round(volatility_60d, 2) if volatility_60d else None,
            },
            "targets": {
                "bull": target_bull,
                "base": target_base,
                "bear": target_bear,
                "analyst_mean": fundamentals.get("target_price"),
                "analyst_high": fundamentals.get("target_high"),
                "analyst_low": fundamentals.get("target_low"),
            },
            "analyst_sentiment": analyst_sentiment,
            "news": news_items,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/{market_key}")
@limiter.limit("2/minute")
async def scan_market(
    request: Request,
    market_key: str,
    min_score: int = Query(default=60, ge=0, le=100),
    limit: int = Query(default=20, le=50),
    opportunity_type: str = Query(default="all")
):
    """Scan a market for opportunities — parallel, enriched scoring (RSI+MACD+EMA+Volume+Momentum)"""
    from config import MARKETS
    from ._prices import fetch_ohlcv
    import asyncio
    import numpy as np

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

    return {
        "market":         market_key,
        "min_score":      min_score,
        "total_scanned":  len(assets),
        "results":        results[:limit]
    }


@router.get("/{symbol}/chart")
@limiter.limit("10/minute")
async def get_chart_data(
    request: Request,
    symbol: str,
    timeframe: str = Query(default="1d", pattern="^(5m|15m|1h|4h|1d)$"),
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
        "1h":  ("2mo",  "1h"),
        "4h":  ("3mo",  "1h"),
        "1d":  ("1y",   "1d"),
    }
    fetch_period, fetch_interval = period_map[timeframe]

    try:
        hist = await fetch_ohlcv(symbol, period=fetch_period, interval=fetch_interval)

        if hist.empty or len(hist) < 10:
            raise HTTPException(status_code=400, detail="Données insuffisantes pour ce symbole")

        # Resample to 4h if requested
        if timeframe == "4h":
            hist = hist.resample("4h").agg({
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
