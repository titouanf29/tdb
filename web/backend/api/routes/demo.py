"""La démo de l'accueil, sur les vrais cours (components/landing/DemoSection.tsx).

Un visiteur sans compte voit la VRAIE analyse de cinq actifs choisis : le même
moteur que l'écran Analyse, en mode léger (sans actualité ni climat), traduit
dans la forme de la démo. Cinq actifs et pas un champ libre : la page est
publique, chaque analyse coûte des appels au fournisseur de cours.

Chaque analyse est gardée dix minutes. Passé ce délai, la page reçoit encore
l'ancienne pendant qu'une nouvelle se calcule : aucun visiteur n'attend le
moteur, sauf le tout premier après un redémarrage (et le serveur les prépare
au démarrage). Si le moteur échoue, la route le dit et la page garde son
exemple fixe.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from starlette.requests import Request as _Requete

from ..limite import cle_client
from ..temps import PARIS
from . import analysis
from ._fr import nombre_fr
from ._prices import fetch_ohlcv
from ._scoring import TIMEFRAME_FETCH, derive_signal

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=cle_client)

# id de la page → (symbole, nom affiché, unité du cours)
ACTIFS = {
    "apple": ("AAPL", "Apple", "$"),
    "bitcoin": ("BTC-USD", "Bitcoin", "$"),
    "tesla": ("TSLA", "Tesla", "$"),
    "gold": ("GC=F", "Or", "$"),
    "sp500": ("^GSPC", "S&P 500", "pts"),
}

FRAICHEUR = 600          # secondes avant de recalculer
POINTS = 60              # séances dessinées
_cache: dict[str, tuple[float, dict]] = {}
_en_cours: dict[str, asyncio.Task] = {}

REGIMES = {"BULLISH": "Haussier", "BEARISH": "Baissier"}


def _prix(v: float, unite: str) -> str:
    dec = 0 if v >= 10000 else 2
    return f"{nombre_fr(v, dec)} {unite}"


def _raisons(a: dict) -> list[str]:
    f = a.get("factor_directions") or {}
    tendance, elan, flux = f.get("trend", 0) or 0, f.get("momentum", 0) or 0, f.get("flow", 0) or 0
    raisons = [
        "La tendance de fond est orientée à la hausse." if tendance > 0.3
        else "La tendance de fond est orientée à la baisse." if tendance < -0.3
        else "La tendance de fond n'est pas tranchée.",
        "L'élan accompagne le mouvement." if elan > 0.3
        else "L'élan s'essouffle sur les dernières séances." if elan < -0.3
        else "L'élan est à l'arrêt : ni accélération, ni essoufflement.",
        "Les volumes confirment les dernières séances." if flux > 0.2
        else "Les volumes ne suivent pas le mouvement." if flux < -0.2
        else "Les volumes restent dans la moyenne.",
    ]
    n = a.get("nimbo") or {}
    if n.get("propose"):
        raisons.append("Nimbo propose un plan " + ("à la vente" if n.get("sens") == "short" else "à l'achat")
                       + ", avec son stop et son objectif.")
    elif 40 <= float((a.get("score") or {}).get("total") or 50) < 60:
        raisons.append("Nimbo ne propose pas de trade aujourd'hui : le signal n'est pas assez net.")
    else:
        raisons.append("Nimbo ne propose pas de trade aujourd'hui : une condition de son plan n'est pas remplie.")
    return raisons


def traduire(ident: str, a: dict, cloture: list[float]) -> dict:
    """L'analyse complète, ramenée à ce que la démo affiche."""
    symbole, nom, unite = ACTIFS[ident]
    score = a.get("score") or {}
    total = float(score.get("total") or 0)
    signal = derive_signal(total)
    sens = "Haussier" if "BUY" in signal else "Baissier" if "SELL" in signal else "Neutre"
    pct = (a.get("volatility_context") or {}).get("percentile")
    f = a.get("factor_directions") or {}
    nimbo = a.get("nimbo") or {}
    niveaux = a.get("levels") or {}
    lignes = [
        ("Facteur tendance", nombre_fr(f.get("trend"), 2, signe=True)),
        ("Facteur élan", nombre_fr(f.get("momentum"), 2, signe=True)),
        ("Facteur volumes", nombre_fr(f.get("flow"), 2, signe=True)),
        ("Volatilité (percentile)", f"{int(pct)}ᵉ" if pct is not None else "n.d."),
        ("RSI 14", nombre_fr(((a.get("indicators") or {}).get("rsi") or {}).get("value"), 1)),
        ("Régime du marché", REGIMES.get((a.get("market_context") or {}).get("regime"), "Neutre")),
        ("Support", _prix(niveaux["support"], unite) if niveaux.get("support") else "n.d."),
        ("Résistance", _prix(niveaux["resistance"], unite) if niveaux.get("resistance") else "n.d."),
        ("Plan proposé", ("À la vente" if nimbo.get("sens") == "short" else "À l'achat")
         if nimbo.get("propose") else "Aucun aujourd'hui"),
    ]
    return {
        "id": ident,
        "name": nom,
        "ticker": symbole,
        "price": _prix(float((a.get("price") or {}).get("current") or 0), unite),
        "change": float((a.get("price") or {}).get("change") or 0),
        "direction": sens,
        "score": int(round(total)),
        "reasons": _raisons(a),
        "factors": [
            {"label": "Tendance", "value": int(score.get("trend") or 0)},
            {"label": "Momentum", "value": int(score.get("momentum") or 0)},
            {"label": "Volume", "value": int(score.get("volume") or 0)},
            {"label": "Volatilité", "value": int(pct) if pct is not None else 50},
        ],
        "risk": "n.d." if pct is None else "Faible" if pct < 33 else "Modéré" if pct < 66 else "Élevé",
        "advanced": [{"label": l, "value": v} for l, v in lignes],
        "series": [round(x, 4) for x in cloture],
        "support": niveaux.get("support"),
        "resistance": niveaux.get("resistance"),
        "verdict": signal,
    }


