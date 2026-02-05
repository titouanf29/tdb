"""
Algorithmes Avancés pour TDB Bot v3.0

Améliorations techniques:
- Détection de divergences avancée (RSI, MACD, OBV)
- Position sizing automatique (ATR-based + Kelly Criterion)
- Score de fiabilité du signal
- Détection de breakouts avec confirmation
- Force relative sectorielle
- Calcul automatique des targets optimaux
- Filtrage de tendance MTF
"""
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class AdvancedAlgorithms:
    """Algorithmes avancés pour améliorer la précision des signaux"""

    def __init__(self):
        # Paramètres de divergence
        self.divergence_lookback = 14
        self.divergence_min_bars = 5

        # Paramètres de breakout
        self.breakout_volume_threshold = 1.5
        self.squeeze_bb_threshold = 0.04

        # Paramètres de position sizing
        self.max_risk_percent = 2.0  # Max 2% du capital par trade
        self.kelly_fraction = 0.25  # Utiliser 25% du Kelly (plus conservateur)

    # ========== DIVERGENCES AVANCÉES ==========

    def detect_divergences(self, data: pd.DataFrame) -> dict:
        """
        Détecte les divergences RSI, MACD et OBV
        Retourne un dict avec les divergences détectées et leur force
        """
        result = {
            'rsi_divergence': None,
            'macd_divergence': None,
            'obv_divergence': None,
            'hidden_divergence': None,
            'score': 0,
            'signals': []
        }

        try:
            # Calcul des indicateurs
            rsi = self._calculate_rsi_series(data)
            macd_line, signal_line, histogram = self._calculate_macd_full(data)
            obv = self._calculate_obv(data)

            close = data['Close']

            # === RSI Divergence ===
            rsi_div = self._find_divergence(close, rsi, 'RSI')
            if rsi_div:
                result['rsi_divergence'] = rsi_div
                result['signals'].append(rsi_div)
                result['score'] += rsi_div['strength']

            # === MACD Histogram Divergence ===
            macd_div = self._find_divergence(close, histogram, 'MACD')
            if macd_div:
                result['macd_divergence'] = macd_div
                result['signals'].append(macd_div)
                result['score'] += macd_div['strength']

            # === OBV Divergence (Volume confirme) ===
            obv_div = self._find_divergence(close, obv, 'OBV')
            if obv_div:
                result['obv_divergence'] = obv_div
                result['signals'].append(obv_div)
                result['score'] += obv_div['strength'] * 0.5  # Poids moindre

            # === Hidden Divergence (continuation) ===
            hidden_div = self._find_hidden_divergence(close, rsi)
            if hidden_div:
                result['hidden_divergence'] = hidden_div
                result['signals'].append(hidden_div)
                result['score'] += hidden_div['strength'] * 0.7

            # Normaliser le score
            result['score'] = min(100, result['score'])

        except Exception as e:
            logger.error(f"Erreur détection divergences: {e}")

        return result

    def _find_divergence(self, price: pd.Series, indicator: pd.Series,
                         indicator_name: str, lookback: int = 14) -> dict:
        """
        Trouve les divergences classiques (regular divergence)
        - Bullish: Prix fait Lower Low, indicateur fait Higher Low
        - Bearish: Prix fait Higher High, indicateur fait Lower High
        """
        if len(price) < lookback or len(indicator) < lookback:
            return None

        # Trouver les pivots
        price_pivots = self._find_pivots(price, lookback)
        ind_pivots = self._find_pivots(indicator, lookback)

        if not price_pivots['lows'] or not ind_pivots['lows']:
            return None

        # === Bullish Divergence ===
        # Prix: Lower Low, Indicateur: Higher Low
        if len(price_pivots['lows']) >= 2 and len(ind_pivots['lows']) >= 2:
            price_ll = price_pivots['lows'][-1]['value'] < price_pivots['lows'][-2]['value']
            ind_hl = ind_pivots['lows'][-1]['value'] > ind_pivots['lows'][-2]['value']

            if price_ll and ind_hl:
                # Calculer la force de la divergence
                price_diff = abs(price_pivots['lows'][-1]['value'] - price_pivots['lows'][-2]['value'])
                price_diff_pct = (price_diff / price_pivots['lows'][-2]['value']) * 100

                strength = min(40, price_diff_pct * 10)  # Max 40 points

                # Bonus si indicateur en zone extrême
                if indicator_name == 'RSI' and indicator.iloc[-1] < 35:
                    strength += 15
                elif indicator_name == 'MACD' and indicator.iloc[-1] < 0:
                    strength += 10

                return {
                    'type': 'bullish',
                    'indicator': indicator_name,
                    'strength': strength,
                    'description': f"Divergence haussière {indicator_name} - Retournement potentiel",
                    'price_action': 'Lower Low',
                    'indicator_action': 'Higher Low'
                }

        # === Bearish Divergence ===
        # Prix: Higher High, Indicateur: Lower High
        if len(price_pivots['highs']) >= 2 and len(ind_pivots['highs']) >= 2:
            price_hh = price_pivots['highs'][-1]['value'] > price_pivots['highs'][-2]['value']
            ind_lh = ind_pivots['highs'][-1]['value'] < ind_pivots['highs'][-2]['value']

            if price_hh and ind_lh:
                price_diff = abs(price_pivots['highs'][-1]['value'] - price_pivots['highs'][-2]['value'])
                price_diff_pct = (price_diff / price_pivots['highs'][-2]['value']) * 100

                strength = min(40, price_diff_pct * 10)

                if indicator_name == 'RSI' and indicator.iloc[-1] > 65:
                    strength += 15
                elif indicator_name == 'MACD' and indicator.iloc[-1] > 0:
                    strength += 10

                return {
                    'type': 'bearish',
                    'indicator': indicator_name,
                    'strength': strength,
                    'description': f"Divergence baissière {indicator_name} - Correction potentielle",
                    'price_action': 'Higher High',
                    'indicator_action': 'Lower High'
                }

        return None

    def _find_hidden_divergence(self, price: pd.Series, rsi: pd.Series,
                                lookback: int = 14) -> dict:
        """
        Trouve les divergences cachées (continuation de tendance)
        - Bullish Hidden: Prix fait Higher Low, RSI fait Lower Low (continuation haussière)
        - Bearish Hidden: Prix fait Lower High, RSI fait Higher High (continuation baissière)
        """
        if len(price) < lookback or len(rsi) < lookback:
            return None

        price_pivots = self._find_pivots(price, lookback)
        rsi_pivots = self._find_pivots(rsi, lookback)

        # === Bullish Hidden Divergence ===
        if len(price_pivots['lows']) >= 2 and len(rsi_pivots['lows']) >= 2:
            price_hl = price_pivots['lows'][-1]['value'] > price_pivots['lows'][-2]['value']
            rsi_ll = rsi_pivots['lows'][-1]['value'] < rsi_pivots['lows'][-2]['value']

            if price_hl and rsi_ll and rsi.iloc[-1] > 40:
                return {
                    'type': 'bullish_hidden',
                    'indicator': 'RSI',
                    'strength': 25,
                    'description': "Divergence cachée haussière - Continuation de tendance"
                }

        # === Bearish Hidden Divergence ===
        if len(price_pivots['highs']) >= 2 and len(rsi_pivots['highs']) >= 2:
            price_lh = price_pivots['highs'][-1]['value'] < price_pivots['highs'][-2]['value']
            rsi_hh = rsi_pivots['highs'][-1]['value'] > rsi_pivots['highs'][-2]['value']

            if price_lh and rsi_hh and rsi.iloc[-1] < 60:
                return {
                    'type': 'bearish_hidden',
                    'indicator': 'RSI',
                    'strength': 25,
                    'description': "Divergence cachée baissière - Continuation baissière"
                }

        return None

    def _find_pivots(self, series: pd.Series, lookback: int = 14) -> dict:
        """Trouve les pivots (highs et lows) dans une série"""
        highs = []
        lows = []

        data = series.tail(lookback * 3).values
        indices = series.tail(lookback * 3).index

        for i in range(2, len(data) - 2):
            # Local High
            if data[i] > data[i-1] and data[i] > data[i-2] and \
               data[i] > data[i+1] and data[i] > data[i+2]:
                highs.append({'index': indices[i], 'value': data[i]})

            # Local Low
            if data[i] < data[i-1] and data[i] < data[i-2] and \
               data[i] < data[i+1] and data[i] < data[i+2]:
                lows.append({'index': indices[i], 'value': data[i]})

        return {'highs': highs[-3:], 'lows': lows[-3:]}

    # ========== POSITION SIZING AUTOMATIQUE ==========

    def calculate_position_size(self, capital: float, entry_price: float,
                                stop_loss: float, atr: float,
                                win_rate: float = 0.55,
                                avg_win_loss_ratio: float = 1.5) -> dict:
        """
        Calcule la taille de position optimale basée sur:
        - ATR (volatilité)
        - Kelly Criterion (optimal mathématique)
        - Risk management (max 2% par trade)

        Returns:
            dict avec position_size, risk_amount, units, method
        """
        result = {
            'position_size_usd': 0,
            'units': 0,
            'risk_percent': 0,
            'risk_amount': 0,
            'method': 'standard',
            'kelly_full': 0,
            'kelly_fraction': 0,
            'atr_stop': 0
        }

        try:
            # === 1. Calcul du risque par trade ===
            if stop_loss and stop_loss > 0:
                risk_per_unit = abs(entry_price - stop_loss)
            else:
                # Utiliser 2x ATR comme stop par défaut
                risk_per_unit = atr * 2
                result['atr_stop'] = entry_price - risk_per_unit

            risk_percent_per_unit = (risk_per_unit / entry_price) * 100

            # === 2. Kelly Criterion ===
            # Kelly = W - [(1-W) / R]
            # W = win rate, R = avg win/loss ratio
            kelly_full = win_rate - ((1 - win_rate) / avg_win_loss_ratio)
            kelly_full = max(0, min(0.25, kelly_full))  # Limiter entre 0 et 25%

            # Utiliser fraction du Kelly (plus conservateur)
            kelly_fraction = kelly_full * self.kelly_fraction
            result['kelly_full'] = round(kelly_full * 100, 2)
            result['kelly_fraction'] = round(kelly_fraction * 100, 2)

            # === 3. Calcul de la position ===

            # Méthode 1: Fixed Risk (2% max)
            max_risk_amount = capital * (self.max_risk_percent / 100)
            position_fixed_risk = max_risk_amount / risk_per_unit * entry_price

            # Méthode 2: Kelly-based
            position_kelly = capital * kelly_fraction

            # Méthode 3: ATR-based (volatility adjusted)
            # Plus la volatilité est haute, plus la position est petite
            atr_percent = (atr / entry_price) * 100
            volatility_factor = 2 / max(atr_percent, 0.5)  # Inverse de la volatilité
            volatility_factor = min(2, max(0.5, volatility_factor))
            position_atr = position_fixed_risk * volatility_factor

            # === 4. Choisir la plus conservative ===
            position_size = min(position_fixed_risk, position_kelly, position_atr)

            # Ne pas dépasser 20% du capital
            max_position = capital * 0.20
            position_size = min(position_size, max_position)

            # === 5. Calculer les résultats ===
            result['position_size_usd'] = round(position_size, 2)
            result['units'] = round(position_size / entry_price, 6)
            result['risk_amount'] = round(position_size * (risk_percent_per_unit / 100), 2)
            result['risk_percent'] = round((result['risk_amount'] / capital) * 100, 2)

            # Déterminer la méthode utilisée
            if position_size == position_kelly:
                result['method'] = 'kelly'
            elif position_size == position_atr:
                result['method'] = 'atr_adjusted'
            else:
                result['method'] = 'fixed_risk'

        except Exception as e:
            logger.error(f"Erreur calcul position size: {e}")

        return result

    # ========== SCORE DE FIABILITÉ DU SIGNAL ==========

    def calculate_signal_reliability(self, analysis: dict) -> dict:
        """
        Calcule un score de fiabilité du signal basé sur:
        - Confluence des indicateurs
        - Volume confirmation
        - Tendance MTF
        - Qualité des patterns
        - Divergences
        """
        reliability = {
            'score': 0,
            'grade': 'F',
            'factors': [],
            'warnings': [],
            'confidence': 'low'
        }

        try:
            score = 0

            # === 1. Confluence MTF (max 25 points) ===
            confluence = analysis.get('confluence', {})
            if confluence.get('aligned'):
                score += 25
                reliability['factors'].append("✅ Confluence parfaite MTF (+25)")
            elif confluence.get('direction') != 'neutral':
                score += 15
                reliability['factors'].append("📊 Confluence partielle MTF (+15)")

            # === 2. Volume confirmation (max 20 points) ===
            volume_ratio = analysis.get('volume_ratio', 1)
            if volume_ratio > 2:
                score += 20
                reliability['factors'].append("🔥 Volume très élevé (+20)")
            elif volume_ratio > 1.5:
                score += 15
                reliability['factors'].append("📈 Volume élevé (+15)")
            elif volume_ratio > 1:
                score += 10
                reliability['factors'].append("✅ Volume normal (+10)")
            elif volume_ratio < 0.7:
                score -= 10
                reliability['warnings'].append("⚠️ Volume faible (-10)")

            # === 3. ADX - Force de tendance (max 15 points) ===
            adx = analysis.get('adx', {})
            adx_value = adx.get('adx', 20)
            if adx_value > 30:
                score += 15
                reliability['factors'].append(f"💪 Tendance très forte ADX:{adx_value:.0f} (+15)")
            elif adx_value > 25:
                score += 10
                reliability['factors'].append(f"📈 Tendance forte ADX:{adx_value:.0f} (+10)")
            elif adx_value < 20:
                score -= 5
                reliability['warnings'].append(f"😴 Pas de tendance ADX:{adx_value:.0f} (-5)")

            # === 4. Patterns détectés (max 15 points) ===
            patterns = analysis.get('patterns', [])
            strong_patterns = [p for p in patterns if p.get('strength', 0) >= 75]
            if len(strong_patterns) >= 2:
                score += 15
                reliability['factors'].append(f"📐 {len(strong_patterns)} patterns forts (+15)")
            elif len(strong_patterns) == 1:
                score += 10
                reliability['factors'].append(f"📐 Pattern fort détecté (+10)")

            # === 5. RSI en zone favorable (max 10 points) ===
            rsi = analysis.get('rsi', 50)
            direction = analysis.get('direction', 'NEUTRAL')
            if direction == 'LONG' and rsi < 40:
                score += 10
                reliability['factors'].append("✅ RSI favorable pour LONG (+10)")
            elif direction == 'SHORT' and rsi > 60:
                score += 10
                reliability['factors'].append("✅ RSI favorable pour SHORT (+10)")
            elif direction == 'LONG' and rsi > 70:
                score -= 10
                reliability['warnings'].append("⚠️ RSI surachat pour LONG (-10)")
            elif direction == 'SHORT' and rsi < 30:
                score -= 10
                reliability['warnings'].append("⚠️ RSI survente pour SHORT (-10)")

            # === 6. Structure de marché (max 10 points) ===
            market_structure = analysis.get('market_structure', {})
            if market_structure.get('bos'):
                score += 10
                reliability['factors'].append("⚡ Break of Structure confirmé (+10)")
            elif market_structure.get('choch'):
                score += 5
                reliability['factors'].append("🔄 Change of Character (+5)")

            # === 7. Score global de l'analyse (max 5 points) ===
            analysis_score = analysis.get('score', 50)
            if analysis_score >= 80:
                score += 5

            # === Calculer le grade final ===
            reliability['score'] = max(0, min(100, score))

            if reliability['score'] >= 80:
                reliability['grade'] = 'A'
                reliability['confidence'] = 'very_high'
            elif reliability['score'] >= 65:
                reliability['grade'] = 'B'
                reliability['confidence'] = 'high'
            elif reliability['score'] >= 50:
                reliability['grade'] = 'C'
                reliability['confidence'] = 'medium'
            elif reliability['score'] >= 35:
                reliability['grade'] = 'D'
                reliability['confidence'] = 'low'
            else:
                reliability['grade'] = 'F'
                reliability['confidence'] = 'very_low'

        except Exception as e:
            logger.error(f"Erreur calcul fiabilité: {e}")

        return reliability

    # ========== DÉTECTION DE BREAKOUT ==========

    def detect_breakout(self, data: pd.DataFrame, lookback: int = 20) -> dict:
        """
        Détecte les breakouts avec confirmation:
        - Cassure de résistance/support
        - Confirmation volume
        - Squeeze Bollinger
        """
        result = {
            'breakout_detected': False,
            'type': None,  # 'resistance', 'support', 'range'
            'direction': None,
            'strength': 0,
            'volume_confirmed': False,
            'squeeze_release': False,
            'level': None
        }

        try:
            close = data['Close']
            high = data['High']
            low = data['Low']
            volume = data['Volume']

            current_price = close.iloc[-1]
            prev_price = close.iloc[-2]

            # Calculer niveaux
            resistance = high.tail(lookback).max()
            support = low.tail(lookback).min()

            # Volume moyen
            avg_volume = volume.tail(lookback).mean()
            current_volume = volume.iloc[-1]
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

            # Bollinger pour squeeze
            bb_upper, bb_middle, bb_lower = self._calculate_bollinger(data)
            bb_width = (bb_upper.iloc[-1] - bb_lower.iloc[-1]) / bb_middle.iloc[-1]
            bb_width_prev = (bb_upper.iloc[-5] - bb_lower.iloc[-5]) / bb_middle.iloc[-5]

            # Squeeze release
            squeeze_release = bb_width > bb_width_prev * 1.5

            # === Breakout Resistance ===
            if current_price > resistance and prev_price <= resistance:
                result['breakout_detected'] = True
                result['type'] = 'resistance'
                result['direction'] = 'LONG'
                result['level'] = resistance
                result['strength'] = 30

                if volume_ratio > self.breakout_volume_threshold:
                    result['volume_confirmed'] = True
                    result['strength'] += 25

                if squeeze_release:
                    result['squeeze_release'] = True
                    result['strength'] += 20

            # === Breakout Support ===
            elif current_price < support and prev_price >= support:
                result['breakout_detected'] = True
                result['type'] = 'support'
                result['direction'] = 'SHORT'
                result['level'] = support
                result['strength'] = 30

                if volume_ratio > self.breakout_volume_threshold:
                    result['volume_confirmed'] = True
                    result['strength'] += 25

                if squeeze_release:
                    result['squeeze_release'] = True
                    result['strength'] += 20

            # === Squeeze Detection (pre-breakout) ===
            elif bb_width < self.squeeze_bb_threshold:
                result['type'] = 'squeeze'
                result['strength'] = 15
                result['squeeze_release'] = False

        except Exception as e:
            logger.error(f"Erreur détection breakout: {e}")

        return result

    # ========== CALCUL AUTOMATIQUE DES TARGETS ==========

    def calculate_optimal_targets(self, entry_price: float, direction: str,
                                   atr: float, support: float, resistance: float,
                                   fibonacci: dict = None) -> dict:
        """
        Calcule les TP et SL optimaux basés sur:
        - ATR (volatilité)
        - Support/Résistance
        - Fibonacci
        - Risk/Reward ratio
        """
        targets = {
            'stop_loss': None,
            'take_profit_1': None,
            'take_profit_2': None,
            'take_profit_3': None,
            'risk_reward_1': 0,
            'risk_reward_2': 0,
            'risk_reward_3': 0,
            'method': 'atr'
        }

        try:
            if direction == 'LONG':
                # Stop Loss: 2x ATR sous le prix d'entrée, ou sous le support
                sl_atr = entry_price - (atr * 2)
                sl_support = support * 0.995 if support else sl_atr
                targets['stop_loss'] = max(sl_atr, sl_support)

                risk = entry_price - targets['stop_loss']

                # TP1: 1.5x Risk (R:R 1:1.5)
                targets['take_profit_1'] = entry_price + (risk * 1.5)
                targets['risk_reward_1'] = 1.5

                # TP2: 2.5x Risk ou résistance
                tp2_rr = entry_price + (risk * 2.5)
                targets['take_profit_2'] = min(tp2_rr, resistance) if resistance else tp2_rr
                targets['risk_reward_2'] = (targets['take_profit_2'] - entry_price) / risk

                # TP3: 4x Risk ou Fib extension
                tp3_rr = entry_price + (risk * 4)
                if fibonacci and '0.0' in fibonacci:
                    # Extension Fibonacci
                    fib_range = fibonacci['0.0'] - fibonacci['1.0']
                    tp3_fib = fibonacci['0.0'] + (fib_range * 0.618)
                    targets['take_profit_3'] = max(tp3_rr, tp3_fib)
                else:
                    targets['take_profit_3'] = tp3_rr
                targets['risk_reward_3'] = (targets['take_profit_3'] - entry_price) / risk

            else:  # SHORT
                # Stop Loss: 2x ATR au-dessus du prix d'entrée, ou au-dessus de la résistance
                sl_atr = entry_price + (atr * 2)
                sl_resistance = resistance * 1.005 if resistance else sl_atr
                targets['stop_loss'] = min(sl_atr, sl_resistance)

                risk = targets['stop_loss'] - entry_price

                # TP1: 1.5x Risk
                targets['take_profit_1'] = entry_price - (risk * 1.5)
                targets['risk_reward_1'] = 1.5

                # TP2: 2.5x Risk ou support
                tp2_rr = entry_price - (risk * 2.5)
                targets['take_profit_2'] = max(tp2_rr, support) if support else tp2_rr
                targets['risk_reward_2'] = (entry_price - targets['take_profit_2']) / risk

                # TP3: 4x Risk
                tp3_rr = entry_price - (risk * 4)
                if fibonacci and '1.0' in fibonacci:
                    fib_range = fibonacci['0.0'] - fibonacci['1.0']
                    tp3_fib = fibonacci['1.0'] - (fib_range * 0.618)
                    targets['take_profit_3'] = min(tp3_rr, tp3_fib)
                else:
                    targets['take_profit_3'] = tp3_rr
                targets['risk_reward_3'] = (entry_price - targets['take_profit_3']) / risk

            # Arrondir les valeurs
            for key in ['stop_loss', 'take_profit_1', 'take_profit_2', 'take_profit_3']:
                if targets[key]:
                    targets[key] = round(targets[key], 4)

        except Exception as e:
            logger.error(f"Erreur calcul targets: {e}")

        return targets

    # ========== FORCE RELATIVE ==========

    def calculate_relative_strength(self, asset_data: pd.DataFrame,
                                     index_data: pd.DataFrame,
                                     lookback: int = 20) -> dict:
        """
        Compare la performance de l'actif vs son indice de référence
        RS > 1 = surperformance
        RS < 1 = sous-performance
        """
        result = {
            'rs_ratio': 1.0,
            'rs_momentum': 0,
            'outperforming': False,
            'trend': 'neutral',
            'strength': 0
        }

        try:
            if asset_data.empty or index_data.empty:
                return result

            # Calcul du ratio RS
            asset_return = (asset_data['Close'].iloc[-1] / asset_data['Close'].iloc[-lookback] - 1) * 100
            index_return = (index_data['Close'].iloc[-1] / index_data['Close'].iloc[-lookback] - 1) * 100

            if index_return != 0:
                rs_ratio = (1 + asset_return/100) / (1 + index_return/100)
            else:
                rs_ratio = 1.0

            result['rs_ratio'] = round(rs_ratio, 3)
            result['outperforming'] = rs_ratio > 1.0

            # RS Momentum (variation du RS)
            asset_return_prev = (asset_data['Close'].iloc[-lookback//2] / asset_data['Close'].iloc[-lookback] - 1) * 100
            index_return_prev = (index_data['Close'].iloc[-lookback//2] / index_data['Close'].iloc[-lookback] - 1) * 100

            if index_return_prev != 0:
                rs_ratio_prev = (1 + asset_return_prev/100) / (1 + index_return_prev/100)
            else:
                rs_ratio_prev = 1.0

            rs_momentum = rs_ratio - rs_ratio_prev
            result['rs_momentum'] = round(rs_momentum, 4)

            # Tendance et force
            if rs_ratio > 1.05 and rs_momentum > 0:
                result['trend'] = 'strong_outperform'
                result['strength'] = 30
            elif rs_ratio > 1.0 and rs_momentum > 0:
                result['trend'] = 'outperform'
                result['strength'] = 20
            elif rs_ratio < 0.95 and rs_momentum < 0:
                result['trend'] = 'strong_underperform'
                result['strength'] = -30
            elif rs_ratio < 1.0 and rs_momentum < 0:
                result['trend'] = 'underperform'
                result['strength'] = -20

        except Exception as e:
            logger.error(f"Erreur calcul force relative: {e}")

        return result

    # ========== HELPERS ==========

    def _calculate_rsi_series(self, data: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calcule la série RSI complète"""
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def _calculate_macd_full(self, data: pd.DataFrame):
        """Calcule MACD complet avec histogramme"""
        exp1 = data['Close'].ewm(span=12, adjust=False).mean()
        exp2 = data['Close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        return macd, signal, histogram

    def _calculate_obv(self, data: pd.DataFrame) -> pd.Series:
        """Calcule l'OBV"""
        obv = (np.sign(data['Close'].diff()) * data['Volume']).fillna(0).cumsum()
        return obv

    def _calculate_bollinger(self, data: pd.DataFrame, period: int = 20, std: int = 2):
        """Calcule les Bollinger Bands"""
        middle = data['Close'].rolling(window=period).mean()
        std_dev = data['Close'].rolling(window=period).std()
        upper = middle + (std_dev * std)
        lower = middle - (std_dev * std)
        return upper, middle, lower


# Instance singleton
advanced_algo = AdvancedAlgorithms()
