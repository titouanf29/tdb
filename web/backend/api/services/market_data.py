"""
Market data service — uses yfinance (free, no API key).
Fetches prices, computes RSI, identifies Top/Flop per region.

Fix: "day" period now computes true 24h change (not 3-day artefact).
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Asset universe
# ---------------------------------------------------------------------------
REGION_ASSETS: Dict[str, Dict] = {
    "europe": {
        "label": "Europe",
        "flag": "🇪🇺",
        "indices": {
            "CAC 40":        "^FCHI",
            "DAX":           "^GDAXI",
            "FTSE 100":      "^FTSE",
            "EUROSTOXX 50":  "^STOXX50E",
        },
        "stocks": {
            "LVMH":          "MC.PA",
            "ASML":          "ASML.AS",
            "TotalEnergies": "TTE.PA",
            "SAP":           "SAP.DE",
            "Airbus":        "AIR.PA",
            "Stellantis":    "STLAM.MI",
            "BNP Paribas":   "BNP.PA",
        },
    },
    "usa": {
        "label": "USA",
        "flag": "🇺🇸",
        "indices": {
            "S&P 500": "^GSPC",
            "NASDAQ":  "^IXIC",
            "DOW":     "^DJI",
            "VIX":     "^VIX",          # volatility — high VIX = fear
        },
        "sectors": {
            "Tech (XLK)":       "XLK",
            "Energy (XLE)":     "XLE",
            "Finance (XLF)":    "XLF",
            "Health (XLV)":     "XLV",
            "Consumer (XLY)":   "XLY",
            "Industrie (XLI)":  "XLI",
            "Defense (XAR)":    "XAR",  # aerospace & defense — geo proxy
        },
        "stocks": {
            "Nvidia":    "NVDA",
            "Apple":     "AAPL",
            "Tesla":     "TSLA",
            "ExxonMobil":"XOM",
            "Microsoft": "MSFT",
            "Amazon":    "AMZN",
        },
    },
    "crypto": {
        "label": "Crypto",
        "flag": "₿",
        "assets": {
            "Bitcoin":  "BTC-USD",
            "Ethereum": "ETH-USD",
            "Solana":   "SOL-USD",
            "BNB":      "BNB-USD",
            "XRP":      "XRP-USD",
        },
    },
    "commodities": {
        "label": "Matières premières",
        "flag": "🛢️",
        "assets": {
            "Or":           "GC=F",    # gold — risk-off signal
            "Pétrole WTI":  "CL=F",   # oil — geopolitical proxy
            "Argent":       "SI=F",
            "Gaz naturel":  "NG=F",
            "Cuivre":       "HG=F",
            "Dollar Index": "DX-Y.NYB",  # USD strength — flight-to-safety
        },
    },
}

_executor = ThreadPoolExecutor(max_workers=12)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _period_params(period: str):
    """Returns (start, end, interval) for week/month. Day is handled separately."""
    now = datetime.now()
    if period == "month":
        return now - timedelta(days=35), now, "1d"
    else:  # week (default)
        return now - timedelta(days=9), now, "1d"


def _compute_rsi(prices: pd.Series, window: int = 14) -> float:
    if len(prices) < window + 1:
        return 50.0
    delta = prices.diff().dropna()
    gain  = delta.clip(lower=0).rolling(window).mean()
    loss  = (-delta.clip(upper=0)).rolling(window).mean()
    rs    = gain / loss.replace(0, np.nan)
    rsi   = 100 - (100 / (1 + rs))
    val   = rsi.iloc[-1]
    return round(float(val), 1) if not np.isnan(val) else 50.0


def _fetch_ticker(ticker: str, name: str, period: str) -> Optional[Dict]:
    try:
        t = yf.Ticker(ticker)

        if period == "day":
            # Get 5 days of 1h history so we have enough candles for RSI (14+)
            # but compute change_pct from the last 24h only (true intraday change)
            hist = t.history(period="5d", interval="1h")
            if hist.empty or len(hist) < 2:
                return None

            # True 24h window: from 24h before the last available candle
            last_ts = hist.index[-1]
            cutoff  = last_ts - pd.Timedelta(hours=24)
            hist_24h = hist[hist.index >= cutoff]

            if len(hist_24h) >= 2:
                first = float(hist_24h["Close"].iloc[0])
            else:
                # Fallback: use second-to-last candle
                first = float(hist["Close"].iloc[-2])

        else:
            start, end, interval = _period_params(period)
            hist = t.history(start=start, end=end, interval=interval)
            if hist.empty or len(hist) < 2:
                return None
            first = float(hist["Close"].iloc[0])

        last       = float(hist["Close"].iloc[-1])
        change_pct = round(((last - first) / first) * 100, 2) if first else 0.0
        rsi        = _compute_rsi(hist["Close"])

        # OHLCV for charts (last 10 candles)
        ohlcv = []
        for ts, row in hist.tail(10).iterrows():
            ohlcv.append({
                "date":   ts.strftime("%Y-%m-%d %H:%M"),
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),    4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row["Volume"]) if row["Volume"] else 0,
            })

        return {
            "name":       name,
            "ticker":     ticker,
            "last_price": round(last, 4),
            "change_pct": change_pct,
            "rsi":        rsi,
            "ohlcv":      ohlcv,
        }

    except Exception as e:
        logger.warning("yfinance error for %s (%s): %s", ticker, name, e)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_market_snapshot(period: str = "week") -> Dict[str, Any]:
    """
    Returns a snapshot of all regions with top/flop assets for the given period.
    """
    loop    = asyncio.get_event_loop()
    snapshot: Dict[str, Any] = {}

    for region_key, config in REGION_ASSETS.items():
        pairs: Dict[str, str] = {}
        for sub in ("indices", "stocks", "assets", "sectors"):
            pairs.update(config.get(sub, {}))

        futures = [
            loop.run_in_executor(_executor, _fetch_ticker, ticker, name, period)
            for name, ticker in pairs.items()
        ]
        results = await asyncio.gather(*futures)
        assets  = [r for r in results if r is not None]
        assets.sort(key=lambda x: x["change_pct"], reverse=True)

        snapshot[region_key] = {
            "label":  config["label"],
            "flag":   config["flag"],
            "assets": assets,
            "top":    assets[0]  if assets else None,
            "flop":   assets[-1] if assets else None,
        }

    return snapshot


async def get_fear_and_greed() -> Dict[str, Any]:
    """
    Fetches crypto Fear & Greed index from Alternative.me.
    Returns value 0-100 with label.
    """
    import httpx
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r    = await client.get("https://api.alternative.me/fng/?limit=1")
            data = r.json()
            return {
                "value": int(data["data"][0]["value"]),
                "label": data["data"][0]["value_classification"],
            }
    except Exception as e:
        logger.warning("Fear & Greed fetch failed: %s", e)
        return {"value": 50, "label": "Neutral"}


def compute_heat_score(snapshot: Dict, fear_greed: Dict) -> float:
    """
    Computes an overall market stress score (0-10).
    10 = extreme stress/volatility, 0 = calm/bullish.

    Weighted: Fear & Greed 40% + cross-asset volatility 40% + avg direction 20%.
    """
    all_changes: List[float] = []
    for region_data in snapshot.values():
        for asset in region_data.get("assets", []):
            all_changes.append(asset["change_pct"])

    if not all_changes:
        return 5.0

    fg          = fear_greed.get("value", 50)
    fg_score    = (100 - fg) / 10                     # 0-10 (low fg = high stress)
    volatility  = float(np.std(all_changes))
    vol_score   = min(volatility / 3, 10)
    avg_change  = sum(all_changes) / len(all_changes)
    dir_score   = max(0, -avg_change / 2)

    heat = round(fg_score * 0.4 + vol_score * 0.4 + dir_score * 0.2, 1)
    return min(max(heat, 0.5), 9.9)
