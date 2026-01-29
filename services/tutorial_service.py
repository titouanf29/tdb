"""
Service Tutoriel - Mode demo interactif et guide utilisateur
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from typing import Dict, List, Optional


class TutorialService:
    """Service de tutoriel interactif"""

    def __init__(self):
        # Etapes du tutoriel
        self.steps = [
            {
                'id': 'welcome',
                'title': '👋 Bienvenue!',
                'content': """
Bienvenue dans **TDB Trading Bot**!

Je suis votre assistant de trading personnel. Je vais vous guider à travers les principales fonctionnalités.

🎯 Ce tutoriel dure environ 2 minutes.
""",
                'buttons': [
                    ('Commencer ▶️', 'tuto_step_market')
                ]
            },
            {
                'id': 'market',
                'title': '📊 Marché',
                'content': """
**📊 MARCHÉ**

Accédez aux données de marché en temps réel:

• **Actions**: Apple, Tesla, Microsoft...
• **Crypto**: Bitcoin, Ethereum...
• **Indices**: S&P 500, Nasdaq...

💡 Cliquez sur un actif pour voir:
- Prix en temps réel
- Graphiques interactifs
- Analyse technique
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_welcome'),
                    ('Suivant ▶️', 'tuto_step_wallet')
                ]
            },
            {
                'id': 'wallet',
                'title': '💼 Wallet',
                'content': """
**💼 PAPER TRADING**

Entraînez-vous sans risque avec de l'argent virtuel!

• 💰 **$10,000** de capital initial
• 📈 Achetez et vendez comme en réel
• 📊 Suivez votre performance
• 🏆 Comparez-vous aux autres traders

💡 Parfait pour tester vos stratégies!
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_market'),
                    ('Suivant ▶️', 'tuto_step_alerts')
                ]
            },
            {
                'id': 'alerts',
                'title': '🔔 Alertes',
                'content': """
**🔔 SYSTÈME D'ALERTES**

Ne ratez plus aucune opportunité!

• 🎯 **Alertes de prix**: Notification quand un prix atteint votre cible
• 📈 **Alertes de volatilité**: Mouvements importants
• 🛑 **Stop Loss / Take Profit**: Ordres automatiques
• 👁️ **Watchlist**: Suivez vos actifs préférés

💡 Les notifications arrivent directement ici!
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_wallet'),
                    ('Suivant ▶️', 'tuto_step_ai')
                ]
            },
            {
                'id': 'ai',
                'title': '🤖 Assistant IA',
                'content': """
**🤖 ASSISTANT IA**

Votre analyste personnel disponible 24/7!

Posez n'importe quelle question:
• "Que penses-tu de Apple?"
• "Analyse technique de Bitcoin"
• "Dois-je acheter Tesla maintenant?"
• "Explique-moi le RSI"

💡 L'IA analyse le marché et vous donne son avis personnalisé!
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_alerts'),
                    ('Suivant ▶️', 'tuto_step_social')
                ]
            },
            {
                'id': 'social',
                'title': '🏆 Social',
                'content': """
**🏆 FONCTIONNALITÉS SOCIALES**

Tradez en communauté!

• 🏆 **Leaderboard**: Classement des meilleurs traders
• 🏅 **Badges**: Débloquez des achievements
• 📚 **Quiz**: Testez vos connaissances
• 🎯 **Challenges**: Défis hebdomadaires

💡 Gagnez des badges et montez dans le classement!
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_ai'),
                    ('Suivant ▶️', 'tuto_step_charts')
                ]
            },
            {
                'id': 'charts',
                'title': '📈 Graphiques',
                'content': """
**📈 GRAPHIQUES AVANCÉS**

Outils de visualisation professionnels:

• 📊 **Comparer**: Superposez plusieurs actifs
• 🗺️ **Heatmap**: Vue sectorielle du marché
• 😱 **Fear & Greed**: Sentiment du marché
• 🔗 **Corrélations**: Relations entre actifs

💡 Analysez le marché comme un pro!
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_social'),
                    ('Suivant ▶️', 'tuto_step_risk')
                ]
            },
            {
                'id': 'risk',
                'title': '📉 Gestion du Risque',
                'content': """
**📉 RISK MANAGEMENT**

Protégez votre capital!

• 📐 **Sharpe Ratio**: Performance ajustée au risque
• ⚠️ **VaR**: Value at Risk
• 📉 **Drawdown**: Perte maximale
• 📊 **Volatilité**: Mesure du risque

💡 Un bon trader gère d'abord son risque!
""",
                'buttons': [
                    ('◀️ Retour', 'tuto_step_charts'),
                    ('Terminer ✅', 'tuto_step_end')
                ]
            },
            {
                'id': 'end',
                'title': '🎉 Félicitations!',
                'content': """
**🎉 TUTORIEL TERMINÉ!**

Vous êtes prêt à utiliser TDB Trading Bot!

📌 **Rappels importants:**

1. Utilisez le **Menu** pour naviguer
2. L'**Assistant IA** répond à toutes vos questions
3. Configurez des **Alertes** pour ne rien rater
4. Le **Paper Trading** est sans risque réel

🚀 Bon trading!
""",
                'buttons': [
                    ('🔄 Recommencer', 'tuto_step_welcome'),
                    ('📊 Aller au Menu', 'menu_main')
                ]
            }
        ]

        # Mapping id -> step
        self._steps_map = {s['id']: s for s in self.steps}

    def get_step(self, step_id: str) -> Optional[Dict]:
        """Recupere une etape par son ID"""
        return self._steps_map.get(step_id)

    def render_step(self, step_id: str) -> tuple:
        """
        Rend une etape du tutoriel

        Returns:
            (text, reply_markup)
        """
        step = self.get_step(step_id)
        if not step:
            step = self.steps[0]

        text = f"{step['title']}\n"
        text += "━" * 20 + "\n"
        text += step['content']

        # Creer les boutons
        keyboard = []
        row = []
        for btn_text, btn_callback in step['buttons']:
            row.append(InlineKeyboardButton(btn_text, callback_data=btn_callback))
            if len(row) == 2:
                keyboard.append(row)
                row = []
        if row:
            keyboard.append(row)

        return text, InlineKeyboardMarkup(keyboard)

    async def start_tutorial(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Demarre le tutoriel"""
        text, markup = self.render_step('welcome')

        if update.message:
            await update.message.reply_text(text, reply_markup=markup, parse_mode='Markdown')
        elif update.callback_query:
            await update.callback_query.edit_message_text(
                text, reply_markup=markup, parse_mode='Markdown'
            )

    async def handle_tutorial_callback(self, update: Update,
                                        context: ContextTypes.DEFAULT_TYPE, data: str):
        """Gere les callbacks du tutoriel"""
        # Extraire l'ID de l'etape
        step_id = data.replace('tuto_step_', '')

        text, markup = self.render_step(step_id)

        await update.callback_query.edit_message_text(
            text, reply_markup=markup, parse_mode='Markdown'
        )

    def get_quick_tips(self) -> List[str]:
        """Retourne des conseils rapides aleatoires"""
        tips = [
            "💡 Utilisez l'Assistant IA pour analyser n'importe quel actif!",
            "💡 Configurez des alertes pour ne jamais rater une opportunité.",
            "💡 Le paper trading vous permet de vous entraîner sans risque.",
            "💡 Consultez le Fear & Greed Index avant de trader.",
            "💡 Diversifiez votre portefeuille pour réduire le risque.",
            "💡 Utilisez des Stop Loss pour protéger votre capital.",
            "💡 Participez aux challenges hebdomadaires pour gagner des badges!",
            "💡 Le Sharpe Ratio mesure votre performance ajustée au risque.",
            "💡 La corrélation entre actifs aide à diversifier intelligemment.",
            "💡 Consultez les news financières dans le menu Graphiques.",
        ]
        import random
        return random.sample(tips, min(3, len(tips)))


# Instance globale
tutorial_service = TutorialService()
