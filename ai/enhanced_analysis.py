"""
Module d'analyse avancée - Indicateurs professionnels
Multi-timeframe, Ichimoku, Fibonacci, Pattern Recognition, Backtesting
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class EnhancedAnalysis:
    """Analyse technique avancée avec indicateurs professionnels"""

    def __init__(self):
        self.fibonacci_levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
        self.correlation_pairs = {
            'CRYPTO': ['BTC-USD', 'ETH-USD', 'SOL-USD'],
            'USA': ['AAPL', 'MSFT', 'GOOGL', 'SPY'],
            'FOREX': ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X'],
            'COMMODITIES': ['GC=F', 'CL=F', 'SI=F']
        }

    # ==========================================
    # 1. MULTI-TIMEFRAME ANALYSIS
    # ==========================================

    async def analyze_multi_timeframe(self, symbol: str, data_1h: pd.DataFrame,
                                       data_4h: pd.DataFrame, data_daily: pd.DataFrame) -> Dict:
        """
        Analyse multi-timeframe combinant 1H, 4H et Daily
        """
        result = {
            'timeframes': {},
            'confluence': 0,
            'trend_alignment': False,
            'signal': 'NEUTRAL',
            'strength': 0
        }

        # Analyser chaque timeframe
        for tf_name, data in [('1H', data_1h), ('4H', data_4h), ('Daily', data_daily)]:
            if data is None or data.empty or len(data) < 20:
                continue

            tf_analysis = self._analyze_single_timeframe(data, tf_name)
            result['timeframes'][tf_name] = tf_analysis

        # Calculer la confluence
        if len(result['timeframes']) >= 2:
            result = self._calculate_confluence(result)

        return result

    def _analyze_single_timeframe(self, data: pd.DataFrame, tf_name: str) -> Dict:
        """Analyse un seul timeframe"""
        close = data['Close'].values
        high = data['High'].values
        low = data['Low'].values

        # Tendance via EMAs
        ema20 = self._ema(close, 20)
        ema50 = self._ema(close, 50)

        current_price = close[-1]

        # Déterminer la tendance
        if current_price > ema20[-1] > ema50[-1]:
            trend = 'BULLISH'
            trend_score = 1
        elif current_price < ema20[-1] < ema50[-1]:
            trend = 'BEARISH'
            trend_score = -1
        else:
            trend = 'NEUTRAL'
            trend_score = 0

        # RSI
        rsi = self._calculate_rsi(close, 14)

        # Momentum
        momentum = ((current_price - close[-10]) / close[-10]) * 100 if close[-10] > 0 else 0

        return {
            'trend': trend,
            'trend_score': trend_score,
            'rsi': rsi,
            'momentum': momentum,
            'price_vs_ema20': ((current_price - ema20[-1]) / ema20[-1]) * 100 if ema20[-1] > 0 else 0,
            'ema20_vs_ema50': ((ema20[-1] - ema50[-1]) / ema50[-1]) * 100 if ema50[-1] > 0 else 0
        }

    def _calculate_confluence(self, result: Dict) -> Dict:
        """Calcule la confluence entre timeframes"""
        trends = []
        for tf_name, tf_data in result['timeframes'].items():
            trends.append(tf_data['trend_score'])

        # Confluence = somme des tendances
        confluence_sum = sum(trends)

        # Alignement si tous dans la même direction
        result['trend_alignment'] = all(t > 0 for t in trends) or all(t < 0 for t in trends)

        # Signal basé sur confluence
        if confluence_sum >= 2:
            result['signal'] = 'STRONG_BUY'
            result['strength'] = min(100, 60 + confluence_sum * 15)
        elif confluence_sum == 1:
            result['signal'] = 'BUY'
            result['strength'] = 55
        elif confluence_sum <= -2:
            result['signal'] = 'STRONG_SELL'
            result['strength'] = min(100, 60 + abs(confluence_sum) * 15)
        elif confluence_sum == -1:
            result['signal'] = 'SELL'
            result['strength'] = 55
        else:
            result['signal'] = 'NEUTRAL'
            result['strength'] = 50

        result['confluence'] = confluence_sum

        return result

    # ==========================================
    # 2. ICHIMOKU CLOUD
    # ==========================================

    def calculate_ichimoku(self, data: pd.DataFrame) -> Dict:
        """
        Calcule l'indicateur Ichimoku complet
        - Tenkan-sen (Conversion Line): 9 périodes
        - Kijun-sen (Base Line): 26 périodes
        - Senkou Span A (Leading Span A): Moyenne Tenkan + Kijun
        - Senkou Span B (Leading Span B): 52 périodes
        - Chikou Span (Lagging Span): Prix décalé de 26 périodes
        """
        try:
            if data is None or len(data) < 52:
                return {'available': False}

            high = data['High']
            low = data['Low']
            close = data['Close']

            if len(close) == 0 or pd.isna(close.iloc[-1]):
                return {'available': False}

            current_price = close.iloc[-1]

            # Tenkan-sen (9 périodes)
            tenkan = (high.rolling(9).max() + low.rolling(9).min()) / 2

            # Kijun-sen (26 périodes)
            kijun = (high.rolling(26).max() + low.rolling(26).min()) / 2

            # Senkou Span A (moyenne Tenkan + Kijun, projeté 26 périodes)
            senkou_a = ((tenkan + kijun) / 2).shift(26)

            # Senkou Span B (52 périodes, projeté 26 périodes)
            senkou_b = ((high.rolling(52).max() + low.rolling(52).min()) / 2).shift(26)

            # Chikou Span (prix actuel décalé de -26 périodes)
            chikou = close.shift(-26)

            # Valeurs actuelles - avec protection contre NaN
            current_tenkan = tenkan.iloc[-1] if not pd.isna(tenkan.iloc[-1]) else 0
            current_kijun = kijun.iloc[-1] if not pd.isna(kijun.iloc[-1]) else 0

            # Senkou avec fallback
            if not pd.isna(senkou_a.iloc[-1]):
                current_senkou_a = senkou_a.iloc[-1]
            elif len(senkou_a.dropna()) > 0:
                current_senkou_a = senkou_a.dropna().iloc[-1]
            else:
                current_senkou_a = current_price

            if not pd.isna(senkou_b.iloc[-1]):
                current_senkou_b = senkou_b.iloc[-1]
            elif len(senkou_b.dropna()) > 0:
                current_senkou_b = senkou_b.dropna().iloc[-1]
            else:
                current_senkou_b = current_price

            # Déterminer le nuage
            cloud_top = max(current_senkou_a, current_senkou_b)
            cloud_bottom = min(current_senkou_a, current_senkou_b)
            cloud_color = 'GREEN' if current_senkou_a > current_senkou_b else 'RED'

            # Position du prix par rapport au nuage
            if current_price > cloud_top:
                price_position = 'ABOVE_CLOUD'
                position_signal = 'BULLISH'
            elif current_price < cloud_bottom:
                price_position = 'BELOW_CLOUD'
                position_signal = 'BEARISH'
            else:
                price_position = 'IN_CLOUD'
                position_signal = 'NEUTRAL'

            # Signaux Ichimoku
            signals = []

            # 1. TK Cross (Tenkan croise Kijun)
            if len(tenkan) >= 2 and len(kijun) >= 2:
                prev_tenkan = tenkan.iloc[-2] if not pd.isna(tenkan.iloc[-2]) else current_tenkan
                prev_kijun = kijun.iloc[-2] if not pd.isna(kijun.iloc[-2]) else current_kijun
                if prev_tenkan < prev_kijun and current_tenkan > current_kijun:
                    signals.append({'type': 'TK_CROSS_BULLISH', 'strength': 'STRONG' if current_price > cloud_top else 'WEAK'})
                elif prev_tenkan > prev_kijun and current_tenkan < current_kijun:
                    signals.append({'type': 'TK_CROSS_BEARISH', 'strength': 'STRONG' if current_price < cloud_bottom else 'WEAK'})

            # 2. Kumo Breakout (Prix sort du nuage)
            if len(close) >= 2:
                prev_price = close.iloc[-2] if not pd.isna(close.iloc[-2]) else current_price
                if prev_price <= cloud_top and current_price > cloud_top:
                    signals.append({'type': 'KUMO_BREAKOUT_BULLISH', 'strength': 'STRONG'})
                elif prev_price >= cloud_bottom and current_price < cloud_bottom:
                    signals.append({'type': 'KUMO_BREAKOUT_BEARISH', 'strength': 'STRONG'})

            # 3. Chikou Span Confirmation (Lagging Span)
            # Le Chikou Span d'il y a 26 périodes est le prix actuel
            # On vérifie si le prix actuel est au-dessus/en-dessous du prix d'il y a 26 périodes
            chikou_confirmation = 'NEUTRAL'
            if len(close) >= 27:
                price_26_ago = close.iloc[-27] if not pd.isna(close.iloc[-27]) else current_price
                if current_price > price_26_ago * 1.01:  # Prix actuel > prix il y a 26 périodes + 1%
                    chikou_confirmation = 'BULLISH'
                    signals.append({'type': 'CHIKOU_ABOVE', 'strength': 'STRONG' if current_price > price_26_ago * 1.03 else 'WEAK'})
                elif current_price < price_26_ago * 0.99:  # Prix actuel < prix il y a 26 périodes - 1%
                    chikou_confirmation = 'BEARISH'
                    signals.append({'type': 'CHIKOU_BELOW', 'strength': 'STRONG' if current_price < price_26_ago * 0.97 else 'WEAK'})

            # 4. Nuage futur (tendance future)
            future_cloud_bullish = current_senkou_a > current_senkou_b

            # Score Ichimoku
            score = 50
            if position_signal == 'BULLISH':
                score += 20
            elif position_signal == 'BEARISH':
                score -= 20

            if cloud_color == 'GREEN':
                score += 10
            else:
                score -= 10

            if current_tenkan > current_kijun:
                score += 10
            else:
                score -= 10

            for signal in signals:
                if 'BULLISH' in signal['type'] or signal['type'] == 'CHIKOU_ABOVE':
                    score += 15 if signal['strength'] == 'STRONG' else 5
                elif 'BEARISH' in signal['type'] or signal['type'] == 'CHIKOU_BELOW':
                    score -= 15 if signal['strength'] == 'STRONG' else 5

            # Bonus si Chikou confirme la direction du prix vs nuage
            if chikou_confirmation == position_signal and position_signal != 'NEUTRAL':
                score += 10  # Double confirmation

            return {
                'available': True,
                'tenkan_sen': current_tenkan,
                'kijun_sen': current_kijun,
                'senkou_span_a': current_senkou_a,
                'senkou_span_b': current_senkou_b,
                'cloud_top': cloud_top,
                'cloud_bottom': cloud_bottom,
                'cloud_color': cloud_color,
                'price_position': price_position,
                'position_signal': position_signal,
                'chikou_confirmation': chikou_confirmation,
                'future_cloud_bullish': future_cloud_bullish,
                'signals': signals,
                'score': max(0, min(100, score)),
                'interpretation': self._interpret_ichimoku(position_signal, cloud_color, signals, chikou_confirmation)
            }

        except Exception:
            return {'available': False}

    def _interpret_ichimoku(self, position: str, cloud_color: str, signals: List, chikou: str = 'NEUTRAL') -> str:
        """Interprète les signaux Ichimoku avec Chikou Span"""
        base_interpretation = ""

        if position == 'BULLISH' and cloud_color == 'GREEN':
            base_interpretation = "Tendance haussière forte - Prix au-dessus du nuage vert"
        elif position == 'BEARISH' and cloud_color == 'RED':
            base_interpretation = "Tendance baissière forte - Prix sous le nuage rouge"
        elif position == 'IN_CLOUD':
            base_interpretation = "Zone d'indécision - Prix dans le nuage, attendre sortie"
        elif position == 'BULLISH':
            base_interpretation = "Tendance haussière - Prix au-dessus du nuage"
        elif position == 'BEARISH':
            base_interpretation = "Tendance baissière - Prix sous le nuage"
        else:
            base_interpretation = "Tendance neutre"

        # Ajouter confirmation Chikou
        if chikou == position and position != 'NEUTRAL':
            base_interpretation += " (Chikou confirme)"
        elif chikou != 'NEUTRAL' and chikou != position:
            base_interpretation += " (Chikou diverge - prudence)"

        return base_interpretation

    # ==========================================
    # 3. CORRELATION ANALYSIS
    # ==========================================

    async def analyze_correlations(self, symbol: str, market_code: str,
                                    market_data_service) -> Dict:
        """
        Analyse les corrélations avec d'autres actifs du même marché
        """
        result = {
            'correlations': [],
            'strongest_positive': None,
            'strongest_negative': None,
            'market_correlation': 0,
            'interpretation': ''
        }

        try:
            # Récupérer les données de l'actif principal
            main_data = await market_data_service.get_asset_data(symbol, period='1mo', interval='1d')
            if main_data is None or len(main_data) < 20:
                return result

            main_returns = main_data['Close'].pct_change().dropna()

            # Actifs de comparaison
            comparison_assets = self.correlation_pairs.get(market_code, [])

            for comp_symbol in comparison_assets:
                if comp_symbol == symbol:
                    continue

                try:
                    comp_data = await market_data_service.get_asset_data(comp_symbol, period='1mo', interval='1d')
                    if comp_data is None or len(comp_data) < 20:
                        continue

                    comp_returns = comp_data['Close'].pct_change().dropna()

                    # Aligner les données
                    aligned_main, aligned_comp = main_returns.align(comp_returns, join='inner')

                    if len(aligned_main) < 10:
                        continue

                    # Calculer la corrélation
                    correlation = aligned_main.corr(aligned_comp)

                    if not np.isnan(correlation):
                        result['correlations'].append({
                            'symbol': comp_symbol,
                            'correlation': round(correlation, 3),
                            'strength': self._correlation_strength(correlation)
                        })

                except Exception as e:
                    logger.debug(f"Erreur corrélation {comp_symbol}: {e}")
                    continue

            # Trouver les corrélations les plus fortes
            if result['correlations']:
                sorted_corr = sorted(result['correlations'], key=lambda x: x['correlation'], reverse=True)
                result['strongest_positive'] = sorted_corr[0] if sorted_corr[0]['correlation'] > 0 else None
                result['strongest_negative'] = sorted_corr[-1] if sorted_corr[-1]['correlation'] < 0 else None
                result['market_correlation'] = np.mean([c['correlation'] for c in result['correlations']])
                result['interpretation'] = self._interpret_correlations(result)

        except Exception as e:
            logger.error(f"Erreur analyse corrélation: {e}")

        return result

    def _correlation_strength(self, corr: float) -> str:
        """Détermine la force de la corrélation"""
        abs_corr = abs(corr)
        if abs_corr >= 0.8:
            return 'TRES_FORTE'
        elif abs_corr >= 0.6:
            return 'FORTE'
        elif abs_corr >= 0.4:
            return 'MODEREE'
        elif abs_corr >= 0.2:
            return 'FAIBLE'
        return 'NEGLIGEABLE'

    def _interpret_correlations(self, result: Dict) -> str:
        """Interprète les corrélations"""
        if result['market_correlation'] > 0.7:
            return "Forte corrélation avec le marché - Suit la tendance générale"
        elif result['market_correlation'] < -0.3:
            return "Corrélation inverse - Peut servir de couverture"
        elif abs(result['market_correlation']) < 0.2:
            return "Faible corrélation - Mouvement indépendant du marché"
        return "Corrélation modérée avec le marché"

    # ==========================================
    # 4. FIBONACCI RETRACEMENT
    # ==========================================

    def calculate_fibonacci(self, data: pd.DataFrame, lookback: int = 50) -> Dict:
        """
        Calcule les niveaux de Fibonacci automatiquement
        basés sur le swing high/low récent
        """
        try:
            if data is None or len(data) < lookback:
                return {'available': False}

            recent_data = data.tail(lookback)
            high = recent_data['High']
            low = recent_data['Low']

            if len(data) == 0 or pd.isna(data['Close'].iloc[-1]):
                return {'available': False}

            close = data['Close'].iloc[-1]

            # Trouver swing high et swing low
            swing_high = high.max()
            swing_low = low.min()
            swing_high_idx = high.idxmax()
            swing_low_idx = low.idxmin()

            # Déterminer la direction du mouvement
            if swing_high_idx > swing_low_idx:
                # Mouvement haussier - retracement depuis le haut
                trend = 'UPTREND'
                diff = swing_high - swing_low
                levels = {}
                for fib in self.fibonacci_levels:
                    level = swing_high - (diff * fib)
                    levels[f'{fib:.3f}'] = round(level, 4)
            else:
                # Mouvement baissier - retracement depuis le bas
                trend = 'DOWNTREND'
                diff = swing_high - swing_low
                levels = {}
                for fib in self.fibonacci_levels:
                    level = swing_low + (diff * fib)
                    levels[f'{fib:.3f}'] = round(level, 4)

            # Trouver le niveau le plus proche du prix actuel
            closest_level = None
            min_distance = float('inf')
            for fib_name, level in levels.items():
                distance = abs(close - level)
                if distance < min_distance:
                    min_distance = distance
                    closest_level = {'level': fib_name, 'price': level}

            # Support et résistance basés sur Fibonacci
            supports = []
            resistances = []
            for fib_name, level in levels.items():
                if level < close:
                    supports.append({'level': fib_name, 'price': level})
                else:
                    resistances.append({'level': fib_name, 'price': level})

            # Trier
            supports.sort(key=lambda x: x['price'], reverse=True)
            resistances.sort(key=lambda x: x['price'])

            return {
                'available': True,
                'trend': trend,
                'swing_high': swing_high,
                'swing_low': swing_low,
                'levels': levels,
                'closest_level': closest_level,
                'next_support': supports[0] if supports else None,
                'next_resistance': resistances[0] if resistances else None,
                'interpretation': self._interpret_fibonacci(close, levels, trend)
            }

        except Exception:
            return {'available': False}

    def _interpret_fibonacci(self, price: float, levels: Dict, trend: str) -> str:
        """Interprète la position par rapport aux niveaux Fibonacci"""
        fib_618 = levels.get('0.618', 0)
        fib_382 = levels.get('0.382', 0)
        fib_500 = levels.get('0.500', 0)

        if trend == 'UPTREND':
            if price > fib_382:
                return "Correction faible - Tendance haussière intacte"
            elif price > fib_500:
                return "Correction modérée - Zone de support clé 50%"
            elif price > fib_618:
                return "Correction profonde - Zone dorée 61.8% (opportunité)"
            else:
                return "Correction majeure - Possible retournement"
        else:
            if price < fib_382:
                return "Rebond faible - Tendance baissière intacte"
            elif price < fib_500:
                return "Rebond modéré - Zone de résistance clé 50%"
            elif price < fib_618:
                return "Rebond important - Zone dorée 61.8% (résistance)"
            else:
                return "Rebond majeur - Possible retournement"

    # ==========================================
    # 5. PATTERN RECOGNITION
    # ==========================================

    def detect_patterns(self, data: pd.DataFrame) -> Dict:
        """
        Détecte les figures chartistes classiques
        """
        if data is None or len(data) < 50:
            return {'patterns': [], 'available': False}

        patterns = []
        close = data['Close'].values
        high = data['High'].values
        low = data['Low'].values

        # Double Top
        double_top = self._detect_double_top(high, close)
        if double_top['detected']:
            patterns.append(double_top)

        # Double Bottom
        double_bottom = self._detect_double_bottom(low, close)
        if double_bottom['detected']:
            patterns.append(double_bottom)

        # Head and Shoulders
        head_shoulders = self._detect_head_shoulders(high, low, close)
        if head_shoulders['detected']:
            patterns.append(head_shoulders)

        # Triangle (Ascending, Descending, Symmetric)
        triangle = self._detect_triangle(high, low, close)
        if triangle['detected']:
            patterns.append(triangle)

        # Wedge (Rising, Falling)
        wedge = self._detect_wedge(high, low)
        if wedge['detected']:
            patterns.append(wedge)

        # Channel
        channel = self._detect_channel(high, low, close)
        if channel['detected']:
            patterns.append(channel)

        return {
            'available': True,
            'patterns': patterns,
            'count': len(patterns),
            'most_significant': patterns[0] if patterns else None
        }

    def _detect_double_top(self, high: np.ndarray, close: np.ndarray, tolerance: float = 0.02) -> Dict:
        """Détecte un double top"""
        result = {'name': 'DOUBLE_TOP', 'detected': False, 'signal': 'BEARISH', 'reliability': 0}

        if len(high) < 30:
            return result

        # Chercher deux sommets similaires
        recent_high = high[-30:]
        peaks_idx = []

        for i in range(2, len(recent_high) - 2):
            if recent_high[i] > recent_high[i-1] and recent_high[i] > recent_high[i-2] and \
               recent_high[i] > recent_high[i+1] and recent_high[i] > recent_high[i+2]:
                peaks_idx.append(i)

        if len(peaks_idx) >= 2:
            # Vérifier si les deux derniers pics sont similaires
            peak1 = recent_high[peaks_idx[-2]]
            peak2 = recent_high[peaks_idx[-1]]

            if abs(peak1 - peak2) / peak1 <= tolerance:
                # Vérifier que le prix actuel est sous les pics
                if close[-1] < min(peak1, peak2) * 0.98:
                    result['detected'] = True
                    result['reliability'] = 75
                    result['level'] = (peak1 + peak2) / 2
                    result['description'] = f"Double Top détecté à {result['level']:.2f} - Signal baissier"

        return result

    def _detect_double_bottom(self, low: np.ndarray, close: np.ndarray, tolerance: float = 0.02) -> Dict:
        """Détecte un double bottom"""
        result = {'name': 'DOUBLE_BOTTOM', 'detected': False, 'signal': 'BULLISH', 'reliability': 0}

        if len(low) < 30:
            return result

        recent_low = low[-30:]
        troughs_idx = []

        for i in range(2, len(recent_low) - 2):
            if recent_low[i] < recent_low[i-1] and recent_low[i] < recent_low[i-2] and \
               recent_low[i] < recent_low[i+1] and recent_low[i] < recent_low[i+2]:
                troughs_idx.append(i)

        if len(troughs_idx) >= 2:
            trough1 = recent_low[troughs_idx[-2]]
            trough2 = recent_low[troughs_idx[-1]]

            if abs(trough1 - trough2) / trough1 <= tolerance:
                if close[-1] > max(trough1, trough2) * 1.02:
                    result['detected'] = True
                    result['reliability'] = 75
                    result['level'] = (trough1 + trough2) / 2
                    result['description'] = f"Double Bottom détecté à {result['level']:.2f} - Signal haussier"

        return result

    def _detect_head_shoulders(self, high: np.ndarray, low: np.ndarray, close: np.ndarray) -> Dict:
        """Détecte un Head & Shoulders ou inverse"""
        result = {'name': 'HEAD_SHOULDERS', 'detected': False, 'signal': 'NEUTRAL', 'reliability': 0}

        if len(high) < 40:
            return result

        recent = high[-40:]
        peaks_idx = []

        for i in range(3, len(recent) - 3):
            if recent[i] == max(recent[i-3:i+4]):
                peaks_idx.append(i)

        if len(peaks_idx) >= 3:
            # Vérifier pattern: épaule - tête - épaule
            for i in range(len(peaks_idx) - 2):
                left_shoulder = recent[peaks_idx[i]]
                head = recent[peaks_idx[i+1]]
                right_shoulder = recent[peaks_idx[i+2]]

                # Tête plus haute que les épaules
                if head > left_shoulder and head > right_shoulder:
                    # Épaules à peu près égales
                    if abs(left_shoulder - right_shoulder) / left_shoulder < 0.05:
                        result['detected'] = True
                        result['signal'] = 'BEARISH'
                        result['reliability'] = 80
                        result['neckline'] = min(low[peaks_idx[i]:peaks_idx[i+2]])
                        result['description'] = "Head & Shoulders détecté - Signal baissier fort"
                        break

        return result

    def _detect_triangle(self, high: np.ndarray, low: np.ndarray, close: np.ndarray) -> Dict:
        """Détecte les triangles (ascending, descending, symmetric)"""
        result = {'name': 'TRIANGLE', 'detected': False, 'signal': 'NEUTRAL', 'reliability': 0}

        if len(high) < 20:
            return result

        recent_high = high[-20:]
        recent_low = low[-20:]

        # Calculer les pentes
        high_slope = (recent_high[-1] - recent_high[0]) / len(recent_high)
        low_slope = (recent_low[-1] - recent_low[0]) / len(recent_low)

        # Vérifier convergence
        high_range = recent_high.max() - recent_high.min()
        low_range = recent_low.max() - recent_low.min()

        if high_range > 0 and low_range > 0:
            # Triangle ascendant: résistance plate, support montant
            if abs(high_slope) < high_range * 0.01 and low_slope > 0:
                result['detected'] = True
                result['type'] = 'ASCENDING'
                result['signal'] = 'BULLISH'
                result['reliability'] = 70
                result['description'] = "Triangle ascendant - Probable cassure haussière"

            # Triangle descendant: support plat, résistance descendante
            elif abs(low_slope) < low_range * 0.01 and high_slope < 0:
                result['detected'] = True
                result['type'] = 'DESCENDING'
                result['signal'] = 'BEARISH'
                result['reliability'] = 70
                result['description'] = "Triangle descendant - Probable cassure baissière"

            # Triangle symétrique: les deux convergent
            elif high_slope < 0 and low_slope > 0:
                result['detected'] = True
                result['type'] = 'SYMMETRIC'
                result['signal'] = 'NEUTRAL'
                result['reliability'] = 60
                result['description'] = "Triangle symétrique - Attendre la cassure"

        return result

    def _detect_wedge(self, high: np.ndarray, low: np.ndarray) -> Dict:
        """Détecte les wedges (rising, falling)"""
        result = {'name': 'WEDGE', 'detected': False, 'signal': 'NEUTRAL', 'reliability': 0}

        if len(high) < 20:
            return result

        recent_high = high[-20:]
        recent_low = low[-20:]

        high_slope = (recent_high[-1] - recent_high[0]) / len(recent_high)
        low_slope = (recent_low[-1] - recent_low[0]) / len(recent_low)

        # Rising wedge: les deux montent mais convergent (bearish)
        if high_slope > 0 and low_slope > 0 and high_slope < low_slope:
            result['detected'] = True
            result['type'] = 'RISING'
            result['signal'] = 'BEARISH'
            result['reliability'] = 70
            result['description'] = "Rising Wedge - Signal baissier"

        # Falling wedge: les deux descendent mais convergent (bullish)
        elif high_slope < 0 and low_slope < 0 and high_slope > low_slope:
            result['detected'] = True
            result['type'] = 'FALLING'
            result['signal'] = 'BULLISH'
            result['reliability'] = 70
            result['description'] = "Falling Wedge - Signal haussier"

        return result

    def _detect_channel(self, high: np.ndarray, low: np.ndarray, close: np.ndarray) -> Dict:
        """Détecte les canaux (haussier, baissier, horizontal)"""
        result = {'name': 'CHANNEL', 'detected': False, 'signal': 'NEUTRAL', 'reliability': 0}

        if len(high) < 20:
            return result

        recent_high = high[-20:]
        recent_low = low[-20:]

        # Régression linéaire simple
        x = np.arange(len(recent_high))
        high_slope = np.polyfit(x, recent_high, 1)[0]
        low_slope = np.polyfit(x, recent_low, 1)[0]

        # Vérifier si les pentes sont parallèles (différence < 20%)
        if low_slope != 0 and abs((high_slope - low_slope) / low_slope) < 0.2:
            result['detected'] = True

            if high_slope > 0.001 * close[-1]:
                result['type'] = 'ASCENDING'
                result['signal'] = 'BULLISH'
                result['description'] = "Canal haussier - Tendance positive"
            elif high_slope < -0.001 * close[-1]:
                result['type'] = 'DESCENDING'
                result['signal'] = 'BEARISH'
                result['description'] = "Canal baissier - Tendance négative"
            else:
                result['type'] = 'HORIZONTAL'
                result['signal'] = 'NEUTRAL'
                result['description'] = "Canal horizontal - Range trading"

            result['reliability'] = 65
            result['upper'] = recent_high[-1]
            result['lower'] = recent_low[-1]

        return result

    # ==========================================
    # 6. MOMENTUM SCORING (ROC, Williams %R)
    # ==========================================

    def calculate_momentum_score(self, data: pd.DataFrame) -> Dict:
        """
        Calcule un score momentum avancé avec ROC et Williams %R
        """
        if data is None or len(data) < 20:
            return {'available': False}

        close = data['Close'].values
        high = data['High'].values
        low = data['Low'].values

        # Rate of Change (ROC) - Plusieurs périodes
        roc_5 = self._calculate_roc(close, 5)
        roc_10 = self._calculate_roc(close, 10)
        roc_20 = self._calculate_roc(close, 20)

        # Williams %R
        williams_r = self._calculate_williams_r(high, low, close, 14)

        # RSI classique
        rsi = self._calculate_rsi(close, 14)

        # Stochastic RSI
        stoch_rsi = self._calculate_stoch_rsi(close, 14)

        # Money Flow Index (si volume disponible)
        mfi = None
        if 'Volume' in data.columns:
            volume = data['Volume'].values
            mfi = self._calculate_mfi(high, low, close, volume, 14)

        # Score composite
        score = 50

        # ROC contribution
        if roc_5 > 0:
            score += min(10, roc_5 * 2)
        else:
            score += max(-10, roc_5 * 2)

        # Williams %R contribution (-100 à 0)
        # > -20 = surachat, < -80 = survente
        if williams_r > -20:
            score -= 10  # Surachat
        elif williams_r < -80:
            score += 10  # Survente

        # RSI contribution
        if rsi > 70:
            score -= 15  # Surachat
        elif rsi < 30:
            score += 15  # Survente
        elif 40 < rsi < 60:
            score += 5  # Zone neutre saine

        # Stoch RSI
        if stoch_rsi > 80:
            score -= 5
        elif stoch_rsi < 20:
            score += 5

        # Tendance ROC
        if roc_5 > 0 and roc_10 > 0 and roc_20 > 0:
            score += 10  # Momentum positif sur toutes les périodes
        elif roc_5 < 0 and roc_10 < 0 and roc_20 < 0:
            score -= 10  # Momentum négatif sur toutes les périodes

        # Divergence ROC
        if roc_5 > roc_10 > roc_20:
            score += 5  # Accélération
        elif roc_5 < roc_10 < roc_20:
            score -= 5  # Décélération

        score = max(0, min(100, score))

        # Signal
        if score >= 70:
            signal = 'STRONG_MOMENTUM'
            interpretation = "Momentum très fort - Tendance puissante"
        elif score >= 60:
            signal = 'GOOD_MOMENTUM'
            interpretation = "Bon momentum - Tendance confirmée"
        elif score <= 30:
            signal = 'WEAK_MOMENTUM'
            interpretation = "Momentum faible - Possible retournement"
        elif score <= 40:
            signal = 'DECLINING_MOMENTUM'
            interpretation = "Momentum en déclin - Prudence"
        else:
            signal = 'NEUTRAL_MOMENTUM'
            interpretation = "Momentum neutre - Pas de tendance claire"

        return {
            'available': True,
            'score': score,
            'signal': signal,
            'roc_5': round(roc_5, 2),
            'roc_10': round(roc_10, 2),
            'roc_20': round(roc_20, 2),
            'williams_r': round(williams_r, 2),
            'rsi': round(rsi, 2),
            'stoch_rsi': round(stoch_rsi, 2),
            'mfi': round(mfi, 2) if mfi else None,
            'interpretation': interpretation
        }

    def _calculate_roc(self, close: np.ndarray, period: int) -> float:
        """Rate of Change"""
        if len(close) <= period or close[-period-1] == 0:
            return 0
        return ((close[-1] - close[-period-1]) / close[-period-1]) * 100

    def _calculate_williams_r(self, high: np.ndarray, low: np.ndarray,
                               close: np.ndarray, period: int) -> float:
        """Williams %R"""
        if len(high) < period:
            return -50

        highest_high = np.max(high[-period:])
        lowest_low = np.min(low[-period:])

        if highest_high == lowest_low:
            return -50

        return ((highest_high - close[-1]) / (highest_high - lowest_low)) * -100

    def _calculate_stoch_rsi(self, close: np.ndarray, period: int) -> float:
        """Stochastic RSI"""
        rsi_values = []
        for i in range(period, len(close)):
            rsi_values.append(self._calculate_rsi(close[:i+1], period))

        if len(rsi_values) < period:
            return 50

        recent_rsi = rsi_values[-period:]
        min_rsi = min(recent_rsi)
        max_rsi = max(recent_rsi)

        if max_rsi == min_rsi:
            return 50

        return ((rsi_values[-1] - min_rsi) / (max_rsi - min_rsi)) * 100

    def _calculate_mfi(self, high: np.ndarray, low: np.ndarray, close: np.ndarray,
                       volume: np.ndarray, period: int) -> float:
        """Money Flow Index"""
        if len(close) < period + 1:
            return 50

        typical_price = (high + low + close) / 3
        money_flow = typical_price * volume

        positive_flow = 0
        negative_flow = 0

        for i in range(-period, 0):
            if typical_price[i] > typical_price[i-1]:
                positive_flow += money_flow[i]
            else:
                negative_flow += money_flow[i]

        if negative_flow == 0:
            return 100

        money_ratio = positive_flow / negative_flow
        mfi = 100 - (100 / (1 + money_ratio))

        return mfi

    # ==========================================
    # 7. BACKTESTING
    # ==========================================

    def backtest_signal(self, data: pd.DataFrame, signal_type: str,
                        lookback: int = 100) -> Dict:
        """
        Backtest simplifié pour évaluer la fiabilité historique des signaux
        """
        if data is None or len(data) < lookback + 20:
            return {'available': False, 'reliability': 50}

        results = {
            'available': True,
            'total_signals': 0,
            'winning_signals': 0,
            'losing_signals': 0,
            'avg_gain': 0,
            'avg_loss': 0,
            'win_rate': 50,
            'reliability': 50,
            'profit_factor': 1.0
        }

        close = data['Close'].values
        high = data['High'].values
        low = data['Low'].values

        gains = []
        losses = []

        # Parcourir l'historique
        for i in range(lookback, len(data) - 5):
            # Simuler le signal au point i
            signal = self._generate_backtest_signal(
                close[:i+1], high[:i+1], low[:i+1], signal_type
            )

            if signal == 'NONE':
                continue

            results['total_signals'] += 1

            # Calculer le résultat 5 jours après
            future_return = ((close[i+5] - close[i]) / close[i]) * 100

            if signal == 'BUY':
                if future_return > 0:
                    results['winning_signals'] += 1
                    gains.append(future_return)
                else:
                    results['losing_signals'] += 1
                    losses.append(abs(future_return))
            elif signal == 'SELL':
                if future_return < 0:
                    results['winning_signals'] += 1
                    gains.append(abs(future_return))
                else:
                    results['losing_signals'] += 1
                    losses.append(future_return)

        # Calculer les métriques
        if results['total_signals'] > 0:
            results['win_rate'] = (results['winning_signals'] / results['total_signals']) * 100
            results['avg_gain'] = np.mean(gains) if gains else 0
            results['avg_loss'] = np.mean(losses) if losses else 0

            if results['avg_loss'] > 0:
                results['profit_factor'] = results['avg_gain'] / results['avg_loss']

            # Score de fiabilité
            results['reliability'] = min(100, max(0,
                results['win_rate'] * 0.6 +
                min(40, results['profit_factor'] * 20)
            ))

        results['interpretation'] = self._interpret_backtest(results)

        return results

    def _generate_backtest_signal(self, close: np.ndarray, high: np.ndarray,
                                   low: np.ndarray, signal_type: str) -> str:
        """Génère un signal pour le backtesting"""
        if len(close) < 20:
            return 'NONE'

        if signal_type == 'RSI':
            rsi = self._calculate_rsi(close, 14)
            if rsi < 30:
                return 'BUY'
            elif rsi > 70:
                return 'SELL'

        elif signal_type == 'EMA_CROSS':
            ema20 = self._ema(close, 20)
            ema50 = self._ema(close, 50)
            if len(ema20) >= 2 and len(ema50) >= 2:
                if ema20[-2] < ema50[-2] and ema20[-1] > ema50[-1]:
                    return 'BUY'
                elif ema20[-2] > ema50[-2] and ema20[-1] < ema50[-1]:
                    return 'SELL'

        elif signal_type == 'MOMENTUM':
            roc = self._calculate_roc(close, 10)
            if roc > 5:
                return 'BUY'
            elif roc < -5:
                return 'SELL'

        return 'NONE'

    def _interpret_backtest(self, results: Dict) -> str:
        """Interprète les résultats du backtest"""
        if results['total_signals'] < 10:
            return "Données insuffisantes pour une analyse fiable"

        win_rate = results['win_rate']
        pf = results['profit_factor']

        if win_rate >= 60 and pf >= 1.5:
            return f"Signal très fiable - {win_rate:.0f}% de réussite, PF: {pf:.2f}"
        elif win_rate >= 50 and pf >= 1.0:
            return f"Signal fiable - {win_rate:.0f}% de réussite, PF: {pf:.2f}"
        elif win_rate >= 40:
            return f"Signal moyen - {win_rate:.0f}% de réussite, utiliser avec confirmation"
        else:
            return f"Signal peu fiable - {win_rate:.0f}% de réussite, éviter"

    # ==========================================
    # UTILITAIRES
    # ==========================================

    def _ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """Calcule l'EMA"""
        if len(data) < period:
            return np.array([data[-1]] if len(data) > 0 else [0])

        multiplier = 2 / (period + 1)
        ema = [np.mean(data[:period])]

        for price in data[period:]:
            ema.append((price - ema[-1]) * multiplier + ema[-1])

        return np.array(ema)

    def _calculate_rsi(self, close: np.ndarray, period: int = 14) -> float:
        """Calcule le RSI"""
        if len(close) < period + 1:
            return 50

        deltas = np.diff(close)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])

        if avg_loss == 0:
            return 100

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))

        return rsi


# Instance globale
enhanced_analyzer = EnhancedAnalysis()
