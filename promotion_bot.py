"""
Bot de Promotion captentdb.fr — Sans API Reddit (scraping JSON public)
======================================================================
Fonctionne sans créer d'app Reddit :
  • Mode ALERTE  : scanne Reddit et t'envoie les liens sur Telegram pour poster manuellement
  • Mode AUTO    : poste automatiquement (nécessite compte >30j avec karma)

Variables d'environnement (.env) :
  ADMIN_TELEGRAM_TOKEN   → Token du bot Telegram
  NOTIFICATION_CHAT_ID   → ID du channel/groupe pour les alertes (-1003781965332)
  ADMIN_USER_ID          → Ton ID Telegram perso pour les commandes (2064575502)
  REDDIT_USERNAME        → (optionnel) Compte Reddit pour le mode auto
  REDDIT_PASSWORD        → (optionnel) Mot de passe Reddit pour le mode auto
  AUTO_POST_MODE         → "true" pour poster automatiquement (défaut: false = mode alerte)
  DRY_RUN                → "true" pour tester sans poster
  SCAN_INTERVAL_SECONDS  → Intervalle entre cycles (défaut: 600)
"""

import asyncio
import logging
import os
import sys
import json
import random
import time
import re
from datetime import datetime
from typing import Optional
import aiohttp
from dotenv import load_dotenv

load_dotenv()

# ─── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("promotion_bot.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("promotion_bot")

# ─── Config ────────────────────────────────────────────────────────────────────
ADMIN_TELEGRAM_TOKEN  = os.getenv("ADMIN_TELEGRAM_TOKEN", os.getenv("TELEGRAM_TOKEN", ""))
# Channel/groupe qui reçoit toutes les alertes et rapports
NOTIFICATION_CHAT_ID  = os.getenv("NOTIFICATION_CHAT_ID", os.getenv("ADMIN_CHAT_ID", ""))
# Ton ID Telegram perso — seul autorisé à envoyer des commandes au bot
ADMIN_USER_ID         = os.getenv("ADMIN_USER_ID", os.getenv("ADMIN_CHAT_ID", ""))
REDDIT_USERNAME       = os.getenv("REDDIT_USERNAME", "")
REDDIT_PASSWORD       = os.getenv("REDDIT_PASSWORD", "")
AUTO_POST_MODE        = os.getenv("AUTO_POST_MODE", "false").lower() == "true"
DRY_RUN               = os.getenv("DRY_RUN", "false").lower() == "true"
SCAN_INTERVAL         = int(os.getenv("SCAN_INTERVAL_SECONDS", "600"))
MIN_DELAY_POSTS       = int(os.getenv("MIN_DELAY_BETWEEN_POSTS", "900"))
MAX_POSTS_HOUR        = int(os.getenv("MAX_POSTS_PER_HOUR", "2"))

SEEN_IDS_FILE  = "data/seen_posts.json"
STATS_FILE     = "data/promo_stats.json"
ALERTS_FILE    = "data/pending_alerts.json"

# Headers pour éviter d'être bloqué comme bot
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

# ─── Subreddits ────────────────────────────────────────────────────────────────
SUBREDDITS = [
    # Français
    ("bourse",         "fr"),
    ("investissement",  "fr"),
    ("finances_perso",  "fr"),
    ("cryptomonnaie",   "fr"),
    ("trading",         "fr"),
    ("BitcoinFrance",   "fr"),
    ("france",          "fr"),
    # Anglais
    ("algotrading",     "en"),
    ("Daytrading",      "en"),
    ("papertrading",    "en"),
    ("learntrading",    "en"),
    ("stocks",          "en"),
    ("investing",       "en"),
    ("CryptoCurrency",  "en"),
    ("Forex",           "en"),
    ("StockMarket",     "en"),
    ("options",         "en"),
]

