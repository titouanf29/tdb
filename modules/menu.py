"""
Module Menu Principal - Hub central du bot TDB
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, CommandHandler, filters
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
        # Menu et start uniquement en messages prives
        self.app.add_handler(CommandHandler("menu", self.show_menu, filters=filters.ChatType.PRIVATE))
        self.app.add_handler(CommandHandler("start", self.start, filters=filters.ChatType.PRIVATE))
        self.app.add_handler(CommandHandler("tutorial", self.show_tutorial, filters=filters.ChatType.PRIVATE))
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^menu_"))
        self.app.add_handler(CallbackQueryHandler(self.handle_tutorial_callback, pattern="^tuto_"))

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /start - uniquement en prive"""
        # Verifier que c'est en prive
        if update.effective_chat.type != 'private':
            await update.message.reply_text(
                "⚠️ Cette commande n'est disponible qu'en message privé.\n"
                "👉 Envoyez-moi /start en MP!"
            )
            return

        await update.message.reply_text(
            config.WELCOME_MESSAGE,
            parse_mode='Markdown'
        )
        await self.show_menu(update, context)

    async def show_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le menu principal - uniquement en prive"""
        # Verifier que c'est en prive (pour les messages)
        if update.message and update.effective_chat.type != 'private':
            await update.message.reply_text(
                "⚠️ Le menu n'est disponible qu'en message privé.\n"
                "👉 Envoyez-moi /menu en MP!"
            )
            return

        keyboard = [
            [InlineKeyboardButton("📊 Marché", callback_data="menu_market"),
             InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet")],
            [InlineKeyboardButton("⭐ Favoris", callback_data="menu_favorites"),
             InlineKeyboardButton("🤖 Assistant IA", callback_data="menu_ai_assistant")],
            [InlineKeyboardButton("🛠️ Outils", callback_data="menu_tools"),
             InlineKeyboardButton("📈 Analyses", callback_data="menu_analyses")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings"),
             InlineKeyboardButton("❓ Aide", callback_data="menu_help")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        menu_text = """
🤖 **TDB - MENU PRINCIPAL**

