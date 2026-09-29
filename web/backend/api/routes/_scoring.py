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
from ._fr import nombre_fr


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
ENGINE_VERSION = "2.2.0"


# ── L'écart à la moyenne 200 bougies (moteur 2.1) ───────────────────────────
#
# Mesuré en septembre 2026 sur 40 actifs et 5 ans de bougies journalières,
# stop 2 ATR, objectif 3 ATR, frais inclus, sans regard vers le futur :
#
#   * le score 2.0 était INVERSÉ hors échantillon — sur les deux dernières
#     années, ses achats (score ≥ 60) perdaient 0,02 R par trade, moins
#     qu'acheter tous les jours sans réfléchir (+0,03 R) ;
#   * la variable la plus parlante était l'écart du cours à sa moyenne
#     200 bougies, en ATR, et dans le sens du RETOUR À LA MOYENNE : loin
#     sous la moyenne, la suite est meilleure ; très étiré au-dessus, elle
#     est moins bonne.
#
# Le mélange ci-dessous a été choisi sur les trois premières années seules
# (règle fixée d'avance : meilleure espérance parmi les réglages totalisant
# au moins 1 000 trades), puis jugé sur les deux dernières, jamais vues :
# +0,150 R par trade, positif sur 86 % des actifs, contre −0,020 R pour le
# score 2.0. Il n'est appliqué que là où il a été mesuré — voir
# extension_validee() pour l'intraday.
EXTENSION_POIDS = 0.6
EXTENSION_PENTE = 5.0      # points de composante par ATR d'écart
EXTENSION_REPLI = -2.7     # ATR sous la moyenne : repli marqué
EXTENSION_ETIRE = 4.0      # ATR au-dessus : cours étiré


# ── Le plan : stop et objectif ──────────────────────────────────────────────
#
# UNE SEULE FONCTION pour l'écran et pour le rejeu historique. L'analyse
# ancrait son stop sous le support et plafonnait son objectif à la
# résistance, pendant que le rejeu posait des barrières en purs multiples
# d'ATR : l'historique jugeait un autre plan que celui affiché, puis ce
# jugement pouvait bloquer le plan affiché.
NIVEAUX_FENETRE = 20   # bougies qui définissent support et résistance


def plan_structurel(prix: float, atr: float, support: float, resistance: float,
                    vente: bool, sl_atr: float, tp_atr: float) -> dict:
    """Stop et objectif d'un plan, ancrés sur la structure.

    Un niveau ne compte comme ancre ou obstacle qu'à une distance d'au moins
    1 ATR : sur un plus haut ou un plus bas récent, l'extrême des 20 bougies
    EST le cours, et il ne doit pas étrangler le plan."""
    base, plafonne = "atr", False
    if vente:
        sl = prix + atr * sl_atr
        if (resistance - prix) >= atr and (resistance + atr * 0.5) < sl:
            sl, base = resistance + atr * 0.5, "resistance"
        tp = prix - atr * tp_atr
        if tp < support < prix and (prix - support) >= atr:
            tp, plafonne = support, True
    else:
        sl = prix - atr * sl_atr
        if (prix - support) >= atr and (support - atr * 0.5) > sl:
            sl, base = support - atr * 0.5, "support"
        tp = prix + atr * tp_atr
        if prix < resistance < tp and (resistance - prix) >= atr:
            tp, plafonne = resistance, True
    return {"sl": sl, "tp": tp, "sl_basis": base, "tp_capped": plafonne}


_JOURS_FIXES = {"1d": 1.0, "3d": 3 * 5 / 7, "1w": 5.0, "1mo": 21.0}


def jours_par_bougie(hist, timeframe: str | None) -> float:
    """Séances de bourse couvertes par une bougie.

    Au-dessus du jour, une constante (une semaine = 5 séances). En intraday,
    mesuré sur les données : c'est l'inverse du nombre médian de bougies par
    date. Une bougie d'une heure vaut ainsi 1/7 de séance sur une action
    (7 bougies par jour) et 1/24 sur une crypto, qui cote en continu."""
    tf = timeframe or "1d"
    if tf in _JOURS_FIXES:
        return _JOURS_FIXES[tf]
    try:
        par_jour = float(pd.Series(1, index=hist.index).groupby(hist.index.date).size().median())
        return 1.0 / par_jour if par_jour >= 1 else 1.0
    except Exception:
        return 1.0


