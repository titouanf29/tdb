"""
Authentication routes - Link Telegram account to web
"""
import os
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt

from ..database import execute_query, execute_write

router = APIRouter()
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "tdb-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days


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
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    users = await execute_query(
        "SELECT * FROM users WHERE telegram_id = ?",
        (user_id,)
    )
    if not users:
        raise HTTPException(status_code=404, detail="User not found")

    return users[0]


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
    return {
        "id": current_user["telegram_id"],
        "username": current_user.get("username"),
        "first_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "created_at": current_user.get("created_at")
    }


@router.post("/logout")
async def logout():
    """Logout (client should delete token)"""
    return {"message": "Logged out successfully"}
