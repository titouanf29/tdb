"""
Configuration globale du bot TDB
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ===== TELEGRAM =====
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")  # REQUIS - Obtenir via @BotFather
if not TELEGRAM_TOKEN:
    raise ValueError("TELEGRAM_TOKEN manquant! Ajoutez-le dans .env")

CHANNEL_ID = os.getenv("CHANNEL_ID", "")  # ID du channel pour les notifications (optionnel)

# ===== ADMINISTRATEURS =====
# RECOMMANDÉ: Définir ADMIN_IDS dans .env (format: "123456,789012")
# Fallback: liste ci-dessous utilisée si ADMIN_IDS non défini dans .env
_admin_ids_env = os.getenv("ADMIN_IDS", "")
if _admin_ids_env:
    ADMIN_IDS = [int(id.strip()) for id in _admin_ids_env.split(",") if id.strip()]
else:
    # Fallback - À MIGRER vers .env pour plus de sécurité
    ADMIN_IDS = [
        2064575502,  # Titouan
    ]

# ===== CANAL D'ACCUEIL (PUBLIC) =====
# Canal public où les nouveaux utilisateurs arrivent (read-only)
WELCOME_CHANNEL_ID = os.getenv("WELCOME_CHANNEL_ID", "")  # Ex: @TDBTradingChannel ou -1001234567890
# Groupe communautaire (optionnel, pour discussions)
COMMUNITY_GROUP_ID = os.getenv("COMMUNITY_GROUP_ID", "")

# ===== DISCORD =====
# Webhook principal (annonces marchés, ouverture/fermeture)
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
# Webhook opportunités (alertes trading, signaux, setups)
DISCORD_WEBHOOK_OPPORTUNITIES = os.getenv("DISCORD_WEBHOOK_OPPORTUNITIES", "")
# Webhook actualités (news, calendrier économique)
DISCORD_WEBHOOK_NEWS = os.getenv("DISCORD_WEBHOOK_NEWS", "")
# Webhook admin (logs, statistiques, erreurs - réservé aux admins)
DISCORD_WEBHOOK_ADMIN = os.getenv("DISCORD_WEBHOOK_ADMIN", "")

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
    "asia": {"name": "🌏 Actions Asie", "key": "ASIA"},
    "forex": {"name": "💱 Forex", "key": "FOREX"},
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
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")  # Groq pour l'assistant IA - obtenir sur console.groq.com

# ===== MARCHÉS DISPONIBLES =====
# NOTE: Les horaires sont en heure de Paris (CET/CEST)
MARKETS = {
    "EUROPE": {
        "name": "🇪🇺 EUROPE",
        "open_time": "09:00",
        "close_time": "17:30",
        "timezone": "Europe/Paris",
        "description": "Euronext Paris, Francfort, Londres",
        "closed_days": [5, 6],  # Samedi, Dimanche
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
        "open_time": "15:30",  # 09:30 NY = 15:30 Paris (hiver) / 14:30 (été US)
        "close_time": "22:00",  # 16:00 NY = 22:00 Paris (hiver) / 21:00 (été US)
        "timezone": "America/New_York",
        "description": "NYSE, NASDAQ",
        "closed_days": [5, 6],  # Samedi, Dimanche
        "paris_summer_offset": -1,  # -1h quand USA en heure d'été et pas Paris
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
        "open_time": "02:00",  # Tokyo 09:00 = 02:00 Paris (hiver) / 01:00 (été)
        "close_time": "09:00",  # Tokyo 15:00 = 09:00 Paris (hiver) / 08:00 (été)
        "timezone": "Asia/Tokyo",
        "description": "Tokyo, Hong Kong, Shanghai",
        "closed_days": [5, 6],  # Samedi, Dimanche
        "lunch_break": {"start": "04:30", "end": "05:30"},  # Pause déjeuner Tokyo
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
    "FOREX": {
        "name": "💱 FOREX",
        "open_time": "23:00",  # Ouvre dimanche 23:00
        "close_time": "22:00",  # Ferme vendredi 22:00
        "timezone": "Europe/Paris",
        "description": "Devises - 24h/24 lundi-vendredi",
        "always_open_weekdays": True,
        "open_day": 6,  # Dimanche soir
        "close_day": 4,  # Vendredi soir
        "closed_days": [5],  # Samedi fermé
        "assets": [
            # Majeurs
            "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X", "AUDUSD=X", "USDCAD=X", "NZDUSD=X",
            # Croix
            "EURGBP=X", "EURJPY=X", "GBPJPY=X", "EURCHF=X", "AUDJPY=X",
            # Exotiques
            "USDMXN=X", "USDZAR=X", "USDTRY=X", "USDSEK=X", "USDNOK=X"
        ]
    },
    "CRYPTO": {
        "name": "🪙 CRYPTO",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "description": "24h/24 - 7j/7",
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
        "open_time": "23:00",  # Ouvre dimanche 23:00
        "close_time": "22:00",  # Ferme vendredi 22:00
        "timezone": "Europe/Paris",
        "description": "CME - Quasi 24h lundi-vendredi",
        "always_open_weekdays": True,
        "open_day": 6,  # Dimanche
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
