"""
Service de Calculs de Risque Avancés pour TDB Bot
Sharpe Ratio, VaR, Sortino Ratio, Beta, etc.
"""
import logging
import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from scipy import stats
import yfinance as yf

from database.manager import db_manager

logger = logging.getLogger(__name__)


class AdvancedRiskService:
    """Service de calculs de risque avancés"""

    def __init__(self):
        self.risk_free_rate = 0.0425  # 4.25% (taux fed funds 2024)
        self.benchmark_symbol = "SPY"  # S&P 500 comme benchmark
        self.trading_days_per_year = 252

    async def calculate_sharpe_ratio(
        self,
        returns: pd.Series,
        annualize: bool = True
    ) -> float:
        """
        Calcule le Sharpe Ratio

        Args:
            returns: Série des rendements
            annualize: Annualiser le ratio

        Returns:
            Sharpe Ratio
        """
        if returns.empty or returns.std() == 0:
            return 0.0

        excess_returns = returns - (self.risk_free_rate / self.trading_days_per_year)
        sharpe = excess_returns.mean() / returns.std()

        if annualize:
            sharpe *= np.sqrt(self.trading_days_per_year)

        return float(sharpe)

    async def calculate_sortino_ratio(
        self,
        returns: pd.Series,
        annualize: bool = True
    ) -> float:
        """
        Calcule le Sortino Ratio (pénalise uniquement la volatilité à la baisse)

        Args:
            returns: Série des rendements
            annualize: Annualiser le ratio

        Returns:
            Sortino Ratio
        """
        if returns.empty:
            return 0.0

        # Calculer la volatilité à la baisse (downside deviation)
        negative_returns = returns[returns < 0]
        if len(negative_returns) == 0:
            return float('inf')  # Pas de rendements négatifs

        downside_std = np.sqrt(np.mean(negative_returns ** 2))

        if downside_std == 0:
            return float('inf')

        excess_returns = returns.mean() - (self.risk_free_rate / self.trading_days_per_year)
        sortino = excess_returns / downside_std

        if annualize:
            sortino *= np.sqrt(self.trading_days_per_year)

        return float(sortino)

    async def calculate_var(
        self,
        returns: pd.Series,
        confidence: float = 0.95,
        horizon_days: int = 1,
        portfolio_value: float = 10000
    ) -> Dict:
        """
        Calcule la Value at Risk (VaR)

        Args:
            returns: Série des rendements
            confidence: Niveau de confiance (0.95 = 95%)
            horizon_days: Horizon en jours
            portfolio_value: Valeur du portefeuille

        Returns:
            Dictionnaire avec VaR paramétrique, historique et conditionnelle
        """
        if returns.empty:
            return {
                'parametric': 0,
                'historical': 0,
                'conditional': 0,
                'confidence': confidence,
                'horizon_days': horizon_days
            }

        # VaR Paramétrique (méthode variance-covariance)
        mean = returns.mean()
        std = returns.std()
        z_score = stats.norm.ppf(1 - confidence)
        var_parametric = -(mean + z_score * std) * np.sqrt(horizon_days)

        # VaR Historique
        var_historical = -np.percentile(returns, (1 - confidence) * 100) * np.sqrt(horizon_days)

        # VaR Conditionnelle (CVaR / Expected Shortfall)
        var_threshold = np.percentile(returns, (1 - confidence) * 100)
        cvar = -returns[returns <= var_threshold].mean() * np.sqrt(horizon_days)

        return {
            'parametric': float(var_parametric * portfolio_value),
            'historical': float(var_historical * portfolio_value),
            'conditional': float(cvar * portfolio_value) if not np.isnan(cvar) else 0,
            'parametric_percent': float(var_parametric * 100),
            'historical_percent': float(var_historical * 100),
            'confidence': confidence,
            'horizon_days': horizon_days
        }

    async def calculate_max_drawdown(
        self,
        equity_curve: pd.Series
    ) -> Tuple[float, float, datetime, datetime]:
        """
        Calcule le Maximum Drawdown

        Args:
            equity_curve: Série de la valeur du portefeuille

        Returns:
            (max_drawdown_amount, max_drawdown_percent, peak_date, trough_date)
        """
        if equity_curve.empty:
            return 0, 0, None, None

        # Calculer les peaks cumulatifs
        peaks = equity_curve.cummax()

        # Calculer les drawdowns
        drawdowns = (equity_curve - peaks) / peaks

        # Trouver le maximum drawdown
        max_dd_idx = drawdowns.idxmin()
        max_dd_percent = abs(drawdowns.min())

        # Trouver le peak correspondant
        peak_idx = equity_curve[:max_dd_idx].idxmax()
        peak_value = equity_curve[peak_idx]
        trough_value = equity_curve[max_dd_idx]

        max_dd_amount = peak_value - trough_value

        return (
            float(max_dd_amount),
            float(max_dd_percent * 100),
            peak_idx,
            max_dd_idx
        )

    async def calculate_beta(
        self,
        asset_returns: pd.Series,
        benchmark_returns: pd.Series = None
    ) -> float:
        """
        Calcule le Beta par rapport au benchmark

        Args:
            asset_returns: Rendements de l'actif
            benchmark_returns: Rendements du benchmark (SPY par défaut)

        Returns:
            Beta
        """
        if benchmark_returns is None:
            # Récupérer les rendements du benchmark
            try:
                ticker = yf.Ticker(self.benchmark_symbol)
                data = ticker.history(period="1y")
                benchmark_returns = data['Close'].pct_change().dropna()
            except Exception as e:
                logger.warning(f"Erreur récupération benchmark: {e}")
                return 1.0

        # Aligner les dates
        common_dates = asset_returns.index.intersection(benchmark_returns.index)
        if len(common_dates) < 30:
            return 1.0

        asset_aligned = asset_returns[common_dates]
        bench_aligned = benchmark_returns[common_dates]

        # Calculer le beta
        covariance = np.cov(asset_aligned, bench_aligned)[0, 1]
        variance = np.var(bench_aligned)

        if variance == 0:
            return 1.0

        return float(covariance / variance)

    async def calculate_alpha(
        self,
        asset_returns: pd.Series,
        benchmark_returns: pd.Series = None,
        beta: float = None
    ) -> float:
        """
        Calcule l'Alpha (rendement excédentaire par rapport au CAPM)

        Args:
            asset_returns: Rendements de l'actif
            benchmark_returns: Rendements du benchmark
            beta: Beta (calculé si non fourni)

        Returns:
            Alpha annualisé
        """
        if beta is None:
            beta = await self.calculate_beta(asset_returns, benchmark_returns)

        if benchmark_returns is None:
            try:
                ticker = yf.Ticker(self.benchmark_symbol)
                data = ticker.history(period="1y")
                benchmark_returns = data['Close'].pct_change().dropna()
            except Exception:
                return 0.0

        # Rendements moyens annualisés
        asset_annual = asset_returns.mean() * self.trading_days_per_year
        bench_annual = benchmark_returns.mean() * self.trading_days_per_year

        # Alpha = Rendement - (Risk-free + Beta * (Benchmark - Risk-free))
        expected_return = self.risk_free_rate + beta * (bench_annual - self.risk_free_rate)
        alpha = asset_annual - expected_return

        return float(alpha * 100)  # En pourcentage

    async def calculate_calmar_ratio(
        self,
        returns: pd.Series,
        equity_curve: pd.Series
    ) -> float:
        """
        Calcule le Calmar Ratio (rendement annualisé / max drawdown)

        Args:
            returns: Série des rendements
            equity_curve: Courbe d'équité

        Returns:
            Calmar Ratio
        """
        annual_return = returns.mean() * self.trading_days_per_year
        _, max_dd_percent, _, _ = await self.calculate_max_drawdown(equity_curve)

        if max_dd_percent == 0:
            return 0.0

        return float(annual_return * 100 / max_dd_percent)

    async def calculate_information_ratio(
        self,
        asset_returns: pd.Series,
        benchmark_returns: pd.Series = None
    ) -> float:
        """
        Calcule l'Information Ratio (rendement actif / tracking error)

        Args:
            asset_returns: Rendements de l'actif
            benchmark_returns: Rendements du benchmark

        Returns:
            Information Ratio
        """
        if benchmark_returns is None:
            try:
                ticker = yf.Ticker(self.benchmark_symbol)
                data = ticker.history(period="1y")
                benchmark_returns = data['Close'].pct_change().dropna()
            except Exception:
                return 0.0

        # Aligner les dates
        common_dates = asset_returns.index.intersection(benchmark_returns.index)
        if len(common_dates) < 30:
            return 0.0

        # Calculer les rendements actifs
        active_returns = asset_returns[common_dates] - benchmark_returns[common_dates]

        # Tracking error
        tracking_error = active_returns.std()

        if tracking_error == 0:
            return 0.0

        # Information Ratio
        ir = (active_returns.mean() / tracking_error) * np.sqrt(self.trading_days_per_year)

        return float(ir)

    async def generate_full_risk_report(
        self,
        telegram_id: int
    ) -> Dict:
        """
        Génère un rapport de risque complet pour un utilisateur

        Args:
            telegram_id: ID Telegram de l'utilisateur

        Returns:
            Dictionnaire avec toutes les métriques de risque
        """
        report = {
            'sharpe_ratio': 0,
            'sortino_ratio': 0,
            'var_95': {},
            'max_drawdown': 0,
            'max_drawdown_percent': 0,
            'beta': 1,
            'alpha': 0,
            'calmar_ratio': 0,
            'information_ratio': 0,
            'win_rate': 0,
            'profit_factor': 0,
            'total_trades': 0,
            'avg_win': 0,
            'avg_loss': 0,
            'best_trade': 0,
            'worst_trade': 0
        }

        try:
            # Récupérer l'historique des positions
            history = await db_manager.get_position_history(telegram_id, limit=1000)

            if not history:
                return report

            # Convertir en DataFrame
            df = pd.DataFrame(history)

            # Calculer les rendements
            df['return'] = df['pnl_percent'] / 100
            returns = pd.Series(df['return'].values)

            # Calculer l'equity curve
            initial_capital = 10000
            df['equity'] = initial_capital * (1 + df['return'].cumsum())
            equity_curve = pd.Series(df['equity'].values)

            # Métriques de risque
            report['sharpe_ratio'] = await self.calculate_sharpe_ratio(returns)
            report['sortino_ratio'] = await self.calculate_sortino_ratio(returns)
            report['var_95'] = await self.calculate_var(returns, 0.95, 1, equity_curve.iloc[-1])

            max_dd, max_dd_pct, _, _ = await self.calculate_max_drawdown(equity_curve)
            report['max_drawdown'] = max_dd
            report['max_drawdown_percent'] = max_dd_pct

            report['calmar_ratio'] = await self.calculate_calmar_ratio(returns, equity_curve)

            # Statistiques de trading
            winning = df[df['pnl'] > 0]
            losing = df[df['pnl'] < 0]

            report['total_trades'] = len(df)
            report['win_rate'] = (len(winning) / len(df) * 100) if len(df) > 0 else 0

            if len(winning) > 0:
                report['avg_win'] = winning['pnl'].mean()
                report['best_trade'] = winning['pnl'].max()

            if len(losing) > 0:
                report['avg_loss'] = losing['pnl'].mean()
                report['worst_trade'] = losing['pnl'].min()

            total_wins = winning['pnl'].sum() if len(winning) > 0 else 0
            total_losses = abs(losing['pnl'].sum()) if len(losing) > 0 else 1
            report['profit_factor'] = total_wins / total_losses if total_losses > 0 else 0

        except Exception as e:
            logger.error(f"Erreur génération rapport risque: {e}")

        return report

    def format_risk_report(self, report: Dict) -> str:
        """
        Formate le rapport de risque pour affichage

        Args:
            report: Dictionnaire du rapport

        Returns:
            Texte formaté
        """
        text = "📊 **RAPPORT DE RISQUE AVANCÉ**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Métriques de performance ajustée au risque
        text += "📈 **Performance Ajustée au Risque:**\n\n"

        sharpe = report['sharpe_ratio']
        sharpe_emoji = "🟢" if sharpe > 1 else ("🟡" if sharpe > 0.5 else "🔴")
        text += f"{sharpe_emoji} **Sharpe Ratio:** {sharpe:.2f}\n"

        sortino = report['sortino_ratio']
        sortino_emoji = "🟢" if sortino > 1.5 else ("🟡" if sortino > 0.5 else "🔴")
        text += f"{sortino_emoji} **Sortino Ratio:** {sortino:.2f}\n"

        calmar = report['calmar_ratio']
        text += f"📊 **Calmar Ratio:** {calmar:.2f}\n\n"

        # Value at Risk
        text += "⚠️ **Value at Risk (95%):**\n\n"
        var = report.get('var_95', {})
        text += f"📉 **VaR Paramétrique:** ${var.get('parametric', 0):,.2f}\n"
        text += f"📉 **VaR Historique:** ${var.get('historical', 0):,.2f}\n"
        text += f"📉 **CVaR (Expected Shortfall):** ${var.get('conditional', 0):,.2f}\n\n"

        # Drawdown
        text += "📉 **Drawdown:**\n\n"
        text += f"📊 **Max Drawdown:** {report['max_drawdown_percent']:.2f}%\n"
        text += f"💰 **Perte Max:** ${report['max_drawdown']:,.2f}\n\n"

        # Statistiques de trading
        text += "📋 **Statistiques de Trading:**\n\n"
        text += f"🎯 **Trades:** {report['total_trades']}\n"
        text += f"✅ **Win Rate:** {report['win_rate']:.1f}%\n"
        text += f"📊 **Profit Factor:** {report['profit_factor']:.2f}\n"
        text += f"💰 **Gain Moyen:** ${report['avg_win']:,.2f}\n"
        text += f"💸 **Perte Moyenne:** ${report['avg_loss']:,.2f}\n"
        text += f"🏆 **Meilleur Trade:** ${report['best_trade']:,.2f}\n"
        text += f"📉 **Pire Trade:** ${report['worst_trade']:,.2f}\n\n"

        # Interprétation
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"
        text += "💡 **Interprétation:**\n\n"

        if sharpe > 1:
            text += "• Sharpe > 1: Excellente performance ajustée au risque\n"
        elif sharpe > 0.5:
            text += "• Sharpe 0.5-1: Performance correcte\n"
        else:
            text += "• Sharpe < 0.5: Performance à améliorer\n"

        if report['max_drawdown_percent'] > 20:
            text += "• ⚠️ Drawdown élevé: Considérez réduire le risque\n"

        if report['profit_factor'] > 1.5:
            text += "• Profit Factor > 1.5: Stratégie rentable\n"

        return text


# Instance globale
advanced_risk_service = AdvancedRiskService()
