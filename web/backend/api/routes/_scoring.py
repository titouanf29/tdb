"""
Pure scoring engine — shared by the live analysis route and the backtester.

This is THE algorithm: indicators, regime gating, conviction signals and
the 5-component score. It must stay a pure function of OHLCV (+ optional
live price) so the backtester replays exactly what production serves.
"""
import numpy as np
import pandas as pd

from ._indicators import (rsi_wilder, atr_wilder, adx_wilder, true_range,
                          percentile_rank, volatility_regime)


def _safe(value, default=None, ndigits=None):
    try:
        v = float(value)
        if np.isnan(v) or np.isinf(v):
            return default
        return round(v, ndigits) if ndigits is not None else v
    except Exception:
        return default


# Stamped on every analysis so a position opened three months ago can be
# traced back to the engine that produced it. Bump on any change that moves
# scores: MINOR for new outputs, MAJOR for a change of meaning.
ENGINE_VERSION = "2.0.0"


def compute_score(high, low, close, volume, current_price=None):
    """Compute indicators + score on a full OHLCV history (causal only)."""
    # RSI — Wilder's smoothing (matches TradingView/broker values)
    rsi = rsi_wilder(close)
    current_rsi = rsi.iloc[-1]
    if pd.isna(current_rsi):
        current_rsi = 50.0

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

    # ATR — Wilder's smoothing (standard ATR)
    atr_series = atr_wilder(high, low, close)
    atr = atr_series.iloc[-1]
    if pd.isna(atr):
        atr = float(true_range(high, low, close).tail(14).mean())

    # ADX — Wilder smoothing throughout; usable from ~2×period bars
    # instead of the ~3×period the previous triple-rolling needed
    adx_val, current_plus_di, current_minus_di = adx_wilder(high, low, close)

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

    # Current price: caller may pass a live price; fall back to last close
    close_clean = close.dropna()
    if current_price is None:
        current_price = float(close_clean.iloc[-1])

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

    _conv_mh_last = float(macd_hist.iloc[-1])
    _conv_mh_prev = float(macd_hist.iloc[-2])
    _conv_mh_min = 0.05 * float(atr) if atr and not pd.isna(atr) else 0.0
    if _conv_mh_last > _conv_mh_min and _conv_mh_prev <= 0:
        bullish_signals.append("Croisement haussier MACD")
    elif _conv_mh_last < -_conv_mh_min and _conv_mh_prev >= 0:
        bearish_signals.append("Croisement baissier MACD")
    elif _conv_mh_last > _conv_mh_min:
        bullish_signals.append("MACD positif")
    elif _conv_mh_last < -_conv_mh_min:
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

    # NOTE: conviction_score is computed further down, from factor agreement
    # rather than from this signal tally. Counting the ~32 signals above as
    # independent evidence overstates agreement badly: "Prix > EMA20",
    # "Prix > EMA50", "Prix > EMA200", "MACD positif", "Momentum 10j fort" and
    # "ADX haussier" all fire together in any established trend, so a single
    # piece of information was being counted six times and the tally saturated
    # near 0 or 100 whenever a trend existed.

    # ── IMPROVED 5-COMPONENT SCORING ──────────────────────────────────

    # Trend regime — gates the mean-reversion bonuses below.
    # Oversold in a confirmed downtrend is a falling knife, not a buy;
    # overbought in a confirmed uptrend is trend strength, not a sell.
    _ema20_last = float(ema20.iloc[-1])
    _ema50_last = float(ema50.iloc[-1])
    regime_up   = current_price > _ema50_last and _ema20_last > _ema50_last
    regime_down = current_price < _ema50_last and _ema20_last < _ema50_last
    if adx_val > 25:  # a strong ADX against the EMA regime cancels it
        if regime_up and current_minus_di > current_plus_di:
            regime_up = False
        if regime_down and current_plus_di > current_minus_di:
            regime_down = False

    def _gated(points: int, direction: str) -> int:
        """Cut contrarian bonuses to 1/3 when the regime disagrees."""
        if direction == "bullish" and regime_down:
            return points // 3
        if direction == "bearish" and regime_up:
            return points // 3
        return points

    # 1. TECHNICAL SCORE (oscillators: RSI, MACD, Stochastic, Williams %R, Bollinger)
    technical_score = 50

    if current_rsi < 25:   technical_score += _gated(20, "bullish")
    elif current_rsi < 30: technical_score += _gated(15, "bullish")
    elif current_rsi < 40: technical_score += _gated(8, "bullish")
    elif current_rsi > 80: technical_score -= _gated(20, "bearish")
    elif current_rsi > 70: technical_score -= _gated(15, "bearish")
    elif current_rsi > 60: technical_score -= _gated(5, "bearish")

    # MACD — a crossover only counts if the histogram clears a noise
    # threshold (5% of ATR); a ±0.005 wiggle is indecision, not a signal
    _mh_last = float(macd_hist.iloc[-1])
    _mh_prev = float(macd_hist.iloc[-2])
    _mh_min = 0.05 * float(atr) if atr and not pd.isna(atr) else 0.0
    if _mh_last > _mh_min and _mh_prev <= 0:
        technical_score += _gated(20, "bullish")
    elif _mh_last < -_mh_min and _mh_prev >= 0:
        technical_score -= _gated(20, "bearish")
    elif _mh_last > _mh_min:
        technical_score += 8
    elif _mh_last < -_mh_min:
        technical_score -= 8

    if rsi_divergence == "bullish":  technical_score += _gated(12, "bullish")
    elif rsi_divergence == "bearish": technical_score -= _gated(12, "bearish")

    if current_stoch_k < 20 and current_stoch_k > current_stoch_d:   technical_score += _gated(8, "bullish")
    elif current_stoch_k > 80 and current_stoch_k < current_stoch_d: technical_score -= _gated(8, "bearish")
    elif current_stoch_k < 30: technical_score += _gated(4, "bullish")
    elif current_stoch_k > 70: technical_score -= _gated(4, "bearish")

    if current_wr < -80:   technical_score += _gated(7, "bullish")
    elif current_wr > -20: technical_score -= _gated(7, "bearish")

    if current_price < float(bb_lower.iloc[-1]):   technical_score += _gated(5, "bullish")
    elif current_price > float(bb_upper.iloc[-1]): technical_score -= _gated(5, "bearish")

    technical_score = max(0, min(100, technical_score))

    # 2. TREND SCORE (EMA distance + ADX strength)
    #
    # Distance, not side. Scoring the mere side of a moving average gave a
    # price 0.1% under the EMA200 the same -15 as a price 40% under it, so a
    # flat market where price drifts just below its averages read as a strong
    # downtrend. Each gap is now measured in ATR — the asset's own unit of
    # movement — and saturates once it is unambiguous, which leaves a natural
    # dead zone around the average.
    trend_score = 50
    _atr_unit = float(atr) if atr and not pd.isna(atr) and atr > 0 else None

    def _ema_points(ema_last: float, full_points: int, saturate_atr: float) -> float:
        gap = current_price - ema_last
        if _atr_unit is None:
            return full_points if gap > 0 else -full_points
        ratio = gap / (_atr_unit * saturate_atr)
        return max(-1.0, min(1.0, ratio)) * full_points

    trend_score += _ema_points(float(ema20.iloc[-1]), 8, 1.0)
    trend_score += _ema_points(float(ema50.iloc[-1]), 12, 2.0)
    if ema200 is not None:
        trend_score += _ema_points(float(ema200.iloc[-1]), 15, 4.0)

    if adx_val > 30:
        if current_plus_di > current_minus_di: trend_score += 12
        else:                                   trend_score -= 12
    elif adx_val > 20:
        if current_plus_di > current_minus_di: trend_score += 6
        else:                                   trend_score -= 6

    trend_score = max(0, min(100, int(round(trend_score))))

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

    # 5. VOLATILITY / STABILITY SCORE — ranked against the asset's own history.
    #
    # Fixed thresholds (< 5% tight, > 28% wide) cannot hold across asset
    # classes: 25% Bollinger width is a crisis on a utility and an ordinary
    # session on an altcoin. Both readings are now ranked inside this asset's
    # own distribution, so "high volatility" means the same thing everywhere.
    bb_width_pct = _safe(
        (bb_upper.iloc[-1] - bb_lower.iloc[-1]) / bb_mid.iloc[-1] * 100, 20.0
    ) if _safe(bb_mid.iloc[-1], 0) > 0 else 20.0
    relative_atr = _safe(atr / current_price * 100, 2.0) if current_price > 0 else 2.0

    bb_width_series = ((bb_upper - bb_lower) / bb_mid.replace(0, np.nan) * 100)
    atr_pct_series  = (atr_series / close.replace(0, np.nan) * 100)
    bb_pctile  = percentile_rank(bb_width_series)
    atr_pctile = percentile_rank(atr_pct_series)

    ranked = [p for p in (bb_pctile, atr_pctile) if p is not None]
    if ranked:
        vol_percentile = round(sum(ranked) / len(ranked), 1)
        # High percentile = unusually volatile FOR THIS ASSET = less stable.
        volatility_score = int(round(100 - vol_percentile))
        vol_basis = "percentile"
    else:
        # Under ~60 bars a rank carries no information; fall back to absolute
        # bands and report which basis was used rather than pretending.
        vol_percentile = None
        if bb_width_pct < 5:    volatility_score = 80
        elif bb_width_pct < 10: volatility_score = 65
        elif bb_width_pct < 18: volatility_score = 55
        elif bb_width_pct < 28: volatility_score = 40
        else:                   volatility_score = 30
        if relative_atr > 5:   volatility_score -= 10
        elif relative_atr < 1: volatility_score += 5
        vol_basis = "absolute"

    volatility_score = max(0, min(100, volatility_score))
    vol_regime = volatility_regime(vol_percentile)

    # FINAL WEIGHTED SCORE
    final_score = int(
        technical_score  * 0.30 +
        trend_score      * 0.25 +
        volume_score     * 0.20 +
        momentum_score   * 0.20 +
        volatility_score * 0.05
    )
    final_score = max(0, min(100, final_score))

    # ── FACTOR AGREEMENT ───────────────────────────────────────────────
    # Replaces the old "% of bullish signals among ~32". Those signals are
    # heavily correlated, so the tally measured trend strength twice rather
    # than measuring agreement. Here the four DIRECTIONAL families are each
    # reduced to one direction in [-1, +1], and agreement asks a single
    # question: do families that can genuinely disagree point the same way?
    #
    # Volatility is deliberately excluded — it is context, not a direction.
    factor_directions = {
        "trend":      round((trend_score      - 50) / 50, 3),
        "momentum":   round((momentum_score   - 50) / 50, 3),
        "flow":       round((volume_score     - 50) / 50, 3),
        "oscillators": round((technical_score - 50) / 50, 3),
    }
    _dirs = list(factor_directions.values())
    _mean_abs = sum(abs(d) for d in _dirs) / len(_dirs)
    if _mean_abs < 0.02:
        factor_agreement = 50
    else:
        # |mean| / mean|·| is 100 when every family points the same way and 0
        # when they cancel out — independent of how strong the move is.
        raw = abs(sum(_dirs) / len(_dirs)) / _mean_abs * 100
        # ...but agreement measured on near-zero directions is noise dressed
        # as certainty: four factors all sitting at -0.05 are not "100% aligned
        # bearish", they are four factors with nothing to say. Shrink toward
        # 50 until the families actually carry a direction.
        weight = min(1.0, _mean_abs / 0.35)
        factor_agreement = int(round(50 + (raw - 50) * weight))
    factor_agreement = max(0, min(100, factor_agreement))
    conviction_score = factor_agreement

    return {
        "close_clean": close_clean, "vol_clean": vol_clean,
        "current_price": current_price, "avg_volume": avg_volume,
        "volume_ratio": volume_ratio,
        "rsi": rsi, "current_rsi": current_rsi, "rsi_divergence": rsi_divergence,
        "macd": macd, "signal": signal, "macd_hist": macd_hist,
        "ema20": ema20, "ema50": ema50, "ema200": ema200,
        "bb_upper": bb_upper, "bb_mid": bb_mid, "bb_lower": bb_lower,
        "bb_percent_b": bb_percent_b, "bb_width_pct": bb_width_pct,
        "relative_atr": relative_atr, "atr": atr,
        "adx_val": adx_val, "current_plus_di": current_plus_di,
        "current_minus_di": current_minus_di,
        "current_stoch_k": current_stoch_k, "current_stoch_d": current_stoch_d,
        "current_wr": current_wr,
        "obv_trend": obv_trend, "obv_slope": obv_slope, "current_cmf": current_cmf,
        "momentum_3d": momentum_3d, "momentum_5d": momentum_5d,
        "momentum_10d": momentum_10d, "momentum_20d": momentum_20d,
        "fibonacci": fibonacci,
        "bullish_signals": bullish_signals, "bearish_signals": bearish_signals,
        "conviction_score": conviction_score,
        "factor_agreement": factor_agreement,
        "factor_directions": factor_directions,
        "vol_percentile": vol_percentile,
        "vol_regime": vol_regime,
        "vol_basis": vol_basis,
        "engine_version": ENGINE_VERSION,
        "technical_score": technical_score, "trend_score": trend_score,
        "volume_score": volume_score, "momentum_score": momentum_score,
        "volatility_score": volatility_score, "final_score": final_score,
    }


