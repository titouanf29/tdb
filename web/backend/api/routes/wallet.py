"""
Wallet routes - Synchronized with Telegram bot
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()


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
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (current_user["telegram_id"],)
    )

    if not wallets:
        # Create default wallet
        await execute_write(
            """INSERT INTO wallet (user_id, balance, currency, created_at)
               VALUES (?, 10000.0, 'USD', ?)""",
            (current_user["telegram_id"], datetime.utcnow().isoformat())
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
        (current_user["telegram_id"],)
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
    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
        (current_user["telegram_id"], status)
    )

    # Update current prices for open positions
    if status == "open":
        import yfinance as yf
        for pos in positions:
            try:
                ticker = yf.Ticker(pos["symbol"])
                current_price = ticker.fast_info.last_price or 0

                # Calculate P&L
                entry_price = pos["entry_price"]
                quantity = pos["quantity"]
                direction = pos["direction"]

                if direction == "LONG":
                    pnl = (current_price - entry_price) * quantity
                else:
                    pnl = (entry_price - current_price) * quantity

                pnl_percent = (pnl / (entry_price * quantity)) * 100 if entry_price else 0

                pos["current_price"] = round(current_price, 2)
                pos["unrealized_pnl"] = round(pnl, 2)
                pos["pnl_percent"] = round(pnl_percent, 2)
            except Exception:
                pos["current_price"] = pos["entry_price"]
                pos["unrealized_pnl"] = 0
                pos["pnl_percent"] = 0

    return {"positions": positions}


@router.post("/positions/open")
async def open_position(
    request: OpenPositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Open a new trading position"""
    import yfinance as yf

    # Get current price
    try:
        ticker = yf.Ticker(request.symbol)
        current_price = ticker.fast_info.last_price
        if not current_price:
            raise HTTPException(status_code=400, detail="Cannot get price for symbol")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid symbol: {str(e)}")

    # Check balance
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (current_user["telegram_id"],)
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
        (current_user["telegram_id"], request.symbol, request.direction.upper(),
         current_price, quantity, request.amount, request.leverage,
         request.take_profit, request.stop_loss, datetime.utcnow().isoformat())
    )

    # Deduct from balance
    new_balance = wallets[0]["balance"] - request.amount
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, current_user["telegram_id"])
    )

    return {
        "success": True,
        "message": f"Position opened: {request.direction} {request.symbol}",
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
    import yfinance as yf

    # Get position
    positions = await execute_query(
        "SELECT * FROM positions WHERE id = ? AND user_id = ? AND status = 'open'",
        (request.position_id, current_user["telegram_id"])
    )

    if not positions:
        raise HTTPException(status_code=404, detail="Position not found")

    position = positions[0]

    # Get current price
    try:
        ticker = yf.Ticker(position["symbol"])
        exit_price = ticker.fast_info.last_price
    except Exception:
        exit_price = position["entry_price"]

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
        (exit_price, pnl, datetime.utcnow().isoformat(), request.position_id)
    )

    # Update balance
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (current_user["telegram_id"],)
    )

    new_balance = wallets[0]["balance"] + position["amount"] + pnl
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, current_user["telegram_id"])
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
    positions = await execute_query(
        """SELECT * FROM positions
           WHERE user_id = ? AND status = 'closed'
           ORDER BY closed_at DESC
           LIMIT ?""",
        (current_user["telegram_id"], limit)
    )

    return {"history": positions}


@router.get("/stats")
async def get_trading_stats(current_user: dict = Depends(get_current_user)):
    """Get trading statistics"""
    # Get all closed positions
    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = 'closed'",
        (current_user["telegram_id"],)
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
