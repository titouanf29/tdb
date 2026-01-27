"""
Algorithme d'Analyse IA Avancé pour TDB Bot

Analyse multi-paramètres :
- Analyse technique (tendances, structures, indicateurs)
- Volume et volatilité
- Momentum
- Contexte marché
- Actualités

Système de scoring intelligent 0-100
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import config
from utils.helpers import *
from services.news import news_service

class MarketAnalyzer:
    """Analyseur de marché avancé avec IA"""

    def __init__(self):
        self.weights = config.SCORING_WEIGHTS

    async def analyze_asset(self, symbol, market, timeframes=None, fetch_news=True):
        """
        Analyse complète d'un actif

        Args:
            symbol: Symbole de l'actif
            market: Marché (USA, EUROPE, ASIA, CRYPTO)
            timeframes: Liste des timeframes à analyser
            fetch_news: Si True, récupère et analyse les actualités (défaut: True)
                       Si False, utilise un score neutre pour les news (plus rapide pour les scans)

        Returns:
            dict avec score, direction, analyses détaillées
        """
        if timeframes is None:
            timeframes = ["5m", "15m", "1h", "4h", "1d"]

        try:
            # Récupérer les données
            ticker = yf.Ticker(symbol)

            # Données multi-timeframes
            data_1d = ticker.history(period="3mo", interval="1d")
            data_1h = ticker.history(period="1mo", interval="1h")
            data_15m = ticker.history(period="5d", interval="15m")

            if data_1d.empty:
                return None

            # Analyses par catégorie
            technical_score = self._analyze_technical(data_1d, data_1h, data_15m)
            volume_score = self._analyze_volume(data_1d, data_1h)
            momentum_score = self._analyze_momentum(data_1d, data_1h)
            volatility_score = self._analyze_volatility(data_1d)
            market_context_score = self._analyze_market_context(symbol, market)

            # Analyse des actualités (optionnel pour performance)
            if fetch_news:
                news_score = self._analyze_news(symbol)
                news_summary = self._get_news_summary(symbol)
            else:
                # Score neutre si on ne récupère pas les news (scans rapides)
                news_score = 0.5
                news_summary = "Actualités non récupérées (scan rapide)"

            # Score final pondéré
            final_score = (
                technical_score * self.weights['technical'] +
                volume_score * self.weights['volume'] +
                momentum_score * self.weights['momentum'] +
                volatility_score * self.weights['volatility'] +
                market_context_score * self.weights['market_context'] +
                news_score * self.weights['news']
            ) * 100

            # Arrondir
            final_score = int(final_score)

            # Déterminer la direction
            direction = self._determine_direction(data_1d, data_1h, technical_score, momentum_score)

            # Déterminer la tendance
            trend = self._determine_trend(data_1d)

            # Calculs supplémentaires
            current_price = data_1d['Close'].iloc[-1]
            price_change_1d = ((current_price - data_1d['Close'].iloc[-2]) / data_1d['Close'].iloc[-2]) * 100

            # ATR pour volatilité
            atr = self._calculate_atr(data_1d)

            # RSI
            rsi = self._calculate_rsi(data_1d)

            # Volume
            avg_volume = data_1d['Volume'].rolling(20).mean().iloc[-1]
            current_volume = data_1d['Volume'].iloc[-1]
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

            # Support/Résistance
            support, resistance = self._find_support_resistance(data_1d)

            # Résumé technique
            technical_summary = self._generate_technical_summary(
                trend, rsi, volume_ratio, support, resistance, current_price
            )

            # Type d'opportunité
            opportunity_type = self._identify_opportunity_type(
                data_1d, data_1h, trend, rsi, volume_ratio
            )

            # Niveau de risque
            risk_level = self._calculate_risk_level(volatility_score, volume_ratio, final_score)

            # Générer des explications détaillées
            explanations = self._generate_explanations(
                technical_score, volume_score, momentum_score, volatility_score,
                market_context_score, news_score, rsi, volume_ratio, trend,
                direction, atr, current_price, support, resistance
            )

            # Générer des recommandations
            recommendations = self._generate_recommendations(
                final_score, direction, rsi, volume_ratio, trend, risk_level
            )

            return {
                'symbol': symbol,
                'market': market,
                'score': final_score,
                'direction': direction,
                'trend': trend,
                'current_price': float(current_price),
                'price_change_1d': float(price_change_1d),
                'volatility': float(atr),
                'rsi': float(rsi),
                'volume_ratio': float(volume_ratio),
                'support': float(support) if support else None,
                'resistance': float(resistance) if resistance else None,
                'technical_summary': technical_summary,
                'opportunity_type': opportunity_type,
                'risk_level': risk_level,
                'news_summary': news_summary,
                'explanations': explanations,
                'recommendations': recommendations,
                'scores': {
                    'technical': technical_score,
                    'volume': volume_score,
                    'momentum': momentum_score,
                    'volatility': volatility_score,
                    'market_context': market_context_score,
                    'news': news_score
                }
            }

        except Exception as e:
            print(f"Erreur analyse {symbol}: {e}")
            return None

    def _analyze_technical(self, data_1d, data_1h, data_15m):
        """Analyse technique multi-timeframe"""
        score = 0.5  # Neutre par défaut

        # Tendance long terme (1D)
        ema_20 = data_1d['Close'].ewm(span=20).mean()
        ema_50 = data_1d['Close'].ewm(span=50).mean()
        ema_200 = data_1d['Close'].ewm(span=200).mean() if len(data_1d) >= 200 else None

        current_price = data_1d['Close'].iloc[-1]

        # Golden Cross / Death Cross
        if len(ema_50) > 0:
            if ema_20.iloc[-1] > ema_50.iloc[-1]:
                score += 0.1
            else:
                score -= 0.1

        # Prix au-dessus/en-dessous EMA 200
        if ema_200 is not None:
            if current_price > ema_200.iloc[-1]:
                score += 0.15
            else:
                score -= 0.15

        # Structure de marché (Higher Highs / Lower Lows)
        recent_highs = data_1d['High'].tail(10)
        recent_lows = data_1d['Low'].tail(10)

        if recent_highs.iloc[-1] > recent_highs.iloc[-6]:  # Higher High
            score += 0.1
        if recent_lows.iloc[-1] > recent_lows.iloc[-6]:  # Higher Low
            score += 0.1

        # MACD
        macd_line, signal_line = self._calculate_macd(data_1d)
        if macd_line.iloc[-1] > signal_line.iloc[-1]:
            score += 0.1
        else:
            score -= 0.1

        # Bollinger Bands
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(data_1d)
        if current_price > bb_middle.iloc[-1]:
            score += 0.05
        else:
            score -= 0.05

        # Limiter entre 0 et 1
        return max(0, min(1, score))

    def _analyze_volume(self, data_1d, data_1h):
        """Analyse du volume"""
        score = 0.5

        # Volume moyen
        avg_volume_20 = data_1d['Volume'].rolling(20).mean()
        current_volume = data_1d['Volume'].iloc[-1]

        if len(avg_volume_20) > 0 and avg_volume_20.iloc[-1] > 0:
            volume_ratio = current_volume / avg_volume_20.iloc[-1]

            # Volume fort = signal fort
            if volume_ratio > 2:
                score += 0.3
            elif volume_ratio > 1.5:
                score += 0.2
            elif volume_ratio > 1:
                score += 0.1
            elif volume_ratio < 0.5:
                score -= 0.2

        # OBV (On Balance Volume)
        obv = self._calculate_obv(data_1d)
        obv_ma = obv.rolling(10).mean()
        if obv.iloc[-1] > obv_ma.iloc[-1]:
            score += 0.1

        return max(0, min(1, score))

    def _analyze_momentum(self, data_1d, data_1h):
        """Analyse du momentum"""
        score = 0.5

        # RSI
        rsi = self._calculate_rsi(data_1d)

        if 40 < rsi < 60:  # Zone neutre
            score += 0
        elif 30 < rsi < 40:  # Oversold
            score += 0.2
        elif rsi < 30:  # Très oversold
            score += 0.3
        elif 60 < rsi < 70:  # Overbought
            score -= 0.1
        elif rsi > 70:  # Très overbought
            score -= 0.3

        # Rate of Change (ROC)
        roc = ((data_1d['Close'].iloc[-1] - data_1d['Close'].iloc[-10]) /
               data_1d['Close'].iloc[-10]) * 100

        if roc > 5:
            score += 0.2
        elif roc > 2:
            score += 0.1
        elif roc < -5:
            score -= 0.2
        elif roc < -2:
            score -= 0.1

        return max(0, min(1, score))

    def _analyze_volatility(self, data_1d):
        """Analyse de la volatilité"""
        score = 0.5

        # ATR
        atr = self._calculate_atr(data_1d)
        price = data_1d['Close'].iloc[-1]
        atr_percent = (atr / price) * 100

        # Volatilité modérée = meilleur score
        if 1 < atr_percent < 3:
            score += 0.3
        elif 0.5 < atr_percent < 5:
            score += 0.1
        elif atr_percent > 10:  # Trop volatile
            score -= 0.3
        elif atr_percent < 0.3:  # Pas assez de mouvement
            score -= 0.2

        # Bollinger Band Width
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(data_1d)
        bb_width = (bb_upper.iloc[-1] - bb_lower.iloc[-1]) / bb_middle.iloc[-1]

        if 0.05 < bb_width < 0.15:
            score += 0.1

        return max(0, min(1, score))

    def _analyze_market_context(self, symbol, market):
        """Analyse du contexte marché global"""
        score = 0.5

        try:
            # Récupérer l'indice principal du marché
            if market == "USA":
                index_symbol = "^GSPC"  # S&P 500
            elif market == "EUROPE":
                index_symbol = "^STOXX50E"
            elif market == "ASIA":
                index_symbol = "^N225"
            elif market == "CRYPTO":
                index_symbol = "BTC-USD"
            else:
                return score

            index_data = yf.Ticker(index_symbol).history(period="1mo", interval="1d")

            if not index_data.empty:
                # Tendance de l'indice
                index_change = ((index_data['Close'].iloc[-1] - index_data['Close'].iloc[-5]) /
                               index_data['Close'].iloc[-5]) * 100

                if index_change > 2:
                    score += 0.2
                elif index_change > 0:
                    score += 0.1
                elif index_change < -2:
                    score -= 0.2
                elif index_change < 0:
                    score -= 0.1

        except:
            pass

        return max(0, min(1, score))

    # ===== INDICATEURS TECHNIQUES =====

    def _calculate_rsi(self, data, period=14):
        """Calcule le RSI"""
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]

    def _calculate_macd(self, data):
        """Calcule le MACD"""
        exp1 = data['Close'].ewm(span=12, adjust=False).mean()
        exp2 = data['Close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        return macd, signal

    def _calculate_bollinger_bands(self, data, period=20, std=2):
        """Calcule les Bollinger Bands"""
        middle = data['Close'].rolling(window=period).mean()
        std_dev = data['Close'].rolling(window=period).std()
        upper = middle + (std_dev * std)
        lower = middle - (std_dev * std)
        return upper, middle, lower

    def _calculate_atr(self, data, period=14):
        """Calcule l'ATR (Average True Range)"""
        high_low = data['High'] - data['Low']
        high_close = np.abs(data['High'] - data['Close'].shift())
        low_close = np.abs(data['Low'] - data['Close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        atr = true_range.rolling(period).mean()
        return atr.iloc[-1]

    def _calculate_obv(self, data):
        """Calcule l'OBV (On Balance Volume)"""
        obv = (np.sign(data['Close'].diff()) * data['Volume']).fillna(0).cumsum()
        return obv

    def _find_support_resistance(self, data, lookback=20):
        """Trouve les niveaux de support et résistance"""
        recent_data = data.tail(lookback)
        support = recent_data['Low'].min()
        resistance = recent_data['High'].max()
        return support, resistance

    def _determine_direction(self, data_1d, data_1h, technical_score, momentum_score):
        """Détermine la direction suggérée"""
        combined_score = (technical_score + momentum_score) / 2

        if combined_score > 0.6:
            return "LONG"
        elif combined_score < 0.4:
            return "SHORT"
        else:
            return "NEUTRAL"

    def _determine_trend(self, data):
        """Détermine la tendance"""
        ema_20 = data['Close'].ewm(span=20).mean()
        ema_50 = data['Close'].ewm(span=50).mean()

        if ema_20.iloc[-1] > ema_50.iloc[-1] and data['Close'].iloc[-1] > ema_20.iloc[-1]:
            return "bullish"
        elif ema_20.iloc[-1] < ema_50.iloc[-1] and data['Close'].iloc[-1] < ema_20.iloc[-1]:
            return "bearish"
        else:
            return "neutral"

    def _generate_technical_summary(self, trend, rsi, volume_ratio, support, resistance, current_price):
        """Génère un résumé technique"""
        summary = []

        if trend == "bullish":
            summary.append("Tendance haussière")
        elif trend == "bearish":
            summary.append("Tendance baissière")
        else:
            summary.append("Tendance neutre")

        if rsi < 30:
            summary.append("RSI en survente")
        elif rsi > 70:
            summary.append("RSI en surachat")

        if volume_ratio > 1.5:
            summary.append("Volume élevé")

        if support and current_price:
            distance_support = ((current_price - support) / support) * 100
            if distance_support < 2:
                summary.append("Proche du support")

        if resistance and current_price:
            distance_resistance = ((resistance - current_price) / current_price) * 100
            if distance_resistance < 2:
                summary.append("Proche de la résistance")

        return " | ".join(summary) if summary else "Analyse en cours"

    def _identify_opportunity_type(self, data_1d, data_1h, trend, rsi, volume_ratio):
        """Identifie le type d'opportunité"""
        if volume_ratio > 2 and rsi > 50:
            return "breakout"
        elif rsi < 30:
            return "reversal"
        elif trend == "bullish" and rsi > 40 and rsi < 60:
            return "continuation"
        elif volume_ratio < 0.7:
            return "squeeze"
        else:
            return "retest"

    def _calculate_risk_level(self, volatility_score, volume_ratio, final_score):
        """Calcule le niveau de risque"""
        if volatility_score < 0.3 or volume_ratio < 0.5:
            return "high"
        elif final_score < 60:
            return "medium"
        elif volatility_score > 0.7 and final_score > 75:
            return "low"
        else:
            return "medium"

    def _analyze_news(self, symbol):
        """Analyse les actualités et retourne un score (0.0 - 1.0)"""
        try:
            news_summary = news_service.get_news_summary(symbol)

            if news_summary['count'] == 0:
                return 0.5  # Neutre si pas d'actualités

            sentiment = news_summary.get('sentiment', 'NEUTRE')
            impact = news_summary.get('impact_level', 'FAIBLE')

            # Calcul du score basé sur sentiment et impact
            if sentiment == 'POSITIF':
                if impact == 'MODÉRÉ':
                    return 0.75
                else:
                    return 0.65
            elif sentiment == 'NÉGATIF':
                if impact == 'MODÉRÉ':
                    return 0.25
                else:
                    return 0.35
            else:
                return 0.5  # Neutre

        except Exception as e:
            print(f"[ANALYZER] Erreur analyse news: {e}")
            return 0.5

    def _get_news_summary(self, symbol):
        """Récupère le résumé des actualités formaté pour la base de données"""
        try:
            news_summary = news_service.get_news_summary(symbol)

            if news_summary['count'] == 0:
                return "Aucune actualité récente"

            # Formater le résumé
            sentiment_emoji = {
                'POSITIF': '🟢',
                'NÉGATIF': '🔴',
                'NEUTRE': '⚪'
            }

            emoji = sentiment_emoji.get(news_summary['sentiment'], '⚪')
            sentiment = news_summary['sentiment']
            impact = news_summary['impact_level']
            count = news_summary['count']

            summary = f"{emoji} Sentiment: {sentiment} | Impact: {impact} | {count} article(s) récent(s)"

            return summary

        except Exception as e:
            print(f"[ANALYZER] Erreur get_news_summary: {e}")
            return "Erreur récupération actualités"

    def _generate_explanations(self, technical_score, volume_score, momentum_score,
                               volatility_score, market_context_score, news_score,
                               rsi, volume_ratio, trend, direction, atr, current_price,
                               support, resistance):
        """Génère des explications détaillées de l'analyse"""
        explanations = {}

        # RSI Explanation
        if rsi < 30:
            explanations['rsi'] = {
                'status': 'SURVENTE',
                'emoji': '🔴',
                'text': f"Le RSI à {rsi:.1f} indique une zone de survente. L'actif pourrait être sous-évalué et un rebond est possible."
            }
        elif rsi > 70:
            explanations['rsi'] = {
                'status': 'SURACHAT',
                'emoji': '🟢',
                'text': f"Le RSI à {rsi:.1f} indique une zone de surachat. L'actif pourrait être surévalué et une correction est possible."
            }
        else:
            explanations['rsi'] = {
                'status': 'NEUTRE',
                'emoji': '⚪',
                'text': f"Le RSI à {rsi:.1f} est dans une zone neutre, indiquant un équilibre entre acheteurs et vendeurs."
            }

        # Volume Explanation
        if volume_ratio > 2:
            explanations['volume'] = {
                'level': 'TRÈS ÉLEVÉ',
                'emoji': '🔥',
                'text': f"Volume x{volume_ratio:.2f} supérieur à la moyenne. Forte activité = mouvement confirmé et fiable."
            }
        elif volume_ratio > 1.5:
            explanations['volume'] = {
                'level': 'ÉLEVÉ',
                'emoji': '📈',
                'text': f"Volume x{volume_ratio:.2f} au-dessus de la moyenne. Mouvement soutenu par une bonne participation."
            }
        elif volume_ratio < 0.7:
            explanations['volume'] = {
                'level': 'FAIBLE',
                'emoji': '⚠️',
                'text': f"Volume x{volume_ratio:.2f} en dessous de la moyenne. Mouvement peu fiable, manque de conviction."
            }
        else:
            explanations['volume'] = {
                'level': 'NORMAL',
                'emoji': '📊',
                'text': f"Volume x{volume_ratio:.2f} proche de la moyenne. Activité normale du marché."
            }

        # Trend Explanation
        trend_texts = {
            'bullish': {
                'emoji': '📈',
                'text': "Tendance haussière confirmée. Les moyennes mobiles sont alignées à la hausse, favorisant les positions longues."
            },
            'bearish': {
                'emoji': '📉',
                'text': "Tendance baissière confirmée. Les moyennes mobiles sont alignées à la baisse, favorisant les positions courtes."
            },
            'neutral': {
                'emoji': '➡️',
                'text': "Tendance neutre ou latérale. Le marché consolide, attendre une direction claire avant d'entrer."
            }
        }
        explanations['trend'] = trend_texts.get(trend, trend_texts['neutral'])

        # Support/Resistance Explanation
        if support and resistance and current_price:
            distance_support = ((current_price - support) / support) * 100
            distance_resistance = ((resistance - current_price) / current_price) * 100

            if distance_support < 2:
                explanations['levels'] = {
                    'emoji': '🎯',
                    'text': f"Prix très proche du support ({distance_support:.1f}%). Zone de rebond potentiel, opportunité d'achat si confirmé."
                }
            elif distance_resistance < 2:
                explanations['levels'] = {
                    'emoji': '🎯',
                    'text': f"Prix très proche de la résistance ({distance_resistance:.1f}%). Zone de rejet potentiel, prudence sur les achats."
                }
            else:
                range_pct = ((resistance - support) / support) * 100
                position_in_range = ((current_price - support) / (resistance - support)) * 100
                explanations['levels'] = {
                    'emoji': '📏',
                    'text': f"Prix à {position_in_range:.0f}% entre support et résistance (range de {range_pct:.1f}%)."
                }

        # Scores Breakdown
        scores_text = []
        score_map = [
            (technical_score, 'Technique', '📊'),
            (volume_score, 'Volume', '📈'),
            (momentum_score, 'Momentum', '⚡'),
            (volatility_score, 'Volatilité', '📉'),
            (market_context_score, 'Contexte', '🌐'),
            (news_score, 'Actualités', '📰')
        ]

        for score, name, emoji in score_map:
            score_pct = score * 100
            if score_pct >= 70:
                strength = "Excellent"
            elif score_pct >= 60:
                strength = "Bon"
            elif score_pct >= 40:
                strength = "Moyen"
            else:
                strength = "Faible"
            scores_text.append(f"{emoji} {name}: {score_pct:.0f}% ({strength})")

        explanations['scores_breakdown'] = '\n'.join(scores_text)

        return explanations

    def _generate_recommendations(self, final_score, direction, rsi, volume_ratio,
                                  trend, risk_level):
        """Génère des recommandations d'action basées sur l'analyse"""
        recommendations = []

        # Recommandation principale
        if final_score >= 80:
            if direction == "LONG":
                recommendations.append("🟢 SIGNAL FORT D'ACHAT - Tous les indicateurs sont alignés favorablement")
            else:
                recommendations.append("🔴 SIGNAL FORT DE VENTE - Tous les indicateurs suggèrent une baisse")
        elif final_score >= 70:
            if direction == "LONG":
                recommendations.append("🟢 Signal d'achat - Bonne opportunité avec confirmation des indicateurs")
            else:
                recommendations.append("🔴 Signal de vente - Risque de baisse probable")
        elif final_score >= 60:
            recommendations.append("⚪ Signal modéré - Attendre des confirmations supplémentaires")
        else:
            recommendations.append("⚠️ Signal faible - Ne pas entrer en position, conditions incertaines")

        # Recommandations RSI
        if rsi < 30 and direction == "LONG":
            recommendations.append("✅ RSI en survente confirme l'opportunité d'achat")
        elif rsi > 70 and direction == "SHORT":
            recommendations.append("✅ RSI en surachat confirme l'opportunité de vente")
        elif rsi < 30 and direction == "SHORT":
            recommendations.append("⚠️ Attention : RSI en survente contredit le signal de vente")
        elif rsi > 70 and direction == "LONG":
            recommendations.append("⚠️ Attention : RSI en surachat, risque de correction à court terme")

        # Recommandations Volume
        if volume_ratio > 1.5:
            recommendations.append("✅ Volume élevé confirme la force du mouvement")
        elif volume_ratio < 0.7:
            recommendations.append("⚠️ Volume faible : attendre une confirmation avec plus d'activité")

        # Recommandations Tendance
        if trend == "bullish" and direction == "LONG":
            recommendations.append("✅ Tendance haussière alignée avec le signal d'achat")
        elif trend == "bearish" and direction == "SHORT":
            recommendations.append("✅ Tendance baissière alignée avec le signal de vente")
        elif trend == "bullish" and direction == "SHORT":
            recommendations.append("⚠️ Signal de vente contre-tendance : risque élevé")
        elif trend == "bearish" and direction == "LONG":
            recommendations.append("⚠️ Signal d'achat contre-tendance : attendre retournement confirmé")

        # Gestion du risque
        if risk_level == "high":
            recommendations.append("🛑 RISQUE ÉLEVÉ : Réduire la taille de position ou attendre de meilleures conditions")
        elif risk_level == "medium":
            recommendations.append("⚠️ Risque modéré : Utiliser un stop-loss serré et gérer la position activement")
        else:
            recommendations.append("✅ Risque faible : Conditions favorables pour une entrée")

        return recommendations

# Instance globale
analyzer = MarketAnalyzer()
