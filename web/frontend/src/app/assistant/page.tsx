"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Send, User, Sparkles, Loader2, Trash2, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiAPI, ChatMessage, AILimitStatus, missionsAPI } from "@/lib/api";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";

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

function buildPositionMessage(pos: Record<string, any>): string {
  const direction = pos.position_type === "long" ? "LONG" : "SHORT";
  const pnl = pos.unrealized_pnl != null ? `${pos.unrealized_pnl >= 0 ? "+" : ""}${Number(pos.unrealized_pnl).toFixed(2)} ${pos.currency}` : null;
  const pnlPct = pos.pnl_percent != null ? `${pos.pnl_percent >= 0 ? "+" : ""}${Number(pos.pnl_percent).toFixed(2)}%` : null;

  const lines = [
    `Voici ma position en cours, analyse-la et donne-moi tes recommandations précises :`,
    ``,
    `Actif : ${pos.symbol} (${direction})`,
    `Prix d'entrée : ${pos.entry_price} ${pos.currency}`,
    pos.current_price ? `Prix actuel : ${pos.current_price} ${pos.currency}` : null,
    pnl && pnlPct ? `PnL non réalisé : ${pnl} (${pnlPct})` : null,
    pos.leverage > 1 ? `Levier : x${pos.leverage}` : null,
    pos.quantity ? `Quantité : ${pos.quantity}` : null,
    pos.stop_loss ? `Stop Loss : ${pos.stop_loss} ${pos.currency}` : null,
    pos.take_profit ? `Take Profit : ${pos.take_profit} ${pos.currency}` : null,
    pos.days_held != null ? `Jours détenus : ${pos.days_held}` : null,
    pos.notes ? `Notes : ${pos.notes}` : null,
    ``,
    `Est-ce que je dois tenir cette position, ajuster mon SL/TP, ou sortir ?`,
  ].filter((l) => l !== null);

  return lines.join("\n");
}