# ─── Mots-clés ─────────────────────────────────────────────────────────────────
KEYWORDS_FR = [
    "paper trading", "trading virtuel", "simulateur trading", "apprendre trading",
    "bot trading", "analyse technique", "indicateurs techniques", "trading gratuit",
    "backtesting", "screener", "scanner marché", "trading débutant", "trader débutant",
    "comment trader", "apprendre à trader", "signal trading", "trading pratique",
]
KEYWORDS_EN = [
    "paper trading", "virtual trading", "trading simulator", "learn trading",
    "trading bot", "technical analysis", "trading indicators", "backtesting",
    "algo trading", "trading signal", "market screener", "stock scanner",
    "crypto trading bot", "forex bot", "trading practice", "free trading tool",
    "beginner trading", "how to trade",
]

# ─── Messages de promotion ─────────────────────────────────────────────────────
PROMO_FR = [
    "Bonne question ! Pour pratiquer sans risque, je recommande **captentdb.fr** — "
    "c'est un bot Telegram de paper trading avec analyse IA complète (RSI, MACD, Bollinger Bands, "
    "scoring multi-timeframes). Entièrement gratuit pour tester ses stratégies. 📊",

    "Si tu cherches à t'entraîner sans perdre d'argent réel, **captentdb.fr** propose "
    "un simulateur de trading avec 10 000 $ virtuels, levier jusqu'à 10x, TP/SL automatiques "
    "et un scanner de marchés IA. Parfait pour débuter ou tester des stratégies. 🎯",

    "Pour pratiquer l'analyse technique, j'utilise **captentdb.fr** — bot Telegram gratuit "
    "avec paper trading, indicateurs (RSI, MACD, Bollinger...) et assistant IA conversationnel. "
    "Idéal pour progresser avant de passer en réel. 📈",
]
PROMO_EN = [
    "Good question! For risk-free practice, I'd recommend **captentdb.fr** — "
    "it's a Telegram paper trading bot with full AI analysis: RSI, MACD, Bollinger Bands, "
    "multi-timeframe scoring. Completely free to test strategies. 📊",

    "If you want to practice without real risk, **captentdb.fr** offers a simulator with "
    "$10,000 virtual balance, up to 10x leverage, automatic TP/SL and an AI market scanner. "
    "Great for beginners or testing strategies before going live. 🎯",

    "To practice technical analysis risk-free, I use **captentdb.fr** — free Telegram bot with "
    "paper trading, indicators (RSI, MACD, Bollinger...) and an AI assistant. "
    "Perfect for improving skills before trading real money. 📈",
]


# ─── Persistance ───────────────────────────────────────────────────────────────
def _ensure_data_dir():
    os.makedirs("data", exist_ok=True)

def load_seen_ids() -> set:
    _ensure_data_dir()
    try:
        with open(SEEN_IDS_FILE) as f:
            data = json.load(f)
            ids = set(data.get("ids", []))
            return set(list(ids)[-20_000:]) if len(ids) > 20_000 else ids
    except Exception:
        return set()

def save_seen_ids(ids: set):
    _ensure_data_dir()
    try:
        with open(SEEN_IDS_FILE, "w") as f:
            json.dump({"ids": list(ids), "updated": datetime.now().isoformat()}, f)
    except Exception as e:
        logger.warning(f"save_seen_ids: {e}")

def load_stats() -> dict:
    _ensure_data_dir()
    try:
        with open(STATS_FILE) as f:
            return json.load(f)
    except Exception:
        return {"scanned": 0, "alerts_sent": 0, "posted": 0, "errors": 0,
                "cycles": 0, "started": datetime.now().isoformat(), "last_alert": None}

def save_stats(s: dict):
    _ensure_data_dir()
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(s, f, indent=2)
    except Exception as e:
        logger.warning(f"save_stats: {e}")

def load_pending_alerts() -> list:
    _ensure_data_dir()
    try:
        with open(ALERTS_FILE) as f:
            return json.load(f).get("alerts", [])
    except Exception:
        return []

