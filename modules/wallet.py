"""
Module Wallet - Gestion du portefeuille virtuel (Paper Trading)
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, MessageHandler, filters, ConversationHandler
from database.manager import db_manager
from utils.helpers import *
from utils.constants import *
from utils.validators import *

# États de conversation
WAITING_BALANCE = 1

class WalletModule:
    """Module de gestion du wallet"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^wallet_"))

    async def show_wallet(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le wallet de l'utilisateur"""
        query = update.callback_query
        user_id = query.from_user.id if query else update.message.from_user.id

        # Récupérer le wallet
        wallet = await db_manager.get_wallet(user_id)

        if not wallet:
            # Créer le wallet s'il n'existe pas
            await db_manager.create_user(user_id)
            wallet = await db_manager.get_wallet(user_id)

        # Récupérer les positions ouvertes
        positions = await db_manager.get_open_positions(user_id)

        # Calculer le solde engagé
        engaged_balance = sum([p['amount'] for p in positions])

        # Calculer le PnL total des positions ouvertes
        total_position_pnl = sum([p['pnl'] for p in positions])

        text = f"""
💼 **MON WALLET**

━━━━━━━━━━━━━━━━━━━━

💰 **Solde total:** {format_price(wallet['balance'])} USD
✅ **Disponible:** {format_price(wallet['available_balance'])} USD
📊 **Engagé:** {format_price(engaged_balance)} USD

━━━━━━━━━━━━━━━━━━━━

📈 **Performances**

**Aujourd'hui:** {format_pnl(wallet['daily_pnl'])}
**Total:** {format_pnl(wallet['total_pnl'])}

**Positions ouvertes:** {len(positions)}
**PnL latent:** {format_pnl(total_position_pnl)}

━━━━━━━━━━━━━━━━━━━━

💡 **Infos:**
• Solde initial: {format_price(wallet['initial_balance'])} USD
• Dernier reset: {wallet['last_reset'][:10]}
"""

        keyboard = [
            [InlineKeyboardButton("📂 Positions ouvertes", callback_data="wallet_positions")],
            [InlineKeyboardButton("📊 Historique", callback_data="wallet_history")],
            [InlineKeyboardButton("✏️ Modifier le solde", callback_data="wallet_edit_balance")],
            [InlineKeyboardButton("♻️ Réinitialiser", callback_data="wallet_reset_confirm")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)

        if query:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')
        else:
            await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_positions(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche les positions ouvertes"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        positions = await db_manager.get_open_positions(user_id)

        if not positions:
            text = """
📂 **POSITIONS OUVERTES**

Aucune position ouverte pour le moment.

Utilisez le module Marché pour analyser et ouvrir des positions via le Trading Compagnon.
"""
            keyboard = [[InlineKeyboardButton(BTN_BACK, callback_data="wallet_main")]]
        else:
            text = f"""
📂 **POSITIONS OUVERTES** ({len(positions)})

"""
            keyboard = []

            for pos in positions:
                direction_emoji = EMOJI_DIRECTION[pos['direction']]
                pnl_emoji = "🟢" if pos['pnl'] >= 0 else "🔴"

                text += f"""
{direction_emoji} **{pos['asset_symbol']}** ({pos['direction']})
💰 Montant: {format_price(pos['amount'])} USD
{pnl_emoji} PnL: {format_pnl(pos['pnl'])} ({format_percent(pos['pnl_percent'])})
Code: `{pos['position_code']}`

"""
                # Bouton pour chaque position
                keyboard.append([
                    InlineKeyboardButton(
                        f"{pos['asset_symbol']} - {pos['position_code'][:6]}",
                        callback_data=f"position_detail_{pos['position_code']}"
                    )
                ])

            keyboard.append([InlineKeyboardButton(BTN_BACK, callback_data="wallet_main")])

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def show_position_detail(self, update: Update, context: ContextTypes.DEFAULT_TYPE, position_code: str):
        """Affiche le détail d'une position"""
        query = update.callback_query
        await query.answer()

        position = await db_manager.get_position(position_code)

        if not position:
            await query.answer("Position introuvable", show_alert=True)
            return

        direction_emoji = EMOJI_DIRECTION[position['direction']]
        pnl_emoji = "🟢" if position['pnl'] >= 0 else "🔴"

        text = f"""
🎫 **TICKET DE POSITION**

**Code:** `{position['position_code']}`

━━━━━━━━━━━━━━━━━━━━

{direction_emoji} **{position['asset_symbol']}** - {position['direction']}

💰 **Montant:** {format_price(position['amount'])} USD
📊 **Levier:** x{position['leverage']}

**Prix d'entrée:** {format_price(position['entry_price'])}
**Prix actuel:** {format_price(position['current_price'])}

🎯 **Take Profit:**
• TP1: {format_price(position['take_profit_1']) if position['take_profit_1'] else 'Non défini'}
• TP2: {format_price(position['take_profit_2']) if position['take_profit_2'] else 'Non défini'}

🛑 **Stop Loss:** {format_price(position['stop_loss']) if position['stop_loss'] else 'Non défini'}

━━━━━━━━━━━━━━━━━━━━

{pnl_emoji} **PnL:** {format_pnl(position['pnl'])}
{pnl_emoji} **PnL %:** {format_percent(position['pnl_percent'])}

📅 Ouvert le: {position['opened_at'][:16]}
"""

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data=f"position_detail_{position_code}")],
            [InlineKeyboardButton("❌ Fermer la position", callback_data=f"position_close_{position_code}")],
            [InlineKeyboardButton(BTN_BACK, callback_data="wallet_positions")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def close_position(self, update: Update, context: ContextTypes.DEFAULT_TYPE, position_code: str):
        """Ferme une position"""
        query = update.callback_query

        # Récupérer la position
        position = await db_manager.get_position(position_code)

        if not position or position['status'] != 'open':
            await query.answer("Position déjà fermée ou introuvable", show_alert=True)
            return

        # Récupérer le prix actuel
        from services.market_data import market_data_service
        current_price = await market_data_service.get_current_price(position['asset_symbol'])

        if not current_price:
            current_price = position['current_price']

        # Fermer la position
        pnl, pnl_percent = await db_manager.close_position(position_code, current_price, "manual")

        # Mettre à jour le wallet
        user_id = query.from_user.id
        wallet = await db_manager.get_wallet(user_id)

        new_balance = wallet['balance'] + pnl
        new_available = wallet['available_balance'] + position['amount'] + pnl
        new_daily_pnl = wallet['daily_pnl'] + pnl
        new_total_pnl = wallet['total_pnl'] + pnl

        await db_manager.update_wallet(
            user_id,
            balance=new_balance,
            available_balance=new_available,
            daily_pnl=new_daily_pnl,
            total_pnl=new_total_pnl
        )

        pnl_emoji = "🟢" if pnl >= 0 else "🔴"

        await query.answer(f"{pnl_emoji} Position fermée !", show_alert=True)

        # Afficher le résumé
        text = f"""
✅ **POSITION FERMÉE**

**{position['asset_symbol']}** - {position['direction']}

{pnl_emoji} **Résultat:** {format_pnl(pnl)}
{pnl_emoji} **Performance:** {format_percent(pnl_percent)}

Nouveau solde: {format_price(new_balance)} USD
"""

        keyboard = [[InlineKeyboardButton(BTN_BACK, callback_data="wallet_main")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def reset_wallet_confirm(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Demande confirmation pour réinitialiser le wallet"""
        query = update.callback_query
        await query.answer()

        text = """
⚠️ **RÉINITIALISER LE WALLET**

Êtes-vous sûr de vouloir réinitialiser votre wallet ?

Cette action va :
• Remettre votre solde au montant initial
• Fermer toutes vos positions ouvertes
• Réinitialiser vos statistiques

⚠️ Cette action est irréversible !
"""

        keyboard = [
            [InlineKeyboardButton("✅ Oui, réinitialiser", callback_data="wallet_reset_yes")],
            [InlineKeyboardButton("❌ Annuler", callback_data="wallet_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def reset_wallet(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Réinitialise le wallet"""
        query = update.callback_query
        user_id = query.from_user.id

        # Fermer toutes les positions
        positions = await db_manager.get_open_positions(user_id)
        for pos in positions:
            await db_manager.close_position(pos['position_code'], pos['current_price'], "reset")

        # Réinitialiser le wallet
        await db_manager.reset_wallet(user_id)

        await query.answer("✅ Wallet réinitialisé !", show_alert=True)
        await self.show_wallet(update, context)

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks du wallet"""
        query = update.callback_query
        data = query.data

        if data == "wallet_main":
            await self.show_wallet(update, context)

        elif data == "wallet_positions":
            await self.show_positions(update, context)

        elif data.startswith("position_detail_"):
            position_code = data.replace("position_detail_", "")
            await self.show_position_detail(update, context, position_code)

        elif data.startswith("position_close_"):
            position_code = data.replace("position_close_", "")
            await self.close_position(update, context, position_code)

        elif data == "wallet_reset_confirm":
            await self.reset_wallet_confirm(update, context)

        elif data == "wallet_reset_yes":
            await self.reset_wallet(update, context)
