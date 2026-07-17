"""
Intention du jour — the user states what they want from today's session,
the AI answers short and actionable, and the app points at the right tool.

Kept deliberately simple and extensible:
- one intent per user per day, stored (history enables future follow-ups,
  evening debriefs, weekly recaps)
- the AI reply is plain short text; the action buttons are computed
  server-side from the intent by deterministic keyword mapping, so they
  always point at real app pages even if the model rambles
"""
import json
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write
from .auth import get_current_user
from .ai_assistant import get_groq_api_key, _call_mistral, GROQ_API_URL, MODEL
from ._scoring import compute_score
from ._prices import fetch_ohlcv

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_INTENTS_PER_DAY = 3  # refinements allowed, but bounded (API cost control)

SYSTEM_PROMPT = """Tu es le copilote de trading de CaptenTDB, une plateforme éducative de paper trading (argent 100% virtuel).
L'utilisateur vient de te donner son intention pour aujourd'hui.

Règles STRICTES de réponse :
- 3 à 5 phrases MAXIMUM, en français simple, sans jargon inutile
- Concret et actionnable : dis-lui PAR QUOI commencer sur la plateforme
- Si l'intention mentionne de l'argent réel, rappelle en une phrase que CaptenTDB est un simulateur (wallet virtuel) et que c'est justement l'endroit pour tester sans risque
- Si l'intention implique un style (scalping/day trading/swing), adapte le conseil au style et à son niveau
- Ne donne JAMAIS de conseil d'investissement réel ni de prédiction certaine — tu aides à structurer une session d'entraînement
- Pas de listes à puces, pas de titres : un court paragraphe direct"""

# Deterministic intent → app action mapping. The model text can ramble;
# these buttons always land somewhere real.
ACTION_RULES: list[tuple[tuple[str, ...], dict]] = [
    (("scan", "setup", "opportunit", "chercher", "trouve"), {"label": "Lancer le Scanner", "href": "/scanner"}),
    (("day trading", "daytrading", "intraday", "scalp"), {"label": "Lancer le Scanner", "href": "/scanner"}),
    (("analys", "actif", "btc", "bitcoin", "eth", "action ", "crypto", "or ", "gold", "forex"), {"label": "Analyser un actif", "href": "/analysis"}),
    (("semaine", "swing", "long terme", "prochain"), {"label": "Préparation de la semaine", "href": "/dashboard"}),
    (("appren", "comprend", "formation", "cours", "leçon", "debut", "début"), {"label": "Ouvrir la Formation", "href": "/learn"}),
    (("test", "essayer", "virtuel", "eur", "€", "euro", "position"), {"label": "Trader en virtuel", "href": "/trading"}),
    (("journal", "debrief", "débrief", "bilan"), {"label": "Ouvrir le Journal", "href": "/journal"}),
]
DEFAULT_ACTIONS = [
    {"label": "Analyser un actif", "href": "/analysis"},
    {"label": "Lancer le Scanner", "href": "/scanner"},
]


def suggest_actions(intent: str) -> list[dict]:
    low = intent.lower()
    out: list[dict] = []
    for keywords, action in ACTION_RULES:
        if any(k in low for k in keywords) and action not in out:
            out.append(action)
        if len(out) >= 3:
            break
    return out or list(DEFAULT_ACTIONS)


# ── Promising assets — scored live by the real engine ─────────────────────────
# Small curated universe per market: bounded cost (fetch_ohlcv has a 90s TTL
# cache), always-real symbols, and the same score the analysis page shows.
ASSET_CANDIDATES: dict[str, list[tuple[str, str]]] = {
    "crypto": [("BTC-USD", "Bitcoin"), ("ETH-USD", "Ethereum"), ("SOL-USD", "Solana"), ("BNB-USD", "BNB")],
    "usa": [("AAPL", "Apple"), ("NVDA", "Nvidia"), ("MSFT", "Microsoft"), ("TSLA", "Tesla"), ("AMZN", "Amazon")],
    "forex": [("EURUSD=X", "EUR/USD"), ("GBPUSD=X", "GBP/USD"), ("USDJPY=X", "USD/JPY")],
    "commodities": [("GC=F", "Or"), ("SI=F", "Argent"), ("CL=F", "Pétrole WTI")],
}


def detect_market(intent: str) -> str:
    low = intent.lower()
    if any(k in low for k in ("crypto", "btc", "bitcoin", "eth", "sol ", "altcoin")):
        return "crypto"
    if any(k in low for k in ("forex", "eur/usd", "devise", "paire")):
        return "forex"
    if any(k in low for k in ("or ", "gold", "argent", "pétrole", "petrole", "matière", "matiere")):
        return "commodities"
    if any(k in low for k in ("action", "bourse", "nasdaq", "sp500", "s&p", "us ", "américain", "americain")):
        return "usa"
    # Day trading / scalping without a market → crypto (open 24/7, always tradable)
    if any(k in low for k in ("day trading", "daytrading", "scalp", "intraday", "aujourd")):
        return "crypto"
    return "usa"


