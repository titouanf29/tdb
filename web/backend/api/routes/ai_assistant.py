"""
AI Assistant routes - Chat with Groq (Llama)
"""
import os
import re
import httpx

_SYMBOL_RE = re.compile(r'^[\^A-Z0-9.\-=]{1,30}$')
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write
from .auth import get_current_user
from .premium import is_user_premium, get_user_limits

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Groq API Configuration
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"

def get_groq_api_key():
    """Get Groq API key from environment"""
    return os.getenv("GROQ_API_KEY", "")

# System prompt for trading assistant
SYSTEM_PROMPT = """Tu es TDB Assistant, un expert en trading et analyse financière avec 20 ans d'expérience sur les marchés.
Tu travailles pour la plateforme TDB (Trading Dashboard Bot) et tu aides les traders à progresser.

═══════════════════════════════════════════
🎯 TON RÔLE
═══════════════════════════════════════════
Tu es un MENTOR pédagogique, pas un conseiller financier.
Tu expliques, tu formes, tu contextualises — mais tu ne dis jamais quoi acheter ou vendre.

═══════════════════════════════════════════
📐 RÈGLES ABSOLUES
═══════════════════════════════════════════
1. TOUJOURS répondre en français, avec un vocabulaire précis et professionnel
2. NE JAMAIS donner de conseils financiers personnalisés ("achète X", "vends Y maintenant")
3. TOUJOURS ajouter en fin de réponse: ⚠️ *Ceci est éducatif, pas un conseil financier. Trading = risque de perte en capital.*
4. Utiliser des emojis pertinents pour structurer visuellement les réponses
5. Structurer les réponses avec des titres markdown (**Titre**, ## Section)
6. Être précis sur les chiffres et les définitions

═══════════════════════════════════════════
📊 ANALYSE TECHNIQUE — CE QUE TU MAÎTRISES
═══════════════════════════════════════════

**INDICATEURS DE MOMENTUM:**
- RSI (Relative Strength Index, 14 périodes par défaut): surachat >70, survente <30. Divergences haussières/baissières cruciales.
- MACD (12-26-9): croisement ligne signal = signal entrée/sortie. Histogramme = force du momentum. Divergences = retournements.
- Stochastique (%K/%D): similaire RSI, utile en range market. Croisements en zones extrêmes.
- Williams %R: complémentaire RSI pour confirmer les retournements.

**INDICATEURS DE TENDANCE:**
- EMA 20/50/200: positions du prix par rapport aux moyennes = contexte de tendance. Golden Cross (EMA50 > EMA200) haussier. Death Cross baissier.
- SMA: plus lente que l'EMA, moins réactive. Utilisée pour identifier les tendances long terme.
- ADX (Average Directional Index): mesure la FORCE d'une tendance (pas sa direction). ADX >25 = tendance forte.
- Ichimoku Cloud: système complet tendance/support/résistance sur 5 lignes (Tenkan, Kijun, Senkou A/B, Chikou).

**INDICATEURS DE VOLATILITÉ:**
- Bandes de Bollinger (20,2): prix hors bandes = signal fort. Squeeze (bandes serrées) = explosion de volatilité imminente. Marche le long de la bande = tendance forte.
- ATR (Average True Range): mesure la volatilité en valeur absolue. Essentiel pour calibrer les stop-loss (ex: SL = entrée - 1.5x ATR).
- VIX (pour actions US): "indice de la peur". >30 = panique, <15 = complaisance.

**INDICATEURS DE VOLUME:**
- Volume: TOUJOURS confirmer les mouvements de prix par le volume. Breakout avec volume élevé = signal fort.
- OBV (On Balance Volume): accumulation/distribution. Divergence OBV/prix = signal de retournement.
- VWAP (Volume Weighted Average Price): prix moyen pondéré par volume. Référence institutionnelle. Prix > VWAP = biais haussier intrajournalier.
- CMF (Chaikin Money Flow): flux d'argent entrant/sortant.

**PRICE ACTION & PATTERNS:**
- Chandeliers japonais: Doji, Hammer, Shooting Star, Englobant, Étoile du matin/soir, Harami, Marubozu
- Patterns chartistes: Tête-Épaules (retournement), Double Top/Bottom, Triangle (continuation/retournement), Wedge, Flag, Pennant, Cup & Handle
- Fibonacci retracements: niveaux 23.6%, 38.2%, 50%, 61.8%, 78.6% — zones de support/résistance naturelles

**NIVEAUX CLÉS:**
- Support/Résistance: zones où le prix rebondit plusieurs fois
- Points Pivot (Standard, Fibonacci, Camarilla, Woodie)
- Zones de liquidité: où se concentrent les stops et les ordres
- Fair Value Gaps (FVG) / Imbalances: zones non rééquilibrées sur le carnet d'ordres

═══════════════════════════════════════════
💹 STYLES DE TRADING — CE QUE TU EXPLIQUES
═══════════════════════════════════════════
- **Scalping**: trades de quelques secondes à quelques minutes. TF: 1m-5m. Nécessite spread très faible et rapidité.
- **Day Trading**: ouverture et clôture le même jour. TF: 5m-1h. Pas de position overnight.
- **Swing Trading**: positions de quelques jours à quelques semaines. TF: 4h-1j. Capture les mouvements intermédiaires.
- **Position Trading**: mois à années. TF: 1j-1sem. Basé sur fondamentaux + technique long terme.
- **Carry Trade**: exploite les différentiels de taux (Forex surtout).
- **Arbitrage**: exploite les écarts de prix entre marchés.

═══════════════════════════════════════════
⚖️ GESTION DU RISQUE — FONDAMENTAL
═══════════════════════════════════════════
- **Règle des 1-2%**: ne jamais risquer plus de 1-2% du capital sur un seul trade
- **Risk/Reward (R:R)**: minimum 1:2 (risquer 50 pour gagner 100). Idéalement 1:3+.
- **Stop-Loss**: OBLIGATOIRE. Placement technique (sous support, sous ATR, sous dernier bas).
- **Take-Profit**: T1 (50% position), T2 (30%), T3 (20%) — gestion pyramidale.
- **Position sizing**: Taille position = (Capital × %risque) / (entrée - stop-loss)
- **Drawdown maximal**: limite de perte journalière/hebdomadaire à définir avant de trader.
- **Corrélations**: éviter d'avoir plusieurs positions corrélées (amplification du risque).
- **Levier**: amplifie GAINS et PERTES. Levier 10x = 10% de mouvement adverse = -100% du capital engagé.

═══════════════════════════════════════════
🌍 MARCHÉS DISPONIBLES SUR TDB
═══════════════════════════════════════════
- **Actions USA**: NYSE, NASDAQ (Apple, Tesla, Nvidia, Meta, Alphabet...)
- **Actions Europe**: CAC40, DAX40, FTSE100, AEX, IBEX35, FTSE MIB...
- **Actions Asie**: Nikkei, Hang Seng, KOSPI, BSE Sensex...
- **Crypto**: BTC, ETH, BNB, SOL, XRP, ADA, et 50+ altcoins
- **Matières premières**: Or (GC=F), Pétrole WTI (CL=F), Argent, Cuivre, Blé, Gaz naturel...
- **Indices**: S&P500, Dow Jones, Nasdaq100, VIX, STOXX50...

═══════════════════════════════════════════
🧠 PSYCHOLOGIE DU TRADING
═══════════════════════════════════════════
- **FOMO** (Fear Of Missing Out): entrer trop tard sur un trade émotionnellement
- **FUD** (Fear Uncertainty Doubt): vendre par panique
- **Biais de confirmation**: ne voir que les signaux qui confirment sa thèse
- **Overtrading**: trader trop souvent, souvent lié aux émotions
- **Revenge trading**: tenter de récupérer ses pertes immédiatement — DANGEREUX
- **Plan de trading**: règles précises d'entrée, sortie, gestion. TOUJOURS respecter son plan.

═══════════════════════════════════════════
📚 ANALYSE FONDAMENTALE (ACTIONS)
═══════════════════════════════════════════
- **P/E Ratio** (Price/Earnings): valorisation relative. P/E élevé = croissance attendue ou surévaluation.
- **Forward P/E**: basé sur les bénéfices futurs estimés.
- **PEG Ratio**: P/E divisé par croissance. <1 = potentiellement sous-évalué.
- **EV/EBITDA**: valorisation entreprise hors structure financière.
- **ROE** (Return on Equity): rentabilité des capitaux propres.
- **Marge nette**: efficacité opérationnelle.
- **Flux de trésorerie libre** (FCF): cash généré après investissements.
- **Dividende yield**: rendement dividende. Important pour les investisseurs income.
- **Beta**: sensibilité au marché. Beta >1 = plus volatile que le marché.

═══════════════════════════════════════════
🪙 CRYPTO — SPÉCIFICITÉS
═══════════════════════════════════════════
- **Market Cap**: capitalisation = prix × supply en circulation
- **Dominance BTC**: si BTC.D monte = rotation vers BTC (risk-off crypto). Si baisse = altseason.
- **On-chain metrics**: NVT, MVRV, SOPR — santé du réseau et des holders
- **DeFi**: protocoles décentralisés (Uniswap, Aave, Compound). TVL = Total Value Locked.
- **Halving Bitcoin**: réduction de moitié des récompenses mineurs (~4 ans). Historiquement bullish.
- **Funding Rate**: taux des positions futures perpetuelles. Taux élevé positif = positions longues surpeuplées.
- **Open Interest**: volume total des contrats futures ouverts. Indicateur de levier dans le marché.

═══════════════════════════════════════════
💡 FORMAT DE TES RÉPONSES
═══════════════════════════════════════════
- Questions courtes (définition): réponse concise 150-300 mots avec exemples chiffrés
- Questions complexes (stratégie, analyse): structure complète avec sections markdown
- Analyses d'actifs: utilise les données fournies en contexte, sois précis sur les niveaux
- TOUJOURS illustrer avec des exemples concrets (ex: "RSI à 75 sur AAPL = zone de prudence")
- Utilise des tableaux markdown quand c'est pertinent (comparaisons, niveaux clés)
"""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None  # Optional market context

    @field_validator("message")
    @classmethod
    def message_max_length(cls, v: str) -> str:
        if len(v) > 5000:
            raise ValueError("Message trop long (max 5000 caractères)")
        return v

    @field_validator("context")
    @classmethod
    def context_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 10000:
            raise ValueError("Contexte trop long (max 10000 caractères)")
        return v


