"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Zap,
  Filter,
  Loader2,
  RefreshCw,
  BarChart2,
  Volume2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Rocket,
  Search,
  Crown,
  Lock,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { analysisAPI, marketAPI, Market, ScanResultItem, ScanQuota } from "@/lib/api";
import { useFormatPrice } from "@/lib/SettingsContext";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";

type SortKey = "score" | "change" | "change_1w" | "rsi" | "volume_ratio";
type OppFilter = "all" | "breakout" | "reversal" | "momentum";


const OPP_COLORS: Record<string, string> = {
  breakout: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  reversal: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  momentum: "bg-warning/20 text-warning border-warning/40",
};

const TREND_COLORS: Record<string, string> = {
  HAUSSIER: "text-profit",
  BAISSIER: "text-loss",
  NEUTRE: "text-muted-foreground",
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
  const [autoScan, setAutoScan] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        // Quota exceeded — refresh limit display
        const q = await analysisAPI.getScanLimit().catch(() => null);
        if (q) setQuota(q);
      }
      console.error("Error scanning:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan management
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!autoScan) return;
    runScan();
    intervalRef.current = setInterval(runScan, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, selectedMarket, minScore, oppFilter]);

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

  const getScoreStyle = (score: number) =>
    score >= 80
      ? "bg-profit/20 border-profit text-profit"
      : score >= 65
      ? "bg-green-400/20 border-green-400 text-green-400"
      : score >= 50
      ? "bg-warning/20 border-warning text-warning"
      : "bg-loss/20 border-loss text-loss";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-primary" />
            {t("scanner_title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("scanner_subtitle")}
            {totalScanned > 0 && (
              <span className="ml-2 text-primary font-medium">{totalScanned} {t("scanner_scanned")}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
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
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={runScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t("scanner_btn")}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setAutoScan(!autoScan)}
            className={cn(
              "px-5 py-2 rounded-xl font-bold flex items-center gap-2 text-sm transition-all",
              autoScan
                ? "bg-loss text-white shadow-[0_0_24px_rgba(239,68,68,0.3)]"
                : "bg-profit text-white shadow-[0_0_24px_rgba(16,185,129,0.3)]"
            )}
          >
            {autoScan ? <><Pause className="w-4 h-4" /> {t("scanner_stop")}</> : <><Play className="w-4 h-4" /> {t("scanner_auto")}</>}
          </motion.button>
        </div>
      </div>

      {/* Quota banner */}
      {quota && !quota.is_premium && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "glass-card px-4 py-3 flex items-center justify-between gap-4 border",
            quota.remaining === 0
              ? "border-loss/40 bg-loss/5"
              : quota.remaining === 1
              ? "border-warning/40 bg-warning/5"
              : "border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
            {quota.remaining === 0 ? (
              <Lock className="w-5 h-5 text-loss shrink-0" />
            ) : (
              <ScanLine className="w-5 h-5 text-primary shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {quota.remaining === 0
                  ? t("scanner_limit_reached")
                  : `${quota.remaining} ${t("scanner_remaining")}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {quota.scans_today} / {quota.daily_limit} {t("scanner_quota_info")}
              </p>
            </div>
          </div>

          {/* Dots gauge */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: quota.daily_limit }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    i < quota.scans_today ? "bg-primary/40" : "bg-primary"
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => router.push("/premium")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5" />
              {t("scanner_unlimited")}
            </button>
          </div>
        </motion.div>
      )}

      {/* Quota exhausted overlay — disable scan buttons */}
      {quota && !quota.is_premium && quota.remaining === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center border border-loss/30"
        >
          <Lock className="w-12 h-12 mx-auto mb-4 text-loss/60" />
          <p className="text-lg font-semibold mb-1">{t("scanner_limit_free")}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t("scanner_premium_pitch")}
          </p>
          <button
            onClick={() => router.push("/premium")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 transition-opacity"
          >
            <Crown className="w-4 h-4" />
            {t("scanner_go_premium")}
          </button>
        </motion.div>
      )}

      {/* Filters — hidden when quota exhausted */}
      {(!quota || quota.is_premium || quota.remaining > 0) && <div className="glass-card p-4 space-y-3">
        {/* Market selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap gap-2">
            {markets.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMarket(m.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedMarket === m.key ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10"
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunity type */}
        <div className="flex items-center gap-2 flex-wrap">
          <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(OPP_LABELS) as OppFilter[]).map((k) => (
              <button
                key={k}
                onClick={() => setOppFilter(k)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                  oppFilter === k
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                )}
              >
                {OPP_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        {/* Score + search */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("scanner_min_score")}</span>
            <input
              type="range" min="0" max="100" value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-28"
            />
            <span className="text-sm font-bold w-8">{minScore}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("search") + "…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>}

      {/* Scanning animation + results — only shown when quota ok */}
      {(!quota || quota.is_premium || quota.remaining > 0) && <>

      {/* Scanning animation */}
      {isScanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 text-center">
          <div className="relative w-16 h-16 mx-auto mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary/20 rounded-full border-t-primary"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="font-semibold">{t("loading")}</p>
          <p className="text-sm text-muted-foreground">RSI · MACD · EMA · Volume · Momentum</p>
        </motion.div>
      )}

      {/* Sort bar + results */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Rocket className="w-4 h-4 text-warning" />
            {t("scanner_title")}
            <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
          </h2>

          {/* Sort controls */}
          {results.length > 0 && (
            <div className="flex gap-1 text-xs text-muted-foreground">
              {([
                { k: "score" as SortKey, label: "Score" },
                { k: "change" as SortKey, label: t("scanner_1d") },
                { k: "change_1w" as SortKey, label: t("scanner_1w") },
                { k: "rsi" as SortKey, label: "RSI" },
                { k: "volume_ratio" as SortKey, label: "Vol" },
              ]).map(({ k, label }) => (
                <button
                  key={k}
                  onClick={() => handleSort(k)}
                  className={cn(
                    "px-2 py-1 rounded transition-all",
                    sortKey === k ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                  )}
                >
                  {label}<SortIcon k={k} />
                </button>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <ScanLine className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">
                {results.length === 0 ? t("scanner_empty") : t("scanner_no_results")}
              </p>
              {results.length === 0 && (
                <p className="text-sm mt-1 opacity-70">
                  {t("scanner_multi_prefix")} {selectedMarket} ({totalScanned || "?"} {t("asset")})
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r, i) => (
                <motion.div
                  key={r.symbol}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => router.push(`/analysis?symbol=${r.symbol}`)}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-3">

                    {/* Score badge */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold border-2 shrink-0",
                      getScoreStyle(r.score)
                    )}>
                      <span className="text-base leading-tight">{r.score}</span>
                      <span className="text-[9px] leading-tight opacity-70">/100</span>
                    </div>

                    {/* Symbol + tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base">{r.symbol}</span>
                        {r.name && r.name !== r.symbol && (
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{r.name}</span>
                        )}

                        {/* Trend pill */}
                        <span className={cn("text-xs font-semibold", TREND_COLORS[r.trend])}>
                          {r.trend === "HAUSSIER" ? "↑" : r.trend === "BAISSIER" ? "↓" : "→"} {r.trend}
                        </span>

                        {/* Opportunity pill */}
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                          OPP_COLORS[r.opp_type] ?? OPP_COLORS.momentum
                        )}>
                          {r.opportunity}
                        </span>
                      </div>

                      {/* Indicators row */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className={cn(
                          "font-medium",
                          r.rsi < 35 ? "text-profit" : r.rsi > 68 ? "text-loss" : ""
                        )}>
                          RSI {r.rsi}
                        </span>
                        <span className={cn(
                          r.macd_signal === "HAUSSIER" ? "text-profit" : "text-loss"
                        )}>
                          MACD {r.macd_signal === "HAUSSIER" ? "↑" : "↓"}
                        </span>
                        <span className={cn(
                          r.volume_ratio >= 1.8 ? "text-warning font-medium" : ""
                        )}>
                          <Volume2 className="w-3 h-3 inline mr-0.5" />
                          {r.volume_ratio.toFixed(1)}x
                        </span>
                        {r.near_breakout && (
                          <span className="text-blue-400 font-medium">
                            {r.pct_from_high >= 0 ? "52w High ✓" : `${r.pct_from_high}% ${t("scanner_from_52w")}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & perf */}
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatPrice(r.price, r.symbol)}</p>
                      <div className="flex items-center justify-end gap-2 text-xs mt-0.5">
                        <span className={cn("flex items-center gap-0.5", r.change >= 0 ? "text-profit" : "text-loss")}>
                          {r.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatPercent(r.change)}
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className={cn("text-[11px]", r.change_1w >= 0 ? "text-profit/80" : "text-loss/80")}>
                          {t("scanner_1w")} {r.change_1w >= 0 ? "+" : ""}{r.change_1w.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); router.push(`/analysis?symbol=${r.symbol}`); }}
                      >
                        <BarChart2 className="w-3 h-3" /> {t("scanner_analyze")}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary text-xs py-1.5 px-2.5 flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); router.push(`/trading?symbol=${r.symbol}`); }}
                      >
                        <ChevronRight className="w-3 h-3" /> {t("trader")}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      </>}
    </motion.div>
  );
}
