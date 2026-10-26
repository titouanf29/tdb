"""L'éditeur du site, pour les pages légales — et la liste de contrôle
d'ouverture du Premium, pour l'administration (voir api/legal.py)."""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends

from ..legal import (editeur, essai_admin_possible, liste_de_controle, offre_payante_ouverte,
                     prix_mensuel_centimes, stripe_en_test, version_cgv)
from .admin import get_admin_user

router = APIRouter()


@router.get("/editeur")
async def editeur_public():
    """Public : ce que les mentions légales et les CGV publient."""
    e = editeur()
    ouverte = offre_payante_ouverte()
    if e["statut"] == "non_immatricule":
        # Le pseudonyme suffit à l'éditeur non professionnel : rien d'autre
        # ne sort, même si des variables ont été posées en avance.
        e = {**e, "identite": "", "adresse": "", "email": "", "telephone": "", "siren": "", "rcs": "",
             "tva_intracom": ""}
    return {**e, "offre_ouverte": ouverte, "prix_centimes": prix_mensuel_centimes(), "cgv_version": version_cgv()}


@router.get("/ouverture")
async def ouverture(admin: dict = Depends(get_admin_user)):
    """Admin : tout ce qui manque avant de pouvoir encaisser, et l'état réel de Stripe."""
    items = liste_de_controle()
    stripe_etat = None
    if os.getenv("STRIPE_SECRET_KEY") and os.getenv("STRIPE_PRICE_ID"):
        try:
            import stripe
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            p = stripe.Price.retrieve(os.getenv("STRIPE_PRICE_ID")).to_dict()
            rec = p.get("recurring") or {}
            stripe_etat = {
                "joignable": True,
                "montant_centimes": p.get("unit_amount"),
                "devise": p.get("currency"),
                "intervalle": rec.get("interval"),
                "actif": p.get("active"),
            }
            items.append({
                "cle": "stripe_coherence", "libelle": "Prix Stripe = prix affiché, mensuel, en euros",
                "ok": (p.get("unit_amount") == prix_mensuel_centimes() and p.get("currency") == "eur"
                       and rec.get("interval") == "month" and bool(p.get("active"))),
                "comment": "Le prix Stripe doit être actif, en EUR, mensuel, et égal à PREMIUM_PRIX_MENSUEL.",
            })
        except Exception as e:
            stripe_etat = {"joignable": False, "erreur": str(e)[:200]}
    api = (os.getenv("API_PUBLIC_URL") or "").rstrip("/") or "https://<adresse-de-l-api>"
    return {
        "ouverte": offre_payante_ouverte(),
        "mode_test": stripe_en_test(),
        "essai_admin": essai_admin_possible(),
        "liste": items,
        "stripe": stripe_etat,
        "webhook_url": f"{api}/api/premium/webhook",
        "evenements_webhook": ["checkout.session.completed", "invoice.paid", "invoice.payment_failed",
                               "customer.subscription.updated", "customer.subscription.deleted"],
    }
