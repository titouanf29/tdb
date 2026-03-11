"""
TDB Web API - Backend FastAPI
Synchronisé avec le bot Telegram via la même base de données
"""
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path for shared modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from api.routes import auth, market, wallet, analysis, users, ai_assistant, favorites
from api.websocket import websocket_router
from api.database import init_web_tables


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
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
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
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    return {
        "name": "TDB Trading Bot API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
