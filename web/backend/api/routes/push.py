"""Abonner un appareil aux notifications push (voir services/push.py)."""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..database import execute_query, execute_write
from ..services import push
from .auth import get_current_user, limiter

router = APIRouter()

# LE SERVEUR POSTE VERS L'ADRESSE DE L'ABONNEMENT : elle ne peut donc être que
# celle d'un vrai service de notifications. N'importe quelle adresse https
# était acceptée, et « Essai » faisait envoyer par le serveur des requêtes
# vers des hôtes choisis par l'utilisateur, internes compris.
_SERVICES_PUSH = ("fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com")
_SUFFIXES_PUSH = (".push.services.mozilla.com", ".notify.windows.com", ".push.apple.com")
APPAREILS_MAX = 5


def _service_push_connu(endpoint: str) -> bool:
    try:
        u = urlparse(endpoint)
    except ValueError:
        return False
    hote = (u.hostname or "").lower()
    return (u.scheme == "https" and not u.username and not u.password
            and (hote in _SERVICES_PUSH or hote.endswith(_SUFFIXES_PUSH)))


class Cles(BaseModel):
    p256dh: str
    auth: str


class Abonnement(BaseModel):
    endpoint: str = Field(max_length=1024)
    keys: Cles


class Desabonnement(BaseModel):
    endpoint: str


@router.get("/cle")
async def cle():
    """La clé publique VAPID, ou null : sans elle, le site ne propose pas les notifications."""
    return {"cle": push.cle_publique() if push.actif() else None}


@router.post("/abonnement")
async def abonner(a: Abonnement, request: Request, current_user: dict = Depends(get_current_user)):
    await push.init()
    if not _service_push_connu(a.endpoint):
        raise HTTPException(status_code=400, detail="Adresse de notification non reconnue.")
    n = await execute_query("SELECT COUNT(*) AS n FROM push_abonnements WHERE user_id = ? AND endpoint != ?",
                            (current_user["id"], a.endpoint))
    if n and int(n[0]["n"] or 0) >= APPAREILS_MAX:
        # Le plus ancien laisse sa place : on change de téléphone plus souvent
        # qu'on n'en ajoute un sixième.
        await execute_write(
            "DELETE FROM push_abonnements WHERE id = (SELECT id FROM push_abonnements WHERE user_id = ? "
            "ORDER BY cree_le ASC LIMIT 1)", (current_user["id"],))
    # Un même appareil réabonné (autre compte, clés renouvelées) remplace
    # l'ancien enregistrement plutôt que de s'y ajouter.
    await execute_write("DELETE FROM push_abonnements WHERE endpoint = ?", (a.endpoint,))
    await execute_write(
        "INSERT INTO push_abonnements (user_id, endpoint, p256dh, auth, cree_le, appareil, echecs) "
        "VALUES (?, ?, ?, ?, ?, ?, 0)",
        (current_user["id"], a.endpoint, a.keys.p256dh, a.keys.auth, datetime.now(timezone.utc).isoformat(),
         push.nom_appareil(request.headers.get("user-agent", ""))))
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


@router.get("/appareils")
async def appareils(current_user: dict = Depends(get_current_user)):
    """Les appareils qui reçoivent les notifications de ce compte. L'adresse
    d'abonnement n'est pas renvoyée : elle suffit pour écrire à l'appareil."""
    await push.init()
    rows = await execute_query(
        "SELECT id, appareil, cree_le, dernier_envoi, echecs FROM push_abonnements WHERE user_id = ? "
        "ORDER BY cree_le DESC", (current_user["id"],)) or []
    return {"appareils": [{"id": r["id"], "nom": r.get("appareil") or "Un appareil", "depuis": r["cree_le"],
                           "dernier_envoi": r.get("dernier_envoi"), "echecs": int(r.get("echecs") or 0)}
                          for r in rows]}


@router.delete("/appareils/{aid}")
async def retirer_appareil(aid: int, current_user: dict = Depends(get_current_user)):
    """Ne plus rien envoyer à cet appareil (un téléphone perdu, vendu, prêté)."""
    await push.init()
    await execute_write("DELETE FROM push_abonnements WHERE id = ? AND user_id = ?", (aid, current_user["id"]))
    return {"ok": True}


@router.post("/essai")
@limiter.limit("3/minute")
async def essai(request: Request, current_user: dict = Depends(get_current_user)):
    """Une notification d'essai sur ses propres appareils."""
    n = await push.envoyer(current_user["id"], "Nimbo est là",
                           "Les notifications fonctionnent sur cet appareil. Vous choisissez ce que vous "
                           "recevez dans Réglages, Notifications.", "/settings?section=notifications")
    return {"envoyees": n}
