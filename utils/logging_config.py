"""
Configuration centralisée du logging pour TDB Bot
"""
import logging
import sys
from pathlib import Path
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


def configure_root_logger():
    """
    Configure le logger racine avec handlers console et fichier.
    Appelé une seule fois au démarrage de l'application.
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

    # Handler fichier
    try:
        file_handler = logging.FileHandler(config.LOG_FILE, encoding='utf-8')
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(log_format, date_format))
        root_logger.addHandler(file_handler)
    except Exception as e:
        root_logger.warning(f"Impossible de créer le fichier de log: {e}")

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
