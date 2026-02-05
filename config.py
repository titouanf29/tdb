"""
Configuration globale du bot TDB
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ===== TELEGRAM =====
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "8213431546:AAHnL4lswPUDYNubdcsLPvTwW0f1KYgjLgs")
CHANNEL_ID = os.getenv("CHANNEL_ID", "-1003160198658")  # ID du channel pour les notifications (optionnel)

# Administrateurs du bot (ajouter vos IDs Telegram ici)
ADMIN_IDS = [
    2064575502,  # Titouan
]

# ===== CANAL D'ACCUEIL (PUBLIC) =====
# Canal public où les nouveaux utilisateurs arrivent (read-only)
WELCOME_CHANNEL_ID = os.getenv("WELCOME_CHANNEL_ID", "")  # Ex: @TDBTradingChannel ou -1001234567890
# Groupe communautaire (optionnel, pour discussions)
COMMUNITY_GROUP_ID = os.getenv("COMMUNITY_GROUP_ID", "")

# ===== DISCORD =====
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

# ===== ONBOARDING =====
# Étapes de l'onboarding
ONBOARDING_STEPS = ["language", "profile", "markets", "tutorial"]

# Profils investisseurs disponibles
INVESTOR_PROFILES = {
    "conservative": {"name": "🐢 Conservateur", "risk_multiplier": 0.7, "min_score": 80},
    "moderate": {"name": "⚖️ Modéré", "risk_multiplier": 1.0, "min_score": 70},
    "aggressive": {"name": "🔥 Agressif", "risk_multiplier": 1.3, "min_score": 60},
    "very_aggressive": {"name": "⚡ Très Agressif", "risk_multiplier": 1.5, "min_score": 50}
}

# Marchés disponibles pour l'onboarding
AVAILABLE_MARKETS = {
    "usa": {"name": "🇺🇸 Actions US", "key": "USA"},
    "europe": {"name": "🇪🇺 Actions EU", "key": "EUROPE"},
    "crypto": {"name": "🪙 Crypto", "key": "CRYPTO"},
    "commodities": {"name": "🛢️ Matières 1ères", "key": "COMMODITIES"}
}

# ===== FREEMIUM =====
FREE_TIER = {
    "analyses_per_day": 3,
    "max_watchlist": 5,
    "max_alerts": 3,
    "features": ["basic_analysis", "simple_alerts", "daily_summary"]
}

PREMIUM_TIER = {
    "analyses_per_day": -1,  # Illimité
    "max_watchlist": -1,
    "max_alerts": -1,
    "features": ["advanced_analysis", "smart_alerts", "price_targets", "ichimoku", "smc", "priority_signals"]
}

# ===== BASE DE DONNÉES =====
DATABASE_PATH = "database/trading_bot.db"

# ===== API KEYS =====
# Pour récupérer les données de marché (gratuit)
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")  # Groq pour l'assistant IA (ultra-rapide, gratuit)

# ===== MARCHÉS DISPONIBLES =====
MARKETS = {
    "EUROPE": {
        "name": "🇪🇺 EUROPE",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Paris",
        "assets": [
            # Indices
            "^FCHI", "^GDAXI", "^STOXX50E", "^FTSE",
            # France
            "MC.PA", "OR.PA", "AIR.PA", "SAN.PA", "BNP.PA", "SU.PA", "TTE.PA", "EN.PA", "CA.PA", "SAF.PA",
            # Allemagne
            "VOW3.DE", "SIE.DE", "BAS.DE", "BAYN.DE", "ALV.DE", "MBG.DE",
            # UK
            "ULVR.L", "SHEL.L", "AZN.L", "HSBA.L", "BP.L", "GSK.L"
        ]
    },
    "USA": {
        "name": "🇺🇸 USA",
        "open_time": "09:30",
        "close_time": "16:00",
        "timezone": "America/New_York",
        "assets": [
            # Indices
            "^GSPC", "^DJI", "^IXIC",
            # ETFs
            "SPY", "QQQ", "DIA", "IWM",
            # Mega Caps Tech
            "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
            # Tech
            "AMD", "INTC", "NFLX", "CRM", "ORCL", "ADBE", "AVGO", "QCOM", "TXN", "CSCO",
            # Finance
            "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "V", "MA", "AXP",
            # Santé/Pharma
            "JNJ", "UNH", "PFE", "ABBV", "LLY", "MRK", "TMO", "ABT",
            # Consommation
            "KO", "PEP", "WMT", "HD", "MCD", "NKE", "SBUX", "DIS", "COST",
            # Énergie
            "XOM", "CVX", "COP", "SLB",
            # Autres
            "BA", "CAT", "GE", "MMM", "HON"
        ]
    },
    "ASIA": {
        "name": "🌏 ASIA",
        "open_time": "09:00",
        "close_time": "15:00",
        "timezone": "Asia/Tokyo",
        "assets": [
            # Indices
            "^N225", "^HSI", "000001.SS",
            # Japon
            "7203.T", "9984.T", "6758.T", "6861.T", "7974.T", "9433.T",
            # Hong Kong/Chine
            "9988.HK", "0700.HK", "0941.HK", "1299.HK", "0939.HK", "9618.HK",
            # Corée du Sud
            "005930.KS", "000660.KS", "035420.KS", "051910.KS",
            # Inde
            "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"
        ]
    },
    "CRYPTO": {
        "name": "🪙 CRYPTO",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "always_open": True,
        "assets": [
            # Top Caps
            "BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD", "ADA-USD",
            # Layer 1
            "AVAX-USD", "DOT-USD", "ATOM-USD", "NEAR-USD", "TRX-USD",
            # DeFi
            "LINK-USD", "AAVE-USD", "FIL-USD", "ARB-USD",
            # Autres
            "DOGE-USD", "SHIB-USD", "LTC-USD", "BCH-USD", "XLM-USD", "ALGO-USD"
        ]
    },
    "COMMODITIES": {
        "name": "🛢️ MATIÈRES PREMIÈRES",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "open_day": 6,  # Dimanche (0=Lundi, 6=Dimanche)
        "close_day": 4,  # Vendredi
        "closed_days": [5],  # Samedi fermé
        "assets": [
            # Énergies
            "CL=F", "NG=F", "BZ=F",
            # Métaux précieux
            "GC=F", "SI=F", "PL=F", "PA=F",
            # Métaux industriels
            "HG=F", "ALI=F",
            # Agriculture
            "ZC=F", "ZW=F", "ZS=F", "KC=F", "SB=F", "CT=F"
        ]
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
MAX_AI_MESSAGES_PER_DAY = 20  # Limite de messages IA par utilisateur par jour

# ===== MESSAGES =====
WELCOME_MESSAGE = """
🤖 Bienvenue sur TDB - Trading Bot Professionnel

Votre assistant IA de trading virtuel avancé.

Utilisez /menu pour accéder à toutes les fonctionnalités.
"""

# ===== LOGS =====
LOG_LEVEL = "INFO"
LOG_FILE = "tdb_bot.log"
