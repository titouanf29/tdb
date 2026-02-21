"""
Service de modération - Détection hors-sujet IA + Alertes Discord
Surveille les conversations IA et envoie des alertes si un utilisateur
s'écarte trop du domaine finance/trading.
"""
import logging
import os
import aiohttp
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Mots-clés hors-finance déclenchant une alerte
OFFOPIC_KEYWORDS = [
    # Violence / Contenu dangereux
    "bombe", "arme", "tuer", "meurtre", "terrorisme", "explosif",
    "attaque", "drogue", "hack", "piratage", "fraude", "arnaque",
    # Contenu inapproprié
    "sexe", "porno", "escort", "prostitution",
    # Contenu non-finance évident
    "recette", "cuisine", "film", "musique", "jeu vidéo", "pokemon",
    "football", "sport", "météo", "horoscope", "blague",
    "poème", "chanson", "histoire d'amour",
]

# Sujets finance légitimes (ne pas alerter)
FINANCE_KEYWORDS = [
    "trading", "bourse", "action", "crypto", "bitcoin", "ethereum",
    "forex", "cac", "nasdaq", "sp500", "dow", "nikkei",
    "analyse", "rsi", "macd", "indicateur", "graphique", "bougie",
    "position", "stop loss", "take profit", "levier", "margin",
    "dividende", "obligation", "etf", "fond", "portefeuille",
    "investissement", "broker", "courtier", "marché", "pnl",
    "long", "short", "bull", "bear", "volatilité", "tendance",
    "support", "résistance", "breakout", "retest", "fibonacci",
    "stratégie", "day trading", "scalping", "swing", "hold",
    "dollar", "euro", "yen", "yuan", "fed", "bce", "banque centrale",
    "inflation", "taux", "croissance", "récession", "pib",
    "aapl", "tsla", "nvda", "msft", "googl", "amzn", "meta",
]


