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
from ..legal import MESSAGE_OFFRE_FERMEE, offre_payante_ouverte

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


# ============== STRIPE CHECKOUT ==============

@router.post("/checkout")
async def create_checkout_session(current_user: dict = Depends(get_current_user)):
    """Create a Stripe Checkout session for Premium subscription (5€/month)"""
    import stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # LE VERROU D'ABORD, AVANT TOUTE CHOSE. Tant que l'éditeur n'est pas
    # immatriculé, il n'y a pas d'offre payante : encaisser un abonnement de
    # façon habituelle sans activité déclarée est du travail dissimulé. Le
    # bouton est masqué côté écran, ce qui ne ferme rien — un appel direct à
    # cette route suffisait. Voir api/legal.py.
    if not offre_payante_ouverte():
        raise HTTPException(status_code=503, detail=MESSAGE_OFFRE_FERMEE)

    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        raise HTTPException(status_code=503, detail="Paiement non configuré. Contactez l'administrateur.")

    if await is_user_premium(current_user):
        raise HTTPException(status_code=400, detail="Vous êtes déjà Premium")

    stripe.api_key = STRIPE_SECRET_KEY
    user_id = current_user["id"]

    # Get or create Stripe customer
    result = await execute_query(
        "SELECT stripe_customer_id FROM web_users WHERE id = ?", (user_id,)
    )
    customer_id = result[0].get("stripe_customer_id") if result else None

    if not customer_id:
        customer = stripe.Customer.create(
            email=current_user["email"],
            metadata={"user_id": str(user_id)}
        )
        customer_id = customer.id
        await execute_write(
            "UPDATE web_users SET stripe_customer_id = ? WHERE id = ?",
            (customer_id, user_id)
        )

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}/premium?success=1",
        cancel_url=f"{FRONTEND_URL}/premium?canceled=1",
        metadata={"user_id": str(user_id)},
        locale="fr",
    )

    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (no auth — verified by signature)"""
    import stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    stripe.api_key = STRIPE_SECRET_KEY
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]

    # Payment confirmed → activate Premium
    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        subscription_id = session.get("subscription")
        customer_id = session.get("customer")

        if user_id:
            from datetime import timedelta
            expires = (datetime.now(timezone.utc) + timedelta(days=32)).isoformat()
            await execute_write("""
                UPDATE web_users
                SET is_premium = 1, premium_since = ?, premium_expires = ?,
                    stripe_customer_id = ?, stripe_subscription_id = ?
                WHERE id = ?
            """, (datetime.now(timezone.utc).isoformat(), expires, customer_id, subscription_id, int(user_id)))

    # Subscription renewed → extend expiry
    elif event_type == "invoice.paid":
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        if subscription_id:
            from datetime import timedelta
            expires = (datetime.now(timezone.utc) + timedelta(days=32)).isoformat()
            await execute_write("""
                UPDATE web_users SET is_premium = 1, premium_expires = ?
                WHERE stripe_subscription_id = ?
            """, (expires, subscription_id))

    # Subscription cancelled → revoke Premium
    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        subscription = event["data"]["object"]
        subscription_id = subscription.get("id")
        if subscription_id:
            await execute_write("""
                UPDATE web_users SET is_premium = 0, premium_expires = ?, stripe_subscription_id = NULL
                WHERE stripe_subscription_id = ?
            """, (datetime.now(timezone.utc).isoformat(), subscription_id))

    return {"status": "ok"}


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

    return {
        "is_premium": is_premium,
        "is_admin": is_admin,
        "limits": limits,
        "premium_info": premium_info,
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
        await execute_write("""
            UPDATE web_users
            SET is_premium = 0, premium_expires = NULL
            WHERE id = ?
        """, (data.user_id,))

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
