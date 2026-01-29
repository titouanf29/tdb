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

-- ===== ASSISTANT IA =====
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    role TEXT NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

CREATE TABLE IF NOT EXISTS ai_usage_stats (
    telegram_id INTEGER,
    date DATE DEFAULT CURRENT_DATE,
    message_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (telegram_id, date),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== INDEX POUR PERFORMANCES =====
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(telegram_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_user ON scan_results(telegram_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(scan_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_stats(telegram_id, date);

-- ===== ALERTES DE PRIX =====
CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT NOT NULL,
    market TEXT NOT NULL,
    condition TEXT NOT NULL, -- 'above', 'below'
    target_price REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    notification_sent INTEGER DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== ORDRES CONDITIONNELS (SL/TP AUTO) =====
CREATE TABLE IF NOT EXISTS conditional_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    position_id INTEGER,
    order_type TEXT NOT NULL, -- 'stop_loss', 'take_profit'
    trigger_price REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id),
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

-- ===== TEMPLATES DE PORTEFEUILLE =====
CREATE TABLE IF NOT EXISTS portfolio_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT, -- 'tech', 'dividends', 'crypto', 'defensive', etc.
    assets TEXT NOT NULL, -- JSON: [{"symbol": "AAPL", "weight": 25}, ...]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public INTEGER DEFAULT 1
);

-- ===== PORTEFEUILLES UTILISATEUR (copie de templates) =====
CREATE TABLE IF NOT EXISTS user_portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    template_id INTEGER,
    name TEXT,
    total_invested REAL DEFAULT 0,
    current_value REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id),
    FOREIGN KEY (template_id) REFERENCES portfolio_templates(id)
);

-- ===== LEADERBOARD =====
CREATE TABLE IF NOT EXISTS leaderboard (
    telegram_id INTEGER PRIMARY KEY,
    display_name TEXT, -- pseudo anonyme
    opt_in INTEGER DEFAULT 0, -- participation au classement
    total_pnl REAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0,
    best_trade REAL DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    rank_weekly INTEGER,
    rank_monthly INTEGER,
    rank_alltime INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== BADGES/ACHIEVEMENTS =====
CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    category TEXT, -- 'trading', 'learning', 'social', 'special'
    condition_type TEXT, -- 'trades_count', 'pnl_total', 'win_streak', etc.
    condition_value REAL
);

CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    badge_id INTEGER,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(telegram_id, badge_id),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id),
    FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- ===== CHALLENGES HEBDOMADAIRES =====
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    challenge_type TEXT, -- 'best_trade', 'most_trades', 'best_pnl'
    description TEXT,
    prize_description TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS challenge_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER,
    telegram_id INTEGER,
    score REAL DEFAULT 0,
    rank INTEGER,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, telegram_id),
    FOREIGN KEY (challenge_id) REFERENCES weekly_challenges(id),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== QUIZ TRADING =====
CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT, -- 'technical', 'fundamental', 'patterns', 'risk'
    difficulty TEXT, -- 'easy', 'medium', 'hard'
    question TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON: ["option1", "option2", "option3", "option4"]
    correct_answer INTEGER NOT NULL, -- index 0-3
    explanation TEXT,
    points INTEGER DEFAULT 10
);

CREATE TABLE IF NOT EXISTS user_quiz_stats (
    telegram_id INTEGER PRIMARY KEY,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_quiz_date DATE,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== WATCHLIST INTELLIGENTE =====
CREATE TABLE IF NOT EXISTS smart_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT NOT NULL,
    market TEXT NOT NULL,
    alert_threshold REAL DEFAULT 5.0, -- % de mouvement pour alerte
    last_price REAL,
    last_check TIMESTAMP,
    alerts_today INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    UNIQUE(telegram_id, asset_symbol),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== DIVERGENCES RSI DETECTEES =====
CREATE TABLE IF NOT EXISTS rsi_divergences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_symbol TEXT NOT NULL,
    market TEXT NOT NULL,
    divergence_type TEXT, -- 'bullish', 'bearish'
    rsi_value REAL,
    price_at_detection REAL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_sent INTEGER DEFAULT 0
);

-- ===== PARAMETRES MODE NUIT =====
-- Ajouté dans user_settings via migration

