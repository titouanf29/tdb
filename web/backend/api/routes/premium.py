"""
Premium API routes for TDB
Manages premium subscriptions and features
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..database import execute_query, execute_write
from .auth import get_current_user
from .admin import get_admin_user, log_admin_action

router = APIRouter()


# ============== MODELS ==============

class PremiumContactRequest(BaseModel):
    message: str


class PremiumAction(BaseModel):
    user_id: int
    action: str  # grant, revoke
    duration_days: Optional[int] = None  # None = lifetime


class PremiumRequestAction(BaseModel):
    request_id: int
    status: str  # approved, rejected
    response: Optional[str] = None


# ============== PREMIUM FEATURES ==============

# Define what's available for free vs premium users
PREMIUM_FEATURES = {
    "free": {
        "max_positions": 5,
        "max_favorites": 10,
        "ai_messages_per_day": 10,
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
        "ai_messages_per_day": -1,  # Unlimited
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
                        if exp_date < datetime.utcnow():
                            # Premium expired, revoke it
                            await execute_write(
                                "UPDATE web_users SET is_premium = 0 WHERE id = ?",
                                (user_id,)
                            )
                            return False
                    except:
                        pass
                return True

    return False


async def get_user_limits(user: dict) -> dict:
    """Get feature limits for user based on premium status"""
    is_premium = await is_user_premium(user)
    return PREMIUM_FEATURES["premium"] if is_premium else PREMIUM_FEATURES["free"]


async def check_premium_required(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user has premium access"""
    if not await is_user_premium(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette fonctionnalite necessite un abonnement Premium"
        )
    return current_user


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

    return {
        "is_premium": is_premium,
        "is_admin": current_user.get("is_admin", False),
        "limits": limits,
        "premium_info": premium_info,
        "features": {
            "free": PREMIUM_FEATURES["free"],
            "premium": PREMIUM_FEATURES["premium"],
        }
    }


@router.get("/features")
async def get_features_comparison():
    """Get comparison of free vs premium features (public)"""
    return {
        "free": PREMIUM_FEATURES["free"],
        "premium": PREMIUM_FEATURES["premium"],
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
                "icon": "bell",
                "title": "Alertes Prix",
                "description": "Recevez des alertes quand vos cibles sont atteintes",
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
    await execute_write("""
        INSERT INTO premium_requests (user_id, message, status, created_at)
        VALUES (?, ?, 'pending', datetime('now'))
    """, (current_user["id"], request.message))

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
        SET status = ?, admin_response = ?, processed_at = datetime('now'), processed_by = ?
        WHERE id = ?
    """, (data.status, data.response, admin["id"], data.request_id))

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
            expires = (datetime.utcnow() + timedelta(days=data.duration_days)).isoformat()

        await execute_write("""
            UPDATE web_users
            SET is_premium = 1, premium_since = datetime('now'), premium_expires = ?
            WHERE id = ?
        """, (expires, data.user_id))

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
