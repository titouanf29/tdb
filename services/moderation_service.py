"""
Service de modération STRICT - Détection hors-sujet IA + Alertes Discord
Surveille les conversations IA et envoie des alertes dès qu'un utilisateur
s'écarte du domaine finance/trading.

RÈGLES STRICTES:
- Tout message dangereux/illégal → 🔴 HAUTE immédiatement
- Tout message hors-finance sans contexte trading → 🟡 MODÉRÉE minimum
- Messages ambigus ou tentatives de détournement → 🟠 FAIBLE
"""
import logging
import os
import re
import aiohttp
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ============================================================================
# MOTS-CLÉS DANGEREUX - Alerte HAUTE immédiate (score 100)
# ============================================================================
DANGEROUS_KEYWORDS = [
    # Hacking / Cybercrime
    "hack", "hacker", "hacking", "pirater", "piratage", "pirate",
    "ddos", "malware", "virus", "trojan", "ransomware", "exploit",
    "crack", "cracker", "brute force", "sql injection", "phishing",
    "password", "mot de passe", "credential", "bypass", "contourner",

    # Violence / Terrorisme
    "bombe", "explosif", "explosion", "arme", "tuer", "meurtre",
    "assassiner", "terrorisme", "terroriste", "attaque", "attentat",
    "violence", "torture", "kidnapper", "enlever",

    # Drogues / Illégal
    "drogue", "cocaine", "heroine", "mdma", "lsd", "cannabis", "dealer",
    "trafic", "blanchiment", "argent sale", "faux billets", "contrefaçon",

    # Fraude
    "fraude", "frauder", "arnaque", "arnaquer", "escroquerie", "voler",
    "usurper", "faux documents", "fausse identité",

    # Contenu inapproprié
    "sexe", "porno", "pornographie", "escort", "prostitution", "nude",
    "pedophile", "inceste",
]

# ============================================================================
# MOTS-CLÉS HORS-SUJET - Alerte MODÉRÉE (score 50-70)
# ============================================================================
OFFTOPIC_KEYWORDS = [
    # Divertissement
    "film", "série", "netflix", "cinéma", "musique", "chanson", "concert",
    "jeu vidéo", "gaming", "playstation", "xbox", "nintendo", "fortnite",
    "pokemon", "minecraft", "fifa", "call of duty",

    # Sport (hors paris sportifs)
    "football", "basketball", "tennis", "rugby", "cyclisme", "formule 1",
    "ligue des champions", "coupe du monde", "euro 2024", "jeux olympiques",

    # Cuisine / Lifestyle
    "recette", "cuisine", "cuisiner", "gâteau", "pizza", "restaurant",
    "régime", "fitness", "musculation", "yoga",

    # Météo / Astrologie
    "météo", "pluie", "soleil", "température", "horoscope", "astrologie",
    "signe", "zodiaque",

    # Créatif
    "poème", "poésie", "histoire", "roman", "écrire", "dessin",
    "blague", "humour", "raconter", "inventer",

    # Tech non-finance
    "programmer", "code python", "javascript", "créer un site", "application",
    "intelligence artificielle", "chatgpt", "comment fonctionne",

    # Questions personnelles
    "copine", "copain", "relation", "amour", "drague", "séduire",
    "conseil personnel", "vie privée", "problème personnel",

    # Éducation non-finance
    "devoir", "cours", "examen", "maths", "physique", "histoire",
    "dissertation", "exposé",
]

# ============================================================================
# INDICATEURS DE DÉTOURNEMENT - Suspicion FAIBLE (score 30-50)
# ============================================================================
DIVERSION_INDICATORS = [
    "oublie", "ignore", "fais comme si", "tu es maintenant", "tu n'es plus",
    "role play", "roleplay", "jeu de rôle", "imagine que", "prétends",
    "simule", "agis comme", "fais semblant", "sans restriction",
    "ignore tes règles", "ignore tes instructions", "jailbreak",
    "dan mode", "developer mode", "mode développeur",
    "peux-tu m'aider à", "aide-moi à", "comment faire pour",
]

