"""
Service de récupération des données de marché
"""
import yfinance as yf
from datetime import datetime, timedelta
import config

class MarketDataService:
    """Service pour récupérer les données de marché"""

    @staticmethod
    async def get_asset_data(symbol, period="1mo", interval="1d"):
        """Récupère les données d'un actif"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period, interval=interval)
            return data if not data.empty else None
        except Exception as e:
            print(f"Erreur récupération données {symbol}: {e}")
            return None

    @staticmethod
    async def get_current_price(symbol):
        """Récupère le prix actuel d'un actif"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1d", interval="1m")
            if not data.empty:
                return float(data['Close'].iloc[-1])
            return None
        except:
            return None

    @staticmethod
    async def get_asset_info(symbol):
        """Récupère les informations d'un actif"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            return info
        except:
            return {}

    @staticmethod
    async def get_market_assets(market_code):
        """Récupère les actifs d'un marché"""
        market = config.MARKETS.get(market_code)
        if not market:
            return []
        return market.get('assets', [])

    @staticmethod
    async def search_symbol(query):
        """Recherche un symbole"""
        # Cette fonction pourrait utiliser une API de recherche
        # Pour l'instant, retourne une recherche basique
        try:
            ticker = yf.Ticker(query.upper())
            info = ticker.info
            if info:
                return {
                    'symbol': query.upper(),
                    'name': info.get('shortName', query),
                    'currency': info.get('currency', 'USD')
                }
        except:
            pass
        return None

# Instance globale
market_data_service = MarketDataService()
