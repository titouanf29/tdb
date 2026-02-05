"""
Service de Screener Automatique Avance
Detecte les meilleurs setups, divergences RSI, et opportunites
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import numpy as np

from database.manager import db_manager
from services.market_data import market_data_service
from ai.analyzer import analyzer
import config

logger = logging.getLogger(__name__)


class ScreenerService:
    """Service de screener automatique avance"""

    def __init__(self):
        self.running = False
        self.scan_interval = 3600  # Scan toutes les heures

    async def start(self, bot):
        """Demarre le service de screener"""
        self.bot = bot
        self.running = True
        logger.info("[SCREENER] Service de screener demarre")
        asyncio.create_task(self._screener_loop())

    def stop(self):
        """Arrete le service"""
        self.running = False
        logger.info("[SCREENER] Service arrete")

    async def _screener_loop(self):
        """Boucle principale du screener"""
        while self.running:
            try:
                await self._run_daily_screener()
                await self._detect_rsi_divergences()
            except Exception as e:
                print(f"[SCREENER] Erreur: {e}")

            await asyncio.sleep(self.scan_interval)

    # ===== SCREENER AUTOMATIQUE =====

    async def _run_daily_screener(self):
        """Execute le screener quotidien"""
        logger.info("[SCREENER] Execution du scan quotidien...")

        best_setups = []

        for market_name, market_data in config.MARKETS.items():
            for symbol in market_data['assets'][:10]:  # Top 10 par marche
                try:
                    setup = await self._analyze_setup(symbol, market_name)
                    if setup and setup['score'] >= 70:
                        best_setups.append(setup)
                except Exception as e:
                    print(f"[SCREENER] Erreur analyse {symbol}: {e}")

        # Trier par score
        best_setups.sort(key=lambda x: x['score'], reverse=True)

        # Sauvegarder les meilleurs setups
        await self._save_best_setups(best_setups[:10])

        print(f"[SCREENER] {len(best_setups)} setups trouves")

    async def _analyze_setup(self, symbol: str, market: str) -> Optional[Dict]:
        """Analyse un setup potentiel"""
        analysis = await analyzer.analyze_asset(symbol, market, fetch_news=False)

        if not analysis:
            return None

        # Criteres de setup ideal
        rsi = analysis.get('rsi', 50)
        score = analysis.get('score', 0)
        trend = analysis.get('trend', 'NEUTRAL')

        # Setup haussier: RSI survendu + tendance qui se retourne
        bullish_setup = rsi < 35 and score >= 60

        # Setup baissier: RSI surachat + faiblesse
        bearish_setup = rsi > 65 and score >= 60

        if bullish_setup or bearish_setup:
            return {
                'symbol': symbol,
                'market': market,
                'score': score,
                'rsi': rsi,
                'direction': 'LONG' if bullish_setup else 'SHORT',
                'trend': trend,
                'price': analysis.get('current_price'),
                'setup_type': 'RSI_REVERSAL',
                'confidence': 'HIGH' if score >= 80 else 'MEDIUM'
            }

        return None

    async def _save_best_setups(self, setups: List[Dict]):
        """Sauvegarde les meilleurs setups"""
        for setup in setups:
            await db_manager.save_screener_result(setup)

    async def get_best_setups(self, market: str = None, limit: int = 10) -> List[Dict]:
        """Recupere les meilleurs setups du jour"""
        return await db_manager.get_best_setups(market, limit)

    # ===== DETECTION DIVERGENCES RSI =====

    async def _detect_rsi_divergences(self):
        """Detecte les divergences RSI sur tous les actifs"""
        logger.info("[SCREENER] Detection des divergences RSI...")

        for market_name, market_data in config.MARKETS.items():
            for symbol in market_data['assets'][:15]:
                try:
                    divergence = await self._check_divergence(symbol, market_name)
                    if divergence:
                        await self._save_and_notify_divergence(divergence)
                except Exception as e:
                    print(f"[SCREENER] Erreur divergence {symbol}: {e}")

    async def _check_divergence(self, symbol: str, market: str) -> Optional[Dict]:
        """Verifie s'il y a une divergence RSI"""
        try:
            # Recuperer les donnees historiques
            data = await market_data_service.get_historical_data(symbol, period='1mo', interval='1d')
            if data is None or len(data) < 20:
                return None

            closes = data['Close'].values
            rsi_values = self._calculate_rsi(closes, 14)

            if len(rsi_values) < 10:
                return None

            # Chercher divergence sur les 10 derniers jours
            price_recent = closes[-10:]
            rsi_recent = rsi_values[-10:]

            # Divergence haussiere: prix fait des plus bas, RSI fait des plus hauts
            price_making_lows = price_recent[-1] < price_recent[0] and min(price_recent[-3:]) < min(price_recent[:3])
            rsi_making_highs = rsi_recent[-1] > rsi_recent[0] and min(rsi_recent[-3:]) > min(rsi_recent[:3])

            if price_making_lows and rsi_making_highs and rsi_values[-1] < 40:
                return {
                    'symbol': symbol,
                    'market': market,
                    'type': 'bullish',
                    'rsi': rsi_values[-1],
                    'price': closes[-1],
                    'confidence': 'HIGH' if rsi_values[-1] < 30 else 'MEDIUM'
                }

            # Divergence baissiere: prix fait des plus hauts, RSI fait des plus bas
            price_making_highs = price_recent[-1] > price_recent[0] and max(price_recent[-3:]) > max(price_recent[:3])
            rsi_making_lows = rsi_recent[-1] < rsi_recent[0] and max(rsi_recent[-3:]) < max(rsi_recent[:3])

            if price_making_highs and rsi_making_lows and rsi_values[-1] > 60:
                return {
                    'symbol': symbol,
                    'market': market,
                    'type': 'bearish',
                    'rsi': rsi_values[-1],
                    'price': closes[-1],
                    'confidence': 'HIGH' if rsi_values[-1] > 70 else 'MEDIUM'
                }

        except Exception as e:
            print(f"[SCREENER] Erreur calcul divergence: {e}")

        return None

    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> np.ndarray:
        """Calcule le RSI"""
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gains = np.zeros(len(prices))
        avg_losses = np.zeros(len(prices))

        # Premier calcul
        avg_gains[period] = np.mean(gains[:period])
        avg_losses[period] = np.mean(losses[:period])

        # Calculs suivants (EMA)
        for i in range(period + 1, len(prices)):
            avg_gains[i] = (avg_gains[i-1] * (period - 1) + gains[i-1]) / period
            avg_losses[i] = (avg_losses[i-1] * (period - 1) + losses[i-1]) / period

        rs = np.divide(avg_gains, avg_losses, out=np.zeros_like(avg_gains), where=avg_losses != 0)
        rsi = 100 - (100 / (1 + rs))

        return rsi[period:]

    async def _save_and_notify_divergence(self, divergence: Dict):
        """Sauvegarde et notifie une divergence detectee"""
        # Verifier si deja detectee recemment
        existing = await db_manager.get_recent_divergence(
            divergence['symbol'], divergence['type']
        )
        if existing:
            return

        # Sauvegarder
        await db_manager.save_rsi_divergence(divergence)

        # Notifier les utilisateurs avec scan actif
        users = await db_manager.get_users_with_scan_enabled()

        emoji = "🟢" if divergence['type'] == 'bullish' else "🔴"
        direction = "HAUSSIERE" if divergence['type'] == 'bullish' else "BAISSIERE"

        message = (
            f"{emoji} DIVERGENCE RSI {direction} DETECTEE!\n\n"
            f"📊 {divergence['symbol']}\n"
            f"📈 RSI: {divergence['rsi']:.1f}\n"
            f"💰 Prix: ${divergence['price']:,.2f}\n"
            f"🎯 Confiance: {divergence['confidence']}\n\n"
            f"💡 Une divergence {divergence['type']} suggere un possible "
            f"{'retournement haussier' if divergence['type'] == 'bullish' else 'retournement baissier'}."
        )

        for user in users:
            try:
                await self.bot.send_message(chat_id=user['telegram_id'], text=message)
            except Exception as e:
                print(f"[SCREENER] Erreur notification: {e}")

    # ===== BACKTESTING SIMPLIFIE =====

    async def backtest_simple(self, symbol: str, days_ago: int, amount: float,
                             leverage: int, direction: str) -> Dict:
        """Backtesting simplifie: si j'avais achete il y a X jours"""
        try:
            # Recuperer les donnees historiques
            data = await market_data_service.get_historical_data(
                symbol, period=f'{days_ago + 5}d', interval='1d'
            )

            if data is None or len(data) < days_ago:
                return {'success': False, 'error': 'Donnees insuffisantes'}

            entry_price = data['Close'].iloc[-days_ago - 1]
            current_price = data['Close'].iloc[-1]

            # Calcul du PnL
            if direction == 'LONG':
                pnl_percent = ((current_price - entry_price) / entry_price) * 100 * leverage
            else:  # SHORT
                pnl_percent = ((entry_price - current_price) / entry_price) * 100 * leverage

            pnl_value = amount * (pnl_percent / 100)
            final_value = amount + pnl_value

            # Calculer le max drawdown
            prices_during = data['Close'].iloc[-days_ago-1:]
            if direction == 'LONG':
                worst_price = prices_during.min()
                max_drawdown = ((worst_price - entry_price) / entry_price) * 100 * leverage
            else:
                worst_price = prices_during.max()
                max_drawdown = ((entry_price - worst_price) / entry_price) * 100 * leverage

            return {
                'success': True,
                'symbol': symbol,
                'direction': direction,
                'days': days_ago,
                'entry_price': entry_price,
                'current_price': current_price,
                'amount': amount,
                'leverage': leverage,
                'pnl_percent': pnl_percent,
                'pnl_value': pnl_value,
                'final_value': final_value,
                'max_drawdown': max_drawdown,
                'would_be_liquidated': max_drawdown <= -100
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}


# Instance globale
screener_service = ScreenerService()
