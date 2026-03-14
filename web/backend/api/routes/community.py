"""
Community routes - Chat and Admin Contact
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from ..database import execute_query, execute_write, create_admin_notification
from .auth import get_current_user
from .admin import get_admin_user

router = APIRouter()


# ============== MODELS ==============

class SendMessageRequest(BaseModel):
    content: str
    reply_to: Optional[int] = None


class ContactAdminRequest(BaseModel):
    subject: str
    message: str


class AdminReplyRequest(BaseModel):
    ticket_id: int
    message: str


# ============== CHAT GENERAL ==============

@router.get("/messages")
async def get_chat_messages(
    limit: int = Query(default=50, le=100),
    before_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get community chat messages"""
    user_id = current_user.get("id")

    if before_id:
        messages = await execute_query("""
            SELECT m.*, u.username, u.is_premium, u.is_admin,
                   (SELECT COUNT(*) FROM community_message_likes WHERE message_id = m.id) as likes,
                   EXISTS(SELECT 1 FROM community_message_likes WHERE message_id = m.id AND user_id = ?) as user_liked
            FROM community_messages m
            LEFT JOIN web_users u ON m.user_id = u.id
            WHERE m.id < ? AND m.is_deleted = 0
            ORDER BY m.created_at DESC
            LIMIT ?
        """, (user_id, before_id, limit))
    else:
        messages = await execute_query("""
            SELECT m.*, u.username, u.is_premium, u.is_admin,
                   (SELECT COUNT(*) FROM community_message_likes WHERE message_id = m.id) as likes,
                   EXISTS(SELECT 1 FROM community_message_likes WHERE message_id = m.id AND user_id = ?) as user_liked
            FROM community_messages m
            LEFT JOIN web_users u ON m.user_id = u.id
            WHERE m.is_deleted = 0
            ORDER BY m.created_at DESC
            LIMIT ?
        """, (user_id, limit))

    # Reverse to get chronological order
    messages = list(reversed(messages)) if messages else []

    return {"messages": messages}


