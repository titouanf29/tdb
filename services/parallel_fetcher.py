"""
Service de récupération parallèle des données de marché
Utilise asyncio.gather() pour optimiser les appels API
Intégré avec le cache centralisé
"""
import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import yfinance as yf
import pandas as pd
from services.cache_service import cache_service

logger = logging.getLogger(__name__)

# Pool de threads pour les appels yfinance (qui sont synchrones)
_executor = ThreadPoolExecutor(max_workers=10)


class ParallelFetcher:
    """Service de récupération parallèle des données de marché"""

    def __init__(self, max_concurrent: int = 10, timeout: float = 30.0):
        """
        Initialise le fetcher parallèle

        Args:
            max_concurrent: Nombre maximum de requêtes simultanées
            timeout: Timeout en secondes pour chaque requête
        """
        self.max_concurrent = max_concurrent
        self.timeout = timeout
        self.semaphore = asyncio.Semaphore(max_concurrent)

    def _fetch_sync(self, symbol: str, period: str = "1d", interval: str = "1m") -> Optional[pd.DataFrame]:
        """
        Récupère les données d'un symbole (synchrone)
        Appelé dans le thread pool
        """
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period, interval=interval)
            return data if not data.empty else None
        except Exception as e:
            logger.warning(f"Erreur fetch {symbol}: {e}")
            return None

    def _get_info_sync(self, symbol: str) -> Dict:
        """Récupère les informations d'un symbole (synchrone)"""
        try:
            ticker = yf.Ticker(symbol)
            return ticker.info or {}
        except Exception as e:
            logger.warning(f"Erreur info {symbol}: {e}")
            return {}

    async def fetch_single(
        self,
        symbol: str,
        period: str = "1d",
        interval: str = "1m"
    ) -> Optional[pd.DataFrame]:
        """
        Récupère les données d'un seul symbole de manière asynchrone

        Args:
            symbol: Symbole de l'actif
            period: Période (1d, 5d, 1mo, etc.)
            interval: Intervalle (1m, 5m, 1h, 1d, etc.)

        Returns:
            DataFrame avec les données ou None
        """
        # Vérifier le cache centralisé
        cache_category = 'history_daily' if interval == '1d' else 'history'
        cached = await cache_service.get(cache_category, symbol, period=period, interval=interval)
        if cached is not None:
            logger.debug(f"Cache hit pour {symbol}")
            return cached

        async with self.semaphore:
            try:
                loop = asyncio.get_event_loop()
                data = await asyncio.wait_for(
                    loop.run_in_executor(_executor, self._fetch_sync, symbol, period, interval),
                    timeout=self.timeout
                )

                # Mettre en cache centralisé
                if data is not None:
                    await cache_service.set(cache_category, symbol, data, period=period, interval=interval)

                return data

            except asyncio.TimeoutError:
                logger.warning(f"Timeout fetch {symbol}")
                return None
            except Exception as e:
                logger.error(f"Erreur fetch {symbol}: {e}")
                return None

    async def fetch_multiple(
        self,
        symbols: List[str],
        period: str = "1d",
        interval: str = "1m"
    ) -> Dict[str, Optional[pd.DataFrame]]:
        """
        Récupère les données de plusieurs symboles en parallèle

        Args:
            symbols: Liste des symboles
            period: Période
            interval: Intervalle

        Returns:
            Dictionnaire {symbol: DataFrame}
        """
        logger.info(f"Fetch parallèle de {len(symbols)} symboles")
        start_time = datetime.now()

        # Créer les tâches
        tasks = [self.fetch_single(symbol, period, interval) for symbol in symbols]

        # Exécuter en parallèle
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Construire le dictionnaire de résultats
        data_dict = {}
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.warning(f"Exception pour {symbol}: {result}")
                data_dict[symbol] = None
            else:
                data_dict[symbol] = result

        elapsed = (datetime.now() - start_time).total_seconds()
        success_count = sum(1 for v in data_dict.values() if v is not None)
        logger.info(f"Fetch terminé: {success_count}/{len(symbols)} réussis en {elapsed:.2f}s")

        return data_dict

    async def get_current_prices(self, symbols: List[str]) -> Dict[str, Optional[float]]:
        """
        Récupère les prix actuels de plusieurs symboles

        Args:
            symbols: Liste des symboles

        Returns:
            Dictionnaire {symbol: prix}
        """
        data_dict = await self.fetch_multiple(symbols, period="1d", interval="1m")

        prices = {}
        for symbol, data in data_dict.items():
            if data is not None and not data.empty:
                prices[symbol] = float(data['Close'].iloc[-1])
            else:
                prices[symbol] = None

        return prices

    async def get_multiple_info(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Récupère les informations de plusieurs symboles en parallèle

        Args:
            symbols: Liste des symboles

        Returns:
            Dictionnaire {symbol: info_dict}
        """
        async def get_info_async(symbol: str) -> tuple:
            async with self.semaphore:
                try:
                    loop = asyncio.get_event_loop()
                    info = await asyncio.wait_for(
                        loop.run_in_executor(_executor, self._get_info_sync, symbol),
                        timeout=self.timeout
                    )
                    return symbol, info
                except Exception as e:
                    logger.warning(f"Erreur info {symbol}: {e}")
                    return symbol, {}

        tasks = [get_info_async(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks)

        return dict(results)

    async def analyze_multiple(
        self,
        symbols: List[str],
        analyzer_func,
        **kwargs
    ) -> List[Dict]:
        """
        Analyse plusieurs symboles en parallèle avec une fonction d'analyse

        Args:
            symbols: Liste des symboles
            analyzer_func: Fonction d'analyse async(symbol, data) -> result
            **kwargs: Arguments supplémentaires pour la fonction

        Returns:
            Liste des résultats d'analyse
        """
        # D'abord récupérer toutes les données en parallèle
        data_dict = await self.fetch_multiple(symbols, period="1mo", interval="1d")

        # Puis analyser en parallèle
        async def analyze_single(symbol: str) -> Dict:
            data = data_dict.get(symbol)
            if data is None or data.empty:
                return {'symbol': symbol, 'error': 'No data'}

            try:
                result = await analyzer_func(symbol, data, **kwargs)
                return result
            except Exception as e:
                logger.error(f"Erreur analyse {symbol}: {e}")
                return {'symbol': symbol, 'error': str(e)}

        tasks = [analyze_single(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks)

        return results

    async def clear_cache(self):
        """Vide le cache centralisé"""
        await cache_service.clear_all()
        logger.info("Cache vidé")

    def get_cache_stats(self) -> Dict:
        """Retourne les statistiques du cache centralisé"""
        stats = cache_service.get_stats()
        stats['max_concurrent'] = self.max_concurrent
        return stats


# Instance globale
parallel_fetcher = ParallelFetcher()


# Fonctions utilitaires
async def fetch_prices_parallel(symbols: List[str]) -> Dict[str, Optional[float]]:
    """Raccourci pour récupérer les prix en parallèle"""
    return await parallel_fetcher.get_current_prices(symbols)


async def fetch_data_parallel(
    symbols: List[str],
    period: str = "1d",
    interval: str = "1m"
) -> Dict[str, Optional[pd.DataFrame]]:
    """Raccourci pour récupérer les données en parallèle"""
    return await parallel_fetcher.fetch_multiple(symbols, period, interval)
