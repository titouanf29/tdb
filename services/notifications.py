"""
Service de notifications intelligentes
"""
from datetime import datetime
from database.manager import db_manager
from utils.constants import *
from utils.helpers import *

class NotificationService:
    """Service pour gérer les notifications"""

    @staticmethod
    async def send_opportunity_notification(telegram_id, bot, analysis):
        """Envoie une notification d'opportunité"""
        symbol = analysis['symbol']
        score = analysis['score']
        direction = analysis['direction']
        current_price = analysis['current_price']

        emoji_score = get_score_emoji(score)
        emoji_dir = EMOJI_DIRECTION[direction]

        message = f"""
🔔 **OPPORTUNITÉ DÉTECTÉE**

{emoji_score} **{symbol}** - Score: {score}/100

{emoji_dir} Direction: {direction}
💰 Prix actuel: {format_price(current_price)}

📊 {analysis['technical_summary']}

Type: {OPPORTUNITY_TYPES.get(analysis['opportunity_type'], analysis['opportunity_type'])}
Risque: {EMOJI_RISK[analysis['risk_level']]} {analysis['risk_level'].upper()}

Utilisez /menu pour analyser en détail.
"""

        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='Markdown'
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
