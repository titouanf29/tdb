"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";
import {
  BookOpen, Plus, TrendingUp, TrendingDown,
  Target, DollarSign, Image as ImageIcon,
  X, Search, Trash2, Edit2,
  CheckCircle2, XCircle, MinusCircle, Upload, Eye, EyeOff,
  Calendar, Clock, Zap, StickyNote, Filter, HelpCircle,
  ChevronRight, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { journalAPI, JournalEntry, JournalStats, JournalEntryCreate } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n?: number | null, dec = 2) =>
  n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtPnl = (n?: number | null) => {
  if (n == null) return "—";
  const s = Math.abs(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n >= 0 ? "+" : "−") + "$" + s;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtTime = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

const RESULT_META_BASE = {
  win:       { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  loss:      { color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         icon: XCircle       },
  breakeven: { color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",   icon: MinusCircle   },
};

const TIMEFRAMES = ["1m","5m","15m","30m","1h","4h","1d","1w"];
const SETUPS     = ["Breakout","Reversal","Trend Following","Range","Support/Résistance","Pattern","News","Autre"];

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  onEdit: (e: JournalEntry) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useLanguage();
  const [showScreenshot, setShowScreenshot] = useState(false);
  const RESULT_META = {
    win:       { label: t("journal_win"),       ...RESULT_META_BASE.win },
    loss:      { label: t("journal_loss"),      ...RESULT_META_BASE.loss },
    breakeven: { label: t("journal_breakeven"), ...RESULT_META_BASE.breakeven },
  };
  const meta = entry.result ? RESULT_META[entry.result] : null;
  const ResultIcon = meta?.icon ?? MinusCircle;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="glass-card p-5 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border",
            entry.direction === "LONG"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}>
            {entry.direction === "LONG"
              ? <TrendingUp className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />}
            {entry.direction}
          </div>
          <span className="font-bold text-lg">{entry.symbol}</span>
          {entry.timeframe && (
            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md">
              {entry.timeframe}
            </span>
          )}
          {entry.setup && (
            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md hidden sm:inline">
              {entry.setup}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meta && (
            <span className={cn("flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border", meta.bg, meta.color)}>
              <ResultIcon className="w-3.5 h-3.5" />
              {meta.label}
            </span>
          )}
          <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{t("journal_entry")}</p>
          <p className="font-medium">{entry.entry_price ? "$" + fmt(entry.entry_price) : "—"}</p>
          {entry.entry_time && <p className="text-xs text-muted-foreground">{fmtTime(entry.entry_time)}</p>}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{t("journal_exit")}</p>
          <p className="font-medium">{entry.exit_price ? "$" + fmt(entry.exit_price) : "—"}</p>
          {entry.exit_time && <p className="text-xs text-muted-foreground">{fmtTime(entry.exit_time)}</p>}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">R:R</p>
          <p className={cn("font-bold", entry.risk_reward && entry.risk_reward >= 1 ? "text-emerald-400" : "text-muted-foreground")}>
            {entry.risk_reward ? `1:${fmt(entry.risk_reward)}` : "—"}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">P&L</p>
          <p className={cn("font-bold", entry.pnl == null ? "" : entry.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            {fmtPnl(entry.pnl)}
          </p>
        </div>
      </div>

      {/* Pre-trade notes */}
      {entry.pre_trade_notes && (
        <div className="bg-white/5 rounded-lg p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5" /> Analyse avant trade
          </p>
          <p className="text-sm text-foreground/80 whitespace-pre-line">{entry.pre_trade_notes}</p>
        </div>
      )}

      {/* Post-trade notes */}
      {entry.post_trade_notes && (
        <div className={cn(
          "rounded-lg p-3 space-y-1 border",
          meta ? meta.bg : "bg-white/5 border-white/10"
        )}>
          <p className={cn("text-xs font-medium flex items-center gap-1.5", meta?.color ?? "text-muted-foreground")}>
            <ResultIcon className="w-3.5 h-3.5" /> Retour d'expérience
          </p>
          <p className="text-sm text-foreground/80 whitespace-pre-line">{entry.post_trade_notes}</p>
        </div>
      )}

      {/* Screenshot */}
      {entry.screenshot && (
        <div>
          <button
            onClick={() => setShowScreenshot(v => !v)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            {showScreenshot ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showScreenshot ? t("analysis_hide") : t("journal_screenshot")}
          </button>
          {showScreenshot && (
            <motion.img
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              src={entry.screenshot}
              alt="Trade screenshot"
              className="mt-2 rounded-xl border border-white/10 w-full object-contain max-h-80"
            />
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{fmtDate(entry.created_at)}</p>
    </motion.div>
  );
}

// ── Symbol autocomplete ───────────────────────────────────────────────────────

function SymbolAutocomplete({
  value,
  onChange,
  symbols,
  userSymbols,
}: {
  value: string;
  onChange: (v: string) => void;
  symbols: string[];
  userSymbols: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.length < 1
    ? symbols.slice(0, 12)
    : symbols.filter(s => s.includes(query.toUpperCase())).slice(0, 12);

  const handleInput = (v: string) => {
    const up = v.toUpperCase();
    setQuery(up);
    onChange(up);
    setOpen(true);
  };

  const select = (s: string) => {
    setQuery(s);
    onChange(s);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        className="w-full input uppercase font-bold"
        placeholder="BTC-USD, XLK, EURUSD=X…"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        required
        autoComplete="off"
      />
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 w-full mt-1 glass-card border border-white/10 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
          >
            {filtered.map(s => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={() => select(s)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between",
                    s === value && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="font-mono font-medium">{s}</span>
                  {userSymbols.includes(s) && (
                    <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">récent</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Help guide ────────────────────────────────────────────────────────────────

const JOURNAL_HELP = [
  { icon: BookOpen,    title: "Documenter chaque trade", desc: "Notez la raison du trade AVANT d'entrer. Décrivez le setup, les confluences, le contexte de marché." },
  { icon: Target,      title: "R:R — Ratio Risque/Récompense", desc: "1:2 signifie que vous visez 2x votre risque. Visez minimum 1:1.5 pour être rentable à long terme même avec 50% de win rate." },
  { icon: CheckCircle2,title: "Analyse post-trade", desc: "Après chaque trade, notez ce qui s'est passé. Avez-vous respecté votre plan ? Qu'auriez-vous pu faire mieux ?" },
  { icon: ImageIcon,   title: "Capture d'écran", desc: "Ajoutez une capture de votre graphique au moment du trade. C'est le meilleur moyen de revoir vos décisions." },
  { icon: DollarSign,  title: "Suivi du P&L", desc: "Suivez vos gains/pertes pour calculer vos stats globales : win rate, espérance mathématique, etc." },
];

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative glass-card w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Guide du Journal de Trading
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          Un journal de trading est l'outil numéro 1 pour progresser. Les traders professionnels notent <strong>chaque trade</strong> pour identifier leurs patterns et corriger leurs erreurs.
        </p>
        <div className="space-y-3">
          {JOURNAL_HELP.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 bg-white/5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          💡 <strong>Conseil :</strong> Les traders qui tiennent un journal améliorent leur performance de 20 à 40% en 3 mois.
        </div>
      </motion.div>
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM: JournalEntryCreate = {
  symbol: "",
  direction: "LONG",
  timeframe: undefined,
  setup: undefined,
  entry_time: undefined,
  exit_time: undefined,
  entry_price: undefined,
  exit_price: undefined,
  quantity: undefined,
  risk_reward: undefined,
  result: undefined,
  pnl: undefined,
  pre_trade_notes: undefined,
  post_trade_notes: undefined,
  screenshot: undefined,
};

function JournalForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: JournalEntry;
  onSave: (data: JournalEntryCreate) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<JournalEntryCreate>(
    initial
      ? {
          symbol: initial.symbol,
          direction: initial.direction,
          timeframe: initial.timeframe,
          setup: initial.setup,
          entry_time: initial.entry_time,
          exit_time: initial.exit_time,
          entry_price: initial.entry_price,
          exit_price: initial.exit_price,
          quantity: initial.quantity,
          risk_reward: initial.risk_reward,
          result: initial.result,
          pnl: initial.pnl,
          pre_trade_notes: initial.pre_trade_notes,
          post_trade_notes: initial.post_trade_notes,
          screenshot: initial.screenshot,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [userSymbols, setUserSymbols] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    journalAPI.list().then(res => {
      // fallback: build from entries if symbols endpoint not yet available
    }).catch(() => {});
    // Load symbols for autocomplete
    fetch("/api/journal/symbols", {
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("tdb_token") || "" : ""}` },
    })
      .then(r => r.json())
      .then(d => { setSymbols(d.symbols || []); setUserSymbols(d.user_symbols || []); })
      .catch(() => {});
  }, []);

  const set = <K extends keyof JournalEntryCreate>(k: K, v: JournalEntryCreate[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Image trop lourde (max 3 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("screenshot", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol.trim()) return setError("Symbole requis");
    setError("");
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 glass-card border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {initial ? t("edit") + " " + t("journal_new").toLowerCase() : t("journal_new")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Symbol + direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("journal_symbol")} *</label>
              <SymbolAutocomplete
                value={form.symbol}
                onChange={v => set("symbol", v)}
                symbols={symbols}
                userSymbols={userSymbols}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("journal_direction")} *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["LONG","SHORT"] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("direction", d)}
                    className={cn(
                      "py-2.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-1.5",
                      form.direction === d
                        ? d === "LONG"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500 bg-red-500/10 text-red-400"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {d === "LONG" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeframe + Setup */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />Timeframe
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => set("timeframe", form.timeframe === tf ? undefined : tf)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                      form.timeframe === tf
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Zap className="w-3.5 h-3.5 inline mr-1" />Setup
              </label>
              <select
                className="w-full input text-sm"
                value={form.setup ?? ""}
                onChange={e => set("setup", e.target.value || undefined)}
              >
                <option value="">— Choisir —</option>
                {SETUPS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />{t("journal_entry")}
              </label>
              <input
                type="datetime-local"
                className="w-full input text-sm"
                value={form.entry_time?.slice(0,16) ?? ""}
                onChange={e => set("entry_time", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />Sortie (heure)
              </label>
              <input
                type="datetime-local"
                className="w-full input text-sm"
                value={form.exit_time?.slice(0,16) ?? ""}
                onChange={e => set("exit_time", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Prix d'entrée ($)</label>
              <input
                type="number" step="any" min="0"
                className="w-full input text-sm"
                placeholder="0.00"
                value={form.entry_price ?? ""}
                onChange={e => set("entry_price", e.target.value ? +e.target.value : undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Prix de sortie ($)</label>
              <input
                type="number" step="any" min="0"
                className="w-full input text-sm"
                placeholder="0.00"
                value={form.exit_price ?? ""}
                onChange={e => set("exit_price", e.target.value ? +e.target.value : undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Quantité</label>
              <input
                type="number" step="any" min="0"
                className="w-full input text-sm"
                placeholder="0.00"
                value={form.quantity ?? ""}
                onChange={e => set("quantity", e.target.value ? +e.target.value : undefined)}
              />
            </div>
          </div>

          {/* R:R + P&L + Result */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Target className="w-3.5 h-3.5 inline mr-1" />R:R (ex: 2.5)
              </label>
              <input
                type="number" step="0.1" min="0"
                className="w-full input text-sm"
                placeholder="1:?"
                value={form.risk_reward ?? ""}
                onChange={e => set("risk_reward", e.target.value ? +e.target.value : undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <DollarSign className="w-3.5 h-3.5 inline mr-1" />P&L ($)
              </label>
              <input
                type="number" step="any"
                className="w-full input text-sm"
                placeholder="±0.00"
                value={form.pnl ?? ""}
                onChange={e => set("pnl", e.target.value ? +e.target.value : undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Résultat</label>
              <div className="flex gap-1.5">
                {(["win","loss","breakeven"] as const).map(r => {
                  const m = RESULT_META[r];
                  const Icon = m.icon;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set("result", form.result === r ? undefined : r)}
                      className={cn(
                        "flex-1 py-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1",
                        form.result === r ? cn(m.bg, m.color) : "border-white/10 hover:border-white/20"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {r === "win" ? "Gain" : r === "loss" ? "Perte" : "≈"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pre-trade notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <StickyNote className="w-3.5 h-3.5 inline mr-1" />Analyse / Raison du trade
            </label>
            <textarea
              rows={3}
              className="w-full input text-sm resize-none"
              placeholder="Pourquoi ce trade ? Quel setup, quelle confluence..."
              value={form.pre_trade_notes ?? ""}
              onChange={e => set("pre_trade_notes", e.target.value || undefined)}
            />
          </div>

          {/* Post-trade notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <BookOpen className="w-3.5 h-3.5 inline mr-1" />Commentaire après le trade
            </label>
            <textarea
              rows={3}
              className="w-full input text-sm resize-none"
              placeholder="Ce qui s'est passé, ce qu'on aurait pu faire mieux..."
              value={form.post_trade_notes ?? ""}
              onChange={e => set("post_trade_notes", e.target.value || undefined)}
            />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <ImageIcon className="w-3.5 h-3.5 inline mr-1" />Capture d'écran
            </label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {form.screenshot ? (
              <div className="relative">
                <img
                  src={form.screenshot}
                  alt="preview"
                  className="w-full max-h-52 object-contain rounded-xl border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => set("screenshot", undefined)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-red-500/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez pour ajouter une capture</span>
                <span className="text-xs text-muted-foreground/60">PNG, JPG, WEBP — max 3 Mo</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-50"
            >
              {saving ? "Sauvegarde…" : initial ? "Enregistrer" : "Ajouter au journal"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterResult, setFilterResult] = useState<string>("");
  const [searchSymbol, setSearchSymbol] = useState("");

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | undefined>();
  const [showHelp, setShowHelp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, statsRes] = await Promise.all([
        journalAPI.list({
          result: filterResult || undefined,
          symbol: searchSymbol.trim() || undefined,
        }),
        journalAPI.getStats(),
      ]);
      setEntries(entriesRes.entries);
      setStats(statsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterResult, searchSymbol]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: JournalEntryCreate) => {
    await journalAPI.create(data);
    setShowForm(false);
    load();
  };

  const handleUpdate = async (data: JournalEntryCreate) => {
    if (!editEntry) return;
    await journalAPI.update(editEntry.id, data);
    setEditEntry(undefined);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce trade du journal ?")) return;
    await journalAPI.delete(id);
    load();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Journal de Trading
            <button
              onClick={() => setShowHelp(true)}
              className="p-1 rounded-full text-muted-foreground hover:text-primary transition-colors"
              title="Comment utiliser le journal ?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documentez, analysez et progressez sur chaque trade
          </p>
        </div>
        <button
          onClick={() => { setEditEntry(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau trade</span>
        </button>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard
            label="Trades"
            value={String(stats.total)}
            sub={`${stats.wins}G · ${stats.losses}P · ${stats.breakevens}N`}
          />
          <StatCard
            label="Win Rate"
            value={`${stats.win_rate}%`}
            color={stats.win_rate >= 50 ? "text-emerald-400" : "text-red-400"}
          />
          <StatCard
            label="P&L Total"
            value={fmtPnl(stats.total_pnl)}
            color={stats.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <StatCard
            label="R:R moyen"
            value={stats.avg_rr > 0 ? `1:${fmt(stats.avg_rr)}` : "—"}
            color={stats.avg_rr >= 1 ? "text-emerald-400" : "text-muted-foreground"}
          />
          <StatCard
            label="Meilleur trade"
            value={fmtPnl(stats.best_trade)}
            color="text-emerald-400"
          />
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full input pl-9 text-sm"
            placeholder="Rechercher un actif…"
            value={searchSymbol}
            onChange={e => setSearchSymbol(e.target.value.toUpperCase())}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(["","win","loss","breakeven"] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterResult(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                filterResult === r
                  ? r === "win"   ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : r === "loss"  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : r === "breakeven" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                  : "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              {r === "" ? "Tous" : r === "win" ? "Gains" : r === "loss" ? "Pertes" : "Neutres"}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">
              {filterResult || searchSymbol ? "Aucun trade trouvé" : "Votre journal est vide"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {filterResult || searchSymbol
                ? "Essayez d'autres filtres"
                : "Commencez à documenter vos trades pour progresser"}
            </p>
          </div>
          {!filterResult && !searchSymbol && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all"
            >
              Ajouter mon premier trade
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {entries.length} trade{entries.length > 1 ? "s" : ""}
          </p>
          <AnimatePresence mode="popLayout">
            {entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={e => { setEditEntry(e); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <JournalForm
            initial={editEntry}
            onSave={editEntry ? handleUpdate : handleCreate}
            onClose={() => { setShowForm(false); setEditEntry(undefined); }}
          />
        )}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
