"""
AI Analysis routes - Using the same analyzer as the bot
"""
import logging
import os
import re
import sys
import asyncio
from pathlib import Path
from typing import Optional
import pandas as pd
import numpy as np
import json as _json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from .auth import get_current_user, get_current_user_optional
from .premium import is_user_premium, get_user_limits
from ..database import execute_query, execute_write
from ._prices import fetch_ohlcv, fetch_prices, prewarm_ohlcv
from ._indicators import rsi_wilder, atr_wilder, adx_wilder, true_range, data_confidence
from ._universe import (EXTRA_CRYPTO, extend_market, classify,
                        resolve_universe, universe_summary,
                        resolve_zones, zones_summary)
from ._intent import parse as parse_intent
from ._opportunity import describe as describe_opportunity
from ._market_context import (benchmark_for, compute_market_context,
                              apply_context_gate, regime_series)
from ._scoring import (compute_score, derive_trend, derive_signal, TIMEFRAME_FETCH,
                       HIGHER_TF, htf_trend, apply_htf_gate, resample_ohlcv,
                       htf_from_primary, ENGINE_VERSION)
from ._backtest import run_backtest
from ._personnel import adapter as adapter_personnel, lire_profil

logger = logging.getLogger(__name__)

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


def price_decimals(value) -> int:
    """Combien de décimales pour un PRIX, selon son ordre de grandeur.

    Deux décimales conviennent à une action à 336 €. Sur un actif à 0,35 €
    elles détruisent l'information : avec un ATR de 0,0003, le stop calculé
    à 0,34982 et l'objectif à 0,35030 étaient tous deux arrondis à « 0,35 »
    AVANT d'être envoyés. L'écran affichait donc un stop égal à son objectif,
    à côté d'un rapport risque/rendement de 1,7 — l'assistant lui-même en
    tirait la conclusion qu'il n'y avait « aucune marge ». Le frontend ne
    pouvait rien y faire : la précision était déjà perdue ici.

    Les mêmes seuils que côté interface (voir priceDecimals dans
    SettingsContext.tsx), pour que la donnée et son affichage s'accordent.
    """
    try:
        v = abs(float(value))
    except Exception:
        return 2
    if not np.isfinite(v) or v == 0:
        return 2
    if v >= 100:
        return 2
    if v >= 1:
        return 3
    if v >= 0.01:
        return 5
    if v >= 0.0001:
        return 6
    return 8


def _px(value, default=None):
    """Un PRIX, arrondi selon sa grandeur. Pour un pourcentage ou un ratio,
    utiliser _safe(..., 2) : ceux-là n'ont pas ce problème."""
    return _safe(value, default, price_decimals(value))


