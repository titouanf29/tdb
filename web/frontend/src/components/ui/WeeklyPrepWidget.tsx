"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Minus, Calendar, Eye, RefreshCw, Star, Maximize2,
  AlertTriangle, BarChart2, Globe, X, Target, BookOpen, Lightbulb,
  ArrowRight, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { weeklyPrepAPI, WeeklyBriefing, WeeklyMarket, WeeklyWatchItem, WeeklyEvent, WeeklyTradingIdea } from "@/lib/api";
import { favoritesAPI } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

// ── helpers ───────────────────────────────────────────────────────────────────

const TREND_KEYS = {
  bullish: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: TrendingUp   },
  bearish: { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         icon: TrendingDown  },
  neutral: { color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",   icon: Minus         },
};

const IMPORTANCE = {
  high:   { dot: "bg-red-400",     labelKey: "high"   as const },
  medium: { dot: "bg-yellow-400",  labelKey: "medium" as const },
  low:    { dot: "bg-emerald-400", labelKey: "low"    as const },
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Parse "Support 5100, Résistance 5280, Support fort 4900" into colored badges */
function KeyZones({ zones }: { zones: string }) {
  if (!zones || zones === "—" || zones === "Données non disponibles") return (
    <span className="text-xs text-muted-foreground">—</span>
  );

  const parts = zones.split(/,\s*/).filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {parts.map((part, i) => {
        const lower = part.toLowerCase();
        const isResistance = lower.includes("résistance") || lower.includes("resistance");
        const isSupport = lower.includes("support");
        const label = part.trim();

        if (isResistance) return (
          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            {label}
          </span>
        );
        if (isSupport) return (
          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            {label}
          </span>
        );
        return (
          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            {label}
          </span>
        );
      })}
    </div>
  );
}

