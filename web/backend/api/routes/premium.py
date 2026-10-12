"""
Premium API routes for TDB
Manages premium subscriptions and features
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from ..database import execute_query, execute_write, create_admin_notification
from .auth import get_current_user
from .admin import get_admin_user, log_admin_action, check_if_admin
from ..legal import (MESSAGE_OFFRE_FERMEE, editeur, essai_admin_possible, offre_payante_ouverte,
                     prix_mensuel_centimes, version_cgv)

router = APIRouter()


# ============== MODELS ==============

class PremiumContactRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class PremiumAction(BaseModel):
    user_id: int
    action: str = Field(..., max_length=20)  # grant, revoke
    duration_days: Optional[int] = None  # None = lifetime


class PremiumRequestAction(BaseModel):
    request_id: int
    status: str = Field(..., max_length=20)  # approved, rejected
    response: Optional[str] = Field(default=None, max_length=2000)


class PremiumMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


# ============== PREMIUM FEATURES ==============

# Define what's available for free vs premium users
PREMIUM_FEATURES = {
    "free": {
        "max_positions": 5,
        "max_favorites": 10,
        "ai_messages_per_day": 10,
        "scanner_scans_per_day": 1,      # Free: 1 scan/day
        "backtest_enabled": False,
        "geopolitical_enabled": False,
        "advanced_pivots": False,  # Only standard method
        "per_rankings_limit": 10,
        "economic_calendar_days": 7,
        "alerts_enabled": False,
        "priority_support": False,
    },
    "premium": {
        "max_positions": 50,
        "max_favorites": 100,
        "ai_messages_per_day": -1,       # Unlimited
        "scanner_scans_per_day": -1,     # Premium: unlimited scans
        "backtest_enabled": True,
        "geopolitical_enabled": True,
        "advanced_pivots": True,  # All methods
        "per_rankings_limit": 50,
        "economic_calendar_days": 30,
        "alerts_enabled": True,
        "priority_support": True,
    }
}


# ============== CHECK PREMIUM ==============

async def is_user_premium(user: dict) -> bool:
    """Check if user has premium access (premium user or admin)"""
    user_id = user.get("id")

    # Admins are always premium
    if user.get("is_admin"):
        return True

    # Check database for premium status
    if user_id:
        result = await execute_query(
            "SELECT is_premium, is_admin, premium_expires FROM web_users WHERE id = ?",
            (user_id,)
        )
        if result:
            # Admin = premium
            if result[0].get("is_admin"):
                return True

            # Check premium status
            if result[0].get("is_premium"):
                # Check if premium has expired
                expires = result[0].get("premium_expires")
                if expires:
                    try:
                        exp_date = datetime.fromisoformat(expires.replace("Z", "+00:00"))
                        if exp_date < datetime.now(timezone.utc):
                            # Premium expired — revoke atomically to avoid race conditions.
                            # Only revoke if still marked premium (compare-and-swap pattern).
                            await execute_write(
                                "UPDATE web_users SET is_premium = 0 WHERE id = ? AND is_premium = 1",
                                (user_id,)
                            )
                            return False
                    except (ValueError, TypeError) as e:
                        import logging
                        logging.getLogger(__name__).warning(
                            "Failed to parse premium_expires for user %s: %s", user_id, e
                        )
                        return False
                return True

    return False


# Les réglages d'administration qui écrasent une limite, et laquelle.
_SETTING_MAP = {
    "max_ai_messages_free":      ("ai_messages_per_day",   False),
    "max_ai_messages_premium":   ("ai_messages_per_day",   True),
    "max_positions_free":        ("max_positions",         False),
    "max_positions_premium":     ("max_positions",         True),
    "max_favorites_free":        ("max_favorites",         False),
    "max_favorites_premium":     ("max_favorites",         True),
    "max_scanner_scans_free":    ("scanner_scans_per_day", False),
    "max_scanner_scans_premium": ("scanner_scans_per_day", True),
}


async def effective_limits() -> dict:
    """Les limites RÉELLEMENT appliquées, pour les DEUX formules.

    `get_user_limits` n'en rendait qu'une, celle de l'utilisateur courant.
    La page Premium doit afficher les deux — et elle les écrivait en dur,
    ce qui a fini par mentir : elle annonçait « 3 scans/jour » en gratuit
    quand le moteur en accorde 1. Une grille tarifaire qui contredit le
    produit est pire qu'une grille absente : elle se lit comme une promesse.
    """
    out = {
        "free": dict(PREMIUM_FEATURES["free"]),
        "premium": dict(PREMIUM_FEATURES["premium"]),
    }

    # TANT QU'IL N'Y A RIEN À VENDRE, IL N'Y A RIEN À BRIDER.
    #
    # Ces limites existent pour distinguer une formule payante d'une formule
    # gratuite. L'offre payante est fermée — l'éditeur n'est pas immatriculé,
    # voir api/legal.py — donc elles ne distinguent plus rien : elles privent
    # simplement tout le monde, sans contrepartie et sans recette.
    #
    # Un scan par jour rendait d'ailleurs le scanner difficile à évaluer, y
    # compris pour nous : mesurer un avant/après sur ses résultats demandait
    # de passer le compte de test en Premium.
    #
    # Le retour est automatique : le jour où l'offre rouvre, ce bloc ne
    # s'exécute plus et les limites reprennent leurs valeurs. Rien à se
    # rappeler de faire.
    if not offre_payante_ouverte():
        out["free"] = dict(PREMIUM_FEATURES["premium"])

    try:
        rows = await execute_query(
            "SELECT key, value FROM admin_settings WHERE key IN ("
            "'max_ai_messages_free','max_ai_messages_premium',"
            "'max_positions_free','max_positions_premium',"
            "'max_favorites_free','max_favorites_premium',"
            "'max_scanner_scans_free','max_scanner_scans_premium')"
        )
        for row in (rows or []):
            mapping = _SETTING_MAP.get(row["key"])
            if mapping is None:
                continue
            limit_key, for_premium = mapping
            try:
                out["premium" if for_premium else "free"][limit_key] = int(row["value"])
            except (ValueError, TypeError):
                pass
    except Exception:
        pass  # Fall back to hardcoded defaults on error
    return out


async def get_user_limits(user: dict) -> dict:
    """Les limites de CET utilisateur, réglages d'administration compris.

    La lecture des réglages vivait ici en double avec `effective_limits` —
    même requête, même table de correspondance, recopiée. Deux copies d'une
    règle dérivent : c'est ainsi que la page Premium a fini par annoncer des
    limites que le moteur n'appliquait pas.
    """
    is_premium = await is_user_premium(user)
    limits = await effective_limits()
    return limits["premium" if is_premium else "free"]


async def check_premium_required(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user has premium access"""
    if not await is_user_premium(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette fonctionnalite necessite un abonnement Premium"
        )
    return current_user


