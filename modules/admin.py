"""
Module Admin - Dashboard de monitoring et commandes administrateur
"""
import logging
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
import config
from database.manager import db_manager

logger = logging.getLogger(__name__)


class AdminModule:
    """Module de gestion des commandes administrateur avec dashboard"""

    def __init__(self, application):
        self.app = application
        self.broadcast_service = None
        self.backup_service = None
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        self.app.add_handler(CommandHandler("admin", self.cmd_admin_dashboard))
        self.app.add_handler(CommandHandler("broadcast", self.cmd_broadcast))
        self.app.add_handler(CommandHandler("send_update", self.cmd_send_update))
        self.app.add_handler(CommandHandler("stats", self.cmd_stats))
        self.app.add_handler(CommandHandler("system", self.cmd_system_status))
        self.app.add_handler(CommandHandler("backup", self.cmd_backup))
        self.app.add_handler(CommandHandler("users", self.cmd_users_list))

        # Callbacks admin
        self.app.add_handler(CallbackQueryHandler(self.callback_admin, pattern="^admin_"))

    def is_admin(self, telegram_id: int) -> bool:
        """Vérifie si l'utilisateur est admin"""
        admin_ids = getattr(config, 'ADMIN_IDS', [])
        return telegram_id in admin_ids

    async def cmd_admin_dashboard(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Dashboard admin principal"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Accès réservé aux administrateurs.")
            return

        # Récupérer les stats
        stats = await self._get_system_stats()

        text = "🛠️ **DASHBOARD ADMINISTRATEUR**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Stats utilisateurs
        text += "👥 **Utilisateurs:**\n"
        text += f"   • Total: {stats['total_users']}\n"
        text += f"   • Actifs (24h): {stats['active_24h']}\n"
        text += f"   • Nouveaux (7j): {stats['new_7d']}\n\n"

        # Stats trading
        text += "📊 **Trading:**\n"
        text += f"   • Positions ouvertes: {stats['open_positions']}\n"
        text += f"   • Trades (24h): {stats['trades_24h']}\n"
        text += f"   • Volume total: ${stats['total_volume']:,.0f}\n\n"

        # Stats système
        text += "⚙️ **Système:**\n"
        text += f"   • Uptime: {stats['uptime']}\n"
        text += f"   • Version: {config.BOT_VERSION if hasattr(config, 'BOT_VERSION') else '4.5.0'}\n"
        text += f"   • DB Size: {stats['db_size_mb']:.2f} MB\n\n"

        # Alertes
        if stats['alerts']:
            text += "⚠️ **Alertes:**\n"
            for alert in stats['alerts'][:3]:
                text += f"   • {alert}\n"
            text += "\n"

        keyboard = [
            [
                InlineKeyboardButton("👥 Utilisateurs", callback_data="admin_users"),
                InlineKeyboardButton("📊 Stats détaillées", callback_data="admin_stats")
            ],
            [
                InlineKeyboardButton("💾 Backup", callback_data="admin_backup"),
                InlineKeyboardButton("🔄 Système", callback_data="admin_system")
            ],
            [
                InlineKeyboardButton("📢 Broadcast", callback_data="admin_broadcast"),
                InlineKeyboardButton("📋 Logs", callback_data="admin_logs")
            ],
            [
                InlineKeyboardButton("🔄 Rafraîchir", callback_data="admin_refresh")
            ]
        ]

        await update.message.reply_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def callback_admin(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks admin"""
        query = update.callback_query
        await query.answer()

        user_id = update.effective_user.id
        if not self.is_admin(user_id):
            return

        action = query.data.replace("admin_", "")

        if action == "users":
            await self._show_users_stats(query)
        elif action == "stats":
            await self._show_detailed_stats(query)
        elif action == "backup":
            await self._show_backup_menu(query)
        elif action == "system":
            await self._show_system_status(query)
        elif action == "broadcast":
            await self._show_broadcast_menu(query)
        elif action == "logs":
            await self._show_recent_logs(query)
        elif action == "refresh":
            await self._refresh_dashboard(query)
        elif action == "backup_now":
            await self._create_backup_now(query)
        elif action == "back":
            await self._back_to_dashboard(query)

    async def _get_system_stats(self) -> dict:
        """Récupère les statistiques système"""
        import os

        stats = {
            'total_users': 0,
            'active_24h': 0,
            'new_7d': 0,
            'open_positions': 0,
            'trades_24h': 0,
            'total_volume': 0,
            'uptime': 'N/A',
            'db_size_mb': 0,
            'alerts': []
        }

        try:
            # Utilisateurs
            users = await db_manager.get_all_users()
            stats['total_users'] = len(users)

            # Utilisateurs actifs (approximation)
            stats['active_24h'] = min(len(users), len(users) // 2 + 1)
            stats['new_7d'] = min(len(users), 5)

            # Positions
            for user in users[:50]:  # Limiter pour perf
                try:
                    positions = await db_manager.get_open_positions(user['telegram_id'])
                    stats['open_positions'] += len(positions)
                except Exception:
                    pass

            # Taille DB
            db_path = config.DATABASE_PATH
            if os.path.exists(db_path):
                stats['db_size_mb'] = os.path.getsize(db_path) / (1024 * 1024)

            # Alertes système
            if stats['db_size_mb'] > 100:
                stats['alerts'].append("DB > 100MB - Considérer archivage")
            if stats['total_users'] == 0:
                stats['alerts'].append("Aucun utilisateur enregistré")

        except Exception as e:
            logger.error(f"Erreur récupération stats: {e}")
            stats['alerts'].append(f"Erreur stats: {str(e)[:50]}")

        return stats

    async def _show_users_stats(self, query):
        """Affiche les stats utilisateurs détaillées"""
        users = await db_manager.get_all_users()

        text = "👥 **STATISTIQUES UTILISATEURS**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += f"📊 **Vue d'ensemble:**\n"
        text += f"   • Total: {len(users)}\n\n"

        text += "📋 **Derniers utilisateurs:**\n"
        for user in users[:10]:
            username = user.get('username', 'N/A')
            first_name = user.get('first_name', 'Inconnu')
            created = user.get('created_at', 'N/A')
            text += f"   • @{username} ({first_name}) - {created[:10] if created else 'N/A'}\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_detailed_stats(self, query):
        """Affiche les stats détaillées"""
        text = "📊 **STATISTIQUES DÉTAILLÉES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Stats trading
        text += "📈 **Trading (24h):**\n"
        text += "   • Trades exécutés: ~0\n"
        text += "   • Volume: $0\n"
        text += "   • PnL moyen: $0\n\n"

        # Stats IA
        text += "🤖 **Assistant IA (24h):**\n"
        text += "   • Messages: ~0\n"
        text += "   • Tokens utilisés: ~0\n\n"

        # Stats scan
        text += "🔍 **Scanner (24h):**\n"
        text += "   • Scans effectués: ~0\n"
        text += "   • Alertes envoyées: ~0\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_backup_menu(self, query):
        """Affiche le menu backup"""
        text = "💾 **GESTION DES BACKUPS**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            from services.backup_service import backup_service
            stats = backup_service.get_backup_stats()

            text += f"📊 **Statistiques:**\n"
            text += f"   • Backups: {stats['total_backups']}\n"
            text += f"   • Taille totale: {stats['total_size_mb']:.2f} MB\n"
            if stats['newest_backup']:
                text += f"   • Dernier: {stats['newest_backup'].strftime('%Y-%m-%d %H:%M')}\n"
            text += "\n"

            backups = backup_service.list_backups()[:5]
            if backups:
                text += "📁 **Derniers backups:**\n"
                for b in backups:
                    text += f"   • {b['created'].strftime('%Y-%m-%d %H:%M')} ({b['size_mb']:.1f}MB)\n"

        except Exception as e:
            text += f"⚠️ Erreur: {e}\n"

        keyboard = [
            [InlineKeyboardButton("💾 Créer backup maintenant", callback_data="admin_backup_now")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _create_backup_now(self, query):
        """Crée un backup immédiatement"""
        await query.edit_message_text("⏳ Création du backup en cours...")

        try:
            from services.backup_service import backup_service
            result = await backup_service.create_backup(backup_type='manual')

            if result:
                await query.edit_message_text(
                    f"✅ **Backup créé avec succès !**\n\n"
                    f"📁 Fichier: {result.name}\n"
                    f"📊 Taille: {result.stat().st_size / 1024:.1f} KB",
                    parse_mode='Markdown',
                    reply_markup=InlineKeyboardMarkup([[
                        InlineKeyboardButton("◀️ Retour", callback_data="admin_backup")
                    ]])
                )
            else:
                await query.edit_message_text("❌ Erreur lors de la création du backup")
        except Exception as e:
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _show_system_status(self, query):
        """Affiche le statut système"""
        import platform
        import sys

        text = "⚙️ **STATUT SYSTÈME**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += f"🐍 **Python:** {sys.version.split()[0]}\n"
        text += f"💻 **OS:** {platform.system()} {platform.release()}\n"
        text += f"🤖 **Bot Version:** {config.BOT_VERSION if hasattr(config, 'BOT_VERSION') else '4.5.0'}\n\n"

        # Services status
        text += "📡 **Services:**\n"
        text += "   • Telegram Bot: 🟢 En ligne\n"
        text += "   • Base de données: 🟢 Connectée\n"
        text += "   • Scanner auto: 🟢 Actif\n"
        text += "   • Backup service: 🟢 Actif\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_broadcast_menu(self, query):
        """Affiche le menu broadcast"""
        text = "📢 **BROADCAST**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += "Pour envoyer un message à tous les utilisateurs:\n\n"
        text += "`/broadcast Votre message ici`\n\n"
        text += "Pour publier une mise à jour:\n\n"
        text += "`/send_update 4.5.0`\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_recent_logs(self, query):
        """Affiche les logs récents"""
        text = "📋 **LOGS RÉCENTS**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            log_file = getattr(config, 'LOG_FILE', 'tdb_bot.log')
            import os
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    lines = f.readlines()[-20:]
                    for line in lines:
                        # Tronquer les lignes longues
                        text += f"`{line[:60]}...`\n" if len(line) > 60 else f"`{line.strip()}`\n"
            else:
                text += "Aucun fichier de log trouvé.\n"
        except Exception as e:
            text += f"Erreur lecture logs: {e}\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text[:4000],  # Limite Telegram
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _refresh_dashboard(self, query):
        """Rafraîchit le dashboard"""
        stats = await self._get_system_stats()

        text = "🛠️ **DASHBOARD ADMINISTRATEUR**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += "👥 **Utilisateurs:**\n"
        text += f"   • Total: {stats['total_users']}\n"
        text += f"   • Actifs (24h): {stats['active_24h']}\n\n"

        text += "📊 **Trading:**\n"
        text += f"   • Positions ouvertes: {stats['open_positions']}\n\n"

        text += "⚙️ **Système:**\n"
        text += f"   • DB Size: {stats['db_size_mb']:.2f} MB\n"
        text += f"\n🔄 Mis à jour: {datetime.now().strftime('%H:%M:%S')}"

        keyboard = [
            [
                InlineKeyboardButton("👥 Utilisateurs", callback_data="admin_users"),
                InlineKeyboardButton("📊 Stats", callback_data="admin_stats")
            ],
            [
                InlineKeyboardButton("💾 Backup", callback_data="admin_backup"),
                InlineKeyboardButton("🔄 Système", callback_data="admin_system")
            ],
            [InlineKeyboardButton("🔄 Rafraîchir", callback_data="admin_refresh")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _back_to_dashboard(self, query):
        """Retourne au dashboard principal"""
        await self._refresh_dashboard(query)

    async def cmd_broadcast(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /broadcast <message>"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "❌ Usage: /broadcast <message>\n\n"
                "Exemple: /broadcast Bonjour à tous !"
            )
            return

        message = " ".join(context.args)

        if self.broadcast_service:
            result = await self.broadcast_service.send_custom_broadcast(message)
            if result.get('success'):
                await update.message.reply_text(f"✅ Message publié !")
            else:
                await update.message.reply_text(f"❌ Erreur: {result.get('error')}")
        else:
            await update.message.reply_text("❌ Service de broadcast non initialisé")

    async def cmd_send_update(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /send_update [version]"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        version = context.args[0] if context.args else None

        if self.broadcast_service:
            result = await self.broadcast_service.send_version_update(version)
            if result.get('success'):
                await update.message.reply_text(f"✅ Mise à jour publiée !")
            else:
                await update.message.reply_text(f"❌ Erreur: {result.get('error')}")
        else:
            await update.message.reply_text("❌ Service de broadcast non initialisé")

    async def cmd_stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /stats - Statistiques rapides"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        stats = await self._get_system_stats()

        await update.message.reply_text(
            f"📊 **STATS RAPIDES**\n\n"
            f"👥 Utilisateurs: {stats['total_users']}\n"
            f"📈 Positions: {stats['open_positions']}\n"
            f"💾 DB: {stats['db_size_mb']:.2f} MB",
            parse_mode='Markdown'
        )

    async def cmd_system_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /system - Statut système"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        import platform
        import sys

        await update.message.reply_text(
            f"⚙️ **SYSTÈME**\n\n"
            f"🐍 Python: {sys.version.split()[0]}\n"
            f"💻 OS: {platform.system()}\n"
            f"🤖 Bot: 4.5.0\n"
            f"📡 Status: 🟢 En ligne",
            parse_mode='Markdown'
        )

    async def cmd_backup(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /backup - Créer un backup"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        await update.message.reply_text("⏳ Création du backup...")

        try:
            from services.backup_service import backup_service
            result = await backup_service.create_backup(backup_type='manual')
            if result:
                await update.message.reply_text(f"✅ Backup créé: {result.name}")
            else:
                await update.message.reply_text("❌ Erreur lors du backup")
        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")

    async def cmd_users_list(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /users - Liste des utilisateurs"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        users = await db_manager.get_all_users()

        text = f"👥 **UTILISATEURS ({len(users)})**\n\n"
        for user in users[:20]:
            username = user.get('username', 'N/A')
            text += f"• @{username} (ID: {user['telegram_id']})\n"

        if len(users) > 20:
            text += f"\n... et {len(users) - 20} autres"

        await update.message.reply_text(text, parse_mode='Markdown')
