"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  Loader2,
  Star,
  StarOff,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUpIcon,
  Gauge,
  LineChart,
  Calendar,
  Globe,
  Shield,
  Clock,
  DollarSign,
  PieChart,
  Briefcase,
  Eye,
  TrendingUp as TrendUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Lightbulb,
  BookOpen,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Flame,
  Sparkles,
  Brain,
  CircleDot,
  AlertCircle,
  Plus,
  RefreshCw,
  Timer,
  GraduationCap,
  X,
  Bot,
  Bell,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { analysisAPI, favoritesAPI, aiAPI, marketAPI, Analysis, portfolioAPI, RealPosition, missionsAPI, BacktestResult, alertsAPI, PriceAlert } from "@/lib/api";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { useFormatCurrency, useFormatPrice, useSettings } from "@/lib/SettingsContext";
import { getStyle, type TradingStyleProfile } from "@/lib/tradingStyle";
import { authHeaders } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import dynamic from "next/dynamic";
const PremiumChart = dynamic(() => import("@/components/PremiumChart"), {
  ssr: false,
  loading: () => <div className="h-[300px] sm:h-[420px] bg-card/30 animate-pulse rounded-xl" />,
});
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { HelpGuide } from "@/components/ui/HelpGuide";

// ── Real Position Banner ──────────────────────────────────────────────────────
function RealPositionBanner({
  position,
  currentPrice,
  signal,
  trend,
}: {
  position: RealPosition;
  currentPrice: number;
  signal?: { text: string; emoji: string };
  trend?: string;
}) {
  const { t } = useLanguage();
  const isLong = position.position_type === "long";
  const lev = position.leverage ?? 1;
  const invested = position.entry_price * position.quantity;
  const pnl = isLong
    ? (currentPrice - position.entry_price) * position.quantity * lev
    : (position.entry_price - currentPrice) * position.quantity * lev;
  const pnlPct = invested ? (pnl / invested) * 100 : 0;
  const isProfit = pnl >= 0;

  const nearSL =
    position.stop_loss &&
    Math.abs((currentPrice - position.stop_loss) / currentPrice) < 0.05;

  const nearTP =
    position.take_profit &&
    Math.abs((currentPrice - position.take_profit) / currentPrice) < 0.03;

  // Determine if technical signal aligns with the position
  const signalText = signal?.text ?? "";
  const isBuySignal = signalText.includes("BUY") || signalText.includes("ACHAT");
  const isSellSignal = signalText.includes("SELL") || signalText.includes("VENTE");
  const trendBullish = trend === "BULLISH" || trend === "HAUSSIER";
  const trendBearish = trend === "BEARISH" || trend === "BAISSIER";

  const aligned =
    (isLong && (isBuySignal || trendBullish)) ||
    (!isLong && (isSellSignal || trendBearish));
  const contradicts =
    (isLong && (isSellSignal || trendBearish)) ||
    (!isLong && (isBuySignal || trendBullish));

  // Progress to TP/SL
  const tpProgress =
    position.take_profit && position.entry_price !== position.take_profit
      ? isLong
        ? Math.min(100, Math.max(0, ((currentPrice - position.entry_price) / (position.take_profit - position.entry_price)) * 100))
        : Math.min(100, Math.max(0, ((position.entry_price - currentPrice) / (position.entry_price - position.take_profit)) * 100))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        nearSL
          ? "bg-red-500/10 border-red-500/30"
          : contradicts
          ? "bg-orange-500/8 border-orange-500/25"
          : "bg-primary/8 border-primary/20"
      )}
    >
      {/* Alert banners */}
      {nearSL && (
        <div className="flex items-center gap-2 px-5 py-2 bg-red-500/15 text-red-400 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          {t("analysis_near_sl")}
        </div>
      )}
      {nearTP && !nearSL && (
        <div className="flex items-center gap-2 px-5 py-2 bg-emerald-500/15 text-emerald-400 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          {t("analysis_near_tp")}
        </div>
      )}

      <div className="px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-sm">{t("analysis_real_position")}</span>
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          )}>
            {isLong ? "▲ LONG" : "▼ SHORT"}
          </span>
          {lev > 1 && (
            <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">x{lev}</span>
          )}
          {/* Signal alignment badge */}
          {signal && (aligned || contradicts) && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              aligned
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                : "bg-orange-500/15 text-orange-400 border border-orange-500/25"
            )}>
              {aligned ? t("analysis_signal_aligned") : t("analysis_signal_contrary")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">{t("analysis_entry_lbl")} : </span>
            <span className="font-medium">{position.entry_price.toLocaleString("fr-FR", { maximumFractionDigits: 6 })}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("analysis_current_lbl")} : </span>
            <span className={cn("font-medium", isProfit ? "text-emerald-400" : "text-red-400")}>
              {currentPrice.toLocaleString("fr-FR", { maximumFractionDigits: 6 })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t("analysis_qty_lbl")} : </span>
            <span className="font-medium">{position.quantity}</span>
          </div>
          {position.days_held !== undefined && (
            <div>
              <span className="text-muted-foreground">{t("analysis_held_lbl")} : </span>
              <span className="font-medium">{position.days_held} j</span>
            </div>
          )}
          {position.stop_loss && (
            <div>
              <span className="text-muted-foreground">SL : </span>
              <span className="text-red-400 font-medium">{position.stop_loss.toLocaleString("fr-FR", { maximumFractionDigits: 6 })}</span>
            </div>
          )}
          {position.take_profit && (
            <div>
              <span className="text-muted-foreground">TP : </span>
              <span className="text-emerald-400 font-medium">{position.take_profit.toLocaleString("fr-FR", { maximumFractionDigits: 6 })}</span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className={cn(
            "text-right px-3 py-1.5 rounded-lg",
            isProfit ? "bg-emerald-500/10" : "bg-red-500/10"
          )}>
            <p className={cn("text-sm font-bold", isProfit ? "text-emerald-400" : "text-red-400")}>
              {isProfit ? "+" : ""}{pnl.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {position.currency}
            </p>
            <p className={cn("text-xs", isProfit ? "text-emerald-400/70" : "text-red-400/70")}>
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* TP progress bar */}
      {tpProgress !== null && position.take_profit && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{t("analysis_tp_progress")}</span>
            <span className="text-emerald-400 font-medium">{tpProgress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(tpProgress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TradeWindowCard({ tw }: { tw: NonNullable<Analysis["trade_window"]> }) {
  const { lang } = useLanguage();
  const rc = {
    low:    { accent: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/10", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400", label: lang === "en" ? "Low" : "Faible" },
    medium: { accent: "text-amber-400",   border: "border-amber-500/25",   bg: "bg-amber-500/10",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",     dot: "bg-amber-400",   label: lang === "en" ? "Moderate" : "Modéré" },
    high:   { accent: "text-rose-400",    border: "border-rose-500/25",    bg: "bg-rose-500/10",    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",         dot: "bg-rose-400",    label: lang === "en" ? "High" : "Élevé" },
  }[tw.risk_level];

  // Timeline: place min, optimal, max as % of a scale
  const scale = tw.max_minutes * 1.15;
  const pctMin = (tw.min_minutes / scale) * 100;
  const pctOpt = (tw.optimal_minutes / scale) * 100;
  const pctMax = (tw.max_minutes / scale) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" />
          {lang === "en" ? "Recommended trade window" : "Fenêtre de trade recommandée"}
        </h3>
        <div className="flex items-center gap-2">
          {tw.unreliable && (
            <span className="text-xs px-2.5 py-1 rounded-full border bg-zinc-500/15 text-zinc-400 border-zinc-500/30 font-medium">
              {lang === "en" ? "Unreliable signal" : "Signal non fiable"}
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${rc.badge}`}>
            {lang === "en" ? "Risk" : "Risque"} {rc.label}
          </span>
        </div>
      </div>

      {/* Optimal highlight */}
      <div className={`rounded-xl px-5 py-4 border ${rc.border} ${rc.bg} flex items-center justify-between gap-4`}>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{lang === "en" ? "Optimal exit point" : "Point optimal de sortie"}</p>
          <p className={`text-3xl font-black ${rc.accent}`}>{tw.label_optimal}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "en"
              ? `i.e. ${tw.candles_opt} ${tw.candles_opt > 1 ? "candles" : "candle"} of ${tw.bar_label}`
              : `soit ${tw.candles_opt} bougie${tw.candles_opt > 1 ? "s" : ""} de ${tw.bar_label}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground mb-1">{lang === "en" ? "Acceptable range" : "Fourchette acceptable"}</p>
          <p className="text-sm font-semibold">
            <span className="text-muted-foreground">{tw.label_min}</span>
            <span className="text-muted-foreground mx-1.5">–</span>
            <span className="text-muted-foreground">{tw.label_max}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tw.candles_min}–{tw.candles_max} {lang === "en" ? "candles" : "bougies"}
          </p>
        </div>
      </div>

      {/* Visual timeline */}
      <div className="space-y-1.5">
        <div className="relative h-1.5 bg-white/8 rounded-full">
          {/* Range bar */}
          <motion.div
            className={`absolute top-0 h-full rounded-full opacity-30 ${rc.dot}`}
            initial={{ left: "0%", width: "0%" }}
            animate={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {/* Optimal marker */}
          <motion.div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background ${rc.dot}`}
            style={{ boxShadow: "0 0 6px rgba(0,0,0,0.4)" }}
            initial={{ left: "0%" }}
            animate={{ left: `calc(${pctOpt}% - 6px)` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{tw.label_min}</span>
          <span className={`font-medium ${rc.accent}`}>↑ {tw.label_optimal}</span>
          <span>{tw.label_max}</span>
        </div>
      </div>

      {/* Explanations */}
      {(tw.reasons.length > 0 || tw.warnings.length > 0 || tw.unreliable) && (
        <div className="space-y-2.5 border-t border-white/6 pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pourquoi cette durée ?</p>
          <div className="space-y-2">
            {tw.unreliable && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-500/8 border border-zinc-500/20">
                <AlertTriangle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {tw.warnings[tw.warnings.length - 1]}
                </p>
              </div>
            )}
            {tw.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80 leading-relaxed">{r}</p>
              </div>
            ))}
            {tw.warnings.filter((_, i) => !tw.unreliable || i < tw.warnings.length - 1).map((w, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalysts */}
      {tw.catalysts && tw.catalysts.length > 0 && (
        <div className="space-y-2 border-t border-white/6 pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Catalyseurs macro dans cette fenêtre
          </p>
          <div className="space-y-2">
            {tw.catalysts.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/4 rounded-lg border border-white/6">
                <Calendar className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.when}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25">
                      Impact fort
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.relevance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

const ANALYSIS_SECTION_IDS = ["score", "chart", "window", "indicators", "risk", "detailed", "market", "fundamentals", "performance"] as const;
type AnalysisSectionId = typeof ANALYSIS_SECTION_IDS[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ANALYSIS_SECTION_ICONS: Record<AnalysisSectionId, any> = {
  score: BarChart3, chart: TrendingUp, window: Timer, indicators: Activity,
  risk: Shield, detailed: BookOpen, market: Globe, fundamentals: DollarSign, performance: TrendingUp,
};

function AnalysisNavBar({ active, hasWindow }: { active: string; hasWindow: boolean }) {
  const { lang } = useLanguage();
  const ANALYSIS_LABELS: Record<AnalysisSectionId, string> = {
    score:        "Score",
    chart:        lang === "en" ? "Chart"        : "Graphique",
    window:       lang === "en" ? "Window"       : "Fenêtre",
    indicators:   lang === "en" ? "Indicators"   : "Indicateurs",
    risk:         lang === "en" ? "Risks"        : "Risques",
    detailed:     lang === "en" ? "Analysis"     : "Analyse",
    market:       lang === "en" ? "Market"       : "Marché",
    fundamentals: lang === "en" ? "Fundamentals" : "Fondamentaux",
    performance:  lang === "en" ? "Performance"  : "Performance",
  };
  const allSections = ANALYSIS_SECTION_IDS.map(id => ({ id, label: ANALYSIS_LABELS[id], Icon: ANALYSIS_SECTION_ICONS[id] }));
  const sections = hasWindow
    ? allSections
    : allSections.filter(s => s.id !== "window");

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 -mx-4 px-4 py-2 backdrop-blur-xl"
      style={{ background: "rgba(var(--card-rgb, 15 15 20), 0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="flex items-center gap-1 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {sections.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 min-h-[40px]",
              active === id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/6"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const formatPriceHook = useFormatPrice();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const tradingLevel = user?.trading_level ?? "intermediate";
  const style = getStyle(settings.tradingStyle);

  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "");
  // Alias: format a market price in the symbol's native currency
  const formatPrice = (v: number) => formatPriceHook(v, symbol);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("symbol") || "");
  const [suggestions, setSuggestions] = useState<{symbol: string; name: string; exchange: string; type: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  // Opens on the timeframe the user's style actually reads — a scalper landing
  // on a daily chart has to re-click every single time.
  const [timeframe, setTimeframe] = useState(() => getStyle(settings.tradingStyle).defaultTimeframe);
  // Once the user picks a timeframe by hand, a late settings hydration must
  // never yank the chart out from under them.
  const timeframeTouchedRef = useRef(false);
  useEffect(() => {
    if (!timeframeTouchedRef.current) setTimeframe(style.defaultTimeframe);
  }, [style.defaultTimeframe]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["main"]));
  const [recentAnalyses, setRecentAnalyses] = useState<string[]>([]);

  useEffect(() => {
    try { setRecentAnalyses(JSON.parse(localStorage.getItem("tdb_recent_analyses") || "[]")); }
    catch { /* ignore */ }
  }, [analysis]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestAssetType, setRequestAssetType] = useState("stock");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // seconds, 0=off
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSymbolRef = useRef<string>("");
  const [realPosition, setRealPosition] = useState<RealPosition | null>(null);
  const [activeSection, setActiveSection] = useState("score");
  const [showAIChat, setShowAIChat] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [fabDismissed, setFabDismissed] = useState(false);

  useEffect(() => {
    if (!analysis) return;
    const ids = ANALYSIS_SECTION_IDS.map(id => `section-${id}`);
    const observers: IntersectionObserver[] = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id.replace("section-", "")); },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  // FAB time-on-page tracker — starts when analysis is loaded, resets on new symbol
  useEffect(() => {
    if (!analysis) return;
    setTimeOnPage(0);
    setFabDismissed(false);
    const id = setInterval(() => setTimeOnPage(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [analysis?.symbol]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Auto-load if symbol in URL
  useEffect(() => {
    const urlSymbol = searchParams.get("symbol");
    if (urlSymbol) {
      setSymbol(urlSymbol);
      handleSearch(urlSymbol);
    }
  }, [searchParams]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders() as HeadersInit,
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.results || []);
        if (searchContainerRef.current) {
          setDropdownRect(searchContainerRef.current.getBoundingClientRect());
        }
        setShowSuggestions(true);
      }
    } catch { /* ignore */ } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    // If it looks like a pure symbol (all caps, no spaces) update symbol directly too
    if (/^[A-Z0-9.\-^=]+$/.test(value.toUpperCase()) && !value.includes(' ')) {
      setSymbol(value.toUpperCase());
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelectSuggestion = (s: { symbol: string; name: string }) => {
    setSymbol(s.symbol);
    setSearchQuery(`${s.symbol} – ${s.name}`);
    setSuggestions([]);
    setShowSuggestions(false);
    handleSearch(s.symbol);
  };

  const handleSearch = async (searchSymbol?: string, silent = false) => {
    const s = (searchSymbol || symbol).trim().toUpperCase();
    if (!s) return;

    if (!silent) {
      setIsLoading(true);
      setError("");
      setAiInsight(null);
      setRealPosition(null);
    }
    currentSymbolRef.current = s;

    try {
      const data = await analysisAPI.analyze(s, timeframe, style.atr.sl, style.atr.tp, style.fundWeight);
      setAnalysis(data);
      setLastUpdated(new Date());

      // Check if favorite (only on explicit search, not silent refresh)
      if (!silent) {
        missionsAPI.recordAction("analysis_open").catch(() => {});
        try {
          const recents: string[] = JSON.parse(localStorage.getItem("tdb_recent_analyses") || "[]");
          const next = [s, ...recents.filter(r => r !== s)].slice(0, 6);
          localStorage.setItem("tdb_recent_analyses", JSON.stringify(next));
        } catch { /* ignore */ }
        const favCheck = await favoritesAPI.checkFavorite(s);
        setIsFavorite(favCheck.is_favorite);
        // Check real portfolio position
        try {
          const posCheck = await portfolioAPI.checkPosition(s);
          setRealPosition(posCheck.has_position ? posCheck.positions[0] : null);
        } catch {
          setRealPosition(null);
        }
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Erreur d'analyse");
        setAnalysis(null);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (autoRefreshInterval > 0 && currentSymbolRef.current) {
      autoRefreshRef.current = setInterval(() => {
        if (currentSymbolRef.current) {
          handleSearch(currentSymbolRef.current, true);
        }
      }, autoRefreshInterval * 1000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshInterval]);

  const loadAIInsight = async (sym: string, _data: Analysis): Promise<void> => {
    setIsLoadingAI(true);
    try {
      // Use the premium quick-analysis endpoint which fetches full yfinance data
      // (fundamentals, analyst consensus, news, earnings, advanced indicators)
      const response = await aiAPI.quickAnalysis(sym, settings.tradingStyle, settings.riskLevel, tradingLevel);
      setAiInsight(response.analysis);
    } catch (err) {
      console.error("Error loading AI insight:", err);
      throw err;
    } finally {
      setIsLoadingAI(false);
    }
  };

  const toggleFavorite = async () => {
    if (!analysis) return;
    const prev = isFavorite;
    setIsFavorite(!prev); // optimistic update
    try {
      if (prev) {
        await favoritesAPI.removeFavorite(analysis.symbol);
      } else {
        await favoritesAPI.addFavorite(analysis.symbol);
      }
    } catch (error) {
      setIsFavorite(prev); // revert on error
      console.error("Error toggling favorite:", error);
    }
  };

  const handleRequestAsset = async () => {
    if (!symbol.trim()) return;
    setIsSubmittingRequest(true);
    try {
      await marketAPI.requestAsset({
        symbol: symbol.trim().toUpperCase(),
        asset_type: requestAssetType,
        reason: requestReason || undefined,
      });
      setRequestSuccess(true);
      setShowRequestForm(false);
      setRequestReason("");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la demande");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <>
      <TopLoadingBar isLoading={isLoading || isLoadingAI} />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Search */}
      <div className="glass-card p-6" data-module-id="asset-selector">
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">{t("analysis_session_title")}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Level badge */}
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                tradingLevel === "beginner"     ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" :
                tradingLevel === "expert"       ? "bg-neon-purple/15 border-neon-purple/40 text-neon-purple" :
                                                  "bg-primary/15 border-primary/40 text-primary"
              )}>
                {tradingLevel === "beginner" ? <><GraduationCap className="w-3 h-3" /> {t("analysis_beginner")}</> :
                 tradingLevel === "expert"   ? <><Zap className="w-3 h-3" /> {t("analysis_expert")}</> :
                                               <><TrendingUp className="w-3 h-3" /> {t("analysis_intermediate")}</>}
              </span>
              {/* Style badge — clickable, since it drives the whole page */}
              <Link
                href="/settings?tab=trading"
                title={style.pitch[lang]}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:brightness-125",
                  style.chip
                )}
              >
                <span>{style.emoji}</span>
                <span>{style.label[lang]}</span>
                <span className="font-mono text-[10px] opacity-60">{style.horizon[lang]}</span>
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("analysis_session_desc")}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative" ref={searchContainerRef}>
            {isSearching
              ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
              : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            }
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  if (searchContainerRef.current) setDropdownRect(searchContainerRef.current.getBoundingClientRect());
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => { blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 150); }}
              placeholder={t("analysis_symbol_ph")}
              className="w-full input pl-11 text-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowSuggestions(false); handleSearch(); }
                if (e.key === "Escape") setShowSuggestions(false);
              }}
            />
            {/* Suggestions dropdown — rendu via portal pour passer au-dessus de tous les stacking contexts */}
            {showSuggestions && suggestions.length > 0 && dropdownRect && typeof document !== "undefined" && createPortal(
              <div
                style={{
                  position: "fixed",
                  top: dropdownRect.bottom + 4,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                  zIndex: 9999,
                }}
                className="glass-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s.symbol}
                    onMouseDown={() => handleSelectSuggestion(s)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-primary text-sm min-w-[80px]">{s.symbol}</span>
                      <span className="text-sm text-slate-300 truncate max-w-[200px]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-slate-500">{s.exchange}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400">{s.type === 'EQUITY' ? t("analysis_type_stock") : s.type === 'ETF' ? 'ETF' : s.type === 'CRYPTOCURRENCY' ? 'Crypto' : s.type === 'INDEX' ? t("analysis_type_index") : s.type}</span>
                    </div>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          {/* Timeframe selector — units outside the active style are dimmed,
              so the ones worth reading for this horizon stand out. */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/8 flex-shrink-0 overflow-x-auto no-scrollbar" data-module-id="timeframe-selector">
            {[
              { v: "5m",  label: "5m" },
              { v: "15m", label: "15m" },
              { v: "30m", label: "30m" },
              { v: "1h",  label: "1h" },
              { v: "4h",  label: "4h" },
              null,
              { v: "1d",  label: "1J" },
              { v: "3d",  label: "3J" },
              { v: "1w",  label: "1S" },
              { v: "1mo", label: "1M" },
            ].map((tf, i) =>
              tf === null ? (
                <div key={i} className="w-px h-5 bg-white/15 mx-0.5 flex-shrink-0" />
              ) : (
                <button
                  key={tf.v}
                  onClick={() => { timeframeTouchedRef.current = true; setTimeframe(tf.v); }}
                  title={
                    style.timeframes.includes(tf.v)
                      ? `${style.emoji} ${style.label[lang]}`
                      : lang === "en"
                      ? `Outside your ${style.label.en} horizon`
                      : `Hors de votre horizon ${style.label.fr}`
                  }
                  className={cn(
                    "relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap flex-shrink-0",
                    timeframe === tf.v
                      ? "bg-primary text-[hsl(var(--primary-foreground))] shadow-sm"
                      : style.timeframes.includes(tf.v)
                      ? "text-foreground/80 hover:text-foreground hover:bg-white/10"
                      : "text-muted-foreground/45 hover:text-foreground hover:bg-white/10"
                  )}
                >
                  {tf.label}
                  {style.timeframes.includes(tf.v) && timeframe !== tf.v && (
                    <span className={cn("absolute left-1/2 -translate-x-1/2 bottom-0.5 w-1 h-1 rounded-full", style.dot)} />
                  )}
                </button>
              )
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSearch()}
            disabled={isLoading || !symbol.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {t("analysis_search_btn")}
          </motion.button>
        </div>
      </div>

      {/* Error with Request Asset Option */}
      {error && (
        <div className="glass-card p-6">
          <div className="flex items-start gap-3 text-loss mb-4">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              {error.toLowerCase().includes("insufficient data") ? (
                <>
                  <p className="font-medium">
                    {lang === "en" ? "Insufficient historical data" : "Données historiques insuffisantes"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lang === "en"
                      ? `"${symbol}" was recently listed and doesn't have enough trading history for technical analysis yet (minimum 20 sessions needed). Check back in a few weeks.`
                      : `"${symbol}" vient d'être introduit en bourse et n'a pas encore assez d'historique pour l'analyse technique (minimum 20 séances nécessaires). Revenez dans quelques semaines.`}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">{error}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lang === "en"
                      ? `"${symbol}" is not available or does not exist.`
                      : `L'actif "${symbol}" n'est pas disponible ou n'existe pas.`}
                  </p>
                </>
              )}
            </div>
          </div>

          {error.toLowerCase().includes("insufficient data") ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-start gap-2">
              <span className="text-lg leading-none">🚀</span>
              <span>
                {lang === "en"
                  ? "This asset is a recent IPO. Technical indicators require at least 20 days of price history. The analysis will become available progressively."
                  : "Cet actif est une introduction en bourse récente. Les indicateurs techniques nécessitent au moins 20 jours d'historique de cours. L'analyse sera disponible progressivement."}
              </span>
            </div>
          ) : requestSuccess ? (
            <div className="p-4 rounded-xl bg-profit/10 border border-profit/30 text-profit">
              <p className="font-medium">Demande envoyee avec succes!</p>
              <p className="text-sm mt-1">
                Un administrateur examinera votre demande d'ajout de {symbol}.
              </p>
            </div>
          ) : !showRequestForm ? (
            <button
              onClick={() => setShowRequestForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Demander l'ajout de cet actif
            </button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-white/5">
              <h3 className="font-semibold">{t("analysis_request_title")} "{symbol}"</h3>

              <div>
                <label className="text-sm text-muted-foreground">{t("analysis_asset_type")}</label>
                <select
                  value={requestAssetType}
                  onChange={(e) => setRequestAssetType(e.target.value)}
                  className="w-full input mt-1"
                >
                  <option value="stock">{t("analysis_type_stock")}</option>
                  <option value="crypto">{lang === "fr" ? "Crypto-monnaie" : "Cryptocurrency"}</option>
                  <option value="etf">ETF</option>
                  <option value="forex">{t("analysis_type_forex")}</option>
                  <option value="commodity">{t("analysis_type_commodity")}</option>
                  <option value="index">{t("analysis_type_index")}</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">{t("analysis_reason_opt")}</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder={t("analysis_reason_ph")}
                  className="w-full input mt-1 min-h-[80px]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRequestAsset}
                  disabled={isSubmittingRequest}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSubmittingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {t("analysis_send_request")}
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="btn-ghost"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refresh controls */}
      {analysis && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {lastUpdated && (
              <>
                <Timer className="w-3.5 h-3.5" />
                <span>Mis à jour {Math.floor((Date.now() - lastUpdated.getTime()) / 1000) < 5 ? "à l'instant" : `il y a ${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s`}</span>
              </>
            )}
            {autoRefreshInterval > 0 && (
              <span className="text-profit">· Auto-refresh {autoRefreshInterval}s</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSearch(currentSymbolRef.current || symbol, false)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              {t("refresh")}
            </button>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs border border-white/10 text-muted-foreground cursor-pointer"
            >
              <option value={0}>Auto-refresh : Off</option>
              <option value={15}>Toutes les 15s</option>
              <option value={30}>Toutes les 30s</option>
              <option value={60}>Toutes les 1 min</option>
              <option value={300}>Toutes les 5 min</option>
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* 1. Asset Header */}
          <AssetHeader analysis={analysis} isFavorite={isFavorite} toggleFavorite={toggleFavorite} formatCurrency={formatPrice} />

          {/* 1b. Real position banner */}
          {realPosition && (
            <RealPositionBanner
              position={realPosition}
              currentPrice={analysis.price.current}
              signal={analysis.signal}
              trend={analysis.trend}
            />
          )}

          {/* Sticky nav */}
          <AnalysisNavBar active={activeSection} hasWindow={!!analysis.trade_window} />

          {/* 2. Score cards */}
          <div id="section-score" className="scroll-mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main score card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 text-center relative overflow-hidden"
            >
              {/* Dynamic background glow based on signal */}
              <div className={cn(
                "absolute inset-0 pointer-events-none",
                analysis.signal.text.includes("BUY")  ? "bg-gradient-radial from-profit/12 to-transparent" :
                analysis.signal.text.includes("SELL") ? "bg-gradient-radial from-loss/12 to-transparent"   :
                                                         "bg-gradient-radial from-warning/10 to-transparent"
              )} />
              <div className="relative">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {lang === "fr" ? "Score Global" : "Global Score"}
                </p>

                {/* Circular score */}
                <div className="w-36 h-36 mx-auto mb-5 relative">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r="62" fill="none" stroke="currentColor" strokeWidth="10" className="text-white/8" />
                    <circle
                      cx="72" cy="72" r="62"
                      fill="none"
                      stroke={analysis.signal.text.includes("BUY") ? "#0ecb81" : analysis.signal.text.includes("SELL") ? "#f6465d" : "#f0a500"}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(analysis.score.total / 100) * 390} 390`}
                      style={{ filter: `drop-shadow(0 0 8px ${analysis.signal.text.includes("BUY") ? "rgba(14,203,129,0.5)" : analysis.signal.text.includes("SELL") ? "rgba(246,70,93,0.5)" : "rgba(240,165,0,0.5)"})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold leading-none">{analysis.score.total}</span>
                    <span className="text-xs text-muted-foreground mt-1">/100</span>
                  </div>
                </div>

                {/* Signal badge */}
                <div className={cn(
                  "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-lg mb-3 border",
                  analysis.signal.text.includes("BUY")  ? "bg-profit/15 border-profit/40 text-profit"   :
                  analysis.signal.text.includes("SELL") ? "bg-loss/15 border-loss/40 text-loss"         :
                                                           "bg-warning/15 border-warning/40 text-warning"
                )}>
                  <span className="text-2xl leading-none">{analysis.signal.emoji}</span>
                  <span>{analysis.signal.text}</span>
                </div>

                {/* Trend + MTF confirmation + data confidence */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border",
                    analysis.trend === "BULLISH" ? "bg-profit/10 border-profit/25 text-profit" :
                    analysis.trend === "BEARISH" ? "bg-loss/10 border-loss/25 text-loss"       :
                                                   "bg-warning/10 border-warning/25 text-warning"
                  )}>
                    {analysis.trend === "BULLISH" ? <TrendingUp className="w-3 h-3" /> : analysis.trend === "BEARISH" ? <TrendingDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                    {analysis.trend}
                  </span>
                  {analysis.higher_timeframe?.aligned === true && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-profit/10 border-profit/25 text-profit"
                      title={`La tendance ${analysis.higher_timeframe.interval} va dans le même sens que le signal`}>
                      <CheckCircle className="w-3 h-3" />
                      Confirmé {analysis.higher_timeframe.interval}
                    </span>
                  )}
                  {analysis.higher_timeframe?.aligned === false && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-warning/10 border-warning/25 text-warning"
                      title={`La tendance ${analysis.higher_timeframe.interval} contredit le signal — prudence`}>
                      <AlertTriangle className="w-3 h-3" />
                      Non confirmé {analysis.higher_timeframe.interval}
                    </span>
                  )}
                  {typeof analysis.score.confidence === "number" && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border",
                      analysis.score.confidence >= 70 ? "bg-white/5 border-white/15 text-muted-foreground" :
                      analysis.score.confidence >= 40 ? "bg-warning/10 border-warning/25 text-warning" :
                                                        "bg-loss/10 border-loss/25 text-loss"
                    )}
                      title="Fiabilité des données : quantité d'historique et couverture des indicateurs">
                      <Gauge className="w-3 h-3" />
                      Données {analysis.score.confidence}%
                    </span>
                  )}
                </div>
                {analysis.data_quality?.stale && (
                  <p className="flex items-center justify-center gap-1.5 mt-2 text-xs text-warning">
                    <AlertTriangle className="w-3 h-3" />
                    Données potentiellement périmées — dernière bougie ancienne
                  </p>
                )}

                {/* Trade window hint */}
                {analysis.trade_window && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Timer className="w-3 h-3 opacity-60" />
                    <span>Sortie optimale :{" "}
                      <span className={cn(
                        "font-medium",
                        analysis.trade_window.risk_level === "low"  ? "text-emerald-400" :
                        analysis.trade_window.risk_level === "high" ? "text-rose-400"    : "text-amber-400"
                      )}>
                        ~{analysis.trade_window.label_optimal}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Score breakdown */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t("analysis_score_detail")}
              </h3>
              <div className="space-y-4">
                <ScoreBar label={`${t("analysis_technical")} (30%)`} score={analysis.score.technical} />
                <ScoreBar label={`${t("analysis_trend")} (25%)`} score={(analysis.score as any).trend ?? 50} />
                <ScoreBar label={`${t("analysis_volume")} (20%)`} score={analysis.score.volume} />
                <ScoreBar label={`${t("analysis_momentum")} (20%)`} score={analysis.score.momentum} />
                <ScoreBar label={`${t("analysis_volatility")} (5%)`} score={(analysis.score as any).volatility ?? 60} />
                {analysis.score.fundamental !== undefined && (
                  <ScoreBar label={t("analysis_fundamentals")} score={analysis.score.fundamental} />
                )}
                {(analysis.score as any).conviction !== undefined && (
                  <ScoreBar label={lang === "en" ? "Factor agreement" : "Accord entre facteurs"} score={(analysis.score as any).conviction} />
                )}
              </div>

              {/* What the score is worth — three readings that are NOT the score */}
              {(analysis.profile_score || analysis.historical_edge || analysis.signal_quality) && (
                <div className="mt-5 space-y-2.5 border-t border-border pt-4">
                  {analysis.profile_score?.fundamentals_applied && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {lang === "en"
                          ? `Profile score · fundamentals ${Math.round(analysis.profile_score.fund_weight * 100)}%`
                          : `Score profil · fondamental ${Math.round(analysis.profile_score.fund_weight * 100)} %`}
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums">
                        {analysis.profile_score.total}
                        <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">{analysis.profile_score.signal}</span>
                      </span>
                    </div>
                  )}
                  {analysis.historical_edge && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {lang === "en" ? "Historical edge on this asset" : "Edge historique sur cet actif"}
                      </span>
                      {analysis.historical_edge.enough_samples ? (
                        <span className={cn("font-mono text-sm font-bold tabular-nums",
                          (analysis.historical_edge.expectancy_net_r ?? 0) > 0 ? "text-profit" : "text-loss")}>
                          {(analysis.historical_edge.expectancy_net_r ?? 0) >= 0 ? "+" : ""}{analysis.historical_edge.expectancy_net_r}R
                          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                            {analysis.historical_edge.win_rate}% · {analysis.historical_edge.n_trades} trades
                          </span>
                        </span>
                      ) : (
                        // Never a bare figure on a thin sample — say so instead.
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {lang === "en"
                            ? `${analysis.historical_edge.n_trades} trades — too few to conclude`
                            : `${analysis.historical_edge.n_trades} trades — trop peu pour conclure`}
                        </span>
                      )}
                    </div>
                  )}
                  {/* The most likely outcome for THIS setup in TODAY's market,
                      never a bare percentage: the sample size and the basis
                      travel with the figure. */}
                  {analysis.historical_edge?.scenario && (
                    <div className="border border-border bg-white/[0.02] p-2.5">
                      <p className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold">
                          {lang === "en" ? "Most likely scenario" : "Scénario le plus probable"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {analysis.historical_edge.scenario.n_trades} trades
                          {analysis.historical_edge.scenario.basis === "conditional"
                            ? (lang === "en" ? " · same regime" : " · même régime")
                            : (lang === "en" ? " · all regimes" : " · tous régimes")}
                        </span>
                      </p>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {analysis.historical_edge.scenario.label}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-profit">
                          {lang === "en" ? "target" : "cible"} {analysis.historical_edge.scenario.p_target}%
                        </span>
                        <span className="text-loss">
                          stop {analysis.historical_edge.scenario.p_stop}%
                        </span>
                        <span className="text-muted-foreground">
                          {lang === "en" ? "timeout" : "expiration"} {analysis.historical_edge.scenario.p_timeout}%
                        </span>
                      </div>
                      {/* Why the conditional figure was not used, when it wasn't */}
                      {analysis.historical_edge.scenario.fallback_reason && (
                        <p className="mt-1 font-mono text-[10px] text-warning/80">
                          {analysis.historical_edge.scenario.fallback_reason}
                        </p>
                      )}
                      {!analysis.historical_edge.scenario.enough && (
                        <p className="mt-1 text-[10px] text-warning/80">
                          {lang === "en"
                            ? "Too few trades to treat these as probabilities."
                            : "Trop peu de trades pour lire ces chiffres comme des probabilités."}
                        </p>
                      )}
                    </div>
                  )}
                                    {analysis.market_context && (
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          {lang === "en" ? "Its market" : "Son marché"}
                          <span className="ml-1 font-mono text-[10px] opacity-60">
                            {analysis.market_context.benchmark}
                          </span>
                        </span>
                        <span className={cn("font-mono text-sm font-bold",
                          analysis.market_context.regime === "BULL" ? "text-profit"
                            : analysis.market_context.regime === "BEAR" ? "text-loss" : "text-muted-foreground")}>
                          {analysis.market_context.regime === "BULL" ? (lang === "en" ? "RISING" : "HAUSSIER")
                            : analysis.market_context.regime === "BEAR" ? (lang === "en" ? "FALLING" : "BAISSIER")
                            : (lang === "en" ? "FLAT" : "NEUTRE")}
                        </span>
                      </div>
                      {/* The one fact the asset's own candles cannot give:
                          +2% while the index does +5% is weakness. */}
                      {analysis.market_context.relative_strength != null && (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                          {lang === "en" ? "asset " : "actif "}
                          {analysis.market_context.asset_change_20?.toFixed(1)}%
                          {lang === "en" ? " vs market " : " vs marché "}
                          {analysis.market_context.bench_change_20?.toFixed(1)}%
                          {" → "}
                          <span className={cn("font-bold",
                            analysis.market_context.relative_strength >= 0 ? "text-profit" : "text-loss")}>
                            {analysis.market_context.relative_strength >= 0 ? "+" : ""}
                            {analysis.market_context.relative_strength.toFixed(1)} pts
                          </span>
                          {analysis.market_context.correlation != null &&
                            ` · ${lang === "en" ? "corr" : "corr"} ${analysis.market_context.correlation}`}
                        </p>
                      )}
                    </div>
                  )}
                                    {analysis.signal_quality && (
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          {lang === "en" ? "Signal quality" : "Qualité du signal"}
                        </span>
                        <span className={cn("font-mono text-sm font-bold tabular-nums",
                          analysis.signal_quality.score >= 65 ? "text-profit"
                            : analysis.signal_quality.score < 40 ? "text-loss" : "text-warning")}>
                          {analysis.signal_quality.score}%
                        </span>
                      </div>
                      {analysis.signal_quality.notes.length > 0 && (
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
                          {analysis.signal_quality.notes.join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Price info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                {t("analysis_price_levels")}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-muted-foreground">{t("analysis_current_price")}</span>
                  <div className="text-right">
                    <span className="font-bold text-lg">{formatPrice(analysis.price.current)}</span>
                    <span className={cn(
                      "ml-2 text-sm",
                      analysis.price.change >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {formatPercent(analysis.price.change)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("analysis_resistance")}</span>
                  <span className="text-loss font-semibold">{formatCurrency(analysis.levels.resistance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("analysis_pivot")}</span>
                  <span className="font-semibold">{formatCurrency(analysis.levels.pivot)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("analysis_support")}</span>
                  <span className="text-profit font-semibold">{formatCurrency(analysis.levels.support)}</span>
                </div>
              </div>
            </motion.div>
          </div>
          </div>

          {/* 3. Premium Chart */}
          <div id="section-chart" className="scroll-mt-16" data-module-id="main-chart">
            <PremiumChart symbol={analysis.symbol} timeframe={timeframe} />
          </div>

          {/* Alerte de prix */}
          <PriceAlertSection
            symbol={analysis.symbol}
            currentPrice={analysis.price.current}
            support={analysis.levels.support}
            resistance={analysis.levels.resistance}
            formatCurrency={formatPrice}
          />

          {/* Trade Window */}
          <div id="section-window" className="scroll-mt-16">
            {analysis.trade_window && (
              <TradeWindowCard tw={analysis.trade_window} />
            )}
          </div>

          {/* AI Insight module removed — the floating "Demander à l'IA" chat
              button covers AI analysis (avoids duplicate AI modules). */}

          {/* Indicators */}
          <div id="section-indicators" className="scroll-mt-16" data-module-id="indicators-panel">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              Indicateurs Techniques
              {(settings.tradingStyle === "scalp" || settings.tradingStyle === "day") && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-normal">
                  Prioritaire · {settings.tradingStyle === "scalp" ? "Scalping" : "Day Trading"}
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
              <div data-module-id="rsi-panel">
              <IndicatorCard
                name="RSI (14)"
                value={analysis.indicators.rsi.value.toFixed(1)}
                signal={analysis.indicators.rsi.signal as any}
                detail={{
                  description: "Le RSI (Relative Strength Index) est un oscillateur de momentum qui mesure la vitesse et l'amplitude des variations de prix récentes. Il oscille entre 0 et 100.",
                  howToRead: `Valeur actuelle: ${analysis.indicators.rsi.value.toFixed(1)}. ${analysis.indicators.rsi.value < 30 ? "⚠️ Zone de survente (<30) : le prix a baissé trop vite, un rebond est probable." : analysis.indicators.rsi.value > 70 ? "⚠️ Zone de surachat (>70) : le prix a monté trop vite, une correction est possible." : analysis.indicators.rsi.value < 40 ? "Zone neutre-basse (30-40) : tendance baissière modérée." : analysis.indicators.rsi.value > 60 ? "Zone neutre-haute (60-70) : tendance haussière modérée." : "Zone neutre (40-60) : pas de signal extrême."} ${(analysis.indicators as any).rsi?.divergence && (analysis.indicators as any).rsi.divergence !== "none" ? `Divergence ${(analysis.indicators as any).rsi.divergence === "bullish" ? "haussière" : "baissière"} détectée !` : ""}`,
                  influence: "Poids fort dans le score Technique (30% du total). RSI <30 ajoute +15 à +20 pts, RSI >70 soustrait -15 à -20 pts. Une divergence RSI/Prix ajoute ±12 pts supplémentaires.",
                  weight: "Composante : Technique (30%)",
                }}
              />
              </div>
              <IndicatorCard
                name="MACD"
                value={analysis.indicators.macd.value.toFixed(2)}
                signal={analysis.indicators.macd.signal as any}
                detail={{
                  description: "Le MACD (Moving Average Convergence Divergence) mesure la relation entre deux moyennes mobiles exponentielles (EMA12 - EMA26). La ligne Signal (EMA9 du MACD) génère des signaux de croisement.",
                  howToRead: `MACD: ${analysis.indicators.macd.value.toFixed(4)} | Signal: ${analysis.indicators.macd.signal_line.toFixed(4)} | Histogramme: ${analysis.indicators.macd.histogram.toFixed(4)}. ${parseFloat(analysis.indicators.macd.histogram.toFixed(4)) > 0 ? "L'histogramme est positif : momentum haussier en cours." : "L'histogramme est négatif : momentum baissier en cours."} ${Math.abs(parseFloat(analysis.indicators.macd.histogram.toFixed(4))) < 0.001 ? "⚡ Possible croisement imminent !" : ""}`,
                  influence: "Signal le plus puissant : un croisement haussier (MACD passe au-dessus du Signal) ajoute +20 pts au score Technique. Un croisement baissier soustrait -20 pts. MACD positif sans croisement : ±8 pts.",
                  weight: "Composante : Technique (30%)",
                }}
              />
              <IndicatorCard
                name="EMA 20"
                value={formatCurrency(analysis.indicators.ema.ema20)}
                sub={emaSub(analysis.price.current, analysis.indicators.ema.ema20, lang)}
                signal={analysis.price.current > analysis.indicators.ema.ema20 ? "bullish" : "bearish"}
                detail={{
                  description: "L'EMA 20 (Moyenne Mobile Exponentielle sur 20 périodes) suit la tendance de court terme. Elle réagit plus vite aux prix récents qu'une SMA classique.",
                  howToRead: `Prix actuel (${formatCurrency(analysis.price.current)}) est ${analysis.price.current > analysis.indicators.ema.ema20 ? "AU-DESSUS" : "EN DESSOUS"} de l'EMA20 (${formatCurrency(analysis.indicators.ema.ema20)}). ${analysis.price.current > analysis.indicators.ema.ema20 ? "Signal court terme haussier : momentum positif sur les 20 dernières sessions." : "Signal court terme baissier : le prix sous l'EMA20 indique une pression vendeuse récente."}`,
                  influence: "Contribue +8 pts au score de Tendance si prix > EMA20, -8 pts sinon. Associée à l'EMA50 et EMA200, elle détermine 35 des 47 points possibles du score de Tendance.",
                  weight: "Composante : Tendance (25%)",
                }}
              />
              <IndicatorCard
                name="EMA 50"
                value={formatCurrency(analysis.indicators.ema.ema50)}
                sub={emaSub(analysis.price.current, analysis.indicators.ema.ema50, lang)}
                signal={analysis.price.current > analysis.indicators.ema.ema50 ? "bullish" : "bearish"}
                detail={{
                  description: "L'EMA 50 représente la tendance de moyen terme (environ 2,5 mois). C'est une référence majeure pour les traders institutionnels et les algorithmes.",
                  howToRead: `Prix (${formatCurrency(analysis.price.current)}) ${analysis.price.current > analysis.indicators.ema.ema50 ? "AU-DESSUS" : "EN DESSOUS"} de l'EMA50 (${formatCurrency(analysis.indicators.ema.ema50)}). ${analysis.price.current > analysis.indicators.ema.ema50 ? "Tendance moyen terme haussière confirmée." : "Tendance moyen terme baissière : les vendeurs dominent sur 2-3 mois."} ${analysis.indicators.ema.ema20 > analysis.indicators.ema.ema50 ? "EMA20 > EMA50 : alignement haussier favorable." : "EMA20 < EMA50 : alignement baissier."}`,
                  influence: "Contribue +12 pts au score de Tendance si prix > EMA50, -12 pts sinon. Le croisement EMA20/EMA50 (Golden Cross / Death Cross) est l'un des signaux les plus suivis du marché.",
                  weight: "Composante : Tendance (25%)",
                }}
              />
              {analysis.indicators.ema.ema200 !== null && analysis.indicators.ema.ema200 !== undefined && (
                <IndicatorCard
                  name="EMA 200"
                  value={formatCurrency(analysis.indicators.ema.ema200)}
                  sub={emaSub(analysis.price.current, analysis.indicators.ema.ema200, lang)}
                  signal={analysis.price.current > analysis.indicators.ema.ema200 ? "bullish" : "bearish"}
                  detail={{
                    description: "L'EMA 200 est l'indicateur de tendance long terme par excellence. Elle sépare les marchés haussiers des marchés baissiers structurels. Les grands fonds gèrent leurs positions autour de cette ligne.",
                    howToRead: `Prix (${formatCurrency(analysis.price.current)}) ${analysis.price.current > analysis.indicators.ema.ema200 ? "AU-DESSUS" : "EN DESSOUS"} de l'EMA200 (${formatCurrency(analysis.indicators.ema.ema200)}). ${analysis.price.current > analysis.indicators.ema.ema200 ? "✅ Zone dorée : le prix est en territoire haussier long terme. Les institutionnels sont acheteurs sur les replis." : "⚠️ Territoire baissier long terme : le marché est structurellement en baisse. Prudence accrue recommandée."}`,
                    influence: "Signal le plus impactant du score de Tendance : +15 pts si prix > EMA200, -15 pts sinon. Représente à lui seul ~32% du score de Tendance total.",
                    weight: "Composante : Tendance (25%)",
                  }}
                />
              )}
              {analysis.indicators.adx && (
                <IndicatorCard
                  name="ADX"
                  value={`${analysis.indicators.adx.value.toFixed(1)} (DI+: ${analysis.indicators.adx.plus_di.toFixed(0)} / DI-: ${analysis.indicators.adx.minus_di.toFixed(0)})`}
                  signal={analysis.indicators.adx.value > 25 ? (analysis.indicators.adx.plus_di > analysis.indicators.adx.minus_di ? "bullish" : "bearish") : "neutral"}
                  detail={{
                    description: "L'ADX (Average Directional Index) mesure la FORCE de la tendance, pas sa direction. Il est accompagné du DI+ (directional indicator haussier) et DI- (baissier) qui indiquent la direction.",
                    howToRead: `ADX = ${analysis.indicators.adx.value.toFixed(1)} → tendance ${analysis.indicators.adx.value > 50 ? "très forte (>50)" : analysis.indicators.adx.value > 25 ? "forte (25-50)" : analysis.indicators.adx.value > 15 ? "modérée (15-25)" : "faible ou absente (<15)"}. DI+ (${analysis.indicators.adx.plus_di.toFixed(1)}) ${analysis.indicators.adx.plus_di > analysis.indicators.adx.minus_di ? ">" : "<"} DI- (${analysis.indicators.adx.minus_di.toFixed(1)}) → ${analysis.indicators.adx.plus_di > analysis.indicators.adx.minus_di ? "pression haussière dominante" : "pression baissière dominante"}.`,
                    influence: "ADX >30 avec DI+ > DI- ajoute +12 pts au score de Tendance. ADX >20 ajoute +6 pts. Sans ADX fort, les signaux des autres indicateurs sont moins fiables.",
                    weight: "Composante : Tendance (25%)",
                  }}
                />
              )}
              {analysis.indicators.stochastic && (
                <IndicatorCard
                  name="Stochastique"
                  value={`%K ${analysis.indicators.stochastic.k.toFixed(1)} / %D ${analysis.indicators.stochastic.d.toFixed(1)}`}
                  signal={analysis.indicators.stochastic.signal as any}
                  detail={{
                    description: "L'oscillateur stochastique compare le prix de clôture à la plage haute/basse des 14 dernières périodes. Le %K est la ligne rapide, le %D la ligne lente (moyenne du %K sur 3 périodes).",
                    howToRead: `%K = ${analysis.indicators.stochastic.k.toFixed(1)}, %D = ${analysis.indicators.stochastic.d.toFixed(1)}. ${analysis.indicators.stochastic.k < 20 ? "⚡ Zone de survente (<20) : signal d'achat potentiel, surtout si %K dépasse %D." : analysis.indicators.stochastic.k > 80 ? "⚠️ Zone de surachat (>80) : signal de vente potentiel, surtout si %K passe sous %D." : "Zone neutre (20-80)."} ${analysis.indicators.stochastic.k > analysis.indicators.stochastic.d ? "%K > %D : momentum haussier à court terme." : "%K < %D : momentum baissier à court terme."}`,
                    influence: "Un croisement haussier en zone survendue (<20) ajoute +8 pts au score Technique. Un croisement baissier en surachat (>80) soustrait -8 pts. En zone neutre : ±4 pts selon position.",
                    weight: "Composante : Technique (30%)",
                  }}
                />
              )}
              {analysis.indicators.bollinger.percent_b !== undefined && (
                <IndicatorCard
                  name="Bollinger %B"
                  value={`${analysis.indicators.bollinger.percent_b.toFixed(1)}%`}
                  signal={analysis.indicators.bollinger.percent_b > 80 ? "bearish" : analysis.indicators.bollinger.percent_b < 20 ? "bullish" : "neutral"}
                  detail={{
                    description: "Le %B mesure la position du prix dans les Bandes de Bollinger (20 périodes, ±2 écarts-types). 0% = bande inférieure, 50% = bande médiane, 100% = bande supérieure. Largeur actuelle: " + ((analysis.indicators as any).bollinger?.width_pct?.toFixed(1) ?? "N/A") + "%.",
                    howToRead: `%B = ${analysis.indicators.bollinger.percent_b.toFixed(1)}%. ${analysis.indicators.bollinger.percent_b > 100 ? "Prix AU-DESSUS de la bande haute : surachat extrême, forte probabilité de retour vers la médiane." : analysis.indicators.bollinger.percent_b < 0 ? "Prix EN-DESSOUS de la bande basse : survente extrême, rebond probable." : analysis.indicators.bollinger.percent_b > 80 ? "Proche de la bande haute : prudence, pression vendeuse possible." : analysis.indicators.bollinger.percent_b < 20 ? "Proche de la bande basse : zone d'intérêt acheteur." : "Position médiane : pas de signal extrême."} Bandes ${(analysis.indicators as any).bollinger?.width_pct < 5 ? "très serrées (compression = possible explosion de volatilité imminente)" : "normales"}.`,
                    influence: "Prix sous la bande basse ajoute +5 pts au score Technique (rebond probable). Prix au-dessus de la bande haute soustrait -5 pts. La compression des bandes prépare souvent un fort mouvement directionnel.",
                    weight: "Composante : Technique (30%)",
                  }}
                />
              )}
              <IndicatorCard
                name="ATR (14)"
                value={`${analysis.indicators.atr.toFixed(2)}${(analysis.indicators as any).atr_pct ? ` (${(analysis.indicators as any).atr_pct.toFixed(2)}%)` : ""}`}
                signal="neutral"
                detail={{
                  description: "L'ATR (Average True Range) mesure la volatilité moyenne sur 14 périodes. Il calcule le plus grand des 3 écarts : (Haut-Bas), (Haut-Clôture précédente), (Bas-Clôture précédente).",
                  howToRead: `ATR = ${analysis.indicators.atr.toFixed(2)}${(analysis.indicators as any).atr_pct ? ` soit ${(analysis.indicators as any).atr_pct.toFixed(2)}% du prix` : ""}. Stop-loss standard (2xATR): ${(analysis.indicators.atr * 2).toFixed(2)}. Take-profit (3xATR): ${(analysis.indicators.atr * 3).toFixed(2)}. ${(analysis.indicators as any).atr_pct > 3 ? "Volatilité élevée : augmentez vos stops, réduisez la taille de position." : (analysis.indicators as any).atr_pct < 1 ? "Faible volatilité : marché calme, les mouvements sont contenus." : "Volatilité normale."}`,
                  influence: "Utilisé directement pour calculer les niveaux de Stop-Loss et Take-Profit suggérés (2xATR et 3xATR). Une ATR élevée (>5% du prix) réduit le score de Volatilité de -10 pts.",
                  weight: "Composante : Volatilité (5%)",
                }}
              />
              <div data-module-id="volume-panel">
              <IndicatorCard
                name="Volume Ratio"
                value={`${analysis.indicators.volume_ratio.toFixed(2)}x`}
                signal={analysis.indicators.volume_ratio > 1.5 ? "bullish" : analysis.indicators.volume_ratio < 0.7 ? "bearish" : "neutral"}
                detail={{
                  description: "Le ratio de volume compare le volume actuel à la moyenne des 20 dernières périodes. Un volume supérieur à 1.5x confirme la conviction derrière un mouvement de prix.",
                  howToRead: `Volume actuel = ${analysis.indicators.volume_ratio.toFixed(2)}x la moyenne 20j. ${analysis.indicators.volume_ratio > 2 ? "🔥 Volume exceptionnel (>2x) : fort signal de confirmation, les institutionnels sont actifs." : analysis.indicators.volume_ratio > 1.5 ? "Volume élevé (>1.5x) : signal de qualité, mouvement de prix fiable." : analysis.indicators.volume_ratio < 0.5 ? "⚠️ Volume très faible (<0.5x) : mouvement peu fiable, prudence." : analysis.indicators.volume_ratio < 0.8 ? "Volume faible : signal à prendre avec précaution." : "Volume normal : signal standard."}`,
                  influence: "Volume >2x ajoute +12 pts au score Volume, >1.5x ajoute +8 pts. Volume <0.5x soustrait -10 pts. Combiné à OBV et CMF pour former le score Volume complet.",
                  weight: "Composante : Volume (20%)",
                }}
              />
              </div>
              {(analysis.indicators as any).williams_r && (
                <IndicatorCard
                  name="Williams %R"
                  value={`${(analysis.indicators as any).williams_r.value.toFixed(1)}`}
                  signal={(analysis.indicators as any).williams_r.signal as any}
                  detail={{
                    description: "Le Williams %R est un oscillateur de momentum similaire au stochastique, mais inversé. Il mesure le niveau de clôture par rapport au plus haut des 14 dernières périodes. Oscille entre -100 et 0.",
                    howToRead: `Williams %R = ${(analysis.indicators as any).williams_r.value.toFixed(1)}. ${(analysis.indicators as any).williams_r.value < -80 ? "⚡ Zone de survente (<-80) : le prix clôture près des plus bas, rebond probable. Signal d'achat potentiel." : (analysis.indicators as any).williams_r.value > -20 ? "⚠️ Zone de surachat (>-20) : le prix clôture près des plus hauts, repli possible. Signal de vente potentiel." : "Zone neutre (-80 à -20) : pas de signal extrême."}`,
                    influence: "Williams %R <-80 ajoute +7 pts au score Technique (survente). Williams %R >-20 soustrait -7 pts (surachat). Complète le RSI et le Stochastique pour une vision oscillateur plus robuste.",
                    weight: "Composante : Technique (30%)",
                  }}
                />
              )}
              {(analysis.indicators as any).obv && (
                <IndicatorCard
                  name="OBV"
                  value={(analysis.indicators as any).obv.trend === "bullish" ? "↑ Haussier" : "↓ Baissier"}
                  signal={(analysis.indicators as any).obv.trend as any}
                  detail={{
                    description: "L'OBV (On-Balance Volume) est un indicateur cumulatif qui ajoute le volume lors des hausses et le soustrait lors des baisses. Il révèle si l'argent entre ou sort du marché derrière les mouvements de prix.",
                    howToRead: `Tendance OBV: ${(analysis.indicators as any).obv.trend === "bullish" ? "HAUSSIÈRE — l'OBV est au-dessus de son EMA20, les volumes d'achat dominent les volumes de vente sur les dernières sessions." : "BAISSIÈRE — l'OBV est sous son EMA20, les volumes de vente dominent."} Pente 5j: ${(analysis.indicators as any).obv.slope === "up" ? "montante ↑" : "descendante ↓"}. ${(analysis.indicators as any).obv.trend === "bullish" ? "Signal de confirmation : les institutions accumulent discrètement." : "Signal de distribution : les gros acteurs vendent leurs positions."}`,
                    influence: "OBV haussier avec pente positive ajoute +18 pts au score Volume (signal le plus fort de cette composante). OBV baissier avec pente négative soustrait -18 pts. Indique si le mouvement de prix est confirmé par les volumes.",
                    weight: "Composante : Volume (20%)",
                  }}
                />
              )}
              {(analysis.indicators as any).cmf && (
                <IndicatorCard
                  name="CMF"
                  value={`${((analysis.indicators as any).cmf.value * 100).toFixed(1)}%`}
                  signal={(analysis.indicators as any).cmf.signal as any}
                  detail={{
                    description: "Le CMF (Chaikin Money Flow) mesure le flux d'argent entrant ou sortant sur 20 périodes en combinant le prix (position dans la plage H-B) et le volume. Oscille entre -1 et +1.",
                    howToRead: `CMF = ${((analysis.indicators as any).cmf.value * 100).toFixed(1)}%. ${(analysis.indicators as any).cmf.value > 0.2 ? "🟢 Afflux fort (>20%) : forte pression acheteuse institutionnelle." : (analysis.indicators as any).cmf.value > 0.1 ? "🟢 Afflux modéré (10-20%) : les acheteurs ont l'avantage." : (analysis.indicators as any).cmf.value < -0.2 ? "🔴 Sortie forte (<-20%) : forte pression vendeuse institutionnelle." : (analysis.indicators as any).cmf.value < -0.1 ? "🔴 Sortie modérée (-10 à -20%) : les vendeurs ont l'avantage." : "Zone neutre (-10% à +10%) : équilibre acheteurs/vendeurs."} `,
                    influence: "CMF >0.2 ajoute +15 pts au score Volume. CMF >0.1 ajoute +8 pts. CMF <-0.2 soustrait -15 pts. Particulièrement efficace pour détecter les accumulations/distributions institutionnelles invisibles sur le graphique.",
                    weight: "Composante : Volume (20%)",
                  }}
                />
              )}
              {(analysis.indicators as any).momentum && (
                <IndicatorCard
                  name="Momentum"
                  value={`3j: ${(analysis.indicators as any).momentum["3d"] >= 0 ? "+" : ""}${(analysis.indicators as any).momentum["3d"].toFixed(1)}% / 10j: ${(analysis.indicators as any).momentum["10d"] >= 0 ? "+" : ""}${(analysis.indicators as any).momentum["10d"].toFixed(1)}%`}
                  signal={(analysis.indicators as any).momentum["10d"] > 3 ? "bullish" : (analysis.indicators as any).momentum["10d"] < -3 ? "bearish" : "neutral"}
                  detail={{
                    description: "Le momentum mesure la variation de prix sur plusieurs périodes de référence. Un momentum multi-périodes convergent (3j, 10j, 20j tous positifs) confirme une tendance solide.",
                    howToRead: `3 jours: ${(analysis.indicators as any).momentum["3d"] >= 0 ? "+" : ""}${(analysis.indicators as any).momentum["3d"].toFixed(2)}% | 10 jours: ${(analysis.indicators as any).momentum["10d"] >= 0 ? "+" : ""}${(analysis.indicators as any).momentum["10d"].toFixed(2)}% | 20 jours: ${(analysis.indicators as any).momentum["20d"] >= 0 ? "+" : ""}${(analysis.indicators as any).momentum["20d"].toFixed(2)}%. ${((analysis.indicators as any).momentum["3d"] > 0 && (analysis.indicators as any).momentum["10d"] > 0 && (analysis.indicators as any).momentum["20d"] > 0) ? "✅ Convergence haussière : les 3 périodes sont positives, tendance solide." : ((analysis.indicators as any).momentum["3d"] < 0 && (analysis.indicators as any).momentum["10d"] < 0 && (analysis.indicators as any).momentum["20d"] < 0) ? "⚠️ Convergence baissière : les 3 périodes sont négatives, tendance baissière établie." : "Signaux mixtes : tendance peu claire, prudence."}`,
                    influence: "Momentum 20j >15% ajoute +18 pts au score Momentum. Momentum 10j >8% ajoute +15 pts. Momentum 3j >3% ajoute +8 pts. La composante Momentum représente 20% du score final.",
                    weight: "Composante : Momentum (20%)",
                  }}
                />
              )}
            </div>
          </motion.div>

          {/* Conviction Panel */}
          {(analysis as any).conviction && (analysis as any).conviction.total_signals > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                {lang === "fr" ? "Accord entre facteurs" : "Factor agreement"}
              </h3>
              {/* The number is no longer "% of bullish signals among 32": those
                  signals are heavily correlated, so the tally counted one piece
                  of information many times. It now measures whether the four
                  independent factor families point the same way. */}
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {lang === "fr"
                  ? "Mesure si les familles d'indicateurs indépendantes — tendance, momentum, flux, oscillateurs — pointent dans le même sens. Un accord élevé ne garantit rien : il indique que le signal ne repose pas sur un seul facteur."
                  : "Measures whether the independent indicator families — trend, momentum, flow, oscillators — point the same way. High agreement guarantees nothing: it says the signal does not rest on a single factor."}
              </p>
              {(analysis as any).factor_directions && (
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries((analysis as any).factor_directions as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="border border-white/8 bg-white/[0.03] px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {({ trend: lang === "fr" ? "Tendance" : "Trend", momentum: "Momentum",
                            flow: lang === "fr" ? "Flux" : "Flow",
                            oscillators: lang === "fr" ? "Oscillateurs" : "Oscillators" } as Record<string, string>)[k] ?? k}
                      </p>
                      <p className={cn("font-mono text-sm font-bold tabular-nums",
                        v > 0.05 ? "text-profit" : v < -0.05 ? "text-loss" : "text-muted-foreground")}>
                        {v >= 0 ? "+" : ""}{v.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{lang === "fr" ? "Désaccord" : "Disagreement"}</span>
                  <span className="font-bold">{(analysis as any).conviction.score}% {lang === "fr" ? "d'accord" : "agreement"}</span>
                  <span className="text-muted-foreground">{lang === "fr" ? "Accord" : "Agreement"}</span>
                </div>
                <div className="w-full bg-loss/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${(analysis as any).conviction.score}%`,
                      background: (analysis as any).conviction.score > 60 ? "rgb(var(--profit))" : (analysis as any).conviction.score < 40 ? "rgb(var(--loss))" : "rgb(var(--warning))"
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(analysis as any).conviction.bullish_signals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-profit mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Signaux Haussiers
                    </p>
                    <ul className="space-y-1">
                      {(analysis as any).conviction.bullish_signals.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-profit mt-0.5">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(analysis as any).conviction.bearish_signals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-loss mb-2 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Signaux Baissiers
                    </p>
                    <ul className="space-y-1">
                      {(analysis as any).conviction.bearish_signals.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-loss mt-0.5">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          </div>

          {/* 6. Évaluation des risques */}
          <div id="section-risk" className="scroll-mt-16">
            <RiskAssessmentSection analysis={analysis} formatCurrency={formatPrice} />
          </div>

          {/* 7. Analyse détaillée */}
          <div id="section-detailed" className="scroll-mt-16">
            <DetailedAnalysis analysis={analysis} formatCurrency={formatPrice} tradingLevel={tradingLevel} />

            {/* 8. Fibonacci + Range 52 semaines */}
            {analysis.fibonacci && (
              <FibonacciSection analysis={analysis} formatCurrency={formatPrice} />
            )}
            {analysis.fundamentals?.["52w_high"] && analysis.fundamentals?.["52w_low"] && (
              <WeekRangeSection analysis={analysis} formatCurrency={formatPrice} />
            )}
          </div>

          {/* 9. Contexte de marché */}
          <div id="section-market" className="scroll-mt-16">
            <MarketContextSection analysis={analysis} formatCurrency={formatPrice} />
          </div>

          {/* 10. Analyse fondamentale */}
          <div id="section-fundamentals" className="scroll-mt-16">
            {analysis.fundamentals && (
              <FundamentalAnalysisEnhanced analysis={analysis} formatCurrency={formatPrice} />
            )}
          </div>

          {/* 11. Performance & Objectifs de prix */}
          <div id="section-performance" className="scroll-mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceSection analysis={analysis} />
            <PriceTargets analysis={analysis} formatCurrency={formatPrice} />
          </div>
          </div>

          {/* 12. Thèse d'investissement */}
          <InvestmentThesisSection analysis={analysis} formatCurrency={formatPrice} />

          {/* 13. Stratégies de trading */}
          <TradingStrategiesSection analysis={analysis} formatCurrency={formatPrice} style={style} />

          {/* 14. Comparaison sectorielle */}
          <SectorComparisonSection analysis={analysis} />

          {/* 15. Actualités */}
          {analysis.news && analysis.news.length > 0 && (
            <NewsSentimentSection news={analysis.news} symbol={analysis.symbol} />
          )}

          {/* 16. Fiabilité historique du score (backtest) */}
          <BacktestSection
            symbol={analysis.symbol}
            timeframe={timeframe}
            style={style}
            currentScore={analysis.score.total}
          />

          {/* 17. Description entreprise */}
          {analysis.company?.description && (
            <CompanyDescription analysis={analysis} />
          )}

          {/* 18. Section éducative */}
          <EducationalSection analysis={analysis} tradingLevel={tradingLevel} />

          {/* AMF Disclaimer */}
          <p className="text-xs text-muted-foreground/50 text-center py-2 border-t border-white/5 mt-4">
            ⚠️ Les analyses présentées ont un but exclusivement éducatif et ne constituent pas des conseils en investissement au sens de la réglementation AMF. Tout investissement comporte des risques de perte en capital.
          </p>
        </>
      )}

      {/* Skeleton loading */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-white/10" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 bg-white/10 rounded-lg" />
                <div className="h-3 w-24 bg-white/5 rounded-lg" />
              </div>
              <div className="h-8 w-20 bg-white/10 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 h-48 bg-white/5" />
            <div className="glass-card p-6 h-48 bg-white/5 lg:col-span-2" />
          </div>
          <div className="glass-card h-64 bg-white/5" />
        </div>
      )}

      {/* Empty state */}
      {!analysis && !isLoading && !error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="glass-card px-6 py-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-radial from-primary/8 to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">Analyse technique & IA</h3>
                <p className="text-sm text-muted-foreground">
                  Entrez un symbole ou sélectionnez un actif populaire pour obtenir une analyse complète en temps réel
                </p>
              </div>
              {recentAnalyses.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Reprendre</span>
                  {recentAnalyses.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSymbol(s); setSearchQuery(s); handleSearch(s); }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-primary/15 border border-white/10 hover:border-primary/30 text-xs font-mono font-semibold transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick symbols grid */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Actifs populaires</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { symbol: "BTC-USD", name: "Bitcoin",    emoji: "₿",  color: "text-neon-gold  bg-neon-gold/10  border-neon-gold/20",  cat: "Crypto"   },
                { symbol: "AAPL",    name: "Apple",      emoji: "🍎", color: "text-neon-blue  bg-neon-blue/10  border-neon-blue/20",   cat: "Actions"  },
                { symbol: "NVDA",    name: "Nvidia",     emoji: "🎮", color: "text-neon-green bg-neon-green/10 border-neon-green/20",  cat: "Actions"  },
                { symbol: "^GSPC",   name: "S&P 500",    emoji: "📈", color: "text-primary    bg-primary/10    border-primary/20",     cat: "Indice"   },
                { symbol: "ETH-USD", name: "Ethereum",   emoji: "⬡",  color: "text-neon-purple bg-neon-purple/10 border-neon-purple/20", cat: "Crypto" },
                { symbol: "MSFT",    name: "Microsoft",  emoji: "🪟", color: "text-neon-cyan  bg-neon-cyan/10  border-neon-cyan/20",   cat: "Actions"  },
                { symbol: "GC=F",    name: "Or",         emoji: "🥇", color: "text-neon-gold  bg-neon-gold/10  border-neon-gold/20",   cat: "Matière"  },
                { symbol: "EURUSD=X",name: "EUR/USD",    emoji: "💱", color: "text-muted-foreground bg-white/5 border-white/10",       cat: "Forex"    },
              ].map((item) => (
                <motion.button
                  key={item.symbol}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSymbol(item.symbol); setSearchQuery(item.symbol); handleSearch(item.symbol); }}
                  className={cn("p-4 rounded-xl border text-left transition-all group", item.color)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                      {item.cat}
                    </span>
                  </div>
                  <p className="font-bold text-sm">{item.symbol}</p>
                  <p className="text-xs text-muted-foreground/80 truncate">{item.name}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>

    {/* Floating "Ask AI" button — visible when analysis is loaded */}
    <AnimatePresence>
      {analysis && !showAIChat && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAIChat(true)}
          className={cn(
            "fixed right-6 z-40 flex items-center gap-2.5 px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl transition-all duration-300",
            // On mobile: move up when trade FAB is also visible to avoid overlap
            !fabDismissed && timeOnPage >= 4
              ? "bottom-[4.5rem] sm:bottom-6"
              : "bottom-6"
          )}
          style={{
            background: "linear-gradient(135deg, rgba(184,134,58,0.9) 0%, rgba(232,168,32,0.9) 100%)",
            border: "1px solid rgba(184,134,58,0.5)",
            boxShadow: "0 8px 32px rgba(184,134,58,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
            backdropFilter: "blur(12px)",
          }}
        >
          <Bot className="w-4 h-4" />
          {lang === "en" ? "Ask AI" : "Demander à l'IA"}
        </motion.button>
      )}
    </AnimatePresence>

    {/* Floating trade FAB */}
    <AnimatePresence>
      {analysis && !fabDismissed && timeOnPage >= 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: timeOnPage >= 20 ? 1 : 0.65, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2.5 rounded-2xl backdrop-blur-xl w-[calc(100%-2rem)] max-w-sm sm:w-auto pointer-events-auto"
          style={{
            background: "rgba(8,11,20,0.92)",
            border: timeOnPage >= 20
              ? "1px solid rgba(232,168,32,0.5)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: timeOnPage >= 20
              ? "0 0 32px rgba(232,168,32,0.28), 0 4px 24px rgba(0,0,0,0.5)"
              : "0 2px 16px rgba(0,0,0,0.4)",
            transition: "border 0.7s ease, box-shadow 0.7s ease",
          }}
        >
          {/* Carry the plan the engine just computed. Sending only the symbol
              made the user retype the direction, the stop and the target that
              are on screen right above — and retyping invites typos in the
              two numbers that define the risk. */}
          <Link
            href={`/trading?symbol=${analysis.symbol}` +
              `&direction=${analysis.risk?.direction ?? "LONG"}` +
              (analysis.risk?.suggested_sl != null ? `&sl=${analysis.risk.suggested_sl}` : "") +
              (analysis.risk?.suggested_tp != null ? `&tp=${analysis.risk.suggested_tp}` : "") +
              `&from=analysis`}
            className="flex-1 sm:flex-none"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-500",
                timeOnPage >= 20
                  ? "bg-primary text-black shadow-sm"
                  : "bg-primary/60 text-white/90"
              )}
            >
              <Zap className="w-4 h-4 flex-shrink-0" />
              {lang === "fr" ? "Ouvrir une position" : "Open a position"}
            </motion.button>
          </Link>
          <Link href="/wallet" className="flex-shrink-0">
            <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors whitespace-nowrap">
              🧪 Paper
            </button>
          </Link>
          <button
            onClick={() => setFabDismissed(true)}
            className="p-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Analysis AI Chat Panel */}
    <AnimatePresence>
      {showAIChat && analysis && (
        <AnalysisChatPanel
          analysis={analysis}
          aiInsight={aiInsight}
          tradingStyle={settings.tradingStyle}
          riskLevel={settings.riskLevel}
          tradingLevel={tradingLevel}
          lang={lang}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = () => {
    if (score >= 75) return "from-profit to-green-400";
    if (score >= 60) return "from-green-400 to-emerald-400";
    if (score >= 40) return "from-warning to-yellow-400";
    return "from-loss to-red-400";
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{score}/100</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn("h-full rounded-full bg-gradient-to-r", getColor())}
        />
      </div>
    </div>
  );
}

/** "6,8 % en dessous" — the one fact that turns an EMA number into a verdict. */
function emaSub(price: number, ema: number | null | undefined, lang: "fr" | "en"): string | undefined {
  if (!ema) return undefined;
  const pct = ((price - ema) / ema) * 100;
  // Below 0.05% the printed figure rounds to "0.0 %", and pairing that with
  // "Baissier" reads as a contradiction. Say the price is sitting on the line.
  if (Math.abs(pct) < 0.05) return lang === "en" ? "price on the line" : "prix sur la ligne";
  // The side must be decided by the same comparison that sets the card's
  // signal (price > ema), never by the sign of a rounded percentage.
  const above = price > ema;
  const side = above
    ? (lang === "en" ? "above" : "au-dessus")
    : (lang === "en" ? "below" : "en dessous");
  return lang === "en"
    ? `price ${Math.abs(pct).toFixed(1)}% ${side}`
    : `prix ${Math.abs(pct).toFixed(1)} % ${side}`;
}

function IndicatorCard({
  name,
  value,
  sub,
  signal,
  tooltip,
  detail,
}: {
  name: string;
  value: string;
  /** Why this value is bullish or bearish, in one glance — an EMA printed as
   *  "114,30 €" reads like a target unless the card says where the price
   *  sits relative to it. */
  sub?: string;
  signal: "bullish" | "bearish" | "neutral" | "oversold" | "overbought";
  tooltip?: string;
  detail?: {
    description: string;
    howToRead: string;
    influence: string;
    weight?: string;
  };
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const normalizedSignal =
    signal === "oversold" ? "bullish" :
    signal === "overbought" ? "bearish" : signal;

  const signalColors = {
    bullish: "border-profit/30 bg-profit/10",
    bearish: "border-loss/30 bg-loss/10",
    neutral: "border-white/10 bg-white/5",
  };

  const signalIcons = {
    bullish: <TrendingUp className="w-4 h-4 text-profit" />,
    bearish: <TrendingDown className="w-4 h-4 text-loss" />,
    neutral: <Activity className="w-4 h-4 text-muted-foreground" />,
  };

  const signalLabel = {
    bullish: { text: "Haussier", color: "text-profit" },
    bearish: { text: "Baissier", color: "text-loss" },
    neutral: { text: "Neutre", color: "text-muted-foreground" },
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border transition-colors overflow-hidden",
        signalColors[normalizedSignal],
        detail ? "cursor-pointer select-none" : ""
      )}
      whileHover={detail ? { scale: 1.01 } : {}}
      transition={{ duration: 0.15 }}
    >
      <div
        className="p-4"
        onClick={() => detail && setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">{name}</span>
          <div className="flex items-center gap-1.5">
            {signalIcons[normalizedSignal]}
            {detail && (
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </motion.div>
            )}
          </div>
        </div>
        <p className="font-bold text-lg">{value}</p>
        <p className={cn("text-xs font-semibold mt-1", signalLabel[normalizedSignal].color)}>
          {signal === "oversold" ? t("analysis_oversold") : signal === "overbought" ? t("analysis_overbought") : signalLabel[normalizedSignal].text}
          {sub && <span className="font-normal text-muted-foreground"> · {sub}</span>}
        </p>
        {!detail && tooltip && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-tight">{tooltip}</p>}
      </div>

      <AnimatePresence initial={false}>
        {detail && expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
              <motion.div
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 }}
              >
                <p className="text-xs font-semibold text-foreground/70 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Définition
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
              </motion.div>
              <motion.div
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.13 }}
              >
                <p className="text-xs font-semibold text-foreground/70 mb-1 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Comment lire la valeur actuelle
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail.howToRead}</p>
              </motion.div>
              <motion.div
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                <p className="text-xs font-semibold text-foreground/70 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Influence sur le score
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail.influence}</p>
                {detail.weight && (
                  <span className="mt-1.5 inline-block text-xs bg-white/10 rounded-full px-2.5 py-0.5 text-foreground/60">
                    {detail.weight}
                  </span>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FibonacciSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (v: number) => string }) {
  const { t } = useLanguage();
  const [showExplainer, setShowExplainer] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const fib = analysis.fibonacci!;
  const price = analysis.price.current;
  const fibEntries = Object.entries(fib.levels).sort((a, b) => b[1] - a[1]);

  const toggleRow = (level: string) =>
    setExpandedRows(prev => ({ ...prev, [level]: !prev[level] }));

  const levelMeta: Record<string, { color: string; importance: "high" | "medium" | "low"; role: string; tip: string; strategy: string }> = {
    "0":    { color: "bg-white/20",       importance: "low",    role: "Sommet — Résistance absolue",       tip: "Plus haut de la période analysée. Retour complet à ce niveau signifie une récupération totale du mouvement. Rare lors d'une simple correction.", strategy: "Cible de take-profit maximale en tendance haussière forte. En résistance : placer un ordre limite de vente." },
    "23.6": { color: "bg-primary/50",    importance: "low",    role: "23.6% — Retracement faible",        tip: "Correction mineure (≈ 1/4 du mouvement). Indique une tendance très forte. Le prix rebondit ici sans aller plus loin en cas de momentum solide. Peu fiable seul, mais utile combiné à un RSI en zone neutre-haute.", strategy: "En tendance haussière très forte : entrée agressive avec stop sous le 38.2%. Sinon, attendre le niveau suivant." },
    "38.2": { color: "bg-primary/80",     importance: "high",   role: "38.2% — Premier retracement majeur", tip: "Niveau d'or. Premier grand test d'une correction normale. Les gros acheteurs (fonds, institutionnels) reviennent souvent ici en tendance haussière établie. Confirme la solidité de la tendance si le prix rebondit.", strategy: "Zone d'achat privilégiée en tendance haussière. Stop : sous le 50%. Take-profit : retour vers le sommet (0%). Ratio R/R favorable si confluence avec EMA ou RSI survendu." },
    "50.0": { color: "bg-warning/80",     importance: "medium", role: "50% — Niveau psychologique clé",    tip: "Pas un ratio Fibonacci pur, mais le niveau 50% est respecté par d'énormes volumes d'ordres. Zone de décision critique : si le prix tient ici, la tendance reprend ; si ça casse, le 61.8% est quasiment inévitable.", strategy: "Zone d'achat secondaire. Meilleures opportunités si le 38.2% a déjà été cassé. Stop : sous le 61.8%. Signal d'alerte si le prix stagne ici sans rebond franc." },
    "61.8": { color: "bg-primary",        importance: "high",   role: "61.8% — Golden Ratio ★ Le plus important", tip: "Le Saint-Graal de Fibonacci. Dérivé du nombre d'or φ ≈ 1.618 (61.8 = 1/φ × 100). Les corrections profondes mais saines s'arrêtent ici. Un rebond sur ce niveau en tendance haussière est un signal d'achat très fort. Un cassage ferme suggère un retournement majeur.", strategy: "Dernière zone d'achat en tendance haussière. Stop serré sous le 78.6%. Si cassage : fermer les positions longues, envisager une position courte. C'est ici que se jouent les retournements de tendance les plus importants." },
    "78.6": { color: "bg-orange-400/70",  importance: "medium", role: "78.6% — Retracement profond",       tip: "Correction très profonde (≈ √(1 - 0.618)). Atteindre ce niveau remet sérieusement en question la tendance initiale. Dernière ligne de défense des acheteurs. Les rebounds depuis ici sont souvent violents mais risqués.", strategy: "Zone spéculative uniquement. Risque élevé. Si rebond : cible maximale = 61.8% (pas le sommet). Stop très serré sous le creux. À éviter sans confirmation oscillateur forte (RSI <25, Stoch <10)." },
    "100":  { color: "bg-white/20",       importance: "low",    role: "Creux — Support absolu",            tip: "Plus bas de la période. Retour ici = échec total de la tendance haussière précédente. Signale un retournement baissier structurel probable. Rare sauf en cas de catalyseur négatif majeur (résultats, crise, etc.).", strategy: "Zone de capitulation. En tendance baissière : observer les signaux de retournement (RSI <20, volume exceptionnel, bougie d'inversion). En tendance haussière : stop absolu pour toute position longue." },
  };

  const nearestLevel = fibEntries.reduce((prev, curr) =>
    Math.abs(curr[1] - price) < Math.abs(prev[1] - price) ? curr : prev
  );
  const nearestMeta = levelMeta[nearestLevel[0]];
  const rangeSize = fib.high - fib.low;

  // Position from top: 0% = sommet (top), 100% = creux (bottom)
  const priceFromTop = rangeSize > 0
    ? Math.max(1, Math.min(99, ((fib.high - price) / rangeSize) * 100))
    : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Niveaux de Fibonacci
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-profit/80 font-semibold">{formatCurrency(fib.high)}</span>
            <span className="text-muted-foreground/40 mx-1.5">↕</span>
            <span className="text-loss/80 font-semibold">{formatCurrency(fib.low)}</span>
            <span className="text-muted-foreground/40 ml-1.5">· 60 séances</span>
          </p>
        </div>

        {/* ? button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowExplainer(v => !v)}
            className={cn(
              "w-7 h-7 rounded-full border text-sm font-bold flex items-center justify-center transition-all",
              showExplainer
                ? "bg-primary/20 border-primary text-primary"
                : "border-white/20 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/10"
            )}
          >
            ?
          </button>

          {/* Floating help bubble */}
          <AnimatePresence initial={false}>
            {showExplainer && (
              <motion.div
                key="help-bubble"
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-9 w-80 glass-card border border-primary/30 p-4 z-50 shadow-2xl shadow-black/40"
                style={{ borderRadius: "14px" }}
              >
                {/* Arrow */}
                <div className="absolute -top-1.5 right-2.5 w-3 h-3 rotate-45"
                  style={{ background: "hsl(var(--card))", borderLeft: "1px solid rgba(232,168,32,0.3)", borderTop: "1px solid rgba(232,168,32,0.3)" }} />
                <button onClick={() => setShowExplainer(false)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 transition-colors">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>

                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  📐 Niveaux de Fibonacci
                </h4>
                <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                  <p><span className="font-semibold text-foreground/80">C&apos;est quoi ?</span> Des niveaux de support/résistance calculés à partir des ratios de la suite de Fibonacci. Après un fort mouvement, le prix a tendance à se &quot;reposer&quot; sur ces lignes avant de repartir.</p>
                  <p><span className="font-semibold text-foreground/80">Comment lire le graphique ?</span> Le trait pointillé blanc <span className="text-white font-bold">●</span> = prix actuel. Les traits horizontaux = niveaux Fibonacci. Plus le trait est <span className="text-primary font-semibold">épais et bleu</span>, plus le niveau est important.</p>
                  <div className="bg-primary/10 border border-primary/25 rounded-lg p-2.5 my-1">
                    <p className="font-semibold text-primary text-[11px] mb-1">★ 61.8% = Golden Ratio (le plus important)</p>
                    <p>Dérivé du nombre d&apos;or φ ≈ 1.618. Dernier rempart en tendance haussière — un cassage ferme signale souvent un retournement.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-white/5 rounded p-2"><span className="text-profit font-semibold">Zone haute</span><br/>0–38.2% : tendance très forte</div>
                    <div className="bg-primary/5 rounded p-2"><span className="text-primary font-semibold">Zone clé</span><br/>38.2–61.8% : retracement sain</div>
                    <div className="bg-warning/5 rounded p-2"><span className="text-warning font-semibold">Zone profonde</span><br/>61.8–78.6% : tendance fragilisée</div>
                    <div className="bg-loss/5 rounded p-2"><span className="text-loss font-semibold">Zone critique</span><br/>78.6–100% : risque de retournement</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">⚡ Fibonacci + RSI survendu + EMA alignées = signal très fiable. Cliquez sur chaque niveau pour la stratégie.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Vertical Fibonacci chart ── */}
      <div className="flex gap-2 mb-6" style={{ height: 300 }}>
        {/* Left: price labels */}
        <div className="relative flex-shrink-0" style={{ width: 72 }}>
          {fibEntries.map(([level, lvlPrice]) => {
            const top = parseFloat(level);
            return (
              <div key={level} style={{ position: "absolute", top: `${top}%`, transform: "translateY(-50%)", right: 0 }}
                className="text-[10px] text-muted-foreground/70 text-right leading-none whitespace-nowrap">
                {formatCurrency(lvlPrice)}
              </div>
            );
          })}
        </div>

        {/* Center: chart */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-white/8" style={{ minWidth: 0 }}>
          {/* Color zones (top to bottom) */}
          <div className="absolute inset-0 flex flex-col">
            <div style={{ height: "23.6%" }}  className="bg-profit/6" />
            <div style={{ height: "14.6%" }}  className="bg-profit/4" />
            <div style={{ height: "23.6%" }}  className="bg-primary/8" />
            <div style={{ height: "16.8%" }}  className="bg-warning/6" />
            <div style={{ flex: 1 }}           className="bg-loss/8" />
          </div>

          {/* Key zone bracket label */}
          <div className="absolute text-[9px] font-semibold text-primary/50 pointer-events-none"
            style={{ top: "38.2%", right: 4, transform: "translateY(-50%)" }}>
            Zone clé
          </div>

          {/* Fibonacci level lines */}
          {fibEntries.map(([level, lvlPrice]) => {
            const meta = levelMeta[level];
            const isNear = Math.abs(lvlPrice - price) / price < 0.015;
            const top = parseFloat(level);
            const isEdge = level === "0" || level === "100";
            return (
              <div key={level}
                style={{ position: "absolute", top: `${top}%`, left: 0, right: 0, transform: "translateY(-50%)", zIndex: isNear ? 8 : 5 }}
                className="flex items-center"
              >
                <div style={{
                  height: meta?.importance === "high" ? 2 : isEdge ? 1 : 1,
                  flex: 1,
                  background: isEdge ? "rgba(255,255,255,0.10)"
                    : meta?.importance === "high" ? "rgba(232,168,32,0.70)"
                    : meta?.importance === "medium" ? "rgba(234,179,8,0.45)"
                    : "rgba(255,255,255,0.18)"
                }} />
                {isNear && (
                  <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-bold flex-shrink-0 shadow-lg">
                    ← prix ici
                  </span>
                )}
              </div>
            );
          })}

          {/* Price line */}
          <div style={{ position: "absolute", top: `${priceFromTop}%`, left: 0, right: 0, transform: "translateY(-50%)", zIndex: 15 }}>
            <div className="flex items-center">
              <div className="flex-1" style={{
                height: 2,
                background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.85) 0px, rgba(255,255,255,0.85) 5px, transparent 5px, transparent 9px)"
              }} />
              <motion.div
                className="w-3.5 h-3.5 rounded-full bg-white border-2 border-primary flex-shrink-0"
                style={{ boxShadow: "0 0 10px rgba(232,168,32,0.7), 0 0 4px rgba(255,255,255,0.5)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
              />
            </div>
          </div>

          {/* Corner labels */}
          <div className="absolute top-1.5 left-2 text-[9px] text-profit/60 font-semibold pointer-events-none">▲ Sommet</div>
          <div className="absolute bottom-1.5 left-2 text-[9px] text-loss/60 font-semibold pointer-events-none">▼ Creux</div>
        </div>

        {/* Right: % labels */}
        <div className="relative flex-shrink-0" style={{ width: 40 }}>
          {fibEntries.map(([level]) => {
            const meta = levelMeta[level];
            const top = parseFloat(level);
            if (level === "0" || level === "100") return null;
            return (
              <div key={level}
                style={{ position: "absolute", top: `${top}%`, transform: "translateY(-50%)", left: 0 }}
                className="leading-none"
              >
                <span className={cn(
                  "text-[10px] font-mono font-bold",
                  meta?.importance === "high" ? "text-primary" :
                  meta?.importance === "medium" ? "text-warning/80" :
                  "text-muted-foreground/40"
                )}>
                  {level}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 rounded" style={{ background: "rgba(232,168,32,0.70)" }} />
          <span>Niveau ★★★</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-px rounded" style={{ background: "rgba(234,179,8,0.45)" }} />
          <span>Niveau ★★</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-primary" style={{ boxShadow: "0 0 6px rgba(232,168,32,0.5)" }} />
          <span>Prix actuel — {formatCurrency(price)}</span>
        </div>
      </div>

      {/* Nearest level callout */}
      <motion.div
        className="mb-4 p-3.5 bg-primary/10 border border-primary/25 rounded-xl"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-xs font-semibold text-foreground/60 mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          Niveau le plus proche · prix actuel {formatCurrency(price)}
        </p>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <span className="font-bold text-primary text-base">{nearestLevel[0]}%</span>
            <p className="text-xs text-muted-foreground mt-0.5">{nearestMeta?.role}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{formatCurrency(nearestLevel[1])}</p>
            <p className={cn("text-xs font-semibold", (price - nearestLevel[1]) >= 0 ? "text-profit" : "text-loss")}>
              {(price - nearestLevel[1]) >= 0 ? "+" : ""}{((price - nearestLevel[1]) / nearestLevel[1] * 100).toFixed(2)}%
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{nearestMeta?.tip}</p>
        <p className="text-xs text-foreground/40 mt-1 italic">
          {price >= nearestLevel[1]
            ? "▲ Prix au-dessus → ce niveau agit comme support potentiel en cas de repli"
            : "▼ Prix en dessous → ce niveau agit comme résistance potentielle en cas de rebond"}
        </p>
      </motion.div>

      {/* Levels list — each row expandable */}
      <div className="space-y-1.5">
        {fibEntries.map(([level, lvlPrice], i) => {
          const meta = levelMeta[level];
          const isNear = Math.abs(lvlPrice - price) / price < 0.015;
          const isPriceAbove = price >= lvlPrice;
          const distPct = (price - lvlPrice) / lvlPrice * 100;
          const rowOpen = !!expandedRows[level];

          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div
                className={cn(
                  "rounded-xl border overflow-hidden transition-colors cursor-pointer",
                  isNear ? "bg-primary/15 border-primary/40" : "bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15"
                )}
                onClick={() => toggleRow(level)}
              >
                {/* Row summary */}
                <div className="flex items-center gap-3 p-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    meta?.importance === "high"   ? "bg-primary shadow-sm shadow-primary/60" :
                    meta?.importance === "medium" ? "bg-warning" : "bg-white/25"
                  )} />
                  <span className={cn(
                    "text-xs font-mono w-10 flex-shrink-0 font-bold",
                    meta?.importance === "high"   ? "text-primary" :
                    meta?.importance === "medium" ? "text-warning" : "text-muted-foreground"
                  )}>
                    {level}%
                  </span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", meta?.color ?? "bg-white/30")} style={{ width: `${100 - parseFloat(level)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground hidden lg:block w-44 text-right flex-shrink-0 truncate">{meta?.role}</span>
                  <span className={cn("font-bold text-sm w-24 text-right flex-shrink-0", isNear ? "text-primary" : isPriceAbove ? "text-profit/80" : "text-loss/80")}>
                    {formatCurrency(lvlPrice)}
                  </span>
                  <span className={cn("text-xs w-14 text-right flex-shrink-0 hidden sm:block font-semibold",
                    Math.abs(distPct) < 1.5 ? "text-primary" : distPct > 0 ? "text-profit/70" : "text-loss/70"
                  )}>
                    {distPct >= 0 ? "+" : ""}{distPct.toFixed(1)}%
                  </span>
                  {isNear && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/30 text-primary font-semibold flex-shrink-0 hidden sm:block">← Ici</span>}
                  <motion.div animate={{ rotate: rowOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
                    <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                  </motion.div>
                </div>

                {/* Row detail */}
                <AnimatePresence initial={false}>
                  {rowOpen && (
                    <motion.div
                      key="row-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-white/8 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground/60 mb-1 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Signification
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{meta?.tip}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground/60 mb-1 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Stratégie de trading
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{meta?.strategy}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1 border-t border-white/5">
                          <div>
                            <span className="text-foreground/40">Distance : </span>
                            <span className={cn("font-bold", distPct >= 0 ? "text-profit" : "text-loss")}>
                              {distPct >= 0 ? "+" : ""}{distPct.toFixed(2)}% ({formatCurrency(Math.abs(price - lvlPrice))})
                            </span>
                          </div>
                          <div>
                            <span className="text-foreground/40">{t("analysis_fib_role")} : </span>
                            <span className="font-semibold text-foreground/80">{isPriceAbove ? t("analysis_fib_support") : t("analysis_fib_resistance")}</span>
                          </div>
                          <div>
                            <span className="text-foreground/40">{t("analysis_fib_importance")} : </span>
                            <span className={cn("font-semibold",
                              meta?.importance === "high" ? "text-primary" :
                              meta?.importance === "medium" ? "text-warning" : "text-muted-foreground"
                            )}>
                              {meta?.importance === "high" ? t("analysis_fib_high") : meta?.importance === "medium" ? t("analysis_fib_medium") : t("analysis_fib_low_imp")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div
        className="mt-4 p-3.5 bg-white/3 rounded-xl border border-white/8 text-xs text-muted-foreground"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      >
        <p className="font-semibold text-foreground/60 mb-1.5 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" /> Stratégie de confluence (recommandée)
        </p>
        <p className="leading-relaxed">
          En tendance haussière, les institutionnels achètent sur le <span className="text-primary font-semibold">38.2%</span> ou le <span className="text-primary font-semibold">61.8%</span> avec un stop sous le niveau suivant.
          Le signal est <span className="text-foreground/80 font-semibold">beaucoup plus fiable</span> quand il coïncide avec : une EMA (20, 50 ou 200), un RSI survendu (&lt;30), un rebond de volume, ou un croisement MACD.
          Cliquez sur chaque niveau pour voir la stratégie détaillée.
        </p>
      </motion.div>
    </motion.div>
  );
}

function WeekRangeSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (v: number) => string }) {
  const { t } = useLanguage();
  const low52 = analysis.fundamentals!["52w_low"]!;
  const high52 = analysis.fundamentals!["52w_high"]!;
  const price = analysis.price.current;
  const rangeSize = high52 - low52;
  const position = rangeSize > 0 ? Math.min(100, Math.max(0, ((price - low52) / rangeSize) * 100)) : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Gauge className="w-5 h-5 text-primary" />
        Position 52 semaines
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Plus bas 52s: <span className="text-loss font-semibold">{formatCurrency(low52)}</span></span>
          <span>Plus haut 52s: <span className="text-profit font-semibold">{formatCurrency(high52)}</span></span>
        </div>
        <div className="relative h-6 bg-white/10 rounded-full overflow-visible">
          {/* gradient track */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-loss/40 via-warning/40 to-profit/40" />
          {/* price marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${position}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-white border-2 border-primary shadow-lg shadow-primary/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">0%</span>
          <div className="text-center">
            <p className="text-lg font-bold">{formatCurrency(price)}</p>
            <p className="text-xs text-muted-foreground">
              {position.toFixed(0)}% {t("analysis_annual_range")} — {position > 80 ? t("analysis_near_top") : position < 20 ? t("analysis_near_floor") : t("analysis_mid_zone")}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">100%</span>
        </div>
      </div>
    </motion.div>
  );
}

// Asset Header with logo and name
function AssetHeader({
  analysis,
  isFavorite,
  toggleFavorite,
  formatCurrency
}: {
  analysis: Analysis;
  isFavorite: boolean;
  toggleFavorite: () => void;
  formatCurrency: (value: number) => string;
}) {
  const { lang } = useLanguage();
  const assetInfo = getAssetInfo(analysis.symbol);
  const logoUrl = getAssetLogo(analysis.symbol);

  const isUp = analysis.price.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Color accent bar */}
      <div className={cn("h-1 w-full", isUp ? "bg-gradient-to-r from-profit/60 to-profit" : "bg-gradient-to-r from-loss/60 to-loss")} />

      <div className="p-6">
        {/* Top row: logo + name + price + actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={logoUrl}
                  alt={assetInfo.name}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<span class="font-bold text-xl">${analysis.symbol.slice(0, 2)}</span>`;
                  }}
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-xl text-white">{analysis.symbol.slice(0, 2)}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{assetInfo.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-muted-foreground font-mono">{analysis.symbol}</span>
                {assetInfo.sector && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs border border-primary/20">
                    {assetInfo.sector}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right">
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(analysis.price.current)}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full",
                  isUp ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
                )}>
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatPercent(analysis.price.change)}
                </span>
              </div>
            </div>
            <HelpGuide
              size="sm"
              title="Page d'analyse"
              intro="Analyse complète d'un actif : indicateurs techniques, signaux IA, niveaux clés et gestion du risque."
              sections={[
                { title: "Signal IA", desc: "L'IA analyse les indicateurs et te donne un signal global (Achat / Vente / Neutre) avec un niveau de confiance." },
                { title: "Indicateurs techniques", desc: "RSI, MACD, Moyennes mobiles, Bandes de Bollinger… Chaque indicateur est expliqué et interprété pour toi." },
                { title: "Niveaux de Fibonacci", desc: "Zones clés de support et résistance calculées automatiquement sur le dernier mouvement de prix." },
                { title: "Score de risque", desc: "Évaluation du risque actuel sur l'actif — plus le score est élevé, plus la prudence s'impose." },
                { title: "Analyse de séance", desc: "Résumé IA de la journée : catalyseurs, tendance de fond et contexte macro si disponible." },
              ]}
              tip="Clique sur chaque module pour le déplier. Les flèches sur le signal indiquent les niveaux d'entrée suggérés."
            />
            <button
              onClick={toggleFavorite}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              {isFavorite ? (
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ) : (
                <StarOff className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {analysis.levels.window_bars && (
          <p className="mt-4 -mb-2 text-center font-mono text-[10px] text-muted-foreground/60">
            {/* A support 20% under the price is a multi-year floor, not an
                intraday level — say over what window it was measured. */}
            {lang === "en"
              ? `Levels measured over the last ${analysis.levels.window_bars} ${analysis.levels.window_interval} bars`
              : `Niveaux mesurés sur les ${analysis.levels.window_bars} dernières bougies ${analysis.levels.window_interval}`}
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Support</p>
            <p className="text-sm font-semibold text-profit">{formatCurrency(analysis.levels.support)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Pivot</p>
            <p className="text-sm font-semibold">{formatCurrency(analysis.levels.pivot)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Résistance</p>
            <p className="text-sm font-semibold text-loss">{formatCurrency(analysis.levels.resistance)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Vol. ratio</p>
            <p className={cn(
              "text-sm font-semibold",
              analysis.indicators.volume_ratio > 1.5 ? "text-profit" : analysis.indicators.volume_ratio < 0.7 ? "text-loss" : "text-muted-foreground"
            )}>{analysis.indicators.volume_ratio.toFixed(2)}x</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Detailed Analysis with explanations
function DetailedAnalysis({ analysis, formatCurrency, tradingLevel = "intermediate" }: { analysis: Analysis; formatCurrency: (value: number) => string; tradingLevel?: string }) {
  // Beginners: open the trend module by default to guide them
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(tradingLevel === "beginner" ? ["trend"] : [])
  );

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  // Educational content for each indicator
  const indicatorEducation = {
    rsi: {
      title: "RSI (Relative Strength Index)",
      formula: "RSI = 100 - (100 / (1 + RS)) ou RS = Moyenne gains / Moyenne pertes",
      basics: [
        "Le RSI mesure la vitesse et l'amplitude des mouvements de prix recents",
        "Il oscille entre 0 et 100",
        "Periode standard: 14 (parametre par defaut de Wilder)"
      ],
      interpretation: [
        { condition: "RSI < 30", meaning: "Zone de survente - Signal d'achat potentiel" },
        { condition: "RSI > 70", meaning: "Zone de surachat - Signal de vente potentiel" },
        { condition: "RSI ~ 50", meaning: "Zone neutre - Pas de signal extrême" }
      ],
      advanced: [
        "Les divergences RSI/Prix sont des signaux tres fiables",
        "En tendance forte, utilisez 80/20 au lieu de 70/30",
        "Le RSI peut rester en zone extrême longtemps en tendance"
      ],
      tips: "Ne jamais trader uniquement sur les niveaux 30/70. Confirmez toujours avec la tendance generale."
    },
    macd: {
      title: "MACD (Moving Average Convergence Divergence)",
      formula: "MACD = EMA(12) - EMA(26) | Signal = EMA(9) du MACD",
      basics: [
        "Le MACD montre la relation entre deux moyennes mobiles exponentielles",
        "Compose de: Ligne MACD, Ligne Signal, Histogramme",
        "Créé par Gerald Appel en 1979"
      ],
      interpretation: [
        { condition: "MACD > Signal", meaning: "Signal haussier - Momentum positif" },
        { condition: "MACD < Signal", meaning: "Signal baissier - Momentum négatif" },
        { condition: "MACD > 0", meaning: "Tendance haussière dominante" }
      ],
      advanced: [
        "Les croisements de la ligne zéro sont plus significatifs",
        "L'histogramme prédit souvent les croisements à venir",
        "Les divergences MACD/Prix precedent les retournements"
      ],
      tips: "L'histogramme est predictif - quand il diminue, le croisement approche. Surveillez-le!"
    },
    bollinger: {
      title: "Bandes de Bollinger",
      formula: "Bande Haute = SMA(20) + 2σ | Bande Basse = SMA(20) - 2σ",
      basics: [
        "Les bandes encadrent le prix avec des niveaux de deviation standard",
        "Elles s'adaptent automatiquement à la volatilité",
        "95% du temps, le prix reste dans les bandes"
      ],
      interpretation: [
        { condition: "Prix > Bande haute", meaning: "Potentiel surachat - Extension du mouvement" },
        { condition: "Prix < Bande basse", meaning: "Potentiel survente - Rebond possible" },
        { condition: "Bandes resserrees", meaning: "Squeeze - Explosion a venir" }
      ],
      advanced: [
        "Le Squeeze (bandes etroites) precede souvent un grand mouvement",
        "Utilisez avec le volume pour confirmer les cassures",
        "Les touches de bande ne sont pas des signaux automatiques"
      ],
      tips: "Le meilleur signal: Squeeze + Cassure avec volume = Mouvement explosif probable!"
    },
    volume: {
      title: "Analyse du Volume",
      formula: "Volume Ratio = Volume Actuel / Moyenne Volume (20 periodes)",
      basics: [
        "Le volume mesure l'activité et l'intérêt du marché",
        "Un mouvement avec volume est plus fiable",
        "Le volume confirme ou infirme les mouvements de prix"
      ],
      interpretation: [
        { condition: "Volume > 1.5x moyenne", meaning: "Fort interet - Mouvement significatif" },
        { condition: "Volume < 0.7x moyenne", meaning: "Faible interet - Mouvement suspect" },
        { condition: "Volume normal", meaning: "Activite standard du marche" }
      ],
      advanced: [
        "Volume croissant en tendance = Tendance saine",
        "Volume decroissant en tendance = Essoufflement",
        "Divergence prix/volume = Signal de retournement"
      ],
      tips: "Regle d'or: Ne jamais faire confiance a un mouvement sans volume!"
    },
    trend: {
      title: "Analyse de Tendance (EMA)",
      formula: "EMA = Prix × k + EMA(hier) × (1-k) ou k = 2/(n+1)",
      basics: [
        "Les EMAs donnent plus de poids aux prix recents",
        "EMA20 pour le court terme, EMA50 pour le moyen terme",
        "Prix > EMAs = Tendance haussière | Prix < EMAs = Tendance baissière"
      ],
      interpretation: [
        { condition: "Prix > EMA20 > EMA50", meaning: "Tendance haussière forte" },
        { condition: "Prix < EMA20 < EMA50", meaning: "Tendance baissière forte" },
        { condition: "EMAs entremelees", meaning: "Pas de tendance claire (range)" }
      ],
      advanced: [
        "Golden Cross: EMA50 croise EMA200 vers le haut = Signal bullish majeur",
        "Death Cross: EMA50 croise EMA200 vers le bas = Signal bearish majeur",
        "Les pullbacks vers l'EMA20 sont des opportunités d'entrée"
      ],
      tips: "Tradez toujours DANS le sens de la tendance. 'Trend is your friend!'"
    }
  };

  const getRSIInterpretation = () => {
    const rsi = analysis.indicators.rsi.value;
    if (rsi < 30) {
      return {
        status: "oversold",
        icon: <CheckCircle className="w-5 h-5 text-profit" />,
        title: "Zone de survente",
        description: `Le RSI à ${rsi.toFixed(1)} indique que l'actif est survendu. Cela suggère un potentiel rebond haussier. Les acheteurs pourraient bientôt reprendre le contrôle.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (rsi > 70) {
      return {
        status: "overbought",
        icon: <AlertTriangle className="w-5 h-5 text-loss" />,
        title: "Zone de surachat",
        description: `Le RSI à ${rsi.toFixed(1)} indique que l'actif est suracheté. Une correction baissière est probable. Prudence recommandée pour les nouvelles positions longues.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    } else {
      return {
        status: "neutral",
        icon: <Activity className="w-5 h-5 text-primary" />,
        title: "Zone neutre",
        description: `Le RSI à ${rsi.toFixed(1)} se situe dans une zone neutre. Pas de signal extrême de surachat ou de survente. L'actif évolue normalement.`,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    }
  };

  const getMACDInterpretation = () => {
    const macd = analysis.indicators.macd;
    const isBullish = macd.histogram > 0;
    const crossingUp = macd.histogram > 0 && macd.value > macd.signal_line;

    if (crossingUp) {
      return {
        icon: <TrendingUp className="w-5 h-5 text-profit" />,
        title: "Signal haussier",
        description: `Le MACD (${macd.value.toFixed(4)}) est au-dessus de sa ligne de signal (${macd.signal_line.toFixed(4)}). L'histogramme positif confirme la dynamique haussière. Bon moment pour considérer des positions longues.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else {
      return {
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        title: "Signal baissier",
        description: `Le MACD (${macd.value.toFixed(4)}) est en dessous de sa ligne de signal (${macd.signal_line.toFixed(4)}). L'histogramme négatif indique une pression vendeuse. Prudence recommandée.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    }
  };

  const getBollingerInterpretation = () => {
    const bb = analysis.indicators.bollinger;
    const price = analysis.price.current;
    const position = bb.position;

    if (position === "upper") {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-warning" />,
        title: "Proche de la bande supérieure",
        description: `Le prix (${formatCurrency(price)}) est proche ou au-dessus de la bande supérieure (${formatCurrency(bb.upper)}). Cela peut indiquer une surchauffe du marché. Un retour vers la moyenne (${formatCurrency(bb.middle)}) est possible.`,
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    } else if (position === "lower") {
      return {
        icon: <CheckCircle className="w-5 h-5 text-profit" />,
        title: "Proche de la bande inferieure",
        description: `Le prix (${formatCurrency(price)}) est proche ou en dessous de la bande inferieure (${formatCurrency(bb.lower)}). Cela peut representer une opportunite d'achat. Un rebond vers la moyenne (${formatCurrency(bb.middle)}) est envisageable.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else {
      return {
        icon: <Activity className="w-5 h-5 text-primary" />,
        title: "Dans le canal",
        description: `Le prix (${formatCurrency(price)}) évolue entre les bandes de Bollinger (${formatCurrency(bb.lower)} - ${formatCurrency(bb.upper)}). Le marché est dans une phase normale avec une volatilité modérée.`,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    }
  };

  const getTrendInterpretation = () => {
    const trend = analysis.trend;
    const ema = analysis.indicators.ema;
    const price = analysis.price.current;

    if (trend === "BULLISH") {
      return {
        icon: <TrendingUp className="w-5 h-5 text-profit" />,
        title: "Tendance haussière",
        description: `Le prix (${formatCurrency(price)}) est au-dessus des moyennes mobiles EMA20 (${formatCurrency(ema.ema20)}) et EMA50 (${formatCurrency(ema.ema50)}). La structure du marché est haussière. Les corrections peuvent être des opportunités d'achat.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (trend === "BEARISH") {
      return {
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        title: "Tendance baissière",
        description: `Le prix (${formatCurrency(price)}) est en dessous des moyennes mobiles EMA20 (${formatCurrency(ema.ema20)}) et EMA50 (${formatCurrency(ema.ema50)}). La structure du marché est baissière. Évitez les positions longues jusqu'à un retournement confirmé.`,
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    } else {
      return {
        icon: <Activity className="w-5 h-5 text-warning" />,
        title: "Tendance neutre / Consolidation",
        description: `Le prix oscille autour des moyennes mobiles sans direction claire. Le marché est en phase de consolidation. Attendez une cassure nette avant de prendre position.`,
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    }
  };

  const getVolumeInterpretation = () => {
    const ratio = analysis.indicators.volume_ratio;

    if (ratio > 1.5) {
      return {
        icon: <BarChart3 className="w-5 h-5 text-profit" />,
        title: "Volume élevé",
        description: `Le volume actuel est ${ratio.toFixed(2)}x supérieur à la moyenne. Un fort volume confirme la validité du mouvement en cours. Les mouvements avec volume sont plus fiables.`,
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (ratio < 0.7) {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-warning" />,
        title: "Volume faible",
        description: `Le volume actuel est ${ratio.toFixed(2)}x inferieur a la moyenne. Un faible volume peut indiquer un manque de conviction. Les mouvements de prix sont moins fiables.`,
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    } else {
      return {
        icon: <BarChart3 className="w-5 h-5 text-primary" />,
        title: "Volume normal",
        description: `Le volume actuel (${ratio.toFixed(2)}x la moyenne) est dans la norme. L'activité du marché est standard sans excès ni manque de liquidité.`,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    }
  };

  const rsiInfo = getRSIInterpretation();
  const macdInfo = getMACDInterpretation();
  const bbInfo = getBollingerInterpretation();
  const trendInfo = getTrendInterpretation();
  const volumeInfo = getVolumeInterpretation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Info className="w-5 h-5 text-primary" />
        Analyse Detaillee
      </h3>

      <div className="space-y-4">
        {/* Trend Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", trendInfo.bgColor)}
          onClick={() => toggleModule('trend')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {trendInfo.icon}
              <div>
                <h4 className={cn("font-semibold", trendInfo.color)}>{trendInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{trendInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tradingLevel !== "expert" && (
                <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              )}
              {expandedModules.has('trend') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {tradingLevel !== "expert" && expandedModules.has('trend') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.trend.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.trend.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.trend.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.trend.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.trend.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.trend.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* RSI Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", rsiInfo.bgColor)}
          onClick={() => toggleModule('rsi')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {rsiInfo.icon}
              <div>
                <h4 className={cn("font-semibold", rsiInfo.color)}>RSI: {rsiInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{rsiInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tradingLevel !== "expert" && (
                <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              )}
              {expandedModules.has('rsi') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {tradingLevel !== "expert" && expandedModules.has('rsi') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.rsi.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.rsi.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.rsi.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.rsi.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.rsi.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.rsi.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* MACD Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", macdInfo.bgColor)}
          onClick={() => toggleModule('macd')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {macdInfo.icon}
              <div>
                <h4 className={cn("font-semibold", macdInfo.color)}>MACD: {macdInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{macdInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tradingLevel !== "expert" && (
                <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              )}
              {expandedModules.has('macd') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {tradingLevel !== "expert" && expandedModules.has('macd') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.macd.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.macd.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.macd.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.macd.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.macd.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.macd.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bollinger Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", bbInfo.bgColor)}
          onClick={() => toggleModule('bollinger')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {bbInfo.icon}
              <div>
                <h4 className={cn("font-semibold", bbInfo.color)}>Bollinger: {bbInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{bbInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tradingLevel !== "expert" && (
                <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              )}
              {expandedModules.has('bollinger') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {tradingLevel !== "expert" && expandedModules.has('bollinger') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.bollinger.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.bollinger.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.bollinger.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.bollinger.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.bollinger.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.bollinger.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Volume Analysis - Interactive Module */}
        <div
          className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]", volumeInfo.bgColor)}
          onClick={() => toggleModule('volume')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {volumeInfo.icon}
              <div>
                <h4 className={cn("font-semibold", volumeInfo.color)}>{volumeInfo.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{volumeInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tradingLevel !== "expert" && (
                <span className="text-xs text-muted-foreground">Cliquez pour en savoir +</span>
              )}
              {expandedModules.has('volume') ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {tradingLevel !== "expert" && expandedModules.has('volume') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <h5 className="text-sm font-semibold text-primary mb-2">{indicatorEducation.volume.title}</h5>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{indicatorEducation.volume.formula}</p>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Les bases:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.volume.basics.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CircleDot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Interpretation:</h6>
                  <div className="space-y-2">
                    {indicatorEducation.volume.interpretation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{item.condition}</code>
                        <span className="text-muted-foreground">{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h6 className="text-xs font-semibold mb-2">Techniques avancees:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {indicatorEducation.volume.advanced.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{indicatorEducation.volume.tips}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          Résumé de l'analyse
        </h4>
        <p className="text-sm text-muted-foreground">
          {analysis.score.total >= 75 ? (
            <>L'ensemble des indicateurs techniques convergent vers un signal <span className="text-profit font-semibold">fortement haussier</span>. Les conditions sont favorables pour une prise de position longue avec un ratio risque/rendement de 1:{analysis.risk.risk_reward}.</>
          ) : analysis.score.total >= 60 ? (
            <>Les indicateurs montrent une tendance <span className="text-profit font-semibold">modérément haussière</span>. Le marché présente des opportunités mais avec une conviction moins forte. Gérez votre risque avec attention.</>
          ) : analysis.score.total >= 40 ? (
            <>Le marché est actuellement en <span className="text-warning font-semibold">phase neutre</span>. Aucune direction claire ne se dégage. Il est préférable d'attendre un signal plus net avant de prendre position.</>
          ) : analysis.score.total >= 25 ? (
            <>Les indicateurs pointent vers une tendance <span className="text-loss font-semibold">modérément baissière</span>. Évitez les positions longues et considérez des stratégies de couverture.</>
          ) : (
            <>L'ensemble des signaux indiquent une <span className="text-loss font-semibold">forte pression vendeuse</span>. Il est fortement déconseillé de prendre des positions longues dans ces conditions.</>
          )}
        </p>
      </div>
    </motion.div>
  );
}

// Fundamental Analysis Section
function FundamentalAnalysis({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const f = analysis.fundamentals;
  if (!f) return null;

  const formatLargeNumber = (num: number | undefined) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  const formatPct = (num: number | undefined) => {
    if (num === undefined || num === null) return "N/A";
    return `${(num * 100).toFixed(2)}%`;
  };

  const getValueColor = (value: number | undefined, goodAbove: number, badBelow: number) => {
    if (value === undefined) return "text-muted-foreground";
    if (value >= goodAbove) return "text-profit";
    if (value <= badBelow) return "text-loss";
    return "text-warning";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <BarChart3 className="w-5 h-5 text-primary" />
        Analyse Fondamentale
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Market Cap */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Capitalisation</p>
          <p className="font-bold text-lg">{formatLargeNumber(f.market_cap)}</p>
        </div>

        {/* P/E Ratio */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">P/E Ratio</p>
          <p className={cn("font-bold text-lg", getValueColor(f.pe_ratio, 25, 10))}>
            {f.pe_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* Forward P/E */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Forward P/E</p>
          <p className="font-bold text-lg">{f.forward_pe?.toFixed(2) || "N/A"}</p>
        </div>

        {/* PEG Ratio */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">PEG Ratio</p>
          <p className={cn("font-bold text-lg", f.peg_ratio && f.peg_ratio < 1 ? "text-profit" : f.peg_ratio && f.peg_ratio > 2 ? "text-loss" : "")}>
            {f.peg_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* Revenue Growth */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Croissance CA</p>
          <p className={cn("font-bold text-lg", f.revenue_growth && f.revenue_growth > 0 ? "text-profit" : "text-loss")}>
            {formatPct(f.revenue_growth)}
          </p>
        </div>

        {/* Profit Margin */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Marge nette</p>
          <p className={cn("font-bold text-lg", f.profit_margin && f.profit_margin > 0.1 ? "text-profit" : "text-loss")}>
            {formatPct(f.profit_margin)}
          </p>
        </div>

        {/* ROE */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">ROE</p>
          <p className={cn("font-bold text-lg", f.roe && f.roe > 0.15 ? "text-profit" : "")}>
            {formatPct(f.roe)}
          </p>
        </div>

        {/* Dividend Yield */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Dividende</p>
          <p className="font-bold text-lg">{formatPct(f.dividend_yield)}</p>
        </div>

        {/* Debt/Equity */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Dette/Equity</p>
          <p className={cn("font-bold text-lg", f.debt_to_equity && f.debt_to_equity > 100 ? "text-loss" : "text-profit")}>
            {f.debt_to_equity?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* Beta */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Beta</p>
          <p className={cn("font-bold text-lg", f.beta && f.beta > 1.5 ? "text-warning" : "")}>
            {f.beta?.toFixed(2) || "N/A"}
          </p>
        </div>

        {/* 52W High */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Plus haut 52s</p>
          <p className="font-bold text-lg">{f["52w_high"] ? formatCurrency(f["52w_high"]) : "N/A"}</p>
        </div>

        {/* 52W Low */}
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Plus bas 52s</p>
          <p className="font-bold text-lg">{f["52w_low"] ? formatCurrency(f["52w_low"]) : "N/A"}</p>
        </div>
      </div>

      {/* Analyst Recommendation */}
      {f.recommendation && (
        <div className="mt-4 p-4 bg-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recommandation des analystes</p>
              <p className={cn(
                "font-bold text-xl mt-1",
                f.recommendation.includes("buy") ? "text-profit" :
                f.recommendation.includes("sell") ? "text-loss" : "text-warning"
              )}>
                {f.recommendation.toUpperCase()}
              </p>
            </div>
            {f.num_analysts && (
              <p className="text-sm text-muted-foreground">{f.num_analysts} analystes</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Performance Section
function PerformanceSection({ analysis }: { analysis: Analysis }) {
  const p = analysis.performance;
  const v = analysis.volatility;

  const formatPct = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "N/A";
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
  };

  const getColor = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "text-muted-foreground";
    return num >= 0 ? "text-profit" : "text-loss";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Performance Historique
      </h3>

      <div className="space-y-3">
        {[
          { label: "1 jour", value: p?.["1d"] },
          { label: "1 semaine", value: p?.["1w"] },
          { label: "1 mois", value: p?.["1m"] },
          { label: "3 mois", value: p?.["3m"] },
          { label: "6 mois", value: p?.["6m"] },
          { label: "YTD", value: p?.ytd },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className={cn("font-semibold", getColor(item.value))}>
              {formatPct(item.value)}
            </span>
          </div>
        ))}
      </div>

      {v && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-muted-foreground mb-2">Volatilite annualisee</p>
          <div className="flex gap-4">
            <div className="flex-1 p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">20 jours</p>
              <p className="font-semibold">{v["20d"]?.toFixed(1)}%</p>
            </div>
            {v["60d"] && (
              <div className="flex-1 p-2 bg-white/5 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">60 jours</p>
                <p className="font-semibold">{v["60d"]?.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Price Targets Section
function PriceTargets({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const t = analysis.targets;
  const currentPrice = analysis.price.current;

  const getPctFromCurrent = (target: number | undefined) => {
    if (!target) return null;
    return ((target - currentPrice) / currentPrice * 100).toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        Objectifs de Prix
      </h3>

      {/* Technical Targets */}
      <div className="space-y-3 mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Objectifs techniques</p>
        {t?.bull && (
          <div className="flex items-center justify-between p-3 bg-profit/10 rounded-lg border border-profit/20">
            <div>
              <span className="text-sm text-muted-foreground">Scenario haussier</span>
              <p className="font-bold text-profit">{formatCurrency(t.bull)}</p>
            </div>
            <span className="text-profit text-sm">+{getPctFromCurrent(t.bull)}%</span>
          </div>
        )}
        {t?.base && (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div>
              <span className="text-sm text-muted-foreground">Scenario base</span>
              <p className="font-bold text-primary">{formatCurrency(t.base)}</p>
            </div>
            <span className="text-primary text-sm">+{getPctFromCurrent(t.base)}%</span>
          </div>
        )}
        {t?.bear && (
          <div className="flex items-center justify-between p-3 bg-loss/10 rounded-lg border border-loss/20">
            <div>
              <span className="text-sm text-muted-foreground">Scenario baissier</span>
              <p className="font-bold text-loss">{formatCurrency(t.bear)}</p>
            </div>
            <span className="text-loss text-sm">{getPctFromCurrent(t.bear)}%</span>
          </div>
        )}
      </div>

      {/* Analyst Targets */}
      {t?.analyst_mean && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Objectifs analystes</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Bas</p>
              <p className="font-semibold text-loss">{formatCurrency(t.analyst_low || 0)}</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Moyen</p>
              <p className="font-semibold">{formatCurrency(t.analyst_mean)}</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Haut</p>
              <p className="font-semibold text-profit">{formatCurrency(t.analyst_high || 0)}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Company Description
function CompanyDescription({ analysis }: { analysis: Analysis }) {
  const c = analysis.company;
  if (!c?.description) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" />
        A propos de {c.name || analysis.symbol}
      </h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {c.sector && (
          <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{c.sector}</span>
        )}
        {c.industry && (
          <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{c.industry}</span>
        )}
        {c.country && (
          <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{c.country}</span>
        )}
        {c.employees && (
          <span className="px-3 py-1 bg-white/10 rounded-full text-sm">{c.employees.toLocaleString()} employes</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {c.description.length > 500 ? c.description.substring(0, 500) + "..." : c.description}
      </p>

      {c.website && (
        <a
          href={c.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-primary hover:underline text-sm"
        >
          Visiter le site web
          <ArrowRight className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}

// ── Markdown renderer for AI analysis output ──────────────────────────────

function renderInlineAI(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i} className="text-foreground/80">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={i} className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function renderAIText(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let k = 0;

  const flushList = () => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={`l${k++}`} className="space-y-1.5 my-2 ml-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
            <span className="text-primary/70 mt-0.5 shrink-0">▸</span>
            <span>{renderInlineAI(item)}</span>
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
        <h2 key={`h${k++}`} className="text-sm font-bold text-foreground mt-5 mb-2 pb-1.5 border-b border-white/10">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h3 key={`h${k++}`} className="text-sm font-semibold text-foreground/90 mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (/^[-*•] /.test(line)) {
      listBuffer.push(line.replace(/^[-*•] /, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={`p${k++}`} className="text-sm text-muted-foreground leading-relaxed mb-1.5">
          {renderInlineAI(line)}
        </p>
      );
    }
  }
  flushList();
  return <>{nodes}</>;
}

// ─────────────────────────────────────────────────────────────────────────────

const RISK_LABELS: Record<string, string> = {
  conservative: "Conservateur",
  moderate: "Modéré",
  aggressive: "Agressif",
  very_aggressive: "Très Agressif",
};

// AI Insight Section - Future Predictions
const LEVEL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  beginner:     { label: "Débutant",      icon: GraduationCap, color: "text-emerald-400" },
  intermediate: { label: "Intermédiaire", icon: TrendingUp,    color: "text-primary"    },
  expert:       { label: "Expert",        icon: Zap,           color: "text-neon-purple"  },
};

function AIInsightSection({
  aiInsight,
  isLoading,
  symbol,
  tradingStyle = "day",
  riskLevel = "moderate",
  tradingLevel = "intermediate",
  onReload,
  onAskAI,
}: {
  aiInsight: string | null;
  isLoading: boolean;
  symbol: string;
  tradingStyle?: string;
  riskLevel?: string;
  tradingLevel?: string;
  onReload: () => void;
  onAskAI?: () => void;
}) {
  const { t, lang } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  const handleReload = async () => {
    setError(null);
    try {
      await onReload();
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.includes("not configured") || msg.includes("API_KEY") || msg.includes("GROQ")) {
        setError(lang === "en" ? "AI assistant is not configured. Contact the administrator." : "L'assistant IA n'est pas configuré. Contactez l'administrateur.");
      } else if (msg.includes("503") || err.status === 503) {
        setError(lang === "en" ? "AI assistant is unavailable. Check GROQ_API_KEY configuration." : "L'assistant IA n'est pas disponible. Vérifiez la configuration GROQ_API_KEY.");
      } else if (msg.includes("429") || err.status === 429) {
        setError(msg || (lang === "en" ? "AI service overloaded. Retry in a few seconds." : "Service IA surchargé. Réessayez dans quelques secondes."));
      } else if (msg.includes("timeout") || msg.includes("504")) {
        setError(lang === "en" ? "Analysis took too long. Please retry." : "L'analyse a pris trop de temps. Reessayez.");
      } else {
        setError(msg || (lang === "en" ? "Error generating analysis. Check that GROQ_API_KEY is configured." : "Erreur lors de la génération de l'analyse. Vérifiez que GROQ_API_KEY est configuré."));
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="glass-card p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 text-lg flex-wrap">
            <Brain className="w-5 h-5 text-neon-purple" />
            {t("analysis_ai_forecasts")}
            <span className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-xs rounded-full">Premium</span>
            {/* Active style + level badges */}
            <span className="px-2 py-0.5 bg-white/10 text-xs rounded-full text-muted-foreground font-normal">
              {getStyle(tradingStyle).emoji} {getStyle(tradingStyle).label[lang]}
              {" · "}{lang === "en"
                ? ({ conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive", very_aggressive: "Very Aggressive" }[riskLevel] ?? riskLevel)
                : (RISK_LABELS[riskLevel] ?? riskLevel)}
            </span>
            {(() => { const lv = LEVEL_LABELS[tradingLevel]; const LvIcon = lv?.icon; return lv ? (
              <span className={cn("px-2 py-0.5 bg-white/10 text-xs rounded-full font-normal flex items-center gap-1", lv.color)}>
                {LvIcon && <LvIcon className="w-3 h-3" />}
                {tradingLevel === "beginner" ? t("analysis_beginner") : tradingLevel === "expert" ? t("analysis_expert") : t("analysis_intermediate")}
              </span>
            ) : null; })()}
          </h3>
          <div className="flex items-center gap-2">
            {aiInsight && onAskAI && (
              <button
                onClick={onAskAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "linear-gradient(135deg, rgba(184,134,58,0.2) 0%, rgba(232,168,32,0.15) 100%)",
                  border: "1px solid rgba(184,134,58,0.35)",
                  color: "rgba(167,139,250,1)",
                }}
              >
                <Bot className="w-3.5 h-3.5" />
                {lang === "en" ? "Ask AI" : "Demander à l'IA"}
              </button>
            )}
            {aiInsight && (
              <button
                onClick={handleReload}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Régénérer l'analyse"
              >
                <Sparkles className={cn("w-4 h-4 text-neon-purple", isLoading && "animate-spin")} />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-neon-purple animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-neon-purple/30 border-t-purple-400 animate-spin" />
            </div>
            <span className="text-muted-foreground">L'IA analyse {symbol}...</span>
            <p className="text-xs text-muted-foreground">Cela peut prendre quelques secondes</p>
          </div>
        ) : aiInsight ? (
          <div className="space-y-4">
            <div className="space-y-0.5">
              {renderAIText(aiInsight)}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Cette analyse est generee par IA a titre informatif. Elle ne constitue pas un conseil financier.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-loss" />
            <p className="text-sm text-loss mb-3">{error}</p>
            <button
              onClick={handleReload}
              className="btn-primary px-4 py-2"
            >
              Reessayer
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neon-purple/10 flex items-center justify-center">
              <Brain className="w-10 h-10 text-neon-purple" />
            </div>
            <h4 className="font-semibold mb-2">
              {tradingStyle === "scalp" && "Suggestions de prise de position"}
              {tradingStyle === "day" && "Analyse de séance & Setup de trade"}
              {tradingStyle === "swing" && "Intention de marché & Analyse swing"}
              {tradingStyle === "long" && "Vision long terme & Projets de l'actif"}
              {!["scalp","day","swing","long"].includes(tradingStyle) && "Analyse prédictive par IA"}
            </h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
              {tradingStyle === "scalp" && (
                <>
                  Recevez un <strong className="text-foreground/80">signal direct</strong> avec zone d'entrée précise, stop loss et objectifs de profit adaptés au scalping. L'IA identifie la direction, le timing et les micro-niveaux clés pour agir dans les prochaines minutes.
                </>
              )}
              {tradingStyle === "day" && (
                <>
                  Obtenez une <strong className="text-foreground/80">analyse complète de la séance</strong> : contexte intraday, lecture des indicateurs, niveaux VWAP et pivot, puis un setup de trade concret avec entrée, stop et objectifs pour la journée.
                </>
              )}
              {tradingStyle === "swing" && (
                <>
                  Comprenez <strong className="text-foreground/80">l'intention réelle du marché</strong> sur les prochains jours : ce que font les acheteurs et vendeurs, la structure de tendance, la conviction des institutionnels et les scénarios probables à 2-10 jours.
                </>
              )}
              {tradingStyle === "long" && (
                <>
                  Découvrez <strong className="text-foreground/80">la trajectoire et les projets futurs</strong> de l'actif : vision stratégique, catalyseurs à 6-18 mois, analyse fondamentale approfondie et thèse d'investissement long terme.
                </>
              )}
              {!["scalp","day","swing","long"].includes(tradingStyle) && (
                <>
                  Obtenez une analyse approfondie avec des prévisions sur le court et moyen terme, les risques et opportunités de marché.
                </>
              )}
            </p>
            <button
              onClick={handleReload}
              disabled={isLoading}
              className="btn-primary px-6 py-3 flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Générer l'analyse IA
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Market Context & Economic Analysis
function MarketContextSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const { lang } = useLanguage();
  const getMarketPhase = () => {
    const score = analysis.score.total;
    const rsi = analysis.indicators.rsi.value;
    const trend = analysis.trend;

    if (score >= 75 && trend === "BULLISH") {
      return {
        phase: lang === "en" ? "Expansion" : "Expansion",
        icon: <TrendingUp className="w-5 h-5 text-profit" />,
        description: lang === "en" ? "Market in expansion phase with strong bullish momentum. Buyers dominate and confidence is high." : "Le marché est en phase d'expansion avec une forte dynamique haussière. Les acheteurs dominent et la confiance est élevée.",
        color: "text-profit",
        bgColor: "bg-profit/10 border-profit/20"
      };
    } else if (score >= 60 && rsi > 50) {
      return {
        phase: lang === "en" ? "Growth" : "Croissance",
        icon: <ArrowUpRight className="w-5 h-5 text-green-400" />,
        description: lang === "en" ? "Moderate growth phase. Market shows positive signs without excessive exuberance." : "Phase de croissance modérée. Le marché montre des signes positifs mais sans exubérance excessive.",
        color: "text-green-400",
        bgColor: "bg-green-400/10 border-green-400/20"
      };
    } else if (score >= 40) {
      return {
        phase: lang === "en" ? "Consolidation" : "Consolidation",
        icon: <Activity className="w-5 h-5 text-warning" />,
        description: lang === "en" ? "Market consolidating without clear direction. Accumulation or distribution phase possible." : "Le marché consolide sans direction claire. Phase d'accumulation ou de distribution possible.",
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20"
      };
    } else if (score >= 25) {
      return {
        phase: lang === "en" ? "Correction" : "Correction",
        icon: <ArrowDownRight className="w-5 h-5 text-orange-400" />,
        description: lang === "en" ? "Correction phase underway. Sellers taking control but without widespread panic." : "Phase de correction en cours. Les vendeurs prennent le contrôle mais sans panique généralisée.",
        color: "text-orange-400",
        bgColor: "bg-orange-400/10 border-orange-400/20"
      };
    } else {
      return {
        phase: lang === "en" ? "Contraction" : "Contraction",
        icon: <TrendingDown className="w-5 h-5 text-loss" />,
        description: lang === "en" ? "Market contracting with strong selling pressure. Maximum caution recommended." : "Marché en contraction avec forte pression vendeuse. Prudence maximale recommandée.",
        color: "text-loss",
        bgColor: "bg-loss/10 border-loss/20"
      };
    }
  };

  const getVolatilityContext = () => {
    const atr = analysis.indicators.atr;
    const price = analysis.price.current;
    const atrPercent = (atr / price) * 100;

    if (atrPercent > 5) {
      return { level: lang === "en" ? "Very high" : "Très élevée", color: "text-loss", description: lang === "en" ? "Very volatile market — high risk but significant opportunities" : "Marché très volatile - risque élevé mais opportunités importantes" };
    } else if (atrPercent > 3) {
      return { level: lang === "en" ? "High" : "Élevée", color: "text-warning", description: lang === "en" ? "Above-normal volatility — caution recommended" : "Volatilité supérieure à la normale - prudence recommandée" };
    } else if (atrPercent > 1.5) {
      return { level: lang === "en" ? "Moderate" : "Modérée", color: "text-primary", description: lang === "en" ? "Normal volatility for this asset type" : "Volatilité normale pour ce type d'actif" };
    } else {
      return { level: lang === "en" ? "Low" : "Faible", color: "text-profit", description: lang === "en" ? "Calm market — limited movements expected" : "Marché calme - mouvements limités attendus" };
    }
  };

  const getLiquidityContext = () => {
    const ratio = analysis.indicators.volume_ratio;
    if (ratio > 2) {
      return { level: lang === "en" ? "Excellent" : "Excellente", color: "text-profit", description: lang === "en" ? "Very high volume — strong liquidity and likely institutional interest" : "Volume très élevé - forte liquidité et intérêt institutionnel probable" };
    } else if (ratio > 1) {
      return { level: lang === "en" ? "Good" : "Bonne", color: "text-primary", description: lang === "en" ? "Above-average volume — good trading conditions" : "Volume supérieur à la moyenne - bonnes conditions de trading" };
    } else if (ratio > 0.5) {
      return { level: lang === "en" ? "Fair" : "Correcte", color: "text-warning", description: lang === "en" ? "Average volume — normal conditions" : "Volume dans la moyenne - conditions normales" };
    } else {
      return { level: lang === "en" ? "Limited" : "Limitée", color: "text-loss", description: lang === "en" ? "Low volume — potentially wide spreads, slippage possible" : "Faible volume - spreads potentiellement élevés, slippage possible" };
    }
  };

  const marketPhase = getMarketPhase();
  const volatility = getVolatilityContext();
  const liquidity = getLiquidityContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Globe className="w-5 h-5 text-primary" />
        {lang === "en" ? "Market & Economic Context" : "Contexte de Marché & Économique"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Market Phase */}
        <div className={cn("p-4 rounded-xl border", marketPhase.bgColor)}>
          <div className="flex items-center gap-2 mb-2">
            {marketPhase.icon}
            <span className={cn("font-semibold", marketPhase.color)}>Phase: {marketPhase.phase}</span>
          </div>
          <p className="text-xs text-muted-foreground">{marketPhase.description}</p>
        </div>

        {/* Volatility */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold">{lang === "en" ? "Volatility" : "Volatilité"}: <span className={volatility.color}>{volatility.level}</span></span>
          </div>
          <p className="text-xs text-muted-foreground">{volatility.description}</p>
          <p className="text-xs mt-1 text-muted-foreground">ATR: {formatCurrency(analysis.indicators.atr)}</p>
        </div>

        {/* Liquidity */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-semibold">{lang === "en" ? "Liquidity" : "Liquidité"}: <span className={liquidity.color}>{liquidity.level}</span></span>
          </div>
          <p className="text-xs text-muted-foreground">{liquidity.description}</p>
          <p className="text-xs mt-1 text-muted-foreground">Ratio: {analysis.indicators.volume_ratio.toFixed(2)}x {lang === "en" ? "avg" : "moyenne"}</p>
        </div>
      </div>

      {/* Economic Factors */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          {lang === "en" ? "Economic Factors to Consider" : "Facteurs Économiques à Considérer"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{lang === "en" ? "Position in 52-week range" : "Position dans le range 52 semaines"}</p>
            {analysis.fundamentals?.["52w_high"] && analysis.fundamentals?.["52w_low"] ? (
              <div>
                <div className="h-2 bg-white/10 rounded-full mb-2 relative">
                  <div
                    className="absolute h-full bg-gradient-to-r from-loss via-warning to-profit rounded-full"
                    style={{ width: '100%' }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-primary rounded-full -top-0.5 shadow-lg shadow-primary/50"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((analysis.price.current - analysis.fundamentals["52w_low"]) / (analysis.fundamentals["52w_high"] - analysis.fundamentals["52w_low"])) * 100))}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-loss">{formatCurrency(analysis.fundamentals["52w_low"])}</span>
                  <span className="text-profit">{formatCurrency(analysis.fundamentals["52w_high"])}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold">N/A</p>
            )}
          </div>

          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{lang === "en" ? "Distance from moving averages" : "Distance aux moyennes mobiles"}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>EMA20:</span>
                <span className={analysis.price.current > analysis.indicators.ema.ema20 ? "text-profit" : "text-loss"}>
                  {((analysis.price.current - analysis.indicators.ema.ema20) / analysis.indicators.ema.ema20 * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>EMA50:</span>
                <span className={analysis.price.current > analysis.indicators.ema.ema50 ? "text-profit" : "text-loss"}>
                  {((analysis.price.current - analysis.indicators.ema.ema50) / analysis.indicators.ema.ema50 * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Risk Assessment Section
function RiskAssessmentSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const { lang } = useLanguage();
  const calculateRiskScore = () => {
    let score = 50; // Base score

    // RSI risk
    if (analysis.indicators.rsi.value > 80) score += 20;
    else if (analysis.indicators.rsi.value > 70) score += 10;
    else if (analysis.indicators.rsi.value < 20) score += 15;
    else if (analysis.indicators.rsi.value < 30) score += 5;

    // Volatility risk (ATR based)
    const atrPercent = (analysis.indicators.atr / analysis.price.current) * 100;
    if (atrPercent > 5) score += 20;
    else if (atrPercent > 3) score += 10;

    // Volume risk
    if (analysis.indicators.volume_ratio < 0.5) score += 10;

    // Beta risk
    if (analysis.fundamentals?.beta) {
      if (analysis.fundamentals.beta > 2) score += 15;
      else if (analysis.fundamentals.beta > 1.5) score += 10;
      else if (analysis.fundamentals.beta < 0.5) score -= 10;
    }

    // Debt risk
    if (analysis.fundamentals?.debt_to_equity) {
      if (analysis.fundamentals.debt_to_equity > 200) score += 15;
      else if (analysis.fundamentals.debt_to_equity > 100) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  };

  const riskScore = calculateRiskScore();

  const getRiskLevel = (score: number) => {
    if (score >= 75) return { level: lang === "en" ? "Very high" : "Très élevé", color: "text-loss", bg: "bg-loss" };
    if (score >= 60) return { level: lang === "en" ? "High" : "Elevé", color: "text-orange-400", bg: "bg-orange-400" };
    if (score >= 40) return { level: lang === "en" ? "Moderate" : "Modéré", color: "text-warning", bg: "bg-warning" };
    if (score >= 25) return { level: lang === "en" ? "Low" : "Faible", color: "text-green-400", bg: "bg-green-400" };
    return { level: lang === "en" ? "Very low" : "Très faible", color: "text-profit", bg: "bg-profit" };
  };

  const risk = getRiskLevel(riskScore);

  const riskFactors = [
    {
      name: lang === "en" ? "Volatility" : "Volatilité",
      value: (analysis.indicators.atr / analysis.price.current) * 100,
      threshold: 3,
      isHigh: (analysis.indicators.atr / analysis.price.current) * 100 > 3,
      description: lang === "en" ? "Average amplitude of price movements" : "Amplitude moyenne des mouvements de prix"
    },
    {
      name: lang === "en" ? "Liquidity" : "Liquidité",
      value: analysis.indicators.volume_ratio,
      threshold: 0.7,
      isHigh: analysis.indicators.volume_ratio < 0.7,
      description: lang === "en" ? "Ability to enter/exit without price impact" : "Capacité à entrer/sortir sans impact sur le prix"
    },
    {
      name: lang === "en" ? "Overbought/Oversold" : "Surachat/Survente",
      value: analysis.indicators.rsi.value,
      threshold: 70,
      isHigh: analysis.indicators.rsi.value > 70 || analysis.indicators.rsi.value < 30,
      description: lang === "en" ? "Extreme RSI level" : "Niveau extrême du RSI"
    },
    ...(analysis.fundamentals?.beta ? [{
      name: "Beta",
      value: analysis.fundamentals.beta,
      threshold: 1.5,
      isHigh: analysis.fundamentals.beta > 1.5,
      description: lang === "en" ? "Sensitivity to market movements" : "Sensibilité aux mouvements du marché"
    }] : []),
    ...(analysis.fundamentals?.debt_to_equity ? [{
      name: lang === "en" ? "Debt" : "Endettement",
      value: analysis.fundamentals.debt_to_equity,
      threshold: 100,
      isHigh: analysis.fundamentals.debt_to_equity > 100,
      description: lang === "en" ? "Debt-to-equity ratio" : "Ratio dette/capitaux propres"
    }] : [])
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <Shield className="w-5 h-5 text-primary" />
        {lang === "en" ? "Risk Assessment" : "Évaluation des Risques"}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-white/10"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(riskScore / 100) * 352} 352`}
                className={risk.bg}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", risk.color)}>{riskScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className={cn("font-semibold mt-2", risk.color)}>{lang === "en" ? "Risk" : "Risque"} {risk.level}</p>
        </div>

        {/* Risk Factors */}
        <div className="lg:col-span-2 space-y-3">
          {riskFactors.map((factor, idx) => (
            <div key={idx} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{factor.name}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  factor.isHigh ? "bg-loss/20 text-loss" : "bg-profit/20 text-profit"
                )}>
                  {factor.isHigh ? "Attention" : "OK"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{factor.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Management Suggestions */}
      <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Recommandations de Gestion du Risque
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
            <span>Taille de position recommandée : <strong className="text-foreground">{riskScore > 60 ? "1-2%" : riskScore > 40 ? "2-3%" : "3-5%"}</strong> du capital</span>
          </li>
          <li className="flex items-start gap-2">
            <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
            <span>Stop loss suggere: <strong className="text-foreground">{formatCurrency(analysis.risk.suggested_sl)}</strong> ({(((analysis.price.current - analysis.risk.suggested_sl) / analysis.price.current) * 100).toFixed(1)}% du prix)</span>
          </li>
          <li className="flex items-start gap-2">
            <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
            <span>Diversification : <strong className="text-foreground">{analysis.fundamentals?.beta && analysis.fundamentals.beta > 1.2 ? "Fortement recommandée" : "Standard"}</strong></span>
          </li>
          {analysis.risk.sl_basis && analysis.risk.sl_basis !== "atr" && (
            <li className="flex items-start gap-2">
              <CircleDot className="w-3 h-3 mt-1.5 text-primary flex-shrink-0" />
              <span>Stop ancré sur <strong className="text-foreground">{analysis.risk.sl_basis === "support" ? "le support" : "la résistance"}</strong> — placé là où la thèse est invalidée, pas à une distance arbitraire</span>
            </li>
          )}
          {(analysis.risk.notes || []).map((note, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-1.5 text-warning flex-shrink-0" />
              <span className="text-warning/90">{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// Enhanced Fundamental Analysis
function FundamentalAnalysisEnhanced({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const { settings: fundSettings } = useSettings();
  const f = analysis.fundamentals;
  if (!f) return null;

  const formatLargeNumber = (num: number | undefined) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  const formatPct = (num: number | undefined) => {
    if (num === undefined || num === null) return "N/A";
    return `${(num * 100).toFixed(2)}%`;
  };

  // Valuation Analysis
  const getValuationAnalysis = () => {
    if (!f.pe_ratio) return null;

    let assessment = "";
    let color = "text-warning";

    if (f.pe_ratio < 15) {
      assessment = "L'action semble sous-évaluée avec un P/E inférieur à la moyenne historique du marché (15-20). Cela peut indiquer une opportunité d'achat ou des inquiétudes du marché sur la croissance future.";
      color = "text-profit";
    } else if (f.pe_ratio < 25) {
      assessment = "Le P/E est dans une fourchette raisonnable. L'action est evaluee a sa juste valeur par rapport a ses benefices actuels.";
      color = "text-primary";
    } else if (f.pe_ratio < 40) {
      assessment = "Le P/E élevé suggère que les investisseurs anticipent une forte croissance future. Attention au risque de correction si les attentes ne sont pas respectées.";
      color = "text-warning";
    } else {
      assessment = "Le P/E très élevé indique une valorisation spéculative. Le marché price une croissance exceptionnelle. Risque de volatilité important.";
      color = "text-loss";
    }

    return { assessment, color };
  };

  // Growth Analysis
  const getGrowthAnalysis = () => {
    const growth = f.revenue_growth;
    if (!growth) return null;

    if (growth > 0.3) {
      return { text: "Croissance exceptionnelle (>30%)", color: "text-profit" };
    } else if (growth > 0.15) {
      return { text: "Forte croissance (15-30%)", color: "text-green-400" };
    } else if (growth > 0.05) {
      return { text: "Croissance modérée (5-15%)", color: "text-primary" };
    } else if (growth > 0) {
      return { text: "Croissance faible (<5%)", color: "text-warning" };
    } else {
      return { text: "Décroissance", color: "text-loss" };
    }
  };

  // Profitability Analysis
  const getProfitabilityAnalysis = () => {
    const margin = f.profit_margin;
    if (!margin) return null;

    if (margin > 0.2) {
      return { text: "Excellente rentabilite (>20%)", color: "text-profit", score: 5 };
    } else if (margin > 0.1) {
      return { text: "Bonne rentabilite (10-20%)", color: "text-green-400", score: 4 };
    } else if (margin > 0.05) {
      return { text: "Rentabilite correcte (5-10%)", color: "text-primary", score: 3 };
    } else if (margin > 0) {
      return { text: "Rentabilite faible (<5%)", color: "text-warning", score: 2 };
    } else {
      return { text: "Non rentable", color: "text-loss", score: 1 };
    }
  };

  const valuation = getValuationAnalysis();
  const growth = getGrowthAnalysis();
  const profitability = getProfitabilityAnalysis();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <BarChart3 className="w-5 h-5 text-primary" />
        Analyse Fondamentale Approfondie
        {fundSettings.tradingStyle === "long" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-normal">
            Prioritaire · Long Terme
          </span>
        )}
      </h3>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Capitalisation</p>
          <p className="font-bold text-lg">{formatLargeNumber(f.market_cap)}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">P/E Ratio</p>
          <p className={cn("font-bold text-lg", f.pe_ratio && f.pe_ratio > 30 ? "text-warning" : f.pe_ratio && f.pe_ratio < 15 ? "text-profit" : "")}>
            {f.pe_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Forward P/E</p>
          <p className="font-bold text-lg">{f.forward_pe?.toFixed(2) || "N/A"}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">PEG Ratio</p>
          <p className={cn("font-bold text-lg", f.peg_ratio && f.peg_ratio < 1 ? "text-profit" : f.peg_ratio && f.peg_ratio > 2 ? "text-loss" : "")}>
            {f.peg_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Prix/Book</p>
          <p className="font-bold text-lg">{f.price_to_book?.toFixed(2) || "N/A"}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Dividende</p>
          <p className="font-bold text-lg">{formatPct(f.dividend_yield)}</p>
        </div>
      </div>

      {/* Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Valuation */}
        <div className="p-4 bg-white/5 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Valorisation
          </h4>
          {valuation ? (
            <p className="text-sm text-muted-foreground">{valuation.assessment}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Donnees insuffisantes</p>
          )}
        </div>

        {/* Growth */}
        <div className="p-4 bg-white/5 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Croissance
          </h4>
          {growth ? (
            <>
              <p className={cn("font-semibold mb-1", growth.color)}>{growth.text}</p>
              <p className="text-sm text-muted-foreground">CA: {formatPct(f.revenue_growth)}</p>
              {f.earnings_growth && <p className="text-sm text-muted-foreground">Benefices: {formatPct(f.earnings_growth)}</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Donnees insuffisantes</p>
          )}
        </div>

        {/* Profitability */}
        <div className="p-4 bg-white/5 rounded-xl">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Rentabilite
          </h4>
          {profitability ? (
            <>
              <p className={cn("font-semibold mb-1", profitability.color)}>{profitability.text}</p>
              <p className="text-sm text-muted-foreground">ROE: {formatPct(f.roe)}</p>
              <p className="text-sm text-muted-foreground">ROA: {formatPct(f.roa)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Donnees insuffisantes</p>
          )}
        </div>
      </div>

      {/* Health Indicators */}
      <div className="p-4 bg-white/5 rounded-xl">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Sante Financiere
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Dette/Equity</p>
            <p className={cn("font-bold", f.debt_to_equity && f.debt_to_equity > 100 ? "text-loss" : "text-profit")}>
              {f.debt_to_equity?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.debt_to_equity && f.debt_to_equity > 100 ? "Endettement élevé" : f.debt_to_equity ? "Endettement sain" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Ratio</p>
            <p className={cn("font-bold", f.current_ratio && f.current_ratio > 1.5 ? "text-profit" : f.current_ratio && f.current_ratio < 1 ? "text-loss" : "")}>
              {f.current_ratio?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.current_ratio && f.current_ratio > 1.5 ? "Bonne liquidité" : f.current_ratio && f.current_ratio < 1 ? "Liquidité tendue" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Beta</p>
            <p className={cn("font-bold", f.beta && f.beta > 1.5 ? "text-warning" : "")}>
              {f.beta?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.beta && f.beta > 1.5 ? "Volatile" : f.beta && f.beta < 0.8 ? "Defensif" : f.beta ? "Normal" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Short Ratio</p>
            <p className={cn("font-bold", f.short_ratio && f.short_ratio > 5 ? "text-warning" : "")}>
              {f.short_ratio?.toFixed(2) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {f.short_ratio && f.short_ratio > 5 ? "Short squeeze possible" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Analyst Consensus */}
      {f.recommendation && (
        <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Consensus analystes ({f.num_analysts || 0} analystes)</p>
              <p className={cn(
                "font-bold text-xl mt-1",
                f.recommendation.includes("buy") ? "text-profit" :
                f.recommendation.includes("sell") ? "text-loss" : "text-warning"
              )}>
                {f.recommendation.toUpperCase()}
              </p>
            </div>
            {f.target_price && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Objectif moyen</p>
                <p className="font-bold text-xl">{formatCurrency(f.target_price)}</p>
                <p className={cn(
                  "text-sm",
                  f.target_price > analysis.price.current ? "text-profit" : "text-loss"
                )}>
                  {f.target_price > analysis.price.current ? "+" : ""}{((f.target_price - analysis.price.current) / analysis.price.current * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Investment Thesis Section
function InvestmentThesisSection({ analysis, formatCurrency }: { analysis: Analysis; formatCurrency: (value: number) => string }) {
  const getBullCase = () => {
    const points = [];

    if (analysis.score.total >= 60) {
      points.push("Les indicateurs techniques convergent vers un signal positif");
    }
    if (analysis.indicators.rsi.value < 40) {
      points.push("RSI en zone de survente - potentiel de rebond");
    }
    if (analysis.trend === "BULLISH") {
      points.push("Tendance haussière établie avec structure de prix favorable");
    }
    if (analysis.indicators.volume_ratio > 1.2) {
      points.push("Volume supérieur à la moyenne confirmant l'intérêt acheteur");
    }
    if (analysis.fundamentals?.revenue_growth && analysis.fundamentals.revenue_growth > 0.1) {
      points.push("Croissance du chiffre d'affaires supérieure à 10%");
    }
    if (analysis.fundamentals?.profit_margin && analysis.fundamentals.profit_margin > 0.15) {
      points.push("Marges bénéficiaires solides (>15%)");
    }
    if (analysis.price.current < analysis.levels.resistance) {
      points.push(`Potentiel haussier vers la resistance a ${formatCurrency(analysis.levels.resistance)}`);
    }

    return points.length > 0 ? points : ["Signaux positifs limites dans l'environnement actuel"];
  };

  const getBearCase = () => {
    const points = [];

    if (analysis.score.total < 40) {
      points.push("Score technique faible indiquant une pression vendeuse");
    }
    if (analysis.indicators.rsi.value > 70) {
      points.push("RSI en zone de surachat - risque de correction");
    }
    if (analysis.trend === "BEARISH") {
      points.push("Tendance baissière dominante");
    }
    if (analysis.fundamentals?.debt_to_equity && analysis.fundamentals.debt_to_equity > 100) {
      points.push("Niveau d'endettement élevé pesant sur le bilan");
    }
    if (analysis.fundamentals?.pe_ratio && analysis.fundamentals.pe_ratio > 40) {
      points.push("Valorisation élevée, vulnérable aux déceptions");
    }
    if (analysis.indicators.volume_ratio < 0.7) {
      points.push("Faible volume pouvant amplifier les mouvements baissiers");
    }

    return points.length > 0 ? points : ["Risques identifies limites"];
  };

  const getCatalysts = () => {
    const catalysts = [];

    if (analysis.news && analysis.news.length > 0) {
      catalysts.push("Publications de résultats à venir");
    }
    catalysts.push("Évolution des taux d'intérêt");
    catalysts.push("Sentiment global du marche");
    if (analysis.company?.sector === "Technology") {
      catalysts.push("Innovations technologiques et nouveaux produits");
    }

    return catalysts;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
        <BookOpen className="w-5 h-5 text-primary" />
        These d'Investissement
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bull Case */}
        <div className="p-4 bg-profit/10 rounded-xl border border-profit/20">
          <h4 className="font-semibold text-profit mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Scenario Haussier
          </h4>
          <ul className="space-y-2">
            {getBullCase().map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-profit mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bear Case */}
        <div className="p-4 bg-loss/10 rounded-xl border border-loss/20">
          <h4 className="font-semibold text-loss mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Scenario Baissier
          </h4>
          <ul className="space-y-2">
            {getBearCase().map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-loss mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Catalysts */}
      <div className="mt-4 p-4 bg-white/5 rounded-xl">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Catalyseurs a Surveiller
        </h4>
        <div className="flex flex-wrap gap-2">
          {getCatalysts().map((catalyst, idx) => (
            <span key={idx} className="px-3 py-1 bg-orange-400/20 text-orange-400 rounded-full text-sm">
              {catalyst}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Sector Comparison Section
function SectorComparisonSection({ analysis }: { analysis: Analysis }) {
  const getSectorContext = () => {
    const sector = analysis.company?.sector || "General";
    const industry = analysis.company?.industry || "";

    const sectorInfo: Record<string, { description: string; typical_pe: string; growth_expectation: string }> = {
      "Technology": {
        description: "Le secteur technologique est caractérisé par une forte croissance mais une volatilité élevée. Les valorisations sont souvent élevées en premier.",
        typical_pe: "25-40",
        growth_expectation: "15-25%"
      },
      "Financial Services": {
        description: "Le secteur financier est sensible aux taux d'interet et aux cycles economiques. Dividendes generalement stables.",
        typical_pe: "10-15",
        growth_expectation: "5-10%"
      },
      "Healthcare": {
        description: "Secteur défensif avec une demande stable. Les biotechs offrent un potentiel de croissance élevé mais risqué.",
        typical_pe: "15-25",
        growth_expectation: "8-15%"
      },
      "Consumer Cyclical": {
        description: "Sensible aux cycles economiques. Performance correlee a la confiance des consommateurs.",
        typical_pe: "15-25",
        growth_expectation: "5-15%"
      },
      "Energy": {
        description: "Secteur cyclique fortement influence par les prix du petrole et la transition energetique.",
        typical_pe: "8-15",
        growth_expectation: "Variable"
      },
      "General": {
        description: "Analyse le contexte specifique de l'actif et son positionnement competitif.",
        typical_pe: "15-20",
        growth_expectation: "5-10%"
      }
    };

    return sectorInfo[sector] || sectorInfo["General"];
  };

  const sectorContext = getSectorContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85 }}
      className="glass-card p-6"
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
        <Briefcase className="w-5 h-5 text-primary" />
        Contexte Sectoriel
      </h3>

      <div className="p-4 bg-white/5 rounded-xl mb-4">
        <div className="flex items-center gap-3 mb-2">
          {analysis.company?.sector && (
            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
              {analysis.company.sector}
            </span>
          )}
          {analysis.company?.industry && (
            <span className="px-3 py-1 bg-white/10 rounded-full text-sm">
              {analysis.company.industry}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{sectorContext.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">P/E typique du secteur</p>
          <p className="font-bold">{sectorContext.typical_pe}</p>
          {analysis.fundamentals?.pe_ratio && (
            <p className={cn(
              "text-xs mt-1",
              analysis.fundamentals.pe_ratio > 30 ? "text-warning" : "text-profit"
            )}>
              Actuel: {analysis.fundamentals.pe_ratio.toFixed(1)}
            </p>
          )}
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Croissance attendue</p>
          <p className="font-bold">{sectorContext.growth_expectation}</p>
          {analysis.fundamentals?.revenue_growth && (
            <p className={cn(
              "text-xs mt-1",
              analysis.fundamentals.revenue_growth > 0.1 ? "text-profit" : "text-warning"
            )}>
              Actuel: {(analysis.fundamentals.revenue_growth * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Trading Strategies Section
/**
 * Setups proposed for the horizon the user actually trades.
 *
 * This section used to hand every user the same list — "Swing Trading Long,
 * 1-2 semaines" to a scalper, with invented hit rates ("65-70%") attached to
 * each. The probabilities are gone: nothing in the app measures them, so
 * printing them was presenting a guess as a statistic. Each setup now states
 * the condition that produced it, which is checkable.
 */
interface StyleSetup {
  name: string;
  trigger: string;
  entry: string;
  stop: number | null;
  target: number | null;
  tone: "long" | "short" | "wait";
}

function buildStyleSetups(
  analysis: Analysis,
  style: TradingStyleProfile,
  lang: "fr" | "en",
  fmt: (v: number) => string
): StyleSetup[] {
  const px = analysis.price.current;
  const { rsi, macd, ema, bollinger, atr, volume_ratio } = analysis.indicators;
  const { support, resistance } = analysis.levels;
  const score = analysis.score.total;
  const sl = atr * style.atr.sl;
  const tp = atr * style.atr.tp;
  const near = (level: number, mult: number) => Math.abs(px - level) <= atr * mult;
  const out: StyleSetup[] = [];
  const fr = lang === "fr";

  if (style.id === "scalp") {
    if (rsi.value < 40 && near(support, 1.5)) {
      out.push({
        name: fr ? "Rebond sur support intraday" : "Intraday support bounce",
        trigger: fr
          ? `RSI à ${rsi.value.toFixed(0)} et prix à moins de 1,5 ATR du support ${fmt(support)}.`
          : `RSI at ${rsi.value.toFixed(0)} and price within 1.5 ATR of support ${fmt(support)}.`,
        entry: fr ? `Au contact de ${fmt(support)}, sur mèche de rejet` : `On touch of ${fmt(support)}, on a rejection wick`,
        stop: support - sl, target: px + tp, tone: "long",
      });
    }
    if (volume_ratio > 1.2 && near(resistance, 1.5)) {
      out.push({
        name: fr ? "Cassure sur volume" : "Volume breakout",
        trigger: fr
          ? `Volume à ${volume_ratio.toFixed(1)}× la moyenne, prix collé à la résistance ${fmt(resistance)}.`
          : `Volume at ${volume_ratio.toFixed(1)}× average, price pinned to resistance ${fmt(resistance)}.`,
        entry: fr ? `À la cassure de ${fmt(resistance)} — pas avant` : `On the break of ${fmt(resistance)} — not before`,
        stop: resistance - sl, target: resistance + tp, tone: "long",
      });
    }
    if (rsi.value > 75 || rsi.value < 25) {
      const hot = rsi.value > 75;
      out.push({
        name: fr ? "Excès de momentum" : "Momentum extreme",
        trigger: fr
          ? `RSI à ${rsi.value.toFixed(0)}${volume_ratio < 1 ? `, avec un volume qui retombe (${volume_ratio.toFixed(1)}× la moyenne)` : ""}. Un extrême pareil se purge vite en intraday.`
          : `RSI at ${rsi.value.toFixed(0)}${volume_ratio < 1 ? `, on fading volume (${volume_ratio.toFixed(1)}× average)` : ""}. That kind of extreme flushes fast intraday.`,
        entry: fr
          ? "Sur premier retournement confirmé — jamais en anticipation"
          : "On the first confirmed turn — never in anticipation",
        stop: hot ? px + sl : px - sl,
        target: hot ? px - tp : px + tp,
        tone: hot ? "short" : "long",
      });
    }
    if (px > bollinger.upper || px < bollinger.lower) {
      const low = px < bollinger.lower;
      out.push({
        name: fr ? "Retour à la moyenne" : "Mean reversion",
        trigger: fr
          ? `Prix ${low ? "sous" : "au-dessus de"} la bande de Bollinger ${low ? "basse" : "haute"} — écart rarement tenu en intraday.`
          : `Price ${low ? "below the lower" : "above the upper"} Bollinger band — rarely sustained intraday.`,
        entry: fr ? "Dès le retour dans les bandes" : "As soon as price re-enters the bands",
        stop: low ? px - sl : px + sl, target: bollinger.middle, tone: low ? "long" : "short",
      });
    }
  }

  if (style.id === "day") {
    if (score >= 58 && ema.ema20 > ema.ema50) {
      out.push({
        name: fr ? "Continuation de tendance" : "Trend continuation",
        trigger: fr
          ? `Score ${score}/100 et EMA20 au-dessus de l'EMA50 : les acheteurs mènent la séance.`
          : `Score ${score}/100 and EMA20 above EMA50: buyers lead the session.`,
        entry: fr ? `Sur repli vers l'EMA20 (${fmt(ema.ema20)})` : `On a pullback to EMA20 (${fmt(ema.ema20)})`,
        stop: ema.ema20 - sl, target: px + tp, tone: "long",
      });
    }
    if (volume_ratio > 1 && px > ema.ema50) {
      out.push({
        name: fr ? "Cassure de range" : "Range breakout",
        trigger: fr
          ? `Prix au-dessus de l'EMA50 avec un volume à ${volume_ratio.toFixed(1)}× la moyenne.`
          : `Price above EMA50 with volume at ${volume_ratio.toFixed(1)}× average.`,
        entry: fr ? `À la cassure de ${fmt(resistance)}, clôture avant la fin de séance` : `On the break of ${fmt(resistance)}, close before the bell`,
        stop: resistance - sl, target: resistance + tp, tone: "long",
      });
    }
    if (rsi.value > 70 || rsi.value < 30) {
      const over = rsi.value > 70;
      out.push({
        name: fr ? (over ? "Fade de l'excès haussier" : "Fade de l'excès baissier") : (over ? "Fade the upside excess" : "Fade the downside excess"),
        trigger: fr
          ? `RSI à ${rsi.value.toFixed(0)} — extrême rarement tenu jusqu'à la clôture.`
          : `RSI at ${rsi.value.toFixed(0)} — an extreme rarely held into the close.`,
        entry: fr ? "Sur premier signe d'essoufflement, jamais à contre-courant direct" : "On the first sign of exhaustion, never straight into the move",
        stop: over ? px + sl : px - sl, target: over ? px - tp : px + tp, tone: over ? "short" : "long",
      });
    }
  }

  if (style.id === "swing") {
    if (score >= 60 && analysis.trend === "BULLISH") {
      out.push({
        name: fr ? "Swing long sur repli" : "Swing long on pullback",
        trigger: fr
          ? `Score ${score}/100 et tendance haussière confirmée en daily.`
          : `Score ${score}/100 with a confirmed bullish daily trend.`,
        entry: fr ? `Sur repli vers l'EMA20 (${fmt(ema.ema20)})` : `On a pullback to EMA20 (${fmt(ema.ema20)})`,
        stop: ema.ema20 - sl, target: px + tp, tone: "long",
      });
    }
    if (px > ema.ema50 && volume_ratio > 1 && macd.histogram > 0) {
      out.push({
        name: fr ? "Cassure confirmée" : "Confirmed breakout",
        trigger: fr
          ? "Prix au-dessus de l'EMA50, histogramme MACD positif, volume au-dessus de la moyenne."
          : "Price above EMA50, positive MACD histogram, above-average volume.",
        entry: fr ? `À la clôture au-dessus de ${fmt(resistance)}` : `On a close above ${fmt(resistance)}`,
        stop: resistance - sl, target: resistance + tp, tone: "long",
      });
    }
    if (rsi.value < 35) {
      out.push({
        name: fr ? "Rebond technique" : "Technical bounce",
        trigger: fr
          ? `RSI à ${rsi.value.toFixed(0)} en zone de survente. Attendez la confirmation : un actif peut y rester des jours.`
          : `RSI at ${rsi.value.toFixed(0)}, oversold. Wait for confirmation — an asset can stay there for days.`,
        entry: fr ? "Sur première clôture haussière, pas sur le creux" : "On the first bullish close, not on the low",
        stop: support - sl, target: bollinger.middle, tone: "long",
      });
    }
    if (rsi.value > 65) {
      out.push({
        name: fr ? "Prise de profits" : "Take profits",
        trigger: fr
          ? `RSI à ${rsi.value.toFixed(0)} : le mouvement est mûr, le rapport gain/risque se dégrade.`
          : `RSI at ${rsi.value.toFixed(0)}: the move is mature, reward-to-risk is deteriorating.`,
        entry: fr ? `Allègement progressif vers ${fmt(resistance)}` : `Scale out into ${fmt(resistance)}`,
        stop: null, target: resistance, tone: "short",
      });
    }
  }

  // Every long-horizon setup hangs off the EMA200. Without enough history
  // there is no long-term trend to read, and saying so beats guessing.
  const ema200 = ema.ema200;
  if (style.id === "long" && ema200 == null) {
    out.push({
      name: fr ? "Historique insuffisant" : "Not enough history",
      trigger: fr
        ? "L'EMA200 n'est pas calculable sur cet actif : pas assez d'historique pour juger une tendance de fond."
        : "The EMA200 can't be computed for this asset: not enough history to judge an underlying trend.",
      entry: fr ? "Élargissez la période, ou jugez sur un horizon plus court" : "Widen the period, or judge on a shorter horizon",
      stop: null, target: null, tone: "wait",
    });
  }
  if (style.id === "long" && ema200 != null) {
    if (px > ema200) {
      out.push({
        name: fr ? "Accumulation progressive (DCA)" : "Progressive accumulation (DCA)",
        trigger: fr
          ? `Prix au-dessus de l'EMA200 (${fmt(ema200)}) : la tendance de fond est intacte.`
          : `Price above the EMA200 (${fmt(ema200)}): the underlying trend is intact.`,
        entry: fr ? "Achats fractionnés à intervalle fixe, sans chercher le point bas" : "Fixed-interval buys, no attempt to time the low",
        stop: null, target: null, tone: "long",
      });
    }
    if (px < ema200 && score >= 50) {
      out.push({
        name: fr ? "Renfort sur repli" : "Add on weakness",
        trigger: fr
          ? `Prix sous l'EMA200 mais score encore à ${score}/100 : repli dans une structure saine.`
          : `Price below the EMA200 but score still ${score}/100: weakness inside a sound structure.`,
        entry: fr ? `Par paliers entre ${fmt(support)} et ${fmt(px)}` : `In tranches between ${fmt(support)} and ${fmt(px)}`,
        stop: support - sl, target: ema200, tone: "long",
      });
    }
    if (px < ema200 && score < 50) {
      out.push({
        name: fr ? "Rester à l'écart" : "Stay out",
        trigger: fr
          ? `Prix sous l'EMA200 et score à ${score}/100 : la tendance de fond est cassée. Rien à accumuler ici.`
          : `Price below the EMA200 and score at ${score}/100: the underlying trend is broken. Nothing to accumulate.`,
        entry: fr ? "Attendre une reprise durable au-dessus de l'EMA200" : "Wait for a durable reclaim of the EMA200",
        stop: null, target: null, tone: "wait",
      });
    }
  }

  if (out.length === 0) {
    out.push({
      name: fr ? "Aucun setup sur cet horizon" : "No setup on this horizon",
      trigger: fr
        ? `Les conditions actuelles ne produisent rien d'exploitable en ${style.label.fr.toLowerCase()} (${style.horizon.fr}). Un autre horizon donnerait peut-être un signal.`
        : `Current conditions produce nothing tradable on a ${style.label.en.toLowerCase()} horizon (${style.horizon.en}). Another horizon might show a signal.`,
      entry: fr ? "Ne rien faire est une position" : "Doing nothing is a position",
      stop: null, target: null, tone: "wait",
    });
  }
  return out;
}

function TradingStrategiesSection({
  analysis, formatCurrency, style,
}: { analysis: Analysis; formatCurrency: (value: number) => string; style: TradingStyleProfile }) {
  const { lang } = useLanguage();
  const setups = buildStyleSetups(analysis, style, lang, formatCurrency);
  const atr = analysis.indicators.atr;

  const toneClass = {
    long:  "border-profit/25 bg-profit/[0.06]",
    short: "border-loss/25 bg-loss/[0.06]",
    wait:  "border-warning/25 bg-warning/[0.06]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-card p-6"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Target className="w-5 h-5 text-primary" />
          {lang === "en" ? "Setups for your horizon" : "Setups pour votre horizon"}
        </h3>
        <Link
          href="/settings?tab=trading"
          title={style.pitch[lang]}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:brightness-125",
            style.chip
          )}
        >
          <span>{style.emoji}</span>
          <span>{style.label[lang]}</span>
          <span className="font-mono text-[10px] opacity-60">{style.horizon[lang]}</span>
        </Link>
      </div>

      {/* A direction is not a trade. When the engine refuses, it says why. */}
      {analysis.tradeability && !analysis.tradeability.tradable && (
        <div className="mb-5 border border-loss/30 bg-loss/[0.08] p-3">
          <p className="mb-1.5 flex items-center gap-2 text-sm font-bold text-loss">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {lang === "en" ? "NO TRADE — conditions not met" : "PAS DE TRADE — conditions non réunies"}
          </p>
          <ul className="space-y-0.5">
            {analysis.tradeability.blockers.map((b) => (
              <li key={b} className="text-xs leading-relaxed text-foreground/80">· {b}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {lang === "en"
              ? "The direction below may still be right. Acting on it here is not worth the risk."
              : "La direction ci-dessous peut rester juste. Elle ne justifie simplement pas le risque dans ces conditions."}
          </p>
        </div>
      )}
      {analysis.tradeability?.tradable && analysis.tradeability.warnings.length > 0 && (
        <div className="mb-5 border-l-2 border-warning/50 pl-3">
          {analysis.tradeability.warnings.map((w) => (
            <p key={w} className="text-xs leading-relaxed text-muted-foreground">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* The arithmetic behind every stop and target below, stated once */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 border-primary/40 pl-3 font-mono text-[11px] text-muted-foreground">
        <span>ATR · {formatCurrency(atr)}</span>
        <span>
          {lang === "en" ? "stop" : "stop"} · {style.atr.sl}× ATR = {formatCurrency(atr * style.atr.sl)}
        </span>
        <span>
          {lang === "en" ? "target" : "objectif"} · {style.atr.tp}× ATR = {formatCurrency(atr * style.atr.tp)}
        </span>
        <span className="text-primary">R/R · 1:{(style.atr.tp / style.atr.sl).toFixed(1)}</span>
      </div>

      <div className="space-y-3">
        {setups.map((s, idx) => {
          const rr =
            s.stop != null && s.target != null
              ? Math.abs(s.target - analysis.price.current) / Math.max(1e-9, Math.abs(analysis.price.current - s.stop))
              : null;
          return (
            <div key={idx} className={cn("border p-4", toneClass[s.tone])}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 font-semibold">
                  {s.name}
                  {/* Direction, spelled out — on a short the target sits below
                      the current price and reads like a bug without it. */}
                  <span
                    className={cn(
                      "border px-1.5 py-px font-mono text-[10px] font-bold tracking-wider",
                      s.tone === "long"
                        ? "border-profit/40 text-profit"
                        : s.tone === "short"
                        ? "border-loss/40 text-loss"
                        : "border-warning/40 text-warning"
                    )}
                  >
                    {s.tone === "long" ? "LONG" : s.tone === "short" ? "SHORT" : lang === "en" ? "WAIT" : "ATTENDRE"}
                  </span>
                </h4>
                <span className="rounded-full bg-white/10 px-2 py-1 font-mono text-[10px]">
                  {style.horizon[lang]}
                </span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{s.trigger}</p>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="terminal-label text-muted-foreground">{lang === "en" ? "Entry" : "Entrée"}</p>
                  <p className="text-xs font-medium">{s.entry}</p>
                </div>
                <div>
                  <p className="terminal-label text-muted-foreground">{lang === "en" ? "Target" : "Objectif"}</p>
                  <p className="font-mono text-xs font-medium text-profit">
                    {s.target != null ? formatCurrency(s.target) : "—"}
                  </p>
                </div>
                <div>
                  <p className="terminal-label text-muted-foreground">{lang === "en" ? "Invalidation" : "Invalidation"}</p>
                  <p className="font-mono text-xs font-medium text-loss">
                    {s.stop != null ? formatCurrency(s.stop) : "—"}
                  </p>
                </div>
                <div>
                  <p className="terminal-label text-muted-foreground">R/R</p>
                  <p className="font-mono text-xs font-medium">{rr ? `1:${rr.toFixed(1)}` : "—"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
          {lang === "en"
            ? "Educational simulation. These setups follow from the indicators above — they are not a recommendation, and no hit rate is claimed."
            : "Simulation éducative. Ces setups découlent des indicateurs ci-dessus — ce ne sont pas des recommandations, et aucun taux de réussite n'est avancé."}
        </p>
      </div>
    </motion.div>
  );
}

// News Section with Sentiment
// ── Alerte de prix ───────────────────────────────────────────────────────────
function PriceAlertSection({
  symbol, currentPrice, support, resistance, formatCurrency,
}: {
  symbol: string; currentPrice: number; support: number; resistance: number;
  formatCurrency: (v: number, symbol: string) => string;
}) {
  const { lang } = useLanguage();
  const fr = lang !== "en";
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => alertsAPI.list().then(d => setAlerts(d.alerts.filter(a => a.symbol === symbol))).catch(() => {});
  useEffect(() => { setError(""); load(); /* eslint-disable-next-line */ }, [symbol]);

  // Smart default target: resistance for "above", support for "below"
  useEffect(() => {
    const smart = direction === "above" ? resistance : support;
    if (smart) setTarget(String(Number(smart.toFixed(smart < 10 ? 4 : 2))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, symbol]);

  const create = async () => {
    const t = parseFloat(target);
    if (!t || t <= 0 || busy) return;
    setBusy(true); setError("");
    try {
      await alertsAPI.create(symbol, direction, t, note.trim());
      setNote("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (fr ? "Erreur" : "Error"));
    } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    setAlerts(a => a.filter(x => x.id !== id));
    try { await alertsAPI.remove(id); } catch { load(); }
  };

  const activeAlerts = alerts.filter(a => a.status === "active");
  const distancePct = target ? ((parseFloat(target) - currentPrice) / currentPrice * 100) : 0;

  return (
    <div className="glass-card p-5" data-module-id="price-alert">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl bg-[hsl(var(--gold)/0.15)] border border-[hsl(var(--gold)/0.25)] flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-[hsl(var(--gold))]" />
        </div>
        <h2 className="font-semibold">{fr ? "Alerte de prix" : "Price alert"}</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {fr ? "Cours actuel " : "Now "}<span className="font-mono font-semibold text-foreground">{formatCurrency(currentPrice, symbol)}</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {fr ? "Soyez prévenu·e dès que le cours franchit votre cible — la notification s'affiche pendant que vous êtes sur le site."
            : "Get notified the moment the price crosses your target — the alert shows while you're on the site."}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
          <button onClick={() => setDirection("above")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              direction === "above" ? "bg-profit/15 text-profit" : "text-muted-foreground hover:text-foreground")}>
            <TrendingUp className="w-3.5 h-3.5" />{fr ? "Au-dessus" : "Above"}
          </button>
          <button onClick={() => setDirection("below")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              direction === "below" ? "bg-loss/15 text-loss" : "text-muted-foreground hover:text-foreground")}>
            <TrendingDown className="w-3.5 h-3.5" />{fr ? "En dessous" : "Below"}
          </button>
        </div>
        <input
          type="number" value={target} onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          placeholder={fr ? "Prix cible" : "Target price"}
          className="input flex-1 text-sm tabular-nums" />
        <button onClick={create} disabled={busy || !target}
          className="btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50 whitespace-nowrap">
          <Bell className="w-4 h-4" />{fr ? "Créer l'alerte" : "Create alert"}
        </button>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140}
          placeholder={fr ? "Note (optionnel) : ex. cassure de résistance" : "Note (optional): e.g. resistance breakout"}
          className="input flex-1 text-xs" />
        {target && Math.abs(distancePct) > 0.05 && (
          <span className={cn("text-xs whitespace-nowrap tabular-nums", distancePct >= 0 ? "text-profit" : "text-loss")}>
            {distancePct >= 0 ? "+" : ""}{distancePct.toFixed(1)}% {fr ? "du cours" : "away"}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-loss mt-2">{error}</p>}

      {activeAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/8 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {fr ? `Alertes actives sur ${symbol}` : `Active alerts on ${symbol}`}
          </p>
          {activeAlerts.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/4 border border-white/8">
              <span className={cn("inline-flex items-center gap-1 text-xs font-semibold",
                a.direction === "above" ? "text-profit" : "text-loss")}>
                {a.direction === "above" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {a.direction === "above" ? (fr ? "≥" : "≥") : "≤"} {formatCurrency(a.target, symbol)}
              </span>
              {a.note && <span className="text-xs text-muted-foreground truncate italic">« {a.note} »</span>}
              <button onClick={() => remove(a.id)}
                className="ml-auto p-1 rounded-lg text-muted-foreground hover:text-loss hover:bg-white/10 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Backtest : fiabilité historique du score ─────────────────────────────────
function BacktestSection({
  symbol, timeframe, currentScore, style,
}: { symbol: string; timeframe: string; currentScore: number; style: TradingStyleProfile }) {
  const { lang } = useLanguage();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // The backtest endpoint only accepts 1h/4h/1d/1w — map intraday frames up
  const btTimeframe = ["5m", "15m", "30m", "1h"].includes(timeframe) ? "1h"
    : timeframe === "4h" ? "4h"
    : ["1w", "1mo"].includes(timeframe) ? "1w" : "1d";

  // Reset when the asset changes
  useEffect(() => { setResult(null); setError(""); }, [symbol]);

  const runBacktest = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Validate the plan the user is actually shown, not a generic 2/3 ATR.
      const data = await analysisAPI.backtest(symbol, btTimeframe, 10, style.atr.sl, style.atr.tp);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du backtest");
    } finally {
      setIsLoading(false);
    }
  };

  const fr = lang !== "en";

  return (
    <div className="glass-card p-5" data-module-id="backtest">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="font-semibold">{fr ? "Fiabilité historique du score" : "Historical score reliability"}</h2>
        </div>
        {!result && (
          <button
            onClick={runBacktest}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/25 text-cyan-300 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {isLoading ? (fr ? "Calcul en cours…" : "Computing…") : (fr ? "Tester sur l'historique" : "Test on history")}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {fr
          ? "Le score est rejoué sur l'historique de cet actif, barre par barre et sans voir le futur, puis comparé à ce qui a réellement suivi."
          : "The score is replayed over this asset's history, bar by bar without seeing the future, then compared to what actually followed."}
      </p>

      {error && <p className="text-sm text-loss">{error}</p>}

      {result && (
        <div className="space-y-4">
          {/* Sample-size honesty first: every figure below is read through it */}
          {!result.enough_samples && (
            <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5">
              <p className="text-xs text-warning-foreground/90">
                {fr
                  ? `Seulement ${result.n_trades} trades clôturés (minimum ${result.min_trades_for_confidence} pour conclure). Les chiffres ci-dessous sont indicatifs, pas une preuve.`
                  : `Only ${result.n_trades} closed trades (minimum ${result.min_trades_for_confidence} to conclude). The figures below are indicative, not evidence.`}
              </p>
            </div>
          )}

          {/* Summary metrics — in R, multiples of the risk taken */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
              <p className="text-[11px] text-muted-foreground">{fr ? "Trades clôturés" : "Closed trades"}</p>
              <p className="text-sm font-bold tabular-nums">{result.n_trades}</p>
              <p className="text-[10px] text-muted-foreground/60">
                {fr ? `sur ${result.n_evaluated} évaluations` : `of ${result.n_evaluated} evaluations`}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
              <p className="text-[11px] text-muted-foreground">{fr ? "Espérance / trade" : "Expectancy / trade"}</p>
              <p className={cn("text-sm font-bold tabular-nums",
                result.expectancy_net_r > 0 ? "text-profit" : "text-loss")}>
                {result.expectancy_net_r >= 0 ? "+" : ""}{result.expectancy_net_r}R
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {fr ? `brut ${result.expectancy_gross_r}R · coûts −${result.cost_drag_r}R` : `gross ${result.expectancy_gross_r}R · costs −${result.cost_drag_r}R`}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
              <p className="text-[11px] text-muted-foreground">{fr ? "Issues" : "Outcomes"}</p>
              <p className="text-sm font-bold tabular-nums">
                <span className="text-profit">{result.p_target}%</span>
                <span className="text-muted-foreground/50"> / </span>
                <span className="text-loss">{result.p_stop}%</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {fr ? `cible / stop · ${result.p_timeout}% expirés` : `target / stop · ${result.p_timeout}% timed out`}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
              <p className="text-[11px] text-muted-foreground">{fr ? "Profit factor" : "Profit factor"}</p>
              <p className={cn("text-sm font-bold tabular-nums",
                (result.profit_factor ?? 0) > 1 ? "text-profit" : "text-loss")}>
                {result.profit_factor ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {fr ? `réussite ${result.win_rate}% · perte max ${result.max_drawdown_r}R` : `win rate ${result.win_rate}% · max DD ${result.max_drawdown_r}R`}
              </p>
            </div>
          </div>

          {/* What was actually simulated */}
          <p className="font-mono text-[10px] text-muted-foreground/60">
            {fr
              ? `stop ${result.sl_atr}×ATR · cible ${result.tp_atr}×ATR · horizon ${result.horizon_bars} bougies · coûts ${result.cost_bps} bps A/R · moteur ${result.engine_version} · échantillons indépendants (${result.mode})`
              : `stop ${result.sl_atr}×ATR · target ${result.tp_atr}×ATR · horizon ${result.horizon_bars} bars · costs ${result.cost_bps} bps round trip · engine ${result.engine_version} · independent samples (${result.mode})`}
          </p>

          {/* Bucket table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wider border-b border-white/8">
                  <th className="text-left py-2 pr-3 font-semibold">{fr ? "Zone de score" : "Score zone"}</th>
                  <th className="text-right py-2 px-3 font-semibold">{fr ? "Occurrences" : "Count"}</th>
                  <th className="text-right py-2 px-3 font-semibold">{fr ? "% hausses" : "Win rate"}</th>
                  <th className="text-right py-2 pl-3 font-semibold">{fr ? "Résultat moyen (R)" : "Avg outcome (R)"}</th>
                </tr>
              </thead>
              <tbody>
                {result.buckets.map((b) => {
                  const isCurrent = currentScore >= b.range[0] && currentScore < (b.range[1] === 100 ? 101 : b.range[1]);
                  return (
                    <tr key={b.label} className={cn("border-b border-white/4",
                      isCurrent && "bg-cyan-500/8")}>
                      <td className="py-2 pr-3 font-medium">
                        {b.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-1.5 py-0.5 rounded-full">
                            {fr ? "Score actuel" : "Current score"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{b.count || "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{b.win_rate != null ? `${b.win_rate}%` : "—"}</td>
                      <td className={cn("py-2 pl-3 text-right tabular-nums font-semibold",
                        b.avg_r == null ? "text-muted-foreground" : b.avg_r >= 0 ? "text-profit" : "text-loss")}>
                        {b.avg_r != null ? `${b.avg_r >= 0 ? "+" : ""}${b.avg_r}R` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground/60">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function NewsSentimentSection({ news, symbol }: { news: Analysis["news"]; symbol: string }) {
  if (!news || news.length === 0) return null;

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const getRelativeTime = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jours`;
    return formatDate(timestamp);
  };

  // Simple sentiment analysis based on title keywords
  const analyzeSentiment = (title: string) => {
    const positiveWords = ["surge", "gain", "rise", "jump", "soar", "beat", "strong", "growth", "profit", "success", "up", "high", "buy", "bullish", "record", "rally", "boost", "outperform"];
    const negativeWords = ["drop", "fall", "decline", "plunge", "crash", "miss", "weak", "loss", "fail", "down", "low", "sell", "bearish", "concern", "risk", "warn", "cut", "layoff", "slump"];

    const titleLower = title.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (titleLower.includes(word)) score++;
    });

    negativeWords.forEach(word => {
      if (titleLower.includes(word)) score--;
    });

    if (score > 0) return { sentiment: "Positif", color: "text-profit", bg: "bg-profit/20", icon: "📈" };
    if (score < 0) return { sentiment: "Negatif", color: "text-loss", bg: "bg-loss/20", icon: "📉" };
    return { sentiment: "Neutre", color: "text-muted-foreground", bg: "bg-white/10", icon: "📰" };
  };

  // Generate a summary based on title
  const generateSummary = (title: string, publisher: string | undefined) => {
    const sentiment = analyzeSentiment(title);
    const titleLower = title.toLowerCase();

    // Extract key themes
    let theme = "";
    if (titleLower.includes("earning") || titleLower.includes("revenue") || titleLower.includes("profit")) {
      theme = "Resultats financiers";
    } else if (titleLower.includes("analyst") || titleLower.includes("rating") || titleLower.includes("target")) {
      theme = "Recommandation analyste";
    } else if (titleLower.includes("ceo") || titleLower.includes("executive") || titleLower.includes("management")) {
      theme = "Actualite dirigeants";
    } else if (titleLower.includes("product") || titleLower.includes("launch") || titleLower.includes("release")) {
      theme = "Produit/Innovation";
    } else if (titleLower.includes("market") || titleLower.includes("stock") || titleLower.includes("share")) {
      theme = "Évolution du cours";
    } else if (titleLower.includes("deal") || titleLower.includes("acquisition") || titleLower.includes("merger")) {
      theme = "Fusion/Acquisition";
    } else {
      theme = "Actualite generale";
    }

    return { theme, sentiment };
  };

  const positiveCount = news.filter(item => analyzeSentiment(item.title || "").sentiment === "Positif").length;
  const negativeCount = news.filter(item => analyzeSentiment(item.title || "").sentiment === "Negatif").length;
  const neutralCount = news.length - positiveCount - negativeCount;

  const overallSentiment = positiveCount - negativeCount;

  // Generate overall summary
  const getOverallSummary = () => {
    if (positiveCount > negativeCount * 2) {
      return `Couverture médiatique très positive avec ${positiveCount} article(s) favorable(s). Le sentiment général est optimiste concernant ${symbol}.`;
    } else if (positiveCount > negativeCount) {
      return `Couverture légèrement positive avec ${positiveCount} article(s) favorable(s) contre ${negativeCount} négatif(s). Tendance modérément optimiste.`;
    } else if (negativeCount > positiveCount * 2) {
      return `Couverture médiatique préoccupante avec ${negativeCount} article(s) négatif(s). Vigilance recommandée sur ${symbol}.`;
    } else if (negativeCount > positiveCount) {
      return `Couverture légèrement négative avec ${negativeCount} article(s) défavorable(s). Quelques inquiétudes à surveiller.`;
    } else {
      return `Couverture équilibrée avec ${positiveCount} article(s) positif(s) et ${negativeCount} négatif(s). Pas de tendance claire dans les actualités.`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <Newspaper className="w-5 h-5 text-primary" />
          Actualités & Sentiment
        </h3>
        <div className={cn(
          "px-3 py-1 rounded-full text-sm font-medium",
          overallSentiment > 0 ? "bg-profit/20 text-profit" :
          overallSentiment < 0 ? "bg-loss/20 text-loss" : "bg-white/10"
        )}>
          {overallSentiment > 0 ? "📈 Positif" : overallSentiment < 0 ? "📉 Négatif" : "➖ Neutre"}
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 mb-6">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Résumé des actualités
        </h4>
        <p className="text-sm text-muted-foreground mb-3">{getOverallSummary()}</p>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-profit" />
            {positiveCount} positif(s)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/50" />
            {neutralCount} neutre(s)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-loss" />
            {negativeCount} négatif(s)
          </span>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {news.map((item, index) => {
          const { theme, sentiment } = generateSummary(item.title || "", item.publisher);
          const cardProps = item.link
            ? { as: "a" as const, href: item.link, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
            : {};

          return (
            <a
              key={index}
              href={item.link || undefined}
              target={item.link ? "_blank" : undefined}
              rel={item.link ? "noopener noreferrer" : undefined}
              className={cn(
                "block p-4 bg-white/5 rounded-xl transition-all border border-transparent",
                item.link
                  ? "hover:bg-white/10 hover:border-white/10 cursor-pointer"
                  : "cursor-default"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{sentiment.icon}</div>
                <div className="flex-1 min-w-0">
                  {/* Theme tag */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", sentiment.bg, sentiment.color)}>
                      {sentiment.sentiment}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-muted-foreground">
                      {theme}
                    </span>
                    {item.link && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-primary font-medium">
                        Lire l'article <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="font-medium text-sm mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>

                  {/* Summary based on title */}
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {item.title && item.title.length > 50
                      ? `Cet article de ${item.publisher || "source inconnue"} traite ${
                          theme === "Resultats financiers" ? "des performances financieres" :
                          theme === "Recommandation analyste" ? "d'une analyse de marche" :
                          theme === "Produit/Innovation" ? "d'une nouveaute produit" :
                          theme === "Fusion/Acquisition" ? "d'une operation strategique" :
                          "de l'actualite"
                        } de ${symbol}.`
                      : `Article concernant ${symbol} publie par ${item.publisher || "source inconnue"}.`
                    }
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.publisher && (
                      <span className="font-medium">{item.publisher}</span>
                    )}
                    {item.date && (
                      <>
                        <span>•</span>
                        <span>{getRelativeTime(item.date)}</span>
                      </>
                    )}
                    {!item.link && (
                      <>
                        <span>•</span>
                        <span className="italic">Lien non disponible</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <p className="text-xs text-muted-foreground">
          L'analyse de sentiment est basee sur les mots-cles des titres. Elle ne remplace pas une lecture approfondie des articles. Cliquez sur "Lire l'article" pour acceder a la source complete.
        </p>
      </div>
    </motion.div>
  );
}

// Educational Section
function EducationalSection({ analysis, tradingLevel = "intermediate" }: { analysis: Analysis; tradingLevel?: string }) {
  // Beginners: open by default
  const [expanded, setExpanded] = useState(tradingLevel === "beginner");
  // Hide entirely for experts
  if (tradingLevel === "expert") return null;

  const getEducationalContent = () => {
    const content = [];

    // RSI Education
    content.push({
      indicator: "RSI (Relative Strength Index)",
      description: "Le RSI mesure la vitesse et le changement des mouvements de prix. Il oscille entre 0 et 100.",
      interpretation: "En dessous de 30 = survente (achat potentiel). Au-dessus de 70 = surachat (vente potentielle).",
      currentValue: `${analysis.indicators.rsi.value.toFixed(1)}`,
      currentInterpretation: analysis.indicators.rsi.value < 30 ? "Zone de survente" : analysis.indicators.rsi.value > 70 ? "Zone de surachat" : "Zone neutre"
    });

    // MACD Education
    content.push({
      indicator: "MACD (Moving Average Convergence Divergence)",
      description: "Le MACD montre la relation entre deux moyennes mobiles exponentielles du prix.",
      interpretation: "Signal haussier quand la ligne MACD croise au-dessus de la ligne de signal. Baissier dans le cas contraire.",
      currentValue: `${analysis.indicators.macd.value.toFixed(4)}`,
      currentInterpretation: analysis.indicators.macd.histogram > 0 ? "Signal haussier" : "Signal baissier"
    });

    // Bollinger Bands Education
    content.push({
      indicator: "Bandes de Bollinger",
      description: "Les bandes de Bollinger encadrent le prix avec des niveaux de deviation standard.",
      interpretation: "Prix proche de la bande supérieure = potentiel surachat. Prix proche de la bande inférieure = potentiel survente.",
      currentValue: `Position: ${analysis.indicators.bollinger.position}`,
      currentInterpretation: analysis.indicators.bollinger.position === "upper" ? "Proche de la resistance" : analysis.indicators.bollinger.position === "lower" ? "Proche du support" : "Dans le canal"
    });

    return content;
  };

  const educationalContent = getEducationalContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1 }}
      className="glass-card p-6"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-semibold flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-primary" />
          Comprendre les Indicateurs
          {tradingLevel === "beginner" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
              Guide Débutant
            </span>
          )}
        </h3>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 space-y-4"
        >
          {educationalContent.map((item, idx) => (
            <div key={idx} className="p-4 bg-white/5 rounded-xl">
              <h4 className="font-semibold text-primary mb-2">{item.indicator}</h4>
              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
              <p className="text-sm text-muted-foreground mb-3"><strong>Interpretation:</strong> {item.interpretation}</p>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-sm">Valeur actuelle: <strong>{item.currentValue}</strong></span>
                <span className="text-sm px-2 py-0.5 bg-primary/20 text-primary rounded">{item.currentInterpretation}</span>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Analysis Chat Panel ──────────────────────────────────────────────────────

function buildAnalysisContext(analysis: Analysis, aiInsight: string | null, lang: string): string {
  const sign = (n: number) => n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 4 });

  const lines: string[] = [
    `=== ANALYSE TECHNIQUE — ${analysis.symbol} ===`,
    `Langue utilisateur: ${lang === "en" ? "EN" : "FR"}`,
    `Prix actuel: ${fmt(analysis.price.current)} (${sign(analysis.price.change)})`,
    `Haut 24h: ${fmt(analysis.price.high_24h)} | Bas 24h: ${fmt(analysis.price.low_24h)}`,
    `Tendance: ${analysis.trend}`,
    `Signal: ${analysis.signal.emoji} ${analysis.signal.text}`,
    ``,
    `Score Global: ${analysis.score.total}/100`,
    `  Technique: ${analysis.score.technical}/100 | Volume: ${analysis.score.volume}/100 | Momentum: ${analysis.score.momentum}/100`,
    analysis.score.fundamental !== undefined ? `  Fundamental: ${analysis.score.fundamental}/100` : "",
    ``,
    `Niveaux clés:`,
    `  Support: ${fmt(analysis.levels.support)} | Pivot: ${fmt(analysis.levels.pivot)} | Résistance: ${fmt(analysis.levels.resistance)}`,
    `  Stop Loss suggéré: ${fmt(analysis.risk.suggested_sl)} | TP suggéré: ${fmt(analysis.risk.suggested_tp)}`,
    `  Risk/Reward: ${analysis.risk.risk_reward.toFixed(2)}`,
    ``,
    `Indicateurs:`,
    `  RSI(14): ${analysis.indicators.rsi.value.toFixed(1)} → ${analysis.indicators.rsi.signal}`,
    `  MACD: ${analysis.indicators.macd.value.toFixed(4)} | Signal: ${analysis.indicators.macd.signal_line.toFixed(4)} | Histo: ${analysis.indicators.macd.histogram.toFixed(4)} → ${analysis.indicators.macd.signal}`,
    `  EMA20: ${fmt(analysis.indicators.ema.ema20)} | EMA50: ${fmt(analysis.indicators.ema.ema50)}${analysis.indicators.ema.ema200 ? ` | EMA200: ${fmt(analysis.indicators.ema.ema200)}` : ""}`,
    `  Bollinger: H=${fmt(analysis.indicators.bollinger.upper)} / M=${fmt(analysis.indicators.bollinger.middle)} / B=${fmt(analysis.indicators.bollinger.lower)} → ${analysis.indicators.bollinger.position}`,
    `  Volume Ratio: ${analysis.indicators.volume_ratio.toFixed(2)} | ATR: ${analysis.indicators.atr.toFixed(4)}`,
    analysis.indicators.adx ? `  ADX: ${analysis.indicators.adx.value.toFixed(1)} | +DI: ${analysis.indicators.adx.plus_di.toFixed(1)} | -DI: ${analysis.indicators.adx.minus_di.toFixed(1)} → ${analysis.indicators.adx.signal}` : "",
    analysis.indicators.stochastic ? `  Stochastique: %K=${analysis.indicators.stochastic.k.toFixed(1)} / %D=${analysis.indicators.stochastic.d.toFixed(1)} → ${analysis.indicators.stochastic.signal}` : "",
  ];

  if (analysis.company?.name) {
    lines.push("", `Société: ${analysis.company.name}${analysis.company.sector ? ` (${analysis.company.sector})` : ""}`);
  }

  if (analysis.fundamentals) {
    const f = analysis.fundamentals;
    const fundLines = ["", "Fondamentaux:"];
    if (f.pe_ratio) fundLines.push(`  P/E: ${f.pe_ratio.toFixed(2)}`);
    if (f.market_cap) fundLines.push(`  Market Cap: ${(f.market_cap / 1e9).toFixed(2)}B`);
    if (f.dividend_yield) fundLines.push(`  Dividende: ${(f.dividend_yield * 100).toFixed(2)}%`);
    if (f.beta) fundLines.push(`  Beta: ${f.beta.toFixed(2)}`);
    if (f.recommendation) fundLines.push(`  Consensus analystes: ${f.recommendation}`);
    if (f.target_price) fundLines.push(`  Objectif cours: ${fmt(f.target_price)}`);
    lines.push(...fundLines);
  }

  if (aiInsight) {
    lines.push("", "=== ANALYSE IA PRÉ-GÉNÉRÉE ===", aiInsight.slice(0, 2000));
  }

  return lines.filter(Boolean).join("\n");
}

type ChatMsg = { role: "user" | "assistant"; content: string };

function AnalysisChatPanel({
  analysis,
  aiInsight,
  tradingStyle,
  riskLevel,
  tradingLevel,
  lang,
  onClose,
}: {
  analysis: Analysis;
  aiInsight: string | null;
  tradingStyle: string;
  riskLevel: string;
  tradingLevel: string;
  lang: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const analysisContext = buildAnalysisContext(analysis, aiInsight, lang);

  useEffect(() => {
    aiAPI.getLimit().then(s => {
      setRemaining(s.remaining);
      setIsPremium(s.is_premium);
    }).catch(() => {});
    inputRef.current?.focus();
    // Auto-send welcome prompt
    sendMessage(lang === "en"
      ? `I have the analysis of ${analysis.symbol} in front of me. Summarize the key signals: what is the trend, what does the score indicate, and what are the main entry/exit levels to watch?`
      : `J'ai l'analyse de ${analysis.symbol} devant moi. Résume-moi les signaux clés : quelle est la tendance, que signifie le score, et quels sont les niveaux d'entrée/sortie principaux à surveiller ?`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;
    setLimitError(null);

    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setIsSending(true);

    try {
      const historyForAPI = updatedHistory.slice(1).slice(-10); // exclude auto-prompt if needed, keep last 10
      const res = await aiAPI.analysisChat(text.trim(), analysisContext, historyForAPI);
      setMessages(prev => [...prev, { role: "assistant", content: res.response }]);
      if (!res.is_premium) setRemaining(res.remaining);
    } catch (err: any) {
      const detail = err?.message || "";
      if (detail.includes("429") || err?.status === 429) {
        setLimitError(lang === "en"
          ? "Daily limit reached. Upgrade to Premium for unlimited messages."
          : "Limite quotidienne atteinte. Passez Premium pour des messages illimités.");
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: lang === "en" ? "An error occurred. Please retry." : "Une erreur s'est produite. Réessayez." }]);
      }
    } finally {
      setIsSending(false);
    }
  }

  const handleKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const suggestions = lang === "en"
    ? ["Long or short setup?", "Key support/resistance?", "RSI divergence?", "Compare with sector"]
    : ["Setup long ou short ?", "Niveaux S/R clés ?", "Divergence RSI ?", "Comparer au secteur"];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed top-0 right-0 h-full z-50 flex flex-col"
      style={{
        width: "min(440px, 100vw)",
        background: "linear-gradient(180deg, hsl(220 50% 5.5%) 0%, hsl(220 45% 4.5%) 100%)",
        borderLeft: "1px solid rgba(184,134,58,0.2)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(184,134,58,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(184,134,58,0.3), rgba(232,168,32,0.2))", border: "1px solid rgba(184,134,58,0.3)" }}>
            <Bot className="w-4 h-4 text-neon-purple" />
          </div>
          <div>
            <p className="font-semibold text-sm">{lang === "en" ? "AI Analysis" : "Analyse IA"} · {analysis.symbol}</p>
            <p className="text-[11px] text-muted-foreground">
              {isPremium
                ? (lang === "en" ? "Unlimited" : "Illimité")
                : remaining !== null
                  ? (lang === "en" ? `${remaining} messages left today` : `${remaining} messages restants aujourd'hui`)
                  : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(184,134,58,0.15)", border: "1px solid rgba(184,134,58,0.3)" }}>
              <Brain className="w-7 h-7 text-neon-purple animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">{lang === "en" ? "Analyzing..." : "Analyse en cours..."}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: "rgba(184,134,58,0.2)", border: "1px solid rgba(184,134,58,0.3)" }}>
                <Bot className="w-3.5 h-3.5 text-neon-purple" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "text-white rounded-tr-sm"
                  : "text-foreground/90 rounded-tl-sm"
              )}
              style={msg.role === "user" ? {
                background: "linear-gradient(135deg, rgba(232,168,32,0.35), rgba(184,134,58,0.25))",
                border: "1px solid rgba(232,168,32,0.3)",
              } : {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {msg.role === "assistant" ? renderAIText(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "rgba(184,134,58,0.2)", border: "1px solid rgba(184,134,58,0.3)" }}>
              <Bot className="w-3.5 h-3.5 text-neon-purple" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips — shown before first user message */}
      {messages.length <= 1 && !isSending && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: "rgba(184,134,58,0.1)",
                border: "1px solid rgba(184,134,58,0.25)",
                color: "rgba(167,139,250,0.9)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Limit error */}
      {limitError && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs text-warning bg-warning/10 border border-warning/25 flex-shrink-0">
          {limitError}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || !!limitError}
            placeholder={lang === "en" ? "Ask about this analysis…" : "Posez une question sur cette analyse…"}
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-neon-purple/50 placeholder:text-muted-foreground/50 disabled:opacity-50 min-h-[44px] max-h-[120px]"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isSending || !!limitError}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, rgba(184,134,58,0.8), rgba(232,168,32,0.8))",
              border: "1px solid rgba(184,134,58,0.4)",
            }}
          >
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
          {lang === "en" ? "Educational use only — not financial advice" : "Usage éducatif uniquement — pas un conseil financier"}
        </p>
      </div>
    </motion.div>
  );
}
