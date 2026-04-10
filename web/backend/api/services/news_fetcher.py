"""
News fetcher — parses free RSS feeds to extract high-impact macro/financial/geopolitical news.
No API key required.

Reuters feeds are deprecated (404). Replaced with BBC, CNBC, MarketWatch, NYT, FXStreet, Le Monde.
"""
import asyncio
import logging
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)

# ─── RSS feeds ────────────────────────────────────────────────────────────────
# Prioritise coverage: business/macro + world/geopolitics in EN and FR
RSS_FEEDS = [
    {
        "name": "BBC Business",
        "url": "https://feeds.bbci.co.uk/news/business/rss.xml",
        "language": "en",
        "category": "business",
    },
    {
        "name": "BBC World",
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "language": "en",
        "category": "geopolitics",
    },
    {
        "name": "MarketWatch",
        "url": "https://feeds.marketwatch.com/marketwatch/topstories",
        "language": "en",
        "category": "markets",
    },
    {
        "name": "CNBC Markets",
        "url": "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        "language": "en",
        "category": "markets",
    },
    {
        "name": "NYT Business",
        "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
        "language": "en",
        "category": "business",
    },
    {
        "name": "FXStreet",
        "url": "https://www.fxstreet.com/rss/news",
        "language": "en",
        "category": "forex",
    },
    {
        "name": "Le Monde Économie",
        "url": "https://www.lemonde.fr/economie/rss_full.xml",
        "language": "fr",
        "category": "business",
    },
    {
        "name": "Le Monde International",
        "url": "https://www.lemonde.fr/international/rss_full.xml",
        "language": "fr",
        "category": "geopolitics",
    },
]

# ─── Impact keywords ──────────────────────────────────────────────────────────

HIGH_IMPACT_KEYWORDS = [
    # Banques centrales / politique monétaire
    "fed", "federal reserve", "ecb", "bce", "bank of england", "boj", "banque centrale",
    "interest rate", "taux directeur", "inflation", "cpi", "pce", "ppi",
    "fomc", "powell", "lagarde", "hawkish", "dovish", "pivot", "rate hike", "rate cut",
    "quantitative tightening", "quantitative easing", "qe", "qt",
    # Données macro
    "gdp", "pib", "unemployment", "chômage", "nfp", "non-farm payroll", "pmi", "ism",
    "retail sales", "recession", "récession", "stagflation", "deflation",
    # Commerce / sanctions
    "tariff", "tariffs", "droits de douane", "trade war", "guerre commerciale",
    "sanction", "sanctions", "embargo", "export controls", "blacklist",
    # ─── GÉOPOLITIQUE : conflits militaires ───
    "war", "guerre", "warfare", "military", "armed forces", "army",
    "missile", "missiles", "rocket", "bomb", "bombing", "airstrike", "drone attack",
    "attack", "attaque", "offensive", "invasion", "occupied",
    "ceasefire", "cease-fire", "armistice", "truce", "peace talks",
    "troops", "soldiers", "nato", "otan", "alliance militaire",
    # Zones de conflit
    "ukraine", "russia", "russie", "moscow", "moscou", "kremlin", "zelenskyy",
    "israel", "israel-hamas", "hamas", "hezbollah", "iran", "iranian",
    "gaza", "west bank", "lebanon", "liban", "beirut",
    "middle east", "moyen-orient", "red sea", "mer rouge", "houthi",
    "taiwan", "taiwan strait", "china", "chine", "beijing", "xi jinping",
    "south china sea", "mer de chine", "north korea", "corée du nord", "kim jong",
    "india", "pakistan", "kashmir", "myanmar", "sudan", "soudan", "sahel",
    "syria", "syrie", "iraq", "irak",
    # Risque politique
    "election", "élection", "trump", "biden", "vote", "congress", "sénat",
    "coup", "putsch", "protest", "manifestation", "civil unrest",
    "debt ceiling", "plafond dette", "government shutdown", "défaut souverain",
    "sovereign default", "budget", "stimulus", "bailout",
    # Énergie / matières premières
    "oil", "pétrole", "crude", "brent", "wti", "opec", "opep",
    "gas", "gaz", "lng", "natural gas", "energy crisis", "crise énergétique",
    "gold", "or", "silver", "argent", "commodity", "matières premières",
    # Marchés / systémique
    "crash", "selloff", "vente massive", "correction", "bear market", "bull market",
    "circuit breaker", "volatility", "volatilité", "vix", "fear",
    "bitcoin", "crypto", "cryptocurrency", "nvidia", "earnings",
    "bank failure", "faillite bancaire", "credit crunch", "contagion",
]

