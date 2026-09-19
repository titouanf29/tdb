"""
Market context — the information the engine could not see.

An asset does not move in a vacuum. Until now every score was computed from
one asset's own candles, which leaves two questions unanswerable:

  * Is the market this asset belongs to rising or falling? A clean bullish
    setup inside a collapsing index is a different proposition from the same
    setup in a healthy one.
  * Is the asset leading or lagging that market? +2% while the index does
    +5% is weakness dressed as a green candle — and no amount of RSI, MACD or
    volume computed on the asset alone can reveal it.

Both are cheap: one extra batched download covers every benchmark, shared by
the whole scan. The analysis and the scanner call the same functions here, so
their verdicts cannot drift apart.
"""
import numpy as np
import pandas as pd

# One benchmark per asset class. Deliberately a broad index rather than a
# sector ETF: with ~800 assets across ~11 sectors, a sector sample is too thin
# to rank against, and a wrong benchmark is worse than none.
BENCHMARKS: dict[str, str] = {
    "us":        "^GSPC",       # S&P 500
    "europe":    "^STOXX50E",   # Euro Stoxx 50
    "asia":      "^N225",       # Nikkei 225
    "crypto":    "BTC-USD",     # Bitcoin leads the complex
    "commodity": "^GSPC",       # no clean commodity composite on Yahoo
}

_EUROPE_SUFFIXES = (".PA", ".AS", ".BR", ".LS", ".DE", ".MC", ".MI", ".SW",
                    ".L", ".VI", ".ST", ".CO", ".OL", ".HE", ".IR", ".WA", ".LS")
_ASIA_SUFFIXES = (".T", ".HK", ".KS", ".KQ", ".SS", ".SZ", ".TW", ".NS", ".BO", ".SI", ".JK")
# Indices that ARE a benchmark, or proxy one closely enough to classify.
_INDEX_CLASS = {
    "^GSPC": "us", "^DJI": "us", "^IXIC": "us", "^RUT": "us", "^NDX": "us", "^VIX": "us",
    "^FCHI": "europe", "^GDAXI": "europe", "^STOXX50E": "europe", "^FTSE": "europe",
    "^SBF120": "europe", "^AEX": "europe", "^IBEX": "europe",
    "^N225": "asia", "^HSI": "asia", "^KOSPI": "asia", "^AXJO": "asia",
}


def classify_asset(symbol: str) -> str | None:
    """Which market this symbol belongs to, or None when it has no benchmark."""
    u = (symbol or "").upper()
    if not u:
        return None
    if u in _INDEX_CLASS:
        return _INDEX_CLASS[u]
    if u.startswith("^"):
        return None                      # unknown index: no honest benchmark
    if u.endswith("=X"):
        return None                      # forex: the pair IS the relative move
    if u.endswith("-USD") or u.endswith("-BTC"):
        return "crypto"
    if u.endswith("=F"):
        return "commodity"
    if u.endswith(_EUROPE_SUFFIXES):
        return "europe"
    if u.endswith(_ASIA_SUFFIXES):
        return "asia"
    if "." not in u:
        return "us"                      # bare ticker: US listing
    return None


def benchmark_for(symbol: str) -> str | None:
    """Benchmark symbol for this asset, or None when it is its own benchmark."""
    cls = classify_asset(symbol)
    if cls is None:
        return None
    bench = BENCHMARKS.get(cls)
    # Comparing Bitcoin to Bitcoin, or the S&P to itself, says nothing.
    return None if not bench or bench == (symbol or "").upper() else bench


def _regime(close: pd.Series) -> str:
    """BULL / BEAR / NEUTRAL from the benchmark's own EMA structure."""
    c = close.dropna()
    if len(c) < 60:
        return "UNKNOWN"
    px = float(c.iloc[-1])
    e20 = float(c.ewm(span=20, adjust=False).mean().iloc[-1])
    e50 = float(c.ewm(span=50, adjust=False).mean().iloc[-1])
    if px > e20 > e50:
        return "BULL"
    if px < e20 < e50:
        return "BEAR"
    return "NEUTRAL"


