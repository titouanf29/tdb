"""
Service de Graphiques Avances
Comparaison d'actifs, Heatmap sectorielle, Fear & Greed Index
"""
import io
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import numpy as np

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec
import mplfinance as mpf

from services.market_data import market_data_service
import config


class AdvancedChartsService:
    """Service de graphiques avances"""

    def __init__(self):
        # Couleurs pour le theme sombre
        self.bg_color = '#1a1a2e'
        self.text_color = '#ffffff'
        self.grid_color = '#2d2d44'
        self.colors = ['#00d4ff', '#ff6b6b', '#4ecdc4', '#ffd93d', '#6c5ce7', '#a29bfe']

    # ===== COMPARAISON D'ACTIFS =====

    async def compare_assets(self, symbols: List[str], period: str = '3mo') -> Tuple[io.BytesIO, Dict]:
        """
        Genere un graphique comparant plusieurs actifs (normalise a 100)
        """
        fig, axes = plt.subplots(2, 1, figsize=(12, 8), facecolor=self.bg_color,
                                  gridspec_kw={'height_ratios': [3, 1]})

        ax_main = axes[0]
        ax_corr = axes[1]

        # Configurer le style
        for ax in axes:
            ax.set_facecolor(self.bg_color)
            ax.tick_params(colors=self.text_color)
            ax.spines['bottom'].set_color(self.grid_color)
            ax.spines['top'].set_color(self.grid_color)
            ax.spines['left'].set_color(self.grid_color)
            ax.spines['right'].set_color(self.grid_color)

        data_dict = {}
        performances = {}

        for i, symbol in enumerate(symbols[:6]):  # Max 6 actifs
            try:
                data = await market_data_service.get_historical_data(symbol, period=period, interval='1d')
                if data is not None and len(data) > 0:
                    # Normaliser a 100
                    normalized = (data['Close'] / data['Close'].iloc[0]) * 100
                    data_dict[symbol] = normalized

                    # Performance totale
                    perf = ((data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1) * 100
                    performances[symbol] = perf

                    # Tracer
                    ax_main.plot(data.index, normalized, label=f"{symbol} ({perf:+.1f}%)",
                                color=self.colors[i % len(self.colors)], linewidth=2)
            except Exception as e:
                print(f"[CHARTS] Erreur comparaison {symbol}: {e}")

        # Ligne de reference a 100
        if data_dict:
            first_data = list(data_dict.values())[0]
            ax_main.axhline(y=100, color=self.grid_color, linestyle='--', alpha=0.5)

        ax_main.set_title('Comparaison des Performances (Base 100)', color=self.text_color, fontsize=14, fontweight='bold')
        ax_main.set_ylabel('Performance (%)', color=self.text_color)
        ax_main.legend(loc='upper left', facecolor=self.bg_color, edgecolor=self.grid_color,
                      labelcolor=self.text_color)
        ax_main.grid(True, color=self.grid_color, alpha=0.3)

        # Graphique de correlation (barres)
        if performances:
            colors_bars = ['#00ff88' if v >= 0 else '#ff4757' for v in performances.values()]
            bars = ax_corr.bar(performances.keys(), performances.values(), color=colors_bars)
            ax_corr.axhline(y=0, color=self.text_color, linewidth=0.5)
            ax_corr.set_ylabel('Variation %', color=self.text_color)
            ax_corr.set_title('Performance sur la periode', color=self.text_color, fontsize=10)

        plt.tight_layout()

        # Sauvegarder
        buf = io.BytesIO()
        plt.savefig(buf, format='png', facecolor=self.bg_color, dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close(fig)

        return buf, performances

    # ===== HEATMAP SECTORIELLE =====

    async def sector_heatmap(self) -> Tuple[io.BytesIO, Dict]:
        """
        Genere une heatmap des performances sectorielles
        """
        # Definir les secteurs et leurs representants
        sectors = {
            'Tech': ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
            'Finance': ['JPM', 'BAC', 'GS', 'V'],
            'Sante': ['JNJ', 'UNH', 'PFE', 'ABBV'],
            'Energie': ['XOM', 'CVX', 'COP'],
            'Conso': ['AMZN', 'WMT', 'HD', 'MCD'],
            'Industrie': ['CAT', 'BA', 'HON', 'UPS'],
            'Crypto': ['BTC-USD', 'ETH-USD', 'SOL-USD'],
            'Matieres': ['GC=F', 'SI=F', 'CL=F']
        }

        sector_perfs = {}
        sector_details = {}

        for sector, symbols in sectors.items():
            perfs = []
            details = []
            for symbol in symbols:
                try:
                    data = await market_data_service.get_historical_data(symbol, period='5d', interval='1d')
                    if data is not None and len(data) >= 2:
                        perf = ((data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1) * 100
                        perfs.append(perf)
                        details.append({'symbol': symbol, 'perf': perf})
                except Exception as e:
                    print(f"[CHARTS] Erreur heatmap {symbol}: {e}")

            if perfs:
                sector_perfs[sector] = np.mean(perfs)
                sector_details[sector] = sorted(details, key=lambda x: x['perf'], reverse=True)

        # Creer la heatmap
        fig, ax = plt.subplots(figsize=(12, 8), facecolor=self.bg_color)
        ax.set_facecolor(self.bg_color)

        # Trier par performance
        sorted_sectors = sorted(sector_perfs.items(), key=lambda x: x[1], reverse=True)

        n_sectors = len(sorted_sectors)
        n_cols = 4
        n_rows = (n_sectors + n_cols - 1) // n_cols

        for i, (sector, perf) in enumerate(sorted_sectors):
            row = i // n_cols
            col = i % n_cols

            # Couleur basee sur la performance
            if perf >= 2:
                color = '#00ff88'
            elif perf >= 0:
                color = '#7bed9f'
            elif perf >= -2:
                color = '#ff6b6b'
            else:
                color = '#ff4757'

            # Rectangle
            rect = mpatches.FancyBboxPatch(
                (col * 0.25 + 0.02, 1 - (row + 1) * (1/n_rows) + 0.02),
                0.21, (1/n_rows) - 0.04,
                boxstyle="round,pad=0.02",
                facecolor=color,
                edgecolor='white',
                linewidth=2,
                transform=ax.transAxes
            )
            ax.add_patch(rect)

            # Texte
            ax.text(col * 0.25 + 0.125, 1 - (row + 0.5) * (1/n_rows),
                   f"{sector}\n{perf:+.1f}%",
                   ha='center', va='center',
                   fontsize=12, fontweight='bold',
                   color='white' if abs(perf) > 1 else 'black',
                   transform=ax.transAxes)

        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        ax.set_title('HEATMAP SECTORIELLE (5 jours)', color=self.text_color,
                    fontsize=16, fontweight='bold', pad=20)

        # Legende
        legend_text = "🟢 >2%  🟡 0-2%  🟠 0 a -2%  🔴 <-2%"
        ax.text(0.5, -0.05, legend_text, ha='center', va='top',
               fontsize=10, color=self.text_color, transform=ax.transAxes)

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', facecolor=self.bg_color, dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close(fig)

        return buf, {'sectors': dict(sorted_sectors), 'details': sector_details}

    # ===== FEAR & GREED INDEX =====

    async def fear_greed_gauge(self) -> Tuple[io.BytesIO, Dict]:
        """
        Calcule et affiche le Fear & Greed Index
        Base sur: VIX, S&P500 momentum, Put/Call ratio simule, RSI marche
        """
        indicators = {}

        # 1. VIX (Fear indicator) - inverse
        try:
            vix_data = await market_data_service.get_historical_data('^VIX', period='1mo', interval='1d')
            if vix_data is not None:
                vix = vix_data['Close'].iloc[-1]
                vix_avg = vix_data['Close'].mean()
                # VIX bas = greed, VIX haut = fear
                vix_score = max(0, min(100, 100 - (vix / vix_avg * 50)))
                indicators['VIX'] = {'value': vix, 'score': vix_score}
        except:
            pass

        # 2. S&P 500 Momentum
        try:
            sp_data = await market_data_service.get_historical_data('^GSPC', period='3mo', interval='1d')
            if sp_data is not None:
                current = sp_data['Close'].iloc[-1]
                ma50 = sp_data['Close'].tail(50).mean()
                momentum = ((current / ma50) - 1) * 100
                momentum_score = max(0, min(100, 50 + momentum * 5))
                indicators['Momentum'] = {'value': momentum, 'score': momentum_score}
        except:
            pass

        # 3. Market Breadth (simule avec top actifs)
        try:
            advancing = 0
            total = 0
            for symbol in ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ']:
                data = await market_data_service.get_historical_data(symbol, period='5d', interval='1d')
                if data is not None and len(data) >= 2:
                    total += 1
                    if data['Close'].iloc[-1] > data['Close'].iloc[0]:
                        advancing += 1

            if total > 0:
                breadth_score = (advancing / total) * 100
                indicators['Breadth'] = {'value': advancing, 'total': total, 'score': breadth_score}
        except:
            pass

        # 4. RSI S&P 500
        try:
            if sp_data is not None:
                closes = sp_data['Close'].values
                rsi = self._calculate_rsi(closes, 14)
                if len(rsi) > 0:
                    rsi_value = rsi[-1]
                    # RSI > 70 = greed, RSI < 30 = fear
                    rsi_score = max(0, min(100, rsi_value))
                    indicators['RSI'] = {'value': rsi_value, 'score': rsi_score}
        except:
            pass

        # Calculer le score final
        if indicators:
            total_score = sum(ind['score'] for ind in indicators.values()) / len(indicators)
        else:
            total_score = 50

        # Determiner le sentiment
        if total_score >= 75:
            sentiment = 'EXTREME GREED'
            sentiment_color = '#00ff88'
        elif total_score >= 55:
            sentiment = 'GREED'
            sentiment_color = '#7bed9f'
        elif total_score >= 45:
            sentiment = 'NEUTRAL'
            sentiment_color = '#ffd93d'
        elif total_score >= 25:
            sentiment = 'FEAR'
            sentiment_color = '#ff6b6b'
        else:
            sentiment = 'EXTREME FEAR'
            sentiment_color = '#ff4757'

        # Creer le graphique gauge
        fig, ax = plt.subplots(figsize=(10, 6), facecolor=self.bg_color, subplot_kw={'projection': 'polar'})

        # Demi-cercle gauge
        theta = np.linspace(np.pi, 0, 100)

        # Zones de couleur
        colors_zones = ['#ff4757', '#ff6b6b', '#ffd93d', '#7bed9f', '#00ff88']
        for i, color in enumerate(colors_zones):
            start = np.pi - (i * np.pi / 5)
            end = np.pi - ((i + 1) * np.pi / 5)
            theta_zone = np.linspace(start, end, 20)
            ax.fill_between(theta_zone, 0.6, 1, color=color, alpha=0.7)

        # Aiguille
        needle_angle = np.pi - (total_score / 100 * np.pi)
        ax.annotate('', xy=(needle_angle, 0.9), xytext=(needle_angle, 0),
                   arrowprops=dict(arrowstyle='->', color='white', lw=3))

        # Cercle central
        circle = plt.Circle((0, 0), 0.3, transform=ax.transData._b, color=self.bg_color, zorder=10)
        ax.add_artist(circle)

        # Score au centre
        ax.text(0, 0, f'{int(total_score)}', ha='center', va='center',
               fontsize=36, fontweight='bold', color=sentiment_color, zorder=11)

        # Configuration
        ax.set_ylim(0, 1)
        ax.set_theta_zero_location('N')
        ax.set_theta_direction(-1)
        ax.set_thetamin(0)
        ax.set_thetamax(180)
        ax.axis('off')

        # Titre et sentiment
        plt.suptitle('FEAR & GREED INDEX', color=self.text_color, fontsize=18, fontweight='bold', y=0.95)
        ax.text(0, -0.4, sentiment, ha='center', va='center',
               fontsize=20, fontweight='bold', color=sentiment_color,
               transform=ax.transAxes)

        # Labels
        ax.text(-0.15, 0.5, 'FEAR', ha='center', va='center', fontsize=12,
               color='#ff4757', transform=ax.transAxes)
        ax.text(1.15, 0.5, 'GREED', ha='center', va='center', fontsize=12,
               color='#00ff88', transform=ax.transAxes)

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', facecolor=self.bg_color, dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close(fig)

        return buf, {
            'score': total_score,
            'sentiment': sentiment,
            'indicators': indicators
        }

    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> np.ndarray:
        """Calcule le RSI"""
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gains = np.zeros(len(prices))
        avg_losses = np.zeros(len(prices))

        if len(gains) >= period:
            avg_gains[period] = np.mean(gains[:period])
            avg_losses[period] = np.mean(losses[:period])

            for i in range(period + 1, len(prices)):
                avg_gains[i] = (avg_gains[i-1] * (period - 1) + gains[i-1]) / period
                avg_losses[i] = (avg_losses[i-1] * (period - 1) + losses[i-1]) / period

        rs = np.divide(avg_gains, avg_losses, out=np.zeros_like(avg_gains), where=avg_losses != 0)
        rsi = 100 - (100 / (1 + rs))

        return rsi[period:]

    # ===== GENERATION IMAGE POSITION POUR PARTAGE =====

    async def generate_position_card(self, position: Dict) -> io.BytesIO:
        """
        Genere une carte stylisee d'une position pour partage
        """
        fig, ax = plt.subplots(figsize=(8, 5), facecolor=self.bg_color)
        ax.set_facecolor(self.bg_color)
        ax.axis('off')

        # Couleurs selon PnL
        pnl = position.get('pnl', 0)
        pnl_color = '#00ff88' if pnl >= 0 else '#ff4757'
        direction_color = '#00d4ff' if position['direction'] == 'LONG' else '#ff6b6b'

        # Header
        ax.text(0.5, 0.95, 'TDB TRADING BOT', ha='center', va='top',
               fontsize=12, color='#888888', transform=ax.transAxes)

        # Symbol et direction
        ax.text(0.5, 0.82, position['asset_symbol'], ha='center', va='top',
               fontsize=32, fontweight='bold', color=self.text_color, transform=ax.transAxes)

        ax.text(0.5, 0.68, position['direction'], ha='center', va='top',
               fontsize=18, fontweight='bold', color=direction_color, transform=ax.transAxes)

        # Box avec les infos
        box = mpatches.FancyBboxPatch(
            (0.1, 0.15), 0.8, 0.45,
            boxstyle="round,pad=0.02",
            facecolor='#2d2d44',
            edgecolor=pnl_color,
            linewidth=3,
            transform=ax.transAxes
        )
        ax.add_patch(box)

        # Infos dans la box
        info_y = 0.52
        ax.text(0.2, info_y, f"Entree: ${position['entry_price']:,.2f}", ha='left',
               fontsize=14, color=self.text_color, transform=ax.transAxes)
        ax.text(0.2, info_y - 0.1, f"Actuel: ${position.get('current_price', position['entry_price']):,.2f}",
               ha='left', fontsize=14, color=self.text_color, transform=ax.transAxes)
        ax.text(0.2, info_y - 0.2, f"Levier: x{position.get('leverage', 1)}",
               ha='left', fontsize=14, color=self.text_color, transform=ax.transAxes)

        # PnL
        pnl_percent = position.get('pnl_percent', 0)
        ax.text(0.8, info_y - 0.05, f"{pnl_percent:+.2f}%", ha='right',
               fontsize=28, fontweight='bold', color=pnl_color, transform=ax.transAxes)
        ax.text(0.8, info_y - 0.18, f"${pnl:+,.2f}", ha='right',
               fontsize=16, color=pnl_color, transform=ax.transAxes)

        # Footer
        ax.text(0.5, 0.05, f"Paper Trading | {datetime.now().strftime('%d/%m/%Y %H:%M')}",
               ha='center', fontsize=10, color='#888888', transform=ax.transAxes)

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', facecolor=self.bg_color, dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close(fig)

        return buf


# Instance globale
advanced_charts_service = AdvancedChartsService()
