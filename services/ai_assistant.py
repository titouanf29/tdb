"""
Service d'Assistant IA avec Groq
Permet aux utilisateurs de poser des questions sur le trading
"""
from groq import Groq
import config
from datetime import datetime
import json

class AIAssistantService:
    """Assistant IA conversationnel pour le trading"""

    def __init__(self):
        """Initialise le service avec l'API Groq"""
        if not config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY n'est pas configuré dans .env")

        # Initialiser le client Groq
        self.client = Groq(api_key=config.GROQ_API_KEY)

        # Modèle à utiliser (llama3-70b-8192 est rapide et performant)
        self.model = "llama3-70b-8192"

        # Prompt système pour contextualiser l'assistant
        self.system_prompt = """Tu es un assistant IA spécialisé en trading et finance.
Tu aides les utilisateurs à comprendre les concepts de trading, les indicateurs techniques,
et les stratégies d'investissement.

Règles importantes:
- Réponds TOUJOURS en français
- Sois clair et pédagogique
- Explique les termes techniques si nécessaire
- Ne donne JAMAIS de conseils financiers personnalisés ("achète X", "vends Y")
- Utilise des emojis pertinents pour rendre les réponses plus visuelles
- Sois concis mais informatif (200-400 mots max)
- Si on te demande d'analyser un actif, utilise le contexte fourni

AVERTISSEMENT À TOUJOURS RAPPELER:
"⚠️ Ceci n'est pas un conseil financier. Fais toujours tes propres recherches (DYOR)."

Exemples de bonnes réponses:
Q: "C'est quoi un RSI ?"
R: "📊 Le RSI (Relative Strength Index) est un indicateur de momentum qui mesure..."

Q: "Comment trader en marché baissier ?"
R: "📉 En marché baissier, plusieurs stratégies sont possibles:
1. Short selling (vente à découvert)
2. Position en cash (attendre)
3. Investissement sur indices inverses...
⚠️ Ceci n'est pas un conseil financier."
"""

    async def chat(self, user_message: str, conversation_history: list = None, asset_context: dict = None):
        """
        Envoie un message à l'assistant IA

        Args:
            user_message: Message de l'utilisateur
            conversation_history: Historique des messages précédents
            asset_context: Contexte optionnel sur un actif (analyse, news, etc.)

        Returns:
            dict avec la réponse et les métadonnées
        """
        try:
            # Construire les messages pour Groq
            messages = self._build_messages(user_message, conversation_history, asset_context)

            # Générer la réponse avec Groq
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.7,
                max_tokens=1024,
                top_p=0.95,
            )

            response_text = chat_completion.choices[0].message.content

            if not response_text:
                return {
                    'success': False,
                    'error': 'Pas de réponse générée',
                    'response': None
                }

            # Calculer les tokens utilisés
            tokens_used = chat_completion.usage.total_tokens if hasattr(chat_completion, 'usage') else 0

            return {
                'success': True,
                'response': response_text.strip(),
                'timestamp': datetime.now().isoformat(),
                'tokens_used': tokens_used
            }

        except Exception as e:
            print(f"[AI_ASSISTANT] Erreur: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': None
            }

    def _build_messages(self, user_message: str, conversation_history: list = None, asset_context: dict = None):
        """Construit les messages pour l'API Groq"""
        messages = [
            {"role": "system", "content": self.system_prompt}
        ]

        # Ajouter l'historique de conversation
        if conversation_history:
            for msg in conversation_history[-5:]:  # Garder seulement les 5 derniers messages
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                messages.append({"role": role, "content": content})

        # Construire le message utilisateur avec contexte actif si disponible
        user_content = user_message

        if asset_context:
            context_info = f"\n\n[CONTEXTE ACTIF]\n"
            context_info += f"Actif: {asset_context.get('symbol', 'N/A')}\n"
            context_info += f"Prix: {asset_context.get('price', 'N/A')}\n"
            context_info += f"Score d'analyse: {asset_context.get('score', 'N/A')}/100\n"
            context_info += f"Direction: {asset_context.get('direction', 'N/A')}\n"
            context_info += f"RSI: {asset_context.get('rsi', 'N/A')}\n"
            if asset_context.get('news_summary'):
                context_info += f"Actualités: {asset_context.get('news_summary')}\n"

            user_content = context_info + "\n" + user_message

        messages.append({"role": "user", "content": user_content})

        return messages

    def _estimate_tokens(self, text: str) -> int:
        """Estime le nombre de tokens (approximatif)"""
        # Approximation: ~4 caractères = 1 token en français
        return len(text) // 4

    async def get_asset_context(self, symbol: str):
        """
        Récupère le contexte d'un actif pour enrichir la conversation

        Args:
            symbol: Symbole de l'actif

        Returns:
            dict avec les informations de l'actif
        """
        try:
            from ai.analyzer import analyzer
            from utils.helpers import detect_market

            # Détecter le marché
            market = detect_market(symbol)
            if not market:
                return None

            # Analyser l'actif avec news
            analysis = await analyzer.analyze_asset(symbol, market, fetch_news=True)

            if not analysis:
                return None

            return {
                'symbol': symbol,
                'price': analysis.get('current_price'),
                'score': analysis.get('score'),
                'direction': analysis.get('direction'),
                'rsi': analysis.get('rsi'),
                'trend': analysis.get('trend'),
                'news_summary': analysis.get('news_summary'),
                'technical_summary': analysis.get('technical_summary')
            }

        except Exception as e:
            print(f"[AI_ASSISTANT] Erreur get_asset_context: {e}")
            return None

# Instance globale
ai_assistant_service = AIAssistantService()
