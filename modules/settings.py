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

        # Mapping des thèmes
        theme_labels = {
            'dark': '🌙 Sombre',
            'light': '☀️ Clair',
            'auto': '🔄 Auto'
        }

        # Mapping des types de graphiques
        chart_labels = {
            'candlestick': '🕯️ Candlesticks',
            'line': '📈 Lignes',
            'bar': '📊 Barres'
        }

        theme = settings.get('theme', 'dark')
        chart_type = settings.get('chart_type', 'candlestick')

        text = f"""🎨 <b>PARAMÈTRES INTERFACE</b>

<b>Thème:</b> {theme_labels.get(theme, theme)}
<b>Emojis:</b> ✅ Activés
<b>Graphiques:</b> {chart_labels.get(chart_type, chart_type)}

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

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('trading_style', 'Day Trading')

        text = f"""📊 <b>STYLE DE TRADING</b>

Choisissez votre style de trading préféré. Ce paramètre influence les recommandations de l'IA et les analyses proposées.

<b>Actuellement :</b> {current}

<b>⚡ Scalping</b> : Positions très courtes (secondes à minutes)
<b>📈 Day Trading</b> : Positions intraday (quelques heures)
<b>📊 Swing Trading</b> : Positions de plusieurs jours
<b>📉 Position Trading</b> : Positions long terme (semaines/mois)"""

        styles = {
            'Scalping': '⚡ Scalping',
            'Day Trading': '📈 Day Trading',
            'Swing Trading': '📊 Swing Trading',
            'Position Trading': '📉 Position Trading'
        }

        keyboard = []
        for key, label in styles.items():
            marker = " ✓" if key == current else ""
            keyboard.append([InlineKeyboardButton(f"{label}{marker}", callback_data=f"set_style_{key}")])
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_risk_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du risque par position"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('risk_per_position', 2)

        text = f"""💰 <b>RISQUE PAR POSITION</b>

Définit le pourcentage maximum de votre capital à risquer sur une seule position.

<b>Actuellement :</b> {current}%

<b>Recommandations :</b>
• 1-2% : Très prudent (débutants)
• 3-5% : Équilibré (recommandé)
• 10-15% : Agressif (expérimentés uniquement)

⚠️ Plus le risque est élevé, plus les gains et pertes potentiels sont importants."""

        risks = [1, 2, 3, 5, 10, 15]
        keyboard = []
        row = []
        for risk in risks:
            marker = " ✓" if risk == current else ""
            row.append(InlineKeyboardButton(f"{risk}%{marker}", callback_data=f"set_risk_{risk}"))
            if len(row) == 2:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_daily_loss_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection de la perte max quotidienne"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('max_daily_loss', 10)

        text = f"""📉 <b>PERTE MAX QUOTIDIENNE</b>

Limite de perte quotidienne. Si cette limite est atteinte, le bot cessera de trader pour la journée.

<b>Actuellement :</b> {current}%

<b>Protection du capital :</b>
• 5-10% : Protection stricte (recommandé)
• 15-20% : Tolérance modérée
• 25-30% : Haute tolérance

🛡️ Cette limite protège votre capital contre les mauvaises journées de trading."""

        losses = [5, 10, 15, 20, 25, 30]
        keyboard = []
        row = []
        for loss in losses:
            marker = " ✓" if loss == current else ""
            row.append(InlineKeyboardButton(f"{loss}%{marker}", callback_data=f"set_daily_loss_{loss}"))
            if len(row) == 2:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_leverage_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du levier maximum"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('max_leverage', 10)

        text = f"""⚡ <b>LEVIER MAXIMUM</b>

Le levier multiplie votre exposition au marché. Plus le levier est élevé, plus les gains et pertes sont amplifiés.

<b>Actuellement :</b> ×{current}

<b>Niveaux de risque :</b>
• ×1-2 : Sans levier / Très sécurisé
• ×5-10 : Modéré (recommandé)
• ×20-50 : Élevé (trader expérimentés)
• ×100-125 : Extrême (très risqué)

⚠️ ATTENTION : Un levier élevé peut liquider rapidement votre position en cas de mouvement défavorable."""

        leverages = [1, 2, 5, 10, 20, 50, 100, 125]
        keyboard = []
        row = []
        for lev in leverages:
            marker = " ✓" if lev == current else ""
            row.append(InlineKeyboardButton(f"×{lev}{marker}", callback_data=f"set_leverage_{lev}"))
            if len(row) == 3:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_sl_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection Stop Loss obligatoire"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('stop_loss_mandatory', 1)

        text = f"""🛡️ <b>STOP LOSS OBLIGATOIRE</b>

