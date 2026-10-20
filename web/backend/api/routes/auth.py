"""
Authentication routes - Email/Password with email verification
"""
import asyncio
import hashlib
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator, EmailStr, Field
import jwt
from jwt import PyJWTError as JWTError
import bcrypt
from slowapi import Limiter
from ..limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write, create_admin_notification
from ..email_service import send_verification_email, send_password_reset_email, EMAIL_ENABLED

router = APIRouter()
security = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=cle_client)

# JWT Configuration
from ..secret_jwt import SECRET as _JWT_SECRET_ENV  # voir secret_jwt.py
from ..environnement import EN_PRODUCTION
SECRET_KEY = _JWT_SECRET_ENV
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 1   # session courte (sans "rester connecté")
REMEMBER_ME_EXPIRE_DAYS   = 30  # session longue (avec "rester connecté")

VERIFICATION_EXPIRE_HOURS = 24


# === Models ===

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    # Lettres, chiffres, point, tiret et souligné : le pseudo est repris dans
    # les e-mails du site, il ne doit pas pouvoir y injecter du HTML.
    # Les espaces sont permis à l'intérieur (« Jean Dupont ») : ils ne peuvent
    # rien injecter. Ceux du début et de la fin sont retirés.
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-zÀ-ÿ0-9_.\- ]+$")
    first_name: Optional[str] = Field(default=None, max_length=100)

    @field_validator("username", mode="before")
    @classmethod
    def _pseudo_net(cls, v):
        # « Jean   Dupont  » devient « Jean Dupont ».
        return " ".join(str(v).split()) if isinstance(v, str) else v

    @field_validator("email", mode="before")
    @classmethod
    def _email_net(cls, v):
        # Un espace collé par le clavier du téléphone ne doit pas tout refuser.
        return v.strip() if isinstance(v, str) else v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

    @field_validator("email", mode="before")
    @classmethod
    def _email_net(cls, v):
        return v.strip() if isinstance(v, str) else v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# === Helpers ===

# bcrypt refuses anything over 72 BYTES (not characters): "éé…" is 2 bytes per
# char, so a 40-char accented passphrase overflows and raises ValueError. Left
# unhandled that surfaced as a 500 on register / login / change-password /
# delete-account. We truncate on the byte boundary — the historical bcrypt
# behaviour — instead of crashing.
BCRYPT_MAX_BYTES = 72


