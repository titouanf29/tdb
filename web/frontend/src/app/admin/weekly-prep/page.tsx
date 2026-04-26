"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, Save, Eye, Code2, Loader2,
  AlertTriangle, CheckCircle, ChevronRight, ChevronDown,
  TrendingUp, TrendingDown, Minus, Calendar, BarChart2,
  Globe, Clock, Zap, Shield, Upload, Target, BookOpen,
  Lightbulb, ArrowRight, ArrowUpRight, ArrowDownRight,
  BellOff, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { weeklyPrepAPI, WeeklyBriefing, WeeklyTradingIdea } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

function KeyZones({ zones }: { zones: string }) {
  if (!zones || zones === "—" || zones === "Données non disponibles") return (
    <span className="text-xs text-muted-foreground">—</span>
  );
  const parts = zones.split(/,\s*/).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {parts.map((part, i) => {
        const lower = part.toLowerCase();
        const isRes = lower.includes("résistance") || lower.includes("resistance");
        const isSup = lower.includes("support");
        const cls = isRes
          ? "bg-red-500/15 text-red-400 border-red-500/25"
          : isSup
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
          : "bg-blue-500/15 text-blue-400 border-blue-500/25";
        const dot = isRes ? "bg-red-400" : isSup ? "bg-emerald-400" : "bg-blue-400";
        return (
          <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
            {part.trim()}
          </span>
        );
      })}
    </div>
  );
}