function TrendBadge({ trend }: { trend: "bullish" | "bearish" | "neutral" }) {
  const { t } = useLanguage();
  const { color, bg, icon: Icon } = TREND_KEYS[trend];
  const label = t(`weekly_${trend}` as "weekly_bullish" | "weekly_bearish" | "weekly_neutral");
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold", bg, color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarketCard({ market }: { market: WeeklyMarket }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white/5 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm flex items-center gap-1.5">
          <span>{market.icon}</span> {market.name}
        </span>
        <TrendBadge trend={market.trend} />
      </div>
      <p className="text-sm text-foreground/80">{market.summary}</p>
      {market.detailed_analysis && (
        <p className="text-xs text-foreground/60 leading-relaxed border-l-2 border-primary/30 pl-3">
          {market.detailed_analysis}
        </p>
      )}
      <div className="space-y-2 pt-1">
        <div className="bg-white/5 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground mb-1 font-medium">{t("weekly_key_zones")}</p>
          <KeyZones zones={market.key_zones} />
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            🟢 Support = plancher d'achat · 🔴 Résistance = plafond de vente
          </p>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
          <p className="text-xs text-red-400 mb-0.5 flex items-center gap-1 font-medium">
            <AlertTriangle className="w-2.5 h-2.5" /> {t("weekly_risk")}
          </p>
          <p className="text-xs">{market.risk}</p>
        </div>
      </div>
      {market.opportunities && market.opportunities.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 space-y-1">
          <p className="text-xs text-emerald-400 font-semibold mb-1">Opportunités</p>
          {market.opportunities.map((op, i) => (
            <p key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
              {op}
            </p>
          ))}
        </div>
      )}
      {market.sectors_watch && market.sectors_watch.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">Secteurs à surveiller</p>
          {market.sectors_watch.map((s, i) => (
            <p key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
              {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Maps market display name → watchlist market key */
const MARKET_NAME_TO_KEY: Record<string, string> = {
  "Actions US":           "US",
  "Actions Europe":       "EU",
  "Crypto":               "Crypto",
  "Matières premières":   "Matières premières",
  "Forex":                "Forex",
};

function WatchCard({ item }: { item: WeeklyWatchItem }) {
  const { t } = useLanguage();
  const [faved, setFaved] = useState(false);
  const { color, bg } = TREND_KEYS[item.direction];

  const addFav = async () => {
    try { await favoritesAPI.addFavorite(item.symbol); setFaved(true); } catch {}
  };

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shrink-0", bg, color)}>
            {item.symbol}
          </span>
          <span className="text-sm font-semibold truncate">{item.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendBadge trend={item.direction} />
          <button onClick={addFav}
            className={cn("p-1.5 rounded-lg transition-colors", faved ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400")}
            title={t("weekly_add_fav")}>
            <Star className={cn("w-3.5 h-3.5", faved && "fill-yellow-400")} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2.5">
        {/* Why */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
          <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
            🔍 Pourquoi cette semaine ?
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed">{item.why}</p>
        </div>

        {/* Scenario */}
        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5">
          <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
            📈 Scénario anticipé
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed">{item.scenario}</p>
        </div>

        {/* Technical setup */}
        {item.technical_setup && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5">
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wide mb-1">
              📊 Setup technique
            </p>
            <p className="text-xs text-foreground/70">{item.technical_setup}</p>
          </div>
        )}

        {/* Price levels */}
        {(item.entry_zone || item.target || item.stop_loss) && (
          <div className="grid grid-cols-3 gap-1.5">
            {item.entry_zone && (
              <div className="bg-blue-500/8 border border-blue-500/15 rounded-lg p-2 text-center">
                <p className="text-[9px] text-blue-400/80 font-semibold uppercase tracking-wide mb-0.5">Zone entrée</p>
                <p className="text-[11px] font-mono font-bold text-blue-300">{item.entry_zone}</p>
              </div>
            )}
            {item.target && (
              <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-2 text-center">
                <p className="text-[9px] text-emerald-400/80 font-semibold uppercase tracking-wide mb-0.5">Objectif</p>
                <p className="text-[11px] font-mono font-bold text-emerald-300">{item.target}</p>
              </div>
            )}
            {item.stop_loss && (
              <div className="bg-red-500/8 border border-red-500/15 rounded-lg p-2 text-center">
                <p className="text-[9px] text-red-400/80 font-semibold uppercase tracking-wide mb-0.5">Stop-loss</p>
                <p className="text-[11px] font-mono font-bold text-red-300">{item.stop_loss}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TradingIdeaCard({ idea }: { idea: WeeklyTradingIdea }) {
  const { color, bg } = TREND_KEYS[idea.direction];
  const DirIcon = idea.direction === "bullish" ? ArrowUpRight : idea.direction === "bearish" ? ArrowDownRight : ArrowRight;

  return (
    <div className={cn("rounded-xl p-3 space-y-2.5 border", bg)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{idea.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("text-xs font-mono font-bold px-1.5 py-0.5 rounded border", bg, color)}>
              {idea.symbol}
            </span>
            {idea.timeframe && (
              <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded capitalize">
                {idea.timeframe}
              </span>
            )}
          </div>
        </div>
        <span className={cn("flex items-center gap-1 text-xs font-semibold shrink-0", color)}>
          <DirIcon className="w-3.5 h-3.5" />
          {idea.rr && `R/R ${idea.rr}`}
        </span>
      </div>
      <p className="text-xs text-foreground/70 leading-relaxed">{idea.setup}</p>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-black/20 rounded-lg p-1.5 text-center">
          <p className="text-[9px] text-blue-400/80 font-semibold uppercase tracking-wide mb-0.5">Entrée</p>
          <p className="text-[10px] font-mono text-blue-300 break-all">{idea.entry}</p>
        </div>
        <div className="bg-black/20 rounded-lg p-1.5 text-center">
          <p className="text-[9px] text-emerald-400/80 font-semibold uppercase tracking-wide mb-0.5">Cible</p>
          <p className="text-[10px] font-mono text-emerald-300 break-all">{idea.target}</p>
        </div>
        <div className="bg-black/20 rounded-lg p-1.5 text-center">
          <p className="text-[9px] text-red-400/80 font-semibold uppercase tracking-wide mb-0.5">Stop</p>
          <p className="text-[10px] font-mono text-red-300 break-all">{idea.stop}</p>
        </div>
      </div>
      {idea.conditions && (
        <p className="text-[10px] text-muted-foreground flex items-start gap-1.5 border-t border-white/5 pt-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
          {idea.conditions}
        </p>
      )}
    </div>
  );
}

function EventRow({ event }: { event: WeeklyEvent }) {
  const { t } = useLanguage();
  const imp = IMPORTANCE[event.importance];
  const impLabel =
    event.importance === "high"   ? t("weekly_bullish").replace("aussier","levé") :
    event.importance === "medium" ? "Moyen" :
    "Faible";
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", imp.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{event.country} {event.day}</span>
          <span className="text-xs bg-white/5 px-1.5 py-0.5 rounded font-mono">{event.time}</span>
        </div>
        <p className="text-sm font-medium mt-0.5">{event.event}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{event.impact}</p>
      </div>
      <span className={cn("text-xs px-1.5 py-0.5 rounded shrink-0",
        event.importance === "high"   ? "bg-red-500/10 text-red-400" :
        event.importance === "medium" ? "bg-yellow-500/10 text-yellow-400" :
        "bg-emerald-500/10 text-emerald-400"
      )}>{impLabel}</span>
    </div>
  );
}

const WATCHLIST_TABS = [
  { key: "US",                 label: "Actions US",         icon: "🇺🇸" },
  { key: "EU",                 label: "Actions Europe",     icon: "🇪🇺" },
  { key: "Crypto",             label: "Crypto",             icon: "₿"   },
  { key: "Matières premières", label: "Matières",           icon: "🛢️" },
  { key: "Forex",              label: "Forex",              icon: "💱"  },
];

function WatchlistByMarket({ watchlist, t }: { watchlist: WeeklyWatchItem[]; t: (k: any) => string }) {
  // Deduplicate by symbol (AI can sometimes generate the same symbol twice)
  const unique = watchlist.filter((item, idx, arr) =>
    arr.findIndex(i => i.symbol === item.symbol) === idx
  );

  const hasMarketField = unique.some(w => !!w.market);
  // Only show market tabs that have at least one item; always show "Tous"
  const activeTabs = hasMarketField
    ? WATCHLIST_TABS.filter(tab => unique.some(w => w.market === tab.key))
    : [];

  const [active, setActive] = useState("tous");

  const displayed = active === "tous"
    ? unique
    : unique.filter(w => w.market === active);

  return (
    <Section title={`${t("weekly_watchlist")} (${unique.length})`} icon={Eye}>
      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button onClick={() => setActive("tous")}
          className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
            active === "tous" ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:border-white/20"
          )}>
          Tous ({unique.length})
        </button>
        {activeTabs.map(tab => {
          const count = watchlist.filter(w => w.market === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActive(tab.key)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                active === tab.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:border-white/20"
              )}>
              {tab.icon} {tab.label}
              <span className={cn("ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full",
                active === tab.key ? "bg-primary/30 text-primary" : "bg-white/10 text-muted-foreground"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
          {displayed.map((item, i) => (
            <motion.div key={item.symbol} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <WatchCard item={item} />
            </motion.div>
          ))}
          {displayed.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 italic">
              Aucun actif dans cette catégorie pour cette semaine.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  /** Pass false to always show (dev/preview mode) */
  respectSchedule?: boolean;
}

export function WeeklyPrepWidget({ respectSchedule = true }: Props) {
  const { t } = useLanguage();
  const [briefing, setBriefing] = useState<WeeklyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeMarket, setActiveMarket] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        let weekKey = new Date().toISOString().slice(0, 10); // fallback YYYY-MM-DD
        if (respectSchedule) {
          const status = await weeklyPrepAPI.status();
          if (!status.visible) { setLoading(false); return; }
          weekKey = status.week; // ISO week e.g. "2026-W15"
        }
        setVisible(true);

        const dismissed = localStorage.getItem("weekly_prep_dismissed_v2");
        if (dismissed === weekKey) { setLoading(false); setDismissed(true); return; }

        const data = await weeklyPrepAPI.get();
        setBriefing(data.briefing);
      } catch (e: any) {
        setError(e?.message || t("error_generic"));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [respectSchedule]);

  const handleDismiss = () => {
    // Use the same key format as the status endpoint (ISO week)
    weeklyPrepAPI.status().then(s => {
      localStorage.setItem("weekly_prep_dismissed_v2", s.week);
    }).catch(() => {
      localStorage.setItem("weekly_prep_dismissed_v2", new Date().toISOString().slice(0, 10));
    });
    setDismissed(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await weeklyPrepAPI.refresh();
      setBriefing(data.briefing);
    } catch (e: any) {
      setError(e?.message || t("error_generic"));
    } finally {
      setRefreshing(false);
    }
  };

  if (!visible && respectSchedule) return null;
  if (dismissed) return null;
  if (loading) return (
    <div className="glass-card p-6 flex items-center gap-3 animate-pulse">
      <Sparkles className="w-5 h-5 text-primary" />
      <div>
        <p className="font-semibold">{t("weekly_briefing")}</p>
        <p className="text-sm text-muted-foreground">{t("weekly_loading")}</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="glass-card p-4 flex items-center gap-3 text-muted-foreground text-sm">
      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
      {t("weekly_unavailable")} : {error}
    </div>
  );
  if (!briefing) return null;

  const macroMeta = TREND_KEYS[briefing.macro.trend];
  const MacroIcon = macroMeta.icon;

  const content = (
    <div className={cn("space-y-4", fullscreen && "max-w-4xl mx-auto")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              {t("weekly_title")}
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-normal">
                {briefing.week}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MacroIcon className={cn("w-3.5 h-3.5", macroMeta.color)} />
              <span>{t("weekly_sentiment")} : </span>
              <span className={cn("font-medium", macroMeta.color)}>
                {t(`weekly_${briefing.macro.trend}` as "weekly_bullish" | "weekly_bearish" | "weekly_neutral")}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            title={t("refresh")}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
          {!fullscreen && (
            <button onClick={() => setFullscreen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors hidden sm:block"
              title={t("weekly_fullscreen")}>
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={fullscreen ? () => setFullscreen(false) : handleDismiss}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              fullscreen
                ? "hover:bg-white/10 text-muted-foreground hover:text-white"
                : "hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
            )}
            title={fullscreen ? "Réduire" : t("weekly_close_week")}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin note */}
      {briefing.admin_note && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
          <span className="text-base leading-none mt-0.5 shrink-0">📌</span>
          <div className="min-w-0">
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">Note de la semaine</p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{briefing.admin_note}</p>
          </div>
        </div>
      )}

      {/* Macro summary */}
      <div className={cn("p-4 rounded-xl border", macroMeta.bg)}>
        <p className="text-sm leading-relaxed font-medium">{briefing.macro.summary}</p>
        {briefing.macro.detailed_analysis && (
          <p className="text-xs text-foreground/60 leading-relaxed mt-2 border-t border-white/10 pt-2">
            {briefing.macro.detailed_analysis}
          </p>
        )}
        <ul className="mt-3 space-y-1">
          {briefing.macro.key_points.map((pt, i) => (
            <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Markets tabs — analysis only */}
      <Section title={t("weekly_markets")} icon={BarChart2} defaultOpen>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {briefing.markets.map((m, i) => (
            <button key={i} onClick={() => setActiveMarket(i)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                activeMarket === i ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:border-white/20"
              )}>
              {m.icon} {m.name}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeMarket} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <MarketCard market={briefing.markets[activeMarket]} />
          </motion.div>
        </AnimatePresence>
      </Section>

      {/* Watchlist — separate section, tabs by market */}
      <WatchlistByMarket watchlist={briefing.watchlist} t={t} />

      {/* Events */}
      <Section title={t("weekly_events")} icon={Calendar}>
        <div>
          {briefing.events.map((ev, i) => <EventRow key={i} event={ev} />)}
        </div>
      </Section>

      {/* Trading Ideas */}
      {briefing.trading_ideas && briefing.trading_ideas.length > 0 && (
        <Section title={`Idées de trade (${briefing.trading_ideas.length})`} icon={Target}>
          <div className="space-y-3">
            {briefing.trading_ideas.map((idea, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <TradingIdeaCard idea={idea} />
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400/60" />
            Ces idées sont éducatives. Faites vos propres recherches avant tout trade.
          </p>
        </Section>
      )}

      {/* Educational Tip */}
      {briefing.educational_tip && (
        <Section title="Conseil de la semaine" icon={BookOpen}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="font-semibold text-sm text-yellow-400">{briefing.educational_tip.concept}</p>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">{briefing.educational_tip.explanation}</p>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Exemple concret</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{briefing.educational_tip.example}</p>
            </div>
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-[10px] text-yellow-400/80 font-semibold uppercase tracking-wide mb-1">À retenir</p>
              <p className="text-xs text-foreground/80 font-medium">{briefing.educational_tip.takeaway}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Conclusion */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-xs text-primary font-semibold mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> {t("weekly_conclusion")}
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">{briefing.conclusion}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ⚠️ {t("weekly_disclaimer")}
      </p>
    </div>
  );

  if (fullscreen) return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto p-4 sm:p-8">
      {content}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 border border-primary/20 shadow-[0_0_40px_rgba(99,102,241,0.08)]"
    >
      {content}
    </motion.div>
  );
}
