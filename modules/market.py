"""
Module Marché - Analyse des marchés financiers
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
import config
from ai.analyzer import analyzer
from services.market_data import market_data_service
from services.charts import chart_service
from services.news import news_service
from utils.helpers import *
from utils.constants import *
from utils.asset_names import format_asset_name, get_asset_display_name, get_asset_emoji
from utils.loading import LoadingAnimation, show_loading
from database.manager import db_manager
from datetime import datetime

logger = logging.getLogger(__name__)

class MarketModule:
    """Module de gestion des marchés"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def find_market_for_symbol(self, symbol: str) -> str:
        """Trouve le marché auquel appartient un symbole"""
        for market_code, market_info in config.MARKETS.items():
            if symbol in market_info['assets']:
                return market_code
        return None

    def register_handlers(self):
        """Enregistre les handlers"""
        # Capturer tous les callbacks du module marché
        self.app.add_handler(CallbackQueryHandler(
            self.handle_callback,
            pattern="^(market_|chart_|chartgen_|news_|favorite_add_|trading_companion_|analyze_)"
        ))

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

        # Marché ouvert - lancer le scan avec animation
        loading = LoadingAnimation(query, "market")
        await loading.start()

        # Récupérer les actifs du marché
        assets = market_info.get('assets', [])

        # Analyser chaque actif (sans news pour performance)
        results = []
        for symbol in assets:
            try:
                # Scan rapide sans récupération des news
                analysis = await analyzer.analyze_asset(symbol, market_code, fetch_news=False)
                if analysis and analysis['score'] >= 40:  # Seuil minimum
                    results.append(analysis)
            except Exception as e:
                logger.debug(f"Erreur analyse {symbol}: {e}")
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

        # En-tête avec statistiques
        total_assets = len(results)
        avg_score = sum(r['score'] for r in results) / total_assets if total_assets > 0 else 0

        text = f"""
📊 **SCAN COMPLET - {market_info['name']}**

🎯 **{total_assets} actifs analysés**
📈 Score moyen: {avg_score:.1f}/100

━━━━━━━━━━━━━━━━━━━━

🏆 **CLASSEMENT PAR OPPORTUNITÉ**

"""

        keyboard = []

        # Afficher top 15 avec un meilleur formatage
        for i, result in enumerate(results[:15], 1):
            # Emojis
            score_emoji = get_score_emoji(result['score'])
            direction_emoji = EMOJI_DIRECTION.get(result['direction'], '⚪')
            asset_emoji = get_asset_emoji(result['symbol'])

            # Nom complet de l'actif
            asset_name = get_asset_display_name(result['symbol'])

            # Déterminer la couleur du signal
            if result['score'] >= 80:
                strength = "🔥 FORTE"
            elif result['score'] >= 70:
                strength = "💪 BONNE"
            elif result['score'] >= 60:
                strength = "👍 MOYENNE"
            else:
                strength = "⚠️ FAIBLE"

            # Ligne principale
            text += f"{i}. {asset_emoji} **{asset_name}**\n"
            text += f"   {score_emoji} Score: **{result['score']}/100** | {strength}\n"
            text += f"   {direction_emoji} {result['direction']} • {result['trend'].upper()}\n"
            text += f"   💰 Prix: **{format_price(result['current_price'])}**\n"
            text += f"\n"

            # Bouton pour chaque actif (nom court pour les boutons)
            btn_label = f"{asset_emoji} {asset_name[:20]}" if len(asset_name) > 20 else f"{asset_emoji} {asset_name}"
            keyboard.append([
                InlineKeyboardButton(
                    f"{i}. {btn_label} ({result['score']})",
                    callback_data=f"market_detail_{market_code}_{result['symbol']}"
                )
            ])

        text += """━━━━━━━━━━━━━━━━━━━━

💡 Cliquez sur un actif pour plus de détails
"""

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

        # Animation de chargement
        loading = LoadingAnimation(query, "analysis")
        await loading.start()

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

        # Nom complet et emoji de l'actif
        asset_emoji = get_asset_emoji(symbol)
        asset_name = get_asset_display_name(symbol)
        full_name = f"{asset_emoji} {asset_name}" if asset_name != symbol else f"{asset_emoji} {symbol}"

        # Récupérer les explications
        explanations = analysis.get('explanations', {})
        recommendations = analysis.get('recommendations', [])

        text = f"""
📊 **ANALYSE DÉTAILLÉE**

{full_name}
_Symbole: {symbol}_

{score_emoji} **Score IA: {analysis['score']:.0f}/100**
{get_score_label(analysis['score'])}

━━━━━━━━━━━━━━━━━━━━

💰 **Prix actuel:** {format_price(analysis['current_price'])}
📈 **Variation 24h:** {format_percent(analysis['price_change_1d'])}

{direction_emoji} **Direction suggérée:** {analysis['direction']}
{trend_emoji} **Tendance:** {analysis['trend'].upper()}

━━━━━━━━━━━━━━━━━━━━

📊 **INDICATEURS TECHNIQUES**

"""

        # RSI avec explication
        if 'rsi' in explanations:
            rsi_info = explanations['rsi']
            text += f"{rsi_info['emoji']} **RSI: {analysis['rsi']:.1f}** ({rsi_info['status']})\n"
            text += f"_{rsi_info['text']}_\n\n"
        else:
            text += f"• RSI: {analysis['rsi']:.1f}\n"

        # Volume avec explication
        if 'volume' in explanations:
            vol_info = explanations['volume']
            text += f"{vol_info['emoji']} **Volume: x{analysis['volume_ratio']:.2f}** ({vol_info['level']})\n"
            text += f"_{vol_info['text']}_\n\n"
        else:
            text += f"• Volume: x{analysis['volume_ratio']:.2f}\n"

        # Tendance avec explication
        if 'trend' in explanations:
            trend_info = explanations['trend']
            text += f"{trend_info['emoji']} **Tendance**\n"
            text += f"_{trend_info['text']}_\n\n"

        # Volatilité
        text += f"📉 **Volatilité (ATR):** {format_price(analysis['volatility'])}\n\n"

        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Niveaux clés avec explication
        if analysis['support'] and analysis['resistance']:
            text += f"🎯 **NIVEAUX CLÉS**\n"
            text += f"• Support: {format_price(analysis['support'])}\n"
            text += f"• Résistance: {format_price(analysis['resistance'])}\n"

            if 'levels' in explanations:
                levels_info = explanations['levels']
                text += f"\n{levels_info['emoji']} _{levels_info['text']}_\n"

            text += "\n━━━━━━━━━━━━━━━━━━━━\n\n"

        # Breakdown des scores
        text += f"📈 **DÉTAIL DES SCORES**\n\n"
        if 'scores_breakdown' in explanations:
            text += f"{explanations['scores_breakdown']}\n\n"

        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Type et risque
        text += f"🔍 **Type:** {OPPORTUNITY_TYPES.get(analysis['opportunity_type'], analysis['opportunity_type'])}\n"
        text += f"{risk_emoji} **Risque:** {analysis['risk_level'].upper()}\n\n"

        # Recommandations
        if recommendations:
            text += "💡 **RECOMMANDATIONS**\n\n"
            for rec in recommendations:
                text += f"{rec}\n"
            text += "\n━━━━━━━━━━━━━━━━━━━━\n\n"

        # Résumé technique
        text += f"📝 **Résumé:** {analysis['technical_summary']}\n"

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

    async def show_chart_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str):
        """Affiche le menu de selection d'intervalle pour le graphique"""
        query = update.callback_query
        await query.answer()

        keyboard = [
            [
                InlineKeyboardButton("1J", callback_data=f"chartgen_{symbol}_1D"),
                InlineKeyboardButton("1S", callback_data=f"chartgen_{symbol}_1W"),
                InlineKeyboardButton("1M", callback_data=f"chartgen_{symbol}_1M"),
            ],
            [
                InlineKeyboardButton("3M", callback_data=f"chartgen_{symbol}_3M"),
                InlineKeyboardButton("1A", callback_data=f"chartgen_{symbol}_1Y"),
                InlineKeyboardButton("MAX", callback_data=f"chartgen_{symbol}_MAX"),
            ],
            [InlineKeyboardButton("Retour", callback_data=f"asset_{self.find_market_for_symbol(symbol)}_{symbol}")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(
            f"📊 Graphique de {symbol}\n\n"
            f"Selectionnez l'intervalle de temps :\n\n"
            f"• 1J = 1 Jour (bougies 15min)\n"
            f"• 1S = 1 Semaine (bougies 1h)\n"
            f"• 1M = 1 Mois (bougies journalieres)\n"
            f"• 3M = 3 Mois (bougies journalieres)\n"
            f"• 1A = 1 An (bougies hebdomadaires)\n"
            f"• MAX = Historique complet",
            reply_markup=reply_markup
        )

    async def show_chart(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str, interval: str = '1M'):
        """Affiche le graphique d'un actif avec l'intervalle specifie"""
        query = update.callback_query
        await query.answer("Generation du graphique...")

        # Configuration des intervalles
        from services.charts import CHART_INTERVALS
        config_interval = CHART_INTERVALS.get(interval, CHART_INTERVALS['1M'])

        try:
            # Recuperer les donnees avec l'intervalle choisi
            data = await market_data_service.get_asset_data(
                symbol,
                period=config_interval['period'],
                interval=config_interval['interval']
            )

            if data is None or data.empty:
                await context.bot.send_message(
                    chat_id=query.message.chat_id,
                    text="Impossible de generer le graphique - donnees indisponibles."
                )
                return

            # Generer le graphique avec indicateurs et RSI
            chart = await chart_service.generate_candlestick_chart(
                data, symbol,
                indicators=['ema20', 'ema50', 'ema200'],
                interval_label=config_interval['label'],
                show_rsi=True
            )

            if chart:
                # Boutons pour changer d'intervalle rapidement
                keyboard = [
                    [
                        InlineKeyboardButton("1J", callback_data=f"chartgen_{symbol}_1D"),
                        InlineKeyboardButton("1S", callback_data=f"chartgen_{symbol}_1W"),
                        InlineKeyboardButton("1M", callback_data=f"chartgen_{symbol}_1M"),
                        InlineKeyboardButton("3M", callback_data=f"chartgen_{symbol}_3M"),
                        InlineKeyboardButton("1A", callback_data=f"chartgen_{symbol}_1Y"),
                    ],
                    [InlineKeyboardButton("Retour a l'actif", callback_data=f"asset_{self.find_market_for_symbol(symbol)}_{symbol}")]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)

                await context.bot.send_photo(
                    chat_id=query.message.chat_id,
                    photo=chart,
                    caption=f"📊 {symbol} - {config_interval['label']}\n"
                           f"📈 EMA: 🔵20  🟠50  🔴200\n"
                           f"📉 RSI (14) en bas",
                    reply_markup=reply_markup
                )
            else:
                await context.bot.send_message(
                    chat_id=query.message.chat_id,
                    text="Erreur lors de la generation du graphique."
                )

        except Exception as e:
            logger.error(f"Erreur generation graphique {symbol}: {e}")
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text="Erreur lors de la generation du graphique."
            )

    async def show_news(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str):
        """Affiche les actualités d'un actif avec résumé et prédiction de tendance"""
        query = update.callback_query
        await query.answer()

        # Animation de chargement recherche
        loading = LoadingAnimation(query, "search")
        await loading.start()

        # Récupérer l'analyse complète des actualités
        analysis = news_service.analyze_news_comprehensive(symbol)

        if not analysis.get('available', False):
            text = f"""
📰 **ACTUALITÉS - {symbol}**

❌ {analysis.get('message', 'Aucune actualité récente disponible')}

Pour plus d'informations, consultez :
• Google Finance : google.com/finance
• Yahoo Finance : finance.yahoo.com
• TradingView : tradingview.com

Recherchez : **{symbol}**
"""
        else:
            # Construire l'affichage détaillé
            sentiment = analysis['sentiment']
            future_trend = analysis['future_trend']

            text = f"📰 **ACTUALITÉS - {symbol}**\n\n"

            # Sentiment global
            text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
            text += f"{sentiment['emoji']} **SENTIMENT GLOBAL : {sentiment['label']}**\n"
            text += f"_{sentiment['description']}_\n\n"

            text += f"📊 Répartition : {analysis['positive_count']} positives • {analysis['negative_count']} négatives • {analysis['neutral_count']} neutres\n\n"

            # Points clés
            if analysis.get('key_points'):
                text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
                text += f"🔑 **POINTS CLÉS**\n\n"
                for point in analysis['key_points']:
                    text += f"{point}\n"
                text += "\n"

            # Résumé
            text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
            text += f"📝 **RÉSUMÉ**\n\n"
            text += f"{analysis['summary']}\n\n"

            # Prédiction de tendance future
            text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
            text += f"{future_trend['emoji']} **TENDANCE FUTURE PRÉVUE**\n\n"
            text += f"**Direction :** {future_trend['trend']}\n"
            text += f"**Confiance :** {future_trend['confidence']}\n\n"
            text += f"_{future_trend['description']}_\n\n"

            # Recommandation
            text += f"💡 **Recommandation :**\n{future_trend['recommendation']}\n\n"

            # Articles récents
            text += f"━━━━━━━━━━━━━━━━━━━━\n\n"
            text += f"📋 **DERNIÈRES ACTUALITÉS**\n\n"

            for i, article in enumerate(analysis.get('articles', [])[:5], 1):
                sentiment_info = article.get('sentiment', {})
                emoji = sentiment_info.get('emoji', '⚪')
                title = article['title']
                publisher = article.get('publisher', 'Source inconnue')
                link = article.get('link', '')

                # Date formatée
                try:
                    timestamp = article['published']
                    pub_date = datetime.fromtimestamp(timestamp)
                    now = datetime.now()
                    diff = now - pub_date

                    if diff.days == 0:
                        if diff.seconds < 3600:
                            time_str = f"Il y a {diff.seconds // 60}m"
                        else:
                            time_str = f"Il y a {diff.seconds // 3600}h"
                    elif diff.days == 1:
                        time_str = "Hier"
                    else:
                        time_str = f"Il y a {diff.days}j"
                except (ValueError, TypeError, KeyError):
                    time_str = "Récent"

                # Limiter le titre
                if len(title) > 85:
                    title = title[:82] + "..."

                text += f"{i}. {emoji} **{title}**\n"
                text += f"   _{publisher}_ • {time_str}\n"

                # Ajouter le lien si disponible
                if link:
                    text += f"   🔗 [Lire l'article]({link})\n"

                text += "\n"

        keyboard = [
            [InlineKeyboardButton("🔙 Retour à l'analyse", callback_data=f"market_detail_{context.user_data.get('current_market', 'USA')}_{symbol}")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown', disable_web_page_preview=True)

    async def show_market_summary(self, update: Update, context: ContextTypes.DEFAULT_TYPE, market_code: str):
        """Affiche le résumé d'un marché fermé"""
        query = update.callback_query
        await query.answer()

        market_info = config.MARKETS.get(market_code)
        if not market_info:
            await query.edit_message_text("❌ Marché inconnu")
            return

        # Animation de chargement
        loading = LoadingAnimation(query, "market")
        await loading.start()

        # Récupérer les actifs du marché
        assets = market_info.get('assets', [])[:10]  # Limiter à 10 pour le résumé

        # Analyser les actifs pour obtenir les données
        results = []
        for symbol in assets:
            try:
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")

                if hist.empty or len(hist) < 2:
                    continue

                last_close = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2]
                change_pct = ((last_close - prev_close) / prev_close) * 100
                volume = hist['Volume'].iloc[-1]

                results.append({
                    'symbol': symbol,
                    'price': last_close,
                    'change': change_pct,
                    'volume': volume
                })
            except Exception as e:
                continue

        if not results:
            await query.edit_message_text(
                f"❌ **Impossible de charger les données**\n\nLe marché {market_info['name']} est peut-être indisponible.",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton(BTN_BACK, callback_data="market_main")]
                ]),
                parse_mode='Markdown'
            )
            return

        # Trier par performance
        gainers = sorted([r for r in results if r['change'] > 0], key=lambda x: x['change'], reverse=True)[:3]
        losers = sorted([r for r in results if r['change'] < 0], key=lambda x: x['change'])[:3]

        # Calculer les stats globales
        avg_change = sum(r['change'] for r in results) / len(results) if results else 0
        positive_count = len([r for r in results if r['change'] > 0])
        negative_count = len([r for r in results if r['change'] < 0])

        # Construire le message
        text = f"""📊 **RÉSUMÉ - {market_info['name']}**
━━━━━━━━━━━━━━━━━━━━

🕐 **Marché actuellement fermé**

📈 **Performance moyenne:** {avg_change:+.2f}%
✅ En hausse: {positive_count} actifs
❌ En baisse: {negative_count} actifs

"""

        if gainers:
            text += "🏆 **Top Performers:**\n"
            for r in gainers:
                text += f"   • {r['symbol']}: {r['change']:+.2f}%\n"
            text += "\n"

        if losers:
            text += "📉 **Moins performants:**\n"
            for r in losers:
                text += f"   • {r['symbol']}: {r['change']:+.2f}%\n"
            text += "\n"

        text += """━━━━━━━━━━━━━━━━━━━━

💡 **Conseil:** Attendez l'ouverture du marché pour des analyses en temps réel."""

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data=f"market_summary_{market_code}")],
            [InlineKeyboardButton(BTN_BACK, callback_data="market_main")]
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
            if len(parts) >= 2:
                market_code = parts[0]
                symbol = parts[1]
                # Sauvegarder le marché actuel dans le contexte
                context.user_data['current_market'] = market_code
                await self.show_asset_detail(update, context, market_code, symbol)
            else:
                await query.answer("Erreur format", show_alert=True)

        elif data.startswith("chartgen_"):
            # Nouveau format: chartgen_SYMBOL_INTERVAL
            parts = data.replace("chartgen_", "").rsplit("_", 1)
            if len(parts) == 2:
                symbol = parts[0]
                interval = parts[1]
                await self.show_chart(update, context, symbol, interval)
            else:
                logger.warning(f"Format graphique invalide: {data}")
                await query.answer("Erreur format graphique", show_alert=True)

        elif data.startswith("chart_"):
            # Afficher menu de selection d'intervalle
            symbol = data.replace("chart_", "")
            await self.show_chart_menu(update, context, symbol)

        elif data.startswith("news_"):
            symbol = data.replace("news_", "")
            await self.show_news(update, context, symbol)

        elif data.startswith("favorite_add_"):
            parts = data.replace("favorite_add_", "").split("_", 1)
            if len(parts) >= 2:
                symbol = parts[0]
                market_code = parts[1]
                user_id = query.from_user.id
                await db_manager.add_favorite(user_id, symbol, market_code)
                await query.answer("⭐ Ajouté aux favoris !")
            else:
                await query.answer("Erreur format", show_alert=True)

        elif data.startswith("trading_companion_"):
            # Rediriger vers le Trading Compagnon
            parts = data.replace("trading_companion_", "").split("_", 1)
            if len(parts) >= 2:
                symbol = parts[0]
                market_code = parts[1]

                from ai.trading_companion import TradingCompanion
                companion = TradingCompanion(self.app)
                await companion.start_conversation(update, context, symbol, market_code)
            else:
                await query.answer("Erreur format", show_alert=True)

        elif data.startswith("analyze_"):
            # Analyser un actif depuis l'alerte de scan auto
            symbol = data.replace("analyze_", "")
            # Trouver le marché du symbole
            market_code = self.find_market_for_symbol(symbol)
            if market_code:
                await self.show_asset_detail(update, context, market_code, symbol)
            else:
                await query.answer("❌ Marché inconnu pour cet actif", show_alert=True)

        elif data.startswith("market_summary_"):
            # Résumé d'un marché fermé
            market_code = data.replace("market_summary_", "")
            await self.show_market_summary(update, context, market_code)
