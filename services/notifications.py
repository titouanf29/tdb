"""
Service de notifications intelligentes
"""
from datetime import datetime, timedelta
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from database.manager import db_manager
from utils.constants import *
from utils.helpers import *

# Cache des opportunités snooze (user_id -> {symbol: datetime_expiry})
_snoozed_opportunities = {}


class NotificationService:
    """Service pour gérer les notifications"""

    @staticmethod
    def is_snoozed(telegram_id, symbol):
        """Vérifie si une opportunité est snooze pour cet utilisateur"""
        user_snoozes = _snoozed_opportunities.get(telegram_id, {})
        if symbol in user_snoozes:
            if datetime.now() < user_snoozes[symbol]:
                return True
            else:
                # Snooze expiré, le supprimer
                del user_snoozes[symbol]
        return False

    @staticmethod
    def snooze_opportunity(telegram_id, symbol, hours=2):
        """Snooze une opportunité pour X heures"""
        if telegram_id not in _snoozed_opportunities:
            _snoozed_opportunities[telegram_id] = {}
        _snoozed_opportunities[telegram_id][symbol] = datetime.now() + timedelta(hours=hours)

    @staticmethod
    async def send_opportunity_notification(telegram_id, bot, analysis):
        """Envoie une notification d'opportunité"""
        symbol = analysis['symbol']
        score = analysis['score']
        direction = analysis['direction']
        current_price = analysis['current_price']

        # Vérifier si l'opportunité est snooze
        if NotificationService.is_snoozed(telegram_id, symbol):
            return  # Ne pas envoyer si snooze

        emoji_score = get_score_emoji(score)
        emoji_dir = EMOJI_DIRECTION[direction]

        message = f"""
🔔 **OPPORTUNITÉ DÉTECTÉE**

{emoji_score} **{symbol}** - Score: {score}/100

{emoji_dir} Direction: {direction}
💰 Prix actuel: {format_price(current_price)}

📊 {analysis.get('technical_summary', 'Analyse technique disponible')}

Type: {OPPORTUNITY_TYPES.get(analysis.get('opportunity_type', 'trading'), analysis.get('opportunity_type', 'Trading'))}
Risque: {EMOJI_RISK.get(analysis.get('risk_level', 'medium'), '🟡')} {analysis.get('risk_level', 'MEDIUM').upper()}
"""

        # Boutons d'action
        keyboard = [
            [InlineKeyboardButton("✅ Intéressé (voir /a)", callback_data=f"opp_interested_{symbol}")],
            [InlineKeyboardButton("😴 Snooze 2h", callback_data=f"opp_snooze_{symbol}"),
             InlineKeyboardButton("❌ Ignorer", callback_data=f"opp_ignore_{symbol}")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown',
                reply_markup=reply_markup
            )

            # Sauvegarder la notification
            await db_manager.execute("""
                INSERT INTO notifications (telegram_id, notification_type, asset_symbol, message)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, 'opportunity', symbol, message))

        except Exception as e:
            print(f"Erreur envoi notification: {e}")

    @staticmethod
    async def send_position_update(telegram_id, bot, position, pnl_change):
        """Envoie une notification de mise à jour de position"""
        symbol = position['asset_symbol']
        direction = position['direction']
        pnl = position['pnl']
        pnl_percent = position['pnl_percent']

        emoji_dir = EMOJI_DIRECTION[direction]
        emoji_pnl = "🟢" if pnl >= 0 else "🔴"

        message = f"""
📊 **MISE À JOUR POSITION**

{emoji_dir} {symbol} ({direction})

{emoji_pnl} PnL: {format_pnl(pnl)}
{emoji_pnl} {format_percent(pnl_percent)}

Code: `{position['position_code']}`
"""

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"Erreur envoi notification position: {e}")

    @staticmethod
    async def send_tp_hit_notification(telegram_id, bot, position, tp_level):
        """Envoie une notification de TP touché"""
        symbol = position['asset_symbol']
        direction = position['direction']
        pnl = position['pnl']

        message = f"""
✅ **TAKE PROFIT TOUCHÉ !**

{EMOJI_DIRECTION[direction]} {symbol} ({direction})

TP{tp_level} atteint !

💰 Profit: {format_pnl(pnl)}

Code: `{position['position_code']}`
"""

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"Erreur envoi notification TP: {e}")

    @staticmethod
    async def send_sl_hit_notification(telegram_id, bot, position):
        """Envoie une notification de SL touché"""
        symbol = position['asset_symbol']
        direction = position['direction']
        pnl = position['pnl']

        message = f"""
🛑 **STOP LOSS TOUCHÉ**

{EMOJI_DIRECTION[direction]} {symbol} ({direction})

SL déclenché

💸 Perte: {format_pnl(pnl)}

Code: `{position['position_code']}`

La position a été fermée automatiquement.
"""

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"Erreur envoi notification SL: {e}")

    @staticmethod
    async def send_daily_summary(telegram_id, bot, wallet, positions, scans):
        """Envoie un résumé quotidien"""
        daily_pnl = wallet['daily_pnl']
        balance = wallet['balance']
        open_positions_count = len(positions)

        best_scans = sorted(scans, key=lambda x: x['score'], reverse=True)[:5]

        message = f"""
📅 **RÉSUMÉ QUOTIDIEN**

💼 **Wallet**
Solde: {format_price(balance)} USD
PnL du jour: {format_pnl(daily_pnl)}

📊 **Positions**
Ouvertes: {open_positions_count}

🔥 **Top Opportunités du jour**
"""

        for scan in best_scans:
            message += f"\n{get_score_emoji(scan['score'])} {scan['asset_symbol']} - Score: {scan['score']}/100"

        message += "\n\nUtilisez /menu pour plus de détails."

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"Erreur envoi résumé quotidien: {e}")

    @staticmethod
    async def send_news_alert(telegram_id, bot, asset_symbol, news_summary):
        """Envoie une alerte actualité"""
        message = f"""
📰 **ACTUALITÉ IMPORTANTE**

**{asset_symbol}**

{news_summary}

Impact potentiel sur le prix.
"""

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"Erreur envoi alerte news: {e}")

# Instance globale
notification_service = NotificationService()
