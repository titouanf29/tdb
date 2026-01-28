"""
Fonctions utilitaires pour TDB Bot
"""
import random
import string
from datetime import datetime, time
import pytz
import config

def generate_position_code(length=8):
    """Génère un code unique pour une position"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

def format_price(price, decimals=2):
    """Formate un prix avec le bon nombre de decimales"""
    if price is None:
        return "N/A"
    # Arrondir d'abord pour eviter les .00000001
    price = round(price, 8)
    if abs(price) >= 1000:
        # Grands nombres: 2 decimales max, separateur milliers
        return f"{price:,.{decimals}f}"
    elif abs(price) >= 1:
        # Nombres normaux: 2 decimales
        return f"{price:.{decimals}f}"
    elif abs(price) >= 0.01:
        # Petits nombres: 4 decimales
        return f"{price:.4f}"
    elif abs(price) >= 0.0001:
        # Tres petits: 6 decimales
        return f"{price:.6f}"
    else:
        # Crypto tres petite valeur: 8 decimales
        return f"{price:.8f}"

def format_percent(value):
    """Formate un pourcentage"""
    if value is None:
        return "N/A"
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f}%"


def format_money(amount, currency="USD"):
    """Formate un montant monetaire (toujours 2 decimales max)"""
    if amount is None:
        return "N/A"
    amount = round(amount, 2)
    if abs(amount) >= 1000:
        return f"{amount:,.2f} {currency}"
    else:
        return f"{amount:.2f} {currency}"

def format_pnl(pnl, currency="USD"):
    """Formate un PnL avec couleur emoji"""
    if pnl is None:
        return "N/A"
    pnl = round(pnl, 2)
    sign = "+" if pnl >= 0 else ""
    emoji = "🟢" if pnl >= 0 else "🔴"
    # Utiliser format_money pour les PnL (toujours 2 decimales)
    if abs(pnl) >= 1000:
        formatted = f"{pnl:,.2f}"
    else:
        formatted = f"{pnl:.2f}"
    return f"{emoji} {sign}{formatted} {currency}"

def is_market_open(market_code):
    """Vérifie si un marché est ouvert"""
    market = config.MARKETS.get(market_code)
    if not market:
        return False

    # Marchés toujours ouverts (crypto, commodities)
    if market.get('always_open'):
        return True

    # Vérifier les horaires
    try:
        tz = pytz.timezone(market['timezone'])
        now = datetime.now(tz)
        current_time = now.time()

        open_time = time.fromisoformat(market['open_time'])
        close_time = time.fromisoformat(market['close_time'])

        # Vérifier si c'est un weekend
        if now.weekday() >= 5:  # Samedi ou Dimanche
            return False

        return open_time <= current_time <= close_time
    except:
        return False

def get_market_status_message(market_code):
    """Retourne un message de statut du marché"""
    market = config.MARKETS.get(market_code)
    if not market:
        return "Marché inconnu"

    if is_market_open(market_code):
        return f"🟢 Marché ouvert"
    else:
        return f"🔴 Marché fermé"

def calculate_position_size(wallet_balance, risk_percent, stop_loss_percent):
    """Calcule la taille de position basée sur le risque"""
    if stop_loss_percent == 0:
        return 0

    risk_amount = wallet_balance * (risk_percent / 100)
    position_size = risk_amount / (stop_loss_percent / 100)
    return position_size

def calculate_stop_loss(entry_price, direction, atr, multiplier=2):
    """Calcule un stop loss basé sur l'ATR"""
    if direction == "LONG":
        return entry_price - (atr * multiplier)
    else:  # SHORT
        return entry_price + (atr * multiplier)

def calculate_take_profit(entry_price, stop_loss, direction, ratio=2):
    """Calcule un take profit basé sur le ratio R/R"""
    risk = abs(entry_price - stop_loss)
    reward = risk * ratio

    if direction == "LONG":
        return entry_price + reward
    else:  # SHORT
        return entry_price - reward

def get_score_emoji(score):
    """Retourne un emoji basé sur le score"""
    if score >= 85:
        return "🔥"
    elif score >= 75:
        return "✅"
    elif score >= 60:
        return "🟡"
    elif score >= 40:
        return "🟠"
    else:
        return "🔴"

def get_score_label(score):
    """Retourne un label basé sur le score"""
    if score >= 85:
        return "Opportunité Exceptionnelle"
    elif score >= 75:
        return "Opportunité Forte"
    elif score >= 60:
        return "Opportunité Possible"
    elif score >= 40:
        return "Surveillance"
    else:
        return "À ignorer"

def truncate_text(text, max_length=100):
    """Tronque un texte"""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."

def format_duration(minutes):
    """Formate une durée en texte lisible"""
    if minutes < 60:
        return f"{minutes}m"
    elif minutes < 1440:
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours}h{mins:02d}m"
    else:
        days = minutes // 1440
        hours = (minutes % 1440) // 60
        return f"{days}j {hours}h"

def parse_timeframe(tf_str):
    """Parse un timeframe string en minutes"""
    mapping = {
        "1m": 1, "5m": 5, "15m": 15, "30m": 30,
        "1h": 60, "4h": 240, "1d": 1440, "1w": 10080
    }
    return mapping.get(tf_str, 60)

def format_large_number(num):
    """Formate un grand nombre (millions, milliards)"""
    if num >= 1_000_000_000:
        return f"{num/1_000_000_000:.2f}B"
    elif num >= 1_000_000:
        return f"{num/1_000_000:.2f}M"
    elif num >= 1_000:
        return f"{num/1_000:.2f}K"
    else:
        return f"{num:.0f}"
