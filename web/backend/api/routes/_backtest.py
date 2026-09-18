"""
Walk-forward validation of the scoring engine — triple-barrier labelling.

What changed from v1, and why:

* **Triple barrier instead of a fixed-horizon return.** v1 measured "price
  N bars later", which nobody trades: a trade ends when the stop or the
  target is hit, whichever comes first. Each signal now walks forward
  against the SAME ATR-based stop and target the risk plan shows the user,
  and ends on stop, target, or timeout.

* **Non-overlapping evaluation.** v1 scored (almost) every bar with a
  10-bar forward return, so consecutive observations shared 9 of their 10
  bars — a 90% overlap. It reported "431 samples" when the number of
  independent observations was closer to 50, which inflated both the rank
  correlation and the apparent significance of every hit rate. In `event`
  mode a signal is only taken once the previous trade has closed, so the
  samples are genuinely independent.

* **Costs.** A backtest without spread and fees flatters every strategy.
  Gross and net are both reported so the gap is visible.

Results are expressed in **R** — multiples of the risk taken — which makes
them comparable across assets and timeframes.
"""
import numpy as np
import pandas as pd

from ._scoring import compute_score, ENGINE_VERSION

BUCKETS = [
    (0, 25, "STRONG SELL (0-24)"),
    (25, 40, "SELL (25-39)"),
    (40, 60, "HOLD (40-59)"),
    (60, 75, "BUY (60-74)"),
    (75, 101, "STRONG BUY (75-100)"),
]

# Below this many closed trades the statistics are illustrative, not evidence.
MIN_TRADES_FOR_CONFIDENCE = 30


def _rank_correlation(x: list[float], y: list[float]) -> float | None:
    """Spearman rank correlation without scipy."""
    if len(x) < 10:
        return None
    rx = np.argsort(np.argsort(x)).astype(float)
    ry = np.argsort(np.argsort(y)).astype(float)
    if rx.std() == 0 or ry.std() == 0:
        return None
    return float(np.corrcoef(rx, ry)[0, 1])


def _walk_barriers(
    highs: np.ndarray, lows: np.ndarray, closes: np.ndarray,
    start: int, horizon: int, entry: float, stop: float, target: float, is_long: bool,
) -> tuple[str, float, int]:
    """Walk forward bar by bar until a barrier is touched.

    Returns (outcome, exit_price, bars_held) with outcome in
    {"target", "stop", "timeout"}.

    When a single bar spans both barriers the order inside it is unknowable
    from OHLC alone, so the STOP is assumed to have come first. That is the
    pessimistic reading, and the only honest one: assuming the target would
    manufacture wins that the data cannot support.
    """
    last = min(start + horizon, len(closes))
    for i in range(start, last):
        hit_stop = lows[i] <= stop if is_long else highs[i] >= stop
        hit_tgt = highs[i] >= target if is_long else lows[i] <= target
        if hit_stop:
            return "stop", stop, i - start + 1
        if hit_tgt:
            return "target", target, i - start + 1
    exit_idx = max(start, last - 1)
    return "timeout", float(closes[exit_idx]), last - start