def horizon_rejeu(timeframe: str | None) -> int:
    """Combien de bougies le rejeu historique tient une position.

    20 en journalier : mesuré sur 40 actifs et 5 ans, les achats du moteur
    2.1 (des replis) paient nettement mieux tenus 20 séances que 10, sur les
    deux périodes — +0,32 R contre +0,20 R par trade, stop 1,5 ATR, sur la
    période jamais vue. Un rebond prend du temps. En 3 jours, 20 aussi (+0,55 R
    contre +0,34 R à 10, période jamais vue). En hebdomadaire et mensuel, 40 :
    à ces horizons, c'est la durée de détention qui paie (profil long terme,
    +0,59 R et +1,03 R par trade contre +0,16 R et +0,26 R à 10 bougies).
    Intraday : 10 — la durée n'y rattrape pas les frais."""
    return {"1d": 20, "3d": 20, "1w": 40, "1mo": 40}.get(timeframe or "1d", 10)


def extension_validee(timeframe: str | None) -> bool:
    """La composante d'écart n'est active que sur les unités où elle a été
    mesurée.

    Journalier et au-delà : voir EXTENSION_POIDS. En bougies d'une heure
    (2 ans, 40 actifs, mêmes deux périodes), le 2.1 fait aussi mieux que le
    2.0 avant frais — +0,053 R contre +0,001 R par achat sur la période jamais
    vue — mais à cette échelle les frais (≈ 0,17 R par aller-retour en
    médiane) dépassent l'avantage de toutes les règles testées. Les bougies
    de 4 h, agrégées depuis l'heure, suivent. De 5 à 30 minutes : le 2.1 y
    fait moins bien que le 2.0 (bougies de 5 min, 60 jours), il reste éteint."""
    # Pas en mensuel : sur 200 mois, presque tout actif est loin au-dessus de
    # sa moyenne, et la composante écrasait le score — il plafonnait à 57,
    # jamais un signal d'achat (mesuré sur 28 actifs, historiques complets).
    # En 3 jours et en hebdomadaire, mesuré et conservé (le 2.1 y bat le 2.0
    # sur les deux périodes ; en hebdomadaire ses signaux sont rares).
    return (timeframe or "1d") in ("1h", "4h", "1d", "3d", "1w")


