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
    # Ajoutez votre ID Telegram ici
    # Exemple: 123456789
]

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
            # France large caps
            "MC.PA", "OR.PA", "AIR.PA", "SAN.PA", "BNP.PA", "SU.PA", "TTE.PA", "EN.PA",
            "CA.PA", "SAF.PA", "RMS.PA", "CS.PA", "DSY.PA", "EL.PA", "SGO.PA",
            "STM.PA", "VIE.PA", "RI.PA", "ACA.PA", "GLE.PA",
            # France mid caps
            "HO.PA", "ERF.PA", "ALO.PA", "TCH.PA", "EDEN.PA", "CRBP2.PA",
            # Allemagne
            "VOW3.DE", "SIE.DE", "BAS.DE", "BAYN.DE", "ALV.DE", "MBG.DE",
            "SAP.DE", "ADS.DE", "IFX.DE", "DHER.DE", "DBK.DE", "ENR.DE", "RWE.DE",
            # UK
            "ULVR.L", "SHEL.L", "AZN.L", "HSBA.L", "BP.L", "GSK.L",
            "LSEG.L", "RIO.L", "GLEN.L", "DGE.L", "BA.L", "TSCO.L",
            # Pays-Bas / Belgique
            "ASML.AS", "INGA.AS", "PHIA.AS", "AD.AS", "UMI.BR", "ABI.BR",
            # Suisse
            "NESN.SW", "ROG.SW", "NOVN.SW", "UHR.SW",
            # Espagne / Italie
            "SAN.MC", "IBE.MC", "TEF.MC", "ISP.MI", "ENI.MI", "ENEL.MI"
        ]
    },
    "USA": {
        "name": "🇺🇸 USA",
        "open_time": "09:30",
        "close_time": "16:00",
        "timezone": "America/New_York",
        "assets": [
            # Indices & ETFs
            "^GSPC", "^DJI", "^IXIC", "^RUT",
            "SPY", "QQQ", "DIA", "IWM", "XLK", "XLF", "XLE",
            # Mega Caps Tech
            "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
            # Tech établi
            "AMD", "INTC", "NFLX", "CRM", "ORCL", "ADBE", "AVGO", "QCOM", "TXN", "CSCO",
            "MU", "AMAT", "LRCX", "KLAC", "SNPS", "CDNS", "FTNT", "PANW", "ZS",
            # IA & Cloud émergent
            "PLTR", "SNOW", "DDOG", "NET", "CRWD", "S", "GTLB", "PATH", "AI",
            "SOUN", "BBAI", "IONQ", "RGTI", "QUBT", "QBTS", "ARQQ",
            # Fintech & Finance
            "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "V", "MA", "AXP",
            "PYPL", "SQ", "SOFI", "HOOD", "AFRM", "UPST", "LC", "MSTR", "COIN",
            "NU", "SMAR", "FIS", "FISV", "GPN",
            # Santé & Biotech
            "JNJ", "UNH", "PFE", "ABBV", "LLY", "MRK", "TMO", "ABT",
            "MRNA", "BNTX", "VRTX", "REGN", "GILD", "ILMN", "BIIB", "BMRN",
            "EXAS", "PACB", "BEAM", "NTLA", "EDIT", "CRSP",
            # Consommation
            "KO", "PEP", "WMT", "HD", "MCD", "NKE", "SBUX", "DIS", "COST",
            "SHOP", "ETSY", "W", "CHWY", "ABNB", "BKNG", "UBER", "LYFT",
            # Énergie & Transition
            "XOM", "CVX", "COP", "SLB",
            "ENPH", "FSLR", "SEDG", "BE", "PLUG", "BLNK", "CHPT", "EVGO",
            "RUN", "ARRY", "STEM",
            # Défense & Industrie
            "BA", "CAT", "GE", "MMM", "HON", "LMT", "RTX", "NOC", "GD", "AXON",
            # Immobilier & REIT
            "AMT", "PLD", "EQIX", "SPG", "O", "VICI",
            # Télécoms & Média
            "T", "VZ", "TMUS", "CMCSA", "NFLX", "PARA", "WBD",
            # Petites/moyennes caps momentum
            "SMCI", "ONTO", "CLOV", "OPEN", "JOBY", "LILM", "ACHR",
            "RKLB", "ASTS", "LUNR", "RDW", "MNTS",
        ]
    },
    "ASIA": {
        "name": "🌏 ASIA",
        "open_time": "09:00",
        "close_time": "15:00",
        "timezone": "Asia/Tokyo",
        "assets": [
            # Indices
            "^N225", "^HSI", "000001.SS", "^KS11", "^BSESN",
            # Japon
            "7203.T", "9984.T", "6758.T", "6861.T", "7974.T", "9433.T",
            "6501.T", "6702.T", "6752.T", "4063.T", "8306.T", "9432.T",
            "7267.T", "2914.T", "6594.T", "6367.T",
            # Hong Kong / Chine
            "9988.HK", "0700.HK", "0941.HK", "1299.HK", "0939.HK", "9618.HK",
            "3690.HK", "9999.HK", "6690.HK", "1810.HK", "9888.HK",
            # Corée du Sud
            "005930.KS", "000660.KS", "035420.KS", "051910.KS",
            "035720.KS", "068270.KS", "207940.KS", "003670.KS",
            # Inde
            "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS",
            "WIPRO.NS", "ICICIBANK.NS", "BHARTIARTL.NS", "ADANIENT.NS",
            "TATAMOTORS.NS", "BAJFINANCE.NS", "SUNPHARMA.NS", "LTIM.NS",
            # Singapour / Taïwan / Australie
            "D05.SI", "O39.SI", "U11.SI",
            "2330.TW", "2317.TW", "2308.TW",
            "CBA.AX", "BHP.AX", "CSL.AX", "WES.AX", "ANZ.AX"
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
            # Layer 1 / Layer 2
            "AVAX-USD", "DOT-USD", "MATIC-USD", "ATOM-USD", "NEAR-USD", "APT-USD",
            "SUI-USD", "SEI-USD", "TIA-USD", "INJ-USD", "MINA-USD", "EGLD-USD",
            "FTM-USD", "HBAR-USD", "ALGO-USD", "ICP-USD", "ARB-USD", "OP-USD",
            # DeFi
            "UNI-USD", "LINK-USD", "AAVE-USD", "MKR-USD", "CRV-USD", "LDO-USD",
            "GMX-USD", "DYDX-USD", "PENDLE-USD", "JUP-USD", "ORCA-USD",
            # RWA & Infra
            "GRT-USD", "FIL-USD", "RNDR-USD", "OCEAN-USD", "ROSE-USD",
            "ANKR-USD", "ENS-USD", "SNX-USD",
            # Gaming & NFT
            "IMX-USD", "SAND-USD", "MANA-USD", "AXS-USD", "GALA-USD",
            "BEAM-USD", "MAGIC-USD", "PRIME-USD",
            # Meme & Speculatif
            "DOGE-USD", "SHIB-USD", "PEPE-USD", "FLOKI-USD", "BONK-USD", "WIF-USD",
            # Autres établis
            "LTC-USD", "BCH-USD", "XLM-USD", "ETC-USD", "XMR-USD", "ZEC-USD",
            "BAT-USD", "ZIL-USD", "IOTA-USD", "VET-USD", "HOT-USD"
        ]
    },
    "COMMODITIES": {
        "name": "🛢️ MATIÈRES PREMIÈRES",
        "open_time": "00:00",
        "close_time": "23:59",
        "timezone": "UTC",
        "assets": [
            # Énergies
            "CL=F", "NG=F", "BZ=F", "HO=F", "RB=F",
            # Métaux précieux
            "GC=F", "SI=F", "PL=F", "PA=F",
            # Métaux industriels
            "HG=F", "ALI=F",
            # Agriculture
            "ZC=F", "ZW=F", "ZS=F", "KC=F", "SB=F", "CT=F",
            "OJ=F", "CC=F", "LBS=F",
            # Bétail
            "LE=F", "GF=F", "HE=F"
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
