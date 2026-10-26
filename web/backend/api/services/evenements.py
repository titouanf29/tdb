"""Le journal des gestes, pour savoir qui revient.

Le site ne mesurait rien : pas d'outil de statistiques, pas de journal. Les
« actifs » de l'administration se lisaient sur la dernière connexion par mot
de passe, si bien que quelqu'un qui reste connecté et vient chaque jour
n'était pas compté. Impossible de savoir où les gens décrochent, ni de
vérifier qu'une amélioration marche.

Ici, une ligne par personne, par sorte de geste et par jour : inscription,
visite, analyse, position, leçon, scan, question à l'assistant, alerte. Une
seule par jour suffit à mesurer les retours, et garde la table petite. Les
gestes viennent des signaux que le site envoie déjà (les missions), pas d'un
traceur ajouté dans les pages, et rien ne part chez un tiers.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..database import USE_POSTGRES, execute_query, execute_write
from ..temps import aujourdhui_paris

logger = logging.getLogger(__name__)
TYPES = {"inscription", "visite", "analyse", "position", "lecon", "scan", "assistant", "alerte"}

# Les signaux des missions, traduits en gestes.
PAR_ACTION = {
    "daily_login": "visite",
    "analysis_open": "analyse",
    "position_open": "position",
    "lesson_complete": "lecon",
    "scanner_run": "scan",
    "ai_chat": "assistant",
}

_pret = False


async def init() -> None:
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS evenements (
            id {cle},
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            jour TEXT NOT NULL,
            cree_le TEXT NOT NULL
        )
    """)
    try:
        await execute_write("CREATE UNIQUE INDEX IF NOT EXISTS idx_evenements_jour ON evenements (user_id, type, jour)")
    except Exception:
        pass
    _pret = True


async def noter(user_id, type_: str) -> None:
    """Un geste, une fois par jour au plus. Ne lève jamais."""
    if type_ not in TYPES:
        return
    try:
        uid = int(user_id)
        await init()
        maintenant = datetime.now(timezone.utc)
        await execute_write(
            "INSERT INTO evenements (user_id, type, jour, cree_le) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (user_id, type, jour) DO NOTHING",
            (uid, type_, aujourdhui_paris().isoformat(), maintenant.isoformat()))
    except Exception as e:
        logger.info("geste %s non noté pour %s : %s", type_, user_id, e)


async def lignes(depuis: str) -> list[dict]:
    await init()
    return await execute_query(
        "SELECT user_id, type, jour, cree_le FROM evenements WHERE cree_le >= ?", (depuis,)) or []


async def debut_mesure() -> str | None:
    await init()
    r = await execute_query("SELECT MIN(cree_le) AS d FROM evenements")
    return r[0]["d"] if r and r[0]["d"] else None