-- ===== INSERTION DES BADGES PAR DEFAUT =====
INSERT OR IGNORE INTO badges (code, name, description, emoji, category, condition_type, condition_value) VALUES
('first_trade', 'Premier Pas', 'Ouvrir votre première position', '🎯', 'trading', 'trades_count', 1),
('trader_10', 'Trader Actif', 'Effectuer 10 trades', '📊', 'trading', 'trades_count', 10),
('trader_50', 'Trader Confirmé', 'Effectuer 50 trades', '💼', 'trading', 'trades_count', 50),
('trader_100', 'Trader Expert', 'Effectuer 100 trades', '🏆', 'trading', 'trades_count', 100),
('win_streak_3', 'En Forme', '3 trades gagnants consécutifs', '🔥', 'trading', 'win_streak', 3),
('win_streak_5', 'Inarrêtable', '5 trades gagnants consécutifs', '⚡', 'trading', 'win_streak', 5),
('win_streak_10', 'Légende', '10 trades gagnants consécutifs', '👑', 'trading', 'win_streak', 10),
('profit_100', 'Premiers Gains', 'Gagner 100$ au total', '💵', 'trading', 'pnl_total', 100),
('profit_1000', 'Millionnaire en Herbe', 'Gagner 1000$ au total', '💰', 'trading', 'pnl_total', 1000),
('profit_10000', 'Maître Trader', 'Gagner 10000$ au total', '🤑', 'trading', 'pnl_total', 10000),
('quiz_10', 'Étudiant', 'Répondre à 10 quiz', '📚', 'learning', 'quiz_count', 10),
('quiz_50', 'Érudit', 'Répondre à 50 quiz', '🎓', 'learning', 'quiz_count', 50),
('perfect_week', 'Semaine Parfaite', '100% de trades gagnants sur une semaine (min 5)', '✨', 'special', 'perfect_week', 1),
('early_bird', 'Lève-tôt', 'Trader avant 7h du matin', '🌅', 'special', 'early_trade', 1),
('night_owl', 'Noctambule', 'Trader après 23h', '🦉', 'special', 'night_trade', 1);

-- ===== INSERTION DES TEMPLATES DE PORTEFEUILLE =====
INSERT OR IGNORE INTO portfolio_templates (name, description, category, assets) VALUES
('Tech US Leaders', 'Les géants de la tech américaine', 'tech', '[{"symbol":"AAPL","weight":20},{"symbol":"MSFT","weight":20},{"symbol":"GOOGL","weight":15},{"symbol":"AMZN","weight":15},{"symbol":"NVDA","weight":15},{"symbol":"META","weight":15}]'),
('Dividendes Aristocrates', 'Actions à dividendes stables', 'dividends', '[{"symbol":"JNJ","weight":20},{"symbol":"PG","weight":20},{"symbol":"KO","weight":20},{"symbol":"PEP","weight":20},{"symbol":"MMM","weight":20}]'),
('Crypto Blue Chip', 'Les cryptos majeures', 'crypto', '[{"symbol":"BTC-USD","weight":50},{"symbol":"ETH-USD","weight":30},{"symbol":"SOL-USD","weight":10},{"symbol":"BNB-USD","weight":10}]'),
('Défensif', 'Secteurs défensifs en période incertaine', 'defensive', '[{"symbol":"JNJ","weight":25},{"symbol":"PG","weight":25},{"symbol":"WMT","weight":25},{"symbol":"UNH","weight":25}]'),
('Énergie & Matières', 'Exposition aux commodités', 'commodities', '[{"symbol":"XOM","weight":25},{"symbol":"CVX","weight":25},{"symbol":"GC=F","weight":25},{"symbol":"CL=F","weight":25}]'),
('Growth Agressif', 'Actions de croissance à haut potentiel', 'growth', '[{"symbol":"TSLA","weight":25},{"symbol":"NVDA","weight":25},{"symbol":"AMD","weight":25},{"symbol":"PLTR","weight":25}]');

