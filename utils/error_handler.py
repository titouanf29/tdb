"""
Gestionnaire d'erreurs centralisé pour TDB Bot
Remplace les except Exception: pass silencieux par des erreurs loggées et gérées
"""
import logging
import functools
import traceback
from datetime import datetime
from typing import Optional, Callable, Any, TypeVar
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Niveaux de sévérité des erreurs"""
    LOW = "low"          # Erreur mineure, l'opération peut continuer
    MEDIUM = "medium"    # Erreur modérée, fonctionnalité dégradée
    HIGH = "high"        # Erreur majeure, fonctionnalité indisponible
    CRITICAL = "critical"  # Erreur critique, nécessite attention immédiate


class TDBError(Exception):
    """Exception personnalisée pour TDB avec contexte"""

    def __init__(self, message: str, severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                 user_message: str = None, context: dict = None):
        super().__init__(message)
        self.severity = severity
        self.user_message = user_message or "Une erreur est survenue. Réessayez plus tard."
        self.context = context or {}
        self.timestamp = datetime.now()


class ErrorHandler:
    """Gestionnaire centralisé des erreurs"""

    # Messages utilisateur par type d'erreur
    USER_MESSAGES = {
        "database": "Erreur de base de données. Réessayez dans quelques instants.",
        "api": "Service externe temporairement indisponible.",
        "market_data": "Impossible de récupérer les données de marché.",
        "ai_service": "Assistant IA temporairement indisponible.",
        "rate_limit": "Trop de requêtes. Veuillez patienter.",
        "validation": "Données invalides. Vérifiez votre saisie.",
        "network": "Problème de connexion réseau.",
        "timeout": "L'opération a pris trop de temps.",
        "permission": "Action non autorisée.",
        "default": "Une erreur est survenue."
    }

    @classmethod
    def log_error(cls, error: Exception, context: str = "",
                  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                  user_id: int = None) -> str:
        """
        Logue une erreur avec contexte et retourne un message utilisateur approprié

        Args:
            error: L'exception levée
            context: Contexte de l'erreur (ex: "récupération prix AAPL")
            severity: Niveau de sévérité
            user_id: ID utilisateur pour le tracking

        Returns:
            Message approprié pour l'utilisateur
        """
        error_type = cls._classify_error(error)
        user_message = cls.USER_MESSAGES.get(error_type, cls.USER_MESSAGES["default"])

        # Construire le message de log
        log_parts = [f"[{severity.value.upper()}]"]
        if context:
            log_parts.append(f"Contexte: {context}")
        if user_id:
            log_parts.append(f"User: {user_id}")
        log_parts.append(f"Erreur: {type(error).__name__}: {str(error)}")

        log_message = " | ".join(log_parts)

        # Logger selon la sévérité
        if severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message)
            logger.critical(traceback.format_exc())
        elif severity == ErrorSeverity.HIGH:
            logger.error(log_message)
            logger.debug(traceback.format_exc())
        elif severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message)
        else:
            logger.info(log_message)

        return user_message

    @classmethod
    def _classify_error(cls, error: Exception) -> str:
        """Classifie une erreur par type"""
        error_name = type(error).__name__.lower()
        error_str = str(error).lower()

        # Classification par type d'exception
        if "sqlite" in error_name or "database" in error_name:
            return "database"
        if "timeout" in error_name or "timeout" in error_str:
            return "timeout"
        if "connection" in error_name or "network" in error_str:
            return "network"
        if "ratelimit" in error_name or "rate" in error_str and "limit" in error_str:
            return "rate_limit"
        if "permission" in error_name or "forbidden" in error_str or "401" in error_str:
            return "permission"
        if "validation" in error_name or "invalid" in error_str:
            return "validation"
        if "groq" in error_name or "openai" in error_name:
            return "ai_service"
        if "yfinance" in error_str or "market" in error_str:
            return "market_data"
        if "http" in error_name or "api" in error_str:
            return "api"

        return "default"

    @classmethod
    def safe_execute(cls, default_return: Any = None,
                     context: str = "",
                     severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                     user_id: int = None,
                     reraise: bool = False):
        """
        Décorateur pour exécuter une fonction de manière sécurisée

        Args:
            default_return: Valeur à retourner en cas d'erreur
            context: Contexte de l'opération
            severity: Sévérité de l'erreur
            user_id: ID utilisateur
            reraise: Si True, relance l'exception après logging

        Example:
            @ErrorHandler.safe_execute(default_return=[], context="récupération favoris")
            async def get_favorites(user_id):
                ...
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    ctx = context or f"{func.__module__}.{func.__name__}"
                    cls.log_error(e, ctx, severity, user_id)
                    if reraise:
                        raise
                    return default_return

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    ctx = context or f"{func.__module__}.{func.__name__}"
                    cls.log_error(e, ctx, severity, user_id)
                    if reraise:
                        raise
                    return default_return

            # Retourner le wrapper approprié
            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            return sync_wrapper

        return decorator


def handle_error(context: str = "", default_return: Any = None,
                 severity: ErrorSeverity = ErrorSeverity.MEDIUM):
    """
    Décorateur simplifié pour la gestion d'erreurs

    Example:
        @handle_error("récupération prix", default_return=None)
        async def get_price(symbol):
            ...
    """
    return ErrorHandler.safe_execute(
        default_return=default_return,
        context=context,
        severity=severity
    )


# Alias pour les cas courants
def handle_db_error(context: str = "", default_return: Any = None):
    """Décorateur pour les erreurs de base de données"""
    return handle_error(f"DB: {context}", default_return, ErrorSeverity.HIGH)


def handle_api_error(context: str = "", default_return: Any = None):
    """Décorateur pour les erreurs d'API"""
    return handle_error(f"API: {context}", default_return, ErrorSeverity.MEDIUM)


def handle_market_error(context: str = "", default_return: Any = None):
    """Décorateur pour les erreurs de données de marché"""
    return handle_error(f"Market: {context}", default_return, ErrorSeverity.LOW)


# Instance globale
error_handler = ErrorHandler()
