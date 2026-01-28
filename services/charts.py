"""
Service de generation de graphiques professionnels
"""
import matplotlib
matplotlib.use('Agg')  # Backend sans interface graphique
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import FancyBboxPatch
from io import BytesIO
from datetime import datetime
import pandas as pd
import numpy as np

# Import optionnel de mplfinance
try:
    import mplfinance as mpf
    HAS_MPLFINANCE = True
except ImportError:
    HAS_MPLFINANCE = False
    print("mplfinance non installe - Les graphiques chandeliers ne seront pas disponibles")


# Configuration des intervalles disponibles
CHART_INTERVALS = {
    '1D': {'period': '5d', 'interval': '15m', 'label': '1 Jour'},
    '1W': {'period': '1mo', 'interval': '1h', 'label': '1 Semaine'},
    '1M': {'period': '3mo', 'interval': '1d', 'label': '1 Mois'},
    '3M': {'period': '6mo', 'interval': '1d', 'label': '3 Mois'},
    '1Y': {'period': '1y', 'interval': '1wk', 'label': '1 An'},
    'MAX': {'period': 'max', 'interval': '1mo', 'label': 'Maximum'},
}

class ChartService:
    """Service pour generer des graphiques professionnels"""

    @staticmethod
    def calculate_rsi(data, period=14):
        """Calcule le RSI"""
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    @staticmethod
    async def generate_candlestick_chart(data, symbol, indicators=None, interval_label='1M', show_rsi=True):
        """
        Genere un graphique en chandeliers japonais professionnel

        Args:
            data: DataFrame avec colonnes Open, High, Low, Close, Volume
            symbol: Symbole de l'actif
            indicators: Liste d'indicateurs a ajouter
            interval_label: Label de l'intervalle (ex: "1 Mois")
            show_rsi: Afficher le RSI en panneau inferieur

        Returns:
            BytesIO: Image du graphique
        """
        # Si mplfinance n'est pas installe, utiliser un graphique simple
        if not HAS_MPLFINANCE:
            return await ChartService.generate_line_chart(data, symbol)

        try:
            # Preparation des donnees
            df = data.copy()
            df.index = pd.to_datetime(df.index)

            # Calculer variation
            if len(df) > 0:
                first_price = df['Close'].iloc[0]
                last_price = df['Close'].iloc[-1]
                variation = ((last_price - first_price) / first_price) * 100
                variation_str = f"+{variation:.2f}%" if variation >= 0 else f"{variation:.2f}%"
                variation_color = '#00ff88' if variation >= 0 else '#ff4444'
            else:
                variation_str = ""
                variation_color = 'white'

            # Style du graphique - theme sombre professionnel
            mc = mpf.make_marketcolors(
                up='#00ff88', down='#ff4444',
                edge='inherit',
                wick='inherit',
                volume={'up': '#00ff88', 'down': '#ff4444'}
            )

            style = mpf.make_mpf_style(
                base_mpf_style='nightclouds',
                marketcolors=mc,
                rc={
                    'font.size': 9,
                    'axes.labelcolor': 'white',
                    'axes.titlecolor': 'white',
                    'xtick.color': 'white',
                    'ytick.color': 'white',
                },
                gridcolor='#333333',
                facecolor='#0d1117',
                figcolor='#0d1117',
                gridstyle='--',
                y_on_right=True
            )

            # Calcul des indicateurs
            addplot = []

            if indicators:
                if 'ema20' in indicators and len(df) >= 20:
                    ema20 = df['Close'].ewm(span=20).mean()
                    addplot.append(mpf.make_addplot(ema20, color='#3498db', width=1.2, label='EMA20'))

                if 'ema50' in indicators and len(df) >= 50:
                    ema50 = df['Close'].ewm(span=50).mean()
                    addplot.append(mpf.make_addplot(ema50, color='#f39c12', width=1.2, label='EMA50'))

                if 'ema200' in indicators and len(df) >= 200:
                    ema200 = df['Close'].ewm(span=200).mean()
                    addplot.append(mpf.make_addplot(ema200, color='#e74c3c', width=1.5, label='EMA200'))

            # Ajouter RSI si demande
            panel_ratios = [3, 1]  # Prix + Volume par defaut
            if show_rsi and len(df) >= 14:
                rsi = ChartService.calculate_rsi(df)
                addplot.append(mpf.make_addplot(rsi, panel=2, color='#9b59b6', width=1.2, ylabel='RSI'))
                # Lignes de surachat/survente
                addplot.append(mpf.make_addplot([70] * len(df), panel=2, color='#ff4444', linestyle='--', width=0.8))
                addplot.append(mpf.make_addplot([30] * len(df), panel=2, color='#00ff88', linestyle='--', width=0.8))
                panel_ratios = [4, 1, 1.5]  # Prix + Volume + RSI

            # Creation du graphique
            fig, axes = mpf.plot(
                df,
                type='candle',
                style=style,
                title=f'\n{symbol}  |  {interval_label}  |  {variation_str}',
                ylabel='',
                volume=True,
                addplot=addplot if addplot else None,
                figsize=(12, 8),
                returnfig=True,
                warn_too_much_data=2000,
                panel_ratios=panel_ratios
            )

            # Ajouter prix actuel et info
            if len(df) > 0:
                current_price = df['Close'].iloc[-1]
                fig.text(0.99, 0.96, f'{current_price:,.2f}', fontsize=14, color=variation_color,
                        ha='right', va='top', fontweight='bold', transform=fig.transFigure)

            # Sauvegarder dans BytesIO
            buf = BytesIO()
            fig.savefig(buf, format='png', dpi=120, bbox_inches='tight',
                       facecolor='#0d1117', edgecolor='none')
            buf.seek(0)
            plt.close(fig)

            return buf

        except Exception as e:
            print(f"Erreur generation graphique chandelier: {e}")
            # Fallback vers graphique simple
            return await ChartService.generate_line_chart(data, symbol)

    @staticmethod
    async def generate_line_chart(data, symbol, column='Close'):
        """
        Génère un graphique en ligne simple

        Args:
            data: DataFrame
            symbol: Symbole
            column: Colonne à afficher

        Returns:
            BytesIO: Image du graphique
        """
        try:
            fig, ax = plt.subplots(figsize=(10, 5), facecolor='#1e1e1e')
            ax.set_facecolor('#1e1e1e')

            # Tracer la ligne
            ax.plot(data.index, data[column], color='#00ff88', linewidth=2)

            # Style
            ax.set_title(f'{symbol} - {column}', color='white', fontsize=14)
            ax.set_xlabel('Date', color='white')
            ax.set_ylabel('Prix', color='white')
            ax.tick_params(colors='white')
            ax.grid(True, alpha=0.2, color='white')

            # Sauvegarder
            buf = BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1e1e1e')
            buf.seek(0)
            plt.close(fig)

            return buf

        except Exception as e:
            print(f"Erreur génération graphique ligne: {e}")
            return None

    @staticmethod
    async def generate_performance_chart(positions_history):
        """
        Génère un graphique de performance du portefeuille

        Args:
            positions_history: Liste des positions historiques

        Returns:
            BytesIO: Image du graphique
        """
        try:
            if not positions_history:
                return None

            # Créer DataFrame
            df = pd.DataFrame(positions_history)
            df['closed_at'] = pd.to_datetime(df['closed_at'])
            df = df.sort_values('closed_at')

            # Calculer PnL cumulé
            df['cumulative_pnl'] = df['pnl'].cumsum()

            # Graphique
            fig, ax = plt.subplots(figsize=(10, 5), facecolor='#1e1e1e')
            ax.set_facecolor('#1e1e1e')

            # Tracer
            color = '#00ff88' if df['cumulative_pnl'].iloc[-1] >= 0 else '#ff0044'
            ax.plot(df['closed_at'], df['cumulative_pnl'], color=color, linewidth=2)
            ax.fill_between(df['closed_at'], 0, df['cumulative_pnl'], alpha=0.3, color=color)

            # Style
            ax.set_title('Performance du Portefeuille', color='white', fontsize=14)
            ax.set_xlabel('Date', color='white')
            ax.set_ylabel('PnL Cumulé', color='white')
            ax.tick_params(colors='white')
            ax.grid(True, alpha=0.2, color='white')
            ax.axhline(y=0, color='white', linestyle='--', alpha=0.5)

            # Sauvegarder
            buf = BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1e1e1e')
            buf.seek(0)
            plt.close(fig)

            return buf

        except Exception as e:
            print(f"Erreur génération graphique performance: {e}")
            return None

# Instance globale
chart_service = ChartService()
