"""Le suivi RÉEL des propositions de Nimbo.

« Sur 10 achats comparables, 2 atteignent l'objectif » vient d'un rejeu sur
le passé (_calibrage.py). Un rejeu peut mentir sans le vouloir : un biais
qu'on n'a pas vu, un marché qui a changé. La seule réponse est de noter
chaque proposition au moment où elle est faite, puis de regarder ce qui lui
est arrivé — objectif, stop ou échéance — avec les mêmes règles que le
rejeu : stop supposé touché en premier dans une bougie ambiguë, ouverture
au-delà d'une barrière exécutée à l'ouverture, 0,1 % de frais par côté.

UNE proposition par actif, par horizon et par jour : dix personnes qui
analysent LVMH le même matin ne font pas dix propositions.

Le suivi est GLOBAL — c'est le bilan du moteur, pas d'un utilisateur — et
public : un simulateur qui affiche ses promesses doit afficher ce qu'elles
sont devenues.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from fastapi import APIRouter

from ..database import USE_POSTGRES, execute_query, execute_write
from ._backtest import _walk_barriers
from ._calibrage import CALIBRAGE, sur_dix
from ._prices import fetch_ohlcv

logger = logging.getLogger(__name__)
router = APIRouter()

FRAIS = 0.001                      # par côté, comme le rejeu
SEANCES = {"1d": 20, "3d": 60, "1w": 200}
_pret = False
_derniere_maj = 0.0


async def init() -> None:
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS nimbo_propositions (
            id {cle},
            cle TEXT NOT NULL UNIQUE,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            calibrage TEXT,
            direction TEXT NOT NULL,
            score REAL,
            entree REAL NOT NULL,
            stop REAL NOT NULL,
            objectif REAL NOT NULL,
            cree_le TEXT NOT NULL,
            statut TEXT NOT NULL DEFAULT 'en_cours',
            sortie REAL,
            r REAL,
            seances INTEGER,
            clos_le TEXT
        )
    """)
    try:
        await execute_write("CREATE INDEX IF NOT EXISTS idx_nimbo_statut ON nimbo_propositions(statut)")
    except Exception:
        pass
    _pret = True


async def noter(symbol: str, timeframe: str, direction: str, score: float, entree: float,
                stop: float, objectif: float, seuil_abaisse: bool = False, auteur: int | None = None) -> bool:
    """Enregistre une proposition ; la deuxième du jour sur le même actif est ignorée.

    Rend True pour une proposition NOUVELLE : c'est elle, et elle seule, qui
    prévient ceux qui suivent cet actif."""
    if timeframe not in SEANCES or not (entree and stop and objectif):
        return False
    await init()
    maintenant = datetime.now(timezone.utc)
    cle = f"{symbol.upper()}|{timeframe}|{maintenant.date().isoformat()}"
    calib = "1d_agressif" if (timeframe == "1d" and seuil_abaisse) else timeframe
    try:
        existe = await execute_query("SELECT id FROM nimbo_propositions WHERE cle = ?", (cle,))
        if existe:
            return False
        await execute_write(
            "INSERT INTO nimbo_propositions (cle, symbol, timeframe, calibrage, direction, score, entree, stop, "
            "objectif, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (cle, symbol.upper(), timeframe, calib, direction, float(score), float(entree), float(stop),
             float(objectif), maintenant.isoformat()))
    except Exception as e:     # doublon concurrent, base occupée : la proposition suivante sera notée
        logger.debug("proposition %s non notée : %s", cle, e)
        return False
    if timeframe == "1d":
        await _prevenir_favoris(symbol.upper(), direction, entree, stop, objectif, auteur)
    return True


