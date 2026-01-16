import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import datetime as dt
import asyncio
from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters
import json
import time
import traceback
import pytz
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from io import BytesIO



#!/usr/bin/env python3
"""
Module Database complet pour le trading bot
"""

import sqlite3
from datetime import datetime

DB_FILE = 'trading_bot.db'

def get_connection():
    """Connexion à la base de données"""
    return sqlite3.connect(DB_FILE)

# ==================== INITIALIZATION ====================

def init_database():
    """Initialise la base de données avec toutes les tables"""
    conn = get_connection()
    c = conn.cursor()
    
    # Table users
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            trading_mode TEXT DEFAULT 'paper',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table paper_portfolio (capital papier)
    c.execute('''
        CREATE TABLE IF NOT EXISTS paper_portfolio (
            user_id INTEGER PRIMARY KEY,
            initial_capital REAL DEFAULT 10000,
            current_cash REAL DEFAULT 10000,
            total_invested REAL DEFAULT 0,
            total_pnl REAL DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table paper_positions
    c.execute('''
        CREATE TABLE IF NOT EXISTS paper_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            ticker TEXT,
            position_type TEXT,
            product_type TEXT,
            entry_price REAL,
            current_price REAL,
            leverage INTEGER,
            amount REAL,
            exposure REAL,
            tp1 REAL,
            tp2 REAL,
            stop_loss REAL,
            barrier_knockout REAL,
            horizon TEXT,
            trailing_stop INTEGER DEFAULT 0,
            pnl REAL DEFAULT 0,
            pnl_pct REAL DEFAULT 0,
            status TEXT DEFAULT 'open',
            exit_price REAL,
            close_reason TEXT,
            alert_sent_tp1 INTEGER DEFAULT 0,
            alert_sent_tp2 INTEGER DEFAULT 0,
            alert_sent_stop_loss INTEGER DEFAULT 0,
            alert_sent_knockout INTEGER DEFAULT 0,
            opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
            closed_at TEXT
        )
    ''')
    
    # Table paper_stats
    c.execute('''
        CREATE TABLE IF NOT EXISTS paper_stats (
            user_id INTEGER PRIMARY KEY,
            total_trades INTEGER DEFAULT 0,
            winners INTEGER DEFAULT 0,
            losers INTEGER DEFAULT 0,
            best_trade REAL DEFAULT 0,
            worst_trade REAL DEFAULT 0,
            total_profit REAL DEFAULT 0,
            total_loss REAL DEFAULT 0
        )
    ''')
    

    
    # Table alerts (alertes de prix)
    c.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ticker TEXT NOT NULL,
            condition TEXT NOT NULL,
            target_price REAL NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            triggered_at TEXT
        )
    ''')

    conn.commit()
    conn.close()
    print("[DB] Base de données initialisée")
    
    # Migration automatique
    migrate_database_tracking()

# ==================== USER MANAGEMENT ====================

def migrate_database_tracking():
    """Ajoute les colonnes nécessaires pour le tracking (migration automatique)"""
    conn = get_connection()
    c = conn.cursor()
    
    try:
        columns_to_add = [
            ('current_price', 'REAL'),
            ('pnl', 'REAL DEFAULT 0'),
            ('pnl_pct', 'REAL DEFAULT 0'),
            ('alert_sent_tp1', 'INTEGER DEFAULT 0'),
            ('alert_sent_tp2', 'INTEGER DEFAULT 0'),
            ('alert_sent_stop_loss', 'INTEGER DEFAULT 0'),
            ('alert_sent_knockout', 'INTEGER DEFAULT 0'),
            ('close_reason', 'TEXT'),
            ('closed_at', 'TEXT')
        ]
        
        for column_name, column_type in columns_to_add:
            try:
                c.execute(f"ALTER TABLE paper_positions ADD COLUMN {column_name} {column_type}")
                print(f"[MIGRATION] Colonne {column_name} ajoutée")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    pass  # OK
                elif "no such table" in str(e):
                    pass  # Table pas encore créée
                else:
                    print(f"[MIGRATION] Avertissement {column_name}: {e}")
        
        conn.commit()
        print("[MIGRATION] Migration terminée")
        
    except Exception as e:
        print(f"[MIGRATION] Erreur: {e}")
        conn.rollback()
    finally:
        conn.close()


def get_or_create_user(user_id):
    """Récupère ou crée un utilisateur"""
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = c.fetchone()
    
    if not user:
        c.execute("INSERT INTO users (user_id, trading_mode) VALUES (?, 'paper')", (user_id,))
        conn.commit()
    
    conn.close()
    return user

def get_trading_mode(user_id):
    """Récupère le mode de trading"""
    get_or_create_user(user_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT trading_mode FROM users WHERE user_id = ?", (user_id,))
    result = c.fetchone()
    conn.close()
    return result[0] if result else 'paper'

def set_trading_mode(user_id, mode):
    """Définit le mode de trading"""
    get_or_create_user(user_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE users SET trading_mode = ? WHERE user_id = ?", (mode, user_id))
    conn.commit()
    conn.close()

# ==================== PAPER PORTFOLIO ====================

def get_portfolio_capital_paper(user_id):
    """Récupère le capital papier"""
    get_or_create_user(user_id)
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM paper_portfolio WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    
    if not row:
        c.execute("INSERT INTO paper_portfolio (user_id) VALUES (?)", (user_id,))
        conn.commit()
        c.execute("SELECT * FROM paper_portfolio WHERE user_id = ?", (user_id,))
        row = c.fetchone()
    
    conn.close()
    
    return {
        'user_id': row[0],
        'initial_capital': row[1],
        'current_cash': row[2],
        'total_invested': row[3],
        'total_pnl': row[4]
    }

def update_portfolio_cash_paper(user_id, amount):
    """Met à jour le cash papier (+ ou -)"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_portfolio 
        SET current_cash = current_cash + ?,
            updated_at = ?
        WHERE user_id = ?
    """, (amount, datetime.now().isoformat(), user_id))
    conn.commit()
    conn.close()

def update_initial_capital(user_id, amount):
    """Met à jour le capital initial avec logs de debug"""
    get_or_create_user(user_id)
    
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("SELECT user_id, initial_capital, current_cash FROM paper_portfolio WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    
    print(f"[DEBUG] update_initial_capital - user_id: {user_id}, amount: {amount}")
    print(f"[DEBUG] Avant: {row if row else 'N/A'}")
    
    if not row:
        print(f"[DEBUG] Création nouvelle entrée pour user {user_id}")
        c.execute("""
            INSERT INTO paper_portfolio (user_id, initial_capital, current_cash)
            VALUES (?, ?, ?)
        """, (user_id, amount, amount))
    else:
        print(f"[DEBUG] Mise à jour entrée existante pour user {user_id}")
        c.execute("""
            UPDATE paper_portfolio 
            SET initial_capital = ?,
                current_cash = ?,
                updated_at = ?
            WHERE user_id = ?
        """, (amount, amount, datetime.now().isoformat(), user_id))
    
    conn.commit()
    
    c.execute("SELECT user_id, initial_capital, current_cash FROM paper_portfolio WHERE user_id = ?", (user_id,))
    row_after = c.fetchone()
    print(f"[DEBUG] Après: {row_after}")
    print(f"[DEBUG] Fichier DB: {DB_FILE}")
    
    conn.close()

# ==================== PAPER POSITIONS ====================

def add_position_paper(user_id, ticker, position_type, product_type, entry_price, 
                       leverage, amount, exposure, tp1, tp2, stop_loss, 
                       barrier_knockout, horizon, trailing_stop):
    """Ajoute une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO paper_positions 
        (user_id, ticker, position_type, product_type, entry_price, current_price,
         leverage, amount, exposure, tp1, tp2, stop_loss, barrier_knockout, 
         horizon, trailing_stop)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, ticker, position_type, product_type, entry_price, entry_price,
          leverage, amount, exposure, tp1, tp2, stop_loss, barrier_knockout,
          horizon, trailing_stop))
    
    position_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return position_id

def get_position_paper(position_id):
    """Récupère une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_positions WHERE id = ?", (position_id,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return None
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return dict(zip(columns, row))

def get_all_active_paper_positions():
    """Récupère toutes les positions papier actives"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_positions WHERE status = 'open'")
    rows = c.fetchall()
    conn.close()
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return [dict(zip(columns, row)) for row in rows]

def get_all_active_alerts():
    """Récupère toutes les alertes actives (non déclenchées)"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT * FROM alerts 
            WHERE status = 'active'
            ORDER BY created_at DESC
        """)
        rows = c.fetchall()
        
        if not rows:
            return []
        
        columns = ['id', 'user_id', 'ticker', 'condition', 'target_price', 'status', 'created_at', 'triggered_at']
        return [dict(zip(columns, row)) for row in rows]
    except:
        # Table alerts n'existe pas encore
        return []
    finally:
        conn.close()

def get_alerts(user_id):
    """Récupère les alertes d'un utilisateur"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT * FROM alerts 
            WHERE user_id = ? AND status = 'active'
            ORDER BY created_at DESC
        """, (user_id,))
        rows = c.fetchall()
        
        if not rows:
            return []
        
        columns = ['id', 'user_id', 'ticker', 'condition', 'target_price', 'status', 'created_at', 'triggered_at']
        return [dict(zip(columns, row)) for row in rows]
    except:
        return []
    finally:
        conn.close()

def add_alert(user_id, ticker, condition, target_price):
    """Ajoute une alerte"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO alerts (user_id, ticker, condition, target_price, status)
            VALUES (?, ?, ?, ?, 'active')
        """, (user_id, ticker, condition, target_price))
        alert_id = c.lastrowid
        conn.commit()
        return alert_id
    except:
        conn.rollback()
        return None
    finally:
        conn.close()

def trigger_alert(alert_id):
    """Marque une alerte comme déclenchée"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE alerts 
            SET status = 'triggered', triggered_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), alert_id))
        conn.commit()
    except:
        conn.rollback()
    finally:
        conn.close()

def delete_alert(alert_id):
    """Supprime une alerte"""
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        conn.commit()
    except:
        conn.rollback()
    finally:
        conn.close()


def get_user_positions_paper(user_id, status='open'):
    """Récupère les positions d'un user"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_positions WHERE user_id = ? AND status = ?", 
              (user_id, status))
    rows = c.fetchall()
    conn.close()
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return [dict(zip(columns, row)) for row in rows]

def update_position_current_price(position_id, current_price, pnl, pnl_pct):
    """Met à jour le prix actuel et P&L"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions 
        SET current_price = ?, pnl = ?, pnl_pct = ?
        WHERE id = ?
    """, (current_price, pnl, pnl_pct, position_id))
    conn.commit()
    conn.close()

def close_position_paper(position_id, exit_price, pnl, reason):
    """Ferme une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions 
        SET status = 'closed',
            exit_price = ?,
            pnl = ?,
            close_reason = ?,
            closed_at = ?
        WHERE id = ?
    """, (exit_price, pnl, reason, datetime.now().isoformat(), position_id))
    conn.commit()
    conn.close()

def mark_alert_sent(position_id, alert_type):
    """Marque une alerte comme envoyée"""
    conn = get_connection()
    c = conn.cursor()
    c.execute(f"""
        UPDATE paper_positions 
        SET alert_sent_{alert_type} = 1
        WHERE id = ?
    """, (position_id,))
    conn.commit()
    conn.close()

# ==================== PAPER STATS ====================

def get_paper_stats(user_id):
    """Récupère les stats papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_stats WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    
    if not row:
        c.execute("INSERT INTO paper_stats (user_id) VALUES (?)", (user_id,))
        conn.commit()
        c.execute("SELECT * FROM paper_stats WHERE user_id = ?", (user_id,))
        row = c.fetchone()
    
    conn.close()
    
    total_trades = row[1] or 0
    winners = row[2] or 0
    win_rate = (winners / total_trades * 100) if total_trades > 0 else 0
    
    return {
        'total_trades': total_trades,
        'winners': winners,
        'losers': row[3] or 0,
        'win_rate': win_rate,
        'best_trade': row[4] or 0,
        'worst_trade': row[5] or 0,
        'total_profit': row[6] or 0,
        'total_loss': row[7] or 0
    }

# ==================== REAL PORTFOLIO (STUB) ====================

def get_portfolio_capital(user_id):
    """Stub pour mode réel"""
    return {'current_cash': 0, 'initial_capital': 0}




# ==================== DB OBJECT (pour compatibilité) ====================

class Database:
    """Wrapper pour les fonctions DB"""
    
    def get_trading_mode(self, user_id):
        return get_trading_mode(user_id)
    
    def set_trading_mode(self, user_id, mode):
        return set_trading_mode(user_id, mode)
    
    def get_portfolio_capital_paper(self, user_id):
        return get_portfolio_capital_paper(user_id)
    
    def get_portfolio_capital(self, user_id):
        return get_portfolio_capital(user_id)
    
    def update_portfolio_cash_paper(self, user_id, amount):
        return update_portfolio_cash_paper(user_id, amount)
    
    def add_position_paper(self, user_id, ticker, position_type, product_type, 
                          entry_price, leverage, amount, exposure, tp1, tp2, 
                          stop_loss, barrier_knockout, horizon, trailing_stop):
        return add_position_paper(user_id, ticker, position_type, product_type,
                                 entry_price, leverage, amount, exposure, tp1,
                                 tp2, stop_loss, barrier_knockout, horizon, trailing_stop)
    
    def get_position_paper(self, position_id):
        return get_position_paper(position_id)
    
    def get_all_active_paper_positions(self):
        return get_all_active_paper_positions()
    
    def get_user_positions_paper(self, user_id, status='open'):
        return get_user_positions_paper(user_id, status)
    
    def update_position_current_price(self, position_id, current_price, pnl, pnl_pct):
        return update_position_current_price(position_id, current_price, pnl, pnl_pct)
    
    def close_position_paper(self, position_id, exit_price, pnl, reason):
        return close_position_paper(position_id, exit_price, pnl, reason)
    
    def mark_alert_sent(self, position_id, alert_type):
        return mark_alert_sent(position_id, alert_type)
    
    def get_paper_stats(self, user_id):
        return get_paper_stats(user_id)
    
    def update_initial_capital(self, user_id, amount):
        return update_initial_capital(user_id, amount)
    
    def get_all_active_alerts(self):
        return get_all_active_alerts()
    
    def get_alerts(self, user_id):
        return get_alerts(user_id)
    
    def add_alert(self, user_id, ticker, condition, target_price):
        return add_alert(user_id, ticker, condition, target_price)
    
    def trigger_alert(self, alert_id):
        return trigger_alert(alert_id)
    
    def delete_alert(self, alert_id):
        return delete_alert(alert_id)


    # Méthodes additionnelles pour compatibilité
    
    def get_portfolio(self, user_id):
        """Retourne le portefeuille paper (alias)"""
        return self.get_user_positions_paper(user_id, 'open')
    
    def get_portfolio_paper(self, user_id):
        """Retourne les positions paper (alias)"""
        return self.get_user_positions_paper(user_id, 'open')
    
    def get_portfolio_history(self, user_id):
        """Retourne l'historique des positions"""
        return self.get_user_positions_paper(user_id, 'closed')
    
    def add_favorite(self, user_id, ticker):
        """Ajoute un favori (non implémenté)"""
        print(f"[DB] add_favorite non implémenté: {user_id}, {ticker}")
        return True
    
    def get_favorites(self, user_id):
        """Retourne les favoris (non implémenté)"""
        return []
    
    def remove_favorite(self, user_id, ticker):
        """Retire un favori (non implémenté)"""
        print(f"[DB] remove_favorite non implémenté: {user_id}, {ticker}")
        return True
    
    def save_signal(self, user_id, ticker, signal_type, price):
        """Sauvegarde un signal (non implémenté)"""
        print(f"[DB] save_signal non implémenté: {user_id}, {ticker}")
        return True
    
    def get_signal_history(self, user_id, limit=10):
        """Retourne l'historique des signaux (non implémenté)"""
        return []
    
    def get_statistics(self, user_id):
        """Retourne les statistiques (alias)"""
        return self.get_paper_stats(user_id)
    
    def get_user_settings(self, user_id):
        """Retourne les paramètres utilisateur (non implémenté)"""
        return {}
    
    def update_user_setting(self, user_id, key, value):
        """Met à jour un paramètre (non implémenté)"""
        print(f"[DB] update_user_setting non implémenté: {user_id}, {key}")
        return True
    
    def reset_portfolio(self, user_id):
        """Réinitialise le portefeuille (non implémenté)"""
        print(f"[DB] reset_portfolio non implémenté: {user_id}")
        return True
    def get_balance(self, user_id):
        """Retourne le solde du wallet paper"""
        capital = self.get_portfolio_capital_paper(user_id)
        if capital:
            return capital.get('cash', 10000.0)
        return 10000.0
    
    def update_balance(self, user_id, new_balance):
        """Met à jour le solde du wallet"""
        return self.update_portfolio_cash_paper(user_id, new_balance)
    
    def open_position(self, user_id, ticker, direction, entry_price, quantity, 
                     amount, tp1, tp2, tp3, stop_loss):
        """Ouvre une nouvelle position"""
        return self.add_position_paper(
            user_id=user_id,
            ticker=ticker,
            position_type=direction,
            product_type="ACTION",
            entry_price=entry_price,
            leverage=1,
            amount=amount,
            exposure=amount,
            tp1=tp1,
            tp2=tp2,
            stop_loss=stop_loss,
            barrier_knockout=None,
            horizon="Moyen terme",
            trailing_stop=False
        )



# Créer l'instance globale
db = Database()



#!/usr/bin/env python3
"""
Module Database complet pour le trading bot
"""

import sqlite3
from datetime import datetime

DB_FILE = 'trading_bot.db'

def get_connection():
    """Connexion à la base de données"""
    return sqlite3.connect(DB_FILE)

# ==================== INITIALIZATION ====================

def init_database():
    """Initialise la base de données avec toutes les tables"""
    conn = get_connection()
    c = conn.cursor()
    
    # Table users
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            trading_mode TEXT DEFAULT 'paper',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table paper_portfolio (capital papier)
    c.execute('''
        CREATE TABLE IF NOT EXISTS paper_portfolio (
            user_id INTEGER PRIMARY KEY,
            initial_capital REAL DEFAULT 10000,
            current_cash REAL DEFAULT 10000,
            total_invested REAL DEFAULT 0,
            total_pnl REAL DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table paper_positions
    c.execute('''
        CREATE TABLE IF NOT EXISTS paper_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            ticker TEXT,
            position_type TEXT,
            product_type TEXT,
            entry_price REAL,
            current_price REAL,
            leverage INTEGER,
            amount REAL,
            exposure REAL,
            tp1 REAL,
            tp2 REAL,
            stop_loss REAL,
            barrier_knockout REAL,
            horizon TEXT,
            trailing_stop INTEGER DEFAULT 0,
            pnl REAL DEFAULT 0,
            pnl_pct REAL DEFAULT 0,
            status TEXT DEFAULT 'open',
            exit_price REAL,
            close_reason TEXT,
            alert_sent_tp1 INTEGER DEFAULT 0,
            alert_sent_tp2 INTEGER DEFAULT 0,
            alert_sent_stop_loss INTEGER DEFAULT 0,
            alert_sent_knockout INTEGER DEFAULT 0,
            opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
            closed_at TEXT
        )
    ''')
    
    # Table paper_stats
    c.execute('''
        CREATE TABLE IF NOT EXISTS paper_stats (
            user_id INTEGER PRIMARY KEY,
            total_trades INTEGER DEFAULT 0,
            winners INTEGER DEFAULT 0,
            losers INTEGER DEFAULT 0,
            best_trade REAL DEFAULT 0,
            worst_trade REAL DEFAULT 0,
            total_profit REAL DEFAULT 0,
            total_loss REAL DEFAULT 0
        )
    ''')
    
    conn.commit()
    conn.close()
    print("[DB] Base de données initialisée")
    
    # Migration automatique
    migrate_database_tracking()

# ==================== USER MANAGEMENT ====================

def get_or_create_user(user_id):
    """Récupère ou crée un utilisateur"""
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = c.fetchone()
    
    if not user:
        c.execute("INSERT INTO users (user_id, trading_mode) VALUES (?, 'paper')", (user_id,))
        conn.commit()
    
    conn.close()
    return user

def get_trading_mode(user_id):
    """Récupère le mode de trading"""
    get_or_create_user(user_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT trading_mode FROM users WHERE user_id = ?", (user_id,))
    result = c.fetchone()
    conn.close()
    return result[0] if result else 'paper'

def set_trading_mode(user_id, mode):
    """Définit le mode de trading"""
    get_or_create_user(user_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE users SET trading_mode = ? WHERE user_id = ?", (mode, user_id))
    conn.commit()
    conn.close()

# ==================== PAPER PORTFOLIO ====================

def get_portfolio_capital_paper(user_id):
    """Récupère le capital papier"""
    get_or_create_user(user_id)
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM paper_portfolio WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    
    if not row:
        c.execute("INSERT INTO paper_portfolio (user_id) VALUES (?)", (user_id,))
        conn.commit()
        c.execute("SELECT * FROM paper_portfolio WHERE user_id = ?", (user_id,))
        row = c.fetchone()
    
    conn.close()
    
    return {
        'user_id': row[0],
        'initial_capital': row[1],
        'current_cash': row[2],
        'total_invested': row[3],
        'total_pnl': row[4]
    }

def update_portfolio_cash_paper(user_id, amount):
    """Met à jour le cash papier (+ ou -)"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_portfolio 
        SET current_cash = current_cash + ?,
            updated_at = ?
        WHERE user_id = ?
    """, (amount, datetime.now().isoformat(), user_id))
    conn.commit()
    conn.close()

def update_initial_capital(user_id, amount):
    """Met à jour le capital initial"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_portfolio 
        SET initial_capital = ?,
            current_cash = ?,
            updated_at = ?
        WHERE user_id = ?
    """, (amount, amount, datetime.now().isoformat(), user_id))
    conn.commit()
    conn.close()

# ==================== PAPER POSITIONS ====================

def add_position_paper(user_id, ticker, position_type, product_type, entry_price, 
                       leverage, amount, exposure, tp1, tp2, stop_loss, 
                       barrier_knockout, horizon, trailing_stop):
    """Ajoute une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO paper_positions 
        (user_id, ticker, position_type, product_type, entry_price, current_price,
         leverage, amount, exposure, tp1, tp2, stop_loss, barrier_knockout, 
         horizon, trailing_stop)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, ticker, position_type, product_type, entry_price, entry_price,
          leverage, amount, exposure, tp1, tp2, stop_loss, barrier_knockout,
          horizon, trailing_stop))
    
    position_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return position_id

def get_all_active_paper_positions():
    """Récupère toutes les positions papier actives"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_positions WHERE status = 'open'")
    rows = c.fetchall()
    conn.close()
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return [dict(zip(columns, row)) for row in rows]

def get_user_positions_paper(user_id, status='open'):
    """Récupère les positions d'un user"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_positions WHERE user_id = ? AND status = ?", 
              (user_id, status))
    rows = c.fetchall()
    conn.close()
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return [dict(zip(columns, row)) for row in rows]

def update_position_current_price(position_id, current_price, pnl, pnl_pct):
    """Met à jour le prix actuel et P&L"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions 
        SET current_price = ?, pnl = ?, pnl_pct = ?
        WHERE id = ?
    """, (current_price, pnl, pnl_pct, position_id))
    conn.commit()
    conn.close()

def close_position_paper(position_id, exit_price, pnl, reason):
    """Ferme une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions 
        SET status = 'closed',
            exit_price = ?,
            pnl = ?,
            close_reason = ?,
            closed_at = ?
        WHERE id = ?
    """, (exit_price, pnl, reason, datetime.now().isoformat(), position_id))
    conn.commit()
    conn.close()

def mark_alert_sent(position_id, alert_type):
    """Marque une alerte comme envoyée"""
    conn = get_connection()
    c = conn.cursor()
    c.execute(f"""
        UPDATE paper_positions 
        SET alert_sent_{alert_type} = 1
        WHERE id = ?
    """, (position_id,))
    conn.commit()
    conn.close()

# ==================== PAPER STATS ====================

def get_paper_stats(user_id):
    """Récupère les stats papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM paper_stats WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    
    if not row:
        c.execute("INSERT INTO paper_stats (user_id) VALUES (?)", (user_id,))
        conn.commit()
        c.execute("SELECT * FROM paper_stats WHERE user_id = ?", (user_id,))
        row = c.fetchone()
    
    conn.close()
    
    total_trades = row[1] or 0
    winners = row[2] or 0
    win_rate = (winners / total_trades * 100) if total_trades > 0 else 0
    
    return {
        'total_trades': total_trades,
        'winners': winners,
        'losers': row[3] or 0,
        'win_rate': win_rate,
        'best_trade': row[4] or 0,
        'worst_trade': row[5] or 0,
        'total_profit': row[6] or 0,
        'total_loss': row[7] or 0
    }

# ==================== REAL PORTFOLIO (STUB) ====================

def get_portfolio_capital(user_id):
    """Stub pour mode réel"""
    return {'current_cash': 0, 'initial_capital': 0}


matplotlib.use('Agg')  # Mode non-interactif pour serveur
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from io import BytesIO

import requests
from bs4 import BeautifulSoup
import urllib.parse
from sklearn.linear_model import LinearRegression


# ==================== CONFIGURATION ====================
TELEGRAM_TOKEN = "8213431546:AAHnL4lswPUDYNubdcsLPvTwW0f1KYgjLgs"
CHANNEL_ID = "-1003160198658"  # Canal public pour les publications automatiques
ALLOWED_USERS = []  # Vide = tout le monde peut utiliser le bot en privé
ENABLE_LIVE_LOGS = True  # Activer/désactiver les logs en direct sur le canal
AUTO_SCAN_ENABLED = False  # Scans automatiques (désactivé par défaut)
AUTO_SCAN_TIMES = ["09:00", "15:30", "17:00"]  # Heures des scans auto (format 24h)
SMART_NOTIFICATIONS_ENABLED = False  # Notifications intelligentes (désactivé par défaut)
DAILY_REPORT_ENABLED = False  # Rapport quotidien (désactivé par défaut)
DAILY_REPORT_TIME = "08:00"  # Heure du rapport quotidien

# Liste d'actions à scanner (extensible)
WATCHLIST = {
    "CAC40": ["AI.PA", "AIR.PA", "ALO.PA", "MT.AS", "CS.PA", "BNP.PA", "EN.PA", 
              "CAP.PA", "CA.PA", "ACA.PA", "BN.PA", "DSY.PA", "ENGI.PA", "EL.PA",
              "RMS.PA", "KER.PA", "OR.PA", "MC.PA", "ML.PA", "RI.PA", "PUB.PA",
              "RNO.PA", "SAF.PA", "SGO.PA", "SAN.PA", "SU.PA", "GLE.PA", "STLAM.MI",
              "STMPA.PA", "TEP.PA", "HO.PA", "VIE.PA", "DG.PA", "VIV.PA"],
    
    "DAX": ["ADS.DE", "AIR.DE", "ALV.DE", "BAS.DE", "BAYN.DE", "BEI.DE", "BMW.DE",
            "CON.DE", "1COV.DE", "DAI.DE", "DB1.DE", "DBK.DE", "DHL.DE", "DTE.DE",
            "EOAN.DE", "FRE.DE", "HEI.DE", "HEN3.DE", "IFX.DE", "MRK.DE", "MTX.DE",
            "MUV2.DE", "PAH3.DE", "PSM.DE", "RWE.DE", "SAP.DE", "SIE.DE", "VOW3.DE"],
    
    "US_TECH": ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "NFLX",
                "AMD", "INTC", "CRM", "ADBE", "ORCL", "CSCO", "AVGO", "QCOM"],
    
    "US_BLUE_CHIPS": ["JPM", "JNJ", "V", "MA", "UNH", "HD", "PG", "BAC", "DIS",
                      "CMCSA", "XOM", "CVX", "WMT", "KO", "PEP", "MCD", "NKE"]
}

# Paramètres d'analyse
RSI_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9
SMA_SHORT = 20
SMA_LONG = 50


# ==================== NOUVEAUX MODULES - TRADING AVANCÉ ====================

# ==================== ANALYSE DE MARCHÉ CONTEXTUELLE ====================


class MarketAnalyzer:
    """Analyseur de marché avancé avec contexte macro-économique"""
    
    def __init__(self):
        self.macro_context = {}
        self.market_phase = None
        
    def get_market_phase(self, ticker):
        """Détermine la phase du marché : ouverture, milieu, fermeture"""
        now = datetime.now(pytz.UTC)
        
        # Déterminer le fuseau horaire selon le ticker
        if ticker.endswith('.PA') or ticker.endswith('.AS'):
            tz = pytz.timezone('Europe/Paris')
            open_hour, close_hour = 9, 17.5
        elif ticker.endswith('.DE'):
            tz = pytz.timezone('Europe/Berlin')
            open_hour, close_hour = 9, 17.5
        else:
            tz = pytz.timezone('America/New_York')
            open_hour, close_hour = 9.5, 16
        
        local_time = now.astimezone(tz)
        current_hour = local_time.hour + local_time.minute / 60.0
        
        if current_hour < open_hour:
            return "PRÉ-OUVERTURE"
        elif open_hour <= current_hour < open_hour + 0.5:
            return "OUVERTURE"
        elif open_hour + 0.5 <= current_hour < close_hour - 1:
            return "MILIEU DE SÉANCE"
        elif close_hour - 1 <= current_hour < close_hour:
            return "APPROCHE CLÔTURE"
        elif current_hour >= close_hour:
            return "POST-CLÔTURE"
        else:
            return "FERMÉ"
    
    def get_macro_news(self, ticker):
        """Récupère les actualités macro-économiques pertinentes"""
        news_summary = {
            'headlines': [],
            'sentiment': 'NEUTRE',
            'impact_level': 'FAIBLE'
        }
        
        try:
            # Récupérer les actualités
            stock = yf.Ticker(ticker)
            news = stock.news if hasattr(stock, 'news') else []
            
            if news and len(news) > 0:
                for article in news[:3]:
                    if isinstance(article, dict):
                        title = article.get('title', '')
                        if title:
                            news_summary['headlines'].append(title)
                
                # Analyse de sentiment global
                all_text = ' '.join(news_summary['headlines']).lower()
                
                positive_words = ['surge', 'gain', 'profit', 'growth', 'beat', 'strong', 'bullish', 'record']
                negative_words = ['fall', 'loss', 'decline', 'weak', 'bearish', 'concern', 'crash']
                
                pos_count = sum(1 for word in positive_words if word in all_text)
                neg_count = sum(1 for word in negative_words if word in all_text)
                
                if pos_count > neg_count:
                    news_summary['sentiment'] = 'POSITIF'
                    news_summary['impact_level'] = 'MODÉRÉ' if pos_count > 2 else 'FAIBLE'
                elif neg_count > pos_count:
                    news_summary['sentiment'] = 'NÉGATIF'
                    news_summary['impact_level'] = 'MODÉRÉ' if neg_count > 2 else 'FAIBLE'
        
        except:
            pass
        
        return news_summary
    
    def analyze_trend(self, data):
        """Analyse la tendance du jour et projette le mouvement"""
        if len(data) < 50:
            return None
        
        # Calculer les indicateurs
        close = data['Close']
        high = data['High']
        low = data['Low']
        
        # Tendance du jour
        today_open = data['Open'].iloc[-1]
        current_price = close.iloc[-1]
        day_change = ((current_price - today_open) / today_open) * 100
        
        # Moyennes mobiles
        sma20 = close.rolling(window=20).mean()
        sma50 = close.rolling(window=50).mean()
        
        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = close.ewm(span=12, adjust=False).mean()
        exp2 = close.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        
        # Volatilité
        volatility = close.pct_change().std() * 100
        
        # Déterminer la tendance
        trend = {
            'direction': '',
            'strength': 0,
            'day_change': day_change,
            'rsi': rsi.iloc[-1],
            'macd': macd.iloc[-1],
            'macd_signal': signal.iloc[-1],
            'volatility': volatility,
            'price_vs_sma20': ((current_price - sma20.iloc[-1]) / sma20.iloc[-1]) * 100,
            'price_vs_sma50': ((current_price - sma50.iloc[-1]) / sma50.iloc[-1]) * 100
        }
        
        # Déterminer la direction
        if day_change > 0.5 and current_price > sma20.iloc[-1]:
            trend['direction'] = 'HAUSSIÈRE'
            trend['strength'] = min(10, int(abs(day_change)))
        elif day_change < -0.5 and current_price < sma20.iloc[-1]:
            trend['direction'] = 'BAISSIÈRE'
            trend['strength'] = min(10, int(abs(day_change)))
        else:
            trend['direction'] = 'NEUTRE'
            trend['strength'] = int(abs(day_change))
        
        return trend
    
    def project_movement(self, trend, macro_news, market_phase):
        """Projette le mouvement probable et évalue le risque"""
        projection = {
            'direction_probable': '',
            'confidence': 0,
            'risk_level': '',
            'recommendation': ''
        }
        
        # Analyser la confluence des signaux
        signals_score = 0
        
        # Signal 1: Tendance du jour
        if trend['direction'] == 'HAUSSIÈRE':
            signals_score += 2
        elif trend['direction'] == 'BAISSIÈRE':
            signals_score -= 2
        
        # Signal 2: RSI
        if trend['rsi'] < 30:
            signals_score += 1  # Survendu = potentiel haussier
        elif trend['rsi'] > 70:
            signals_score -= 1  # Suracheté = potentiel baissier
        
        # Signal 3: MACD
        if trend['macd'] > trend['macd_signal']:
            signals_score += 1
        else:
            signals_score -= 1
        
        # Signal 4: News
        if macro_news['sentiment'] == 'POSITIF':
            signals_score += 1
        elif macro_news['sentiment'] == 'NÉGATIF':
            signals_score -= 1
        
        # Signal 5: Phase du marché
        if market_phase in ['OUVERTURE', 'MILIEU DE SÉANCE']:
            signals_score += 0.5  # Meilleur moment pour trader
        elif market_phase == 'APPROCHE CLÔTURE':
            signals_score -= 0.5  # Plus risqué
        
        # Déterminer la projection
        if signals_score >= 3:
            projection['direction_probable'] = 'HAUSSE'
            projection['confidence'] = min(90, int(abs(signals_score) * 15))
            projection['risk_level'] = 'FAIBLE à MODÉRÉ'
        elif signals_score <= -3:
            projection['direction_probable'] = 'BAISSE'
            projection['confidence'] = min(90, int(abs(signals_score) * 15))
            projection['risk_level'] = 'FAIBLE à MODÉRÉ'
        elif -1 <= signals_score <= 1:
            projection['direction_probable'] = 'CONSOLIDATION'
            projection['confidence'] = 30
            projection['risk_level'] = 'ÉLEVÉ'
        else:
            projection['direction_probable'] = 'INCERTAIN'
            projection['confidence'] = 50
            projection['risk_level'] = 'MODÉRÉ'
        
        # Évaluer si c'est pertinent de trader
        if projection['confidence'] >= 60 and trend['volatility'] < 5:
            projection['recommendation'] = '✅ PERTINENT'
        elif projection['confidence'] >= 50:
            projection['recommendation'] = '⚠️ POSSIBLE MAIS RISQUÉ'
        else:
            projection['recommendation'] = '❌ NON RECOMMANDÉ'
        
        return projection
    
    def generate_analysis_message(self, ticker):
        """Génère le message d'analyse complet"""
        try:
            # Récupérer les données
            stock = yf.Ticker(ticker)
            data = stock.history(period='3mo', interval='1d')
            
            if len(data) < 50:
                return "❌ Pas assez de données pour analyser ce ticker."
            
            # Analyser
            market_phase = self.get_market_phase(ticker)
            macro_news = self.get_macro_news(ticker)
            trend = self.analyze_trend(data)
            projection = self.project_movement(trend, macro_news, market_phase)
            
            # Informations du ticker
            current_price = data['Close'].iloc[-1]
            
            # Construire le message
            message = f"""
📊 *ANALYSE DE MARCHÉ - {ticker}*

━━━━━━━━━━━━━━━━━━━━
💰 *CONTEXTE ACTUEL*
━━━━━━━━━━━━━━━━━━━━

📈 Prix actuel: *{current_price:.2f}*
📅 Phase du marché: *{market_phase}*
📰 Sentiment news: *{macro_news['sentiment']}* ({macro_news['impact_level']})

━━━━━━━━━━━━━━━━━━━━
📉 *TENDANCE DU JOUR*
━━━━━━━━━━━━━━━━━━━━

Direction: *{trend['direction']}*
Force: *{trend['strength']}/10*
Variation jour: *{trend['day_change']:+.2f}%*

Indicateurs techniques:
• RSI(14): {trend['rsi']:.1f}
• MACD: {"Haussier" if trend['macd'] > trend['macd_signal'] else "Baissier"}
• Prix vs SMA(20): {trend['price_vs_sma20']:+.1f}%
• Prix vs SMA(50): {trend['price_vs_sma50']:+.1f}%
• Volatilité: {trend['volatility']:.2f}%

━━━━━━━━━━━━━━━━━━━━
🔮 *PROJECTION*
━━━━━━━━━━━━━━━━━━━━

Mouvement probable: *{projection['direction_probable']}*
Niveau de confiance: *{projection['confidence']}%*
Niveau de risque: *{projection['risk_level']}*

━━━━━━━━━━━━━━━━━━━━
💡 *RECOMMANDATION*
━━━━━━━━━━━━━━━━━━━━

{projection['recommendation']}
"""

            if macro_news['headlines']:
                message += "\n📰 *Dernières actualités:*\n"
                for headline in macro_news['headlines'][:2]:
                    message += f"• {headline[:60]}...\n"
            
            message += "\n━━━━━━━━━━━━━━━━━━━━\n"
            
            if projection['recommendation'] == '✅ PERTINENT':
                message += "\n✅ *Il est pertinent de tenter un mouvement.*\n"
                message += "Souhaitez-vous procéder à une analyse de trade ?"
            elif projection['recommendation'] == '⚠️ POSSIBLE MAIS RISQUÉ':
                message += "\n⚠️ *Un trade est possible mais comporte des risques.*\n"
                message += "Voulez-vous tout de même procéder ?"
            else:
                message += "\n❌ *Conditions actuelles non optimales.*\n"
                message += "Il est recommandé d'attendre de meilleures opportunités."
            
            return message
            
        except Exception as e:
            print(f"Erreur analyse: {e}")
            import traceback
            traceback.print_exc()
            return f"❌ Erreur lors de l'analyse de {ticker}."


# Instance globale
market_analyzer = MarketAnalyzer()



# ==================== SYSTÈME DE PORTEFEUILLE MODERNE ====================


from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes, ConversationHandler
import yfinance as yf
from datetime import datetime

# États pour la conversation
WALLET_MENU, MODIFY_BALANCE, CONFIRM_RESET = range(3)

class WalletManager:
    """Gestionnaire de portefeuille moderne avec interface propre"""
    
    TRADE_REPUBLIC_FEE = 2.0  # 2€ par trade (1€ entrée + 1€ sortie)
    
    def __init__(self):
        self.temp_data = {}  # Stockage temporaire pour les conversations
    
    def get_wallet_performance(self, user_id):
        """Calcule la performance du portefeuille"""
        capital = db.get_portfolio_capital(user_id)
        portfolio = db.get_portfolio(user_id)
        
        initial = capital['initial_capital']
        current_cash = capital['current_cash']
        
        # Calculer la valeur actuelle des positions
        total_position_value = 0
        
        for position in portfolio:
            try:
                stock = yf.Ticker(position['ticker'])
                current_price = stock.history(period='1d')['Close'].iloc[-1]
                position_value = position['quantity'] * current_price
                total_position_value += position_value
            except:
                # Si erreur, utiliser le prix d'achat
                position_value = position['quantity'] * position['buy_price']
                total_position_value += position_value
        
        # Total actuel = cash + positions
        total_current = current_cash + total_position_value
        
        # Performance
        if initial > 0:
            performance = ((total_current - initial) / initial) * 100
        else:
            performance = 0
        
        # Performance journalière (simplifiée pour l'instant)
        # TODO: Implémenter un tracking journalier en base de données
        daily_performance = 0  # À implémenter
        
        return {
            'initial_capital': initial,
            'current_cash': current_cash,
            'position_value': total_position_value,
            'total_current': total_current,
            'total_performance': performance,
            'daily_performance': daily_performance
        }
    
    def generate_wallet_panel(self, user_id):
        """Génère le panel portefeuille moderne"""
        perf = self.get_wallet_performance(user_id)
        
        # Déterminer la couleur de la performance
        if perf['daily_performance'] > 0:
            daily_emoji = "🟢"
            daily_text = f"+{perf['daily_performance']:.2f}%"
        elif perf['daily_performance'] < 0:
            daily_emoji = "🔴"
            daily_text = f"{perf['daily_performance']:.2f}%"
        else:
            daily_emoji = "⚪"
            daily_text = "0.00%"
        
        # Performance totale
        if perf['total_performance'] > 0:
            total_emoji = "📈"
            total_color = "🟢"
        elif perf['total_performance'] < 0:
            total_emoji = "📉"
            total_color = "🔴"
        else:
            total_emoji = "➡️"
            total_color = "⚪"
        
        message = f"""
💼 *PORTEFEUILLE*

━━━━━━━━━━━━━━━━━━━━
💰 *SOLDE TOTAL*
{perf['initial_capital']:.2f} EUR

💵 *DISPONIBLE*
{perf['current_cash']:.2f} EUR

📊 *POSITIONS*
{perf['position_value']:.2f} EUR

━━━━━━━━━━━━━━━━━━━━
{total_emoji} *PERFORMANCE GLOBALE*
{total_color} {perf['total_performance']:+.2f}%

{daily_emoji} *PERFORMANCE JOURNALIÈRE*
{daily_text}

━━━━━━━━━━━━━━━━━━━━
💡 Valeur totale: *{perf['total_current']:.2f} EUR*
"""
        
        # Boutons
        keyboard = [
            [InlineKeyboardButton("💰 Modifier le solde", callback_data="wallet_modify")],
            [InlineKeyboardButton("📊 Voir les positions", callback_data="wallet_positions")],
            [InlineKeyboardButton("📈 Historique", callback_data="wallet_history")],
            [InlineKeyboardButton("🔄 Réinitialiser", callback_data="wallet_reset_confirm")],
            [InlineKeyboardButton("❌ Fermer", callback_data="wallet_close")]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        return message, reply_markup
    
    def generate_positions_panel(self, user_id):
        """Génère le panel des positions ouvertes"""
        portfolio = db.get_portfolio(user_id)
        
        if not portfolio:
            return "📊 *POSITIONS OUVERTES*\n\n❌ Aucune position ouverte", None
        
        message = "📊 *POSITIONS OUVERTES*\n\n"
        
        total_pnl = 0
        
        for i, pos in enumerate(portfolio, 1):
            try:
                stock = yf.Ticker(pos['ticker'])
                current_price = stock.history(period='1d')['Close'].iloc[-1]
                
                # Calcul P&L
                position_value = pos['quantity'] * current_price
                cost_basis = pos['quantity'] * pos['buy_price']
                pnl = position_value - cost_basis
                pnl_pct = (pnl / cost_basis) * 100
                
                total_pnl += pnl
                
                # Emoji selon P&L
                if pnl > 0:
                    pnl_emoji = "🟢"
                elif pnl < 0:
                    pnl_emoji = "🔴"
                else:
                    pnl_emoji = "⚪"
                
                message += f"""
{i}. *{pos['ticker']}*
   Quantité: {pos['quantity']:.2f}
   Prix d'achat: {pos['buy_price']:.2f} EUR
   Prix actuel: {current_price:.2f} EUR
   {pnl_emoji} P&L: {pnl:+.2f} EUR ({pnl_pct:+.2f}%)

"""
            except Exception as e:
                message += f"{i}. *{pos['ticker']}* - Erreur de prix\n\n"
        
        message += f"━━━━━━━━━━━━━━━━━━━━\n"
        message += f"💰 *P&L Total: {total_pnl:+.2f} EUR*"
        
        keyboard = [
            [InlineKeyboardButton("« Retour au portefeuille", callback_data="wallet_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        return message, reply_markup
    
    def validate_trade_viability(self, amount, leverage, fees=TRADE_REPUBLIC_FEE):
        """Vérifie si un trade est viable compte tenu des frais"""
        total_fees = fees
        invested = amount * leverage if leverage > 1 else amount
        
        # Pour être rentable, il faut gagner au moins les frais
        min_profit_pct = (total_fees / invested) * 100
        
        if min_profit_pct > 5:  # Si il faut faire +5% juste pour couvrir les frais
            return {
                'viable': False,
                'reason': f"Frais trop élevés ({total_fees:.2f}€) par rapport au montant ({amount:.2f}€)",
                'min_profit': min_profit_pct
            }
        elif min_profit_pct > 2:
            return {
                'viable': True,
                'warning': f"Attention: il faut +{min_profit_pct:.2f}% pour être rentable (frais: {total_fees:.2f}€)",
                'min_profit': min_profit_pct
            }
        else:
            return {
                'viable': True,
                'min_profit': min_profit_pct
            }


# Instance globale
wallet_manager = WalletManager()




# ==================== SYSTÈME DE TRADING INTERACTIF ====================


from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes


# ==================== PAPER TRADING SYSTÈME ====================

# Classes globales
active_paper_sessions = {}

class PaperTradeSession:
    """Gère une session de trading papier complète"""
    
    def __init__(self, user_id, ticker, mode='paper'):
        self.user_id = user_id
        self.ticker = ticker
        self.mode = mode
        self.step = 'position_type'
        self.position_type = None
        self.product_type = None
        self.horizon = None
        self.leverage = 1
        self.amount = None
        self.entry_price = None
        self.order_type = 'MARKET'
        self.target_price = None
        self.tp1 = None
        self.tp2 = None
        self.stop_loss = None
        self.barrier_knockout = None
        self.barrier_distance = None
        self.trailing_stop = None
        self.current_price = None
        self.risk_assessment = None
        self.custom_levels = False
        self.current_step = 'position_type'
    
    def get_current_price(self):
        """Récupère le prix actuel"""
        try:
            stock = yf.Ticker(self.ticker)
            data = stock.history(period='1d')
            if not data.empty:
                self.current_price = float(data['Close'].iloc[-1])
                return self.current_price
            return None
        except:
            return None
    
    def calculate_levels(self):
        """Calcule les niveaux TP/SL/Barrière"""
        if not self.current_price:
            self.get_current_price()
        
        if self.product_type == 'CLASSIQUE':
            if self.position_type == "LONG":
                self.tp1 = self.current_price * 1.02
                self.tp2 = self.current_price * 1.05
                self.stop_loss = self.current_price * 0.98
            else:
                self.tp1 = self.current_price * 0.98
                self.tp2 = self.current_price * 0.95
                self.stop_loss = self.current_price * 1.02
        elif self.product_type == 'TURBO':
            if self.position_type == "LONG":
                self.tp1 = self.current_price * 1.02
                self.tp2 = self.current_price * 1.05
                self.barrier_knockout = self.current_price * 0.97
                self.barrier_distance = 3.0
            else:
                self.tp1 = self.current_price * 0.98
                self.tp2 = self.current_price * 0.95
                self.barrier_knockout = self.current_price * 1.03
                self.barrier_distance = 3.0
    
    def calculate_pnl(self, current_price):
        """Calcule le P&L"""
        if not self.entry_price or not self.amount:
            return 0
        if self.position_type == 'LONG':
            price_change = (current_price - self.entry_price) / self.entry_price
        else:
            price_change = (self.entry_price - current_price) / self.entry_price
        return self.amount * price_change * self.leverage
    
    def check_barrier_knockout(self, current_price):
        """Vérifie si barrière touchée"""
        if self.product_type != 'TURBO' or not self.barrier_knockout:
            return False
        if self.position_type == 'LONG':
            return current_price <= self.barrier_knockout
        else:
            return current_price >= self.barrier_knockout
    
    def assess_risk(self):
        """Évalue le risque"""
        risk_score = 0
        warnings = []
        
        if self.leverage >= 20:
            risk_score += 4
            warnings.append(f"🔴 Levier extrême (x{self.leverage})")
        elif self.leverage >= 10:
            risk_score += 3
            warnings.append(f"⚠️ Levier très élevé (x{self.leverage})")
        elif self.leverage >= 5:
            risk_score += 2
            warnings.append(f"⚠️ Levier élevé (x{self.leverage})")
        elif self.leverage > 1:
            risk_score += 1
            warnings.append(f"⚠️ Levier modéré (x{self.leverage})")
        
        if self.product_type == 'TURBO':
            risk_score += 2
            warnings.append("⚠️ Produit Turbo - Risque knockout")
            if self.barrier_distance:
                if self.barrier_distance < 2:
                    risk_score += 2
                    warnings.append(f"🔴 Barrière très proche ({self.barrier_distance:.1f}%)")
                elif self.barrier_distance < 3:
                    risk_score += 1
                    warnings.append(f"🟡 Barrière proche ({self.barrier_distance:.1f}%)")
        
        if self.mode == 'paper':
            capital = db.get_portfolio_capital_paper(self.user_id)
        else:
            capital = db.get_portfolio_capital(self.user_id)
        
        if self.amount > capital['current_cash'] * 0.5:
            risk_score += 2
            warnings.append("⚠️ Position >50% capital")
        elif self.amount > capital['current_cash'] * 0.3:
            risk_score += 1
            warnings.append("⚠️ Position >30% capital")
        
        if risk_score >= 7:
            level = "🔴 EXTRÊME"
            rec = "❌ Trade déconseillé"
        elif risk_score >= 5:
            level = "🔴 TRÈS ÉLEVÉ"
            rec = "⚠️ Danger"
        elif risk_score >= 3:
            level = "🟡 ÉLEVÉ"
            rec = "⚠️ Prudence"
        elif risk_score >= 1:
            level = "🟠 MODÉRÉ"
            rec = "⚠️ Attention"
        else:
            level = "🟢 FAIBLE"
            rec = "✅ OK"
        
        return {'level': level, 'score': risk_score, 'warnings': warnings, 'recommendation': rec}
    
    def generate_ticket(self):
        """Génère le ticket complet"""
        mode_badge = "🎮 PAPIER" if self.mode == 'paper' else "💰 RÉEL"
        product_badge = "🚀 TURBO" if self.product_type == 'TURBO' else "📊 CLASSIQUE"
        
        exposure = self.amount * self.leverage
        fees = 2.0
        risk = self.assess_risk()
        
        if self.position_type == "LONG":
            gain_tp1 = ((self.tp1 - self.current_price) / self.current_price) * exposure
            gain_tp2 = ((self.tp2 - self.current_price) / self.current_price) * exposure
            loss = ((self.stop_loss - self.current_price) / self.current_price) * exposure if self.stop_loss else -self.amount
        else:
            gain_tp1 = ((self.current_price - self.tp1) / self.current_price) * exposure
            gain_tp2 = ((self.current_price - self.tp2) / self.current_price) * exposure
            loss = ((self.current_price - self.stop_loss) / self.current_price) * exposure if self.stop_loss else -self.amount
        
        ticket = f"""
🎫 *TICKET* {mode_badge} | {product_badge}

━━━━━━━━━━━━━━━━━━━━
{self.ticker} @ {self.current_price:.2f} EUR
{self.position_type} {'🟢' if self.position_type == 'LONG' else '🔴'} | x{self.leverage}

💰 Investi: {self.amount:.2f} EUR
Exposition: {exposure:.2f} EUR

🎯 TP1: {self.tp1:.2f} (+{gain_tp1:.2f} EUR)
🎯 TP2: {self.tp2:.2f} (+{gain_tp2:.2f} EUR)
"""
        
        if self.product_type == 'CLASSIQUE':
            ticket += f"🛡️ SL: {self.stop_loss:.2f} ({loss:.2f} EUR)\n"
        else:
            ticket += f"🛡️ Barrière: {self.barrier_knockout:.2f} (-{self.barrier_distance:.1f}%)\n⚠️ Si touché → Perte 100%\n"
        
        ticket += f"\n⚠️ {risk['level']}\n{risk['recommendation']}"
        
        for w in risk['warnings']:
            ticket += f"\n{w}"
        
        return ticket, risk

# ═══════════════════════════════════════════════════════════════════════════════
# GRAPHIQUES v2.0 - Yahoo Finance Professionnels
# ═══════════════════════════════════════════════════════════════════════════════

def create_professional_chart_v2(ticker, timeframe='1d'):
    """
    Graphique Yahoo Finance professionnel avec bougies japonaises
    
    Timeframes: '5m', '1h', '5h', '1d', '1w'
    """
    
    configs = {
        '5m': {'period': '1d', 'interval': '5m', 'title': '4 Heures', 'max_candles': 50},
        '1h': {'period': '5d', 'interval': '1h', 'title': '1 Jour', 'max_candles': 24},
        '5h': {'period': '1mo', 'interval': '1d', 'title': '1 Semaine', 'max_candles': 7},
        '1d': {'period': '3mo', 'interval': '1d', 'title': '3 Mois', 'max_candles': 90},
        '1w': {'period': '1y', 'interval': '1wk', 'title': '1 An', 'max_candles': 52}
    }
    
    cfg = configs.get(timeframe, configs['1d'])
    
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=cfg['period'], interval=cfg['interval'])
        
        if len(df) == 0:
            return None
        
        if len(df) > cfg['max_candles']:
            df = df.iloc[-cfg['max_candles']:]
        
        # Créer figure
        fig, (ax1, ax2) = plt.subplots(
            2, 1, figsize=(16, 10),
            gridspec_kw={'height_ratios': [3, 1]},
            facecolor='#0a0e27'
        )
        
        ax1.set_facecolor('#0a0e27')
        
        # Bougies japonaises
        for i, (idx, row) in enumerate(df.iterrows()):
            color = '#00ff88' if row['Close'] >= row['Open'] else '#ff3366'
            
            # Corps de la bougie
            height = abs(row['Close'] - row['Open'])
            bottom = min(row['Open'], row['Close'])
            
            ax1.add_patch(Rectangle(
                (i, bottom), 0.7, height,
                facecolor=color, edgecolor=color, alpha=0.9, linewidth=1
            ))
            
            # Mèches
            ax1.plot([i + 0.35, i + 0.35], [row['Low'], row['High']],
                    color=color, linewidth=1.5, alpha=0.8)
        
        # SMA20
        if len(df) >= 20:
            df['SMA20'] = df['Close'].rolling(window=20).mean()
            ax1.plot(range(len(df)), df['SMA20'],
                    color='#ffaa00', linewidth=2.5, alpha=0.9, label='SMA20')
        
        # Prix actuel
        current_price = df['Close'].iloc[-1]
        ax1.axhline(y=current_price, color='#00ccff',
                   linestyle='--', linewidth=2.5, alpha=0.9,
                   label=f'Prix: {current_price:.2f}€')
        
        # Configuration axes
        ax1.set_xlim(-0.5, len(df) - 0.5)
        ax1.grid(True, alpha=0.15, linestyle='--', color='#1a1e37')
        ax1.legend(loc='upper left', facecolor='#0a0e27',
                  edgecolor='white', framealpha=0.9, fontsize=11)
        ax1.set_title(f"{ticker} - {cfg['title']}",
                     fontsize=18, fontweight='bold', color='white', pad=20)
        ax1.set_ylabel('Prix (€)', fontsize=13, color='white', fontweight='bold')
        
        # Volume
        ax2.set_facecolor('#0a0e27')
        vol_colors = ['#00ff88' if df['Close'].iloc[i] >= df['Open'].iloc[i]
                     else '#ff3366' for i in range(len(df))]
        ax2.bar(range(len(df)), df['Volume'], color=vol_colors, alpha=0.7, width=0.7)
        ax2.set_ylabel('Volume', fontsize=13, color='white', fontweight='bold')
        ax2.set_xlim(-0.5, len(df) - 0.5)
        ax2.grid(True, alpha=0.15, linestyle='--', color='#1a1e37')
        
        plt.tight_layout()
        
        # Sauvegarder
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=120, facecolor='#0a0e27',
                   edgecolor='none', bbox_inches='tight')
        buf.seek(0)
        plt.close(fig)
        
        return buf
        
    except Exception as e:
        print(f"[CHART v2.0] Erreur: {e}")
        return None


def generate_position_ticket_v2(position, current_price=None):
    """
    Génère un ticket interactif avec refresh v2.0
    """
    
    # Récupérer prix actuel
    if current_price is None:
        try:
            stock = yf.Ticker(position['ticker'])
            data = stock.history(period='1d', interval='1m')
            current_price = data['Close'].iloc[-1] if len(data) > 0 else position['current_price']
        except:
            current_price = position['current_price'] or position['entry_price']
    
    # Calculer P&L
    if position['position_type'] == 'LONG':
        price_change_pct = ((current_price - position['entry_price']) / position['entry_price']) * 100
    else:
        price_change_pct = ((position['entry_price'] - current_price) / position['entry_price']) * 100
    
    pnl = position['amount'] * (price_change_pct / 100) * position['leverage']
    pnl_pct = (pnl / position['amount']) * 100
    
    # Mise à jour DB
    update_position_current_price(position['id'], current_price, pnl, pnl_pct)
    
    # Emoji P&L
    if pnl >= 10:
        pnl_emoji = "🚀"
    elif pnl > 0:
        pnl_emoji = "🟢"
    elif pnl <= -10:
        pnl_emoji = "💥"
    elif pnl < 0:
        pnl_emoji = "🔴"
    else:
        pnl_emoji = "⚪"
    
    # Distance aux objectifs
    if position['position_type'] == 'LONG':
        dist_tp1 = ((position['tp1'] - current_price) / current_price) * 100
        dist_tp2 = ((position['tp2'] - current_price) / current_price) * 100
        dist_sl = ((current_price - position['stop_loss']) / current_price) * 100
    else:
        dist_tp1 = ((current_price - position['tp1']) / current_price) * 100
        dist_tp2 = ((current_price - position['tp2']) / current_price) * 100
        dist_sl = ((position['stop_loss'] - current_price) / current_price) * 100
    
    # Temps écoulé
    opened_at = datetime.fromisoformat(position['opened_at'])
    time_elapsed = datetime.now() - opened_at
    hours = int(time_elapsed.total_seconds() / 3600)
    minutes = int((time_elapsed.total_seconds() % 3600) / 60)
    
    # Message
    type_emoji = "🟢" if position['position_type'] == "LONG" else "🔴"
    
    message = f"""🎫 *POSITION #{position['id']}* - {position['ticker']}

{position['position_type']} {type_emoji} | {position['product_type']}
⚖️ Levier: x{position['leverage']} | ⏱️ {hours}h{minutes}m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *PRIX*
📍 Entrée: {position['entry_price']:.2f} €
💰 Actuel: {current_price:.2f} €
📊 Variation: {price_change_pct:+.2f}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *PERFORMANCE*
💵 Capital: {position['amount']:.2f} €
📈 Exposition: {position['exposure']:.2f} €
{pnl_emoji} *P&L: {pnl:+.2f} € ({pnl_pct:+.1f}%)*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *OBJECTIFS*

🎯 TP1: {position['tp1']:.2f} €
   {'✅ ATTEINT' if dist_tp1 <= 0 else f'📍 {abs(dist_tp1):.1f}% restant'}

🚀 TP2: {position['tp2']:.2f} €
   {'✅ ATTEINT' if dist_tp2 <= 0 else f'📍 {abs(dist_tp2):.1f}% restant'}

🛡️ Stop Loss: {position['stop_loss']:.2f} €
   {'❌ TOUCHÉ' if dist_sl <= 0 else f'📍 {abs(dist_sl):.1f}% de marge'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Cliquez 🔄 Refresh pour actualiser
"""
    
    # Boutons interactifs
    keyboard = [
        [
            InlineKeyboardButton("🔄 Refresh", callback_data=f"pos_refresh_{position['id']}"),
            InlineKeyboardButton("📊 Analyse", callback_data=f"pos_analyze_{position['id']}")
        ],
        [
            InlineKeyboardButton("📈 Graph 1h", callback_data=f"pos_chart_1h_{position['id']}"),
            InlineKeyboardButton("📈 Graph 1j", callback_data=f"pos_chart_1d_{position['id']}")
        ],
        [
            InlineKeyboardButton("🔒 Clôturer", callback_data=f"pos_close_confirm_{position['id']}")
        ],
        [
            InlineKeyboardButton("❌ Fermer", callback_data="delete_message")
        ]
    ]
    
    return (message, InlineKeyboardMarkup(keyboard))


def get_stock_price_quick(ticker):
    """Récupère rapidement le prix"""
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period='1d')
        if not data.empty:
            return float(data['Close'].iloc[-1])
    except:
        pass
    return None


async def paper_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les callbacks paper trading"""
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    data = query.data
    
# DEBUG
    print(f"[PAPER] Callback reçu: {data} de user {user_id}")
    
    # Gestion des callbacks
    if data == "mode_real_confirm":
        db.set_trading_mode(user_id, 'real')
        await query.edit_message_text("✅ *Mode RÉEL activé*\n\n💰 Trades avec argent réel", parse_mode='Markdown')
        return
    
    elif data == "mode_stats":
        capital_p = db.get_portfolio_capital_paper(user_id)
        stats = db.get_paper_stats(user_id)
        perf = ((capital_p['current_cash'] - capital_p['initial_capital']) / capital_p['initial_capital'] * 100) if capital_p['initial_capital'] > 0 else 0
        
        msg = f"""📊 *STATS PAPIER*

Capital: {capital_p['current_cash']:.2f} EUR
Perf: {perf:+.2f}%

Trades: {stats['total_trades']}
Gagnants: {stats['winners']} ({stats['win_rate']:.1f}%)

Meilleur: +{stats['best_trade']:.2f} EUR
Pire: {stats['worst_trade']:.2f} EUR"""
        
        await query.edit_message_text(msg, parse_mode='Markdown')
        return
    
    # Sessions de trading - Vérifier SEULEMENT si callback nécessite une session
    if data.startswith("pt_"):
        if user_id not in active_paper_sessions:
            print(f"[PAPER] Session expirée pour user {user_id}, callback: {data}")
            await query.answer("❌ Session expirée. Recommencez avec /analyser", show_alert=True)
            await query.edit_message_text("❌ *Session expirée*\n\nRecommencez avec `/analyser TICKER`", parse_mode='Markdown')
            return
        
        session = active_paper_sessions[user_id]
        print(f"[PAPER] Session trouvée: ticker={session.ticker}, step={session.current_step}")
    else:
        session = None
    
    # Choix position
    if data.startswith("pt_pos_"):
        pos_type = data.split("_")[2].upper()
        session.position_type = pos_type
        
        # Afficher recommandation produit
        analysis = getattr(session, 'analysis', None)
        rec_text = ""
        classique_text = "📊 CLASSIQUE"
        turbo_text = "🚀 TURBO"
        
        if analysis:
            rec_prod = analysis['recommended_product']
            rec_text = f"\n\n🤖 Recommandé: {rec_prod}\n💡 {analysis['product_reason']}"
            if rec_prod == "CLASSIQUE":
                classique_text += " ⭐"
            else:
                turbo_text += " ⭐"
        
        msg = f"📊 *{session.ticker}* - {pos_type} {'🟢' if pos_type == 'LONG' else '🔴'}{rec_text}\n\n⚡ TYPE?"
        keyboard = [
            [InlineKeyboardButton(classique_text, callback_data="pt_prod_classique")],
            [InlineKeyboardButton(turbo_text, callback_data="pt_prod_turbo")],
            [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
        ]
        await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return
    
    # Choix produit
    elif data.startswith("pt_prod_"):
        product = data.split("_")[2].upper()
        session.product_type = product
        
        # Récupérer recommandation
        analysis = getattr(session, 'analysis', None)
        rec_text = ""
        if analysis:
            rec_prod = analysis['recommended_product']
            rec_text = f"\n🤖 Recommandé: {rec_prod}\n💡 {analysis['product_reason']}"
        
        msg = f"📊 {session.ticker} - {product}{rec_text}\n\n⏰ HORIZON?"
        
        # Marquer les boutons
        court_text = "⚡ Court"
        moyen_text = "📊 Moyen"
        if analysis:
            if analysis['recommended_horizon'] == 'court':
                court_text = "⚡ Court ⭐ (Recommandé)"
            else:
                moyen_text = "📊 Moyen ⭐ (Recommandé)"
        
        keyboard = [
            [InlineKeyboardButton(court_text, callback_data="pt_hor_court")],
            [InlineKeyboardButton(moyen_text, callback_data="pt_hor_moyen")],
            [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
        ]
        await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return
    
    # Choix horizon
    elif data.startswith("pt_hor_"):
        horizon_map = {"court": "COURT TERME", "moyen": "MOYEN TERME"}
        horizon = horizon_map[data.split("_")[2]]
        session.horizon = horizon
        
        if session.product_type == 'CLASSIQUE':
            msg = f"📊 {session.ticker}\n\n⚡ LEVIER?"
            keyboard = [
                [InlineKeyboardButton("x1", callback_data="pt_lev_1"),
                 InlineKeyboardButton("x2", callback_data="pt_lev_2"),
                 InlineKeyboardButton("x5", callback_data="pt_lev_5")],
                [InlineKeyboardButton("x10", callback_data="pt_lev_10"),
                 InlineKeyboardButton("x20", callback_data="pt_lev_20")],
                [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
            ]
        else:
            msg = f"🚀 {session.ticker} TURBO\n\n⚡ LEVIER?"
            keyboard = [
                [InlineKeyboardButton("x10", callback_data="pt_lev_10"),
                 InlineKeyboardButton("x20", callback_data="pt_lev_20"),
                 InlineKeyboardButton("x30", callback_data="pt_lev_30")],
                [InlineKeyboardButton("x50", callback_data="pt_lev_50")],
                [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
            ]
        await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return
    
    # Choix levier
    elif data.startswith("pt_lev_"):
        leverage = int(data.split("_")[2])
        session.leverage = leverage
        context.user_data['awaiting_paper_amount'] = True
        
        capital = db.get_portfolio_capital_paper(user_id) if session.mode == 'paper' else db.get_portfolio_capital(user_id)
        msg = f"💰 MONTANT?\n\nDispo: {capital['current_cash']:.2f} EUR\n\nTapez le montant:"
        await query.edit_message_text(msg, parse_mode='Markdown')
        return
    
    # Barrière Turbo
    elif data.startswith("pt_barrier_"):
        if data == "pt_barrier_custom":
            context.user_data['awaiting_barrier'] = True
            await query.edit_message_text("🛡️ BARRIÈRE\n\nTapez distance %:", parse_mode='Markdown')
            return
        else:
            distance = float(data.split("_")[2])
            if session.position_type == 'LONG':
                session.barrier_knockout = session.current_price * (1 - distance/100)
            else:
                session.barrier_knockout = session.current_price * (1 + distance/100)
            session.barrier_distance = distance
    
    # Niveaux
    elif data == "pt_levels_auto":
        session.calculate_levels()
        ticket, risk = session.generate_ticket()
        
        keyboard = [
            [InlineKeyboardButton("✅ OK", callback_data="pt_confirm")],
            [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
        ]
        await query.edit_message_text(ticket, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return
    
    # Confirmation
    elif data == "pt_confirm":
        print(f"[PAPER] Confirmation trade pour user {user_id}")
        print(f"[PAPER] Session: ticker={session.ticker}, amount={session.amount}, leverage={session.leverage}")
        
        try:
            result = await execute_paper_trade(session)
            print(f"[PAPER] Résultat: {result}")
            
            if result['success']:
                position_id = result['position_id']
                
                # Récupérer la position créée
                position = db.get_position_paper(position_id)
                
                # Générer le ticket de route
                ticket = generate_position_ticket_v2(position, session.current_price)
                
                await query.edit_message_text(
                    ticket,
                    parse_mode='Markdown'
                )
                
                print(f"[PAPER] Ticket affiché pour position {position_id}")
            else:
                await query.edit_message_text(f"❌ ERREUR\n\n{result['error']}", parse_mode='Markdown')
        except Exception as e:
            print(f"[PAPER] ERREUR dans confirmation: {e}")
            import traceback
            traceback.print_exc()
            await query.edit_message_text(f"❌ ERREUR TECHNIQUE\n\n{str(e)}", parse_mode='Markdown')
        
        if user_id in active_paper_sessions:
            del active_paper_sessions[user_id]
        return
    
    # Retour (navigation arrière)
    elif data == "pt_back":
        # Logique de retour selon l'étape actuelle
        if session.current_step == 'product_type':
            # Retour au choix de position
            session.current_step = 'position_type'
            msg = f"📊 *{session.ticker}*\n\n📈 *DIRECTION?*"
            keyboard = [
                [InlineKeyboardButton("🟢 LONG", callback_data="pt_pos_long")],
                [InlineKeyboardButton("🔴 SHORT", callback_data="pt_pos_short")],
                [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
            ]
        elif session.current_step == 'horizon':
            # Retour au choix de produit
            session.current_step = 'product_type'
            msg = f"📊 *{session.ticker}* - {session.position_type}\n\n⚡ TYPE?"
            keyboard = [
                [InlineKeyboardButton("📊 CLASSIQUE", callback_data="pt_prod_classique")],
                [InlineKeyboardButton("🚀 TURBO", callback_data="pt_prod_turbo")],
                [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
            ]
        else:
            # Par défaut, annuler
            if user_id in active_paper_sessions:
                del active_paper_sessions[user_id]
            await query.edit_message_text("❌ Annulé")
            return
        
        await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return
    
    # Annulation
    elif data == "pt_cancel":
        if user_id in active_paper_sessions:
            del active_paper_sessions[user_id]
        await query.edit_message_text("❌ Annulé")
        return

 # ═══ CALLBACKS v2.0 - Tickets interactifs ═══
    
    elif data.startswith("pos_refresh_"):
        position_id = int(data.replace("pos_refresh_", ""))
        position = get_position_paper(position_id)
        
        if position:
            # Récupérer prix actuel
            try:
                stock = yf.Ticker(position['ticker'])
                current_data = stock.history(period='1d', interval='1m')
                current_price = current_data['Close'].iloc[-1] if len(current_data) > 0 else position['current_price']
            except:
                current_price = position['current_price']
            
            # Régénérer le ticket
            ticket_msg, ticket_keyboard = generate_position_ticket_v2(position, current_price)
            
            await query.edit_message_text(
                ticket_msg,
                parse_mode='Markdown',
                reply_markup=ticket_keyboard
            )
            
            await query.answer("🔄 Position actualisée", show_alert=False)
    
    elif data.startswith("pos_chart_"):
        # Graphiques depuis le ticket
        parts = data.split("_")
        timeframe = parts[2]  # 1h ou 1d
        position_id = int(parts[3])
        
        position = get_position_paper(position_id)
        
        if position:
            await query.answer(f"📈 Génération graphique {timeframe}...")
            
            chart = create_professional_chart_v2(position['ticker'], timeframe)
            
            if chart:
                await query.message.reply_photo(
                    photo=chart,
                    caption=f"📈 Position #{position_id} - {position['ticker']} ({timeframe.upper()})"
                )
            else:
                await query.answer("❌ Erreur graphique", show_alert=True)



async def execute_paper_trade(session):
    """Exécute un trade papier"""
    print(f"[PAPER] Exécution trade: mode={session.mode}, ticker={session.ticker}")
    try:
        if session.mode == 'paper':
            capital = db.get_portfolio_capital_paper(session.user_id)
            print(f"[PAPER] Capital: {capital['current_cash']:.2f} EUR, Montant: {session.amount:.2f} EUR")
            
            if session.amount > capital['current_cash']:
                print("[PAPER] Capital insuffisant!")
                return {'success': False, 'error': 'Capital insuffisant'}
            
            print("[PAPER] Débiter le compte...")
            db.update_portfolio_cash_paper(session.user_id, -session.amount)
            
            print("[PAPER] Créer la position...")
            position_id = db.add_position_paper(
                session.user_id, session.ticker, session.position_type, session.product_type,
                session.current_price, session.leverage, session.amount, session.amount * session.leverage,
                session.tp1, session.tp2, session.stop_loss, session.barrier_knockout,
                session.horizon, session.trailing_stop
            )
            
            print(f"[PAPER] Position créée! ID: {position_id}")
            return {'success': True, 'position_id': position_id}
        else:
            print("[PAPER] Mode réel non implémenté")
            return {'success': False, 'error': 'Mode réel non implémenté'}
    except Exception as e:
        print(f"[PAPER] ERREUR dans execute_paper_trade: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


async def paper_text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les saisies texte"""
    user_id = update.effective_user.id
    text = update.message.text.strip()
    
    if text.lower() == '/cancel':
        if user_id in active_paper_sessions:
            del active_paper_sessions[user_id]
        for key in list(context.user_data.keys()):
            if key.startswith('awaiting_'):
                del context.user_data[key]
        await update.message.reply_text("❌ Annulé")
        return
    
    # Montant
    if context.user_data.get('awaiting_paper_amount'):
        try:
            amount = float(text.replace(',', '.'))
            if amount <= 0:
                await update.message.reply_text("❌ Montant > 0")
                return
            
            if user_id not in active_paper_sessions:
                await update.message.reply_text("❌ Session expirée")
                return
            
            session = active_paper_sessions[user_id]
            capital = db.get_portfolio_capital_paper(user_id) if session.mode == 'paper' else db.get_portfolio_capital(user_id)
            
            if amount > capital['current_cash']:
                await update.message.reply_text(f"❌ Max: {capital['current_cash']:.2f} EUR")
                return
            
            session.amount = amount
            session.entry_price = session.current_price
            del context.user_data['awaiting_paper_amount']
            
            if session.product_type == 'TURBO':
                msg = "🛡️ BARRIÈRE?"
                keyboard = [
                    [InlineKeyboardButton("2%", callback_data="pt_barrier_2"),
                     InlineKeyboardButton("3%", callback_data="pt_barrier_3"),
                     InlineKeyboardButton("5%", callback_data="pt_barrier_5")],
                    [InlineKeyboardButton("✏️ Autre", callback_data="pt_barrier_custom")],
                    [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
                ]
                await update.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
            else:
                session.calculate_levels()
                msg = f"🎯 NIVEAUX\n\nTP1: {session.tp1:.2f}\nTP2: {session.tp2:.2f}\nSL: {session.stop_loss:.2f}"
                keyboard = [
                    [InlineKeyboardButton("✅ OK", callback_data="pt_levels_auto")],
                    [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
                ]
                await update.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
        except ValueError:
            await update.message.reply_text("❌ Nombre invalide")
        return
    
    # Barrière
    elif context.user_data.get('awaiting_barrier'):
        try:
            distance = float(text.replace(',', '.'))
            if distance <= 0 or distance > 50:
                await update.message.reply_text("❌ Entre 0 et 50%")
                return
            
            session = active_paper_sessions[user_id]
            if session.position_type == 'LONG':
                session.barrier_knockout = session.current_price * (1 - distance/100)
            else:
                session.barrier_knockout = session.current_price * (1 + distance/100)
            session.barrier_distance = distance
            del context.user_data['awaiting_barrier']
            
            session.calculate_levels()
            msg = f"🎯 NIVEAUX\n\nTP1: {session.tp1:.2f}\nTP2: {session.tp2:.2f}\nBarrière: {session.barrier_knockout:.2f}"
            keyboard = [
                [InlineKeyboardButton("✅ OK", callback_data="pt_levels_auto")],
                [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
            ]
            await update.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
        except ValueError:
            await update.message.reply_text("❌ Nombre invalide")
        return



async def trade_start_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Démarre une prise de position avec recommandations IA (adapté au mode)"""
    await trade_start_intelligent(update, context)


# ==================== PAPER TRADING INTELLIGENT ====================

class IntelligentPaperTrading:
    """Système de Paper Trading avec recommandations IA"""
    
    @staticmethod
    def analyze_ticker_for_trade(ticker):
        """Analyse complète du ticker pour recommandations"""
        try:
            stock = yf.Ticker(ticker)
            df = stock.history(period="1mo", interval="1d")
            info = stock.info
            
            if df.empty:
                return None
            
            # Prix actuel
            current_price = df['Close'].iloc[-1]
            
            # Calculs techniques
            sma_20 = df['Close'].rolling(window=20).mean().iloc[-1]
            sma_50 = df['Close'].rolling(window=min(50, len(df))).mean().iloc[-1]
            
            # RSI
            delta = df['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Tendance
            price_change_1d = ((df['Close'].iloc[-1] - df['Close'].iloc[-2]) / df['Close'].iloc[-2]) * 100
            price_change_5d = ((df['Close'].iloc[-1] - df['Close'].iloc[-6]) / df['Close'].iloc[-6]) * 100 if len(df) > 6 else 0
            
            # Volume
            avg_volume = df['Volume'].mean()
            current_volume = df['Volume'].iloc[-1]
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1
            
            # Volatilité
            volatility = df['Close'].pct_change().std() * 100
            
            # ANALYSE ET RECOMMANDATIONS
            analysis = {
                'ticker': ticker,
                'current_price': current_price,
                'sma_20': sma_20,
                'sma_50': sma_50,
                'rsi': current_rsi,
                'price_change_1d': price_change_1d,
                'price_change_5d': price_change_5d,
                'volume_ratio': volume_ratio,
                'volatility': volatility,
            }
            
            # RECOMMANDATION DIRECTION
            direction_score = 0
            direction_reasons = []
            
            # Critère 1: Prix vs SMA
            if current_price > sma_20:
                direction_score += 2
                direction_reasons.append("✅ Prix au-dessus SMA20")
            else:
                direction_score -= 2
                direction_reasons.append("⚠️ Prix en-dessous SMA20")
            
            if current_price > sma_50:
                direction_score += 1
                direction_reasons.append("✅ Prix au-dessus SMA50")
            else:
                direction_score -= 1
                direction_reasons.append("⚠️ Prix en-dessous SMA50")
            
            # Critère 2: RSI
            if current_rsi < 30:
                direction_score += 3
                direction_reasons.append("🚀 RSI survendu (<30) - Fort potentiel LONG")
            elif current_rsi < 40:
                direction_score += 1
                direction_reasons.append("📈 RSI favorable LONG")
            elif current_rsi > 70:
                direction_score -= 3
                direction_reasons.append("⚠️ RSI suracheté (>70) - Fort potentiel SHORT")
            elif current_rsi > 60:
                direction_score -= 1
                direction_reasons.append("📉 RSI favorable SHORT")
            
            # Critère 3: Momentum
            if price_change_5d > 3:
                direction_score += 2
                direction_reasons.append(f"🔥 Forte tendance haussière 5J (+{price_change_5d:.1f}%)")
            elif price_change_5d < -3:
                direction_score -= 2
                direction_reasons.append(f"❄️ Forte tendance baissière 5J ({price_change_5d:.1f}%)")
            
            # Critère 4: Volume
            if volume_ratio > 1.5:
                direction_reasons.append("💪 Volume fort (+50%)")
            elif volume_ratio < 0.7:
                direction_reasons.append("⚠️ Volume faible (-30%)")
            
            # RECOMMANDATION FINALE
            if direction_score >= 3:
                recommended_direction = "LONG"
                confidence = "FORTE"
                emoji = "🟢"
            elif direction_score >= 1:
                recommended_direction = "LONG"
                confidence = "MOYENNE"
                emoji = "🟡"
            elif direction_score <= -3:
                recommended_direction = "SHORT"
                confidence = "FORTE"
                emoji = "🔴"
            elif direction_score <= -1:
                recommended_direction = "SHORT"
                confidence = "MOYENNE"
                emoji = "🟠"
            else:
                recommended_direction = "NEUTRE"
                confidence = "FAIBLE"
                emoji = "⚪"
            
            analysis['recommended_direction'] = recommended_direction
            analysis['confidence'] = confidence
            analysis['direction_emoji'] = emoji
            analysis['direction_score'] = direction_score
            analysis['direction_reasons'] = direction_reasons
            
            # RECOMMANDATION LEVIER
            if volatility < 2:
                recommended_leverage = 5
                leverage_reason = "Volatilité faible → x5 sûr"
            elif volatility < 3:
                recommended_leverage = 3
                leverage_reason = "Volatilité moyenne → x3 recommandé"
            else:
                recommended_leverage = 2
                recommended_leverage = 1
                leverage_reason = "Volatilité élevée → x1-x2 prudent"
            
            analysis['recommended_leverage'] = recommended_leverage
            analysis['leverage_reason'] = leverage_reason
            
            # RECOMMANDATION PRODUIT
            if volatility > 3 and confidence == "FORTE":
                recommended_product = "TURBO"
                product_reason = "Forte conviction + volatilité → TURBO"
            else:
                recommended_product = "CLASSIQUE"
                product_reason = "Risque modéré → CLASSIQUE"
            
            analysis['recommended_product'] = recommended_product
            analysis['product_reason'] = product_reason
            
            # RECOMMANDATION HORIZON
            if abs(price_change_1d) > 2:
                recommended_horizon = "court"
                horizon_reason = "Mouvement rapide → Court terme"
            else:
                recommended_horizon = "moyen"
                horizon_reason = "Mouvement modéré → Moyen terme"
            
            analysis['recommended_horizon'] = recommended_horizon
            analysis['horizon_reason'] = horizon_reason
            
            return analysis
            
        except Exception as e:
            print(f"[INTELLIGENT] Erreur analyse: {e}")
            return None


async def trade_start_intelligent(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Démarre un trade papier INTELLIGENT avec recommandations"""
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    ticker = query.data.split("_")[2]
    
    # ANALYSE INTELLIGENTE
    analysis = IntelligentPaperTrading.analyze_ticker_for_trade(ticker)
    
    if not analysis:
        await query.answer("❌ Impossible d'analyser ce ticker", show_alert=True)
        return
    
    mode = db.get_trading_mode(user_id)
    session = PaperTradeSession(user_id, ticker, mode)
    session.analysis = analysis  # Stocker l'analyse dans la session
    
    if not session.get_current_price():
        await query.answer("❌ Prix introuvable", show_alert=True)
        return
    
    active_paper_sessions[user_id] = session
    
    # MESSAGE AVEC RECOMMANDATIONS
    mode_badge = "🎮" if mode == 'paper' else "💰"
    mode_text = "PAPIER" if mode == 'paper' else "RÉEL"
    
    reasons_text = "\n".join([f"  • {r}" for r in analysis['direction_reasons'][:3]])
    
    msg = f"""📊 *{ticker}* | {mode_badge} Mode {mode_text}

━━━━━━━━━━━━━━━━━━━━
💰 *PRIX ACTUEL*
{analysis['current_price']:.2f} EUR

━━━━━━━━━━━━━━━━━━━━
🤖 *RECOMMANDATION IA*

{analysis['direction_emoji']} *Direction: {analysis['recommended_direction']}*
⭐ Confiance: {analysis['confidence']}

*Analyse:*
{reasons_text}

📊 RSI: {analysis['rsi']:.0f}
📈 Tendance 5J: {analysis['price_change_5d']:+.1f}%
💪 Volume: {analysis['volume_ratio']:.1f}x

━━━━━━━━━━━━━━━━━━━━
📈 *VOTRE CHOIX:*
"""
    
    # Créer boutons avec recommandation visible
    long_text = "🟢 LONG"
    short_text = "🔴 SHORT"
    
    if analysis['recommended_direction'] == "LONG":
        long_text = "🟢 LONG ⭐ (Recommandé)"
    elif analysis['recommended_direction'] == "SHORT":
        short_text = "🔴 SHORT ⭐ (Recommandé)"
    
    keyboard = [
        [InlineKeyboardButton(long_text, callback_data="pt_pos_long")],
        [InlineKeyboardButton(short_text, callback_data="pt_pos_short")],
        [InlineKeyboardButton("❌ Annuler", callback_data="delete_message")]
    ]
    
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')


# ==================== SYSTÈME DE SUIVI COMPLET ====================

import asyncio
from datetime import datetime, timedelta

class PositionTracker:
    """Surveille les positions et envoie des alertes"""
    
    def __init__(self, bot):
        self.bot = bot
        self.monitoring_active = False
        self.check_interval = 60  # Vérifier toutes les 60 secondes
    
    async def start_monitoring(self):
        """Démarre la surveillance des positions"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        print("[TRACKER] Surveillance des positions démarrée")
        
        while self.monitoring_active:
            try:
                await self.check_all_positions()
            except Exception as e:
                print(f"[TRACKER] Erreur: {e}")
            
            await asyncio.sleep(self.check_interval)
    
    async def check_all_positions(self):
        """Vérifie toutes les positions actives"""
        # Récupérer toutes les positions actives de tous les users
        positions = db.get_all_active_paper_positions()
        
        for position in positions:
            await self.check_position(position)
    
    async def check_position(self, position):
        """Vérifie une position et envoie des alertes si nécessaire"""
        try:
            user_id = position['user_id']
            position_id = position['id']
            ticker = position['ticker']
            
            # Récupérer le prix actuel
            stock = yf.Ticker(ticker)
            current_price = stock.info.get('currentPrice') or stock.info.get('regularMarketPrice')
            
            if not current_price:
                return
            
            entry_price = position['entry_price']
            position_type = position['position_type']
            leverage = position['leverage']
            amount = position['amount']
            
            tp1 = position['tp1']
            tp2 = position['tp2']
            stop_loss = position['stop_loss']
            barrier = position.get('barrier_knockout')
            
            # Calculer P&L
            if position_type == 'LONG':
                price_change = ((current_price - entry_price) / entry_price) * 100
            else:  # SHORT
                price_change = ((entry_price - current_price) / entry_price) * 100
            
            pnl = amount * (price_change / 100) * leverage
            pnl_pct = (pnl / amount) * 100
            
            # Vérifier les conditions d'alerte
            alert_sent = False
            alert_type = None
            close_position = False
            
            # TURBO - Vérifier barrière knockout
            if barrier and position_type == 'LONG' and current_price <= barrier:
                alert_type = "knockout"
                close_position = True
                pnl = -amount  # Perte totale
                alert_sent = True
            elif barrier and position_type == 'SHORT' and current_price >= barrier:
                alert_type = "knockout"
                close_position = True
                pnl = -amount
                alert_sent = True
            
            # Vérifier TP2
            elif position_type == 'LONG' and current_price >= tp2:
                alert_type = "tp2"
                close_position = True
                alert_sent = True
            elif position_type == 'SHORT' and current_price <= tp2:
                alert_type = "tp2"
                close_position = True
                alert_sent = True
            
            # Vérifier TP1
            elif position_type == 'LONG' and current_price >= tp1 and current_price < tp2:
                alert_type = "tp1"
                alert_sent = True
            elif position_type == 'SHORT' and current_price <= tp1 and current_price > tp2:
                alert_type = "tp1"
                alert_sent = True
            
            # Vérifier Stop Loss
            elif position_type == 'LONG' and current_price <= stop_loss:
                alert_type = "stop_loss"
                close_position = True
                alert_sent = True
            elif position_type == 'SHORT' and current_price >= stop_loss:
                alert_type = "stop_loss"
                close_position = True
                alert_sent = True
            
            # Envoyer l'alerte si nécessaire
            if alert_sent and not position.get('alert_sent_' + alert_type):
                await self.send_alert(user_id, position, current_price, pnl, pnl_pct, alert_type)
                
                # Marquer l'alerte comme envoyée
                db.mark_alert_sent(position_id, alert_type)
                
                # Fermer la position si nécessaire
                if close_position:
                    await self.close_position(user_id, position_id, current_price, pnl, alert_type)
            
            # Mettre à jour le prix actuel dans la DB
            db.update_position_current_price(position_id, current_price, pnl, pnl_pct)
            
        except Exception as e:
            print(f"[TRACKER] Erreur check position {position.get('id')}: {e}")
    
    async def send_alert(self, user_id, position, current_price, pnl, pnl_pct, alert_type):
        """Envoie une alerte au user"""
        ticker = position['ticker']
        position_type = position['position_type']
        entry_price = position['entry_price']
        
        emoji = "🟢" if pnl > 0 else "🔴" if pnl < 0 else "⚪"
        
        if alert_type == "tp1":
            title = "🎯 TP1 ATTEINT !"
            message = f"""🎯 *TP1 ATTEINT* - {ticker}

{position_type} {'🟢' if position_type == 'LONG' else '🔴'}

━━━━━━━━━━━━━━━━━━━━
💵 PRIX
Entrée: {entry_price:.2f} EUR
Actuel: {current_price:.2f} EUR
TP1: {position['tp1']:.2f} EUR ✅

━━━━━━━━━━━━━━━━━━━━
💰 GAINS
{emoji} P&L: {pnl:+.2f} EUR ({pnl_pct:+.1f}%)

━━━━━━━━━━━━━━━━━━━━
💡 CONSEIL
Sécurisez 50% des gains ou
Laissez courir jusqu'à TP2

Utilisez /position_{position['id']} pour détails"""
        
        elif alert_type == "tp2":
            title = "🚀 TP2 ATTEINT !"
            message = f"""🚀 *TP2 ATTEINT* - {ticker}

{position_type} {'🟢' if position_type == 'LONG' else '🔴'}

━━━━━━━━━━━━━━━━━━━━
💵 PRIX
Entrée: {entry_price:.2f} EUR
Actuel: {current_price:.2f} EUR
TP2: {position['tp2']:.2f} EUR ✅

━━━━━━━━━━━━━━━━━━━━
💰 GAINS
{emoji} P&L: {pnl:+.2f} EUR ({pnl_pct:+.1f}%)

━━━━━━━━━━━━━━━━━━━━
✅ POSITION FERMÉE
Gains sécurisés automatiquement

Utilisez /wallet pour voir votre capital"""
        
        elif alert_type == "stop_loss":
            title = "🛑 STOP LOSS DÉCLENCHÉ"
            message = f"""🛑 *STOP LOSS* - {ticker}

{position_type} {'🟢' if position_type == 'LONG' else '🔴'}

━━━━━━━━━━━━━━━━━━━━
💵 PRIX
Entrée: {entry_price:.2f} EUR
Actuel: {current_price:.2f} EUR
SL: {position['stop_loss']:.2f} EUR ❌

━━━━━━━━━━━━━━━━━━━━
💰 PERTE
{emoji} P&L: {pnl:+.2f} EUR ({pnl_pct:+.1f}%)

━━━━━━━━━━━━━━━━━━━━
✅ POSITION FERMÉE
Perte limitée comme prévu

Utilisez /wallet pour voir votre capital"""
        
        elif alert_type == "knockout":
            title = "⚠️ BARRIÈRE KNOCKOUT !"
            message = f"""⚠️ *KNOCKOUT* - {ticker}

{position_type} {'🟢' if position_type == 'LONG' else '🔴'} TURBO

━━━━━━━━━━━━━━━━━━━━
💵 PRIX
Entrée: {entry_price:.2f} EUR
Actuel: {current_price:.2f} EUR
Barrière: {position['barrier_knockout']:.2f} EUR ❌

━━━━━━━━━━━━━━━━━━━━
💰 PERTE
🔴 P&L: {pnl:+.2f} EUR (100% de perte)

━━━━━━━━━━━━━━━━━━━━
✅ POSITION FERMÉE
Barrière touchée - Produit TURBO

Utilisez /wallet pour voir votre capital"""
        
        try:
            await self.bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode='Markdown'
            )
            print(f"[TRACKER] Alerte {alert_type} envoyée à user {user_id}")
        except Exception as e:
            print(f"[TRACKER] Erreur envoi alerte: {e}")
    
    async def close_position(self, user_id, position_id, exit_price, pnl, reason):
        """Ferme une position et crédite le compte"""
        try:
            position = db.get_position_paper(position_id)
            
            # Créditer/débiter le compte
            final_amount = position['amount'] + pnl
            db.update_portfolio_cash_paper(user_id, final_amount)
            
            # Fermer la position
            db.close_position_paper(position_id, exit_price, pnl, reason)
            
            print(f"[TRACKER] Position {position_id} fermée: {reason}, P&L: {pnl:.2f} EUR")
            
        except Exception as e:
            print(f"[TRACKER] Erreur fermeture position: {e}")


def generate_position_ticket_v2(position, current_price=None):
    """Génère un ticket de suivi de position"""
    ticker = position['ticker']
    position_type = position['position_type']
    product_type = position['product_type']
    entry_price = position['entry_price']
    leverage = position['leverage']
    amount = position['amount']
    exposure = position['exposure']
    
    tp1 = position['tp1']
    tp2 = position['tp2']
    stop_loss = position['stop_loss']
    barrier = position.get('barrier_knockout')
    
    # Prix actuel
    if not current_price:
        try:
            stock = yf.Ticker(ticker)
            current_price = stock.info.get('currentPrice') or stock.info.get('regularMarketPrice') or entry_price
        except:
            current_price = entry_price
    
    # Calculer P&L
    if position_type == 'LONG':
        price_change = ((current_price - entry_price) / entry_price) * 100
    else:
        price_change = ((entry_price - current_price) / entry_price) * 100
    
    pnl = amount * (price_change / 100) * leverage
    pnl_pct = (pnl / amount) * 100
    
    emoji = "🟢" if pnl > 0 else "🔴" if pnl < 0 else "⚪"
    type_emoji = "🟢" if position_type == "LONG" else "🔴"
    
    # Distance aux objectifs
    if position_type == 'LONG':
        dist_tp1 = ((tp1 - current_price) / current_price) * 100
        dist_tp2 = ((tp2 - current_price) / current_price) * 100
        dist_sl = ((current_price - stop_loss) / current_price) * 100
    else:
        dist_tp1 = ((current_price - tp1) / current_price) * 100
        dist_tp2 = ((current_price - tp2) / current_price) * 100
        dist_sl = ((stop_loss - current_price) / current_price) * 100
    
    ticket = f"""🎫 *FEUILLE DE ROUTE* - {ticker}

{position_type} {type_emoji} | {product_type}
⚖️ Levier: x{leverage}

━━━━━━━━━━━━━━━━━━━━
💵 *PRIX*
📍 Entrée: {entry_price:.2f} EUR
💰 Actuel: {current_price:.2f} EUR

━━━━━━━━━━━━━━━━━━━━
💰 *POSITION*
💵 Montant: {amount:.2f} EUR
📈 Exposition: {exposure:.2f} EUR
{emoji} P&L: {pnl:+.2f} EUR ({pnl_pct:+.1f}%)

━━━━━━━━━━━━━━━━━━━━
🎯 *OBJECTIFS*
"""

    if barrier:
        ticket += f"""🛡️ Barrière: {barrier:.2f} EUR
   ⚠️ Si touché → Perte 100%

"""
    
    ticket += f"""🎯 TP1: {tp1:.2f} EUR
   {"✅" if (position_type == "LONG" and current_price >= tp1) or (position_type == "SHORT" and current_price <= tp1) else f"📍 {dist_tp1:+.1f}%"}

🚀 TP2: {tp2:.2f} EUR
   {"✅" if (position_type == "LONG" and current_price >= tp2) or (position_type == "SHORT" and current_price <= tp2) else f"📍 {dist_tp2:+.1f}%"}

🛡️ SL: {stop_loss:.2f} EUR
   {"❌" if (position_type == "LONG" and current_price <= stop_loss) or (position_type == "SHORT" and current_price >= stop_loss) else f"📍 {dist_sl:+.1f}%"}

━━━━━━━━━━━━━━━━━━━━
⏱️ *STATUT*
"""
    
    # Statut
    if barrier:
        if (position_type == "LONG" and current_price <= barrier) or (position_type == "SHORT" and current_price >= barrier):
            ticket += "⚠️ KNOCKOUT - Position fermée\n"
        else:
            ticket += "🟢 Position active\n"
    elif (position_type == "LONG" and current_price >= tp2) or (position_type == "SHORT" and current_price <= tp2):
        ticket += "🚀 TP2 atteint - Position fermée\n"
    elif (position_type == "LONG" and current_price <= stop_loss) or (position_type == "SHORT" and current_price >= stop_loss):
        ticket += "🛑 Stop Loss déclenché\n"
    elif (position_type == "LONG" and current_price >= tp1) or (position_type == "SHORT" and current_price <= tp1):
        ticket += "🎯 TP1 atteint - En route vers TP2\n"
    else:
        ticket += "🟢 Position active - En cours\n"
    
    ticket += f"""
🔔 Vous serez alerté à chaque objectif
📊 Utilisez /wallet pour voir toutes vos positions"""
    
    return ticket


# ==================== FIN PAPER TRADING ====================

import yfinance as yf
from datetime import datetime


class TradeSession:
    """Gère une session de trading interactive"""
    
    def __init__(self, user_id, ticker):
        self.user_id = user_id
        self.ticker = ticker
        self.horizon = None
        self.position_type = None
        self.leverage = 1
        self.amount = None
        self.tp1 = None
        self.tp2 = None
        self.stop_loss = None
        self.current_price = None
        self.risk_assessment = None
    
    def calculate_levels(self, direction, current_price):
        """Calcule les niveaux TP et SL suggérés"""
        if direction == "LONG":
            # Pour un LONG
            tp1 = current_price * 1.02  # +2%
            tp2 = current_price * 1.05  # +5%
            sl = current_price * 0.98   # -2%
        else:
            # Pour un SHORT
            tp1 = current_price * 0.98  # -2%
            tp2 = current_price * 0.95  # -5%
            sl = current_price * 1.02   # +2%
        
        return {
            'tp1': tp1,
            'tp2': tp2,
            'stop_loss': sl
        }
    
    def assess_risk(self):
        """Évalue le risque du trade"""
        risk_score = 0
        warnings = []
        
        # Vérifier le levier
        if self.leverage > 5:
            risk_score += 3
            warnings.append("⚠️ Levier élevé (>5x) - Risque de liquidation")
        elif self.leverage > 2:
            risk_score += 1
            warnings.append("⚠️ Levier modéré - Surveiller les marges")
        
        # Vérifier le montant par rapport au capital
        capital = db.get_portfolio_capital(self.user_id)
        if self.amount > capital['current_cash'] * 0.5:
            risk_score += 2
            warnings.append("⚠️ Position importante (>50% du capital)")
        
        # Vérifier la volatilité
        try:
            stock = yf.Ticker(self.ticker)
            data = stock.history(period='1mo')
            volatility = data['Close'].pct_change().std() * 100
            
            if volatility > 3:
                risk_score += 2
                warnings.append(f"⚠️ Forte volatilité ({volatility:.1f}%)")
        except:
            pass
        
        # Déterminer le niveau de risque
        if risk_score >= 5:
            risk_level = "🔴 ÉLEVÉ"
            recommendation = "❌ Trade déconseillé"
        elif risk_score >= 3:
            risk_level = "🟡 MODÉRÉ"
            recommendation = "⚠️ Prudence requise"
        else:
            risk_level = "🟢 FAIBLE"
            recommendation = "✅ Conditions acceptables"
        
        return {
            'level': risk_level,
            'score': risk_score,
            'warnings': warnings,
            'recommendation': recommendation
        }
    
    def generate_ticket(self):
        """Génère le ticket de position (feuille de route)"""
        # Calculer les frais
        fees = wallet_manager.TRADE_REPUBLIC_FEE
        total_invested = self.amount * self.leverage
        
        # Vérifier la viabilité
        viability = wallet_manager.validate_trade_viability(self.amount, self.leverage)
        
        # Calculer le risque
        risk = self.assess_risk()
        
        # Calculer les gains/pertes potentiels
        if self.position_type == "LONG":
            gain_tp1 = ((self.tp1 - self.current_price) / self.current_price) * total_invested
            gain_tp2 = ((self.tp2 - self.current_price) / self.current_price) * total_invested
            loss_sl = ((self.stop_loss - self.current_price) / self.current_price) * total_invested
        else:
            gain_tp1 = ((self.current_price - self.tp1) / self.current_price) * total_invested
            gain_tp2 = ((self.current_price - self.tp2) / self.current_price) * total_invested
            loss_sl = ((self.current_price - self.stop_loss) / self.current_price) * total_invested
        
        # Construire le ticket
        ticket = f"""
🎫 *TICKET DE POSITION*
━━━━━━━━━━━━━━━━━━━━

📊 *ACTIF*
{self.ticker} @ {self.current_price:.2f} EUR

📈 *TYPE DE POSITION*
{self.position_type} {'🟢' if self.position_type == 'LONG' else '🔴'}

⏰ *HORIZON TEMPOREL*
{self.horizon}

💰 *MONTANT ENGAGÉ*
{self.amount:.2f} EUR
"""

        if self.leverage > 1:
            ticket += f"\n⚡ *LEVIER*\nx{self.leverage}\n"
            ticket += f"Exposition totale: {total_invested:.2f} EUR\n"

        ticket += f"""
━━━━━━━━━━━━━━━━━━━━
🎯 *OBJECTIFS*

TP1: {self.tp1:.2f} EUR
└─ Gain potentiel: {gain_tp1:.2f} EUR ({(gain_tp1/self.amount)*100:.1f}%)

TP2: {self.tp2:.2f} EUR
└─ Gain potentiel: {gain_tp2:.2f} EUR ({(gain_tp2/self.amount)*100:.1f}%)

🛡️ *STOP LOSS*
{self.stop_loss:.2f} EUR
└─ Perte max: {loss_sl:.2f} EUR ({(loss_sl/self.amount)*100:.1f}%)

━━━━━━━━━━━━━━━━━━━━
💸 *FRAIS TRADE REPUBLIC*

Entrée: 1.00 EUR
Sortie: 1.00 EUR
*Total: {fees:.2f} EUR*

"""

        # Ajouter l'évaluation du risque
        ticket += f"""━━━━━━━━━━━━━━━━━━━━
⚠️ *ÉVALUATION DU RISQUE*

Niveau: {risk['level']}
{risk['recommendation']}
"""

        if risk['warnings']:
            ticket += "\n"
            for warning in risk['warnings']:
                ticket += f"\n{warning}"

        # Viabilité du trade
        ticket += "\n\n━━━━━━━━━━━━━━━━━━━━\n"
        
        if not viability['viable']:
            ticket += f"\n❌ *TRADE NON VIABLE*\n"
            ticket += f"{viability['reason']}\n"
        elif 'warning' in viability:
            ticket += f"\n⚠️ *ATTENTION*\n"
            ticket += f"{viability['warning']}\n"
        else:
            ticket += f"\n✅ *TRADE VIABLE*\n"
            ticket += f"Rentabilité minimum: +{viability['min_profit']:.2f}%\n"

        ticket += f"\n📅 Créé le: {datetime.now().strftime('%d/%m/%Y à %H:%M')}\n"

        return ticket, viability, risk


# Sessions actives (en mémoire)
active_sessions = {}


async def start_trade_session(update: Update, context: ContextTypes.DEFAULT_TYPE, ticker, analysis_result=None):
    """Démarre une session de trading interactive"""
    user_id = update.effective_user.id
    
    # Créer la session
    session = TradeSession(user_id, ticker)
    active_sessions[user_id] = session
    
    # Récupérer le prix actuel
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period='1d')
        session.current_price = data['Close'].iloc[-1]
    except:
        await update.callback_query.edit_message_text(
            "❌ Impossible de récupérer le prix actuel. Trade annulé."
        )
        return
    
    # Demander l'horizon
    message = f"""
📊 *CONFIGURATION DU TRADE - {ticker}*

Prix actuel: *{session.current_price:.2f} EUR*

━━━━━━━━━━━━━━━━━━━━
⏰ *Quel est votre horizon de trading ?*
"""
    
    keyboard = [
        [
            InlineKeyboardButton("⚡ Court terme", callback_data="trade_horizon_court"),
            InlineKeyboardButton("📊 Moyen terme", callback_data="trade_horizon_moyen")
        ],
        [InlineKeyboardButton("📈 Long terme", callback_data="trade_horizon_long")],
        [InlineKeyboardButton("❌ Annuler", callback_data="trade_cancel")]
    ]
    
    await update.callback_query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )


async def trade_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les callbacks du système de trading"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    action = query.data
    
    if user_id not in active_sessions:
        await query.edit_message_text("❌ Session expirée. Veuillez recommencer.")
        return
    
    session = active_sessions[user_id]
    
    # Horizon
    if action.startswith("trade_horizon_"):
        horizon = action.split("_")[-1]
        session.horizon = horizon.upper()
        
        # Demander le type de position
        message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

Horizon: *{session.horizon}*

━━━━━━━━━━━━━━━━━━━━
📈 *Type de position ?*
"""
        
        keyboard = [
            [
                InlineKeyboardButton("🟢 LONG", callback_data="trade_type_long"),
                InlineKeyboardButton("🔴 SHORT", callback_data="trade_type_short")
            ],
            [InlineKeyboardButton("🤖 Laisser le bot décider", callback_data="trade_type_auto")],
            [InlineKeyboardButton("❌ Annuler", callback_data="trade_cancel")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    # Type de position
    elif action.startswith("trade_type_"):
        pos_type = action.split("_")[-1].upper()
        
        if pos_type == "AUTO":
            # Le bot décide (basé sur l'analyse)
            # Pour simplifier, on va choisir LONG par défaut
            session.position_type = "LONG"
        else:
            session.position_type = pos_type
        
        # Demander le levier
        message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

Type: *{session.position_type}* {'🟢' if session.position_type == 'LONG' else '🔴'}

━━━━━━━━━━━━━━━━━━━━
⚡ *Utiliser un levier ?*
"""
        
        keyboard = [
            [
                InlineKeyboardButton("❌ Non (x1)", callback_data="trade_lever_1"),
                InlineKeyboardButton("✅ Oui", callback_data="trade_lever_ask")
            ],
            [InlineKeyboardButton("« Retour", callback_data="trade_back_horizon")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    # Levier
    elif action == "trade_lever_1":
        session.leverage = 1
        await ask_amount(query, session)
    
    elif action == "trade_lever_ask":
        message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

⚡ *Niveau de levier souhaité ?*

⚠️ Attention: Un levier élevé amplifie les gains ET les pertes !
"""
        
        keyboard = [
            [
                InlineKeyboardButton("x2", callback_data="trade_lever_2"),
                InlineKeyboardButton("x3", callback_data="trade_lever_3"),
                InlineKeyboardButton("x5", callback_data="trade_lever_5")
            ],
            [
                InlineKeyboardButton("x10", callback_data="trade_lever_10"),
                InlineKeyboardButton("x20", callback_data="trade_lever_20")
            ],
            [InlineKeyboardButton("« Retour", callback_data="trade_back_type")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action.startswith("trade_lever_") and action != "trade_lever_ask":
        lever = int(action.split("_")[-1])
        session.leverage = lever
        
        # Warning si levier élevé
        if lever > 5:
            message = f"""
⚠️ *ATTENTION - LEVIER ÉLEVÉ*

Vous avez sélectionné un levier de *x{lever}*

Ce niveau amplifie fortement:
• Les gains potentiels
• Les pertes potentielles
• Le risque de liquidation

Êtes-vous sûr de vouloir continuer ?
"""
            keyboard = [
                [
                    InlineKeyboardButton("✅ Continuer", callback_data="trade_lever_confirm"),
                    InlineKeyboardButton("❌ Modifier", callback_data="trade_lever_ask")
                ]
            ]
            
            await query.edit_message_text(
                text=message,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        else:
            await ask_amount(query, session)
    
    elif action == "trade_lever_confirm":
        await ask_amount(query, session)
    
    elif action == "trade_cancel":
        del active_sessions[user_id]
        await query.edit_message_text("❌ Trade annulé.")


async def ask_amount(query, session):
    """Demande le montant à investir"""
    capital = db.get_portfolio_capital(session.user_id)
    
    message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

Capital disponible: *{capital['current_cash']:.2f} EUR*

━━━━━━━━━━━━━━━━━━━━
💰 *Montant à investir ?*

Tapez le montant en EUR (ex: 500)

⚠️ Frais Trade Republic: 2 EUR par trade
"""
    
    await query.edit_message_text(text=message, parse_mode='Markdown')
    # L'utilisateur va taper le montant (géré par un message handler)




# ==================== HORAIRES DES MARCHÉS ====================

def get_market_status(ticker):
    """Détermine si le marché est ouvert et donne les horaires"""
    now_utc = datetime.now(pytz.UTC)
    
    # Déterminer le marché selon le ticker
    if ticker.endswith('.PA') or ticker.endswith('.AS'):
        # Marché Européen (Euronext)
        market_name = "Euronext Paris"
        timezone = pytz.timezone('Europe/Paris')
        open_time = 9  # 9h00
        close_time = 17.5  # 17h30
        
    elif ticker.endswith('.DE'):
        # Marché Allemand (XETRA)
        market_name = "XETRA (Francfort)"
        timezone = pytz.timezone('Europe/Berlin')
        open_time = 9  # 9h00
        close_time = 17.5  # 17h30
        
    else:
        # Marché US (NYSE/NASDAQ)
        market_name = "NYSE/NASDAQ"
        timezone = pytz.timezone('America/New_York')
        open_time = 9.5  # 9h30
        close_time = 16  # 16h00
    
    # Convertir l'heure actuelle dans le fuseau du marché
    now_market = now_utc.astimezone(timezone)
    weekday = now_market.weekday()  # 0=Lundi, 6=Dimanche
    current_hour = now_market.hour + now_market.minute / 60.0
    
    # Vérifier si c'est un jour de semaine
    if weekday >= 5:  # Samedi ou Dimanche
        # Calculer jours jusqu'à lundi
        days_until_monday = (7 - weekday) if weekday == 6 else 1
        next_open = now_market.replace(hour=int(open_time), minute=int((open_time % 1) * 60), second=0, microsecond=0)
        next_open += timedelta(days=days_until_monday)
        
        time_until_open = next_open - now_market
        hours_until = int(time_until_open.total_seconds() / 3600)
        minutes_until = int((time_until_open.total_seconds() % 3600) / 60)
        
        return {
            'is_open': False,
            'market_name': market_name,
            'message': f"🔴 *{market_name} FERMÉ* (Week-end)\n📅 Réouverture lundi à {int(open_time)}h{int((open_time % 1) * 60):02d}\n⏰ Ouvre dans {hours_until}h{minutes_until:02d}",
            'emoji': '🔴'
        }
    
    # Vérifier si le marché est ouvert
    if open_time <= current_hour < close_time:
        # Marché ouvert
        close_hour = int(close_time)
        close_minute = int((close_time % 1) * 60)
        time_until_close = (close_time - current_hour) * 60  # en minutes
        hours_left = int(time_until_close / 60)
        minutes_left = int(time_until_close % 60)
        
        return {
            'is_open': True,
            'market_name': market_name,
            'message': f"🟢 *{market_name} OUVERT*\n⏰ Fermeture à {close_hour}h{close_minute:02d} (dans {hours_left}h{minutes_left:02d})",
            'emoji': '🟢'
        }
    
    elif current_hour < open_time:
        # Avant l'ouverture
        time_until_open = (open_time - current_hour) * 60  # en minutes
        hours_until = int(time_until_open / 60)
        minutes_until = int(time_until_open % 60)
        
        return {
            'is_open': False,
            'market_name': market_name,
            'message': f"🔴 *{market_name} FERMÉ*\n📅 Ouverture aujourd'hui à {int(open_time)}h{int((open_time % 1) * 60):02d}\n⏰ Ouvre dans {hours_until}h{minutes_until:02d}",
            'emoji': '🔴'
        }
    
    else:
        # Après la fermeture
        next_open = now_market.replace(hour=int(open_time), minute=int((open_time % 1) * 60), second=0, microsecond=0)
        next_open += timedelta(days=1)
        
        # Si demain est samedi, passer à lundi
        if next_open.weekday() == 5:
            next_open += timedelta(days=2)
        elif next_open.weekday() == 6:
            next_open += timedelta(days=1)
        
        time_until_open = next_open - now_market
        hours_until = int(time_until_open.total_seconds() / 3600)
        minutes_until = int((time_until_open.total_seconds() % 3600) / 60)
        
        return {
            'is_open': False,
            'market_name': market_name,
            'message': f"🔴 *{market_name} FERMÉ*\n📅 Réouverture demain à {int(open_time)}h{int((open_time % 1) * 60):02d}\n⏰ Ouvre dans {hours_until}h{minutes_until:02d}",
            'emoji': '🔴'
        }

# ==================== INDICATEURS TECHNIQUES ====================

def calculate_rsi(data, period=14):
    """Calcule le RSI"""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(data, fast=12, slow=26, signal=9):
    """Calcule le MACD"""
    exp1 = data['Close'].ewm(span=fast, adjust=False).mean()
    exp2 = data['Close'].ewm(span=slow, adjust=False).mean()
    macd = exp1 - exp2
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    histogram = macd - signal_line
    return macd, signal_line, histogram

def calculate_sma(data, period):
    """Calcule la moyenne mobile simple"""
    return data['Close'].rolling(window=period).mean()

def detect_trend(data):
    """Détecte la tendance (haussière, baissière, neutre)"""
    sma20 = calculate_sma(data, 20).iloc[-1]
    sma50 = calculate_sma(data, 50).iloc[-1]
    current_price = data['Close'].iloc[-1]
    
    if current_price > sma20 > sma50:
        return "🟢 HAUSSIÈRE FORTE"
    elif current_price > sma20 and sma20 < sma50:
        return "🟡 HAUSSIÈRE MODÉRÉE"
    elif current_price < sma20 < sma50:
        return "🔴 BAISSIÈRE FORTE"
    elif current_price < sma20 and sma20 > sma50:
        return "🟠 BAISSIÈRE MODÉRÉE"
    else:
        return "⚪ NEUTRE"

def generate_signal(rsi, macd, macd_signal, trend, current_price, sma20, sma50=None, volume_ratio=1.0, price_momentum=0):
    """Génère un signal d'achat/vente avancé avec scoring amélioré"""
    signals = []
    score = 0
    strength_indicators = []
    
    # 1. RSI (poids: 2-3)
    if rsi < 25:
        signals.append("🔥 RSI extrêmement survendu - Très fort potentiel achat")
        strength_indicators.append("RSI extrême")
        score += 3
    elif rsi < 30:
        signals.append("📈 RSI survendu - Potentiel achat")
        score += 2
    elif rsi > 75:
        signals.append("❄️ RSI extrêmement suracheté - Très fort potentiel vente")
        strength_indicators.append("RSI extrême")
        score -= 3
    elif rsi > 70:
        signals.append("📉 RSI suracheté - Potentiel vente")
        score -= 2
    
    # 2. MACD (poids: 1-2)
    if macd > macd_signal and abs(macd - macd_signal) > 0.5:
        signals.append("🚀 MACD croisement haussier fort")
        strength_indicators.append("MACD fort")
        score += 2
    elif macd > macd_signal:
        signals.append("📊 MACD haussier")
        score += 1
    elif macd < macd_signal and abs(macd - macd_signal) > 0.5:
        signals.append("💥 MACD croisement baissier fort")
        strength_indicators.append("MACD fort")
        score -= 2
    elif macd < macd_signal:
        signals.append("📊 MACD baissier")
        score -= 1
    
    # 3. Moving Averages (poids: 1-2)
    if sma50:
        if current_price > sma20 > sma50:
            signals.append("🎯 Tendance haussière (Prix > SMA20 > SMA50)")
            strength_indicators.append("Tendance forte")
            score += 2
        elif current_price < sma20 < sma50:
            signals.append("⚠️ Tendance baissière (Prix < SMA20 < SMA50)")
            strength_indicators.append("Tendance forte")
            score -= 2
        elif current_price > sma20:
            signals.append("📈 Prix au-dessus SMA20")
            score += 1
        else:
            signals.append("📉 Prix en-dessous SMA20")
            score -= 1
    else:
        if current_price > sma20:
            signals.append("📈 Prix au-dessus SMA20")
            score += 1
        else:
            signals.append("📉 Prix en-dessous SMA20")
            score -= 1
    
    # 4. Volume (poids: 1)
    if volume_ratio > 1.5:
        signals.append("💪 Volume très élevé (+50%)")
        strength_indicators.append("Volume fort")
        score += 1
    elif volume_ratio < 0.7:
        signals.append("⚠️ Volume faible (-30%)")
        score -= 0.5
    
    # 5. Momentum (poids: 1-2)
    if price_momentum > 5:
        signals.append("🚀 Momentum très positif (+5%)")
        strength_indicators.append("Momentum fort")
        score += 2
    elif price_momentum > 2:
        signals.append("📈 Momentum positif")
        score += 1
    elif price_momentum < -5:
        signals.append("💥 Momentum très négatif (-5%)")
        strength_indicators.append("Momentum faible")
        score -= 2
    elif price_momentum < -2:
        signals.append("📉 Momentum négatif")
        score -= 1
    
    # 6. Convergence
    if len(strength_indicators) >= 3:
        signals.append(f"✨ {len(strength_indicators)} indicateurs convergents")
        score += 1
    
    score = round(score, 1)
    
    if score >= 5:
        final_signal = "🚀 ACHAT TRÈS FORT"
    elif score >= 3:
        final_signal = "🟢 ACHAT FORT"
    elif score >= 1:
        final_signal = "🟡 ACHAT MODÉRÉ"
    elif score <= -5:
        final_signal = "💥 VENTE TRÈS FORTE"
    elif score <= -3:
        final_signal = "🔴 VENTE FORTE"
    elif score <= -1:
        final_signal = "🟠 VENTE MODÉRÉE"
    else:
        final_signal = "⚪ NEUTRE"
    
    return final_signal, signals, score

# ==================== ANALYSE DES ACTIONS ====================


def ai_complete_analysis(ticker, data, analysis):
    """Analyse IA complète avec opportunités, prix cibles et recommandations"""
    try:
        current_price = analysis['price']
        df = data.tail(100)
        
        # 1. SUPPORT ET RÉSISTANCE (calculs corrects)
        recent_highs = df['High'].tail(20)
        recent_lows = df['Low'].tail(20)
        
        # Résistances au-dessus du prix
        resistance_levels = recent_highs[recent_highs > current_price]
        resistance_1 = resistance_levels.quantile(0.25) if len(resistance_levels) > 0 else current_price * 1.03
        resistance_2 = resistance_levels.max() if len(resistance_levels) > 0 else current_price * 1.05
        
        # Supports en-dessous du prix
        support_levels = recent_lows[recent_lows < current_price]
        support_1 = support_levels.quantile(0.75) if len(support_levels) > 0 else current_price * 0.97
        support_2 = support_levels.min() if len(support_levels) > 0 else current_price * 0.95
        
        # 2. PRIX CIBLES INTELLIGENTS
        score = analysis['score']
        
        if score > 0:  # SIGNAL ACHAT
            # Targets progressifs vers le haut
            tp1 = current_price * 1.03  # +3%
            # Si résistance existe et est au-dessus, l'utiliser, sinon +5%
            if resistance_1 > current_price * 1.04:
                tp2 = resistance_1
            else:
                tp2 = current_price * 1.05
            
            if resistance_2 > current_price * 1.06:
                tp3 = resistance_2
            else:
                tp3 = current_price * 1.08
            
            # Stop loss: support si en-dessous, sinon -3%
            if support_1 < current_price * 0.98:
                sl = support_1
            else:
                sl = current_price * 0.97
            direction = "LONG"
            
        else:  # SIGNAL VENTE
            # Targets progressifs vers le bas
            tp1 = current_price * 0.97  # -3%
            
            # Si support existe et est en-dessous, l'utiliser
            if support_1 < current_price * 0.96:
                tp2 = support_1
            else:
                tp2 = current_price * 0.95
            
            if support_2 < current_price * 0.94:
                tp3 = support_2
            else:
                tp3 = current_price * 0.92
            
            # Stop loss: résistance si au-dessus, sinon +3%
            if resistance_1 > current_price * 1.02:
                sl = resistance_1
            else:
                sl = current_price * 1.03
            direction = "SHORT"
        
        # 3. PATTERNS CHANDELIERS
        patterns = []
        if len(df) >= 2:
            last = df.iloc[-1]
            prev = df.iloc[-2]
            
            body = abs(last['Close'] - last['Open'])
            range_candle = last['High'] - last['Low']
            
            # Doji
            if range_candle > 0 and body < range_candle * 0.1:
                patterns.append("🕯️ Doji - Indécision")
            
            # Hammer (corps petit, longue mèche basse)
            if last['Close'] > last['Open']:  # Bougie verte
                lower_shadow = last['Open'] - last['Low']
                if lower_shadow > body * 2:
                    patterns.append("🔨 Hammer - Signal haussier")
            
            # Engulfing
            if last['Close'] > last['Open'] and prev['Close'] < prev['Open']:
                if last['Open'] <= prev['Close'] and last['Close'] >= prev['Open']:
                    patterns.append("🟢 Engulfing haussier - Fort achat")
            elif last['Close'] < last['Open'] and prev['Close'] > prev['Open']:
                if last['Open'] >= prev['Close'] and last['Close'] <= prev['Open']:
                    patterns.append("🔴 Engulfing baissier - Fort vente")
        
        # 4. PROBABILITÉ DE SUCCÈS
        prob_score = 50
        probability_factors = []
        
        score_abs = abs(score)
        if score_abs >= 5:
            prob_score += 20
            probability_factors.append("Signal très fort")
        elif score_abs >= 3:
            prob_score += 15
            probability_factors.append("Signal fort")
        elif score_abs >= 1:
            prob_score += 5
            probability_factors.append("Signal modéré")
        
        vol_ratio = analysis.get('volume_ratio', 1)
        if vol_ratio > 1.5:
            prob_score += 10
            probability_factors.append("Volume très élevé")
        elif vol_ratio > 1.2:
            prob_score += 5
            probability_factors.append("Volume confirmant")
        
        if len(patterns) > 0:
            prob_score += 5
            probability_factors.append("Pattern favorable")
        
        # RSI extrême
        rsi = analysis.get('rsi', 50)
        if (score > 0 and rsi < 30) or (score < 0 and rsi > 70):
            prob_score += 10
            probability_factors.append("RSI extrême favorable")
        
        prob_score = min(prob_score, 85)
        
        # 5. HORIZON TEMPOREL
        volatility = analysis.get('volatility', 2)
        if volatility > 3:
            horizon = "Court terme (1-5 jours)"
            horizon_reason = "Forte volatilité - Mouvement rapide"
        elif volatility > 1.5:
            horizon = "Moyen terme (1-3 semaines)"
            horizon_reason = "Volatilité modérée - Mouvement progressif"
        else:
            horizon = "Long terme (1-3 mois)"
            horizon_reason = "Faible volatilité - Mouvement lent"
        
        # 6. POINT D'ENTRÉE OPTIMAL
        if score > 0:  # ACHAT
            dist_support = ((current_price - support_1) / support_1) * 100
            if dist_support < 1:
                entry_point = "🎯 EXCELLENT - Sur le support"
                entry_price = current_price
            elif dist_support < 3:
                entry_point = "✅ BON - Proche du support"
                entry_price = support_1 * 1.01
            else:
                entry_point = "⚠️ ATTENDRE - Trop loin du support"
                entry_price = support_1 * 1.02
        else:  # VENTE
            dist_resistance = ((resistance_1 - current_price) / current_price) * 100
            if dist_resistance < 1:
                entry_point = "🎯 EXCELLENT - Sur la résistance"
                entry_price = current_price
            elif dist_resistance < 3:
                entry_point = "✅ BON - Proche de la résistance"
                entry_price = resistance_1 * 0.99
            else:
                entry_point = "⚠️ ATTENDRE - Trop loin de la résistance"
                entry_price = resistance_1 * 0.98
        
        # 7. RATIO RISQUE/RÉCOMPENSE
        potential_gain = abs(tp2 - current_price)
        potential_loss = abs(current_price - sl)
        risk_reward = potential_gain / potential_loss if potential_loss > 0 else 0
        
        if risk_reward > 2.5:
            rr_assessment = "Excellent"
        elif risk_reward > 2:
            rr_assessment = "Très bon"
        elif risk_reward > 1.5:
            rr_assessment = "Bon"
        elif risk_reward > 1:
            rr_assessment = "Acceptable"
        else:
            rr_assessment = "Défavorable"
        
        return {
            'support_1': support_1,
            'support_2': support_2,
            'resistance_1': resistance_1,
            'resistance_2': resistance_2,
            'tp1': tp1,
            'tp2': tp2,
            'tp3': tp3,
            'stop_loss': sl,
            'direction': direction,
            'patterns': patterns,
            'probability': prob_score,
            'probability_factors': probability_factors,
            'horizon': horizon,
            'horizon_reason': horizon_reason,
            'entry_point': entry_point,
            'entry_price': entry_price,
            'risk_reward': risk_reward,
            'rr_assessment': rr_assessment
        }
    except Exception as e:
        print(f"Erreur analyse IA: {e}")
        import traceback
        traceback.print_exc()
        return None


def ai_complete_analysis(ticker, data, analysis):
    """Analyse IA complète avec opportunités, prix cibles et recommandations"""
    try:
        current_price = analysis['price']
        df = data.tail(100)
        
        # 1. SUPPORT ET RÉSISTANCE (calculs corrects)
        recent_highs = df['High'].tail(20)
        recent_lows = df['Low'].tail(20)
        
        # Résistances au-dessus du prix
        resistance_levels = recent_highs[recent_highs > current_price]
        resistance_1 = resistance_levels.quantile(0.25) if len(resistance_levels) > 0 else current_price * 1.03
        resistance_2 = resistance_levels.max() if len(resistance_levels) > 0 else current_price * 1.05
        
        # Supports en-dessous du prix
        support_levels = recent_lows[recent_lows < current_price]
        support_1 = support_levels.quantile(0.75) if len(support_levels) > 0 else current_price * 0.97
        support_2 = support_levels.min() if len(support_levels) > 0 else current_price * 0.95
        
        # 2. PRIX CIBLES INTELLIGENTS
        score = analysis['score']
        
        if score > 0:  # SIGNAL ACHAT
            # Targets progressifs vers le haut
            tp1 = current_price * 1.03  # +3%
            # Si résistance existe et est au-dessus, l'utiliser, sinon +5%
            if resistance_1 > current_price * 1.04:
                tp2 = resistance_1
            else:
                tp2 = current_price * 1.05
            
            if resistance_2 > current_price * 1.06:
                tp3 = resistance_2
            else:
                tp3 = current_price * 1.08
            
            # Stop loss: support si en-dessous, sinon -3%
            if support_1 < current_price * 0.98:
                sl = support_1
            else:
                sl = current_price * 0.97
            direction = "LONG"
            
        else:  # SIGNAL VENTE
            # Targets progressifs vers le bas
            tp1 = current_price * 0.97  # -3%
            
            # Si support existe et est en-dessous, l'utiliser
            if support_1 < current_price * 0.96:
                tp2 = support_1
            else:
                tp2 = current_price * 0.95
            
            if support_2 < current_price * 0.94:
                tp3 = support_2
            else:
                tp3 = current_price * 0.92
            
            # Stop loss: résistance si au-dessus, sinon +3%
            if resistance_1 > current_price * 1.02:
                sl = resistance_1
            else:
                sl = current_price * 1.03
            direction = "SHORT"
        
        # 3. PATTERNS CHANDELIERS
        patterns = []
        if len(df) >= 2:
            last = df.iloc[-1]
            prev = df.iloc[-2]
            
            body = abs(last['Close'] - last['Open'])
            range_candle = last['High'] - last['Low']
            
            # Doji
            if range_candle > 0 and body < range_candle * 0.1:
                patterns.append("🕯️ Doji - Indécision")
            
            # Hammer (corps petit, longue mèche basse)
            if last['Close'] > last['Open']:  # Bougie verte
                lower_shadow = last['Open'] - last['Low']
                if lower_shadow > body * 2:
                    patterns.append("🔨 Hammer - Signal haussier")
            
            # Engulfing
            if last['Close'] > last['Open'] and prev['Close'] < prev['Open']:
                if last['Open'] <= prev['Close'] and last['Close'] >= prev['Open']:
                    patterns.append("🟢 Engulfing haussier - Fort achat")
            elif last['Close'] < last['Open'] and prev['Close'] > prev['Open']:
                if last['Open'] >= prev['Close'] and last['Close'] <= prev['Open']:
                    patterns.append("🔴 Engulfing baissier - Fort vente")
        
        # 4. PROBABILITÉ DE SUCCÈS
        prob_score = 50
        probability_factors = []
        
        score_abs = abs(score)
        if score_abs >= 5:
            prob_score += 20
            probability_factors.append("Signal très fort")
        elif score_abs >= 3:
            prob_score += 15
            probability_factors.append("Signal fort")
        elif score_abs >= 1:
            prob_score += 5
            probability_factors.append("Signal modéré")
        
        vol_ratio = analysis.get('volume_ratio', 1)
        if vol_ratio > 1.5:
            prob_score += 10
            probability_factors.append("Volume très élevé")
        elif vol_ratio > 1.2:
            prob_score += 5
            probability_factors.append("Volume confirmant")
        
        if len(patterns) > 0:
            prob_score += 5
            probability_factors.append("Pattern favorable")
        
        # RSI extrême
        rsi = analysis.get('rsi', 50)
        if (score > 0 and rsi < 30) or (score < 0 and rsi > 70):
            prob_score += 10
            probability_factors.append("RSI extrême favorable")
        
        prob_score = min(prob_score, 85)
        
        # 5. HORIZON TEMPOREL
        volatility = analysis.get('volatility', 2)
        if volatility > 3:
            horizon = "Court terme (1-5 jours)"
            horizon_reason = "Forte volatilité - Mouvement rapide"
        elif volatility > 1.5:
            horizon = "Moyen terme (1-3 semaines)"
            horizon_reason = "Volatilité modérée - Mouvement progressif"
        else:
            horizon = "Long terme (1-3 mois)"
            horizon_reason = "Faible volatilité - Mouvement lent"
        
        # 6. POINT D'ENTRÉE OPTIMAL
        if score > 0:  # ACHAT
            dist_support = ((current_price - support_1) / support_1) * 100
            if dist_support < 1:
                entry_point = "🎯 EXCELLENT - Sur le support"
                entry_price = current_price
            elif dist_support < 3:
                entry_point = "✅ BON - Proche du support"
                entry_price = support_1 * 1.01
            else:
                entry_point = "⚠️ ATTENDRE - Trop loin du support"
                entry_price = support_1 * 1.02
        else:  # VENTE
            dist_resistance = ((resistance_1 - current_price) / current_price) * 100
            if dist_resistance < 1:
                entry_point = "🎯 EXCELLENT - Sur la résistance"
                entry_price = current_price
            elif dist_resistance < 3:
                entry_point = "✅ BON - Proche de la résistance"
                entry_price = resistance_1 * 0.99
            else:
                entry_point = "⚠️ ATTENDRE - Trop loin de la résistance"
                entry_price = resistance_1 * 0.98
        
        # 7. RATIO RISQUE/RÉCOMPENSE
        potential_gain = abs(tp2 - current_price)
        potential_loss = abs(current_price - sl)
        risk_reward = potential_gain / potential_loss if potential_loss > 0 else 0
        
        if risk_reward > 2.5:
            rr_assessment = "Excellent"
        elif risk_reward > 2:
            rr_assessment = "Très bon"
        elif risk_reward > 1.5:
            rr_assessment = "Bon"
        elif risk_reward > 1:
            rr_assessment = "Acceptable"
        else:
            rr_assessment = "Défavorable"
        
        return {
            'support_1': support_1,
            'support_2': support_2,
            'resistance_1': resistance_1,
            'resistance_2': resistance_2,
            'tp1': tp1,
            'tp2': tp2,
            'tp3': tp3,
            'stop_loss': sl,
            'direction': direction,
            'patterns': patterns,
            'probability': prob_score,
            'probability_factors': probability_factors,
            'horizon': horizon,
            'horizon_reason': horizon_reason,
            'entry_point': entry_point,
            'entry_price': entry_price,
            'risk_reward': risk_reward,
            'rr_assessment': rr_assessment
        }
    except Exception as e:
        print(f"Erreur analyse IA: {e}")
        import traceback
        traceback.print_exc()
        return None



def create_trading_chart(ticker, analysis, period="3mo", interval="1d"):
    """Génère un graphique de trading simple"""
    try:
        import yfinance as yf
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from datetime import datetime
        import os
        
        # Récupérer les données
        stock = yf.Ticker(ticker)
        data = stock.history(period=period, interval=interval)
        
        if len(data) < 10:
            return None
        
        # Créer le graphique
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), 
                                        gridspec_kw={'height_ratios': [3, 1]})
        
        # Prix et moyennes mobiles
        ax1.plot(data.index, data['Close'], label='Prix', linewidth=2, color='#2962FF')
        
        if 'sma20' in analysis:
            sma20 = data['Close'].rolling(window=20).mean()
            ax1.plot(data.index, sma20, label='SMA20', alpha=0.7, linestyle='--', color='orange')
        
        if 'sma50' in analysis:
            sma50 = data['Close'].rolling(window=50).mean()
            ax1.plot(data.index, sma50, label='SMA50', alpha=0.7, linestyle='--', color='red')
        
        # Niveaux AI si disponibles
        if 'ai_analysis' in analysis and analysis['ai_analysis']:
            ai = analysis['ai_analysis']
            current_price = analysis['price']
            
            # Support/Résistance
            ax1.axhline(y=ai['resistance_1'], color='red', linestyle=':', alpha=0.5, label='R1')
            ax1.axhline(y=ai['support_1'], color='green', linestyle=':', alpha=0.5, label='S1')
            
            # Prix actuel
            ax1.axhline(y=current_price, color='black', linestyle='-', linewidth=1.5, label='Prix actuel')
        
        ax1.set_title(f'{ticker} - {analysis.get("name", ticker)}', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Prix (EUR)', fontsize=12)
        ax1.legend(loc='upper left')
        ax1.grid(True, alpha=0.3)
        
        # Volume
        colors = ['green' if data['Close'].iloc[i] > data['Open'].iloc[i] else 'red' 
                  for i in range(len(data))]
        ax2.bar(data.index, data['Volume'], color=colors, alpha=0.5)
        ax2.set_ylabel('Volume', fontsize=12)
        ax2.set_xlabel('Date', fontsize=12)
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Sauvegarder (compatible Windows)
        import tempfile
        temp_dir = tempfile.gettempdir()
        filename = os.path.join(temp_dir, f"chart_{ticker}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png")
        print(f"[CHART] Sauvegarde dans: {filename}")
        plt.savefig(filename, dpi=100, bbox_inches='tight')
        plt.close()
        print(f"[CHART] Fichier créé: {os.path.exists(filename)}")
        
        return filename
        
    except Exception as e:
        print(f"[CHART] Erreur création graphique: {e}")
        import traceback
        traceback.print_exc()
        return None




def get_stock_news_advanced(ticker, limit=8):
    """Récupère les actualités depuis multiples sources avec analyse de sentiment"""
    try:
        import yfinance as yf
        from datetime import datetime, timedelta
        import requests
        from bs4 import BeautifulSoup
        import re
        
        all_news = []
        
        # ============ SOURCE 1: Yahoo Finance ============
        try:
            print(f"[NEWS] Recherche Yahoo Finance pour {ticker}")
            stock = yf.Ticker(ticker)
            news = stock.news
            
            if news:
                for article in news[:6]:
                    # Vérifier que c'est bien structuré
                    title = article.get('title', '')
                    if not title or title == 'Sans titre':
                        continue
                    
                    # Date valide
                    published = article.get('providerPublishTime', 0)
                    if published < 1000000000:  # Timestamp invalide (avant 2001)
                        published = int(datetime.now().timestamp())
                    
                    # Résumé
                    summary = article.get('summary', '')
                    if not summary:
                        # Essayer de récupérer depuis le contenu
                        summary = article.get('content', '')
                    
                    # Limiter le résumé
                    if len(summary) > 200:
                        summary = summary[:200] + "..."
                    
                    all_news.append({
                        'title': title,
                        'publisher': article.get('publisher', 'Yahoo Finance'),
                        'link': article.get('link', ''),
                        'published': published,
                        'summary': summary,
                        'source': 'Yahoo Finance'
                    })
                    
                print(f"[NEWS] Yahoo Finance: {len([n for n in all_news if n['source'] == 'Yahoo Finance'])} articles")
        except Exception as e:
            print(f"[NEWS] Erreur Yahoo Finance: {e}")
        
        # ============ SOURCE 2: Finviz News ============
        try:
            print(f"[NEWS] Recherche Finviz pour {ticker}")
            url = f"https://finviz.com/quote.ashx?t={ticker}"
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                news_table = soup.find('table', {'id': 'news-table'})
                
                if news_table:
                    rows = news_table.find_all('tr')[:8]
                    
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 2:
                            # Date/heure
                            date_cell = cells[0].text.strip()
                            
                            # Titre et lien
                            link_tag = cells[1].find('a')
                            if link_tag:
                                title = link_tag.text.strip()
                                link = link_tag.get('href', '')
                                publisher = cells[1].find('span').text.strip() if cells[1].find('span') else 'Finviz'
                                
                                # Parser la date
                                try:
                                    if 'Today' in date_cell or ':' in date_cell:
                                        published = int(datetime.now().timestamp())
                                    else:
                                        # Format type "Jan-06-25"
                                        date_parts = date_cell.split()
                                        if len(date_parts) > 0:
                                            date_str = date_parts[0]
                                            pub_date = datetime.strptime(date_str, "%b-%d-%y")
                                            published = int(pub_date.timestamp())
                                        else:
                                            published = int(datetime.now().timestamp())
                                except:
                                    published = int(datetime.now().timestamp())
                                
                                all_news.append({
                                    'title': title,
                                    'publisher': publisher,
                                    'link': link,
                                    'published': published,
                                    'summary': '',
                                    'source': 'Finviz'
                                })
                    
                    print(f"[NEWS] Finviz: {len([n for n in all_news if n['source'] == 'Finviz'])} articles")
        except Exception as e:
            print(f"[NEWS] Erreur Finviz: {e}")
        
        # ============ Trier et limiter ============
        all_news.sort(key=lambda x: x['published'], reverse=True)
        all_news = all_news[:limit]
        
        # ============ Analyse de sentiment ============
        for article in all_news:
            sentiment = analyze_sentiment(article['title'], article['summary'])
            article['sentiment'] = sentiment
        
        print(f"[NEWS] Total: {len(all_news)} articles uniques")
        return all_news
        
    except Exception as e:
        print(f"[NEWS] Erreur globale: {e}")
        import traceback
        traceback.print_exc()
        return []


def analyze_sentiment(title, summary):
    """Analyse le sentiment d'une news (Positif/Négatif/Neutre)"""
    try:
        text = (title + " " + summary).lower()
        
        # Mots positifs
        positive_words = [
            'gain', 'surge', 'rally', 'bullish', 'growth', 'profit', 'upgrade', 
            'beat', 'success', 'strong', 'rise', 'soar', 'record', 'high',
            'outperform', 'boost', 'positive', 'excellent', 'impressive',
            'hausse', 'progression', 'bénéfice', 'croissance', 'succès'
        ]
        
        # Mots négatifs
        negative_words = [
            'loss', 'fall', 'drop', 'decline', 'bearish', 'downgrade', 'miss',
            'weak', 'concern', 'warning', 'cut', 'plunge', 'crash', 'risk',
            'underperform', 'negative', 'poor', 'disappointing', 'worst',
            'baisse', 'chute', 'perte', 'recul', 'inquiétude'
        ]
        
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        if positive_count > negative_count:
            return {'label': 'Positif', 'emoji': '🟢', 'score': positive_count}
        elif negative_count > positive_count:
            return {'label': 'Négatif', 'emoji': '🔴', 'score': negative_count}
        else:
            return {'label': 'Neutre', 'emoji': '⚪', 'score': 0}
            
    except:
        return {'label': 'Neutre', 'emoji': '⚪', 'score': 0}


def get_stock_news_OLD(ticker, limit=5):
    """Récupère les actualités d'une action depuis plusieurs sources"""
    try:
        import yfinance as yf
        from datetime import datetime, timedelta
        
        stock = yf.Ticker(ticker)
        news_items = []
        
        # 1. Yahoo Finance News (API intégrée)
        try:
            news = stock.news
            if news:
                for article in news[:limit]:
                    news_items.append({
                        'title': article.get('title', 'Sans titre'),
                        'publisher': article.get('publisher', 'Yahoo Finance'),
                        'link': article.get('link', ''),
                        'published': article.get('providerPublishTime', 0),
                        'summary': article.get('summary', '')[:200] if article.get('summary') else ''
                    })
        except Exception as e:
            print(f"[NEWS] Erreur Yahoo Finance: {e}")
        
        # 2. Si pas assez de news, ajouter des infos génériques
        if len(news_items) < 3:
            info = stock.info
            company_name = info.get('longName', ticker)
            
            # Ajouter des infos de l'entreprise comme "news"
            if info.get('sector'):
                news_items.append({
                    'title': f"{company_name} - Secteur {info.get('sector')}",
                    'publisher': 'Yahoo Finance',
                    'link': f"https://finance.yahoo.com/quote/{ticker}",
                    'published': int(datetime.now().timestamp()),
                    'summary': f"Industrie: {info.get('industry', 'N/A')}"
                })
            
            if info.get('marketCap'):
                market_cap = info.get('marketCap', 0) / 1e9
                news_items.append({
                    'title': f"Capitalisation boursière: {market_cap:.2f}B USD",
                    'publisher': 'Yahoo Finance',
                    'link': f"https://finance.yahoo.com/quote/{ticker}",
                    'published': int(datetime.now().timestamp()),
                    'summary': f"Employés: {info.get('fullTimeEmployees', 'N/A'):,}" if info.get('fullTimeEmployees') else ''
                })
        
        # Trier par date (plus récent en premier)
        news_items.sort(key=lambda x: x['published'], reverse=True)
        
        return news_items[:limit]
        
    except Exception as e:
        print(f"[NEWS] Erreur globale: {e}")
        import traceback
        traceback.print_exc()
        return []


def analyze_stock(ticker, period="3mo", interval="1d"):
    """Analyse complète d'une action"""
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period=period, interval=interval)
        
        if len(data) < 50:
            return None
        
        # Calcul des indicateurs
        rsi = calculate_rsi(data, RSI_PERIOD).iloc[-1]
        macd, macd_signal_line, macd_hist = calculate_macd(data, MACD_FAST, MACD_SLOW, MACD_SIGNAL)
        sma20 = calculate_sma(data, SMA_SHORT).iloc[-1]
        sma50 = calculate_sma(data, SMA_LONG).iloc[-1]
        
        current_price = data['Close'].iloc[-1]
        prev_close = data['Close'].iloc[-2]
        variation = ((current_price - prev_close) / prev_close) * 100
        
        trend = detect_trend(data)
        # Calculs avancés
        avg_volume = data['Volume'].tail(20).mean()
        volume_ratio = data['Volume'].iloc[-1] / avg_volume if avg_volume > 0 else 1.0
        price_5d_ago = data['Close'].iloc[-6] if len(data) >= 6 else data['Close'].iloc[0]
        price_momentum = ((current_price - price_5d_ago) / price_5d_ago) * 100
        volatility = data['Close'].tail(20).pct_change().std() * 100
        
        signal, signal_details, score = generate_signal(
            rsi, macd.iloc[-1], macd_signal_line.iloc[-1], 
            trend, current_price, sma20, sma50, volume_ratio, price_momentum
        )
        
        # Informations supplémentaires
        info = stock.info
        company_name = info.get('longName', ticker)
        
        result = {
            'ticker': ticker,
            'name': company_name,
            'price': current_price,
            'variation': variation,
            'rsi': rsi,
            'macd': macd.iloc[-1],
            'macd_signal': macd_signal_line.iloc[-1],
            'macd_hist': macd_hist.iloc[-1],
            'sma20': sma20,
            'sma50': sma50,
            'trend': trend,
            'signal': signal,
            'signal_details': signal_details,
            'score': score,
            'volume': data['Volume'].iloc[-1],
            'volume_ratio': volume_ratio,
            'price_momentum': price_momentum,
            'volatility': volatility
        }
        
        # Analyse IA complète
        try:
            ai_analysis = ai_complete_analysis(ticker, data, result)
            if ai_analysis:
                result['ai_analysis'] = ai_analysis
                print(f"[AI] Analyse IA ajoutée pour {ticker}")
            else:
                print(f"[AI] ⚠️ Analyse IA retourne None pour {ticker}")
        except Exception as e:
            print(f"[AI] ❌ Erreur analyse IA pour {ticker}: {e}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        # Logger les erreurs importantes sur le canal
        if "delisted" in error_msg.lower():
            print(f"⚠️ {ticker}: Action possiblement délistée")
        elif "no data found" in error_msg.lower():
            print(f"⚠️ {ticker}: Aucune donnée disponible")
        else:
            print(f"Erreur lors de l'analyse de {ticker}: {error_msg}")
        return None

def scan_market(watchlist_dict, min_score=2, log_progress=False):
    """Scanne tous les marchés et retourne les meilleures opportunités"""
    all_results = []
    total_tickers = sum(len(tickers) for tickers in watchlist_dict.values())
    scanned = 0
    errors = []
    
    for market, tickers in watchlist_dict.items():
        market_display = {
            "CAC40": "🇫🇷 CAC 40",
            "DAX": "🇩🇪 DAX",
            "US_TECH": "🇺🇸 Tech US",
            "US_BLUE_CHIPS": "🇺🇸 Blue Chips US"
        }.get(market, market)
        
        print(f"Scan du marché: {market}...")
        
        if log_progress:
            # Envoyer un log asynchrone
            asyncio.create_task(log_to_channel(f"Démarrage scan {market_display} ({len(tickers)} actions)", "🔍"))
        
        market_results = 0
        for ticker in tickers:
            result = analyze_stock(ticker)
            if result and abs(result['score']) >= min_score:
                result['market'] = market
                all_results.append(result)
                market_results += 1
            elif result is None:
                errors.append(ticker)
            
            scanned += 1
            time.sleep(0.5)  # Limite pour ne pas surcharger l'API
        
        if log_progress:
            asyncio.create_task(log_to_channel(
                f"✅ {market_display} terminé : {market_results} opportunité(s) trouvée(s)",
                "📊"
            ))
    
    # Log final
    if log_progress and errors:
        error_summary = f"⚠️ {len(errors)} action(s) ignorée(s) (données manquantes)"
        asyncio.create_task(log_to_channel(error_summary, "⚠️"))
    
    # Trier par score absolu (opportunités les plus fortes)
    all_results.sort(key=lambda x: abs(x['score']), reverse=True)
    return all_results

# ==================== FORMATAGE MESSAGES TELEGRAM ====================

def format_stock_message(analysis):
    """Formate un message détaillé et expliqué pour une action"""
    market_status = get_market_status(analysis['ticker'])
    
    # Interprétations RSI
    if analysis['rsi'] < 30:
        rsi_interpretation = "Zone de survente - L'actif pourrait être sous-évalué"
    elif analysis['rsi'] > 70:
        rsi_interpretation = "Zone de surachat - L'actif pourrait être surévalué"
    elif 45 <= analysis['rsi'] <= 55:
        rsi_interpretation = "Zone neutre - Équilibre entre acheteurs et vendeurs"
    else:
        rsi_interpretation = "Zone normale"
    
    # Interprétation MACD
    macd_trend = "haussier ↗️" if analysis['macd'] > analysis['macd_signal'] else "baissier ↘️"
    macd_strength = "fort" if abs(analysis['macd'] - analysis['macd_signal']) > 0.5 else "modéré"
    
    # Interprétation Volume
    vol_status = analysis.get('volume_ratio', 1.0)
    if vol_status > 1.5:
        vol_interpretation = "Très élevé (+50%) - Forte activité"
    elif vol_status > 1.2:
        vol_interpretation = "Élevé (+20%) - Activité soutenue"
    elif vol_status < 0.7:
        vol_interpretation = "Faible (-30%) - Activité réduite"
    else:
        vol_interpretation = "Normal"
    
    # Momentum
    momentum = analysis.get('price_momentum', 0)
    if momentum > 5:
        momentum_text = f"Très positif (+{momentum:.1f}%) - Fort élan haussier"
    elif momentum > 2:
        momentum_text = f"Positif (+{momentum:.1f}%)"
    elif momentum < -5:
        momentum_text = f"Très négatif ({momentum:.1f}%) - Fort élan baissier"
    elif momentum < -2:
        momentum_text = f"Négatif ({momentum:.1f}%)"
    else:
        momentum_text = f"Neutre ({momentum:.1f}%)"
    
    # Volatilité
    volatility = analysis.get('volatility', 0)
    if volatility > 3:
        vol_risk = "Élevée (>3%) - Risque important"
    elif volatility > 1.5:
        vol_risk = "Modérée (1.5-3%) - Risque moyen"
    else:
        vol_risk = "Faible (<1.5%) - Risque limité"
    
    msg = f"""
╔════════════════════════════════╗
║  {market_status['emoji']} {analysis['name'][:25]}
║  {analysis['ticker']}
╚════════════════════════════════╝

{market_status['message']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **COTATION**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Prix actuel: **{analysis['price']:.2f} EUR**
{'📈' if analysis['variation'] > 0 else '📉'} Variation: **{analysis['variation']:+.2f}%**

📊 Volume: {analysis['volume']:,.0f}
   └─ {vol_interpretation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 **INDICATEURS TECHNIQUES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 **RSI (14 jours): {analysis['rsi']:.1f}**
   └─ {rsi_interpretation}

🌊 **MACD: {macd_trend} ({macd_strength})**
   • MACD: {analysis['macd']:.4f}
   • Signal: {analysis['macd_signal']:.4f}
   • Divergence: {abs(analysis['macd'] - analysis['macd_signal']):.4f}

📊 **Moyennes Mobiles**
   • SMA(20): {analysis['sma20']:.2f} EUR
   • SMA(50): {analysis['sma50']:.2f} EUR
   • Position: {"Au-dessus" if analysis['price'] > analysis['sma20'] else "En-dessous"} de la SMA20

🚀 **Momentum (5 jours): {momentum_text}**

⚡ **Volatilité (20 jours): {volatility:.2f}%**
   └─ {vol_risk}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **SIGNAL & ANALYSE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{analysis['signal']}**
Score: **{analysis['score']}** / 10

**💡 Raisons du signal:**
{chr(10).join(['   • ' + detail for detail in analysis['signal_details']])}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 **RÉSUMÉ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tendance: **{analysis['trend']}**
Conviction: **{"Très forte" if abs(analysis['score']) >= 5 else "Forte" if abs(analysis['score']) >= 3 else "Modérée"}**

"""
    
    # ANALYSE IA COMPLÈTE
    if 'ai_analysis' in analysis and analysis['ai_analysis']:
        ai = analysis['ai_analysis']
        
        msg += "\n\n"
        msg += "╔═══════════════════════════════╗\n"
        msg += "║  🤖 ANALYSE IA COMPLÈTE      ║\n"
        msg += "╚═══════════════════════════════╝\n"
        msg += "\n"
        
        # === SECTION 1: NIVEAUX CLÉS ===
        msg += "┌─────────────────────────────────┐\n"
        msg += "│  📊 NIVEAUX DE PRIX CLÉS       │\n"
        msg += "└─────────────────────────────────┘\n"
        msg += "\n"
        msg += f"  🔴 R2: {ai['resistance_2']:.2f} EUR\n"
        msg += f"  🔴 R1: {ai['resistance_1']:.2f} EUR\n"
        msg += "  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n"
        msg += f"  💰 PRIX: {analysis['price']:.2f} EUR\n"
        msg += "  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n"
        msg += f"  🟢 S1: {ai['support_1']:.2f} EUR\n"
        msg += f"  🟢 S2: {ai['support_2']:.2f} EUR\n"
        msg += "\n"
        
        # === SECTION 2: STRATÉGIE DE TRADING ===
        direction = "📈 LONG" if analysis['score'] > 0 else "📉 SHORT"
        msg += "┌─────────────────────────────────┐\n"
        msg += f"│  🎯 STRATÉGIE {direction}        │\n"
        msg += "└─────────────────────────────────┘\n"
        msg += "\n"
        
        tp1_pct = ((ai['tp1'] - analysis['price']) / analysis['price'] * 100)
        tp2_pct = ((ai['tp2'] - analysis['price']) / analysis['price'] * 100)
        tp3_pct = ((ai['tp3'] - analysis['price']) / analysis['price'] * 100)
        sl_pct = ((ai['stop_loss'] - analysis['price']) / analysis['price'] * 100)
        
        msg += "  📍 OBJECTIFS:\n"
        msg += f"     TP1: {ai['tp1']:.2f} EUR ({tp1_pct:+.1f}%)\n"
        msg += f"     TP2: {ai['tp2']:.2f} EUR ({tp2_pct:+.1f}%)\n"
        msg += f"     TP3: {ai['tp3']:.2f} EUR ({tp3_pct:+.1f}%)\n"
        msg += "\n"
        msg += f"  🛡️ STOP LOSS: {ai['stop_loss']:.2f} EUR ({sl_pct:+.1f}%)\n"
        msg += "\n"
        msg += f"  ⚖️ RATIO R/R: {ai['risk_reward']:.2f} ({ai['rr_assessment']})\n"
        msg += "\n"
        
        # === SECTION 3: ANALYSE DE PROBABILITÉ ===
        msg += "┌─────────────────────────────────┐\n"
        msg += "│  🎲 PROBABILITÉ DE SUCCÈS       │\n"
        msg += "└─────────────────────────────────┘\n"
        msg += "\n"
        msg += f"  📊 {ai['probability']}%\n"
        msg += "\n"
        
        if ai['probability_factors']:
            msg += "  💡 Facteurs:\n"
            for factor in ai['probability_factors']:
                msg += f"     • {factor}\n"
            msg += "\n"
        
        # === SECTION 4: RECOMMANDATIONS ===
        msg += "┌─────────────────────────────────┐\n"
        msg += "│  💼 RECOMMANDATIONS             │\n"
        msg += "└─────────────────────────────────┘\n"
        msg += "\n"
        msg += f"  🕐 Horizon: {ai['horizon']}\n"
        msg += f"     {ai['horizon_reason']}\n"
        msg += "\n"
        msg += f"  🎯 Point d'entrée: {ai['entry_point']}\n"
        msg += f"     Prix optimal: {ai['entry_price']:.2f} EUR\n"
        
        if ai['patterns']:
            msg += "\n"
            msg += "  📊 Patterns détectés:\n"
            for pattern in ai['patterns']:
                msg += f"     {pattern}\n"
        
        msg += "\n"
        msg += "═══════════════════════════════════\n"
    
    return msg

def format_summary_message(results, top_n=10):
    """Formate un résumé des meilleures opportunités avec tickers cliquables"""
    # Vérifier si au moins un marché est fermé
    markets_status = {}
    if results:
        for result in results[:3]:  # Vérifier les 3 premiers
            status = get_market_status(result['ticker'])
            market = status['market_name']
            if market not in markets_status:
                markets_status[market] = status
    
    msg = f"""
╔══════════════════════════════════╗
║  🔍 SCAN DU MARCHÉ              ║
║  📅 {datetime.now().strftime('%d/%m/%Y %H:%M')}                    ║
╚══════════════════════════════════╝

"""
    
    # Afficher le statut des marchés
    if markets_status:
        msg += "*STATUT DES MARCHÉS*\n"
        for market_name, status in markets_status.items():
            msg += f"{status['emoji']} {market_name}: {'OUVERT' if status['is_open'] else 'FERMÉ'}\n"
        msg += "\n"
    
    msg += f"\n🎯 **TOP {top_n} OPPORTUNITÉS**\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for i, result in enumerate(results[:top_n], 1):
        ticker = result['ticker']
        name = result['name'][:25]
        signal = result['signal']
        score = result['score']
        price = result['price']
        var = result['variation']
        rsi = result['rsi']
        
        # Emoji selon le signal
        if "ACHAT FORT" in signal:
            emoji = "🚀"
        elif "ACHAT" in signal:
            emoji = "🟢"
        elif "VENTE FORT" in signal:
            emoji = "💥"
        elif "VENTE" in signal:
            emoji = "🔴"
        else:
            emoji = "⚪"
        
        # Emoji variation
        var_emoji = "📈" if var > 0 else "📉" if var < 0 else "➡️"
        
        # Format carte élégante
        msg += f"{emoji} **{ticker}** — {name}\n"
        msg += f"├ Signal: {signal} ({score:+.1f})\n"
        msg += f"├ Prix: {price:.2f}€ {var_emoji} {var:+.1f}%\n"
        msg += f"└ RSI: {rsi:.0f} | [Analyser /{ticker.lower().replace('.', '')}]\n\n"
    
    msg += f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 {len(results)} actions analysées"
    msg += "\n\n💡 Tapez la commande pour analyser en détail\n    Exemple: /cspa pour CS.PA"
    return msg

# ==================== FONCTIONS UTILITAIRES ====================

def get_user_name(update: Update):
    """Récupère le nom de l'utilisateur"""
    user = update.effective_user
    if user.first_name:
        return user.first_name
    elif user.username:
        return user.username
    else:
        return "ami trader"

async def send_private_message(update: Update, message: str):
    """Envoie un message privé à l'utilisateur"""
    await update.message.reply_text(message, parse_mode='Markdown')

async def send_channel_message(message: str, token: str, channel_id: str):
    """Envoie un message sur le canal public"""
    bot = Bot(token=token)
    try:
        await bot.send_message(
            chat_id=channel_id,
            text=message,
            parse_mode='Markdown'
        )
        print(f"✅ Message envoyé sur le canal {channel_id}")
        return True
    except Exception as e:
        print(f"❌ Erreur envoi canal: {e}")
        print(traceback.format_exc())
        return False

async def log_to_channel(message: str, emoji: str = "ℹ️"):
    """Envoie un log en temps réel sur le canal"""
    if not ENABLE_LIVE_LOGS:
        return
    
    timestamp = datetime.now().strftime('%H:%M:%S')
    formatted_message = f"{emoji} `{timestamp}` {message}"
    
    try:
        bot = Bot(token=TELEGRAM_TOKEN)
        await bot.send_message(
            chat_id=CHANNEL_ID,
            text=formatted_message,
            parse_mode='Markdown'
        )
    except Exception as e:
        print(f"Erreur log canal: {e}")

async def send_channel_menu(token: str, channel_id: str):
    """Envoie un menu interactif sur le canal"""
    bot = Bot(token=token)
    
    keyboard = [
        [
            InlineKeyboardButton("🔍 Scan CAC40", callback_data="scan_cac40"),
            InlineKeyboardButton("🇩🇪 Scan DAX", callback_data="scan_dax")
        ],
        [
            InlineKeyboardButton("🇺🇸 Scan US", callback_data="scan_us"),
            InlineKeyboardButton("⭐ Top 5", callback_data="top_opportunities")
        ],
        [
            InlineKeyboardButton("📊 Analyser une action", callback_data="analyze_custom"),
            InlineKeyboardButton("⚙️ Paramètres", callback_data="open_settings")
        ]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = """
🤖 *Bot Trading - Menu Interactif*

Clique sur un bouton ci-dessous pour recevoir une analyse en privé !

⚙️ *Nouveau :* Accède au panneau de contrôle complet

📢 Tu dois d'abord démarrer une conversation avec le bot : @CaptenQwarkbot
"""
    
    try:
        result = await bot.send_message(
            chat_id=channel_id,
            text=message,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
        print(f"✅ Menu publié sur le canal {channel_id}")
        print(f"Message ID: {result.message_id}")
        return True
    except Exception as e:
        print(f"❌ Erreur envoi menu canal: {e}")
        print(f"Channel ID utilisé: {channel_id}")
        print(traceback.format_exc())
        return False

# ==================== BOT TELEGRAM - COMMANDES ====================

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /start - Message de bienvenue avec menu"""
    user_name = get_user_name(update)
    user_id = update.effective_user.id
    
    # Ajouter l'utilisateur
    get_or_create_user(user_id)
    
    # Boutons du menu principal
    keyboard = [
        [
            InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet"),
            InlineKeyboardButton("📊 Analyser", callback_data="menu_analyze")
        ],
        [
            InlineKeyboardButton("📈 Scanner", callback_data="menu_scan"),
            InlineKeyboardButton("📰 News", callback_data="menu_news")
        ],
        [
            InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings"),
            InlineKeyboardButton("ℹ️ Aide", callback_data="menu_help")
        ]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    welcome_message = f"""
👋 *Bienvenue {user_name} !*

🤖 *Bot de Trading Ultra-Avancé*

━━━━━━━━━━━━━━━━━━━━
✨ *NOUVEAUTÉS*
━━━━━━━━━━━━━━━━━━━━

💼 *Wallet Moderne*
→ Interface à boutons
→ Performance en temps réel
→ Positions détaillées

📊 *Analyse Contextuelle*
→ Phase du marché
→ Actualités macro
→ Projection intelligente

🎯 *Trading Guidé*
→ Questions étape par étape
→ Calcul automatique TP/SL
→ Évaluation des risques

━━━━━━━━━━━━━━━━━━━━
🚀 *DÉMARRAGE RAPIDE*
━━━━━━━━━━━━━━━━━━━━

1️⃣ *Analyser une action*
   /analyser AAPL

2️⃣ *Voir votre portefeuille*
   /wallet

3️⃣ *Scanner le marché*
   /scan

━━━━━━━━━━━━━━━━━━━━
💡 *Utilisez les boutons ci-dessous ou tapez /menu*
"""
    
    await update.message.reply_text(
        welcome_message,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )



async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /help"""
    user_name = get_user_name(update)
    
    help_text = f"""
🤖 *GUIDE COMPLET - {user_name}*

*📊 ANALYSES:*
/analyze TICKER [1h|1d|1w] - Multi-timeframes
/compare TICKER1 TICKER2 - Comparer
/chart TICKER [1h|1d|1w] - Graphique visuel 📈
/top - Top 5 opportunités
/scan_cac40 / /scan_dax / /scan_us

*💥 SCREENERS:*
/volatile - Plus volatiles
/gainer - Plus fortes hausses
/loser - Plus fortes baisses

*🎯 PERSONNALISATION:*
/fav - Gérer favoris 📌
/alert - Gérer alertes 🔔
/portfolio - Portefeuille virtuel 💼
/settings - Panneau de contrôle ⚙️

*🤖 AUTOMATISATION:*
/autoscan [on|off|now] - Scans auto ⏰
/smartnotif [on|off] - Notifications 🧠
/dailyreport [on|off|now] - Rapport quotidien 📋

*📰 INFORMATIONS:*
/news TICKER - Actualités
/history TICKER - Historique signaux
/stats - Statistiques globales
/status - Horaires des marchés

*EXEMPLES:*
/chart AAPL 1h
/compare AAPL MSFT
/portfolio add AAPL 10 150.50
/smartnotif on
/news AAPL

💡 /settings pour tout configurer !
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /status - Affiche le statut de tous les marchés"""
    user_name = get_user_name(update)
    
    # Tester avec un ticker de chaque marché
    euronext_status = get_market_status("AI.PA")
    xetra_status = get_market_status("SAP.DE")
    us_status = get_market_status("AAPL")
    
    message = f"""
🕐 *STATUT DES MARCHÉS* - {user_name}

{euronext_status['message']}

━━━━━━━━━━━━━━━━

{xetra_status['message']}

━━━━━━━━━━━━━━━━

{us_status['message']}

━━━━━━━━━━━━━━━━

💡 *Info*: Les analyses sont basées sur les dernières données disponibles.
"""
    
    await update.message.reply_text(message, parse_mode='Markdown')

# ==================== COMMANDES FAVORIS ====================

async def fav_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /fav - Gestion des favoris"""
    user_name = get_user_name(update)
    user_id = update.effective_user.id
    
    if not context.args:
        # Afficher l'aide
        help_text = f"""
📌 *FAVORIS - {user_name}*

*COMMANDES:*
/fav add TICKER - Ajouter un favori
/fav list - Voir mes favoris
/fav scan - Scanner mes favoris
/fav remove TICKER - Retirer un favori
/fav clear - Tout supprimer

*EXEMPLES:*
/fav add AAPL
/fav add BNP.PA TSLA MSFT
/fav remove AAPL
"""
        await update.message.reply_text(help_text, parse_mode='Markdown')
        return
    
    action = context.args[0].lower()
    
    if action == "add":
        if len(context.args) < 2:
            await update.message.reply_text(f"*{user_name}*, spécifie au moins un ticker !\n\nExemple: /fav add AAPL", parse_mode='Markdown')
            return
        
        tickers = [t.upper() for t in context.args[1:]]
        added = []
        already_exists = []
        
        for ticker in tickers:
            if db.add_favorite(user_id, ticker):
                added.append(ticker)
            else:
                already_exists.append(ticker)
        
        response = f"✅ *{user_name}*, favoris ajoutés !\n\n"
        if added:
            response += f"➕ Ajoutés: {', '.join(added)}\n"
        if already_exists:
            response += f"ℹ️ Déjà présents: {', '.join(already_exists)}\n"
        
        response += f"\n📊 Total favoris: {len(db.get_favorites(user_id) or [])}"
        
        await update.message.reply_text(response, parse_mode='Markdown')
    
    elif action == "list":
        favorites = db.get_favorites(user_id)
        
        if not favorites:
            await update.message.reply_text(f"*{user_name}*, tu n'as pas encore de favoris !\n\nUtilise: /fav add TICKER", parse_mode='Markdown')
            return
        
        response = f"📌 *FAVORIS DE {user_name.upper()}*\n\n"
        for i, ticker in enumerate(favorites, 1):
            response += f"{i}. {ticker}\n"
        
        response += f"\n📊 Total: {len(favorites)} action(s)"
        
        await update.message.reply_text(response, parse_mode='Markdown')
    
    elif action == "scan":
        favorites = db.get_favorites(user_id)
        
        if not favorites:
            await update.message.reply_text(f"*{user_name}*, tu n'as pas de favoris à scanner !\n\nUtilise: /fav add TICKER", parse_mode='Markdown')
            return
        
        await update.message.reply_text(f"🔍 *{user_name}*, scan de tes {len(favorites)} favoris...", parse_mode='Markdown')
        
        results = []
        for ticker in favorites:
            result = analyze_stock(ticker)
            if result:
                results.append(result)
            time.sleep(0.3)
        
        if not results:
            await update.message.reply_text("❌ Impossible d'analyser tes favoris pour le moment.", parse_mode='Markdown')
            return
        
        # Trier par score absolu
        results.sort(key=lambda x: abs(x['score']), reverse=True)
        
        # Résumé
        summary = f"""
🔍 *SCAN DE TES FAVORIS* - {datetime.now().strftime('%d/%m/%Y %H:%M')}
━━━━━━━━━━━━━━━━━━━━

"""
        for i, result in enumerate(results, 1):
            summary += f"{i}. *{result['ticker']}* - {result['name'][:25]}\n"
            summary += f"   {result['signal']} | Score: {result['score']}\n"
            summary += f"   Prix: {result['price']:.2f} ({result['variation']:+.2f}%)\n\n"
        
        await update.message.reply_text(summary, parse_mode='Markdown')
        
        # Envoyer détails des 3 meilleurs
        for result in results[:3]:
            message = format_stock_message(result)
            await update.message.reply_text(message, parse_mode='Markdown')
            await asyncio.sleep(1)
    
    elif action == "remove":
        if len(context.args) < 2:
            await update.message.reply_text(f"*{user_name}*, spécifie un ticker !\n\nExemple: /fav remove AAPL", parse_mode='Markdown')
            return
        
        ticker = context.args[1].upper()
        
        if db.remove_favorite(user_id, ticker):
            await update.message.reply_text(f"✅ *{user_name}*, {ticker} retiré des favoris !\n\n📊 Favoris restants: {len(db.get_favorites(user_id) or [])}", parse_mode='Markdown')
        else:
            await update.message.reply_text(f"❌ *{user_name}*, {ticker} n'était pas dans tes favoris.", parse_mode='Markdown')
    
    elif action == "clear":
        count = len(db.get_favorites(user_id) or [])
        if count == 0:
            await update.message.reply_text(f"*{user_name}*, tu n'as pas de favoris à supprimer.", parse_mode='Markdown')
            return
        
        # Supprimer tous les favoris
        favorites = db.get_favorites(user_id)
        for ticker in favorites:
            db.remove_favorite(user_id, ticker)
        
        await update.message.reply_text(f"✅ *{user_name}*, tous tes favoris ont été supprimés ! ({count} action(s))", parse_mode='Markdown')
    
    else:
        await update.message.reply_text(f"*{user_name}*, commande inconnue !\n\nUtilise: /fav sans arguments pour voir l'aide.", parse_mode='Markdown')

# ==================== COMMANDES ALERTES ====================

async def alert_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /alert - Gestion des alertes de prix"""
    user_name = get_user_name(update)
    user_id = update.effective_user.id
    
    if not context.args:
        # Afficher l'aide
        help_text = f"""
🔔 *ALERTES DE PRIX - {user_name}*

*COMMANDES:*
/alert TICKER > PRIX - Alerte si monte au-dessus
/alert TICKER < PRIX - Alerte si descend en-dessous
/alert list - Voir mes alertes
/alert delete ID - Supprimer une alerte

*EXEMPLES:*
/alert AAPL > 180
/alert BNP.PA < 65
/alert list
/alert delete 1

💡 Tu seras notifié en privé quand l'alerte se déclenche !
"""
        await update.message.reply_text(help_text, parse_mode='Markdown')
        return
    
    action = context.args[0].lower()
    
    if action == "list":
        alerts = db.get_alerts(user_id)
        
        if not alerts:
            await update.message.reply_text(f"*{user_name}*, tu n'as pas d'alertes actives !\n\nUtilise: /alert TICKER > PRIX", parse_mode='Markdown')
            return
        
        response = f"🔔 *ALERTES DE {user_name.upper()}*\n\n"
        for alert in alerts:
            created = datetime.fromisoformat(alert['created_at']).strftime('%d/%m %H:%M')
            response += f"ID {alert['id']}: {alert['ticker']} {alert['condition']} {alert['target_price']:.2f}\n"
            response += f"   📅 Créée le {created}\n\n"
        
        response += f"📊 Total: {len(alerts)} alerte(s) active(s)"
        
        await update.message.reply_text(response, parse_mode='Markdown')
    
    elif action == "delete":
        if len(context.args) < 2:
            await update.message.reply_text(f"*{user_name}*, spécifie l'ID de l'alerte !\n\nExemple: /alert delete 1", parse_mode='Markdown')
            return
        
        try:
            alert_id = int(context.args[1])
        except ValueError:
            await update.message.reply_text(f"*{user_name}*, l'ID doit être un nombre !\n\nUtilise /alert list pour voir les IDs.", parse_mode='Markdown')
            return
        
        if db.delete_alert(user_id, alert_id):
            await update.message.reply_text(f"✅ *{user_name}*, alerte #{alert_id} supprimée !\n\n📊 Alertes restantes: {len(db.get_alerts(user_id) or [])}", parse_mode='Markdown')
        else:
            await update.message.reply_text(f"❌ *{user_name}*, alerte #{alert_id} introuvable.", parse_mode='Markdown')
    
    else:
        # Format: /alert TICKER > PRIX ou /alert TICKER < PRIX
        if len(context.args) < 3:
            await update.message.reply_text(f"*{user_name}*, format incorrect !\n\nExemple: /alert AAPL > 180", parse_mode='Markdown')
            return
        
        ticker = context.args[0].upper()
        condition = context.args[1]
        
        if condition not in ['>', '<']:
            await update.message.reply_text(f"*{user_name}*, condition invalide ! Utilise > ou <\n\nExemple: /alert AAPL > 180", parse_mode='Markdown')
            return
        
        try:
            target_price = float(context.args[2])
        except ValueError:
            await update.message.reply_text(f"*{user_name}*, le prix doit être un nombre !\n\nExemple: /alert AAPL > 180.50", parse_mode='Markdown')
            return
        
        # Ajouter l'alerte
        alert_id = db.add_alert(user_id, ticker, condition, target_price)
        
        response = f"""
✅ *{user_name}*, alerte créée !

🔔 *Alerte #{alert_id}*
Ticker: {ticker}
Condition: Prix {condition} {target_price:.2f}

💡 Tu seras notifié dès que cette condition est remplie !

📊 Total alertes: {len(db.get_alerts(user_id) or [])}
"""
        await update.message.reply_text(response, parse_mode='Markdown')

# ==================== VÉRIFICATION AUTOMATIQUE DES ALERTES ====================

async def check_alerts_callback(context: ContextTypes.DEFAULT_TYPE):
    """Callback périodique pour vérifier les alertes"""
    try:
        alerts = db.get_all_active_alerts()
        
        if alerts:
            print(f"🔍 Vérification de {len(alerts)} alerte(s)...")
            
            triggered_count = 0
            for alert in alerts:
                try:
                    # Récupérer le prix actuel
                    stock = yf.Ticker(alert['ticker'])
                    data = stock.history(period="1d", interval="1m")
                    
                    if len(data) == 0:
                        continue
                    
                    current_price = data['Close'].iloc[-1]
                    
                    # Vérifier la condition
                    triggered = False
                    if alert['condition'] == '>' and current_price > alert['target_price']:
                        triggered = True
                    elif alert['condition'] == '<' and current_price < alert['target_price']:
                        triggered = True
                    
                    if triggered:
                        # Marquer comme déclenchée
                        db.trigger_alert(alert['id'])
                        triggered_count += 1
                        
                        # Envoyer notification privée
                        bot = context.bot
                        message = f"""
🔔 *ALERTE DÉCLENCHÉE !*

Ticker: *{alert['ticker']}*
Condition: Prix {alert['condition']} {alert['target_price']:.2f}
Prix actuel: *{current_price:.2f}*

⏰ {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
"""
                        await bot.send_message(
                            chat_id=alert['user_id'],
                            text=message,
                            parse_mode='Markdown'
                        )
                        
                        # Log sur le canal
                        await log_to_channel(
                            f"🔔 Alerte déclenchée : {alert['ticker']} {alert['condition']} {alert['target_price']:.2f} (prix: {current_price:.2f})",
                            "🚨"
                        )
                        
                        print(f"✅ Alerte #{alert['id']} déclenchée pour {alert['ticker']}")
                    
                    time.sleep(0.5)  # Éviter de surcharger l'API
                    
                except Exception as e:
                    print(f"Erreur lors de la vérification de l'alerte #{alert['id']}: {e}")
            
            if triggered_count > 0:
                await log_to_channel(f"✅ Vérification alertes : {triggered_count} déclenchée(s)", "🔔")
        
    except Exception as e:
        print(f"Erreur dans le système d'alertes: {e}")

async def scan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /scan - Scanne tous les marchés"""
    user_name = get_user_name(update)
    await update.message.reply_text(f"🔍 *{user_name}*, scan en cours... Cela peut prendre quelques minutes.", parse_mode='Markdown')
    
    # Log de démarrage sur le canal
    await log_to_channel(f"🚀 Scan complet lancé par {user_name}", "🎯")
    
    results = scan_market(WATCHLIST, min_score=1, log_progress=True)
    summary = format_summary_message(results)
    
    # Log de fin
    await log_to_channel(f"✅ Scan terminé : {len(results)} opportunité(s) détectée(s)", "🎉")
    
    # Envoi en privé à l'utilisateur
    await update.message.reply_text(summary, parse_mode='Markdown')
    
    # Envoi sur le canal public
    await send_channel_message(summary, TELEGRAM_TOKEN, CHANNEL_ID)

async def scan_specific_command(update: Update, context: ContextTypes.DEFAULT_TYPE, market_key):
    """Scanne un marché spécifique"""
    user_name = get_user_name(update)
    
    market_display = {
        "CAC40": "🇫🇷 CAC 40",
        "DAX": "🇩🇪 DAX",
        "US_TECH": "🇺🇸 Tech US"
    }.get(market_key, market_key)
    
    msg = await update.message.reply_text(f"🔍 *{user_name}*, scan du {market_display}...", parse_mode='Markdown')
    
    # Log sur le canal
    await log_to_channel(f"🔍 Scan {market_display} lancé par {user_name}", "📊")
    
    specific_watchlist = {market_key: WATCHLIST[market_key]}
    results = scan_market(specific_watchlist, min_score=0, log_progress=True)
    summary = format_summary_message(results, top_n=15)
    
    # Log de fin
    await log_to_channel(f"✅ {market_display} terminé : {len(results)} action(s) analysée(s)", "✔️")
    
    # Créer boutons pour chaque ticker (3 par ligne)
    keyboard = []
    row = []
    for result in results[:15]:
        ticker = result['ticker']
        signal_emoji = "🟢" if "ACHAT" in result['signal'] else "🔴" if "VENTE" in result['signal'] else "⚪"
        row.append(InlineKeyboardButton(f"{signal_emoji} {ticker}", callback_data=f"analyze_{ticker}"))
        if len(row) == 3:
            keyboard.append(row)
            row = []
    if row:
        keyboard.append(row)
    keyboard.append([InlineKeyboardButton("❌ Fermer", callback_data="delete_message")])
    
    # Éditer le message avec les résultats + boutons
    await msg.edit_text(
        summary,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def analyze_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /analyze TICKER [TIMEFRAME]"""
    user_name = get_user_name(update)
    
    if not context.args:
        await update.message.reply_text(f"*{user_name}*, il me faut un ticker !\n\nUsage: /analyze TICKER [1h|1d|1w]\nExemple: /analyze AAPL\nExemple: /analyze AAPL 1h", parse_mode='Markdown')
        return
    
    ticker = context.args[0].upper()
    
    # Déterminer le timeframe
    timeframe = "1d"  # Par défaut
    period = "3mo"
    interval = "1d"
    
    if len(context.args) > 1:
        tf = context.args[1].lower()
        if tf == "1h":
            timeframe = "1h"
            period = "5d"
            interval = "1h"
        elif tf == "1w":
            timeframe = "1w"
            period = "1y"
            interval = "1wk"
    
    timeframe_display = {
        "1h": "Court terme (1 heure)",
        "1d": "Moyen terme (1 jour)",
        "1w": "Long terme (1 semaine)"
    }
    
    await update.message.reply_text(f"📊 *{user_name}*, j'analyse {ticker} en {timeframe_display[timeframe]}...", parse_mode='Markdown')
    
    result = analyze_stock(ticker, period=period, interval=interval)
    
    if result:
        message = format_stock_message(result)
        # Ajouter l'info du timeframe
        message = message.replace("━━━━━━━━━━━━━━━━━━━━", f"⏰ Timeframe: {timeframe_display[timeframe]}\n━━━━━━━━━━━━━━━━━━━━")
        
        # Créer les boutons d'action
        keyboard = [
            [
                InlineKeyboardButton("📈 Voir Graphique", callback_data=f"chart_{ticker}_{interval}"),
                InlineKeyboardButton("🚀 Prendre Position", callback_data=f"start_trade_{ticker}")
            ],
            [
                InlineKeyboardButton("📰 News", callback_data=f"news_{ticker}"),
                InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"fav_add_{ticker}")
            ],
            [
                InlineKeyboardButton("🔄 Actualiser", callback_data=f"refresh_analysis_{ticker}_{interval}"),
                InlineKeyboardButton("❌ Fermer", callback_data="delete_message")
            ]
        ]
        
        await update.message.reply_text(
            message, 
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        
        # Enregistrer le signal dans l'historique

    else:
        await update.message.reply_text(f"❌ Désolé *{user_name}*, impossible d'analyser {ticker}", parse_mode='Markdown')

async def compare_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /compare TICKER1 TICKER2"""
    user_name = get_user_name(update)
    
    if len(context.args) < 2:
        await update.message.reply_text(
            f"*{user_name}*, il me faut 2 tickers !\n\nUsage: /compare TICKER1 TICKER2\nExemple: /compare AAPL MSFT",
            parse_mode='Markdown'
        )
        return
    
    ticker1 = context.args[0].upper()
    ticker2 = context.args[1].upper()
    
    await update.message.reply_text(f"⚖️ *{user_name}*, je compare {ticker1} vs {ticker2}...", parse_mode='Markdown')
    
    # Analyser les deux actions
    result1 = analyze_stock(ticker1)
    result2 = analyze_stock(ticker2)
    
    if not result1 or not result2:
        missing = []
        if not result1:
            missing.append(ticker1)
        if not result2:
            missing.append(ticker2)
        await update.message.reply_text(f"❌ Impossible d'analyser : {', '.join(missing)}", parse_mode='Markdown')
        return
    
    # Créer le message de comparaison
    message = f"""
⚖️ *COMPARAISON : {ticker1} vs {ticker2}*

━━━━━━━━━━━━━━━━━━━━

*{ticker1}* - {result1['name'][:30]}
💰 Prix: {result1['price']:.2f} ({result1['variation']:+.2f}%)
📊 Signal: {result1['signal']}
🎯 Score: {result1['score']}/4

• RSI: {result1['rsi']:.1f} {"🔴" if result1['rsi'] > 70 else "🟢" if result1['rsi'] < 30 else "⚪"}
• MACD: {result1['macd']:.4f}
• Tendance: {result1['trend']}
• Volume: {result1['volume']:,.0f}

━━━━━━━━━━━━━━━━━━━━

*{ticker2}* - {result2['name'][:30]}
💰 Prix: {result2['price']:.2f} ({result2['variation']:+.2f}%)
📊 Signal: {result2['signal']}
🎯 Score: {result2['score']}/4

• RSI: {result2['rsi']:.1f} {"🔴" if result2['rsi'] > 70 else "🟢" if result2['rsi'] < 30 else "⚪"}
• MACD: {result2['macd']:.4f}
• Tendance: {result2['trend']}
• Volume: {result2['volume']:,.0f}

━━━━━━━━━━━━━━━━━━━━

*🏆 VERDICT*
"""
    
    # Comparer les scores
    if abs(result1['score']) > abs(result2['score']):
        winner = ticker1
        message += f"\n✅ *{ticker1}* a un signal plus fort ({result1['score']} vs {result2['score']})"
    elif abs(result2['score']) > abs(result1['score']):
        winner = ticker2
        message += f"\n✅ *{ticker2}* a un signal plus fort ({result2['score']} vs {result1['score']})"
    else:
        message += f"\n⚖️ Signaux équivalents ({result1['score']} = {result2['score']})"
    
    # Comparer la variation
    message += f"\n📈 Variation: {ticker1} ({result1['variation']:+.2f}%) vs {ticker2} ({result2['variation']:+.2f}%)"
    
    # Comparer RSI
    if result1['rsi'] < 30 and result2['rsi'] > 30:
        message += f"\n💡 {ticker1} est survendu (RSI {result1['rsi']:.0f}), opportunité d'achat potentielle"
    elif result2['rsi'] < 30 and result1['rsi'] > 30:
        message += f"\n💡 {ticker2} est survendu (RSI {result2['rsi']:.0f}), opportunité d'achat potentielle"
    
    await update.message.reply_text(message, parse_mode='Markdown')

async def history_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /history TICKER - Affiche l'historique des signaux"""
    user_name = get_user_name(update)
    
    if not context.args:
        await update.message.reply_text(
            f"*{user_name}*, il me faut un ticker !\n\nUsage: /history TICKER\nExemple: /history AAPL",
            parse_mode='Markdown'
        )
        return
    
    ticker = context.args[0].upper()
    history = db.get_signal_history(ticker, limit=10)
    
    if not history:
        await update.message.reply_text(
            f"📜 *{user_name}*, aucun historique pour {ticker}.\n\nLe bot enregistre les signaux depuis sa dernière mise à jour.",
            parse_mode='Markdown'
        )
        return
    
    message = f"📜 *HISTORIQUE DES SIGNAUX - {ticker}*\n\n"
    
    for i, signal in enumerate(history, 1):
        date = datetime.fromisoformat(signal['created_at']).strftime('%d/%m/%Y %H:%M')
        message += f"{i}. {date}\n"
        message += f"   📊 {signal['signal']}\n"
        message += f"   💰 Prix: {signal['price']:.2f}\n"
        message += f"   🎯 Score: {signal['score']}\n"
        message += f"   • RSI: {signal['rsi']:.1f}\n\n"
    
    message += f"📊 Total: {len(history)} signal(s) enregistré(s)"
    
    await update.message.reply_text(message, parse_mode='Markdown')

async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /stats - Affiche les statistiques globales"""
    user_name = get_user_name(update)
    
    stats = db.get_statistics()
    
    message = f"""
📈 *STATISTIQUES GLOBALES - {user_name}*

*BOT*
📊 Signaux enregistrés: {stats['total_signals']}

*RÉPARTITION PAR TYPE*
"""
    
    for signal_type, count in stats['signals_by_type'].items():
        percentage = (count / stats['total_signals'] * 100) if stats['total_signals'] > 0 else 0
        message += f"• {signal_type}: {count} ({percentage:.1f}%)\n"
    
    # Stats personnelles
    user_id = update.effective_user.id
    fav_count = len(db.get_favorites(user_id) or [])
    alert_count = len(db.get_alerts(user_id) or [])
    
    message += f"""

*TOI*
📌 Favoris: {fav_count}
🔔 Alertes actives: {alert_count}

💡 *Astuce:* Utilise /history TICKER pour voir l'historique d'une action spécifique.
"""
    
    await update.message.reply_text(message, parse_mode='Markdown')

async def volatile_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /volatile - Actions avec plus forte volatilité"""
    user_name = get_user_name(update)
    await update.message.reply_text(f"💥 *{user_name}*, recherche des actions les plus volatiles...", parse_mode='Markdown')
    
    await log_to_channel(f"💥 Scan volatilité lancé par {user_name}", "🔥")
    
    all_results = []
    for market, tickers in WATCHLIST.items():
        for ticker in tickers:
            result = analyze_stock(ticker)
            if result:
                all_results.append(result)
            time.sleep(0.3)
    
    # Trier par variation absolue
    all_results.sort(key=lambda x: abs(x['variation']), reverse=True)
    top_10 = all_results[:10]
    
    message = f"""
💥 *TOP 10 ACTIONS VOLATILES*

{datetime.now().strftime('%d/%m/%Y %H:%M')}

"""
    
    for i, result in enumerate(top_10, 1):
        emoji = "🔥" if abs(result['variation']) > 5 else "💥"
        direction = "📈" if result['variation'] > 0 else "📉"
        message += f"{i}. {emoji} *{result['ticker']}*\n"
        message += f"   {direction} {result['variation']:+.2f}% | Prix: {result['price']:.2f}\n"
        message += f"   Volume: {result['volume']:,.0f}\n\n"
    
    message += "💡 Ces actions bougent fort, idéal pour le trading court terme !"
    
    await update.message.reply_text(message, parse_mode='Markdown')
    await log_to_channel(f"✅ Scan volatilité terminé : {len(top_10)} actions détectées", "💥")

async def gainer_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /gainer - Plus fortes hausses"""
    user_name = get_user_name(update)
    await update.message.reply_text(f"🚀 *{user_name}*, recherche des plus fortes hausses...", parse_mode='Markdown')
    
    await log_to_channel(f"🚀 Scan gainers lancé par {user_name}", "📈")
    
    all_results = []
    for market, tickers in WATCHLIST.items():
        for ticker in tickers:
            result = analyze_stock(ticker)
            if result and result['variation'] > 0:  # Seulement les hausses
                all_results.append(result)
            time.sleep(0.3)
    
    # Trier par variation (décroissant)
    all_results.sort(key=lambda x: x['variation'], reverse=True)
    top_10 = all_results[:10]
    
    message = f"""
🚀 *TOP 10 GAINERS DU JOUR*

{datetime.now().strftime('%d/%m/%Y %H:%M')}

"""
    
    for i, result in enumerate(top_10, 1):
        emoji = "🔥" if result['variation'] > 5 else "🚀" if result['variation'] > 3 else "📈"
        message += f"{i}. {emoji} *{result['ticker']}* - {result['name'][:25]}\n"
        message += f"   +{result['variation']:.2f}% | Prix: {result['price']:.2f}\n"
        message += f"   Signal: {result['signal']}\n\n"
    
    message += "💡 Ces actions performent aujourd'hui !"
    
    await update.message.reply_text(message, parse_mode='Markdown')
    await log_to_channel(f"✅ Scan gainers terminé : {len(top_10)} actions détectées", "🚀")

async def loser_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /loser - Plus fortes baisses"""
    user_name = get_user_name(update)
    await update.message.reply_text(f"📉 *{user_name}*, recherche des plus fortes baisses...", parse_mode='Markdown')
    
    await log_to_channel(f"📉 Scan losers lancé par {user_name}", "🔻")
    
    all_results = []
    for market, tickers in WATCHLIST.items():
        for ticker in tickers:
            result = analyze_stock(ticker)
            if result and result['variation'] < 0:  # Seulement les baisses
                all_results.append(result)
            time.sleep(0.3)
    
    # Trier par variation (croissant = plus forte baisse en premier)
    all_results.sort(key=lambda x: x['variation'])
    top_10 = all_results[:10]
    
    message = f"""
📉 *TOP 10 LOSERS DU JOUR*

{datetime.now().strftime('%d/%m/%Y %H:%M')}

"""
    
    for i, result in enumerate(top_10, 1):
        emoji = "💔" if result['variation'] < -5 else "📉"
        # Vérifier si c'est une opportunité d'achat (RSI bas)
        opportunity = " 💡" if result['rsi'] < 30 else ""
        message += f"{i}. {emoji} *{result['ticker']}* - {result['name'][:25]}{opportunity}\n"
        message += f"   {result['variation']:.2f}% | Prix: {result['price']:.2f}\n"
        message += f"   RSI: {result['rsi']:.1f} | Signal: {result['signal']}\n\n"
    
    message += "💡 Certaines pourraient être des opportunités d'achat (💡 = RSI < 30) !"
    
    await update.message.reply_text(message, parse_mode='Markdown')
    await log_to_channel(f"✅ Scan losers terminé : {len(top_10)} actions détectées", "📉")

# ==================== SCANS AUTOMATIQUES PROGRAMMÉS ====================

async def auto_scan_callback(context: ContextTypes.DEFAULT_TYPE):
    """Callback pour les scans automatiques programmés"""
    global AUTO_SCAN_ENABLED
    
    if not AUTO_SCAN_ENABLED:
        return
    
    print(f"🤖 Démarrage du scan automatique...")
    await log_to_channel("🤖 Scan automatique démarré", "⏰")
    
    try:
        # Scanner tous les marchés
        results = scan_market(WATCHLIST, min_score=2, log_progress=True)
        
        if results:
            summary = format_summary_message(results, top_n=10)
            
            # Envoyer sur le canal
            header = f"""
⏰ *SCAN AUTOMATIQUE* - {datetime.now().strftime('%H:%M')}
━━━━━━━━━━━━━━━━━━━━

"""
            full_message = header + summary
            await send_channel_message(full_message, TELEGRAM_TOKEN, CHANNEL_ID)
            
            await log_to_channel(f"✅ Scan automatique terminé : {len(results)} opportunité(s)", "🎉")
        else:
            await log_to_channel("ℹ️ Scan automatique : Aucune opportunité forte", "📊")
    
    except Exception as e:
        print(f"Erreur lors du scan automatique: {e}")
        await log_to_channel(f"❌ Erreur scan automatique : {str(e)}", "⚠️")

async def autoscan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /autoscan - Gérer les scans automatiques"""
    global AUTO_SCAN_ENABLED, AUTO_SCAN_TIMES
    user_name = get_user_name(update)
    
    if not context.args:
        status = "✅ ACTIVÉS" if AUTO_SCAN_ENABLED else "❌ DÉSACTIVÉS"
        times_str = ", ".join(AUTO_SCAN_TIMES)
        
        help_text = f"""
⏰ *SCANS AUTOMATIQUES - {user_name}*

Statut: {status}
Heures programmées: {times_str}

*COMMANDES:*
/autoscan on - Activer
/autoscan off - Désactiver
/autoscan now - Lancer maintenant

*Fonctionnement:*
Le bot scanne automatiquement les marchés aux heures programmées et publie les meilleures opportunités sur le canal.

💡 Les scans automatiques utilisent les logs en direct pour suivre la progression.
"""
        await update.message.reply_text(help_text, parse_mode='Markdown')
        return
    
    action = context.args[0].lower()
    
    if action == "on":
        AUTO_SCAN_ENABLED = True
        times_str = ", ".join(AUTO_SCAN_TIMES)
        await log_to_channel(f"⏰ Scans automatiques activés par {user_name} ({times_str})", "✅")
        await update.message.reply_text(
            f"✅ *{user_name}*, scans automatiques ACTIVÉS !\n\nHeures: {times_str}",
            parse_mode='Markdown'
        )
    
    elif action == "off":
        AUTO_SCAN_ENABLED = False
        await log_to_channel(f"⏰ Scans automatiques désactivés par {user_name}", "🔕")
        await update.message.reply_text(
            f"❌ *{user_name}*, scans automatiques DÉSACTIVÉS.",
            parse_mode='Markdown'
        )
    
    elif action == "now":
        await update.message.reply_text(
            f"🚀 *{user_name}*, lancement d'un scan automatique immédiat...",
            parse_mode='Markdown'
        )
        # Déclencher un scan maintenant
        await auto_scan_callback(context)
    
    else:
        await update.message.reply_text(
            f"*{user_name}*, commande inconnue !\n\nUtilise: /autoscan [on|off|now]",
            parse_mode='Markdown'
        )

# ==================== GRAPHIQUES VISUELS ====================

def generate_chart(ticker, period="3mo", interval="1d"):
    """Génère un graphique technique AVANCÉ avec prix + Bollinger + Volume + RSI + MACD + Support/Résistance"""
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period=period, interval=interval)
        
        if len(data) < 50:
            return None
        
        # Calculer les indicateurs
        rsi = calculate_rsi(data, RSI_PERIOD)
        macd, macd_signal, macd_hist = calculate_macd(data, MACD_FAST, MACD_SLOW, MACD_SIGNAL)
        sma20 = calculate_sma(data, SMA_SHORT)
        sma50 = calculate_sma(data, SMA_LONG)
        
        # Bollinger Bands
        bb_period = 20
        rolling_mean = data['Close'].rolling(window=bb_period).mean()
        rolling_std = data['Close'].rolling(window=bb_period).std()
        upper_band = rolling_mean + (rolling_std * 2)
        lower_band = rolling_mean - (rolling_std * 2)
        
        # Détection Support/Résistance (niveaux clés)
        recent_data = data['Close'].iloc[-60:] if len(data) > 60 else data['Close']
        support = recent_data.min()
        resistance = recent_data.max()
        mid_level = (support + resistance) / 2
        
        # Créer la figure avec 4 subplots
        fig, (ax1, ax_vol, ax2, ax3) = plt.subplots(4, 1, figsize=(14, 12), 
                                                      gridspec_kw={'height_ratios': [3, 0.8, 1, 1]})
        fig.patch.set_facecolor('#0e1117')
        
        # Subplot 1: Prix + Moyennes mobiles + Bollinger Bands
        ax1.set_facecolor('#1a1d24')
        
        # Chandelier japonais simplifié (High-Low bars)
        for idx in range(len(data)):
            date = data.index[idx]
            high = data['High'].iloc[idx]
            low = data['Low'].iloc[idx]
            close = data['Close'].iloc[idx]
            open_price = data['Open'].iloc[idx]
            color = '#34c759' if close >= open_price else '#ff3b30'
            ax1.plot([date, date], [low, high], color=color, linewidth=0.8, alpha=0.6)
        
        ax1.plot(data.index, data['Close'], label='Prix', color='#00d4ff', linewidth=2.5, zorder=5)
        ax1.plot(data.index, sma20, label='SMA(20)', color='#ff9500', linewidth=1.8, alpha=0.9)
        ax1.plot(data.index, sma50, label='SMA(50)', color='#ff3b30', linewidth=1.8, alpha=0.9)
        
        # Bollinger Bands
        ax1.plot(data.index, upper_band, '--', color='#af52de', linewidth=1.2, alpha=0.6, label='BB Sup')
        ax1.plot(data.index, lower_band, '--', color='#af52de', linewidth=1.2, alpha=0.6, label='BB Inf')
        ax1.fill_between(data.index, upper_band, lower_band, alpha=0.05, color='#af52de')
        
        # Support/Résistance
        ax1.axhline(y=support, color='#34c759', linestyle='--', linewidth=1, alpha=0.5, label='Support')
        ax1.axhline(y=resistance, color='#ff3b30', linestyle='--', linewidth=1, alpha=0.5, label='Résistance')
        ax1.axhline(y=mid_level, color='white', linestyle=':', linewidth=0.8, alpha=0.3)
        
        # Info ticker
        current_price = data['Close'].iloc[-1]
        change = ((current_price - data['Close'].iloc[-2]) / data['Close'].iloc[-2]) * 100 if len(data) > 1 else 0
        
        ax1.set_title(f'{ticker} - {current_price:.2f} ({change:+.2f}%)', 
                     color='white', fontsize=16, fontweight='bold', pad=20)
        ax1.set_ylabel('Prix ($)', color='white', fontsize=11, fontweight='bold')
        ax1.legend(loc='upper left', facecolor='#1a1d24', edgecolor='white', labelcolor='white', fontsize=8, ncol=2)
        ax1.grid(True, alpha=0.15, color='white', linestyle=':')
        ax1.tick_params(colors='white', labelsize=9)
        
        # Subplot Volume
        ax_vol.set_facecolor('#1a1d24')
        colors_vol = ['#34c759' if data['Close'].iloc[i] >= data['Open'].iloc[i] 
                     else '#ff3b30' for i in range(len(data))]
        ax_vol.bar(data.index, data['Volume'], color=colors_vol, alpha=0.6, width=0.8)
        ax_vol.set_ylabel('Volume', color='white', fontsize=10, fontweight='bold')
        ax_vol.tick_params(colors='white', labelsize=8)
        ax_vol.grid(True, alpha=0.15, color='white', linestyle=':')
        
        # Subplot 2: RSI
        ax2.set_facecolor('#1a1d24')
        ax2.plot(data.index, rsi, label='RSI(14)', color='#5ac8fa', linewidth=2)
        ax2.axhline(y=70, color='#ff3b30', linestyle='--', linewidth=1.2, alpha=0.8, label='Suracheté')
        ax2.axhline(y=30, color='#34c759', linestyle='--', linewidth=1.2, alpha=0.8, label='Survendu')
        ax2.axhline(y=50, color='white', linestyle=':', linewidth=0.8, alpha=0.4)
        ax2.fill_between(data.index, 30, 70, alpha=0.08, color='white')
        
        # Colorer le fond selon la zone
        current_rsi = rsi.iloc[-1]
        if current_rsi > 70:
            ax2.fill_between(data.index, 70, 100, alpha=0.1, color='#ff3b30')
        elif current_rsi < 30:
            ax2.fill_between(data.index, 0, 30, alpha=0.1, color='#34c759')
        
        ax2.set_ylabel('RSI', color='white', fontsize=10, fontweight='bold')
        ax2.set_ylim(0, 100)
        ax2.legend(loc='upper left', facecolor='#1a1d24', edgecolor='white', labelcolor='white', fontsize=8)
        ax2.grid(True, alpha=0.15, color='white', linestyle=':')
        ax2.tick_params(colors='white', labelsize=8)
        
        # Subplot 3: MACD
        ax3.set_facecolor('#1a1d24')
        ax3.plot(data.index, macd, label='MACD', color='#00d4ff', linewidth=2)
        ax3.plot(data.index, macd_signal, label='Signal', color='#ff9500', linewidth=2)
        
        # Histogramme MACD (coloré selon positif/négatif)
        colors = ['#34c759' if val >= 0 else '#ff3b30' for val in macd_hist]
        ax3.bar(data.index, macd_hist, label='Histogramme', color=colors, alpha=0.6, width=0.8)
        
        ax3.axhline(y=0, color='white', linestyle='-', linewidth=0.8, alpha=0.5)
        ax3.set_ylabel('MACD', color='white', fontsize=10, fontweight='bold')
        ax3.set_xlabel('Date', color='white', fontsize=10, fontweight='bold')
        ax3.legend(loc='upper left', facecolor='#1a1d24', edgecolor='white', labelcolor='white', fontsize=8)
        ax3.grid(True, alpha=0.15, color='white', linestyle=':')
        ax3.tick_params(colors='white', labelsize=8)
        
        # Formater les dates
        for ax in [ax1, ax_vol, ax2, ax3]:
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%d/%m'))
            ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
            plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        plt.tight_layout()
        
        # Sauvegarder dans un buffer
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=120, facecolor='#0e1117', edgecolor='none')
        buf.seek(0)
        plt.close()
        
        return buf
        
    except Exception as e:
        print(f"Erreur génération graphique pour {ticker}: {e}")
        return None

async def chart_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /chart TICKER [TIMEFRAME] - Génère un graphique technique"""
    user_name = get_user_name(update)
    
    if not context.args:
        await update.message.reply_text(
            f"*{user_name}*, il me faut un ticker !\n\nUsage: /chart TICKER [1h|1d|1w]\nExemple: /chart AAPL\nExemple: /chart BNP.PA 1w",
            parse_mode='Markdown'
        )
        return
    
    ticker = context.args[0].upper()
    
    # Déterminer le timeframe
    period = "3mo"
    interval = "1d"
    timeframe_name = "3 mois"
    
    if len(context.args) > 1:
        tf = context.args[1].lower()
        if tf == "1h":
            period = "5d"
            interval = "1h"
            timeframe_name = "5 jours (1h)"
        elif tf == "1w":
            period = "1y"
            interval = "1wk"
            timeframe_name = "1 an (1 semaine)"
    
    await update.message.reply_text(
        f"📊 *{user_name}*, génération du graphique pour {ticker} ({timeframe_name})...",
        parse_mode='Markdown'
    )
    
    # Générer le graphique
    chart_buf = generate_chart(ticker, period=period, interval=interval)
    
    if chart_buf:
        # Envoyer l'image
        await update.message.reply_photo(
            photo=chart_buf,
            caption=f"📈 *Graphique Technique - {ticker}*\n\nPériode: {timeframe_name}\nGénéré le {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            f"❌ Impossible de générer le graphique pour {ticker}",
            parse_mode='Markdown'
        )

# ==================== NOTIFICATIONS INTELLIGENTES ====================

def detect_patterns(data, ticker):
    """Détecte les patterns importants (Golden Cross, Death Cross, Divergences)"""
    patterns = []
    
    if len(data) < 50:
        return patterns
    
    # Calculer les indicateurs
    sma20 = calculate_sma(data, 20)
    sma50 = calculate_sma(data, 50)
    rsi = calculate_rsi(data, 14)
    macd, macd_signal, macd_hist = calculate_macd(data)
    
    # Golden Cross (SMA20 croise SMA50 à la hausse)
    if len(data) >= 2:
        if sma20.iloc[-2] < sma50.iloc[-2] and sma20.iloc[-1] > sma50.iloc[-1]:
            patterns.append({
                'type': 'golden_cross',
                'ticker': ticker,
                'name': '🟡 GOLDEN CROSS',
                'description': "SMA(20) croise SMA(50) à la hausse",
                'signal': "HAUSSIER FORT",
                'emoji': '🚀',
                'priority': 'high'
            })
    
    # Death Cross (SMA20 croise SMA50 à la baisse)
    if len(data) >= 2:
        if sma20.iloc[-2] > sma50.iloc[-2] and sma20.iloc[-1] < sma50.iloc[-1]:
            patterns.append({
                'type': 'death_cross',
                'ticker': ticker,
                'name': '⚫ DEATH CROSS',
                'description': "SMA(20) croise SMA(50) à la baisse",
                'signal': "BAISSIER FORT",
                'emoji': '📉',
                'priority': 'high'
            })
    
    # Divergence haussière RSI (prix baisse mais RSI monte)
    if len(data) >= 5:
        price_trend = data['Close'].iloc[-5:].is_monotonic_decreasing
        rsi_trend = rsi.iloc[-5:].is_monotonic_increasing
        if price_trend and rsi_trend and rsi.iloc[-1] < 40:
            patterns.append({
                'type': 'bullish_divergence',
                'ticker': ticker,
                'name': '🔄 DIVERGENCE HAUSSIÈRE',
                'description': "Prix baisse mais RSI monte",
                'signal': "RETOURNEMENT HAUSSIER POSSIBLE",
                'emoji': '💡',
                'priority': 'medium'
            })
    
    # Divergence baissière RSI (prix monte mais RSI baisse)
    if len(data) >= 5:
        price_trend = data['Close'].iloc[-5:].is_monotonic_increasing
        rsi_trend = rsi.iloc[-5:].is_monotonic_decreasing
        if price_trend and rsi_trend and rsi.iloc[-1] > 60:
            patterns.append({
                'type': 'bearish_divergence',
                'ticker': ticker,
                'name': '🔄 DIVERGENCE BAISSIÈRE',
                'description': "Prix monte mais RSI baisse",
                'signal': "RETOURNEMENT BAISSIER POSSIBLE",
                'emoji': '⚠️',
                'priority': 'medium'
            })
    
    # MACD croisement haussier
    if len(macd) >= 2:
        if macd.iloc[-2] < macd_signal.iloc[-2] and macd.iloc[-1] > macd_signal.iloc[-1]:
            patterns.append({
                'type': 'macd_bullish_cross',
                'ticker': ticker,
                'name': '📈 MACD HAUSSIER',
                'description': "MACD croise signal à la hausse",
                'signal': "MOMENTUM HAUSSIER",
                'emoji': '🟢',
                'priority': 'low'
            })
    
    # RSI extrême (suracheté/survendu)
    current_rsi = rsi.iloc[-1]
    if current_rsi > 80:
        patterns.append({
            'type': 'rsi_overbought',
            'ticker': ticker,
            'name': '🔴 RSI EXTRÊME',
            'description': f'RSI très suracheté ({current_rsi:.0f})',
            'signal': "CORRECTION POSSIBLE",
            'emoji': '⚠️',
            'priority': 'medium'
        })
    elif current_rsi < 20:
        patterns.append({
            'type': 'rsi_oversold',
            'ticker': ticker,
            'name': '🟢 RSI EXTRÊME',
            'description': f'RSI très survendu ({current_rsi:.0f})',
            'signal': "REBOND POSSIBLE",
            'emoji': '💡',
            'priority': 'medium'
        })
    

    
    # ==================== PATTERNS AVANCÉS ====================
    
    # Volume moyen
    avg_volume = data['Volume'].rolling(window=20).mean()
    
    # Breakout de volume
    if len(data) >= 2 and len(avg_volume) >= 2:
        if data['Volume'].iloc[-1] > avg_volume.iloc[-1] * 2:
            price_change = ((data['Close'].iloc[-1] - data['Close'].iloc[-2]) / data['Close'].iloc[-2]) * 100
            if abs(price_change) > 3:
                patterns.append({
                    'type': 'volume_breakout',
                    'ticker': ticker,
                    'name': '📊 BREAKOUT VOLUME',
                    'description': f'Volume x2 + variation {price_change:+.1f}%',
                    'signal': "MOUVEMENT FORT EN COURS",
                    'emoji': '💥',
                    'priority': 'high'
                })
    
    # Triple convergence haussière
    if len(data) >= 2:
        rsi_bullish = rsi.iloc[-1] > 50 and rsi.iloc[-1] < 70
        macd_bullish = macd.iloc[-1] > macd_signal.iloc[-1]
        price_bullish = data['Close'].iloc[-1] > sma50.iloc[-1]
        
        if rsi_bullish and macd_bullish and price_bullish:
            patterns.append({
                'type': 'triple_convergence_bull',
                'ticker': ticker,
                'name': '⚡ CONVERGENCE HAUSSIÈRE',
                'description': "RSI + MACD + Prix alignés haussiers",
                'signal': "MOMENTUM HAUSSIER CONFIRMÉ",
                'emoji': '🎯',
                'priority': 'medium'
            })
    
    # Support fort testé
    if len(data) >= 20:
        support_level = data['Close'].iloc[-20:].min()
        current_price = data['Close'].iloc[-1]
        distance_to_support = ((current_price - support_level) / support_level) * 100
        
        if 0 < distance_to_support < 2:
            patterns.append({
                'type': 'support_test',
                'ticker': ticker,
                'name': '🛡️ TEST DE SUPPORT',
                'description': f'Prix proche support ({support_level:.2f})',
                'signal': "ZONE D'ACHAT POTENTIELLE",
                'emoji': '🎯',
                'priority': 'medium'
            })
    
    return patterns

async def smart_notifications_callback(context: ContextTypes.DEFAULT_TYPE):
    """Callback périodique pour détecter et envoyer des notifications intelligentes"""
    global SMART_NOTIFICATIONS_ENABLED
    
    if not SMART_NOTIFICATIONS_ENABLED:
        return
    
    print("🧠 Recherche de patterns intelligents...")
    
    try:
        all_patterns = []
        
        # Scanner toutes les actions de la watchlist
        for market, tickers in WATCHLIST.items():
            for ticker in tickers[:20]:  # Limiter à 20 actions par scan pour ne pas surcharger
                try:
                    stock = yf.Ticker(ticker)
                    data = stock.history(period="3mo", interval="1d")
                    
                    if len(data) >= 50:
                        patterns = detect_patterns(data, ticker)
                        all_patterns.extend(patterns)
                    
                    time.sleep(0.5)
                except:
                    continue
        
        # Filtrer par priorité haute et moyenne
        high_priority = [p for p in all_patterns if p['priority'] == 'high']
        medium_priority = [p for p in all_patterns if p['priority'] == 'medium']
        
        # Envoyer les notifications
        if high_priority:
            for pattern in high_priority:
                message = f"""
{pattern['emoji']} *ALERTE PATTERN DÉTECTÉ*

Ticker: *{pattern['ticker']}*
Pattern: {pattern['name']}
{pattern['description']}

Signal: {pattern['signal']}

⏰ {datetime.now().strftime('%d/%m/%Y %H:%M')}
"""
                await send_channel_message(message, TELEGRAM_TOKEN, CHANNEL_ID)
                print(f"🧠 Pattern {pattern['type']} détecté sur {pattern['ticker']}")
        
        if high_priority or medium_priority:
            await log_to_channel(
                f"🧠 Scan patterns: {len(high_priority)} haute priorité, {len(medium_priority)} moyenne priorité",
                "🔔"
            )
    
    except Exception as e:
        print(f"Erreur notifications intelligentes: {e}")

async def smartnotif_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /smartnotif - Gérer les notifications intelligentes"""
    global SMART_NOTIFICATIONS_ENABLED
    user_name = get_user_name(update)
    
    if not context.args:
        status = "✅ ACTIVÉES" if SMART_NOTIFICATIONS_ENABLED else "❌ DÉSACTIVÉES"
        
        help_text = f"""
🧠 *NOTIFICATIONS INTELLIGENTES - {user_name}*

Statut: {status}

*PATTERNS DÉTECTÉS:*
• 🟡 Golden Cross (SMA20 > SMA50)
• ⚫ Death Cross (SMA20 < SMA50)
• 🔄 Divergences RSI
• 📈 Croisements MACD
• 🔴 RSI extrêmes

*COMMANDES:*
/smartnotif on - Activer
/smartnotif off - Désactiver

*Fonctionnement:*
Le bot scanne automatiquement toutes les heures et détecte les patterns importants. Vous recevez une alerte sur le canal quand un pattern fort est détecté.

💡 Idéal pour ne rater aucun signal majeur !
"""
        await update.message.reply_text(help_text, parse_mode='Markdown')
        return
    
    action = context.args[0].lower()
    
    if action == "on":
        SMART_NOTIFICATIONS_ENABLED = True
        await log_to_channel(f"🧠 Notifications intelligentes activées par {user_name}", "✅")
        await update.message.reply_text(
            f"✅ *{user_name}*, notifications intelligentes ACTIVÉES !\n\nLe bot va détecter automatiquement les patterns importants.",
            parse_mode='Markdown'
        )
    
    elif action == "off":
        SMART_NOTIFICATIONS_ENABLED = False
        await log_to_channel(f"🧠 Notifications intelligentes désactivées par {user_name}", "🔕")
        await update.message.reply_text(
            f"❌ *{user_name}*, notifications intelligentes DÉSACTIVÉES.",
            parse_mode='Markdown'
        )
    
    else:
        await update.message.reply_text(
            f"*{user_name}*, commande inconnue !\n\nUtilise: /smartnotif [on|off]",
            parse_mode='Markdown'
        )

# ==================== PORTEFEUILLE VIRTUEL ====================


async def daily_report_callback(context: ContextTypes.DEFAULT_TYPE):
    """Callback pour générer et envoyer le rapport quotidien AMÉLIORÉ"""
    global DAILY_REPORT_ENABLED
    
    if not DAILY_REPORT_ENABLED:
        return
    
    print("📋 Génération du rapport quotidien amélioré...")
    
    try:
        message = f"""
📋 *RAPPORT QUOTIDIEN* 📋
🗓️ {datetime.now().strftime('%d/%m/%Y %H:%M')}

━━━━━━━━━━━━━━━━━━━━
📊 *RÉSUMÉ DES MARCHÉS*
━━━━━━━━━━━━━━━━━━━━

"""
        
        # 1. Résumé des indices majeurs
        indices = {
            '^GSPC': 'S&P 500',
            '^DJI': 'Dow Jones',
            '^IXIC': 'Nasdaq',
            '^FCHI': 'CAC 40',
            '^GDAXI': 'DAX'
        }
        
        for symbol, name in indices.items():
            try:
                ticker = yf.Ticker(symbol)
                data = ticker.history(period='2d')
                if len(data) >= 2:
                    current = data['Close'].iloc[-1]
                    previous = data['Close'].iloc[-2]
                    change = ((current - previous) / previous) * 100
                    emoji = '🟢' if change > 0 else '🔴'
                    message += f"{emoji} *{name}*: {current:.2f} ({change:+.2f}%)\n"
            except:
                continue
        
        message += f"\n━━━━━━━━━━━━━━━━━━━━\n"
        message += f"🎯 *TOP OPPORTUNITÉS*\n"
        message += f"━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # 2. Scanner les opportunités
        results = scan_market(WATCHLIST, min_score=2)
        
        if results:
            for i, opp in enumerate(results[:5], 1):
                message += f"{i}. *{opp['ticker']}* - Score: {opp['score']}/10\n"
                message += f"   Prix: {opp['current_price']:.2f} | RSI: {opp['rsi']:.0f}\n\n"
        else:
            message += "Aucune opportunité forte détectée\n\n"
        
        # 3. Détecter les patterns sur les meilleures opportunités
        patterns_detected = []
        for result in results[:10]:
            try:
                stock = yf.Ticker(result['ticker'])
                data = stock.history(period='3mo')
                if len(data) >= 50:
                    patterns = detect_patterns(data, result['ticker'])
                    high_priority = [p for p in patterns if p['priority'] == 'high']
                    patterns_detected.extend(high_priority)
            except:
                continue
        
        if patterns_detected:
            message += f"━━━━━━━━━━━━━━━━━━━━\n"
            message += f"🔔 *PATTERNS DÉTECTÉS*\n"
            message += f"━━━━━━━━━━━━━━━━━━━━\n\n"
            
            for pattern in patterns_detected[:5]:
                message += f"{pattern['emoji']} *{pattern['ticker']}*: {pattern['name']}\n"
                message += f"   {pattern['description']}\n\n"
        
        message += f"━━━━━━━━━━━━━━━━━━━━\n"
        message += f"💡 Rapport généré automatiquement\n"
        message += f"⚙️ Désactiver: /dailyreport off"
        
        # Envoyer le rapport
        await send_channel_message(message, TELEGRAM_TOKEN, CHANNEL_ID)
        print("✅ Rapport quotidien envoyé")
        
    except Exception as e:
        print(f"Erreur génération rapport quotidien: {e}")
        traceback.print_exc()


async def dailyreport_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /dailyreport - Gérer le rapport quotidien"""
    global DAILY_REPORT_ENABLED
    user_name = get_user_name(update)
    
    if not context.args:
        status = "✅ ACTIVÉ" if DAILY_REPORT_ENABLED else "❌ DÉSACTIVÉ"
        
        help_text = f"""
📋 *RAPPORT QUOTIDIEN - {user_name}*

Statut: {status}
Heure: {DAILY_REPORT_TIME}

*COMMANDES:*
/dailyreport on - Activer
/dailyreport off - Désactiver
/dailyreport now - Générer maintenant

*CONTENU DU RAPPORT:*
• Statut des marchés
• Top 5 opportunités du jour
• Statistiques globales
• Résumé des favoris

💡 Reçois un résumé complet chaque matin !
"""
        await update.message.reply_text(help_text, parse_mode='Markdown')
        return
    
    action = context.args[0].lower()
    
    if action == "on":
        DAILY_REPORT_ENABLED = True
        await log_to_channel(f"📋 Rapport quotidien activé par {user_name} ({DAILY_REPORT_TIME})", "✅")
        await update.message.reply_text(
            f"✅ *{user_name}*, rapport quotidien ACTIVÉ !\n\nHeure: {DAILY_REPORT_TIME}",
            parse_mode='Markdown'
        )
    
    elif action == "off":
        DAILY_REPORT_ENABLED = False
        await log_to_channel(f"📋 Rapport quotidien désactivé par {user_name}", "🔕")
        await update.message.reply_text(
            f"❌ *{user_name}*, rapport quotidien DÉSACTIVÉ.",
            parse_mode='Markdown'
        )
    
    elif action == "now":
        await update.message.reply_text(
            f"📋 *{user_name}*, génération du rapport...",
            parse_mode='Markdown'
        )
        await daily_report_callback(context)
    
    else:
        await update.message.reply_text(
            f"*{user_name}*, commande inconnue !\n\nUtilise: /dailyreport [on|off|now]",
            parse_mode='Markdown'
        )

# ==================== INTÉGRATION NEWS ====================


# ==================== SOURCES D'ACTUALITÉS MULTIPLES ====================

import requests
from bs4 import BeautifulSoup
import urllib.parse

def get_news_from_multiple_sources(ticker, max_articles=5):
    """
    Récupère les actualités depuis plusieurs sources :
    1. Yahoo Finance
    2. Recherche Google News
    3. Finnhub (si API key disponible)
    4. Alpha Vantage (si API key disponible)
    """
    all_news = []
    
    # SOURCE 1: Yahoo Finance (méthode existante)
    print(f"📰 Recherche Yahoo Finance pour {ticker}...")
    try:
        stock = yf.Ticker(ticker)
        try:
            news = stock.news
        except:
            try:
                news = stock.get_news()
            except:
                news = []
        
        if news:
            for article in news[:5]:
                if isinstance(article, dict):
                    title = article.get('title') or article.get('headline') or article.get('summary')
                    publisher = article.get('publisher') or article.get('source') or 'Yahoo Finance'
                    link = article.get('link') or article.get('url')
                    timestamp = article.get('providerPublishTime') or article.get('published')
                    
                    if title and len(title) > 5:
                        all_news.append({
                            'title': title,
                            'publisher': publisher,
                            'link': link,
                            'timestamp': timestamp,
                            'source': 'Yahoo Finance'
                        })
    except Exception as e:
        print(f"⚠️ Yahoo Finance error: {e}")
    
    # SOURCE 2: Google News (scraping léger)
    print(f"📰 Recherche Google News pour {ticker}...")
    try:
        # Construire l'URL de recherche Google News
        query = f"{ticker} stock news"
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&tbm=nws"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Trouver les articles de news
            articles = soup.find_all('div', class_='SoaBEf')[:3]  # Limiter à 3
            
            for article in articles:
                try:
                    title_elem = article.find('div', class_='MBeuO')
                    if title_elem:
                        title = title_elem.get_text()
                        
                        # Trouver la source
                        source_elem = article.find('div', class_='CEMjEf')
                        publisher = source_elem.get_text() if source_elem else 'Google News'
                        
                        # Trouver le lien
                        link_elem = article.find('a')
                        link = link_elem['href'] if link_elem and 'href' in link_elem.attrs else None
                        
                        if title and len(title) > 10:
                            all_news.append({
                                'title': title,
                                'publisher': publisher,
                                'link': link,
                                'timestamp': None,
                                'source': 'Google News'
                            })
                except:
                    continue
    except Exception as e:
        print(f"⚠️ Google News error: {e}")
    
    # SOURCE 3: Bing News (alternative à Google)
    print(f"📰 Recherche Bing News pour {ticker}...")
    try:
        query = f"{ticker} stock news"
        url = f"https://www.bing.com/news/search?q={urllib.parse.quote(query)}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Trouver les articles
            articles = soup.find_all('div', class_='news-card')[:3]
            
            for article in articles:
                try:
                    title_elem = article.find('a', class_='title')
                    if title_elem:
                        title = title_elem.get_text().strip()
                        link = title_elem['href'] if 'href' in title_elem.attrs else None
                        
                        source_elem = article.find('div', class_='source')
                        publisher = source_elem.get_text().strip() if source_elem else 'Bing News'
                        
                        if title and len(title) > 10:
                            all_news.append({
                                'title': title,
                                'publisher': publisher,
                                'link': link,
                                'timestamp': None,
                                'source': 'Bing News'
                            })
                except:
                    continue
    except Exception as e:
        print(f"⚠️ Bing News error: {e}")
    
    # SOURCE 4: MarketWatch RSS
    print(f"📰 Recherche MarketWatch pour {ticker}...")
    try:
        url = f"https://www.marketwatch.com/investing/stock/{ticker.lower()}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Chercher les headlines
            headlines = soup.find_all('a', class_='link')[:2]
            
            for headline in headlines:
                try:
                    title = headline.get_text().strip()
                    link = headline['href'] if 'href' in headline.attrs else None
                    
                    if title and len(title) > 15 and 'stock' in title.lower() or ticker.lower() in title.lower():
                        all_news.append({
                            'title': title,
                            'publisher': 'MarketWatch',
                            'link': link if link and link.startswith('http') else f"https://www.marketwatch.com{link}",
                            'timestamp': None,
                            'source': 'MarketWatch'
                        })
                except:
                    continue
    except Exception as e:
        print(f"⚠️ MarketWatch error: {e}")
    
    # SOURCE 5: Seeking Alpha (contenu public)
    print(f"📰 Recherche Seeking Alpha pour {ticker}...")
    try:
        url = f"https://seekingalpha.com/symbol/{ticker}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            # Chercher les articles dans le HTML
            if ticker.upper() in response.text:
                all_news.append({
                    'title': f"Latest analysis and news available on Seeking Alpha",
                    'publisher': 'Seeking Alpha',
                    'link': url,
                    'timestamp': None,
                    'source': 'Seeking Alpha'
                })
    except Exception as e:
        print(f"⚠️ Seeking Alpha error: {e}")
    
    print(f"✅ Total articles trouvés: {len(all_news)}")
    return all_news[:max_articles]

async def news_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /news TICKER - Affiche les actualités depuis PLUSIEURS SOURCES"""
    user_name = get_user_name(update)
    
    if not context.args:
        await update.message.reply_text(
            f"*{user_name}*, il me faut un ticker !\n\nUsage: /news TICKER\nExemple: /news AAPL\n\n📰 Sources: Yahoo Finance, Google News, Bing News, MarketWatch, Seeking Alpha",
            parse_mode='Markdown'
        )
        return
    
    ticker = context.args[0].upper()
    
    await update.message.reply_text(
        f"📰 *{user_name}*, recherche des actualités pour {ticker}...\n\n🔍 Sources: Yahoo Finance, Google News, Bing, MarketWatch...",
        parse_mode='Markdown'
    )
    
    try:
        # Récupérer les news depuis plusieurs sources
        all_news = get_news_from_multiple_sources(ticker, max_articles=8)
        
        if not all_news or len(all_news) == 0:
            await update.message.reply_text(
                f"❌ Aucune actualité trouvée pour {ticker}\n\n💡 Vérifiez que le ticker existe\n\nEssayez: AAPL, MSFT, GOOGL, TSLA, AMZN",
                parse_mode='Markdown'
            )
            return
        
        message = f"📰 *ACTUALITÉS - {ticker}*\n"
        message += f"🌐 {len(all_news)} source(s)\n\n"
        
        # Mots pour analyse de sentiment
        positive_words = ['surge', 'gain', 'profit', 'growth', 'beat', 'up', 'rise', 
                        'strong', 'bullish', 'positive', 'success', 'record', 'high',
                        'augmente', 'hausse', 'bénéfice', 'croissance', 'reaches', 'soars',
                        'jumps', 'rallies', 'climbs', 'outperform']
        negative_words = ['fall', 'loss', 'down', 'drop', 'decline', 'weak', 'bearish',
                        'negative', 'miss', 'concern', 'risk', 'low', 'crash', 'plunge',
                        'baisse', 'chute', 'perte', 'recul', 'faible', 'tumbles',
                        'slump', 'slides', 'underperform', 'warning']
        
        for i, article in enumerate(all_news[:5], 1):
            title = article['title']
            publisher = article['publisher'] or 'Source inconnue'
            link = article['link']
            source = article.get('source', 'Unknown')
            timestamp = article.get('timestamp')
            
            # Formater la date
            if timestamp:
                try:
                    if isinstance(timestamp, int):
                        publish_time = datetime.fromtimestamp(timestamp)
                        time_str = publish_time.strftime('%d/%m %H:%M')
                    else:
                        time_str = 'Récent'
                except:
                    time_str = 'Récent'
            else:
                time_str = 'Récent'
            
            # Analyser le sentiment
            title_lower = title.lower()
            sentiment_score = 0
            
            for word in positive_words:
                if word in title_lower:
                    sentiment_score += 1
            
            for word in negative_words:
                if word in title_lower:
                    sentiment_score -= 1
            
            # Déterminer le sentiment
            if sentiment_score > 0:
                sentiment = 'POSITIF 🟢'
            elif sentiment_score < 0:
                sentiment = 'NÉGATIF 🔴'
            else:
                sentiment = 'NEUTRE ⚪'
            
            # Construire le message
            message += f"{i}. *{title[:80]}{'...' if len(title) > 80 else ''}*\n"
            message += f"   📌 {publisher} | {time_str}\n"
            message += f"   📊 Sentiment: {sentiment}\n"
            if link:
                message += f"   🔗 [Lire]({link})\n"
            message += f"   🌐 Via: {source}\n\n"
        
        message += f"💡 Sources consultées: Yahoo Finance, Google News, Bing News, MarketWatch, Seeking Alpha"
        
        await update.message.reply_text(message, parse_mode='Markdown', disable_web_page_preview=True)
        
    except Exception as e:
        print(f"Erreur news pour {ticker}: {e}")
        import traceback
        traceback.print_exc()
        await update.message.reply_text(
            f"❌ Erreur lors de la récupération des actualités\n\nEssayez un autre ticker populaire",
            parse_mode='Markdown'
        )


async def top_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /top - Top opportunités"""
    user_name = get_user_name(update)
    await update.message.reply_text(f"🎯 *{user_name}*, je cherche les meilleures opportunités pour toi...", parse_mode='Markdown')
    
    # Log sur le canal
    await log_to_channel(f"🎯 Recherche TOP opportunités par {user_name}", "⭐")
    
    results = scan_market(WATCHLIST, min_score=2, log_progress=True)
    
    if results:
        # Log résultat
        await log_to_channel(f"✅ TOP recherche terminée : {len(results)} opportunité(s) forte(s)", "🏆")
        
        # Envoie le résumé
        summary = format_summary_message(results, top_n=5)
        await update.message.reply_text(summary, parse_mode='Markdown')
        
        # Envoie le détail des 3 meilleures
        for result in results[:3]:
            message = format_stock_message(result)
            await update.message.reply_text(message, parse_mode='Markdown')
            await asyncio.sleep(1)
    else:
        await log_to_channel("ℹ️ Aucune opportunité forte détectée", "📊")
        await update.message.reply_text(f"*{user_name}*, aucune opportunité forte détectée pour le moment.", parse_mode='Markdown')

async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /menu - Affiche le menu principal en MP"""
    user_name = get_user_name(update)
    user_id = update.effective_user.id
    
    # Créer le menu avec boutons
    keyboard = [
        [
            InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet"),
            InlineKeyboardButton("📊 Analyser", callback_data="menu_analyze")
        ],
        [
            InlineKeyboardButton("📈 Scanner", callback_data="menu_scan"),
            InlineKeyboardButton("📰 Actualités", callback_data="menu_news")
        ],
        [
            InlineKeyboardButton("📊 Graphiques", callback_data="menu_chart"),
            InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")
        ],
        [
            InlineKeyboardButton("📌 Favoris", callback_data="menu_favorites"),
            InlineKeyboardButton("🔔 Alertes", callback_data="menu_alerts")
        ],
        [
            InlineKeyboardButton("ℹ️ Aide", callback_data="menu_help"),
            InlineKeyboardButton("❌ Fermer", callback_data="menu_close")
        ]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = f"""
🤖 *MENU PRINCIPAL - {user_name}*

━━━━━━━━━━━━━━━━━━━━
💼 *TRADING*
━━━━━━━━━━━━━━━━━━━━

💼 *Wallet* - Gérer votre portefeuille
📊 *Analyser* - Analyse approfondie d'une action
📈 *Scanner* - Scanner le marché
📰 *Actualités* - News multi-sources

━━━━━━━━━━━━━━━━━━━━
⚙️ *OUTILS*
━━━━━━━━━━━━━━━━━━━━

📊 *Graphiques* - Graphiques techniques
⚙️ *Paramètres* - Configuration du bot
📌 *Favoris* - Gérer vos favoris
🔔 *Alertes* - Gérer vos alertes

━━━━━━━━━━━━━━━━━━━━
💡 *Utilisez les boutons ci-dessous*
"""
    
    # Envoyer en MP (message privé)
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text=message,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )
        
        # Si la commande a été envoyée dans un canal, confirmer
        if update.message.chat.type != 'private':
            await update.message.reply_text(
                f"✅ Menu envoyé en privé à {user_name}!",
                parse_mode='Markdown'
            )
    except Exception as e:
        # Si impossible d'envoyer en MP
        await update.message.reply_text(
            f"❌ Impossible d'envoyer le menu en privé.\n\n💡 Veuillez d'abord démarrer une conversation avec le bot en cliquant ici : @{context.bot.username}",
            parse_mode='Markdown'
        )

async def menu_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les callbacks du menu"""
    query = update.callback_query
    await query.answer()
    
    action = query.data
    user_id = update.effective_user.id
    user_name = query.from_user.first_name or query.from_user.username or "Trader"
    
    if action == "menu_close":
        await query.delete_message()
        return
    
    elif action == "menu_wallet":
        # Afficher le wallet paper trading
        get_or_create_user(user_id)
        
        capital = db.get_portfolio_capital_paper(user_id)
        positions = db.get_user_positions_paper(user_id, 'open')
        stats = db.get_paper_stats(user_id)
        
        total_pnl = sum(pos.get('pnl', 0) for pos in positions)
        total_invested = sum(pos.get('amount', 0) for pos in positions)
        total_capital = capital['current_cash'] + total_invested + total_pnl
        initial = capital['initial_capital']
        performance = ((total_capital - initial) / initial * 100) if initial > 0 else 0
        
        message = f"""💰 *WALLET PAPER TRADING*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *CAPITAL*
Initial: {initial:,.2f} €
Actuel: {total_capital:,.2f} €
Performance: {performance:+.2f}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *RÉPARTITION*
💵 Disponible: {capital['current_cash']:,.2f} €
📈 Investi: {total_invested:,.2f} €
{'🟢' if total_pnl >= 0 else '🔴'} P&L Positions: {total_pnl:+.2f} €

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *STATISTIQUES*
Total trades: {stats.get('total_trades', 0)}
🟢 Gagnants: {stats.get('winners', 0)}
🔴 Perdants: {stats.get('losers', 0)}
Win Rate: {(stats.get('winners', 0) / stats.get('total_trades', 1) * 100) if stats.get('total_trades', 0) > 0 else 0:.1f}%

🚀 Meilleur: {stats.get('best_trade', 0):+.2f} €
💥 Pire: {stats.get('worst_trade', 0):+.2f} €
💰 P&L Total: {stats.get('total_profit', 0):+.2f} €

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *POSITIONS ACTIVES* ({len(positions)})
"""
        
        for i, pos in enumerate(positions[:5]):
            pnl_emoji = "🟢" if pos.get('pnl', 0) >= 0 else "🔴"
            message += f"\n{pnl_emoji} {pos['ticker']} - {pos['position_type']} x{pos['leverage']}"
            message += f"\n   Capital: {pos['amount']:.2f}€ | P&L: {pos.get('pnl', 0):+.2f}€"
        
        if len(positions) > 5:
            message += f"\n\n... et {len(positions) - 5} autres positions"
        
        keyboard = [
            [InlineKeyboardButton("📊 Toutes positions", callback_data="view_all_positions")],
            [InlineKeyboardButton("💰 Modifier solde", callback_data="wallet_modify")],
            [InlineKeyboardButton("🔄 Actualiser", callback_data="refresh_wallet")],
            [InlineKeyboardButton("« Retour", callback_data="menu_back")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_analyze":
        keyboard = [[InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]]
        await query.edit_message_text(
            "📊 *ANALYSER UNE ACTION*\n\nTapez la commande:\n`/analyser TICKER`\n\n*Exemple:*\n`/analyser AAPL`\n\nLe bot va:\n• Analyser le contexte du marché\n• Évaluer la tendance\n• Calculer les indicateurs\n• Proposer une projection\n• Vous guider pour un trade",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_scan":
        keyboard = [
            [
                InlineKeyboardButton("🇫🇷 CAC40", callback_data="scan_cac40"),
                InlineKeyboardButton("🇩🇪 DAX", callback_data="scan_dax")
            ],
            [
                InlineKeyboardButton("🇺🇸 US Tech", callback_data="scan_us"),
                InlineKeyboardButton("📊 Tout", callback_data="scan_all")
            ],
            [InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]
        ]
        await query.edit_message_text(
            "📈 *SCANNER LE MARCHÉ*\n\nChoisissez un marché à scanner ou utilisez les commandes:\n\n`/scan` - Toutes les actions\n`/scan_cac40` - CAC40\n`/scan_dax` - DAX\n`/scan_us` - Actions US",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_news":
        keyboard = [[InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]]
        await query.edit_message_text(
            "📰 *ACTUALITÉS MULTI-SOURCES*\n\nTapez la commande:\n`/news TICKER`\n\n*Exemple:*\n`/news AAPL`\n\n*Sources consultées:*\n• Yahoo Finance\n• Google News\n• Bing News\n• MarketWatch\n• Seeking Alpha\n\n💡 Le bot analyse le sentiment de chaque actualité",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_chart":
        keyboard = [[InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]]
        await query.edit_message_text(
            "📊 *GRAPHIQUES TECHNIQUES*\n\nTapez la commande:\n`/chart TICKER [PÉRIODE]`\n\n*Exemples:*\n`/chart AAPL` (par défaut 1 jour)\n`/chart AAPL 1h` (1 heure)\n`/chart AAPL 1w` (1 semaine)\n\n*Indicateurs inclus:*\n• Prix + Bollinger Bands\n• Volume\n• RSI\n• MACD\n• Support/Résistance",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_settings":
        # Ouvrir les paramètres
        favorites = db.get_favorites(user_id)
        fav_count = len(favorites) if favorites else 0
        alerts = db.get_alerts(user_id)
        alert_count = len(alerts) if alerts else 0
        
        keyboard = [
            [
                InlineKeyboardButton("📌 Favoris", callback_data="settings_favorites"),
                InlineKeyboardButton("🔔 Alertes", callback_data="settings_alerts")
            ],
            [
                InlineKeyboardButton("💼 Portefeuille", callback_data="settings_portfolio"),
                InlineKeyboardButton("📊 Affichage", callback_data="settings_display")
            ],
            [
                InlineKeyboardButton("📝 Logs Canal", callback_data="settings_logs"),
                InlineKeyboardButton("⏰ Scans Auto", callback_data="settings_autoscan")
            ],
            [
                InlineKeyboardButton("📈 Statistiques", callback_data="settings_stats"),
                InlineKeyboardButton("🗑️ Réinitialiser", callback_data="settings_reset")
            ],
            [
                InlineKeyboardButton("« Retour au menu", callback_data="menu_back")
            ]
        ]
        
        message = f"""
⚙️ *PANNEAU DE CONTRÔLE - {user_name}*

*VUE D'ENSEMBLE*
📌 Favoris: {fav_count}
🔔 Alertes actives: {alert_count}

*CONFIGURATION*
Utilise les boutons ci-dessous pour gérer tes paramètres.
"""
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_favorites":
        favorites = db.get_favorites(user_id)
        
        if not favorites:
            message = "📌 *FAVORIS*\n\n❌ Aucun favori enregistré\n\n💡 Utilisez:\n`/fav add TICKER`\n\n*Exemple:*\n`/fav add AAPL`"
        else:
            message = "📌 *VOS FAVORIS*\n\n"
            for fav in favorites[:10]:
                message += f"• `{fav['ticker']}`\n"
            if len(favorites) > 10:
                message += f"\n... et {len(favorites)-10} autre(s)\n"
            message += "\n💡 *Commandes:*\n`/fav add TICKER` - Ajouter\n`/fav remove TICKER` - Retirer\n`/fav list` - Liste complète"
        
        keyboard = [[InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]]
        await query.edit_message_text(
            text=message, 
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_alerts":
        alerts = db.get_alerts(user_id)
        
        if not alerts:
            message = "🔔 *ALERTES*\n\n❌ Aucune alerte active\n\n💡 Utilisez:\n`/alert add TICKER > PRIX`\n\n*Exemples:*\n`/alert add AAPL > 200`\n`/alert add TSLA < 150`"
        else:
            message = "🔔 *VOS ALERTES ACTIVES*\n\n"
            for i, alert in enumerate(alerts[:10], 1):
                emoji = "🔴" if "<" in alert['condition'] else "🟢"
                message += f"{i}. {emoji} `{alert['ticker']}` {alert['condition']} {alert['target_value']:.2f}\n"
            if len(alerts) > 10:
                message += f"\n... et {len(alerts)-10} autre(s)\n"
            message += "\n💡 *Commandes:*\n`/alert add TICKER > PRIX`\n`/alert list`\n`/alert delete ID`"
        
        keyboard = [[InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]]
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_help":
        help_text = """
ℹ️ *AIDE - COMMANDES PRINCIPALES*

━━━━━━━━━━━━━━━━━━━━
💼 *PORTEFEUILLE*
━━━━━━━━━━━━━━━━━━━━

`/wallet` - Portefeuille moderne

━━━━━━━━━━━━━━━━━━━━
📊 *ANALYSE & TRADING*
━━━━━━━━━━━━━━━━━━━━

`/analyser TICKER` - Analyse complète
`/chart TICKER` - Graphique technique
`/news TICKER` - Actualités
`/scan` - Scanner le marché

━━━━━━━━━━━━━━━━━━━━
⚙️ *GESTION*
━━━━━━━━━━━━━━━━━━━━

`/fav add TICKER` - Ajouter favori
`/fav list` - Liste favoris
`/alert add TICKER > PRIX` - Créer alerte
`/settings` - Paramètres

━━━━━━━━━━━━━━━━━━━━
💡 *NAVIGATION*
━━━━━━━━━━━━━━━━━━━━

`/menu` - Menu principal
`/help` - Aide complète
`/start` - Recommencer
"""
        keyboard = [[InlineKeyboardButton("« Retour au menu", callback_data="menu_back")]]
        await query.edit_message_text(
            text=help_text, 
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "menu_back":
        # Retour au menu principal
        keyboard = [
            [
                InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet"),
                InlineKeyboardButton("📊 Analyser", callback_data="menu_analyze")
            ],
            [
                InlineKeyboardButton("📈 Scanner", callback_data="menu_scan"),
                InlineKeyboardButton("📰 Actualités", callback_data="menu_news")
            ],
            [
                InlineKeyboardButton("📊 Graphiques", callback_data="menu_chart"),
                InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")
            ],
            [
                InlineKeyboardButton("📌 Favoris", callback_data="menu_favorites"),
                InlineKeyboardButton("🔔 Alertes", callback_data="menu_alerts")
            ],
            [
                InlineKeyboardButton("ℹ️ Aide", callback_data="menu_help"),
                InlineKeyboardButton("❌ Fermer", callback_data="menu_close")
            ]
        ]
        
        message = f"""
🤖 *MENU PRINCIPAL - {user_name}*

━━━━━━━━━━━━━━━━━━━━
💼 *TRADING*
━━━━━━━━━━━━━━━━━━━━

💼 *Wallet* - Gérer votre portefeuille
📊 *Analyser* - Analyse approfondie d'une action
📈 *Scanner* - Scanner le marché
📰 *Actualités* - News multi-sources

━━━━━━━━━━━━━━━━━━━━
⚙️ *OUTILS*
━━━━━━━━━━━━━━━━━━━━

📊 *Graphiques* - Graphiques techniques
⚙️ *Paramètres* - Configuration du bot
📌 *Favoris* - Gérer vos favoris
🔔 *Alertes* - Gérer vos alertes

━━━━━━━━━━━━━━━━━━━━
💡 *Utilisez les boutons ci-dessous*
"""
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    # Callbacks pour les scans depuis le menu
    elif action == "scan_cac40":
        await query.answer("🔍 Scan CAC40 en cours...")
        await query.edit_message_text("⏳ *Scan du CAC40 en cours...*", parse_mode='Markdown')
        
        # Lancer le scan
        specific_watchlist = {"CAC40": WATCHLIST["CAC40"]}
        results = scan_market(specific_watchlist, min_score=0, log_progress=False)
        summary = format_summary_message(results, top_n=15)
        
        # Créer boutons pour chaque ticker (3 par ligne)
        keyboard = []
        row = []
        for result in results[:15]:
            ticker = result['ticker']
            signal_emoji = "🟢" if "ACHAT" in result['signal'] else "🔴" if "VENTE" in result['signal'] else "⚪"
            row.append(InlineKeyboardButton(f"{signal_emoji} {ticker}", callback_data=f"analyze_{ticker}"))
            if len(row) == 3:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton("« Retour menu", callback_data="menu_back")])
        
        await query.edit_message_text(summary, parse_mode=None, reply_markup=InlineKeyboardMarkup(keyboard))
    
    elif action == "scan_dax":
        await query.answer("🔍 Scan DAX en cours...")
        await query.edit_message_text("⏳ *Scan du DAX en cours...*", parse_mode='Markdown')
        
        specific_watchlist = {"DAX": WATCHLIST["DAX"]}
        results = scan_market(specific_watchlist, min_score=0, log_progress=False)
        summary = format_summary_message(results, top_n=15)
        
        keyboard = []
        row = []
        for result in results[:15]:
            ticker = result['ticker']
            signal_emoji = "🟢" if "ACHAT" in result['signal'] else "🔴" if "VENTE" in result['signal'] else "⚪"
            row.append(InlineKeyboardButton(f"{signal_emoji} {ticker}", callback_data=f"analyze_{ticker}"))
            if len(row) == 3:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton("« Retour menu", callback_data="menu_back")])
        
        await query.edit_message_text(summary, parse_mode=None, reply_markup=InlineKeyboardMarkup(keyboard))
    
    elif action == "scan_us":
        await query.answer("🔍 Scan US Tech en cours...")
        await query.edit_message_text("⏳ *Scan US Tech en cours...*", parse_mode='Markdown')
        
        specific_watchlist = {"US_TECH": WATCHLIST["US_TECH"]}
        results = scan_market(specific_watchlist, min_score=0, log_progress=False)
        summary = format_summary_message(results, top_n=15)
        
        keyboard = []
        row = []
        for result in results[:15]:
            ticker = result['ticker']
            signal_emoji = "🟢" if "ACHAT" in result['signal'] else "🔴" if "VENTE" in result['signal'] else "⚪"
            row.append(InlineKeyboardButton(f"{signal_emoji} {ticker}", callback_data=f"analyze_{ticker}"))
            if len(row) == 3:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton("« Retour menu", callback_data="menu_back")])
        
        await query.edit_message_text(summary, parse_mode=None, reply_markup=InlineKeyboardMarkup(keyboard))
        
    elif action == "scan_all":
        await query.answer("🔍 Scan complet en cours...")
        await query.edit_message_text("⏳ *Scan complet en cours...*", parse_mode='Markdown')
        
        results = scan_market(WATCHLIST, min_score=0, log_progress=False)
        summary = format_summary_message(results, top_n=15)
        
        keyboard = []
        row = []
        for result in results[:15]:
            ticker = result['ticker']
            signal_emoji = "🟢" if "ACHAT" in result['signal'] else "🔴" if "VENTE" in result['signal'] else "⚪"
            row.append(InlineKeyboardButton(f"{signal_emoji} {ticker}", callback_data=f"analyze_{ticker}"))
            if len(row) == 3:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)
        keyboard.append([InlineKeyboardButton("« Retour menu", callback_data="menu_back")])
        
        await query.edit_message_text(summary, parse_mode=None, reply_markup=InlineKeyboardMarkup(keyboard))
    
    # Callback pour analyser un ticker depuis le scan
    elif action.startswith("analyze_"):
        ticker = action.replace("analyze_", "")
        await query.answer()
        await query.edit_message_text(f"📊 Analyse de *{ticker}* en cours...", parse_mode='Markdown')
        result = analyze_stock(ticker, period="3mo", interval="1d")
        if result:
            message = format_stock_message(result)
            keyboard = [
                [InlineKeyboardButton("🚀 Prendre Position", callback_data=f"start_trade_{ticker}")],
                [InlineKeyboardButton("📈 Voir Graphique", callback_data=f"chart_{ticker}_1d")],
                [InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]
            ]
            await query.edit_message_text(message, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))
        else:
            await query.edit_message_text(f"❌ Impossible d'analyser *{ticker}*", parse_mode='Markdown')
    
    elif action == "settings_favorites":
        # Menu Favoris
        favorites = db.get_favorites(user_id)
        fav_count = len(favorites)
        
        keyboard = [
            [
                InlineKeyboardButton("➕ Ajouter", callback_data="fav_add_prompt"),
                InlineKeyboardButton("📋 Liste", callback_data="fav_list")
            ],
            [
                InlineKeyboardButton("🔍 Scanner", callback_data="fav_scan"),
                InlineKeyboardButton("🗑️ Tout supprimer", callback_data="fav_clear_confirm")
            ],
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        fav_list = "\n".join([f"• {t}" for t in favorites[:10]]) if favorites else "Aucun favori"
        if len(favorites) > 10:
            fav_list += f"\n... et {len(favorites) - 10} autres"
        
        message = f"""
📌 *GESTION DES FAVORIS*

*Total: {fav_count} action(s)*

{fav_list}

Utilise les boutons pour gérer tes favoris.
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_alerts":
        # Menu Alertes
        alerts = db.get_alerts(user_id)
        alert_count = len(alerts)
        
        keyboard = [
            [
                InlineKeyboardButton("➕ Créer alerte", callback_data="alert_add_prompt"),
                InlineKeyboardButton("📋 Liste", callback_data="alert_list")
            ],
            [
                InlineKeyboardButton("🗑️ Tout supprimer", callback_data="alert_clear_confirm")
            ],
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        alert_list = "\n".join([f"• {a['ticker']} {a['condition']} {a['target_price']}" for a in alerts[:5]]) if alerts else "Aucune alerte"
        if len(alerts) > 5:
            alert_list += f"\n... et {len(alerts) - 5} autres"
        
        message = f"""
🔔 *GESTION DES ALERTES*

*Total: {alert_count} alerte(s) active(s)*

{alert_list}

🔍 Vérification automatique toutes les 5 minutes.
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_display":
        # Menu Affichage
        user_settings = db.get_user_settings(user_id)
        current_mode = user_settings.get('display_mode', 'detailed')
        
        keyboard = [
            [
                InlineKeyboardButton("📊 Mode Détaillé" + (" ✓" if current_mode == "detailed" else ""), callback_data="display_detailed"),
                InlineKeyboardButton("📱 Mode Compact" + (" ✓" if current_mode == "compact" else ""), callback_data="display_compact")
            ],
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
📊 *PARAMÈTRES D'AFFICHAGE*

Mode actuel: *{current_mode.upper()}*

*Mode Détaillé*
• Toutes les informations
• Indicateurs techniques complets
• Détails des signaux

*Mode Compact*
• Informations essentielles
• Rapide à lire
• Idéal mobile

Choisis ton mode préféré.
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_logs":
        # Menu Logs
        logs_status = "✅ ACTIVÉS" if ENABLE_LIVE_LOGS else "❌ DÉSACTIVÉS"
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Activer" if not ENABLE_LIVE_LOGS else "❌ Désactiver", callback_data="logs_toggle")
            ],
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
📝 *LOGS EN DIRECT*

Statut: {logs_status}

*Les logs affichent sur le canal:*
• Démarrage des scans
• Progression par marché
• Alertes déclenchées
• Erreurs et warnings

⚡ Les logs permettent de suivre l'activité du bot en temps réel.
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_autoscan":
        # Menu Scans Automatiques
        autoscan_status = "✅ ACTIVÉS" if AUTO_SCAN_ENABLED else "❌ DÉSACTIVÉS"
        times_str = ", ".join(AUTO_SCAN_TIMES)
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Activer" if not AUTO_SCAN_ENABLED else "❌ Désactiver", callback_data="autoscan_toggle")
            ],
            [
                InlineKeyboardButton("🚀 Lancer maintenant", callback_data="autoscan_now")
            ],
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
⏰ *SCANS AUTOMATIQUES*

Statut: {autoscan_status}
Heures: {times_str}

*Fonctionnement:*
Le bot scanne automatiquement tous les marchés aux heures programmées et publie les meilleures opportunités sur le canal.

💡 Idéal pour ne rien rater !
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_stats":
        # Statistiques
        fav_count = len(db.get_favorites(user_id) or [])
        alert_count = len(db.get_alerts(user_id) or [])
        stats = db.get_statistics()
        
        keyboard = [
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
📈 *STATISTIQUES*

*Personnel*
📌 Favoris: {fav_count}
🔔 Alertes: {alert_count}

*Global (Bot)*
📊 Signaux enregistrés: {stats['total_signals']}

*Prochainement*
• Taux de réussite
• Performance par action
• Historique des gains
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_reset":
        # Confirmation reset
        keyboard = [
            [
                InlineKeyboardButton("⚠️ OUI, tout supprimer", callback_data="reset_confirm"),
                InlineKeyboardButton("❌ Annuler", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
⚠️ *RÉINITIALISATION*

*ATTENTION !*
Cette action va supprimer:
• Tous tes favoris
• Toutes tes alertes
• Tous tes paramètres

Cette action est *IRRÉVERSIBLE*.

Es-tu sûr ?
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "settings_main":
        # Retour menu principal
        user_settings = db.get_user_settings(user_id)
        fav_count = len(db.get_favorites(user_id) or [])
        alert_count = len(db.get_alerts(user_id) or [])
        display_mode = user_settings.get('display_mode', 'Détaillé') if user_settings else 'Détaillé'
        logs_status = "✅ ON" if ENABLE_LIVE_LOGS else "❌ OFF"
        autoscan_status = "✅ ON" if AUTO_SCAN_ENABLED else "❌ OFF"
        
        keyboard = [
            [
                InlineKeyboardButton("📌 Favoris", callback_data="settings_favorites"),
                InlineKeyboardButton("🔔 Alertes", callback_data="settings_alerts")
            ],
            [
                InlineKeyboardButton("📊 Affichage", callback_data="settings_display"),
                InlineKeyboardButton("📝 Logs Canal", callback_data="settings_logs")
            ],
            [
                InlineKeyboardButton("⏰ Scans Auto", callback_data="settings_autoscan"),
                InlineKeyboardButton("📈 Statistiques", callback_data="settings_stats")
            ],
            [
                InlineKeyboardButton("🗑️ Réinitialiser", callback_data="settings_reset"),
                InlineKeyboardButton("❌ Fermer", callback_data="settings_close")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
⚙️ *PANNEAU DE CONTRÔLE - {user_name}*

*VUE D'ENSEMBLE*
📌 Favoris: {fav_count}
🔔 Alertes actives: {alert_count}
📊 Mode affichage: {display_mode}
📝 Logs canal: {logs_status}
⏰ Scans auto: {autoscan_status}

*CONFIGURATION*
Utilise les boutons ci-dessous pour gérer tes paramètres.
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    # Actions spécifiques
    elif action == "display_detailed":
        db.update_user_setting(user_id, 'display_mode', 'detailed')
        await query.answer("✅ Mode détaillé activé !")
        await settings_callback_refresh_display(query, user_id, user_name)
    
    elif action == "display_compact":
        db.update_user_setting(user_id, 'display_mode', 'compact')
        await query.answer("✅ Mode compact activé !")
        await settings_callback_refresh_display(query, user_id, user_name)
    
    elif action == "logs_toggle":
        ENABLE_LIVE_LOGS = not ENABLE_LIVE_LOGS
        status = "activés" if ENABLE_LIVE_LOGS else "désactivés"
        await query.answer(f"✅ Logs {status} !")
        await log_to_channel(f"📝 Logs {status} par {user_name}", "⚙️")
        # Rafraîchir la page logs
        logs_status = "✅ ACTIVÉS" if ENABLE_LIVE_LOGS else "❌ DÉSACTIVÉS"
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Activer" if not ENABLE_LIVE_LOGS else "❌ Désactiver", callback_data="logs_toggle")
            ],
            [
                InlineKeyboardButton("« Retour", callback_data="settings_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
📝 *LOGS EN DIRECT*

Statut: {logs_status}

*Les logs affichent sur le canal:*
• Démarrage des scans
• Progression par marché
• Alertes déclenchées
• Erreurs et warnings

⚡ Les logs permettent de suivre l'activité du bot en temps réel.
"""
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    elif action == "autoscan_toggle":
        AUTO_SCAN_ENABLED = not AUTO_SCAN_ENABLED
        status = "activés" if AUTO_SCAN_ENABLED else "désactivés"
        await query.answer(f"✅ Scans auto {status} !")
        await log_to_channel(f"⏰ Scans automatiques {status} par {user_name}", "⚙️")
        # Rafraîchir la page
        query.data = "settings_autoscan"
        await settings_callback(update, context)
    
    elif action == "autoscan_now":
        await query.answer("🚀 Scan lancé !")
        bot = context.bot
        await bot.send_message(
            chat_id=user_id,
            text="🚀 Scan automatique immédiat lancé ! Regarde le canal.",
            parse_mode='Markdown'
        )
        await auto_scan_callback(context)
    
    elif action == "fav_list":
        favorites = db.get_favorites(user_id)
        if not favorites:
            await query.answer("❌ Aucun favori !")
            return
        
        fav_text = "\n".join([f"{i}. {t}" for i, t in enumerate(favorites, 1)])
        await query.answer("Liste envoyée !", show_alert=False)
        
        bot = context.bot
        await bot.send_message(
            chat_id=user_id,
            text=f"📌 *TES FAVORIS*\n\n{fav_text}\n\n📊 Total: {len(favorites)}",
            parse_mode='Markdown'
        )
    
    elif action == "fav_scan":
        await query.answer("🔍 Scan de tes favoris lancé !")
        # Déclencher le scan des favoris
        bot = context.bot
        await bot.send_message(
            chat_id=user_id,
            text=f"🔍 Scan de tes favoris en cours...",
            parse_mode='Markdown'
        )
        # Le scan sera fait via /fav scan
    
    elif action == "fav_add_prompt":
        await query.answer("💡 Utilise /fav add TICKER en privé")
        bot = context.bot
        await bot.send_message(
            chat_id=user_id,
            text="Pour ajouter des favoris, utilise:\n\n`/fav add AAPL MSFT TSLA`\n\nExemple:\n`/fav add BNP.PA AI.PA`",
            parse_mode='Markdown'
        )
    
    elif action == "fav_clear_confirm":
        keyboard = [
            [
                InlineKeyboardButton("⚠️ OUI, tout supprimer", callback_data="fav_clear_execute"),
                InlineKeyboardButton("❌ Annuler", callback_data="settings_favorites")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        fav_count = len(db.get_favorites(user_id) or [])
        message = f"⚠️ Supprimer {fav_count} favori(s) ?\n\nCette action est irréversible."
        await query.edit_message_text(message, reply_markup=reply_markup)
    
    elif action == "fav_clear_execute":
        favorites = db.get_favorites(user_id)
        count = len(favorites)
        for ticker in favorites:
            db.remove_favorite(user_id, ticker)
        await query.answer(f"✅ {count} favoris supprimés !")
        # Retour au menu favoris
        query.data = "settings_favorites"
        await settings_callback(update, context)
    
    elif action == "alert_list":
        alerts = db.get_alerts(user_id)
        if not alerts:
            await query.answer("❌ Aucune alerte !")
            return
        
        alert_text = "\n".join([f"{a['id']}. {a['ticker']} {a['condition']} {a['target_price']}" for a in alerts])
        await query.answer("Liste envoyée !", show_alert=False)
        
        bot = context.bot
        await bot.send_message(
            chat_id=user_id,
            text=f"🔔 *TES ALERTES*\n\n{alert_text}\n\n📊 Total: {len(alerts)}",
            parse_mode='Markdown'
        )
    
    elif action == "alert_add_prompt":
        await query.answer("💡 Utilise /alert TICKER > PRIX en privé")
        bot = context.bot
        await bot.send_message(
            chat_id=user_id,
            text="Pour créer une alerte, utilise:\n\n`/alert AAPL > 180`\n`/alert BNP.PA < 65`",
            parse_mode='Markdown'
        )
    
    elif action == "alert_clear_confirm":
        keyboard = [
            [
                InlineKeyboardButton("⚠️ OUI, tout supprimer", callback_data="alert_clear_execute"),
                InlineKeyboardButton("❌ Annuler", callback_data="settings_alerts")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        alert_count = len(db.get_alerts(user_id) or [])
        message = f"⚠️ Supprimer {alert_count} alerte(s) ?\n\nCette action est irréversible."
        await query.edit_message_text(message, reply_markup=reply_markup)
    
    elif action == "alert_clear_execute":
        alerts = db.get_alerts(user_id)
        count = len(alerts)
        for alert in alerts:
            db.delete_alert(user_id, alert['id'])
        await query.answer(f"✅ {count} alertes supprimées !")
        # Retour au menu alertes
        query.data = "settings_alerts"
        await settings_callback(update, context)
    
    elif action == "reset_confirm":
        # Tout supprimer
        favorites = db.get_favorites(user_id)
        alerts = db.get_alerts(user_id)
        
        for ticker in favorites:
            db.remove_favorite(user_id, ticker)
        for alert in alerts:
            db.delete_alert(user_id, alert['id'])
        
        await query.answer("✅ Compte réinitialisé !")
        await query.edit_message_text("✅ *Compte réinitialisé avec succès !*\n\nToutes tes données ont été supprimées.", parse_mode='Markdown')

async def settings_callback_refresh_display(query, user_id, user_name):
    """Rafraîchit le menu affichage après changement"""
    user_settings = db.get_user_settings(user_id)
    current_mode = user_settings.get('display_mode', 'detailed')
    
    keyboard = [
        [
            InlineKeyboardButton("📊 Mode Détaillé" + (" ✓" if current_mode == "detailed" else ""), callback_data="display_detailed"),
            InlineKeyboardButton("📱 Mode Compact" + (" ✓" if current_mode == "compact" else ""), callback_data="display_compact")
        ],
        [
            InlineKeyboardButton("« Retour", callback_data="settings_main")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = f"""
📊 *PARAMÈTRES D'AFFICHAGE*

Mode actuel: *{current_mode.upper()}*

*Mode Détaillé*
• Toutes les informations
• Indicateurs techniques complets
• Détails des signaux

*Mode Compact*
• Informations essentielles
• Rapide à lire
• Idéal mobile

Choisis ton mode préféré.
"""
    await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les clics sur les boutons"""
    import os  # Import nécessaire pour os.path.exists et os.remove
    query = update.callback_query
    await query.answer()
    
    user_name = query.from_user.first_name or query.from_user.username or "ami trader"
    user_id = query.from_user.id
    
    # Envoyer un message privé à l'utilisateur
    bot = context.bot
    
    try:
        if query.data == "open_settings":
            # Ouvrir le panneau de contrôle
            await bot.send_message(
                chat_id=user_id,
                text=f"⚙️ *{user_name}*, ouverture du panneau de contrôle...",
                parse_mode='Markdown'
            )
            
            # Créer un nouvel update simulé pour ouvrir les settings
            from telegram import Message, Chat, User
            
            # Simuler une commande /settings
            user_settings = db.get_user_settings(user_id)
            fav_count = len(db.get_favorites(user_id) or [])
            alert_count = len(db.get_alerts(user_id) or [])
            display_mode = user_settings.get('display_mode', 'Détaillé') if user_settings else 'Détaillé'
            logs_status = "✅ ON" if ENABLE_LIVE_LOGS else "❌ OFF"
            
            keyboard = [
                [
                    InlineKeyboardButton("📌 Favoris", callback_data="settings_favorites"),
                    InlineKeyboardButton("🔔 Alertes", callback_data="settings_alerts")
                ],
                [
                    InlineKeyboardButton("📊 Affichage", callback_data="settings_display"),
                    InlineKeyboardButton("📝 Logs Canal", callback_data="settings_logs")
                ],
                [
                    InlineKeyboardButton("📈 Statistiques", callback_data="settings_stats"),
                    InlineKeyboardButton("🗑️ Réinitialiser", callback_data="settings_reset")
                ],
                [
                    InlineKeyboardButton("❌ Fermer", callback_data="settings_close")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            message = f"""
⚙️ *PANNEAU DE CONTRÔLE - {user_name}*

*VUE D'ENSEMBLE*
📌 Favoris: {fav_count}
🔔 Alertes actives: {alert_count}
📊 Mode affichage: {display_mode}
📝 Logs canal: {logs_status}

*CONFIGURATION*
Utilise les boutons ci-dessous pour gérer tes paramètres.
"""
            
            await bot.send_message(
                chat_id=user_id,
                text=message,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
        elif query.data == "scan_cac40":
            await bot.send_message(
                chat_id=user_id,
                text=f"🔍 *{user_name}*, scan du CAC40 en cours...",
                parse_mode='Markdown'
            )
            
            specific_watchlist = {"CAC40": WATCHLIST["CAC40"]}
            results = scan_market(specific_watchlist, min_score=0)
            summary = format_summary_message(results, top_n=15)
            
            await bot.send_message(
                chat_id=user_id,
                text=summary,
                parse_mode='Markdown'
            )
            
        elif query.data == "scan_dax":
            await bot.send_message(
                chat_id=user_id,
                text=f"🔍 *{user_name}*, scan du DAX en cours...",
                parse_mode='Markdown'
            )
            
            specific_watchlist = {"DAX": WATCHLIST["DAX"]}
            results = scan_market(specific_watchlist, min_score=0)
            summary = format_summary_message(results, top_n=15)
            
            await bot.send_message(
                chat_id=user_id,
                text=summary,
                parse_mode='Markdown'
            )
            
        elif query.data == "scan_us":
            await bot.send_message(
                chat_id=user_id,
                text=f"🔍 *{user_name}*, scan des actions US en cours...",
                parse_mode='Markdown'
            )
            
            specific_watchlist = {"US_TECH": WATCHLIST["US_TECH"]}
            results = scan_market(specific_watchlist, min_score=0)
            summary = format_summary_message(results, top_n=15)
            
            await bot.send_message(
                chat_id=user_id,
                text=summary,
                parse_mode='Markdown'
            )
            
        elif query.data == "top_opportunities":
            await bot.send_message(
                chat_id=user_id,
                text=f"🎯 *{user_name}*, je cherche les meilleures opportunités...",
                parse_mode='Markdown'
            )
            
            results = scan_market(WATCHLIST, min_score=2)
            
            if results:
                summary = format_summary_message(results, top_n=5)
                await bot.send_message(
                    chat_id=user_id,
                    text=summary,
                    parse_mode='Markdown'
                )
                
                for result in results[:3]:
                    message = format_stock_message(result)
                    await bot.send_message(
                        chat_id=user_id,
                        text=message,
                        parse_mode='Markdown'
                    )
                    await asyncio.sleep(1)
            else:
                await bot.send_message(
                    chat_id=user_id,
                    text=f"*{user_name}*, aucune opportunité forte pour le moment.",
                    parse_mode='Markdown'
                )
                
        elif query.data == "analyze_custom":
            await bot.send_message(
                chat_id=user_id,
                text=f"📊 *{user_name}*, pour analyser une action, envoie-moi en privé :\n\n/analyze TICKER\n\nExemple : /analyze AAPL",
                parse_mode='Markdown'
            )
        
        # ===== CALLBACKS GRAPHIQUE ET NEWS =====
        elif query.data.startswith("chart_inline_"):
            ticker = query.data.split("_")[2]
            await query.answer(f"📊 Génération du graphique pour {ticker}...")
            try:
                # Appeler la commande chart existante
                await query.edit_message_text(
                    f"📊 *Graphique {ticker}*\n\n🔧 Fonctionnalité en cours d'implémentation\n\nUtilisez `/chart {ticker}` en attendant",
                    parse_mode='Markdown'
                )
            except Exception as ex:
                print(f"Erreur chart_inline: {ex}")
                await query.answer("❌ Erreur lors de la génération du graphique", show_alert=True)
        
        elif query.data.startswith("news_inline_"):
            ticker = query.data.split("_")[2]
            await query.answer(f"📰 Recherche de news pour {ticker}...")
            try:
                # Appeler la commande news existante
                await query.edit_message_text(
                    f"📰 *News {ticker}*\n\n🔧 Fonctionnalité en cours d'implémentation\n\nUtilisez `/news {ticker}` en attendant",
                    parse_mode='Markdown'
                )
            except Exception as ex:
                print(f"Erreur news_inline: {ex}")
                await query.answer("❌ Erreur lors de la récupération des news", show_alert=True)
        
        elif query.data == "delete_message":
            try:
                await query.delete_message()
            except Exception as ex:
                print(f"Erreur delete_message: {ex}")
                await query.answer("✅ Fermé", show_alert=True)
    

        # GRAPHIQUE - callback depuis analyse
        elif query.data.startswith("chart_"):
            try:
                parts = query.data.replace("chart_", "").split("_")
                ticker = parts[0]
                interval = parts[1] if len(parts) > 1 else "1d"
                
                print(f"[CHART] Demande graphique pour {ticker}, interval={interval}")
                await query.answer("📈 Génération du graphique...")
                
                period_map = {"1h": "5d", "1d": "3mo", "1wk": "1y"}
                period = period_map.get(interval, "3mo")
                
                print(f"[CHART] Analyse de {ticker} avec period={period}, interval={interval}")
                result = analyze_stock(ticker, period=period, interval=interval)
                
                if result:
                    print(f"[CHART] Analyse OK, création du graphique...")
                    graph_path = create_trading_chart(ticker, result, period=period, interval=interval)
                    
                    if graph_path and os.path.exists(graph_path):
                        print(f"[CHART] Graphique créé: {graph_path}")
                        with open(graph_path, 'rb') as photo:
                            caption = f"📊 Graphique technique de {ticker}"
                            await bot.send_photo(chat_id=user_id, photo=photo, caption=caption)
                        os.remove(graph_path)
                        print(f"[CHART] ✅ Graphique envoyé et supprimé")
                    else:
                        print(f"[CHART] ❌ Graphique non créé: {graph_path}")
                        await bot.send_message(chat_id=user_id, text=f"❌ Impossible de générer le graphique pour {ticker}")
                else:
                    print(f"[CHART] ❌ Analyse échouée pour {ticker}")
                    await bot.send_message(chat_id=user_id, text=f"❌ Données manquantes pour {ticker}")
                    
            except Exception as e:
                print(f"[CHART] ❌ ERREUR: {e}")
                import traceback
                traceback.print_exc()
                await bot.send_message(chat_id=user_id, text=f"❌ Erreur technique: {str(e)}")
        
        # PRISE DE POSITION - callback depuis analyse
        elif query.data.startswith("start_trade_"):
            ticker = query.data.replace("start_trade_", "")
            
            await query.answer("🚀 Ouverture du dialogue de trading...")
            
            # Récupérer l'analyse actuelle
            result = analyze_stock(ticker)
            if result:
                score = result['score']
                signal = result['signal']
                price = result['price']
                
                # Déterminer la direction
                if score > 0:
                    direction = "LONG (Achat)"
                    direction_emoji = "📈"
                else:
                    direction = "SHORT (Vente)"
                    direction_emoji = "📉"
                
                # Récupérer AI analysis
                ai = result.get('ai_analysis', {})
                if ai:
                    tp1 = ai.get('tp1', price * 1.03)
                    tp2 = ai.get('tp2', price * 1.05)
                    tp3 = ai.get('tp3', price * 1.08)
                    sl = ai.get('stop_loss', price * 0.97)
                else:
                    tp1 = price * 1.03
                    tp2 = price * 1.05
                    tp3 = price * 1.08
                    sl = price * 0.97
                
                # Wallet balance
                balance = db.get_balance(user_id)
                
                message = f"""
💼 **PRISE DE POSITION** - {ticker}

{direction_emoji} **Direction**: {direction}
📊 **Signal**: {signal}
⭐ **Score**: {score}/10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 **PRIX & OBJECTIFS**

💰 Prix actuel: {price:.2f} EUR

🎯 Take Profit:
   TP1: {tp1:.2f} EUR ({((tp1-price)/price*100):+.1f}%)
   TP2: {tp2:.2f} EUR ({((tp2-price)/price*100):+.1f}%)
   TP3: {tp3:.2f} EUR ({((tp3-price)/price*100):+.1f}%)

🛡️ Stop Loss: {sl:.2f} EUR ({((sl-price)/price*100):+.1f}%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 **WALLET**: {balance:.2f} EUR

💡 **Combien souhaitez-vous investir ?**

Répondez avec un montant (ex: 100) ou un pourcentage (ex: 50%)
"""
                
                # Stocker les infos dans context pour le prochain message
                context.user_data['pending_trade'] = {
                    'ticker': ticker,
                    'direction': 'LONG' if score > 0 else 'SHORT',
                    'price': price,
                    'tp1': tp1,
                    'tp2': tp2,
                    'tp3': tp3,
                    'sl': sl,
                    'signal': signal,
                    'score': score
                }
                
                keyboard = [
                    [
                        InlineKeyboardButton("💰 25%", callback_data=f"trade_amount_{ticker}_25"),
                        InlineKeyboardButton("💰 50%", callback_data=f"trade_amount_{ticker}_50")
                    ],
                    [
                        InlineKeyboardButton("💰 75%", callback_data=f"trade_amount_{ticker}_75"),
                        InlineKeyboardButton("💰 100%", callback_data=f"trade_amount_{ticker}_100")
                    ],
                    [
                        InlineKeyboardButton("❌ Annuler", callback_data="delete_message")
                    ]
                ]
                
                await bot.send_message(
                    chat_id=user_id,
                    text=message,
                    parse_mode='Markdown',
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
            else:
                await bot.send_message(chat_id=user_id, text=f"❌ Impossible d'analyser {ticker}")
        
        # MONTANT TRADE - callback depuis dialogue
        elif query.data.startswith("trade_amount_"):
            parts = query.data.replace("trade_amount_", "").split("_")
            ticker = parts[0]
            percentage = int(parts[1])
            
            await query.answer(f"💰 {percentage}% du wallet sélectionné")
            
            # Récupérer les infos du trade
            trade_info = context.user_data.get('pending_trade', {})
            if not trade_info:
                await bot.send_message(chat_id=user_id, text="❌ Session expirée, relancez l'analyse")
                return
            
            balance = db.get_balance(user_id)
            amount = balance * (percentage / 100)
            
            price = trade_info['price']
            quantity = amount / price
            
            # Calculer les valeurs aux TP/SL
            tp1_value = quantity * trade_info['tp1']
            tp2_value = quantity * trade_info['tp2']
            tp3_value = quantity * trade_info['tp3']
            sl_value = quantity * trade_info['sl']
            
            tp1_profit = tp1_value - amount
            tp2_profit = tp2_value - amount
            tp3_profit = tp3_value - amount
            sl_loss = sl_value - amount
            
            message = f"""
📋 **CONFIRMATION DE POSITION**

{ticker} - {trade_info['direction']}

💰 **Investissement**: {amount:.2f} EUR ({percentage}%)
📊 **Quantité**: {quantity:.4f} actions
💵 **Prix d'entrée**: {price:.2f} EUR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **GAINS POTENTIELS**

TP1: {tp1_profit:+.2f} EUR ({(tp1_profit/amount*100):+.1f}%)
TP2: {tp2_profit:+.2f} EUR ({(tp2_profit/amount*100):+.1f}%)
TP3: {tp3_profit:+.2f} EUR ({(tp3_profit/amount*100):+.1f}%)

🛡️ **PERTE MAXIMALE**
SL: {sl_loss:.2f} EUR ({(sl_loss/amount*100):.1f}%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Wallet après: {balance - amount:.2f} EUR

✅ **Confirmer cette position ?**
"""
            
            keyboard = [
                [
                    InlineKeyboardButton("✅ Confirmer", callback_data=f"trade_confirm_{ticker}_{amount:.2f}"),
                    InlineKeyboardButton("❌ Annuler", callback_data="delete_message")
                ]
            ]
            
            await query.edit_message_text(
                text=message,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        
        # CONFIRMATION TRADE
        elif query.data.startswith("trade_confirm_"):
            parts = query.data.replace("trade_confirm_", "").split("_")
            ticker = parts[0]
            amount = float(parts[1])
            
            await query.answer("✅ Position ouverte!")
            
            trade_info = context.user_data.get('pending_trade', {})
            if trade_info:
                # Enregistrer la position
                success = db.open_position(
                    user_id=user_id,
                    ticker=ticker,
                    direction=trade_info['direction'],
                    entry_price=trade_info['price'],
                    quantity=amount / trade_info['price'],
                    amount=amount,
                    tp1=trade_info['tp1'],
                    tp2=trade_info['tp2'],
                    tp3=trade_info['tp3'],
                    stop_loss=trade_info['sl']
                )
                
                if success:
                    # Déduire du wallet
                    new_balance = db.get_balance(user_id) - amount
                    db.update_balance(user_id, new_balance)
                    
                    message = f"""
✅ **POSITION OUVERTE**

{ticker} - {trade_info['direction']}
💰 Montant: {amount:.2f} EUR
📊 Quantité: {(amount/trade_info['price']):.4f}
💵 Prix: {trade_info['price']:.2f} EUR

🎯 TP1: {trade_info['tp1']:.2f}
🎯 TP2: {trade_info['tp2']:.2f}
🎯 TP3: {trade_info['tp3']:.2f}
🛡️ SL: {trade_info['sl']:.2f}

💵 Wallet restant: {new_balance:.2f} EUR

📊 Utilisez /portfolio pour voir vos positions
"""
                    await query.edit_message_text(text=message, parse_mode='Markdown')
                    
                    # Nettoyer
                    context.user_data.pop('pending_trade', None)
                else:
                    await query.edit_message_text(text="❌ Erreur lors de l'ouverture de la position")
        
        # NEWS - callback depuis analyse
        elif query.data.startswith("news_"):
            ticker = query.data.replace("news_", "")
            
            print(f"[NEWS] Recherche actualités pour {ticker}")
            await query.answer("📰 Recherche des actualités...")
            
            # Rechercher les news
            news_items = get_stock_news_advanced(ticker, limit=8)
            
            if news_items:
                message = f"📰 **ACTUALITÉS** - {ticker}\n"
                message += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                
                for i, article in enumerate(news_items, 1):
                    # Formatter la date
                    from datetime import datetime
                    pub_date = datetime.fromtimestamp(article['published'])
                    date_str = pub_date.strftime('%d/%m/%Y %H:%M')
                    
                    # Sentiment
                    sentiment = article.get('sentiment', {'emoji': '⚪', 'label': 'Neutre'})
                    
                    # Ajouter l'article
                    message += f"{sentiment['emoji']} **{article['title']}**\n"
                    message += f"   📅 {date_str} | 📰 {article['publisher']}\n"
                    message += f"   💭 Sentiment: {sentiment['label']}\n"
                    
                    if article['summary']:
                        # Limiter le résumé à 120 caractères
                        summary = article['summary'][:120]
                        if len(article['summary']) > 120:
                            summary += "..."
                        message += f"   📝 {summary}\n"
                    
                    if article['link']:
                        message += f"   🔗 [Lire]({article['link']})\n"
                    
                    message += "\n"
                
                message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                
                print(f"[NEWS] {len(news_items)} actualité(s) trouvée(s)")
            else:
                message = f"""
📰 **ACTUALITÉS** - {ticker}

❌ Aucune actualité récente trouvée

💡 Sources alternatives:
• [Google Finance](https://www.google.com/finance/quote/{ticker})
• [Yahoo Finance](https://finance.yahoo.com/quote/{ticker})
• [Bloomberg](https://www.bloomberg.com/quote/{ticker})
"""
                print(f"[NEWS] Aucune actualité trouvée pour {ticker}")
            
            keyboard = [[InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]]
            
            await bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard),
                disable_web_page_preview=True
            )
        
        # AJOUTER AUX FAVORIS
        elif query.data.startswith("fav_add_"):
            ticker = query.data.replace("fav_add_", "")
            
            # Ajouter aux favoris
            db.add_favorite(user_id, ticker)
            
            await query.answer(f"⭐ {ticker} ajouté aux favoris!", show_alert=True)
            
            # Message de confirmation
            favorites = db.get_favorites(user_id)
            message = f"""
⭐ **FAVORIS MIS À JOUR**

{ticker} a été ajouté à vos favoris!

📌 Vous avez {len(favorites)} favori(s):
{', '.join(favorites)}

Utilisez /favorites pour voir vos favoris
"""
            
            keyboard = [[InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]]
            
            await bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        
        # ACTUALISER ANALYSE
        elif query.data.startswith("refresh_analysis_"):
            parts = query.data.replace("refresh_analysis_", "").split("_")
            ticker = parts[0]
            interval = parts[1] if len(parts) > 1 else "1d"
            
            await query.answer("🔄 Actualisation en cours...")
            
            period_map = {"1h": "5d", "1d": "3mo", "1wk": "1y"}
            period = period_map.get(interval, "3mo")
            
            result = analyze_stock(ticker, period=period, interval=interval)
            if result:
                message = format_stock_message(result)
                
                # Recréer les boutons
                keyboard = [
                    [
                        InlineKeyboardButton("📈 Voir Graphique", callback_data=f"chart_{ticker}_{interval}"),
                        InlineKeyboardButton("🚀 Prendre Position", callback_data=f"start_trade_{ticker}")
                    ],
                    [
                        InlineKeyboardButton("📰 News", callback_data=f"news_{ticker}"),
                        InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"fav_add_{ticker}")
                    ],
                    [
                        InlineKeyboardButton("🔄 Actualiser", callback_data=f"refresh_analysis_{ticker}_{interval}"),
                        InlineKeyboardButton("❌ Fermer", callback_data="delete_message")
                    ]
                ]
                
                await query.edit_message_text(
                    text=message,
                    parse_mode='Markdown',
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
            else:
                await query.edit_message_text(text=f"❌ Impossible d'actualiser {ticker}")
        
        # DELETE MESSAGE
        elif query.data == "delete_message":
            await query.answer("✅ Fermé")
            await query.message.delete()

    except Exception as e:
        # Si l'utilisateur n'a pas démarré de conversation privée avec le bot
        print(f"Erreur lors de l'envoi du message privé: {e}")
        try:
            await query.edit_message_text(
                text=f"⚠️ *{user_name}*, tu dois d'abord démarrer une conversation privée avec moi !\n\nCherche @CaptenQwarkbot et envoie /start",
                parse_mode='Markdown'
            )
        except:
            pass

# ==================== FONCTION PRINCIPALE ====================





async def chart_inline_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère le bouton Graphique - Affiche menu timeframe"""
    query = update.callback_query
    await query.answer()
    
    ticker = query.data.split("_")[2]
    print(f"[CHART] Menu timeframe pour {ticker}")
    
    message = f"📊 *GRAPHIQUE - {ticker}*\n\nChoisissez la période d'affichage :"
    
    keyboard = [
        [
            InlineKeyboardButton("⚡ 5 min", callback_data=f"chartgen_{ticker}_5m"),
            InlineKeyboardButton("🕐 1 heure", callback_data=f"chartgen_{ticker}_1h")
        ],
        [
            InlineKeyboardButton("📅 1 jour", callback_data=f"chartgen_{ticker}_1d"),
            InlineKeyboardButton("📆 1 semaine", callback_data=f"chartgen_{ticker}_1w")
        ],
        [InlineKeyboardButton("« Retour", callback_data=f"back_to_analysis_{ticker}")]
    ]
    
    try:
        await query.edit_message_text(
            message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    except Exception as e:
        print(f"[CHART] Erreur: {e}")
        await query.answer("❌ Erreur", show_alert=True)


async def chartgen_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Génère graphique professionnel avec bougies + prédiction ML"""
    query = update.callback_query
    await query.answer("📊 Génération du graphique avancé...")
    
    data_parts = query.data.split("_")
    ticker = data_parts[1]
    timeframe = data_parts[2]
    
    print(f"[CHARTGEN] Génération graphique avancé {ticker} - {timeframe}")
    
    # Mappings optimisés pour afficher JUSTE la période demandée
    period_map = {
        "5m": "1d",      # 5min : afficher 1 jour (assez pour voir la tendance)
        "1h": "1d",      # 1h : afficher 1 jour seulement (pas 5 jours!)
        "1d": "1mo",     # 1 jour : afficher 1 mois
        "1w": "3mo"      # 1 semaine : afficher 3 mois
    }
    
    interval_map = {
        "5m": "5m",
        "1h": "1h",
        "1d": "1d",
        "1w": "1wk"
    }
    
    period = period_map.get(timeframe, "1mo")
    interval = interval_map.get(timeframe, "1d")
    
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, interval=interval)
        
        # Limiter le nombre de bougies affichées pour un meilleur zoom
        max_candles = {
            "5m": 50,    # 5min : max 50 bougies (4h d'historique)
            "1h": 24,    # 1h : max 24 bougies (1 jour)
            "1d": 30,    # 1 jour : max 30 bougies (1 mois)
            "1w": 26     # 1 semaine : max 26 bougies (6 mois)
        }
        
        max_len = max_candles.get(timeframe, 30)
        if len(df) > max_len:
            df = df.iloc[-max_len:]  # Garder seulement les N dernières bougies
        
        if df.empty:
            await query.edit_message_text(
                f"❌ Impossible de récupérer les données pour {ticker}",
                parse_mode='Markdown'
            )
            return
        
        # === PRÉDICTION ML ===
        from sklearn.linear_model import LinearRegression
        
        # Préparer données pour ML
        df_ml = df.copy()
        df_ml['Days'] = np.arange(len(df_ml))
        X = df_ml[['Days']].values
        y = df_ml['Close'].values
        
        # Entraîner modèle
        model = LinearRegression()
        model.fit(X, y)
        
        # Prédire 5 périodes futures
        future_days = np.arange(len(df_ml), len(df_ml) + 5).reshape(-1, 1)
        predictions = model.predict(future_days)
        
        # Créer dates futures
        last_date = df.index[-1]
        if interval == "5m":
            future_dates = pd.date_range(last_date, periods=6, freq='5min')[1:]
        elif interval == "1h":
            future_dates = pd.date_range(last_date, periods=6, freq='1h')[1:]
        elif interval == "1d":
            future_dates = pd.date_range(last_date, periods=6, freq='1D')[1:]
        else:
            future_dates = pd.date_range(last_date, periods=6, freq='1W')[1:]
        
        # === CRÉATION DU GRAPHIQUE ===
        plt.style.use('dark_background')
        fig = plt.figure(figsize=(14, 10))
        
        # Grid layout
        gs = fig.add_gridspec(3, 1, height_ratios=[4, 1, 0.5], hspace=0.1)
        ax1 = fig.add_subplot(gs[0])
        ax2 = fig.add_subplot(gs[1], sharex=ax1)
        ax3 = fig.add_subplot(gs[2])
        
        # === BOUGIES JAPONAISES (Ultra-fines) ===
        
        # Calculer largeur basée sur l'intervalle de temps
        time_diff = (df.index[1] - df.index[0]) if len(df) > 1 else pd.Timedelta(hours=1)
        
        # Largeur = 30% de l'intervalle (au lieu de valeur fixe)
        if timeframe == "5m":
            width_candle = pd.Timedelta(minutes=1.5)  # 30% de 5min
        elif timeframe == "1h":
            width_candle = pd.Timedelta(minutes=18)    # 30% de 1h
        elif timeframe == "1d":
            width_candle = pd.Timedelta(hours=7)       # 30% de 1 jour
        else:  # 1w
            width_candle = pd.Timedelta(days=2)        # 30% de 1 semaine
        
        # Épaisseur mèche selon zoom
        if len(df) < 30:
            linewidth_wick = 2.0
        elif len(df) < 80:
            linewidth_wick = 1.5
        else:
            linewidth_wick = 1.0
        
        for i in range(len(df)):
            date = df.index[i]
            open_p = df['Open'].iloc[i]
            close_p = df['Close'].iloc[i]
            high = df['High'].iloc[i]
            low = df['Low'].iloc[i]
            
            # Couleurs plus contrastées
            if close_p >= open_p:
                color_body = '#00ff66'  # Vert plus clair
                color_edge = '#00cc00'
            else:
                color_body = '#ff3333'  # Rouge plus vif
                color_edge = '#cc0000'
            
            # Mèche (high-low) - Plus fine et contrastée
            ax1.plot([date, date], [low, high], 
                    color=color_edge, linewidth=linewidth_wick, alpha=1.0, zorder=2)
            
            # Corps bougie avec bordure
            height = abs(close_p - open_p)
            bottom = min(open_p, close_p)
            
            if height > 0.01:  # Éviter les bougies plates
                ax1.bar(date, height, width=width_candle, bottom=bottom, 
                       color=color_body, alpha=0.85, 
                       edgecolor=color_edge, linewidth=1.5, zorder=3)
            else:
                # Doji - ligne horizontale épaisse
                ax1.plot([date, date], [close_p - 0.5, close_p + 0.5], 
                        color=color_edge, linewidth=3, zorder=3)
        
        # === LIGNE DE PRIX (ULTRA-visible) ===
        ax1.plot(df.index, df['Close'], color='#ff8800', linewidth=3.5, 
                label='Prix de clôture', alpha=1.0, linestyle='-', zorder=5,
                marker='o', markersize=4, markerfacecolor='#ffaa00', 
                markeredgecolor='white', markeredgewidth=1)
        
        # === PRÉDICTION (Plus visible) ===
        # Ligne historique de prédiction - Plus discrète
        historical_pred = model.predict(X)
        ax1.plot(df.index, historical_pred, color='#00dddd', linewidth=1.2, 
                alpha=0.4, linestyle=':', label='Tendance ML', zorder=1)
        
        # Prédiction future - Plus visible
        ax1.plot(future_dates, predictions, color='#ff1493', linewidth=4, 
                alpha=1.0, linestyle='-', marker='o', markersize=8, 
                markerfacecolor='#ff69b4', markeredgecolor='white', 
                markeredgewidth=2, label='🔮 Prédiction', zorder=10)
        
        # Zone de confiance - Plus visible
        ax1.fill_between(future_dates, predictions * 0.98, predictions * 1.02,
                        alpha=0.3, color='#ff1493', zorder=9)
        
        # === STYLE AX1 (Amélioré) ===
        ax1.set_title(f'{ticker} - {timeframe.upper()} | Chandelier Japonais + Prédiction ML', 
                     fontsize=18, fontweight='bold', color='white', pad=20,
                     bbox=dict(boxstyle='round,pad=0.5', facecolor='#1a1a1a', 
                              edgecolor='#444444', linewidth=2))
        ax1.set_ylabel('Prix (EUR)', fontsize=13, color='white', fontweight='bold')
        ax1.grid(True, alpha=0.15, linestyle='--', color='#444444')
        ax1.legend(loc='upper left', fontsize=11, framealpha=0.9,
                  facecolor='#0a0a0a', edgecolor='#666666')
        
        # Fond légèrement plus clair pour mieux voir les bougies
        ax1.set_facecolor('#0f0f0f')
        
        # Ligne verticale séparation présent/futur - Plus visible
        ax1.axvline(x=df.index[-1], color='#ffff00', linewidth=3, 
                   linestyle='--', alpha=0.8, zorder=8)
        ax1.text(df.index[-1], ax1.get_ylim()[1] * 0.98, 'MAINTENANT', 
                rotation=90, verticalalignment='top', 
                fontsize=10, fontweight='bold', color='#ffff00',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='black', alpha=0.7))
        
        # === VOLUME (Amélioré) ===
        colors_vol = ['#ff3333' if df['Close'].iloc[i] < df['Open'].iloc[i] 
                     else '#00ff66' for i in range(len(df))]
        ax2.bar(df.index, df['Volume'], color=colors_vol, alpha=0.7, 
               width=width_candle, edgecolor='none')
        ax2.set_ylabel('Volume', fontsize=12, color='white', fontweight='bold')
        ax2.grid(True, alpha=0.15, color='#444444')
        ax2.set_facecolor('#0f0f0f')
        
        # === INDICATEUR DE TENDANCE ===
        ax3.axis('off')
        
        # Calculer tendance
        trend_pct = ((predictions[-1] - df['Close'].iloc[-1]) / df['Close'].iloc[-1]) * 100
        
        if trend_pct > 2:
            trend_text = f"🚀 TENDANCE HAUSSIÈRE FORTE"
            trend_color = '#00ff00'
        elif trend_pct > 0:
            trend_text = f"📈 TENDANCE HAUSSIÈRE"
            trend_color = '#88ff00'
        elif trend_pct > -2:
            trend_text = f"📉 TENDANCE BAISSIÈRE"
            trend_color = '#ff8800'
        else:
            trend_text = f"⚠️ TENDANCE BAISSIÈRE FORTE"
            trend_color = '#ff0000'
        
        ax3.text(0.5, 0.5, trend_text, 
                ha='center', va='center', fontsize=14, fontweight='bold',
                color=trend_color, transform=ax3.transAxes,
                bbox=dict(boxstyle='round,pad=0.5', facecolor='black', 
                         edgecolor=trend_color, linewidth=2))
        
        # === FORMATAGE DATES ===
        if timeframe == "5m":
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        elif timeframe == "1h":
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%d/%m %H:%M'))
        else:
            ax2.xaxis.set_major_formatter(mdates.DateFormatter('%d/%m/%Y'))
        
        plt.setp(ax1.get_xticklabels(), visible=False)
        plt.xticks(rotation=45)
        
        # === SAUVEGARDE ===
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=120, bbox_inches='tight', 
                   facecolor='#0a0a0a', edgecolor='none')
        buffer.seek(0)
        plt.close()
        
        # === STATISTIQUES ===
        first_price = df['Close'].iloc[0]
        last_price = df['Close'].iloc[-1]
        variation = ((last_price - first_price) / first_price) * 100
        emoji = "🟢" if variation > 0 else "🔴" if variation < 0 else "⚪"
        
        pred_price = predictions[-1]
        pred_change = ((pred_price - last_price) / last_price) * 100
        pred_emoji = "🚀" if pred_change > 2 else "📈" if pred_change > 0 else "📉" if pred_change > -2 else "⚠️"
        
        caption = f"""📊 *{ticker}* - {timeframe.upper()}

━━━━━━━━━━━━━━━━━━━━
💰 *PRIX ACTUEL*
{last_price:.2f} EUR
{emoji} Variation: {variation:+.2f}%

━━━━━━━━━━━━━━━━━━━━
🔮 *PRÉDICTION ML*
{pred_price:.2f} EUR
{pred_emoji} Évolution prévue: {pred_change:+.2f}%

━━━━━━━━━━━━━━━━━━━━
📊 *STATISTIQUES*
📈 Plus haut: {df['High'].max():.2f} EUR
📉 Plus bas: {df['Low'].min():.2f} EUR
📊 Volume moyen: {df['Volume'].mean():.0f}

━━━━━━━━━━━━━━━━━━━━
💡 *LÉGENDE*
🟢 Bougie verte = Hausse
🔴 Bougie rouge = Baisse
🟠 Ligne orange = Prix clôture
🔮 Ligne magenta = Prédiction
💠 Ligne cyan = Tendance ML"""
        
        await query.message.reply_photo(
            photo=buffer,
            caption=caption,
            parse_mode='Markdown'
        )
        
        try:
            await query.message.delete()
        except:
            pass
        
        print(f"[CHARTGEN] Graphique avancé {ticker} envoyé - Pred: {pred_change:+.2f}%")
        
    except Exception as e:
        print(f"[CHARTGEN] Erreur: {e}")
        import traceback
        traceback.print_exc()
        await query.edit_message_text(
            f"❌ *Erreur génération graphique*\n\n{str(e)}",
            parse_mode='Markdown'
        )


async def back_to_analysis_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Retour à l'analyse"""
    query = update.callback_query
    await query.answer()
    
    ticker = query.data.split("_")[3]
    print(f"[BACK] Retour analyse pour {ticker}")
    
    analysis_message = market_analyzer.generate_analysis_message(ticker)
    
    keyboard = []
    if "✅" in analysis_message:
        keyboard.append([InlineKeyboardButton("🚀 Configurer un trade", callback_data=f"trade_start_{ticker}")])
    elif "⚠️" in analysis_message:
        keyboard.append([InlineKeyboardButton("⚠️ Configurer un trade (risqué)", callback_data=f"trade_start_{ticker}")])
    
    keyboard.extend([
        [
            InlineKeyboardButton("📊 Graphique", callback_data=f"chart_inline_{ticker}"),
            InlineKeyboardButton("📰 News", callback_data=f"news_inline_{ticker}")
        ],
        [InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]
    ])
    
    try:
        await query.edit_message_text(
            text=analysis_message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    except Exception as e:
        print(f"[BACK] Erreur: {e}")


async def news_inline_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère le bouton News"""
    query = update.callback_query
    await query.answer("📰 Recherche des news...")
    
    ticker = query.data.split("_")[2]
    print(f"[NEWS] Recherche news pour {ticker}")
    
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        company_name = info.get('longName', ticker)
        
        search_query = f"{company_name} stock news"
        search_url = f"https://www.google.com/search?q={urllib.parse.quote(search_query)}&tbm=nws"
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        
        news_items = []
        
        try:
            response = requests.get(search_url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            articles = soup.find_all('div', class_='SoaBEf')[:5]
            
            for article in articles:
                try:
                    title_elem = article.find('div', class_='n0jPhd')
                    source_elem = article.find('div', class_='CEMjEf')
                    time_elem = article.find('span', class_='OSrXXb')
                    
                    if title_elem:
                        news_items.append({
                            'title': title_elem.get_text(strip=True),
                            'source': source_elem.get_text(strip=True) if source_elem else "Unknown",
                            'time': time_elem.get_text(strip=True) if time_elem else ""
                        })
                except:
                    continue
        except:
            pass
        
        if not news_items:
            news = stock.news[:5] if hasattr(stock, 'news') else []
            for item in news:
                news_items.append({
                    'title': item.get('title', 'Pas de titre'),
                    'source': item.get('publisher', 'Unknown'),
                    'time': ''
                })
        
        if news_items:
            message = f"📰 *NEWS - {ticker}*\n_{company_name}_\n\n"
            for i, item in enumerate(news_items, 1):
                time_str = f" • {item['time']}" if item['time'] else ""
                title = item['title'][:80] + ('...' if len(item['title']) > 80 else '')
                message += f"{i}. *{title}*\n   📍 {item['source']}{time_str}\n\n"
        else:
            message = f"📰 *NEWS - {ticker}*\n\n❌ Aucune news trouvée"
        
        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data=f"news_inline_{ticker}")],
            [InlineKeyboardButton("« Retour", callback_data=f"back_to_analysis_{ticker}")]
        ]
        
        await query.edit_message_text(
            message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown',
            disable_web_page_preview=True
        )
        
        print(f"[NEWS] {len(news_items)} news affichées")
        
    except Exception as e:
        print(f"[NEWS] Erreur: {e}")
        await query.edit_message_text(
            f"❌ *Erreur*\n\n{str(e)}",
            parse_mode='Markdown'
        )


async def delete_message_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Supprime le message courant"""
    query = update.callback_query
    await query.answer()
    await query.delete_message()


# ==================== NOUVELLES COMMANDES - TRADING AVANCÉ ====================

async def analyze_ticker_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /analyser TICKER - Analyse complète avec proposition de trade"""
    if not context.args:
        await update.message.reply_text(
            "💡 *Usage:* /analyser TICKER\n\n*Exemple:* /analyser AAPL",
            parse_mode='Markdown'
        )
        return
    
    ticker = context.args[0].upper()
    
    # Message de chargement
    loading_msg = await update.message.reply_text(
        f"🔍 *Analyse de {ticker} en cours...*\n\n⏳ Récupération des données du marché...",
        parse_mode='Markdown'
    )
    
    # Analyser avec le MarketAnalyzer
    analysis_message = market_analyzer.generate_analysis_message(ticker)
    
    # Supprimer le message de chargement
    await asyncio.sleep(1)
    await loading_msg.delete()
    
    # UN SEUL BOUTON pour prendre position (s'adapte au mode)
    keyboard = []
    
    # Bouton principal de trading
    if "✅" in analysis_message:  # Trade pertinent
        keyboard.append([InlineKeyboardButton("🎯 Prendre Position", callback_data=f"trade_start_{ticker}")])
    elif "⚠️" in analysis_message:  # Possible mais risqué
        keyboard.append([InlineKeyboardButton("⚠️ Prendre Position (risqué)", callback_data=f"trade_start_{ticker}")])
    else:
        keyboard.append([InlineKeyboardButton("📊 Prendre Position", callback_data=f"trade_start_{ticker}")])
    
    keyboard.extend([
        [
            InlineKeyboardButton("📊 Graphique", callback_data=f"chart_inline_{ticker}"),
            InlineKeyboardButton("📰 News", callback_data=f"news_inline_{ticker}")
        ],
        [InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]
    ])
    
    # Envoyer l'analyse
    await update.message.reply_text(
        text=analysis_message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )


async def wallet_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Afficher le wallet paper trading"""
    user_id = update.effective_user.id
    get_or_create_user(user_id)
    
    # Récupérer données wallet
    capital = db.get_portfolio_capital_paper(user_id)
    positions = db.get_user_positions_paper(user_id, 'open')
    stats = db.get_paper_stats(user_id)
    
    # Calculer P&L total des positions ouvertes
    total_pnl = sum(pos.get('pnl', 0) for pos in positions)
    total_invested = sum(pos.get('amount', 0) for pos in positions)
    
    # Capital total = cash + investi + P&L
    total_capital = capital['current_cash'] + total_invested + total_pnl
    
    # Performance
    initial = capital['initial_capital']
    performance = ((total_capital - initial) / initial * 100) if initial > 0 else 0
    
    # Message
    message = f"""💰 *WALLET PAPER TRADING*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *CAPITAL*
Initial: {initial:,.2f} €
Actuel: {total_capital:,.2f} €
Performance: {performance:+.2f}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *RÉPARTITION*
💵 Disponible: {capital['current_cash']:,.2f} €
📈 Investi: {total_invested:,.2f} €
{'🟢' if total_pnl >= 0 else '🔴'} P&L Positions: {total_pnl:+.2f} €

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *STATISTIQUES*
Total trades: {stats.get('total_trades', 0)}
🟢 Gagnants: {stats.get('winners', 0)}
🔴 Perdants: {stats.get('losers', 0)}
Win Rate: {(stats.get('winners', 0) / stats.get('total_trades', 1) * 100) if stats.get('total_trades', 0) > 0 else 0:.1f}%

🚀 Meilleur: {stats.get('best_trade', 0):+.2f} €
💥 Pire: {stats.get('worst_trade', 0):+.2f} €
💰 P&L Total: {stats.get('total_profit', 0):+.2f} €

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *POSITIONS ACTIVES* ({len(positions)})
"""
    
    # Ajouter résumé positions
    for i, pos in enumerate(positions[:5]):
        pnl_emoji = "🟢" if pos.get('pnl', 0) >= 0 else "🔴"
        message += f"\n{pnl_emoji} {pos['ticker']} - {pos['position_type']} x{pos['leverage']}"
        message += f"\n   Capital: {pos['amount']:.2f}€ | P&L: {pos.get('pnl', 0):+.2f}€"
    
    if len(positions) > 5:
        message += f"\n\n... et {len(positions) - 5} autres positions"
    
    # Boutons
    keyboard = [
        [InlineKeyboardButton("📊 Toutes positions", callback_data="view_all_positions")],
        [InlineKeyboardButton("🔄 Actualiser", callback_data="refresh_wallet")],
        [InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]
    ]
    
    await update.message.reply_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def wallet_command_old(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ancienne commande wallet (backup)"""
    user_id = update.effective_user.id
    
    # Ajouter l'utilisateur si nouveau
    get_or_create_user(user_id)
    
    message, markup = wallet_manager.generate_wallet_panel(user_id)
    
    if update.callback_query:
        await update.callback_query.edit_message_text(
            text=message,
            reply_markup=markup,
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            text=message,
            reply_markup=markup,
            parse_mode='Markdown'
        )


async def wallet_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les callbacks du portefeuille"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    action = query.data
    
    if action == "wallet_menu":
        message, markup = wallet_manager.generate_wallet_panel(user_id)
        await query.edit_message_text(text=message, reply_markup=markup, parse_mode='Markdown')
    
    elif action == "wallet_positions":
        message, markup = wallet_manager.generate_positions_panel(user_id)
        await query.edit_message_text(text=message, reply_markup=markup, parse_mode='Markdown')
    
    elif action == "wallet_history":
        history = db.get_portfolio_history(user_id, limit=10)
        
        if not history:
            message = "📈 *HISTORIQUE*\n\n❌ Aucune transaction enregistrée"
        else:
            message = "📈 *HISTORIQUE DES TRANSACTIONS*\n\n"
            for tx in history:
                emoji = "🟢" if tx['action'] == 'BUY' else "🔴"
                message += f"{emoji} {tx['action']} - {tx['ticker']}\n"
                message += f"   Qté: {tx['quantity']:.2f} @ {tx['price']:.2f} EUR\n"
                message += f"   Total: {tx['total']:.2f} EUR\n"
                message += f"   📅 {tx['created_at'][:10]}\n\n"
        
        keyboard = [[InlineKeyboardButton("« Retour", callback_data="wallet_menu")]]
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "wallet_modify":
        message = """
💰 *MODIFIER LE SOLDE TOTAL*

Entrez une valeur entre *1 EUR* et *99 999 EUR*

*Exemple:* 5000

⚠️ Cette action modifiera votre capital initial.
❌ Pour annuler, tapez /cancel
"""
        await query.edit_message_text(text=message, parse_mode='Markdown')
        context.user_data['awaiting_balance'] = True
    
    elif action == "wallet_reset_confirm":
        keyboard = [
            [
                InlineKeyboardButton("✅ Confirmer", callback_data="wallet_reset_yes"),
                InlineKeyboardButton("❌ Annuler", callback_data="wallet_menu")
            ]
        ]
        message = """
⚠️ *RÉINITIALISATION DU PORTEFEUILLE*

Cette action va:
• Supprimer tout l'historique des transactions
• Fermer toutes les positions
• Réinitialiser le capital à 1 000 EUR

❗ *CETTE ACTION EST IRRÉVERSIBLE*

Êtes-vous sûr ?
"""
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action == "wallet_reset_yes":
        db.reset_portfolio(user_id)
        db.update_initial_capital(user_id, 1000.0)
        
        message = """
✅ *PORTEFEUILLE RÉINITIALISÉ*

• Historique supprimé
• Positions fermées
• Capital: 1 000 EUR

Retour au portefeuille...
"""
        await query.edit_message_text(text=message, parse_mode='Markdown')
        await asyncio.sleep(2)
        message, markup = wallet_manager.generate_wallet_panel(user_id)
        await query.edit_message_text(text=message, reply_markup=markup, parse_mode='Markdown')
    
    elif action == "wallet_close":
        await query.delete_message()


async def trade_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les callbacks du système de trading"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    action = query.data
    
    # Démarrer une nouvelle session
    if action.startswith("trade_start_"):
        ticker = action.replace("trade_start_", "")
        await start_trade_session(update, context, ticker)
        return
    
    # Vérifier si une session existe
    if user_id not in active_sessions:
        await query.edit_message_text("❌ Session expirée. Veuillez recommencer avec /analyser")
        return
    
    session = active_sessions[user_id]
    
    # Horizon
    if action.startswith("trade_horizon_"):
        horizon = action.split("_")[-1]
        session.horizon = horizon.upper()
        
        message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

Horizon: *{session.horizon}*

━━━━━━━━━━━━━━━━━━━━
📈 *Type de position ?*
"""
        
        keyboard = [
            [
                InlineKeyboardButton("🟢 LONG", callback_data="trade_type_long"),
                InlineKeyboardButton("🔴 SHORT", callback_data="trade_type_short")
            ],
            [InlineKeyboardButton("🤖 Laisser le bot décider", callback_data="trade_type_auto")],
            [InlineKeyboardButton("❌ Annuler", callback_data="trade_cancel")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    # Type de position
    elif action.startswith("trade_type_"):
        pos_type = action.split("_")[-1].upper()
        
        if pos_type == "AUTO":
            session.position_type = "LONG"  # Par défaut
        else:
            session.position_type = pos_type
        
        message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

Type: *{session.position_type}* {'🟢' if session.position_type == 'LONG' else '🔴'}

━━━━━━━━━━━━━━━━━━━━
⚡ *Utiliser un levier ?*
"""
        
        keyboard = [
            [
                InlineKeyboardButton("❌ Non (x1)", callback_data="trade_lever_1"),
                InlineKeyboardButton("✅ Oui", callback_data="trade_lever_ask")
            ],
            [InlineKeyboardButton("« Retour", callback_data="trade_back_horizon")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    # Levier
    elif action == "trade_lever_1":
        session.leverage = 1
        await ask_amount(query, session)
    
    elif action == "trade_lever_ask":
        message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

⚡ *Niveau de levier souhaité ?*

⚠️ Attention: Un levier élevé amplifie les gains ET les pertes !
"""
        
        keyboard = [
            [
                InlineKeyboardButton("x2", callback_data="trade_lever_2"),
                InlineKeyboardButton("x3", callback_data="trade_lever_3"),
                InlineKeyboardButton("x5", callback_data="trade_lever_5")
            ],
            [
                InlineKeyboardButton("x10", callback_data="trade_lever_10"),
                InlineKeyboardButton("x20", callback_data="trade_lever_20")
            ],
            [InlineKeyboardButton("« Retour", callback_data="trade_back_type")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    elif action.startswith("trade_lever_") and action != "trade_lever_ask" and action != "trade_lever_confirm":
        lever = int(action.split("_")[-1])
        session.leverage = lever
        
        if lever > 5:
            message = f"""
⚠️ *ATTENTION - LEVIER ÉLEVÉ*

Vous avez sélectionné un levier de *x{lever}*

Ce niveau amplifie fortement:
• Les gains potentiels
• Les pertes potentielles
• Le risque de liquidation

Êtes-vous sûr de vouloir continuer ?
"""
            keyboard = [
                [
                    InlineKeyboardButton("✅ Continuer", callback_data="trade_lever_confirm"),
                    InlineKeyboardButton("❌ Modifier", callback_data="trade_lever_ask")
                ]
            ]
            
            await query.edit_message_text(
                text=message,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        else:
            await ask_amount(query, session)
    
    elif action == "trade_lever_confirm":
        await ask_amount(query, session)
    
    elif action == "trade_cancel":
        if user_id in active_sessions:
            del active_sessions[user_id]
        await query.edit_message_text("❌ Trade annulé.")


async def ask_amount(query, session):
    """Demande le montant à investir"""
    capital = db.get_portfolio_capital(session.user_id)
    
    message = f"""
📊 *CONFIGURATION DU TRADE - {session.ticker}*

Capital disponible: *{capital['current_cash']:.2f} EUR*

━━━━━━━━━━━━━━━━━━━━
💰 *Montant à investir ?*

Tapez le montant en EUR (ex: 500)

⚠️ Frais Trade Republic: 2 EUR par trade
❌ Pour annuler, tapez /cancel
"""
    
    await query.edit_message_text(text=message, parse_mode='Markdown')
    # Le montant sera capturé par handle_text_input


async def handle_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les saisies textuelles (montant, modification solde, etc.)"""
    user_id = update.effective_user.id
    text = update.message.text.strip()
    
    # Modification du solde du portefeuille
    if context.user_data.get('awaiting_balance'):
        try:
            amount = float(text)
            if 1 <= amount <= 99999:
                db.update_initial_capital(user_id, amount)
                context.user_data['awaiting_balance'] = False
                
                msg = await update.message.reply_text(
                    f"✅ Solde mis à jour: *{amount:.2f} EUR*",
                    parse_mode='Markdown'
                )
                await asyncio.sleep(2)
                await msg.delete()
                await update.message.delete()
                
# Afficher le wallet paper
                capital = db.get_portfolio_capital_paper(user_id)
                positions = db.get_user_positions_paper(user_id, 'open')
                stats = db.get_paper_stats(user_id)
                
                total_pnl = sum(pos.get('pnl', 0) for pos in positions)
                total_invested = sum(pos.get('amount', 0) for pos in positions)
                total_capital = capital['current_cash'] + total_invested + total_pnl
                initial = capital['initial_capital']
                performance = ((total_capital - initial) / initial * 100) if initial > 0 else 0
                
                message = f"""💰 *WALLET PAPER TRADING*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *CAPITAL*
Initial: {initial:,.2f} €
Actuel: {total_capital:,.2f} €
Performance: {performance:+.2f}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *RÉPARTITION*
💵 Disponible: {capital['current_cash']:,.2f} €
📈 Investi: {total_invested:,.2f} €
{'🟢' if total_pnl >= 0 else '🔴'} P&L Positions: {total_pnl:+.2f} €
"""
                
                keyboard = [
                    [InlineKeyboardButton("📊 Positions", callback_data="view_all_positions")],
                    [InlineKeyboardButton("🔄 Actualiser", callback_data="refresh_wallet")],
                    [InlineKeyboardButton("❌ Fermer", callback_data="delete_message")]
                ]
                
                await update.message.reply_text(
                    text=message,
                    reply_markup=InlineKeyboardMarkup(keyboard),
                    parse_mode='Markdown'
                )
            else:
                await update.message.reply_text(
                    "❌ Montant invalide. Entrez une valeur entre 1 et 99 999 EUR."
                )
        except:
            await update.message.reply_text(
                "❌ Format invalide. Entrez un nombre (ex: 5000)"
            )
        return
    
    # Montant pour un trade PAPER
    if context.user_data.get('awaiting_paper_amount'):
        if user_id in active_paper_sessions:
            session = active_paper_sessions[user_id]
            try:
                amount = float(text)
                capital = db.get_portfolio_capital_paper(user_id) if session.mode == 'paper' else db.get_portfolio_capital(user_id)
                
                if amount <= 0:
                    await update.message.reply_text("❌ Le montant doit être positif.")
                    return
                
                if amount > capital['current_cash']:
                    await update.message.reply_text(
                        f"❌ Montant insuffisant. Disponible: {capital['current_cash']:.2f} EUR"
                    )
                    return
                
                # Enregistrer le montant
                session.amount = amount
                context.user_data['awaiting_paper_amount'] = False
                
                print(f"[PAPER] Montant reçu: {amount} EUR pour user {user_id}")
                
                # Passer aux niveaux TP/SL
                msg = f"""📊 *{session.ticker}* - {session.position_type}

💰 Montant: {amount:.2f} EUR
⚖️ Levier: x{session.leverage}
📈 Exposition: {amount * session.leverage:.2f} EUR

━━━━━━━━━━━━━━━━━━━━
🎯 *NIVEAUX?*

TP et SL seront calculés automatiquement
"""
                keyboard = [
                    [InlineKeyboardButton("✅ OK - Niveaux auto", callback_data="pt_levels_auto")],
                    [InlineKeyboardButton("📝 Personnaliser", callback_data="pt_levels_custom")],
                    [InlineKeyboardButton("❌ Annuler", callback_data="pt_cancel")]
                ]
                
                await update.message.reply_text(
                    msg,
                    reply_markup=InlineKeyboardMarkup(keyboard),
                    parse_mode='Markdown'
                )
                
                # Supprimer le message de l'utilisateur
                try:
                    await update.message.delete()
                except:
                    pass
                
                return
            except ValueError:
                await update.message.reply_text(
                    "❌ Format invalide. Entrez un nombre (ex: 500)"
                )
                return
        else:
            context.user_data['awaiting_paper_amount'] = False
            await update.message.reply_text("❌ Session expirée. Recommencez avec /analyser")
            return
    
    # Montant pour un trade RÉEL
    if user_id in active_sessions:
        session = active_sessions[user_id]
        try:
            amount = float(text)
            capital = db.get_portfolio_capital(user_id)
            
            if amount <= 0:
                await update.message.reply_text("❌ Le montant doit être positif.")
                return
            
            if amount > capital['current_cash']:
                await update.message.reply_text(
                    f"❌ Montant insuffisant. Disponible: {capital['current_cash']:.2f} EUR"
                )
                return
            
            # Enregistrer le montant
            session.amount = amount
            
            # Calculer les niveaux
            levels = session.calculate_levels(session.position_type, session.current_price)
            session.tp1 = levels['tp1']
            session.tp2 = levels['tp2']
            session.stop_loss = levels['stop_loss']
            
            # Générer le ticket
            ticket, viability, risk = session.generate_ticket()
            
            # Boutons de confirmation
            keyboard = []
            
            if viability['viable']:
                keyboard.append([
                    InlineKeyboardButton("✅ Confirmer le trade", callback_data="trade_confirm"),
                    InlineKeyboardButton("❌ Annuler", callback_data="trade_cancel")
                ])
            else:
                keyboard.append([
                    InlineKeyboardButton("❌ Annuler", callback_data="trade_cancel")
                ])
            
            # Supprimer le message de l'utilisateur
            await update.message.delete()
            
            # Envoyer le ticket
            await update.message.reply_text(
                text=ticket,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
            
        except:
            await update.message.reply_text(
                "❌ Format invalide. Entrez un nombre (ex: 500)"
            )


async def start_trade_session(update: Update, context: ContextTypes.DEFAULT_TYPE, ticker):
    """Démarre une session de trading interactive"""
    user_id = update.effective_user.id if update.callback_query else update.effective_user.id
    
    # Créer la session
    session = TradeSession(user_id, ticker)
    active_sessions[user_id] = session
    
    # Récupérer le prix actuel
    try:
        stock = yf.Ticker(ticker)
        data = stock.history(period='1d')
        session.current_price = data['Close'].iloc[-1]
    except:
        if update.callback_query:
            await update.callback_query.edit_message_text(
                "❌ Impossible de récupérer le prix actuel. Trade annulé."
            )
        else:
            await update.message.reply_text(
                "❌ Impossible de récupérer le prix actuel. Trade annulé."
            )
        return
    
    # Demander l'horizon
    message = f"""
📊 *CONFIGURATION DU TRADE - {ticker}*

Prix actuel: *{session.current_price:.2f} EUR*

━━━━━━━━━━━━━━━━━━━━
⏰ *Quel est votre horizon de trading ?*
"""
    
    keyboard = [
        [
            InlineKeyboardButton("⚡ Court terme", callback_data="trade_horizon_court"),
            InlineKeyboardButton("📊 Moyen terme", callback_data="trade_horizon_moyen")
        ],
        [InlineKeyboardButton("📈 Long terme", callback_data="trade_horizon_long")],
        [InlineKeyboardButton("❌ Annuler", callback_data="trade_cancel")]
    ]
    
    if update.callback_query:
        await update.callback_query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )




async def shortcut_analyser_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler pour les raccourcis /cspa, /bnpa, etc."""
    command = update.message.text.lstrip('/').upper()
    
    # Convertir raccourci en ticker: alopa -> ALO.PA
    if len(command) >= 4 and "." not in command:
        # Les 2-3 dernières lettres = extension (PA, AS, etc)
        if command.endswith("PA"):
            ticker = command[:-2] + ".PA"
        elif command.endswith("AS"):
            ticker = command[:-2] + ".AS"
        else:
            ticker = command
    else:
        ticker = command
    
    # Lancer l'analyse
    context.args = [ticker]
    await analyze_command(update, context)

    """Handler pour les raccourcis /cspa, /bnpa, etc."""
    
    # Convertir le raccourci en ticker (ex: cspa -> CS.PA)
        # Ajouter .PA automatiquement si pas de point
    
    # Rediriger vers analyser_command

def main():
    """Fonction principale"""
    print("🤖 Bot Trading démarré!")
    print(f"Actions surveillées: {sum(len(v) for v in WATCHLIST.values())}")
    print(f"Canal ID configuré: {CHANNEL_ID}")
    
    # Créer l'application
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    # Ajouter les handlers
    application.add_handler(CommandHandler("start", start_command))
    
    
    # Callbacks paper trading (AVANT les autres CallbackQueryHandler)
    application.add_handler(CallbackQueryHandler(trade_start_callback, pattern="^trade_start_"))
    application.add_handler(CallbackQueryHandler(paper_callback_handler, pattern="^(pt_|mode_)"))
    application.add_handler(CallbackQueryHandler(delete_message_callback, pattern="^delete_message$"))
    application.add_handler(CallbackQueryHandler(chart_inline_callback, pattern="^chart_inline_"))
    application.add_handler(CallbackQueryHandler(chartgen_callback, pattern="^chartgen_"))
    application.add_handler(CallbackQueryHandler(back_to_analysis_callback, pattern="^back_to_analysis_"))
    application.add_handler(CallbackQueryHandler(news_inline_callback, pattern="^news_inline_"))
    
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("status", status_command))
    # Settings accessible via /menu uniquement
    # application.add_handler(CommandHandler("settings", settings_command))
    # Scans uniquement disponibles via /menu
    # application.add_handler(CommandHandler("scan", scan_command))
    # application.add_handler(CommandHandler("scan_cac40", lambda u, c: scan_specific_command(u, c, "CAC40")))
    # application.add_handler(CommandHandler("scan_dax", lambda u, c: scan_specific_command(u, c, "DAX")))
    # application.add_handler(CommandHandler("scan_us", lambda u, c: scan_specific_command(u, c, "US_TECH")))
    application.add_handler(CommandHandler("analyze", analyze_command))
    application.add_handler(CommandHandler("compare", compare_command))
    application.add_handler(CommandHandler("history", history_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("volatile", volatile_command))
    application.add_handler(CommandHandler("gainer", gainer_command))
    application.add_handler(CommandHandler("loser", loser_command))
    application.add_handler(CommandHandler("autoscan", autoscan_command))
    application.add_handler(CommandHandler("chart", chart_command))
    application.add_handler(CommandHandler("smartnotif", smartnotif_command))
    application.add_handler(CommandHandler("dailyreport", dailyreport_command))
    application.add_handler(CommandHandler("news", news_command))
    application.add_handler(CommandHandler("top", top_command))
    application.add_handler(CommandHandler("menu", menu_command))
    application.add_handler(CommandHandler("fav", fav_command))
    application.add_handler(CommandHandler("alert", alert_command))
    
    # Handlers pour les boutons (ordre important !)
    application.add_handler(CallbackQueryHandler(trade_callback_handler, pattern="^trade_"))
    application.add_handler(CallbackQueryHandler(wallet_callback_handler, pattern="^wallet_"))
    application.add_handler(CallbackQueryHandler(menu_callback_handler, pattern="^menu_"))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Configurer le job_queue pour les alertes (toutes les 5 minutes)
    job_queue = application.job_queue
    job_queue.run_repeating(check_alerts_callback, interval=300, first=10)
    
    # Configurer les scans automatiques programmés
    for scan_time in AUTO_SCAN_TIMES:
        hour, minute = map(int, scan_time.split(":"))
        job_queue.run_daily(auto_scan_callback, time=dt.time(hour=hour, minute=minute))
        print(f"⏰ Scan automatique programmé à {scan_time}")
    
    # Configurer les notifications intelligentes (toutes les heures)
    job_queue.run_repeating(smart_notifications_callback, interval=3600, first=60)
    print("🧠 Notifications intelligentes programmées (toutes les heures)")
    
    # Configurer le rapport quotidien
    hour, minute = map(int, DAILY_REPORT_TIME.split(":"))
    job_queue.run_daily(daily_report_callback, time=dt.time(hour=hour, minute=minute))
    print(f"📋 Rapport quotidien programmé à {DAILY_REPORT_TIME}")
    
    # Démarrer le bot
    print("✅ Bot en écoute sur Telegram...")
    print("🔔 Système d'alertes activé (vérification toutes les 5 minutes)...")
    if AUTO_SCAN_ENABLED:
        print(f"⏰ Scans automatiques activés aux heures : {', '.join(AUTO_SCAN_TIMES)}")
    if SMART_NOTIFICATIONS_ENABLED:
        print("🧠 Notifications intelligentes activées")
    if DAILY_REPORT_ENABLED:
        print(f"📊 Rapport quotidien activé à {DAILY_REPORT_TIME}")

    # ==================== NOUVEAUX HANDLERS - TRADING AVANCÉ ====================
    
    
    # Handler trading interactif
    
    # Handler analyse avancée
    application.add_handler(CommandHandler("analyser", analyze_ticker_command))
    # Handler pour raccourcis (ex: /cspa, /alopa)
    # Handler pour TOUS les raccourcis non gérés (doit être EN DERNIER)
    from telegram.ext import MessageHandler, filters
    application.add_handler(MessageHandler(filters.COMMAND, shortcut_analyser_command))

    
    # Handler pour les montants (quand l'utilisateur tape un montant)
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_input))
    
    application.run_polling()

if __name__ == '__main__':
    # Initialiser la base de données
    print("[INIT] Initialisation de la base de données...")
    init_database()
    print("[INIT] ✅ Base de données prête")
    
    # Lancer le bot
    main()

# ==================== MÉTHODES POUR LE TRACKER ====================

def get_all_active_paper_positions():
    """Récupère toutes les positions papier actives de tous les users"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM paper_positions 
        WHERE status = 'open'
        ORDER BY opened_at DESC
    """)
    positions = [dict(zip([col[0] for col in c.description], row)) for row in c.fetchall()]
    conn.close()
    return positions

def mark_alert_sent(position_id, alert_type):
    """Marque une alerte comme envoyée"""
    conn = get_connection()
    c = conn.cursor()
    c.execute(f"""
        UPDATE paper_positions 
        SET alert_sent_{alert_type} = 1 
        WHERE id = ?
    """, (position_id,))
    conn.commit()
    conn.close()

def update_position_current_price(position_id, current_price, pnl, pnl_pct):
    """Met à jour le prix actuel et P&L d'une position"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions 
        SET current_price = ?, pnl = ?, pnl_pct = ?
        WHERE id = ?
    """, (current_price, pnl, pnl_pct, position_id))
    conn.commit()
    conn.close()

def close_position_paper(position_id, exit_price, pnl, reason):
    """Ferme une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions 
        SET status = 'closed', 
            exit_price = ?, 
            pnl = ?, 
            close_reason = ?,
            closed_at = ?
        WHERE id = ?
    """, (exit_price, pnl, reason, datetime.now().isoformat(), position_id))
    conn.commit()
    conn.close()