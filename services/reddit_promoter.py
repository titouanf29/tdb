"""
Reddit Promotion Bot pour captentdb.fr
Scanne les subreddits de trading et finance pour poster des promotions contextuelles.
"""
import praw
import logging
import asyncio
import time
import json
import os
import random
from datetime import datetime, timedelta
from typing import Optional
import re

logger = logging.getLogger(__name__)

# ========== MESSAGES DE PROMOTION ==========
# Messages variés pour éviter les détections de spam
PROMOTION_MESSAGES_FR = [
    """Super discussion ! Pour ceux qui cherchent un bot de trading virtuel avec analyse IA complète, j'utilise **captentdb.fr** — outil de paper trading (argent virtuel) avec scores IA, indicateurs techniques et assistant conversationnel. Entièrement gratuit pour tester ses stratégies sans risque réel. 📊""",

    """Bonne question ! Si tu veux pratiquer sans risquer de capital réel, **captentdb.fr** propose du paper trading avec analyse IA sur toutes les classes d'actifs (crypto, actions, forex, matières premières). Utile pour tester ses stratégies avant de passer en réel. 🎯""",

    """Pour pratiquer l'analyse technique sans risque, **captentdb.fr** est un outil que j'utilise régulièrement — bot Telegram de paper trading avec RSI, MACD, Bollinger Bands et scoring IA. Idéal pour progresser. 📈""",

    """Si vous débutez en trading ou souhaitez tester des stratégies, **captentdb.fr** offre un simulateur complet avec 10 000$ virtuels, levier, TP/SL automatiques et analyse IA multi-timeframes. Entièrement gratuit ! 💹""",

    """Pour ceux qui s'intéressent au trading algorithmique, **captentdb.fr** propose un bot Telegram avec scanner automatique de marchés, scoring IA et paper trading. Très utile pour apprendre sans perdre d'argent réel. 🤖""",
]

PROMOTION_MESSAGES_EN = [
    """Great discussion! For those looking for a virtual trading bot with full AI analysis, I've been using **captentdb.fr** — a paper trading tool (virtual money) with AI scoring, technical indicators and a conversational assistant. Completely free to test strategies without real risk. 📊""",

    """Good point! If you want to practice without risking real capital, **captentdb.fr** offers paper trading with AI analysis across all asset classes (crypto, stocks, forex, commodities). Useful to test strategies before going live. 🎯""",

    """For practicing technical analysis risk-free, **captentdb.fr** is a tool I use regularly — Telegram trading bot with RSI, MACD, Bollinger Bands and AI scoring. Great for improving your skills. 📈""",

    """If you're new to trading or want to test strategies, **captentdb.fr** offers a full simulator with $10,000 virtual, leverage, automatic TP/SL and multi-timeframe AI analysis. Completely free! 💹""",

    """For those interested in algorithmic trading, **captentdb.fr** offers a Telegram bot with automatic market scanner, AI scoring and paper trading. Very useful for learning without losing real money. 🤖""",
]

# Keywords qui déclenchent une promotion
TRIGGER_KEYWORDS_FR = [
    "paper trading", "trading virtuel", "simulateur trading", "apprendre trading",
    "bot trading", "analyse technique", "indicateurs", "RSI", "MACD",
    "stratégie trading", "débutant trading", "trading gratuit", "backtesting",
    "trading bot", "signal trading", "screener", "scanner marché",
]

TRIGGER_KEYWORDS_EN = [
    "paper trading", "virtual trading", "trading simulator", "learn trading",
    "trading bot", "technical analysis", "trading indicators", "RSI", "MACD",
    "trading strategy", "beginner trading", "free trading", "backtesting",
    "algo trading", "trading signal", "market screener", "stock scanner",
    "crypto trading bot", "forex bot", "trading practice",
]

# Subreddits à surveiller
TARGET_SUBREDDITS = {
    "fr": [
        "france",
        "finances_perso",
        "bourse",
        "investissement",
        "cryptomonnaie",
        "trading",
        "BitcoinFrance",
        "EtherFrance",
    ],
    "en": [
        "trading",
        "algotrading",
        "Daytrading",
        "Forex",
        "stocks",
        "investing",
        "CryptoCurrency",
        "Bitcoin",
        "learntrading",
        "papertrading",
        "StockMarket",
        "options",
        "wallstreetbets",
    ]
}