def _requete_legere() -> _Requete:
    # L'en-tête du scanner : la décision seule, et la proposition n'est pas
    # comptée dans le suivi de Nimbo (personne ne l'a ouverte).
    return _Requete({"type": "http", "method": "GET", "path": "/api/demo", "query_string": b"",
                     "headers": [(b"x-nimbo-scanner", b"1")], "client": ("127.0.0.1", 0)})


async def _calculer(ident: str) -> dict:
    symbole = ACTIFS[ident][0]
    a = await analysis.analyze_asset.__wrapped__(
        request=_requete_legere(), symbol=symbole, timeframe="1d", sl_atr=2.0, tp_atr=3.0,
        fund_weight=0.0, style="swing", risk_level=None, current_user=None)
    periode, intervalle, _ = TIMEFRAME_FETCH["1d"]
    hist = await fetch_ohlcv(symbole, period=periode, interval=intervalle)
    cloture = [float(x) for x in hist["Close"].dropna().tail(POINTS)]
    donnees = traduire(ident, a, cloture)
    donnees["analyse_a"] = datetime.now(PARIS).isoformat(timespec="minutes")
    _cache[ident] = (time.time(), donnees)
    return donnees


def _lancer(ident: str) -> asyncio.Task:
    tache = _en_cours.get(ident)
    if tache is None or tache.done():
        tache = asyncio.ensure_future(_calculer(ident))
        # Un recalcul lancé en arrière-plan peut échouer sans personne pour
        # l'attendre : l'erreur est notée, l'ancienne analyse reste servie.
        tache.add_done_callback(lambda t: t.cancelled() or not t.exception()
                                or logger.warning("démo %s : %s", ident, t.exception()))
        _en_cours[ident] = tache
    return tache


async def prechauffer() -> None:
    """Au démarrage : les cinq analyses prêtes avant le premier visiteur."""
    await asyncio.sleep(30)
    for ident in ACTIFS:
        try:
            await _lancer(ident)
        except Exception as e:
            logger.warning("démo %s non préparée : %s", ident, e)


@router.get("/{ident}")
@limiter.limit("40/minute")
async def demo(request: Request, ident: str):
    if ident not in ACTIFS:
        raise HTTPException(status_code=404, detail="Actif absent de la démo")
    garde = _cache.get(ident)
    if garde:
        if time.time() - garde[0] > FRAICHEUR:
            _lancer(ident)       # la suivante sera fraîche
        return garde[1]
    try:
        return await asyncio.wait_for(asyncio.shield(_lancer(ident)), timeout=25)
    except Exception as e:
        logger.warning("démo %s indisponible : %s", ident, e)
        raise HTTPException(status_code=503, detail="Analyse indisponible pour le moment")
