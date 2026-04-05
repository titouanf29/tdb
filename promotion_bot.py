"""
Bot de Promotion captentdb.fr — Script standalone indépendant
Tourne 24h/24 sur Railway, envoie des rapports à l'admin via Telegram.

Variables d'environnement requises (.env) :
  REDDIT_CLIENT_ID      → App Reddit (script)
  REDDIT_CLIENT_SECRET  → Secret App Reddit
  REDDIT_USERNAME       → Compte Reddit du bot
  REDDIT_PASSWORD       → Mot de passe Reddit
  REDDIT_USER_AGENT     → Ex: "captentdb-promoter/1.0 by u/TON_USERNAME"
  ADMIN_TELEGRAM_TOKEN  → Token du bot Telegram pour notifications admin
  ADMIN_CHAT_ID         → Ton ID Telegram (pour recevoir les rapports)
  DRY_RUN               → "true" pour tester sans poster (défaut: false)
"""

import asyncio
import logging
import os
import sys
import json
import random
import time
import re
from datetime import datetime, timezone
from typing import Optional
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

# ─── Config depuis .env ────────────────────────────────────────────────────────
REDDIT_CLIENT_ID     = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USERNAME      = os.getenv("REDDIT_USERNAME", "")
REDDIT_PASSWORD      = os.getenv("REDDIT_PASSWORD", "")
REDDIT_USER_AGENT    = os.getenv("REDDIT_USER_AGENT", "captentdb-promoter/1.0")
ADMIN_TELEGRAM_TOKEN = os.getenv("ADMIN_TELEGRAM_TOKEN", os.getenv("TELEGRAM_TOKEN", ""))
ADMIN_CHAT_ID        = os.getenv("ADMIN_CHAT_ID", "")
DRY_RUN              = os.getenv("DRY_RUN", "false").lower() == "true"

REPLIED_IDS_FILE = "data/reddit_replied.json"
STATS_FILE       = "data/promotion_stats.json"
SCAN_INTERVAL    = int(os.getenv("SCAN_INTERVAL_SECONDS", "600"))   # 10 min entre cycles
MIN_DELAY_POSTS  = int(os.getenv("MIN_DELAY_BETWEEN_POSTS", "900")) # 15 min entre 2 posts
MAX_POSTS_HOUR   = int(os.getenv("MAX_POSTS_PER_HOUR", "2"))

# ─── Subreddits à surveiller ───────────────────────────────────────────────────
SUBREDDITS_FR = [
    "france",
    "finances_perso",
    "bourse",
    "investissement",
    "cryptomonnaie",
    "trading",
    "BitcoinFrance",
]

SUBREDDITS_EN = [
    "trading",
    "algotrading",
    "Daytrading",
    "Forex",
    "stocks",
    "investing",
    "CryptoCurrency",
    "learntrading",
    "papertrading",
    "StockMarket",
    "options",
]

# ─── Mots-clés déclencheurs ────────────────────────────────────────────────────
KEYWORDS_FR = [
    "paper trading", "trading virtuel", "simulateur trading", "apprendre trading",
    "bot trading", "analyse technique", "indicateurs techniques", "trading gratuit",
    "backtesting", "signal trading", "screener", "scanner marché",
    "trading débutant", "pratiquer trading",
]

KEYWORDS_EN = [
    "paper trading", "virtual trading", "trading simulator", "learn trading",
    "trading bot", "technical analysis", "trading indicators", "backtesting",
    "algo trading", "trading signal", "market screener", "stock scanner",
    "crypto trading bot", "forex bot", "trading practice", "free trading",
    "beginners trading",
]

