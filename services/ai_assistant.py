"""
Service d'Assistant IA avec Google Gemini
Permet aux utilisateurs de poser des questions sur le trading
"""
import google.generativeai as genai
import config
from datetime import datetime
import json

class AIAssistantService:
    """Assistant IA conversationnel pour le trading"""

    def __init__(self):
        """Initialise le service avec l'API Gemini"""
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY n'est pas configuré dans .env")

        genai.configure(api_key=config.GEMINI_API_KEY)

        # Configuration du modèle Gemini
        self.model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            generation_config={
                'temperature': 0.7,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': 1024,
            }
        )

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
            # Construire le contexte complet
            full_prompt = self._build_prompt(user_message, conversation_history, asset_context)

            # Générer la réponse
            response = self.model.generate_content(full_prompt)

            if not response or not response.text:
                return {
                    'success': False,
                    'error': 'Pas de réponse générée',
                    'response': None
                }

            return {
                'success': True,
                'response': response.text.strip(),
                'timestamp': datetime.now().isoformat(),
                'tokens_used': self._estimate_tokens(full_prompt + response.text)
            }

        except Exception as e:
            print(f"[AI_ASSISTANT] Erreur: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': None
            }

    def _build_prompt(self, user_message: str, conversation_history: list = None, asset_context: dict = None):
        """Construit le prompt complet avec contexte"""
        prompt_parts = [self.system_prompt]

        # Ajouter l'historique de conversation
        if conversation_history:
            prompt_parts.append("\n--- HISTORIQUE DE CONVERSATION ---")
            for msg in conversation_history[-5:]:  # Garder seulement les 5 derniers messages
                role = "Utilisateur" if msg.get('role') == 'user' else "Assistant"
                prompt_parts.append(f"{role}: {msg.get('content', '')}")

        # Ajouter le contexte d'actif si disponible
        if asset_context:
            prompt_parts.append("\n--- CONTEXTE ACTIF ---")
            prompt_parts.append(f"Actif: {asset_context.get('symbol', 'N/A')}")
            prompt_parts.append(f"Prix: {asset_context.get('price', 'N/A')}")
            prompt_parts.append(f"Score d'analyse: {asset_context.get('score', 'N/A')}/100")
            prompt_parts.append(f"Direction: {asset_context.get('direction', 'N/A')}")
            prompt_parts.append(f"RSI: {asset_context.get('rsi', 'N/A')}")
            if asset_context.get('news_summary'):
                prompt_parts.append(f"Actualités: {asset_context.get('news_summary')}")

        # Ajouter le message actuel de l'utilisateur
        prompt_parts.append(f"\n--- MESSAGE ACTUEL ---")
        prompt_parts.append(f"Utilisateur: {user_message}")
        prompt_parts.append("\nAssistant:")

        return "\n".join(prompt_parts)

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
