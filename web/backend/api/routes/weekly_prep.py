"""
Weekly Market Preparation widget — generated every Sunday with Groq,
cached until Monday market open, then hidden until next Sunday.
"""
import os
import json
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import execute_query, execute_write
from .auth import get_current_user
from .admin import check_if_admin

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


async def _require_admin(user: dict = Depends(get_current_user)):
    if not await check_if_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class SaveBriefingRequest(BaseModel):
    briefing: dict

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"


def _get_groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "")


def _current_week_key() -> str:
    """ISO week identifier: e.g. '2025-W15'"""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-W%W")


def _is_widget_visible() -> bool:
    """Show from Sunday 13h UTC to Monday 14h30 UTC (NYSE open + buffer)."""
    now = datetime.now(timezone.utc)
    weekday = now.weekday()  # 0=Mon … 6=Sun
    hour = now.hour + now.minute / 60

    if weekday == 6 and hour >= 13:   # Sunday from 13:00
        return True
    if weekday == 0 and hour < 14.5:  # Monday until 14:30
        return True
    return False


WEEKLY_PROMPT = """\
Tu es un analyste financier senior de renom. Nous sommes dimanche et les marchés financiers rouvrent demain.
Génère un briefing hebdomadaire de marché complet et professionnel en JSON strict.

La date actuelle est {date}.

Réponds UNIQUEMENT avec un JSON valide respectant exactement cette structure (sans commentaires, sans markdown autour):

{{
  "week": "{week}",
  "generated_at": "{generated_at}",
  "macro": {{
    "trend": "bullish|bearish|neutral",
    "summary": "2-3 phrases sur le contexte macro global",
    "key_points": ["point1","point2","point3","point4"]
  }},
  "markets": [
    {{
      "name": "Actions US",
      "icon": "🇺🇸",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 1-2 phrases",
      "key_zones": "niveaux clés à surveiller",
      "risk": "risque principal de la semaine"
    }},
    {{
      "name": "Actions Europe",
      "icon": "🇪🇺",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 1-2 phrases",
      "key_zones": "niveaux clés à surveiller",
      "risk": "risque principal de la semaine"
    }},
    {{
      "name": "Crypto",
      "icon": "₿",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 1-2 phrases",
      "key_zones": "niveaux clés à surveiller",
      "risk": "risque principal de la semaine"
    }},
    {{
      "name": "Matières premières",
      "icon": "🛢️",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 1-2 phrases",
      "key_zones": "niveaux clés à surveiller",
      "risk": "risque principal de la semaine"
    }},
    {{
      "name": "Forex",
      "icon": "💱",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 1-2 phrases",
      "key_zones": "niveaux clés à surveiller",
      "risk": "risque principal de la semaine"
    }}
  ],
  "watchlist": [
    {{
      "symbol": "SYMBOLE",
      "name": "Nom complet",
      "type": "stock|crypto|forex|commodity|etf",
      "why": "raison claire et concise en 1 phrase",
      "scenario": "scénario haussier ou baissier en 1-2 phrases",
      "direction": "bullish|bearish|neutral"
    }}
  ],
  "events": [
    {{
      "day": "Lundi|Mardi|Mercredi|Jeudi|Vendredi",
      "time": "HH:MM UTC",
      "event": "nom de l'événement",
      "country": "🇺🇸|🇪🇺|🇬🇧|🌍",
      "importance": "high|medium|low",
      "impact": "impact potentiel en 1 phrase"
    }}
  ],
  "conclusion": "Synthèse stratégique en 3-4 phrases pour orienter le trader cette semaine"
}}

Mets entre 5 et 8 actifs dans watchlist. Mets entre 5 et 8 événements dans events.
Les analyses doivent être ancrées dans la réalité du marché actuel — basées sur tes données d'entraînement.
Utilise un langage professionnel, précis, et pédagogique.
"""


async def _generate_briefing() -> dict:
    api_key = _get_groq_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY non configuré")

    now = datetime.now(timezone.utc)
    prompt = WEEKLY_PROMPT.format(
        date=now.strftime("%A %d %B %Y"),
        week=_current_week_key(),
        generated_at=now.isoformat(),
    )

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.6,
                "max_tokens": 3000,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq error {resp.status_code}")

    content = resp.json()["choices"][0]["message"]["content"].strip()

    # Clean potential markdown fences
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    return json.loads(content)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/status")
async def widget_status():
    """Is the widget currently visible? (no auth needed)"""
    return {
        "visible": _is_widget_visible(),
        "week": _current_week_key(),
    }


