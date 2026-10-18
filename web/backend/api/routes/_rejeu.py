"""Le rejeu de l'historique du plan, dans des processus à part.

Le rejeu (run_backtest) recalcule le score à une centaine de dates passées :
environ deux secondes de calcul pur par actif. Dans un thread, ce calcul
garde le verrou de l'interpréteur Python : six rejeux « en parallèle »
passaient en réalité l'un après l'autre, et ralentissaient tout le reste du
serveur pendant ce temps. Le scanner, qui en demande une vingtaine, attendait
près d'une minute.

Ici, le calcul part dans un petit groupe de processus (démarrés à la demande,
« spawn » pour ne rien hériter de l'état du serveur), qui tournent vraiment en
même temps sur les processeurs de la machine. C'est le même calcul, avec les
mêmes entrées : seul l'endroit où il s'exécute change. Si les processus ne
peuvent pas démarrer, le calcul revient dans un thread, comme avant.
"""

from __future__ import annotations

import asyncio
import logging
import multiprocessing
import os
import pickle
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from typing import Optional

logger = logging.getLogger(__name__)

_POOL: Optional[ProcessPoolExecutor] = None
_HORS_SERVICE = False


def calculer(hist, timeframe: str, sl_atr: float, tp_atr: float, bench_close=None,
             bench_symbol: Optional[str] = None) -> dict:
    """Exécuté dans le processus de calcul : le rejeu brut, sans cache."""
    from ._backtest import run_backtest
    from ._market_context import regime_series
    from ._scoring import extension_validee, horizon_rejeu, jours_par_bougie

    regimes = None
    if bench_close is not None:
        try:
            regimes = regime_series(bench_close)
        except Exception:
            regimes = None
    # Échantillonnage plus large que le bouton de backtest (120 contre 250
    # évaluations) : le nombre de trades compte, pas la finesse de la grille.
    return run_backtest(hist, horizon=horizon_rejeu(timeframe), sl_atr=sl_atr, tp_atr=tp_atr,
                        mode="event", max_evals=120, regimes=regimes,
                        extension=extension_validee(timeframe),
                        timeframe=timeframe, bench_close=bench_close,
                        bench_symbol=bench_symbol,
                        jours_par_bougie=jours_par_bougie(hist, timeframe))


def _pool() -> Optional[ProcessPoolExecutor]:
    global _POOL
    if _HORS_SERVICE:
        return None
    if _POOL is None:
        n = int(os.getenv("REJEU_PROCESSUS", str(max(1, min(3, (os.cpu_count() or 2) - 1)))))
        if n <= 0:
            return None
        _POOL = ProcessPoolExecutor(max_workers=n, mp_context=multiprocessing.get_context("spawn"))
    return _POOL


async def rejouer(hist, timeframe: str, sl_atr: float, tp_atr: float, bench_close=None,
                  bench_symbol: Optional[str] = None) -> dict:
    global _POOL, _HORS_SERVICE
    loop = asyncio.get_running_loop()
    pool = _pool()
    if pool is not None:
        try:
            return await loop.run_in_executor(pool, calculer, hist, timeframe, sl_atr, tp_atr,
                                              bench_close, bench_symbol)
        # Seulement les pannes du mécanisme : une erreur du calcul lui-même
        # remonte telle quelle, comme dans le thread.
        except (BrokenProcessPool, pickle.PicklingError, OSError) as e:
            logger.warning("rejeu en processus indisponible, retour au thread : %s", e)
            _HORS_SERVICE = True
            try:
                pool.shutdown(wait=False, cancel_futures=True)
            except Exception:
                pass
            _POOL = None
    return await loop.run_in_executor(None, calculer, hist, timeframe, sl_atr, tp_atr,
                                      bench_close, bench_symbol)


async def executer(fn, *args):
    """N'importe quel calcul pur, dans le groupe de processus quand il est
    disponible, sinon dans un thread. `fn` doit être une fonction de module."""
    global _POOL, _HORS_SERVICE
    loop = asyncio.get_running_loop()
    pool = _pool()
    if pool is not None:
        try:
            return await loop.run_in_executor(pool, fn, *args)
        except (BrokenProcessPool, pickle.PicklingError, OSError) as e:
            logger.warning("calcul en processus indisponible, retour au thread : %s", e)
            _HORS_SERVICE = True
            try:
                pool.shutdown(wait=False, cancel_futures=True)
            except Exception:
                pass
            _POOL = None
    return await loop.run_in_executor(None, fn, *args)


def arreter() -> None:
    global _POOL
    if _POOL is not None:
        _POOL.shutdown(wait=False, cancel_futures=True)
        _POOL = None
