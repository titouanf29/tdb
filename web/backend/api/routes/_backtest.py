"""
Walk-forward backtest of the scoring engine.

Replays compute_score() bar by bar on truncated history (no lookahead:
at each evaluation the engine only sees data up to that bar) and measures
the forward return `horizon` bars later. This turns "the score says 75"
into "here is what followed a 75 on this asset, historically".
"""
import numpy as np
import pandas as pd

from ._scoring import compute_score

BUCKETS = [
    (0, 25, "STRONG SELL (0-24)"),
    (25, 40, "SELL (25-39)"),
    (40, 60, "HOLD (40-59)"),
    (60, 75, "BUY (60-74)"),
    (75, 101, "STRONG BUY (75-100)"),
]


def _rank_correlation(x: list[float], y: list[float]) -> float | None:
    """Spearman rank correlation without scipy."""
    if len(x) < 10:
        return None
    rx = np.argsort(np.argsort(x)).astype(float)
    ry = np.argsort(np.argsort(y)).astype(float)
    sx, sy = rx.std(), ry.std()
    if sx == 0 or sy == 0:
        return None
    return float(np.corrcoef(rx, ry)[0, 1])


def run_backtest(
    hist: pd.DataFrame,
    horizon: int = 10,
    min_lookback: int = 60,
    max_evals: int = 250,
) -> dict:
    """Walk the history forward, score each point, measure what followed."""
    n = len(hist)
    closes = hist["Close"]
    last_eval = n - horizon  # window end t means last bar t-1; needs t-1+horizon <= n-1
    eval_points = list(range(min_lookback, last_eval + 1))
    if not eval_points:
        return {"n_samples": 0, "buckets": [], "correlation": None,
                "avg_return_buy_zone": None, "avg_return_sell_zone": None, "edge": None}
    step = max(1, len(eval_points) // max_evals)
    eval_points = eval_points[::step]

    scores: list[float] = []
    fwd_returns: list[float] = []
    for t in eval_points:
        window = hist.iloc[:t]
        px = float(window["Close"].dropna().iloc[-1])
        fwd_px = float(closes.iloc[t - 1 + horizon])
        if px <= 0 or np.isnan(fwd_px):
            continue
        try:
            s = compute_score(
                window["High"], window["Low"], window["Close"], window["Volume"],
                current_price=px,
            )
        except Exception:
            continue
        scores.append(float(s["final_score"]))
        fwd_returns.append((fwd_px / px - 1) * 100)

    if not scores:
        return {"n_samples": 0, "buckets": [], "correlation": None,
                "avg_return_buy_zone": None, "avg_return_sell_zone": None, "edge": None}

    arr_s = np.array(scores)
    arr_r = np.array(fwd_returns)

    buckets = []
    for lo, hi, label in BUCKETS:
        mask = (arr_s >= lo) & (arr_s < hi)
        rets = arr_r[mask]
        buckets.append({
            "label": label,
            "range": [lo, min(hi, 100)],
            "count": int(mask.sum()),
            "win_rate": round(float((rets > 0).mean() * 100), 1) if len(rets) else None,
            "avg_return": round(float(rets.mean()), 2) if len(rets) else None,
            "median_return": round(float(np.median(rets)), 2) if len(rets) else None,
        })

    buy_rets = arr_r[arr_s >= 60]
    sell_rets = arr_r[arr_s < 40]
    avg_buy = round(float(buy_rets.mean()), 2) if len(buy_rets) else None
    avg_sell = round(float(sell_rets.mean()), 2) if len(sell_rets) else None
    edge = round(avg_buy - avg_sell, 2) if (avg_buy is not None and avg_sell is not None) else None

    return {
        "n_samples": len(scores),
        "horizon_bars": horizon,
        "buckets": buckets,
        # Rank correlation score → forward return: >0 means higher scores
        # were followed by better returns on this asset's history
        "correlation": round(_rank_correlation(scores, fwd_returns) or 0.0, 3) if len(scores) >= 10 else None,
        "avg_return_buy_zone": avg_buy,     # mean forward return when score ≥ 60
        "avg_return_sell_zone": avg_sell,   # mean forward return when score < 40
        "edge": edge,                        # buy-zone minus sell-zone
        "hit_rate_buy": round(float((buy_rets > 0).mean() * 100), 1) if len(buy_rets) else None,
        "hit_rate_sell": round(float((sell_rets < 0).mean() * 100), 1) if len(sell_rets) else None,
    }
