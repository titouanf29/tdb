"""
Database connection - Shared with Telegram bot
"""
import aiosqlite
from pathlib import Path

# Path to the shared database (same as bot)
DATABASE_PATH = Path(__file__).parent.parent.parent.parent / "trading_bot.db"

# Flag to track initialization
_initialized = False


async def init_web_tables():
    """Initialize web-specific tables"""
    global _initialized
    if _initialized:
        return

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Web users table (for email/password auth)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS web_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT,
                is_active INTEGER DEFAULT 1
            )
        """)

        # User settings for web users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS web_user_settings (
                user_id INTEGER PRIMARY KEY,
                trading_style TEXT DEFAULT 'Day Trading',
                risk_level TEXT DEFAULT 'moderate',
                notifications_enabled INTEGER DEFAULT 1,
                theme TEXT DEFAULT 'dark',
                language TEXT DEFAULT 'fr',
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)

        # User favorites for web users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS web_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                added_at TEXT NOT NULL,
                UNIQUE(user_id, symbol),
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)

        # AI chat history for web users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS web_ai_chat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)

        # Wallet for web users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS wallet (
                user_id TEXT PRIMARY KEY,
                balance REAL DEFAULT 10000.0,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            )
        """)

        await db.commit()
        _initialized = True


async def get_db():
    """Get database connection"""
    await init_web_tables()
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def execute_query(query: str, params: tuple = ()):
    """Execute a query and return results"""
    await init_web_tables()
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def execute_write(query: str, params: tuple = ()):
    """Execute a write query"""
    await init_web_tables()
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(query, params)
        await db.commit()
        return db.total_changes
