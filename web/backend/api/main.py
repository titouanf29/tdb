"""
TDB Web Backend - Main FastAPI Application
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env BEFORE importing routes (so they can read env vars)
env_path = Path(__file__).parent.parent.parent.parent / ".env"
load_dotenv(env_path)
# Also try local .env
load_dotenv()

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

from .database import init_db, init_web_tables
from .routes import auth, market, wallet, analysis, users, favorites, ai_assistant, admin, premium, community, tools, portfolio
from .routes import insights


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

# Global rate limiter (shared across all route limiters)
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

# CORS — explicit allowlist only, never wildcard "*"
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


# ── Maintenance mode middleware ────────────────────────────────────────────────
_MAINTENANCE_BYPASS = {
    "/api/auth/login",
    "/api/admin/check",
    "/api/admin/settings",
}

@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    path = request.url.path

    # Always allow admin, auth/login, and static paths
    bypass = (
        path.startswith("/api/admin")
        or path in _MAINTENANCE_BYPASS
        or path in ("/", "/health", "/docs", "/openapi.json", "/redoc")
    )
    if not bypass:
        try:
            from .database import execute_query as _eq
            rows = await _eq("SELECT value FROM admin_settings WHERE key = 'maintenance_mode'")
            if rows and rows[0]["value"] == "true":
                # Allow if user is admin (check Authorization header)
                auth_header = request.headers.get("Authorization", "")
                is_admin = False
                if auth_header.startswith("Bearer "):
                    token = auth_header[7:]
                    try:
                        from jose import jwt as _jwt
                        from .routes.auth import SECRET_KEY, ALGORITHM
                        payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                        user_id = int(payload.get("sub", 0))
                        admin_rows = await _eq(
                            "SELECT is_admin FROM web_users WHERE id = ?", (user_id,)
                        )
                        if admin_rows and admin_rows[0].get("is_admin"):
                            is_admin = True
                        # Also check first user
                        if not is_admin:
                            first = await _eq("SELECT id FROM web_users ORDER BY id ASC LIMIT 1")
                            if first and first[0]["id"] == user_id:
                                is_admin = True
                    except Exception:
                        pass
                if not is_admin:
                    msg_rows = await _eq(
                        "SELECT value FROM admin_settings WHERE key = 'maintenance_message'"
                    )
                    msg = (msg_rows[0]["value"] if msg_rows else None) or \
                          "Le site est en cours de maintenance. Revenez bientôt."
                    return JSONResponse(
                        status_code=503,
                        content={"detail": msg, "maintenance": True}
                    )
        except Exception:
            pass  # Don't block if DB read fails

    return await call_next(request)


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(insights.router, prefix="/api/admin/insights", tags=["Admin Insights"])
app.include_router(premium.router, prefix="/api/premium", tags=["Premium"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(tools.router, prefix="/api/tools", tags=["Trading Tools"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Real Portfolio"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TDB Web API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