# ============== STRIPE : L'ABONNEMENT ==============
#
# Tout le cycle d'un abonnement, et pas seulement l'encaissement :
#
#   · SOUSCRIRE — après acceptation des CGV, gardée en preuve (date et
#     version) ; le pied de facture Stripe porte l'identité de l'entrepreneur
#     et « TVA non applicable, art. 293 B du CGI » ;
#   · RÉSILIER EN TROIS CLICS — exigé depuis le 1er juin 2023 pour un contrat
#     conclu en ligne (code de la consommation, art. L.215-1-1) : effet à la
#     fin du mois payé, réversible jusque-là ;
#   · SE RÉTRACTER — 14 jours après la souscription, remboursement INTÉGRAL.
#     Plus généreux que la loi (qui permettrait de retenir les jours
#     consommés), et c'est voulu : aucune case de renonciation à faire cocher,
#     aucun calcul au prorata à contester ;
#   · LES IMPAYÉS — Stripe relance la carte ; le compte est prévenu, l'accès
#     reste ouvert jusqu'à ce que Stripe renonce ;
#   · LE WEBHOOK — idempotent : Stripe renvoie un événement tant qu'il n'a
#     pas reçu de réponse, il ne doit pas compter deux fois.
#
# Tout reste FERMÉ tant que `offre_payante_ouverte()` dit non (api/legal.py).
# Seule exception : les administrateurs, avec une clé Stripe de TEST, pour
# essayer le parcours complet avec les cartes de test avant l'ouverture.

RETRACTATION_JOURS = 14
_pret_abonnement = False


async def _init_abonnement() -> None:
    global _pret_abonnement
    if _pret_abonnement:
        return
    for col in ("premium_statut", "premium_fin_periode", "premium_souscrit_le", "cgv_acceptees_le", "cgv_version"):
        try:
            await execute_write(f"ALTER TABLE web_users ADD COLUMN {col} TEXT")
        except Exception:
            pass
    await execute_write("""
        CREATE TABLE IF NOT EXISTS stripe_evenements (
            id TEXT PRIMARY KEY,
            type TEXT,
            recu_le TEXT
        )
    """)
    _pret_abonnement = True


def _stripe():
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
    return stripe


def _d(o):
    """Un objet Stripe en dict ordinaire. Depuis stripe-python 8, les objets
    ne sont plus des dict : `.get()` lève une AttributeError — c'est ainsi
    que l'ancien webhook aurait échoué sur le premier paiement réel."""
    if o is None:
        return None
    return o.to_dict() if hasattr(o, "to_dict") else o