MEDIUM_IMPACT_KEYWORDS = [
    "market", "stock", "equity", "bond", "yield", "dollar", "euro",
    "tech", "energy", "bank", "merger", "acquisition", "ipo",
    "earnings", "résultats", "guidance", "profit warning",
    "marché", "croissance", "fusion", "bourse", "actions", "obligations",
    "dollar", "forex", "currency", "devise",
    "real estate", "immobilier", "housing", "supply chain",
]


# ─── Scoring ──────────────────────────────────────────────────────────────────

def _score_article(title: str, summary: str) -> str:
    # Scan BOTH title and summary for maximum detection coverage
    text = (title + " " + summary).lower()
    for kw in HIGH_IMPACT_KEYWORDS:
        if kw in text:
            return "high"
    for kw in MEDIUM_IMPACT_KEYWORDS:
        if kw in text:
            return "medium"
    return "low"


# ─── Feed fetcher ─────────────────────────────────────────────────────────────

async def _fetch_feed(session: httpx.AsyncClient, feed: Dict) -> List[Dict]:
    try:
        resp = await session.get(feed["url"], timeout=10, follow_redirects=True)
        resp.raise_for_status()

        import xml.etree.ElementTree as ET
        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError:
            # Some feeds return slightly malformed XML — try with encoding header stripped
            cleaned = resp.text.replace('<?xml version="1.0" encoding="UTF-8"?>', "")
            root = ET.fromstring(cleaned)

        items: List[Dict] = []
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall(".//item") or root.findall(".//atom:entry", ns)

        for entry in entries[:12]:
            def _text(tag: str) -> str:
                el = entry.find(tag) or entry.find(f"atom:{tag}", ns)
                return (el.text or "").strip() if el is not None else ""

            title   = _text("title")
            summary = _text("description") or _text("summary") or _text("content")
            pub     = _text("pubDate") or _text("published") or _text("updated")
            link    = _text("link")

            if not title:
                continue

            impact = _score_article(title, summary)
            items.append({
                "title":    title[:200],
                "summary":  summary[:500],
                "source":   feed["name"],
                "language": feed["language"],
                "category": feed.get("category", "general"),
                "pub_date": pub,
                "link":     link,
                "impact":   impact,
            })

        logger.debug("Feed %s → %d items", feed["name"], len(items))
        return items

    except Exception as e:
        logger.warning("Feed fetch failed (%s): %s", feed["name"], e)
        return []


# ─── Public API ───────────────────────────────────────────────────────────────

async def get_macro_news(max_items: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch and rank macro/financial/geopolitical news from free RSS feeds.
    Returns up to max_items articles sorted by impact (high first).
    """
    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 CaptentDB/2.0"},
        timeout=12,
    ) as session:
        results = await asyncio.gather(
            *[_fetch_feed(session, feed) for feed in RSS_FEEDS],
            return_exceptions=True,
        )

    all_articles: List[Dict] = []
    seen: set = set()

    for batch in results:
        if isinstance(batch, Exception):
            continue
        for article in batch:
            key = article["title"][:60].lower()
            if key not in seen:
                seen.add(key)
                all_articles.append(article)

    # Sort: high → medium → low; within same impact keep geopolitics first
    cat_order = {"geopolitics": 0, "forex": 1, "markets": 2, "business": 3, "general": 4}
    impact_order = {"high": 0, "medium": 1, "low": 2}
    all_articles.sort(key=lambda x: (impact_order.get(x["impact"], 2), cat_order.get(x.get("category", "general"), 4)))

    logger.info("News fetch: %d total articles, %d high-impact",
                len(all_articles),
                sum(1 for a in all_articles if a["impact"] == "high"))

    return all_articles[:max_items]