# ─── Messages de promotion ─────────────────────────────────────────────────────
PROMO_FR = [
    (
        "Bonne question ! Pour pratiquer sans risque, je recommande **captentdb.fr** — "
        "c'est un bot Telegram de paper trading (argent virtuel) avec analyse IA complète : "
        "RSI, MACD, Bollinger Bands, scoring multi-timeframes. Entièrement gratuit. 📊"
    ),
    (
        "Si tu cherches à t'entraîner sans perdre d'argent réel, **captentdb.fr** propose "
        "un simulateur de trading avec 10 000 $ virtuels, levier jusqu'à 10x, TP/SL automatiques "
        "et un scanner de marchés IA. Parfait pour débuter ou tester des stratégies. 🎯"
    ),
    (
        "Pour pratiquer l'analyse technique, j'utilise **captentdb.fr** — bot Telegram gratuit "
        "avec paper trading, indicateurs (RSI, MACD, Bollinger...) et assistant IA conversationnel. "
        "Idéal pour progresser avant de passer en réel. 📈"
    ),
    (
        "Concernant le paper trading, **captentdb.fr** est pas mal : bot Telegram qui scanne "
        "automatiquement les marchés (crypto, actions, forex, matières premières), donne un score IA "
        "et permet d'ouvrir des positions virtuelles avec levier. 100% gratuit. 💹"
    ),
]

PROMO_EN = [
    (
        "Good question! If you want to practice risk-free, I'd recommend **captentdb.fr** — "
        "it's a Telegram paper trading bot with full AI analysis: RSI, MACD, Bollinger Bands, "
        "multi-timeframe scoring. Completely free. 📊"
    ),
    (
        "For trading practice without real risk, **captentdb.fr** offers a simulator with $10,000 "
        "virtual balance, leverage up to 10x, automatic TP/SL and an AI market scanner. "
        "Great for beginners or strategy testing. 🎯"
    ),
    (
        "To practice technical analysis, I use **captentdb.fr** — free Telegram bot with paper "
        "trading, indicators (RSI, MACD, Bollinger...) and an AI conversational assistant. "
        "Perfect for improving before going live. 📈"
    ),
    (
        "For paper trading, **captentdb.fr** is solid: Telegram bot that automatically scans "
        "markets (crypto, stocks, forex, commodities), gives an AI score and lets you open virtual "
        "positions with leverage. 100% free. 💹"
    ),
]


# ─── Telegram notifications (admin uniquement) ────────────────────────────────
async def telegram_notify(text: str):
    """Envoie un message Telegram uniquement à l'admin."""
    if not ADMIN_CHAT_ID or not ADMIN_TELEGRAM_TOKEN:
        return
    try:
        import aiohttp
        url = f"https://api.telegram.org/bot{ADMIN_TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": ADMIN_CHAT_ID,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status != 200:
                    body = await r.text()
                    logger.warning(f"Telegram notify échoué ({r.status}): {body[:200]}")
    except Exception as e:
        logger.warning(f"Impossible d'envoyer la notif Telegram: {e}")


# ─── Gestion de la persistance ─────────────────────────────────────────────────
def load_replied_ids() -> set:
    os.makedirs("data", exist_ok=True)
    if os.path.exists(REPLIED_IDS_FILE):
        try:
            with open(REPLIED_IDS_FILE) as f:
                data = json.load(f)
                ids = set(data.get("ids", []))
                # Garder les 10 000 derniers pour éviter un fichier trop grand
                if len(ids) > 10_000:
                    ids = set(list(ids)[-10_000:])
                return ids
        except Exception:
            pass
    return set()


def save_replied_ids(ids: set):
    os.makedirs("data", exist_ok=True)
    try:
        with open(REPLIED_IDS_FILE, "w") as f:
            json.dump({"ids": list(ids), "updated_at": datetime.now().isoformat()}, f)
    except Exception as e:
        logger.warning(f"Impossible de sauvegarder replied_ids: {e}")


def load_stats() -> dict:
    os.makedirs("data", exist_ok=True)
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "posts_scanned": 0,
        "promotions_sent": 0,
        "errors": 0,
        "cycles": 0,
        "started_at": datetime.now().isoformat(),
        "last_promotion": None,
    }


def save_stats(stats: dict):
    os.makedirs("data", exist_ok=True)
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(stats, f, indent=2)
    except Exception as e:
        logger.warning(f"Impossible de sauvegarder stats: {e}")


