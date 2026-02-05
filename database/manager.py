"""
Gestionnaire de base de données pour TDB Bot
"""
import logging
import aiosqlite
import json
from datetime import datetime
from pathlib import Path
import config

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Gère toutes les opérations de base de données"""

    def __init__(self, db_path=None):
        self.db_path = db_path or config.DATABASE_PATH
        self.schema_path = Path(__file__).parent / "schema.sql"

    async def init_db(self):
        """Initialise la base de données avec le schéma"""
        async with aiosqlite.connect(self.db_path) as db:
            with open(self.schema_path, 'r', encoding='utf-8') as f:
                schema = f.read()
            await db.executescript(schema)

            # Migration: Ajouter chart_type si la colonne n'existe pas
            try:
                await db.execute("""
                    ALTER TABLE user_settings ADD COLUMN chart_type TEXT DEFAULT 'candlestick'
                """)
                logger.debug("Migration: Colonne chart_type ajoutée")
            except Exception:
                pass  # La colonne existe déjà

            # Migration: Corriger les anciennes valeurs de trading_style
            try:
                await db.execute("""
                    UPDATE user_settings
                    SET trading_style = 'Day Trading'
                    WHERE trading_style = 'day_trading'
                """)
                await db.execute("""
                    UPDATE user_settings
                    SET trading_style = 'Swing Trading'
                    WHERE trading_style = 'swing'
                """)
                await db.execute("""
                    UPDATE user_settings
                    SET trading_style = 'Scalping'
                    WHERE trading_style = 'scalp'
                """)
            except Exception:
                pass  # Déjà mis à jour

            # Migration: Ajouter la colonne language
            try:
                await db.execute("""
                    ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'fr'
                """)
                logger.debug("Migration: Colonne language ajoutée")
            except Exception:
                pass  # La colonne existe déjà

            await db.commit()

    # ===== UTILISATEURS =====

    async def create_user(self, telegram_id, username=None, first_name=None, last_name=None):
        """Crée un nouvel utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, username, first_name, last_name))

            # Créer les paramètres par défaut
            await db.execute("""
                INSERT OR IGNORE INTO user_settings (telegram_id)
                VALUES (?)
            """, (telegram_id,))

            # Créer le wallet par défaut
            await db.execute("""
                INSERT OR IGNORE INTO wallet (telegram_id)
                VALUES (?)
            """, (telegram_id,))

            await db.commit()

    async def get_user(self, telegram_id):
        """Récupère un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM users WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    # ===== PARAMÈTRES =====

    async def get_user_settings(self, telegram_id):
        """Récupère les paramètres d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM user_settings WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def update_user_settings(self, telegram_id, **kwargs):
        """Met à jour les paramètres d'un utilisateur"""
        if not kwargs:
            return

        fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [telegram_id]

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"""
                UPDATE user_settings SET {fields} WHERE telegram_id = ?
            """, values)
            await db.commit()

    # ===== WALLET =====

    async def get_wallet(self, telegram_id):
        """Récupère le wallet d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM wallet WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def update_wallet(self, telegram_id, **kwargs):
        """Met à jour le wallet"""
        if not kwargs:
            return

        fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [telegram_id]

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"""
                UPDATE wallet SET {fields} WHERE telegram_id = ?
            """, values)
            await db.commit()

    async def reset_wallet(self, telegram_id):
        """Réinitialise le wallet"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE wallet SET
                    balance = initial_balance,
                    available_balance = initial_balance,
                    total_pnl = 0.0,
                    daily_pnl = 0.0,
                    weekly_pnl = 0.0,
                    last_reset = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    # ===== POSITIONS =====

    async def create_position(self, telegram_id, position_code, asset_symbol, market,
                            direction, entry_price, amount, leverage=1,
                            stop_loss=None, take_profit_1=None, take_profit_2=None):
        """Crée une nouvelle position"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO positions
                (telegram_id, position_code, asset_symbol, market, direction,
                entry_price, amount, leverage, stop_loss, take_profit_1, take_profit_2, current_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (telegram_id, position_code, asset_symbol, market, direction,
                  entry_price, amount, leverage, stop_loss, take_profit_1, take_profit_2, entry_price))
            await db.commit()

    async def get_position(self, position_code):
        """Récupère une position par son code"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM positions WHERE position_code = ?
            """, (position_code,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_open_positions(self, telegram_id):
        """Récupère toutes les positions ouvertes d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM positions
                WHERE telegram_id = ? AND status = 'open'
                ORDER BY opened_at DESC
            """, (telegram_id,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def update_position(self, position_code, **kwargs):
        """Met à jour une position"""
        if not kwargs:
            return

        fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [position_code]

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"""
                UPDATE positions SET {fields} WHERE position_code = ?
            """, values)
            await db.commit()

    async def close_position(self, position_code, exit_price, close_reason):
        """Ferme une position"""
        async with aiosqlite.connect(self.db_path) as db:
            # Récupérer la position
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM positions WHERE position_code = ?
            """, (position_code,)) as cursor:
                position = await cursor.fetchone()

            if not position:
                return

            # Calculer PnL
            # IMPORTANT: amount est en devise (ex: 1000 USD), pas en unites d'actif
            # Formule correcte: pnl = amount * (variation_prix / prix_entree) * leverage
            direction = position['direction']
            entry_price = position['entry_price']
            amount = position['amount']
            leverage = position['leverage']

            # Calcul du pourcentage de variation
            if direction == 'LONG':
                pnl_percent = ((exit_price - entry_price) / entry_price) * 100 * leverage
            else:  # SHORT
                pnl_percent = ((entry_price - exit_price) / entry_price) * 100 * leverage

            # PnL en valeur absolue (basé sur le montant investi)
            pnl = amount * (pnl_percent / 100)

            # Fermer la position
            await db.execute("""
                UPDATE positions SET
                    status = 'closed',
                    current_price = ?,
                    pnl = ?,
                    pnl_percent = ?,
                    closed_at = CURRENT_TIMESTAMP,
                    close_reason = ?
                WHERE position_code = ?
            """, (exit_price, pnl, pnl_percent, close_reason, position_code))

            # Ajouter à l'historique
            opened_at = datetime.fromisoformat(position['opened_at'])
            closed_at = datetime.now()
            duration = int((closed_at - opened_at).total_seconds() / 60)

            await db.execute("""
                INSERT INTO position_history
                (telegram_id, position_code, asset_symbol, market, direction,
                entry_price, exit_price, amount, leverage, pnl, pnl_percent,
                duration_minutes, close_reason, opened_at, closed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (position['telegram_id'], position_code, position['asset_symbol'],
                  position['market'], direction, entry_price, exit_price,
                  amount, leverage, pnl, pnl_percent, duration, close_reason,
                  position['opened_at'], closed_at))

            await db.commit()
            return pnl, pnl_percent

    # ===== FAVORIS =====

    async def add_favorite(self, telegram_id, asset_symbol, market):
        """Ajoute un actif aux favoris"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO favorites (telegram_id, asset_symbol, market)
                VALUES (?, ?, ?)
            """, (telegram_id, asset_symbol, market))
            await db.commit()

    async def remove_favorite(self, telegram_id, asset_symbol):
        """Retire un actif des favoris"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM favorites WHERE telegram_id = ? AND asset_symbol = ?
            """, (telegram_id, asset_symbol))
            await db.commit()

    async def get_favorites(self, telegram_id):
        """Récupère tous les favoris d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM favorites
                WHERE telegram_id = ? AND active = 1
                ORDER BY date_added DESC
            """, (telegram_id,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    # ===== SCAN RESULTS =====

    async def save_scan_result(self, telegram_id, market, asset_symbol, score,
                              direction, trend, volatility, volume_rating,
                              risk_level, opportunity_type, technical_summary,
                              news_summary, alert_sent=False):
        """Sauvegarde un résultat de scan"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO scan_results
                (telegram_id, market, asset_symbol, score, direction, trend,
                volatility, volume_rating, risk_level, opportunity_type,
                technical_summary, news_summary, alert_sent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (telegram_id, market, asset_symbol, score, direction, trend,
                  volatility, volume_rating, risk_level, opportunity_type,
                  technical_summary, news_summary, int(alert_sent)))
            await db.commit()

    async def get_recent_scans(self, telegram_id, hours=24):
        """Récupère les scans récents"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM scan_results
                WHERE telegram_id = ?
                AND datetime(scan_date) > datetime('now', '-' || ? || ' hours')
                ORDER BY scan_date DESC
            """, (telegram_id, hours)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    # ===== CONVERSATION STATES =====

    async def set_conversation_state(self, telegram_id, state, context=None,
                                    asset_symbol=None, market=None):
        """Définit l'état de conversation pour le Trading Compagnon"""
        context_json = json.dumps(context) if context else None
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO conversation_states
                (telegram_id, state, context, asset_symbol, market, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (telegram_id, state, context_json, asset_symbol, market))
            await db.commit()

    async def get_conversation_state(self, telegram_id):
        """Récupère l'état de conversation"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM conversation_states WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    result = dict(row)
                    if result['context']:
                        result['context'] = json.loads(result['context'])
                    return result
                return None

    async def clear_conversation_state(self, telegram_id):
        """Efface l'état de conversation"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM conversation_states WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    # ===== AUTO SCANNER =====

    async def get_all_users(self):
        """Récupère tous les utilisateurs enregistrés"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM users ORDER BY created_at DESC
            """) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_users_with_scan_enabled(self):
        """Récupère tous les utilisateurs avec le scan automatique activé"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM user_settings WHERE scan_enabled = 1
            """) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def save_scan_result_simple(self, user_id, asset_symbol, score, signal, price):
        """Sauvegarde un résultat de scan (version simplifiée)"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO scan_results
                (telegram_id, asset_symbol, score, direction, scan_date)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (user_id, asset_symbol, score, signal))
            await db.commit()

    # ===== ASSISTANT IA =====

    async def save_ai_message(self, telegram_id, role, content, tokens_used=0):
        """Sauvegarde un message de l'assistant IA"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO ai_chat_history (telegram_id, role, content, tokens_used)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, role, content, tokens_used))
            await db.commit()

    async def get_ai_chat_history(self, telegram_id, limit=10):
        """Récupère l'historique de conversation IA"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM ai_chat_history
                WHERE telegram_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (telegram_id, limit)) as cursor:
                rows = await cursor.fetchall()
                messages = [dict(row) for row in rows]
                return list(reversed(messages))  # Ordre chronologique

    async def clear_ai_chat_history(self, telegram_id):
        """Efface l'historique de conversation IA"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM ai_chat_history WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    async def get_ai_daily_usage(self, telegram_id):
        """Récupère l'utilisation journalière de l'IA"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM ai_usage_stats
                WHERE telegram_id = ? AND date = DATE('now')
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else {'message_count': 0, 'tokens_used': 0}

    async def increment_ai_usage(self, telegram_id, tokens_used=0):
        """Incrémente le compteur d'utilisation IA"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO ai_usage_stats (telegram_id, date, message_count, tokens_used)
                VALUES (?, DATE('now'), 1, ?)
                ON CONFLICT(telegram_id, date) DO UPDATE SET
                    message_count = message_count + 1,
                    tokens_used = tokens_used + ?
            """, (telegram_id, tokens_used, tokens_used))
            await db.commit()

    async def check_ai_limit_reached(self, telegram_id):
        """Vérifie si la limite journalière de messages IA est atteinte"""
        usage = await self.get_ai_daily_usage(telegram_id)
        return usage['message_count'] >= config.MAX_AI_MESSAGES_PER_DAY

    # ===== ALERTES DE PRIX =====

    async def create_price_alert(self, telegram_id, symbol, market, condition, target_price):
        """Cree une alerte de prix"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO price_alerts (telegram_id, asset_symbol, market, condition, target_price)
                VALUES (?, ?, ?, ?, ?)
            """, (telegram_id, symbol, market, condition, target_price))
            await db.commit()
            return cursor.lastrowid

    async def get_user_price_alerts(self, telegram_id):
        """Recupere les alertes actives d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM price_alerts WHERE telegram_id = ? AND is_active = 1
                ORDER BY created_at DESC
            """, (telegram_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_all_active_alerts(self):
        """Recupere toutes les alertes actives"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM price_alerts WHERE is_active = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def delete_price_alert(self, alert_id, telegram_id):
        """Supprime une alerte"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM price_alerts WHERE id = ? AND telegram_id = ?
            """, (alert_id, telegram_id))
            await db.commit()
            return True

    async def mark_alert_triggered(self, alert_id):
        """Marque une alerte comme declenchee"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE price_alerts SET is_active = 0, triggered_at = CURRENT_TIMESTAMP,
                notification_sent = 1 WHERE id = ?
            """, (alert_id,))
            await db.commit()

    # ===== ORDRES CONDITIONNELS =====

    async def create_conditional_order(self, telegram_id, position_id, order_type, trigger_price):
        """Cree un ordre conditionnel"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO conditional_orders (telegram_id, position_id, order_type, trigger_price)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, position_id, order_type, trigger_price))
            await db.commit()
            return cursor.lastrowid

    async def get_active_conditional_orders(self):
        """Recupere tous les ordres conditionnels actifs"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM conditional_orders WHERE is_active = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_position_by_id(self, position_id):
        """Recupere une position par ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM positions WHERE id = ?
            """, (position_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def deactivate_conditional_order(self, order_id):
        """Desactive un ordre conditionnel"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE conditional_orders SET is_active = 0 WHERE id = ?
            """, (order_id,))
            await db.commit()

    async def mark_order_triggered(self, order_id):
        """Marque un ordre comme declenche"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE conditional_orders SET is_active = 0, triggered_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (order_id,))
            await db.commit()

    # ===== WATCHLIST INTELLIGENTE =====

    async def add_to_smart_watchlist(self, telegram_id, symbol, market, threshold, current_price):
        """Ajoute un actif a la watchlist intelligente"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO smart_watchlist
                (telegram_id, asset_symbol, market, alert_threshold, last_price, last_check)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (telegram_id, symbol, market, threshold, current_price))
            await db.commit()

    async def get_smart_watchlist(self, telegram_id):
        """Recupere la watchlist d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM smart_watchlist WHERE telegram_id = ? AND is_active = 1
            """, (telegram_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_all_watchlist_items(self):
        """Recupere tous les items de watchlist actifs"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM smart_watchlist WHERE is_active = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def remove_from_smart_watchlist(self, telegram_id, symbol):
        """Retire un actif de la watchlist"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM smart_watchlist WHERE telegram_id = ? AND asset_symbol = ?
            """, (telegram_id, symbol))
            await db.commit()
            return True

    async def update_watchlist_price(self, item_id, price):
        """Met a jour le prix dans la watchlist"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE smart_watchlist SET last_price = ?, last_check = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (price, item_id))
            await db.commit()

    async def increment_watchlist_alerts(self, item_id):
        """Incremente le compteur d'alertes"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE smart_watchlist SET alerts_today = alerts_today + 1 WHERE id = ?
            """, (item_id,))
            await db.commit()

    # ===== LEADERBOARD =====

    async def opt_in_leaderboard(self, telegram_id, display_name):
        """Inscrit un utilisateur au leaderboard"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO leaderboard (telegram_id, display_name, opt_in)
                VALUES (?, ?, 1)
            """, (telegram_id, display_name))
            await db.commit()

    async def opt_out_leaderboard(self, telegram_id):
        """Desinscrit un utilisateur du leaderboard"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE leaderboard SET opt_in = 0 WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    async def get_leaderboard(self, period='weekly', limit=10):
        """Recupere le classement"""
        order_col = 'rank_weekly' if period == 'weekly' else 'rank_monthly' if period == 'monthly' else 'total_pnl'
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(f"""
                SELECT * FROM leaderboard WHERE opt_in = 1
                ORDER BY total_pnl DESC LIMIT ?
            """, (limit,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_leaderboard_participants(self):
        """Recupere les participants du leaderboard"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM leaderboard WHERE opt_in = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_user_leaderboard_rank(self, telegram_id):
        """Recupere le rang d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM leaderboard WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def calculate_user_trading_stats(self, telegram_id):
        """Calcule les statistiques de trading d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            # Total trades et PnL
            async with db.execute("""
                SELECT COUNT(*) as total, SUM(pnl) as total_pnl,
                       SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
                FROM position_history WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                total_trades = row['total'] or 0
                total_pnl = row['total_pnl'] or 0
                wins = row['wins'] or 0

            win_rate = (wins / total_trades * 100) if total_trades > 0 else 0

            # Meilleur trade
            async with db.execute("""
                SELECT MAX(pnl) as best FROM position_history WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                best_trade = row['best'] or 0

            return {
                'total_trades': total_trades,
                'total_pnl': total_pnl,
                'win_rate': win_rate,
                'best_trade': best_trade,
                'current_streak': 0,  # TODO: calculer
                'has_early_trade': False,
                'has_night_trade': False
            }

    async def update_leaderboard_stats(self, telegram_id, stats):
        """Met a jour les stats du leaderboard"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE leaderboard SET
                    total_pnl = ?, total_trades = ?, win_rate = ?, best_trade = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (stats['total_pnl'], stats['total_trades'], stats['win_rate'],
                  stats['best_trade'], telegram_id))
            await db.commit()

    # ===== BADGES =====

    async def get_all_badges(self):
        """Recupere tous les badges"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM badges") as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_user_badges(self, telegram_id):
        """Recupere les badges d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT b.*, ub.earned_at FROM badges b
                JOIN user_badges ub ON b.id = ub.badge_id
                WHERE ub.telegram_id = ?
                ORDER BY ub.earned_at DESC
            """, (telegram_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def award_badge(self, telegram_id, badge_id):
        """Attribue un badge a un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR IGNORE INTO user_badges (telegram_id, badge_id)
                VALUES (?, ?)
            """, (telegram_id, badge_id))
            await db.commit()

    # ===== CHALLENGES =====

    async def get_active_challenge(self):
        """Recupere le challenge actif"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM weekly_challenges WHERE is_active = 1
                ORDER BY week_start DESC LIMIT 1
            """) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def create_weekly_challenge(self, week_start, week_end, challenge_type, description, prize):
        """Cree un nouveau challenge"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO weekly_challenges (week_start, week_end, challenge_type, description, prize_description)
                VALUES (?, ?, ?, ?, ?)
            """, (week_start, week_end, challenge_type, description, prize))
            await db.commit()

    async def join_challenge(self, challenge_id, telegram_id):
        """Rejoint un challenge"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR IGNORE INTO challenge_participants (challenge_id, telegram_id)
                VALUES (?, ?)
            """, (challenge_id, telegram_id))
            await db.commit()

    async def get_challenge_participants(self, challenge_id):
        """Recupere les participants d'un challenge"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM challenge_participants WHERE challenge_id = ?
            """, (challenge_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_challenge_leaderboard(self, challenge_id):
        """Recupere le classement d'un challenge"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT cp.*, l.display_name FROM challenge_participants cp
                LEFT JOIN leaderboard l ON cp.telegram_id = l.telegram_id
                WHERE cp.challenge_id = ?
                ORDER BY cp.score DESC LIMIT 10
            """, (challenge_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def update_challenge_score(self, challenge_id, telegram_id, score):
        """Met a jour le score d'un participant"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE challenge_participants SET score = ?
                WHERE challenge_id = ? AND telegram_id = ?
            """, (score, challenge_id, telegram_id))
            await db.commit()

    # ===== QUIZ =====

    async def get_random_quiz_question(self):
        """Recupere une question aleatoire"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 1
            """) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_quiz_question(self, question_id):
        """Recupere une question par ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM quiz_questions WHERE id = ?
            """, (question_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_user_quiz_stats(self, telegram_id):
        """Recupere les stats quiz d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM user_quiz_stats WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def update_quiz_stats(self, telegram_id, is_correct, points):
        """Met a jour les stats quiz"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO user_quiz_stats (telegram_id, total_questions, correct_answers,
                    total_points, current_streak, last_quiz_date)
                VALUES (?, 1, ?, ?, ?, DATE('now'))
                ON CONFLICT(telegram_id) DO UPDATE SET
                    total_questions = total_questions + 1,
                    correct_answers = correct_answers + ?,
                    total_points = total_points + ?,
                    current_streak = CASE WHEN ? THEN current_streak + 1 ELSE 0 END,
                    best_streak = MAX(best_streak, CASE WHEN ? THEN current_streak + 1 ELSE 0 END),
                    last_quiz_date = DATE('now')
            """, (telegram_id, 1 if is_correct else 0, points, 1 if is_correct else 0,
                  1 if is_correct else 0, points, is_correct, is_correct))
            await db.commit()

    # ===== DIVERGENCES RSI =====

    async def save_rsi_divergence(self, divergence):
        """Sauvegarde une divergence RSI detectee"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO rsi_divergences (asset_symbol, market, divergence_type, rsi_value, price_at_detection)
                VALUES (?, ?, ?, ?, ?)
            """, (divergence['symbol'], divergence['market'], divergence['type'],
                  divergence['rsi'], divergence['price']))
            await db.commit()

    async def get_recent_divergence(self, symbol, divergence_type):
        """Verifie s'il y a une divergence recente"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM rsi_divergences
                WHERE asset_symbol = ? AND divergence_type = ?
                AND datetime(detected_at) > datetime('now', '-24 hours')
            """, (symbol, divergence_type)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    # ===== SCREENER =====

    async def save_screener_result(self, setup):
        """Sauvegarde un resultat de screener"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO scan_results (telegram_id, market, asset_symbol, score, direction,
                    opportunity_type, technical_summary)
                VALUES (0, ?, ?, ?, ?, ?, ?)
            """, (setup['market'], setup['symbol'], setup['score'], setup['direction'],
                  setup['setup_type'], f"RSI: {setup['rsi']}, Conf: {setup['confidence']}"))
            await db.commit()

    async def get_best_setups(self, market=None, limit=10):
        """Recupere les meilleurs setups du jour"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = """
                SELECT * FROM scan_results
                WHERE DATE(scan_date) = DATE('now')
            """
            params = []
            if market:
                query += " AND market = ?"
                params.append(market)
            query += " ORDER BY score DESC LIMIT ?"
            params.append(limit)

            async with db.execute(query, params) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    # ===== TEMPLATES PORTEFEUILLE =====

    async def get_portfolio_templates(self, category=None):
        """Recupere les templates de portefeuille"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = "SELECT * FROM portfolio_templates WHERE is_public = 1"
            params = []
            if category:
                query += " AND category = ?"
                params.append(category)

            async with db.execute(query, params) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_template_by_id(self, template_id):
        """Recupere un template par ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM portfolio_templates WHERE id = ?
            """, (template_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    # ===== HISTORIQUE POSITIONS =====

    async def get_position_history(self, telegram_id, from_date=None, to_date=None, limit=100):
        """Recupere l'historique des positions"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = "SELECT * FROM position_history WHERE telegram_id = ?"
            params = [telegram_id]

            if from_date:
                query += " AND DATE(closed_at) >= ?"
                params.append(from_date)
            if to_date:
                query += " AND DATE(closed_at) <= ?"
                params.append(to_date)

            query += " ORDER BY closed_at DESC LIMIT ?"
            params.append(limit)

            async with db.execute(query, params) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    # ===== RESUME MATINAL =====

    async def get_users_with_daily_summary(self):
        """Recupere les utilisateurs avec resume quotidien active"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM user_settings WHERE notif_daily_summary = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    # ===== HISTORIQUE ANALYSES IA =====

    async def save_ai_analysis(self, telegram_id, symbol, analysis_type, content, sentiment=None, score=None):
        """Sauvegarde une analyse IA"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO ai_analysis_history (telegram_id, asset_symbol, analysis_type, analysis_content, sentiment, score)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (telegram_id, symbol, analysis_type, content, sentiment, score))
            await db.commit()

    async def get_ai_analysis_history(self, telegram_id, limit=10):
        """Recupere l'historique des analyses IA"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM ai_analysis_history
                WHERE telegram_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (telegram_id, limit)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_ai_analysis_by_symbol(self, telegram_id, symbol, limit=5):
        """Recupere les analyses pour un symbole specifique"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM ai_analysis_history
                WHERE telegram_id = ? AND asset_symbol = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (telegram_id, symbol, limit)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    # ===== HISTORIQUE VALEUR PORTEFEUILLE =====

    async def save_portfolio_value(self, telegram_id, total_value, daily_pnl=0, positions_count=0):
        """Sauvegarde la valeur du portefeuille"""
        today = datetime.now().strftime('%Y-%m-%d')
        daily_pnl_percent = (daily_pnl / total_value * 100) if total_value > 0 else 0
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO portfolio_value_history
                (telegram_id, date, total_value, daily_pnl, daily_pnl_percent, positions_count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (telegram_id, today, total_value, daily_pnl, daily_pnl_percent, positions_count))
            await db.commit()

    async def get_portfolio_history(self, telegram_id, days=30):
        """Recupere l'historique de valeur du portefeuille"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT date, total_value as value, daily_pnl, daily_pnl_percent
                FROM portfolio_value_history
                WHERE telegram_id = ?
                ORDER BY date DESC
                LIMIT ?
            """, (telegram_id, days)) as cursor:
                rows = [dict(row) for row in await cursor.fetchall()]
                return list(reversed(rows))

    # ===== ALERTES DE VOLATILITE =====

    async def create_volatility_alert(self, telegram_id, symbol, threshold, timeframe=60):
        """Cree une alerte de volatilite"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO volatility_alerts
                (telegram_id, asset_symbol, threshold_percent, timeframe_minutes)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, symbol, threshold, timeframe))
            await db.commit()
            return True

    async def get_user_volatility_alerts(self, telegram_id):
        """Recupere les alertes de volatilite d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM volatility_alerts
                WHERE telegram_id = ? AND is_active = 1
            """, (telegram_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_all_volatility_alerts(self):
        """Recupere toutes les alertes de volatilite actives"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM volatility_alerts WHERE is_active = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def update_volatility_alert_trigger(self, alert_id):
        """Met a jour le dernier declenchement"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE volatility_alerts SET last_triggered = CURRENT_TIMESTAMP WHERE id = ?
            """, (alert_id,))
            await db.commit()

    # ===== ORDRES SL/TP =====

    async def create_sltp_order(self, telegram_id, position_id, symbol, quantity, entry_price, stop_loss=None, take_profit=None, trailing_stop=None):
        """Cree un ordre SL/TP"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO sltp_orders
                (telegram_id, position_id, asset_symbol, quantity, entry_price, stop_loss, take_profit, trailing_stop_percent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (telegram_id, position_id, symbol, quantity, entry_price, stop_loss, take_profit, trailing_stop))
            await db.commit()
            return cursor.lastrowid

    async def get_pending_sltp_orders(self):
        """Recupere tous les ordres SL/TP en attente"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM sltp_orders WHERE status = 'pending'
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_pending_conditional_orders(self):
        """Alias pour compatibilite"""
        return await self.get_pending_sltp_orders()

    async def mark_sltp_executed(self, order_id, status, execution_price):
        """Marque un ordre comme execute"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE sltp_orders
                SET status = ?, executed_at = CURRENT_TIMESTAMP, execution_price = ?
                WHERE id = ?
            """, (status, execution_price, order_id))
            await db.commit()

    async def mark_order_executed(self, order_id, execution_type, execution_price):
        """Alias pour compatibilite"""
        status = 'sl_triggered' if execution_type == 'STOP_LOSS' else 'tp_triggered'
        await self.mark_sltp_executed(order_id, status, execution_price)

    async def update_position_after_sltp(self, user_id, symbol, quantity, execution_price, pnl):
        """Met a jour la position apres execution SL/TP"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE positions
                SET status = 'closed', closed_at = CURRENT_TIMESTAMP, current_price = ?, pnl = ?
                WHERE telegram_id = ? AND asset_symbol = ? AND status = 'open'
            """, (execution_price, pnl, user_id, symbol))

            # Mettre a jour le wallet
            await db.execute("""
                UPDATE wallet SET total_pnl = total_pnl + ?, balance = balance + ?
                WHERE telegram_id = ?
            """, (pnl, (quantity * execution_price) + pnl, user_id))

            await db.commit()

    # ===== HISTORIQUE DES TRADES =====

    async def add_trade_to_history(self, telegram_id, symbol, direction, quantity, entry_price, exit_price=None, pnl=0, notes=None):
        """Ajoute un trade a l'historique"""
        pnl_percent = (pnl / (entry_price * quantity) * 100) if (entry_price * quantity) > 0 else 0
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO trades_history
                (telegram_id, asset_symbol, direction, quantity, entry_price, exit_price, pnl, pnl_percent, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (telegram_id, symbol, direction, quantity, entry_price, exit_price, pnl, pnl_percent, notes))
            await db.commit()

    async def get_user_trades_history(self, telegram_id, limit=100):
        """Recupere l'historique des trades d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM trades_history
                WHERE telegram_id = ?
                ORDER BY opened_at DESC
                LIMIT ?
            """, (telegram_id, limit)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_user_positions(self, telegram_id):
        """Recupere les positions ouvertes d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM positions
                WHERE telegram_id = ? AND status = 'open'
            """, (telegram_id,)) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    # ===== ALERTES - METHODES COMPLEMENTAIRES =====

    async def get_all_active_alerts(self):
        """Recupere toutes les alertes actives"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM price_alerts WHERE is_active = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def get_all_watchlist_items(self):
        """Recupere toutes les items de watchlist actifs"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM smart_watchlist WHERE is_active = 1
            """) as cursor:
                return [dict(row) for row in await cursor.fetchall()]

    async def deactivate_alert(self, alert_id):
        """Desactive une alerte"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE price_alerts
                SET is_active = 0, triggered_at = CURRENT_TIMESTAMP, notification_sent = 1
                WHERE id = ?
            """, (alert_id,))
            await db.commit()


    # ===== ONBOARDING =====

    async def get_user_onboarding(self, telegram_id):
        """Récupère l'état d'onboarding d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM user_onboarding WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    result = dict(row)
                    if result.get('selected_markets'):
                        result['selected_markets'] = json.loads(result['selected_markets'])
                    return result
                return None

    async def create_user_onboarding(self, telegram_id, referral_code=None, referred_by=None):
        """Crée un nouvel enregistrement d'onboarding"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR IGNORE INTO user_onboarding
                (telegram_id, referral_code, referred_by)
                VALUES (?, ?, ?)
            """, (telegram_id, referral_code, referred_by))
            await db.commit()

    async def update_onboarding_step(self, telegram_id, step, **kwargs):
        """Met à jour l'étape d'onboarding et les données associées"""
        async with aiosqlite.connect(self.db_path) as db:
            # Préparer les champs à mettre à jour
            fields = ["current_step = ?"]
            values = [step]

            for key, value in kwargs.items():
                if key == 'selected_markets' and isinstance(value, list):
                    value = json.dumps(value)
                fields.append(f"{key} = ?")
                values.append(value)

            values.append(telegram_id)

            await db.execute(f"""
                UPDATE user_onboarding SET {', '.join(fields)} WHERE telegram_id = ?
            """, values)
            await db.commit()

    async def complete_onboarding(self, telegram_id):
        """Marque l'onboarding comme terminé"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE user_onboarding
                SET current_step = 'completed', onboarding_completed = 1, completed_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    async def is_onboarding_completed(self, telegram_id):
        """Vérifie si l'onboarding est terminé"""
        onboarding = await self.get_user_onboarding(telegram_id)
        return onboarding and onboarding.get('onboarding_completed', 0) == 1

    # ===== FREEMIUM / SUBSCRIPTIONS =====

    async def get_user_subscription(self, telegram_id):
        """Récupère l'abonnement d'un utilisateur"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM user_subscriptions WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def create_user_subscription(self, telegram_id):
        """Crée un abonnement gratuit par défaut"""
        import secrets
        referral_code = f"TDB{secrets.token_hex(4).upper()}"
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR IGNORE INTO user_subscriptions (telegram_id, referral_code)
                VALUES (?, ?)
            """, (telegram_id, referral_code))
            await db.commit()

    async def increment_analyses_used(self, telegram_id):
        """Incrémente le compteur d'analyses utilisées aujourd'hui"""
        today = datetime.now().strftime('%Y-%m-%d')
        async with aiosqlite.connect(self.db_path) as db:
            # Réinitialiser si nouveau jour
            await db.execute("""
                UPDATE user_subscriptions
                SET analyses_used_today = 0, last_analysis_reset = ?
                WHERE telegram_id = ? AND last_analysis_reset != ?
            """, (today, telegram_id, today))

            # Incrémenter
            await db.execute("""
                UPDATE user_subscriptions
                SET analyses_used_today = analyses_used_today + 1
                WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    async def can_use_analysis(self, telegram_id):
        """Vérifie si l'utilisateur peut encore utiliser des analyses aujourd'hui"""
        import config
        sub = await self.get_user_subscription(telegram_id)
        if not sub:
            await self.create_user_subscription(telegram_id)
            return True

        # Premium = illimité
        if sub['tier'] == 'premium' or sub['tier'] == 'vip':
            return True

        # Réinitialiser si nouveau jour
        today = datetime.now().strftime('%Y-%m-%d')
        if sub['last_analysis_reset'] != today:
            return True

        # Vérifier la limite
        limit = config.FREE_TIER.get('analyses_per_day', 3)
        return sub['analyses_used_today'] < limit

    async def get_referral_by_code(self, code):
        """Récupère le telegram_id du parrain par son code"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT telegram_id FROM user_subscriptions WHERE referral_code = ?
            """, (code,)) as cursor:
                row = await cursor.fetchone()
                return row['telegram_id'] if row else None

    async def increment_referrals(self, telegram_id):
        """Incrémente le compteur de parrainages"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE user_subscriptions
                SET total_referrals = total_referrals + 1
                WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    # ===== CHANNEL WELCOME =====

    async def log_channel_join(self, telegram_id, username=None, first_name=None):
        """Enregistre un nouvel arrivant dans le canal"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO channel_welcome_messages
                (telegram_id, username, first_name)
                VALUES (?, ?, ?)
            """, (telegram_id, username, first_name))
            await db.commit()

    async def mark_welcome_sent(self, telegram_id):
        """Marque le message de bienvenue comme envoyé"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE channel_welcome_messages SET welcome_sent = 1 WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    async def mark_bot_started(self, telegram_id):
        """Marque que l'utilisateur a démarré le bot"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE channel_welcome_messages SET started_bot = 1 WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    # ===== USAGE STATS =====

    async def log_usage(self, telegram_id, action_type, details=None):
        """Enregistre une action utilisateur"""
        details_json = json.dumps(details) if details else None
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO usage_stats (telegram_id, action_type, details)
                VALUES (?, ?, ?)
            """, (telegram_id, action_type, details_json))
            await db.commit()

    async def get_user_stats_today(self, telegram_id, action_type):
        """Compte les actions d'un type aujourd'hui"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT COUNT(*) as count FROM usage_stats
                WHERE telegram_id = ? AND action_type = ?
                AND DATE(action_date) = DATE('now')
            """, (telegram_id, action_type)) as cursor:
                row = await cursor.fetchone()
                return row[0] if row else 0

    # ===== HISTORIQUE DE RECHERCHE =====

    async def add_search_history(self, telegram_id, query, result_symbol=None, search_type='asset'):
        """Ajoute une recherche à l'historique"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO search_history (telegram_id, query, result_symbol, search_type)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, query, result_symbol, search_type))
            await db.commit()

    async def get_search_history(self, telegram_id, limit=10):
        """Récupère l'historique de recherche récent"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT DISTINCT query, result_symbol, search_type, MAX(searched_at) as last_search
                FROM search_history
                WHERE telegram_id = ?
                GROUP BY query
                ORDER BY last_search DESC
                LIMIT ?
            """, (telegram_id, limit)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def clear_search_history(self, telegram_id):
        """Efface l'historique de recherche"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM search_history WHERE telegram_id = ?", (telegram_id,))
            await db.commit()

    # ===== FAVORIS ÉPINGLÉS =====

    async def add_pinned_favorite(self, telegram_id, symbol, market):
        """Ajoute un favori épinglé"""
        async with aiosqlite.connect(self.db_path) as db:
            # Récupérer le prochain ordre
            async with db.execute("""
                SELECT COALESCE(MAX(display_order), -1) + 1 FROM pinned_favorites WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                order = row[0] if row else 0

            await db.execute("""
                INSERT OR REPLACE INTO pinned_favorites (telegram_id, asset_symbol, market, display_order)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, symbol, market, order))
            await db.commit()

    async def remove_pinned_favorite(self, telegram_id, symbol):
        """Retire un favori épinglé"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM pinned_favorites WHERE telegram_id = ? AND asset_symbol = ?
            """, (telegram_id, symbol))
            await db.commit()

    async def get_pinned_favorites(self, telegram_id, limit=5):
        """Récupère les favoris épinglés"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT asset_symbol, market, display_order
                FROM pinned_favorites
                WHERE telegram_id = ?
                ORDER BY display_order ASC
                LIMIT ?
            """, (telegram_id, limit)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def is_pinned(self, telegram_id, symbol):
        """Vérifie si un actif est épinglé"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT 1 FROM pinned_favorites WHERE telegram_id = ? AND asset_symbol = ?
            """, (telegram_id, symbol)) as cursor:
                return await cursor.fetchone() is not None

    # ===== MODE NE PAS DÉRANGER =====

    async def get_dnd_settings(self, telegram_id):
        """Récupère les paramètres Ne pas déranger"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM dnd_settings WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                # Créer les paramètres par défaut
                await db.execute("""
                    INSERT OR IGNORE INTO dnd_settings (telegram_id) VALUES (?)
                """, (telegram_id,))
                await db.commit()
                return {
                    'telegram_id': telegram_id,
                    'dnd_enabled': 0,
                    'dnd_start_time': '22:00',
                    'dnd_end_time': '08:00',
                    'dnd_weekends': 0,
                    'allow_urgent': 1
                }

    async def update_dnd_settings(self, telegram_id, **kwargs):
        """Met à jour les paramètres Ne pas déranger"""
        async with aiosqlite.connect(self.db_path) as db:
            # S'assurer que l'entrée existe
            await db.execute("""
                INSERT OR IGNORE INTO dnd_settings (telegram_id) VALUES (?)
            """, (telegram_id,))

            # Construire la requête de mise à jour
            if kwargs:
                fields = [f"{key} = ?" for key in kwargs.keys()]
                values = list(kwargs.values()) + [telegram_id]
                await db.execute(f"""
                    UPDATE dnd_settings SET {', '.join(fields)} WHERE telegram_id = ?
                """, values)

            await db.commit()

    async def is_dnd_active(self, telegram_id):
        """Vérifie si le mode Ne pas déranger est actuellement actif"""
        from datetime import datetime
        settings = await self.get_dnd_settings(telegram_id)

        if not settings.get('dnd_enabled'):
            return False

        now = datetime.now()
        current_time = now.strftime('%H:%M')
        start = settings['dnd_start_time']
        end = settings['dnd_end_time']

        # Vérifier si c'est le weekend
        if now.weekday() >= 5 and not settings.get('dnd_weekends'):
            return False

        # Gérer le cas où la période traverse minuit
        if start <= end:
            return start <= current_time <= end
        else:
            return current_time >= start or current_time <= end

    # ===== RÉSUMÉ QUOTIDIEN =====

    async def get_daily_summary_settings(self, telegram_id):
        """Récupère les paramètres du résumé quotidien"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM daily_summary_settings WHERE telegram_id = ?
            """, (telegram_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                # Créer les paramètres par défaut
                await db.execute("""
                    INSERT OR IGNORE INTO daily_summary_settings (telegram_id) VALUES (?)
                """, (telegram_id,))
                await db.commit()
                return {
                    'telegram_id': telegram_id,
                    'summary_enabled': 0,
                    'summary_time': '08:00',
                    'include_portfolio': 1,
                    'include_watchlist': 1,
                    'include_alerts': 1,
                    'include_market_overview': 1,
                    'include_opportunities': 1,
                    'last_sent_at': None
                }

    async def update_daily_summary_settings(self, telegram_id, **kwargs):
        """Met à jour les paramètres du résumé quotidien"""
        async with aiosqlite.connect(self.db_path) as db:
            # S'assurer que l'entrée existe
            await db.execute("""
                INSERT OR IGNORE INTO daily_summary_settings (telegram_id) VALUES (?)
            """, (telegram_id,))

            if kwargs:
                fields = [f"{key} = ?" for key in kwargs.keys()]
                values = list(kwargs.values()) + [telegram_id]
                await db.execute(f"""
                    UPDATE daily_summary_settings SET {', '.join(fields)} WHERE telegram_id = ?
                """, values)

            await db.commit()

    async def mark_daily_summary_sent(self, telegram_id):
        """Marque le résumé quotidien comme envoyé"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE daily_summary_settings SET last_sent_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
            """, (telegram_id,))
            await db.commit()

    async def get_users_for_daily_summary(self):
        """Récupère les utilisateurs qui doivent recevoir un résumé maintenant"""
        from datetime import datetime
        current_time = datetime.now().strftime('%H:%M')

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT telegram_id FROM daily_summary_settings
                WHERE summary_enabled = 1
                AND summary_time = ?
                AND (last_sent_at IS NULL OR DATE(last_sent_at) < DATE('now'))
            """, (current_time,)) as cursor:
                rows = await cursor.fetchall()
                return [row['telegram_id'] for row in rows]


# Instance globale
db_manager = DatabaseManager()
