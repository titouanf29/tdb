"""
Wallet routes - Synchronized with Telegram bot
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user
from .premium import get_user_limits

router = APIRouter()


def get_user_id(user: dict) -> str:
    """Get unified user ID for database queries"""
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


class OpenPositionRequest(BaseModel):
    symbol: str
    direction: str  # "LONG" or "SHORT"
    amount: float
    leverage: int = 1
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None


class ClosePositionRequest(BaseModel):
    position_id: int


@router.get("/balance")
async def get_wallet_balance(current_user: dict = Depends(get_current_user)):
    """Get user's wallet balance"""
    user_id = get_user_id(current_user)

    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (user_id,)
    )

    if not wallets:
        # Create default wallet
        await execute_write(
            """INSERT INTO wallet (user_id, balance, currency, created_at)
               VALUES (?, 10000.0, 'USD', ?)""",
            (user_id, datetime.now(timezone.utc).isoformat())
        )
        return {
            "balance": 10000.0,
            "currency": "USD",
            "total_pnl": 0.0,
            "positions_value": 0.0
        }

    wallet = wallets[0]

    # Calculate total positions value
    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = 'open'",
        (user_id,)
    )

    positions_value = sum(p.get("current_value", 0) or 0 for p in positions)
    total_pnl = sum(p.get("unrealized_pnl", 0) or 0 for p in positions)

    return {
        "balance": wallet["balance"],
        "currency": wallet.get("currency", "USD"),
        "total_pnl": round(total_pnl, 2),
        "positions_value": round(positions_value, 2),
        "total_equity": round(wallet["balance"] + positions_value, 2)
    }


@router.get("/positions")
async def get_positions(
    status: str = "open",
    current_user: dict = Depends(get_current_user)
):
    """Get user's positions"""
    user_id = get_user_id(current_user)

    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
        (user_id, status)
    )

    # Update current prices for open positions via Polygon.io + Twelve Data
    if status == "open" and positions:
        from ._prices import fetch_prices as fetch_prices_safe
        symbols = list({pos["symbol"] for pos in positions})
        prices = await fetch_prices_safe(symbols)
        for pos in positions:
            p = prices.get(pos["symbol"])
            current_price = p["price"] if p else pos.get("entry_price", 0)
            entry_price = pos["entry_price"]
            quantity = pos["quantity"]
            direction = pos["direction"]
            if current_price and entry_price:
                pnl = (current_price - entry_price) * quantity if direction == "LONG" else (entry_price - current_price) * quantity
                pnl_percent = (pnl / (entry_price * quantity)) * 100
            else:
                pnl, pnl_percent = 0, 0
            pos["current_price"] = round(current_price, 2)
            pos["unrealized_pnl"] = round(pnl, 2)
            pos["pnl_percent"] = round(pnl_percent, 2)

    return {"positions": positions}


@router.post("/positions/open")
async def open_position(
    request: OpenPositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Open a new trading position"""
    from .market import _fetch_quote_data

    user_id = get_user_id(current_user)

    # Check positions limit
    limits = await get_user_limits(current_user)
    max_positions = limits.get("max_positions", 5)

    open_positions = await execute_query(
        "SELECT COUNT(*) as count FROM positions WHERE user_id = ? AND status = 'open'",
        (user_id,)
    )
    count = open_positions[0]["count"] if open_positions else 0

    if count >= max_positions:
        raise HTTPException(
            status_code=403,
            detail=f"Limite de positions atteinte ({max_positions}). Passez Premium pour en ouvrir plus."
        )

    # Get current price (robust: Polygon/Twelve Data fallback)
    symbol = request.symbol.upper()
    quote = await _fetch_quote_data(symbol)
    current_price = quote.get("price") if quote else None
    if not current_price:
        raise HTTPException(
            status_code=400,
            detail=f"Symbole \"{symbol}\" introuvable ou données indisponibles"
        )

    # Check balance
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (user_id,)
    )

    if not wallets or wallets[0]["balance"] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Calculate position
    quantity = (request.amount * request.leverage) / current_price

    # Create position
    await execute_write(
        """INSERT INTO positions
           (user_id, symbol, direction, entry_price, quantity, amount, leverage,
            take_profit, stop_loss, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)""",
        (user_id, symbol, request.direction.upper(),
         current_price, quantity, request.amount, request.leverage,
         request.take_profit, request.stop_loss, datetime.now(timezone.utc).isoformat())
    )

    # Deduct from balance
    new_balance = wallets[0]["balance"] - request.amount
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, user_id)
    )

    return {
        "success": True,
        "message": f"Position opened: {request.direction} {symbol}",
        "entry_price": round(current_price, 2),
        "quantity": round(quantity, 6),
        "new_balance": round(new_balance, 2)
    }


@router.post("/positions/close")
async def close_position(
    request: ClosePositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Close an existing position"""
    from ._prices import fetch_prices

    user_id = get_user_id(current_user)

    # Get position
    positions = await execute_query(
        "SELECT * FROM positions WHERE id = ? AND user_id = ? AND status = 'open'",
        (request.position_id, user_id)
    )

    if not positions:
        raise HTTPException(status_code=404, detail="Position not found")

    position = positions[0]

    # Get current price
    prices = await fetch_prices([position["symbol"]])
    p = prices.get(position["symbol"], {})
    exit_price = p.get("price") or position["entry_price"]

    # Calculate P&L
    entry_price = position["entry_price"]
    quantity = position["quantity"]
    direction = position["direction"]

    if direction == "LONG":
        pnl = (exit_price - entry_price) * quantity
    else:
        pnl = (entry_price - exit_price) * quantity

    # Update position
    await execute_write(
        """UPDATE positions
           SET status = 'closed', exit_price = ?, realized_pnl = ?, closed_at = ?
           WHERE id = ?""",
        (exit_price, pnl, datetime.now(timezone.utc).isoformat(), request.position_id)
    )

    # Update balance
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (user_id,)
    )

    new_balance = wallets[0]["balance"] + position["amount"] + pnl
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, user_id)
    )

    return {
        "success": True,
        "message": f"Position closed: {position['symbol']}",
        "exit_price": round(exit_price, 2),
        "realized_pnl": round(pnl, 2),
        "new_balance": round(new_balance, 2)
    }