# ── Shared verdict derivation ───────────────────────────────────────────────
# The scanner and the analysis page must reach the SAME verdict on the same
# asset — a scan that says "haussier" and an analysis that opens on a red
# bearish panel destroys trust in both. These two helpers are the single
# definition of that verdict; both screens call them.

def derive_trend(current_price: float, ema20_last: float, ema50_last: float) -> str:
    """BULLISH / BEARISH / NEUTRAL from EMA stacking."""
    if current_price > ema20_last > ema50_last:
        return "BULLISH"
    if current_price < ema20_last < ema50_last:
        return "BEARISH"
    return "NEUTRAL"


def derive_signal(final_score: float) -> str:
    """STRONG BUY / BUY / HOLD / SELL / STRONG SELL from the final score."""
    if final_score >= 75:
        return "STRONG BUY"
    if final_score >= 60:
        return "BUY"
    if final_score >= 40:
        return "HOLD"
    if final_score >= 25:
        return "SELL"
    return "STRONG SELL"


# Frontend timeframe key -> (yfinance period, yfinance interval, resample rule).
# Shared so a scan pulls exactly the history the analysis will pull.
#
# Two things this table fixes:
#   * "4h" and "3d" are NOT Yahoo intervals (valid ones are 1m/2m/5m/15m/30m/
#     60m/90m/1h/1d/5d/1wk/1mo/3mo). "4h" was passed through verbatim and came
#     back empty, so the 4-hour analysis failed outright; "3d" silently served
#     daily bars. Both are now built by resampling a finer interval.
#   * Every period is long enough to reach 200+ bars. The old table asked for
#     6 months of daily (126 bars) and 5 years of monthly (60 bars), so EMA200
#     — the backbone of the trend score and the long-term profile's headline
#     indicator — could never be computed, and data confidence sat at 33-57%.
TIMEFRAME_FETCH = {
    "5m":  ("1mo", "5m",  None),
    "15m": ("1mo", "15m", None),
    "30m": ("2mo", "30m", None),
    "1h":  ("6mo", "1h",  None),
    "4h":  ("1y",  "1h",  "4h"),
    "1d":  ("2y",  "1d",  None),
    "3d":  ("5y",  "1d",  "3D"),
    "1w":  ("10y", "1wk", None),
    "1mo": ("max", "1mo", None),
}


