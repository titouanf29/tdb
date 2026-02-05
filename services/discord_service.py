"""
Service Discord - Notifications vers serveur Discord
Alertes marchés, résumés, calendrier économique
"""
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import config

logger = logging.getLogger(__name__)


class DiscordService:
    """Service pour envoyer des notifications Discord via webhook"""

    def __init__(self):
        self.webhook_url = getattr(config, 'DISCORD_WEBHOOK_URL', None)
        self.enabled = bool(self.webhook_url)
        self._market_status = {}  # Garde l'état précédent des marchés

    async def send_message(self, content: str, embed: Optional[Dict] = None, username: str = "TDB Bot") -> bool:
        """Envoie un message sur Discord via webhook"""
        if not self.enabled:
            logger.warning("Discord non configuré - DISCORD_WEBHOOK_URL manquant")
            return False

        payload = {
            "username": username,
            "avatar_url": "https://i.imgur.com/4M34hi2.png"
        }

        if content:
            payload["content"] = content

        if embed:
            payload["embeds"] = [embed]

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=payload) as response:
                    if response.status == 204:
                        return True
                    else:
                        logger.error(f"Discord webhook error: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Erreur envoi Discord: {e}")
            return False

    async def send_market_open_alert(self, market_code: str, market_name: str):
        """Envoie une alerte d'ouverture de marché"""
        now = datetime.now()

        embed = {
            "title": f"🟢 {market_name} - OUVERTURE",
            "description": f"Le marché **{market_name}** vient d'ouvrir !",
            "color": 0x00FF00,  # Vert
            "fields": [
                {"name": "📅 Date", "value": now.strftime("%d/%m/%Y"), "inline": True},
                {"name": "⏰ Heure", "value": now.strftime("%H:%M"), "inline": True},
                {"name": "🏷️ Code", "value": market_code, "inline": True}
            ],
            "footer": {"text": "TDB Trading Bot"},
            "timestamp": now.isoformat()
        }

        await self.send_message(content=None, embed=embed, username="TDB Marchés")

    async def send_market_close_alert(self, market_code: str, market_name: str, summary: Optional[Dict] = None):
        """Envoie une alerte de fermeture de marché avec résumé"""
        now = datetime.now()

        description = f"Le marché **{market_name}** vient de fermer."
        if summary:
            top_gainers = summary.get('top_gainers', [])
            top_losers = summary.get('top_losers', [])

            if top_gainers:
                description += "\n\n**📈 Top Hausses:**\n"
                for g in top_gainers[:3]:
                    description += f"• {g['symbol']}: +{g['change']:.2f}%\n"

            if top_losers:
                description += "\n**📉 Top Baisses:**\n"
                for l in top_losers[:3]:
                    description += f"• {l['symbol']}: {l['change']:.2f}%\n"

        embed = {
            "title": f"🔴 {market_name} - FERMETURE",
            "description": description,
            "color": 0xFF0000,  # Rouge
            "fields": [
                {"name": "📅 Date", "value": now.strftime("%d/%m/%Y"), "inline": True},
                {"name": "⏰ Heure", "value": now.strftime("%H:%M"), "inline": True}
            ],
            "footer": {"text": "TDB Trading Bot"},
            "timestamp": now.isoformat()
        }

        await self.send_message(content=None, embed=embed, username="TDB Marchés")

    async def send_economic_calendar(self, events: List[Dict]):
        """Envoie le calendrier économique sur Discord"""
        now = datetime.now()

        if not events:
            description = "✅ Aucun événement majeur prévu cette semaine."
        else:
            description = ""
            for event in events[:10]:
                emoji = event.get('emoji', '📌')
                name = event.get('name', 'Événement')
                date = event.get('date')
                days = event.get('days_until', 0)
                impact = event.get('impact', 'MEDIUM')

                # Format date FR
                if isinstance(date, datetime):
                    date_str = date.strftime('%d/%m à %H:%M') if date.hour else date.strftime('%d/%m')
                else:
                    date_str = str(date)

                # Impact indicator
                impact_emoji = '🔴' if impact == 'HIGH' else '🟡' if impact == 'MEDIUM' else '🟢'

                # Days indicator
                if days == 0:
                    days_str = "**AUJOURD'HUI**"
                elif days == 1:
                    days_str = "**DEMAIN**"
                else:
                    days_str = f"J-{days}"

                description += f"{emoji} **{name}** {impact_emoji}\n"
                description += f"   📅 {date_str} ({days_str})\n\n"

        embed = {
            "title": "📅 Calendrier Économique",
            "description": description,
            "color": 0x3498DB,  # Bleu
            "fields": [
                {"name": "Légende", "value": "🔴 Impact élevé | 🟡 Modéré | 🟢 Faible", "inline": False}
            ],
            "footer": {"text": f"TDB Bot • Mis à jour le {now.strftime('%d/%m/%Y à %H:%M')}"},
            "timestamp": now.isoformat()
        }

        await self.send_message(content=None, embed=embed, username="TDB Calendrier")

    async def send_alert_notification(self, symbol: str, condition: str, target_price: float, current_price: float):
        """Envoie une notification d'alerte de prix"""
        now = datetime.now()

        direction = "📈 au-dessus de" if condition == "above" else "📉 en-dessous de"
        color = 0x00FF00 if condition == "above" else 0xFF0000

        embed = {
            "title": f"🚨 ALERTE PRIX - {symbol}",
            "description": f"Le prix de **{symbol}** est passé {direction} **{target_price:.2f}$**",
            "color": color,
            "fields": [
                {"name": "💰 Prix actuel", "value": f"{current_price:.2f}$", "inline": True},
                {"name": "🎯 Seuil", "value": f"{target_price:.2f}$", "inline": True},
                {"name": "⏰ Heure", "value": now.strftime("%H:%M"), "inline": True}
            ],
            "footer": {"text": "TDB Trading Bot"},
            "timestamp": now.isoformat()
        }

        await self.send_message(content=None, embed=embed, username="TDB Alertes")

    async def check_market_transitions(self):
        """Vérifie les transitions d'état des marchés (ouverture/fermeture)"""
        from utils.helpers import is_market_open, get_market_status_message

        for market_code in ['USA', 'EUROPE', 'ASIA']:
            market_info = config.MARKETS.get(market_code, {})
            market_name = market_info.get('name', market_code)

            is_open = is_market_open(market_code)
            previous_state = self._market_status.get(market_code)

            if previous_state is not None:
                # Transition vers OUVERT
                if is_open and not previous_state:
                    await self.send_market_open_alert(market_code, market_name)
                    logger.info(f"Discord: Alerte ouverture {market_code}")

                # Transition vers FERMÉ
                elif not is_open and previous_state:
                    # TODO: Ajouter résumé du marché
                    await self.send_market_close_alert(market_code, market_name)
                    logger.info(f"Discord: Alerte fermeture {market_code}")

            self._market_status[market_code] = is_open

    async def start_market_monitor(self):
        """Démarre le monitoring des marchés pour Discord"""
        if not self.enabled:
            logger.info("Discord désactivé - pas de monitoring")
            return

        logger.info("Discord: Démarrage du monitoring des marchés")

        # Initialiser l'état actuel
        from utils.helpers import is_market_open
        for market_code in ['USA', 'EUROPE', 'ASIA']:
            self._market_status[market_code] = is_market_open(market_code)

        # Boucle de vérification toutes les minutes
        while True:
            try:
                await self.check_market_transitions()
            except Exception as e:
                logger.error(f"Discord monitoring error: {e}")

            await asyncio.sleep(60)  # Vérifier toutes les minutes


# Instance globale
discord_service = DiscordService()
