"""
Module Features - Toutes les nouvelles fonctionnalites
Alertes, Screener, Quiz, Leaderboard, Graphiques avances, etc.
"""
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, CommandHandler

from database.manager import db_manager
from services.alerts_service import alerts_service
from services.screener_service import screener_service
from services.social_service import social_service
from services.advanced_charts import advanced_charts_service
from services.morning_service import morning_service
from utils.helpers import format_price
from utils.asset_names import get_asset_display_name


class FeaturesModule:
    """Module de fonctionnalites avancees"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        # Commandes
        self.app.add_handler(CommandHandler("alerts", self.cmd_alerts))
        self.app.add_handler(CommandHandler("watchlist", self.cmd_watchlist))
        self.app.add_handler(CommandHandler("screener", self.cmd_screener))
        self.app.add_handler(CommandHandler("backtest", self.cmd_backtest))
        self.app.add_handler(CommandHandler("leaderboard", self.cmd_leaderboard))
        self.app.add_handler(CommandHandler("badges", self.cmd_badges))
        self.app.add_handler(CommandHandler("quiz", self.cmd_quiz))
        self.app.add_handler(CommandHandler("challenge", self.cmd_challenge))
        self.app.add_handler(CommandHandler("compare", self.cmd_compare))
        self.app.add_handler(CommandHandler("heatmap", self.cmd_heatmap))
        self.app.add_handler(CommandHandler("feargreed", self.cmd_feargreed))
        self.app.add_handler(CommandHandler("export", self.cmd_export))
        self.app.add_handler(CommandHandler("templates", self.cmd_templates))
        self.app.add_handler(CommandHandler("share", self.cmd_share))
        # Nouvelles commandes v2.0
        self.app.add_handler(CommandHandler("targets", self.cmd_targets))
        self.app.add_handler(CommandHandler("calendar", self.cmd_calendar))

        # Callbacks
        self.app.add_handler(CallbackQueryHandler(
            self.handle_callback,
            pattern="^(feat_|alert_|quiz_|lead_|badge_|templ_|export_)"
        ))

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gere les callbacks"""
        query = update.callback_query
        await query.answer()
        data = query.data

        if data.startswith("alert_"):
            await self._handle_alert_callback(update, context, data)
        elif data.startswith("quiz_"):
            await self._handle_quiz_callback(update, context, data)
        elif data.startswith("lead_"):
            await self._handle_leaderboard_callback(update, context, data)
        elif data.startswith("templ_"):
            await self._handle_template_callback(update, context, data)
        elif data.startswith("export_"):
            await self._handle_export_callback(update, context, data)
        elif data.startswith("feat_"):
            await self._handle_feature_callback(update, context, data)

    # ===== ALERTES DE PRIX =====

    async def cmd_alerts(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /alerts - Gestion des alertes de prix"""
        user_id = update.effective_user.id
        alerts = await db_manager.get_user_price_alerts(user_id)

        text = "🔔 MES ALERTES DE PRIX\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        if alerts:
            for i, alert in enumerate(alerts[:10], 1):
                cond = ">" if alert['condition'] == 'above' else "<"
                text += f"{i}. {alert['asset_symbol']} {cond} ${alert['target_price']:,.2f}\n"
            text += f"\n📊 Total: {len(alerts)} alerte(s) active(s)"
        else:
            text += "Aucune alerte configuree.\n\n"
            text += "💡 Pour creer une alerte:\n"
            text += "/alerts AAPL above 200\n"
            text += "/alerts BTC-USD below 50000"

        # Verifier si une nouvelle alerte est demandee
        if context.args and len(context.args) >= 3:
            symbol = context.args[0].upper()
            condition = context.args[1].lower()
            try:
                target = float(context.args[2])
                if condition in ['above', 'below']:
                    result = await alerts_service.create_alert(user_id, symbol, 'AUTO', condition, target)
                    if result['success']:
                        text = f"✅ Alerte creee!\n\n{symbol} {condition} ${target:,.2f}"
                    else:
                        text = f"❌ Erreur: {result['error']}"
            except ValueError:
                text = "❌ Prix invalide. Utilisez un nombre."

        keyboard = [
            [InlineKeyboardButton("➕ Nouvelle alerte", callback_data="alert_new")],
            [InlineKeyboardButton("🗑️ Supprimer une alerte", callback_data="alert_delete")],
            [InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]
        ]

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

    async def _handle_alert_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks d'alertes"""
        query = update.callback_query
        user_id = update.effective_user.id

        if data == "alert_new":
            text = (
                "📝 CREER UNE ALERTE\n\n"
                "Utilisez la commande:\n"
                "/alerts SYMBOLE above/below PRIX\n\n"
                "Exemples:\n"
                "• /alerts AAPL above 200\n"
                "• /alerts BTC-USD below 50000\n"
                "• /alerts TSLA below 150"
            )
            await query.edit_message_text(text)

        elif data == "alert_delete":
            alerts = await db_manager.get_user_price_alerts(user_id)
            if not alerts:
                await query.edit_message_text("Aucune alerte a supprimer.")
                return

            keyboard = []
            for alert in alerts[:10]:
                cond = ">" if alert['condition'] == 'above' else "<"
                keyboard.append([InlineKeyboardButton(
                    f"❌ {alert['asset_symbol']} {cond} ${alert['target_price']:,.2f}",
                    callback_data=f"alert_del_{alert['id']}"
                )])
            keyboard.append([InlineKeyboardButton("🔙 Retour", callback_data="alert_back")])

            await query.edit_message_text(
                "Selectionnez l'alerte a supprimer:",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )

        elif data.startswith("alert_del_"):
            alert_id = int(data.replace("alert_del_", ""))
            await db_manager.delete_price_alert(alert_id, user_id)
            await query.edit_message_text("✅ Alerte supprimee!")

    # ===== WATCHLIST INTELLIGENTE =====

    async def cmd_watchlist(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /watchlist - Watchlist intelligente"""
        user_id = update.effective_user.id
        watchlist = await db_manager.get_smart_watchlist(user_id)

        text = "👁️ WATCHLIST INTELLIGENTE\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        if watchlist:
            for item in watchlist:
                text += f"• {item['asset_symbol']} (seuil: {item['alert_threshold']}%)\n"
        else:
            text += "Votre watchlist est vide.\n\n"
            text += "💡 Ajoutez un actif:\n"
            text += "/watchlist add AAPL 5\n"
            text += "(Alerte si mouvement > 5%)"

        # Ajouter a la watchlist
        if context.args and len(context.args) >= 2:
            action = context.args[0].lower()
            symbol = context.args[1].upper()

            if action == 'add':
                threshold = float(context.args[2]) if len(context.args) > 2 else 5.0
                result = await alerts_service.add_to_watchlist(user_id, symbol, 'AUTO', threshold)
                if result['success']:
                    text = f"✅ {symbol} ajoute a la watchlist (seuil: {threshold}%)"
                else:
                    text = f"❌ Erreur: {result['error']}"

            elif action == 'remove':
                await db_manager.remove_from_smart_watchlist(user_id, symbol)
                text = f"✅ {symbol} retire de la watchlist"

        await update.message.reply_text(text)

    # ===== SCREENER =====

    async def cmd_screener(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /screener - Meilleurs setups du jour"""
        await update.message.reply_text("🔍 Analyse en cours...")

        setups = await db_manager.get_best_setups(limit=10)

        text = "📊 MEILLEURS SETUPS DU JOUR\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        if setups:
            for i, setup in enumerate(setups, 1):
                emoji = "🟢" if setup['direction'] == 'LONG' else "🔴"
                text += f"{i}. {emoji} {setup['asset_symbol']}\n"
                text += f"   Score: {setup['score']}/100 | {setup['direction']}\n"
                text += f"   Type: {setup.get('opportunity_type', 'N/A')}\n\n"
        else:
            text += "Aucun setup detecte aujourd'hui.\n"
            text += "Le screener s'execute automatiquement toutes les heures."

        await update.message.reply_text(text)

    # ===== BACKTESTING =====

    async def cmd_backtest(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /backtest - Backtesting simplifie"""
        if not context.args or len(context.args) < 2:
            text = (
                "📈 BACKTESTING SIMPLIFIE\n\n"
                "Usage: /backtest SYMBOLE JOURS [MONTANT] [LEVIER] [DIRECTION]\n\n"
                "Exemples:\n"
                "• /backtest AAPL 30\n"
                "• /backtest BTC-USD 90 1000 2 LONG\n"
                "• /backtest TSLA 180 500 5 SHORT"
            )
            await update.message.reply_text(text)
            return

        symbol = context.args[0].upper()
        days = int(context.args[1])
        amount = float(context.args[2]) if len(context.args) > 2 else 1000
        leverage = int(context.args[3]) if len(context.args) > 3 else 1
        direction = context.args[4].upper() if len(context.args) > 4 else 'LONG'

        await update.message.reply_text("⏳ Calcul en cours...")

        result = await screener_service.backtest_simple(symbol, days, amount, leverage, direction)

        if not result['success']:
            await update.message.reply_text(f"❌ Erreur: {result['error']}")
            return

        pnl_emoji = "🟢" if result['pnl_value'] >= 0 else "🔴"

        text = f"📊 BACKTEST: {symbol}\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"
        text += f"📅 Periode: {days} jours\n"
        text += f"💰 Montant: ${amount:,.2f}\n"
        text += f"⚡ Levier: x{leverage}\n"
        text += f"📍 Direction: {direction}\n\n"
        text += f"💵 Prix d'entree: ${result['entry_price']:,.2f}\n"
        text += f"💵 Prix actuel: ${result['current_price']:,.2f}\n\n"
        text += f"{pnl_emoji} PnL: ${result['pnl_value']:+,.2f} ({result['pnl_percent']:+.2f}%)\n"
        text += f"💼 Valeur finale: ${result['final_value']:,.2f}\n\n"
        text += f"📉 Max Drawdown: {result['max_drawdown']:.2f}%\n"

        if result['would_be_liquidated']:
            text += "\n⚠️ ATTENTION: Cette position aurait ete liquidee!"

        await update.message.reply_text(text)

    # ===== LEADERBOARD =====

    async def cmd_leaderboard(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /leaderboard - Classement"""
        user_id = update.effective_user.id
        leaders = await social_service.get_leaderboard(limit=10)
        user_rank = await social_service.get_user_rank(user_id)

        text = "🏆 LEADERBOARD\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        medals = ['🥇', '🥈', '🥉']
        for i, leader in enumerate(leaders):
            medal = medals[i] if i < 3 else f"{i+1}."
            name = leader.get('display_name', 'Anonyme')
            pnl = leader.get('total_pnl', 0)
            text += f"{medal} {name}: ${pnl:+,.2f}\n"

        if user_rank and user_rank.get('opt_in'):
            text += f"\n📍 Votre position: #{user_rank.get('rank_weekly', '?')}"
        else:
            text += "\n\n💡 Rejoignez le classement avec /leaderboard join"

        keyboard = [
            [InlineKeyboardButton("📊 Hebdomadaire", callback_data="lead_weekly"),
             InlineKeyboardButton("📅 Mensuel", callback_data="lead_monthly")],
            [InlineKeyboardButton("✅ Rejoindre", callback_data="lead_join"),
             InlineKeyboardButton("❌ Quitter", callback_data="lead_leave")],
            [InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]
        ]

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

    async def _handle_leaderboard_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks du leaderboard"""
        query = update.callback_query
        user_id = update.effective_user.id

        if data == "lead_join":
            result = await social_service.opt_in_leaderboard(user_id)
            await query.edit_message_text(
                f"✅ Vous avez rejoint le classement!\n"
                f"Pseudo: {result['display_name']}"
            )
        elif data == "lead_leave":
            await social_service.opt_out_leaderboard(user_id)
            await query.edit_message_text("✅ Vous avez quitte le classement.")

    # ===== BADGES =====

    async def cmd_badges(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /badges - Mes badges"""
        user_id = update.effective_user.id
        badges = await social_service.get_user_badges(user_id)
        all_badges = await db_manager.get_all_badges()

        text = "🏅 MES BADGES\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        if badges:
            text += "✅ Badges obtenus:\n"
            for badge in badges:
                text += f"{badge['emoji']} {badge['name']}\n"
            text += f"\n📊 {len(badges)}/{len(all_badges)} badges"
        else:
            text += "Aucun badge pour le moment.\n\n"
            text += "💡 Tradez pour debloquer des badges!"

        text += "\n\n🎯 Prochain badge a debloquer:\n"
        earned_codes = [b['code'] for b in badges]
        for badge in all_badges:
            if badge['code'] not in earned_codes:
                text += f"{badge['emoji']} {badge['name']}: {badge['description']}"
                break

        await update.message.reply_text(text)

    # ===== QUIZ =====

    async def cmd_quiz(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /quiz - Quiz trading quotidien"""
        user_id = update.effective_user.id
        question = await social_service.get_daily_quiz(user_id)

        if not question:
            stats = await social_service.get_quiz_stats(user_id)
            text = (
                "📚 QUIZ TRADING\n\n"
                "Vous avez deja repondu au quiz aujourd'hui!\n\n"
                f"📊 Vos stats:\n"
                f"• Questions: {stats['total_questions']}\n"
                f"• Bonnes reponses: {stats['correct_answers']}\n"
                f"• Taux de reussite: {stats['accuracy']:.1f}%\n"
                f"• Points: {stats['total_points']}\n"
                f"• Meilleure serie: {stats['best_streak']}\n\n"
                "Revenez demain pour un nouveau quiz!"
            )
            await update.message.reply_text(text)
            return

        options = json.loads(question['options'])

        text = f"📚 QUIZ TRADING\n"
        text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
        text += f"❓ {question['question']}\n\n"

        keyboard = []
        for i, option in enumerate(options):
            keyboard.append([InlineKeyboardButton(
                f"{chr(65+i)}. {option}",
                callback_data=f"quiz_answer_{question['id']}_{i}"
            )])

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

    async def _handle_quiz_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks du quiz"""
        query = update.callback_query
        user_id = update.effective_user.id

        if data.startswith("quiz_answer_"):
            parts = data.split("_")
            question_id = int(parts[2])
            answer = int(parts[3])

            result = await social_service.answer_quiz(user_id, question_id, answer)

            if result['is_correct']:
                text = f"✅ BONNE REPONSE!\n\n"
            else:
                text = f"❌ Mauvaise reponse.\n"
                text += f"La bonne reponse etait: {result['correct_option']}\n\n"

            text += f"💡 {result['explanation']}\n\n"
            text += f"🏆 Points gagnes: {result['points_earned']}"

            if result['new_badges']:
                text += "\n\n🏅 Nouveau badge debloque!"
                for badge in result['new_badges']:
                    text += f"\n{badge['emoji']} {badge['name']}"

            await query.edit_message_text(text)

    # ===== CHALLENGE =====

    async def cmd_challenge(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /challenge - Challenge hebdomadaire"""
        challenge = await social_service.get_active_challenge()

        if not challenge:
            await update.message.reply_text("Aucun challenge actif pour le moment.")
            return

        leaderboard = await social_service.get_challenge_leaderboard(challenge['id'])

        text = f"🎯 CHALLENGE DE LA SEMAINE\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"
        text += f"📋 {challenge['description']}\n"
        text += f"🎁 Prix: {challenge['prize_description']}\n"
        text += f"📅 Fin: {challenge['week_end']}\n\n"

        text += "🏆 Classement:\n"
        for i, p in enumerate(leaderboard[:5], 1):
            name = p.get('display_name', 'Anonyme')
            text += f"{i}. {name}: {p['score']:.2f}\n"

        keyboard = [
            [InlineKeyboardButton("✅ Participer", callback_data="feat_join_challenge")],
            [InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]
        ]

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

    # ===== GRAPHIQUES AVANCES =====

    async def cmd_compare(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /compare - Comparer des actifs"""
        if not context.args or len(context.args) < 2:
            text = (
                "📊 COMPARAISON D'ACTIFS\n\n"
                "Usage: /compare SYMBOLE1 SYMBOLE2 [SYMBOLE3...]\n\n"
                "Exemples:\n"
                "• /compare AAPL MSFT GOOGL\n"
                "• /compare BTC-USD ETH-USD\n"
                "• /compare SPY QQQ IWM"
            )
            await update.message.reply_text(text)
            return

        symbols = [s.upper() for s in context.args[:6]]
        await update.message.reply_text(f"📊 Generation du graphique de comparaison...")

        chart_buf, perfs = await advanced_charts_service.compare_assets(symbols)

        await update.message.reply_photo(
            photo=chart_buf,
            caption=f"Comparaison: {', '.join(symbols)}"
        )

    async def cmd_heatmap(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /heatmap - Heatmap sectorielle"""
        await update.message.reply_text("🗺️ Generation de la heatmap...")

        chart_buf, data = await advanced_charts_service.sector_heatmap()

        await update.message.reply_photo(
            photo=chart_buf,
            caption="Heatmap sectorielle - Performance 5 jours"
        )

    async def cmd_feargreed(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /feargreed - Fear & Greed Index"""
        await update.message.reply_text("😱 Calcul de l'indice Fear & Greed...")

        chart_buf, data = await advanced_charts_service.fear_greed_gauge()

        text = f"Fear & Greed Index: {int(data['score'])}\n"
        text += f"Sentiment: {data['sentiment']}"

        await update.message.reply_photo(photo=chart_buf, caption=text)

    # ===== EXPORT =====

    async def cmd_export(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /export - Exporter l'historique"""
        text = (
            "📤 EXPORT HISTORIQUE\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "Choisissez le format d'export:"
        )

        keyboard = [
            [InlineKeyboardButton("📄 CSV (30 jours)", callback_data="export_csv_30")],
            [InlineKeyboardButton("📄 CSV (90 jours)", callback_data="export_csv_90")],
            [InlineKeyboardButton("📕 PDF (30 jours)", callback_data="export_pdf_30")],
            [InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]
        ]

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

    async def _handle_export_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks d'export"""
        query = update.callback_query
        user_id = update.effective_user.id

        try:
            parts = data.split("_")
            format_type = parts[1]
            days = int(parts[2])

            await query.edit_message_text("⏳ Génération en cours...")

            if format_type == "csv":
                buf = await morning_service.export_history_csv(user_id, days)
                if buf:
                    await query.message.reply_document(
                        document=buf,
                        filename=f"trading_history_{days}d.csv",
                        caption=f"📄 Historique des {days} derniers jours"
                    )
                    await query.edit_message_text("✅ Export CSV généré avec succès !")
                else:
                    await query.edit_message_text("❌ Aucune donnée à exporter pour cette période.")

            elif format_type == "pdf":
                buf = await morning_service.export_history_pdf(user_id, days)
                if buf:
                    await query.message.reply_document(
                        document=buf,
                        filename=f"trading_report_{days}d.pdf",
                        caption=f"📕 Rapport des {days} derniers jours"
                    )
                    await query.edit_message_text("✅ Export PDF généré avec succès !")
                else:
                    await query.edit_message_text(
                        "❌ Export PDF non disponible.\n\n"
                        "💡 Essayez l'export CSV ou vérifiez que vous avez des trades."
                    )
        except Exception as e:
            await query.edit_message_text(
                f"❌ Erreur lors de l'export.\n\n"
                f"💡 Vérifiez que vous avez des trades sur cette période."
            )

    # ===== TEMPLATES =====

    async def cmd_templates(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /templates - Templates de portefeuille"""
        templates = await db_manager.get_portfolio_templates()

        text = "💼 TEMPLATES DE PORTEFEUILLE\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        keyboard = []
        for t in templates:
            text += f"📁 {t['name']}\n"
            text += f"   {t['description']}\n\n"
            keyboard.append([InlineKeyboardButton(
                f"📊 {t['name']}",
                callback_data=f"templ_view_{t['id']}"
            )])

        keyboard.append([InlineKeyboardButton("🔙 Menu", callback_data="menu_main")])

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

    async def _handle_template_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks des templates"""
        query = update.callback_query

        if data.startswith("templ_view_"):
            template_id = int(data.replace("templ_view_", ""))
            template = await db_manager.get_template_by_id(template_id)

            if template:
                assets = json.loads(template['assets'])

                text = f"📁 {template['name']}\n"
                text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
                text += f"📝 {template['description']}\n\n"
                text += "📊 Composition:\n"

                for asset in assets:
                    name = get_asset_display_name(asset['symbol'])
                    display = f"{asset['symbol']} ({name})" if name != asset['symbol'] else asset['symbol']
                    text += f"• {display}: {asset['weight']}%\n"

                await query.edit_message_text(text)

    # ===== PARTAGE =====

    async def cmd_share(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /share - Partager une position"""
        if not context.args:
            text = (
                "📤 PARTAGER UNE POSITION\n\n"
                "Usage: /share CODE_POSITION\n\n"
                "Exemple: /share ABC12345"
            )
            await update.message.reply_text(text)
            return

        position_code = context.args[0].upper()
        position = await db_manager.get_position(position_code)

        if not position:
            await update.message.reply_text("❌ Position non trouvee.")
            return

        await update.message.reply_text("🎨 Generation de l'image...")

        card = await advanced_charts_service.generate_position_card(position)

        await update.message.reply_photo(
            photo=card,
            caption=f"📊 Position {position['asset_symbol']} | TDB Bot"
        )

    async def _handle_feature_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks generaux"""
        query = update.callback_query
        user_id = update.effective_user.id

        if data == "feat_join_challenge":
            result = await social_service.join_challenge(user_id)
            if result['success']:
                await query.edit_message_text("✅ Vous participez au challenge!")
            else:
                await query.edit_message_text(f"❌ {result['error']}")

    # ===== PRIX CIBLES =====

    async def cmd_targets(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /targets - Calcul des prix cibles IA"""
        if not context.args:
            text = (
                "🎯 PRIX CIBLES IA\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                "Calcule automatiquement Entry, SL et TP.\n\n"
                "Usage: /targets SYMBOLE\n\n"
                "Exemples:\n"
                "• /targets AAPL\n"
                "• /targets BTC-USD\n"
                "• /targets TSLA"
            )
            await update.message.reply_text(text)
            return

        symbol = context.args[0].upper()
        await update.message.reply_text(f"🎯 Calcul des prix cibles pour {symbol}...")

        try:
            from ai.analyzer import analyzer
            import yfinance as yf

            # Récupérer les données
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="3mo", interval="1d")

            if data.empty:
                await update.message.reply_text(f"❌ Symbole {symbol} non trouvé.")
                return

            # Analyse rapide pour déterminer la direction
            analysis = await analyzer.analyze_asset(symbol, 'AUTO', fetch_news=False)

            if not analysis:
                await update.message.reply_text(f"❌ Impossible d'analyser {symbol}.")
                return

            # Calculer les prix cibles
            current_price = analysis['current_price']
            support = analysis['support']
            resistance = analysis['resistance']
            atr = analysis['atr']
            direction = analysis['direction']

            targets = analyzer.calculate_price_targets(
                data, direction, current_price, support, resistance, atr
            )

            # Formater le message
            text = analyzer.format_price_targets_message(targets, symbol)

            # Ajouter contexte
            text += "\n━━━━━━━━━━━━━━━━━━━━\n"
            text += f"📊 Score: {analysis['score']}/100\n"
            text += f"📈 Tendance: {analysis['trend']}\n"
            text += f"🎯 Support: ${support:,.2f}\n"
            text += f"🎯 Résistance: ${resistance:,.2f}"

            await update.message.reply_text(text, parse_mode='Markdown')

        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")

    # ===== CALENDRIER ÉCONOMIQUE =====

    async def cmd_calendar(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /calendar - Calendrier économique"""
        from services.economic_calendar import economic_calendar

        await update.message.reply_text("📅 Chargement du calendrier économique...")

        try:
            # Récupérer les événements
            days = int(context.args[0]) if context.args else 14
            events = await economic_calendar.get_upcoming_events(days_ahead=days)

            # Formater le message
            text = economic_calendar.format_calendar_message(events)

            # Vérifier le risque d'événement
            risk = await economic_calendar.check_event_risk()
            if risk['risk_level'] != 'NONE':
                text += f"\n\n{risk['recommendation']}"

            keyboard = [
                [InlineKeyboardButton("📊 Earnings Favoris", callback_data="menu_earnings")],
                [InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]
            ]

            await update.message.reply_text(
                text,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )

        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")


# Factory function
def create_features_module(application):
    return FeaturesModule(application)
