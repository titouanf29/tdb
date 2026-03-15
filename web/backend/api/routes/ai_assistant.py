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
    """Get a detailed AI analysis for a symbol"""
    if not _SYMBOL_RE.match(symbol.upper()):
        raise HTTPException(status_code=400, detail="Symbole invalide")
    symbol = symbol.upper()
    import numpy as np
    from ._prices import fetch_ohlcv

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI Assistant not configured"
        )

    # Get comprehensive market data
    try:
        hist = await fetch_ohlcv(symbol, period="3mo", interval="1d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")

        current_price = hist['Close'].iloc[-1]
        prev_price = hist['Close'].iloc[-2]
        change_1d = ((current_price - prev_price) / prev_price) * 100

        # Calculate additional metrics
        change_1w = ((current_price - hist['Close'].iloc[-5]) / hist['Close'].iloc[-5]) * 100 if len(hist) >= 5 else 0
        change_1m = ((current_price - hist['Close'].iloc[-22]) / hist['Close'].iloc[-22]) * 100 if len(hist) >= 22 else 0

        # RSI calculation
        delta = hist['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs.iloc[-1])) if loss.iloc[-1] != 0 else 50

        # Moving averages
        sma_20 = hist['Close'].rolling(window=20).mean().iloc[-1]
        sma_50 = hist['Close'].rolling(window=50).mean().iloc[-1] if len(hist) >= 50 else None

        # Volatility
        volatility = hist['Close'].pct_change().std() * np.sqrt(252) * 100

        # Volume analysis
        avg_volume = hist['Volume'].mean()
        current_volume = hist['Volume'].iloc[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

        high_52w = float(hist['High'].max())
        low_52w = float(hist['Low'].min())

        market_context = f"""
=== ANALYSE DETAILLEE: {symbol} ===

INFORMATIONS GENERALES:
- Symbole: {symbol}

PRIX ET PERFORMANCE:
- Prix actuel: ${current_price:.2f}
- Variation 24h: {change_1d:+.2f}%
- Variation 1 semaine: {change_1w:+.2f}%
- Variation 1 mois: {change_1m:+.2f}%
- Plus haut 3 mois: ${high_52w:.2f}
- Plus bas 3 mois: ${low_52w:.2f}

INDICATEURS TECHNIQUES:
- RSI (14): {rsi:.1f} {'(Suracheté)' if rsi > 70 else '(Survendu)' if rsi < 30 else '(Neutre)'}
- SMA 20: ${sma_20:.2f} {'(Prix au-dessus)' if current_price > sma_20 else '(Prix en-dessous)'}
- SMA 50: {f'${sma_50:.2f}' if sma_50 is not None else 'N/A'}
- Volatilité annualisée: {volatility:.1f}%

VOLUME:
- Volume actuel: {current_volume:,.0f}
- Volume moyen: {avg_volume:,.0f}
- Ratio volume: {volume_ratio:.2f}x {'(Volume élevé)' if volume_ratio > 1.5 else '(Volume faible)' if volume_ratio < 0.5 else ''}

FONDAMENTAUX:
- P/E Ratio: N/A
- Forward P/E: N/A
- Dividend Yield: N/A
- Beta: N/A
"""
    except Exception as e:
        market_context = f"Symbole: {symbol} - Données partiellement disponibles"

    prompt = f"""Tu es un analyste financier senior avec 20 ans d'experience. Fournis une analyse COMPLETE et DETAILLEE de cet actif:

## 1. SYNTHESE EXECUTIVE (3-4 phrases)
Resume la situation actuelle, le contexte de marche et les enjeux cles pour cet actif.

## 2. ANALYSE TECHNIQUE APPROFONDIE
- **Tendance principale**: Haussiere/Baissiere/Neutre avec justification detaillee
- **Structure de prix**: Analyse des plus hauts/plus bas recents, patterns identifies
- **Moyennes mobiles**: Position du prix par rapport aux EMA 20/50/200, croisements significatifs
- **RSI**: Interpretation detaillee (survente <30, surachat >70, divergences potentielles)
- **MACD**: Signal actuel, croisements recents, force de la tendance
- **Bandes de Bollinger**: Position du prix, squeeze potentiel, volatilite
- **Volume**: Confirmation ou divergence avec le prix

## 3. NIVEAUX CLES A SURVEILLER
- **Resistances**: 3 niveaux avec importance (R1, R2, R3)
- **Supports**: 3 niveaux avec importance (S1, S2, S3)
- **Zones de liquidite**: Ou se concentrent les ordres

## 4. SCENARIOS DE MARCHE
### Scenario haussier (probabilite X%)
- Catalyseurs, objectifs, invalidation
### Scenario baissier (probabilite X%)
- Catalyseurs, objectifs, invalidation

## 5. ANALYSE DES RISQUES
- Risques techniques (gaps, divergences)
- Risques fondamentaux (resultats, secteur)
- Risques macro (taux, geopolitique)
- Volatilite attendue

## 6. STRATEGIE DE TRADING RECOMMANDEE
- **Point d'entree optimal**: Prix et conditions
- **Stop-loss**: Niveau et justification
- **Take-profit**: Objectifs T1, T2, T3
- **Ratio risque/reward**: Calcul precis
- **Taille de position suggere**: % du portefeuille

## 7. VERDICT FINAL
- **Recommandation**: ACHAT FORT / ACHAT / NEUTRE / VENTE / VENTE FORTE
- **Horizon temporel**: Court/Moyen/Long terme
- **Niveau de confiance**: 1-10 avec justification
- **Action immediate**: Ce que le trader doit faire maintenant

Donnees de marche:
{market_context}

Sois precis, factuel et professionnel. Utilise des emojis pour rendre l'analyse plus lisible."""

    # Call AI
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.5,
                    "max_tokens": 3000
                }
            )

            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="AI error")

            data = response.json()
            return {
                "symbol": symbol,
                "analysis": data["choices"][0]["message"]["content"]
            }

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