def save_pending_alerts(alerts: list):
    _ensure_data_dir()
    try:
        with open(ALERTS_FILE, "w") as f:
            json.dump({"alerts": alerts[-100:]}, f, indent=2)
    except Exception as e:
        logger.warning(f"save_pending_alerts: {e}")


# ─── Telegram ──────────────────────────────────────────────────────────────────
async def tg_send(text: str, reply_markup: dict = None):
    """Envoie une notification dans le channel/groupe dédié."""
    if not NOTIFICATION_CHAT_ID or not ADMIN_TELEGRAM_TOKEN:
        return
    try:
        url = f"https://api.telegram.org/bot{ADMIN_TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": NOTIFICATION_CHAT_ID,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False,
        }
        if reply_markup:
            payload["reply_markup"] = json.dumps(reply_markup)

        async with aiohttp.ClientSession() as s:
            async with s.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status != 200:
                    body = await r.text()
                    logger.warning(f"tg_send échoué {r.status}: {body[:100]}")
    except Exception as e:
        logger.warning(f"tg_send: {e}")


async def tg_send_alert(post: dict, promo_msg: str):
    """
    Mode ALERTE : envoie à l'admin le lien du post avec le message à copier-coller.
    """
    lang_flag = "🇫🇷" if post["lang"] == "fr" else "🇬🇧"
    text = (
        f"🔔 *Post pertinent détecté !*\n\n"
        f"{lang_flag} r/{post['subreddit']}\n"
        f"📌 _{post['title'][:80]}_\n"
        f"🔗 {post['url']}\n\n"
        f"💬 *Message à poster :*\n"
        f"```\n{promo_msg}\n```"
    )
    # Bouton raccourci vers le post Reddit
    markup = {
        "inline_keyboard": [[
            {"text": "📖 Voir le post Reddit", "url": post["url"]}
        ]]
    }
    await tg_send(text, reply_markup=markup)


# ─── Reddit JSON scraper (sans API) ────────────────────────────────────────────
async def fetch_subreddit_new(session: aiohttp.ClientSession,
                               subreddit: str, limit: int = 25) -> list[dict]:
    """
    Récupère les derniers posts d'un subreddit via l'API JSON publique.
    Aucune authentification requise.
    """
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}&raw_json=1"
    try:
        async with session.get(url, headers=HEADERS,
                                timeout=aiohttp.ClientTimeout(total=15)) as r:
            if r.status == 429:
                logger.warning(f"Rate limit Reddit r/{subreddit} — pause 60s")
                await asyncio.sleep(60)
                return []
            if r.status != 200:
                logger.warning(f"r/{subreddit} HTTP {r.status}")
                return []
            data = await r.json()
            posts = data.get("data", {}).get("children", [])
            return [p["data"] for p in posts]
    except Exception as e:
        logger.warning(f"fetch r/{subreddit}: {e}")
        return []


def is_relevant(title: str, body: str, lang: str) -> bool:
    """Détecte si un post est pertinent pour la promotion."""
    text = (title + " " + (body or "")).lower()
    if "captentdb" in text:
        return False
    keywords = KEYWORDS_FR if lang == "fr" else KEYWORDS_EN
    return any(kw in text for kw in keywords)


