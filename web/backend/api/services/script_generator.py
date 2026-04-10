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

# Geo detection rules: (keywords, theme_label, mechanism_template)
_GEO_RULES = [
    (
        ["fed", "federal reserve", "fomc", "powell", "rate hike", "rate cut",
         "interest rate", "taux directeur", "bce", "ecb", "lagarde",
         "hawkish", "dovish", "pivot", "quantitative", "inflation target"],
        "politique monétaire (Fed/BCE)",
        "décisions de taux → compression/expansion des multiples de valorisation → rotation growth↔value",
    ),
    (
        ["ukraine", "russia", "russie", "moscow", "kremlin", "zelenskyy",
         "nato", "otan", "nuclear", "nucléaire", "war in ukraine"],
        "guerre en Ukraine / Russie-OTAN",
        "conflit actif en Europe → perturbation énergie, hausse Or/Dollar, pression marchés EU",
    ),
    (
        ["israel", "hamas", "hezbollah", "iran", "iranian", "gaza",
         "west bank", "lebanon", "liban", "red sea", "houthi", "middle east", "moyen-orient"],
        "conflit Moyen-Orient",
        "instabilité régionale → risque pétrole, hausse Or, tension sur le Dollar",
    ),
    (
        ["taiwan", "taiwan strait", "china", "chine", "beijing", "xi jinping",
         "south china sea", "mer de chine", "pla", "military exercise"],
        "tensions Chine-Taiwan",
        "risque d'escalade en Asie → impact supply chains tech, pression marchés asiatiques",
    ),
    (
        ["north korea", "corée du nord", "kim jong", "icbm", "nuclear test"],
        "risque Corée du Nord",
        "provocation nucléaire → flight-to-safety, pression actifs risqués",
    ),
    (
        ["tariff", "tariffs", "droits de douane", "trade war", "guerre commerciale",
         "sanction", "sanctions", "embargo", "export controls", "protectionism"],
        "guerre commerciale / sanctions",
        "barrières commerciales → perturbation supply chains, pression marges corporatives, inflation importée",
    ),
    (
        ["oil", "pétrole", "crude", "brent", "wti", "opec", "opep",
         "energy crisis", "crise énergétique", "supply cut", "oil embargo"],
        "choc pétrolier / énergie",
        "prix énergie → inflation → pression banques centrales → risque stagflation",
    ),
    (
        ["recession", "récession", "gdp", "pib", "nfp", "non-farm payroll",
         "unemployment", "chômage", "pmi", "ism", "retail sales", "stagflation"],
        "cycle macro / risque récession",
        "données économiques faibles → repricing croissance → rotation défensive",
    ),
    (
        ["election", "élection", "trump", "vote", "congress", "sénat",
         "debt ceiling", "plafond dette", "government shutdown", "fiscal cliff"],
        "risque politique / fiscal",
        "incertitude politique → prime de risque, volatilité dollar, taux souverains",
    ),
    (
        ["bank failure", "faillite bancaire", "credit crunch", "contagion",
         "systemic risk", "risque systémique", "default", "défaut souverain",
         "crash", "circuit breaker", "liquidity crisis"],
        "risque systémique",
        "stress financier → contagion inter-marchés, fuite vers actifs refuges",
    ),
]


