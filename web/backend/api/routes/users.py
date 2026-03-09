"""
User routes
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()


class UpdateSettingsRequest(BaseModel):
    trading_style: Optional[str] = None
    risk_level: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    theme: Optional[str] = None


@router.get("/settings")
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Get user settings"""
    settings = await execute_query(
        "SELECT * FROM user_settings WHERE user_id = ?",
        (current_user["telegram_id"],)
    )

    if not settings:
        # Return defaults
        return {
            "trading_style": "day",
            "risk_level": "moderate",
            "notifications_enabled": True,
            "theme": "dark"
        }

    return settings[0]


@router.put("/settings")
async def update_user_settings(
    request: UpdateSettingsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user settings"""
    # Check if settings exist
    settings = await execute_query(
        "SELECT * FROM user_settings WHERE user_id = ?",
        (current_user["telegram_id"],)
    )

    if not settings:
        # Create settings
        await execute_write(
            """INSERT INTO user_settings (user_id, trading_style, risk_level, notifications_enabled, theme)
               VALUES (?, ?, ?, ?, ?)""",
            (current_user["telegram_id"],
             request.trading_style or "day",
             request.risk_level or "moderate",
             request.notifications_enabled if request.notifications_enabled is not None else True,
             request.theme or "dark")
        )
    else:
        # Update settings
        updates = []
        params = []

        if request.trading_style is not None:
            updates.append("trading_style = ?")
            params.append(request.trading_style)
        if request.risk_level is not None:
            updates.append("risk_level = ?")
            params.append(request.risk_level)
        if request.notifications_enabled is not None:
            updates.append("notifications_enabled = ?")
            params.append(request.notifications_enabled)
        if request.theme is not None:
            updates.append("theme = ?")
            params.append(request.theme)

        if updates:
            params.append(current_user["telegram_id"])
            await execute_write(
                f"UPDATE user_settings SET {', '.join(updates)} WHERE user_id = ?",
                tuple(params)
            )

    return {"success": True, "message": "Settings updated"}


@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite assets"""
    favorites = await execute_query(
        "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["telegram_id"],)
    )

    return {"favorites": [f["symbol"] for f in favorites]}


@router.post("/favorites/{symbol}")
async def add_favorite(symbol: str, current_user: dict = Depends(get_current_user)):
    """Add asset to favorites"""
    from datetime import datetime

    # Check if already exists
    existing = await execute_query(
        "SELECT * FROM favorites WHERE user_id = ? AND symbol = ?",
        (current_user["telegram_id"], symbol.upper())
    )

    if existing:
        return {"success": False, "message": "Already in favorites"}

    await execute_write(
        "INSERT INTO favorites (user_id, symbol, created_at) VALUES (?, ?, ?)",
        (current_user["telegram_id"], symbol.upper(), datetime.utcnow().isoformat())
    )

    return {"success": True, "message": f"{symbol} added to favorites"}


@router.delete("/favorites/{symbol}")
async def remove_favorite(symbol: str, current_user: dict = Depends(get_current_user)):
    """Remove asset from favorites"""
    await execute_write(
        "DELETE FROM favorites WHERE user_id = ? AND symbol = ?",
        (current_user["telegram_id"], symbol.upper())
    )

    return {"success": True, "message": f"{symbol} removed from favorites"}
