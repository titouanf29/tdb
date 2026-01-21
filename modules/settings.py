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
            [InlineKeyboardButton("📊 Résumé quotidien", callback_data="settings_notif_daily")],
            [InlineKeyboardButton("🕐 Modifier l'heure", callback_data="settings_notif_time")],
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
            [InlineKeyboardButton("📊 Type de graphiques", callback_data="settings_ui_charts")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_theme_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du thème"""
        query = update.callback_query
        await query.answer()

        text = """🎨 <b>THÈME DE L'INTERFACE</b>

Choisissez le thème de votre bot :

• <b>Sombre</b> : Interface dark, reposant pour les yeux
• <b>Clair</b> : Interface lumineuse et colorée
• <b>Auto</b> : S'adapte à l'heure (jour/nuit)

<i>Note : Le thème n'affecte que l'interface Telegram sur mobile/desktop</i>"""

        keyboard = [
            [InlineKeyboardButton("🌙 Sombre", callback_data="set_theme_dark")],
            [InlineKeyboardButton("☀️ Clair", callback_data="set_theme_light")],
            [InlineKeyboardButton("🔄 Auto", callback_data="set_theme_auto")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_ui")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_charts_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du type de graphiques"""
        query = update.callback_query
        await query.answer()

        text = """📊 <b>TYPE DE GRAPHIQUES</b>

Choisissez le type de graphiques pour l'analyse :

• <b>Candlesticks</b> : Graphiques en chandeliers japonais (recommandé)
• <b>Lignes</b> : Graphiques en lignes simples
• <b>Barres</b> : Graphiques en barres OHLC

<i>Les candlesticks offrent le plus d'informations visuelles</i>"""

        keyboard = [
            [InlineKeyboardButton("🕯️ Candlesticks", callback_data="set_chart_candlestick")],
            [InlineKeyboardButton("📈 Lignes", callback_data="set_chart_line")],
            [InlineKeyboardButton("📊 Barres", callback_data="set_chart_bar")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_ui")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_daily_summary_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu résumé quotidien"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = """🔔 <b>RÉSUMÉ QUOTIDIEN</b>

Le résumé quotidien vous envoie un récapitulatif de :
• Vos positions ouvertes et leurs performances
• Les opportunités détectées dans la journée
• Les mouvements importants du marché

<b>État actuel :</b> """ + ("✅ Activé" if settings['notif_daily_summary'] else "❌ Désactivé")

        keyboard = [
            [InlineKeyboardButton("✅ Activer", callback_data="set_daily_summary_1")],
            [InlineKeyboardButton("❌ Désactiver", callback_data="set_daily_summary_0")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_notif")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_summary_time_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu modification heure du résumé"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = f"""🕐 <b>HEURE DU RÉSUMÉ QUOTIDIEN</b>

Choisissez l'heure à laquelle vous souhaitez recevoir votre résumé quotidien.

<b>Heure actuelle :</b> {settings['summary_time']}"""

        keyboard = [
            [InlineKeyboardButton("08:00", callback_data="set_time_08:00"), InlineKeyboardButton("09:00", callback_data="set_time_09:00")],
            [InlineKeyboardButton("12:00", callback_data="set_time_12:00"), InlineKeyboardButton("14:00", callback_data="set_time_14:00")],
            [InlineKeyboardButton("18:00", callback_data="set_time_18:00"), InlineKeyboardButton("20:00", callback_data="set_time_20:00")],
            [InlineKeyboardButton("22:00", callback_data="set_time_22:00"), InlineKeyboardButton("23:00", callback_data="set_time_23:00")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_notif")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    # ============ MENUS DE MODIFICATION ============

    async def show_trading_style_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du style de trading"""
        query = update.callback_query
        await query.answer()

        text = """📊 <b>STYLE DE TRADING</b>

Choisissez votre style de trading préféré :"""

        keyboard = [
            [InlineKeyboardButton("⚡ Scalping (< 5min)", callback_data="set_style_Scalping")],
            [InlineKeyboardButton("📈 Day Trading (< 1 jour)", callback_data="set_style_Day Trading")],
            [InlineKeyboardButton("📊 Swing Trading (< 1 semaine)", callback_data="set_style_Swing Trading")],
            [InlineKeyboardButton("📉 Position Trading (> 1 semaine)", callback_data="set_style_Position Trading")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_risk_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du risque par position"""
        query = update.callback_query
        await query.answer()

        text = """📊 <b>RISQUE PAR POSITION</b>

Choisissez le pourcentage maximum de votre capital à risquer par position :"""

        keyboard = [
            [InlineKeyboardButton("1%", callback_data="set_risk_1"), InlineKeyboardButton("2%", callback_data="set_risk_2")],
            [InlineKeyboardButton("3%", callback_data="set_risk_3"), InlineKeyboardButton("5%", callback_data="set_risk_5")],
            [InlineKeyboardButton("10%", callback_data="set_risk_10"), InlineKeyboardButton("15%", callback_data="set_risk_15")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_daily_loss_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection de la perte max quotidienne"""
        query = update.callback_query
        await query.answer()

        text = """📊 <b>PERTE MAX QUOTIDIENNE</b>

Choisissez le pourcentage maximum de perte acceptable par jour :"""

        keyboard = [
            [InlineKeyboardButton("5%", callback_data="set_daily_loss_5"), InlineKeyboardButton("10%", callback_data="set_daily_loss_10")],
            [InlineKeyboardButton("15%", callback_data="set_daily_loss_15"), InlineKeyboardButton("20%", callback_data="set_daily_loss_20")],
            [InlineKeyboardButton("25%", callback_data="set_daily_loss_25"), InlineKeyboardButton("30%", callback_data="set_daily_loss_30")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_leverage_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du levier maximum"""
        query = update.callback_query
        await query.answer()

        text = """📊 <b>LEVIER MAXIMUM</b>

Choisissez le levier maximum autorisé pour vos positions :"""

        keyboard = [
            [InlineKeyboardButton("×1", callback_data="set_leverage_1"), InlineKeyboardButton("×2", callback_data="set_leverage_2"), InlineKeyboardButton("×5", callback_data="set_leverage_5")],
            [InlineKeyboardButton("×10", callback_data="set_leverage_10"), InlineKeyboardButton("×20", callback_data="set_leverage_20"), InlineKeyboardButton("×50", callback_data="set_leverage_50")],
            [InlineKeyboardButton("×100", callback_data="set_leverage_100"), InlineKeyboardButton("×125", callback_data="set_leverage_125")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_sl_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection Stop Loss obligatoire"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)

        text = """📊 <b>STOP LOSS OBLIGATOIRE</b>

Voulez-vous rendre obligatoire la définition d'un Stop Loss pour chaque position ?

<b>Actuellement :</b> """ + ("✅ Activé" if settings['stop_loss_mandatory'] else "❌ Désactivé")

        keyboard = [
            [InlineKeyboardButton("✅ Activer", callback_data="set_sl_1")],
            [InlineKeyboardButton("❌ Désactiver", callback_data="set_sl_0")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_ai_aggro_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection de l'agressivité IA"""
        query = update.callback_query
        await query.answer()

        text = """🤖 <b>AGRESSIVITÉ DE L'IA</b>

Définissez le niveau de prise de risque dans les recommandations :

• <b>Conservateur</b> : Privilégie la sécurité
• <b>Modéré</b> : Équilibre risque/rendement
• <b>Agressif</b> : Privilégie les opportunités
• <b>Très Agressif</b> : Maximum d'opportunités"""

        keyboard = [
            [InlineKeyboardButton("🛡️ Conservateur", callback_data="set_aggro_Conservateur")],
            [InlineKeyboardButton("⚖️ Modéré", callback_data="set_aggro_Modéré")],
            [InlineKeyboardButton("⚡ Agressif", callback_data="set_aggro_Agressif")],
            [InlineKeyboardButton("🔥 Très Agressif", callback_data="set_aggro_Très Agressif")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_ai")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_ai_detail_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du niveau de détail"""
        query = update.callback_query
        await query.answer()

        text = """🤖 <b>NIVEAU DE DÉTAIL</b>

Choisissez la quantité d'informations dans les analyses :

• <b>Minimal</b> : Essentiel uniquement
• <b>Standard</b> : Informations principales
• <b>Détaillé</b> : Analyse approfondie
• <b>Complet</b> : Toutes les informations"""

        keyboard = [
            [InlineKeyboardButton("📋 Minimal", callback_data="set_detail_Minimal")],
            [InlineKeyboardButton("📊 Standard", callback_data="set_detail_Standard")],
            [InlineKeyboardButton("📈 Détaillé", callback_data="set_detail_Détaillé")],
            [InlineKeyboardButton("📚 Complet", callback_data="set_detail_Complet")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_ai")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    # ============ HANDLERS DE MODIFICATION ============

    async def update_setting(self, update: Update, context: ContextTypes.DEFAULT_TYPE, setting_name: str, value, redirect_to: str):
        """Met à jour un paramètre et redirige"""
        query = update.callback_query
        user_id = query.from_user.id

        # Mise à jour dans la base de données
        kwargs = {setting_name: value}
        await db_manager.update_user_settings(user_id, **kwargs)

        await query.answer("✅ Paramètre mis à jour", show_alert=False)

        # Redirection vers le menu approprié
        if redirect_to == "trading":
            await self.show_trading_settings(update, context)
        elif redirect_to == "ai":
            await self.show_ai_settings(update, context)
        elif redirect_to == "ui":
            await self.show_ui_settings(update, context)

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks"""
        query = update.callback_query
        data = query.data

        # Menus principaux
        if data == "settings_main":
            await self.show_settings(update, context)

        elif data == "settings_trading":
            await self.show_trading_settings(update, context)

        elif data == "settings_notif":
            await self.show_notification_settings(update, context)

        elif data == "settings_notif_toggle":
            await self.toggle_notifications(update, context)

        elif data == "settings_notif_daily":
            await self.show_daily_summary_menu(update, context)

        elif data == "settings_notif_time":
            await self.show_summary_time_menu(update, context)

        elif data == "settings_ai":
            await self.show_ai_settings(update, context)

        elif data == "settings_ui":
            await self.show_ui_settings(update, context)

        # ===== TRADING SETTINGS =====
        elif data == "settings_trading_edit":
            # Menu général des paramètres trading
            text = """📊 <b>MODIFIER PARAMÈTRES TRADING</b>

Que souhaitez-vous modifier ?"""
            keyboard = [
                [InlineKeyboardButton("📝 Style de trading", callback_data="settings_trading_style")],
                [InlineKeyboardButton("💰 Risque par position", callback_data="settings_trading_risk")],
                [InlineKeyboardButton("📉 Perte max quotidienne", callback_data="settings_trading_daily_loss")],
                [InlineKeyboardButton("⚡ Levier maximum", callback_data="settings_trading_leverage")],
                [InlineKeyboardButton("🛡️ Stop Loss obligatoire", callback_data="settings_trading_sl")],
                [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await query.answer()
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

        elif data == "settings_trading_style":
            await self.show_trading_style_menu(update, context)
        elif data == "settings_trading_risk":
            await self.show_risk_menu(update, context)
        elif data == "settings_trading_daily_loss":
            await self.show_daily_loss_menu(update, context)
        elif data == "settings_trading_leverage":
            await self.show_leverage_menu(update, context)
        elif data == "settings_trading_sl":
            await self.show_sl_menu(update, context)

        # Mise à jour des valeurs trading
        elif data.startswith("set_style_"):
            style = data.replace("set_style_", "")
            await self.update_setting(update, context, "trading_style", style, "trading")

        elif data.startswith("set_risk_"):
            risk = int(data.replace("set_risk_", ""))
            await self.update_setting(update, context, "risk_per_position", risk, "trading")

        elif data.startswith("set_daily_loss_"):
            loss = int(data.replace("set_daily_loss_", ""))
            await self.update_setting(update, context, "max_daily_loss", loss, "trading")

        elif data.startswith("set_leverage_"):
            leverage = int(data.replace("set_leverage_", ""))
            await self.update_setting(update, context, "max_leverage", leverage, "trading")

        elif data.startswith("set_sl_"):
            sl = int(data.replace("set_sl_", ""))
            await self.update_setting(update, context, "stop_loss_mandatory", sl, "trading")

        # ===== AI SETTINGS =====
        elif data == "settings_ai_aggro":
            await self.show_ai_aggro_menu(update, context)
        elif data == "settings_ai_detail":
            await self.show_ai_detail_menu(update, context)

        elif data.startswith("set_aggro_"):
            aggro = data.replace("set_aggro_", "")
            await self.update_setting(update, context, "ai_aggressiveness", aggro, "ai")

        elif data.startswith("set_detail_"):
            detail = data.replace("set_detail_", "")
            await self.update_setting(update, context, "detail_level", detail, "ai")

        # ===== NOTIFICATION SETTINGS =====
        elif data.startswith("set_daily_summary_"):
            value = int(data.replace("set_daily_summary_", ""))
            user_id = query.from_user.id
            await db_manager.update_user_settings(user_id, notif_daily_summary=value)
            await query.answer("✅ Résumé quotidien " + ("activé" if value else "désactivé"), show_alert=False)
            await self.show_notification_settings(update, context)

        elif data.startswith("set_time_"):
            time = data.replace("set_time_", "")
            user_id = query.from_user.id
            await db_manager.update_user_settings(user_id, summary_time=time)
            await query.answer(f"✅ Heure mise à jour : {time}", show_alert=False)
            await self.show_notification_settings(update, context)

        # ===== UI SETTINGS =====
        elif data == "settings_ui_theme":
            await self.show_theme_menu(update, context)

        elif data == "settings_ui_charts":
            await self.show_charts_menu(update, context)

        elif data.startswith("set_theme_"):
            theme = data.replace("set_theme_", "")
            await query.answer(f"✅ Thème {theme} sélectionné", show_alert=False)
            await self.show_ui_settings(update, context)

        elif data.startswith("set_chart_"):
            chart = data.replace("set_chart_", "")
            await query.answer(f"✅ Graphiques en {chart} sélectionnés", show_alert=False)
            await self.show_ui_settings(update, context)