def _sanitize(obj):
    """Recursively walk a dict/list and replace any NaN/Inf float with None."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    # bools/strings/None must survive as-is (float(True) would turn them into 1.0)
    if obj is None or isinstance(obj, (bool, str)):
        return obj
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


# Concurrent market-data fetches allowed to a single scan. Must stay below the
# app's I/O thread pool (IO_THREADS, 32 by default) so a scan can never take
# every thread and stall the rest of the site.
_SCAN_CONCURRENCY = int(os.getenv("SCAN_CONCURRENCY", "16"))


# ── Scan quota helpers ──────────────────────────────────────────────────────

def _next_scan_reset() -> str:
    """Next UTC midnight — when the daily scan quota refills."""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    return (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()


async def _get_scans_today(user_id: int) -> int:
    # UTC, deliberately: _record_scan writes an isoformat UTC timestamp, so
    # counting against the server's LOCAL date would compare two different
    # calendars and reset the quota at the wrong moment on any non-UTC host.
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()
    result = await execute_query(
        "SELECT COUNT(*) as cnt FROM web_scan_usage WHERE user_id = ? AND created_at LIKE ?",
        (user_id, f"{today}%")
    )
    return result[0]["cnt"] if result else 0


async def _check_scan_limit(user: dict) -> dict:
    user_id = user.get("id")
    limits  = await get_user_limits(user)
    daily   = limits.get("scanner_scans_per_day", 1)
    scans   = await _get_scans_today(user_id)
    if daily == -1:
        return {"can_scan": True, "scans_today": scans, "daily_limit": -1,
                "remaining": -1, "is_premium": True, "next_reset": None}
    remaining = max(0, daily - scans)
    return {
        "can_scan":    remaining > 0,
        "scans_today": scans,
        "daily_limit": daily,
        "remaining":   remaining,
        "is_premium":  False,
        "next_reset":  _next_scan_reset() if remaining <= 0 else None,
    }


async def _record_scan(user_id: int, market: str) -> None:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        "INSERT INTO web_scan_usage (user_id, market, created_at) VALUES (?, ?, ?)",
        (user_id, market, now)
    )


def compute_trade_window(
    timeframe: str,
    atr_pct: float,
    rsi: float,
    adx: float,
    volatility_20d: float,
    trend_score: float,
    final_score: float,
) -> dict:
    """
    Compute recommended trade hold duration from technical context.
    Logic: optimal_candles × bar_minutes → precise duration tied to the timeframe.
    """

    # Minutes per bar for each timeframe
    BAR_MIN = {
        "5m": 5, "15m": 15, "30m": 30,
        "1h": 60, "4h": 240, "1d": 1440,
        "3d": 4320, "1w": 10080, "1mo": 43200,
    }
    bar_min = BAR_MIN.get(timeframe, 60)

    # Base candle range per timeframe (conservative → aggressive)
    BASE_CANDLES = {
        "5m":  (3, 6),  "15m": (3, 6),  "30m": (3, 7),
        "1h":  (3, 7),  "4h":  (2, 5),  "1d":  (2, 5),
        "3d":  (2, 4),  "1w":  (2, 4),  "1mo": (1, 3),
    }
    c_min, c_max = BASE_CANDLES.get(timeframe, (3, 6))

    reasons:  list[str] = []
    warnings: list[str] = []
    adj = 0  # candle adjustment (negative = shorten, positive = extend)

    # ── RSI ────────────────────────────────────────────────────────────────
    if rsi < 25:
        adj -= 2
        warnings.append(
            f"RSI en survente extrême ({rsi:.0f}) : renversement haussier imminent attendu "
            f"sur 1–2 bougies de {timeframe}, ne pas rester trop longtemps après le rebond"
        )
    elif rsi > 75:
        adj -= 2
        warnings.append(
            f"RSI en surachat extrême ({rsi:.0f}) : risque de retournement baissier rapide, "
            f"coupez dès le premier signal de faiblesse"
        )
    elif rsi < 35:
        adj -= 1
        warnings.append(
            f"RSI en zone de survente ({rsi:.0f}) : le rebond peut être court, "
            f"préférez une cible conservative (1–2 bougies)"
        )
    elif rsi > 65:
        adj -= 1
        warnings.append(
            f"RSI proche du surachat ({rsi:.0f}) : le mouvement haussier montre des signes "
            f"d'essoufflement, serrez le stop"
        )
    else:
        reasons.append(f"RSI neutre ({rsi:.0f}) : pas de pression de retournement immédiate")

    # ── ADX / Tendance ─────────────────────────────────────────────────────
    if adx > 35:
        adj += 2
        reasons.append(
            f"Tendance très forte (ADX {adx:.0f}) : le momentum directionnels est solide, "
            f"la position peut être tenue plus longtemps"
        )
    elif adx > 25:
        adj += 1
        reasons.append(f"Tendance établie (ADX {adx:.0f}) : signal fiable, bon rapport durée/risque")
    elif adx < 15:
        adj -= 2
        warnings.append(
            f"Tendance quasi absente (ADX {adx:.0f}) : marché latéral ou en consolidation, "
            f"les faux signaux sont fréquents — duration très courte recommandée"
        )
    elif adx < 20:
        adj -= 1
        warnings.append(
            f"Tendance faible (ADX {adx:.0f}) : direction peu claire, "
            f"réduisez l'exposition et sortez rapidement"
        )

    # ── Volatilité ATR ─────────────────────────────────────────────────────
    if atr_pct > 4:
        adj -= 2
        warnings.append(
            f"Volatilité très forte (ATR {atr_pct:.1f}% du prix) : l'actif peut faire "
            f"+/−{atr_pct:.1f}% par bougie — les objectifs sont atteints (ou dépassés) très vite"
        )
    elif atr_pct > 2.5:
        adj -= 1
        warnings.append(
            f"Volatilité élevée (ATR {atr_pct:.1f}%) : risque de gap important entre deux bougies, "
            f"ne laissez pas traîner la position sans stop serré"
        )
    elif atr_pct < 0.8:
        adj += 1
        reasons.append(
            f"Faible volatilité (ATR {atr_pct:.1f}%) : l'actif évolue lentement, "
            f"les objectifs mettent plus de bougies à être atteints"
        )
    else:
        reasons.append(f"Volatilité modérée (ATR {atr_pct:.1f}%) : mouvements cohérents avec le timeframe")

    # ── Score global ───────────────────────────────────────────────────────
    if final_score >= 72:
        adj += 1
        reasons.append(
            f"Setup de haute conviction ({final_score}/100) : tous les indicateurs s'alignent, "
            f"position pouvant être tenue dans la fourchette haute"
        )
    elif final_score <= 38:
        adj -= 1
        warnings.append(
            f"Score de conviction faible ({final_score}/100) : le setup n'est pas idéal, "
            f"préférez une sortie rapide et ne doublez pas la mise"
        )

    # ── Volatilité historique ──────────────────────────────────────────────
    if volatility_20d and volatility_20d > 50:
        adj -= 1
        warnings.append(
            f"Volatilité historique très forte ({volatility_20d:.0f}% ann.) : "
            f"actif à forte amplitude, les retournements sont brutaux"
        )

    # ── Calcul final ───────────────────────────────────────────────────────
    candles_opt = max(1, round((c_min + c_max) / 2) + adj)
    candles_min = max(1, c_min + adj)
    candles_max = max(candles_min + 1, c_max + adj)

    min_min = candles_min * bar_min
    max_min = candles_max * bar_min
    opt_min = candles_opt * bar_min

    def _fmt(m: float) -> str:
        if m < 60:
            return f"{int(round(m))} min"
        h = m / 60
        if h < 24:
            hh = int(h)
            mm = int(round((h - hh) * 60))
            return f"{hh}h{mm:02d}" if mm else f"{hh}h"
        d = h / 24
        if d < 7:
            dd = int(d)
            hh = int(round((d - dd) * 24))
            return f"{dd}j{hh:02d}h" if hh else f"{dd}j"
        w = d / 7
        return f"{w:.1f} sem"

    # Impossible to give reliable window when ADX < 10 AND RSI extreme
    unreliable = adx < 10 and (rsi < 30 or rsi > 70)
    if unreliable:
        warnings.append(
            "Combinaison ADX très bas + RSI extrême : aucun signal directionnel fiable. "
            "Il est déconseillé de prendre position dans ces conditions — attendez une "
            "confirmation de tendance (ADX > 20) avant d'entrer."
        )

    # Risk level
    risk_factors = sum([
        atr_pct > 3,
        rsi < 30 or rsi > 70,
        adx < 20,
        final_score < 40,
        bool(volatility_20d and volatility_20d > 45),
    ])
    risk_level = "high" if risk_factors >= 3 else "medium" if risk_factors >= 1 else "low"

    return {
        "min_minutes":     int(min_min),
        "max_minutes":     int(max_min),
        "optimal_minutes": int(opt_min),
        "candles_min":     candles_min,
        "candles_max":     candles_max,
        "candles_opt":     candles_opt,
        "label_min":       _fmt(min_min),
        "label_max":       _fmt(max_min),
        "label_optimal":   _fmt(opt_min),
        "bar_label":       timeframe,
        "risk_level":      risk_level,
        "unreliable":      unreliable,
        "reasons":         reasons,
        "warnings":        warnings,
    }


def upcoming_risk_catalysts(symbol: str, horizon_hours: float) -> list[dict]:
    """Return upcoming high-impact macro events within horizon_hours from now."""
    from datetime import datetime, timezone, timedelta, date
    import calendar as cal_mod

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=horizon_hours)
    s = symbol.upper()

    # Symbol classification
    is_us     = not any(x in s for x in [".PA",".DE",".L",".T",".HK",".AS",".KS"])
    is_europe = any(x in s for x in [".PA",".DE",".L",".AS",".BR",".MC"])
    is_crypto = s.endswith("-USD") or s.endswith("-BTC")
    is_us_index = s in {"^GSPC","^IXIC","^DJI","^RUT","SPX","NDX","DJI"}

    events: list[dict] = []

    # ── Helper: first weekday N of a month ──────────────────────────────
    def _first_weekday(year: int, month: int, weekday: int) -> date:
        """Return the first `weekday` (0=Mon…6=Sun) in given year/month."""
        d = date(year, month, 1)
        while d.weekday() != weekday:
            d += timedelta(days=1)
        return d

    # ── FOMC dates 2025-2026 (decision day = 2nd day) ───────────────────
    FOMC = [
        date(2025,1,29), date(2025,3,19), date(2025,5,7),  date(2025,6,18),
        date(2025,7,30), date(2025,9,17), date(2025,10,29),date(2025,12,10),
        date(2026,1,28), date(2026,3,18), date(2026,5,6),  date(2026,6,17),
        date(2026,7,29), date(2026,9,16), date(2026,10,28),date(2026,12,9),
    ]

    # ── ECB dates 2025-2026 ─────────────────────────────────────────────
    ECB = [
        date(2025,1,30), date(2025,3,6),  date(2025,4,17), date(2025,6,5),
        date(2025,7,24), date(2025,9,11), date(2025,10,30),date(2025,12,18),
        date(2026,1,29), date(2026,3,5),  date(2026,4,16), date(2026,6,4),
        date(2026,7,23), date(2026,9,10), date(2026,10,29),date(2026,12,17),
    ]

    def _add(event_date: date, name: str, impact: str, relevance: str, hour_utc: int = 13):
        dt = datetime(event_date.year, event_date.month, event_date.day,
                      hour_utc, 30, tzinfo=timezone.utc)
        if now <= dt <= cutoff:
            delta = dt - now
            days  = delta.days
            hours = int(delta.total_seconds() // 3600)
            if days >= 2:   when = f"dans {days}j"
            elif hours >= 1: when = f"dans {hours}h"
            else:            when = "imminent"
            events.append({
                "name":      name,
                "datetime":  dt.isoformat(),
                "when":      when,
                "impact":    impact,
                "relevance": relevance,
            })

    # NFP — first Friday of each month at 13:30 UTC
    if is_us or is_us_index:
        for m_offset in range(3):
            d = now.date()
            m = (d.month - 1 + m_offset) % 12 + 1
            y = d.year + ((d.month - 1 + m_offset) // 12)
            nfp = _first_weekday(y, m, 4)  # 4 = Friday
            _add(nfp, "NFP (Emplois non-agricoles)", "high",
                 "Mouvement fort sur indices US et USD attendu", 13)

    # CPI US — around 10th-14th (use 12th as approximation)
    if is_us or is_us_index or is_crypto:
        for m_offset in range(3):
            d = now.date()
            m = (d.month - 1 + m_offset) % 12 + 1
            y = d.year + ((d.month - 1 + m_offset) // 12)
            try:
                _add(date(y, m, 12), "CPI USA (Inflation)", "high",
                     "Volatilité forte si surprise inflationniste", 12)
            except ValueError:
                pass

    # FOMC
    if is_us or is_us_index or is_crypto:
        for d in FOMC:
            _add(d, "Décision FOMC (Fed)", "high",
                 "Pivot monétaire possible — impact majeur sur actions et crypto", 19)

    # ECB
    if is_europe:
        for d in ECB:
            _add(d, "Décision BCE", "high",
                 "Impact direct sur actions européennes et EUR", 13)

    # Sort by datetime
    events.sort(key=lambda e: e["datetime"])
    return events[:5]  # at most 5


# Registered BEFORE the catch-all "/{symbol}": Starlette matches routes in
# declaration order, so a literal path declared after it is unreachable —
# /api/analysis/scan-limit was being served as an analysis of the ticker
# "scan-limit". Any new literal route under this prefix belongs here too.
# ── Fundamentals / news: cached, and skipped where they cannot exist ───────
# `.info` is the slowest call an analysis makes (1-3 s, sometimes far more)
# and it was made on EVERY analysis — including crypto, indices, forex and
# futures, where Yahoo has no P/E, no margins, no analysts to return. It is
# now skipped for those, and cached for 12 h for the rest: a company's
# balance sheet does not change between two page loads.
_INFO_CACHE: dict = {}
_INFO_TTL = 12 * 3600.0
_EDGE_CACHE: dict = {}
_EDGE_TTL = 3600.0


def _has_fundamentals(symbol: str) -> bool:
    u = symbol.upper()
    return not (u.startswith("^") or u.endswith("-USD") or u.endswith("-BTC")
                or u.endswith("=X") or u.endswith("=F"))


def _fetch_ticker_info_sync(symbol: str):
    """(ticker, info) — blocking; call from the executor."""
    import time as _time
    import yfinance as yf
    hit = _INFO_CACHE.get(symbol)
    if hit and _time.monotonic() - hit[0] < _INFO_TTL:
        return hit[1]
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
    except Exception:
        ticker, info = None, {}
    _INFO_CACHE[symbol] = (_time.monotonic(), (ticker, info))
    return ticker, info


def _fetch_news_sync(ticker):
    """Blocking network call; was being made inline in an async route."""
    try:
        return ticker.news[:5] if ticker is not None and getattr(ticker, "news", None) else []
    except Exception:
        return []


def _historical_edge_sync(symbol: str, timeframe: str, hist, sl_atr: float,
                          tp_atr: float, bench_close=None, current_regime: str | None = None) -> dict:
    """Triple-barrier replay of THIS asset's history with the user's own
    stop/target, cached for an hour.

    When a benchmark series is supplied, every past trade is also labelled
    with the market regime that was visible when it opened, so the engine can
    answer the sharper question: not "what followed this score level here?"
    but "what followed it here, in a market like today's?".
    """
    import time as _time
    key = (symbol, timeframe, round(sl_atr, 2), round(tp_atr, 2), current_regime or "-")
    hit = _EDGE_CACHE.get(key)
    if hit and _time.monotonic() - hit[0] < _EDGE_TTL:
        return hit[1]
    try:
        regimes = None
        if bench_close is not None:
            try:
                regimes = regime_series(bench_close)
            except Exception:
                regimes = None
        # Coarser sampling than the explicit backtest button (120 vs 250
        # evaluations): this runs on the first analysis of every asset, and
        # the trade count it yields is what matters, not the grid density.
        r = run_backtest(hist, horizon=10, sl_atr=sl_atr, tp_atr=tp_atr,
                         mode="event", max_evals=120, regimes=regimes)
        edge = {
            "n_trades": r.get("n_trades", 0),
            "enough_samples": r.get("enough_samples", False),
            "expectancy_net_r": r.get("expectancy_net_r"),
            "win_rate": r.get("win_rate"),
            "p_target": r.get("p_target"),
            "p_stop": r.get("p_stop"),
            "p_timeout": r.get("p_timeout"),
            "profit_factor": r.get("profit_factor"),
            "engine_version": r.get("engine_version"),
            "by_regime": r.get("by_regime") or {},
            "by_direction": r.get("by_direction") or {},
            "min_trades_for_condition": r.get("min_trades_for_condition"),
        }
        edge["scenario"] = _build_scenario(edge, current_regime)
    except Exception:
        edge = {"n_trades": 0, "enough_samples": False, "scenario": None}
    _EDGE_CACHE[key] = (_time.monotonic(), edge)
    return edge


_REGIME_FR = {"BULL": "marché haussier", "BEAR": "marché baissier", "NEUTRAL": "marché neutre"}

# Les deux seuils qui décident du poids de l'edge sur le verdict, en R par
# trade et nets de frais.
#
# -0,05 R est le bruit : sur une quarantaine de trades, une espérance à
# -0,03 R ne se distingue pas de zéro et n'a rien à dire. -0,25 R ne se
# confond avec rien — c'est un quart du risque perdu à chaque passage, et
# répété assez souvent pour qu'un compte y passe.
#
# Entre les deux, on avertit. Au-delà, on bloque : pas parce que la direction
# serait fausse, mais parce que CE plan, sur CET actif, avec CE stop et CET
# objectif, a déjà été joué et a perdu.
EDGE_BRUIT = -0.05
EDGE_BLOQUANT = -0.25


def edge_du_sens(edge: dict, direction: str | None) -> dict | None:
    """L'edge historique DANS LE SENS que le verdict propose.

    Le replay prend l'achat au-dessus de 60 et la vente sous 40 : l'espérance
    globale mélange donc deux populations. Opposer cette moyenne à un verdict
    haussier, c'est lui opposer pour moitié des trades pris à la vente.

    La découpe par sens est préférée dès qu'elle tient assez de trades ; en
    dessous on retombe sur la mesure globale ET ON LE DIT, parce qu'une
    espérance calculée sur onze trades présentée comme un verdict serait la
    même faute que les taux de réussite inventés retirés de cette page.
    """
    if not edge or not edge.get("n_trades"):
        return None

    sens = "long" if (direction or "").upper() in ("LONG", "BULLISH", "BULL") else \
           "short" if (direction or "").upper() in ("SHORT", "BEARISH", "BEAR") else None

    cellule = (edge.get("by_direction") or {}).get(sens or "")
    if sens and cellule and cellule.get("enough"):
        return {
            "base": "directionnelle",
            "sens": sens,
            "n_trades": cellule.get("n_trades"),
            "expectancy_net_r": cellule.get("expectancy_net_r"),
            "se_r": cellule.get("se_r"),
            "win_rate": cellule.get("win_rate"),
            "fiable": True,
        }

    return {
        "base": "globale",
        "sens": sens,
        "n_trades": edge.get("n_trades"),
        "expectancy_net_r": edge.get("expectancy_net_r"),
        "se_r": edge.get("se_r"),
        "win_rate": edge.get("win_rate"),
        # Hors découpe directionnelle, la mesure ne vaut que si l'échantillon
        # global est lui-même suffisant.
        "fiable": bool(edge.get("enough_samples")),
    }


def _build_scenario(edge: dict, current_regime: str | None) -> dict | None:
    """The most likely outcome for THIS setup, in TODAY's market.

    Conditioning on the regime is the sharper answer, but slicing ~40 trades
    three ways leaves cells of a dozen. So the conditional figure is only used
    above MIN_TRADES_FOR_CONDITION; otherwise the engine falls back to the
    all-regimes figure and SAYS it did. A twelve-trade frequency presented as
    a probability would be the same lie as the invented hit rates removed from
    this page earlier — with extra machinery.
    """
    if not edge.get("n_trades"):
        return None

    cell = (edge.get("by_regime") or {}).get(current_regime or "")
    if cell and cell.get("enough"):
        basis, stats = "conditional", cell
        label = f"Ce setup en {_REGIME_FR.get(current_regime, 'ce régime')}"
    else:
        basis = "unconditional"
        stats = {
            "n_trades": edge.get("n_trades"),
            "p_target": edge.get("p_target"),
            "p_stop": edge.get("p_stop"),
            "p_timeout": edge.get("p_timeout"),
            "win_rate": edge.get("win_rate"),
            "expectancy_net_r": edge.get("expectancy_net_r"),
            "enough": edge.get("enough_samples"),
        }
        label = "Ce setup, tous régimes confondus"

    outcomes = [("target", stats.get("p_target") or 0.0),
                ("stop", stats.get("p_stop") or 0.0),
                ("timeout", stats.get("p_timeout") or 0.0)]
    most = max(outcomes, key=lambda o: o[1])
    return {
        "basis": basis,
        "regime": current_regime,
        "label": label,
        "n_trades": stats.get("n_trades"),
        "enough": stats.get("enough"),
        "p_target": stats.get("p_target"),
        "p_stop": stats.get("p_stop"),
        "p_timeout": stats.get("p_timeout"),
        "expectancy_net_r": stats.get("expectancy_net_r"),
        "most_likely": most[0],
        "most_likely_pct": round(most[1], 1),
        # Why the conditional figure was not used, when it was not.
        "fallback_reason": (
            None if basis == "conditional"
            else ("no_regime" if not current_regime
                  else f"{(cell or {}).get('n_trades', 0)} trades dans ce régime — sous le seuil")
        ),
    }


def _signal_quality(factor_agreement, htf_aligned, edge: dict) -> dict:
    """How much to trust the DIRECTION — distinct from data quality, which
    says how much to trust the numbers it was computed from. A pristine
    500-bar series can still yield a signal that four factors dispute."""
    pts, notes = 50, []
    if factor_agreement is not None:
        pts += int((factor_agreement - 50) * 0.5)      # ±25
        if factor_agreement < 40:
            notes.append("Facteurs en désaccord")
    if htf_aligned is True:
        pts += 15; notes.append("Confirmé par le timeframe supérieur")
    elif htf_aligned is False:
        pts -= 15; notes.append("Contredit par le timeframe supérieur")
    if edge.get("enough_samples"):
        e = edge.get("expectancy_net_r") or 0.0
        if e > 0.15:
            pts += 10; notes.append(f"Edge historique positif sur cet actif (+{e:.2f}R)")
        elif e < -0.15:
            pts -= 10; notes.append(f"Edge historique négatif sur cet actif ({e:.2f}R)")
    else:
        notes.append("Historique trop court pour mesurer l'edge")
    return {"score": max(0, min(100, pts)), "notes": notes}


def _tradeability(
    risk_reward: float | None,
    data_stale: bool,
    confidence: int,
    vol_percentile: float | None,
    n_bars: int,
    factor_agreement: int | None,
    edge_sens: dict | None = None,
) -> dict:
    """Is this direction actually worth acting on?

    A direction is not a trade. The engine can be confident that an asset is
    heading up and the trade still be a bad idea — reward that does not pay
    for the risk, data too old to act on, volatility that makes any stop a
    lottery. Every blocker is named so the refusal can be argued with rather
    than merely obeyed.
    """
    blockers: list[str] = []
    warnings: list[str] = []

    if risk_reward is not None and risk_reward < 1.2:
        blockers.append(f"Rapport gain/risque de {risk_reward:.1f} — sous 1,2, le setup rémunère mal le risque")
    if data_stale:
        blockers.append("Données de marché périmées — le prix affiché ne reflète plus la séance")
    if confidence < 40:
        blockers.append(f"Confiance des données à {confidence} % — historique trop court pour conclure")
    if n_bars < 60:
        blockers.append(f"Seulement {n_bars} bougies disponibles — insuffisant pour les indicateurs longs")
    if vol_percentile is not None and vol_percentile >= 95:
        blockers.append("Volatilité dans son centile extrême — tout stop devient une loterie")

    # L'EDGE HISTORIQUE NÉGATIF PÈSE ICI, et c'est le bon endroit.
    #
    # Il ne se discutait nulle part : il valait -10 points sur un score
    # secondaire, et la phrase affichée disait mot pour mot « le verdict reste
    # ce qu'il est, mais l'historique ne le soutient pas ». Le moteur mesurait
    # que ce plan avait perdu de l'argent sur cet actif, puis annonçait qu'il
    # n'en tenait pas compte.
    #
    # Ce n'est pourtant pas une mesure de plus : c'est la seule qui ait été
    # CONFRONTÉE AU PRIX. Les indicateurs décrivent, l'edge rapporte ce qui
    # s'est réellement produit quand on a pris ce pari, sur cet actif, avec ce
    # stop et cet objectif.
    #
    # Il bloque plutôt qu'il ne corrige le score, parce que la direction et le
    # plan sont deux questions. Le moteur peut avoir raison sur le sens et le
    # trade rester mauvais — c'est exactement ce que cette fonction existe
    # pour dire, et la raison est nommée plutôt que fondue dans un chiffre.
    if edge_sens and edge_sens.get("fiable"):
        e = edge_sens.get("expectancy_net_r")
        n = edge_sens.get("n_trades") or 0
        precision = ("dans ce sens" if edge_sens.get("base") == "directionnelle"
                     else "les deux sens confondus")
        # L'EFFET DOIT DÉPASSER SA PROPRE IMPRÉCISION AVANT D'INTERDIRE.
        #
        # Mesuré sur KO : -0,306 R sur 19 trades, ce qui se lit comme un
        # verdict et n'en est pas un — l'erreur-type à cet effectif tourne
        # autour de 0,23 R, donc l'intervalle mord largement sur zéro.
        # Bloquer là-dessus, ce serait interdire un trade sur du bruit.
        #
        # On raisonne donc sur la borne la PLUS FAVORABLE de la mesure : même
        # en accordant une erreur-type de marge, l'espérance reste-t-elle
        # nettement négative ? Si oui, le constat tient. Sinon il reste une
        # alerte, ce qu'il est vraiment.
        se = edge_sens.get("se_r") or 0.0
        borne_favorable = (e + se) if e is not None else None
        if borne_favorable is not None and borne_favorable <= EDGE_BLOQUANT:
            blockers.append(
                f"Ce plan a déjà perdu sur cet actif : {abs(e):.2f} R en moyenne "
                f"sur {n} trades comparables ({precision}). Le sens peut être bon, "
                "le plan a été joué et n'a pas payé."
            )
        elif e is not None and e <= EDGE_BRUIT:
            warnings.append(
                f"Historique défavorable sur cet actif : {abs(e):.2f} R perdus en "
                f"moyenne sur {n} trades comparables ({precision})"
            )

    if factor_agreement is not None and factor_agreement < 40:
        warnings.append(f"Facteurs en désaccord ({factor_agreement} %) — signal fragile")
    if vol_percentile is not None and 75 <= vol_percentile < 95:
        warnings.append("Volatilité élevée pour cet actif — réduisez la taille de position")
    if confidence < 70:
        warnings.append(f"Confiance des données à {confidence} %")

    return {
        "tradable": not blockers,
        "blockers": blockers,
        "warnings": warnings,
    }


async def _horizon_utilisateur(current_user: dict) -> str:
    """Le style de trading déclaré : scalp, day, swing ou long.

    En cas de doute on rend « day », qui est aussi le défaut des réglages :
    un scan ne doit jamais échouer parce qu'une préférence est absente.
    """
    try:
        rows = await execute_query(
            "SELECT trading_style FROM web_user_settings WHERE user_id = ?",
            (current_user.get("id"),),
        )
        if rows and rows[0].get("trading_style"):
            return str(rows[0]["trading_style"])
    except Exception:
        pass
    return "day"


@router.get("/scan-universe")
async def get_scan_universe(current_user: dict = Depends(get_current_user)):
    """Les places et les classes réellement disponibles, avec leurs effectifs.

    L'interface ne doit RIEN écrire en dur : une place proposée mais vide est
    une promesse que le scan ne tiendra pas, et c'est ce genre d'écart qui
    fait douter d'un outil.
    """
    u = universe_summary()
    u["zones"] = zones_summary()
    return u


@router.get("/scan-intent")
async def read_scan_intent(
    q: str = Query(default="", max_length=400),
    current_user: dict = Depends(get_current_user),
):
    """Une phrase en français -> des réglages de scan, et ce qui a été compris.

    Le résultat est RENDU, pas appliqué : l'écran affiche ce qu'il a lu et
    l'utilisateur corrige avant de lancer. Un réglage posé sans qu'on sache
    d'où il sort est pire qu'un réglage qu'on aurait mis soi-même — on ne peut
    ni le vérifier ni le reprendre.
    """
    return parse_intent(q)


@router.get("/scan-limit")
async def get_scan_limit(current_user: dict = Depends(get_current_user)):
    """Get user's remaining daily scan quota."""
    return await _check_scan_limit(current_user)


