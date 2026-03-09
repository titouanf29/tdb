"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send, User, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Bonjour ! Je suis votre assistant trading IA. Je peux vous aider avec :\n\n- Analyse d'actifs\n- Explications des indicateurs techniques\n- Stratégies de trading\n- Questions sur les marchés\n\nComment puis-je vous aider ?",
    timestamp: new Date(),
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: getAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-8rem)] flex flex-col"
    >
      {/* Header */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold flex items-center gap-2">
              Assistant IA Trading
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </h1>
            <p className="text-sm text-muted-foreground">
              Powered by Groq (Llama 3)
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                message.role === "user"
                  ? "bg-primary"
                  : "bg-gradient-to-br from-primary to-purple-500"
              )}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] p-4 rounded-2xl",
                message.role === "user"
                  ? "bg-primary text-white rounded-br-none"
                  : "glass-card rounded-bl-none"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  "text-xs mt-2",
                  message.role === "user"
                    ? "text-white/70"
                    : "text-muted-foreground"
                )}
              >
                {message.timestamp.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass-card p-4 rounded-2xl rounded-bl-none">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4 glass-card p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Posez votre question..."
            className="flex-1 input"
            disabled={isLoading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-primary px-6"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          L'assistant ne donne pas de conseils financiers personnalisés
        </p>
      </div>
    </motion.div>
  );
}

function getAIResponse(input: string): string {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes("rsi")) {
    return "Le **RSI (Relative Strength Index)** est un indicateur de momentum qui mesure la vitesse et le changement des mouvements de prix.\n\n**Interprétation :**\n- RSI > 70 : Zone de surachat (signal de vente potentiel)\n- RSI < 30 : Zone de survente (signal d'achat potentiel)\n- RSI entre 40-60 : Zone neutre\n\n**Conseil :** Ne jamais utiliser le RSI seul, combinez-le avec d'autres indicateurs !";
  }

  if (lowerInput.includes("macd")) {
    return "Le **MACD (Moving Average Convergence Divergence)** est un indicateur de tendance et de momentum.\n\n**Composants :**\n- Ligne MACD : EMA(12) - EMA(26)\n- Ligne Signal : EMA(9) du MACD\n- Histogramme : MACD - Signal\n\n**Signaux :**\n- Croisement haussier : MACD passe au-dessus du Signal\n- Croisement baissier : MACD passe en-dessous du Signal\n- Divergences : Indiquent un potentiel retournement";
  }

  if (lowerInput.includes("bitcoin") || lowerInput.includes("btc")) {
    return "**Bitcoin (BTC)** est la première et plus grande cryptomonnaie par capitalisation.\n\n**Points clés :**\n- Actif très volatile\n- Marché 24/7\n- Corrélé aux marchés traditionnels en période de stress\n- Halving tous les 4 ans\n\nVoulez-vous que j'analyse le BTC en détail ?";
  }

  if (lowerInput.includes("stratégie") || lowerInput.includes("strategy")) {
    return "Voici quelques **stratégies populaires** :\n\n**1. Trend Following**\n- Suivre la tendance dominante\n- Utiliser EMA 20/50/200\n\n**2. Mean Reversion**\n- Acheter les dips dans une tendance haussière\n- Utiliser RSI et Bollinger Bands\n\n**3. Breakout Trading**\n- Trader les cassures de niveaux clés\n- Volume important requis\n\nQuelle stratégie vous intéresse ?";
  }

  return "Je comprends votre question. Pour vous aider au mieux, pourriez-vous me donner plus de détails ?\n\nJe peux vous aider avec :\n- L'analyse d'un actif spécifique\n- L'explication d'indicateurs techniques\n- Des stratégies de trading\n- La gestion du risque\n\nN'hésitez pas à me poser des questions précises !";
}
