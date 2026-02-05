"""
Service de News - Integration actualites financieres en temps reel
RSS feeds et APIs gratuites
"""
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import xml.etree.ElementTree as ET
import html
import re


class NewsService:
    """Service d'actualites financieres"""

    def __init__(self):
        # Sources RSS gratuites
        self.rss_sources = {
            'yahoo_finance': 'https://feeds.finance.yahoo.com/rss/2.0/headline',
            'investing': 'https://www.investing.com/rss/news.rss',
            'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
            'reuters_business': 'https://www.reutersagency.com/feed/?best-topics=business-finance',
            'marketwatch': 'https://feeds.marketwatch.com/marketwatch/topstories/',
        }

        # Cache
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = 600  # 10 minutes

    async def fetch_rss_feed(self, url: str, limit: int = 10) -> List[Dict]:
        """Recupere et parse un flux RSS"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                async with session.get(url, headers=headers, timeout=15) as resp:
                    if resp.status != 200:
                        return []

                    content = await resp.text()
                    root = ET.fromstring(content)

                    items = []
                    # Chercher les items dans differents formats RSS
                    for item in root.findall('.//item')[:limit]:
                        title = item.find('title')
                        link = item.find('link')
                        pub_date = item.find('pubDate')
                        description = item.find('description')

                        news_item = {
                            'title': self._clean_text(title.text if title is not None else ''),
                            'link': link.text if link is not None else '',
                            'date': self._parse_date(pub_date.text if pub_date is not None else ''),
                            'description': self._clean_text(
                                description.text if description is not None else ''
                            )[:200]
                        }

                        if news_item['title']:
                            items.append(news_item)

                    return items

        except Exception as e:
            print(f"RSS fetch error ({url}): {e}")
            return []

    def _clean_text(self, text: str) -> str:
        """Nettoie le texte HTML"""
        if not text:
            return ''
        # Decoder les entites HTML
        text = html.unescape(text)
        # Supprimer les tags HTML
        text = re.sub(r'<[^>]+>', '', text)
        # Supprimer les espaces multiples
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _parse_date(self, date_str: str) -> str:
        """Parse une date RSS en format lisible"""
        if not date_str:
            return ''

        try:
            # Formats RSS courants
            formats = [
                '%a, %d %b %Y %H:%M:%S %z',
                '%a, %d %b %Y %H:%M:%S GMT',
                '%Y-%m-%dT%H:%M:%S%z',
                '%Y-%m-%d %H:%M:%S',
            ]

            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str.strip(), fmt)
                    return dt.strftime('%d/%m %H:%M')
                except ValueError:
                    continue

            return date_str[:16]

        except:
            return ''

    async def get_market_news(self, limit: int = 15) -> List[Dict]:
        """Recupere les dernieres actualites marche"""
        cache_key = f"market_news_{limit}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() < cached['expires']:
                return cached['data']

        all_news = []

        # Fetch depuis plusieurs sources en parallele
        tasks = []
        for source_name, url in list(self.rss_sources.items())[:3]:  # Limiter a 3 sources
            tasks.append(self._fetch_with_source(url, source_name, limit=5))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, list):
                all_news.extend(result)

        # Trier par date et dedupliquer
        seen_titles = set()
        unique_news = []
        for news in all_news:
            title_key = news['title'][:50].lower()
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_news.append(news)

        unique_news = unique_news[:limit]

        # Mettre en cache
        self._cache[cache_key] = {
            'data': unique_news,
            'expires': datetime.now() + timedelta(seconds=self._cache_ttl)
        }

        return unique_news

    async def _fetch_with_source(self, url: str, source: str, limit: int) -> List[Dict]:
        """Fetch RSS avec ajout de la source"""
        items = await self.fetch_rss_feed(url, limit)
        for item in items:
            item['source'] = source
        return items

    async def search_news(self, query: str, limit: int = 10) -> List[Dict]:
        """Recherche des news par mot-cle"""
        all_news = await self.get_market_news(limit=30)

        query_lower = query.lower()
        matching = [
            news for news in all_news
            if query_lower in news['title'].lower() or
               query_lower in news.get('description', '').lower()
        ]

        return matching[:limit]

    async def get_symbol_news(self, symbol: str, limit: int = 5) -> List[Dict]:
        """Recupere les news specifiques a un symbole via Yahoo Finance"""
        cache_key = f"symbol_news_{symbol}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() < cached['expires']:
                return cached['data']

        url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}&region=US&lang=en-US"

        news = await self.fetch_rss_feed(url, limit)
        for item in news:
            item['source'] = 'yahoo_finance'
            item['symbol'] = symbol

        self._cache[cache_key] = {
            'data': news,
            'expires': datetime.now() + timedelta(seconds=self._cache_ttl)
        }

        return news

    def format_news_list(self, news_items: List[Dict], title: str = "ACTUALITES") -> str:
        """Formate une liste de news pour affichage"""
        text = f"📰 **{title}**\n"
        text += "━" * 25 + "\n\n"

        if not news_items:
            text += "Aucune actualité disponible pour le moment.\n"
            return text

        for i, news in enumerate(news_items[:10], 1):
            date = news.get('date', '')
            source = news.get('source', '')[:15]

            text += f"**{i}.** {news['title'][:80]}\n"
            if date:
                text += f"   🕐 {date}"
            if source:
                text += f" | 📍 {source}"
            text += "\n\n"

        text += f"_Actualisé: {datetime.now().strftime('%H:%M')}_"

        return text

    def format_news_detail(self, news: Dict) -> str:
        """Formate le detail d'une news"""
        text = f"📰 **{news.get('title', 'N/A')}**\n\n"

        if news.get('description'):
            text += f"{news['description']}\n\n"

        if news.get('date'):
            text += f"🕐 {news['date']}\n"

        if news.get('source'):
            text += f"📍 Source: {news['source']}\n"

        if news.get('link'):
            text += f"\n🔗 [Lire l'article]({news['link']})"

        return text

    async def get_morning_briefing(self) -> str:
        """Genere un briefing matinal des actualites"""
        news = await self.get_market_news(limit=5)

        briefing = "☀️ **BRIEFING MATINAL**\n"
        briefing += f"📅 {datetime.now().strftime('%d/%m/%Y')}\n"
        briefing += "━" * 25 + "\n\n"

        if news:
            briefing += "📰 **Actualités du jour:**\n\n"
            for i, item in enumerate(news, 1):
                briefing += f"{i}. {item['title'][:70]}...\n"

        return briefing


# Instance globale
news_service = NewsService()