async def _prevenir_favoris(symbol: str, direction: str, entree: float, stop: float, objectif: float,
                            auteur: int | None = None) -> None:
    """« Nimbo propose un achat sur un de vos favoris » — dans le site, et sur
    les appareils abonnés (database.create_user_notification s'en charge).
    Pas à celui qui a l'analyse sous les yeux : il le voit déjà."""
    from ..database import create_user_notification
    from .market import SYMBOL_NAMES
    try:
        rows = await execute_query("SELECT DISTINCT user_id FROM web_favorites WHERE UPPER(symbol) = ?",
                                   (symbol,)) or []
    except Exception:
        return
    nom = SYMBOL_NAMES.get(symbol, symbol)
    achat = direction != "SHORT"
    gain = abs(objectif - entree) / entree * 100 if entree else 0
    risque = abs(entree - stop) / entree * 100 if entree else 0
    titre = f"Nimbo propose {'un achat' if achat else 'une vente'} sur {nom}"
    message = (f"Un de vos favoris : objectif à +{gain:.1f} %, stop à −{risque:.1f} %. "
               "Argent virtuel — à vous de décider.").replace(".", ",", 2)
    for r in rows:
        if auteur is not None and int(r["user_id"]) == auteur:
            continue
        try:
            await create_user_notification(int(r["user_id"]), "nimbo", titre, message,
                                           f"/analysis?symbol={symbol}")
        except Exception as e:
            logger.debug("favori %s non prévenu : %s", symbol, e)


async def veiller_favoris() -> int:
    """Analyse les favoris des personnes abonnées aux notifications.

    Une proposition n'existe que si quelqu'un ouvre l'analyse ; sans cette
    veille, « Nimbo propose un achat sur un de vos favoris » n'arriverait que
    par hasard. L'analyse passe par l'API elle-même, au nom d'un des abonnés
    qui suivent l'actif : c'est le même moteur, les mêmes portes, la même
    proposition que l'écran — et `noter` prévient tous ceux qui le suivent.
    """
    import os
    import httpx
    from ..services import push
    from .auth import create_access_token, token_payload

    if not push.actif():
        return 0
    await push.init()
    rows = await execute_query(
        """SELECT f.symbol AS symbol, MIN(f.user_id) AS user_id FROM web_favorites f
           JOIN push_abonnements a ON a.user_id = f.user_id GROUP BY f.symbol""") or []
    port = os.getenv("PORT", "8000")
    vus = 0
    async with httpx.AsyncClient(timeout=90.0) as client:
        for r in rows[:60]:
            try:
                u = await execute_query("SELECT * FROM web_users WHERE id = ?", (int(r["user_id"]),))
                if not u:
                    continue
                jeton = create_access_token(token_payload(u[0]))
                await client.get(f"http://127.0.0.1:{port}/api/analysis/{r['symbol']}",
                                 params={"timeframe": "1d", "style": "swing"},
                                 headers={"Authorization": f"Bearer {jeton}", "X-Nimbo-Veille": "1"})
                vus += 1
            except Exception as e:
                logger.info("veille %s : %s", r.get("symbol"), e)
            # L'analyse est limitée à 10 par minute et par adresse : la veille
            # passe sous la limite plutôt que de la heurter.
            await asyncio.sleep(7)
    return vus


def _resultat_r(entree: float, stop: float, sortie: float, achat: bool) -> float:
    risque = abs(entree - stop)
    if risque <= 0:
        return 0.0
    brut = (sortie - entree) if achat else (entree - sortie)
    return round((brut - FRAIS * (entree + sortie)) / risque, 3)