@router.post("/messages")
async def send_chat_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to community chat"""
    user_id = current_user.get("id")
    content = request.content.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(content) > 1000:
        raise HTTPException(status_code=400, detail="Message too long (max 1000 characters)")

    # Check for spam (max 5 messages per minute)
    recent = await execute_query("""
        SELECT COUNT(*) as count FROM community_messages
        WHERE user_id = ? AND created_at > datetime('now', '-1 minute')
    """, (user_id,))

    if recent and recent[0]["count"] >= 5:
        raise HTTPException(status_code=429, detail="Too many messages. Please wait a moment.")

    # Insert message
    await execute_write("""
        INSERT INTO community_messages (user_id, content, reply_to, created_at, is_deleted)
        VALUES (?, ?, ?, datetime('now'), 0)
    """, (user_id, content, request.reply_to))

    # Get the inserted message
    new_message = await execute_query("""
        SELECT m.*, u.username, u.is_premium, u.is_admin
        FROM community_messages m
        LEFT JOIN web_users u ON m.user_id = u.id
        WHERE m.user_id = ?
        ORDER BY m.id DESC LIMIT 1
    """, (user_id,))

    return {"success": True, "message": new_message[0] if new_message else None}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete own message or admin can delete any"""
    user_id = current_user.get("id")
    is_admin = current_user.get("is_admin", False)

    # Check if message exists and belongs to user
    message = await execute_query(
        "SELECT * FROM community_messages WHERE id = ?",
        (message_id,)
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message[0]["user_id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Cannot delete this message")

    await execute_write(
        "UPDATE community_messages SET is_deleted = 1 WHERE id = ?",
        (message_id,)
    )

    return {"success": True}


@router.post("/messages/{message_id}/like")
async def like_message(
    message_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Like/unlike a message"""
    user_id = current_user.get("id")

    # Check if already liked
    existing = await execute_query(
        "SELECT * FROM community_message_likes WHERE message_id = ? AND user_id = ?",
        (message_id, user_id)
    )

    if existing:
        # Unlike
        await execute_write(
            "DELETE FROM community_message_likes WHERE message_id = ? AND user_id = ?",
            (message_id, user_id)
        )
        return {"liked": False}
    else:
        # Like
        await execute_write(
            "INSERT INTO community_message_likes (message_id, user_id, created_at) VALUES (?, ?, datetime('now'))",
            (message_id, user_id)
        )
        return {"liked": True}


@router.get("/online-count")
async def get_online_count(current_user: dict = Depends(get_current_user)):
    """Get approximate online users count"""
    # Count users active in last 5 minutes
    result = await execute_query("""
        SELECT COUNT(DISTINCT user_id) as count FROM community_messages
        WHERE created_at > datetime('now', '-5 minutes')
    """)

    # Also count from last_seen if we track it
    online = result[0]["count"] if result else 0

    # Minimum 1 (current user)
    return {"online_count": max(1, online)}


# ============== CONTACT ADMIN ==============

@router.post("/contact-admin")
async def contact_admin(
    request: ContactAdminRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to admin"""
    user_id = current_user.get("id")

    if not request.subject.strip() or not request.message.strip():
        raise HTTPException(status_code=400, detail="Subject and message are required")

    # Check for existing open ticket
    existing = await execute_query("""
        SELECT * FROM admin_tickets
        WHERE user_id = ? AND status = 'open'
        ORDER BY created_at DESC LIMIT 1
    """, (user_id,))

    if existing:
        # Add to existing ticket
        await execute_write("""
            INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
            VALUES (?, ?, ?, 0, datetime('now'))
        """, (existing[0]["id"], user_id, f"[{request.subject}]\n\n{request.message}"))

        return {
            "success": True,
            "ticket_id": existing[0]["id"],
            "message": "Message ajoute a votre ticket existant"
        }

    # Create new ticket
    await execute_write("""
        INSERT INTO admin_tickets (user_id, subject, status, created_at, updated_at)
        VALUES (?, ?, 'open', datetime('now'), datetime('now'))
    """, (user_id, request.subject))

    # Get ticket ID
    ticket = await execute_query(
        "SELECT id FROM admin_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,)
    )

    if ticket:
        await execute_write("""
            INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
            VALUES (?, ?, ?, 0, datetime('now'))
        """, (ticket[0]["id"], user_id, request.message))

        username = current_user.get("username") or current_user.get("email", "Utilisateur")
        await create_admin_notification(
            type="new_ticket",
            title="Nouveau ticket support",
            message=f"{username} : {request.subject}",
            link=f"/admin?tab=tickets"
        )

    return {
        "success": True,
        "ticket_id": ticket[0]["id"] if ticket else None,
        "message": "Votre message a ete envoye. Un admin vous repondra bientot."
    }


@router.get("/my-tickets")
async def get_my_tickets(current_user: dict = Depends(get_current_user)):
    """Get user's support tickets"""
    user_id = current_user.get("id")

    tickets = await execute_query("""
        SELECT t.*,
               (SELECT COUNT(*) FROM admin_ticket_messages WHERE ticket_id = t.id) as message_count,
               (SELECT message FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT is_admin FROM admin_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_from_admin
        FROM admin_tickets t
        WHERE t.user_id = ?
        ORDER BY t.updated_at DESC
    """, (user_id,))

    return {"tickets": tickets or []}


@router.get("/tickets/{ticket_id}")
async def get_ticket_messages(
    ticket_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a specific ticket"""
    user_id = current_user.get("id")
    is_admin = current_user.get("is_admin", False)

    # Check access
    ticket = await execute_query(
        "SELECT * FROM admin_tickets WHERE id = ?",
        (ticket_id,)
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket[0]["user_id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

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


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reply to a ticket"""
    user_id = current_user.get("id")
    is_admin = current_user.get("is_admin", False)

    # Check access
    ticket = await execute_query(
        "SELECT * FROM admin_tickets WHERE id = ?",
        (ticket_id,)
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket[0]["user_id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    await execute_write("""
        INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    """, (ticket_id, user_id, request.content, 1 if is_admin else 0))

    # Update ticket
    await execute_write(
        "UPDATE admin_tickets SET updated_at = datetime('now') WHERE id = ?",
        (ticket_id,)
    )

    return {"success": True}


# ============== ADMIN ROUTES ==============

@router.get("/admin/tickets")
async def admin_get_tickets(
    status: str = "all",
    admin: dict = Depends(get_admin_user)
):
    """Get all support tickets (admin only)"""
    if status == "all":
        tickets = await execute_query("""
            SELECT t.*, u.username, u.email,
                   (SELECT COUNT(*) FROM admin_ticket_messages WHERE ticket_id = t.id) as message_count
            FROM admin_tickets t
            LEFT JOIN web_users u ON t.user_id = u.id
            ORDER BY t.updated_at DESC
        """)
    else:
        tickets = await execute_query("""
            SELECT t.*, u.username, u.email,
                   (SELECT COUNT(*) FROM admin_ticket_messages WHERE ticket_id = t.id) as message_count
            FROM admin_tickets t
            LEFT JOIN web_users u ON t.user_id = u.id
            WHERE t.status = ?
            ORDER BY t.updated_at DESC
        """, (status,))

    return {"tickets": tickets or []}


@router.post("/admin/tickets/{ticket_id}/close")
async def admin_close_ticket(
    ticket_id: int,
    admin: dict = Depends(get_admin_user)
):
    """Close a support ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ?",
        (ticket_id,)
    )
    return {"success": True}


@router.post("/admin/tickets/{ticket_id}/reopen")
async def admin_reopen_ticket(
    ticket_id: int,
    admin: dict = Depends(get_admin_user)
):
    """Reopen a support ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'open', updated_at = datetime('now') WHERE id = ?",
        (ticket_id,)
    )
    return {"success": True}