class ModerationService:
    """Service de modération des conversations IA"""

    def __init__(self):
        self.discord_webhook = os.getenv("DISCORD_WEBHOOK_ADMIN", "")
        self.enabled = bool(self.discord_webhook)

        if not self.enabled:
            logger.info("Modération Discord désactivée (DISCORD_WEBHOOK_ADMIN manquant)")

    def analyze_message(self, message: str) -> dict:
        """
        Analyse un message pour détecter s'il est hors-sujet

        Returns:
            dict avec 'is_offtopic', 'score', 'triggers', 'has_finance'
        """
        message_lower = message.lower()

        # Vérifier les mots-clés finance (message légitime)
        finance_matches = [kw for kw in FINANCE_KEYWORDS if kw in message_lower]

        # Vérifier les mots-clés hors-sujet
        offtopic_matches = [kw for kw in OFFOPIC_KEYWORDS if kw in message_lower]

        # Score hors-sujet (0-100)
        if finance_matches:
            # Si finance présente, le score baisse
            score = max(0, len(offtopic_matches) * 20 - len(finance_matches) * 15)
        else:
            score = len(offtopic_matches) * 30

        # Message très court sans contexte finance
        if len(message.split()) < 5 and not finance_matches:
            score += 10

        is_offtopic = score >= 30 or (len(offtopic_matches) > 0 and not finance_matches)

        return {
            'is_offtopic': is_offtopic,
            'score': min(100, score),
            'triggers': offtopic_matches,
            'has_finance': len(finance_matches) > 0,
            'finance_keywords': finance_matches[:3]
        }

    async def alert_discord(self, user_info: dict, message: str, analysis: dict,
                            ai_response: str = None):
        """
        Envoie une alerte Discord quand un utilisateur parle hors-sujet

        Args:
            user_info: Infos utilisateur (id, username, first_name, etc.)
            message: Message de l'utilisateur
            analysis: Résultat de l'analyse
            ai_response: Réponse de l'IA (optionnel)
        """
        if not self.enabled:
            return False

        user_id = user_info.get('telegram_id', '?')
        username = user_info.get('username', '')
        first_name = user_info.get('first_name', 'Inconnu')
        display_name = f"@{username}" if username else first_name

        # Niveau d'alerte
        score = analysis.get('score', 0)
        if score >= 70:
            level = "🔴 HAUTE"
            color = 0xFF0000
        elif score >= 40:
            level = "🟡 MODÉRÉE"
            color = 0xFFA500
        else:
            level = "🟠 FAIBLE"
            color = 0xFF6600

        # Tronquer le message
        msg_short = message[:200] + "..." if len(message) > 200 else message
        triggers = ", ".join(analysis.get('triggers', [])) or "Hors-sujet général"

        embed = {
            "title": f"⚠️ Alerte Modération — Conversation hors-sujet",
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {
                    "name": "👤 Utilisateur",
                    "value": f"**{display_name}**\nID: `{user_id}`",
                    "inline": True
                },
                {
                    "name": "⚠️ Niveau",
                    "value": f"{level}\nScore: {score}/100",
                    "inline": True
                },
                {
                    "name": "🚨 Déclencheurs",
                    "value": triggers,
                    "inline": False
                },
                {
                    "name": "💬 Message utilisateur",
                    "value": f"```{msg_short}```",
                    "inline": False
                },
            ],
            "footer": {
                "text": f"TDB Bot — Modération IA • {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            }
        }

        # Ajouter infos supplémentaires si disponibles
        extra_info = []
        if user_info.get('created_at'):
            extra_info.append(f"Inscrit: {user_info['created_at'][:10]}")
        if user_info.get('total_trades') is not None:
            extra_info.append(f"Trades: {user_info['total_trades']}")
        if user_info.get('balance') is not None:
            extra_info.append(f"Solde: ${user_info['balance']:,.0f}")
        if user_info.get('last_seen'):
            extra_info.append(f"Vu: {user_info['last_seen'][:16]}")

        if extra_info:
            embed["fields"].append({
                "name": "📊 Profil",
                "value": " • ".join(extra_info),
                "inline": False
            })

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "content": f"⚠️ **Alerte modération** — Utilisateur hors-sujet finance",
                    "embeds": [embed]
                }
                async with session.post(
                    self.discord_webhook,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status in (200, 204):
                        logger.info(f"Alerte modération envoyée pour user {user_id}")
                        return True
                    else:
                        logger.warning(f"Erreur Discord modération: {resp.status}")
                        return False
        except Exception as e:
            logger.error(f"Erreur envoi alerte modération: {e}")
            return False

    async def send_activity_digest(self, stats: dict):
        """
        Envoie un résumé d'activité des utilisateurs sur Discord
        Format: concis, info essentielle seulement

        Args:
            stats: Statistiques d'activité
        """
        webhook = os.getenv("DISCORD_WEBHOOK_ADMIN", "")
        if not webhook:
            return False

        now = datetime.now()

        embed = {
            "title": "📊 Activité utilisateurs — Dernière heure",
            "color": 0x3498DB,
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {
                    "name": "👥 Présence",
                    "value": (
                        f"Actifs: **{stats.get('active_1h', 0)}**\n"
                        f"Sessions IA: **{stats.get('ai_sessions', 0)}**\n"
                        f"Nouveaux: **{stats.get('new_users', 0)}**"
                    ),
                    "inline": True
                },
                {
                    "name": "📈 Trading",
                    "value": (
                        f"Trades ouverts: **{stats.get('trades_opened', 0)}**\n"
                        f"Trades fermés: **{stats.get('trades_closed', 0)}**\n"
                        f"PnL net: **${stats.get('pnl_net', 0):+,.0f}**"
                    ),
                    "inline": True
                },
                {
                    "name": "🤖 IA",
                    "value": (
                        f"Messages: **{stats.get('ai_messages', 0)}**\n"
                        f"Alertes mod: **{stats.get('mod_alerts', 0)}**"
                    ),
                    "inline": True
                },
            ],
            "footer": {
                "text": f"TDB Bot • {now.strftime('%d/%m %H:%M')}"
            }
        }

        # Ajouter top actifs analysés si disponible
        if stats.get('top_assets'):
            assets_str = " • ".join(stats['top_assets'][:5])
            embed["fields"].append({
                "name": "🔥 Actifs les plus analysés",
                "value": assets_str,
                "inline": False
            })

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook,
                    json={"embeds": [embed]},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    return resp.status in (200, 204)
        except Exception as e:
            logger.error(f"Erreur digest activité: {e}")
            return False


# Instance globale
moderation_service = ModerationService()