class ChatResponse(BaseModel):
    response: str
    usage: Optional[dict] = None


def get_user_id(user: dict) -> int:
    """Get user ID for web users"""
    return user.get("id")


async def get_user_messages_today(user_id: int) -> int:
    """Count messages sent by user today"""
    from datetime import date
    today = date.today().isoformat()  # '2025-03-15'
    result = await execute_query(
        """SELECT COUNT(*) as count FROM web_ai_chat
           WHERE user_id = ? AND role = 'user'
           AND created_at LIKE ?""",
        (user_id, f"{today}%")
    )
    return result[0]["count"] if result else 0


async def check_ai_limit(user: dict) -> dict:
    """Check if user can send AI messages. Returns remaining count and limit info."""
    user_id = get_user_id(user)
    is_premium = await is_user_premium(user)
    limits = await get_user_limits(user)

    messages_today = await get_user_messages_today(user_id)
    daily_limit = limits.get("ai_messages_per_day", 10)

    # -1 means unlimited (premium)
    if daily_limit == -1:
        return {
            "can_send": True,
            "messages_today": messages_today,
            "daily_limit": -1,
            "remaining": -1,
            "is_premium": is_premium
        }

    remaining = max(0, daily_limit - messages_today)
    return {
        "can_send": remaining > 0,
        "messages_today": messages_today,
        "daily_limit": daily_limit,
        "remaining": remaining,
        "is_premium": is_premium
    }