def compute_score(high, low, close, volume, current_price=None, partial_last=False,
                  extension=True, jours_par_bougie=1.0):
    """Compute indicators + score on a full OHLCV history (causal only).

    partial_last — the last bar is still forming (market open, or the day /
    week not over). Its volume is then only a fraction of a full bar's, and
    comparing it with a 20-bar average of FULL bars made every stock look
    thin during the session: the volume component fell by up to 20 points
    and "Volume très faible" appeared, always pushing the score down. The
    volume reading then uses the last COMPLETED bar instead.

    jours_par_bougie — combien de séances une bougie représente (1 en
    journalier, ≈ 0,15 pour une bougie d'une heure sur une action, 5 en
    hebdomadaire). Les seuils de momentum et de volatilité, écrits pour des
    bougies d'un jour, s'y ajustent ; voir le bloc MOMENTUM.
    """
    _k = max(float(jours_par_bougie or 1.0), 1e-6) ** 0.5
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
    # La bougie dont on lit le volume : la dernière COMPLÈTE.
    _vol_ref = vol_clean.iloc[:-1] if (partial_last and len(vol_clean) >= 21) else vol_clean
    avg_volume = _vol_ref.rolling(window=20).mean().dropna().iloc[-1] if len(_vol_ref) >= 20 else _vol_ref.mean()
    current_volume = float(_vol_ref.iloc[-1]) if not _vol_ref.empty else 0.0
    volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1
    # Sans volume publié (forex, la plupart des indices), le volume ne dit
    # rien. L'OBV valait alors 0 comme sa moyenne, lu « baissier » : −8 à tous
    # les coups, soit environ −1,6 sur le score final d'une paire de devises.
    has_volume = bool(_safe(vol_clean.tail(20).sum(), 0) > 0)
    # Le sens de cette même bougie : un gros volume en baisse n'est pas un
    # signe d'achat — c'est souvent une capitulation.
    _cc_ref = close.dropna()
    if partial_last and len(_cc_ref) >= 3:
        _bar_ret = float(_cc_ref.iloc[-2] / _cc_ref.iloc[-3] - 1)
    elif len(_cc_ref) >= 2:
        _bar_ret = float(_cc_ref.iloc[-1] / _cc_ref.iloc[-2] - 1)
    else:
        _bar_ret = 0.0

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
    if not has_volume:
        obv_trend, obv_slope = "neutral", 0.0

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
        # Au-dessus de la moyenne 200, ce n'est plus compté comme un signal
        # d'achat quand l'écart est mesuré (moteur 2.1) : les données disent
        # l'inverse au-delà de quelques ATR. Il reste l'information.
        if not extension:
            if current_price > float(ema200.iloc[-1]): bullish_signals.append("Prix > EMA200 (zone dorée)")
            else:                                        bearish_signals.append("Prix < EMA200")

    if adx_val > 25:
        if current_plus_di > current_minus_di: bullish_signals.append(f"ADX fort ({nombre_fr(adx_val, 0)}) tendance haussière")
        else:                                   bearish_signals.append(f"ADX fort ({nombre_fr(adx_val, 0)}) tendance baissière")

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

    if current_cmf > 0.15:   bullish_signals.append(f"CMF positif ({nombre_fr(current_cmf, 2)}) — afflux d'argent")
    elif current_cmf < -0.15: bearish_signals.append(f"CMF négatif ({nombre_fr(current_cmf, 2)}) — sortie d'argent")

    if rsi_divergence == "bullish":  bullish_signals.append("Divergence haussière RSI/Prix")
    elif rsi_divergence == "bearish": bearish_signals.append("Divergence baissière RSI/Prix")

    if current_price < float(bb_lower.iloc[-1]):  bullish_signals.append("Prix sous la bande Bollinger basse")
    elif current_price > float(bb_upper.iloc[-1]): bearish_signals.append("Prix au-dessus de la bande Bollinger haute")

    if not has_volume:
        pass  # aucun volume publié : rien à en dire
    elif volume_ratio > 1.5 and _bar_ret >= 0:
        bullish_signals.append(f"Volume élevé à la hausse ({nombre_fr(volume_ratio, 1)}x la moyenne)")
    elif volume_ratio > 1.5:
        bearish_signals.append(f"Volume élevé à la baisse ({nombre_fr(volume_ratio, 1)}x la moyenne)")
    elif volume_ratio < 0.5: bearish_signals.append("Volume très faible")

    _m10 = "10j" if abs(_k - 1) < 1e-9 else "10 bougies"
    if momentum_10d / _k > 5:   bullish_signals.append(f"Momentum {_m10} fort (+{nombre_fr(momentum_10d, 1)}%)")
    elif momentum_10d / _k < -5: bearish_signals.append(f"Momentum {_m10} faible ({nombre_fr(momentum_10d, 1)}%)")

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

    # L'afflux de volume renforce le mouvement de la bougie, dans SON sens.
    _sens = 1 if _bar_ret >= 0 else -1
    if volume_ratio > 2.0:   volume_score += 12 * _sens
    elif volume_ratio > 1.5: volume_score += 8 * _sens
    elif volume_ratio > 1.2: volume_score += 4 * _sens
    elif volume_ratio < 0.5: volume_score -= 10
    elif volume_ratio < 0.8: volume_score -= 5

    volume_score = max(0, min(100, volume_score))
    if not has_volume:
        volume_score = 50  # neutre : il n'y a rien à lire

    # 4. MOMENTUM SCORE (multi-period: 3d, 10d, 20d)
    #
    # LES SEUILS SONT ÉCRITS POUR DES BOUGIES D'UN JOUR. « +8 % sur 10
    # bougies » est une forte hausse en journalier et n'arrive presque jamais
    # en bougies de 15 minutes : la composante restait collée à 50 en
    # intraday, et sur-réagissait en hebdomadaire. Les mouvements sont donc
    # ramenés à l'échelle d'un jour (une variation croît comme la racine du
    # temps) avant d'être comparés aux mêmes seuils. En journalier, le
    # facteur vaut 1 : rien ne change.
    momentum_3d_j = momentum_3d / _k
    momentum_10d_j = momentum_10d / _k
    momentum_20d_j = momentum_20d / _k
    momentum_score = 50

    if momentum_3d_j > 3:    momentum_score += 8
    elif momentum_3d_j > 1:  momentum_score += 4
    elif momentum_3d_j < -3: momentum_score -= 8
    elif momentum_3d_j < -1: momentum_score -= 4

    if momentum_10d_j > 8:    momentum_score += 15
    elif momentum_10d_j > 4:  momentum_score += 9
    elif momentum_10d_j > 1:  momentum_score += 4
    elif momentum_10d_j < -8: momentum_score -= 15
    elif momentum_10d_j < -4: momentum_score -= 9
    elif momentum_10d_j < -1: momentum_score -= 4

    if momentum_20d_j > 15:    momentum_score += 18
    elif momentum_20d_j > 8:   momentum_score += 10
    elif momentum_20d_j > 3:   momentum_score += 5
    elif momentum_20d_j < -15: momentum_score -= 18
    elif momentum_20d_j < -8:  momentum_score -= 10
    elif momentum_20d_j < -3:  momentum_score -= 5

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
        _bbw_j = bb_width_pct / _k      # à l'échelle d'un jour, comme le momentum
        if _bbw_j < 5:    volatility_score = 80
        elif _bbw_j < 10: volatility_score = 65
        elif _bbw_j < 18: volatility_score = 55
        elif _bbw_j < 28: volatility_score = 40
        else:                   volatility_score = 30
        if relative_atr / _k > 5:   volatility_score -= 10
        elif relative_atr / _k < 1: volatility_score += 5
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

    # L'écart à la moyenne 200 (voir EXTENSION_POIDS plus haut).
    extension_atr = None
    extension_score = None
    try:
        if extension and ema200 is not None and atr and float(atr) > 0:
            extension_atr = (float(current_price) - float(ema200.iloc[-1])) / float(atr)
            extension_score = int(max(0, min(100, 50 - EXTENSION_PENTE * extension_atr)))
            final_score = int((1 - EXTENSION_POIDS) * final_score + EXTENSION_POIDS * extension_score)
            final_score = max(0, min(100, final_score))
            if extension_atr <= EXTENSION_REPLI:
                bullish_signals.append(
                    f"Cours à {nombre_fr(abs(extension_atr), 1)} ATR sous sa moyenne 200 — repli marqué, "
                    "historiquement suivi d'une reprise")
            elif extension_atr >= EXTENSION_ETIRE:
                bearish_signals.append(
                    f"Cours étiré à {nombre_fr(extension_atr, 1)} ATR au-dessus de sa moyenne 200 — "
                    "historiquement, la suite a été plus faible")
    except Exception:
        extension_atr = extension_score = None

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
        "extension_atr": _safe(extension_atr, None) if extension_atr is not None else None,
        "extension_score": extension_score,
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


