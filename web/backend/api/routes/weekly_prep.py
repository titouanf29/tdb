"""
Weekly Market Preparation widget — generated every Sunday with Groq,
cached until Monday market open, then hidden until next Sunday.
"""
import logging
import os
import json
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from slowapi import Limiter
from ..limite import cle_client  # voir limite.py
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

from ..database import execute_query, execute_write
from .auth import get_current_user
from .admin import check_if_admin

router = APIRouter()
limiter = Limiter(key_func=cle_client)


async def _require_admin(user: dict = Depends(get_current_user)):
    if not await check_if_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class SaveBriefingRequest(BaseModel):
    briefing: dict

# Modèle résolu à l'exécution — voir _llm.py.
from ._llm import LLMUnavailable, configured_providers, llm_chat  # noqa: E402


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
Tu es un analyste financier senior avec 20 ans d'expérience. Date: {date}. Semaine: {week}.

Génère un briefing hebdomadaire de marché riche et détaillé. Réponds UNIQUEMENT avec un JSON valide, sans markdown ni commentaires.

Structure JSON requise:

{{
  "week": "{week}",
  "generated_at": "{generated_at}",
  "macro": {{
    "trend": "bullish|bearish|neutral",
    "summary": "résumé en 2-3 phrases du contexte global",
    "detailed_analysis": "analyse macro approfondie en 5-6 phrases: banques centrales, données économiques récentes, géopolitique, corrélations inter-marchés, pourquoi le marché est dans cette tendance",
    "key_points": ["point 1 détaillé", "point 2 détaillé", "point 3 détaillé", "point 4 détaillé", "point 5 détaillé"]
  }},
  "markets": [
    {{
      "name": "Actions US", "icon": "🇺🇸",
      "trend": "bullish|bearish|neutral",
      "summary": "2 phrases d'analyse",
      "detailed_analysis": "4-5 phrases: analyse technique ET fondamentale, catalyseurs, flux institutionnels, contexte sectoriel",
      "key_zones": "supports et résistances avec valeurs numériques précises (ex: Support 5100, Résistance 5280)",
      "opportunities": ["opportunité 1 avec catalyseur", "opportunité 2", "opportunité 3"],
      "sectors_watch": ["Secteur A: raison", "Secteur B: raison", "Secteur C: raison"],
      "risk": "risque principal détaillé en 2 phrases"
    }},
    {{
      "name": "Actions Europe", "icon": "🇪🇺",
      "trend": "bullish|bearish|neutral",
      "summary": "2 phrases",
      "detailed_analysis": "4-5 phrases d'analyse",
      "key_zones": "niveaux CAC40/DAX numériques",
      "opportunities": ["opportunité 1", "opportunité 2", "opportunité 3"],
      "sectors_watch": ["secteur 1: raison", "secteur 2: raison", "secteur 3: raison"],
      "risk": "risque principal en 2 phrases"
    }},
    {{
      "name": "Crypto", "icon": "₿",
      "trend": "bullish|bearish|neutral",
      "summary": "2 phrases",
      "detailed_analysis": "4-5 phrases: BTC dominance, sentiment on-chain, catalyseurs institutionnels",
      "key_zones": "niveaux BTC et ETH en dollars",
      "opportunities": ["opportunité 1", "opportunité 2", "opportunité 3"],
      "sectors_watch": ["BTC: analyse", "ETH: analyse", "Altcoins: zones d'intérêt"],
      "risk": "risque principal en 2 phrases"
    }},
    {{
      "name": "Matières premières", "icon": "🛢️",
      "trend": "bullish|bearish|neutral",
      "summary": "2 phrases",
      "detailed_analysis": "4-5 phrases d'analyse",
      "key_zones": "niveaux Pétrole WTI et Or en dollars",
      "opportunities": ["opportunité 1", "opportunité 2"],
      "sectors_watch": ["Pétrole WTI: analyse", "Or: analyse", "Métaux industriels: analyse"],
      "risk": "risque principal en 2 phrases"
    }},
    {{
      "name": "Forex", "icon": "💱",
      "trend": "bullish|bearish|neutral",
      "summary": "2 phrases",
      "detailed_analysis": "4-5 phrases: dollar, politique monétaire comparative, flux de capitaux",
      "key_zones": "EUR/USD, USD/JPY, GBP/USD avec niveaux numériques",
      "opportunities": ["opportunité 1", "opportunité 2"],
      "sectors_watch": ["EUR/USD: niveau clé + analyse", "USD/JPY: niveau clé + analyse", "GBP/USD: niveau clé + analyse"],
      "risk": "risque principal en 2 phrases"
    }}
  ],
  "watchlist": [
    {{
      "symbol": "TICKER",
      "name": "Nom complet",
      "type": "stock|crypto|forex|commodity|etf",
      "market": "US|EU|Crypto|Matières premières|Forex",
      "why": "Pourquoi surveiller CET actif CETTE semaine précisément: contexte fondamental ou macro, catalyseur spécifique attendu, configuration de marché particulière. 2-3 phrases détaillées.",
      "scenario": "Scénario principal: si [condition X] → alors [mouvement Y]. Décrire le déclencheur, l'objectif de prix, et l'invalidation possible. 2-3 phrases.",
      "direction": "bullish|bearish|neutral",
      "entry_zone": "zone d'entrée avec prix précis (ex: 148-152$)",
      "target": "objectif avec justification (ex: 175$ résistance majeure)",
      "stop_loss": "stop avec justification (ex: 143$ sous support H4)",
      "technical_setup": "pattern + indicateurs + signal (ex: Flag haussier H4, RSI > 50, au-dessus EMA200)"
    }}
  ],
  "trading_ideas": [
    {{
      "title": "titre accrocheur de l'idée",
      "symbol": "TICKER",
      "type": "stock|crypto|forex|commodity|etf",
      "setup": "description complète du setup en 3-4 phrases: pattern, contexte, catalyseur, logique",
      "entry": "prix d'entrée précis avec condition (ex: 150.50$ sur cassure clôture)",
      "target": "objectif (ex: 168$ target1, 180$ target2)",
      "stop": "stop-loss précis (ex: 143.50$)",
      "rr": "ratio R/R (ex: 1:2.8)",
      "direction": "bullish|bearish|neutral",
      "timeframe": "intraday|swing|position",
      "conditions": "conditions avant entrée (ex: attendre clôture H4 au-dessus 150$)"
    }}
  ],
  "events": [
    {{
      "day": "Lundi|Mardi|Mercredi|Jeudi|Vendredi",
      "time": "HH:MM UTC",
      "event": "nom officiel de l'événement",
      "country": "🇺🇸|🇪🇺|🇬🇧|🌍",
      "importance": "high|medium|low",
      "impact": "impact potentiel en 2 phrases: marchés affectés, direction probable, amplitude estimée"
    }}
  ],
  "educational_tip": {{
    "concept": "nom du concept trading de la semaine",
    "explanation": "explication pédagogique en 4-5 phrases: définition, mécanisme, utilité, contextes d'application",
    "example": "exemple concret lié aux marchés de cette semaine",
    "takeaway": "conseil pratique et actionnable en 1-2 phrases"
  }},
  "conclusion": "synthèse stratégique en 5-6 phrases: thématiques de la semaine, opportunités prioritaires, risques à surveiller, posture recommandée, gestion du risque"
}}

