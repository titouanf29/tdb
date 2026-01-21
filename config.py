"""
Configuration globale du bot TDB
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ===== TELEGRAM =====
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "YOUR_TOKEN_HERE")

# ===== BASE DE DONNÉES =====
DATABASE_PATH = "tdb_bot.db"

# ===== API KEYS =====
# Pour récupérer les données de marché (gratuit)
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")

# ===== MARCHÉS DISPONIBLES =====
MARKETS = {
    "EUROPE": {
        "name": "🇪🇺 EUROPE",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Paris",
        "assets": ["^FCHI", "^GDAXI", "^STOXX50E", "AIR.PA", "MC.PA", "SAN.PA"]
    },
    "USA": {
        "name": "🇺🇸 USA",
        "open_time": "09:30",
        "close_time": "16:00",
        "timezone": "America/New_York",
        "assets": ["AAPL", "TSLA", "NVDA", "META", "GOOGL", "MSFT", "AMZN", "AMD", "SPY", "QQQ"]
    },
    "ASIA": {
        "name": "🌏 ASIA",
        "open_time": "09:00",
        "close_time": "15:00",
        "timezone": "Asia/Tokyo",
        "assets": ["^N225", "^HSI", "9988.HK", "7203.T", "005930.KS"]
    },
    "CRYPTO": {
        "name": "🪙 CRYPTO",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "always_open": True,
        "assets": ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD", "AVAX-USD", "DOT-USD"]
    },
    "COMMODITIES": {
        "name": "🛢️ MATIÈRES PREMIÈRES",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "assets": ["CL=F", "NG=F", "GC=F", "SI=F", "HG=F"]
    },
    "GOLD": {
        "name": "🥇 GOLD",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "assets": ["GC=F", "SI=F"]
    }
}

# ===== INDICATEURS TECHNIQUES =====
TECHNICAL_INDICATORS = {
    "rsi_period": 14,
    "rsi_oversold": 30,
    "rsi_overbought": 70,
    "macd_fast": 12,
    "macd_slow": 26,
    "macd_signal": 9,
    "ema_short": 20,
    "ema_medium": 50,
    "ema_long": 200,
    "bb_period": 20,
    "bb_std": 2,
    "atr_period": 14
}

# ===== TIMEFRAMES =====
TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"]

# ===== SCORING IA =====
SCORING_WEIGHTS = {
    "technical": 0.30,
    "volume": 0.20,
    "momentum": 0.15,
    "volatility": 0.10,
    "market_context": 0.15,
    "news": 0.10
}

# Seuils de score
SCORE_THRESHOLDS = {
    "ignore": 40,
    "watch": 60,
    "opportunity": 75,
    "strong": 85
}

# ===== WALLET PAR DÉFAUT =====
DEFAULT_WALLET_BALANCE = 10000.0
DEFAULT_CURRENCY = "USD"

# ===== SCAN AUTO =====
SCAN_FREQUENCIES = {
    "1min": 60,
    "5min": 300,
    "15min": 900,
    "1hour": 3600
}

# ===== LIMITES =====
MAX_POSITIONS = 10
MAX_ALERTS_PER_DAY = 50
MAX_FAVORITES = 20

# ===== MESSAGES =====
WELCOME_MESSAGE = """
🤖 Bienvenue sur TDB - Trading Bot Professionnel

Votre assistant IA de trading virtuel avancé.

Utilisez /menu pour accéder à toutes les fonctionnalités.
"""

# ===== LOGS =====
LOG_LEVEL = "INFO"
LOG_FILE = "tdb_bot.log"
