"""
WebSocket routes for real-time updates
"""
import asyncio
import json
from typing import Dict, Set
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
        import yfinance as yf

        while True:
            prices = {}
            for symbol in symbol_list[:10]:  # Limit to 10 symbols
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.fast_info
                    prices[symbol] = {
                        "price": round(info.last_price or 0, 2),
                        "change": round(getattr(info, 'day_change', 0) or 0, 2)
                    }
                except Exception:
                    prices[symbol] = {"price": 0, "change": 0, "error": True}

            await websocket.send_json({
                "type": "prices",
                "data": prices
            })

            await asyncio.sleep(5)  # Update every 5 seconds

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"prices:{symbols}")


@websocket_router.websocket("/portfolio/{user_id}")
async def websocket_portfolio(websocket: WebSocket, user_id: int):
    """
    Real-time portfolio updates for a user
    """
    await manager.connect(websocket, f"portfolio:{user_id}")

    try:
        from .database import execute_query
        import yfinance as yf

        while True:
            # Get open positions
            positions = await execute_query(
                "SELECT * FROM positions WHERE user_id = ? AND status = 'open'",
                (user_id,)
            )

            total_value = 0
            total_pnl = 0
            position_data = []

            for pos in positions:
                try:
                    ticker = yf.Ticker(pos["symbol"])
                    current_price = ticker.fast_info.last_price or pos["entry_price"]

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
                except Exception:
                    continue

            await websocket.send_json({
                "type": "portfolio",
                "data": {
                    "total_value": round(total_value, 2),
                    "total_pnl": round(total_pnl, 2),
                    "positions": position_data
                }
            })

            await asyncio.sleep(10)  # Update every 10 seconds

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"portfolio:{user_id}")


@websocket_router.websocket("/alerts/{user_id}")
async def websocket_alerts(websocket: WebSocket, user_id: int):
    """
    Real-time alerts for a user
    """
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