# Durée d'une bougie, en minutes, par unité de temps de l'analyse.
_DUREE_BOUGIE = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240,
                 "1d": 1440, "3d": 4320, "1w": 10080, "1mo": 44640}


def derniere_bougie_en_cours(hist, timeframe: str) -> bool:
    """Vrai si la dernière bougie n'est pas encore close.

    Une bougie est datée de son début : tant que sa durée n'est pas écoulée,
    elle se forme encore. Pour une bougie journalière, cela couvre toute la
    journée calendaire, y compris après la clôture — on lit alors le volume
    de la veille, ce qui ne coûte qu'un jour de fraîcheur, là où lire une
    séance à moitié faite faussait le score dans le sens de la baisse.
    """
    try:
        t0 = hist.index[-1]
        now = pd.Timestamp.now(tz=t0.tz) if getattr(t0, "tzinfo", None) else pd.Timestamp.now()
        return (now - t0) < pd.Timedelta(minutes=_DUREE_BOUGIE.get(timeframe, 1440))
    except Exception:
        return False


def resample_ohlcv(df, rule: str):
    """Aggregate OHLCV bars into a coarser interval Yahoo does not serve."""
    if df is None or df.empty:
        return df
    # origin="epoch" : des bornes fixes. Par défaut elles partaient de la
    # première ligne téléchargée ; la fenêtre glissant chaque jour, les
    # bougies de 3 jours changeaient de découpage d'un jour à l'autre, et le
    # graphique (2 ans) et l'analyse (5 ans) n'avaient pas les mêmes bougies.
    # « 3D » n'est pas une durée fixe pour pandas (origin y est ignoré) :
    # exprimé en heures, il l'est.
    rule = {"3D": "72h", "1D": "24h"}.get(rule, rule)
    out = df.resample(rule, origin="epoch").agg({
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