📊 **Marché** - Cours et analyses en temps réel
💼 **Wallet** - Paper trading et historique
⭐ **Favoris** - Vos actifs suivis
🤖 **Assistant IA** - Questions et analyses IA
🛠️ **Outils** - Alertes, screener, backtest
📈 **Analyses** - Risk, graphiques, sentiment
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

    async def show_tutorial(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Lance le tutoriel interactif"""
        from services.tutorial_service import tutorial_service
        await tutorial_service.start_tutorial(update, context)

    async def handle_tutorial_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gere les callbacks du tutoriel"""
        query = update.callback_query
        await query.answer()
        from services.tutorial_service import tutorial_service
        await tutorial_service.handle_tutorial_callback(update, context, query.data)

    async def show_tools_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Outils - Alertes, Screener, etc."""
        keyboard = [
            [InlineKeyboardButton("🔔 Alertes Prix", callback_data="menu_my_alerts"),
             InlineKeyboardButton("👁️ Watchlist", callback_data="menu_watchlist")],
            [InlineKeyboardButton("🔍 Screener", callback_data="menu_screener"),
             InlineKeyboardButton("📊 Backtest", callback_data="menu_backtest")],
            [InlineKeyboardButton("🔍 Scan Auto", callback_data="menu_scan"),
             InlineKeyboardButton("📤 Export", callback_data="menu_export")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
🛠️ **OUTILS DE TRADING**

🔔 **Alertes** - Notifications de prix
👁️ **Watchlist** - Surveillance avec alertes
🔍 **Screener** - Meilleurs setups du jour
📊 **Backtest** - Simuler des trades passés
🔍 **Scan Auto** - Détection automatique
📤 **Export** - Télécharger vos données
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_analyses_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Analyses - Risk, Graphiques, Sentiment"""
        keyboard = [
            [InlineKeyboardButton("📉 Risk", callback_data="menu_risk"),
             InlineKeyboardButton("📈 Graphiques", callback_data="menu_charts")],
            [InlineKeyboardButton("📰 News", callback_data="menu_news"),
             InlineKeyboardButton("🏆 Social", callback_data="menu_social")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
📈 **ANALYSES & DONNÉES**

📉 **Risk** - Sharpe, VaR, drawdown
📈 **Graphiques** - Heatmap, corrélations
📰 **News** - Actualités et sentiment
🏆 **Social** - Leaderboard et badges
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_help_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Aide - Tutoriel et documentation"""
        keyboard = [
            [InlineKeyboardButton("📖 Tutoriel", callback_data="menu_tutorial")],
            [InlineKeyboardButton("📝 Commandes", callback_data="menu_commands")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
❓ **AIDE & DOCUMENTATION**

📖 **Tutoriel** - Guide interactif complet
📝 **Commandes** - Liste des commandes

💡 **Commandes rapides:**
`/p SYMBOL` - Prix d'un actif
`/a SYMBOL` - Analyse IA
`/buy SYMBOL MONTANT` - Acheter
`/sell SYMBOL %` - Vendre
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_commands_list(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche la liste des commandes"""
        keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_help")]]

        text = """
📝 **COMMANDES DISPONIBLES**

**Marché:**
`/p SYMBOL` - Prix actuel
`/a SYMBOL` - Analyse complète
`/compare S1 S2...` - Comparer actifs
`/correlation S1 S2...` - Corrélations

**Trading:**
`/buy SYMBOL MONTANT` - Acheter
`/sell SYMBOL %` - Vendre (% position)
`/wallet` - Voir portefeuille
`/history` - Historique trades

**Alertes:**
`/alerts SYMBOL above/below PRIX`
`/watchlist add SYMBOL SEUIL%`

**Autres:**
`/backtest SYMBOL JOURS MONTANT LEVIER DIR`
`/ai QUESTION` - Poser une question à l'IA
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_alerts_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Alertes & Outils (legacy redirect)"""
        await self.show_tools_menu(update, context)

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
            [InlineKeyboardButton("📊 Comparer Actifs", callback_data="menu_compare"),
             InlineKeyboardButton("🔗 Corrélations", callback_data="menu_correlation")],
            [InlineKeyboardButton("🗺️ Heatmap Secteurs", callback_data="menu_heatmap"),
             InlineKeyboardButton("😱 Fear & Greed", callback_data="menu_feargreed")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
📈 **GRAPHIQUES AVANCES**

📊 **Comparer** - Superposer plusieurs actifs
🔗 **Corrélations** - Relations entre actifs
🗺️ **Heatmap** - Vue sectorielle du marché
😱 **Fear & Greed** - Sentiment du marché
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_news_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu News & Sentiment"""
        keyboard = [
            [InlineKeyboardButton("📰 Actualités Marché", callback_data="menu_market_news")],
            [InlineKeyboardButton("🐂 Sentiment Reddit", callback_data="menu_reddit_sentiment")],
            [InlineKeyboardButton("😱 Crypto Fear & Greed", callback_data="menu_crypto_fg")],
            [InlineKeyboardButton("📊 Résumé Sentiment", callback_data="menu_sentiment_summary")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
📰 **NEWS & SENTIMENT**

📰 **Actualités** - Dernières news financières
🐂 **Sentiment Reddit** - Analyse des forums
😱 **Crypto F&G** - Fear & Greed crypto
📊 **Résumé** - Vue d'ensemble sentiment
"""
        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def show_risk_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Risk Management"""
        keyboard = [
            [InlineKeyboardButton("📊 Rapport Risque", callback_data="menu_risk_report")],
            [InlineKeyboardButton("📐 Sharpe Ratio", callback_data="menu_sharpe")],
            [InlineKeyboardButton("⚠️ Value at Risk", callback_data="menu_var")],
            [InlineKeyboardButton("📉 Drawdown", callback_data="menu_drawdown")],
            [InlineKeyboardButton("📈 Stats Wallet", callback_data="menu_wallet_stats")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """
📉 **RISK MANAGEMENT**

📊 **Rapport** - Analyse complète du risque
📐 **Sharpe Ratio** - Performance ajustée
⚠️ **VaR** - Perte max probable
📉 **Drawdown** - Perte max historique
📈 **Stats Wallet** - Performance détaillée
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

        # Sous-menus principaux
        if data == "menu_tools":
            await self.show_tools_menu(update, context)
            return
        elif data == "menu_analyses":
            await self.show_analyses_menu(update, context)
            return
        elif data == "menu_help":
            await self.show_help_menu(update, context)
            return
        elif data == "menu_commands":
            await self.show_commands_list(update, context)
            return
        elif data == "menu_alerts":
            await self.show_tools_menu(update, context)
            return
        elif data == "menu_social":
            await self.show_social_menu(update, context)
            return
        elif data == "menu_charts":
            await self.show_charts_menu(update, context)
            return
        elif data == "menu_news":
            await self.show_news_menu(update, context)
            return
        elif data == "menu_risk":
            await self.show_risk_menu(update, context)
            return
        elif data == "menu_tutorial":
            from services.tutorial_service import tutorial_service
            await tutorial_service.start_tutorial(update, context)
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

        # Nouvelles fonctionnalités
        elif data in ["menu_my_alerts", "menu_watchlist", "menu_screener",
                      "menu_backtest", "menu_export", "menu_leaderboard",
                      "menu_badges", "menu_quiz", "menu_challenge",
                      "menu_templates", "menu_compare", "menu_heatmap",
                      "menu_feargreed", "menu_volatility", "menu_sltp",
                      "menu_correlation", "menu_market_news", "menu_reddit_sentiment",
                      "menu_crypto_fg", "menu_sentiment_summary", "menu_risk_report",
                      "menu_sharpe", "menu_var", "menu_drawdown", "menu_wallet_stats",
                      "menu_ai_history"]:
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

        # ===== NOUVEAUX HANDLERS =====

        elif data == "menu_volatility":
            vol_alerts = await db_manager.get_user_volatility_alerts(user_id)
            text = "⚡ **ALERTES DE VOLATILITÉ**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if vol_alerts:
                for alert in vol_alerts[:10]:
                    text += f"• {alert['asset_symbol']}: seuil {alert['threshold_percent']}%\n"
            else:
                text += "Aucune alerte de volatilité configurée.\n\n"
                text += "💡 Pour créer une alerte:\n"
                text += "`/volatility AAPL 5` (alerte si mouvement > 5%)"

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_sltp":
            from database.manager import db_manager as dbm
            orders = await dbm.get_pending_sltp_orders()
            user_orders = [o for o in orders if o.get('telegram_id') == user_id]

            text = "🛑 **ORDRES SL/TP ACTIFS**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if user_orders:
                for o in user_orders[:10]:
                    text += f"• {o['asset_symbol']}\n"
                    if o.get('stop_loss'):
                        text += f"  🔴 SL: ${o['stop_loss']:,.2f}\n"
                    if o.get('take_profit'):
                        text += f"  🟢 TP: ${o['take_profit']:,.2f}\n"
            else:
                text += "Aucun ordre SL/TP actif.\n\n"
                text += "💡 Les ordres SL/TP sont créés automatiquement\n"
                text += "lors de l'ouverture d'une position avec SL/TP."

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_correlation":
            text = (
                "🔗 **MATRICE DE CORRÉLATION**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                "Visualisez les corrélations entre actifs!\n\n"
                "Envoyez:\n"
                "`/correlation SYMBOLE1 SYMBOLE2 ...`\n\n"
                "Exemples:\n"
                "• `/correlation AAPL MSFT GOOGL`\n"
                "• `/correlation BTC-USD ETH-USD SPY`"
            )
            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_charts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        # ===== NEWS & SENTIMENT =====

        elif data == "menu_market_news":
            from services.news_service import news_service
            await query.edit_message_text("📰 Chargement des actualités...")
            try:
                news = await news_service.get_market_news(limit=10)
                text = news_service.format_news_list(news, "ACTUALITÉS MARCHÉ")
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_reddit_sentiment":
            from services.sentiment_service import sentiment_service
            await query.edit_message_text("🐂 Analyse du sentiment Reddit...")
            try:
                # Analyser les principaux actifs
                summary = await sentiment_service.get_market_sentiment_summary(['SPY', 'BTC-USD', 'AAPL'])
                text = "🐂 **SENTIMENT REDDIT**\n━━━━━━━━━━━━━━━━━━━━\n\n"

                for result in summary.get('by_symbol', []):
                    if 'error' not in result:
                        emoji = "🟢" if result['label'] == 'bullish' else ("🔴" if result['label'] == 'bearish' else "🟡")
                        text += f"{emoji} **{result['symbol']}**: {result['label'].upper()}\n"
                        text += f"   Score: {result['sentiment_score']:+.2f} | Posts: {result['post_count']}\n\n"

                text += f"📊 Sentiment global: **{summary['overall_label'].upper()}**"

                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_crypto_fg":
            from services.sentiment_service import sentiment_service
            await query.edit_message_text("😱 Récupération du Fear & Greed crypto...")
            try:
                fg_data = await sentiment_service.get_crypto_fear_greed()

                value = fg_data.get('value', 50)
                label = fg_data.get('label', 'Neutral')

                # Emoji selon le niveau
                if value <= 25:
                    emoji = "😱"
                    color = "🔴"
                elif value <= 45:
                    emoji = "😰"
                    color = "🟠"
                elif value <= 55:
                    emoji = "😐"
                    color = "🟡"
                elif value <= 75:
                    emoji = "😊"
                    color = "🟢"
                else:
                    emoji = "🤑"
                    color = "🟢"

                text = f"😱 **CRYPTO FEAR & GREED INDEX**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                text += f"{emoji} **Score: {value}/100**\n"
                text += f"{color} Sentiment: **{label}**\n\n"
                text += "━━━━━━━━━━━━━━━━━━━━\n"
                text += "0-25: Extreme Fear 😱\n"
                text += "26-45: Fear 😰\n"
                text += "46-55: Neutral 😐\n"
                text += "56-75: Greed 😊\n"
                text += "76-100: Extreme Greed 🤑"

                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_sentiment_summary":
            from services.sentiment_service import sentiment_service
            await query.edit_message_text("📊 Calcul du résumé sentiment...")
            try:
                summary = await sentiment_service.get_market_sentiment_summary()
                crypto_fg = summary.get('crypto_fear_greed', {})

                text = "📊 **RÉSUMÉ SENTIMENT MARCHÉ**\n━━━━━━━━━━━━━━━━━━━━\n\n"

                # Sentiment global
                overall = summary.get('overall_label', 'neutral').upper()
                score = summary.get('overall_score', 0)
                emoji = "🐂" if overall == "BULLISH" else ("🐻" if overall == "BEARISH" else "😐")
                text += f"{emoji} **Sentiment global**: {overall} ({score:+.2f})\n\n"

                # Crypto Fear & Greed
                fg_value = crypto_fg.get('value', 50)
                text += f"😱 **Crypto F&G**: {fg_value}/100 ({crypto_fg.get('label', 'Neutral')})\n\n"

                # Par actif
                text += "**Par actif:**\n"
                for result in summary.get('by_symbol', [])[:5]:
                    if 'error' not in result:
                        symbol_emoji = "🟢" if result['label'] == 'bullish' else ("🔴" if result['label'] == 'bearish' else "🟡")
                        text += f"{symbol_emoji} {result['symbol']}: {result['label']}\n"

                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_news")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        # ===== RISK MANAGEMENT =====

        elif data == "menu_risk_report":
            from services.risk_service import risk_service
            from services.wallet_stats_service import wallet_stats_service
            await query.edit_message_text("📊 Calcul du rapport de risque...")
            try:
                positions = await db_manager.get_user_positions(user_id)
                if positions:
                    report = await risk_service.generate_risk_report(positions)
                else:
                    report = "📊 **RAPPORT DE RISQUE**\n\n⚠️ Aucune position ouverte.\nOuvrez des positions pour voir l'analyse de risque."

                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
                await query.edit_message_text(report, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_sharpe":
            text = (
                "📐 **SHARPE RATIO**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                "Le Sharpe Ratio mesure la performance ajustée au risque.\n\n"
                "**Interprétation:**\n"
                "• < 0: Performance négative\n"
                "• 0-0.5: Faible\n"
                "• 0.5-1: Moyen\n"
                "• 1-2: Bon\n"
                "• > 2: Excellent\n\n"
                "💡 Utilisez **Rapport Risque** pour voir votre Sharpe Ratio."
            )
            keyboard = [[InlineKeyboardButton("📊 Voir Rapport", callback_data="menu_risk_report")],
                        [InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_var":
            text = (
                "⚠️ **VALUE AT RISK (VaR)**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                "La VaR estime la perte maximale probable sur une période.\n\n"
                "**VaR 95%** signifie:\n"
                "\"Il y a 95% de chances que la perte quotidienne\n"
                "ne dépasse pas ce montant.\"\n\n"
                "💡 Utilisez **Rapport Risque** pour voir votre VaR."
            )
            keyboard = [[InlineKeyboardButton("📊 Voir Rapport", callback_data="menu_risk_report")],
                        [InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_drawdown":
            text = (
                "📉 **MAXIMUM DRAWDOWN**\n━━━━━━━━━━━━━━━━━━━━\n\n"
                "Le drawdown max est la plus grande perte\n"
                "entre un pic et un creux du portefeuille.\n\n"
                "**Exemple:**\n"
                "Si votre portefeuille passe de $10,000 à $7,000\n"
                "avant de remonter, le drawdown est de 30%.\n\n"
                "💡 Un drawdown faible indique une bonne gestion du risque."
            )
            keyboard = [[InlineKeyboardButton("📊 Voir Rapport", callback_data="menu_risk_report")],
                        [InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_wallet_stats":
            from services.wallet_stats_service import wallet_stats_service
            await query.edit_message_text("📈 Calcul des statistiques...")
            try:
                metrics = await wallet_stats_service.calculate_performance_metrics(user_id)
                report = wallet_stats_service.format_performance_report(metrics)

                # Generer le graphique
                chart = await wallet_stats_service.generate_performance_chart(user_id)
                if chart:
                    await query.message.reply_photo(photo=chart, caption="📈 Performance du portefeuille")

                keyboard = [
                    [InlineKeyboardButton("📊 Allocation", callback_data="menu_allocation_chart")],
                    [InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]
                ]
                await query.message.reply_text(report, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_allocation_chart":
            from services.wallet_stats_service import wallet_stats_service
            await query.edit_message_text("📊 Génération du graphique d'allocation...")
            try:
                chart = await wallet_stats_service.generate_allocation_chart(user_id)
                if chart:
                    await query.message.reply_photo(photo=chart, caption="📊 Répartition sectorielle du portefeuille")
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
                await query.message.reply_text("Graphique envoyé!", reply_markup=InlineKeyboardMarkup(keyboard))
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_risk")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        # ===== HISTORIQUE IA =====

        elif data == "menu_ai_history":
            history = await db_manager.get_ai_analysis_history(user_id, limit=10)
            text = "🤖 **HISTORIQUE ANALYSES IA**\n━━━━━━━━━━━━━━━━━━━━\n\n"

            if history:
                for i, h in enumerate(history[:10], 1):
                    date = h.get('created_at', '')[:10]
                    symbol = h.get('asset_symbol', 'N/A')
                    sentiment = h.get('sentiment', 'N/A')
                    emoji = "🟢" if sentiment == 'bullish' else ("🔴" if sentiment == 'bearish' else "🟡")
                    text += f"{i}. [{date}] {symbol} {emoji}\n"
            else:
                text += "Aucune analyse dans l'historique.\n\n"
                text += "💡 Demandez des analyses à l'Assistant IA!"

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
