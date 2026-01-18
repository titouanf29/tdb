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
import functools
import concurrent.futures
import multiprocessing
from threading import Lock



#!/usr/bin/env python3
"""
Module Database complet pour le trading bot
"""

import sqlite3
import random
from datetime import datetime



"""
TRADING COMPANION v5.0 - Système de Trading Conversationnel Intelligent + IA Avancée
Intégration complète avec wallet, analyse IA, 15+ indicateurs avancés, backtesting et ML
"""

# ==================== SYSTÈME DE CACHE ET PERFORMANCE ====================

# Cache global pour les analyses
_analysis_cache = {}
_cache_lock = Lock()
CACHE_DURATION = 900  # 15 minutes en secondes

def get_cache_key():
    """Génère une clé de cache basée sur timestamp 15min"""
    now = datetime.now()
    return now.replace(minute=(now.minute // 15) * 15, second=0, microsecond=0).timestamp()

# ==================== NORMALISATION DES TICKERS ====================

def normalize_crypto_ticker(ticker):
    """
    Normalise les tickers crypto pour Yahoo Finance
    Convertit BTCUSD, SOLUSD, etc. en BTC-USD, SOL-USD
    """
    if not ticker:
        return ticker

    ticker_upper = ticker.upper()

    # Liste des cryptos connues (symboles courts)
    crypto_symbols = {
        'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX',
        'DOGE', 'DOT', 'LINK', 'ATOM', 'LTC', 'SHIB'
    }

    # Si le ticker se termine déjà par -USD, c'est bon
    if ticker_upper.endswith('-USD'):
        return ticker_upper

    # Si le ticker se termine par USD sans tiret (ex: BTCUSD, SOLUSD)
    if ticker_upper.endswith('USD') and len(ticker_upper) > 3:
        # Extraire le symbole (tout sauf "USD")
        symbol = ticker_upper[:-3]

        # Vérifier si c'est un crypto connu
        if symbol in crypto_symbols:
            return f"{symbol}-USD"

    # Si c'est juste le symbole (ex: BTC, SOL, ETH)
    if ticker_upper in crypto_symbols:
        return f"{ticker_upper}-USD"

    # Sinon retourner tel quel
    return ticker


# ==================== RÉCUPÉRATION DONNÉES ====================

def safe_fetch_yfinance(symbol, period='3mo', timeout=10, retries=3):
    """
    Récupère les données yfinance de manière sécurisée avec:
    - Timeout
    - Retries
    - Gestion d'erreurs
    - Normalisation automatique des tickers crypto
    """
    # Normaliser le ticker (convertir BTCUSD -> BTC-USD, etc.)
    symbol = normalize_crypto_ticker(symbol)

    for attempt in range(retries):
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)

            if not data.empty and len(data) >= 50:
                return data

            # Si données insuffisantes, attendre un peu et réessayer
            if attempt < retries - 1:
                time.sleep(0.5)

        except Exception as e:
            if attempt == retries - 1:
                print(f"❌ Erreur fetch {symbol}: {e}")
                return None
            time.sleep(1)  # Attendre 1s avant retry

    return None

def validate_data(data):
    """Valide que les données sont exploitables"""
    if data is None or data.empty:
        return False
    if len(data) < 50:  # Besoin minimum 50 barres
        return False
    if data['Close'].isna().any():
        return False
    return True

def get_cached_analysis(ticker):
    """Récupère l'analyse depuis le cache si disponible"""
    cache_key = get_cache_key()
    key = f"{ticker}_{cache_key}"

    with _cache_lock:
        if key in _analysis_cache:
            cached_data, timestamp = _analysis_cache[key]
            # Vérifier que le cache n'est pas expiré
            if time.time() - timestamp < CACHE_DURATION:
                return cached_data

    return None

def set_cached_analysis(ticker, data):
    """Sauvegarde l'analyse dans le cache"""
    cache_key = get_cache_key()
    key = f"{ticker}_{cache_key}"

    with _cache_lock:
        _analysis_cache[key] = (data, time.time())

        # Nettoyage du cache (supprimer entrées > 1h)
        current_time = time.time()
        expired_keys = [k for k, (_, ts) in _analysis_cache.items()
                       if current_time - ts > 3600]
        for k in expired_keys:
            del _analysis_cache[k]

def scan_market_parallel(tickers, min_score=2, max_workers=None):
    """
    Scanne le marché en parallèle pour performance × 10
    """
    if max_workers is None:
        max_workers = min(multiprocessing.cpu_count() * 2, 10)

    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Soumettre tous les tickers en parallèle
        future_to_ticker = {
            executor.submit(analyze_stock_cached, ticker): ticker
            for ticker in tickers
        }

        # Collecter les résultats au fur et à mesure
        for future in concurrent.futures.as_completed(future_to_ticker):
            try:
                result = future.result(timeout=15)  # Timeout 15s par ticker
                if result and abs(result.get('score', 0)) >= min_score:
                    results.append(result)
            except Exception as e:
                ticker = future_to_ticker[future]
                print(f"⚠️ Erreur analyse {ticker}: {e}")

    return sorted(results, key=lambda x: abs(x.get('score', 0)), reverse=True)

def analyze_stock_cached(ticker):
    """Version avec cache de analyze_stock"""
    # Vérifier le cache d'abord
    cached = get_cached_analysis(ticker)
    if cached:
        return cached

    # Si pas de cache, analyser
    result = analyze_stock(ticker)

    # Sauvegarder dans le cache
    if result:
        set_cached_analysis(ticker, result)

    return result

# ==================== CONFIGURATION ALERTES ====================

# ==================== MODULE ANALYSE AVANCÉE ====================

class AdvancedMarketAnalyzer:
    def __init__(self, data):
        self.data = data
        self.close = data['Close']
        self.high = data['High']
        self.low = data['Low']
        self.volume = data['Volume']
    
    def calculate_rsi(self, period=14):
        delta = self.close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1] if not rsi.empty else 50
    
    def get_rsi_status(self, rsi):
        if rsi < 30:
            return {'status': 'Survente', 'emoji': '🔥'}
        elif rsi > 70:
            return {'status': 'Surachat', 'emoji': '❄️'}
        return {'status': 'Neutre', 'emoji': '⚖️'}
    
    def calculate_smart_score(self):
        score = 50
        rsi = self.calculate_rsi()
        
        # RSI
        if rsi < 30:
            score += 20
        elif rsi < 40:
            score += 15
        elif rsi > 70:
            score -= 15
        
        # MACD
        ema12 = self.close.ewm(span=12).mean()
        ema26 = self.close.ewm(span=26).mean()
        if ema12.iloc[-1] > ema26.iloc[-1]:
            score += 15
        
        # Volume
        if len(self.data) > 20:
            vol_ratio = self.volume.iloc[-1] / self.volume.rolling(20).mean().iloc[-1]
            if vol_ratio > 1.5:
                score += 10
        
        # Momentum 1M
        if len(self.close) > 21:
            mom = (self.close.iloc[-1] - self.close.iloc[-21]) / self.close.iloc[-21] * 100
            if mom > 5:
                score += 10
        
        return min(max(score, 0), 100), rsi

# ==================== FIN MODULE ====================



ALERT_CONFIG = {
    'scan_interval': 900,  # 15 minutes en secondes
    'score_threshold': 7,  # Score minimum pour alerte
    'markets_to_scan': ['us', 'europe', 'asia', 'crypto', 'commodities'],
    'max_alerts_per_scan': 5,  # Maximum 5 alertes par scan
    'cooldown_period': 3600,  # 1h entre 2 alertes pour le même ticker
}

# Stockage des alertes récentes (pour éviter spam)
RECENT_ALERTS = {}  # {ticker: timestamp}

# ==================== DÉTECTION D'OPPORTUNITÉS ====================

def detect_opportunities(results, market_type):
    """
    Détecte les vraies opportunités dans les résultats de scan
    
    Critères :
    - Score ≥ 7
    - RSI < 50 (pas suracheté)
    - Performance 1M > 5%
    - Pas d'alerte récente sur ce ticker
    """
    opportunities = []
    current_time = datetime.now().timestamp()
    
    for result in results:
        ticker = result['ticker']
        score = result['score']
        rsi = result['rsi']
        perfs = result.get('performances', {})
        
        # Vérifier cooldown
        if ticker in RECENT_ALERTS:
            last_alert = RECENT_ALERTS[ticker]
            if current_time - last_alert < ALERT_CONFIG['cooldown_period']:
                continue  # Skip, alerte trop récente
        
        # Critères de détection
        if score >= ALERT_CONFIG['score_threshold']:
            if rsi < 50:  # Pas suracheté
                if perfs.get('1m', 0) > 5:  # Bonne performance
                    opportunities.append({
                        'ticker': result['ticker'],
                        'info': result['info'],
                        'price': result['price'],
                        'score': score,
                        'rsi': rsi,
                        'performances': perfs,
                        'market': market_type,
                        'detected_at': datetime.now()
                    })
                    
                    # Enregistrer l'alerte
                    RECENT_ALERTS[ticker] = current_time
    
    return opportunities[:ALERT_CONFIG['max_alerts_per_scan']]


# ==================== ANALYSE IA DES OPPORTUNITÉS ====================

def generate_ai_analysis(opportunity):
    """
    Génère une analyse IA détaillée de l'opportunité
    """
    ticker = opportunity['ticker']
    score = opportunity['score']
    rsi = opportunity['rsi']
    perfs = opportunity['performances']
    market = opportunity['market']
    
    # Évaluation de la tendance
    trend = "haussière forte" if perfs.get('3m', 0) > 15 else "haussière" if perfs.get('3m', 0) > 5 else "stable"
    
    # Momentum
    momentum = "excellent" if perfs.get('1m', 0) > 10 else "bon" if perfs.get('1m', 0) > 5 else "modéré"
    
    # Point d'entrée
    entry_quality = "idéal" if rsi < 40 else "bon" if rsi < 50 else "acceptable"
    
    # Risque
    volatility = abs(perfs.get('1m', 0) - perfs.get('3m', 0))
    risk = "élevé" if volatility > 20 else "modéré" if volatility > 10 else "faible"
    
    # Génération du texte
    analysis = f"""
🤖 *ANALYSE IA - {ticker}*

📊 *Vue d'ensemble*
Tendance {trend} avec un momentum {momentum}. Le RSI à {rsi:.1f} indique un point d'entrée {entry_quality}.

📈 *Performances*
• 1 mois : {perfs.get('1m', 0):+.1f}%
• 3 mois : {perfs.get('3m', 0):+.1f}%

⚡ *Momentum actuel*
L'actif montre une dynamique {momentum} avec une progression soutenue sur le dernier mois.

🎯 *Qualité du point d'entrée*
RSI: {rsi:.1f}/100 → Point d'entrée {entry_quality}
{"✅ Zone de non-surachat, bon timing d'entrée" if rsi < 50 else "⚠️ Légèrement suracheté, attendre correction"}

⚠️ *Niveau de risque*
Risque {risk} basé sur la volatilité récente.

💡 *Recommandation*
"""
    
    # Recommandation basée sur le score
    if score >= 9:
        analysis += """
🟢 *OPPORTUNITÉ FORTE - ACHAT RECOMMANDÉ*

Signal d'achat fort. Tous les indicateurs sont au vert. C'est le moment d'entrer sur ce titre avec une position adaptée à votre profil de risque.

📋 *Plan d'action suggéré :*
1. Analyser en détail via /analyze {ticker}
2. Définir votre taille de position (2-5% du capital)
3. Placer un stop loss à -8%
4. Viser un gain de +15-25%
"""
    elif score >= 7:
        analysis += """
🟡 *OPPORTUNITÉ MODÉRÉE - ACHAT ENVISAGEABLE*

Signal d'achat positif. Plusieurs indicateurs favorables mais nécessite une analyse approfondie avant d'entrer.

📋 *Plan d'action suggéré :*
1. Analyser les détails via /analyze {ticker}
2. Surveiller l'évolution sur 1-2 jours
3. Position modérée (1-3% du capital)
4. Stop loss à -10%
"""
    
    return analysis.format(ticker=ticker)


# ==================== GÉNÉRATION TICKET D'ALERTE ====================

def generate_alert_ticket(opportunity):
    """
    Génère un ticket d'alerte complet avec numéro unique
    """
    ticker = opportunity['ticker']
    market_names = {
        'us': '🇺🇸 Actions US',
        'europe': '🇪🇺 Actions Europe',
        'asia': '🌏 Actions Asie',
        'crypto': '🪙 Crypto',
        'commodities': '⚡ Commodities'
    }
    
    # Numéro de ticket unique
    ticket_id = f"OPP-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    # Emoji selon marché
    market_emoji = market_names.get(opportunity['market'], '📊')
    
    # Qualité de l'opportunité
    quality = "🔥 EXCEPTIONNELLE" if opportunity['score'] >= 9 else "⭐ FORTE" if opportunity['score'] >= 8 else "📈 BONNE"
    
    ticket = f"""
🚨 *ALERTE OPPORTUNITÉ*

━━━━━━━━━━━━━━━━━━━━
🎫 Ticket: `{ticket_id}`
⏰ {opportunity['detected_at'].strftime('%d/%m/%Y %H:%M')}
━━━━━━━━━━━━━━━━━━━━

{quality}

{market_emoji}
*{ticker}* - {opportunity['info'].get('name', ticker)}

💰 Prix actuel : ${opportunity['price']:.2f}
⭐ Score : {opportunity['score']}/10
📊 RSI : {opportunity['rsi']:.1f}

📈 *Performances*
• 1 semaine : {opportunity['performances'].get('1w', 0):+.1f}%
• 1 mois : {opportunity['performances'].get('1m', 0):+.1f}%
• 3 mois : {opportunity['performances'].get('3m', 0):+.1f}%

━━━━━━━━━━━━━━━━━━━━

👉 Cliquez ci-dessous pour l'analyse complète
"""
    
    return ticket, ticket_id


# ==================== SCAN AUTOMATIQUE INTELLIGENT ====================



def is_market_open(market_type):
    """Vérifie si un marché est actuellement ouvert (heure française)"""
    import pytz
    from datetime import datetime

    # Heure actuelle en France
    france_tz = pytz.timezone('Europe/Paris')
    now = datetime.now(france_tz)
    current_hour = now.hour
    weekday = now.weekday()  # 0=Lundi, 6=Dimanche

    # Horaires d'ouverture (heure française)
    market_schedules = {
        'us': {
            'open': 15,   # 15h (9h EST)
            'close': 22,  # 22h (4pm EST)
            'name': 'US'
        },
        'europe': {
            'open': 9,    # 9h
            'close': 17,  # 17h30
            'name': 'Europe'
        },
        'asia': {
            'open': 1,    # 1h du matin (9h Tokyo)
            'close': 9,   # 9h du matin
            'name': 'Asie'
        },
        'crypto': {
            'open': 0,    # 24/7
            'close': 24,
            'name': 'Crypto'
        },
        'commodities': {
            'open': 9,    # 9h
            'close': 22,  # 22h
            'name': 'Commodities'
        }
    }

    schedule = market_schedules.get(market_type)
    if not schedule:
        return True, "Inconnu"

    # Crypto ouvert 24h/24 et 7j/7 (même le week-end)
    if market_type == 'crypto':
        return True, "Ouvert 24h/24, 7j/7"

    # Weekend : tous les autres marchés sont fermés
    if weekday >= 5:  # Samedi ou Dimanche
        return False, "Week-end"

    # Vérifier horaires
    if schedule['open'] <= current_hour < schedule['close']:
        return True, f"Ouvert jusqu'à {schedule['close']}h"
    else:
        return False, f"Fermé (ouvre à {schedule['open']}h)"


