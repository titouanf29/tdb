"""
Favorites/Watchlist routes
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()


class AddFavoriteRequest(BaseModel):
    symbol: str


def get_user_id(user: dict) -> int:
    """Get user ID for web users"""
    return user.get("id")


@router.get("/")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorites with live prices"""
    import yfinance as yf

    user_id = get_user_id(current_user)

    favorites = await execute_query(
        """SELECT symbol, added_at FROM web_favorites
           WHERE user_id = ?
           ORDER BY added_at DESC""",
        (user_id,)
    )

    # Get live prices
    result = []
    for fav in favorites:
        symbol = fav["symbol"]
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")

            if len(hist) >= 2:
                current_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2]
                change = ((current_price - prev_price) / prev_price) * 100
            else:
                current_price = 0
                change = 0

            result.append({
                "symbol": symbol,
                "price": round(current_price, 2),
                "change": round(change, 2),
                "added_at": fav["added_at"]
            })
        except Exception:
            result.append({
                "symbol": symbol,
                "price": 0,
                "change": 0,
                "added_at": fav["added_at"],
                "error": True
            })

    return {"favorites": result}


@router.post("/")
async def add_favorite(
    request: AddFavoriteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a symbol to favorites"""
    import yfinance as yf

    user_id = get_user_id(current_user)
    symbol = request.symbol.upper()

    # Verify symbol exists
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d")
        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid symbol")

    # Check if already in favorites
    existing = await execute_query(
        "SELECT id FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol)
    )

    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")

    # Add to favorites
    await execute_write(
        """INSERT INTO web_favorites (user_id, symbol, added_at)
           VALUES (?, ?, ?)""",
        (user_id, symbol, datetime.utcnow().isoformat())
    )

    return {"message": f"{symbol} added to favorites"}


@router.delete("/{symbol}")
async def remove_favorite(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a symbol from favorites"""
    user_id = get_user_id(current_user)
    symbol = symbol.upper()

    result = await execute_write(
        "DELETE FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol)
    )

    if result == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")

    return {"message": f"{symbol} removed from favorites"}


@router.get("/check/{symbol}")
async def check_favorite(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a symbol is in favorites"""
    user_id = get_user_id(current_user)
    symbol = symbol.upper()

    existing = await execute_query(
        "SELECT id FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol)
    )

    return {"is_favorite": len(existing) > 0}
