from datetime import datetime, timezone
"""
Database connection - supports PostgreSQL (production) and SQLite (development)

Set DATABASE_URL env var to use PostgreSQL:
  postgresql://user:password@host:5432/dbname

Leave it unset to use SQLite (local dev only).
"""
import os
import re
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Normalize Railway-style postgres:// -> postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USE_POSTGRES = bool(DATABASE_URL)

# SQLite fallback path (dev only)
_db_env = os.getenv("DATABASE_PATH")
if _db_env:
    DATABASE_PATH = Path(_db_env)
else:
    DATABASE_PATH = Path(__file__).parent.parent.parent.parent / "trading_bot.db"

_initialized = False
_pg_pool = None  # asyncpg connection pool


# -- PostgreSQL helpers -------------------------------------------------------

def _to_pg(query: str) -> str:
    """Convert SQLite ? placeholders to PostgreSQL $1, $2, ... format."""
    counter = 0

    def _replace(_match):
        nonlocal counter
        counter += 1
        return f"${counter}"

    return re.sub(r"\?", _replace, query)


async def _get_pool():
    """Return (and lazily create) the asyncpg connection pool."""
    global _pg_pool
    if _pg_pool is None:
        import asyncpg
        _pg_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return _pg_pool


# -- Public API ----------------------------------------------------------------

async def execute_query(query: str, params: tuple = ()):
    """Execute a SELECT query and return a list of dicts."""
    await init_web_tables()
    if USE_POSTGRES:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(_to_pg(query), *params)
            return [dict(row) for row in rows]
    else:
        import aiosqlite
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]


async def execute_write(query: str, params: tuple = ()):
    """Execute an INSERT / UPDATE / DELETE query."""
    await init_web_tables()
    if USE_POSTGRES:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            await conn.execute(_to_pg(query), *params)
    else:
        import aiosqlite
        async with aiosqlite.connect(DATABASE_PATH) as db:
            await db.execute(query, params)
            await db.commit()


async def get_db():
    """Yield a raw connection (used by older code paths)."""
    await init_web_tables()
    if USE_POSTGRES:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            yield conn
    else:
        import aiosqlite
        db = await aiosqlite.connect(DATABASE_PATH)
        db.row_factory = aiosqlite.Row
        try:
            yield db
        finally:
            await db.close()


# -- Schema init ---------------------------------------------------------------

async def init_db():
    await init_web_tables()


async def init_web_tables():
    global _initialized
    if _initialized:
        return

    if USE_POSTGRES:
        await _init_postgres()
    else:
        await _init_sqlite()

    _initialized = True