# ─── Logique de promotion ──────────────────────────────────────────────────────
def is_relevant(title: str, body: str) -> tuple[bool, str]:
    """Détecte si un post est pertinent et retourne la langue."""
    text = (title + " " + body).lower()
    if "captentdb" in text:
        return False, ""
    for kw in KEYWORDS_FR:
        if kw in text:
            return True, "fr"
    for kw in KEYWORDS_EN:
        if kw in text:
            return True, "en"
    return False, ""


def get_promo_message(lang: str) -> str:
    return random.choice(PROMO_FR if lang == "fr" else PROMO_EN)


def extract_ratelimit_wait(error_msg: str) -> int:
    m = re.search(r"(\d+)\s*minute", error_msg, re.IGNORECASE)
    if m:
        return int(m.group(1)) * 60 + 30
    m = re.search(r"(\d+)\s*second", error_msg, re.IGNORECASE)
    if m:
        return int(m.group(1)) + 10
    return 600


# ─── Bot principal ─────────────────────────────────────────────────────────────
class PromotionBot:

    def __init__(self):
        self.reddit = None
        self.replied_ids = load_replied_ids()
        self.stats = load_stats()
        self.stats["started_at"] = datetime.now().isoformat()
        self.last_post_time = 0.0
        self.posts_this_hour = 0
        self.hour_reset = time.time()
        self.running = False

    def _init_reddit(self) -> bool:
        try:
            import praw
            self.reddit = praw.Reddit(
                client_id=REDDIT_CLIENT_ID,
                client_secret=REDDIT_CLIENT_SECRET,
                username=REDDIT_USERNAME,
                password=REDDIT_PASSWORD,
                user_agent=REDDIT_USER_AGENT,
            )
            me = self.reddit.user.me()
            logger.info(f"✅ Reddit connecté: u/{me.name}")
            return True
        except Exception as e:
            logger.error(f"❌ Connexion Reddit échouée: {e}")
            return False

    def _can_post(self) -> bool:
        now = time.time()
        if now - self.hour_reset > 3600:
            self.posts_this_hour = 0
            self.hour_reset = now
        if self.posts_this_hour >= MAX_POSTS_HOUR:
            return False
        if now - self.last_post_time < MIN_DELAY_POSTS:
            return False
        return True

    def _scan_subreddit(self, sub_name: str, lang: str) -> list[dict]:
        """Scan synchrone d'un subreddit (exécuté dans un executor)."""
        import praw.exceptions
        results = []
        try:
            sub = self.reddit.subreddit(sub_name)
            for post in sub.new(limit=20):
                self.stats["posts_scanned"] += 1

                # Ignorer posts trop vieux (> 72h)
                if time.time() - post.created_utc > 259200:
                    continue
                if post.id in self.replied_ids:
                    continue

                relevant, detected_lang = is_relevant(post.title, post.selftext)
                if not relevant:
                    continue

                use_lang = detected_lang or lang

                if not self._can_post():
                    logger.info("⏳ Rate limit interne — pause")
                    break

                msg = get_promo_message(use_lang)
                result = {
                    "post_id": post.id,
                    "subreddit": sub_name,
                    "title": post.title[:80],
                    "url": f"https://reddit.com{post.permalink}",
                    "lang": use_lang,
                    "time": datetime.now().isoformat(),
                    "dry_run": DRY_RUN,
                }

                if not DRY_RUN:
                    try:
                        post.reply(msg)
                        self.replied_ids.add(post.id)
                        self.stats["promotions_sent"] += 1
                        self.posts_this_hour += 1
                        self.last_post_time = time.time()
                        self.stats["last_promotion"] = result["time"]
                        result["status"] = "sent"
                        logger.info(f"✅ Promo postée r/{sub_name}: {post.title[:60]}")
                        time.sleep(random.uniform(5, 12))
                    except praw.exceptions.APIException as e:
                        err = str(e)
                        if "RATELIMIT" in err:
                            wait = extract_ratelimit_wait(err)
                            logger.warning(f"⚠️ Reddit rate limit — attente {wait}s")
                            time.sleep(wait)
                        elif "TOO_OLD" in err:
                            self.replied_ids.add(post.id)
                        else:
                            logger.error(f"❌ APIException: {e}")
                            self.stats["errors"] += 1
                        result["status"] = f"error: {err[:80]}"
                    except Exception as e:
                        logger.error(f"❌ Erreur reply: {e}")
                        self.stats["errors"] += 1
                        result["status"] = f"error: {str(e)[:80]}"
                else:
                    self.replied_ids.add(post.id)
                    result["status"] = "dry_run"
                    logger.info(f"[DRY RUN] Promo possible r/{sub_name}: {post.title[:60]}")

                results.append(result)

        except Exception as e:
            logger.error(f"❌ Scan r/{sub_name} échoué: {e}")
            self.stats["errors"] += 1

        return results

    async def run(self):
        """Boucle principale asynchrone."""
        logger.info("=" * 60)
        logger.info("🚀 Promotion Bot captentdb.fr démarré")
        logger.info(f"   DRY_RUN       : {DRY_RUN}")
        logger.info(f"   SCAN_INTERVAL : {SCAN_INTERVAL}s")
        logger.info(f"   MAX_POSTS/H   : {MAX_POSTS_HOUR}")
        logger.info("=" * 60)

        if not self._init_reddit():
            msg = (
                "❌ *Promotion Bot* — Impossible de se connecter à Reddit.\n"
                "Vérifie les variables REDDIT_\\* dans ton .env Railway."
            )
            await telegram_notify(msg)
            return

        await telegram_notify(
            f"🟢 *Promotion Bot démarré*\n"
            f"Mode: {'DRY RUN (test)' if DRY_RUN else '**LIVE**'}\n"
            f"Subreddits FR: {len(SUBREDDITS_FR)} | EN: {len(SUBREDDITS_EN)}\n"
            f"Intervalle: {SCAN_INTERVAL // 60} min"
        )

        self.running = True
        cycle = 0

        all_subs = (
            [(s, "fr") for s in SUBREDDITS_FR] +
            [(s, "en") for s in SUBREDDITS_EN]
        )

        while self.running:
            cycle += 1
            self.stats["cycles"] = cycle
            cycle_results = []

            random.shuffle(all_subs)
            logger.info(f"🔄 Cycle #{cycle} — scan de {len(all_subs)} subreddits")

            for sub_name, lang in all_subs:
                if not self.running:
                    break

                results = await asyncio.get_event_loop().run_in_executor(
                    None, self._scan_subreddit, sub_name, lang
                )
                cycle_results.extend(results)

                # Pause entre subreddits
                await asyncio.sleep(random.uniform(3, 7))

            # Sauvegarde après chaque cycle
            save_replied_ids(self.replied_ids)
            save_stats(self.stats)

            promotions_this_cycle = [r for r in cycle_results if r.get("status") in ("sent", "dry_run")]

            # Rapport Telegram toutes les 10 cycles ou si des promotions ont été postées
            if promotions_this_cycle or cycle % 10 == 0:
                report = self._build_report(cycle, promotions_this_cycle)
                await telegram_notify(report)

            logger.info(
                f"✅ Cycle #{cycle} terminé — "
                f"Scannés: {self.stats['posts_scanned']} | "
                f"Promos: {self.stats['promotions_sent']} | "
                f"Erreurs: {self.stats['errors']}"
            )

            await asyncio.sleep(SCAN_INTERVAL)

    def _build_report(self, cycle: int, new_promotions: list) -> str:
        lines = [
            f"📊 *Promotion Bot — Rapport cycle #{cycle}*",
            f"",
            f"📌 Posts scannés (total): {self.stats['posts_scanned']}",
            f"✅ Promotions envoyées (total): {self.stats['promotions_sent']}",
            f"❌ Erreurs: {self.stats['errors']}",
            f"📁 IDs mémorisés: {len(self.replied_ids)}",
        ]
        if new_promotions:
            lines.append(f"\n🆕 *Nouvelles promotions ce cycle ({len(new_promotions)}) :*")
            for p in new_promotions[:5]:
                status_icon = "✅" if p["status"] == "sent" else "🔵"
                lines.append(
                    f"{status_icon} r/{p['subreddit']} [{p['lang']}]\n"
                    f"   _{p['title'][:60]}_\n"
                    f"   {p['url']}"
                )
        if DRY_RUN:
            lines.append("\n⚠️ Mode DRY RUN — aucun vrai post envoyé")
        return "\n".join(lines)


