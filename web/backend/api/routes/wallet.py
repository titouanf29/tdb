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
from .market import SYMBOL_NAMES
from ._trade_review import review as review_trade, _fmt as fmt_price, _eur as fmt_eur
from . import _turbo

router = APIRouter()


def get_user_id(user: dict) -> str:
    """Get unified user ID for database queries"""
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


class OpenPositionRequest(BaseModel):
    symbol: str
    direction: str  # "LONG" or "SHORT"
    amount: float = 0
    leverage: float = 1
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    # « cfd » : un montant × un levier. « turbo » : un nombre entier de
    # titres d'un produit à barrière (voir _turbo.py). Sans précision, le
    # mode enregistré dans les réglages de l'utilisateur s'applique.
    instrument: Optional[str] = None
    unites: Optional[int] = None


class ClosePositionRequest(BaseModel):
    position_id: int


async def _trading_style(numeric_id) -> str:
    """L'horizon déclaré, qui change ce qu'on a le droit de reprocher au trade.

    Tenir trois jours n'a pas le même sens en scalping et en long terme.
    """
    try:
        rows = await execute_query(
            "SELECT trading_style FROM web_user_settings WHERE user_id = ?", (numeric_id,)
        )
        if rows and rows[0].get("trading_style"):
            return str(rows[0]["trading_style"])
    except Exception:
        pass
    return "day"


async def _notify(numeric_id, type_: str, title: str, message: str, link: str) -> None:
    """Une notification dans le fil de l'utilisateur.

    Une position fermée par son stop l'est SANS lui, souvent la nuit. Sans
    cette ligne, il découvrait la clôture en rouvrant son wallet, sans savoir
    quand ni pourquoi. Un échec d'écriture ne doit jamais faire échouer la
    clôture elle-même : le trade est déjà fermé et le solde déjà crédité.
    """
    try:
        await execute_write(
            """INSERT INTO user_notifications (user_id, type, title, message, link, is_read, created_at)
               VALUES (?, ?, ?, ?, ?, 0, ?)""",
            (numeric_id, type_, title, message, link,
             datetime.now(timezone.utc).isoformat()),
        )
    except Exception as exc:
        print(f"[wallet] notification non écrite : {exc}")


async def _journal_trace(user_id, rev: dict) -> None:
    """La trace au journal, écrite d'office pour une clôture automatique.

    À la clôture manuelle, on PROPOSE d'écrire et l'utilisateur complète. Sur
    un stop touché il n'est pas là, et c'est justement le trade dont on
    apprend le plus. L'entrée est donc créée sans lui, avec les faits et le
    constat ; il n'aura qu'à ajouter ce que lui seul sait.
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        await execute_write(
            """INSERT INTO trading_journal
               (user_id, symbol, direction, timeframe, setup,
                entry_time, exit_time, entry_price, exit_price, quantity,
                risk_reward, result, pnl,
                pre_trade_notes, post_trade_notes, screenshot,
                created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, rev["symbol"], rev["direction"], None,
             "stop" if rev["closed_by"] == "stop_loss" else "objectif",
             rev["entry_time"], rev["exit_time"],
             rev["entry_price"], rev["exit_price"], rev["quantity"],
             rev["risk_reward"], rev["result"], rev["pnl"],
             rev["pre_trade_notes"], rev["post_trade_notes"], None,
             now, now),
        )
    except Exception as exc:
        print(f"[wallet] trace de journal non écrite : {exc}")


