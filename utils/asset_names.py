"""
Noms complets des actifs pour un affichage propre
"""

# Mapping symbole -> nom complet
ASSET_NAMES = {
    # ===== USA - INDICES =====
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones Industrial",
    "^IXIC": "NASDAQ Composite",
    "SPY": "S&P 500 ETF",
    "QQQ": "Nasdaq-100 ETF",
    "DIA": "Dow Jones ETF",
    "IWM": "Russell 2000 ETF",

    # ===== USA - MEGA CAPS TECH =====
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet (Google)",
    "AMZN": "Amazon.com Inc.",
    "META": "Meta Platforms",
    "NVDA": "NVIDIA Corporation",
    "TSLA": "Tesla Inc.",

    # ===== USA - TECH =====
    "AMD": "Advanced Micro Devices",
    "INTC": "Intel Corporation",
    "NFLX": "Netflix Inc.",
    "CRM": "Salesforce Inc.",
    "ORCL": "Oracle Corporation",
    "ADBE": "Adobe Inc.",
    "AVGO": "Broadcom Inc.",
    "QCOM": "Qualcomm Inc.",
    "TXN": "Texas Instruments",
    "CSCO": "Cisco Systems",

    # ===== USA - FINANCE =====
    "JPM": "JPMorgan Chase",
    "BAC": "Bank of America",
    "WFC": "Wells Fargo",
    "GS": "Goldman Sachs",
    "MS": "Morgan Stanley",
    "C": "Citigroup Inc.",
    "BLK": "BlackRock Inc.",
    "V": "Visa Inc.",
    "MA": "Mastercard Inc.",
    "AXP": "American Express",

    # ===== USA - SANTÉ/PHARMA =====
    "JNJ": "Johnson & Johnson",
    "UNH": "UnitedHealth Group",
    "PFE": "Pfizer Inc.",
    "ABBV": "AbbVie Inc.",
    "LLY": "Eli Lilly",
    "MRK": "Merck & Co.",
    "TMO": "Thermo Fisher",
    "ABT": "Abbott Laboratories",

    # ===== USA - CONSOMMATION =====
    "KO": "Coca-Cola Company",
    "PEP": "PepsiCo Inc.",
    "WMT": "Walmart Inc.",
    "HD": "Home Depot",
    "MCD": "McDonald's Corp",
    "NKE": "Nike Inc.",
    "SBUX": "Starbucks Corp",
    "DIS": "Walt Disney",
    "COST": "Costco Wholesale",

    # ===== USA - ÉNERGIE =====
    "XOM": "Exxon Mobil",
    "CVX": "Chevron Corporation",
    "COP": "ConocoPhillips",
    "SLB": "Schlumberger",

    # ===== USA - AUTRES =====
    "BA": "Boeing Company",
    "CAT": "Caterpillar Inc.",
    "GE": "General Electric",
    "MMM": "3M Company",
    "HON": "Honeywell",

    # ===== EUROPE - INDICES =====
    "^FCHI": "CAC 40",
    "^GDAXI": "DAX",
    "^STOXX50E": "Euro Stoxx 50",
    "^FTSE": "FTSE 100",

    # ===== EUROPE - FRANCE =====
    "MC.PA": "LVMH Moët Hennessy",
    "OR.PA": "L'Oréal SA",
    "AIR.PA": "Airbus SE",
    "SAN.PA": "Sanofi SA",
    "BNP.PA": "BNP Paribas",
    "SU.PA": "Schneider Electric",
    "TTE.PA": "TotalEnergies",
    "EN.PA": "Bouygues SA",
    "CA.PA": "Carrefour SA",
    "SAF.PA": "Safran SA",

    # ===== EUROPE - ALLEMAGNE =====
    "VOW3.DE": "Volkswagen AG",
    "SIE.DE": "Siemens AG",
    "BAS.DE": "BASF SE",
    "BAYN.DE": "Bayer AG",
    "ALV.DE": "Allianz SE",
    "MBG.DE": "Mercedes-Benz",

    # ===== EUROPE - UK =====
    "ULVR.L": "Unilever PLC",
    "SHEL.L": "Shell PLC",
    "AZN.L": "AstraZeneca",
    "HSBA.L": "HSBC Holdings",
    "BP.L": "BP PLC",
    "GSK.L": "GSK PLC",

    # ===== ASIA - INDICES =====
    "^N225": "Nikkei 225",
    "^HSI": "Hang Seng",
    "000001.SS": "SSE Composite",

    # ===== ASIA - JAPON =====
    "7203.T": "Toyota Motor",
    "9984.T": "SoftBank Group",
    "6758.T": "Sony Corporation",
    "6861.T": "Keyence Corporation",
    "7974.T": "Nintendo Co.",
    "9433.T": "KDDI Corporation",

    # ===== ASIA - HONG KONG/CHINE =====
    "9988.HK": "Alibaba Group",
    "0700.HK": "Tencent Holdings",
    "0941.HK": "China Mobile",
    "1299.HK": "AIA Group",
    "0939.HK": "China Construction Bank",
    "9618.HK": "JD.com Inc.",

    # ===== ASIA - CORÉE DU SUD =====
    "005930.KS": "Samsung Electronics",
    "000660.KS": "SK Hynix",
    "035420.KS": "NAVER Corporation",
    "051910.KS": "LG Chem",

    # ===== ASIA - INDE =====
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "Tata Consultancy",
    "INFY.NS": "Infosys Ltd",
    "HDFCBANK.NS": "HDFC Bank",

    # ===== CRYPTO - TOP CAPS =====
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "BNB-USD": "Binance Coin",
    "XRP-USD": "Ripple",
    "SOL-USD": "Solana",
    "ADA-USD": "Cardano",

    # ===== CRYPTO - LAYER 1 =====
    "AVAX-USD": "Avalanche",
    "DOT-USD": "Polkadot",
    "MATIC-USD": "Polygon",
    "ATOM-USD": "Cosmos",
    "NEAR-USD": "NEAR Protocol",
    "APT-USD": "Aptos",

    # ===== CRYPTO - DEFI =====
    "UNI-USD": "Uniswap",
    "LINK-USD": "Chainlink",
    "AAVE-USD": "Aave",
    "MKR-USD": "Maker",

    # ===== CRYPTO - AUTRES =====
    "DOGE-USD": "Dogecoin",
    "SHIB-USD": "Shiba Inu",
    "LTC-USD": "Litecoin",
    "BCH-USD": "Bitcoin Cash",
    "XLM-USD": "Stellar",
    "ALGO-USD": "Algorand",

    # ===== FOREX - PAIRES MAJEURES =====
    "EURUSD=X": "EUR/USD",
    "GBPUSD=X": "GBP/USD",
    "USDJPY=X": "USD/JPY",
    "USDCHF=X": "USD/CHF",
    "AUDUSD=X": "AUD/USD",
    "USDCAD=X": "USD/CAD",
    "NZDUSD=X": "NZD/USD",

    # ===== FOREX - PAIRES CROISÉES =====
    "EURGBP=X": "EUR/GBP",
    "EURJPY=X": "EUR/JPY",
    "GBPJPY=X": "GBP/JPY",
    "EURCHF=X": "EUR/CHF",
    "AUDJPY=X": "AUD/JPY",
    "EURSEK=X": "EUR/SEK",
    "EURNOK=X": "EUR/NOK",

    # ===== FOREX - PAIRES EXOTIQUES =====
    "USDMXN=X": "USD/MXN",
    "USDZAR=X": "USD/ZAR",
    "USDTRY=X": "USD/TRY",
    "USDSEK=X": "USD/SEK",
    "USDNOK=X": "USD/NOK",
    "USDPLN=X": "USD/PLN",

    # ===== COMMODITIES - ÉNERGIES =====
    "CL=F": "Crude Oil WTI",
    "NG=F": "Natural Gas",
    "BZ=F": "Brent Crude Oil",

    # ===== COMMODITIES - MÉTAUX PRÉCIEUX =====
    "GC=F": "Gold Futures",
    "SI=F": "Silver Futures",
    "PL=F": "Platinum Futures",
    "PA=F": "Palladium Futures",

    # ===== COMMODITIES - MÉTAUX INDUSTRIELS =====
    "HG=F": "Copper Futures",
    "ALI=F": "Aluminum Futures",

    # ===== COMMODITIES - AGRICULTURE =====
    "ZC=F": "Corn Futures",
    "ZW=F": "Wheat Futures",
    "ZS=F": "Soybean Futures",
    "KC=F": "Coffee Futures",
    "SB=F": "Sugar Futures",
    "CT=F": "Cotton Futures",
}