@router.get("/{symbol}")
@limiter.limit("10/minute")
async def analyze_asset(
    request: Request,
    symbol: str,
    timeframe: str = Query(default="1d", pattern="^(5m|15m|30m|1h|4h|1d|3d|1w|1mo)$"),
    # The stop/target multiples of the user's trading profile. The risk plan,
    # the setups and the backtest all use the same pair, so one page never
    # shows two different stops for the same asset.
    sl_atr: float = Query(default=2.0, ge=0.2, le=10.0),
    tp_atr: float = Query(default=3.0, ge=0.2, le=20.0),
    # Weight of fundamentals in the verdict, 0-0.5, set by the profile
    # (0 for scalping, up to 0.45 for long term). Applied ONLY when enough
    # fundamental fields actually exist — a weight on a None is worse than
    # no weight.
    fund_weight: float = Query(default=0.0, ge=0.0, le=0.5),
    # L'horizon déclaré, pour que les constats personnels puissent proposer
    # un autre horizon quand celui-ci ne tient pas avec les disponibilités.
    style: str = Query(default="day", pattern="^(scalp|day|swing|long)$"),
    # OPTIONNEL, et c'est délibéré : l'analyse doit continuer de répondre sans
    # jeton. Un utilisateur connu reçoit en plus le bloc `personnel`.
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Get AI analysis for an asset"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()

    try:
        # Get historical data
        _period, actual_interval, _resample = TIMEFRAME_FETCH.get(timeframe, ("2y", "1d", None))
        hist = await fetch_ohlcv(symbol, period=_period, interval=actual_interval)
        if _resample:
            hist = resample_ohlcv(hist, _resample)

        if hist.empty or len(hist) < 20:
            raise HTTPException(status_code=400, detail="Insufficient data for analysis")

        # ── Data quality: freshness & completeness ─────────────────────────
        from datetime import datetime as _dt, timezone as _tz
        _INTERVAL_MIN = {
            "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240,
            "1d": 1440, "3d": 1440, "1w": 10080, "1mo": 43200,
        }
        try:
            _last_dt = hist.index[-1].to_pydatetime()
            if _last_dt.tzinfo is None:
                _last_dt = _last_dt.replace(tzinfo=_tz.utc)
            last_bar_age_min = (_dt.now(_tz.utc) - _last_dt).total_seconds() / 60
        except Exception:
            last_bar_age_min = 0.0
        _step_min = _INTERVAL_MIN.get(timeframe, 1440)
        # Daily bars tolerate long weekends/holidays; intraday tolerates a session gap
        data_stale = last_bar_age_min > _step_min * (5 if _step_min >= 1440 else 8)
        data_nan_ratio = float(hist["Close"].isna().mean())

        # ── Indicators + 5-component score — shared pure engine ───────────
        close = hist['Close']
        high = hist['High']
        low = hist['Low']
        volume = hist['Volume']

        _cc = close.dropna()
        current_price = float(_cc.iloc[-1])
        prev_price    = float(_cc.iloc[-2]) if len(_cc) >= 2 else current_price
        price_change  = ((current_price - prev_price) / prev_price * 100) if prev_price else 0.0

        # Live price from the same source as top-movers so both stay consistent
        try:
            live = await fetch_prices([symbol])
            lp = live.get(symbol.upper())
            if lp and lp.get("price"):
                current_price = float(lp["price"])
                price_change  = float(lp.get("change", price_change))
        except Exception:
            pass  # keep OHLCV-derived values as fallback

        S = compute_score(high, low, close, volume, current_price=current_price)
        close_clean = S["close_clean"]; vol_clean = S["vol_clean"]
        avg_volume = S["avg_volume"]; volume_ratio = S["volume_ratio"]
        rsi = S["rsi"]; current_rsi = S["current_rsi"]; rsi_divergence = S["rsi_divergence"]
        macd = S["macd"]; signal = S["signal"]; macd_hist = S["macd_hist"]
        ema20 = S["ema20"]; ema50 = S["ema50"]; ema200 = S["ema200"]
        bb_upper = S["bb_upper"]; bb_mid = S["bb_mid"]; bb_lower = S["bb_lower"]
        bb_percent_b = S["bb_percent_b"]; bb_width_pct = S["bb_width_pct"]
        relative_atr = S["relative_atr"]; atr = S["atr"]
        adx_val = S["adx_val"]; current_plus_di = S["current_plus_di"]; current_minus_di = S["current_minus_di"]
        current_stoch_k = S["current_stoch_k"]; current_stoch_d = S["current_stoch_d"]
        current_wr = S["current_wr"]
        obv_trend = S["obv_trend"]; obv_slope = S["obv_slope"]; current_cmf = S["current_cmf"]
        momentum_3d = S["momentum_3d"]; momentum_5d = S["momentum_5d"]
        momentum_10d = S["momentum_10d"]; momentum_20d = S["momentum_20d"]
        fibonacci = S["fibonacci"]
        bullish_signals = S["bullish_signals"]; bearish_signals = S["bearish_signals"]
        conviction_score = S["conviction_score"]

        # Two slow, independent jobs start now and are collected later, so
        # their latency overlaps instead of adding up: fundamentals (skipped
        # where Yahoo has none) and the triple-barrier replay of this asset.
        _loop = asyncio.get_event_loop()
        _info_fut = (_loop.run_in_executor(None, _fetch_ticker_info_sync, symbol)
                     if _has_fundamentals(symbol) else None)
        # The historical replay starts once the benchmark is in hand, a few
        # lines below: labelling each past trade with the regime that was
        # visible when it opened is what turns "what followed this score?"
        # into "what followed it in a market like today's?".
        technical_score = S["technical_score"]; trend_score = S["trend_score"]
        volume_score = S["volume_score"]; momentum_score = S["momentum_score"]
        volatility_score = S["volatility_score"]; final_score = S["final_score"]

        # ── Multi-timeframe confirmation ───────────────────────────────────
        # A daily BUY inside a weekly downtrend (or the mirror case) is the
        # classic trap. The signal is pulled back toward neutral when the
        # higher timeframe disagrees, and credited when it confirms.
        higher_tf_info = {"interval": None, "trend": "UNKNOWN", "aligned": None}
        _htf = htf_from_primary(hist, timeframe)   # derived, no second download
        if _htf:
            try:
                _htf_interval, _htf_closes = _htf
                _h_trend = htf_trend(_htf_closes)
                final_score, _aligned, _bull_note, _bear_note = apply_htf_gate(
                    final_score, _h_trend, _htf_interval)
                higher_tf_info = {"interval": _htf_interval, "trend": _h_trend, "aligned": _aligned}
                if _bull_note: bullish_signals.append(_bull_note)
                if _bear_note: bearish_signals.append(_bear_note)
            except Exception:
                pass

        # ── Market context ────────────────────────────────────────────────
        # The one thing the asset's own candles cannot say: is its market
        # rising, and is the asset leading or lagging it? Same function as the
        # scanner, so the two cannot reach different conclusions.
        market_context = None
        _bench_close = None
        _bench = benchmark_for(symbol)
        if _bench:
            try:
                _b_hist = await fetch_ohlcv(_bench, period=_period, interval=actual_interval)
                if _resample and _b_hist is not None and not _b_hist.empty:
                    _b_hist = resample_ohlcv(_b_hist, _resample)
                if _b_hist is not None and not _b_hist.empty:
                    _bench_close = _b_hist["Close"]
                    market_context = compute_market_context(close, _b_hist["Close"], _bench)
                    final_score, _c_bull, _c_bear = apply_context_gate(final_score, market_context)
                    if _c_bull: bullish_signals.append(_c_bull)
                    if _c_bear: bearish_signals.append(_c_bear)
            except Exception as exc:
                logger.warning("market context failed for %s: %s", symbol, exc)

        _edge_fut = _loop.run_in_executor(
            None, _historical_edge_sync, symbol, timeframe, hist, sl_atr, tp_atr,
            _bench_close, (market_context or {}).get("regime"))

        # Determine trend (based on EMA alignment) — shared with the scanner
        trend = derive_trend(current_price, float(ema20.iloc[-1]), float(ema50.iloc[-1]))

        # Support/Resistance levels
        # 20 bars of the DISPLAYED timeframe: 20 days on a daily chart, but
        # 20 months on a monthly one. The window is reported alongside the
        # levels so a support 20% below the price is read as the multi-year
        # floor it is, not as an intraday level.
        _levels_window = 20
        recent_low = low.tail(_levels_window).min()
        recent_high = high.tail(_levels_window).max()

        # Collect the two background jobs launched right after the engine ran.
        historical_edge = await _edge_fut
        if _info_fut is not None:
            ticker, info = await _info_fut
        else:
            ticker, info = None, {}

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

        # Fundamentals enter the verdict only when the profile asks for it AND
        # the data is actually there. Weighting 45% of a long-term verdict on
        # fields Yahoo left empty would be worse than ignoring them.
        _fund_fields = [fundamentals.get(k) for k in
                        ("pe_ratio", "peg_ratio", "revenue_growth", "earnings_growth",
                         "profit_margin", "roe", "debt_to_equity", "current_ratio")]
        _fund_present = sum(1 for v in _fund_fields if v is not None)
        # The technical final_score stays the ONE verdict shared with the
        # scanner — blending fundamentals into it would make the analysis
        # page disagree with the scanner for the same asset, the exact fault
        # fixed last month. The profile-weighted reading is reported as a
        # separate, labelled score instead.
        fundamentals_applied = fund_weight > 0 and _fund_present >= 3
        profile_score = (int(round(final_score * (1 - fund_weight) + fundamental_score * fund_weight))
                         if fundamentals_applied else int(round(final_score)))

        # Signal — shared thresholds with the scanner
        signal_text = derive_signal(final_score)
        signal_emoji = {"STRONG BUY": "🔥", "BUY": "🟢", "HOLD": "🟡",
                        "SELL": "🟠", "STRONG SELL": "🔴"}[signal_text]

        # ── Direction- and structure-aware risk plan ───────────────────────
        # SELL setups get a short-side plan (SL above, TP below). Stops
        # anchor to the nearest invalidation level (support/resistance with
        # an ATR buffer) when that level sits inside the raw 2×ATR distance,
        # and targets are capped at the first structural obstacle.
        is_short_setup = final_score < 40
        # L'edge du sens proposé, calculé une fois ici : le plan de risque,
        # la jouabilité et la phrase de l'écran doivent lire la MÊME mesure,
        # sinon la page explique un chiffre et en bloque un autre.
        _edge_sens = edge_du_sens(historical_edge, "SHORT" if is_short_setup else "LONG")
        _support = float(recent_low)
        _resistance = float(recent_high)
        risk_notes: list[str] = []
        sl_basis = "atr"
        tp_capped = False

        # A level only counts as an obstacle/anchor when it sits at a
        # meaningful distance (≥1 ATR): at fresh highs/lows the 20-bar
        # extreme IS the current price and must not strangle the plan.
        # Multiples come from the trading profile (query), so this plan, the
        # setups and the backtest describe ONE stop and ONE target.
        if is_short_setup:
            _sl = current_price + atr * sl_atr
            if (_resistance - current_price) >= atr and (_resistance + atr * 0.5) < _sl:
                _sl = _resistance + atr * 0.5
                sl_basis = "resistance"
            _tp = current_price - atr * tp_atr
            if _tp < _support < current_price and (current_price - _support) >= atr:
                _tp = _support
                tp_capped = True
                risk_notes.append("Objectif plafonné au support — premier obstacle structurel")
            _sl_t = current_price + atr * sl_atr * 0.5
            _tp_c = current_price - atr * tp_atr * 0.5
        else:
            _sl = current_price - atr * sl_atr
            if (current_price - _support) >= atr and (_support - atr * 0.5) > _sl:
                _sl = _support - atr * 0.5
                sl_basis = "support"
            _tp = current_price + atr * tp_atr
            if current_price < _resistance < _tp and (_resistance - current_price) >= atr:
                _tp = _resistance
                tp_capped = True
                risk_notes.append("Objectif plafonné à la résistance — premier obstacle structurel")
            _sl_t = current_price - atr * sl_atr * 0.5
            _tp_c = current_price + atr * tp_atr * 0.5

        _rr = abs(_tp - current_price) / abs(_sl - current_price) if abs(_sl - current_price) > 1e-9 else None
        if _rr is not None and _rr < 1.2:
            risk_notes.append(f"R/R de {_rr:.1f} sous 1.2 — le setup rémunère mal le risque pris")

        risk_block = {
            "direction":                 "SHORT" if is_short_setup else "LONG",
            "suggested_sl":              _px(_sl),
            "suggested_tp":              _px(_tp),
            "suggested_sl_tight":        _px(_sl_t),
            "suggested_tp_conservative": _px(_tp_c),
            "risk_reward":               _safe(_rr, 1.5, 2),
            "atr_stop_pct":              _safe(atr / current_price * 200, None, 2),
            "sl_basis":                  sl_basis,
            "tp_capped_at_level":        tp_capped,
            "notes":                     risk_notes,
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
            news = (await asyncio.get_event_loop().run_in_executor(None, _fetch_news_sync, ticker)
                    if ticker is not None else [])
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

        target_bull = current_price + atr * atr_mult_bull
        target_base = current_price + atr * atr_mult_base
        target_bear = current_price + atr * atr_mult_bear

        _confidence = max(0, data_confidence(
            n_bars=len(close.dropna()),
            has_ema200=ema200 is not None,
            adx_valid=adx_val > 0,
            has_volume=bool(len(vol_clean)) and float(vol_clean.sum()) > 0,
        ) - (25 if data_stale else 0) - (10 if data_nan_ratio > 0.05 else 0))

        # Analyst sentiment
        analyst_sentiment = "neutral"
        if fundamentals.get("recommendation"):
            rec = fundamentals["recommendation"].lower()
            if "buy" in rec or "strong" in rec:
                analyst_sentiment = "bullish"
            elif "sell" in rec or "under" in rec:
                analyst_sentiment = "bearish"

        # ── Trade window ──────────────────────────────────────────────────────
        trade_window = compute_trade_window(
            timeframe=timeframe,
            atr_pct=float(_safe(relative_atr, 2.0)),
            rsi=float(_safe(current_rsi, 50.0)),
            adx=float(adx_val),
            volatility_20d=float(_safe(volatility_20d, 20.0) or 20.0),
            trend_score=float(trend_score),
            final_score=float(final_score),
        )
        # Horizon for catalyst lookup: 3× max window, capped at 30 days
        catalyst_horizon = min((trade_window["max_minutes"] / 60) * 3, 720)
        trade_window["catalysts"] = upcoming_risk_catalysts(symbol, catalyst_horizon)
        if data_stale:
            trade_window.setdefault("warnings", []).append(
                "Dernière bougie ancienne — les niveaux affichés peuvent être décalés du marché actuel"
            )

        result = {
            "symbol": symbol,
            "timeframe": timeframe,
            "company": company_info,
            "price": {
                "current": _px(current_price, 0.0),
                "change": _safe(price_change, 0.0, 2),
                "high_24h": _px(high.iloc[-1], 0.0),
                "low_24h": _px(low.iloc[-1], 0.0),
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
                "confidence": _confidence,
            },
            "data_quality": {
                "stale": data_stale,
                "last_bar_age_minutes": _safe(last_bar_age_min, 0, 0),
                "nan_ratio": _safe(data_nan_ratio, 0.0, 3),
            },
            # Stamped so a position opened months ago can be traced back to the
            # engine that produced its numbers.
            "engine_version": ENGINE_VERSION,
            "risk_multiples": {"sl_atr": sl_atr, "tp_atr": tp_atr},
            # Second reading, weighted by the profile's fundamental share.
            # Absent from the scanner (no fundamentals there), hence kept apart.
            "profile_score": {
                "total": profile_score,
                "signal": derive_signal(profile_score),
                "fundamentals_applied": fundamentals_applied,
                "fund_weight": fund_weight if fundamentals_applied else 0.0,
                "fund_fields_present": _fund_present,
            },
            # What this score level has been worth ON THIS ASSET — always with
            # its sample size, never as a bare percentage.
            "historical_edge": historical_edge,
            # La même mesure, restreinte au sens que le plan propose. C'est
            # elle que la jouabilité oppose au verdict, donc c'est elle que
            # l'écran doit citer : expliquer une moyenne tous sens confondus
            # et bloquer sur une autre mesure rendrait le refus incontestable
            # faute d'être compréhensible.
            "edge_direction": _edge_sens,
            "signal_quality": _signal_quality(
                S.get("factor_agreement"), higher_tf_info.get("aligned"), historical_edge),
            "volatility_context": {
                "percentile": S.get("vol_percentile"),
                "regime": S.get("vol_regime"),
                "basis": S.get("vol_basis"),
            },
            "factor_directions": S.get("factor_directions"),
            # Regime of the asset's own market, and whether it leads or lags it.
            "market_context": market_context,
            # A direction is not a trade. Blockers are listed explicitly so the
            # refusal is auditable rather than a silent downgrade.
            "tradeability": _tradeability(
                risk_reward=_rr,
                data_stale=data_stale,
                confidence=_confidence,
                vol_percentile=S.get("vol_percentile"),
                n_bars=len(close.dropna()),
                factor_agreement=S.get("factor_agreement"),
                # L'edge mesuré DANS LE SENS que le plan propose, pas la
                # moyenne des deux sens.
                edge_sens=_edge_sens,
            ),
            "higher_timeframe": higher_tf_info,
            "conviction": {
                "score": conviction_score,
                "bullish_signals": bullish_signals,
                "bearish_signals": bearish_signals,
                "total_signals": len(bullish_signals) + len(bearish_signals),
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
                    "ema20": _px(ema20.iloc[-1]),
                    "ema50": _px(ema50.iloc[-1]),
                    "ema200": _px(ema200.iloc[-1]) if ema200 is not None else None
                },
                "bollinger": {
                    "upper": _px(bb_upper.iloc[-1]),
                    "middle": _px(bb_mid.iloc[-1]),
                    "lower": _px(bb_lower.iloc[-1]),
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
                "support":    _px(recent_low),
                "resistance": _px(recent_high),
                "pivot":      _safe((recent_high + recent_low + current_price) / 3, None, 2),
                "window_bars":    _levels_window,
                "window_interval": timeframe,
            },
            "risk": risk_block,
            "fundamentals": fundamentals,
            "performance": performance,
            "volatility": {
                "20d": _safe(volatility_20d, None, 2),
                "60d": _safe(volatility_60d, None, 2) if volatility_60d is not None else None,
            },
            "targets": {
                "bull": _px(target_bull),
                "base": _px(target_base),
                "bear": _px(target_bear),
                "analyst_mean": fundamentals.get("target_price"),
                "analyst_high": fundamentals.get("target_high"),
                "analyst_low":  fundamentals.get("target_low"),
            },
            "analyst_sentiment": analyst_sentiment,
            "trade_window": trade_window,
            "news": news_items,
        }

        # ── Ce que cette analyse veut dire POUR CETTE PERSONNE ─────────────
        #
        # Ajouté après coup sur le résultat complet, et jamais dans le calcul
        # du verdict : les réponses de l'utilisateur décident de ce qu'on lui
        # montre et de ce dont on l'avertit, pas de ce que fait le marché.
        # Un échec ici doit coûter le bloc, pas l'analyse.
        if current_user:
            try:
                profil = await lire_profil(current_user["id"])
                personnel = adapter_personnel(profil, result, style)
                if personnel:
                    result["personnel"] = personnel
            except Exception as e:
                logger.warning("bloc personnel indisponible pour %s : %s", symbol, e)

        return _sanitize(result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


ASSET_NAMES: dict[str, str] = {
    **EXTRA_CRYPTO,
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
    # ── Indices (compléments) ──────────────────────────────────────────────
    "^SBF120": "SBF 120", "^AEX": "AEX 25", "^BFX": "BEL 20",
    "^IBEX": "IBEX 35", "^FTSEMIB": "FTSE MIB", "^SSMI": "SMI",
    "^KOSPI": "KOSPI", "^VIX": "VIX (Volatilité)",
    # ── ETFs (compléments) ─────────────────────────────────────────────────
    "VOO": "Vanguard S&P 500", "VTI": "Vanguard Total Stock Market",
    "GLD": "SPDR Gold Shares", "SLV": "iShares Silver Trust",
    "TLT": "iShares 20+ Year Treasury", "HYG": "iShares High Yield Corp Bond",
    "LQD": "iShares Investment Grade Corp Bond", "XLV": "Health Care Select SPDR",
    "XLI": "Industrial Select SPDR", "XLY": "Consumer Discretionary SPDR",
    "XLP": "Consumer Staples SPDR", "XLU": "Utilities Select SPDR",
    "XLRE": "Real Estate Select SPDR", "XLB": "Materials Select SPDR",
    "XLC": "Communication Services SPDR", "ARKK": "ARK Innovation ETF",
    "SOXX": "iShares Semiconductor ETF", "VNQ": "Vanguard Real Estate ETF",
    "SCHD": "Schwab US Dividend Equity ETF", "EFA": "iShares MSCI EAFE ETF",
    "EEM": "iShares MSCI Emerging Markets ETF",
    # ── USA - Mega Cap Tech & Semiconducteurs ──────────────────────────────
    "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "Nvidia",
    "GOOGL": "Alphabet (A)", "GOOG": "Alphabet (C)", "AMZN": "Amazon",
    "META": "Meta Platforms", "TSLA": "Tesla", "AVGO": "Broadcom",
    "ORCL": "Oracle", "AMD": "Advanced Micro Devices", "INTC": "Intel",
    "QCOM": "Qualcomm", "TXN": "Texas Instruments", "MU": "Micron Technology",
    "AMAT": "Applied Materials", "LRCX": "Lam Research", "KLAC": "KLA Corp",
    "MRVL": "Marvell Technology", "ON": "ON Semiconductor", "ADI": "Analog Devices",
    "MCHP": "Microchip Technology", "SWKS": "Skyworks Solutions",
    "MPWR": "Monolithic Power Systems", "ENPH": "Enphase Energy",
    "WOLF": "Wolfspeed", "ACLS": "Axcelis Technologies", "ONTO": "Onto Innovation",
    "RMBS": "Rambus", "CRUS": "Cirrus Logic", "MTSI": "MACOM Technology",
    # ── USA - Software / Cloud ─────────────────────────────────────────────
    "CRM": "Salesforce", "ADBE": "Adobe", "NOW": "ServiceNow",
    "WDAY": "Workday", "SNOW": "Snowflake", "DDOG": "Datadog",
    "ZS": "Zscaler", "CRWD": "CrowdStrike", "NET": "Cloudflare",
    "OKTA": "Okta", "TEAM": "Atlassian", "MDB": "MongoDB",
    "HUBS": "HubSpot", "ZM": "Zoom", "DOCN": "DigitalOcean",
    "GTLB": "GitLab", "BILL": "Bill.com", "PCTY": "Paylocity",
    "PATH": "UiPath", "NTNX": "Nutanix", "ESTC": "Elastic",
    "CFLT": "Confluent", "S": "SentinelOne", "TENB": "Tenable",
    "CYBR": "CyberArk",
    # ── USA - Internet / Plateformes ───────────────────────────────────────
    "NFLX": "Netflix", "UBER": "Uber", "LYFT": "Lyft", "SNAP": "Snap",
    "PINS": "Pinterest", "TWTR": "Twitter", "RDDT": "Reddit", "ABNB": "Airbnb",
    "DASH": "DoorDash", "COIN": "Coinbase", "RBLX": "Roblox",
    "U": "Unity Software", "EA": "Electronic Arts", "TTWO": "Take-Two Interactive",
    "ATVI": "Activision Blizzard", "MTCH": "Match Group", "IAC": "IAC",
    # ── USA - Hardware / IT ────────────────────────────────────────────────
    "CSCO": "Cisco", "IBM": "IBM", "DELL": "Dell Technologies", "HPQ": "HP Inc.",
    "HPE": "Hewlett Packard Enterprise", "PSTG": "Pure Storage", "NTAP": "NetApp",
    "WDC": "Western Digital", "STX": "Seagate Technology", "ANET": "Arista Networks",
    "JNPR": "Juniper Networks", "FFIV": "F5 Networks", "CIEN": "Ciena",
    # ── USA - Finance / Banques / Paiements ────────────────────────────────
    "JPM": "JPMorgan Chase", "BAC": "Bank of America", "WFC": "Wells Fargo",
    "GS": "Goldman Sachs", "MS": "Morgan Stanley", "C": "Citigroup",
    "BLK": "BlackRock", "SCHW": "Charles Schwab", "TFC": "Truist Financial",
    "USB": "U.S. Bancorp", "PNC": "PNC Financial", "COF": "Capital One",
    "DFS": "Discover Financial", "SYF": "Synchrony Financial", "ALLY": "Ally Financial",
    "V": "Visa", "MA": "Mastercard", "AXP": "American Express", "PYPL": "PayPal",
    "FIS": "Fidelity National Information", "FI": "Fiserv", "GPN": "Global Payments",
    "AFRM": "Affirm", "SQ": "Block (Square)",
    # ── USA - Assurances / Asset Managers ──────────────────────────────────
    "BRK-B": "Berkshire Hathaway (B)", "BRK-A": "Berkshire Hathaway (A)",
    "MET": "MetLife", "PRU": "Prudential Financial", "AFL": "Aflac",
    "TRV": "Travelers", "CB": "Chubb", "ALL": "Allstate", "PGR": "Progressive",
    "HIG": "Hartford Financial", "AON": "Aon", "MMC": "Marsh McLennan",
    "WTW": "Willis Towers Watson", "AJG": "Arthur J. Gallagher", "BRO": "Brown & Brown",
    "BX": "Blackstone", "KKR": "KKR", "APO": "Apollo Global Management",
    "CG": "Carlyle Group", "ARES": "Ares Management", "BAM": "Brookfield Asset Management",
    # ── USA - Santé / Pharma ───────────────────────────────────────────────
    "JNJ": "Johnson & Johnson", "UNH": "UnitedHealth", "PFE": "Pfizer",
    "ABBV": "AbbVie", "LLY": "Eli Lilly", "MRK": "Merck", "TMO": "Thermo Fisher",
    "ABT": "Abbott", "MDT": "Medtronic", "BMY": "Bristol-Myers Squibb",
    "AMGN": "Amgen", "GILD": "Gilead Sciences", "BIIB": "Biogen", "REGN": "Regeneron",
    "VRTX": "Vertex Pharmaceuticals", "ILMN": "Illumina", "IQV": "IQVIA",
    "DHR": "Danaher", "BAX": "Baxter International", "BDX": "Becton Dickinson",
    "EW": "Edwards Lifesciences", "SYK": "Stryker", "ZBH": "Zimmer Biomet",
    "ISRG": "Intuitive Surgical", "BSX": "Boston Scientific", "HCA": "HCA Healthcare",
    "CNC": "Centene", "CVS": "CVS Health", "MCK": "McKesson", "CI": "Cigna",
    "HUM": "Humana", "MOH": "Molina Healthcare", "MRNA": "Moderna", "BNTX": "BioNTech",
    "NTLA": "Intellia Therapeutics", "BEAM": "Beam Therapeutics",
    "CRSP": "CRISPR Therapeutics", "TDOC": "Teladoc Health",
    # ── USA - Grande Consommation ──────────────────────────────────────────
    "PG": "Procter & Gamble", "KO": "Coca-Cola", "PEP": "PepsiCo",
    "MDLZ": "Mondelez", "GIS": "General Mills", "K": "Kellanova",
    "CPB": "Campbell Soup", "CAG": "Conagra Brands", "HSY": "Hershey",
    "MKC": "McCormick", "SJM": "J.M. Smucker", "HRL": "Hormel Foods",
    "TSN": "Tyson Foods", "CL": "Colgate-Palmolive", "KMB": "Kimberly-Clark",
    "CHD": "Church & Dwight",
    # ── USA - Distribution / Retail ────────────────────────────────────────
    "WMT": "Walmart", "COST": "Costco", "TGT": "Target", "HD": "Home Depot",
    "LOW": "Lowe's", "EBAY": "eBay", "ETSY": "Etsy", "W": "Wayfair",
    "ULTA": "Ulta Beauty", "TJX": "TJX Companies", "ROST": "Ross Stores",
    "BURL": "Burlington Stores", "FIVE": "Five Below", "DLTR": "Dollar Tree",
    "DG": "Dollar General", "KR": "Kroger", "SFM": "Sprouts Farmers Market",
    # ── USA - Restauration ─────────────────────────────────────────────────
    "MCD": "McDonald's", "SBUX": "Starbucks", "CMG": "Chipotle",
    "YUM": "Yum! Brands", "QSR": "Restaurant Brands", "DRI": "Darden Restaurants",
    "TXRH": "Texas Roadhouse", "SHAK": "Shake Shack", "BROS": "Dutch Bros",
    # ── USA - Mode / Luxe / Sport ──────────────────────────────────────────
    "NKE": "Nike", "LULU": "Lululemon", "DECK": "Deckers Outdoor",
    "SKX": "Skechers", "PVH": "PVH Corp", "RL": "Ralph Lauren",
    "TPR": "Tapestry", "CPRI": "Capri Holdings", "HBI": "Hanesbrands",
    # ── USA - Médias / Télécoms ────────────────────────────────────────────
    "DIS": "Walt Disney", "WBD": "Warner Bros. Discovery", "PARA": "Paramount Global",
    "FOX": "Fox Corp", "FOXA": "Fox Corp (A)", "CMCSA": "Comcast",
    "CHTR": "Charter Communications", "TMUS": "T-Mobile US", "VZ": "Verizon",
    "T": "AT&T",
    # ── USA - Automobile ───────────────────────────────────────────────────
    "AAL": "American Airlines", "BA": "Boeing",
    "GM": "General Motors", "F": "Ford", "RIVN": "Rivian", "LCID": "Lucid Motors",
    "NIO": "Nio", "LI": "Li Auto", "XPEV": "XPeng",
    # ── USA - Voyages / Hôtels / Aérien ────────────────────────────────────
    "MAR": "Marriott", "HLT": "Hilton", "H": "Hyatt", "MGM": "MGM Resorts",
    "WYNN": "Wynn Resorts", "LVS": "Las Vegas Sands", "RCL": "Royal Caribbean",
    "CCL": "Carnival", "NCLH": "Norwegian Cruise Line", "DAL": "Delta Air Lines",
    "UAL": "United Airlines", "LUV": "Southwest Airlines", "BKNG": "Booking Holdings",
    "EXPE": "Expedia",
    # ── USA - Énergie ──────────────────────────────────────────────────────
    "XOM": "ExxonMobil", "CVX": "Chevron", "COP": "ConocoPhillips",
    "SLB": "Schlumberger", "EOG": "EOG Resources", "MPC": "Marathon Petroleum",
    "VLO": "Valero Energy", "PSX": "Phillips 66", "HES": "Hess", "DVN": "Devon Energy",
    "FANG": "Diamondback Energy", "BKR": "Baker Hughes", "HAL": "Halliburton",
    "OXY": "Occidental Petroleum", "APA": "APA Corp", "CTRA": "Coterra Energy",
    "AR": "Antero Resources", "CHK": "Chesapeake Energy",
    # ── USA - Énergie propre ───────────────────────────────────────────────
    "FSLR": "First Solar", "RUN": "Sunrun", "ARRY": "Array Technologies",
    "CWEN": "Clearway Energy", "AES": "AES Corp", "NEP": "NextEra Energy Partners",
    "BE": "Bloom Energy", "PLUG": "Plug Power", "BLDP": "Ballard Power Systems",
    # ── USA - Utilities ────────────────────────────────────────────────────
    "NEE": "NextEra Energy", "DUK": "Duke Energy", "SO": "Southern Company",
    "D": "Dominion Energy", "AEP": "American Electric Power", "EXC": "Exelon",
    "SRE": "Sempra Energy", "PCG": "PG&E", "ED": "Consolidated Edison",
    "XEL": "Xcel Energy", "WEC": "WEC Energy Group", "ES": "Eversource Energy",
    "PPL": "PPL Corp", "CMS": "CMS Energy", "ETR": "Entergy",
    "CEG": "Constellation Energy", "VST": "Vistra",
    # ── USA - Industriel / Défense ─────────────────────────────────────────
    "CAT": "Caterpillar", "GE": "GE Aerospace", "HON": "Honeywell", "MMM": "3M",
    "LMT": "Lockheed Martin", "RTX": "RTX (Raytheon)", "NOC": "Northrop Grumman",
    "GD": "General Dynamics", "HII": "Huntington Ingalls", "AXON": "Axon Enterprise",
    "LHX": "L3Harris Technologies", "KTOS": "Kratos Defense", "BWXT": "BWX Technologies",
    "HEI": "Heico", "TDG": "TransDigm", "EMR": "Emerson Electric", "ETN": "Eaton",
    "ROK": "Rockwell Automation", "AME": "AMETEK", "PH": "Parker Hannifin",
    "ITW": "Illinois Tool Works", "DOV": "Dover", "IR": "Ingersoll Rand",
    "XYL": "Xylem", "IDEX": "IDEX Corp", "TRMB": "Trimble",
    # ── USA - Transport / Logistique ───────────────────────────────────────
    "UNP": "Union Pacific", "CSX": "CSX Corp", "NSC": "Norfolk Southern",
    "CHRW": "C.H. Robinson", "ODFL": "Old Dominion Freight", "SAIA": "Saia",
    "XPO": "XPO Logistics", "JBHT": "J.B. Hunt Transport", "WERN": "Werner Enterprises",
    "GXO": "GXO Logistics", "FDX": "FedEx", "UPS": "United Parcel Service",
    # ── USA - Matériaux ────────────────────────────────────────────────────
    "LIN": "Linde", "APD": "Air Products", "SHW": "Sherwin-Williams",
    "PPG": "PPG Industries", "IFF": "International Flavors & Fragrances",
    "EMN": "Eastman Chemical", "RPM": "RPM International", "PKG": "Packaging Corp",
    "IP": "International Paper", "SEE": "Sealed Air", "BALL": "Ball Corp",
    "CCK": "Crown Holdings", "OLN": "Olin Corp", "CE": "Celanese",
    "ALB": "Albemarle", "FCX": "Freeport-McMoRan", "NEM": "Newmont",
    "AA": "Alcoa", "CLF": "Cleveland-Cliffs", "X": "U.S. Steel", "NUE": "Nucor",
    "STLD": "Steel Dynamics", "CF": "CF Industries", "MOS": "Mosaic",
    # ── USA - REITs / Immobilier ───────────────────────────────────────────
    "AMT": "American Tower", "PLD": "Prologis", "EQIX": "Equinix",
    "CCI": "Crown Castle", "SPG": "Simon Property Group", "O": "Realty Income",
    "PSA": "Public Storage", "EQR": "Equity Residential", "AVB": "AvalonBay Communities",
    "DLR": "Digital Realty", "VTR": "Ventas", "WELL": "Welltower",
    "ARE": "Alexandria Real Estate", "BXP": "BXP Inc.", "KIM": "Kimco Realty",
    "REG": "Regency Centers", "NNN": "National Retail Properties", "ADC": "Agree Realty",
    "STAG": "Stag Industrial", "VICI": "VICI Properties",
    "GLPI": "Gaming & Leisure Properties", "SUI": "Sun Communities",
    "ELS": "Equity Lifestyle", "UDR": "UDR", "CPT": "Camden Property",
    "ESS": "Essex Property", "MAA": "Mid-America Apartment",
    # ── Japon (compléments) ────────────────────────────────────────────────
    "6954.T": "Fanuc", "8035.T": "Tokyo Electron", "7741.T": "Hoya",
    "8766.T": "Tokio Marine",
    # ── Hong Kong / Chine (compléments) ────────────────────────────────────
    "2318.HK": "Ping An Insurance", "0388.HK": "HKEX",
    # ── Corée du Sud (compléments) ─────────────────────────────────────────
    "005380.KS": "Hyundai Motor", "000270.KS": "Kia",
    # ── Inde (compléments) ─────────────────────────────────────────────────
    "HINDUNILVR.NS": "Hindustan Unilever", "ITC.NS": "ITC Ltd",
    # ── France - CAC 40 (compléments) ──────────────────────────────────────
    "AI.PA": "Air Liquide", "ALO.PA": "Alstom", "MT.AS": "ArcelorMittal",
    "CAP.PA": "Capgemini", "BN.PA": "Danone", "ENGI.PA": "Engie",
    "KER.PA": "Kering", "LR.PA": "Legrand", "MC.PA": "LVMH", "ML.PA": "Michelin",
    "ORA.PA": "Orange", "PUB.PA": "Publicis Groupe", "RNO.PA": "Renault",
    "STLA": "Stellantis", "TTE.PA": "TotalEnergies", "URW.PA": "Unibail-Rodamco-Westfield",
    "DG.PA": "Vinci", "VIV.PA": "Vivendi", "SW.PA": "Sodexo",
    # ── France - SBF 120 (compléments) ─────────────────────────────────────
    "AF.PA": "Air France-KLM", "AM.PA": "Dassault Aviation", "BIM.PA": "BioMérieux",
    "BVI.PA": "Bureau Veritas", "CNP.PA": "CNP Assurances", "DEC.PA": "JCDecaux",
    "FDJ.PA": "FDJ (La Française des Jeux)", "GTT.PA": "Gaztransport & Technigaz",
    "ILD.PA": "Iliad", "NK.PA": "Imerys", "NEX.PA": "Nexans", "RUI.PA": "Rubis",
    "SEB.PA": "SEB", "TFI.PA": "TF1", "TKO.PA": "Tikehau Capital", "UBI.PA": "Ubisoft",
    "ATOS.PA": "Atos", "COFA.PA": "Coface",
    # ── Pays-Bas - AEX (compléments) ───────────────────────────────────────
    "ADYEN.AS": "Adyen", "HEIA.AS": "Heineken", "SHEL.AS": "Shell",
    "WKL.AS": "Wolters Kluwer", "NN.AS": "NN Group", "AGN.AS": "Aegon",
    "RAND.AS": "Randstad", "ABN.AS": "ABN AMRO", "AKZA.AS": "Akzo Nobel",
    "UMG.AS": "Universal Music Group", "BESI.AS": "BE Semiconductor",
    "IMCD.AS": "IMCD", "ASRNL.AS": "ASR Nederland", "LIGHT.AS": "Signify",
    "DSFIR.AS": "DSM-Firmenich", "TKWY.AS": "Just Eat Takeaway", "GLPG.AS": "Galapagos",
    # ── Belgique - BEL 20 ──────────────────────────────────────────────────
    "UCB.BR": "UCB", "KBC.BR": "KBC Group", "APAM.BR": "Aperam", "AGS.BR": "Ageas",
    "ACKB.BR": "Ackermans & van Haaren", "COLR.BR": "Colruyt", "AED.BR": "Aedifica",
    "BEKB.BR": "Bekaert", "GBLB.BR": "Groupe Bruxelles Lambert", "PROX.BR": "Proximus",
    "SOF.BR": "Sofina", "WDP.BR": "Warehouses De Pauw", "SOLB.BR": "Solvay",
    "MELE.BR": "Melexis",
    # ── Portugal - PSI ─────────────────────────────────────────────────────
    "EDP.LS": "EDP - Energias de Portugal", "GALP.LS": "Galp Energia",
    "JMT.LS": "Jerónimo Martins", "NOS.LS": "NOS", "SON.LS": "Sonae",
    "BCP.LS": "Banco Comercial Português", "EDPR.LS": "EDP Renováveis",
    # ── Allemagne - DAX 40 (compléments) ───────────────────────────────────
    "BEI.DE": "Beiersdorf", "BMW.DE": "BMW", "BNR.DE": "Brenntag", "CON.DE": "Continental",
    "DTG.DE": "Daimler Truck", "DB1.DE": "Deutsche Börse", "DHL.DE": "DHL Group",
    "DTE.DE": "Deutsche Telekom", "EOAN.DE": "E.ON", "FRE.DE": "Fresenius",
    "HNR1.DE": "Hannover Re", "HEIDELG.DE": "Heidelberg Materials", "HEN3.DE": "Henkel",
    "MRK.DE": "Merck KGaA", "MTX.DE": "MTU Aero Engines", "MUV2.DE": "Munich Re",
    "P911.DE": "Porsche AG", "PAH3.DE": "Porsche Automobil Holding", "QIA.DE": "Qiagen",
    "RHM.DE": "Rheinmetall", "SRT3.DE": "Sartorius", "SHL.DE": "Siemens Healthineers",
    "SY1.DE": "Symrise", "VNA.DE": "Vonovia", "ZAL.DE": "Zalando",
    "1COV.DE": "Covestro", "PUM.DE": "Puma",
    # ── Royaume-Uni - FTSE 100 (compléments) ───────────────────────────────
    "BHP.L": "BHP Group", "AAL.L": "Anglo American", "REL.L": "RELX",
    "NG.L": "National Grid", "CPG.L": "Compass Group", "RR.L": "Rolls-Royce",
    "VOD.L": "Vodafone", "BT-A.L": "BT Group", "BARC.L": "Barclays",
    "LLOY.L": "Lloyds Banking Group", "STAN.L": "Standard Chartered",
    "NWG.L": "NatWest Group", "PRU.L": "Prudential", "LGEN.L": "Legal & General",
    "AV.L": "Aviva", "ADM.L": "Admiral Group", "FLTR.L": "Flutter Entertainment",
    "RMV.L": "Rightmove", "SGRO.L": "Segro", "RKT.L": "Reckitt Benckiser",
    "SN.L": "Smith & Nephew", "HLN.L": "Haleon", "NXT.L": "Next", "JD.L": "JD Sports",
    "KGF.L": "Kingfisher", "MKS.L": "Marks & Spencer", "TW.L": "Taylor Wimpey",
    "PSN.L": "Persimmon", "HL.L": "Hargreaves Lansdown", "IMB.L": "Imperial Brands",
    "BATS.L": "British American Tobacco", "EXPN.L": "Experian", "WPP.L": "WPP",
    "IAG.L": "International Airlines Group", "EZJ.L": "easyJet", "RTO.L": "Rentokil Initial",
    "HLMA.L": "Halma", "SBRY.L": "Sainsbury's", "ABF.L": "Associated British Foods",
    "SSE.L": "SSE",
    # ── Espagne - IBEX 35 ──────────────────────────────────────────────────
    "ITX.MC": "Inditex", "BBVA.MC": "BBVA", "CLNX.MC": "Cellnex Telecom",
    "CABK.MC": "CaixaBank", "FER.MC": "Ferrovial", "ACS.MC": "ACS Group",
    "REP.MC": "Repsol", "ELE.MC": "Endesa", "REE.MC": "Redeia (Red Eléctrica)",
    "AMS.MC": "Amadeus IT Group", "MAP.MC": "Mapfre", "NTGY.MC": "Naturgy",
    "SAB.MC": "Banco Sabadell", "GRF.MC": "Grifols", "IAG.MC": "International Airlines Group",
    "ANA.MC": "Acciona", "IDR.MC": "Indra Sistemas",
    # ── Italie - FTSE MIB ──────────────────────────────────────────────────
    "RACE.MI": "Ferrari", "UCG.MI": "UniCredit", "MB.MI": "Mediobanca",
    "G.MI": "Generali", "STM.MI": "STMicroelectronics", "PRY.MI": "Prysmian",
    "MONC.MI": "Moncler", "BC.MI": "Brunello Cucinelli", "FBK.MI": "FinecoBank",
    "LDO.MI": "Leonardo", "NEXI.MI": "Nexi", "CPR.MI": "Campari", "SRG.MI": "Snam",
    "TRN.MI": "Terna", "BAMI.MI": "Banco BPM", "STLAM.MI": "Stellantis",
    # ── Suisse - SMI (compléments) ─────────────────────────────────────────
    "UBSG.SW": "UBS Group", "ZURN.SW": "Zurich Insurance", "ABBN.SW": "ABB",
    "CFR.SW": "Richemont", "LONN.SW": "Lonza Group", "SIKA.SW": "Sika",
    "PGHN.SW": "Partners Group", "KNIN.SW": "Kühne + Nagel", "GIVN.SW": "Givaudan",
    "SREN.SW": "Swiss Re", "HOLN.SW": "Holcim", "GEBN.SW": "Geberit",
    "SOON.SW": "Sonova", "LISN.SW": "Lindt & Sprüngli",
    # ── Crypto (compléments) ───────────────────────────────────────────────
    "TON-USD": "Toncoin", "TRX-USD": "TRON", "USDT-USD": "Tether",
    "USDC-USD": "USD Coin", "DAI-USD": "Dai", "AR-USD": "Arweave",
    "LPT-USD": "Livepeer", "COMP-USD": "Compound", "BAL-USD": "Balancer",
    "1INCH-USD": "1inch", "SUSHI-USD": "SushiSwap", "ENJ-USD": "Enjin Coin",
    "EOS-USD": "EOS", "DASH-USD": "Dash",
    # ── Matières premières (compléments) ───────────────────────────────────
    "ZN=F": "Zinc", "PB=F": "Plomb", "NI=F": "Nickel",
}


@router.get("/scan/{market_key}")
@limiter.limit("2/minute")
async def scan_market(
    request: Request,
    market_key: str,
    min_score: int = Query(default=60, ge=0, le=100),
    limit: int = Query(default=20, le=50),
    opportunity_type: str = Query(default="all"),
    # Scanning on one timeframe and opening the analysis on another is the
    # surest way to contradict yourself. The client sends the timeframe its
    # trading style will land on.
    timeframe: str = Query(default="1d", pattern="^(5m|15m|30m|1h|4h|1d|3d|1w|1mo)$"),
    direction: str = Query(default="both", pattern="^(long|short|both)$"),
    zones: str = Query(default="", description="EUROPE,USA,CRYPTO… — leur RÉUNION"),
    places: str = Query(default="", description="PARIS,FRANCFORT,… — vide = toutes"),
    classes: str = Query(default="", description="ACTION,CRYPTO,… — vide = toutes"),
    stream: bool = Query(default=False, description="Diffuser chaque actif dès qu'il est scoré"),
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
                "next_reset": quota.get("next_reset"),
            }
        )

    # L'HORIZON DÉCLARÉ, lu une fois pour tout le scan. Le client envoie déjà
    # l'unité de temps que son style vise, mais l'unité ne dit pas le style :
    # « 1d » sert aussi bien au swing qu'au long terme, et ces deux profils ne
    # doivent pas recevoir le même conseil sur un rebond à contre-tendance.
    _style = await _horizon_utilisateur(current_user)

    fetch_period, fetch_interval, fetch_resample = TIMEFRAME_FETCH.get(timeframe, ("2y", "1d", None))

    # L'univers se compose sur deux axes indépendants — les places et les
    # classes d'actifs — parce que « un marché à la fois » ne permettait
    # d'exprimer ni « uniquement Paris », ni « tout sauf la crypto », ni
    # aucun mélange. Le segment d'URL reste accepté pour ne rien casser de ce
    # qui existe, mais il n'est plus que l'un des trois filtres possibles.
    market_key = market_key.upper()
    want_places = [p.strip().upper() for p in (places or "").split(",") if p.strip()]
    want_classes = [c.strip().upper() for c in (classes or "").split(",") if c.strip()]
    want_markets: list[str] = []
    if market_key and market_key != "ALL":
        if market_key not in MARKETS:
            raise HTTPException(status_code=404, detail="Market not found")
        want_markets = [market_key]

    # Les ZONES s'unissent, les places et classes se croisent : ce sont deux
    # façons de désigner un univers, pas deux réglages du même. « Europe ET
    # crypto » n'a de sens qu'en réunion — aucune crypto ne cote à Paris — et
    # c'est pourtant la combinaison la plus naturelle à demander. Les zones
    # priment donc quand elles sont fournies ; les axes fins restent pour qui
    # veut composer exactement.
    want_zones = [z.strip().upper() for z in (zones or "").split(",") if z.strip()]
    if want_zones:
        assets = resolve_zones(want_zones)
        if want_classes:
            assets = [a for a in assets if classify(a)[0] in want_classes]
    else:
        assets = resolve_universe(places=want_places, classes=want_classes,
                                  markets=want_markets)
    if not assets:
        raise HTTPException(
            status_code=400,
            detail="Aucun actif ne correspond à cette sélection. Élargissez les places ou les classes."
        )

    async def _analyze(symbol: str):
        """Score one asset with the SAME engine, on the SAME history, as the
        analysis page the user lands on after clicking the row.

        This used to be a private simplified scorer (RSI/MACD/EMA/volume only)
        running on a fixed 3-month daily history, while the analysis page ran
        compute_score() on the timeframe of the user's trading style, with its
        own trend rule and its own signal thresholds. Four independent sources
        of disagreement: the scanner could label an asset HAUSSIER and the
        analysis open on a red bearish panel for the same asset, at the same
        moment. Everything below now goes through the shared engine."""
        try:
            # Use the batched frame when we have it; fall back per symbol
            # for anything the batch did not return.
            hist = prewarmed.get(symbol.upper())
            if hist is None:
                hist = await fetch_ohlcv(symbol, period=fetch_period, interval=fetch_interval)
            if fetch_resample:
                hist = resample_ohlcv(hist, fetch_resample)
            if hist is None or len(hist) < 20:
                return None

            close = hist["Close"].astype(float)
            high  = hist["High"].astype(float)
            low   = hist["Low"].astype(float)
            vol   = hist["Volume"].astype(float)
            n     = len(close)

            price = float(close.iloc[-1])
            _lp = live_px.get(symbol.upper())
            if _lp and _lp.get("price"):
                price = float(_lp["price"])
            if price <= 0:
                return None

            S = compute_score(high, low, close, vol, current_price=price)
            final_score = S["final_score"]
            ups   = list(S["bullish_signals"])
            downs = list(S["bearish_signals"])

            # Same higher-timeframe confirmation the analysis applies. Skipping
            # it here would leave an 8-point gap — enough to show BUY in the
            # scanner and HOLD on the analysis page for the same asset.
            _htf = htf_from_primary(hist, timeframe)   # derived, no second download
            if _htf:
                try:
                    _htf_interval, _htf_closes = _htf
                    _h_trend = htf_trend(_htf_closes)
                    final_score, _al, _bn, _rn = apply_htf_gate(final_score, _h_trend, _htf_interval)
                    if _bn: ups.append(_bn)
                    if _rn: downs.append(_rn)
                except Exception:
                    pass

            # Same market context the analysis applies, from the shared bars.
            _bench = benchmark_for(symbol)
            _ctx = None
            if _bench and _bench in bench_bars:
                try:
                    _bb = bench_bars[_bench]
                    if _bb is not None and not _bb.empty:
                        _ctx = compute_market_context(close, _bb["Close"], _bench)
                        final_score, _cb, _cr = apply_context_gate(final_score, _ctx)
                        if _cb: ups.append(_cb)
                        if _cr: downs.append(_cr)
                except Exception:
                    pass

            score = int(round(final_score))
            ema20_last = float(S["ema20"].iloc[-1])
            ema50_last = float(S["ema50"].iloc[-1])
            trend_en   = derive_trend(price, ema20_last, ema50_last)
            signal     = derive_signal(final_score)

            rsi        = float(S["current_rsi"])
            vol_ratio  = float(S["volume_ratio"])
            macd_above = float(S["macd"].iloc[-1]) > float(S["signal"].iloc[-1])
            macd_cross = macd_above and float(S["macd"].iloc[-2]) <= float(S["signal"].iloc[-2])

            # ── Performance over the fetched history ───────
            chg_1d = float((price - close.iloc[-2]) / close.iloc[-2] * 100) if n >= 2 else 0.0
            chg_1w = float((price - close.iloc[-5]) / close.iloc[-5] * 100) if n >= 5 else 0.0
            chg_1m = float((price - close.iloc[-22]) / close.iloc[-22] * 100) if n >= 22 else 0.0

            # ── Structure ──────────────────────────────────
            # Deux échelles, et la distinction compte.
            #
            # Les extrêmes de TOUT l'historique servent à dire « proche de son
            # plus haut » — c'est bien la question posée. Mais ils ne peuvent
            # pas servir de niveaux d'invalidation : sur deux ans d'historique,
            # le plus bas d'une action à 25 € était à 12,67 €, et annoncer
            # « sous 12,67 le scénario tombe » ne veut rien dire. Un niveau
            # qu'on ne verra pas de l'année n'invalide rien.
            #
            # Les niveaux ACTIONNABLES se lisent donc sur la période récente —
            # une quarantaine de bougies, soit deux mois en journalier —, la
            # fenêtre où le prix a réellement buté.
            high_hist = float(high.max())
            low_hist  = float(low.min())
            _w = min(len(close), max(20, min(60, n // 4)))
            recent_high = float(high.iloc[-_w:].max())
            recent_low  = float(low.iloc[-_w:].min())
            near_breakout = (price / high_hist) >= 0.96 if high_hist > 0 else False
            near_support  = (price / low_hist) <= 1.10 if low_hist > 0 else False
            pct_from_high = (price - high_hist) / high_hist * 100 if high_hist > 0 else 0.0

            bb_up  = float(S["bb_upper"].iloc[-1])
            bb_low = float(S["bb_lower"].iloc[-1])
            bb_mid = float(S["bb_mid"].iloc[-1])
            bb_squeeze = (bb_up - bb_low) / bb_mid * 100 < 5.0 if bb_mid else False
            vol_spike = vol_ratio > 1.8

            # ── Opportunity tags (kept for the signal filter) ──
            tags = []
            opp_type = "momentum"
            if macd_cross:
                tags.append("Croisement MACD"); opp_type = "breakout"
            if rsi < 35:
                tags.append(f"RSI survendu ({rsi:.0f})"); opp_type = "reversal"
            if vol_spike:
                tags.append(f"Vol. x{vol_ratio:.1f}")
            if near_breakout:
                tags.append("Proche du plus haut"); opp_type = "breakout"
            if bb_squeeze:
                tags.append("Squeeze BB"); opp_type = "breakout"
            if chg_1w > 5 and not tags:
                tags.append(f"+{chg_1w:.1f}% / semaine")
            if near_support and rsi < 40:
                tags.append("Rebond support"); opp_type = "reversal"
            opportunity = " · ".join(tags[:2]) if tags else "Momentum"

            # ── Why this asset ranks here ──────────────────
            # Built from the very conviction signals the analysis page prints,
            # so the scanner and the analysis describe the asset in the same
            # words. Leading drivers first, main drag after a "mais".
            lead  = ups[:2] if downs else ups[:3]
            if not lead:
                lead, downs = downs[:2], []
            reason = ", ".join(lead)
            if downs and lead:
                reason += f" — mais {downs[0].lower()}"
            reason = (reason[:1].upper() + reason[1:] + ".") if reason else ""

            # Une phrase, pas une liste de cases cochées. Les niveaux passés
            # ici sont ceux du même historique que le score : le lecteur voit
            # la configuration ET ce qui l'invalide, qui manquait entièrement.
            _cls, _place = classify(symbol)
            opp = describe_opportunity(
                symbol=symbol, price=price, rsi=rsi, volume_ratio=vol_ratio,
                macd_cross=macd_cross, macd_above=macd_above,
                near_breakout=near_breakout, bb_squeeze=bb_squeeze,
                pct_from_high=pct_from_high,
                support=recent_low if recent_low > 0 else None,
                resistance=recent_high if recent_high > 0 else None,
                ema20=ema20_last, ema50=ema50_last,
                chg_1w=chg_1w, chg_1m=chg_1m,
                trend=trend_en, signal=signal, score=float(score),
                # L'horizon déclaré : c'est lui qui décide si un rebond à
                # contre-tendance est une opération ou une distraction.
                style=_style,
            )

            return {
                "symbol":        symbol,
                "name":          ASSET_NAMES.get(symbol, symbol),
                "place":         _place,
                "asset_class":   _cls,
                "setup":         opp["setup"],
                "family":        opp["family"],
                "headline":      opp["headline"],
                "action":        opp["action"],
                # « long », « short » ou « aucun », et la raison — adossée à
                # l'horizon de l'utilisateur, pas au seul score.
                "sens":          opp["sens"],
                "sens_phrase":   opp["sens_phrase"],
                # Entrée, objectif, invalidation — ce que l'écran d'analyse
                # reprendra pour expliquer d'où vient la sélection.
                "plan":          opp["plan"],
                "price":         round(price, 4),
                "change":        round(chg_1d, 2),
                "change_1w":     round(chg_1w, 2),
                "change_1m":     round(chg_1m, 2),
                "score":         score,
                "signal":        signal,
                "rsi":           round(rsi, 1),
                "volume_ratio":  round(vol_ratio, 2),
                # French labels are what the table renders; the shared helper
                # speaks the analysis page's language.
                "trend":         {"BULLISH": "HAUSSIER", "BEARISH": "BAISSIER"}.get(trend_en, "NEUTRE"),
                "opportunity":   opportunity,
                "reason":        reason,
                "opp_type":      opp_type,
                "macd_signal":   "HAUSSIER" if macd_above else "BAISSIER",
                "support":       _px(recent_low),
                "resistance":    _px(recent_high),
                "near_breakout": near_breakout,
                "pct_from_high": round(pct_from_high, 1),
                "market_regime": (_ctx or {}).get("regime"),
                "relative_strength": (_ctx or {}).get("relative_strength"),
            }
        except Exception:
            return None

    # ── Run ALL assets in parallel (batches of 30) ──────────────────────
    # A semaphore rather than sequential batches of 30. Batching made every
    # asset wait for the slowest member of its batch, and 30 in flight filled
    # the whole shared I/O pool — the rest of the site stalled for the duration
    # of a scan. The cap stays below the pool size so interactive requests keep
    # threads available while a scan runs.
    # The analysis page overrides the last close with a live price. Without the
    # same override the scanner can place an asset on the wrong side of an EMA
    # and label it HAUSSIER while the analysis says NEUTRE. fetch_prices is
    # batched, so this is one request for the whole universe.
    live_px: dict = {}
    if not stream:
        try:
            live_px = await fetch_prices(assets) or {}
        except Exception:
            live_px = {}

    # Pre-warm the bar cache in bulk. Yahoo serves many tickers per request,
    # so the full universe goes from ~800 downloads to ~17. The per-symbol
    # path below is unchanged — it now simply finds everything in cache, and
    # any ticker the batch skipped is still fetched individually.
    prewarmed: dict = {}
    if not stream:
        try:
            prewarmed = await prewarm_ohlcv(assets, period=fetch_period, interval=fetch_interval)
        except Exception as exc:
            logger.warning("prewarm failed, falling back to per-symbol: %s", exc)

    # Benchmarks for the whole universe are a handful of indices: fetched once
    # and reused for every asset, so market context costs one extra request.
    bench_bars: dict = {}

    async def _load_benchmarks():
        """Les indices de référence : une poignée, partagés par tout l'univers."""
        try:
            _benches = sorted({b for s in assets if (b := benchmark_for(s))})
            if not _benches:
                return
            got = await prewarm_ohlcv(_benches, period=fetch_period, interval=fetch_interval)
            if fetch_resample:
                got = {k: resample_ohlcv(v, fetch_resample) for k, v in got.items()}
            bench_bars.update(got)
        except Exception as exc:
            logger.warning("benchmark prewarm failed: %s", exc)

    if not stream:
        await _load_benchmarks()

    # ── Le sens demandé ──────────────────────────────────────────────────
    #
    # Le score du moteur est orienté à la HAUSSE : 80 veut dire « bonne
    # configuration acheteuse », 20 veut dire l'inverse — pas « mauvais ».
    # Filtrer bêtement sur « score >= min_score » ne pouvait donc jamais
    # rendre une seule idée à la vente, et une demande de short serait
    # revenue vide en laissant croire qu'il n'y a rien à vendre.
    #
    # Un short est donc cherché de l'autre côté de l'échelle, avec la même
    # exigence : à exigence 70, on garde les scores <= 30.
    seuil_bas = 100 - min_score

    def _garde(r: dict) -> bool:
        if opportunity_type != "all" and r["opp_type"] != opportunity_type:
            return False
        if direction == "long":
            return r["score"] >= min_score
        if direction == "short":
            return r["score"] <= seuil_bas
        return r["score"] >= min_score or r["score"] <= seuil_bas

    def _rang(r: dict) -> float:
        """Le plus convaincant d'abord, quel que soit le sens : c'est
        l'ÉCART à la neutralité qui mesure la conviction."""
        return abs(r["score"] - 50)

    gate = asyncio.Semaphore(_SCAN_CONCURRENCY)

    async def _analyze_gated(symbol: str):
        async with gate:
            return await _analyze(symbol)

    # ── Diffusion au fil de l'eau ────────────────────────────────────────
    #
    # Un scan de 56 valeurs parisiennes prend 45 secondes ; l'univers entier
    # en compte 819. Attendre la fin pour tout afficher d'un coup, c'est une
    # minute de sablier devant lequel on ne sait pas si quelque chose
    # travaille.
    #
    # En mode flux, chaque actif part DÈS QU'IL EST SCORÉ. L'écran se remplit
    # en direct : le compteur monte, les places s'allument, les opportunités
    # se rangent au fur et à mesure. L'animation n'est pas une barre de
    # progression simulée sur une durée devinée — elle montre le travail réel.
    #
    # Les actifs écartés sont annoncés aussi (« seen »), sans leur charge
    # utile : c'est ce qui permet de montrer le balayage complet sans envoyer
    # 819 objets dont on n'affichera qu'une poignée.
    if stream:
        async def _events():
            # L'univers part en premier, avant la moindre requête réseau.
            # Mesuré : la préparation — cours en direct puis indices de
            # référence — occupait 56 secondes AVANT que le flux ne s'ouvre.
            # L'écran restait vide pendant ce temps, alors qu'il a déjà tout
            # ce qu'il faut pour dessiner l'univers et commencer à vivre.
            yield _json.dumps({
                "type": "start", "total": len(assets), "symbols": assets,
                "timeframe": timeframe, "min_score": min_score,
            }) + "\n"

            yield _json.dumps({"type": "phase", "phase": "prices",
                               "label": "Lecture des cours en direct"}) + "\n"
            try:
                live_px.update(await fetch_prices(assets) or {})
            except Exception:
                pass

            yield _json.dumps({"type": "phase", "phase": "benchmarks",
                               "label": "Chargement des indices de référence"}) + "\n"
            await _load_benchmarks()

            yield _json.dumps({"type": "phase", "phase": "scan",
                               "label": "Analyse des actifs"}) + "\n"

            kept: list = []
            analyzed_n = 0
            done_n = 0

            # PAR PAQUETS, et c'est tout l'intérêt.
            #
            # Le premier jet diffusait bien chaque actif dès qu'il était scoré
            # — et les 56 résultats arrivaient quand même tous à la même
            # seconde. L'horodatage l'a montré : 36,7 s pour le premier, 37,6 s
            # pour le dernier. Le goulot n'est pas le scoring mais le
            # téléchargement groupé, fait EN ENTIER avant la moindre analyse.
            # Diffuser au fil de l'eau par-dessus, c'était habiller une attente
            # immobile d'une animation qui ne montrait rien.
            #
            # On télécharge donc paquet par paquet, et chaque paquet est scoré
            # dès qu'il est là. Le premier résultat tombe après un paquet, pas
            # après l'univers entier.
            CHUNK = 40
            paquets = [assets[i:i + CHUNK] for i in range(0, len(assets), CHUNK)]
            for paquet in paquets:
                try:
                    got = await prewarm_ohlcv(paquet, period=fetch_period,
                                              interval=fetch_interval)
                    prewarmed.update(got)
                except Exception as exc:
                    logger.warning("prewarm paquet: %s", exc)

                tasks = [asyncio.create_task(_analyze_gated(sym)) for sym in paquet]
                try:
                    for fut in asyncio.as_completed(tasks):
                        r = await fut
                        done_n += 1
                        if r is None:
                            yield _json.dumps({"type": "skip", "done": done_n}) + "\n"
                            continue
                        analyzed_n += 1
                        keep = _garde(r)
                        if keep:
                            kept.append(r)
                            yield _json.dumps({"type": "result", "done": done_n,
                                               "item": _sanitize(r)}) + "\n"
                        else:
                            yield _json.dumps({
                                "type": "seen", "done": done_n,
                                "symbol": r["symbol"], "score": r["score"],
                                "place": r.get("place"),
                            }) + "\n"
                finally:
                    # Un client qui ferme l'onglet ne doit pas laisser des
                    # centaines de tâches tourner pour personne.
                    for t in tasks:
                        if not t.done():
                            t.cancel()

            await _record_scan(current_user["id"], market_key)
            q = await _check_scan_limit(current_user)
            kept.sort(key=_rang, reverse=True)
            yield _json.dumps({
                "type": "done",
                "total_scanned": len(assets),
                "total_analyzed": analyzed_n,
                "kept": len(kept),
                "results": [_sanitize(r) for r in kept[:limit]],
                "quota": {
                    "scans_today": q["scans_today"], "daily_limit": q["daily_limit"],
                    "remaining": q["remaining"], "is_premium": q["is_premium"],
                    "next_reset": q.get("next_reset"),
                },
            }) + "\n"

        return StreamingResponse(
            _events(),
            media_type="application/x-ndjson",
            # Sans cet en-tête, un proxy qui met en tampon réduit le flux à
            # une seule livraison finale — soit exactement ce qu'on évitait.
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    all_results = await asyncio.gather(*[_analyze_gated(s) for s in assets])

    analyzed = [r for r in all_results if r is not None]
    results = [r for r in analyzed if _garde(r)]
    results.sort(key=_rang, reverse=True)

    # Record the scan usage (non-blocking)
    await _record_scan(current_user["id"], market_key)
    # Refresh quota after recording
    new_quota = await _check_scan_limit(current_user)

    return {
        "market":         market_key,
        "timeframe":      timeframe,
        "min_score":      min_score,
        "total_scanned":  len(assets),
        # Requested vs actually priced. A gap means some tickers returned no
        # data — better surfaced than silently shrinking the universe.
        "total_analyzed": len(analyzed),
        "results":        results[:limit],
        "quota": {
            "scans_today": new_quota["scans_today"],
            "daily_limit": new_quota["daily_limit"],
            "remaining":   new_quota["remaining"],
            "is_premium":  new_quota["is_premium"],
            "next_reset":  new_quota.get("next_reset"),
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
        _atr_last = atr_wilder(hist["High"], hist["Low"], hist["Close"]).iloc[-1]
        atr14 = float(_atr_last) if not pd.isna(_atr_last) else 0.0
        if atr14 == 0:
            atr14 = float(close.std()) * 0.01

        # -- 3. Facteur RSI : dévie légèrement la trajectoire ----------------
        #    RSI > 60 → léger biais haussier, RSI < 40 → léger biais baissier
        _rsi_last = rsi_wilder(close).iloc[-1]
        current_rsi = float(_rsi_last) if not pd.isna(_rsi_last) else 50.0
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


@router.get("/{symbol}/backtest")
@limiter.limit("3/minute")
async def backtest_symbol(
    request: Request,
    symbol: str,
    timeframe: str = Query(default="1d", pattern="^(1h|4h|1d|1w)$"),
    horizon: int = Query(default=10, ge=1, le=60),
    # The stop and target the backtest walks against. The client sends the
    # multiples of the user's trading profile, so the backtest validates the
    # plan actually shown on screen rather than a generic 2/3 ATR.
    sl_atr: float = Query(default=2.0, ge=0.2, le=10.0),
    tp_atr: float = Query(default=3.0, ge=0.2, le=20.0),
    cost_bps: float = Query(default=10.0, ge=0.0, le=200.0),
    mode: str = Query(default="event", pattern="^(event|overlapping)$"),
    current_user: dict = Depends(get_current_user),
):
    """Walk-forward, triple-barrier backtest of the production engine.

    Replays compute_score() bar by bar with no lookahead, then walks each
    signal forward against the same ATR stop/target the risk plan shows,
    and reports the outcome in R (multiples of risk), gross and net of costs.
    """
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()

    period_map = {"1h": ("6mo", "1h"), "4h": ("1y", "1h"), "1d": ("2y", "1d"), "1w": ("5y", "1wk")}
    fetch_period, fetch_interval = period_map[timeframe]

    hist = await fetch_ohlcv(symbol, period=fetch_period, interval=fetch_interval)
    if hist is None or hist.empty or len(hist) < 90:
        raise HTTPException(status_code=400, detail="Historique insuffisant pour un backtest (minimum 90 bougies)")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: run_backtest(hist, horizon=horizon, sl_atr=sl_atr, tp_atr=tp_atr,
                             cost_bps=cost_bps, mode=mode),
    )

    return _sanitize({
        "symbol": symbol,
        "timeframe": timeframe,
        "period": fetch_period,
        "bars_analyzed": len(hist),
        **result,
        "disclaimer": "Performances passées — aucune garantie sur les résultats futurs. Outil éducatif.",
    })