Règles:
- 6 à 8 actifs dans watchlist
- 3 à 4 idées dans trading_ideas
- 6 à 8 événements dans events
- Niveaux de prix numériques et réalistes basés sur tes données d'entraînement
- Contenu pédagogique, explique le pourquoi derrière chaque analyse
"""


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")




async def _call_gemini(prompt: str) -> dict:
    """Generate via Gemini Flash (free tier, generous limits)."""
    import google.generativeai as genai
    genai.configure(api_key=_get_gemini_key())
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        system_instruction=(
            "Tu es un analyste financier senior. "
            "Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaires."
        ),
    )
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.6,
            max_output_tokens=8000,
            response_mime_type="application/json",
        ),
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip().rstrip("```").strip())


async def _call_llm(prompt: str) -> dict:
    """Le briefing, par le premier fournisseur qui répond.

    Il y avait ici deux entrées distinctes — Mistral et Groq — chacune avec
    son URL, son modèle en dur et son propre traitement d'erreur. Les deux
    modèles étaient périmés. La chaîne vit maintenant dans _llm.py ; il ne
    reste ici que ce qui est propre au briefing : le cadrage JSON.
    """
    if not configured_providers():
        raise ValueError("no_key")

    try:
        content = (await llm_chat(
            [{"role": "system", "content": "Tu es un analyste financier senior. "
                                           "Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaires."},
             {"role": "user", "content": prompt}],
            temperature=0.6, max_tokens=8000, timeout=90.0)).strip()
    except LLMUnavailable as exc:
        raise ValueError(f"error:{exc.message}") from exc
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content)


def _template_briefing() -> dict:
    """Fallback briefing when all AI providers are unavailable."""
    now = datetime.now(timezone.utc)
    week = _current_week_key()
    return {
        "week": week,
        "generated_at": now.isoformat(),
        "generated_by": "template",
        "macro": {
            "trend": "neutral",
            "summary": "Briefing généré en mode dégradé — tous les fournisseurs IA sont temporairement indisponibles.",
            "detailed_analysis": "Ce briefing est un modèle vide. Veuillez cliquer sur 'Régénérer IA' dans quelques minutes pour obtenir l'analyse complète générée par l'intelligence artificielle.",
            "key_points": [
                "Surveiller les publications macro importantes de la semaine",
                "Gérer le risque avec des stops adaptés à la volatilité",
                "Privilégier les actifs avec fort momentum et volume confirmé",
                "Rester attentif aux corrélations inter-marchés",
                "Attendre la régénération IA pour les analyses détaillées",
            ],
        },
        "markets": [
            {
                "name": "Actions US", "icon": "🇺🇸", "trend": "neutral",
                "summary": "Analyse IA indisponible — régénérez pour obtenir le contenu complet.",
                "detailed_analysis": "Cliquez sur Régénérer IA pour obtenir l'analyse détaillée.",
                "key_zones": "Données non disponibles",
                "opportunities": ["Régénérez le briefing pour voir les opportunités"],
                "sectors_watch": ["Régénérez le briefing pour voir les secteurs à surveiller"],
                "risk": "Voir actualités macro récentes",
            },
            {
                "name": "Actions Europe", "icon": "🇪🇺", "trend": "neutral",
                "summary": "Analyse IA indisponible.", "detailed_analysis": "Cliquez sur Régénérer IA.",
                "key_zones": "Données non disponibles", "opportunities": [], "sectors_watch": [], "risk": "Voir actualités macro",
            },
            {
                "name": "Crypto", "icon": "₿", "trend": "neutral",
                "summary": "Analyse IA indisponible.", "detailed_analysis": "Cliquez sur Régénérer IA.",
                "key_zones": "Données non disponibles", "opportunities": [], "sectors_watch": [], "risk": "Voir actualités macro",
            },
            {
                "name": "Matières premières", "icon": "🛢️", "trend": "neutral",
                "summary": "Analyse IA indisponible.", "detailed_analysis": "Cliquez sur Régénérer IA.",
                "key_zones": "Données non disponibles", "opportunities": [], "sectors_watch": [], "risk": "Voir actualités macro",
            },
            {
                "name": "Forex", "icon": "💱", "trend": "neutral",
                "summary": "Analyse IA indisponible.", "detailed_analysis": "Cliquez sur Régénérer IA.",
                "key_zones": "Données non disponibles", "opportunities": [], "sectors_watch": [], "risk": "Voir actualités macro",
            },
        ],
        "watchlist": [],
        "trading_ideas": [],
        "events": [],
        "educational_tip": {
            "concept": "Analyse en cours",
            "explanation": "Le briefing complet sera disponible après régénération IA.",
            "example": "Cliquez sur Régénérer IA pour obtenir le conseil pédagogique de la semaine.",
            "takeaway": "Régénérez le briefing pour accéder à l'analyse complète.",
        },
        "conclusion": "Briefing en mode dégradé — tous les fournisseurs IA sont temporairement indisponibles. Cliquez sur 'Régénérer IA' pour obtenir l'analyse complète avec watchlist, idées de trade et conseil éducatif de la semaine.",
    }


async def _generate_briefing() -> dict:
    """
    Generate briefing: Gemini first (generous free tier),
    Groq as fallback, template as last resort.
    """
    now = datetime.now(timezone.utc)
    prompt = WEEKLY_PROMPT.format(
        date=now.strftime("%A %d %B %Y"),
        week=_current_week_key(),
        generated_at=now.isoformat(),
    )

    providers = []
    if _get_gemini_key():
        providers.append(("gemini",  _call_gemini))
    if configured_providers():
        providers.append(("ia", _call_llm))

    for name, fn in providers:
        try:
            result = await fn(prompt)
            result.setdefault("generated_by", name)
            logger.info("Weekly briefing generated by %s", name)
            return result
        except Exception as e:
            logger.warning("%s failed (%s), trying next provider", name, e)

    logger.warning("All providers unavailable — returning template")
    return _template_briefing()


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
    """Return this week's briefing (cached in DB, generates only during active window)."""
    week_key = _current_week_key()

    # Try cache first — always serve if available
    rows = await execute_query(
        "SELECT content FROM weekly_market_prep WHERE week_key = ?",
        (week_key,),
    )
    if rows:
        try:
            return {"briefing": json.loads(rows[0]["content"]), "cached": True}
        except Exception:
            pass

    # Only auto-generate during the active Sunday→Monday window
    if not _is_widget_visible():
        raise HTTPException(
            status_code=404,
            detail="Aucun briefing disponible cette semaine. Revenez dimanche ou utilisez /refresh."
        )

    # Generate
    briefing = await _generate_briefing()

    # Only cache real AI-generated briefings, not the template fallback
    if briefing.get("generated_by") != "template":
        content_str = json.dumps(briefing, ensure_ascii=False)
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
    briefing = await _generate_briefing()
    week_key = _current_week_key()
    now = datetime.now(timezone.utc).isoformat()

    # Only persist real AI-generated briefings
    if briefing.get("generated_by") != "template":
        content_str = json.dumps(briefing, ensure_ascii=False)
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
    now = datetime.now(timezone.utc).isoformat()

    # Only persist real AI-generated briefings, not the template fallback
    if briefing.get("generated_by") != "template":
        content_str = json.dumps(briefing, ensure_ascii=False)
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