-- ===== INSERTION DES QUESTIONS QUIZ =====
INSERT OR IGNORE INTO quiz_questions (category, difficulty, question, options, correct_answer, explanation, points) VALUES
('technical', 'easy', 'Que signifie un RSI supérieur à 70 ?', '["Survente","Surachat","Zone neutre","Tendance haussière"]', 1, 'Un RSI > 70 indique une zone de surachat, suggérant une possible correction.', 10),
('technical', 'easy', 'Quelle moyenne mobile est la plus réactive ?', '["EMA 200","SMA 50","EMA 9","SMA 200"]', 2, 'L''EMA 9 est la plus réactive car elle donne plus de poids aux prix récents et utilise peu de périodes.', 10),
('technical', 'medium', 'Qu''est-ce qu''une divergence haussière RSI ?', '["RSI monte, prix monte","RSI baisse, prix monte","RSI monte, prix baisse","RSI baisse, prix baisse"]', 2, 'Une divergence haussière se produit quand le prix fait des plus bas mais le RSI fait des plus hauts.', 15),
('patterns', 'easy', 'Quel pattern indique un retournement haussier ?', '["Double Top","Épaule-Tête-Épaule","Double Bottom","Triangle Descendant"]', 2, 'Le Double Bottom est un pattern de retournement haussier formé après une tendance baissière.', 10),
('patterns', 'medium', 'Qu''indique un marteau (hammer) ?', '["Continuation baissière","Retournement haussier","Continuation haussière","Indécision"]', 1, 'Un marteau après une baisse suggère un retournement haussier potentiel.', 15),
('fundamental', 'easy', 'Que mesure le ratio P/E ?', '["Dette/Capitaux propres","Prix/Bénéfices","Rendement du dividende","Marge opérationnelle"]', 1, 'Le P/E (Price to Earnings) mesure combien les investisseurs paient pour chaque dollar de bénéfice.', 10),
('risk', 'easy', 'Quel est le rôle d''un stop-loss ?', '["Maximiser les gains","Limiter les pertes","Augmenter le levier","Diversifier"]', 1, 'Le stop-loss ferme automatiquement une position à un niveau prédéfini pour limiter les pertes.', 10),
('risk', 'medium', 'Avec un levier x10, une baisse de 10% du prix entraîne...', '["10% de perte","50% de perte","100% de perte","1% de perte"]', 2, 'Levier x10 × 10% de baisse = 100% de perte sur votre capital.', 15),
('technical', 'hard', 'Les bandes de Bollinger mesurent...', '["La tendance","Le momentum","La volatilité","Le volume"]', 2, 'Les bandes de Bollinger mesurent la volatilité en s''écartant ou se resserrant autour de la moyenne.', 20),
('fundamental', 'medium', 'Une hausse des taux de la Fed est généralement...', '["Positive pour les actions","Négative pour les actions","Sans impact","Positive pour l''or"]', 1, 'Des taux plus élevés rendent les obligations plus attractives et augmentent le coût du capital pour les entreprises.', 15);

-- ===== HISTORIQUE DES ANALYSES IA =====
CREATE TABLE IF NOT EXISTS ai_analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT NOT NULL,
    analysis_type TEXT, -- 'technical', 'fundamental', 'sentiment', 'full'
    analysis_content TEXT NOT NULL,
    sentiment TEXT, -- 'bullish', 'bearish', 'neutral'
    score INTEGER, -- 0-100
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== HISTORIQUE VALEUR PORTEFEUILLE =====
CREATE TABLE IF NOT EXISTS portfolio_value_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    date DATE NOT NULL,
    total_value REAL NOT NULL,
    daily_pnl REAL DEFAULT 0,
    daily_pnl_percent REAL DEFAULT 0,
    positions_count INTEGER DEFAULT 0,
    UNIQUE(telegram_id, date),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== ALERTES DE VOLATILITE =====
CREATE TABLE IF NOT EXISTS volatility_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT NOT NULL,
    threshold_percent REAL NOT NULL, -- % de mouvement pour declencher
    timeframe_minutes INTEGER DEFAULT 60, -- fenetre de temps
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered TIMESTAMP,
    UNIQUE(telegram_id, asset_symbol),
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== ORDRES SL/TP AVANCES =====
CREATE TABLE IF NOT EXISTS sltp_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    position_id INTEGER,
    asset_symbol TEXT NOT NULL,
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    stop_loss REAL,
    take_profit REAL,
    trailing_stop_percent REAL, -- trailing stop en %
    status TEXT DEFAULT 'pending', -- 'pending', 'sl_triggered', 'tp_triggered', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    execution_price REAL,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id),
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

-- ===== HISTORIQUE DES TRADES =====
CREATE TABLE IF NOT EXISTS trades_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    asset_symbol TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'BUY', 'SELL'
    quantity REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    pnl REAL DEFAULT 0,
    pnl_percent REAL DEFAULT 0,
    fees REAL DEFAULT 0,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- ===== INDEX SUPPLEMENTAIRES =====
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(telegram_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_leaderboard_pnl ON leaderboard(total_pnl);
CREATE INDEX IF NOT EXISTS idx_smart_watchlist_user ON smart_watchlist(telegram_id);
CREATE INDEX IF NOT EXISTS idx_rsi_divergences_symbol ON rsi_divergences(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user ON ai_analysis_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_user ON portfolio_value_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_volatility_alerts_user ON volatility_alerts(telegram_id);
CREATE INDEX IF NOT EXISTS idx_sltp_orders_user ON sltp_orders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_trades_history_user ON trades_history(telegram_id);
