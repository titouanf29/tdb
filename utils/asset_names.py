"""
Noms complets des actifs pour un affichage propre
"""

# Mapping symbole -> nom complet
ASSET_NAMES = {
    # USA - Actions
    "AAPL": "Apple Inc.",
    "TSLA": "Tesla Inc.",
    "NVDA": "NVIDIA Corporation",
    "META": "Meta Platforms",
    "GOOGL": "Alphabet (Google)",
    "MSFT": "Microsoft Corporation",
    "AMZN": "Amazon.com Inc.",
    "AMD": "Advanced Micro Devices",
    "SPY": "S&P 500 ETF",
    "QQQ": "Nasdaq-100 ETF",

    # EUROPE - Actions
    "AIR.PA": "Airbus SE",
    "MC.PA": "LVMH Moët Hennessy",
    "SAN.PA": "Sanofi SA",
    "^FCHI": "CAC 40",
    "^GDAXI": "DAX",
    "^STOXX50E": "Euro Stoxx 50",

    # ASIA - Actions
    "^N225": "Nikkei 225",
    "^HSI": "Hang Seng",
    "9988.HK": "Alibaba Group",
    "7203.T": "Toyota Motor",
    "005930.KS": "Samsung Electronics",

    # CRYPTO
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "SOL-USD": "Solana",
    "BNB-USD": "Binance Coin",
    "XRP-USD": "Ripple",
    "ADA-USD": "Cardano",
    "AVAX-USD": "Avalanche",
    "DOT-USD": "Polkadot",

    # COMMODITIES
    "CL=F": "Crude Oil",
    "NG=F": "Natural Gas",
    "GC=F": "Gold Futures",
    "SI=F": "Silver Futures",
    "HG=F": "Copper Futures",
}

# Emojis par catégorie d'actif
ASSET_EMOJIS = {
    # Actions tech
    "AAPL": "🍎",
    "TSLA": "⚡",
    "NVDA": "🎮",
    "META": "📘",
    "GOOGL": "🔍",
    "MSFT": "💻",
    "AMZN": "📦",
    "AMD": "🔧",

    # Indices
    "SPY": "📊",
    "QQQ": "📈",
    "^FCHI": "🇫🇷",
    "^GDAXI": "🇩🇪",
    "^STOXX50E": "🇪🇺",
    "^N225": "🇯🇵",
    "^HSI": "🇭🇰",

    # Crypto
    "BTC-USD": "₿",
    "ETH-USD": "⟠",
    "SOL-USD": "◎",
    "BNB-USD": "🔶",
    "XRP-USD": "✕",
    "ADA-USD": "◈",
    "AVAX-USD": "🔺",
    "DOT-USD": "●",

    # Commodities
    "CL=F": "🛢️",
    "NG=F": "🔥",
    "GC=F": "🥇",
    "SI=F": "⚪",
    "HG=F": "🔩",
}

def get_asset_display_name(symbol: str) -> str:
    """Retourne le nom complet d'un actif ou le symbole si non trouvé"""
    return ASSET_NAMES.get(symbol, symbol)

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
