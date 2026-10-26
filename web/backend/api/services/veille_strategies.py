"""Prévenir quand la stratégie active se déclenche.

On compose ses règles, on les rejoue sur des années de cours, on les active…
et on ne l'apprenait qu'en rouvrant une analyse : la stratégie n'était lue
que sur la page de l'actif ouvert. C'est pourtant l'investissement le plus
fort qu'un utilisateur fait sur le site.

Toutes les deux heures, le serveur relit chaque stratégie active sur ses
propres actifs et sur les favoris de son auteur, avec exactement le calcul de
la page d'analyse (_strategie.signal_du_jour). Il prévient quand toutes les
conditions se RÉUNISSENT sur la dernière bougie, pas tous les jours tant
qu'elles le restent : si elles l'étaient déjà sur la bougie d'avant, rien ne
part. Une notification au plus par stratégie, par actif et par bougie.
"""
from __future__ import annotations

import asyncio
import json
import logging

from ..database import execute_query

logger = logging.getLogger(__name__)

ACTIFS_MAX = 12          # par stratégie : ses actifs, puis les favoris
_PERIODE = {"1d": ("2y", "1d"), "1wk": ("10y", "1wk")}


def _prix(v: float) -> str:
    from ..routes._trade_review import _fmt
    return _fmt(v)


async def _actifs(st: dict, regles: dict) -> list[str]:
    favoris = await execute_query("SELECT symbol FROM web_favorites WHERE user_id = ? ORDER BY id DESC",
                                  (st["user_id"],)) or []
    vus, liste = set(), []
    for s in list(regles.get("actifs") or []) + [f["symbol"] for f in favoris]:
        s = str(s).upper()
        if s and s not in vus:
            vus.add(s)
            liste.append(s)
    return liste[:ACTIFS_MAX]


def nouveau_declenchement(hist, regles: dict) -> dict | None:
    """Le signal de la dernière bougie s'il vient de se déclencher, sinon None."""
    from ..routes import _strategie as S
    sig = S.signal_du_jour(hist, regles, None)
    if not (sig.get("possible") and sig.get("reunies")):
        return None
    avant = S.signal_du_jour(hist.iloc[:-1], regles, None)
    if avant.get("possible") and avant.get("reunies"):
        return None
    return sig


async def verifier_une(st: dict) -> int:
    from ..routes import _strategie as S
    from ..routes._prices import fetch_ohlcv
    from ..routes.market import SYMBOL_NAMES
    from .notifications import notifier
    try:
        regles = S.normaliser(json.loads(st.get("regles") or "{}"))
    except (TypeError, ValueError):
        return 0
    periode, intervalle = _PERIODE.get(regles["unite"], _PERIODE["1d"])
    envoyes = 0
    for sym in await _actifs(st, regles):
        try:
            hist = await fetch_ohlcv(sym, period=periode, interval=intervalle)
        except Exception:
            hist = None
        if hist is None or len(hist) < 61:
            continue
        sig = await asyncio.get_running_loop().run_in_executor(None, nouveau_declenchement, hist, regles)
        if not sig:
            continue
        bougie = str(hist.index[-1])[:10]
        nom = SYMBOL_NAMES.get(sym, sym)
        plan = sig.get("plan")
        detail = (f"{'Achat' if plan['direction'] == 'LONG' else 'Vente'} vers {_prix(plan['entree'])}, "
                  f"stop {_prix(plan['stop'])}, objectif {_prix(plan['objectif'])}. " if plan else "")
        ok = await notifier(
            st["user_id"], "strategie",
            f"« {regles['nom']} » se déclenche sur {nom}",
            f"Toutes vos conditions sont réunies sur la dernière bougie. {detail}Argent virtuel, à vous de décider.",
            f"/analysis?symbol={sym}",
            cle=f"strategie:{st['id']}:{sym}:{bougie}",
        )
        envoyes += 1 if ok else 0
        await asyncio.sleep(1)   # ménager la source de cours
    return envoyes


async def tour() -> int:
    """Un passage de la boucle de fond. Ne lève jamais."""
    try:
        from ..routes.strategies import _table
        await _table()
        actives = await execute_query("SELECT * FROM strategies WHERE active = 1") or []
    except Exception as e:
        logger.warning("veille des stratégies : %s", e)
        return 0
    total = 0
    for st in actives:
        try:
            total += await verifier_une(st)
        except Exception as e:
            logger.info("stratégie %s non vérifiée : %s", st.get("id"), e)
    return total
