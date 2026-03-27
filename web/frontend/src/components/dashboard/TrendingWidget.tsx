"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, RefreshCw, ChevronDown, ChevronUp,
  ExternalLink, Loader2, AlertCircle, Flame, CheckCircle2, XCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toolsAPI, TendanceAsset } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function confidenceColor(c: number) {
  if (c >= 100) return "text-profit";
  if (c >= 80)  return "text-profit";
  if (c >= 60)  return "text-yellow-400";
  return "text-muted-foreground";
}

function confidenceBarColor(c: number) {
  if (c >= 80) return "bg-profit";
  if (c >= 60) return "bg-yellow-400";
  return "bg-primary";
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  if (price >= 100)   return price.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (price >= 1)     return price.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
  return price.toLocaleString("fr-FR", { maximumFractionDigits: 5 });
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPANDED PANEL
// ─────────────────────────────────────────────────────────────────────────────

function ExpandedPanel({ asset }: { asset: TendanceAsset }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="px-3 pb-3 pt-1 space-y-3">
        {/* Pourquoi haussier */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Pourquoi c&apos;est haussier
          </p>
          <ul className="space-y-1">
            {asset.reasons.map((r, i) => (
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

        {/* Signaux */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Signaux techniques ({asset.signals.filter(s => s.bullish).length}/{asset.signals.length} haussiers)
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {asset.signals.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs",
                  s.bullish
                    ? "bg-profit/10 text-profit"
                    : "bg-white/5 text-muted-foreground"
                )}
              >
                {s.bullish
                  ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  : <XCircle className="w-3 h-3 flex-shrink-0" />
                }
                <span className="font-medium">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Métriques rapides */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white/5 text-center">
            <p className="text-muted-foreground">RSI</p>
            <p className={cn("font-semibold", asset.rsi < 40 ? "text-profit" : asset.rsi > 70 ? "text-loss" : "text-foreground")}>
              {asset.rsi}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 text-center">
            <p className="text-muted-foreground">Volume</p>
            <p className={cn("font-semibold", asset.vol_ratio > 1.3 ? "text-profit" : "text-foreground")}>
              x{asset.vol_ratio}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 text-center">
            <p className="text-muted-foreground">7 jours</p>
            <p className={cn("font-semibold", asset.change_1w >= 0 ? "text-profit" : "text-loss")}>
              {asset.change_1w >= 0 ? "+" : ""}{asset.change_1w}%
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <Link
            href={`/analysis?symbol=${asset.symbol}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Analyse complète
          </Link>
          <Link
            href={`/scanner?symbol=${asset.symbol}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Scanner
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN WIDGET
// ─────────────────────────────────────────────────────────────────────────────

export function TrendingWidget() {
  const [assets, setAssets] = useState<TendanceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await toolsAPI.getTopTendances();
      setAssets(data.assets);
      if (data.updated_at) {
        const d = new Date(data.updated_at);
        setUpdatedAt(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
      }
    } catch {
      setError("Impossible de charger les tendances.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 3600000); // refresh every hour
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol(prev => prev === symbol ? null : symbol);
  };

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
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
            className="p-2 rounded-lg bg-profit/10"
          >
            <Flame className="w-4 h-4 text-profit" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-sm">Top Tendances Haussières</h3>
            <p className="text-xs text-muted-foreground">Top 10 cross-marché · Indice de confiance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-xs text-muted-foreground">MAJ {updatedAt}</span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Analyse en cours…</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-loss" />
          <span className="text-sm">{error}</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune tendance forte détectée</p>
        </div>
      ) : (
        <div className="space-y-1">
          {assets.map((asset, i) => {
            const isExpanded = expandedSymbol === asset.symbol;
            return (
              <motion.div
                key={asset.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className={cn(
                  "rounded-xl border transition-all",
                  isExpanded
                    ? "border-white/15 bg-white/5"
                    : "border-transparent bg-white/3 hover:bg-white/5"
                )}
              >
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => toggleExpand(asset.symbol)}
                >
                  {/* Rank */}
                  <span className="text-xs text-muted-foreground w-4 text-center font-mono flex-shrink-0">
                    {i + 1}
                  </span>

                  {/* Symbol + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{asset.symbol}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground flex-shrink-0">
                        {asset.market}
                      </span>
                      {asset.macd_cross && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-profit/15 text-profit flex-shrink-0">
                          Croisement
                        </span>
                      )}
                      <span className={cn(
                        "text-xs ml-auto flex-shrink-0",
                        asset.change >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {asset.change >= 0 ? "+" : ""}{asset.change}%
                      </span>
                    </div>
                    {/* Confidence bar */}
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", confidenceBarColor(asset.confidence))}
                        initial={{ width: 0 }}
                        animate={{ width: `${asset.confidence}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06 }}
                      />
                    </div>
                  </div>

                  {/* Confidence % + chevron */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="text-right">
                      <motion.span
                        key={asset.confidence}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className={cn("font-bold text-sm", confidenceColor(asset.confidence))}
                      >
                        {asset.confidence}%
                      </motion.span>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && <ExpandedPanel asset={asset} />}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Basé sur EMA · MACD · RSI · Volume · Momentum — Mis à jour automatiquement
      </p>
    </motion.div>
  );
}
