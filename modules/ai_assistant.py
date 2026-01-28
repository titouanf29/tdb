"""
Module Assistant IA Trading
Permet aux utilisateurs de converser avec un assistant IA spécialisé en trading
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from services.ai_assistant import ai_assistant_service
from database.manager import db_manager
from datetime import datetime, timedelta
import pytz
import config


def get_reset_time_info():
    """Calcule le temps restant avant le reset (minuit UTC)"""
    utc = pytz.UTC
    now = datetime.now(utc)
    # Prochain minuit UTC
    tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    delta = tomorrow - now

    hours = int(delta.total_seconds() // 3600)
    minutes = int((delta.total_seconds() % 3600) // 60)

    # Heure de Paris (pour affichage)
    paris = pytz.timezone('Europe/Paris')
    reset_paris = tomorrow.astimezone(paris)

    return {
        'hours': hours,
        'minutes': minutes,
        'reset_time_paris': reset_paris.strftime('%H:%M'),
        'reset_time_utc': '00:00'
    }

# État global pour savoir quels utilisateurs sont en mode chat IA
active_chat_sessions = set()

class AIAssistantModule:
    """Gère les interactions avec l'assistant IA"""

    @staticmethod
    def is_chat_active(telegram_id):
        """Vérifie si le chat IA est actif pour cet utilisateur"""
        return telegram_id in active_chat_sessions

    @staticmethod
    def activate_chat(telegram_id):
        """Active le mode chat IA"""
        active_chat_sessions.add(telegram_id)

    @staticmethod
    def deactivate_chat(telegram_id):
        """Désactive le mode chat IA"""
        active_chat_sessions.discard(telegram_id)

    async def cmd_ai_assistant(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /ai_assistant - Active le mode chat IA"""
        user_id = update.effective_user.id

        # Déterminer si c'est un callback (bouton) ou un message (commande)
        is_callback = update.callback_query is not None
        if is_callback:
            await update.callback_query.answer()

        # Vérifier la limite journalière
        limit_reached = await db_manager.check_ai_limit_reached(user_id)
        usage = await db_manager.get_ai_daily_usage(user_id)

        if limit_reached:
            reset_info = get_reset_time_info()
            message_text = (
                f"⚠️ Limite journaliere atteinte\n\n"
                f"Vous avez utilise {usage['message_count']}/{config.MAX_AI_MESSAGES_PER_DAY} messages aujourd'hui.\n\n"
                f"🔄 Reset dans {reset_info['hours']}h{reset_info['minutes']:02d}\n"
                f"🕐 Prochaine disponibilite : {reset_info['reset_time_paris']} (Paris)"
            )
            if is_callback:
                await update.callback_query.message.reply_text(message_text)
            else:
                await update.message.reply_text(message_text)
            return

        # Activer le mode chat
        print(f"[DEBUG AI] Activation du chat pour user {user_id}")
        self.activate_chat(user_id)
        print(f"[DEBUG AI] Sessions apres activation: {active_chat_sessions}")

        # Afficher le message d'accueil
        keyboard = [
            [InlineKeyboardButton("❌ Arrêter le chat", callback_data="ai_stop")],
            [InlineKeyboardButton("🗑️ Effacer l'historique", callback_data="ai_clear_history")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        welcome_text = (
            f"🤖 Assistant IA Trading Activé\n\n"
            f"Posez-moi vos questions sur le trading !\n\n"
            f"📊 Exemples de questions :\n"
            f"• C'est quoi un RSI ?\n"
            f"• Comment analyser AAPL ?\n"
            f"• Quelle stratégie en marché baissier ?\n"
            f"• Explique-moi les bougies japonaises\n\n"
            f"💬 Messages utilisés : {usage['message_count']}/{config.MAX_AI_MESSAGES_PER_DAY}\n\n"
            f"⚠️ Important : Ceci est un outil éducatif, pas un conseil financier.\n\n"
            f"Pour arrêter le chat, cliquez sur le bouton ou envoyez /stop_ai"
        )

        if is_callback:
            await update.callback_query.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_text(
                welcome_text,
                reply_markup=reply_markup
            )

    async def cmd_stop_ai(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Commande /stop_ai - Désactive le mode chat IA"""
        user_id = update.effective_user.id
        self.deactivate_chat(user_id)

        await update.message.reply_text(
            "✅ Mode chat IA désactivé.\n\n"
            "Pour réactiver, utilisez /ai_assistant",
                    )

    async def handle_ai_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les messages quand le mode chat IA est actif"""
        try:
            print(f"[DEBUG AI] >>> handle_ai_message ENTRY POINT <<<")

            user_id = update.effective_user.id
            user_message = update.message.text

            print(f"[DEBUG AI] handle_ai_message appele pour user {user_id}")
            print(f"[DEBUG AI] Sessions actives: {active_chat_sessions}")
            print(f"[DEBUG AI] Chat actif pour user? {self.is_chat_active(user_id)}")
        except Exception as e:
            print(f"[DEBUG AI] ERREUR au debut de handle_ai_message: {e}")

        # Vérifier que le mode chat est actif
        if not self.is_chat_active(user_id):
            print(f"[DEBUG AI] User {user_id} pas en mode chat, return False")
            return False  # Pas en mode chat, laisser les autres handlers traiter

        print(f"[DEBUG AI] User {user_id} EN mode chat, traitement du message...")

        # Verifier la limite journaliere
        limit_reached = await db_manager.check_ai_limit_reached(user_id)
        if limit_reached:
            usage = await db_manager.get_ai_daily_usage(user_id)
            reset_info = get_reset_time_info()
            self.deactivate_chat(user_id)  # Desactiver automatiquement
            await update.message.reply_text(
                f"⚠️ Limite journaliere atteinte\n\n"
                f"Vous avez utilise {usage['message_count']}/{config.MAX_AI_MESSAGES_PER_DAY} messages.\n\n"
                f"Le mode chat a ete desactive.\n\n"
                f"🔄 Reset dans {reset_info['hours']}h{reset_info['minutes']:02d}\n"
                f"🕐 Prochaine disponibilite : {reset_info['reset_time_paris']} (Paris)"
            )
            return True

        # Afficher un indicateur de "en train d'écrire..."
        typing_message = await update.message.reply_text("💭 Réflexion en cours...")

        try:
            # Récupérer l'historique de conversation
            history = await db_manager.get_ai_chat_history(user_id, limit=5)

            # Détecter si l'utilisateur mentionne un actif (ex: "analyse AAPL")
            asset_context = await self._detect_asset_context(user_message)

            # Envoyer au service IA
            response = await ai_assistant_service.chat(
                user_message=user_message,
                conversation_history=history,
                asset_context=asset_context
            )

            if not response['success']:
                await typing_message.edit_text(
                    f"❌ Erreur : {response.get('error', 'Erreur inconnue')}\n\n"
                    f"Réessayez dans quelques instants."
                )
                return True

            # Sauvegarder les messages dans l'historique
            await db_manager.save_ai_message(user_id, 'user', user_message)
            await db_manager.save_ai_message(
                user_id, 'assistant', response['response'],
                tokens_used=response.get('tokens_used', 0)
            )

            # Incrémenter le compteur d'utilisation
            await db_manager.increment_ai_usage(user_id, tokens_used=response.get('tokens_used', 0))

            # Afficher la reponse
            usage = await db_manager.get_ai_daily_usage(user_id)
            remaining = config.MAX_AI_MESSAGES_PER_DAY - usage['message_count']

            # Limiter la longueur de la reponse Telegram (4096 caracteres max)
            ai_response = response['response']
            if len(ai_response) > 3500:
                ai_response = ai_response[:3500] + "\n\n(Reponse tronquee pour limitation Telegram)"

            # Footer avec info reset si peu de messages restants
            footer = f"💬 Messages restants : {remaining}/{config.MAX_AI_MESSAGES_PER_DAY}"
            if remaining <= 5:
                reset_info = get_reset_time_info()
                footer += f"\n🔄 Reset dans {reset_info['hours']}h{reset_info['minutes']:02d}"

            await typing_message.edit_text(
                f"{ai_response}\n\n"
                f"━━━━━━━━━━━━━━━━━\n"
                f"{footer}"
            )

        except Exception as e:
            print(f"[AI_ASSISTANT] Erreur handle_message: {e}")
            await typing_message.edit_text(
                f"❌ Une erreur est survenue.\n\n"
                f"Détails: {str(e)}"
            )

        return True  # Message traité

    async def _detect_asset_context(self, message: str):
        """Détecte si le message mentionne un actif et récupère son contexte"""
        message_upper = message.upper()

        # Rechercher des symboles d'actifs courants dans le message
        for market_name, market_data in config.MARKETS.items():
            for symbol in market_data['assets']:
                # Rechercher le symbole de base (sans suffixe)
                base_symbol = symbol.split('.')[0].split('-')[0].split('=')[0]
                if base_symbol in message_upper and len(base_symbol) >= 3:
                    # Actif trouvé, récupérer le contexte
                    return await ai_assistant_service.get_asset_context(symbol)

        return None

    async def callback_ai_stop(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Callback pour arrêter le chat IA"""
        query = update.callback_query
        await query.answer()

        user_id = update.effective_user.id
        self.deactivate_chat(user_id)

        await query.edit_message_text(
            "✅ Mode chat IA désactivé.\n\n"
            "Pour réactiver, utilisez /ai_assistant"
        )

    async def callback_ai_clear_history(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Callback pour effacer l'historique"""
        query = update.callback_query
        await query.answer()

        user_id = update.effective_user.id
        await db_manager.clear_ai_chat_history(user_id)

        await query.edit_message_text(
            "🗑️ Historique de conversation effacé.\n\n"
            "Vous pouvez commencer une nouvelle conversation fraîche !"
        )

# Instance globale
ai_assistant_module = AIAssistantModule()
