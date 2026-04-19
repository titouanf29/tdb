"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Gem, TrendingUp, TrendingDown, Minus, RefreshCw, Lock, ArrowRight,
  Newspaper, ExternalLink, BookOpen, Zap, Shield, BarChart2, Loader2,
  AlertTriangle, Activity, Circle, X, DollarSign, CheckCircle2, Timer,
  Bot, Send, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analysisAPI, marketAPI, aiAPI, adminAPI, walletAPI, toolsAPI, Analysis } from "@/lib/api";
import { usePremium } from "@/lib/PremiumContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useFormatPrice } from "@/lib/SettingsContext";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";

const PremiumChart = dynamic(() => import("@/components/PremiumChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] bg-amber-500/5 animate-pulse rounded-xl border border-amber-500/10" />
  ),
});

// ── Correlation config ────────────────────────────────────────────────────────
const CORREL_SYMBOLS = ["DX-Y.NYB", "^TNX", "^VIX", "CL=F", "EURUSD=X", "BTC-USD"];

const CORREL_CONFIG: Record<string, {
  label: string; labelEn: string;
  direction: number; // +1 = bullish for gold when asset rises, -1 = bearish
  reasonFr: string; reasonEn: string;
  icon: string;
}> = {
  "DX-Y.NYB": {
    label: "Dollar (DXY)", labelEn: "Dollar (DXY)",
    direction: -1,
    reasonFr: "Dollar fort → or moins attractif en dehors des US",
    reasonEn: "Strong dollar → gold more expensive outside the US",
    icon: "$",
  },
  "^TNX": {
    label: "Taux 10 ans US", labelEn: "US 10Y Yield",
    direction: -1,
    reasonFr: "Taux réels élevés → l'or (sans rendement) perd de l'attrait",
    reasonEn: "High real yields → gold (no yield) becomes less attractive",
    icon: "%",
  },
  "^VIX": {
    label: "VIX (volatilité)", labelEn: "VIX (fear)",
    direction: 1,
    reasonFr: "Peur des marchés → fuite vers l'or, valeur refuge",
    reasonEn: "Market fear → flight to gold as safe haven",
    icon: "⚡",
  },
  "CL=F": {
    label: "Pétrole (WTI)", labelEn: "Oil (WTI)",
    direction: 1,
    reasonFr: "Pétrole cher → inflation implicite → or comme couverture",
    reasonEn: "High oil → implied inflation → gold as hedge",
    icon: "🛢",
  },
  "EURUSD=X": {
    label: "EUR / USD", labelEn: "EUR / USD",
    direction: 1,
    reasonFr: "Euro fort = dollar faible → or plus accessible mondialement",
    reasonEn: "Strong euro = weak dollar → gold more affordable globally",
    icon: "€",
  },
  "BTC-USD": {
    label: "Bitcoin", labelEn: "Bitcoin",
    direction: 0.5,
    reasonFr: "Parfois corrélé comme réserve de valeur alternative au dollar",
    reasonEn: "Sometimes correlated as an alternative store of value",
    icon: "₿",
  },
};

// ── Dev Gate (non-admin view) ─────────────────────────────────────────────────
function GoldHubDevGate() {
  const { lang } = useLanguage();
  const router = useRouter();

  const features = lang === "fr" ? [
    { icon: BarChart2,  title: "Graphique avancé",      desc: "Bougies, Bollinger, EMA 50/200, niveaux clés" },
    { icon: Activity,   title: "Corrélations en direct", desc: "DXY, taux, VIX, pétrole — impact sur l'or en temps réel" },
    { icon: Zap,        title: "Paper trading Gold",    desc: "LONG / SHORT sur GC=F avec TP/SL suggérés" },
    { icon: Newspaper,  title: "Actualités filtrées",   desc: "Fed, inflation, géopolitique — les vrais drivers de l'or" },
    { icon: BookOpen,   title: "Formation dédiée",      desc: "Apprendre à trader l'or de A à Z" },
    { icon: Shield,     title: "Contexte macro live",   desc: "Taux réels, prochaine Fed, banques centrales" },
  ] : [
    { icon: BarChart2,  title: "Advanced chart",        desc: "Candles, Bollinger, EMA 50/200, key levels" },
    { icon: Activity,   title: "Live correlations",     desc: "DXY, yields, VIX, oil — real-time gold impact" },
    { icon: Zap,        title: "Gold paper trading",    desc: "LONG / SHORT on GC=F with suggested TP/SL" },
    { icon: Newspaper,  title: "Filtered news",         desc: "Fed, inflation, geopolitics — gold's real drivers" },
    { icon: BookOpen,   title: "Dedicated learning",    desc: "Learn to trade gold from A to Z" },
    { icon: Shield,     title: "Live macro context",    desc: "Real rates, next Fed meeting, central banks" },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-amber-400/3 blur-2xl" />
      </div>

      {/* Blurred preview cards in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 blur-sm select-none">
        <div className="grid grid-cols-3 gap-4 p-8 mt-16">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card h-24 rounded-xl bg-amber-500/5" />
          ))}
        </div>
        <div className="mx-8 mt-4 glass-card h-48 rounded-xl bg-amber-500/5" />
      </div>

      {/* Main gate card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Animated gold border */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-amber-500/40 via-yellow-400/20 to-amber-600/40 animate-pulse" />

        <div className="relative glass-card rounded-2xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Gem className="w-10 h-10 text-amber-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-card border border-white/10 flex items-center justify-center">
                <Lock className="w-3 h-3 text-amber-400" />
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-amber-400 mb-2">Gold Hub</h1>
            <p className="text-muted-foreground text-lg">
              {lang === "fr"
                ? "L'espace dédié au trading de l'or — bientôt disponible."
                : "The dedicated space for gold trading — coming soon."}
            </p>
          </div>

          {/* Dev notice */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300/80">
              {lang === "fr"
                ? "Cet espace est en cours de développement. L'accès est actuellement réservé aux administrateurs."
                : "This space is under development. Access is currently restricted to administrators."}
            </span>
          </div>

          {/* Feature preview grid */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/6">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-amber-400/70" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/80">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/premium")}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium transition-all"
          >
            {lang === "fr" ? "Découvrir le Premium" : "Discover Premium"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Correlation card ──────────────────────────────────────────────────────────
function CorrelCard({
  symbol, price, change, lang,
}: {
  symbol: string; price: number; change: number; lang: "fr" | "en";
}) {
  const cfg = CORREL_CONFIG[symbol];
  if (!cfg) return null;

  // goldImpact > 0 = bullish for gold, < 0 = bearish
  const goldImpact = cfg.direction * Math.sign(change);
  const isNeutral = Math.abs(change) < 0.1;

  const impactColor = isNeutral
    ? "text-muted-foreground"
    : goldImpact > 0 ? "text-amber-400" : "text-blue-400";
  const impactBg = isNeutral
    ? "bg-white/5 border-white/8"
    : goldImpact > 0 ? "bg-amber-500/8 border-amber-500/20" : "bg-blue-500/8 border-blue-500/20";

  const ImpactIcon = isNeutral ? Minus : goldImpact > 0 ? TrendingUp : TrendingDown;
  const impactLabel = isNeutral
    ? (lang === "fr" ? "Neutre" : "Neutral")
    : goldImpact > 0 ? (lang === "fr" ? "Haussier ↑ or" : "Bullish ↑ gold") : (lang === "fr" ? "Baissier ↓ or" : "Bearish ↓ gold");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-default group", impactBg)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{cfg.icon}</span>
          <span className="text-xs font-semibold text-foreground/90">
            {lang === "fr" ? cfg.label : cfg.labelEn}
          </span>
        </div>
        <span className={cn("text-xs font-bold", change >= 0 ? "text-profit" : "text-loss")}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>

      <div className={cn("flex items-center gap-1 text-xs font-medium", impactColor)}>
        <ImpactIcon className="w-3 h-3" />
        <span>{impactLabel}</span>
      </div>

      <p className="text-[10px] text-muted-foreground/60 mt-1.5 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
        {lang === "fr" ? cfg.reasonFr : cfg.reasonEn}
      </p>
    </motion.div>
  );
}

// ── Sentiment gauge ───────────────────────────────────────────────────────────
function SentimentGauge({ score, lang }: { score: number; lang: "fr" | "en" }) {
  const clamped = Math.max(0, Math.min(100, score));
  const label = clamped >= 65
    ? (lang === "fr" ? "Haussier" : "Bullish")
    : clamped <= 35
    ? (lang === "fr" ? "Baissier" : "Bearish")
    : (lang === "fr" ? "Neutre" : "Neutral");
  const color = clamped >= 65 ? "bg-amber-400" : clamped <= 35 ? "bg-blue-500" : "bg-muted-foreground";
  const textColor = clamped >= 65 ? "text-amber-400" : clamped <= 35 ? "text-blue-400" : "text-muted-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{lang === "fr" ? "Sentiment" : "Sentiment"}</span>
        <span className={cn("font-bold", textColor)}>{label}</span>
      </div>
      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/50">
        <span>{lang === "fr" ? "Baissier" : "Bearish"}</span>
        <span>{lang === "fr" ? "Haussier" : "Bullish"}</span>
      </div>
    </div>
  );
}

// ── Indicator row ─────────────────────────────────────────────────────────────
function IndicRow({ label, value, signal }: { label: string; value: string; signal: string }) {
  const isPos = /buy|bullish|haussier|surv/i.test(signal);
  const isNeg = /sell|bearish|baissier|overs/i.test(signal);
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-foreground/80">{value}</span>
        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded",
          isPos ? "bg-amber-500/15 text-amber-400" : isNeg ? "bg-blue-500/15 text-blue-400" : "bg-white/8 text-muted-foreground"
        )}>
          {signal}
        </span>
      </div>
    </div>
  );
}

