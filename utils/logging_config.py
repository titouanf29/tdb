"""
Configuration centralisée du logging pour TDB Bot
Supporte les logs structurés (JSON) pour meilleur debugging
"""
import logging
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import traceback
import config


def setup_logging(name: str = None) -> logging.Logger:
    """
    Configure et retourne un logger pour un module.

    Args:
        name: Nom du module (utiliser __name__)

    Returns:
        Logger configuré
    """
    logger = logging.getLogger(name or __name__)

    # Ne pas reconfigurer si déjà fait
    if logger.handlers:
        return logger

    # Niveau de log depuis la config
    level = getattr(logging, config.LOG_LEVEL, logging.INFO)
    logger.setLevel(level)

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Raccourci pour obtenir un logger configuré.

    Args:
        name: Nom du module (typiquement __name__)

    Returns:
        Logger configuré
    """
    return setup_logging(name)


class LoggerMixin:
    """
    Mixin pour ajouter un logger à une classe.

    Usage:
        class MyClass(LoggerMixin):
            def my_method(self):
                self.logger.info("Message")
    """

    @property
    def logger(self) -> logging.Logger:
        if not hasattr(self, '_logger'):
            self._logger = get_logger(self.__class__.__module__)
        return self._logger


# Formatter JSON pour logs structurés
class JSONFormatter(logging.Formatter):
    """Formatter qui produit des logs au format JSON pour analyse"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Ajouter des champs supplémentaires si présents
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'symbol'):
            log_data['symbol'] = record.symbol
        if hasattr(record, 'action'):
            log_data['action'] = record.action
        if hasattr(record, 'duration_ms'):
            log_data['duration_ms'] = record.duration_ms
        if hasattr(record, 'extra_data'):
            log_data['extra'] = record.extra_data

        # Ajouter l'exception si présente
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': traceback.format_exception(*record.exc_info) if record.exc_info[2] else None
            }

        return json.dumps(log_data, ensure_ascii=False)


# Niveaux de log avec couleurs pour console (si supporté)
class ColoredFormatter(logging.Formatter):
    """Formatter avec couleurs pour la console"""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Vert
        'WARNING': '\033[33m',   # Jaune
        'ERROR': '\033[31m',     # Rouge
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'

    def __init__(self, fmt=None, datefmt=None, use_colors=True):
        super().__init__(fmt, datefmt)
        self.use_colors = use_colors and sys.stdout.isatty()

    def format(self, record):
        if self.use_colors:
            color = self.COLORS.get(record.levelname, '')
            record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def configure_root_logger(json_logs: bool = False):
    """
    Configure le logger racine avec handlers console et fichier.
    Appelé une seule fois au démarrage de l'application.

    Args:
        json_logs: Si True, crée aussi un fichier de logs JSON structurés
    """
    root_logger = logging.getLogger()

    # Éviter la double configuration
    if root_logger.handlers:
        return

    level = getattr(logging, config.LOG_LEVEL, logging.INFO)
    root_logger.setLevel(level)

    # Format commun
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'

    # Handler console avec couleurs
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(ColoredFormatter(log_format, date_format))
    root_logger.addHandler(console_handler)

    # Handler fichier texte
    try:
        file_handler = logging.FileHandler(config.LOG_FILE, encoding='utf-8')
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(log_format, date_format))
        root_logger.addHandler(file_handler)
    except Exception as e:
        root_logger.warning(f"Impossible de créer le fichier de log: {e}")

    # Handler fichier JSON (pour logs structurés)
    if json_logs:
        try:
            json_log_path = config.LOG_FILE.replace('.log', '_structured.jsonl')
            json_handler = logging.FileHandler(json_log_path, encoding='utf-8')
            json_handler.setLevel(level)
            json_handler.setFormatter(JSONFormatter())
            root_logger.addHandler(json_handler)
            root_logger.info(f"Logs structurés activés: {json_log_path}")
        except Exception as e:
            root_logger.warning(f"Impossible de créer le fichier de logs JSON: {e}")

    # Réduire les logs des bibliothèques externes
    for lib in ['httpx', 'httpcore', 'telegram', 'apscheduler', 'urllib3', 'yfinance']:
        logging.getLogger(lib).setLevel(logging.WARNING)


