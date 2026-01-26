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
            'hausse', 'progression', 'bénéfice', 'croissance', 'succès',
            'approval', 'innovation', 'expansion', 'breakthrough', 'winning'
        ]

        self.negative_words = [
            'loss', 'fall', 'drop', 'decline', 'bearish', 'downgrade', 'miss',
            'weak', 'concern', 'warning', 'cut', 'plunge', 'crash', 'risk',
            'underperform', 'negative', 'poor', 'disappointing', 'worst',
            'baisse', 'chute', 'perte', 'recul', 'inquiétude',
            'lawsuit', 'investigation', 'scandal', 'failure', 'bankruptcy'
        ]

        # Catégories d'actualités importantes
        self.categories = {
            'earnings': ['earnings', 'résultats', 'revenue', 'profit', 'eps', 'quarterly'],
            'acquisition': ['acquisition', 'merger', 'buyout', 'acquires', 'rachète', 'fusion'],
            'partnership': ['partnership', 'deal', 'contract', 'partenariat', 'accord'],
            'product': ['launch', 'product', 'nouveau produit', 'innovation', 'release'],
            'legal': ['lawsuit', 'investigation', 'procès', 'enquête', 'regulation'],
            'management': ['ceo', 'cfo', 'executive', 'leadership', 'directeur'],
            'analyst': ['upgrade', 'downgrade', 'analyst', 'price target', 'recommandation']
        }

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

    def categorize_news(self, title, summary=""):
        """Catégorise une actualité selon son contenu"""
        text = (title + " " + summary).lower()
        detected_categories = []

        for category, keywords in self.categories.items():
            if any(keyword in text for keyword in keywords):
                detected_categories.append(category)

        return detected_categories if detected_categories else ['general']

    def analyze_news_comprehensive(self, ticker):
        """
        Analyse complète des actualités avec résumé intelligent et prédiction

        Returns:
            dict avec résumé, tendance future, points clés, recommandation
        """
        try:
            news = self.get_news(ticker, limit=10)

            if not news or len(news) == 0:
                return {
                    'available': False,
                    'message': 'Aucune actualité récente disponible pour cet actif.'
                }

            # Analyser les sentiments
            sentiments = [article.get('sentiment', {}) for article in news]
            positive_count = sum(1 for s in sentiments if s.get('label') == 'Positif')
            negative_count = sum(1 for s in sentiments if s.get('label') == 'Négatif')
            neutral_count = len(sentiments) - positive_count - negative_count

            positive_score = sum(s.get('score', 0) for s in sentiments if s.get('label') == 'Positif')
            negative_score = sum(s.get('score', 0) for s in sentiments if s.get('label') == 'Négatif')

            # Catégoriser les news
            all_categories = []
            for article in news:
                categories = self.categorize_news(article['title'], article.get('summary', ''))
                all_categories.extend(categories)

            # Compter les catégories principales
            from collections import Counter
            category_counts = Counter(all_categories)
            top_categories = category_counts.most_common(3)

            # Identifier les points clés
            key_points = []
            for category, count in top_categories:
                if category == 'earnings':
                    key_points.append("📊 Publication de résultats financiers")
                elif category == 'acquisition':
                    key_points.append("🤝 Activité de fusion/acquisition")
                elif category == 'partnership':
                    key_points.append("🤝 Nouveaux partenariats ou contrats")
                elif category == 'product':
                    key_points.append("🚀 Lancement de nouveaux produits")
                elif category == 'legal':
                    key_points.append("⚖️ Questions juridiques ou réglementaires")
                elif category == 'analyst':
                    key_points.append("📈 Révisions d'analystes")

            # Sentiment global
            if positive_count > negative_count * 1.5:
                overall_sentiment = {
                    'label': 'TRÈS POSITIF',
                    'emoji': '🟢🟢',
                    'description': 'Les actualités sont largement favorables'
                }
            elif positive_count > negative_count:
                overall_sentiment = {
                    'label': 'POSITIF',
                    'emoji': '🟢',
                    'description': 'Les actualités sont majoritairement favorables'
                }
            elif negative_count > positive_count * 1.5:
                overall_sentiment = {
                    'label': 'TRÈS NÉGATIF',
                    'emoji': '🔴🔴',
                    'description': 'Les actualités sont largement défavorables'
                }
            elif negative_count > positive_count:
                overall_sentiment = {
                    'label': 'NÉGATIF',
                    'emoji': '🔴',
                    'description': 'Les actualités sont majoritairement défavorables'
                }
            else:
                overall_sentiment = {
                    'label': 'MIXTE',
                    'emoji': '⚪',
                    'description': 'Les actualités sont partagées entre bonnes et mauvaises nouvelles'
                }

            # Prédiction de tendance future
            future_trend = self._predict_future_trend(
                positive_score, negative_score, positive_count, negative_count, all_categories
            )

            # Générer un résumé textuel
            summary_text = self._generate_summary_text(
                news, positive_count, negative_count, neutral_count, top_categories
            )

            return {
                'available': True,
                'news_count': len(news),
                'sentiment': overall_sentiment,
                'positive_count': positive_count,
                'negative_count': negative_count,
                'neutral_count': neutral_count,
                'key_points': key_points,
                'summary': summary_text,
                'future_trend': future_trend,
                'top_categories': top_categories,
                'articles': news[:5]  # Garder les 5 articles les plus récents
            }

        except Exception as e:
            print(f"[NEWS] Erreur analyze_news_comprehensive: {e}")
            return {
                'available': False,
                'message': f'Erreur lors de l\'analyse des actualités: {str(e)}'
            }

    def _predict_future_trend(self, positive_score, negative_score, positive_count, negative_count, categories):
        """Prédit la tendance future basée sur les actualités"""

        # Calculer le score net
        net_score = positive_score - negative_score
        net_count = positive_count - negative_count

        # Impact des catégories
        high_impact_categories = ['earnings', 'acquisition', 'analyst', 'legal']
        has_high_impact = any(cat in categories for cat in high_impact_categories)

        # Déterminer la tendance
        if net_score > 5 and net_count > 2:
            trend = 'HAUSSIÈRE'
            emoji = '📈'
            confidence = 'FORTE'
            description = "Les actualités positives dominent largement. Une hausse du cours est probable à court/moyen terme."
            recommendation = "Signal haussier : Les conditions d'actualités sont favorables à l'achat."
        elif net_score > 2 and net_count > 0:
            trend = 'LÉGÈREMENT HAUSSIÈRE'
            emoji = '📈'
            confidence = 'MODÉRÉE'
            description = "Les actualités sont plutôt positives. Une légère hausse est possible."
            recommendation = "Signal modéré : Surveiller les développements avant de prendre position."
        elif net_score < -5 and net_count < -2:
            trend = 'BAISSIÈRE'
            emoji = '📉'
            confidence = 'FORTE'
            description = "Les actualités négatives dominent largement. Une baisse du cours est probable à court/moyen terme."
            recommendation = "Signal baissier : Éviter les achats ou envisager une sortie de position."
        elif net_score < -2 and net_count < 0:
            trend = 'LÉGÈREMENT BAISSIÈRE'
            emoji = '📉'
            confidence = 'MODÉRÉE'
            description = "Les actualités sont plutôt négatives. Une légère baisse est possible."
            recommendation = "Signal de prudence : Attendre des actualités plus favorables."
        else:
            trend = 'NEUTRE/LATÉRALE'
            emoji = '➡️'
            confidence = 'FAIBLE'
            description = "Les actualités sont mitigées. Aucune direction claire ne se dégage."
            recommendation = "Attendre : Pas de signal clair, privilégier l'observation."

        # Ajuster la confiance si actualités à fort impact
        if has_high_impact:
            if confidence == 'MODÉRÉE':
                confidence = 'FORTE'
            elif confidence == 'FAIBLE':
                confidence = 'MODÉRÉE'

        return {
            'trend': trend,
            'emoji': emoji,
            'confidence': confidence,
            'description': description,
            'recommendation': recommendation
        }

    def _generate_summary_text(self, news, positive_count, negative_count, neutral_count, top_categories):
        """Génère un résumé textuel des actualités"""

        summary_parts = []

        # Nombre d'articles
        summary_parts.append(f"Sur les {len(news)} dernières actualités :")

        # Répartition des sentiments
        sentiment_text = f"• {positive_count} positives, {negative_count} négatives, {neutral_count} neutres"
        summary_parts.append(sentiment_text)

        # Catégories principales
        if top_categories:
            category_names = {
                'earnings': 'résultats financiers',
                'acquisition': 'fusions/acquisitions',
                'partnership': 'partenariats',
                'product': 'produits',
                'legal': 'aspects juridiques',
                'analyst': 'analyses d\'experts',
                'management': 'management',
                'general': 'actualités générales'
            }

            cat_text = "• Thèmes principaux : " + ", ".join([
                category_names.get(cat[0], cat[0]) for cat in top_categories[:2]
            ])
            summary_parts.append(cat_text)

        # Titres les plus importants
        important_news = sorted(news[:5], key=lambda x: x['sentiment']['score'], reverse=True)[:2]
        if important_news:
            summary_parts.append("\n🔥 Actualités marquantes :")
            for article in important_news:
                title = article['title']
                if len(title) > 80:
                    title = title[:77] + "..."
                summary_parts.append(f"  {article['sentiment']['emoji']} {title}")

        return "\n".join(summary_parts)


# Instance globale
news_service = NewsService()
