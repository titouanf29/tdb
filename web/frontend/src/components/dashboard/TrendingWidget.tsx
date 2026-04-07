"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, RefreshCw, ChevronDown, ChevronUp, ArrowUpRight,
  Loader2, AlertCircle, Flame, CheckCircle2, XCircle, BarChart2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toolsAPI, TendanceAsset } from "@/lib/api";
import { getAssetLogo, getAssetInfo } from "@/lib/assetInfo";
import { useLanguage } from "@/lib/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function confidenceColor(c: number) {
  if (c >= 80) return "text-profit";
  if (c >= 60) return "text-yellow-400";
  return "text-muted-foreground";
}

function confidenceBarColor(c: number) {
  if (c >= 80) return "bg-profit";
  if (c >= 60) return "bg-yellow-400";
  return "bg-primary";
}

function confidenceLabel(c: number, lang: string) {
  if (lang === "en") {
    if (c === 100) return "Very strong";
    if (c >= 80)   return "Strong";
    if (c >= 60)   return "Moderate";
    return "Weak";
  }
  if (c === 100) return "Très fort";
  if (c >= 80)   return "Fort";
  if (c >= 60)   return "Modéré";
  return "Faible";
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  if (price >= 100)   return price.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (price >= 1)     return price.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
  return price.toLocaleString("fr-FR", { maximumFractionDigits: 5 });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ASSET LOGO
// ─────────────────────────────────────────────────────────────────────────────

function AssetLogo({ symbol, name }: { symbol: string; name: string }) {
  const logoUrl = getAssetLogo(symbol);
  const initials = symbol.replace(/-USD$/, "").replace(/\..+/, "").slice(0, 2);

  if (logoUrl) {
    return (
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        <img
          src={logoUrl}
          alt={name}
          className="w-5 h-5 object-contain"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            t.parentElement!.innerHTML = `<span class="text-[10px] font-bold">${initials}</span>`;
          }}
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-muted-foreground">{initials}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPANDED PANEL
// ─────────────────────────────────────────────────────────────────────────────

function ExpandedPanel({ asset }: { asset: TendanceAsset }) {
  const { lang } = useLanguage();
  const bullishCount = asset.signals.filter(s => s.bullish).length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mx-3 mb-3 rounded-xl bg-white/3 border border-white/8 overflow-hidden">
        {/* Explication haussière */}
        <div className="p-3 border-b border-white/8">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {lang === "fr" ? "Pourquoi c'est haussier" : "Why it's bullish"}
          </p>
          <ul className="space-y-1.5">
            {asset.reasons.map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-2 text-xs text-foreground/85"
              >
                <span className="text-profit font-bold mt-0.5 flex-shrink-0">›</span>
                {r}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Signaux techniques */}
        <div className="p-3 border-b border-white/8">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {lang === "fr" ? `Signaux (${bullishCount}/${asset.signals.length} confirmés)` : `Signals (${bullishCount}/${asset.signals.length} confirmed)`}
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {asset.signals.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium",
                  s.bullish
                    ? "bg-profit/10 text-profit border border-profit/20"
                    : "bg-white/5 text-muted-foreground border border-white/8"
                )}
              >
                {s.bullish
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                }
                {s.label}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Métriques + CTA */}
        <div className="p-3 flex items-center gap-3">
          {/* Mini métriques */}
          <div className="flex gap-3 text-xs flex-1">
            <div>
              <p className="text-muted-foreground">RSI</p>
              <p className={cn(
                "font-semibold",
                asset.rsi < 40 ? "text-profit" : asset.rsi > 70 ? "text-loss" : "text-foreground"
              )}>
                {asset.rsi}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Volume</p>
              <p className={cn("font-semibold", asset.vol_ratio > 1.3 ? "text-profit" : "text-foreground")}>
                x{asset.vol_ratio}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{lang === "fr" ? "7 jours" : "7 days"}</p>
              <p className={cn("font-semibold", asset.change_1w >= 0 ? "text-profit" : "text-loss")}>
                {asset.change_1w >= 0 ? "+" : ""}{asset.change_1w}%
              </p>
            </div>
          </div>

          {/* CTA principal vers l'analyse */}
          <Link
            href={`/analysis?symbol=${asset.symbol}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            {lang === "fr" ? "Voir l'analyse" : "View analysis"}
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ASSET ROW
// ─────────────────────────────────────────────────────────────────────────────

function AssetRow({ asset, rank, isExpanded, onToggle }: {
  asset: TendanceAsset;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { lang } = useLanguage();
  const info = getAssetInfo(asset.symbol);
  const displayName = asset.name || (info.name !== asset.symbol ? info.name : asset.symbol);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05, duration: 0.28 }}
      className={cn(
        "rounded-xl border transition-all",
        isExpanded
          ? "border-white/15 bg-white/5"
          : "border-transparent bg-white/3 hover:bg-white/[0.06]"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5">
        {/* Rank */}
        <span className="text-xs text-muted-foreground w-4 text-center font-mono flex-shrink-0">
          {rank}
        </span>

        {/* Logo */}
        <AssetLogo symbol={asset.symbol} name={displayName} />

        {/* Symbol + name — link to analysis */}
        <Link
          href={`/analysis?symbol=${asset.symbol}`}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 group"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {asset.symbol.replace(/-USD$/, "").replace(/\..+/, "")}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground flex-shrink-0">
              {asset.market}
            </span>
            {asset.macd_cross && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-profit/15 text-profit flex-shrink-0 font-medium">
                ↗ MACD
              </span>
            )}
            <ArrowUpRight className="w-3 h-3 text-muted-foreground/0 group-hover:text-primary/60 transition-colors flex-shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{displayName}</p>
        </Link>

        {/* Price + change */}
        <div className="text-right flex-shrink-0 mr-1">
          <p className="text-sm font-semibold">{formatPrice(asset.price)}</p>
          <p className={cn(
            "text-[11px] font-medium",
            asset.change >= 0 ? "text-profit" : "text-loss"
          )}>
            {asset.change >= 0 ? "+" : ""}{asset.change}%
          </p>
        </div>

        {/* Confidence + expand toggle */}
        <button
          onClick={onToggle}
          className="flex flex-col items-end gap-0.5 flex-shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-1">
            <motion.span
              key={asset.confidence}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className={cn("font-bold text-sm leading-none", confidenceColor(asset.confidence))}
            >
              {asset.confidence}%
            </motion.span>
            {isExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </div>
          <span className={cn("text-[9px]", confidenceColor(asset.confidence))}>
            {confidenceLabel(asset.confidence, lang)}
          </span>
        </button>
      </div>

      {/* Confidence bar */}
      <div className="mx-3 mb-2.5 h-1 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", confidenceBarColor(asset.confidence))}
          initial={{ width: 0 }}
          animate={{ width: `${asset.confidence}%` }}
          transition={{ duration: 0.7, delay: rank * 0.06, ease: "easeOut" }}
        />
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && <ExpandedPanel asset={asset} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN WIDGET
// ─────────────────────────────────────────────────────────────────────────────

export function TrendingWidget() {
  const { t, lang } = useLanguage();
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
        setUpdatedAt(
          `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
        );
      }
    } catch {
      setError(lang === "fr" ? "Impossible de charger les tendances." : "Unable to load trends.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 3600000);
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
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 6 }}
            className="p-2 rounded-lg bg-profit/10"
          >
            <Flame className="w-4 h-4 text-profit" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-sm">{lang === "fr" ? "Top Tendances Haussières" : "Top Bullish Trends"}</h3>
            <p className="text-xs text-muted-foreground">
              {lang === "fr" ? "Top 10 cross-marché · Cliquez sur un actif pour l'analyser" : "Top 10 cross-market · Click an asset to analyze it"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-xs text-muted-foreground">{lang === "fr" ? `MAJ ${updatedAt}` : `Updated ${updatedAt}`}</span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            title={t("markets_refresh")}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">{lang === "fr" ? `Analyse de 33 actifs en cours…` : `Analyzing 33 assets…`}</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <AlertCircle className="w-4 h-4 text-loss" />
          <span className="text-sm text-muted-foreground">{error}</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-25" />
          <p className="text-sm">{lang === "fr" ? "Aucune tendance forte détectée" : "No strong trends detected"}</p>
          <p className="text-xs mt-1 opacity-60">{lang === "fr" ? "Réessayez dans quelques instants" : "Try again in a moment"}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {assets.map((asset, i) => (
            <AssetRow
              key={asset.symbol}
              asset={asset}
              rank={i + 1}
              isExpanded={expandedSymbol === asset.symbol}
              onToggle={() => toggleExpand(asset.symbol)}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center mt-4 opacity-70">
        EMA · MACD · RSI · Volume · Momentum — {lang === "fr" ? "actualisé toutes les heures" : "updated every hour"}
      </p>
    </motion.div>
  );
}
