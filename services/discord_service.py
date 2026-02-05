"""
Service Discord - Notifications vers serveur Discord
Alertes marchés, résumés, calendrier économique
"""
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import pytz

try:
    import config
except ImportError:
    config = None

logger = logging.getLogger(__name__)


class DiscordService:
    """Service pour envoyer des notifications Discord via webhook"""

    # Définition des marchés avec leurs horaires (heure locale)
    MARKETS = {
        'asia': {
            'name': 'Asie',
            'emoji': '🇯🇵',
            'timezone': 'Asia/Tokyo',
            'open_hour': 9,
            'open_minute': 0,
            'close_hour': 15,
            'close_minute': 0,
            'days': [0, 1, 2, 3, 4],  # Lundi à Vendredi
            'indices': ['Nikkei 225', 'Hang Seng', 'Shanghai Composite']
        },
        'europe': {
            'name': 'Europe',
            'emoji': '🇪🇺',
            'timezone': 'Europe/Paris',
            'open_hour': 9,
            'open_minute': 0,
            'close_hour': 17,
            'close_minute': 30,
            'days': [0, 1, 2, 3, 4],
            'indices': ['CAC 40', 'DAX', 'FTSE 100']
        },
        'us': {
            'name': 'US',
            'emoji': '🇺🇸',
            'timezone': 'America/New_York',
            'open_hour': 9,
            'open_minute': 30,
            'close_hour': 16,
            'close_minute': 0,
            'days': [0, 1, 2, 3, 4],
            'indices': ['S&P 500', 'Nasdaq', 'Dow Jones']
        },
        'crypto': {
            'name': 'Crypto',
            'emoji': '₿',
            'timezone': 'UTC',
            'always_open': True,
            'indices': ['Bitcoin', 'Ethereum']
        }
    }

    def __init__(self):
        self.webhook_url = getattr(config, 'DISCORD_WEBHOOK_URL', None) if config else None
        self.enabled = bool(self.webhook_url)
        self._market_status = {}  # Track market open/close status
        self._last_calendar_send = None

    async def send_message(self, content: str = None, embed: Optional[Dict] = None, username: str = "TDB Bot") -> bool:
        """Envoie un message via webhook Discord"""
        if not self.enabled:
            logger.debug("Discord non configuré, message ignoré")
            return False

        try:
            payload = {"username": username}
            if content:
                payload["content"] = content
            if embed:
                payload["embeds"] = [embed]

            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=payload) as response:
                    if response.status in [200, 204]:
                        logger.info(f"Discord: Message envoyé avec succès")
                        return True
                    else:
                        logger.error(f"Discord: Erreur {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Discord: Erreur envoi - {e}")
            return False

    async def send_market_open_alert(self, market_key: str):
        """Envoie une alerte d'ouverture de marché"""
        market = self.MARKETS.get(market_key)
        if not market:
            return

        embed = {
            "title": f"{market['emoji']} Ouverture {market['name']}",
            "description": f"Le marché **{market['name']}** est maintenant ouvert !",
            "color": 0x00FF00,  # Vert
            "fields": [
                {
                    "name": "Indices principaux",
                    "value": "\n".join([f"• {idx}" for idx in market['indices']]),
                    "inline": True
                }
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Alertes Marchés"}
        }

        await self.send_message(embed=embed)

    async def send_market_close_alert(self, market_key: str, summary: Optional[Dict] = None):
        """Envoie une alerte de fermeture avec résumé"""
        market = self.MARKETS.get(market_key)
        if not market:
            return

        fields = [
            {
                "name": "Indices principaux",
                "value": "\n".join([f"• {idx}" for idx in market['indices']]),
                "inline": True
            }
        ]

        # Ajouter le résumé si disponible
        if summary:
            if 'variation' in summary:
                fields.append({
                    "name": "Variation du jour",
                    "value": f"{summary['variation']:+.2f}%",
                    "inline": True
                })
            if 'top_gainers' in summary:
                fields.append({
                    "name": "Top Hausses",
                    "value": "\n".join(summary['top_gainers'][:3]),
                    "inline": False
                })
            if 'top_losers' in summary:
                fields.append({
                    "name": "Top Baisses",
                    "value": "\n".join(summary['top_losers'][:3]),
                    "inline": False
                })

        embed = {
            "title": f"{market['emoji']} Fermeture {market['name']}",
            "description": f"Le marché **{market['name']}** est maintenant fermé.",
            "color": 0xFF0000,  # Rouge
            "fields": fields,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Alertes Marchés"}
        }

        await self.send_message(embed=embed)

    async def send_economic_calendar(self, events: List[Dict]):
        """Envoie le calendrier économique du jour"""
        if not events:
            return

        paris_tz = pytz.timezone('Europe/Paris')
        now = datetime.now(paris_tz)

        events_text = []
        for event in events[:10]:  # Max 10 événements
            time_str = event.get('time', '—')
            name = event.get('name', 'Événement')
            country = event.get('country', '')
            impact = event.get('impact', '')

            impact_emoji = {'high': '🔴', 'medium': '🟠', 'low': '🟢'}.get(impact, '⚪')
            events_text.append(f"{impact_emoji} **{time_str}** - {country} {name}")

        embed = {
            "title": "📅 Calendrier Économique",
            "description": f"**{now.strftime('%A %d %B %Y')}**\n\n" + "\n".join(events_text),
            "color": 0x3498DB,
            "footer": {"text": "TDB Bot - Heure de Paris (FR)"},
            "timestamp": datetime.utcnow().isoformat()
        }

        await self.send_message(embed=embed)

    def _is_market_open(self, market_key: str) -> bool:
        """Vérifie si un marché est ouvert"""
        market = self.MARKETS.get(market_key)
        if not market:
            return False

        if market.get('always_open'):
            return True

        tz = pytz.timezone(market['timezone'])
        now = datetime.now(tz)

        # Vérifier le jour
        if now.weekday() not in market['days']:
            return False

        # Vérifier l'heure
        open_time = now.replace(hour=market['open_hour'], minute=market['open_minute'], second=0, microsecond=0)
        close_time = now.replace(hour=market['close_hour'], minute=market['close_minute'], second=0, microsecond=0)

        return open_time <= now <= close_time

    async def start_market_monitor(self):
        """Démarre le monitoring des marchés en boucle"""
        logger.info("Discord: Démarrage du monitoring des marchés")

        # Initialiser les statuts
        for market_key in self.MARKETS:
            if not self.MARKETS[market_key].get('always_open'):
                self._market_status[market_key] = self._is_market_open(market_key)

        while True:
            try:
                for market_key, market in self.MARKETS.items():
                    if market.get('always_open'):
                        continue

                    is_open = self._is_market_open(market_key)
                    was_open = self._market_status.get(market_key, False)

                    # Transition fermé -> ouvert
                    if is_open and not was_open:
                        logger.info(f"Discord: Marché {market['name']} ouvert")
                        await self.send_market_open_alert(market_key)

                    # Transition ouvert -> fermé
                    elif not is_open and was_open:
                        logger.info(f"Discord: Marché {market['name']} fermé")
                        await self.send_market_close_alert(market_key)

                    self._market_status[market_key] = is_open

                # Vérifier toutes les 30 secondes
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Discord: Erreur monitoring - {e}")
                await asyncio.sleep(60)


# Instance globale
discord_service = DiscordService()
