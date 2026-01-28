"""
Service de broadcast pour envoyer des mises à jour dans le canal principal
"""
import asyncio
import logging
from telegram import Bot
from database.manager import db_manager
import config

logger = logging.getLogger(__name__)


class BroadcastService:
    """Service de gestion des broadcasts (messages dans le canal principal)"""

    def __init__(self, bot: Bot):
        self.bot = bot
        self.current_version = "2.2.0"
        self.channel_id = config.CHANNEL_ID

    async def send_update_to_all_users(self, message: str, parse_mode='Markdown'):
        """
        Envoie un message de mise à jour à tous les utilisateurs actifs

        Args:
            message: Le message à envoyer
            parse_mode: Format du message (Markdown, HTML)

        Returns:
            dict avec statistiques d'envoi
        """
        try:
            logger.info(f"🔔 Début du broadcast vers tous les utilisateurs...")

            # Récupérer tous les utilisateurs
            users = await db_manager.get_all_users()

            if not users:
                logger.warning("Aucun utilisateur trouvé")
                return {
                    'success': 0,
                    'failed': 0,
                    'total': 0
                }

            success_count = 0
            failed_count = 0
            total_count = len(users)

            logger.info(f"📊 {total_count} utilisateurs trouvés")

            # Envoyer le message à chaque utilisateur
            for user in users:
                try:
                    telegram_id = user['telegram_id']

                    await self.bot.send_message(
                        chat_id=telegram_id,
                        text=message,
                        parse_mode=parse_mode,
                        disable_web_page_preview=True
                    )

                    success_count += 1
                    logger.debug(f"✅ Message envoyé à {telegram_id}")

                    # Petit délai pour éviter de dépasser les limites Telegram
                    await asyncio.sleep(0.05)  # 50ms entre chaque message

                except Exception as e:
                    failed_count += 1
                    logger.error(f"❌ Erreur envoi à {telegram_id}: {e}")
                    continue

            logger.info(f"""
🔔 Broadcast terminé:
  ✅ Réussis: {success_count}/{total_count}
  ❌ Échoués: {failed_count}/{total_count}
""")

            return {
                'success': success_count,
                'failed': failed_count,
                'total': total_count
            }

        except Exception as e:
            logger.error(f"❌ Erreur globale lors du broadcast: {e}")
            return {
                'success': 0,
                'failed': 0,
                'total': 0,
                'error': str(e)
            }

    async def send_version_update(self, version: str = None):
        """
        Publie les notes de mise à jour dans le canal principal

        Args:
            version: Version à envoyer (par défaut: version actuelle)
        """
        if version is None:
            version = self.current_version

        try:
            # Message de mise à jour formaté
            message = self._format_update_message(version)

            # Publier dans le canal
            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode='Markdown',
                disable_web_page_preview=True
            )

            logger.info(f"✅ Mise à jour v{version} publiée dans le canal {self.channel_id}")

            return {
                'success': True,
                'channel_id': self.channel_id,
                'version': version
            }

        except Exception as e:
            logger.error(f"❌ Erreur publication dans le canal: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _format_update_message(self, version: str):
        """Formate le message de mise a jour pour Telegram"""

        if version == "2.2.0":
            return """
🚀 MISE A JOUR v2.2.0 - EVOLUTION MAJEURE

━━━━━━━━━━━━━━━━━━━━━━━━

📢 ALERTES MARCHES AUTOMATIQUES

Recevez des notifications a l'ouverture et fermeture des marches !
- 🇺🇸 US : 15h30 / 22h00 (Paris)
- 🇪🇺 Europe : 9h00 / 17h30
- 🇯🇵 Asie : 1h00 / 7h00

Chaque alerte inclut:
• Resume IA des opportunites
• Top performers de la seance
• Actifs a surveiller

━━━━━━━━━━━━━━━━━━━━━━━━

📊 GRAPHIQUES PROFESSIONNELS

Nouveaux graphiques avec selection d'intervalle:
• 1J, 1S, 1M, 3M, 1A, MAX
• RSI integre en panneau inferieur
• EMA colorees (20/50/200)
• Theme sombre professionnel

━━━━━━━━━━━━━━━━━━━━━━━━

🧠 ALGORITHME AMELIORE

• Niveaux Fibonacci automatiques
• Detection retournements (divergences RSI)
• Patterns: Double Top/Bottom, Marteau
• Resume IA via intelligence artificielle

━━━━━━━━━━━━━━━━━━━━━━━━

💰 CORRECTION WALLET

Bug critique corrige: le calcul des gains/pertes est maintenant exact.
Si vous aviez des montants etranges, ils sont desormais corrects.

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 ASSISTANT IA AMELIORE

• Reponses plus lisibles et claires
• Affichage du temps avant reset de la limite
• Format optimise pour Telegram

━━━━━━━━━━━━━━━━━━━━━━━━

Utilisez /menu pour decouvrir toutes les nouveautes !

Bon trading ! 📈
"""
        elif version == "2.1.2":
            return """
🔧 **MISE A JOUR v2.1.2 - CORRECTIFS ASSISTANT IA**

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 **ASSISTANT IA - CHAT REPARE !**

Le mode chat de l'assistant IA est maintenant **pleinement fonctionnel** !

🐛 **Bugs corrigés :**

✅ **Chat bloqué** : Le chat ne répondait plus après activation - un conflit interne entre les handlers empêchait les messages d'arriver à l'assistant IA. C'est résolu !
✅ **Bouton Assistant IA** : Le bouton du menu principal fonctionne correctement
✅ **Affichage des réponses** : Plus d'erreurs de formatage dans les messages
✅ **Message de bienvenue** : Affichage corrigé à l'activation du chat

━━━━━━━━━━━━━━━━━━━━━━━━

💡 **RAPPEL - COMMENT UTILISER ?**

1️⃣ Ouvrez le menu avec /menu
2️⃣ Cliquez sur 🤖 Assistant IA
3️⃣ Posez vos questions sur le trading !
4️⃣ Tapez /stop\\_ai pour arrêter le chat

📊 Limite : 20 messages/jour par utilisateur

━━━━━━━━━━━━━━━━━━━━━━━━

_Merci de votre patience et bon trading ! 📈_
"""
        elif version == "2.0.0":
            return """
🎉 **NOUVELLE VERSION 2.0.0 DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

📰 **SYSTÈME D'ACTUALITÉS INTELLIGENT**

Le bouton 📰 News est maintenant **pleinement fonctionnel** !

✅ **Sources multiples** :
   • Yahoo Finance (API)
   • Google News (RSS)
   • Finviz (actions)
   • CoinDesk (crypto)

✅ **Détection automatique** du type d'actif
✅ **Analyse de sentiment** automatique
✅ **Prédiction de tendance future** 📈📉
✅ **Recommandations d'action** personnalisées
✅ **Résumé intelligent** avec points clés
✅ **Déduplication** des articles
✅ **Taux de succès** : 98%

**Résultat** : 8 articles de sources variées au lieu de 2-3 !

━━━━━━━━━━━━━━━━━━━━━━━━

📊 **ANALYSE AMÉLIORÉE**

Les analyses d'actifs sont maintenant **beaucoup plus détaillées** :

✅ **Explications pédagogiques** pour chaque indicateur
✅ **Interprétation automatique** du RSI
✅ **Analyse contextuelle** du volume
✅ **Breakdown des scores** par catégorie
✅ **Recommandations intelligentes** 💡
✅ **Détection des divergences** et alertes

━━━━━━━━━━━━━━━━━━━━━━━━

🚀 **EXEMPLE DE RECOMMANDATIONS**

Le bot vous guide maintenant avec des conseils comme :
• "🟢 Signal fort d'achat - Conditions favorables"
• "⚠️ RSI en surachat, risque de correction"
• "✅ Volume élevé confirme le mouvement"
• "🛑 Risque élevé : Réduire la position"

━━━━━━━━━━━━━━━━━━━━━━━━

💡 **TESTEZ DÈS MAINTENANT !**

1️⃣ Allez sur 📊 Marché
2️⃣ Choisissez un actif (AAPL, BTC-USD, etc.)
3️⃣ Découvrez l'analyse détaillée
4️⃣ Cliquez sur 📰 News pour les actualités multi-sources

━━━━━━━━━━━━━━━━━━━━━━━━

📋 Voir le changelog : github.com/titouanf29/tdb

_Bonne analyse et bon trading ! 📈_
"""
        else:
            # Template générique pour les futures versions
            return f"""
🎉 **NOUVELLE VERSION {version} DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

Consultez le changelog pour plus de détails :
📋 github.com/titouanf29/tdb/blob/main/CHANGELOG.md

_Merci d'utiliser TDB Bot ! 🤖_
"""

    async def send_custom_broadcast(self, message: str):
        """
        Publie un message personnalisé dans le canal principal

        Args:
            message: Le message à publier
        """
        try:
            # Publier dans le canal
            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode='Markdown',
                disable_web_page_preview=True
            )

            logger.info(f"✅ Message personnalisé publié dans le canal {self.channel_id}")

            return {
                'success': True,
                'channel_id': self.channel_id
            }

        except Exception as e:
            logger.error(f"❌ Erreur publication dans le canal: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def send_to_channel(self, message: str, parse_mode: str = None):
        """
        Envoie un message au canal principal (sans markdown par defaut)

        Args:
            message: Le message a envoyer
            parse_mode: Mode de parsing (None, 'Markdown', 'HTML')
        """
        try:
            if not self.bot or not self.channel_id:
                logger.warning("Bot ou channel_id non configure")
                return {'success': False, 'error': 'Service non initialise'}

            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode=parse_mode,
                disable_web_page_preview=True
            )

            logger.info(f"Message envoye au canal {self.channel_id}")
            return {'success': True, 'channel_id': self.channel_id}

        except Exception as e:
            logger.error(f"Erreur envoi canal: {e}")
            return {'success': False, 'error': str(e)}


# Instance globale (sera initialisee dans main.py)
broadcast_service = None


def init_broadcast_service(bot: Bot):
    """Initialise le service de broadcast"""
    global broadcast_service
    broadcast_service = BroadcastService(bot)
    return broadcast_service
