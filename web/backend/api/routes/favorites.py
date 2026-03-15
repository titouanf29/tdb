"""
Favorites/Watchlist routes
"""
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


@router.get("")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorites with live prices via Polygon.io + Twelve Data."""
    from ._prices import fetch_prices

    user_id = get_user_id(current_user)

    favorites = await execute_query(
        """SELECT symbol, added_at FROM web_favorites
           WHERE user_id = ?
           ORDER BY added_at DESC""",
        (user_id,)
    )

    if not favorites:
        return {"favorites": []}

    symbols = [f["symbol"] for f in favorites]
    prices = await fetch_prices(symbols)

    results = []
    for fav in favorites:
        sym = fav["symbol"]
        p = prices.get(sym, {})
        results.append({
            "symbol": sym,
            "price": p.get("price", 0),
            "change": p.get("change", 0),
            "volume": p.get("volume", 0),
            "added_at": fav["added_at"],
        })

    return {"favorites": results}


import re as _re

@router.post("")
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
