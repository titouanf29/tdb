"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Lock, Crown, RefreshCw,
  Eye, Activity, Radio, ChevronRight, Flame,
  BarChart2, AlertCircle, Bot, Sparkles, Loader2,
} from "lucide-react";
import Link from "next/link";
import { marketAPI, aiAPI } from "@/lib/api";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { isMarketOpen } from "@/lib/marketStatus";
import { usePremium } from "@/lib/PremiumContext";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import { MARKET_SYMBOLS } from "@/lib/marketSymbols";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

interface SessionCfg {
  id: string;
  name: string;
  fullNameKey: string;
  subtitle: string;
  flag: string;
  marketKey: string;
  closeTimeLabelKey: string;
  gradient: string;
  glowColor: string;
  border: string;
  accent: string;
  accentBg: string;
  tabActiveBg: string;
  symbols: string[];
}

const SESSIONS: SessionCfg[] = [
  {
    id: "europe",
    name: "Europe",
    fullNameKey: "session_european",
    subtitle: "CAC40 · DAX · FTSE · Eurostoxx",
    flag: "🇪🇺",
    marketKey: "EUROPE",
    closeTimeLabelKey: "session_close_europe",
    gradient: "from-blue-600/30 via-indigo-500/15 to-transparent",
    glowColor: "bg-blue-500",
    border: "border-blue-500/25",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/15",
    tabActiveBg: "bg-blue-500/10",
    symbols: MARKET_SYMBOLS.EUROPE,
  },
  {
    id: "us",
    name: "US",
    fullNameKey: "session_american",
    subtitle: "S&P 500 · Nasdaq · Dow Jones",
    flag: "🇺🇸",
    marketKey: "USA",
    closeTimeLabelKey: "session_close_us",
    gradient: "from-emerald-600/30 via-teal-500/15 to-transparent",
    glowColor: "bg-emerald-500",
    border: "border-emerald-500/25",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/15",
    tabActiveBg: "bg-emerald-500/10",
    symbols: MARKET_SYMBOLS.USA,
  },
  {
    id: "asia",
    name: "Asia",
    fullNameKey: "session_asian",
    subtitle: "Nikkei · Hang Seng · KOSPI",
    flag: "🌏",
    marketKey: "ASIA",
    closeTimeLabelKey: "session_close_asia",
    gradient: "from-orange-600/30 via-red-500/15 to-transparent",
    glowColor: "bg-orange-500",
    border: "border-orange-500/25",
    accent: "text-orange-400",
    accentBg: "bg-orange-500/15",
    tabActiveBg: "bg-orange-500/10",
    symbols: MARKET_SYMBOLS.ASIA,
  },
  {
    id: "crypto",
    name: "Crypto",
    fullNameKey: "session_crypto_market",
    subtitle: "Bitcoin · Ethereum · Altcoins",
    flag: "🟡",
    marketKey: "CRYPTO",
    closeTimeLabelKey: "session_open_24h",
    gradient: "from-yellow-500/30 via-amber-500/15 to-transparent",
    glowColor: "bg-yellow-500",
    border: "border-yellow-500/25",
    accent: "text-yellow-400",
    accentBg: "bg-yellow-500/15",
    tabActiveBg: "bg-yellow-500/10",
    symbols: MARKET_SYMBOLS.CRYPTO,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AssetPerf {
  symbol: string;
  name: string;
  logo?: string;
  price: number;
  change: number;
  volume: number;
}

type WatchTag = "rebond" | "momentum" | "consolidation" | "vigilance";

interface WatchItem {
  asset: AssetPerf;
  tag: WatchTag;
  reason: string;
  emoji: string;
}

interface SessionResult {
  session: SessionCfg;
  performers: AssetPerf[];
  topN: AssetPerf[];
  flopN: AssetPerf[];
  avgChange: number;
  mood: "bullish" | "bearish" | "neutral";
  moodScore: number;
  positiveRatio: number;
  watchlist: WatchItem[];
  isLive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type WatchReasonFn = (name: string, change: number, lang: string) => string;
const WATCH_REASONS: Record<WatchTag, WatchReasonFn> = {
  rebond: (n, c, lang) => lang === "en"
    ? `${n} dropped ${Math.abs(c).toFixed(1)}% today. Watch technical support zones for a potential bounce at open.`
    : `${n} a chuté de ${Math.abs(c).toFixed(1)}% aujourd'hui. Les zones de support technique seront à surveiller pour un rebond potentiel à l'ouverture.`,
  momentum: (n, c, lang) => lang === "en"
    ? `${n} is up +${c.toFixed(1)}% with strong volume. Bullish momentum may continue. Watch key resistance levels.`
    : `${n} affiche un gain de +${c.toFixed(1)}% avec un fort volume. La dynamique haussière pourrait se prolonger. Surveiller les résistances clés.`,
  consolidation: (n, c, lang) => lang === "en"
    ? `${n} closed nearly flat (${c > 0 ? "+" : ""}${c.toFixed(2)}%). Consolidation underway — next direction will be key.`
    : `${n} clôture quasi stable (${c > 0 ? "+" : ""}${c.toFixed(2)}%). Une consolidation en cours — la prochaine direction sera déterminante.`,
  vigilance: (n, c, lang) => lang === "en"
    ? `Notable move on ${n} (${c > 0 ? "+" : ""}${c.toFixed(1)}%). Stay alert to fundamental developments and order flow.`
    : `Mouvement notable sur ${n} (${c > 0 ? "+" : ""}${c.toFixed(1)}%). Rester vigilant sur l'évolution des fondamentaux et du flux d'ordres.`,
};

function getWatchTag(change: number): WatchTag {
  if (change <= -3) return "rebond";
  if (change >= 3) return "momentum";
  if (Math.abs(change) < 0.8) return "consolidation";
  return "vigilance";
}

function getWatchEmoji(tag: WatchTag): string {
  return { rebond: "📈", momentum: "🚀", consolidation: "⏳", vigilance: "⚠️" }[tag];
}

function buildWatchlist(performers: AssetPerf[], lang: string): WatchItem[] {
  if (performers.length === 0) return [];
  const sorted = [...performers].sort((a, b) => b.change - a.change);
  const items: WatchItem[] = [];

  // Bounce play — biggest loser
  const bounce = [...sorted].reverse().find(p => p.change < -1);
  if (bounce) {
    const tag = "rebond";
    items.push({ asset: bounce, tag, reason: WATCH_REASONS[tag](bounce.name, bounce.change, lang), emoji: getWatchEmoji(tag) });
  }

  // Momentum play — biggest gainer
  const top = sorted.find(p => p.change > 1.5);
  if (top) {
    const tag = "momentum";
    items.push({ asset: top, tag, reason: WATCH_REASONS[tag](top.name, top.change, lang), emoji: getWatchEmoji(tag) });
  }

  // Fill with remaining interesting assets
  for (const p of sorted) {
    if (items.length >= 4) break;
    if (items.some(i => i.asset.symbol === p.symbol)) continue;
    const tag = getWatchTag(p.change);
    items.push({ asset: p, tag, reason: WATCH_REASONS[tag](p.name, p.change, lang), emoji: getWatchEmoji(tag) });
  }

  return items.slice(0, 4);
}

function computeSession(
  session: SessionCfg,
  priceData: Record<string, { price: number; change: number; volume: number }>,
  lang: string,
): SessionResult {
  const performers: AssetPerf[] = [];

  for (const sym of session.symbols) {
    const d = priceData[sym];
    if (!d || !d.price) continue;
    const info = getAssetInfo(sym);
    performers.push({
      symbol: sym,
      name: info.name || sym.replace("^", ""),
      logo: getAssetLogo(sym),
      price: d.price,
      change: d.change ?? 0,
      volume: d.volume ?? 0,
    });
  }

  performers.sort((a, b) => b.change - a.change);

  const topN = performers.slice(0, 5);
  const flopN = [...performers].reverse().slice(0, 5).filter(p => p.change < 0);
  const changes = performers.map(p => p.change);
  const avgChange = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
  const positive = performers.filter(p => p.change > 0).length;
  const positiveRatio = performers.length > 0 ? positive / performers.length : 0.5;
  const moodScore = positiveRatio * 200 - 100; // -100 to +100

  return {
    session,
    performers,
    topN,
    flopN,
    avgChange,
    mood: moodScore > 20 ? "bullish" : moodScore < -20 ? "bearish" : "neutral",
    moodScore,
    positiveRatio,
    watchlist: buildWatchlist(performers, lang),
    isLive: isMarketOpen(session.marketKey),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SVG: MOOD GAUGE
// ─────────────────────────────────────────────────────────────────────────────

function MoodGauge({ score, mood, t }: { score: number; mood: SessionResult["mood"]; t: (k: any) => string }) {
  const cx = 56; const cy = 52; const r = 36;
  // Needle: 0° = left (bearish), 180° = right (bullish), mapped to score -100..+100
  const angleDeg = 180 + (score / 100) * 90; // 90° to 270° range
  const angleRad = (angleDeg * Math.PI) / 180;
  const nx = cx + r * Math.cos(angleRad);
  const ny = cy + r * Math.sin(angleRad);

  const color = mood === "bullish" ? "#34d399" : mood === "bearish" ? "#f87171" : "#fbbf24";

  return (
    <svg viewBox="0 0 112 72" className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`gaugeGrad-${mood}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <filter id="needleGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Background arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" strokeLinecap="round" />
      {/* Colored arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={`url(#gaugeGrad-${mood})`} strokeWidth="9" strokeLinecap="round" opacity="0.55" />
      {/* Tick marks */}
      {[-90, -45, 0, 45, 90].map((deg) => {
        const rad = ((180 + deg) * Math.PI) / 180;
        const x1 = cx + (r - 6) * Math.cos(rad); const y1 = cy + (r - 6) * Math.sin(rad);
        const x2 = cx + r * Math.cos(rad); const y2 = cy + r * Math.sin(rad);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />;
      })}
      {/* Needle shadow */}
      <motion.line x1={cx} y1={cy} x2={cx - r + 2} y2={cy + 2}
        stroke="rgba(0,0,0,0.3)" strokeWidth="3" strokeLinecap="round"
        initial={{ x2: cx - r + 2, y2: cy + 2 }}
        animate={{ x2: nx + 1, y2: ny + 2 }}
        transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
      />
      {/* Needle */}
      <motion.line x1={cx} y1={cy} x2={cx - r + 2} y2={cy}
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        filter="url(#needleGlow)"
        initial={{ x2: cx - r + 2, y2: cy }}
        animate={{ x2: nx, y2: ny }}
        transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
      />
      {/* Center hub */}
      <circle cx={cx} cy={cy} r="5" fill={color} />
      <circle cx={cx} cy={cy} r="2.5" fill="rgba(0,0,0,0.4)" />
      {/* Labels */}
      <text x={cx - r - 2} y={cy + 18} textAnchor="middle" fill="#f87171" fontSize="7.5" fontWeight="600">BEAR</text>
      <text x={cx + r + 2} y={cy + 18} textAnchor="middle" fill="#34d399" fontSize="7.5" fontWeight="600">BULL</text>
      {/* Mood label */}
      <text x={cx} y={cy + 20} textAnchor="middle" fill={color} fontSize="8" fontWeight="800">
        {mood === "bullish" ? t("session_mood_haussier") : mood === "bearish" ? t("session_mood_baissier") : t("session_mood_neutre")}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SVG: MINI SPARKLINE
// ─────────────────────────────────────────────────────────────────────────────

function MiniSparkline({ change, index }: { change: number; index: number }) {
  // Deterministic "random" points based on index + change direction
  const seed = index * 7 + 3;
  const base = [28, 26 + (seed % 4), 30 - (seed % 3), 27 + (seed % 5), 29];
  const tail = change > 0
    ? [32 + (seed % 3), 34, 33 + (seed % 2), 36 + (seed % 4), 38 + Math.abs(change)]
    : [26 - (seed % 2), 24, 25 - (seed % 3), 22 - (seed % 2), 20 - Math.abs(change) * 0.5];
  const pts = [...base, ...tail];

  const w = 52; const h = 22;
  const minP = Math.min(...pts); const maxP = Math.max(...pts);
  const range = maxP - minP || 1;
  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((p - minP) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const color = change >= 0 ? "#34d399" : "#f87171";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-13 h-5.5" style={{ width: 52, height: 22 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polygon
        points={`0,${h} ${coords} ${w},${h}`}
        fill={`url(#spark-fill-${index})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
      />
      <motion.polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 + index * 0.06 }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PERFORMER ROW
// ─────────────────────────────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"];

function PerformerRow({
  asset, rank, maxChange, dir, isPremium,
}: {
  asset: AssetPerf; rank: number; maxChange: number; dir: "top" | "flop"; isPremium: boolean;
}) {
  const isUp = asset.change >= 0;
  const color = isUp ? "text-emerald-400" : "text-rose-400";
  const barColor = isUp ? "bg-emerald-400" : "bg-rose-400";
  const barW = `${Math.min((Math.abs(asset.change) / (maxChange || 1)) * 100, 100)}%`;
  const shortName = asset.name.length > 14 ? asset.symbol.replace("^", "") : asset.name;

  return (
    <motion.div
      className="flex items-center gap-2.5 py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
      initial={{ opacity: 0, x: dir === "top" ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + rank * 0.06 }}
      whileHover={{ x: dir === "top" ? 3 : -3 }}
    >
      {/* Medal / rank */}
      <div className="w-6 flex-shrink-0 text-center">
        {rank <= 3 ? (
          <motion.span
            className="text-sm inline-block"
            animate={rank === 1 ? { scale: [1, 1.18, 1] } : undefined}
            transition={rank === 1 ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
            style={rank === 1 ? { filter: "drop-shadow(0 0 4px rgba(250,204,21,0.6))" } : undefined}
          >
            {MEDALS[rank - 1]}
          </motion.span>
        ) : (
          <span className="text-[11px] text-white/25 font-mono">{rank}</span>
        )}
      </div>

      {/* Logo */}
      <div className="w-7 h-7 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {asset.logo ? (
          <img src={asset.logo} alt={asset.name} className="w-5 h-5 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <span className="text-[9px] font-bold text-white/40">{asset.symbol.slice(0, 3).replace("^", "")}</span>
        )}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-semibold text-white/90 truncate">{shortName}</span>
          <AnimatedNumber
            value={asset.change}
            duration={700}
            formatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
            className={cn("text-xs font-bold font-mono flex-shrink-0", color)}
          />
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", barColor)}
            initial={{ width: 0 }}
            animate={{ width: barW }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 + rank * 0.04 }}
          />
        </div>
      </div>

      {/* Sparkline — premium only */}
      {isPremium && <MiniSparkline change={asset.change} index={rank} />}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PODIUM (premium) — top 3 visual
// ─────────────────────────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: AssetPerf[] }) {
  if (top3.length < 3) return null;
  const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd
  const heights = [64, 88, 52];
  const medals = ["🥈", "🥇", "🥉"];
  const bgColors = ["bg-white/10", "bg-yellow-500/20", "bg-orange-500/10"];
  const borderColors = ["border-white/15", "border-yellow-500/30", "border-orange-400/20"];

  return (
    <div className="flex items-end justify-center gap-2 mt-2 mb-1">
      {order.map((asset, i) => (
        <motion.div
          key={asset.symbol}
          className="flex flex-col items-center gap-1.5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <span className="text-lg">{medals[i]}</span>
          <div className="w-8 h-8 rounded-xl bg-white/8 overflow-hidden border border-white/10 flex items-center justify-center">
            {asset.logo
              ? <img src={asset.logo} alt={asset.name} className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <span className="text-[9px] font-bold text-white/40">{asset.symbol.slice(0, 3).replace("^", "")}</span>
            }
          </div>
          <span className="text-[10px] font-bold text-white/80 max-w-[54px] text-center truncate leading-tight">
            {asset.name.length > 8 ? asset.symbol.replace("^", "") : asset.name}
          </span>
          <span className="text-[10px] font-bold font-mono text-emerald-400">+{asset.change.toFixed(2)}%</span>
          <motion.div
            className={cn("w-14 rounded-t-xl border", bgColors[i], borderColors[i])}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: "easeOut" }}
            style={{ height: heights[i], originY: 1 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WATCHLIST CARD
// ─────────────────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<WatchTag, { labelKey: string; color: string; bg: string; border: string }> = {
  rebond:       { labelKey: "session_tag_rebond",        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  momentum:     { labelKey: "session_tag_momentum",      color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25"    },
  consolidation:{ labelKey: "session_tag_consolidation", color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/25"  },
  vigilance:    { labelKey: "session_tag_vigilance",     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25"  },
};

function WatchlistCard({ item, index }: { item: WatchItem; index: number }) {
  const { t } = useLanguage();
  const ts = TAG_STYLES[item.tag];
  const isUp = item.asset.change >= 0;

  return (
    <motion.div
      className="p-3.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/15 transition-colors hover:bg-white/[0.07] group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      whileHover={{ y: -3 }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-xl bg-white/7 border border-white/8 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.asset.logo
            ? <img src={item.asset.logo} alt={item.asset.name} className="w-7 h-7 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <span className="text-[10px] font-bold text-white/40">{item.asset.symbol.slice(0, 3).replace("^", "")}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-xs font-bold text-white">{item.asset.name.length > 14 ? item.asset.symbol.replace("^", "") : item.asset.name}</span>
            <span className={cn("text-[11px] font-bold font-mono", isUp ? "text-emerald-400" : "text-rose-400")}>
              {isUp ? "+" : ""}{item.asset.change.toFixed(2)}%
            </span>
          </div>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", ts.bg, ts.border, ts.color)}>
            <span>{item.emoji}</span>
            {t(ts.labelKey as any)}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0 mt-1" />
      </div>
      {/* Reason */}
      <p className="text-[11px] text-white/50 leading-relaxed">{item.reason}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PREMIUM LOCK OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function PremiumLock() {
  const { t } = useLanguage();
  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 blur-md pointer-events-none select-none opacity-50" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/8">
            <div className="flex items-start gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="w-20 h-2.5 bg-white/20 rounded" />
                <div className="w-12 h-2 bg-white/10 rounded" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-white/10 rounded" />
              <div className="w-5/6 h-1.5 bg-white/10 rounded" />
              <div className="w-3/4 h-1.5 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"
        >
          <Lock className="w-5.5 h-5.5 text-yellow-400" style={{ width: 22, height: 22 }} />
        </motion.div>
        <div className="text-center">
          <p className="text-sm font-bold text-white">{t("session_premium_feature")}</p>
          <p className="text-xs text-white/50 mt-0.5">{t("session_unlock_signals")}</p>
        </div>
        <Link href="/premium"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-primary text-black text-xs font-bold hover:opacity-90 transition-opacity shadow-lg"
        >
          <Crown className="w-3.5 h-3.5" />
          {t("session_go_premium")}
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION: Analyse IA de séance (Premium)
// ─────────────────────────────────────────────────────────────────────────────

function SessionNarrativeSection({ result, isPremium }: { result: SessionResult; isPremium: boolean }) {
  const { t } = useLanguage();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const generate = async () => {
    if (loading || !isPremium) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.getSessionNarrative({
        session_name: t(result.session.fullNameKey as any),
        session_id: result.session.id,
        mood: result.mood,
        avg_change: result.avgChange,
        positive_ratio: result.positiveRatio,
        top_performers: result.topN.slice(0, 5).map(p => ({ symbol: p.symbol, name: p.name, change: p.change })),
        flop_performers: result.flopN.slice(0, 5).map(p => ({ symbol: p.symbol, name: p.name, change: p.change })),
        is_live: result.isLive,
      });
      setNarrative(res.narrative);
      setGeneratedAt(res.generated_at);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("session_gen_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-white/8">
      <div className="px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{t("session_ai_title")}</h4>
            <p className="text-[11px] text-white/35">{t("session_ai_desc")}</p>
          </div>
        </div>
        {!isPremium && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold">
            <Crown className="w-2.5 h-2.5" />
            PREMIUM
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        {!isPremium ? (
          /* Free user — blurred lock */
          <div className="relative">
            <div className="p-4 rounded-xl bg-white/5 border border-white/8 blur-sm pointer-events-none select-none opacity-50" aria-hidden>
              <p className="text-sm text-white/70 leading-relaxed">
                La séance européenne s&apos;est clôturée en territoire positif, portée par de solides performances dans le secteur technologique et énergétique. LVMH a signé la meilleure performance grâce à des résultats trimestriels supérieurs aux attentes...
              </p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"
              >
                <Lock className="w-4.5 h-4.5 text-yellow-400" style={{ width: 18, height: 18 }} />
              </motion.div>
              <p className="text-xs font-bold text-white text-center">{t("session_unlock_narrative")}</p>
              <Link href="/premium"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-primary text-black text-xs font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                <Crown className="w-3 h-3" />
                {t("session_go_premium")}
              </Link>
            </div>
          </div>
        ) : narrative ? (
          /* Generated narrative */
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-primary/8 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">{t("session_ai_label")}</span>
              {generatedAt && (
                <span className="text-[10px] text-white/30 ml-auto">
                  {new Date(generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{narrative}</p>
            <button
              onClick={generate}
              disabled={loading}
              className="mt-3 text-[11px] text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              {t("session_regenerate")}
            </button>
          </motion.div>
        ) : (
          /* CTA to generate */
          <div className="flex flex-col items-center gap-3 py-4">
            {error && (
              <p className="text-xs text-rose-400 text-center">{error}</p>
            )}
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/15 border border-primary/25 hover:bg-primary/25 text-primary text-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{t("session_generating")}</>
              ) : (
                <><Sparkles className="w-4 h-4" />{t("session_generate_btn")}</>
              )}
            </button>
            <p className="text-[11px] text-white/25 text-center">
              {t("session_ai_will_analyze")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION PANEL
// ─────────────────────────────────────────────────────────────────────────────

function SessionPanel({ result, isPremium }: { result: SessionResult; isPremium: boolean }) {
  const { t, lang } = useLanguage();
  const { session, topN, flopN, avgChange, mood, moodScore, positiveRatio, watchlist, isLive } = result;
  const maxChange = Math.max(...result.performers.map(p => Math.abs(p.change)), 0.1);

  const freeTopN = isPremium ? topN : topN.slice(0, 3);
  const freeFlopN = isPremium ? flopN : flopN.slice(0, 3);

  const moodBg = { bullish: "from-emerald-500/10", bearish: "from-rose-500/10", neutral: "from-yellow-500/10" };
  const moodColor = { bullish: "text-emerald-400", bearish: "text-rose-400", neutral: "text-yellow-400" };
  const moodBorder = { bullish: "border-emerald-500/20", bearish: "border-rose-500/20", neutral: "border-yellow-500/20" };
  const moodLabel = {
    bullish: t("session_mood_bullish"),
    bearish: t("session_mood_bearish"),
    neutral: t("session_mood_neutral"),
  };

  const now = new Date();
  const locale = lang === "en" ? "en-US" : "fr-FR";
  const dateLabel = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      {/* ── Session header ── */}
      <div className={cn("relative px-5 py-4 bg-gradient-to-r overflow-hidden", session.gradient)}>
        <motion.div
          className={cn("absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl", session.glowColor)}
          animate={{ opacity: [0.16, 0.28, 0.16], scale: [1, 1.12, 1], x: [0, -12, 0], y: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-3xl">{session.flag}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base leading-tight">{t(session.fullNameKey as any)}</h3>
                    {/* Live indicator */}
                    {isLive ? (
                      <motion.span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold"
                        animate={{ opacity: [1, 0.6, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Radio className="w-2.5 h-2.5" />
                        {t("session_live")}
                      </motion.span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px]">
                        {t(session.closeTimeLabelKey as any)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 capitalize">{dateLabel} · {session.subtitle}</p>
                </div>
              </div>

              {/* Mood badge */}
              <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold",
                `bg-gradient-to-r ${moodBg[mood]} to-transparent`, moodBorder[mood], moodColor[mood])}>
                {mood === "bullish" ? <TrendingUp className="w-3 h-3" />
                  : mood === "bearish" ? <TrendingDown className="w-3 h-3" />
                  : <Activity className="w-3 h-3" />}
                {moodLabel[mood]}
                <span className="opacity-60 text-[10px]">
                  ({avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}% moy.)
                </span>
              </div>
            </div>

            {/* Gauge — premium only */}
            {isPremium ? (
              <div className="w-28 flex-shrink-0">
                <MoodGauge score={moodScore} mood={mood} t={t} />
              </div>
            ) : (
              /* Free: simple stat pill */
              <div className="flex-shrink-0 text-right">
                <AnimatedNumber
                  value={avgChange}
                  duration={1000}
                  formatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
                  className={cn("block text-2xl font-black", avgChange >= 0 ? "text-emerald-400" : "text-rose-400")}
                />
                <div className="text-[11px] text-white/40">{t("session_avg_change")}</div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  {Math.round(positiveRatio * 100)}% {t("session_pct_up")}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar: ratio bull/bear */}
          <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-yellow-400 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${positiveRatio * 100}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
            <span>{Math.round((1 - positiveRatio) * 100)}% {t("session_pct_down")}</span>
            <span>{Math.round(positiveRatio * 100)}% {t("session_pct_up")}</span>
          </div>
        </div>
      </div>

      {/* ── Podium (premium) ── */}
      {isPremium && topN.length >= 3 && (
        <div className="border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">{t("session_podium")}</span>
          </div>
          <Podium top3={topN.slice(0, 3)} />
        </div>
      )}

      {/* ── Top / Flop ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {/* Top performers */}
        <div className="p-4 border-b sm:border-b-0 sm:border-r border-white/8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Top Performers</span>
              {/* "Top Performers" is standard international term, kept as-is */}
            </div>
            {!isPremium && topN.length > 3 && (
              <span className="text-[10px] text-white/25">+{topN.length - 3} {t("session_with_premium")}</span>
            )}
          </div>
          <div className="space-y-1.5">
            {freeTopN.length > 0 ? freeTopN.map((asset, i) => (
              <PerformerRow key={asset.symbol} asset={asset} rank={i + 1} maxChange={maxChange} dir="top" isPremium={isPremium} />
            )) : (
              <p className="text-xs text-white/30 py-2">{t("session_no_data")}</p>
            )}
          </div>
        </div>

        {/* Flop performers */}
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{t("session_flop")}</span>
            </div>
            {!isPremium && flopN.length > 3 && (
              <span className="text-[10px] text-white/25">+{flopN.length - 3} {t("session_with_premium")}</span>
            )}
          </div>
          <div className="space-y-1.5">
            {freeFlopN.length > 0 ? freeFlopN.map((asset, i) => (
              <PerformerRow key={asset.symbol} asset={asset} rank={i + 1} maxChange={maxChange} dir="flop" isPremium={isPremium} />
            )) : (
              <p className="text-xs text-white/30 py-2">{t("session_no_flop")}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── À surveiller demain ── */}
      <div className="border-t border-white/8">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{t("session_tomorrow_watch")}</h4>
              <p className="text-[11px] text-white/35">{t("session_signals_found")}</p>
            </div>
          </div>
          {!isPremium && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold">
              <Crown className="w-2.5 h-2.5" />
              PREMIUM
            </span>
          )}
        </div>

        <div className="px-4 pb-4">
          {isPremium ? (
            watchlist.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {watchlist.map((item, i) => <WatchlistCard key={item.asset.symbol} item={item} index={i} />)}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-4">{t("session_no_data_signals")}</p>
            )
          ) : (
            <PremiumLock />
          )}
        </div>
      </div>

      {/* ── Analyse narrative IA ── */}
      <SessionNarrativeSection result={result} isPremium={isPremium} />

      {/* ── Stats bar (premium) ── */}
      {isPremium && result.performers.length > 0 && (
        <div className="border-t border-white/8 px-5 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <BarChart2 className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{t("session_stats")}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                label: t("session_best_perf"),
                value: `+${(result.performers[0]?.change ?? 0).toFixed(2)}%`,
                color: "text-emerald-400",
                sub: result.performers[0]?.name ?? "-",
              },
              {
                label: t("session_worst_perf"),
                value: `${(result.performers[result.performers.length - 1]?.change ?? 0).toFixed(2)}%`,
                color: "text-rose-400",
                sub: result.performers[result.performers.length - 1]?.name ?? "-",
              },
              {
                label: t("session_count_up"),
                value: `${result.performers.filter(p => p.change > 0).length}/${result.performers.length}`,
                color: "text-white",
                sub: t("session_positive_assets"),
              },
              {
                label: t("session_avg_label"),
                value: `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`,
                color: avgChange >= 0 ? "text-emerald-400" : "text-rose-400",
                sub: t("session_on_session"),
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="p-2.5 rounded-xl bg-white/4 border border-white/7 hover:border-white/15 hover:bg-white/[0.06] transition-colors"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <p className="text-[10px] text-white/40 mb-0.5">{stat.label}</p>
                <p className={cn("text-sm font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[10px] text-white/30 truncate">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN WIDGET
// ─────────────────────────────────────────────────────────────────────────────

export function SessionSummaryWidget() {
  const { t, lang } = useLanguage();
  const { isPremium } = usePremium();
  const [activeSession, setActiveSession] = useState<string>("europe");
  const [results, setResults] = useState<Record<string, SessionResult>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  const loadAllSessions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const allSymbolsRaw = SESSIONS.flatMap(s => s.symbols);
      const allSymbols = allSymbolsRaw.filter((sym, idx) => allSymbolsRaw.indexOf(sym) === idx);
      const data = await marketAPI.getPrices(allSymbols);
      const priceMap = data.prices || {};
      const computed: Record<string, SessionResult> = {};
      for (const session of SESSIONS) {
        computed[session.id] = computeSession(session, priceMap, lang);
      }
      setResults(computed);
      setLastUpdate(new Date());
      // Auto-select the live session if any
      const liveSession = SESSIONS.find(s => isMarketOpen(s.marketKey));
      if (liveSession) setActiveSession(liveSession.id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadAllSessions();
    const interval = setInterval(loadAllSessions, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [loadAllSessions]);

  const current = results[activeSession];
  const activeSessionCfg = SESSIONS.find(s => s.id === activeSession)!;

  return (
    <div className="relative">
      {/* Ambient glow tinted by the active session */}
      <motion.div
        key={`glow-${activeSession}`}
        aria-hidden
        className={cn("pointer-events-none absolute -inset-2 rounded-3xl blur-3xl", activeSessionCfg.glowColor)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        transition={{ duration: 0.7 }}
      />
      <div className="glass-card rounded-2xl overflow-hidden border border-white/8 relative">
      {/* Animated top accent bar (tinted by active session) */}
      <motion.div
        key={`accent-${activeSession}`}
        className={cn("h-[3px] w-full bg-gradient-to-r", activeSessionCfg.gradient)}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {/* ── Widget header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8">
            <motion.div
              className="absolute inset-0 rounded-xl bg-primary/20"
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">{t("session_title")}</h2>
            <p className="text-[11px] text-white/30">
              {lastUpdate
                ? `${t("session_updated")} ${lastUpdate.toLocaleTimeString(lang === "en" ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : t("session_loading")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/70 text-[10px]">
              <Crown className="w-2.5 h-2.5" />
              {t("session_some_premium")}
            </span>
          )}
          <button onClick={loadAllSessions} disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className={cn("w-4 h-4 text-white/35", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Session tabs ── */}
      <div className="flex border-b border-white/8 overflow-x-auto no-scrollbar">
        {SESSIONS.map((s) => {
          const result = results[s.id];
          const isActive = activeSession === s.id;
          const avg = result?.avgChange ?? null;
          const live = result?.isLive ?? false;

          return (
            <motion.button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "relative flex-1 min-w-[80px] flex flex-col items-center gap-0.5 py-3 px-2 text-xs transition-colors duration-200",
                isActive ? "text-white" : "text-white/35 hover:text-white/60",
              )}
            >
              {isActive && (
                <motion.div layoutId="sessionTabBg" className={cn("absolute inset-0", s.tabActiveBg)}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <div className="relative z-10 flex items-center gap-1">
                <span className="text-lg">{s.flag}</span>
                {live && (
                  <span className="relative flex w-1.5 h-1.5">
                    <motion.span
                      className="absolute inline-flex w-full h-full rounded-full bg-emerald-400"
                      animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                )}
              </div>
              <span className="font-semibold relative z-10 text-[11px]">{s.name}</span>
              {avg !== null && (
                <span className={cn("text-[10px] font-mono relative z-10", avg >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                </span>
              )}
              {isActive && (
                <motion.div layoutId="sessionTabLine"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5", s.accent.replace("text-", "bg-"))}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {loading && Object.keys(results).length === 0 ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="py-16 flex flex-col items-center gap-3 text-white/30">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw className="w-6 h-6" />
            </motion.div>
            <p className="text-sm">{t("session_loading_data")}</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-12 flex flex-col items-center gap-3 text-white/40">
            <AlertCircle className="w-7 h-7 text-rose-400/60" />
            <p className="text-sm">{t("session_load_error")}</p>
            <button onClick={loadAllSessions}
              className="text-xs text-primary hover:underline">{t("session_retry")}</button>
          </motion.div>
        ) : current ? (
          <motion.div key={activeSession}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}>
            <SessionPanel result={current} isPremium={isPremium} />
          </motion.div>
        ) : (
          <motion.div key="nodata" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-12 text-center text-white/30 text-sm">
            {t("session_no_data_for")} {activeSessionCfg?.name}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
