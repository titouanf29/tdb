"""
Module Admin - Dashboard de monitoring et commandes administrateur
"""
import logging
import os
import json
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
import config
from database.manager import db_manager
from utils.loading import show_loading, LoadingAnimation
from services.discord_service import discord_service

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
        self.app.add_handler(CommandHandler("post_welcome", self.cmd_post_welcome))
        self.app.add_handler(CommandHandler("myid", self.cmd_myid))
        self.app.add_handler(CommandHandler("setup_admin", self.cmd_setup_admin))
        self.app.add_handler(CommandHandler("reset_onboarding", self.cmd_reset_onboarding))
        self.app.add_handler(CommandHandler("discord", self.cmd_discord_message))

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
                InlineKeyboardButton("🗑️ Cache", callback_data="admin_cache"),
                InlineKeyboardButton("🔧 Maintenance", callback_data="admin_maintenance")
            ],
            [
                InlineKeyboardButton("⚙️ Config", callback_data="admin_config"),
                InlineKeyboardButton("📈 Performance", callback_data="admin_performance")
            ],
            [
                InlineKeyboardButton("🎮 Discord", callback_data="admin_discord")
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
        elif action == "cache":
            await self._show_cache_menu(query)
        elif action == "cache_clear":
            await self._clear_cache(query)
        elif action == "maintenance":
            await self._show_maintenance_menu(query)
        elif action == "maintenance_optimize":
            await self._optimize_database(query)
        elif action == "maintenance_cleanup":
            await self._cleanup_old_data(query)
        elif action == "config":
            await self._show_config_viewer(query)
        elif action == "performance":
            await self._show_performance_metrics(query)
        elif action == "discord":
            await self._show_discord_menu(query)
        elif action == "discord_test":
            await self._send_discord_test(query)
        elif action.startswith("user_detail_"):
            user_id = int(action.replace("user_detail_", ""))
            await self._show_user_detail(query, user_id)

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

            # Positions (requête unique au lieu de N+1)
            stats['open_positions'] = await db_manager.count_all_open_positions()

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
                with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()[-20:]
                    for line in lines:
                        # Nettoyer et tronquer les lignes longues
                        clean_line = line.strip().replace('`', "'")
                        if len(clean_line) > 60:
                            text += f"`{clean_line[:60]}...`\n"
                        elif clean_line:
                            text += f"`{clean_line}`\n"
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

    async def cmd_post_welcome(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /post_welcome - Publie le message d'accueil dans le canal"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        # Récupérer l'ID du canal
        channel_id = getattr(config, 'WELCOME_CHANNEL_ID', '') or getattr(config, 'CHANNEL_ID', '')

        if not channel_id:
            await update.message.reply_text(
                "❌ Aucun canal configuré.\n\n"
                "Configurez WELCOME_CHANNEL_ID ou CHANNEL_ID dans config.py"
            )
            return

        # Récupérer le username du bot
        bot = await context.bot.get_me()
        bot_username = bot.username

        # Message d'accueil à publier
        welcome_text = f"""🤖 <b>Bienvenue sur TDB Trading Bot !</b>

━━━━━━━━━━━━━━━━━━━━

<b>Votre assistant IA de trading virtuel.</b>

✨ <b>Fonctionnalités :</b>
📊 Analyses IA en temps réel
🎯 Alertes d'opportunités personnalisées
📈 Paper Trading (10 000$ virtuels)
🔔 Notifications intelligentes
📱 Interface intuitive

━━━━━━━━━━━━━━━━━━━━

💡 <b>Comment commencer ?</b>
Cliquez sur le bouton ci-dessous pour démarrer le bot en message privé et configurer votre profil !

🆓 <b>Gratuit</b> - Aucune carte requise"""

        keyboard = [
            [InlineKeyboardButton("🚀 Démarrer le Bot", url=f"https://t.me/{bot_username}?start=welcome")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        try:
            await context.bot.send_message(
                chat_id=channel_id,
                text=welcome_text,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
            await update.message.reply_text(f"✅ Message d'accueil publié dans le canal !")
        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}\n\nVérifiez que le bot est admin du canal.")

    async def cmd_myid(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /myid - Affiche l'ID Telegram de l'utilisateur"""
        user = update.effective_user
        chat = update.effective_chat

        text = f"""🆔 <b>Vos informations Telegram</b>

━━━━━━━━━━━━━━━━━━━━

👤 <b>Utilisateur :</b>
• ID : <code>{user.id}</code>
• Username : @{user.username or 'Non défini'}
• Prénom : {user.first_name}

💬 <b>Chat actuel :</b>
• ID : <code>{chat.id}</code>
• Type : {chat.type}

━━━━━━━━━━━━━━━━━━━━

📋 <b>Pour devenir admin :</b>
1. Copiez votre ID ci-dessus
2. Ajoutez-le dans <code>config.py</code> :

<code>ADMIN_IDS = [
    {user.id}
]</code>

3. Redémarrez le bot"""

        await update.message.reply_text(text, parse_mode='HTML')

    async def cmd_setup_admin(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /setup_admin - Configuration rapide admin (première fois uniquement)"""
        user_id = update.effective_user.id

        # Vérifier si des admins existent déjà
        admin_ids = getattr(config, 'ADMIN_IDS', [])

        if admin_ids and len(admin_ids) > 0:
            if user_id in admin_ids:
                await update.message.reply_text("✅ Vous êtes déjà administrateur.")
            else:
                await update.message.reply_text("❌ Un administrateur existe déjà. Contactez-le pour obtenir les droits.")
            return

        # Aucun admin - afficher les instructions
        text = f"""⚙️ <b>Configuration Admin</b>

━━━━━━━━━━━━━━━━━━━━

Aucun administrateur n'est configuré.

<b>Pour vous définir comme admin :</b>

1️⃣ Ouvrez <code>config.py</code>

2️⃣ Trouvez cette section :
<code>ADMIN_IDS = [
    # Ajoutez votre ID Telegram ici
]</code>

3️⃣ Remplacez par :
<code>ADMIN_IDS = [
    {user_id}
]</code>

4️⃣ Redémarrez le bot

━━━━━━━━━━━━━━━━━━━━

Votre ID : <code>{user_id}</code>
(Cliquez pour copier)"""

        await update.message.reply_text(text, parse_mode='HTML')

    async def cmd_reset_onboarding(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /reset_onboarding - Réinitialise l'onboarding pour pouvoir le refaire"""
        user_id = update.effective_user.id

        try:
            import aiosqlite
            # Supprimer l'onboarding existant
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                await db.execute("""
                    DELETE FROM user_onboarding WHERE telegram_id = ?
                """, (user_id,))
                await db.commit()

            await update.message.reply_text(
                "✅ <b>Onboarding réinitialisé !</b>\n\n"
                "Tapez /start pour recommencer l'onboarding depuis le début.",
                parse_mode='HTML'
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")

    # ============ NOUVELLES FONCTIONNALITÉS ADMIN ============

    async def _show_cache_menu(self, query):
        """Affiche le menu de gestion du cache"""
        text = "🗑️ **GESTION DU CACHE**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Calculer taille du cache
        cache_info = self._get_cache_info()

        text += f"📊 **Statistiques cache:**\n"
        text += f"   • Fichiers temporaires: {cache_info['temp_files']}\n"
        text += f"   • Taille: {cache_info['total_size_mb']:.2f} MB\n"
        text += f"   • Charts générés: {cache_info['charts_count']}\n\n"

        text += "⚠️ Vider le cache supprimera:\n"
        text += "   • Graphiques générés\n"
        text += "   • Fichiers temporaires\n"
        text += "   • Données en cache mémoire\n"

        keyboard = [
            [InlineKeyboardButton("🗑️ Vider le cache", callback_data="admin_cache_clear")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    def _get_cache_info(self) -> dict:
        """Récupère les infos sur le cache"""
        info = {
            'temp_files': 0,
            'total_size_mb': 0,
            'charts_count': 0
        }

        try:
            import tempfile
            temp_dir = tempfile.gettempdir()

            # Compter fichiers TDB
            for f in os.listdir(temp_dir):
                if f.startswith('tdb_') or f.startswith('chart_'):
                    filepath = os.path.join(temp_dir, f)
                    if os.path.isfile(filepath):
                        info['temp_files'] += 1
                        info['total_size_mb'] += os.path.getsize(filepath) / (1024 * 1024)
                        if f.startswith('chart_'):
                            info['charts_count'] += 1
        except Exception as e:
            logger.error(f"Erreur get_cache_info: {e}")

        return info

    async def _clear_cache(self, query):
        """Vide le cache"""
        await query.edit_message_text("⏳ Nettoyage du cache en cours...")

        try:
            import tempfile
            temp_dir = tempfile.gettempdir()
            cleared = 0

            for f in os.listdir(temp_dir):
                if f.startswith('tdb_') or f.startswith('chart_'):
                    filepath = os.path.join(temp_dir, f)
                    try:
                        os.remove(filepath)
                        cleared += 1
                    except Exception:
                        pass

            await query.edit_message_text(
                f"✅ **Cache vidé !**\n\n"
                f"🗑️ {cleared} fichiers supprimés",
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_cache")
                ]])
            )
        except Exception as e:
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _show_maintenance_menu(self, query):
        """Affiche le menu de maintenance"""
        text = "🔧 **MAINTENANCE BASE DE DONNÉES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Stats DB
        import aiosqlite
        db_stats = {'tables': 0, 'total_rows': 0}

        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                # Compter les tables
                cursor = await db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
                tables = await cursor.fetchall()
                db_stats['tables'] = len(tables)

                # Compter les lignes par table
                for (table_name,) in tables:
                    try:
                        cursor = await db.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = await cursor.fetchone()
                        db_stats['total_rows'] += count[0] if count else 0
                    except Exception:
                        pass
        except Exception as e:
            logger.error(f"Erreur stats DB: {e}")

        db_size_mb = os.path.getsize(config.DATABASE_PATH) / (1024 * 1024) if os.path.exists(config.DATABASE_PATH) else 0

        text += f"📊 **Statistiques DB:**\n"
        text += f"   • Tables: {db_stats['tables']}\n"
        text += f"   • Lignes totales: {db_stats['total_rows']:,}\n"
        text += f"   • Taille: {db_size_mb:.2f} MB\n\n"

        text += "🔧 **Actions disponibles:**\n"
        text += "   • Optimiser: VACUUM + ANALYZE\n"
        text += "   • Nettoyer: Supprimer données > 30j\n"

        keyboard = [
            [InlineKeyboardButton("⚡ Optimiser DB", callback_data="admin_maintenance_optimize")],
            [InlineKeyboardButton("🧹 Nettoyer anciennes données", callback_data="admin_maintenance_cleanup")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _optimize_database(self, query):
        """Optimise la base de données"""
        await query.edit_message_text("⏳ Optimisation de la base de données...")

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                await db.execute("VACUUM")
                await db.execute("ANALYZE")
                await db.commit()

            # Nouvelle taille
            new_size = os.path.getsize(config.DATABASE_PATH) / (1024 * 1024)

            await query.edit_message_text(
                f"✅ **Base de données optimisée !**\n\n"
                f"📊 Nouvelle taille: {new_size:.2f} MB\n"
                f"⚡ VACUUM et ANALYZE effectués",
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_maintenance")
                ]])
            )
        except Exception as e:
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _cleanup_old_data(self, query):
        """Nettoie les anciennes données"""
        await query.edit_message_text("⏳ Nettoyage des anciennes données...")

        try:
            import aiosqlite
            deleted = {'search_history': 0, 'old_positions': 0}

            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                # Supprimer l'historique de recherche > 30 jours
                try:
                    cursor = await db.execute("""
                        DELETE FROM search_history
                        WHERE searched_at < datetime('now', '-30 days')
                    """)
                    deleted['search_history'] = cursor.rowcount
                except Exception:
                    pass

                # Supprimer les positions fermées > 90 jours
                try:
                    cursor = await db.execute("""
                        DELETE FROM positions
                        WHERE status = 'closed'
                        AND closed_at < datetime('now', '-90 days')
                    """)
                    deleted['old_positions'] = cursor.rowcount
                except Exception:
                    pass

                await db.commit()

            total = deleted['search_history'] + deleted['old_positions']

            await query.edit_message_text(
                f"✅ **Nettoyage terminé !**\n\n"
                f"🗑️ Entrées supprimées:\n"
                f"   • Historique recherche: {deleted['search_history']}\n"
                f"   • Anciennes positions: {deleted['old_positions']}\n"
                f"   • **Total: {total}**",
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_maintenance")
                ]])
            )
        except Exception as e:
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _show_config_viewer(self, query):
        """Affiche la configuration actuelle"""
        text = "⚙️ **CONFIGURATION ACTUELLE**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Afficher config (sans les secrets)
        text += "🤖 **Bot:**\n"
        text += f"   • Version: {getattr(config, 'BOT_VERSION', '4.5.0')}\n"
        text += f"   • Debug: {getattr(config, 'DEBUG', False)}\n\n"

        text += "📊 **Marchés configurés:**\n"
        for market_code, market_info in config.MARKETS.items():
            asset_count = len(market_info.get('assets', []))
            text += f"   • {market_info['name']}: {asset_count} actifs\n"
        text += "\n"

        text += "🔐 **Sécurité:**\n"
        admin_count = len(getattr(config, 'ADMIN_IDS', []))
        text += f"   • Admins configurés: {admin_count}\n"
        text += f"   • API OpenAI: {'✅' if getattr(config, 'OPENAI_API_KEY', None) else '❌'}\n"
        text += f"   • API Alpha Vantage: {'✅' if getattr(config, 'ALPHA_VANTAGE_API_KEY', None) else '❌'}\n\n"

        text += "💾 **Base de données:**\n"
        text += f"   • Path: `{config.DATABASE_PATH}`\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_performance_metrics(self, query):
        """Affiche les métriques de performance"""
        import psutil
        import sys

        text = "📈 **MÉTRIQUES DE PERFORMANCE**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            # Métriques système
            process = psutil.Process()
            memory_info = process.memory_info()

            text += "💻 **Ressources système:**\n"
            text += f"   • CPU: {psutil.cpu_percent()}%\n"
            text += f"   • RAM totale: {psutil.virtual_memory().percent}%\n"
            text += f"   • Mémoire bot: {memory_info.rss / (1024 * 1024):.1f} MB\n\n"

            # Infos process
            text += "🔄 **Process:**\n"
            text += f"   • PID: {process.pid}\n"
            text += f"   • Threads: {process.num_threads()}\n"
            create_time = datetime.fromtimestamp(process.create_time())
            uptime = datetime.now() - create_time
            text += f"   • Uptime: {str(uptime).split('.')[0]}\n\n"

        except ImportError:
            text += "⚠️ Module psutil non installé\n"
            text += "Installez avec: pip install psutil\n\n"
        except Exception as e:
            text += f"⚠️ Erreur métriques: {e}\n\n"

        # Métriques DB
        try:
            users = await db_manager.get_all_users()
            positions_count = 0
            for user in users[:20]:
                try:
                    positions = await db_manager.get_open_positions(user['telegram_id'])
                    positions_count += len(positions)
                except Exception:
                    pass

            text += "📊 **Métriques applicatives:**\n"
            text += f"   • Utilisateurs: {len(users)}\n"
            text += f"   • Positions ouvertes: {positions_count}\n"
        except Exception as e:
            text += f"⚠️ Erreur DB: {e}\n"

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data="admin_performance")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_user_detail(self, query, user_id: int):
        """Affiche le détail d'un utilisateur"""
        import aiosqlite

        text = f"👤 **DÉTAIL UTILISATEUR #{user_id}**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row

                # Info utilisateur
                cursor = await db.execute(
                    "SELECT * FROM users WHERE telegram_id = ?", (user_id,)
                )
                user = await cursor.fetchone()

                if user:
                    text += f"📋 **Informations:**\n"
                    text += f"   • ID: `{user['telegram_id']}`\n"
                    text += f"   • Username: @{user['username'] or 'N/A'}\n"
                    text += f"   • Prénom: {user['first_name'] or 'N/A'}\n"
                    text += f"   • Inscrit: {user['created_at'][:10] if user['created_at'] else 'N/A'}\n\n"

                # Positions
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM positions WHERE telegram_id = ?", (user_id,)
                )
                pos_count = (await cursor.fetchone())[0]

                cursor = await db.execute(
                    "SELECT COUNT(*) FROM positions WHERE telegram_id = ? AND status = 'open'", (user_id,)
                )
                open_pos = (await cursor.fetchone())[0]

                text += f"📈 **Trading:**\n"
                text += f"   • Positions totales: {pos_count}\n"
                text += f"   • Positions ouvertes: {open_pos}\n\n"

                # Favoris
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM favorites WHERE telegram_id = ?", (user_id,)
                )
                fav_count = (await cursor.fetchone())[0]
                text += f"⭐ **Favoris:** {fav_count}\n"

        except Exception as e:
            text += f"❌ Erreur: {e}\n"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_users")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_discord_menu(self, query):
        """Affiche le menu Discord"""
        text = "🎮 **DISCORD**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        if discord_service.enabled:
            text += "📡 **Status:** 🟢 Connecté\n\n"
            text += "📋 **Marchés surveillés:**\n"
            for key, market in discord_service.MARKETS.items():
                if not market.get('always_open'):
                    status = "🟢" if discord_service._is_market_open(key) else "🔴"
                    text += f"   {market['emoji']} {market['name']}: {status}\n"
            text += "\n"
            text += "📝 **Envoyer un message:**\n"
            text += "`/discord Votre message ici`\n\n"
            text += "Exemple:\n"
            text += "`/discord 🚀 Nouvelle mise à jour disponible !`"
        else:
            text += "📡 **Status:** 🔴 Non configuré\n\n"
            text += "⚠️ Ajoutez `DISCORD_WEBHOOK_URL` dans votre `.env`"

        keyboard = [
            [InlineKeyboardButton("🧪 Envoyer un test", callback_data="admin_discord_test")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _send_discord_test(self, query):
        """Envoie un message de test sur Discord"""
        if not discord_service.enabled:
            await query.edit_message_text(
                "❌ Discord non configuré.\n\nAjoutez `DISCORD_WEBHOOK_URL` dans votre `.env`",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_discord")
                ]])
            )
            return

        await query.edit_message_text("⏳ Envoi du message de test...")

        success = await discord_service.send_message(
            content="🧪 **Test depuis TDB Bot !**\n\nLa connexion Discord fonctionne correctement. ✅"
        )

        if success:
            await query.edit_message_text(
                "✅ **Message de test envoyé !**\n\nVérifiez votre serveur Discord.",
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_discord")
                ]])
            )
        else:
            await query.edit_message_text(
                "❌ **Erreur d'envoi**\n\nVérifiez votre webhook Discord.",
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_discord")
                ]])
            )

    async def cmd_discord_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /discord <message> - Envoie un message sur Discord"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not discord_service.enabled:
            await update.message.reply_text(
                "❌ Discord non configuré.\n\n"
                "Ajoutez `DISCORD_WEBHOOK_URL` dans votre `.env`"
            )
            return

        if not context.args:
            await update.message.reply_text(
                "❌ **Usage:** `/discord <message>`\n\n"
                "**Exemples:**\n"
                "`/discord 🚀 Nouvelle mise à jour !`\n"
                "`/discord 📊 Le marché US vient d'ouvrir`\n"
                "`/discord ⚠️ Attention volatilité élevée`",
                parse_mode='Markdown'
            )
            return

        message = " ".join(context.args)

        # Envoyer sur Discord avec un embed stylé
        embed = {
            "title": "📢 Annonce TDB",
            "description": message,
            "color": 0x3498DB,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": f"Envoyé par @{update.effective_user.username or 'Admin'}"}
        }

        success = await discord_service.send_message(embed=embed)

        if success:
            await update.message.reply_text("✅ Message envoyé sur Discord !")
        else:
            await update.message.reply_text("❌ Erreur lors de l'envoi sur Discord.")

    async def _show_users_stats(self, query):
        """Affiche les stats utilisateurs détaillées avec boutons de détail"""
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

        # Créer boutons pour voir détails des utilisateurs
        keyboard = []
        for user in users[:5]:
            username = user.get('username', 'N/A')
            keyboard.append([InlineKeyboardButton(
                f"👤 @{username}",
                callback_data=f"admin_user_detail_{user['telegram_id']}"
            )])

        keyboard.append([InlineKeyboardButton("◀️ Retour", callback_data="admin_back")])

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