@router.get("")
@limiter.limit("10/minute")
async def get_weekly_prep(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Return this week's briefing (cached in DB, generates if needed)."""
    week_key = _current_week_key()

    # Try cache
    rows = await execute_query(
        "SELECT content FROM weekly_market_prep WHERE week_key = ?",
        (week_key,),
    )
    if rows:
        try:
            return {"briefing": json.loads(rows[0]["content"]), "cached": True}
        except Exception:
            pass

    # Generate
    briefing = await _generate_briefing()
    content_str = json.dumps(briefing, ensure_ascii=False)

    # Upsert cache
    existing = await execute_query(
        "SELECT id FROM weekly_market_prep WHERE week_key = ?", (week_key,)
    )
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await execute_write(
            "UPDATE weekly_market_prep SET content = ?, generated_at = ? WHERE week_key = ?",
            (content_str, now, week_key),
        )
    else:
        await execute_write(
            "INSERT INTO weekly_market_prep (week_key, content, generated_at) VALUES (?,?,?)",
            (week_key, content_str, now),
        )

    return {"briefing": briefing, "cached": False}


@router.post("/refresh")
@limiter.limit("2/hour")
async def refresh_weekly_prep(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Force regenerate the briefing (rate limited)."""
    # Only admins or during Sunday window
    briefing = await _generate_briefing()
    week_key = _current_week_key()
    content_str = json.dumps(briefing, ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat()

    existing = await execute_query(
        "SELECT id FROM weekly_market_prep WHERE week_key = ?", (week_key,)
    )
    if existing:
        await execute_write(
            "UPDATE weekly_market_prep SET content = ?, generated_at = ? WHERE week_key = ?",
            (content_str, now, week_key),
        )
    else:
        await execute_write(
            "INSERT INTO weekly_market_prep (week_key, content, generated_at) VALUES (?,?,?)",
            (week_key, content_str, now),
        )
    return {"briefing": briefing, "cached": False}


# ── Admin endpoints ─────────────────────────────────────────────────────────────

@router.get("/admin/preview")
async def admin_preview(
    _user: dict = Depends(_require_admin),
):
    """Admin: preview current week's briefing regardless of visibility window."""
    week_key = _current_week_key()
    rows = await execute_query(
        "SELECT content, generated_at FROM weekly_market_prep WHERE week_key = ?",
        (week_key,),
    )
    if rows:
        return {
            "briefing": json.loads(rows[0]["content"]),
            "cached": True,
            "generated_at": rows[0]["generated_at"],
            "week_key": week_key,
            "visible": _is_widget_visible(),
        }

    # Not cached yet — generate now
    briefing = await _generate_briefing()
    content_str = json.dumps(briefing, ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat()
    await execute_write(
        "INSERT INTO weekly_market_prep (week_key, content, generated_at) VALUES (?,?,?)",
        (week_key, content_str, now),
    )
    return {
        "briefing": briefing,
        "cached": False,
        "generated_at": now,
        "week_key": week_key,
        "visible": _is_widget_visible(),
    }


@router.put("/admin")
async def admin_save(
    req: SaveBriefingRequest,
    _user: dict = Depends(_require_admin),
):
    """Admin: save a manually edited briefing for the current week."""
    week_key = _current_week_key()
    content_str = json.dumps(req.briefing, ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat()

    existing = await execute_query(
        "SELECT id FROM weekly_market_prep WHERE week_key = ?", (week_key,)
    )
    if existing:
        await execute_write(
            "UPDATE weekly_market_prep SET content = ?, generated_at = ? WHERE week_key = ?",
            (content_str, now, week_key),
        )
    else:
        await execute_write(
            "INSERT INTO weekly_market_prep (week_key, content, generated_at) VALUES (?,?,?)",
            (week_key, content_str, now),
        )
    return {"saved": True, "week_key": week_key, "generated_at": now}
