"""
Trading Journal routes — log trades with metrics, notes and screenshots.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()

_MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024  # 3 MB base64


def _uid(user: dict) -> str:
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


# ── Models ─────────────────────────────────────────────────────────────────────

class JournalEntryCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    direction: str              # 'LONG' | 'SHORT'
    timeframe: Optional[str] = None   # '1m','5m','15m','1h','4h','1d','1w'
    setup: Optional[str] = None       # 'breakout','reversal','trend'…
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    risk_reward: Optional[float] = None
    result: Optional[str] = None      # 'win' | 'loss' | 'breakeven'
    pnl: Optional[float] = None
    pre_trade_notes: Optional[str] = None
    post_trade_notes: Optional[str] = None
    screenshot: Optional[str] = None  # base64 data-URL


class JournalEntryUpdate(BaseModel):
    symbol: Optional[str] = None
    direction: Optional[str] = None
    timeframe: Optional[str] = None
    setup: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    risk_reward: Optional[float] = None
    result: Optional[str] = None
    pnl: Optional[float] = None
    pre_trade_notes: Optional[str] = None
    post_trade_notes: Optional[str] = None
    screenshot: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _validate_screenshot(b64: Optional[str]) -> None:
    if b64 and len(b64.encode()) > _MAX_SCREENSHOT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Screenshot trop lourd (max 3 Mo)"
        )


def _validate_direction(d: Optional[str]) -> None:
    if d and d.upper() not in ("LONG", "SHORT"):
        raise HTTPException(status_code=400, detail="direction must be LONG or SHORT")


def _validate_result(r: Optional[str]) -> None:
    if r and r not in ("win", "loss", "breakeven"):
        raise HTTPException(status_code=400, detail="result must be win, loss or breakeven")


def _row_to_dict(row: dict) -> dict:
    d = dict(row)
    # Normalise direction to uppercase
    if d.get("direction"):
        d["direction"] = d["direction"].upper()
    return d


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/symbols")
async def get_symbols(current_user: dict = Depends(get_current_user)):
    """Return all distinct symbols used by this user + common symbols list."""
    user_id = _uid(current_user)
    rows = await execute_query(
        "SELECT DISTINCT symbol FROM trading_journal WHERE user_id = ? ORDER BY symbol",
        (user_id,),
    )
    user_symbols = [r["symbol"] for r in rows]

    common = [
        # US Mega-cap
        "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","JPM","V",
        "UNH","XOM","LLY","JNJ","WMT","MA","PG","HD","MRK","COST",
        # ETFs populaires
        "SPY","QQQ","IWM","DIA","VOO","VTI","GLD","SLV","TLT","XLK",
        "XLF","XLE","XLV","XBI","ARK","ARKK","ARKG","ARKW",
        # Indices
        "^SPX","^NDX","^DJI","^RUT","^VIX","^FTSE","^DAX","^CAC",
        # Crypto
        "BTC-USD","ETH-USD","SOL-USD","BNB-USD","XRP-USD","ADA-USD",
        "AVAX-USD","DOT-USD","MATIC-USD","LINK-USD","DOGE-USD",
        # Forex
        "EURUSD=X","GBPUSD=X","USDJPY=X","AUDUSD=X","USDCAD=X",
        "USDCHF=X","NZDUSD=X","EURGBP=X",
        # Matières premières
        "GC=F","SI=F","CL=F","NG=F","ZW=F","ZC=F","ZS=F",
        # Europe (Euronext Paris)
        "MC.PA","LVMH","OR.PA","TTE.PA","SAN.PA","BNP.PA","AIR.PA",
        "SU.PA","CS.PA","RI.PA",
    ]

    # Merge user symbols first, then common (deduplicated)
    seen = set(user_symbols)
    merged = list(user_symbols)
    for s in common:
        if s not in seen:
            seen.add(s)
            merged.append(s)

    return {"symbols": merged, "user_symbols": user_symbols}


@router.get("")
async def list_entries(
    result: Optional[str] = None,
    symbol: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Return all journal entries for the current user, newest first."""
    user_id = _uid(current_user)

    query = "SELECT * FROM trading_journal WHERE user_id = ?"
    params: list = [user_id]

    if result:
        _validate_result(result)
        query += " AND result = ?"
        params.append(result)
    if symbol:
        query += " AND UPPER(symbol) = ?"
        params.append(symbol.upper())

    query += " ORDER BY created_at DESC"
    rows = await execute_query(query, tuple(params))
    return {"entries": [_row_to_dict(r) for r in rows]}


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Aggregate stats: win rate, avg R:R, total P&L, etc."""
    user_id = _uid(current_user)
    rows = await execute_query(
        "SELECT result, pnl, risk_reward FROM trading_journal WHERE user_id = ?",
        (user_id,),
    )
    total = len(rows)
    wins = sum(1 for r in rows if r.get("result") == "win")
    losses = sum(1 for r in rows if r.get("result") == "loss")
    breakevens = sum(1 for r in rows if r.get("result") == "breakeven")

    pnl_values = [r["pnl"] for r in rows if r.get("pnl") is not None]
    rr_values   = [r["risk_reward"] for r in rows if r.get("risk_reward") is not None]

    return {
        "total": total,
        "wins": wins,
        "losses": losses,
        "breakevens": breakevens,
        "win_rate": round(wins / total * 100, 1) if total else 0,
        "total_pnl": round(sum(pnl_values), 2) if pnl_values else 0,
        "avg_rr": round(sum(rr_values) / len(rr_values), 2) if rr_values else 0,
        "best_trade": round(max(pnl_values), 2) if pnl_values else 0,
        "worst_trade": round(min(pnl_values), 2) if pnl_values else 0,
    }


@router.get("/{entry_id}")
async def get_entry(entry_id: int, current_user: dict = Depends(get_current_user)):
    user_id = _uid(current_user)
    rows = await execute_query(
        "SELECT * FROM trading_journal WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    return _row_to_dict(rows[0])


@router.post("", status_code=201)
async def create_entry(
    data: JournalEntryCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = _uid(current_user)
    _validate_direction(data.direction)
    _validate_result(data.result)
    _validate_screenshot(data.screenshot)

    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        """INSERT INTO trading_journal
           (user_id, symbol, direction, timeframe, setup,
            entry_time, exit_time, entry_price, exit_price, quantity,
            risk_reward, result, pnl,
            pre_trade_notes, post_trade_notes, screenshot,
            created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            user_id, data.symbol.upper(), data.direction.upper(),
            data.timeframe, data.setup,
            data.entry_time, data.exit_time,
            data.entry_price, data.exit_price, data.quantity,
            data.risk_reward, data.result, data.pnl,
            data.pre_trade_notes, data.post_trade_notes, data.screenshot,
            now, now,
        ),
    )
    rows = await execute_query(
        "SELECT * FROM trading_journal WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,),
    )
    return _row_to_dict(rows[0])


