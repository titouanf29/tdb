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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
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
