"""
Service Statistiques Wallet - Graphiques de performance et analyse avancee
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import numpy as np
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib
matplotlib.use('Agg')

from database.manager import db_manager


class WalletStatsService:
    """Service de statistiques avancees du wallet"""

    def __init__(self):
        pass

    async def get_portfolio_value_history(self, user_id: int, days: int = 30) -> List[Dict]:
        """Recupere l'historique de valeur du portefeuille"""
        return await db_manager.get_portfolio_history(user_id, days)

    async def calculate_performance_metrics(self, user_id: int) -> Dict[str, Any]:
        """
        Calcule les metriques de performance du portefeuille

        Returns:
            {
                'total_pnl': P&L total,
                'total_pnl_percent': P&L en %,
                'winning_trades': nombre de trades gagnants,
                'losing_trades': nombre de trades perdants,
                'win_rate': taux de reussite,
                'avg_win': gain moyen,
                'avg_loss': perte moyenne,
                'profit_factor': ratio gains/pertes,
                'best_trade': meilleur trade,
                'worst_trade': pire trade,
                'current_streak': serie actuelle
            }
        """
        trades = await db_manager.get_user_trades_history(user_id)

        if not trades:
            return {
                'total_pnl': 0,
                'total_pnl_percent': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0,
                'avg_win': 0,
                'avg_loss': 0,
                'profit_factor': 0,
                'best_trade': None,
                'worst_trade': None,
                'current_streak': 0
            }

        winning = [t for t in trades if t.get('pnl', 0) > 0]
        losing = [t for t in trades if t.get('pnl', 0) < 0]

        total_pnl = sum(t.get('pnl', 0) for t in trades)
        initial_capital = 10000  # Capital initial par defaut

        # Win rate
        win_rate = len(winning) / len(trades) * 100 if trades else 0

        # Moyennes
        avg_win = sum(t['pnl'] for t in winning) / len(winning) if winning else 0
        avg_loss = sum(t['pnl'] for t in losing) / len(losing) if losing else 0

        # Profit factor
        total_wins = sum(t['pnl'] for t in winning)
        total_losses = abs(sum(t['pnl'] for t in losing))
        profit_factor = total_wins / total_losses if total_losses > 0 else float('inf')

        # Best/Worst trade
        best_trade = max(trades, key=lambda t: t.get('pnl', 0)) if trades else None
        worst_trade = min(trades, key=lambda t: t.get('pnl', 0)) if trades else None

        # Streak
        current_streak = 0
        if trades:
            sorted_trades = sorted(trades, key=lambda t: t.get('created_at', ''), reverse=True)
            last_pnl = sorted_trades[0].get('pnl', 0)
            streak_positive = last_pnl > 0

            for trade in sorted_trades:
                if (trade.get('pnl', 0) > 0) == streak_positive:
                    current_streak += 1 if streak_positive else -1
                else:
                    break

        return {
            'total_pnl': round(total_pnl, 2),
            'total_pnl_percent': round(total_pnl / initial_capital * 100, 2),
            'winning_trades': len(winning),
            'losing_trades': len(losing),
            'win_rate': round(win_rate, 1),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'profit_factor': round(profit_factor, 2) if profit_factor != float('inf') else 'N/A',
            'best_trade': best_trade,
            'worst_trade': worst_trade,
            'current_streak': current_streak
        }

    async def get_sector_allocation(self, user_id: int) -> Dict[str, float]:
        """Calcule la repartition sectorielle du portefeuille"""
        positions = await db_manager.get_user_positions(user_id)

        # Mapping simplifie symbole -> secteur
        sector_map = {
            'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology',
            'AMZN': 'Consumer', 'TSLA': 'Automotive', 'META': 'Technology',
            'NVDA': 'Technology', 'AMD': 'Technology', 'INTC': 'Technology',
            'JPM': 'Finance', 'BAC': 'Finance', 'GS': 'Finance',
            'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy',
            'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare',
            'BTC-USD': 'Crypto', 'ETH-USD': 'Crypto', 'BNB-USD': 'Crypto',
            'SPY': 'Index', 'QQQ': 'Index', 'DIA': 'Index',
        }

        allocations = {}
        total_value = 0

        for pos in positions:
            symbol = pos.get('symbol', '')
            value = pos.get('current_value', 0)
            sector = sector_map.get(symbol, 'Other')

            allocations[sector] = allocations.get(sector, 0) + value
            total_value += value

        # Convertir en pourcentages
        if total_value > 0:
            allocations = {k: round(v / total_value * 100, 1) for k, v in allocations.items()}

        return allocations

    async def generate_performance_chart(self, user_id: int, days: int = 30) -> Optional[BytesIO]:
        """Genere un graphique de performance du portefeuille"""
        history = await self.get_portfolio_value_history(user_id, days)

        if len(history) < 2:
            # Generer des donnees fictives pour demo
            history = self._generate_demo_history(days)

        dates = [datetime.fromisoformat(h['date']) if isinstance(h['date'], str)
                 else h['date'] for h in history]
        values = [h['value'] for h in history]

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), height_ratios=[2, 1])

        # Graphique de valeur
        ax1.fill_between(dates, values, alpha=0.3, color='#2196F3')
        ax1.plot(dates, values, color='#2196F3', linewidth=2)

        # Ligne de reference (capital initial)
        initial = values[0] if values else 10000
        ax1.axhline(y=initial, color='gray', linestyle='--', alpha=0.5, label='Capital initial')

        ax1.set_title('Performance du Portefeuille', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Valeur ($)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # Formatter les dates
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%d/%m'))
        ax1.xaxis.set_major_locator(mdates.DayLocator(interval=max(1, days // 10)))

        # Graphique des rendements quotidiens
        if len(values) > 1:
            returns = [(values[i] - values[i-1]) / values[i-1] * 100
                       for i in range(1, len(values))]
            colors = ['#00C853' if r >= 0 else '#FF1744' for r in returns]

            ax2.bar(dates[1:], returns, color=colors, alpha=0.7)
            ax2.axhline(y=0, color='gray', linestyle='-', alpha=0.5)
            ax2.set_ylabel('Rendement (%)')
            ax2.set_xlabel('Date')
            ax2.grid(True, alpha=0.3)
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%d/%m'))

        plt.tight_layout()

        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)

        return buf

    async def generate_allocation_chart(self, user_id: int) -> Optional[BytesIO]:
        """Genere un graphique de repartition sectorielle"""
        allocations = await self.get_sector_allocation(user_id)

        if not allocations:
            # Demo data
            allocations = {
                'Technology': 35,
                'Finance': 20,
                'Healthcare': 15,
                'Crypto': 15,
                'Energy': 10,
                'Other': 5
            }

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        # Pie chart
        colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
                  '#00BCD4', '#795548', '#607D8B']
        labels = list(allocations.keys())
        sizes = list(allocations.values())

        wedges, texts, autotexts = ax1.pie(
            sizes, labels=labels, colors=colors[:len(sizes)],
            autopct='%1.1f%%', startangle=90, pctdistance=0.85
        )
        ax1.set_title('Répartition Sectorielle', fontsize=12, fontweight='bold')

        # Bar chart
        ax2.barh(labels, sizes, color=colors[:len(sizes)])
        ax2.set_xlabel('Allocation (%)')
        ax2.set_title('Détail par Secteur', fontsize=12, fontweight='bold')

        for i, v in enumerate(sizes):
            ax2.text(v + 0.5, i, f'{v}%', va='center')

        plt.tight_layout()

        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)

        return buf

    def _generate_demo_history(self, days: int) -> List[Dict]:
        """Genere un historique de demo"""
        history = []
        value = 10000
        base_date = datetime.now() - timedelta(days=days)

        for i in range(days):
            # Variation aleatoire entre -3% et +3%
            change = np.random.uniform(-0.03, 0.035)
            value *= (1 + change)

            history.append({
                'date': base_date + timedelta(days=i),
                'value': round(value, 2)
            })

        return history

    def format_performance_report(self, metrics: Dict) -> str:
        """Formate un rapport de performance textuel"""
        report = "📊 **RAPPORT DE PERFORMANCE**\n"
        report += "━" * 25 + "\n\n"

        # P&L
        pnl = metrics['total_pnl']
        pnl_pct = metrics['total_pnl_percent']
        pnl_emoji = "🟢" if pnl >= 0 else "🔴"

        report += f"{pnl_emoji} **P&L Total**: ${pnl:+,.2f} ({pnl_pct:+.1f}%)\n\n"

        # Stats de trades
        report += "📈 **Statistiques des Trades:**\n"
        report += f"   ✅ Gagnants: {metrics['winning_trades']}\n"
        report += f"   ❌ Perdants: {metrics['losing_trades']}\n"
        report += f"   🎯 Win Rate: {metrics['win_rate']}%\n\n"

        # Moyennes
        report += "💰 **Moyennes:**\n"
        report += f"   📈 Gain moyen: ${metrics['avg_win']:+,.2f}\n"
        report += f"   📉 Perte moyenne: ${metrics['avg_loss']:,.2f}\n"
        report += f"   ⚖️ Profit Factor: {metrics['profit_factor']}\n\n"

        # Best/Worst
        if metrics['best_trade']:
            best = metrics['best_trade']
            report += f"🏆 **Meilleur trade**: {best.get('symbol', 'N/A')} (${best.get('pnl', 0):+,.2f})\n"

        if metrics['worst_trade']:
            worst = metrics['worst_trade']
            report += f"💔 **Pire trade**: {worst.get('symbol', 'N/A')} (${worst.get('pnl', 0):+,.2f})\n"

        # Streak
        streak = metrics['current_streak']
        if streak > 0:
            report += f"\n🔥 **Série actuelle**: {streak} trades gagnants!"
        elif streak < 0:
            report += f"\n❄️ **Série actuelle**: {abs(streak)} trades perdants"

        return report


# Instance globale
wallet_stats_service = WalletStatsService()