def _prix_texte() -> str:
    c = prix_mensuel_centimes()
    return (f"{c // 100} €" if c % 100 == 0 else f"{c / 100:.2f} €".replace(".", ","))


def _pied_de_facture() -> str:
    """Ce que chaque facture Stripe doit porter : l'entrepreneur, son SIREN,
    son adresse, et la mention de franchise de TVA."""
    e = editeur()
    morceaux = [e["identite"], e["adresse"], f"SIREN {e['siren']}" if e["siren"] else "", e["mention_tva"]]
    return " — ".join(m for m in morceaux if m)


def _ts_iso(ts) -> Optional[str]:
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat() if ts else None
    except (TypeError, ValueError):
        return None


def _fin_de_periode(sub) -> Optional[str]:
    """La fin de la période payée. Selon la version de l'API Stripe, elle est
    sur l'abonnement ou sur sa ligne : les deux sont lues."""
    if not sub:
        return None
    fin = sub.get("current_period_end")
    if not fin:
        try:
            fin = sub["items"]["data"][0].get("current_period_end")
        except (KeyError, IndexError, TypeError):
            fin = None
    return _ts_iso(fin)


def _abonnement_de_facture(invoice) -> Optional[str]:
    sid = invoice.get("subscription")
    if not sid:
        try:
            sid = invoice["parent"]["subscription_details"]["subscription"]
        except (KeyError, TypeError):
            sid = None
    return sid if isinstance(sid, str) else (sid or {}).get("id") if sid else None


async def _utilisateur_stripe(subscription_id: Optional[str] = None, customer_id: Optional[str] = None,
                              user_id: Optional[str] = None) -> Optional[dict]:
    if user_id:
        r = await execute_query("SELECT * FROM web_users WHERE id = ?", (int(user_id),))
        if r:
            return r[0]
    if subscription_id:
        r = await execute_query("SELECT * FROM web_users WHERE stripe_subscription_id = ?", (subscription_id,))
        if r:
            return r[0]
    if customer_id:
        r = await execute_query("SELECT * FROM web_users WHERE stripe_customer_id = ?", (customer_id,))
        if r:
            return r[0]
    return None


async def _peut_payer(user: dict) -> bool:
    if offre_payante_ouverte():
        return True
    return essai_admin_possible() and await check_if_admin(user)


class Souscription(BaseModel):
    accepte_cgv: bool = False


@router.post("/checkout")
async def create_checkout_session(data: Souscription = Souscription(),
                                  current_user: dict = Depends(get_current_user)):
    """Ouvre le paiement Stripe de l'abonnement mensuel."""
    # LE VERROU D'ABORD, AVANT TOUTE CHOSE (voir api/legal.py).
    if not await _peut_payer(current_user):
        raise HTTPException(status_code=503, detail=MESSAGE_OFFRE_FERMEE)
    if not data.accepte_cgv:
        raise HTTPException(status_code=400, detail="Acceptez les conditions générales de vente pour continuer.")
    await _init_abonnement()

    user_id = current_user["id"]
    row = (await execute_query("SELECT * FROM web_users WHERE id = ?", (user_id,)) or [{}])[0]
    if row.get("stripe_subscription_id") and row.get("premium_statut") in ("active", "annulation_programmee", "impaye"):
        raise HTTPException(status_code=400, detail="Vous avez déjà un abonnement en cours.")

    stripe = _stripe()
    front = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    pied = _pied_de_facture()
    try:
        customer_id = row.get("stripe_customer_id")
        if customer_id:
            stripe.Customer.modify(customer_id, invoice_settings={"footer": pied} if pied else {})
        else:
            customer = stripe.Customer.create(
                email=current_user["email"], name=current_user.get("username") or None,
                metadata={"user_id": str(user_id)}, preferred_locales=["fr"],
                invoice_settings={"footer": pied} if pied else {},
            )
            customer_id = customer.id
            await execute_write("UPDATE web_users SET stripe_customer_id = ? WHERE id = ?", (customer_id, user_id))

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": os.getenv("STRIPE_PRICE_ID", ""), "quantity": 1}],
            success_url=f"{front}/premium?bienvenue=1",
            cancel_url=f"{front}/premium?annule=1",
            client_reference_id=str(user_id),
            metadata={"user_id": str(user_id)},
            subscription_data={"metadata": {"user_id": str(user_id)}},
            locale="fr",
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("checkout Stripe impossible : %s", e)
        raise HTTPException(status_code=502, detail="Le paiement n'a pas pu être ouvert. Réessayez dans un instant.")

    # LA PREUVE DE L'ACCEPTATION : la date et la version des CGV acceptées.
    await execute_write("UPDATE web_users SET cgv_acceptees_le = ?, cgv_version = ? WHERE id = ?",
                        (datetime.now(timezone.utc).isoformat(), version_cgv(), user_id))
    return {"url": session.url}


