"""
Admin API routes for TDB
Only whitelisted admin emails can access these routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import os

from ..database import execute_query, execute_write, create_admin_notification
from .auth import get_current_user

router = APIRouter()

# Admin whitelist - emails that have admin access
ADMIN_WHITELIST = [
    "titouan.floch01@gmail.com",
]

# Add any emails from environment variable
env_admins = os.environ.get("ADMIN_EMAILS", "")
if env_admins:
    ADMIN_WHITELIST.extend([e.strip() for e in env_admins.split(",") if e.strip()])


async def is_first_user(user_id: int) -> bool:
    """Check if this user is the first registered user (auto-admin)"""
    first_user = await execute_query("SELECT id FROM web_users ORDER BY id ASC LIMIT 1")
    return first_user and first_user[0]["id"] == user_id


async def check_if_admin(user: dict) -> bool:
    """Check if user is admin via whitelist, env vars, or first user"""
    user_email = (user.get("email") or "").lower().strip()
    user_id = user.get("id")

    # Debug logging
    print(f"[ADMIN CHECK] User email: '{user_email}', User ID: {user_id}")
    print(f"[ADMIN CHECK] Whitelist: {[e.lower() for e in ADMIN_WHITELIST]}")

    # Check whitelist first (case-insensitive comparison)
    whitelist_lower = [e.lower().strip() for e in ADMIN_WHITELIST]
    if user_email and user_email in whitelist_lower:
        print(f"[ADMIN CHECK] User {user_email} found in whitelist - ADMIN")
        return True

    # Check if first user (auto-admin)
    if user_id:
        try:
            if await is_first_user(user_id):
                print(f"[ADMIN CHECK] User {user_id} is first user - ADMIN")
                return True
        except Exception as e:
            print(f"[ADMIN CHECK] Error checking first user: {e}")

    # Check if user is marked as admin in database
    if user_id:
        try:
            admin_check = await execute_query(
                "SELECT is_admin FROM web_users WHERE id = ?",
                (user_id,)
            )
            if admin_check and admin_check[0].get("is_admin"):
                print(f"[ADMIN CHECK] User {user_id} marked as admin in DB - ADMIN")
                return True
        except Exception as e:
            print(f"[ADMIN CHECK] Error checking is_admin column: {e}")

    print(f"[ADMIN CHECK] User {user_email} is NOT admin")
    return False


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


# ============== DASHBOARD ==============

@router.get("/dashboard")
async def get_admin_dashboard(admin: dict = Depends(get_admin_user)):
    """Get admin dashboard with all stats"""

    # User stats
    total_users = await execute_query("SELECT COUNT(*) as count FROM web_users")
    active_24h = await execute_query("""
        SELECT COUNT(*) as count FROM web_users
        WHERE last_login > datetime('now', '-1 day')
    """)
    active_7d = await execute_query("""
        SELECT COUNT(*) as count FROM web_users
        WHERE last_login > datetime('now', '-7 days')
    """)
    new_users_7d = await execute_query("""
        SELECT COUNT(*) as count FROM web_users
        WHERE created_at > datetime('now', '-7 days')
    """)

    # Trading stats
    total_positions = await execute_query("SELECT COUNT(*) as count FROM positions WHERE status = 'open'")
    trades_24h = await execute_query("""
        SELECT COUNT(*) as count FROM positions
        WHERE created_at > datetime('now', '-1 day')
    """)
    total_volume = await execute_query("""
        SELECT COALESCE(SUM(amount), 0) as total FROM positions
        WHERE created_at > datetime('now', '-7 days')
    """)

    # Wallet stats
    total_balance = await execute_query("SELECT COALESCE(SUM(balance), 0) as total FROM wallet")

    # AI Chat stats
    ai_messages = await execute_query("SELECT COUNT(*) as count FROM web_ai_chat")
    ai_messages_24h = await execute_query("""
        SELECT COUNT(*) as count FROM web_ai_chat
        WHERE created_at > datetime('now', '-1 day')
    """)

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

@router.get("/users")
async def get_all_users(
    page: int = 1,
    limit: int = 50,
    search: str = "",
    admin: dict = Depends(get_admin_user)
):
    """Get all users with pagination"""
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
        "users": users or [],
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
        "user": user[0],
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
        VALUES (?, ?, ?, ?, datetime('now'))
    """, (admin["id"], message.title, message.message, message.type))

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
    """Get recent broadcasts for all authenticated users"""

    broadcasts = await execute_query("""
        SELECT id, title, message, type, created_at
        FROM admin_broadcasts
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))

    return {"broadcasts": broadcasts or []}


# ============== CHANGELOG ==============

@router.post("/changelog")
async def create_changelog(data: ChangelogCreate, admin: dict = Depends(get_admin_user)):
    """Create a new changelog entry visible to all users on next login."""
    await execute_write("""
        INSERT INTO admin_changelogs (admin_id, title, content, version, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    """, (admin["id"], data.title, data.content, data.version))

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
    """Return the most recent changelog the user hasn't acknowledged yet."""
    user_id = current_user["id"]
    rows = await execute_query("""
        SELECT c.*
        FROM admin_changelogs c
        WHERE c.id NOT IN (
            SELECT changelog_id FROM user_changelog_reads WHERE user_id = ?
        )
        ORDER BY c.created_at DESC
        LIMIT 1
    """, (user_id,))
    return {"changelog": rows[0] if rows else None}


@router.post("/changelog/{changelog_id}/read")
async def mark_changelog_read(changelog_id: int, current_user: dict = Depends(get_current_user)):
    """Mark a changelog as read for the current user."""
    user_id = current_user["id"]
    try:
        await execute_write("""
            INSERT OR IGNORE INTO user_changelog_reads (user_id, changelog_id, read_at)
            VALUES (?, ?, datetime('now'))
        """, (user_id, changelog_id))
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

    if existing:
        await execute_write(
            "UPDATE admin_settings SET value = ?, updated_at = datetime('now') WHERE key = ?",
            (setting.value, setting.key)
        )
    else:
        await execute_write(
            "INSERT INTO admin_settings (key, value, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))",
            (setting.key, setting.value)
        )

    await log_admin_action(admin["id"], "update_setting", f"Updated setting {setting.key}")

    return {"success": True, "key": setting.key, "value": setting.value}


# ============== ANALYTICS ==============

@router.get("/analytics/users")
async def get_user_analytics(days: int = 30, admin: dict = Depends(get_admin_user)):
    """Get user registration and activity analytics"""

    # Daily registrations
    registrations = await execute_query("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM web_users
        WHERE created_at > datetime('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (f"-{days} days",))

    # Daily active users
    active_users = await execute_query("""
        SELECT DATE(last_login) as date, COUNT(*) as count
        FROM web_users
        WHERE last_login > datetime('now', ?)
        GROUP BY DATE(last_login)
        ORDER BY date
    """, (f"-{days} days",))

    return {
        "registrations": registrations or [],
        "active_users": active_users or []
    }


@router.get("/analytics/trading")
async def get_trading_analytics(days: int = 30, admin: dict = Depends(get_admin_user)):
    """Get trading analytics"""

    # Daily trades
    trades = await execute_query("""
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(amount) as volume
        FROM positions
        WHERE created_at > datetime('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (f"-{days} days",))

    # Most traded symbols
    top_symbols = await execute_query("""
        SELECT symbol, COUNT(*) as count, SUM(amount) as volume
        FROM positions
        WHERE created_at > datetime('now', ?)
        GROUP BY symbol
        ORDER BY count DESC
        LIMIT 10
    """, (f"-{days} days",))

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
        WHERE status = 'closed' AND created_at > datetime('now', ?)
        GROUP BY category
    """, (f"-{days} days",))

    return {
        "daily_trades": trades or [],
        "top_symbols": top_symbols or [],
        "pnl_distribution": pnl_distribution or []
    }


@router.get("/analytics/ai")
async def get_ai_analytics(days: int = 30, admin: dict = Depends(get_admin_user)):
    """Get AI assistant usage analytics"""

    # Daily messages
    messages = await execute_query("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM web_ai_chat
        WHERE created_at > datetime('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (f"-{days} days",))

    # Top users by AI usage
    top_users = await execute_query("""
        SELECT c.user_id, u.email, u.username, COUNT(*) as message_count
        FROM web_ai_chat c
        LEFT JOIN web_users u ON c.user_id = u.id
        WHERE c.created_at > datetime('now', ?)
        GROUP BY c.user_id
        ORDER BY message_count DESC
        LIMIT 10
    """, (f"-{days} days",))

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
        SET status = 'closed', realized_pnl = 0, closed_at = datetime('now')
        WHERE id = ?
    """, (position_id,))

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
        VALUES (?, ?, ?, datetime('now'))
    """, (admin_id, action, details))


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

class AssetRequestAction(BaseModel):
    request_id: int
    status: str  # approved, rejected
    admin_notes: Optional[str] = None


@router.get("/asset-requests")
async def get_asset_requests(
    status: str = "all",
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """Get all asset requests"""
    offset = (page - 1) * limit

    if status == "all":
        requests = await execute_query("""
            SELECT r.*, u.email, u.username
            FROM asset_requests r
            LEFT JOIN web_users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        total = await execute_query("SELECT COUNT(*) as count FROM asset_requests")
    else:
        requests = await execute_query("""
            SELECT r.*, u.email, u.username
            FROM asset_requests r
            LEFT JOIN web_users u ON r.user_id = u.id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        """, (status, limit, offset))
        total = await execute_query(
            "SELECT COUNT(*) as count FROM asset_requests WHERE status = ?",
            (status,)
        )

    return {
        "requests": requests or [],
        "total": total[0]["count"] if total else 0,
        "page": page,
        "limit": limit
    }


@router.post("/asset-requests/action")
async def process_asset_request(data: AssetRequestAction, admin: dict = Depends(get_admin_user)):
    """Process an asset request (approve/reject)"""
    request = await execute_query(
        "SELECT * FROM asset_requests WHERE id = ?",
        (data.request_id,)
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    await execute_write("""
        UPDATE asset_requests
        SET status = ?, admin_notes = ?, processed_at = datetime('now'), processed_by = ?
        WHERE id = ?
    """, (data.status, data.admin_notes, admin["id"], data.request_id))

    await log_admin_action(
        admin["id"],
        f"asset_request_{data.status}",
        f"Processed asset request {data.request_id}: {data.status}"
    )

    return {"success": True, "message": f"Request {data.status}"}


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

    await execute_write("""
        INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
        VALUES (?, ?, ?, 1, datetime('now'))
    """, (ticket_id, admin["id"], data.message))

    await execute_write(
        "UPDATE admin_tickets SET updated_at = datetime('now') WHERE id = ?",
        (ticket_id,)
    )

    await log_admin_action(admin["id"], "ticket_reply", f"Replied to ticket {ticket_id}")

    return {"success": True}


@router.post("/tickets/{ticket_id}/close")
async def admin_close_ticket(ticket_id: int, admin: dict = Depends(get_admin_user)):
    """Close a ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ?",
        (ticket_id,)
    )
    await log_admin_action(admin["id"], "ticket_close", f"Closed ticket {ticket_id}")
    return {"success": True}


@router.post("/tickets/{ticket_id}/reopen")
async def admin_reopen_ticket(ticket_id: int, admin: dict = Depends(get_admin_user)):
    """Reopen a ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'open', updated_at = datetime('now') WHERE id = ?",
        (ticket_id,)
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
