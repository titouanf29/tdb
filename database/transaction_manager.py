"""
Gestionnaire de transactions pour éviter les race conditions
Assure l'intégrité des opérations critiques (wallet, positions)
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
from datetime import datetime
import aiosqlite
import config

logger = logging.getLogger(__name__)


class TransactionManager:
    """
    Gestionnaire de transactions avec verrous pour opérations critiques

    Utilise des verrous par utilisateur pour éviter les race conditions
    entre le scanner automatique et les opérations manuelles.
    """

    def __init__(self):
        self._user_locks: Dict[int, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()
        self._active_transactions: Dict[int, str] = {}

    def _get_user_lock(self, user_id: int) -> asyncio.Lock:
        """Récupère ou crée un verrou pour un utilisateur"""
        if user_id not in self._user_locks:
            self._user_locks[user_id] = asyncio.Lock()
        return self._user_locks[user_id]

    @asynccontextmanager
    async def user_transaction(self, user_id: int, operation: str = "unknown"):
        """
        Context manager pour une transaction utilisateur sécurisée

        Args:
            user_id: ID de l'utilisateur
            operation: Description de l'opération (pour le debug)

        Example:
            async with transaction_manager.user_transaction(user_id, "close_position"):
                await db.close_position(position_code, price, reason)
                await db.update_wallet(user_id, balance=new_balance)
        """
        lock = self._get_user_lock(user_id)

        # Vérifier si une transaction est déjà en cours pour cet utilisateur
        if self._active_transactions.get(user_id):
            current_op = self._active_transactions[user_id]
            logger.warning(
                f"Transaction en attente pour user {user_id}: "
                f"{operation} (en cours: {current_op})"
            )

        async with lock:
            self._active_transactions[user_id] = operation
            start_time = datetime.now()

            try:
                async with aiosqlite.connect(config.DATABASE_PATH) as db:
                    # Activer le mode WAL pour de meilleures performances concurrentes
                    await db.execute("PRAGMA journal_mode=WAL")
                    # Activer les foreign keys
                    await db.execute("PRAGMA foreign_keys=ON")

                    yield TransactionContext(db, user_id)

                    # Commit automatique
                    await db.commit()

            except Exception as e:
                logger.error(f"Erreur transaction {operation} pour user {user_id}: {e}")
                raise

            finally:
                duration = (datetime.now() - start_time).total_seconds()
                if duration > 1.0:
                    logger.warning(
                        f"Transaction lente: {operation} pour user {user_id} "
                        f"({duration:.2f}s)"
                    )
                del self._active_transactions[user_id]

    @asynccontextmanager
    async def wallet_operation(self, user_id: int, operation: str = "wallet_update"):
        """
        Context manager spécifique pour les opérations de portefeuille

        Garantit l'atomicité des opérations sur le wallet et les positions.
        """
        async with self.user_transaction(user_id, f"wallet:{operation}"):
            yield

    @asynccontextmanager
    async def position_operation(self, user_id: int, position_code: str,
                                 operation: str = "position_update"):
        """
        Context manager spécifique pour les opérations sur les positions
        """
        async with self.user_transaction(user_id, f"position:{position_code}:{operation}"):
            yield

    async def execute_atomic(self, user_id: int, operations: List[tuple],
                            operation_name: str = "batch"):
        """
        Exécute une liste d'opérations de manière atomique

        Args:
            user_id: ID de l'utilisateur
            operations: Liste de tuples (query, params)
            operation_name: Nom de l'opération pour le logging

        Example:
            await transaction_manager.execute_atomic(user_id, [
                ("UPDATE wallet SET balance = ? WHERE telegram_id = ?", (new_balance, user_id)),
                ("UPDATE positions SET status = ? WHERE position_code = ?", ("closed", code))
            ])
        """
        async with self.user_transaction(user_id, operation_name):
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                try:
                    for query, params in operations:
                        await db.execute(query, params)
                    await db.commit()
                    logger.debug(f"Batch atomique {operation_name}: {len(operations)} opérations")
                except Exception as e:
                    await db.rollback()
                    logger.error(f"Rollback batch {operation_name}: {e}")
                    raise

    def is_user_locked(self, user_id: int) -> bool:
        """Vérifie si un utilisateur a une transaction en cours"""
        lock = self._user_locks.get(user_id)
        if lock:
            return lock.locked()
        return False

    def get_active_transactions(self) -> Dict[int, str]:
        """Retourne les transactions en cours (pour debug/admin)"""
        return dict(self._active_transactions)

    def cleanup_stale_locks(self):
        """Nettoie les verrous inutilisés (appeler périodiquement)"""
        to_remove = []
        for user_id, lock in self._user_locks.items():
            if not lock.locked() and user_id not in self._active_transactions:
                to_remove.append(user_id)

        for user_id in to_remove:
            del self._user_locks[user_id]

        if to_remove:
            logger.debug(f"Nettoyage: {len(to_remove)} verrous supprimés")


class TransactionContext:
    """Contexte de transaction avec helpers pour les opérations courantes"""

    def __init__(self, db: aiosqlite.Connection, user_id: int):
        self.db = db
        self.user_id = user_id
        self.db.row_factory = aiosqlite.Row

    async def get_wallet(self) -> Optional[Dict[str, Any]]:
        """Récupère le wallet de l'utilisateur (avec verrou implicite)"""
        async with self.db.execute(
            "SELECT * FROM wallet WHERE telegram_id = ?",
            (self.user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def update_wallet(self, **kwargs) -> bool:
        """Met à jour le wallet de manière sécurisée"""
        if not kwargs:
            return False

        fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [self.user_id]

        await self.db.execute(
            f"UPDATE wallet SET {fields} WHERE telegram_id = ?",
            values
        )
        return True

    async def get_position(self, position_code: str) -> Optional[Dict[str, Any]]:
        """Récupère une position"""
        async with self.db.execute(
            "SELECT * FROM positions WHERE position_code = ?",
            (position_code,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def close_position_safe(self, position_code: str, exit_price: float,
                                  close_reason: str) -> tuple:
        """
        Ferme une position de manière atomique et met à jour le wallet

        Returns:
            tuple (pnl, pnl_percent) ou (0, 0) en cas d'erreur
        """
        # Récupérer la position
        position = await self.get_position(position_code)
        if not position or position['status'] != 'open':
            logger.warning(f"Position {position_code} non trouvée ou déjà fermée")
            return (0, 0)

        # Calculer le PnL
        entry_price = position['entry_price']
        amount = position['amount']
        leverage = position['leverage']
        direction = position['direction']

        if not entry_price or entry_price <= 0:
            return (0, 0)

        if direction == 'LONG':
            pnl_percent = ((exit_price - entry_price) / entry_price) * 100 * leverage
        else:
            pnl_percent = ((entry_price - exit_price) / entry_price) * 100 * leverage

        pnl = amount * (pnl_percent / 100)

        # Fermer la position
        await self.db.execute("""
            UPDATE positions SET
                status = 'closed',
                current_price = ?,
                pnl = ?,
                pnl_percent = ?,
                closed_at = CURRENT_TIMESTAMP,
                close_reason = ?
            WHERE position_code = ?
        """, (exit_price, pnl, pnl_percent, close_reason, position_code))

        # Mettre à jour le wallet
        wallet = await self.get_wallet()
        if wallet:
            # Libérer le montant investi + PnL
            new_balance = wallet['balance'] + amount + pnl
            new_available = wallet['available_balance'] + amount + pnl
            new_total_pnl = wallet['total_pnl'] + pnl

            await self.update_wallet(
                balance=new_balance,
                available_balance=new_available,
                total_pnl=new_total_pnl
            )

        # Ajouter à l'historique
        await self.db.execute("""
            INSERT INTO position_history
            (telegram_id, position_code, asset_symbol, market, direction,
            entry_price, exit_price, amount, leverage, pnl, pnl_percent,
            duration_minutes, close_reason, opened_at, closed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            self.user_id, position_code, position['asset_symbol'],
            position['market'], direction, entry_price, exit_price,
            amount, leverage, pnl, pnl_percent,
            0,  # duration calculée après
            close_reason, position['opened_at']
        ))

        logger.info(f"Position {position_code} fermée: PnL=${pnl:+.2f} ({pnl_percent:+.1f}%)")
        return (pnl, pnl_percent)


# Instance globale
transaction_manager = TransactionManager()
