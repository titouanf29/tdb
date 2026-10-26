"""« Depuis votre dernière visite » : ce qui s'est passé pendant l'absence.

À chaque visite, l'accueil garde une photo du compte : le résultat latent de
chaque position ouverte, le cours de chaque favori. À la visite suivante,
après une vraie absence, le serveur compare l'état du moment à cette photo et
raconte ce qui a changé :

  · ce que les positions ont gagné ou perdu avec le marché (pas ce que la
    personne a ajouté ou retiré elle-même) ;
  · les positions fermées entre-temps, par un stop, un objectif ou à la main ;
  · les notifications arrivées pendant l'absence (stop touché, alerte,
    proposition de Nimbo, réponse de l'équipe), pour ne pas les rater ;
  · les favoris qui ont le plus bougé ;
  · la série de jours d'affilée.

LA VERSION PRÉCÉDENTE n'était appelée par aucun écran. Elle calculait de plus
le résultat sans levier ni frais (pas celui du wallet), comparait les
positions par symbole (deux positions sur Apple se confondaient), ignorait les
clôtures et les notifications, et écrivait ses phrases avec des tirets
cadratins et des montants en dollars.

La photo n'est remplacée qu'une fois le récapitulatif montré, ou quand la page
signale qu'on la quitte (POST /activity) : un rechargement ne rejoue rien, et
avec un rythme « une fois par jour », l'écart a le temps de s'accumuler.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter

from ..database import execute_query, execute_write
from ..limite import cle_client  # voir limite.py
from .auth import get_current_user
from ._fr import nombre_fr
from ._prices import fetch_prices
# Le wallet et les positions sont rangés sous « web_{id} », les favoris sous
# l'identifiant brut : il faut reprendre exactement les mêmes résolveurs.
from .wallet import get_user_id as _wallet_uid, _price_positions
from .favorites import get_user_id as _fav_uid

router = APIRouter()
limiter = Limiter(key_func=cle_client)

# L'absence minimale avant qu'un récapitulatif vaille la peine.
MIN_GAP_MINUTES = 30
# Un mouvement plus petit n'est pas un mouvement.
MIN_MOVE_PCT = 0.3
MIN_PNL_EUR = 1.0


async def _ensure_table() -> None:
    await execute_write(
        """CREATE TABLE IF NOT EXISTS dashboard_snapshots (
            user_id TEXT PRIMARY KEY,
            snapshot_at TEXT NOT NULL,
            equity REAL NOT NULL DEFAULT 0,
            positions_json TEXT NOT NULL DEFAULT '[]',
            favorites_json TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        )""",
        (),
    )


def _nom(symbole: str) -> str:
    from .market import SYMBOL_NAMES
    return SYMBOL_NAMES.get(symbole, symbole)


def _eur(v: float, signe: bool = True) -> str:
    return f"{nombre_fr(v, 2, signe=signe)} €"


async def _etat(current_user: dict) -> dict:
    """Le compte à l'instant : résultat latent par position (le calcul du
    wallet, levier et frais compris), et cours des favoris."""
    wuid = _wallet_uid(current_user)
    positions = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
        (wuid,)) or []
    await _price_positions(positions)
    favoris = await execute_query("SELECT symbol FROM web_favorites WHERE user_id = ?",
                                  (_fav_uid(current_user),)) or []
    syms = sorted({f["symbol"] for f in favoris})
    cours = await fetch_prices(syms) if syms else {}
    wallet = await execute_query("SELECT balance FROM wallet WHERE user_id = ?", (wuid,))
    solde = float(wallet[0]["balance"]) if wallet else 10000.0
    valeur = sum(float(p.get("current_value") or 0) for p in positions)
    return {
        "equity": round(solde + valeur, 2),
        "positions": [{
            "id": p["id"], "symbol": p["symbol"],
            "pnl": round(float(p["unrealized_pnl"]), 2) if p.get("price_available") else None,
            "price": p.get("current_price"),
        } for p in positions],
        "favorites": [{"symbol": s, "price": float(cours[s]["price"])}
                      for s in syms if (cours.get(s) or {}).get("price")],
    }


async def _photo(user_id, etat: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        """INSERT INTO dashboard_snapshots (user_id, snapshot_at, equity, positions_json, favorites_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             snapshot_at=excluded.snapshot_at, equity=excluded.equity,
             positions_json=excluded.positions_json, favorites_json=excluded.favorites_json,
             updated_at=excluded.updated_at""",
        (str(user_id), now, etat["equity"], json.dumps(etat["positions"]), json.dumps(etat["favorites"]), now),
    )


def duree_absence(minutes: float) -> str:
    """« 45 minutes », « 3 heures », « 2 jours »."""
    if minutes < 90:
        n = max(1, round(minutes))
        return f"{n} minute{'s' if n > 1 else ''}"
    heures = minutes / 60
    if heures < 36:
        n = round(heures)
        return f"{n} heure{'s' if n > 1 else ''}"
    n = round(heures / 24)
    return f"{n} jour{'s' if n > 1 else ''}"


def titre_du_recap(marche: float, marche_pct: float, fermees: list, evenements: int, favoris: list) -> str:
    """La phrase d'en-tête : la chose la plus importante d'abord."""
    if fermees:
        n = len(fermees)
        total = sum(f["realized_pnl"] for f in fermees)
        return (f"{n} position{'s' if n > 1 else ''} fermée{'s' if n > 1 else ''} pendant votre absence, "
                f"{_eur(total)} au total.")
    if abs(marche) >= MIN_PNL_EUR:
        verbe = "gagné" if marche >= 0 else "perdu"
        return f"Vos positions ont {verbe} {_eur(abs(marche), signe=False)} ({nombre_fr(marche_pct, 2, signe=True)} %)."
    if evenements:
        return f"{evenements} notification{'s' if evenements > 1 else ''} pendant votre absence."
    if favoris:
        f = favoris[0]
        return f"{f['nom']} a bougé de {nombre_fr(f['pct'], 1, signe=True)} % depuis votre dernière visite."
    return "Peu de mouvement pendant votre absence."


@router.get("/welcome-back")
@limiter.limit("30/minute")
async def welcome_back(
    request: Request,
    lang: str = Query(default="fr"),
    # L'absence à partir de laquelle on raconte : elle suit le réglage
    # « Récapitulatif de retour » (à chaque visite, une fois par jour, par semaine).
    min_gap_minutes: int = Query(default=MIN_GAP_MINUTES, ge=MIN_GAP_MINUTES, le=43200),
    current_user: dict = Depends(get_current_user),
):
    await _ensure_table()
    user_id = current_user.get("id")
    precedente = await execute_query(
        "SELECT snapshot_at, equity, positions_json, favorites_json FROM dashboard_snapshots WHERE user_id = ?",
        (str(user_id),))
    etat = await _etat(current_user)
    if not precedente:
        await _photo(user_id, etat)
        return {"has_summary": False}

    prev = precedente[0]
    try:
        depuis = datetime.fromisoformat(prev["snapshot_at"])
        if depuis.tzinfo is None:
            depuis = depuis.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        await _photo(user_id, etat)
        return {"has_summary": False}
    absence = (datetime.now(timezone.utc) - depuis).total_seconds() / 60
    if absence < max(MIN_GAP_MINUTES, min_gap_minutes):
        return {"has_summary": False}

    try:
        avant_pos = {p["id"]: p for p in json.loads(prev["positions_json"] or "[]") if "id" in p}
        avant_fav = {f["symbol"]: f for f in json.loads(prev["favorites_json"] or "[]")}
    except (TypeError, ValueError):
        avant_pos, avant_fav = {}, {}

    # Ce que le marché a fait aux positions détenues aux deux moments.
    mouvements = []
    for p in etat["positions"]:
        a = avant_pos.get(p["id"])
        if not a or p["pnl"] is None or a.get("pnl") is None:
            continue
        delta = round(p["pnl"] - a["pnl"], 2)
        base = a.get("price") or 0
        pct = ((p["price"] - base) / base * 100) if base and p.get("price") else 0.0
        if abs(delta) >= MIN_PNL_EUR or abs(pct) >= MIN_MOVE_PCT:
            mouvements.append({"symbol": p["symbol"], "nom": _nom(p["symbol"]),
                               "pnl_delta": delta, "pct": round(pct, 2)})
    mouvements.sort(key=lambda m: -abs(m["pnl_delta"]))
    marche = round(sum(m["pnl_delta"] for m in mouvements), 2)
    equity_avant = float(prev["equity"] or 0)
    marche_pct = (marche / equity_avant * 100) if equity_avant else 0.0

    # Les positions fermées pendant l'absence.
    wuid = _wallet_uid(current_user)
    fermees = [{"symbol": r["symbol"], "nom": _nom(r["symbol"]), "realized_pnl": round(float(r["realized_pnl"] or 0), 2)}
               for r in (await execute_query(
                   "SELECT symbol, realized_pnl FROM positions WHERE user_id = ? AND status = 'closed' AND closed_at > ? "
                   "ORDER BY closed_at DESC", (wuid, depuis.isoformat())) or [])]

    # Les notifications arrivées entre-temps. Les clôtures sont déjà dans
    # « fermées », avec leur résultat : on ne les dit pas deux fois.
    notes = await execute_query(
        "SELECT id, type, title, link, is_read, created_at FROM user_notifications "
        "WHERE user_id = ? AND created_at > ? AND type != 'position_closed' ORDER BY created_at DESC LIMIT 20",
        (user_id, depuis.isoformat())) or []

    # Les favoris qui ont bougé.
    favoris = []
    for f in etat["favorites"]:
        a = avant_fav.get(f["symbol"])
        base = (a or {}).get("price") or 0
        if base:
            pct = (f["price"] - base) / base * 100
            if abs(pct) >= MIN_MOVE_PCT:
                favoris.append({"symbol": f["symbol"], "nom": _nom(f["symbol"]), "pct": round(pct, 2)})
    favoris.sort(key=lambda f: -abs(f["pct"]))

    serie = await execute_query("SELECT streak_days FROM user_progress WHERE user_id = ?", (user_id,))

    if not (mouvements or fermees or notes or favoris):
        # Rien à raconter : la photo reste, l'écart continue de courir.
        return {"has_summary": False}

    await _photo(user_id, etat)
    return {
        "has_summary": True,
        "depuis": depuis.isoformat(),
        "away_minutes": int(absence),
        "away_label": duree_absence(absence),
        "titre": titre_du_recap(marche, marche_pct, fermees, len(notes), favoris),
        "marche": {"change": marche, "change_pct": round(marche_pct, 2)},
        "positions": mouvements[:4],
        "fermees": fermees[:4],
        "notifications": [{"id": n["id"], "type": n["type"], "title": n["title"], "link": n["link"],
                           "is_read": bool(n["is_read"])} for n in notes[:4]],
        "notifications_total": len(notes),
        "favorites": favoris[:4],
        "serie": int(serie[0]["streak_days"] or 0) if serie else 0,
    }


@router.post("/activity")
@limiter.limit("20/minute")
async def record_activity(request: Request, current_user: dict = Depends(get_current_user)):
    """La page signale qu'on la quitte : la photo du moment devient la base de
    la prochaine visite, pour raconter l'absence à partir de là."""
    await _ensure_table()
    await _photo(current_user.get("id"), await _etat(current_user))
    return {"ok": True}
