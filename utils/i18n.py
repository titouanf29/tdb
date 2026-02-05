"""
Système de gestion multi-langue (i18n) pour TDB Bot
Supporte: Français (fr), English (en), Español (es), Deutsch (de)
"""
import logging
from typing import Dict, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Langues supportées
SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de']
DEFAULT_LANGUAGE = 'fr'

# Dictionnaire des traductions
TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # ===== MENU PRINCIPAL =====
    'menu.title': {
        'fr': '🏠 **MENU PRINCIPAL**',
        'en': '🏠 **MAIN MENU**',
        'es': '🏠 **MENÚ PRINCIPAL**',
        'de': '🏠 **HAUPTMENÜ**'
    },
    'menu.welcome': {
        'fr': 'Bienvenue sur TDB Trading Bot !',
        'en': 'Welcome to TDB Trading Bot!',
        'es': '¡Bienvenido a TDB Trading Bot!',
        'de': 'Willkommen bei TDB Trading Bot!'
    },
    'menu.markets': {
        'fr': '📊 Marchés',
        'en': '📊 Markets',
        'es': '📊 Mercados',
        'de': '📊 Märkte'
    },
    'menu.wallet': {
        'fr': '💰 Mon Portefeuille',
        'en': '💰 My Wallet',
        'es': '💰 Mi Cartera',
        'de': '💰 Mein Portfolio'
    },
    'menu.favorites': {
        'fr': '⭐ Favoris',
        'en': '⭐ Favorites',
        'es': '⭐ Favoritos',
        'de': '⭐ Favoriten'
    },
    'menu.settings': {
        'fr': '⚙️ Paramètres',
        'en': '⚙️ Settings',
        'es': '⚙️ Configuración',
        'de': '⚙️ Einstellungen'
    },
    'menu.ai_assistant': {
        'fr': '🤖 Assistant IA',
        'en': '🤖 AI Assistant',
        'es': '🤖 Asistente IA',
        'de': '🤖 KI-Assistent'
    },
    'menu.alerts': {
        'fr': '🔔 Alertes',
        'en': '🔔 Alerts',
        'es': '🔔 Alertas',
        'de': '🔔 Benachrichtigungen'
    },
    'menu.leaderboard': {
        'fr': '🏆 Classement',
        'en': '🏆 Leaderboard',
        'es': '🏆 Clasificación',
        'de': '🏆 Rangliste'
    },
    'menu.help': {
        'fr': '❓ Aide',
        'en': '❓ Help',
        'es': '❓ Ayuda',
        'de': '❓ Hilfe'
    },

    # ===== WALLET =====
    'wallet.title': {
        'fr': '💰 **MON PORTEFEUILLE**',
        'en': '💰 **MY WALLET**',
        'es': '💰 **MI CARTERA**',
        'de': '💰 **MEIN PORTFOLIO**'
    },
    'wallet.balance': {
        'fr': 'Solde disponible',
        'en': 'Available balance',
        'es': 'Saldo disponible',
        'de': 'Verfügbares Guthaben'
    },
    'wallet.total_pnl': {
        'fr': 'PnL Total',
        'en': 'Total PnL',
        'es': 'PnL Total',
        'de': 'Gesamt PnL'
    },
    'wallet.open_positions': {
        'fr': 'Positions ouvertes',
        'en': 'Open positions',
        'es': 'Posiciones abiertas',
        'de': 'Offene Positionen'
    },
    'wallet.no_positions': {
        'fr': 'Aucune position ouverte',
        'en': 'No open positions',
        'es': 'Sin posiciones abiertas',
        'de': 'Keine offenen Positionen'
    },
    'wallet.new_position': {
        'fr': '📈 Nouvelle Position',
        'en': '📈 New Position',
        'es': '📈 Nueva Posición',
        'de': '📈 Neue Position'
    },
    'wallet.history': {
        'fr': '📜 Historique',
        'en': '📜 History',
        'es': '📜 Historial',
        'de': '📜 Verlauf'
    },
    'wallet.reset': {
        'fr': '🔄 Réinitialiser',
        'en': '🔄 Reset',
        'es': '🔄 Reiniciar',
        'de': '🔄 Zurücksetzen'
    },

    # ===== TRADING =====
    'trading.buy': {
        'fr': '📈 Acheter (LONG)',
        'en': '📈 Buy (LONG)',
        'es': '📈 Comprar (LONG)',
        'de': '📈 Kaufen (LONG)'
    },
    'trading.sell': {
        'fr': '📉 Vendre (SHORT)',
        'en': '📉 Sell (SHORT)',
        'es': '📉 Vender (SHORT)',
        'de': '📉 Verkaufen (SHORT)'
    },
    'trading.close_position': {
        'fr': 'Fermer la position',
        'en': 'Close position',
        'es': 'Cerrar posición',
        'de': 'Position schließen'
    },
    'trading.entry_price': {
        'fr': "Prix d'entrée",
        'en': 'Entry price',
        'es': 'Precio de entrada',
        'de': 'Einstiegspreis'
    },
    'trading.current_price': {
        'fr': 'Prix actuel',
        'en': 'Current price',
        'es': 'Precio actual',
        'de': 'Aktueller Preis'
    },
    'trading.leverage': {
        'fr': 'Effet de levier',
        'en': 'Leverage',
        'es': 'Apalancamiento',
        'de': 'Hebel'
    },
    'trading.stop_loss': {
        'fr': 'Stop Loss',
        'en': 'Stop Loss',
        'es': 'Stop Loss',
        'de': 'Stop Loss'
    },
    'trading.take_profit': {
        'fr': 'Take Profit',
        'en': 'Take Profit',
        'es': 'Take Profit',
        'de': 'Take Profit'
    },
    'trading.position_opened': {
        'fr': '✅ Position ouverte avec succès !',
        'en': '✅ Position opened successfully!',
        'es': '✅ ¡Posición abierta con éxito!',
        'de': '✅ Position erfolgreich eröffnet!'
    },
    'trading.position_closed': {
        'fr': '✅ Position fermée',
        'en': '✅ Position closed',
        'es': '✅ Posición cerrada',
        'de': '✅ Position geschlossen'
    },

    # ===== ANALYSIS =====
    'analysis.title': {
        'fr': '📊 **ANALYSE**',
        'en': '📊 **ANALYSIS**',
        'es': '📊 **ANÁLISIS**',
        'de': '📊 **ANALYSE**'
    },
    'analysis.score': {
        'fr': 'Score',
        'en': 'Score',
        'es': 'Puntuación',
        'de': 'Punktzahl'
    },
    'analysis.trend': {
        'fr': 'Tendance',
        'en': 'Trend',
        'es': 'Tendencia',
        'de': 'Trend'
    },
    'analysis.bullish': {
        'fr': '🟢 Haussier',
        'en': '🟢 Bullish',
        'es': '🟢 Alcista',
        'de': '🟢 Bullisch'
    },
    'analysis.bearish': {
        'fr': '🔴 Baissier',
        'en': '🔴 Bearish',
        'es': '🔴 Bajista',
        'de': '🔴 Bärisch'
    },
    'analysis.neutral': {
        'fr': '⚪ Neutre',
        'en': '⚪ Neutral',
        'es': '⚪ Neutral',
        'de': '⚪ Neutral'
    },
    'analysis.volatility': {
        'fr': 'Volatilité',
        'en': 'Volatility',
        'es': 'Volatilidad',
        'de': 'Volatilität'
    },
    'analysis.volume': {
        'fr': 'Volume',
        'en': 'Volume',
        'es': 'Volumen',
        'de': 'Volumen'
    },
    'analysis.risk_level': {
        'fr': 'Niveau de risque',
        'en': 'Risk level',
        'es': 'Nivel de riesgo',
        'de': 'Risikoniveau'
    },

    # ===== ALERTS =====
    'alerts.title': {
        'fr': '🔔 **MES ALERTES**',
        'en': '🔔 **MY ALERTS**',
        'es': '🔔 **MIS ALERTAS**',
        'de': '🔔 **MEINE BENACHRICHTIGUNGEN**'
    },
    'alerts.no_alerts': {
        'fr': 'Aucune alerte configurée',
        'en': 'No alerts configured',
        'es': 'No hay alertas configuradas',
        'de': 'Keine Benachrichtigungen konfiguriert'
    },
    'alerts.create': {
        'fr': '➕ Créer une alerte',
        'en': '➕ Create alert',
        'es': '➕ Crear alerta',
        'de': '➕ Benachrichtigung erstellen'
    },
    'alerts.price_above': {
        'fr': 'Prix au-dessus de',
        'en': 'Price above',
        'es': 'Precio por encima de',
        'de': 'Preis über'
    },
    'alerts.price_below': {
        'fr': 'Prix en-dessous de',
        'en': 'Price below',
        'es': 'Precio por debajo de',
        'de': 'Preis unter'
    },
    'alerts.triggered': {
        'fr': '🔔 Alerte déclenchée !',
        'en': '🔔 Alert triggered!',
        'es': '🔔 ¡Alerta activada!',
        'de': '🔔 Benachrichtigung ausgelöst!'
    },

    # ===== SETTINGS =====
    'settings.title': {
        'fr': '⚙️ **PARAMÈTRES**',
        'en': '⚙️ **SETTINGS**',
        'es': '⚙️ **CONFIGURACIÓN**',
        'de': '⚙️ **EINSTELLUNGEN**'
    },
    'settings.language': {
        'fr': '🌐 Langue',
        'en': '🌐 Language',
        'es': '🌐 Idioma',
        'de': '🌐 Sprache'
    },
    'settings.notifications': {
        'fr': '🔔 Notifications',
        'en': '🔔 Notifications',
        'es': '🔔 Notificaciones',
        'de': '🔔 Benachrichtigungen'
    },
    'settings.trading_style': {
        'fr': '📈 Style de trading',
        'en': '📈 Trading style',
        'es': '📈 Estilo de trading',
        'de': '📈 Handelsstil'
    },
    'settings.saved': {
        'fr': '✅ Paramètres sauvegardés',
        'en': '✅ Settings saved',
        'es': '✅ Configuración guardada',
        'de': '✅ Einstellungen gespeichert'
    },

    # ===== AI ASSISTANT =====
    'ai.title': {
        'fr': '🤖 **ASSISTANT IA TRADING**',
        'en': '🤖 **AI TRADING ASSISTANT**',
        'es': '🤖 **ASISTENTE IA TRADING**',
        'de': '🤖 **KI TRADING ASSISTENT**'
    },
    'ai.thinking': {
        'fr': '💭 Réflexion en cours...',
        'en': '💭 Thinking...',
        'es': '💭 Pensando...',
        'de': '💭 Nachdenken...'
    },
    'ai.limit_reached': {
        'fr': '⚠️ Limite journalière atteinte',
        'en': '⚠️ Daily limit reached',
        'es': '⚠️ Límite diario alcanzado',
        'de': '⚠️ Tageslimit erreicht'
    },
    'ai.stop_chat': {
        'fr': '❌ Arrêter le chat',
        'en': '❌ Stop chat',
        'es': '❌ Detener chat',
        'de': '❌ Chat beenden'
    },
    'ai.clear_history': {
        'fr': "🗑️ Effacer l'historique",
        'en': '🗑️ Clear history',
        'es': '🗑️ Borrar historial',
        'de': '🗑️ Verlauf löschen'
    },
    'ai.messages_remaining': {
        'fr': 'Messages restants',
        'en': 'Messages remaining',
        'es': 'Mensajes restantes',
        'de': 'Verbleibende Nachrichten'
    },

    # ===== COMMON =====
    'common.back': {
        'fr': '◀️ Retour',
        'en': '◀️ Back',
        'es': '◀️ Volver',
        'de': '◀️ Zurück'
    },
    'common.confirm': {
        'fr': '✅ Confirmer',
        'en': '✅ Confirm',
        'es': '✅ Confirmar',
        'de': '✅ Bestätigen'
    },
    'common.cancel': {
        'fr': '❌ Annuler',
        'en': '❌ Cancel',
        'es': '❌ Cancelar',
        'de': '❌ Abbrechen'
    },
    'common.yes': {
        'fr': 'Oui',
        'en': 'Yes',
        'es': 'Sí',
        'de': 'Ja'
    },
    'common.no': {
        'fr': 'Non',
        'en': 'No',
        'es': 'No',
        'de': 'Nein'
    },
    'common.error': {
        'fr': '❌ Une erreur est survenue',
        'en': '❌ An error occurred',
        'es': '❌ Ha ocurrido un error',
        'de': '❌ Ein Fehler ist aufgetreten'
    },
    'common.success': {
        'fr': '✅ Opération réussie',
        'en': '✅ Operation successful',
        'es': '✅ Operación exitosa',
        'de': '✅ Operation erfolgreich'
    },
    'common.loading': {
        'fr': '⏳ Chargement...',
        'en': '⏳ Loading...',
        'es': '⏳ Cargando...',
        'de': '⏳ Laden...'
    },
    'common.refresh': {
        'fr': '🔄 Actualiser',
        'en': '🔄 Refresh',
        'es': '🔄 Actualizar',
        'de': '🔄 Aktualisieren'
    },

    # ===== MARKETS =====
    'markets.usa': {
        'fr': '🇺🇸 États-Unis',
        'en': '🇺🇸 United States',
        'es': '🇺🇸 Estados Unidos',
        'de': '🇺🇸 Vereinigte Staaten'
    },
    'markets.europe': {
        'fr': '🇪🇺 Europe',
        'en': '🇪🇺 Europe',
        'es': '🇪🇺 Europa',
        'de': '🇪🇺 Europa'
    },
    'markets.asia': {
        'fr': '🌏 Asie',
        'en': '🌏 Asia',
        'es': '🌏 Asia',
        'de': '🌏 Asien'
    },
    'markets.crypto': {
        'fr': '₿ Crypto',
        'en': '₿ Crypto',
        'es': '₿ Cripto',
        'de': '₿ Krypto'
    },
    'markets.commodities': {
        'fr': '🛢️ Matières premières',
        'en': '🛢️ Commodities',
        'es': '🛢️ Materias primas',
        'de': '🛢️ Rohstoffe'
    },

    # ===== RISK LEVELS =====
    'risk.low': {
        'fr': '🟢 Faible',
        'en': '🟢 Low',
        'es': '🟢 Bajo',
        'de': '🟢 Niedrig'
    },
    'risk.medium': {
        'fr': '🟡 Moyen',
        'en': '🟡 Medium',
        'es': '🟡 Medio',
        'de': '🟡 Mittel'
    },
    'risk.high': {
        'fr': '🔴 Élevé',
        'en': '🔴 High',
        'es': '🔴 Alto',
        'de': '🔴 Hoch'
    },

    # ===== TIME =====
    'time.minutes': {
        'fr': 'minutes',
        'en': 'minutes',
        'es': 'minutos',
        'de': 'Minuten'
    },
    'time.hours': {
        'fr': 'heures',
        'en': 'hours',
        'es': 'horas',
        'de': 'Stunden'
    },
    'time.days': {
        'fr': 'jours',
        'en': 'days',
        'es': 'días',
        'de': 'Tage'
    },

    # ===== LEADERBOARD =====
    'leaderboard.title': {
        'fr': '🏆 **CLASSEMENT**',
        'en': '🏆 **LEADERBOARD**',
        'es': '🏆 **CLASIFICACIÓN**',
        'de': '🏆 **RANGLISTE**'
    },
    'leaderboard.your_rank': {
        'fr': 'Votre classement',
        'en': 'Your rank',
        'es': 'Tu clasificación',
        'de': 'Dein Rang'
    },
    'leaderboard.join': {
        'fr': '🎯 Participer',
        'en': '🎯 Join',
        'es': '🎯 Participar',
        'de': '🎯 Teilnehmen'
    },

    # ===== DISCLAIMER =====
    'disclaimer.trading': {
        'fr': '⚠️ Ceci est un outil éducatif, pas un conseil financier.',
        'en': '⚠️ This is an educational tool, not financial advice.',
        'es': '⚠️ Esta es una herramienta educativa, no asesoramiento financiero.',
        'de': '⚠️ Dies ist ein Bildungswerkzeug, keine Finanzberatung.'
    }
}


