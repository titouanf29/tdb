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

    async def show_config_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le menu de configuration du scan"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""
⚙️ **CONFIGURATION DU SCAN**

📊 **Paramètres actuels:**

• **Fréquence:** {settings['scan_frequency']}s
  ⏱️ Intervalle entre chaque scan

• **Score minimum:** {settings['score_min']}/100
  🎯 Seuil pour recevoir une alerte

• **Alertes max/jour:** {settings['max_alerts_per_day']}
  🔔 Limite quotidienne de notifications

• **Scan week-ends:** {"✅ Activé" if settings['scan_weekends'] else "❌ Désactivé"}
  📅 Scanner le samedi et dimanche

━━━━━━━━━━━━━━━━━━━━

Choisissez un paramètre à modifier:
"""

        keyboard = [
            [InlineKeyboardButton("⏱️ Fréquence", callback_data="scan_config_freq")],
            [InlineKeyboardButton("🎯 Score minimum", callback_data="scan_config_score")],
            [InlineKeyboardButton("🔔 Alertes max/jour", callback_data="scan_config_alerts")],
            [InlineKeyboardButton(f"📅 Week-ends: {'✅' if settings['scan_weekends'] else '❌'}",
                                callback_data="scan_config_weekends")],
            [InlineKeyboardButton(BTN_BACK, callback_data="scan_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_frequency_options(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les options de fréquence"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current_freq = settings['scan_frequency']

        text = """
⏱️ **FRÉQUENCE DE SCAN**

Choisissez l'intervalle entre chaque scan:
"""

        frequencies = [
            (60, "1 minute"),
            (300, "5 minutes"),
            (900, "15 minutes"),
            (1800, "30 minutes"),
            (3600, "1 heure")
        ]

        keyboard = []
        for freq_value, freq_label in frequencies:
            marker = " ✓" if freq_value == current_freq else ""
            keyboard.append([InlineKeyboardButton(
                f"{freq_label}{marker}",
                callback_data=f"scan_set_freq_{freq_value}"
            )])

        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="scan_config")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_score_options(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les options de score minimum"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current_score = settings['score_min']

        text = """
🎯 **SCORE MINIMUM**

Choisissez le score minimum pour recevoir une alerte:

• 50-59: Opportunités faibles
• 60-69: Opportunités moyennes
• 70-79: Bonnes opportunités
• 80-89: Très bonnes opportunités
• 90+: Opportunités exceptionnelles
"""

        scores = [50, 60, 70, 80, 90]

        keyboard = []
        for score in scores:
            marker = " ✓" if score == current_score else ""
            keyboard.append([InlineKeyboardButton(
                f"{score}/100{marker}",
                callback_data=f"scan_set_score_{score}"
            )])

        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="scan_config")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_alerts_options(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les options d'alertes max par jour"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current_alerts = settings['max_alerts_per_day']

        text = """
🔔 **ALERTES MAX PAR JOUR**

Limitez le nombre d'alertes quotidiennes pour éviter le spam:
"""

        alert_limits = [5, 10, 20, 50, 100]

        keyboard = []
        for limit in alert_limits:
            marker = " ✓" if limit == current_alerts else ""
            keyboard.append([InlineKeyboardButton(
                f"{limit} alertes/jour{marker}",
                callback_data=f"scan_set_alerts_{limit}"
            )])

        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="scan_config")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def toggle_weekends(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Active/désactive le scan le week-end"""
        query = update.callback_query
        user_id = query.from_user.id

        settings = await db_manager.get_user_settings(user_id)
        new_value = not settings['scan_weekends']

        await db_manager.update_user_settings(user_id, scan_weekends=new_value)

        status = "activé" if new_value else "désactivé"
        await query.answer(f"✅ Scan week-end {status}", show_alert=False)

        await self.show_config_menu(update, context)

    async def set_frequency(self, update: Update, context: ContextTypes.DEFAULT_TYPE, frequency: int):
        """Définit la fréquence de scan"""
        query = update.callback_query
        user_id = query.from_user.id

        await db_manager.update_user_settings(user_id, scan_frequency=frequency)
        await query.answer(f"✅ Fréquence mise à jour: {frequency}s", show_alert=False)

        await self.show_config_menu(update, context)

    async def set_score_min(self, update: Update, context: ContextTypes.DEFAULT_TYPE, score: int):
        """Définit le score minimum"""
        query = update.callback_query
        user_id = query.from_user.id

        await db_manager.update_user_settings(user_id, score_min=score)
        await query.answer(f"✅ Score minimum: {score}/100", show_alert=False)

        await self.show_config_menu(update, context)

    async def set_max_alerts(self, update: Update, context: ContextTypes.DEFAULT_TYPE, max_alerts: int):
        """Définit le nombre max d'alertes par jour"""
        query = update.callback_query
        user_id = query.from_user.id

        await db_manager.update_user_settings(user_id, max_alerts_per_day=max_alerts)
        await query.answer(f"✅ Alertes max/jour: {max_alerts}", show_alert=False)

        await self.show_config_menu(update, context)

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

        elif data == "scan_config":
            await self.show_config_menu(update, context)

        elif data == "scan_config_freq":
            await self.show_frequency_options(update, context)

        elif data == "scan_config_score":
            await self.show_score_options(update, context)

        elif data == "scan_config_alerts":
            await self.show_alerts_options(update, context)

        elif data == "scan_config_weekends":
            await self.toggle_weekends(update, context)

        elif data.startswith("scan_set_freq_"):
            frequency = int(data.replace("scan_set_freq_", ""))
            await self.set_frequency(update, context, frequency)

        elif data.startswith("scan_set_score_"):
            score = int(data.replace("scan_set_score_", ""))
            await self.set_score_min(update, context, score)

        elif data.startswith("scan_set_alerts_"):
            max_alerts = int(data.replace("scan_set_alerts_", ""))
            await self.set_max_alerts(update, context, max_alerts)
