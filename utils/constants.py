"""
Constantes globales du bot TDB
"""

# ===== EMOJIS =====
EMOJI_MARKET = {
    "EUROPE": "🇪🇺",
    "USA": "🇺🇸",
    "ASIA": "🌏",
    "CRYPTO": "🪙",
    "COMMODITIES": "🛢️",
    "GOLD": "🥇"
}

EMOJI_DIRECTION = {
    "LONG": "📈",
    "SHORT": "📉",
    "NEUTRAL": "➡️"
}

EMOJI_TREND = {
    "bullish": "🟢",
    "bearish": "🔴",
    "neutral": "🟡",
    "sideways": "↔️"
}

EMOJI_RISK = {
    "low": "🟢",
    "medium": "🟡",
    "high": "🔴",
    "extreme": "⚠️"
}

# ===== MESSAGES =====
MSG_MARKET_CLOSED = """
🔒 Marché actuellement fermé

Ce marché n'est pas ouvert pour le moment.

Souhaitez-vous voir un résumé de la séance précédente ?
"""

MSG_MARKET_ANALYSIS_START = """
🔍 Analyse en cours...

Scan de tous les actifs du marché {market}.
Cela peut prendre quelques secondes...
"""

MSG_NO_OPPORTUNITIES = """
📊 Aucune opportunité forte détectée

Le marché ne présente pas d'opportunité à fort potentiel pour le moment.

Score minimum requis : {min_score}/100
"""

MSG_POSITION_OPENED = """
✅ Position ouverte !

Votre position a été enregistrée avec succès.
Code : {code}

Utilisez ce code pour afficher votre position à tout moment.
"""

MSG_WALLET_INSUFFICIENT = """
❌ Solde insuffisant

Votre wallet ne contient pas assez de fonds pour cette opération.

Solde disponible : {available}
Montant requis : {required}
"""

# ===== BOUTONS =====
BTN_BACK_MENU = "⬅️ Retour menu"
BTN_BACK = "⬅️ Retour"
BTN_REFRESH = "🔄 Actualiser"
BTN_CLOSE = "❌ Fermer"

# ===== TIMEFRAMES =====
TIMEFRAME_NAMES = {
    "5m": "5 minutes",
    "15m": "15 minutes",
    "1h": "1 heure",
    "4h": "4 heures",
    "1d": "1 jour"
}

# ===== TYPES D'OPPORTUNITÉS =====
OPPORTUNITY_TYPES = {
    "breakout": "Cassure",
    "reversal": "Retournement",
    "continuation": "Continuation",
    "retest": "Retest",
    "bounce": "Rebond",
    "squeeze": "Compression"
}
