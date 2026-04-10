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

# ─── CaptentDB tools reference ───────────────────────────────────────────────

CAPTENTDB_TOOLS = {
    "dashboard":  {"name": "Dashboard",  "url": "captentdb.fr/dashboard",  "desc": "Heat Score, alertes, vue globale P&L"},
    "markets":    {"name": "Marchés",    "url": "captentdb.fr/markets",    "desc": "Prix temps réel — Europe, USA, Crypto, Matières premières"},
    "analysis":   {"name": "Analyse",    "url": "captentdb.fr/analysis",   "desc": "Graphiques techniques interactifs"},
    "scanner":    {"name": "Scanner",    "url": "captentdb.fr/scanner",    "desc": "Filtre actifs par RSI, momentum, patterns"},
    "portfolio":  {"name": "Portfolio",  "url": "captentdb.fr/portfolio",  "desc": "Suivi positions réelles"},
    "wallet":     {"name": "Wallet",     "url": "captentdb.fr/wallet",     "desc": "Compte de trading simulé"},
    "tools":      {"name": "Outils",     "url": "captentdb.fr/tools",      "desc": "Calculateurs position, R/R, pip"},
    "favorites":  {"name": "Favoris",    "url": "captentdb.fr/favorites",  "desc": "Watchlist personnalisée"},
    "learn":      {"name": "Formation",  "url": "captentdb.fr/learn",      "desc": "Cours et stratégies"},
}

# Map segment type → tool most relevant to show in that section
SEGMENT_TOOL_MAP = {
    "geopolitique": "dashboard",
    "europe":       "markets",
    "usa":          "markets",
    "crypto":       "analysis",
    "commodities":  "scanner",
    "takeaway":     "scanner",
    "cta":          "dashboard",
}

# ─── Prompts ─────────────────────────────────────────────────────────────────

_TOOLS_LIST = "\n".join(
    f"  - {v['name']} ({v['url']}) : {v['desc']}"
    for v in CAPTENTDB_TOOLS.values()
)

SYSTEM_PROMPT = f"""Tu es un créateur de contenu financier expert pour CaptentDB (captentdb.fr).
Tu génères des scripts TikTok/Reels en FRANÇAIS pour positionner CaptentDB comme la référence premium en analyse de marché.

RÈGLES ABSOLUES :
- Jamais de "Bonjour" ou introduction générique IA
- Jamais de "En tant qu'IA" ou formules robotiques
- Style : naturel, rapide, "expert-pair" — tu parles à un trader semi-pro
- Jargon pro expliqué : "liquidity grab", "hawkish/dovish", "bull-trap", "rotation sectorielle", "flight-to-safety"
- Mentionne organiquement CaptentDB avec l'outil PRÉCIS concerné (voir liste ci-dessous)

OUTILS CAPTENTDB à référencer dans les visuels et le texte :
{_TOOLS_LIST}

EXEMPLES DE MENTIONS NATURELLES :
- "j'ai filtré ça via le Scanner de CaptentDB (captentdb.fr/scanner) — RSI oversold sur 4 actifs en même temps"
- "le Dashboard CaptentDB affiche un Heat Score de X/10 ce matin"
- "zoom sur le graphique dans l'onglet Analyse de captentdb.fr/analysis"
- "la heatmap des marchés sur captentdb.fr/markets montre clairement la rotation"
- "sur mon Portfolio CaptentDB, la position XYZ est en P&L positif"

CONTEXTE GÉOPOLITIQUE (OBLIGATOIRE) :
- Le segment "geopolitique" DOIT :
  * Nommer l'événement géopolitique/macro dominant (Fed, BCE, conflit, données éco...)
  * Expliquer le MÉCANISME D'IMPACT sur les marchés (ex: "hausse des taux → compression des multiples tech")
  * Relier l'actualité aux mouvements de prix constatés dans les données
  * Être le segment le plus dense en information (12-15 secondes)
  * Inclure le champ "geo_note" avec le mécanisme explicite

FORMAT DE SORTIE (JSON strict, sans markdown) :
{{
  "hook": "...",
  "geo_context": "1-2 phrases résumant le contexte géopolitique/macro dominant",
  "segments": [
    {{
      "type": "geopolitique|europe|usa|crypto|commodities|takeaway|cta",
      "label": "Label affiché",
      "text": "Texte du script — naturel, direct, prêt à être lu",
      "geo_note": "Mécanisme géopolitique/macro impactant ce segment (optionnel mais conseillé)",
      "visual": "Instruction visuelle détaillée pour le monteur",
      "tool_url": "captentdb.fr/xxx — outil précis à filmer",
      "tool_name": "Nom de l'outil CaptentDB",
      "duration_sec": 10
    }}
  ],
  "total_duration_sec": 60,
  "mode": "A"
}}
"""

