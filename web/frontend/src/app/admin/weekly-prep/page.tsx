"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, Save, Eye, Code2, Loader2,
  AlertTriangle, CheckCircle, ChevronRight, ChevronDown,
  TrendingUp, TrendingDown, Minus, Calendar, BarChart2,
  Globe, Clock, Zap, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { weeklyPrepAPI, WeeklyBriefing } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── Preview renderer ──────────────────────────────────────────────────────────

function BriefingPreview({ briefing }: { briefing: WeeklyBriefing }) {
  const [activeMarket, setActiveMarket] = useState(0);
  const macroMeta = TREND[briefing.macro?.trend] ?? TREND.neutral;
  const MacroIcon = macroMeta.icon;

  return (
    <div className="space-y-4">
      {/* Macro */}
      <div className={cn("p-4 rounded-xl border", macroMeta.bg)}>
        <div className="flex items-center gap-2 mb-2">
          <MacroIcon className={cn("w-4 h-4", macroMeta.color)} />
          <span className={cn("text-sm font-semibold", macroMeta.color)}>
            Sentiment macro — {macroMeta.label}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{briefing.macro?.summary}</p>
        <ul className="mt-3 space-y-1">
          {(briefing.macro?.key_points ?? []).map((pt, i) => (
            <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Markets */}
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
        {briefing.markets?.[activeMarket] && (
          <div className="bg-white/5 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
                {briefing.markets[activeMarket].icon} {briefing.markets[activeMarket].name}
              </span>
              <TrendBadge trend={briefing.markets[activeMarket].trend} />
            </div>
            <p className="text-sm text-foreground/80">{briefing.markets[activeMarket].summary}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-0.5">Zones clés</p>
                <p className="text-xs">{briefing.markets[activeMarket].key_zones}</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                <p className="text-xs text-red-400 mb-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Risque
                </p>
                <p className="text-xs">{briefing.markets[activeMarket].risk}</p>
              </div>
            </div>
          </div>
        )}
      </Collapsible>

      {/* Watchlist */}
      <Collapsible title={`Watchlist (${briefing.watchlist?.length ?? 0})`} icon={TrendingUp}>
        <div className="space-y-2">
          {(briefing.watchlist ?? []).map((item, i) => {
            const meta = TREND[item.direction] ?? TREND.neutral;
            return (
              <div key={i} className="bg-white/5 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-mono font-bold border", meta.bg, meta.color)}>
                      {item.symbol}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[140px]">{item.name}</span>
                  </div>
                  <TrendBadge trend={item.direction} />
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-white/70 font-medium">Pourquoi : </span>{item.why}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-white/70 font-medium">Scénario : </span>{item.scenario}
                </p>
              </div>
            );
          })}
        </div>
      </Collapsible>

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
  const [error, setError]               = useState("");
  const [saveOk, setSaveOk]             = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // Try admin endpoint first (available once new backend is deployed)
      try {
        const data = await weeklyPrepAPI.adminPreview();
        applyFull(data);
        return;
      } catch (adminErr: any) {
        if (adminErr?.status === 403) { router.push("/admin"); return; }
        // Fallback to public endpoint (always works)
      }

      const [statusData, briefingData] = await Promise.all([
        weeklyPrepAPI.status(),
        weeklyPrepAPI.get(),
      ]);
      applyBasic(briefingData.briefing, statusData);
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
    setJsonError("");
  };

  const applyBasic = (b: WeeklyBriefing, status: { visible: boolean; week: string }) => {
    setBriefing(b);
    setMeta({ cached: true, generated_at: "", week_key: status.week, visible: status.visible });
    setJsonText(JSON.stringify(b, null, 2));
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

  const handleSave = async () => {
    setJsonError("");
    let parsed: WeeklyBriefing;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON invalide — corrigez la syntaxe avant de sauvegarder.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await weeklyPrepAPI.adminSave(parsed);
      setBriefing(parsed);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e: any) {
      if (e?.status === 404) {
        setError("Endpoint de sauvegarde non disponible — re-deploy le backend pour activer cette fonction.");
      } else {
        setError(e?.message || "Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving(false);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", regenerating && "animate-spin")} />
              Régénérer IA
            </button>
            {tab === "edit" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving || !!jsonError}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50",
                  saveOk
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveOk ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? "Sauvegarde..." : saveOk ? "Sauvegardé !" : "Sauvegarder"}
              </motion.button>
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
                Modifie n'importe quel champ puis clique Sauvegarder
              </span>
            </div>
          </div>

          {/* Save button repeated at bottom for long editor */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || !!jsonError}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50",
                saveOk
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveOk ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? "Sauvegarde..." : saveOk ? "Sauvegardé !" : "Sauvegarder les modifications"}
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