def _pct_change(close: pd.Series, periods: int) -> float | None:
    c = close.dropna()
    if len(c) <= periods:
        return None
    prev = float(c.iloc[-1 - periods])
    if prev == 0:
        return None
    return (float(c.iloc[-1]) / prev - 1) * 100


def compute_market_context(asset_close: pd.Series, bench_close: pd.Series,
                           bench_symbol: str) -> dict | None:
    """Regime of the benchmark plus the asset's strength relative to it.

    Returns None when there is not enough overlapping history — a relative
    strength computed on a handful of shared bars is noise with a sign.
    """
    if asset_close is None or bench_close is None:
        return None
    a = asset_close.dropna()
    b = bench_close.dropna()
    if len(a) < 40 or len(b) < 40:
        return None

    # Align on shared timestamps: a US asset and a European index do not
    # trade the same days, and subtracting misaligned returns invents moves.
    joined = pd.concat([a.rename("a"), b.rename("b")], axis=1, join="inner").dropna()
    if len(joined) < 40:
        return None

    regime = _regime(joined["b"])
    out: dict = {
        "benchmark": bench_symbol,
        "regime": regime,
        "bench_change_20": None,
        "asset_change_20": None,
        "relative_strength": None,
        "correlation": None,
        "outperforming": None,
    }

    a_ch = _pct_change(joined["a"], 20)
    b_ch = _pct_change(joined["b"], 20)
    if a_ch is not None and b_ch is not None:
        out["asset_change_20"] = round(a_ch, 2)
        out["bench_change_20"] = round(b_ch, 2)
        out["relative_strength"] = round(a_ch - b_ch, 2)
        out["outperforming"] = a_ch > b_ch

    try:
        ra = joined["a"].pct_change().dropna()
        rb = joined["b"].pct_change().dropna()
        n = min(len(ra), len(rb), 120)
        if n >= 30:
            c = float(np.corrcoef(ra.tail(n), rb.tail(n))[0, 1])
            if not np.isnan(c):
                out["correlation"] = round(c, 2)
    except Exception:
        pass

    return out


def apply_context_gate(final_score: float, ctx: dict | None) -> tuple[float, str | None, str | None]:
    """Nudge the score for market context. Returns (score, bull_note, bear_note).

    Bounded to ±6 — smaller than the higher-timeframe gate (±8), because the
    benchmark is one more step removed from the asset. Context tilts a verdict;
    it never makes one.
    """
    if not ctx:
        return final_score, None, None

    regime = ctx.get("regime")
    rs = ctx.get("relative_strength")
    bench = ctx.get("benchmark", "le marché")
    adj = 0.0
    bull_note = bear_note = None

    # Regime: a long setup inside a falling market, or the mirror case.
    if regime == "BEAR" and final_score >= 55:
        adj -= 4
        bear_note = f"Marché de référence baissier ({bench})"
    elif regime == "BULL" and final_score <= 45:
        adj += 4
        bull_note = f"Marché de référence haussier ({bench})"
    elif regime == "BULL" and final_score >= 55:
        bull_note = f"Porté par un marché haussier ({bench})"
    elif regime == "BEAR" and final_score <= 45:
        bear_note = f"Marché de référence baissier ({bench})"

    # Relative strength: leading or lagging its own market over 20 periods.
    if rs is not None:
        if rs >= 5:
            adj += 2
            bull_note = bull_note or f"Surperforme {bench} de {rs:+.1f} pts sur 20 périodes"
        elif rs <= -5:
            adj -= 2
            bear_note = bear_note or f"Sous-performe {bench} de {rs:.1f} pts sur 20 périodes"

    adj = max(-6.0, min(6.0, adj))
    return max(0.0, min(100.0, final_score + adj)), bull_note, bear_note
