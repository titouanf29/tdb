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

        text = f"""⚙️ <b>PARAMÈTRES</b>

━━━━━━━━━━━━━━━━━━━━

📊 <b>Trading</b>
• Style: {settings['trading_style']}
• Risque/position: {settings['risk_per_position']}%
• Levier max: ×{settings['max_leverage']}

━━━━━━━━━━━━━━━━━━━━

🔔 <b>Notifications</b>
• Globales: {"✅" if settings['notifications_enabled'] else "❌"}
• Opportunités: {"✅" if settings['notif_opportunities'] else "❌"}
• Positions: {"✅" if settings['notif_positions'] else "❌"}

━━━━━━━━━━━━━━━━━━━━

🤖 <b>IA</b>
• Agressivité: {settings['ai_aggressiveness']}
• Niveau détail: {settings['detail_level']}"""

        keyboard = [
            [InlineKeyboardButton("📊 Trading & Risque", callback_data="settings_trading")],
            [InlineKeyboardButton("🔔 Notifications", callback_data="settings_notif")],
            [InlineKeyboardButton("🤖 Intelligence IA", callback_data="settings_ai")],
            [InlineKeyboardButton("🎨 Interface", callback_data="settings_ui")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)

        if query:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')
        else:
            await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_trading_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres de trading"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""📊 <b>PARAMÈTRES TRADING</b>

<b>Style de trading:</b> {settings['trading_style']}
<b>Risque par position:</b> {settings['risk_per_position']}%
<b>Perte max quotidienne:</b> {settings['max_daily_loss']}%
<b>Levier maximum:</b> ×{settings['max_leverage']}
<b>Stop Loss obligatoire:</b> {"✅" if settings['stop_loss_mandatory'] else "❌"}"""

        keyboard = [
            [InlineKeyboardButton("📝 Modifier", callback_data="settings_trading_edit")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_notification_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres de notifications"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""🔔 <b>PARAMÈTRES NOTIFICATIONS</b>

<b>Notifications globales:</b> {"✅" if settings['notifications_enabled'] else "❌"}

<b>Types de notifications:</b>
• Opportunités: {"✅" if settings['notif_opportunities'] else "❌"}
• Breakouts: {"✅" if settings['notif_breakouts'] else "❌"}
• Positions: {"✅" if settings['notif_positions'] else "❌"}
• News: {"✅" if settings['notif_news'] else "❌"}

<b>Résumé quotidien:</b> {"✅" if settings['notif_daily_summary'] else "❌"}
<b>Heure:</b> {settings['summary_time']}"""

        keyboard = [
            [InlineKeyboardButton(
                "🔕 Désactiver tout" if settings['notifications_enabled'] else "🔔 Activer tout",
                callback_data="settings_notif_toggle"
            )],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

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

    async def show_ai_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres IA"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""🤖 <b>PARAMÈTRES INTELLIGENCE IA</b>

<b>Agressivité de l'IA:</b> {settings['ai_aggressiveness']}
Définit le niveau de prise de risque dans les recommandations.

<b>Niveau de détail:</b> {settings['detail_level']}
Quantité d'informations dans les analyses.

<b>Langue:</b> FR 🇫🇷

Ces paramètres influencent la manière dont l'IA analyse les marchés et formule ses recommandations."""

        keyboard = [
            [InlineKeyboardButton("📝 Agressivité", callback_data="settings_ai_aggro")],
            [InlineKeyboardButton("📊 Niveau détail", callback_data="settings_ai_detail")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_ui_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres d'interface"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = """🎨 <b>PARAMÈTRES INTERFACE</b>

<b>Thème:</b> 🌙 Sombre
<b>Emojis:</b> ✅ Activés
<b>Graphiques:</b> ✅ Candlesticks

<b>Notifications visuelles:</b>
• Opportunités: 🔥
• Positions gagnantes: 💰
• Positions perdantes: ⚠️

<b>Format des nombres:</b>
• Prix: 2 décimales
• Pourcentages: 2 décimales"""

        keyboard = [
            [InlineKeyboardButton("🎨 Thème", callback_data="settings_ui_theme")],
            [InlineKeyboardButton("📊 Graphiques", callback_data="settings_ui_charts")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

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

        elif data == "settings_ai":
            await self.show_ai_settings(update, context)

        elif data == "settings_ui":
            await self.show_ui_settings(update, context)

        # Sous-menus (non implémentés complètement pour l'instant)
        elif data.startswith("settings_ai_") or data.startswith("settings_ui_") or data.startswith("settings_trading_"):
            await query.answer("⚙️ Fonctionnalité en cours de développement", show_alert=True)
