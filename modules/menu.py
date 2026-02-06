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
        # Menu uniquement en messages prives (/start est géré par welcome.py)
        self.app.add_handler(CommandHandler("menu", self.show_menu, filters=filters.ChatType.PRIVATE))
        self.app.add_handler(CommandHandler("tutorial", self.show_tutorial, filters=filters.ChatType.PRIVATE))
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^menu_"))
        self.app.add_handler(CallbackQueryHandler(self.handle_tutorial_callback, pattern="^tuto_"))
        # Handler pour les opportunités (snooze, ignore, interested)
        self.app.add_handler(CallbackQueryHandler(self.handle_opportunity_callback, pattern="^opp_"))
        # Handler pour la watchlist (suppression)
        self.app.add_handler(CallbackQueryHandler(self.handle_watchlist_callback, pattern="^wl_"))
        # Handler pour les favoris rapides
        self.app.add_handler(CallbackQueryHandler(self.handle_quick_favorite, pattern="^quick_"))
        # Handler pour la gestion des favoris épinglés
        self.app.add_handler(CallbackQueryHandler(self.handle_pin_callback, pattern="^pin_"))

    async def show_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le menu principal - uniquement en prive"""
        from database.manager import db_manager

        # Verifier que c'est en prive (pour les messages)
        if update.message and update.effective_chat.type != 'private':
            await update.message.reply_text(
                "⚠️ Le menu n'est disponible qu'en message privé.\n"
                "👉 Envoyez-moi /menu en MP!"
            )
            return

        user_id = update.effective_user.id

        # Récupérer les favoris épinglés
        pinned = await db_manager.get_pinned_favorites(user_id, limit=4)

        # Construire le clavier avec favoris épinglés en haut
        keyboard = []

        # Section favoris rapides (si existants)
        if pinned:
            pinned_row = []
            for fav in pinned[:4]:
                symbol = fav['asset_symbol']
                # Raccourcir le symbole si trop long
                display = symbol[:6] if len(symbol) > 6 else symbol
                pinned_row.append(InlineKeyboardButton(f"⚡ {display}", callback_data=f"quick_{symbol}"))
            keyboard.append(pinned_row)

        # Menu principal avec descriptions
        keyboard.extend([
            [InlineKeyboardButton("📊 Marchés", callback_data="menu_market"),
             InlineKeyboardButton("💼 Portfolio", callback_data="menu_wallet")],
            [InlineKeyboardButton("⭐ Favoris", callback_data="menu_favorites"),
             InlineKeyboardButton("🤖 Assistant IA", callback_data="menu_ai_assistant")],
            [InlineKeyboardButton("🛠️ Outils", callback_data="menu_tools"),
             InlineKeyboardButton("📰 Infos", callback_data="menu_infos")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings"),
             InlineKeyboardButton("❓ Aide", callback_data="menu_help")]
        ])

        # Récupérer l'historique de recherche
        history = await db_manager.get_search_history(user_id, limit=3)

        reply_markup = InlineKeyboardMarkup(keyboard)

        # Construire le texte du menu
        menu_text = """🤖 <b>TDB - MENU PRINCIPAL</b>
━━━━━━━━━━━━━━━━━━━━"""

        # Afficher les favoris rapides si présents
        if pinned:
            menu_text += "\n\n⚡ <b>Accès rapide:</b> Cliquez sur un favori épinglé"

        menu_text += """

📊 <b>Marchés</b>
<i>Cours en temps réel, analyses techniques</i>

💼 <b>Portfolio</b>
<i>Paper trading, positions, historique</i>

⭐ <b>Favoris</b>
<i>Vos actifs suivis et alertes personnalisées</i>

🤖 <b>Assistant IA</b>
<i>Posez vos questions, obtenez des analyses</i>

🛠️ <b>Outils</b>
<i>Alertes, screener, watchlist, backtest</i>