def resample_ohlcv(df, rule: str):
    """Aggregate OHLCV bars into a coarser interval Yahoo does not serve."""
    if df is None or df.empty:
        return df
    out = df.resample(rule).agg({
        "Open": "first", "High": "max", "Low": "min",
        "Close": "last", "Volume": "sum",
    }).dropna(subset=["Close"])
    return out


# ── Higher-timeframe confirmation ───────────────────────────────────────────
# A daily BUY inside a weekly downtrend is the classic trap, so the score is
# pulled toward neutral when the higher timeframe disagrees. The scanner has to
# apply the very same adjustment: an 8-point gap is enough to turn a scanner
# "BUY" into an analysis "HOLD" on the same asset at the same moment.

HIGHER_TF = {
    "5m": ("1h", "1mo"),  "15m": ("1h", "1mo"), "30m": ("1d", "6mo"),
    "1h": ("1d", "6mo"),  "4h":  ("1d", "6mo"), "1d":  ("1wk", "2y"),
    "3d": ("1wk", "2y"),  "1w":  ("1mo", "5y"),
}

# pandas resample rule that builds each higher-timeframe series from the
# primary one. The primary fetch periods in TIMEFRAME_FETCH were lengthened
# to 200+ bars, which as a side effect covers the higher timeframe too:
# 2 years of daily bars are 104 weekly bars, 6 months of hourly bars are
# 126 daily bars. So the confirmation no longer needs a second download —
# it is derived from data already in hand. Both the analysis and the
# scanner derive it the same way, so their verdicts stay identical.
_HTF_RESAMPLE = {"1h": "1h", "1d": "D", "1wk": "W", "1mo": "MS"}