async def _abonnement_courant(current_user: dict) -> dict:
    await _init_abonnement()
    row = (await execute_query("SELECT * FROM web_users WHERE id = ?", (current_user["id"],)) or [{}])[0]
    if not row.get("stripe_subscription_id"):
        raise HTTPException(status_code=404, detail="Aucun abonnement en cours.")
    return row


@router.post("/resilier")
async def resilier(current_user: dict = Depends(get_current_user)):
    """Résilier : effet à la fin du mois payé, plus aucun prélèvement ensuite."""
    row = await _abonnement_courant(current_user)
    stripe = _stripe()
    try:
        sub = _d(stripe.Subscription.modify(row["stripe_subscription_id"], cancel_at_period_end=True))
    except Exception:
        raise HTTPException(status_code=502, detail="La résiliation n'a pas pu être enregistrée. Réessayez.")
    fin = _fin_de_periode(sub) or row.get("premium_expires")
    await execute_write("UPDATE web_users SET premium_statut = 'annulation_programmee', premium_fin_periode = ? WHERE id = ?",
                        (fin, current_user["id"]))
    return {"ok": True, "fin": fin}


@router.post("/reprendre")
async def reprendre(current_user: dict = Depends(get_current_user)):
    """Annuler une résiliation programmée, avant la fin du mois payé."""
    row = await _abonnement_courant(current_user)
    stripe = _stripe()
    try:
        stripe.Subscription.modify(row["stripe_subscription_id"], cancel_at_period_end=False)
    except Exception:
        raise HTTPException(status_code=502, detail="La reprise n'a pas pu être enregistrée. Réessayez.")
    await execute_write("UPDATE web_users SET premium_statut = 'active' WHERE id = ?", (current_user["id"],))
    return {"ok": True}


@router.post("/portail")
async def portail(current_user: dict = Depends(get_current_user)):
    """Le portail Stripe : changer de carte, télécharger ses factures."""
    await _init_abonnement()
    row = (await execute_query("SELECT stripe_customer_id FROM web_users WHERE id = ?", (current_user["id"],)) or [{}])[0]
    if not row.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="Aucun compte de paiement.")
    stripe = _stripe()
    front = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    try:
        s = stripe.billing_portal.Session.create(customer=row["stripe_customer_id"], return_url=f"{front}/premium",
                                                 locale="fr")
    except Exception:
        raise HTTPException(status_code=502, detail="Le portail de paiement n'est pas disponible. Réessayez plus tard.")
    return {"url": s.url}


