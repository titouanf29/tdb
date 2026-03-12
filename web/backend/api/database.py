"""
Database connection - Shared with Telegram bot
"""
import aiosqlite
from pathlib import Path

# Path to the shared database (same as bot)
DATABASE_PATH = Path(__file__).parent.parent.parent.parent / "trading_bot.db"

# Flag to track initialization
_initialized = False


async def init_db():
    """Initialize the database (creates tables if needed via init_web_tables)"""
    await init_web_tables()


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

        # Positions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                direction TEXT NOT NULL,
                entry_price REAL NOT NULL,
                quantity REAL NOT NULL,
                amount REAL NOT NULL,
                leverage INTEGER DEFAULT 1,
                take_profit REAL,
                stop_loss REAL,
                status TEXT DEFAULT 'open',
                exit_price REAL,
                realized_pnl REAL,
                created_at TEXT NOT NULL,
                closed_at TEXT
            )
        """)

        # Admin audit log
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (admin_id) REFERENCES web_users(id)
            )
        """)

        # Admin broadcasts
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_broadcasts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                created_at TEXT NOT NULL,
                FOREIGN KEY (admin_id) REFERENCES web_users(id)
            )
        """)

        # Admin settings
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # Asset requests table for users to request new assets
        await db.execute("""
            CREATE TABLE IF NOT EXISTS asset_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_type TEXT,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                admin_notes TEXT,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                processed_by INTEGER,
                FOREIGN KEY (user_id) REFERENCES web_users(id),
                FOREIGN KEY (processed_by) REFERENCES web_users(id)
            )
        """)

        # Add is_admin column to web_users if not exists
        try:
            await db.execute("ALTER TABLE web_users ADD COLUMN is_admin INTEGER DEFAULT 0")
        except:
            pass  # Column already exists

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
