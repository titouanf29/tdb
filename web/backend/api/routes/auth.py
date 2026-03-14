"""
Authentication routes - Email/Password
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from jose import JWTError, jwt
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write

router = APIRouter()
security = HTTPBearer(auto_error=False)
# Module-level limiter; main.py replaces this with the app-wide limiter
limiter = Limiter(key_func=get_remote_address)

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

    users = await execute_query(
        "SELECT * FROM web_users WHERE id = ?",
        (int(user_id),)
    )

    if not users:
        raise HTTPException(status_code=404, detail="User not found")

    user = dict(users[0])
    user["user_type"] = "email"
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user or None if not authenticated"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# === Routes ===

@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest):
    """Register a new user with email/password"""
    existing = await execute_query(
        "SELECT id FROM web_users WHERE email = ?",
        (data.email.lower(),)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_username = await execute_query(
        "SELECT id FROM web_users WHERE username = ?",
        (data.username.lower(),)
    )
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    password_hash = hash_password(data.password)
    await execute_write(
        """INSERT INTO web_users (email, username, password_hash, first_name, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (data.email.lower(), data.username.lower(), password_hash,
         data.first_name or data.username, datetime.utcnow().isoformat())
    )

    users = await execute_query(
        "SELECT * FROM web_users WHERE email = ?",
        (data.email.lower(),)
    )
    user = users[0]

    await execute_write(
        """INSERT INTO wallet (user_id, balance, currency, created_at)
           VALUES (?, 10000.0, 'USD', ?)""",
        (f"web_{user['id']}", datetime.utcnow().isoformat())
    )

    access_token = create_access_token({"sub": str(user["id"])})

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
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
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

    access_token = create_access_token({"sub": str(user["id"])})

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


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user["id"],
        "email": current_user.get("email"),
        "username": current_user.get("username"),
        "first_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "created_at": current_user.get("created_at"),
        "user_type": "email"
    }


@router.post("/logout")
async def logout():
    """Logout (client should delete token)"""
    return {"message": "Logged out successfully"}
