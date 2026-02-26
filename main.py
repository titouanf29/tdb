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
from services.social_service import social_service
from services.morning_service import morning_service
from services.notification_service import notification_service
from services.cache_service import cache_service
from services.discord_service import discord_service
from services.backup_service import backup_service
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
        self.startup_status = {
            'modules': {},
            'services': {},
            'errors': []
        }

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

        # Handler prioritaire pour bloquer les commandes dans le canal d'annonces
        # Groupe -1 = traité en premier
        self.application.add_handler(
            MessageHandler(filters.ALL, self.block_channel_commands),
            group=-1
        )
        logger.info("✅ Filtre canal d'annonces activé (commandes bloquées)")

        # Modules principaux (créés en premier)
        try:
            self.market_module = MarketModule(self.application)
            self.startup_status['modules']['Marché'] = True
            logger.info("✅ Module Marché chargé")
        except Exception as e:
            self.startup_status['modules']['Marché'] = False
            self.startup_status['errors'].append(f"Marché: {str(e)[:50]}")
            logger.error(f"❌ Module Marché: {e}")

        try:
            self.wallet_module = WalletModule(self.application)
            self.startup_status['modules']['Wallet'] = True
            logger.info("✅ Module Wallet chargé")
        except Exception as e:
            self.startup_status['modules']['Wallet'] = False
            self.startup_status['errors'].append(f"Wallet: {str(e)[:50]}")
            logger.error(f"❌ Module Wallet: {e}")

        try:
            self.favorites_module = FavoritesModule(self.application)
            # Enregistrer dans bot_data pour accès depuis autres modules
            self.application.bot_data['favorites_module'] = self.favorites_module
            self.startup_status['modules']['Favoris'] = True
            logger.info("✅ Module Favoris chargé")
        except Exception as e:
            self.startup_status['modules']['Favoris'] = False
            self.startup_status['errors'].append(f"Favoris: {str(e)[:50]}")
            logger.error(f"❌ Module Favoris: {e}")

        try:
            self.scan_module = ScanAutoModule(self.application)
            self.startup_status['modules']['Scan Auto'] = True
            logger.info("✅ Module Scan Auto chargé")
        except Exception as e:
            self.startup_status['modules']['Scan Auto'] = False
            self.startup_status['errors'].append(f"Scan Auto: {str(e)[:50]}")
            logger.error(f"❌ Module Scan Auto: {e}")

        try:
            self.settings_module = SettingsModule(self.application)
            self.startup_status['modules']['Paramètres'] = True
            logger.info("✅ Module Paramètres chargé")
        except Exception as e:
            self.startup_status['modules']['Paramètres'] = False
            self.startup_status['errors'].append(f"Paramètres: {str(e)[:50]}")
            logger.error(f"❌ Module Paramètres: {e}")

        try:
            # Trading Compagnon IA
            self.trading_companion = TradingCompanion(self.application)
            self.startup_status['modules']['Trading Compagnon'] = True
            logger.info("✅ Trading Compagnon IA chargé")
        except Exception as e:
            self.startup_status['modules']['Trading Compagnon'] = False
            self.startup_status['errors'].append(f"Trading Compagnon: {str(e)[:50]}")
            logger.error(f"❌ Trading Compagnon: {e}")

        try:
            # Module Admin
            self.admin_module = AdminModule(self.application)
            self.startup_status['modules']['Admin'] = True
            logger.info("✅ Module Admin chargé")
        except Exception as e:
            self.startup_status['modules']['Admin'] = False
            self.startup_status['errors'].append(f"Admin: {str(e)[:50]}")
            logger.error(f"❌ Module Admin: {e}")

        try:
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
            self.startup_status['modules']['Assistant IA'] = True
            logger.info("✅ Module Assistant IA chargé")
        except Exception as e:
            self.startup_status['modules']['Assistant IA'] = False
            self.startup_status['errors'].append(f"Assistant IA: {str(e)[:50]}")
            logger.error(f"❌ Module Assistant IA: {e}")

        try:
            # Module Features (alertes, screener, quiz, leaderboard, etc.)
            self.features_module = create_features_module(self.application)
            self.startup_status['modules']['Features'] = True
            logger.info("✅ Module Features chargé (alertes, quiz, leaderboard, etc.)")
        except Exception as e:
            self.startup_status['modules']['Features'] = False
            self.startup_status['errors'].append(f"Features: {str(e)[:50]}")
            logger.error(f"❌ Module Features: {e}")

        try:
            # Module Welcome (accueil + onboarding)
            self.welcome_module = create_welcome_module(self.application)
            self.startup_status['modules']['Welcome'] = True
            logger.info("✅ Module Welcome chargé (accueil, onboarding, freemium)")
        except Exception as e:
            self.startup_status['modules']['Welcome'] = False
            self.startup_status['errors'].append(f"Welcome: {str(e)[:50]}")
            logger.error(f"❌ Module Welcome: {e}")

        try:
            # Menu principal (créé en dernier avec références aux autres modules)
            self.menu_module = MenuModule(
                self.application,
                market_module=getattr(self, 'market_module', None),
                wallet_module=getattr(self, 'wallet_module', None),
                favorites_module=getattr(self, 'favorites_module', None),
                scan_module=getattr(self, 'scan_module', None),
                settings_module=getattr(self, 'settings_module', None),
                ai_assistant_module=getattr(self, 'ai_assistant_module', None),
                features_module=getattr(self, 'features_module', None)
            )
            self.startup_status['modules']['Menu'] = True
            logger.info("✅ Module Menu chargé")
        except Exception as e:
            self.startup_status['modules']['Menu'] = False
            self.startup_status['errors'].append(f"Menu: {str(e)[:50]}")
            logger.error(f"❌ Module Menu: {e}")

        modules_ok = sum(1 for v in self.startup_status['modules'].values() if v)
        modules_total = len(self.startup_status['modules'])
        logger.info(f"🎉 Modules chargés: {modules_ok}/{modules_total}")

    async def error_handler(self, update, context):
        """Gère les erreurs"""
        logger.error(f"Exception: {context.error}")

        if update and update.effective_message:
            await update.effective_message.reply_text(
                "❌ Une erreur s'est produite. Veuillez réessayer."
            )

    async def send_startup_notification(self):
        """Envoie une notification de redémarrage dans le canal principal"""
        if not config.CHANNEL_ID:
            logger.info("ℹ️ CHANNEL_ID non configuré - Notification de démarrage ignorée")
            return

        try:
            from datetime import datetime
            import aiosqlite
            import os

            # Vérifier si une notification a déjà été envoyée récemment (5 min)
            # On utilise un fichier temporaire pour persister entre les redémarrages
            startup_flag_file = "/tmp/tdb_startup_notification.txt"
            current_time = datetime.now()

            if os.path.exists(startup_flag_file):
                try:
                    with open(startup_flag_file, 'r') as f:
                        last_notification_str = f.read().strip()
                        last_notification = datetime.fromisoformat(last_notification_str)
                        time_diff = (current_time - last_notification).total_seconds()

                        if time_diff < 300:  # Moins de 5 minutes
                            logger.info(f"⏭️ Notification de démarrage ignorée (dernière il y a {time_diff:.0f}s)")
                            return
                except Exception:
                    pass  # Si erreur lecture, on continue

            # Enregistrer le timestamp de cette notification
            try:
                with open(startup_flag_file, 'w') as f:
                    f.write(current_time.isoformat())
            except Exception:
                pass  # Ignorer les erreurs d'écriture

            # Compter les succès et échecs
            modules_ok = sum(1 for v in self.startup_status['modules'].values() if v)
            modules_total = len(self.startup_status['modules'])
            services_ok = sum(1 for v in self.startup_status['services'].values() if v)
            services_total = len(self.startup_status['services'])

            # Déterminer le statut global
            all_ok = len(self.startup_status['errors']) == 0

            if all_ok:
                status_emoji = "✅"
                status_text = "Opérationnel"
            else:
                status_emoji = "⚠️"
                status_text = "Partiellement opérationnel"

            # Construire le message
            message = f"""
{status_emoji} **TDB Bot - Redémarrage**

🕐 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

**Statut:** {status_text}

📦 **Modules:** {modules_ok}/{modules_total} actifs
"""
            # Lister les modules défaillants si besoin
            failed_modules = [k for k, v in self.startup_status['modules'].items() if not v]
            if failed_modules:
                message += f"   ❌ Échecs: {', '.join(failed_modules)}\n"

            message += f"""
⚙️ **Services:** {services_ok}/{services_total} actifs
"""
            # Lister les services défaillants si besoin
            failed_services = [k for k, v in self.startup_status['services'].items() if not v]
            if failed_services:
                message += f"   ❌ Échecs: {', '.join(failed_services)}\n"

            # Ajouter les erreurs critiques si présentes
            if self.startup_status['errors']:
                message += "\n⚠️ **Problèmes détectés:**\n"
                for error in self.startup_status['errors'][:3]:  # Max 3 erreurs
                    message += f"   • {error}\n"

            message += "\n🤖 Le bot est prêt à recevoir des commandes."

            # Envoyer au canal
            await self.application.bot.send_message(
                chat_id=config.CHANNEL_ID,
                text=message,
                parse_mode='Markdown'
            )
            logger.info(f"✅ Notification de démarrage envoyée au canal {config.CHANNEL_ID}")

        except Exception as e:
            logger.error(f"❌ Erreur envoi notification démarrage: {e}")

    async def run(self):
        """Lance le bot"""
        logger.info("🚀 Démarrage de TDB Bot...")

        # IMPORTANT : Initialiser la base de données EN PREMIER
        logger.info("📦 Initialisation de la base de données...")
        await self.initialize_database()
        logger.info("✅ Base de données initialisée")

        # Charger les actifs custom (ajoutés par les admins) en mémoire
        from utils.asset_names import load_custom_assets
        await load_custom_assets()
        logger.info("✅ Actifs personnalisés chargés")

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
        try:
            self.broadcast_service = init_broadcast_service(self.application.bot)
            # Passer la référence au module admin
            if hasattr(self, 'admin_module'):
                self.admin_module.broadcast_service = self.broadcast_service
            self.startup_status['services']['Broadcast'] = True
            logger.info("✅ Service de broadcast initialisé")
        except Exception as e:
            self.startup_status['services']['Broadcast'] = False
            self.startup_status['errors'].append(f"Broadcast: {str(e)[:50]}")
            logger.error(f"❌ Service Broadcast: {e}")

        # Initialiser et démarrer le scanner automatique APRÈS que le bot soit connecté
        logger.info("🔄 Démarrage du scanner automatique...")
        try:
            self.auto_scanner = init_auto_scanner(self.application.bot)
            self.auto_scanner.start()
            self.startup_status['services']['Scanner Auto'] = True
            logger.info("✅ Scanner automatique démarré")
        except Exception as e:
            self.startup_status['services']['Scanner Auto'] = False
            self.startup_status['errors'].append(f"Scanner Auto: {str(e)[:50]}")
            logger.error(f"❌ Service Scanner Auto: {e}")

        # Démarrer les nouveaux services
        logger.info("🔄 Démarrage des services avancés...")

        try:
            await alerts_service.start(self.application.bot)
            self.startup_status['services']['Alertes'] = True
        except Exception as e:
            self.startup_status['services']['Alertes'] = False
            self.startup_status['errors'].append(f"Alertes: {str(e)[:50]}")
            logger.error(f"❌ Service Alertes: {e}")

        try:
            await social_service.start(self.application.bot)
            self.startup_status['services']['Social'] = True
        except Exception as e:
            self.startup_status['services']['Social'] = False
            self.startup_status['errors'].append(f"Social: {str(e)[:50]}")
            logger.error(f"❌ Service Social: {e}")

        try:
            await morning_service.start(self.application.bot)
            self.startup_status['services']['Morning'] = True
        except Exception as e:
            self.startup_status['services']['Morning'] = False
            self.startup_status['errors'].append(f"Morning: {str(e)[:50]}")
            logger.error(f"❌ Service Morning: {e}")

        try:
            await notification_service.start(self.application.bot)
            self.startup_status['services']['Notifications'] = True
        except Exception as e:
            self.startup_status['services']['Notifications'] = False
            self.startup_status['errors'].append(f"Notifications: {str(e)[:50]}")
            logger.error(f"❌ Service Notifications: {e}")

        try:
            await cache_service.start_cleanup_task()
            self.startup_status['services']['Cache'] = True
        except Exception as e:
            self.startup_status['services']['Cache'] = False
            self.startup_status['errors'].append(f"Cache: {str(e)[:50]}")
            logger.error(f"❌ Service Cache: {e}")

        try:
            await backup_service.start()
            self.startup_status['services']['Backup'] = True
        except Exception as e:
            self.startup_status['services']['Backup'] = False
            self.startup_status['errors'].append(f"Backup: {str(e)[:50]}")
            logger.error(f"❌ Service Backup: {e}")

        services_ok = sum(1 for v in self.startup_status['services'].values() if v)
        services_total = len(self.startup_status['services'])
        logger.info(f"✅ Services avancés: {services_ok}/{services_total} démarrés")

        # Démarrer le service Discord si configuré
        if discord_service.enabled:
            try:
                # Configurer le bot Telegram pour les notifications cross-platform
                discord_service.set_telegram_bot(self.application.bot)
                asyncio.create_task(discord_service.start_market_monitor())
                self.startup_status['services']['Discord'] = True
                logger.info("✅ Service Discord démarré (alertes marchés: Asie, Europe, US, Matières Premières)")
            except Exception as e:
                self.startup_status['services']['Discord'] = False
                self.startup_status['errors'].append(f"Discord: {str(e)[:50]}")
                logger.error(f"❌ Service Discord: {e}")
        else:
            logger.info("ℹ️ Discord non configuré (DISCORD_WEBHOOK_URL manquant)")

        # Envoyer la notification de démarrage dans le canal principal
        await self.send_startup_notification()

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
        logger.info("  • Scan Automatique")
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
        logger.info("  • Backup Auto (quotidien 3h, hebdo dimanche 4h)")
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
        social_service.stop()
        morning_service.stop()
        await notification_service.stop()
        await cache_service.stop_cleanup_task()
        backup_service.stop()

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
