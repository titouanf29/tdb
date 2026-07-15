"""
Technical indicators — Wilder-correct implementations.

These match the reference formulas used by TradingView / brokers so the
values shown to users are comparable with what they see elsewhere:

- RSI:  Wilder's smoothed averages (alpha = 1/period), not a simple SMA.
- ATR:  Wilder smoothing of True Range.
- ADX:  Wilder smoothing of +DM / -DM / TR, then Wilder-smoothed DX.

All functions are pure (Series in → Series/float out) and NaN-safe.
"""
import numpy as np
import pandas as pd


def rsi_wilder(close: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index with Wilder's smoothing (the standard RSI)."""
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    # Wilder's smoothing == EMA with alpha = 1/period, seeded implicitly
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    # When avg_loss is 0 (straight rally) RSI is 100 by definition
    rsi = rsi.where(avg_loss != 0, 100.0)
    return rsi


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    prev_close = close.shift(1)
    return pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)


def atr_wilder(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Average True Range with Wilder's smoothing (the standard ATR)."""
    tr = true_range(high, low, close)
    return tr.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()


def adx_wilder(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> tuple[float, float, float]:
    """ADX with Wilder smoothing. Returns (adx, +DI, -DI) as floats.

    Falls back to (0, 0, 0) when there is not enough data — callers treat
    0 as "no measurable trend".
    """
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = pd.Series(
        np.where((up_move > down_move) & (up_move > 0), up_move, 0.0), index=high.index
    )
    minus_dm = pd.Series(
        np.where((down_move > up_move) & (down_move > 0), down_move, 0.0), index=low.index
    )
    tr = true_range(high, low, close)

    alpha = 1 / period
    atr = tr.ewm(alpha=alpha, adjust=False, min_periods=period).mean()
    plus_di = 100 * plus_dm.ewm(alpha=alpha, adjust=False, min_periods=period).mean() / atr.replace(0, np.nan)
    minus_di = 100 * minus_dm.ewm(alpha=alpha, adjust=False, min_periods=period).mean() / atr.replace(0, np.nan)

    di_sum = (plus_di + minus_di).replace(0, np.nan)
    dx = 100 * (plus_di - minus_di).abs() / di_sum
    adx = dx.ewm(alpha=alpha, adjust=False, min_periods=period).mean()

    def _last(s: pd.Series) -> float:
        v = s.iloc[-1] if len(s) else np.nan
        return float(v) if not pd.isna(v) else 0.0

    return _last(adx), _last(plus_di), _last(minus_di)


def data_confidence(
    n_bars: int,
    has_ema200: bool,
    adx_valid: bool,
    has_volume: bool,
) -> int:
    """0-100 confidence in the analysis, driven by data quantity/coverage.

    A 20-bar IPO and a 500-bar blue chip should not present their scores
    with the same authority.
    """
    # Sample size: 20 bars = minimum viable, 200+ = full marks (60 pts)
    size_pts = min(1.0, max(0.0, (n_bars - 20) / 180)) * 60
    coverage_pts = (20 if has_ema200 else 0) + (12 if adx_valid else 0) + (8 if has_volume else 0)
    return int(round(min(100, size_pts + coverage_pts)))