# ─── Poster un commentaire (mode auto, nécessite compte Reddit) ────────────────
class RedditSession:
    """Session Reddit via cookies (sans app OAuth, juste username/password)."""

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.logged_in = False
        self.modhash = ""

    async def login(self) -> bool:
        if not REDDIT_USERNAME or not REDDIT_PASSWORD:
            return False
        try:
            self.session = aiohttp.ClientSession(headers={
                **HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
            })
            url = "https://www.reddit.com/api/login"
            data = {
                "user": REDDIT_USERNAME,
                "passwd": REDDIT_PASSWORD,
                "api_type": "json",
            }
            async with self.session.post(url, data=data,
                                          timeout=aiohttp.ClientTimeout(total=15)) as r:
                resp = await r.json()
                errors = resp.get("json", {}).get("errors", [])
                if errors:
                    logger.error(f"Login Reddit échoué: {errors}")
                    return False
                self.modhash = resp.get("json", {}).get("data", {}).get("modhash", "")
                self.logged_in = True
                logger.info(f"✅ Reddit connecté: u/{REDDIT_USERNAME}")
                return True
        except Exception as e:
            logger.error(f"Login Reddit exception: {e}")
            return False

    async def post_comment(self, post_fullname: str, text: str) -> bool:
        """Poste un commentaire sur un post Reddit."""
        if not self.logged_in or not self.session:
            return False
        try:
            url = "https://www.reddit.com/api/comment"
            data = {
                "api_type": "json",
                "text": text,
                "thing_id": post_fullname,
                "uh": self.modhash,
            }
            async with self.session.post(url, data=data,
                                          timeout=aiohttp.ClientTimeout(total=15)) as r:
                resp = await r.json()
                errors = resp.get("json", {}).get("errors", [])
                if errors:
                    logger.warning(f"Erreur post comment: {errors}")
                    return False
                return True
        except Exception as e:
            logger.error(f"post_comment: {e}")
            return False

    async def close(self):
        if self.session:
            await self.session.close()