class I18n:
    """Gestionnaire de traductions"""

    def __init__(self, default_language: str = DEFAULT_LANGUAGE):
        self.default_language = default_language
        self._user_languages: Dict[int, str] = {}
        self._db_manager = None

    def set_db_manager(self, db_manager):
        """Configure le gestionnaire de base de données"""
        self._db_manager = db_manager

    def set_user_language(self, user_id: int, language: str) -> bool:
        """
        Définit la langue d'un utilisateur

        Args:
            user_id: ID Telegram de l'utilisateur
            language: Code de langue (fr, en, es, de)

        Returns:
            True si la langue est supportée
        """
        if language not in SUPPORTED_LANGUAGES:
            logger.warning(f"Langue non supportée: {language}")
            return False

        self._user_languages[user_id] = language
        return True

    def get_user_language(self, user_id: int) -> str:
        """
        Récupère la langue d'un utilisateur

        Args:
            user_id: ID Telegram

        Returns:
            Code de langue
        """
        # D'abord vérifier le cache mémoire
        if user_id in self._user_languages:
            return self._user_languages[user_id]

        # Sinon essayer de charger depuis la base de données de manière synchrone
        # Note: Pour une utilisation async, utilisez get_user_language_async
        return self.default_language

    async def get_user_language_async(self, user_id: int) -> str:
        """
        Récupère la langue d'un utilisateur de manière asynchrone

        Args:
            user_id: ID Telegram

        Returns:
            Code de langue
        """
        # D'abord vérifier le cache mémoire
        if user_id in self._user_languages:
            return self._user_languages[user_id]

        # Charger depuis la base de données
        if self._db_manager:
            try:
                settings = await self._db_manager.get_user_settings(user_id)
                if settings and settings.get('language'):
                    lang = settings['language']
                    if lang in SUPPORTED_LANGUAGES:
                        self._user_languages[user_id] = lang
                        return lang
            except Exception as e:
                logger.debug(f"Erreur chargement langue: {e}")

        return self.default_language

    def load_user_language(self, user_id: int, language: str):
        """Charge une langue depuis la base de données dans le cache"""
        if language in SUPPORTED_LANGUAGES:
            self._user_languages[user_id] = language

    @lru_cache(maxsize=1000)
    def _get_translation(self, key: str, language: str) -> str:
        """Récupère une traduction avec cache"""
        translations = TRANSLATIONS.get(key, {})

        if language in translations:
            return translations[language]

        # Fallback vers la langue par défaut
        if self.default_language in translations:
            return translations[self.default_language]

        # Retourner la clé si pas de traduction
        logger.debug(f"Traduction manquante: {key} ({language})")
        return key

    def t(self, key: str, user_id: int = None, language: str = None, **kwargs) -> str:
        """
        Traduit une clé

        Args:
            key: Clé de traduction (ex: 'menu.title')
            user_id: ID Telegram (pour récupérer la langue préférée)
            language: Code de langue (override)
            **kwargs: Variables pour le formatage

        Returns:
            Texte traduit
        """
        if language is None:
            language = self.get_user_language(user_id) if user_id else self.default_language

        text = self._get_translation(key, language)

        # Appliquer le formatage si nécessaire
        if kwargs:
            try:
                text = text.format(**kwargs)
            except KeyError as e:
                logger.error(f"Variable manquante dans traduction {key}: {e}")

        return text

    def get_language_name(self, code: str) -> str:
        """Retourne le nom de la langue"""
        names = {
            'fr': '🇫🇷 Français',
            'en': '🇬🇧 English',
            'es': '🇪🇸 Español',
            'de': '🇩🇪 Deutsch'
        }
        return names.get(code, code)

    def get_available_languages(self) -> list:
        """Retourne la liste des langues disponibles"""
        return [(code, self.get_language_name(code)) for code in SUPPORTED_LANGUAGES]


# Instance globale
i18n = I18n()


# Fonction raccourci
def t(key: str, user_id: int = None, language: str = None, **kwargs) -> str:
    """Raccourci pour traduire une clé"""
    return i18n.t(key, user_id, language, **kwargs)


def set_language(user_id: int, language: str) -> bool:
    """Raccourci pour définir la langue d'un utilisateur"""
    return i18n.set_user_language(user_id, language)


def get_language(user_id: int) -> str:
    """Raccourci pour récupérer la langue d'un utilisateur"""
    return i18n.get_user_language(user_id)


def load_language(user_id: int, language: str):
    """Charge une langue dans le cache"""
    i18n.load_user_language(user_id, language)


async def get_language_async(user_id: int) -> str:
    """Raccourci async pour récupérer la langue d'un utilisateur"""
    return await i18n.get_user_language_async(user_id)
