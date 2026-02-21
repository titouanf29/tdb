"""
Module Admin - Dashboard de monitoring et commandes administrateur
Version améliorée avec monitoring avancé, audit, et gestion utilisateurs
"""
import logging
import os
import json
import io
import csv
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
import config
from database.manager import db_manager
from utils.loading import show_loading, LoadingAnimation
from services.discord_service import discord_service
from utils.security import admin_manager, admin_required, admin_callback_required, rate_limit_admin
from utils.error_handler import ErrorHandler, ErrorSeverity
from utils.rate_limiter import rate_limiter

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
        self.app.add_handler(CommandHandler("addactif", self.cmd_addactif))
        self.app.add_handler(CommandHandler("resetwallet", self.cmd_reset_wallet))
        self.app.add_handler(CommandHandler("banuser", self.cmd_ban_user))
        self.app.add_handler(CommandHandler("unbanuser", self.cmd_unban_user))
        self.app.add_handler(CommandHandler("export", self.cmd_export_data))
        self.app.add_handler(CommandHandler("health", self.cmd_health_check))
        self.app.add_handler(CommandHandler("audit", self.cmd_audit_log))
        self.app.add_handler(CommandHandler("msguser", self.cmd_message_user))
        self.app.add_handler(CommandHandler("msgall", self.cmd_message_all))
        self.app.add_handler(CommandHandler("clearchannel", self.cmd_clear_channel))
        self.app.add_handler(CommandHandler("report", self.cmd_user_report))

        # Callbacks admin
        self.app.add_handler(CallbackQueryHandler(self.callback_admin, pattern="^admin_"))
        self.app.add_handler(CallbackQueryHandler(self.callback_addactif, pattern="^addactif_"))

    def is_admin(self, telegram_id: int) -> bool:
        """Vérifie si l'utilisateur est admin (utilise le module de sécurité)"""
        return admin_manager.is_admin(telegram_id)

    async def cmd_admin_dashboard(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Dashboard admin principal"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Accès réservé aux administrateurs.")
            return

        # Récupérer les stats
        stats = await self._get_system_stats()

        version = config.BOT_VERSION if hasattr(config, 'BOT_VERSION') else '4.5.0'

        text = f"🛠️ **DASHBOARD ADMIN** — v{version}\n"
        text += "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        # Section Utilisateurs (compacte)
        text += "👥 **UTILISATEURS**\n"
        text += f"┌ Total: **{stats['total_users']}** utilisateurs\n"
        text += f"├ Actifs 24h: **{stats['active_24h']}** • 7j: **{stats['active_7d']}**\n"
        text += f"└ Nouveaux (7j): **+{stats['new_7d']}**\n\n"

        # Section Trading
        pnl_icon = "📈" if stats['total_pnl'] >= 0 else "📉"
        text += "📊 **TRADING**\n"
        text += f"┌ Positions: **{stats['open_positions']}** ouvertes\n"
        text += f"├ Trades 24h: **{stats['trades_24h']}** • Volume: **${stats['total_volume']:,.0f}**\n"
        text += f"└ PnL total: {pnl_icon} **${stats['total_pnl']:+,.2f}** ({stats['win_rate']:.0f}% WR)\n\n"

        # Section Activité
        text += "⚡ **ACTIVITÉ**\n"
        text += f"┌ IA: **{stats['ai_messages_today']}** messages (today)\n"
        text += f"├ Scans: **{stats['scans_24h']}** (24h)\n"
        text += f"└ Favoris: **{stats['total_favorites']}** total\n\n"

        # Section Système
        text += "⚙️ **SYSTÈME**\n"
        text += f"┌ Uptime: **{stats['uptime']}**\n"
        text += f"├ RAM: **{stats['memory_mb']:.0f}MB** • CPU: **{stats['cpu_percent']:.0f}%**\n"
        text += f"└ DB: **{stats['db_size_mb']:.2f}MB**\n"

        # Alertes
        if stats['alerts']:
            text += "\n⚠️ **ALERTES**\n"
            for alert in stats['alerts'][:3]:
                text += f"• {alert}\n"

        keyboard = [
            [
                InlineKeyboardButton("👥 Utilisateurs", callback_data="admin_users"),
                InlineKeyboardButton("📊 Stats détaillées", callback_data="admin_stats")
            ],
            [
                InlineKeyboardButton("🔌 API Stats", callback_data="admin_api_stats"),
                InlineKeyboardButton("❤️ Santé", callback_data="admin_health")
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
                InlineKeyboardButton("📜 Audit", callback_data="admin_audit"),
                InlineKeyboardButton("⚠️ Erreurs", callback_data="admin_errors")
            ],
            [
                InlineKeyboardButton("📤 Export", callback_data="admin_export_menu"),
                InlineKeyboardButton("⚡ Actions", callback_data="admin_quick_actions")
            ],
            [
                InlineKeyboardButton("🎮 Discord", callback_data="admin_discord"),
                InlineKeyboardButton("🧹 Clear Canal", callback_data="admin_clear_channel")
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
        elif action == "api_stats":
            await self._show_api_stats(query)
        elif action == "audit":
            await self._show_audit_log(query)
        elif action == "health":
            await self._show_health_check(query)
        elif action == "export_menu":
            await self._show_export_menu(query)
        elif action == "export_users":
            await self._export_users_csv(query)
        elif action == "export_users_pdf":
            await self._export_users_pdf(query)
        elif action == "export_trades":
            await self._export_trades_csv(query)
        elif action == "export_trades_pdf":
            await self._export_trades_pdf(query)
        elif action == "quick_actions":
            await self._show_quick_actions(query)
        elif action == "errors":
            await self._show_recent_errors(query)
        elif action == "clear_channel":
            await self._show_clear_channel_menu(query)
        elif action == "clear_channel_confirm":
            await self._execute_clear_channel(query, context)
        elif action.startswith("ban_"):
            target_id = int(action.replace("ban_", ""))
            await self._confirm_ban_user(query, target_id)
        elif action.startswith("reset_wallet_"):
            target_id = int(action.replace("reset_wallet_", ""))
            await self._confirm_reset_wallet(query, target_id)
        elif action.startswith("msguser_"):
            target_id = int(action.replace("msguser_", ""))
            await self._show_msguser_prompt(query, target_id)

    async def _get_system_stats(self) -> dict:
        """Récupère les statistiques système complètes"""
        import aiosqlite
        import psutil

        stats = {
            'total_users': 0,
            'active_24h': 0,
            'active_7d': 0,
            'new_7d': 0,
            'open_positions': 0,
            'trades_24h': 0,
            'total_volume': 0,
            'uptime': 'N/A',
            'db_size_mb': 0,
            'alerts': [],
            'total_favorites': 0,
            'scans_24h': 0,
            'ai_messages_today': 0,
            'cpu_percent': 0,
            'memory_mb': 0,
            'total_pnl': 0,
            'win_rate': 0
        }

        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                # Total utilisateurs
                cursor = await db.execute("SELECT COUNT(*) FROM users")
                stats['total_users'] = (await cursor.fetchone())[0]

                # Actifs dans les 24 dernières heures (last_seen)
                cursor = await db.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE last_seen >= datetime('now', '-24 hours')
                """)
                stats['active_24h'] = (await cursor.fetchone())[0]

                # Actifs dans les 7 derniers jours
                cursor = await db.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE last_seen >= datetime('now', '-7 days')
                """)
                stats['active_7d'] = (await cursor.fetchone())[0]

                # Nouveaux inscrits dans les 7 derniers jours
                cursor = await db.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE created_at >= datetime('now', '-7 days')
                """)
                stats['new_7d'] = (await cursor.fetchone())[0]

                # Positions ouvertes
                try:
                    cursor = await db.execute(
                        "SELECT COUNT(*) FROM positions WHERE status = 'open'"
                    )
                    stats['open_positions'] = (await cursor.fetchone())[0]
                except Exception as e:
                    ErrorHandler.log_error(e, "stats:open_positions", ErrorSeverity.LOW)
                    stats['open_positions'] = await db_manager.count_all_open_positions()

                # Trades des 24h
                cursor = await db.execute("""
                    SELECT COUNT(*) FROM positions
                    WHERE opened_at >= datetime('now', '-24 hours')
                """)
                stats['trades_24h'] = (await cursor.fetchone())[0]

                # Volume total (somme des montants investis)
                cursor = await db.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM positions"
                )
                stats['total_volume'] = (await cursor.fetchone())[0]

                # Total favoris
                try:
                    cursor = await db.execute("SELECT COUNT(*) FROM favorites")
                    stats['total_favorites'] = (await cursor.fetchone())[0]
                except Exception as e:
                    ErrorHandler.log_error(e, "stats:favorites", ErrorSeverity.LOW)

                # Scans des 24h
                try:
                    cursor = await db.execute("""
                        SELECT COUNT(*) FROM scan_results
                        WHERE scan_date >= datetime('now', '-24 hours')
                    """)
                    stats['scans_24h'] = (await cursor.fetchone())[0]
                except Exception as e:
                    ErrorHandler.log_error(e, "stats:scans_24h", ErrorSeverity.LOW)

                # Messages IA aujourd'hui
                try:
                    cursor = await db.execute("""
                        SELECT COALESCE(SUM(message_count), 0) FROM ai_usage_stats
                        WHERE date = date('now')
                    """)
                    stats['ai_messages_today'] = (await cursor.fetchone())[0]
                except Exception as e:
                    ErrorHandler.log_error(e, "stats:ai_messages", ErrorSeverity.LOW)

                # PnL total et win rate
                try:
                    cursor = await db.execute("""
                        SELECT
                            COALESCE(SUM(pnl), 0) as total_pnl,
                            COUNT(*) as closed_count,
                            SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
                        FROM positions WHERE status = 'closed'
                    """)
                    row = await cursor.fetchone()
                    stats['total_pnl'] = row[0] if row else 0
                    closed = row[1] if row else 0
                    wins = row[2] if row else 0
                    stats['win_rate'] = (wins / closed * 100) if closed > 0 else 0
                except Exception as e:
                    ErrorHandler.log_error(e, "stats:pnl_winrate", ErrorSeverity.LOW)

            # Taille DB
            if os.path.exists(config.DATABASE_PATH):
                stats['db_size_mb'] = os.path.getsize(config.DATABASE_PATH) / (1024 * 1024)

            # Métriques système
            try:
                process = psutil.Process()
                stats['memory_mb'] = process.memory_info().rss / (1024 * 1024)
                stats['cpu_percent'] = psutil.cpu_percent()

                # Uptime
                create_time = datetime.fromtimestamp(process.create_time())
                uptime = datetime.now() - create_time
                days = uptime.days
                hours = uptime.seconds // 3600
                mins = (uptime.seconds % 3600) // 60
                if days > 0:
                    stats['uptime'] = f"{days}j {hours}h {mins}m"
                elif hours > 0:
                    stats['uptime'] = f"{hours}h {mins}m"
                else:
                    stats['uptime'] = f"{mins}m"
            except Exception as e:
                ErrorHandler.log_error(e, "stats:system_metrics", ErrorSeverity.LOW)

            # Alertes système
            if stats['db_size_mb'] > 100:
                stats['alerts'].append("DB > 100MB - Considérer archivage")
            if stats['total_users'] == 0:
                stats['alerts'].append("Aucun utilisateur enregistré")
            if stats['memory_mb'] > 500:
                stats['alerts'].append(f"RAM élevée: {stats['memory_mb']:.0f}MB")
            if stats['active_24h'] == 0 and stats['total_users'] > 0:
                stats['alerts'].append("Aucun utilisateur actif (24h)")

        except Exception as e:
            logger.error(f"Erreur récupération stats: {e}")
            stats['alerts'].append(f"Erreur stats: {str(e)[:50]}")

        return stats

    async def _show_detailed_stats(self, query):
        """Affiche les stats détaillées"""
        import aiosqlite

        text = "📊 **STATISTIQUES DÉTAILLÉES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row

                # Trading 24h
                cursor = await db.execute("""
                    SELECT COUNT(*) as cnt,
                           COALESCE(SUM(amount), 0) as volume,
                           COALESCE(AVG(pnl), 0) as avg_pnl
                    FROM positions
                    WHERE opened_at >= datetime('now', '-24 hours')
                """)
                t24 = await cursor.fetchone()

                cursor = await db.execute("""
                    SELECT COUNT(*) as wins FROM positions
                    WHERE status = 'closed' AND pnl > 0
                    AND closed_at >= datetime('now', '-24 hours')
                """)
                wins_24h = (await cursor.fetchone())['wins']

                cursor = await db.execute("""
                    SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM positions
                    WHERE status = 'closed'
                    AND closed_at >= datetime('now', '-24 hours')
                """)
                pnl_24h = (await cursor.fetchone())['total_pnl']

                text += "📈 **Trading (24h):**\n"
                text += f"   • Trades ouverts: {t24['cnt']}\n"
                text += f"   • Volume: ${t24['volume']:,.0f}\n"
                text += f"   • PnL clôturé: ${pnl_24h:+,.2f}\n"
                text += f"   • Trades gagnants: {wins_24h}\n\n"

                # Trading global
                cursor = await db.execute("""
                    SELECT COUNT(*) as total,
                           SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open_cnt,
                           SUM(CASE WHEN status='closed' AND pnl>0 THEN 1 ELSE 0 END) as wins,
                           SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed_cnt,
                           COALESCE(SUM(CASE WHEN status='closed' THEN pnl ELSE 0 END), 0) as total_pnl
                    FROM positions
                """)
                tg = await cursor.fetchone()
                global_wr = (tg['wins'] / tg['closed_cnt'] * 100) if (tg['closed_cnt'] or 0) > 0 else 0

                text += "📊 **Trading (global):**\n"
                text += f"   • Trades totaux: {tg['total']}\n"
                text += f"   • Positions ouvertes: {tg['open_cnt']}\n"
                text += f"   • Win rate global: {global_wr:.0f}%\n"
                text += f"   • PnL total généré: ${tg['total_pnl']:+,.2f}\n\n"

                # Assistant IA (aujourd'hui)
                cursor = await db.execute("""
                    SELECT COALESCE(SUM(message_count), 0) as msgs,
                           COALESCE(SUM(tokens_used), 0) as tokens,
                           COUNT(DISTINCT telegram_id) as users
                    FROM ai_usage_stats
                    WHERE date = date('now')
                """)
                ai = await cursor.fetchone()

                cursor = await db.execute("""
                    SELECT COALESCE(SUM(message_count), 0) as msgs_total,
                           COALESCE(SUM(tokens_used), 0) as tokens_total
                    FROM ai_usage_stats
                """)
                ai_total = await cursor.fetchone()

                text += "🤖 **Assistant IA (aujourd'hui):**\n"
                text += f"   • Messages: {ai['msgs']}\n"
                text += f"   • Tokens: {ai['tokens']:,}\n"
                text += f"   • Utilisateurs actifs: {ai['users']}\n"
                text += f"   • Tokens total (all-time): {ai_total['tokens_total']:,}\n\n"

                # Scanner
                cursor = await db.execute("""
                    SELECT COUNT(*) as scans,
                           COUNT(DISTINCT telegram_id) as users
                    FROM scan_results
                    WHERE scan_date >= datetime('now', '-24 hours')
                """)
                scan = await cursor.fetchone()

                cursor = await db.execute("""
                    SELECT COUNT(*) FROM scan_results WHERE alert_sent = 1
                    AND scan_date >= datetime('now', '-24 hours')
                """)
                alerts_sent = (await cursor.fetchone())[0]

                text += "🔍 **Scanner (24h):**\n"
                text += f"   • Scans effectués: {scan['scans']}\n"
                text += f"   • Utilisateurs scannés: {scan['users']}\n"
                text += f"   • Alertes envoyées: {alerts_sent}\n\n"

                # Notifications
                cursor = await db.execute("""
                    SELECT COUNT(*) FROM notifications
                    WHERE sent_at >= datetime('now', '-24 hours')
                """)
                notifs = (await cursor.fetchone())[0]
                text += f"🔔 **Notifications (24h):** {notifs}\n"

        except Exception as e:
            logger.error(f"Erreur _show_detailed_stats: {e}")
            text += f"❌ Erreur lors de la récupération: {e}\n"

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
        """Rafraîchit le dashboard avec le menu complet"""
        stats = await self._get_system_stats()

        version = config.BOT_VERSION if hasattr(config, 'BOT_VERSION') else '4.5.0'

        text = f"🛠️ **DASHBOARD ADMIN** — v{version}\n"
        text += "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        # Section Utilisateurs (compacte)
        text += "👥 **UTILISATEURS**\n"
        text += f"┌ Total: **{stats['total_users']}** utilisateurs\n"
        text += f"├ Actifs 24h: **{stats['active_24h']}** • 7j: **{stats['active_7d']}**\n"
        text += f"└ Nouveaux (7j): **+{stats['new_7d']}**\n\n"

        # Section Trading
        pnl_icon = "📈" if stats['total_pnl'] >= 0 else "📉"
        text += "📊 **TRADING**\n"
        text += f"┌ Positions: **{stats['open_positions']}** ouvertes\n"
        text += f"├ Trades 24h: **{stats['trades_24h']}** • Volume: **${stats['total_volume']:,.0f}**\n"
        text += f"└ PnL total: {pnl_icon} **${stats['total_pnl']:+,.2f}** ({stats['win_rate']:.0f}% WR)\n\n"

        # Section Activité
        text += "⚡ **ACTIVITÉ**\n"
        text += f"┌ IA: **{stats['ai_messages_today']}** messages (today)\n"
        text += f"├ Scans: **{stats['scans_24h']}** (24h)\n"
        text += f"└ Favoris: **{stats['total_favorites']}** total\n\n"

        # Section Système
        text += "⚙️ **SYSTÈME**\n"
        text += f"┌ Uptime: **{stats['uptime']}**\n"
        text += f"├ RAM: **{stats['memory_mb']:.0f}MB** • CPU: **{stats['cpu_percent']:.0f}%**\n"
        text += f"└ DB: **{stats['db_size_mb']:.2f}MB**\n"

        # Alertes
        if stats['alerts']:
            text += "\n⚠️ **ALERTES**\n"
            for alert in stats['alerts'][:3]:
                text += f"• {alert}\n"

        text += f"\n🔄 _Mis à jour: {datetime.now().strftime('%H:%M:%S')}_"

        # Menu complet identique au dashboard principal
        keyboard = [
            [
                InlineKeyboardButton("👥 Utilisateurs", callback_data="admin_users"),
                InlineKeyboardButton("📊 Stats détaillées", callback_data="admin_stats")
            ],
            [
                InlineKeyboardButton("🔌 API Stats", callback_data="admin_api_stats"),
                InlineKeyboardButton("❤️ Santé", callback_data="admin_health")
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
                InlineKeyboardButton("📜 Audit", callback_data="admin_audit"),
                InlineKeyboardButton("⚠️ Erreurs", callback_data="admin_errors")
            ],
            [
                InlineKeyboardButton("📤 Export", callback_data="admin_export_menu"),
                InlineKeyboardButton("⚡ Actions", callback_data="admin_quick_actions")
            ],
            [
                InlineKeyboardButton("🎮 Discord", callback_data="admin_discord")
            ],
            [
                InlineKeyboardButton("🔄 Rafraîchir", callback_data="admin_refresh")
            ]
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

        # Récupérer le message complet avec les sauts de ligne
        full_text = update.message.text
        if full_text.startswith("/broadcast"):
            message = full_text[10:].strip()  # Enlever "/broadcast" du début
        else:
            message = " ".join(context.args) if context.args else ""

        if not message:
            await update.message.reply_text(
                "❌ Usage: /broadcast <message>\n\n"
                "Exemple: /broadcast Bonjour à tous !"
            )
            return

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

    async def _show_user_detail(self, query, target_user_id: int):
        """Affiche le détail complet d'un utilisateur"""
        import aiosqlite

        text = f"👤 **PROFIL UTILISATEUR**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row

                # Infos de base
                cursor = await db.execute(
                    "SELECT * FROM users WHERE telegram_id = ?", (target_user_id,)
                )
                user = await cursor.fetchone()

                if not user:
                    text += "❌ Utilisateur introuvable."
                else:
                    # Calcul last_seen lisible
                    last_seen_str = "Jamais"
                    if user['last_seen']:
                        try:
                            ls = datetime.fromisoformat(user['last_seen'].replace('Z', ''))
                            diff = datetime.now() - ls
                            if diff.total_seconds() < 60:
                                last_seen_str = "À l'instant"
                            elif diff.total_seconds() < 3600:
                                last_seen_str = f"Il y a {int(diff.total_seconds()//60)} min"
                            elif diff.total_seconds() < 86400:
                                last_seen_str = f"Il y a {int(diff.total_seconds()//3600)}h"
                            else:
                                last_seen_str = f"Il y a {diff.days} jour(s)"
                        except Exception:
                            last_seen_str = user['last_seen'][:16]

                    text += f"📋 **Informations:**\n"
                    text += f"   • ID: `{user['telegram_id']}`\n"
                    text += f"   • Username: @{user['username'] or 'N/A'}\n"
                    text += f"   • Prénom: {user['first_name'] or 'N/A'}\n"
                    text += f"   • Inscrit le: {user['created_at'][:10] if user['created_at'] else 'N/A'}\n"
                    text += f"   • Dernière activité: {last_seen_str}\n\n"

                    # Abonnement
                    cursor = await db.execute(
                        "SELECT * FROM user_subscriptions WHERE telegram_id = ?", (target_user_id,)
                    )
                    sub = await cursor.fetchone()
                    if sub:
                        tier_icons = {'free': '🆓', 'premium': '⭐', 'vip': '💎'}
                        tier = sub['tier'] or 'free'
                        text += f"💎 **Abonnement:** {tier_icons.get(tier, '🆓')} {tier.upper()}\n"
                        if sub['premium_until']:
                            text += f"   • Expire: {sub['premium_until'][:10]}\n"
                        text += f"   • Analyses today: {sub['analyses_used_today']}\n\n"
                    else:
                        text += "💎 **Abonnement:** 🆓 FREE\n\n"

                    # Wallet
                    cursor = await db.execute(
                        "SELECT * FROM wallet WHERE telegram_id = ?", (target_user_id,)
                    )
                    wallet = await cursor.fetchone()
                    if wallet:
                        pnl_icon = "📈" if wallet['total_pnl'] >= 0 else "📉"
                        text += f"💰 **Wallet:**\n"
                        text += f"   • Solde: ${wallet['balance']:,.2f}\n"
                        text += f"   • PnL total: {pnl_icon} ${wallet['total_pnl']:+,.2f}\n"
                        text += f"   • PnL jour: ${wallet['daily_pnl']:+,.2f}\n\n"

                    # Trading
                    cursor = await db.execute(
                        "SELECT COUNT(*) FROM positions WHERE telegram_id = ?", (target_user_id,)
                    )
                    pos_count = (await cursor.fetchone())[0]

                    cursor = await db.execute(
                        "SELECT COUNT(*) FROM positions WHERE telegram_id = ? AND status = 'open'", (target_user_id,)
                    )
                    open_pos = (await cursor.fetchone())[0]

                    cursor = await db.execute("""
                        SELECT COUNT(*) FROM positions
                        WHERE telegram_id = ? AND status = 'closed'
                        AND pnl > 0
                    """, (target_user_id,))
                    wins = (await cursor.fetchone())[0]

                    closed_total = pos_count - open_pos
                    winrate = (wins / closed_total * 100) if closed_total > 0 else 0

                    text += f"📈 **Trading:**\n"
                    text += f"   • Trades totaux: {pos_count}\n"
                    text += f"   • Positions ouvertes: {open_pos}\n"
                    text += f"   • Win rate: {winrate:.0f}%\n\n"

                    # Usage IA
                    cursor = await db.execute("""
                        SELECT COALESCE(SUM(message_count), 0) as total_msgs,
                               COALESCE(SUM(tokens_used), 0) as total_tokens
                        FROM ai_usage_stats WHERE telegram_id = ?
                    """, (target_user_id,))
                    ai_row = await cursor.fetchone()
                    if ai_row and ai_row['total_msgs'] > 0:
                        text += f"🤖 **Assistant IA:**\n"
                        text += f"   • Messages totaux: {ai_row['total_msgs']}\n"
                        text += f"   • Tokens utilisés: {ai_row['total_tokens']:,}\n\n"

                    # Favoris & scan
                    cursor = await db.execute(
                        "SELECT COUNT(*) FROM favorites WHERE telegram_id = ?", (target_user_id,)
                    )
                    fav_count = (await cursor.fetchone())[0]

                    cursor = await db.execute(
                        "SELECT scan_enabled FROM user_settings WHERE telegram_id = ?", (target_user_id,)
                    )
                    settings_row = await cursor.fetchone()
                    scan_status = "🟢 Actif" if (settings_row and settings_row['scan_enabled']) else "🔴 Inactif"

                    text += f"⭐ **Favoris:** {fav_count}   |   🔍 **Scan auto:** {scan_status}\n"

        except Exception as e:
            logger.error(f"Erreur _show_user_detail: {e}")
            text += f"❌ Erreur: {e}\n"

        keyboard = [
            [InlineKeyboardButton(
                "📩 Envoyer un MP",
                callback_data=f"admin_msguser_{target_user_id}"
            )],
            [
                InlineKeyboardButton("🔄 Reset Wallet", callback_data=f"admin_reset_wallet_{target_user_id}"),
                InlineKeyboardButton("🚫 Bannir", callback_data=f"admin_ban_{target_user_id}")
            ],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_users")]
        ]

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

        # Récupérer le message complet avec les sauts de ligne
        full_text = update.message.text
        if full_text.startswith("/discord"):
            message = full_text[8:].strip()  # Enlever "/discord" du début
        else:
            message = " ".join(context.args) if context.args else ""

        if not message:
            await update.message.reply_text(
                "❌ **Usage:** `/discord <message>`\n\n"
                "**Exemples:**\n"
                "`/discord 🚀 Nouvelle mise à jour !`\n"
                "`/discord 📊 Le marché US vient d'ouvrir`\n"
                "`/discord ⚠️ Attention volatilité élevée`",
                parse_mode='Markdown'
            )
            return

        # Envoyer sur Discord avec un embed stylé (garde les sauts de ligne)
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
        import aiosqlite

        text = "👥 **STATISTIQUES UTILISATEURS**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row

                # Compteurs globaux
                cursor = await db.execute("SELECT COUNT(*) FROM users")
                total = (await cursor.fetchone())[0]

                cursor = await db.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE last_seen >= datetime('now', '-24 hours')
                """)
                active_24h = (await cursor.fetchone())[0]

                cursor = await db.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE last_seen >= datetime('now', '-7 days')
                """)
                active_7d = (await cursor.fetchone())[0]

                cursor = await db.execute("""
                    SELECT COUNT(*) FROM users
                    WHERE created_at >= datetime('now', '-7 days')
                """)
                new_7d = (await cursor.fetchone())[0]

                # Tier breakdown
                cursor = await db.execute("""
                    SELECT tier, COUNT(*) as cnt FROM user_subscriptions GROUP BY tier
                """)
                tiers = {row['tier']: row['cnt'] for row in await cursor.fetchall()}

                text += f"📊 **Vue d'ensemble:**\n"
                text += f"   • Total: **{total}**\n"
                text += f"   • Actifs 24h: **{active_24h}**\n"
                text += f"   • Actifs 7j: **{active_7d}**\n"
                text += f"   • Nouveaux 7j: **{new_7d}**\n\n"

                if tiers:
                    text += "💎 **Abonnements:**\n"
                    text += f"   • Free: {tiers.get('free', 0)}\n"
                    text += f"   • Premium: {tiers.get('premium', 0)}\n"
                    text += f"   • VIP: {tiers.get('vip', 0)}\n\n"

                # Derniers utilisateurs avec infos enrichies
                cursor = await db.execute("""
                    SELECT u.telegram_id, u.username, u.first_name,
                           u.created_at, u.last_seen,
                           COALESCE(w.balance, 10000) as balance,
                           COALESCE(w.total_pnl, 0) as total_pnl,
                           COALESCE(s.tier, 'free') as tier,
                           (SELECT COUNT(*) FROM positions p WHERE p.telegram_id = u.telegram_id) as trades
                    FROM users u
                    LEFT JOIN wallet w ON w.telegram_id = u.telegram_id
                    LEFT JOIN user_subscriptions s ON s.telegram_id = u.telegram_id
                    ORDER BY u.last_seen DESC
                    LIMIT 8
                """)
                users = await cursor.fetchall()

                text += "📋 **Derniers actifs:**\n"
                for user in users:
                    uname = f"@{user['username']}" if user['username'] else user['first_name'] or f"ID:{user['telegram_id']}"
                    last_seen = user['last_seen']
                    if last_seen:
                        try:
                            ls = datetime.fromisoformat(last_seen.replace('Z', ''))
                            diff = datetime.now() - ls
                            if diff.total_seconds() < 3600:
                                seen_str = f"{int(diff.total_seconds()//60)}min"
                            elif diff.total_seconds() < 86400:
                                seen_str = f"{int(diff.total_seconds()//3600)}h"
                            else:
                                seen_str = f"{diff.days}j"
                        except Exception:
                            seen_str = "?"
                    else:
                        seen_str = "?"

                    tier_icon = "💎" if user['tier'] == 'vip' else ("⭐" if user['tier'] == 'premium' else "🆓")
                    pnl_icon = "📈" if user['total_pnl'] >= 0 else "📉"
                    text += f"   {tier_icon} {uname} — {user['trades']} trades — {pnl_icon}${user['total_pnl']:+.0f} — vu il y a {seen_str}\n"

        except Exception as e:
            logger.error(f"Erreur _show_users_stats: {e}")
            text += f"❌ Erreur: {e}\n"
            users = await db_manager.get_all_users()

        # Boutons de détail pour les 5 premiers utilisateurs
        keyboard = []
        try:
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("""
                    SELECT telegram_id, username, first_name FROM users
                    ORDER BY last_seen DESC LIMIT 5
                """)
                top_users = await cursor.fetchall()
            for u in top_users:
                label = f"👤 @{u['username']}" if u['username'] else f"👤 {u['first_name'] or u['telegram_id']}"
                keyboard.append([InlineKeyboardButton(
                    label,
                    callback_data=f"admin_user_detail_{u['telegram_id']}"
                )])
        except Exception:
            pass

        keyboard.append([InlineKeyboardButton("◀️ Retour", callback_data="admin_back")])

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    # =========================================================================
    # GESTION DES ACTIFS - /addactif
    # =========================================================================

    async def cmd_addactif(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Recherche et ajoute un actif dans asset_names.py via Yahoo Finance"""
        user_id = update.effective_user.id
        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Accès réservé aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "📋 <b>AJOUTER UN ACTIF</b>\n\n"
                "Usage: <code>/addactif &lt;nom ou symbole&gt;</code>\n\n"
                "Exemples:\n"
                "• <code>/addactif Air Liquide</code>\n"
                "• <code>/addactif AI.PA</code>\n"
                "• <code>/addactif Rheinmetall</code>\n"
                "• <code>/addactif DOGE</code>",
                parse_mode='HTML'
            )
            return

        query_text = ' '.join(context.args)
        msg = await update.message.reply_text(f"🔍 Recherche de <b>{query_text}</b>...", parse_mode='HTML')

        try:
            import requests
            url = "https://query2.finance.yahoo.com/v1/finance/search"
            params = {
                "q": query_text,
                "quotesCount": 6,
                "newsCount": 0,
                "enableFuzzyQuery": True,
            }
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            data = resp.json()

            quotes = data.get("quotes", [])
            # Filtrer les types non pertinents
            quotes = [q for q in quotes if q.get("quoteType") in ("EQUITY", "ETF", "CRYPTOCURRENCY", "FUTURE", "INDEX", "MUTUALFUND", "CURRENCY")]

            if not quotes:
                await msg.edit_text(
                    f"❌ Aucun résultat pour <b>{query_text}</b>.\n\n"
                    "Essayez avec le symbole exact (ex: <code>AI.PA</code> pour Air Liquide).",
                    parse_mode='HTML'
                )
                return

            from utils.asset_names import ASSET_NAMES

            text = f"🔍 <b>RÉSULTATS POUR \"{query_text}\"</b>\n━━━━━━━━━━━━━━━━━━━━\n\n"
            text += "Sélectionnez l'actif à ajouter :\n\n"

            keyboard = []
            for quote in quotes[:5]:
                symbol = quote.get("symbol", "")
                name = quote.get("longname") or quote.get("shortname") or symbol
                exchange = quote.get("exchDisp", "")
                quote_type = quote.get("typeDisp", "")

                already = "✅ déjà ajouté" if symbol in ASSET_NAMES else ""
                text += f"• <code>{symbol}</code> — {name} ({exchange}) {already}\n"

                label = f"{'✅' if symbol in ASSET_NAMES else '➕'} {symbol} — {name[:30]}"
                # Telegram callback_data max 64 bytes
                callback = f"addactif_{symbol[:50]}"
                keyboard.append([InlineKeyboardButton(label, callback_data=callback)])

            keyboard.append([InlineKeyboardButton("❌ Annuler", callback_data="addactif_cancel")])

            await msg.edit_text(
                text,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode='HTML'
            )

        except Exception as e:
            logger.error(f"Erreur /addactif: {e}")
            await msg.edit_text(f"❌ Erreur lors de la recherche: {e}")

    async def callback_addactif(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère la confirmation d'ajout d'actif"""
        query = update.callback_query
        await query.answer()

        user_id = update.effective_user.id
        if not self.is_admin(user_id):
            return

        data = query.data

        if data == "addactif_cancel":
            await query.edit_message_text("❌ Ajout annulé.")
            return

        symbol = data.replace("addactif_", "")

        # Vérifier si déjà présent (base fixe ou custom)
        from utils.asset_names import get_all_assets
        all_assets = get_all_assets()
        if symbol in all_assets:
            await query.edit_message_text(
                f"⚠️ <b>{symbol}</b> est déjà dans la base !\n"
                f"Nom actuel : <b>{all_assets[symbol]}</b>",
                parse_mode='HTML'
            )
            return

        await query.edit_message_text(f"⏳ Récupération des infos pour <code>{symbol}</code>...", parse_mode='HTML')

        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            info = ticker.info
            name = info.get("longName") or info.get("shortName") or symbol
            # Nettoyer le nom (supprimer suffixes inutiles)
            name = name.replace(" Inc.", " Inc.").strip()

        except Exception:
            name = symbol

        # Sauvegarder en DB (persistant)
        success = await self._add_to_asset_names(symbol, name, user_id)

        if success:
            await query.edit_message_text(
                f"✅ <b>ACTIF AJOUTÉ !</b>\n━━━━━━━━━━━━━━━━━━━━\n\n"
                f"📌 Symbole : <code>{symbol}</code>\n"
                f"📝 Nom : <b>{name}</b>\n\n"
                f"<i>Sauvegardé en base de données — persistant après redémarrage.</i>",
                parse_mode='HTML'
            )
            logger.info(f"✅ Admin {user_id} a ajouté l'actif {symbol} ({name})")
        else:
            await query.edit_message_text(
                f"❌ Erreur lors de la sauvegarde en base.\nVérifiez les logs."
            )

    async def _add_to_asset_names(self, symbol: str, name: str, added_by: int) -> bool:
        """Sauvegarde un actif en DB et met à jour le dict en mémoire immédiatement"""
        try:
            from database.manager import db_manager
            import utils.asset_names as asset_module

            # Sauvegarder en base de données (persistant, survit aux git pull)
            await db_manager.add_custom_asset(symbol, name, added_by)

            # Mettre à jour le dict en mémoire (effet immédiat sans redémarrage)
            asset_module.CUSTOM_ASSETS[symbol] = name

            logger.info(f"Actif {symbol} ({name}) ajouté en DB par admin {added_by}")
            return True

        except Exception as e:
            logger.error(f"Erreur _add_to_asset_names({symbol}): {e}")
            return False

    # =========================================================================
    # NOUVELLES FONCTIONNALITÉS ADMIN v2
    # =========================================================================

    async def _show_api_stats(self, query):
        """Affiche les statistiques du rate limiter API"""
        text = "🔌 **STATISTIQUES API**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        services = ["yfinance", "groq", "news"]

        for service in services:
            stats = rate_limiter.get_stats(service)
            if stats['requests'] > 0:
                success_rate = (stats['success'] / stats['requests']) * 100
                health = "🟢" if success_rate > 80 else ("🟡" if success_rate > 50 else "🔴")

                text += f"{health} **{service.upper()}**\n"
                text += f"   • Requêtes: {stats['requests']}\n"
                text += f"   • Succès: {stats['success']} ({success_rate:.0f}%)\n"
                text += f"   • Erreurs: {stats['errors']}\n"
                text += f"   • Timeouts: {stats['timeouts']}\n"
                if 'available_tokens' in stats:
                    text += f"   • Tokens dispo: {stats['available_tokens']:.1f}\n"
                text += "\n"
            else:
                text += f"⚪ **{service.upper()}** — Aucune requête\n\n"

        text += "_Les stats sont réinitialisées au redémarrage_"

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data="admin_api_stats")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_audit_log(self, query):
        """Affiche le journal d'audit admin"""
        text = "📜 **JOURNAL D'AUDIT**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        audit_log = admin_manager.get_audit_log(20)

        if not audit_log:
            text += "_Aucune action admin enregistrée_\n"
        else:
            for entry in reversed(audit_log[-15:]):
                timestamp = entry['timestamp'][:16].replace('T', ' ')
                action = entry['action']
                admin_id = entry['admin_id']
                details = entry.get('details', {})

                # Format court
                if action == "command":
                    cmd = details.get('command', '?')
                    text += f"`{timestamp}` 👤{admin_id} → {cmd}\n"
                else:
                    text += f"`{timestamp}` 👤{admin_id} → {action}\n"

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data="admin_audit")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text[:4000],
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_health_check(self, query):
        """Affiche l'état de santé de tous les services"""
        text = "❤️ **SANTÉ DES SERVICES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        checks = []

        # Base de données
        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                await db.execute("SELECT 1")
            checks.append(("Base de données", True, "Connectée"))
        except Exception as e:
            checks.append(("Base de données", False, str(e)[:30]))

        # Groq API
        groq_healthy = rate_limiter.is_healthy("groq")
        groq_stats = rate_limiter.get_stats("groq")
        if groq_stats['requests'] == 0:
            checks.append(("Groq API", True, "Pas de requêtes"))
        else:
            checks.append(("Groq API", groq_healthy, f"{groq_stats['success']}/{groq_stats['requests']} OK"))

        # yfinance
        yf_healthy = rate_limiter.is_healthy("yfinance")
        yf_stats = rate_limiter.get_stats("yfinance")
        if yf_stats['requests'] == 0:
            checks.append(("yfinance", True, "Pas de requêtes"))
        else:
            checks.append(("yfinance", yf_healthy, f"{yf_stats['success']}/{yf_stats['requests']} OK"))

        # Discord
        if discord_service.enabled:
            checks.append(("Discord", True, "Configuré"))
        else:
            checks.append(("Discord", None, "Non configuré"))

        # Espace disque
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            free_gb = free // (1024**3)
            if free_gb < 1:
                checks.append(("Disque", False, f"{free_gb}GB libre"))
            else:
                checks.append(("Disque", True, f"{free_gb}GB libre"))
        except Exception:
            checks.append(("Disque", None, "Non vérifié"))

        # Mémoire
        try:
            import psutil
            mem = psutil.virtual_memory()
            if mem.percent > 90:
                checks.append(("Mémoire", False, f"{mem.percent}% utilisée"))
            else:
                checks.append(("Mémoire", True, f"{mem.percent}% utilisée"))
        except Exception:
            checks.append(("Mémoire", None, "Non vérifié"))

        # Affichage
        for name, status, detail in checks:
            if status is True:
                icon = "🟢"
            elif status is False:
                icon = "🔴"
            else:
                icon = "⚪"
            text += f"{icon} **{name}**: {detail}\n"

        # Score global
        ok_count = sum(1 for _, s, _ in checks if s is True)
        total_checks = sum(1 for _, s, _ in checks if s is not None)
        score = (ok_count / total_checks * 100) if total_checks > 0 else 0

        text += f"\n📊 **Score global:** {score:.0f}%"

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data="admin_health")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_export_menu(self, query):
        """Menu d'export de données"""
        text = "📤 **EXPORT DE DONNÉES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += "📕 **PDF** — Rapport formaté\n"
        text += "📄 **CSV** — Données brutes\n\n"
        text += "👥 **Utilisateurs** — Liste complète\n"
        text += "📈 **Trades** — Historique des positions\n"

        keyboard = [
            [
                InlineKeyboardButton("👥 Users PDF", callback_data="admin_export_users_pdf"),
                InlineKeyboardButton("👥 Users CSV", callback_data="admin_export_users")
            ],
            [
                InlineKeyboardButton("📈 Trades PDF", callback_data="admin_export_trades_pdf"),
                InlineKeyboardButton("📈 Trades CSV", callback_data="admin_export_trades")
            ],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _export_users_csv(self, query):
        """Exporte les utilisateurs en CSV"""
        await query.edit_message_text("⏳ Génération du fichier CSV...")

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("""
                    SELECT u.telegram_id, u.username, u.first_name, u.created_at, u.last_seen,
                           COALESCE(w.balance, 10000) as balance,
                           COALESCE(w.total_pnl, 0) as total_pnl,
                           COALESCE(s.tier, 'free') as tier
                    FROM users u
                    LEFT JOIN wallet w ON w.telegram_id = u.telegram_id
                    LEFT JOIN user_subscriptions s ON s.telegram_id = u.telegram_id
                    ORDER BY u.created_at DESC
                """)
                users = await cursor.fetchall()

            # Créer CSV en mémoire
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['ID', 'Username', 'Prénom', 'Inscrit', 'Dernière activité', 'Solde', 'PnL', 'Tier'])

            for u in users:
                writer.writerow([
                    u['telegram_id'],
                    u['username'] or '',
                    u['first_name'] or '',
                    u['created_at'][:10] if u['created_at'] else '',
                    u['last_seen'][:16] if u['last_seen'] else '',
                    f"{u['balance']:.2f}",
                    f"{u['total_pnl']:.2f}",
                    u['tier']
                ])

            # Envoyer le fichier
            output.seek(0)
            file_bytes = io.BytesIO(output.getvalue().encode('utf-8'))
            file_bytes.name = f"users_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

            await query.message.reply_document(
                document=file_bytes,
                filename=file_bytes.name,
                caption=f"📤 Export utilisateurs — {len(users)} entrées"
            )

            await query.edit_message_text(
                f"✅ Export terminé — {len(users)} utilisateurs",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_export_menu")
                ]])
            )

        except Exception as e:
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _export_trades_csv(self, query):
        """Exporte les trades en CSV"""
        await query.edit_message_text("⏳ Génération du fichier CSV...")

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("""
                    SELECT p.telegram_id, p.asset_symbol, p.market, p.direction,
                           p.entry_price, p.current_price, p.amount, p.leverage,
                           p.pnl, p.pnl_percent, p.status, p.opened_at, p.closed_at
                    FROM positions p
                    ORDER BY p.opened_at DESC
                    LIMIT 5000
                """)
                trades = await cursor.fetchall()

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['User ID', 'Symbol', 'Market', 'Direction', 'Entry', 'Exit', 'Montant', 'Leverage', 'PnL', 'PnL%', 'Status', 'Ouvert', 'Fermé'])

            for t in trades:
                writer.writerow([
                    t['telegram_id'],
                    t['asset_symbol'],
                    t['market'],
                    t['direction'],
                    f"{t['entry_price']:.4f}" if t['entry_price'] else '',
                    f"{t['current_price']:.4f}" if t['current_price'] else '',
                    f"{t['amount']:.2f}",
                    t['leverage'],
                    f"{t['pnl']:.2f}" if t['pnl'] else '',
                    f"{t['pnl_percent']:.2f}" if t['pnl_percent'] else '',
                    t['status'],
                    t['opened_at'][:16] if t['opened_at'] else '',
                    t['closed_at'][:16] if t['closed_at'] else ''
                ])

            output.seek(0)
            file_bytes = io.BytesIO(output.getvalue().encode('utf-8'))
            file_bytes.name = f"trades_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

            await query.message.reply_document(
                document=file_bytes,
                filename=file_bytes.name,
                caption=f"📤 Export trades — {len(trades)} entrées"
            )

            await query.edit_message_text(
                f"✅ Export terminé — {len(trades)} trades",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_export_menu")
                ]])
            )

        except Exception as e:
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _export_users_pdf(self, query):
        """Exporte les utilisateurs en PDF avec toutes les infos"""
        await query.edit_message_text("⏳ Génération du rapport PDF complet...")

        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
            from reportlab.lib.units import cm
        except ImportError:
            await query.edit_message_text(
                "❌ ReportLab non installé.\n\n"
                "Installez avec: `pip3 install reportlab`",
                parse_mode='Markdown'
            )
            return

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row

                # Vérifier quelles tables existent
                cursor = await db.execute("""
                    SELECT name FROM sqlite_master WHERE type='table'
                """)
                existing_tables = [row[0] for row in await cursor.fetchall()]

                has_positions = 'positions' in existing_tables
                has_favorites = 'favorites' in existing_tables
                has_ai_stats = 'ai_usage_stats' in existing_tables
                has_alerts = 'price_alerts' in existing_tables
                has_wallet = 'wallet' in existing_tables
                has_subs = 'user_subscriptions' in existing_tables
                has_onboarding = 'user_onboarding' in existing_tables

                # Récupérer les utilisateurs (requête de base - colonnes existantes uniquement)
                cursor = await db.execute("""
                    SELECT telegram_id, username, first_name, last_name, created_at
                    FROM users
                    ORDER BY created_at DESC
                """)
                base_users = await cursor.fetchall()

                # Construire les données utilisateurs avec les infos disponibles
                users = []
                for u in base_users:
                    user_data = {
                        'telegram_id': u['telegram_id'],
                        'username': u['username'],
                        'first_name': u['first_name'],
                        'last_name': u['last_name'],
                        'created_at': u['created_at'],
                        'last_seen': u['created_at'],  # Utiliser created_at comme fallback
                        'balance': 10000,
                        'initial_balance': 10000,
                        'total_pnl': 0,
                        'daily_pnl': 0,
                        'tier': 'free',
                        'analyses_today': 0,
                        'open_positions': 0,
                        'closed_positions': 0,
                        'favorites_count': 0,
                        'ai_messages': 0,
                        'active_alerts': 0,
                        'investor_profile': None,
                        'selected_markets': None
                    }

                    tid = u['telegram_id']

                    # Wallet
                    if has_wallet:
                        try:
                            cursor = await db.execute(
                                "SELECT balance, initial_balance, total_pnl, daily_pnl FROM wallet WHERE telegram_id = ?",
                                (tid,)
                            )
                            w = await cursor.fetchone()
                            if w:
                                user_data['balance'] = w['balance'] or 10000
                                user_data['initial_balance'] = w['initial_balance'] or 10000
                                user_data['total_pnl'] = w['total_pnl'] or 0
                                user_data['daily_pnl'] = w['daily_pnl'] or 0
                        except Exception:
                            pass

                    # Subscription
                    if has_subs:
                        try:
                            cursor = await db.execute(
                                "SELECT tier, analyses_used_today FROM user_subscriptions WHERE telegram_id = ?",
                                (tid,)
                            )
                            s = await cursor.fetchone()
                            if s:
                                user_data['tier'] = s['tier'] or 'free'
                                user_data['analyses_today'] = s['analyses_used_today'] or 0
                        except Exception:
                            pass

                    # Positions
                    if has_positions:
                        try:
                            cursor = await db.execute(
                                "SELECT COUNT(*) FROM positions WHERE telegram_id = ? AND status = 'open'",
                                (tid,)
                            )
                            user_data['open_positions'] = (await cursor.fetchone())[0]
                            cursor = await db.execute(
                                "SELECT COUNT(*) FROM positions WHERE telegram_id = ? AND status = 'closed'",
                                (tid,)
                            )
                            user_data['closed_positions'] = (await cursor.fetchone())[0]
                        except Exception:
                            pass

                    # Favorites
                    if has_favorites:
                        try:
                            cursor = await db.execute(
                                "SELECT COUNT(*) FROM favorites WHERE telegram_id = ?",
                                (tid,)
                            )
                            user_data['favorites_count'] = (await cursor.fetchone())[0]
                        except Exception:
                            pass

                    # AI usage
                    if has_ai_stats:
                        try:
                            cursor = await db.execute(
                                "SELECT COALESCE(SUM(message_count), 0) FROM ai_usage_stats WHERE telegram_id = ?",
                                (tid,)
                            )
                            user_data['ai_messages'] = (await cursor.fetchone())[0]
                        except Exception:
                            pass

                    # Onboarding
                    if has_onboarding:
                        try:
                            cursor = await db.execute(
                                "SELECT investor_profile, selected_markets FROM user_onboarding WHERE telegram_id = ?",
                                (tid,)
                            )
                            o = await cursor.fetchone()
                            if o:
                                user_data['investor_profile'] = o['investor_profile']
                                user_data['selected_markets'] = o['selected_markets']
                        except Exception:
                            pass

                    users.append(user_data)

                # Stats globales (avec gestion d'erreurs)
                total_open_positions = 0
                total_closed_positions = 0
                global_pnl = 0
                winning_trades = 0

                if has_positions:
                    try:
                        cursor = await db.execute("SELECT COUNT(*) FROM positions WHERE status = 'open'")
                        total_open_positions = (await cursor.fetchone())[0]
                        cursor = await db.execute("SELECT COUNT(*) FROM positions WHERE status = 'closed'")
                        total_closed_positions = (await cursor.fetchone())[0]
                        cursor = await db.execute("SELECT COALESCE(SUM(pnl), 0) FROM positions WHERE status = 'closed'")
                        global_pnl = (await cursor.fetchone())[0]
                        cursor = await db.execute("SELECT COUNT(*) FROM positions WHERE status = 'closed' AND pnl > 0")
                        winning_trades = (await cursor.fetchone())[0]
                    except Exception:
                        pass

                # Derniers actifs analysés (table optionnelle)
                recent_analyses = []
                try:
                    cursor = await db.execute("""
                        SELECT asset_symbol, analysis_type, sentiment, score, created_at, telegram_id
                        FROM ai_analysis_history
                        ORDER BY created_at DESC
                        LIMIT 20
                    """)
                    recent_analyses = await cursor.fetchall()
                except Exception as e:
                    logger.debug(f"Table ai_analysis_history non disponible: {e}")

                # Actifs les plus populaires (favoris)
                popular_assets = []
                try:
                    cursor = await db.execute("""
                        SELECT asset_symbol, market, COUNT(*) as count
                        FROM favorites
                        GROUP BY asset_symbol, market
                        ORDER BY count DESC
                        LIMIT 10
                    """)
                    popular_assets = await cursor.fetchall()
                except Exception as e:
                    logger.debug(f"Table favorites non disponible: {e}")

                # Derniers scans (table optionnelle)
                recent_scans = []
                try:
                    cursor = await db.execute("""
                        SELECT asset_symbol, market, score, signal, scan_date
                        FROM scan_results
                        WHERE score >= 70
                        ORDER BY scan_date DESC
                        LIMIT 15
                    """)
                    recent_scans = await cursor.fetchall()
                except Exception as e:
                    logger.debug(f"Table scan_results non disponible: {e}")

            # Créer PDF
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=landscape(A4), topMargin=0.5*cm, bottomMargin=0.5*cm,
                                   leftMargin=0.5*cm, rightMargin=0.5*cm)
            elements = []
            styles = getSampleStyleSheet()

            # Style titre
            title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, spaceAfter=10, alignment=1)
            subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, alignment=1)
            section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14, spaceBefore=15, spaceAfter=8)

            # === PAGE 1: RÉSUMÉ GLOBAL ===
            elements.append(Paragraph("📊 RAPPORT COMPLET TDB", title_style))
            elements.append(Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", subtitle_style))
            elements.append(Spacer(1, 15))

            # Stats globales
            elements.append(Paragraph("📈 STATISTIQUES GLOBALES", section_style))

            total_balance = sum(u['balance'] for u in users) if users else 0
            total_pnl = sum(u['total_pnl'] for u in users) if users else 0
            profitable_users = len([u for u in users if u['total_pnl'] > 0])
            active_24h = len([u for u in users if u['last_seen'] and 'T' in str(u['last_seen']) and
                             (datetime.now() - datetime.fromisoformat(u['last_seen'].replace('Z', ''))).days < 1]) if users else 0
            win_rate = (winning_trades / total_closed_positions * 100) if total_closed_positions > 0 else 0

            global_stats = [
                ['Métrique', 'Valeur', 'Métrique', 'Valeur'],
                ['👥 Total utilisateurs', str(len(users)), '📊 Positions ouvertes', str(total_open_positions)],
                ['🟢 Actifs (24h)', str(active_24h), '📈 Trades fermés', str(total_closed_positions)],
                ['💰 Balance totale', f"${total_balance:,.0f}", '💵 PnL global', f"${global_pnl:+,.0f}"],
                ['📈 Users profitables', f"{profitable_users} ({profitable_users/len(users)*100:.0f}%)" if users else "0", '🎯 Win rate global', f"{win_rate:.1f}%"],
            ]

            stats_table = Table(global_stats, colWidths=[5*cm, 5*cm, 5*cm, 5*cm])
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#ECF0F1')),
                ('BACKGROUND', (2, 1), (2, -1), colors.HexColor('#ECF0F1')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ]))
            elements.append(stats_table)
            elements.append(Spacer(1, 15))

            # Actifs les plus populaires
            elements.append(Paragraph("⭐ ACTIFS LES PLUS POPULAIRES (Favoris)", section_style))
            if popular_assets:
                pop_data = [['Rang', 'Symbole', 'Marché', 'Nb Favoris']]
                for i, asset in enumerate(popular_assets[:10], 1):
                    pop_data.append([f"#{i}", asset['asset_symbol'], asset['market'], str(asset['count'])])

                pop_table = Table(pop_data, colWidths=[2*cm, 4*cm, 4*cm, 3*cm])
                pop_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27AE60')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                elements.append(pop_table)
            else:
                elements.append(Paragraph("Aucun favori enregistré", styles['Normal']))

            elements.append(Spacer(1, 15))

            # Dernières analyses IA
            elements.append(Paragraph("🤖 DERNIÈRES ANALYSES IA", section_style))
            if recent_analyses:
                analysis_data = [['Date', 'Symbole', 'Type', 'Sentiment', 'Score', 'User ID']]
                for a in recent_analyses[:10]:
                    date_str = a['created_at'][:16] if a['created_at'] else '-'
                    analysis_data.append([
                        date_str.replace('T', ' '),
                        a['asset_symbol'],
                        a['analysis_type'] or 'full',
                        a['sentiment'] or '-',
                        str(a['score'] or '-'),
                        str(a['telegram_id'])
                    ])

                analysis_table = Table(analysis_data, colWidths=[4*cm, 3*cm, 2.5*cm, 2.5*cm, 2*cm, 3*cm])
                analysis_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9B59B6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                ]))
                elements.append(analysis_table)
            else:
                elements.append(Paragraph("Aucune analyse récente", styles['Normal']))

            # Derniers scans à fort score
            elements.append(Spacer(1, 15))
            elements.append(Paragraph("🔍 DERNIERS SCANS (Score ≥ 70)", section_style))
            if recent_scans:
                scan_data = [['Date', 'Symbole', 'Marché', 'Score', 'Signal']]
                for s in recent_scans[:10]:
                    date_str = s['scan_date'][:16] if s['scan_date'] else '-'
                    signal_emoji = '🟢' if s['signal'] == 'BUY' else '🔴' if s['signal'] == 'SELL' else '⚪'
                    scan_data.append([
                        date_str.replace('T', ' '),
                        s['asset_symbol'],
                        s['market'] or '-',
                        f"{s['score']:.0f}%",
                        f"{signal_emoji} {s['signal'] or '-'}"
                    ])

                scan_table = Table(scan_data, colWidths=[4*cm, 3*cm, 3*cm, 2*cm, 3*cm])
                scan_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E67E22')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                ]))
                elements.append(scan_table)
            else:
                elements.append(Paragraph("Aucun scan récent", styles['Normal']))

            # === PAGE 2: LISTE UTILISATEURS ===
            elements.append(PageBreak())
            elements.append(Paragraph("👥 LISTE COMPLÈTE DES UTILISATEURS", title_style))
            elements.append(Spacer(1, 10))

            if users:
                # En-tête du tableau
                user_data = [['ID', 'User', 'Nom', 'Inscrit', 'Vu', 'Balance', 'PnL', 'Pos.', 'Fav.', 'IA', 'Profil']]

                for u in users:
                    username = f"@{u['username']}" if u['username'] else '-'
                    name = f"{u['first_name'] or ''} {u['last_name'] or ''}".strip() or '-'
                    created = u['created_at'][:10] if u['created_at'] else '-'
                    last_seen = u['last_seen'][:10] if u['last_seen'] else '-'
                    balance = u['balance'] or 10000
                    pnl = u['total_pnl'] or 0
                    positions = f"{u['open_positions']}/{u['closed_positions']}"
                    favorites = str(u['favorites_count'] or 0)
                    ai_msgs = str(u['ai_messages'] or 0)
                    profile = (u['investor_profile'] or 'N/A')[:8]

                    user_data.append([
                        str(u['telegram_id']),
                        username[:12],
                        name[:15],
                        created,
                        last_seen,
                        f"${balance:,.0f}",
                        f"${pnl:+,.0f}",
                        positions,
                        favorites,
                        ai_msgs,
                        profile
                    ])

                user_table = Table(user_data, colWidths=[2.2*cm, 2.5*cm, 3*cm, 2*cm, 2*cm, 2*cm, 2*cm, 1.5*cm, 1.2*cm, 1.2*cm, 1.8*cm])
                user_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (5, 1), (9, -1), 'RIGHT'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
                ]))
                elements.append(user_table)
            else:
                elements.append(Paragraph("Aucun utilisateur enregistré", styles['Normal']))

            # Générer PDF
            doc.build(elements)
            buf.seek(0)

            await query.message.reply_document(
                document=buf,
                filename=f"TDB_rapport_complet_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
                caption=f"📕 Rapport complet TDB — {len(users)} utilisateurs"
            )

            await query.edit_message_text(
                f"✅ Rapport PDF généré — {len(users)} utilisateurs",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_export_menu")
                ]])
            )

        except Exception as e:
            logger.error(f"Erreur export PDF users: {e}")
            import traceback
            traceback.print_exc()
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _export_trades_pdf(self, query):
        """Exporte les trades en PDF"""
        await query.edit_message_text("⏳ Génération du fichier PDF...")

        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.units import cm
        except ImportError:
            await query.edit_message_text(
                "❌ ReportLab non installé.\n\n"
                "Installez avec: `pip3 install reportlab`",
                parse_mode='Markdown'
            )
            return

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("""
                    SELECT p.telegram_id, p.asset_symbol, p.market, p.direction,
                           p.entry_price, p.current_price, p.amount, p.leverage,
                           p.pnl, p.pnl_percent, p.status, p.opened_at, p.closed_at
                    FROM positions p
                    ORDER BY p.opened_at DESC
                    LIMIT 500
                """)
                trades = await cursor.fetchall()

            # Créer PDF en mémoire
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=landscape(A4), topMargin=1*cm, bottomMargin=1*cm)
            elements = []
            styles = getSampleStyleSheet()

            # Titre
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=20,
                alignment=1
            )
            elements.append(Paragraph("RAPPORT DES TRADES TDB", title_style))
            elements.append(Paragraph(f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
            elements.append(Paragraph(f"Total: {len(trades)} trades", styles['Normal']))
            elements.append(Spacer(1, 20))

            # Statistiques
            total_pnl = sum(t['pnl'] or 0 for t in trades)
            wins = len([t for t in trades if (t['pnl'] or 0) > 0])
            losses = len([t for t in trades if (t['pnl'] or 0) < 0])
            win_rate = (wins / len(trades) * 100) if trades else 0

            stats_data = [
                ['Métrique', 'Valeur'],
                ['Total trades', str(len(trades))],
                ['PnL total', f"${total_pnl:+,.2f}"],
                ['Trades gagnants', str(wins)],
                ['Trades perdants', str(losses)],
                ['Win rate', f"{win_rate:.1f}%"],
            ]
            stats_table = Table(stats_data, colWidths=[8*cm, 8*cm])
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, 1), (0, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ]))
            elements.append(stats_table)
            elements.append(Spacer(1, 20))

            # Liste des trades
            elements.append(Paragraph("<b>HISTORIQUE DES TRADES</b>", styles['Heading2']))

            trade_data = [['Date', 'Symbol', 'Dir.', 'Entrée', 'Sortie', 'Montant', 'PnL', 'Status']]

            for t in trades[:100]:  # Limiter à 100 pour le PDF
                pnl = t['pnl'] or 0
                trade_data.append([
                    t['opened_at'][:10] if t['opened_at'] else '-',
                    t['asset_symbol'],
                    t['direction'],
                    f"${t['entry_price']:,.2f}" if t['entry_price'] else '-',
                    f"${t['current_price']:,.2f}" if t['current_price'] else '-',
                    f"${t['amount']:,.0f}",
                    f"${pnl:+,.2f}",
                    t['status']
                ])

            trade_table = Table(trade_data, colWidths=[2.5*cm, 2.5*cm, 1.5*cm, 3*cm, 3*cm, 2.5*cm, 2.5*cm, 2*cm])
            trade_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (3, 1), (6, -1), 'RIGHT'),
            ]))
            elements.append(trade_table)

            # Générer PDF
            doc.build(elements)
            buf.seek(0)

            await query.message.reply_document(
                document=buf,
                filename=f"trades_report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
                caption=f"📕 Rapport trades — {len(trades)} entrées"
            )

            await query.edit_message_text(
                f"✅ Export PDF terminé — {len(trades)} trades",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("◀️ Retour", callback_data="admin_export_menu")
                ]])
            )

        except Exception as e:
            logger.error(f"Erreur export PDF trades: {e}")
            await query.edit_message_text(f"❌ Erreur: {e}")

    async def _show_quick_actions(self, query):
        """Menu d'actions rapides"""
        text = "⚡ **ACTIONS RAPIDES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += "**📨 Messages:**\n"
        text += "`/msguser <id> <msg>` — MP à un utilisateur\n"
        text += "`/msgall <message>` — Broadcast à tous\n\n"

        text += "**👤 Gestion utilisateurs:**\n"
        text += "`/resetwallet <id>` — Reset wallet\n"
        text += "`/banuser <id>` — Bannir\n"
        text += "`/unbanuser <id>` — Débannir\n\n"

        text += "**📊 Données:**\n"
        text += "`/export users|trades` — Export CSV/PDF\n"
        text += "`/health` — Santé système\n"
        text += "`/audit` — Journal admin\n\n"

        text += "**🧹 Canal:**\n"
        text += "`/clearchannel <id> <nb>` — Nettoyer canal\n"

        keyboard = [
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _show_clear_channel_menu(self, query):
        """Menu de nettoyage du canal"""
        channel_id = config.CHANNEL_ID if hasattr(config, 'CHANNEL_ID') else os.getenv("CHANNEL_ID", "")

        text = "🧹 **NETTOYER UN CANAL**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        text += "Pour supprimer des messages d'un canal, utilisez la commande:\n\n"
        text += "`/clearchannel <canal_id> <dernier_msg_id> [nb]`\n\n"

        text += "**📋 Comment trouver le message ID:**\n"
        text += "1. Allez dans votre canal\n"
        text += "2. Cliquez-droit sur le dernier message\n"
        text += "3. \"Copier le lien du message\"\n"
        text += "4. Le dernier nombre dans l'URL est l'ID\n\n"

        text += "**Exemple:**\n"
        text += "Lien: `t.me/c/1234567890/`**`542`**\n"
        if channel_id:
            text += f"→ `/clearchannel {channel_id} 542 50`\n\n"
        else:
            text += "→ `/clearchannel -1001234567890 542 50`\n\n"

        text += "⚠️ **Limitations:**\n"
        text += "• Messages >48h ne peuvent pas être supprimés\n"
        text += "• Le bot doit être admin avec droits de suppression\n"
        text += "• Maximum 200 messages par commande"

        keyboard = [[InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _execute_clear_channel(self, query, context):
        """Redirige vers le menu d'instructions"""
        await self._show_clear_channel_menu(query)

    async def _show_recent_errors(self, query):
        """Affiche les erreurs récentes"""
        text = "⚠️ **ERREURS RÉCENTES**\n"
        text += "━━━━━━━━━━━━━━━━━━━━\n\n"

        # Lire les derniers logs d'erreur
        try:
            log_file = getattr(config, 'LOG_FILE', 'tdb_bot.log')
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()

                # Filtrer les lignes ERROR et WARNING
                error_lines = [l for l in lines if 'ERROR' in l or 'WARNING' in l][-15:]

                if error_lines:
                    for line in error_lines:
                        # Nettoyer et tronquer
                        clean = line.strip()[:80].replace('`', "'")
                        text += f"`{clean}`\n"
                else:
                    text += "_Aucune erreur récente_\n"
            else:
                text += "_Fichier de log introuvable_\n"
        except Exception as e:
            text += f"Erreur lecture: {e}\n"

        keyboard = [
            [InlineKeyboardButton("🔄 Actualiser", callback_data="admin_errors")],
            [InlineKeyboardButton("◀️ Retour", callback_data="admin_back")]
        ]

        await query.edit_message_text(
            text[:4000],
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    # =========================================================================
    # COMMANDES GESTION UTILISATEURS
    # =========================================================================

    async def cmd_reset_wallet(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /resetwallet <user_id> — Réinitialise le wallet d'un utilisateur"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "📋 **Usage:** `/resetwallet <user_id>`\n\n"
                "Exemple: `/resetwallet 123456789`",
                parse_mode='Markdown'
            )
            return

        try:
            target_id = int(context.args[0])
        except ValueError:
            await update.message.reply_text("❌ ID utilisateur invalide.")
            return

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                # Vérifier que l'utilisateur existe
                cursor = await db.execute("SELECT username FROM users WHERE telegram_id = ?", (target_id,))
                user = await cursor.fetchone()

                if not user:
                    await update.message.reply_text(f"❌ Utilisateur {target_id} introuvable.")
                    return

                # Réinitialiser le wallet
                await db.execute("""
                    UPDATE wallet SET
                        balance = 10000,
                        available_balance = 10000,
                        total_pnl = 0,
                        daily_pnl = 0
                    WHERE telegram_id = ?
                """, (target_id,))

                # Fermer toutes les positions
                await db.execute("""
                    UPDATE positions SET status = 'closed', close_reason = 'admin_reset'
                    WHERE telegram_id = ? AND status = 'open'
                """, (target_id,))

                await db.commit()

            admin_manager.log_command(user_id, "resetwallet", str(target_id))

            await update.message.reply_text(
                f"✅ Wallet de {target_id} réinitialisé!\n\n"
                f"• Solde: $10,000\n"
                f"• Positions fermées",
                parse_mode='Markdown'
            )

        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")

    async def cmd_ban_user(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /banuser <user_id> — Bannit un utilisateur"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "📋 **Usage:** `/banuser <user_id>`",
                parse_mode='Markdown'
            )
            return

        try:
            target_id = int(context.args[0])
        except ValueError:
            await update.message.reply_text("❌ ID invalide.")
            return

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO banned_users (telegram_id, banned_at, banned_by)
                    VALUES (?, datetime('now'), ?)
                """, (target_id, user_id))
                await db.commit()

            admin_manager.log_command(user_id, "banuser", str(target_id))
            await update.message.reply_text(f"🚫 Utilisateur {target_id} banni.")

        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")

    async def cmd_unban_user(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /unbanuser <user_id> — Débannit un utilisateur"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "📋 **Usage:** `/unbanuser <user_id>`",
                parse_mode='Markdown'
            )
            return

        try:
            target_id = int(context.args[0])
        except ValueError:
            await update.message.reply_text("❌ ID invalide.")
            return

        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                await db.execute("DELETE FROM banned_users WHERE telegram_id = ?", (target_id,))
                await db.commit()

            admin_manager.log_command(user_id, "unbanuser", str(target_id))
            await update.message.reply_text(f"✅ Utilisateur {target_id} débanni.")

        except Exception as e:
            await update.message.reply_text(f"❌ Erreur: {e}")

    async def cmd_export_data(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /export <type> — Exporte des données"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "📋 **Usage:** `/export <type>`\n\n"
                "Types: `users`, `trades`",
                parse_mode='Markdown'
            )
            return

        export_type = context.args[0].lower()

        if export_type == "users":
            await update.message.reply_text("⏳ Export en cours...")
            # Créer un fake query pour réutiliser la méthode
            class FakeQuery:
                def __init__(self, message):
                    self.message = message
                async def edit_message_text(self, *args, **kwargs):
                    await self.message.reply_text(args[0] if args else kwargs.get('text', ''))

            await self._export_users_csv(FakeQuery(update.message))

        elif export_type == "trades":
            await update.message.reply_text("⏳ Export en cours...")

            class FakeQuery:
                def __init__(self, message):
                    self.message = message
                async def edit_message_text(self, *args, **kwargs):
                    await self.message.reply_text(args[0] if args else kwargs.get('text', ''))

            await self._export_trades_csv(FakeQuery(update.message))

        else:
            await update.message.reply_text("❌ Type inconnu. Utilisez `users` ou `trades`.")

    async def cmd_health_check(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /health — Vérification santé rapide"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        text = "❤️ **SANTÉ RAPIDE**\n\n"

        # Checks rapides
        checks = []

        # DB
        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                await db.execute("SELECT 1")
            checks.append("🟢 DB OK")
        except Exception:
            checks.append("🔴 DB ERROR")

        # APIs
        for service in ["yfinance", "groq"]:
            if rate_limiter.is_healthy(service):
                checks.append(f"🟢 {service} OK")
            else:
                stats = rate_limiter.get_stats(service)
                if stats['requests'] == 0:
                    checks.append(f"⚪ {service} (no data)")
                else:
                    checks.append(f"🔴 {service} ERROR")

        text += "\n".join(checks)

        await update.message.reply_text(text, parse_mode='Markdown')

    async def cmd_audit_log(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /audit — Affiche le journal d'audit"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        audit_log = admin_manager.get_audit_log(10)

        text = "📜 **JOURNAL D'AUDIT**\n━━━━━━━━━━━━━━━━━━━━\n\n"

        if not audit_log:
            text += "_Aucune action enregistrée_"
        else:
            for entry in reversed(audit_log):
                ts = entry['timestamp'][:16].replace('T', ' ')
                action = entry['action']
                details = entry.get('details', {})
                cmd = details.get('command', action)
                text += f"`{ts}` → {cmd}\n"

        await update.message.reply_text(text, parse_mode='Markdown')

    # =========================================================================
    # MP ADMIN → UTILISATEUR + REPORTS UTILISATEURS
    # =========================================================================

    async def cmd_message_user(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /msguser <user_id> <message>
        Envoie un message privé à un utilisateur depuis l'admin
        """
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if len(context.args) < 2:
            await update.message.reply_text(
                "📋 **Usage:** `/msguser <user_id> <message>`\n\n"
                "Exemple:\n"
                "`/msguser 123456789 Bonjour, nous avons remarqué une activité suspecte.`",
                parse_mode='Markdown'
            )
            return

        try:
            target_id = int(context.args[0])
        except ValueError:
            await update.message.reply_text("❌ ID utilisateur invalide.")
            return

        parts = update.message.text.split(None, 2)
        if len(parts) < 3:
            await update.message.reply_text("❌ Message vide.")
            return
        message_to_send = parts[2]

        formatted_message = (
            f"📩 **Message de l'équipe TDB**\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"{message_to_send}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"_Pour répondre: /report <votre message>_"
        )

        try:
            await context.bot.send_message(
                chat_id=target_id,
                text=formatted_message,
                parse_mode='Markdown'
            )
            admin_manager.log_command(user_id, "msguser", f"→ {target_id}: {message_to_send[:50]}")
            await update.message.reply_text(
                f"✅ **Message envoyé à** `{target_id}`\n_{message_to_send[:100]}_",
                parse_mode='Markdown'
            )
        except Exception as e:
            await update.message.reply_text(
                f"❌ Impossible d'envoyer: {e}\n_(L'utilisateur a peut-être bloqué le bot)_",
                parse_mode='Markdown'
            )

    async def cmd_message_all(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /msgall <message>
        Envoie un message à TOUS les utilisateurs du bot
        """
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        if not context.args:
            await update.message.reply_text(
                "📢 **BROADCAST — Envoyer à tous les utilisateurs**\n\n"
                "**Usage:** `/msgall <message>`\n\n"
                "**Exemples:**\n"
                "`/msgall Nouvelle mise à jour disponible !`\n"
                "`/msgall Maintenance prévue demain à 14h`\n\n"
                "⚠️ _Ce message sera envoyé à TOUS les utilisateurs._",
                parse_mode='Markdown'
            )
            return

        # Récupérer le message après /msgall
        parts = update.message.text.split(None, 1)
        if len(parts) < 2:
            await update.message.reply_text("❌ Message vide.")
            return

        message_to_send = parts[1]

        # Confirmation avant envoi
        await update.message.reply_text(
            f"📢 **CONFIRMER L'ENVOI**\n\n"
            f"Message:\n_{message_to_send[:200]}{'...' if len(message_to_send) > 200 else ''}_\n\n"
            f"⚠️ Pour confirmer l'envoi à tous les utilisateurs:\n"
            f"`/msgall_confirm {message_to_send[:50]}...`\n\n"
            f"_(Tapez la commande pour envoyer)_",
            parse_mode='Markdown'
        )

        # Stocker le message pour confirmation
        if not hasattr(self, '_pending_broadcasts'):
            self._pending_broadcasts = {}
        self._pending_broadcasts[user_id] = {
            'message': message_to_send,
            'timestamp': datetime.now()
        }

        # Enregistrer le handler pour la confirmation
        self.app.add_handler(CommandHandler("msgall_confirm", self._cmd_msgall_confirm))

    async def _cmd_msgall_confirm(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Confirme et envoie le broadcast"""
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            return

        if not hasattr(self, '_pending_broadcasts') or user_id not in self._pending_broadcasts:
            await update.message.reply_text("❌ Aucun broadcast en attente. Utilisez `/msgall <message>` d'abord.")
            return

        pending = self._pending_broadcasts.pop(user_id)

        # Vérifier que le broadcast n'est pas trop ancien (5 minutes max)
        if (datetime.now() - pending['timestamp']).seconds > 300:
            await update.message.reply_text("❌ Broadcast expiré. Veuillez recommencer avec `/msgall`.")
            return

        message_to_send = pending['message']

        status_msg = await update.message.reply_text("📤 **Envoi en cours...**\n\n_Préparation des messages..._")

        # Récupérer tous les utilisateurs
        try:
            import aiosqlite
            async with aiosqlite.connect(config.DATABASE_PATH) as db:
                cursor = await db.execute("SELECT telegram_id FROM users")
                users = await cursor.fetchall()

            total = len(users)
            sent = 0
            failed = 0

            formatted_message = (
                f"📢 **Annonce TDB**\n"
                f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"{message_to_send}\n\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"_— L'équipe TDB_"
            )

            # Envoyer à chaque utilisateur
            for i, (target_id,) in enumerate(users):
                try:
                    await context.bot.send_message(
                        chat_id=target_id,
                        text=formatted_message,
                        parse_mode='Markdown'
                    )
                    sent += 1
                except Exception:
                    failed += 1

                # Mise à jour du statut tous les 10 messages
                if (i + 1) % 10 == 0:
                    await status_msg.edit_text(
                        f"📤 **Envoi en cours...**\n\n"
                        f"Progression: {i + 1}/{total}\n"
                        f"✅ Envoyés: {sent}\n"
                        f"❌ Échoués: {failed}"
                    )
                    # Petit délai pour éviter le rate limiting Telegram
                    import asyncio
                    await asyncio.sleep(0.05)

            # Résultat final
            admin_manager.log_command(user_id, "msgall", f"→ {sent}/{total} envoyés")

            await status_msg.edit_text(
                f"✅ **BROADCAST TERMINÉ**\n\n"
                f"📊 **Résultat:**\n"
                f"• Total utilisateurs: {total}\n"
                f"• Messages envoyés: {sent}\n"
                f"• Échecs: {failed}\n\n"
                f"_Message: {message_to_send[:100]}..._"
            )

            # Envoyer aussi sur Discord admin
            await discord_service.send_admin_alert(
                f"📢 Broadcast envoyé par admin",
                f"• Envoyés: {sent}/{total}\n• Message: {message_to_send[:100]}..."
            )

        except Exception as e:
            await status_msg.edit_text(f"❌ Erreur lors du broadcast: {e}")

    async def cmd_clear_channel(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /clearchannel <channel_id> <last_msg_id> [nb_messages]
        Supprime les messages d'un canal en partant d'un message ID connu
        """
        user_id = update.effective_user.id

        if not self.is_admin(user_id):
            await update.message.reply_text("❌ Commande réservée aux administrateurs.")
            return

        # Parser les arguments
        if len(context.args) < 2:
            await update.message.reply_text(
                "🧹 **NETTOYER UN CANAL**\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                "📋 **Usage:**\n"
                "`/clearchannel <channel_id> <last_msg_id> [nb]`\n\n"
                "**Comment trouver le last\\_msg\\_id:**\n"
                "1. Allez dans le canal\n"
                "2. Cliquez sur le dernier message\n"
                "3. Copiez le lien du message\n"
                "4. Le dernier nombre est l'ID\n\n"
                "**Exemple:**\n"
                "Lien: `t.me/c/1234567890/`**`542`**\n"
                "→ `/clearchannel -1001234567890 542 50`\n\n"
                "⚠️ Le bot doit être admin avec droits de suppression.",
                parse_mode='Markdown'
            )
            return

        try:
            channel_id = int(context.args[0])
            last_msg_id = int(context.args[1])
            nb_messages = int(context.args[2]) if len(context.args) > 2 else 50
        except (ValueError, IndexError):
            await update.message.reply_text(
                "❌ Arguments invalides.\n\n"
                "Usage: `/clearchannel <channel_id> <last_msg_id> [nb]`",
                parse_mode='Markdown'
            )
            return

        # Limites de sécurité
        nb_messages = min(nb_messages, 200)

        status_msg = await update.message.reply_text(
            f"🧹 **Nettoyage en cours...**\n\n"
            f"Canal: `{channel_id}`\n"
            f"Messages: {last_msg_id} → {last_msg_id - nb_messages + 1}\n"
            f"Nombre: {nb_messages}"
        )

        deleted = 0
        failed = 0
        skipped = 0

        try:
            import asyncio

            # Supprimer les messages par batch (Telegram limite à 100 par requête)
            batch_size = 100
            all_msg_ids = list(range(last_msg_id, last_msg_id - nb_messages, -1))

            for i in range(0, len(all_msg_ids), batch_size):
                batch = all_msg_ids[i:i + batch_size]

                # Mise à jour du statut tous les 50 messages
                if i > 0 and i % 50 == 0:
                    await status_msg.edit_text(
                        f"🧹 **Nettoyage en cours...**\n\n"
                        f"Progression: {i}/{nb_messages}\n"
                        f"✅ Supprimés: {deleted}\n"
                        f"❌ Échecs: {failed}"
                    )

                # Essayer de supprimer le batch
                for msg_id in batch:
                    try:
                        await context.bot.delete_message(
                            chat_id=channel_id,
                            message_id=msg_id
                        )
                        deleted += 1
                        await asyncio.sleep(0.05)  # Anti-flood
                    except Exception as e:
                        error_str = str(e).lower()
                        if "message to delete not found" in error_str:
                            skipped += 1  # Message déjà supprimé ou inexistant
                        elif "message can't be deleted" in error_str:
                            failed += 1  # Message trop ancien (>48h)
                        else:
                            failed += 1

                        # Si trop d'échecs consécutifs, arrêter
                        if failed > 20 and deleted == 0:
                            raise Exception("Trop d'échecs, vérifiez les permissions")

            # Résultat final
            await status_msg.edit_text(
                f"🧹 **NETTOYAGE TERMINÉ**\n"
                f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"Canal: `{channel_id}`\n\n"
                f"✅ **Supprimés:** {deleted}\n"
                f"⏭️ **Ignorés:** {skipped} (inexistants)\n"
                f"❌ **Échecs:** {failed} (trop anciens)\n\n"
                f"_Messages >48h ne peuvent pas être supprimés par l'API._",
                parse_mode='Markdown'
            )

            admin_manager.log_command(user_id, "clearchannel",
                f"Canal {channel_id}: {deleted} supprimés, {failed} échecs")

        except Exception as e:
            logger.error(f"Erreur clear channel: {e}")
            await status_msg.edit_text(
                f"❌ **Erreur:** {e}\n\n"
                f"✅ Supprimés avant erreur: {deleted}\n\n"
                f"Vérifiez que:\n"
                f"• Le bot est admin du canal\n"
                f"• Il a les droits de suppression\n"
                f"• L'ID du canal est correct (format: -100...)"
            )

    async def cmd_user_report(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """
        Commande /report <message>
        Permet à n'importe quel utilisateur d'envoyer un report à l'équipe admin
        """
        user = update.effective_user
        user_id = user.id

        if not context.args:
            await update.message.reply_text(
                "📋 **Signaler un problème**\n\n"
                "Usage: `/report <votre message>`\n\n"
                "Exemples:\n"
                "• `/report Mon solde est incorrect`\n"
                "• `/report Je ne reçois pas mes alertes`\n"
                "• `/report Bug sur l'analyse de AAPL`\n\n"
                "_Votre message sera transmis à l'équipe._",
                parse_mode='Markdown'
            )
            return

        parts = update.message.text.split(None, 1)
        report_message = parts[1] if len(parts) > 1 else ""

        if not report_message.strip():
            await update.message.reply_text("❌ Message vide.")
            return

        display_name = f"@{user.username}" if user.username else user.first_name or str(user_id)

        report_text = (
            f"📩 **REPORT UTILISATEUR**\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"👤 **De:** {display_name} (`{user_id}`)\n"
            f"📅 **Le:** {datetime.now().strftime('%d/%m/%Y %H:%M')}\n\n"
            f"💬 **Message:**\n{report_message}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"_Répondre: `/msguser {user_id} <réponse>`_"
        )

        # Envoyer à tous les admins Telegram
        sent_count = 0
        for admin_id in admin_manager.get_admin_ids():
            try:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=report_text,
                    parse_mode='Markdown'
                )
                sent_count += 1
            except Exception as e:
                logger.warning(f"Report non envoyé à admin {admin_id}: {e}")

        # Envoyer aussi sur Discord
        await self._send_report_to_discord(user, user_id, report_message)

        if sent_count > 0:
            await update.message.reply_text(
                "✅ **Votre report a été envoyé !**\n\n"
                "L'équipe va examiner votre message et vous répondra directement.\n\n"
                "_Merci pour votre retour._",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(
                "⚠️ Report enregistré, l'équipe sera notifiée.",
                parse_mode='Markdown'
            )

    async def _send_report_to_discord(self, tg_user, user_id: int, message: str):
        """Envoie le report utilisateur sur Discord admin"""
        import aiohttp

        webhook = os.getenv("DISCORD_WEBHOOK_ADMIN", "")
        if not webhook:
            return

        display = f"@{tg_user.username}" if tg_user.username else tg_user.first_name or str(user_id)

        embed = {
            "title": "📩 Report Utilisateur",
            "color": 0x9B59B6,
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "👤 Utilisateur", "value": f"**{display}**\nID: `{user_id}`", "inline": True},
                {"name": "📅 Date", "value": datetime.now().strftime('%d/%m/%Y %H:%M'), "inline": True},
                {"name": "💬 Message", "value": message[:500], "inline": False},
                {"name": "↩️ Répondre", "value": f"`/msguser {user_id} <votre réponse>`", "inline": False}
            ],
            "footer": {"text": "TDB Bot — Reports"}
        }

        try:
            async with aiohttp.ClientSession() as session:
                await session.post(
                    webhook,
                    json={"embeds": [embed]},
                    timeout=aiohttp.ClientTimeout(total=10)
                )
        except Exception as e:
            logger.warning(f"Erreur Discord report: {e}")

    async def _show_msguser_prompt(self, query, target_user_id: int):
        """Affiche les instructions pour envoyer un MP à un utilisateur"""
        text = (
            f"📩 **ENVOYER UN MESSAGE PRIVÉ**\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Pour envoyer un message à l'utilisateur `{target_user_id}`:\n\n"
            f"Utilisez la commande:\n"
            f"`/msguser {target_user_id} Votre message ici`\n\n"
            f"**Exemples:**\n"
            f"`/msguser {target_user_id} Bonjour, avez-vous des questions ?`\n"
            f"`/msguser {target_user_id} Votre compte a été vérifié.`\n\n"
            f"_L'utilisateur recevra le message avec l'entête TDB._"
        )

        keyboard = [
            [InlineKeyboardButton("◀️ Retour", callback_data=f"admin_user_detail_{target_user_id}")]
        ]

        await query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    async def _confirm_ban_user(self, query, target_user_id: int):
        """Confirmation avant de bannir un utilisateur"""
        text = (
            f"🚫 **CONFIRMER LE BAN**\n\n"
            f"Bannir l'utilisateur `{target_user_id}` ?\n\n"
            f"Pour confirmer, utilisez:\n"
            f"`/banuser {target_user_id}`"
        )
        keyboard = [[InlineKeyboardButton("◀️ Annuler", callback_data=f"admin_user_detail_{target_user_id}")]]
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))

    async def _confirm_reset_wallet(self, query, target_user_id: int):
        """Confirmation avant de reset le wallet"""
        text = (
            f"🔄 **CONFIRMER LE RESET**\n\n"
            f"Réinitialiser le wallet de `{target_user_id}` à $10,000 ?\n\n"
            f"Pour confirmer, utilisez:\n"
            f"`/resetwallet {target_user_id}`"
        )
        keyboard = [[InlineKeyboardButton("◀️ Annuler", callback_data=f"admin_user_detail_{target_user_id}")]]
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))