MODE_B_SYSTEM_PROMPT = SYSTEM_PROMPT.replace('"mode": "A"', '"mode": "B"') + """
Pour Mode B (Deep Diver), génère 3 scripts séparés dans un tableau JSON :
[script_europe, script_usa, script_crypto]
Chaque script doit finir avec un bridge hook vers la vidéo suivante.
Retourne un JSON avec la clé "scripts": [...].
"""


# ─── Geopolitical context analyzer ──────────────────────────────────────────

def _analyze_geo(news: List[Dict], heat_score: float) -> Dict[str, str]:
    """
    Detects the dominant geopolitical / macro theme from the news feed
    and returns a context dict with theme, mechanism, and a script snippet.
    """
    if not news:
        return {
            "theme": "contexte macro global",
            "mechanism": "flux de capitaux inter-zones",
            "summary": f"Les marchés évoluent dans un contexte neutre — Heat Score CaptentDB : {heat_score}/10.",
            "geo_note": f"Pas d'événement macro dominant détecté. Heat Score : {heat_score}/10.",
        }

    all_titles = " ".join(n["title"].lower() for n in news[:8])

    themes: List[str] = []
    mechanism = ""

    if any(k in all_titles for k in ["fed", "bce", "ecb", "taux", "rate", "inflation", "hawkish", "dovish", "pivot", "monetary"]):
        themes.append("politique monétaire")
        mechanism = "décisions de taux → compression/expansion des multiples de valorisation"
    if any(k in all_titles for k in ["ukraine", "russie", "russia", "gaza", "moyen-orient", "chine", "taiwan", "guerre", "war", "sanctions", "conflit"]):
        themes.append("risque géopolitique militaire")
        mechanism = mechanism or "tensions géopolitiques → flight-to-safety (or, dollar, obligataires)"
    if any(k in all_titles for k in ["election", "trump", "biden", "macron", "élection", "vote", "congress", "sénat"]):
        themes.append("risque politique/électoral")
        mechanism = mechanism or "incertitude politique → prime de risque accrue sur les actifs"
    if any(k in all_titles for k in ["pétrole", "oil", "gaz", "gas", "opec", "energy", "énergie", "crude"]):
        themes.append("énergie")
        mechanism = mechanism or "prix de l'énergie → impact sur l'inflation et les marges corporatives"
    if any(k in all_titles for k in ["récession", "recession", "gdp", "pib", "chômage", "unemployment", "pmi", "ism", "nfp", "payroll"]):
        themes.append("cycle macro / données éco")
        mechanism = mechanism or "données économiques → repricing des anticipations de croissance"
    if any(k in all_titles for k in ["crise", "crash", "faillite", "bankruptcy", "défaut", "default", "bank", "banque"]):
        themes.append("risque systémique")
        mechanism = mechanism or "stress du système financier → contagion inter-marchés"

    if not themes:
        themes = ["contexte macro global"]
        mechanism = "flux de capitaux entre zones géographiques et classes d'actifs"

    top_event = news[0]["title"] if news else ""
    heat_status = "sous forte tension" if heat_score > 7 else ("sous tension" if heat_score > 5 else ("directionnel" if heat_score > 3 else "calme"))

    theme_str = " + ".join(themes[:2])
    summary = (
        f"{top_event} — "
        f"thème dominant : {theme_str}. "
        f"Mécanisme : {mechanism}. "
        f"Heat Score CaptentDB : {heat_score}/10 — marché {heat_status}."
    )

    return {
        "theme": theme_str,
        "mechanism": mechanism,
        "summary": summary,
        "geo_note": f"Thème : {theme_str} | Mécanisme : {mechanism} | Heat Score : {heat_score}/10",
    }


