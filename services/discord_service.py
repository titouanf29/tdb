"""
Service Discord - Notifications vers serveur Discord
Alertes marchés, résumés, calendrier économique, top movers, alertes prix
"""
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import pytz
import yfinance as yf

try:
    import config
except ImportError:
    config = None

logger = logging.getLogger(__name__)


class DiscordService:
    """Service pour envoyer des notifications Discord via webhook"""

    # Définition des marchés avec leurs horaires
    MARKETS = {
        'asia': {
            'name': 'Asie',
            'emoji': '🇯🇵',
            'timezone': 'Asia/Tokyo',
            'open_hour': 9,
            'open_minute': 0,
            'close_hour': 15,
            'close_minute': 0,
            'days': [0, 1, 2, 3, 4],
            'indices': ['^N225', '^HSI'],
            'index_names': {'^N225': 'Nikkei 225', '^HSI': 'Hang Seng'},
            'top_assets': ['^N225', '^HSI', '7203.T', '6758.T', '9984.T']
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
            'indices': ['^FCHI', '^GDAXI', '^STOXX50E'],
            'index_names': {'^FCHI': 'CAC 40', '^GDAXI': 'DAX', '^STOXX50E': 'Euro Stoxx 50'},
            'top_assets': ['MC.PA', 'OR.PA', 'AIR.PA', 'SAN.PA', 'BNP.PA', 'TTE.PA', 'VOW3.DE', 'SIE.DE']
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
            'indices': ['^GSPC', '^DJI', '^IXIC'],
            'index_names': {'^GSPC': 'S&P 500', '^DJI': 'Dow Jones', '^IXIC': 'Nasdaq'},
            'top_assets': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'JNJ']
        },
        'crypto': {
            'name': 'Crypto',
            'emoji': '₿',
            'timezone': 'UTC',
            'always_open': True,
            'indices': ['BTC-USD', 'ETH-USD'],
            'index_names': {'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum'},
            'top_assets': ['BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD']
        }
    }

    # Actifs à surveiller pour les alertes ±3% (avec leur marché)
    MONITORED_ASSETS = {
        # US (ouvert 15h30-22h Paris)
        'AAPL': 'us', 'MSFT': 'us', 'GOOGL': 'us', 'AMZN': 'us',
        'NVDA': 'us', 'TSLA': 'us', 'META': 'us', 'JPM': 'us',
        '^GSPC': 'us', '^IXIC': 'us', '^DJI': 'us',
        # Europe (ouvert 9h-17h30 Paris)
        'MC.PA': 'europe', 'OR.PA': 'europe', 'TTE.PA': 'europe',
        'AIR.PA': 'europe', 'BNP.PA': 'europe',
        '^FCHI': 'europe', '^GDAXI': 'europe',
        # Asie (ouvert 2h-8h Paris environ)
        '^N225': 'asia', '^HSI': 'asia',
        # Crypto (24/7)
        'BTC-USD': 'crypto', 'ETH-USD': 'crypto', 'SOL-USD': 'crypto',
    }

    # Types de canaux Discord
    CHANNEL_ANNOUNCEMENTS = "announcements"  # Ouverture/fermeture marchés, broadcasts
    CHANNEL_OPPORTUNITIES = "opportunities"  # Alertes trading, signaux, setups
    CHANNEL_NEWS = "news"  # Actualités, calendrier économique

    def __init__(self):
        # Webhooks pour chaque canal
        self.webhooks = {
            self.CHANNEL_ANNOUNCEMENTS: getattr(config, 'DISCORD_WEBHOOK_URL', None) if config else None,
            self.CHANNEL_OPPORTUNITIES: getattr(config, 'DISCORD_WEBHOOK_OPPORTUNITIES', None) if config else None,
            self.CHANNEL_NEWS: getattr(config, 'DISCORD_WEBHOOK_NEWS', None) if config else None,
        }
        # Fallback: utiliser le webhook principal si les autres ne sont pas configurés
        main_webhook = self.webhooks[self.CHANNEL_ANNOUNCEMENTS]
        for channel in [self.CHANNEL_OPPORTUNITIES, self.CHANNEL_NEWS]:
            if not self.webhooks[channel]:
                self.webhooks[channel] = main_webhook

        self.webhook_url = main_webhook  # Rétro-compatibilité
        self.enabled = bool(main_webhook)
        self._market_status = {}
        self._last_calendar_send = None
        self._last_prices = {}  # Pour tracker les variations
        self._alerted_today = set()  # Éviter les alertes répétées

    def get_webhook(self, channel: str = None) -> Optional[str]:
        """Retourne le webhook pour un canal donné"""
        if channel and channel in self.webhooks:
            return self.webhooks[channel]
        return self.webhook_url

    async def send_message(self, content: str = None, embed: Optional[Dict] = None,
                          username: str = "TDB Bot", channel: str = None) -> bool:
        """Envoie un message via webhook Discord

        Args:
            content: Message texte
            embed: Embed Discord (optionnel)
            username: Nom du bot affiché
            channel: Canal cible (announcements, opportunities, news)
        """
        webhook_url = self.get_webhook(channel)
        if not webhook_url:
            logger.debug(f"Discord: Webhook non configuré pour {channel or 'default'}")
            return False

        try:
            payload = {"username": username}
            if content:
                payload["content"] = content
            if embed:
                payload["embeds"] = [embed]

            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status in [200, 204]:
                        logger.info(f"Discord [{channel or 'main'}]: Message envoyé")
                        return True
                    else:
                        logger.error(f"Discord [{channel or 'main'}]: Erreur {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Discord [{channel or 'main'}]: Erreur envoi - {e}")
            return False

    async def _get_price_change(self, symbol: str) -> Optional[Dict]:
        """Récupère le prix et la variation d'un actif"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            if len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                previous = hist['Close'].iloc[-2]
                change = ((current - previous) / previous) * 100
                return {
                    'symbol': symbol,
                    'price': current,
                    'change': change,
                    'previous': previous
                }
            elif len(hist) == 1:
                return {
                    'symbol': symbol,
                    'price': hist['Close'].iloc[-1],
                    'change': 0,
                    'previous': hist['Close'].iloc[-1]
                }
        except Exception as e:
            logger.debug(f"Erreur prix {symbol}: {e}")
        return None

    async def _get_market_summary(self, market_key: str) -> Dict:
        """Récupère le résumé d'un marché avec données réelles"""
        market = self.MARKETS.get(market_key)
        if not market:
            return {}

        summary = {
            'indices': [],
            'top_gainers': [],
            'top_losers': [],
            'avg_change': 0
        }

        # Récupérer les données des indices
        for symbol in market.get('indices', []):
            data = await self._get_price_change(symbol)
            if data:
                name = market.get('index_names', {}).get(symbol, symbol)
                summary['indices'].append({
                    'name': name,
                    'price': data['price'],
                    'change': data['change']
                })

        # Récupérer les top movers
        all_changes = []
        for symbol in market.get('top_assets', [])[:10]:
            data = await self._get_price_change(symbol)
            if data:
                all_changes.append(data)

        if all_changes:
            # Trier par variation
            sorted_changes = sorted(all_changes, key=lambda x: x['change'], reverse=True)

            # Top 3 hausses
            for item in sorted_changes[:3]:
                if item['change'] > 0:
                    summary['top_gainers'].append(f"📈 {item['symbol']}: +{item['change']:.2f}%")

            # Top 3 baisses
            for item in sorted_changes[-3:]:
                if item['change'] < 0:
                    summary['top_losers'].append(f"📉 {item['symbol']}: {item['change']:.2f}%")

            # Moyenne
            summary['avg_change'] = sum(x['change'] for x in all_changes) / len(all_changes)

        return summary

    async def send_market_open_alert(self, market_key: str):
        """Envoie une alerte d'ouverture de marché"""
        market = self.MARKETS.get(market_key)
        if not market:
            return

        # Récupérer les données des indices pour l'ouverture
        indices_text = []
        for symbol in market.get('indices', []):
            data = await self._get_price_change(symbol)
            if data:
                name = market.get('index_names', {}).get(symbol, symbol)
                emoji = "🟢" if data['change'] >= 0 else "🔴"
                indices_text.append(f"{emoji} **{name}**: {data['price']:,.2f} ({data['change']:+.2f}%)")

        embed = {
            "title": f"{market['emoji']} Ouverture {market['name']}",
            "description": f"Le marché **{market['name']}** est maintenant ouvert !",
            "color": 0x00FF00,
            "fields": [
                {
                    "name": "📊 Indices",
                    "value": "\n".join(indices_text) if indices_text else "Données en cours...",
                    "inline": False
                }
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Alertes Marchés"}
        }

        await self.send_message(embed=embed, channel=self.CHANNEL_ANNOUNCEMENTS)

    async def send_market_close_alert(self, market_key: str):
        """Envoie une alerte de fermeture avec résumé complet"""
        market = self.MARKETS.get(market_key)
        if not market:
            return

        # Récupérer le résumé du marché
        summary = await self._get_market_summary(market_key)

        fields = []

        # Indices
        if summary.get('indices'):
            indices_text = []
            for idx in summary['indices']:
                emoji = "🟢" if idx['change'] >= 0 else "🔴"
                indices_text.append(f"{emoji} **{idx['name']}**: {idx['change']:+.2f}%")
            fields.append({
                "name": "📊 Indices",
                "value": "\n".join(indices_text),
                "inline": False
            })

        # Top Hausses
        if summary.get('top_gainers'):
            fields.append({
                "name": "🚀 Top Hausses",
                "value": "\n".join(summary['top_gainers']),
                "inline": True
            })

        # Top Baisses
        if summary.get('top_losers'):
            fields.append({
                "name": "💥 Top Baisses",
                "value": "\n".join(summary['top_losers']),
                "inline": True
            })

        # Tendance générale
        avg = summary.get('avg_change', 0)
        if avg != 0:
            trend_emoji = "📈" if avg > 0 else "📉"
            trend_text = "haussière" if avg > 0 else "baissière"
            fields.append({
                "name": f"{trend_emoji} Tendance",
                "value": f"Journée **{trend_text}** ({avg:+.2f}% en moyenne)",
                "inline": False
            })

        embed = {
            "title": f"{market['emoji']} Fermeture {market['name']}",
            "description": f"**Résumé de la séance**",
            "color": 0xFF6B35 if avg >= 0 else 0xE63946,
            "fields": fields,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Résumé Journalier"}
        }

        await self.send_message(embed=embed, channel=self.CHANNEL_ANNOUNCEMENTS)

    async def send_morning_calendar(self):
        """Envoie le calendrier économique du matin"""
        paris_tz = pytz.timezone('Europe/Paris')
        now = datetime.now(paris_tz)

        # Vérifier si déjà envoyé aujourd'hui
        if self._last_calendar_send and self._last_calendar_send.date() == now.date():
            return

        # Événements importants (simplifié)
        events = await self._get_today_events()

        if not events:
            events = [{"time": "—", "name": "Pas d'événement majeur aujourd'hui", "impact": "low", "country": ""}]

        # Formater les événements
        events_text = []
        for event in events[:10]:
            time_str = event.get('time', '—')
            name = event.get('name', 'Événement')
            country = event.get('country', '')
            impact = event.get('impact', 'low')

            impact_emoji = {'high': '🔴', 'medium': '🟠', 'low': '🟢'}.get(impact, '⚪')
            events_text.append(f"{impact_emoji} **{time_str}** {country} {name}")

        # Jours en français
        jours_fr = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        mois_fr = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                   'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

        date_fr = f"{jours_fr[now.weekday()]} {now.day} {mois_fr[now.month-1]} {now.year}"

        embed = {
            "title": "📅 Calendrier Économique",
            "description": f"**{date_fr}**\n\n" + "\n".join(events_text),
            "color": 0x3498DB,
            "fields": [
                {
                    "name": "📍 Horaires des marchés (heure Paris)",
                    "value": "🇯🇵 Asie: 02:00 - 08:00\n🇪🇺 Europe: 09:00 - 17:30\n🇺🇸 US: 15:30 - 22:00",
                    "inline": False
                }
            ],
            "footer": {"text": "TDB Bot - Heure de Paris (FR)"},
            "timestamp": datetime.utcnow().isoformat()
        }

        success = await self.send_message(embed=embed, channel=self.CHANNEL_NEWS)
        if success:
            self._last_calendar_send = now

    async def _get_today_events(self) -> List[Dict]:
        """Récupère les événements économiques du jour"""
        try:
            from services.economic_calendar import economic_calendar
            events = await economic_calendar.get_today_events()
            return events
        except Exception as e:
            logger.debug(f"Erreur calendrier: {e}")
            return []

    async def send_top_movers(self):
        """Envoie les top movers de la journée"""
        all_movers = []

        # Récupérer les données de tous les marchés ouverts
        for market_key, market in self.MARKETS.items():
            if market.get('always_open') or self._is_market_open(market_key):
                for symbol in market.get('top_assets', [])[:5]:
                    data = await self._get_price_change(symbol)
                    if data:
                        data['market'] = market['emoji']
                        all_movers.append(data)

        if not all_movers:
            return

        # Trier
        sorted_movers = sorted(all_movers, key=lambda x: x['change'], reverse=True)

        # Top 5 hausses
        gainers = [f"{m['market']} **{m['symbol']}**: +{m['change']:.2f}%"
                   for m in sorted_movers[:5] if m['change'] > 0]

        # Top 5 baisses
        losers = [f"{m['market']} **{m['symbol']}**: {m['change']:.2f}%"
                  for m in sorted_movers[-5:] if m['change'] < 0]

        embed = {
            "title": "🏆 Top Movers du Jour",
            "color": 0xF39C12,
            "fields": [
                {
                    "name": "🚀 Meilleures performances",
                    "value": "\n".join(gainers) if gainers else "Aucune hausse significative",
                    "inline": True
                },
                {
                    "name": "💥 Pires performances",
                    "value": "\n".join(losers) if losers else "Aucune baisse significative",
                    "inline": True
                }
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Top Movers"}
        }

        await self.send_message(embed=embed, channel=self.CHANNEL_OPPORTUNITIES)

    async def check_price_alerts(self):
        """Vérifie les alertes de prix ±3% (uniquement marchés ouverts)"""
        paris_tz = pytz.timezone('Europe/Paris')
        now = datetime.now(paris_tz)

        # Reset des alertes à minuit
        if now.hour == 0 and now.minute < 5:
            self._alerted_today.clear()

        for symbol, market_key in self.MONITORED_ASSETS.items():
            # Ne vérifier que si le marché est ouvert
            if not self._is_market_open(market_key):
                continue

            if symbol in self._alerted_today:
                continue

            try:
                data = await self._get_price_change(symbol)
                if data and abs(data['change']) >= 3.0:
                    # Ajouter l'info du marché
                    market = self.MARKETS.get(market_key, {})
                    data['market_emoji'] = market.get('emoji', '')
                    data['market_name'] = market.get('name', '')
                    await self._send_price_alert(symbol, data)
                    self._alerted_today.add(symbol)
            except Exception as e:
                logger.debug(f"Erreur alerte {symbol}: {e}")

    async def _send_price_alert(self, symbol: str, data: Dict):
        """Envoie une alerte de mouvement de prix"""
        is_up = data['change'] > 0
        emoji = "🚀" if is_up else "💥"
        color = 0x00FF00 if is_up else 0xFF0000
        direction = "HAUSSE" if is_up else "BAISSE"
        market_emoji = data.get('market_emoji', '')
        market_name = data.get('market_name', '')

        embed = {
            "title": f"{emoji} ALERTE {direction} {market_emoji} {symbol}",
            "description": f"**{symbol}** a bougé de **{data['change']:+.2f}%** !",
            "color": color,
            "fields": [
                {
                    "name": "🏛️ Marché",
                    "value": market_name or "—",
                    "inline": True
                },
                {
                    "name": "💰 Prix actuel",
                    "value": f"${data['price']:,.2f}",
                    "inline": True
                },
                {
                    "name": "📊 Variation",
                    "value": f"{data['change']:+.2f}%",
                    "inline": True
                }
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Alerte Prix (Marché ouvert)"}
        }

        await self.send_message(embed=embed, channel=self.CHANNEL_OPPORTUNITIES)

    def _is_market_open(self, market_key: str) -> bool:
        """Vérifie si un marché est ouvert"""
        market = self.MARKETS.get(market_key)
        if not market:
            return False

        if market.get('always_open'):
            return True

        tz = pytz.timezone(market['timezone'])
        now = datetime.now(tz)

        if now.weekday() not in market['days']:
            return False

        open_time = now.replace(hour=market['open_hour'], minute=market['open_minute'], second=0, microsecond=0)
        close_time = now.replace(hour=market['close_hour'], minute=market['close_minute'], second=0, microsecond=0)

        return open_time <= now <= close_time

    async def _get_weekly_change(self, symbol: str) -> Optional[Dict]:
        """Récupère la variation hebdomadaire d'un actif"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                week_start = hist['Close'].iloc[0]
                change = ((current - week_start) / week_start) * 100
                return {
                    'symbol': symbol,
                    'price': current,
                    'change': change,
                    'week_start': week_start
                }
        except Exception as e:
            logger.debug(f"Erreur prix hebdo {symbol}: {e}")
        return None

    async def send_weekly_summary(self):
        """Envoie le bilan hebdomadaire (vendredi soir)"""
        paris_tz = pytz.timezone('Europe/Paris')
        now = datetime.now(paris_tz)

        # Collecter les données hebdomadaires par marché
        all_weekly_data = []
        indices_data = []

        for market_key, market in self.MARKETS.items():
            # Indices
            for symbol in market.get('indices', []):
                data = await self._get_weekly_change(symbol)
                if data:
                    name = market.get('index_names', {}).get(symbol, symbol)
                    data['name'] = name
                    data['market'] = market['emoji']
                    indices_data.append(data)

            # Top assets
            for symbol in market.get('top_assets', [])[:8]:
                data = await self._get_weekly_change(symbol)
                if data:
                    data['market'] = market['emoji']
                    all_weekly_data.append(data)

        # Trier les indices par performance
        indices_data.sort(key=lambda x: x['change'], reverse=True)

        # Trier tous les actifs
        sorted_assets = sorted(all_weekly_data, key=lambda x: x['change'], reverse=True)

        # Top 5 hausses de la semaine
        top_gainers = [d for d in sorted_assets[:5] if d['change'] > 0]
        # Top 5 baisses de la semaine
        top_losers = [d for d in sorted_assets[-5:] if d['change'] < 0]
        top_losers.reverse()

        # Calculer la tendance générale
        if indices_data:
            avg_change = sum(d['change'] for d in indices_data) / len(indices_data)
        else:
            avg_change = 0

        # Déterminer le sentiment
        if avg_change > 1:
            sentiment = "🐂 BULLISH"
            color = 0x27AE60
            emoji_trend = "📈"
        elif avg_change < -1:
            sentiment = "🐻 BEARISH"
            color = 0xE74C3C
            emoji_trend = "📉"
        else:
            sentiment = "😐 NEUTRE"
            color = 0xF39C12
            emoji_trend = "➡️"

        # Construire les champs de l'embed
        fields = []

        # Performance des indices
        if indices_data:
            indices_text = []
            for idx in indices_data[:8]:
                emoji = "🟢" if idx['change'] >= 0 else "🔴"
                indices_text.append(f"{idx['market']} {emoji} **{idx['name']}**: {idx['change']:+.2f}%")
            fields.append({
                "name": "📊 Performance Indices",
                "value": "\n".join(indices_text),
                "inline": False
            })

        # Meilleurs performers
        if top_gainers:
            gainers_text = [f"{d['market']} **{d['symbol']}**: +{d['change']:.2f}%"
                          for d in top_gainers]
            fields.append({
                "name": "🏆 Stars de la Semaine",
                "value": "\n".join(gainers_text),
                "inline": True
            })

        # Pires performers
        if top_losers:
            losers_text = [f"{d['market']} **{d['symbol']}**: {d['change']:.2f}%"
                         for d in top_losers]
            fields.append({
                "name": "💔 Déceptions de la Semaine",
                "value": "\n".join(losers_text),
                "inline": True
            })

        # Résumé
        week_num = now.isocalendar()[1]
        fields.append({
            "name": f"{emoji_trend} Bilan Semaine {week_num}",
            "value": f"Tendance globale: **{sentiment}**\nVariation moyenne indices: **{avg_change:+.2f}%**",
            "inline": False
        })

        embed = {
            "title": f"📅 BILAN HEBDOMADAIRE - Semaine {week_num}",
            "description": f"Récapitulatif des marchés du {(now - timedelta(days=4)).strftime('%d/%m')} au {now.strftime('%d/%m/%Y')}",
            "color": color,
            "fields": fields,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "TDB Bot - Bon week-end ! 🎉"}
        }

        await self.send_message(embed=embed, channel=self.CHANNEL_ANNOUNCEMENTS)
        logger.info("Discord: Bilan hebdomadaire envoyé")

    async def start_market_monitor(self):
        """Démarre le monitoring complet"""
        logger.info("Discord: Démarrage du monitoring des marchés")

        # Initialiser les statuts
        for market_key in self.MARKETS:
            if not self.MARKETS[market_key].get('always_open'):
                self._market_status[market_key] = self._is_market_open(market_key)

        # Compteurs pour les tâches périodiques
        loop_count = 0

        while True:
            try:
                paris_tz = pytz.timezone('Europe/Paris')
                now = datetime.now(paris_tz)

                # === Calendrier du matin (8h00) ===
                if now.hour == 8 and now.minute < 2:
                    await self.send_morning_calendar()

                # === Alertes ouverture/fermeture marchés ===
                for market_key, market in self.MARKETS.items():
                    if market.get('always_open'):
                        continue

                    is_open = self._is_market_open(market_key)
                    was_open = self._market_status.get(market_key, False)

                    if is_open and not was_open:
                        logger.info(f"Discord: Marché {market['name']} ouvert")
                        await self.send_market_open_alert(market_key)

                    elif not is_open and was_open:
                        logger.info(f"Discord: Marché {market['name']} fermé")
                        await self.send_market_close_alert(market_key)

                        # Bilan hebdomadaire le vendredi à la fermeture du marché US
                        if market_key == 'us' and now.weekday() == 4:  # Vendredi
                            logger.info("Discord: Envoi du bilan hebdomadaire (vendredi)")
                            await asyncio.sleep(5)  # Petit délai pour ne pas spammer
                            await self.send_weekly_summary()

                    self._market_status[market_key] = is_open

                # === Alertes prix ±3% (toutes les 5 minutes) ===
                if loop_count % 10 == 0:
                    await self.check_price_alerts()

                # === Top Movers (12h et 18h) ===
                if now.hour in [12, 18] and now.minute < 2:
                    await self.send_top_movers()

                loop_count += 1
                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Discord: Erreur monitoring - {e}")
                await asyncio.sleep(60)


# Instance globale
discord_service = DiscordService()
