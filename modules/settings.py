"""
Module Paramètres - Configuration du bot
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
from database.manager import db_manager
from utils.constants import *

class SettingsModule:
    """Module de gestion des paramètres"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^settings_"))

    async def show_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres"""
        query = update.callback_query
        user_id = query.from_user.id if query else update.message.from_user.id

        settings = await db_manager.get_user_settings(user_id)

        if not settings:
            await db_manager.create_user(user_id)
            settings = await db_manager.get_user_settings(user_id)

        text = f"""
⚙️ **PARAMÈTRES**

━━━━━━━━━━━━━━━━━━━━

📊 **Trading**
• Style: {settings['trading_style']}
• Risque/position: {settings['risk_per_position']}%
• Levier max: x{settings['max_leverage']}

━━━━━━━━━━━━━━━━━━━━

🔔 **Notifications**
• Globales: {"✅" if settings['notifications_enabled'] else "❌"}
• Opportunités: {"✅" if settings['notif_opportunities'] else "❌"}
• Positions: {"✅" if settings['notif_positions'] else "❌"}

━━━━━━━━━━━━━━━━━━━━

🤖 **IA**
• Agressivité: {settings['ai_aggressiveness']}
• Niveau détail: {settings['detail_level']}
"""

        keyboard = [
            [InlineKeyboardButton("📊 Trading & Risque", callback_data="settings_trading")],
            [InlineKeyboardButton("🔔 Notifications", callback_data="settings_notif")],
            [InlineKeyboardButton("🤖 Intelligence IA", callback_data="settings_ai")],
            [InlineKeyboardButton("🎨 Interface", callback_data="settings_ui")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)

        if query:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_trading_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres de trading"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""
📊 **PARAMÈTRES TRADING**

**Style de trading:** {settings['trading_style']}
**Risque par position:** {settings['risk_per_position']}%
**Perte max quotidienne:** {settings['max_daily_loss']}%
**Levier maximum:** x{settings['max_leverage']}
**Stop Loss obligatoire:** {"✅" if settings['stop_loss_mandatory'] else "❌"}
"""

        keyboard = [
            [InlineKeyboardButton("📝 Modifier", callback_data="settings_trading_edit")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_notification_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres de notifications"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""
🔔 **PARAMÈTRES NOTIFICATIONS**

**Notifications globales:** {"✅" if settings['notifications_enabled'] else "❌"}

**Types de notifications:**
• Opportunités: {"✅" if settings['notif_opportunities'] else "❌"}
• Breakouts: {"✅" if settings['notif_breakouts'] else "❌"}
• Positions: {"✅" if settings['notif_positions'] else "❌"}
• News: {"✅" if settings['notif_news'] else "❌"}

**Résumé quotidien:** {"✅" if settings['notif_daily_summary'] else "❌"}
**Heure:** {settings['summary_time']}
"""

        keyboard = [
            [InlineKeyboardButton(
                "🔕 Désactiver tout" if settings['notifications_enabled'] else "🔔 Activer tout",
                callback_data="settings_notif_toggle"
            )],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def toggle_notifications(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Active/désactive les notifications"""
        query = update.callback_query
        user_id = query.from_user.id

        settings = await db_manager.get_user_settings(user_id)
        new_state = 0 if settings['notifications_enabled'] else 1

        await db_manager.update_user_settings(user_id, notifications_enabled=new_state)

        await query.answer(
            "🔔 Notifications activées" if new_state else "🔕 Notifications désactivées",
            show_alert=True
        )

        await self.show_notification_settings(update, context)

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks"""
        query = update.callback_query
        data = query.data

        if data == "settings_main":
            await self.show_settings(update, context)

        elif data == "settings_trading":
            await self.show_trading_settings(update, context)

        elif data == "settings_notif":
            await self.show_notification_settings(update, context)

        elif data == "settings_notif_toggle":
            await self.toggle_notifications(update, context)