# ─── Commandes Telegram admin (optionnel) ─────────────────────────────────────
class AdminCommandListener:
    """
    Écoute les commandes Telegram de l'admin pour contrôler le bot.
    Commandes supportées (via /sendMessage direct au bot):
      /promo_stats  → statistiques actuelles
      /promo_pause  → met en pause le scan
      /promo_resume → reprend le scan
    """

    def __init__(self, bot: PromotionBot):
        self.bot = bot
        self.offset = 0
        self.running = True

    async def poll(self):
        if not ADMIN_TELEGRAM_TOKEN or not ADMIN_CHAT_ID:
            return

        import aiohttp

        url = f"https://api.telegram.org/bot{ADMIN_TELEGRAM_TOKEN}/getUpdates"

        while self.running:
            try:
                params = {"offset": self.offset, "timeout": 30}
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=35)) as r:
                        if r.status == 200:
                            data = await r.json()
                            for update in data.get("result", []):
                                self.offset = update["update_id"] + 1
                                msg = update.get("message", {})
                                chat_id = str(msg.get("chat", {}).get("id", ""))
                                text = msg.get("text", "")

                                # Sécurité : uniquement l'admin
                                if chat_id != str(ADMIN_CHAT_ID):
                                    continue

                                await self._handle_command(text)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Poll Telegram: {e}")
                await asyncio.sleep(5)

    async def _handle_command(self, text: str):
        text = text.strip().lower()
        if text == "/promo_stats":
            report = (
                f"📊 *Stats Promotion Bot*\n"
                f"Posts scannés: {self.bot.stats['posts_scanned']}\n"
                f"Promos envoyées: {self.bot.stats['promotions_sent']}\n"
                f"Erreurs: {self.bot.stats['errors']}\n"
                f"Cycles: {self.bot.stats['cycles']}\n"
                f"Dernière promo: {self.bot.stats.get('last_promotion', 'jamais')}\n"
                f"Bot actif: {'✅' if self.bot.running else '🔴'}"
            )
            await telegram_notify(report)

        elif text == "/promo_pause":
            self.bot.running = False
            await telegram_notify("⏸️ *Promotion Bot mis en pause.*")

        elif text == "/promo_resume":
            if not self.bot.running:
                self.bot.running = True
                asyncio.get_event_loop().create_task(self.bot.run())
                await telegram_notify("▶️ *Promotion Bot repris.*")
            else:
                await telegram_notify("ℹ️ Bot déjà en cours d'exécution.")

        elif text == "/promo_help":
            await telegram_notify(
                "🤖 *Commandes Promotion Bot*\n\n"
                "/promo\\_stats — Voir les statistiques\n"
                "/promo\\_pause — Mettre en pause\n"
                "/promo\\_resume — Reprendre\n"
                "/promo\\_help — Cette aide"
            )


# ─── Point d'entrée ────────────────────────────────────────────────────────────
async def main():
    bot = PromotionBot()
    listener = AdminCommandListener(bot)

    # Vérification config minimale
    missing = []
    if not REDDIT_CLIENT_ID:     missing.append("REDDIT_CLIENT_ID")
    if not REDDIT_CLIENT_SECRET: missing.append("REDDIT_CLIENT_SECRET")
    if not REDDIT_USERNAME:      missing.append("REDDIT_USERNAME")
    if not REDDIT_PASSWORD:      missing.append("REDDIT_PASSWORD")

    if missing:
        logger.error(f"❌ Variables manquantes dans .env : {', '.join(missing)}")
        await telegram_notify(
            f"❌ *Promotion Bot* — Config incomplète !\nManquant: `{', '.join(missing)}`"
        )
        return

    # Lancer bot + listener en parallèle
    await asyncio.gather(
        bot.run(),
        listener.poll(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Arrêt manuel du bot promotion")
    except Exception as e:
        logger.error(f"❌ Erreur fatale: {e}")
        raise
