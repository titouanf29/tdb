"""
Rate Limiter pour les API externes (yfinance, Groq, etc.)
Protège contre les timeouts silencieux et le throttling
"""
import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable
from functools import wraps

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration du rate limiting"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    timeout_seconds: float = 30.0
    retry_count: int = 3
    retry_delay_base: float = 1.0  # Délai de base pour backoff exponentiel
    cooldown_on_error: float = 5.0  # Pause après erreur


class TokenBucket:
    """Implémentation du token bucket pour le rate limiting"""

    def __init__(self, rate: float, capacity: int):
        """
        Args:
            rate: Tokens par seconde à ajouter
            capacity: Capacité maximale du bucket
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: int = 1, timeout: float = None) -> bool:
        """
        Acquiert des tokens, bloque si nécessaire

        Args:
            tokens: Nombre de tokens requis
            timeout: Timeout en secondes (None = pas de timeout)

        Returns:
            True si les tokens ont été acquis, False si timeout
        """
        async with self._lock:
            start = time.monotonic()

            while True:
                # Mettre à jour les tokens disponibles
                now = time.monotonic()
                elapsed = now - self.last_update
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                self.last_update = now

                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return True

                # Vérifier le timeout
                if timeout is not None and (now - start) >= timeout:
                    return False

                # Calculer le temps d'attente
                wait_time = (tokens - self.tokens) / self.rate
                if timeout is not None:
                    wait_time = min(wait_time, timeout - (now - start))

                await asyncio.sleep(min(wait_time, 0.1))

    def available(self) -> float:
        """Retourne le nombre de tokens disponibles"""
        now = time.monotonic()
        elapsed = now - self.last_update
        return min(self.capacity, self.tokens + elapsed * self.rate)


class RateLimiter:
    """Gestionnaire de rate limiting pour les API"""

    def __init__(self):
        self._buckets: Dict[str, TokenBucket] = {}
        self._error_cooldowns: Dict[str, float] = {}
        self._stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {
            'requests': 0,
            'success': 0,
            'errors': 0,
            'rate_limited': 0,
            'timeouts': 0
        })
        self._configs: Dict[str, RateLimitConfig] = {}

    def configure(self, service_name: str, config: RateLimitConfig):
        """Configure le rate limiting pour un service"""
        self._configs[service_name] = config
        # Créer le bucket avec le rate par seconde
        rate = config.requests_per_minute / 60.0
        self._buckets[service_name] = TokenBucket(rate, config.requests_per_minute)
        logger.info(f"Rate limiter configuré pour {service_name}: "
                   f"{config.requests_per_minute} req/min")

    def _get_bucket(self, service_name: str) -> TokenBucket:
        """Récupère ou crée un bucket pour un service"""
        if service_name not in self._buckets:
            # Configuration par défaut
            self.configure(service_name, RateLimitConfig())
        return self._buckets[service_name]

    def _get_config(self, service_name: str) -> RateLimitConfig:
        """Récupère ou crée une config pour un service"""
        if service_name not in self._configs:
            self.configure(service_name, RateLimitConfig())
        return self._configs[service_name]

    async def acquire(self, service_name: str, timeout: float = None) -> bool:
        """
        Acquiert un slot pour effectuer une requête

        Args:
            service_name: Nom du service (ex: "yfinance", "groq")
            timeout: Timeout en secondes

        Returns:
            True si la requête peut être effectuée
        """
        # Vérifier le cooldown après erreur
        cooldown_until = self._error_cooldowns.get(service_name, 0)
        if time.monotonic() < cooldown_until:
            wait_time = cooldown_until - time.monotonic()
            logger.debug(f"{service_name}: En cooldown, attente {wait_time:.1f}s")
            await asyncio.sleep(wait_time)

        bucket = self._get_bucket(service_name)
        config = self._get_config(service_name)
        timeout = timeout or config.timeout_seconds

        result = await bucket.acquire(timeout=timeout)

        self._stats[service_name]['requests'] += 1
        if not result:
            self._stats[service_name]['rate_limited'] += 1
            logger.warning(f"{service_name}: Rate limited (timeout={timeout}s)")

        return result

    def record_success(self, service_name: str):
        """Enregistre une requête réussie"""
        self._stats[service_name]['success'] += 1

    def record_error(self, service_name: str, error: Exception = None):
        """Enregistre une erreur et active le cooldown"""
        self._stats[service_name]['errors'] += 1
        config = self._get_config(service_name)

        # Activer le cooldown
        self._error_cooldowns[service_name] = time.monotonic() + config.cooldown_on_error

        error_type = type(error).__name__ if error else "Unknown"
        logger.warning(f"{service_name}: Erreur ({error_type}), cooldown {config.cooldown_on_error}s")

    def record_timeout(self, service_name: str):
        """Enregistre un timeout"""
        self._stats[service_name]['timeouts'] += 1
        self.record_error(service_name)

    def get_stats(self, service_name: str = None) -> Dict[str, Any]:
        """Retourne les statistiques de rate limiting"""
        if service_name:
            stats = dict(self._stats[service_name])
            bucket = self._buckets.get(service_name)
            if bucket:
                stats['available_tokens'] = bucket.available()
            return stats
        return dict(self._stats)

    def is_healthy(self, service_name: str) -> bool:
        """Vérifie si un service est en bonne santé"""
        stats = self._stats[service_name]
        if stats['requests'] < 10:
            return True  # Pas assez de données
        error_rate = (stats['errors'] + stats['timeouts']) / stats['requests']
        return error_rate < 0.3  # Moins de 30% d'erreurs


def rate_limited(service_name: str, timeout: float = None,
                 retries: int = 3, backoff_base: float = 1.0):
    """
    Décorateur pour appliquer le rate limiting à une fonction

    Args:
        service_name: Nom du service
        timeout: Timeout par requête
        retries: Nombre de tentatives en cas d'erreur
        backoff_base: Délai de base pour le backoff exponentiel

    Example:
        @rate_limited("yfinance", timeout=30, retries=3)
        async def get_stock_data(symbol):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None

            for attempt in range(retries + 1):
                # Acquérir le rate limit
                if not await rate_limiter.acquire(service_name, timeout):
                    logger.warning(f"{service_name}: Rate limit atteint pour {func.__name__}")
                    continue

                try:
                    # Exécuter avec timeout
                    effective_timeout = timeout or 30.0
                    result = await asyncio.wait_for(
                        func(*args, **kwargs),
                        timeout=effective_timeout
                    )
                    rate_limiter.record_success(service_name)
                    return result

                except asyncio.TimeoutError:
                    rate_limiter.record_timeout(service_name)
                    last_error = asyncio.TimeoutError(
                        f"Timeout après {timeout}s pour {func.__name__}"
                    )
                    logger.warning(f"{service_name}: Timeout {func.__name__} (tentative {attempt + 1}/{retries + 1})")

                except Exception as e:
                    rate_limiter.record_error(service_name, e)
                    last_error = e
                    logger.warning(f"{service_name}: Erreur {func.__name__}: {e} "
                                 f"(tentative {attempt + 1}/{retries + 1})")

                # Backoff exponentiel avant retry
                if attempt < retries:
                    delay = backoff_base * (2 ** attempt)
                    await asyncio.sleep(delay)

            # Toutes les tentatives ont échoué
            logger.error(f"{service_name}: Échec définitif {func.__name__} après {retries + 1} tentatives")
            if last_error:
                raise last_error
            return None

        return wrapper
    return decorator


# Instance globale
rate_limiter = RateLimiter()

# Configurer les services par défaut
rate_limiter.configure("yfinance", RateLimitConfig(
    requests_per_minute=30,  # yfinance est sensible au rate limiting
    requests_per_hour=500,
    timeout_seconds=15.0,
    retry_count=2,
    cooldown_on_error=3.0
))

rate_limiter.configure("groq", RateLimitConfig(
    requests_per_minute=20,  # Limite Groq free tier
    requests_per_hour=100,   # ~6000/jour = ~250/h avec marge
    timeout_seconds=30.0,
    retry_count=2,
    cooldown_on_error=5.0
))

rate_limiter.configure("news", RateLimitConfig(
    requests_per_minute=10,
    requests_per_hour=100,
    timeout_seconds=10.0,
    retry_count=1,
    cooldown_on_error=10.0
))
