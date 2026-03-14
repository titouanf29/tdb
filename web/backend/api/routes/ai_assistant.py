"""
AI Assistant routes - Chat with Groq (Llama)
"""
import os
import httpx
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user
from .premium import is_user_premium, get_user_limits

router = APIRouter()

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
async def chat_with_assistant(
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
    limit: int = 50,
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
async def quick_analysis(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a detailed AI analysis for a symbol"""
    import yfinance as yf
    import numpy as np

    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI Assistant not configured"
        )

    # Get comprehensive market data
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="3mo")

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

        market_context = f"""
=== ANALYSE DETAILLEE: {symbol} ===

INFORMATIONS GENERALES:
- Nom: {info.get('shortName', symbol)}
- Secteur: {info.get('sector', 'N/A')}
- Industrie: {info.get('industry', 'N/A')}
- Capitalisation: ${info.get('marketCap', 0):,.0f}

PRIX ET PERFORMANCE:
- Prix actuel: ${current_price:.2f}
- Variation 24h: {change_1d:+.2f}%
- Variation 1 semaine: {change_1w:+.2f}%
- Variation 1 mois: {change_1m:+.2f}%
- Plus haut 52 sem: ${info.get('fiftyTwoWeekHigh', 0):.2f}
- Plus bas 52 sem: ${info.get('fiftyTwoWeekLow', 0):.2f}

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
- P/E Ratio: {info.get('trailingPE', 'N/A')}
- Forward P/E: {info.get('forwardPE', 'N/A')}
- Dividend Yield: {info.get('dividendYield', 0) * 100 if info.get('dividendYield') else 0:.2f}%
- Beta: {info.get('beta', 'N/A')}
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
async def get_market_news(current_user: dict = Depends(get_current_user)):
    """Get economic news with AI summary"""
    import yfinance as yf

    api_key = get_groq_api_key()

    # Fetch news from major indices and popular stocks
    news_items = []
    symbols = ["^GSPC", "^DJI", "^IXIC", "GC=F", "CL=F", "BTC-USD", "AAPL", "MSFT", "NVDA", "TSLA"]
    symbol_names = {
        "^GSPC": "S&P 500",
        "^DJI": "Dow Jones",
        "^IXIC": "NASDAQ",
        "GC=F": "Or",
        "CL=F": "Petrole",
        "BTC-USD": "Bitcoin",
        "AAPL": "Apple",
        "MSFT": "Microsoft",
        "NVDA": "Nvidia",
        "TSLA": "Tesla"
    }

    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            # Try different methods to get news
            news = []
            if hasattr(ticker, 'news') and ticker.news:
                news = ticker.news[:3]

            for item in news:
                content = item.get("content") or {}
                provider = content.get("provider") or {}

                title = item.get("title") or content.get("title") or ""
                if not title:
                    continue

                publisher = (
                    item.get("publisher")
                    or provider.get("displayName")
                    or "Yahoo Finance"
                )

                link = item.get("link") or content.get("url") or ""
                if isinstance(link, dict):
                    link = link.get("url", "")

                timestamp = item.get("providerPublishTime") or 0
                if not timestamp:
                    from datetime import datetime
                    pub_date_str = item.get("pubDate") or content.get("pubDate") or ""
                    if pub_date_str:
                        try:
                            dt = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
                            timestamp = int(dt.timestamp())
                        except Exception:
                            timestamp = 0

                news_items.append({
                    "title": title,
                    "publisher": publisher,
                    "link": link,
                    "timestamp": timestamp,
                    "related": symbol_names.get(symbol, symbol)
                })
        except Exception as e:
            print(f"[NEWS] Error fetching news for {symbol}: {e}")
            continue

    # Remove duplicates by title
    seen_titles = set()
    unique_news = []
    for item in news_items:
        if item["title"] not in seen_titles:
            seen_titles.add(item["title"])
            unique_news.append(item)
    news_items = unique_news

    # Sort by timestamp and get latest 12
    news_items.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    news_items = news_items[:12]

    # Translate titles to French
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source="auto", target="fr")
        for item in news_items:
            if item.get("title"):
                try:
                    item["title"] = translator.translate(item["title"]) or item["title"]
                except Exception:
                    pass
    except Exception:
        pass

    # Generate AI summary
    summary = None
    if api_key:
        # Build context for AI - either from news or market data
        if news_items:
            news_text = "\n".join([f"- {item['title']} (Source: {item['publisher']}, Marche: {item['related']})" for item in news_items[:10]])
            ai_prompt = f"Voici les dernieres actualites economiques et financieres:\n\n{news_text}\n\nFais un resume en 3-4 points cles des tendances importantes pour les marches financiers aujourd'hui."
        else:
            # No news available, get market data instead
            market_summary = []
            for symbol in ["^GSPC", "^DJI", "BTC-USD", "GC=F"]:
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period="2d")
                    if len(hist) >= 2:
                        current = hist['Close'].iloc[-1]
                        prev = hist['Close'].iloc[-2]
                        change = ((current - prev) / prev) * 100
                        market_summary.append(f"- {symbol_names.get(symbol, symbol)}: {change:+.2f}%")
                except:
                    continue

            if market_summary:
                ai_prompt = f"Voici les mouvements des marches aujourd'hui:\n\n" + "\n".join(market_summary) + "\n\nAnalyse ces mouvements et donne un resume de la situation des marches en 3-4 points cles."
            else:
                ai_prompt = "Donne un apercu general des marches financiers mondiaux en 3-4 points cles, incluant les tendances recentes des indices, crypto et matieres premieres."

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
                            {"role": "system", "content": "Tu es un analyste financier senior. Resume les informations de marche de maniere concise et actionnable pour les traders. Reponds en francais. Sois factuel et precis."},
                            {"role": "user", "content": ai_prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 600
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    summary = data["choices"][0]["message"]["content"]
                else:
                    print(f"[NEWS] AI API error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[NEWS] Error generating summary: {e}")
            summary = None

    return {
        "news": news_items,
        "summary": summary or "Impossible de generer le resume. Verifiez la configuration de l'API.",
        "generated_at": datetime.utcnow().isoformat()
    }
