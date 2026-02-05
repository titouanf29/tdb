"""
Service de Backtesting pour TDB Bot
Permet de simuler des stratégies sur des données historiques
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import yfinance as yf
import pandas as pd
import numpy as np
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

logger = logging.getLogger(__name__)


class BacktestResult:
    """Résultat d'un backtest"""

    def __init__(self):
        self.total_return: float = 0.0
        self.total_return_percent: float = 0.0
        self.max_drawdown: float = 0.0
        self.max_drawdown_percent: float = 0.0
        self.win_rate: float = 0.0
        self.total_trades: int = 0
        self.winning_trades: int = 0
        self.losing_trades: int = 0
        self.sharpe_ratio: float = 0.0
        self.profit_factor: float = 0.0
        self.avg_win: float = 0.0
        self.avg_loss: float = 0.0
        self.best_trade: float = 0.0
        self.worst_trade: float = 0.0
        self.final_balance: float = 0.0
        self.trades: List[Dict] = []
        self.equity_curve: List[float] = []
        self.dates: List[datetime] = []


class BacktestService:
    """Service de backtesting"""

    def __init__(self):
        self.risk_free_rate = 0.02  # 2% annuel

    async def run_simple_backtest(
        self,
        symbol: str,
        days: int,
        initial_amount: float,
        leverage: int,
        direction: str,
        stop_loss_percent: Optional[float] = None,
        take_profit_percent: Optional[float] = None
    ) -> BacktestResult:
        """
        Exécute un backtest simple (une seule position)

        Args:
            symbol: Symbole de l'actif
            days: Nombre de jours de données historiques
            initial_amount: Montant initial investi
            leverage: Effet de levier
            direction: LONG ou SHORT
            stop_loss_percent: Stop loss en % (optionnel)
            take_profit_percent: Take profit en % (optionnel)

        Returns:
            BacktestResult avec les métriques
        """
        result = BacktestResult()

        try:
            # Récupérer les données historiques
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            ticker = yf.Ticker(symbol)
            data = ticker.history(start=start_date, end=end_date)

            if data.empty or len(data) < 2:
                logger.warning(f"Pas assez de données pour {symbol}")
                return result

            # Prix d'entrée et de sortie
            entry_price = float(data['Close'].iloc[0])
            exit_price = float(data['Close'].iloc[-1])

            # Simuler la position
            position_open = True
            actual_exit_price = exit_price
            exit_reason = "end_of_period"

            # Vérifier SL/TP sur toute la période
            for i, (date, row) in enumerate(data.iterrows()):
                if not position_open:
                    break

                current_price = row['Close']
                price_change_percent = ((current_price - entry_price) / entry_price) * 100

                if direction == "LONG":
                    pnl_percent = price_change_percent * leverage
                else:  # SHORT
                    pnl_percent = -price_change_percent * leverage

                # Vérifier Stop Loss
                if stop_loss_percent and pnl_percent <= -stop_loss_percent:
                    actual_exit_price = current_price
                    exit_reason = "stop_loss"
                    position_open = False
                    logger.debug(f"SL atteint à {current_price} le {date}")

                # Vérifier Take Profit
                if take_profit_percent and pnl_percent >= take_profit_percent:
                    actual_exit_price = current_price
                    exit_reason = "take_profit"
                    position_open = False
                    logger.debug(f"TP atteint à {current_price} le {date}")

            # Calculer le PnL final
            final_price_change = ((actual_exit_price - entry_price) / entry_price) * 100
            if direction == "LONG":
                final_pnl_percent = final_price_change * leverage
            else:
                final_pnl_percent = -final_price_change * leverage

            final_pnl = initial_amount * (final_pnl_percent / 100)

            # Remplir les résultats
            result.total_return = final_pnl
            result.total_return_percent = final_pnl_percent
            result.final_balance = initial_amount + final_pnl
            result.total_trades = 1
            result.winning_trades = 1 if final_pnl > 0 else 0
            result.losing_trades = 1 if final_pnl < 0 else 0
            result.win_rate = 100 if final_pnl > 0 else 0
            result.best_trade = final_pnl if final_pnl > 0 else 0
            result.worst_trade = final_pnl if final_pnl < 0 else 0

            # Calculer le drawdown
            equity = []
            peak = initial_amount
            max_dd = 0

            for i, row in data.iterrows():
                current_price = row['Close']
                price_change = ((current_price - entry_price) / entry_price) * 100
                if direction == "LONG":
                    current_pnl_percent = price_change * leverage
                else:
                    current_pnl_percent = -price_change * leverage

                current_equity = initial_amount * (1 + current_pnl_percent / 100)
                equity.append(current_equity)

                if current_equity > peak:
                    peak = current_equity
                dd = (peak - current_equity) / peak * 100
                if dd > max_dd:
                    max_dd = dd

            result.equity_curve = equity
            result.dates = list(data.index)
            result.max_drawdown_percent = max_dd
            result.max_drawdown = initial_amount * (max_dd / 100)

            # Trade info
            result.trades = [{
                'symbol': symbol,
                'direction': direction,
                'entry_price': entry_price,
                'exit_price': actual_exit_price,
                'entry_date': data.index[0],
                'exit_date': data.index[-1] if position_open else "SL/TP",
                'pnl': final_pnl,
                'pnl_percent': final_pnl_percent,
                'exit_reason': exit_reason
            }]

            logger.info(f"Backtest {symbol}: {final_pnl_percent:+.2f}% ({exit_reason})")

        except Exception as e:
            logger.error(f"Erreur backtest {symbol}: {e}")

        return result

    async def run_strategy_backtest(
        self,
        symbol: str,
        days: int,
        initial_capital: float,
        strategy: str = "rsi_crossover",
        params: Optional[Dict] = None
    ) -> BacktestResult:
        """
        Exécute un backtest avec une stratégie automatique

        Args:
            symbol: Symbole de l'actif
            days: Nombre de jours
            initial_capital: Capital initial
            strategy: Nom de la stratégie (rsi_crossover, ma_crossover, etc.)
            params: Paramètres de la stratégie

        Returns:
            BacktestResult
        """
        result = BacktestResult()
        params = params or {}

        try:
            # Récupérer les données
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            ticker = yf.Ticker(symbol)
            data = ticker.history(start=start_date, end=end_date)

            if data.empty or len(data) < 50:
                logger.warning(f"Pas assez de données pour {symbol}")
                return result

            # Calculer les indicateurs selon la stratégie
            if strategy == "rsi_crossover":
                signals = self._rsi_strategy(data, params)
            elif strategy == "ma_crossover":
                signals = self._ma_crossover_strategy(data, params)
            elif strategy == "bollinger_bounce":
                signals = self._bollinger_strategy(data, params)
            else:
                logger.error(f"Stratégie inconnue: {strategy}")
                return result

            # Simuler les trades
            result = self._simulate_trades(data, signals, initial_capital)
            result.dates = list(data.index)

        except Exception as e:
            logger.error(f"Erreur backtest stratégie {symbol}: {e}")

        return result

    def _rsi_strategy(self, data: pd.DataFrame, params: Dict) -> pd.Series:
        """Stratégie RSI: Acheter quand RSI < 30, vendre quand RSI > 70"""
        period = params.get('rsi_period', 14)
        oversold = params.get('oversold', 30)
        overbought = params.get('overbought', 70)

        # Calculer RSI
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        # Générer signaux
        signals = pd.Series(0, index=data.index)
        signals[rsi < oversold] = 1  # Acheter
        signals[rsi > overbought] = -1  # Vendre

        return signals

    def _ma_crossover_strategy(self, data: pd.DataFrame, params: Dict) -> pd.Series:
        """Stratégie croisement de moyennes mobiles"""
        short_period = params.get('short_period', 20)
        long_period = params.get('long_period', 50)

        short_ma = data['Close'].rolling(window=short_period).mean()
        long_ma = data['Close'].rolling(window=long_period).mean()

        signals = pd.Series(0, index=data.index)
        signals[short_ma > long_ma] = 1  # Tendance haussière
        signals[short_ma < long_ma] = -1  # Tendance baissière

        return signals

    def _bollinger_strategy(self, data: pd.DataFrame, params: Dict) -> pd.Series:
        """Stratégie Bollinger Bands: Rebond sur les bandes"""
        period = params.get('period', 20)
        std_dev = params.get('std_dev', 2)

        middle = data['Close'].rolling(window=period).mean()
        std = data['Close'].rolling(window=period).std()
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)

        signals = pd.Series(0, index=data.index)
        signals[data['Close'] < lower] = 1  # Prix sous la bande basse = acheter
        signals[data['Close'] > upper] = -1  # Prix au-dessus = vendre

        return signals

    def _simulate_trades(
        self,
        data: pd.DataFrame,
        signals: pd.Series,
        initial_capital: float
    ) -> BacktestResult:
        """Simule les trades basés sur les signaux"""
        result = BacktestResult()

        capital = initial_capital
        position = 0  # 0 = pas de position, 1 = long, -1 = short
        entry_price = 0
        trades = []
        equity_curve = [capital]

        for i in range(1, len(data)):
            signal = signals.iloc[i]
            price = data['Close'].iloc[i]

            # Ouvrir une position
            if position == 0 and signal != 0:
                position = signal
                entry_price = price

            # Fermer une position (signal opposé)
            elif position != 0 and signal == -position:
                # Calculer PnL
                if position == 1:  # Long
                    pnl_percent = ((price - entry_price) / entry_price) * 100
                else:  # Short
                    pnl_percent = ((entry_price - price) / entry_price) * 100

                pnl = capital * (pnl_percent / 100)
                capital += pnl

                trades.append({
                    'entry_price': entry_price,
                    'exit_price': price,
                    'direction': 'LONG' if position == 1 else 'SHORT',
                    'pnl': pnl,
                    'pnl_percent': pnl_percent
                })

                position = 0
                entry_price = 0

            equity_curve.append(capital)

        # Calculer les métriques
        winning = [t for t in trades if t['pnl'] > 0]
        losing = [t for t in trades if t['pnl'] < 0]

        result.trades = trades
        result.equity_curve = equity_curve
        result.total_trades = len(trades)
        result.winning_trades = len(winning)
        result.losing_trades = len(losing)
        result.win_rate = (len(winning) / len(trades) * 100) if trades else 0
        result.final_balance = capital
        result.total_return = capital - initial_capital
        result.total_return_percent = ((capital - initial_capital) / initial_capital) * 100

        if winning:
            result.avg_win = sum(t['pnl'] for t in winning) / len(winning)
            result.best_trade = max(t['pnl'] for t in winning)

        if losing:
            result.avg_loss = sum(t['pnl'] for t in losing) / len(losing)
            result.worst_trade = min(t['pnl'] for t in losing)

        # Profit factor
        total_wins = sum(t['pnl'] for t in winning) if winning else 0
        total_losses = abs(sum(t['pnl'] for t in losing)) if losing else 1
        result.profit_factor = total_wins / total_losses if total_losses > 0 else 0

        # Max drawdown
        peak = equity_curve[0]
        max_dd = 0
        for eq in equity_curve:
            if eq > peak:
                peak = eq
            dd = (peak - eq) / peak * 100
            if dd > max_dd:
                max_dd = dd

        result.max_drawdown_percent = max_dd
        result.max_drawdown = initial_capital * (max_dd / 100)

        # Sharpe ratio (simplifié)
        if len(equity_curve) > 1:
            returns = pd.Series(equity_curve).pct_change().dropna()
            if returns.std() > 0:
                result.sharpe_ratio = (returns.mean() * 252 - self.risk_free_rate) / (returns.std() * np.sqrt(252))

        return result

    async def generate_backtest_chart(self, result: BacktestResult, symbol: str) -> BytesIO:
        """Génère un graphique de l'equity curve"""
        try:
            fig, ax = plt.subplots(figsize=(10, 6))

            ax.plot(result.dates[:len(result.equity_curve)], result.equity_curve, 'b-', linewidth=1.5)
            ax.axhline(y=result.equity_curve[0], color='gray', linestyle='--', alpha=0.5)

            ax.set_title(f'Backtest {symbol} - Equity Curve', fontsize=14, fontweight='bold')
            ax.set_xlabel('Date')
            ax.set_ylabel('Valeur du portefeuille ($)')
            ax.grid(True, alpha=0.3)

            # Formatter les dates
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
            plt.xticks(rotation=45)

            # Ajouter les métriques
            metrics_text = f"Return: {result.total_return_percent:+.2f}%\n"
            metrics_text += f"Max DD: {result.max_drawdown_percent:.2f}%\n"
            metrics_text += f"Trades: {result.total_trades}"
            ax.text(0.02, 0.98, metrics_text, transform=ax.transAxes,
                   verticalalignment='top', fontsize=10,
                   bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

            plt.tight_layout()

            buf = BytesIO()
            plt.savefig(buf, format='png', dpi=100)
            buf.seek(0)
            plt.close(fig)

            return buf

        except Exception as e:
            logger.error(f"Erreur génération graphique backtest: {e}")
            return None

    def format_backtest_report(self, result: BacktestResult, symbol: str, params: Dict) -> str:
        """Formate un rapport de backtest"""
        report = f"""
📊 **RAPPORT DE BACKTEST**
━━━━━━━━━━━━━━━━━━━━

**Actif:** {symbol}
**Direction:** {params.get('direction', 'N/A')}
**Période:** {params.get('days', 'N/A')} jours
**Montant:** ${params.get('amount', 0):,.2f}
**Levier:** x{params.get('leverage', 1)}

━━━━━━━━━━━━━━━━━━━━

📈 **RÉSULTATS:**

💰 **PnL Total:** ${result.total_return:+,.2f}
📊 **Performance:** {result.total_return_percent:+.2f}%
💵 **Solde Final:** ${result.final_balance:,.2f}

━━━━━━━━━━━━━━━━━━━━

📉 **RISQUE:**

📊 **Max Drawdown:** {result.max_drawdown_percent:.2f}%
💸 **Perte Max:** ${result.max_drawdown:,.2f}

━━━━━━━━━━━━━━━━━━━━

📋 **STATISTIQUES:**

🎯 **Trades:** {result.total_trades}
✅ **Gagnants:** {result.winning_trades}
❌ **Perdants:** {result.losing_trades}
📊 **Win Rate:** {result.win_rate:.1f}%
"""

        if result.trades:
            trade = result.trades[0]
            report += f"""
━━━━━━━━━━━━━━━━━━━━

📝 **DÉTAIL DU TRADE:**

**Prix d'entrée:** ${trade['entry_price']:,.2f}
**Prix de sortie:** ${trade['exit_price']:,.2f}
**Raison sortie:** {trade.get('exit_reason', 'N/A')}
"""

        report += "\n⚠️ Les performances passées ne garantissent pas les résultats futurs."

        return report


# Instance globale
backtest_service = BacktestService()
