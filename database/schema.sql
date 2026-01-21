-- Schéma de base de données pour TDB Bot

-- ===== UTILISATEURS =====
CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    language TEXT DEFAULT 'fr',
    timezone TEXT DEFAULT 'Europe/Paris',
    currency TEXT DEFAULT 'USD',
    user_level TEXT DEFAULT 'beginner' -- beginner, intermediate, advanced
);

-- ===== PARAMÈTRES UTILISATEUR =====
CREATE TABLE IF NOT EXISTS user_settings (
    telegram_id INTEGER PRIMARY KEY,
    -- Trading
    trading_style TEXT DEFAULT 'Day Trading', -- scalp, day_trading, swing
    risk_per_position REAL DEFAULT 2.0,
    max_daily_loss REAL DEFAULT 5.0,
    max_weekly_loss REAL DEFAULT 10.0,
    max_leverage INTEGER DEFAULT 1,
    stop_loss_mandatory INTEGER DEFAULT 1,
    -- Scan Auto
    scan_enabled INTEGER DEFAULT 0,
    scan_frequency INTEGER DEFAULT 300, -- en secondes
    scan_markets TEXT DEFAULT 'USA,CRYPTO', -- liste séparée par virgules
    score_min INTEGER DEFAULT 70,
    max_alerts_per_day INTEGER DEFAULT 20,
    scan_weekends INTEGER DEFAULT 0,
    -- Notifications
    notifications_enabled INTEGER DEFAULT 1,
    notif_opportunities INTEGER DEFAULT 1,
    notif_breakouts INTEGER DEFAULT 1,
    notif_reversals INTEGER DEFAULT 1,
    notif_news INTEGER DEFAULT 1,
    notif_positions INTEGER DEFAULT 1,
    notif_daily_summary INTEGER DEFAULT 0,
    summary_time TEXT DEFAULT '08:00',
    -- IA
    ai_aggressiveness TEXT DEFAULT 'balanced', -- prudent, balanced, aggressive
    ai_show_reasoning INTEGER DEFAULT 1,
    detail_level TEXT DEFAULT 'normal', -- simple, normal, expert
    -- Interface
    theme TEXT DEFAULT 'dark',
    chart_type TEXT DEFAULT 'candlestick',
    message_timeout INTEGER DEFAULT 30,
    -- Favoris
    favorites_daily_summary INTEGER DEFAULT 0,
    favorites_summary_time TEXT DEFAULT '08:00',
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== WALLET (Paper Trading) =====
CREATE TABLE IF NOT EXISTS wallet (
    telegram_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 10000.0,
    initial_balance REAL DEFAULT 10000.0,
    available_balance REAL DEFAULT 10000.0,
    total_pnl REAL DEFAULT 0.0,
    daily_pnl REAL DEFAULT 0.0,
    weekly_pnl REAL DEFAULT 0.0,
    last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== POSITIONS =====
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    position_code TEXT UNIQUE, -- code unique pour retrouver la position
    asset_symbol TEXT NOT NULL,
    market TEXT NOT NULL,
    direction TEXT NOT NULL, -- LONG, SHORT
    entry_price REAL NOT NULL,
    amount REAL NOT NULL,
    leverage INTEGER DEFAULT 1,
    stop_loss REAL,
    take_profit_1 REAL,
    take_profit_2 REAL,
    current_price REAL,
    pnl REAL DEFAULT 0.0,
    pnl_percent REAL DEFAULT 0.0,
    status TEXT DEFAULT 'open', -- open, closed, tp1_hit, tp2_hit, sl_hit
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    close_reason TEXT, -- manual, tp1, tp2, sl, other
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== HISTORIQUE POSITIONS =====
CREATE TABLE IF NOT EXISTS position_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    position_code TEXT,
    asset_symbol TEXT,
    market TEXT,
    direction TEXT,
    entry_price REAL,
    exit_price REAL,
    amount REAL,
    leverage INTEGER,
    pnl REAL,
    pnl_percent REAL,
    duration_minutes INTEGER,
    close_reason TEXT,
    opened_at TIMESTAMP,
    closed_at TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== FAVORIS =====
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT NOT NULL,
    market TEXT NOT NULL,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active INTEGER DEFAULT 1,
    UNIQUE(telegram_id, asset_symbol),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== HISTORIQUE FAVORIS =====
CREATE TABLE IF NOT EXISTS favorites_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price REAL,
    score INTEGER,
    trend TEXT,
    alert_sent INTEGER DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== RÉSULTATS SCAN =====
CREATE TABLE IF NOT EXISTS scan_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    market TEXT,
    asset_symbol TEXT,
    score INTEGER,
    direction TEXT, -- LONG, SHORT, NEUTRAL
    trend TEXT,
    volatility REAL,
    volume_rating TEXT,
    risk_level TEXT, -- low, medium, high
    opportunity_type TEXT, -- breakout, reversal, continuation, etc.
    technical_summary TEXT,
    news_summary TEXT,
    alert_sent INTEGER DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    notification_type TEXT, -- opportunity, breakout, news, position, summary
    asset_symbol TEXT,
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read INTEGER DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== ÉTATS CONVERSATION (pour Trading Compagnon) =====
CREATE TABLE IF NOT EXISTS conversation_states (
    telegram_id INTEGER PRIMARY KEY,
    state TEXT, -- waiting_amount, waiting_direction, waiting_leverage, etc.
    context TEXT, -- JSON avec les données temporaires
    asset_symbol TEXT,
    market TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== INDEX POUR PERFORMANCES =====
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(telegram_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_user ON scan_results(telegram_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(scan_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(telegram_id);