# Décorateur pour logger les exceptions
def log_exceptions(logger: logging.Logger = None, reraise: bool = True):
    """
    Décorateur pour logger automatiquement les exceptions.

    Args:
        logger: Logger à utiliser (ou None pour utiliser le module)
        reraise: Si True, relance l'exception après le log

    Usage:
        @log_exceptions()
        async def my_function():
            ...
    """
    def decorator(func):
        import functools
        import asyncio

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            _logger = logger or get_logger(func.__module__)
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                _logger.exception(f"Exception dans {func.__name__}: {e}")
                if reraise:
                    raise

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            _logger = logger or get_logger(func.__module__)
            try:
                return func(*args, **kwargs)
            except Exception as e:
                _logger.exception(f"Exception dans {func.__name__}: {e}")
                if reraise:
                    raise

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


class ContextLogger:
    """
    Logger avec contexte pour ajouter des informations structurées.

    Usage:
        logger = ContextLogger(__name__)
        logger.with_context(user_id=123, symbol='AAPL').info("Trade executed")
    """

    def __init__(self, name: str):
        self._logger = logging.getLogger(name)
        self._context: Dict[str, Any] = {}

    def with_context(self, **kwargs) -> 'ContextLogger':
        """Retourne un logger avec contexte additionnel"""
        new_logger = ContextLogger(self._logger.name)
        new_logger._context = {**self._context, **kwargs}
        return new_logger

    def _log(self, level: int, msg: str, *args, **kwargs):
        """Méthode interne pour logger avec contexte"""
        extra = kwargs.pop('extra', {})
        extra.update(self._context)

        # Ajouter les champs comme attributs du record
        for key, value in extra.items():
            kwargs[key] = value

        self._logger.log(level, msg, *args, extra=extra, **kwargs)

    def debug(self, msg: str, *args, **kwargs):
        self._log(logging.DEBUG, msg, *args, **kwargs)

    def info(self, msg: str, *args, **kwargs):
        self._log(logging.INFO, msg, *args, **kwargs)

    def warning(self, msg: str, *args, **kwargs):
        self._log(logging.WARNING, msg, *args, **kwargs)

    def error(self, msg: str, *args, **kwargs):
        self._log(logging.ERROR, msg, *args, **kwargs)

    def exception(self, msg: str, *args, **kwargs):
        kwargs['exc_info'] = True
        self._log(logging.ERROR, msg, *args, **kwargs)

    def critical(self, msg: str, *args, **kwargs):
        self._log(logging.CRITICAL, msg, *args, **kwargs)


def get_context_logger(name: str) -> ContextLogger:
    """Retourne un logger avec support de contexte"""
    return ContextLogger(name)


class PerformanceLogger:
    """
    Logger pour mesurer les performances des opérations.

    Usage:
        with PerformanceLogger("fetch_market_data", symbol="AAPL") as perf:
            # code...
            perf.log("Step 1 done")
    """

    def __init__(self, operation: str, logger: logging.Logger = None, **context):
        self.operation = operation
        self.logger = logger or logging.getLogger(__name__)
        self.context = context
        self.start_time = None
        self.steps = []

    def __enter__(self):
        import time
        self.start_time = time.perf_counter()
        self.logger.debug(f"[PERF] Start: {self.operation}", extra=self.context)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        duration_ms = (time.perf_counter() - self.start_time) * 1000

        if exc_type:
            self.logger.error(
                f"[PERF] Failed: {self.operation} ({duration_ms:.2f}ms)",
                extra={**self.context, 'duration_ms': duration_ms}
            )
        else:
            self.logger.info(
                f"[PERF] Done: {self.operation} ({duration_ms:.2f}ms)",
                extra={**self.context, 'duration_ms': duration_ms}
            )

        return False

    def log(self, step: str):
        """Log un step intermédiaire"""
        import time
        elapsed = (time.perf_counter() - self.start_time) * 1000
        self.steps.append((step, elapsed))
        self.logger.debug(f"[PERF] {self.operation} - {step} ({elapsed:.2f}ms)")