def _signal_label(score: int) -> str:
    if score >= 75: return "STRONG BUY"
    if score >= 60: return "BUY"
    if score >= 40: return "HOLD"
    if score >= 25: return "SELL"
    return "STRONG SELL"


async def pick_assets(intent: str, max_assets: int = 2) -> list[dict]:
    """Score the curated candidates with the production engine, keep the best."""
    market = detect_market(intent)
    scored: list[dict] = []
    for sym, name in ASSET_CANDIDATES.get(market, [])[:5]:
        try:
            hist = await fetch_ohlcv(sym, period="6mo", interval="1d")
            if hist is None or hist.empty or len(hist) < 60:
                continue
            s = compute_score(hist["High"], hist["Low"], hist["Close"], hist["Volume"])
            score = int(s["final_score"])
            scored.append({
                "symbol": sym,
                "name": name,
                "score": score,
                "signal": _signal_label(score),
                "href": f"/analysis?symbol={sym}",
            })
        except Exception:
            continue
    scored.sort(key=lambda a: -a["score"])
    return scored[:max_assets]


async def _ensure_table() -> None:
    await execute_write(
        """CREATE TABLE IF NOT EXISTS daily_intents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            intent TEXT NOT NULL,
            response TEXT NOT NULL,
            suggestions TEXT NOT NULL DEFAULT '[]',
            assets TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL
        )""",
        (),
    )


async def _generate_response(messages: list) -> str:
    """Isolated so tests (and future providers) can swap the generator."""
    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI non configurée (GROQ_API_KEY)")
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": messages, "temperature": 0.6, "max_tokens": 300},
        )
        if resp.status_code == 429:
            return await _call_mistral(messages, client)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Erreur IA ({resp.status_code})")
        return resp.json()["choices"][0]["message"]["content"]


class IntentRequest(BaseModel):
    intent: str

    @field_validator("intent")
    @classmethod
    def intent_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Décrivez votre intention en quelques mots")
        if len(v) > 500:
            raise ValueError("Intention trop longue (500 caractères max)")
        return v


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


@router.get("/daily-intent")
async def get_daily_intent(current_user: dict = Depends(get_current_user)):
    await _ensure_table()
    rows = await execute_query(
        "SELECT intent, response, suggestions, assets, created_at FROM daily_intents WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1",
        (current_user["id"], _today()),
    )
    count_rows = await execute_query(
        "SELECT COUNT(*) as n FROM daily_intents WHERE user_id = ? AND date = ?",
        (current_user["id"], _today()),
    )
    used = int(count_rows[0]["n"]) if count_rows else 0
    if not rows:
        return {"intent": None, "response": None, "suggestions": [], "assets": [], "remaining": MAX_INTENTS_PER_DAY - used}
    r = rows[0]
    def _load(col):
        try:
            return json.loads(r[col])
        except Exception:
            return []
    return {
        "intent": r["intent"],
        "response": r["response"],
        "suggestions": _load("suggestions"),
        "assets": _load("assets"),
        "remaining": max(0, MAX_INTENTS_PER_DAY - used),
    }


@router.post("/daily-intent")
@limiter.limit("3/minute")
async def set_daily_intent(
    request: Request,
    body: IntentRequest,
    current_user: dict = Depends(get_current_user),
):
    await _ensure_table()
    user_id = current_user["id"]
    today = _today()

    count_rows = await execute_query(
        "SELECT COUNT(*) as n FROM daily_intents WHERE user_id = ? AND date = ?",
        (user_id, today),
    )
    used = int(count_rows[0]["n"]) if count_rows else 0
    if used >= MAX_INTENTS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail="Vous avez déjà affiné votre intention 3 fois aujourd'hui — place à l'action !",
        )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    try:
        from ..services.market_hours import build_market_context
        messages.append({"role": "system", "content": build_market_context()})
    except Exception:
        pass
    level = current_user.get("trading_level") or "beginner"
    messages.append({"role": "system", "content": f"Niveau de l'utilisateur : {level}."})
    messages.append({"role": "user", "content": body.intent})

    import asyncio as _asyncio
    response_text = await _generate_response(messages)
    suggestions = suggest_actions(body.intent)
    try:
        assets = await _asyncio.wait_for(pick_assets(body.intent), timeout=25)
    except Exception:
        assets = []

    await execute_write(
        "INSERT INTO daily_intents (user_id, date, intent, response, suggestions, assets, created_at) VALUES (?,?,?,?,?,?,?)",
        (user_id, today, body.intent, response_text,
         json.dumps(suggestions, ensure_ascii=False),
         json.dumps(assets, ensure_ascii=False),
         datetime.now(timezone.utc).isoformat()),
    )

    return {
        "intent": body.intent,
        "response": response_text,
        "suggestions": suggestions,
        "assets": assets,
        "remaining": max(0, MAX_INTENTS_PER_DAY - used - 1),
    }