async def _init_postgres():
    pool = await _get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS web_users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT,
                is_active INTEGER DEFAULT 1,
                is_admin INTEGER DEFAULT 0,
                is_premium INTEGER DEFAULT 0,
                premium_since TEXT,
                premium_expires TEXT,
                email_verified INTEGER DEFAULT 0,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT
            )
        """)
        # Add columns if they don't exist (for existing databases)
        for col, col_type in [
            ("stripe_customer_id", "TEXT"),
            ("stripe_subscription_id", "TEXT"),
            ("trading_level", "TEXT"),
            ("last_active", "TEXT"),
        ]:
            try:
                await conn.execute(f"ALTER TABLE web_users ADD COLUMN {col} {col_type}")
            except Exception:
                pass  # Column already exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS web_user_settings (
                user_id INTEGER PRIMARY KEY,
                trading_style TEXT DEFAULT 'Day Trading',
                risk_level TEXT DEFAULT 'moderate',
                notifications_enabled INTEGER DEFAULT 1,
                theme TEXT DEFAULT 'dark',
                language TEXT DEFAULT 'fr'
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS web_favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                added_at TEXT NOT NULL,
                UNIQUE(user_id, symbol)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS web_ai_chat (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS wallet (
                user_id TEXT PRIMARY KEY,
                balance FLOAT DEFAULT 10000.0,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                direction TEXT NOT NULL,
                entry_price FLOAT NOT NULL,
                quantity FLOAT NOT NULL,
                amount FLOAT NOT NULL,
                leverage INTEGER DEFAULT 1,
                take_profit FLOAT,
                stop_loss FLOAT,
                status TEXT DEFAULT 'open',
                exit_price FLOAT,
                realized_pnl FLOAT,
                created_at TEXT NOT NULL,
                closed_at TEXT
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_broadcasts (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS asset_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_type TEXT,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                admin_notes TEXT,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                processed_by INTEGER
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS premium_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                message TEXT,
                status TEXT DEFAULT 'pending',
                admin_response TEXT,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                processed_by INTEGER
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS premium_request_messages (
                id SERIAL PRIMARY KEY,
                request_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                sender_type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_read INTEGER DEFAULT 0
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS economic_events (
                id SERIAL PRIMARY KEY,
                event_key TEXT UNIQUE NOT NULL,
                date TEXT NOT NULL,
                time TEXT,
                event TEXT NOT NULL,
                country TEXT,
                importance TEXT,
                previous TEXT,
                forecast TEXT,
                actual TEXT,
                impact TEXT,
                summary TEXT,
                market_reaction TEXT,
                updated_at TEXT
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS community_messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                reply_to INTEGER,
                created_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS community_message_likes (
                id SERIAL PRIMARY KEY,
                message_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(message_id, user_id)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_ticket_messages (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                telegram_id BIGINT UNIQUE,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                created_at TEXT
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_notifications (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_changelogs (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                version TEXT,
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_changelog_reads (
                user_id INTEGER NOT NULL,
                changelog_id INTEGER NOT NULL,
                read_at TEXT NOT NULL,
                PRIMARY KEY (user_id, changelog_id)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                market TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS real_positions (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                position_type TEXT NOT NULL,
                quantity FLOAT NOT NULL,
                entry_price FLOAT NOT NULL,
                entry_date TEXT NOT NULL,
                leverage FLOAT DEFAULT 1.0,
                broker TEXT,
                notes TEXT,
                stop_loss FLOAT,
                take_profit FLOAT,
                status TEXT DEFAULT 'open',
                exit_price FLOAT,
                exit_date TEXT,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS weekly_market_prep (
                id SERIAL PRIMARY KEY,
                week_key TEXT UNIQUE NOT NULL,
                content TEXT NOT NULL,
                generated_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS trading_journal (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                direction TEXT NOT NULL,
                timeframe TEXT,
                setup TEXT,
                entry_time TEXT,
                exit_time TEXT,
                entry_price FLOAT,
                exit_price FLOAT,
                quantity FLOAT,
                risk_reward FLOAT,
                result TEXT,
                pnl FLOAT,
                pre_trade_notes TEXT,
                post_trade_notes TEXT,
                screenshot TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS content_pieces (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                topic TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'indicator',
                status TEXT NOT NULL DEFAULT 'draft',
                script TEXT,
                hook TEXT,
                call_to_action TEXT,
                hashtags_tiktok TEXT DEFAULT '[]',
                hashtags_youtube TEXT DEFAULT '[]',
                hashtags_instagram TEXT DEFAULT '[]',
                description_tiktok TEXT,
                description_youtube TEXT,
                description_instagram TEXT,
                site_page_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_missions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES web_users(id) ON DELETE CASCADE,
                mission_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                progress INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT,
                xp_earned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, mission_id)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id INTEGER PRIMARY KEY REFERENCES web_users(id) ON DELETE CASCADE,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                badges TEXT NOT NULL DEFAULT '[]',
                streak_days INTEGER NOT NULL DEFAULT 0,
                last_activity_date TEXT,
                updated_at TEXT NOT NULL
            )
        """)
        print("PostgreSQL tables ready")


