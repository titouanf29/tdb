"""
Module Favoris - Gestion des actifs favoris
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
from database.manager import db_manager
from ai.analyzer import analyzer
from utils.helpers import *
from utils.constants import *

class FavoritesModule:
    """Module de gestion des favoris"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^fav_"))

    async def show_favorites(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les favoris de l'utilisateur"""
        query = update.callback_query
        user_id = query.from_user.id if query else update.message.from_user.id

        favorites = await db_manager.get_favorites(user_id)

        if not favorites:
            text = """
⭐ **MES FAVORIS**

Vous n'avez pas encore d'actifs favoris.

Ajoutez des actifs depuis le module Marché pour créer votre watchlist personnalisée.
"""
            keyboard = [[InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]]
        else:
            text = f"""
⭐ **MES FAVORIS** ({len(favorites)})

Voici vos actifs suivis :

"""
            keyboard = []

            for fav in favorites:
                # Récupérer prix actuel rapidement
                from services.market_data import market_data_service
                price = await market_data_service.get_current_price(fav['asset_symbol'])

                if price:
                    text += f"\n📊 **{fav['asset_symbol']}** - {format_price(price)}"
                else:
                    text += f"\n📊 **{fav['asset_symbol']}**"

                keyboard.append([
                    InlineKeyboardButton(
                        f"📊 {fav['asset_symbol']}",
                        callback_data=f"fav_detail_{fav['asset_symbol']}_{fav['market']}"
                    )
                ])

            keyboard.append([InlineKeyboardButton("⚙️ Paramètres Favoris", callback_data="fav_settings")])
            keyboard.append([InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")])

        reply_markup = InlineKeyboardMarkup(keyboard)

        if query:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_favorite_detail(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                  symbol: str, market: str):
        """Affiche le détail d'un favori"""
        query = update.callback_query
        await query.answer()

        await query.edit_message_text(f"🔍 Analyse de {symbol}...", parse_mode='Markdown')

        # Analyser l'actif
        analysis = await analyzer.analyze_asset(symbol, market)

        if not analysis:
            await query.edit_message_text(
                "❌ Impossible d'analyser cet actif.",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton(BTN_BACK, callback_data="fav_main")
                ]])
            )
            return

        score_emoji = get_score_emoji(analysis['score'])
        direction_emoji = EMOJI_DIRECTION[analysis['direction']]
        trend_emoji = EMOJI_TREND[analysis['trend']]

        text = f"""
⭐ **FAVORI - {symbol}**

{score_emoji} **Score:** {analysis['score']}/100
{direction_emoji} **Direction:** {analysis['direction']}
{trend_emoji} **Tendance:** {analysis['trend'].upper()}

💰 **Prix:** {format_price(analysis['current_price'])}
📈 **Variation 24h:** {format_percent(analysis['price_change_1d'])}

📊 **Résumé:** {analysis['technical_summary']}
"""

        keyboard = [
            [InlineKeyboardButton("📊 Analyse complète", callback_data=f"market_detail_{market}_{symbol}")],
            [InlineKeyboardButton("🤖 Trading Compagnon", callback_data=f"trading_companion_{symbol}_{market}")],
            [InlineKeyboardButton("❌ Retirer des favoris", callback_data=f"fav_remove_{symbol}")],
            [InlineKeyboardButton(BTN_BACK, callback_data="fav_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def remove_favorite(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str):
        """Retire un actif des favoris"""
        query = update.callback_query
        user_id = query.from_user.id

        await db_manager.remove_favorite(user_id, symbol)
        await query.answer(f"✅ {symbol} retiré des favoris", show_alert=True)

        await self.show_favorites(update, context)

    async def show_favorites_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les paramètres des favoris"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id

        # Récupérer les paramètres actuels
        import aiosqlite
        from config import DATABASE_PATH

        settings = {
            'alert_enabled': True,
            'alert_threshold': 5.0,
            'daily_summary': True
        }

        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                cursor = await db.execute("""
                    SELECT alert_threshold FROM smart_watchlist
                    WHERE telegram_id = ? LIMIT 1
                """, (user_id,))
                row = await cursor.fetchone()
                if row:
                    settings['alert_threshold'] = row[0]
        except Exception:
            pass

        favorites_count = len(await db_manager.get_favorites(user_id))

        text = f"""
⚙️ **PARAMÈTRES FAVORIS**
━━━━━━━━━━━━━━━━━━━━

📊 **Actifs suivis:** {favorites_count}

**🔔 Alertes:**
• Seuil d'alerte: **{settings['alert_threshold']:.1f}%** de variation
• Alertes actives: {'✅ Oui' if settings['alert_enabled'] else '❌ Non'}

**📧 Notifications:**
• Résumé quotidien: {'✅ Oui' if settings['daily_summary'] else '❌ Non'}

_Utilisez les boutons ci-dessous pour modifier les paramètres._
"""

        keyboard = [
            [
                InlineKeyboardButton("🔔 Seuil 3%", callback_data="fav_set_threshold_3"),
                InlineKeyboardButton("🔔 Seuil 5%", callback_data="fav_set_threshold_5"),
                InlineKeyboardButton("🔔 Seuil 10%", callback_data="fav_set_threshold_10")
            ],
            [
                InlineKeyboardButton("🗑️ Vider tous les favoris", callback_data="fav_clear_all")
            ],
            [InlineKeyboardButton("◀️ Retour", callback_data="fav_main")]
        ]

        await query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

    async def set_alert_threshold(self, update: Update, context: ContextTypes.DEFAULT_TYPE, threshold: float):
        """Modifie le seuil d'alerte"""
        query = update.callback_query
        user_id = query.from_user.id

        import aiosqlite
        from config import DATABASE_PATH

        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                # Mettre à jour le seuil pour tous les favoris
                await db.execute("""
                    UPDATE smart_watchlist SET alert_threshold = ?
                    WHERE telegram_id = ?
                """, (threshold, user_id))
                await db.commit()

            await query.answer(f"✅ Seuil d'alerte mis à {threshold}%", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Erreur: {e}", show_alert=True)

        await self.show_favorites_settings(update, context)

    async def clear_all_favorites(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Supprime tous les favoris"""
        query = update.callback_query
        user_id = query.from_user.id

        import aiosqlite
        from config import DATABASE_PATH

        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                await db.execute("DELETE FROM favorites WHERE telegram_id = ?", (user_id,))
                await db.execute("DELETE FROM smart_watchlist WHERE telegram_id = ?", (user_id,))
                await db.commit()

            await query.answer("✅ Tous les favoris ont été supprimés", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Erreur: {e}", show_alert=True)

        await self.show_favorites(update, context)

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks"""
        query = update.callback_query
        data = query.data

        if data == "fav_main":
            await self.show_favorites(update, context)

        elif data == "fav_settings":
            await self.show_favorites_settings(update, context)

        elif data.startswith("fav_set_threshold_"):
            threshold = float(data.replace("fav_set_threshold_", ""))
            await self.set_alert_threshold(update, context, threshold)

        elif data == "fav_clear_all":
            await self.clear_all_favorites(update, context)

        elif data.startswith("fav_detail_"):
            parts = data.replace("fav_detail_", "").split("_", 1)
            symbol = parts[0]
            market = parts[1]
            await self.show_favorite_detail(update, context, symbol, market)

        elif data.startswith("fav_remove_"):
            symbol = data.replace("fav_remove_", "")
            await self.remove_favorite(update, context, symbol)
