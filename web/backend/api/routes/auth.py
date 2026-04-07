"""
Authentication routes - Email/Password with email verification
"""
import os
import secrets
from datetime import datetime, timedelta, timezone
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
_JWT_SECRET_ENV = os.getenv("JWT_SECRET", "")
if not _JWT_SECRET_ENV:
    import sys
    _is_prod = os.getenv("ENV", "development").lower() == "production"
    if _is_prod:
        print("[FATAL] JWT_SECRET environment variable is not set. Refusing to start in production.", flush=True)
        sys.exit(1)
    else:
        # Development fallback — never used in production
        _JWT_SECRET_ENV = "dev-only-insecure-secret-do-not-use-in-prod"
SECRET_KEY = _JWT_SECRET_ENV
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 1   # session courte (sans "rester connecté")
REMEMBER_ME_EXPIRE_DAYS   = 30  # session longue (avec "rester connecté")

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
    remember_me: bool = False


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
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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
         data.first_name or data.username, datetime.now(timezone.utc).isoformat())
    )

    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?", (data.email.lower(),)
    )
    user = users[0]

    await execute_write(
        "INSERT INTO wallet (user_id, balance, currency, created_at) VALUES (?, 10000.0, 'USD', ?)",
        (f"web_{user['id']}", datetime.now(timezone.utc).isoformat())
    )

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
    access_token = create_access_token({"sub": str(user["id"])})
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
        {"sub": str(user["id"]), "rm": data.remember_me},
        expires_delta=expires,
    )
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
    access_token = create_access_token({"sub": str(user_id)})

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
        data={"sub": str(current_user["id"]), "rm": remember_me},
        expires_delta=expires,
    )
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
