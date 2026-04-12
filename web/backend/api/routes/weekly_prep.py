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
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

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
Tu es un analyste financier senior de renom avec 20 ans d'expérience sur les marchés mondiaux.
Nous sommes dimanche et les marchés financiers rouvrent lundi matin.
Génère un briefing hebdomadaire de marché COMPLET, RICHE ET DÉTAILLÉ en JSON strict.

La date actuelle est {date}.

Ce briefing doit être LONG ET DÉVELOPPÉ — pédagogique, avec des explications profondes,
des exemples concrets, des niveaux de prix précis, et des suggestions actionnables pour les traders.

Réponds UNIQUEMENT avec un JSON valide respectant exactement cette structure (sans commentaires, sans markdown):

{{
  "week": "{week}",
  "generated_at": "{generated_at}",
  "macro": {{
    "trend": "bullish|bearish|neutral",
    "summary": "2-3 phrases sur le contexte macro global",
    "detailed_analysis": "5-8 phrases d'analyse approfondie: forces macroéconomiques en jeu, données récentes importantes, contexte géopolitique, politique monétaire des banques centrales, corrélations inter-marchés. Explique le POURQUOI des tendances actuelles.",
    "key_points": [
      "point clé 1 avec explication détaillée",
      "point clé 2 avec explication détaillée",
      "point clé 3 avec explication détaillée",
      "point clé 4 avec explication détaillée",
      "point clé 5 avec explication détaillée"
    ]
  }},
  "markets": [
    {{
      "name": "Actions US",
      "icon": "🇺🇸",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 2 phrases",
      "detailed_analysis": "4-6 phrases: analyse technique ET fondamentale, catalyseurs de la semaine, flux institutionnels, contexte sectoriel, comparaison avec semaines précédentes",
      "key_zones": "supports et résistances précis avec valeurs numériques (ex: Support 5100, Résistance 5280, Support fort 4900)",
      "opportunities": [
        "opportunité sectorielle 1 avec explication du catalyseur",
        "opportunité sectorielle 2 avec explication",
        "opportunité sectorielle 3 avec explication"
      ],
      "sectors_watch": [
        "Technologie: raison de surveiller cette semaine",
        "Finance: raison de surveiller",
        "Énergie: raison de surveiller"
      ],
      "risk": "risque principal DÉTAILLÉ: nature du risque, probabilité, impact estimé sur les marchés"
    }},
    {{
      "name": "Actions Europe",
      "icon": "🇪🇺",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 2 phrases",
      "detailed_analysis": "4-6 phrases d'analyse technique et fondamentale",
      "key_zones": "niveaux clés CAC40/DAX avec valeurs numériques",
      "opportunities": ["opportunité 1", "opportunité 2", "opportunité 3"],
      "sectors_watch": ["secteur1: raison", "secteur2: raison", "secteur3: raison"],
      "risk": "risque principal détaillé"
    }},
    {{
      "name": "Crypto",
      "icon": "₿",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 2 phrases",
      "detailed_analysis": "4-6 phrases: Bitcoin dominance, sentiment on-chain, catalyseurs institutionnels, cycle de marché",
      "key_zones": "niveaux BTC/ETH avec valeurs numériques précises",
      "opportunities": ["opportunité 1", "opportunité 2", "opportunité 3"],
      "sectors_watch": ["BTC: analyse détaillée", "ETH: analyse détaillée", "Altcoins: zones d'opportunité"],
      "risk": "risque principal détaillé (régulation, liquidité, corrélation macro)"
    }},
    {{
      "name": "Matières premières",
      "icon": "🛢️",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 2 phrases",
      "detailed_analysis": "4-6 phrases d'analyse",
      "key_zones": "niveaux Pétrole/Or/Blé avec valeurs numériques",
      "opportunities": ["opportunité 1", "opportunité 2"],
      "sectors_watch": ["Pétrole WTI: analyse", "Or: analyse", "Métaux industriels: analyse"],
      "risk": "risque principal détaillé"
    }},
    {{
      "name": "Forex",
      "icon": "💱",
      "trend": "bullish|bearish|neutral",
      "summary": "analyse en 2 phrases",
      "detailed_analysis": "4-6 phrases: dynamique dollar, politique monétaire, flux de capitaux",
      "key_zones": "paires majeures avec niveaux numériques précis (EUR/USD, GBP/USD, USD/JPY)",
      "opportunities": ["opportunité 1", "opportunité 2"],
      "sectors_watch": ["EUR/USD: analyse et niveau clé", "USD/JPY: analyse et niveau clé", "GBP/USD: analyse et niveau clé"],
      "risk": "risque principal détaillé"
    }}
  ],
  "watchlist": [
    {{
      "symbol": "SYMBOLE",
      "name": "Nom complet de l'actif",
      "type": "stock|crypto|forex|commodity|etf",
      "why": "Pourquoi surveiller cet actif CETTE semaine: contexte, catalyseur spécifique, configuration technique en 2-3 phrases",
      "scenario": "Scénario détaillé: si X se produit alors Y. Inclure les conditions de déclenchement, l'objectif, et les invalidations possibles. 2-3 phrases.",
      "direction": "bullish|bearish|neutral",
      "entry_zone": "Zone d'entrée idéale avec prix ou range précis (ex: 148-152$, attendre pullback)",
      "target": "Objectif de prix avec justification (ex: 175$ — résistance majeure 52 semaines)",
      "stop_loss": "Niveau stop-loss avec justification (ex: 143$ — sous support structure H4)",
      "technical_setup": "Setup technique: pattern graphique, indicateurs clés, signal (ex: Flag haussier sur H4, RSI > 50, au-dessus EMA200)"
    }}
  ],
  "trading_ideas": [
    {{
      "title": "Titre court et accrocheur de l'idée",
      "symbol": "SYMBOLE",
      "type": "stock|crypto|forex|commodity|etf",
      "setup": "Description complète du setup en 3-4 phrases: pattern identifié, contexte de marché, catalyseur attendu, logique de la trade",
      "entry": "Prix ou zone d'entrée précis avec conditions (ex: 150.50$ sur cassure en clôture)",
      "target": "Objectif principal (ex: 168$ — target 1, 180$ — target 2)",
      "stop": "Stop-loss précis (ex: 143.50$ — invalidation du setup)",
      "rr": "Ratio risque/récompense (ex: 1:2.8)",
      "direction": "bullish|bearish|neutral",
      "timeframe": "intraday|swing|position",
      "conditions": "Conditions à remplir avant d'entrer (ex: Attendre confirmation clôture H4 au-dessus 150$, volume > moyenne)"
    }}
  ],
  "events": [
    {{
      "day": "Lundi|Mardi|Mercredi|Jeudi|Vendredi",
      "time": "HH:MM UTC",
      "event": "Nom officiel de l'événement",
      "country": "🇺🇸|🇪🇺|🇬🇧|🌍",
      "importance": "high|medium|low",
      "impact": "Impact potentiel DÉTAILLÉ: quels marchés affectés, quelle direction probable selon consensus vs surprise, amplitude estimée. 2-3 phrases."
    }}
  ],
  "educational_tip": {{
    "concept": "Nom du concept ou technique trading de la semaine",
    "explanation": "Explication pédagogique en 4-5 phrases: définition claire, mécanisme de fonctionnement, pourquoi c'est important pour le trader, dans quels contextes l'utiliser",
    "example": "Exemple CONCRET lié à un actif ou situation des marchés de cette semaine — montre comment appliquer le concept en pratique",
    "takeaway": "Ce qu'il faut absolument retenir et appliquer cette semaine — conseil pratique et actionnable en 1-2 phrases"
  }},
  "conclusion": "Synthèse stratégique COMPLÈTE en 5-7 phrases: bilan des grandes thématiques de la semaine, opportunités principales à exploiter, risques à surveiller en priorité, posture générale recommandée (offensif/défensif/sélectif), secteurs à privilégier et éviter, conseils de gestion du risque adaptés au contexte"
}}