📰 <b>Infos</b>
<i>Calendrier éco, news, sentiment marché</i>"""

        # Afficher les recherches récentes
        if history:
            menu_text += "\n\n🔍 <b>Recherches récentes:</b>"
            for h in history[:3]:
                if h.get('result_symbol'):
                    menu_text += f"\n• {h['result_symbol']}"

        menu_text += "\n\n━━━━━━━━━━━━━━━━━━━━\n💡 <i>Tapez /a SYMBOL pour une analyse rapide</i>"

        if update.message:
            await update.message.reply_text(
                menu_text,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
        elif update.callback_query:
            await update.callback_query.edit_message_text(
                menu_text,
                reply_markup=reply_markup,
                parse_mode='HTML'
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

    async def handle_opportunity_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks des opportunités (snooze, ignore, interested)"""
        query = update.callback_query
        data = query.data
        user_id = update.effective_user.id

        from services.notifications import NotificationService

        if data.startswith("opp_snooze_"):
            symbol = data.replace("opp_snooze_", "")
            NotificationService.snooze_opportunity(user_id, symbol, hours=2)
            await query.answer(f"😴 {symbol} en pause pour 2h", show_alert=True)
            # Modifier le message pour indiquer le snooze
            new_text = query.message.text + f"\n\n✅ _Snooze 2h activé_"
            try:
                await query.edit_message_text(new_text, parse_mode='Markdown')
            except:
                pass

        elif data.startswith("opp_ignore_"):
            symbol = data.replace("opp_ignore_", "")
            # Snooze de 24h pour ignorer
            NotificationService.snooze_opportunity(user_id, symbol, hours=24)
            await query.answer(f"❌ {symbol} ignoré pour 24h", show_alert=False)
            try:
                await query.delete_message()
            except:
                pass

        elif data.startswith("opp_interested_"):
            symbol = data.replace("opp_interested_", "")
            await query.answer(f"📊 Envoyez /a {symbol} pour l'analyse complète", show_alert=True)
            # Modifier le message
            new_text = query.message.text + f"\n\n✅ _Utilisez `/a {symbol}` pour voir l'analyse_"
            try:
                await query.edit_message_text(new_text, parse_mode='Markdown')
            except:
                pass

    async def handle_watchlist_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks de la watchlist (suppression)"""
        query = update.callback_query
        data = query.data
        user_id = update.effective_user.id

        from database.manager import db_manager

        if data.startswith("wl_del_"):
            symbol = data.replace("wl_del_", "")
            await db_manager.remove_from_smart_watchlist(user_id, symbol)
            await query.answer(f"✅ {symbol} supprimé!", show_alert=True)

            # Retourner à la watchlist
            watchlist = await db_manager.get_smart_watchlist(user_id)
            text = "👁️ **WATCHLIST INTELLIGENTE**\n━━━━━━━━━━━━━━━━━━━━\n\n"
            if watchlist:
                for item in watchlist:
                    text += f"• {item['asset_symbol']} (seuil: {item['alert_threshold']}%)\n"
                text += f"\n📊 Total: {len(watchlist)} actif(s) suivis"
            else:
                text += "Votre watchlist est vide.\n\n"
                text += "💡 Envoyez: `/watchlist add AAPL 5`"

            keyboard = [
                [InlineKeyboardButton("➕ Ajouter", callback_data="menu_watchlist_help")],
                [InlineKeyboardButton("🗑️ Supprimer", callback_data="menu_watchlist_delete")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_tools")]
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    async def handle_quick_favorite(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère le clic sur un favori rapide - affiche l'analyse"""
        from utils.loading import show_loading
        from database.manager import db_manager

        query = update.callback_query
        await query.answer()

        symbol = query.data.replace("quick_", "")
        user_id = query.from_user.id

        # Ajouter à l'historique de recherche
        await db_manager.add_search_history(user_id, symbol, symbol, 'quick_access')

        # Afficher le chargement
        await show_loading(query, "analysis", f"Analyse de {symbol}...")

        try:
            # Lancer l'analyse via le module market
            if self.market_module:
                # Trouver le marché du symbole
                market_code = self.market_module.find_market_for_symbol(symbol)

                # Si marché non trouvé, déduire par le format du symbole
                if not market_code:
                    if symbol.endswith('-USD'):
                        market_code = 'CRYPTO'
                    elif symbol.endswith('.PA'):
                        market_code = 'EUROPE'
                    elif symbol.startswith('^'):
                        # Indices - deviner par le nom
                        if symbol in ['^FCHI', '^GDAXI', '^FTSE']:
                            market_code = 'EUROPE'
                        elif symbol in ['^N225', '^HSI']:
                            market_code = 'ASIA'
                        else:
                            market_code = 'USA'
                    else:
                        market_code = 'USA'  # Par défaut

                await self.market_module.show_asset_detail(update, context, market_code, symbol)
            else:
                keyboard = [[InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]]
                await query.edit_message_text(
                    f"❌ Module d'analyse non disponible.\n\nUtilisez `/a {symbol}` à la place.",
                    reply_markup=InlineKeyboardMarkup(keyboard),
                    parse_mode='Markdown'
                )
        except Exception as e:
            keyboard = [[InlineKeyboardButton("🔙 Menu", callback_data="menu_main")]]
            await query.edit_message_text(
                f"❌ Erreur: {e}\n\nUtilisez `/a {symbol}` à la place.",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )

    async def handle_pin_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère l'épinglage/désépinglage des favoris"""
        from database.manager import db_manager

        query = update.callback_query
        user_id = query.from_user.id
        data = query.data

        if data.startswith("pin_add_"):
            # Épingler un favori
            parts = data.replace("pin_add_", "").split("_")
            symbol = parts[0]
            market = parts[1] if len(parts) > 1 else "USA"

            await db_manager.add_pinned_favorite(user_id, symbol, market)
            await query.answer(f"⚡ {symbol} épinglé en accès rapide!", show_alert=True)

        elif data.startswith("pin_remove_"):
            # Désépingler un favori
            symbol = data.replace("pin_remove_", "")
            await db_manager.remove_pinned_favorite(user_id, symbol)
            await query.answer(f"✅ {symbol} retiré de l'accès rapide", show_alert=True)

        # Rafraîchir l'affichage des favoris
        if self.favorites_module:
            await self.favorites_module.show_favorites(update, context)

    async def show_tools_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Outils - Alertes, Screener, etc."""
        keyboard = [
            [InlineKeyboardButton("🔔 Alertes Prix", callback_data="menu_my_alerts"),
             InlineKeyboardButton("⚡ Alertes Smart", callback_data="menu_smart_alerts")],
            [InlineKeyboardButton("👁️ Watchlist", callback_data="menu_watchlist"),
             InlineKeyboardButton("🔍 Screener", callback_data="menu_screener")],
            [InlineKeyboardButton("📊 Backtest", callback_data="menu_backtest"),
             InlineKeyboardButton("🔍 Scan Auto", callback_data="menu_scan")],
            [InlineKeyboardButton("🔎 Recherche", callback_data="menu_search"),
             InlineKeyboardButton("📤 Export", callback_data="menu_export")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """🛠️ <b>OUTILS DE TRADING</b>
