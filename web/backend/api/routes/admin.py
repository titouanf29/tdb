"""
Admin API routes for TDB
Only whitelisted admin emails can access these routes
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pathlib import Path
import os

from ..database import execute_query, execute_write, create_admin_notification, create_user_notification
from .auth import get_current_user

router = APIRouter()

# Admin whitelist — chargé exclusivement depuis la variable d'environnement ADMIN_EMAILS
# (ex: ADMIN_EMAILS="email1@example.com,email2@example.com")
# Ne jamais mettre d'emails en dur ici.
ADMIN_WHITELIST: list[str] = []

env_admins = os.environ.get("ADMIN_EMAILS", "")
if env_admins:
    ADMIN_WHITELIST.extend([e.strip() for e in env_admins.split(",") if e.strip()])


async def figer_admins() -> None:
    """Une seule fois : inscrit en base les administrateurs que donnaient les
    anciennes règles, avant qu'elles disparaissent.

    LE STATUT D'ADMINISTRATEUR VENAIT DE TROIS SOURCES, DONT DEUX
    DANGEREUSES. « Le premier inscrit », relu à chaque requête, désignait le
    plus petit identifiant ENCORE PRÉSENT : le compte n° 1 supprimé (bouton
    RGPD, ménage d'un admin), le suivant devenait administrateur, même banni.
    Et une adresse de ADMIN_EMAILS sans compte pouvait être prise à
    l'inscription, puisque l'adresse n'y est pas vérifiée.

    Désormais seul `is_admin` compte (plus ADMIN_BOOTSTRAP_*, qui exige aussi
    le mot de passe dans l'environnement). Pour ne déposséder personne, les
    admins que donnaient les anciennes règles sont figés au premier démarrage,
    puis plus jamais recalculés.
    """
    try:
        await execute_write(
            "CREATE TABLE IF NOT EXISTS migrations_securite (cle TEXT PRIMARY KEY, faite_le TEXT NOT NULL)")
        fait = await execute_query("SELECT cle FROM migrations_securite WHERE cle = 'admins_figes'")
        if fait:
            return
        for email in {e.lower().strip() for e in ADMIN_WHITELIST if e.strip()}:
            await execute_write("UPDATE web_users SET is_admin = 1 WHERE LOWER(email) = ?", (email,))
        deja = await execute_query("SELECT id FROM web_users WHERE is_admin = 1 LIMIT 1")
        if not deja:
            premier = await execute_query("SELECT id FROM web_users ORDER BY id ASC LIMIT 1")
            if premier:
                await execute_write("UPDATE web_users SET is_admin = 1 WHERE id = ?", (premier[0]["id"],))
        await execute_write(
            "INSERT INTO migrations_securite (cle, faite_le) VALUES ('admins_figes', ?)",
            (datetime.now(timezone.utc).isoformat(),))
    except Exception as e:
        print(f"⚠️ figer_admins : {e}")


async def check_if_admin(user: dict) -> bool:
    """Administrateur = `is_admin` en base, sur un compte actif. Rien d'autre."""
    user_id = user.get("id")
    if not user_id:
        return False
    try:
        rows = await execute_query("SELECT is_admin, is_active FROM web_users WHERE id = ?", (user_id,))
    except Exception:
        return False
    if not rows:
        return False
    return bool(rows[0].get("is_admin")) and rows[0].get("is_active") not in (0, False)


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Dependency to check if current user is an admin"""
    is_admin = await check_if_admin(current_user)

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )

    return current_user


# ============== MODELS ==============

class BroadcastMessage(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success, error

class ChangelogCreate(BaseModel):
    title: str
    content: str
    version: Optional[str] = None

class UserAction(BaseModel):
    user_id: int
    action: str  # ban, unban, reset_wallet, delete
    reason: Optional[str] = None

class SystemSetting(BaseModel):
    key: str
    value: str

class WalletAdjustment(BaseModel):
    user_id: int
    amount: float
    reason: str


# ============== CHECK ADMIN ==============

@router.get("/check")
async def check_admin_status(current_user: dict = Depends(get_current_user)):
    """Check if current user has admin privileges"""
    user_email = (current_user.get("email") or "").lower()
    is_admin = await check_if_admin(current_user)

    return {
        "is_admin": is_admin,
        "email": user_email if is_admin else None
    }


# ============== ÉTAT DE L'IA ==============

class EmailTestRequest(BaseModel):
    # Vide : l'adresse de l'administrateur connecté — celle qu'on sait lire.
    to: Optional[str] = None


def _etat_email() -> dict:
    """La configuration des e-mails, SANS aucune valeur secrète : seulement
    quelles variables sont posées, et la voie qui en résulte."""
    from .. import email_service as e
    return {
        "fournisseur": e.fournisseur(),
        "expediteur": e.EMAIL_FROM or None,
        "frontend_url": e.FRONTEND_URL,
        "frontend_url_locale": "localhost" in (e.FRONTEND_URL or ""),
        "variables": {
            "BREVO_API_KEY": bool(e.BREVO_API_KEY),
            "RESEND_API_KEY": bool(e.RESEND_API_KEY),
            "SMTP_HOST": bool(e.SMTP_HOST),
            "SMTP_USER": bool(e.SMTP_USER),
            "SMTP_PASSWORD": bool(e.SMTP_PASSWORD),
            "EMAIL_FROM": bool(os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM")),
            "FRONTEND_URL": bool(os.getenv("FRONTEND_URL")),
        },
    }


@router.get("/email/status")
async def email_status(admin: dict = Depends(get_admin_user)):
    """Quelle voie d'envoi est configurée, et ce qui manque."""
    return _etat_email()


@router.post("/email/test")
async def email_test(data: EmailTestRequest, admin: dict = Depends(get_admin_user)):
    """Envoie un e-mail de test ET ATTEND le résultat.

    Les envois du site partent en tâche de fond : un échec n'y laisse qu'une
    ligne dans les journaux de Railway, que personne ne lit. Ici l'envoi est
    fait en direct, et l'erreur exacte — avec le conseil qui va avec — est
    rendue à l'écran. C'est ce qui manquait pour comprendre pourquoi un
    « mot de passe oublié » n'arrivait jamais.
    """
    from .. import email_service as e
    to = (data.to or admin.get("email") or "").strip()
    if "@" not in to:
        raise HTTPException(status_code=400, detail="Adresse de destination invalide.")
    html = e._base_template(
        "<h2>E-mail de test</h2><p>Si vous lisez ceci, l'envoi d'e-mails de CaptenTDB "
        "fonctionne. Les liens de réinitialisation de mot de passe arriveront de la même façon.</p>"
    )
    try:
        voie = await e.envoyer(to, "CaptenTDB – e-mail de test", html)
    except e.EchecEnvoi as exc:
        return {"ok": False, "to": to, "erreur": exc.message, "conseil": exc.conseil, **_etat_email()}
    except Exception as exc:  # une erreur imprévue doit s'afficher, pas faire un 500 muet
        return {"ok": False, "to": to, "erreur": f"{type(exc).__name__} : {exc}", "conseil": "", **_etat_email()}
    await log_admin_action(admin["id"], "email_test", f"E-mail de test envoyé à {to} via {voie}")
    return {"ok": True, "to": to, "voie": voie, **_etat_email()}


@router.get("/ai-health")
async def ai_health(admin: dict = Depends(get_admin_user)):
    """Quel fournisseur répond, avec quel modèle, en combien de temps.

    Quand l'assistant est tombé — Groq avait retiré le modèle écrit en dur —
    il n'existait aucun moyen de le constater depuis le site : il fallait
    poser une question et lire l'erreur. Ce point interroge réellement chaque
    fournisseur configuré, il ne se contente pas de vérifier qu'une clé est
    posée. Une clé présente et un service muet, c'est exactement le cas qu'on
    veut distinguer.
    """
    from ._llm import PROVIDERS, probe

    results = [await probe(name) for name in PROVIDERS]
    usable = [r for r in results if r["ok"]]
    return {
        "ok": bool(usable),
        "serving": usable[0]["provider"] if usable else None,
        "providers": results,
    }


@router.get("/data-health")
async def data_health(admin: dict = Depends(get_admin_user)):
    """D'où viennent les bougies depuis le démarrage : Yahoo, le secours, ou rien.

    Tout le moteur repose sur Yahoo, qui n'a pas d'accord de service. Quand
    il fléchit, l'analyse bascule sur Twelve Data ou sur la dernière série
    gardée en mémoire (voir _qualite.py) — et cet écran le montre.
    """
    from config import TWELVEDATA_API_KEY
    from ._qualite import etat_des_sources

    return {**etat_des_sources(), "secours_configure": bool(TWELVEDATA_API_KEY)}


# ============== DASHBOARD ==============

@router.get("/dashboard")
async def get_admin_dashboard(admin: dict = Depends(get_admin_user)):
    """Get admin dashboard with all stats"""

    # Compute cutoff datetimes in Python (works for both SQLite and PostgreSQL)
    now = datetime.now(timezone.utc)
    cutoff_1d = (now - timedelta(days=1)).isoformat()
    cutoff_7d = (now - timedelta(days=7)).isoformat()

    # User stats
    total_users = await execute_query("SELECT COUNT(*) as count FROM web_users")
    active_24h = await execute_query(
        "SELECT COUNT(*) as count FROM web_users WHERE last_login > ?",
        (cutoff_1d,)
    )
    active_7d = await execute_query(
        "SELECT COUNT(*) as count FROM web_users WHERE last_login > ?",
        (cutoff_7d,)
    )
    new_users_7d = await execute_query(
        "SELECT COUNT(*) as count FROM web_users WHERE created_at > ?",
        (cutoff_7d,)
    )

    # Trading stats
    total_positions = await execute_query("SELECT COUNT(*) as count FROM positions WHERE status = 'open'")
    trades_24h = await execute_query(
        "SELECT COUNT(*) as count FROM positions WHERE created_at > ?",
        (cutoff_1d,)
    )
    total_volume = await execute_query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM positions WHERE created_at > ?",
        (cutoff_7d,)
    )

    # Wallet stats
    total_balance = await execute_query("SELECT COALESCE(SUM(balance), 0) as total FROM wallet")

    # AI Chat stats
    ai_messages = await execute_query("SELECT COUNT(*) as count FROM web_ai_chat")
    ai_messages_24h = await execute_query(
        "SELECT COUNT(*) as count FROM web_ai_chat WHERE created_at > ?",
        (cutoff_1d,)
    )

    # Favorites stats
    total_favorites = await execute_query("SELECT COUNT(*) as count FROM web_favorites")

    # Support tickets stats
    open_tickets = await execute_query(
        "SELECT COUNT(*) as count FROM admin_tickets WHERE status = 'open'"
    )
    awaiting_response = await execute_query("""
        SELECT COUNT(*) as count FROM admin_tickets t
        WHERE t.status = 'open'
        AND (SELECT is_admin FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) = 0
    """)

    # Recent activity
    recent_users = await execute_query("""
        SELECT id, email, username, created_at, last_login, is_active
        FROM web_users
        ORDER BY created_at DESC
        LIMIT 10
    """)

    recent_trades = await execute_query("""
        SELECT p.*, w.balance as user_balance
        FROM positions p
        LEFT JOIN wallet w ON p.user_id = w.user_id
        ORDER BY p.created_at DESC
        LIMIT 10
    """)

    return {
        "stats": {
            "users": {
                "total": total_users[0]["count"] if total_users else 0,
                "active_24h": active_24h[0]["count"] if active_24h else 0,
                "active_7d": active_7d[0]["count"] if active_7d else 0,
                "new_7d": new_users_7d[0]["count"] if new_users_7d else 0,
            },
            "trading": {
                "open_positions": total_positions[0]["count"] if total_positions else 0,
                "trades_24h": trades_24h[0]["count"] if trades_24h else 0,
                "volume_7d": total_volume[0]["total"] if total_volume else 0,
            },
            "wallets": {
                "total_balance": total_balance[0]["total"] if total_balance else 0,
            },
            "ai": {
                "total_messages": ai_messages[0]["count"] if ai_messages else 0,
                "messages_24h": ai_messages_24h[0]["count"] if ai_messages_24h else 0,
            },
            "favorites": {
                "total": total_favorites[0]["count"] if total_favorites else 0,
            },
            "tickets": {
                "open": open_tickets[0]["count"] if open_tickets else 0,
                "awaiting_response": awaiting_response[0]["count"] if awaiting_response else 0,
            }
        },
        "recent_users": recent_users or [],
        "recent_trades": recent_trades or [],
        "admin_email": admin.get("email"),
    }


# ============== USER MANAGEMENT ==============

# Ce qu'aucune réponse de l'administration ne doit contenir : la liste des
# comptes renvoyait `SELECT u.*`, donc chaque empreinte de mot de passe.
_COLONNES_SECRETES = ("password_hash", "verification_token", "reset_token", "remember_token")


def _sans_secrets(ligne: dict) -> dict:
    return {k: v for k, v in dict(ligne).items() if k not in _COLONNES_SECRETES}


@router.get("/users")
async def get_all_users(
    page: int = 1,
    limit: int = 50,
    search: str = "",
    admin: dict = Depends(get_admin_user)
):
    """Get all users with pagination"""
    limit = max(1, min(limit, 200))
    page = max(1, page)
    offset = (page - 1) * limit

    if search:
        users = await execute_query("""
            SELECT u.*, w.balance,
                   (SELECT COUNT(*) FROM positions WHERE user_id = u.id AND status = 'open') as open_positions,
                   (SELECT COUNT(*) FROM web_favorites WHERE user_id = u.id) as favorites_count
            FROM web_users u
            LEFT JOIN wallet w ON u.id = w.user_id
            WHERE u.email LIKE ? OR u.username LIKE ?
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        """, (f"%{search}%", f"%{search}%", limit, offset))

        total = await execute_query("""
            SELECT COUNT(*) as count FROM web_users
            WHERE email LIKE ? OR username LIKE ?
        """, (f"%{search}%", f"%{search}%"))
    else:
        users = await execute_query("""
            SELECT u.*, w.balance,
                   (SELECT COUNT(*) FROM positions WHERE user_id = u.id AND status = 'open') as open_positions,
                   (SELECT COUNT(*) FROM web_favorites WHERE user_id = u.id) as favorites_count
            FROM web_users u
            LEFT JOIN wallet w ON u.id = w.user_id
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))

        total = await execute_query("SELECT COUNT(*) as count FROM web_users")

    return {
        "users": [_sans_secrets(u) for u in (users or [])],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit,
        "pages": ((total[0]["count"] if total else 0) + limit - 1) // limit
    }


@router.get("/users/{user_id}")
async def get_user_details(user_id: int, admin: dict = Depends(get_admin_user)):
    """Get detailed user information"""

    user = await execute_query("""
        SELECT * FROM web_users WHERE id = ?
    """, (user_id,))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    wallet = await execute_query("SELECT * FROM wallet WHERE user_id = ?", (user_id,))

    positions = await execute_query("""
        SELECT * FROM positions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    """, (user_id,))

    favorites = await execute_query("""
        SELECT * FROM web_favorites WHERE user_id = ?
    """, (user_id,))

    chat_history = await execute_query("""
        SELECT * FROM web_ai_chat WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    """, (user_id,))

    settings = await execute_query("""
        SELECT * FROM web_user_settings WHERE user_id = ?
    """, (user_id,))

    # Calculate trading stats
    closed_positions = await execute_query("""
        SELECT
            COUNT(*) as total_trades,
            SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
            SUM(realized_pnl) as total_pnl,
            MAX(realized_pnl) as best_trade,
            MIN(realized_pnl) as worst_trade
        FROM positions
        WHERE user_id = ? AND status = 'closed'
    """, (user_id,))

    return {
        "user": _sans_secrets(user[0]),
        "wallet": wallet[0] if wallet else None,
        "positions": positions or [],
        "favorites": favorites or [],
        "chat_history": chat_history or [],
        "settings": settings[0] if settings else None,
        "trading_stats": closed_positions[0] if closed_positions else None,
    }


@router.post("/users/action")
async def perform_user_action(action: UserAction, admin: dict = Depends(get_admin_user)):
    """Perform action on a user (ban, unban, reset_wallet, delete)"""

    user = await execute_query("SELECT * FROM web_users WHERE id = ?", (action.user_id,))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if action.action == "ban":
        await execute_write(
            "UPDATE web_users SET is_active = 0 WHERE id = ?",
            (action.user_id,)
        )
        # Log action
        await log_admin_action(admin["id"], "ban_user", f"Banned user {action.user_id}: {action.reason}")
        return {"success": True, "message": f"User {action.user_id} has been banned"}

    elif action.action == "unban":
        await execute_write(
            "UPDATE web_users SET is_active = 1 WHERE id = ?",
            (action.user_id,)
        )
        await log_admin_action(admin["id"], "unban_user", f"Unbanned user {action.user_id}")
        return {"success": True, "message": f"User {action.user_id} has been unbanned"}

    elif action.action == "reset_wallet":
        await execute_write(
            "UPDATE wallet SET balance = 10000 WHERE user_id = ?",
            (action.user_id,)
        )
        # Close all open positions
        await execute_write(
            "UPDATE positions SET status = 'closed', realized_pnl = 0 WHERE user_id = ? AND status = 'open'",
            (action.user_id,)
        )
        await log_admin_action(admin["id"], "reset_wallet", f"Reset wallet for user {action.user_id}: {action.reason}")
        return {"success": True, "message": f"Wallet reset for user {action.user_id}"}

    elif action.action == "delete":
        # Delete user data
        await execute_write("DELETE FROM web_ai_chat WHERE user_id = ?", (action.user_id,))
        await execute_write("DELETE FROM web_favorites WHERE user_id = ?", (action.user_id,))
        await execute_write("DELETE FROM positions WHERE user_id = ?", (action.user_id,))
        await execute_write("DELETE FROM wallet WHERE user_id = ?", (action.user_id,))
        await execute_write("DELETE FROM web_user_settings WHERE user_id = ?", (action.user_id,))
        await execute_write("DELETE FROM web_users WHERE id = ?", (action.user_id,))
        await log_admin_action(admin["id"], "delete_user", f"Deleted user {action.user_id}: {action.reason}")
        return {"success": True, "message": f"User {action.user_id} has been deleted"}

    else:
        raise HTTPException(status_code=400, detail="Invalid action")


@router.post("/users/{user_id}/adjust-wallet")
async def adjust_user_wallet(user_id: int, adjustment: WalletAdjustment, admin: dict = Depends(get_admin_user)):
    """Adjust user wallet balance"""

    wallet = await execute_query("SELECT * FROM wallet WHERE user_id = ?", (user_id,))
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    new_balance = wallet[0]["balance"] + adjustment.amount
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Balance cannot be negative")

    await execute_write(
        "UPDATE wallet SET balance = ? WHERE user_id = ?",
        (new_balance, user_id)
    )

    await log_admin_action(
        admin["id"],
        "adjust_wallet",
        f"Adjusted wallet for user {user_id} by {adjustment.amount}: {adjustment.reason}"
    )

    return {
        "success": True,
        "previous_balance": wallet[0]["balance"],
        "adjustment": adjustment.amount,
        "new_balance": new_balance
    }


# ============== BROADCAST ==============

@router.post("/broadcast")
async def send_broadcast(message: BroadcastMessage, admin: dict = Depends(get_admin_user)):
    """Send broadcast message to all users"""

    # Store broadcast in database
    await execute_write("""
        INSERT INTO admin_broadcasts (admin_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (admin["id"], message.title, message.message, message.type, datetime.now(timezone.utc).isoformat()))

    await log_admin_action(admin["id"], "broadcast", f"Sent broadcast: {message.title}")

    return {
        "success": True,
        "message": "Broadcast sent successfully"
    }


@router.get("/broadcasts")
async def get_broadcasts(limit: int = 20, admin: dict = Depends(get_admin_user)):
    """Get recent broadcasts"""

    broadcasts = await execute_query("""
        SELECT b.*, u.email as admin_email
        FROM admin_broadcasts b
        LEFT JOIN web_users u ON b.admin_id = u.id
        ORDER BY b.created_at DESC
        LIMIT ?
    """, (limit,))

    return {"broadcasts": broadcasts or []}


@router.get("/broadcasts/public")
async def get_public_broadcasts(limit: int = 5, current_user: dict = Depends(get_current_user)):
    """Get recent broadcasts sent AFTER the current user registered."""
    user_id = current_user["id"]

    # Fetch user's registration date so we never show broadcasts sent before they existed
    user_rows = await execute_query(
        "SELECT created_at FROM web_users WHERE id = ?", (user_id,)
    )
    user_created_at = user_rows[0]["created_at"] if user_rows else "1970-01-01T00:00:00"

    broadcasts = await execute_query("""
        SELECT id, title, message, type, created_at
        FROM admin_broadcasts
        WHERE created_at > ?
        ORDER BY created_at DESC
        LIMIT ?
    """, (user_created_at, limit))

    return {"broadcasts": broadcasts or []}


@router.delete("/broadcast/{broadcast_id}")
async def delete_broadcast(broadcast_id: int, admin: dict = Depends(get_admin_user)):
    """Delete a broadcast message."""
    await execute_write("DELETE FROM admin_broadcasts WHERE id = ?", (broadcast_id,))
    await log_admin_action(admin["id"], "delete_broadcast", f"Deleted broadcast {broadcast_id}")
    return {"success": True}


# ============== CHANGELOG ==============

@router.post("/changelog")
async def create_changelog(data: ChangelogCreate, admin: dict = Depends(get_admin_user)):
    """Create a new changelog entry visible to all users on next login."""
    await execute_write("""
        INSERT INTO admin_changelogs (admin_id, title, content, version, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (admin["id"], data.title, data.content, data.version, datetime.now(timezone.utc).isoformat()))

    await log_admin_action(admin["id"], "create_changelog", f"Changelog created: {data.title}")

    return {"success": True, "message": "Changelog published"}


@router.get("/changelogs")
async def get_changelogs(limit: int = 20, admin: dict = Depends(get_admin_user)):
    """Get all changelog entries (admin view)."""
    rows = await execute_query("""
        SELECT c.*, u.email as admin_email
        FROM admin_changelogs c
        LEFT JOIN web_users u ON c.admin_id = u.id
        ORDER BY c.created_at DESC
        LIMIT ?
    """, (limit,))
    return {"changelogs": rows or []}


@router.delete("/changelog/{changelog_id}")
async def delete_changelog(changelog_id: int, admin: dict = Depends(get_admin_user)):
    """Delete a changelog entry."""
    await execute_write("DELETE FROM user_changelog_reads WHERE changelog_id = ?", (changelog_id,))
    await execute_write("DELETE FROM admin_changelogs WHERE id = ?", (changelog_id,))
    await log_admin_action(admin["id"], "delete_changelog", f"Deleted changelog {changelog_id}")
    return {"success": True}


@router.get("/changelog/latest-unread")
async def get_latest_unread_changelog(current_user: dict = Depends(get_current_user)):
    """Return the most recent changelog the user hasn't read, posted AFTER they registered."""
    user_id = current_user["id"]

    user_rows = await execute_query(
        "SELECT created_at FROM web_users WHERE id = ?", (user_id,)
    )
    user_created_at = user_rows[0]["created_at"] if user_rows else "1970-01-01T00:00:00"

    rows = await execute_query("""
        SELECT c.*
        FROM admin_changelogs c
        WHERE c.id NOT IN (
            SELECT changelog_id FROM user_changelog_reads WHERE user_id = ?
        )
        AND c.created_at > ?
        ORDER BY c.created_at DESC
        LIMIT 1
    """, (user_id, user_created_at))
    return {"changelog": rows[0] if rows else None}


@router.post("/changelog/{changelog_id}/read")
async def mark_changelog_read(changelog_id: int, current_user: dict = Depends(get_current_user)):
    """Mark a changelog as read for the current user."""
    user_id = current_user["id"]
    try:
        await execute_write("""
            INSERT INTO user_changelog_reads (user_id, changelog_id, read_at)
            VALUES (?, ?, ?)
            ON CONFLICT (user_id, changelog_id) DO NOTHING
        """, (user_id, changelog_id, datetime.now(timezone.utc).isoformat()))
    except Exception:
        pass  # Already read (unique constraint)
    return {"success": True}


# ============== SYSTEM SETTINGS ==============

@router.get("/settings")
async def get_system_settings(admin: dict = Depends(get_admin_user)):
    """Get all system settings"""

    settings = await execute_query("SELECT * FROM admin_settings ORDER BY key")

    return {"settings": settings or []}


@router.post("/settings")
async def update_system_setting(setting: SystemSetting, admin: dict = Depends(get_admin_user)):
    """Update or create system setting"""

    existing = await execute_query(
        "SELECT * FROM admin_settings WHERE key = ?",
        (setting.key,)
    )

    _now = datetime.now(timezone.utc).isoformat()
    if existing:
        await execute_write(
            "UPDATE admin_settings SET value = ?, updated_at = ? WHERE key = ?",
            (setting.value, _now, setting.key)
        )
    else:
        await execute_write(
            "INSERT INTO admin_settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (setting.key, setting.value, _now, _now)
        )

    # Toggling maintenance carries two bookkeeping keys with it. Turning it ON
    # stamps the start (the public status endpoint needs it to draw a real
    # progress bar); turning it OFF wipes the timer so a leftover past end_time
    # can't auto-disable the next maintenance window the moment it opens.
    if setting.key == "maintenance_mode":
        if setting.value == "true":
            await _upsert_setting("maintenance_started_at", _now, _now)
        else:
            for k in ("maintenance_end_time", "maintenance_started_at"):
                await _upsert_setting(k, "", _now)

    return {"success": True, "key": setting.key, "value": setting.value}


async def _upsert_setting(key: str, value: str, now: str) -> None:
    existing = await execute_query("SELECT key FROM admin_settings WHERE key = ?", (key,))
    if existing:
        await execute_write(
            "UPDATE admin_settings SET value = ?, updated_at = ? WHERE key = ?",
            (value, now, key)
        )
    else:
        await execute_write(
            "INSERT INTO admin_settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (key, value, now, now)
        )


# ============== ANALYTICS ==============

@router.get("/analytics/users")
async def get_user_analytics(days: int = 30, admin: dict = Depends(get_admin_user)):
    """Get user registration and activity analytics"""

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Daily registrations
    registrations = await execute_query("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM web_users
        WHERE created_at > ?
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (cutoff,))

    # Daily active users
    active_users = await execute_query("""
        SELECT DATE(last_login) as date, COUNT(*) as count
        FROM web_users
        WHERE last_login > ?
        GROUP BY DATE(last_login)
        ORDER BY date
    """, (cutoff,))

    return {
        "registrations": registrations or [],
        "active_users": active_users or []
    }


@router.get("/analytics/trading")
async def get_trading_analytics(days: int = 30, admin: dict = Depends(get_admin_user)):
    """Get trading analytics"""

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Daily trades
    trades = await execute_query("""
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(amount) as volume
        FROM positions
        WHERE created_at > ?
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (cutoff,))

    # Most traded symbols
    top_symbols = await execute_query("""
        SELECT symbol, COUNT(*) as count, SUM(amount) as volume
        FROM positions
        WHERE created_at > ?
        GROUP BY symbol
        ORDER BY count DESC
        LIMIT 10
    """, (cutoff,))

    # PnL distribution
    pnl_distribution = await execute_query("""
        SELECT
            CASE
                WHEN realized_pnl < -1000 THEN 'loss_large'
                WHEN realized_pnl < -100 THEN 'loss_medium'
                WHEN realized_pnl < 0 THEN 'loss_small'
                WHEN realized_pnl = 0 THEN 'breakeven'
                WHEN realized_pnl < 100 THEN 'profit_small'
                WHEN realized_pnl < 1000 THEN 'profit_medium'
                ELSE 'profit_large'
            END as category,
            COUNT(*) as count
        FROM positions
        WHERE status = 'closed' AND created_at > ?
        GROUP BY category
    """, (cutoff,))

    return {
        "daily_trades": trades or [],
        "top_symbols": top_symbols or [],
        "pnl_distribution": pnl_distribution or []
    }


@router.get("/analytics/ai")
async def get_ai_analytics(days: int = 30, admin: dict = Depends(get_admin_user)):
    """Get AI assistant usage analytics"""

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Daily messages
    messages = await execute_query("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM web_ai_chat
        WHERE created_at > ?
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (cutoff,))

    # Top users by AI usage
    top_users = await execute_query("""
        SELECT c.user_id, u.email, u.username, COUNT(*) as message_count
        FROM web_ai_chat c
        LEFT JOIN web_users u ON c.user_id = u.id
        WHERE c.created_at > ?
        GROUP BY c.user_id
        ORDER BY message_count DESC
        LIMIT 10
    """, (cutoff,))

    return {
        "daily_messages": messages or [],
        "top_users": top_users or []
    }


# ============== AUDIT LOG ==============

@router.get("/audit-log")
async def get_audit_log(
    page: int = 1,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get admin audit log"""
    offset = (page - 1) * limit

    logs = await execute_query("""
        SELECT l.*, u.email as admin_email
        FROM admin_audit_log l
        LEFT JOIN web_users u ON l.admin_id = u.id
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))

    total = await execute_query("SELECT COUNT(*) as count FROM admin_audit_log")

    return {
        "logs": logs or [],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit
    }


# ============== POSITIONS MANAGEMENT ==============

@router.get("/positions")
async def get_all_positions(
    status: str = "all",
    page: int = 1,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get all positions with filters"""
    offset = (page - 1) * limit

    if status == "all":
        positions = await execute_query("""
            SELECT p.*, u.email, u.username
            FROM positions p
            LEFT JOIN web_users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM positions")
    else:
        positions = await execute_query("""
            SELECT p.*, u.email, u.username
            FROM positions p
            LEFT JOIN web_users u ON p.user_id = u.id
            WHERE p.status = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        """, (status, limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM positions WHERE status = ?", (status,))

    return {
        "positions": positions or [],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit
    }


@router.post("/positions/{position_id}/close")
async def force_close_position(position_id: int, admin: dict = Depends(get_admin_user)):
    """Force close a position"""

    position = await execute_query("SELECT * FROM positions WHERE id = ?", (position_id,))
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    if position[0]["status"] == "closed":
        raise HTTPException(status_code=400, detail="Position already closed")

    # Close with 0 PnL (admin force close)
    await execute_write("""
        UPDATE positions
        SET status = 'closed', realized_pnl = 0, closed_at = ?
        WHERE id = ?
    """, (datetime.now(timezone.utc).isoformat(), position_id))

    # Return amount to user wallet
    await execute_write("""
        UPDATE wallet SET balance = balance + ? WHERE user_id = ?
    """, (position[0]["amount"], position[0]["user_id"]))

    await log_admin_action(admin["id"], "force_close_position", f"Force closed position {position_id}")

    return {"success": True, "message": f"Position {position_id} has been closed"}


# ============== HELPER FUNCTIONS ==============

async def log_admin_action(admin_id: int, action: str, details: str):
    """Log admin action to audit log"""
    await execute_write("""
        INSERT INTO admin_audit_log (admin_id, action, details, created_at)
        VALUES (?, ?, ?, ?)
    """, (admin_id, action, details, datetime.now(timezone.utc).isoformat()))


# ============== ADMIN MANAGEMENT ==============

class PromoteAdmin(BaseModel):
    user_id: int
    promote: bool = True  # True to promote, False to demote


@router.post("/promote")
async def promote_user_to_admin(data: PromoteAdmin, admin: dict = Depends(get_admin_user)):
    """Promote or demote a user to/from admin"""
    user = await execute_query("SELECT * FROM web_users WHERE id = ?", (data.user_id,))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await execute_write(
        "UPDATE web_users SET is_admin = ? WHERE id = ?",
        (1 if data.promote else 0, data.user_id)
    )

    action = "promote_admin" if data.promote else "demote_admin"
    await log_admin_action(admin["id"], action, f"User {data.user_id} {'promoted to' if data.promote else 'demoted from'} admin")

    return {
        "success": True,
        "message": f"User {data.user_id} has been {'promoted to admin' if data.promote else 'demoted from admin'}"
    }


# ============== ASSET REQUESTS ==============
#
# Le traitement d'une demande, en étapes :
#
#   pending ──(précisions)──► info_requested ──► accepted ──(« Ajouté »)──► added
#        └──────────────────────────────── rejected
#
# Les précisions passent par un ticket support : le client les lit et y
# répond dans « Mes demandes », l'administrateur voit l'échange dans la ligne
# de la demande. « Ajouté » ne vient qu'à la fin, avec le symbole Yahoo et le
# marché exacts, après vérification que le symbole renvoie un cours : c'est
# là que l'actif entre réellement sur le site, et que le client est prévenu.

class AssetRequestAction(BaseModel):
    """L'écran envoie `action` (« approve » / « reject ») et `note` ; l'ancien
    contrat disait `status` et `admin_notes`. Les deux formes sont reçues."""
    request_id: int
    status: Optional[str] = None
    action: Optional[str] = None
    admin_notes: Optional[str] = None
    note: Optional[str] = None


class AssetQuestion(BaseModel):
    message: str


class AssetAjout(BaseModel):
    symbol: str
    name: Optional[str] = None
    market: Optional[str] = None


_ETATS_OUVERTS = (None, "pending", "info_requested", "accepted")


@router.get("/asset-requests")
async def get_asset_requests(
    status: str = "all",
    page: int = 1,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Les demandes d'actif, avec le dernier message de l'échange de précisions."""
    offset = (page - 1) * limit
    base = """
        SELECT r.*, u.email, u.username,
               (SELECT message FROM admin_ticket_messages WHERE ticket_id = r.ticket_id ORDER BY created_at DESC LIMIT 1) AS dernier_message,
               (SELECT is_admin FROM admin_ticket_messages WHERE ticket_id = r.ticket_id ORDER BY created_at DESC LIMIT 1) AS dernier_de_admin
        FROM asset_requests r
        LEFT JOIN web_users u ON r.user_id = u.id
    """
    if status == "all":
        requests = await execute_query(base + " ORDER BY r.created_at DESC LIMIT ? OFFSET ?", (limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM asset_requests")
    else:
        requests = await execute_query(base + " WHERE r.status = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
                                       (status, limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM asset_requests WHERE status = ?", (status,))
    return {
        "requests": requests or [],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit,
    }


async def _demande(request_id: int) -> dict:
    rows = await execute_query("SELECT * FROM asset_requests WHERE id = ?", (request_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Demande introuvable.")
    return rows[0]


@router.post("/asset-requests/action")
async def process_asset_request(data: AssetRequestAction, admin: dict = Depends(get_admin_user)):
    """Accepter (l'ajout est en cours) ou refuser une demande."""
    status = data.status or {"approve": "accepted", "reject": "rejected"}.get((data.action or "").lower())
    if status == "approved":
        status = "accepted"
    if status not in ("accepted", "rejected"):
        raise HTTPException(status_code=422, detail="Action attendue : approve ou reject.")
    note = (data.admin_notes or data.note or "").strip() or None
    demande = await _demande(data.request_id)
    if demande.get("status") not in _ETATS_OUVERTS:
        raise HTTPException(status_code=409, detail="Cette demande a déjà été traitée.")

    await execute_write("""
        UPDATE asset_requests SET status = ?, admin_notes = COALESCE(?, admin_notes), processed_at = ?, processed_by = ?
        WHERE id = ?
    """, (status, note, datetime.now(timezone.utc).isoformat(), admin["id"], data.request_id))
    await log_admin_action(admin["id"], f"asset_request_{status}",
                           f"Asset request {data.request_id} ({demande['symbol']}): {status}")

    if status == "rejected":
        await _clore_conversation(demande, admin["id"],
                                  "Nous ne retenons pas cette demande." + (f" {note}" if note else ""))
        try:
            await create_user_notification(
                user_id=demande["user_id"], type="asset_request",
                title=f"Demande pour {demande['symbol']}",
                message="Votre demande n'a pas été retenue." + (f" Raison : {note}" if note else ""),
                link="/support",
            )
        except Exception:
            pass
    return {"success": True, "status": status}


@router.post("/asset-requests/{request_id}/question")
async def ask_asset_details(request_id: int, data: AssetQuestion, admin: dict = Depends(get_admin_user)):
    """Demander une précision au client : le symbole exact, la place de cotation…"""
    texte = data.message.strip()
    if not texte:
        raise HTTPException(status_code=422, detail="Écrivez votre question.")
    demande = await _demande(request_id)
    if demande.get("status") not in _ETATS_OUVERTS:
        raise HTTPException(status_code=409, detail="Cette demande a déjà été traitée.")
    now = datetime.now(timezone.utc).isoformat()

    ticket_id = demande.get("ticket_id")
    if not ticket_id:
        await execute_write(
            "INSERT INTO admin_tickets (user_id, subject, status, created_at, updated_at) VALUES (?, ?, 'open', ?, ?)",
            (demande["user_id"], f"Votre demande d'actif : {demande['symbol']}", now, now))
        t = await execute_query("SELECT id FROM admin_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                                (demande["user_id"],))
        ticket_id = t[0]["id"]
    else:
        await execute_write("UPDATE admin_tickets SET status = 'open', updated_at = ? WHERE id = ?", (now, ticket_id))
    await execute_write(
        "INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
        (ticket_id, admin["id"], texte, now))
    await execute_write("UPDATE asset_requests SET status = 'info_requested', ticket_id = ? WHERE id = ?",
                        (ticket_id, request_id))
    await log_admin_action(admin["id"], "asset_request_question", f"Asset request {request_id}: question")
    try:
        await create_user_notification(
            user_id=demande["user_id"], type="asset_request",
            title=f"Une précision sur {demande['symbol']}",
            message="L'équipe a une question sur votre demande d'actif.",
            link=f"/support?ticket={ticket_id}",
        )
    except Exception:
        pass
    return {"success": True, "ticket_id": ticket_id}


async def _clore_conversation(demande: dict, admin_id: int, texte: str) -> None:
    """La demande est réglée : l'échange de précisions reçoit le mot de la fin
    et se ferme, pour ne pas rester « en attente de réponse » des deux côtés."""
    tid = demande.get("ticket_id")
    if not tid:
        return
    now = datetime.now(timezone.utc).isoformat()
    try:
        await execute_write(
            "INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
            (tid, admin_id, texte, now))
        await execute_write("UPDATE admin_tickets SET status = 'closed', updated_at = ? WHERE id = ?", (now, tid))
    except Exception:
        pass


async def _verifier_symbole(symbol: str) -> float:
    """Le symbole doit renvoyer un cours : un symbole mort ajouté au site
    serait un actif vide dans les marchés et le scanner."""
    from ._prices import fetch_prices
    try:
        px = (await fetch_prices([symbol]) or {}).get(symbol) or {}
    except Exception:
        px = {}
    prix = px.get("price") if isinstance(px, dict) else None
    if not prix:
        raise HTTPException(
            status_code=422,
            detail=f"Aucun cours trouvé pour {symbol}. Vérifiez le symbole Yahoo (ex. SOI.PA pour Soitec à Paris).")
    return float(prix)


@router.post("/asset-requests/{request_id}/added")
async def mark_asset_added(request_id: int, data: AssetAjout, admin: dict = Depends(get_admin_user)):
    """« Ajouté » : l'actif entre sur le site, et le client est prévenu."""
    from ._actifs_ajoutes import ajouter
    demande = await _demande(request_id)
    if demande.get("status") not in _ETATS_OUVERTS:
        raise HTTPException(status_code=409, detail="Cette demande a déjà été traitée.")
    symbol = (data.symbol or demande["symbol"]).strip().upper()
    nom = (data.name or demande.get("asset_name") or "").strip() or None
    prix = await _verifier_symbole(symbol)
    marche = await ajouter(symbol, nom, demande.get("asset_type"), request_id, admin["id"], data.market)
    now = datetime.now(timezone.utc).isoformat()
    await execute_write("""
        UPDATE asset_requests SET status = 'added', symbole_final = ?, marche_final = ?, ajoute_le = ?,
               processed_at = ?, processed_by = ?
        WHERE id = ?
    """, (symbol, marche, now, now, admin["id"], request_id))
    await log_admin_action(admin["id"], "asset_request_added", f"Asset request {request_id}: {symbol} added")
    await _clore_conversation(demande, admin["id"],
                              f"C'est fait : {nom or symbol} ({symbol}) est ajouté au site. Merci pour la demande !")
    try:
        await create_user_notification(
            user_id=demande["user_id"], type="asset_request",
            title=f"{nom or symbol} est disponible",
            message=f"Votre demande est ajoutée : {nom or symbol} ({symbol}) est sur le site, vous pouvez l'analyser.",
            link=f"/analysis?symbol={symbol}",
        )
    except Exception:
        pass
    return {"success": True, "symbol": symbol, "marche": marche, "prix": prix}


@router.get("/actifs-ajoutes")
async def list_added_assets(admin: dict = Depends(get_admin_user)):
    from ._actifs_ajoutes import lister
    return {"actifs": await lister()}


@router.post("/actifs-ajoutes")
async def add_asset_direct(data: AssetAjout, admin: dict = Depends(get_admin_user)):
    """Ajouter un actif sans demande en ligne (un client l'a demandé ailleurs)."""
    from ._actifs_ajoutes import ajouter
    symbol = data.symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=422, detail="Indiquez le symbole Yahoo.")
    prix = await _verifier_symbole(symbol)
    marche = await ajouter(symbol, (data.name or "").strip() or None, None, None, admin["id"], data.market)
    await log_admin_action(admin["id"], "asset_added", f"{symbol} added directly")
    return {"success": True, "symbol": symbol, "marche": marche, "prix": prix}


# ============== SUPPORT TICKETS ==============

@router.get("/tickets")
async def get_admin_tickets(
    status: str = "all",
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """Get all support tickets (admin)"""
    offset = (page - 1) * limit

    if status == "all":
        tickets = await execute_query("""
            SELECT t.*, u.email, u.username,
                   (SELECT COUNT(*) FROM admin_ticket_messages WHERE ticket_id = t.id) as message_count,
                   (SELECT message FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT is_admin FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_from_admin
            FROM admin_tickets t
            LEFT JOIN web_users u ON t.user_id = u.id
            ORDER BY t.updated_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM admin_tickets")
    else:
        tickets = await execute_query("""
            SELECT t.*, u.email, u.username,
                   (SELECT COUNT(*) FROM admin_ticket_messages WHERE ticket_id = t.id) as message_count,
                   (SELECT message FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
                   (SELECT is_admin FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_from_admin
            FROM admin_tickets t
            LEFT JOIN web_users u ON t.user_id = u.id
            WHERE t.status = ?
            ORDER BY t.updated_at DESC
            LIMIT ? OFFSET ?
        """, (status, limit, offset))
        total = await execute_query(
            "SELECT COUNT(*) as count FROM admin_tickets WHERE status = ?",
            (status,)
        )

    return {
        "tickets": tickets or [],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit
    }


@router.get("/tickets/stats")
async def get_ticket_stats(admin: dict = Depends(get_admin_user)):
    """Get ticket statistics for admin dashboard"""
    open_tickets = await execute_query(
        "SELECT COUNT(*) as count FROM admin_tickets WHERE status = 'open'"
    )
    total_tickets = await execute_query(
        "SELECT COUNT(*) as count FROM admin_tickets"
    )
    # Tickets awaiting admin response (last message from user)
    awaiting_response = await execute_query("""
        SELECT COUNT(*) as count FROM admin_tickets t
        WHERE t.status = 'open'
        AND (SELECT is_admin FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) = 0
    """)

    return {
        "open": open_tickets[0]["count"] if open_tickets else 0,
        "total": total_tickets[0]["count"] if total_tickets else 0,
        "awaiting_response": awaiting_response[0]["count"] if awaiting_response else 0
    }


@router.get("/tickets/{ticket_id}")
async def get_ticket_detail(ticket_id: int, admin: dict = Depends(get_admin_user)):
    """Get ticket detail with messages"""
    ticket = await execute_query("""
        SELECT t.*, u.email, u.username
        FROM admin_tickets t
        LEFT JOIN web_users u ON t.user_id = u.id
        WHERE t.id = ?
    """, (ticket_id,))

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    messages = await execute_query("""
        SELECT m.*, u.username
        FROM admin_ticket_messages m
        LEFT JOIN web_users u ON m.user_id = u.id
        WHERE m.ticket_id = ?
        ORDER BY m.created_at ASC
    """, (ticket_id,))

    return {
        "ticket": ticket[0],
        "messages": messages or []
    }


class TicketReplyRequest(BaseModel):
    message: str


@router.post("/tickets/{ticket_id}/reply")
async def admin_reply_ticket(ticket_id: int, data: TicketReplyRequest, admin: dict = Depends(get_admin_user)):
    """Admin reply to a ticket"""
    ticket = await execute_query("SELECT * FROM admin_tickets WHERE id = ?", (ticket_id,))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    _now = datetime.now(timezone.utc).isoformat()
    await execute_write("""
        INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
        VALUES (?, ?, ?, 1, ?)
    """, (ticket_id, admin["id"], data.message, _now))

    await execute_write(
        "UPDATE admin_tickets SET updated_at = ? WHERE id = ?",
        (_now, ticket_id)
    )

    await log_admin_action(admin["id"], "ticket_reply", f"Replied to ticket {ticket_id}")

    # La personne doit savoir qu'on lui a répondu, et pouvoir lire la
    # réponse : la notification mène à sa conversation.
    try:
        await create_user_notification(
            user_id=ticket[0]["user_id"], type="ticket_reply",
            title="Réponse à votre demande",
            message=f"L'équipe a répondu à : {ticket[0].get('subject') or 'votre demande'}",
            link=f"/support?ticket={ticket_id}",
        )
    except Exception:
        pass

    return {"success": True}


@router.post("/tickets/{ticket_id}/close")
async def admin_close_ticket(ticket_id: int, admin: dict = Depends(get_admin_user)):
    """Close a ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'closed', updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), ticket_id)
    )
    await log_admin_action(admin["id"], "ticket_close", f"Closed ticket {ticket_id}")
    return {"success": True}


@router.post("/tickets/{ticket_id}/reopen")
async def admin_reopen_ticket(ticket_id: int, admin: dict = Depends(get_admin_user)):
    """Reopen a ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'open', updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), ticket_id)
    )
    await log_admin_action(admin["id"], "ticket_reopen", f"Reopened ticket {ticket_id}")
    return {"success": True}


# ============== ADMIN NOTIFICATIONS ==============

@router.get("/notifications")
async def get_admin_notifications(admin: dict = Depends(get_admin_user)):
    """Get admin notifications (unread first, then recent)"""
    notifications = await execute_query("""
        SELECT * FROM admin_notifications
        ORDER BY is_read ASC, created_at DESC
        LIMIT 50
    """)
    unread_count = sum(1 for n in notifications if not n["is_read"])
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, admin: dict = Depends(get_admin_user)):
    """Mark a single notification as read"""
    await execute_write(
        "UPDATE admin_notifications SET is_read = 1 WHERE id = ?",
        (notif_id,)
    )
    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(admin: dict = Depends(get_admin_user)):
    """Mark all notifications as read"""
    await execute_write("UPDATE admin_notifications SET is_read = 1", ())
    return {"success": True}


@router.post("/notifications/mark-type-read")
async def mark_notifications_type_read(type: str = Query(...), admin: dict = Depends(get_admin_user)):
    """Mark all notifications of a given type as read"""
    await execute_write("UPDATE admin_notifications SET is_read = 1 WHERE type = ?", (type,))
    return {"success": True}


@router.get("/panel", response_class=HTMLResponse)
async def marketing_panel(admin: dict = Depends(get_admin_user)):
    """Serve the marketing panel HTML — protected by server-side admin auth."""
    panel_path = Path(__file__).parent.parent.parent / "static" / "panel.html"
    if not panel_path.exists():
        raise HTTPException(status_code=404, detail="Panel not found")
    return HTMLResponse(content=panel_path.read_text(encoding="utf-8"))
