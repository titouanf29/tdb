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
MODEL = "llama-3.3-70b-versatile"

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
    current_user: dict = Depends(get_current_user)
):
    """Premium AI analysis — fetches full market, technical, fundamental and news data."""
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

    # ── 9. Premium prompt ───────────────────────────────────────────────────
    prompt = f"""Tu es TDB Senior Analyst, l'analyste financier le plus rigoureux de la plateforme premium TDB. Ton analyse doit être IRRÉPROCHABLE, ultra-précise et apporter une réelle valeur ajoutée — l'utilisateur paye pour cette analyse.

RÈGLE D'OR: Utilise CHAQUE chiffre fourni dans les données. Une analyse vague = analyse nulle.

{market_context}

---

Génère maintenant l'analyse complète en suivant EXACTEMENT cette structure:

## 📊 SYNTHÈSE EXÉCUTIVE
4 à 5 phrases percutantes: prix exact, performance récente dans son contexte, conviction globale sur la tendance (les indicateurs convergent-ils?), positionnement du titre dans son cycle (tendance primaire/secondaire), verdict immédiat pour un trader. Mentionne si le titre est proche d'un niveau Fibonacci clé.

## 📈 ANALYSE TECHNIQUE COMPLÈTE

### Momentum & Oscillateurs
RSI à {rsi:.1f}: explique précisément ce niveau (pas juste "neutre"). Divergence haussière ou baissière détectable avec le prix? Zone d'extrême (< 30 ou > 70)?
MACD ({macd_val:+.4f} vs signal {sig_val:+.4f}, histogramme {hist_val:+.4f}): histogramme en expansion ou contraction? Croisement récent ou imminent? Force du momentum.
Stochastique %K/{stoch_k:.1f} %D/{stoch_d:.1f}: signal de sur-achat/survente, croisement récent?
Williams %R à {wr:.1f}: confirmation ou divergence avec RSI/Stochastique?

### Tendance & Structure
EMA20/50/200 — structure complète de tendance: le titre est-il en phase haussière confirmée ou en correction?
{cross_signal} — implications concrètes pour les positionnements long terme.
Structure 20 sessions: {trend_structure}. Analyse des plus hauts/bas récents.
ADX {adx:.1f} (DI+{plus_di:.1f}/DI-{minus_di:.1f}): force de tendance et direction dominante.

### Volatilité & Volume
Bollinger %B {bb_pct:.1f}% (width {bb_width:.1f}%): risque de squeeze? Expansion imminente?
ATR ${atr:.4f}: calibration des stops. Stop ATR×1.5 = ${price - 1.5*atr:.2f}, ATR×2 = ${price - 2*atr:.2f}
Volume {vol_ratio:.2f}x la moyenne + OBV {obv_trend}: le volume confirme-t-il la tendance? Signal institutionnel?

## 📍 NIVEAUX CLÉS ET ZONES STRATÉGIQUES

### Points Pivot (classiques)
R3: ${r3:.2f} | R2: ${r2:.2f} | R1: ${r1:.2f} | PP: ${pp:.2f} | S1: ${s1:.2f} | S2: ${s2:.2f} | S3: ${s3:.2f}
Explique quel niveau est le plus pertinent à surveiller aujourd'hui et pourquoi.

### Fibonacci 52 semaines
Le prix est actuellement proche du niveau {nearest_fib[0]} (${nearest_fib[1]}).
Quels niveaux Fibonacci servent de support/résistance dynamiques? Probabilité de réaction?

### Zones de liquidité
Où se concentrent probablement les stops et ordres institutionnels? Quels niveaux sont des "zones de chasse"?

## 💼 ANALYSE FONDAMENTALE

Valorisation: P/E {pe} vs secteur {sector} (sous/surévalué?), Forward P/E {forward_pe}, PEG {peg} (< 1 = potentiellement sous-évalué), EV/EBITDA {ev_ebitda}.
Qualité: marge {profit_margin}%, ROE {roe}%, FCF {fcf_str}. La société génère-t-elle vraiment de la valeur?
Croissance: revenus +{revenue_growth}%, BPA +{earnings_growth}%. Croissance cohérente avec la valorisation?
Endettement: D/E {debt_equity}. Risque financier?
Catalyseur dividende: {dividend_yield}% — attractif pour les income investors?
Prochains résultats: {earnings_date} — événement binaire à anticiper.

## 🎯 CONSENSUS ANALYSTES ET POSITIONNEMENT

Recommandation: {rec_key} — détaille ce que cela signifie.
Objectif consensus ${f'{target_mean:.2f}' if isinstance(target_mean, float) else 'N/A'} (+{upside_str} de potentiel): objectif réaliste ou trop optimiste?
Vente à découvert: {short_pct_str} du float — signal d'alerte ou "short squeeze" potentiel?
Institutionnels à {inst_str}: signal de confiance ou de distribution?

## 📰 IMPACT DES ACTUALITÉS
Analyse les {len(news_lines)} dernières actualités récupérées. Quel est leur impact probable sur le cours? Sentiment global positif, négatif ou neutre?

## 📆 SCÉNARIOS DE MARCHÉ

### 🟢 Scénario haussier (probabilité X%)
Conditions exactes (quel indicateur, quel niveau), catalyseurs (fondamentaux, actualités), objectifs précis T1/T2/T3, niveau d'invalidation.

### 🔴 Scénario baissier (probabilité X%)
Déclencheurs précis (quel support casse, quel signal), objectifs de prix à la baisse, risque majeur à surveiller, niveau d'invalidation.

### ⚪ Scénario de consolidation (probabilité X%)
Range probable, durée estimée, signal de sortie.

## 🎯 STRATÉGIE DE TRADING PRÉCISE
- **Signal**: ACHAT FORT / ACHAT / NEUTRE / VENTE / VENTE FORTE — avec justification en 1 phrase
- **Zone d'entrée optimale**: $X.XX – $X.XX (justification technique)
- **Stop-loss**: $X.XX (sous quel support/niveau? Ratio ATR utilisé?)
- **Take-profit T1**: $X.XX → R/R 1:X
- **Take-profit T2**: $X.XX → R/R 1:X
- **Take-profit T3**: $X.XX → R/R 1:X
- **Taille de position suggérée**: X% du portefeuille (basé sur le risque et la volatilité)
- **Horizon**: X semaines/mois avec point de revue intermédiaire

## ⚠️ RISQUES SPÉCIFIQUES À SURVEILLER
- Risque technique n°1: quel niveau NE DOIT PAS casser et pourquoi?
- Risque résultats: impact potentiel de la date {earnings_date} sur le cours
- Risque sectoriel: tendances {sector} qui pourraient impacter négativement
- Risque macro: inflation, taux, géopolitique — impact spécifique sur ce titre
- Risque short squeeze / squeeze institutionnel

## 💡 VERDICT FINAL
- **Conviction**: X/10 — justification précise (quels signaux convergent, lesquels divergent?)
- **Signal prioritaire à surveiller dans les 24-48h**: exactement quoi observer
- **Avantage informationnel**: qu'est-ce que cette analyse révèle que le marché n'a peut-être pas encore intégré?

⚠️ *Analyse TDB Premium — éducative uniquement, pas un conseil financier personnalisé.*"""

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
                    "max_tokens": 4000
                }
            )

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