# ─── Auto-send toggle ──────────────────────────────────────────────────────────

_SKIP_KEY = "skip_weekly_preview"


@router.get("/admin/auto-send")
async def get_auto_send_setting(_user: dict = Depends(_require_admin)):
    """Return whether the automatic Sunday preview is enabled."""
    row = await execute_query(
        "SELECT value FROM admin_settings WHERE key = ?", (_SKIP_KEY,)
    )
    skip = row[0]["value"] == "true" if row else False
    return {"skip": skip}


class AutoSendRequest(BaseModel):
    skip: bool


@router.post("/admin/auto-send")
async def set_auto_send_setting(
    req: AutoSendRequest,
    _user: dict = Depends(_require_admin),
):
    """Enable or disable the automatic Sunday 18h preview for this week."""
    now = datetime.now(timezone.utc).isoformat()
    value = "true" if req.skip else "false"
    existing = await execute_query(
        "SELECT key FROM admin_settings WHERE key = ?", (_SKIP_KEY,)
    )
    if existing:
        await execute_write(
            "UPDATE admin_settings SET value = ?, updated_at = ? WHERE key = ?",
            (value, now, _SKIP_KEY),
        )
    else:
        await execute_write(
            "INSERT INTO admin_settings (key, value, created_at, updated_at) VALUES (?,?,?,?)",
            (_SKIP_KEY, value, now, now),
        )
    return {"skip": req.skip}