# Emojis par catégorie d'actif
ASSET_EMOJIS = {
    # ===== INDICES USA =====
    "^GSPC": "📊",
    "^DJI": "📈",
    "^IXIC": "💹",
    "SPY": "🔵",
    "QQQ": "🟢",
    "DIA": "🔷",
    "IWM": "🟣",

    # ===== TECH MEGA CAPS =====
    "AAPL": "🍎",
    "MSFT": "💻",
    "GOOGL": "🔍",
    "AMZN": "📦",
    "META": "📘",
    "NVDA": "🎮",
    "TSLA": "⚡",

    # ===== TECH =====
    "AMD": "🔧",
    "INTC": "🖥️",
    "NFLX": "🎬",
    "CRM": "☁️",
    "ORCL": "🗄️",
    "ADBE": "🎨",
    "AVGO": "📡",
    "QCOM": "📱",
    "TXN": "⚙️",
    "CSCO": "🌐",

    # ===== FINANCE =====
    "JPM": "🏦",
    "BAC": "🏛️",
    "WFC": "💰",
    "GS": "💵",
    "MS": "💳",
    "C": "🏢",
    "BLK": "📊",
    "V": "💳",
    "MA": "💳",
    "AXP": "💎",

    # ===== SANTÉ/PHARMA =====
    "JNJ": "💊",
    "UNH": "🏥",
    "PFE": "💉",
    "ABBV": "🧬",
    "LLY": "💊",
    "MRK": "🔬",
    "TMO": "🧪",
    "ABT": "🩺",

    # ===== CONSOMMATION =====
    "KO": "🥤",
    "PEP": "🥤",
    "WMT": "🛒",
    "HD": "🏗️",
    "MCD": "🍔",
    "NKE": "👟",
    "SBUX": "☕",
    "DIS": "🎡",
    "COST": "🏪",

    # ===== ÉNERGIE =====
    "XOM": "⛽",
    "CVX": "🛢️",
    "COP": "🛢️",
    "SLB": "⛏️",

    # ===== AUTRES USA =====
    "BA": "✈️",
    "CAT": "🚜",
    "GE": "⚡",
    "MMM": "📎",
    "HON": "🏭",

    # ===== INDICES EUROPE =====
    "^FCHI": "🇫🇷",
    "^GDAXI": "🇩🇪",
    "^STOXX50E": "🇪🇺",
    "^FTSE": "🇬🇧",

    # ===== FRANCE =====
    "MC.PA": "👜",
    "OR.PA": "💄",
    "AIR.PA": "✈️",
    "SAN.PA": "💊",
    "BNP.PA": "🏦",
    "SU.PA": "⚡",
    "TTE.PA": "⛽",
    "EN.PA": "🏗️",
    "CA.PA": "🛒",
    "SAF.PA": "🛫",

    # ===== ALLEMAGNE =====
    "VOW3.DE": "🚗",
    "SIE.DE": "⚙️",
    "BAS.DE": "🧪",
    "BAYN.DE": "💊",
    "ALV.DE": "🛡️",
    "MBG.DE": "🚗",

    # ===== UK =====
    "ULVR.L": "🧴",
    "SHEL.L": "🛢️",
    "AZN.L": "💊",
    "HSBA.L": "🏦",
    "BP.L": "⛽",
    "GSK.L": "💉",

    # ===== INDICES ASIA =====
    "^N225": "🇯🇵",
    "^HSI": "🇭🇰",
    "000001.SS": "🇨🇳",

    # ===== JAPON =====
    "7203.T": "🚗",
    "9984.T": "📱",
    "6758.T": "🎮",
    "6861.T": "🔬",
    "7974.T": "🎮",
    "9433.T": "📡",

    # ===== HONG KONG/CHINE =====
    "9988.HK": "🏢",
    "0700.HK": "💬",
    "0941.HK": "📱",
    "1299.HK": "🏥",
    "0939.HK": "🏦",
    "9618.HK": "📦",

    # ===== CORÉE DU SUD =====
    "005930.KS": "📱",
    "000660.KS": "💾",
    "035420.KS": "🌐",
    "051910.KS": "🔋",

    # ===== INDE =====
    "RELIANCE.NS": "⛽",
    "TCS.NS": "💻",
    "INFY.NS": "💼",
    "HDFCBANK.NS": "🏦",

    # ===== CRYPTO - TOP CAPS =====
    "BTC-USD": "₿",
    "ETH-USD": "⟠",
    "BNB-USD": "🔶",
    "XRP-USD": "✕",
    "SOL-USD": "◎",
    "ADA-USD": "◈",

    # ===== CRYPTO - LAYER 1 =====
    "AVAX-USD": "🔺",
    "DOT-USD": "●",
    "MATIC-USD": "🟣",
    "ATOM-USD": "⚛️",
    "NEAR-USD": "🔷",
    "APT-USD": "🅰️",

    # ===== CRYPTO - DEFI =====
    "UNI-USD": "🦄",
    "LINK-USD": "🔗",
    "AAVE-USD": "👻",
    "MKR-USD": "Ⓜ️",

    # ===== CRYPTO - AUTRES =====
    "DOGE-USD": "🐶",
    "SHIB-USD": "🐕",
    "LTC-USD": "Ł",
    "BCH-USD": "💵",
    "XLM-USD": "⭐",
    "ALGO-USD": "△",

    # ===== COMMODITIES - ÉNERGIES =====
    "CL=F": "🛢️",
    "NG=F": "🔥",
    "BZ=F": "⛽",

    # ===== COMMODITIES - MÉTAUX PRÉCIEUX =====
    "GC=F": "🥇",
    "SI=F": "⚪",
    "PL=F": "⚫",
    "PA=F": "🔘",

    # ===== COMMODITIES - MÉTAUX INDUSTRIELS =====
    "HG=F": "🔩",
    "ALI=F": "🪙",

    # ===== COMMODITIES - AGRICULTURE =====
    "ZC=F": "🌽",
    "ZW=F": "🌾",
    "ZS=F": "🫘",
    "KC=F": "☕",
    "SB=F": "🍬",
    "CT=F": "🧵",

    # ===== FOREX =====
    "EURUSD=X": "💱", "GBPUSD=X": "💱", "USDJPY=X": "💱",
    "USDCHF=X": "💱", "AUDUSD=X": "💱", "USDCAD=X": "💱",
    "NZDUSD=X": "💱", "EURGBP=X": "💱", "EURJPY=X": "💱",
    "GBPJPY=X": "💱", "EURCHF=X": "💱", "AUDJPY=X": "💱",
    "USDMXN=X": "💱", "USDZAR=X": "💱", "USDTRY=X": "💱",
    "USDSEK=X": "💱", "USDNOK=X": "💱",
}

