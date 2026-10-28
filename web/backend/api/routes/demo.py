"""La démo de l'accueil et les pages publiques par actif, sur les vrais cours.

Un visiteur sans compte voit la VRAIE analyse d'actifs choisis : le même
moteur que l'écran Analyse, en mode léger (sans actualité ni climat), traduit
pour une page publique. Deux usages :

  · la démo de l'accueil (components/landing/DemoSection.tsx), cinq actifs ;
  · les pages « l'analyse du jour » (app/actif/[slug]), une trentaine
    d'actifs parmi les plus recherchés, pour que Google amène des visiteurs.

Une liste fermée et pas un champ libre : la page est publique, chaque analyse
coûte des appels au fournisseur de cours.

Chaque analyse est gardée dix minutes. Passé ce délai, la page reçoit encore
l'ancienne pendant qu'une nouvelle se calcule : aucun visiteur n'attend le
moteur, sauf le tout premier après un redémarrage (et le serveur les prépare
au démarrage). Si le moteur échoue, la route le dit et la page garde son
exemple fixe (démo) ou l'annonce (page d'actif).
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

# slug → (symbole, nom affiché, unité du cours, décimales, catégorie, présentation)
_A = [
    # Les cinq de la démo de l'accueil, en tête.
    ("apple", "AAPL", "Apple", "$", 2, "Actions américaines", "le fabricant de l'iPhone et du Mac, l'une des plus grosses capitalisations au monde"),
    ("bitcoin", "BTC-USD", "Bitcoin", "$", 0, "Cryptomonnaies", "la première cryptomonnaie, qui cote sept jours sur sept, jour et nuit"),
    ("tesla", "TSLA", "Tesla", "$", 2, "Actions américaines", "le constructeur de voitures électriques d'Elon Musk, réputé pour ses fortes variations"),
    ("or", "GC=F", "Or", "$", 2, "Matières premières", "le métal refuge, analysé ici sur son contrat à terme en dollars l'once"),
    ("sp500", "^GSPC", "S&P 500", "pts", 2, "Indices", "l'indice des 500 plus grandes entreprises américaines"),
    # Actions françaises.
    ("lvmh", "MC.PA", "LVMH", "€", 2, "Actions françaises", "le numéro un mondial du luxe (Louis Vuitton, Dior, Moët Hennessy)"),
    ("totalenergies", "TTE.PA", "TotalEnergies", "€", 2, "Actions françaises", "le groupe pétrolier et gazier français, de plus en plus présent dans l'électricité"),
    ("airbus", "AIR.PA", "Airbus", "€", 2, "Actions françaises", "le constructeur aéronautique européen"),
    ("bnp-paribas", "BNP.PA", "BNP Paribas", "€", 2, "Actions françaises", "la première banque de la zone euro"),
    ("loreal", "OR.PA", "L'Oréal", "€", 2, "Actions françaises", "le numéro un mondial des cosmétiques"),
    ("hermes", "RMS.PA", "Hermès", "€", 2, "Actions françaises", "la maison de luxe française, l'une des plus chères de la cote"),
    ("societe-generale", "GLE.PA", "Société Générale", "€", 2, "Actions françaises", "l'une des grandes banques françaises"),
    ("sanofi", "SAN.PA", "Sanofi", "€", 2, "Actions françaises", "le laboratoire pharmaceutique français"),
    ("schneider-electric", "SU.PA", "Schneider Electric", "€", 2, "Actions françaises", "le spécialiste de la gestion de l'énergie et des automatismes"),
    ("renault", "RNO.PA", "Renault", "€", 2, "Actions françaises", "le constructeur automobile français"),
    ("orange", "ORA.PA", "Orange", "€", 2, "Actions françaises", "l'opérateur de télécommunications français"),
    ("kering", "KER.PA", "Kering", "€", 2, "Actions françaises", "le groupe de luxe de Gucci et Saint Laurent"),
    ("danone", "BN.PA", "Danone", "€", 2, "Actions françaises", "le groupe agroalimentaire français"),
    ("capgemini", "CAP.PA", "Capgemini", "€", 2, "Actions françaises", "l'entreprise française de services informatiques"),
    # Actions américaines.
    ("nvidia", "NVDA", "Nvidia", "$", 2, "Actions américaines", "le concepteur de puces graphiques au cœur de l'intelligence artificielle"),
    ("microsoft", "MSFT", "Microsoft", "$", 2, "Actions américaines", "l'éditeur de Windows et d'Office, géant du cloud"),
    ("amazon", "AMZN", "Amazon", "$", 2, "Actions américaines", "le géant du commerce en ligne et du cloud"),
    ("alphabet", "GOOGL", "Alphabet (Google)", "$", 2, "Actions américaines", "la maison mère de Google et YouTube"),
    ("meta", "META", "Meta", "$", 2, "Actions américaines", "la maison mère de Facebook, Instagram et WhatsApp"),
    # Cryptomonnaies.
    ("ethereum", "ETH-USD", "Ethereum", "$", 2, "Cryptomonnaies", "la deuxième cryptomonnaie, support de nombreuses applications"),
    ("solana", "SOL-USD", "Solana", "$", 2, "Cryptomonnaies", "une cryptomonnaie rapide et très volatile"),
    # Indices.
    ("cac40", "^FCHI", "CAC 40", "pts", 2, "Indices", "l'indice des 40 grandes entreprises de la Bourse de Paris"),
    ("nasdaq", "^IXIC", "Nasdaq", "pts", 2, "Indices", "l'indice des valeurs technologiques américaines"),
    # Matières premières et devises.
    ("petrole", "CL=F", "Pétrole (WTI)", "$", 2, "Matières premières", "le baril de pétrole américain, sur son contrat à terme"),
    ("argent", "SI=F", "Argent (métal)", "$", 2, "Matières premières", "le métal précieux, plus volatil que l'or"),
    ("eur-usd", "EURUSD=X", "Euro / Dollar", "", 4, "Devises", "la paire de devises la plus échangée au monde"),
]
ACTIFS = {a[0]: {"symbole": a[1], "nom": a[2], "unite": a[3], "dec": a[4], "categorie": a[5], "presentation": a[6]} for a in _A}
DEMO = ("apple", "bitcoin", "tesla", "or", "sp500")

FRAICHEUR = 600          # secondes avant de recalculer
POINTS = 60              # séances dessinées
_cache: dict[str, tuple[float, dict]] = {}
_en_cours: dict[str, asyncio.Task] = {}

REGIMES = {"BULLISH": "Haussier", "BEARISH": "Baissier"}


def _prix(v: float, unite: str, dec: int = 2) -> str:
    dec = 0 if v >= 10000 else dec
    return f"{nombre_fr(v, dec)} {unite}".strip()


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


def _direction(nimbo: dict) -> str:
    """Haussier ou Baissier quand Nimbo propose un plan, Neutre sinon."""
    if not nimbo.get("propose"):
        return "Neutre"
    return "Baissier" if nimbo.get("sens") == "short" else "Haussier"


def traduire(ident: str, a: dict, cloture: list[float]) -> dict:
    """L'analyse complète, ramenée à ce qu'une page publique affiche."""
    fiche = ACTIFS[ident]
    symbole, nom, unite, dec = fiche["symbole"], fiche["nom"], fiche["unite"], fiche["dec"]
    score = a.get("score") or {}
    total = float(score.get("total") or 0)
    signal = derive_signal(total)
    nimbo = a.get("nimbo") or {}
    # La direction affichée suit le PLAN de Nimbo, pas le score seul : un
    # score de 62 sur un rebond, sous une tendance baissière et sans plan
    # proposé, s'affichait « Haussier » au-dessus de raisons qui disaient
    # l'inverse. Même règle que l'écran Analyse.
    sens = _direction(nimbo)
    pct = (a.get("volatility_context") or {}).get("percentile")
    f = a.get("factor_directions") or {}
    niveaux = a.get("levels") or {}
    lignes = [
        ("Facteur tendance", nombre_fr(f.get("trend"), 2, signe=True)),
        ("Facteur élan", nombre_fr(f.get("momentum"), 2, signe=True)),
        ("Facteur volumes", nombre_fr(f.get("flow"), 2, signe=True)),
        ("Volatilité (percentile)", f"{int(pct)}ᵉ" if pct is not None else "n.d."),
        ("RSI 14", nombre_fr(((a.get("indicators") or {}).get("rsi") or {}).get("value"), 1)),
        ("Régime du marché", REGIMES.get((a.get("market_context") or {}).get("regime"), "Neutre")),
        ("Support", _prix(niveaux["support"], unite, dec) if niveaux.get("support") else "n.d."),
        ("Résistance", _prix(niveaux["resistance"], unite, dec) if niveaux.get("resistance") else "n.d."),
        ("Plan proposé", ("À la vente" if nimbo.get("sens") == "short" else "À l'achat")
         if nimbo.get("propose") else "Aucun aujourd'hui"),
    ]
    return {
        "id": ident,
        "name": nom,
        "ticker": symbole,
        "price": _prix(float((a.get("price") or {}).get("current") or 0), unite, dec),
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
        # Pour les pages par actif.
        "categorie": fiche["categorie"],
        "presentation": fiche["presentation"],
        "performance": {k: (a.get("performance") or {}).get(k) for k in ("1w", "1m", "3m", "ytd")},
        "moyennes": {k: (a.get("indicators") or {}).get("ema", {}).get(k) for k in ("ema20", "ema50", "ema200")},
        "rsi": ((a.get("indicators") or {}).get("rsi") or {}).get("value"),
        "tendance_hebdo": REGIMES.get((a.get("higher_timeframe") or {}).get("trend"), "Neutre"),
    }


def _requete_legere() -> _Requete:
    # L'en-tête du scanner : la décision seule, et la proposition n'est pas
    # comptée dans le suivi de Nimbo (personne ne l'a ouverte).
    return _Requete({"type": "http", "method": "GET", "path": "/api/demo", "query_string": b"",
                     "headers": [(b"x-nimbo-scanner", b"1")], "client": ("127.0.0.1", 0)})


async def _calculer(ident: str) -> dict:
    symbole = ACTIFS[ident]["symbole"]
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
    """Au démarrage : la démo d'abord, puis les pages d'actif, une à une
    (sans saturer le fournisseur de cours), avant les premiers visiteurs."""
    await asyncio.sleep(30)
    for ident in DEMO + tuple(i for i in ACTIFS if i not in DEMO):
        try:
            await _lancer(ident)
        except Exception as e:
            logger.warning("analyse publique %s non préparée : %s", ident, e)
        await asyncio.sleep(2)


@router.get("")
@limiter.limit("60/minute")
async def liste(request: Request):
    """Les actifs publics, pour la page d'index et le plan du site."""
    return [{"id": i, "nom": f["nom"], "symbole": f["symbole"], "categorie": f["categorie"],
             "demo": i in DEMO} for i, f in ACTIFS.items()]


@router.get("/{ident}")
@limiter.limit("40/minute")
async def demo(request: Request, ident: str):
    if ident not in ACTIFS:
        raise HTTPException(status_code=404, detail="Actif absent des pages publiques")
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
