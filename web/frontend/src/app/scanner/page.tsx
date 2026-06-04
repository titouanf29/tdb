"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  TrendingUp,
  TrendingDown,
  Zap,
  Loader2,
  RefreshCw,
  BarChart2,
  Volume2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Search,
  Crown,
  Lock,
  Target,
  Activity,
  Sparkles,
  ArrowUpRight,
  Globe,
  Flame,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { analysisAPI, marketAPI, Market, ScanResultItem, ScanQuota } from "@/lib/api";
import { useFormatPrice } from "@/lib/SettingsContext";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";

type SortKey = "score" | "change" | "change_1w" | "rsi" | "volume_ratio";
type OppFilter = "all" | "breakout" | "reversal" | "momentum";

const OPP_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  breakout: { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  reversal: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  momentum: { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30",  dot: "bg-amber-400" },
};

const TREND_CONFIG: Record<string, { color: string; icon: string }> = {
  HAUSSIER: { color: "text-emerald-400", icon: "↑" },
  BAISSIER: { color: "text-rose-400",    icon: "↓" },
  NEUTRE:   { color: "text-slate-400",   icon: "→" },
};

/** Maps a Yahoo Finance symbol suffix to ISO country code + label.
 *  Uses flag-icons library (fi fi-xx) — renders as CSS image, works on all
 *  platforms including Chrome/Windows (unlike regional-indicator emojis). */
const SUFFIX_REGIONS: Record<string, { iso: string; label: string }> = {
  ".PA":  { iso: "fr", label: "Paris" },
  ".AS":  { iso: "nl", label: "Amsterdam" },
  ".BR":  { iso: "be", label: "Bruxelles" },
  ".LS":  { iso: "pt", label: "Lisbonne" },
  ".DE":  { iso: "de", label: "Francfort" },
  ".MC":  { iso: "es", label: "Madrid" },
  ".MI":  { iso: "it", label: "Milan" },
  ".SW":  { iso: "ch", label: "Suisse" },
  ".L":   { iso: "gb", label: "Londres" },
  ".T":   { iso: "jp", label: "Japon" },
  ".HK":  { iso: "hk", label: "Hong Kong" },
  ".KS":  { iso: "kr", label: "Corée" },
  ".NS":  { iso: "in", label: "Inde" },
  ".BO":  { iso: "in", label: "Inde" },
  ".SI":  { iso: "sg", label: "Singapour" },
  ".TW":  { iso: "tw", label: "Taïwan" },
  ".AX":  { iso: "au", label: "Australie" },
  ".SS":  { iso: "cn", label: "Chine" },
  ".SZ":  { iso: "cn", label: "Chine" },
};

type AssetRegion =
  | { type: "flag"; iso: string; label: string }
  | { type: "icon"; icon: string; label: string };

function getAssetRegion(symbol: string): AssetRegion {
  if (symbol.startsWith("^")) return { type: "icon", icon: "📊", label: "Indice" };
  if (symbol.endsWith("-USD")) return { type: "icon", icon: "◈", label: "Crypto" };
  if (symbol.endsWith("=F")) return { type: "icon", icon: "⬡", label: "Matières 1ères" };
  const dot = symbol.lastIndexOf(".");
  if (dot !== -1) {
    const r = SUFFIX_REGIONS[symbol.slice(dot)];
    if (r) return { type: "flag", ...r };
  }
  return { type: "flag", iso: "us", label: "US" };
}

function RegionBadge({ symbol, className }: { symbol: string; className?: string }) {
  const region = getAssetRegion(symbol);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground/80 font-medium whitespace-nowrap",
      className
    )}>
      {region.type === "flag"
        ? <span className={`fi fi-${region.iso}`} style={{ width: "1em", height: "0.75em", display: "inline-block", backgroundSize: "cover", borderRadius: "1px" }} />
        : <span className="text-[9px] leading-none">{region.icon}</span>
      }
      {region.label}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
};

