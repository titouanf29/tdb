"""
Service de broadcast pour envoyer des mises à jour à tous les utilisateurs
"""
import asyncio
import logging
from telegram import Bot
from database.manager import db_manager

logger = logging.getLogger(__name__)


class BroadcastService:
    """Service de gestion des broadcasts (messages à tous les utilisateurs)"""

    def __init__(self, bot: Bot):
        self.bot = bot
        self.current_version = "2.0.0"

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
        Envoie les notes de mise à jour de la version spécifiée

        Args:
            version: Version à envoyer (par défaut: version actuelle)
        """
        if version is None:
            version = self.current_version

        # Message de mise à jour formaté
        message = self._format_update_message(version)

        # Envoyer à tous les utilisateurs
        stats = await self.send_update_to_all_users(message)

        return stats

    def _format_update_message(self, version: str):
        """Formate le message de mise à jour pour Telegram"""

        if version == "2.0.0":
            return """
🎉 **NOUVELLE VERSION 2.0.0 DISPONIBLE !**

━━━━━━━━━━━━━━━━━━━━━━━━

📰 **SYSTÈME D'ACTUALITÉS INTELLIGENT**

Le bouton 📰 News est maintenant **pleinement fonctionnel** !

✅ Actualités en temps réel (Yahoo Finance, Finviz)
✅ Analyse de sentiment automatique
✅ **Prédiction de tendance future** 📈📉
✅ Recommandations d'action personnalisées
✅ Résumé intelligent avec points clés

━━━━━━━━━━━━━━━━━━━━━━━━

📊 **ANALYSE AMÉLIORÉE**

Les analyses d'actifs sont maintenant **beaucoup plus détaillées** :

✅ Explications pédagogiques pour chaque indicateur
✅ Interprétation automatique du RSI
✅ Analyse contextuelle du volume
✅ Breakdown des scores par catégorie
✅ **Recommandations intelligentes** 💡
✅ Détection des divergences et alertes

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
2️⃣ Choisissez un actif
3️⃣ Découvrez l'analyse détaillée
4️⃣ Cliquez sur 📰 News pour voir les actualités

━━━━━━━━━━━━━━━━━━━━━━━━

📋 Voir le changelog complet : github.com/titouanf29/tdb

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
        Envoie un message personnalisé à tous les utilisateurs

        Args:
            message: Le message à envoyer
        """
        return await self.send_update_to_all_users(message)


# Instance globale (sera initialisée dans main.py)
broadcast_service = None


def init_broadcast_service(bot: Bot):
    """Initialise le service de broadcast"""
    global broadcast_service
    broadcast_service = BroadcastService(bot)
    return broadcast_service
