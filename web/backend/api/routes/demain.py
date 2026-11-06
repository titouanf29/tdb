"""Demain : ce qui attend la personne à la prochaine séance.

L'accueil disait ce qui s'était passé (depuis la dernière visite, le point
du matin) et ce qu'il fallait faire maintenant (la prochaine étape). Rien
ne regardait devant. Or c'est le soir, en préparant le lendemain, qu'on
prend l'habitude de revenir le matin.

Un seul écran, lu par le tableau de bord : la prochaine séance et ses
horaires, les annonces économiques de ce jour-là qui touchent ses marchés,
les plans de Nimbo encore ouverts sur ses favoris, et ses positions qui
passeraient la nuit sans stop. Tout vient de la base et des règles d'ici ;
rien n'est rédigé par un modèle de langage.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from slowapi import Limiter

from ..database import execute_query
from ..limite import cle_client
from ..temps import PARIS
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=cle_client)

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]
SEANCES = [
    {"place": "Paris", "ouvre": "9 h 00", "ferme": "17 h 30"},
    {"place": "New York", "ouvre": "15 h 30", "ferme": "22 h 00"},
]


def prochaine_seance(maintenant: datetime | None = None) -> date:
    """Le prochain jour de semaine après aujourd'hui (heure de Paris)."""
    j = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS).date() + timedelta(days=1)
    while j.weekday() > 4:
        j += timedelta(days=1)
    return j


def libelle(j: date) -> str:
    return f"{JOURS[j.weekday()]} {j.day}{'er' if j.day == 1 else ''} {MOIS[j.month - 1]}"


async def _agenda(user: dict, j: date) -> list[dict]:
    from ..services.macro import calendrier
    from ..services.macro.libelles import presenter
    from .semaine import DEVISES_AGENDA, _profil
    devises = {"USD", "EUR"}
    try:
        for m in (await _profil(user)).get("markets") or []:
            devises |= DEVISES_AGENDA.get(m, set())
    except Exception as e:
        logger.info("profil illisible pour l'agenda de demain : %s", e)
    debut = datetime(j.year, j.month, j.day, tzinfo=PARIS)
    try:
        lignes = await calendrier.evenements(debut, debut + timedelta(days=1), devises=devises, importance_min="Medium")
    except Exception as e:
        logger.info("agenda de demain indisponible : %s", e)
        return []
    rang = {"High": 0, "Medium": 1}
    lignes = sorted((r for r in lignes if r.get("importance") in rang), key=lambda r: (rang[r["importance"]], r["quand"]))
    out = []
    for r in lignes[:4]:
        p = presenter(r)
        out.append({"titre": p["titre"], "heure": p["heure"], "importance": p["importance"],
                    "pays": p["pays_nom"], "pourquoi": p.get("pourquoi")})
    return out


async def _plans(user_id: int, noms) -> list[dict]:
    """Les plans de Nimbo encore ouverts sur les favoris de la personne."""
    favs = await execute_query("SELECT symbol FROM web_favorites WHERE user_id = ?", (user_id,)) or []
    voulus = {str(f["symbol"]).upper() for f in favs}
    if not voulus:
        return []
    try:
        from . import nimbo_suivi
        await nimbo_suivi.init()
        rows = await execute_query(
            "SELECT symbol, timeframe, direction, entree, stop, objectif, cree_le FROM nimbo_propositions "
            "WHERE statut = 'en_cours' ORDER BY cree_le DESC") or []
    except Exception:
        return []
    out, vus = [], set()
    for r in rows:
        s = str(r["symbol"]).upper()
        if s not in voulus or s in vus:
            continue
        vus.add(s)
        out.append({"symbol": s, "nom": noms.get(s, s), "achat": r["direction"] != "SHORT",
                    "timeframe": r["timeframe"], "entree": r["entree"], "stop": r["stop"],
                    "objectif": r["objectif"], "depuis": r["cree_le"]})
    return out[:3]


async def _sans_stop(user_id: int) -> int:
    rows = await execute_query(
        "SELECT COUNT(*) AS n FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0) "
        "AND stop_loss IS NULL AND COALESCE(instrument, '') != 'turbo'", (f"web_{user_id}",))
    return int(rows[0]["n"]) if rows else 0


@router.get("")
@limiter.limit("30/minute")
async def demain(request: Request, current_user: dict = Depends(get_current_user)):
    from .market import SYMBOL_NAMES
    maintenant = datetime.now(timezone.utc)
    j = prochaine_seance(maintenant)
    aujourdhui = maintenant.astimezone(PARIS).date()
    uid = int(current_user["id"])
    return {
        "jour": {"date": j.isoformat(), "libelle": libelle(j), "est_demain": (j - aujourdhui).days == 1},
        "seances": SEANCES,
        "agenda": await _agenda(current_user, j),
        "plans": await _plans(uid, SYMBOL_NAMES),
        "sans_stop": await _sans_stop(uid),
    }
