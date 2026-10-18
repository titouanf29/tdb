"""Le pont avec CaptenTDB Studio : ce qui a été publié sur TikTok.

Le Studio (dépôt JarvisPC, sur le VPS) gère la publication des vidéos. Il
envoie ici, régulièrement, la liste des leçons avec leur statut (publiée,
programmée, prête) et le plan de la série. Rien de TikTok ne s'affiche sur le
site, ni vues ni abonnés, et rien de tout cela n'est demandé : le pont sert
seulement à savoir quelles leçons ont été vues sur TikTok, pour que l'onglet
Apprendre les couvre et qu'un visiteur venu d'une vidéo retrouve sa leçon.

Le Studio s'authentifie avec une clé partagée (PONT_TIKTOK_CLE, dans Railway
et dans les réglages du Studio). Sans clé configurée, le pont est fermé.
"""

from __future__ import annotations

import hmac
import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from ..database import execute_query, execute_write
from .admin import get_admin_user

router = APIRouter()

STATUTS = ("publiee", "programmee", "prete")


class VideoPont(BaseModel):
    id: str = Field(max_length=80)
    numero: Optional[int] = None
    partie: Optional[int] = None
    titre: str = Field(default="", max_length=200)
    statut: str = Field(default="prete", max_length=20)
    date: Optional[str] = Field(default=None, max_length=40)


class LeconPlan(BaseModel):
    numero: int
    titre: str = Field(default="", max_length=200)
    apprend: str = Field(default="", max_length=4000)
    mots: str = Field(default="", max_length=1000)
    a_ecrire: bool = False


class Envoi(BaseModel):
    videos: list[VideoPont] = Field(default_factory=list, max_length=500)
    plan: list[LeconPlan] = Field(default_factory=list, max_length=300)


async def _table() -> None:
    await execute_write("""
        CREATE TABLE IF NOT EXISTS pont_tiktok (
            cle TEXT PRIMARY KEY,
            valeur TEXT NOT NULL,
            maj TEXT NOT NULL
        )
    """)


def _cle_valide(recue: Optional[str]) -> bool:
    attendue = os.getenv("PONT_TIKTOK_CLE", "").strip()
    if len(attendue) < 24:
        # Une clé absente ou trop courte ferme le pont : mieux vaut un pont
        # fermé qu'un pont que n'importe qui peut remplir.
        raise HTTPException(status_code=503, detail="Pont non configuré.")
    return bool(recue) and hmac.compare_digest(recue.strip(), attendue)


@router.post("/tiktok")
async def recevoir(data: Envoi, x_pont_cle: Optional[str] = Header(default=None)):
    """Le Studio envoie l'état de la série : remplace le précédent."""
    if not _cle_valide(x_pont_cle):
        raise HTTPException(status_code=401, detail="Clé refusée.")
    await _table()
    # Seules les leçons comptent pour Apprendre ; les édits et le point sur
    # l'or n'ont pas de leçon à couvrir.
    videos = [v.model_dump() for v in data.videos if v.id.startswith("lecon-")]
    for v in videos:
        if v["statut"] not in STATUTS:
            v["statut"] = "prete"
    etat = {"videos": videos, "plan": [p.model_dump() for p in data.plan]}
    maintenant = datetime.now(timezone.utc).isoformat(timespec="seconds")
    await execute_write("DELETE FROM pont_tiktok WHERE cle = ?", ("etat",))
    await execute_write("INSERT INTO pont_tiktok (cle, valeur, maj) VALUES (?, ?, ?)",
                        ("etat", json.dumps(etat, ensure_ascii=False), maintenant))
    return {"ok": True, "lecons": len(videos), "plan": len(etat["plan"])}


@router.get("/tiktok")
async def lire(admin: dict = Depends(get_admin_user)):
    """Pour l'admin : ce que le Studio a envoyé en dernier."""
    await _table()
    rows = await execute_query("SELECT valeur, maj FROM pont_tiktok WHERE cle = ?", ("etat",))
    configure = len(os.getenv("PONT_TIKTOK_CLE", "").strip()) >= 24
    if not rows:
        return {"configure": configure, "maj": None, "videos": [], "plan": []}
    try:
        etat = json.loads(rows[0]["valeur"])
    except ValueError:
        etat = {"videos": [], "plan": []}
    return {"configure": configure, "maj": rows[0]["maj"], **etat}