const TREND = {
  bullish: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Haussier", icon: TrendingUp },
  bearish: { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         label: "Baissier", icon: TrendingDown },
  neutral: { color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",   label: "Neutre",   icon: Minus },
};

function TrendBadge({ trend }: { trend: "bullish" | "bearish" | "neutral" }) {
  const { color, bg, label, icon: Icon } = TREND[trend] ?? TREND.neutral;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold", bg, color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function Collapsible({ title, icon: Icon, children, defaultOpen = false }: {
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
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MARKET_NAME_TO_KEY: Record<string, string> = {
  "Actions US":         "US",
  "Actions Europe":     "EU",
  "Crypto":             "Crypto",
  "Matières premières": "Matières premières",
  "Forex":              "Forex",
};

const WATCHLIST_TABS = [
  { key: "US",                 label: "Actions US",         icon: "🇺🇸" },
  { key: "EU",                 label: "Actions Europe",     icon: "🇪🇺" },
  { key: "Crypto",             label: "Crypto",             icon: "₿"   },
  { key: "Matières premières", label: "Matières",           icon: "🛢️" },
  { key: "Forex",              label: "Forex",              icon: "💱"  },
];

function AdminWatchlistByMarket({ watchlist }: { watchlist: WeeklyBriefing["watchlist"] }) {
  const [active, setActive] = useState("tous");
  // Deduplicate by symbol
  const unique = watchlist.filter((item, idx, arr) =>
    arr.findIndex(i => i.symbol === item.symbol) === idx
  );
  const hasMarket = unique.some(w => !!w.market);
  const activeTabs = hasMarket
    ? WATCHLIST_TABS.filter(t => unique.some(w => w.market === t.key))
    : [];
  const displayed = active === "tous" ? unique : unique.filter(w => w.market === active);

  return (
    <Collapsible title={`Watchlist (${unique.length})`} icon={TrendingUp}>
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button onClick={() => setActive("tous")}
          className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
            active === "tous" ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:border-white/20")}>
          Tous ({unique.length})
        </button>
        {activeTabs.map(tab => {
          const count = unique.filter(w => w.market === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActive(tab.key)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                active === tab.key ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:border-white/20")}>
              {tab.icon} {tab.label}
              <span className={cn("ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full",
                active === tab.key ? "bg-primary/30 text-primary" : "bg-white/10 text-muted-foreground"
              )}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-3">
        {displayed.map((item, i) => {
          const meta = TREND[item.direction] ?? TREND.neutral;
          return (
            <div key={i} className="bg-white/5 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shrink-0", meta.bg, meta.color)}>{item.symbol}</span>
                  <span className="text-sm font-semibold truncate">{item.name}</span>
                  {item.market && <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded shrink-0">{item.market}</span>}
                </div>
                <TrendBadge trend={item.direction} />
              </div>
              <div className="px-3 pb-3 space-y-2">
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
                  <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">🔍 Pourquoi cette semaine ?</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.why}</p>
                </div>
                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5">
                  <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide mb-1">📈 Scénario anticipé</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.scenario}</p>
                </div>
                {item.technical_setup && (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5">
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wide mb-1">📊 Setup technique</p>
                    <p className="text-xs text-foreground/70">{item.technical_setup}</p>
                  </div>
                )}
                {(item.entry_zone || item.target || item.stop_loss) && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {item.entry_zone && <div className="bg-blue-500/8 border border-blue-500/15 rounded-lg p-1.5 text-center">
                      <p className="text-[9px] text-blue-400/80 font-semibold uppercase mb-0.5">Zone entrée</p>
                      <p className="text-[11px] font-mono font-bold text-blue-300">{item.entry_zone}</p>
                    </div>}
                    {item.target && <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-1.5 text-center">
                      <p className="text-[9px] text-emerald-400/80 font-semibold uppercase mb-0.5">Objectif</p>
                      <p className="text-[11px] font-mono font-bold text-emerald-300">{item.target}</p>
                    </div>}
                    {item.stop_loss && <div className="bg-red-500/8 border border-red-500/15 rounded-lg p-1.5 text-center">
                      <p className="text-[9px] text-red-400/80 font-semibold uppercase mb-0.5">Stop-loss</p>
                      <p className="text-[11px] font-mono font-bold text-red-300">{item.stop_loss}</p>
                    </div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 italic">Aucun actif dans cette catégorie.</p>
        )}
      </div>
    </Collapsible>
  );
}

// ── Preview renderer ──────────────────────────────────────────────────────────

function BriefingPreview({ briefing }: { briefing: WeeklyBriefing }) {
  const [activeMarket, setActiveMarket] = useState(0);
  const macroMeta = TREND[briefing.macro?.trend] ?? TREND.neutral;
  const MacroIcon = macroMeta.icon;

  return (
    <div className="space-y-4">
      {/* Admin note */}
      {briefing.admin_note && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
          <span className="text-base leading-none mt-0.5 shrink-0">📌</span>
          <div>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">Note de la semaine</p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{briefing.admin_note}</p>
          </div>
        </div>
      )}

      {/* Macro */}
      <div className={cn("p-4 rounded-xl border", macroMeta.bg)}>
        <div className="flex items-center gap-2 mb-2">
          <MacroIcon className={cn("w-4 h-4", macroMeta.color)} />
          <span className={cn("text-sm font-semibold", macroMeta.color)}>
            Sentiment macro — {macroMeta.label}
          </span>
        </div>
        <p className="text-sm leading-relaxed font-medium">{briefing.macro?.summary}</p>
        {briefing.macro?.detailed_analysis && (
          <p className="text-xs text-foreground/60 leading-relaxed mt-2 border-t border-white/10 pt-2">
            {briefing.macro.detailed_analysis}
          </p>
        )}
        <ul className="mt-3 space-y-1">
          {(briefing.macro?.key_points ?? []).map((pt, i) => (
            <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Markets — analysis only */}
      <Collapsible title={`Marchés (${briefing.markets?.length ?? 0})`} icon={BarChart2} defaultOpen>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {(briefing.markets ?? []).map((m, i) => (
            <button key={i} onClick={() => setActiveMarket(i)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                activeMarket === i ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:border-white/20"
              )}>
              {m.icon} {m.name}
            </button>
          ))}
        </div>
        {briefing.markets?.[activeMarket] && (() => {
          const m = briefing.markets[activeMarket];
          return (
            <div className="bg-white/5 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{m.icon} {m.name}</span>
                <TrendBadge trend={m.trend} />
              </div>
              <p className="text-sm text-foreground/80">{m.summary}</p>
              {m.detailed_analysis && (
                <p className="text-xs text-foreground/60 leading-relaxed border-l-2 border-primary/30 pl-3">{m.detailed_analysis}</p>
              )}
              <div className="space-y-2">
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Zones clés</p>
                  <KeyZones zones={m.key_zones} />
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">🟢 Support = plancher d'achat · 🔴 Résistance = plafond de vente</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                  <p className="text-xs text-red-400 mb-0.5 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-2.5 h-2.5" /> Risque
                  </p>
                  <p className="text-xs">{m.risk}</p>
                </div>
              </div>
              {m.opportunities && m.opportunities.length > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 space-y-1">
                  <p className="text-xs text-emerald-400 font-semibold mb-1">Opportunités</p>
                  {m.opportunities.map((op, i) => (
                    <p key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />{op}
                    </p>
                  ))}
                </div>
              )}
              {m.sectors_watch && m.sectors_watch.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">Secteurs à surveiller</p>
                  {m.sectors_watch.map((s, i) => (
                    <p key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />{s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Collapsible>

      {/* Watchlist — separate section with market tabs */}
      <AdminWatchlistByMarket watchlist={briefing.watchlist ?? []} />

      {/* Events */}
      <Collapsible title={`Événements (${briefing.events?.length ?? 0})`} icon={Calendar}>
        <div>
          {(briefing.events ?? []).map((ev, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                ev.importance === "high" ? "bg-red-400" : ev.importance === "medium" ? "bg-yellow-400" : "bg-emerald-400"
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{ev.country} {ev.day}</span>
                  <span className="text-xs bg-white/5 px-1.5 py-0.5 rounded font-mono">{ev.time}</span>
                </div>
                <p className="text-sm font-medium mt-0.5">{ev.event}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ev.impact}</p>
              </div>
              <span className={cn("text-xs px-1.5 py-0.5 rounded shrink-0",
                ev.importance === "high"   ? "bg-red-500/10 text-red-400" :
                ev.importance === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                "bg-emerald-500/10 text-emerald-400"
              )}>
                {ev.importance === "high" ? "Élevé" : ev.importance === "medium" ? "Moyen" : "Faible"}
              </span>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Trading Ideas */}
      {briefing.trading_ideas && briefing.trading_ideas.length > 0 && (
        <Collapsible title={`Idées de trade (${briefing.trading_ideas.length})`} icon={Target}>
          <div className="space-y-3">
            {briefing.trading_ideas.map((idea, i) => {
              const meta = TREND[idea.direction] ?? TREND.neutral;
              return (
                <div key={i} className={cn("rounded-xl p-3 space-y-2.5 border", meta.bg)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{idea.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-xs font-mono font-bold px-1.5 py-0.5 rounded border", meta.bg, meta.color)}>
                          {idea.symbol}
                        </span>
                        {idea.timeframe && (
                          <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded capitalize">{idea.timeframe}</span>
                        )}
                      </div>
                    </div>
                    <span className={cn("text-xs font-semibold shrink-0", meta.color)}>R/R {idea.rr}</span>
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed">{idea.setup}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-black/20 rounded-lg p-1.5 text-center">
                      <p className="text-[9px] text-blue-400/80 font-semibold uppercase mb-0.5">Entrée</p>
                      <p className="text-[10px] font-mono text-blue-300 break-all">{idea.entry}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-1.5 text-center">
                      <p className="text-[9px] text-emerald-400/80 font-semibold uppercase mb-0.5">Cible</p>
                      <p className="text-[10px] font-mono text-emerald-300 break-all">{idea.target}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-1.5 text-center">
                      <p className="text-[9px] text-red-400/80 font-semibold uppercase mb-0.5">Stop</p>
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
            })}
          </div>
        </Collapsible>
      )}

      {/* Educational Tip */}
      {briefing.educational_tip && (
        <Collapsible title="Conseil de la semaine" icon={BookOpen}>
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
        </Collapsible>
      )}

      {/* Conclusion */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-xs text-primary font-semibold mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Conclusion stratégique
        </p>
        <p className="text-sm leading-relaxed text-foreground/80">{briefing.conclusion}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ⚠️ Informations à titre éducatif uniquement. Pas de conseil en investissement.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminWeeklyPrepPage() {
  const router = useRouter();

  const [briefing, setBriefing]         = useState<WeeklyBriefing | null>(null);
  const [meta, setMeta]                 = useState<{ cached: boolean; generated_at: string; week_key: string; visible: boolean } | null>(null);
  const [jsonText, setJsonText]         = useState("");
  const [jsonError, setJsonError]       = useState("");

  const [tab, setTab]                   = useState<"preview" | "edit">("preview");
  const [loading, setLoading]           = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [error, setError]               = useState("");
  const [saveOk, setSaveOk]             = useState(false);
  const [publishOk, setPublishOk]       = useState(false);
  const [draftSaved, setDraftSaved]     = useState(false);
  const [noteText, setNoteText]         = useState("");
  const [noteSaving, setNoteSaving]     = useState(false);
  const [noteSaved, setNoteSaved]       = useState(false);
  const [skipSend, setSkipSend]         = useState(false);
  const [skipToggling, setSkipToggling] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // Load auto-send flag
      try {
        const autoSend = await weeklyPrepAPI.adminGetAutoSend();
        setSkipSend(autoSend.skip);
      } catch { /* not critical */ }

      // Try admin endpoint first (available once new backend is deployed)
      try {
        const data = await weeklyPrepAPI.adminPreview();
        applyFull(data);
        return;
      } catch (adminErr: any) {
        if (adminErr?.status === 403) { router.push("/admin"); return; }
        // Endpoint not deployed yet — fallback
      }

      // Fallback: status only, do NOT auto-generate via get()
      // (get() triggers Groq generation if no cache → 429)
      const statusData = await weeklyPrepAPI.status();
      setMeta({ cached: false, generated_at: "", week_key: statusData.week, visible: statusData.visible });
      // Try to load existing cache silently; if Groq 429 fires, just show empty state
      try {
        const briefingData = await weeklyPrepAPI.get();
        applyBasic(briefingData.briefing, statusData);
      } catch {
        // No cache this week — user can click Régénérer to create one
      }
    } catch (e: any) {
      if (e?.status === 403) {
        router.push("/admin");
      } else {
        setError(e?.message || "Erreur de chargement");
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFull = (data: { briefing: WeeklyBriefing; cached: boolean; generated_at: string; week_key: string; visible: boolean }) => {
    setBriefing(data.briefing);
    setMeta({ cached: data.cached, generated_at: data.generated_at, week_key: data.week_key, visible: data.visible });
    setJsonText(JSON.stringify(data.briefing, null, 2));
    setNoteText(data.briefing.admin_note ?? "");
    setJsonError("");
  };

  const applyBasic = (b: WeeklyBriefing, status: { visible: boolean; week: string }) => {
    setBriefing(b);
    setMeta({ cached: true, generated_at: "", week_key: status.week, visible: status.visible });
    setJsonText(JSON.stringify(b, null, 2));
    setNoteText(b.admin_note ?? "");
    setJsonError("");
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError("");
    try {
      const refreshed = await weeklyPrepAPI.refresh();
      const status = await weeklyPrepAPI.status();
      applyBasic(refreshed.briefing, status);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la régénération");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!briefing) return;
    setNoteSaving(true);
    try {
      const updated = { ...briefing, admin_note: noteText.trim() || undefined };
      await weeklyPrepAPI.adminSave(updated);
      setBriefing(updated);
      setJsonText(JSON.stringify(updated, null, 2));
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la sauvegarde de la note");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleSaveDraft = () => {
    setJsonError("");
    let parsed: WeeklyBriefing;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON invalide — corrigez la syntaxe avant de sauvegarder.");
      return;
    }
    setBriefing(parsed);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  const handlePublish = async () => {
    setJsonError("");
    let parsed: WeeklyBriefing;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON invalide — corrigez la syntaxe avant de publier.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      await weeklyPrepAPI.adminSave(parsed);
      setBriefing(parsed);
      setPublishOk(true);
      setTimeout(() => setPublishOk(false), 3000);
    } catch (e: any) {
      if (e?.status === 404) {
        setError("Endpoint de publication non disponible — re-deploy le backend.");
      } else {
        setError(e?.message || "Erreur lors de la publication");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleSkip = async () => {
    setSkipToggling(true);
    try {
      const res = await weeklyPrepAPI.adminSetAutoSend(!skipSend);
      setSkipSend(res.skip);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la mise à jour");
    } finally {
      setSkipToggling(false);
    }
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    setJsonError("");
    try {
      JSON.parse(val);
    } catch {
      setJsonError("JSON invalide");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Préparation de Semaine
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 ml-1">
                ADMIN ONLY
              </span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              {meta && (
                <>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {meta.week_key}
                  </span>
                  <span className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold",
                    meta.visible
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                      : "bg-white/5 text-muted-foreground border-white/10"
                  )}>
                    <Globe className="w-3 h-3" />
                    {meta.visible ? "Visible utilisateurs" : "Masqué (hors fenêtre)"}
                  </span>
                  {meta.cached && (
                    <span className="text-xs text-muted-foreground/60">
                      Généré le {new Date(meta.generated_at).toLocaleString("fr-FR")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-send toggle */}
            <button
              onClick={handleToggleSkip}
              disabled={skipToggling}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border disabled:opacity-50",
                skipSend
                  ? "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
              )}
              title={skipSend ? "Réactiver l'envoi automatique du dimanche" : "Désactiver l'envoi automatique de cette semaine"}
            >
              {skipToggling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : skipSend ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />
              }
              {skipSend ? "Envoi désactivé" : "Envoi auto activé"}
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", regenerating && "animate-spin")} />
              Régénérer IA
            </button>
            {tab === "edit" && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveDraft}
                  disabled={!!jsonError}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 border",
                    draftSaved
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 text-foreground border-white/10"
                  )}
                >
                  {draftSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {draftSaved ? "Brouillon OK" : "Sauvegarder brouillon"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePublish}
                  disabled={publishing || !!jsonError}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50",
                    publishOk
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : publishOk ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  {publishing ? "Publication..." : publishOk ? "Publié !" : "Publier"}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Visibility info */}
      {meta && !meta.visible && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-sm">
          <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-400">Contenu non visible pour les utilisateurs</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Le widget s'affiche uniquement du dimanche 13h00 UTC au lundi 14h30 UTC.
              Tu peux prévisualiser et modifier ici à tout moment.
            </p>
          </div>
        </div>
      )}

      {/* Note editor */}
      {briefing && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="text-base">📌</span>
              Note de la semaine
              <span className="text-[10px] font-normal text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                visible par tous les utilisateurs
              </span>
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveNote}
              disabled={noteSaving}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
                noteSaved
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
              )}
            >
              {noteSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : noteSaved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {noteSaved ? "Sauvegardée !" : "Sauvegarder la note"}
            </motion.button>
          </div>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Écris ici ta note personnelle pour la semaine... Elle s'affichera en haut du widget pour tous les utilisateurs."
            maxLength={600}
            rows={3}
            className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500/40 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>{noteText.length}/600 caractères</span>
            {!noteText && <span>Laisse vide pour ne rien afficher</span>}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("preview")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "preview" ? "bg-primary text-white shadow-glow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="w-4 h-4" />
          Aperçu
        </button>
        <button
          onClick={() => setTab("edit")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "edit" ? "bg-primary text-white shadow-glow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Code2 className="w-4 h-4" />
          Éditer JSON
        </button>
      </div>

      {/* Preview tab */}
      {tab === "preview" && briefing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
          <BriefingPreview briefing={briefing} />
        </motion.div>
      )}

      {/* Edit tab */}
      {tab === "edit" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                Édition JSON du briefing
              </p>
              <div className="flex items-center gap-2">
                {jsonError ? (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {jsonError}
                  </span>
                ) : (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> JSON valide
                  </span>
                )}
                <button
                  onClick={() => briefing && setJsonText(JSON.stringify(briefing, null, 2))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ↺ Réinitialiser
                </button>
              </div>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className={cn(
                "w-full bg-white/5 border rounded-lg px-3 py-3 text-xs font-mono resize-none focus:outline-none text-foreground leading-relaxed",
                jsonError ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-primary"
              )}
              rows={32}
              spellCheck={false}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{jsonText.split("\n").length} lignes · {jsonText.length} caractères</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                Brouillon = local uniquement · Publier = sauvegarde en base
              </span>
            </div>
          </div>

          {/* Action buttons at bottom for long editor */}
          <div className="flex justify-end gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveDraft}
              disabled={!!jsonError}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 border",
                draftSaved
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-white/5 hover:bg-white/10 text-foreground border-white/10"
              )}
            >
              {draftSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {draftSaved ? "Brouillon OK" : "Sauvegarder brouillon"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePublish}
              disabled={publishing || !!jsonError}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50",
                publishOk
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : publishOk ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {publishing ? "Publication..." : publishOk ? "Publié !" : "Publier le briefing"}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Empty */}
      {!briefing && !loading && !error && (
        <div className="glass-card p-12 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary/40 mx-auto" />
          <div>
            <p className="font-semibold text-lg">Aucun briefing pour cette semaine</p>
            <p className="text-muted-foreground text-sm mt-2">
              Clique sur <strong>Régénérer IA</strong> pour créer le briefing de la semaine.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
