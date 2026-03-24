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

function buildPositionContext(pos: Record<string, any>): string {
  const direction = pos.position_type === "long" ? "LONG (achat)" : "SHORT (vente)";
  const pnl = pos.unrealized_pnl != null ? `${pos.unrealized_pnl >= 0 ? "+" : ""}${pos.unrealized_pnl.toFixed(2)} ${pos.currency}` : "N/A";
  const pnlPct = pos.pnl_percent != null ? `${pos.pnl_percent >= 0 ? "+" : ""}${pos.pnl_percent.toFixed(2)}%` : "N/A";

  return [
    `=== POSITION DE L'UTILISATEUR ===`,
    `Actif : ${pos.symbol}`,
    `Direction : ${direction}`,
    `Quantité : ${pos.quantity}`,
    `Prix d'entrée : ${pos.entry_price} ${pos.currency}`,
    pos.current_price ? `Prix actuel : ${pos.current_price} ${pos.currency}` : null,
    pos.leverage > 1 ? `Levier : x${pos.leverage}` : null,
    `PnL non réalisé : ${pnl} (${pnlPct})`,
    pos.stop_loss ? `Stop Loss : ${pos.stop_loss} ${pos.currency}` : null,
    pos.take_profit ? `Take Profit : ${pos.take_profit} ${pos.currency}` : null,
    pos.entry_date ? `Date d'entrée : ${pos.entry_date.slice(0, 10)}` : null,
    pos.days_held != null ? `Jours détenus : ${pos.days_held}` : null,
    pos.broker ? `Broker : ${pos.broker}` : null,
    pos.notes ? `Notes de l'utilisateur : "${pos.notes}"` : null,
    `=== FIN POSITION ===`,
  ].filter(Boolean).join("\n");
}

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const assetFromPortfolio = searchParams.get("asset");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(assetFromPortfolio ? `Analyse ma position sur ${assetFromPortfolio} et donne-moi tes recommandations.` : "");
  const [positionContext, setPositionContext] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(!assetFromPortfolio);
  const [limitReady, setLimitReady] = useState(false);
  const [limitStatus, setLimitStatus] = useState<AILimitStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Read position context from sessionStorage synchronously before any fetch
    if (assetFromPortfolio) {
      const stored = sessionStorage.getItem("ai_position_context");
      if (stored) {
        try {
          const pos = JSON.parse(stored);
          if (pos.symbol === assetFromPortfolio) {
            setPositionContext(buildPositionContext(pos));
            sessionStorage.removeItem("ai_position_context");
          }
        } catch {}
      }
    }

    // Load limit first (fast) — unblocks auto-send immediately
    aiAPI.getLimit().then((limitData) => {
      setLimitStatus(limitData);
      setLimitReady(true);
    }).catch(console.error);

    // Load history in background (doesn't block UI or auto-send)
    if (!assetFromPortfolio) {
      aiAPI.getHistory(20).then((historyData) => {
        setMessages(historyData.messages);
      }).catch(console.error).finally(() => setIsLoadingHistory(false));
    }
  }, []);

  // Decrement limit locally after each message to avoid extra fetch
  const decrementLimit = () => {
    setLimitStatus((prev) => {
      if (!prev || prev.is_premium) return prev;
      const next = Math.max(0, prev.remaining - 1);
      return { ...prev, remaining: next, messages_today: prev.messages_today + 1 };
    });
  };

  const handleSend = async (msgOverride?: string, ctxOverride?: string) => {
    const msg = msgOverride ?? input;
    if (!msg.trim() || isLoading) return;

    // Check limit before sending
    if (limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!msgOverride) setInput("");
    setIsLoading(true);

    // Use position context only on first send, then clear it
    const ctx = ctxOverride ?? positionContext ?? undefined;
    if (positionContext) setPositionContext(null);

    try {
      const response = await aiAPI.chat(msg, ctx);

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      decrementLimit();
    } catch (error: any) {
      console.error("Error sending message:", error);

      let errorContent = "Désolé, une erreur s'est produite. Veuillez réessayer.";

      // Handle rate limit error (429)
      if (error.status === 429) {
        errorContent = limitStatus?.is_premium
          ? "Trop de messages envoyés rapidement. Attendez quelques secondes puis réessayez."
          : "Vous avez atteint votre limite quotidienne de messages. Passez Premium pour des messages illimités !";
        // Only re-fetch limit on 429 to sync with server
        aiAPI.getLimit().then(setLimitStatus).catch(() => {});
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

  // Auto-send as soon as limit is ready (no need to wait for history)
  useEffect(() => {
    if (limitReady && positionContext && input && !autoSentRef.current) {
      autoSentRef.current = true;
      handleSend(input, positionContext);
      setInput("");
    }
  }, [limitReady, positionContext]);

  const clearHistory = async () => {
    try {
      await aiAPI.clearHistory();
      setMessages([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

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

      {/* Position context banner */}
      {positionContext && assetFromPortfolio && (
        <div className="glass-card px-4 py-2.5 mb-4 bg-purple-500/10 border border-purple-500/30 flex items-center gap-2 text-sm text-purple-300">
          <Bot className="w-4 h-4 shrink-0" />
          <span>Contexte de votre position <strong>{assetFromPortfolio}</strong> chargé — analyse personnalisée en cours…</span>
        </div>
      )}

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
        {isLoadingHistory && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoadingHistory && messages.length === 0 && (
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
            onClick={() => handleSend()}
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