async def _execute_levels(user_id, positions: list, numeric_id=None) -> list:
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

        # Le niveau qui arrête la perte, en descendant pour un achat et en
        # montant pour une vente : le stop s'il existe, la liquidation
        # toujours, et c'est le PLUS PROCHE de l'entrée qui est touché en
        # premier. Un stop placé au-delà de la liquidation — ce qui arrive dès
        # qu'on met un stop à 15 % avec un levier ×10 — ne sera donc jamais
        # atteint : le courtier ferme avant.
        liq = niveau_de_sortie_forcee(pos)

        hit, level = None, None
        if direction == "LONG":
            arret = max([x for x in (sl, liq) if x is not None], default=None)
            if arret is not None and quote <= arret:
                hit, level = ("stop_loss" if arret == sl else "liquidation"), arret
            elif tp is not None and quote >= tp:
                hit, level = "take_profit", tp
        else:
            arret = min([x for x in (sl, liq) if x is not None], default=None)
            if arret is not None and quote >= arret:
                hit, level = ("stop_loss" if arret == sl else "liquidation"), arret
            elif tp is not None and quote <= tp:
                hit, level = "take_profit", tp

        if not hit:
            continue

        amount = pos.get("amount") or 0
        brut = resultat_brut(pos, level)
        sortie = frais_de_sortie(pos, brut)
        # Le résultat net : ce que le trade a vraiment rapporté ou coûté, frais
        # d'achat et de vente compris.
        realized = brut - float(pos.get("frais_payes") or 0) - sortie

        # Le capital engagé revient, augmenté ou diminué du résultat. Une
        # position ne peut pas rendre moins que zéro : au-delà, le simulateur
        # laisserait un solde négatif que rien ne permet de rattraper.
        credit = max(0.0, amount + brut - sortie)

        await execute_write(
            """UPDATE positions
               SET status = 'closed', exit_price = ?, realized_pnl = ?,
                   closed_at = ?, frais_payes = COALESCE(frais_payes, 0) + ?
               WHERE id = ? AND status = 'open'""",
            (_px(level), round(realized, 4), now, sortie, pos["id"]),
        )

        # ── QUI A REELLEMENT FERME LA POSITION ? ─────────────────────────
        #
        # L'écran appelle /balance ET /positions en parallèle, et les deux
        # exécutent les niveaux. Le « AND status = 'open' » garantit qu'un
        # seul UPDATE porte, mais RIEN ne vérifiait lequel : les deux appels
        # créditaient le solde, envoyaient une notification et écrivaient au
        # journal. Constaté à l'écran : deux notifications identiques « Stop
        # touché sur TRX-USD », à la même seconde, pour une seule position.
        #
        # L'horodatage sert de jeton : deux appels concurrents écrivent des
        # instants différents à la microseconde près, donc un seul se
        # reconnaît dans la valeur finalement enregistrée. Le perdant n'a rien
        # à faire — la position est fermée, et bien fermée.
        verif = await execute_query(
            "SELECT closed_at FROM positions WHERE id = ?", (pos["id"],)
        )
        if not verif or str(verif[0].get("closed_at")) != now:
            pos["status"] = "closed"
            continue

        await execute_write(
            "UPDATE wallet SET balance = balance + ? WHERE user_id = ?",
            (round(credit, 4), user_id),
        )
        pos["status"] = "closed"
        pos["closed_by"] = hit

        # ── La trace, et l'avertissement ─────────────────────────────────
        #
        # Jusqu'ici la position se fermait en silence. L'utilisateur n'était
        # pas là — c'est le principe d'un stop — et retrouvait plus tard une
        # ligne disparue de son wallet, sans savoir quand ni à quel prix.
        # Le trade dont on apprend le plus était le seul qui ne racontait
        # rien.
        rev = None
        if numeric_id is not None:
            try:
                style = await _trading_style(numeric_id)
                rev = review_trade(pos, float(level), float(realized),
                                   style=style, closed_by=hit)
                gagnant = realized >= 0
                titre = (f"Objectif atteint sur {pos['symbol']}" if hit == "take_profit"
                         else f"Turbo désactivé sur {pos['symbol']}"
                         if hit == "liquidation" and pos.get("instrument") == "turbo"
                         else f"Position liquidée sur {pos['symbol']}" if hit == "liquidation"
                         else f"Stop touché sur {pos['symbol']}")
                # Virgule décimale : un message qui dit « 0.3521 · -42.86 € »
                # n'est pas du français, et c'est la faute qui revient le plus
                # souvent dès qu'un nombre est mis dans une phrase.
                await _notify(
                    numeric_id, "position_closed", titre,
                    (f"Le cours a touché la barrière du turbo à {fmt_price(level)} · "
                     f"{fmt_eur(realized)}. Le produit est désactivé : il ne vaut plus rien, "
                     "c'est le risque propre aux turbos."
                     if hit == "liquidation" and pos.get("instrument") == "turbo" else
                     f"Le levier ×{pos.get('leverage')} a consommé toute la marge à "
                     f"{fmt_price(level)} · {fmt_eur(realized)}. La position a été fermée "
                     "d'office : c'est ce qu'un courtier appelle un appel de marge."
                     if hit == "liquidation" else
                     f"Position clôturée automatiquement à {fmt_price(level)} · "
                     f"{'+' if gagnant else ''}{fmt_eur(realized)}. "
                     "Le trade est déjà noté dans votre journal."),
                    "/journal",
                )
                await _journal_trace(user_id, rev)
            except Exception as exc:
                # Ni la notification ni la trace ne peuvent faire échouer une
                # clôture : la position est fermée et le solde crédité.
                print(f"[wallet] suivi de clôture automatique : {exc}")

        closed.append({
            "id": pos["id"],
            "symbol": pos["symbol"],
            "reason": hit,
            "exit_price": _px(level),
            "realized_pnl": round(realized, 4),
            "review": rev,
        })

    return closed