@router.put("/{entry_id}")
async def update_entry(
    entry_id: int,
    data: JournalEntryUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = _uid(current_user)
    rows = await execute_query(
        "SELECT id FROM trading_journal WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Entrée introuvable")

    _validate_direction(data.direction)
    _validate_result(data.result)
    _validate_screenshot(data.screenshot)

    _UPDATABLE = frozenset({
        "symbol", "direction", "timeframe", "setup",
        "entry_time", "exit_time", "entry_price", "exit_price", "quantity",
        "risk_reward", "result", "pnl",
        "pre_trade_notes", "post_trade_notes", "screenshot",
    })
    updates = {k: v for k, v in data.model_dump().items()
               if v is not None and k in _UPDATABLE}
    if not updates:
        raise HTTPException(status_code=400, detail="Rien à mettre à jour")

    if "symbol" in updates:
        updates["symbol"] = updates["symbol"].upper()
    if "direction" in updates:
        updates["direction"] = updates["direction"].upper()

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    await execute_write(
        f"UPDATE trading_journal SET {set_clause} WHERE id = ? AND user_id = ?",
        (*updates.values(), entry_id, user_id),
    )
    rows = await execute_query(
        "SELECT * FROM trading_journal WHERE id = ?", (entry_id,)
    )
    return _row_to_dict(rows[0])


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: int, current_user: dict = Depends(get_current_user)):
    user_id = _uid(current_user)
    rows = await execute_query(
        "SELECT id FROM trading_journal WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    await execute_write(
        "DELETE FROM trading_journal WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
