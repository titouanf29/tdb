"""
Module Admin - Commandes administrateur
"""
from telegram import Update
from telegram.ext import ContextTypes, CommandHandler
import config


class AdminModule:
    """Module de gestion des commandes administrateur"""

    def __init__(self, application):
        self.app = application
        self.broadcast_service = None  # Sera initialisé dans main.py
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        # Commandes admin
        self.app.add_handler(CommandHandler("broadcast", self.cmd_broadcast))
        self.app.add_handler(CommandHandler("send_update", self.cmd_send_update))
        self.app.add_handler(CommandHandler("stats", self.cmd_stats))

    def is_admin(self, telegram_id: int) -> bool:
        """Vérifie si l'utilisateur est admin"""
        admin_ids = getattr(config, 'ADMIN_IDS', [])
        return telegram_id in admin_ids

    async def cmd_broadcast(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /broadcast <message>
        Envoie un message personnalisé à tous les utilisateurs
        """
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        # Récupérer le message depuis les arguments
        if not context.args:
            await update.message.reply_text(
                "❌ Usage: /broadcast <message>\n\n"
                "Exemple: /broadcast Bonjour à tous ! Le bot sera en maintenance ce soir."
            )
            return

        message = " ".join(context.args)

        # Confirmation
        await update.message.reply_text(
            f"📢 Envoi du broadcast à tous les utilisateurs...\n\n"
            f"Message: {message}"
        )

        # Envoyer le broadcast
        if self.broadcast_service:
            stats = await self.broadcast_service.send_custom_broadcast(message)

            await update.message.reply_text(
                f"✅ Broadcast terminé !\n\n"
                f"📊 Statistiques :\n"
                f"• Réussis : {stats['success']}/{stats['total']}\n"
                f"• Échoués : {stats['failed']}/{stats['total']}"
            )
        else:
            await update.message.reply_text("❌ Service de broadcast non initialisé")

    async def cmd_send_update(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /send_update [version]
        Envoie les notes de mise à jour de la version spécifiée
        """
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        # Récupérer la version (optionnel)
        version = context.args[0] if context.args else None

        # Confirmation
        version_str = version if version else "actuelle"
        await update.message.reply_text(
            f"🎉 Envoi des notes de mise à jour (version {version_str})..."
        )

        # Envoyer le broadcast
        if self.broadcast_service:
            stats = await self.broadcast_service.send_version_update(version)

            await update.message.reply_text(
                f"✅ Mise à jour envoyée !\n\n"
                f"📊 Statistiques :\n"
                f"• Réussis : {stats['success']}/{stats['total']}\n"
                f"• Échoués : {stats['failed']}/{stats['total']}"
            )
        else:
            await update.message.reply_text("❌ Service de broadcast non initialisé")

    async def cmd_stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /stats
        Affiche les statistiques du bot
        """
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        from database.manager import db_manager

        # Récupérer les statistiques
        users = await db_manager.get_all_users()
        total_users = len(users)

        await update.message.reply_text(
            f"📊 **STATISTIQUES DU BOT**\n\n"
            f"👥 Utilisateurs totaux : {total_users}\n"
            f"🤖 Version actuelle : 2.0.0\n\n"
            f"_Plus de statistiques à venir..._",
            parse_mode='Markdown'
        )