@router.get("/limit")
async def get_ai_limit(current_user: dict = Depends(get_current_user)):
    """Get user's AI message limit status"""
    return await check_ai_limit(current_user)


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("5/minute")
async def chat_with_assistant(
    request: Request,
    body: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to the AI assistant"""
    try:
        api_key = get_groq_api_key()
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="AI Assistant not configured. Please set GROQ_API_KEY."
            )

        # Check message limit for free users
        limit_status = await check_ai_limit(current_user)
        if not limit_status["can_send"]:
            raise HTTPException(
                status_code=429,
                detail={
                    "message": "Limite quotidienne atteinte. Passez Premium pour des messages illimites.",
                    "messages_today": limit_status["messages_today"],
                    "daily_limit": limit_status["daily_limit"],
                    "remaining": 0
                }
            )

        user_id = get_user_id(current_user)

        # Get conversation history (last 10 messages)
        history = await execute_query(
            """SELECT role, content FROM web_ai_chat
               WHERE user_id = ?
               ORDER BY created_at DESC
               LIMIT 10""",
            (user_id,)
        )
        history = list(reversed(history))

        # Build messages array
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add optional context
        if body.context:
            messages.append({
                "role": "system",
                "content": f"Contexte actuel du marché:\n{body.context}"
            })

        # Add conversation history
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add new user message
        messages.append({"role": "user", "content": body.message})

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024
                }
            )

            if response.status_code != 200:
                print(f"[AI] Groq API error {response.status_code}: {response.text[:200]}")
                if response.status_code == 401:
                    raise HTTPException(status_code=503, detail="Cle API Groq invalide. Verifiez GROQ_API_KEY.")
                elif response.status_code == 429:
                    raise HTTPException(status_code=429, detail="Limite Groq atteinte. Reessayez dans quelques secondes.")
                else:
                    raise HTTPException(status_code=502, detail=f"Erreur IA ({response.status_code}): {response.text[:200]}")

            data = response.json()
            assistant_message = data["choices"][0]["message"]["content"]

            # Save messages to history
            now = datetime.utcnow().isoformat()
            await execute_write(
                """INSERT INTO web_ai_chat (user_id, role, content, created_at)
                   VALUES (?, 'user', ?, ?)""",
                (user_id, body.message, now)
            )
            await execute_write(
                """INSERT INTO web_ai_chat (user_id, role, content, created_at)
                   VALUES (?, 'assistant', ?, ?)""",
                (user_id, assistant_message, now)
            )

            return ChatResponse(
                response=assistant_message,
                usage=data.get("usage")
            )

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timeout")
    except Exception as e:
        import traceback
        detail_msg = str(e) or f"{type(e).__name__} (no message)"
        print(f"[AI] Unexpected error in chat_with_assistant ({type(e).__name__}): {detail_msg}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=detail_msg)


@router.get("/history")
async def get_chat_history(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get chat history"""
    user_id = get_user_id(current_user)

    messages = await execute_query(
        """SELECT role, content, created_at FROM web_ai_chat
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (user_id, limit)
    )

    return {"messages": list(reversed(messages))}


@router.delete("/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    """Clear chat history"""
    user_id = get_user_id(current_user)

    await execute_write(
        "DELETE FROM web_ai_chat WHERE user_id = ?",
        (user_id,)
    )

    return {"message": "Chat history cleared"}


@router.post("/quick-analysis")
@limiter.limit("3/minute")
async def quick_analysis(
    request: Request,
    symbol: str,
    trading_style: str = "day",
    risk_level: str = "moderate",
    current_user: dict = Depends(get_current_user)
):
    """Premium AI analysis — fetches full market, technical, fundamental and news data.
    Adapts entirely to the user's trading style (scalp/day/swing/long) and risk level."""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()

    import numpy as np
    import yfinance as yf
    import asyncio
    from ._prices import fetch_ohlcv

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI Assistant not configured")

    # ── 1. Fetch market data ────────────────────────────────────────────────
    try:
        # 1 year daily + 5 days intraday for VWAP
        hist = await fetch_ohlcv(symbol, period="1y", interval="1d")
        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")

        # Run yfinance info in thread (blocking)
        def _get_ticker_info():
            t = yf.Ticker(symbol)
            return t.info, t.recommendations, t.news, t.calendar
        loop = asyncio.get_event_loop()
        info, recs, news_raw, calendar = await loop.run_in_executor(None, _get_ticker_info)
    except HTTPException:
        raise
    except Exception as e:
        info, recs, news_raw, calendar = {}, None, [], None

    # ── 2. Price & performance ──────────────────────────────────────────────
    close = hist["Close"]
    high  = hist["High"]
    low   = hist["Low"]
    volume = hist["Volume"]
    n = len(close)

    price = float(close.iloc[-1])
    chg_1d  = float((price - close.iloc[-2]) / close.iloc[-2] * 100) if n >= 2 else 0.0
    chg_1w  = float((price - close.iloc[-5]) / close.iloc[-5] * 100) if n >= 5 else 0.0
    chg_1m  = float((price - close.iloc[-22]) / close.iloc[-22] * 100) if n >= 22 else 0.0
    chg_3m  = float((price - close.iloc[-66]) / close.iloc[-66] * 100) if n >= 66 else 0.0
    chg_6m  = float((price - close.iloc[-132]) / close.iloc[-132] * 100) if n >= 132 else 0.0
    chg_1y  = float((price - close.iloc[0]) / close.iloc[0] * 100) if n >= 2 else 0.0
    high_52w = float(high.max())
    low_52w  = float(low.min())
    pct_from_52w_high = (price - high_52w) / high_52w * 100
    pct_from_52w_low  = (price - low_52w)  / low_52w  * 100

    # ── 3. Technical indicators ─────────────────────────────────────────────
    # RSI
    delta = close.diff()
    gain  = delta.where(delta > 0, 0.0).rolling(14).mean()
    loss  = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
    rsi   = float(100 - 100 / (1 + gain.iloc[-1] / loss.iloc[-1])) if loss.iloc[-1] else 50.0

    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line   = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    histogram   = macd_line - signal_line
    macd_val  = float(macd_line.iloc[-1])
    sig_val   = float(signal_line.iloc[-1])
    hist_val  = float(histogram.iloc[-1])

    # Moving averages
    ema20  = float(close.ewm(span=20, adjust=False).mean().iloc[-1])
    ema50  = float(close.ewm(span=50, adjust=False).mean().iloc[-1]) if n >= 50 else None
    ema200 = float(close.ewm(span=200, adjust=False).mean().iloc[-1]) if n >= 200 else None
    sma20  = float(close.rolling(20).mean().iloc[-1])
    sma50  = float(close.rolling(50).mean().iloc[-1]) if n >= 50 else None
    sma200 = float(close.rolling(200).mean().iloc[-1]) if n >= 200 else None

    # Golden/Death cross
    cross_signal = "N/A"
    if ema50 and ema200:
        if ema50 > ema200:
            cross_signal = "Golden Cross (EMA50 > EMA200) — structure haussière long terme"
        else:
            cross_signal = "Death Cross (EMA50 < EMA200) — structure baissière long terme"

    # Bollinger Bands (20, 2)
    bb_mid  = close.rolling(20).mean()
    bb_std  = close.rolling(20).std()
    bb_up   = float((bb_mid + 2 * bb_std).iloc[-1])
    bb_low  = float((bb_mid - 2 * bb_std).iloc[-1])
    bb_pct  = float((price - bb_low) / (bb_up - bb_low) * 100) if bb_up != bb_low else 50.0
    bb_width = float((bb_up - bb_low) / float(bb_mid.iloc[-1]) * 100)

    # ATR
    tr = np.maximum(
        high.values[1:] - low.values[1:],
        np.maximum(abs(high.values[1:] - close.values[:-1]), abs(low.values[1:] - close.values[:-1]))
    )
    atr = float(np.mean(tr[-14:])) if len(tr) >= 14 else 0.0

    # ADX
    plus_dm  = np.where((high.diff().values > 0) & (high.diff().values > -low.diff().values), high.diff().values, 0.0)[1:]
    minus_dm = np.where((-low.diff().values > 0) & (-low.diff().values > high.diff().values), -low.diff().values, 0.0)[1:]
    atr14    = np.convolve(tr, np.ones(14) / 14, "valid")
    if len(atr14) > 0 and atr14[-1] > 0:
        plus_di  = float(np.mean(plus_dm[-14:]) / atr14[-1] * 100)
        minus_di = float(np.mean(minus_dm[-14:]) / atr14[-1] * 100)
        dx = abs(plus_di - minus_di) / (plus_di + minus_di) * 100 if (plus_di + minus_di) else 0
        adx = float(np.mean([dx] * 14))  # simplified
    else:
        plus_di = minus_di = adx = 0.0

    # Stochastic (14, 3)
    low14  = low.rolling(14).min()
    high14 = high.rolling(14).max()
    stoch_k = float(((close - low14) / (high14 - low14) * 100).iloc[-1]) if float((high14 - low14).iloc[-1]) else 50.0
    stoch_d = float(((close - low14) / (high14 - low14) * 100).rolling(3).mean().iloc[-1]) if float((high14 - low14).iloc[-1]) else 50.0

    # Williams %R
    wr = float(((high14 - close) / (high14 - low14) * -100).iloc[-1]) if float((high14 - low14).iloc[-1]) else -50.0

    # OBV
    obv_change = np.where(close.diff().values > 0, volume.values, np.where(close.diff().values < 0, -volume.values, 0))
    obv = float(np.cumsum(obv_change)[-1])
    obv_trend = "HAUSSIER" if np.mean(obv_change[-10:]) > 0 else "BAISSIER"

    # Volume
    avg_vol = float(volume.mean())
    cur_vol = float(volume.iloc[-1])
    vol_ratio = cur_vol / avg_vol if avg_vol > 0 else 1.0

    # Volatility
    volatility_ann = float(close.pct_change().std() * np.sqrt(252) * 100)

    # Fibonacci (52-week range)
    fib_levels = {
        "0%":    round(low_52w, 2),
        "23.6%": round(low_52w + 0.236 * (high_52w - low_52w), 2),
        "38.2%": round(low_52w + 0.382 * (high_52w - low_52w), 2),
        "50%":   round(low_52w + 0.5   * (high_52w - low_52w), 2),
        "61.8%": round(low_52w + 0.618 * (high_52w - low_52w), 2),
        "78.6%": round(low_52w + 0.786 * (high_52w - low_52w), 2),
        "100%":  round(high_52w, 2),
    }
    nearest_fib = min(fib_levels.items(), key=lambda x: abs(x[1] - price))

    # Pivot points (classic, last session)
    prev_high = float(high.iloc[-2]) if n >= 2 else price
    prev_low  = float(low.iloc[-2])  if n >= 2 else price
    prev_close = float(close.iloc[-2]) if n >= 2 else price
    pp = (prev_high + prev_low + prev_close) / 3
    r1 = 2 * pp - prev_low
    r2 = pp + (prev_high - prev_low)
    r3 = prev_high + 2 * (pp - prev_low)
    s1 = 2 * pp - prev_high
    s2 = pp - (prev_high - prev_low)
    s3 = prev_low - 2 * (prev_high - pp)

    # Trend structure (higher-highs / lower-lows on last 20 sessions)
    highs20 = high.iloc[-20:].values
    lows20  = low.iloc[-20:].values
    hh = sum(1 for i in range(1, len(highs20)) if highs20[i] > highs20[i-1])
    ll = sum(1 for i in range(1, len(lows20)) if lows20[i] < lows20[i-1])
    trend_structure = "HAUSSIER (plus hauts croissants)" if hh > 12 else ("BAISSIER (plus bas décroissants)" if ll > 12 else "LATERAL/INDÉCIS")

    # ── 4. Fundamental data ─────────────────────────────────────────────────
    def _g(k, default="N/A"):
        v = info.get(k)
        return v if v is not None else default

    pe            = _g("trailingPE")
    forward_pe    = _g("forwardPE")
    peg           = _g("pegRatio")
    ev_ebitda     = _g("enterpriseToEbitda")
    pb            = _g("priceToBook")
    ps            = _g("priceToSalesTrailing12Months")
    dividend_yield = round(float(_g("dividendYield", 0) or 0) * 100, 2)
    beta          = _g("beta")
    market_cap    = _g("marketCap")
    target_mean   = _g("targetMeanPrice")
    target_low    = _g("targetLowPrice")
    target_high   = _g("targetHighPrice")
    rec_key       = _g("recommendationKey", "N/A")
    buy_count     = _g("recommendationMean", "N/A")
    short_ratio   = _g("shortRatio", "N/A")
    short_pct_float = _g("shortPercentOfFloat", "N/A")
    inst_own_pct  = _g("heldPercentInstitutions", "N/A")
    profit_margin = round(float(_g("profitMargins", 0) or 0) * 100, 2)
    roe           = round(float(_g("returnOnEquity", 0) or 0) * 100, 2)
    revenue_growth = round(float(_g("revenueGrowth", 0) or 0) * 100, 2)
    earnings_growth = round(float(_g("earningsGrowth", 0) or 0) * 100, 2)
    debt_equity   = _g("debtToEquity")
    fcf           = _g("freeCashflow")
    sector        = _g("sector", "N/A")
    industry      = _g("industry", "N/A")
    company_name  = _g("longName", symbol)
    description   = (_g("longBusinessSummary", "") or "")[:500]
    employees     = _g("fullTimeEmployees", "N/A")
    country       = _g("country", "N/A")

    # Format market cap
    if isinstance(market_cap, (int, float)) and market_cap > 0:
        if market_cap >= 1e12:
            mc_str = f"${market_cap/1e12:.2f}T"
        elif market_cap >= 1e9:
            mc_str = f"${market_cap/1e9:.2f}B"
        else:
            mc_str = f"${market_cap/1e6:.0f}M"
    else:
        mc_str = "N/A"

    if isinstance(fcf, (int, float)):
        fcf_str = f"${fcf/1e9:.2f}B" if abs(fcf) >= 1e9 else f"${fcf/1e6:.0f}M"
    else:
        fcf_str = "N/A"

    # Analyst upside potential
    if isinstance(target_mean, (int, float)) and price > 0:
        upside = (target_mean - price) / price * 100
        upside_str = f"{upside:+.1f}%"
    else:
        upside_str = "N/A"

    # Short interest
    if isinstance(short_pct_float, float):
        short_pct_str = f"{short_pct_float*100:.1f}%"
    else:
        short_pct_str = str(short_pct_float)

    if isinstance(inst_own_pct, float):
        inst_str = f"{inst_own_pct*100:.1f}%"
    else:
        inst_str = str(inst_own_pct)

    # ── 5. News headlines ───────────────────────────────────────────────────
    news_lines = []
    if news_raw:
        for item in news_raw[:6]:
            title = item.get("title", "")
            publisher = item.get("publisher", "")
            if title:
                news_lines.append(f"- {title} ({publisher})")

    # ── 6. Analyst recommendations ─────────────────────────────────────────
    rec_summary = "N/A"
    if recs is not None and not recs.empty:
        try:
            last = recs.tail(4)
            strong_buy  = int(last.get("strongBuy", last.get("Strong Buy", [0])).sum()) if "strongBuy" in last.columns or "Strong Buy" in last.columns else 0
            buy_cnt     = int(last.get("buy",       last.get("Buy", [0])).sum())         if "buy"       in last.columns or "Buy"       in last.columns else 0
            hold_cnt    = int(last.get("hold",      last.get("Hold", [0])).sum())        if "hold"      in last.columns or "Hold"      in last.columns else 0
            sell_cnt    = int(last.get("sell",      last.get("Sell", [0])).sum())        if "sell"      in last.columns or "Sell"      in last.columns else 0
            rec_summary = f"StrongBuy:{strong_buy} Buy:{buy_cnt} Hold:{hold_cnt} Sell:{sell_cnt}"
        except Exception:
            rec_summary = "N/A"

    # ── 7. Upcoming earnings ────────────────────────────────────────────────
    earnings_date = "N/A"
    try:
        if calendar is not None:
            if isinstance(calendar, dict):
                ed = calendar.get("Earnings Date") or calendar.get("earningsDate")
                if ed:
                    earnings_date = str(ed[0])[:10] if hasattr(ed, "__iter__") and not isinstance(ed, str) else str(ed)[:10]
    except Exception:
        pass

    # ── 8. Build market context string ─────────────────────────────────────
    fib_str = "\n".join(f"  {k}: ${v}" for k, v in fib_levels.items())
    news_str = "\n".join(news_lines) if news_lines else "Aucune actualité disponible"

    market_context = f"""
╔══════════════════════════════════════════════════════════╗
  ANALYSE PREMIUM — {symbol} ({company_name})
  Secteur: {sector} | Industrie: {industry} | Pays: {country}
╚══════════════════════════════════════════════════════════╝

━━━ PRIX & PERFORMANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Prix actuel:        ${price:.4f}
  Variation 24h:      {chg_1d:+.2f}%
  Variation 1 sem:    {chg_1w:+.2f}%
  Variation 1 mois:   {chg_1m:+.2f}%
  Variation 3 mois:   {chg_3m:+.2f}%
  Variation 6 mois:   {chg_6m:+.2f}%
  Variation 1 an:     {chg_1y:+.2f}%
  52w High:           ${high_52w:.4f} ({pct_from_52w_high:+.1f}% vs actuel)
  52w Low:            ${low_52w:.4f} ({pct_from_52w_low:+.1f}% vs actuel)
  Volatilité annuelle:{volatility_ann:.1f}%
  Prochains résultats:{earnings_date}

━━━ INDICATEURS TECHNIQUES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RSI (14):           {rsi:.2f} {'⚠️ SURACHETÉ' if rsi > 70 else '⚠️ SURVENDU' if rsi < 30 else '(Zone neutre)'}
  MACD:               {macd_val:+.4f} | Signal: {sig_val:+.4f} | Histogramme: {hist_val:+.4f}
  ADX (14):           {adx:.1f} {'(Tendance forte)' if adx > 25 else '(Tendance faible/range)'}
  DI+/DI-:            {plus_di:.1f} / {minus_di:.1f} {'→ Pression haussière' if plus_di > minus_di else '→ Pression baissière'}
  Stochastique %K:    {stoch_k:.1f} | %D: {stoch_d:.1f} {'⚠️ Surachat' if stoch_k > 80 else '⚠️ Survente' if stoch_k < 20 else ''}
  Williams %R:        {wr:.1f} {'(Surachat)' if wr > -20 else '(Survente)' if wr < -80 else ''}
  OBV tendance:       {obv_trend}
  Bollinger %B:       {bb_pct:.1f}% | Width: {bb_width:.1f}% | Upper: ${bb_up:.2f} | Lower: ${bb_low:.2f}
  ATR (14):           ${atr:.4f}
  Volume actuel:      {cur_vol:,.0f} ({vol_ratio:.2f}x la moyenne)

━━━ MOYENNES MOBILES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EMA 20:   ${ema20:.4f} {'↑ Prix au-dessus' if price > ema20 else '↓ Prix en-dessous'}
  EMA 50:   {f'${ema50:.4f}' if ema50 else 'N/A'} {'↑ Prix au-dessus' if ema50 and price > ema50 else '↓ Prix en-dessous' if ema50 else ''}
  EMA 200:  {f'${ema200:.4f}' if ema200 else 'N/A'} {'↑ Prix au-dessus' if ema200 and price > ema200 else '↓ Prix en-dessous' if ema200 else ''}
  SMA 50:   {f'${sma50:.4f}' if sma50 else 'N/A'}
  SMA 200:  {f'${sma200:.4f}' if sma200 else 'N/A'}
  Structure:{cross_signal}
  Tendance 20j: {trend_structure}

━━━ NIVEAUX PIVOT (séance précédente) ━━━━━━━━━━━━━━━━━━━
  R3: ${r3:.2f} | R2: ${r2:.2f} | R1: ${r1:.2f}
  PP: ${pp:.2f}
  S1: ${s1:.2f} | S2: ${s2:.2f} | S3: ${s3:.2f}

━━━ FIBONACCI 52 SEMAINES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{fib_str}
  → Niveau Fibonacci le plus proche du prix actuel: {nearest_fib[0]} (${nearest_fib[1]})

━━━ FONDAMENTAUX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Market Cap:         {mc_str}
  P/E (trailing):     {pe}
  P/E (forward):      {forward_pe}
  PEG Ratio:          {peg}
  EV/EBITDA:          {ev_ebitda}
  P/B:                {pb} | P/S: {ps}
  Beta:               {beta}
  Dividende:          {dividend_yield}%
  Marge nette:        {profit_margin}%
  ROE:                {roe}%
  Croissance revenus: {revenue_growth}%
  Croissance BPA:     {earnings_growth}%
  Dette/Fonds propres:{debt_equity}
  Free Cash Flow:     {fcf_str}
  Employés:           {employees}

━━━ CONSENSUS ANALYSTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Recommandation:     {rec_key.upper() if isinstance(rec_key, str) else rec_key}
  Répartition (4 mois): {rec_summary}
  Objectif moyen:     {f'${target_mean:.2f}' if isinstance(target_mean, float) else target_mean} (potentiel: {upside_str})
  Objectif min/max:   {f'${target_low:.2f}' if isinstance(target_low, float) else target_low} / {f'${target_high:.2f}' if isinstance(target_high, float) else target_high}

━━━ POSITIONNEMENT DU MARCHÉ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Vente à découvert:  {short_pct_str} du float | Short ratio: {short_ratio}j
  Institutionnels:    {inst_str} du capital

━━━ ACTUALITÉS RÉCENTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{news_str}

━━━ DESCRIPTION SOCIÉTÉ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{description or 'N/A'}
"""

    # ── 9. Style-adaptive prompt ────────────────────────────────────────────

    # --- Style configuration --------------------------------------------------
    _style = (trading_style or "day").lower().strip()
    _risk  = (risk_level or "moderate").lower().strip()

    _STYLE_META = {
        "scalp": {
            "label":     "Scalping",
            "horizon":   "1 à 30 minutes",
            "persona":   "spécialiste du scalping ultra-court terme, expert des micro-niveaux et du momentum intraday",
            "focus":     "momentum 5-15 minutes, zones de liquidité immédiates, order flow, bid-ask spread, entrées précises à la seconde",
            "ignore":    "Les fondamentaux (P/E, croissance, macro) sont SECONDAIRES pour ce style. Ignore ou mentionne en 1 ligne max.",
            "indicators":"RSI court terme (5-9 périodes si possible), MACD 1min/5min, Stochastique, Williams %R, OBV, volume spike",
            "sl_mult":   0.4,
            "tp_rr":     "1:1 à 1:1.5 (scalping)",
            "size_pct":  "1-2% du portefeuille (risque par trade très court)",
            "horizon_trade": "minutes à max 2h, pas de position overnight",
            "stop_note": "Stop ultra-serré à 0.4×ATR",
            "strategy_name": "Setup de scalp",
        },
        "day": {
            "label":     "Day Trading",
            "horizon":   "quelques heures à une journée",
            "persona":   "day trader professionnel, expert des ranges journaliers et des niveaux intraday",
            "focus":     "range journalier (High/Low du jour), VWAP comme support/résistance dynamique, niveaux pivot journaliers, sessions Asia/London/NY",
            "ignore":    "Les fondamentaux long terme (croissance des revenus, dividendes) sont peu pertinents. Concentre-toi sur le technique intraday.",
            "indicators":"RSI 14 sur 15min/1h, MACD 15min, EMA 9/20 intraday, VWAP, volume par session, ATR journalier",
            "sl_mult":   1.0,
            "tp_rr":     "1:1.5 à 1:2 (day trading)",
            "size_pct":  "3-5% du portefeuille",
            "horizon_trade": "quelques heures, clôture AVANT la fin de session",
            "stop_note": "Stop à 1×ATR (range intraday normal)",
            "strategy_name": "Setup day trade",
        },
        "swing": {
            "label":     "Swing Trading",
            "horizon":   "2 à 10 jours",
            "persona":   "swing trader expert, maîtrisant les tendances 4h/daily et les pullbacks sur zones clés",
            "focus":     "tendances sur graphiques 4h et daily, retracements Fibonacci, pullbacks sur EMA20/50, structure de marché (HH/HL vs LH/LL), divergences RSI/prix",
            "ignore":    "Les signaux ultra-court terme (1min, 5min) sont du bruit. Ne les mentionne pas.",
            "indicators":"RSI daily, MACD daily, EMA20/50/200 daily, Bollinger Bands daily, ATR daily, niveaux hebdomadaires",
            "sl_mult":   1.5,
            "tp_rr":     "1:2 à 1:3 (swing)",
            "size_pct":  "5-7% du portefeuille",
            "horizon_trade": "2 à 10 jours, clôture partielle sur T1 puis laisser courir",
            "stop_note": "Stop à 1.5×ATR (permet d'absorber la volatilité journalière sans sortie prématurée)",
            "strategy_name": "Setup swing",
        },
        "long": {
            "label":     "Long Terme / Investissement",
            "horizon":   "semaines à plusieurs mois",
            "persona":   "analyste fondamental senior, spécialiste de l'investissement value et growth long terme",
            "focus":     "fondamentaux (croissance revenus, marges, FCF, bilan, D/E), positionnement sectoriel, catalyseurs macro (taux, inflation, dollar), qualité du management, moat concurrentiel, valorisation relative au secteur",
            "ignore":    "Les micro-oscillateurs (Stochastique, Williams %R sur 15min) sont NON PERTINENTS pour ce style. Concentre-toi sur la vision weekly/monthly.",
            "indicators":"RSI weekly, MACD weekly, SMA 50/200, tendances multi-mois, P/E vs croissance (PEG), EV/EBITDA vs historique, insider buying/selling",
            "sl_mult":   2.5,
            "tp_rr":     "1:3 à 1:5+ (investissement long terme)",
            "size_pct":  "5-10% du portefeuille (conviction élevée nécessaire)",
            "horizon_trade": "plusieurs semaines à mois, renforcement sur les pullbacks",
            "stop_note": "Stop à 2.5×ATR (éviter les stop-hunts sur faux mouvements) ou stop mental sur cassure fondamentale",
            "strategy_name": "Position d'investissement",
        },
    }

    _RISK_META = {
        "conservative": {
            "label": "Conservateur",
            "size_adj": "RÉDUIS les tailles de position suggérées de 30-40%. Préfère les actifs stables (blue chips, dividendes, faible beta). Stop plus large pour éviter les faux signaux.",
            "leverage": "0 levier recommandé.",
            "min_rr": "R/R minimum 1:2 exigé avant d'entrer.",
        },
        "moderate": {
            "label": "Modéré",
            "size_adj": "Utilise les tailles standard suggérées.",
            "leverage": "Levier faible acceptable (1x-2x max).",
            "min_rr": "R/R minimum 1:1.5.",
        },
        "aggressive": {
            "label": "Agressif",
            "size_adj": "Peut augmenter les tailles de 20-30% sur les setups à haute conviction (score >75). Accepte les actifs volatils.",
            "leverage": "Levier modéré acceptable (2x-3x max).",
            "min_rr": "R/R minimum 1:1.2.",
        },
        "very_aggressive": {
            "label": "Très Agressif",
            "size_adj": "Positions maximales possibles sur les meilleurs setups. Haute volatilité acceptée, actifs spéculatifs inclus.",
            "leverage": "Levier élevé possible (3x-5x) sur setups de conviction maximale.",
            "min_rr": "R/R minimum 1:1 (vitesse prime sur sécurité).",
        },
    }

    sm = _STYLE_META.get(_style, _STYLE_META["day"])
    rm = _RISK_META.get(_risk, _RISK_META["moderate"])

    sl_price = price - sm["sl_mult"] * atr
    tp1 = price + (price - sl_price) * 1.5
    tp2 = price + (price - sl_price) * 2.5
    tp3 = price + (price - sl_price) * 4.0

    # Pre-compute style-conditional text blocks (Python 3.11 forbids backslashes inside f-string {})
    ema50_str  = f"{ema50:.2f}"  if ema50  else "N/A"
    sma200_str = f"{sma200:.2f}" if sma200 else "N/A"

    if _style == "scalp":
        _rsi_block      = f"RSI à {rsi:.1f} (15min/1h pour scalp): timing d'entrée précis? Zone de retournement court terme?"
        _stoch_block    = f"Stochastique {stoch_k:.1f}/{stoch_d:.1f} + Williams %R {wr:.1f}: micro-timing d'entrée pour le scalp — confirmation ou divergence?"
        _adx_block      = ""
        _structure_block = f"Micro-niveaux immédiats: R1 ${r1:.2f} / PP ${pp:.2f} / S1 ${s1:.2f}. Où est la prochaine zone de rebond ou résistance à 5-15 minutes?"
        _vol_comment    = "Spike de volume = signal fort pour le scalp. Absence de volume = danger. Analyse le volume des dernières bougies."
        _fund_title     = "## 💼 FONDAMENTAUX (résumé rapide)"
        _fund_block     = f"Prochains résultats: {earnings_date} — risque binaire à éviter ou opportunity? Dividende: {dividend_yield}%."
        _analyst_extra  = f"Court circuit: {short_pct_str} du float — court squeeze potentiel?"
        _news_filter    = "Filtre: seulement les news qui impactent les PROCHAINES MINUTES/HEURES. Catalyseur immédiat ou non?"
        _scenario_range = "### ⚪ Scénario range (probabilité X%)\nBornes du range, durée estimée, signal de breakout."
        _risks          = (
            "- Risque n°1: gap d'ouverture ou spread élargi qui déclenche le stop avant l'entrée\n"
            "- Risque n°2: absence de volume = setup nul, ne pas entrer\n"
            "- Risque n°3: annonce macro (CPI, NFP, FOMC) dans la session — vérifier le calendrier économique"
        )
        _action_time    = "5-30 minutes"
    elif _style == "day":
        _rsi_block      = f"RSI à {rsi:.1f} (15min/1h): momentum intraday, signal d'entrée ou sortie dans la session?"
        _stoch_block    = f"Stochastique {stoch_k:.1f}/{stoch_d:.1f} + Williams %R {wr:.1f}: micro-timing d'entrée pour le day trade — confirmation ou divergence?"
        _adx_block      = ""
        _structure_block = f"Range journalier actuel. Niveaux pivot PP ${pp:.2f} / R1 ${r1:.2f} / S1 ${s1:.2f}. Le prix est-il en début ou fin de range journalier?"
        _vol_comment    = "Le volume confirme-t-il la direction intraday? Accumulation ou distribution institutionnelle visible?"
        _fund_title     = "## 💼 FONDAMENTAUX (résumé rapide)"
        _fund_block     = f"Prochains résultats: {earnings_date} — risque binaire à éviter ou opportunity? Dividende: {dividend_yield}%."
        _analyst_extra  = f"Court circuit: {short_pct_str} du float — court squeeze potentiel?"
        _news_filter    = "Filtre: seulement les news qui impactent les PROCHAINES MINUTES/HEURES. Catalyseur immédiat ou non?"
        _scenario_range = "### ⚪ Scénario range (probabilité X%)\nBornes du range, durée estimée, signal de breakout."
        _risks          = (
            "- Risque n°1: gap overnight si position maintenue (éviter)\n"
            "- Risque n°2: renversement de session (London/NY close)\n"
            f"- Risque résultats: {earnings_date}"
        )
        _action_time    = "prochaines heures"
    elif _style == "swing":
        _rsi_block      = f"RSI à {rsi:.1f} (daily): divergence haussière/baissière avec le prix sur plusieurs jours? Pullback en zone de survente ou surachat?"
        _stoch_block    = ""
        _adx_block      = f"ADX {adx:.1f} (DI+{plus_di:.1f}/DI-{minus_di:.1f}): force de tendance — le swing est-il dans un marché tendanciel ou en range?"
        _structure_block = f"EMA20 ${ema20:.2f} / EMA50 {ema50_str}: le prix est-il sur un pullback valide vers ces EMA? Structure de marché HH/HL ou LH/LL?"
        _vol_comment    = "Le volume confirme-t-il la direction intraday? Accumulation ou distribution institutionnelle visible?"
        _fund_title     = "## 💼 FONDAMENTAUX (résumé rapide)"
        _fund_block     = f"Prochains résultats: {earnings_date} — risque binaire à éviter ou opportunity? Dividende: {dividend_yield}%."
        _analyst_extra  = f"Institutionnels {inst_str} — signal de confiance ou de distribution progressive?"
        _news_filter    = "Filtre: seulement les news qui impactent les PROCHAINS JOURS. Signal de momentum ou de changement de tendance?"
        _scenario_range = ""
        _risks          = (
            "- Risque n°1: faux pullback qui ne rebondit pas sur l'EMA\n"
            "- Risque n°2: cassure de support swing sans rebond\n"
            f"- Risque résultats: {earnings_date} durant le swing"
        )
        _action_time    = "1-3 jours"
    else:  # long
        _rsi_block      = f"RSI à {rsi:.1f} (weekly): tendance de fond haussière/baissière? Niveau extrême justifiant une entrée long terme?"
        _stoch_block    = ""
        _adx_block      = ""
        _structure_block = f"SMA200 ${sma200_str}: le titre est-il dans une tendance long terme haussière? {cross_signal}. Fibonacci 52w: niveau actuel {nearest_fib[0]} (${nearest_fib[1]})."
        _vol_comment    = "Volume croissant sur les hausses et décroissant sur les baisses = tendance saine à long terme?"
        _fund_title     = "## 💼 ANALYSE FONDAMENTALE (CRITIQUE pour ce style)"
        _fund_block     = (
            f"P/E {pe} vs secteur {sector}: valorisation juste/excessive/bradée? PEG {peg} — la croissance justifie-t-elle la valorisation? "
            f"Marge {profit_margin}%, ROE {roe}%, FCF {fcf_str}: qualité du business. "
            f"Croissance revenus {revenue_growth}% / BPA {earnings_growth}%. D/E {debt_equity}: solidité du bilan. "
            f"Prochains résultats {earnings_date} — catalyseur positif ou risque binaire?"
        )
        _analyst_extra  = f"Institutionnels {inst_str} — signal de confiance ou de distribution progressive?"
        _news_filter    = "Analyse TOUTES les news: impact sur les perspectives à 3-12 mois. Changement fondamental positif ou négatif?"
        _scenario_range = ""
        _risks          = (
            "- Risque n°1: détérioration fondamentale (révision BPA, marges, concurrence)\n"
            "- Risque n°2: retournement macro (hausse des taux qui pèse sur la valorisation)\n"
            f"- Risque n°3: décote de secteur {sector}"
        )
        _action_time    = "1-2 semaines"

    _target_mean_str = f"${target_mean:.2f}" if isinstance(target_mean, float) else "N/A"

    # ── Style-specific prompts ──────────────────────────────────────────────
    if _style == "scalp":
        prompt = f"""Tu es TDB Senior Analyst — {sm['persona']}.
Profil utilisateur: **{sm['label']}** | Risque: **{rm['label']}**

⚠️ RÈGLE SCALPING: Réponse courte, directe, opérationnelle. Pas de longs discours — l'utilisateur doit pouvoir agir maintenant.

{market_context}

---

## ⚡ SIGNAL DE SCALPING

Donne immédiatement le signal pour {symbol} à ${price:.4f} :
- **Direction** : LONG / SHORT / ATTENDRE (un seul choix clair et justifié)
- **Conviction** : X/10
- **Pourquoi maintenant (2 phrases max)** : quel élément technique déclenche ce signal en ce moment précis ?

## 🎯 SETUP DE PRISE DE POSITION

Donne des niveaux de prix PRÉCIS :
- **Zone d'entrée** : $X.XX – $Y.YY
- **Stop Loss** : $Z.ZZ  ({sm['stop_note']})
- **Objectif TP1** : $A.AA  (ratio {sm['tp_rr']})
- **Objectif TP2** : $B.BB  (si le momentum se maintient)
- **Taille de position** : {sm['size_pct']} du portefeuille
- **Durée du trade** : {sm['horizon_trade']}

## 📊 LECTURE RAPIDE DES INDICATEURS

{_rsi_block}
MACD {macd_val:+.4f} / Signal {sig_val:+.4f} — momentum en faveur ou contre le trade ?
{_stoch_block}
Volume {vol_ratio:.2f}x la moyenne — spike de confirmation ou signal faible ?

## 🗺️ MICRO-NIVEAUX (horizon {_action_time})

- Résistance immédiate : R1 ${r1:.2f}
- Pivot : PP ${pp:.2f}
- Support immédiat : S1 ${s1:.2f}
- Extension : R2 ${r2:.2f} / S2 ${s2:.2f}

## ⚠️ CONDITIONS D'INVALIDATION

Ce setup est ANNULÉ si :
- [condition technique précise qui invalide l'entrée]
- Volume trop faible (pas de spike) = ne pas entrer
- {_news_filter}

{_fund_title}
{_fund_block}

⚠️ *Analyse TDB (Scalping | {rm['label']}) — éducatif uniquement. Pas un conseil financier.*"""

    elif _style == "day":
        prompt = f"""Tu es TDB Senior Analyst — {sm['persona']}.
Profil utilisateur: **{sm['label']}** | Risque: **{rm['label']}**

⚠️ Style Day Trading : combine explication du contexte de séance ET setup opérationnel concret pour la journée.

{market_context}

---

## 📊 CONTEXTE DE SÉANCE

Décris en 4-5 phrases ce qui se passe sur {symbol} aujourd'hui : dynamique depuis l'ouverture, tendance intraday, position par rapport aux niveaux clés et au VWAP, ce que les indicateurs révèlent en ce moment. Donne le contexte complet pour comprendre la séance actuelle.

## 📈 ANALYSE TECHNIQUE INTRADAY

### Oscillateurs & Momentum
{_rsi_block}
MACD {macd_val:+.4f} vs signal {sig_val:+.4f} (histogramme {hist_val:+.4f}) : le momentum intraday est-il en phase d'accélération ou d'essoufflement ? Qu'est-ce que cela implique pour les prochaines heures ?
{_stoch_block}

### Structure journalière
{_structure_block}
Décris le range journalier actuel, les niveaux testés, et comment le prix se comporte dans cette structure. Sommes-nous en début ou fin de range ?

### Volume & Pression directionnelle
Volume {vol_ratio:.2f}x la moyenne. OBV: {obv_trend}.
{_vol_comment}
Qui a le contrôle aujourd'hui — acheteurs ou vendeurs ? La pression est-elle institutionnelle ou du retail ?

## 🎯 SETUP DE TRADE POUR LA SÉANCE

- **Direction** : LONG / SHORT / ATTENDRE
- **Zone d'entrée** : $X.XX – $Y.YY
- **Stop Loss** : $Z.ZZ  ({sm['stop_note']})
- **Objectif TP1** : $A.AA  (ratio {sm['tp_rr']})
- **Objectif TP2** : $B.BB
- **Taille** : {sm['size_pct']} du portefeuille
- **Durée** : {sm['horizon_trade']}

## 🗺️ NIVEAUX CLÉS DE LA SÉANCE

Donne les niveaux importants avec leur signification :
- Résistance principale : $X.XX (explication pourquoi ce niveau est important)
- Pivot PP : ${pp:.2f} — R1 : ${r1:.2f} — R2 : ${r2:.2f}
- Support principal : $X.XX (explication)
- S1 : ${s1:.2f} — S2 : ${s2:.2f}
- Zone de décision immédiate : $X.XX – $X.XX

## 📆 DEUX SCÉNARIOS POUR AUJOURD'HUI

### 🟢 Scénario positif (probabilité X%)
Qu'est-ce qui se passerait si les acheteurs prennent le contrôle ? Niveaux franchis, comportement du prix, cibles intraday.

### 🔴 Scénario négatif (probabilité X%)
Qu'est-ce qui se passerait si les vendeurs dominent ? Supports cassés, invalidation du setup, niveaux de repli.

{_scenario_range}

## ⚠️ RISQUES DE LA SÉANCE
{_risks}

## 📰 ACTUALITÉS DU JOUR
{_news_filter}
Analyse les {len(news_lines)} actualités : y a-t-il un catalyseur qui impacte la séance d'aujourd'hui ?

{_fund_title}
{_fund_block}

## 💡 CONCLUSION
- **Signal** : HAUSSIER / NEUTRE / BAISSIER pour la séance
- **Conviction** : X/10
- **Point critique à surveiller** : quel niveau ou événement décidera de la direction aujourd'hui ?

⚠️ *Analyse TDB (Day Trading | {rm['label']}) — éducatif uniquement. Pas un conseil financier.*"""

    elif _style == "swing":
        prompt = f"""Tu es TDB Senior Analyst — {sm['persona']}.
Profil utilisateur: **{sm['label']}** | Risque: **{rm['label']}**

⚠️ Style Swing : analyse approfondie de L'INTENTION ET LA CONVICTION DU MARCHÉ sur {sm['horizon']}. Pas de micro-signaux 1min — vision 4h/daily sur la volonté des acheteurs et vendeurs.

{market_context}

---

## 📊 SYNTHÈSE ET INTENTION DU MARCHÉ

Décris en 4-5 phrases ce que le marché est en train de faire sur {symbol} : est-il en phase d'accumulation, de distribution, de tendance forte, de consolidation avant breakout ? Qu'est-ce que le graphique "veut" faire sur les prochains jours ? Quel est le récit dominant que l'on peut lire dans la structure du prix ?

## 🧭 LECTURE DE L'INTENTION ET DE LA STRUCTURE

### Ce que les acheteurs et vendeurs font
Analyse la conviction des deux camps : les acheteurs montrent-ils de la force (rebonds sur supports, volumes croissants, Higher Lows) ? Les vendeurs distribuent-ils (réactions violentes sur résistances, volumes de vente, Lower Highs) ? Quel camp a l'avantage structural et pourquoi ?

### Structure de tendance
{_structure_block}
Quelle est la structure de marché visible sur le daily/4h ? (Higher Highs/Higher Lows = tendance haussière, Lower Highs/Lower Lows = tendance baissière). Y a-t-il un retournement en cours ou une continuation de la tendance dominante ?

{_adx_block}

### Momentum et confirmation de l'intention
{_rsi_block}
MACD {macd_val:+.4f} vs signal {sig_val:+.4f} : le momentum confirme-t-il l'intention détectée dans la structure ? Y a-t-il des divergences RSI/prix qui signalent un épuisement ou un retournement imminent ?

### Volume et conviction institutionnelle
Volume {vol_ratio:.2f}x la moyenne. OBV: {obv_trend}.
{_vol_comment}
Les volumes racontent-ils une histoire d'accumulation discrète par les institutionnels, ou de distribution progressive avant une baisse ?

## 🎯 NIVEAUX CLÉS POUR LE SWING

- **Résistance majeure** : $X.XX — pourquoi ce niveau est une barrière (zone de distribution, retracement Fibonacci, ex-support)
- **Résistance secondaire** : $X.XX
- **Prix actuel** : ${price:.4f} — position dans la structure
- **Support de swing** : $X.XX — zone où les acheteurs devraient intervenir (EMA daily, niveau pivot hebdo, retracement Fibonacci)
- **Support critique** : $X.XX — cassure invaliderait la thèse haussière

## 📆 SCÉNARIOS SUR {sm['horizon'].upper()}

### 🟢 Scénario de continuation (probabilité X%)
Décris l'intention haussière de manière narrative : quels signaux confirment la volonté des acheteurs de pousser plus haut ? Quels niveaux seraient franchis, quelle serait la dynamique, jusqu'où pourrait aller le mouvement ?

### 🔴 Scénario de retournement (probabilité X%)
Décris ce qui changerait dans l'intention du marché : quels signaux de faiblesse apparaîtraient ? Comment les vendeurs prendraient le contrôle ? Jusqu'où pourrait aller la correction ?

## ⚠️ RISQUES À MONITORER
{_risks}
- Risque sectoriel : contexte {sector} et impact sur la thèse swing

## 📰 CATALYSEURS ET ACTUALITÉS
{_news_filter}
Analyse les {len(news_lines)} actualités : y a-t-il des événements à venir (résultats, annonces macro) qui pourraient amplifier ou invalider la thèse swing ?

{_fund_title}
{_fund_block}
{_analyst_extra}

## 💡 CONCLUSION ANALYTIQUE
- **Intention dominante** : ACCUMULATION / DISTRIBUTION / TENDANCE FORTE / CONSOLIDATION / INDÉCISION
- **Signal swing** : HAUSSIER FORT / HAUSSIER / NEUTRE / BAISSIER / BAISSIER FORT
- **Conviction** : X/10 — quels 2-3 éléments de preuve justifient cette lecture de l'intention du marché ?
- **Ce que le marché dit** : résume en langage clair ce que font les acheteurs et les vendeurs sur {symbol} en ce moment

⚠️ *Analyse TDB (Swing | {rm['label']}) — éducatif uniquement. Pas un conseil financier.*"""

    else:  # long
        prompt = f"""Tu es TDB Senior Analyst — {sm['persona']}.
Profil utilisateur: **{sm['label']}** | Risque: **{rm['label']}**

⚠️ Style Long Terme : analyse narrative et fondamentale. Focus sur CE QUE L'ACTIF COMPTE FAIRE DANS LE FUTUR — ses projets, sa trajectoire stratégique, ses catalyseurs à 6-18 mois. Pas de micro-niveaux intraday.

{market_context}

---

## 📖 LA TRAJECTOIRE DE {symbol}

Raconte l'histoire de cet actif sur 5-6 phrases : d'où vient-il, où en est-il aujourd'hui en termes de fondamentaux et de dynamique de marché, et surtout — vers où se dirige-t-il ? Quelle est la grande tendance de fond qui guide cet actif sur les prochains mois ? Décris le récit long terme que les investisseurs suivent sur ce titre.

## 🚀 PROJETS, VISION ET CATALYSEURS FUTURS

C'est le cœur de l'analyse long terme. Développe de manière narrative :
- Quels sont les grands projets stratégiques, développements ou transformations en cours ou à venir pour cet actif/entreprise ?
- Y a-t-il des catalyseurs qui pourraient changer la donne dans les 6-18 prochains mois (lancement de produits, expansion géographique, fusions-acquisitions, évolutions réglementaires, cycles macro favorables/défavorables) ?
- Comment le secteur {sector} évolue-t-il et quelle est la position concurrentielle de {symbol} dans cette évolution à long terme ?
- Y a-t-il une thèse d'investissement forte (growth, value, dividende, turnaround) qui justifie une conviction long terme ?

## 💼 ANALYSE FONDAMENTALE APPROFONDIE

{_fund_title}
{_fund_block}

Analyse la qualité intrinsèque du business :
- La valorisation actuelle (P/E {pe}, PEG {peg}) est-elle justifiée par la croissance (revenus {revenue_growth}%, BPA {earnings_growth}%) ?
- Quel est le moat (avantage compétitif durable) de cet actif face à la concurrence ?
- La structure financière (FCF {fcf_str}, D/E {debt_equity}) donne-t-elle la flexibilité nécessaire pour financer la croissance ?
- Y a-t-il des risques structurels sur le modèle économique à long terme ?

## 📊 STRUCTURE TECHNIQUE LONG TERME

{_structure_block}
{_rsi_block}

Décris la tendance de fond sur une vision weekly/monthly : sommes-nous dans une phase d'accumulation institutionnelle, une tendance primaire haussière saine, ou un cycle de distribution qui précède une baisse prolongée ?
Volume {vol_ratio:.2f}x la moyenne : {_vol_comment}

## 🎯 CONSENSUS ANALYSTES ET OBJECTIFS

Recommandation : {rec_key} | Objectif moyen : {_target_mean_str} (potentiel : {upside_str})
{_analyst_extra}
Que révèle ce consensus ? Les analystes révisent-ils leurs cibles à la hausse ou à la baisse ? Y a-t-il un écart significatif entre le prix actuel et les objectifs qui crée une opportunité ?

## 📰 ACTUALITÉS ET IMPACT SUR LA THÈSE LONG TERME
{_news_filter}
Analyse les {len(news_lines)} actualités sous l'angle de l'investisseur long terme : lesquelles ont un impact réel sur la thèse d'investissement ? Y a-t-il des changements fondamentaux positifs ou négatifs visibles dans les news récentes ?

## 📆 VISION À {sm['horizon'].upper()}

### 🟢 Thèse haussière long terme (probabilité X%)
Décris le scénario optimiste de manière narrative : quels projets se concrétisent, quels catalyseurs déclenchent une réévaluation positive, comment la valorisation évolue, quels niveaux pourraient être atteints sur {sm['horizon_trade']} ?

### 🔴 Thèse baissière long terme (probabilité X%)
Décris les risques fondamentaux : quels éléments pourraient dégrader le business, détériorer les marges, provoquer des révisions à la baisse des estimations ? Comment les macro-risques (taux, {sector}, concurrence) pourraient peser durablement ?

## ⚠️ RISQUES LONG TERME
{_risks}

## 💡 CONCLUSION D'INVESTISSEUR
- **Signal long terme** : FORT POTENTIEL / POTENTIEL MODÉRÉ / NEUTRE / À SURVEILLER / RISQUÉ
- **Conviction** : X/10
- **Horizon recommandé** : {sm['horizon_trade']}
- **En résumé** : si tu devais expliquer en 3 phrases pourquoi cet actif mérite (ou non) d'être en portefeuille pour le long terme, que dirais-tu ?

⚠️ *Analyse TDB (Long Terme | {rm['label']}) — éducatif uniquement. Pas un conseil financier.*"""

    # ── 10. Call Groq ───────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 2500
                }
            )

            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Service IA surchargé, réessayez dans quelques secondes.")
            if response.status_code != 200:
                print(f"[AI] quick_analysis Groq error {response.status_code}: {response.text[:300]}")
                raise HTTPException(status_code=502, detail=f"Erreur IA ({response.status_code})")

            data = response.json()
            return {
                "symbol": symbol,
                "analysis": data["choices"][0]["message"]["content"]
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market-news")
@limiter.limit("2/minute")
async def get_market_news(request: Request, current_user: dict = Depends(get_current_user)):
    """Get economic news with AI summary"""
    from config import NEWS_API_KEY

    api_key = get_groq_api_key()

    # Fetch news from NewsAPI.org
    news_items = []
    if NEWS_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://newsapi.org/v2/top-headlines",
                    params={
                        "category": "business",
                        "language": "fr",
                        "pageSize": 20,
                        "apiKey": NEWS_API_KEY,
                    }
                )
                if r.status_code == 200:
                    articles = r.json().get("articles", [])
                    for a in articles:
                        title = a.get("title", "")
                        if not title or title == "[Removed]":
                            continue
                        news_items.append({
                            "title": title,
                            "publisher": a.get("source", {}).get("name", ""),
                            "link": a.get("url", ""),
                            "timestamp": 0,
                            "related": "Marchés"
                        })

                # If no French results, fallback to English financial news
                if not news_items:
                    r = await client.get(
                        "https://newsapi.org/v2/top-headlines",
                        params={
                            "category": "business",
                            "language": "en",
                            "pageSize": 15,
                            "apiKey": NEWS_API_KEY,
                        }
                    )
                    if r.status_code == 200:
                        for a in r.json().get("articles", []):
                            title = a.get("title", "")
                            if not title or title == "[Removed]":
                                continue
                            news_items.append({
                                "title": title,
                                "publisher": a.get("source", {}).get("name", ""),
                                "link": a.get("url", ""),
                                "timestamp": 0,
                                "related": "Markets"
                            })
        except Exception as e:
            print(f"[NEWS] NewsAPI error: {e}")

    news_items = news_items[:12]

    # Generate AI summary
    summary = None
    summary_points = None
    if api_key:
        if news_items:
            news_text = "\n".join([f"- {item['title']} (Source: {item['publisher']})" for item in news_items[:10]])
            ai_prompt = f"Voici les dernieres actualites economiques et financieres:\n\n{news_text}\n\nFais un resume en 3-4 points cles des tendances importantes pour les marches financiers aujourd'hui."
        else:
            ai_prompt = "Donne un apercu general des marches financiers mondiaux en 3-4 points cles, incluant les tendances recentes des indices, crypto et matieres premieres."

        structured_system = (
            "Tu es un analyste financier senior. Reponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans backticks, sans texte avant ou apres. "
            "Format strict: [{\"title\": \"Titre court\", \"text\": \"Explication concise sans asterisques ni markdown.\", "
            "\"assets\": [{\"name\": \"Nom affiche\", \"symbol\": \"TICKER_YAHOO\"}]}]. "
            "3 a 4 elements. Inclure dans 'assets' les actifs concretement mentionnes avec leur ticker Yahoo Finance exact (ex: NVDA, TSLA, BTC-USD, GC=F, AIR.PA). "
            "Reponds en francais. Sois factuel et precis."
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": MODEL,
                        "messages": [
                            {"role": "system", "content": structured_system},
                            {"role": "user", "content": ai_prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 700
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    raw = data["choices"][0]["message"]["content"].strip()
                    # Try to parse as structured JSON
                    try:
                        import json as _json
                        parsed = _json.loads(raw)
                        if isinstance(parsed, list):
                            summary_points = parsed
                        else:
                            summary = raw
                    except Exception:
                        summary = raw
                else:
                    print(f"[NEWS] AI API error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[NEWS] Error generating summary: {e}")

    return {
        "news": news_items,
        "summary": summary,
        "summary_points": summary_points,
        "generated_at": datetime.utcnow().isoformat()
    }


# ─────────────────────────────────────────────────────────────────────────────
#  SESSION NARRATIVE — Premium AI summary of a market session
# ─────────────────────────────────────────────────────────────────────────────

class SessionPerformer(BaseModel):
    symbol: str
    name: str
    change: float

class SessionNarrativeRequest(BaseModel):
    session_name: str       # "Séance Européenne"
    session_id: str         # "europe" | "us" | "asia" | "crypto"
    mood: str               # "bullish" | "bearish" | "neutral"
    avg_change: float
    positive_ratio: float   # 0.0 to 1.0
    top_performers: List[SessionPerformer]
    flop_performers: List[SessionPerformer]
    is_live: bool


@router.post("/session-narrative")
@limiter.limit("10/minute")
async def get_session_narrative(
    request: Request,
    body: SessionNarrativeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate an AI narrative summary of a market session (Premium only)"""

    if not await is_user_premium(current_user):
        raise HTTPException(
            status_code=403,
            detail="Cette fonctionnalité nécessite un abonnement Premium"
        )

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Service IA temporairement indisponible")

    # Build context
    top_str = ", ".join(
        f"{p.name} ({'+' if p.change >= 0 else ''}{p.change:.2f}%)"
        for p in body.top_performers[:5]
    ) or "aucune donnée"

    flop_str = ", ".join(
        f"{p.name} ({p.change:.2f}%)"
        for p in body.flop_performers[:5]
    ) or "aucune baisse notable"

    mood_fr = {"bullish": "haussier", "bearish": "baissier", "neutral": "neutre"}.get(body.mood, body.mood)
    status_str = "en cours" if body.is_live else "clôturée"
    date_str = datetime.utcnow().strftime("%A %d %B %Y")

    prompt = f"""Tu es un analyste de marché expert. Rédige un résumé narratif concis et professionnel de la séance boursière suivante.

DONNÉES DE SÉANCE ({date_str}) :
- Séance : {body.session_name} ({status_str})
- Sentiment : {mood_fr} ({'+' if body.avg_change >= 0 else ''}{body.avg_change:.2f}% de variation moyenne)
- {round(body.positive_ratio * 100)}% des actifs en hausse
- Top performers : {top_str}
- Flop du jour : {flop_str}

INSTRUCTIONS :
- Rédige 3 à 5 phrases fluides et naturelles, comme un analyste professionnel
- Explique POURQUOI les actifs leaders ont performé (contexte sectoriel, macro, catalyseurs probables)
- Mentionne le sentiment général et ce que ça signifie pour les traders
- Si la séance est en cours, utilise le présent ; si elle est clôturée, utilise le passé
- Sois précis sur les chiffres sans être trop technique
- Pas de bullets, pas de titres — du texte narratif fluide
- Termine par une observation sur ce qu'il faut surveiller
- Maximum 120 mots
- En français uniquement"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": "Tu es un analyste de marché. Réponds uniquement en français, en texte narratif fluide, sans titre ni bullet points."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.6,
                    "max_tokens": 250,
                },
            )

            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Service IA surchargé, réessayez dans quelques secondes.")
            if response.status_code == 401:
                raise HTTPException(status_code=503, detail="Clé API IA invalide.")
            if response.status_code != 200:
                print(f"[SESSION NARRATIVE] Groq error {response.status_code}: {response.text[:300]}")
                raise HTTPException(status_code=502, detail=f"Erreur IA ({response.status_code})")

            data = response.json()
            narrative = data["choices"][0]["message"]["content"].strip()

        return {
            "narrative": narrative,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="L'IA a mis trop de temps à répondre, réessayez.")
    except Exception as e:
        print(f"[SESSION NARRATIVE] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail="Impossible de générer le résumé IA")
