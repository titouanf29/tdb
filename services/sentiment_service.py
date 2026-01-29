"""
Service d'Analyse de Sentiment - Twitter/Reddit/News
Analyse le sentiment social pour completer le Fear & Greed
"""
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import re
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')


class SentimentService:
    """Service d'analyse de sentiment social"""

    def __init__(self):
        # Mots-cles positifs/negatifs pour l'analyse basique
        self.positive_words = [
            'bullish', 'moon', 'rocket', 'buy', 'long', 'pump', 'green',
            'profit', 'gain', 'winner', 'breakout', 'rally', 'strong',
            'growth', 'opportunity', 'undervalued', 'hodl', 'diamond',
            'achat', 'hausse', 'positif', 'gagner', 'monter'
        ]
        self.negative_words = [
            'bearish', 'crash', 'dump', 'sell', 'short', 'red', 'loss',
            'loser', 'breakdown', 'weak', 'overvalued', 'bubble', 'fear',
            'panic', 'scam', 'fraud', 'warning', 'risk', 'drop', 'fall',
            'vente', 'baisse', 'negatif', 'perdre', 'chute'
        ]

        # Cache des resultats
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = 900  # 15 minutes

    async def analyze_text_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyse le sentiment d'un texte

        Returns:
            {
                'score': -1 to 1 (negatif a positif),
                'label': 'bearish'/'neutral'/'bullish',
                'confidence': 0 to 1,
                'positive_count': int,
                'negative_count': int
            }
        """
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)

        positive_count = sum(1 for w in words if w in self.positive_words)
        negative_count = sum(1 for w in words if w in self.negative_words)

        total = positive_count + negative_count
        if total == 0:
            return {
                'score': 0,
                'label': 'neutral',
                'confidence': 0,
                'positive_count': 0,
                'negative_count': 0
            }

        score = (positive_count - negative_count) / total
        confidence = min(total / 10, 1.0)  # Plus de mots = plus de confiance

        if score > 0.2:
            label = 'bullish'
        elif score < -0.2:
            label = 'bearish'
        else:
            label = 'neutral'

        return {
            'score': round(score, 2),
            'label': label,
            'confidence': round(confidence, 2),
            'positive_count': positive_count,
            'negative_count': negative_count
        }

    async def get_reddit_sentiment(self, symbol: str) -> Dict[str, Any]:
        """
        Recupere et analyse le sentiment Reddit pour un symbole

        Note: Utilise l'API publique Reddit (sans auth)
        """
        cache_key = f"reddit_{symbol}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() < cached['expires']:
                return cached['data']

        subreddits = ['wallstreetbets', 'stocks', 'investing', 'cryptocurrency']
        all_sentiments = []

        async with aiohttp.ClientSession() as session:
            for subreddit in subreddits:
                try:
                    url = f"https://www.reddit.com/r/{subreddit}/search.json"
                    params = {
                        'q': symbol,
                        'sort': 'new',
                        'limit': 25,
                        't': 'day'
                    }
                    headers = {'User-Agent': 'TDB-Bot/1.0'}

                    async with session.get(url, params=params, headers=headers, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            posts = data.get('data', {}).get('children', [])

                            for post in posts:
                                post_data = post.get('data', {})
                                title = post_data.get('title', '')
                                selftext = post_data.get('selftext', '')
                                text = f"{title} {selftext}"

                                sentiment = await self.analyze_text_sentiment(text)
                                sentiment['upvotes'] = post_data.get('ups', 0)
                                sentiment['subreddit'] = subreddit
                                all_sentiments.append(sentiment)

                except Exception as e:
                    print(f"Reddit fetch error ({subreddit}): {e}")
                    continue

                await asyncio.sleep(0.5)  # Rate limiting

        if not all_sentiments:
            return {
                'symbol': symbol,
                'source': 'reddit',
                'sentiment_score': 0,
                'label': 'neutral',
                'post_count': 0,
                'error': 'No data available'
            }

        # Calculer le sentiment moyen pondere par upvotes
        total_weight = sum(max(s['upvotes'], 1) for s in all_sentiments)
        weighted_score = sum(s['score'] * max(s['upvotes'], 1) for s in all_sentiments) / total_weight

        bullish_count = sum(1 for s in all_sentiments if s['label'] == 'bullish')
        bearish_count = sum(1 for s in all_sentiments if s['label'] == 'bearish')

        if weighted_score > 0.15:
            label = 'bullish'
        elif weighted_score < -0.15:
            label = 'bearish'
        else:
            label = 'neutral'

        result = {
            'symbol': symbol,
            'source': 'reddit',
            'sentiment_score': round(weighted_score, 2),
            'label': label,
            'post_count': len(all_sentiments),
            'bullish_posts': bullish_count,
            'bearish_posts': bearish_count,
            'neutral_posts': len(all_sentiments) - bullish_count - bearish_count,
            'timestamp': datetime.now().isoformat()
        }

        # Mettre en cache
        self._cache[cache_key] = {
            'data': result,
            'expires': datetime.now() + timedelta(seconds=self._cache_ttl)
        }

        return result

    async def get_crypto_fear_greed(self) -> Dict[str, Any]:
        """Recupere l'indice Fear & Greed Crypto depuis alternative.me"""
        cache_key = "crypto_fear_greed"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.now() < cached['expires']:
                return cached['data']

        try:
            async with aiohttp.ClientSession() as session:
                url = "https://api.alternative.me/fng/?limit=1"
                async with session.get(url, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        fng_data = data.get('data', [{}])[0]

                        result = {
                            'value': int(fng_data.get('value', 50)),
                            'label': fng_data.get('value_classification', 'Neutral'),
                            'timestamp': fng_data.get('timestamp', ''),
                            'source': 'alternative.me'
                        }

                        self._cache[cache_key] = {
                            'data': result,
                            'expires': datetime.now() + timedelta(hours=1)
                        }

                        return result

        except Exception as e:
            print(f"Fear & Greed API error: {e}")

        return {'value': 50, 'label': 'Neutral', 'error': 'API unavailable'}

    async def get_market_sentiment_summary(self, symbols: List[str] = None) -> Dict[str, Any]:
        """
        Genere un resume du sentiment marche

        Args:
            symbols: Liste de symboles a analyser (defaut: principaux indices)
        """
        if symbols is None:
            symbols = ['SPY', 'QQQ', 'BTC-USD', 'ETH-USD']

        results = []

        for symbol in symbols[:5]:  # Max 5 symboles
            sentiment = await self.get_reddit_sentiment(symbol)
            results.append(sentiment)
            await asyncio.sleep(1)  # Rate limiting

        # Fear & Greed crypto
        crypto_fg = await self.get_crypto_fear_greed()

        # Calculer le sentiment global
        valid_scores = [r['sentiment_score'] for r in results if 'error' not in r]
        avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0

        if avg_score > 0.15:
            overall_label = 'bullish'
        elif avg_score < -0.15:
            overall_label = 'bearish'
        else:
            overall_label = 'neutral'

        return {
            'overall_score': round(avg_score, 2),
            'overall_label': overall_label,
            'crypto_fear_greed': crypto_fg,
            'by_symbol': results,
            'timestamp': datetime.now().isoformat()
        }

    async def generate_sentiment_chart(self, symbol: str) -> Optional[BytesIO]:
        """Genere un graphique de sentiment pour un symbole"""
        sentiment = await self.get_reddit_sentiment(symbol)

        if 'error' in sentiment and sentiment.get('post_count', 0) == 0:
            return None

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

        # Pie chart des sentiments
        labels = ['Bullish', 'Neutral', 'Bearish']
        sizes = [
            sentiment.get('bullish_posts', 0),
            sentiment.get('neutral_posts', 0),
            sentiment.get('bearish_posts', 0)
        ]
        colors = ['#00C853', '#757575', '#FF1744']
        explode = (0.05, 0, 0.05)

        if sum(sizes) > 0:
            ax1.pie(sizes, explode=explode, labels=labels, colors=colors,
                    autopct='%1.1f%%', startangle=90)
            ax1.set_title(f'Sentiment Distribution - {symbol}')

        # Gauge du score
        score = sentiment.get('sentiment_score', 0)
        score_normalized = (score + 1) / 2 * 100  # Convertir -1/1 en 0/100

        ax2.barh(['Sentiment'], [score_normalized], color='#2196F3', height=0.3)
        ax2.axvline(x=50, color='gray', linestyle='--', alpha=0.5)
        ax2.set_xlim(0, 100)
        ax2.set_xlabel('Bearish ← → Bullish')
        ax2.set_title(f'Score: {score:.2f} ({sentiment.get("label", "neutral").upper()})')

        # Annotations
        ax2.text(10, 0, '🐻', fontsize=20, va='center')
        ax2.text(85, 0, '🐂', fontsize=20, va='center')

        plt.tight_layout()

        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)

        return buf

    def format_sentiment_report(self, sentiment_data: Dict) -> str:
        """Formate un rapport de sentiment textuel"""
        report = "📊 **ANALYSE DE SENTIMENT**\n"
        report += "━" * 25 + "\n\n"

        if 'error' in sentiment_data:
            report += f"⚠️ {sentiment_data['error']}\n"
            return report

        symbol = sentiment_data.get('symbol', 'N/A')
        score = sentiment_data.get('sentiment_score', 0)
        label = sentiment_data.get('label', 'neutral')
        post_count = sentiment_data.get('post_count', 0)

        # Emoji selon le sentiment
        if label == 'bullish':
            emoji = "🐂"
            color = "🟢"
        elif label == 'bearish':
            emoji = "🐻"
            color = "🔴"
        else:
            emoji = "😐"
            color = "🟡"

        report += f"📈 **{symbol}** {emoji}\n\n"
        report += f"{color} Sentiment: **{label.upper()}**\n"
        report += f"📊 Score: {score:+.2f} (-1 à +1)\n"
        report += f"📝 Posts analysés: {post_count}\n\n"

        if post_count > 0:
            bullish = sentiment_data.get('bullish_posts', 0)
            bearish = sentiment_data.get('bearish_posts', 0)
            neutral = post_count - bullish - bearish

            report += "📊 **Distribution:**\n"
            report += f"   🟢 Bullish: {bullish} ({bullish/post_count*100:.0f}%)\n"
            report += f"   🟡 Neutral: {neutral} ({neutral/post_count*100:.0f}%)\n"
            report += f"   🔴 Bearish: {bearish} ({bearish/post_count*100:.0f}%)\n"

        report += f"\n🕐 Source: Reddit | {datetime.now().strftime('%H:%M')}"

        return report


# Instance globale
sentiment_service = SentimentService()
