"""Ce nouveau trade ressemble-t-il à ceux qui sont déjà ouverts ?

Trois achats sur Nvidia, AMD et le Nasdaq ne sont pas trois paris : c'est un
seul, trois fois plus gros. Le jour où les semi-conducteurs décrochent, les
trois stops sautent ensemble — et la règle « 1 % du capital par trade »
devient 3 % sans que personne l'ait décidé.

On le mesure simplement : la corrélation des rendements journaliers sur les
90 dernières séances communes. Au-dessus de 0,7 (même sens) — ou sous −0,7
quand l'une des positions est une vente — les deux positions gagnent et
perdent ensemble. Ce n'est pas un signal sur le marché, seulement une
arithmétique du portefeuille : le moteur ne change pas son verdict, Nimbo le
dit.
"""
from __future__ import annotations

import asyncio
import logging

import numpy as np
import pandas as pd

from ..database import execute_query
from ._prices import fetch_ohlcv

logger = logging.getLogger(__name__)


def _wallet_id(user: dict) -> str:
    """L'identifiant des positions : celui du wallet (voir wallet.py)."""
    if user.get("user_type") == "email":
        return f"web_{user['id']}"
    return str(user.get("telegram_id", user.get("id")))


SEUIL = 0.7
SEANCES = 90
MIN_COMMUNES = 40


def _rendements(hist) -> pd.Series | None:
    if hist is None or len(hist) < MIN_COMMUNES or "Close" not in hist:
        return None
    c = hist["Close"].astype(float).dropna()
    idx = pd.to_datetime(c.index)
    if getattr(idx, "tz", None) is not None:
        idx = idx.tz_convert(None)
    c.index = idx.normalize()
    c = c[~c.index.duplicated(keep="last")]
    return np.log(c).diff().dropna().tail(SEANCES + 30)


def correlation(a: pd.Series, b: pd.Series) -> tuple[float | None, int]:
    j = pd.concat([a, b], axis=1, join="inner").dropna().tail(SEANCES)
    if len(j) < MIN_COMMUNES:
        return None, len(j)
    r = float(j.iloc[:, 0].corr(j.iloc[:, 1]))
    return (None if np.isnan(r) else round(r, 2)), len(j)


async def avec_positions(user: dict, symbol: str, direction: str | None, hist_jour=None) -> dict | None:
    """Les positions ouvertes qui bougent comme celle-ci, dans le même sens de gain.

    {"proches": [{"symbol", "direction", "correlation"}], "ouvertes": n} ou None.
    """
    rows = await execute_query(
        "SELECT symbol, direction FROM positions WHERE user_id = ? AND status = 'open' "
        "AND (archived IS NULL OR archived = 0)", (_wallet_id(user),)) or []
    s = symbol.upper()
    autres: dict[str, str] = {}
    for r in rows:
        sym = (r.get("symbol") or "").upper()
        if sym and sym != s:
            autres.setdefault(sym, (r.get("direction") or "LONG").upper())
    if not autres:
        return None
    sens = 1 if (direction or "LONG").upper() != "SHORT" else -1

    async def _hist(sym):
        try:
            return await fetch_ohlcv(sym, period="6mo", interval="1d")
        except Exception:
            return None

    lui = _rendements(hist_jour) if hist_jour is not None else None
    if lui is None:
        lui = _rendements(await _hist(s))
    if lui is None:
        return None
    hists = await asyncio.gather(*[_hist(x) for x in list(autres)[:12]])
    proches = []
    for (sym, dir_), h in zip(autres.items(), hists):
        r_autre = _rendements(h)
        if r_autre is None:
            continue
        rho, n = correlation(lui, r_autre)
        if rho is None:
            continue
        sens_autre = 1 if dir_ != "SHORT" else -1
        # Même exposition : même signe de gain sur un même mouvement.
        if rho * sens * sens_autre >= SEUIL:
            proches.append({"symbol": sym, "nom": _nom(sym), "direction": dir_, "correlation": rho, "seances": n})
    proches.sort(key=lambda p: -abs(p["correlation"]))
    return {"proches": proches, "ouvertes": len(autres)}


def _nom(sym: str) -> str | None:
    try:
        from .market import SYMBOL_NAMES
        return SYMBOL_NAMES.get(sym)
    except Exception:
        return None


def phrase(c: dict | None) -> str | None:
    if not c or not c["proches"]:
        return None
    noms = ", ".join(p.get("nom") or p["symbol"] for p in c["proches"][:3])
    n = len(c["proches"])
    return (f"{'Une position ouverte bouge' if n == 1 else f'{n} positions ouvertes bougent'} comme celle-ci "
            f"({noms}) : si le marché se retourne, les stops risquent de sauter ensemble")
