"""
Module Menu Principal - Hub central du bot TDB
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, CommandHandler
import config

class MenuModule:
    """Gère le menu principal du bot"""

    def __init__(self, application, market_module=None, wallet_module=None,
                 favorites_module=None, scan_module=None, settings_module=None,
                 ai_assistant_module=None, features_module=None):
        self.app = application
        self.market_module = market_module
        self.wallet_module = wallet_module
        self.favorites_module = favorites_module
        self.scan_module = scan_module
        self.settings_module = settings_module
        self.ai_assistant_module = ai_assistant_module
        self.features_module = features_module
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers du menu"""
        self.app.add_handler(CommandHandler("menu", self.show_menu))
        self.app.add_handler(CommandHandler("start", self.start))
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^menu_"))

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /start"""
        await update.message.reply_text(
            config.WELCOME_MESSAGE,
            parse_mode='Markdown'
        )
        await self.show_menu(update, context)

    async def show_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le menu principal"""
        keyboard = [
            [InlineKeyboardButton("📊 Marché", callback_data="menu_market"),
             InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet")],
            [InlineKeyboardButton("⭐ Favoris", callback_data="menu_favorites"),
             InlineKeyboardButton("🔔 Alertes", callback_data="menu_alerts")],
            [InlineKeyboardButton("🏆 Social", callback_data="menu_social"),
             InlineKeyboardButton("📈 Graphiques", callback_data="menu_charts")],
            [InlineKeyboardButton("🤖 Assistant IA", callback_data="menu_ai_assistant")],
            [InlineKeyboardButton("🔍 Scan Auto", callback_data="menu_scan"),
             InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        menu_text = """
🤖 **TDB - MENU PRINCIPAL**

📊 **Marché** - Cours et analyses
💼 **Wallet** - Paper trading
⭐ **Favoris** - Vos actifs suivis
🔔 **Alertes** - Prix, watchlist, screener
🏆 **Social** - Leaderboard, badges, quiz
📈 **Graphiques** - Heatmap, Fear&Greed
🤖 **Assistant IA** - Questions trading
"""

        if update.message:
            await update.message.reply_text(
                menu_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        elif update.callback_query:
            await update.callback_query.edit_message_text(
                menu_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )

    async def show_alerts_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Alertes & Outils"""
        keyboard = [
            [InlineKeyboardButton("🔔 Mes Alertes Prix", callback_data="menu_my_alerts")],
            [InlineKeyboardButton("👁️ Watchlist Intelligente", callback_data="menu_watchlist")],
            [InlineKeyboardButton("🔍 Screener du Jour", callback_data="menu_screener")],
            [InlineKeyboardButton("📊 Backtest", callback_data="menu_backtest")],
            [InlineKeyboardButton("📤 Export Historique", callback_data="menu_export")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
🔔 **ALERTES & OUTILS**

🔔 **Alertes Prix** - Notifications personnalisées
👁️ **Watchlist** - Suivi avec alertes mouvements
🔍 **Screener** - Meilleurs setups du jour
📊 **Backtest** - Simulation rétroactive
📤 **Export** - Télécharger vos données
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_social_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Social & Gamification"""
        keyboard = [
            [InlineKeyboardButton("🏆 Leaderboard", callback_data="menu_leaderboard")],
            [InlineKeyboardButton("🏅 Mes Badges", callback_data="menu_badges")],
            [InlineKeyboardButton("📚 Quiz du Jour", callback_data="menu_quiz")],
            [InlineKeyboardButton("🎯 Challenge", callback_data="menu_challenge")],
            [InlineKeyboardButton("💼 Templates Portefeuille", callback_data="menu_templates")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
🏆 **SOCIAL & GAMIFICATION**

🏆 **Leaderboard** - Classement traders
🏅 **Badges** - Vos achievements
📚 **Quiz** - Testez vos connaissances
🎯 **Challenge** - Défi de la semaine
💼 **Templates** - Portefeuilles types
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_charts_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Graphiques Avancés"""
        keyboard = [
            [InlineKeyboardButton("📊 Comparer Actifs", callback_data="menu_compare")],
            [InlineKeyboardButton("🗺️ Heatmap Secteurs", callback_data="menu_heatmap")],
            [InlineKeyboardButton("😱 Fear & Greed Index", callback_data="menu_feargreed")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
📈 **GRAPHIQUES AVANCES**

📊 **Comparer** - Superposer plusieurs actifs
🗺️ **Heatmap** - Vue sectorielle du marché
😱 **Fear & Greed** - Sentiment du marché
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks du menu"""
        query = update.callback_query
        await query.answer()

        data = query.data

        # Retour au menu
        if data == "menu_main":
            await self.show_menu(update, context)
            return

        # Sous-menus
        if data == "menu_alerts":
            await self.show_alerts_menu(update, context)
            return
        elif data == "menu_social":
            await self.show_social_menu(update, context)
            return
        elif data == "menu_charts":
            await self.show_charts_menu(update, context)
            return

        # Modules existants
        if data == "menu_market" and self.market_module:
            await self.market_module.show_markets(update, context)

        elif data == "menu_wallet" and self.wallet_module:
            await self.wallet_module.show_wallet(update, context)

        elif data == "menu_favorites" and self.favorites_module:
            await self.favorites_module.show_favorites(update, context)

        elif data == "menu_scan" and self.scan_module:
            await self.scan_module.show_scan_menu(update, context)

        elif data == "menu_settings" and self.settings_module:
            await self.settings_module.show_settings(update, context)

        elif data == "menu_ai_assistant" and self.ai_assistant_module:
            await self.ai_assistant_module.cmd_ai_assistant(update, context)

        # Nouvelles fonctionnalités - déléguer à features_module via callbacks dédiés
        elif data in ["menu_my_alerts", "menu_watchlist", "menu_screener",
                      "menu_backtest", "menu_export", "menu_leaderboard",
                      "menu_badges", "menu_quiz", "menu_challenge",
                      "menu_templates", "menu_compare", "menu_heatmap",
                      "menu_feargreed"]:
            # Rediriger vers le module features
            await self._handle_feature_callback(update, context, data)

    async def _handle_feature_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gère les callbacks des features via boutons"""
        from services.alerts_service import alerts_service
        from services.screener_service import screener_service
        from services.social_service import social_service
        from services.advanced_charts import advanced_charts_service
        from services.morning_service import morning_service
        from database.manager import db_manager
        import json

        query = update.callback_query
        user_id = update.effective_user.id

        if data == "menu_my_alerts":
            # Afficher les alertes
            alerts = await db_manager.get_user_price_alerts(user_id)
            text = "🔔 **MES ALERTES DE PRIX**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if alerts:
                for i, alert in enumerate(alerts[:10], 1):
                    cond = ">" if alert['condition'] == 'above' else "<"
                    text += f"{i}. {alert['asset_symbol']} {cond} ${alert['target_price']:,.2f}\n"
                text += f"\n📊 Total: {len(alerts)} alerte(s)"
            else:
                text += "Aucune alerte configurée.\n\n"
                text += "💡 Envoyez: `/alerts AAPL above 200`"

            keyboard = [
                [InlineKeyboardButton("➕ Créer (voir /alerts)", callback_data="menu_alerts_help")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_alerts_help":
            text = (
                "📝 **CRÉER UNE ALERTE**\n\n"
                "Envoyez une commande:\n"
                "`/alerts SYMBOLE above/below PRIX`\n\n"
                "Exemples:\n"
                "• `/alerts AAPL above 200`\n"
                "• `/alerts BTC-USD below 50000`\n"
                "• `/alerts TSLA below 150`"
            )
            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_my_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_watchlist":
            watchlist = await db_manager.get_smart_watchlist(user_id)
            text = "👁️ **WATCHLIST INTELLIGENTE**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if watchlist:
                for item in watchlist:
                    text += f"• {item['asset_symbol']} (seuil: {item['alert_threshold']}%)\n"
            else:
                text += "Votre watchlist est vide.\n\n"
                text += "💡 Envoyez: `/watchlist add AAPL 5`\n"
                text += "(Alerte si mouvement > 5%)"

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_screener":
            await query.edit_message_text("🔍 Analyse en cours...")
            setups = await db_manager.get_best_setups(limit=10)

            text = "📊 **MEILLEURS SETUPS DU JOUR**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if setups:
                for i, setup in enumerate(setups, 1):
                    emoji = "🟢" if setup['direction'] == 'LONG' else "🔴"
                    text += f"{i}. {emoji} {setup['asset_symbol']}\n"
                    text += f"   Score: {setup['score']}/100 | {setup['direction']}\n\n"
            else:
                text += "Aucun setup détecté aujourd'hui.\n"
                text += "Le screener s'exécute toutes les heures."

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_backtest":
            text = (
                "📈 **BACKTESTING SIMPLIFIE**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                "Simulez un trade passé!\n\n"
                "Envoyez:\n"
                "`/backtest SYMBOLE JOURS MONTANT LEVIER DIRECTION`\n\n"
                "Exemples:\n"
                "• `/backtest AAPL 30 1000 1 LONG`\n"
                "• `/backtest BTC-USD 90 500 2 LONG`\n"
                "• `/backtest TSLA 180 1000 5 SHORT`"
            )
            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_export":
            keyboard = [
                [InlineKeyboardButton("📄 CSV (30 jours)", callback_data="export_csv_30")],
                [InlineKeyboardButton("📄 CSV (90 jours)", callback_data="export_csv_90")],
                [InlineKeyboardButton("📕 PDF (30 jours)", callback_data="export_pdf_30")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]
            ]
            await query.edit_message_text(
                "📤 **EXPORT HISTORIQUE**\n\nChoisissez le format:",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )

        elif data == "menu_leaderboard":
            leaders = await social_service.get_leaderboard(limit=10)
            user_rank = await social_service.get_user_rank(user_id)

            text = "🏆 **LEADERBOARD**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            medals = ['🥇', '🥈', '🥉']
            for i, leader in enumerate(leaders):
                medal = medals[i] if i < 3 else f"{i+1}."
                name = leader.get('display_name', 'Anonyme')
                pnl = leader.get('total_pnl', 0)
                text += f"{medal} {name}: ${pnl:+,.2f}\n"

            if not leaders:
                text += "Aucun participant pour le moment.\n"

            if user_rank and user_rank.get('opt_in'):
                text += f"\n📍 Votre rang: #{user_rank.get('rank_weekly', '?')}"
            else:
                text += "\n\n💡 Rejoignez le classement!"

            keyboard = [
                [InlineKeyboardButton("✅ Rejoindre", callback_data="lead_join"),
                 InlineKeyboardButton("❌ Quitter", callback_data="lead_leave")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_social")]
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_badges":
            badges = await social_service.get_user_badges(user_id)
            all_badges = await db_manager.get_all_badges()

            text = "🏅 **MES BADGES**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if badges:
                for badge in badges:
                    text += f"{badge['emoji']} {badge['name']}\n"
                text += f"\n📊 {len(badges)}/{len(all_badges)} débloqués"
            else:
                text += "Aucun badge pour le moment.\n\n💡 Tradez pour débloquer des badges!"

            # Prochain badge
            earned_codes = [b['code'] for b in badges]
            for badge in all_badges:
                if badge['code'] not in earned_codes:
                    text += f"\n\n🎯 Prochain: {badge['emoji']} {badge['name']}\n{badge['description']}"
                    break

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_social")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_quiz":
            question = await social_service.get_daily_quiz(user_id)

            if not question:
                stats = await social_service.get_quiz_stats(user_id)
                text = (
                    "📚 **QUIZ TRADING**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                    "Vous avez déjà répondu aujourd'hui!\n\n"
                    f"📊 Vos stats:\n"
                    f"• Questions: {stats['total_questions']}\n"
                    f"• Bonnes réponses: {stats['correct_answers']}\n"
                    f"• Taux: {stats['accuracy']:.1f}%\n"
                    f"• Points: {stats['total_points']}\n\n"
                    "Revenez demain!"
                )
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_social")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            else:
                options = json.loads(question['options'])
                text = f"📚 **QUIZ TRADING**\n━━━━━━━━━━━━━━━━━━━━\n\n❓ {question['question']}\n"

                keyboard = []
                for i, option in enumerate(options):
                    keyboard.append([InlineKeyboardButton(
                        f"{chr(65+i)}. {option}",
                        callback_data=f"quiz_answer_{question['id']}_{i}"
                    )])
                keyboard.append([InlineKeyboardButton("🔙 Retour", callback_data="menu_social")])

                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_challenge":
            challenge = await social_service.get_active_challenge()

            if not challenge:
                text = "🎯 **CHALLENGE**\n\nAucun challenge actif pour le moment."
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_social")]]
            else:
                leaderboard = await social_service.get_challenge_leaderboard(challenge['id'])

                text = f"🎯 **CHALLENGE DE LA SEMAINE**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                text += f"📋 {challenge['description']}\n"
                text += f"🎁 Prix: {challenge['prize_description']}\n"
                text += f"📅 Fin: {challenge['week_end']}\n\n"

                if leaderboard:
                    text += "🏆 Top 5:\n"
                    for i, p in enumerate(leaderboard[:5], 1):
                        name = p.get('display_name', 'Anonyme')
                        text += f"{i}. {name}: {p['score']:.2f}\n"

                keyboard = [
                    [InlineKeyboardButton("✅ Participer", callback_data="feat_join_challenge")],
                    [InlineKeyboardButton("🔙 Retour", callback_data="menu_social")]
                ]

            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_templates":
            templates = await db_manager.get_portfolio_templates()

            text = "💼 **TEMPLATES PORTEFEUILLE**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            keyboard = []
            for t in templates:
                text += f"📁 **{t['name']}**\n   {t['description']}\n\n"
                keyboard.append([InlineKeyboardButton(
                    f"📊 {t['name']}",
                    callback_data=f"templ_view_{t['id']}"
                )])
            keyboard.append([InlineKeyboardButton("🔙 Retour", callback_data="menu_social")])

            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_compare":
            text = (
                "📊 **COMPARER DES ACTIFS**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                "Comparez jusqu'à 6 actifs!\n\n"
                "Envoyez:\n"
                "`/compare SYMBOLE1 SYMBOLE2 ...`\n\n"
                "Exemples:\n"
                "• `/compare AAPL MSFT GOOGL`\n"
                "• `/compare BTC-USD ETH-USD`\n"
                "• `/compare SPY QQQ IWM`"
            )
            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_charts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_heatmap":
            await query.edit_message_text("🗺️ Génération de la heatmap...")
            try:
                chart_buf, data_info = await advanced_charts_service.sector_heatmap()
                await query.message.reply_photo(
                    photo=chart_buf,
                    caption="🗺️ Heatmap sectorielle - Performance 5 jours"
                )
                # Restaurer le menu
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_charts")]]
                await query.message.reply_text("Graphique envoyé!", reply_markup=InlineKeyboardMarkup(keyboard))
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_charts")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_feargreed":
            await query.edit_message_text("😱 Calcul de l'indice Fear & Greed...")
            try:
                chart_buf, data_info = await advanced_charts_service.fear_greed_gauge()
                caption = f"😱 Fear & Greed Index: {int(data_info['score'])}\nSentiment: {data_info['sentiment']}"
                await query.message.reply_photo(photo=chart_buf, caption=caption)
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_charts")]]
                await query.message.reply_text("Graphique envoyé!", reply_markup=InlineKeyboardMarkup(keyboard))
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_charts")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))
