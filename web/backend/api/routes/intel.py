"""
Ce que la presse dit d'un actif — l'endpoint du moteur d'intelligence.

Le moteur lui-même vit dans `api/services/intel/`. Ce fichier n'est qu'une
porte : il reçoit un symbole et les données de marché que l'écran d'analyse a
déjà en main, et rend le dossier prêt à afficher.

POURQUOI L'APPELANT FOURNIT LE PRIX. La comparaison actualité/prix a besoin de
la variation du jour, du volume relatif et de la volatilité. L'écran d'analyse
possède déjà les trois : les redemander ici doublerait les appels au
fournisseur de cours pour un résultat identique, et ferait dépendre la page de
deux lectures qui peuvent diverger d'une seconde à l'autre.
"""

import logging

from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from ..limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address

from .auth import get_current_user
from ..services.intel import context

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=cle_client)


@router.get("/{symbol}")
@limiter.limit("30/minute")
async def contexte_presse(
    request: Request,
    symbol: str,
    variation_pct: float | None = Query(default=None, ge=-100.0, le=1000.0),
    volume_ratio: float | None = Query(default=None, ge=0.0, le=200.0),
    volatilite_jour: float | None = Query(default=None, ge=0.0, le=100.0),
    current_user: dict = Depends(get_current_user),
):
    """Le contexte de presse d'un actif.

    Ne lève jamais : un moteur d'actualité indisponible ne doit pas empêcher
    de lire une analyse technique. En cas d'échec, l'écran reçoit un dossier
    vide et une phrase qui le dit — ce qui vaut mieux qu'une page cassée.
    """
    try:
        return await context.pour_symbole(
            symbol,
            variation_pct=variation_pct,
            volume_ratio=volume_ratio,
            volatilite_jour=volatilite_jour,
        )
    except Exception as exc:  # pragma: no cover - filet de sécurité
        logger.warning("contexte presse indisponible pour %s : %s", symbol, exc)
        return {
            "symbole": (symbol or "").upper(),
            "couvert": False,
            "indisponible": True,
            "resume": "La lecture de la presse est momentanément indisponible.",
            "evenements": [],
            "surveille": [],
            "veille": context.veille(),
        }
