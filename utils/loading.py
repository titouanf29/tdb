"""
Utilitaires pour les messages de chargement animés
"""
import asyncio
import logging

logger = logging.getLogger(__name__)


class LoadingAnimation:
    """Gère les animations de chargement dans les messages Telegram"""

    ANIMATIONS = {
        "dots": ["⏳", "⏳.", "⏳..", "⏳..."],
        "spinner": ["◐", "◓", "◑", "◒"],
        "bars": ["▱▱▱▱▱", "▰▱▱▱▱", "▰▰▱▱▱", "▰▰▰▱▱", "▰▰▰▰▱", "▰▰▰▰▰"],
        "progress": ["░░░░░░░░░░", "█░░░░░░░░░", "██░░░░░░░░", "███░░░░░░░", "████░░░░░░",
                    "█████░░░░░", "██████░░░░", "███████░░░", "████████░░", "█████████░", "██████████"],
        "rocket": ["🚀", "🚀💨", "🚀💨💨", "🚀💨💨💨"],
        "chart": ["📊", "📈", "📉", "📊"],
        "search": ["🔍", "🔎", "🔍", "🔎"],
        "brain": ["🧠", "🧠💭", "🧠💭💡", "🧠💡"],
    }

    MESSAGES = {
        "analysis": {
            "title": "📊 Analyse en cours",
            "steps": [
                "Récupération des données...",
                "Calcul des indicateurs techniques...",
                "Analyse des tendances...",
                "Génération du rapport IA...",
                "Finalisation..."
            ],
            "animation": "brain"
        },
        "market": {
            "title": "📈 Chargement du marché",
            "steps": [
                "Connexion aux serveurs...",
                "Récupération des cotations...",
                "Calcul des variations...",
                "Mise en forme..."
            ],
            "animation": "chart"
        },
        "search": {
            "title": "🔍 Recherche",
            "steps": [
                "Recherche dans la base...",
                "Filtrage des résultats...",
                "Tri par pertinence..."
            ],
            "animation": "search"
        },
        "portfolio": {
            "title": "💼 Portfolio",
            "steps": [
                "Chargement des positions...",
                "Calcul des P&L...",
                "Mise à jour des prix...",
                "Génération du résumé..."
            ],
            "animation": "progress"
        },
        "alert": {
            "title": "🔔 Alertes",
            "steps": [
                "Vérification des alertes...",
                "Analyse des conditions...",
                "Mise à jour du statut..."
            ],
            "animation": "spinner"
        },
        "default": {
            "title": "⏳ Chargement",
            "steps": ["Traitement en cours..."],
            "animation": "dots"
        }
    }

    def __init__(self, query, loading_type: str = "default"):
        self.query = query
        self.config = self.MESSAGES.get(loading_type, self.MESSAGES["default"])
        self.animation_frames = self.ANIMATIONS[self.config["animation"]]
        self.current_step = 0
        self.frame_index = 0
        self.is_running = False
        self.task = None

    def _build_message(self) -> str:
        """Construit le message de chargement actuel"""
        title = self.config["title"]
        steps = self.config["steps"]
        current_step_text = steps[min(self.current_step, len(steps) - 1)]
        anim = self.animation_frames[self.frame_index % len(self.animation_frames)]

        # Construire la barre de progression si plusieurs étapes
        if len(steps) > 1:
            progress = "▰" * (self.current_step + 1) + "▱" * (len(steps) - self.current_step - 1)
            return f"""<b>{title}</b>

{anim} {current_step_text}

<code>[{progress}]</code> {self.current_step + 1}/{len(steps)}"""
        else:
            return f"""<b>{title}</b>

{anim} {current_step_text}"""

    async def start(self):
        """Démarre l'animation"""
        self.is_running = True
        try:
            await self.query.edit_message_text(
                self._build_message(),
                parse_mode='HTML'
            )
        except Exception as e:
            logger.debug(f"Erreur démarrage animation: {e}")

    async def next_step(self):
        """Passe à l'étape suivante"""
        self.current_step += 1
        self.frame_index += 1
        try:
            await self.query.edit_message_text(
                self._build_message(),
                parse_mode='HTML'
            )
        except Exception as e:
            logger.debug(f"Erreur mise à jour animation: {e}")

    async def update_frame(self):
        """Met à jour le frame d'animation"""
        self.frame_index += 1
        try:
            await self.query.edit_message_text(
                self._build_message(),
                parse_mode='HTML'
            )
        except Exception as e:
            logger.debug(f"Erreur frame animation: {e}")

    def stop(self):
        """Arrête l'animation"""
        self.is_running = False
        if self.task:
            self.task.cancel()


