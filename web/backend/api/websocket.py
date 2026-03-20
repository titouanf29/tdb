"""
WebSocket routes for real-time updates
"""
import asyncio
import base64
import hashlib
import hmac
import json
import os
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)

    async def broadcast(self, channel: str, message: dict):
        if channel in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.add(connection)
            # Clean up dead connections
            self.active_connections[channel] -= dead_connections


manager = ConnectionManager()

_JWT_SECRET = os.getenv("JWT_SECRET", "tdb-secret-key-change-in-production")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _get_user_id_from_token(token: Optional[str]) -> Optional[int]:
    """Verify HS256 JWT and return user_id, or None if invalid/tampered."""
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        message = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(
            _JWT_SECRET.encode(), message, hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except Exception:
        return None


websocket_router = APIRouter()


@websocket_router.websocket("/prices/{symbols}")
async def websocket_prices(websocket: WebSocket, symbols: str):
    """
    Real-time price updates for symbols
    symbols: comma-separated list (e.g., "AAPL,MSFT,GOOGL")
    """
    await manager.connect(websocket, f"prices:{symbols}")

    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    try:
        from .routes._prices import fetch_prices

        while True:
            price_data = await fetch_prices(symbol_list[:10])
            prices = {}
            for symbol in symbol_list[:10]:
                p = price_data.get(symbol, {})
                prices[symbol] = {
                    "price": round(p.get("price", 0), 2),
                    "change": round(p.get("change", 0), 2)
                }

            await websocket.send_json({
                "type": "prices",
                "data": prices
            })

            await asyncio.sleep(15)  # Update every 15 seconds

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"prices:{symbols}")


@websocket_router.websocket("/portfolio/{user_id}")
async def websocket_portfolio(websocket: WebSocket, user_id: int, token: Optional[str] = None):
    """
    Real-time portfolio updates for a user — requires valid JWT matching user_id.
    """
    authenticated_id = _get_user_id_from_token(token)
    if authenticated_id is None or authenticated_id != user_id:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket, f"portfolio:{user_id}")

    try:
        from .database import execute_query
        from .routes._prices import fetch_prices

        while True:
            # Get open positions
            positions = await execute_query(
                "SELECT * FROM positions WHERE user_id = ? AND status = 'open'",
                (user_id,)
            )

            total_value = 0
            total_pnl = 0
            position_data = []

            if positions:
                symbols = list({pos["symbol"] for pos in positions})
                price_data = await fetch_prices(symbols)

                for pos in positions:
                    p = price_data.get(pos["symbol"], {})
                    current_price = p.get("price") or pos["entry_price"]

                    if pos["direction"] == "LONG":
                        pnl = (current_price - pos["entry_price"]) * pos["quantity"]
                    else:
                        pnl = (pos["entry_price"] - current_price) * pos["quantity"]

                    value = current_price * pos["quantity"]
                    total_value += value
                    total_pnl += pnl

                    position_data.append({
                        "id": pos["id"],
                        "symbol": pos["symbol"],
                        "direction": pos["direction"],
                        "current_price": round(current_price, 2),
                        "entry_price": pos["entry_price"],
                        "pnl": round(pnl, 2),
                        "pnl_percent": round((pnl / (pos["entry_price"] * pos["quantity"])) * 100, 2)
                    })

            await websocket.send_json({
                "type": "portfolio",
                "data": {
                    "total_value": round(total_value, 2),
                    "total_pnl": round(total_pnl, 2),
                    "positions": position_data
                }
            })

            await asyncio.sleep(15)  # Update every 15 seconds

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"portfolio:{user_id}")


@websocket_router.websocket("/alerts/{user_id}")
async def websocket_alerts(websocket: WebSocket, user_id: int, token: Optional[str] = None):
    """
    Real-time alerts for a user — requires valid JWT matching user_id.
    """
    authenticated_id = _get_user_id_from_token(token)
    if authenticated_id is None or authenticated_id != user_id:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket, f"alerts:{user_id}")
    manager.user_connections[user_id] = websocket

    try:
        while True:
            # Keep connection alive
            await websocket.send_json({"type": "ping"})
            await asyncio.sleep(30)

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"alerts:{user_id}")
        if user_id in manager.user_connections:
            del manager.user_connections[user_id]


async def send_alert_to_user(user_id: int, alert: dict):
    """Send an alert to a specific user"""
    if user_id in manager.user_connections:
        try:
            await manager.user_connections[user_id].send_json({
                "type": "alert",
                "data": alert
            })
        except Exception:
            pass


@websocket_router.websocket("/admin-notifications")
async def websocket_admin_notifications(websocket: WebSocket, token: Optional[str] = None):
    """
    Real-time admin notifications stream — admin only.
    Sends current notifications on connect, then pushes new ones via broadcast.
    """
    user_id = _get_user_id_from_token(token)
    if user_id is None:
        await websocket.close(code=4401)
        return

    from .database import execute_query

    # Verify the user is admin
    rows = await execute_query("SELECT is_admin FROM web_users WHERE id = ?", (user_id,))
    if not rows or not rows[0].get("is_admin"):
        await websocket.close(code=4403)
        return

    await manager.connect(websocket, "admin-notifications")
    try:
        # Send current notifications immediately on connect
        notifications = await execute_query(
            "SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 20"
        )
        unread = sum(1 for n in notifications if not n.get("is_read"))
        await websocket.send_json({
            "type": "admin_notifications",
            "data": {"notifications": notifications, "unread_count": unread}
        })

        # Keep alive — new notifications are pushed via broadcast_admin_notification()
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, "admin-notifications")


async def broadcast_admin_notification(notification: dict):
    """Broadcast a new admin notification to all connected admin clients."""
    await manager.broadcast("admin-notifications", {
        "type": "new_admin_notification",
        "data": notification
    })
