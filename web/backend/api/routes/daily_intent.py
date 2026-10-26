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
from ..limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address

from ..database import USE_POSTGRES, execute_query, execute_write
from .auth import get_current_user
from ._llm import LLMUnavailable, llm_chat
from ._scoring import (compute_score, derive_signal, TIMEFRAME_FETCH, derniere_bougie_en_cours,
                       resample_ohlcv, htf_from_primary, htf_trend, apply_htf_gate)
from ._market_context import benchmark_for, compute_market_context, apply_context_gate
from ._prices import fetch_ohlcv

router = APIRouter()
limiter = Limiter(key_func=cle_client)

MAX_INTENTS_PER_DAY = 8  # thread messages allowed per day, bounded (API cost control)

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
    "europe": [("MC.PA", "LVMH"), ("OR.PA", "L'Oréal"), ("AIR.PA", "Airbus"), ("SAP.DE", "SAP"), ("ASML.AS", "ASML")],
    "forex": [("EURUSD=X", "EUR/USD"), ("GBPUSD=X", "GBP/USD"), ("USDJPY=X", "USD/JPY")],
    "commodities": [("GC=F", "Or"), ("SI=F", "Argent"), ("CL=F", "Pétrole WTI")],
}


def detect_market_strict(text: str) -> str | None:
    """Market explicitly named in the text, or None if ambiguous."""
    low = text.lower()
    if any(k in low for k in ("crypto", "btc", "bitcoin", "eth", "sol ", "altcoin")):
        return "crypto"
    if any(k in low for k in ("forex", "eur/usd", "devise", "paire")):
        return "forex"
    if any(k in low for k in ("or ", "gold", "argent", "pétrole", "petrole", "matière", "matiere")):
        return "commodities"
    if any(k in low for k in ("europe", "européen", "europeen", "cac", "paris", "français", "francais", "dax")):
        return "europe"
    if any(k in low for k in ("action", "bourse", "nasdaq", "sp500", "s&p", "us ", "américain", "americain", "wall street")):
        return "usa"
    return None


def detect_market(text: str) -> str:
    strict = detect_market_strict(text)
    if strict:
        return strict
    low = text.lower()
    # Day trading / scalping without a market → crypto (open 24/7, always tradable)
    if any(k in low for k in ("day trading", "daytrading", "scalp", "intraday", "aujourd")):
        return "crypto"
    return "usa"


STYLE_KEYWORDS = ("day trading", "daytrading", "scalp", "intraday", "swing",
                  "long terme", "apprendre", "apprentissage", "formation")


def clarifying_question(combined: str) -> dict | None:
    """Server-side follow-up: when the thread is still ambiguous, offer
    clickable options instead of making the user type."""
    low = combined.lower()
    if detect_market_strict(combined) is None:
        return {
            "text": "Pour mieux cibler : plutôt quel univers aujourd'hui ?",
            "options": ["Actions Europe", "Actions US", "Crypto", "Forex"],
        }
    if not any(k in low for k in STYLE_KEYWORDS):
        return {
            "text": "Et plutôt quel style de session ?",
            "options": ["Day trading", "Swing sur plusieurs jours", "Je veux surtout apprendre"],
        }
    return None


async def pick_assets(intent: str, max_assets: int = 2) -> list[dict]:
    """Score the curated candidates with the production engine, keep the best."""
    market = detect_market(intent)
    scored: list[dict] = []
    # This widget links straight to the analysis page, so it must reach the
    # SAME verdict. It used to call compute_score() raw on a hardcoded 6-month
    # daily history, skipping the higher-timeframe gate (+/-8) and the market
    # context gate (+/-6), and carrying its own copy of the signal thresholds:
    # up to 14 points of drift between "BTC 72 BUY" on the dashboard and what
    # the analysis then showed. Full pipeline now, shared helpers only.
    tf = "1d"
    period, interval, resample = TIMEFRAME_FETCH.get(tf, ("2y", "1d", None))
    for sym, name in ASSET_CANDIDATES.get(market, [])[:5]:
        try:
            hist = await fetch_ohlcv(sym, period=period, interval=interval)
            if resample and hist is not None and not hist.empty:
                hist = resample_ohlcv(hist, resample)
            if hist is None or hist.empty or len(hist) < 60:
                continue
            s = compute_score(hist["High"], hist["Low"], hist["Close"], hist["Volume"],
                              partial_last=derniere_bougie_en_cours(hist, tf))
            final = s["final_score"]

            htf = htf_from_primary(hist, tf)
            if htf:
                final, _, _, _ = apply_htf_gate(final, htf_trend(htf[1]), htf[0])

            bench = benchmark_for(sym)
            if bench:
                b_hist = await fetch_ohlcv(bench, period=period, interval=interval)
                if resample and b_hist is not None and not b_hist.empty:
                    b_hist = resample_ohlcv(b_hist, resample)
                if b_hist is not None and not b_hist.empty:
                    ctx = compute_market_context(hist["Close"], b_hist["Close"], bench)
                    final, _, _ = apply_context_gate(final, ctx)

            score = int(round(final))
            scored.append({
                "symbol": sym,
                "name": name,
                "score": score,
                "signal": derive_signal(final),
                "href": f"/analysis?symbol={sym}",
            })
        except Exception:
            continue
    scored.sort(key=lambda a: -a["score"])
    return scored[:max_assets]


