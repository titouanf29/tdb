"""Les stratégies des utilisateurs : vérifier, tester, sauvegarder, appliquer.

Le calcul est dans _strategie.py ; ici, l'accès aux cours, à la base et au
compte. Une stratégie ACTIVE est celle que Nimbo prend en compte ailleurs sur
le site : sur la page d'analyse, il dit si elle se déclenche sur l'actif et
propose l'ordre fictif avec son stop et son objectif.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter

from ..database import USE_POSTGRES, execute_query, execute_write
from ..limite import cle_client
from .auth import get_current_user
from ._prices import fetch_ohlcv
from . import _strategie as S

router = APIRouter()
limiter = Limiter(key_func=cle_client)

STRATEGIES_MAX = 10
_PERIODE = {"1d": ("5y", "1d"), "1wk": ("10y", "1wk")}


class Regles(BaseModel):
    regles: dict


class Sauvegarde(BaseModel):
    regles: dict
    id: Optional[int] = None


async def _table() -> None:
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS strategies (
            id {cle},
            user_id INTEGER NOT NULL,
            nom TEXT NOT NULL,
            regles TEXT NOT NULL,
            active INTEGER DEFAULT 0,
            dernier_test TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)


def _lire(r: dict) -> dict:
    try:
        regles = S.normaliser(json.loads(r.get("regles") or "{}"))
    except ValueError:
        regles = S.normaliser({})
    try:
        test = json.loads(r["dernier_test"]) if r.get("dernier_test") else None
    except ValueError:
        test = None
    return {"id": r["id"], "nom": r["nom"], "active": bool(r.get("active")), "regles": regles,
            "dernier_test": test, "updated_at": r.get("updated_at")}


def _decrire(regles: dict) -> dict:
    return {"conditions": [S.decrire_condition(c) for c in regles["conditions"]],
            "unite": S.UNITES[regles["unite"]]}


@router.post("/verifier")
async def verifier(data: Regles, current_user: dict = Depends(get_current_user)):
    """Ce que Nimbo relève dans la stratégie, avant tout test."""
    regles = S.normaliser(data.regles)
    avis = S.verifier(regles)
    return {"regles": regles, "avis": avis, "bloquante": S.bloquante(avis), "description": _decrire(regles)}


@router.post("/backtest")
@limiter.limit("6/minute")
async def backtest(request: Request, data: Regles, current_user: dict = Depends(get_current_user)):
    """Rejoue la stratégie sur des années de cours réels."""
    regles = S.normaliser(data.regles)
    avis = S.verifier(regles)
    if S.bloquante(avis):
        return {"regles": regles, "avis": avis, "bloquante": True, "resultat": None}
    periode, intervalle = _PERIODE[regles["unite"]]
    loop = asyncio.get_running_loop()

    async def un(symbol: str) -> dict:
        try:
            hist = await fetch_ohlcv(symbol, period=periode, interval=intervalle)
        except Exception:
            hist = None
        if hist is None or len(hist) < 80:
            return {"symbol": symbol, "trades": [], "erreur": "Pas assez de cours pour cet actif."}
        return await loop.run_in_executor(None, S.rejouer, hist, regles, symbol)

    par_actif = await asyncio.gather(*[un(a) for a in regles["actifs"]])
    resultat = S.synthese(par_actif, regles)
    resultat["par_actif"] = [{
        "symbol": r["symbol"], "trades": len(r.get("trades") or []),
        "r_total": round(sum(t["r"] for t in r.get("trades") or []), 2),
        "debut": r.get("debut"), "fin": r.get("fin"), "erreur": r.get("erreur"),
    } for r in par_actif]
    return {"regles": regles, "avis": avis, "bloquante": False, "resultat": resultat,
            "description": _decrire(regles)}


class Film(BaseModel):
    regles: dict
    symbol: str


@router.post("/film")
@limiter.limit("12/minute")
async def film(request: Request, data: Film, current_user: dict = Depends(get_current_user)):
    """Le détail bougie par bougie d'un actif, pour rejouer le test pas à pas."""
    regles = S.normaliser(data.regles)
    if S.bloquante(S.verifier(regles)):
        raise HTTPException(status_code=400, detail="Corrigez d'abord les erreurs que Nimbo signale.")
    symbol = data.symbol.strip().upper()[:20]
    periode, intervalle = _PERIODE[regles["unite"]]
    try:
        hist = await fetch_ohlcv(symbol, period=periode, interval=intervalle)
    except Exception:
        hist = None
    if hist is None or len(hist) < 80:
        return {"symbol": symbol, "erreur": "Pas assez de cours pour cet actif."}
    return await asyncio.get_running_loop().run_in_executor(None, S.film, hist, regles, symbol)


