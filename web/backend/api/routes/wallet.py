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


async def _execute_levels(user_id, positions: list) -> list:
    """Close the positions whose stop or target has been reached.

    Until this existed, stop_loss and take_profit were decoration. They were
    validated on the way in — a stop on the wrong side of the entry was
    rejected — and then nothing ever looked at them again. A user could set a
    stop, watch the price fall straight through it, and find the position
    still open and still losing. In a product whose whole purpose is to teach
    risk management, the one mechanism that must be modelled faithfully was
    the one that did nothing.

    The check runs whenever the positions are read, which is whenever the user
    looks at their wallet or their dashboard, and it costs nothing extra: the
    prices have already been fetched by the caller.

    LIMITE ASSUMÉE, et elle est écrite dans l'interface : nous observons le
    cours par instantanés, pas en continu. Une mèche qui traverse le niveau et
    revient entre deux lectures n'est pas vue. La sortie est donc enregistrée
    AU PRIX DU NIVEAU, jamais au cours courant — c'est le comportement d'un
    ordre stop, et cela évite d'inventer une perte plus grande que celle que
    l'utilisateur avait acceptée.
    """
    closed = []
    now = datetime.now(timezone.utc).isoformat()

    for pos in positions:
        if pos.get("status") != "open" or not pos.get("price_available"):
            continue
        quote = pos.get("current_price")
        direction = (pos.get("direction") or "LONG").upper()
        sl, tp = pos.get("stop_loss"), pos.get("take_profit")
        if quote is None:
            continue

        hit, level = None, None
        if direction == "LONG":
            if sl is not None and quote <= sl:
                hit, level = "stop_loss", sl
            elif tp is not None and quote >= tp:
                hit, level = "take_profit", tp
        else:
            if sl is not None and quote >= sl:
                hit, level = "stop_loss", sl
            elif tp is not None and quote <= tp:
                hit, level = "take_profit", tp

        if not hit:
            continue

        entry = pos["entry_price"]
        quantity = pos["quantity"]
        amount = pos.get("amount") or 0
        move = (level - entry) if direction == "LONG" else (entry - level)
        realized = move * quantity

        # Le capital engagé revient, augmenté ou diminué du résultat. Une
        # position ne peut pas rendre moins que zéro : au-delà, le simulateur
        # laisserait un solde négatif que rien ne permet de rattraper.
        credit = max(0.0, amount + realized)

        await execute_write(
            """UPDATE positions
               SET status = 'closed', exit_price = ?, realized_pnl = ?,
                   closed_at = ?
               WHERE id = ? AND status = 'open'""",
            (round(level, 6), round(realized, 4), now, pos["id"]),
        )
        await execute_write(
            "UPDATE wallet SET balance = balance + ? WHERE user_id = ?",
            (round(credit, 4), user_id),
        )
        pos["status"] = "closed"
        pos["closed_by"] = hit
        closed.append({
            "id": pos["id"],
            "symbol": pos["symbol"],
            "reason": hit,
            "exit_price": round(level, 6),
            "realized_pnl": round(realized, 4),
        })

    return closed


def _px(value: float) -> float:
    """Un prix, arrondi selon sa grandeur.

    « round(exit_price, 2) » rendait 0,35 pour un actif à 0,3463 : le journal
    de trade aurait enregistré un prix de sortie faux, et le résultat affiché
    n'aurait pas correspondu au calcul. Mêmes seuils que partout ailleurs.
    """
    v = abs(value)
    if v >= 100:
        d = 2
    elif v >= 1:
        d = 3
    elif v >= 0.01:
        d = 5
    elif v >= 0.0001:
        d = 6
    else:
        d = 8
    return round(value, d)


