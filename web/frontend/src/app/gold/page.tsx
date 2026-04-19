"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Gem, TrendingUp, TrendingDown, Minus, RefreshCw, Lock, ArrowRight,
  Newspaper, ExternalLink, BookOpen, Zap, Shield, BarChart2, Loader2,
  AlertTriangle, Activity, Circle, X, DollarSign, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analysisAPI, marketAPI, aiAPI, adminAPI, walletAPI, Analysis } from "@/lib/api";
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
                  .filter(([,k]) => perf[k as keyof typeof perf] !== undefined)
                  .map(([label, key], i) => {
                    const val = perf[key as keyof typeof perf] as number;
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
                  value={indics.rsi.value.toFixed(1)}
                  signal={indics.rsi.signal}
                />
                <IndicRow
                  label="MACD"
                  value={indics.macd.histogram.toFixed(2)}
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
