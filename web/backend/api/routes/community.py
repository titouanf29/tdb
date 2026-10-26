"""
Community routes - Chat and Admin Contact
"""
import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from ..database import USE_POSTGRES, execute_query, execute_write, create_admin_notification, create_user_notification
from .auth import get_current_user
from .admin import get_admin_user, check_if_admin

# ── Profanity filter ──────────────────────────────────────────────────────────
_BAD_WORDS = [
    # insultes FR
    "connard","connarde","enculé","enculée","enculer","fdp","fils de pute",
    "pute","salope","salop","bâtard","batard","nique","niquer","niqué",
    "va te faire","ta gueule","ferme ta gueule","merde","gros con","petite merde",
    "pd","tapette","bouffon","bouffonne","casse toi","casse-toi","crève",
    "va crever","va mourir","suicid","enfoiré","enfoirée","trou du cul",
    "con","conne","couille","couilles","bite","bites","chier","chie",
    # insultes racistes / harcèlement graves — toujours bloqués
    "ntm","nique ta mère","nique ta mere","sale arabe","sale noir","sale blanc",
    "sale juif","sale muslim","sale rebeu","nègre","négro","youpine","youpin",
    "bicot","bougnoule","feuj","sale feuj","pédophile","pedophile","viol","violer",
    # EN
    "fuck","fucking","fucker","shit","bitch","asshole","motherfucker",
    "cunt","bastard","dickhead","whore","slut","faggot",
]

def _contains_profanity(text: str) -> bool:
    low = text.lower()
    for w in _BAD_WORDS:
        # word-boundary check: preceded/followed by non-alpha or string edge
        idx = low.find(w)
        while idx != -1:
            before = low[idx - 1] if idx > 0 else " "
            after  = low[idx + len(w)] if idx + len(w) < len(low) else " "
            if not before.isalpha() and not after.isalpha():
                return True
            idx = low.find(w, idx + 1)
    return False

router = APIRouter()


# ============== LE FIL : sortes de publications, signalements, défi ==============
#
# Le fil n'était fait que de messages de membres : vide, il affichait
# « Personne n'a encore écrit » et faisait fuir. Il porte maintenant aussi la
# note du jour de Nimbo (services/note_du_jour.py), les mots de l'équipe et
# les analyses partagées. Un message masqué par la modération (is_deleted = 2)
# disparaît du fil comme un message supprimé (is_deleted = 1).

GENRES = ("message", "note", "equipe", "partage")
SIGNALEMENTS_POUR_MASQUER = 3
MESSAGES_PAR_JOUR = 60
LIENS_MAX = 2

_pret = False


async def init_communaute() -> None:
    global _pret
    if _pret:
        return
    for col, typ in (("genre", "TEXT DEFAULT 'message'"), ("donnees", "TEXT")):
        try:
            if USE_POSTGRES:
                await execute_write(f"ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS {col} {typ}")
            else:
                await execute_write(f"ALTER TABLE community_messages ADD COLUMN {col} {typ}")
        except Exception:
            pass
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS community_signalements (
            id {cle},
            message_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            motif TEXT,
            cree_le TEXT NOT NULL,
            traite INTEGER DEFAULT 0,
            UNIQUE (message_id, user_id)
        )
    """)
    _pret = True


def _select_messages(where: str) -> str:
    """La requête du fil. L'heure de comparaison du Premium est passée en
    paramètre : datetime('now') n'existe que dans SQLite, et sous PostgreSQL
    le fil entier tombait en erreur."""
    return f"""
        SELECT m.*, u.username, u.is_admin,
               CASE WHEN u.is_admin = 1 OR (u.is_premium = 1 AND (u.premium_expires IS NULL OR u.premium_expires > ?)) THEN 1 ELSE 0 END as is_premium,
               (SELECT COUNT(*) FROM community_message_likes WHERE message_id = m.id) as likes,
               EXISTS(SELECT 1 FROM community_message_likes WHERE message_id = m.id AND user_id = ?) as user_liked,
               EXISTS(SELECT 1 FROM community_signalements WHERE message_id = m.id AND user_id = ?) as signale_par_moi
        FROM community_messages m
        LEFT JOIN web_users u ON m.user_id = u.id
        WHERE {where}
    """


def _propre(m: dict) -> dict:
    """Une publication prête pour l'écran : ses données décodées, son auteur nommé."""
    m = dict(m)
    try:
        m["donnees"] = json.loads(m["donnees"]) if m.get("donnees") else None
    except (TypeError, ValueError):
        m["donnees"] = None
    m["genre"] = m.get("genre") or "message"
    if m["genre"] == "note":
        m["username"] = "Nimbo"
    for k in ("user_liked", "signale_par_moi"):
        m[k] = bool(m.get(k))
    return m


