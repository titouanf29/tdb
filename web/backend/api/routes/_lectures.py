"""Ce qui a changé depuis la dernière fois qu'on a lu cette analyse.

Un visiteur revenait « voir si l'analyse change après la bougie du jour »,
et l'écran lui montrait le verdict du jour sans rien dire du précédent : il
devait se souvenir du score de la veille. On le garde pour lui, par
utilisateur, par actif et par unité de temps : la dernière lecture d'un jour
précédent est rendue avec l'analyse, puis remplacée par celle-ci.

Rien n'est calculé ici ; on note et on compare.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..database import USE_POSTGRES, execute_query, execute_write
from ..temps import PARIS

logger = logging.getLogger(__name__)
_pret = False


async def init() -> None:
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS analyses_lues (
            id {cle},
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            score REAL,
            trend TEXT,
            propose INTEGER NOT NULL DEFAULT 0,
            prix REAL,
            lu_le TEXT NOT NULL,
            UNIQUE (user_id, symbol, timeframe)
        )
    """)
    _pret = True


def _jour(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).astimezone(PARIS).date().isoformat()
    except (ValueError, TypeError):
        return ""


async def relire(user_id: int, symbol: str, timeframe: str, score: float | None, trend: str | None,
                 propose: bool, prix: float | None, maintenant: datetime | None = None) -> dict | None:
    """Rend la lecture précédente si elle date d'un autre jour, et note celle-ci."""
    await init()
    maintenant = maintenant or datetime.now(timezone.utc)
    rows = await execute_query(
        "SELECT score, trend, propose, prix, lu_le FROM analyses_lues WHERE user_id = ? AND symbol = ? AND timeframe = ?",
        (user_id, symbol, timeframe)) or []
    avant = rows[0] if rows else None
    aujourdhui = maintenant.astimezone(PARIS).date().isoformat()
    sortie = None
    if avant and _jour(avant["lu_le"]) and _jour(avant["lu_le"]) != aujourdhui:
        sortie = {
            "lu_le": avant["lu_le"],
            "score": avant["score"],
            "trend": avant["trend"],
            "propose": bool(avant["propose"]),
            "prix": avant["prix"],
        }
    valeurs = (score, trend, 1 if propose else 0, prix, maintenant.isoformat(timespec="minutes"))
    if avant:
        await execute_write(
            "UPDATE analyses_lues SET score = ?, trend = ?, propose = ?, prix = ?, lu_le = ? "
            "WHERE user_id = ? AND symbol = ? AND timeframe = ?",
            (*valeurs, user_id, symbol, timeframe))
    else:
        await execute_write(
            "INSERT INTO analyses_lues (score, trend, propose, prix, lu_le, user_id, symbol, timeframe) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (*valeurs, user_id, symbol, timeframe))
    return sortie
