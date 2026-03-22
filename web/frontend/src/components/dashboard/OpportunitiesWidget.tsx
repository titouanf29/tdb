"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, RefreshCw, Zap,
  ChevronDown, ChevronUp, ExternalLink, BarChart2,
  Clock, Loader2, AlertCircle, Target, Crown, Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { analysisAPI, Analysis } from "@/lib/api";
import { usePremium } from "@/lib/PremiumContext";
import { isMarketOpen } from "@/lib/marketStatus";

// ─────────────────────────────────────────────────────────────────────────────
//  TYPES & DATA
// ─────────────────────────────────────────────────────────────────────────────

type Opportunity = {
  symbol: string;
  name: string;
  score: number;
  direction: "LONG" | "SHORT";
  change: string;
  entry: number;
  risk: number;
  factors: { label: string; score: number }[];
  reasons: string[];
  market: string;
};

// Market mapping for each opportunity
const OPPORTUNITY_MARKETS: Record<string, string> = {
  "BTC/USD": "CRYPTO",
  "ETH/USD": "CRYPTO",
  "BNB/USD": "CRYPTO",
  "AAPL": "USA",
  "NVDA": "USA",
  "MSFT": "USA",
  "SPX500": "USA",
  "GOLD": "COMMODITIES",
  "OIL/USD": "COMMODITIES",
  "EUR/USD": "FOREX",
};