def htf_from_primary(hist, timeframe: str):
    """(interval_label, resampled_close) for the higher timeframe, or None."""
    spec = HIGHER_TF.get(timeframe)
    if not spec or hist is None or hist.empty:
        return None
    interval, _ = spec
    rule = _HTF_RESAMPLE.get(interval)
    if not rule:
        return None
    try:
        closes = hist["Close"].resample(rule).last().dropna()
    except Exception:
        return None
    if len(closes) < 21:
        return None
    return interval, closes


def htf_trend(htf_close) -> str:
    """BULLISH / BEARISH / NEUTRAL of a higher-timeframe close series."""
    hc = htf_close.dropna()
    px  = float(hc.iloc[-1])
    e20 = float(hc.ewm(span=20, adjust=False).mean().iloc[-1])
    e50 = float(hc.ewm(span=50, adjust=False).mean().iloc[-1]) if len(hc) >= 50 else e20
    if px > e20 and e20 >= e50:
        return "BULLISH"
    if px < e20 and e20 <= e50:
        return "BEARISH"
    return "NEUTRAL"


def apply_htf_gate(final_score: float, trend: str, interval: str):
    """Returns (adjusted_score, aligned, bullish_note, bearish_note)."""
    if final_score >= 55 and trend == "BEARISH":
        return max(0, final_score - 8), False, None, f"Non confirmé : tendance {interval} baissière"
    if final_score <= 45 and trend == "BULLISH":
        return min(100, final_score + 8), False, f"Non confirmé : tendance {interval} haussière", None
    if trend == "BULLISH" and final_score >= 55:
        return final_score, True, f"Confirmé par la tendance {interval} haussière", None
    if trend == "BEARISH" and final_score <= 45:
        return final_score, True, None, f"Confirmé par la tendance {interval} baissière"
    return final_score, None, None, None