def _fin_retractation(row: dict) -> Optional[datetime]:
    from datetime import timedelta
    debut = row.get("premium_souscrit_le")
    if not debut:
        return None
    try:
        d = datetime.fromisoformat(str(debut).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d + timedelta(days=RETRACTATION_JOURS)


@router.post("/retractation")
async def retractation(current_user: dict = Depends(get_current_user)):
    """Se rétracter dans les 14 jours : abonnement arrêté et remboursement intégral."""
    row = await _abonnement_courant(current_user)
    fin = _fin_retractation(row)
    if not fin or datetime.now(timezone.utc) > fin:
        raise HTTPException(status_code=400, detail="Le délai de rétractation de 14 jours est dépassé. "
                                                    "Vous pouvez résilier : l'accès reste ouvert jusqu'à la fin du mois payé.")
    stripe = _stripe()
    rembourse = 0
    try:
        # Toutes les factures payées depuis la souscription (une seule, en
        # pratique, sur 14 jours), remboursées en entier.
        for inv in (_d(x) for x in stripe.Invoice.list(subscription=row["stripe_subscription_id"], status="paid", limit=5).data):
            pi = inv.get("payment_intent")
            if not pi:
                try:
                    pays = [_d(x) for x in stripe.InvoicePayment.list(invoice=inv["id"], limit=3).data]
                    pi = next((x["payment"].get("payment_intent") for x in pays if x.get("payment")), None)
                except Exception:
                    pi = None
            if pi:
                stripe.Refund.create(payment_intent=pi if isinstance(pi, str) else pi["id"],
                                     reason="requested_by_customer")
                rembourse += int(inv.get("amount_paid") or 0)
        stripe.Subscription.cancel(row["stripe_subscription_id"])
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("rétractation %s : %s", current_user["id"], e)
        raise HTTPException(status_code=502, detail="Le remboursement n'a pas pu être lancé automatiquement. "
                                                    "Écrivez-nous : il sera fait à la main sous 14 jours.")
    await execute_write("""UPDATE web_users SET is_premium = 0, premium_expires = ?, premium_statut = 'retracte',
                           stripe_subscription_id = NULL WHERE id = ?""",
                        (datetime.now(timezone.utc).isoformat(), current_user["id"]))
    return {"ok": True, "rembourse_centimes": rembourse}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Les événements Stripe (sans authentification — vérifiés par signature)."""
    stripe = _stripe()
    payload = await request.body()
    try:
        stripe.Webhook.construct_event(payload, request.headers.get("stripe-signature", ""),
                                       os.getenv("STRIPE_WEBHOOK_SECRET", ""))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    # Signature vérifiée : on lit le corps comme du JSON ordinaire.
    import json
    event = json.loads(payload)
    await _init_abonnement()

    # Une seule fois par événement : Stripe renvoie tant qu'il n'a pas eu de 2xx.
    if await execute_query("SELECT id FROM stripe_evenements WHERE id = ?", (event["id"],)):
        return {"status": "deja_traite"}
    await traiter_evenement(event)
    await execute_write("INSERT INTO stripe_evenements (id, type, recu_le) VALUES (?, ?, ?)",
                        (event["id"], event["type"], datetime.now(timezone.utc).isoformat()))
    return {"status": "ok"}


async def traiter_evenement(event) -> None:
    from datetime import timedelta
    from ..database import create_user_notification

    t = event["type"]
    obj = event["data"]["object"]
    maintenant = datetime.now(timezone.utc)
    # Deux jours de marge après la fin de période : le renouvellement est
    # payé quelques heures après l'échéance, l'accès ne doit pas clignoter.
    marge = timedelta(days=2)

    def expire(fin_iso: Optional[str]) -> str:
        if fin_iso:
            return (datetime.fromisoformat(fin_iso) + marge).isoformat()
        return (maintenant + timedelta(days=32)).isoformat()

    if t == "checkout.session.completed":
        sid, cid = obj.get("subscription"), obj.get("customer")
        u = await _utilisateur_stripe(sid, cid, (obj.get("metadata") or {}).get("user_id") or obj.get("client_reference_id"))
        if not u:
            return
        fin = None
        try:
            fin = _fin_de_periode(_d(_stripe().Subscription.retrieve(sid))) if sid else None
        except Exception:
            pass
        premiere = not u.get("premium_souscrit_le") or u.get("premium_statut") in (None, "", "retracte", "termine")
        await execute_write("""
            UPDATE web_users SET is_premium = 1, premium_since = COALESCE(premium_since, ?), premium_expires = ?,
                   stripe_customer_id = ?, stripe_subscription_id = ?, premium_statut = 'active',
                   premium_fin_periode = ?, premium_souscrit_le = ?
            WHERE id = ?""",
            (maintenant.isoformat(), expire(fin), cid, sid, fin,
             maintenant.isoformat() if premiere else u.get("premium_souscrit_le"), u["id"]))
        try:
            from ..email_service import send_confirmation_abonnement
            e = editeur()
            ligne = " — ".join(x for x in (e["identite"], e["adresse"], e["email"]) if x) or "CaptenTDB"
            fin_r = (maintenant + timedelta(days=RETRACTATION_JOURS)).strftime("%d/%m/%Y")
            await send_confirmation_abonnement(u["email"], u.get("username") or "", _prix_texte(), fin_r, ligne)
        except Exception as ex:
            import logging
            logging.getLogger(__name__).warning("confirmation d'abonnement non envoyée : %s", ex)
        await create_user_notification(u["id"], "premium", "Bienvenue en Premium",
                                       "Votre abonnement est actif. Vous pouvez le gérer depuis la page Premium.",
                                       "/premium")

    elif t == "invoice.paid":
        sid = _abonnement_de_facture(obj)
        u = await _utilisateur_stripe(sid, obj.get("customer"))
        if not u:
            return
        fin = None
        try:
            fin = _ts_iso(obj["lines"]["data"][0]["period"]["end"])
        except (KeyError, IndexError, TypeError):
            pass
        statut = "annulation_programmee" if u.get("premium_statut") == "annulation_programmee" else "active"
        await execute_write("""UPDATE web_users SET is_premium = 1, premium_expires = ?, premium_fin_periode = ?,
                               premium_statut = ? WHERE id = ?""", (expire(fin), fin, statut, u["id"]))

    elif t == "invoice.payment_failed":
        u = await _utilisateur_stripe(_abonnement_de_facture(obj), obj.get("customer"))
        if not u:
            return
        await execute_write("UPDATE web_users SET premium_statut = 'impaye' WHERE id = ?", (u["id"],))
        await create_user_notification(
            u["id"], "premium", "Le paiement de votre abonnement a échoué",
            "Stripe va réessayer dans les prochains jours. Vérifiez votre carte depuis la page Premium "
            "(« Gérer le paiement ») pour garder l'accès.", "/premium")

    elif t == "customer.subscription.updated":
        u = await _utilisateur_stripe(obj.get("id"), obj.get("customer"))
        if not u:
            return
        fin = _fin_de_periode(obj)
        st = obj.get("status")
        statut = ("annulation_programmee" if obj.get("cancel_at_period_end") or obj.get("cancel_at")
                  else "impaye" if st in ("past_due", "unpaid") else "active" if st in ("active", "trialing")
                  else u.get("premium_statut"))
        await execute_write("UPDATE web_users SET premium_statut = ?, premium_fin_periode = COALESCE(?, premium_fin_periode) WHERE id = ?",
                            (statut, fin, u["id"]))

    elif t in ("customer.subscription.deleted", "customer.subscription.paused"):
        u = await _utilisateur_stripe(obj.get("id"), obj.get("customer"))
        if not u:
            return
        await execute_write("""UPDATE web_users SET is_premium = 0, premium_expires = ?, stripe_subscription_id = NULL,
                               premium_statut = CASE WHEN premium_statut = 'retracte' THEN 'retracte' ELSE 'termine' END
                               WHERE id = ?""", (maintenant.isoformat(), u["id"]))


# ============== USER ROUTES ==============

@router.get("/status")
async def get_premium_status(current_user: dict = Depends(get_current_user)):
    """Get current user's premium status and limits"""
    is_premium = await is_user_premium(current_user)
    limits = await get_user_limits(current_user)

    # Get additional info
    premium_info = None
    if is_premium:
        result = await execute_query(
            "SELECT premium_since, premium_expires FROM web_users WHERE id = ?",
            (current_user["id"],)
        )
        if result:
            premium_info = {
                "since": result[0].get("premium_since"),
                "expires": result[0].get("premium_expires"),  # None = lifetime
            }

    is_admin = await check_if_admin(current_user)

    # L'ABONNEMENT, tel que la page de gestion l'affiche : où il en est, ce
    # que l'on peut encore faire (reprendre, se rétracter), et jusqu'à quand.
    await _init_abonnement()
    row = (await execute_query("SELECT * FROM web_users WHERE id = ?", (current_user["id"],)) or [{}])[0]
    fin_r = _fin_retractation(row)
    abonnement = None
    if row.get("stripe_subscription_id") or row.get("premium_statut"):
        abonnement = {
            "statut": row.get("premium_statut"),
            "en_cours": bool(row.get("stripe_subscription_id")),
            "fin_periode": row.get("premium_fin_periode"),
            "souscrit_le": row.get("premium_souscrit_le"),
            "retractation_jusquau": fin_r.isoformat() if fin_r else None,
            "retractation_possible": bool(fin_r and datetime.now(timezone.utc) <= fin_r and row.get("stripe_subscription_id")),
            "portail": bool(row.get("stripe_customer_id")),
        }

    return {
        "is_premium": is_premium,
        "is_admin": is_admin,
        "limits": limits,
        "premium_info": premium_info,
        "abonnement": abonnement,
        "offre": {
            "ouverte": offre_payante_ouverte(),
            "essai_admin": essai_admin_possible() and is_admin,
            "prix_centimes": prix_mensuel_centimes(),
        },
        "features": {
            "free": PREMIUM_FEATURES["free"],
            "premium": PREMIUM_FEATURES["premium"],
        }
    }


@router.get("/features")
async def get_features_comparison():
    """Get comparison of free vs premium features (public).

    Les limites EFFECTIVES, réglages d'administration compris. Cet endpoint
    rendait les constantes du fichier : un administrateur qui relevait une
    limite la voyait appliquée partout sauf sur la page qui l'annonce.
    """
    limits = await effective_limits()
    return {
        "free": limits["free"],
        "premium": limits["premium"],
        "benefits": [
            {
                "icon": "rocket",
                "title": "Positions illimitees",
                "description": "Ouvrez jusqu'a 50 positions simultanees au lieu de 5",
            },
            {
                "icon": "brain",
                "title": "IA illimitee",
                "description": "Acces illimite a l'assistant IA pour vos analyses",
            },
            {
                "icon": "chart",
                "title": "Backtest Manager",
                "description": "Testez vos strategies sur des donnees historiques",
            },
            {
                "icon": "globe",
                "title": "Analyse Geopolitique",
                "description": "Analyses detaillees des risques geopolitiques et leur impact",
            },
            {
                "icon": "target",
                "title": "Pivots Avances",
                "description": "Acces a toutes les methodes: Fibonacci, Woodie, Camarilla, DeMark",
            },
            {
                "icon": "calendar",
                "title": "Calendrier Etendu",
                "description": "Consultez les evenements economiques sur 30 jours",
            },
            {
                "icon": "headphones",
                "title": "Support Prioritaire",
                "description": "Acces direct aux admins pour vos questions",
            },
        ]
    }


@router.post("/contact")
async def contact_for_premium(
    request: PremiumContactRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a request to admins to discuss premium subscription"""

    # Check if user already has a pending request
    existing = await execute_query(
        "SELECT * FROM premium_requests WHERE user_id = ? AND status = 'pending'",
        (current_user["id"],)
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Vous avez deja une demande en attente"
        )

    # Create request
    now = datetime.now(timezone.utc).isoformat()
    await execute_write("""
        INSERT INTO premium_requests (user_id, message, status, created_at)
        VALUES (?, ?, 'pending', ?)
    """, (current_user["id"], request.message, now))

    # Get the new request ID then seed the thread with the first message
    new_req = await execute_query(
        "SELECT id FROM premium_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (current_user["id"],)
    )
    if new_req:
        await execute_write("""
            INSERT INTO premium_request_messages (request_id, sender_id, sender_type, message, created_at)
            VALUES (?, ?, 'user', ?, ?)
        """, (new_req[0]["id"], current_user["id"], request.message, now))

    await create_admin_notification(
        type="premium_request",
        title="Demande Premium",
        message=f"{current_user.get('username', current_user['email'])} souhaite passer Premium",
        link="/admin?tab=premium"
    )

    return {
        "success": True,
        "message": "Votre demande a ete envoyee. Un admin vous contactera bientot."
    }


@router.get("/my-requests")
async def get_my_premium_requests(current_user: dict = Depends(get_current_user)):
    """Get user's premium contact requests"""

    requests = await execute_query("""
        SELECT * FROM premium_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (current_user["id"],))

    return {"requests": requests or []}


# ============== ADMIN ROUTES ==============

@router.get("/admin/requests")
async def get_premium_requests(
    status: str = "all",
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """Get all premium contact requests (admin only)"""
    offset = (page - 1) * limit

    if status == "all":
        requests = await execute_query("""
            SELECT r.*, u.email, u.username
            FROM premium_requests r
            LEFT JOIN web_users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM premium_requests")
    else:
        requests = await execute_query("""
            SELECT r.*, u.email, u.username
            FROM premium_requests r
            LEFT JOIN web_users u ON r.user_id = u.id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        """, (status, limit, offset))
        total = await execute_query(
            "SELECT COUNT(*) as count FROM premium_requests WHERE status = ?",
            (status,)
        )

    return {
        "requests": requests or [],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit
    }


@router.post("/admin/requests/action")
async def process_premium_request(
    data: PremiumRequestAction,
    admin: dict = Depends(get_admin_user)
):
    """Process a premium contact request (admin only)"""

    request = await execute_query(
        "SELECT * FROM premium_requests WHERE id = ?",
        (data.request_id,)
    )

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    await execute_write("""
        UPDATE premium_requests
        SET status = ?, admin_response = ?, processed_at = ?, processed_by = ?
        WHERE id = ?
    """, (data.status, data.response, datetime.now(timezone.utc).isoformat(), admin["id"], data.request_id))

    await log_admin_action(
        admin["id"],
        f"premium_request_{data.status}",
        f"Processed premium request {data.request_id}"
    )

    return {"success": True}


@router.post("/admin/grant")
async def grant_premium(
    data: PremiumAction,
    admin: dict = Depends(get_admin_user)
):
    """Grant or revoke premium status for a user (admin only)"""

    user = await execute_query("SELECT * FROM web_users WHERE id = ?", (data.user_id,))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.action == "grant":
        # Calculate expiration if duration specified
        expires = None
        if data.duration_days:
            from datetime import timedelta
            expires = (datetime.now(timezone.utc) + timedelta(days=data.duration_days)).isoformat()

        await execute_write("""
            UPDATE web_users
            SET is_premium = 1, premium_since = ?, premium_expires = ?
            WHERE id = ?
        """, (datetime.now(timezone.utc).isoformat(), expires, data.user_id))

        await log_admin_action(
            admin["id"],
            "grant_premium",
            f"Granted premium to user {data.user_id}" + (f" for {data.duration_days} days" if data.duration_days else " (lifetime)")
        )

        return {
            "success": True,
            "message": f"Premium accorde a l'utilisateur {data.user_id}" + (f" pour {data.duration_days} jours" if data.duration_days else " (a vie)")
        }

    elif data.action == "revoke":
        # UN ABONNEMENT PAYÉ S'ARRÊTE AUSSI CHEZ STRIPE. Retirer le Premium
        # sans annuler l'abonnement laissait la carte débitée chaque mois
        # pour un accès qui n'existait plus.
        sid = user[0].get("stripe_subscription_id")
        if sid and os.getenv("STRIPE_SECRET_KEY"):
            try:
                _stripe().Subscription.cancel(sid)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"L'abonnement Stripe n'a pas pu être annulé : {e}")
        await execute_write("""
            UPDATE web_users
            SET is_premium = 0, premium_expires = NULL, stripe_subscription_id = NULL,
                premium_statut = CASE WHEN ? IS NULL THEN premium_statut ELSE 'termine' END
            WHERE id = ?
        """, (sid, data.user_id))

        await log_admin_action(
            admin["id"],
            "revoke_premium",
            f"Revoked premium from user {data.user_id}"
        )

        return {
            "success": True,
            "message": f"Premium retire de l'utilisateur {data.user_id}"
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid action")


@router.get("/admin/users")
async def get_premium_users(admin: dict = Depends(get_admin_user)):
    """Get all premium users (admin only)"""

    users = await execute_query("""
        SELECT id, email, username, is_premium, is_admin, premium_since, premium_expires, created_at
        FROM web_users
        WHERE is_premium = 1 OR is_admin = 1
        ORDER BY premium_since DESC
    """)

    return {"users": users or []}


# ============== MESSAGING THREAD ==============

async def _get_request_for_user(request_id: int, user_id: int):
    """Helper: get a premium request ensuring it belongs to this user."""
    req = await execute_query(
        "SELECT * FROM premium_requests WHERE id = ? AND user_id = ?",
        (request_id, user_id)
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req[0]


async def _get_request_messages(request_id: int):
    """Return all messages for a request with sender info."""
    msgs = await execute_query("""
        SELECT m.*, u.username, u.is_admin
        FROM premium_request_messages m
        LEFT JOIN web_users u ON m.sender_id = u.id
        WHERE m.request_id = ?
        ORDER BY m.created_at ASC
    """, (request_id,))
    return msgs or []


@router.get("/requests/{request_id}/messages")
async def get_request_messages(
    request_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get the conversation thread for a premium request (user view)."""
    await _get_request_for_user(request_id, current_user["id"])
    messages = await _get_request_messages(request_id)
    # Mark admin messages as read
    await execute_write("""
        UPDATE premium_request_messages
        SET is_read = 1
        WHERE request_id = ? AND sender_type = 'admin' AND is_read = 0
    """, (request_id,))
    return {"messages": messages}


@router.post("/requests/{request_id}/messages")
async def send_user_message(
    request_id: int,
    body: PremiumMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """User sends a follow-up message in their premium request thread."""
    await _get_request_for_user(request_id, current_user["id"])
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    await execute_write("""
        INSERT INTO premium_request_messages (request_id, sender_id, sender_type, message, created_at)
        VALUES (?, ?, 'user', ?, ?)
    """, (request_id, current_user["id"], body.message.strip(), datetime.now(timezone.utc).isoformat()))

    await create_admin_notification(
        type="premium_message",
        title="Nouveau message premium",
        message=f"{current_user.get('username', current_user['email'])} a repondu a sa demande Premium #{request_id}",
        link="/admin?tab=premium"
    )
    return {"success": True}


@router.get("/admin/requests/{request_id}/messages")
async def admin_get_request_messages(
    request_id: int,
    admin: dict = Depends(get_admin_user)
):
    """Admin gets the full conversation thread for a premium request."""
    req = await execute_query("SELECT * FROM premium_requests WHERE id = ?", (request_id,))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    messages = await _get_request_messages(request_id)
    # Mark user messages as read by admin
    await execute_write("""
        UPDATE premium_request_messages
        SET is_read = 1
        WHERE request_id = ? AND sender_type = 'user' AND is_read = 0
    """, (request_id,))
    return {"messages": messages, "request": req[0]}


@router.post("/admin/requests/{request_id}/messages")
async def admin_send_message(
    request_id: int,
    body: PremiumMessageRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin sends a message in a premium request thread."""
    req = await execute_query(
        "SELECT * FROM premium_requests WHERE id = ?", (request_id,)
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    await execute_write("""
        INSERT INTO premium_request_messages (request_id, sender_id, sender_type, message, created_at)
        VALUES (?, ?, 'admin', ?, ?)
    """, (request_id, admin["id"], body.message.strip(), datetime.now(timezone.utc).isoformat()))

    return {"success": True}


@router.get("/admin/requests/{request_id}/unread")
async def get_unread_count(request_id: int, admin: dict = Depends(get_admin_user)):
    """Get count of unread user messages for a request."""
    result = await execute_query("""
        SELECT COUNT(*) as count FROM premium_request_messages
        WHERE request_id = ? AND sender_type = 'user' AND is_read = 0
    """, (request_id,))
    return {"unread": result[0]["count"] if result else 0}
