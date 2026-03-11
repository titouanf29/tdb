"""
AI Assistant routes - Chat with Groq/Llama
"""
import os
import httpx
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-70b-versatile"

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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to the AI assistant"""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI Assistant not configured. Please set GROQ_API_KEY."
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
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
    """Get a quick AI analysis for a symbol"""
    import yfinance as yf

    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI Assistant not configured"
        )

    # Get market data
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="5d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Symbol not found")

        current_price = hist['Close'].iloc[-1]
        prev_price = hist['Close'].iloc[-2]
        change = ((current_price - prev_price) / prev_price) * 100

        market_context = f"""
Symbole: {symbol}
Nom: {info.get('shortName', symbol)}
Prix actuel: ${current_price:.2f}
Variation 24h: {change:+.2f}%
Volume: {hist['Volume'].iloc[-1]:,.0f}
Plus haut 52 sem: ${info.get('fiftyTwoWeekHigh', 'N/A')}
Plus bas 52 sem: ${info.get('fiftyTwoWeekLow', 'N/A')}
"""
    except Exception as e:
        market_context = f"Symbole: {symbol} - Données non disponibles"

    prompt = f"Donne-moi une analyse rapide (3-4 phrases) de {symbol} basée sur ces données:\n{market_context}"

    # Call AI
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.5,
                    "max_tokens": 300
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
