"""
Service d'alertes de marche - Ouverture et Fermeture
Envoie des notifications automatiques dans le canal principal
"""
from datetime import datetime, time, timedelta
import pytz
import asyncio
import config
from database.manager import db_manager
from ai.analyzer import analyzer
from services.broadcast import broadcast_service


class MarketAlertsService:
    """Gere les alertes d'ouverture et fermeture des marches"""

    def __init__(self):
        self.scheduler = None
        self.last_alerts = {}  # Pour eviter les doublons

    def get_market_times(self):
        """Retourne les horaires des marches avec leurs timezones"""
        return {
            'USA': {
                'open': time(9, 30),
                'close': time(16, 0),
                'timezone': 'America/New_York',
                'name': 'Marche US',
                'emoji': '🇺🇸'
            },
            'EUROPE': {
                'open': time(9, 0),
                'close': time(17, 30),
                'timezone': 'Europe/Paris',
                'name': 'Marche Europeen',
                'emoji': '🇪🇺'
            },
            'ASIA': {
                'open': time(9, 0),
                'close': time(15, 0),
                'timezone': 'Asia/Tokyo',
                'name': 'Marche Asiatique',
                'emoji': '🇯🇵'
            }
        }

    async def check_market_events(self):
        """Verifie si un marche vient d'ouvrir ou de fermer"""
        markets = self.get_market_times()

        for market_code, market_info in markets.items():
            try:
                tz = pytz.timezone(market_info['timezone'])
                now = datetime.now(tz)
                current_time = now.time()

                # Pas d'alertes le weekend
                if now.weekday() >= 5:
                    continue

                # Verifier ouverture (dans les 5 minutes suivant l'ouverture)
                open_time = market_info['open']
                open_dt = now.replace(hour=open_time.hour, minute=open_time.minute, second=0)
                time_since_open = (now - open_dt).total_seconds() / 60

                if 0 <= time_since_open <= 5:
                    alert_key = f"{market_code}_open_{now.date()}"
                    if alert_key not in self.last_alerts:
                        await self.send_market_open_alert(market_code, market_info)
                        self.last_alerts[alert_key] = now

                # Verifier fermeture (dans les 5 minutes suivant la fermeture)
                close_time = market_info['close']
                close_dt = now.replace(hour=close_time.hour, minute=close_time.minute, second=0)
                time_since_close = (now - close_dt).total_seconds() / 60

                if 0 <= time_since_close <= 5:
                    alert_key = f"{market_code}_close_{now.date()}"
                    if alert_key not in self.last_alerts:
                        await self.send_market_close_alert(market_code, market_info)
                        self.last_alerts[alert_key] = now

            except Exception as e:
                print(f"[MARKET_ALERTS] Erreur check {market_code}: {e}")

        # Nettoyer les anciennes alertes (plus de 24h)
        cutoff = datetime.now(pytz.UTC) - timedelta(hours=24)
        self.last_alerts = {k: v for k, v in self.last_alerts.items()
                          if v.replace(tzinfo=pytz.UTC) > cutoff}

    async def send_market_open_alert(self, market_code, market_info):
        """Envoie une alerte d'ouverture de marche"""
        try:
            print(f"[MARKET_ALERTS] Envoi alerte ouverture {market_code}")

            # Recuperer les assets du marche
            market_config = config.MARKETS.get(market_code, {})
            assets = market_config.get('assets', [])[:10]  # Top 10

            # Analyser rapidement les actifs pour trouver les opportunites
            analyses = []
            for symbol in assets[:6]:  # Limiter pour la rapidite
                try:
                    analysis = await analyzer.analyze_asset(symbol, market_code, fetch_news=False)
                    if analysis:
                        analyses.append(analysis)
                except Exception as e:
                    print(f"[MARKET_ALERTS] Erreur analyse {symbol}: {e}")

            # Generer le resume IA
            if analyses:
                ai_summary = await analyzer.generate_ai_market_summary(
                    market_code, analyses, event_type='open'
                )
            else:
                ai_summary = "Analyse en cours..."

            # Construire le message
            tz = pytz.timezone(market_info['timezone'])
            now = datetime.now(tz)

            message = f"""
{market_info['emoji']} OUVERTURE {market_info['name'].upper()}

🕐 {now.strftime('%H:%M')} ({market_info['timezone'].split('/')[-1]})

{ai_summary}

━━━━━━━━━━━━━━━━━━━━

💡 Utilisez /menu pour acceder aux analyses detaillees
"""

            # Envoyer au canal
            await broadcast_service.send_to_channel(message)

        except Exception as e:
            print(f"[MARKET_ALERTS] Erreur envoi ouverture {market_code}: {e}")

    async def send_market_close_alert(self, market_code, market_info):
        """Envoie une alerte de fermeture de marche avec recap"""
        try:
            print(f"[MARKET_ALERTS] Envoi alerte fermeture {market_code}")

            # Recuperer et analyser les actifs
            market_config = config.MARKETS.get(market_code, {})
            assets = market_config.get('assets', [])[:15]

            analyses = []
            for symbol in assets[:8]:  # Plus d'analyses pour le recap
                try:
                    analysis = await analyzer.analyze_asset(symbol, market_code, fetch_news=False)
                    if analysis:
                        analyses.append(analysis)
                except Exception as e:
                    print(f"[MARKET_ALERTS] Erreur analyse {symbol}: {e}")

            # Generer le resume IA
            if analyses:
                ai_summary = await analyzer.generate_ai_market_summary(
                    market_code, analyses, event_type='close'
                )
            else:
                ai_summary = "Recap non disponible"

            # Construire le message
            tz = pytz.timezone(market_info['timezone'])
            now = datetime.now(tz)

            message = f"""
{market_info['emoji']} CLOTURE {market_info['name'].upper()}

🕐 {now.strftime('%H:%M')} ({market_info['timezone'].split('/')[-1]})

{ai_summary}

━━━━━━━━━━━━━━━━━━━━

📊 Recap complet disponible via /menu
"""

            # Envoyer au canal
            await broadcast_service.send_to_channel(message)

        except Exception as e:
            print(f"[MARKET_ALERTS] Erreur envoi fermeture {market_code}: {e}")


# Instance globale
market_alerts_service = MarketAlertsService()
