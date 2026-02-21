"""
Service d'Assistant IA avec Groq
Permet aux utilisateurs de poser des questions sur le trading
Avec rate limiting et gestion d'erreurs améliorée
"""
import logging
import asyncio
from groq import Groq
import config
from datetime import datetime
import json
from utils.rate_limiter import rate_limiter
from utils.error_handler import ErrorHandler, ErrorSeverity

logger = logging.getLogger(__name__)


class AIAssistantService:
    """Assistant IA conversationnel pour le trading"""

    def __init__(self):
        """Initialise le service avec l'API Groq"""
        if not config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY n'est pas configuré dans .env")

        # Initialiser le client Groq
        self.client = Groq(api_key=config.GROQ_API_KEY)

        # Modèle à utiliser (llama-3.3-70b-versatile est le successeur de llama3-70b-8192)
        self.model = "llama-3.3-70b-versatile"

        # Prompt système pour contextualiser l'assistant
        self.system_prompt = """Tu es un analyste financier professionnel specialise en trading.
Tu fournis des analyses completes et structurees sur les actifs financiers.

REGLES DE FORMATAGE:
- Reponds TOUJOURS en francais
- N'utilise JAMAIS ** ou markdown pour le gras
- Utilise des emojis pour structurer (📌 📍 📈 📉 🌍 💵 💡 ⚠️ 👉)
- Utilise des puces (•) pour les listes
- Utilise des fleches (→) pour les implications

STRUCTURE POUR UNE ANALYSE D'ACTIF:
Quand on te demande d'analyser un actif (action, crypto, or, forex...), utilise TOUJOURS cette structure:

📌 Analyse courte – [NOM] ([SYMBOLE])
📍 Prix actuel : [prix]

📈 Technique :
• RSI (14) ≈ [valeur] → [interpretation]
• [Tendance actuelle]
• Support cle : [niveau]
• Resistance : [niveau]

🌍 Geopolitique (si pertinent pour l'actif)
• [Facteurs geopolitiques impactant l'actif]
• [Tensions, conflits, relations internationales]
• [Politique des banques centrales]
👉 [Resume de l'impact]

💵 Macroeconomie
• [Politique monetaire Fed/BCE]
• [Tendance dollar/rendements]
• [Inflation/croissance]
👉 [Resume de l'impact]

📈 Perspectives
• Court terme : → [scenario]
• Moyen terme : → [scenario avec niveaux cles]
• Long terme : → [scenario si pertinent]

⚠️ Ceci n'est pas un conseil financier. DYOR.

POUR LES QUESTIONS GENERALES (concepts, indicateurs, strategies):
Reponds de maniere pedagogique et concise (150-250 mots).
Utilise des exemples concrets.
Termine par l'avertissement DYOR.

EXEMPLE QUESTION GENERALE:
Q: "C'est quoi un RSI ?"
R: 📊 Le RSI (Relative Strength Index)

Le RSI est un indicateur de momentum qui mesure la vitesse des mouvements de prix. Il oscille entre 0 et 100.

Comment l'interpreter:
• Au-dessus de 70 → surachat (possible correction)
• En-dessous de 30 → survente (possible rebond)
• Autour de 50 → zone neutre

💡 Le RSI est plus fiable combine avec d'autres indicateurs.

⚠️ Ceci n'est pas un conseil financier. DYOR.
"""

    async def chat(self, user_message: str, conversation_history: list = None, asset_context: dict = None):
        """
        Envoie un message à l'assistant IA avec rate limiting

        Args:
            user_message: Message de l'utilisateur
            conversation_history: Historique des messages précédents
            asset_context: Contexte optionnel sur un actif (analyse, news, etc.)

        Returns:
            dict avec la réponse et les métadonnées
        """
        # Vérifier le rate limit avant l'appel
        if not await rate_limiter.acquire("groq", timeout=30.0):
            ErrorHandler.log_error(
                Exception("Rate limit Groq atteint"),
                "ai_assistant.chat",
                ErrorSeverity.MEDIUM
            )
            return {
                'success': False,
                'error': 'Assistant IA temporairement surchargé. Réessayez dans quelques instants.',
                'response': None
            }

        try:
            # Construire les messages pour Groq
            logger.debug("Construction messages pour Groq...")
            messages = self._build_messages(user_message, conversation_history, asset_context)
            logger.debug(f"Messages construits: {len(messages)} messages")

            # Générer la réponse avec Groq (dans un executor pour ne pas bloquer)
            logger.debug(f"Appel API Groq avec modele {self.model}...")

            loop = asyncio.get_event_loop()
            chat_completion = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self.client.chat.completions.create(
                        messages=messages,
                        model=self.model,
                        temperature=0.7,
                        max_tokens=2048,
                        top_p=0.95,
                    )
                ),
                timeout=30.0  # Timeout de 30 secondes
            )

            rate_limiter.record_success("groq")
            logger.debug("Reponse Groq recue")

            response_text = chat_completion.choices[0].message.content
            logger.debug(f"Longueur reponse: {len(response_text) if response_text else 0} caracteres")

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

        except asyncio.TimeoutError:
            rate_limiter.record_timeout("groq")
            ErrorHandler.log_error(
                asyncio.TimeoutError("Timeout Groq API"),
                "ai_assistant.chat",
                ErrorSeverity.MEDIUM
            )
            return {
                'success': False,
                'error': 'L\'assistant IA a mis trop de temps à répondre. Réessayez.',
                'response': None
            }

        except Exception as e:
            rate_limiter.record_error("groq", e)
            user_message = ErrorHandler.log_error(e, "ai_assistant.chat", ErrorSeverity.HIGH)
            return {
                'success': False,
                'error': user_message,
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
            logger.error(f"Erreur get_asset_context: {e}")
            return None

# Instance globale
ai_assistant_service = AIAssistantService()