# ─── Prompt builder ──────────────────────────────────────────────────────────

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

    # Compact market summary
    market_summary: Dict = {}
    for region_key, region_data in snapshot.items():
        top = region_data.get("top")
        flop = region_data.get("flop")
        market_summary[region_key] = {
            "label": region_data.get("label", region_key),
            "top": {"name": top["name"], "change": f"{top['change_pct']:+.1f}%", "rsi": top["rsi"]} if top else None,
            "flop": {"name": flop["name"], "change": f"{flop['change_pct']:+.1f}%", "rsi": flop["rsi"]} if flop else None,
        }

    # Geopolitical analysis
    geo = _analyze_geo(news, heat_score)

    # All high/medium impact news (up to 6)
    impactful_news = [
        {"title": n["title"], "source": n["source"], "impact": n["impact"]}
        for n in news[:6]
        if n["impact"] in ("high", "medium")
    ]

    mode_label = "Mode A — 60 secondes (script unique)" if mode == "A" else "Mode B — Deep Diver (série de 3 vidéos)"

    prompt = f"""
Génère un script {mode_label} pour {period_label}.

═══ DONNÉES MARCHÉ ═══
{json.dumps(market_summary, ensure_ascii=False, indent=2)}

═══ SENTIMENT ═══
- Fear & Greed : {fear_greed.get('value', 50)} / 100 ({fear_greed.get('label', 'Neutral')})
- Heat Score CaptentDB : {heat_score} / 10

═══ ANALYSE GÉOPOLITIQUE / MACRO ═══
Thème dominant : {geo['theme']}
Mécanisme d'impact : {geo['mechanism']}
Résumé : {geo['summary']}

═══ ACTUALITÉS HIGH/MEDIUM IMPACT ═══
{json.dumps(impactful_news, ensure_ascii=False, indent=2)}

═══ CONSIGNES VISUELLES ═══
Pour chaque segment, propose un écran PRÉCIS de CaptentDB à filmer :
- Dashboard (captentdb.fr/dashboard) : Heat Score gauge, alertes actives
- Marchés (captentdb.fr/markets) : tableaux de prix par zone
- Analyse (captentdb.fr/analysis) : graphique d'un actif spécifique cité
- Scanner (captentdb.fr/scanner) : résultats de filtre RSI/momentum
- Portfolio (captentdb.fr/portfolio) : positions ouvertes

Renseigne "tool_url" et "tool_name" avec l'outil le plus pertinent pour chaque segment.
Le watermark captentdb.fr doit être visible dans toutes les suggestions visuelles.

═══ CONTEXTE ADDITIONNEL ═══
{custom_context or "Aucun contexte additionnel fourni."}

Retourne UNIQUEMENT le JSON demandé, sans markdown, sans balises code.
""".strip()
    return prompt


# ─── Gemini generation ───────────────────────────────────────────────────────

async def generate_script(
    snapshot: Dict,
    news: List[Dict],
    fear_greed: Dict,
    heat_score: float,
    period: str = "week",
    mode: str = "A",
    custom_context: str = "",
) -> Dict[str, Any]:
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