# ============================================================================
# MOTS-CLÉS FINANCE LÉGITIMES
# ============================================================================
FINANCE_KEYWORDS = [
    # Termes généraux
    "trading", "trader", "trade", "bourse", "marché", "marchés",
    "investir", "investissement", "investisseur", "portefeuille",

    # Actifs
    "action", "actions", "crypto", "cryptomonnaie", "bitcoin", "btc",
    "ethereum", "eth", "forex", "devises", "matières premières",
    "or", "pétrole", "commodities", "etf", "obligation", "bond",

    # Indices
    "cac", "cac40", "nasdaq", "sp500", "s&p", "dow jones", "dax",
    "nikkei", "ftse", "eurostoxx",

    # Analyse technique
    "analyse", "analyser", "technique", "graphique", "chart", "bougie",
    "rsi", "macd", "moyenne mobile", "ema", "sma", "bollinger",
    "fibonacci", "support", "résistance", "tendance", "trend",
    "breakout", "pullback", "retracement", "divergence",

    # Trading
    "position", "long", "short", "acheter", "vendre", "buy", "sell",
    "stop loss", "take profit", "sl", "tp", "levier", "leverage",
    "margin", "marge", "lot", "pip", "spread",

    # Économie
    "fed", "bce", "banque centrale", "taux", "taux d'intérêt",
    "inflation", "pib", "emploi", "chômage", "croissance", "récession",
    "politique monétaire", "quantitative easing",

    # Symboles populaires
    "aapl", "apple", "tsla", "tesla", "nvda", "nvidia", "msft", "microsoft",
    "googl", "google", "amzn", "amazon", "meta", "facebook",

    # Vocabulaire bot
    "wallet", "solde", "pnl", "profit", "perte", "gain",
    "alerte", "favori", "scan", "screener", "signal",
]

# ============================================================================
# QUESTIONS AUTORISÉES (contexte IA trading)
# ============================================================================
ALLOWED_QUESTIONS = [
    "quel", "quelle", "quels", "quelles",
    "comment", "pourquoi", "quand", "où",
    "peux-tu analyser", "analyse", "que penses-tu",
    "prévision", "prédiction", "avis sur", "conseil",
    "opportunité", "signal", "stratégie",
]