// ── COMEX market status ───────────────────────────────────────────────────────
function getCOMEXStatus(): { status: "open" | "closed" | "break"; labelFr: string; labelEn: string } {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const etOffset = (month >= 3 && month <= 11) ? -4 : -5;
  const et = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + etOffset * 3600000);
  const day = et.getDay();
  const min = et.getHours() * 60 + et.getMinutes();
  if (day === 6) return { status: "closed", labelFr: "Fermé — ouvre dimanche 18h ET", labelEn: "Closed — opens Sunday 6 PM ET" };
  if (day === 0 && min < 18 * 60) return { status: "closed", labelFr: "Fermé — ouvre ce soir 18h ET", labelEn: "Closed — opens tonight 6 PM ET" };
  if (day === 5 && min >= 17 * 60) return { status: "closed", labelFr: "Fermé — ouvre dimanche 18h ET", labelEn: "Closed — opens Sunday 6 PM ET" };
  if (min >= 17 * 60 && min < 18 * 60) return { status: "break", labelFr: "Pause maintenance 17h–18h ET", labelEn: "Maintenance break 5–6 PM ET" };
  return { status: "open", labelFr: "COMEX ouvert", labelEn: "COMEX open" };
}

// ── Trading modal ─────────────────────────────────────────────────────────────
function TradingModal({
  direction, price, risk, onClose, formatPrice, lang,
}: {
  direction: "LONG" | "SHORT";
  price: number;
  risk: { suggested_tp: number; suggested_sl: number } | undefined;
  onClose: () => void;
  formatPrice: (v: number, sym: string) => string;
  lang: "fr" | "en";
}) {
  const [amount, setAmount]     = useState("100");
  const [leverage, setLeverage] = useState(1);
  const [tp, setTp]             = useState(risk?.suggested_tp?.toFixed(2) ?? "");
  const [sl, setSl]             = useState(risk?.suggested_sl?.toFixed(2) ?? "");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [balance, setBalance]   = useState<number | null>(null);

  useEffect(() => {
    walletAPI.getBalance().then(b => setBalance(b.balance)).catch(() => {});
  }, []);

  const isLong = direction === "LONG";
  const qty = price > 0 ? (parseFloat(amount) * leverage) / price : 0;

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      const res = await walletAPI.openPosition({
        symbol: "GC=F", direction,
        amount: parseFloat(amount),
        leverage,
        take_profit: tp ? parseFloat(tp) : undefined,
        stop_loss:   sl ? parseFloat(sl) : undefined,
      });
      setSuccess(lang === "fr"
        ? `Position ouverte à ${formatPrice(res.entry_price ?? price, "GC=F")}`
        : `Position opened at ${formatPrice(res.entry_price ?? price, "GC=F")}`);
    } catch (e: any) {
      setError(e?.message ?? (lang === "fr" ? "Erreur lors de l'ouverture" : "Failed to open position"));
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className={cn(
            "w-full max-w-md rounded-2xl p-6 space-y-5 border relative",
            isLong ? "bg-gradient-to-b from-amber-950/60 to-card/95 border-amber-500/30"
                   : "bg-gradient-to-b from-blue-950/60 to-card/95 border-blue-500/30"
          )}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border",
              isLong ? "bg-amber-500/15 border-amber-500/30" : "bg-blue-500/15 border-blue-500/30")}>
              {isLong ? <TrendingUp className="w-5 h-5 text-amber-400"/> : <TrendingDown className="w-5 h-5 text-blue-400"/>}
            </div>
            <div>
              <h3 className="font-bold text-lg">{direction} · XAU/USD</h3>
              <p className="text-sm text-muted-foreground">{formatPrice(price, "GC=F")} · {lang === "fr" ? "Paper trading" : "Paper trading"}</p>
            </div>
          </div>

          {success ? (
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-profit mx-auto"/>
              <p className="font-semibold text-profit">{success}</p>
              <button onClick={onClose} className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition-all">
                {lang === "fr" ? "Fermer" : "Close"}
              </button>
            </motion.div>
          ) : (
            <>
              {balance !== null && (
                <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/4 border border-white/8">
                  <span className="text-muted-foreground">{lang === "fr" ? "Solde disponible" : "Available balance"}</span>
                  <span className="font-bold">${balance.toFixed(2)}</span>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{lang === "fr" ? "Montant ($)" : "Amount ($)"}</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"/>
              </div>

              {/* Leverage */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{lang === "fr" ? "Levier" : "Leverage"}</span>
                  <span className={cn("font-bold", isLong ? "text-amber-400" : "text-blue-400")}>{leverage}×</span>
                </div>
                <input type="range" min="1" max="20" value={leverage} onChange={e => setLeverage(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5"/>
                <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1"><span>1×</span><span>20×</span></div>
              </div>

              {/* Qty estimate */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="px-3 py-2 rounded-lg bg-white/4 border border-white/8">
                  <p className="text-muted-foreground mb-0.5">{lang === "fr" ? "Exposition" : "Exposure"}</p>
                  <p className="font-bold">${(parseFloat(amount||"0") * leverage).toFixed(0)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/4 border border-white/8">
                  <p className="text-muted-foreground mb-0.5">{lang === "fr" ? "Qté (oz)" : "Qty (oz)"}</p>
                  <p className="font-bold">{qty.toFixed(4)}</p>
                </div>
              </div>

              {/* TP / SL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-profit mb-1.5 block">TP {lang === "fr" ? "(optionnel)" : "(optional)"}</label>
                  <input type="number" value={tp} onChange={e => setTp(e.target.value)} placeholder="—"
                    className="w-full bg-profit/5 border border-profit/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-profit/50"/>
                </div>
                <div>
                  <label className="text-xs text-loss mb-1.5 block">SL {lang === "fr" ? "(optionnel)" : "(optional)"}</label>
                  <input type="number" value={sl} onChange={e => setSl(e.target.value)} placeholder="—"
                    className="w-full bg-loss/5 border border-loss/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-loss/50"/>
                </div>
              </div>

              {error && <p className="text-xs text-loss bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={submit} disabled={loading || !amount || parseFloat(amount) <= 0}
                className={cn("w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  isLong ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-blue-600 hover:bg-blue-500 text-white",
                  (loading || !amount) && "opacity-50 cursor-not-allowed")}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : isLong ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                {loading ? (lang === "fr" ? "Ouverture..." : "Opening...") : `${direction} · ${leverage}× · $${amount}`}
              </button>

              <p className="text-[10px] text-muted-foreground/40 text-center">
                {lang === "fr" ? "Simulation uniquement — aucun argent réel." : "Simulation only — no real money."}
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Catalyst helpers ─────────────────────────────────────────────────────────
function getCatalystMeta(title: string, lang: "fr" | "en") {
  const t = title.toLowerCase();
  if (/fomc|rate decision|federal reserve/i.test(t))
    return { icon: "🏛️", desc: lang === "fr" ? "Décision de taux — impact majeur sur l'or" : "Rate decision — major gold impact", color: "amber" };
  if (/cpi|inflation|pce|price index/i.test(t))
    return { icon: "📊", desc: lang === "fr" ? "Inflation — indicateur clé pour l'or" : "Inflation data — key gold driver", color: "amber" };
  if (/payroll|nfp|employment|jobs/i.test(t))
    return { icon: "💼", desc: lang === "fr" ? "Emploi US — réaction or/dollar directe" : "US Jobs — direct gold/dollar reaction", color: "blue" };
  if (/gdp/i.test(t))
    return { icon: "📈", desc: lang === "fr" ? "Croissance US — contexte macro" : "US Growth — macro context", color: "blue" };
  return { icon: "📅", desc: lang === "fr" ? "Événement macro à surveiller" : "Macro event to watch", color: "white" };
}

function formatCatalystTime(ms: number, lang: "fr" | "en"): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 1) return lang === "fr" ? `dans ${d}j ${h}h` : `in ${d}d ${h}h`;
  if (d === 1) return lang === "fr" ? `dans 1j ${h}h` : `in 1d ${h}h`;
  if (h > 0) return lang === "fr" ? `dans ${h}h ${String(m).padStart(2,"0")}min` : `in ${h}h ${String(m).padStart(2,"0")}min`;
  return lang === "fr" ? `dans ${String(m).padStart(2,"0")}min` : `in ${String(m).padStart(2,"0")}min`;
}

// ── Gold AI Chat ──────────────────────────────────────────────────────────────
function GoldAIChat({
  analysis, corrPrices, lang,
}: {
  analysis: Analysis | null;
  corrPrices: Record<string, { price: number; change: number }>;
  lang: "fr" | "en";
}) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const SUGGESTED = lang === "fr" ? [
    "Faut-il acheter l'or maintenant ?",
    "Quel est l'impact d'un CPI élevé sur l'or ?",
    "Analyse le contexte macro pour l'or",
    "Comment trader l'or autour de la Fed ?",
  ] : [
    "Should I buy gold now?",
    "What's the impact of a high CPI on gold?",
    "Analyze the macro context for gold",
    "How to trade gold around Fed meetings?",
  ];

  const buildContext = () => {
    if (!analysis) return "Gold analysis not available.";
    const p = analysis.price.current;
    const ch = analysis.price.change;
    const score = analysis.score.total;
    const sig = analysis.signal?.text ?? "";
    const rsi = analysis.indicators?.rsi;
    const macd = analysis.indicators?.macd;
    const vix = corrPrices["^VIX"]?.change ?? 0;
    const dxy = corrPrices["DX-Y.NYB"]?.change ?? 0;
    const tnx = corrPrices["^TNX"]?.change ?? 0;
    return `GOLD HUB — Contexte marché actuel:
Prix GC=F: $${p.toFixed(2)} (${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%)
Signal technique: ${sig} (score ${score}/100)
RSI(14): ${(rsi?.value ?? 0).toFixed(1)} — ${rsi?.signal ?? ""}
MACD: ${macd?.signal ?? ""}
VIX: ${vix >= 0 ? "+" : ""}${vix.toFixed(1)}% (${vix > 0.5 ? "peur croissante → or positif" : vix < -0.5 ? "détente → pression sur or" : "stable"})
DXY (Dollar): ${dxy >= 0 ? "+" : ""}${dxy.toFixed(1)}% (${dxy > 0.3 ? "dollar fort → frein pour l'or" : dxy < -0.3 ? "dollar faible → soutien or" : "neutre"})
Taux 10 ans US: ${tnx >= 0 ? "+" : ""}${tnx.toFixed(1)}% (${tnx > 0.5 ? "taux en hausse → or sous pression" : tnx < -0.5 ? "taux en baisse → or soutenu" : "stable"})
Tu es un expert en trading de l'or (Gold, GC=F, XAU/USD). Réponds en ${lang === "fr" ? "français" : "English"}, sois concis et actionnable.`;
  };

  const send = async (msg: string) => {
    if (!msg.trim() || chatLoading) return;
    const userMsg = msg.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await aiAPI.chat(userMsg, buildContext());
      setMessages(prev => [...prev, { role: "assistant", content: res.response }]);
    } catch (e: any) {
      const msg = e?.message ?? (lang === "fr" ? "Erreur — réessayez." : "Error — please retry.");
      setMessages(prev => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center">
          <Bot className="w-3 h-3 text-amber-400" />
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {lang === "fr" ? "Gold AI — Posez vos questions" : "Gold AI — Ask your questions"}
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
          {lang === "fr" ? "Contexte live injecté" : "Live context injected"}
        </span>
      </div>

      <div className="rounded-2xl border border-amber-500/20 overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(35 80% 6%) 0%, hsl(220 30% 5%) 100%)" }}>

        {/* Suggested questions — shown when chat is empty */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-white/6">
              <p className="text-xs text-muted-foreground/50 mb-3 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400/50" />
                {lang === "fr" ? "Questions suggérées" : "Suggested questions"}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((q) => (
                  <motion.button key={q} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => send(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/18 text-amber-300/70 hover:bg-amber-500/18 hover:text-amber-300 hover:border-amber-500/30 transition-all">
                    {q}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {messages.length > 0 && (
          <div className="p-4 max-h-80 overflow-y-auto space-y-3 no-scrollbar">
            {messages.map((m, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-amber-500/15 border border-amber-500/20 text-amber-100 rounded-tr-sm"
                    : "bg-white/5 border border-white/8 text-foreground/90 rounded-tl-sm"
                )}>
                  {m.content}
                </div>
              </motion.div>
            ))}
            {chatLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/8 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {/* Input bar */}
        <div className={cn("p-3 flex gap-2 bg-black/15", messages.length > 0 && "border-t border-white/[0.06]")}>
          {messages.length > 0 && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setMessages([])}
              className="p-2 rounded-xl text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5 transition-all flex-shrink-0">
              <X className="w-4 h-4" />
            </motion.button>
          )}
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={lang === "fr" ? "Posez une question sur l'or..." : "Ask a question about gold..."}
            className="flex-1 bg-black/25 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/30 placeholder:text-muted-foreground/25 text-foreground/90 transition-colors"
          />
          <motion.button
            whileHover={{ scale: input.trim() && !chatLoading ? 1.05 : 1 }}
            whileTap={{ scale: input.trim() && !chatLoading ? 0.95 : 1 }}
            onClick={() => send(input)}
            disabled={chatLoading || !input.trim()}
            className={cn(
              "p-2.5 rounded-xl transition-all flex-shrink-0",
              input.trim() && !chatLoading
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                : "bg-white/5 text-muted-foreground/30 cursor-not-allowed"
            )}>
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Countdown to next COMEX open ─────────────────────────────────────────────
function useCountdownToNextOpen(): { secondsLeft: number; openTimeFR: string } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const month = now.getUTCMonth() + 1;
  const etOffset = (month >= 3 && month <= 11) ? -4 : -5;
  const frOffset = (month >= 3 && month <= 10) ? 2 : 1;

  // Express current time in ET using UTC arithmetic
  const etDate = new Date(now.getTime() + etOffset * 3600000);
  const etDow = etDate.getUTCDay();
  const etMinOfDay = etDate.getUTCHours() * 60 + etDate.getUTCMinutes();

  let nextOpenET: Date | null = null;

  if (etDow === 6) {
    nextOpenET = new Date(etDate);
    nextOpenET.setUTCDate(nextOpenET.getUTCDate() + 1);
    nextOpenET.setUTCHours(18, 0, 0, 0);
  } else if (etDow === 0 && etMinOfDay < 18 * 60) {
    nextOpenET = new Date(etDate);
    nextOpenET.setUTCHours(18, 0, 0, 0);
  } else if (etDow === 5 && etMinOfDay >= 17 * 60) {
    nextOpenET = new Date(etDate);
    nextOpenET.setUTCDate(nextOpenET.getUTCDate() + 2);
    nextOpenET.setUTCHours(18, 0, 0, 0);
  } else if (etMinOfDay >= 17 * 60 && etMinOfDay < 18 * 60) {
    nextOpenET = new Date(etDate);
    nextOpenET.setUTCHours(18, 0, 0, 0);
  }

  if (!nextOpenET) return { secondsLeft: 0, openTimeFR: "" };

  const nextOpenUTC = nextOpenET.getTime() - etOffset * 3600000;
  const secondsLeft = Math.max(0, Math.floor((nextOpenUTC - now.getTime()) / 1000));

  const nextFR = new Date(nextOpenUTC + frOffset * 3600000);
  const frDays = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const openTimeFR = `${frDays[nextFR.getUTCDay()]} ${String(nextFR.getUTCHours()).padStart(2,"0")}h${String(nextFR.getUTCMinutes()).padStart(2,"0")}`;

  return { secondsLeft, openTimeFR };
}

function formatCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min ${String(sec).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}min ${String(sec).padStart(2, "0")}s`;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GoldPage() {
  const { isAdmin, isLoading: isPremiumLoading } = usePremium();
  const { lang } = useLanguage();
  const formatPrice = useFormatPrice();
  const router = useRouter();

  const [tradeDir, setTradeDir]      = useState<"LONG" | "SHORT" | null>(null);
  const [analysis, setAnalysis]     = useState<Analysis | null>(null);
  const [corrPrices, setCorrPrices]  = useState<Record<string, { price: number; change: number }>>({});
  const [news, setNews]              = useState<{ title: string; publisher?: string; link?: string; timestamp?: number }[]>([]);
  const [loading, setLoading]        = useState(true);
  const [timeframe, setTimeframe]    = useState("1d");
  const [goldPublic, setGoldPublic]      = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [tfData, setTfData]              = useState<Record<string, Analysis | null>>({});
  const [catalysts, setCatalysts]        = useState<any[]>([]);
  const [nowTick, setNowTick]            = useState(() => Date.now());
  const countdown = useCountdownToNextOpen();

  // Wait for premium status to resolve, then check Gold Hub access
  useEffect(() => {
    if (isPremiumLoading) return;         // Not ready yet
    if (isAdmin) { setSettingsLoaded(true); return; }
    adminAPI.getSettings()
      .then((data) => {
        const setting = data.settings.find((s: { key: string; value: string }) => s.key === "gold_hub_enabled");
        setGoldPublic(setting?.value === "true");
      })
      .catch(() => setGoldPublic(false))
      .finally(() => setSettingsLoaded(true));
  }, [isAdmin, isPremiumLoading]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisData, pricesData, newsData] = await Promise.allSettled([
        analysisAPI.analyze("GC=F", timeframe),
        marketAPI.getPrices(CORREL_SYMBOLS),
        aiAPI.getMarketNews(),
      ]);
      if (analysisData.status === "fulfilled") setAnalysis(analysisData.value);
      if (pricesData.status === "fulfilled")   setCorrPrices(pricesData.value.prices ?? {});
      if (newsData.status === "fulfilled") {
        const all = newsData.value.news ?? [];
        const goldKeywords = /gold|or\b|xau|comex|fed|federal|inflation|taux|rates?|banque centrale|central bank|géopo|geopo|dollar|dxy/i;
        setNews(all.filter((n) => goldKeywords.test(n.title)).slice(0, 6));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (settingsLoaded && (isAdmin || goldPublic)) load();
  }, [settingsLoaded, isAdmin, goldPublic, load]);

  // Progressive multi-timeframe fetch
  useEffect(() => {
    if (!settingsLoaded || (!isAdmin && !goldPublic)) return;
    (["1h", "4h", "1w"] as const).forEach(tf => {
      analysisAPI.analyze("GC=F", tf)
        .then(d => setTfData(prev => ({ ...prev, [tf]: d })))
        .catch(() => setTfData(prev => ({ ...prev, [tf]: null })));
    });
  }, [settingsLoaded, isAdmin, goldPublic]);

  // Economic calendar for gold catalysts
  useEffect(() => {
    if (!settingsLoaded || (!isAdmin && !goldPublic)) return;
    toolsAPI.getEconomicCalendar(30)
      .then((data: any) => {
        const goldKw = /fomc|fed |rate decision|federal reserve|cpi|inflation|payroll|nfp|gdp|pce/i;
        const filtered = (data?.events ?? data?.calendar ?? [])
          .filter((e: any) => /high/i.test(e.importance ?? "") && goldKw.test(e.title ?? e.event ?? ""))
          .filter((e: any) => new Date(e.date ?? e.datetime ?? e.time).getTime() > Date.now())
          .sort((a: any, b: any) => new Date(a.date ?? a.datetime).getTime() - new Date(b.date ?? b.datetime).getTime())
          .slice(0, 3);
        setCatalysts(filtered);
      })
      .catch(() => {});
  }, [settingsLoaded, isAdmin, goldPublic]);

  // Tick every minute for catalyst countdowns
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Spinner while premium status or settings are loading
  if (isPremiumLoading || !settingsLoaded) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
    </div>
  );

  // Gate: admin-only while in dev
  if (!isAdmin && !goldPublic) return <GoldHubDevGate />;

  const price       = analysis?.price.current ?? 0;
  const change      = analysis?.price.change ?? 0;
  const signal      = analysis?.signal;
  const score       = analysis?.score.total ?? 50;
  const levels      = analysis?.levels;
  const risk        = analysis?.risk;
  const indics      = analysis?.indicators;
  const perf        = analysis?.performance ?? {};
  const fib         = analysis?.fibonacci;
  const isUp        = change >= 0;

  // Risk-On / Risk-Off from live data
  const vixChange   = corrPrices["^VIX"]?.change ?? 0;
  const dxyChange   = corrPrices["DX-Y.NYB"]?.change ?? 0;
  const tnxChange   = corrPrices["^TNX"]?.change ?? 0;
  const riskScore   = vixChange * 0.5 - dxyChange * 0.3 - tnxChange * 0.2;
  const riskEnv     = riskScore > 0.3 ? "risk-off" : riskScore < -0.3 ? "risk-on" : "neutral";
  const comex    = getCOMEXStatus();
  const newsItems = [
    ...(analysis?.news ?? []).map(n => ({ title: n.title ?? "", publisher: n.publisher, link: n.link, date: n.date })),
    ...news.filter(n => !(analysis?.news ?? []).some(a => a.title === n.title)),
  ].filter(n => n.title).slice(0, 8);

  const TIMEFRAMES = ["1h", "1d", "1w", "1mo", "3mo"];

  return (
    <>
      <TopLoadingBar isLoading={loading} />
      {tradeDir && (
        <TradingModal
          direction={tradeDir}
          price={price}
          risk={risk}
          onClose={() => setTradeDir(null)}
          formatPrice={formatPrice}
          lang={lang}
        />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 pb-8"
      >

        {/* ── Hero banner ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/50 via-card/90 to-card/70"
        >
          {/* Background glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-600/6 blur-2xl" />
            {/* Animated diagonal lines */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="diag" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="40" stroke="#F59E0B" strokeWidth="1"/>
              </pattern></defs>
              <rect width="100%" height="100%" fill="url(#diag)"/>
            </svg>
          </div>

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: title + price */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Gem className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-2xl font-bold text-amber-400">Gold Hub</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400/80 font-medium">
                      XAU/USD · GC=F
                    </span>
                    <span className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium border",
                      comex.status === "open"   ? "bg-profit/15 border-profit/30 text-profit"
                      : comex.status === "break" ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
                      :                            "bg-loss/15 border-loss/30 text-loss"
                    )}>
                      <Circle className={cn("w-1.5 h-1.5 fill-current",
                        comex.status === "open" && "animate-pulse")} />
                      {lang === "fr" ? comex.labelFr : comex.labelEn}
                    </span>
                  </div>
                  {loading ? (
                    <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg" />
                  ) : (
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-foreground">
                        {price > 0 ? formatPrice(price, "GC=F") : "—"}
                      </span>
                      <span className={cn("text-xl font-semibold", isUp ? "text-amber-400" : "text-blue-400")}>
                        {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {comex.status !== "open" && countdown.secondsLeft > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
                      <Timer className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
                      <span>
                        {lang === "fr" ? "Ouverture dans " : "Opens in "}
                        <span className="font-mono font-bold text-amber-400">{formatCountdown(countdown.secondsLeft)}</span>
                        <span className="text-muted-foreground/40 ml-1">· {countdown.openTimeFR} (Paris)</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: signal + controls */}
              <div className="flex flex-col items-start md:items-end gap-3">
                {signal && !loading && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <span className="text-xl">{signal.emoji}</span>
                    <span className="text-sm font-semibold text-amber-300">{signal.text}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {/* Timeframe selector */}
                  <div className="flex items-center rounded-lg bg-white/5 border border-white/8 p-0.5 text-xs">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all font-medium",
                          timeframe === tf ? "bg-amber-500/80 text-black" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={load}
                    disabled={loading}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground"
                  >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  </button>
                </div>
              </div>
            </div>

            {/* High / Low / Support / Resistance */}
            {!loading && analysis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[
                  { label: lang === "fr" ? "Plus haut 24h" : "24h High", value: formatPrice(analysis.price.high_24h, "GC=F"), color: "text-amber-400" },
                  { label: lang === "fr" ? "Plus bas 24h" : "24h Low",   value: formatPrice(analysis.price.low_24h, "GC=F"),  color: "text-blue-400" },
                  { label: lang === "fr" ? "Support"    : "Support",     value: levels ? formatPrice(levels.support, "GC=F") : "—", color: "text-profit" },
                  { label: lang === "fr" ? "Résistance" : "Resistance",  value: levels ? formatPrice(levels.resistance, "GC=F") : "—", color: "text-loss" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-4 py-3 rounded-xl bg-white/4 border border-white/6">
                    <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                    <p className={cn("text-sm font-bold", color)}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Multi-timeframe matrix ────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-amber-400"/>
            {lang === "fr" ? "Analyse multi-timeframe" : "Multi-timeframe analysis"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { tf: "1h",  label: lang === "fr" ? "1 Heure"   : "1 Hour",  d: tfData["1h"]  },
              { tf: "4h",  label: lang === "fr" ? "4 Heures"  : "4 Hours", d: tfData["4h"]  },
              { tf: "1d",  label: lang === "fr" ? "1 Jour"    : "1 Day",   d: analysis       },
              { tf: "1w",  label: lang === "fr" ? "1 Semaine" : "1 Week",  d: tfData["1w"]  },
            ] as { tf: string; label: string; d: Analysis | null | undefined }[]).map(({ tf, label, d }, i) => {
              const score  = d?.score.total ?? null;
              const sig    = d?.signal;
              const isPos  = sig ? /buy|bullish/i.test(sig.text)  : null;
              const isNeg  = sig ? /sell|bearish/i.test(sig.text) : null;
              const isReady = tf === "1d" ? !loading : d !== undefined;
              return (
                <motion.div key={tf}
                  initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 + i * 0.07, type: "spring", stiffness: 200, damping: 18 }}
                  className={cn(
                    "glass-card p-4 rounded-2xl border transition-all relative overflow-hidden group",
                    isPos ? "border-amber-500/30 bg-gradient-to-b from-amber-500/8 to-transparent"
                    : isNeg ? "border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent"
                    : "border-white/8"
                  )}>
                  {/* Ambient glow */}
                  {isPos && <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-amber-500/15 blur-xl pointer-events-none"/>}
                  {isNeg && <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-blue-500/10 blur-xl pointer-events-none"/>}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
                    {isReady && score !== null && (
                      <span className={cn("text-xs font-bold tabular-nums",
                        isPos ? "text-amber-400" : isNeg ? "text-blue-400" : "text-muted-foreground")}>
                        {score}<span className="text-muted-foreground/40 font-normal">/100</span>
                      </span>
                    )}
                  </div>

                  {!isReady ? (
                    <div className="space-y-2">
                      <div className="h-8 w-8 bg-white/5 animate-pulse rounded-lg mx-auto"/>
                      <div className="h-3 bg-white/5 animate-pulse rounded-full"/>
                      <div className="h-1.5 bg-white/5 animate-pulse rounded-full"/>
                    </div>
                  ) : d ? (
                    <>
                      <div className="text-center mb-2">
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.07, type: "spring", stiffness: 300 }}
                          className="text-3xl inline-block">
                          {sig?.emoji ?? "⚪"}
                        </motion.span>
                      </div>
                      <p className={cn("text-xs font-semibold text-center mb-3",
                        isPos ? "text-amber-400" : isNeg ? "text-blue-400" : "text-muted-foreground")}>
                        {sig?.text ?? "—"}
                      </p>
                      {score !== null && (
                        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${score}%` }}
                            transition={{ delay: 0.3 + i * 0.07, duration: 0.9, ease: "easeOut" }}
                            className={cn("h-full rounded-full",
                              score >= 60 ? "bg-gradient-to-r from-amber-500/80 to-amber-400"
                              : score <= 40 ? "bg-gradient-to-r from-blue-600/80 to-blue-400"
                              : "bg-white/30")}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/30 text-center py-2">—</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Correlations ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {lang === "fr" ? "Facteurs influençant l'or" : "Gold influencing factors"}
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-white/3 animate-pulse rounded-xl border border-white/6" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {CORREL_SYMBOLS.map((sym) => {
                const p = corrPrices[sym.toUpperCase()] ?? corrPrices[sym];
                if (!p) return (
                  <div key={sym} className="glass-card p-3 rounded-xl border border-white/6 opacity-40">
                    <p className="text-xs text-muted-foreground">{CORREL_CONFIG[sym]?.label}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">—</p>
                  </div>
                );
                return (
                  <CorrelCard key={sym} symbol={sym} price={p.price} change={p.change} lang={lang} />
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/40 mt-2">
            {lang === "fr"
              ? "Survolez une carte pour comprendre le lien avec l'or."
              : "Hover a card to understand its relationship with gold."}
          </p>
        </motion.div>

        {/* ── Performance comparative ───────────────────────────────────── */}
        {!loading && Object.keys(perf).length > 0 && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400"/>
              {lang === "fr" ? "Performance Gold" : "Gold Performance"}
            </h2>
            <div className="glass-card rounded-xl border border-amber-500/10 p-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {([ ["1j","1d"], ["1S","1w"], ["1M","1m"], ["3M","3m"], ["6M","6m"], ["YTD","ytd"] ] as [string,string][])
                  .filter(([,k]) => perf[k as keyof typeof perf] != null)
                  .map(([label, key], i) => {
                    const val = (perf[key as keyof typeof perf] ?? 0) as number;
                    const abs = Math.abs(val);
                    const isPos = val >= 0;
                    return (
                      <motion.div key={key} initial={{ opacity:0, scaleY:0 }} animate={{ opacity:1, scaleY:1 }}
                        transition={{ delay: 0.2 + i*0.05, type:"spring", stiffness:200 }}
                        className="flex flex-col items-center gap-2">
                        <span className={cn("text-sm font-bold", isPos ? "text-amber-400" : "text-blue-400")}>
                          {isPos ? "+" : ""}{val.toFixed(2)}%
                        </span>
                        <div className="w-full h-16 flex items-end justify-center">
                          <motion.div
                            initial={{ height:0 }} animate={{ height:`${Math.min(abs * 6, 60)}px` }}
                            transition={{ delay: 0.3 + i*0.05, duration:0.6, ease:"easeOut" }}
                            className={cn("w-5 rounded-t-sm", isPos ? "bg-amber-500/60" : "bg-blue-500/60")}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">{label}</span>
                      </motion.div>
                    );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Market environment ────────────────────────────────────────── */}
        {!loading && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
            <div className={cn(
              "rounded-2xl border p-5 flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden",
              riskEnv === "risk-off" ? "border-amber-500/25 bg-gradient-to-r from-amber-950/30 to-card/60"
              : riskEnv === "risk-on" ? "border-blue-500/20 bg-gradient-to-r from-blue-950/20 to-card/60"
              : "border-white/8 bg-card/40"
            )}>
              <div className="absolute right-0 top-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: riskEnv === "risk-off" ? "#F59E0B" : riskEnv === "risk-on" ? "#3B82F6" : "white" }}/>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 text-2xl",
                riskEnv === "risk-off" ? "bg-amber-500/15 border-amber-500/30"
                : riskEnv === "risk-on" ? "bg-blue-500/15 border-blue-500/30"
                : "bg-white/5 border-white/10")}>
                {riskEnv === "risk-off" ? "🛡️" : riskEnv === "risk-on" ? "📈" : "⚖️"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-base font-bold",
                    riskEnv === "risk-off" ? "text-amber-400" : riskEnv === "risk-on" ? "text-blue-400" : "text-foreground")}>
                    {riskEnv === "risk-off"
                      ? (lang === "fr" ? "Environnement Risk-Off" : "Risk-Off Environment")
                      : riskEnv === "risk-on"
                      ? (lang === "fr" ? "Environnement Risk-On" : "Risk-On Environment")
                      : (lang === "fr" ? "Environnement Neutre" : "Neutral Environment")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {riskEnv === "risk-off"
                    ? (lang === "fr"
                      ? `VIX ${vixChange>=0?"+":""}${vixChange.toFixed(1)}% · DXY ${dxyChange>=0?"+":""}${dxyChange.toFixed(1)}% — peur des marchés, l'or est recherché comme valeur refuge.`
                      : `VIX ${vixChange>=0?"+":""}${vixChange.toFixed(1)}% · DXY ${dxyChange>=0?"+":""}${dxyChange.toFixed(1)}% — market fear, gold sought as safe haven.`)
                    : riskEnv === "risk-on"
                    ? (lang === "fr"
                      ? `VIX ${vixChange>=0?"+":""}${vixChange.toFixed(1)}% · les investisseurs privilégient les actifs risqués — pression légère sur l'or.`
                      : `VIX ${vixChange>=0?"+":""}${vixChange.toFixed(1)}% · investors favor risk assets — slight pressure on gold.`)
                    : (lang === "fr"
                      ? "Signaux mixtes — pas de tendance macro dominante pour l'or en ce moment."
                      : "Mixed signals — no dominant macro trend for gold right now.")}
                </p>
              </div>
              <div className={cn("text-xs font-medium px-3 py-1.5 rounded-lg border whitespace-nowrap",
                riskEnv === "risk-off" ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : riskEnv === "risk-on" ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                : "bg-white/5 border-white/10 text-muted-foreground")}>
                {riskEnv === "risk-off"
                  ? (lang === "fr" ? "Favorable à l'or ✓" : "Favorable for gold ✓")
                  : riskEnv === "risk-on"
                  ? (lang === "fr" ? "Pression sur l'or" : "Pressure on gold")
                  : (lang === "fr" ? "Neutre" : "Neutral")}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Chart + Metrics ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden border border-amber-500/10">
            <div className="px-4 py-3 border-b border-white/6 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">
                {lang === "fr" ? "Graphique Gold (GC=F)" : "Gold chart (GC=F)"}
              </span>
            </div>
            <div className="p-2">
              <PremiumChart symbol="GC=F" timeframe={timeframe} />
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Sentiment */}
            <div className="glass-card p-4 rounded-xl border border-amber-500/10">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {lang === "fr" ? "Score technique" : "Technical score"}
              </h3>
              <SentimentGauge score={score} lang={lang} />
              {!loading && (
                <div className="mt-4 text-center">
                  <span className="text-4xl font-bold text-amber-400">{score}</span>
                  <span className="text-muted-foreground text-sm"> / 100</span>
                </div>
              )}
            </div>

            {/* Key indicators */}
            {!loading && indics && (
              <div className="glass-card p-4 rounded-xl border border-amber-500/10">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {lang === "fr" ? "Indicateurs clés" : "Key indicators"}
                </h3>
                <IndicRow
                  label="RSI (14)"
                  value={(indics.rsi.value ?? 0).toFixed(1)}
                  signal={indics.rsi.signal}
                />
                <IndicRow
                  label="MACD"
                  value={(indics.macd.histogram ?? 0).toFixed(2)}
                  signal={indics.macd.signal}
                />
                <IndicRow
                  label="EMA 50"
                  value={formatPrice(indics.ema.ema50, "GC=F")}
                  signal={price > indics.ema.ema50 ? (lang === "fr" ? "Au-dessus" : "Above") : (lang === "fr" ? "En-dessous" : "Below")}
                />
                {indics.ema.ema200 && (
                  <IndicRow
                    label="EMA 200"
                    value={formatPrice(indics.ema.ema200, "GC=F")}
                    signal={price > indics.ema.ema200 ? (lang === "fr" ? "Au-dessus" : "Above") : (lang === "fr" ? "En-dessous" : "Below")}
                  />
                )}
                <IndicRow
                  label="Bollinger"
                  value={indics.bollinger.position}
                  signal={indics.bollinger.position}
                />
              </div>
            )}

            {/* Paper trading CTA */}
            <div className="glass-card p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-300">
                  {lang === "fr" ? "Paper Trading Gold" : "Gold Paper Trading"}
                </h3>
              </div>
              {risk && !loading && (
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="px-2 py-1.5 rounded-lg bg-profit/10 border border-profit/20">
                    <p className="text-muted-foreground">TP suggéré</p>
                    <p className="font-bold text-profit">{formatPrice(risk.suggested_tp, "GC=F")}</p>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-loss/10 border border-loss/20">
                    <p className="text-muted-foreground">SL suggéré</p>
                    <p className="font-bold text-loss">{formatPrice(risk.suggested_sl, "GC=F")}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeDir("LONG")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-black font-bold text-sm transition-all"
                >
                  <TrendingUp className="w-4 h-4" />
                  LONG
                </button>
                <button
                  onClick={() => setTradeDir("SHORT")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 font-bold text-sm transition-all"
                >
                  <TrendingDown className="w-4 h-4" />
                  SHORT
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Macro catalysts ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5 text-amber-400"/>
            {lang === "fr" ? "Prochains catalyseurs Gold" : "Upcoming Gold catalysts"}
          </h2>
          {catalysts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {catalysts.map((event: any, i: number) => {
                const meta = getCatalystMeta(event.title ?? event.event ?? "", lang);
                const eventDate = new Date(event.date ?? event.datetime ?? event.time);
                const msLeft = eventDate.getTime() - nowTick;
                const urgency = msLeft < 86400000 * 2;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 180 }}
                    className={cn(
                      "glass-card p-4 rounded-2xl border transition-all relative overflow-hidden",
                      urgency ? "border-amber-500/35 bg-gradient-to-br from-amber-950/30 to-card/60"
                               : "border-white/8 hover:border-amber-500/20"
                    )}>
                    {urgency && <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"/>}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.icon}</span>
                        <span className="text-xs font-semibold text-foreground/90 leading-tight">
                          {event.title ?? event.event}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 mb-3 leading-snug">{meta.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-bold tabular-nums font-mono",
                        urgency ? "text-amber-400" : "text-muted-foreground"
                      )}>
                        {formatCatalystTime(msLeft, lang)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40">
                        {eventDate.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {urgency && (
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-amber-400"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: "🏛️", title: lang === "fr" ? "FOMC Meeting" : "FOMC Meeting", desc: lang === "fr" ? "Décision de taux Fed — driver majeur" : "Fed rate decision — major driver" },
                { icon: "📊", title: "CPI / Inflation",                                 desc: lang === "fr" ? "Inflation US — clé pour l'or"         : "US Inflation — key for gold" },
                { icon: "💼", title: "Nonfarm Payrolls",                                desc: lang === "fr" ? "Emploi US — réaction or/dollar"        : "US Jobs — gold/dollar reaction" },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="glass-card p-4 rounded-2xl border border-white/6 opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-semibold">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/50">{item.desc}</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-2">
                    {lang === "fr" ? "Dates à venir" : "Upcoming dates"}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Gold AI Chat ──────────────────────────────────────────────── */}
        <GoldAIChat analysis={analysis} corrPrices={corrPrices} lang={lang} />

        {/* ── News ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {lang === "fr" ? "Actualités Gold & Macro" : "Gold & Macro News"}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground/50">
              {lang === "fr" ? "Fed · Inflation · Géopolitique" : "Fed · Inflation · Geopolitics"}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-white/3 animate-pulse rounded-xl border border-white/6" />
              ))}
            </div>
          ) : newsItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {newsItems.map((item, i) => (
                <motion.a
                  key={i}
                  href={item.link && item.link !== "#" ? item.link : undefined}
                  target={item.link && item.link !== "#" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "glass-card p-4 rounded-xl border border-white/6 transition-all group flex flex-col justify-between",
                    item.link && item.link !== "#" ? "hover:border-amber-500/25 cursor-pointer" : "cursor-default"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground/90 group-hover:text-amber-300 transition-colors leading-snug line-clamp-3 mb-3">
                      {item.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                      <span className="text-[11px] text-muted-foreground/60">{item.publisher ?? "Gold news"}</span>
                    </div>
                    {item.link && item.link !== "#" && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400/50 group-hover:text-amber-400 transition-colors font-medium">
                        {lang === "fr" ? "Lire" : "Read"}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </motion.a>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 rounded-xl border border-white/6 text-center text-muted-foreground text-sm">
              {lang === "fr" ? "Aucune actualité Gold disponible pour le moment." : "No gold news available at the moment."}
            </div>
          )}
        </motion.div>

        {/* ── Learn section (coming soon) ───────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
          className="relative overflow-hidden rounded-2xl border border-dashed border-amber-500/20 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-950/20 to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-amber-400/70" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-300/80">
                  {lang === "fr" ? "Formation — Apprendre à trader l'or" : "Learn — How to trade gold"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {lang === "fr"
                    ? "Les drivers de l'or, corrélations macro, erreurs classiques, timing autour de la Fed — bientôt disponible."
                    : "Gold drivers, macro correlations, common mistakes, timing around Fed meetings — coming soon."}
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400/70 text-xs font-medium whitespace-nowrap">
              {lang === "fr" ? "Bientôt" : "Coming soon"}
            </span>
          </div>
        </motion.div>

        {/* Source disclaimer */}
        <p className="text-[11px] text-muted-foreground/30 text-center">
          {lang === "fr"
            ? "Données via Yahoo Finance · ~1 min de différé · Simulateur uniquement — pas de conseil financier."
            : "Data via Yahoo Finance · ~1 min delay · Simulator only — not financial advice."}
        </p>

      </motion.div>
    </>
  );
}