@router.get("/history")
async def get_trade_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get trading history"""
    user_id = get_user_id(current_user)

    positions = await execute_query(
        """SELECT * FROM positions
           WHERE user_id = ? AND status = 'closed'
           ORDER BY closed_at DESC
           LIMIT ?""",
        (user_id, limit)
    )

    return {"history": positions}


class UpdatePositionRequest(BaseModel):
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None


@router.patch("/positions/{position_id}")
async def update_position(
    position_id: int,
    request: UpdatePositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update TP/SL on an open position"""
    user_id = get_user_id(current_user)

    positions = await execute_query(
        "SELECT * FROM positions WHERE id = ? AND user_id = ? AND status = 'open'",
        (position_id, user_id)
    )
    if not positions:
        raise HTTPException(status_code=404, detail="Position not found")

    await execute_write(
        "UPDATE positions SET take_profit = ?, stop_loss = ? WHERE id = ?",
        (request.take_profit, request.stop_loss, position_id)
    )

    return {"success": True, "message": "Position updated"}


class AddFundsRequest(BaseModel):
    amount: float


@router.post("/add-funds")
async def add_funds_to_wallet(
    request: AddFundsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add funds to user's wallet (paper trading)"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    if request.amount > 100000:
        raise HTTPException(status_code=400, detail="Maximum 100,000$ per transaction")

    user_id = get_user_id(current_user)

    # Get or create wallet
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (user_id,)
    )

    if not wallets:
        # Create wallet with the amount
        await execute_write(
            """INSERT INTO wallet (user_id, balance, currency, created_at)
               VALUES (?, ?, 'USD', ?)""",
            (user_id, request.amount, datetime.now(timezone.utc).isoformat())
        )
        return {
            "success": True,
            "message": f"${request.amount:,.2f} added to wallet",
            "new_balance": request.amount
        }

    new_balance = wallets[0]["balance"] + request.amount
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, user_id)
    )

    return {
        "success": True,
        "message": f"${request.amount:,.2f} added to wallet",
        "previous_balance": wallets[0]["balance"],
        "new_balance": new_balance
    }


@router.get("/stats")
async def get_trading_stats(current_user: dict = Depends(get_current_user)):
    """Get trading statistics"""
    user_id = get_user_id(current_user)

    # Get all closed positions
    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = 'closed'",
        (user_id,)
    )

    if not positions:
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0,
            "total_pnl": 0,
            "best_trade": 0,
            "worst_trade": 0,
            "avg_pnl": 0
        }

    pnls = [p.get("realized_pnl", 0) or 0 for p in positions]
    winning = [p for p in pnls if p > 0]
    losing = [p for p in pnls if p < 0]

    return {
        "total_trades": len(positions),
        "winning_trades": len(winning),
        "losing_trades": len(losing),
        "win_rate": round(len(winning) / len(positions) * 100, 1) if positions else 0,
        "total_pnl": round(sum(pnls), 2),
        "best_trade": round(max(pnls), 2) if pnls else 0,
        "worst_trade": round(min(pnls), 2) if pnls else 0,
        "avg_pnl": round(sum(pnls) / len(pnls), 2) if pnls else 0
    }