@router.get("")
async def lister(current_user: dict = Depends(get_current_user)):
    await _table()
    rows = await execute_query("SELECT * FROM strategies WHERE user_id = ? ORDER BY updated_at DESC",
                               (current_user["id"],)) or []
    return {"strategies": [_lire(r) for r in rows], "max": STRATEGIES_MAX}


@router.post("")
async def sauvegarder(data: Sauvegarde, current_user: dict = Depends(get_current_user)):
    """Enregistre une stratégie (nouvelle, ou modifiée si `id`). Le résumé du
    dernier test est gardé avec elle, s'il est fourni dans `regles._test`."""
    await _table()
    regles = S.normaliser(data.regles)
    avis = S.verifier(regles)
    if S.bloquante(avis):
        raise HTTPException(status_code=400, detail="Corrigez d'abord les erreurs que Nimbo signale.")
    test = data.regles.get("_test")
    test_json = json.dumps(test)[:20000] if isinstance(test, dict) else None
    now = datetime.now(timezone.utc).isoformat()
    uid = current_user["id"]
    if data.id:
        ok = await execute_query("SELECT id FROM strategies WHERE id = ? AND user_id = ?", (data.id, uid))
        if not ok:
            raise HTTPException(status_code=404, detail="Stratégie introuvable.")
        await execute_write(
            "UPDATE strategies SET nom = ?, regles = ?, dernier_test = COALESCE(?, dernier_test), updated_at = ? "
            "WHERE id = ? AND user_id = ?",
            (regles["nom"], json.dumps(regles), test_json, now, data.id, uid))
        sid = data.id
    else:
        n = await execute_query("SELECT COUNT(*) AS n FROM strategies WHERE user_id = ?", (uid,))
        if n and int(n[0]["n"] or 0) >= STRATEGIES_MAX:
            raise HTTPException(status_code=400,
                                detail=f"{STRATEGIES_MAX} stratégies au maximum : supprimez-en une pour en créer une autre.")
        premiere = not (n and int(n[0]["n"] or 0))
        await execute_write(
            "INSERT INTO strategies (user_id, nom, regles, active, dernier_test, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uid, regles["nom"], json.dumps(regles), 1 if premiere else 0, test_json, now, now))
        r = await execute_query("SELECT id FROM strategies WHERE user_id = ? ORDER BY id DESC LIMIT 1", (uid,))
        sid = r[0]["id"]
    row = await execute_query("SELECT * FROM strategies WHERE id = ?", (sid,))
    return {"strategie": _lire(row[0])}


@router.delete("/{sid}")
async def supprimer(sid: int, current_user: dict = Depends(get_current_user)):
    await _table()
    await execute_write("DELETE FROM strategies WHERE id = ? AND user_id = ?", (sid, current_user["id"]))
    return {"ok": True}


@router.post("/{sid}/activer")
async def activer(sid: int, current_user: dict = Depends(get_current_user)):
    """Une seule stratégie active : celle que Nimbo applique sur le site.
    Réactiver la stratégie déjà active la désactive."""
    await _table()
    uid = current_user["id"]
    row = await execute_query("SELECT active FROM strategies WHERE id = ? AND user_id = ?", (sid, uid))
    if not row:
        raise HTTPException(status_code=404, detail="Stratégie introuvable.")
    deja = bool(row[0].get("active"))
    await execute_write("UPDATE strategies SET active = 0 WHERE user_id = ?", (uid,))
    if not deja:
        await execute_write("UPDATE strategies SET active = 1 WHERE id = ? AND user_id = ?", (sid, uid))
    return {"active": not deja}


@router.get("/active/signal")
@limiter.limit("30/minute")
async def signal(request: Request, symbol: str, current_user: dict = Depends(get_current_user)):
    """La stratégie active se déclenche-t-elle sur cet actif aujourd'hui ?"""
    await _table()
    rows = await execute_query("SELECT * FROM strategies WHERE user_id = ? AND active = 1 LIMIT 1",
                               (current_user["id"],))
    if not rows:
        return {"strategie": None}
    st = _lire(rows[0])
    symbol = symbol.strip().upper()[:20]
    periode, intervalle = ("2y", "1d") if st["regles"]["unite"] == "1d" else ("10y", "1wk")
    try:
        hist = await fetch_ohlcv(symbol, period=periode, interval=intervalle)
    except Exception:
        hist = None
    if hist is None or len(hist) < 60:
        return {"strategie": {"id": st["id"], "nom": st["nom"]}, "signal": {"possible": False,
                "raison": "Pas assez de cours pour appliquer la stratégie à cet actif."}}
    sig = await asyncio.get_running_loop().run_in_executor(None, S.signal_du_jour, hist, st["regles"], None)
    return {
        "strategie": {"id": st["id"], "nom": st["nom"], "regles": st["regles"],
                      "testee_sur": st["regles"]["actifs"], "dernier_test": st["dernier_test"]},
        "signal": sig,
    }