def niveau_de_sortie_forcee(pos: dict) -> float | None:
    """Le cours auquel la position est fermée d'office, quel que soit le produit.

    CFD : la liquidation, quand la perte a mangé la marge. Turbo : la
    barrière désactivante, fixée à l'achat et écrite sur le produit.
    """
    if (pos.get("instrument") or "cfd") == "turbo" and pos.get("barriere"):
        return float(pos["barriere"])
    return prix_de_liquidation(pos.get("entry_price"), pos.get("direction"),
                               pos.get("leverage"))


def resultat_brut(pos: dict, cours: float) -> float:
    """Le gain ou la perte au cours donné, AVANT frais de courtage.

    CFD : le mouvement × la quantité, jamais pire que la marge engagée.
    Turbo : ce que valent les titres (jamais moins que zéro) moins ce qu'ils
    ont coûté. L'écart d'achat — un tick par titre — y est donc compté, comme
    chez un vrai émetteur.
    """
    direction = (pos.get("direction") or "LONG").upper()
    amount = float(pos.get("amount") or 0)
    if (pos.get("instrument") or "cfd") == "turbo" and pos.get("barriere"):
        exercice = float(pos["barriere"])
        ecart = (cours - exercice) if direction == "LONG" else (exercice - cours)
        valeur = max(0.0, ecart) * float(pos.get("parite") or 0) * int(pos.get("unites") or 0)
        return valeur - amount
    entry = float(pos["entry_price"])
    move = (cours - entry) if direction == "LONG" else (entry - cours)
    pnl = move * float(pos["quantity"])
    return max(pnl, -amount) if amount else pnl


def frais_de_sortie(pos: dict, brut: float) -> float:
    """Les frais d'un ordre de vente. Un turbo désactivé ne se vend pas : il
    n'y a pas d'ordre, donc pas de frais — et on ne facture jamais plus que
    ce que la position rend."""
    frais = float(pos.get("frais_ordre") or 0)
    rendu = float(pos.get("amount") or 0) + brut
    return round(min(frais, max(0.0, rendu)), 4)


def prix_de_liquidation(entry: float, direction: str, leverage: float) -> float | None:
    """Le cours auquel la perte a mangé toute la marge.

    C'EST LA SEULE CHOSE QUE LE LEVIER FAIT VRAIMENT, et elle n'était modélisée
    nulle part. Avec un levier ×10, une baisse de 10 % efface la totalité du
    capital engagé : à ce cours-là, un courtier ferme la position d'office.
    Ici, la position restait ouverte et continuait de perdre — un compte
    pouvait donc afficher −10 000 € après une baisse de 20 %, ce qu'aucun
    compte à levier ne permet.

    Le calcul est exact, pas prudentiel : la quantité vaut marge × levier ÷
    entrée, donc un mouvement de entrée ÷ levier contre soi rend exactement
    la marge. À levier 1, un achat ne se liquide qu'à zéro — ce qui est la
    réalité d'un achat comptant, et c'est pourquoi la fonction rend None.
    """
    try:
        lev = float(leverage or 1)
        entry = float(entry)
    except (TypeError, ValueError):
        return None
    if lev <= 1 or entry <= 0:
        return None
    ecart = entry / lev
    return entry - ecart if (direction or "LONG").upper() == "LONG" else entry + ecart


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


def _decrire_turbo(pos: dict, cours: float) -> None:
    """Ce qu'un écran de courtier affiche pour un turbo : le prix d'un titre
    maintenant, le levier du moment, et la distance à la barrière."""
    barriere = float(pos["barriere"])
    long = (pos.get("direction") or "LONG").upper() == "LONG"
    ecart = (cours - barriere) if long else (barriere - cours)
    pos["prix_titre_actuel"] = round(max(0.0, ecart) * float(pos.get("parite") or 0), 4)
    pos["levier_actuel"] = round(cours / ecart, 2) if ecart > 0 else None
    pos["distance_barriere_pct"] = round(ecart / cours * 100, 2) if cours else None


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

        brut = resultat_brut(pos, quote)
        # Le résultat affiché compte les frais déjà payés à l'achat : c'est ce
        # que l'utilisateur gagnerait (hors frais de vente) en vendant maintenant.
        frais_entree = float(pos.get("frais_payes") or 0)
        pnl = brut - frais_entree

        # The percentage is measured against the sum actually committed, not
        # the notional. Since the open route folds leverage into the quantity,
        # entry x quantity IS amount x leverage — dividing by it made a 5x
        # position report a fifth of its own percentage.
        engage = invested + frais_entree
        pnl_percent = (pnl / engage * 100) if engage else 0.0

        pos["price_available"] = True
        # Six decimals: rounding to the cent turns a crypto quoted at
        # 0.00001234 into 0.00.
        pos["current_price"] = round(quote, 6)
        pos["unrealized_pnl"] = round(pnl, 4)
        pos["pnl_percent"] = round(pnl_percent, 2)
        pos["day_change_percent"] = p.get("change")
        # What the position is worth now: what was put in, plus what it made.
        # Les frais d'achat sont déjà sortis du solde : ils ne comptent pas ici.
        pos["current_value"] = round(max(0.0, invested + brut), 4)
        if pos.get("instrument") == "turbo":
            _decrire_turbo(pos, quote)

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
        "SELECT * FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
        (user_id,)
    )

    await _price_positions(positions)
    # Le tableau de bord lit le solde sans passer par /positions : sans cet
    # appel, un stop touché ne serait exécuté que le jour où l'utilisateur
    # ouvre son wallet.
    await _execute_levels(user_id, positions, current_user.get("id"))
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
        "SELECT * FROM positions WHERE user_id = ? AND status = ? AND (archived IS NULL OR archived = 0) ORDER BY created_at DESC",
        (user_id, status)
    )

    triggered = []
    if status == "open":
        await _price_positions(positions)
        # Les niveaux s'exécutent ici, au moment où l'utilisateur regarde.
        triggered = await _execute_levels(user_id, positions, current_user.get("id"))
        # Une position qui vient d'être fermée ne fait plus partie des
        # positions ouvertes : la renvoyer laisserait l'écran l'afficher une
        # dernière fois avec un P&L qui n'existe plus.
        positions = [p for p in positions if p.get("status") == "open"]

    # Le nom lisible de l'actif. Sans lui, tout écran qui parle d'une position
    # ne peut que citer son code : « Revoyez votre position sur CL=F ».
    for p in positions:
        p["name"] = SYMBOL_NAMES.get(p.get("symbol", ""), p.get("symbol", ""))

    return {"positions": positions, "triggered": triggered}


