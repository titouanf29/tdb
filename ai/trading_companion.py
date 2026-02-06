"""
Trading Compagnon IA - Assistant conversationnel pour le paper trading
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, MessageHandler, filters
from database.manager import db_manager
from services.market_data import market_data_service
from utils.helpers import *
from utils.validators import *
from utils.constants import *

logger = logging.getLogger(__name__)

# États de conversation
STATE_AMOUNT = "waiting_amount"
STATE_DIRECTION = "waiting_direction"
STATE_LEVERAGE = "waiting_leverage"
STATE_CONFIRM = "waiting_confirm"

class TradingCompanion:
    """IA conversationnelle pour accompagner le trading"""

    def __init__(self, application):
        self.app = application
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CallbackQueryHandler(self.handle_callback, pattern="^tc_"))
        # Groupe 0 = priorité haute, traité AVANT le Wallet (groupe 1)
        self.app.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            self.handle_text_input
        ), group=0)

    async def start_conversation(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                symbol: str, market: str):
        """Démarre la conversation pour une position"""
        query = update.callback_query
        user_id = query.from_user.id

        # Récupérer le wallet
        wallet = await db_manager.get_wallet(user_id)

        if not wallet:
            await db_manager.create_user(user_id)
            wallet = await db_manager.get_wallet(user_id)

        # Récupérer le prix actuel
        current_price = await market_data_service.get_current_price(symbol)

        if not current_price:
            await query.answer("❌ Impossible de récupérer le prix actuel", show_alert=True)
            return

        # Initialiser l'état de conversation
        await db_manager.set_conversation_state(
            user_id,
            STATE_AMOUNT,
            context={
                'step': 'amount',
                'current_price': current_price
            },
            asset_symbol=symbol,
            market=market
        )

        logger.info(f"🤖 Trading Companion: Conversation démarrée pour user {user_id} sur {symbol}")

        text = f"""
🤖 **TRADING COMPAGNON**

Bienvenue ! Je vais vous accompagner pour ouvrir une position sur **{symbol}**.

━━━━━━━━━━━━━━━━━━━━

💰 **Prix actuel:** {format_price(current_price)}
💼 **Solde disponible:** {format_price(wallet['available_balance'])} USD

━━━━━━━━━━━━━━━━━━━━

**Étape 1/3: Montant**

Quel montant souhaitez-vous investir ?

