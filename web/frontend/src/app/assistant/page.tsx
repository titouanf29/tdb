"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Send, User, Sparkles, Loader2, Trash2, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiAPI, ChatMessage, AILimitStatus } from "@/lib/api";
import Link from "next/link";

// Markdown renderer for chat messages — supports headings, bold, italic, code, lists
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={i} className="bg-black/30 px-1.5 py-0.5 rounded text-sm">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  // Handle fenced code blocks first
  const segments = text.split(/(```[\s\S]*?```)/g);
  const nodes: React.ReactNode[] = [];
  let k = 0;

  for (const seg of segments) {
    if (seg.startsWith("```") && seg.endsWith("```")) {
      const code = seg.slice(3, -3).replace(/^\w+\n/, "");
      nodes.push(
        <pre key={k++} className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto text-sm">
          <code>{code}</code>
        </pre>
      );
      continue;
    }

    // Process line by line for headings and lists
    const lines = seg.split("\n");
    let listBuffer: string[] = [];

    const flushList = () => {
      if (!listBuffer.length) return;
      nodes.push(
        <ul key={k++} className="space-y-1 my-1.5 ml-2">
          {listBuffer.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="opacity-50 mt-0.5 shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    for (const line of lines) {
      if (line.startsWith("## ")) {
        flushList();
        nodes.push(
          <p key={k++} className="font-bold text-foreground mt-3 mb-1 text-sm">
            {renderInline(line.slice(3))}
          </p>
        );
      } else if (line.startsWith("### ")) {
        flushList();
        nodes.push(
          <p key={k++} className="font-semibold text-foreground/90 mt-2 mb-0.5 text-sm">
            {renderInline(line.slice(4))}
          </p>
        );
      } else if (/^[-*•] /.test(line)) {
        listBuffer.push(line.replace(/^[-*•] /, ""));
      } else if (line.trim() === "") {
        flushList();
        nodes.push(<br key={k++} />);
      } else {
        flushList();
        nodes.push(<span key={k++}>{renderInline(line)}</span>);
      }
    }
    flushList();
  }

  return <>{nodes}</>;
}

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const assetFromPortfolio = searchParams.get("asset");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(assetFromPortfolio ? `Analyse ma position sur ${assetFromPortfolio} : dois-je la conserver ?` : "");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [limitStatus, setLimitStatus] = useState<AILimitStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history and limit status on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [historyData, limitData] = await Promise.all([
          aiAPI.getHistory(50),
          aiAPI.getLimit()
        ]);
        setMessages(historyData.messages);
        setLimitStatus(limitData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadData();
  }, []);

  // Refresh limit status
  const refreshLimit = async () => {
    try {
      const limitData = await aiAPI.getLimit();
      setLimitStatus(limitData);
    } catch (error) {
      console.error("Error refreshing limit:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check limit before sending
    if (limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await aiAPI.chat(input);

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Refresh limit after successful message
      await refreshLimit();
    } catch (error: any) {
      console.error("Error sending message:", error);

      let errorContent = "Désolé, une erreur s'est produite. Veuillez réessayer.";

      // Handle rate limit error (429)
      if (error.status === 429) {
        errorContent = limitStatus?.is_premium
          ? "Trop de messages envoyés rapidement. Attendez quelques secondes puis réessayez."
          : "Vous avez atteint votre limite quotidienne de messages. Passez Premium pour des messages illimités !";
        await refreshLimit();
      }

      const errorMessage: ChatMessage = {
        role: "assistant",
        content: errorContent,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await aiAPI.clearHistory();
      setMessages([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-8rem)] flex flex-col"
    >
      {/* Header */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
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
                Powered by Groq (Llama 3.3)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Message limit indicator */}
            {limitStatus && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
                limitStatus.is_premium
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : limitStatus.remaining > 3
                    ? "bg-white/5 text-muted-foreground"
                    : limitStatus.remaining > 0
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "bg-loss/20 text-loss border border-loss/30"
              )}>
                {limitStatus.is_premium ? (
                  <>
                    <Crown className="w-3.5 h-3.5" />
                    <span>Illimité</span>
                  </>
                ) : (
                  <>
                    {limitStatus.remaining === 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{limitStatus.remaining}/{limitStatus.daily_limit} messages</span>
                  </>
                )}
              </div>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                title="Effacer l'historique"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Limit reached warning */}
      {limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0 && (
        <div className="glass-card p-4 mb-4 bg-loss/10 border border-loss/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-loss shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-loss">Limite quotidienne atteinte</p>
              <p className="text-sm text-muted-foreground">
                Vous avez utilise vos {limitStatus.daily_limit} messages gratuits du jour.
                La limite se reinitialise a minuit.
              </p>
            </div>
            <Link href="/premium">
              <button className="btn-primary flex items-center gap-2 whitespace-nowrap">
                <Crown className="w-4 h-4" />
                Passer Premium
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">
              Bienvenue ! Je suis votre assistant trading IA
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Posez-moi des questions sur le trading, les indicateurs techniques,
              les strategies, ou demandez une analyse d'actif.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                "Explique-moi le RSI",
                "Qu'est-ce que le MACD ?",
                "Analyse AAPL",
                "Strategies de trading"
              ].map((suggestion, i) => (
                <motion.button
                  key={suggestion}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-colors"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <motion.div
            key={index}
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
              <div className="whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
              <p
                className={cn(
                  "text-xs mt-2",
                  message.role === "user"
                    ? "text-white/70"
                    : "text-muted-foreground"
                )}
              >
                {new Date(message.created_at).toLocaleTimeString("fr-FR", {
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
            placeholder={
              limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0
                ? "Limite atteinte - Passez Premium pour continuer"
                : "Posez votre question..."
            }
            className="flex-1 input"
            disabled={isLoading || (limitStatus != null && !limitStatus.is_premium && limitStatus.remaining === 0)}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading || (limitStatus != null && !limitStatus.is_premium && limitStatus.remaining === 0)}
            className="btn-primary px-6 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          L'assistant ne donne pas de conseils financiers personnalises
        </p>
      </div>
    </motion.div>
  );
}
