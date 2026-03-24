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
    """Formate un prix avec le bon nombre de décimales"""
    if price >= 1000:
        return f"{price:,.{decimals}f}"
    elif price >= 1:
        return f"{price:.{decimals}f}"
    elif price >= 0.01:
        return f"{price:.4f}"
    else:
        return f"{price:.8f}"

def format_percent(value):
    """Formate un pourcentage"""
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f}%"

def format_pnl(pnl, currency="USD"):
    """Formate un PnL avec couleur emoji"""
    sign = "+" if pnl >= 0 else ""
    emoji = "🟢" if pnl >= 0 else "🔴"
    return f"{emoji} {sign}{format_price(pnl)} {currency}"

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


def generate_position_advice(position: dict) -> str:
    """
    Génère des conseils personnalisés basés sur les paramètres de la position.
    Prend en compte : direction, PnL, levier, distance TP/SL, durée, prix actuel.
    """
    direction = position.get('direction', 'LONG')
    pnl_percent = position.get('pnl_percent', 0.0)
    pnl = position.get('pnl', 0.0)
    leverage = position.get('leverage', 1)
    entry_price = position.get('entry_price', 0)
    current_price = position.get('current_price', 0)
    stop_loss = position.get('stop_loss')
    tp1 = position.get('take_profit_1')
    tp2 = position.get('take_profit_2')
    opened_at = position.get('opened_at', '')

    advice_lines = []

    # --- Calcul durée ---
    duration_minutes = 0
    if opened_at:
        try:
            opened_dt = datetime.fromisoformat(opened_at[:19])
            duration_minutes = int((datetime.now() - opened_dt).total_seconds() / 60)
        except Exception:
            pass

    # --- Calcul distances relatives ---
    if entry_price and current_price:
        price_change_pct = ((current_price - entry_price) / entry_price) * 100
    else:
        price_change_pct = 0.0

    dist_to_sl_pct = None
    dist_to_tp1_pct = None
    dist_to_tp2_pct = None

    if current_price:
        if stop_loss:
            dist_to_sl_pct = abs((current_price - stop_loss) / current_price) * 100
        if tp1:
            dist_to_tp1_pct = abs((tp1 - current_price) / current_price) * 100
        if tp2:
            dist_to_tp2_pct = abs((tp2 - current_price) / current_price) * 100

    # === SECTION 1: Statut de la position ===
    if pnl_percent >= 15:
        advice_lines.append("🔥 **Excellente performance !** Votre position est très profitable.")
    elif pnl_percent >= 5:
        advice_lines.append("✅ **Position gagnante.** Vous êtes bien en profit.")
    elif pnl_percent >= 1:
        advice_lines.append("🟡 **Léger profit.** La position progresse favorablement.")
    elif pnl_percent > -1:
        advice_lines.append("⚪ **Position neutre.** Le prix évolue près de votre entrée.")
    elif pnl_percent > -5:
        advice_lines.append("🟠 **Légère perte.** Restez attentif à l'évolution du marché.")
    elif pnl_percent > -10:
        advice_lines.append("🔴 **Position en perte.** Réévaluez votre thèse de trading.")
    else:
        advice_lines.append("⚠️ **Perte significative.** Considérez sérieusement votre gestion du risque.")

    # === SECTION 2: Levier ===
    if leverage >= 7:
        advice_lines.append(f"⚠️ **Levier élevé (x{leverage}) :** Les mouvements de prix sont amplifiés. Surveillez votre position de près.")
    elif leverage >= 4:
        advice_lines.append(f"📊 **Levier modéré (x{leverage}) :** Gardez un œil sur votre SL pour protéger votre capital.")
    elif leverage >= 2:
        advice_lines.append(f"📊 **Levier x{leverage} :** Risque maîtrisé, mais restez vigilant.")

    # === SECTION 3: Proximité du Stop Loss ===
    if dist_to_sl_pct is not None:
        if dist_to_sl_pct < 1.0:
            advice_lines.append(f"🚨 **SL très proche ({dist_to_sl_pct:.2f}%) !** Votre stop loss est sur le point d'être touché. Décidez rapidement.")
        elif dist_to_sl_pct < 2.5:
            advice_lines.append(f"⚠️ **SL proche ({dist_to_sl_pct:.1f}%) :** Votre stop loss est à portée. Restez vigilant.")
        elif dist_to_sl_pct < 5.0:
            advice_lines.append(f"🟡 **SL à {dist_to_sl_pct:.1f}% :** Marge correcte, surveillez l'évolution du prix.")

    # === SECTION 4: Proximité du Take Profit ===
    if pnl_percent > 0:
        if dist_to_tp1_pct is not None and dist_to_tp1_pct < 1.5:
            advice_lines.append(f"🎯 **TP1 quasi atteint ({dist_to_tp1_pct:.2f}% restant) !** Envisagez de sécuriser une partie de vos gains.")
        elif dist_to_tp2_pct is not None and dist_to_tp2_pct < 2.0:
            advice_lines.append(f"🏆 **TP2 proche ({dist_to_tp2_pct:.1f}% restant) !** Objectif final à portée, préparez-vous à clôturer.")
        elif dist_to_tp1_pct is not None and dist_to_tp1_pct < 5.0:
            advice_lines.append(f"📈 **TP1 à {dist_to_tp1_pct:.1f}% :** Votre premier objectif est proche, continuez à tenir.")

    # === SECTION 5: Direction et mouvement du prix ===
    if direction == "LONG":
        if price_change_pct > 3:
            advice_lines.append("📈 **Tendance haussière forte.** Le prix monte dans votre sens. Maintenez la position.")
        elif price_change_pct > 0:
            advice_lines.append("📈 **Prix en hausse.** La direction LONG est confirmée pour l'instant.")
        elif price_change_pct < -3:
            advice_lines.append("📉 **Prix en baisse notable.** Le marché va contre votre LONG. Surveillez votre SL.")
        else:
            advice_lines.append("↔️ **Prix stable.** Attendez une confirmation de direction avant d'agir.")
    else:  # SHORT
        if price_change_pct < -3:
            advice_lines.append("📉 **Tendance baissière forte.** Le prix baisse dans votre sens. Maintenez la position.")
        elif price_change_pct < 0:
            advice_lines.append("📉 **Prix en baisse.** La direction SHORT est confirmée pour l'instant.")
        elif price_change_pct > 3:
            advice_lines.append("📈 **Prix en hausse notable.** Le marché va contre votre SHORT. Surveillez votre SL.")
        else:
            advice_lines.append("↔️ **Prix stable.** Attendez une confirmation de direction avant d'agir.")

    # === SECTION 6: Durée de détention ===
    if duration_minutes > 0:
        if duration_minutes > 10080:  # > 1 semaine
            advice_lines.append(f"⏳ **Position ouverte depuis plus d'une semaine.** Réévaluez si votre thèse est toujours valide.")
        elif duration_minutes > 1440:  # > 1 jour
            days = duration_minutes // 1440
            advice_lines.append(f"⏳ **Position ouverte depuis {days} jour(s).** Assurez-vous que les conditions de marché sont toujours favorables.")
        elif duration_minutes > 240:  # > 4h
            advice_lines.append(f"⏳ **Position ouverte depuis {format_duration(duration_minutes)}.** Moment opportun pour réévaluer votre objectif.")

    # === SECTION 7: Conseil d'action global ===
    if pnl_percent >= 10 and dist_to_tp2_pct is not None and dist_to_tp2_pct > 10:
        advice_lines.append("💡 **Conseil :** Envisagez de déplacer votre SL au prix d'entrée pour sécuriser votre breakeven.")
    elif pnl_percent < -8 and leverage >= 3:
        advice_lines.append("💡 **Conseil :** Avec ce levier et cette perte, une clôture partielle ou totale peut limiter le risque.")
    elif pnl_percent > 5 and leverage == 1:
        advice_lines.append("💡 **Conseil :** Bonne gestion du risque avec levier x1. Continuez à suivre votre plan initial.")

    if not advice_lines:
        advice_lines.append("💡 Suivez votre plan de trading initial et respectez vos niveaux TP/SL.")

    return "\n".join(advice_lines)