def _bcrypt_bytes(password: str) -> bytes:
    raw = (password or "").encode("utf-8")
    if len(raw) <= BCRYPT_MAX_BYTES:
        return raw
    # Cut at a valid UTF-8 boundary so we never split a multibyte character
    return raw[:BCRYPT_MAX_BYTES].decode("utf-8", "ignore").encode("utf-8")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_bcrypt_bytes(password), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Never raises: a malformed/legacy hash means 'wrong password', not a 500."""
    try:
        return bcrypt.checkpw(_bcrypt_bytes(password), (hashed or "").encode())
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def token_payload(user: dict, remember_me: bool = False) -> dict:
    """Build the JWT payload for a user.

    `pwc` (password changed at) is stamped in so that changing the password
    invalidates every token minted before the change (see get_current_user).
    Users who never changed their password have password_changed_at NULL and
    therefore no `pwc` claim — their existing sessions are never invalidated.
    """
    p = {"sub": str(user["id"]), "rm": remember_me}
    if user.get("password_changed_at"):
        p["pwc"] = user["password_changed_at"]
    return p


async def _create_verification_token(user_id: int) -> str:
    """Generate and store a fresh verification token, deleting old ones."""
    await execute_write(
        "DELETE FROM email_verification_tokens WHERE user_id = ?",
        (user_id,)
    )
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_EXPIRE_HOURS)).isoformat()
    await execute_write(
        """INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
           VALUES (?, ?, ?, ?)""",
        (user_id, token, expires_at, datetime.now(timezone.utc).isoformat())
    )
    return token


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    users = await execute_query("SELECT * FROM web_users WHERE id = ?", (int(user_id),))
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    # Un compte suspendu par l'administration ne passe plus, même avec un
    # jeton encore valide : le bannissement ne bloquait rien.
    if users[0].get("is_active") in (0, False):
        raise HTTPException(status_code=403, detail="Ce compte est suspendu.")

    # Tokens minted before the last password change are rejected.
    changed = users[0].get("password_changed_at")
    if changed and payload.get("pwc") != changed:
        raise HTTPException(status_code=401, detail="Session expirée, reconnectez-vous")

    await execute_write(
        "UPDATE web_users SET last_active = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), int(user_id))
    )

    user = dict(users[0])
    user["user_type"] = "email"
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# === Routes ===

@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest):
    """Register a new user and send verification email."""
    # Check if registrations are open
    reg_rows = await execute_query(
        "SELECT value FROM admin_settings WHERE key = 'registration_enabled'"
    )
    reg_enabled = reg_rows[0]["value"] if reg_rows else "true"
    if reg_enabled == "false":
        msg_rows = await execute_query(
            "SELECT value FROM admin_settings WHERE key = 'registration_closed_message'"
        )
        msg = (msg_rows[0]["value"] if msg_rows else None) or \
              "Les inscriptions sont temporairement fermées."
        raise HTTPException(status_code=403, detail=msg)

    # La même règle que le changement et la réinitialisation du mot de passe :
    # l'inscription acceptait « 123456 ».
    erreur_mdp = regle_mot_de_passe(data.password)
    if erreur_mdp:
        raise HTTPException(status_code=400, detail=erreur_mdp)

    existing = await execute_query(
        "SELECT id FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Cette adresse e-mail a déjà un compte. Connectez-vous, ou utilisez « Mot de passe oublié » si vous ne vous en souvenez plus.")

    existing_username = await execute_query(
        "SELECT id FROM web_users WHERE username = ?", (data.username.lower(),)
    )
    if existing_username:
        raise HTTPException(status_code=400, detail="Ce pseudo est déjà pris : choisissez-en un autre.")

    password_hash = hash_password(data.password)
    await execute_write(
        """INSERT INTO web_users (email, username, password_hash, first_name, created_at, email_verified)
           VALUES (?, ?, ?, ?, ?, 0)""",
        (data.email.lower(), data.username.lower(), password_hash,
         data.first_name or data.username, datetime.now(timezone.utc).isoformat())
    )

    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    user = users[0]

    # Welcome bonus: read from admin_settings (default 10 000)
    bonus_rows = await execute_query(
        "SELECT value FROM admin_settings WHERE key = 'welcome_bonus_amount'"
    )
    try:
        welcome_bonus = float(bonus_rows[0]["value"]) if bonus_rows else 10000.0
    except (ValueError, TypeError):
        welcome_bonus = 10000.0

    await execute_write(
        "INSERT INTO wallet (user_id, balance, currency, created_at) VALUES (?, ?, 'USD', ?)",
        (f"web_{user['id']}", welcome_bonus, datetime.now(timezone.utc).isoformat())
    )

    # Mark all existing changelogs as already read so new users don't see old ones
    existing_changelogs = await execute_query("SELECT id FROM admin_changelogs")
    _now_iso = datetime.now(timezone.utc).isoformat()
    for cl in (existing_changelogs or []):
        try:
            await execute_write(
                """INSERT INTO user_changelog_reads (user_id, changelog_id, read_at)
                   VALUES (?, ?, ?)
                   ON CONFLICT (user_id, changelog_id) DO NOTHING""",
                (user["id"], cl["id"], _now_iso)
            )
        except Exception:
            pass  # Ignore if table uses different conflict syntax

    # Notify admins of new registration
    await create_admin_notification(
        type="new_user",
        title="Nouvel utilisateur",
        message=f"{data.username} vient de s'inscrire ({data.email.lower()})",
        link="/admin?tab=users"
    )

    # Auto-verify and return token directly (no email verification required)
    await execute_write(
        "UPDATE web_users SET email_verified = 1 WHERE id = ?", (user["id"],)
    )
    access_token = create_access_token(token_payload(user))
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"], "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
            "trading_level": user.get("trading_level"),
            "user_type": "email",
        }
    )


SESSION_COOKIE = "tdb_sess"


def _set_session_cookie(response: Response, token: str, max_age: int) -> None:
    """Mirror the access token into an httpOnly cookie.

    The app itself authenticates with the Authorization header and keeps the
    token in localStorage. That is invisible to anything running before the
    page's JavaScript — including the Next.js edge middleware, which is the
    only place a lock can be enforced *before* HTML reaches the browser.

    So the same token is also written as a cookie. httpOnly keeps it out of
    reach of scripts (so this is not a new XSS surface), SameSite=Lax keeps it
    off cross-site requests, and Secure is dropped only in local development
    where there is no HTTPS.
    """
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        secure=EN_PRODUCTION,
        samesite="lax",
        path="/",
    )


# Une empreinte bcrypt quelconque, calculée une fois, pour les tentatives sur
# une adresse inconnue (voir login).
_EMPREINTE_FACTICE = bcrypt.hashpw(b"empreinte-factice", bcrypt.gensalt()).decode()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, data: LoginRequest):
    """Login with email/password. Requires verified email."""
    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    if not users:
        # Le même calcul bcrypt qu'avec un vrai compte : sans lui, la réponse
        # arrivait plus vite et trahissait qu'aucun compte n'existe.
        verify_password(data.password, _EMPREINTE_FACTICE)
        raise HTTPException(status_code=401, detail="Adresse e-mail ou mot de passe incorrect. Vous l'avez oublié ? « Mot de passe oublié » vous envoie un lien.")

    user = users[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Adresse e-mail ou mot de passe incorrect. Vous l'avez oublié ? « Mot de passe oublié » vous envoie un lien.")
    if user.get("is_active") in (0, False):
        raise HTTPException(status_code=403, detail="Ce compte est suspendu.")

    await execute_write(
        "UPDATE web_users SET last_login = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), user["id"])
    )

    expires = (
        timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
        if data.remember_me
        else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    access_token = create_access_token(
        token_payload(user, data.remember_me),
        expires_delta=expires,
    )
    _set_session_cookie(response, access_token, int(expires.total_seconds()))
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"], "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
            "trading_level": user.get("trading_level"),
            "user_type": "email",
        }
    )


@router.get("/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, token: str):
    """Verify email address from token link."""
    rows = await execute_query(
        "SELECT * FROM email_verification_tokens WHERE token = ?", (token,)
    )
    if not rows:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    record = rows[0]
    if datetime.now(timezone.utc) > datetime.fromisoformat(record["expires_at"]):
        await execute_write(
            "DELETE FROM email_verification_tokens WHERE token = ?", (token,)
        )
        raise HTTPException(status_code=400, detail="Lien expiré. Demandez un nouveau.")

    user_id = record["user_id"]
    await execute_write("UPDATE web_users SET email_verified = 1 WHERE id = ?", (user_id,))
    await execute_write("DELETE FROM email_verification_tokens WHERE user_id = ?", (user_id,))

    users = await execute_query("SELECT * FROM web_users WHERE id = ?", (user_id,))
    user = users[0]
    access_token = create_access_token(token_payload(user))

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"], "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
            "trading_level": user.get("trading_level"),
            "user_type": "email",
        }
    )


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, data: dict):
    """Resend verification email."""
    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")

    users = await execute_query("SELECT * FROM web_users WHERE email = ?", (email,))
    if not users:
        # Don't reveal if email exists
        return {"message": "Si ce compte existe, un email a été envoyé."}

    user = users[0]
    if user.get("email_verified"):
        return {"message": "Ce compte est déjà vérifié."}

    token = await _create_verification_token(user["id"])
    try:
        await send_verification_email(email, user["username"], token)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Failed to resend verification: %s", e)
        raise HTTPException(status_code=500, detail="Impossible d'envoyer l'email. Réessayez.")

    return {"message": "Email de vérification envoyé."}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user.get("email"),
        "username": current_user.get("username"),
        "first_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "created_at": current_user.get("created_at"),
        "email_verified": bool(current_user.get("email_verified")),
        "user_type": "email",
        "trading_level": current_user.get("trading_level"),
    }


@router.post("/refresh")
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user),
):
    """Issue a fresh token, en conservant le flag remember_me du token précédent."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        remember_me = bool(payload.get("rm", False))
    except JWTError:
        remember_me = False

    expires = (
        timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
        if remember_me
        else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    new_token = create_access_token(
        data=token_payload(current_user, remember_me),
        expires_delta=expires,
    )
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    # Leaving the cookie behind would keep an admin past the maintenance gate
    # long after they signed out.
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"message": "Logged out successfully"}



