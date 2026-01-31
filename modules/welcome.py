"""
Module Welcome - Accueil des nouveaux utilisateurs
Gère les arrivées dans le canal et le message de bienvenue
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ChatMemberUpdated
from telegram.ext import ContextTypes, ChatMemberHandler, CommandHandler, CallbackQueryHandler
from telegram.constants import ChatMemberStatus
from database.manager import db_manager
import config

logger = logging.getLogger(__name__)


class WelcomeModule:
    """Module de gestion de l'accueil des nouveaux utilisateurs"""

    def __init__(self, application):
        self.app = application
        self.bot_username = None
        self.register_handlers()

    def register_handlers(self):
        """Enregistre les handlers"""
        # Handler pour les nouveaux membres dans le canal/groupe
        self.app.add_handler(ChatMemberHandler(
            self.handle_chat_member_update,
            ChatMemberHandler.CHAT_MEMBER
        ))

        # Commande /start avec ou sans paramètre (deep link)
        self.app.add_handler(CommandHandler("start", self.cmd_start))

        # Callbacks pour l'onboarding
        self.app.add_handler(CallbackQueryHandler(
            self.handle_onboarding_callback,
            pattern="^onboard_"
        ))

    async def get_bot_username(self):
        """Récupère le username du bot"""
        if not self.bot_username:
            bot = await self.app.bot.get_me()
            self.bot_username = bot.username
        return self.bot_username

    def extract_status_change(self, chat_member_update: ChatMemberUpdated):
        """Extrait les changements de statut d'un membre"""
        status_change = chat_member_update.difference().get("status")
        old_is_member, new_is_member = chat_member_update.difference().get("is_member", (None, None))

        if status_change is None:
            return None

        old_status, new_status = status_change
        was_member = old_status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.OWNER,
            ChatMemberStatus.ADMINISTRATOR,
        ] or (old_status == ChatMemberStatus.RESTRICTED and old_is_member is True)

        is_member = new_status in [
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.OWNER,
            ChatMemberStatus.ADMINISTRATOR,
        ] or (new_status == ChatMemberStatus.RESTRICTED and new_is_member is True)

        return was_member, is_member

    async def handle_chat_member_update(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les changements de membres dans un chat (canal/groupe)"""
        result = self.extract_status_change(update.chat_member)
        if result is None:
            return

        was_member, is_member = result

        # Nouveau membre qui rejoint
        if not was_member and is_member:
            await self.handle_new_member(update, context)

    async def handle_new_member(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère l'arrivée d'un nouveau membre"""
        chat = update.chat_member.chat
        user = update.chat_member.new_chat_member.user

        # Ignorer les bots
        if user.is_bot:
            return

        logger.info(f"Nouveau membre dans {chat.title}: {user.first_name} ({user.id})")

        # Enregistrer dans la base de données
        await db_manager.log_channel_join(
            telegram_id=user.id,
            username=user.username,
            first_name=user.first_name
        )

        # Créer l'utilisateur s'il n'existe pas
        await db_manager.create_user(
            telegram_id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name
        )

        # Envoyer un message de bienvenue en privé
        try:
            await self.send_welcome_dm(user, context)
            await db_manager.mark_welcome_sent(user.id)
        except Exception as e:
            # L'utilisateur n'a peut-être pas encore démarré le bot en privé
            logger.debug(f"Impossible d'envoyer DM à {user.id}: {e}")

    async def send_welcome_dm(self, user, context: ContextTypes.DEFAULT_TYPE):
        """Envoie un message de bienvenue en privé"""
        bot_username = await self.get_bot_username()

        text = f"""👋 <b>Bienvenue {user.first_name} sur TDB Trading Bot !</b>

━━━━━━━━━━━━━━━━━━━━

🤖 <b>TDB</b> est votre assistant IA de trading virtuel.

<b>Ce que vous pouvez faire :</b>
📊 Analyses IA en temps réel
🎯 Alertes d'opportunités personnalisées
📈 Paper Trading (trading virtuel)
🔔 Notifications intelligentes

━━━━━━━━━━━━━━━━━━━━

👇 <b>Cliquez pour configurer votre profil et commencer !</b>"""

        keyboard = [
            [InlineKeyboardButton("🚀 Configurer mon profil", callback_data="onboard_start")],
            [InlineKeyboardButton("⏭️ Passer la configuration", callback_data="onboard_skip")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await context.bot.send_message(
            chat_id=user.id,
            text=text,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )

    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère la commande /start"""
        user = update.effective_user
        chat = update.effective_chat

        # Ignorer si ce n'est pas un chat privé
        if chat.type != "private":
            return

        # Vérifier s'il y a un deep link (ex: /start ref_ABC123)
        referral_code = None
        referred_by = None
        if context.args and len(context.args) > 0:
            arg = context.args[0]
            if arg.startswith("ref_"):
                referral_code = arg.replace("ref_", "")
                referred_by = await db_manager.get_referral_by_code(referral_code)
                if referred_by:
                    await db_manager.increment_referrals(referred_by)

        # Créer l'utilisateur
        await db_manager.create_user(
            telegram_id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name
        )

        # Créer l'abonnement
        await db_manager.create_user_subscription(user.id)

        # Marquer comme ayant démarré le bot
        await db_manager.mark_bot_started(user.id)

        # Vérifier si l'onboarding est déjà fait
        onboarding = await db_manager.get_user_onboarding(user.id)

        if onboarding and onboarding.get('onboarding_completed'):
            # Utilisateur existant - afficher le menu
            await self.show_returning_user_message(update, context)
        else:
            # Nouveau utilisateur - démarrer l'onboarding
            await db_manager.create_user_onboarding(user.id, referral_code, referred_by)
            await self.show_welcome_message(update, context)

    async def show_welcome_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche le message de bienvenue pour les nouveaux utilisateurs"""
        user = update.effective_user

        text = f"""🎉 <b>Bienvenue {user.first_name} !</b>

━━━━━━━━━━━━━━━━━━━━

🤖 <b>TDB - Trading Bot Professionnel</b>

Votre assistant IA de trading virtuel avancé.

<b>✨ Fonctionnalités principales :</b>
📊 Analyses IA en temps réel
🎯 Alertes d'opportunités
📈 Paper Trading (10 000$ virtuels)
🔔 Notifications intelligentes
📱 Interface intuitive

━━━━━━━━━━━━━━━━━━━━

Pour personnaliser votre expérience, configurons ensemble votre profil en quelques étapes rapides !"""

        keyboard = [
            [InlineKeyboardButton("🚀 Commencer la configuration", callback_data="onboard_start")],
            [InlineKeyboardButton("⏭️ Passer (configuration par défaut)", callback_data="onboard_skip")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_returning_user_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Message pour les utilisateurs qui reviennent"""
        user = update.effective_user

        text = f"""👋 <b>Content de vous revoir, {user.first_name} !</b>

━━━━━━━━━━━━━━━━━━━━

🤖 <b>TDB Trading Bot</b> est prêt à vous aider.

Utilisez le menu ci-dessous pour accéder à toutes les fonctionnalités."""

        keyboard = [
            [InlineKeyboardButton("📊 Menu Principal", callback_data="menu_main")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="settings_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def handle_onboarding_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Gère les callbacks de l'onboarding"""
        query = update.callback_query
        await query.answer()

        data = query.data
        user_id = query.from_user.id

        if data == "onboard_start":
            await self.show_language_step(update, context)

        elif data == "onboard_skip":
            # Configuration par défaut et fin
            await db_manager.complete_onboarding(user_id)
            await self.show_onboarding_complete(update, context, skipped=True)

        elif data.startswith("onboard_lang_"):
            lang = data.replace("onboard_lang_", "")
            await db_manager.update_onboarding_step(user_id, "profile", selected_language=lang)
            # Aussi mettre à jour les settings utilisateur
            await db_manager.update_user_settings(user_id, language=lang)
            await self.show_profile_step(update, context)

        elif data.startswith("onboard_profile_"):
            profile = data.replace("onboard_profile_", "")
            await db_manager.update_onboarding_step(user_id, "markets", investor_profile=profile)
            # Mettre à jour les settings selon le profil
            await self.apply_profile_settings(user_id, profile)
            await self.show_markets_step(update, context)

        elif data.startswith("onboard_market_"):
            await self.toggle_market(update, context)

        elif data == "onboard_markets_done":
            await db_manager.update_onboarding_step(user_id, "tutorial")
            await self.show_tutorial_step(update, context)

        elif data == "onboard_tutorial_start":
            await db_manager.update_onboarding_step(user_id, "completed", tutorial_completed=1)
            await db_manager.complete_onboarding(user_id)
            await self.show_quick_tutorial(update, context)

        elif data == "onboard_tutorial_skip":
            await db_manager.complete_onboarding(user_id)
            await self.show_onboarding_complete(update, context, skipped=False)

        elif data == "onboard_complete":
            await self.show_onboarding_complete(update, context, skipped=False)

    async def show_language_step(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Étape 1: Choix de la langue"""
        query = update.callback_query

        text = """🌍 <b>ÉTAPE 1/4 - LANGUE</b>

━━━━━━━━━━━━━━━━━━━━

Choisissez votre langue préférée :
Choose your preferred language:"""

        keyboard = [
            [InlineKeyboardButton("🇫🇷 Français", callback_data="onboard_lang_fr")],
            [InlineKeyboardButton("🇬🇧 English", callback_data="onboard_lang_en")],
            [InlineKeyboardButton("🇪🇸 Español", callback_data="onboard_lang_es")],
            [InlineKeyboardButton("🇩🇪 Deutsch", callback_data="onboard_lang_de")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_profile_step(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Étape 2: Profil investisseur"""
        query = update.callback_query

        text = """📊 <b>ÉTAPE 2/4 - PROFIL INVESTISSEUR</b>

━━━━━━━━━━━━━━━━━━━━

Quel type d'investisseur êtes-vous ?

<b>🐢 Conservateur</b>
Privilégie la sécurité. Opportunités rares mais sûres.
Score minimum: 80+

<b>⚖️ Modéré</b> (Recommandé)
Équilibre risque/rendement. Bon compromis.
Score minimum: 70+

<b>🔥 Agressif</b>
Privilégie les opportunités. Plus de risque.
Score minimum: 60+

<b>⚡ Très Agressif</b>
Maximum d'opportunités. Trading intensif.
Score minimum: 50+"""

        keyboard = [
            [InlineKeyboardButton("🐢 Conservateur", callback_data="onboard_profile_conservative")],
            [InlineKeyboardButton("⚖️ Modéré (Recommandé)", callback_data="onboard_profile_moderate")],
            [InlineKeyboardButton("🔥 Agressif", callback_data="onboard_profile_aggressive")],
            [InlineKeyboardButton("⚡ Très Agressif", callback_data="onboard_profile_very_aggressive")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_markets_step(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Étape 3: Marchés préférés"""
        query = update.callback_query
        user_id = query.from_user.id

        onboarding = await db_manager.get_user_onboarding(user_id)
        selected = onboarding.get('selected_markets', []) if onboarding else []

        text = """💹 <b>ÉTAPE 3/4 - MARCHÉS</b>

━━━━━━━━━━━━━━━━━━━━

Quels marchés vous intéressent ?
(Cliquez pour sélectionner/désélectionner)

Vous pourrez modifier ces choix plus tard dans les paramètres."""

        markets = [
            ("usa", "🇺🇸 Actions US", "USA"),
            ("europe", "🇪🇺 Actions Europe", "EUROPE"),
            ("crypto", "🪙 Crypto", "CRYPTO"),
            ("commodities", "🛢️ Matières Premières", "COMMODITIES")
        ]

        keyboard = []
        for key, label, market_key in markets:
            marker = " ✅" if market_key in selected else ""
            keyboard.append([InlineKeyboardButton(f"{label}{marker}", callback_data=f"onboard_market_{market_key}")])

        keyboard.append([InlineKeyboardButton("✓ Continuer", callback_data="onboard_markets_done")])
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def toggle_market(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Active/désactive un marché"""
        query = update.callback_query
        user_id = query.from_user.id
        market = query.data.replace("onboard_market_", "")

        onboarding = await db_manager.get_user_onboarding(user_id)
        selected = onboarding.get('selected_markets', []) if onboarding else []

        if market in selected:
            selected.remove(market)
        else:
            selected.append(market)

        await db_manager.update_onboarding_step(user_id, "markets", selected_markets=selected)

        # Rafraîchir l'affichage
        await self.show_markets_step(update, context)

    async def show_tutorial_step(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Étape 4: Tutoriel"""
        query = update.callback_query

        text = """📚 <b>ÉTAPE 4/4 - TUTORIEL</b>

━━━━━━━━━━━━━━━━━━━━

Voulez-vous un rapide tour des fonctionnalités ?

Le tutoriel vous montrera :
• Comment lancer une analyse
• Comment créer des alertes
• Comment utiliser le paper trading
• Les principales commandes

⏱️ Durée estimée : 2 minutes"""

        keyboard = [
            [InlineKeyboardButton("📖 Voir le tutoriel", callback_data="onboard_tutorial_start")],
            [InlineKeyboardButton("⏭️ Passer le tutoriel", callback_data="onboard_tutorial_skip")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_quick_tutorial(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Affiche un tutoriel rapide"""
        query = update.callback_query

        text = """📖 <b>TUTORIEL RAPIDE</b>

━━━━━━━━━━━━━━━━━━━━

<b>1️⃣ MENU PRINCIPAL</b>
Tapez /menu pour accéder à toutes les fonctionnalités.

<b>2️⃣ ANALYSER UN ACTIF</b>
Menu → Marchés → Choisir un actif
Vous obtiendrez une analyse IA complète.

<b>3️⃣ CRÉER UNE ALERTE</b>
Menu → Outils → Alertes
Soyez notifié quand un prix atteint votre cible.

<b>4️⃣ PAPER TRADING</b>
Menu → Wallet → Ouvrir une position
Tradez avec 10 000$ virtuels sans risque !

<b>5️⃣ OPPORTUNITÉS</b>
Menu → Scan Auto
Le bot détecte les meilleures opportunités pour vous.

━━━━━━━━━━━━━━━━━━━━

💡 <b>Astuce :</b> Activez les notifications pour ne rien manquer !"""

        keyboard = [
            [InlineKeyboardButton("✅ J'ai compris !", callback_data="onboard_complete")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def show_onboarding_complete(self, update: Update, context: ContextTypes.DEFAULT_TYPE, skipped=False):
        """Message de fin d'onboarding"""
        query = update.callback_query
        user = query.from_user

        # Récupérer le code de parrainage de l'utilisateur
        sub = await db_manager.get_user_subscription(user.id)
        referral_code = sub.get('referral_code', '') if sub else ''

        if skipped:
            intro = "Configuration par défaut appliquée."
        else:
            intro = "Votre profil est configuré !"

        text = f"""🎉 <b>CONFIGURATION TERMINÉE !</b>

━━━━━━━━━━━━━━━━━━━━

{intro}

<b>Vous êtes prêt à utiliser TDB Trading Bot !</b>

━━━━━━━━━━━━━━━━━━━━

📊 <b>Votre compte :</b>
💰 Solde virtuel : 10 000$
📈 Abonnement : Gratuit

━━━━━━━━━━━━━━━━━━━━

🔗 <b>Votre code de parrainage :</b>
<code>{referral_code}</code>

Partagez ce lien pour inviter vos amis :
https://t.me/{await self.get_bot_username()}?start=ref_{referral_code}"""

        keyboard = [
            [InlineKeyboardButton("📊 Aller au Menu", callback_data="menu_main")],
            [InlineKeyboardButton("⚙️ Paramètres", callback_data="settings_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def apply_profile_settings(self, user_id, profile):
        """Applique les paramètres selon le profil choisi"""
        profiles_settings = {
            "conservative": {
                "ai_aggressiveness": "Conservateur",
                "risk_per_position": 1,
                "max_leverage": 1,
                "score_min": 80
            },
            "moderate": {
                "ai_aggressiveness": "Modéré",
                "risk_per_position": 2,
                "max_leverage": 5,
                "score_min": 70
            },
            "aggressive": {
                "ai_aggressiveness": "Agressif",
                "risk_per_position": 5,
                "max_leverage": 10,
                "score_min": 60
            },
            "very_aggressive": {
                "ai_aggressiveness": "Très Agressif",
                "risk_per_position": 10,
                "max_leverage": 20,
                "score_min": 50
            }
        }

        settings = profiles_settings.get(profile, profiles_settings["moderate"])
        await db_manager.update_user_settings(user_id, **settings)


def create_welcome_module(application):
    """Factory function pour créer le module"""
    return WelcomeModule(application)
