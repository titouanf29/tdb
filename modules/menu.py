"""
Module Menu Principal - Hub central du bot TDB
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler, CommandHandler
import config

class MenuModule:
    """Gère le menu principal du bot"""

    def __init__(self, application):
        self.app = application
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

        # Redirection vers les modules
        if data == "menu_market":
            # Import dynamique pour éviter les imports circulaires
            from modules.market import MarketModule
            market_module = MarketModule(self.app)
            await market_module.show_markets(update, context)

        elif data == "menu_wallet":
            from modules.wallet import WalletModule
            wallet_module = WalletModule(self.app)
            await wallet_module.show_wallet(update, context)

        elif data == "menu_favorites":
            from modules.favorites import FavoritesModule
            favorites_module = FavoritesModule(self.app)
            await favorites_module.show_favorites(update, context)

        elif data == "menu_scan":
            from modules.scan_auto import ScanAutoModule
            scan_module = ScanAutoModule(self.app)
            await scan_module.show_scan_menu(update, context)

        elif data == "menu_settings":
            from modules.settings import SettingsModule
            settings_module = SettingsModule(self.app)
            await settings_module.show_settings(update, context)