# === Mot de passe oublié ======================================================
#
# Le modèle d'e-mail de réinitialisation existait (email_service), mais aucune
# route ne l'utilisait et aucune page n'y menait : un utilisateur qui oubliait
# son mot de passe n'avait AUCUN moyen de récupérer son compte. Seul
# l'administrateur avait une porte de secours (ADMIN_BOOTSTRAP_* dans main.py).
#
# Les règles de sécurité, et pourquoi chacune :
#   · même réponse que le compte existe ou non — sinon le formulaire sert à
#     vérifier quelles adresses sont inscrites ;
#   · l'e-mail part en tâche de fond, pour que le temps de réponse ne trahisse
#     pas davantage l'existence du compte ;
#   · on stocke l'EMPREINTE du jeton, pas le jeton ; une fuite de la table ne
#     donne aucun lien utilisable ;
#   · un lien vaut 1 heure et sert une fois ; en demander un nouveau annule
#     les précédents ; trois demandes par heure et par compte au maximum ;
#   · réinitialiser fixe `password_changed_at`, ce qui déconnecte toutes les
#     sessions ouvertes — si quelqu'un d'autre utilisait le compte, il en sort.

_log = logging.getLogger(__name__)

RESET_EXPIRE_MINUTES = 60
RESET_MAX_PAR_HEURE = 3

