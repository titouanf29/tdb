"""
User routes
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()

VALID_STYLES = {"scalp", "day", "swing", "long"}
VALID_RISKS  = {"conservative", "moderate", "aggressive", "very_aggressive"}
VALID_LEVELS = {"beginner", "intermediate", "expert"}


class UpdateSettingsRequest(BaseModel):
    trading_style: Optional[str] = None
    risk_level: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    theme: Optional[str] = None
    default_leverage: Optional[str] = None
    trading_level: Optional[str] = None


@router.get("/settings")
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Get web user settings"""
    user_id = current_user["id"]
    rows = await execute_query(
        "SELECT * FROM web_user_settings WHERE user_id = ?",
        (user_id,)
    )
    # Also get trading_level from web_users
    user_rows = await execute_query(
        "SELECT trading_level FROM web_users WHERE id = ?",
        (user_id,)
    )
    trading_level = None
    if user_rows:
        trading_level = user_rows[0].get("trading_level")

    if not rows:
        return {
            "trading_style": "day",
            "risk_level": "moderate",
            "notifications_enabled": True,
            "theme": "dark",
            "default_leverage": "1",
            "trading_level": trading_level,
        }
    row = rows[0]
    return {
        "trading_style":         row.get("trading_style", "day"),
        "risk_level":            row.get("risk_level", "moderate"),
        "notifications_enabled": bool(row.get("notifications_enabled", 1)),
        "theme":                 row.get("theme", "dark"),
        "default_leverage":      row.get("default_leverage", "1"),
        "trading_level":         trading_level,
    }


@router.put("/settings")
async def update_user_settings(
    request: UpdateSettingsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update web user settings (upsert)"""
    user_id = current_user["id"]

    # Validate values
    if request.trading_style and request.trading_style not in VALID_STYLES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Style invalide. Valeurs: {VALID_STYLES}")
    if request.risk_level and request.risk_level not in VALID_RISKS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Niveau de risque invalide. Valeurs: {VALID_RISKS}")
    if request.trading_level and request.trading_level not in VALID_LEVELS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Niveau de trading invalide. Valeurs: {VALID_LEVELS}")

    # Update trading_level on web_users if provided
    if request.trading_level is not None:
        await execute_write(
            "UPDATE web_users SET trading_level = ? WHERE id = ?",
            (request.trading_level, user_id)
        )

    existing = await execute_query(
        "SELECT user_id FROM web_user_settings WHERE user_id = ?",
        (user_id,)
    )

    if not existing:
        await execute_write(
            """INSERT INTO web_user_settings
               (user_id, trading_style, risk_level, notifications_enabled, theme, language)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                request.trading_style or "day",
                request.risk_level or "moderate",
                1 if (request.notifications_enabled is None or request.notifications_enabled) else 0,
                request.theme or "dark",
                "fr",
            )
        )
    else:
        # Build update using a safe, fixed mapping of field → column name
        # Column names are never derived from user input.
        SAFE_COLUMN_MAP = [
            (request.trading_style,        "trading_style",         request.trading_style),
            (request.risk_level,           "risk_level",            request.risk_level),
            (request.notifications_enabled,"notifications_enabled",
             None if request.notifications_enabled is None else (1 if request.notifications_enabled else 0)),
            (request.theme,                "theme",                 request.theme),
            (request.default_leverage,     "language",              request.default_leverage),
        ]
        updates, params = [], []
        for field_val, col_name, db_val in SAFE_COLUMN_MAP:
            if field_val is not None:
                updates.append(f"{col_name} = ?")
                params.append(db_val)
        if updates:
            params.append(user_id)
            # updates list is built entirely from the hardcoded SAFE_COLUMN_MAP above,
            # never from user-supplied strings — no SQL injection risk.
            query = "UPDATE web_user_settings SET " + ", ".join(updates) + " WHERE user_id = ?"
            await execute_write(query, tuple(params))

    return {"success": True}


@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite assets"""
    user_id = current_user["id"]
    favorites = await execute_query(
        "SELECT symbol FROM web_favorites WHERE user_id = ? ORDER BY added_at DESC",
        (user_id,)
    )
    return {"favorites": [f["symbol"] for f in favorites]}


@router.post("/favorites/{symbol}")
async def add_favorite(symbol: str, current_user: dict = Depends(get_current_user)):
    """Add asset to favorites"""
    user_id = current_user["id"]
    existing = await execute_query(
        "SELECT symbol FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (user_id, symbol.upper())
    )
    if existing:
        return {"success": False, "message": "Already in favorites"}
    await execute_write(
        "INSERT INTO web_favorites (user_id, symbol, added_at) VALUES (?, ?, ?)",
        (user_id, symbol.upper(), datetime.utcnow().isoformat())
    )
    return {"success": True, "message": f"{symbol} added to favorites"}


@router.delete("/favorites/{symbol}")
async def remove_favorite(symbol: str, current_user: dict = Depends(get_current_user)):
    """Remove asset from favorites"""
    await execute_write(
        "DELETE FROM web_favorites WHERE user_id = ? AND symbol = ?",
        (current_user["id"], symbol.upper())
    )
    return {"success": True, "message": f"{symbol} removed from favorites"}
