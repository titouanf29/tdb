"""
Service de récupération des données de marché
Avec cache intégré et rate limiting pour réduire les appels API
"""
import logging
import asyncio
import yfinance as yf
from datetime import datetime, timedelta
import config
from services.cache_service import cache_service
from utils.rate_limiter import rate_limiter
from utils.error_handler import ErrorHandler, ErrorSeverity

logger = logging.getLogger(__name__)


class MarketDataService:
    """Service pour récupérer les données de marché"""

    @staticmethod
    async def get_asset_data(symbol, period="1mo", interval="1d"):
        """Récupère les données d'un actif (avec cache et rate limiting)"""
        # Vérifier le cache
        cache_category = 'history_daily' if interval == '1d' else 'history'
        cached = await cache_service.get(cache_category, symbol, period=period, interval=interval)
        if cached is not None:
            return cached

        # Acquérir le rate limit avant l'appel API
        if not await rate_limiter.acquire("yfinance", timeout=10.0):
            ErrorHandler.log_error(
                Exception("Rate limit yfinance atteint"),
                f"get_asset_data({symbol})",
                ErrorSeverity.MEDIUM
            )
            return None

        try:
            # Exécuter dans un thread pour ne pas bloquer l'event loop
            loop = asyncio.get_event_loop()
            ticker = yf.Ticker(symbol)
            data = await loop.run_in_executor(
                None,
                lambda: ticker.history(period=period, interval=interval)
            )
            if not data.empty:
                rate_limiter.record_success("yfinance")
                await cache_service.set(cache_category, symbol, data, period=period, interval=interval)
                return data
            return None
        except Exception as e:
            rate_limiter.record_error("yfinance", e)
            ErrorHandler.log_error(e, f"get_asset_data({symbol})", ErrorSeverity.MEDIUM)
            return None

    @staticmethod
    async def get_current_price(symbol):
        """Récupère le prix actuel d'un actif (avec cache 30s et rate limiting)"""
        # Vérifier le cache
        cached = await cache_service.get('price', symbol)
        if cached is not None:
            return cached

        # Acquérir le rate limit
        if not await rate_limiter.acquire("yfinance", timeout=5.0):
            logger.debug(f"Rate limit yfinance, skip prix {symbol}")
            return None

        try:
            loop = asyncio.get_event_loop()
            ticker = yf.Ticker(symbol)
            data = await loop.run_in_executor(
                None,
                lambda: ticker.history(period="1d", interval="1m")
            )
            if not data.empty:
                price = float(data['Close'].iloc[-1])
                rate_limiter.record_success("yfinance")
                await cache_service.set('price', symbol, price)
                return price
            return None
        except Exception as e:
            rate_limiter.record_error("yfinance", e)
            ErrorHandler.log_error(e, f"get_current_price({symbol})", ErrorSeverity.LOW)
            return None

    @staticmethod
    async def get_asset_info(symbol):
        """Récupère les informations d'un actif (avec cache 1h et rate limiting)"""
        # Vérifier le cache
        cached = await cache_service.get('info', symbol)
        if cached is not None:
            return cached

        # Acquérir le rate limit
        if not await rate_limiter.acquire("yfinance", timeout=5.0):
            return {}

        try:
            loop = asyncio.get_event_loop()
            ticker = yf.Ticker(symbol)
            info = await loop.run_in_executor(None, lambda: ticker.info)
            if info:
                rate_limiter.record_success("yfinance")
                await cache_service.set('info', symbol, info)
            return info
        except Exception as e:
            rate_limiter.record_error("yfinance", e)
            ErrorHandler.log_error(e, f"get_asset_info({symbol})", ErrorSeverity.LOW)
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
        """Recherche un symbole (avec cache 30min et rate limiting)"""
        query_upper = query.upper()

        # Vérifier le cache
        cached = await cache_service.get('search', query_upper)
        if cached is not None:
            return cached

        # Acquérir le rate limit
        if not await rate_limiter.acquire("yfinance", timeout=5.0):
            return None

        try:
            loop = asyncio.get_event_loop()
            ticker = yf.Ticker(query_upper)
            info = await loop.run_in_executor(None, lambda: ticker.info)
            if info:
                rate_limiter.record_success("yfinance")
                result = {
                    'symbol': query_upper,
                    'name': info.get('shortName', query),
                    'currency': info.get('currency', 'USD')
                }
                await cache_service.set('search', query_upper, result)
                return result
        except Exception as e:
            rate_limiter.record_error("yfinance", e)
            logger.debug(f"Symbole non trouvé '{query}': {e}")
        return None

    @staticmethod
    async def get_historical_data(symbol, period="1mo", interval="1d"):
        """
        Récupère les données historiques d'un actif (avec cache et rate limiting)

        Args:
            symbol: Symbole de l'actif
            period: Période (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Intervalle (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

        Returns:
            DataFrame avec les données OHLCV ou None
        """
        # Vérifier le cache
        cache_category = 'history_daily' if interval == '1d' else 'history'
        cached = await cache_service.get(cache_category, symbol, period=period, interval=interval)
        if cached is not None:
            return cached

        # Acquérir le rate limit
        if not await rate_limiter.acquire("yfinance", timeout=10.0):
            ErrorHandler.log_error(
                Exception("Rate limit yfinance"),
                f"get_historical_data({symbol})",
                ErrorSeverity.MEDIUM
            )
            return None

        try:
            loop = asyncio.get_event_loop()
            ticker = yf.Ticker(symbol)
            data = await loop.run_in_executor(
                None,
                lambda: ticker.history(period=period, interval=interval)
            )
            if not data.empty:
                rate_limiter.record_success("yfinance")
                await cache_service.set(cache_category, symbol, data, period=period, interval=interval)
                return data
            logger.warning(f"Pas de données historiques pour {symbol}")
            return None
        except Exception as e:
            rate_limiter.record_error("yfinance", e)
            ErrorHandler.log_error(e, f"get_historical_data({symbol})", ErrorSeverity.MEDIUM)
            return None


    @staticmethod
    def get_cache_stats():
        """Retourne les statistiques du cache"""
        return cache_service.get_stats()


# Instance globale
market_data_service = MarketDataService()
