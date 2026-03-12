"""
TDB Web Backend - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from .database import init_db, init_web_tables
from .routes import auth, market, wallet, analysis, users, favorites, ai_assistant, admin

load_dotenv()

app = FastAPI(
    title="TDB Web API",
    description="Trading Dashboard Bot - Web API",
    version="1.0.0"
)

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.on_event("startup")
async def startup():
    """Initialize database on startup."""
    await init_db()
    await init_web_tables()


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