async def _reglages_ordre(current_user: dict) -> tuple[str, float]:
    """Le produit et les frais du courtier réel de l'utilisateur, tels qu'il
    les a enregistrés dans ses réglages. Par défaut : CFD, sans frais."""
    mode, frais = "cfd", 0.0
    if current_user.get("user_type") != "email":
        return mode, frais
    try:
        rows = await execute_query(
            "SELECT order_mode, order_fee FROM web_user_settings WHERE user_id = ?",
            (current_user["id"],),
        )
    except Exception:
        rows = []
    if rows:
        if rows[0].get("order_mode") in ("cfd", "turbo"):
            mode = rows[0]["order_mode"]
        try:
            frais = max(0.0, min(50.0, float(str(rows[0].get("order_fee") or 0).replace(",", "."))))
        except ValueError:
            frais = 0.0
    return mode, frais


def _devis_turbo(cours: float, direction: str, levier: float,
                 montant: float = 0, unites: Optional[int] = None,
                 frais: float = 0.0) -> dict:
    """Le turbo proposé, et ce que coûte l'ordre, titre par titre."""
    c = _turbo.conditions(cours, direction, levier)
    n = int(unites) if unites is not None else _turbo.titres_pour(montant, c["prix_titre"])
    cout = round(n * c["prix_titre"], 2)
    return {
        **c,
        "cours": cours,
        "unites": n,
        "cout_titres": cout,
        "frais": round(frais, 2),
        "total": round(cout + frais, 2),
        # Ce qu'on contrôle vraiment : la valeur du sous-jacent derrière les titres.
        "exposition": round(n * c["parite"] * cours, 2),
        "perte_maxi": round(cout + frais, 2),
        "montant_non_investi": round(max(0.0, montant - cout), 2) if unites is None else 0.0,
    }