REPONSE_NEUTRE = {
    "success": True,
    "message": ("Si un compte existe pour cette adresse, un e-mail vient de lui être "
                "envoyé avec un lien valable une heure. Pensez à regarder dans les "
                "indésirables."),
}

LIEN_INVALIDE = ("Ce lien n'est plus valable : il a expiré, il a déjà servi, ou un "
                 "lien plus récent a été demandé. Demandez-en un nouveau.")


def regle_mot_de_passe(motdepasse: str) -> Optional[str]:
    """La règle d'un mot de passe, en un seul endroit — le changement de mot
    de passe dans les Réglages et la réinitialisation appliquent la même.
    Rend le message d'erreur, ou None si le mot de passe convient."""
    if len(motdepasse) < 8 or not re.search(r"[A-Za-z]", motdepasse) or not re.search(r"\d", motdepasse):
        return "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre."
    if len(motdepasse.encode("utf-8")) > 72:
        # La limite de bcrypt : au-delà, les caractères en trop sont ignorés
        # en silence, et deux mots de passe différents deviendraient égaux.
        # La limite est en OCTETS : un caractère accentué en compte deux.
        # Annoncer « 72 caractères » serait faux pour un mot de passe accentué.
        return "Le mot de passe est trop long : raccourcissez-le un peu."
    return None


def _empreinte(jeton: str) -> str:
    return hashlib.sha256(jeton.encode("utf-8")).hexdigest()


async def _jeton_valide(jeton: str) -> Optional[dict]:
    if not jeton or len(jeton) > 200:
        return None
    rows = await execute_query(
        "SELECT * FROM password_reset_tokens WHERE token_hash = ?", (_empreinte(jeton),)
    )
    if not rows:
        return None
    r = rows[0]
    if r.get("used_at"):
        return None
    try:
        expire = datetime.fromisoformat(str(r["expires_at"]))
    except (TypeError, ValueError):
        return None
    if expire.tzinfo is None:
        expire = expire.replace(tzinfo=timezone.utc)
    return r if expire > datetime.now(timezone.utc) else None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=1, max_length=128)


