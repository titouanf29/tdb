"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, RefreshCw, Zap,
  ChevronDown, ChevronUp, ExternalLink, BarChart2,
  Clock, Loader2, AlertCircle, Target,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { analysisAPI, Analysis } from "@/lib/api";

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
};

const ALL_OPPORTUNITIES: Opportunity[] = [
  {
    symbol: "BTC/USD", name: "Bitcoin", score: 82, direction: "LONG", change: "+2.4%", entry: 68420, risk: 1.2,
    factors: [
      { label: "Technique", score: 85 }, { label: "Volume", score: 78 },
      { label: "Momentum", score: 80 }, { label: "Contexte", score: 72 },
      { label: "Sentiment", score: 68 }, { label: "Volatilité", score: 75 },
    ],
    reasons: ["SMA200 haussière — contexte macro favorable", "RSI 61 : pas en surachat, marge de progression", "Volume en hausse sur les 3 dernières bougies"],
  },
  {
    symbol: "ETH/USD", name: "Ethereum", score: 74, direction: "LONG", change: "+1.8%", entry: 3640, risk: 1.5,
    factors: [
      { label: "Technique", score: 72 }, { label: "Volume", score: 80 },
      { label: "Momentum", score: 65 }, { label: "Contexte", score: 70 },
      { label: "Sentiment", score: 75 }, { label: "Volatilité", score: 60 },
    ],
    reasons: ["Au-dessus de la SMA200, structure de tendance intacte", "Volume spot en forte hausse (+32%)", "Corrélation BTC positive : momentum sectoriel favorable"],
  },
  {
    symbol: "AAPL", name: "Apple", score: 71, direction: "LONG", change: "+0.9%", entry: 182.40, risk: 1.0,
    factors: [
      { label: "Technique", score: 74 }, { label: "Volume", score: 65 },
      { label: "Momentum", score: 70 }, { label: "Contexte", score: 78 },
      { label: "Sentiment", score: 68 }, { label: "Volatilité", score: 55 },
    ],
    reasons: ["Rebond sur zone support clé à 180$", "Fondamentaux solides : P/E raisonnable, cash-flow fort", "Secteur tech en reprise sur le S&P500"],
  },
  {
    symbol: "GOLD", name: "Or", score: 68, direction: "LONG", change: "+0.6%", entry: 2318, risk: 0.9,
    factors: [
      { label: "Technique", score: 65 }, { label: "Volume", score: 55 },
      { label: "Momentum", score: 58 }, { label: "Contexte", score: 70 },
      { label: "Sentiment", score: 52 }, { label: "Volatilité", score: 65 },
    ],
    reasons: ["Tendance haussière long terme préservée", "Refuge : incertitude macro + USD en légère baisse", "Zone support 2280-2300$ testée et tenue"],
  },
  {
    symbol: "EUR/USD", name: "Euro/Dollar", score: 65, direction: "LONG", change: "+0.3%", entry: 1.0842, risk: 0.7,
    factors: [
      { label: "Technique", score: 68 }, { label: "Volume", score: 60 },
      { label: "Momentum", score: 63 }, { label: "Contexte", score: 62 },
      { label: "Sentiment", score: 65 }, { label: "Volatilité", score: 58 },
    ],
    reasons: ["Rebond sur support 1.0800, niveau pivot hebdo", "BCE moins hawkish → différentiel de taux favorable", "RSI sortie de zone de survente"],
  },
  {
    symbol: "NVDA", name: "Nvidia", score: 79, direction: "LONG", change: "+3.1%", entry: 874.50, risk: 1.8,
    factors: [
      { label: "Technique", score: 82 }, { label: "Volume", score: 85 },
      { label: "Momentum", score: 78 }, { label: "Contexte", score: 76 },
      { label: "Sentiment", score: 80 }, { label: "Volatilité", score: 70 },
    ],
    reasons: ["Breakout au-dessus résistance 850$ avec volume fort", "Catalyseur IA : demande GPU en accélération", "Sentiment positif après résultats trimestriels"],
  },
  {
    symbol: "OIL/USD", name: "Pétrole", score: 43, direction: "SHORT", change: "-1.2%", entry: 78.30, risk: 1.1,
    factors: [
      { label: "Technique", score: 40 }, { label: "Volume", score: 48 },
      { label: "Momentum", score: 38 }, { label: "Contexte", score: 45 },
      { label: "Sentiment", score: 42 }, { label: "Volatilité", score: 50 },
    ],
    reasons: ["Cassure sous support 80$, momentum baissier", "Stocks pétrole en hausse aux US (EIA)", "Dollar fort : pression sur les matières premières"],
  },
  {
    symbol: "SPX500", name: "S&P 500", score: 38, direction: "SHORT", change: "-0.3%", entry: 5248, risk: 0.8,
    factors: [
      { label: "Technique", score: 35 }, { label: "Volume", score: 45 },
      { label: "Momentum", score: 30 }, { label: "Contexte", score: 40 },
      { label: "Sentiment", score: 38 }, { label: "Volatilité", score: 42 },
    ],
    reasons: ["RSI en surachat (74), divergence baissière visible", "Résistance majeure 5300 pts non franchie", "VIX en hausse : nervosité du marché croissante"],
  },
  {
    symbol: "BNB/USD", name: "BNB", score: 77, direction: "LONG", change: "+2.0%", entry: 412.60, risk: 1.4,
    factors: [
      { label: "Technique", score: 80 }, { label: "Volume", score: 75 },
      { label: "Momentum", score: 76 }, { label: "Contexte", score: 78 },
      { label: "Sentiment", score: 72 }, { label: "Volatilité", score: 68 },
    ],
    reasons: ["Structure haussière claire au-dessus SMA50 et SMA200", "Volumes d'échange Binance en hausse de 18%", "Corrélation BTC haussière, setup propre"],
  },
  {
    symbol: "MSFT", name: "Microsoft", score: 69, direction: "LONG", change: "+1.1%", entry: 420.80, risk: 0.9,
    factors: [
      { label: "Technique", score: 72 }, { label: "Volume", score: 65 },
      { label: "Momentum", score: 68 }, { label: "Contexte", score: 75 },
      { label: "Sentiment", score: 66 }, { label: "Volatilité", score: 52 },
    ],
    reasons: ["Azure + Copilot : croissance cloud +28% YoY", "Rebond propre sur EMA20 journalier", "Recommandation analyste : Buy consensus fort"],
  },
];

