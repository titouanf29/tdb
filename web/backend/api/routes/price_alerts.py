"""
Price alerts — "préviens-moi quand X franchit Y".

Users set a target on any asset (above/below). While they are on the site
the frontend polls /check, which evaluates active alerts against live
prices server-side and flips any that crossed to 'triggered', returning
the freshly-crossed ones so the UI can surface an in-app notification.

No external delivery (email/push) — alerts fire while the user is active.
Server-side evaluation means an alert triggers even if the user isn't
looking at that particular asset.
"""
import re
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from ..limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write
from .auth import get_current_user
from ._prices import fetch_prices

router = APIRouter()
limiter = Limiter(key_func=cle_client)

MAX_ACTIVE_ALERTS = 30
_SYMBOL_RE = re.compile(r"^[A-Z0-9.\-=^]{1,15}$")


async def _ensure_table() -> None:
    await execute_write(
        """CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            direction TEXT NOT NULL,
            target REAL NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            triggered_at TEXT,
            triggered_price REAL
        )""",
        (),
    )


def _uid(user: dict) -> str:
    return str(user.get("id"))


class AlertCreate(BaseModel):
    symbol: str
    direction: str
    target: float
    note: str | None = ""

    @field_validator("symbol")
    @classmethod
    def _sym(cls, v: str) -> str:
        v = (v or "").upper().strip()
        if not _SYMBOL_RE.match(v):
            raise ValueError("Symbole invalide")
        return v

    @field_validator("direction")
    @classmethod
    def _dir(cls, v: str) -> str:
        v = (v or "").lower().strip()
        if v not in ("above", "below"):
            raise ValueError("direction doit être 'above' ou 'below'")
        return v

    @field_validator("target")
    @classmethod
    def _target(cls, v: float) -> float:
        if v <= 0 or v > 1e12:
            raise ValueError("Cible invalide")
        return round(float(v), 6)

    @field_validator("note")
    @classmethod
    def _note(cls, v):
        return (v or "")[:140]


def _row(r) -> dict:
    return {
        "id": r["id"],
        "symbol": r["symbol"],
        "direction": r["direction"],
        "target": r["target"],
        "note": r["note"],
        "status": r["status"],
        "created_at": r["created_at"],
        "triggered_at": r["triggered_at"],
        "triggered_price": r["triggered_price"],
    }


@router.get("")
async def list_alerts(current_user: dict = Depends(get_current_user)):
    await _ensure_table()
    uid = _uid(current_user)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    rows = await execute_query(
        """SELECT * FROM price_alerts
           WHERE user_id = ? AND (status = 'active' OR triggered_at >= ?)
           ORDER BY (status = 'active') DESC, id DESC""",
        (uid, cutoff),
    )
    return {"alerts": [_row(r) for r in rows]}


@router.post("")
@limiter.limit("20/minute")
async def create_alert(
    request: Request,
    body: AlertCreate,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_table()
    uid = _uid(current_user)

    active = await execute_query(
        "SELECT COUNT(*) as n FROM price_alerts WHERE user_id = ? AND status = 'active'",
        (uid,),
    )
    if active and int(active[0]["n"]) >= MAX_ACTIVE_ALERTS:
        raise HTTPException(status_code=429, detail=f"Limite de {MAX_ACTIVE_ALERTS} alertes actives atteinte.")

    # Reject a duplicate active alert (same symbol/direction/target)
    dup = await execute_query(
        "SELECT id FROM price_alerts WHERE user_id = ? AND status = 'active' AND symbol = ? AND direction = ? AND ABS(target - ?) < 1e-6",
        (uid, body.symbol, body.direction, body.target),
    )
    if dup:
        raise HTTPException(status_code=409, detail="Une alerte identique existe déjà.")

    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        """INSERT INTO price_alerts (user_id, symbol, direction, target, note, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'active', ?)""",
        (uid, body.symbol, body.direction, body.target, body.note or "", now),
    )
    rows = await execute_query(
        "SELECT * FROM price_alerts WHERE user_id = ? ORDER BY id DESC LIMIT 1", (uid,)
    )
    return _row(rows[0])


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, current_user: dict = Depends(get_current_user)):
    await _ensure_table()
    uid = _uid(current_user)
    await execute_write(
        "DELETE FROM price_alerts WHERE id = ? AND user_id = ?", (alert_id, uid)
    )
    return {"ok": True}


@router.post("/check")
@limiter.limit("60/minute")
async def check_alerts(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Evaluate active alerts against live prices; return freshly triggered ones."""
    await _ensure_table()
    uid = _uid(current_user)

    active = await execute_query(
        "SELECT * FROM price_alerts WHERE user_id = ? AND status = 'active'", (uid,)
    )
    if not active:
        return {"triggered": [], "active_count": 0}

    symbols = list({a["symbol"] for a in active})
    try:
        prices = await fetch_prices(symbols)
    except Exception:
        # A transient price-source outage must not 500 the 60s poller
        return {"triggered": [], "active_count": len(active)}

    triggered = []
    now = datetime.now(timezone.utc).isoformat()
    for a in active:
        pr = prices.get(a["symbol"]) or {}
        price = pr.get("price")
        if not price:
            continue
        price = float(price)
        crossed = (a["direction"] == "above" and price >= a["target"]) or \
                  (a["direction"] == "below" and price <= a["target"])
        if crossed:
            await execute_write(
                "UPDATE price_alerts SET status = 'triggered', triggered_at = ?, triggered_price = ? WHERE id = ?",
                (now, round(price, 6), a["id"]),
            )
            row = dict(a)
            row.update({"status": "triggered", "triggered_at": now, "triggered_price": round(price, 6)})
            triggered.append(_row(row))

    remaining = await execute_query(
        "SELECT COUNT(*) as n FROM price_alerts WHERE user_id = ? AND status = 'active'", (uid,)
    )
    return {"triggered": triggered, "active_count": int(remaining[0]["n"]) if remaining else 0}