━━━━━━━━━━━━━━━━━━━━

🔔 <b>Alertes Prix</b>
<i>Notification quand un prix atteint votre cible</i>

⚡ <b>Alertes Smart</b>
<i>Détection auto de patterns et confluences</i>

👁️ <b>Watchlist</b>
<i>Surveillez des actifs avec alertes de mouvement</i>

🔍 <b>Screener</b>
<i>Trouvez les meilleurs setups du moment</i>

📊 <b>Backtest</b>
<i>Simulez des trades sur données historiques</i>

🔍 <b>Scan Auto</b>
<i>Scan périodique de vos marchés préférés</i>

🔎 <b>Recherche</b>
<i>Recherchez un actif par nom ou symbole</i>

📤 <b>Export</b>
<i>Téléchargez votre historique en CSV/PDF</i>"""

        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='HTML'
        )

    async def show_infos_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sous-menu Infos - Calendrier, News, Sentiment"""
        keyboard = [
            [InlineKeyboardButton("📅 Calendrier Économique", callback_data="menu_calendar")],
            [InlineKeyboardButton("📰 News & Actualités", callback_data="menu_news")],
            [InlineKeyboardButton("😱 Fear & Greed Index", callback_data="menu_feargreed")],
            [InlineKeyboardButton("🔙 Retour", callback_data="menu_main")]
        ]

        text = """📰 <b>INFOS & ACTUALITÉS</b>
━━━━━━━━━━━━━━━━━━━━

📅 <b>Calendrier Économique</b>
<i>Fed, CPI, NFP, Earnings à venir</i>

📰 <b>News & Actualités</b>
<i>Dernières nouvelles et sentiment Reddit</i>

😱 <b>Fear & Greed Index</b>
<i>Indicateur de sentiment du marché</i>

━━━━━━━━━━━━━━━━━━━━
<i>💡 Ces infos vous aident à anticiper
les mouvements du marché</i>"""

        await update.callback_query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='HTML'
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
`/targets SYMBOL` - Prix cibles (Entry/SL/TP)
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

