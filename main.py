"""
TDB Bot - Trading Bot Professionnel
Point d'entrée principal
"""
import asyncio
import logging
import sys
from telegram.ext import Application
import config
from database.manager import db_manager
from modules.menu import MenuModule
from modules.market import MarketModule
from modules.wallet import WalletModule
from modules.favorites import FavoritesModule
from modules.scan_auto import ScanAutoModule
from modules.settings import SettingsModule
from modules.admin import AdminModule
from modules.ai_assistant import ai_assistant_module
from ai.trading_companion import TradingCompanion
from services.auto_scanner import init_auto_scanner
from services.broadcast import init_broadcast_service
from telegram.ext import MessageHandler, filters, CallbackQueryHandler

# Configuration du logging compatible Windows (UTF-8)
# Forcer l'encodage UTF-8 pour la console Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler(config.LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Réduire les logs verbeux des bibliothèques externes
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('httpcore').setLevel(logging.WARNING)
logging.getLogger('telegram').setLevel(logging.WARNING)
logging.getLogger('apscheduler').setLevel(logging.WARNING)

class TDBBot:
    """Bot TDB principal"""

    def __init__(self):
        """Initialise le bot"""
        self.token = config.TELEGRAM_TOKEN
        self.application = None
        self.auto_scanner = None

    async def initialize_database(self):
        """Initialise la base de données"""
        logger.info("Initialisation de la base de données...")
        try:
            await db_manager.init_db()
            logger.info("✅ Base de données initialisée")
        except Exception as e:
            logger.error(f"❌ Erreur initialisation BDD: {e}")
            raise

    def setup_modules(self):
        """Configure tous les modules du bot"""
        logger.info("Configuration des modules...")

        try:
            # Module Assistant IA (EN PREMIER pour priorité maximale sur les messages)
            self.ai_assistant_module = ai_assistant_module
            # Enregistrer les handlers pour l'assistant IA (groupe -1 = priorité maximale)
            self.application.add_handler(MessageHandler(
                filters.TEXT & ~filters.COMMAND,
                self.ai_assistant_module.handle_ai_message
            ), group=-1)
            self.application.add_handler(CallbackQueryHandler(
                self.ai_assistant_module.callback_ai_stop,
                pattern="^ai_stop$"
            ))
            self.application.add_handler(CallbackQueryHandler(
                self.ai_assistant_module.callback_ai_clear_history,
                pattern="^ai_clear_history$"
            ))
            self.application.add_handler(CallbackQueryHandler(
                self.ai_assistant_module.callback_ai_chat_asset,
                pattern="^ai_chat_asset_"
            ))
            from telegram.ext import CommandHandler
            self.application.add_handler(CommandHandler("ai_assistant", self.ai_assistant_module.cmd_ai_assistant))
            self.application.add_handler(CommandHandler("stop_ai", self.ai_assistant_module.cmd_stop_ai))
            logger.info("✅ Module Assistant IA chargé")

            # Modules principaux
            self.market_module = MarketModule(self.application)
            logger.info("✅ Module Marché chargé")

            self.wallet_module = WalletModule(self.application)
            logger.info("✅ Module Wallet chargé")

            self.favorites_module = FavoritesModule(self.application)
            logger.info("✅ Module Favoris chargé")

            self.scan_module = ScanAutoModule(self.application)
            logger.info("✅ Module Scan Auto chargé")

            self.settings_module = SettingsModule(self.application)
            logger.info("✅ Module Paramètres chargé")

            # Trading Compagnon IA
            self.trading_companion = TradingCompanion(self.application)
            logger.info("✅ Trading Compagnon IA chargé")

            # Module Admin
            self.admin_module = AdminModule(self.application)
            logger.info("✅ Module Admin chargé")

            # Menu principal (créé en dernier avec références aux autres modules)
            self.menu_module = MenuModule(
                self.application,
                market_module=self.market_module,
                wallet_module=self.wallet_module,
                favorites_module=self.favorites_module,
                scan_module=self.scan_module,
                settings_module=self.settings_module,
                ai_assistant_module=self.ai_assistant_module
            )
            logger.info("✅ Module Menu chargé")

            logger.info("🎉 Tous les modules sont chargés")

        except Exception as e:
            logger.error(f"❌ Erreur chargement modules: {e}")
            raise

    async def error_handler(self, update, context):
        """Gère les erreurs"""
        logger.error(f"Exception: {context.error}")

        if update and update.effective_message:
            await update.effective_message.reply_text(
                "❌ Une erreur s'est produite. Veuillez réessayer."
            )

    async def run(self):
        """Lance le bot"""
        logger.info("🚀 Démarrage de TDB Bot...")

        # IMPORTANT : Initialiser la base de données EN PREMIER
        logger.info("📦 Initialisation de la base de données...")
        await self.initialize_database()
        logger.info("✅ Base de données initialisée")

        # Créer l'application
        self.application = Application.builder().token(self.token).build()

        # Configurer les modules
        self.setup_modules()

        # Ajouter le gestionnaire d'erreurs
        self.application.add_error_handler(self.error_handler)

        # Démarrer le bot
        logger.info("🔄 Connexion à Telegram...")
        await self.application.initialize()
        await self.application.start()
        await self.application.updater.start_polling(drop_pending_updates=True)

        logger.info("✅ Bot connecté et en écoute")

        # Initialiser le service de broadcast
        logger.info("🔄 Initialisation du service de broadcast...")
        self.broadcast_service = init_broadcast_service(self.application.bot)
        # Passer la référence au module admin
        self.admin_module.broadcast_service = self.broadcast_service
        logger.info("✅ Service de broadcast initialisé")

        # Initialiser et démarrer le scanner automatique APRÈS que le bot soit connecté
        logger.info("🔄 Démarrage du scanner automatique...")
        self.auto_scanner = init_auto_scanner(self.application.bot)
        self.auto_scanner.start()

        # Message de démarrage
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("🤖 TDB Bot démarré avec succès !")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("📊 Modules actifs:")
        logger.info("  • Menu Principal")
        logger.info("  • Marché (USA, EUROPE, ASIA, CRYPTO, COMMODITIES, GOLD)")
        logger.info("  • Wallet (Paper Trading)")
        logger.info("  • Favoris")
        logger.info("  • Assistant IA Trading (⚡ Groq - Llama 3)")
        logger.info("  • Scan Automatique (🔄 Actif)")
        logger.info("  • Paramètres")
        logger.info("  • Trading Compagnon IA")
        logger.info("  • Admin (Broadcast & Stats)")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("✅ Le bot est prêt à recevoir des commandes")

        # Garder le bot actif
        await asyncio.Event().wait()

    async def stop(self):
        """Arrête le bot proprement"""
        logger.info("🛑 Arrêt du bot...")

        # Arrêter le scanner automatique
        if self.auto_scanner:
            self.auto_scanner.stop()

        if self.application:
            await self.application.updater.stop()
            await self.application.stop()
            await self.application.shutdown()

        logger.info("✅ Bot arrêté proprement")

async def main():
    """Fonction principale"""
    bot = TDBBot()

    try:
        await bot.run()
    except KeyboardInterrupt:
        logger.info("⌨️ Interruption clavier détectée")
        await bot.stop()
    except Exception as e:
        logger.error(f"❌ Erreur fatale: {e}")
        await bot.stop()
        raise

if __name__ == "__main__":
    """Point d'entrée"""
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Au revoir !")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        exit(1)
