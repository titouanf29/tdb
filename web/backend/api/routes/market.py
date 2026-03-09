"""
Market data routes
"""
import sys
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

# Import config from bot
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
from config import MARKETS

router = APIRouter()


@router.get("/list")
async def get_markets():
    """Get all available markets"""
    return {
        "markets": [
            {
                "key": key,
                "name": market["name"],
                "description": market["description"],
                "asset_count": len(market["assets"]),
                "always_open": market.get("always_open", False)
            }
            for key, market in MARKETS.items()
        ]
    }


@router.get("/{market_key}")
async def get_market_info(market_key: str):
    """Get detailed info for a specific market"""
    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    market = MARKETS[market_key]
    return {
        "key": market_key,
        **market
    }


@router.get("/{market_key}/assets")
async def get_market_assets(
    market_key: str,
    limit: int = Query(default=20, le=100)
):
    """Get assets for a market with live prices"""
    market_key = market_key.upper()
    if market_key not in MARKETS:
        raise HTTPException(status_code=404, detail="Market not found")

    assets = MARKETS[market_key]["assets"][:limit]

    # Import yfinance to get live data
    import yfinance as yf

    result = []
    for symbol in assets:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            hist = ticker.history(period="2d")

            if len(hist) >= 2:
                current_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2]
                change = ((current_price - prev_price) / prev_price) * 100
            else:
                current_price = getattr(info, 'last_price', 0) or 0
                change = 0

            result.append({
                "symbol": symbol,
                "price": round(current_price, 2),
                "change": round(change, 2),
                "volume": int(hist['Volume'].iloc[-1]) if len(hist) > 0 else 0
            })
        except Exception:
            result.append({
                "symbol": symbol,
                "price": 0,
                "change": 0,
                "volume": 0,
                "error": True
            })

    return {"assets": result}


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """Get real-time quote for a symbol"""
    import yfinance as yf

    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="5d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")

        current = hist['Close'].iloc[-1]
        prev = hist['Close'].iloc[-2] if len(hist) > 1 else current
        change = ((current - prev) / prev) * 100

        return {
            "symbol": symbol,
            "name": info.get("shortName", symbol),
            "price": round(current, 2),
            "change": round(change, 2),
            "change_amount": round(current - prev, 2),
            "high": round(hist['High'].iloc[-1], 2),
            "low": round(hist['Low'].iloc[-1], 2),
            "open": round(hist['Open'].iloc[-1], 2),
            "volume": int(hist['Volume'].iloc[-1]),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart/{symbol}")
async def get_chart_data(
    symbol: str,
    period: str = Query(default="1mo", regex="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|max)$"),
    interval: str = Query(default="1d", regex="^(1m|5m|15m|1h|1d|1wk|1mo)$")
):
    """Get OHLCV chart data for a symbol"""
    import yfinance as yf

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail="No data found")

        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": [
                {
                    "timestamp": int(idx.timestamp() * 1000),
                    "open": round(row["Open"], 4),
                    "high": round(row["High"], 4),
                    "low": round(row["Low"], 4),
                    "close": round(row["Close"], 4),
                    "volume": int(row["Volume"])
                }
                for idx, row in hist.iterrows()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