async def show_loading(query, loading_type: str = "default", message: str = None):
    """
    Affiche un message de chargement simple

    Args:
        query: CallbackQuery Telegram
        loading_type: Type de chargement (analysis, market, search, portfolio, alert, default)
        message: Message personnalisé optionnel
    """
    config = LoadingAnimation.MESSAGES.get(loading_type, LoadingAnimation.MESSAGES["default"])
    animation = LoadingAnimation.ANIMATIONS[config["animation"]]

    if message:
        text = f"""<b>{config["title"]}</b>

{animation[0]} {message}"""
    else:
        text = f"""<b>{config["title"]}</b>

{animation[0]} {config["steps"][0]}"""

    try:
        await query.edit_message_text(text, parse_mode='HTML')
    except Exception as e:
        logger.debug(f"Erreur loading: {e}")


async def show_loading_message(message, loading_type: str = "default", custom_text: str = None):
    """
    Envoie un nouveau message de chargement (pour les commandes)

    Args:
        message: Message Telegram original
        loading_type: Type de chargement
        custom_text: Texte personnalisé

    Returns:
        Le message envoyé (pour pouvoir l'éditer ensuite)
    """
    config = LoadingAnimation.MESSAGES.get(loading_type, LoadingAnimation.MESSAGES["default"])
    animation = LoadingAnimation.ANIMATIONS[config["animation"]]

    if custom_text:
        text = f"""<b>{config["title"]}</b>

{animation[0]} {custom_text}"""
    else:
        text = f"""<b>{config["title"]}</b>

{animation[0]} {config["steps"][0]}"""

    return await message.reply_text(text, parse_mode='HTML')


class ProgressiveLoader:
    """
    Loader progressif avec étapes automatiques
    Utilisation:
        async with ProgressiveLoader(query, "analysis") as loader:
            await loader.step("Étape 1...")
            # faire quelque chose
            await loader.step("Étape 2...")
            # faire autre chose
    """

    def __init__(self, query, loading_type: str = "default"):
        self.query = query
        self.loading_type = loading_type
        self.animation = LoadingAnimation(query, loading_type)
        self.custom_steps = []

    async def __aenter__(self):
        await self.animation.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.animation.stop()
        return False

    async def step(self, message: str = None):
        """Passe à l'étape suivante avec un message optionnel"""
        if message:
            self.animation.config["steps"].append(message)
        await self.animation.next_step()
        # Petit délai pour l'effet visuel
        await asyncio.sleep(0.3)


# Messages de chargement prédéfinis avec emojis contextuels
LOADING_TEMPLATES = {
    "analyze_stock": "🔬 Analyse de {symbol} en cours...",
    "fetch_market": "📡 Récupération des données {market}...",
    "calculate_indicators": "📐 Calcul des indicateurs techniques...",
    "generate_ai": "🤖 Génération de l'analyse IA...",
    "load_portfolio": "💼 Chargement de votre portfolio...",
    "check_alerts": "🔔 Vérification de vos alertes...",
    "search_assets": "🔍 Recherche de '{query}'...",
    "load_history": "📜 Chargement de l'historique...",
    "calculate_pnl": "💰 Calcul des gains/pertes...",
    "fetch_news": "📰 Récupération des actualités...",
}


def get_loading_text(template_key: str, **kwargs) -> str:
    """
    Récupère un texte de chargement formaté

    Args:
        template_key: Clé du template
        **kwargs: Variables à insérer dans le template

    Returns:
        Texte formaté
    """
    template = LOADING_TEMPLATES.get(template_key, "⏳ Chargement...")
    try:
        return template.format(**kwargs)
    except KeyError:
        return template
