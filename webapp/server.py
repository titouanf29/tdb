import os
import random
import sqlite3
import string
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'database' / 'trading_bot.db'
SCHEMA_PATH = ROOT / 'database' / 'schema.sql'
STATIC_DIR = Path(__file__).resolve().parent / 'static'


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
        conn.commit()


def ensure_user(conn, user_id):
    conn.execute(
        'INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)',
        (user_id, f'web_{user_id}', 'Web User'),
    )
    conn.execute('INSERT OR IGNORE INTO user_settings (telegram_id) VALUES (?)', (user_id,))
    conn.execute('INSERT OR IGNORE INTO wallet (telegram_id) VALUES (?)', (user_id,))


def row_to_dict(row):
    return dict(row) if row else None


def list_to_dict(rows):
    return [dict(r) for r in rows]


def generate_position_code():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f'TDB-{suffix}'


def compute_pnl(direction, entry_price, exit_price, amount, leverage):
    if entry_price <= 0:
        return 0.0, 0.0
    if direction == 'LONG':
        pnl_percent = ((exit_price - entry_price) / entry_price) * 100 * leverage
    else:
        pnl_percent = ((entry_price - exit_price) / entry_price) * 100 * leverage
    pnl_value = amount * (pnl_percent / 100)
    return pnl_value, pnl_percent


async def health(_request):
    return web.json_response({'ok': True, 'service': 'tdb-web'})


async def dashboard(request):
    user_id = int(request.match_info['user_id'])
    with get_db() as conn:
        ensure_user(conn, user_id)
        wallet = row_to_dict(conn.execute('SELECT * FROM wallet WHERE telegram_id = ?', (user_id,)).fetchone())
        open_positions = conn.execute(
            "SELECT COUNT(*) AS total, COALESCE(SUM(pnl), 0) AS pnl FROM positions WHERE telegram_id = ? AND status = 'open'",
            (user_id,),
        ).fetchone()
        favorites = conn.execute(
            'SELECT COUNT(*) AS total FROM favorites WHERE telegram_id = ? AND active = 1',
            (user_id,),
        ).fetchone()
        scans = conn.execute(
            "SELECT COUNT(*) AS total FROM scan_results WHERE telegram_id = ? AND date(scan_date) = date('now')",
            (user_id,),
        ).fetchone()
        conn.commit()
    return web.json_response(
        {
            'wallet': wallet,
            'open_positions': dict(open_positions),
            'favorites': dict(favorites),
            'today_scans': dict(scans),
        }
    )


async def get_positions(request):
    user_id = int(request.match_info['user_id'])
    status = request.query.get('status', 'open')
    with get_db() as conn:
        ensure_user(conn, user_id)
        rows = conn.execute(
            'SELECT * FROM positions WHERE telegram_id = ? AND status = ? ORDER BY opened_at DESC LIMIT 200',
            (user_id, status),
        ).fetchall()
        conn.commit()
    return web.json_response({'items': list_to_dict(rows)})