async def _init_sqlite():
    import aiosqlite
    async with aiosqlite.connect(DATABASE_PATH) as db:
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
                is_active INTEGER DEFAULT 1,
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT
            )
        """)
        for col in ["stripe_customer_id", "stripe_subscription_id", "trading_level",
                    "is_admin", "is_premium", "premium_since", "premium_expires", "email_verified",
                    "last_active"]:
            col_type = "INTEGER DEFAULT 0" if col in ("is_admin", "is_premium", "email_verified") else "TEXT"
            try:
                await db.execute(f"ALTER TABLE web_users ADD COLUMN {col} {col_type}")
            except Exception:
                pass
        await db.execute("""
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS wallet (
                user_id TEXT PRIMARY KEY,
                balance REAL DEFAULT 10000.0,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            )
        """)
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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS premium_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT,
                status TEXT DEFAULT 'pending',
                admin_response TEXT,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                processed_by INTEGER,
                FOREIGN KEY (user_id) REFERENCES web_users(id),
                FOREIGN KEY (processed_by) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS premium_request_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                sender_type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                FOREIGN KEY (request_id) REFERENCES premium_requests(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS economic_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_key TEXT UNIQUE NOT NULL,
                date TEXT NOT NULL,
                time TEXT,
                event TEXT NOT NULL,
                country TEXT,
                importance TEXT,
                previous TEXT,
                forecast TEXT,
                actual TEXT,
                impact TEXT,
                summary TEXT,
                market_reaction TEXT,
                updated_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS community_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                reply_to INTEGER,
                created_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES web_users(id),
                FOREIGN KEY (reply_to) REFERENCES community_messages(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS community_message_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(message_id, user_id),
                FOREIGN KEY (message_id) REFERENCES community_messages(id),
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_ticket_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (ticket_id) REFERENCES admin_tickets(id),
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admin_changelogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                version TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (admin_id) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_changelog_reads (
                user_id INTEGER NOT NULL,
                changelog_id INTEGER NOT NULL,
                read_at TEXT NOT NULL,
                PRIMARY KEY (user_id, changelog_id),
                FOREIGN KEY (user_id) REFERENCES web_users(id),
                FOREIGN KEY (changelog_id) REFERENCES admin_changelogs(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                market TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES web_users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS real_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                position_type TEXT NOT NULL,
                quantity REAL NOT NULL,
                entry_price REAL NOT NULL,
                entry_date TEXT NOT NULL,
                leverage REAL DEFAULT 1.0,
                broker TEXT,
                notes TEXT,
                stop_loss REAL,
                take_profit REAL,
                status TEXT DEFAULT 'open',
                exit_price REAL,
                exit_date TEXT,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS weekly_market_prep (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_key TEXT UNIQUE NOT NULL,
                content TEXT NOT NULL,
                generated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS trading_journal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                direction TEXT NOT NULL,
                timeframe TEXT,
                setup TEXT,
                entry_time TEXT,
                exit_time TEXT,
                entry_price REAL,
                exit_price REAL,
                quantity REAL,
                risk_reward REAL,
                result TEXT,
                pnl REAL,
                pre_trade_notes TEXT,
                post_trade_notes TEXT,
                screenshot TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        """)
        # Add new columns to existing tables if upgrading from older schema
        for col, definition in [
            ("is_admin", "INTEGER DEFAULT 0"),
            ("is_premium", "INTEGER DEFAULT 0"),
            ("premium_since", "TEXT"),
            ("premium_expires", "TEXT"),
            ("email_verified", "INTEGER DEFAULT 0"),
        ]:
            try:
                await db.execute(f"ALTER TABLE web_users ADD COLUMN {col} {definition}")
            except Exception:
                pass  # Column already exists
        await db.execute("""
            CREATE TABLE IF NOT EXISTS content_pieces (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                topic TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'indicator',
                status TEXT NOT NULL DEFAULT 'draft',
                script TEXT,
                hook TEXT,
                call_to_action TEXT,
                hashtags_tiktok TEXT DEFAULT '[]',
                hashtags_youtube TEXT DEFAULT '[]',
                hashtags_instagram TEXT DEFAULT '[]',
                description_tiktok TEXT,
                description_youtube TEXT,
                description_instagram TEXT,
                site_page_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                mission_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                progress INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT,
                xp_earned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, mission_id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id INTEGER PRIMARY KEY,
                xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                badges TEXT NOT NULL DEFAULT '[]',
                streak_days INTEGER NOT NULL DEFAULT 0,
                last_activity_date TEXT,
                updated_at TEXT NOT NULL
            )
        """)
        await db.commit()
        print("SQLite tables ready")


async def create_admin_notification(type: str, title: str, message: str, link: str = None):
    """Insert a notification for admins."""
    from datetime import datetime
    try:
        await execute_write(
            "INSERT INTO admin_notifications (type, title, message, link, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (type, title, message, link, datetime.now(timezone.utc).isoformat()),
        )
    except Exception as e:
        print(f"[NOTIF] Failed to create admin notification: {e}")


async def create_user_notification(user_id: int, type: str, title: str, message: str, link: str = None):
    """Insert a notification for a specific user."""
    from datetime import datetime
    try:
        await execute_write(
            "INSERT INTO user_notifications (user_id, type, title, message, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
            (user_id, type, title, message, link, datetime.now(timezone.utc).isoformat()),
        )
    except Exception as e:
        print(f"[NOTIF] Failed to create user notification: {e}")
