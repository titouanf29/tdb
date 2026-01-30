"""
Service de Backup Automatique pour TDB Bot
Gère les sauvegardes automatiques de la base de données
"""
import logging
import asyncio
import shutil
import gzip
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import aiosqlite
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import config

logger = logging.getLogger(__name__)


class BackupService:
    """Service de backup automatique de la base de données"""

    def __init__(self, db_path: str = None, backup_dir: str = None):
        """
        Initialise le service de backup

        Args:
            db_path: Chemin vers la base de données
            backup_dir: Répertoire pour les backups
        """
        self.db_path = Path(db_path or config.DATABASE_PATH)
        self.backup_dir = Path(backup_dir or "backups")
        self.scheduler = AsyncIOScheduler()
        self.is_running = False

        # Configuration
        self.max_backups = 30  # Nombre maximum de backups à conserver
        self.compress_backups = True  # Compresser les backups

    async def start(self):
        """Démarre le service de backup automatique"""
        if self.is_running:
            logger.warning("Service de backup déjà démarré")
            return

        # Créer le répertoire de backup si nécessaire
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Planifier les backups
        # Backup quotidien à 3h du matin
        self.scheduler.add_job(
            self.create_backup,
            CronTrigger(hour=3, minute=0),
            id='daily_backup',
            replace_existing=True,
            kwargs={'backup_type': 'daily'}
        )

        # Backup hebdomadaire le dimanche à 4h
        self.scheduler.add_job(
            self.create_backup,
            CronTrigger(day_of_week='sun', hour=4, minute=0),
            id='weekly_backup',
            replace_existing=True,
            kwargs={'backup_type': 'weekly'}
        )

        # Nettoyage des anciens backups tous les jours à 5h
        self.scheduler.add_job(
            self.cleanup_old_backups,
            CronTrigger(hour=5, minute=0),
            id='backup_cleanup',
            replace_existing=True
        )

        self.scheduler.start()
        self.is_running = True
        logger.info("Service de backup automatique démarré")

        # Créer un backup initial si aucun n'existe
        if not list(self.backup_dir.glob("*.db*")):
            await self.create_backup(backup_type='initial')

    def stop(self):
        """Arrête le service de backup"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Service de backup arrêté")

    async def create_backup(
        self,
        backup_type: str = 'manual',
        description: str = None
    ) -> Optional[Path]:
        """
        Crée un backup de la base de données

        Args:
            backup_type: Type de backup (daily, weekly, manual, initial)
            description: Description optionnelle

        Returns:
            Chemin du fichier de backup créé
        """
        try:
            if not self.db_path.exists():
                logger.error(f"Base de données non trouvée: {self.db_path}")
                return None

            # Générer le nom du fichier
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"tdb_backup_{backup_type}_{timestamp}.db"

            if self.compress_backups:
                backup_name += ".gz"

            backup_path = self.backup_dir / backup_name

            # Utiliser la méthode de backup SQLite pour éviter les corruptions
            logger.info(f"Création du backup: {backup_name}")

            async with aiosqlite.connect(self.db_path) as source:
                # Vérifier l'intégrité avant le backup
                async with source.execute("PRAGMA integrity_check") as cursor:
                    result = await cursor.fetchone()
                    if result[0] != 'ok':
                        logger.error(f"Base de données corrompue: {result}")
                        return None

                # Créer une copie temporaire
                temp_path = self.backup_dir / f"temp_{timestamp}.db"

                # Backup SQLite natif
                async with aiosqlite.connect(temp_path) as dest:
                    await source.backup(dest)

            # Compresser si nécessaire
            if self.compress_backups:
                with open(temp_path, 'rb') as f_in:
                    with gzip.open(backup_path, 'wb', compresslevel=6) as f_out:
                        shutil.copyfileobj(f_in, f_out)
                os.remove(temp_path)
            else:
                shutil.move(temp_path, backup_path)

            # Calculer la taille
            size_mb = backup_path.stat().st_size / (1024 * 1024)
            logger.info(f"Backup créé: {backup_name} ({size_mb:.2f} MB)")

            return backup_path

        except Exception as e:
            logger.error(f"Erreur création backup: {e}")
            return None

    async def restore_backup(self, backup_path: Path) -> bool:
        """
        Restaure la base de données depuis un backup

        Args:
            backup_path: Chemin vers le fichier de backup

        Returns:
            True si la restauration a réussi
        """
        try:
            if not backup_path.exists():
                logger.error(f"Backup non trouvé: {backup_path}")
                return False

            logger.warning(f"Restauration du backup: {backup_path}")

            # Créer un backup de sécurité de la base actuelle
            await self.create_backup(backup_type='pre_restore')

            # Décompresser si nécessaire
            if str(backup_path).endswith('.gz'):
                temp_path = self.backup_dir / "temp_restore.db"
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(temp_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                source_path = temp_path
            else:
                source_path = backup_path

            # Vérifier l'intégrité du backup
            async with aiosqlite.connect(source_path) as db:
                async with db.execute("PRAGMA integrity_check") as cursor:
                    result = await cursor.fetchone()
                    if result[0] != 'ok':
                        logger.error(f"Backup corrompu: {result}")
                        return False

            # Remplacer la base de données
            shutil.copy(source_path, self.db_path)

            # Nettoyer
            if str(backup_path).endswith('.gz') and source_path.exists():
                os.remove(source_path)

            logger.info("Restauration terminée avec succès")
            return True

        except Exception as e:
            logger.error(f"Erreur restauration backup: {e}")
            return False

    async def cleanup_old_backups(self):
        """Supprime les anciens backups pour économiser l'espace"""
        try:
            backups = list(self.backup_dir.glob("tdb_backup_*.db*"))

            # Trier par date de modification (plus récent en premier)
            backups.sort(key=lambda x: x.stat().st_mtime, reverse=True)

            # Garder les backups récents
            to_delete = backups[self.max_backups:]

            for backup in to_delete:
                backup.unlink()
                logger.info(f"Backup supprimé: {backup.name}")

            if to_delete:
                logger.info(f"{len(to_delete)} ancien(s) backup(s) supprimé(s)")

        except Exception as e:
            logger.error(f"Erreur nettoyage backups: {e}")

    def list_backups(self) -> List[dict]:
        """
        Liste tous les backups disponibles

        Returns:
            Liste des backups avec leurs métadonnées
        """
        backups = []

        try:
            for backup_file in self.backup_dir.glob("tdb_backup_*.db*"):
                stat = backup_file.stat()
                backups.append({
                    'name': backup_file.name,
                    'path': str(backup_file),
                    'size_mb': stat.st_size / (1024 * 1024),
                    'created': datetime.fromtimestamp(stat.st_mtime),
                    'compressed': str(backup_file).endswith('.gz')
                })

            # Trier par date (plus récent en premier)
            backups.sort(key=lambda x: x['created'], reverse=True)

        except Exception as e:
            logger.error(f"Erreur listage backups: {e}")

        return backups

    def get_backup_stats(self) -> dict:
        """
        Retourne des statistiques sur les backups

        Returns:
            Dictionnaire avec les statistiques
        """
        backups = self.list_backups()

        if not backups:
            return {
                'total_backups': 0,
                'total_size_mb': 0,
                'oldest_backup': None,
                'newest_backup': None
            }

        total_size = sum(b['size_mb'] for b in backups)

        return {
            'total_backups': len(backups),
            'total_size_mb': total_size,
            'oldest_backup': backups[-1]['created'] if backups else None,
            'newest_backup': backups[0]['created'] if backups else None,
            'avg_size_mb': total_size / len(backups) if backups else 0
        }

    async def verify_backup(self, backup_path: Path) -> bool:
        """
        Vérifie l'intégrité d'un backup

        Args:
            backup_path: Chemin vers le backup

        Returns:
            True si le backup est valide
        """
        try:
            # Décompresser temporairement si nécessaire
            if str(backup_path).endswith('.gz'):
                temp_path = self.backup_dir / "temp_verify.db"
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(temp_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                check_path = temp_path
            else:
                check_path = backup_path

            # Vérifier l'intégrité
            async with aiosqlite.connect(check_path) as db:
                async with db.execute("PRAGMA integrity_check") as cursor:
                    result = await cursor.fetchone()

                # Vérifier qu'on peut lire les tables principales
                async with db.execute("SELECT COUNT(*) FROM users") as cursor:
                    await cursor.fetchone()

            # Nettoyer
            if str(backup_path).endswith('.gz') and check_path.exists():
                os.remove(check_path)

            return result[0] == 'ok'

        except Exception as e:
            logger.error(f"Erreur vérification backup: {e}")
            return False

    def format_backup_list(self, limit: int = 10) -> str:
        """
        Formate la liste des backups pour affichage

        Args:
            limit: Nombre maximum de backups à afficher

        Returns:
            Texte formaté
        """
        backups = self.list_backups()[:limit]
        stats = self.get_backup_stats()

        text = "💾 **BACKUPS DISPONIBLES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += f"📊 **Statistiques:**\n"
        text += f"• Total: {stats['total_backups']} backup(s)\n"
        text += f"• Taille totale: {stats['total_size_mb']:.2f} MB\n"
        if stats['newest_backup']:
            text += f"• Plus récent: {stats['newest_backup'].strftime('%Y-%m-%d %H:%M')}\n"
        text += "\n"

        if backups:
            text += "📁 **Derniers backups:**\n\n"
            for i, backup in enumerate(backups, 1):
                date_str = backup['created'].strftime('%Y-%m-%d %H:%M')
                compressed = "🗜️" if backup['compressed'] else ""
                text += f"{i}. {date_str} - {backup['size_mb']:.2f} MB {compressed}\n"
        else:
            text += "Aucun backup disponible.\n"

        return text


# Instance globale
backup_service = BackupService()