export default function ScannerPage() {
  const router = useRouter();
  const formatPrice = useFormatPrice();
  const { t, lang } = useLanguage();

  const OPP_LABELS: Record<OppFilter, string> = {
    all:      t("scanner_filter_all"),
    breakout: t("scanner_filter_breakout"),
    reversal: t("scanner_filter_reversal"),
    momentum: t("scanner_filter_momentum"),
  };

  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState("USA");
  const [minScore, setMinScore] = useState(60);
  const [oppFilter, setOppFilter] = useState<OppFilter>("all");
  const [results, setResults] = useState<ScanResultItem[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([
      marketAPI.getMarkets(),
      analysisAPI.getScanLimit(),
    ]).then(([mData, qData]) => {
      setMarkets(mData.markets);
      setQuota(qData);
    }).catch(console.error).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const runScan = async () => {
    if (quota && !quota.is_premium && quota.remaining <= 0) return;
    setIsScanning(true);
    try {
      const data = await analysisAPI.scan(selectedMarket, minScore, 40, oppFilter);
      setResults(data.results);
      setTotalScanned(data.total_scanned ?? 0);
      if (data.quota) setQuota(data.quota);
    } catch (err: unknown) {
      const error = err as { status?: number; data?: { detail?: { message?: string } } };
      if (error?.status === 429) {
        const q = await analysisAPI.getScanLimit().catch(() => null);
        if (q) setQuota(q);
      }
      console.error("Error scanning:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />) : null;

  const filtered = results
    .filter((r) => !searchQuery ||
      r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      return sortAsc ? va - vb : vb - va;
    });

  const getScoreConfig = (score: number) => {
    if (score >= 80) return { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", glow: "shadow-emerald-500/20" };
    if (score >= 65) return { bg: "bg-green-500/15",   border: "border-green-500/40",   text: "text-green-400",   glow: "shadow-green-500/20" };
    if (score >= 50) return { bg: "bg-amber-500/15",   border: "border-amber-500/40",   text: "text-amber-400",   glow: "shadow-amber-500/20" };
    return                 { bg: "bg-rose-500/15",     border: "border-rose-500/40",     text: "text-rose-400",    glow: "shadow-rose-500/20" };
  };

  const topResults = filtered.slice(0, 3);
  const quotaOk = !quota || quota.is_premium || quota.remaining > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-5xl mx-auto"
      data-module-id="scanner-panel"
    >

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("scanner_title")}</h1>
                <p className="text-muted-foreground text-sm">
                  {t("scanner_subtitle")}
                  {totalScanned > 0 && (
                    <span className="ml-2 text-primary font-semibold">{totalScanned} {t("scanner_scanned")}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HelpGuide
              title={lang === "en" ? "Market Scanner" : "Scanner de marché"}
              intro={lang === "en" ? "Automatically detects market opportunities by scanning hundreds of assets in seconds." : "Détecte automatiquement les opportunités sur les marchés en scannant des centaines d'actifs en quelques secondes."}
              sections={lang === "en" ? [
                { title: "Run a scan", desc: "Press 'Scan' to analyze the selected market. The AI detects the most relevant technical setups." },
                { title: "Results", desc: "Each result shows the signal (Buy/Sell), movement strength and volume. Click to see the full analysis." },
                { title: "Filters", desc: "Filter by signal type, market, or minimum confidence threshold to refine results." },
                { title: "Quota", desc: "The number of scans available per hour is limited based on your plan (Free/Premium)." },
                { title: "Trending assets", desc: "The 'Trending' section shows assets with the strongest momentum, regardless of filters." },
              ] : [
                { title: "Lancer un scan", desc: "Appuie sur 'Scanner' pour analyser le marché sélectionné. L'IA détecte les configurations techniques les plus pertinentes." },
                { title: "Résultats", desc: "Chaque résultat affiche le signal (Achat/Vente), la force du mouvement et le volume. Clique pour voir l'analyse complète." },
                { title: "Filtres", desc: "Filtre par type de signal, marché, ou seuil de confiance minimum pour affiner les résultats." },
                { title: "Quota", desc: "Le nombre de scans disponibles par heure est limité selon ton plan (Free/Premium)." },
                { title: "Actifs en tendance", desc: "La section 'Trending' affiche les actifs avec le plus fort momentum du moment, indépendamment des filtres." },
              ]}
              tip={lang === "en" ? "Run the scanner outside market hours to spot pre-market assets with potential." : "Lance le scanner en dehors des heures de marché pour voir les actifs en pre-market avec du potentiel."}
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={runScan}
              disabled={isScanning || !quotaOk}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 disabled:opacity-50 text-sm font-medium transition-all"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t("scanner_btn")}
            </motion.button>
          </div>
        </div>

        {/* Stats row */}
        {results.length > 0 && (
          <div className="relative mt-5 pt-4 border-t border-white/8 flex items-center gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{lang === "en" ? "Opportunities" : "Opportunités"}</span>
              <span className="font-bold text-primary">{filtered.length}</span>
            </div>
            {results.filter(r => r.trend === "HAUSSIER").length > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-muted-foreground">{lang === "en" ? "Bullish" : "Haussier"}</span>
                <span className="font-bold text-emerald-400">{results.filter(r => r.trend === "HAUSSIER").length}</span>
              </div>
            )}
            {results.filter(r => r.trend === "BAISSIER").length > 0 && (
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-muted-foreground">{lang === "en" ? "Bearish" : "Baissier"}</span>
                <span className="font-bold text-rose-400">{results.filter(r => r.trend === "BAISSIER").length}</span>
              </div>
            )}
            {results.filter(r => r.near_breakout).length > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-muted-foreground">Breakout</span>
                <span className="font-bold text-amber-400">{results.filter(r => r.near_breakout).length}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Quota banner ─────────────────────────────────────────────────── */}
      {quota && !quota.is_premium && (
        <motion.div
          variants={itemVariants}
          className={cn(
            "rounded-xl border p-4 flex items-center justify-between gap-4",
            quota.remaining === 0
              ? "border-rose-500/30 bg-rose-500/5"
              : quota.remaining === 1
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-white/8 bg-white/[0.02]"
          )}
        >
          <div className="flex items-center gap-3">
            {quota.remaining === 0
              ? <Lock className="w-5 h-5 text-rose-400 shrink-0" />
              : <ScanLine className="w-5 h-5 text-primary shrink-0" />}
            <div>
              <p className="text-sm font-semibold">
                {quota.remaining === 0
                  ? t("scanner_limit_reached")
                  : `${quota.remaining} ${t("scanner_remaining")}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {quota.scans_today} / {quota.daily_limit} {t("scanner_quota_info")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: quota.daily_limit }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    i < quota.scans_today ? "bg-primary/30" : "bg-primary"
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => router.push("/premium")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5" />
              {t("scanner_unlimited")}
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Quota exhausted ───────────────────────────────────────────────── */}
      {quota && !quota.is_premium && quota.remaining === 0 && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-lg font-bold mb-1">{t("scanner_limit_free")}</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">{t("scanner_premium_pitch")}</p>
          <button
            onClick={() => router.push("/premium")}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 transition-opacity shadow-lg shadow-yellow-500/20"
          >
            <Crown className="w-4 h-4" />
            {t("scanner_go_premium")}
          </button>
        </motion.div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      {quotaOk && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
          {/* Market pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium w-20 shrink-0">
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "Market" : "Marché"}
            </div>
            <div className="flex flex-wrap gap-2">
              {markets.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMarket(m.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                    selectedMarket === m.key
                      ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.2)]"
                      : "bg-white/5 border-white/8 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Opportunity type */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium w-20 shrink-0">
              <Zap className="w-3.5 h-3.5" />
              {lang === "en" ? "Signal" : "Signal"}
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(OPP_LABELS) as OppFilter[]).map((k) => {
                const cfg = k !== "all" ? OPP_COLORS[k] : null;
                return (
                  <button
                    key={k}
                    onClick={() => setOppFilter(k)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
                      oppFilter === k
                        ? k === "all"
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : `${cfg!.bg} ${cfg!.border} ${cfg!.text}`
                        : "bg-white/5 border-white/8 hover:bg-white/10 text-muted-foreground"
                    )}
                  >
                    {k !== "all" && oppFilter === k && cfg && (
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", cfg.dot)} />
                    )}
                    {OPP_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Score slider + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
              <Activity className="w-3.5 h-3.5" />
              Score min
            </div>
            <div className="flex items-center gap-3 flex-1">
              <input
                type="range" min="0" max="100" value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="flex-1 sm:w-32 accent-primary"
              />
              <span className={cn(
                "text-sm font-bold w-8 tabular-nums",
                minScore >= 80 ? "text-emerald-400" : minScore >= 60 ? "text-primary" : "text-amber-400"
              )}>
                {minScore}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("search") + "…"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm w-full sm:w-44 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Scanning animation ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
          >
            <div className="relative w-16 h-16 mx-auto mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-primary/10 border-b-primary/40"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="font-semibold text-primary">
              {lang === "en" ? "Scanning market…" : "Scan en cours…"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">RSI · MACD · EMA · Volume · Momentum</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top picks (only when 3+ results) ─────────────────────────────── */}
      {quotaOk && !isScanning && topResults.length >= 3 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "en" ? "Top picks" : "Meilleures opportunités"}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topResults.map((r, i) => {
              const cfg = getScoreConfig(r.score);
              const oppCfg = OPP_COLORS[r.opp_type] ?? OPP_COLORS.momentum;
              const trendCfg = TREND_CONFIG[r.trend] ?? TREND_CONFIG.NEUTRE;
              return (
                <motion.div
                  key={r.symbol}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => router.push(`/analysis?symbol=${r.symbol}`)}
                  className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] p-4 cursor-pointer transition-all group hover:border-white/15"
                >
                  {i === 0 && (
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold border shadow-sm", cfg.bg, cfg.border, cfg.glow)}>
                      <span className={cn("text-sm leading-tight", cfg.text)}>{r.score}</span>
                    </div>
                    <span className={cn("text-xs font-semibold", trendCfg.color)}>
                      {trendCfg.icon} {r.trend}
                    </span>
                  </div>
                  <p className="font-bold text-base truncate">{r.name || r.symbol}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">{r.symbol}</span>
                    <RegionBadge symbol={r.symbol} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", oppCfg.bg, oppCfg.border, oppCfg.text)}>
                      {r.opportunity}
                    </span>
                    <span className={cn("text-xs font-semibold", r.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {r.change >= 0 ? "+" : ""}{formatPercent(r.change)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Results table ─────────────────────────────────────────────────── */}
      {quotaOk && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {lang === "en" ? "All signals" : "Tous les signaux"}
              <span className="px-2 py-0.5 rounded-full bg-white/8 text-xs text-muted-foreground font-normal">{filtered.length}</span>
            </h2>
            {results.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">{lang === "en" ? "Sort:" : "Trier:"}</span>
                {([
                  { k: "score" as SortKey, label: "Score" },
                  { k: "change" as SortKey, label: lang === "en" ? "1d" : "1j" },
                  { k: "change_1w" as SortKey, label: lang === "en" ? "1w" : "1s" },
                  { k: "rsi" as SortKey, label: "RSI" },
                  { k: "volume_ratio" as SortKey, label: "Vol" },
                ]).map(({ k, label }) => (
                  <button
                    key={k}
                    onClick={() => handleSort(k)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                      sortKey === k ? "bg-primary/20 text-primary" : "hover:bg-white/8 text-muted-foreground"
                    )}
                  >
                    {label}<SortIcon k={k} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results list */}
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <ScanLine className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-semibold text-base">
                  {results.length === 0 ? t("scanner_empty") : t("scanner_no_results")}
                </p>
                {results.length === 0 && (
                  <p className="text-sm mt-1.5 opacity-60 max-w-xs mx-auto">
                    {t("scanner_multi_prefix")} {selectedMarket} ({totalScanned || "?"} {t("asset")})
                  </p>
                )}
                {results.length === 0 && (
                  <button
                    onClick={runScan}
                    disabled={isScanning}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-all disabled:opacity-50"
                  >
                    <ScanLine className="w-4 h-4" />
                    {lang === "en" ? "Start scan" : "Lancer le scan"}
                  </button>
                )}
              </div>
            ) : (
              <div>
                {filtered.map((r, i) => {
                  const cfg = getScoreConfig(r.score);
                  const oppCfg = OPP_COLORS[r.opp_type] ?? OPP_COLORS.momentum;
                  const trendCfg = TREND_CONFIG[r.trend] ?? TREND_CONFIG.NEUTRE;
                  return (
                    <motion.div
                      key={r.symbol}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.025 }}
                      onClick={() => router.push(`/analysis?symbol=${r.symbol}`)}
                      className="group px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.04] transition-all cursor-pointer border-b border-white/5 last:border-0"
                    >
                      {/* Score */}
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold border shrink-0 shadow-sm",
                        cfg.bg, cfg.border
                      )}>
                        <span className={cn("text-sm leading-tight font-bold", cfg.text)}>{r.score}</span>
                        <span className="text-[8px] leading-tight opacity-50">/100</span>
                      </div>

                      {/* Name + symbol + market + details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate max-w-[200px]">{r.name || r.symbol}</span>
                          <span className={cn("text-xs font-semibold", trendCfg.color)}>
                            {trendCfg.icon}
                          </span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", oppCfg.bg, oppCfg.border, oppCfg.text)}>
                            {r.opportunity}
                          </span>
                          {r.near_breakout && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                              52w High
                            </span>
                          )}
                        </div>
                        {/* Symbol + market region */}
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-mono">{r.symbol}</span>
                          <RegionBadge symbol={r.symbol} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className={cn("font-medium", r.rsi < 35 ? "text-emerald-400" : r.rsi > 68 ? "text-rose-400" : "")}>
                            RSI {r.rsi}
                          </span>
                          <span className="opacity-40">·</span>
                          <span className={r.macd_signal === "HAUSSIER" ? "text-emerald-400" : "text-rose-400"}>
                            MACD {r.macd_signal === "HAUSSIER" ? "↑" : "↓"}
                          </span>
                          <span className="opacity-40">·</span>
                          <span className={cn("flex items-center gap-0.5", r.volume_ratio >= 1.8 ? "text-amber-400 font-semibold" : "")}>
                            <Volume2 className="w-3 h-3" />
                            {r.volume_ratio.toFixed(1)}x
                          </span>
                        </div>
                      </div>

                      {/* Price & change */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm tabular-nums">{formatPrice(r.price, r.symbol)}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className={cn("flex items-center gap-0.5 text-xs font-semibold", r.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {r.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {formatPercent(r.change)}
                          </span>
                          <span className="text-muted-foreground/40 text-[10px]">|</span>
                          <span className={cn("text-[10px] font-medium", r.change_1w >= 0 ? "text-emerald-400/70" : "text-rose-400/70")}>
                            {r.change_1w >= 0 ? "+" : ""}{r.change_1w.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 transition-all"
                          onClick={(e) => { e.stopPropagation(); router.push(`/analysis?symbol=${r.symbol}`); }}
                          title={t("scanner_analyze")}
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-all"
                          onClick={(e) => { e.stopPropagation(); router.push(`/trading?symbol=${r.symbol}`); }}
                          title={t("trader")}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
