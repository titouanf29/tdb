"""
Script generator — uses Google Gemini API (free tier) to generate
TikTok/Reels scripts in French with CaptentDB branding.

Falls back to a structured template if GEMINI_API_KEY is not set.
"""
import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-1.5-flash"

SYSTEM_PROMPT = """Tu es un créateur de contenu financier expert pour CaptentDB (captentdb.fr).
Tu génères des scripts TikTok/Reels en FRANÇAIS pour positionner CaptentDB comme une référence premium en analyse de marché.

RÈGLES ABSOLUES :
- Jamais de "Bonjour" ou introduction générique IA
- Jamais de "En tant qu'IA" ou formules robotiques
- Style : naturel, rapide, "expert-pair" — tu parles à un trader semi-pro
- Utilise du jargon pro expliqué : "liquidity grab", "hawkish/dovish", "bull-trap", "rotation sectorielle"
- Mentionne organiquement : "j'ai filtré ça via mon dashboard sur CaptentDB" OU "l'outil de détection de CaptentDB vient de sortir" OU "on surveille ça sur CaptentDB"
- Utilise "on surveille", "le marché nous montre", "l'équipe voit"
- Chaque segment doit avoir une instruction visuelle [VISUAL: ...]

FORMAT DE SORTIE (JSON strict) :
{
  "hook": "...",
  "segments": [
    {
      "type": "geopolitique|europe|usa|crypto|commodities|takeaway|cta",
      "label": "Label affiché",
      "text": "Texte du script",
      "visual": "Instruction visuelle détaillée pour le monteur",
      "duration_sec": 10
    }
  ],
  "total_duration_sec": 60,
  "mode": "A"
}
"""

MODE_B_SYSTEM_PROMPT = SYSTEM_PROMPT.replace('"mode": "A"', '"mode": "B"') + """
Pour Mode B (Deep Diver), génère 3 scripts séparés dans un tableau JSON :
[script_europe, script_usa, script_crypto]
Chaque script doit finir avec un bridge hook vers la vidéo suivante.
Retourne un JSON avec la clé "scripts": [...].
"""


def _build_user_prompt(
    snapshot: Dict,
    news: List[Dict],
    fear_greed: Dict,
    heat_score: float,
    period: str,
    mode: str,
    custom_context: str = "",
) -> str:
    period_label = {"day": "aujourd'hui", "week": "cette semaine", "month": "ce mois"}.get(period, period)

    # Build compact market summary for the prompt
    market_summary = {}
    for region_key, region_data in snapshot.items():
        top = region_data.get("top")
        flop = region_data.get("flop")
        market_summary[region_key] = {
            "label": region_data["label"],
            "top": {"name": top["name"], "change": f"{top['change_pct']:+.1f}%", "rsi": top["rsi"]} if top else None,
            "flop": {"name": flop["name"], "change": f"{flop['change_pct']:+.1f}%", "rsi": flop["rsi"]} if flop else None,
        }

    # Top 4 high-impact news
    top_news = [
        {"title": n["title"], "source": n["source"], "impact": n["impact"]}
        for n in news[:4]
        if n["impact"] in ("high", "medium")
    ]

    mode_label = "Mode A — 60 secondes (script unique)" if mode == "A" else "Mode B — Deep Diver (série de 3 vidéos)"

    prompt = f"""
Génère un script {mode_label} pour {period_label}.

DONNÉES MARCHÉ :
{json.dumps(market_summary, ensure_ascii=False, indent=2)}

SENTIMENT :
- Fear & Greed : {fear_greed.get('value', 50)} / 100 ({fear_greed.get('label', 'Neutral')})
- Heat Score CaptentDB : {heat_score} / 10

ACTUALITÉS HIGH-IMPACT :
{json.dumps(top_news, ensure_ascii=False, indent=2)}

CONTEXTE ADDITIONNEL (optionnel, fourni par l'admin) :
{custom_context or "Aucun contexte additionnel."}

INSTRUCTIONS VISUELLES pour chaque segment :
- Mentionne les VRAIS outils de CaptentDB (Dashboard, Analyse, Scanner, Heatmap, Fear & Greed)
- Propose des écrans spécifiques à filmer (ex: "Zoom sur le graphique BTC dans l'onglet Analyse de CaptentDB")
- Le watermark captentdb.fr doit être visible dans toutes les suggestions

Retourne UNIQUEMENT le JSON demandé, sans markdown, sans balises code.
"""
    return prompt.strip()


