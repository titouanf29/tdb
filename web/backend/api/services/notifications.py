"""Toutes les notifications passent par ici.

Avant, chaque module écrivait sa ligne dans `user_notifications` et appelait
le push à sa façon : le wallet, la macro, Nimbo, l'administration. Personne ne
pouvait donc choisir ce qu'il recevait, et une même clôture pouvait être
annoncée deux fois. Ici, une seule porte, qui fait trois choses dans l'ordre :

  1. elle range la notification dans une CATÉGORIE (positions, alertes,
     Nimbo, macro, support, compte) ;
  2. elle applique les choix de la personne, par catégorie et par canal :
     dans le site (la cloche), sur ses appareils (le push), avec des heures
     calmes pendant lesquelles les appareils restent muets ;
  3. elle évite les doublons : un événement porte une clé (« position:42 »,
     « alerte:7 »), et une clé déjà annoncée ne l'est pas deux fois.

Elle ne lève jamais : une notification ratée ne doit pas faire échouer ce
qui l'a déclenchée (une clôture de position, une réponse au support).
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from ..database import USE_POSTGRES, execute_query, execute_write

logger = logging.getLogger(__name__)
PARIS = ZoneInfo("Europe/Paris")

CATEGORIES: list[dict] = [
    {"id": "positions", "label": "Mes positions",
     "detail": "Un stop, un objectif ou une liquidation ferme une de vos positions, même quand vous n'êtes pas sur le site.",
     "types": ["position_closed"]},
    {"id": "alertes", "label": "Alertes de prix",
     "detail": "Un actif franchit le seuil que vous avez posé.",
     "types": ["price_alert"]},
    {"id": "nimbo", "label": "Propositions de Nimbo",
     "detail": "Nimbo propose une position sur un de vos favoris, au plus une fois par actif et par jour.",
     "types": ["nimbo"]},
    {"id": "strategie", "label": "Ma stratégie",
     "detail": "Votre stratégie active se déclenche sur un de ses actifs ou un de vos favoris, une fois par bougie.",
     "types": ["strategie"]},
    {"id": "macro", "label": "Annonces économiques",
     "detail": "Une heure avant une décision de banque centrale qui touche vos positions, puis ce qu'elle change.",
     "types": ["macro"]},
    {"id": "support", "label": "Réponses de l'équipe",
     "detail": "L'équipe répond à une de vos demandes, ou à une demande d'actif.",
     "types": ["ticket_reply", "asset_request"]},
    {"id": "compte", "label": "Compte et Premium",
     "detail": "Votre abonnement et la sécurité de votre compte. Ils restent toujours dans le site.",
     "types": ["premium", "compte"], "site_verrouille": True},
    {"id": "admin", "label": "Administration",
     "detail": "Chaque nouvelle inscription, avec un lien vers la fiche du compte. Réservé à l'équipe.",
     "types": ["admin_inscription"], "admin_only": True},
]
_PAR_TYPE = {t: c["id"] for c in CATEGORIES for t in c["types"]}
_IDS = [c["id"] for c in CATEGORIES]

DEFAUT_CALME = {"actif": False, "debut": 22, "fin": 8}

_pret = False


async def init() -> None:
    global _pret
    if _pret:
        return
    await execute_write("""
        CREATE TABLE IF NOT EXISTS notif_preferences (
            user_id INTEGER PRIMARY KEY,
            reglages TEXT NOT NULL,
            maj TEXT NOT NULL
        )
    """)
    # La clé d'un événement, pour ne jamais l'annoncer deux fois.
    try:
        if USE_POSTGRES:
            await execute_write("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS cle TEXT")
        else:
            await execute_write("ALTER TABLE user_notifications ADD COLUMN cle TEXT")
    except Exception:
        pass  # la colonne existe déjà
    try:
        await execute_write("CREATE INDEX IF NOT EXISTS idx_user_notif_cle ON user_notifications (user_id, cle)")
    except Exception:
        pass
    _pret = True


def categorie_de(type_: str) -> str:
    return _PAR_TYPE.get(type_, "compte")


def _defaut() -> dict:
    return {"categories": {i: {"site": True, "appareil": True} for i in _IDS}, "calme": dict(DEFAUT_CALME)}


def normaliser(brut: dict | None) -> dict:
    """Des réglages complets et valides, quoi qu'on reçoive."""
    p = _defaut()
    brut = brut if isinstance(brut, dict) else {}
    cats = brut.get("categories") if isinstance(brut.get("categories"), dict) else {}
    for c in CATEGORIES:
        v = cats.get(c["id"]) if isinstance(cats.get(c["id"]), dict) else {}
        p["categories"][c["id"]] = {
            "site": True if c.get("site_verrouille") else bool(v.get("site", True)),
            "appareil": bool(v.get("appareil", True)),
        }
    calme = brut.get("calme") if isinstance(brut.get("calme"), dict) else {}
    try:
        debut = int(calme.get("debut", DEFAUT_CALME["debut"])) % 24
        fin = int(calme.get("fin", DEFAUT_CALME["fin"])) % 24
    except (TypeError, ValueError):
        debut, fin = DEFAUT_CALME["debut"], DEFAUT_CALME["fin"]
    p["calme"] = {"actif": bool(calme.get("actif", False)) and debut != fin, "debut": debut, "fin": fin}
    return p


