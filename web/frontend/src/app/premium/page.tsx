"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Check, X, Rocket, Brain, BarChart3, Globe, Target, Calendar, Bell,
  Headphones, Sparkles, Loader2, Send, MessageSquare, CheckCircle, Clock,
  ScanLine, Zap, Shield, ChevronDown, TrendingUp, BookOpen, Lock, Bot,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePremium } from "@/lib/PremiumContext";
import { premiumAPI, PremiumFeatures, PremiumRequest, PremiumMessage } from "@/lib/api";
import { useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  rocket: Rocket,
  brain: Brain,
  chart: BarChart3,
  globe: Globe,
  target: Target,
  calendar: Calendar,
  bell: Bell,
  headphones: Headphones,
};

// ── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm font-medium">{question}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-white/5 pt-3">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Thread chat component (user side) ─────────────────────────────────────────
function RequestThread({
  request,
  onClose,
}: {
  request: PremiumRequest;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<PremiumMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fr = true; // inherits lang from parent but simpler here

  useEffect(() => {
    premiumAPI.getMessages(request.id)
      .then((d) => setMessages(d.messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [request.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await premiumAPI.sendMessage(request.id, reply.trim());
      setReply("");
      const d = await premiumAPI.getMessages(request.id);
      setMessages(d.messages);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const statusColor = request.status === "approved"
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : request.status === "rejected"
    ? "text-red-400 bg-red-500/10 border-red-500/20"
    : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

  const statusLabel = request.status === "approved" ? "Approuvé ✓"
    : request.status === "rejected" ? "Refusé"
    : "En attente…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col"
      style={{ maxHeight: "70vh" }}
    >
      {/* Thread header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/8 bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">
            Demande #{request.id}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full border shrink-0", statusColor)}>
            {statusLabel}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Aucun message pour le moment.
          </p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender_type === "admin";
            return (
              <div
                key={msg.id}
                className={cn("flex gap-2.5", isAdmin ? "flex-row" : "flex-row-reverse")}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isAdmin ? "bg-yellow-500/20 text-yellow-400" : "bg-primary/20 text-primary"
                )}>
                  {isAdmin ? "A" : "U"}
                </div>
                {/* Bubble */}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  isAdmin
                    ? "bg-yellow-500/10 border border-yellow-500/15 text-foreground rounded-tl-sm"
                    : "bg-primary/10 border border-primary/15 text-foreground rounded-tr-sm"
                )}>
                  {isAdmin && (
                    <p className="text-[10px] font-semibold text-yellow-400/80 mb-1 uppercase tracking-wide">
                      Admin CaptenTDB
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <p className={cn(
                    "text-[10px] mt-1.5",
                    isAdmin ? "text-yellow-400/40" : "text-primary/40"
                  )}>
                    {new Date(msg.created_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input — always shown even if approved/rejected */}
      <div className="border-t border-white/8 p-3 flex gap-2">
        <input
          type="text"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
          placeholder="Votre message…"
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm min-w-0"
        />
        <button
          onClick={sendReply}
          disabled={sending || !reply.trim()}
          className="p-2.5 rounded-xl bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25 transition-all disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PremiumPage() {
  const { isPremium, isAdmin, premiumInfo } = usePremium();
  const { t, lang } = useLanguage();
  const [features, setFeatures] = useState<PremiumFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<PremiumRequest[]>([]);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [openThread, setOpenThread] = useState<PremiumRequest | null>(null);
  const fr = lang !== "en";

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [featuresData, requestsData] = await Promise.all([
        premiumAPI.getFeatures(),
        premiumAPI.getMyRequests().catch(() => ({ requests: [] })),
      ]);
      setFeatures(featuresData);
      setMyRequests(requestsData.requests);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleContact = async () => {
    if (!message.trim() || !acceptedLegal) return;
    setIsSending(true);
    try {
      await premiumAPI.contact(message);
      setSendSuccess(true);
      setMessage("");
      loadData();
    } catch (error: any) {
      alert(error.message || "Error sending message");
    } finally { setIsSending(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-500 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Already premium / admin ──────────────────────────────────────────── */
  if (isPremium || isAdmin) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/8 via-orange-500/5 to-transparent p-8 text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">
            {isAdmin ? (
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t("prem_account_admin")}
              </span>
            ) : (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {t("prem_account_premium")}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isAdmin ? t("prem_admin_desc") : t("prem_user_desc")}
          </p>
          {premiumInfo && (
            <div className="flex justify-center gap-8 text-sm">
              {premiumInfo.since && (
                <div>
                  <p className="text-muted-foreground text-xs">{t("prem_member_since")}</p>
                  <p className="font-semibold">{new Date(premiumInfo.since).toLocaleDateString(fr ? "fr-FR" : "en-US")}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">{premiumInfo.expires ? t("prem_expires") : t("prem_duration")}</p>
                <p className="font-semibold text-green-400">
                  {premiumInfo.expires ? new Date(premiumInfo.expires).toLocaleDateString(fr ? "fr-FR" : "en-US") : t("prem_lifetime")}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">{t("prem_your_benefits")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features?.benefits.map((b, i) => {
              const Icon = iconMap[b.icon] || Sparkles;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/8">
                  <div className="p-2 rounded-lg bg-yellow-500/15 shrink-0">
                    <Icon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── Free user — upgrade page ─────────────────────────────────────────── */
  const comparisonRows = [
    {
      icon: <ScanLine className="w-4 h-4" />,
      name: fr ? "Scanner de marchés" : "Market Scanner",
      free: fr ? "3 scans/jour" : "3 scans/day",
      premium: fr ? "Illimité" : "Unlimited",
    },
    {
      icon: <Brain className="w-4 h-4" />,
      name: fr ? "Coach Alex IA" : "Alex AI Coach",
      free: fr ? "10 messages/jour" : "10 messages/day",
      premium: fr ? "Illimité" : "Unlimited",
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      name: fr ? "Positions simultanées" : "Simultaneous positions",
      free: "5",
      premium: "50",
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      name: fr ? "Actifs favoris" : "Favorite assets",
      free: "10",
      premium: "100",
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      name: "Backtest Manager",
      free: false,
      premium: true,
    },
    {
      icon: <Globe className="w-4 h-4" />,
      name: fr ? "Analyse Géopolitique" : "Geopolitical Analysis",
      free: false,
      premium: true,
    },
    {
      icon: <Target className="w-4 h-4" />,
      name: fr ? "Points Pivots avancés" : "Advanced Pivot Points",
      free: fr ? "Standard" : "Standard",
      premium: fr ? "Fibonacci, Woodie, Camarilla, DeMark" : "Fibonacci, Woodie, Camarilla, DeMark",
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      name: fr ? "Calendrier Économique" : "Economic Calendar",
      free: fr ? "7 jours" : "7 days",
      premium: fr ? "30 jours" : "30 days",
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      name: fr ? "Palmarès PER" : "P/E Rankings",
      free: "Top 10",
      premium: "Top 50",
    },
    {
      icon: <Headphones className="w-4 h-4" />,
      name: fr ? "Support Prioritaire" : "Priority Support",
      free: false,
      premium: true,
    },
  ];

  const featureHighlights = [
    {
      icon: ScanLine,
      title: fr ? "Scanner illimité" : "Unlimited Scanner",
      desc: fr ? "Scannez tous les marchés autant que vous le souhaitez, sans limite journalière." : "Scan all markets as many times as you want, no daily cap.",
      color: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
    },
    {
      icon: Brain,
      title: fr ? "Coach Alex illimité" : "Unlimited Alex AI",
      desc: fr ? "Accès illimité à l'assistant IA pour analyser vos actifs, stratégies et questions." : "Unlimited access to the AI coach for asset analysis, strategies and questions.",
      color: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
    },
    {
      icon: BarChart3,
      title: "Backtest Manager",
      desc: fr ? "Testez vos stratégies sur des données historiques réelles avant de les appliquer." : "Test your strategies on real historical data before going live.",
      color: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      icon: Globe,
      title: fr ? "Analyse Géopolitique" : "Geopolitical Analysis",
      desc: fr ? "Analyses détaillées des risques géopolitiques et leur impact sur les marchés." : "Detailed geopolitical risk analyses and their market impact.",
      color: "from-orange-500/20 to-amber-500/20",
      iconColor: "text-amber-400",
    },
    {
      icon: Target,
      title: fr ? "Pivots Avancés" : "Advanced Pivots",
      desc: fr ? "Toutes les méthodes : Fibonacci, Woodie, Camarilla, DeMark — pas seulement standard." : "All methods: Fibonacci, Woodie, Camarilla, DeMark — not just standard.",
      color: "from-rose-500/20 to-red-500/20",
      iconColor: "text-rose-400",
    },
    {
      icon: Bot,
      title: fr ? "Assistant IA illimité" : "Unlimited AI Assistant",
      desc: fr ? "Discutez avec l'assistant IA sans limite de messages journalière." : "Chat with the AI assistant with no daily message cap.",
      color: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/8 via-orange-500/5 to-transparent p-8 sm:p-10 text-center"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/12 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {fr ? "Passez à " : "Go "}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Premium
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-6">
            {fr
              ? "Débloquez tout le potentiel de CaptenTDB — analyses avancées, outils professionnels et support dédié."
              : "Unlock the full power of CaptenTDB — advanced analysis, professional tools and dedicated support."}
          </p>

          {/* Price badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
            <span className="text-3xl font-black text-yellow-400">5€</span>
            <div className="text-left">
              <p className="text-xs text-muted-foreground font-medium">TTC / {fr ? "mois" : "month"}</p>
              <p className="text-xs text-yellow-400/80">{fr ? "Résiliable à tout moment" : "Cancel anytime"}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Feature highlights ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          {fr ? "Ce que vous débloquez" : "What you unlock"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureHighlights.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={cn("rounded-xl border border-white/8 p-5 bg-gradient-to-br", f.color)}>
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={cn("w-5 h-5", f.iconColor)} />
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Comparison table ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h2 className="text-xl font-bold mb-6 text-center">{t("prem_comparison")}</h2>

        {/* Mobile: stacked cards */}
        <div className="block sm:hidden space-y-3">
          {comparisonRows.map((row, i) => (
            <div key={i} className="rounded-xl border border-white/8 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
                <span className="text-muted-foreground">{row.icon}</span>
                <span className="text-sm font-medium">{row.name}</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/5">
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Free</p>
                  {typeof row.free === "boolean" ? (
                    row.free ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400/60 mx-auto" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{row.free}</span>
                  )}
                </div>
                <div className="px-4 py-3 text-center bg-yellow-500/5">
                  <p className="text-[10px] text-yellow-500/80 mb-1.5 uppercase tracking-wide font-semibold">Premium</p>
                  {typeof row.premium === "boolean" ? (
                    row.premium ? <Check className="w-4 h-4 text-yellow-400 mx-auto" /> : <X className="w-4 h-4 text-red-400/60 mx-auto" />
                  ) : (
                    <span className="text-xs text-yellow-400 font-semibold">{row.premium}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden sm:grid grid-cols-[1fr_120px_160px] gap-0">
          {/* Header */}
          <div className="p-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("prem_feature_col")}</div>
          <div className="p-3 text-center rounded-tl-xl bg-white/[0.04] border-t border-l border-white/8 text-sm font-bold">Free</div>
          <div className="p-3 text-center rounded-tr-xl bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border-t border-r border-yellow-500/25">
            <div className="flex items-center justify-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">Premium</span>
            </div>
            <p className="text-[11px] text-yellow-400/70 mt-0.5">5€ / {fr ? "mois" : "month"}</p>
          </div>

          {comparisonRows.map((row, i) => {
            const isLast = i === comparisonRows.length - 1;
            return (
              <div key={i} className="contents">
                <div className={cn("px-3 py-3.5 flex items-center gap-2 border-t border-white/6 text-sm", isLast && "rounded-bl-xl")}>
                  <span className="text-muted-foreground/70 shrink-0">{row.icon}</span>
                  {row.name}
                </div>
                <div className={cn("px-3 py-3.5 text-center bg-white/[0.02] border-t border-l border-white/6 flex items-center justify-center")}>
                  {typeof row.free === "boolean" ? (
                    row.free ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400/50" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{row.free}</span>
                  )}
                </div>
                <div className={cn("px-3 py-3.5 text-center bg-gradient-to-r from-yellow-500/8 to-orange-500/8 border-t border-r border-yellow-500/15 flex items-center justify-center", isLast && "rounded-br-xl")}>
                  {typeof row.premium === "boolean" ? (
                    row.premium ? <Check className="w-4 h-4 text-yellow-400" /> : <X className="w-4 h-4 text-red-400/50" />
                  ) : (
                    <span className="text-xs text-yellow-400 font-semibold">{row.premium}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Why a subscription ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2">{t("prem_why_title")}</h2>
            {fr ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                CaptenTDB est un projet indépendant développé et maintenu par une seule personne. L'abonnement à{" "}
                <span className="text-yellow-400 font-semibold">5€ / mois TTC</span> couvre les frais de serveur, de base de données et d'API (données financières temps réel, IA, etc.).
                En passant Premium, vous aidez directement à garder la plateforme en ligne et à financer de nouvelles fonctionnalités. Merci pour votre soutien !
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                CaptenTDB is an independent project developed and maintained by a single person. The{" "}
                <span className="text-yellow-400 font-semibold">€5 / month</span> subscription covers server, database and API costs (real-time financial data, AI, etc.).
                By going Premium, you directly help keep the platform running and fund new features. Thank you for your support!
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {fr ? "Questions fréquentes" : "FAQ"}
        </h2>
        <div className="space-y-2">
          {fr ? (
            <>
              <FaqItem
                question="Comment fonctionne le paiement ?"
                answer="Vous envoyez un message via le formulaire ci-dessous, et un administrateur active votre compte Premium manuellement après validation du paiement. Le paiement est sécurisé via Stripe (PCI-DSS)."
              />
              <FaqItem
                question="Puis-je résilier à tout moment ?"
                answer="Oui. L'abonnement est mensuel et résiliable à tout moment, sans frais. Il vous suffit d'en faire la demande par message."
              />
              <FaqItem
                question="Quel est mon droit de rétractation ?"
                answer={
                  <span>
                    Conformément à l'article <strong>L.221-18 du code de la consommation</strong>, vous disposez d'un délai de{" "}
                    <strong>14 jours calendaires</strong> à compter de l'activation pour exercer votre droit de rétractation sans motif.
                    Si vous demandez un accès immédiat, vous reconnaissez que l'exercice du droit de rétractation après le début de la fourniture donnera lieu à un paiement proportionnel aux services déjà fournis (art. L.221-25).{" "}
                    <Link href="/cgv" target="_blank" className="text-primary underline">Voir CGV Art. 8</Link>.
                  </span>
                }
              />
              <FaqItem
                question="Les données financières sont-elles en temps réel ?"
                answer="Les données de marché proviennent de fournisseurs professionnels (Yahoo Finance, etc.) avec un délai minimal. Les abonnés Premium ont accès aux mêmes flux de données que les utilisateurs gratuits, mais avec des outils d'analyse plus puissants."
              />
              <FaqItem
                question="Comment mes données personnelles sont-elles traitées ?"
                answer={
                  <span>
                    Vos données sont stockées sur des serveurs sécurisés, conformément au{" "}
                    <strong>RGPD</strong>. Elles ne sont jamais vendues à des tiers.{" "}
                    <Link href="/politique-de-confidentialite" target="_blank" className="text-primary underline">Voir la Politique de confidentialité</Link>.
                  </span>
                }
              />
              <FaqItem
                question="CaptenTDB fournit-il des conseils en investissement ?"
                answer="Non. CaptenTDB est une plateforme éducative. Les analyses, signaux et outils fournis ont un but purement informatif et pédagogique. Ils ne constituent pas des conseils en investissement au sens de la réglementation AMF. Tout investissement comporte des risques de perte en capital."
              />
            </>
          ) : (
            <>
              <FaqItem
                question="How does payment work?"
                answer="Send a message via the form below, and an admin will manually activate your Premium account after payment validation. Payment is secured via Stripe (PCI-DSS)."
              />
              <FaqItem
                question="Can I cancel anytime?"
                answer="Yes. The subscription is monthly and can be cancelled at any time, free of charge. Just send a cancellation request by message."
              />
              <FaqItem
                question="What is my right of withdrawal?"
                answer={
                  <span>
                    Under <strong>Article L.221-18 of the French Consumer Code</strong>, you have{" "}
                    <strong>14 calendar days</strong> from activation to withdraw without reason.
                    If you request immediate access, you acknowledge that withdrawing after service has started may result in a proportional charge (art. L.221-25).{" "}
                    <Link href="/cgv" target="_blank" className="text-primary underline">See T&Cs Art. 8</Link>.
                  </span>
                }
              />
              <FaqItem
                question="Is CaptenTDB financial advice?"
                answer="No. CaptenTDB is an educational platform. All analyses, signals and tools are for informational and educational purposes only. They do not constitute investment advice. All investments carry risk of capital loss."
              />
            </>
          )}
        </div>
      </motion.div>

      {/* ── CTA / Contact form ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-6 sm:p-8"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/8 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />

        <div className="relative max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/25 flex items-center justify-center">
              <Crown className="w-7 h-7 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold mb-1">{t("prem_get_premium")}</h2>
            <p className="text-sm text-muted-foreground">
              {fr
                ? <>Envoyez un message pour obtenir votre accès Premium à <span className="text-yellow-400 font-semibold">5€ / mois TTC</span>. Un admin vous répond rapidement.</>
                : <>Send a message to get your Premium access at <span className="text-yellow-400 font-semibold">€5 / month</span>. An admin will reply quickly.</>
              }
            </p>
          </div>

          {sendSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
            >
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">{t("prem_sent_title")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("prem_sent_desc")}</p>
              <button onClick={() => setSendSuccess(false)} className="text-sm text-primary hover:underline">
                {t("prem_send_another")}
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("prem_placeholder")}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none resize-none text-sm"
              />

              {/* Legal notice — Droit de rétractation (L.221-18 code de la consommation) */}
              <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  {fr ? "Information légale obligatoire" : "Required legal notice"}
                </div>
                <div className="text-xs text-blue-200/70 space-y-1 leading-relaxed">
                  <p>
                    {fr
                      ? <><strong className="text-blue-200">Droit de rétractation (art. L.221-18 C. Conso.)</strong> — Vous disposez de <strong>14 jours calendaires</strong> à compter de l'activation pour vous rétracter sans motif. Si vous demandez l'accès immédiat, vous acceptez qu'une retenue proportionnelle aux services fournis s'applique en cas de rétractation (art. L.221-25).</>
                      : <><strong className="text-blue-200">Right of withdrawal (art. L.221-18 French Consumer Code)</strong> — You have <strong>14 calendar days</strong> from activation to withdraw without reason. If you request immediate access, a proportional charge for services already rendered applies upon withdrawal (art. L.221-25).</>
                    }
                  </p>
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-blue-200/60">
                    <span>{fr ? "Prix : 5,00 € TTC / mois" : "Price: €5.00 incl. VAT / month"}</span>
                    <span>·</span>
                    <span>{fr ? "Paiement sécurisé Stripe (PCI-DSS)" : "Secure Stripe payment (PCI-DSS)"}</span>
                    <span>·</span>
                    <span>{fr ? "Résiliable à tout moment" : "Cancel anytime"}</span>
                    <span>·</span>
                    <Link href="/cgv" target="_blank" className="underline hover:text-blue-200">{fr ? "Voir CGV" : "See T&Cs"}</Link>
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                    acceptedLegal ? "bg-yellow-500 border-yellow-500" : "border-white/20 bg-white/5"
                  )}>
                    {acceptedLegal && <Check className="w-3 h-3 text-black" />}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {fr ? (
                    <>J'ai lu et j'accepte les{" "}
                      <Link href="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CGU</Link>,{" "}
                      <Link href="/cgv" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CGV</Link> et la{" "}
                      <Link href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Politique de confidentialité</Link>.
                      Je comprends que le service Premium sera fourni immédiatement après activation et que mon droit de rétractation s'exerce conformément à l'art. L.221-18 du code de la consommation.
                    </>
                  ) : (
                    <>I have read and accept the{" "}
                      <Link href="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Use</Link>,{" "}
                      <Link href="/cgv" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Sale</Link> and{" "}
                      <Link href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</Link>.
                      I understand that Premium access will be granted immediately and that my right of withdrawal applies per art. L.221-18 of the French Consumer Code.
                    </>
                  )}
                </span>
              </label>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleContact}
                disabled={isSending || !message.trim() || !acceptedLegal}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {t("prem_send_btn")}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── My requests + thread ──────────────────────────────────────────── */}
      {myRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {fr ? "Mes discussions" : "My conversations"}
          </h2>

          {/* Request list */}
          <div className="space-y-2">
            {myRequests.map((req) => {
              const isOpen = openThread?.id === req.id;
              return (
                <div key={req.id}>
                  <button
                    onClick={() => setOpenThread(isOpen ? null : req)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition-all",
                      req.status === "pending" ? "border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/8"
                        : req.status === "approved" ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/8"
                        : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
                      isOpen && "rounded-b-none border-b-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        req.status === "pending" ? "bg-yellow-500/15" : req.status === "approved" ? "bg-green-500/15" : "bg-white/5"
                      )}>
                        <MessageSquare className={cn("w-4 h-4",
                          req.status === "pending" ? "text-yellow-400" : req.status === "approved" ? "text-green-400" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{req.message.slice(0, 60)}{req.message.length > 60 ? "…" : ""}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-semibold",
                        req.status === "pending" ? "bg-yellow-500/15 text-yellow-400"
                          : req.status === "approved" ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400"
                      )}>
                        {req.status === "pending" ? t("prem_status_pending")
                          : req.status === "approved" ? t("prem_status_approved")
                          : t("prem_status_rejected")}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </div>
                  </button>

                  {/* Inline thread */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          "rounded-b-xl border border-t-0",
                          req.status === "pending" ? "border-yellow-500/20" : req.status === "approved" ? "border-green-500/20" : "border-white/8"
                        )}>
                          <RequestThread request={req} onClose={() => setOpenThread(null)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Legal footer links ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground/50 pb-4"
      >
        <Link href="/mentions-legales" className="hover:text-muted-foreground transition-colors">{fr ? "Mentions légales" : "Legal notice"}</Link>
        <span>·</span>
        <Link href="/cgu" className="hover:text-muted-foreground transition-colors">CGU</Link>
        <span>·</span>
        <Link href="/cgv" className="hover:text-muted-foreground transition-colors">CGV</Link>
        <span>·</span>
        <Link href="/politique-de-confidentialite" className="hover:text-muted-foreground transition-colors">{fr ? "Politique de confidentialité" : "Privacy Policy"}</Link>
        <span>·</span>
        <span>{fr ? "Prix TTC · Stripe PCI-DSS · Service éducatif" : "Incl. VAT · Stripe PCI-DSS · Educational service"}</span>
      </motion.div>

    </div>
  );
}