**Analyses:**
`/calendar` - Calendrier économique
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
        elif data == "menu_infos" or data == "menu_analyses":
            await self.show_infos_menu(update, context)
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
                      "menu_ai_history", "menu_calendar", "menu_smart_alerts",
                      "menu_price_targets", "menu_earnings", "menu_scan_alerts",
                      "menu_alerts_config", "menu_calc_targets", "menu_alerts_help",
                      "menu_watchlist_delete", "menu_watchlist_help",
                      "menu_search", "menu_clear_history"] or data.startswith("wl_del_"):
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
                text += f"\n📊 Total: {len(watchlist)} actif(s) suivis"
            else:
                text += "Votre watchlist est vide.\n\n"
                text += "💡 Envoyez: `/watchlist add AAPL 5`\n"
                text += "(Alerte si mouvement > 5%)"

            keyboard = [
                [InlineKeyboardButton("➕ Ajouter (voir /watchlist)", callback_data="menu_watchlist_help")],
                [InlineKeyboardButton("🗑️ Supprimer un actif", callback_data="menu_watchlist_delete")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_tools")]
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_watchlist_help":
            text = (
                "📝 **AJOUTER À LA WATCHLIST**\n\n"
                "Envoyez une commande:\n"
                "`/watchlist add SYMBOLE SEUIL%`\n\n"
                "Exemples:\n"
                "• `/watchlist add AAPL 5` (alerte si >5%)\n"
                "• `/watchlist add BTC-USD 3`\n"
                "• `/watchlist add TSLA 10`\n\n"
                "⚠️ Si le symbole n'est pas trouvé,\nvérifiez l'orthographe (ex: BTC-USD, AAPL)"
            )
            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_watchlist")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_watchlist_delete":
            watchlist = await db_manager.get_smart_watchlist(user_id)
            if not watchlist:
                text = "👁️ **SUPPRIMER DE LA WATCHLIST**\n\nVotre watchlist est vide."
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_watchlist")]]
            else:
                text = "👁️ **SUPPRIMER DE LA WATCHLIST**\n\nSélectionnez l'actif à supprimer:\n"
                keyboard = []
                for item in watchlist:
                    keyboard.append([InlineKeyboardButton(
                        f"❌ {item['asset_symbol']}",
                        callback_data=f"wl_del_{item['asset_symbol']}"
                    )])
                keyboard.append([InlineKeyboardButton("🔙 Retour", callback_data="menu_watchlist")])
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data.startswith("wl_del_"):
            symbol = data.replace("wl_del_", "")
            await db_manager.remove_from_smart_watchlist(user_id, symbol)
            await query.answer(f"✅ {symbol} supprimé de la watchlist", show_alert=True)
            # Retourner à la watchlist
            watchlist = await db_manager.get_smart_watchlist(user_id)
            text = "👁️ **WATCHLIST INTELLIGENTE**\n━━━━━━━━━━━━━━━━━━━━\n\n"
            if watchlist:
                for item in watchlist:
                    text += f"• {item['asset_symbol']} (seuil: {item['alert_threshold']}%)\n"
                text += f"\n📊 Total: {len(watchlist)} actif(s) suivis"
            else:
                text += "Votre watchlist est vide.\n\n"
                text += "💡 Envoyez: `/watchlist add AAPL 5`"
            keyboard = [
                [InlineKeyboardButton("➕ Ajouter", callback_data="menu_watchlist_help")],
                [InlineKeyboardButton("🗑️ Supprimer", callback_data="menu_watchlist_delete")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_tools")]
            ]
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

        elif data == "menu_search":
            # Afficher le menu de recherche amélioré
            history = await db_manager.get_search_history(user_id, limit=5)

            text = """🔎 <b>RECHERCHE D'ACTIFS</b>
━━━━━━━━━━━━━━━━━━━━

<b>📝 Rechercher:</b>
Tapez <code>/a SYMBOLE</code> pour une analyse

<b>Exemple:</b> <code>/a AAPL</code> ou <code>/a BTC-USD</code>

━━━━━━━━━━━━━━━━━━━━
<b>⚡ Actifs populaires:</b>"""

            keyboard = [
                # Tech US
                [
                    InlineKeyboardButton("🍎 AAPL", callback_data="quick_AAPL"),
                    InlineKeyboardButton("🪟 MSFT", callback_data="quick_MSFT"),
                    InlineKeyboardButton("🔍 GOOGL", callback_data="quick_GOOGL")
                ],
                [
                    InlineKeyboardButton("📦 AMZN", callback_data="quick_AMZN"),
                    InlineKeyboardButton("🚗 TSLA", callback_data="quick_TSLA"),
                    InlineKeyboardButton("🎮 NVDA", callback_data="quick_NVDA")
                ],
                # Crypto
                [
                    InlineKeyboardButton("₿ BTC", callback_data="quick_BTC-USD"),
                    InlineKeyboardButton("⟠ ETH", callback_data="quick_ETH-USD"),
                    InlineKeyboardButton("◎ SOL", callback_data="quick_SOL-USD")
                ],
                # Europe
                [
                    InlineKeyboardButton("👜 LVMH", callback_data="quick_MC.PA"),
                    InlineKeyboardButton("💄 L'Oréal", callback_data="quick_OR.PA"),
                    InlineKeyboardButton("✈️ Airbus", callback_data="quick_AIR.PA")
                ],
                # Indices
                [
                    InlineKeyboardButton("📈 S&P 500", callback_data="quick_^GSPC"),
                    InlineKeyboardButton("📊 CAC 40", callback_data="quick_^FCHI"),
                    InlineKeyboardButton("💹 Nasdaq", callback_data="quick_^IXIC")
                ]
            ]

            # Recherches récentes
            if history:
                text += "\n\n<b>🕐 Récents:</b>"
                recent_symbols = []
                for h in history[:4]:
                    symbol = h.get('result_symbol') or h.get('query')
                    if symbol and symbol not in recent_symbols:
                        recent_symbols.append(symbol)
                        text += f" • {symbol}"

                if recent_symbols:
                    recent_row = [InlineKeyboardButton(f"📊 {s}", callback_data=f"quick_{s}") for s in recent_symbols[:4]]
                    keyboard.insert(0, recent_row)

            keyboard.append([
                InlineKeyboardButton("🗑️ Effacer", callback_data="menu_clear_history"),
                InlineKeyboardButton("🔙 Retour", callback_data="menu_tools")
            ])

            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

        elif data == "menu_clear_history":
            await db_manager.clear_search_history(user_id)
            await query.answer("✅ Historique effacé", show_alert=True)
            # Reafficher le menu recherche
            text = """🔎 <b>RECHERCHE D'ACTIFS</b>
━━━━━━━━━━━━━━━━━━━━

Pour rechercher un actif, envoyez:
<code>/p SYMBOLE</code> - Prix actuel
<code>/a SYMBOLE</code> - Analyse complète

<b>Exemples:</b>
• <code>/p AAPL</code> - Prix Apple
• <code>/a BTC-USD</code> - Analyse Bitcoin
• <code>/p TSLA</code> - Prix Tesla"""

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_tools")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

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
                    # Convertir au format attendu par risk_service
                    risk_positions = []
                    for pos in positions:
                        price = pos.get('current_price') or pos.get('entry_price', 0)
                        amount = pos.get('amount', 0)
                        value = price * amount
                        risk_positions.append({
                            'symbol': pos.get('asset_symbol'),
                            'value': value,
                            'quantity': amount
                        })
                    report = await risk_service.generate_risk_report(risk_positions)
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

        # ===== CALENDRIER ÉCONOMIQUE =====

        elif data == "menu_calendar":
            from services.economic_calendar import economic_calendar
            await query.edit_message_text("📅 Chargement du calendrier économique...")
            try:
                # Récupérer les événements à venir
                events = await economic_calendar.get_upcoming_events(days_ahead=14)

                # Formater le message
                text = economic_calendar.format_calendar_message(events)

                # Vérifier le risque d'événement
                risk = await economic_calendar.check_event_risk()
                if risk['risk_level'] != 'NONE':
                    text += f"\n\n{risk['recommendation']}"

                keyboard = [
                    [InlineKeyboardButton("📊 Earnings", callback_data="menu_earnings")],
                    [InlineKeyboardButton("🔙 Retour", callback_data="menu_analyses")]
                ]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_analyses")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_earnings":
            from services.economic_calendar import economic_calendar
            await query.edit_message_text("📊 Chargement des earnings...")
            try:
                # Récupérer les earnings des favoris de l'utilisateur
                favorites = await db_manager.get_user_favorites(user_id)
                symbols = [f['asset_symbol'] for f in favorites] if favorites else ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']

                earnings = await economic_calendar.get_earnings_calendar(symbols[:10])

                text = "📊 **CALENDRIER EARNINGS**\n━━━━━━━━━━━━━━━━━━━━\n\n"

                if earnings:
                    for e in earnings[:10]:
                        days = e['days_until']
                        if days == 0:
                            days_str = "🔴 AUJOURD'HUI"
                        elif days == 1:
                            days_str = "🟠 DEMAIN"
                        else:
                            days_str = f"J-{days}"

                        date_str = e['date'].strftime('%d/%m')
                        text += f"📊 **{e['symbol']}** - {date_str} ({days_str})\n"
                else:
                    text += "Aucun earnings prévu pour vos favoris.\n\n"
                    text += "💡 Ajoutez des favoris pour suivre leurs earnings!"

                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_calendar")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_calendar")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        # ===== SMART ALERTS =====

        elif data == "menu_smart_alerts":
            from services.smart_alerts import smart_alerts, AlertType, AlertPriority
            text = "⚡ **ALERTES SMART**\n━━━━━━━━━━━━━━━━━━━━\n\n"
            text += "Les Alertes Smart détectent automatiquement:\n\n"
            text += "📊 **Patterns** - Engulfing, H&S, Triangles...\n"
            text += "🎯 **Confluence** - Alignement multi-timeframe\n"
            text += "🏦 **Smart Money** - Order Blocks, FVG\n"
            text += "📈 **Structure** - BOS, CHoCH\n\n"
            text += "━━━━━━━━━━━━━━━━━━━━\n"
            text += "💡 Les alertes sont générées lors de chaque analyse `/a SYMBOL`\n"

            keyboard = [
                [InlineKeyboardButton("🔍 Scanner Maintenant", callback_data="menu_scan_alerts")],
                [InlineKeyboardButton("⚙️ Configurer Seuils", callback_data="menu_alerts_config")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_tools")]
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_scan_alerts":
            from services.smart_alerts import smart_alerts
            from ai.analyzer import analyzer
            await query.edit_message_text("🔍 Scan des alertes en cours...")
            try:
                # Scanner les favoris de l'utilisateur
                favorites = await db_manager.get_user_favorites(user_id)
                symbols = [f['asset_symbol'] for f in favorites] if favorites else ['AAPL', 'MSFT', 'GOOGL']

                all_alerts = []
                for symbol in symbols[:5]:  # Max 5 pour éviter le timeout
                    analysis = await analyzer.analyze_asset(symbol, 'USA', fetch_news=False)
                    if analysis:
                        alerts = await smart_alerts.analyze_for_alerts(symbol, analysis)
                        all_alerts.extend(alerts)

                if all_alerts:
                    text = smart_alerts.format_alerts_summary(all_alerts)
                else:
                    text = "✅ **SCAN TERMINÉ**\n\nAucune alerte détectée sur vos favoris.\n\n💡 C'est bon signe - pas de signal fort actuellement."

                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_smart_alerts")]]
                await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
            except Exception as e:
                keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_smart_alerts")]]
                await query.edit_message_text(f"❌ Erreur: {e}", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data == "menu_alerts_config":
            text = "⚙️ **CONFIGURATION ALERTES**\n━━━━━━━━━━━━━━━━━━━━\n\n"
            text += "**Seuils actuels:**\n"
            text += "• Confluence: score ≥ 70/100\n"
            text += "• Patterns: confiance ≥ 70%\n"
            text += "• Smart Money: score ≥ 60/100\n"
            text += "• Cooldown: 1h entre alertes similaires\n\n"
            text += "💡 Configuration avancée disponible dans les paramètres."

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_smart_alerts")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        # ===== PRIX CIBLES =====

        elif data == "menu_price_targets":
            text = "🎯 **PRIX CIBLES IA**\n━━━━━━━━━━━━━━━━━━━━\n\n"
            text += "L'IA calcule automatiquement:\n\n"
            text += "📍 **Entry** - Prix d'entrée optimal\n"
            text += "🛑 **Stop-Loss** - Basé sur ATR et support\n"
            text += "✅ **Take-Profit** - 3 niveaux (1.5R, 2R, 3R)\n\n"
            text += "**Calcul basé sur:**\n"
            text += "• ATR (volatilité)\n"
            text += "• Support/Résistance\n"
            text += "• Niveaux Fibonacci\n"
            text += "• Direction du signal\n\n"
            text += "━━━━━━━━━━━━━━━━━━━━\n"
            text += "💡 Envoyez `/a SYMBOL` pour voir les prix cibles"

            keyboard = [
                [InlineKeyboardButton("🔍 Calculer pour un actif", callback_data="menu_calc_targets")],
                [InlineKeyboardButton("🔙 Retour", callback_data="menu_analyses")]
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        elif data == "menu_calc_targets":
            text = "🎯 **CALCULER PRIX CIBLES**\n━━━━━━━━━━━━━━━━━━━━\n\n"
            text += "Pour obtenir les prix cibles d'un actif:\n\n"
            text += "Envoyez la commande:\n"
            text += "`/targets SYMBOL`\n\n"
            text += "**Exemples:**\n"
            text += "• `/targets AAPL`\n"
            text += "• `/targets BTC-USD`\n"
            text += "• `/targets TSLA`\n\n"
            text += "Ou utilisez `/a SYMBOL` pour une analyse complète avec les prix cibles."

            keyboard = [[InlineKeyboardButton("🔙 Retour", callback_data="menu_price_targets")]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

        else:
            # Callback non géré - afficher un message d'erreur
            await query.answer("⚠️ Fonctionnalité en cours de développement", show_alert=True)