class RedditPromoter:
    """Bot de promotion Reddit pour captentdb.fr"""

    def __init__(self):
        self.reddit: Optional[praw.Reddit] = None
        self.is_running = False
        self.stats = {
            "posts_scanned": 0,
            "comments_scanned": 0,
            "promotions_sent": 0,
            "errors": 0,
            "started_at": None,
            "last_activity": None,
        }
        self.replied_ids: set = set()  # IDs déjà traités
        self.replied_ids_file = "data/reddit_replied.json"
        self._load_replied_ids()
        self._task: Optional[asyncio.Task] = None

        # Cooldowns
        self.min_delay_between_posts = 600   # 10 minutes minimum entre 2 posts
        self.last_post_time = 0
        self.max_posts_per_hour = 3
        self.posts_this_hour = 0
        self.hour_reset_time = time.time()

    def _load_replied_ids(self):
        """Charge les IDs déjà traités depuis le disque"""
        os.makedirs("data", exist_ok=True)
        if os.path.exists(self.replied_ids_file):
            try:
                with open(self.replied_ids_file, "r") as f:
                    data = json.load(f)
                    self.replied_ids = set(data.get("ids", []))
                    # Garder seulement les 5000 derniers IDs
                    if len(self.replied_ids) > 5000:
                        self.replied_ids = set(list(self.replied_ids)[-5000:])
                logger.info(f"✅ {len(self.replied_ids)} IDs déjà traités chargés")
            except Exception as e:
                logger.warning(f"Impossible de charger replied_ids: {e}")
                self.replied_ids = set()

    def _save_replied_ids(self):
        """Sauvegarde les IDs traités sur le disque"""
        try:
            with open(self.replied_ids_file, "w") as f:
                json.dump({"ids": list(self.replied_ids)}, f)
        except Exception as e:
            logger.warning(f"Impossible de sauvegarder replied_ids: {e}")

    def initialize(self, client_id: str, client_secret: str, username: str,
                   password: str, user_agent: str) -> bool:
        """Initialise la connexion Reddit via PRAW"""
        try:
            self.reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                username=username,
                password=password,
                user_agent=user_agent,
            )
            # Vérification de l'authentification
            me = self.reddit.user.me()
            logger.info(f"✅ Connecté à Reddit en tant que u/{me.name}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur connexion Reddit: {e}")
            return False

    def _is_relevant_post(self, text: str) -> tuple[bool, str]:
        """
        Vérifie si un post/commentaire est pertinent pour la promotion.
        Retourne (pertinent, langue_détectée)
        """
        text_lower = text.lower()

        # Vérifier si on a déjà promu dans ce contexte récemment
        # Éviter de promouvoir si captentdb.fr est déjà mentionné
        if "captentdb" in text_lower:
            return False, ""

        # Vérifier les keywords français
        for kw in TRIGGER_KEYWORDS_FR:
            if kw.lower() in text_lower:
                return True, "fr"

        # Vérifier les keywords anglais
        for kw in TRIGGER_KEYWORDS_EN:
            if kw.lower() in text_lower:
                return True, "en"

        return False, ""

    def _get_promotion_message(self, lang: str) -> str:
        """Retourne un message de promotion aléatoire"""
        if lang == "fr":
            return random.choice(PROMOTION_MESSAGES_FR)
        return random.choice(PROMOTION_MESSAGES_EN)

    def _can_post(self) -> bool:
        """Vérifie si on peut poster (rate limiting)"""
        now = time.time()

        # Reset compteur horaire si nécessaire
        if now - self.hour_reset_time > 3600:
            self.posts_this_hour = 0
            self.hour_reset_time = now

        # Vérifier limite horaire
        if self.posts_this_hour >= self.max_posts_per_hour:
            return False

        # Vérifier délai minimum entre posts
        if now - self.last_post_time < self.min_delay_between_posts:
            return False

        return True

    def _scan_subreddit(self, subreddit_name: str, lang: str, dry_run: bool = False) -> list[dict]:
        """Scanne un subreddit et poste des promotions si pertinent"""
        if not self.reddit:
            return []

        results = []
        try:
            subreddit = self.reddit.subreddit(subreddit_name)

            # Scanner les posts récents (dernière heure)
            for post in subreddit.new(limit=25):
                self.stats["posts_scanned"] += 1

                # Ignorer les posts trop vieux (> 48h)
                post_age = time.time() - post.created_utc
                if post_age > 172800:  # 48h
                    continue

                # Ignorer si déjà traité
                if post.id in self.replied_ids:
                    continue

                # Vérifier pertinence
                text = f"{post.title} {post.selftext}"
                relevant, detected_lang = self._is_relevant_post(text)
                if not relevant:
                    continue

                lang_to_use = detected_lang if detected_lang else lang

                # Vérifier rate limit
                if not self._can_post():
                    logger.info("⏳ Rate limit: attente avant prochain post")
                    break

                result = {
                    "type": "post",
                    "id": post.id,
                    "subreddit": subreddit_name,
                    "title": post.title[:100],
                    "url": f"https://reddit.com{post.permalink}",
                    "lang": lang_to_use,
                    "timestamp": datetime.now().isoformat(),
                }

                if not dry_run:
                    try:
                        msg = self._get_promotion_message(lang_to_use)
                        post.reply(msg)

                        self.replied_ids.add(post.id)
                        self.stats["promotions_sent"] += 1
                        self.posts_this_hour += 1
                        self.last_post_time = time.time()
                        self.stats["last_activity"] = datetime.now().isoformat()

                        result["action"] = "replied"
                        results.append(result)

                        logger.info(f"✅ Promotion postée sur r/{subreddit_name}: {post.title[:60]}...")

                        # Pause aléatoire entre les posts (3-8 secondes)
                        time.sleep(random.uniform(3, 8))

                    except praw.exceptions.APIException as e:
                        if "RATELIMIT" in str(e):
                            logger.warning(f"⚠️ Rate limit Reddit atteint: {e}")
                            wait_time = self._extract_wait_time(str(e))
                            time.sleep(wait_time)
                        elif "TOO_OLD" in str(e):
                            self.replied_ids.add(post.id)
                        else:
                            logger.error(f"❌ Erreur API Reddit: {e}")
                            self.stats["errors"] += 1
                else:
                    result["action"] = "dry_run"
                    results.append(result)
                    logger.info(f"[DRY RUN] Promotion possible sur r/{subreddit_name}: {post.title[:60]}")

        except praw.exceptions.PRAWException as e:
            logger.error(f"❌ Erreur scan r/{subreddit_name}: {e}")
            self.stats["errors"] += 1
        except Exception as e:
            logger.error(f"❌ Erreur inattendue r/{subreddit_name}: {e}")
            self.stats["errors"] += 1

        return results

    def _extract_wait_time(self, error_msg: str) -> int:
        """Extrait le temps d'attente d'un message d'erreur rate limit"""
        match = re.search(r'(\d+)\s*minute', error_msg)
        if match:
            return int(match.group(1)) * 60 + 30
        match = re.search(r'(\d+)\s*second', error_msg)
        if match:
            return int(match.group(1)) + 10
        return 600  # 10 minutes par défaut

    async def run_scan_loop(self, dry_run: bool = False, on_activity=None):
        """Boucle principale de scan asynchrone"""
        self.is_running = True
        self.stats["started_at"] = datetime.now().isoformat()
        logger.info(f"🚀 Démarrage du bot Reddit promotion {'[DRY RUN]' if dry_run else ''}")

        all_subreddits = (
            [(s, "fr") for s in TARGET_SUBREDDITS["fr"]] +
            [(s, "en") for s in TARGET_SUBREDDITS["en"]]
        )

        scan_interval = 300  # 5 minutes entre chaque cycle complet

        while self.is_running:
            try:
                random.shuffle(all_subreddits)  # Ordre aléatoire pour paraître naturel

                for subreddit_name, lang in all_subreddits:
                    if not self.is_running:
                        break

                    results = await asyncio.get_event_loop().run_in_executor(
                        None, self._scan_subreddit, subreddit_name, lang, dry_run
                    )

                    if results and on_activity:
                        for r in results:
                            await on_activity(r)

                    # Pause entre chaque subreddit (2-5 secondes)
                    await asyncio.sleep(random.uniform(2, 5))

                self._save_replied_ids()
                logger.info(
                    f"📊 Cycle terminé — Posts: {self.stats['posts_scanned']} | "
                    f"Promotions: {self.stats['promotions_sent']} | "
                    f"Erreurs: {self.stats['errors']}"
                )

                # Attente entre les cycles
                await asyncio.sleep(scan_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Erreur dans la boucle principale: {e}")
                self.stats["errors"] += 1
                await asyncio.sleep(60)

        self.is_running = False
        logger.info("🛑 Bot Reddit promotion arrêté")

    def start(self, dry_run: bool = False, on_activity=None):
        """Démarre le bot en arrière-plan"""
        if self._task and not self._task.done():
            logger.warning("Bot déjà en cours d'exécution")
            return False

        loop = asyncio.get_event_loop()
        self._task = loop.create_task(
            self.run_scan_loop(dry_run=dry_run, on_activity=on_activity)
        )
        return True

    def stop(self):
        """Arrête le bot"""
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._save_replied_ids()
        logger.info("🛑 Arrêt du bot Reddit promotion demandé")

    def get_stats(self) -> dict:
        """Retourne les statistiques actuelles"""
        return {
            **self.stats,
            "is_running": self.is_running,
            "replied_count": len(self.replied_ids),
        }

    def manual_post(self, post_url: str, lang: str = "fr", dry_run: bool = False) -> dict:
        """
        Poste manuellement une promotion sur un post Reddit spécifique.
        post_url: URL complète du post Reddit
        """
        if not self.reddit:
            return {"success": False, "error": "Reddit non initialisé"}

        try:
            submission = self.reddit.submission(url=post_url)

            if submission.id in self.replied_ids:
                return {"success": False, "error": "Déjà répondu à ce post"}

            msg = self._get_promotion_message(lang)

            if not dry_run:
                submission.reply(msg)
                self.replied_ids.add(submission.id)
                self.stats["promotions_sent"] += 1
                self.last_post_time = time.time()
                self._save_replied_ids()

            return {
                "success": True,
                "dry_run": dry_run,
                "post_title": submission.title,
                "message_sent": msg,
            }
        except Exception as e:
            logger.error(f"❌ Erreur post manuel: {e}")
            return {"success": False, "error": str(e)}

    def search_and_promote(self, query: str, lang: str = "fr",
                           subreddit: str = "all", dry_run: bool = False) -> list[dict]:
        """Recherche des posts par mot-clé et poste des promotions"""
        if not self.reddit:
            return []

        results = []
        try:
            search_results = self.reddit.subreddit(subreddit).search(
                query, sort="new", time_filter="week", limit=10
            )

            for post in search_results:
                self.stats["posts_scanned"] += 1

                if post.id in self.replied_ids:
                    continue

                if "captentdb" in post.title.lower() or "captentdb" in post.selftext.lower():
                    continue

                if not self._can_post():
                    break

                result = {
                    "id": post.id,
                    "subreddit": post.subreddit.display_name,
                    "title": post.title[:100],
                    "url": f"https://reddit.com{post.permalink}",
                }

                if not dry_run:
                    try:
                        msg = self._get_promotion_message(lang)
                        post.reply(msg)
                        self.replied_ids.add(post.id)
                        self.stats["promotions_sent"] += 1
                        self.posts_this_hour += 1
                        self.last_post_time = time.time()
                        result["action"] = "replied"
                        time.sleep(random.uniform(5, 10))
                    except Exception as e:
                        result["action"] = f"error: {e}"
                        self.stats["errors"] += 1
                else:
                    result["action"] = "dry_run"

                results.append(result)

            self._save_replied_ids()

        except Exception as e:
            logger.error(f"❌ Erreur recherche: {e}")
            self.stats["errors"] += 1

        return results


# Instance globale
reddit_promoter = RedditPromoter()
