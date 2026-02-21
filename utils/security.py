"""
Module de sécurité pour TDB Bot
Gestion des accès admin et contrôle des permissions
"""
import os
import logging
import functools
from datetime import datetime
from typing import Optional, List, Callable, Set
from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


class AdminManager:
    """
    Gestionnaire des accès administrateur

    Les IDs admin sont chargés depuis les variables d'environnement
    pour éviter l'exposition dans le code source.
    """

    def __init__(self):
        self._admin_ids: Set[int] = set()
        self._audit_log: List[dict] = []
        self._load_admin_ids()

    def _load_admin_ids(self):
        """Charge les IDs admin depuis les variables d'environnement"""
        # Charger depuis ADMIN_IDS (format: "123456,789012,345678")
        admin_ids_str = os.getenv("ADMIN_IDS", "")

        if admin_ids_str:
            try:
                ids = [int(id.strip()) for id in admin_ids_str.split(",") if id.strip()]
                self._admin_ids = set(ids)
                logger.info(f"Chargé {len(self._admin_ids)} admin(s) depuis ADMIN_IDS")
            except ValueError as e:
                logger.error(f"Erreur parsing ADMIN_IDS: {e}")

        # Fallback sur config.py si pas de variable d'environnement
        if not self._admin_ids:
            try:
                import config
                fallback_ids = getattr(config, 'ADMIN_IDS', [])
                if fallback_ids:
                    self._admin_ids = set(fallback_ids)
                    logger.warning(
                        "ADMIN_IDS chargé depuis config.py - "
                        "Recommandé: utiliser variable d'environnement"
                    )
            except ImportError:
                pass

        if not self._admin_ids:
            logger.warning("Aucun admin configuré! Utilisez ADMIN_IDS dans .env")

    def is_admin(self, telegram_id: int) -> bool:
        """Vérifie si un utilisateur est administrateur"""
        return telegram_id in self._admin_ids

    def get_admin_ids(self) -> List[int]:
        """Retourne la liste des IDs admin (pour usage interne uniquement)"""
        return list(self._admin_ids)

    def add_admin(self, telegram_id: int, added_by: int = None) -> bool:
        """
        Ajoute un admin temporaire (ne persiste pas au redémarrage)

        Note: Pour persister, l'admin doit être ajouté dans ADMIN_IDS
        """
        if telegram_id in self._admin_ids:
            return False

        self._admin_ids.add(telegram_id)
        self._log_admin_action(added_by, "add_admin", {"target": telegram_id})
        logger.info(f"Admin temporaire ajouté: {telegram_id} (par {added_by})")
        return True

    def remove_admin(self, telegram_id: int, removed_by: int = None) -> bool:
        """
        Retire un admin temporaire

        Note: Les admins définis dans ADMIN_IDS reviendront au redémarrage
        """
        if telegram_id not in self._admin_ids:
            return False

        # Empêcher le dernier admin de se retirer
        if len(self._admin_ids) <= 1:
            logger.warning("Impossible de retirer le dernier admin")
            return False

        self._admin_ids.discard(telegram_id)
        self._log_admin_action(removed_by, "remove_admin", {"target": telegram_id})
        logger.info(f"Admin retiré: {telegram_id} (par {removed_by})")
        return True

    def _log_admin_action(self, admin_id: int, action: str, details: dict = None):
        """Log une action admin pour l'audit trail"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "admin_id": admin_id,
            "action": action,
            "details": details or {}
        }
        self._audit_log.append(entry)

        # Garder seulement les 1000 dernières entrées
        if len(self._audit_log) > 1000:
            self._audit_log = self._audit_log[-1000:]

        logger.info(f"[AUDIT] Admin {admin_id}: {action} - {details}")

    def get_audit_log(self, limit: int = 50) -> List[dict]:
        """Retourne les dernières entrées du journal d'audit"""
        return self._audit_log[-limit:]

    def log_command(self, admin_id: int, command: str, args: str = None):
        """Log une commande admin exécutée"""
        self._log_admin_action(admin_id, "command", {
            "command": command,
            "args": args
        })


# Instance globale
admin_manager = AdminManager()


def admin_required(func: Callable) -> Callable:
    """
    Décorateur pour restreindre une commande aux administrateurs

    Example:
        @admin_required
        async def cmd_admin_stats(update, context):
            ...
    """
    @functools.wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user_id = update.effective_user.id

        if not admin_manager.is_admin(user_id):
            logger.warning(f"Accès admin refusé pour user {user_id} sur {func.__name__}")
            await update.message.reply_text("Accès réservé aux administrateurs.")
            return

        # Log l'action
        command = update.message.text.split()[0] if update.message and update.message.text else func.__name__
        admin_manager.log_command(user_id, command, update.message.text if update.message else None)

        return await func(update, context, *args, **kwargs)

    return wrapper


def admin_callback_required(func: Callable) -> Callable:
    """
    Décorateur pour restreindre un callback aux administrateurs

    Example:
        @admin_callback_required
        async def callback_admin_backup(update, context):
            ...
    """
    @functools.wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user_id = update.effective_user.id

        if not admin_manager.is_admin(user_id):
            logger.warning(f"Callback admin refusé pour user {user_id} sur {func.__name__}")
            if update.callback_query:
                await update.callback_query.answer("Accès non autorisé", show_alert=True)
            return

        # Log l'action
        callback_data = update.callback_query.data if update.callback_query else func.__name__
        admin_manager.log_command(user_id, f"callback:{callback_data}")

        return await func(update, context, *args, **kwargs)

    return wrapper


def super_admin_required(super_admin_ids: List[int] = None):
    """
    Décorateur pour des actions très sensibles (reset DB, etc.)
    Limite à une liste spécifique de super-admins

    Example:
        @super_admin_required([123456789])
        async def cmd_reset_database(update, context):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
            user_id = update.effective_user.id

            # Vérifier d'abord si c'est un admin normal
            if not admin_manager.is_admin(user_id):
                await update.message.reply_text("Accès réservé aux administrateurs.")
                return

            # Vérifier si c'est un super-admin
            allowed_ids = super_admin_ids or []
            if allowed_ids and user_id not in allowed_ids:
                logger.warning(f"Accès super-admin refusé pour {user_id} sur {func.__name__}")
                await update.message.reply_text(
                    "Cette action nécessite des privilèges super-admin."
                )
                return

            admin_manager.log_command(user_id, f"super:{func.__name__}")
            return await func(update, context, *args, **kwargs)

        return wrapper
    return decorator


def rate_limit_admin(max_calls: int = 10, period_seconds: int = 60):
    """
    Rate limit spécifique pour les actions admin (protection contre l'abus)

    Example:
        @admin_required
        @rate_limit_admin(max_calls=5, period_seconds=60)
        async def cmd_broadcast(update, context):
            ...
    """
    from collections import defaultdict
    import time

    call_times = defaultdict(list)

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
            user_id = update.effective_user.id
            current_time = time.time()

            # Nettoyer les anciennes entrées
            call_times[user_id] = [
                t for t in call_times[user_id]
                if current_time - t < period_seconds
            ]

            # Vérifier la limite
            if len(call_times[user_id]) >= max_calls:
                remaining = int(period_seconds - (current_time - call_times[user_id][0]))
                await update.message.reply_text(
                    f"Trop de requêtes. Réessayez dans {remaining}s."
                )
                logger.warning(f"Rate limit admin atteint pour {user_id} sur {func.__name__}")
                return

            call_times[user_id].append(current_time)
            return await func(update, context, *args, **kwargs)

        return wrapper
    return decorator