async def generate_script(
    snapshot: Dict,
    news: List[Dict],
    fear_greed: Dict,
    heat_score: float,
    period: str = "week",
    mode: str = "A",
    custom_context: str = "",
) -> Dict[str, Any]:
    """
    Generates the TikTok/Reels script using Gemini or a template fallback.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if api_key:
        return await _generate_with_gemini(
            api_key, snapshot, news, fear_greed, heat_score, period, mode, custom_context
        )
    else:
        logger.warning("GEMINI_API_KEY not set — using template fallback")
        return _generate_template(snapshot, news, fear_greed, heat_score, period, mode)


async def _generate_with_gemini(
    api_key: str,
    snapshot: Dict,
    news: List[Dict],
    fear_greed: Dict,
    heat_score: float,
    period: str,
    mode: str,
    custom_context: str,
) -> Dict[str, Any]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT if mode == "A" else MODE_B_SYSTEM_PROMPT,
        )

        user_prompt = _build_user_prompt(
            snapshot, news, fear_greed, heat_score, period, mode, custom_context
        )

        response = model.generate_content(
            user_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.85,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()
        # Clean potential markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip().rstrip("```").strip()

        data = json.loads(raw)
        data["generated_by"] = "gemini"
        return data

    except Exception as e:
        logger.error("Gemini generation failed: %s", e)
        return _generate_template(snapshot, news, fear_greed, heat_score, period, mode)


def _generate_template(
    snapshot: Dict,
    news: List[Dict],
    fear_greed: Dict,
    heat_score: float,
    period: str,
    mode: str,
) -> Dict[str, Any]:
    """
    Structured template fallback — no AI needed.
    Builds a coherent script from the market data directly.
    """
    period_label = {"day": "aujourd'hui", "week": "cette semaine", "month": "ce mois"}.get(period, "")
    fg_val = fear_greed.get("value", 50)
    fg_label = fear_greed.get("label", "Neutral")

    top_news_title = news[0]["title"] if news else "Les marchés bougent fort."

    # Get region tops/flops
    def _get(region_key, which):
        region = snapshot.get(region_key, {})
        asset = region.get(which)
        if not asset:
            return None, None
        sign = "+" if asset["change_pct"] >= 0 else ""
        return asset["name"], f"{sign}{asset['change_pct']:.1f}%"

    eu_top_name, eu_top_pct = _get("europe", "top")
    eu_flop_name, eu_flop_pct = _get("europe", "flop")
    us_top_name, us_top_pct = _get("usa", "top")
    us_flop_name, us_flop_pct = _get("usa", "flop")
    cr_top_name, cr_top_pct = _get("crypto", "top")
    cr_flop_name, cr_flop_pct = _get("crypto", "flop")

    heat_status = "stressé" if heat_score > 6 else ("calme" if heat_score < 4 else "directional")

    segments = [
        {
            "type": "geopolitique",
            "label": "Contexte macro",
            "text": f"Ce qu'on surveille {period_label} sur CaptentDB : {top_news_title}. "
                    f"Notre Heat Score est à {heat_score}/10 — marché {heat_status}.",
            "visual": f"Écran CaptentDB Dashboard — Heat Score gauge à {heat_score}/10 visible, watermark captentdb.fr",
            "duration_sec": 10,
        },
        {
            "type": "europe",
            "label": "Europe",
            "text": (
                f"En Europe {period_label} : "
                + (f"top performer {eu_top_name} à {eu_top_pct}. " if eu_top_name else "")
                + (f"Le flop c'est {eu_flop_name} à {eu_flop_pct}. " if eu_flop_name else "")
                + "J'ai filtré ça via le tableau de force relative de CaptentDB."
            ),
            "visual": "Écran CaptentDB — onglet Marchés > Europe, tableau Relative Strength visible, captentdb.fr watermark",
            "duration_sec": 12,
        },
        {
            "type": "usa",
            "label": "USA",
            "text": (
                f"Côté US : "
                + (f"{us_top_name} en tête à {us_top_pct}. " if us_top_name else "")
                + (f"À éviter : {us_flop_name} à {us_flop_pct}. " if us_flop_name else "")
                + "L'outil de détection de CaptentDB avait signalé cette rotation dès lundi."
            ),
            "visual": "Écran CaptentDB — Heatmap sectorielle US, XLK vs XLE comparaison, watermark captentdb.fr",
            "duration_sec": 12,
        },
        {
            "type": "crypto",
            "label": "Crypto",
            "text": (
                f"Crypto : Fear & Greed à {fg_val} — '{fg_label}'. "
                + (f"Top : {cr_top_name} {cr_top_pct}. " if cr_top_name else "")
                + (f"Flop : {cr_flop_name} {cr_flop_pct}. " if cr_flop_name else "")
                + "On surveille les niveaux de liquidité sur le scanner CaptentDB."
            ),
            "visual": "Écran CaptentDB — Fear & Greed gauge + graphique BTC en analyse, captentdb.fr watermark",
            "duration_sec": 12,
        },
        {
            "type": "cta",
            "label": "CTA",
            "text": "Si tu veux les niveaux exacts et la préparation d'ouverture de lundi matin, "
                    "le lien est en bio. On sort le brief complet sur CaptentDB chaque semaine.",
            "visual": "Logo CaptentDB plein écran, URL captentdb.fr en grand, animation dorée",
            "duration_sec": 8,
        },
    ]

    hook = (
        f"Le marché vient de faire {eu_flop_name or us_flop_name or 'quelque chose'} "
        f"à {eu_flop_pct or us_flop_pct or 'fort'}. "
        f"Voilà exactement ce qui s'est passé {period_label}."
    )

    return {
        "hook": hook,
        "segments": segments,
        "total_duration_sec": sum(s["duration_sec"] for s in segments),
        "mode": mode,
        "generated_by": "template",
    }
