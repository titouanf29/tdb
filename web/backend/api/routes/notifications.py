"""Les choix de notification de chacun (services/notifications.py)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..services import notifications as N
from .auth import get_current_user

router = APIRouter()


class Preferences(BaseModel):
    categories: dict = {}
    calme: dict = {}


def _vue(p: dict, admin: bool) -> dict:
    return {
        "categories": [{**{k: c[k] for k in ("id", "label", "detail")},
                        "site_verrouille": bool(c.get("site_verrouille")),
                        **p["categories"][c["id"]]} for c in N.CATEGORIES
                       if admin or not c.get("admin_only")],
        "calme": p["calme"],
    }


@router.get("/preferences")
async def lire(current_user: dict = Depends(get_current_user)):
    return _vue(await N.lire_preferences(current_user["id"]), bool(current_user.get("is_admin")))


@router.put("/preferences")
async def ecrire(data: Preferences, current_user: dict = Depends(get_current_user)):
    return _vue(await N.ecrire_preferences(current_user["id"], data.model_dump()), bool(current_user.get("is_admin")))
