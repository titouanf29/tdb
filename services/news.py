"""
Service de récupération et analyse des actualités financières
"""
import yfinance as yf
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import json


class NewsService:
    """Service de gestion des actualités financières"""

    def __init__(self):
        self.positive_words = [
            'gain', 'surge', 'rally', 'bullish', 'growth', 'profit', 'upgrade',
            'beat', 'success', 'strong', 'rise', 'soar', 'record', 'high',
            'outperform', 'boost', 'positive', 'excellent', 'impressive',
            'hausse', 'progression', 'bénéfice', 'croissance', 'succès'
        ]

        self.negative_words = [
            'loss', 'fall', 'drop', 'decline', 'bearish', 'downgrade', 'miss',
            'weak', 'concern', 'warning', 'cut', 'plunge', 'crash', 'risk',
            'underperform', 'negative', 'poor', 'disappointing', 'worst',
            'baisse', 'chute', 'perte', 'recul', 'inquiétude'
        ]

    def analyze_sentiment(self, title, summary=""):
        """Analyse le sentiment d'une news (Positif/Négatif/Neutre)"""
        try:
            text = (title + " " + summary).lower()

            positive_count = sum(1 for word in self.positive_words if word in text)
            negative_count = sum(1 for word in self.negative_words if word in text)

            if positive_count > negative_count:
                return {'label': 'Positif', 'emoji': '🟢', 'score': positive_count}
            elif negative_count > positive_count:
                return {'label': 'Négatif', 'emoji': '🔴', 'score': negative_count}
            else:
                return {'label': 'Neutre', 'emoji': '⚪', 'score': 0}

        except:
            return {'label': 'Neutre', 'emoji': '⚪', 'score': 0}

    def get_news(self, ticker, limit=8):
        """
        Récupère les actualités depuis multiples sources avec analyse de sentiment

        Args:
            ticker: Symbol de l'actif (ex: AAPL, TSLA)
            limit: Nombre maximum d'articles à retourner

        Returns:
            Liste d'articles avec titre, source, lien, date, sentiment
        """
        try:
            all_news = []

            # ============ SOURCE 1: Yahoo Finance ============
            try:
                stock = yf.Ticker(ticker)
                news = stock.news

                if news:
                    for article in news[:6]:
                        title = article.get('title', '')
                        if not title or title == 'Sans titre':
                            continue

                        # Date valide
                        published = article.get('providerPublishTime', 0)
                        if published < 1000000000:  # Timestamp invalide
                            published = int(datetime.now().timestamp())

                        # Résumé
                        summary = article.get('summary', '')
                        if not summary:
                            summary = article.get('content', '')

                        # Limiter le résumé
                        if len(summary) > 200:
                            summary = summary[:200] + "..."

                        all_news.append({
                            'title': title,
                            'publisher': article.get('publisher', 'Yahoo Finance'),
                            'link': article.get('link', ''),
                            'published': published,
                            'summary': summary,
                            'source': 'Yahoo Finance'
                        })
            except Exception as e:
                print(f"[NEWS] Erreur Yahoo Finance: {e}")

            # ============ SOURCE 2: Finviz News ============
            try:
                url = f"https://finviz.com/quote.ashx?t={ticker}"
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, timeout=5)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    news_table = soup.find('table', {'id': 'news-table'})

                    if news_table:
                        rows = news_table.find_all('tr')[:8]

                        for row in rows:
                            cells = row.find_all('td')
                            if len(cells) >= 2:
                                # Date/heure
                                date_cell = cells[0].text.strip()

                                # Titre et lien
                                link_tag = cells[1].find('a')
                                if link_tag:
                                    title = link_tag.text.strip()
                                    link = link_tag.get('href', '')
                                    publisher = cells[1].find('span').text.strip() if cells[1].find('span') else 'Finviz'

                                    # Parser la date
                                    try:
                                        if 'Today' in date_cell or ':' in date_cell:
                                            published = int(datetime.now().timestamp())
                                        else:
                                            # Format type "Jan-06-25"
                                            date_parts = date_cell.split()
                                            if len(date_parts) > 0:
                                                date_str = date_parts[0]
                                                pub_date = datetime.strptime(date_str, "%b-%d-%y")
                                                published = int(pub_date.timestamp())
                                            else:
                                                published = int(datetime.now().timestamp())
                                    except:
                                        published = int(datetime.now().timestamp())

                                    all_news.append({
                                        'title': title,
                                        'publisher': publisher,
                                        'link': link,
                                        'published': published,
                                        'summary': '',
                                        'source': 'Finviz'
                                    })
            except Exception as e:
                print(f"[NEWS] Erreur Finviz: {e}")

            # ============ Trier et limiter ============
            all_news.sort(key=lambda x: x['published'], reverse=True)
            all_news = all_news[:limit]

            # ============ Analyse de sentiment ============
            for article in all_news:
                sentiment = self.analyze_sentiment(article['title'], article.get('summary', ''))
                article['sentiment'] = sentiment

            return all_news

        except Exception as e:
            print(f"[NEWS] Erreur globale: {e}")
            return []

    def get_news_summary(self, ticker):
        """
        Récupère un résumé des actualités pour l'analyse

        Returns:
            dict avec headlines, sentiment global, impact
        """
        news_summary = {
            'headlines': [],
            'sentiment': 'NEUTRE',
            'impact_level': 'FAIBLE',
            'count': 0
        }

        try:
            news = self.get_news(ticker, limit=5)

            if news and len(news) > 0:
                news_summary['count'] = len(news)

                # Extraire les titres
                for article in news[:3]:
                    news_summary['headlines'].append(article['title'])

                # Calculer le sentiment global
                sentiments = [article.get('sentiment', {}) for article in news]
                positive_scores = sum(s.get('score', 0) for s in sentiments if s.get('label') == 'Positif')
                negative_scores = sum(s.get('score', 0) for s in sentiments if s.get('label') == 'Négatif')

                if positive_scores > negative_scores:
                    news_summary['sentiment'] = 'POSITIF'
                    news_summary['impact_level'] = 'MODÉRÉ' if positive_scores > 3 else 'FAIBLE'
                elif negative_scores > positive_scores:
                    news_summary['sentiment'] = 'NÉGATIF'
                    news_summary['impact_level'] = 'MODÉRÉ' if negative_scores > 3 else 'FAIBLE'

        except Exception as e:
            print(f"[NEWS] Erreur get_news_summary: {e}")

        return news_summary


# Instance globale
news_service = NewsService()