💡 Écrivez simplement le montant dans le chat (ex: 1000)
"""

        keyboard = [
            [InlineKeyboardButton("❌ Annuler", callback_data="tc_cancel")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_text_input(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les entrées texte de l'utilisateur"""
        user_id = update.message.from_user.id
        text = update.message.text.strip()

        logger.debug(f"handle_text_input pour user {user_id}, message: '{text[:50]}...'")

        # Récupérer l'état de conversation
        state = await db_manager.get_conversation_state(user_id)

        if not state:
            # Pas de conversation en cours pour le Trading Companion
            logger.debug(f"Pas de conversation TC active pour user {user_id}")
            return

        logger.info(f"💬 Trading Companion: Message reçu de user {user_id}: '{text}' (état: {state['state']})")

        # Traiter selon l'état
        if state['state'] == STATE_AMOUNT:
            await self.handle_amount_input(update, context, text, state)

        elif state['state'] == STATE_LEVERAGE:
            await self.handle_leverage_input(update, context, text, state)

        else:
            logger.warning(f"⚠️ État inconnu pour user {user_id}: {state['state']}")

    async def handle_amount_input(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                  text: str, state: dict):
        """Traite l'entrée du montant"""
        user_id = update.message.from_user.id

        logger.info(f"💰 Trading Companion: Traitement montant pour user {user_id}: '{text}'")

        # Valider le montant
        if not is_valid_amount(text):
            logger.warning(f"⚠️ Montant invalide: '{text}'")
            await update.message.reply_text(
                "❌ Montant invalide. Veuillez entrer un nombre valide (ex: 1000)."
            )
            return

        amount = parse_amount(text)
        logger.info(f"✅ Montant validé: {amount}")

        # Vérifier le solde disponible
        wallet = await db_manager.get_wallet(user_id)
        if amount > wallet['available_balance']:
            await update.message.reply_text(
                f"""
❌ **Solde insuffisant**

Montant demandé: {format_price(amount)} USD
Solde disponible: {format_price(wallet['available_balance'])} USD

Veuillez entrer un montant inférieur.
""",
                parse_mode='Markdown'
            )
            return

        # Sauvegarder le montant
        context_data = state['context']
        context_data['amount'] = amount

        # Passer à l'étape suivante: Direction
        await db_manager.set_conversation_state(
            user_id,
            STATE_DIRECTION,
            context=context_data,
            asset_symbol=state['asset_symbol'],
            market=state['market']
        )

        text = f"""
✅ Montant enregistré: {format_price(amount)} USD

━━━━━━━━━━━━━━━━━━━━

**Étape 2/3: Direction**

Souhaitez-vous ouvrir une position LONG ou SHORT sur **{state['asset_symbol']}** ?

📈 **LONG** = Vous pensez que le prix va monter
📉 **SHORT** = Vous pensez que le prix va baisser
"""

        keyboard = [
            [
                InlineKeyboardButton("📈 LONG", callback_data="tc_direction_LONG"),
                InlineKeyboardButton("📉 SHORT", callback_data="tc_direction_SHORT")
            ],
            [InlineKeyboardButton("❌ Annuler", callback_data="tc_cancel")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_direction_choice(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                     direction: str):
        """Traite le choix de direction"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        state = await db_manager.get_conversation_state(user_id)

        if not state:
            return

        # Sauvegarder la direction
        context_data = state['context']
        context_data['direction'] = direction

        # Passer à l'étape suivante: Levier
        await db_manager.set_conversation_state(
            user_id,
            STATE_LEVERAGE,
            context=context_data,
            asset_symbol=state['asset_symbol'],
            market=state['market']
        )

        direction_emoji = EMOJI_DIRECTION[direction]

        text = f"""
✅ Direction: {direction_emoji} {direction}

━━━━━━━━━━━━━━━━━━━━

**Étape 3/3: Levier**

Souhaitez-vous utiliser un levier ?

⚠️ Le levier multiplie vos gains MAIS aussi vos pertes !

💡 Écrivez le levier souhaité (1-10) ou 0 pour aucun levier
   Exemple: 2 pour x2, ou 0 pour aucun levier
"""

        keyboard = [
            [InlineKeyboardButton("❌ Annuler", callback_data="tc_cancel")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def handle_leverage_input(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                                   text: str, state: dict):
        """Traite l'entrée du levier"""
        user_id = update.message.from_user.id

        # Valider le levier
        if not is_valid_leverage(text):
            await update.message.reply_text(
                "❌ Levier invalide. Veuillez entrer un nombre entre 0 et 10."
            )
            return

        leverage = parse_leverage(text)
        if leverage == 0:
            leverage = 1  # Pas de levier = x1

        # Récupérer les paramètres utilisateur
        settings = await db_manager.get_user_settings(user_id)
        if leverage > settings['max_leverage']:
            await update.message.reply_text(
                f"""
❌ **Levier trop élevé**

Levier maximum autorisé dans vos paramètres: x{settings['max_leverage']}

Veuillez entrer un levier inférieur ou modifier vos paramètres.
""",
                parse_mode='Markdown'
            )
            return

        # Sauvegarder le levier
        context_data = state['context']
        context_data['leverage'] = leverage

        # Calculer les niveaux (TP, SL)
        current_price = context_data['current_price']
        direction = context_data['direction']
        amount = context_data['amount']

        # Calcul simplifié des niveaux
        atr_percent = 2.0  # Approximation
        sl_distance = current_price * (atr_percent / 100)
        tp_distance = sl_distance * 2  # Ratio 2:1

        if direction == "LONG":
            stop_loss = current_price - sl_distance
            take_profit_1 = current_price + tp_distance
            take_profit_2 = current_price + (tp_distance * 2)
        else:  # SHORT
            stop_loss = current_price + sl_distance
            take_profit_1 = current_price - tp_distance
            take_profit_2 = current_price - (tp_distance * 2)

        context_data['stop_loss'] = stop_loss
        context_data['take_profit_1'] = take_profit_1
        context_data['take_profit_2'] = take_profit_2

        # Passer à la confirmation
        await db_manager.set_conversation_state(
            user_id,
            STATE_CONFIRM,
            context=context_data,
            asset_symbol=state['asset_symbol'],
            market=state['market']
        )

        # Afficher le récapitulatif
        await self.show_confirmation(update, context, state, context_data)

    async def show_confirmation(self, update: Update, context: ContextTypes.DEFAULT_TYPE,
                               state: dict, trade_data: dict):
        """Affiche la confirmation de la position"""
        symbol = state['asset_symbol']
        direction = trade_data['direction']
        amount = trade_data['amount']
        leverage = trade_data['leverage']
        current_price = trade_data['current_price']
        stop_loss = trade_data['stop_loss']
        tp1 = trade_data['take_profit_1']
        tp2 = trade_data['take_profit_2']

        direction_emoji = EMOJI_DIRECTION[direction]

        text = f"""
📋 **CONFIRMATION DE POSITION**

━━━━━━━━━━━━━━━━━━━━

{direction_emoji} **{symbol}** - {direction}

💰 **Montant:** {format_price(amount)} USD
📊 **Levier:** x{leverage}

**Prix d'entrée:** {format_price(current_price)}

🎯 **Take Profit:**
• TP1: {format_price(tp1)}
• TP2: {format_price(tp2)}

🛑 **Stop Loss:** {format_price(stop_loss)}

━━━━━━━━━━━━━━━━━━━━

⚠️ **Risque:** {format_price(abs(current_price - stop_loss) * amount / current_price)} USD

Confirmez-vous cette position ?
"""

        keyboard = [
            [InlineKeyboardButton("✅ Confirmer", callback_data="tc_confirm")],
            [InlineKeyboardButton("❌ Annuler", callback_data="tc_cancel")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def confirm_position(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Confirme et ouvre la position"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        state = await db_manager.get_conversation_state(user_id)

        if not state or state['state'] != STATE_CONFIRM:
            return

        trade_data = state['context']

        # Générer un code unique
        position_code = generate_position_code()

        # Créer la position
        await db_manager.create_position(
            user_id,
            position_code,
            state['asset_symbol'],
            state['market'],
            trade_data['direction'],
            trade_data['current_price'],
            trade_data['amount'],
            trade_data['leverage'],
            trade_data['stop_loss'],
            trade_data['take_profit_1'],
            trade_data['take_profit_2']
        )

        # Déduire du wallet
        wallet = await db_manager.get_wallet(user_id)
        new_available = wallet['available_balance'] - trade_data['amount']

        await db_manager.update_wallet(user_id, available_balance=new_available)

        # Notification admin Discord
        try:
            from services.discord_service import discord_service
            await discord_service.send_admin_trade_alert(
                user_id,
                state['asset_symbol'],
                trade_data['direction'],
                trade_data['amount'],
                trade_data['current_price']
            )
        except Exception as e:
            logger.debug(f"Erreur notification Discord admin: {e}")

        # Effacer l'état de conversation
        await db_manager.clear_conversation_state(user_id)

        direction_emoji = EMOJI_DIRECTION[trade_data['direction']]

        text = f"""
✅ **POSITION OUVERTE !**

{direction_emoji} **{state['asset_symbol']}** - {trade_data['direction']}

**Code de position:** `{position_code}`

━━━━━━━━━━━━━━━━━━━━

Utilisez ce code pour retrouver votre position à tout moment dans le module Wallet.

La position sera suivie automatiquement en temps réel.

Bon trade ! 🚀
"""

        keyboard = [
            [InlineKeyboardButton("💼 Voir dans Wallet", callback_data="wallet_main")],
            [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
        ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='Markdown')

    async def cancel_conversation(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Annule la conversation"""
        query = update.callback_query
        await query.answer()

        user_id = query.from_user.id
        await db_manager.clear_conversation_state(user_id)

        await query.edit_message_text(
            "❌ Opération annulée.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton(BTN_BACK_MENU, callback_data="menu_main")]
            ])
        )

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks"""
        query = update.callback_query
        data = query.data

        if data == "tc_cancel":
            await self.cancel_conversation(update, context)

        elif data.startswith("tc_direction_"):
            direction = data.replace("tc_direction_", "")
            await self.handle_direction_choice(update, context, direction)

        elif data == "tc_confirm":
            await self.confirm_position(update, context)
