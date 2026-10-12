"""Abonner un appareil aux notifications push (voir services/push.py)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from ..services import push
from .auth import get_current_user

router = APIRouter()


class Cles(BaseModel):
    p256dh: str
    auth: str


class Abonnement(BaseModel):
    endpoint: str
    keys: Cles


class Desabonnement(BaseModel):
    endpoint: str


@router.get("/cle")
async def cle():
    """La clé publique VAPID, ou null : sans elle, le site ne propose pas les notifications."""
    return {"cle": push.cle_publique() if push.actif() else None}


@router.post("/abonnement")
async def abonner(a: Abonnement, current_user: dict = Depends(get_current_user)):
    await push.init()
    if not a.endpoint.startswith("https://"):
        return {"ok": False}
    # Un même appareil réabonné (autre compte, clés renouvelées) remplace
    # l'ancien enregistrement plutôt que de s'y ajouter.
    await execute_write("DELETE FROM push_abonnements WHERE endpoint = ?", (a.endpoint,))
    await execute_write(
        "INSERT INTO push_abonnements (user_id, endpoint, p256dh, auth, cree_le) VALUES (?, ?, ?, ?, ?)",
        (current_user["id"], a.endpoint, a.keys.p256dh, a.keys.auth, datetime.now(timezone.utc).isoformat()))
    return {"ok": True}


@router.delete("/abonnement")
async def desabonner(d: Desabonnement, current_user: dict = Depends(get_current_user)):
    await push.init()
    await execute_write("DELETE FROM push_abonnements WHERE endpoint = ? AND user_id = ?",
                        (d.endpoint, current_user["id"]))
    return {"ok": True}


@router.get("/etat")
async def etat(current_user: dict = Depends(get_current_user)):
    await push.init()
    n = await execute_query("SELECT COUNT(*) AS n FROM push_abonnements WHERE user_id = ?", (current_user["id"],))
    return {"actif": push.actif(), "appareils": int((n or [{"n": 0}])[0]["n"])}


@router.post("/essai")
async def essai(current_user: dict = Depends(get_current_user)):
    """Une notification d'essai sur ses propres appareils."""
    n = await push.envoyer(current_user["id"], "Nimbo est là",
                           "Les notifications fonctionnent : je vous préviendrai quand je propose un achat "
                           "sur un de vos favoris.", "/favorites")
    return {"envoyees": n}