def run_backtest(
    hist: pd.DataFrame,
    horizon: int = 10,
    min_lookback: int = 60,
    max_evals: int = 250,
    sl_atr: float = 2.0,
    tp_atr: float = 3.0,
    cost_bps: float = 10.0,
    mode: str = "event",
) -> dict:
    """Replay the engine bar by bar, with no lookahead, and label by barriers.

    mode="event"       one trade at a time — independent samples (default)
    mode="overlapping" score every eligible bar — more samples, but they
                       share most of their bars; useful to study behaviour,
                       never to claim significance.
    """
    n = len(hist)
    highs = hist["High"].to_numpy(dtype=float)
    lows = hist["Low"].to_numpy(dtype=float)
    closes = hist["Close"].to_numpy(dtype=float)

    empty = {
        "n_evaluated": 0, "n_trades": 0, "buckets": [], "correlation": None,
        "engine_version": ENGINE_VERSION, "mode": mode,
        "enough_samples": False,
    }

    last_eval = n - horizon
    if last_eval <= min_lookback:
        return empty

    # A real cap: v1 computed step = len // max_evals, which collapsed to 1
    # whenever there were fewer than 2x max_evals points, so the cap never bound.
    candidates = list(range(min_lookback, last_eval + 1))
    step = max(1, int(np.ceil(len(candidates) / max_evals)))
    candidates = candidates[::step]

    trades: list[dict] = []
    scores_all: list[float] = []
    returns_all: list[float] = []
    next_eligible = 0
    n_evaluated = 0

    for t in candidates:
        if mode == "event" and t < next_eligible:
            continue
        window = hist.iloc[:t]
        entry = float(window["Close"].dropna().iloc[-1])
        if entry <= 0 or np.isnan(entry):
            continue
        try:
            S = compute_score(
                window["High"], window["Low"], window["Close"], window["Volume"],
                current_price=entry,
            )
        except Exception:
            continue
        n_evaluated += 1
        score = float(S["final_score"])
        atr = float(S["atr"]) if S["atr"] and not pd.isna(S["atr"]) else 0.0
        if atr <= 0:
            continue

        scores_all.append(score)
        fwd_idx = min(t - 1 + horizon, n - 1)
        returns_all.append((closes[fwd_idx] / entry - 1) * 100)

        # Direction uses the same thresholds the product shows the user.
        if score >= 60:
            is_long = True
        elif score < 40:
            is_long = False
        else:
            continue  # HOLD is not a trade — counting it as one would be dishonest

        risk = sl_atr * atr
        reward = tp_atr * atr
        stop = entry - risk if is_long else entry + risk
        target = entry + reward if is_long else entry - reward

        outcome, exit_px, bars = _walk_barriers(
            highs, lows, closes, t, horizon, entry, stop, target, is_long
        )
        pnl = (exit_px - entry) if is_long else (entry - exit_px)
        gross_r = pnl / risk
        # Round trip: paid on the way in and on the way out.
        cost_r = (2 * (cost_bps / 10_000.0) * entry) / risk
        trades.append({
            "score": score, "outcome": outcome, "bars": bars,
            "gross_r": gross_r, "net_r": gross_r - cost_r,
            "direction": "long" if is_long else "short",
        })
        if mode == "event":
            next_eligible = t + bars

    if not trades:
        empty["n_evaluated"] = n_evaluated
        return empty

    net = np.array([tr["net_r"] for tr in trades])
    gross = np.array([tr["gross_r"] for tr in trades])
    outcomes = [tr["outcome"] for tr in trades]
    n_trades = len(trades)

    wins, losses = net[net > 0], net[net <= 0]
    gross_profit = float(wins.sum()) if len(wins) else 0.0
    gross_loss = float(-losses.sum()) if len(losses) else 0.0

    equity = np.cumsum(net)
    drawdown = float((np.maximum.accumulate(equity) - equity).max()) if len(equity) else 0.0

    buckets = []
    for lo, hi, label in BUCKETS:
        sel = [tr for tr in trades if lo <= tr["score"] < hi]
        rets = np.array([tr["net_r"] for tr in sel])
        buckets.append({
            "label": label, "range": [lo, min(hi, 100)], "count": len(sel),
            "win_rate": round(float((rets > 0).mean() * 100), 1) if len(sel) else None,
            "avg_r": round(float(rets.mean()), 3) if len(sel) else None,
        })

    def _pct(name: str) -> float:
        return round(outcomes.count(name) / n_trades * 100, 1)

    return {
        "engine_version": ENGINE_VERSION,
        "mode": mode,
        "horizon_bars": horizon,
        "sl_atr": sl_atr,
        "tp_atr": tp_atr,
        "cost_bps": cost_bps,

        "n_evaluated": n_evaluated,
        "n_trades": n_trades,
        # Stated plainly so the numbers below can be weighed, not just read.
        "enough_samples": n_trades >= MIN_TRADES_FOR_CONFIDENCE,
        "min_trades_for_confidence": MIN_TRADES_FOR_CONFIDENCE,

        "p_target": _pct("target"),
        "p_stop": _pct("stop"),
        "p_timeout": _pct("timeout"),

        "win_rate": round(float((net > 0).mean() * 100), 1),
        "avg_win_r": round(float(wins.mean()), 3) if len(wins) else None,
        "avg_loss_r": round(float(losses.mean()), 3) if len(losses) else None,
        # Expectancy per trade, in units of the risk taken. This — not the win
        # rate — is what says whether the engine has an edge: 42% winners can
        # beat 80% winners.
        "expectancy_gross_r": round(float(gross.mean()), 3),
        "expectancy_net_r": round(float(net.mean()), 3),
        "cost_drag_r": round(float(gross.mean() - net.mean()), 3),
        "profit_factor": round(gross_profit / gross_loss, 2) if gross_loss > 0 else None,
        "max_drawdown_r": round(drawdown, 2),
        "avg_bars_held": round(float(np.mean([tr["bars"] for tr in trades])), 1),

        "buckets": buckets,
        "correlation": round(_rank_correlation(scores_all, returns_all) or 0.0, 3)
                       if len(scores_all) >= 10 else None,
    }