async def intelligent_auto_scan(context: ContextTypes.DEFAULT_TYPE):
    """
    Scan automatique toutes les 15min
    Détecte les opportunités sur tous les marchés
    Envoie des alertes push aux utilisateurs
    """
    print("\n" + "="*70)
    print("🔍 SCAN AUTOMATIQUE INTELLIGENT")
    print("="*70)
    print(f"⏰ {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    # Récupérer la DB depuis bot_data ou créer une instance
    try:
        db = context.bot_data.get('db')
        if not db:
            db = TradingBotDB()
    except:
        db = TradingBotDB()
    
    all_opportunities = []
    
    # Scanner tous les marchés
    markets = {
        'us': (US_WATCHLIST, 'us'),
        'asia': (ASIA_WATCHLIST, 'asia'),
        'europe': (EUROPE_WATCHLIST, 'europe'),
        'crypto': (CRYPTO_WATCHLIST, 'crypto'),
        'commodities': (COMMODITIES_WATCHLIST, 'commodities')
    }
    
    for market_name, (watchlist, market_type) in markets.items():
        # Vérifier si le marché est ouvert
        is_open, status = is_market_open(market_name)
        
        if not is_open:
            print(f"\n📊 Scan {market_name.upper()}... ⏸️  Marché fermé ({status})")
            continue
        
        print(f"\n📊 Scan {market_name.upper()}... 🟢 Ouvert ({status})")
        
        results = []
        for ticker, info in watchlist.items():
            try:
                import yfinance as yf
                stock = yf.Ticker(ticker)
                data = stock.history(period='6mo')
                
                if data.empty:
                    continue
                
                current_price = data['Close'].iloc[-1]
                
                # RSI
                delta = data['Close'].diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                rs = gain / loss
                rsi = 100 - (100 / (1 + rs))
                current_rsi = rsi.iloc[-1]
                
                # Performances
                performances = get_multi_period_performance(ticker)
                
                # Score
                score = 5
                if current_rsi < 40:
                    score += 2
                elif current_rsi < 50:
                    score += 1
                
                if performances:
                    if performances.get('1m', 0) > 0:
                        score += 1
                    if performances.get('3m', 0) > 5:
                        score += 1
                
                results.append({
                    'ticker': ticker,
                    'info': info,
                    'price': current_price,
                    'rsi': current_rsi,
                    'performances': performances,
                    'score': score
                })
                
            except Exception as e:
                continue
        
        # Détecter les opportunités
        opportunities = detect_opportunities(results, market_type)
        all_opportunities.extend(opportunities)
        
        if opportunities:
            print(f"   ✅ {len(opportunities)} opportunité(s) détectée(s)")
        else:
            print(f"   ⚪ Aucune opportunité")
    
    print(f"\n📊 TOTAL : {len(all_opportunities)} opportunité(s)")
    
    # Envoyer les alertes aux utilisateurs actifs
    if all_opportunities:
        users = db.get_all_users()
        
        # Si aucun utilisateur trouvé, essayer de récupérer depuis bot_data
        if not users and hasattr(context, 'bot_data'):
            # Stocker le premier user_id qui utilise le bot
            if 'active_users' in context.bot_data:
                users = [(uid,) for uid in context.bot_data['active_users']]
        
        if not users:
            print("👥 Aucun utilisateur enregistré - les alertes seront envoyées lors de la première interaction")
        else:
            print(f"👥 Envoi aux {len(users)} utilisateurs...")
            
            for user in users:
                user_id = user[0]
                
                for opp in all_opportunities:
                    try:
                        await send_opportunity_alert(context.bot, user_id, opp, db)
                    except Exception as e:
                        print(f"   ❌ Erreur envoi à {user_id}: {e}")
            
            print("✅ Alertes envoyées")
    
    print("="*70 + "\n")


# ==================== ENVOI ALERTE ====================

async def send_opportunity_alert(bot, user_id, opportunity, db):
    """
    Envoie une alerte d'opportunité à un utilisateur
    """
    ticker = opportunity['ticker']
    ticket, ticket_id = generate_alert_ticket(opportunity)
    
    # Boutons d'action
    keyboard = [
        [InlineKeyboardButton("📊 Analyse Complète", callback_data=f"alert_analyze_{ticker}")],
        [InlineKeyboardButton("🤖 Analyse IA", callback_data=f"alert_ai_{ticket_id}")],
        [InlineKeyboardButton("🎯 Trading Companion", callback_data=f"companion_step1_{ticker}")],
        [InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"fav_add_{ticker}")],
        [InlineKeyboardButton("🔕 Ignorer", callback_data=f"alert_dismiss_{ticket_id}")]
    ]
    
    # Sauvegarder l'alerte en DB pour historique
    save_alert_to_db(db, user_id, opportunity, ticket_id)
    
    # Envoyer le ticket
    await bot.send_message(
        chat_id=user_id,
        text=ticket,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


# ==================== HANDLERS ALERTES ====================

async def alert_analyze_handler(update, context, user_id, bot, db):
    """Affiche l'analyse complète depuis une alerte"""
    query = update.callback_query
    ticker = query.data.replace("alert_analyze_", "")
    
    await query.answer("📊 Chargement de l'analyse...")
    
    # Rediriger vers analyze_command
    context.args = [ticker]
    
    # Créer un objet update modifié pour analyze_command
    from telegram import Message, Chat, User
    fake_message = Message(
        message_id=0,
        date=datetime.now(),
        chat=Chat(id=user_id, type='private'),
        from_user=User(id=user_id, is_bot=False, first_name="User")
    )
    fake_update = Update(update_id=0, message=fake_message)
    
    await analyze_command(fake_update, context)


async def alert_ai_handler(update, context, user_id, bot, db):
    """Affiche l'analyse IA depuis une alerte"""
    query = update.callback_query
    ticket_id = query.data.replace("alert_ai_", "")
    
    await query.answer()
    
    # Récupérer l'alerte depuis la DB
    alert_data = get_alert_from_db(db, ticket_id)
    
    if not alert_data:
        await query.edit_message_text("❌ Alerte introuvable")
        return
    
    # Générer l'analyse IA
    analysis = generate_ai_analysis(alert_data)
    
    # Boutons
    keyboard = [
        [InlineKeyboardButton("📊 Analyse Technique", callback_data=f"alert_analyze_{alert_data['ticker']}")],
        [InlineKeyboardButton("🤖 Trading Companion", callback_data=f"companion_step1_{alert_data['ticker']}")],
        [InlineKeyboardButton("⬅️ Retour au ticket", callback_data=f"alert_back_{ticket_id}")]
    ]
    
    await query.edit_message_text(
        text=analysis,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def alert_dismiss_handler(update, context, user_id, bot, db):
    """Ignore une alerte"""
    query = update.callback_query
    ticket_id = query.data.replace("alert_dismiss_", "")
    
    await query.answer("🔕 Alerte ignorée")
    
    # Marquer comme ignorée en DB
    mark_alert_dismissed(db, ticket_id)
    
    await query.edit_message_text(
        f"✅ Alerte `{ticket_id}` ignorée.\n\nVous pouvez consulter l'historique avec /alertes",
        parse_mode='Markdown'
    )


# ==================== COMMANDE /ALERTES ====================

async def alertes_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Commande /alertes
    Affiche l'historique et paramètres des alertes
    """
    user_id = update.effective_user.id
    db = TradingBotDB()
    
    # Récupérer les alertes récentes
    alerts = get_user_alerts(db, user_id, limit=10)
    
    if not alerts:
        message = """
🚨 *SYSTÈME D'ALERTES*

Aucune alerte reçue récemment.

📊 *Comment ça marche ?*
Le bot scanne automatiquement tous les marchés toutes les 15 minutes et vous alerte quand une forte opportunité est détectée.

⚙️ *Paramètres actuels*
• Scan : Toutes les 15 min
• Score minimum : 8/15
• Marchés : US, Europe, Asie, Crypto, Commodities

🔔 Les alertes sont activées !
"""
    else:
        message = f"""
🚨 *HISTORIQUE DES ALERTES*

📊 {len(alerts)} alerte(s) récente(s)

"""
        for alert in alerts[:5]:
            status = "🔕" if alert.get('dismissed') else "✅"
            message += f"{status} `{alert['ticket_id']}` - {alert['ticker']} ({alert['created_at']})\n"
        
        message += """

⚙️ *Paramètres*
• Scan : Toutes les 15 min
• Score minimum : 8/15
• Actif sur tous les marchés
"""
    
    keyboard = [
        [InlineKeyboardButton("🔄 Forcer un scan maintenant", callback_data="force_scan")],
        [InlineKeyboardButton("⚙️ Paramètres", callback_data="alert_settings")],
        [InlineKeyboardButton("📊 Statistiques", callback_data="alert_stats")]
    ]
    
    await update.message.reply_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


# ==================== BASE DE DONNÉES ALERTES ====================

def save_alert_to_db(db, user_id, opportunity, ticket_id):
    """Sauvegarde une alerte en base"""
    try:
        conn = sqlite3.connect(db.db_file)
        cursor = conn.cursor()
        
        # Créer la table si nécessaire
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                ticket_id TEXT,
                ticker TEXT,
                market TEXT,
                price REAL,
                score INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                dismissed BOOLEAN DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            INSERT INTO alerts (user_id, ticket_id, ticker, market, price, score)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, ticket_id, opportunity['ticker'], opportunity['market'], 
              opportunity['price'], opportunity['score']))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"[DB ALERT] Erreur sauvegarde: {e}")


def get_alert_from_db(db, ticket_id):
    """Récupère une alerte depuis la DB"""
    # TODO: Implémenter
    return None


def get_user_alerts(db, user_id, limit=10):
    """Récupère les alertes d'un utilisateur"""
    try:
        conn = sqlite3.connect(db.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT ticket_id, ticker, market, score, created_at, dismissed
            FROM alerts
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        
        results = cursor.fetchall()
        conn.close()
        
        alerts = []
        for row in results:
            alerts.append({
                'ticket_id': row[0],
                'ticker': row[1],
                'market': row[2],
                'score': row[3],
                'created_at': row[4],
                'dismissed': bool(row[5])
            })
        
        return alerts
        
    except Exception as e:
        print(f"[DB ALERT] Erreur récupération: {e}")
        return []


def mark_alert_dismissed(db, ticket_id):
    """Marque une alerte comme ignorée"""
    try:
        conn = sqlite3.connect(db.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE alerts SET dismissed = 1 WHERE ticket_id = ?
        ''', (ticket_id,))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"[DB ALERT] Erreur dismiss: {e}")

# ==================== PARAMÈTRES UTILISATEUR ====================

def get_user_alert_settings(db, user_id):
    """Récupère les paramètres d'alerte d'un utilisateur"""
    try:
        conn = sqlite3.connect(db.db_file)
        cursor = conn.cursor()
        
        # Créer la table si nécessaire
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_settings (
                user_id INTEGER PRIMARY KEY,
                min_score INTEGER DEFAULT 8,
                markets TEXT DEFAULT 'us,europe,asia,crypto,commodities',
                scan_interval INTEGER DEFAULT 900,
                max_alerts INTEGER DEFAULT 5,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            SELECT min_score, markets, scan_interval, max_alerts
            FROM alert_settings WHERE user_id = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'min_score': result[0],
                'markets': result[1].split(','),
                'scan_interval': result[2],
                'max_alerts': result[3]
            }
        else:
            # Paramètres par défaut
            return {
                'min_score': 8,
                'markets': ['us', 'europe', 'asia', 'crypto', 'commodities'],
                'scan_interval': 900,
                'max_alerts': 5
            }
    except Exception as e:
        print(f"[SETTINGS] Erreur lecture: {e}")
        return {
            'min_score': 8,
            'markets': ['us', 'europe', 'asia', 'crypto', 'commodities'],
            'scan_interval': 900,
            'max_alerts': 5
        }


def save_user_alert_settings(db, user_id, settings):
    """Sauvegarde les paramètres d'alerte"""
    try:
        conn = sqlite3.connect(db.db_file)
        cursor = conn.cursor()
        
        markets_str = ','.join(settings['markets'])
        
        cursor.execute("""
            INSERT OR REPLACE INTO alert_settings 
            (user_id, min_score, markets, scan_interval, max_alerts, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (user_id, settings['min_score'], markets_str, 
              settings['scan_interval'], settings['max_alerts']))
        
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"[SETTINGS] Erreur sauvegarde: {e}")
        return False


# ==================== DIALOGUE IA PARAMÈTRES ====================

SETTINGS_SESSIONS = {}  # {user_id: {'step': ..., 'data': ...}}

async def alert_settings_start(update, context, user_id, bot, db):
    """Démarre le dialogue de configuration des alertes"""
    query = update.callback_query
    await query.answer()
    
    # Récupérer les paramètres actuels
    current_settings = get_user_alert_settings(db, user_id)
    
    # Initialiser la session
    SETTINGS_SESSIONS[user_id] = {
        'step': 'start',
        'data': current_settings.copy()
    }
    
    markets_names = {
        'us': '🇺🇸 Actions US',
        'europe': '🇪🇺 Actions Europe',
        'asia': '🌏 Actions Asie',
        'crypto': '🪙 Crypto',
        'commodities': '⚡ Commodities'
    }
    
    active_markets = [markets_names.get(m, m) for m in current_settings['markets']]
    
    message = f"""
🤖 *ASSISTANT PARAMÈTRES ALERTES*

Bonjour ! Je vais vous aider à configurer vos alertes personnalisées.

📊 *Paramètres actuels :*
• Score minimum : {current_settings['min_score']}/10
• Marchés actifs : {', '.join(active_markets)}
• Fréquence scan : {current_settings['scan_interval']//60} minutes
• Max alertes/scan : {current_settings['max_alerts']}

💡 *Que souhaitez-vous modifier ?*
"""
    
    keyboard = [
        [InlineKeyboardButton("📊 Score minimum", callback_data="settings_score")],
        [InlineKeyboardButton("🌍 Marchés à scanner", callback_data="settings_markets")],
        [InlineKeyboardButton("⏰ Fréquence de scan", callback_data="settings_interval")],
        [InlineKeyboardButton("✅ Terminer", callback_data="settings_done")],
        [InlineKeyboardButton("❌ Annuler", callback_data="settings_cancel")]
    ]
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def settings_score_handler(update, context, user_id, bot, db):
    """Configure le score minimum"""
    query = update.callback_query
    await query.answer()
    
    current = SETTINGS_SESSIONS.get(user_id, {}).get('data', {}).get('min_score', 7)
    
    message = f"""
📊 *SCORE MINIMUM*

Le score minimum détermine la qualité des opportunités qui déclencheront une alerte.

*Actuellement :* {current}/10

🟢 *Score 7-8* : Bonnes opportunités (recommandé)
→ Plusieurs alertes par jour
→ Qualité correcte

🔥 *Score 13-15* : Opportunités exceptionnelles
→ Peu d'alertes (1-2 par jour)
→ Très haute qualité

⚪ *Score 5-6* : Toutes opportunités
→ Beaucoup d'alertes
→ Qualité variable

💡 *Choisissez votre seuil :*
"""
    
    keyboard = [
        [
            InlineKeyboardButton("⚪ 5", callback_data="score_5"),
            InlineKeyboardButton("⚪ 6", callback_data="score_6"),
            InlineKeyboardButton("🟢 7", callback_data="score_7")
        ],
        [
            InlineKeyboardButton("🟢 8", callback_data="score_8"),
            InlineKeyboardButton("🔥 9", callback_data="score_9"),
            InlineKeyboardButton("🔥 10", callback_data="score_10")
        ],
        [InlineKeyboardButton("⬅️ Retour", callback_data="alert_settings")]
    ]
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def settings_markets_handler(update, context, user_id, bot, db):
    """Configure les marchés à scanner"""
    query = update.callback_query
    await query.answer()
    
    session = SETTINGS_SESSIONS.get(user_id, {})
    current_markets = session.get('data', {}).get('markets', [])
    
    markets_info = {
        'us': ('🇺🇸', 'Actions US', '15 actions tech et blue chips'),
        'europe': ('🇪🇺', 'Actions Europe', '15 actions européennes'),
        'asia': ('🌏', 'Actions Asie', '13 actions asiatiques'),
        'crypto': ('🪙', 'Crypto', '15 cryptomonnaies'),
        'commodities': ('⚡', 'Commodities', '13 ETF commodities')
    }
    
    message = """
🌍 *MARCHÉS À SCANNER*

Sélectionnez les marchés que vous souhaitez surveiller.

"""
    
    for market_id, (emoji, name, desc) in markets_info.items():
        status = "✅" if market_id in current_markets else "⬜"
        message += f"{status} {emoji} *{name}*\n   {desc}\n\n"
    
    message += "💡 *Cliquez pour activer/désactiver*"
    
    keyboard = []
    for market_id, (emoji, name, _) in markets_info.items():
        status = "✅" if market_id in current_markets else "⬜"
        keyboard.append([
            InlineKeyboardButton(
                f"{status} {emoji} {name}",
                callback_data=f"toggle_market_{market_id}"
            )
        ])
    
    keyboard.append([InlineKeyboardButton("⬅️ Retour", callback_data="alert_settings")])
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def toggle_market_handler(update, context, user_id, bot, db):
    """Active/désactive un marché"""
    query = update.callback_query
    market_id = query.data.replace("toggle_market_", "")
    
    # Récupérer les paramètres actuels de la DB
    current_settings = get_user_alert_settings(db, user_id)
    current_markets = current_settings['markets']
    
    if market_id in current_markets:
        current_markets.remove(market_id)
        await query.answer(f"❌ Marché désactivé - Sauvegardé")
    else:
        current_markets.append(market_id)
        await query.answer(f"✅ Marché activé - Sauvegardé")
    
    # Sauvegarder IMMÉDIATEMENT en DB
    current_settings['markets'] = current_markets
    save_user_alert_settings(db, user_id, current_settings)
    
    # Mettre à jour la session aussi
    session = SETTINGS_SESSIONS.get(user_id, {})
    if not session:
        session = {'data': current_settings}
    else:
        session['data']['markets'] = current_markets
    SETTINGS_SESSIONS[user_id] = session
    
    # Réafficher le menu
    await settings_markets_handler(update, context, user_id, bot, db)


async def settings_interval_handler(update, context, user_id, bot, db):
    """Configure l'intervalle de scan"""
    query = update.callback_query
    await query.answer()
    
    current = SETTINGS_SESSIONS.get(user_id, {}).get('data', {}).get('scan_interval', 900)
    current_min = current // 60
    
    message = f"""
⏰ *FRÉQUENCE DE SCAN*

À quelle fréquence souhaitez-vous scanner les marchés ?

*Actuellement :* {current_min} minutes

💡 *Options :*

🚀 *10 min* : Très réactif
→ Détection ultra-rapide

📊 *15 min* : Recommandé
→ Bon équilibre

⏱️ *30 min* : Modéré
→ Opportunités majeures

🕐 *1 heure* : Tranquille
→ Tops opportunités
"""
    
    keyboard = [
        [
            InlineKeyboardButton("🚀 10 min", callback_data="interval_600"),
            InlineKeyboardButton("📊 15 min", callback_data="interval_900")
        ],
        [
            InlineKeyboardButton("⏱️ 30 min", callback_data="interval_1800"),
            InlineKeyboardButton("🕐 1 heure", callback_data="interval_3600")
        ],
        [InlineKeyboardButton("⬅️ Retour", callback_data="alert_settings")]
    ]
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def set_score_handler(update, context, user_id):
    """Enregistre le score choisi"""
    query = update.callback_query
    score = int(query.data.replace("score_", ""))
    
    db = context.bot_data.get("db")
    
    # Récupérer les paramètres actuels
    current_settings = get_user_alert_settings(db, user_id)
    current_settings['min_score'] = score
    
    # Sauvegarder IMMÉDIATEMENT en DB
    save_user_alert_settings(db, user_id, current_settings)
    
    # Mettre à jour la session aussi
    session = SETTINGS_SESSIONS.get(user_id, {})
    if not session:
        session = {'data': current_settings}
    else:
        session['data']['min_score'] = score
    SETTINGS_SESSIONS[user_id] = session
    
    await query.answer(f"✅ Score minimum : {score}/15 - Sauvegardé")
    
    # Retour au menu paramètres
    await alert_settings_start(update, context, user_id, context.bot, db)


async def set_interval_handler(update, context, user_id):
    """Enregistre l'intervalle choisi"""
    query = update.callback_query
    interval = int(query.data.replace("interval_", ""))
    
    db = context.bot_data.get('db')
    
    # Récupérer les paramètres actuels
    current_settings = get_user_alert_settings(db, user_id)
    current_settings['scan_interval'] = interval
    
    # Sauvegarder IMMÉDIATEMENT en DB
    save_user_alert_settings(db, user_id, current_settings)
    
    # Mettre à jour la session aussi
    session = SETTINGS_SESSIONS.get(user_id, {})
    if not session:
        session = {'data': current_settings}
    else:
        session['data']['scan_interval'] = interval
    SETTINGS_SESSIONS[user_id] = session
    
    await query.answer(f"✅ Scan toutes les {interval//60} minutes - Sauvegardé")
    
    # Retour au menu paramètres
    await alert_settings_start(update, context, user_id, context.bot, db)


async def settings_done_handler(update, context, user_id, bot, db):
    """Finalise et sauvegarde les paramètres"""
    query = update.callback_query
    await query.answer("💾 Sauvegarde...")
    
    session = SETTINGS_SESSIONS.get(user_id, {})
    settings = session.get('data', {})
    
    # Sauvegarder
    success = save_user_alert_settings(db, user_id, settings)
    
    # Les paramètres sont déjà enregistrés à chaque modification
    # On récupère juste les paramètres finaux de la DB
    final_settings = get_user_alert_settings(db, user_id)
    
    markets_names = {
        'us': '🇺🇸 US',
        'europe': '🇪🇺 Europe',
        'asia': '🌏 Asie',
        'crypto': '🪙 Crypto',
        'commodities': '⚡ Commodities'
    }
    
    active = [markets_names.get(m, m) for m in final_settings.get('markets', [])]
    
    message = f"""
✅ *CONFIGURATION TERMINÉE*

Vos préférences d'alertes actuelles :

📊 Score minimum : {final_settings.get('min_score', 7)}/10
🌍 Marchés : {', '.join(active)}
⏰ Fréquence : {final_settings.get('scan_interval', 900)//60} min
🔢 Max alertes : {final_settings.get('max_alerts', 5)}

💡 *Note :* Chaque modification a été sauvegardée automatiquement.

🚀 Le prochain scan utilisera ces réglages !
"""
    
    success = True
    
    if success:
        await query.edit_message_text(
            message,
            parse_mode='Markdown'
        )
    else:
        await query.edit_message_text("❌ Erreur lors de la sauvegarde. Réessayez.")
    
    # Nettoyer la session
    if user_id in SETTINGS_SESSIONS:
        del SETTINGS_SESSIONS[user_id]


async def settings_cancel_handler(update, context, user_id):
    """Annule la configuration"""
    query = update.callback_query
    await query.answer("❌ Annulé")
    
    await query.edit_message_text(
        "❌ Configuration annulée.\n\nAucun changement effectué.",
        parse_mode='Markdown'
    )
    
    # Nettoyer la session
    if user_id in SETTINGS_SESSIONS:
        del SETTINGS_SESSIONS[user_id]






# ==================== STOCKAGE DES SESSIONS ====================

TRADING_SESSIONS = {}

def save_trading_session(user_id, data):
    """Sauvegarde une session de trading"""
    TRADING_SESSIONS[user_id] = data
    print(f"[COMPANION] Session sauvegardée pour {user_id}")

def get_trading_session(user_id):
    """Récupère une session de trading"""
    return TRADING_SESSIONS.get(user_id)

def clear_trading_session(user_id):
    """Efface une session de trading"""
    if user_id in TRADING_SESSIONS:
        del TRADING_SESSIONS[user_id]
        print(f"[COMPANION] Session effacée pour {user_id}")


# ==================== ÉTAPE 1: LANCEMENT DU COMPANION ====================

async def companion_start(update, context, ticker, user_id, bot, db):
    """Étape 1: Lancement du Trading Companion avec analyse IA complète"""
    
    print("\n" + "="*70)
    print(f"TRADING COMPANION - LANCEMENT")
    print(f"Ticker: {ticker}, User: {user_id}")
    print("="*70)
    
    # Message d'introduction
    intro = f"""
🤖 *TRADING COMPANION ACTIVÉ*

Bonjour ! Je suis votre assistant de trading personnel.

🎯 Analysons ensemble *{ticker}* pour déterminer si c'est une bonne opportunité.

⏳ *Analyse en cours...*
"""
    
    msg = await bot.send_message(
        chat_id=user_id,
        text=intro,
        parse_mode='Markdown'
    )
    
    # Analyse complète du ticker
    analysis = analyze_stock(ticker)
    
    if not analysis:
        await bot.send_message(
            chat_id=user_id,
            text=f"❌ Impossible d'analyser {ticker}. Ticker invalide ou données manquantes."
        )
        return
    
    # Extraction des données
    score = analysis['score']
    signal = analysis['signal']
    price = analysis['price']
    direction = "LONG (Achat)" if score > 0 else "SHORT (Vente)"
    direction_emoji = "📈" if score > 0 else "📉"
    
    # Récupération de l'analyse IA
    ai = analysis.get('ai_analysis', {})
    tp1 = ai.get('tp1', price * 1.03)
    tp2 = ai.get('tp2', price * 1.05)
    tp3 = ai.get('tp3', price * 1.08)
    sl = ai.get('stop_loss', price * 0.97 if score > 0 else price * 1.03)
    probability = ai.get('probability', 50)
    risk_reward = ai.get('risk_reward', 2.0)
    entry_point = ai.get('entry_point', 'MOYEN')
    
    # Récupérer le wallet
    balance = db.get_balance(user_id)
    
    # Conseils IA personnalisés basés sur l'analyse
    advice_timing = ""
    if entry_point == "EXCELLENT":
        advice_timing = "⭐ *Timing parfait* : Les indicateurs techniques convergent tous dans la même direction. C'est le moment idéal pour entrer."
    elif entry_point == "BON":
        advice_timing = "👍 *Bon moment* : Les conditions sont favorables, même si ce n'est pas le point d'entrée parfait."
    else:
        advice_timing = "⏳ *Attendre* : Les indicateurs sont mixtes. Je recommande d'attendre un signal plus clair."
    
    advice_rr = ""
    if risk_reward >= 2.5:
        advice_rr = "💎 *Ratio R/R exceptionnel* : Pour chaque euro risqué, vous pouvez gagner plus de 2.50€. C'est excellent !"
    elif risk_reward >= 2.0:
        advice_rr = "✨ *Excellent R/R* : Le potentiel de gain justifie largement le risque."
    elif risk_reward >= 1.5:
        advice_rr = "✅ *R/R acceptable* : Le ratio risque/rendement est correct."
    else:
        advice_rr = "⚠️ *R/R faible* : Le potentiel de gain ne compense pas suffisamment le risque."
    
    advice_prob = ""
    if probability >= 75:
        advice_prob = "🎯 *Probabilité très haute* : Mon modèle IA estime que cette position a plus de 75% de chances de réussir."
    elif probability >= 65:
        advice_prob = "📊 *Haute probabilité* : Les chances de succès sont élevées selon mon analyse."
    elif probability >= 50:
        advice_prob = "📈 *Probabilité moyenne* : C'est un 50/50, le marché pourrait aller dans les deux sens."
    else:
        advice_prob = "⚠️ *Faible probabilité* : Mon analyse suggère que cette position est risquée."
    
    advice_rsi = ""
    rsi = analysis.get('rsi', 50)
    if score > 0 and rsi < 35:
        advice_rsi = f"📉 *RSI en survente ({rsi:.0f})* : L'action est techniquement survendue, un rebond est possible."
    elif score < 0 and rsi > 65:
        advice_rsi = f"📈 *RSI en surachat ({rsi:.0f})* : L'action est surachetée, une correction pourrait avoir lieu."
    
    advice_sizing = ""
    if score >= 7:
        advice_sizing = "💰 *Sizing recommandé* : Score élevé, vous pouvez investir 50-75% de votre capital disponible."
    elif score >= 5:
        advice_sizing = "💰 *Sizing recommandé* : Score correct, investissez 30-50% de votre capital."
    elif score >= 3:
        advice_sizing = "💰 *Sizing recommandé* : Score moyen, limitez-vous à 15-30% de votre capital."
    else:
        advice_sizing = "💰 *Sizing recommandé* : Score faible, n'investissez pas plus de 5-15% de votre capital."
    
    # Message d'analyse IA complet
    analysis_message = f"""
🤖 *ANALYSE IA COMPLÈTE - {ticker}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *VUE D'ENSEMBLE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{direction_emoji} *Direction* : {direction}
⭐ *Score* : {score}/15
🎯 *Signal* : {signal}
💰 *Prix actuel* : {price:.2f} EUR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *OBJECTIFS & PROTECTION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *Take Profit 1* : {tp1:.2f} EUR ({((tp1-price)/price*100):+.1f}%)
🟢 *Take Profit 2* : {tp2:.2f} EUR ({((tp2-price)/price*100):+.1f}%)
🟢 *Take Profit 3* : {tp3:.2f} EUR ({((tp3-price)/price*100):+.1f}%)

🔴 *Stop Loss* : {sl:.2f} EUR ({((sl-price)/price*100):+.1f}%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 *CONSEILS IA PERSONNALISÉS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{advice_timing}

{advice_rr}

{advice_prob}

{advice_rsi}

{advice_sizing}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *VOTRE WALLET*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Capital disponible : *{balance:,.2f} EUR*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Souhaitez-vous continuer vers la configuration de votre position ?
"""
    
    # Sauvegarder la session
    session_data = {
        'ticker': ticker,
        'price': price,
        'score': score,
        'signal': signal,
        'direction': direction,
        'tp1': tp1,
        'tp2': tp2,
        'tp3': tp3,
        'sl': sl,
        'probability': probability,
        'risk_reward': risk_reward,
        'balance': balance,
        'step': 'amount'
    }
    save_trading_session(user_id, session_data)
    
    # Boutons
    keyboard = [
        [InlineKeyboardButton("✅ Continuer", callback_data=f"companion_step2_{ticker}")],
        [InlineKeyboardButton("❌ Annuler", callback_data="companion_cancel")]
    ]
    
    await bot.edit_message_text(
        chat_id=user_id,
        message_id=msg.message_id,
        text=analysis_message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[COMPANION] ✅ Analyse envoyée")


# ==================== ÉTAPE 2: DIALOGUE - CHOIX DU MONTANT ====================

async def companion_step2_amount(update, context, ticker, user_id, bot, db):
    """Étape 2: Dialogue pour choisir le montant à investir"""
    
    query = update.callback_query
    await query.answer()
    
    print("\n" + "="*70)
    print(f"COMPANION - ÉTAPE 2: CHOIX MONTANT")
    print(f"User: {user_id}")
    print("="*70)
    
    session = get_trading_session(user_id)
    if not session:
        await query.edit_message_text("❌ Session expirée. Recommencez avec /analyze")
        return
    
    balance = session['balance']
    score = session['score']
    
    # Recommandation basée sur le score
    if score >= 7:
        recommended_pct = 60
        confidence = "très élevée"
    elif score >= 5:
        recommended_pct = 40
        confidence = "élevée"
    elif score >= 3:
        recommended_pct = 20
        confidence = "moyenne"
    else:
        recommended_pct = 10
        confidence = "faible"
    
    recommended_amount = balance * (recommended_pct / 100)
    
    message = f"""
💰 *DÉFINIR VOTRE INVESTISSEMENT*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Votre capital disponible : *{balance:,.2f} EUR*

🤖 *Ma recommandation* : {recommended_amount:,.2f} EUR ({recommended_pct}%)

Avec un score de *{score}/15*, ma confiance dans ce trade est *{confidence}*.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Deux options* :

1️⃣ *Montant personnalisé* : Tapez un montant dans le chat
   Exemple: `1000` ou `2500.50`

2️⃣ *Pourcentage rapide* : Utilisez les boutons ci-dessous

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Montant minimum : 10 EUR
⚠️ Maximum : {balance:,.2f} EUR
"""
    
    # Boutons de pourcentage
    keyboard = [
        [
            InlineKeyboardButton(f"10% ({balance*0.1:.0f}€)", callback_data=f"companion_amt_{ticker}_10"),
            InlineKeyboardButton(f"25% ({balance*0.25:.0f}€)", callback_data=f"companion_amt_{ticker}_25")
        ],
        [
            InlineKeyboardButton(f"50% ({balance*0.5:.0f}€)", callback_data=f"companion_amt_{ticker}_50"),
            InlineKeyboardButton(f"75% ({balance*0.75:.0f}€)", callback_data=f"companion_amt_{ticker}_75")
        ],
        [
            InlineKeyboardButton(f"💎 Recommandé ({recommended_pct}%)", callback_data=f"companion_amt_{ticker}_{recommended_pct}")
        ],
        [
            InlineKeyboardButton("⬅️ Retour", callback_data=f"companion_step1_{ticker}"),
            InlineKeyboardButton("❌ Annuler", callback_data="companion_cancel")
        ]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    # Indiquer qu'on attend un montant
    session['awaiting_amount'] = True
    save_trading_session(user_id, session)
    
    print(f"[COMPANION] ✅ Choix montant affiché")


# ==================== HANDLER: MONTANT TEXTE ====================

async def companion_handle_amount_text(update, context, user_id, text, bot, db):
    """Traite la saisie d'un montant personnalisé"""
    
    session = get_trading_session(user_id)
    if not session or not session.get('awaiting_amount'):
        return False  # Pas pour nous
    
    print(f"\n[AMOUNT TEXT] Reçu: {text}")
    
    # Parser le montant
    try:
        # Enlever espaces, euros, virgules
        clean_text = text.replace(' ', '').replace('€', '').replace(',', '.')
        amount = float(clean_text)
        
        balance = session['balance']
        
        if amount < 10:
            await update.message.reply_text(
                "❌ Montant minimum : 10 EUR",
                parse_mode='Markdown'
            )
            return True
        
        if amount > balance:
            await update.message.reply_text(
                f"❌ Montant maximum : {balance:,.2f} EUR (votre capital disponible)",
                parse_mode='Markdown'
            )
            return True
        
        # Montant valide, passer à l'étape 3
        session['amount'] = amount
        session['awaiting_amount'] = False
        save_trading_session(user_id, session)
        
        await update.message.reply_text("✅ Montant enregistré !")
        
        # Passer à l'étape 3
        ticker = session['ticker']
        await companion_step3_strategy(update, context, ticker, user_id, bot, db, from_text=True)
        
        return True
        
    except ValueError:
        await update.message.reply_text(
            "❌ Montant invalide. Utilisez un nombre (ex: 1000 ou 2500.50)",
            parse_mode='Markdown'
        )
        return True


# ==================== HANDLER: MONTANT BOUTON ====================

async def companion_handle_amount_button(update, context, ticker, percentage, user_id, bot, db):
    """Traite le clic sur un bouton de pourcentage"""
    
    query = update.callback_query
    await query.answer()
    
    session = get_trading_session(user_id)
    if not session:
        await query.edit_message_text("❌ Session expirée")
        return
    
    balance = session['balance']
    amount = balance * (float(percentage) / 100)
    
    session['amount'] = amount
    session['awaiting_amount'] = False
    save_trading_session(user_id, session)
    
    # Passer à l'étape 3
    await companion_step3_strategy(update, context, ticker, user_id, bot, db)


# ==================== ÉTAPE 3: STRATÉGIE DE SORTIE ====================

async def companion_step3_strategy(update, context, ticker, user_id, bot, db, from_text=False):
    """Étape 3: Dialogue pour définir la stratégie de sortie"""
    
    print("\n" + "="*70)
    print(f"COMPANION - ÉTAPE 3: STRATÉGIE")
    print(f"Montant: {get_trading_session(user_id)['amount']:.2f}€")
    print("="*70)
    
    session = get_trading_session(user_id)
    if not session:
        if from_text:
            await context.bot.send_message(chat_id=user_id, text="❌ Session expirée")
        else:
            await update.callback_query.edit_message_text("❌ Session expirée")
        return
    
    amount = session['amount']
    price = session['price']
    tp1 = session['tp1']
    tp2 = session['tp2']
    tp3 = session['tp3']
    sl = session['sl']
    ticker_name = session['ticker']
    
    # Calcul des quantités et gains potentiels
    quantity = amount / price
    
    # Calculs P&L (sans frais pour simplicité)
    gain_tp1 = quantity * (tp1 - price)
    gain_tp2 = quantity * (tp2 - price)
    gain_tp3 = quantity * (tp3 - price)
    loss_sl = quantity * (sl - price)
    
    message = f"""
🎯 *STRATÉGIE DE SORTIE*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *VOTRE POSITION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Montant : *{amount:,.2f} EUR*
📊 Quantité : *{quantity:.2f}* actions
📍 Prix d'entrée : *{price:.2f} EUR*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *MES RECOMMANDATIONS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Je vous propose 3 stratégies adaptées à différents profils :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ *CONSERVATEUR*
   • Take Profit : TP1 ({tp1:.2f}€)
   • Stop Loss : {sl:.2f}€
   • Gain potentiel : +{gain_tp1:,.2f}€ ({(gain_tp1/amount*100):+.1f}%)
   • Perte max : {loss_sl:,.2f}€ ({(loss_sl/amount*100):+.1f}%)
   
   👉 Idéal si vous voulez sécuriser rapidement vos gains

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ *ÉQUILIBRÉ*
   • Take Profit : TP2 ({tp2:.2f}€)
   • Stop Loss : {sl:.2f}€
   • Gain potentiel : +{gain_tp2:,.2f}€ ({(gain_tp2/amount*100):+.1f}%)
   • Perte max : {loss_sl:,.2f}€ ({(loss_sl/amount*100):+.1f}%)
   
   👉 Bon compromis risque/rendement

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *AGRESSIF*
   • Take Profit : TP3 ({tp3:.2f}€)
   • Stop Loss : {sl:.2f}€
   • Gain potentiel : +{gain_tp3:,.2f}€ ({(gain_tp3/amount*100):+.1f}%)
   • Perte max : {loss_sl:,.2f}€ ({(loss_sl/amount*100):+.1f}%)
   
   👉 Maximiser les gains, accepter plus de temps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quelle stratégie correspond le mieux à votre style ?
"""
    
    keyboard = [
        [InlineKeyboardButton("🛡️ Conservateur (TP1)", callback_data=f"companion_strategy_{ticker}_tp1")],
        [InlineKeyboardButton("⚖️ Équilibré (TP2)", callback_data=f"companion_strategy_{ticker}_tp2")],
        [InlineKeyboardButton("🚀 Agressif (TP3)", callback_data=f"companion_strategy_{ticker}_tp3")],
        [
            InlineKeyboardButton("⬅️ Retour", callback_data=f"companion_step2_{ticker}"),
            InlineKeyboardButton("❌ Annuler", callback_data="companion_cancel")
        ]
    ]
    
    if from_text:
        await context.bot.send_message(
            chat_id=user_id,
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    else:
        await update.callback_query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
    
    print(f"[COMPANION] ✅ Stratégies affichées")


# ==================== ÉTAPE 4: CONFIRMATION FINALE ====================

async def companion_step4_confirm(update, context, ticker, strategy, user_id, bot, db):
    """Étape 4: Confirmation finale avant exécution"""
    
    query = update.callback_query
    await query.answer()
    
    print("\n" + "="*70)
    print(f"COMPANION - ÉTAPE 4: CONFIRMATION")
    print(f"Stratégie: {strategy}")
    print("="*70)
    
    session = get_trading_session(user_id)
    if not session:
        await query.edit_message_text("❌ Session expirée")
        return
    
    # Enregistrer la stratégie choisie
    if strategy == 'tp1':
        tp_chosen = session['tp1']
        strategy_name = "Conservateur"
    elif strategy == 'tp2':
        tp_chosen = session['tp2']
        strategy_name = "Équilibré"
    else:  # tp3
        tp_chosen = session['tp3']
        strategy_name = "Agressif"
    
    session['tp_chosen'] = tp_chosen
    session['strategy'] = strategy_name
    save_trading_session(user_id, session)
    
    amount = session['amount']
    price = session['price']
    sl = session['sl']
    balance = session['balance']
    direction = session['direction']
    
    quantity = amount / price
    gain_potential = quantity * (tp_chosen - price)
    loss_potential = quantity * (sl - price)
    
    # Frais Trade Republic: 1€ ouverture + 1€ fermeture = 2€
    fees = 2.0
    net_amount = amount - 1.0  # On enlève les frais d'ouverture
    
    new_balance = balance - amount
    
    message = f"""
✅ *CONFIRMATION FINALE*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *RÉCAPITULATIF DE VOTRE POSITION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Ticker* : {ticker}
{session.get('direction', '📈')} *Direction* : {direction}

💰 *Capital investi* : {amount:,.2f} EUR
💳 *Frais TR* : 2.00 EUR (1€ ouverture + 1€ fermeture)
💵 *Net investi* : {net_amount:,.2f} EUR

📊 *Quantité* : {quantity:.4f} actions
📍 *Prix d'entrée* : {price:.2f} EUR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *STRATÉGIE : {strategy_name.upper()}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *Take Profit* : {tp_chosen:.2f} EUR
   → Gain : *+{gain_potential:.2f} EUR* ({(gain_potential/amount*100):+.1f}%)

🔴 *Stop Loss* : {sl:.2f} EUR
   → Perte : *{loss_potential:.2f} EUR* ({(loss_potential/amount*100):+.1f}%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *IMPACT SUR VOTRE WALLET*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avant : {balance:,.2f} EUR
Après : {new_balance:,.2f} EUR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *Risque maximum* : {abs(loss_potential):.2f} EUR

🤖 Cette position correspond à votre profil *{strategy_name}*.

Confirmez-vous l'ouverture de cette position ?
"""
    
    keyboard = [
        [InlineKeyboardButton("✅ CONFIRMER ET OUVRIR", callback_data=f"companion_execute_{ticker}")],
        [InlineKeyboardButton("⬅️ Modifier la stratégie", callback_data=f"companion_step3_{ticker}")],
        [InlineKeyboardButton("❌ Annuler", callback_data="companion_cancel")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[COMPANION] ✅ Confirmation affichée")


# ==================== ÉTAPE 5: EXÉCUTION ====================

async def companion_execute(update, context, ticker, user_id, bot, db):
    """Étape 5: Exécution de la position et confirmation"""
    
    query = update.callback_query
    await query.answer()
    
    print("\n" + "="*70)
    print(f"COMPANION - ÉTAPE 5: EXÉCUTION")
    print(f"User: {user_id}, Ticker: {ticker}")
    print("="*70)
    
    session = get_trading_session(user_id)
    if not session:
        await query.edit_message_text("❌ Session expirée")
        return
    
    # Récupérer toutes les données
    amount = session['amount']
    price = session['price']
    tp_chosen = session['tp_chosen']
    sl = session['sl']
    direction = session['direction']
    strategy = session['strategy']
    score = session['score']
    
    quantity = amount / price
    
    # Créer la position dans la DB
    position_type = 'long' if 'LONG' in direction else 'short'
    
    try:
        # Paramètres pour add_position_paper
        leverage = 1  # Pas de levier
        exposure = amount * leverage  # Exposition totale
        
        position_id = db.add_position_paper(
            user_id=user_id,
            ticker=ticker,
            position_type=position_type,
            product_type='action',
            entry_price=price,
            leverage=leverage,
            amount=amount,
            exposure=exposure,
            tp1=tp_chosen,
            tp2=tp_chosen,
            stop_loss=sl,
            barrier_knockout=None,
            horizon='court',
            trailing_stop=False
        )
        
        # Débiter le wallet (passer un montant négatif pour soustraire)
        db.update_portfolio_cash_paper(user_id, -amount)
        
        print(f"[COMPANION] ✅ Position #{position_id} créée")
        
        # Récupérer le nouveau solde réel depuis la DB
        new_balance = session['balance'] - amount
        
        # Message de succès
        success_message = f"""
🎉 *POSITION OUVERTE AVEC SUCCÈS !*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *CONFIRMATION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Position #{position_id} créée

🎯 *{ticker}* - {direction}
⭐ Score : {score}/15
🏷️ Stratégie : {strategy}

💰 Montant : {amount:,.2f} EUR
📊 Quantité : {quantity:.4f} actions
📍 Prix : {price:.2f} EUR

🟢 Take Profit : {tp_chosen:.2f} EUR
🔴 Stop Loss : {sl:.2f} EUR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *NOUVEAU WALLET*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Capital disponible : {new_balance:,.2f} EUR
📈 En position : {amount:,.2f} EUR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Je surveille cette position en temps réel.
Vous recevrez des notifications automatiques :

• ✅ Quand un objectif (TP) est atteint
• ⚠️ Si le prix approche du Stop Loss
• 📊 Rapport quotidien de performance

Bonne chance ! 🚀
"""
        
        keyboard = [
            [InlineKeyboardButton("📊 Voir mes positions", callback_data="menu_wallet")],
            [InlineKeyboardButton("🔔 Configurer alertes", callback_data="menu_alerts")],
            [InlineKeyboardButton("✅ Fermer", callback_data="delete_message")]
        ]
        
        await query.edit_message_text(
            text=success_message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        
        # Nettoyer la session
        clear_trading_session(user_id)
        
        print(f"[COMPANION] ✅ Exécution terminée avec succès")
        
    except Exception as e:
        print(f"[COMPANION] ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        
        await query.edit_message_text(
            f"❌ Erreur lors de l'ouverture de la position: {str(e)}"
        )


# ==================== HANDLER: ANNULATION ====================

async def companion_cancel(update, context, user_id, bot):
    """Annule le processus de trading"""
    
    query = update.callback_query
    await query.answer()
    
    clear_trading_session(user_id)
    
    await query.edit_message_text(
        "❌ *Processus annulé*\n\nVotre Trading Companion est toujours disponible.",
        parse_mode='Markdown'
    )
    
    print(f"[COMPANION] Session annulée pour {user_id}")




"""
SYSTÈME DE GESTION DES POSITIONS
Affichage, performances, fermeture et mise à jour wallet
"""

# ==================== AFFICHAGE TOUTES LES POSITIONS ====================

async def view_all_positions_handler(update, context, user_id, bot, db):
    """Affiche toutes les positions actives avec détails et options de fermeture"""
    
    query = update.callback_query
    await query.answer()
    
    print(f"\n[POSITIONS] Affichage pour user {user_id}")
    
    # Récupérer toutes les positions
    positions = db.get_user_positions_paper(user_id, 'open')
    
    if not positions:
        await query.edit_message_text(
            "📊 *AUCUNE POSITION ACTIVE*\n\nVous n'avez aucune position ouverte pour le moment.",
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour Wallet", callback_data="menu_wallet")
            ]])
        )
        return
    
    # Récupérer les prix actuels pour chaque position
    import yfinance as yf
    
    total_pnl = 0
    total_invested = 0
    
    message = f"📊 *VOS POSITIONS ACTIVES ({len(positions)})*\n\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    keyboard = []
    
    for i, pos in enumerate(positions, 1):
        ticker = pos['ticker']
        position_type = pos['position_type']
        entry_price = pos['entry_price']
        amount = pos['amount']
        quantity = amount / entry_price
        tp1 = pos['tp1']
        sl = pos['stop_loss']
        leverage = pos.get('leverage', 1)
        
        # Récupérer prix actuel
        try:
            stock = yf.Ticker(ticker)
            current_data = stock.history(period='1d')
            if not current_data.empty:
                current_price = current_data['Close'].iloc[-1]
            else:
                current_price = entry_price
        except:
            current_price = entry_price
        
        # Calculer P&L
        if position_type == 'long':
            pnl = (current_price - entry_price) * quantity
            pnl_pct = ((current_price - entry_price) / entry_price) * 100
        else:  # short
            pnl = (entry_price - current_price) * quantity
            pnl_pct = ((entry_price - current_price) / entry_price) * 100
        
        total_pnl += pnl
        total_invested += amount
        
        # Emoji selon performance
        if pnl > 0:
            pnl_emoji = "🟢"
        elif pnl < 0:
            pnl_emoji = "🔴"
        else:
            pnl_emoji = "⚪"
        
        # Direction emoji
        dir_emoji = "📈" if position_type == 'long' else "📉"
        
        # Message pour cette position
        message += f"{pnl_emoji} *Position #{pos['id']} - {ticker}*\n"
        message += f"{dir_emoji} {position_type.upper()} x{leverage}\n"
        message += f"💰 Investi: {amount:,.2f}€\n"
        message += f"📊 Quantité: {quantity:.4f}\n"
        message += f"📍 Entry: {entry_price:.2f}€\n"
        message += f"💹 Actuel: {current_price:.2f}€\n"
        message += f"\n"
        message += f"🎯 TP: {tp1:.2f}€ | 🛡️ SL: {sl:.2f}€\n"
        message += f"\n"
        message += f"{'🟢' if pnl >= 0 else '🔴'} *P&L: {pnl:+,.2f}€ ({pnl_pct:+.2f}%)*\n"
        message += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # Bouton pour fermer cette position
        keyboard.append([
            InlineKeyboardButton(
                f"{'🟢' if pnl >= 0 else '🔴'} Fermer {ticker} ({pnl:+.0f}€)",
                callback_data=f"close_pos_{pos['id']}"
            )
        ])
    
    # Résumé global
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0
    
    message += "\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    message += "📈 *RÉSUMÉ GLOBAL*\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    message += f"💰 Total investi: {total_invested:,.2f}€\n"
    message += f"{'🟢' if total_pnl >= 0 else '🔴'} *P&L Total: {total_pnl:+,.2f}€ ({total_pnl_pct:+.2f}%)*\n"
    
    # Boutons de navigation
    keyboard.extend([
        [
            InlineKeyboardButton("🔄 Actualiser", callback_data="view_all_positions"),
            InlineKeyboardButton("📊 Statistiques", callback_data="menu_wallet")
        ],
        [InlineKeyboardButton("⬅️ Retour", callback_data="menu_wallet")]
    ])
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[POSITIONS] ✅ {len(positions)} positions affichées")


# ==================== FERMETURE POSITION ====================

async def close_position_handler(update, context, position_id, user_id, bot, db):
    """Ferme une position et met à jour le wallet"""
    
    query = update.callback_query
    await query.answer()
    
    print(f"\n[CLOSE] Fermeture position #{position_id}")
    
    try:
        # Récupérer la position
        print(f"[CLOSE] Récupération position...")
        position = db.get_position_paper(position_id)
        print(f"[CLOSE] Position: {position}")
        
        if not position or position['user_id'] != user_id:
            print(f"[CLOSE] ❌ Position introuvable ou mauvais user")
            await query.answer("❌ Position introuvable", show_alert=True)
            return
        
        if position['status'] != 'open':
            print(f"[CLOSE] ❌ Position déjà fermée")
            await query.answer("❌ Position déjà fermée", show_alert=True)
            return
        
        # Récupérer prix actuel
        ticker = position['ticker']
        entry_price = position['entry_price']
        amount = position['amount']
        position_type = position['position_type']
        quantity = amount / entry_price
        
        print(f"[CLOSE] Récupération prix actuel {ticker}...")
        import yfinance as yf
        try:
            stock = yf.Ticker(ticker)
            current_data = stock.history(period='1d')
            if not current_data.empty:
                current_price = current_data['Close'].iloc[-1]
            else:
                current_price = entry_price
        except:
            current_price = entry_price
        
        print(f"[CLOSE] Prix: Entry={entry_price:.2f}, Current={current_price:.2f}")
        
        # Calculer P&L final
        if position_type == 'long':
            pnl = (current_price - entry_price) * quantity
            pnl_pct = ((current_price - entry_price) / entry_price) * 100
        else:  # short
            pnl = (entry_price - current_price) * quantity
            pnl_pct = ((entry_price - current_price) / entry_price) * 100
        
        print(f"[CLOSE] P&L calculé: {pnl:+.2f}€ ({pnl_pct:+.2f}%)")
        
        # Montant à recréditer au wallet
        final_amount = amount + pnl  # Capital initial + gain/perte
        
        # Mettre à jour la position (statut closed)
        print(f"[CLOSE] Fermeture dans la DB...")
        db.close_position_paper(position_id, current_price, pnl, pnl_pct, 'manual')
        print(f"[CLOSE] ✅ Position fermée dans DB")
        
        # Recréditer le wallet
        print(f"[CLOSE] Crédit wallet: +{final_amount:.2f}€")
        db.update_portfolio_cash_paper(user_id, final_amount)
        print(f"[CLOSE] ✅ Wallet crédité")
        
        # Récupérer nouveau solde
        capital = db.get_portfolio_capital_paper(user_id)
        new_balance = capital['current_cash']
        
        print(f"[CLOSE] ✅ Position #{position_id} fermée | P&L: {pnl:+.2f}€ | Nouveau solde: {new_balance:.2f}€")
        
        # Message de confirmation
        if pnl >= 0:
            emoji = "🎉"
            result = "GAIN"
        else:
            emoji = "😞"
            result = "PERTE"
        
        message = f"""
{emoji} *POSITION FERMÉE - {result}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *DÉTAILS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 {ticker} - {position_type.upper()}
📍 Entry: {entry_price:.2f}€
💹 Exit: {current_price:.2f}€
📊 Quantité: {quantity:.4f}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *RÉSULTAT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Capital investi: {amount:,.2f}€
{'🟢' if pnl >= 0 else '🔴'} *P&L: {pnl:+,.2f}€ ({pnl_pct:+.2f}%)*
💵 Récupéré: {final_amount:,.2f}€

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *WALLET MIS À JOUR*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Nouveau solde: {new_balance:,.2f}€
"""
        
        keyboard = [
            [InlineKeyboardButton("📊 Voir positions", callback_data="view_all_positions")],
            [InlineKeyboardButton("💼 Retour Wallet", callback_data="menu_wallet")]
        ]
        
        print(f"[CLOSE] Envoi message de confirmation...")
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        print(f"[CLOSE] ✅✅✅ MESSAGE ENVOYÉ AVEC SUCCÈS")
        
    except Exception as e:
        print(f"[CLOSE] ❌❌❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        try:
            await query.edit_message_text(f"❌ Erreur lors de la fermeture: {str(e)}")
        except:
            await query.answer(f"❌ Erreur: {str(e)}", show_alert=True)


# ==================== FONCTION DB MANQUANTE ====================

def close_position_paper(position_id, exit_price, pnl, pnl_pct, close_reason):
    """Ferme une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE paper_positions
        SET status = 'closed',
            exit_price = ?,
            pnl = ?,
            pnl_pct = ?,
            close_reason = ?,
            closed_at = ?
        WHERE id = ?
    """, (exit_price, pnl, pnl_pct, close_reason, datetime.now().isoformat(), position_id))
    conn.commit()
    conn.close()

def get_position_paper(position_id):
    """Récupère une position par son ID"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, user_id, ticker, position_type, product_type, entry_price, 
               current_price, leverage, amount, exposure, tp1, tp2, stop_loss, 
               barrier_knockout, horizon, trailing_stop, pnl, pnl_pct, status, 
               exit_price, close_reason, opened_at, closed_at
        FROM paper_positions
        WHERE id = ?
    """, (position_id,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return None
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type',
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon',
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'opened_at', 'closed_at']
    
    return dict(zip(columns, row))






"""
SYSTÈME DE RÉINITIALISATION DU WALLET
Ferme toutes les positions en cours et réinitialise le capital
"""

# ==================== RÉINITIALISATION WALLET ====================

async def reset_wallet_confirm(update, context, user_id, bot, db):
    """Demande confirmation avant réinitialisation"""
    
    query = update.callback_query
    await query.answer()
    
    print(f"\n[RESET] Demande confirmation pour user {user_id}")
    
    # Compter les positions actives
    positions = db.get_user_positions_paper(user_id, 'open')
    nb_positions = len(positions)
    
    # Calculer le capital total en positions
    total_invested = sum(pos['amount'] for pos in positions)
    
    # Récupérer solde actuel
    capital = db.get_portfolio_capital_paper(user_id)
    current_cash = capital['current_cash']
    
    message = f"""
⚠️ *RÉINITIALISATION DU WALLET*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *ÉTAT ACTUEL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Cash disponible: {current_cash:,.2f}€
📊 Positions actives: {nb_positions}
💰 Capital en positions: {total_invested:,.2f}€

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *CETTE ACTION VA :*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Fermer TOUTES les positions ({nb_positions})
❌ Perdre les gains/pertes en cours
🔄 Réinitialiser le capital à 10,000€
🗑️ Supprimer l'historique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❗ *CETTE ACTION EST IRRÉVERSIBLE*

Êtes-vous sûr de vouloir continuer ?
"""
    
    keyboard = [
        [
            InlineKeyboardButton("✅ OUI, Réinitialiser", callback_data="reset_wallet_yes"),
            InlineKeyboardButton("❌ Annuler", callback_data="menu_wallet")
        ]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[RESET] Confirmation demandée ({nb_positions} positions)")


async def reset_wallet_execute(update, context, user_id, bot, db):
    """Exécute la réinitialisation complète du wallet"""
    
    query = update.callback_query
    await query.answer()
    
    print(f"\n[RESET] ⚠️ EXÉCUTION RÉINITIALISATION pour user {user_id}")
    
    try:
        # 1. Récupérer toutes les positions actives
        positions = db.get_user_positions_paper(user_id, 'open')
        nb_positions = len(positions)
        
        print(f"[RESET] {nb_positions} positions à fermer")
        
        # 2. Fermer toutes les positions
        closed_count = 0
        for pos in positions:
            try:
                db.close_position_paper(
                    position_id=pos['id'],
                    exit_price=pos['current_price'],
                    pnl=0,  # On ignore le P&L lors du reset
                    pnl_pct=0,
                    close_reason='reset'
                )
                closed_count += 1
                print(f"[RESET] Position #{pos['id']} ({pos['ticker']}) fermée")
            except Exception as e:
                print(f"[RESET] ⚠️ Erreur fermeture position #{pos['id']}: {e}")
        
        print(f"[RESET] ✅ {closed_count}/{nb_positions} positions fermées")
        
        # 3. Réinitialiser le capital à 10,000€
        initial_capital = 10000.0
        db.update_initial_capital(user_id, initial_capital)
        print(f"[RESET] ✅ Capital réinitialisé à {initial_capital}€")
        
        # 4. Message de confirmation
        message = f"""
✅ *WALLET RÉINITIALISÉ*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *ACTIONS EFFECTUÉES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ {closed_count} position(s) fermée(s)
✅ Capital réinitialisé
✅ Historique conservé

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 *NOUVEAU WALLET*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Capital: {initial_capital:,.2f}€
📊 Positions: 0
🆕 Prêt pour un nouveau départ !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vous pouvez maintenant ouvrir de nouvelles positions ! 🚀
"""
        
        keyboard = [
            [InlineKeyboardButton("🤖 Trading Companion", callback_data="menu_scan")],
            [InlineKeyboardButton("💼 Retour Wallet", callback_data="menu_wallet")]
        ]
        
        await query.edit_message_text(
            text=message,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        
        print(f"[RESET] ✅✅✅ RÉINITIALISATION TERMINÉE")
        
    except Exception as e:
        print(f"[RESET] ❌❌❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        
        await query.edit_message_text(
            f"❌ Erreur lors de la réinitialisation: {str(e)}\n\nVeuillez contacter le support.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="menu_wallet")
            ]])
        )






# ==================== SCANNER ACTIONS EUROPE ====================





async def scan_asia_with_perf(update, context, user_id, bot, db):
    """Scanner asiatiques avec performances multi-périodes"""
    
    query = update.callback_query
    await query.answer("🔍 Analyse des marchés asiatiques...")
    
    print(f"\n[SCAN ASIA] Début scan pour user {user_id}")
    
    await query.edit_message_text(
        "🌏 *ANALYSE MARCHÉS ASIATIQUES*\n\n⏳ Récupération des données...",
        parse_mode='Markdown'
    )
    
    import yfinance as yf
    
    results = []
    
    for ticker, info in ASIA_WATCHLIST.items():
        try:
            print(f"[SCAN ASIA] Analyse {ticker}...")
            
            stock = yf.Ticker(ticker)
            data = stock.history(period='6mo')
            
            if data.empty:
                continue
            
            current_price = data['Close'].iloc[-1]
            
            # RSI
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Performances
            performances = get_multi_period_performance(ticker)
            
            # Score
            score = 5
            if current_rsi < 40:
                score += 2
            elif current_rsi < 50:
                score += 1
            
            if performances and performances.get('1m', 0) > 0:
                score += 1
            if performances and performances.get('3m', 0) > 5:
                score += 1
            
            results.append({
                'ticker': ticker,
                'info': info,
                'price': current_price,
                'rsi': current_rsi,
                'performances': performances,
                'score': score
            })
            
        except Exception as e:
            print(f"[SCAN ASIA] ❌ {ticker}: {e}")
            continue
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        await query.edit_message_text(
            "❌ Aucune donnée disponible.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="markets_menu")
            ]])
        )
        return
    
    # Message
    message = f"🌏 *TOP OPPORTUNITÉS MARCHÉS ASIATIQUES* ({len(results)} actifs)\n\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for result in results[:15]:
        score = result['score']
        emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "⚪"
        signal = "Forte opportunité" if score >= 7 else "Opportunité modérée" if score >= 5 else "Neutre"
        
        message += f"{{emoji}} *{{result['info']['country']}} {{result['ticker']}}* - {{result['info']['name']}}\n"
        message += f"💹 Prix: {{result['price']:.2f}} USD\n"
        message += format_performance_line(result['performances']) + "\n"
        message += f"⭐ Score: {score}/15 - {signal}\n"
        message += f"📈 RSI: {result['rsi']:.1f}\n"
        message += f"💬 `/analyze {result['ticker']}` pour détails\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    keyboard = [
        [InlineKeyboardButton("🔄 Actualiser", callback_data="scan_asia")],
        [InlineKeyboardButton("⬅️ Retour Marchés", callback_data="markets_menu")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[SCAN ASIA] ✅ {len(results)} actifs analysés")


async def scan_europe_with_perf(update, context, user_id, bot, db):
    """Scanner européens avec performances multi-périodes"""
    
    query = update.callback_query
    await query.answer("🔍 Analyse des marchés européens...")
    
    print(f"\n[SCAN EUROPE] Début scan pour user {user_id}")
    
    await query.edit_message_text(
        "🇪🇺 *ANALYSE MARCHÉS EUROPÉENS*\n\n⏳ Récupération des données...",
        parse_mode='Markdown'
    )
    
    import yfinance as yf
    
    results = []
    
    for ticker, info in EUROPE_WATCHLIST.items():
        try:
            print(f"[SCAN EUROPE] Analyse {ticker}...")
            
            stock = yf.Ticker(ticker)
            data = stock.history(period='6mo')
            
            if data.empty:
                continue
            
            current_price = data['Close'].iloc[-1]
            
            # RSI
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Performances
            performances = get_multi_period_performance(ticker)
            
            # Score
            score = 5
            if current_rsi < 40:
                score += 2
            elif current_rsi < 50:
                score += 1
            
            if performances and performances.get('1m', 0) > 0:
                score += 1
            if performances and performances.get('3m', 0) > 5:
                score += 1
            
            results.append({
                'ticker': ticker,
                'info': info,
                'price': current_price,
                'rsi': current_rsi,
                'performances': performances,
                'score': score
            })
            
        except Exception as e:
            print(f"[SCAN EUROPE] ❌ {ticker}: {e}")
            continue
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        await query.edit_message_text(
            "❌ Aucune donnée disponible.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="markets_menu")
            ]])
        )
        return
    
    # Message
    message = f"🇪🇺 *TOP OPPORTUNITÉS MARCHÉS EUROPÉENS* ({len(results)} actifs)\n\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for result in results[:15]:
        score = result['score']
        emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "⚪"
        signal = "Forte opportunité" if score >= 7 else "Opportunité modérée" if score >= 5 else "Neutre"
        
        message += f"{{emoji}} *{{result['info']['country']}} {{result['ticker']}}* - {{result['info']['name']}}\n"
        message += f"📂 Secteur: {{result['info']['sector']}}\n"
        message += f"💹 Prix: {{result['price']:.2f}} {{'€' if '.PA' in result['ticker'] else 'USD'}}\n"
        message += format_performance_line(result['performances']) + "\n"
        message += f"⭐ Score: {score}/15 - {signal}\n"
        message += f"📈 RSI: {result['rsi']:.1f}\n"
        message += f"💬 `/analyze {result['ticker']}` pour détails\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    keyboard = [
        [InlineKeyboardButton("🔄 Actualiser", callback_data="scan_europe")],
        [InlineKeyboardButton("⬅️ Retour Marchés", callback_data="markets_menu")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[SCAN EUROPE] ✅ {len(results)} actifs analysés")


async def scan_commodities_with_perf(update, context, user_id, bot, db):
    """Scanner matières premières avec performances multi-périodes"""
    
    query = update.callback_query
    await query.answer("🔍 Analyse des marchés matières premières...")
    
    print(f"\n[SCAN COMMODITIES] Début scan pour user {user_id}")
    
    await query.edit_message_text(
        "⚡ *ANALYSE MATIÈRES PREMIÈRES*\n\n⏳ Récupération des données...",
        parse_mode='Markdown'
    )
    
    import yfinance as yf
    
    results = []
    
    for ticker, info in COMMODITIES_WATCHLIST.items():
        try:
            print(f"[SCAN COMMODITIES] Analyse {ticker}...")
            
            stock = yf.Ticker(ticker)
            data = stock.history(period='6mo')
            
            if data.empty:
                continue
            
            current_price = data['Close'].iloc[-1]
            
            # RSI
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Performances
            performances = get_multi_period_performance(ticker)
            
            # Score
            score = 5
            if current_rsi < 40:
                score += 2
            elif current_rsi < 50:
                score += 1
            
            if performances and performances.get('1m', 0) > 0:
                score += 1
            if performances and performances.get('3m', 0) > 5:
                score += 1
            
            results.append({
                'ticker': ticker,
                'info': info,
                'price': current_price,
                'rsi': current_rsi,
                'performances': performances,
                'score': score
            })
            
        except Exception as e:
            print(f"[SCAN COMMODITIES] ❌ {ticker}: {e}")
            continue
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        await query.edit_message_text(
            "❌ Aucune donnée disponible.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="markets_menu")
            ]])
        )
        return
    
    # Message
    message = f"⚡ *TOP OPPORTUNITÉS MATIÈRES PREMIÈRES* ({len(results)} actifs)\n\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for result in results[:15]:
        score = result['score']
        emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "⚪"
        signal = "Forte opportunité" if score >= 7 else "Opportunité modérée" if score >= 5 else "Neutre"
        
        message += f"{{emoji}} *{{result['info']['icon']}} {{result['ticker']}}* - {{result['info']['name']}}\n"
        message += f"📂 Type: {{result['info']['type']}}\n"
        message += f"💹 Prix: {{result['price']:.2f}} USD\n"
        message += format_performance_line(result['performances']) + "\n"
        message += f"⭐ Score: {score}/15 - {signal}\n"
        message += f"📈 RSI: {result['rsi']:.1f}\n"
        message += f"💬 `/analyze {result['ticker']}` pour détails\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    keyboard = [
        [InlineKeyboardButton("🔄 Actualiser", callback_data="scan_commodities")],
        [InlineKeyboardButton("⬅️ Retour Marchés", callback_data="markets_menu")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[SCAN COMMODITIES] ✅ {len(results)} actifs analysés")


async def scan_crypto_with_perf(update, context, user_id, bot, db):
    """Scanner crypto avec performances multi-périodes"""
    
    query = update.callback_query
    await query.answer("🔍 Analyse des marchés crypto...")
    
    print(f"\n[SCAN CRYPTO] Début scan pour user {user_id}")
    
    await query.edit_message_text(
        "🪙 *ANALYSE MARCHÉ CRYPTO*\n\n⏳ Récupération des données...",
        parse_mode='Markdown'
    )
    
    import yfinance as yf
    
    results = []
    
    for ticker, info in CRYPTO_WATCHLIST.items():
        try:
            print(f"[SCAN CRYPTO] Analyse {ticker}...")
            
            stock = yf.Ticker(ticker)
            data = stock.history(period='6mo')
            
            if data.empty:
                continue
            
            current_price = data['Close'].iloc[-1]
            
            # RSI
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Performances
            performances = get_multi_period_performance(ticker)
            
            # Score
            score = 5
            if current_rsi < 40:
                score += 2
            elif current_rsi < 50:
                score += 1
            
            if performances and performances.get('1m', 0) > 0:
                score += 1
            if performances and performances.get('3m', 0) > 5:
                score += 1
            
            results.append({
                'ticker': ticker,
                'info': info,
                'price': current_price,
                'rsi': current_rsi,
                'performances': performances,
                'score': score
            })
            
        except Exception as e:
            print(f"[SCAN CRYPTO] ❌ {ticker}: {e}")
            continue
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        await query.edit_message_text(
            "❌ Aucune donnée disponible.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="markets_menu")
            ]])
        )
        return
    
    # Message
    message = f"🪙 *TOP OPPORTUNITÉS MARCHÉ CRYPTO* ({len(results)} actifs)\n\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for result in results[:15]:
        score = result['score']
        emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "⚪"
        signal = "Forte opportunité" if score >= 7 else "Opportunité modérée" if score >= 5 else "Neutre"
        
        price_str = f"${{result['price']:.6f}}" if result['price'] < 1 else f"${{result['price']:.2f}}" if result['price'] < 100 else f"${{result['price']:,.2f}}"
        message += f"{{emoji}} *{{result['info']['icon']}} {{result['info']['name']}}* (#{{result['info']['rank']}})\n"
        message += f"💹 Prix: {{price_str}}\n"
        message += format_performance_line(result['performances']) + "\n"
        message += f"⭐ Score: {score}/15 - {signal}\n"
        message += f"📈 RSI: {result['rsi']:.1f}\n"
        message += f"💬 `/analyze {result['ticker']}` pour détails\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    keyboard = [
        [InlineKeyboardButton("🔄 Actualiser", callback_data="scan_crypto")],
        [InlineKeyboardButton("⬅️ Retour Marchés", callback_data="markets_menu")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[SCAN CRYPTO] ✅ {len(results)} actifs analysés")




async def markets_menu(update, context, user_id, bot, db):
    """Menu principal de sélection des marchés - VERSION COMPLÈTE"""
    
    query = update.callback_query
    await query.answer()
    
    print(f"\n[MARKETS] Menu pour user {user_id}")
    
    message = """
🌍 *SCANNER DE MARCHÉS*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sélectionnez une catégorie :

🇺🇸 *Actions US*
Tech, Finance, Santé - Les leaders américains

🇪🇺 *Actions Europe*
Luxe, Industrie, Énergie - Le meilleur d'Europe

🌏 *Actions Asie*
Tech asiatique, E-commerce, Automobiles

⚡ *Matières Premières*
Énergie, Métaux, Agriculture (sauf or)

🪙 *Cryptomonnaies*
Top 15 crypto : BTC, ETH, SOL, ADA...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    keyboard = [
        [InlineKeyboardButton("🇺🇸 Actions US", callback_data="scan_us")],
        [InlineKeyboardButton("🇪🇺 Actions Europe", callback_data="scan_europe")],
        [InlineKeyboardButton("🌏 Actions Asie", callback_data="scan_asia")],
        [InlineKeyboardButton("⚡ Matières Premières", callback_data="scan_commodities")],
        [InlineKeyboardButton("🪙 Cryptomonnaies", callback_data="scan_crypto")],
        [InlineKeyboardButton("« Retour au Menu", callback_data="menu_back")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )






async def scan_commodities_handler(update, context, user_id, bot, db):
    """Scanner pour les matières premières (ETF)"""
    
    query = update.callback_query
    await query.answer("🔍 Analyse des matières premières...")
    
    print(f"\n[SCAN COMMODITIES] Début scan pour user {user_id}")
    
    # Message initial
    await query.edit_message_text(
        "⚡ *ANALYSE DES MATIÈRES PREMIÈRES*\n\n⏳ Récupération des données...",
        parse_mode='Markdown'
    )
    
    import yfinance as yf
    
    results = []
    
    for ticker, info in COMMODITIES_WATCHLIST.items():
        try:
            print(f"[SCAN COMMODITIES] Analyse {ticker}...")
            
            # Récupérer données
            stock = yf.Ticker(ticker)
            data = stock.history(period='3mo')
            
            if data.empty:
                print(f"[SCAN COMMODITIES] ⚠️ {ticker} : Pas de données")
                continue
            
            # Analyse technique
            current_price = data['Close'].iloc[-1]
            
            # RSI
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Performance
            price_change = ((current_price - data['Close'].iloc[0]) / data['Close'].iloc[0]) * 100
            
            # Volatilité (pour commodities c'est important)
            volatility = data['Close'].pct_change().std() * 100
            
            # Score
            score = 5
            if current_rsi < 40:
                score += 2
            elif current_rsi < 50:
                score += 1
            
            if price_change > 0:
                score += 1
            if price_change > 5:
                score += 1
            
            # Commodities en tendance = bon
            if abs(price_change) > 3:
                score += 1
            
            results.append({
                'ticker': ticker,
                'name': info['name'],
                'type': info['type'],
                'icon': info['icon'],
                'price': current_price,
                'change': price_change,
                'rsi': current_rsi,
                'volatility': volatility,
                'score': score
            })
            
        except Exception as e:
            print(f"[SCAN COMMODITIES] ❌ Erreur {ticker}: {e}")
            continue
    
    # Trier par score
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        await query.edit_message_text(
            "❌ Aucune donnée disponible pour les matières premières.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="markets_menu")
            ]])
        )
        return
    
    # Message résultats
    message = f"⚡ *TOP OPPORTUNITÉS COMMODITIES* ({len(results)} ETF)\n\n"
    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    keyboard = []
    
    for i, result in enumerate(results, 1):
        score = result['score']
        
        if score >= 7:
            emoji = "🟢"
            signal = "Forte tendance"
        elif score >= 5:
            emoji = "🟡"
            signal = "Tendance modérée"
        else:
            emoji = "⚪"
            signal = "Neutre"
        
        message += f"{emoji} *{result['icon']} {result['ticker']}* - {result['name']}\n"
        message += f"📂 Type: {result['type']}\n"
        message += f"💹 Prix: {result['price']:.2f} USD\n"
        message += f"📊 Performance 3M: {result['change']:+.2f}%\n"
        message += f"⭐ Score: {score}/15 - {signal}\n"
        message += f"📈 RSI: {result['rsi']:.1f} | Volatilité: {result['volatility']:.2f}%\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # Bouton pour chaque commodity
        keyboard.append([
            InlineKeyboardButton(
                f"{emoji} {result['ticker']} - {signal}",
                callback_data=f"analyze_{result['ticker']}"
            )
        ])
    
    keyboard.extend([
        [InlineKeyboardButton("🔄 Actualiser", callback_data="scan_commodities")],
        [InlineKeyboardButton("⬅️ Retour Marchés", callback_data="markets_menu")]
    ])
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[SCAN COMMODITIES] ✅ {len(results)} commodities analysées")




# ==================== INTÉGRATION DANS button_callback ====================

"""
Ajouter ces handlers dans la fonction button_callback() :

    # TRADING COMPANION
    elif query.data.startswith("companion_step1_"):
        ticker = query.data.replace("companion_step1_", "")
        await companion_start(update, context, ticker, user_id, bot, db)
    
    elif query.data.startswith("companion_step2_"):
        ticker = query.data.replace("companion_step2_", "")
        await companion_step2_amount(update, context, ticker, user_id, bot, db)
    
    elif query.data.startswith("companion_step3_"):
        ticker = query.data.replace("companion_step3_", "")
        await companion_step3_strategy(update, context, ticker, user_id, bot, db)
    
    elif query.data.startswith("companion_amt_"):
        parts = query.data.replace("companion_amt_", "").split("_")
        ticker = parts[0]
        percentage = parts[1]
        await companion_handle_amount_button(update, context, ticker, percentage, user_id, bot, db)
    
    elif query.data.startswith("companion_strategy_"):
        parts = query.data.replace("companion_strategy_", "").split("_")
        ticker = parts[0]
        strategy = parts[1]
        await companion_step4_confirm(update, context, ticker, strategy, user_id, bot, db)
    
    elif query.data.startswith("companion_execute_"):
        ticker = query.data.replace("companion_execute_", "")
        await companion_execute(update, context, ticker, user_id, bot, db)
    
    elif query.data == "companion_cancel":
        await companion_cancel(update, context, user_id, bot)
"""

# ==================== INTÉGRATION DANS handle_text_input ====================

"""
Ajouter au début de la fonction handle_text_input() :

    # TRADING COMPANION - Montant personnalisé
    if await companion_handle_amount_text(update, context, user_id, text, context.bot, db):
        return  # Message traité par le companion
"""






# ==================== SCANNER UNIFIÉ ====================

async def unified_scanner_inline_commands(update, context, user_id, bot, db, market_type, watchlist, market_config):
    """
    Scanner unifié avec commandes INLINE cliquables
    Format compact, commandes sur chaque ligne
    """
    
    query = update.callback_query
    
    # ✅ VÉRIFIER SI LE MARCHÉ EST OUVERT
    is_open, status = is_market_open(market_type)
    
    if not is_open:
        # Marché fermé - afficher message avec choix
        import datetime
        now = datetime.datetime.now()
        
        # Message d'avertissement
        warning_message = f"""
⏸️  *MARCHÉ FERMÉ*

{market_config['icon']} *{market_config['title']}*

📍 Statut : {status}

⚠️ Ce marché est actuellement fermé. Les données peuvent être obsolètes.

Voulez-vous quand même effectuer le scan ?
"""
        
        keyboard = [
            [InlineKeyboardButton("✅ Oui, scanner quand même", callback_data=f"force_scan_{market_type}")],
            [InlineKeyboardButton("⬅️ Retour au menu", callback_data="markets_menu")]
        ]
        
        await query.edit_message_text(
            warning_message,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return  # Arrêter ici
    
    # Marché ouvert - continuer normalement
    await query.answer(f"🔍 Analyse {market_config['title_lower']}...")
    
    print(f"\n[SCAN {market_type.upper()}] Début scan pour user {user_id} - Marché ouvert ({status})")
    
    await query.edit_message_text(
        f"{market_config['icon']} *ANALYSE {market_config['title']}*\n\n🟢 Marché ouvert ({status})\n⏳ Récupération des données...",
        parse_mode='Markdown'
    )
    
    import yfinance as yf
    
    results = []
    
    for ticker, info in watchlist.items():
        try:
            print(f"[SCAN {market_type.upper()}] Analyse {ticker}...")
            
            stock = yf.Ticker(ticker)
            data = stock.history(period='6mo')
            
            if data.empty:
                continue
            
            current_price = data['Close'].iloc[-1]
            
            # 🧠 ANALYSE AVANCÉE
            try:
                analyzer = AdvancedMarketAnalyzer(data)
                smart_score, current_rsi = analyzer.calculate_smart_score()
                score = int(smart_score / 10)  # 0-100 → 0-10
            except Exception as e:
                print(f"[WARN] Analyse avancée échouée: {e}")
                # Fallback simple
                delta = data['Close'].diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                rs = gain / loss
                rsi = 100 - (100 / (1 + rs))
                current_rsi = rsi.iloc[-1]
                score = 6  # Score neutre par défaut
            
            # Performances
            performances = get_multi_period_performance(ticker)
            
            results.append({
                'ticker': ticker,
                'info': info,
                'price': current_price,
                'rsi': current_rsi,
                'performances': performances,
                'score': score
            })
            
        except Exception as e:
            print(f"[SCAN {market_type.upper()}] ❌ {ticker}: {e}")
            continue
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        await query.edit_message_text(
            "❌ Aucune donnée disponible.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Retour", callback_data="markets_menu")
            ]])
        )
        return
    
    # Message moderne avec design cards
    message = f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    message += f"{market_config['icon']} *{market_config['title']}*\n"
    message += f"📊 {len(results)} actifs analysés\n"
    message += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for i, result in enumerate(results[:15], 1):
        score = result['score']
        emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "⚪"
        
        # Format moderne avec rang (TOP 3 en cards, reste en lignes)
        msg_line = market_config['format_func_inline'](result, emoji, score, rank=i)
        message += msg_line
        
        # Séparateur après TOP 3
        if i == 3 and len(results) > 3:
            message += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    # Footer
    message += "\n💡 Tape /ticker pour analyser un actif\n"
    
    # Juste boutons de navigation (pas de boutons par actif)
    keyboard = [
        [InlineKeyboardButton("🔄 Actualiser", callback_data=f"scan_{market_type}")],
        [InlineKeyboardButton("⬅️ Retour Marchés", callback_data="markets_menu")]
    ]
    
    await query.edit_message_text(
        text=message,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    
    print(f"[SCAN {market_type.upper()}] ✅ {len(results)} actifs analysés")






async def scan_us_unified(update, context, user_id, bot, db):
    """Scanner US unifié"""
    # Récupérer US_WATCHLIST depuis le code existant
    await unified_scanner(update, context, user_id, bot, db, 'us', US_WATCHLIST, MARKET_CONFIGS['us'])

async def scan_asia_unified(update, context, user_id, bot, db):
    """Scanner Asie unifié"""
    await unified_scanner(update, context, user_id, bot, db, 'asia', ASIA_WATCHLIST, MARKET_CONFIGS['asia'])

async def scan_europe_unified(update, context, user_id, bot, db):
    """Scanner Europe unifié"""
    await unified_scanner(update, context, user_id, bot, db, 'europe', EUROPE_WATCHLIST, MARKET_CONFIGS['europe'])

async def scan_commodities_unified(update, context, user_id, bot, db):
    """Scanner Commodities unifié"""
    await unified_scanner(update, context, user_id, bot, db, 'commodities', COMMODITIES_WATCHLIST, MARKET_CONFIGS['commodities'])

async def scan_crypto_unified(update, context, user_id, bot, db):
    """Scanner Crypto unifié"""
    await unified_scanner(update, context, user_id, bot, db, 'crypto', CRYPTO_WATCHLIST, MARKET_CONFIGS['crypto'])


# ==================== HANDLER RACCOURCIS /TICKER ====================

async def ticker_shortcut_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Gère les commandes /ticker automatiques
    Ex: /nvda, /tsm, /btc, /mcpa, etc.
    """
    
    command = update.message.text.strip().upper()
    if not command.startswith('/'):
        return
    
    # Extraire le ticker
    ticker_input = command[1:]  # Enlever le /
    
    print(f"\n[TICKER SHORTCUT] Command: {command} → Ticker: {ticker_input}")
    
    # Mapping des raccourcis vers vrais tickers
    ticker_map = {
        # Crypto (sans -USD)
        'BTC': 'BTC-USD',
        'ETH': 'ETH-USD',
        'BNB': 'BNB-USD',
        'SOL': 'SOL-USD',
        'XRP': 'XRP-USD',
        'ADA': 'ADA-USD',
        'AVAX': 'AVAX-USD',
        'DOGE': 'DOGE-USD',
        'DOT': 'DOT-USD',
        # 'MATIC': 'MATIC-USD',  # Retiré - ticker obsolète
        'LINK': 'LINK-USD',
        # 'UNI': 'UNI-USD',  # Retiré - ticker obsolète
        'ATOM': 'ATOM-USD',
        'LTC': 'LTC-USD',
        'SHIB': 'SHIB-USD',
        
        # Europe (sans .PA)
        'MCPA': 'MC.PA',
        'ORPA': 'OR.PA',
        'KERPA': 'KER.PA',
        'SUPA': 'SU.PA',
        'AIRPA': 'AIR.PA',
        'BNPA': 'BN.PA',
    }
    
    # Chercher le vrai ticker
    real_ticker = ticker_map.get(ticker_input, ticker_input)
    
    print(f"[TICKER SHORTCUT] Analysing: {real_ticker}")
    
    # Appeler analyze_command avec le ticker
    context.args = [real_ticker]
    await analyze_command(update, context)


# ==================== ENREGISTREMENT AUTOMATIQUE DES RACCOURCIS ====================

def register_all_ticker_shortcuts(application):
    """
    Enregistre automatiquement les raccourcis pour tous les tickers
    """
    
    all_tickers = []
    
    # US
    if 'US_WATCHLIST' in globals():
        all_tickers.extend([t.lower() for t in US_WATCHLIST.keys()])
    
    # Asia
    all_tickers.extend([t.lower().replace('-', '') for t in ASIA_WATCHLIST.keys()])
    
    # Europe
    all_tickers.extend([t.lower().replace('.', '') for t in EUROPE_WATCHLIST.keys()])
    
    # Commodities
    all_tickers.extend([t.lower() for t in COMMODITIES_WATCHLIST.keys()])
    
    # Crypto (sans -USD)
    all_tickers.extend([t.lower().replace('-usd', '').replace('-', '') for t in CRYPTO_WATCHLIST.keys()])
    
    print(f"\n[TICKER SHORTCUTS] Enregistrement de {len(all_tickers)} raccourcis...")
    
    # Enregistrer un seul handler qui gère tous les cas
    # Pas besoin de CommandHandler pour chaque ticker
    # On utilise le MessageHandler avec un filtre
    
    # OU on enregistre un handler wildcard qui check si la commande existe
    pass  # Voir intégration ci-dessous




# 🇺🇸 Actions US
US_WATCHLIST = {
    'AAPL': {'name': 'Apple', 'sector': 'Tech'},
    'MSFT': {'name': 'Microsoft', 'sector': 'Tech'},
    'GOOGL': {'name': 'Alphabet', 'sector': 'Tech'},
    'AMZN': {'name': 'Amazon', 'sector': 'E-commerce'},
    'NVDA': {'name': 'NVIDIA', 'sector': 'Semi-conducteurs'},
    'TSLA': {'name': 'Tesla', 'sector': 'Auto'},
    'META': {'name': 'Meta', 'sector': 'Tech'},
    'JPM': {'name': 'JPMorgan Chase', 'sector': 'Finance'},
    'V': {'name': 'Visa', 'sector': 'Finance'},
    'WMT': {'name': 'Walmart', 'sector': 'Retail'},
    'JNJ': {'name': 'Johnson & Johnson', 'sector': 'Santé'},
    'PG': {'name': 'Procter & Gamble', 'sector': 'Consommation'},
    'XOM': {'name': 'Exxon Mobil', 'sector': 'Énergie'},
    'BAC': {'name': 'Bank of America', 'sector': 'Finance'},
    'DIS': {'name': 'Walt Disney', 'sector': 'Entertainment'},
}

# 🌏 Actions Asie (US-listed + principaux marchés)
ASIA_WATCHLIST = {
    # Actions chinoises cotées US (plus facile à trader)
    'BABA': {'name': 'Alibaba', 'market': 'NYSE', 'country': '🇨🇳'},
    'JD': {'name': 'JD.com', 'market': 'NASDAQ', 'country': '🇨🇳'},
    'BIDU': {'name': 'Baidu', 'market': 'NASDAQ', 'country': '🇨🇳'},
    'PDD': {'name': 'Pinduoduo', 'market': 'NASDAQ', 'country': '🇨🇳'},
    'NIO': {'name': 'Nio', 'market': 'NYSE', 'country': '🇨🇳'},
    'LI': {'name': 'Li Auto', 'market': 'NASDAQ', 'country': '🇨🇳'},
    'XPEV': {'name': 'XPeng', 'market': 'NASDAQ', 'country': '🇨🇳'},
    
    # Taiwan
    'TSM': {'name': 'Taiwan Semiconductor', 'market': 'NYSE', 'country': '🇹🇼'},
    
    # Japon (cotées US)
    'SONY': {'name': 'Sony Group', 'market': 'NYSE', 'country': '🇯🇵'},
    'TM': {'name': 'Toyota Motor', 'market': 'NYSE', 'country': '🇯🇵'},
    'MUFG': {'name': 'Mitsubishi UFJ', 'market': 'NYSE', 'country': '🇯🇵'},
    
    # Inde
    
    # Corée du Sud
    'LPL': {'name': 'LG Display', 'market': 'NYSE', 'country': '🇰🇷'},
}


# 🇪🇺 Actions Europe (cotées US ou ETF)
EUROPE_WATCHLIST = {
    # Grandes entreprises européennes (ADR US)
    'NVO': {'name': 'Novo Nordisk', 'country': '🇩🇰', 'sector': 'Pharma'},
    'ASML': {'name': 'ASML Holding', 'country': '🇳🇱', 'sector': 'Semi-conducteurs'},
    'SAP': {'name': 'SAP', 'country': '🇩🇪', 'sector': 'Software'},
    'SPOT': {'name': 'Spotify', 'country': '🇸🇪', 'sector': 'Streaming'},
    'NIO': {'name': 'NIO', 'country': '🇩🇪', 'sector': 'Auto'},
    
    # Luxe
    'MC.PA': {'name': 'LVMH', 'country': '🇫🇷', 'sector': 'Luxe'},
    'OR.PA': {'name': "L'Oréal", 'country': '🇫🇷', 'sector': 'Cosmétiques'},
    'KER.PA': {'name': 'Kering', 'country': '🇫🇷', 'sector': 'Luxe'},
    
    # Énergie & Industrie
    'SU.PA': {'name': 'Schneider Electric', 'country': '🇫🇷', 'sector': 'Industrie'},
    'AIR.PA': {'name': 'Airbus', 'country': '🇫🇷', 'sector': 'Aéronautique'},
    'TTE': {'name': 'TotalEnergies', 'country': '🇫🇷', 'sector': 'Énergie'},
    
    # Finance
    'BN.PA': {'name': 'Danone', 'country': '🇫🇷', 'sector': 'Agroalimentaire'},
    'SAN': {'name': 'Banco Santander', 'country': '🇪🇸', 'sector': 'Banque'},
    'BBVA': {'name': 'BBVA', 'country': '🇪🇸', 'sector': 'Banque'},
    
    # Tech Europe
    # 'NOKIA': {'name': 'Nokia', 'country': '🇫🇮', 'sector': 'Telecom'},  # Retiré - ticker obsolète
}

# 🪙 Cryptomonnaies (via -USD sur Yahoo Finance)
CRYPTO_WATCHLIST = {
    # Top Crypto
    'BTC-USD': {'name': 'Bitcoin', 'icon': '₿', 'rank': 1},
    'ETH-USD': {'name': 'Ethereum', 'icon': 'Ξ', 'rank': 2},
    'BNB-USD': {'name': 'Binance Coin', 'icon': '🟡', 'rank': 3},
    'SOL-USD': {'name': 'Solana', 'icon': '◎', 'rank': 4},
    'XRP-USD': {'name': 'Ripple', 'icon': '✕', 'rank': 5},
    'ADA-USD': {'name': 'Cardano', 'icon': '₳', 'rank': 6},
    'AVAX-USD': {'name': 'Avalanche', 'icon': '🔺', 'rank': 7},
    'DOGE-USD': {'name': 'Dogecoin', 'icon': '🐕', 'rank': 8},
    'DOT-USD': {'name': 'Polkadot', 'icon': '⚫', 'rank': 9},
    # 'MATIC-USD': {'name': 'Polygon', 'icon': '🟣', 'rank': 10},  # Retiré - ticker obsolète
    'LINK-USD': {'name': 'Chainlink', 'icon': '🔗', 'rank': 11},
    # 'UNI-USD': {'name': 'Uniswap', 'icon': '🦄', 'rank': 12},  # Retiré - ticker obsolète
    'ATOM-USD': {'name': 'Cosmos', 'icon': '⚛️', 'rank': 13},
    'LTC-USD': {'name': 'Litecoin', 'icon': 'Ł', 'rank': 14},
    'SHIB-USD': {'name': 'Shiba Inu', 'icon': '🐕', 'rank': 15},
}



# ⚡ Matières Premières (ETF uniquement - plus facile)
COMMODITIES_WATCHLIST = {
    # Énergie
    'USO': {'name': 'Pétrole US Oil', 'type': 'Énergie', 'icon': '🛢️'},
    'BNO': {'name': 'Pétrole Brent', 'type': 'Énergie', 'icon': '🛢️'},
    'UNG': {'name': 'Gaz Naturel', 'type': 'Énergie', 'icon': '⚡'},
    'XLE': {'name': 'Energy Select Sector', 'type': 'Énergie', 'icon': '⚡'},
    
    # Métaux industriels
    'CPER': {'name': 'Cuivre', 'type': 'Métaux', 'icon': '🔶'},
    'COPX': {'name': 'Copper Miners', 'type': 'Métaux', 'icon': '🔶'},
    
    # Métaux précieux (sauf or comme demandé)
    'SLV': {'name': 'Argent (Silver)', 'type': 'Métaux Précieux', 'icon': '⚪'},
    'PPLT': {'name': 'Platine', 'type': 'Métaux Précieux', 'icon': '💎'},
    'PALL': {'name': 'Palladium', 'type': 'Métaux Précieux', 'icon': '💎'},
    
    # Agriculture
    'CORN': {'name': 'Maïs', 'type': 'Agriculture', 'icon': '🌽'},
    'WEAT': {'name': 'Blé', 'type': 'Agriculture', 'icon': '🌾'},
    'SOYB': {'name': 'Soja', 'type': 'Agriculture', 'icon': '🫘'},
    'DBA': {'name': 'Agriculture Diversifié', 'type': 'Agriculture', 'icon': '🌾'},
}






def get_multi_period_performance(ticker):
    """Calcule les performances sur plusieurs périodes"""
    import yfinance as yf
    from datetime import datetime, timedelta
    
    try:
        stock = yf.Ticker(ticker)
        
        # Récupérer 6 mois de données pour avoir assez d'historique
        data = stock.history(period='6mo')
        
        if data.empty:
            return None
        
        current_price = data['Close'].iloc[-1]
        
        performances = {}
        
        # 1 jour (24h)
        if len(data) >= 2:
            price_1d = data['Close'].iloc[-2]
            performances['1d'] = ((current_price - price_1d) / price_1d) * 100
        else:
            performances['1d'] = 0
        
        # 1 semaine (7 jours)
        if len(data) >= 7:
            price_1w = data['Close'].iloc[-7]
            performances['1w'] = ((current_price - price_1w) / price_1w) * 100
        else:
            performances['1w'] = 0
        
        # 1 mois (~22 jours de trading)
        if len(data) >= 22:
            price_1m = data['Close'].iloc[-22]
            performances['1m'] = ((current_price - price_1m) / price_1m) * 100
        else:
            performances['1m'] = 0
        
        # 3 mois (~66 jours de trading)
        if len(data) >= 66:
            price_3m = data['Close'].iloc[-66]
            performances['3m'] = ((current_price - price_3m) / price_3m) * 100
        elif len(data) >= 30:
            # Si moins de 66 jours, prendre le plus ancien disponible
            price_3m = data['Close'].iloc[0]
            performances['3m'] = ((current_price - price_3m) / price_3m) * 100
        else:
            performances['3m'] = 0
        
        return performances
        
    except Exception as e:
        print(f"[PERF] Erreur {ticker}: {e}")
        return None


def format_performance_line(performances):
    """Formate les performances en une ligne lisible"""
    if not performances:
        return "📊 Performances: N/A"
    
    parts = []
    
    # Emoji selon performance
    def get_emoji(perf):
        if perf > 5:
            return "🟢"
        elif perf > 0:
            return "🟡"
        elif perf > -5:
            return "🟠"
        else:
            return "🔴"
    
    # 1 jour
    if '1d' in performances:
        emoji = get_emoji(performances['1d'])
        parts.append(f"{emoji} 1J: {performances['1d']:+.1f}%")
    
    # 1 semaine
    if '1w' in performances:
        emoji = get_emoji(performances['1w'])
        parts.append(f"{emoji} 1S: {performances['1w']:+.1f}%")
    
    # 1 mois
    if '1m' in performances:
        emoji = get_emoji(performances['1m'])
        parts.append(f"{emoji} 1M: {performances['1m']:+.1f}%")
    
    # 3 mois
    if '3m' in performances:
        emoji = get_emoji(performances['3m'])
        parts.append(f"{emoji} 3M: {performances['3m']:+.1f}%")
    
    return "📊 " + " | ".join(parts)


# ==================== FORMATS INLINE COMPACT - DESIGN MODERNE ====================

def get_medal_and_emoji(rank):
    """Retourne la médaille et emoji selon le rang"""
    if rank == 1:
        return "🥇", ""
    elif rank == 2:
        return "🥈", ""
    elif rank == 3:
        return "🥉", ""
    else:
        return f"{rank}️⃣ ", ""

def get_performance_emoji(perf):
    """Emoji selon performance"""
    if perf >= 10:
        return "🚀"
    elif perf >= 5:
        return "📈"
    elif perf >= 0:
        return "🟢"
    else:
        return "📉"

def get_stars(score):
    """Étoiles selon score"""
    if score >= 9:
        return "⭐⭐⭐⭐⭐"
    elif score >= 7:
        return "⭐⭐⭐⭐"
    elif score >= 5:
        return "⭐⭐⭐"
    elif score >= 3:
        return "⭐⭐"
    else:
        return "⭐"

def format_card_top3(result, rank, score):
    """Format CARD pour TOP 3 (toutes marchés)"""
    ticker_cmd = f"/{result['ticker'].lower().replace('.', '').replace('-', '')}"
    currency = '€' if '.PA' in result['ticker'] else '$'
    name = result['info']['name'][:20]
    
    medal, _ = get_medal_and_emoji(rank)
    stars = get_stars(score)
    
    # Performance 1M
    perf_1m = result['performances'].get('1m', 0)
    perf_3m = result['performances'].get('3m', 0)
    
    msg = "┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n"
    msg += f"┃ {medal} *{result['ticker']}* • {name}\n"
    msg += f"┃ {currency}{result['price']:.2f} • {stars} {score}/15\n"
    msg += f"┃\n"
    msg += f"┃ 📊 1M: {perf_1m:+.1f}% • 3M: {perf_3m:+.1f}%\n"
    msg += f"┃ 💬 {ticker_cmd}\n"
    msg += "┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n"
    
    return msg

def format_line_compact(result, rank, score):
    """Format LIGNE COMPACTE pour 4-15 (toutes marchés)"""
    ticker_cmd = f"/{result['ticker'].lower().replace('.', '').replace('-', '')}"
    currency = '€' if '.PA' in result['ticker'] else '$'
    name = result['info']['name'][:15]
    
    medal, _ = get_medal_and_emoji(rank)
    stars = get_stars(score)
    
    # Performance 1M
    perf_1m = result['performances'].get('1m', 0)
    perf_emoji = get_performance_emoji(perf_1m)
    
    msg = f"{medal} *{name}* • {currency}{result['price']:.2f} • {perf_emoji}{perf_1m:+.1f}% • {stars} {score}/15 • {ticker_cmd}\n"
    
    return msg

def format_us_result_inline(result, emoji, score, rank=None):
    """Format US moderne"""
    if rank and rank <= 3:
        return format_card_top3(result, rank, score)
    else:
        actual_rank = rank if rank else 4
        return format_line_compact(result, actual_rank, score)

def format_asia_result_inline(result, emoji, score, rank=None):
    """Format Asie moderne"""
    if rank and rank <= 3:
        return format_card_top3(result, rank, score)
    else:
        actual_rank = rank if rank else 4
        return format_line_compact(result, actual_rank, score)

def format_europe_result_inline(result, emoji, score, rank=None):
    """Format Europe moderne"""
    if rank and rank <= 3:
        return format_card_top3(result, rank, score)
    else:
        actual_rank = rank if rank else 4
        return format_line_compact(result, actual_rank, score)

def format_commodities_result_inline(result, emoji, score, rank=None):
    """Format Commodities moderne"""
    if rank and rank <= 3:
        return format_card_top3(result, rank, score)
    else:
        actual_rank = rank if rank else 4
        return format_line_compact(result, actual_rank, score)

def format_crypto_result_inline(result, emoji, score, rank=None):
    """Format Crypto moderne"""
    if rank and rank <= 3:
        return format_card_top3(result, rank, score)
    else:
        actual_rank = rank if rank else 4
        return format_line_compact(result, actual_rank, score)



DB_FILE = 'trading_bot.db'

# ==================== FORMATS SANS COMMANDE (POUR BOUTONS) ====================

def format_us_result_no_cmd(result, emoji, signal, score):
    """Format US sans commande /ticker"""
    msg = f"{emoji} *{result['ticker']}* - {result['info']['name']}\n"
    msg += f"📂 Secteur: {result['info']['sector']}\n"
    msg += f"💹 Prix: ${result['price']:.2f}\n"
    msg += format_performance_line(result['performances']) + "\n"
    msg += f"⭐ Score: {score}/15 - {signal}\n"
    msg += f"📈 RSI: {result['rsi']:.1f}\n"
    return msg

def format_asia_result_no_cmd(result, emoji, signal, score):
    """Format Asie sans commande"""
    msg = f"{emoji} *{result['info']['country']} {result['ticker']}* - {result['info']['name']}\n"
    msg += f"💹 Prix: ${result['price']:.2f}\n"
    msg += format_performance_line(result['performances']) + "\n"
    msg += f"⭐ Score: {score}/15 - {signal}\n"
    msg += f"📈 RSI: {result['rsi']:.1f}\n"
    return msg

def format_europe_result_no_cmd(result, emoji, signal, score):
    """Format Europe sans commande"""
    currency = '€' if '.PA' in result['ticker'] else 'USD'
    msg = f"{emoji} *{result['info']['country']} {result['ticker']}* - {result['info']['name']}\n"
    msg += f"📂 Secteur: {result['info']['sector']}\n"
    msg += f"💹 Prix: {result['price']:.2f} {currency}\n"
    msg += format_performance_line(result['performances']) + "\n"
    msg += f"⭐ Score: {score}/15 - {signal}\n"
    msg += f"📈 RSI: {result['rsi']:.1f}\n"
    return msg

def format_commodities_result_no_cmd(result, emoji, signal, score):
    """Format Commodities sans commande"""
    msg = f"{emoji} *{result['info']['icon']} {result['ticker']}* - {result['info']['name']}\n"
    msg += f"📂 Type: {result['info']['type']}\n"
    msg += f"💹 Prix: ${result['price']:.2f}\n"
    msg += format_performance_line(result['performances']) + "\n"
    msg += f"⭐ Score: {score}/15 - {signal}\n"
    msg += f"📈 RSI: {result['rsi']:.1f}\n"
    return msg

def format_crypto_result_no_cmd(result, emoji, signal, score):
    """Format Crypto sans commande"""
    price_str = f"${result['price']:.6f}" if result['price'] < 1 else f"${result['price']:.2f}" if result['price'] < 100 else f"${result['price']:,.2f}"
    msg = f"{emoji} *{result['info']['icon']} {result['info']['name']}* (#{result['info']['rank']})\n"
    msg += f"💹 Prix: {price_str}\n"
    msg += format_performance_line(result['performances']) + "\n"
    msg += f"⭐ Score: {score:.1f}/10 - {signal}\n"
    msg += f"📈 RSI: {result['rsi']:.1f}\n"
    return msg


# ==================== MARKET CONFIGS AVEC BOUTONS ====================

MARKET_CONFIGS_INLINE = {
    'us': {
        'icon': '🇺🇸',
        'title': 'MARCHÉS US',
        'title_lower': 'des marchés US',
        'format_func_inline': format_us_result_inline
    },
    'asia': {
        'icon': '🌏',
        'title': 'MARCHÉS ASIATIQUES',
        'title_lower': 'des marchés asiatiques',
        'format_func_inline': format_asia_result_inline
    },
    'europe': {
        'icon': '🇪🇺',
        'title': 'MARCHÉS EUROPÉENS',
        'title_lower': 'des marchés européens',
        'format_func_inline': format_europe_result_inline
    },
    'commodities': {
        'icon': '⚡',
        'title': 'MATIÈRES PREMIÈRES',
        'title_lower': 'des matières premières',
        'format_func_inline': format_commodities_result_inline
    },
    'crypto': {
        'icon': '🪙',
        'title': 'MARCHÉ CRYPTO',
        'title_lower': 'du marché crypto',
        'format_func_inline': format_crypto_result_inline
    }
}



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
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS trading_positions (
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

    
    # Initialiser la table des positions de trading
    print("[INIT] Initialisation table trading_positions...")
    init_trading_positions_table()
    print("[INIT] ✅ Table trading_positions prête")
    print("[DB] Base de données initialisée")
    
    # Migration automatique
    migrate_database_tracking()

# ==================== USER MANAGEMENT ====================
    
    # Initialiser table trading
    init_trading_positions_table()


# Devrait être présent quelque part
# db = Database() # DÉPLACÉ après la définition de la classe


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
                       leverage, amount, exposure, tp1, tp2, stop_loss, barrier_knockout, 
                       horizon, trailing_stop):
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

def delete_alert(user_id, alert_id):
    """Supprime une alerte (vérifie que l'utilisateur est propriétaire)"""
    conn = get_connection()
    c = conn.cursor()
    try:
        # Vérifier que l'alerte appartient bien à l'utilisateur avant suppression
        c.execute("DELETE FROM alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
        deleted = c.rowcount > 0
        conn.commit()
        return deleted
    except:
        conn.rollback()
        return False
    finally:
        conn.close()


def get_user_positions_paper(user_id, status='open'):
    """Récupère les positions d'un user"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, user_id, ticker, position_type, product_type, entry_price, 
               current_price, leverage, amount, exposure, tp1, tp2, stop_loss, 
               barrier_knockout, horizon, trailing_stop, pnl, pnl_pct, status, 
               exit_price, close_reason, alert_sent_tp1, alert_sent_tp2, 
               alert_sent_stop_loss, alert_sent_knockout, opened_at, closed_at
        FROM paper_positions
        WHERE user_id = ? AND status = ?
        ORDER BY opened_at DESC
    """, (user_id, status))
    rows = c.fetchall()
    conn.close()
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return [dict(zip(columns, row)) for row in rows]

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
    
    def __init__(self, db_file='trading_bot.db'):
        self.db_file = db_file
    
    def get_trading_mode(self, user_id):
        return get_trading_mode(user_id)
    

    def get_all_users(self):
        """Récupère tous les utilisateurs actifs"""
        try:
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            
            # Créer tables si elles n'existent pas
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    ticket_id TEXT,
                    ticker TEXT,
                    market TEXT,
                    price REAL,
                    score INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    dismissed BOOLEAN DEFAULT 0
                )
            """)
            
            # Récupérer de la table users EN PRIORITÉ
            users_set = set()
            
            try:
                cursor.execute("SELECT user_id FROM users")
                users_from_table = cursor.fetchall()
                users_set.update([u[0] for u in users_from_table])
            except:
                pass
            
            # Si aucun dans users, essayer les autres tables
            if not users_set:
                for table in ['trading_positions', 'alert_settings', 'alerts']:
                    try:
                        cursor.execute(f"SELECT DISTINCT user_id FROM {table}")
                        table_users = cursor.fetchall()
                        users_set.update([u[0] for u in table_users])
                    except:
                        pass
            
            conn.close()
            
            # Convertir set en liste de tuples
            users = [(uid,) for uid in users_set]
            
            if not users:
                print("[DB] Aucun utilisateur trouvé dans les tables")
            else:
                print(f"[DB] {len(users)} utilisateur(s) trouvé(s)")
            
            return users
        except Exception as e:
            print(f"[DB] Erreur get_all_users: {e}")
            return []
    
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
                                  entry_price, leverage, amount, exposure, tp1, tp2, 
                                  stop_loss, barrier_knockout, horizon, trailing_stop)
    
    def get_position_paper(self, position_id):
        return get_position_paper(position_id)
    
    def get_user_positions_paper(self, user_id, status='open'):
        return get_user_positions_paper(user_id, status)
    
    def get_paper_stats(self, user_id):
        return get_paper_stats(user_id)
    
    def update_initial_capital(self, user_id, amount):
        return update_initial_capital(user_id, amount)
    

    def close_position_paper(self, position_id, exit_price, pnl, pnl_pct, close_reason):
        return close_position_paper(position_id, exit_price, pnl, pnl_pct, close_reason)
    
    def get_position_paper(self, position_id):
        return get_position_paper(position_id)
    
    def get_all_active_alerts(self):
        return get_all_active_alerts()
    
    def get_alerts(self, user_id):
        return get_alerts(user_id)
    
    def add_alert(self, user_id, ticker, condition, target_price):
        return add_alert(user_id, ticker, condition, target_price)
    
    def trigger_alert(self, alert_id):
        return trigger_alert(alert_id)
    
    def delete_alert(self, user_id, alert_id):
        return delete_alert(user_id, alert_id)


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
    
def get_connection():
    """Connexion à la base de données"""
    return sqlite3.connect(DB_FILE)

# Initialiser l'instance globale de la base de données
db = Database()

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
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS trading_positions (
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
                       leverage, amount, exposure, tp1, tp2, stop_loss, barrier_knockout, 
                       horizon, trailing_stop):
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

def get_user_positions_paper(user_id, status='open'):
    """Récupère les positions d'un user"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, user_id, ticker, position_type, product_type, entry_price, 
               current_price, leverage, amount, exposure, tp1, tp2, stop_loss, 
               barrier_knockout, horizon, trailing_stop, pnl, pnl_pct, status, 
               exit_price, close_reason, alert_sent_tp1, alert_sent_tp2, 
               alert_sent_stop_loss, alert_sent_knockout, opened_at, closed_at
        FROM paper_positions
        WHERE user_id = ? AND status = ?
        ORDER BY opened_at DESC
    """, (user_id, status))
    rows = c.fetchall()
    conn.close()
    
    columns = ['id', 'user_id', 'ticker', 'position_type', 'product_type', 
               'entry_price', 'current_price', 'leverage', 'amount', 'exposure',
               'tp1', 'tp2', 'stop_loss', 'barrier_knockout', 'horizon', 
               'trailing_stop', 'pnl', 'pnl_pct', 'status', 'exit_price',
               'close_reason', 'alert_sent_tp1', 'alert_sent_tp2', 
               'alert_sent_stop_loss', 'alert_sent_knockout', 'opened_at', 'closed_at']
    
    return [dict(zip(columns, row)) for row in rows]

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
              "RMS.PA", "KER.PA", "OR.PA", "MC.PA", "ML.PA", "RI.PA", "PUB.PA",
              "RNO.PA", "SAF.PA", "SGO.PA", "SAN.PA", "SU.PA", "GLE.PA", "STLAM.MI",
              "STMPA.PA", "TEP.PA", "HO.PA", "VIE.PA", "DG.PA", "VIV.PA"],
    
    "DAX": ["ADS.DE", "AIR.DE", "ALV.DE", "BAS.DE", "BAYN.DE", "BEI.DE", "BMW.DE",
            "CON.DE", "1COV.DE", "DAI.DE", "DB1.DE", "DBK.DE", "DHL.DE", "DTE.DE",
            "EOAN.DE", "FRE.DE", "HEI.DE", "HEN3.DE", "IFX.DE", "MRK.DE", "MTX.DE",
            "MUV2.DE", "PAH3.DE", "PSM.DE", "RWE.DE", "SAP.DE", "SIE.DE", "VOW3.DE"],
    
    "US_TECH": ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "NFLX",
                "AMD", "INTC", "CRM", "ADBE", "ORCL", "CSCO", "AVGO", "QCOM"],
    
    "US_BLUE_CHIPS": ["JPM", "JNJ", "V", "MA", "UNH", "HD", "PG", "BAC", "DIS", "KO", "PEP"]
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



import yfinance as yf
from datetime import datetime




def register_user(db, user_id, username=None):
    """Enregistre un utilisateur dans la DB"""
    try:
        conn = sqlite3.connect(db.db_file)
        cursor = conn.cursor()
        
        # Créer table si nécessaire
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insérer ou ignorer si existe déjà
        cursor.execute("""
            INSERT OR IGNORE INTO users (user_id, username)
            VALUES (?, ?)
        """, (user_id, username))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[DB] Erreur register_user: {e}")
        return False

# Alias pour compatibilité
TradingBotDB = Database


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

    # Cryptomonnaies : ouvertes 24h/24 et 7j/7
    if ticker.endswith('-USD') or ticker in CRYPTO_WATCHLIST:
        return {
            'is_open': True,
            'market_name': 'Crypto',
            'message': f"🟢 *Marché Crypto OUVERT*\n⏰ Disponible 24h/24, 7j/7",
            'emoji': '🟢'
        }

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
    """Calcule le RSI avec protection division par zéro"""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    # Protection division par zéro
    rs = np.where(loss != 0, gain / loss, 100)
    rsi = 100 - (100 / (1 + rs))
    return pd.Series(rsi, index=data.index)

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

# ==================== INDICATEURS AVANCÉS (NOUVEAUX) ====================

def calculate_bollinger_bands(data, period=20, std_dev=2):
    """
    Calcule les Bollinger Bands
    Retourne: upper_band, middle_band (SMA), lower_band, bb_position (0-100%)
    """
    sma = data['Close'].rolling(window=period).mean()
    std = data['Close'].rolling(window=period).std()

    upper_band = sma + (std_dev * std)
    lower_band = sma - (std_dev * std)

    # Position relative entre les bandes (0% = lower, 100% = upper)
    bb_position = np.where(
        (upper_band - lower_band) != 0,
        ((data['Close'] - lower_band) / (upper_band - lower_band)) * 100,
        50
    )

    return upper_band, sma, lower_band, pd.Series(bb_position, index=data.index)

def calculate_stochastic(data, k_period=14, d_period=3):
    """
    Calcule le Stochastic Oscillator (%K et %D)
    Retourne: stoch_k, stoch_d
    """
    low_min = data['Low'].rolling(window=k_period).min()
    high_max = data['High'].rolling(window=k_period).max()

    # %K
    k = np.where(
        (high_max - low_min) != 0,
        100 * ((data['Close'] - low_min) / (high_max - low_min)),
        50
    )
    stoch_k = pd.Series(k, index=data.index)

    # %D (SMA de %K)
    stoch_d = stoch_k.rolling(window=d_period).mean()

    return stoch_k, stoch_d

def calculate_adx(data, period=14):
    """
    Calcule l'ADX (Average Directional Index) pour mesurer la force de la tendance
    Retourne: adx, plus_di, minus_di
    """
    high = data['High']
    low = data['Low']
    close = data['Close']

    # True Range
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()

    # +DM et -DM
    high_diff = high - high.shift(1)
    low_diff = low.shift(1) - low

    plus_dm = np.where((high_diff > low_diff) & (high_diff > 0), high_diff, 0)
    minus_dm = np.where((low_diff > high_diff) & (low_diff > 0), low_diff, 0)

    # +DI et -DI
    plus_di = 100 * pd.Series(plus_dm).rolling(window=period).mean() / atr
    minus_di = 100 * pd.Series(minus_dm).rolling(window=period).mean() / atr

    # DX
    dx = np.where(
        (plus_di + minus_di) != 0,
        100 * abs(plus_di - minus_di) / (plus_di + minus_di),
        0
    )

    # ADX (SMA du DX)
    adx = pd.Series(dx).rolling(window=period).mean()

    return adx, plus_di, minus_di

def calculate_atr(data, period=14):
    """
    Calcule l'ATR (Average True Range) pour mesurer la volatilité
    Retourne: atr, atr_percent
    """
    high = data['High']
    low = data['Low']
    close = data['Close']

    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()

    # ATR en % du prix
    atr_percent = (atr / close) * 100

    return atr, atr_percent

def calculate_obv(data):
    """
    Calcule l'OBV (On-Balance Volume)
    Retourne: obv, obv_sma
    """
    obv = [0]
    for i in range(1, len(data)):
        if data['Close'].iloc[i] > data['Close'].iloc[i-1]:
            obv.append(obv[-1] + data['Volume'].iloc[i])
        elif data['Close'].iloc[i] < data['Close'].iloc[i-1]:
            obv.append(obv[-1] - data['Volume'].iloc[i])
        else:
            obv.append(obv[-1])

    obv_series = pd.Series(obv, index=data.index)
    obv_sma = obv_series.rolling(window=20).mean()

    return obv_series, obv_sma

def calculate_ichimoku(data):
    """
    Calcule l'Ichimoku Cloud
    Retourne: tenkan_sen, kijun_sen, senkou_span_a, senkou_span_b, chikou_span
    """
    # Tenkan-sen (ligne de conversion) : 9 périodes
    nine_period_high = data['High'].rolling(window=9).max()
    nine_period_low = data['Low'].rolling(window=9).min()
    tenkan_sen = (nine_period_high + nine_period_low) / 2

    # Kijun-sen (ligne de base) : 26 périodes
    period26_high = data['High'].rolling(window=26).max()
    period26_low = data['Low'].rolling(window=26).min()
    kijun_sen = (period26_high + period26_low) / 2

    # Senkou Span A (limite supérieure du nuage) : projeté 26 périodes en avant
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(26)

    # Senkou Span B : 52 périodes projeté 26 en avant
    period52_high = data['High'].rolling(window=52).max()
    period52_low = data['Low'].rolling(window=52).min()
    senkou_span_b = ((period52_high + period52_low) / 2).shift(26)

    # Chikou Span : prix projeté 26 périodes en arrière
    chikou_span = data['Close'].shift(-26)

    return tenkan_sen, kijun_sen, senkou_span_a, senkou_span_b, chikou_span

# ==================== SUPPORT/RÉSISTANCE AVANCÉS ====================

def calculate_advanced_support_resistance(data, lookback=100):
    """
    Calcule supports et résistances avancés basés sur:
    - Pivot points classiques
    - Swing highs/lows (fractales)
    - Clustering des niveaux proches
    """
    # 1. Pivot Points classiques
    pivot = (data['High'].iloc[-1] + data['Low'].iloc[-1] + data['Close'].iloc[-1]) / 3

    r1 = 2 * pivot - data['Low'].iloc[-1]
    r2 = pivot + (data['High'].iloc[-1] - data['Low'].iloc[-1])
    r3 = r1 + (data['High'].iloc[-1] - data['Low'].iloc[-1])

    s1 = 2 * pivot - data['High'].iloc[-1]
    s2 = pivot - (data['High'].iloc[-1] - data['Low'].iloc[-1])
    s3 = s1 - (data['High'].iloc[-1] - data['Low'].iloc[-1])

    # 2. Swing Highs et Lows (méthode fractale)
    recent_data = data.tail(min(lookback, len(data)))

    swing_highs = []
    swing_lows = []

    for i in range(2, len(recent_data) - 2):
        # Swing High : plus haut que 2 barres avant et après
        if (recent_data['High'].iloc[i] > recent_data['High'].iloc[i-1] and
            recent_data['High'].iloc[i] > recent_data['High'].iloc[i-2] and
            recent_data['High'].iloc[i] > recent_data['High'].iloc[i+1] and
            recent_data['High'].iloc[i] > recent_data['High'].iloc[i+2]):
            swing_highs.append(recent_data['High'].iloc[i])

        # Swing Low : plus bas que 2 barres avant et après
        if (recent_data['Low'].iloc[i] < recent_data['Low'].iloc[i-1] and
            recent_data['Low'].iloc[i] < recent_data['Low'].iloc[i-2] and
            recent_data['Low'].iloc[i] < recent_data['Low'].iloc[i+1] and
            recent_data['Low'].iloc[i] < recent_data['Low'].iloc[i+2]):
            swing_lows.append(recent_data['Low'].iloc[i])

    # 3. Clustering (regrouper niveaux proches)
    def cluster_levels(levels, tolerance=0.02):
        """Regroupe niveaux à ±2% près"""
        if not levels:
            return []

        levels_sorted = sorted(levels)
        clusters = []
        current_cluster = [levels_sorted[0]]

        for level in levels_sorted[1:]:
            if abs(level - current_cluster[-1]) / current_cluster[-1] < tolerance:
                current_cluster.append(level)
            else:
                clusters.append(sum(current_cluster) / len(current_cluster))
                current_cluster = [level]

        clusters.append(sum(current_cluster) / len(current_cluster))
        return clusters

    # Résistances : swing highs + pivot resistances
    all_resistances = swing_highs + [r1, r2, r3]
    clustered_resistances = cluster_levels(all_resistances)

    # Supports : swing lows + pivot supports
    all_supports = swing_lows + [s1, s2, s3]
    clustered_supports = cluster_levels(all_supports)

    # Filtrer pour garder les plus pertinents
    current_price = data['Close'].iloc[-1]

    # Résistances au-dessus du prix
    resistances = sorted([r for r in clustered_resistances if r > current_price])[:3]

    # Supports en-dessous du prix
    supports = sorted([s for s in clustered_supports if s < current_price], reverse=True)[:3]

    return {
        'resistances': resistances,
        'supports': supports,
        'pivot': pivot,
        'current_price': current_price
    }

def calculate_smart_targets(data, signal_direction, sr_levels):
    """
    Calcule prix cibles intelligents basés sur:
    - Support/Résistance
    - ATR (volatilité)
    """
    current_price = data['Close'].iloc[-1]
    atr, atr_percent = calculate_atr(data)
    atr_value = atr.iloc[-1]

    resistances = sr_levels['resistances']
    supports = sr_levels['supports']

    if signal_direction > 0:  # Signal ACHAT
        # TP1 : 1.5 × ATR ou première résistance
        tp1_atr = current_price + (1.5 * atr_value)
        tp1 = resistances[0] if resistances and resistances[0] < tp1_atr * 1.2 else tp1_atr

        # TP2 : 2.5 × ATR ou deuxième résistance
        tp2_atr = current_price + (2.5 * atr_value)
        tp2 = resistances[1] if len(resistances) > 1 else tp2_atr

        # TP3 : 4 × ATR ou troisième résistance
        tp3_atr = current_price + (4 * atr_value)
        tp3 = resistances[2] if len(resistances) > 2 else tp3_atr

        # Stop Loss : premier support ou 2 × ATR
        sl_atr = current_price - (2 * atr_value)
        sl = supports[0] if supports and supports[0] > sl_atr * 0.9 else sl_atr

    else:  # Signal VENTE
        # TP1 : 1.5 × ATR ou premier support
        tp1_atr = current_price - (1.5 * atr_value)
        tp1 = supports[0] if supports and supports[0] > tp1_atr * 0.8 else tp1_atr

        # TP2 : 2.5 × ATR ou deuxième support
        tp2_atr = current_price - (2.5 * atr_value)
        tp2 = supports[1] if len(supports) > 1 else tp2_atr

        # TP3 : 4 × ATR ou troisième support
        tp3_atr = current_price - (4 * atr_value)
        tp3 = supports[2] if len(supports) > 2 else tp3_atr

        # Stop Loss : première résistance ou 2 × ATR
        sl_atr = current_price + (2 * atr_value)
        sl = resistances[0] if resistances and resistances[0] < sl_atr * 1.1 else sl_atr

    # Calculer Risk/Reward
    risk = abs(current_price - sl)
    reward = abs(tp2 - current_price)
    risk_reward = reward / risk if risk > 0 else 0

    return {
        'tp1': round(tp1, 2),
        'tp2': round(tp2, 2),
        'tp3': round(tp3, 2),
        'sl': round(sl, 2),
        'risk_reward': round(risk_reward, 2),
        'risk_amount': round(risk, 2),
        'reward_amount': round(reward, 2)
    }

def calculate_all_indicators(data):
    """
    Calcule TOUS les indicateurs techniques (basiques + avancés)
    Retourne un dict avec tous les indicateurs
    """
    indicators = {}

    # Indicateurs basiques
    indicators['rsi'] = calculate_rsi(data).iloc[-1] if len(data) >= 14 else 50
    macd, signal, hist = calculate_macd(data)
    indicators['macd'] = macd.iloc[-1] if len(data) >= 26 else 0
    indicators['macd_signal'] = signal.iloc[-1] if len(data) >= 26 else 0
    indicators['macd_hist'] = hist.iloc[-1] if len(data) >= 26 else 0

    indicators['sma20'] = calculate_sma(data, 20).iloc[-1] if len(data) >= 20 else data['Close'].iloc[-1]
    indicators['sma50'] = calculate_sma(data, 50).iloc[-1] if len(data) >= 50 else data['Close'].iloc[-1]
    indicators['trend'] = detect_trend(data)

    # Indicateurs avancés
    if len(data) >= 20:
        upper_bb, middle_bb, lower_bb, bb_pos = calculate_bollinger_bands(data)
        indicators['bb_upper'] = upper_bb.iloc[-1]
        indicators['bb_middle'] = middle_bb.iloc[-1]
        indicators['bb_lower'] = lower_bb.iloc[-1]
        indicators['bb_position'] = bb_pos.iloc[-1]
    else:
        indicators['bb_position'] = 50

    if len(data) >= 14:
        stoch_k, stoch_d = calculate_stochastic(data)
        indicators['stoch_k'] = stoch_k.iloc[-1]
        indicators['stoch_d'] = stoch_d.iloc[-1]
    else:
        indicators['stoch_k'] = 50
        indicators['stoch_d'] = 50

    if len(data) >= 14:
        adx, plus_di, minus_di = calculate_adx(data)
        indicators['adx'] = adx.iloc[-1] if not pd.isna(adx.iloc[-1]) else 20
        indicators['plus_di'] = plus_di.iloc[-1] if not pd.isna(plus_di.iloc[-1]) else 50
        indicators['minus_di'] = minus_di.iloc[-1] if not pd.isna(minus_di.iloc[-1]) else 50
    else:
        indicators['adx'] = 20
        indicators['plus_di'] = 50
        indicators['minus_di'] = 50

    if len(data) >= 14:
        atr, atr_percent = calculate_atr(data)
        indicators['atr'] = atr.iloc[-1]
        indicators['atr_percent'] = atr_percent.iloc[-1]
    else:
        indicators['atr'] = 1.0
        indicators['atr_percent'] = 2.0

    if len(data) >= 20:
        obv, obv_sma = calculate_obv(data)
        indicators['obv'] = obv.iloc[-1]
        indicators['obv_sma'] = obv_sma.iloc[-1] if not pd.isna(obv_sma.iloc[-1]) else obv.iloc[-1]
        # Tendance OBV
        indicators['obv_trend'] = 1 if obv.iloc[-1] > obv_sma.iloc[-1] else -1
    else:
        indicators['obv_trend'] = 0

    if len(data) >= 52:
        tenkan, kijun, senkou_a, senkou_b, chikou = calculate_ichimoku(data)
        current_price = data['Close'].iloc[-1]
        indicators['tenkan'] = tenkan.iloc[-1] if not pd.isna(tenkan.iloc[-1]) else current_price
        indicators['kijun'] = kijun.iloc[-1] if not pd.isna(kijun.iloc[-1]) else current_price

        # Position par rapport au cloud
        if len(data) >= 26:
            cloud_top = max(senkou_a.iloc[-26] if not pd.isna(senkou_a.iloc[-26]) else 0,
                           senkou_b.iloc[-26] if not pd.isna(senkou_b.iloc[-26]) else 0)
            cloud_bottom = min(senkou_a.iloc[-26] if not pd.isna(senkou_a.iloc[-26]) else 0,
                              senkou_b.iloc[-26] if not pd.isna(senkou_b.iloc[-26]) else 0)

            if current_price > cloud_top:
                indicators['price_vs_cloud'] = 'above'
            elif current_price < cloud_bottom:
                indicators['price_vs_cloud'] = 'below'
            else:
                indicators['price_vs_cloud'] = 'inside'

            indicators['tenkan_vs_kijun'] = 'bullish' if indicators['tenkan'] > indicators['kijun'] else 'bearish'
        else:
            indicators['price_vs_cloud'] = 'neutral'
            indicators['tenkan_vs_kijun'] = 'neutral'
    else:
        indicators['price_vs_cloud'] = 'neutral'
        indicators['tenkan_vs_kijun'] = 'neutral'

    # Momentum et volume
    indicators['price_momentum'] = ((data['Close'].iloc[-1] - data['Close'].iloc[-5]) / data['Close'].iloc[-5] * 100) if len(data) >= 5 else 0
    indicators['price_trend'] = 1 if indicators['price_momentum'] > 0 else -1
    indicators['volume_ratio'] = data['Volume'].iloc[-1] / data['Volume'].rolling(20).mean().iloc[-1] if len(data) >= 20 else 1.0

    indicators['current_price'] = data['Close'].iloc[-1]

    return indicators

def generate_advanced_signal(indicators):
    """
    Génère signal amélioré avec TOUS les indicateurs (score -15 à +15)
    Retourne: score, signal_text, confidence (0-100%)
    """
    score = 0
    confidence_factors = []

    # 1. RSI (poids: 3)
    rsi = indicators['rsi']
    if rsi < 25:
        score += 3
        confidence_factors.append(15)
    elif rsi < 30:
        score += 2
        confidence_factors.append(10)
    elif rsi > 75:
        score -= 3
        confidence_factors.append(15)
    elif rsi > 70:
        score -= 2
        confidence_factors.append(10)

    # 2. MACD (poids: 2)
    macd = indicators['macd']
    macd_signal = indicators['macd_signal']
    macd_hist = indicators['macd_hist']

    if macd > macd_signal and macd_hist > 0:
        score += 2
        confidence_factors.append(10)
    elif macd < macd_signal and macd_hist < 0:
        score -= 2
        confidence_factors.append(10)

    # 3. Bollinger Bands (poids: 2)
    bb_position = indicators['bb_position']
    if bb_position < 10:  # Près de la bande basse
        score += 2
        confidence_factors.append(12)
    elif bb_position > 90:  # Près de la bande haute
        score -= 2
        confidence_factors.append(12)

    # 4. Stochastic (poids: 2)
    stoch_k = indicators['stoch_k']
    stoch_d = indicators['stoch_d']

    if stoch_k < 20 and stoch_k > stoch_d:
        score += 2
        confidence_factors.append(10)
    elif stoch_k > 80 and stoch_k < stoch_d:
        score -= 2
        confidence_factors.append(10)

    # 5. ADX - Force de tendance (multiplicateur)
    adx = indicators['adx']
    plus_di = indicators['plus_di']
    minus_di = indicators['minus_di']

    trend_strength = 1.0
    if adx > 40:  # Tendance très forte
        trend_strength = 1.5
        confidence_factors.append(15)
    elif adx > 25:  # Tendance forte
        trend_strength = 1.2
        confidence_factors.append(10)
    elif adx < 20:  # Pas de tendance
        trend_strength = 0.5  # Réduire le score
        confidence_factors.append(-10)

    # Direction de tendance
    if plus_di > minus_di:
        score += 1
    else:
        score -= 1

    # 6. OBV - Divergences (poids: 2)
    obv_trend = indicators['obv_trend']
    price_trend = indicators['price_trend']

    if obv_trend > 0 and price_trend < 0:
        score += 2  # Divergence haussière
        confidence_factors.append(12)
    elif obv_trend < 0 and price_trend > 0:
        score -= 2  # Divergence baissière
        confidence_factors.append(12)
    elif obv_trend > 0 and price_trend > 0:
        score += 1  # Confirmation
        confidence_factors.append(5)

    # 7. Ichimoku (poids: 2)
    price_vs_cloud = indicators['price_vs_cloud']
    tenkan_vs_kijun = indicators['tenkan_vs_kijun']

    if price_vs_cloud == 'above':
        score += 2
        confidence_factors.append(10)
    elif price_vs_cloud == 'below':
        score -= 2
        confidence_factors.append(10)

    if tenkan_vs_kijun == 'bullish':
        score += 1
    elif tenkan_vs_kijun == 'bearish':
        score -= 1

    # 8. Volume (poids: 1)
    volume_ratio = indicators['volume_ratio']
    if volume_ratio > 1.5:
        score += 1
        confidence_factors.append(5)
    elif volume_ratio < 0.7:
        score -= 0.5

    # 9. Momentum (poids: 2)
    momentum = indicators['price_momentum']
    if momentum > 5:
        score += 2
    elif momentum > 2:
        score += 1
    elif momentum < -5:
        score -= 2
    elif momentum < -2:
        score -= 1

    # 10. Moving Averages (poids: 2)
    current_price = indicators['current_price']
    sma20 = indicators['sma20']
    sma50 = indicators['sma50']

    if current_price > sma20 > sma50:
        score += 2
        confidence_factors.append(10)
    elif current_price < sma20 < sma50:
        score -= 2
        confidence_factors.append(10)
    elif current_price > sma20:
        score += 1
    else:
        score -= 1

    # Appliquer le multiplicateur de force de tendance
    score = int(score * trend_strength)

    # Limiter le score entre -15 et +15
    score = max(-15, min(15, score))

    # Calculer la confiance (0-100%)
    base_confidence = 50
    confidence_bonus = sum(confidence_factors)
    confidence = min(95, max(20, base_confidence + confidence_bonus))

    # Générer le signal textuel (seuils optimisés pour échelle -15/+15)
    if score >= 12:        # 80% du maximum
        signal = "🚀 ACHAT TRÈS FORT"
    elif score >= 8:       # 53% du maximum
        signal = "🟢 ACHAT FORT"
    elif score >= 5:       # 33% du maximum
        signal = "🟡 ACHAT MODÉRÉ"
    elif score >= 2:       # 13% du maximum
        signal = "⚪ ACHAT FAIBLE"
    elif score <= -12:     # -80% du maximum
        signal = "💥 VENTE TRÈS FORTE"
    elif score <= -8:      # -53% du maximum
        signal = "🔴 VENTE FORTE"
    elif score <= -5:      # -33% du maximum
        signal = "🟠 VENTE MODÉRÉE"
    elif score <= -2:      # -13% du maximum
        signal = "⚪ VENTE FAIBLE"
    else:
        signal = "⚪ NEUTRE"

    return score, signal, confidence

def generate_signal(rsi, macd, macd_signal, trend, current_price, sma20, sma50=None, volume_ratio=1.0, price_momentum=0):
    """Génère un signal d'achat/vente avancé avec scoring amélioré (ANCIENNE VERSION - conservée pour compatibilité)"""
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

# Initialiser instance globale Database
db = Database()

# ==================== ANALYSE DES ACTIONS ====================


def ai_complete_analysis(ticker, data, analysis):
    """Analyse IA complète avec opportunités, prix cibles et recommandations"""
    try:
        current_price = analysis['price']
        df = data.tail(100)
        
        # 1. SUPPORT ET RÉSISTANCE (calcul avancé avec pivots et fractales)
        sr_levels = calculate_advanced_support_resistance(data)

        # Utiliser les supports/résistances avancés
        supports = sr_levels.get('supports', [])
        resistances = sr_levels.get('resistances', [])

        # Prendre les 2 premiers niveaux de support et résistance
        support_1 = supports[0] if len(supports) > 0 else current_price * 0.97
        support_2 = supports[1] if len(supports) > 1 else current_price * 0.95

        resistance_1 = resistances[0] if len(resistances) > 0 else current_price * 1.03
        resistance_2 = resistances[1] if len(resistances) > 1 else current_price * 1.05
        
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
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), gridspec_kw={'height_ratios': [2, 1]})
        
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


# ==================== BACKTESTING & MACHINE LEARNING ====================

def backtest_strategy(ticker, start_date=None, end_date=None, initial_capital=10000, commission=0.001, slippage=0.0005):
    """
    Backteste la stratégie sur période historique avec LONG & SHORT
    Inclut: commission, slippage, max drawdown, Sharpe ratio
    Retourne: métriques de performance complètes
    """
    try:
        # Normaliser le ticker crypto
        ticker = normalize_crypto_ticker(ticker)

        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=365)

        # Récupérer données historiques
        data = safe_fetch_yfinance(ticker, period='2y')
        if not validate_data(data):
            return None

        # Filtrer par dates (gérer timezone)
        if data.index.tz is not None:
            start_ts = pd.Timestamp(start_date).tz_localize(data.index.tz)
            end_ts = pd.Timestamp(end_date).tz_localize(data.index.tz)
        else:
            start_ts = pd.Timestamp(start_date)
            end_ts = pd.Timestamp(end_date)

        data = data[(data.index >= start_ts) & (data.index <= end_ts)]

        capital = initial_capital
        max_capital = initial_capital
        max_drawdown = 0
        position = None  # None, 'LONG', 'SHORT'
        entry_price = 0
        shares = 0
        trades = []
        equity_curve = []

        # Simuler jour par jour
        for i in range(100, len(data)):
            current_data = data.iloc[:i+1]
            current_price = current_data['Close'].iloc[-1]

            # Calculer indicateurs et signal
            indicators = calculate_all_indicators(current_data)
            score, signal, confidence = generate_advanced_signal(indicators)

            # Gestion des positions
            if position is None:
                # Chercher une entrée LONG ou SHORT
                if score >= 8 and confidence >= 70:
                    # ACHAT (LONG)
                    position = 'LONG'
                    entry_price = current_price * (1 + slippage)  # Slippage à l'achat
                    shares = (capital * 0.95) / entry_price  # Utiliser 95% du capital
                    commission_paid = entry_price * shares * commission
                    capital -= commission_paid

                    # Calculer TP et SL
                    sr_levels = calculate_advanced_support_resistance(current_data)
                    targets = calculate_smart_targets(current_data, score, sr_levels)

                    tp = targets['tp2']
                    sl = targets['sl']

                    trades.append({
                        'type': 'LONG',
                        'entry_date': current_data.index[-1],
                        'entry_price': entry_price,
                        'shares': shares,
                        'tp': tp,
                        'sl': sl,
                        'signal': signal,
                        'score': score,
                        'commission_entry': commission_paid
                    })

                elif score <= -8 and confidence >= 70:
                    # VENTE (SHORT)
                    position = 'SHORT'
                    entry_price = current_price * (1 - slippage)  # Slippage à la vente
                    shares = (capital * 0.95) / entry_price
                    commission_paid = entry_price * shares * commission
                    capital -= commission_paid

                    # Calculer TP et SL inversés pour SHORT
                    sr_levels = calculate_advanced_support_resistance(current_data)
                    targets = calculate_smart_targets(current_data, score, sr_levels)

                    # Pour SHORT: TP en bas, SL en haut
                    tp = targets['sl']  # Le support devient TP
                    sl = targets['tp2']  # La résistance devient SL

                    trades.append({
                        'type': 'SHORT',
                        'entry_date': current_data.index[-1],
                        'entry_price': entry_price,
                        'shares': shares,
                        'tp': tp,
                        'sl': sl,
                        'signal': signal,
                        'score': score,
                        'commission_entry': commission_paid
                    })

            else:
                # En position, vérifier TP/SL
                if position == 'LONG':
                    tp = trades[-1]['tp']
                    sl = trades[-1]['sl']

                    if current_price >= tp or current_price <= sl:
                        # Sortie LONG
                        exit_price = current_price * (1 - slippage)  # Slippage à la sortie
                        commission_paid = exit_price * shares * commission
                        pnl = (exit_price - entry_price) * shares - commission_paid - trades[-1]['commission_entry']
                        pnl_percent = (pnl / (entry_price * shares)) * 100

                        capital += (entry_price * shares) + pnl

                        trades[-1].update({
                            'exit_date': current_data.index[-1],
                            'exit_price': exit_price,
                            'commission_exit': commission_paid,
                            'pnl': pnl,
                            'pnl_percent': pnl_percent,
                            'hit_tp': current_price >= tp
                        })

                        position = None

                elif position == 'SHORT':
                    tp = trades[-1]['tp']
                    sl = trades[-1]['sl']

                    if current_price <= tp or current_price >= sl:
                        # Sortie SHORT
                        exit_price = current_price * (1 + slippage)  # Slippage à la sortie
                        commission_paid = exit_price * shares * commission
                        pnl = (entry_price - exit_price) * shares - commission_paid - trades[-1]['commission_entry']
                        pnl_percent = (pnl / (entry_price * shares)) * 100

                        capital += (entry_price * shares) + pnl

                        trades[-1].update({
                            'exit_date': current_data.index[-1],
                            'exit_price': exit_price,
                            'commission_exit': commission_paid,
                            'pnl': pnl,
                            'pnl_percent': pnl_percent,
                            'hit_tp': current_price <= tp
                        })

                        position = None

            # Suivre l'équité et le drawdown
            max_capital = max(max_capital, capital)
            drawdown = (max_capital - capital) / max_capital * 100
            max_drawdown = max(max_drawdown, drawdown)
            equity_curve.append(capital)

        # Analyser résultats
        closed_trades = [t for t in trades if 'exit_price' in t]
        pending_trades = [t for t in trades if 'exit_price' not in t]

        # Si aucun trade fermé, retourner des informations utiles
        if not closed_trades:
            reason = "Aucun signal suffisamment fort détecté"
            if pending_trades:
                reason = f"{len(pending_trades)} position(s) ouverte(s) mais pas encore fermée(s)"
            elif len(data) < 150:
                reason = "Pas assez de données historiques (minimum 150 jours requis)"

            return {
                'ticker': ticker,
                'period': f"{start_date.strftime('%Y-%m-%d')} à {end_date.strftime('%Y-%m-%d')}",
                'initial_capital': initial_capital,
                'no_trades': True,
                'reason': reason,
                'pending_trades': len(pending_trades),
                'total_signals': len(trades),
                'min_score_required': 8,
                'days_analyzed': len(data)
            }

        total_trades = len(closed_trades)
        winning_trades = len([t for t in closed_trades if t['pnl'] > 0])
        losing_trades = total_trades - winning_trades
        win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0

        total_return = ((capital - initial_capital) / initial_capital) * 100

        # Calcul Sharpe Ratio
        returns = pd.Series(equity_curve).pct_change().dropna()
        sharpe_ratio = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0

        return {
            'ticker': ticker,
            'period': f"{start_date.strftime('%Y-%m-%d')} à {end_date.strftime('%Y-%m-%d')}",
            'initial_capital': initial_capital,
            'final_capital': round(capital, 2),
            'total_return': round(total_return, 2),
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': round(win_rate, 2),
            'max_drawdown': round(max_drawdown, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'long_trades': len([t for t in closed_trades if t['type'] == 'LONG']),
            'short_trades': len([t for t in closed_trades if t['type'] == 'SHORT']),
            'trades': closed_trades
        }

    except Exception as e:
        print(f"❌ Erreur backtesting {ticker}: {e}")
        return None

def predict_ml(ticker):
    """
    Prédiction ML simplifiée basée sur patterns
    (Version simplifiée - peut être étendue avec sklearn)
    """
    try:
        # Normaliser le ticker crypto
        ticker = normalize_crypto_ticker(ticker)

        # Récupérer données
        data = safe_fetch_yfinance(ticker, period='6mo')
        if not validate_data(data):
            return None

        # Calculer tous les indicateurs
        indicators = calculate_all_indicators(data)

        # Score avancé
        score, signal, confidence = generate_advanced_signal(indicators)

        # Prédiction simple basée sur:
        # - Force du signal (score)
        # - Confiance
        # - Tendance récente

        prediction = 'NEUTRE'
        probability = 50

        if score >= 7 and confidence >= 70:
            prediction = 'HAUSSE'
            probability = min(85, 50 + (score * 2) + (confidence / 5))
        elif score <= -7 and confidence >= 70:
            prediction = 'BAISSE'
            probability = min(85, 50 + (abs(score) * 2) + (confidence / 5))
        elif score >= 4:
            prediction = 'HAUSSE_MODEREE'
            probability = 50 + (score * 3)
        elif score <= -4:
            prediction = 'BAISSE_MODEREE'
            probability = 50 + (abs(score) * 3)

        return {
            'ticker': ticker,
            'prediction': prediction,
            'probability': round(probability, 1),
            'score': score,
            'confidence': confidence,
            'horizon': '5-10 jours',
            'factors': {
                'rsi': indicators['rsi'],
                'adx': indicators['adx'],
                'bb_position': indicators['bb_position'],
                'stoch_k': indicators['stoch_k']
            }
        }

    except Exception as e:
        print(f"❌ Erreur prédiction ML {ticker}: {e}")
        return None

def analyze_stock(ticker, period="3mo", interval="1d"):
    """Analyse complète d'une action avec 15+ indicateurs avancés"""
    try:
        # Normaliser le ticker crypto avant traitement
        ticker = normalize_crypto_ticker(ticker)

        # Récupération sécurisée des données
        data = safe_fetch_yfinance(ticker, period=period)

        if not validate_data(data):
            return {
                'error': 'no_data',
                'ticker': ticker,
                'message': f"Aucune donnée disponible pour {ticker}. Vérifiez que le ticker est correct."
            }

        # Calcul de TOUS les indicateurs (basiques + avancés)
        indicators = calculate_all_indicators(data)

        # Génération du signal avancé (-15 à +15)
        score, signal, confidence = generate_advanced_signal(indicators)

        # Calcul des anciennes métriques pour compatibilité
        current_price = indicators['current_price']
        prev_close = data['Close'].iloc[-2]
        variation = ((current_price - prev_close) / prev_close) * 100

        # Support et Résistance avancés
        sr_levels = calculate_advanced_support_resistance(data)

        # Prix cibles intelligents
        targets = calculate_smart_targets(data, score, sr_levels)

        # Informations supplémentaires
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            company_name = info.get('longName', ticker)
        except:
            company_name = ticker

        # Signal textuel détaillé (ancien format pour compatibilité)
        signal_details = []
        if indicators['rsi'] < 30:
            signal_details.append(f"RSI survendu ({indicators['rsi']:.1f})")
        elif indicators['rsi'] > 70:
            signal_details.append(f"RSI suracheté ({indicators['rsi']:.1f})")

        if indicators['bb_position'] < 10:
            signal_details.append("Prix proche bande Bollinger basse")
        elif indicators['bb_position'] > 90:
            signal_details.append("Prix proche bande Bollinger haute")

        if indicators['adx'] > 25:
            signal_details.append(f"Tendance forte (ADX {indicators['adx']:.1f})")

        result = {
            # Informations de base
            'ticker': ticker,
            'name': company_name,
            'price': current_price,
            'variation': variation,

            # Signal et score améliorés
            'signal': signal,
            'score': score,  # Maintenant de -15 à +15
            'confidence': confidence,  # Nouveau : 0-100%
            'signal_details': signal_details,

            # Indicateurs basiques (compatibilité)
            'rsi': indicators['rsi'],
            'macd': indicators['macd'],
            'macd_signal': indicators['macd_signal'],
            'macd_hist': indicators['macd_hist'],
            'sma20': indicators['sma20'],
            'sma50': indicators['sma50'],
            'trend': indicators['trend'],
            'volume': data['Volume'].iloc[-1],
            'volume_ratio': indicators['volume_ratio'],
            'price_momentum': indicators['price_momentum'],
            'volatility': indicators['atr_percent'],

            # NOUVEAUX indicateurs avancés
            'bb_upper': indicators.get('bb_upper', 0),
            'bb_lower': indicators.get('bb_lower', 0),
            'bb_position': indicators.get('bb_position', 50),
            'stoch_k': indicators.get('stoch_k', 50),
            'stoch_d': indicators.get('stoch_d', 50),
            'adx': indicators.get('adx', 20),
            'plus_di': indicators.get('plus_di', 50),
            'minus_di': indicators.get('minus_di', 50),
            'atr': indicators.get('atr', 0),
            'atr_percent': indicators.get('atr_percent', 0),
            'price_vs_cloud': indicators.get('price_vs_cloud', 'neutral'),

            # Support/Résistance avancés
            'supports': sr_levels.get('supports', []),
            'resistances': sr_levels.get('resistances', []),
            'pivot': sr_levels.get('pivot', current_price),

            # Prix cibles intelligents
            'tp1': targets.get('tp1', 0),
            'tp2': targets.get('tp2', 0),
            'tp3': targets.get('tp3', 0),
            'sl': targets.get('sl', 0),
            'risk_reward': targets.get('risk_reward', 0),
        }

        # Analyse IA complète
        try:
            ai_analysis = ai_complete_analysis(ticker, data, result)
            if ai_analysis:
                result['ai_analysis'] = ai_analysis
        except Exception as e:
            print(f"[AI] Erreur analyse IA pour {ticker}: {e}")

        return result

    except Exception as e:
        error_msg = str(e)
        error_lower = error_msg.lower()

        # Erreurs spécifiques avec messages clairs
        if "delisted" in error_lower or "possibly delisted" in error_lower:
            print(f"⚠️ {ticker}: Action possiblement délistée")
            return {
                'error': 'ticker_delisted',
                'ticker': ticker,
                'message': f"{ticker} est délisté ou n'existe pas sur les marchés."
            }
        elif "no data found" in error_lower or "no price data" in error_lower:
            print(f"⚠️ {ticker}: Aucune donnée disponible")
            return {
                'error': 'no_data',
                'ticker': ticker,
                'message': f"Aucune donnée disponible pour {ticker}. Ticker invalide ou marché fermé."
            }
        elif "timed out" in error_lower or "timeout" in error_lower:
            print(f"⏱️ {ticker}: Timeout")
            return {
                'error': 'timeout',
                'ticker': ticker,
                'message': f"Délai dépassé pour {ticker}. Réessayez dans quelques secondes."
            }
        elif "connection" in error_lower or "network" in error_lower:
            print(f"🌐 {ticker}: Erreur réseau")
            return {
                'error': 'network_error',
                'ticker': ticker,
                'message': f"Erreur de connexion lors de l'analyse de {ticker}. Vérifiez votre connexion internet."
            }
        else:
            print(f"❌ Erreur analyse {ticker}: {error_msg[:100]}")
            return {
                'error': 'unknown',
                'ticker': ticker,
                'message': f"Erreur lors de l'analyse de {ticker}: {error_msg[:80]}"
            }

def scan_market(watchlist_dict, min_score=2, log_progress=False):
    """Scanne tous les marchés en PARALLÈLE et retourne les meilleures opportunités (10x plus rapide)"""
    all_results = []
    total_tickers = sum(len(tickers) for tickers in watchlist_dict.values())

    for market, tickers in watchlist_dict.items():
        market_display = {
            "CAC40": "🇫🇷 CAC 40",
            "DAX": "🇩🇪 DAX",
            "US_TECH": "🇺🇸 Tech US",
            "US_BLUE_CHIPS": "🇺🇸 Blue Chips US",
            "CRYPTO": "🪙 Crypto",
            "ASIA": "🌏 Asie"
        }.get(market, market)

        print(f"Scan du marché: {market}...")

        if log_progress:
            # Envoyer un log asynchrone
            asyncio.create_task(log_to_channel(f"Démarrage scan {market_display} ({len(tickers)} actions)", "🔍"))

        # Utiliser scan_market_parallel pour performance 10x
        market_results = scan_market_parallel(tickers, min_score=min_score)

        # Ajouter le nom du marché à chaque résultat
        for result in market_results:
            result['market'] = market
            all_results.append(result)

        if log_progress:
            asyncio.create_task(log_to_channel(
                f"✅ {market_display} terminé : {len(market_results)} opportunité(s) trouvée(s)",
                "📊"
            ))

    # Trier par score absolu (opportunités les plus fortes)
    all_results.sort(key=lambda x: abs(x['score']), reverse=True)
    return all_results

# ==================== FORMATAGE MESSAGES TELEGRAM ====================

def format_stock_message_compact(analysis):
    """Version COMPACTE pour mobile (50% plus court)"""
    market_status = get_market_status(analysis['ticker'])
    currency = '€' if '.PA' in analysis['ticker'] or '.AS' in analysis['ticker'] else '$'

    # RSI simple
    if analysis['rsi'] < 30:
        rsi_text = f"{analysis['rsi']:.0f} 🟢 Survendu"
    elif analysis['rsi'] > 70:
        rsi_text = f"{analysis['rsi']:.0f} 🔴 Suracheté"
    else:
        rsi_text = f"{analysis['rsi']:.0f}"

    # Momentum
    momentum = analysis.get('price_momentum', 0)
    momentum_emoji = "🚀" if momentum > 5 else "📈" if momentum > 0 else "📉" if momentum > -5 else "💥"

    # Volume
    vol_ratio = analysis.get('volume_ratio', 1.0)
    vol_emoji = "🔥" if vol_ratio > 1.5 else "📊" if vol_ratio > 1 else "💤"

    msg = f"""
📊 **{analysis['ticker']}** - {analysis['name'][:30]}
{market_status['emoji']} {market_status['message'].split(chr(10))[0]}

💰 **{currency}{analysis['price']:.2f}** ({'📈' if analysis['variation'] > 0 else '📉'} {analysis['variation']:+.2f}%)

━━━━━━━━━━━━━━━━━━━━
🎯 **{analysis['signal']}**
⭐ Score: **{analysis['score']}/15** | 🎲 Confiance: {analysis.get('confidence', 0)}%

📊 **Indicateurs:**
• RSI: {rsi_text}
• Tendance: {analysis['trend']}
• {momentum_emoji} Momentum: {momentum:+.1f}%
• {vol_emoji} Volume: {'+' if vol_ratio > 1 else ''}{(vol_ratio-1)*100:.0f}%
"""

    # Section IA compacte SI disponible
    if 'ai_analysis' in analysis and analysis['ai_analysis']:
        ai = analysis['ai_analysis']
        tp2_pct = ((ai['tp2'] - analysis['price']) / analysis['price'] * 100)
        sl_pct = ((ai['stop_loss'] - analysis['price']) / analysis['price'] * 100)

        msg += f"""
━━━━━━━━━━━━━━━━━━━━
🎯 **Trading:**
• TP: {currency}{ai['tp2']:.2f} ({tp2_pct:+.1f}%)
• SL: {currency}{ai['stop_loss']:.2f} ({sl_pct:+.1f}%)
• R/R: {ai['risk_reward']:.2f}
• Probabilité: {ai['probability']}%
"""

    msg += "\n\n📱 _Mode Compact activé - Changez dans /menu > Paramètres_"

    return msg

def format_stock_message(analysis, display_mode='detailed'):
    """
    Formate un message pour une action
    display_mode: 'detailed' (par défaut) ou 'compact' (mobile-friendly)
    """
    if display_mode == 'compact':
        return format_stock_message_compact(analysis)

    # Mode détaillé (code existant)
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

    # Footer mode d'affichage
    msg += "\n📊 _Mode Détaillé - Activez le Mode Compact dans /menu > Paramètres_"

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

    # Statistiques du scan
    buy_signals = [r for r in results if "ACHAT" in r['signal']]
    sell_signals = [r for r in results if "VENTE" in r['signal']]
    neutral_signals = [r for r in results if r not in buy_signals and r not in sell_signals]

    # Distribution par marché
    markets_count = {}
    for r in results:
        market = r.get('market', 'Inconnu')
        markets_count[market] = markets_count.get(market, 0) + 1

    msg += f"📊 **STATISTIQUES**\n"
    msg += f"• Total analysé: {len(results)}\n"
    msg += f"• 🟢 Achats: {len(buy_signals)} | 🔴 Ventes: {len(sell_signals)} | ⚪ Neutre: {len(neutral_signals)}\n"
    if markets_count:
        msg += f"• Marchés: {', '.join([f'{k} ({v})' for k, v in markets_count.items()])}\n"
    msg += "\n"

    msg += f"🎯 **TOP {top_n} OPPORTUNITÉS**\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

    for i, result in enumerate(results[:top_n], 1):
        ticker = result['ticker']
        name = result['name'][:25]
        signal = result['signal']
        score = result['score']
        price = result['price']
        var = result['variation']
        rsi = result['rsi']
        trend = result.get('trend', 'N/A')
        momentum = result.get('price_momentum', 0)
        volume_ratio = result.get('volume_ratio', 1.0)

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

        # Emoji volume
        vol_emoji = "🔥" if volume_ratio > 1.5 else "📊" if volume_ratio > 1 else "💤"

        # Emoji momentum
        momentum_emoji = "🚀" if momentum > 5 else "📈" if momentum > 0 else "📉" if momentum > -5 else "💥"

        # Format carte élégante avec plus d'infos
        msg += f"{emoji} **{ticker}** — {name}\n"
        msg += f"├ Signal: {signal} ({score:+.1f})\n"
        msg += f"├ Prix: {price:.2f}€ {var_emoji} {var:+.1f}%\n"
        msg += f"├ RSI: {rsi:.0f} | Tendance: {trend}\n"
        msg += f"└ {momentum_emoji} Momentum: {momentum:+.1f}% | {vol_emoji} Volume: {'+' if volume_ratio > 1 else ''}{(volume_ratio-1)*100:.0f}%\n"
        msg += f"   [Analyser /{ticker.lower().replace('.', '')}]\n\n"

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

async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /menu - Menu principal unifié avec toutes les fonctionnalités"""
    user_name = get_user_name(update)
    user_id = update.effective_user.id

    # Ajouter l'utilisateur
    get_or_create_user(user_id)

    # Menu principal avec boutons organisés
    keyboard = [
        [
            InlineKeyboardButton("📊 Analyser", callback_data="menu_analyze"),
            InlineKeyboardButton("🔍 Scanner", callback_data="menu_scanner")
        ],
        [
            InlineKeyboardButton("💼 Wallet", callback_data="menu_wallet"),
            InlineKeyboardButton("🌍 Marchés", callback_data="markets_menu")
        ],
        [
            InlineKeyboardButton("🧪 Backtest", callback_data="menu_backtest"),
            InlineKeyboardButton("🤖 Prédiction ML", callback_data="menu_ml")
        ],
        [
            InlineKeyboardButton("📌 Favoris", callback_data="menu_favorites"),
            InlineKeyboardButton("🔔 Alertes", callback_data="menu_alerts")
        ],
        [
            InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings"),
            InlineKeyboardButton("ℹ️ Aide", callback_data="menu_help")
        ],
        [
            InlineKeyboardButton("❌ Fermer", callback_data="menu_close")
        ]
    ]

    reply_markup = InlineKeyboardMarkup(keyboard)

    message = f"""
🤖 *TRADING COMPANION v5.0 - {user_name}*

━━━━━━━━━━━━━━━━━━━━
📈 *ANALYSE & TRADING*
━━━━━━━━━━━━━━━━━━━━

📊 */analyze TICKER* - Analyse complète avec 15+ indicateurs
🔍 */scanner* - Scanner les meilleurs opportunités
💼 */wallet* - Gérer votre portefeuille virtuel
🌍 */markets* - État des marchés mondiaux

━━━━━━━━━━━━━━━━━━━━
🧪 *OUTILS AVANCÉS (NOUVEAU)*
━━━━━━━━━━━━━━━━━━━━

🧪 */backtest TICKER* - Backtester la stratégie
🤖 */predict TICKER* - Prédiction ML (5-10j)
📊 */compare TICKER1 TICKER2* - Comparer 2 actions

━━━━━━━━━━━━━━━━━━━━
⚙️ *PERSONNALISATION*
━━━━━━━━━━━━━━━━━━━━

📌 */fav* - Gérer favoris
🔔 */alert* - Gérer alertes
⚙️ */settings* - Configuration

━━━━━━━━━━━━━━━━━━━━
💡 *Utilisez /menu pour revenir ici*
"""

    await update.message.reply_text(
        message,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /start - Redirige vers /menu"""
    await menu_command(update, context)



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
    crypto_status = get_market_status("BTC-USD")

    message = f"""
🕐 *STATUT DES MARCHÉS* - {user_name}

{euronext_status['message']}

━━━━━━━━━━━━━━━━

{xetra_status['message']}

━━━━━━━━━━━━━━━━

{us_status['message']}

━━━━━━━━━━━━━━━━

{crypto_status['message']}

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

async def check_price_alerts(context: ContextTypes.DEFAULT_TYPE):
    """Vérifie toutes les alertes actives et envoie des notifications"""
    db = context.bot_data.get('db')
    if not db:
        return

    try:
        # Récupérer toutes les alertes actives
        active_alerts = db.get_all_active_alerts()

        if not active_alerts:
            return

        print(f"[ALERTS] Vérification de {len(active_alerts)} alerte(s) active(s)...")

        # Grouper les alertes par ticker pour optimiser les requêtes API
        alerts_by_ticker = {}
        for alert in active_alerts:
            ticker = alert['ticker']
            if ticker not in alerts_by_ticker:
                alerts_by_ticker[ticker] = []
            alerts_by_ticker[ticker].append(alert)

        # Vérifier chaque ticker
        for ticker, ticker_alerts in alerts_by_ticker.items():
            try:
                # Récupérer le prix actuel
                stock = yf.Ticker(ticker)
                data = stock.history(period='1d', interval='1m')

                if data.empty:
                    continue

                current_price = data['Close'].iloc[-1]

                # Vérifier chaque alerte pour ce ticker
                for alert in ticker_alerts:
                    condition = alert['condition']
                    target_price = alert['target_price']
                    triggered = False

                    if condition == '>' and current_price >= target_price:
                        triggered = True
                    elif condition == '<' and current_price <= target_price:
                        triggered = True

                    if triggered:
                        # Marquer comme déclenchée
                        db.trigger_alert(alert['id'])

                        # Calculer la variation
                        variation_pct = ((current_price - target_price) / target_price) * 100

                        # Envoyer notification à l'utilisateur
                        message = f"""
🔔 *ALERTE DÉCLENCHÉE !*

Ticker: *{ticker}*
Condition: Prix {condition} {target_price:.2f}
Prix actuel: *{current_price:.2f}*
Variation: {variation_pct:+.2f}%

⏰ {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

💡 Utilise /analyze {ticker} pour une analyse complète !
"""

                        try:
                            await context.bot.send_message(
                                chat_id=alert['user_id'],
                                text=message,
                                parse_mode='Markdown'
                            )
                            print(f"[ALERTS] ✅ Alerte #{alert['id']} déclenchée: {ticker} {condition} {target_price} (prix: {current_price:.2f})")
                        except Exception as e:
                            print(f"[ALERTS] ❌ Erreur envoi notification: {e}")

            except Exception as e:
                print(f"[ALERTS] Erreur vérification {ticker}: {e}")
                continue

    except Exception as e:
        print(f"[ALERTS] Erreur générale: {e}")


async def check_alerts_callback(context: ContextTypes.DEFAULT_TYPE):
    """Callback périodique pour vérifier les alertes de prix"""
    await check_price_alerts(context)


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
    user_id = update.effective_user.id

    # Récupérer les préférences utilisateur (mode d'affichage)
    db = context.bot_data.get('db')
    display_mode = 'detailed'  # Par défaut
    if db:
        try:
            user_settings = db.get_user_settings(user_id)
            if user_settings:
                display_mode = user_settings.get('display_mode', 'detailed')
        except:
            pass

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

    # Gérer les erreurs spécifiques
    if result and 'error' in result:
        error_messages = {
            'ticker_delisted': f"❌ {ticker} est délisté ou n'existe pas sur les marchés.",
            'no_data': f"❌ Aucune donnée disponible pour {ticker}.\n💡 Vérifiez que le ticker est correct.",
            'timeout': f"⏱️ Délai dépassé pour {ticker}.\n🔄 Réessayez dans quelques secondes.",
            'network_error': f"🌐 Erreur de connexion lors de l'analyse de {ticker}.\n💡 Vérifiez votre connexion internet.",
            'unknown': result.get('message', f"❌ Erreur lors de l'analyse de {ticker}")
        }
        error_msg = error_messages.get(result['error'], result.get('message', f"❌ Impossible d'analyser {ticker}"))
        await update.message.reply_text(error_msg, parse_mode='Markdown')
        return

    if result:
        message = format_stock_message(result, display_mode=display_mode)
        # Ajouter l'info du timeframe
        message = message.replace("━━━━━━━━━━━━━━━━━━━━", f"⏰ Timeframe: {timeframe_display[timeframe]}\n━━━━━━━━━━━━━━━━━━━━")

        # Créer les boutons d'action (disposition optimisée)
        keyboard = [
            # Row 1: Action principale + actualiser
            [
                InlineKeyboardButton("📈 Graphique", callback_data=f"chart_{ticker}_{interval}"),
                InlineKeyboardButton("🔄 Actualiser", callback_data=f"refresh_analysis_{ticker}_{interval}")
            ],
            # Row 2: Analyses techniques
            [
                InlineKeyboardButton("🧪 Backtest 1 an", callback_data=f"backtest_{ticker}"),
                InlineKeyboardButton("🔮 Prédiction ML", callback_data=f"predict_{ticker}")
            ],
            # Row 3: Info & Trading
            [
                InlineKeyboardButton("📰 News", callback_data=f"news_{ticker}"),
                InlineKeyboardButton("🤖 Trading AI", callback_data=f"companion_step1_{ticker}")
            ],
            # Row 4: Favoris
            [
                InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"fav_add_{ticker}")
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

async def backtest_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /backtest TICKER - Backteste la stratégie sur 1 an"""
    user_name = get_user_name(update)

    if not context.args:
        await update.message.reply_text(
            f"*{user_name}*, il me faut un ticker !\n\nUsage: /backtest TICKER\nExemple: /backtest AAPL",
            parse_mode='Markdown'
        )
        return

    ticker = context.args[0].upper()

    await update.message.reply_text(
        f"🧪 *{user_name}*, lancement du backtest...\n\n💡 *Qu'est-ce qu'un backtest ?*\nSimulation de notre stratégie de trading sur les 12 derniers mois avec 10 000$ de capital initial.\n\n⏱️ Analyse en cours...",
        parse_mode='Markdown'
    )

    # Backtester
    result = backtest_strategy(ticker)

    if result:
        # Vérifier si aucun trade n'a été exécuté
        if result.get('no_trades'):
            message = f"""
🧪 *BACKTEST - {result['ticker']}*

━━━━━━━━━━━━━━━━━━━━
ℹ️ *AUCUN TRADE EXÉCUTÉ*
━━━━━━━━━━━━━━━━━━━━

📅 Période: {result['period']}
📊 Jours analysés: {result['days_analyzed']}
💰 Capital initial: ${result['initial_capital']:,.0f}

❓ *Raison:*
{result['reason']}

📊 *Détails:*
• Signaux détectés: {result['total_signals']}
• Positions ouvertes: {result['pending_trades']}
• Score minimum requis: {result['min_score_required']}/15

💡 *Suggestions:*
• Essayez une période plus longue
• Le ticker n'a peut-être pas eu assez de signaux forts
• Les conditions de marché étaient peut-être trop neutres

⚠️ _Score requis: ≥8/15 avec confiance ≥70%_
"""
        else:
            message = f"""
🧪 *BACKTEST - {result['ticker']}*
_Simulation de notre stratégie sur données historiques_

━━━━━━━━━━━━━━━━━━━━
📊 *PERFORMANCE (SIMULATION)*
━━━━━━━━━━━━━━━━━━━━

💰 Capital initial: ${result['initial_capital']:,.0f}
💵 Capital final: ${result['final_capital']:,.2f}
📈 Rendement total: {result['total_return']:+.2f}%
📉 Max drawdown: {result['max_drawdown']:.2f}%
⚡ Sharpe ratio: {result['sharpe_ratio']:.2f}

━━━━━━━━━━━━━━━━━━━━
📊 *TRADES SIMULÉS*
━━━━━━━━━━━━━━━━━━━━

📊 Total trades: {result['total_trades']}
   • 🟢 LONG (achats): {result['long_trades']}
   • 🔴 SHORT (ventes): {result['short_trades']}

✅ Trades gagnants: {result['winning_trades']}
❌ Trades perdants: {result['losing_trades']}
🎯 Win rate: {result['win_rate']:.1f}%

━━━━━━━━━━━━━━━━━━━━
📅 *PÉRIODE TESTÉE*
━━━━━━━━━━━━━━━━━━━━

{result['period']}

💡 *Comment ça marche ?*
Le bot a simulé des achats/ventes automatiques basés sur notre algorithme technique (RSI, MACD, etc.) sur les 12 derniers mois.

📌 _Commission: 0.1% | Slippage: 0.05%_
⚠️ _Ces résultats sont une SIMULATION. Performances passées ≠ résultats futurs_
"""

        await update.message.reply_text(message, parse_mode='Markdown')
    else:
        await update.message.reply_text(
            f"❌ Désolé *{user_name}*, impossible de backtester {ticker}",
            parse_mode='Markdown'
        )

async def predict_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /predict TICKER - Prédiction ML sur 5-10 jours"""
    user_name = get_user_name(update)

    if not context.args:
        await update.message.reply_text(
            f"*{user_name}*, il me faut un ticker !\n\nUsage: /predict TICKER\nExemple: /predict AAPL",
            parse_mode='Markdown'
        )
        return

    ticker = context.args[0].upper()

    await update.message.reply_text(
        f"🤖 *{user_name}*, prédiction ML pour {ticker}...",
        parse_mode='Markdown'
    )

    # Prédiction ML
    result = predict_ml(ticker)

    if result:
        # Emoji selon prédiction
        if 'HAUSSE' in result['prediction']:
            emoji = '🟢'
        elif 'BAISSE' in result['prediction']:
            emoji = '🔴'
        else:
            emoji = '⚪'

        # Échapper les underscores pour Markdown
        prediction_text = result['prediction'].replace('_', '\\_')

        message = f"""
🤖 *PRÉDICTION ML - {result['ticker']}*

━━━━━━━━━━━━━━━━━━━━
🔮 *PRÉDICTION*
━━━━━━━━━━━━━━━━━━━━

{emoji} *Direction:* {prediction_text}
📊 *Probabilité:* {result['probability']:.1f}%
📈 *Score signal:* {result['score']}/15
🎯 *Confiance:* {result['confidence']:.1f}%

━━━━━━━━━━━━━━━━━━━━
⏰ *HORIZON*
━━━━━━━━━━━━━━━━━━━━

{result['horizon']}

━━━━━━━━━━━━━━━━━━━━
📊 *FACTEURS CLÉS*
━━━━━━━━━━━━━━━━━━━━

• RSI: {result['factors']['rsi']:.1f}
• ADX: {result['factors']['adx']:.1f}
• Bollinger: {result['factors']['bb_position']:.1f}%
• Stochastic: {result['factors']['stoch_k']:.1f}

💡 _Prédiction basée sur 15+ indicateurs techniques_
⚠️ _Ceci n'est pas un conseil financier_
"""

        await update.message.reply_text(message, parse_mode='Markdown')
    else:
        await update.message.reply_text(
            f"❌ Désolé *{user_name}*, impossible de prédire {ticker}",
            parse_mode='Markdown'
        )

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
        # Removed old auto_scan
    
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
                                                     gridspec_kw={'height_ratios': [3, 1, 2, 1]})
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
                      color='white', fontsize=14, fontweight='bold', pad=15)
        ax1.set_ylabel('Prix ($)', color='white', fontsize=11, fontweight='bold')
        ax1.legend(loc='upper left', facecolor='#1a1d24', edgecolor='white', labelcolor='white', fontsize=8, ncol=2)
        ax1.grid(True, alpha=0.15, color='white', linestyle=':')
        ax1.tick_params(colors='white', labelsize=9)
        
        # Subplot Volume
        ax_vol.set_facecolor('#1a1d24')
        colors_vol = ['#34c759' if data['Close'].iloc[i] >= data['Open'].iloc[i] else '#ff3b30'
                      for i in range(len(data))]
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
                        'jumps', 'rallies', 'climbs', 'outperform']
        negative_words = ['fall', 'loss', 'down', 'drop', 'decline', 'weak', 'bearish',
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
    
    # Créer le menu avec boutons RESTRUCTURÉ
    keyboard = [
        [InlineKeyboardButton("🌍 Marchés", callback_data="markets_menu")],
        [InlineKeyboardButton("🚨 Scanner Opportunités", callback_data="scan_opportunities")],
        [InlineKeyboardButton("🎯 Positions", callback_data="menu_wallet")],
        [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")],
        [InlineKeyboardButton("❌ Fermer", callback_data="menu_close")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = f"""
🤖 *TRADING BOT - MENU PRINCIPAL*

Bienvenue {user_name} !

📊 *Marchés* : Scanner et analyser les opportunités
🚨 *Scanner* : Détection automatique + Configuration IA
🎯 *Positions* : Gérer votre portefeuille
⚙️ *Paramètres* : Configurer le bot

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
            f"❌ Impossible d'envoyer le menu en privé.\n\n💡 Veuillez d'abord démarrer une conversation avec le bot.",
            parse_mode='Markdown'
        )
    
    # Enregistrer l'utilisateur dans la DB
    if 'db' in context.bot_data:
        db = context.bot_data['db']
        username = update.effective_user.username or update.effective_user.first_name
        register_user(db, user_id, username)
    
    # Enregistrer l'utilisateur dans bot_data pour les alertes
    if 'active_users' not in context.bot_data:
        context.bot_data['active_users'] = set()
    context.bot_data['active_users'].add(user_id)

async def menu_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les callbacks du menu"""
    global db
    query = update.callback_query
    
    # Gérer les query expirées
    try:
        await query.answer()
    except Exception as e:
        if "too old" in str(e).lower() or "timeout" in str(e).lower():
            # Query expirée, continuer quand même
            print(f"[MENU] Query expirée: {e}")
            pass
        else:
            # Autre erreur, la relever
            raise
    
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
            [InlineKeyboardButton("🗑️ Réinitialiser", callback_data="reset_wallet_confirm")],
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
        # Récupérer les paramètres actuels de l'utilisateur
        user_settings = db.get_user_settings(user_id)
        current_display_mode = user_settings.get('display_mode', 'detailed') if user_settings else 'detailed'

        display_mode_text = "📱 Compact (Mobile)" if current_display_mode == 'compact' else "📊 Détaillé (Complet)"

        # Menu paramètres avec mode d'affichage
        keyboard = [
            [InlineKeyboardButton(f"📱 Mode d'affichage: {display_mode_text}", callback_data="toggle_display_mode")],
            [InlineKeyboardButton("🚨 Alertes Opportunités", callback_data="alert_settings")],
            [InlineKeyboardButton("⬅️ Retour Menu", callback_data="menu_back")]
        ]
        await query.edit_message_text(
            f"⚙️ *PARAMÈTRES*\n\nConfigurer vos préférences :\n\n*Mode d'affichage actuel:* {display_mode_text}\n• *Compact*: Messages optimisés mobile (50% plus courts)\n• *Détaillé*: Analyse complète avec tous les détails",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        return
    

    elif action == "menu_favorites":
        # Rediriger vers nouveau menu
        keyboard = [
            [InlineKeyboardButton("🌍 Marchés", callback_data="markets_menu")],
            [InlineKeyboardButton("🚨 Scanner Opportunités", callback_data="scan_opportunities")],
            [InlineKeyboardButton("🎯 Positions", callback_data="menu_wallet")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")],
            [InlineKeyboardButton("❌ Fermer", callback_data="menu_close")]
        ]
        await query.edit_message_text(
            f"🤖 *MENU PRINCIPAL*\n\nBienvenue {user_name} !",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        return
    

    elif action == "menu_alerts":
        # Rediriger vers nouveau menu
        keyboard = [
            [InlineKeyboardButton("🌍 Marchés", callback_data="markets_menu")],
            [InlineKeyboardButton("🚨 Scanner Opportunités", callback_data="scan_opportunities")],
            [InlineKeyboardButton("🎯 Positions", callback_data="menu_wallet")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")],
            [InlineKeyboardButton("❌ Fermer", callback_data="menu_close")]
        ]
        await query.edit_message_text(
            f"🤖 *MENU PRINCIPAL*\n\nBienvenue {user_name} !",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        return
    

    elif action == "menu_help":
        # Rediriger vers nouveau menu
        keyboard = [
            [InlineKeyboardButton("🌍 Marchés", callback_data="markets_menu")],
            [InlineKeyboardButton("🚨 Scanner Opportunités", callback_data="scan_opportunities")],
            [InlineKeyboardButton("🎯 Positions", callback_data="menu_wallet")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")],
            [InlineKeyboardButton("❌ Fermer", callback_data="menu_close")]
        ]
        await query.edit_message_text(
            f"🤖 *MENU PRINCIPAL*\n\nBienvenue {user_name} !",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        return
    

    elif action == "menu_back":
        # Rediriger vers nouveau menu
        keyboard = [
            [InlineKeyboardButton("🌍 Marchés", callback_data="markets_menu")],
            [InlineKeyboardButton("🚨 Scanner Opportunités", callback_data="scan_opportunities")],
            [InlineKeyboardButton("🎯 Positions", callback_data="menu_wallet")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="menu_settings")],
            [InlineKeyboardButton("❌ Fermer", callback_data="menu_close")]
        ]
        await query.edit_message_text(
            f"🤖 *MENU PRINCIPAL*\n\nBienvenue {user_name} !",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        return
    

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
        # Removed old auto_scan
    
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

# ==================== NOUVEAUX HANDLERS ====================

async def scan_us_inline(update, context, user_id, bot, db):
    await unified_scanner_inline_commands(update, context, user_id, bot, db, 'us', US_WATCHLIST, MARKET_CONFIGS_INLINE['us'])

async def scan_asia_inline(update, context, user_id, bot, db):
    await unified_scanner_inline_commands(update, context, user_id, bot, db, 'asia', ASIA_WATCHLIST, MARKET_CONFIGS_INLINE['asia'])

async def scan_europe_inline(update, context, user_id, bot, db):
    await unified_scanner_inline_commands(update, context, user_id, bot, db, 'europe', EUROPE_WATCHLIST, MARKET_CONFIGS_INLINE['europe'])

async def scan_commodities_inline(update, context, user_id, bot, db):
    await unified_scanner_inline_commands(update, context, user_id, bot, db, 'commodities', COMMODITIES_WATCHLIST, MARKET_CONFIGS_INLINE['commodities'])

async def scan_crypto_inline(update, context, user_id, bot, db):
    await unified_scanner_inline_commands(update, context, user_id, bot, db, 'crypto', CRYPTO_WATCHLIST, MARKET_CONFIGS_INLINE['crypto'])






# Handlers pour forcer le scan d'un marché fermé
async def force_scan_market_handler(update, context, user_id, bot, db, market_type):
    """Force le scan d'un marché même s'il est fermé"""
    print(f"[DEBUG] force_scan_market_handler appelé - market_type: {market_type}")
    
    query = update.callback_query
    await query.answer("🔍 Scan forcé...")
    
    print(f"[DEBUG] Récupération config pour {market_type}")
    
    # Récupérer la config du marché
    market_configs = {
        'us': (US_WATCHLIST, MARKET_CONFIGS_INLINE['us']),
        'asia': (ASIA_WATCHLIST, MARKET_CONFIGS_INLINE['asia']),
        'europe': (EUROPE_WATCHLIST, MARKET_CONFIGS_INLINE['europe']),
        'crypto': (CRYPTO_WATCHLIST, MARKET_CONFIGS_INLINE['crypto']),
        'commodities': (COMMODITIES_WATCHLIST, MARKET_CONFIGS_INLINE['commodities'])
    }
    
    watchlist, market_config = market_configs.get(market_type, (None, None))
    
    print(f"[DEBUG] Watchlist trouvée: {watchlist is not None}, Config: {market_config is not None}")
    
    if not watchlist:
        print(f"[ERROR] Marché non trouvé: {market_type}")
        await query.edit_message_text("❌ Marché non trouvé")
        return
    
    # Afficher message de scan
    await query.edit_message_text(
        f"{market_config['icon']} *SCAN FORCÉ - {market_config['title']}*\n\n⚠️ Marché fermé - Données possiblement obsolètes\n⏳ Récupération...",
        parse_mode='Markdown'
    )
    
    # Continuer le scan normalement (copie du code existant)
    import yfinance as yf
    
    results = []
    
    for ticker, info in watchlist.items():
        try:
            print(f"[SCAN FORCÉ {market_type.upper()}] Analyse {ticker}...")
            
            stock = yf.Ticker(ticker)
            data = stock.history(period='6mo')
            
            if data.empty:
                continue
            
            current_price = data['Close'].iloc[-1]
            
            # RSI
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1]
            
            # Performance
            price_1w_ago = data['Close'].iloc[-5] if len(data) > 5 else current_price
            price_1m_ago = data['Close'].iloc[-21] if len(data) > 21 else current_price
            price_3m_ago = data['Close'].iloc[-63] if len(data) > 63 else current_price
            
            perf_1w = ((current_price - price_1w_ago) / price_1w_ago * 100) if price_1w_ago > 0 else 0
            perf_1m = ((current_price - price_1m_ago) / price_1m_ago * 100) if price_1m_ago > 0 else 0
            perf_3m = ((current_price - price_3m_ago) / price_3m_ago * 100) if price_3m_ago > 0 else 0
            
            # Moyenne mobile
            sma50 = data['Close'].rolling(window=50).mean().iloc[-1]
            above_sma = (current_price > sma50)
            
            # Volume
            avg_volume = data['Volume'].mean()
            current_volume = data['Volume'].iloc[-1]
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 0
            
            results.append({
                'ticker': ticker,
                'name': info['name'],
                'price': current_price,
                'rsi': current_rsi,
                'perf_1w': perf_1w,
                'perf_1m': perf_1m,
                'perf_3m': perf_3m,
                'above_sma': above_sma,
                'volume_ratio': volume_ratio
            })
            
        except Exception as e:
            print(f"[SCAN FORCÉ {market_type.upper()}] Erreur {ticker}: {e}")
            continue
    
    # Trier par performance 1m
    results.sort(key=lambda x: x['perf_1m'], reverse=True)
    
    # Créer message
    message = f"{market_config['icon']} *{market_config['title']} - SCAN FORCÉ*\n"
    message += f"⚠️ *Marché actuellement fermé*\n\n"
    message += f"📊 Actifs scannés: {len(results)}\n\n"
    
    if results:
        message += "🔝 *TOP PERFORMERS*\n\n"
        for i, r in enumerate(results[:5], 1):
            emoji = "🟢" if r['perf_1m'] > 0 else "🔴"
            message += f"{i}. {r['ticker']} ({r['name']})\n"
            message += f"   💰 ${r['price']:.2f} | RSI {r['rsi']:.0f}\n"
            message += f"   {emoji} 1M: {r['perf_1m']:+.1f}% | 3M: {r['perf_3m']:+.1f}%\n\n"
    else:
        message += "❌ Aucune donnée disponible\n"
    
    message += "\n💡 *Note:* Scan effectué malgré la fermeture du marché"
    
    # Bouton retour
    keyboard = [
        [InlineKeyboardButton("⬅️ Retour aux marchés", callback_data="markets_menu")]
    ]
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère les clics sur les boutons"""
    import os  # Import nécessaire pour os.path.exists et os.remove
    query = update.callback_query
    
    # Debug: afficher quel bouton a été cliqué
    print(f"[DEBUG] Button callback - query.data: {query.data}")
    
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
        
        elif query.data.startswith("force_scan_"):
            # Forcer le scan d'un marché fermé
            market_type = query.data.replace("force_scan_", "")
            print(f"[DEBUG] Force scan demandé pour marché: {market_type}")
            try:
                await force_scan_market_handler(update, context, user_id, bot, db, market_type)
            except Exception as e:
                print(f"[ERROR] Erreur force_scan_market_handler: {e}")
                import traceback
                traceback.print_exc()
                await query.edit_message_text(f"❌ Erreur lors du scan forcé: {str(e)}")
            return
            
        elif query.data == "scan_us":
            await scan_us_inline(update, context, user_id, bot, db)
            return
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
        
        # ==================== TRADING COMPANION v4.0 ====================
        
        elif query.data.startswith("companion_step1_"):
            ticker = query.data.replace("companion_step1_", "")
            await companion_start(update, context, ticker, user_id, bot, db)
        
        elif query.data.startswith("companion_step2_"):
            ticker = query.data.replace("companion_step2_", "")
            await companion_step2_amount(update, context, ticker, user_id, bot, db)
        
        elif query.data.startswith("companion_step3_"):
            ticker = query.data.replace("companion_step3_", "")
            await companion_step3_strategy(update, context, ticker, user_id, bot, db)
        
        elif query.data.startswith("companion_amt_"):
            parts = query.data.replace("companion_amt_", "").split("_")
            ticker = parts[0]
            percentage = parts[1]
            await companion_handle_amount_button(update, context, ticker, percentage, user_id, bot, db)
        
        elif query.data.startswith("companion_strategy_"):
            parts = query.data.replace("companion_strategy_", "").split("_")
            ticker = parts[0]
            strategy = parts[1]
            await companion_step4_confirm(update, context, ticker, strategy, user_id, bot, db)
        
        elif query.data.startswith("companion_execute_"):
            ticker = query.data.replace("companion_execute_", "")
            await companion_execute(update, context, ticker, user_id, bot, db)
        
        elif query.data == "companion_cancel":
            await companion_cancel(update, context, user_id, bot)
        
        
        
        # ==================== GESTION DES POSITIONS ====================
        
        elif query.data == "view_all_positions":
            await view_all_positions_handler(update, context, user_id, bot, db)
        
        elif query.data.startswith("close_pos_"):
            position_id = int(query.data.replace("close_pos_", ""))
            await close_position_handler(update, context, position_id, user_id, bot, db)
        
        
        # RÉINITIALISATION WALLET
        elif query.data == "reset_wallet_confirm":
            await reset_wallet_confirm(update, context, user_id, bot, db)
        
        elif query.data == "reset_wallet_yes":
            await reset_wallet_execute(update, context, user_id, bot, db)
        
        
        # SCANNER MULTI-CATÉGORIES
        elif query.data == "scan_opportunities":
            await scan_opportunities_handler(update, context, user_id, bot, db)
        
        elif query.data == "force_scan":
            await force_scan_handler(update, context, user_id, bot, db)
        
        elif query.data == "alert_history":
            await alert_history_handler(update, context, user_id, bot, db)
        
        elif query.data == "alert_settings":
            await alert_settings_start(update, context, user_id, bot, db)

        elif query.data == "toggle_display_mode":
            # Basculer le mode d'affichage
            user_settings = db.get_user_settings(user_id)
            current_mode = user_settings.get('display_mode', 'detailed') if user_settings else 'detailed'
            new_mode = 'compact' if current_mode == 'detailed' else 'detailed'

            # Sauvegarder
            db.set_user_setting(user_id, 'display_mode', new_mode)

            mode_text = "📱 Compact (Mobile)" if new_mode == 'compact' else "📊 Détaillé (Complet)"
            await query.answer(f"✅ Mode {mode_text} activé!", show_alert=True)

            # Rafraîchir le menu
            keyboard = [
                [InlineKeyboardButton(f"📱 Mode d'affichage: {mode_text}", callback_data="toggle_display_mode")],
                [InlineKeyboardButton("🚨 Alertes Opportunités", callback_data="alert_settings")],
                [InlineKeyboardButton("⬅️ Retour Menu", callback_data="menu_back")]
            ]
            await query.edit_message_text(
                f"⚙️ *PARAMÈTRES*\n\nConfigurer vos préférences :\n\n*Mode d'affichage actuel:* {mode_text}\n• *Compact*: Messages optimisés mobile (50% plus courts)\n• *Détaillé*: Analyse complète avec tous les détails",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
            return

        elif query.data == "settings_score":
            await settings_score_handler(update, context, user_id, bot, db)
        
        elif query.data == "settings_markets":
            await settings_markets_handler(update, context, user_id, bot, db)
        
        elif query.data == "settings_interval":
            await settings_interval_handler(update, context, user_id, bot, db)
        
        elif query.data.startswith("toggle_market_"):
            await toggle_market_handler(update, context, user_id, bot, db)
        
        elif query.data.startswith("score_"):
            await set_score_handler(update, context, user_id)
        
        elif query.data.startswith("interval_"):
            await set_interval_handler(update, context, user_id)
        
        elif query.data == "settings_done":
            await settings_done_handler(update, context, user_id, bot, db)
        
        elif query.data == "settings_cancel":
            await settings_cancel_handler(update, context, user_id)
        
        elif query.data == "menu":
            # Retour menu principal
            await menu_command(update, context)
        

        elif query.data == "markets_menu":
            await markets_menu(update, context, user_id, bot, db)
        
        elif query.data == "scan_asia":
            await scan_asia_inline(update, context, user_id, bot, db)
        
        elif query.data == "scan_commodities":
            await scan_commodities_inline(update, context, user_id, bot, db)
        
        
        elif query.data == "scan_europe":
            await scan_europe_inline(update, context, user_id, bot, db)
        
        elif query.data == "scan_crypto":
            await scan_crypto_inline(update, context, user_id, bot, db)
        
        
        # ANALYSE DEPUIS BOUTON
        elif query.data.startswith("analyze_"):
            await analyze_from_button_handler(update, context, user_id, bot, db)
        
        
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
⭐ **Score**: {score}/15

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
            
            # Récupérer le mode d'affichage de l'utilisateur
            user_settings = db.get_user_settings(user_id)
            display_mode = user_settings.get('display_mode', 'detailed') if user_settings else 'detailed'

            result = analyze_stock(ticker, period=period, interval=interval)
            if result:
                message = format_stock_message(result, display_mode=display_mode)

                # Recréer les boutons avec disposition optimisée
                keyboard = [
                    # Row 1: Action principale + actualiser
                    [
                        InlineKeyboardButton("📈 Graphique", callback_data=f"chart_{ticker}_{interval}"),
                        InlineKeyboardButton("🔄 Actualiser", callback_data=f"refresh_analysis_{ticker}_{interval}")
                    ],
                    # Row 2: Analyses techniques
                    [
                        InlineKeyboardButton("🧪 Backtest 1 an", callback_data=f"backtest_{ticker}"),
                        InlineKeyboardButton("🔮 Prédiction ML", callback_data=f"predict_{ticker}")
                    ],
                    # Row 3: Info & Trading
                    [
                        InlineKeyboardButton("📰 News", callback_data=f"news_{ticker}"),
                        InlineKeyboardButton("🤖 Trading AI", callback_data=f"companion_step1_{ticker}")
                    ],
                    # Row 4: Favoris
                    [
                        InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"fav_add_{ticker}")
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





async def backtest_inline_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère le bouton Backtest depuis l'analyse"""
    query = update.callback_query
    await query.answer("🧪 Lancement du backtest...")

    ticker = query.data.split("_")[1]
    user_name = get_user_name(update)

    print(f"[BACKTEST] Inline backtest pour {ticker}")

    # Lancer le backtest
    result = backtest_strategy(ticker)

    if result:
        # Vérifier si aucun trade n'a été exécuté
        if result.get('no_trades'):
            message = f"""
🧪 *BACKTEST - {result['ticker']}*

━━━━━━━━━━━━━━━━━━━━
ℹ️ *AUCUN TRADE EXÉCUTÉ*
━━━━━━━━━━━━━━━━━━━━

📅 Période: {result['period']}
📊 Jours analysés: {result['days_analyzed']}
💰 Capital initial: ${result['initial_capital']:,.0f}

❓ *Raison:*
{result['reason']}

📊 *Détails:*
• Signaux détectés: {result['total_signals']}
• Positions ouvertes: {result['pending_trades']}
• Score minimum requis: {result['min_score_required']}/15

💡 *Suggestions:*
• Essayez une période plus longue
• Le ticker n'a peut-être pas eu assez de signaux forts
• Les conditions de marché étaient peut-être trop neutres

⚠️ _Score requis: ≥8/15 avec confiance ≥70%_
"""
        else:
            message = f"""
🧪 *BACKTEST - {result['ticker']}*
_Simulation de notre stratégie sur données historiques_

━━━━━━━━━━━━━━━━━━━━
📊 *PERFORMANCE (SIMULATION)*
━━━━━━━━━━━━━━━━━━━━

💰 Capital initial: ${result['initial_capital']:,.0f}
💵 Capital final: ${result['final_capital']:,.2f}
📈 Rendement total: {result['total_return']:+.2f}%
📉 Max drawdown: {result['max_drawdown']:.2f}%
⚡ Sharpe ratio: {result['sharpe_ratio']:.2f}

━━━━━━━━━━━━━━━━━━━━
📊 *TRADES SIMULÉS*
━━━━━━━━━━━━━━━━━━━━

📊 Total trades: {result['total_trades']}
   • 🟢 LONG (achats): {result['long_trades']}
   • 🔴 SHORT (ventes): {result['short_trades']}

✅ Trades gagnants: {result['winning_trades']}
❌ Trades perdants: {result['losing_trades']}
🎯 Win rate: {result['win_rate']:.1f}%

━━━━━━━━━━━━━━━━━━━━
📅 *PÉRIODE TESTÉE*
━━━━━━━━━━━━━━━━━━━━

{result['period']}

💡 *Comment ça marche ?*
Le bot a simulé des achats/ventes automatiques basés sur notre algorithme technique (RSI, MACD, etc.) sur les 12 derniers mois.

📌 _Commission: 0.1% | Slippage: 0.05%_
⚠️ _Ces résultats sont une SIMULATION. Performances passées ≠ résultats futurs_
"""

        keyboard = [[InlineKeyboardButton("« Retour", callback_data=f"back_to_analysis_{ticker}")]]

        try:
            await query.edit_message_text(
                message,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"[BACKTEST] Erreur: {e}")
            await query.answer("❌ Erreur lors du backtest", show_alert=True)
    else:
        await query.answer("❌ Impossible de backtester ce ticker", show_alert=True)


async def predict_inline_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère le bouton Prédiction ML depuis l'analyse"""
    query = update.callback_query
    await query.answer("🤖 Génération de la prédiction ML...")

    ticker = query.data.split("_")[1]
    user_name = get_user_name(update)

    print(f"[PREDICT] Inline prédiction pour {ticker}")

    # Prédiction ML
    result = predict_ml(ticker)

    if result:
        # Emoji selon prédiction
        if 'HAUSSE' in result['prediction']:
            emoji = '🟢'
        elif 'BAISSE' in result['prediction']:
            emoji = '🔴'
        else:
            emoji = '⚪'

        # Échapper les underscores pour Markdown
        prediction_text = result['prediction'].replace('_', '\\_')

        message = f"""
🤖 *PRÉDICTION ML - {result['ticker']}*

━━━━━━━━━━━━━━━━━━━━
🔮 *PRÉDICTION*
━━━━━━━━━━━━━━━━━━━━

{emoji} *Direction:* {prediction_text}
📊 *Probabilité:* {result['probability']:.1f}%
📈 *Score signal:* {result['score']}/15
🎯 *Confiance:* {result['confidence']:.1f}%

━━━━━━━━━━━━━━━━━━━━
⏰ *HORIZON*
━━━━━━━━━━━━━━━━━━━━

{result['horizon']}

━━━━━━━━━━━━━━━━━━━━
📊 *FACTEURS CLÉS*
━━━━━━━━━━━━━━━━━━━━

• RSI: {result['factors']['rsi']:.1f}
• ADX: {result['factors']['adx']:.1f}
• Bollinger: {result['factors']['bb_position']:.1f}%
• Stochastic: {result['factors']['stoch_k']:.1f}

💡 _Prédiction basée sur 15+ indicateurs techniques_
⚠️ _Ceci n'est pas un conseil financier_
"""

        keyboard = [[InlineKeyboardButton("« Retour", callback_data=f"back_to_analysis_{ticker}")]]

        try:
            await query.edit_message_text(
                message,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"[PREDICT] Erreur: {e}")
            await query.answer("❌ Erreur lors de la prédiction", show_alert=True)
    else:
        await query.answer("❌ Impossible de prédire ce ticker", show_alert=True)


async def chart_inline_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gère le bouton Graphique - Affiche menu timeframe"""
    global db
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
                        color='#ff6600', alpha=0.15, label='Zone de confiance')
        
        # === STYLE AX1 (Amélioré) ===
        ax1.set_title(f'{ticker} - {timeframe.upper()} | Chandelier Japonais + Prédiction ML', 
                      fontsize=15, color='white', fontweight='bold', pad=15)
        ax1.set_ylabel('Prix (EUR)', fontsize=13, color='white', fontweight='bold')
        ax1.grid(True, alpha=0.15, linestyle='--', color='#444444')
        ax1.legend(loc='upper left', fontsize=11, framealpha=0.9)
        
        # Fond légèrement plus clair pour mieux voir les bougies
        ax1.set_facecolor('#0f0f0f')
        
        # Ligne verticale séparation présent/futur - Plus visible
        ax1.axvline(x=df.index[-1], color='#ffff00', linewidth=3, linestyle='--', alpha=0.8)
        ax1.text(df.index[-1], ax1.get_ylim()[1] * 0.98, 'MAINTENANT', 
                rotation=90, verticalalignment='top', 
                fontsize=10, fontweight='bold', color='#ffff00',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='black', alpha=0.7))
        
        # === VOLUME (Amélioré) ===
        colors_vol = ['#ff3333' if df['Close'].iloc[i] < df['Open'].iloc[i] else '#33ff33'
                      for i in range(len(df))]
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
                bbox=dict(boxstyle='round,pad=0.5', facecolor='black', alpha=0.8))
        
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
        plt.savefig(buffer, format='png', dpi=120, bbox_inches='tight')
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
    await query.answer("📊 Rechargement de l'analyse...")

    ticker = query.data.split("_")[3]
    user_id = update.effective_user.id
    print(f"[BACK] Retour analyse pour {ticker}")

    # Récupérer les préférences utilisateur
    db = context.bot_data.get('db')
    display_mode = 'detailed'  # Par défaut
    if db:
        try:
            user_settings = db.get_user_settings(user_id)
            if user_settings:
                display_mode = user_settings.get('display_mode', 'detailed')
        except:
            pass

    # Refaire l'analyse
    result = analyze_stock(ticker)

    if result:
        message = format_stock_message(result, display_mode=display_mode)
        interval = "1d"  # Défaut

        # Recréer les boutons avec disposition optimisée
        keyboard = [
            # Row 1: Action principale + actualiser
            [
                InlineKeyboardButton("📈 Graphique", callback_data=f"chart_{ticker}_{interval}"),
                InlineKeyboardButton("🔄 Actualiser", callback_data=f"refresh_analysis_{ticker}_{interval}")
            ],
            # Row 2: Analyses techniques
            [
                InlineKeyboardButton("🧪 Backtest 1 an", callback_data=f"backtest_{ticker}"),
                InlineKeyboardButton("🔮 Prédiction ML", callback_data=f"predict_{ticker}")
            ],
            # Row 3: Info & Trading
            [
                InlineKeyboardButton("📰 News", callback_data=f"news_{ticker}"),
                InlineKeyboardButton("🤖 Trading AI", callback_data=f"companion_step1_{ticker}")
            ],
            # Row 4: Favoris
            [
                InlineKeyboardButton("⭐ Ajouter aux Favoris", callback_data=f"fav_add_{ticker}")
            ]
        ]

        try:
            await query.edit_message_text(
                text=message,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='Markdown'
            )
        except Exception as e:
            print(f"[BACK] Erreur: {e}")
            await query.answer("❌ Erreur lors du retour", show_alert=True)
    else:
        await query.answer("❌ Impossible de recharger l'analyse", show_alert=True)


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
        keyboard.append([])
    elif "⚠️" in analysis_message:  # Possible mais risqué
        keyboard.append([])
    else:  # Signal neutre ou négatif
        keyboard.append([])
    
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


async def scan_opportunities_handler(update, context, user_id, bot, db):
    """Handler pour Scanner Opportunités avec config IA"""
    query = update.callback_query
    
    try:
        await query.answer()
    except:
        pass  # Ignorer si query expirée
    
    # Récupérer les paramètres de l'utilisateur
    settings = get_user_alert_settings(db, user_id)
    
    markets_names = {
        'us': '🇺🇸 US',
        'europe': '🇪🇺 Europe',
        'asia': '🌏 Asie',
        'crypto': '🪙 Crypto',
        'commodities': '⚡ Commodities'
    }
    
    active = [markets_names.get(m, m) for m in settings['markets']]
    
    message = f"""
🚨 *SCANNER D'OPPORTUNITÉS*

Le bot scanne automatiquement les marchés toutes les {settings['scan_interval']//60} minutes pour détecter les meilleures opportunités.

📊 *Vos paramètres actuels :*
• Score minimum : {settings['min_score']}/10
• Marchés actifs : {', '.join(active)}
• Fréquence : {settings['scan_interval']//60} min
• Max alertes : {settings['max_alerts']}

💡 *Actions disponibles :*
"""
    
    keyboard = [
        [InlineKeyboardButton("🔍 Forcer un scan maintenant", callback_data="force_scan")],
        [InlineKeyboardButton("⚙️ Configurer mes alertes", callback_data="alert_settings")],
        [InlineKeyboardButton("📊 Historique des alertes", callback_data="alert_history")],
        [InlineKeyboardButton("⬅️ Retour Menu", callback_data="menu")]
    ]
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )




async def force_scan_handler(update, context, user_id, bot, db):
    """Force un scan immédiat"""
    query = update.callback_query
    await query.answer("🔍 Lancement du scan...")
    
    # Afficher message de chargement
    loading_msg = await query.edit_message_text(
        "🔍 *SCAN EN COURS...*\n\nAnalyse des marchés ouverts...\n⏳ Patientez quelques secondes",
        parse_mode='Markdown'
    )
    
    # Lancer le scan
    await intelligent_auto_scan(context)
    
    # Message de confirmation
    import datetime
    scan_time = datetime.datetime.now().strftime("%H:%M:%S")
    
    keyboard = [
        [InlineKeyboardButton("🔄 Scanner à nouveau", callback_data="force_scan")],
        [InlineKeyboardButton("⚙️ Configurer alertes", callback_data="alert_settings")],
        [InlineKeyboardButton("⬅️ Retour", callback_data="scan_opportunities")]
    ]
    
    await query.edit_message_text(
        f"✅ *SCAN TERMINÉ*\n\n⏰ Scan effectué à {scan_time}\n\n💡 Vérifiez si vous avez reçu des alertes !\n\nLes résultats détaillés sont dans la console.",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def alert_history_handler(update, context, user_id, bot, db):
    """Affiche l'historique des alertes"""
    query = update.callback_query
    
    try:
        await query.answer()
    except:
        pass  # Ignorer si query expirée
    
    alerts = get_user_alerts(db, user_id, limit=10)
    
    if not alerts:
        message = """
📊 *HISTORIQUE DES ALERTES*

Aucune alerte reçue récemment.

Les alertes apparaîtront ici lorsque le scanner détectera des opportunités.
"""
    else:
        message = f"""
📊 *HISTORIQUE DES ALERTES*

Vous avez reçu {len(alerts)} alerte(s) récemment :

"""
        for alert in alerts[:10]:
            status = "🔕" if alert.get('dismissed') else "✅"
            message += f"{status} `{alert['ticket_id']}` - {alert['ticker']}\n   {alert['created_at']}\n\n"
    
    keyboard = [
        [InlineKeyboardButton("⬅️ Retour", callback_data="scan_opportunities")]
    ]
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
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
    global db
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

    
    # TRADING COMPANION - Montant personnalisé
    if await companion_handle_amount_text(update, context, user_id, text, context.bot, db):
        return
    
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
                capital = db.get_portfolio_capital_paper(user_id)  # ✅ AJOUTEZ CETTE LIGNE
                positions = db.get_user_positions_paper(user_id, 'open')
                stats = db.get_paper_stats(user_id)
                
                total_pnl = sum(pos.get('pnl', 0) for pos in positions)
                total_invested = sum(pos.get('amount', 0) for pos in positions)
                total_capital = capital['current_cash'] + total_invested + total_pnl  # ✅ Fonctionne maintenant
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


async def shortcut_analyser_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler pour les raccourcis /cspa, /bnpa, /btc, /btcusd, etc."""
    command = update.message.text.lstrip('/').upper()

    # Mapping des raccourcis crypto (sans tiret) vers les vrais tickers (avec tiret)
    crypto_mapping = {
        'BTC': 'BTC-USD', 'BTCUSD': 'BTC-USD',
        'ETH': 'ETH-USD', 'ETHUSD': 'ETH-USD',
        'BNB': 'BNB-USD', 'BNBUSD': 'BNB-USD',
        'SOL': 'SOL-USD', 'SOLUSD': 'SOL-USD',
        'XRP': 'XRP-USD', 'XRPUSD': 'XRP-USD',
        'ADA': 'ADA-USD', 'ADAUSD': 'ADA-USD',
        'AVAX': 'AVAX-USD', 'AVAXUSD': 'AVAX-USD',
        'DOGE': 'DOGE-USD', 'DOGEUSD': 'DOGE-USD',
        'DOT': 'DOT-USD', 'DOTUSD': 'DOT-USD',
        'LINK': 'LINK-USD', 'LINKUSD': 'LINK-USD',
        'ATOM': 'ATOM-USD', 'ATOMUSD': 'ATOM-USD',
        'LTC': 'LTC-USD', 'LTCUSD': 'LTC-USD',
        'SHIB': 'SHIB-USD', 'SHIBUSD': 'SHIB-USD',
    }

    # Vérifier si c'est un ticker crypto
    if command in crypto_mapping:
        ticker = crypto_mapping[command]
    # Convertir raccourci en ticker: alopa -> ALO.PA
    elif len(command) >= 4 and "." not in command and "-" not in command:
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



# trading_system_addon.py
"""
ADDON À AJOUTER AU BOT - SYSTÈME DE TRADING INTELLIGENT v2.0

Instructions d'intégration:
1. Copiez tout ce fichier
2. Collez-le dans votre tdb.py AVANT la fonction main()
3. Ajoutez les handlers dans main() (voir section INTEGRATION ci-dessous)
4. Ajoutez le bouton dans l'analyse (voir section BOUTONS)
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, List
import asyncio
from datetime import datetime
import re

# ==================== NOUVEAU SYSTÈME DE TRADING ====================

@dataclass  
class TradingSession:
    """Session de trading pour un utilisateur"""
    user_id: int
    ticker: str
    analysis: dict
    step: str = "introduction"
    amount: Optional[float] = None
    leverage: int = 1
    use_turbo: bool = False
    entry_price: float = 0
    direction: str = "LONG"
    tp1: float = 0
    tp2: float = 0
    tp3: Optional[float] = None
    stop_loss: float = 0
    created_at: datetime = field(default_factory=datetime.now)
    last_update: datetime = field(default_factory=datetime.now)

TRADING_SESSIONS: Dict[int, TradingSession] = {}

def get_session(user_id: int) -> Optional[TradingSession]:
    return TRADING_SESSIONS.get(user_id)

def save_session(session: TradingSession):
    session.last_update = datetime.now()
    TRADING_SESSIONS[session.user_id] = session

def clear_session(user_id: int):
    TRADING_SESSIONS.pop(user_id, None)

# BASE DE DONNÉES

def init_trading_positions_table():
    """À appeler dans init_database()"""
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS trading_positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ticker TEXT NOT NULL,
            direction TEXT NOT NULL,
            entry_price REAL NOT NULL,
            current_price REAL NOT NULL,
            quantity REAL NOT NULL,
            amount REAL NOT NULL,
            leverage INTEGER DEFAULT 1,
            exposure REAL NOT NULL,
            tp1 REAL,
            tp2 REAL,
            tp3 REAL,
            stop_loss REAL,
            pnl REAL DEFAULT 0,
            pnl_percent REAL DEFAULT 0,
            status TEXT DEFAULT 'open',
            alert_tp1_sent INTEGER DEFAULT 0,
            alert_tp2_sent INTEGER DEFAULT 0,
            alert_tp3_sent INTEGER DEFAULT 0,
            alert_sl_sent INTEGER DEFAULT 0,
            opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
            closed_at TEXT,
            close_reason TEXT,
            last_update TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    conn.commit()
    conn.close()

def add_trading_position(user_id, ticker, direction, entry_price, quantity, amount, leverage, exposure, tp1, tp2, tp3, stop_loss):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO trading_positions 
        (user_id, ticker, direction, entry_price, current_price, quantity, amount, leverage, exposure, tp1, tp2, tp3, stop_loss)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, ticker, direction, entry_price, entry_price, quantity, amount, leverage, exposure, tp1, tp2, tp3, stop_loss))
    position_id = c.lastrowid
    conn.commit()
    conn.close()
    return position_id

def get_trading_position(position_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM trading_positions WHERE id = ?", (position_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    columns = [desc[0] for desc in c.description]
    return dict(zip(columns, row))

def get_user_trading_positions(user_id, status='open'):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM trading_positions WHERE user_id = ? AND status = ? ORDER BY opened_at DESC", (user_id, status))
    rows = c.fetchall()
    conn.close()
    if not rows:
        return []
    columns = [desc[0] for desc in c.description]
    return [dict(zip(columns, row)) for row in rows]

def update_trading_position_price(position_id, current_price, pnl, pnl_percent):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE trading_positions SET current_price = ?, pnl = ?, pnl_percent = ?, last_update = ? WHERE id = ?",
              (current_price, pnl, pnl_percent, datetime.now().isoformat(), position_id))
    conn.commit()
    conn.close()

def close_trading_position(position_id, exit_price, reason):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE trading_positions SET status = 'closed', current_price = ?, closed_at = ?, close_reason = ? WHERE id = ?",
              (exit_price, datetime.now().isoformat(), reason, position_id))
    conn.commit()
    conn.close()

def mark_trading_alert_sent(position_id, alert_type):
    conn = get_connection()
    c = conn.cursor()
    column = f"alert_{alert_type}_sent"
    c.execute(f"UPDATE trading_positions SET {column} = 1 WHERE id = ?", (position_id,))
    conn.commit()
    conn.close()

# GÉNÉRATION CONSEILS IA

def generate_ai_trading_advice(ticker, analysis, session):
    price = analysis.get('price', 0)
    signal = analysis.get('signal', 'NEUTRE')
    score = analysis.get('score', 0)
    rsi = analysis.get('rsi', 50)
    ai = analysis.get('ai_analysis', {})
    
    direction = "LONG" if score > 0 else "SHORT"
    direction_emoji = "📈" if direction == "LONG" else "📉"
    probability = ai.get('probability', 50)
    risk_reward = ai.get('risk_reward', 1.5)
    
    advice = f"""
╔═══════════════════════════════════════════╗
║  🤖 ASSISTANT TRADING IA - {ticker}       ║
╚═══════════════════════════════════════════╝

Bonjour ! Je suis votre assistant de trading IA. 
Laissez-moi vous guider pour optimiser cette position.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **ANALYSE DE {ticker}**

{direction_emoji} **Direction recommandée**: {direction}
💯 **Score de confiance**: {score}/15
⭐ **Signal**: {signal}

Prix actuel: **{price:.2f} EUR**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **MES CONSEILS PERSONNALISÉS**

"""
    
    entry_quality = ai.get('entry_point', '✅ BON')
    if '🎯 EXCELLENT' in entry_quality:
        advice += "**⭐ TIMING PARFAIT !**\nLe prix est au niveau optimal pour entrer.\n\n"
    elif '✅ BON' in entry_quality:
        advice += "**👍 BON MOMENT**\nLes conditions sont favorables.\n\n"
    else:
        advice += "**⏳ TIMING MOYEN**\nSoyez prudent avec la taille de votre position.\n\n"
    
    advice += f"**💎 RATIO RISQUE/RENDEMENT: {risk_reward:.2f}**\n"
    if risk_reward >= 3:
        advice += "Excellent ! Chaque euro risqué peut rapporter 3+ euros.\n\n"
    elif risk_reward >= 2:
        advice += "Très bien ! Le potentiel de gain dépasse le risque.\n\n"
    else:
        advice += "Correct. Le gain potentiel justifie le risque.\n\n"
    
    advice += f"**📊 PROBABILITÉ DE SUCCÈS: {probability}%**\n"
    if probability >= 75:
        advice += "Signal très fort !\n\n"
    elif probability >= 60:
        advice += "Bonne probabilité.\n\n"
    else:
        advice += "⚠️ Probabilité moyenne, restez vigilant.\n\n"
    
    if direction == "LONG" and rsi < 40:
        advice += "📉 **RSI BAS** - Excellent pour un LONG !\n\n"
    elif direction == "SHORT" and rsi > 60:
        advice += "📈 **RSI ÉLEVÉ** - Excellent pour un SHORT !\n\n"
    
    advice += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    advice += "💰 **ALLOCATION DE CAPITAL RECOMMANDÉE**\n\n"
    
    if abs(score) >= 8:
        sizing = "50-75%"
        advice += f"Signal TRÈS FORT ! Vous pouvez allouer {sizing}.\n"
    elif abs(score) >= 6:
        sizing = "30-50%"
        advice += f"Signal fort. Je recommande {sizing}.\n"
    elif abs(score) >= 4:
        sizing = "15-30%"
        advice += f"Signal moyen. Limitez à {sizing}.\n"
    else:
        sizing = "5-15%"
        advice += f"Signal faible. Petite position ({sizing}).\n"
    
    tp1 = ai.get('tp1', price * 1.03)
    tp2 = ai.get('tp2', price * 1.05)
    tp3 = ai.get('tp3', price * 1.08)
    sl = ai.get('stop_loss', price * 0.97)
    
    advice += f"""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **OBJECTIFS RECOMMANDÉS**

TP1: **{tp1:.2f} EUR** ({((tp1-price)/price*100):+.1f}%)
TP2: **{tp2:.2f} EUR** ({((tp2-price)/price*100):+.1f}%)
TP3: **{tp3:.2f} EUR** ({((tp3-price)/price*100):+.1f}%)
🛡️ SL: **{sl:.2f} EUR** ({((sl-price)/price*100):+.1f}%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **MES RECOMMANDATIONS**

1. Respectez TOUJOURS votre stop loss
2. Prenez vos profits progressivement
3. Ne laissez pas l'émotion décider
4. Le levier multiplie gains ET pertes

👇 **Prêt à configurer votre position ?**
"""
    
    return advice

# HANDLERS

async def start_trading_session(update, context, ticker):
    query = update.callback_query
    user_id = update.effective_user.id
    
    analysis = analyze_stock(ticker)
    if not analysis:
        await query.answer("❌ Erreur d'analyse")
        return
    
    session = TradingSession(user_id=user_id, ticker=ticker, analysis=analysis)
    price = analysis.get('price', 0)
    score = analysis.get('score', 0)
    ai = analysis.get('ai_analysis', {})
    
    session.entry_price = price
    session.direction = "LONG" if score > 0 else "SHORT"
    session.tp1 = ai.get('tp1', price * 1.03)
    session.tp2 = ai.get('tp2', price * 1.05)
    session.tp3 = ai.get('tp3', price * 1.08)
    session.stop_loss = ai.get('stop_loss', price * 0.97)
    
    save_session(session)
    
    advice = generate_ai_trading_advice(ticker, analysis, session)
    
    keyboard = [
        [InlineKeyboardButton("▶️ Commencer", callback_data=f"trade_next_{user_id}")],
        [InlineKeyboardButton("❌ Annuler", callback_data=f"trade_cancel_{user_id}")]
    ]
    
    await query.edit_message_text(text=advice, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def show_amount_selection(query, session):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT current_cash FROM paper_portfolio WHERE user_id = ?", (session.user_id,))
    result = c.fetchone()
    conn.close()
    
    available = result[0] if result else 10000
    
    message = f"""
╔═══════════════════════════════════════════╗
║  💰 ÉTAPE 1: MONTANT                     ║
╚═══════════════════════════════════════════╝

🎯 {session.ticker} {'📈 LONG' if session.direction == 'LONG' else '📉 SHORT'}

💼 Disponible: **{available:.2f} EUR**

Choisissez un montant ou tapez-le dans le chat
(Exemple: "500" pour 500 EUR)
"""
    
    keyboard = [
        [InlineKeyboardButton("100 EUR", callback_data=f"trade_amt_{session.user_id}_100"),
         InlineKeyboardButton("250 EUR", callback_data=f"trade_amt_{session.user_id}_250")],
        [InlineKeyboardButton("500 EUR", callback_data=f"trade_amt_{session.user_id}_500"),
         InlineKeyboardButton("1000 EUR", callback_data=f"trade_amt_{session.user_id}_1000")],
        [InlineKeyboardButton("⬅️ Retour", callback_data=f"trade_back_{session.user_id}_intro"),
         InlineKeyboardButton("❌ Annuler", callback_data=f"trade_cancel_{session.user_id}")]
    ]
    
    session.step = "amount"
    save_session(session)
    
    await query.edit_message_text(text=message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def show_leverage_selection(query, session):
    message = f"""
╔═══════════════════════════════════════════╗
║  ⚡ ÉTAPE 2: MODE TURBO                  ║
╚═══════════════════════════════════════════╝

💰 Montant: **{session.amount:.2f} EUR**

Le mode turbo multiplie vos gains ET vos pertes !

**Exemples:**
Sans levier: Si +10% → +{session.amount * 0.10:.2f} EUR
Levier 2x: Si +10% → +{session.amount * 0.20:.2f} EUR 💚
Levier 5x: Si +10% → +{session.amount * 0.50:.2f} EUR 💚💚

⚠️ Attention: Les pertes sont aussi multipliées !
"""
    
    keyboard = [
        [InlineKeyboardButton("✅ Sans levier (1x)", callback_data=f"trade_lev_{session.user_id}_1")],
        [InlineKeyboardButton("⚡ Levier 2x", callback_data=f"trade_lev_{session.user_id}_2"),
         InlineKeyboardButton("⚡⚡ Levier 3x", callback_data=f"trade_lev_{session.user_id}_3")],
        [InlineKeyboardButton("⚡⚡⚡ Levier 5x", callback_data=f"trade_lev_{session.user_id}_5"),
         InlineKeyboardButton("⚡⚡⚡⚡ Levier 10x", callback_data=f"trade_lev_{session.user_id}_10")],
        [InlineKeyboardButton("⬅️ Retour", callback_data=f"trade_back_{session.user_id}_amount"),
         InlineKeyboardButton("❌ Annuler", callback_data=f"trade_cancel_{session.user_id}")]
    ]
    
    session.step = "leverage"
    save_session(session)
    
    await query.edit_message_text(text=message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def show_confirmation(query, session):
    exposure = session.amount * session.leverage
    quantity = session.amount / session.entry_price
    
    gain_tp1 = ((session.tp1 - session.entry_price) / session.entry_price) * exposure
    gain_tp2 = ((session.tp2 - session.entry_price) / session.entry_price) * exposure
    loss_sl = ((session.stop_loss - session.entry_price) / session.entry_price) * exposure
    rr_ratio = abs(gain_tp2 / loss_sl) if loss_sl != 0 else 0
    
    message = f"""
╔═══════════════════════════════════════════╗
║  ✅ CONFIRMATION                         ║
╚═══════════════════════════════════════════╝

📊 {session.ticker} {'📈 LONG' if session.direction == 'LONG' else '📉 SHORT'} @ **{session.entry_price:.2f} EUR**

💰 **INVESTISSEMENT**
Montant: **{session.amount:.2f} EUR**
{"Levier: **" + str(session.leverage) + "x** ⚡" if session.leverage > 1 else "Sans levier"}
Exposition: **{exposure:.2f} EUR**

🎯 **OBJECTIFS**
TP1: {session.tp1:.2f} EUR → Gain: **+{gain_tp1:.2f} EUR**
TP2: {session.tp2:.2f} EUR → Gain: **+{gain_tp2:.2f} EUR**
🛡️ SL: {session.stop_loss:.2f} EUR → Perte max: **{loss_sl:.2f} EUR**

⚖️ Ratio R/R: **{rr_ratio:.2f}** {'✅' if rr_ratio >= 2 else '⚠️'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Suivi en temps réel (1 min)
• Alertes automatiques TP/SL
• Fermeture manuelle possible

**Confirmez-vous ?**
"""
    
    keyboard = [
        [InlineKeyboardButton("✅ CONFIRMER", callback_data=f"trade_exec_{session.user_id}")],
        [InlineKeyboardButton("⬅️ Modifier", callback_data=f"trade_back_{session.user_id}_leverage"),
         InlineKeyboardButton("❌ Annuler", callback_data=f"trade_cancel_{session.user_id}")]
    ]
    
    session.step = "confirmation"
    save_session(session)
    
    await query.edit_message_text(text=message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def execute_position(query, session, bot):
    user_id = session.user_id
    
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT current_cash FROM paper_portfolio WHERE user_id = ?", (user_id,))
    result = c.fetchone()
    
    if not result or result[0] < session.amount:
        await query.answer("❌ Capital insuffisant")
        await query.edit_message_text("❌ Capital insuffisant.")
        clear_session(user_id)
        return
    
    new_balance = result[0] - session.amount
    c.execute("UPDATE paper_portfolio SET current_cash = ?, total_invested = total_invested + ? WHERE user_id = ?",
              (new_balance, session.amount, user_id))
    conn.commit()
    conn.close()
    
    exposure = session.amount * session.leverage
    quantity = session.amount / session.entry_price
    
    position_id = add_trading_position(
        user_id, session.ticker, session.direction, session.entry_price,
        quantity, session.amount, session.leverage, exposure,
        session.tp1, session.tp2, session.tp3, session.stop_loss
    )
    
    message = f"""
╔═══════════════════════════════════════════╗
║  🎉 POSITION OUVERTE !                   ║
╚═══════════════════════════════════════════╝

✅ Position #{position_id} active

📊 {session.ticker} {'📈 LONG' if session.direction == 'LONG' else '📉 SHORT'}
💰 {session.amount:.2f} EUR {"(x" + str(session.leverage) + " ⚡)" if session.leverage > 1 else ""}

Capital restant: **{new_balance:.2f} EUR**

🔔 Suivi automatique activé
📊 Voir: /position {position_id}
"""
    
    await query.edit_message_text(text=message, parse_mode='Markdown')
    await send_position_ticket(bot, user_id, position_id)
    clear_session(user_id)

async def send_position_ticket(bot, user_id, position_id):
    pos = get_trading_position(position_id)
    if not pos:
        return
    
    pnl_emoji = "💚" if pos['pnl'] >= 0 else "🔴"
    pnl_sign = "+" if pos['pnl'] >= 0 else ""
    
    ticket = f"""
╔═══════════════════════════════════════════╗
║  📊 POSITION #{position_id}              ║
╚═══════════════════════════════════════════╝

🎯 {pos['ticker']} {'📈 LONG' if pos['direction'] == 'LONG' else '📉 SHORT'}
Prix: {pos['current_price']:.2f} EUR

💸 P&L: {pnl_emoji} **{pnl_sign}{pos['pnl']:.2f} EUR** ({pnl_sign}{pos['pnl_percent']:.2f}%)

🎯 TP1: {pos['tp1']:.2f} | TP2: {pos['tp2']:.2f}
🛡️ SL: {pos['stop_loss']:.2f}

Status: **{pos['status'].upper()}** ✅
"""
    
    keyboard = [
        [InlineKeyboardButton("🔄 Actualiser", callback_data=f"pos_refresh_{position_id}")],
        [InlineKeyboardButton("❌ Fermer", callback_data=f"pos_close_{position_id}")]
    ]
    
    await bot.send_message(chat_id=user_id, text=ticket, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

# CALLBACK HANDLER

async def trading_callback_handler(update, context):
    query = update.callback_query
    await query.answer()
    data = query.data
    user_id = update.effective_user.id
    
    if data.startswith("trade_new_"):
        ticker = data.replace("trade_new_", "")
        await start_trading_session(update, context, ticker)
    
    elif data.startswith("trade_next_"):
        session = get_session(user_id)
        if session:
            await show_amount_selection(query, session)
    
    elif data.startswith("trade_amt_"):
        amount = float(data.split("_")[-1])
        session = get_session(user_id)
        if session:
            session.amount = amount
            save_session(session)
            await show_leverage_selection(query, session)
    
    elif data.startswith("trade_lev_"):
        leverage = int(data.split("_")[-1])
        session = get_session(user_id)
        if session:
            session.leverage = leverage
            session.use_turbo = leverage > 1
            save_session(session)
            await show_confirmation(query, session)
    
    elif data.startswith("trade_exec_"):
        session = get_session(user_id)
        if session:
            await execute_position(query, session, context.bot)
    
    elif data.startswith("trade_back_"):
        session = get_session(user_id)
        if not session:
            return
        if "_intro" in data:
            advice = generate_ai_trading_advice(session.ticker, session.analysis, session)
            keyboard = [
                [InlineKeyboardButton("▶️ Commencer", callback_data=f"trade_next_{user_id}")],
                [InlineKeyboardButton("❌ Annuler", callback_data=f"trade_cancel_{user_id}")]
            ]
            await query.edit_message_text(text=advice, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        elif "_amount" in data:
            await show_amount_selection(query, session)
        elif "_leverage" in data:
            await show_leverage_selection(query, session)
    
    elif data.startswith("trade_cancel_"):
        clear_session(user_id)
        await query.edit_message_text("❌ Position annulée", parse_mode='Markdown')
    
    elif data.startswith("pos_refresh_"):
        position_id = int(data.split("_")[-1])
        await refresh_position_handler(query, position_id, context.bot)
    
    elif data.startswith("pos_close_"):
        position_id = int(data.split("_")[-1])
        await close_position_handler(query, position_id, context.bot)

async def refresh_position_handler(query, position_id, bot):
    pos = get_trading_position(position_id)
    if not pos or pos['status'] != 'open':
        await query.answer("❌ Position fermée")
        return
    
    try:
        stock = yf.Ticker(pos['ticker'])
        current_price = stock.info.get('currentPrice', stock.info.get('regularMarketPrice', pos['entry_price']))
    except:
        current_price = pos['entry_price']
    
    price_change = (current_price - pos['entry_price']) / pos['entry_price']
    pnl_percent = (price_change if pos['direction'] == 'LONG' else -price_change) * 100 * pos['leverage']
    pnl = (pnl_percent / 100) * pos['amount']
    
    update_trading_position_price(position_id, current_price, pnl, pnl_percent)
    await query.answer("✅ Actualisé")
    await send_position_ticket(bot, pos['user_id'], position_id)
    
    try:
        await query.message.delete()
    except:
        pass



# MESSAGE HANDLER

async def handle_trading_amount_message(update, context):
    user_id = update.effective_user.id
    text = update.message.text.strip()
    session = get_session(user_id)
    
    if not session or session.step != "amount":
        return
    
    try:
        numbers = re.findall(r'\d+\.?\d*', text)
        if not numbers:
            await update.message.reply_text("❌ Montant invalide. Ex: 500", parse_mode='Markdown')
            return
        
        amount = float(numbers[0])
        
        if amount < 10:
            await update.message.reply_text("❌ Minimum: 10 EUR", parse_mode='Markdown')
            return
        
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT current_cash FROM paper_portfolio WHERE user_id = ?", (user_id,))
        result = c.fetchone()
        conn.close()
        
        if result and result[0] < amount:
            await update.message.reply_text(f"❌ Insuffisant. Disponible: {result[0]:.2f} EUR", parse_mode='Markdown')
            return
        
        session.amount = amount
        save_session(session)
        
        await update.message.reply_text(f"✅ Montant: **{amount:.2f} EUR**", parse_mode='Markdown')
        
        class FakeQuery:
            def __init__(self, msg):
                self.message = msg
            async def edit_message_text(self, text, reply_markup=None, parse_mode=None):
                await self.message.reply_text(text=text, reply_markup=reply_markup, parse_mode=parse_mode)
        
        await show_leverage_selection(FakeQuery(update.message), session)
        
    except ValueError:
        await update.message.reply_text("❌ Montant invalide", parse_mode='Markdown')

# COMMANDES

async def positions_command(update, context):
    user_id = update.effective_user.id
    positions = get_user_trading_positions(user_id, 'open')
    
    if not positions:
        await update.message.reply_text("📊 **VOS POSITIONS**\n\nAucune position ouverte.", parse_mode='Markdown')
        return
    
    message = f"📊 **{len(positions)} POSITION(S) ACTIVE(S)**\n\n"
    total_pnl = 0
    
    for pos in positions:
        pnl_emoji = "💚" if pos['pnl'] >= 0 else "🔴"
        pnl_sign = "+" if pos['pnl'] >= 0 else ""
        message += f"#{pos['id']} {pos['ticker']} {'📈' if pos['direction']=='LONG' else '📉'}\n"
        message += f"P&L: {pnl_emoji} {pnl_sign}{pos['pnl']:.2f} EUR\n\n"
        total_pnl += pos['pnl']
    
    total_emoji = "💚" if total_pnl >= 0 else "🔴"
    total_sign = "+" if total_pnl >= 0 else ""
    message += f"**Total: {total_emoji} {total_sign}{total_pnl:.2f} EUR**"
    
    await update.message.reply_text(message, parse_mode='Markdown')

async def position_command(update, context):
    if not context.args:
        await update.message.reply_text("❌ Usage: /position <id>", parse_mode='Markdown')
        return
    
    try:
        position_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ ID invalide", parse_mode='Markdown')
        return
    
    pos = get_trading_position(position_id)
    
    if not pos:
        await update.message.reply_text("❌ Position non trouvée", parse_mode='Markdown')
        return
    
    if pos['user_id'] != update.effective_user.id:
        await update.message.reply_text("❌ Pas votre position", parse_mode='Markdown')
        return
    
    await send_position_ticket(context.bot, update.effective_user.id, position_id)

# MONITORING

async def monitor_trading_positions(context):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM trading_positions WHERE status = 'open'")
    positions = c.fetchall()
    
    if not positions:
        conn.close()
        return
    
    columns = [desc[0] for desc in c.description]
    
    for row in positions:
        pos = dict(zip(columns, row))
        
        try:
            stock = yf.Ticker(pos['ticker'])
            current_price = stock.info.get('currentPrice', stock.info.get('regularMarketPrice'))
            
            if not current_price:
                continue
            
            price_change = (current_price - pos['entry_price']) / pos['entry_price']
            pnl_percent = (price_change if pos['direction'] == 'LONG' else -price_change) * 100 * pos['leverage']
            pnl = (pnl_percent / 100) * pos['amount']
            
            update_trading_position_price(pos['id'], current_price, pnl, pnl_percent)
            
            # Vérifier alertes
            if pos['direction'] == 'LONG':
                if current_price >= pos['tp1'] and pos['alert_tp1_sent'] == 0:
                    await context.bot.send_message(pos['user_id'], f"🎯 TP1 ATTEINT! {pos['ticker']}\nGain: +{pnl:.2f} EUR", parse_mode='Markdown')
                    mark_trading_alert_sent(pos['id'], 'tp1')
                
                if current_price >= pos['tp2'] and pos['alert_tp2_sent'] == 0:
                    await context.bot.send_message(pos['user_id'], f"🎯🎯 TP2 ATTEINT! {pos['ticker']}\nGain: +{pnl:.2f} EUR", parse_mode='Markdown')
                    mark_trading_alert_sent(pos['id'], 'tp2')
                
                if current_price <= pos['stop_loss'] and pos['alert_sl_sent'] == 0:
                    await context.bot.send_message(pos['user_id'], f"🛡️ STOP LOSS! {pos['ticker']}\nPerte: {pnl:.2f} EUR\n\nPosition fermée", parse_mode='Markdown')
                    mark_trading_alert_sent(pos['id'], 'sl')
                    
                    # Fermer auto
                    close_trading_position(pos['id'], current_price, "SL auto")
                    final_amt = pos['amount'] + pnl
                    conn2 = get_connection()
                    c2 = conn2.cursor()
                    c2.execute("UPDATE paper_portfolio SET current_cash = current_cash + ?, total_invested = total_invested - ?, total_pnl = total_pnl + ? WHERE user_id = ?",
                              (final_amt, pos['amount'], pnl, pos['user_id']))
                    conn2.commit()
                    conn2.close()
            
        except Exception as e:
            print(f"[MONITOR] Erreur position {pos['id']}: {e}")
            continue
    
    conn.close()

# ==================== INTÉGRATION ====================
"""
DANS MAIN(), AJOUTER:

1. Dans init_database():
   init_trading_positions_table()

2. Dans les handlers:
   application.add_handler(CallbackQueryHandler(trading_callback_handler, pattern="^trade_"))
   application.add_handler(CallbackQueryHandler(trading_callback_handler, pattern="^pos_"))
   
   application.add_handler(CommandHandler("positions", positions_command))
   application.add_handler(CommandHandler("position", position_command))
    # application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_trading_amount_message)) # DÉSACTIVÉ - Handler manquant

3. Dans job_queue:
   job_queue.run_repeating(monitor_trading_positions, interval=60, first=10)

4. DANS L'ANALYSE, AJOUTER LE BOUTON:
   keyboard.append([])
"""



# 
def main():
    """Fonction principale"""
    print("🤖 Bot Trading démarré!")
    print(f"Actions surveillées: {sum(len(v) for v in WATCHLIST.values())}")
    print(f"Canal ID configuré: {CHANNEL_ID}")
    
    # Créer l'application
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    # Ajouter les handlers
    
    # ==================== HANDLERS TRADING ====================
    # Handlers pour le système de trading intelligent
    application.add_handler(CallbackQueryHandler(trading_callback_handler, pattern="^trade_"))
    application.add_handler(CallbackQueryHandler(trading_callback_handler, pattern="^pos_"))
    
    # Commandes trading
    application.add_handler(CommandHandler("positions", positions_command))
    application.add_handler(CommandHandler("position", position_command))
    
    # ==================== HANDLERS EXISTANTS ====================
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("menu", menu_command))

    # Nouvelles commandes avancées (v5.0)
    application.add_handler(CommandHandler("backtest", backtest_command))
    application.add_handler(CommandHandler("predict", predict_command))

    # Callbacks paper trading (AVANT les autres CallbackQueryHandler)
    # application.add_handler(CallbackQueryHandler(paper_callback_handler, pattern="^(pt_|mode_)")) # DÉSACTIVÉ - Handler manquant
    application.add_handler(CallbackQueryHandler(delete_message_callback, pattern="^delete_message$"))
    application.add_handler(CallbackQueryHandler(backtest_inline_callback, pattern="^backtest_"))
    application.add_handler(CallbackQueryHandler(predict_inline_callback, pattern="^predict_"))
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
    
    
    # Handler pour toutes les commandes (catch-all)
    # Doit être en DERNIER pour catch les commandes inconnues
    from telegram.ext import MessageHandler, filters
    
    async def catch_unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Catch toutes les commandes pour gérer /ticker"""
        if not update.message or not update.message.text:
            return
        
        text = update.message.text.strip()
        if not text.startswith('/'):
            return
        
        # Extraire la commande
        command = text.split()[0][1:].upper()
        
        # Liste des commandes connues (à ignorer)
        known_commands = [
            'START', 'HELP', 'STATUS', 'ANALYZE', 'COMPARE', 'HISTORY',
            'STATS', 'VOLATILE', 'GAINER', 'LOSER', 'AUTOSCAN', 'CHART',
            'SMARTNOTIF', 'DAILYREPORT', 'NEWS', 'TOP', 'MENU', 'FAV',
            'ALERT', 'POSITIONS', 'POSITION', 'BACKTEST', 'PREDICT'
        ]
        
        if command in known_commands:
            return  # Laisser les autres handlers gérer
        
        # C'est un ticker ! Appeler analyze
        print(f"[TICKER SHORTCUT] /{command.lower()} → analyse")
        await ticker_shortcut_handler(update, context)
    
    application.add_handler(CommandHandler("analyze", analyze_command))
    application.add_handler(CommandHandler("alertes", alertes_command))
    application.add_handler(CommandHandler("alerts", alertes_command))
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
    #
    # application.add_handler(CallbackQueryHandler(trade_callback_handler, pattern="^trade_")) # DÉSACTIVÉ - Handler manquant # DÉSACTIVÉ - Handler manquant
    application.add_handler(CallbackQueryHandler(wallet_callback_handler, pattern="^wallet_"))
    application.add_handler(CallbackQueryHandler(menu_callback_handler, pattern="^menu_"))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Handler pour /ticker (DOIT être en dernier)
    application.add_handler(MessageHandler(filters.COMMAND, catch_unknown_command))
    
    # Configurer le job_queue pour les alertes (toutes les 5 minutes)
    job_queue = application.job_queue

    # Job de monitoring des positions (toutes les 60 secondes)
    job_queue.run_repeating(monitor_trading_positions, interval=60, first=10)
    print("📊 Monitoring des positions activé (toutes les 1 minute)")
    
    # Configurer le job_queue pour les alertes (toutes les 5 minutes)
    job_queue.run_repeating(check_alerts_callback, interval=900, first=10)
    print("🔔 Système d'alertes activé (vérification toutes les 5 minutes)")
    
    # Configurer les scans automatiques programmés
    # Scans quotidiens désactivés - Le système intelligent scanne toutes les 15 min
    # for scan_time in AUTO_SCAN_TIMES:
    #     hour, minute = map(int, scan_time.split(":"))
    #     job_queue.run_daily(auto_scan_callback, time=dt.time(hour=hour, minute=minute))
    #     print(f"⏰ Scan automatique programmé à {scan_time}")
    print("✅ Scan intelligent actif (toutes les 15 min par défaut)")
    
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
    
    
    # Message handler pour la saisie de montant (DOIT ÊTRE EN DERNIER)
    # application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_trading_amount_message)) # DÉSACTIVÉ - Handler manquant
    
    # Handler pour messages texte (montants de trading)
    from telegram.ext import MessageHandler, filters
    # application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, trade_text_handler)) # DÉSACTIVÉ - Fonction manquante
    
    # Stocker la DB dans bot_data pour accès depuis les jobs
    application.bot_data['db'] = db
    print("✅ DB stockée dans bot_data")
    
    # Démarrer le bot
    print("🚀 Démarrage du bot...")
    application.run_polling()

if __name__ == '__main__':
    # Initialiser la base de données
    print("[INIT] Initialisation de la base de données...")
    init_database()
    print("[INIT] ✅ Base de données prête")
    
    # Lancer le bot
    main()

# ==================== MÉTHODES POUR LE TRACKER ====================

    """Ferme une position papier"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SET status = 'closed', 
            exit_price = ?, 
            pnl = ?, 
            close_reason = ?,
            closed_at = ?
        WHERE id = ?
    """, (exit_price, pnl, reason, datetime.now().isoformat(), position_id))
    conn.commit()
    conn.close()