# ─── Bot principal ─────────────────────────────────────────────────────────────
class PromotionBot:

    def __init__(self):
        self.seen_ids   = load_seen_ids()
        self.stats      = load_stats()
        self.stats["started"] = datetime.now().isoformat()
        self.running    = False
        self.paused     = False
        self.last_post  = 0.0
        self.posts_hour = 0
        self.hour_reset = time.time()
        self.reddit_session = RedditSession()

    def _can_post(self) -> bool:
        now = time.time()
        if now - self.hour_reset > 3600:
            self.posts_hour = 0
            self.hour_reset = now
        return self.posts_hour < MAX_POSTS_HOUR and (now - self.last_post) >= MIN_DELAY_POSTS

    async def _process_post(self, post_data: dict, lang: str,
                             http: aiohttp.ClientSession) -> Optional[dict]:
        """Traite un post Reddit et décide si on alerte / poste."""
        post_id = post_data.get("id", "")
        if not post_id or post_id in self.seen_ids:
            return None

        # Ignorer posts trop vieux (> 48h)
        created = post_data.get("created_utc", 0)
        if time.time() - created > 172_800:
            return None

        title = post_data.get("title", "")
        body  = post_data.get("selftext", "")
        sub   = post_data.get("subreddit", "")
        perma = post_data.get("permalink", "")
        full  = post_data.get("name", f"t3_{post_id}")   # ex: "t3_abc123"

        self.stats["scanned"] += 1

        if not is_relevant(title, body, lang):
            return None

        promo = random.choice(PROMO_FR if lang == "fr" else PROMO_EN)
        result = {
            "id":        post_id,
            "fullname":  full,
            "subreddit": sub,
            "title":     title[:100],
            "url":       f"https://reddit.com{perma}",
            "lang":      lang,
            "time":      datetime.now().isoformat(),
        }

        self.seen_ids.add(post_id)

        # ── Mode AUTO ──────────────────────────────────────────────────────────
        if AUTO_POST_MODE and self._can_post():
            if DRY_RUN:
                logger.info(f"[DRY RUN] Auto-post sur r/{sub}: {title[:60]}")
                result["action"] = "dry_run"
            else:
                ok = await self.reddit_session.post_comment(full, promo)
                if ok:
                    self.posts_hour += 1
                    self.last_post = time.time()
                    self.stats["posted"] += 1
                    self.stats["last_alert"] = result["time"]
                    result["action"] = "posted"
                    logger.info(f"✅ Commentaire posté r/{sub}: {title[:60]}")
                else:
                    result["action"] = "post_failed"
                    self.stats["errors"] += 1

        # ── Mode ALERTE (défaut) ───────────────────────────────────────────────
        else:
            result["action"] = "alert"
            result["promo_msg"] = promo
            await tg_send_alert(result, promo)
            self.stats["alerts_sent"] += 1
            self.stats["last_alert"] = result["time"]
            logger.info(f"🔔 Alerte envoyée r/{sub}: {title[:60]}")

        return result

    async def run_cycle(self, http: aiohttp.ClientSession) -> list[dict]:
        """Un cycle complet de scan de tous les subreddits."""
        results = []
        subs = list(SUBREDDITS)
        random.shuffle(subs)

        for sub_name, lang in subs:
            if not self.running or self.paused:
                break

            posts = await fetch_subreddit_new(http, sub_name)
            for post_data in posts:
                r = await self._process_post(post_data, lang, http)
                if r:
                    results.append(r)

            # Pause naturelle entre subreddits (2-5s)
            await asyncio.sleep(random.uniform(2, 5))

        return results

    async def run(self):
        """Boucle principale."""
        logger.info("=" * 60)
        logger.info("🚀 Promotion Bot captentdb.fr")
        logger.info(f"   Mode       : {'AUTO POST' if AUTO_POST_MODE else 'ALERTE TELEGRAM'}")
        logger.info(f"   DRY RUN    : {DRY_RUN}")
        logger.info(f"   Subreddits : {len(SUBREDDITS)}")
        logger.info(f"   Intervalle : {SCAN_INTERVAL}s")
        logger.info("=" * 60)

        mode_label = "AUTO POST 🤖" if AUTO_POST_MODE else "ALERTE TELEGRAM 🔔"
        await tg_send(
            f"🟢 *Promotion Bot démarré*\n"
            f"Mode: *{mode_label}*\n"
            f"{'⚠️ DRY RUN (test, rien posté)' if DRY_RUN else '🔴 LIVE'}\n"
            f"Subreddits surveillés: {len(SUBREDDITS)}\n"
            f"Scan toutes les: {SCAN_INTERVAL // 60} min\n\n"
            f"Commandes:\n"
            f"`/promo_stats` — Statistiques\n"
            f"`/promo_pause` — Pause\n"
            f"`/promo_resume` — Reprendre\n"
            f"`/promo_help` — Aide"
        )

        # Connexion Reddit si mode auto
        if AUTO_POST_MODE:
            ok = await self.reddit_session.login()
            if not ok:
                await tg_send(
                    "⚠️ *Mode AUTO impossible* — Login Reddit échoué.\n"
                    "Passage automatique en mode ALERTE.\n"
                    "Vérifie REDDIT\\_USERNAME et REDDIT\\_PASSWORD."
                )

        self.running = True
        cycle_n = 0

        async with aiohttp.ClientSession() as http:
            while self.running:
                if self.paused:
                    await asyncio.sleep(10)
                    continue

                cycle_n += 1
                self.stats["cycles"] = cycle_n
                logger.info(f"🔄 Cycle #{cycle_n}")

                results = await self.run_cycle(http)

                save_seen_ids(self.seen_ids)
                save_stats(self.stats)

                # Rapport toutes les 20 cycles (silencieux si rien de nouveau)
                if cycle_n % 20 == 0:
                    await tg_send(self._build_report(cycle_n))

                logger.info(
                    f"Cycle #{cycle_n} — scannés: {self.stats['scanned']} | "
                    f"alertes: {self.stats['alerts_sent']} | "
                    f"postés: {self.stats['posted']}"
                )

                await asyncio.sleep(SCAN_INTERVAL)

        await self.reddit_session.close()
        logger.info("🛑 Bot arrêté")

    def _build_report(self, cycle: int) -> str:
        mode = "AUTO 🤖" if AUTO_POST_MODE else "ALERTE 🔔"
        return (
            f"📊 *Promotion Bot — Rapport #{cycle}*\n\n"
            f"Mode: {mode}\n"
            f"Posts scannés: {self.stats['scanned']}\n"
            f"Alertes envoyées: {self.stats['alerts_sent']}\n"
            f"Commentaires postés: {self.stats['posted']}\n"
            f"Erreurs: {self.stats['errors']}\n"
            f"Dernière alerte: {self.stats.get('last_alert', 'aucune')}\n"
            f"{'⚠️ DRY RUN actif' if DRY_RUN else ''}"
        )


