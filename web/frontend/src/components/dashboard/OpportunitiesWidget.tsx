"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────────────────────────────────────

type Opportunity = {
  symbol: string;
  name: string;
  score: number;
  direction: "LONG" | "SHORT";
  change: string;
  entry: number;
  risk: number;
};

const ALL_OPPORTUNITIES: Opportunity[] = [
  { symbol: "BTC/USD",  name: "Bitcoin",     score: 82, direction: "LONG",  change: "+2.4%", entry: 68420,  risk: 1.2 },
  { symbol: "ETH/USD",  name: "Ethereum",    score: 74, direction: "LONG",  change: "+1.8%", entry: 3640,   risk: 1.5 },
  { symbol: "AAPL",     name: "Apple",       score: 71, direction: "LONG",  change: "+0.9%", entry: 182.40, risk: 1.0 },
  { symbol: "GOLD",     name: "Or",          score: 68, direction: "LONG",  change: "+0.6%", entry: 2318,   risk: 0.9 },
  { symbol: "EUR/USD",  name: "Euro/Dollar", score: 65, direction: "LONG",  change: "+0.3%", entry: 1.0842, risk: 0.7 },
  { symbol: "NVDA",     name: "Nvidia",      score: 79, direction: "LONG",  change: "+3.1%", entry: 874.50, risk: 1.8 },
  { symbol: "OIL/USD",  name: "Pétrole",     score: 43, direction: "SHORT", change: "-1.2%", entry: 78.30,  risk: 1.1 },
  { symbol: "SPX500",   name: "S&P 500",     score: 38, direction: "SHORT", change: "-0.3%", entry: 5248,   risk: 0.8 },
  { symbol: "BNB/USD",  name: "BNB",         score: 77, direction: "LONG",  change: "+2.0%", entry: 412.60, risk: 1.4 },
  { symbol: "MSFT",     name: "Microsoft",   score: 69, direction: "LONG",  change: "+1.1%", entry: 420.80, risk: 0.9 },
];

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

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function OpportunitiesWidget() {
  const [seed, setSeed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  const opportunities = getTop5(seed);

  useEffect(() => {
    const now = new Date();
    setLastUpdate(
      `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    );
  }, [seed]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        setSeed((s) => s + 1);
        setRefreshing(false);
      }, 400);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSeed((s) => s + 1);
      setRefreshing(false);
    }, 400);
  };

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
          className="space-y-2"
        >
          {opportunities.map((opp, i) => (
            <div
              key={opp.symbol}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors"
            >
              {/* Rank */}
              <span className="text-xs text-muted-foreground w-4 text-center font-mono">{i + 1}</span>

              {/* Symbol + direction */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">{opp.symbol}</span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
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

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <span className={cn("font-bold text-sm", scoreColor(opp.score))}>
                  {opp.score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Données simulées · Mise à jour automatique toutes les 15s
      </p>
    </div>
  );
}
