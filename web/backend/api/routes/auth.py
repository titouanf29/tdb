"""
Authentication routes - Email/Password + Telegram
"""
import os
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
import bcrypt

from ..database import execute_query, execute_write

router = APIRouter()
security = HTTPBearer(auto_error=False)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "tdb-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days


# === Models ===

class RegisterRequest(BaseModel):
    """Email/Password registration"""
    email: EmailStr
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=30)
    first_name: Optional[str] = None


class LoginRequest(BaseModel):
    """Email/Password login"""
    email: EmailStr
    password: str


class TelegramAuth(BaseModel):
    """Telegram Login Widget data"""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: str


# === Password Helpers ===

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def verify_telegram_auth(data: TelegramAuth) -> bool:
    """Verify Telegram Login Widget authentication"""
    bot_token = os.getenv("TELEGRAM_TOKEN", "")
    if not bot_token:
        return False

    # Build data check string
    check_data = {
        "id": data.id,
        "first_name": data.first_name,
        "auth_date": data.auth_date
    }
    if data.last_name:
        check_data["last_name"] = data.last_name
    if data.username:
        check_data["username"] = data.username
    if data.photo_url:
        check_data["photo_url"] = data.photo_url

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(check_data.items())
    )

    secret_key = hashlib.sha256(bot_token.encode()).digest()
    hmac_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(hmac_hash, data.hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT"""
    print(f"[AUTH] get_current_user called")
    print(f"[AUTH] credentials: {credentials}")

    if not credentials:
        print("[AUTH] No credentials provided")
        raise HTTPException(status_code=401, detail="Not authenticated")

    print(f"[AUTH] Token: {credentials.credentials[:50]}...")

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"[AUTH] Decoded payload: {payload}")
        user_id = payload.get("sub")
        user_type = payload.get("type", "telegram")  # email or telegram
        if user_id is None:
            print("[AUTH] user_id is None")
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as e:
        print(f"[AUTH] JWTError: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    if user_type == "email":
        users = await execute_query(
            "SELECT * FROM web_users WHERE id = ?",
            (int(user_id),)  # Convert string back to int for DB query
        )
    else:
        users = await execute_query(
            "SELECT * FROM users WHERE telegram_id = ?",
            (int(user_id),)  # Convert string back to int for DB query
        )

    if not users:
        raise HTTPException(status_code=404, detail="User not found")

    user = dict(users[0])
    user["user_type"] = user_type
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user or None if not authenticated"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# === Email/Password Routes ===

@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest):
    """Register a new user with email/password"""
    # Check if email already exists
    existing = await execute_query(
        "SELECT id FROM web_users WHERE email = ?",
        (data.email.lower(),)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username already exists
    existing_username = await execute_query(
        "SELECT id FROM web_users WHERE username = ?",
        (data.username.lower(),)
    )
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user
    password_hash = hash_password(data.password)
    await execute_write(
        """INSERT INTO web_users (email, username, password_hash, first_name, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (data.email.lower(), data.username.lower(), password_hash,
         data.first_name or data.username, datetime.utcnow().isoformat())
    )

    # Get created user
    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?",
        (data.email.lower(),)
    )
    user = users[0]

    # Create wallet for new user
    await execute_write(
        """INSERT INTO wallet (user_id, balance, currency, created_at)
           VALUES (?, 10000.0, 'USD', ?)""",
        (f"web_{user['id']}", datetime.utcnow().isoformat())
    )

    # Create JWT token (sub must be a string)
    access_token = create_access_token({"sub": str(user["id"]), "type": "email"})

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
            "user_type": "email"
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login with email/password"""
    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?",
        (data.email.lower(),)
    )

    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = users[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT token (sub must be a string)
    access_token = create_access_token({"sub": str(user["id"]), "type": "email"})

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "first_name": user.get("first_name"),
            "user_type": "email"
        }
    )


@router.post("/telegram", response_model=TokenResponse)
async def login_with_telegram(auth_data: TelegramAuth):
    """
    Authenticate with Telegram Login Widget
    This links the Telegram account to the web session
    """
    # Verify auth (disabled in dev for testing)
    # if not verify_telegram_auth(auth_data):
    #     raise HTTPException(status_code=401, detail="Invalid Telegram authentication")

    # Check if auth is not too old (1 day max)
    if datetime.utcnow().timestamp() - auth_data.auth_date > 86400:
        raise HTTPException(status_code=401, detail="Authentication expired")

    # Get or create user in database
    users = await execute_query(
        "SELECT * FROM users WHERE telegram_id = ?",
        (auth_data.id,)
    )

    if not users:
        # Create new user (synced with bot)
        await execute_write(
            """INSERT INTO users (telegram_id, username, first_name, last_name, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (auth_data.id, auth_data.username, auth_data.first_name,
             auth_data.last_name, datetime.utcnow().isoformat())
        )
        users = await execute_query(
            "SELECT * FROM users WHERE telegram_id = ?",
            (auth_data.id,)
        )

    user = users[0]

    # Create JWT token
    access_token = create_access_token({"sub": auth_data.id})

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["telegram_id"],
            "username": user.get("username"),
            "first_name": user.get("first_name"),
            "photo_url": auth_data.photo_url
        }
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user_type = current_user.get("user_type", "telegram")

    if user_type == "email":
        return {
            "id": current_user["id"],
            "email": current_user.get("email"),
            "username": current_user.get("username"),
            "first_name": current_user.get("first_name"),
            "last_name": current_user.get("last_name"),
            "created_at": current_user.get("created_at"),
            "user_type": "email"
        }
    else:
        return {
            "id": current_user["telegram_id"],
            "username": current_user.get("username"),
            "first_name": current_user.get("first_name"),
            "last_name": current_user.get("last_name"),
            "created_at": current_user.get("created_at"),
            "user_type": "telegram"
        }


@router.post("/logout")
async def logout():
    """Logout (client should delete token)"""
    return {"message": "Logged out successfully"}
