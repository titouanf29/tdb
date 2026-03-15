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
SYSTEM_PROMPT = """Tu es TDB Assistant, un expert en trading et marchés financiers.
Tu aides les utilisateurs à comprendre les concepts de trading, l'analyse technique,
et tu peux donner des conseils éducatifs sur les marchés.

Règles importantes:
- Ne jamais donner de conseils financiers personnalisés
- Toujours rappeler que le trading comporte des risques
- Expliquer les concepts de manière simple et accessible
- Utiliser des exemples concrets quand c'est pertinent
- Répondre en français
- Être concis mais complet

Tu as accès aux marchés: Actions (USA, Europe, Asie), Crypto, Matières premières, Or.
Tu peux expliquer les indicateurs techniques: RSI, MACD, EMA, Bollinger, ATR, VWAP, etc.
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
        if len(v) > 1000:
            raise ValueError("Message trop long (max 1000 caractères)")
        return v

    @field_validator("context")
    @classmethod
    def context_max_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 2000:
            raise ValueError("Contexte trop long (max 2000 caractères)")
        return v


class ChatResponse(BaseModel):
    response: str
    usage: Optional[dict] = None


def get_user_id(user: dict) -> int:
    """Get user ID for web users"""
    return user.get("id")


async def get_user_messages_today(user_id: int) -> int:
    """Count messages sent by user today"""
    result = await execute_query(
        """SELECT COUNT(*) as count FROM web_ai_chat
           WHERE user_id = ? AND role = 'user'
           AND DATE(created_at) = DATE('now')""",
        (user_id,)
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
    http_request: Request,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to the AI assistant"""
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
    if request.context:
        messages.append({
            "role": "system",
            "content": f"Contexte actuel du marché:\n{request.context}"
        })

    # Add conversation history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add new user message
    messages.append({"role": "user", "content": request.message})

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
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024
                }
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"AI API error: {response.text}"
                )

            data = response.json()
            assistant_message = data["choices"][0]["message"]["content"]

            # Save messages to history
            now = datetime.utcnow().isoformat()
            await execute_write(
                """INSERT INTO web_ai_chat (user_id, role, content, created_at)
                   VALUES (?, 'user', ?, ?)""",
                (user_id, request.message, now)
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

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
- SMA 50: ${sma_50:.2f if sma_50 else 'N/A'}
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