async def mettre_a_jour(force: bool = False) -> int:
    """Clôt les propositions dont l'objectif, le stop ou l'échéance est atteint."""
    global _derniere_maj
    if not force and time.monotonic() - _derniere_maj < 1800:
        return 0
    _derniere_maj = time.monotonic()
    await init()
    ouvertes = await execute_query("SELECT * FROM nimbo_propositions WHERE statut = 'en_cours'") or []
    closes = 0
    for p in ouvertes:
        try:
            hist = await fetch_ohlcv(p["symbol"], period="2y", interval="1d")
            if hist is None or hist.empty:
                continue
            cree = datetime.fromisoformat(str(p["cree_le"]))
            idx = pd.to_datetime(hist.index)
            if getattr(idx, "tz", None) is not None:
                idx = idx.tz_convert(None)
            # Les séances APRÈS celle de la proposition : le cours d'entrée
            # est celui du moment de l'analyse, la séance en cours n'est pas
            # rejouée (on ne sait pas si son plus haut est venu avant).
            apres = np.where(idx.normalize() > pd.Timestamp(cree.date()))[0]
            if len(apres) == 0:
                continue
            debut = int(apres[0])
            horizon = SEANCES[p["timeframe"]]
            achat = p["direction"] != "SHORT"
            h, l, c, o = (hist[k].to_numpy(dtype=float) for k in ("High", "Low", "Close", "Open"))
            # La dernière bougie peut être en cours : elle ne clôt rien.
            fin_utile = len(c) - 1
            issue, sortie, n = _walk_barriers(h[:fin_utile], l[:fin_utile], c[:fin_utile], debut, horizon,
                                              float(p["entree"]), float(p["stop"]), float(p["objectif"]), achat,
                                              opens=o[:fin_utile])
            if issue == "timeout" and n < horizon:
                continue          # ni barrière ni échéance : toujours en cours
            statut = {"target": "objectif", "stop": "stop", "timeout": "echeance"}[issue]
            fin = idx[min(debut + max(n, 1) - 1, len(idx) - 1)]
            await execute_write(
                "UPDATE nimbo_propositions SET statut = ?, sortie = ?, r = ?, seances = ?, clos_le = ? WHERE id = ?",
                (statut, float(sortie), _resultat_r(float(p["entree"]), float(p["stop"]), float(sortie), achat),
                 int(n), pd.Timestamp(fin).isoformat(), p["id"]))
            closes += 1
        except Exception as e:
            logger.warning("suivi %s : %s", p.get("symbol"), e)
    return closes


def _bilan(rows: list[dict], cle: str) -> dict:
    closes = [r for r in rows if r["statut"] != "en_cours"]
    n = len(closes)
    compte = {s: sum(1 for r in closes if r["statut"] == s) for s in ("objectif", "stop", "echeance")}
    rs = [float(r["r"]) for r in closes if r.get("r") is not None]
    attendu = CALIBRAGE.get(cle)
    return {
        "cle": cle,
        "libelle": attendu["libelle"] if attendu else cle,
        "closes": n,
        "en_cours": len(rows) - n,
        "compte": compte,
        "sur_dix": sur_dix(compte["objectif"] / n, compte["stop"] / n) if n else None,
        "r_moyen": round(float(np.mean(rs)), 2) if rs else None,
        # L'incertitude d'une moyenne de n trades : en dessous de 30, le
        # chiffre se lit comme une anecdote, et l'écran le dit.
        "r_erreur": round(float(np.std(rs, ddof=1) / np.sqrt(len(rs))), 2) if len(rs) >= 2 else None,
        "attendu": {"sur_dix": sur_dix(attendu["objectif"], attendu["stop"]), "r_moyen": attendu["r_moyen"]}
        if attendu else None,
    }


@router.get("")
async def suivi():
    """Le bilan des propositions de Nimbo, horizon par horizon, et les dernières."""
    await init()
    try:
        await mettre_a_jour()
    except Exception as e:
        logger.warning("mise à jour du suivi impossible : %s", e)
    rows = await execute_query("SELECT * FROM nimbo_propositions ORDER BY cree_le DESC") or []
    par_cle: dict[str, list] = {}
    for r in rows:
        par_cle.setdefault(r.get("calibrage") or r["timeframe"], []).append(r)
    ordre = [k for k in ("1d", "1d_agressif", "3d", "1w") if k in par_cle]
    depuis = min((r["cree_le"] for r in rows), default=None)
    return {
        "depuis": depuis,
        "total": len(rows),
        "horizons": [_bilan(par_cle[k], k) for k in ordre],
        "dernieres": [{k: r.get(k) for k in ("symbol", "timeframe", "direction", "score", "entree", "stop",
                                            "objectif", "cree_le", "statut", "sortie", "r", "clos_le")}
                      for r in rows[:30]],
    }
