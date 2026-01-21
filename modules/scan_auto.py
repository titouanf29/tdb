"""
Module Scan Auto - Scanner automatique en continu
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
from database.manager import db_manager
from utils.helpers import *
from utils.constants import *

class ScanAutoModule:
    """Module de scan automatique"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^scan_"))

    async def show_scan_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le menu du scan auto"""
        query = update.callback_query
        user_id = query.from_user.id if query else update.message.from_user.id

        settings = await db_manager.get_user_settings(user_id)

        if not settings:
            await db_manager.create_user(user_id)
            settings = await db_manager.get_user_settings(user_id)

        scan_enabled = bool(settings['scan_enabled'])
        status_emoji = "🟢" if scan_enabled else "🔴"
        status_text = "Activé" if scan_enabled else "Désactivé"

        text = f"""
🔍 **SCAN AUTOMATIQUE**

{status_emoji} **Statut:** {status_text}

━━━━━━━━━━━━━━━━━━━━

⚙️ **Configuration actuelle:**

• Fréquence: {settings['scan_frequency']}s
• Score minimum: {settings['score_min']}/100
• Alertes max/jour: {settings['max_alerts_per_day']}
• Week-ends: {"✅" if settings['scan_weekends'] else "❌"}

━━━━━━━━━━━━━━━━━━━━

Le scan automatique analyse en continu les marchés sélectionnés et vous alerte dès qu'une opportunité est détectée.
"""

        keyboard = []

        if scan_enabled:
            keyboard.append([InlineKeyboardButton("⏸️ Désactiver le scan", callback_data="scan_disable")])
        else:
            keyboard.append([InlineKeyboardButton("▶️ Activer le scan", callback_data="scan_enable")])

        keyboard.extend([
            [InlineKeyboardButton("⚙️ Configuration", callback_data="scan_config")],
            [InlineKeyboardButton("📊 Résultats récents", callback_data="scan_results")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ])

        reply_markup = InlineKeyboardMarkup(keyboard)

        if query:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def enable_scan(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Active le scan automatique"""
        query = update.callback_query
        user_id = query.from_user.id

        await db_manager.update_user_settings(user_id, scan_enabled=1)
        await query.answer("✅ Scan automatique activé !", show_alert=True)

        await self.show_scan_menu(update, context)

    async def disable_scan(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Désactive le scan automatique"""
        query = update.callback_query
        user_id = query.from_user.id

        await db_manager.update_user_settings(user_id, scan_enabled=0)
        await query.answer("⏸️ Scan automatique désactivé", show_alert=True)

        await self.show_scan_menu(update, context)

    async def show_recent_results(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les résultats récents du scan"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        results = await db_manager.get_recent_scans(user_id, hours=24)

        if not results:
            text = """
📊 **RÉSULTATS RÉCENTS**

Aucun scan dans les dernières 24h.

Activez le scan automatique pour commencer à recevoir des opportunités.
"""
            keyboard = [[InlineKeyboardButton(BTN_BACK, callback_data="scan_main")]]
        else:
            text = f"""
📊 **RÉSULTATS RÉCENTS** (24h)

{len(results)} opportunités détectées

"""
            keyboard = []

            # Top 10 résultats
            for i, result in enumerate(results[:10], 1):
                emoji = get_score_emoji(result['score'])
                text += f"\n{i}. {emoji} **{result['asset_symbol']}** - Score: {result['score']}/100"
                text += f"\n   {result['scan_date'][:16]}"

            keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="scan_main")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks"""
        query = update.callback_query
        data = query.data

        if data == "scan_main":
            await self.show_scan_menu(update, context)

        elif data == "scan_enable":
            await self.enable_scan(update, context)

        elif data == "scan_disable":
            await self.disable_scan(update, context)

        elif data == "scan_results":
            await self.show_recent_results(update, context)