async def _envoyer_lien(email: str, username: str, jeton: str) -> None:
    try:
        await send_password_reset_email(email, username, jeton)
    except Exception as exc:  # jamais d'échec visible : la réponse est déjà partie
        _log.error("envoi du lien de réinitialisation impossible : %s", exc)


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """Envoie un lien de réinitialisation. Répond pareil dans tous les cas."""
    email = data.email.strip().lower()
    users = await execute_query(
        "SELECT id, username, email, is_active FROM web_users WHERE email = ?", (email,)
    )
    # Compte inexistant ou suspendu : même réponse, aucun e-mail.
    if not users or users[0].get("is_active") in (0, False):
        return REPONSE_NEUTRE
    u = users[0]
    maintenant = datetime.now(timezone.utc)

    recents = await execute_query(
        "SELECT COUNT(*) AS n FROM password_reset_tokens WHERE user_id = ? AND created_at > ?",
        (u["id"], (maintenant - timedelta(hours=1)).isoformat()),
    )
    if recents and int(recents[0]["n"] or 0) >= RESET_MAX_PAR_HEURE:
        return REPONSE_NEUTRE

    # Un nouveau lien annule les précédents : seul le dernier e-mail reçu marche.
    await execute_write(
        "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
        (maintenant.isoformat(), u["id"]),
    )
    jeton = secrets.token_urlsafe(32)
    await execute_write(
        """INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
           VALUES (?, ?, ?, ?)""",
        (u["id"], _empreinte(jeton),
         (maintenant + timedelta(minutes=RESET_EXPIRE_MINUTES)).isoformat(),
         maintenant.isoformat()),
    )

    if EMAIL_ENABLED:
        asyncio.create_task(_envoyer_lien(u["email"], u["username"], jeton))
    else:
        # Rien ne peut partir : l'exploitant doit le savoir, l'utilisateur
        # reçoit la même réponse (la lui changer révélerait que le compte existe).
        _log.warning("SMTP non configuré : lien de réinitialisation NON envoyé (compte %s)", u["id"])
    return REPONSE_NEUTRE


@router.get("/reset-password/check")
@limiter.limit("20/minute")
async def check_reset_token(request: Request, token: str = Query(..., max_length=200)):
    """Le lien est-il encore bon ? Permet à la page de le dire AVANT la saisie."""
    return {"valid": (await _jeton_valide(token)) is not None}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, data: ResetPasswordRequest):
    """Pose le nouveau mot de passe et consomme le lien."""
    r = await _jeton_valide(data.token)
    if not r:
        raise HTTPException(status_code=400, detail=LIEN_INVALIDE)
    erreur = regle_mot_de_passe(data.password)
    if erreur:
        raise HTTPException(status_code=400, detail=erreur)

    maintenant = datetime.now(timezone.utc).isoformat()
    # Le lien est consommé AVANT d'écrire le mot de passe, et on vérifie qu'on
    # est bien celui qui l'a consommé : deux envois simultanés du même lien ne
    # doivent pas produire deux changements.
    await execute_write(
        "UPDATE password_reset_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL",
        (maintenant, r["id"]),
    )
    verif = await execute_query("SELECT used_at FROM password_reset_tokens WHERE id = ?", (r["id"],))
    if not verif or str(verif[0].get("used_at")) != maintenant:
        raise HTTPException(status_code=400, detail=LIEN_INVALIDE)

    # `password_changed_at` déconnecte toutes les sessions ouvertes ;
    # `email_verified` : recevoir ce lien prouve que l'adresse est la bonne.
    await execute_write(
        "UPDATE web_users SET password_hash = ?, password_changed_at = ?, email_verified = 1 WHERE id = ?",
        (hash_password(data.password), maintenant, r["user_id"]),
    )
    await execute_write(
        "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
        (maintenant, r["user_id"]),
    )
    return {"success": True}
