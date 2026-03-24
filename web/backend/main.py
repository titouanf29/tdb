"""
TDB Web API - Backend FastAPI
Synchronisé avec le bot Telegram via la même base de données
"""
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Add parent directory to path for shared modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from api.routes import auth, market, wallet, analysis, users, ai_assistant, favorites, admin, tools, premium, community, portfolio
from api.websocket import websocket_router
from api.database import init_web_tables

# Global rate limiter (IP-based)
limiter = Limiter(key_func=get_remote_address)

IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 TDB Web API starting...")
    await init_web_tables()
    print("✅ Database tables initialized")
    yield
    print("👋 TDB Web API shutting down...")


app = FastAPI(
    title="TDB Trading Bot API",
    description="API pour le site web TDB - synchronisé avec le bot Telegram",
    version="1.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Attach rate limiter to app
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Trop de requêtes. Veuillez patienter avant de réessayer."}
    )

# CORS for frontend
# FRONTEND_URL must be set explicitly (comma-separated list of allowed origins).
# In development, localhost is always allowed. Wildcard "*" is never used.
_frontend_env = os.getenv("FRONTEND_URL", "")
_cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
if _frontend_env:
    _cors_origins += [u.strip() for u in _frontend_env.split(",") if u.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return a generic error (never expose internals)."""
    print(f"[ERROR] Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}: {exc}", flush=True)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur interne est survenue. Veuillez réessayer."}
    )


# Make limiter available to routers via app state
# Export it so routes can import it
auth.limiter = limiter

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(tools.router, prefix="/api/tools", tags=["Trading Tools"])
app.include_router(premium.router, prefix="/api/premium", tags=["Premium"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Real Portfolio"])
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    return {
        "name": "TDB Trading Bot API",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    # Use app object directly to avoid path conflicts with root main.py
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
