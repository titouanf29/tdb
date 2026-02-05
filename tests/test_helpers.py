"""
Tests unitaires pour les fonctions utilitaires
"""
import pytest
import sys
sys.path.insert(0, '..')

from utils.helpers import (
    generate_position_code,
    format_price,
    format_percent,
    format_money,
    format_pnl,
    get_score_emoji,
    get_score_label,
    truncate_text,
    format_duration,
    parse_timeframe,
    format_large_number,
    calculate_position_size,
    calculate_stop_loss,
    calculate_take_profit
)


class TestGeneratePositionCode:
    """Tests pour la génération de codes de position"""

    def test_code_length_default(self):
        code = generate_position_code()
        assert len(code) == 8

    def test_code_length_custom(self):
        code = generate_position_code(length=12)
        assert len(code) == 12

    def test_code_alphanumeric(self):
        code = generate_position_code()
        assert code.isalnum()
        assert code.isupper() or any(c.isdigit() for c in code)

    def test_code_unique(self):
        codes = [generate_position_code() for _ in range(100)]
        assert len(set(codes)) == 100  # All codes should be unique


class TestFormatPrice:
    """Tests pour le formatage des prix"""

    def test_format_large_price(self):
        result = format_price(1234.56)
        assert "1,234.56" in result or "1234.56" in result

    def test_format_small_price(self):
        result = format_price(0.0001)
        assert "0.0001" in result

    def test_format_crypto_price(self):
        result = format_price(0.00000001)
        assert "0.00000001" in result

    def test_format_none_price(self):
        result = format_price(None)
        assert result == "N/A"


class TestFormatPercent:
    """Tests pour le formatage des pourcentages"""

    def test_format_positive_percent(self):
        result = format_percent(5.5)
        assert "+5.50%" in result

    def test_format_negative_percent(self):
        result = format_percent(-3.2)
        assert "-3.20%" in result

    def test_format_zero_percent(self):
        result = format_percent(0)
        assert "+0.00%" in result

    def test_format_none_percent(self):
        result = format_percent(None)
        assert result == "N/A"


class TestFormatMoney:
    """Tests pour le formatage monétaire"""

    def test_format_money_usd(self):
        result = format_money(1234.56)
        assert "USD" in result
        assert "1234.56" in result or "1,234.56" in result

    def test_format_money_eur(self):
        result = format_money(1000, currency="EUR")
        assert "EUR" in result

    def test_format_money_none(self):
        result = format_money(None)
        assert result == "N/A"


class TestFormatPnL:
    """Tests pour le formatage du PnL"""

    def test_format_positive_pnl(self):
        result = format_pnl(100.50)
        assert "🟢" in result
        assert "+" in result

    def test_format_negative_pnl(self):
        result = format_pnl(-50.25)
        assert "🔴" in result

    def test_format_none_pnl(self):
        result = format_pnl(None)
        assert result == "N/A"


class TestScoreEmoji:
    """Tests pour les emojis de score"""

    def test_score_excellent(self):
        assert get_score_emoji(90) == "🔥"

    def test_score_good(self):
        assert get_score_emoji(80) == "✅"

    def test_score_moderate(self):
        assert get_score_emoji(65) == "🟡"

    def test_score_watch(self):
        assert get_score_emoji(50) == "🟠"

    def test_score_poor(self):
        assert get_score_emoji(30) == "🔴"


class TestScoreLabel:
    """Tests pour les labels de score"""

    def test_label_exceptional(self):
        assert "Exceptionnelle" in get_score_label(90)

    def test_label_strong(self):
        assert "Forte" in get_score_label(80)

    def test_label_possible(self):
        assert "Possible" in get_score_label(65)

    def test_label_watch(self):
        assert "Surveillance" in get_score_label(50)

    def test_label_ignore(self):
        assert "ignorer" in get_score_label(30)


class TestTruncateText:
    """Tests pour la troncature de texte"""

    def test_short_text(self):
        text = "Hello"
        assert truncate_text(text) == "Hello"

    def test_long_text(self):
        text = "a" * 150
        result = truncate_text(text)
        assert len(result) == 100
        assert result.endswith("...")

    def test_custom_length(self):
        text = "a" * 50
        result = truncate_text(text, max_length=30)
        assert len(result) == 30
        assert result.endswith("...")


class TestFormatDuration:
    """Tests pour le formatage de durée"""

    def test_duration_minutes(self):
        assert format_duration(30) == "30m"

    def test_duration_hours_minutes(self):
        result = format_duration(90)
        assert "h" in result

    def test_duration_days(self):
        result = format_duration(1500)
        assert "j" in result


class TestParseTimeframe:
    """Tests pour le parsing des timeframes"""

    def test_parse_1m(self):
        assert parse_timeframe("1m") == 1

    def test_parse_5m(self):
        assert parse_timeframe("5m") == 5

    def test_parse_1h(self):
        assert parse_timeframe("1h") == 60

    def test_parse_4h(self):
        assert parse_timeframe("4h") == 240

    def test_parse_1d(self):
        assert parse_timeframe("1d") == 1440

    def test_parse_invalid(self):
        assert parse_timeframe("invalid") == 60  # Default


class TestFormatLargeNumber:
    """Tests pour le formatage des grands nombres"""

    def test_format_billions(self):
        result = format_large_number(1_500_000_000)
        assert "B" in result

    def test_format_millions(self):
        result = format_large_number(1_500_000)
        assert "M" in result

    def test_format_thousands(self):
        result = format_large_number(1_500)
        assert "K" in result

    def test_format_small(self):
        result = format_large_number(500)
        assert "500" in result


class TestCalculatePositionSize:
    """Tests pour le calcul de taille de position"""

    def test_position_size_basic(self):
        result = calculate_position_size(10000, 2, 5)
        assert result == 4000  # (10000 * 0.02) / 0.05 = 4000

    def test_position_size_zero_stop_loss(self):
        result = calculate_position_size(10000, 2, 0)
        assert result == 0


class TestCalculateStopLoss:
    """Tests pour le calcul du stop loss"""

    def test_stop_loss_long(self):
        result = calculate_stop_loss(100, "LONG", 2, multiplier=2)
        assert result == 96  # 100 - (2 * 2)

    def test_stop_loss_short(self):
        result = calculate_stop_loss(100, "SHORT", 2, multiplier=2)
        assert result == 104  # 100 + (2 * 2)


class TestCalculateTakeProfit:
    """Tests pour le calcul du take profit"""

    def test_take_profit_long(self):
        result = calculate_take_profit(100, 96, "LONG", ratio=2)
        assert result == 108  # 100 + (4 * 2)

    def test_take_profit_short(self):
        result = calculate_take_profit(100, 104, "SHORT", ratio=2)
        assert result == 92  # 100 - (4 * 2)