const ALL_OPPORTUNITIES: Opportunity[] = [
  {
    symbol: "BTC/USD", name: "Bitcoin", score: 82, direction: "LONG", change: "+2.4%", entry: 68420, risk: 1.2, market: "CRYPTO",
    factors: [
      { label: "Technique", score: 85 }, { label: "Volume", score: 78 },
      { label: "Momentum", score: 80 }, { label: "Contexte", score: 72 },
      { label: "Sentiment", score: 68 }, { label: "Volatilité", score: 75 },
    ],
    reasons: ["SMA200 haussière — contexte macro favorable", "RSI 61 : pas en surachat, marge de progression", "Volume en hausse sur les 3 dernières bougies"],
  },
  {
    symbol: "ETH/USD", name: "Ethereum", score: 74, direction: "LONG", change: "+1.8%", entry: 3640, risk: 1.5, market: "CRYPTO",
    factors: [
      { label: "Technique", score: 72 }, { label: "Volume", score: 80 },
      { label: "Momentum", score: 65 }, { label: "Contexte", score: 70 },
      { label: "Sentiment", score: 75 }, { label: "Volatilité", score: 60 },
    ],
    reasons: ["Au-dessus de la SMA200, structure de tendance intacte", "Volume spot en forte hausse (+32%)", "Corrélation BTC positive : momentum sectoriel favorable"],
  },
  {
    symbol: "AAPL", name: "Apple", score: 71, direction: "LONG", change: "+0.9%", entry: 182.40, risk: 1.0, market: "USA",
    factors: [
      { label: "Technique", score: 74 }, { label: "Volume", score: 65 },
      { label: "Momentum", score: 70 }, { label: "Contexte", score: 78 },
      { label: "Sentiment", score: 68 }, { label: "Volatilité", score: 55 },
    ],
    reasons: ["Rebond sur zone support clé à 180$", "Fondamentaux solides : P/E raisonnable, cash-flow fort", "Secteur tech en reprise sur le S&P500"],
  },
  {
    symbol: "GOLD", name: "Or", score: 68, direction: "LONG", change: "+0.6%", entry: 2318, risk: 0.9, market: "COMMODITIES",
    factors: [
      { label: "Technique", score: 65 }, { label: "Volume", score: 55 },
      { label: "Momentum", score: 58 }, { label: "Contexte", score: 70 },
      { label: "Sentiment", score: 52 }, { label: "Volatilité", score: 65 },
    ],
    reasons: ["Tendance haussière long terme préservée", "Refuge : incertitude macro + USD en légère baisse", "Zone support 2280-2300$ testée et tenue"],
  },
  {
    symbol: "EUR/USD", name: "Euro/Dollar", score: 65, direction: "LONG", change: "+0.3%", entry: 1.0842, risk: 0.7, market: "FOREX",
    factors: [
      { label: "Technique", score: 68 }, { label: "Volume", score: 60 },
      { label: "Momentum", score: 63 }, { label: "Contexte", score: 62 },
      { label: "Sentiment", score: 65 }, { label: "Volatilité", score: 58 },
    ],
    reasons: ["Rebond sur support 1.0800, niveau pivot hebdo", "BCE moins hawkish → différentiel de taux favorable", "RSI sortie de zone de survente"],
  },
  {
    symbol: "NVDA", name: "Nvidia", score: 79, direction: "LONG", change: "+3.1%", entry: 874.50, risk: 1.8, market: "USA",
    factors: [
      { label: "Technique", score: 82 }, { label: "Volume", score: 85 },
      { label: "Momentum", score: 78 }, { label: "Contexte", score: 76 },
      { label: "Sentiment", score: 80 }, { label: "Volatilité", score: 70 },
    ],
    reasons: ["Breakout au-dessus résistance 850$ avec volume fort", "Catalyseur IA : demande GPU en accélération", "Sentiment positif après résultats trimestriels"],
  },
  {
    symbol: "OIL/USD", name: "Pétrole", score: 43, direction: "SHORT", change: "-1.2%", entry: 78.30, risk: 1.1, market: "COMMODITIES",
    factors: [
      { label: "Technique", score: 40 }, { label: "Volume", score: 48 },
      { label: "Momentum", score: 38 }, { label: "Contexte", score: 45 },
      { label: "Sentiment", score: 42 }, { label: "Volatilité", score: 50 },
    ],
    reasons: ["Cassure sous support 80$, momentum baissier", "Stocks pétrole en hausse aux US (EIA)", "Dollar fort : pression sur les matières premières"],
  },
  {
    symbol: "SPX500", name: "S&P 500", score: 38, direction: "SHORT", change: "-0.3%", entry: 5248, risk: 0.8, market: "USA",
    factors: [
      { label: "Technique", score: 35 }, { label: "Volume", score: 45 },
      { label: "Momentum", score: 30 }, { label: "Contexte", score: 40 },
      { label: "Sentiment", score: 38 }, { label: "Volatilité", score: 42 },
    ],
    reasons: ["RSI en surachat (74), divergence baissière visible", "Résistance majeure 5300 pts non franchie", "VIX en hausse : nervosité du marché croissante"],
  },
  {
    symbol: "BNB/USD", name: "BNB", score: 77, direction: "LONG", change: "+2.0%", entry: 412.60, risk: 1.4, market: "CRYPTO",
    factors: [
      { label: "Technique", score: 80 }, { label: "Volume", score: 75 },
      { label: "Momentum", score: 76 }, { label: "Contexte", score: 78 },
      { label: "Sentiment", score: 72 }, { label: "Volatilité", score: 68 },
    ],
    reasons: ["Structure haussière claire au-dessus SMA50 et SMA200", "Volumes d'échange Binance en hausse de 18%", "Corrélation BTC haussière, setup propre"],
  },
  {
    symbol: "MSFT", name: "Microsoft", score: 69, direction: "LONG", change: "+1.1%", entry: 420.80, risk: 0.9, market: "USA",
    factors: [
      { label: "Technique", score: 72 }, { label: "Volume", score: 65 },
      { label: "Momentum", score: 68 }, { label: "Contexte", score: 75 },
      { label: "Sentiment", score: 66 }, { label: "Volatilité", score: 52 },
    ],
    reasons: ["Azure + Copilot : croissance cloud +28% YoY", "Rebond propre sur EMA20 journalier", "Recommandation analyste : Buy consensus fort"],
  },
];