# ─── Listener commandes Telegram admin ────────────────────────────────────────
class TelegramListener:

    def __init__(self, bot: PromotionBot):
        self.bot    = bot
        self.offset = 0
        self.running = True

    async def poll(self):
        if not ADMIN_TELEGRAM_TOKEN or not ADMIN_USER_ID:
            return

        url = f"https://api.telegram.org/bot{ADMIN_TELEGRAM_TOKEN}/getUpdates"

        async with aiohttp.ClientSession() as s:
            while self.running:
                try:
                    params = {"offset": self.offset, "timeout": 30}
                    async with s.get(url, params=params,
                                      timeout=aiohttp.ClientTimeout(total=35)) as r:
                        if r.status == 200:
                            data = await r.json()
                            for upd in data.get("result", []):
                                self.offset = upd["update_id"] + 1
                                msg     = upd.get("message", {})
                                # Vérification par user_id (pas chat_id) pour sécurité en groupe
                                from_id = str(msg.get("from", {}).get("id", ""))
                                text    = msg.get("text", "").strip()

                                # Sécurité : uniquement ton ID Telegram perso
                                if from_id != str(ADMIN_USER_ID):
                                    continue
                                if text:
                                    await self._handle(text)

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.warning(f"TelegramListener: {e}")
                    await asyncio.sleep(5)

    async def _handle(self, text: str):
        cmd = text.lower().split()[0]

        if cmd == "/promo_stats":
            await tg_send(self.bot._build_report(self.bot.stats["cycles"]))

        elif cmd == "/promo_pause":
            self.bot.paused = True
            await tg_send("⏸️ *Bot mis en pause.* Envoie /promo\\_resume pour reprendre.")

        elif cmd == "/promo_resume":
            self.bot.paused = False
            await tg_send("▶️ *Bot repris.*")

        elif cmd == "/promo_help":
            mode = "AUTO 🤖" if AUTO_POST_MODE else "ALERTE 🔔"
            await tg_send(
                f"🤖 *Promotion Bot captentdb.fr*\n"
                f"Mode actuel: *{mode}*\n\n"
                f"/promo\\_stats — Statistiques\n"
                f"/promo\\_pause — Mettre en pause\n"
                f"/promo\\_resume — Reprendre\n"
                f"/promo\\_help — Cette aide\n\n"
                f"Pour passer en mode auto: mets `AUTO\\_POST\\_MODE=true` dans Railway "
                f"(nécessite un compte Reddit avec karma)."
            )


# ─── Point d'entrée ────────────────────────────────────────────────────────────
async def main():
    missing = []
    if not ADMIN_TELEGRAM_TOKEN:  missing.append("ADMIN_TELEGRAM_TOKEN")
    if not NOTIFICATION_CHAT_ID:  missing.append("NOTIFICATION_CHAT_ID")
    if not ADMIN_USER_ID:         missing.append("ADMIN_USER_ID")

    if missing:
        logger.error(f"Variables manquantes: {', '.join(missing)}")
        return

    bot      = PromotionBot()
    listener = TelegramListener(bot)

    await asyncio.gather(
        bot.run(),
        listener.poll(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Arrêt manuel")
    except Exception as e:
        logger.error(f"Erreur fatale: {e}")
        raise