const REFRESH_OPTIONS = [
  { label: "15s", value: 15000 },
  { label: "30s", value: 30000 },
  { label: "1min", value: 60000 },
  { label: "5min", value: 300000 },
  { label: "Off", value: 0 },
];

const STORAGE_KEY_REFRESH = "tdb_opp_refresh";

function getTop5(seed: number): Opportunity[] {
  const shifted = [...ALL_OPPORTUNITIES.slice(seed % 3), ...ALL_OPPORTUNITIES.slice(0, seed % 3)];
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
    <div className="mt-2 p-3 rounded-lg bg-white/3 border border-white/10 space-y-2">
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
    </div>
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
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                <span className="text-profit mt-0.5 flex-shrink-0">›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Facteurs de score */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Détail des facteurs
          </p>
          <div className="space-y-1.5">
            {opp.factors.map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-20 flex-shrink-0">{f.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", factorBarColor(f.score))}
                    initial={{ width: 0 }}
                    animate={{ width: `${f.score}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className={cn("text-[11px] font-mono w-6 text-right", scoreColor(f.score))}>
                  {f.score}
                </span>
              </div>
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
    return 15000;
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const opportunities = getTop5(seed);

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

  const handleSetFreq = (value: number) => {
    setRefreshInterval(value);
    localStorage.setItem(STORAGE_KEY_REFRESH, String(value));
    setShowFreqPicker(false);
  };

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  };

  const currentLabel = REFRESH_OPTIONS.find((o) => o.value === refreshInterval)?.label ?? "15s";

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-4 h-4 text-primary" />
          </div>
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
                  className="absolute right-0 top-full mt-1 z-20 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[100px]"
                >
                  {REFRESH_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleSetFreq(opt.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors",
                        refreshInterval === opt.value ? "text-primary font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {opt.value === 0 ? "⏸" : "↻"} {opt.label}
                    </button>
                  ))}
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

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={seed}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          {opportunities.map((opp, i) => {
            const isExpanded = expandedSymbol === opp.symbol;
            return (
              <div
                key={opp.symbol}
                className={cn(
                  "rounded-xl border transition-colors",
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
                      <span className={cn("font-bold text-sm", scoreColor(opp.score))}>
                        {opp.score}
                      </span>
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
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Données simulées · {refreshInterval === 0 ? "Refresh auto désactivé" : `Mise à jour toutes les ${currentLabel}`}
      </p>
    </div>
  );
}
