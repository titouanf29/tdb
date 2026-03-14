"""
Market data routes
"""
import re
import sys
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import MARKETS

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
_SYMBOL_RE = re.compile(r'^[\^A-Z0-9.\-=]{1,30}$')


class AssetRequestCreate(BaseModel):
    symbol: str
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None  # stock, crypto, commodity, forex
    reason: Optional[str] = None


@router.get("/list")
async def get_markets():
    """Get all available markets"""
    return {
        "markets": [
            {
                "key": key,
                "name": market["name"],
                "description": market.get("description", market["name"]),
                "asset_count": len(market["assets"]),
                "always_open": market.get("always_open", False)
            }
            for key, market in MARKETS.items()
        ]
    }


@router.get("/search")
@limiter.limit("10/minute")
async def search_assets(request: Request, q: str = Query(..., min_length=2, max_length=100)):
    """Search assets by name or symbol — Yahoo Finance with local fallback."""
    import httpx

    q_upper = q.strip().upper()

    # --- Local fallback: search among known MARKETS assets by symbol prefix/contains ---
    def _local_search(query: str) -> list:
        query = query.upper()
        hits = []
        seen = set()
        for market_key, market in MARKETS.items():
            for sym in market["assets"]:
                if sym in seen:
                    continue
                if query in sym or sym.startswith(query):
                    seen.add(sym)
                    hits.append({"symbol": sym, "name": sym, "exchange": market_key, "type": "EQUITY"})
        return hits[:10]

    # --- Yahoo Finance search ---
    base_urls = [
        "https://query1.finance.yahoo.com/v1/finance/search",
        "https://query2.finance.yahoo.com/v1/finance/search",
    ]
    params = {
        "q": q,
        "lang": "en-US",
        "region": "US",
        "quotesCount": 15,
        "newsCount": 0,
        "enableFuzzyQuery": True,
        "quotesQueryId": "tss_match_phrase_query",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/",
    }

    data = None
    async with httpx.AsyncClient(timeout=8) as client:
        for url in base_urls:
            try:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    break
            except Exception:
                continue

    allowed = {"EQUITY", "ETF", "CRYPTOCURRENCY", "MUTUALFUND", "INDEX", "FUTURE", "CURRENCY"}
    results = []
    seen = set()

    if data:
        for quote in data.get("quotes", []):
            symbol = quote.get("symbol", "")
            if not symbol or symbol in seen:
                continue
            qtype = quote.get("quoteType", "EQUITY")
            if qtype not in allowed:
                continue
            seen.add(symbol)
            results.append({
                "symbol":   symbol,
                "name":     quote.get("longname") or quote.get("shortname") or symbol,
                "exchange": quote.get("exchDisp") or quote.get("exchange", ""),
                "type":     qtype,
            })

    # If Yahoo returned nothing, use local fallback
    if not results:
        results = _local_search(q_upper)

    return {"results": results}


@router.get("/my-requests")
async def get_my_asset_requests(
    current_user: dict = Depends(get_current_user)
):
    """Get user's asset requests"""
    user_id = current_user.get("id")

    requests = await execute_query("""
        SELECT * FROM asset_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))

    return {"requests": requests or []}


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
@limiter.limit("20/minute")
async def get_quote(request: Request, symbol: str):
    """Get real-time quote for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
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
@limiter.limit("10/minute")
async def get_chart_data(
    request: Request,
    symbol: str,
    period: str = Query(default="1mo", regex="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|max)$"),
    interval: str = Query(default="1d", regex="^(1m|5m|15m|1h|1d|1wk|1mo)$")
):
    """Get OHLCV chart data for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
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


# ============== ASSET REQUESTS ==============

@router.post("/request-asset")
async def request_new_asset(
    request: AssetRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Request a new asset to be added to the platform"""
    user_id = current_user.get("id")

    # Check if symbol already exists in any market
    symbol_upper = request.symbol.upper()
    for market_key, market in MARKETS.items():
        if symbol_upper in market["assets"]:
            raise HTTPException(
                status_code=400,
                detail=f"Asset {symbol_upper} already exists in {market['name']}"
            )

    # Check if there's already a pending request for this symbol
    existing = await execute_query(
        "SELECT * FROM asset_requests WHERE symbol = ? AND status = 'pending'",
        (symbol_upper,)
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A request for {symbol_upper} is already pending"
        )

    # Create the request
    await execute_write("""
        INSERT INTO asset_requests (user_id, symbol, asset_name, asset_type, reason, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (user_id, symbol_upper, request.asset_name, request.asset_type, request.reason))

    return {
        "success": True,
        "message": f"Request for {symbol_upper} has been submitted for admin review"
    }