async def lire_preferences(user_id: int) -> dict:
    await init()
    try:
        r = await execute_query("SELECT reglages FROM notif_preferences WHERE user_id = ?", (int(user_id),))
        return normaliser(json.loads(r[0]["reglages"]) if r else None)
    except Exception as e:
        logger.info("préférences illisibles pour %s : %s", user_id, e)
        return _defaut()


async def ecrire_preferences(user_id: int, brut: dict) -> dict:
    await init()
    p = normaliser(brut)
    maintenant = datetime.now(timezone.utc).isoformat()
    await execute_write("DELETE FROM notif_preferences WHERE user_id = ?", (int(user_id),))
    await execute_write("INSERT INTO notif_preferences (user_id, reglages, maj) VALUES (?, ?, ?)",
                        (int(user_id), json.dumps(p), maintenant))
    return p


def en_heures_calmes(calme: dict, quand: datetime | None = None) -> bool:
    if not calme.get("actif"):
        return False
    h = (quand or datetime.now(PARIS)).astimezone(PARIS).hour
    debut, fin = calme["debut"], calme["fin"]
    return (debut <= h < fin) if debut < fin else (h >= debut or h < fin)


async def notifier(user_id, type_: str, titre: str, message: str, lien: str | None = None,
                   cle: str | None = None) -> bool:
    """Annonce un événement à une personne, selon ses choix. Rend True si
    quelque chose a été rangé dans le site ou envoyé à ses appareils."""
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        return False
    try:
        await init()
        if cle:
            deja = await execute_query(
                "SELECT id FROM user_notifications WHERE user_id = ? AND cle = ? LIMIT 1", (uid, cle))
            if deja:
                return False
        prefs = await lire_preferences(uid)
        choix = prefs["categories"][categorie_de(type_)]
        fait = False
        if choix["site"]:
            await execute_write(
                """INSERT INTO user_notifications (user_id, type, title, message, link, is_read, created_at, cle)
                   VALUES (?, ?, ?, ?, ?, 0, ?, ?)""",
                (uid, type_, titre, message, lien, datetime.now(timezone.utc).isoformat(), cle))
            fait = True
        if choix["appareil"] and not en_heures_calmes(prefs["calme"]):
            from . import push
            if push.actif():
                push.envoyer_plus_tard(uid, titre, message, lien)
                fait = True
        return fait
    except Exception as e:
        logger.warning("notification non écrite (%s, %s) : %s", user_id, type_, e)
        return False
