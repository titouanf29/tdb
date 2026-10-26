"""Être prévenu quand le site casse.

Une erreur serveur ne se voyait que si un utilisateur prenait la peine
d'écrire : les alertes de prix sont restées cassées sous PostgreSQL sans que
personne le sache. Ici, chaque erreur non gérée est notée (en mémoire, les
cinquante dernières) ; dès que SEUIL erreurs tombent en FENETRE secondes,
l'équipe est prévenue, une fois par heure au plus, avec la route la plus
touchée et le type d'erreur. L'écran Exploitation de l'administration montre
les dernières erreurs.

Rien ne part chez un tiers, et rien ici ne peut faire échouer une requête.
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import Counter, deque
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SEUIL = 5            # erreurs…
FENETRE = 600        # … en dix minutes
_recentes: deque = deque(maxlen=50)
_derniere_alerte = 0.0
# Les alertes en cours d'envoi. Une tâche asyncio que rien ne retient peut
# être ramassée par le ramasse-miettes avant d'avoir fini.
_envois: set[asyncio.Task] = set()


def dernieres() -> list[dict]:
    return list(reversed(_recentes))


def noter(methode: str, route: str, erreur: BaseException) -> None:
    """Note une erreur non gérée ; prévient l'équipe si elles s'enchaînent."""
    global _derniere_alerte
    try:
        maintenant = time.time()
        _recentes.append({
            "a": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "t": maintenant,
            "route": f"{methode} {route}",
            "erreur": type(erreur).__name__,
            "detail": str(erreur)[:200],
        })
        fenetre = [e for e in _recentes if maintenant - e["t"] <= FENETRE]
        if len(fenetre) >= SEUIL and maintenant - _derniere_alerte > 3600:
            _derniere_alerte = maintenant
            tache = asyncio.get_running_loop().create_task(_prevenir(fenetre))
            _envois.add(tache)
            tache.add_done_callback(_envois.discard)
    except Exception as e:  # la surveillance ne doit jamais casser une réponse
        logger.warning("erreur non notée : %s", e)


async def _prevenir(fenetre: list[dict]) -> None:
    try:
        from ..database import create_admin_notification, execute_query
        from .notifications import notifier
        route, n_route = Counter(e["route"] for e in fenetre).most_common(1)[0]
        erreur = Counter(e["erreur"] for e in fenetre if e["route"] == route).most_common(1)[0][0]
        titre = "Le site renvoie des erreurs"
        message = (f"{len(fenetre)} erreurs serveur en {FENETRE // 60} minutes, dont {n_route} sur {route} "
                   f"({erreur}). Le détail est dans Administration, Exploitation.")
        lien = "/admin?section=operations"
        cle = f"erreurs:{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H')}"
        for a in await execute_query("SELECT id FROM web_users WHERE is_admin = 1") or []:
            await notifier(a["id"], "admin_erreurs", titre, message, lien, cle=cle)
        await create_admin_notification("errors", titre, message, lien)
    except Exception as e:
        logger.warning("équipe non prévenue des erreurs : %s", e)