async def _ensure_table() -> None:
    # AUTOINCREMENT n'existe que dans SQLite : sous PostgreSQL, la table
    # n'était jamais créée et chaque appel de la route échouait.
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(
        f"""CREATE TABLE IF NOT EXISTS daily_intents (
            id {cle},
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            intent TEXT NOT NULL,
            response TEXT NOT NULL,
            suggestions TEXT NOT NULL DEFAULT '[]',
            assets TEXT NOT NULL DEFAULT '[]',
            archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )""",
        (),
    )
    # Migration for tables created before the reset feature
    try:
        await execute_write("ALTER TABLE daily_intents ADD COLUMN archived INTEGER NOT NULL DEFAULT 0", ())
    except Exception:
        pass  # column already exists


async def _generate_response(messages: list) -> str:
    """Isolated so tests (and future providers) can swap the generator."""
    try:
        return await llm_chat(messages, temperature=0.6, max_tokens=300, timeout=45.0)
    except LLMUnavailable as exc:
        raise HTTPException(status_code=503, detail=exc.message)


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
        "SELECT intent, response, suggestions, assets, created_at FROM daily_intents WHERE user_id = ? AND date = ? AND archived = 0 ORDER BY id ASC",
        (current_user["id"], _today()),
    )
    used = await _used_today(current_user["id"])
    return _thread_payload(rows, used)


async def _used_today(user_id: int) -> int:
    """Quota counts every message sent today, archived or not — resetting
    the conversation must not refill the daily LLM budget."""
    rows = await execute_query(
        "SELECT COUNT(*) as n FROM daily_intents WHERE user_id = ? AND date = ?",
        (user_id, _today()),
    )
    return int(rows[0]["n"]) if rows else 0


def _thread_payload(rows, used: int) -> dict:
    def _load(r, col):
        try:
            return json.loads(r[col])
        except Exception:
            return []
    exchanges = [{
        "message": r["intent"],
        "response": r["response"],
        "suggestions": _load(r, "suggestions"),
        "assets": _load(r, "assets"),
    } for r in rows]
    combined = " ".join(r["intent"] for r in rows)
    return {
        "exchanges": exchanges,
        "question": clarifying_question(combined) if exchanges else None,
        "remaining": max(0, MAX_INTENTS_PER_DAY - used),
        # Back-compat convenience: last exchange flattened
        "intent": exchanges[-1]["message"] if exchanges else None,
        "response": exchanges[-1]["response"] if exchanges else None,
        "suggestions": exchanges[-1]["suggestions"] if exchanges else [],
        "assets": exchanges[-1]["assets"] if exchanges else [],
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

    used = await _used_today(user_id)
    if used >= MAX_INTENTS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail="Budget d'échanges du jour épuisé — place à l'action, on se retrouve demain !",
        )

    # Conversation context: today's previous (non-archived) exchanges
    prev_rows = await execute_query(
        "SELECT intent, response FROM daily_intents WHERE user_id = ? AND date = ? AND archived = 0 ORDER BY id ASC",
        (user_id, today),
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    try:
        from ..services.market_hours import build_market_context
        messages.append({"role": "system", "content": build_market_context()})
    except Exception:
        pass
    level = current_user.get("trading_level") or "beginner"
    messages.append({"role": "system", "content": f"Niveau de l'utilisateur : {level}."})
    for r in prev_rows:
        messages.append({"role": "user", "content": r["intent"]})
        messages.append({"role": "assistant", "content": r["response"]})
    messages.append({"role": "user", "content": body.intent})

    # Market/style/assets derive from the WHOLE thread, not just this message
    combined = " ".join([r["intent"] for r in prev_rows] + [body.intent])

    import asyncio as _asyncio
    response_text = await _generate_response(messages)
    suggestions = suggest_actions(combined)
    try:
        assets = await _asyncio.wait_for(pick_assets(combined), timeout=25)
    except Exception:
        assets = []

    await execute_write(
        "INSERT INTO daily_intents (user_id, date, intent, response, suggestions, assets, created_at) VALUES (?,?,?,?,?,?,?)",
        (user_id, today, body.intent, response_text,
         json.dumps(suggestions, ensure_ascii=False),
         json.dumps(assets, ensure_ascii=False),
         datetime.now(timezone.utc).isoformat()),
    )

    rows = await execute_query(
        "SELECT intent, response, suggestions, assets, created_at FROM daily_intents WHERE user_id = ? AND date = ? AND archived = 0 ORDER BY id ASC",
        (user_id, today),
    )
    return _thread_payload(rows, await _used_today(user_id))


@router.delete("/daily-intent")
@limiter.limit("10/minute")
async def reset_daily_intent(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Revenir à zéro: archive today's thread (keeps the daily quota spent)."""
    await _ensure_table()
    await execute_write(
        "UPDATE daily_intents SET archived = 1 WHERE user_id = ? AND date = ? AND archived = 0",
        (current_user["id"], _today()),
    )
    used = await _used_today(current_user["id"])
    return _thread_payload([], used)