# ─── Template fallback ───────────────────────────────────────────────────────

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
    Builds a coherent, geopolitically-aware script from the market data directly.
    """
    period_label = {"day": "aujourd'hui", "week": "cette semaine", "month": "ce mois"}.get(period, "")
    fg_val = fear_greed.get("value", 50)
    fg_label = fear_greed.get("label", "Neutral")

    # Geopolitical analysis
    geo = _analyze_geo(news, heat_score)

    # Region tops/flops helper
    def _get(region_key: str, which: str):
        region = snapshot.get(region_key, {})
        asset = region.get(which)
        if not asset:
            return None, None
        sign = "+" if asset["change_pct"] >= 0 else ""
        return asset["name"], f"{sign}{asset['change_pct']:.1f}%"

    eu_top_name, eu_top_pct   = _get("europe", "top")
    eu_flop_name, eu_flop_pct = _get("europe", "flop")
    us_top_name, us_top_pct   = _get("usa", "top")
    us_flop_name, us_flop_pct = _get("usa", "flop")
    cr_top_name, cr_top_pct   = _get("crypto", "top")
    cr_flop_name, cr_flop_pct = _get("crypto", "flop")

    heat_status = "sous forte tension" if heat_score > 7 else ("sous tension" if heat_score > 5 else ("directionnel" if heat_score > 3 else "calme"))

    # ── Segment 1 : Géopolitique & Macro ──
    geo_top_news = news[0]["title"] if news else ""
    geo_text = (
        f"{geo_top_news} — voilà ce qui drive les marchés {period_label}. "
        f"Thème dominant : {geo['theme']}. "
        f"Mécanisme : {geo['mechanism']}. "
        f"Notre Heat Score sur le Dashboard CaptentDB est à {heat_score}/10 — marché {heat_status}."
    )

    segments = [
        {
            "type": "geopolitique",
            "label": "Géopolitique & Macro",
            "text": geo_text,
            "geo_note": geo["geo_note"],
            "visual": (
                f"Écran Dashboard CaptentDB (captentdb.fr/dashboard) — "
                f"Heat Score gauge {heat_score}/10 en premier plan, "
                f"flux d'actualités macro visible en arrière-plan, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["dashboard"]["url"],
            "tool_name": CAPTENTDB_TOOLS["dashboard"]["name"],
            "duration_sec": 13,
        },
        {
            "type": "europe",
            "label": "Europe",
            "text": (
                f"En Europe {period_label} : "
                + (f"top performer {eu_top_name} à {eu_top_pct}. " if eu_top_name else "")
                + (f"Le flop c'est {eu_flop_name} à {eu_flop_pct}. " if eu_flop_name else "")
                + "J'ai filtré ça via le tableau de force relative sur captentdb.fr/markets."
            ),
            "geo_note": f"Contexte : {geo['theme']} impacte les actifs européens via {geo['mechanism']}.",
            "visual": (
                f"Écran Marchés CaptentDB (captentdb.fr/markets) — "
                f"tableau Europe visible, {eu_top_name or 'top actif'} surligné en vert, "
                f"{eu_flop_name or 'flop actif'} en rouge, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["markets"]["url"],
            "tool_name": CAPTENTDB_TOOLS["markets"]["name"],
            "duration_sec": 12,
        },
        {
            "type": "usa",
            "label": "USA",
            "text": (
                f"Côté US : "
                + (f"{us_top_name} en tête à {us_top_pct}. " if us_top_name else "")
                + (f"À éviter : {us_flop_name} à {us_flop_pct}. " if us_flop_name else "")
                + "L'outil de détection CaptentDB avait signalé cette rotation — "
                + "le Scanner de captentdb.fr/scanner affiche les opportunités en temps réel."
            ),
            "geo_note": f"Contexte : {geo['theme']} crée une rotation sectorielle — chercher les secteurs défensifs vs cycliques.",
            "visual": (
                f"Écran Scanner CaptentDB (captentdb.fr/scanner) — "
                f"filtre RSI actif, {us_top_name or 'top actif US'} en première position, "
                f"colonnes momentum visibles, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["scanner"]["url"],
            "tool_name": CAPTENTDB_TOOLS["scanner"]["name"],
            "duration_sec": 12,
        },
        {
            "type": "crypto",
            "label": "Crypto",
            "text": (
                f"Crypto : Fear & Greed à {fg_val}/100 — '{fg_label}'. "
                + (f"Top : {cr_top_name} à {cr_top_pct}. " if cr_top_name else "")
                + (f"Flop : {cr_flop_name} à {cr_flop_pct}. " if cr_flop_name else "")
                + "On surveille les niveaux clés via l'Analyse de captentdb.fr/analysis — "
                + f"un {'marché Fear = opportunité pour les patients' if fg_val < 40 else 'marché Greed = prudence sur les entrées'}."
            ),
            "geo_note": f"Contexte crypto : sentiment Fear & Greed à {fg_val} — {geo['theme']} amplifie la volatilité crypto.",
            "visual": (
                f"Écran Analyse CaptentDB (captentdb.fr/analysis) — "
                f"graphique {cr_top_name or 'BTC'} avec niveaux de support/résistance, "
                f"Fear & Greed gauge en overlay, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["analysis"]["url"],
            "tool_name": CAPTENTDB_TOOLS["analysis"]["name"],
            "duration_sec": 12,
        },
        {
            "type": "cta",
            "label": "CTA",
            "text": (
                "Si tu veux les niveaux exacts, la préparation d'ouverture et les alertes en temps réel, "
                "tout est sur captentdb.fr — le lien est en bio. "
                "Dashboard, Scanner, Analyse : tous les outils pour trader comme un pro."
            ),
            "geo_note": None,
            "visual": "Logo CaptentDB plein écran, URL captentdb.fr animé en grand, CTA 'Lien en bio' en surimpression dorée",
            "tool_url": "captentdb.fr",
            "tool_name": "CaptentDB",
            "duration_sec": 8,
        },
    ]

    # Hook construction
    worst = eu_flop_name or us_flop_name or cr_flop_name or "les marchés"
    worst_pct = eu_flop_pct or us_flop_pct or cr_flop_pct or ""
    hook = (
        f"{worst} {worst_pct} {period_label}. "
        f"{geo_top_news[:60] + '...' if geo_top_news and len(geo_top_news) > 60 else geo_top_news} "
        f"Voilà exactement ce qu'il se passe et où sont les opportunités."
    ).strip()

    return {
        "hook": hook,
        "geo_context": geo["summary"],
        "segments": segments,
        "total_duration_sec": sum(s["duration_sec"] for s in segments),
        "mode": mode,
        "generated_by": "template",
    }
