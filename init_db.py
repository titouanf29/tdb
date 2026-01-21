"""
Script d'initialisation de la base de données
"""
import asyncio
import os
import sys

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.manager import DatabaseManager

async def init():
    """Initialise la base de données"""
    print("🔄 Initialisation de la base de données...")

    # Créer le répertoire database s'il n'existe pas
    os.makedirs("database", exist_ok=True)

    # Initialiser la base de données
    db_manager = DatabaseManager()
    await db_manager.init_db()

    print("✅ Base de données initialisée avec succès!")

if __name__ == "__main__":
    asyncio.run(init())
