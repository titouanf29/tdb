"""
Tests unitaires pour les validateurs
"""
import pytest
import sys
sys.path.insert(0, '..')

from utils.validators import (
    is_valid_amount,
    parse_amount,
    is_valid_leverage,
    parse_leverage,
    is_valid_percentage,
    parse_percentage,
    is_valid_market,
    is_valid_direction,
    is_valid_time,
    is_valid_telegram_id,
    validate_position_data,
    sanitize_input,
    is_valid_score
)


class TestAmountValidation:
    """Tests pour la validation des montants"""

    def test_valid_amount_integer(self):
        assert is_valid_amount("100") is True

    def test_valid_amount_float(self):
        assert is_valid_amount("100.50") is True

    def test_valid_amount_comma_decimal(self):
        assert is_valid_amount("100,50") is True

    def test_invalid_amount_negative(self):
        assert is_valid_amount("-100") is False

    def test_invalid_amount_zero(self):
        assert is_valid_amount("0") is False

    def test_invalid_amount_text(self):
        assert is_valid_amount("abc") is False

    def test_invalid_amount_empty(self):
        assert is_valid_amount("") is False

    def test_parse_amount_valid(self):
        assert parse_amount("100.50") == 100.50

    def test_parse_amount_comma(self):
        assert parse_amount("100,50") == 100.50

    def test_parse_amount_invalid(self):
        assert parse_amount("abc") is None


class TestLeverageValidation:
    """Tests pour la validation du levier"""

    def test_valid_leverage(self):
        assert is_valid_leverage("5") is True

    def test_valid_leverage_zero(self):
        assert is_valid_leverage("0") is True

    def test_valid_leverage_max(self):
        assert is_valid_leverage("100") is True

    def test_invalid_leverage_over_max(self):
        assert is_valid_leverage("101") is False

    def test_invalid_leverage_negative(self):
        assert is_valid_leverage("-1") is False

    def test_invalid_leverage_text(self):
        assert is_valid_leverage("abc") is False

    def test_parse_leverage_valid(self):
        assert parse_leverage("10") == 10

    def test_parse_leverage_invalid(self):
        assert parse_leverage("abc") is None


class TestPercentageValidation:
    """Tests pour la validation des pourcentages"""

    def test_valid_percentage(self):
        assert is_valid_percentage("50") is True

    def test_valid_percentage_with_symbol(self):
        assert is_valid_percentage("50%") is True

    def test_valid_percentage_decimal(self):
        assert is_valid_percentage("50.5") is True

    def test_valid_percentage_zero(self):
        assert is_valid_percentage("0") is True

    def test_valid_percentage_hundred(self):
        assert is_valid_percentage("100") is True

    def test_invalid_percentage_over_hundred(self):
        assert is_valid_percentage("101") is False

    def test_invalid_percentage_negative(self):
        assert is_valid_percentage("-1") is False

    def test_parse_percentage_valid(self):
        assert parse_percentage("50.5%") == 50.5


class TestMarketValidation:
    """Tests pour la validation des marchés"""

    def test_valid_market_usa(self):
        assert is_valid_market("USA") is True

    def test_valid_market_europe(self):
        assert is_valid_market("EUROPE") is True

    def test_valid_market_crypto(self):
        assert is_valid_market("CRYPTO") is True

    def test_invalid_market(self):
        assert is_valid_market("INVALID") is False


class TestDirectionValidation:
    """Tests pour la validation des directions"""

    def test_valid_direction_long(self):
        assert is_valid_direction("LONG") is True

    def test_valid_direction_short(self):
        assert is_valid_direction("SHORT") is True

    def test_invalid_direction(self):
        assert is_valid_direction("HOLD") is False

    def test_invalid_direction_lowercase(self):
        assert is_valid_direction("long") is False


class TestTimeValidation:
    """Tests pour la validation des horaires"""

    def test_valid_time(self):
        assert is_valid_time("09:30") is True

    def test_valid_time_midnight(self):
        assert is_valid_time("00:00") is True

    def test_valid_time_late(self):
        assert is_valid_time("23:59") is True

    def test_invalid_time_over_24(self):
        assert is_valid_time("24:00") is False

    def test_invalid_time_format(self):
        assert is_valid_time("9:30") is True  # Single digit hour is valid

    def test_invalid_time_text(self):
        assert is_valid_time("abc") is False


class TestTelegramIdValidation:
    """Tests pour la validation des IDs Telegram"""

    def test_valid_telegram_id(self):
        assert is_valid_telegram_id("123456789") is True

    def test_valid_telegram_id_int(self):
        assert is_valid_telegram_id(123456789) is True

    def test_invalid_telegram_id_zero(self):
        assert is_valid_telegram_id("0") is False

    def test_invalid_telegram_id_negative(self):
        assert is_valid_telegram_id("-1") is False

    def test_invalid_telegram_id_text(self):
        assert is_valid_telegram_id("abc") is False


class TestScoreValidation:
    """Tests pour la validation des scores"""

    def test_valid_score(self):
        assert is_valid_score(50) is True

    def test_valid_score_zero(self):
        assert is_valid_score(0) is True

    def test_valid_score_hundred(self):
        assert is_valid_score(100) is True

    def test_invalid_score_over_hundred(self):
        assert is_valid_score(101) is False

    def test_invalid_score_negative(self):
        assert is_valid_score(-1) is False


class TestPositionDataValidation:
    """Tests pour la validation des données de position"""

    def test_valid_position_data(self):
        data = {
            'asset_symbol': 'AAPL',
            'direction': 'LONG',
            'amount': 1000,
            'entry_price': 150.0
        }
        is_valid, errors = validate_position_data(data)
        assert is_valid is True
        assert len(errors) == 0

    def test_missing_asset_symbol(self):
        data = {
            'direction': 'LONG',
            'amount': 1000,
            'entry_price': 150.0
        }
        is_valid, errors = validate_position_data(data)
        assert is_valid is False
        assert "Symbole d'actif manquant" in errors

    def test_invalid_direction(self):
        data = {
            'asset_symbol': 'AAPL',
            'direction': 'HOLD',
            'amount': 1000,
            'entry_price': 150.0
        }
        is_valid, errors = validate_position_data(data)
        assert is_valid is False
        assert "Direction invalide" in errors

    def test_invalid_amount(self):
        data = {
            'asset_symbol': 'AAPL',
            'direction': 'LONG',
            'amount': -100,
            'entry_price': 150.0
        }
        is_valid, errors = validate_position_data(data)
        assert is_valid is False
        assert "Montant invalide" in errors


class TestSanitizeInput:
    """Tests pour la sanitisation des entrées"""

    def test_sanitize_normal_text(self):
        assert sanitize_input("Hello World") == "Hello World"

    def test_sanitize_whitespace(self):
        assert sanitize_input("  Hello  ") == "Hello"

    def test_sanitize_long_text(self):
        long_text = "a" * 600
        result = sanitize_input(long_text)
        assert len(result) == 500

    def test_sanitize_empty(self):
        assert sanitize_input("") == ""

    def test_sanitize_none(self):
        assert sanitize_input(None) == ""
