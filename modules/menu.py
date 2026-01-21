"""
Module Menu Principal - Hub central du bot TDB
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, CommandHandler
import config

class MenuModule:
    """Gère le menu principal du bot"""

    def __init__(self, application, market_module=None, wallet_module=None,
                 favorites_module=None, scan_module=None, settings_module=None):
        self.app = application
        self.market_module = market_module
        self.wallet_module = wallet_module
        self.favorites_module = favorites_module
        self.scan_module = scan_module
        self.settings_module = settings_module
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
            [InlineKeyboardButton("📊 Marché", callback_data="menu_market")],
            [InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet")],
            [InlineKeyboardButton("⭐ Favoris", callback_data="menu_favorites")],
            [InlineKeyboardButton("🔍 Scan Auto", callback_data="menu_scan")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        menu_text = """
🤖 **TDB - MENU PRINCIPAL**

Sélectionnez une option :

📊 **Marché** - Analyser les marchés financiers
💼 **Wallet** - Gérer votre portefeuille virtuel
⭐ **Favoris** - Vos actifs préférés
🔍 **Scan Auto** - Scanner automatique
⚙️ **Paramètres** - Configuration du bot
"""

        # Si c'est un message texte
        if update.message:
            await update.message.reply_text(
                menu_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
        # Si c'est un callback (bouton)
        elif update.callback_query:
            await update.callback_query.edit_message_text(
                menu_text,
                reply_markup=reply_markup,
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

        # Redirection vers les modules (utilise les références existantes)
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