async def _price_positions(positions: list) -> list:
    """Attach live price, P&L and availability to open positions.

    Shared by /balance and /positions on purpose. The two used to compute this
    separately — and /balance read "current_value" and "unrealized_pnl"
    straight off the database rows, where no such columns exist. Both sums
    were therefore always zero, so the headline figures of the Wallet ignored
    every open position: a user with 700 EUR committed and 100 EUR of profit
    was told their total was their cash balance alone.
    """
    if not positions:
        return positions

    from ._prices import fetch_prices as fetch_prices_safe
    symbols = list({pos["symbol"] for pos in positions})
    prices = await fetch_prices_safe(symbols)

    for pos in positions:
        p = prices.get(pos["symbol"])
        quote = p.get("price") if p else None
        entry_price = pos["entry_price"]
        quantity = pos["quantity"]
        direction = pos["direction"]
        leverage = pos.get("leverage") or 1
        invested = pos.get("amount") or (entry_price * quantity / leverage if entry_price else 0)

        if not quote or not entry_price:
            # No quote: say so rather than substituting the entry price, which
            # reported "0.00" — indistinguishable from a market that had not
            # moved. The committed amount is still known, so the position
            # keeps its weight in the totals at cost.
            pos["price_available"] = False
            pos["current_price"] = None
            pos["unrealized_pnl"] = None
            pos["pnl_percent"] = None
            pos["current_value"] = round(invested, 4)
            continue

        move = (quote - entry_price) if direction == "LONG" else (entry_price - quote)
        pnl = move * quantity

        # The percentage is measured against the sum actually committed, not
        # the notional. Since the open route folds leverage into the quantity,
        # entry x quantity IS amount x leverage — dividing by it made a 5x
        # position report a fifth of its own percentage.
        pnl_percent = (pnl / invested * 100) if invested else 0.0

        pos["price_available"] = True
        # Six decimals: rounding to the cent turns a crypto quoted at
        # 0.00001234 into 0.00.
        pos["current_price"] = round(quote, 6)
        pos["unrealized_pnl"] = round(pnl, 4)
        pos["pnl_percent"] = round(pnl_percent, 2)
        pos["day_change_percent"] = p.get("change")
        # What the position is worth now: what was put in, plus what it made.
        pos["current_value"] = round(invested + pnl, 4)

    return positions


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

    await _price_positions(positions)
    # Le tableau de bord lit le solde sans passer par /positions : sans cet
    # appel, un stop touché ne serait exécuté que le jour où l'utilisateur
    # ouvre son wallet.
    await _execute_levels(user_id, positions)
    positions = [p for p in positions if p.get("status") == "open"]

    # Le solde a pu changer juste au-dessus.
    refreshed = await execute_query("SELECT balance FROM wallet WHERE user_id = ?", (user_id,))
    if refreshed:
        wallet = {**wallet, "balance": refreshed[0]["balance"]}

    positions_value = sum(p.get("current_value") or 0 for p in positions)
    total_pnl = sum(p.get("unrealized_pnl") or 0 for p in positions)

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

    triggered = []
    if status == "open":
        await _price_positions(positions)
        # Les niveaux s'exécutent ici, au moment où l'utilisateur regarde.
        triggered = await _execute_levels(user_id, positions)
        # Une position qui vient d'être fermée ne fait plus partie des
        # positions ouvertes : la renvoyer laisserait l'écran l'afficher une
        # dernière fois avec un P&L qui n'existe plus.
        positions = [p for p in positions if p.get("status") == "open"]

    return {"positions": positions, "triggered": triggered}


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

    # A stop on the wrong side of the entry is not a stop, and a target on the
    # wrong side is already reached. Nothing rejected these, so impossible
    # positions could be stored and then shown as if they were plans.
    _validate_levels(request.direction, current_price,
                     request.stop_loss, request.take_profit)

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
        "exit_price": _px(exit_price),
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


def _validate_levels(direction: str, reference_price: float,
                     stop_loss, take_profit, ref_label: str = "prix d'entrée") -> None:
    """Reject a stop or target sitting on the wrong side of the price.

    A stop above the entry on a LONG protects nothing, and a target below it
    is already reached. Both paths that write these values call this, so the
    two can never drift apart.
    """
    d = (direction or "").upper()
    if stop_loss is not None:
        if d == "LONG" and stop_loss >= reference_price:
            raise HTTPException(status_code=400, detail=(
                f"Stop loss à {stop_loss} au-dessus du {ref_label} ({round(reference_price, 2)}) — "
                "sur un achat, le stop se place en dessous."))
        if d == "SHORT" and stop_loss <= reference_price:
            raise HTTPException(status_code=400, detail=(
                f"Stop loss à {stop_loss} en dessous du {ref_label} ({round(reference_price, 2)}) — "
                "sur une vente, le stop se place au-dessus."))
    if take_profit is not None:
        if d == "LONG" and take_profit <= reference_price:
            raise HTTPException(status_code=400, detail=(
                f"Objectif à {take_profit} en dessous du {ref_label} ({round(reference_price, 2)}) — "
                "sur un achat, l'objectif se place au-dessus."))
        if d == "SHORT" and take_profit >= reference_price:
            raise HTTPException(status_code=400, detail=(
                f"Objectif à {take_profit} au-dessus du {ref_label} ({round(reference_price, 2)}) — "
                "sur une vente, l'objectif se place en dessous."))


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

    _validate_levels(positions[0]["direction"], float(positions[0]["entry_price"]),
                     request.stop_loss, request.take_profit)

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