RÈGLES IMPÉRATIVES:
- EXACTEMENT 6-8 actifs dans watchlist
- EXACTEMENT 3-4 idées dans trading_ideas
- EXACTEMENT 6-8 événements dans events
- Toutes les analyses DOIVENT être développées — INTERDIT les formules vagues ou génériques
- Les niveaux de prix DOIVENT être concrets et numériques, basés sur tes données d'entraînement
- Contenu PÉDAGOGIQUE: explique toujours le POURQUOI derrière chaque analyse
- Langage professionnel mais accessible à un trader débutant-intermédiaire
- TOUS les champs sont obligatoires
"""


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


def _get_mistral_key() -> str:
    return os.getenv("MISTRAL_API_KEY", "")


async def _call_mistral(prompt: str) -> dict:
    """Generate via Mistral API."""
    api_key = _get_mistral_key()
    system = (
        "Tu es un analyste financier senior. "
        "Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaires."
    )
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "mistral-small-latest",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": prompt},
                ],
                "temperature": 0.6,
                "max_tokens": 3000,
                "response_format": {"type": "json_object"},
            },
        )
    if resp.status_code == 429:
        raise ValueError("rate_limit:0")
    if resp.status_code != 200:
        raise ValueError(f"error:{resp.status_code}")
    content = resp.json()["choices"][0]["message"]["content"].strip()
    return json.loads(content)


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
            max_output_tokens=3000,
            response_mime_type="application/json",
        ),
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip().rstrip("```").strip())


async def _call_groq(prompt: str) -> dict:
    """Groq fallback. Raises ValueError on 429."""
    api_key = _get_groq_key()
    if not api_key:
        raise ValueError("no_key")

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

    if resp.status_code == 429:
        raise ValueError("rate_limit:0")

    if resp.status_code != 200:
        raise ValueError(f"error:{resp.status_code}")

    content = resp.json()["choices"][0]["message"]["content"].strip()
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
    if _get_mistral_key():
        providers.append(("mistral", _call_mistral))
    if _get_groq_key():
        providers.append(("groq",    _call_groq))

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
