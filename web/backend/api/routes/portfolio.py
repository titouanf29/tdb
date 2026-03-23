"""
Real Portfolio routes — tracking real positions (not paper trading).
"""
from datetime import datetime, timezone, date
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()


def _user_id(user: dict) -> str:
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


# ── Pydantic models ────────────────────────────────────────────────────────────

class CreatePositionRequest(BaseModel):
    symbol: str
    position_type: str          # "long" | "short"
    quantity: float
    entry_price: float
    entry_date: str             # ISO date "YYYY-MM-DD"
    leverage: float = 1.0
    broker: Optional[str] = None
    notes: Optional[str] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    currency: str = "USD"

    @field_validator("position_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v = v.lower()
        if v not in ("long", "short"):
            raise ValueError("position_type must be 'long' or 'short'")
        return v

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        v = v.upper().strip()
        if not v or len(v) > 20:
            raise ValueError("Invalid symbol")
        return v


class UpdatePositionRequest(BaseModel):
    quantity: Optional[float] = None
    entry_price: Optional[float] = None
    entry_date: Optional[str] = None
    leverage: Optional[float] = None
    broker: Optional[str] = None
    notes: Optional[str] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class ClosePositionRequest(BaseModel):
    exit_price: float
    exit_date: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _enrich_with_prices(positions: list[dict]) -> list[dict]:
    """Add live price + unrealised P&L to a list of open positions."""
    if not positions:
        return positions
    from ._prices import fetch_prices
    symbols = list({p["symbol"] for p in positions})
    prices = await fetch_prices(symbols)
    for pos in positions:
        p = prices.get(pos["symbol"], {})
        current_price = p.get("price") or pos["entry_price"]
        change_pct = p.get("change", 0.0)
        entry = pos["entry_price"]
        qty = pos["quantity"]
        lev = pos.get("leverage", 1.0) or 1.0
        if pos["position_type"] == "long":
            pnl = (current_price - entry) * qty * lev
        else:
            pnl = (entry - current_price) * qty * lev
        invested = entry * qty
        pnl_pct = (pnl / invested * 100) if invested else 0.0

        # Days held
        try:
            entry_dt = date.fromisoformat(pos["entry_date"][:10])
            days_held = (date.today() - entry_dt).days
        except Exception:
            days_held = 0

        pos["current_price"] = round(current_price, 6)
        pos["change_24h"] = round(change_pct, 2)
        pos["unrealized_pnl"] = round(pnl, 4)
        pos["pnl_percent"] = round(pnl_pct, 2)
        pos["position_value"] = round(current_price * qty, 4)
        pos["invested_value"] = round(invested, 4)
        pos["days_held"] = days_held
    return positions


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/positions")
async def list_positions(
    status: str = "open",
    current_user: dict = Depends(get_current_user),
):
    """List real positions for the authenticated user, enriched with live prices."""
    uid = _user_id(current_user)
    rows = await execute_query(
        "SELECT * FROM real_positions WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
        (uid, status),
    )
    if status == "open":
        rows = await _enrich_with_prices(rows)
    return {"positions": rows}


@router.get("/positions/check/{symbol}")
async def check_position(
    symbol: str,
    current_user: dict = Depends(get_current_user),
):
    """Return open position(s) for a given symbol (used by /analysis page)."""
    uid = _user_id(current_user)
    rows = await execute_query(
        "SELECT * FROM real_positions WHERE user_id = ? AND symbol = ? AND status = 'open'",
        (uid, symbol.upper()),
    )
    if rows:
        rows = await _enrich_with_prices(rows)
    return {"positions": rows, "has_position": len(rows) > 0}


@router.post("/positions")
async def create_position(
    req: CreatePositionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new real position."""
    uid = _user_id(current_user)
    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        """INSERT INTO real_positions
           (user_id, symbol, position_type, quantity, entry_price, entry_date,
            leverage, broker, notes, stop_loss, take_profit, currency, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)""",
        (uid, req.symbol, req.position_type, req.quantity, req.entry_price,
         req.entry_date, req.leverage, req.broker, req.notes,
         req.stop_loss, req.take_profit, req.currency, now),
    )
    return {"success": True, "message": f"Position {req.position_type.upper()} {req.symbol} créée"}


@router.put("/positions/{position_id}")
async def update_position(
    position_id: int,
    req: UpdatePositionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update fields on an existing open position."""
    uid = _user_id(current_user)
    rows = await execute_query(
        "SELECT * FROM real_positions WHERE id = ? AND user_id = ? AND status = 'open'",
        (position_id, uid),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Position introuvable")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = tuple(updates.values()) + (position_id,)
    await execute_write(
        f"UPDATE real_positions SET {set_clause} WHERE id = ?",
        values,
    )
    return {"success": True, "message": "Position mise à jour"}


@router.post("/positions/{position_id}/close")
async def close_position(
    position_id: int,
    req: ClosePositionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Close an open position with an exit price."""
    uid = _user_id(current_user)
    rows = await execute_query(
        "SELECT * FROM real_positions WHERE id = ? AND user_id = ? AND status = 'open'",
        (position_id, uid),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Position introuvable")

    pos = rows[0]
    exit_date = req.exit_date or datetime.now(timezone.utc).date().isoformat()
    entry = pos["entry_price"]
    qty = pos["quantity"]
    lev = pos.get("leverage", 1.0) or 1.0
    if pos["position_type"] == "long":
        realized_pnl = (req.exit_price - entry) * qty * lev
    else:
        realized_pnl = (entry - req.exit_price) * qty * lev

    await execute_write(
        """UPDATE real_positions
           SET status = 'closed', exit_price = ?, exit_date = ?
           WHERE id = ?""",
        (req.exit_price, exit_date, position_id),
    )
    return {
        "success": True,
        "realized_pnl": round(realized_pnl, 4),
        "message": f"Position {pos['symbol']} clôturée",
    }


@router.delete("/positions/{position_id}")
async def delete_position(
    position_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a position (any status)."""
    uid = _user_id(current_user)
    rows = await execute_query(
        "SELECT id FROM real_positions WHERE id = ? AND user_id = ?",
        (position_id, uid),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Position introuvable")
    await execute_write("DELETE FROM real_positions WHERE id = ?", (position_id,))
    return {"success": True}


@router.get("/summary")
async def portfolio_summary(current_user: dict = Depends(get_current_user)):
    """
    Aggregated portfolio statistics:
    - total invested / current value
    - unrealised P&L (open) + realised P&L (closed)
    - allocation by symbol
    - best / worst open position
    """
    uid = _user_id(current_user)

    open_rows = await execute_query(
        "SELECT * FROM real_positions WHERE user_id = ? AND status = 'open'",
        (uid,),
    )
    closed_rows = await execute_query(
        "SELECT * FROM real_positions WHERE user_id = ? AND status = 'closed'",
        (uid,),
    )

    open_rows = await _enrich_with_prices(open_rows)

    # Aggregate open
    total_invested = sum(r["invested_value"] for r in open_rows)
    total_current = sum(r["position_value"] for r in open_rows)
    unrealized_pnl = sum(r["unrealized_pnl"] for r in open_rows)
    unrealized_pct = (unrealized_pnl / total_invested * 100) if total_invested else 0.0

    # Realised P&L from closed positions
    realized_pnl = 0.0
    for r in closed_rows:
        entry = r["entry_price"]
        qty = r["quantity"]
        lev = r.get("leverage", 1.0) or 1.0
        exit_p = r.get("exit_price") or entry
        if r["position_type"] == "long":
            realized_pnl += (exit_p - entry) * qty * lev
        else:
            realized_pnl += (entry - exit_p) * qty * lev

    # Allocation per symbol (for pie chart)
    allocation: dict[str, float] = {}
    for r in open_rows:
        allocation[r["symbol"]] = allocation.get(r["symbol"], 0) + r["position_value"]

    # Best / worst open position
    best = max(open_rows, key=lambda r: r["pnl_percent"], default=None)
    worst = min(open_rows, key=lambda r: r["pnl_percent"], default=None)

    # Largest position
    largest = max(open_rows, key=lambda r: r["position_value"], default=None)

    return {
        "open_count": len(open_rows),
        "closed_count": len(closed_rows),
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "unrealized_pnl_pct": round(unrealized_pct, 2),
        "realized_pnl": round(realized_pnl, 2),
        "total_pnl": round(unrealized_pnl + realized_pnl, 2),
        "allocation": {k: round(v, 2) for k, v in allocation.items()},
        "best_position": {
            "symbol": best["symbol"],
            "pnl_percent": best["pnl_percent"],
        } if best else None,
        "worst_position": {
            "symbol": worst["symbol"],
            "pnl_percent": worst["pnl_percent"],
        } if worst else None,
        "largest_position": {
            "symbol": largest["symbol"],
            "value": largest["position_value"],
        } if largest else None,
    }
