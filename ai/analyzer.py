"""
Algorithme d'Analyse IA Avancé pour TDB Bot v3.0

Analyse multi-paramètres améliorée :
- Analyse technique (tendances, structures, indicateurs)
- Reconnaissance de patterns (Engulfing, Doji, H&S, Triangles)
- Smart Money Concepts (Order Blocks, FVG, Liquidity)
- Confluence Multi-Timeframe
- ADX / VWAP / Structure de marché
- Volume et volatilité
- Momentum
- Contexte marché
- Actualités
- Divergences avancées (RSI, MACD, OBV)
- Position sizing automatique (ATR + Kelly)
- Score de fiabilité du signal
- Détection de breakout avec confirmation

Système de scoring intelligent 0-100
"""
import logging
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import config
from utils.helpers import *
from utils.asset_names import get_asset_display_name
from services.news import news_service
from ai.advanced_algo import advanced_algo
from ai.enhanced_analysis import enhanced_analyzer

logger = logging.getLogger(__name__)


class MarketAnalyzer:
    """Analyseur de marché avancé avec IA v2.0"""

    def __init__(self):
        self.weights = config.SCORING_WEIGHTS
        # Nouveaux poids pour l'analyse améliorée
        self.advanced_weights = {
            'technical': 0.25,
            'volume': 0.15,
            'momentum': 0.15,
            'volatility': 0.10,
            'market_context': 0.10,
            'news': 0.05,
            'patterns': 0.10,      # Nouveau
            'smart_money': 0.05,   # Nouveau
            'confluence': 0.05     # Nouveau
        }

        # Seuils de score selon l'agressivité
        self.aggressiveness_thresholds = {
            'Conservateur': {'min_score': 80, 'risk_multiplier': 0.7},
            'Modéré': {'min_score': 70, 'risk_multiplier': 1.0},
            'Agressif': {'min_score': 60, 'risk_multiplier': 1.3},
            'Très Agressif': {'min_score': 50, 'risk_multiplier': 1.5}
        }

        # Niveaux de détail
        self.detail_levels = {
            'Minimal': {'show_patterns': False, 'show_smc': False, 'show_targets': False, 'max_indicators': 3},
            'Standard': {'show_patterns': True, 'show_smc': False, 'show_targets': True, 'max_indicators': 6},
            'Détaillé': {'show_patterns': True, 'show_smc': True, 'show_targets': True, 'max_indicators': 10},
            'Complet': {'show_patterns': True, 'show_smc': True, 'show_targets': True, 'max_indicators': 999}
        }

    def get_user_thresholds(self, user_settings=None):
        """Retourne les seuils selon les paramètres utilisateur"""
        if not user_settings:
            return self.aggressiveness_thresholds['Modéré'], self.detail_levels['Standard']

        aggro = user_settings.get('ai_aggressiveness', 'Modéré')
        detail = user_settings.get('detail_level', 'Standard')

        aggro_config = self.aggressiveness_thresholds.get(aggro, self.aggressiveness_thresholds['Modéré'])
        detail_config = self.detail_levels.get(detail, self.detail_levels['Standard'])

        return aggro_config, detail_config

    async def analyze_asset(self, symbol, market, timeframes=None, fetch_news=True, user_settings=None):
        """
        Analyse complète d'un actif v2.0 avec nouvelles fonctionnalités

        Args:
            symbol: Symbole de l'actif
            market: Marché (USA, EUROPE, ASIA, CRYPTO)
            timeframes: Liste des timeframes à analyser
            fetch_news: Si True, récupère et analyse les actualités (défaut: True)
                       Si False, utilise un score neutre pour les news (plus rapide pour les scans)
            user_settings: Paramètres utilisateur (agressivité, niveau de détail)

        Returns:
            dict avec score, direction, analyses détaillées
        """
        if timeframes is None:
            timeframes = ["5m", "15m", "1h", "4h", "1d"]

        # Récupérer les configurations utilisateur
        aggro_config, detail_config = self.get_user_thresholds(user_settings)

        try:
            # Récupérer les données
            ticker = yf.Ticker(symbol)

            # Données multi-timeframes
            data_1d = ticker.history(period="3mo", interval="1d")
            data_1h = ticker.history(period="1mo", interval="1h")
            data_15m = ticker.history(period="5d", interval="15m")

            # Vérification minimum de données (besoin d'au moins 60 pour EMA200, Ichimoku, etc.)
            if data_1d.empty or len(data_1d) < 60:
                logger.debug(f"Données insuffisantes pour {symbol}: {len(data_1d) if not data_1d.empty else 0} lignes (min: 60)")
                return None

            # Vérification supplémentaire: s'assurer que les données sont valides
            if pd.isna(data_1d['Close'].iloc[-1]) or pd.isna(data_1d['Close'].iloc[-2]):
                logger.debug(f"Données NaN pour {symbol}")
                return None

            # ===== ANALYSES CLASSIQUES =====
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
                news_score = 0.5
                news_summary = "Actualités non récupérées (scan rapide)"

            # ===== NOUVELLES ANALYSES AVANCÉES =====

            # 1. Patterns (chandeliers + chartistes)
            pattern_score, detected_patterns = self._analyze_patterns(data_1d)

            # 2. Smart Money Concepts
            smc_analysis = self._analyze_smart_money(data_1d)
            smc_score = smc_analysis['score']

            # 3. Confluence Multi-Timeframe
            confluence = self._analyze_multi_timeframe_confluence(data_1d, data_1h, data_15m)
            confluence_score = confluence['strength']

            # 4. Structure de marché (BOS, CHoCH)
            market_structure = self._analyze_market_structure(data_1d)

            # 5. ADX - Force de tendance
            adx_data = self._calculate_adx(data_1d)

            # 6. VWAP
            vwap = self._calculate_vwap(data_1d)
            try:
                current_price = data_1d['Close'].iloc[-1] if len(data_1d) > 0 else 0
                if pd.isna(current_price):
                    current_price = 0
            except Exception:
                current_price = 0
            vwap_position = "above" if current_price > vwap else "below"

            # ===== SCORE FINAL PONDÉRÉ (nouvelle formule) =====
            final_score = (
                technical_score * self.advanced_weights['technical'] +
                volume_score * self.advanced_weights['volume'] +
                momentum_score * self.advanced_weights['momentum'] +
                volatility_score * self.advanced_weights['volatility'] +
                market_context_score * self.advanced_weights['market_context'] +
                news_score * self.advanced_weights['news'] +
                pattern_score * self.advanced_weights['patterns'] +
                smc_score * self.advanced_weights['smart_money'] +
                confluence_score * self.advanced_weights['confluence']
            ) * 100

            # Bonus/Malus basés sur la confluence et l'ADX
            if confluence['aligned']:
                final_score += 5  # Bonus confluence parfaite
            if adx_data['adx'] > 25:
                final_score += 3  # Bonus tendance forte
            if market_structure['bos']:
                final_score += 3  # Bonus Break of Structure

            # Arrondir et limiter
            final_score = int(max(0, min(100, final_score)))

            # Déterminer la direction (améliorée avec confluence)
            direction = self._determine_direction_advanced(
                data_1d, data_1h, technical_score, momentum_score,
                confluence, market_structure, adx_data
            )

            # Déterminer la tendance
            trend = self._determine_trend(data_1d)

            # Calculs supplémentaires
            try:
                prev_close = data_1d['Close'].iloc[-2] if len(data_1d) > 1 else current_price
                if pd.isna(prev_close) or prev_close == 0:
                    prev_close = current_price if current_price > 0 else 1
                price_change_1d = ((current_price - prev_close) / prev_close) * 100 if prev_close > 0 else 0
            except Exception:
                price_change_1d = 0

            # ATR pour volatilité
            atr = self._calculate_atr(data_1d)

            # RSI
            rsi = self._calculate_rsi(data_1d)

            # Volume
            try:
                avg_volume = data_1d['Volume'].rolling(20).mean().iloc[-1] if len(data_1d) >= 20 else 0
                current_volume = data_1d['Volume'].iloc[-1] if len(data_1d) > 0 else 0
                if pd.isna(avg_volume):
                    avg_volume = 0
                if pd.isna(current_volume):
                    current_volume = 0
                volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1
            except Exception:
                avg_volume = 0
                current_volume = 0
                volume_ratio = 1

            # Support/Resistance
            support, resistance = self._find_support_resistance(data_1d)

            # Niveaux de Fibonacci
            fibonacci_levels = self._calculate_fibonacci_levels(data_1d)

            # Detection des signaux de retournement (classique)
            reversal_signals = self._detect_reversal_signals(data_1d)

            # ===== ALGORITHMES AVANCÉS v3.0 =====

            # 7. Ichimoku Cloud
            ichimoku = enhanced_analyzer.calculate_ichimoku(data_1d)
            if ichimoku.get('available') and ichimoku.get('score', 50) > 60:
                final_score += 3
            elif ichimoku.get('available') and ichimoku.get('score', 50) < 40:
                final_score -= 3

            # 8. Fibonacci automatique
            fibonacci_auto = enhanced_analyzer.calculate_fibonacci(data_1d)

            # 9. Pattern Recognition avancé
            patterns_enhanced = enhanced_analyzer.detect_patterns(data_1d)
            if patterns_enhanced.get('patterns'):
                for pattern in patterns_enhanced['patterns'][:2]:
                    if pattern.get('signal') == 'BULLISH' and direction == 'LONG':
                        final_score += 3
                    elif pattern.get('signal') == 'BEARISH' and direction == 'SHORT':
                        final_score += 3

            # 10. Momentum Score avancé (ROC, Williams %R)
            momentum_enhanced = enhanced_analyzer.calculate_momentum_score(data_1d)
            if momentum_enhanced.get('available'):
                if momentum_enhanced.get('score', 50) > 70:
                    final_score += 5
                elif momentum_enhanced.get('score', 50) < 30:
                    final_score -= 5

            # 11. Backtesting simplifié
            backtest_result = enhanced_analyzer.backtest_signal(data_1d, 'EMA_CROSS')

            # 12. Divergences avancées (RSI, MACD, OBV)
            divergences = advanced_algo.detect_divergences(data_1d)
            if divergences['score'] > 0:
                # Bonus/Malus basé sur les divergences
                if divergences['signals']:
                    div_type = divergences['signals'][0].get('type', '')
                    if 'bullish' in div_type and direction == 'LONG':
                        final_score += 5
                    elif 'bearish' in div_type and direction == 'SHORT':
                        final_score += 5
                    elif 'bullish' in div_type and direction == 'SHORT':
                        final_score -= 5  # Divergence contre la direction
                    elif 'bearish' in div_type and direction == 'LONG':
                        final_score -= 5

            # 8. Détection de breakout
            breakout = advanced_algo.detect_breakout(data_1d)
            if breakout['breakout_detected']:
                if breakout['volume_confirmed']:
                    final_score += 7  # Breakout confirmé par volume
                else:
                    final_score += 3  # Breakout sans confirmation
                if breakout['squeeze_release']:
                    final_score += 3  # Squeeze release bonus

            # 9. Calcul des targets optimaux
            optimal_targets = advanced_algo.calculate_optimal_targets(
                entry_price=float(current_price),
                direction=direction,
                atr=float(atr),
                support=float(support) if support else None,
                resistance=float(resistance) if resistance else None,
                fibonacci=fibonacci_levels
            )

            # ===== NOUVELLES ANALYSES v5.0 =====

            # 13. Régime de marché (SMA200)
            market_regime = self._analyze_market_regime(data_1d)
            if market_regime['regime'] == 'STRONG_BULL' and direction == 'LONG':
                final_score += 5
            elif market_regime['regime'] == 'BULL' and direction == 'LONG':
                final_score += 3
            elif market_regime['regime'] == 'STRONG_BEAR' and direction == 'SHORT':
                final_score += 5
            elif market_regime['regime'] == 'BEAR' and direction == 'SHORT':
                final_score += 3
            elif market_regime['regime'] == 'STRONG_BULL' and direction == 'SHORT':
                final_score -= 5  # Contre-tendance en bull fort
            elif market_regime['regime'] == 'STRONG_BEAR' and direction == 'LONG':
                final_score -= 5  # Contre-tendance en bear fort

            # 14. Contexte VIX (volatilité du marché)
            vix_context = await self._get_vix_context()
            if vix_context.get('available'):
                if vix_context['level'] == 'extreme':
                    final_score -= 5  # Prudence en volatilité extrême
                elif vix_context['level'] == 'high':
                    final_score -= 3
                elif vix_context['level'] == 'very_low':
                    final_score -= 2  # Marché complaisant

            # 15. Force Relative vs Indice
            relative_strength = await self._get_relative_strength(symbol, market, data_1d)
            if relative_strength.get('available'):
                if relative_strength['trend'] == 'strong_outperform' and direction == 'LONG':
                    final_score += 5
                elif relative_strength['trend'] == 'outperform' and direction == 'LONG':
                    final_score += 3
                elif relative_strength['trend'] == 'strong_underperform' and direction == 'SHORT':
                    final_score += 3
                elif relative_strength['trend'] == 'strong_outperform' and direction == 'SHORT':
                    final_score -= 3  # Vendre un leader

            # Limiter le score final après les bonus
            final_score = int(max(0, min(100, final_score)))

            # Resume technique (amélioré avec nouvelles données)
            technical_summary = self._generate_technical_summary_advanced(
                trend, rsi, volume_ratio, support, resistance, current_price,
                adx_data, confluence, market_structure, detected_patterns
            )

            # Type d'opportunité
            opportunity_type = self._identify_opportunity_type_advanced(
                data_1d, data_1h, trend, rsi, volume_ratio,
                detected_patterns, market_structure, smc_analysis
            )

            # Niveau de risque
            risk_level = self._calculate_risk_level(volatility_score, volume_ratio, final_score)

            # Générer des explications détaillées
            explanations = self._generate_explanations(
                technical_score, volume_score, momentum_score, volatility_score,
                market_context_score, news_score, rsi, volume_ratio, trend,
                direction, atr, current_price, support, resistance
            )

            # Ajouter les nouvelles explications
            explanations['adx'] = {
                'value': adx_data['adx'],
                'trend_strength': 'Fort' if adx_data['adx'] > 25 else 'Faible' if adx_data['adx'] < 20 else 'Modéré',
                'plus_di': adx_data['plus_di'],
                'minus_di': adx_data['minus_di']
            }
            explanations['vwap'] = {
                'value': vwap,
                'position': vwap_position,
                'text': f"Prix {'au-dessus' if vwap_position == 'above' else 'en-dessous'} du VWAP - Biais {'haussier' if vwap_position == 'above' else 'baissier'}"
            }
            explanations['confluence'] = confluence
            explanations['market_structure'] = market_structure
            explanations['patterns_detected'] = detected_patterns

            # Ajouter les nouvelles explications v5.0
            explanations['market_regime'] = {
                'regime': market_regime['regime'],
                'sma200': market_regime.get('sma200'),
                'distance_pct': market_regime['distance_pct'],
                'description': market_regime['description']
            }
            if vix_context.get('available'):
                explanations['vix'] = {
                    'value': vix_context['vix'],
                    'level': vix_context['level'],
                    'interpretation': vix_context['interpretation']
                }
            if relative_strength.get('available'):
                explanations['relative_strength'] = {
                    'rs_ratio': relative_strength['rs_ratio'],
                    'outperforming': relative_strength['outperforming'],
                    'description': relative_strength['description']
                }

            # Générer des recommandations (améliorées)
            recommendations = self._generate_recommendations_advanced(
                final_score, direction, rsi, volume_ratio, trend, risk_level,
                confluence, adx_data, detected_patterns, market_structure
            )

            # Déterminer si c'est une opportunité selon l'agressivité
            min_score = aggro_config.get('min_score', 70)
            is_opportunity = final_score >= min_score and direction != "NEUTRAL"

            # Construire le résultat selon le niveau de détail
            result = {
                'symbol': symbol,
                'market': market,
                'score': final_score,
                'direction': direction,
                'trend': trend,
                'current_price': float(current_price),
                'price_change_1d': float(price_change_1d),
                'volatility': float(atr),
                'atr': float(atr),
                'rsi': float(rsi),
                'volume_ratio': float(volume_ratio),
                'support': float(support) if support else None,
                'resistance': float(resistance) if resistance else None,
                'risk_level': risk_level,
                'is_opportunity': is_opportunity,
                'min_score_threshold': min_score,
                'user_aggressiveness': user_settings.get('ai_aggressiveness', 'Modéré') if user_settings else 'Modéré',
                'user_detail_level': user_settings.get('detail_level', 'Standard') if user_settings else 'Standard',
            }

            # ===== DONNÉES AVANCÉES v3.0 =====

            # 10. Calculer le score de fiabilité du signal
            signal_reliability = advanced_algo.calculate_signal_reliability(result)
            result['signal_reliability'] = signal_reliability

            # Ajouter les divergences détectées
            result['divergences'] = divergences

            # Ajouter le breakout détecté
            result['breakout'] = breakout

            # Ajouter les targets optimaux calculés
            result['optimal_targets'] = optimal_targets

            # Ajouter les cibles si le niveau de détail le permet
            if detail_config.get('show_targets', True):
                result['fibonacci'] = {k: float(v) for k, v in fibonacci_levels.items()}
                result['reversal_signals'] = reversal_signals
                result['technical_summary'] = technical_summary
                result['opportunity_type'] = opportunity_type
                result['news_summary'] = news_summary
                result['explanations'] = explanations
                result['recommendations'] = recommendations

            # Ajouter les patterns si le niveau le permet
            if detail_config.get('show_patterns', True):
                result['patterns'] = detected_patterns
                result['adx'] = adx_data
                result['vwap'] = float(vwap)
                result['confluence'] = confluence
                result['market_structure'] = market_structure

            # Ajouter Smart Money si niveau Détaillé ou Complet
            if detail_config.get('show_smc', False):
                result['smart_money'] = smc_analysis

            # ===== DONNÉES v5.0 =====
            # Régime de marché
            result['market_regime'] = market_regime

            # VIX Context
            if vix_context.get('available'):
                result['vix_context'] = vix_context

            # Force Relative
            if relative_strength.get('available'):
                result['relative_strength'] = relative_strength

            # ===== ANALYSE AVANCÉE v4.0 =====
            # Ichimoku Cloud
            if ichimoku.get('available'):
                result['ichimoku'] = ichimoku
                explanations['ichimoku'] = {
                    'signal': ichimoku.get('position_signal', 'NEUTRAL'),
                    'cloud_color': ichimoku.get('cloud_color', 'NEUTRAL'),
                    'interpretation': ichimoku.get('interpretation', ''),
                    'score': ichimoku.get('score', 50)
                }

            # Fibonacci automatique
            if fibonacci_auto.get('available'):
                result['fibonacci_auto'] = fibonacci_auto
                if fibonacci_auto.get('next_support'):
                    recommendations.append(f"📉 Support Fibo: {fibonacci_auto['next_support']['price']:.2f} ({fibonacci_auto['next_support']['level']})")
                if fibonacci_auto.get('next_resistance'):
                    recommendations.append(f"📈 Résistance Fibo: {fibonacci_auto['next_resistance']['price']:.2f} ({fibonacci_auto['next_resistance']['level']})")

            # Patterns avancés
            if patterns_enhanced.get('patterns'):
                result['patterns_enhanced'] = patterns_enhanced
                for pattern in patterns_enhanced['patterns'][:2]:
                    recommendations.append(f"🔍 {pattern.get('name', 'Pattern')}: {pattern.get('description', '')}")

            # Momentum avancé
            if momentum_enhanced.get('available'):
                result['momentum_enhanced'] = momentum_enhanced
                explanations['momentum_advanced'] = {
                    'roc_5': momentum_enhanced.get('roc_5', 0),
                    'roc_10': momentum_enhanced.get('roc_10', 0),
                    'williams_r': momentum_enhanced.get('williams_r', -50),
                    'interpretation': momentum_enhanced.get('interpretation', '')
                }

            # Backtesting
            if backtest_result.get('available'):
                result['backtest'] = backtest_result
                if backtest_result.get('win_rate', 0) >= 55:
                    recommendations.append(f"📊 Backtest: {backtest_result['win_rate']:.0f}% réussite historique")

            # Toujours inclure les scores détaillés
            result['scores'] = {
                'technical': technical_score,
                'volume': volume_score,
                'momentum': momentum_score,
                'volatility': volatility_score,
                'market_context': market_context_score,
                'news': news_score,
                'patterns': pattern_score,
                'smart_money': smc_score,
                'confluence': confluence_score,
                'divergences': divergences.get('score', 0) / 100,  # Normaliser 0-1
                'breakout': breakout.get('strength', 0) / 100,
                'reliability': signal_reliability.get('score', 50) / 100,
                # Nouveaux scores v4.0
                'ichimoku': ichimoku.get('score', 50) / 100 if ichimoku.get('available') else 0.5,
                'momentum_enhanced': momentum_enhanced.get('score', 50) / 100 if momentum_enhanced.get('available') else 0.5,
                'backtest_reliability': backtest_result.get('reliability', 50) / 100 if backtest_result.get('available') else 0.5
            }

            # Ajouter les recommandations pour divergences et breakout
            if divergences['signals']:
                for div_signal in divergences['signals'][:2]:
                    recommendations.append(f"📊 {div_signal.get('description', 'Divergence détectée')}")

            if breakout['breakout_detected']:
                breakout_msg = f"⚡ Breakout {breakout['type']} détecté"
                if breakout['volume_confirmed']:
                    breakout_msg += " (confirmé par volume)"
                recommendations.append(breakout_msg)

            # Ajouter recommandation sur la fiabilité
            if signal_reliability['grade'] in ['A', 'B']:
                recommendations.append(f"✅ Signal fiable (Grade {signal_reliability['grade']}) - Confiance {signal_reliability['confidence']}")
            elif signal_reliability['grade'] in ['D', 'F']:
                recommendations.append(f"⚠️ Signal peu fiable (Grade {signal_reliability['grade']}) - Prudence recommandée")

            # ===== RECOMMANDATIONS v5.0 =====

            # Recommandation régime de marché
            if market_regime['regime'] == 'STRONG_BULL':
                recommendations.append("🐂 Régime BULL fort - Favoriser les achats, éviter les shorts")
            elif market_regime['regime'] == 'STRONG_BEAR':
                recommendations.append("🐻 Régime BEAR fort - Favoriser les ventes, éviter les longs")
            elif market_regime['regime'] == 'SIDEWAYS':
                recommendations.append("↔️ Marché latéral - Stratégies de range recommandées")

            # Recommandation VIX
            if vix_context.get('available'):
                if vix_context['level'] == 'extreme':
                    recommendations.append(f"⚠️ VIX extrême ({vix_context['vix']}) - Réduire positions, stops larges")
                elif vix_context['level'] == 'high':
                    recommendations.append(f"📊 VIX élevé ({vix_context['vix']}) - Volatilité accrue, prudence")
                elif vix_context['level'] == 'very_low':
                    recommendations.append(f"😴 VIX très bas ({vix_context['vix']}) - Marché complaisant, attention corrections")

            # Recommandation force relative
            if relative_strength.get('available'):
                if relative_strength['trend'] == 'strong_outperform':
                    recommendations.append(f"💪 Force relative forte - Leader du marché")
                elif relative_strength['trend'] == 'strong_underperform':
                    recommendations.append(f"📉 Sous-performance - Retardataire du marché")

            # Ajouter les nouveaux scores v5.0
            result['scores']['market_regime'] = market_regime.get('strength', 50) / 100
            if vix_context.get('available'):
                result['scores']['vix_level'] = (100 - min(vix_context['vix'], 50) * 2) / 100  # Normaliser
            if relative_strength.get('available'):
                result['scores']['relative_strength'] = relative_strength['rs_ratio']

            return result

        except Exception as e:
            logger.error(f"Erreur analyse {symbol}: {e}")
            return None

    def _determine_direction_advanced(self, data_1d, data_1h, technical_score, momentum_score,
                                       confluence, market_structure, adx_data):
        """Détermine la direction avec les nouvelles analyses"""
        # Score de base
        base_score = (technical_score + momentum_score) / 2

        # Ajuster avec confluence
        if confluence['aligned']:
            if confluence['direction'] == 'bullish':
                base_score += 0.15
            elif confluence['direction'] == 'bearish':
                base_score -= 0.15
        elif confluence['direction'] == 'bullish':
            base_score += 0.08
        elif confluence['direction'] == 'bearish':
            base_score -= 0.08

        # Ajuster avec structure de marché
        if market_structure['bos'] == 'bullish':
            base_score += 0.1
        elif market_structure['bos'] == 'bearish':
            base_score -= 0.1
        elif market_structure['choch'] == 'bullish':
            base_score += 0.05
        elif market_structure['choch'] == 'bearish':
            base_score -= 0.05

        # ADX confirme la tendance
        if adx_data['adx'] > 25:
            if adx_data['plus_di'] > adx_data['minus_di']:
                base_score += 0.05
            else:
                base_score -= 0.05

        if base_score > 0.6:
            return "LONG"
        elif base_score < 0.4:
            return "SHORT"
        else:
            return "NEUTRAL"

    def _generate_technical_summary_advanced(self, trend, rsi, volume_ratio, support, resistance,
                                             current_price, adx_data, confluence, market_structure,
                                             patterns):
        """Génère un résumé technique amélioré"""
        summary = []

        # Tendance
        if trend == "bullish":
            summary.append("📈 Tendance haussière")
        elif trend == "bearish":
            summary.append("📉 Tendance baissière")
        else:
            summary.append("➡️ Tendance neutre")

        # Force de tendance (ADX)
        if adx_data['adx'] > 25:
            summary.append(f"💪 Tendance forte (ADX:{adx_data['adx']:.0f})")
        elif adx_data['adx'] < 20:
            summary.append(f"😴 Pas de tendance (ADX:{adx_data['adx']:.0f})")

        # RSI
        if rsi < 30:
            summary.append("🔴 RSI survente")
        elif rsi > 70:
            summary.append("🟢 RSI surachat")

        # Volume
        if volume_ratio > 1.5:
            summary.append("🔥 Volume élevé")

        # Confluence
        if confluence['aligned']:
            summary.append(f"✅ Confluence {confluence['direction']}")

        # Structure
        if market_structure['bos']:
            summary.append(f"⚡ BOS {market_structure['bos']}")
        if market_structure['choch']:
            summary.append(f"🔄 CHoCH {market_structure['choch']}")

        # Patterns importants
        strong_patterns = [p for p in patterns if p.get('strength', 0) >= 80]
        if strong_patterns:
            summary.append(f"📐 {strong_patterns[0]['name']}")

        return " | ".join(summary) if summary else "Analyse en cours"

    def _identify_opportunity_type_advanced(self, data_1d, data_1h, trend, rsi, volume_ratio,
                                            patterns, market_structure, smc_analysis):
        """Identifie le type d'opportunité avec les nouvelles analyses"""

        # Vérifier les patterns de retournement
        reversal_patterns = [p for p in patterns if p['type'] == 'reversal']
        continuation_patterns = [p for p in patterns if p['type'] == 'continuation']

        # Break of Structure = Continuation forte
        if market_structure['bos']:
            return "breakout"

        # Change of Character = Retournement potentiel
        if market_structure['choch']:
            return "reversal"

        # Pattern de retournement fort
        if reversal_patterns and reversal_patterns[0].get('strength', 0) >= 80:
            return "reversal"

        # RSI extrême
        if rsi < 30:
            return "reversal"
        elif rsi > 70:
            return "reversal"

        # Continuation
        if continuation_patterns:
            return "continuation"

        # Volume breakout
        if volume_ratio > 2:
            return "breakout"

        # Order Block proche
        if smc_analysis['order_blocks']:
            for ob in smc_analysis['order_blocks']:
                if abs(ob['distance']) < 2:
                    return "retest"

        # Fair Value Gap
        unfilled_fvg = [f for f in smc_analysis['fair_value_gaps'] if not f['filled']]
        if unfilled_fvg:
            return "fvg_fill"

        # Consolidation
        if volume_ratio < 0.7:
            return "squeeze"

        return "continuation"

    def _generate_recommendations_advanced(self, final_score, direction, rsi, volume_ratio,
                                           trend, risk_level, confluence, adx_data,
                                           patterns, market_structure):
        """Génère des recommandations améliorées"""
        recommendations = []

        # ===== SIGNAL PRINCIPAL =====
        if final_score >= 80:
            if direction == "LONG":
                recommendations.append("🟢 SIGNAL FORT D'ACHAT - Confluence élevée, tous les indicateurs alignés")
            elif direction == "SHORT":
                recommendations.append("🔴 SIGNAL FORT DE VENTE - Confluence élevée, pression vendeuse confirmée")
        elif final_score >= 70:
            if direction == "LONG":
                recommendations.append("🟢 Signal d'achat solide - Bonne opportunité avec confirmation")
            elif direction == "SHORT":
                recommendations.append("🔴 Signal de vente solide - Risque de baisse confirmé")
        elif final_score >= 60:
            recommendations.append("⚪ Signal modéré - Attendre des confirmations supplémentaires")
        else:
            recommendations.append("⚠️ Signal faible - Conditions incertaines, rester en observation")

        # ===== CONFLUENCE =====
        if confluence['aligned']:
            recommendations.append(f"✅ CONFLUENCE PARFAITE - Tous timeframes alignés ({confluence['direction']})")
        elif confluence['direction'] != 'neutral':
            recommendations.append(f"📊 Confluence partielle {confluence['direction']} (2/3 timeframes)")

        # ===== STRUCTURE DE MARCHÉ =====
        if market_structure['bos'] == 'bullish':
            recommendations.append("⚡ Break of Structure haussier - Continuation de tendance probable")
        elif market_structure['bos'] == 'bearish':
            recommendations.append("⚡ Break of Structure baissier - Continuation baissière probable")
        elif market_structure['choch'] == 'bullish':
            recommendations.append("🔄 Change of Character haussier - Retournement potentiel à la hausse")
        elif market_structure['choch'] == 'bearish':
            recommendations.append("🔄 Change of Character baissier - Retournement potentiel à la baisse")

        # ===== ADX =====
        if adx_data['adx'] > 25:
            di_direction = "haussière" if adx_data['plus_di'] > adx_data['minus_di'] else "baissière"
            recommendations.append(f"💪 Tendance forte (ADX: {adx_data['adx']:.0f}) - Direction {di_direction}")
        elif adx_data['adx'] < 20:
            recommendations.append("😴 Pas de tendance claire (ADX faible) - Éviter les trades de tendance")

        # ===== PATTERNS =====
        strong_patterns = [p for p in patterns if p.get('strength', 0) >= 75]
        for pattern in strong_patterns[:2]:  # Max 2 patterns
            recommendations.append(f"📐 {pattern['name']} détecté - {pattern['description']}")

        # ===== RSI =====
        if rsi < 30 and direction == "LONG":
            recommendations.append("✅ RSI en survente confirme le potentiel de rebond")
        elif rsi > 70 and direction == "SHORT":
            recommendations.append("✅ RSI en surachat confirme le risque de correction")
        elif rsi < 30 and direction == "SHORT":
            recommendations.append("⚠️ RSI en survente - Prudence sur les ventes")
        elif rsi > 70 and direction == "LONG":
            recommendations.append("⚠️ RSI en surachat - Attendre pullback avant d'acheter")

        # ===== VOLUME =====
        if volume_ratio > 2:
            recommendations.append("🔥 Volume exceptionnel - Mouvement très fiable")
        elif volume_ratio > 1.5:
            recommendations.append("✅ Volume élevé - Confirmation du mouvement")
        elif volume_ratio < 0.7:
            recommendations.append("⚠️ Volume faible - Signal moins fiable")

        # ===== GESTION DU RISQUE =====
        if risk_level == "high":
            recommendations.append("🛑 RISQUE ÉLEVÉ - Position réduite recommandée, stop-loss serré obligatoire")
        elif risk_level == "medium":
            recommendations.append("⚠️ Risque modéré - Stop-loss recommandé à 2-3% du prix d'entrée")
        else:
            recommendations.append("✅ Risque faible - Conditions favorables pour entrée standard")

        return recommendations

    # ===== NOUVELLES MÉTHODES v5.0 =====

    def _analyze_market_regime(self, data):
        """
        Détecte le régime de marché via SMA200
        - BULL: Prix > SMA200 et SMA200 en hausse
        - BEAR: Prix < SMA200 et SMA200 en baisse
        - SIDEWAYS: Prix autour de SMA200 ou SMA200 plate
        """
        regime = {
            'regime': 'SIDEWAYS',
            'strength': 0,
            'sma200': None,
            'distance_pct': 0,
            'sma200_slope': 'flat',
            'description': 'Marché sans direction claire'
        }

        try:
            if data is None or len(data) < 200:
                return regime

            close = data['Close']
            sma200 = close.rolling(window=200).mean()

            if pd.isna(sma200.iloc[-1]):
                return regime

            current_price = close.iloc[-1]
            current_sma200 = sma200.iloc[-1]
            regime['sma200'] = float(current_sma200)

            # Distance au SMA200
            distance_pct = ((current_price - current_sma200) / current_sma200) * 100
            regime['distance_pct'] = round(distance_pct, 2)

            # Pente du SMA200 (sur 20 jours)
            if len(sma200) >= 220:
                sma200_20_days_ago = sma200.iloc[-20]
                if not pd.isna(sma200_20_days_ago):
                    slope_pct = ((current_sma200 - sma200_20_days_ago) / sma200_20_days_ago) * 100
                    if slope_pct > 0.5:
                        regime['sma200_slope'] = 'rising'
                    elif slope_pct < -0.5:
                        regime['sma200_slope'] = 'falling'
                    else:
                        regime['sma200_slope'] = 'flat'

            # Déterminer le régime
            if distance_pct > 5 and regime['sma200_slope'] == 'rising':
                regime['regime'] = 'STRONG_BULL'
                regime['strength'] = 90
                regime['description'] = 'Marché haussier fort - Prix bien au-dessus de SMA200'
            elif distance_pct > 0 and regime['sma200_slope'] in ['rising', 'flat']:
                regime['regime'] = 'BULL'
                regime['strength'] = 70
                regime['description'] = 'Marché haussier - Prix au-dessus de SMA200'
            elif distance_pct < -5 and regime['sma200_slope'] == 'falling':
                regime['regime'] = 'STRONG_BEAR'
                regime['strength'] = 10
                regime['description'] = 'Marché baissier fort - Prix bien en-dessous de SMA200'
            elif distance_pct < 0 and regime['sma200_slope'] in ['falling', 'flat']:
                regime['regime'] = 'BEAR'
                regime['strength'] = 30
                regime['description'] = 'Marché baissier - Prix sous SMA200'
            else:
                regime['regime'] = 'SIDEWAYS'
                regime['strength'] = 50
                regime['description'] = 'Marché latéral - Zone de transition'

        except Exception as e:
            logger.debug(f"Erreur _analyze_market_regime: {e}")

        return regime

    async def _get_vix_context(self):
        """
        Récupère le contexte VIX (indice de volatilité)
        - VIX < 15: Faible volatilité, marché complaisant
        - VIX 15-20: Volatilité normale
        - VIX 20-30: Volatilité élevée, prudence
        - VIX > 30: Volatilité extrême, panique potentielle
        """
        vix_context = {
            'available': False,
            'vix': None,
            'level': 'normal',
            'interpretation': 'Données VIX non disponibles',
            'trading_impact': 'neutral'
        }

        try:
            vix_data = yf.Ticker("^VIX").history(period="5d", interval="1d")

            if vix_data.empty:
                return vix_context

            current_vix = vix_data['Close'].iloc[-1]
            if pd.isna(current_vix):
                return vix_context

            vix_context['available'] = True
            vix_context['vix'] = round(float(current_vix), 2)

            # Variation VIX
            if len(vix_data) >= 2:
                prev_vix = vix_data['Close'].iloc[-2]
                vix_change = ((current_vix - prev_vix) / prev_vix) * 100
                vix_context['change'] = round(vix_change, 2)

            # Interprétation
            if current_vix < 15:
                vix_context['level'] = 'very_low'
                vix_context['interpretation'] = 'VIX très bas - Marché complaisant, possibles corrections'
                vix_context['trading_impact'] = 'caution_bull'
            elif current_vix < 20:
                vix_context['level'] = 'normal'
                vix_context['interpretation'] = 'VIX normal - Conditions de trading standards'
                vix_context['trading_impact'] = 'neutral'
            elif current_vix < 25:
                vix_context['level'] = 'elevated'
                vix_context['interpretation'] = 'VIX élevé - Volatilité accrue, positions réduites'
                vix_context['trading_impact'] = 'reduce_size'
            elif current_vix < 30:
                vix_context['level'] = 'high'
                vix_context['interpretation'] = 'VIX haut - Forte volatilité, prudence maximale'
                vix_context['trading_impact'] = 'caution'
            else:
                vix_context['level'] = 'extreme'
                vix_context['interpretation'] = 'VIX extrême - Panique marché, opportunités contrariantes'
                vix_context['trading_impact'] = 'extreme_caution'

        except Exception as e:
            logger.debug(f"Erreur _get_vix_context: {e}")

        return vix_context

    async def _get_relative_strength(self, symbol, market, data):
        """
        Calcule la force relative de l'actif vs son indice de référence
        """
        rs_data = {
            'available': False,
            'rs_ratio': 1.0,
            'outperforming': False,
            'description': 'Force relative non disponible'
        }

        try:
            # Déterminer l'indice de référence
            index_map = {
                'USA': '^GSPC',
                'EUROPE': '^STOXX50E',
                'ASIA': '^N225',
                'CRYPTO': 'BTC-USD',
                'FOREX': 'EURUSD=X'
            }

            index_symbol = index_map.get(market)
            if not index_symbol or symbol == index_symbol:
                return rs_data

            # Récupérer les données de l'indice
            index_data = yf.Ticker(index_symbol).history(period="1mo", interval="1d")

            if index_data.empty or len(index_data) < 20 or len(data) < 20:
                return rs_data

            # Utiliser l'algorithme avancé pour calculer la force relative
            rs_result = advanced_algo.calculate_relative_strength(data, index_data, lookback=20)

            rs_data['available'] = True
            rs_data['rs_ratio'] = rs_result['rs_ratio']
            rs_data['outperforming'] = rs_result['outperforming']
            rs_data['rs_momentum'] = rs_result['rs_momentum']
            rs_data['trend'] = rs_result['trend']

            # Description
            if rs_result['trend'] == 'strong_outperform':
                rs_data['description'] = f"Surperformance forte vs {index_symbol} (RS: {rs_result['rs_ratio']:.2f})"
            elif rs_result['trend'] == 'outperform':
                rs_data['description'] = f"Surperformance vs {index_symbol} (RS: {rs_result['rs_ratio']:.2f})"
            elif rs_result['trend'] == 'strong_underperform':
                rs_data['description'] = f"Sous-performance forte vs {index_symbol} (RS: {rs_result['rs_ratio']:.2f})"
            elif rs_result['trend'] == 'underperform':
                rs_data['description'] = f"Sous-performance vs {index_symbol} (RS: {rs_result['rs_ratio']:.2f})"
            else:
                rs_data['description'] = f"Performance neutre vs {index_symbol} (RS: {rs_result['rs_ratio']:.2f})"

        except Exception as e:
            logger.debug(f"Erreur _get_relative_strength: {e}")

        return rs_data

    def _analyze_technical(self, data_1d, data_1h, data_15m):
        """Analyse technique multi-timeframe"""
        score = 0.5  # Neutre par défaut

        try:
            if data_1d is None or len(data_1d) < 20:
                return score

            # Tendance long terme (1D)
            ema_20 = data_1d['Close'].ewm(span=20).mean()
            ema_50 = data_1d['Close'].ewm(span=50).mean()
            ema_200 = data_1d['Close'].ewm(span=200).mean() if len(data_1d) >= 200 else None

            current_price = data_1d['Close'].iloc[-1]

            # Golden Cross / Death Cross
            if len(ema_50) > 0 and len(ema_20) > 0:
                if ema_20.iloc[-1] > ema_50.iloc[-1]:
                    score += 0.1
                else:
                    score -= 0.1

            # Prix au-dessus/en-dessous EMA 200
            if ema_200 is not None and len(ema_200) > 0:
                if current_price > ema_200.iloc[-1]:
                    score += 0.15
                else:
                    score -= 0.15

            # Structure de marché (Higher Highs / Lower Lows)
            recent_highs = data_1d['High'].tail(10)
            recent_lows = data_1d['Low'].tail(10)

            if len(recent_highs) >= 6 and len(recent_lows) >= 6:
                if recent_highs.iloc[-1] > recent_highs.iloc[-6]:  # Higher High
                    score += 0.1
                if recent_lows.iloc[-1] > recent_lows.iloc[-6]:  # Higher Low
                    score += 0.1

            # MACD
            macd_line, signal_line = self._calculate_macd(data_1d)
            if len(macd_line) > 0 and len(signal_line) > 0:
                if macd_line.iloc[-1] > signal_line.iloc[-1]:
                    score += 0.1
                else:
                    score -= 0.1

            # Bollinger Bands
            bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(data_1d)
            if len(bb_middle) > 0:
                if current_price > bb_middle.iloc[-1]:
                    score += 0.05
                else:
                    score -= 0.05

        except Exception as e:
            logger.debug(f"Erreur dans _analyze_technical: {e}")
            return 0.5

        # Limiter entre 0 et 1
        return max(0, min(1, score))

    def _analyze_volume(self, data_1d, data_1h):
        """Analyse du volume"""
        score = 0.5

        try:
            if data_1d is None or len(data_1d) < 20:
                return score

            # Volume moyen
            avg_volume_20 = data_1d['Volume'].rolling(20).mean()
            current_volume = data_1d['Volume'].iloc[-1]

            if len(avg_volume_20) > 0 and not pd.isna(avg_volume_20.iloc[-1]) and avg_volume_20.iloc[-1] > 0:
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
            if len(obv) > 0 and len(obv_ma) > 0 and not pd.isna(obv_ma.iloc[-1]):
                if obv.iloc[-1] > obv_ma.iloc[-1]:
                    score += 0.1

        except Exception as e:
            logger.debug(f"Erreur dans _analyze_volume: {e}")
            return 0.5

        return max(0, min(1, score))

    def _analyze_momentum(self, data_1d, data_1h):
        """Analyse du momentum"""
        score = 0.5

        try:
            if data_1d is None or len(data_1d) < 15:
                return score

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
            if len(data_1d) >= 11 and data_1d['Close'].iloc[-10] > 0:
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

        except Exception as e:
            logger.debug(f"Erreur dans _analyze_momentum: {e}")
            return 0.5

        return max(0, min(1, score))

    def _analyze_volatility(self, data_1d):
        """Analyse de la volatilité"""
        score = 0.5

        try:
            if data_1d is None or len(data_1d) < 20:
                return score

            # ATR
            atr = self._calculate_atr(data_1d)
            price = data_1d['Close'].iloc[-1]
            if price > 0:
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
            if len(bb_middle) > 0 and bb_middle.iloc[-1] > 0:
                bb_width = (bb_upper.iloc[-1] - bb_lower.iloc[-1]) / bb_middle.iloc[-1]

                if 0.05 < bb_width < 0.15:
                    score += 0.1

        except Exception as e:
            logger.debug(f"Erreur dans _analyze_volatility: {e}")
            return 0.5

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

        except Exception as e:
            logger.debug(f"Impossible d'analyser contexte marché {market}: {e}")

        return max(0, min(1, score))

    # ===== INDICATEURS TECHNIQUES =====

    def _calculate_rsi(self, data, period=14):
        """Calcule le RSI"""
        try:
            if len(data) < period + 1:
                return 50  # Valeur neutre par défaut
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            result = rsi.iloc[-1]
            return result if not pd.isna(result) else 50
        except Exception:
            return 50

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
        try:
            if len(data) < period + 1:
                return 0
            high_low = data['High'] - data['Low']
            high_close = np.abs(data['High'] - data['Close'].shift())
            low_close = np.abs(data['Low'] - data['Close'].shift())
            ranges = pd.concat([high_low, high_close, low_close], axis=1)
            true_range = np.max(ranges, axis=1)
            atr = true_range.rolling(period).mean()
            result = atr.iloc[-1]
            return result if not pd.isna(result) else 0
        except Exception:
            return 0

    def _calculate_obv(self, data):
        """Calcule l'OBV (On Balance Volume)"""
        obv = (np.sign(data['Close'].diff()) * data['Volume']).fillna(0).cumsum()
        return obv

    def _find_support_resistance(self, data, lookback=20):
        """Trouve les niveaux de support et resistance"""
        recent_data = data.tail(lookback)
        support = recent_data['Low'].min()
        resistance = recent_data['High'].max()
        return support, resistance

    def _calculate_fibonacci_levels(self, data, lookback=50):
        """Calcule les niveaux de Fibonacci retracement"""
        recent = data.tail(lookback)
        high = recent['High'].max()
        low = recent['Low'].min()
        diff = high - low

        # Niveaux de Fibonacci standard
        levels = {
            '0.0': high,
            '0.236': high - (diff * 0.236),
            '0.382': high - (diff * 0.382),
            '0.5': high - (diff * 0.5),
            '0.618': high - (diff * 0.618),
            '0.786': high - (diff * 0.786),
            '1.0': low
        }
        return levels

    def _detect_reversal_signals(self, data, rsi_period=14):
        """Detecte les signaux de retournement"""
        signals = []

        try:
            # Vérification de données suffisantes
            if len(data) < 10:
                return signals

            # RSI Divergence
            rsi_series = self._calculate_rsi_series(data, rsi_period)
            if len(rsi_series) >= 10 and len(data) >= 6:
                # Vérifier que les indices existent
                rsi_current = rsi_series.iloc[-1] if not pd.isna(rsi_series.iloc[-1]) else None
                rsi_past = rsi_series.iloc[-5] if not pd.isna(rsi_series.iloc[-5]) else None

                if rsi_current is not None and rsi_past is not None:
                    # Divergence haussiere: prix fait lower low mais RSI fait higher low
                    price_ll = data['Close'].iloc[-1] < data['Close'].iloc[-5]
                    rsi_hl = rsi_current > rsi_past
                    if price_ll and rsi_hl and rsi_current < 40:
                        signals.append({
                            'type': 'bullish_divergence',
                            'strength': 'strong',
                            'description': 'Divergence haussiere RSI - Signal de retournement a la hausse'
                        })

                    # Divergence baissiere: prix fait higher high mais RSI fait lower high
                    price_hh = data['Close'].iloc[-1] > data['Close'].iloc[-5]
                    rsi_lh = rsi_current < rsi_past
                    if price_hh and rsi_lh and rsi_current > 60:
                        signals.append({
                            'type': 'bearish_divergence',
                            'strength': 'strong',
                            'description': 'Divergence baissiere RSI - Signal de retournement a la baisse'
                        })

            # Double Bottom / Double Top patterns (simplifie)
            lows = data['Low'].tail(20)
            highs = data['High'].tail(20)

            # Double bottom detection
            min_idx = lows.idxmin()
            min_val = lows.min()
            second_min = lows.drop(min_idx).min() if len(lows) > 1 else min_val
            if min_val != 0 and abs(min_val - second_min) / abs(min_val) < 0.02:  # 2% tolerance
                signals.append({
                    'type': 'double_bottom',
                    'strength': 'moderate',
                    'description': 'Formation Double Bottom - Potentiel retournement haussier'
                })

            # Double top detection
            max_idx = highs.idxmax()
            max_val = highs.max()
            second_max = highs.drop(max_idx).max() if len(highs) > 1 else max_val
            if max_val != 0 and abs(max_val - second_max) / abs(max_val) < 0.02:
                signals.append({
                    'type': 'double_top',
                    'strength': 'moderate',
                    'description': 'Formation Double Top - Potentiel retournement baissier'
                })

            # Hammer / Shooting Star candles
            last_candle = data.iloc[-1]
            body = abs(last_candle['Close'] - last_candle['Open'])
            total_range = last_candle['High'] - last_candle['Low']

            if total_range > 0:
                lower_wick = min(last_candle['Open'], last_candle['Close']) - last_candle['Low']
                upper_wick = last_candle['High'] - max(last_candle['Open'], last_candle['Close'])

                # Hammer (bougie marteau - signal haussier)
                if lower_wick > body * 2 and upper_wick < body * 0.5:
                    signals.append({
                        'type': 'hammer',
                        'strength': 'moderate',
                        'description': 'Bougie Marteau - Signal de rebond potentiel'
                    })

                # Shooting Star (signal baissier)
                if upper_wick > body * 2 and lower_wick < body * 0.5:
                    signals.append({
                        'type': 'shooting_star',
                        'strength': 'moderate',
                        'description': 'Etoile Filante - Signal de correction potentielle'
                    })

        except Exception as e:
            logger.debug(f"Erreur dans _detect_reversal_signals: {e}")

        return signals

    def _calculate_rsi_series(self, data, period=14):
        """Retourne la serie RSI complete"""
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    # ===== NOUVEAUX INDICATEURS AVANCÉS =====

    def _calculate_adx(self, data, period=14):
        """
        Calcule l'ADX (Average Directional Index) pour mesurer la force de la tendance
        ADX > 25 = tendance forte, ADX < 20 = pas de tendance
        """
        try:
            if len(data) < period * 2:
                return {'adx': 0, 'plus_di': 0, 'minus_di': 0}

            high = data['High']
            low = data['Low']
            close = data['Close']

            # +DM et -DM
            plus_dm = high.diff()
            minus_dm = low.diff().abs() * -1

            plus_dm = plus_dm.where((plus_dm > minus_dm.abs()) & (plus_dm > 0), 0)
            minus_dm = minus_dm.abs().where((minus_dm.abs() > plus_dm) & (minus_dm < 0), 0)

            # True Range
            tr1 = high - low
            tr2 = (high - close.shift()).abs()
            tr3 = (low - close.shift()).abs()
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

            # Smoothed values
            atr = tr.rolling(window=period).mean()
            plus_di = 100 * (plus_dm.rolling(window=period).mean() / atr)
            minus_di = 100 * (minus_dm.rolling(window=period).mean() / atr)

            # DX et ADX
            dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di + 0.0001))
            adx = dx.rolling(window=period).mean()

            return {
                'adx': adx.iloc[-1] if not np.isnan(adx.iloc[-1]) else 0,
                'plus_di': plus_di.iloc[-1] if not np.isnan(plus_di.iloc[-1]) else 0,
                'minus_di': minus_di.iloc[-1] if not np.isnan(minus_di.iloc[-1]) else 0
            }
        except Exception as e:
            logger.debug(f"Erreur calcul ADX: {e}")
            return {'adx': 0, 'plus_di': 0, 'minus_di': 0}

    def _calculate_vwap(self, data):
        """
        Calcule le VWAP (Volume Weighted Average Price)
        Prix au-dessus du VWAP = bullish, en-dessous = bearish
        """
        try:
            if len(data) < 1:
                return 0
            typical_price = (data['High'] + data['Low'] + data['Close']) / 3
            vwap = (typical_price * data['Volume']).cumsum() / data['Volume'].cumsum()
            result = vwap.iloc[-1]
            if pd.isna(result):
                return data['Close'].iloc[-1] if len(data) > 0 and not pd.isna(data['Close'].iloc[-1]) else 0
            return result
        except Exception:
            try:
                return data['Close'].iloc[-1] if len(data) > 0 else 0
            except Exception:
                return 0

    def _detect_candlestick_patterns(self, data):
        """
        Détecte les patterns de chandeliers japonais avancés
        """
        patterns = []

        try:
            if len(data) < 3:
                return patterns

            # Dernières bougies
            c0 = data.iloc[-1]  # Bougie actuelle
            c1 = data.iloc[-2]  # Bougie précédente
            c2 = data.iloc[-3]  # Avant-dernière

            # Calculs de base
            body0 = abs(c0['Close'] - c0['Open'])
            body1 = abs(c1['Close'] - c1['Open'])
            range0 = c0['High'] - c0['Low']
            range1 = c1['High'] - c1['Low']

            is_bullish0 = c0['Close'] > c0['Open']
            is_bullish1 = c1['Close'] > c1['Open']

            # 1. ENGULFING BULLISH - Signal fort de retournement haussier
            if (not is_bullish1 and is_bullish0 and
                c0['Open'] <= c1['Close'] and c0['Close'] >= c1['Open'] and
                body0 > body1 * 1.1):
                patterns.append({
                    'name': 'Bullish Engulfing',
                    'type': 'reversal',
                    'direction': 'bullish',
                    'strength': 85,
                    'description': 'Avalement haussier - Fort signal de retournement à la hausse'
                })

            # 2. ENGULFING BEARISH - Signal fort de retournement baissier
            if (is_bullish1 and not is_bullish0 and
                c0['Open'] >= c1['Close'] and c0['Close'] <= c1['Open'] and
                body0 > body1 * 1.1):
                patterns.append({
                    'name': 'Bearish Engulfing',
                    'type': 'reversal',
                    'direction': 'bearish',
                    'strength': 85,
                    'description': 'Avalement baissier - Fort signal de retournement à la baisse'
                })

            # 3. DOJI - Indécision du marché
            if range0 > 0 and body0 / range0 < 0.1:
                patterns.append({
                    'name': 'Doji',
                    'type': 'indecision',
                    'direction': 'neutral',
                    'strength': 50,
                    'description': 'Doji - Indécision, attendre confirmation'
                })

            # 4. MORNING STAR - Retournement haussier (3 bougies)
            if len(data) >= 3:
                body2 = abs(c2['Close'] - c2['Open'])
                is_bullish2 = c2['Close'] > c2['Open']

                if (not is_bullish2 and body2 > range0 * 0.5 and  # Grande bougie baissière
                    body1 < body2 * 0.3 and  # Petite bougie centrale
                    is_bullish0 and body0 > body2 * 0.5):  # Grande bougie haussière
                    patterns.append({
                        'name': 'Morning Star',
                        'type': 'reversal',
                        'direction': 'bullish',
                        'strength': 90,
                        'description': 'Étoile du matin - Signal de retournement haussier majeur'
                    })

            # 5. EVENING STAR - Retournement baissier (3 bougies)
            if len(data) >= 3:
                body2 = abs(c2['Close'] - c2['Open'])
                is_bullish2 = c2['Close'] > c2['Open']

                if (is_bullish2 and body2 > range0 * 0.5 and
                    body1 < body2 * 0.3 and
                    not is_bullish0 and body0 > body2 * 0.5):
                    patterns.append({
                        'name': 'Evening Star',
                        'type': 'reversal',
                        'direction': 'bearish',
                        'strength': 90,
                        'description': 'Étoile du soir - Signal de retournement baissier majeur'
                    })

            # 6. THREE WHITE SOLDIERS - Forte continuation haussière
            if len(data) >= 3:
                all_bullish = all(data.iloc[i]['Close'] > data.iloc[i]['Open'] for i in [-3, -2, -1])
                higher_closes = data['Close'].iloc[-3] < data['Close'].iloc[-2] < data['Close'].iloc[-1]
                if all_bullish and higher_closes:
                    patterns.append({
                        'name': 'Three White Soldiers',
                        'type': 'continuation',
                        'direction': 'bullish',
                        'strength': 80,
                        'description': 'Trois soldats blancs - Forte pression acheteuse'
                    })

            # 7. THREE BLACK CROWS - Forte continuation baissière
            if len(data) >= 3:
                all_bearish = all(data.iloc[i]['Close'] < data.iloc[i]['Open'] for i in [-3, -2, -1])
                lower_closes = data['Close'].iloc[-3] > data['Close'].iloc[-2] > data['Close'].iloc[-1]
                if all_bearish and lower_closes:
                    patterns.append({
                        'name': 'Three Black Crows',
                        'type': 'continuation',
                        'direction': 'bearish',
                        'strength': 80,
                        'description': 'Trois corbeaux noirs - Forte pression vendeuse'
                    })

        except Exception as e:
            logger.debug(f"Erreur dans _detect_candlestick_patterns: {e}")

        return patterns

    def _detect_chart_patterns(self, data, lookback=50):
        """
        Détecte les patterns chartistes (Head & Shoulders, Triangles, etc.)
        """
        patterns = []

        if len(data) < lookback:
            return patterns

        recent = data.tail(lookback)
        highs = recent['High'].values
        lows = recent['Low'].values
        closes = recent['Close'].values

        # Trouver les pivots
        pivot_highs = []
        pivot_lows = []

        for i in range(2, len(highs) - 2):
            if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                pivot_highs.append((i, highs[i]))
            if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                pivot_lows.append((i, lows[i]))

        # 1. HEAD AND SHOULDERS (besoin de 3 pivots hauts)
        if len(pivot_highs) >= 3:
            last_three = pivot_highs[-3:]
            left_shoulder = last_three[0][1]
            head = last_three[1][1]
            right_shoulder = last_three[2][1]

            # Head doit être plus haut que les épaules
            if head > left_shoulder and head > right_shoulder:
                # Épaules à peu près au même niveau (tolérance 5%)
                shoulder_diff = abs(left_shoulder - right_shoulder) / left_shoulder
                if shoulder_diff < 0.05:
                    patterns.append({
                        'name': 'Head and Shoulders',
                        'type': 'reversal',
                        'direction': 'bearish',
                        'strength': 85,
                        'description': 'Tête et Épaules - Signal de retournement baissier majeur'
                    })

        # 2. INVERSE HEAD AND SHOULDERS (besoin de 3 pivots bas)
        if len(pivot_lows) >= 3:
            last_three = pivot_lows[-3:]
            left_shoulder = last_three[0][1]
            head = last_three[1][1]
            right_shoulder = last_three[2][1]

            if head < left_shoulder and head < right_shoulder:
                shoulder_diff = abs(left_shoulder - right_shoulder) / left_shoulder
                if shoulder_diff < 0.05:
                    patterns.append({
                        'name': 'Inverse Head and Shoulders',
                        'type': 'reversal',
                        'direction': 'bullish',
                        'strength': 85,
                        'description': 'Tête et Épaules Inversé - Signal de retournement haussier majeur'
                    })

        # 3. TRIANGLE ASCENDANT (résistance horizontale, supports ascendants)
        if len(pivot_highs) >= 2 and len(pivot_lows) >= 2:
            high_diff = abs(pivot_highs[-1][1] - pivot_highs[-2][1]) / pivot_highs[-2][1]
            low_trend = pivot_lows[-1][1] > pivot_lows[-2][1]

            if high_diff < 0.02 and low_trend:  # Résistance plate, supports montants
                patterns.append({
                    'name': 'Ascending Triangle',
                    'type': 'continuation',
                    'direction': 'bullish',
                    'strength': 75,
                    'description': 'Triangle Ascendant - Breakout haussier probable'
                })

        # 4. TRIANGLE DESCENDANT
        if len(pivot_highs) >= 2 and len(pivot_lows) >= 2:
            low_diff = abs(pivot_lows[-1][1] - pivot_lows[-2][1]) / pivot_lows[-2][1]
            high_trend = pivot_highs[-1][1] < pivot_highs[-2][1]

            if low_diff < 0.02 and high_trend:
                patterns.append({
                    'name': 'Descending Triangle',
                    'type': 'continuation',
                    'direction': 'bearish',
                    'strength': 75,
                    'description': 'Triangle Descendant - Breakdown baissier probable'
                })

        # 5. BULL FLAG / BEAR FLAG
        recent_10 = data.tail(10)
        recent_30 = data.tail(30)

        # Bull Flag: forte hausse puis consolidation
        initial_move = (recent_30['Close'].iloc[10] - recent_30['Close'].iloc[0]) / recent_30['Close'].iloc[0]
        consolidation_range = (recent_10['High'].max() - recent_10['Low'].min()) / recent_10['Close'].mean()

        if initial_move > 0.05 and consolidation_range < 0.03:
            patterns.append({
                'name': 'Bull Flag',
                'type': 'continuation',
                'direction': 'bullish',
                'strength': 70,
                'description': 'Drapeau Haussier - Continuation probable après consolidation'
            })

        if initial_move < -0.05 and consolidation_range < 0.03:
            patterns.append({
                'name': 'Bear Flag',
                'type': 'continuation',
                'direction': 'bearish',
                'strength': 70,
                'description': 'Drapeau Baissier - Continuation baissière probable'
            })

        return patterns

    def _analyze_smart_money(self, data):
        """
        Analyse Smart Money Concepts:
        - Order Blocks (zones d'accumulation institutionnelle)
        - Fair Value Gaps (déséquilibres de prix)
        - Liquidity Zones (zones de liquidité)
        """
        smc_analysis = {
            'order_blocks': [],
            'fair_value_gaps': [],
            'liquidity_zones': [],
            'score': 0.5
        }

        try:
            if len(data) < 20:
                return smc_analysis

            current_price = data['Close'].iloc[-1]
            if pd.isna(current_price) or current_price <= 0:
                return smc_analysis

            # 1. DÉTECTION DES ORDER BLOCKS (étendu à 50 bougies)
            # Order Block = dernière bougie opposée avant un fort mouvement
            lookback_ob = min(50, len(data) - 3)  # Étendu de 10 à 50 pour détecter plus de zones
            for i in range(len(data) - lookback_ob, len(data) - 2):
                if i < 1:
                    continue

                candle = data.iloc[i]
                next_candles = data.iloc[i+1:i+4]

                is_bullish_candle = candle['Close'] > candle['Open']
                is_bearish_candle = candle['Close'] < candle['Open']

                # Mouvement après la bougie
                if len(next_candles) >= 3:
                    move = (next_candles['Close'].iloc[-1] - candle['Close']) / candle['Close']

                    # Bullish Order Block: bougie baissière suivie d'un fort mouvement haussier
                    if is_bearish_candle and move > 0.02:
                        smc_analysis['order_blocks'].append({
                            'type': 'bullish',
                            'high': candle['High'],
                            'low': candle['Low'],
                            'distance': ((current_price - candle['High']) / candle['High']) * 100
                        })

                    # Bearish Order Block
                    if is_bullish_candle and move < -0.02:
                        smc_analysis['order_blocks'].append({
                            'type': 'bearish',
                            'high': candle['High'],
                            'low': candle['Low'],
                            'distance': ((candle['Low'] - current_price) / current_price) * 100
                        })

            # 2. DÉTECTION DES FAIR VALUE GAPS (FVG)
            for i in range(2, len(data)):
                c0 = data.iloc[i]
                c2 = data.iloc[i-2]

                # Bullish FVG: gap entre le high de c2 et le low de c0
                if c0['Low'] > c2['High'] and c2['High'] > 0:
                    gap_size = ((c0['Low'] - c2['High']) / c2['High']) * 100
                    if gap_size > 0.1:
                        smc_analysis['fair_value_gaps'].append({
                            'type': 'bullish',
                            'top': c0['Low'],
                            'bottom': c2['High'],
                            'filled': current_price <= c0['Low']
                        })

                # Bearish FVG
                if c0['High'] < c2['Low'] and c0['High'] > 0:
                    gap_size = ((c2['Low'] - c0['High']) / c0['High']) * 100
                    if gap_size > 0.1:
                        smc_analysis['fair_value_gaps'].append({
                            'type': 'bearish',
                            'top': c2['Low'],
                            'bottom': c0['High'],
                            'filled': current_price >= c0['High']
                        })

            # 3. ZONES DE LIQUIDITÉ (swing highs/lows récents)
            highs = data['High'].tail(20)
            lows = data['Low'].tail(20)

            # Liquidité au-dessus (stop losses des shorts)
            recent_high = highs.max()
            if current_price > 0:
                smc_analysis['liquidity_zones'].append({
                    'type': 'buy_side',
                    'level': recent_high,
                    'distance': ((recent_high - current_price) / current_price) * 100
                })

            # Liquidité en-dessous (stop losses des longs)
            recent_low = lows.min()
            if recent_low > 0:
                smc_analysis['liquidity_zones'].append({
                    'type': 'sell_side',
                    'level': recent_low,
                    'distance': ((current_price - recent_low) / recent_low) * 100
                })

            # Calcul du score SMC
            score = 0.5

            # Bonus si prix proche d'un Order Block bullish
            for ob in smc_analysis['order_blocks']:
                if ob['type'] == 'bullish' and -2 < ob['distance'] < 2:
                    score += 0.2
                elif ob['type'] == 'bearish' and -2 < ob['distance'] < 2:
                    score -= 0.2

            # Bonus si FVG non rempli proche
            unfilled_fvg = [fvg for fvg in smc_analysis['fair_value_gaps'] if not fvg['filled']]
            if unfilled_fvg:
                score += 0.1

            smc_analysis['score'] = max(0, min(1, score))

        except Exception as e:
            logger.debug(f"Erreur dans _analyze_smart_money: {e}")

        return smc_analysis

    def _analyze_market_structure(self, data):
        """
        Analyse la structure de marché:
        - Break of Structure (BOS)
        - Change of Character (CHoCH)
        - Higher Highs / Lower Lows
        """
        structure = {
            'trend': 'neutral',
            'bos': None,
            'choch': None,
            'hh_hl': False,
            'll_lh': False,
            'score': 0.5
        }

        try:
            if len(data) < 20:
                return structure

            highs = data['High'].tail(20).values
            lows = data['Low'].tail(20).values

            # Trouver les swing points
            swing_highs = []
            swing_lows = []

            for i in range(2, len(highs) - 2):
                if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                    swing_highs.append(highs[i])
                if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                    swing_lows.append(lows[i])

            if len(swing_highs) >= 2 and len(swing_lows) >= 2:
                # Higher Highs + Higher Lows = Uptrend
                hh = swing_highs[-1] > swing_highs[-2]
                hl = swing_lows[-1] > swing_lows[-2]

                # Lower Lows + Lower Highs = Downtrend
                ll = swing_lows[-1] < swing_lows[-2]
                lh = swing_highs[-1] < swing_highs[-2]

                if hh and hl:
                    structure['trend'] = 'bullish'
                    structure['hh_hl'] = True
                    structure['score'] = 0.7
                elif ll and lh:
                    structure['trend'] = 'bearish'
                    structure['ll_lh'] = True
                    structure['score'] = 0.3

                # Break of Structure (BOS) - Continuation
                current_price = data['Close'].iloc[-1]
                if pd.isna(current_price):
                    return structure

                if structure['trend'] == 'bullish' and current_price > swing_highs[-1]:
                    structure['bos'] = 'bullish'
                    structure['score'] = 0.8
                elif structure['trend'] == 'bearish' and current_price < swing_lows[-1]:
                    structure['bos'] = 'bearish'
                    structure['score'] = 0.2

                # Change of Character (CHoCH) - Reversal potentiel
                if structure['trend'] == 'bullish' and current_price < swing_lows[-1]:
                    structure['choch'] = 'bearish'
                    structure['score'] = 0.3
                elif structure['trend'] == 'bearish' and current_price > swing_highs[-1]:
                    structure['choch'] = 'bullish'
                    structure['score'] = 0.7

        except Exception as e:
            logger.debug(f"Erreur dans _analyze_market_structure: {e}")

        return structure

    def _analyze_multi_timeframe_confluence(self, data_1d, data_1h, data_15m):
        """
        Analyse la confluence multi-timeframe
        Score élevé si tous les timeframes sont alignés
        """
        confluence = {
            'aligned': False,
            'direction': 'neutral',
            'strength': 0,
            'details': {}
        }

        def get_tf_bias(data):
            """Détermine le biais d'un timeframe"""
            try:
                if data is None or len(data) < 20:
                    return 'neutral', 0.5

                ema_20 = data['Close'].ewm(span=20).mean().iloc[-1]
                ema_50 = data['Close'].ewm(span=50).mean().iloc[-1]
                current = data['Close'].iloc[-1]

                if pd.isna(ema_20) or pd.isna(ema_50) or pd.isna(current):
                    return 'neutral', 0.5

                rsi = self._calculate_rsi(data)
                if pd.isna(rsi):
                    rsi = 50

                if current > ema_20 > ema_50 and rsi > 50:
                    return 'bullish', 0.7 + (rsi - 50) / 100
                elif current < ema_20 < ema_50 and rsi < 50:
                    return 'bearish', 0.3 - (50 - rsi) / 100
                else:
                    return 'neutral', 0.5
            except Exception:
                return 'neutral', 0.5

        # Analyser chaque timeframe
        tf_1d_bias, tf_1d_score = get_tf_bias(data_1d)
        tf_1h_bias, tf_1h_score = get_tf_bias(data_1h) if len(data_1h) > 0 else ('neutral', 0.5)
        tf_15m_bias, tf_15m_score = get_tf_bias(data_15m) if len(data_15m) > 0 else ('neutral', 0.5)

        confluence['details'] = {
            '1D': tf_1d_bias,
            '1H': tf_1h_bias,
            '15m': tf_15m_bias
        }

        # Vérifier l'alignement
        biases = [tf_1d_bias, tf_1h_bias, tf_15m_bias]

        if all(b == 'bullish' for b in biases):
            confluence['aligned'] = True
            confluence['direction'] = 'bullish'
            confluence['strength'] = 0.9
        elif all(b == 'bearish' for b in biases):
            confluence['aligned'] = True
            confluence['direction'] = 'bearish'
            confluence['strength'] = 0.9
        elif biases.count('bullish') >= 2:
            confluence['direction'] = 'bullish'
            confluence['strength'] = 0.7
        elif biases.count('bearish') >= 2:
            confluence['direction'] = 'bearish'
            confluence['strength'] = 0.7
        else:
            confluence['strength'] = 0.5

        return confluence

    def _analyze_patterns(self, data):
        """
        Score combiné des patterns détectés
        """
        candle_patterns = self._detect_candlestick_patterns(data)
        chart_patterns = self._detect_chart_patterns(data)

        all_patterns = candle_patterns + chart_patterns

        if not all_patterns:
            return 0.5, []

        # Calculer le score basé sur les patterns
        bullish_strength = sum(p['strength'] for p in all_patterns if p['direction'] == 'bullish')
        bearish_strength = sum(p['strength'] for p in all_patterns if p['direction'] == 'bearish')

        if bullish_strength > bearish_strength:
            score = 0.5 + min(0.4, bullish_strength / 200)
        elif bearish_strength > bullish_strength:
            score = 0.5 - min(0.4, bearish_strength / 200)
        else:
            score = 0.5

        return score, all_patterns

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
        try:
            if len(data) < 50:
                return "neutral"

            ema_20 = data['Close'].ewm(span=20).mean()
            ema_50 = data['Close'].ewm(span=50).mean()

            if len(ema_20) == 0 or len(ema_50) == 0:
                return "neutral"

            ema_20_val = ema_20.iloc[-1]
            ema_50_val = ema_50.iloc[-1]
            close_val = data['Close'].iloc[-1]

            if pd.isna(ema_20_val) or pd.isna(ema_50_val) or pd.isna(close_val):
                return "neutral"

            if ema_20_val > ema_50_val and close_val > ema_20_val:
                return "bullish"
            elif ema_20_val < ema_50_val and close_val < ema_20_val:
                return "bearish"
            else:
                return "neutral"
        except Exception as e:
            logger.debug(f"Erreur dans _determine_trend: {e}")
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
            logger.warning(f"Erreur analyse news: {e}")
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
            logger.warning(f"Erreur get_news_summary: {e}")
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

    async def generate_ai_market_summary(self, market_code, analyses, event_type='close'):
        """
        Genere un resume IA des performances du marche

        Args:
            market_code: Code du marche (USA, EUROPE, ASIA)
            analyses: Liste des analyses d'actifs
            event_type: 'open' ou 'close'

        Returns:
            str: Resume formate pour Telegram
        """
        try:
            from groq import Groq
            client = Groq(api_key=config.GROQ_API_KEY)

            # Preparer les donnees pour l'IA
            top_performers = sorted(analyses, key=lambda x: x.get('price_change_1d', 0), reverse=True)[:3]
            worst_performers = sorted(analyses, key=lambda x: x.get('price_change_1d', 0))[:3]
            opportunities = sorted(analyses, key=lambda x: x.get('score', 0), reverse=True)[:3]

            # Construire le contexte
            def fmt_sym(a):
                name = get_asset_display_name(a['symbol'])
                return f"{a['symbol']} ({name})" if name != a['symbol'] else a['symbol']

            context = f"""Marche: {market_code}
Event: {'Fermeture' if event_type == 'close' else 'Ouverture'}

Top performers:
{chr(10).join([f"- {fmt_sym(a)}: {a.get('price_change_1d', 0):+.2f}% (score: {a.get('score', 0)})" for a in top_performers])}

Worst performers:
{chr(10).join([f"- {fmt_sym(a)}: {a.get('price_change_1d', 0):+.2f}% (score: {a.get('score', 0)})" for a in worst_performers])}

Meilleures opportunites (par score):
{chr(10).join([f"- {fmt_sym(a)}: score {a.get('score', 0)}/100, direction {a.get('direction', 'N/A')}, RSI {a.get('rsi', 0):.0f}" for a in opportunities])}
"""

            if event_type == 'open':
                prompt = f"""En tant qu'analyste trading, donne un bref apercu (100-150 mots max) pour l'ouverture du marche {market_code}.

{context}

Format de reponse (sans markdown ** ni #):
1. Contexte general du marche (1-2 phrases)
2. 2-3 opportunites a surveiller avec justification courte
3. Points de vigilance

Reste factuel et concis. Utilise des emojis pour la lisibilite."""
            else:
                prompt = f"""En tant qu'analyste trading, fais un bilan de cloture (100-150 mots max) pour le marche {market_code}.

{context}

Format de reponse (sans markdown ** ni #):
1. Resume de la seance (1-2 phrases)
2. Top performers et pourquoi
3. Actifs en difficulte
4. Perspectives pour demain

Reste factuel et concis. Utilise des emojis pour la lisibilite."""

            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=500
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Erreur generation resume IA: {e}")
            # Fallback: resume basique sans IA
            return self._generate_basic_summary(market_code, analyses, event_type)

    def _generate_basic_summary(self, market_code, analyses, event_type):
        """Resume basique sans IA (fallback)"""
        if not analyses:
            return f"Pas de donnees disponibles pour le marche {market_code}"

        top = sorted(analyses, key=lambda x: x.get('price_change_1d', 0), reverse=True)[:3]
        bottom = sorted(analyses, key=lambda x: x.get('price_change_1d', 0))[:3]

        if event_type == 'close':
            text = f"📊 Cloture {market_code}\n\n"
            text += "🏆 Top performers:\n"
            for a in top:
                name = get_asset_display_name(a['symbol'])
                display = f"{a['symbol']} ({name})" if name != a['symbol'] else a['symbol']
                text += f"• {display}: {a.get('price_change_1d', 0):+.2f}%\n"
            text += "\n📉 En baisse:\n"
            for a in bottom:
                name = get_asset_display_name(a['symbol'])
                display = f"{a['symbol']} ({name})" if name != a['symbol'] else a['symbol']
                text += f"• {display}: {a.get('price_change_1d', 0):+.2f}%\n"
        else:
            opps = sorted(analyses, key=lambda x: x.get('score', 0), reverse=True)[:3]
            text = f"🔔 Ouverture {market_code}\n\n"
            text += "👀 A surveiller:\n"
            for a in opps:
                name = get_asset_display_name(a['symbol'])
                display = f"{a['symbol']} ({name})" if name != a['symbol'] else a['symbol']
                text += f"• {display}: score {a.get('score', 0)}/100\n"

        return text

    # ===== NOUVEAUX INDICATEURS: ICHIMOKU & PRIX CIBLES =====

    def _calculate_ichimoku(self, data, tenkan=9, kijun=26, senkou_b=52):
        """
        Calcule l'indicateur Ichimoku Cloud

        Components:
        - Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
        - Kijun-sen (Base Line): (26-period high + 26-period low) / 2
        - Senkou Span A (Leading Span A): (Tenkan + Kijun) / 2, plotted 26 periods ahead
        - Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2, plotted 26 periods ahead
        - Chikou Span (Lagging Span): Close plotted 26 periods back
        """
        try:
            high = data['High']
            low = data['Low']
            close = data['Close']

            # Tenkan-sen (Conversion Line)
            tenkan_high = high.rolling(window=tenkan).max()
            tenkan_low = low.rolling(window=tenkan).min()
            tenkan_sen = (tenkan_high + tenkan_low) / 2

            # Kijun-sen (Base Line)
            kijun_high = high.rolling(window=kijun).max()
            kijun_low = low.rolling(window=kijun).min()
            kijun_sen = (kijun_high + kijun_low) / 2

            # Senkou Span A (Leading Span A)
            senkou_a = ((tenkan_sen + kijun_sen) / 2).shift(kijun)

            # Senkou Span B (Leading Span B)
            senkou_b_high = high.rolling(window=senkou_b).max()
            senkou_b_low = low.rolling(window=senkou_b).min()
            senkou_span_b = ((senkou_b_high + senkou_b_low) / 2).shift(kijun)

            # Chikou Span (Lagging Span)
            chikou = close.shift(-kijun)

            current_price = close.iloc[-1]
            current_tenkan = tenkan_sen.iloc[-1]
            current_kijun = kijun_sen.iloc[-1]
            current_senkou_a = senkou_a.iloc[-1] if not pd.isna(senkou_a.iloc[-1]) else current_price
            current_senkou_b = senkou_span_b.iloc[-1] if not pd.isna(senkou_span_b.iloc[-1]) else current_price

            # Déterminer le signal Ichimoku
            cloud_top = max(current_senkou_a, current_senkou_b)
            cloud_bottom = min(current_senkou_a, current_senkou_b)

            # Signal analysis
            signal = 'neutral'
            strength = 50

            # Prix au-dessus du nuage = bullish
            if current_price > cloud_top:
                signal = 'bullish'
                strength = 70
                # Tenkan > Kijun = confirmation
                if current_tenkan > current_kijun:
                    strength = 85
            # Prix en-dessous du nuage = bearish
            elif current_price < cloud_bottom:
                signal = 'bearish'
                strength = 30
                if current_tenkan < current_kijun:
                    strength = 15
            # Prix dans le nuage = consolidation
            else:
                signal = 'neutral'
                strength = 50

            # Épaisseur du nuage (volatilité future)
            cloud_thickness = abs(current_senkou_a - current_senkou_b)
            cloud_thickness_pct = (cloud_thickness / current_price) * 100

            return {
                'tenkan_sen': float(current_tenkan) if not pd.isna(current_tenkan) else None,
                'kijun_sen': float(current_kijun) if not pd.isna(current_kijun) else None,
                'senkou_a': float(current_senkou_a),
                'senkou_b': float(current_senkou_b),
                'cloud_top': float(cloud_top),
                'cloud_bottom': float(cloud_bottom),
                'cloud_thickness_pct': round(cloud_thickness_pct, 2),
                'signal': signal,
                'strength': strength,
                'price_vs_cloud': 'above' if current_price > cloud_top else 'below' if current_price < cloud_bottom else 'inside',
                'tk_cross': 'bullish' if current_tenkan > current_kijun else 'bearish' if current_tenkan < current_kijun else 'neutral'
            }

        except Exception as e:
            logger.debug(f"Erreur calcul Ichimoku: {e}")
            return {
                'signal': 'neutral',
                'strength': 50,
                'price_vs_cloud': 'unknown'
            }

    def calculate_price_targets(self, data, direction: str, current_price: float,
                                 support: float, resistance: float, atr: float,
                                 risk_reward_ratio: float = 2.0) -> dict:
        """
        Calcule les prix cibles (Entry, Stop-Loss, Take-Profit) basés sur l'analyse

        Args:
            data: DataFrame avec OHLCV
            direction: 'LONG' ou 'SHORT'
            current_price: Prix actuel
            support: Niveau de support
            resistance: Niveau de résistance
            atr: Average True Range
            risk_reward_ratio: Ratio risque/récompense (défaut 2:1)

        Returns:
            {
                'entry': prix d'entrée suggéré,
                'stop_loss': niveau de stop-loss,
                'take_profit_1': premier objectif,
                'take_profit_2': deuxième objectif,
                'take_profit_3': troisième objectif,
                'risk_amount': montant à risquer,
                'risk_percent': risque en %,
                'potential_gain_percent': gain potentiel en %,
                'risk_reward': ratio risque/récompense
            }
        """
        try:
            # Calculer les niveaux de Fibonacci pour les cibles
            fib_levels = self._calculate_fibonacci_levels(data)

            if direction == 'LONG':
                # Entry: Prix actuel ou légèrement en dessous (pullback)
                entry = current_price

                # Stop-Loss: En dessous du support ou basé sur ATR
                sl_support = support * 0.995  # 0.5% sous le support
                sl_atr = current_price - (atr * 1.5)  # 1.5x ATR
                stop_loss = max(sl_support, sl_atr)  # Le plus proche

                # Calcul du risque
                risk_amount = entry - stop_loss
                risk_percent = (risk_amount / entry) * 100

                # Take-Profits basés sur le ratio R:R et Fibonacci
                tp1 = entry + (risk_amount * 1.5)  # 1.5R
                tp2 = entry + (risk_amount * risk_reward_ratio)  # 2R
                tp3 = entry + (risk_amount * 3)  # 3R

                # Ajuster avec résistance et Fibonacci si pertinent
                if resistance and resistance > entry:
                    tp1 = min(tp1, resistance)
                if fib_levels.get('0.382') and fib_levels['0.382'] > entry:
                    tp2 = max(tp2, fib_levels['0.382'])

                potential_gain = ((tp2 - entry) / entry) * 100

            else:  # SHORT
                entry = current_price

                # Stop-Loss: Au-dessus de la résistance ou basé sur ATR
                sl_resistance = resistance * 1.005  # 0.5% au-dessus de la résistance
                sl_atr = current_price + (atr * 1.5)
                stop_loss = min(sl_resistance, sl_atr)

                risk_amount = stop_loss - entry
                risk_percent = (risk_amount / entry) * 100

                # Take-Profits
                tp1 = entry - (risk_amount * 1.5)
                tp2 = entry - (risk_amount * risk_reward_ratio)
                tp3 = entry - (risk_amount * 3)

                # Ajuster avec support et Fibonacci
                if support and support < entry:
                    tp1 = max(tp1, support)
                if fib_levels.get('0.618') and fib_levels['0.618'] < entry:
                    tp2 = min(tp2, fib_levels['0.618'])

                potential_gain = ((entry - tp2) / entry) * 100

            # Calculer le ratio R:R réel
            actual_rr = abs(tp2 - entry) / abs(entry - stop_loss) if abs(entry - stop_loss) > 0 else 0

            return {
                'entry': round(entry, 4),
                'stop_loss': round(stop_loss, 4),
                'take_profit_1': round(tp1, 4),
                'take_profit_2': round(tp2, 4),
                'take_profit_3': round(tp3, 4),
                'risk_amount': round(risk_amount, 4),
                'risk_percent': round(risk_percent, 2),
                'potential_gain_percent': round(potential_gain, 2),
                'risk_reward': round(actual_rr, 2),
                'direction': direction
            }

        except Exception as e:
            logger.error(f"Erreur calcul prix cibles: {e}")
            # Valeurs par défaut basées sur ATR
            if direction == 'LONG':
                return {
                    'entry': round(current_price, 4),
                    'stop_loss': round(current_price - atr * 1.5, 4),
                    'take_profit_1': round(current_price + atr * 2, 4),
                    'take_profit_2': round(current_price + atr * 3, 4),
                    'take_profit_3': round(current_price + atr * 4, 4),
                    'risk_percent': round((atr * 1.5 / current_price) * 100, 2),
                    'potential_gain_percent': round((atr * 3 / current_price) * 100, 2),
                    'risk_reward': 2.0,
                    'direction': direction
                }
            else:
                return {
                    'entry': round(current_price, 4),
                    'stop_loss': round(current_price + atr * 1.5, 4),
                    'take_profit_1': round(current_price - atr * 2, 4),
                    'take_profit_2': round(current_price - atr * 3, 4),
                    'take_profit_3': round(current_price - atr * 4, 4),
                    'risk_percent': round((atr * 1.5 / current_price) * 100, 2),
                    'potential_gain_percent': round((atr * 3 / current_price) * 100, 2),
                    'risk_reward': 2.0,
                    'direction': direction
                }

    def format_price_targets_message(self, targets: dict, symbol: str) -> str:
        """Formate les prix cibles pour affichage Telegram"""
        direction = targets.get('direction', 'LONG')
        emoji = '🟢' if direction == 'LONG' else '🔴'

        text = f"🎯 **PRIX CIBLES - {symbol}**\n"
        text += "━" * 25 + "\n\n"

        text += f"{emoji} **Direction:** {direction}\n\n"

        text += f"📍 **Entry:** ${targets['entry']:,.4f}\n"
        text += f"🛑 **Stop-Loss:** ${targets['stop_loss']:,.4f} ({targets['risk_percent']:.1f}%)\n\n"

        text += "🎯 **Take-Profits:**\n"
        text += f"   TP1: ${targets['take_profit_1']:,.4f}\n"
        text += f"   TP2: ${targets['take_profit_2']:,.4f} (objectif principal)\n"
        text += f"   TP3: ${targets['take_profit_3']:,.4f}\n\n"

        text += f"📊 **Risk/Reward:** 1:{targets['risk_reward']:.1f}\n"
        text += f"📈 **Gain potentiel:** +{targets['potential_gain_percent']:.1f}%\n"

        return text


# Instance globale
analyzer = MarketAnalyzer()