Le Stop Loss est un niveau de prix qui clôture automatiquement votre position en cas de perte, limitant ainsi vos pertes.

<b>Actuellement :</b> {("✅ Activé" if current else "❌ Désactivé")}

<b>Si activé :</b>
• Vous devrez définir un Stop Loss pour chaque position
• Protection automatique contre les pertes excessives
• Discipline de trading renforcée

<b>Si désactivé :</b>
• Liberté totale (risqué)
• Nécessite une surveillance constante

💡 <b>Recommandation :</b> Activé (surtout pour les débutants)"""

        keyboard = [
            [InlineKeyboardButton("✅ Activer (Recommandé)" if not current else "✅ Activer ✓", callback_data="set_sl_1")],
            [InlineKeyboardButton("❌ Désactiver" if current else "❌ Désactiver ✓", callback_data="set_sl_0")],
            [InlineKeyboardButton(BTN_BACK, callback_data="settings_trading")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_ai_aggro_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection de l'agressivité IA"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('ai_aggressiveness', 'balanced')

        text = f"""🤖 <b>AGRESSIVITÉ DE L'IA</b>

Définissez le niveau de prise de risque dans les recommandations de l'IA.

<b>Actuellement :</b> {current}

<b>🛡️ Conservateur</b> : Privilégie la sécurité
• Seuil de score élevé (80+)
• Opportunités rares mais sûres
• Idéal pour capital limité

<b>⚖️ Modéré</b> : Équilibre risque/rendement
• Seuil standard (70+)
• Bon compromis (recommandé)

<b>⚡ Agressif</b> : Privilégie les opportunités
• Seuil abaissé (60+)
• Plus d'alertes, plus de risque

<b>🔥 Très Agressif</b> : Maximum d'opportunités
• Seuil bas (50+)
• Trading intensif"""

        aggros = {
            'Conservateur': '🛡️ Conservateur',
            'Modéré': '⚖️ Modéré',
            'Agressif': '⚡ Agressif',
            'Très Agressif': '🔥 Très Agressif'
        }

        keyboard = []
        for key, label in aggros.items():
            marker = " ✓" if key == current else ""
            keyboard.append([InlineKeyboardButton(f"{label}{marker}", callback_data=f"set_aggro_{key}")])
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="settings_ai")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_ai_detail_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Menu de sélection du niveau de détail"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        settings = await db_manager.get_user_settings(user_id)
        current = settings.get('detail_level', 'normal')

        text = f"""📊 <b>NIVEAU DE DÉTAIL</b>

Choisissez la quantité d'informations dans les analyses de l'IA.

<b>Actuellement :</b> {current}

<b>📋 Minimal</b> : Essentiel uniquement
• Score + Direction + Prix
• Lecture rapide (30 sec)

<b>📊 Standard</b> : Informations principales
• Indicateurs clés + Tendance
• Lecture moyenne (1-2 min)

<b>📈 Détaillé</b> : Analyse approfondie
• Tous indicateurs + Contexte
• Lecture complète (3-5 min)

<b>📚 Complet</b> : Maximum d'informations
• Analyse exhaustive + Graphiques
• Pour traders expérimentés (5-10 min)"""

        details = {
            'Minimal': '📋 Minimal',
            'Standard': '📊 Standard',
            'Détaillé': '📈 Détaillé',
            'Complet': '📚 Complet'
        }

        keyboard = []
        for key, label in details.items():
            marker = " ✓" if key == current else ""
            keyboard.append([InlineKeyboardButton(f"{label}{marker}", callback_data=f"set_detail_{key}")])
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="settings_ai")])

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
            user_id = query.from_user.id
            await db_manager.update_user_settings(user_id, theme=theme)
            await query.answer(f"✅ Thème {theme} sélectionné", show_alert=False)
            await self.show_ui_settings(update, context)

        elif data.startswith("set_chart_"):
            chart = data.replace("set_chart_", "")
            user_id = query.from_user.id
            await db_manager.update_user_settings(user_id, chart_type=chart)
            await query.answer(f"✅ Graphiques en {chart} sélectionnés", show_alert=False)
            await self.show_ui_settings(update, context)
