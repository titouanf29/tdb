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
from services.alerts_service import alerts_service
from services.screener_service import screener_service
from services.social_service import social_service
from services.morning_service import morning_service
from services.notification_service import notification_service
from services.cache_service import cache_service
from services.discord_service import discord_service
from modules.features import create_features_module
from modules.welcome import create_welcome_module
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

    async def block_channel_commands(self, update, context):
        """Bloque les commandes et messages dans le canal d'annonces"""
        from utils.helpers import is_announcement_channel
        from telegram.ext import ApplicationHandlerStop

        if update.effective_chat and is_announcement_channel(update.effective_chat.id):
            # Ignorer silencieusement les commandes dans le canal
            logger.debug(f"Message bloqué dans le canal d'annonces")
            raise ApplicationHandlerStop()  # Stop propagation vers les autres handlers

    def setup_modules(self):
        """Configure tous les modules du bot"""
        logger.info("Configuration des modules...")

        try:
            # Handler prioritaire pour bloquer les commandes dans le canal d'annonces
            # Groupe -1 = traité en premier
            self.application.add_handler(
                MessageHandler(filters.ALL, self.block_channel_commands),
                group=-1
            )
            logger.info("✅ Filtre canal d'annonces activé (commandes bloquées)")

            # Modules principaux (créés en premier)
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

            # Module Assistant IA
            self.ai_assistant_module = ai_assistant_module
            # Enregistrer les handlers pour l'assistant IA
            # Groupe 2 pour éviter le conflit avec TradingCompanion (groupe 0) et Wallet (groupe 1)
            # Les MessageHandlers sont organisés par groupe:
            # - Groupe 0: TradingCompanion (conversation de trading)
            # - Groupe 1: Wallet (codes de position)
            # - Groupe 2: AI Assistant (chat IA)
            logger.debug("Enregistrement du handler AI Assistant dans groupe 2")
            self.application.add_handler(MessageHandler(
                filters.TEXT & ~filters.COMMAND,
                self.ai_assistant_module.handle_ai_message
            ), group=2)
            logger.debug("Handler AI Assistant enregistré avec succès")
            self.application.add_handler(CallbackQueryHandler(
                self.ai_assistant_module.callback_ai_stop,
                pattern="^ai_stop$"
            ))
            self.application.add_handler(CallbackQueryHandler(
                self.ai_assistant_module.callback_ai_clear_history,
                pattern="^ai_clear_history$"
            ))
            from telegram.ext import CommandHandler
            self.application.add_handler(CommandHandler("ai_assistant", self.ai_assistant_module.cmd_ai_assistant))
            self.application.add_handler(CommandHandler("stop_ai", self.ai_assistant_module.cmd_stop_ai))
            logger.info("✅ Module Assistant IA chargé")

            # Module Features (alertes, screener, quiz, leaderboard, etc.)
            self.features_module = create_features_module(self.application)
            logger.info("✅ Module Features chargé (alertes, quiz, leaderboard, etc.)")

            # Module Welcome (accueil + onboarding)
            self.welcome_module = create_welcome_module(self.application)
            logger.info("✅ Module Welcome chargé (accueil, onboarding, freemium)")

            # Menu principal (créé en dernier avec références aux autres modules)
            self.menu_module = MenuModule(
                self.application,
                market_module=self.market_module,
                wallet_module=self.wallet_module,
                favorites_module=self.favorites_module,
                scan_module=self.scan_module,
                settings_module=self.settings_module,
                ai_assistant_module=self.ai_assistant_module,
                features_module=self.features_module
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

        # Démarrer les nouveaux services
        logger.info("🔄 Démarrage des services avancés...")
        await alerts_service.start(self.application.bot)
        await screener_service.start(self.application.bot)
        await social_service.start(self.application.bot)
        await morning_service.start(self.application.bot)
        await notification_service.start(self.application.bot)
        await cache_service.start_cleanup_task()
        logger.info("✅ Services avancés démarrés (alertes, screener, social, morning, notifications, cache)")

        # Démarrer le service Discord si configuré
        if discord_service.enabled:
            # Configurer le bot Telegram pour les notifications cross-platform
            discord_service.set_telegram_bot(self.application.bot)
            asyncio.create_task(discord_service.start_market_monitor())
            logger.info("✅ Service Discord démarré (alertes marchés: Asie, Europe, US, Matières Premières)")
        else:
            logger.info("ℹ️ Discord non configuré (DISCORD_WEBHOOK_URL manquant)")

        # Message de démarrage
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("🤖 TDB Bot v4.0 démarré avec succès !")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("📊 Modules actifs:")
        logger.info("  • Menu Principal (MP uniquement)")
        logger.info("  • Welcome + Onboarding (accueil nouveaux utilisateurs)")
        logger.info("  • Marché (USA, EUROPE, ASIA, CRYPTO, COMMODITIES)")
        logger.info("  • Wallet (Paper Trading + SL/TP Auto)")
        logger.info("  • Favoris + Watchlist Intelligente")
        logger.info("  • Assistant IA Trading (⚡ Groq - Llama 3.3)")
        logger.info("  • Scan Automatique + Screener Avancé")
        logger.info("  • Alertes (Prix + Volatilité)")
        logger.info("  • Leaderboard + Badges + Challenges")
        logger.info("  • Quiz Trading Quotidien")
        logger.info("  • Graphiques Avancés (Heatmap, Corrélations, Fear&Greed)")
        logger.info("  • News & Sentiment (Reddit, Crypto F&G)")
        logger.info("  • Risk Management (Sharpe, VaR, Drawdown)")
        logger.info("  • Export PDF/CSV + Stats Wallet")
        logger.info("  • Résumé Matinal Automatique")
        logger.info("  • Tutoriel Interactif")
        logger.info("  • Freemium + Parrainage")
        logger.info("  • Cache + Notifications Push")
        logger.info("  • Discord Alerts (Asie, Europe, US)")
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

        # Arrêter les services avancés
        alerts_service.stop()
        screener_service.stop()
        social_service.stop()
        morning_service.stop()
        await notification_service.stop()
        await cache_service.stop_cleanup_task()

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
