"""La veille qui rend les notifications fiables, même site fermé.

Les stops, les objectifs et les alertes de prix n'étaient vérifiés QUE
lorsque la personne ouvrait son wallet ou gardait une page ouverte. Un stop
touché la nuit restait donc ouvert jusqu'au matin, et la notification « Stop
touché sur … » ne partait qu'au moment où l'on rouvrait le site : elle
n'apprenait rien. Les alertes de prix, elles, n'étaient vérifiées que par
l'ancien écran, que plus aucune page n'affiche.

Ici, toutes les quelques minutes, le serveur fait lui-même ce que la page
faisait : il lit les cours, exécute les niveaux atteints et déclenche les
alertes franchies. Ce sont les mêmes fonctions que les routes, avec les mêmes
garde-fous contre les doubles clôtures, et chaque événement porte une clé :
quelle que soit la voie qui le voit en premier, il n'est annoncé qu'une fois.
"""
from __future__ import annotations

import logging

from ..database import execute_query

logger = logging.getLogger(__name__)


async def verifier_positions() -> int:
    """Exécute les stops, objectifs et liquidations atteints ; rend le nombre de clôtures."""
    from ..routes import wallet as W
    rows = await execute_query(
        "SELECT DISTINCT user_id FROM positions WHERE status = 'open' AND (archived IS NULL OR archived = 0)") or []
    fermees = 0
    for r in rows:
        uid = str(r["user_id"])
        # Les comptes du site seulement : les positions du bot Telegram ont
        # leur propre suivi.
        if not uid.startswith("web_"):
            continue
        try:
            positions = await execute_query(
                "SELECT * FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
                (uid,)) or []
            await W._price_positions(positions)
            fermees += len(await W._execute_levels(uid, positions, int(uid[4:])))
        except Exception as e:
            logger.info("veille des positions de %s : %s", uid, e)
    return fermees


async def verifier_alertes() -> int:
    """Déclenche les alertes de prix franchies ; rend leur nombre."""
    from ..routes import price_alerts as A
    from ..routes._prices import fetch_prices
    await A._ensure_table()
    actives = await execute_query("SELECT * FROM price_alerts WHERE status = 'active'") or []
    if not actives:
        return 0
    try:
        prix = await fetch_prices(list({a["symbol"] for a in actives}))
    except Exception as e:
        logger.info("veille des alertes : cours indisponibles (%s)", e)
        return 0
    n = 0
    for a in actives:
        try:
            if await A.declencher_si_franchie(a, (prix.get(a["symbol"]) or {}).get("price")):
                n += 1
        except Exception as e:
            logger.info("alerte %s : %s", a.get("id"), e)
    return n


async def tour() -> None:
    """Un passage de la boucle de fond. Ne lève jamais."""
    for etape in (verifier_positions, verifier_alertes):
        try:
            await etape()
        except Exception as e:
            logger.warning("veille des notifications (%s) : %s", etape.__name__, e)
