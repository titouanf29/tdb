"""
Database connection - Shared with Telegram bot
"""
import aiosqlite
from pathlib import Path

# Path to the shared database (same as bot)
DATABASE_PATH = Path(__file__).parent.parent.parent.parent / "trading_bot.db"


async def get_db():
    """Get database connection"""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def execute_query(query: str, params: tuple = ()):
    """Execute a query and return results"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def execute_write(query: str, params: tuple = ()):
    """Execute a write query"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(query, params)
        await db.commit()
        return db.total_changes
