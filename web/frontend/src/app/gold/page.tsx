"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Gem,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Lock,
  ArrowRight,
  Newspaper,
  ExternalLink,
  BookOpen,
  Zap,
  Shield,
  BarChart2,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Target,
  Activity,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { analysisAPI, marketAPI, aiAPI, adminAPI, Analysis } from "@/lib/api";
import { usePremium } from "@/lib/PremiumContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useFormatPrice, useSettings } from "@/lib/SettingsContext";
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GoldPage() {
  const { isAdmin } = usePremium();
  const { lang } = useLanguage();
  const formatPrice = useFormatPrice();
  const router = useRouter();

  const [analysis, setAnalysis]     = useState<Analysis | null>(null);
  const [corrPrices, setCorrPrices]  = useState<Record<string, { price: number; change: number }>>({});
  const [news, setNews]              = useState<{ title: string; publisher?: string; link?: string; timestamp?: number }[]>([]);
  const [loading, setLoading]        = useState(true);
  const [timeframe, setTimeframe]    = useState("1d");
  const [goldPublic, setGoldPublic]  = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(!isAdmin);

  // Check if Gold Hub is public (for non-admins)
  useEffect(() => {
    if (isAdmin) { setCheckingAccess(false); return; }
    adminAPI.getSettings()
      .then((data) => {
        const setting = data.settings.find((s: { key: string; value: string }) => s.key === "gold_hub_enabled");
        setGoldPublic(setting?.value === "true");
      })
      .catch(() => setGoldPublic(false))
      .finally(() => setCheckingAccess(false));
  }, [isAdmin]);

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
    if (isAdmin || goldPublic) load();
  }, [isAdmin, goldPublic, load]);

  // Still checking access
  if (checkingAccess) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
    </div>
  );

  // Gate: admin-only while in dev
  if (!isAdmin && !goldPublic) return <GoldHubDevGate />;

  const price    = analysis?.price.current ?? 0;
  const change   = analysis?.price.change ?? 0;
  const signal   = analysis?.signal;
  const score    = analysis?.score.total ?? 50;
  const levels   = analysis?.levels;
  const risk     = analysis?.risk;
  const indics   = analysis?.indicators;
  const isUp     = change >= 0;

  const TIMEFRAMES = ["1h", "1d", "1w", "1mo", "3mo"];

  return (
    <>
      <TopLoadingBar isLoading={loading} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 pb-8"
      >

        {/* ── Hero banner ───────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-card/80 to-card/60">
          {/* Background shimmer */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-amber-500/8 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-600/5 blur-2xl" />
          </div>

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: title + price */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Gem className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-amber-400">Gold Hub</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400/80 font-medium">
                      XAU/USD · GC=F
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
        </div>

        {/* ── Correlations ─────────────────────────────────────────────── */}
        <div>
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
        </div>

        {/* ── Chart + Metrics ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  onClick={() => router.push("/trading?symbol=GC%3DF&direction=LONG")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-black font-bold text-sm transition-all"
                >
                  <TrendingUp className="w-4 h-4" />
                  LONG
                </button>
                <button
                  onClick={() => router.push("/trading?symbol=GC%3DF&direction=SHORT")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 font-bold text-sm transition-all"
                >
                  <TrendingDown className="w-4 h-4" />
                  SHORT
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── News ─────────────────────────────────────────────────────── */}
        <div>
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
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-white/3 animate-pulse rounded-xl border border-white/6" />
              ))}
            </div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {news.map((item, i) => (
                <motion.a
                  key={i}
                  href={item.link ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 rounded-xl border border-white/6 hover:border-amber-500/20 transition-all group block"
                >
                  <p className="text-sm font-medium text-foreground/90 group-hover:text-amber-300 transition-colors leading-snug line-clamp-3">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-muted-foreground/50">{item.publisher}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-amber-400/50 transition-colors" />
                  </div>
                </motion.a>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 rounded-xl border border-white/6 text-center text-muted-foreground text-sm">
              {lang === "fr" ? "Aucune actualité Gold disponible pour le moment." : "No gold news available at the moment."}
            </div>
          )}
        </div>

        {/* ── Learn section (coming soon) ───────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-amber-500/20 p-6">
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
        </div>

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
