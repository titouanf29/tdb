"""
Service de Risk Management - Metriques de risque avancees
Sharpe Ratio, VaR, Drawdown, Correlation
"""
import asyncio
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import yfinance as yf
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')


class RiskService:
    """Service de calcul des metriques de risque"""

    def __init__(self):
        self.risk_free_rate = 0.05  # Taux sans risque annuel (5%)

    async def calculate_sharpe_ratio(self, returns: List[float], period: str = 'daily') -> float:
        """
        Calcule le Sharpe Ratio

        Args:
            returns: Liste des rendements
            period: 'daily', 'weekly', 'monthly'

        Returns:
            Sharpe Ratio annualise
        """
        if len(returns) < 2:
            return 0.0

        returns_array = np.array(returns)
        mean_return = np.mean(returns_array)
        std_return = np.std(returns_array)

        if std_return == 0:
            return 0.0

        # Facteur d'annualisation
        annualization = {
            'daily': 252,
            'weekly': 52,
            'monthly': 12
        }
        factor = annualization.get(period, 252)

        # Sharpe annualise
        excess_return = mean_return - (self.risk_free_rate / factor)
        sharpe = (excess_return / std_return) * np.sqrt(factor)

        return round(sharpe, 2)

    async def calculate_var(self, returns: List[float], confidence: float = 0.95,
                            investment: float = 10000) -> Dict[str, float]:
        """
        Calcule la Value at Risk (VaR)

        Args:
            returns: Liste des rendements
            confidence: Niveau de confiance (0.95 = 95%)
            investment: Montant investi

        Returns:
            {
                'var_percent': VaR en pourcentage,
                'var_amount': VaR en montant,
                'confidence': niveau de confiance
            }
        """
        if len(returns) < 10:
            return {'var_percent': 0, 'var_amount': 0, 'confidence': confidence}

        returns_array = np.array(returns)

        # VaR historique
        var_percent = np.percentile(returns_array, (1 - confidence) * 100)

        return {
            'var_percent': round(var_percent * 100, 2),
            'var_amount': round(abs(var_percent) * investment, 2),
            'confidence': confidence * 100
        }

    async def calculate_max_drawdown(self, prices: List[float]) -> Dict[str, Any]:
        """
        Calcule le Maximum Drawdown

        Args:
            prices: Liste des prix

        Returns:
            {
                'max_drawdown': drawdown maximum en %,
                'peak_idx': index du pic,
                'trough_idx': index du creux,
                'recovery_idx': index de recuperation (None si pas recupere)
            }
        """
        if len(prices) < 2:
            return {'max_drawdown': 0, 'peak_idx': 0, 'trough_idx': 0, 'recovery_idx': None}

        prices_array = np.array(prices)
        peak = prices_array[0]
        peak_idx = 0
        max_dd = 0
        max_dd_peak_idx = 0
        max_dd_trough_idx = 0

        for i, price in enumerate(prices_array):
            if price > peak:
                peak = price
                peak_idx = i

            dd = (peak - price) / peak
            if dd > max_dd:
                max_dd = dd
                max_dd_peak_idx = peak_idx
                max_dd_trough_idx = i

        # Chercher recuperation
        recovery_idx = None
        trough_price = prices_array[max_dd_trough_idx]
        peak_price = prices_array[max_dd_peak_idx]
        for i in range(max_dd_trough_idx + 1, len(prices_array)):
            if prices_array[i] >= peak_price:
                recovery_idx = i
                break

        return {
            'max_drawdown': round(max_dd * 100, 2),
            'peak_idx': max_dd_peak_idx,
            'trough_idx': max_dd_trough_idx,
            'recovery_idx': recovery_idx
        }

    async def calculate_correlation_matrix(self, symbols: List[str],
                                            period: str = '3mo') -> Dict[str, Any]:
        """
        Calcule la matrice de correlation entre actifs

        Args:
            symbols: Liste des symboles
            period: Periode d'historique

        Returns:
            {
                'matrix': matrice de correlation,
                'symbols': liste des symboles,
                'strongest_positive': (sym1, sym2, corr),
                'strongest_negative': (sym1, sym2, corr)
            }
        """
        if len(symbols) < 2:
            return {'error': 'Minimum 2 symbols required'}

        try:
            # Telecharger les donnees
            data = {}
            for symbol in symbols[:6]:  # Max 6 symboles
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=period)
                if len(hist) > 10:
                    data[symbol] = hist['Close'].pct_change().dropna().values

            if len(data) < 2:
                return {'error': 'Not enough data'}

            # Aligner les longueurs
            min_len = min(len(v) for v in data.values())
            aligned_data = {k: v[:min_len] for k, v in data.items()}

            # Calculer la matrice
            symbols_list = list(aligned_data.keys())
            n = len(symbols_list)
            matrix = np.zeros((n, n))

            for i in range(n):
                for j in range(n):
                    if i == j:
                        matrix[i][j] = 1.0
                    else:
                        corr = np.corrcoef(
                            aligned_data[symbols_list[i]],
                            aligned_data[symbols_list[j]]
                        )[0, 1]
                        matrix[i][j] = round(corr, 2)

            # Trouver les correlations extremes
            strongest_pos = (None, None, -1)
            strongest_neg = (None, None, 1)

            for i in range(n):
                for j in range(i + 1, n):
                    if matrix[i][j] > strongest_pos[2]:
                        strongest_pos = (symbols_list[i], symbols_list[j], matrix[i][j])
                    if matrix[i][j] < strongest_neg[2]:
                        strongest_neg = (symbols_list[i], symbols_list[j], matrix[i][j])

            return {
                'matrix': matrix.tolist(),
                'symbols': symbols_list,
                'strongest_positive': strongest_pos,
                'strongest_negative': strongest_neg
            }

        except Exception as e:
            return {'error': str(e)}

    async def generate_correlation_chart(self, symbols: List[str],
                                          period: str = '3mo') -> Optional[BytesIO]:
        """Genere un graphique de matrice de correlation"""
        corr_data = await self.calculate_correlation_matrix(symbols, period)

        if 'error' in corr_data:
            return None

        matrix = np.array(corr_data['matrix'])
        symbols_list = corr_data['symbols']

        fig, ax = plt.subplots(figsize=(8, 6))

        # Heatmap
        im = ax.imshow(matrix, cmap='RdYlGn', vmin=-1, vmax=1)

        # Labels
        ax.set_xticks(range(len(symbols_list)))
        ax.set_yticks(range(len(symbols_list)))
        ax.set_xticklabels(symbols_list, rotation=45, ha='right')
        ax.set_yticklabels(symbols_list)

        # Annotations
        for i in range(len(symbols_list)):
            for j in range(len(symbols_list)):
                text = ax.text(j, i, f'{matrix[i, j]:.2f}',
                               ha='center', va='center', color='black', fontsize=10)

        ax.set_title('Matrice de Corrélation', fontsize=14, fontweight='bold')
        plt.colorbar(im, ax=ax, label='Corrélation')

        plt.tight_layout()

        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)

        return buf

    async def calculate_portfolio_risk(self, positions: List[Dict]) -> Dict[str, Any]:
        """
        Calcule les metriques de risque d'un portefeuille

        Args:
            positions: Liste de {'symbol': str, 'value': float, 'quantity': float}

        Returns:
            Metriques de risque completes
        """
        if not positions:
            return {'error': 'No positions'}

        total_value = sum(p.get('value', 0) for p in positions)
        if total_value == 0:
            return {'error': 'Zero portfolio value'}

        # Calculer les poids
        weights = []
        symbols = []
        all_returns = []

        for pos in positions:
            symbol = pos.get('symbol')
            weight = pos.get('value', 0) / total_value

            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period='3mo')
                if len(hist) > 10:
                    returns = hist['Close'].pct_change().dropna().values
                    all_returns.append(returns)
                    weights.append(weight)
                    symbols.append(symbol)
            except:
                continue

        if len(all_returns) < 1:
            return {'error': 'Could not fetch data'}

        # Aligner les donnees
        min_len = min(len(r) for r in all_returns)
        aligned_returns = [r[:min_len] for r in all_returns]

        # Rendements du portefeuille
        weights_array = np.array(weights)
        returns_matrix = np.array(aligned_returns)
        portfolio_returns = np.dot(weights_array, returns_matrix)

        # Metriques
        sharpe = await self.calculate_sharpe_ratio(portfolio_returns.tolist())
        var = await self.calculate_var(portfolio_returns.tolist(), investment=total_value)

        # Volatilite annualisee
        volatility = np.std(portfolio_returns) * np.sqrt(252) * 100

        # Rendement attendu annualise
        expected_return = np.mean(portfolio_returns) * 252 * 100

        return {
            'total_value': round(total_value, 2),
            'sharpe_ratio': sharpe,
            'var_95': var,
            'volatility': round(volatility, 2),
            'expected_return': round(expected_return, 2),
            'num_positions': len(positions),
            'weights': {s: round(w * 100, 1) for s, w in zip(symbols, weights)}
        }

    async def generate_risk_report(self, positions: List[Dict]) -> str:
        """Genere un rapport de risque textuel"""
        risk_data = await self.calculate_portfolio_risk(positions)

        if 'error' in risk_data:
            return f"❌ Erreur: {risk_data['error']}"

        report = "📊 **RAPPORT DE RISQUE**\n"
        report += "━" * 25 + "\n\n"

        report += f"💰 Valeur totale: ${risk_data['total_value']:,.2f}\n"
        report += f"📈 Positions: {risk_data['num_positions']}\n\n"

        # Sharpe
        sharpe = risk_data['sharpe_ratio']
        if sharpe > 1:
            sharpe_emoji = "🟢"
            sharpe_text = "Excellent"
        elif sharpe > 0.5:
            sharpe_emoji = "🟡"
            sharpe_text = "Bon"
        elif sharpe > 0:
            sharpe_emoji = "🟠"
            sharpe_text = "Moyen"
        else:
            sharpe_emoji = "🔴"
            sharpe_text = "Faible"

        report += f"📐 **Sharpe Ratio**: {sharpe} {sharpe_emoji}\n"
        report += f"   {sharpe_text} ajustement risque/rendement\n\n"

        # VaR
        var = risk_data['var_95']
        report += f"⚠️ **VaR 95%**: ${var['var_amount']:,.2f}\n"
        report += f"   Perte max probable (1 jour): {abs(var['var_percent']):.2f}%\n\n"

        # Volatilite
        vol = risk_data['volatility']
        if vol < 15:
            vol_emoji = "🟢"
            vol_text = "Faible"
        elif vol < 25:
            vol_emoji = "🟡"
            vol_text = "Modérée"
        else:
            vol_emoji = "🔴"
            vol_text = "Élevée"

        report += f"📉 **Volatilité**: {vol:.1f}% {vol_emoji}\n"
        report += f"   Risque {vol_text}\n\n"

        # Rendement attendu
        exp_ret = risk_data['expected_return']
        report += f"🎯 **Rendement attendu**: {exp_ret:+.1f}%/an\n\n"

        # Repartition
        report += "📊 **Répartition**:\n"
        for symbol, weight in risk_data['weights'].items():
            report += f"   • {symbol}: {weight}%\n"

        return report


# Instance globale
risk_service = RiskService()
