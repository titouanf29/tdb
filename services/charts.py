"""
Service de génération de graphiques
"""
import matplotlib
matplotlib.use('Agg')  # Backend sans interface graphique
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import datetime
import pandas as pd

# Import optionnel de mplfinance
try:
    import mplfinance as mpf
    HAS_MPLFINANCE = True
except ImportError:
    HAS_MPLFINANCE = False
    print("⚠️ mplfinance non installé - Les graphiques chandeliers ne seront pas disponibles")

class ChartService:
    """Service pour générer des graphiques"""

    @staticmethod
    async def generate_candlestick_chart(data, symbol, indicators=None):
        """
        Génère un graphique en chandeliers japonais

        Args:
            data: DataFrame avec colonnes Open, High, Low, Close, Volume
            symbol: Symbole de l'actif
            indicators: Liste d'indicateurs à ajouter

        Returns:
            BytesIO: Image du graphique
        """
        # Si mplfinance n'est pas installé, utiliser un graphique simple
        if not HAS_MPLFINANCE:
            print(f"⚠️ Génération graphique simple pour {symbol} (mplfinance non installé)")
            return await ChartService.generate_line_chart(data, symbol)

        try:
            # Style du graphique
            style = mpf.make_mpf_style(
                base_mpf_style='charles',
                rc={'font.size': 8},
                gridcolor='#2e2e2e',
                facecolor='#1e1e1e',
                figcolor='#1e1e1e',
                edgecolor='#2e2e2e'
            )

            # Préparation des données
            df = data.copy()
            df.index = pd.to_datetime(df.index)

            # Calcul des indicateurs
            addplot = []

            if indicators:
                if 'ema20' in indicators:
                    ema20 = df['Close'].ewm(span=20).mean()
                    addplot.append(mpf.make_addplot(ema20, color='blue', width=1))

                if 'ema50' in indicators:
                    ema50 = df['Close'].ewm(span=50).mean()
                    addplot.append(mpf.make_addplot(ema50, color='orange', width=1))

                if 'ema200' in indicators and len(df) >= 200:
                    ema200 = df['Close'].ewm(span=200).mean()
                    addplot.append(mpf.make_addplot(ema200, color='red', width=1.5))

            # Création du graphique
            fig, axes = mpf.plot(
                df,
                type='candle',
                style=style,
                title=f'\n{symbol}',
                ylabel='Prix',
                volume=True,
                addplot=addplot if addplot else None,
                figsize=(10, 6),
                returnfig=True,
                warn_too_much_data=1000
            )

            # Sauvegarder dans BytesIO
            buf = BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            plt.close(fig)

            return buf

        except Exception as e:
            print(f"Erreur génération graphique: {e}")
            return None

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
