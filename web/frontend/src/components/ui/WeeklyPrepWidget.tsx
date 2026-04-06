"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Minus, Calendar, Eye, RefreshCw, Star, ExternalLink,
  AlertTriangle, BarChart2, Globe, Clock, X, Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { weeklyPrepAPI, WeeklyBriefing, WeeklyMarket, WeeklyWatchItem, WeeklyEvent } from "@/lib/api";
import { favoritesAPI } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

const TREND = {
  bullish: { label: "Haussier",  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: TrendingUp   },
  bearish: { label: "Baissier",  color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         icon: TrendingDown  },
  neutral: { label: "Neutre",    color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",   icon: Minus         },
};

const IMPORTANCE = {
  high:   { label: "Élevé",  dot: "bg-red-400"    },
  medium: { label: "Moyen",  dot: "bg-yellow-400" },
  low:    { label: "Faible", dot: "bg-emerald-400"},
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: "bullish" | "bearish" | "neutral" }) {
  const { label, color, bg, icon: Icon } = TREND[trend];
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
  return (
    <div className="bg-white/5 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm flex items-center gap-1.5">
          <span>{market.icon}</span> {market.name}
        </span>
        <TrendBadge trend={market.trend} />
      </div>
      <p className="text-sm text-foreground/80">{market.summary}</p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-0.5">Zones clés</p>
          <p className="text-xs">{market.key_zones}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
          <p className="text-xs text-red-400 mb-0.5 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> Risque
          </p>
          <p className="text-xs">{market.risk}</p>
        </div>
      </div>
    </div>
  );
}

function WatchCard({ item }: { item: WeeklyWatchItem }) {
  const [faved, setFaved] = useState(false);
  const { color, bg, icon: Icon } = TREND[item.direction];

  const addFav = async () => {
    try {
      await favoritesAPI.addFavorite(item.symbol);
      setFaved(true);
    } catch {}
  };

  return (
    <div className="bg-white/5 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("px-2 py-0.5 rounded-lg text-xs font-mono font-bold border", bg, color)}>
            {item.symbol}
          </span>
          <span className="text-sm font-medium truncate max-w-[120px]">{item.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendBadge trend={item.direction} />
          <button
            onClick={addFav}
            className={cn("p-1.5 rounded-lg transition-colors", faved ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400")}
            title="Ajouter aux favoris"
          >
            <Star className={cn("w-3.5 h-3.5", faved && "fill-yellow-400")} />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground"><span className="text-white/70 font-medium">Pourquoi : </span>{item.why}</p>
      <p className="text-xs text-muted-foreground"><span className="text-white/70 font-medium">Scénario : </span>{item.scenario}</p>
    </div>
  );
}

function EventRow({ event }: { event: WeeklyEvent }) {
  const imp = IMPORTANCE[event.importance];
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
      )}>{imp.label}</span>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface Props {
  /** Pass false to always show (dev/preview mode) */
  respectSchedule?: boolean;
}

export function WeeklyPrepWidget({ respectSchedule = true }: Props) {
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
        // Check visibility window
        if (respectSchedule) {
          const status = await weeklyPrepAPI.status();
          if (!status.visible) { setLoading(false); return; }
        }
        setVisible(true);

        // Check if dismissed this week
        const week = new Date().toLocaleDateString("fr-FR");
        const dismissed = localStorage.getItem("weekly_prep_dismissed");
        if (dismissed === week) { setLoading(false); setDismissed(true); return; }

        const data = await weeklyPrepAPI.get();
        setBriefing(data.briefing);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [respectSchedule]);

  const handleDismiss = () => {
    const week = new Date().toLocaleDateString("fr-FR");
    localStorage.setItem("weekly_prep_dismissed", week);
    setDismissed(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await weeklyPrepAPI.refresh();
      setBriefing(data.briefing);
    } catch (e: any) {
      setError(e?.message || "Erreur");
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
        <p className="font-semibold">Briefing hebdomadaire</p>
        <p className="text-sm text-muted-foreground">Génération de votre préparation de marché…</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="glass-card p-4 flex items-center gap-3 text-muted-foreground text-sm">
      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
      Briefing indisponible : {error}
    </div>
  );
  if (!briefing) return null;

  const macroMeta = TREND[briefing.macro.trend];
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
              Préparation de marché
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-normal">
                {briefing.week}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MacroIcon className={cn("w-3.5 h-3.5", macroMeta.color)} />
              <span>Sentiment global : </span>
              <span className={cn("font-medium", macroMeta.color)}>{macroMeta.label}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            title="Actualiser">
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
          <button onClick={() => setFullscreen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors hidden sm:block"
            title="Plein écran">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
            title="Fermer pour cette semaine">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Macro summary */}
      <div className={cn("p-4 rounded-xl border", macroMeta.bg)}>
        <p className="text-sm leading-relaxed">{briefing.macro.summary}</p>
        <ul className="mt-3 space-y-1">
          {briefing.macro.key_points.map((pt, i) => (
            <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Markets tabs */}
      <Section title="Analyse par marché" icon={BarChart2} defaultOpen>
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

      {/* Watchlist */}
      <Section title={`Actifs à surveiller (${briefing.watchlist.length})`} icon={Eye}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {briefing.watchlist.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <WatchCard item={item} />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Events */}
      <Section title="Événements de la semaine" icon={Calendar}>
        <div>
          {briefing.events.map((ev, i) => <EventRow key={i} event={ev} />)}
        </div>
      </Section>

      {/* Conclusion */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-xs text-primary font-semibold mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Synthèse stratégique
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">{briefing.conclusion}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ⚠️ Contenu éducatif généré par IA · Pas un conseil financier · Trading = risque de perte en capital
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
