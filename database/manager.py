"""
Gestionnaire de base de données pour TDB Bot
"""
import aiosqlite
import json
from datetime import datetime
from pathlib import Path
import config

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
            direction = position['direction']
            entry_price = position['entry_price']
            amount = position['amount']
            leverage = position['leverage']

            if direction == 'LONG':
                pnl = (exit_price - entry_price) * amount * leverage
                pnl_percent = ((exit_price - entry_price) / entry_price) * 100 * leverage
            else:  # SHORT
                pnl = (entry_price - exit_price) * amount * leverage
                pnl_percent = ((entry_price - exit_price) / entry_price) * 100 * leverage

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

# Instance globale
db_manager = DatabaseManager()
