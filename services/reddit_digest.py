"""
Reddit Digest Service
Scans finance-related Reddit posts, classifies beginner vs pro,
summarizes, and drafts suggested replies with a subtle site mention.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Tuple

from dotenv import load_dotenv

try:
    import praw
except Exception:  # pragma: no cover - optional until deps installed
    praw = None

try:
    from groq import Groq
except Exception:  # pragma: no cover - optional until deps installed
    Groq = None


load_dotenv()


@dataclass
class DigestConfig:
    reddit_client_id: str
    reddit_client_secret: str
    reddit_user_agent: str
    subreddits: List[str]
    keywords: List[str]
    lookback_hours: int
    max_posts: int
    allow_nsfw: bool
    min_score: int
    min_comments: int
    output_dir: str
    db_path: str
    reply_language: str
    site_url: str
    site_tagline: str
    groq_api_key: str
    groq_model: str


def _split_csv(value: str, fallback: List[str]) -> List[str]:
    if not value:
        return fallback
    return [v.strip() for v in value.split(",") if v.strip()]


def load_config() -> DigestConfig:
    subreddits_default = [
        "personalfinance",
        "financialplanning",
        "investing",
        "stocks",
        "trading",
        "cryptocurrency",
        "vosfinances",
        "finance",
        "bourse",
        "FranceFIRE",
    ]
    keywords_default = [
        "beginner",
        "debutant",
        "debuter",
        "start",
        "new to",
        "noob",
        "help",
        "budget",
        "epargne",
        "livret",
        "assurance vie",
        "ETF",
        "tracker",
        "PEA",
        "placements",
        "investir",
        "argent",
        "finance personnelle",
        "gestion argent",
        "credit",
        "dette",
        "loan",
        "mortgage",
        "emprunt",
    ]

    output_dir = os.getenv("REDDIT_DIGEST_OUT_DIR", "services/reddit_digest_out")
    db_path = os.getenv("REDDIT_DIGEST_DB_PATH", "database/reddit_digest.db")

    return DigestConfig(
        reddit_client_id=os.getenv("REDDIT_CLIENT_ID", ""),
        reddit_client_secret=os.getenv("REDDIT_CLIENT_SECRET", ""),
        reddit_user_agent=os.getenv("REDDIT_USER_AGENT", "captentdb-digest/1.0"),
        subreddits=_split_csv(os.getenv("REDDIT_SUBREDDITS", ""), subreddits_default),
        keywords=_split_csv(os.getenv("REDDIT_KEYWORDS", ""), keywords_default),
        lookback_hours=int(os.getenv("REDDIT_LOOKBACK_HOURS", "6")),
        max_posts=int(os.getenv("REDDIT_MAX_POSTS", "15")),
        allow_nsfw=os.getenv("REDDIT_ALLOW_NSFW", "false").lower() == "true",
        min_score=int(os.getenv("REDDIT_MIN_SCORE", "1")),
        min_comments=int(os.getenv("REDDIT_MIN_COMMENTS", "0")),
        output_dir=output_dir,
        db_path=db_path,
        reply_language=os.getenv("REDDIT_REPLY_LANGUAGE", "fr"),
        site_url=os.getenv("CAPTENTDB_SITE_URL", "https://captentdb.fr"),
        site_tagline=os.getenv(
            "CAPTENTDB_TAGLINE",
            "Un outil simple pour apprendre la finance et organiser ses decisions.",
        ),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    )


class RedditDigestService:
    def __init__(self, config: Optional[DigestConfig] = None):
        self.config = config or load_config()
        if praw is None:
            raise RuntimeError("praw is not installed. Please add it to requirements.txt.")
        self.reddit = praw.Reddit(
            client_id=self.config.reddit_client_id,
            client_secret=self.config.reddit_client_secret,
            user_agent=self.config.reddit_user_agent,
        )
        self.groq = None
        if self.config.groq_api_key and Groq is not None:
            self.groq = Groq(api_key=self.config.groq_api_key)

        os.makedirs(self.config.output_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.config.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.config.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS reddit_posts (
                    id TEXT PRIMARY KEY,
                    created_utc REAL,
                    subreddit TEXT,
                    title TEXT,
                    url TEXT,
                    author TEXT,
                    score INTEGER,
                    num_comments INTEGER,
                    is_nsfw INTEGER,
                    language TEXT,
                    classification TEXT,
                    summary TEXT,
                    suggested_reply TEXT,
                    last_seen_utc REAL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS reddit_runs (
                    run_id TEXT PRIMARY KEY,
                    run_utc REAL,
                    total_seen INTEGER,
                    total_selected INTEGER,
                    output_path TEXT
                )
                """
            )

    def run_digest(self) -> str:
        now = datetime.now(timezone.utc)
        lookback = now - timedelta(hours=self.config.lookback_hours)
        candidates = self._fetch_candidates(lookback)
        selected = self._filter_and_enrich(candidates)
        output_path = self._write_digest(now, selected)
        self._record_run(now, len(candidates), len(selected), output_path)
        return output_path

    def _fetch_candidates(self, lookback: datetime) -> List[Dict]:
        candidates: List[Dict] = []
        for name in self.config.subreddits:
            try:
                subreddit = self.reddit.subreddit(name)
                for post in subreddit.new(limit=200):
                    created = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
                    if created < lookback:
                        break
                    if not self.config.allow_nsfw and getattr(post, "over_18", False):
                        continue
                    if post.score < self.config.min_score:
                        continue
                    if post.num_comments < self.config.min_comments:
                        continue
                    if not self._keyword_match(post.title, post.selftext):
                        continue
                    if self._already_seen(post.id):
                        continue
                    candidates.append(
                        {
                            "id": post.id,
                            "created_utc": post.created_utc,
                            "subreddit": name,
                            "title": post.title or "",
                            "body": post.selftext or "",
                            "url": f"https://www.reddit.com{post.permalink}",
                            "author": str(post.author) if post.author else "unknown",
                            "score": int(post.score),
                            "num_comments": int(post.num_comments),
                            "is_nsfw": int(getattr(post, "over_18", False)),
                        }
                    )
            except Exception as exc:
                print(f"[REDDIT_DIGEST] Error reading r/{name}: {exc}")
                continue
        return candidates

    def _keyword_match(self, title: str, body: str) -> bool:
        text = f"{title}\n{body}".lower()
        return any(keyword.lower() in text for keyword in self.config.keywords)

    def _already_seen(self, post_id: str) -> bool:
        with sqlite3.connect(self.config.db_path) as conn:
            row = conn.execute(
                "SELECT 1 FROM reddit_posts WHERE id = ? LIMIT 1", (post_id,)
            ).fetchone()
        return row is not None

    def _filter_and_enrich(self, posts: List[Dict]) -> List[Dict]:
        enriched: List[Dict] = []
        for post in posts:
            summary, classification, reply = self._summarize_and_reply(post)
            if classification == "pro":
                continue
            post["summary"] = summary
            post["classification"] = classification
            post["suggested_reply"] = reply
            enriched.append(post)
            self._store_post(post)
            if len(enriched) >= self.config.max_posts:
                break
        return enriched

    def _summarize_and_reply(self, post: Dict) -> Tuple[str, str, str]:
        if not self.groq:
            classification = self._heuristic_classification(post)
            return self._fallback_summary(post), classification, self._fallback_reply(post)

        system_prompt = (
            "You are a helpful assistant that drafts Reddit replies and summaries. "
            "Keep tone natural and human. No financial advice. "
            "If mentioning the site, do it once, discreetly, at the end."
        )
        user_prompt = (
            "Classify the post audience as beginner or pro. "
            "Beginner means new to finance, budgeting, basics, or early investing. "
            "Pro means advanced topics, complex instruments, or heavy jargon. "
            "Return JSON with keys: summary, classification, suggested_reply. "
            "Reply language: {lang}. "
            "Site to mention if relevant: {site_url} with tagline: {tagline}.\n\n"
            "Post title: {title}\n"
            "Post body: {body}\n"
        ).format(
            lang=self.config.reply_language,
            site_url=self.config.site_url,
            tagline=self.config.site_tagline,
            title=post.get("title", ""),
            body=post.get("body", ""),
        )

        try:
            completion = self.groq.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=self.config.groq_model,
                temperature=0.6,
                max_tokens=600,
                top_p=0.9,
            )
            content = completion.choices[0].message.content or ""
            data = self._extract_json(content)
            summary = data.get("summary", "").strip()
            classification = data.get("classification", "").strip().lower()
            reply = data.get("suggested_reply", "").strip()
            if classification not in {"beginner", "pro"}:
                classification = "beginner"
            if not summary:
                summary = self._fallback_summary(post)
            if not reply:
                reply = self._fallback_reply(post)
            return summary, classification, reply
        except Exception as exc:
            print(f"[REDDIT_DIGEST] Groq error: {exc}")
            classification = self._heuristic_classification(post)
            return self._fallback_summary(post), classification, self._fallback_reply(post)

    def _extract_json(self, text: str) -> Dict:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, flags=re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    return {}
            return {}

    def _fallback_summary(self, post: Dict) -> str:
        body = (post.get("body") or "").strip()
        base = body.split("\n")[0] if body else ""
        trimmed = (base[:180] + "...") if len(base) > 180 else base
        return trimmed or post.get("title", "")

    def _heuristic_classification(self, post: Dict) -> str:
        text = f"{post.get('title', '')}\n{post.get('body', '')}".lower()
        pro_markers = [
            "options",
            "futures",
            "delta",
            "gamma",
            "theta",
            "iv",
            "volatility",
            "greeks",
            "leveraged",
            "margin",
            "short",
            "puts",
            "calls",
            "spread",
            "arbitrage",
            "quant",
            "order book",
            "macd",
            "rsi",
            "bollinger",
            "hedge",
            "drawdown",
            "algo",
            "backtest",
        ]
        beginner_markers = [
            "beginner",
            "debutant",
            "new to",
            "start",
            "budget",
            "epargne",
            "livret",
            "assurance vie",
            "pea",
            "etf",
            "tracker",
            "comment commencer",
            "help",
        ]
        if any(marker in text for marker in pro_markers):
            return "pro"
        if any(marker in text for marker in beginner_markers):
            return "beginner"
        return "beginner"

    def _fallback_reply(self, post: Dict) -> str:
        title = post.get("title", "").strip()
        if self.config.reply_language.lower().startswith("fr"):
            reply = [
                "Merci pour ta question.",
                "Si tu debutes, clarifie ton objectif (budget, epargne ou investissement) et ton horizon.",
                "Un plan simple et une petite checklist evitent beaucoup d'erreurs.",
                f"J'ai quelques ressources debutant ici : {self.config.site_url}",
            ]
            if title:
                reply[0] = f"Merci pour ta question sur \"{title}\"."
            return " ".join(reply)

        reply = [
            "Thanks for sharing this question.",
            "If you are just starting, clarify your goal (budgeting, saving, or investing) and your time horizon.",
            "A simple plan and a small checklist can help avoid costly mistakes.",
            f"I keep a few beginner-friendly resources here: {self.config.site_url}",
        ]
        if title:
            reply[0] = f"Thanks for the question about \"{title}\"."
        return " ".join(reply)

    def _store_post(self, post: Dict) -> None:
        with sqlite3.connect(self.config.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO reddit_posts (
                    id, created_utc, subreddit, title, url, author, score,
                    num_comments, is_nsfw, language, classification, summary,
                    suggested_reply, last_seen_utc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    post.get("id"),
                    post.get("created_utc"),
                    post.get("subreddit"),
                    post.get("title"),
                    post.get("url"),
                    post.get("author"),
                    post.get("score"),
                    post.get("num_comments"),
                    post.get("is_nsfw"),
                    self.config.reply_language,
                    post.get("classification"),
                    post.get("summary"),
                    post.get("suggested_reply"),
                    time.time(),
                ),
            )

    def _write_digest(self, now: datetime, posts: List[Dict]) -> str:
        timestamp = now.astimezone(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"reddit_digest_{timestamp}.md"
        output_path = os.path.join(self.config.output_dir, filename)
        lines: List[str] = []
        lines.append(f"# Reddit Digest ({timestamp} UTC)")
        lines.append("")
        lines.append(f"Total posts selected: {len(posts)}")
        lines.append("")
        for idx, post in enumerate(posts, start=1):
            lines.append(f"## {idx}. {post.get('title', '').strip()}")
            lines.append(f"- Subreddit: r/{post.get('subreddit')}")
            lines.append(f"- Score: {post.get('score')} | Comments: {post.get('num_comments')}")
            lines.append(f"- URL: {post.get('url')}")
            lines.append(f"- Classification: {post.get('classification')}")
            lines.append(f"- Summary: {post.get('summary')}")
            lines.append("")
            lines.append("Suggested reply:")
            lines.append("")
            lines.append(post.get("suggested_reply", ""))
            lines.append("")
            lines.append("---")
            lines.append("")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return output_path

    def _record_run(self, now: datetime, total_seen: int, total_selected: int, output_path: str) -> None:
        run_id = now.astimezone(timezone.utc).strftime("%Y%m%d_%H%M%S")
        with sqlite3.connect(self.config.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO reddit_runs (
                    run_id, run_utc, total_seen, total_selected, output_path
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (run_id, now.timestamp(), total_seen, total_selected, output_path),
            )


def run_once() -> str:
    service = RedditDigestService()
    return service.run_digest()
