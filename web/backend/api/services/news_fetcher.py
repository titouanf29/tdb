"""
News fetcher — parses free RSS feeds to extract high-impact macro/financial news.
No API key required.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)

# Free RSS feeds — financial & macro focus
RSS_FEEDS = [
    {
        "name": "Reuters Business",
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "language": "en",
    },
    {
        "name": "Reuters Markets",
        "url": "https://feeds.reuters.com/reuters/financialNews",
        "language": "en",
    },
    {
        "name": "Le Monde Économie",
        "url": "https://www.lemonde.fr/economie/rss_full.xml",
        "language": "fr",
    },
    {
        "name": "Les Échos",
        "url": "https://feeds.lesechos.fr/lesechos-finance",
        "language": "fr",
    },
    {
        "name": "MarketWatch",
        "url": "https://feeds.marketwatch.com/marketwatch/topstories",
        "language": "en",
    },
]

# Keywords that signal high market impact
HIGH_IMPACT_KEYWORDS = [
    "fed", "federal reserve", "ecb", "bce", "rate", "inflation", "cpi", "pce",
    "gdp", "unemployment", "tariff", "trade war", "sanction", "oil", "opec",
    "nvidia", "bitcoin", "crypto", "earnings", "guidance", "recession",
    "geopolit", "ukraine", "israel", "iran", "taiwan", "china",
    "fomc", "powell", "lagarde", "hawkish", "dovish",
    "taux", "inflation", "banque centrale", "bourse", "actions",
]

MEDIUM_IMPACT_KEYWORDS = [
    "market", "stock", "equity", "bond", "yield", "dollar", "euro",
    "tech", "energy", "bank", "merger", "acquisition", "ipo",
    "marché", "croissance", "résultats", "fusion",
]


def _score_article(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for kw in HIGH_IMPACT_KEYWORDS:
        if kw in text:
            return "high"
    for kw in MEDIUM_IMPACT_KEYWORDS:
        if kw in text:
            return "medium"
    return "low"


async def _fetch_feed(session: httpx.AsyncClient, feed: Dict) -> List[Dict]:
    try:
        resp = await session.get(feed["url"], timeout=8, follow_redirects=True)
        resp.raise_for_status()

        # Parse XML manually (lightweight, no feedparser dependency needed at runtime)
        import xml.etree.ElementTree as ET
        root = ET.fromstring(resp.text)

        items = []
        # Handle both RSS 2.0 (<rss><channel><item>) and Atom (<feed><entry>)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall(".//item") or root.findall(".//atom:entry", ns)

        for entry in entries[:10]:
            def _text(tag):
                el = entry.find(tag) or entry.find(f"atom:{tag}", ns)
                return el.text.strip() if el is not None and el.text else ""

            title = _text("title")
            summary = _text("description") or _text("summary")
            pub_date = _text("pubDate") or _text("published") or _text("updated")
            link = _text("link")

            if not title:
                continue

            impact = _score_article(title, summary)
            items.append({
                "title": title[:200],
                "summary": summary[:400],
                "source": feed["name"],
                "language": feed["language"],
                "pub_date": pub_date,
                "link": link,
                "impact": impact,
            })

        return items

    except Exception as e:
        logger.warning("Feed fetch failed (%s): %s", feed["name"], e)
        return []


async def get_macro_news(max_items: int = 8) -> List[Dict[str, Any]]:
    """
    Fetch and rank macro/financial news from free RSS feeds.
    Returns up to max_items articles sorted by impact (high first).
    """
    async with httpx.AsyncClient(headers={"User-Agent": "CaptentDB/1.0"}) as session:
        tasks = [_fetch_feed(session, feed) for feed in RSS_FEEDS]
        results = await asyncio.gather(*tasks)

    all_articles = []
    seen_titles = set()
    for batch in results:
        for article in batch:
            # Deduplicate by title similarity
            key = article["title"][:60].lower()
            if key not in seen_titles:
                seen_titles.add(key)
                all_articles.append(article)

    # Sort: high impact first, then medium, then low
    order = {"high": 0, "medium": 1, "low": 2}
    all_articles.sort(key=lambda x: order.get(x["impact"], 2))

    return all_articles[:max_items]
