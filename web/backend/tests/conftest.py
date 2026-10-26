"""Les tests tournent aussi sur PostgreSQL : DATABASE_URL=postgresql://… pytest.

Le site n'a qu'une boucle asyncio, et donc un seul groupe de connexions. Les
tests en ouvrent plusieurs (le client de test, et asyncio.run pour préparer
des données) : sous PostgreSQL, une connexion ouverte dans une boucle ne sert
pas dans une autre. Ici seulement, chaque requête ouvre sa connexion et la
referme.
"""
from contextlib import asynccontextmanager

from api import database

if database.USE_POSTGRES:
    class _UneConnexionParRequete:
        @asynccontextmanager
        async def acquire(self):
            import asyncpg
            conn = await asyncpg.connect(database.DATABASE_URL)
            try:
                yield conn
            finally:
                await conn.close()

    async def _sans_groupe():
        return _UneConnexionParRequete()

    database._get_pool = _sans_groupe