// Refresh options — fast options are premium only
const ALL_REFRESH_OPTIONS = [
  { label: "15s", value: 15000, premiumOnly: true },
  { label: "30s", value: 30000, premiumOnly: true },
  { label: "1min", value: 60000, premiumOnly: true },
  { label: "5min", value: 300000, premiumOnly: true },
  { label: "1h", value: 3600000, premiumOnly: false },
  { label: "Off", value: 0, premiumOnly: false },
];

const STORAGE_KEY_REFRESH = "tdb_opp_refresh";

function getTop5(seed: number): Opportunity[] {
  // Only show opportunities where the market is open
  const open = ALL_OPPORTUNITIES.filter((opp) => {
    const market = OPPORTUNITY_MARKETS[opp.symbol];
    return !market || isMarketOpen(market);
  });

  // Fallback to all if nothing is open (should not happen in practice)
  const pool = open.length > 0 ? open : ALL_OPPORTUNITIES;

  const offset = seed % Math.max(1, pool.length);
  const shifted = [...pool.slice(offset), ...pool.slice(0, offset)];
  return shifted.sort((a, b) => b.score - a.score).slice(0, 5);
}

function scoreColor(score: number) {
  if (score >= 75) return "text-profit";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-primary";
  return "text-loss";
}
function scoreBarColor(score: number) {
  if (score >= 75) return "bg-profit";
  if (score >= 60) return "bg-yellow-400";
  if (score >= 40) return "bg-primary";
  return "bg-loss";
}
function factorBarColor(score: number) {
  if (score >= 75) return "bg-profit/80";
  if (score >= 60) return "bg-yellow-400/80";
  if (score >= 40) return "bg-primary/80";
  return "bg-loss/80";
}

const MARKET_LABELS: Record<string, string> = {
  CRYPTO: "Crypto", USA: "US", EUROPE: "Europe",
  FOREX: "Forex", COMMODITIES: "Matières", ASIA: "Asie",
};

