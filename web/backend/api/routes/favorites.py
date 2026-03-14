"""
Favorites/Watchlist routes
"""
import asyncio
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user
from .premium import get_user_limits

router = APIRouter()


class AddFavoriteRequest(BaseModel):
    symbol: str


def get_user_id(user: dict) -> int:
    """Get user ID for web users"""
    return user.get("id")


async def _fetch_price(symbol: str, added_at: str) -> dict:
    """Fetch live price for a symbol via yfinance in a thread."""
    import yfinance as yf
    try:
        hist = await asyncio.get_event_loop().run_in_executor(
            None, lambda: yf.Ticker(symbol).history(period="5d")
        )
        if len(hist) >= 2:
            current_price = float(hist['Close'].iloc[-1])
            prev_price = float(hist['Close'].iloc[-2])
            change = ((current_price - prev_price) / prev_price) * 100
        elif len(hist) == 1:
            current_price = float(hist['Close'].iloc[-1])
            change = 0.0
        else:
            return {"symbol": symbol, "price": 0, "change": 0, "added_at": added_at, "error": True}
        return {
            "symbol": symbol,
            "price": round(current_price, 2),
            "change": round(change, 2),
            "added_at": added_at
        }
    except Exception:
        return {"symbol": symbol, "price": 0, "change": 0, "added_at": added_at, "error": True}


@router.get("/")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorites with live prices (parallel fetching)"""
    user_id = get_user_id(current_user)

    favorites = await execute_query(
        """SELECT symbol, added_at FROM web_favorites
           WHERE user_id = ?
           ORDER BY added_at DESC""",
        (user_id,)
    )

    if not favorites:
        return {"favorites": []}

    # Fetch all prices in parallel
    results = await asyncio.gather(*[
        _fetch_price(fav["symbol"], fav["added_at"]) for fav in favorites
    ])
    return {"favorites": list(results)}


import re as _re

@router.post("/")
async def add_favorite(
    request: AddFavoriteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a symbol to favorites"""
    user_id = get_user_id(current_user)
    symbol = request.symbol.upper().strip()

    # Basic symbol format validation — allow indices (^GSPC), futures (CL=F), Asian/EU stocks
    if not symbol or not _re.match(r'^[\^A-Z0-9.\-=]{1,30}$', symbol):
        raise HTTPException(status_code=400, detail="Symbole invalide")

    # Check favorites limit
    limits = await get_user_limits(current_user)
    max_favorites = limits.get("max_favorites", 10)

    current_count = await execute_query(
        "SELECT COUNT(*) as count FROM web_favorites WHERE user_id = ?",
        (user_id,)
    )
    count = current_count[0]["count"] if current_count else 0

    if count >= max_favorites:
        raise HTTPException(
            status_code=403,
            detail=f"Limite de favoris atteinte ({max_favorites}). Passez Premium pour en ajouter plus."
        )

    # Check if already in favorites
    existing = await execute_query(
        "SELECT id FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Déjà dans vos favoris")

    # Add to favorites
    await execute_write(
        """INSERT INTO web_favorites (user_id, symbol, added_at)
           VALUES (?, ?, ?)""",
        (user_id, symbol, datetime.utcnow().isoformat())
    )

    return {"message": f"{symbol} ajouté aux favoris"}


@router.delete("/{symbol}")
async def remove_favorite(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a symbol from favorites"""
    user_id = get_user_id(current_user)
    symbol = symbol.upper()

    # Verify it exists before deleting
    existing = await execute_query(
        "SELECT id FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Favori introuvable")

    await execute_write(
        "DELETE FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol)
    )
    return {"message": f"{symbol} retiré des favoris"}


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
