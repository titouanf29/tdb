"""
Module Marché - Analyse des marchés financiers
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
import config
from ai.analyzer import analyzer
from services.market_data import market_data_service
from services.charts import chart_service
from utils.helpers import *
from utils.constants import *
from database.manager import db_manager

class MarketModule:
    """Module de gestion des marchés"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^market_"))

    async def show_markets(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche la liste des marchés disponibles"""
        keyboard = []

        for market_code, market_info in config.MARKETS.items():
            status = get_market_status_message(market_code)
            keyboard.append([
                InlineKeyboardButton(
                    f"{market_info['name']} {status}",
                    callback_data=f"market_select_{market_code}"
                )
            ])

        keyboard.append([InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")])
        reply_markup = InlineKeyboardMarkup(keyboard)

        text = """
📊 **MARCHÉS DISPONIBLES**

Sélectionnez un marché à analyser :

Marchés ouverts : Scanner complet en temps réel
Marchés fermés : Résumé de la séance précédente
"""

        if update.callback_query:
            await update.callback_query.edit_message_text(
                text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(
                text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )

    async def scan_market(self, update: Update, context: ContextTypes.DEFAULT_TYPE, market_code: str):
        """Scanne un marché complet"""
        query = update.callback_query
        await query.answer()

        # Vérifier si le marché est ouvert
        market_open = is_market_open(market_code)
        market_info = config.MARKETS.get(market_code)

        if not market_open:
            # Marché fermé - proposer résumé
            keyboard = [
                [InlineKeyboardButton("📊 Voir le résumé", callback_data=f"market_summary_{market_code}")],
                [InlineKeyboardButton(BTN_BACK, callback_data="market_main")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            await query.edit_message_text(
                f"""
🔒 **MARCHÉ FERMÉ**

{market_info['name']} est actuellement fermé.

Souhaitez-vous voir un résumé de la dernière séance ?
""",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            return

        # Marché ouvert - lancer le scan
        await query.edit_message_text(
            f"""
🔍 **SCAN EN COURS...**

Analyse de {market_info['name']}
Cela peut prendre quelques secondes...

⏳ Veuillez patienter...
""",
            parse_mode='Markdown'
        )

        # Récupérer les actifs du marché
        assets = market_info.get('assets', [])

        # Analyser chaque actif
        results = []
        for symbol in assets:
            try:
                analysis = await analyzer.analyze_asset(symbol, market_code)
                if analysis and analysis['score'] >= 40:  # Seuil minimum
                    results.append(analysis)
            except Exception as e:
                print(f"Erreur analyse {symbol}: {e}")
                continue

        if not results:
            await query.edit_message_text(
                f"""
📊 **AUCUNE OPPORTUNITÉ DÉTECTÉE**

Aucune opportunité significative n'a été trouvée sur {market_info['name']} pour le moment.

Revenez plus tard ou essayez un autre marché.
""",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton(BTN_BACK, callback_data="market_main")]
                ]),
                parse_mode='Markdown'
            )
            return

        # Trier par score
        results.sort(key=lambda x: x['score'], reverse=True)

        # Sauvegarder les résultats dans le contexte
        context.user_data[f'market_results_{market_code}'] = results

        # Afficher les résultats
        await self.show_scan_results(update, context, market_code, results)

    async def show_scan_results(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                market_code: str, results: list):
        """Affiche les résultats du scan"""
        query = update.callback_query
        market_info = config.MARKETS.get(market_code)

        text = f"""
📊 **RÉSULTATS DU SCAN - {market_info['name']}**

{len(results)} opportunités détectées

"""

        keyboard = []

        # Afficher top 10
        for i, result in enumerate(results[:10], 1):
            emoji = get_score_emoji(result['score'])
            direction_emoji = EMOJI_DIRECTION[result['direction']]

            text += f"\n{i}. {emoji} **{result['symbol']}** - Score: {result['score']}/100"
            text += f"\n   {direction_emoji} {result['direction']} | {result['trend'].upper()}"
            text += f"\n   Prix: {format_price(result['current_price'])}"
            text += f"\n"

            # Bouton pour chaque actif
            keyboard.append([
                InlineKeyboardButton(
                    f"{i}. {result['symbol']} ({result['score']})",
                    callback_data=f"market_detail_{market_code}_{result['symbol']}"
                )
            ])

        keyboard.append([InlineKeyboardButton("🔄 Actualiser", callback_data=f"market_select_{market_code}")])
        keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="market_main")])

        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(
            text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def show_asset_detail(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                               market_code: str, symbol: str):
        """Affiche l'analyse détaillée d'un actif"""
        query = update.callback_query
        await query.answer()

        # Envoyer message de chargement
        await query.edit_message_text(
            f"🔍 Analyse détaillée de {symbol}...",
            parse_mode='Markdown'
        )

        # Analyser l'actif
        analysis = await analyzer.analyze_asset(symbol, market_code)

        if not analysis:
            await query.edit_message_text(
                "❌ Impossible d'analyser cet actif.",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton(BTN_BACK, callback_data=f"market_select_{market_code}")]
                ])
            )
            return

        # Sauvegarder dans le contexte
        context.user_data[f'asset_detail_{symbol}'] = analysis

        # Générer le texte d'analyse
        score_emoji = get_score_emoji(analysis['score'])
        direction_emoji = EMOJI_DIRECTION[analysis['direction']]
        trend_emoji = EMOJI_TREND[analysis['trend']]
        risk_emoji = EMOJI_RISK[analysis['risk_level']]

        text = f"""
📊 **ANALYSE DÉTAILLÉE**

**{symbol}**

{score_emoji} **Score IA: {analysis['score']}/100**
{get_score_label(analysis['score'])}

━━━━━━━━━━━━━━━━━━━━

💰 **Prix actuel:** {format_price(analysis['current_price'])}
📈 **Variation 24h:** {format_percent(analysis['price_change_1d'])}

{direction_emoji} **Direction suggérée:** {analysis['direction']}
{trend_emoji} **Tendance:** {analysis['trend'].upper()}

━━━━━━━━━━━━━━━━━━━━

📊 **Indicateurs techniques:**
• RSI: {analysis['rsi']:.1f}
• Volume: x{analysis['volume_ratio']:.2f} (vs moyenne)
• Volatilité (ATR): {format_price(analysis['volatility'])}

"""

        if analysis['support'] and analysis['resistance']:
            text += f"""
🎯 **Niveaux clés:**
• Support: {format_price(analysis['support'])}
• Résistance: {format_price(analysis['resistance'])}

"""

        text += f"""
🔍 **Type:** {OPPORTUNITY_TYPES.get(analysis['opportunity_type'], analysis['opportunity_type'])}
{risk_emoji} **Risque:** {analysis['risk_level'].upper()}

📝 **Résumé:** {analysis['technical_summary']}
"""

        # Boutons d'action
        keyboard = [
            [InlineKeyboardButton("🤖 Trading Compagnon", callback_data=f"trading_companion_{symbol}_{market_code}")],
            [InlineKeyboardButton("📰 News", callback_data=f"news_{symbol}")],
            [InlineKeyboardButton("📈 Graphique", callback_data=f"chart_{symbol}")],
            [InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"favorite_add_{symbol}_{market_code}")],
            [InlineKeyboardButton(BTN_BACK, callback_data=f"market_select_{market_code}")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(
            text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def show_chart(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str):
        """Affiche le graphique d'un actif"""
        query = update.callback_query
        await query.answer("📊 Génération du graphique...")

        try:
            # Récupérer les données
            data = await market_data_service.get_asset_data(symbol, period="1mo", interval="1d")

            if data is None or data.empty:
                await context.bot.send_message(
                    chat_id=query.message.chat_id,
                    text="❌ Impossible de générer le graphique."
                )
                return

            # Générer le graphique
            chart = await chart_service.generate_candlestick_chart(
                data, symbol, indicators=['ema20', 'ema50', 'ema200']
            )

            if chart:
                await context.bot.send_photo(
                    chat_id=query.message.chat_id,
                    photo=chart,
                    caption=f"📈 Graphique de {symbol}"
                )
            else:
                await context.bot.send_message(
                    chat_id=query.message.chat_id,
                    text="❌ Erreur lors de la génération du graphique."
                )

        except Exception as e:
            print(f"Erreur génération graphique: {e}")
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text="❌ Erreur lors de la génération du graphique."
            )

    async def show_news(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str):
        """Affiche les actualités d'un actif"""
        query = update.callback_query
        await query.answer()

        # Message en attendant l'implémentation d'une vraie API news
        text = f"""
📰 **ACTUALITÉS - {symbol}**

🚧 Fonctionnalité en développement

L'intégration des actualités en temps réel sera disponible prochainement.

Pour l'instant, vous pouvez consulter :
• Google Finance : google.com/finance
• Yahoo Finance : finance.yahoo.com
• TradingView : tradingview.com

Recherchez : **{symbol}**
"""

        keyboard = [
            [InlineKeyboardButton("🔙 Retour à l'analyse", callback_data=f"market_detail_{context.user_data.get('current_market', 'USA')}_{symbol}")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks du module marché"""
        query = update.callback_query
        data = query.data

        if data == "market_main":
            await self.show_markets(update, context)

        elif data.startswith("market_select_"):
            market_code = data.replace("market_select_", "")
            await self.scan_market(update, context, market_code)

        elif data.startswith("market_detail_"):
            parts = data.replace("market_detail_", "").split("_", 1)
            market_code = parts[0]
            symbol = parts[1]
            # Sauvegarder le marché actuel dans le contexte
            context.user_data['current_market'] = market_code
            await self.show_asset_detail(update, context, market_code, symbol)

        elif data.startswith("chart_"):
            symbol = data.replace("chart_", "")
            await self.show_chart(update, context, symbol)

        elif data.startswith("news_"):
            symbol = data.replace("news_", "")
            await self.show_news(update, context, symbol)

        elif data.startswith("favorite_add_"):
            parts = data.replace("favorite_add_", "").split("_", 1)
            symbol = parts[0]
            market_code = parts[1]
            user_id = query.from_user.id
            await db_manager.add_favorite(user_id, symbol, market_code)
            await query.answer("⭐ Ajouté aux favoris !")

        elif data.startswith("trading_companion_"):
            # Rediriger vers le Trading Compagnon
            parts = data.replace("trading_companion_", "").split("_", 1)
            symbol = parts[0]
            market_code = parts[1]

            from ai.trading_companion import TradingCompanion
            companion = TradingCompanion(self.app)
            await companion.start_conversation(update, context, symbol, market_code)
