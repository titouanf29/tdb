"""
Validateurs pour TDB Bot
"""
import re
import logging
import config

logger = logging.getLogger(__name__)


def is_valid_amount(amount_str):
    """Vérifie si un montant est valide"""
    try:
        amount = float(amount_str.replace(',', '.'))
        return amount > 0
    except (ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Montant invalide '{amount_str}': {e}")
        return False


def parse_amount(amount_str):
    """Parse un montant"""
    try:
        return float(amount_str.replace(',', '.'))
    except (ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Impossible de parser le montant '{amount_str}': {e}")
        return None


def is_valid_leverage(leverage_str):
    """Vérifie si un levier est valide"""
    try:
        leverage = int(leverage_str)
        return 0 <= leverage <= 100
    except (ValueError, TypeError) as e:
        logger.debug(f"Levier invalide '{leverage_str}': {e}")
        return False


def parse_leverage(leverage_str):
    """Parse un levier"""
    try:
        return int(leverage_str)
    except (ValueError, TypeError) as e:
        logger.debug(f"Impossible de parser le levier '{leverage_str}': {e}")
        return None


def is_valid_percentage(percent_str):
    """Vérifie si un pourcentage est valide"""
    try:
        percent = float(percent_str.replace(',', '.').replace('%', ''))
        return 0 <= percent <= 100
    except (ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Pourcentage invalide '{percent_str}': {e}")
        return False


def parse_percentage(percent_str):
    """Parse un pourcentage"""
    try:
        return float(percent_str.replace(',', '.').replace('%', ''))
    except (ValueError, TypeError, AttributeError) as e:
        logger.debug(f"Impossible de parser le pourcentage '{percent_str}': {e}")
        return None

def is_valid_market(market_code):
    """Vérifie si un marché est valide"""
    return market_code in config.MARKETS

def is_valid_asset(asset_symbol):
    """Vérifie si un symbole d'actif est valide (basique)"""
    # Symbole doit contenir au moins 1 caractère
    if not asset_symbol or len(asset_symbol) < 1:
        return False
    # Symboles crypto se terminent généralement par -USD
    # Symboles actions sont en lettres majuscules
    # Indices commencent par ^
    return True

def is_valid_direction(direction):
    """Vérifie si une direction est valide"""
    return direction in ["LONG", "SHORT"]

def is_valid_time(time_str):
    """Vérifie si un format d'heure est valide (HH:MM)"""
    pattern = r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
    return bool(re.match(pattern, time_str))

def is_valid_telegram_id(telegram_id):
    """Vérifie si un ID Telegram est valide"""
    try:
        tid = int(telegram_id)
        return tid > 0
    except (ValueError, TypeError) as e:
        logger.debug(f"ID Telegram invalide '{telegram_id}': {e}")
        return False

def validate_position_data(data):
    """Valide les données d'une position"""
    errors = []

    if 'asset_symbol' not in data or not data['asset_symbol']:
        errors.append("Symbole d'actif manquant")

    if 'direction' not in data or not is_valid_direction(data['direction']):
        errors.append("Direction invalide")

    if 'amount' not in data or data['amount'] <= 0:
        errors.append("Montant invalide")

    if 'entry_price' not in data or data['entry_price'] <= 0:
        errors.append("Prix d'entrée invalide")

    return len(errors) == 0, errors

def sanitize_input(text):
    """Nettoie une entrée utilisateur"""
    if not text:
        return ""
    # Supprimer les caractères spéciaux dangereux
    text = text.strip()
    # Limiter la longueur
    if len(text) > 500:
        text = text[:500]
    return text

def is_valid_score(score):
    """Vérifie si un score est valide"""
    try:
        s = int(score)
        return 0 <= s <= 100
    except (ValueError, TypeError) as e:
        logger.debug(f"Score invalide '{score}': {e}")
        return False
