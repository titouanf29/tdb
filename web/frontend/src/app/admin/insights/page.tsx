"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, Copy, Download, Play, Loader2,
  TrendingUp, TrendingDown, Newspaper, BarChart3, Gauge,
  ChevronDown, ChevronUp, Image, FileText, AlertTriangle,
  CheckCircle, Clock, Zap, Globe, Flame, Camera, Link2,
  BookOpen, LayoutDashboard, ScanLine, LineChart, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { insightsAPI, InsightsSnapshot, InsightsGenerated, InsightsBriefing, InsightsBriefingData } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month";
type Mode = "A" | "B" | "BRIEF";

interface AssetCard {
  name: string;
  ticker: string;
  last_price: number;
  change_pct: number;
  rsi: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(v: number) {
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}
function pctBg(v: number) {
  return v >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
}
function fgColor(v: number) {
  if (v <= 25) return "text-red-400";
  if (v <= 45) return "text-orange-400";
  if (v <= 55) return "text-yellow-400";
  if (v <= 75) return "text-green-400";
  return "text-emerald-400";
}
function heatColor(v: number) {
  if (v >= 7) return "text-red-400";
  if (v >= 5) return "text-orange-400";
  if (v >= 3) return "text-yellow-400";
  return "text-emerald-400";
}
function impactBadge(impact: string) {
  if (impact === "high") return "bg-red-500/20 text-red-300 border-red-500/30";
  if (impact === "medium") return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  return "bg-white/5 text-muted-foreground border-white/10";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RegionCard({ region, data }: { region: string; data: any }) {
  const [expanded, setExpanded] = useState(false);
  const top: AssetCard = data.top;
  const flop: AssetCard = data.flop;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-lg">{data.flag}</span>
          {data.label}
        </h3>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {top && (
          <div className={cn("p-2 rounded-lg border text-xs", pctBg(top.change_pct))}>
            <p className="text-muted-foreground mb-0.5">▲ Top</p>
            <p className="font-semibold truncate">{top.name}</p>
            <p className={cn("font-bold text-sm", pctColor(top.change_pct))}>
              {top.change_pct >= 0 ? "+" : ""}{top.change_pct.toFixed(1)}%
            </p>
          </div>
        )}
        {flop && (
          <div className={cn("p-2 rounded-lg border text-xs", pctBg(flop.change_pct))}>
            <p className="text-muted-foreground mb-0.5">▼ Flop</p>
            <p className="font-semibold truncate">{flop.name}</p>
            <p className={cn("font-bold text-sm", pctColor(flop.change_pct))}>
              {flop.change_pct >= 0 ? "+" : ""}{flop.change_pct.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 overflow-hidden"
          >
            {(data.assets || []).map((a: AssetCard) => (
              <div key={a.ticker} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <span className="text-muted-foreground truncate max-w-[120px]">{a.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground/60">RSI {a.rsi.toFixed(0)}</span>
                  <span className={cn("font-semibold", pctColor(a.change_pct))}>
                    {a.change_pct >= 0 ? "+" : ""}{a.change_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TOOL_ICONS: Record<string, any> = {
  "captentdb.fr/dashboard": LayoutDashboard,
  "captentdb.fr/markets":   Layers,
  "captentdb.fr/analysis":  LineChart,
  "captentdb.fr/scanner":   ScanLine,
  "captentdb.fr/portfolio": TrendingUp,
  "captentdb.fr/tools":     Zap,
  "captentdb.fr/learn":     BookOpen,
};

function ScriptSegment({ segment, index }: { segment: any; index: number }) {
  const typeColors: Record<string, string> = {
    geopolitique: "border-l-red-400",
    europe:       "border-l-blue-400",
    usa:          "border-l-green-400",
    crypto:       "border-l-orange-400",
    commodities:  "border-l-yellow-400",
    takeaway:     "border-l-purple-400",
    cta:          "border-l-primary",
  };
  const typeBg: Record<string, string> = {
    geopolitique: "bg-red-500/5",
    europe:       "bg-primary/5",
    usa:          "bg-green-500/5",
    crypto:       "bg-orange-500/5",
    commodities:  "bg-yellow-500/5",
    takeaway:     "bg-neon-purple/5",
    cta:          "bg-primary/5",
  };
  const color = typeColors[segment.type] || "border-l-white/20";
  const bg = typeBg[segment.type] || "";
  const ToolIcon = segment.tool_url ? (TOOL_ICONS[segment.tool_url] || Link2) : null;

  return (
    <div className={cn("pl-4 border-l-2 space-y-2 rounded-r-lg p-3", color, bg)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          {segment.label || segment.type}
        </span>
        {segment.duration_sec && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {segment.duration_sec}s
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed">{segment.text}</p>

      {/* Geopolitical note */}
      {segment.geo_note && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/8 border border-red-500/15">
          <Globe className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300/80 leading-relaxed">{segment.geo_note}</p>
        </div>
      )}

      {/* Visual instruction */}
      {segment.visual && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/8">
          <Camera className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground italic leading-relaxed">{segment.visual}</p>
        </div>
      )}

      {/* Tool link */}
      {segment.tool_url && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/8 border border-primary/20">
          {ToolIcon && <ToolIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-primary">{segment.tool_name || "CaptentDB"}</span>
            <span className="text-xs text-muted-foreground ml-1.5">→ {segment.tool_url}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartImage({ title, b64, icon: Icon }: { title: string; b64: string; icon: any }) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${b64}`;
    link.download = `captentdb-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  };

  if (!b64) return null;

  return (
    <div className="glass-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h4>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>
      </div>
      <img
        src={`data:image/png;base64,${b64}`}
        alt={title}
        className="w-full rounded-lg border border-white/8"
      />
    </div>
  );
}

// ─── Briefing View ────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  low:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  moderate: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  elevated: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  high:     "bg-red-500/20 text-red-300 border-red-500/30",
  extreme:  "bg-red-700/30 text-red-200 border-red-700/40",
};

const REGION_META: Record<string, { label: string; flag: string; color: string }> = {
  europe:      { label: "Europe",      flag: "🇪🇺", color: "border-l-blue-400" },
  usa:         { label: "États-Unis",  flag: "🇺🇸", color: "border-l-green-400" },
  crypto:      { label: "Crypto",      flag: "₿",   color: "border-l-orange-400" },
  commodities: { label: "Matières premières", flag: "🏗️", color: "border-l-yellow-400" },
};

const SENTIMENT_COLORS: Record<string, string> = {
  bullish:     "text-emerald-400",
  bearish:     "text-red-400",
  neutral:     "text-yellow-400",
  mixed:       "text-orange-400",
};

function BriefingView({ data, heatScore, fearGreed, news }: {
  data: InsightsBriefingData;
  heatScore: number;
  fearGreed: { value: number; label: string };
  news: any[];
}) {
  const [copiedBrief, setCopiedBrief] = useState(false);

  const buildBriefText = () => {
    const sep = "─".repeat(52);
    const dblSep = "═".repeat(52);
    const lines: string[] = [];
    lines.push(dblSep);
    lines.push("  BRIEFING BRUT — Géopolitique & Marchés");
    lines.push(`  Période : ${data.period}  ·  Risque : ${data.risk_level.toUpperCase()}`);
    lines.push(dblSep);
    lines.push("");
    lines.push(`🔺 ${data.headline}`);
    lines.push("");
    lines.push("SYNTHÈSE EXÉCUTIVE");
    lines.push(sep);
    lines.push(data.executive_summary);
    lines.push("");
    lines.push("🌍 CONTEXTE GÉOPOLITIQUE");
    lines.push(sep);
    lines.push(`Événement dominant : ${data.geopolitical.dominant_event}`);
    lines.push(`Mécanisme : ${data.geopolitical.mechanism}`);
    lines.push(`Perspectives : ${data.geopolitical.outlook}`);
    if (data.geopolitical.themes?.length) {
      lines.push(`Thèmes : ${data.geopolitical.themes.join(", ")}`);
    }
    lines.push("");
    for (const [key, meta] of Object.entries(REGION_META)) {
      const region = (data.regions as any)[key];
      if (!region) continue;
      lines.push(`${meta.flag} ${meta.label.toUpperCase()}`);
      lines.push(sep);
      lines.push(region.summary);
      lines.push(`Sentiment : ${region.sentiment}  |  Risque : ${region.key_risk}`);
      if (region.top_assets?.length) lines.push(`Actifs clés : ${region.top_assets.join(", ")}`);
      lines.push("");
    }
    lines.push("💡 THÈMES CLÉS");
    lines.push(sep);
    (data.key_themes || []).forEach((t: string, i: number) => lines.push(`${i + 1}. ${t}`));
    lines.push("");
    lines.push("📈 IMPLICATIONS DE TRADING");
    lines.push(sep);
    lines.push(data.trade_implications);
    lines.push("");
    lines.push(dblSep);
    lines.push(`Heat Score : ${heatScore.toFixed(1)}/10  ·  Fear & Greed : ${fearGreed.value} (${fearGreed.label})`);
    lines.push(`Généré par : ${data.generated_by}`);
    lines.push(dblSep);
    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildBriefText());
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header card */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Briefing Brut
              </h2>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold capitalize", RISK_COLORS[data.risk_level] || RISK_COLORS.moderate)}>
                Risque {data.risk_level}
              </span>
              {data.generated_by === "gemini" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">Gemini AI</span>
              )}
              {data.generated_by === "template" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground border border-white/10">Template</span>
              )}
            </div>
            <p className="text-base font-semibold text-foreground/90 leading-snug">{data.headline}</p>
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all flex-shrink-0",
              copiedBrief
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground"
            )}
          >
            {copiedBrief ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedBrief ? "Copié !" : "Copier"}
          </button>
        </div>

        {/* Executive summary */}
        <div className="p-4 rounded-xl bg-primary/8 border border-primary/15">
          <p className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">Synthèse exécutive</p>
          <p className="text-sm leading-relaxed text-foreground/85">{data.executive_summary}</p>
        </div>

        {/* Sentiment metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase">Heat Score</p>
            <p className={cn("text-2xl font-bold", heatColor(heatScore))}>{heatScore.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">/10</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase">Fear & Greed</p>
            <p className={cn("text-2xl font-bold", fgColor(fearGreed.value))}>{fearGreed.value}</p>
            <p className="text-[10px] text-muted-foreground">{fearGreed.label}</p>
          </div>
          <div className="glass-card p-3 col-span-2 md:col-span-1">
            <p className="text-[10px] text-muted-foreground mb-1.5 uppercase">Thèmes clés</p>
            <div className="flex flex-wrap gap-1">
              {(data.key_themes || []).slice(0, 4).map((theme: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Geopolitical section */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-red-400" />
          Contexte géopolitique
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-xs w-36 flex-shrink-0 pt-0.5">Événement dominant</span>
            <span className="font-medium">{data.geopolitical.dominant_event}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-xs w-36 flex-shrink-0 pt-0.5">Mécanisme</span>
            <span className="text-foreground/80">{data.geopolitical.mechanism}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-xs w-36 flex-shrink-0 pt-0.5">Perspectives</span>
            <span className="text-foreground/80">{data.geopolitical.outlook}</span>
          </div>
        </div>
        {(data.geopolitical.signals || []).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signaux</p>
            <ul className="space-y-1">
              {data.geopolitical.signals.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(data.geopolitical.themes || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.geopolitical.themes.map((t: string, i: number) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Region breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(REGION_META).map(([key, meta]) => {
          const region = (data.regions as any)[key];
          if (!region) return null;
          const sentimentKey = (region.sentiment || "").toLowerCase();
          return (
            <div key={key} className={cn("glass-card p-4 pl-5 border-l-2 space-y-2", meta.color)}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-base">{meta.flag}</span>
                  {meta.label}
                </h4>
                <span className={cn("text-xs font-semibold capitalize", SENTIMENT_COLORS[sentimentKey] || "text-muted-foreground")}>
                  {region.sentiment}
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{region.summary}</p>
              {(region.top_assets || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {region.top_assets.map((a: string, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-muted-foreground border border-white/10">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-400" />
                {region.key_risk}
              </p>
            </div>
          );
        })}
      </div>

      {/* Trade implications */}
      <div className="glass-card p-5 space-y-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Implications de trading
        </h3>
        <p className="text-sm leading-relaxed text-foreground/85">{data.trade_implications}</p>
      </div>

      {/* News used */}
      {news?.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Newspaper className="w-4 h-4 text-primary" />
            Actualités analysées
          </h3>
          <div className="space-y-2">
            {news.slice(0, 6).map((n: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5", impactBadge(n.impact))}>
                  {n.impact?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const router = useRouter();

  const [period, setPeriod] = useState<Period>("week");
  const [mode, setMode] = useState<Mode>("A");
  const [customContext, setCustomContext] = useState("");
  const [includeCharts, setIncludeCharts] = useState(true);

  const [snapshot, setSnapshot] = useState<InsightsSnapshot | null>(null);
  const [generated, setGenerated] = useState<InsightsGenerated | null>(null);
  const [briefing, setBriefing] = useState<InsightsBriefing | null>(null);
  const [editedScript, setEditedScript] = useState("");

  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [scriptTab, setScriptTab] = useState<"doc" | "edit">("doc");

  const scriptRef = useRef<HTMLTextAreaElement>(null);

  // Load snapshot on mount / period change
  const loadSnapshot = async () => {
    setLoadingSnapshot(true);
    setError("");
    try {
      const data = await insightsAPI.snapshot(period);
      setSnapshot(data);
    } catch (e: any) {
      setError(e?.message || "Erreur lors du chargement du snapshot");
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const buildRichScript = (script: any, data: InsightsGenerated): string => {
    const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const modeLabel = data.mode === "A" ? "60-sec Blitz" : "Deep Diver";
    const periodMap: Record<string, string> = { day: "24h", week: "Semaine", month: "Mois" };
    const periodLabel = periodMap[data.period] || data.period;

    const segEmoji: Record<string, string> = {
      geopolitique: "🌍",
      europe:       "🇪🇺",
      usa:          "🇺🇸",
      crypto:       "₿",
      commodities:  "🏗️",
      takeaway:     "💡",
      cta:          "🔗",
    };

    const sep = "─".repeat(52);
    const dblSep = "═".repeat(52);
    const lines: string[] = [];

    // Header
    lines.push(dblSep);
    lines.push(`  CAPTENTDB — Script TikTok/Reels`);
    lines.push(`  ${now}  ·  ${periodLabel}  ·  Mode ${modeLabel}`);
    lines.push(dblSep);
    lines.push("");

    // Geopolitical context block
    if (script.geo_context) {
      lines.push("┌─ 🌍 CONTEXTE GÉOPOLITIQUE / MACRO ─────────────────┐");
      const geoLines = script.geo_context.match(/.{1,50}(\s|$)/g) || [script.geo_context];
      for (const l of geoLines) {
        lines.push(`│  ${l.trimEnd().padEnd(49)}│`);
      }
      lines.push("└────────────────────────────────────────────────────┘");
      lines.push("");
    }

    // Hook
    lines.push(`🎣 HOOK  (0 → 5 sec)`);
    lines.push(sep);
    lines.push(script.hook || "");
    lines.push("");

    // Segments with cumulative timing
    let cursor = 5;
    for (const seg of script.segments || []) {
      const emoji = segEmoji[seg.type] || "📌";
      const dur = seg.duration_sec || 10;
      const tStart = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
      const tEnd   = `${String(Math.floor((cursor + dur) / 60)).padStart(2, "0")}:${String((cursor + dur) % 60).padStart(2, "0")}`;

      lines.push(`${emoji} ${(seg.label || seg.type).toUpperCase()}  (${tStart} → ${tEnd})`);
      lines.push(sep);
      lines.push("");
      lines.push(seg.text || "");
      lines.push("");

      if (seg.geo_note) {
        lines.push(`  🌍 Contexte : ${seg.geo_note}`);
      }
      if (seg.visual) {
        lines.push(`  📸 Réalisation : ${seg.visual}`);
      }
      if (seg.tool_url) {
        lines.push(`  🔗 Outil à filmer : ${seg.tool_name ? seg.tool_name + " — " : ""}${seg.tool_url}`);
      }
      lines.push("");

      cursor += dur;
    }

    // Stats footer
    const allText = [script.hook, ...(script.segments || []).map((s: any) => s.text)].filter(Boolean).join(" ");
    const wordCount = allText.trim().split(/\s+/).length;
    const captentMentions = (allText.toLowerCase().match(/captentdb/g) || []).length;

    lines.push(dblSep);
    lines.push(`⏱️  Durée totale : ~${script.total_duration_sec || cursor} secondes`);
    lines.push(`📝  Mots : ~${wordCount}`);
    lines.push(`🌐  Mentions CaptentDB : ${captentMentions}`);
    lines.push(`🔗  captentdb.fr`);
    lines.push(dblSep);

    return lines.join("\n");
  };

  const handleGenerate = async () => {
    setLoadingGenerate(true);
    setError("");
    setBriefing(null);
    try {
      const data = await insightsAPI.generate({
        period,
        mode: mode as "A" | "B",
        custom_context: customContext,
        include_charts: includeCharts,
      });
      setGenerated(data);

      setEditedScript(buildRichScript(data.script, data));
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la génération");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleBrief = async () => {
    setLoadingBrief(true);
    setError("");
    try {
      const data = await insightsAPI.brief({ period, custom_context: customContext });
      setBriefing(data);
      setGenerated(null);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la génération du briefing");
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Insight Engine
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 ml-1">
                ADMIN ONLY
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Génère des scripts TikTok/Reels + graphiques prêts à filmer — propulsé par les données réelles des marchés.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            Gratuit — yfinance + Gemini Flash
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Period */}
        <div className="glass-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Période</p>
          <div className="flex gap-2">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  period === p
                    ? "bg-primary text-white shadow-glow-sm"
                    : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                )}
              >
                {p === "day" ? "24h" : p === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="glass-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("A")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "A" ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10 text-muted-foreground"
              )}
            >
              ⚡ 60-sec
            </button>
            <button
              onClick={() => setMode("B")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "B" ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10 text-muted-foreground"
              )}
            >
              🎬 Deep
            </button>
            <button
              onClick={() => setMode("BRIEF")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                mode === "BRIEF" ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10 text-muted-foreground"
              )}
            >
              📋 Briefing
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "A" ? "Script unique ~60 secondes" : mode === "B" ? "Série de 3 vidéos avec bridge hooks" : "Bilan géopolitique & économique brut, sans consignes vidéo"}
          </p>
        </div>

        {/* Options */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</p>
          {mode !== "BRIEF" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Générer les graphiques</span>
            </label>
          )}
          {mode === "BRIEF" && (
            <p className="text-xs text-primary/80">
              Mode briefing — analyse brute sans instructions vidéo ni CTA
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={loadSnapshot}
              disabled={loadingSnapshot}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loadingSnapshot && "animate-spin")} />
              Snapshot
            </button>
            {mode === "BRIEF" ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBrief}
                disabled={loadingBrief}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary hover:bg-primary text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loadingBrief ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                Briefer
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={loadingGenerate}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loadingGenerate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Générer
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Context input */}
      <div className="glass-card p-4">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Contexte additionnel (optionnel)
        </label>
        <textarea
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          placeholder="Ex: 'Focus sur la rotation Energy vs Tech cette semaine. Mentionner le niveau 74K sur BTC...'"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
          rows={2}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {(loadingGenerate || loadingBrief) && (
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <Loader2 className={cn("w-10 h-10 animate-spin", loadingBrief ? "text-primary" : "text-yellow-500")} />
          <div className="text-center">
            <p className="font-semibold">{loadingBrief ? "Briefing en cours..." : "Génération en cours..."}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {loadingBrief
                ? "Récupération des données · Analyse géopolitique · Synthèse économique"
                : "Récupération des données · Analyse IA · Génération des graphiques"}
            </p>
          </div>
        </div>
      )}

      {/* Snapshot section */}
      {snapshot && !loadingGenerate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Sentiment bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Heat Score</p>
              <p className={cn("text-3xl font-bold", heatColor(snapshot.heat_score))}>
                {snapshot.heat_score.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">/10</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Fear & Greed</p>
              <p className={cn("text-3xl font-bold", fgColor(snapshot.fear_greed.value))}>
                {snapshot.fear_greed.value}
              </p>
              <p className="text-xs text-muted-foreground">{snapshot.fear_greed.label}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Actifs analysés</p>
              <p className="text-3xl font-bold text-primary">
                {Object.values(snapshot.snapshot).reduce((acc: number, r: any) => acc + (r.assets?.length || 0), 0)}
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Actualités</p>
              <p className="text-3xl font-bold text-primary">{snapshot.news?.length || 0}</p>
              <p className="text-xs text-muted-foreground">high/medium impact</p>
            </div>
          </div>

          {/* Region cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(snapshot.snapshot).map(([key, data]: [string, any]) => (
              <RegionCard key={key} region={key} data={data} />
            ))}
          </div>

          {/* News */}
          {snapshot.news?.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Newspaper className="w-4 h-4 text-primary" />
                Actualités macro
              </h3>
              <div className="space-y-2">
                {snapshot.news.slice(0, 6).map((n: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5", impactBadge(n.impact))}>
                      {n.impact.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Generated content */}
      {generated && !loadingGenerate && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Script output */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-500" />
                Script {mode === "A" ? "60-sec Blitz" : "Deep Diver"}
                {generated.script.generated_by === "gemini" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    Gemini AI
                  </span>
                )}
                {generated.script.generated_by === "template" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground border border-white/10">
                    Template
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                  )}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>

            {/* Hook badge */}
            {generated.script.hook && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-semibold text-yellow-400 mb-1">🎣 HOOK</p>
                <p className="text-sm font-medium leading-relaxed">{generated.script.hook}</p>
              </div>
            )}

            {/* Segments */}
            <div className="space-y-5">
              {(generated.script.segments || []).map((seg: any, i: number) => (
                <ScriptSegment key={i} segment={seg} index={i} />
              ))}
            </div>

            {/* Duration */}
            {generated.script.total_duration_sec && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-white/8">
                <Clock className="w-3.5 h-3.5" />
                Durée totale estimée : {generated.script.total_duration_sec}s
              </div>
            )}

            {/* ── Script brut enrichi ── */}
            <div className="space-y-3 pt-2 border-t border-white/8">
              {/* Section header + tabs */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Script brut
                </p>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setScriptTab("doc")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all",
                      scriptTab === "doc"
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    📄 Document
                  </button>
                  <button
                    onClick={() => setScriptTab("edit")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all",
                      scriptTab === "edit"
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ✏️ Éditer
                  </button>
                </div>
              </div>

              {/* Geopolitical context banner */}
              {generated.script.geo_context && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                  <Globe className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-0.5 uppercase tracking-wide">Contexte géopolitique</p>
                    <p className="text-xs text-red-300/80 leading-relaxed">{generated.script.geo_context}</p>
                  </div>
                </div>
              )}

              {/* Document view */}
              {scriptTab === "doc" && (
                <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
                  {/* Doc header */}
                  <div className="px-4 py-3 bg-white/5 border-b border-white/8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Mode {generated.mode === "A" ? "⚡ 60-sec" : "🎬 Deep Diver"}
                        · {generated.period === "day" ? "24h" : generated.period === "week" ? "Semaine" : "Mois"}
                        · {generated.script.total_duration_sec}s
                      </span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className={cn(
                        "flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all",
                        copied ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copié" : "Copier"}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-1 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap max-h-[520px] overflow-y-auto">
                    {editedScript}
                  </div>

                  {/* Stats bar */}
                  {(() => {
                    const allText = [generated.script.hook, ...(generated.script.segments || []).map((s: any) => s.text)].filter(Boolean).join(" ");
                    const wc = allText.trim().split(/\s+/).length;
                    const mentions = (allText.toLowerCase().match(/captentdb/g) || []).length;
                    const toolCount = (generated.script.segments || []).filter((s: any) => s.tool_url).length;
                    return (
                      <div className="px-4 py-2 border-t border-white/8 bg-white/3 flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {generated.script.total_duration_sec}s</span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> ~{wc} mots</span>
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-yellow-500" /> {mentions}× CaptentDB</span>
                        <span className="flex items-center gap-1"><Link2 className="w-3 h-3 text-primary" /> {toolCount} outils référencés</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Edit view */}
              {scriptTab === "edit" && (
                <div className="space-y-2">
                  <textarea
                    ref={scriptRef}
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-xs font-mono resize-none focus:outline-none focus:border-primary text-foreground leading-relaxed"
                    rows={22}
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {editedScript.trim().split(/\s+/).length} mots · {editedScript.length} caractères
                    </span>
                    <button
                      onClick={() => setEditedScript(buildRichScript(generated.script, generated))}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ↺ Réinitialiser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          {generated.charts && Object.values(generated.charts).some(Boolean) && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Image className="w-5 h-5 text-yellow-500" />
                Graphiques TikTok-ready
              </h2>
              <p className="text-sm text-muted-foreground">
                Clique sur PNG pour télécharger chaque graphique. Watermark captentdb.fr inclus.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartImage title="Performance marchés" b64={generated.charts.performance} icon={BarChart3} />
                <ChartImage title="Heatmap sectorielle" b64={generated.charts.heatmap} icon={Flame} />
                <ChartImage title="Fear & Greed" b64={generated.charts.fear_greed} icon={Gauge} />
                <ChartImage title="Top actif" b64={generated.charts.top_asset} icon={TrendingUp} />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Briefing result */}
      {briefing && !loadingBrief && (
        <BriefingView
          data={briefing.briefing}
          heatScore={briefing.heat_score}
          fearGreed={briefing.fear_greed}
          news={briefing.news}
        />
      )}

      {/* Empty state */}
      {!snapshot && !generated && !briefing && !loadingSnapshot && !loadingGenerate && !loadingBrief && (
        <div className="glass-card p-12 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-yellow-500/40 mx-auto" />
          <div>
            <p className="font-semibold text-lg">Prêt à générer</p>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Clique sur <strong>Snapshot</strong> pour charger les données du marché,
              ou directement sur <strong>Générer</strong> pour créer ton script TikTok en une seule étape.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button onClick={loadSnapshot} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
              📊 Charger le snapshot
            </button>
            <button onClick={handleGenerate} className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors">
              ⚡ Générer un script
            </button>
            <button onClick={handleBrief} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary text-white font-bold text-sm transition-colors">
              📋 Briefing brut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