async def publier(user_id: int, contenu: str, genre: str = "message", donnees: dict | None = None,
                  reply_to: int | None = None) -> dict | None:
    """Ajoute une publication au fil et la rend, prête pour l'écran."""
    await init_communaute()
    maintenant = datetime.now(timezone.utc).isoformat()
    await execute_write(
        "INSERT INTO community_messages (user_id, content, reply_to, created_at, is_deleted, genre, donnees) "
        "VALUES (?, ?, ?, ?, 0, ?, ?)",
        (user_id, contenu, reply_to, maintenant, genre, json.dumps(donnees, ensure_ascii=False) if donnees else None))
    rows = await execute_query(_select_messages("m.user_id = ? AND m.created_at = ?") + " ORDER BY m.id DESC LIMIT 1",
                               (maintenant, user_id, user_id, user_id, maintenant))
    return _propre(rows[0]) if rows else None


# ============== MODELS ==============

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    reply_to: Optional[int] = None


class ContactAdminRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)


class AdminReplyRequest(BaseModel):
    ticket_id: int
    message: str = Field(..., min_length=1, max_length=5000)


# ============== CHAT GENERAL ==============

@router.get("/messages")
async def get_chat_messages(
    limit: int = Query(default=50, le=100),
    before_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Le fil de la Communauté, du plus ancien au plus récent."""
    await init_communaute()
    user_id = current_user.get("id")
    maintenant = datetime.now(timezone.utc).isoformat()
    if before_id:
        messages = await execute_query(
            _select_messages("m.id < ? AND m.is_deleted = 0") + " ORDER BY m.created_at DESC LIMIT ?",
            (maintenant, user_id, user_id, before_id, limit))
    else:
        messages = await execute_query(
            _select_messages("m.is_deleted = 0") + " ORDER BY m.created_at DESC LIMIT ?",
            (maintenant, user_id, user_id, limit))
    return {"messages": [_propre(m) for m in reversed(messages or [])]}


@router.post("/messages")
async def send_chat_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Écrire dans la Communauté (ou répondre à une publication)."""
    await init_communaute()
    user_id = current_user.get("id")
    content = request.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Le message est vide.")
    if _contains_profanity(content):
        raise HTTPException(status_code=400, detail="Votre message contient des mots inappropriés. Merci de respecter les autres membres.")
    if content.lower().count("http") > LIENS_MAX:
        raise HTTPException(status_code=400, detail=f"Pas plus de {LIENS_MAX} liens par message.")
    await _verifier_rythme(user_id)

    parent = None
    if request.reply_to:
        p = await execute_query("SELECT id, user_id, content, genre FROM community_messages WHERE id = ? AND is_deleted = 0",
                                (request.reply_to,))
        if not p:
            raise HTTPException(status_code=404, detail="Le message auquel vous répondez n'existe plus.")
        parent = p[0]

    nouveau = await publier(user_id, content, "message", reply_to=request.reply_to)

    # Prévenir l'auteur du message auquel on répond : sans cela, une question
    # posée ici restait sans nouvelles, et on ne revenait pas voir.
    if parent and parent["user_id"] and int(parent["user_id"]) != int(user_id):
        from ..services.notifications import notifier
        pseudo = current_user.get("username") or "Un membre"
        await notifier(parent["user_id"], "communaute", f"{pseudo} vous a répondu",
                       content[:140] + ("…" if len(content) > 140 else ""), "/community",
                       cle=f"reponse:{nouveau['id'] if nouveau else ''}")
    return {"success": True, "message": nouveau}


async def _verifier_rythme(user_id: int) -> None:
    """Cinq messages par minute au plus, et soixante par jour : de quoi
    discuter, pas de quoi inonder le fil."""
    from datetime import timedelta
    maintenant = datetime.now(timezone.utc)
    minute = await execute_query(
        "SELECT COUNT(*) as count FROM community_messages WHERE user_id = ? AND created_at > ?",
        (user_id, (maintenant - timedelta(minutes=1)).isoformat()))
    if minute and minute[0]["count"] >= 5:
        raise HTTPException(status_code=429, detail="Vous écrivez très vite : attendez une minute avant le prochain message.")
    jour = await execute_query(
        "SELECT COUNT(*) as count FROM community_messages WHERE user_id = ? AND created_at > ?",
        (user_id, (maintenant - timedelta(days=1)).isoformat()))
    if jour and jour[0]["count"] >= MESSAGES_PAR_JOUR:
        raise HTTPException(status_code=429, detail=f"Limite de {MESSAGES_PAR_JOUR} messages par jour atteinte. Revenez demain.")


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete own message or admin can delete any"""
    user_id = current_user.get("id")
    is_admin = await check_if_admin(current_user)

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
            "INSERT INTO community_message_likes (message_id, user_id, created_at) VALUES (?, ?, ?)",
            (message_id, user_id, datetime.now(timezone.utc).isoformat())
        )
        # L'auteur l'apprend, au plus une fois par message et par jour.
        auteur = await execute_query("SELECT user_id, content FROM community_messages WHERE id = ?", (message_id,))
        if auteur and auteur[0]["user_id"] and int(auteur[0]["user_id"]) != int(user_id):
            from ..services.notifications import notifier
            from ..temps import aujourdhui_paris
            extrait = (auteur[0]["content"] or "")[:80]
            await notifier(auteur[0]["user_id"], "communaute", "Votre message a été aimé",
                           f"« {extrait}{'…' if len(auteur[0]['content'] or '') > 80 else ''} »", "/community",
                           cle=f"jaime:{message_id}:{aujourdhui_paris().isoformat()}")
        return {"liked": True}


# ============== SIGNALER, MODÉRER ==============

class Signalement(BaseModel):
    motif: str = Field(default="", max_length=200)


@router.post("/messages/{message_id}/signaler")
async def signaler(message_id: int, data: Signalement, current_user: dict = Depends(get_current_user)):
    """Signaler un message à l'équipe. Au troisième signalement par trois
    personnes différentes, il est masqué en attendant que l'équipe tranche."""
    await init_communaute()
    uid = current_user.get("id")
    m = await execute_query("SELECT id, user_id, content FROM community_messages WHERE id = ? AND is_deleted = 0",
                            (message_id,))
    if not m:
        raise HTTPException(status_code=404, detail="Ce message n'existe plus.")
    if m[0]["user_id"] == uid:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas signaler votre propre message.")
    try:
        await execute_write(
            "INSERT INTO community_signalements (message_id, user_id, motif, cree_le, traite) VALUES (?, ?, ?, ?, 0)",
            (message_id, uid, data.motif.strip(), datetime.now(timezone.utc).isoformat()))
    except Exception:
        return {"success": True, "deja": True}
    n = await execute_query("SELECT COUNT(*) AS n FROM community_signalements WHERE message_id = ? AND traite = 0",
                            (message_id,))
    total = int((n or [{"n": 0}])[0]["n"] or 0)
    masque = total >= SIGNALEMENTS_POUR_MASQUER
    if masque:
        await execute_write("UPDATE community_messages SET is_deleted = 2 WHERE id = ? AND is_deleted = 0", (message_id,))
    # L'équipe est prévenue au premier signalement, et quand le message est masqué.
    if total == 1 or masque:
        from ..services.notifications import notifier
        titre = "Message masqué après signalements" if masque else "Un message a été signalé"
        texte = f"« {(m[0]['content'] or '')[:120]} »" + (f" Motif : {data.motif.strip()}" if data.motif.strip() else "")
        for a in (await execute_query("SELECT id FROM web_users WHERE is_admin = 1") or []):
            await notifier(a["id"], "admin_signalement", titre, texte, "/admin?section=support",
                           cle=f"signalement:{message_id}:{'masque' if masque else 'premier'}")
    return {"success": True, "masque": masque}


@router.get("/admin/signalements")
async def liste_signalements(admin: dict = Depends(get_admin_user)):
    """Les messages signalés, non encore traités, le plus signalé d'abord."""
    await init_communaute()
    rows = await execute_query("""
        SELECT s.message_id, COUNT(*) AS nb, MAX(s.cree_le) AS dernier,
               m.content, m.is_deleted, m.created_at, m.user_id, u.username, u.email
        FROM community_signalements s
        JOIN community_messages m ON m.id = s.message_id
        LEFT JOIN web_users u ON u.id = m.user_id
        WHERE s.traite = 0
        GROUP BY s.message_id, m.content, m.is_deleted, m.created_at, m.user_id, u.username, u.email
        ORDER BY nb DESC, dernier DESC
    """) or []
    motifs = await execute_query("SELECT message_id, motif FROM community_signalements WHERE traite = 0 AND motif != ''") or []
    par_message: dict[int, list[str]] = {}
    for mo in motifs:
        par_message.setdefault(mo["message_id"], []).append(mo["motif"])
    return {"signalements": [{**dict(r), "masque": r["is_deleted"] == 2, "motifs": par_message.get(r["message_id"], [])[:5]}
                             for r in rows]}


class Decision(BaseModel):
    action: str  # "garder", "masquer", "supprimer"


@router.post("/admin/signalements/{message_id}")
async def traiter_signalement(message_id: int, d: Decision, admin: dict = Depends(get_admin_user)):
    """Trancher : garder le message (il réapparaît), le masquer, ou le supprimer."""
    await init_communaute()
    if d.action not in ("garder", "masquer", "supprimer"):
        raise HTTPException(status_code=400, detail="Action inconnue.")
    etat = {"garder": 0, "masquer": 2, "supprimer": 1}[d.action]
    await execute_write("UPDATE community_messages SET is_deleted = ? WHERE id = ?", (etat, message_id))
    await execute_write("UPDATE community_signalements SET traite = 1 WHERE message_id = ?", (message_id,))
    return {"success": True}


# ============== PARTAGER UNE ANALYSE ==============

class Partage(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    nom: str = Field(default="", max_length=80)
    verdict: str = Field(default="", max_length=60)
    score: Optional[int] = None
    commentaire: str = Field(default="", max_length=500)


@router.post("/partages")
async def partager_analyse(p: Partage, current_user: dict = Depends(get_current_user)):
    """Partager une analyse dans la Communauté : une carte (actif, verdict,
    score, lien) et, si on veut, une phrase. Un sujet concret, plutôt qu'un
    « bonjour » dans le vide."""
    import re
    await init_communaute()
    uid = current_user.get("id")
    symbole = p.symbol.strip().upper()
    if not re.fullmatch(r"\^?[A-Z0-9][A-Z0-9.\-=]{0,19}", symbole):
        raise HTTPException(status_code=400, detail="Symbole invalide.")
    commentaire = p.commentaire.strip()
    if commentaire and _contains_profanity(commentaire):
        raise HTTPException(status_code=400, detail="Votre message contient des mots inappropriés. Merci de respecter les autres membres.")
    await _verifier_rythme(uid)
    donnees = {
        "symbol": symbole, "nom": p.nom.strip()[:80] or symbole, "verdict": p.verdict.strip()[:60],
        "score": max(0, min(100, int(p.score))) if p.score is not None else None,
    }
    nouveau = await publier(uid, commentaire, "partage", donnees)
    return {"success": True, "message": nouveau}


# ============== LE DÉFI DE LA SEMAINE ==============

@router.get("/defi")
async def defi_de_la_semaine(current_user: dict = Depends(get_current_user)):
    """Le défi de la semaine, ma progression, et le classement de ceux qui participent."""
    from ..services import defi
    return await defi.etat(current_user.get("id"))


@router.post("/defi/participer")
async def participer_au_defi(current_user: dict = Depends(get_current_user)):
    """Apparaître dans le classement de la semaine, ou le quitter."""
    from ..services import defi
    await defi.basculer(current_user.get("id"), defi.lundi_de())
    return await defi.etat(current_user.get("id"))


@router.get("/online-count")
async def get_online_count(current_user: dict = Depends(get_current_user)):
    """Get approximate online users count"""
    # Count users active in last 5 minutes
    from datetime import timedelta
    _5min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    result = await execute_query(
        "SELECT COUNT(DISTINCT user_id) as count FROM community_messages WHERE created_at > ?",
        (_5min_ago,)
    )

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
            VALUES (?, ?, ?, 0, ?)
        """, (existing[0]["id"], user_id, f"[{request.subject}]\n\n{request.message}", datetime.now(timezone.utc).isoformat()))

        return {
            "success": True,
            "ticket_id": existing[0]["id"],
            "message": "Message ajoute a votre ticket existant"
        }

    # Create new ticket
    _now = datetime.now(timezone.utc).isoformat()
    await execute_write("""
        INSERT INTO admin_tickets (user_id, subject, status, created_at, updated_at)
        VALUES (?, ?, 'open', ?, ?)
    """, (user_id, request.subject, _now, _now))

    # Get ticket ID
    ticket = await execute_query(
        "SELECT id FROM admin_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,)
    )

    if ticket:
        await execute_write("""
            INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
            VALUES (?, ?, ?, 0, ?)
        """, (ticket[0]["id"], user_id, request.message, datetime.now(timezone.utc).isoformat()))

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

    _now = datetime.now(timezone.utc).isoformat()
    await execute_write("""
        INSERT INTO admin_ticket_messages (ticket_id, user_id, message, is_admin, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (ticket_id, user_id, request.content, 1 if is_admin else 0, _now))

    # Update ticket
    await execute_write(
        "UPDATE admin_tickets SET updated_at = ? WHERE id = ?",
        (_now, ticket_id)
    )

    # Notify the ticket owner when admin replies
    if is_admin:
        ticket_owner_id = ticket[0]["user_id"]
        subject = ticket[0].get("subject", "votre ticket")
        await create_user_notification(
            user_id=ticket_owner_id,
            type="ticket_reply",
            title="Réponse à votre ticket",
            message=f"L'équipe a répondu à : {subject}",
            link=f"/support?ticket={ticket_id}",
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
        "UPDATE admin_tickets SET status = 'closed', updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), ticket_id)
    )
    return {"success": True}


@router.post("/admin/tickets/{ticket_id}/reopen")
async def admin_reopen_ticket(
    ticket_id: int,
    admin: dict = Depends(get_admin_user)
):
    """Reopen a support ticket"""
    await execute_write(
        "UPDATE admin_tickets SET status = 'open', updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), ticket_id)
    )
    return {"success": True}


# ============== USER NOTIFICATIONS ==============

@router.get("/notifications")
async def get_user_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for the current user"""
    user_id = current_user.get("id")
    notifications = await execute_query(
        """SELECT * FROM user_notifications WHERE user_id = ?
           ORDER BY created_at DESC LIMIT 50""",
        (user_id,)
    )
    # Compté en base, pas sur les 50 affichées : au-delà, la pastille mentait.
    n = await execute_query(
        "SELECT COUNT(*) AS n FROM user_notifications WHERE user_id = ? AND is_read = 0", (user_id,))
    unread_count = int((n or [{"n": 0}])[0]["n"] or 0)
    return {"notifications": notifications or [], "unread_count": unread_count}


@router.post("/notifications/{notif_id}/read")
async def mark_user_notification_read(
    notif_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Mark a single user notification as read"""
    user_id = current_user.get("id")
    await execute_write(
        "UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notif_id, user_id)
    )
    return {"success": True}


@router.delete("/notifications/{notif_id}")
async def delete_user_notification(notif_id: int, current_user: dict = Depends(get_current_user)):
    """Effacer une notification de son fil."""
    await execute_write("DELETE FROM user_notifications WHERE id = ? AND user_id = ?",
                        (notif_id, current_user.get("id")))
    return {"success": True}


@router.delete("/notifications")
async def clear_read_user_notifications(current_user: dict = Depends(get_current_user)):
    """Effacer d'un coup les notifications déjà lues ; les non lues restent."""
    await execute_write("DELETE FROM user_notifications WHERE user_id = ? AND is_read = 1",
                        (current_user.get("id"),))
    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_user_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all user notifications as read"""
    user_id = current_user.get("id")
    await execute_write(
        "UPDATE user_notifications SET is_read = 1 WHERE user_id = ?",
        (user_id,)
    )
    return {"success": True}
