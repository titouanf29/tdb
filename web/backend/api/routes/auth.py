"""
Authentication routes - Email/Password with email verification
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write, create_admin_notification
from ..email_service import send_verification_email, EMAIL_ENABLED

router = APIRouter()
security = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "tdb-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 1  # 1 hour

VERIFICATION_EXPIRE_HOURS = 24


# === Models ===

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=30)
    first_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# === Helpers ===

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def _create_verification_token(user_id: int) -> str:
    """Generate and store a fresh verification token, deleting old ones."""
    await execute_write(
        "DELETE FROM email_verification_tokens WHERE user_id = ?",
        (user_id,)
    )
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(hours=VERIFICATION_EXPIRE_HOURS)).isoformat()
    await execute_write(
        """INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
           VALUES (?, ?, ?, ?)""",
        (user_id, token, expires_at, datetime.utcnow().isoformat())
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

    await execute_write(
        "UPDATE web_users SET last_active = ? WHERE id = ?",
        (datetime.utcnow().isoformat(), int(user_id))
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
    existing = await execute_query(
        "SELECT id FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    existing_username = await execute_query(
        "SELECT id FROM web_users WHERE username = ?", (data.username.lower(),)
    )
    if existing_username:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")

    password_hash = hash_password(data.password)
    await execute_write(
        """INSERT INTO web_users (email, username, password_hash, first_name, created_at, email_verified)
           VALUES (?, ?, ?, ?, ?, 0)""",
        (data.email.lower(), data.username.lower(), password_hash,
         data.first_name or data.username, datetime.utcnow().isoformat())
    )

    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    user = users[0]

    await execute_write(
        "INSERT INTO wallet (user_id, balance, currency, created_at) VALUES (?, 10000.0, 'USD', ?)",
        (f"web_{user['id']}", datetime.utcnow().isoformat())
    )

    # Notify admins of new registration
    await create_admin_notification(
        type="new_user",
        title="Nouvel utilisateur",
        message=f"{data.username} vient de s'inscrire ({data.email.lower()})",
        link="/admin?tab=users"
    )

    # Send verification email (or skip if SMTP not configured)
    token = await _create_verification_token(user["id"])
    try:
        await send_verification_email(data.email.lower(), data.username, token)
    except Exception as e:
        # Don't fail registration if email fails; log and continue
        import logging
        logging.getLogger(__name__).error("Failed to send verification email: %s", e)

    if EMAIL_ENABLED:
        return {
            "requires_verification": True,
            "message": "Compte créé ! Vérifiez votre email pour activer votre compte.",
            "email": data.email.lower(),
        }
    else:
        # Dev mode: no SMTP configured → auto-verify and return token
        await execute_write(
            "UPDATE web_users SET email_verified = 1 WHERE id = ?", (user["id"],)
        )
        access_token = create_access_token({"sub": str(user["id"])})
        return TokenResponse(
            access_token=access_token,
            user={
                "id": user["id"], "email": user["email"],
                "username": user["username"],
                "first_name": user.get("first_name"),
                "user_type": "email",
            }
        )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
    """Login with email/password. Requires verified email."""
    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    if not users:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    user = users[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    # Check email verification (skip check if SMTP not configured)
    if EMAIL_ENABLED and not user.get("email_verified"):
        raise HTTPException(
            status_code=403,
            detail="Email non vérifié. Consultez votre boîte mail ou renvoyez le lien.",
            headers={"X-Requires-Verification": "true", "X-User-Email": user["email"]},
        )

    await execute_write(
        "UPDATE web_users SET last_login = ? WHERE id = ?",
        (datetime.utcnow().isoformat(), user["id"])
    )

    access_token = create_access_token({"sub": str(user["id"])})
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"], "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
            "user_type": "email",
        }
    )


@router.get("/verify-email")
async def verify_email(token: str):
    """Verify email address from token link."""
    rows = await execute_query(
        "SELECT * FROM email_verification_tokens WHERE token = ?", (token,)
    )
    if not rows:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    record = rows[0]
    if datetime.utcnow() > datetime.fromisoformat(record["expires_at"]):
        await execute_write(
            "DELETE FROM email_verification_tokens WHERE token = ?", (token,)
        )
        raise HTTPException(status_code=400, detail="Lien expiré. Demandez un nouveau.")

    user_id = record["user_id"]
    await execute_write("UPDATE web_users SET email_verified = 1 WHERE id = ?", (user_id,))
    await execute_write("DELETE FROM email_verification_tokens WHERE user_id = ?", (user_id,))

    users = await execute_query("SELECT * FROM web_users WHERE id = ?", (user_id,))
    user = users[0]
    access_token = create_access_token({"sub": str(user_id)})

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"], "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
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


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