// ─────────────────────────────────────────────────────────────────────────────
//  ANALYSIS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const handleAnalyze = async () => {
    setStarted(true);
    setLoading(true);
    setError(null);
    try {
      const result = await analysisAPI.analyze(symbol);
      setData(result);
    } catch {
      setError("Analyse indisponible pour cet actif.");
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <button
        onClick={handleAnalyze}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
      >
        <BarChart2 className="w-3.5 h-3.5" />
        Analyser
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Analyse en cours...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-loss">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-3 rounded-lg bg-white/3 border border-white/10 space-y-2"
    >
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Analyse IA — {symbol}</span>
        <span className={cn("ml-auto text-xs font-bold", scoreColor(data.score.total))}>
          Score {data.score.total}/100
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-muted-foreground">Entrée</p>
          <p className="font-semibold">{data.price?.current?.toLocaleString("fr-FR") ?? "—"}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-muted-foreground">Stop Loss</p>
          <p className="font-semibold text-loss">{data.risk.suggested_sl.toLocaleString("fr-FR")}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-muted-foreground">Take Profit</p>
          <p className="font-semibold text-profit">{data.risk.suggested_tp.toLocaleString("fr-FR")}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-muted-foreground">RSI</p>
          <p className="font-semibold">{data.indicators.rsi.value.toFixed(1)}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-muted-foreground">Tendance</p>
          <p className={cn("font-semibold", data.trend === "HAUSSIER" ? "text-profit" : data.trend === "BAISSIER" ? "text-loss" : "text-muted-foreground")}>
            {data.trend}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-muted-foreground">R/R</p>
          <p className="font-semibold text-primary">1:{data.risk.risk_reward.toFixed(1)}</p>
        </div>
      </div>
      {data.signal?.text && (
        <p className="text-[11px] text-muted-foreground border-t border-white/10 pt-2">
          {data.signal.emoji} {data.signal.text}
        </p>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPANDED ROW
// ─────────────────────────────────────────────────────────────────────────────

function ExpandedRow({ opp }: { opp: Opportunity }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="px-3 pb-3 pt-1 space-y-3">
        {/* Pourquoi c'est une opportunité */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Pourquoi c&apos;est une opportunité
          </p>
          <ul className="space-y-1">
            {opp.reasons.map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-1.5 text-xs text-foreground/80"
              >
                <span className="text-profit mt-0.5 flex-shrink-0">›</span>
                {r}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Facteurs de score */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Détail des facteurs
          </p>
          <div className="space-y-1.5">
            {opp.factors.map((f, fi) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: fi * 0.05 }}
                className="flex items-center gap-2"
              >
                <span className="text-[11px] text-muted-foreground w-20 flex-shrink-0">{f.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", factorBarColor(f.score))}
                    initial={{ width: 0 }}
                    animate={{ width: `${f.score}%` }}
                    transition={{ duration: 0.5, delay: fi * 0.05 }}
                  />
                </div>
                <span className={cn("text-[11px] font-mono w-6 text-right", scoreColor(f.score))}>
                  {f.score}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <AnalysisPanel symbol={opp.symbol} />
          <Link
            href={`/scanner?symbol=${opp.symbol}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Voir sur le scanner
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN WIDGET
// ─────────────────────────────────────────────────────────────────────────────

export function OpportunitiesWidget() {
  const { isPremium } = usePremium();
  const [seed, setSeed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_REFRESH);
      if (stored) return Number(stored);
    }
    return 3600000; // default 1h
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset interval to 1h if user is not premium and has a fast interval stored
  useEffect(() => {
    if (!isPremium && refreshInterval > 0 && refreshInterval < 3600000) {
      const newVal = 3600000;
      setRefreshInterval(newVal);
      localStorage.setItem(STORAGE_KEY_REFRESH, String(newVal));
    }
  }, [isPremium, refreshInterval]);

  const opportunities = getTop5(seed);

  // Count open markets for info display
  const openMarketsCount = Array.from(new Set(ALL_OPPORTUNITIES.map(o => OPPORTUNITY_MARKETS[o.symbol]))).filter(m => m && isMarketOpen(m)).length;

  useEffect(() => {
    const now = new Date();
    setLastUpdate(
      `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    );
  }, [seed]);

  // Auto-refresh avec fréquence configurable
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (refreshInterval === 0) return;
    timerRef.current = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        setSeed((s) => s + 1);
        setRefreshing(false);
      }, 400);
    }, refreshInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshInterval]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSeed((s) => s + 1);
      setRefreshing(false);
    }, 400);
  };

  const handleSetFreq = (value: number, premiumOnly: boolean) => {
    if (premiumOnly && !isPremium) return;
    setRefreshInterval(value);
    localStorage.setItem(STORAGE_KEY_REFRESH, String(value));
    setShowFreqPicker(false);
  };

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  };

  const currentLabel = ALL_REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label ?? "1h";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            className="p-2 rounded-lg bg-primary/10"
          >
            <Zap className="w-4 h-4 text-primary" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-sm">Opportunités en temps réel</h3>
            <p className="text-xs text-muted-foreground">Top 5 actifs · Score IA sur 30+ paramètres</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">MAJ {lastUpdate}</span>
          )}

          {/* Fréquence de refresh */}
          <div className="relative">
            <button
              onClick={() => setShowFreqPicker((v) => !v)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors",
                showFreqPicker
                  ? "bg-primary/20 text-primary"
                  : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
              )}
              title="Fréquence de rafraîchissement"
            >
              <Clock className="w-3.5 h-3.5" />
              {currentLabel}
            </button>
            <AnimatePresence>
              {showFreqPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-20 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
                >
                  {ALL_REFRESH_OPTIONS.map((opt) => {
                    const locked = opt.premiumOnly && !isPremium;
                    const isActive = refreshInterval === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleSetFreq(opt.value, opt.premiumOnly)}
                        disabled={locked}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors",
                          locked
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : isActive
                            ? "text-primary font-semibold bg-primary/10"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {locked ? (
                          <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <span className="w-3 text-center">{opt.value === 0 ? "⏸" : "↻"}</span>
                        )}
                        <span>{opt.label}</span>
                        {locked && (
                          <span className="ml-auto text-[9px] text-yellow-500 font-medium bg-yellow-500/10 px-1 py-0.5 rounded">
                            Premium
                          </span>
                        )}
                        {isActive && !locked && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                  {!isPremium && (
                    <div className="px-3 py-2 border-t border-white/10">
                      <Link
                        href="/premium"
                        className="flex items-center gap-1.5 text-[10px] text-yellow-500 hover:text-yellow-400 transition-colors"
                        onClick={() => setShowFreqPicker(false)}
                      >
                        <Crown className="w-3 h-3" />
                        Débloquer les refresh rapides
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Refresh manuel */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Rafraîchir"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Market open indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 mb-3 text-[11px] text-muted-foreground"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse inline-block" />
        <span>
          {openMarketsCount} marché{openMarketsCount > 1 ? "s" : ""} ouvert{openMarketsCount > 1 ? "s" : ""} · Actifs filtrés en temps réel
        </span>
      </motion.div>

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={seed}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          {opportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun marché ouvert actuellement</p>
              <p className="text-xs mt-1">Les opportunités s&apos;afficheront à l&apos;ouverture des marchés</p>
            </div>
          ) : (
            opportunities.map((opp, i) => {
              const isExpanded = expandedSymbol === opp.symbol;
              const marketLabel = MARKET_LABELS[OPPORTUNITY_MARKETS[opp.symbol]] ?? opp.market;
              return (
                <motion.div
                  key={opp.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className={cn(
                    "rounded-xl border transition-all",
                    isExpanded
                      ? "border-white/15 bg-white/5"
                      : "border-transparent bg-white/3 hover:bg-white/5"
                  )}
                >
                  {/* Row principale (cliquable) */}
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left"
                    onClick={() => toggleExpand(opp.symbol)}
                  >
                    {/* Rank */}
                    <span className="text-xs text-muted-foreground w-4 text-center font-mono flex-shrink-0">
                      {i + 1}
                    </span>

                    {/* Symbol + direction */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{opp.symbol}</span>
                        {/* Market tag */}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground flex-shrink-0">
                          {marketLabel}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                            opp.direction === "LONG"
                              ? "bg-profit/10 text-profit"
                              : "bg-loss/10 text-loss"
                          )}
                        >
                          {opp.direction === "LONG"
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />
                          }
                          {opp.direction}
                        </span>
                        <span
                          className={cn(
                            "text-xs ml-auto",
                            opp.change.startsWith("+") ? "text-profit" : "text-loss"
                          )}
                        >
                          {opp.change}
                        </span>
                      </div>
                      {/* Score bar */}
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", scoreBarColor(opp.score))}
                          initial={{ width: 0 }}
                          animate={{ width: `${opp.score}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                        />
                      </div>
                    </div>

                    {/* Score + chevron */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="text-right">
                        <motion.span
                          key={opp.score}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className={cn("font-bold text-sm", scoreColor(opp.score))}
                        >
                          {opp.score}
                        </motion.span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </div>
                  </button>

                  {/* Panel expandable */}
                  <AnimatePresence>
                    {isExpanded && <ExpandedRow opp={opp} />}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Données simulées · {refreshInterval === 0 ? "Refresh auto désactivé" : `Mise à jour toutes les ${currentLabel}`}
        {!isPremium && refreshInterval === 3600000 && (
          <> · <Link href="/premium" className="text-yellow-500 hover:underline">Refresh rapide ↗</Link></>
        )}
      </p>
    </motion.div>
  );
}
