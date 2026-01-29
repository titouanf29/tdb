"""
Service de Cache - Mise en cache des donnees marche
Reduit les appels API et ameliore la latence
"""
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import hashlib
import json


class CacheService:
    """Service de cache en memoire avec TTL"""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0
        }
        # TTL par defaut selon le type de donnees (en secondes)
        self.ttl_config = {
            'price': 30,           # Prix: 30 secondes
            'quote': 60,           # Quote complete: 1 minute
            'history': 300,        # Historique: 5 minutes
            'chart': 300,          # Graphiques: 5 minutes
            'news': 600,           # News: 10 minutes
            'sentiment': 900,      # Sentiment: 15 minutes
            'fear_greed': 3600,    # Fear & Greed: 1 heure
            'heatmap': 300,        # Heatmap: 5 minutes
            'default': 120         # Defaut: 2 minutes
        }
        self._cleanup_task = None

    def _generate_key(self, category: str, identifier: str, **params) -> str:
        """Genere une cle de cache unique"""
        params_str = json.dumps(params, sort_keys=True) if params else ""
        raw_key = f"{category}:{identifier}:{params_str}"
        return hashlib.md5(raw_key.encode()).hexdigest()

    async def get(self, category: str, identifier: str, **params) -> Optional[Any]:
        """Recupere une valeur du cache"""
        key = self._generate_key(category, identifier, **params)

        if key in self._cache:
            entry = self._cache[key]
            if datetime.now() < entry['expires']:
                self._stats['hits'] += 1
                return entry['value']
            else:
                # Expire, supprimer
                del self._cache[key]

        self._stats['misses'] += 1
        return None

    async def set(self, category: str, identifier: str, value: Any,
                  ttl: Optional[int] = None, **params):
        """Stocke une valeur dans le cache"""
        key = self._generate_key(category, identifier, **params)

        if ttl is None:
            ttl = self.ttl_config.get(category, self.ttl_config['default'])

        self._cache[key] = {
            'value': value,
            'expires': datetime.now() + timedelta(seconds=ttl),
            'category': category,
            'identifier': identifier
        }
        self._stats['sets'] += 1

    async def delete(self, category: str, identifier: str, **params):
        """Supprime une entree du cache"""
        key = self._generate_key(category, identifier, **params)
        if key in self._cache:
            del self._cache[key]

    async def clear_category(self, category: str):
        """Vide toutes les entrees d'une categorie"""
        keys_to_delete = [
            key for key, entry in self._cache.items()
            if entry.get('category') == category
        ]
        for key in keys_to_delete:
            del self._cache[key]

    async def clear_all(self):
        """Vide tout le cache"""
        self._cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du cache"""
        total_requests = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total_requests * 100) if total_requests > 0 else 0

        return {
            'hits': self._stats['hits'],
            'misses': self._stats['misses'],
            'sets': self._stats['sets'],
            'hit_rate': f"{hit_rate:.1f}%",
            'entries': len(self._cache),
            'categories': self._count_by_category()
        }

    def _count_by_category(self) -> Dict[str, int]:
        """Compte les entrees par categorie"""
        counts = {}
        for entry in self._cache.values():
            cat = entry.get('category', 'unknown')
            counts[cat] = counts.get(cat, 0) + 1
        return counts

    async def cleanup_expired(self):
        """Nettoie les entrees expirees"""
        now = datetime.now()
        keys_to_delete = [
            key for key, entry in self._cache.items()
            if now >= entry['expires']
        ]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)

    async def start_cleanup_task(self, interval: int = 60):
        """Demarre la tache de nettoyage periodique"""
        async def cleanup_loop():
            while True:
                await asyncio.sleep(interval)
                await self.cleanup_expired()

        self._cleanup_task = asyncio.create_task(cleanup_loop())

    async def stop_cleanup_task(self):
        """Arrete la tache de nettoyage"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass


class CachedMarketData:
    """Wrapper pour les appels marche avec cache"""

    def __init__(self, cache: CacheService, market_api):
        self.cache = cache
        self.api = market_api

    async def get_price(self, symbol: str) -> Optional[float]:
        """Recupere le prix avec cache"""
        cached = await self.cache.get('price', symbol)
        if cached is not None:
            return cached

        # Appel API reel
        price = await self.api.get_price(symbol)
        if price:
            await self.cache.set('price', symbol, price)
        return price

    async def get_quote(self, symbol: str) -> Optional[Dict]:
        """Recupere la quote complete avec cache"""
        cached = await self.cache.get('quote', symbol)
        if cached is not None:
            return cached

        quote = await self.api.get_quote(symbol)
        if quote:
            await self.cache.set('quote', symbol, quote)
        return quote

    async def get_history(self, symbol: str, period: str = '1mo',
                          interval: str = '1d') -> Optional[Any]:
        """Recupere l'historique avec cache"""
        cached = await self.cache.get('history', symbol, period=period, interval=interval)
        if cached is not None:
            return cached

        history = await self.api.get_history(symbol, period, interval)
        if history is not None:
            await self.cache.set('history', symbol, history, period=period, interval=interval)
        return history

    async def get_multiple_prices(self, symbols: list) -> Dict[str, float]:
        """Recupere plusieurs prix avec cache"""
        results = {}
        symbols_to_fetch = []

        # Verifier le cache d'abord
        for symbol in symbols:
            cached = await self.cache.get('price', symbol)
            if cached is not None:
                results[symbol] = cached
            else:
                symbols_to_fetch.append(symbol)

        # Fetch les manquants
        if symbols_to_fetch:
            fetched = await self.api.get_multiple_prices(symbols_to_fetch)
            for symbol, price in fetched.items():
                results[symbol] = price
                await self.cache.set('price', symbol, price)

        return results


# Instance globale
cache_service = CacheService()