class ModerationService:
    """Service de modération STRICT des conversations IA"""

    def __init__(self):
        self.discord_webhook = os.getenv("DISCORD_WEBHOOK_ADMIN", "")
        self.enabled = bool(self.discord_webhook)

        if not self.enabled:
            logger.info("Modération Discord désactivée (DISCORD_WEBHOOK_ADMIN manquant)")

    def analyze_message(self, message: str) -> dict:
        """
        Analyse STRICTE d'un message pour détecter s'il est hors-sujet

        Returns:
            dict avec 'is_offtopic', 'severity', 'score', 'triggers', 'reason'
        """
        message_lower = message.lower()

        result = {
            'is_offtopic': False,
            'severity': None,  # 'high', 'moderate', 'low'
            'score': 0,
            'triggers': [],
            'reason': '',
            'has_finance': False
        }

        # ========== ÉTAPE 1: Vérifier les mots DANGEREUX (HAUTE immédiate) ==========
        dangerous_matches = [kw for kw in DANGEROUS_KEYWORDS if kw in message_lower]
        if dangerous_matches:
            result['is_offtopic'] = True
            result['severity'] = 'high'
            result['score'] = 100
            result['triggers'] = dangerous_matches
            result['reason'] = f"Contenu dangereux/illégal détecté: {', '.join(dangerous_matches[:3])}"
            return result

        # ========== ÉTAPE 2: Vérifier les tentatives de détournement ==========
        diversion_matches = [kw for kw in DIVERSION_INDICATORS if kw in message_lower]
        if diversion_matches:
            result['is_offtopic'] = True
            result['severity'] = 'moderate'
            result['score'] = 70
            result['triggers'] = diversion_matches
            result['reason'] = f"Tentative de détournement du bot: {', '.join(diversion_matches[:3])}"
            return result

        # ========== ÉTAPE 3: Vérifier les mots-clés finance ==========
        finance_matches = [kw for kw in FINANCE_KEYWORDS if kw in message_lower]
        result['has_finance'] = len(finance_matches) > 0

        # ========== ÉTAPE 4: Vérifier les mots-clés hors-sujet ==========
        offtopic_matches = [kw for kw in OFFTOPIC_KEYWORDS if kw in message_lower]

        if offtopic_matches:
            if finance_matches:
                # Mélange finance + hors-sujet: alerte faible
                result['is_offtopic'] = True
                result['severity'] = 'low'
                result['score'] = 40
                result['triggers'] = offtopic_matches
                result['reason'] = f"Discussion mixte finance/hors-sujet: {', '.join(offtopic_matches[:3])}"
            else:
                # Purement hors-sujet: alerte modérée
                result['is_offtopic'] = True
                result['severity'] = 'moderate'
                result['score'] = 60
                result['triggers'] = offtopic_matches
                result['reason'] = f"Discussion hors-sujet trading: {', '.join(offtopic_matches[:3])}"
            return result

        # ========== ÉTAPE 5: Analyser le contexte si pas de finance ==========
        if not finance_matches:
            # Message sans aucun contexte finance
            words = message_lower.split()

            # Questions génériques sans rapport au trading
            question_words = ["comment", "pourquoi", "peux-tu", "aide-moi", "explique", "c'est quoi", "qu'est-ce"]
            has_question = any(qw in message_lower for qw in question_words)

            # Si c'est une question et aucun mot finance → suspicion
            if has_question and len(words) > 3:
                # Vérifier si c'est une demande d'aide non-finance
                help_indicators = ["m'aider", "aide-moi", "peux-tu faire", "faire pour moi", "créer", "écrire", "générer"]
                if any(hi in message_lower for hi in help_indicators):
                    result['is_offtopic'] = True
                    result['severity'] = 'low'
                    result['score'] = 35
                    result['triggers'] = ["Question non liée au trading"]
                    result['reason'] = "Demande d'aide hors contexte trading"
                    return result

            # Message long sans aucun mot finance = suspicieux
            if len(words) > 10 and not finance_matches:
                result['is_offtopic'] = True
                result['severity'] = 'low'
                result['score'] = 25
                result['triggers'] = ["Aucun contexte finance"]
                result['reason'] = "Message long sans rapport apparent au trading"
                return result

        return result

    def get_alert_level(self, analysis: dict) -> tuple:
        """Retourne le niveau d'alerte formaté et la couleur"""
        severity = analysis.get('severity', 'low')
        score = analysis.get('score', 0)

        if severity == 'high' or score >= 70:
            return "🔴 HAUTE", 0xFF0000
        elif severity == 'moderate' or score >= 40:
            return "🟡 MODÉRÉE", 0xFFA500
        else:
            return "🟠 FAIBLE", 0xFF6600

    async def alert_discord(self, user_info: dict, message: str, analysis: dict,
                            ai_response: str = None):
        """
        Envoie une alerte Discord détaillée
        """
        if not self.enabled:
            return False

        user_id = user_info.get('telegram_id', '?')
        username = user_info.get('username', '')
        first_name = user_info.get('first_name', 'Inconnu')
        display_name = f"@{username}" if username else first_name

        # Niveau d'alerte
        level, color = self.get_alert_level(analysis)

        # Tronquer le message
        msg_short = message[:300] + "..." if len(message) > 300 else message
        triggers = ", ".join(analysis.get('triggers', [])) or "Hors-sujet général"
        reason = analysis.get('reason', 'Contenu non lié au trading')

        embed = {
            "title": f"⚠️ ALERTE MODÉRATION — {level}",
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {
                    "name": "👤 Utilisateur",
                    "value": f"**{display_name}**\nID: `{user_id}`",
                    "inline": True
                },
                {
                    "name": "📊 Score",
                    "value": f"**{analysis.get('score', 0)}/100**\nNiveau: {level}",
                    "inline": True
                },
                {
                    "name": "📝 Raison",
                    "value": reason,
                    "inline": False
                },
                {
                    "name": "🚨 Mots déclencheurs",
                    "value": f"`{triggers}`",
                    "inline": False
                },
                {
                    "name": "💬 Message de l'utilisateur",
                    "value": f"```{msg_short}```",
                    "inline": False
                },
            ],
            "footer": {
                "text": f"TDB Bot — Modération STRICTE • {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            }
        }

        # Ajouter infos profil utilisateur
        extra_info = []
        if user_info.get('created_at'):
            extra_info.append(f"📅 Inscrit: {user_info['created_at'][:10]}")
        if user_info.get('last_seen'):
            extra_info.append(f"👁️ Vu: {user_info['last_seen'][:16]}")
        if user_info.get('balance') is not None:
            extra_info.append(f"💰 Solde: ${user_info['balance']:,.0f}")
        if user_info.get('total_trades') is not None:
            extra_info.append(f"📈 Trades: {user_info['total_trades']}")
        if user_info.get('total_pnl') is not None:
            extra_info.append(f"💵 PnL: ${user_info['total_pnl']:+,.0f}")

        if extra_info:
            embed["fields"].insert(2, {
                "name": "📊 Profil utilisateur",
                "value": "\n".join(extra_info),
                "inline": False
            })

        try:
            async with aiohttp.ClientSession() as session:
                # Mention pour alertes HAUTE
                content = "⚠️ **ALERTE MODÉRATION**"
                if analysis.get('severity') == 'high':
                    content = "🚨 **ALERTE HAUTE — ACTION REQUISE** 🚨"

                payload = {
                    "content": content,
                    "embeds": [embed]
                }
                async with session.post(
                    self.discord_webhook,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status in (200, 204):
                        logger.info(f"Alerte modération {level} envoyée pour user {user_id}")
                        return True
                    else:
                        logger.warning(f"Erreur Discord modération: {resp.status}")
                        return False
        except Exception as e:
            logger.error(f"Erreur envoi alerte modération: {e}")
            return False

    async def send_activity_digest(self, stats: dict):
        """Envoie un résumé d'activité des utilisateurs sur Discord"""
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