# Dict des actifs ajoutés dynamiquement par les admins (chargé depuis la DB au démarrage)
CUSTOM_ASSETS: dict = {}


async def load_custom_assets() -> None:
    """Charge les actifs personnalisés depuis la DB dans CUSTOM_ASSETS"""
    global CUSTOM_ASSETS
    try:
        from database.manager import db_manager
        CUSTOM_ASSETS = await db_manager.get_custom_assets()
    except Exception:
        CUSTOM_ASSETS = {}


def get_all_assets() -> dict:
    """Retourne la fusion ASSET_NAMES + CUSTOM_ASSETS (custom prioritaire)"""
    return {**ASSET_NAMES, **CUSTOM_ASSETS}


def get_asset_display_name(symbol: str) -> str:
    """Retourne le nom complet d'un actif ou le symbole si non trouvé"""
    return CUSTOM_ASSETS.get(symbol) or ASSET_NAMES.get(symbol, symbol)

def get_asset_emoji(symbol: str) -> str:
    """Retourne l'emoji d'un actif ou une puce par défaut"""
    return ASSET_EMOJIS.get(symbol, "•")

def format_asset_name(symbol: str, include_emoji: bool = True) -> str:
    """Formate un nom d'actif de manière propre"""
    emoji = get_asset_emoji(symbol) if include_emoji else ""
    name = get_asset_display_name(symbol)

    if include_emoji and emoji != "•":
        return f"{emoji} {name}"
    elif name != symbol:
        return f"{name} ({symbol})"
    else:
        return symbol