@router.get("/turbo/devis")
async def devis_turbo(
    symbol: str,
    direction: str = "LONG",
    levier: float = 5,
    montant: float = 0,
    unites: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    """Ce qu'un courtier à turbos proposerait pour ce trade, avant de le passer."""
    from .market import _fetch_quote_data

    if direction.upper() not in ("LONG", "SHORT"):
        raise HTTPException(status_code=400, detail="Sens invalide : LONG ou SHORT.")
    if unites is not None and not (1 <= unites <= 1_000_000):
        raise HTTPException(status_code=400, detail="Nombre de titres invalide.")
    quote = await _fetch_quote_data(symbol.upper())
    cours = quote.get("price") if quote else None
    if not cours:
        raise HTTPException(status_code=400, detail=f"Cours de {symbol.upper()} indisponible.")
    _, frais = await _reglages_ordre(current_user)
    return _devis_turbo(float(cours), direction.upper(), levier,
                        montant=max(0.0, montant), unites=unites, frais=frais)


@router.post("/positions/open")
async def open_position(
    request: OpenPositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Open a new trading position"""
    from .market import _fetch_quote_data

    user_id = get_user_id(current_user)
    direction = (request.direction or "").upper()
    if direction not in ("LONG", "SHORT"):
        raise HTTPException(status_code=400, detail="Sens invalide : LONG ou SHORT.")

    mode_defaut, frais = await _reglages_ordre(current_user)
    instrument = (request.instrument or mode_defaut).lower()
    if instrument not in ("cfd", "turbo"):
        raise HTTPException(status_code=400, detail="Produit invalide : cfd ou turbo.")

    # Check positions limit
    limits = await get_user_limits(current_user)
    max_positions = limits.get("max_positions", 5)

    open_positions = await execute_query(
        "SELECT COUNT(*) as count FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
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
    solde = float(wallets[0]["balance"]) if wallets else 0.0

    # A stop on the wrong side of the entry is not a stop, and a target on the
    # wrong side is already reached. Nothing rejected these, so impossible
    # positions could be stored and then shown as if they were plans.
    _validate_levels(direction, current_price,
                     request.stop_loss, request.take_profit)

    turbo = None
    if instrument == "turbo":
        # Le turbo est recalculé au cours d'exécution : entre le devis et
        # l'ordre, le cours a pu bouger, comme chez un vrai courtier.
        if request.unites is not None and not (1 <= request.unites <= 1_000_000):
            raise HTTPException(status_code=400, detail="Nombre de titres invalide.")
        turbo = _devis_turbo(float(current_price), direction, request.leverage,
                             montant=max(0.0, request.amount or 0),
                             unites=request.unites, frais=frais)
        if turbo["unites"] < 1:
            raise HTTPException(
                status_code=400,
                detail=f"Montant trop faible : un titre coûte {_turbo.prix_titre_fr(turbo['prix_titre'])}.",
            )
        montant = turbo["cout_titres"]
        levier = int(round(turbo["levier"]))
        quantity = turbo["unites"] * turbo["parite"]
        # Un stop au-delà de la barrière ne servirait à rien : le produit
        # serait désactivé avant. Mieux vaut le dire que l'enregistrer.
        sl = request.stop_loss
        if sl is not None and ((direction == "LONG" and sl <= turbo["barriere"])
                               or (direction == "SHORT" and sl >= turbo["barriere"])):
            raise HTTPException(
                status_code=400,
                detail=(f"Ce stop est au-delà de la barrière ({fmt_price(turbo['barriere'])}) : "
                        "le turbo serait désactivé avant de l'atteindre."),
            )
    else:
        montant = float(request.amount or 0)
        levier = int(round(request.leverage or 1))
        if montant <= 0:
            raise HTTPException(status_code=400, detail="Le montant doit être positif.")
        if not (1 <= levier <= 100):
            raise HTTPException(status_code=400, detail="Levier invalide (1 à 100).")
        quantity = (montant * levier) / current_price

    total = montant + frais
    if solde < total:
        raise HTTPException(
            status_code=400,
            detail=(f"Solde insuffisant : il faut {fmt_eur(total)}"
                    + (f" (dont {fmt_eur(frais)} de frais)" if frais else "")
                    + f", le solde est de {fmt_eur(solde)}."),
        )

    # Create position
    await execute_write(
        """INSERT INTO positions
           (user_id, symbol, direction, entry_price, quantity, amount, leverage,
            take_profit, stop_loss, status, created_at,
            instrument, unites, prix_unitaire, parite, barriere, frais_ordre, frais_payes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, symbol, direction,
         current_price, quantity, montant, levier,
         request.take_profit, request.stop_loss, datetime.now(timezone.utc).isoformat(),
         instrument,
         turbo["unites"] if turbo else None,
         turbo["prix_titre"] if turbo else None,
         turbo["parite"] if turbo else None,
         turbo["barriere"] if turbo else None,
         frais, frais)
    )

    # Deduct from balance
    new_balance = solde - total
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, user_id)
    )

    return {
        "success": True,
        "message": (f"{turbo['unites']} titres achetés : turbo {direction} {symbol}"
                    if turbo else f"Position opened: {direction} {symbol}"),
        "instrument": instrument,
        "entry_price": round(current_price, 2),
        "quantity": round(quantity, 6),
        "turbo": turbo,
        "frais": frais,
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
    direction = position["direction"]
    amount = float(position.get("amount") or 0)

    # ── LA MÊME LIMITE QUE SUR LA CLÔTURE AUTOMATIQUE ──────────────────────
    #
    # Les deux chemins de sortie ne disaient pas la même chose du même trade.
    # La clôture automatique plafonne la perte à la marge engagée
    # (`credit = max(0, amount + realized)`), la clôture manuelle non : elle
    # créditait `solde + marge + pnl` sans plancher. Mesuré sur les règles
    # telles qu'écrites, un achat ×10 sur une baisse de 20 %, tout le solde
    # engagé : 0 € par le stop, −10 000 € par le bouton « Clôturer ». Un solde
    # négatif que rien ne permet ensuite de rattraper.
    #
    # La sortie est donc ramenée au prix de liquidation quand le cours l'a
    # dépassé : c'est le prix auquel un courtier aurait fermé, et le seul qui
    # rende les deux chemins cohérents.
    liq = niveau_de_sortie_forcee(position)
    liquidee = False
    if liq is not None:
        if direction == "LONG" and exit_price <= liq:
            exit_price, liquidee = liq, True
        elif direction != "LONG" and exit_price >= liq:
            exit_price, liquidee = liq, True

    # Ceinture et bretelles : même sans levier, le crédit ne descend pas sous
    # zéro. Une position ne peut pas rendre moins que rien.
    brut = resultat_brut(position, exit_price)
    sortie = frais_de_sortie(position, brut)
    frais_entree = float(position.get("frais_payes") or 0)
    pnl = brut - frais_entree - sortie

    # Update position
    await execute_write(
        """UPDATE positions
           SET status = 'closed', exit_price = ?, realized_pnl = ?, closed_at = ?,
               frais_payes = COALESCE(frais_payes, 0) + ?
           WHERE id = ?""",
        (exit_price, pnl, datetime.now(timezone.utc).isoformat(), sortie, request.position_id)
    )

    # Update balance
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (user_id,)
    )

    new_balance = wallets[0]["balance"] + max(0.0, amount + brut - sortie)
    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, user_id)
    )

    # Le même jugement que sur une clôture automatique, produit au même
    # endroit. L'écrire une seconde fois côté interface aurait garanti qu'au
    # premier ajustement les deux versions disent des choses différentes du
    # même trade.
    rev = None
    try:
        style = await _trading_style(current_user.get("id"))
        rev = review_trade(position, float(exit_price), float(pnl), style=style,
                           closed_by="liquidation" if liquidee else None)
    except Exception as exc:
        print(f"[wallet] bilan de clôture : {exc}")

    return {
        "success": True,
        "message": f"Position closed: {position['symbol']}",
        "liquidated": liquidee,
        "review": rev,
        "exit_price": _px(exit_price),
        "realized_pnl": round(pnl, 2),
        "frais": round(frais_entree + sortie, 2),
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
             AND (archived IS NULL OR archived = 0)
           ORDER BY closed_at DESC
           LIMIT ?""",
        (user_id, limit)
    )

    return {"history": positions}


@router.get("/history/by-symbol")
async def get_history_by_symbol(current_user: dict = Depends(get_current_user)):
    """Le bilan de chaque actif tradé, et pas seulement la liste des trades.

    L'historique est une suite de lignes classées par date. On y voit ce qu'on
    a fait, jamais SUR QUOI on gagne ou on perd. Or c'est la seule question
    que l'historique peut réellement trancher : quinze trades sur le même
    actif avec un résultat cumulé négatif est un fait, pas une impression, et
    il ne se lit sur aucune ligne prise isolément.

    Les agrégats sont calculés ici plutôt que côté interface : celle-ci ne
    reçoit que les cinquante derniers trades et compterait donc sur un
    échantillon tronqué — un bilan faux, et faux sans le dire.
    """
    user_id = get_user_id(current_user)
    rows = await execute_query(
        """SELECT symbol, direction, leverage, amount, realized_pnl,
                  created_at, closed_at
           FROM positions
           WHERE user_id = ? AND status = 'closed'
             AND (archived IS NULL OR archived = 0)""",
        (user_id,),
    )

    par_actif: dict[str, dict] = {}
    for r in rows or []:
        sym = r["symbol"]
        pnl = float(r.get("realized_pnl") or 0)
        amount = float(r.get("amount") or 0)
        a = par_actif.setdefault(sym, {
            "symbol": sym, "trades": 0, "wins": 0, "losses": 0, "breakeven": 0,
            "pnl": 0.0, "engaged": 0.0, "best": None, "worst": None,
            "long": 0, "short": 0, "held_minutes": 0.0, "held_n": 0,
            "last_closed_at": None,
        })
        a["trades"] += 1
        a["pnl"] += pnl
        a["engaged"] += amount
        if pnl > 0:
            a["wins"] += 1
        elif pnl < 0:
            a["losses"] += 1
        else:
            a["breakeven"] += 1
        a["best"] = pnl if a["best"] is None else max(a["best"], pnl)
        a["worst"] = pnl if a["worst"] is None else min(a["worst"], pnl)
        if (r.get("direction") or "LONG").upper() == "LONG":
            a["long"] += 1
        else:
            a["short"] += 1

        mins = _held_minutes_between(r.get("created_at"), r.get("closed_at"))
        if mins is not None:
            a["held_minutes"] += mins
            a["held_n"] += 1

        closed = r.get("closed_at")
        if closed and (a["last_closed_at"] is None or str(closed) > str(a["last_closed_at"])):
            a["last_closed_at"] = closed

    out = []
    for a in par_actif.values():
        t = a["trades"]
        out.append({
            "symbol": a["symbol"],
            "trades": t,
            "wins": a["wins"],
            "losses": a["losses"],
            "breakeven": a["breakeven"],
            # Le taux de réussite ignore les trades nuls : les compter comme
            # des échecs punirait une sortie à l'équilibre, qui n'en est pas un.
            "win_rate": round(a["wins"] / (a["wins"] + a["losses"]) * 100, 1)
                        if (a["wins"] + a["losses"]) else None,
            "pnl": round(a["pnl"], 2),
            "avg_pnl": round(a["pnl"] / t, 2) if t else 0.0,
            # Le rendement rapporté au capital réellement immobilisé. Deux
            # actifs au même résultat en euros ne se valent pas si l'un a
            # mobilisé dix fois plus.
            "return_pct": round(a["pnl"] / a["engaged"] * 100, 2) if a["engaged"] else None,
            "engaged": round(a["engaged"], 2),
            "best": round(a["best"], 2) if a["best"] is not None else None,
            "worst": round(a["worst"], 2) if a["worst"] is not None else None,
            "long": a["long"],
            "short": a["short"],
            "avg_held_minutes": round(a["held_minutes"] / a["held_n"]) if a["held_n"] else None,
            "last_closed_at": a["last_closed_at"],
        })

    # Du plus coûteux au plus rentable : ce qu'on doit regarder en premier est
    # ce qui perd, pas ce qui gagne.
    out.sort(key=lambda x: x["pnl"])
    return {
        "by_symbol": out,
        "total_trades": sum(x["trades"] for x in out),
        "total_pnl": round(sum(x["pnl"] for x in out), 2),
    }


def _held_minutes_between(opened, closed) -> float | None:
    """Durée de détention, en minutes, ou None si les dates sont inexploitables."""
    if not opened or not closed:
        return None
    try:
        a = datetime.fromisoformat(str(opened).replace("Z", "+00:00"))
        b = datetime.fromisoformat(str(closed).replace("Z", "+00:00"))
    except ValueError:
        return None
    if a.tzinfo is None:
        a = a.replace(tzinfo=timezone.utc)
    if b.tzinfo is None:
        b = b.replace(tzinfo=timezone.utc)
    delta = (b - a).total_seconds() / 60.0
    return delta if delta >= 0 else None


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


class SetBalanceRequest(BaseModel):
    """`amount` absent = le capital de départ. C'est le bouton « remettre à
    10 000 € » : il ne doit pas avoir à connaître le chiffre, sans quoi
    l'interface et le serveur finiront par ne plus dire le même."""
    amount: Optional[float] = None


@router.post("/add-funds")
async def add_funds_to_wallet(
    request: AddFundsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Créditer ou RETIRER de l'argent virtuel du compte d'entraînement.

    Un montant négatif retire. Le retrait manquait, et son absence avait une
    conséquence concrète : un compte dont le solde avait dérapé ne pouvait
    aller que vers le haut. La seule sortie était « Recommencer », qui archive
    aussi tout l'historique — une réponse bien trop large à « j'ai 200 € de
    trop ».

    Le solde ne peut pas devenir négatif : ce n'est pas un découvert, c'est
    un simulateur, et un solde négatif n'y veut rien dire.
    """
    if request.amount == 0:
        raise HTTPException(status_code=400, detail="Indiquez un montant.")

    if abs(request.amount) > 100000:
        raise HTTPException(status_code=400,
                            detail="Maximum 100 000 $ par opération.")

    user_id = get_user_id(current_user)

    # Get or create wallet
    wallets = await execute_query(
        "SELECT * FROM wallet WHERE user_id = ?",
        (user_id,)
    )

    ancien = wallets[0]["balance"] if wallets else 0.0
    new_balance = ancien + request.amount

    if new_balance < 0:
        dispo = f"{ancien:,.2f}".replace(",", "\u202f").replace(".", ",")
        raise HTTPException(status_code=400, detail=f"Il n'y a que {dispo} $ sur le compte.")

    if not wallets:
        await execute_write(
            """INSERT INTO wallet (user_id, balance, currency, created_at)
               VALUES (?, ?, 'USD', ?)""",
            (user_id, new_balance, datetime.now(timezone.utc).isoformat())
        )
    else:
        await execute_write(
            "UPDATE wallet SET balance = ? WHERE user_id = ?",
            (new_balance, user_id)
        )

    verbe = "retirés du" if request.amount < 0 else "ajoutés au"
    somme = f"{abs(request.amount):,.2f}".replace(",", "\u202f").replace(".", ",")
    return {
        "success": True,
        "message": f"{somme} $ {verbe} compte",
        "previous_balance": ancien,
        "new_balance": new_balance
    }


async def capital_de_depart() -> float:
    """Le capital avec lequel un compte commence.

    Lu dans les réglages d'administration, comme à l'inscription. Deux
    valeurs différentes pour la même promesse, c'est la garantie qu'elles
    divergeront le jour où l'une des deux change.
    """
    try:
        rows = await execute_query(
            "SELECT value FROM admin_settings WHERE key = 'welcome_bonus_amount'"
        )
        if rows:
            return float(rows[0]["value"])
    except Exception:
        pass
    return 10000.0


# Un plafond, et il a une raison précise : au-delà, les sommes affichées
# redeviennent illisibles — c'est exactement le problème que « Recommencer »
# existe pour réparer. Dix millions laissent toute la marge de manœuvre utile
# à un simulateur sans ramener des soldes à neuf chiffres.
SOLDE_MAX = 10_000_000.0


@router.post("/set-balance")
async def set_balance(request: SetBalanceRequest,
                      current_user: dict = Depends(get_current_user)):
    """Poser le solde à une valeur, sans toucher aux positions ni à l'historique.

    La différence avec `/reset` est le seul point qui compte : celle-ci
    remet le COMPTEUR à sa place et laisse tout le reste en l'état, là où
    « Recommencer » archive aussi les trades. Quelqu'un dont le solde a
    dérapé mais qui tient à son historique a besoin de la première, pas de
    la seconde.
    """
    user_id = get_user_id(current_user)
    cible = request.amount if request.amount is not None else await capital_de_depart()

    if cible < 0:
        raise HTTPException(status_code=400, detail="Le solde ne peut pas être négatif.")
    if cible > SOLDE_MAX:
        # Le séparateur de milliers se pose sur le NOMBRE, pas sur la phrase :
        # appliqué à la chaîne entière, `.replace(",", " ")` avait mangé la
        # virgule de « au-delà, les montants ».
        plafond = f"{SOLDE_MAX:,.0f}".replace(",", "\u202f")
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {plafond} $ — au-delà, les montants affichés "
                   "deviennent illisibles.",
        )

    wallets = await execute_query("SELECT * FROM wallet WHERE user_id = ?", (user_id,))
    if wallets:
        await execute_write(
            "UPDATE wallet SET balance = ? WHERE user_id = ?", (cible, user_id)
        )
    else:
        await execute_write(
            "INSERT INTO wallet (user_id, balance, currency, created_at) VALUES (?, ?, 'USD', ?)",
            (user_id, cible, datetime.now(timezone.utc).isoformat()),
        )

    return {"success": True, "balance": cible,
            "previous_balance": wallets[0]["balance"] if wallets else 0.0}


@router.post("/reset")
async def reset_wallet(current_user: dict = Depends(get_current_user)):
    """Repartir du capital de départ, sans rien détruire.

    POURQUOI CE BOUTON EXISTE. Le simulateur autorise à engager tout le solde
    sur une seule position, levier compris. C'est le comportement d'un compte
    à marge et ce n'est pas un bug — mais il compose : avec le levier ×10, une
    suite de trades gagnants à +5 % multiplie le solde par 1,5 à chaque fois.
    Trente-quatre trades suffisent pour passer de 10 000 € à plus de neuf
    milliards. À partir de là, plus un seul nombre de l'application n'est
    lisible ni instructif, et rien, côté utilisateur, ne permettait de
    revenir en arrière : seule une action d'administrateur le pouvait.

    Les positions sont ARCHIVÉES, pas supprimées. Elles disparaissent des
    écrans et des statistiques — leurs montants n'ont plus de rapport avec le
    nouveau compte — mais la trace reste en base, et le journal, qui contient
    les notes écrites par l'utilisateur, n'est pas touché du tout.
    """
    user_id = get_user_id(current_user)

    depart = await capital_de_depart()

    archivees = await execute_query(
        "SELECT COUNT(*) as n FROM positions WHERE user_id = ? "
        "AND (archived IS NULL OR archived = 0)",
        (user_id,),
    )
    n = archivees[0]["n"] if archivees else 0

    await execute_write(
        "UPDATE positions SET archived = 1 WHERE user_id = ?", (user_id,)
    )

    wallets = await execute_query("SELECT * FROM wallet WHERE user_id = ?", (user_id,))
    if wallets:
        await execute_write(
            "UPDATE wallet SET balance = ? WHERE user_id = ?", (depart, user_id)
        )
    else:
        await execute_write(
            "INSERT INTO wallet (user_id, balance, currency, created_at) VALUES (?, ?, 'USD', ?)",
            (user_id, depart, datetime.now(timezone.utc).isoformat()),
        )

    return {"success": True, "balance": depart, "archived": n}


@router.get("/stats")
async def get_trading_stats(current_user: dict = Depends(get_current_user)):
    """Get trading statistics"""
    user_id = get_user_id(current_user)

    # Get all closed positions
    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = 'closed' AND (archived IS NULL OR archived = 0)",
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