async def create_position(request):
    user_id = int(request.match_info['user_id'])
    payload = await request.json()
    symbol = payload.get('asset_symbol', 'BTC-USD').upper().strip()
    market = payload.get('market', 'CRYPTO').upper().strip()
    direction = payload.get('direction', 'LONG').upper().strip()
    amount = float(payload.get('amount', 100))
    leverage = int(payload.get('leverage', 1))
    entry_price = float(payload.get('entry_price', round(random.uniform(50, 50000), 2)))
    sl = payload.get('stop_loss')
    tp1 = payload.get('take_profit_1')
    tp2 = payload.get('take_profit_2')

    if amount <= 0:
        return web.json_response({'error': 'amount must be > 0'}, status=400)
    if direction not in {'LONG', 'SHORT'}:
        return web.json_response({'error': 'direction must be LONG or SHORT'}, status=400)

    code = generate_position_code()
    with get_db() as conn:
        ensure_user(conn, user_id)
        wallet = conn.execute('SELECT * FROM wallet WHERE telegram_id = ?', (user_id,)).fetchone()
        if wallet['available_balance'] < amount:
            return web.json_response({'error': 'Insufficient available balance'}, status=400)
        conn.execute(
            '''
            INSERT INTO positions
            (telegram_id, position_code, asset_symbol, market, direction, entry_price, amount, leverage, stop_loss, take_profit_1, take_profit_2, current_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (user_id, code, symbol, market, direction, entry_price, amount, leverage, sl, tp1, tp2, entry_price),
        )
        conn.execute(
            'UPDATE wallet SET available_balance = available_balance - ? WHERE telegram_id = ?',
            (amount, user_id),
        )
        position = conn.execute('SELECT * FROM positions WHERE position_code = ?', (code,)).fetchone()
        conn.commit()
    return web.json_response({'created': row_to_dict(position)})


async def close_position(request):
    user_id = int(request.match_info['user_id'])
    code = request.match_info['code']
    payload = await request.json() if request.can_read_body else {}
    exit_price = payload.get('exit_price')

    with get_db() as conn:
        ensure_user(conn, user_id)
        pos = conn.execute(
            'SELECT * FROM positions WHERE position_code = ? AND telegram_id = ?',
            (code, user_id),
        ).fetchone()
        if not pos:
            return web.json_response({'error': 'Position not found'}, status=404)
        if pos['status'] != 'open':
            return web.json_response({'error': 'Position already closed'}, status=400)

        close_price = float(exit_price) if exit_price else float(round(pos['entry_price'] * random.uniform(0.98, 1.02), 4))
        pnl_value, pnl_percent = compute_pnl(
            pos['direction'],
            float(pos['entry_price']),
            close_price,
            float(pos['amount']),
            int(pos['leverage']),
        )

        conn.execute(
            '''
            UPDATE positions
            SET status = 'closed', current_price = ?, pnl = ?, pnl_percent = ?, closed_at = CURRENT_TIMESTAMP, close_reason = ?
            WHERE position_code = ?
            ''',
            (close_price, pnl_value, pnl_percent, payload.get('close_reason', 'manual'), code),
        )
        conn.execute(
            '''
            UPDATE wallet
            SET
                available_balance = available_balance + ? + ?,
                balance = balance + ?,
                total_pnl = total_pnl + ?,
                daily_pnl = daily_pnl + ?,
                weekly_pnl = weekly_pnl + ?
            WHERE telegram_id = ?
            ''',
            (pos['amount'], pnl_value, pnl_value, pnl_value, pnl_value, pnl_value, user_id),
        )
        conn.execute(
            '''
            INSERT INTO position_history
            (telegram_id, position_code, asset_symbol, market, direction, entry_price, exit_price, amount, leverage, pnl, pnl_percent, close_reason, opened_at, closed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''',
            (
                user_id,
                pos['position_code'],
                pos['asset_symbol'],
                pos['market'],
                pos['direction'],
                pos['entry_price'],
                close_price,
                pos['amount'],
                pos['leverage'],
                pnl_value,
                pnl_percent,
                payload.get('close_reason', 'manual'),
                pos['opened_at'],
            ),
        )
        closed = conn.execute('SELECT * FROM positions WHERE position_code = ?', (code,)).fetchone()
        conn.commit()
    return web.json_response({'closed': row_to_dict(closed)})


async def get_favorites(request):
    user_id = int(request.match_info['user_id'])
    with get_db() as conn:
        ensure_user(conn, user_id)
        rows = conn.execute(
            'SELECT * FROM favorites WHERE telegram_id = ? AND active = 1 ORDER BY date_added DESC',
            (user_id,),
        ).fetchall()
        conn.commit()
    return web.json_response({'items': list_to_dict(rows)})


async def add_favorite(request):
    user_id = int(request.match_info['user_id'])
    payload = await request.json()
    symbol = payload.get('asset_symbol', '').upper().strip()
    market = payload.get('market', 'USA').upper().strip()
    if not symbol:
        return web.json_response({'error': 'asset_symbol is required'}, status=400)

    with get_db() as conn:
        ensure_user(conn, user_id)
        conn.execute(
            '''
            INSERT INTO favorites (telegram_id, asset_symbol, market, active)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(telegram_id, asset_symbol) DO UPDATE SET active = 1, market = excluded.market
            ''',
            (user_id, symbol, market),
        )
        row = conn.execute(
            'SELECT * FROM favorites WHERE telegram_id = ? AND asset_symbol = ?',
            (user_id, symbol),
        ).fetchone()
        conn.commit()
    return web.json_response({'favorite': row_to_dict(row)})


async def delete_favorite(request):
    user_id = int(request.match_info['user_id'])
    symbol = request.match_info['symbol'].upper()
    with get_db() as conn:
        ensure_user(conn, user_id)
        conn.execute(
            'UPDATE favorites SET active = 0 WHERE telegram_id = ? AND asset_symbol = ?',
            (user_id, symbol),
        )
        conn.commit()
    return web.json_response({'deleted': symbol})


async def get_settings(request):
    user_id = int(request.match_info['user_id'])
    with get_db() as conn:
        ensure_user(conn, user_id)
        settings = conn.execute('SELECT * FROM user_settings WHERE telegram_id = ?', (user_id,)).fetchone()
        conn.commit()
    return web.json_response({'settings': row_to_dict(settings)})


ALLOWED_SETTINGS = {
    'trading_style',
    'risk_per_position',
    'max_daily_loss',
    'max_weekly_loss',
    'max_leverage',
    'scan_enabled',
    'scan_frequency',
    'scan_markets',
    'score_min',
    'theme',
    'detail_level',
}


async def update_settings(request):
    user_id = int(request.match_info['user_id'])
    payload = await request.json()
    updates = {k: payload[k] for k in payload if k in ALLOWED_SETTINGS}
    if not updates:
        return web.json_response({'error': 'No valid setting fields'}, status=400)

    set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
    values = list(updates.values()) + [user_id]
    with get_db() as conn:
        ensure_user(conn, user_id)
        conn.execute(f'UPDATE user_settings SET {set_clause} WHERE telegram_id = ?', values)
        row = conn.execute('SELECT * FROM user_settings WHERE telegram_id = ?', (user_id,)).fetchone()
        conn.commit()
    return web.json_response({'settings': row_to_dict(row)})


def fake_scan_result(symbol, market):
    score = random.randint(40, 96)
    direction = random.choice(['LONG', 'SHORT', 'NEUTRAL'])
    trend = random.choice(['bullish', 'bearish', 'sideways'])
    return {
        'market': market,
        'asset_symbol': symbol,
        'score': score,
        'direction': direction,
        'trend': trend,
        'volatility': round(random.uniform(1.5, 7.0), 2),
        'volume_rating': random.choice(['low', 'medium', 'high']),
        'risk_level': 'low' if score >= 80 else 'medium' if score >= 60 else 'high',
        'opportunity_type': random.choice(['breakout', 'reversal', 'continuation']),
        'technical_summary': f'Signal {direction} avec score {score}/100.',
        'news_summary': "Pas d'alerte macro négative détectée.",
    }


async def run_scan(request):
    user_id = int(request.match_info['user_id'])
    payload = await request.json() if request.can_read_body else {}
    market = payload.get('market', 'CRYPTO')
    symbols = payload.get('symbols') or ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AAPL', 'NVDA']

    with get_db() as conn:
        ensure_user(conn, user_id)
        created = []
        for symbol in symbols[:20]:
            data = fake_scan_result(symbol, market)
            conn.execute(
                '''
                INSERT INTO scan_results
                (telegram_id, market, asset_symbol, score, direction, trend, volatility, volume_rating, risk_level, opportunity_type, technical_summary, news_summary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    user_id,
                    data['market'],
                    data['asset_symbol'],
                    data['score'],
                    data['direction'],
                    data['trend'],
                    data['volatility'],
                    data['volume_rating'],
                    data['risk_level'],
                    data['opportunity_type'],
                    data['technical_summary'],
                    data['news_summary'],
                ),
            )
            created.append(data)
        conn.commit()
    return web.json_response({'created': created})


async def get_scan_results(request):
    user_id = int(request.match_info['user_id'])
    with get_db() as conn:
        ensure_user(conn, user_id)
        rows = conn.execute(
            'SELECT * FROM scan_results WHERE telegram_id = ? ORDER BY scan_date DESC LIMIT 100',
            (user_id,),
        ).fetchall()
        conn.commit()
    return web.json_response({'items': list_to_dict(rows)})


async def ai_chat(request):
    user_id = int(request.match_info['user_id'])
    payload = await request.json()
    message = payload.get('message', '').strip()
    if not message:
        return web.json_response({'error': 'message is required'}, status=400)

    reply = (
        'Analyse IA rapide: définis ton risque max, confirme la tendance HTF, '
        'et n\'entre que sur un setup avec ratio rendement/risque >= 2.'
    )

    with get_db() as conn:
        ensure_user(conn, user_id)
        conn.execute(
            "INSERT INTO ai_chat_history (telegram_id, role, content, tokens_used) VALUES (?, 'user', ?, ?)",
            (user_id, message, 0),
        )
        conn.execute(
            "INSERT INTO ai_chat_history (telegram_id, role, content, tokens_used) VALUES (?, 'assistant', ?, ?)",
            (user_id, reply, 0),
        )
        conn.commit()
    return web.json_response({'reply': reply})


async def get_ai_history(request):
    user_id = int(request.match_info['user_id'])
    with get_db() as conn:
        ensure_user(conn, user_id)
        rows = conn.execute(
            'SELECT role, content, timestamp FROM ai_chat_history WHERE telegram_id = ? ORDER BY timestamp DESC LIMIT 50',
            (user_id,),
        ).fetchall()
        conn.commit()
    return web.json_response({'items': list_to_dict(rows)})


def app_factory():
    init_db()
    app = web.Application()
    app.router.add_get('/api/health', health)
    app.router.add_get('/api/user/{user_id}/dashboard', dashboard)
    app.router.add_get('/api/user/{user_id}/positions', get_positions)
    app.router.add_post('/api/user/{user_id}/positions', create_position)
    app.router.add_post('/api/user/{user_id}/positions/{code}/close', close_position)
    app.router.add_get('/api/user/{user_id}/favorites', get_favorites)
    app.router.add_post('/api/user/{user_id}/favorites', add_favorite)
    app.router.add_delete('/api/user/{user_id}/favorites/{symbol}', delete_favorite)
    app.router.add_get('/api/user/{user_id}/settings', get_settings)
    app.router.add_put('/api/user/{user_id}/settings', update_settings)
    app.router.add_post('/api/user/{user_id}/scan', run_scan)
    app.router.add_get('/api/user/{user_id}/scan-results', get_scan_results)
    app.router.add_post('/api/user/{user_id}/ai/chat', ai_chat)
    app.router.add_get('/api/user/{user_id}/ai/history', get_ai_history)
    app.router.add_static('/', STATIC_DIR, show_index=True)
    return app


if __name__ == '__main__':
    port = int(os.getenv('WEB_PORT', '8080'))
    web.run_app(app_factory(), host='127.0.0.1', port=port)