export default function AssistantPage() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const assetFromPortfolio = searchParams.get("asset");

  // Read position from sessionStorage synchronously — build message with real data
  const positionContextRef = useRef<string | null>(null);
  const [hasPositionContext, setHasPositionContext] = useState(false);

  const getInitialInput = () => {
    if (typeof window === "undefined" || !assetFromPortfolio) return "";
    const stored = sessionStorage.getItem("ai_position_context");
    if (!stored) return `Analyse ma position sur ${assetFromPortfolio} et donne-moi tes recommandations.`;
    try {
      const pos = JSON.parse(stored);
      if (pos.symbol === assetFromPortfolio) {
        sessionStorage.removeItem("ai_position_context");
        const msg = buildPositionMessage(pos);
        positionContextRef.current = msg; // keep for the first send
        return msg;
      }
    } catch {}
    return `Analyse ma position sur ${assetFromPortfolio} et donne-moi tes recommandations.`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(() => getInitialInput());
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

  useEffect(() => {
    if (positionContextRef.current) setHasPositionContext(true);

    const load = async () => {
      try {
        const [historyData, limitData] = await Promise.all([
          aiAPI.getHistory(20),
          aiAPI.getLimit(),
        ]);
        setMessages(historyData.messages);
        setLimitStatus(limitData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    load();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0) {
      return;
    }

    const msg = input;
    positionContextRef.current = null;
    setHasPositionContext(false);

    setMessages((prev) => [...prev, { role: "user", content: msg, created_at: new Date().toISOString() }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await aiAPI.chat(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: response.response, created_at: new Date().toISOString() }]);
      missionsAPI.recordAction("ai_chat").catch(() => {});
      setLimitStatus((prev) => {
        if (!prev || prev.is_premium) return prev;
        return { ...prev, remaining: Math.max(0, prev.remaining - 1), messages_today: prev.messages_today + 1 };
      });
    } catch (error: any) {
      let errorContent = error.message && error.message !== "undefined"
        ? `❌ ${error.message}`
        : t("assistant_err_generic");
      if (error.status === 429) {
        errorContent = limitStatus?.is_premium
          ? t("assistant_err_rate")
          : t("assistant_err_limit");
        aiAPI.getLimit().then(setLimitStatus).catch(() => {});
      }
      setMessages((prev) => [...prev, { role: "assistant", content: errorContent, created_at: new Date().toISOString() }]);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100dvh-8rem)] min-h-0 flex flex-col"
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
                {t("assistant_title")}
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("assistant_subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <HelpGuide
              size="sm"
              title={lang === "en" ? "AI Assistant" : "Assistant IA"}
              intro={lang === "en" ? "Ask any question about trading, markets, assets or strategy. The AI replies with clear, contextualised explanations." : "Pose toutes tes questions sur le trading, les marchés, les actifs ou la stratégie. L'IA te répond avec des explications claires et contextualisées."}
              sections={lang === "en" ? [
                { title: "Asset analysis", desc: "Ask for example: 'Analyze AAPL', 'What do you think about gold right now?' or 'What are the key levels on BTC?'" },
                { title: "Strategic questions", desc: "Ask about risk management, position sizing, or strategies (swing, day trading, scalping…)." },
                { title: "Education", desc: "Ask to explain concepts: 'What is RSI?', 'How does a stop-loss work?', 'Explain Fibonacci to me'." },
                { title: "History", desc: "The assistant remembers your messages in the current session. The trash button clears the conversation." },
                { title: "Message limit", desc: "Free accounts have a daily quota. Go Premium for unlimited conversations." },
              ] : [
                { title: "Analyse d'actif", desc: "Demande par exemple : 'Analyse AAPL', 'Que penses-tu de l'or en ce moment ?' ou 'Quels sont les niveaux clés sur BTC ?'" },
                { title: "Questions stratégiques", desc: "Pose des questions sur ta gestion du risque, le dimensionnement de position, ou les stratégies (swing, day trading, scalping…)." },
                { title: "Éducation", desc: "Demande d'expliquer des concepts : 'C'est quoi le RSI ?', 'Comment fonctionne un stop-loss ?', 'Explique-moi Fibonacci'." },
                { title: "Historique", desc: "L'assistant se souvient de tes messages dans la session en cours. Le bouton poubelle efface la conversation." },
                { title: "Limite de messages", desc: "Les comptes Free ont un quota journalier. Passe en Premium pour des conversations illimitées." },
              ]}
              tip={lang === "en" ? "Be precise in your questions to get the best answers. E.g.: 'LVMH weekly trend' rather than just 'LVMH'." : "Sois précis dans tes questions pour obtenir les meilleures réponses. Ex: 'LVMH en tendance hebdo' plutôt que juste 'LVMH'."}
            />
            {/* Message limit indicator */}
            {limitStatus && (
              <div className={cn(
                "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs whitespace-nowrap",
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
                    <span>{t("assistant_unlimited")}</span>
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
                title={t("assistant_clear")}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Position context banner */}
      {hasPositionContext && assetFromPortfolio && (
        <div className="glass-card px-4 py-2.5 mb-4 bg-purple-500/10 border border-purple-500/30 flex items-center gap-2 text-sm text-purple-300">
          <Bot className="w-4 h-4 shrink-0" />
          <span>{t("assistant_position_pre")} <strong>{assetFromPortfolio}</strong> {t("assistant_position_suf")}</span>
        </div>
      )}

      {/* Limit reached warning */}
      {limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0 && (
        <div className="glass-card p-4 mb-4 bg-loss/10 border border-loss/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-6 h-6 text-loss shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-loss">{t("assistant_limit_title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("assistant_limit_msg")}
                </p>
              </div>
            </div>
            <Link href="/premium">
              <button className="btn-primary flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center">
                <Crown className="w-4 h-4" />
                {t("assistant_go_premium")}
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
              {t("assistant_welcome")}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("assistant_welcome_sub")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {(lang === "fr"
                ? ["Explique-moi le RSI", "Qu'est-ce que le MACD ?", "Analyse AAPL", "Stratégies de trading"]
                : ["Explain RSI to me", "What is MACD?", "Analyze AAPL", "Trading strategies"]
              ).map((suggestion, i) => (
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
                "max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl",
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
                {new Date(message.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "fr-FR", {
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
                ? t("assistant_ph_limit")
                : t("assistant_ph")
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
          {t("assistant_disclaimer")}
        </p>
      </div>
    </motion.div>
  );
}