def _analyze_geo(
    news: List[Dict],
    heat_score: float,
    snapshot: Optional[Dict] = None,
) -> Dict[str, str]:
    """
    Builds a rich geopolitical/macro context from:
    1. News feed keyword matching (title + summary)
    2. Market-based inference (gold, oil, VIX, dollar, crypto divergence)

    Always produces a non-trivial, actionable geo analysis.
    """
    themes:    List[str] = []
    mechanisms: List[str] = []
    market_signals: List[str] = []
    top_news_title = news[0]["title"] if news else ""

    # ── 1. News-based detection ────────────────────────────────────────────
    # Scan title + summary of all news items (not just titles)
    all_text = " ".join(
        (n["title"] + " " + n.get("summary", "")).lower()
        for n in news[:10]
    )

    for keywords, theme, mechanism in _GEO_RULES:
        if any(kw in all_text for kw in keywords):
            themes.append(theme)
            mechanisms.append(mechanism)

    # ── 2. Market-based inference ──────────────────────────────────────────
    if snapshot:
        commodities_assets = snapshot.get("commodities", {}).get("assets", [])
        for asset in commodities_assets:
            n = asset["name"].lower()
            c = asset["change_pct"]
            # Gold rising → risk-off / geopolitical fear
            if ("or" in n or "gold" in n) and c > 1.2:
                signal = f"Or {c:+.1f}% → flight-to-safety actif"
                market_signals.append(signal)
                if "flight-to-safety" not in " ".join(themes):
                    themes.append("flight-to-safety (or en hausse)")
                    mechanisms.append(f"demande refuge sur l'or → risque géopolitique/macro élevé ({c:+.1f}%)")
            elif ("or" in n or "gold" in n) and c < -1.0:
                market_signals.append(f"Or {c:+.1f}% → appétit pour le risque en hausse")

            # Oil rising → energy/geopolitical tensions
            if ("pétrole" in n or "oil" in n or "wti" in n or "brent" in n) and c > 2.0:
                signal = f"Pétrole WTI {c:+.1f}% → tensions géopolitiques ou réduction offre OPEP"
                market_signals.append(signal)
                if "choc pétrolier" not in " ".join(themes):
                    themes.append("tensions énergétiques / pétrole")
                    mechanisms.append(f"hausse du pétrole ({c:+.1f}%) → inflation → pression BCE/Fed")
            elif ("pétrole" in n or "oil" in n or "wti" in n) and c < -2.5:
                market_signals.append(f"Pétrole {c:+.1f}% → crainte de récession / demande faible")

            # Dollar Index rising → risk-off / safe haven
            if "dollar" in n and c > 0.5:
                market_signals.append(f"Dollar Index {c:+.1f}% → demande de sécurité, pression émergents")

        # VIX check (in USA indices)
        usa_assets = snapshot.get("usa", {}).get("assets", [])
        for asset in usa_assets:
            if "vix" in asset["name"].lower():
                c = asset["change_pct"]
                lp = asset["last_price"]
                if lp > 25 or c > 10:
                    market_signals.append(f"VIX {lp:.0f} ({c:+.0f}%) → peur extrême sur les marchés")
                    if "volatilité extrême" not in " ".join(themes):
                        themes.append("volatilité extrême (VIX élevé)")
                        mechanisms.append("spike de volatilité → réallocation forcée, deleveraging")

        # Defense sector (XAR) vs Tech divergence → geopolitical rotation
        xar = next((a for a in usa_assets if "defense" in a["name"].lower() or "xar" in a["ticker"].lower()), None)
        xlk = next((a for a in usa_assets if "tech" in a["name"].lower() or "xlk" in a["ticker"].lower()), None)
        if xar and xlk:
            if xar["change_pct"] > 1.5 and xlk["change_pct"] < -1.0:
                market_signals.append(
                    f"Defense {xar['change_pct']:+.1f}% vs Tech {xlk['change_pct']:+.1f}% → rotation géopolitique classique"
                )
                if "rotation géopolitique" not in " ".join(themes):
                    themes.append("rotation géopolitique (defense vs tech)")
                    mechanisms.append("tensions militaires → rotation vers defense/énergie au détriment tech")

        # Crypto vs equities divergence
        crypto_assets = snapshot.get("crypto", {}).get("assets", [])
        eu_assets     = snapshot.get("europe", {}).get("assets", [])
        if crypto_assets and eu_assets:
            avg_crypto = sum(a["change_pct"] for a in crypto_assets[:3]) / min(3, len(crypto_assets))
            avg_eu     = sum(a["change_pct"] for a in eu_assets[:3]) / min(3, len(eu_assets))
            if avg_crypto < -5 and avg_eu > 0:
                market_signals.append("Crypto -5%+ alors que actions stables → risque-off sur actifs spéculatifs")
            elif avg_crypto > 8 and avg_eu < -1:
                market_signals.append("Crypto +8%+ découplée des actions → bull run crypto indépendant")

    # ── 3. Heat-score based fallback ───────────────────────────────────────
    heat_status = (
        "sous forte tension, prudence maximale" if heat_score > 7 else
        "sous tension, être sélectif"          if heat_score > 5 else
        "directionnel, chercher le momentum"   if heat_score > 3 else
        "calme, conditions favorables"
    )

    if not themes:
        # No clear event detected — produce a contextual market analysis anyway
        themes    = ["contexte macro global"]
        mechanisms = ["flux de capitaux entre zones géographiques et classes d'actifs"]

    # ── 4. Build output ────────────────────────────────────────────────────
    theme_str     = " + ".join(themes[:2])
    mechanism_str = mechanisms[0] if mechanisms else "flux de capitaux inter-marchés"

    # Full summary connecting news → mechanism → market impact
    summary_parts = []
    if top_news_title:
        summary_parts.append(top_news_title)
    summary_parts.append(f"Thème : {theme_str}")
    summary_parts.append(f"Mécanisme : {mechanism_str}")
    if market_signals:
        summary_parts.append("Signaux marché : " + " | ".join(market_signals[:3]))
    summary_parts.append(f"Heat Score : {heat_score}/10 — marché {heat_status}")

    summary = ". ".join(summary_parts) + "."

    geo_note = (
        f"🌍 Thème : {theme_str}\n"
        f"⚙️  Mécanisme : {mechanism_str}\n"
    )
    if market_signals:
        geo_note += f"📊 Signaux : {' | '.join(market_signals[:2])}\n"
    geo_note += f"🌡️  Heat Score : {heat_score}/10 — {heat_status}"

    return {
        "theme":      theme_str,
        "mechanism":  mechanism_str,
        "signals":    market_signals,
        "summary":    summary,
        "geo_note":   geo_note,
        "heat_status": heat_status,
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

    # Geopolitical analysis (uses both news + market snapshot)
    geo = _analyze_geo(news, heat_score, snapshot=snapshot)

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
Signaux de marché : {" | ".join(geo.get('signals', ['Aucun signal marché spécifique'])[:4])}
Résumé complet : {geo['summary']}

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

    # Geopolitical analysis (uses both news + market snapshot)
    geo = _analyze_geo(news, heat_score, snapshot=snapshot)

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

    heat_status = geo.get("heat_status", "directionnel")

    # ── Find commodity signals for contextual text ──
    commo_assets = snapshot.get("commodities", {}).get("assets", [])
    gold_asset   = next((a for a in commo_assets if "or" in a["name"].lower()), None)
    oil_asset    = next((a for a in commo_assets if "pétrole" in a["name"].lower() or "wti" in a["name"].lower()), None)
    geo_signals  = " ".join(geo.get("signals", [])[:2])

    # ── Segment 1 : Géopolitique & Macro ──
    geo_top_news  = news[0]["title"] if news else ""
    geo_top_news2 = news[1]["title"] if len(news) > 1 else ""

    # Build a concrete causal sentence: event → mechanism → price impact
    gold_context = ""
    if gold_asset:
        if gold_asset["change_pct"] > 1.2:
            gold_context = f" L'or monte {gold_asset['change_pct']:+.1f}% — les marchés cherchent des refuges."
        elif gold_asset["change_pct"] < -1.0:
            gold_context = f" L'or baisse {gold_asset['change_pct']:+.1f}% — appétit pour le risque."
    oil_context = ""
    if oil_asset:
        if oil_asset["change_pct"] > 2:
            oil_context = f" Le pétrole WTI à {oil_asset['change_pct']:+.1f}% — tensions sur l'offre."
        elif oil_asset["change_pct"] < -2:
            oil_context = f" Le pétrole WTI à {oil_asset['change_pct']:+.1f}% — anticipation de récession ou d'excès d'offre."

    geo_text = (
        f"{geo_top_news} "
        + (f"— et aussi : {geo_top_news2[:80]}. " if geo_top_news2 else "")
        + f"Ce qui se passe concrètement : {geo['mechanism']}."
        + gold_context
        + oil_context
        + f" Notre Heat Score CaptentDB est à {heat_score}/10 — marché {heat_status}."
    )

    # ── Geo note connecting events to price movements ──
    def _make_eu_geo_note():
        note = f"Impact {geo['theme']} sur l'Europe : {geo['mechanism']}."
        if eu_flop_name:
            note += f" {eu_flop_name} en souffrance ({eu_flop_pct}) — probable lien direct."
        if eu_top_name:
            note += f" {eu_top_name} résiste ({eu_top_pct}) — bénéficiaire du contexte."
        return note

    def _make_us_geo_note():
        note = f"Impact {geo['theme']} sur les USA : rotation sectorielle attendue."
        if us_top_name:
            note += f" {us_top_name} ({us_top_pct}) en tête — momentum momentum à surveiller."
        if us_flop_name:
            note += f" {us_flop_name} ({us_flop_pct}) délaissé — contexte défavorable."
        return note

    def _make_crypto_geo_note():
        crypto_sensitivity = (
            "Le crypto amplifie le risque-off : baisse attendue si tensions s'intensifient."
            if "risque" in geo["theme"] or "conflit" in geo["theme"] or "systémique" in geo["theme"]
            else "Contexte macro crane le crypto via le sentiment Fear & Greed."
        )
        return f"Fear & Greed : {fg_val}/100 — {fg_label}. {crypto_sensitivity}"

    segments = [
        {
            "type": "geopolitique",
            "label": "Géopolitique & Macro",
            "text": geo_text,
            "geo_note": geo["geo_note"],
            "visual": (
                f"Écran Dashboard CaptentDB (captentdb.fr/dashboard) — "
                f"Heat Score gauge {heat_score}/10 en premier plan, "
                f"headline d'actualité en overlay, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["dashboard"]["url"],
            "tool_name": CAPTENTDB_TOOLS["dashboard"]["name"],
            "duration_sec": 14,
        },
        {
            "type": "europe",
            "label": "Europe",
            "text": (
                f"En Europe {period_label} : "
                + (f"top performer {eu_top_name} à {eu_top_pct}. " if eu_top_name else "")
                + (f"Le flop c'est {eu_flop_name} à {eu_flop_pct} — " if eu_flop_name else "")
                + (f"directement lié à {geo['theme'].split('(')[0].strip()}. " if eu_flop_name else "")
                + "J'ai filtré ça via le tableau de force relative sur captentdb.fr/markets."
            ),
            "geo_note": _make_eu_geo_note(),
            "visual": (
                f"Écran Marchés CaptentDB (captentdb.fr/markets) — "
                f"tableau Europe, {eu_top_name or 'top actif'} vert / {eu_flop_name or 'flop actif'} rouge, "
                f"colonne change% visible, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["markets"]["url"],
            "tool_name": CAPTENTDB_TOOLS["markets"]["name"],
            "duration_sec": 11,
        },
        {
            "type": "usa",
            "label": "USA",
            "text": (
                f"Côté US : "
                + (f"{us_top_name} en tête à {us_top_pct}. " if us_top_name else "")
                + (f"À surveiller : {us_flop_name} à {us_flop_pct}. " if us_flop_name else "")
                + "Le Scanner CaptentDB (captentdb.fr/scanner) affiche les rotations sectorielles "
                + "en temps réel — filtre RSI + momentum."
            ),
            "geo_note": _make_us_geo_note(),
            "visual": (
                f"Écran Scanner CaptentDB (captentdb.fr/scanner) — "
                f"filtre RSI + momentum actif, liste triée par performance, "
                f"{us_top_name or 'top actif US'} en 1ère position, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["scanner"]["url"],
            "tool_name": CAPTENTDB_TOOLS["scanner"]["name"],
            "duration_sec": 11,
        },
        {
            "type": "crypto",
            "label": "Crypto",
            "text": (
                f"Crypto : Fear & Greed à {fg_val}/100 — '{fg_label}'. "
                + (f"{cr_top_name} {cr_top_pct}. " if cr_top_name else "")
                + (f"{cr_flop_name} {cr_flop_pct}. " if cr_flop_name else "")
                + ("Marché Fear = les patients accumulent. " if fg_val < 40 else
                   "Marché Greed = prudence sur les entrées, gérer les risques. " if fg_val > 65 else
                   "Sentiment neutre — chercher les niveaux techniques. ")
                + "Graphique sur captentdb.fr/analysis."
            ),
            "geo_note": _make_crypto_geo_note(),
            "visual": (
                f"Écran Analyse CaptentDB (captentdb.fr/analysis) — "
                f"graphique {cr_top_name or 'BTC'} / supports-résistances, "
                f"Fear & Greed {fg_val} en badge, watermark captentdb.fr"
            ),
            "tool_url": CAPTENTDB_TOOLS["analysis"]["url"],
            "tool_name": CAPTENTDB_TOOLS["analysis"]["name"],
            "duration_sec": 11,
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
