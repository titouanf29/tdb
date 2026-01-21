"""
Service de scan automatique - Analyse périodique des marchés
"""
import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from telegram import Bot
from database.manager import db_manager
from ai.analyzer import analyzer
import config

logger = logging.getLogger(__name__)

class AutoScannerService:
    """Service de scan automatique des marchés"""

    def __init__(self, bot: Bot):
        self.bot = bot
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self.last_scan_times = {}  # user_id -> last_scan_timestamp
        self.daily_alert_counts = {}  # user_id -> count

    def start(self):
        """Démarre le scheduler"""
        if not self.is_running:
            # Lancer le scan toutes les 60 secondes
            self.scheduler.add_job(
                self.run_scan_cycle,
                trigger=IntervalTrigger(seconds=60),
                id='auto_scanner',
                replace_existing=True
            )

            # Reset compteurs quotidiens à minuit
            self.scheduler.add_job(
                self.reset_daily_counts,
                trigger='cron',
                hour=0,
                minute=0,
                id='reset_daily_alerts',
                replace_existing=True
            )

            self.scheduler.start()
            self.is_running = True
            logger.info("✅ Auto Scanner démarré")

    def stop(self):
        """Arrête le scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("🛑 Auto Scanner arrêté")

    async def reset_daily_counts(self):
        """Reset les compteurs quotidiens"""
        self.daily_alert_counts = {}
        logger.info("🔄 Compteurs quotidiens réinitialisés")

    async def run_scan_cycle(self):
        """Exécute un cycle de scan pour tous les utilisateurs actifs"""
        try:
            # Récupérer tous les utilisateurs avec scan activé
            users = await db_manager.get_users_with_scan_enabled()

            if not users:
                logger.debug("Aucun utilisateur avec scan activé")
                return

            logger.info(f"🔍 Cycle de scan: {len(users)} utilisateur(s) avec scan activé")
            current_time = datetime.now()

            for user in users:
                user_id = user['telegram_id']
                scan_frequency = user['scan_frequency']

                # Vérifier si c'est le moment de scanner pour cet utilisateur
                last_scan = self.last_scan_times.get(user_id)

                if last_scan:
                    time_since_last = (current_time - last_scan).total_seconds()
                    if time_since_last < scan_frequency:
                        continue  # Pas encore le moment

                # Vérifier si c'est le week-end et si l'utilisateur veut scanner
                is_weekend = current_time.weekday() >= 5  # 5=samedi, 6=dimanche
                if is_weekend and not user['scan_weekends']:
                    continue

                # Vérifier la limite d'alertes quotidiennes
                alert_count = self.daily_alert_counts.get(user_id, 0)
                if alert_count >= user['max_alerts_per_day']:
                    continue

                # Lancer le scan pour cet utilisateur
                logger.info(f"🔍 Lancement scan pour utilisateur {user_id}")
                await self.scan_for_user(user)
                self.last_scan_times[user_id] = current_time
                logger.info(f"✅ Scan terminé pour utilisateur {user_id}")

        except Exception as e:
            logger.error(f"❌ Erreur dans run_scan_cycle: {e}", exc_info=True)

    async def scan_for_user(self, user):
        """Lance un scan pour un utilisateur spécifique"""
        try:
            user_id = user['telegram_id']
            score_min = user['score_min']

            logger.info(f"📊 Scan pour user {user_id}: score_min={score_min}")

            # Récupérer les marchés favoris de l'utilisateur
            favorites = await db_manager.get_user_favorites(user_id)

            # Si pas de favoris, scanner les marchés principaux
            if not favorites:
                assets_to_scan = self.get_default_assets()
                logger.info(f"📋 Aucun favori, scan des actifs par défaut: {len(assets_to_scan)} actifs")
            else:
                assets_to_scan = [fav['asset_symbol'] for fav in favorites]
                logger.info(f"⭐ Scan des favoris: {len(assets_to_scan)} actifs")

            opportunities = []

            # Analyser chaque actif
            for symbol in assets_to_scan[:10]:  # Limiter à 10 actifs par scan
                try:
                    analysis = await analyzer.analyze_asset(symbol, timeframe="1d")

                    if analysis and analysis.get('score', 0) >= score_min:
                        opportunities.append({
                            'symbol': symbol,
                            'score': analysis['score'],
                            'signal': analysis.get('signal', 'NEUTRE'),
                            'price': analysis.get('current_price', 0)
                        })

                        # Sauvegarder dans la base de données
                        await db_manager.save_scan_result_simple(
                            user_id=user_id,
                            asset_symbol=symbol,
                            score=analysis['score'],
                            signal=analysis.get('signal', 'NEUTRE'),
                            price=analysis.get('current_price', 0)
                        )

                except Exception as e:
                    logger.error(f"❌ Erreur analyse {symbol}: {e}")
                    continue

                # Petit délai pour ne pas surcharger l'API
                await asyncio.sleep(0.5)

            # Envoyer une alerte si des opportunités trouvées
            if opportunities:
                logger.info(f"✅ {len(opportunities)} opportunité(s) trouvée(s) pour user {user_id}")
                await self.send_alert(user_id, opportunities)
                self.daily_alert_counts[user_id] = self.daily_alert_counts.get(user_id, 0) + 1
            else:
                logger.info(f"⚪ Aucune opportunité trouvée pour user {user_id} (score_min={score_min})")

        except Exception as e:
            logger.error(f"❌ Erreur scan_for_user {user_id}: {e}", exc_info=True)

    async def send_alert(self, user_id: int, opportunities: list):
        """Envoie une alerte Telegram avec les opportunités trouvées"""
        try:
            # Trier par score décroissant
            opportunities.sort(key=lambda x: x['score'], reverse=True)

            text = "🔔 **NOUVELLES OPPORTUNITÉS DÉTECTÉES**\n\n"

            for opp in opportunities[:5]:  # Max 5 dans l'alerte
                emoji = self.get_signal_emoji(opp['signal'])
                text += f"{emoji} **{opp['symbol']}**\n"
                text += f"   • Score: {opp['score']}/100\n"
                text += f"   • Signal: {opp['signal']}\n"
                text += f"   • Prix: ${opp['price']:.2f}\n\n"

            text += f"_Scan automatique • {datetime.now().strftime('%H:%M')}_"

            await self.bot.send_message(
                chat_id=user_id,
                text=text,
                parse_mode='Markdown'
            )

            logger.info(f"✅ Alerte envoyée à l'utilisateur {user_id}: {len(opportunities)} opportunités")

        except Exception as e:
            logger.error(f"❌ Erreur envoi alerte à {user_id}: {e}")

    def get_signal_emoji(self, signal: str) -> str:
        """Retourne l'emoji correspondant au signal"""
        emojis = {
            'ACHAT FORT': '🟢🟢',
            'ACHAT': '🟢',
            'VENTE FORT': '🔴🔴',
            'VENTE': '🔴',
            'NEUTRE': '⚪'
        }
        return emojis.get(signal, '⚪')

    def get_default_assets(self) -> list:
        """Retourne une liste d'actifs par défaut à scanner"""
        assets = []

        # Ajouter quelques actifs de chaque marché
        for market_key, market_data in config.MARKETS.items():
            assets.extend(market_data['assets'][:3])  # 3 premiers de chaque marché

        return assets

# Instance globale
auto_scanner = None

def init_auto_scanner(bot: Bot):
    """Initialise le service de scan automatique"""
    global auto_scanner
    auto_scanner = AutoScannerService(bot)
    return auto_scanner
