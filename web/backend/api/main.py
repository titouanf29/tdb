"""
TDB Web Backend - Main FastAPI Application
"""
import os
import time
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env BEFORE importing routes (so they can read env vars)
env_path = Path(__file__).parent.parent.parent.parent / ".env"
load_dotenv(env_path)
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

from .database import init_db, init_web_tables, execute_query
from .routes import auth, market, wallet, analysis, users, favorites, ai_assistant, admin, premium, community, tools, portfolio
from .routes import insights

# ── JWT constants (imported once at module level — avoids dynamic import inside middleware) ──
from .routes.auth import SECRET_KEY, ALGORITHM
from jose import JWTError, jwt as _jose_jwt


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    await init_web_tables()
    yield


app = FastAPI(
    title="TDB Web API",
    description="Trading Dashboard Bot - Web API",
    version="1.0.0",
    lifespan=lifespan,
)

# Global rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Trop de requêtes. Limite : {exc.detail}"}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne s'est produite. Réessayez."}
    )

# CORS
_frontend_env = os.getenv("FRONTEND_URL", "")
_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
if _frontend_env:
    _origins += [u.strip() for u in _frontend_env.split(",") if u.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Maintenance-mode cache (TTL = 8 s to avoid DB on every request) ────────────
_maint_cache: dict = {"value": None, "ts": 0.0}
_MAINT_TTL = 2  # seconds — short TTL so changes take effect quickly

async def _get_maintenance_setting() -> tuple[bool, str]:
    """Returns (is_on, message). Cached for _MAINT_TTL seconds."""
    now = time.monotonic()
    if now - _maint_cache["ts"] < _MAINT_TTL and _maint_cache["value"] is not None:
        return _maint_cache["value"]
    try:
        rows = await execute_query(
            "SELECT key, value FROM admin_settings WHERE key IN ('maintenance_mode','maintenance_message')"
        )
        settings = {r["key"]: r["value"] for r in (rows or [])}
        is_on = settings.get("maintenance_mode", "false") == "true"
        msg   = settings.get("maintenance_message") or "Le site est en cours de maintenance. Revenez bientôt."
        result = (is_on, msg)
    except Exception as exc:
        logger.warning("maintenance_middleware: DB read failed: %s", exc)
        result = (False, "")
    _maint_cache["value"] = result
    _maint_cache["ts"] = now
    return result


async def _user_id_from_token(auth_header: str) -> int | None:
    """Extract user_id from Bearer token. Returns None on any error."""
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        payload = _jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub else None
    except (JWTError, ValueError, TypeError):
        return None


async def _is_admin_user(user_id: int) -> bool:
    """Check if user_id belongs to an admin."""
    try:
        rows = await execute_query(
            "SELECT is_admin FROM web_users WHERE id = ?", (user_id,)
        )
        if rows and rows[0].get("is_admin"):
            return True
        # First registered user is always admin
        first = await execute_query("SELECT id FROM web_users ORDER BY id ASC LIMIT 1")
        if first and first[0]["id"] == user_id:
            return True
    except Exception as exc:
        logger.warning("maintenance_middleware: admin check failed: %s", exc)
    return False


# Paths that are ALWAYS accessible (maintenance or not)
_MAINT_ALWAYS_ALLOW = {
    "/api/auth/login",
    "/api/auth/me",           # auth state must stay verifiable
    "/api/auth/refresh",      # token refresh must work
    "/api/status",
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}

@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    path = request.url.path

    # Admin routes are always accessible (admin panel must stay usable)
    if path.startswith("/api/admin") or path in _MAINT_ALWAYS_ALLOW:
        return await call_next(request)

    # OPTIONS (CORS preflight) must always pass
    if request.method == "OPTIONS":
        return await call_next(request)

    is_on, msg = await _get_maintenance_setting()
    if not is_on:
        return await call_next(request)

    # Maintenance is ON — check if the caller is an admin
    user_id = await _user_id_from_token(request.headers.get("Authorization", ""))
    if user_id and await _is_admin_user(user_id):
        return await call_next(request)

    # Block non-admin
    return JSONResponse(
        status_code=503,
        content={"detail": msg, "maintenance": True},
    )


# Include routers
app.include_router(auth.router,          prefix="/api/auth",           tags=["Authentication"])
app.include_router(market.router,        prefix="/api/market",         tags=["Market Data"])
app.include_router(wallet.router,        prefix="/api/wallet",         tags=["Wallet"])
app.include_router(analysis.router,      prefix="/api/analysis",       tags=["Analysis"])
app.include_router(users.router,         prefix="/api/users",          tags=["Users"])
app.include_router(favorites.router,     prefix="/api/favorites",      tags=["Favorites"])
app.include_router(ai_assistant.router,  prefix="/api/ai",             tags=["AI Assistant"])
app.include_router(admin.router,         prefix="/api/admin",          tags=["Admin"])
app.include_router(insights.router,      prefix="/api/admin/insights", tags=["Admin Insights"])
app.include_router(premium.router,       prefix="/api/premium",        tags=["Premium"])
app.include_router(community.router,     prefix="/api/community",      tags=["Community"])
app.include_router(tools.router,         prefix="/api/tools",          tags=["Trading Tools"])
app.include_router(portfolio.router,     prefix="/api/portfolio",      tags=["Real Portfolio"])


@app.get("/")
async def root():
    return {"message": "TDB Web API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/status")
async def site_status():
    """Public endpoint — returns maintenance status (used by frontend overlay)."""
    is_on, msg = await _get_maintenance_setting()
    return {"maintenance": is_on, "message": msg if is_on else None}
