"""
Module Favoris - Gestion des actifs favoris avec alertes personnalisees
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, MessageHandler, filters, ApplicationHandlerStop
from database.manager import db_manager
from ai.analyzer import analyzer
from utils.helpers import *
from utils.constants import *
from utils.asset_names import get_asset_display_name, get_asset_emoji, find_symbol_from_name
import logging

logger = logging.getLogger(__name__)


class FavoritesModule:
    """Module de gestion des favoris avec alertes"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()
        # Cache pour les recherches en cours
        self._search_pending = {}

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^fav_"))
        # Handler pour la recherche par nom (priorite haute, groupe -1)
        self.app.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            self._handle_search_message
        ), group=-1)

    async def show_favorites(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les favoris de l'utilisateur avec seuils d'alerte"""
        query = update.callback_query
        user_id = query.from_user.id if query else update.message.from_user.id

        # Utiliser smart_watchlist qui contient les seuils
        watchlist = await db_manager.get_smart_watchlist(user_id)

        if not watchlist:
            text = """
⭐ **MES FAVORIS**
━━━━━━━━━━━━━━━━━━━━

_Tu n'as pas encore d'actifs favoris._

Ajoute des actifs pour recevoir des alertes quand ils bougent !

💡 **Comment ca marche ?**
1. Clique sur "➕ Ajouter un actif"
2. Choisis un actif
3. Definis ton seuil d'alerte (ex: 5%)
4. Recois une notif si l'actif varie de +/-5%
"""
            keyboard = [
                [InlineKeyboardButton("➕ Ajouter un actif", callback_data="fav_search")],
                [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
            ]
        else:
            from services.market_data import market_data_service

            text = f"⭐ **MES FAVORIS** ({len(watchlist)})\n"
            text += "━━━━━━━━━━━━━━━━━━━━\n\n"

            keyboard = []
            for item in watchlist:
                symbol = item['asset_symbol']
                threshold = item.get('alert_threshold', 5.0)
                last_price = item.get('last_price', 0)

                emoji = get_asset_emoji(symbol)
                name = get_asset_display_name(symbol)

                # Recuperer le prix actuel
                current_price = await market_data_service.get_current_price(symbol)
                if current_price:
                    price_low = current_price * (1 - threshold / 100)
                    price_high = current_price * (1 + threshold / 100)
                    text += f"{emoji} **{name}**\n"
                    text += f"   Prix: {format_price(current_price)}\n"
                    text += f"   Alerte: ±{threshold:.0f}% ({format_price(price_low)} - {format_price(price_high)})\n\n"
                else:
                    text += f"{emoji} **{name}** — seuil: ±{threshold:.0f}%\n\n"

                keyboard.append([
                    InlineKeyboardButton(
                        f"{emoji} {name}",
                        callback_data=f"fav_detail_{symbol}_{item.get('market', 'USA')}"
                    )
                ])

            text += "━━━━━━━━━━━━━━━━━━━━\n"
            text += "🔔 _Tu seras notifie si un actif depasse son seuil._"

            keyboard.append([InlineKeyboardButton("➕ Ajouter un actif", callback_data="fav_search")])
            keyboard.append([InlineKeyboardButton("⚙️ Parametres", callback_data="fav_settings")])
            keyboard.append([InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")])

        reply_markup = InlineKeyboardMarkup(keyboard)

        if query:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_search_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le menu de recherche d'actifs"""
        query = update.callback_query
        await query.answer()

        text = """
🔍 **AJOUTER UN ACTIF**
━━━━━━━━━━━━━━━━━━━━

Choisis une categorie ou recherche par nom :
"""

        keyboard = [
            [
                InlineKeyboardButton("🇺🇸 Actions US", callback_data="fav_cat_USA"),
                InlineKeyboardButton("🇫🇷 Actions FR", callback_data="fav_cat_EUROPE")
            ],
            [
                InlineKeyboardButton("₿ Crypto", callback_data="fav_cat_CRYPTO"),
                InlineKeyboardButton("💱 Forex", callback_data="fav_cat_FOREX")
            ],
            [
                InlineKeyboardButton("🔎 Recherche par nom", callback_data="fav_manual_search")
            ],
            [InlineKeyboardButton("◀️ Retour", callback_data="fav_main")]
        ]

        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    async def show_category_assets(self, update: Update, context: ContextTypes.DEFAULT_TYPE, market: str):
        """Affiche les actifs d'une categorie"""
        query = update.callback_query

        from config import MARKETS

        market_data = MARKETS.get(market, {})
        assets = market_data.get("assets", [])

        market_names = {
            "USA": "🇺🇸 Actions US",
            "EUROPE": "🇫🇷 Actions Europeennes",
            "CRYPTO": "₿ Cryptomonnaies",
            "FOREX": "💱 Forex"
        }

        text = f"""
{market_names.get(market, market)}
━━━━━━━━━━━━━━━━━━━━

Selectionne l'actif a ajouter :
"""

        keyboard = []
        row = []
        for i, symbol in enumerate(assets[:20]):  # Max 20 actifs
            emoji = get_asset_emoji(symbol)
            name = get_asset_display_name(symbol)
            short_name = name[:12] + "..." if len(name) > 15 else name

            row.append(InlineKeyboardButton(
                f"{emoji} {short_name}",
                callback_data=f"fav_add_{symbol}_{market}"
            ))

            if len(row) == 2:
                keyboard.append(row)
                row = []

        if row:
            keyboard.append(row)

        keyboard.append([InlineKeyboardButton("◀️ Retour", callback_data="fav_search")])

        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    async def show_threshold_selection(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                       symbol: str, market: str):
        """Permet de choisir le seuil d'alerte pour un actif"""
        query = update.callback_query
        await query.answer()

        from services.market_data import market_data_service

        emoji = get_asset_emoji(symbol)
        name = get_asset_display_name(symbol)

        # Prix actuel
        current_price = await market_data_service.get_current_price(symbol)

        text = f"""
⚙️ **SEUIL D'ALERTE**
━━━━━━━━━━━━━━━━━━━━

{emoji} **{name}** ({symbol})
"""
        if current_price:
            text += f"Prix actuel: {format_price(current_price)}\n\n"
        else:
            text += "\n"

        text += """
Choisis le seuil de variation pour recevoir une alerte :

• **3%** - Alertes frequentes
• **5%** - Equilibre (recommande)
• **10%** - Mouvements importants
• **15%** - Mouvements majeurs
"""

        keyboard = [
            [
                InlineKeyboardButton("3%", callback_data=f"fav_confirm_{symbol}_{market}_3"),
                InlineKeyboardButton("5% ✓", callback_data=f"fav_confirm_{symbol}_{market}_5"),
            ],
            [
                InlineKeyboardButton("10%", callback_data=f"fav_confirm_{symbol}_{market}_10"),
                InlineKeyboardButton("15%", callback_data=f"fav_confirm_{symbol}_{market}_15"),
            ],
            [InlineKeyboardButton("◀️ Annuler", callback_data="fav_search")]
        ]

        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    async def add_to_favorites(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                               symbol: str, market: str, threshold: float):
        """Ajoute un actif aux favoris avec seuil"""
        query = update.callback_query
        user_id = query.from_user.id

        from services.market_data import market_data_service

        # Prix actuel
        current_price = await market_data_service.get_current_price(symbol) or 0

        # Ajouter dans smart_watchlist
        await db_manager.add_to_smart_watchlist(user_id, symbol, market, threshold, current_price)

        # Aussi dans favorites pour compatibilite
        await db_manager.add_favorite(user_id, symbol, market)

        emoji = get_asset_emoji(symbol)
        name = get_asset_display_name(symbol)

        await query.answer(f"✅ {name} ajoute avec alerte a ±{threshold}%", show_alert=True)

        # Retour a la liste
        await self.show_favorites(update, context)

    async def show_favorite_detail(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                  symbol: str, market: str):
        """Affiche le detail d'un favori avec options"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        emoji = get_asset_emoji(symbol)
        name = get_asset_display_name(symbol)

        await query.edit_message_text(f"🔍 Chargement de {name}...", parse_mode='Markdown')

        # Recuperer le seuil actuel
        watchlist = await db_manager.get_smart_watchlist(user_id)
        current_threshold = 5.0
        for item in watchlist:
            if item['asset_symbol'] == symbol:
                current_threshold = item.get('alert_threshold', 5.0)
                break

        # Analyser l'actif
        from services.market_data import market_data_service
        current_price = await market_data_service.get_current_price(symbol)

        text = f"""
{emoji} **{name}**
━━━━━━━━━━━━━━━━━━━━

"""
        if current_price:
            price_low = current_price * (1 - current_threshold / 100)
            price_high = current_price * (1 + current_threshold / 100)
            text += f"💰 **Prix actuel:** {format_price(current_price)}\n\n"
            text += f"🔔 **Seuil d'alerte:** ±{current_threshold:.0f}%\n"
            text += f"📊 **Alerte si:** < {format_price(price_low)} ou > {format_price(price_high)}\n"
        else:
            text += f"🔔 **Seuil d'alerte:** ±{current_threshold:.0f}%\n"

        text += "\n━━━━━━━━━━━━━━━━━━━━"

        keyboard = [
            [InlineKeyboardButton("📊 Analyser", callback_data=f"market_detail_{market}_{symbol}")],
            [InlineKeyboardButton("⚙️ Modifier le seuil", callback_data=f"fav_edit_threshold_{symbol}_{market}")],
            [InlineKeyboardButton("❌ Retirer des favoris", callback_data=f"fav_remove_{symbol}")],
            [InlineKeyboardButton("◀️ Retour", callback_data="fav_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_edit_threshold(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                  symbol: str, market: str):
        """Permet de modifier le seuil d'un favori existant"""
        query = update.callback_query
        await query.answer()

        emoji = get_asset_emoji(symbol)
        name = get_asset_display_name(symbol)

        text = f"""
⚙️ **MODIFIER LE SEUIL**
━━━━━━━━━━━━━━━━━━━━

{emoji} **{name}**

Choisis le nouveau seuil de variation :
"""

        keyboard = [
            [
                InlineKeyboardButton("3%", callback_data=f"fav_update_threshold_{symbol}_{market}_3"),
                InlineKeyboardButton("5%", callback_data=f"fav_update_threshold_{symbol}_{market}_5"),
            ],
            [
                InlineKeyboardButton("7%", callback_data=f"fav_update_threshold_{symbol}_{market}_7"),
                InlineKeyboardButton("10%", callback_data=f"fav_update_threshold_{symbol}_{market}_10"),
            ],
            [
                InlineKeyboardButton("15%", callback_data=f"fav_update_threshold_{symbol}_{market}_15"),
                InlineKeyboardButton("20%", callback_data=f"fav_update_threshold_{symbol}_{market}_20"),
            ],
            [InlineKeyboardButton("◀️ Annuler", callback_data=f"fav_detail_{symbol}_{market}")]
        ]

        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    async def update_threshold(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                              symbol: str, market: str, threshold: float):
        """Met a jour le seuil d'un favori"""
        query = update.callback_query
        user_id = query.from_user.id

        import aiosqlite
        from config import DATABASE_PATH

        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                await db.execute("""
                    UPDATE smart_watchlist SET alert_threshold = ?
                    WHERE telegram_id = ? AND asset_symbol = ?
                """, (threshold, user_id, symbol))
                await db.commit()

            name = get_asset_display_name(symbol)
            await query.answer(f"✅ Seuil de {name} mis a {threshold}%", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Erreur: {e}", show_alert=True)

        await self.show_favorite_detail(update, context, symbol, market)

    async def remove_favorite(self, update: Update, context: ContextTypes.DEFAULT_TYPE, symbol: str):
        """Retire un actif des favoris"""
        query = update.callback_query
        user_id = query.from_user.id

        # Supprimer des deux tables
        await db_manager.remove_favorite(user_id, symbol)
        await db_manager.remove_from_smart_watchlist(user_id, symbol)

        name = get_asset_display_name(symbol)
        await query.answer(f"✅ {name} retire des favoris", show_alert=True)

        await self.show_favorites(update, context)

    async def show_favorites_settings(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les parametres des favoris"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        watchlist = await db_manager.get_smart_watchlist(user_id)

        text = f"""
⚙️ **PARAMETRES FAVORIS**
━━━━━━━━━━━━━━━━━━━━

📊 **Actifs suivis:** {len(watchlist)}

**🔔 Comment ca marche ?**
Tu recois une notification Telegram quand un de tes actifs varie au-dela de son seuil defini.

**Exemples:**
• Apple avec seuil 5% : alerte si +5% ou -5%
• Bitcoin avec seuil 10% : alerte si +10% ou -10%

_Chaque actif peut avoir son propre seuil._
"""

        keyboard = [
            [InlineKeyboardButton("🗑️ Vider tous les favoris", callback_data="fav_clear_all")],
            [InlineKeyboardButton("◀️ Retour", callback_data="fav_main")]
        ]

        await query.edit_message_text(
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

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

            await query.answer("✅ Tous les favoris ont ete supprimes", show_alert=True)
        except Exception as e:
            await query.answer(f"❌ Erreur: {e}", show_alert=True)

        await self.show_favorites(update, context)

    async def show_manual_search(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Lance une recherche manuelle"""
        query = update.callback_query
        user_id = query.from_user.id
        await query.answer()

        # Marquer que l'utilisateur est en mode recherche
        self._search_pending[user_id] = True

        text = """
🔎 **RECHERCHE D'ACTIF**
━━━━━━━━━━━━━━━━━━━━

Envoie le nom de l'actif que tu cherches :

**Exemples:**
• _Apple_
• _Tesla_
• _Bitcoin_
• _Air Liquide_
• _EUR/USD_

"""

        keyboard = [[InlineKeyboardButton("❌ Annuler", callback_data="fav_search")]]

        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    async def handle_search_input(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
        """Gere la saisie de recherche (appele depuis ai_assistant)"""
        user_id = update.message.from_user.id

        if user_id not in self._search_pending:
            return False

        del self._search_pending[user_id]

        search_query = update.message.text.strip()
        symbol, market = find_symbol_from_name(search_query)

        if symbol:
            emoji = get_asset_emoji(symbol)
            name = get_asset_display_name(symbol)

            text = f"""
✅ **Actif trouve !**

{emoji} **{name}** ({symbol})
Marche: {market}

Choisis le seuil d'alerte :
"""

            keyboard = [
                [
                    InlineKeyboardButton("3%", callback_data=f"fav_confirm_{symbol}_{market}_3"),
                    InlineKeyboardButton("5% ✓", callback_data=f"fav_confirm_{symbol}_{market}_5"),
                ],
                [
                    InlineKeyboardButton("10%", callback_data=f"fav_confirm_{symbol}_{market}_10"),
                    InlineKeyboardButton("15%", callback_data=f"fav_confirm_{symbol}_{market}_15"),
                ],
                [InlineKeyboardButton("🔍 Autre recherche", callback_data="fav_manual_search")],
                [InlineKeyboardButton("◀️ Retour", callback_data="fav_search")]
            ]
        else:
            text = f"""
❌ **Actif non trouve**

Aucun actif correspondant a "{search_query}".

**Essaie avec:**
• Le nom complet (ex: "Apple")
• Le symbole (ex: "AAPL")
• Un nom partiel (ex: "Liqui" pour Air Liquide)

_Si l'actif n'est pas disponible, tu peux demander son ajout._
"""
            # Encoder la recherche pour le callback (max 64 chars)
            search_encoded = search_query[:30].replace(" ", "_")

            keyboard = [
                [InlineKeyboardButton("🔍 Nouvelle recherche", callback_data="fav_manual_search")],
                [InlineKeyboardButton("📋 Voir les categories", callback_data="fav_search")],
                [InlineKeyboardButton(f"📩 Demander l'ajout de \"{search_query[:15]}\"", callback_data=f"fav_request_{search_encoded}")],
                [InlineKeyboardButton("◀️ Retour", callback_data="fav_main")]
            ]

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return True

    async def _handle_search_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handler de messages pour la recherche d'actifs"""
        if not update.message or not update.message.text:
            return  # Laisser passer aux autres handlers

        user_id = update.message.from_user.id

        # Verifier si une recherche est en attente pour cet utilisateur
        if user_id not in self._search_pending:
            return  # Pas de recherche en attente, laisser passer

        logger.info(f"Recherche favoris pour user {user_id}: {update.message.text}")

        # Envoyer un indicateur de traitement
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")

        # Traiter la recherche
        await self.handle_search_input(update, context)
        # Lever une exception pour arreter la propagation aux autres handlers
        raise ApplicationHandlerStop()

    async def handle_asset_request(self, update: Update, context: ContextTypes.DEFAULT_TYPE, asset_name: str):
        """Gere la demande d'ajout d'un actif"""
        query = update.callback_query
        user_id = query.from_user.id
        username = query.from_user.username or query.from_user.first_name

        # Enregistrer la demande dans la base de donnees
        import aiosqlite
        from config import DATABASE_PATH

        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS asset_requests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        telegram_id INTEGER,
                        username TEXT,
                        asset_name TEXT,
                        status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                await db.execute("""
                    INSERT INTO asset_requests (telegram_id, username, asset_name)
                    VALUES (?, ?, ?)
                """, (user_id, username, asset_name))
                await db.commit()

            text = f"""
✅ **Demande envoyee !**

Ta demande pour ajouter **"{asset_name}"** a ete enregistree.

L'equipe examinera ta demande et l'actif sera ajoute s'il est disponible sur les marches supportes.

_Merci pour ta contribution !_
"""
        except Exception as e:
            logger.error(f"Erreur demande actif: {e}")
            text = f"""
❌ **Erreur**

Impossible d'enregistrer ta demande. Reessaie plus tard.
"""

        keyboard = [
            [InlineKeyboardButton("🔍 Nouvelle recherche", callback_data="fav_manual_search")],
            [InlineKeyboardButton("◀️ Retour aux favoris", callback_data="fav_main")]
        ]

        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

    def is_search_pending(self, user_id: int) -> bool:
        """Verifie si une recherche est en attente pour cet utilisateur"""
        return user_id in self._search_pending

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gere les callbacks"""
        query = update.callback_query
        await query.answer()  # Repondre immediatement pour eviter timeout
        data = query.data

        if data == "fav_main":
            await self.show_favorites(update, context)

        elif data == "fav_search":
            await self.show_search_menu(update, context)

        elif data == "fav_manual_search":
            await self.show_manual_search(update, context)

        elif data.startswith("fav_cat_"):
            market = data.replace("fav_cat_", "")
            await self.show_category_assets(update, context, market)

        elif data.startswith("fav_add_"):
            parts = data.replace("fav_add_", "").split("_")
            symbol = parts[0]
            market = parts[1] if len(parts) > 1 else "USA"
            await self.show_threshold_selection(update, context, symbol, market)

        elif data.startswith("fav_confirm_"):
            parts = data.replace("fav_confirm_", "").split("_")
            symbol = parts[0]
            market = parts[1] if len(parts) > 1 else "USA"
            threshold = float(parts[2]) if len(parts) > 2 else 5.0
            await self.add_to_favorites(update, context, symbol, market, threshold)

        elif data == "fav_settings":
            await self.show_favorites_settings(update, context)

        elif data == "fav_clear_all":
            await self.clear_all_favorites(update, context)

        elif data.startswith("fav_detail_"):
            parts = data.replace("fav_detail_", "").split("_", 1)
            symbol = parts[0]
            market = parts[1] if len(parts) > 1 else "USA"
            await self.show_favorite_detail(update, context, symbol, market)

        elif data.startswith("fav_edit_threshold_"):
            parts = data.replace("fav_edit_threshold_", "").split("_")
            symbol = parts[0]
            market = parts[1] if len(parts) > 1 else "USA"
            await self.show_edit_threshold(update, context, symbol, market)

        elif data.startswith("fav_update_threshold_"):
            parts = data.replace("fav_update_threshold_", "").split("_")
            symbol = parts[0]
            market = parts[1] if len(parts) > 1 else "USA"
            threshold = float(parts[2]) if len(parts) > 2 else 5.0
            await self.update_threshold(update, context, symbol, market, threshold)

        elif data.startswith("fav_remove_"):
            symbol = data.replace("fav_remove_", "")
            await self.remove_favorite(update, context, symbol)

        elif data.startswith("fav_request_"):
            asset_name = data.replace("fav_request_", "").replace("_", " ")
            await self.handle_asset_request(update, context, asset_name)
