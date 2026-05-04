"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Edit3,
  Trash2,
  DollarSign,
  BarChart3,
  PieChart,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Activity,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Info,
  Search,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  portfolioAPI,
  RealPosition,
  PortfolioSummary,
  CreatePositionData,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { authHeaders } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";

// â"€â"€ helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n: number) {
  return (n >= 0 ? "+" : "") + fmt(n) + "%";
}

// Pie chart â€" pure SVG, no lib dependency
function PieChart2D({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { lang } = useLanguage();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let angle = -Math.PI / 2;
  const cx = 80, cy = 80, r = 70;

  const slices = data.map((d) => {
    const pct = d.value / total;
    const sweep = pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep);
    const y2 = cy + r * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle += sweep;
    return { ...d, path, pct };
  });

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[180px]">
      {slices.map((s) => (
        <path key={s.label} d={s.path} fill={s.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
      ))}
      <circle cx={cx} cy={cy} r={40} fill="hsl(220 50% 6%)" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-[10px]" fontSize="10">
        {data.length}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[8px]" fontSize="8">
        {t("portfolio_assets_label")}
      </text>
    </svg>
  );
}

const PIE_COLORS = [
  "#638cff", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#84cc16",
];

// â"€â"€ Add / Edit modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface PositionFormProps {
  initial?: Partial<CreatePositionData>;
  onClose: () => void;
  onSave: (data: CreatePositionData) => Promise<void>;
  title: string;
}

function PositionForm({ initial, onClose, onSave, title }: PositionFormProps) {
  const { t, lang } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const normalizeDate = (value?: string) => {
    if (!value) return today;
    return value.slice(0, 10);
  };
  const [form, setForm] = useState<CreatePositionData>({
    symbol: initial?.symbol ?? "",
    position_type: initial?.position_type ?? "long",
    quantity: initial?.quantity ?? 1,
    entry_price: initial?.entry_price ?? 0,
    entry_date: normalizeDate(initial?.entry_date),
    leverage: initial?.leverage ?? 1,
    broker: initial?.broker ?? "",
    notes: initial?.notes ?? "",
    stop_loss: initial?.stop_loss,
    take_profit: initial?.take_profit,
    currency: initial?.currency ?? "USD",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Symbol search state
  const [symbolQuery, setSymbolQuery] = useState(initial?.symbol ?? "");
  const [symbolSuggestions, setSymbolSuggestions] = useState<{symbol: string; name: string; exchange: string; type: string}[]>([]);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
  const symbolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: keyof CreatePositionData, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const fetchSymbolSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSymbolSuggestions([]); return; }
    setIsSearchingSymbol(true);
    try {
      const [dbRes, marketRes] = await Promise.all([
        fetch(`/api/portfolio/symbols/search?q=${encodeURIComponent(q)}`, {
          headers: authHeaders() as HeadersInit,
        }),
        fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
          headers: authHeaders() as HeadersInit,
        }),
      ]);

      const dbData = dbRes.ok ? await dbRes.json() : { results: [] };
      const marketData = marketRes.ok ? await marketRes.json() : { results: [] };

      const merged = new Map<string, {symbol: string; name: string; exchange: string; type: string}>();
      (dbData.results || []).forEach((r: any) => {
        if (r?.symbol) merged.set(r.symbol, r);
      });
      (marketData.results || []).forEach((r: any) => {
        if (r?.symbol && !merged.has(r.symbol)) merged.set(r.symbol, r);
      });

      setSymbolSuggestions(Array.from(merged.values()));
      setShowSymbolSuggestions(true);
    } catch { /* ignore */ } finally {
      setIsSearchingSymbol(false);
    }
  }, []);

  const handleSymbolQueryChange = (value: string) => {
    setSymbolQuery(value);
    set("symbol", value.toUpperCase());
    if (symbolDebounceRef.current) clearTimeout(symbolDebounceRef.current);
    symbolDebounceRef.current = setTimeout(() => fetchSymbolSuggestions(value), 300);
  };

  const handleSelectSymbol = (s: { symbol: string; name: string }) => {
    setSymbolQuery(`${s.symbol} â€" ${s.name}`);
    set("symbol", s.symbol);
    setSymbolSuggestions([]);
    setShowSymbolSuggestions(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim()) return setError(t("portfolio_form_req_sym"));
    if (form.entry_price <= 0) return setError(t("portfolio_form_inv_entry"));
    if (form.quantity <= 0) return setError(t("portfolio_form_inv_qty"));
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, symbol: form.symbol.toUpperCase().trim() });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("portfolio_form_err"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Symbol + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_asset")}</label>
              <div className="relative">
                {isSearchingSymbol
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                }
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  placeholder="BTC-USD, AAPLâ€¦"
                  value={symbolQuery}
                  onChange={(e) => handleSymbolQueryChange(e.target.value)}
                  onFocus={() => symbolSuggestions.length > 0 && setShowSymbolSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSymbolSuggestions(false), 150)}
                  onKeyDown={(e) => { if (e.key === "Escape") setShowSymbolSuggestions(false); }}
                  required
                />
                {showSymbolSuggestions && symbolSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/10 bg-card shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {symbolSuggestions.map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        onMouseDown={() => handleSelectSymbol(s)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-primary text-xs shrink-0">{s.symbol}</span>
                          <span className="text-xs text-slate-300 truncate">{s.name}</span>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400 shrink-0 ml-1">
                          {s.type === 'PORTFOLIO' ? 'Journal' : s.type === 'EQUITY' ? t("portfolio_type_stock") : s.type === 'ETF' ? 'ETF' : s.type === 'CRYPTOCURRENCY' ? 'Crypto' : s.type === 'INDEX' ? t("portfolio_type_index") : s.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_type")}</label>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {(["long", "short"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      form.position_type === t
                        ? t === "long"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                    onClick={() => set("position_type", t)}
                  >
                    {t === "long" ? "Long â–²" : "Short â–¼"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quantity + Entry price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_qty")}</label>
              <input
                type="number"
                step="any"
                min="0"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.quantity}
                onChange={(e) => set("quantity", parseFloat(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_entry")}</label>
              <input
                type="number"
                step="any"
                min="0"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.entry_price}
                onChange={(e) => set("entry_price", parseFloat(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Entry date + Leverage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_entry_date")}</label>
              <input
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.entry_date}
                onChange={(e) => set("entry_date", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_leverage")}</label>
              <input
                type="number"
                step="0.5"
                min="1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                value={form.leverage}
                onChange={(e) => set("leverage", parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Stop loss + TP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("trade_sl")}</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder={t("portfolio_optional")}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                value={form.stop_loss ?? ""}
                onChange={(e) => set("stop_loss", e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("trade_tp")}</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder={t("portfolio_optional")}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                value={form.take_profit ?? ""}
                onChange={(e) => set("take_profit", e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Broker + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Broker / Exchange</label>
              <input
                type="text"
                placeholder="Binance, Degiroâ€¦"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                value={form.broker ?? ""}
                onChange={(e) => set("broker", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_currency")}</label>
              <select
                className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
                style={{ backgroundColor: "hsl(220 50% 8%)" }}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD" style={{ backgroundColor: "hsl(220 50% 8%)", color: "white" }}>USD — {t("portfolio_usd_label")}</option>
                <option value="EUR" style={{ backgroundColor: "hsl(220 50% 8%)", color: "white" }}>EUR — Euro</option>
                <option value="USDT" style={{ backgroundColor: "hsl(220 50% 8%)", color: "white" }}>USDT — Tether</option>
                <option value="BTC" style={{ backgroundColor: "hsl(220 50% 8%)", color: "white" }}>BTC — Bitcoin</option>
                <option value="GBP" style={{ backgroundColor: "hsl(220 50% 8%)", color: "white" }}>GBP — {t("portfolio_gbp_label")}</option>
                <option value="CHF" style={{ backgroundColor: "hsl(220 50% 8%)", color: "white" }}>CHF — {t("portfolio_chf_label")}</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_form_notes_label")}</label>
            <textarea
              rows={3}
              placeholder={t("portfolio_reason_ph")}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors text-sm"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? t("portfolio_form_saving") : t("save")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// â"€â"€ Close position modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function CloseModal({
  position,
  onClose,
  onConfirm,
}: {
  position: RealPosition;
  onClose: () => void;
  onConfirm: (exitPrice: number) => Promise<void>;
}) {
  const { t, lang } = useLanguage();
  const [exitPrice, setExitPrice] = useState(position.current_price ?? position.entry_price);
  const [saving, setSaving] = useState(false);

  const lev = position.leverage ?? 1;
  const invested = position.entry_price * position.quantity;
  const pnl =
    position.position_type === "long"
      ? (exitPrice - position.entry_price) * position.quantity * lev
      : (position.entry_price - exitPrice) * position.quantity * lev;
  const pnlPct = invested ? (pnl / invested) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-card shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("portfolio_close_title")} {position.symbol}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">{t("portfolio_close_exit")}</label>
          <input
            type="number"
            step="any"
            min="0"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            value={exitPrice}
            onChange={(e) => setExitPrice(parseFloat(e.target.value))}
          />
        </div>

        <div className={cn(
          "p-3 rounded-xl text-center",
          pnl >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
        )}>
          <p className="text-xs text-muted-foreground">{t("portfolio_close_pnl")}</p>
          <p className={cn("text-2xl font-bold mt-1", pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            {pnl >= 0 ? "+" : ""}{fmt(pnl)} {position.currency}
          </p>
          <p className={cn("text-sm", pnl >= 0 ? "text-emerald-400/70" : "text-red-400/70")}>
            {fmtPct(pnlPct)}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors text-sm">
            {t("cancel")}
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onConfirm(exitPrice);
              setSaving(false);
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t("confirm")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// â"€â"€ Position card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function PositionCard({
  pos,
  onEdit,
  onClose,
  onDelete,
}: {
  pos: RealPosition;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const isLong = pos.position_type === "long";
  const pnl = pos.unrealized_pnl ?? 0;
  const pnlPct = pos.pnl_percent ?? 0;
  const isProfit = pnl >= 0;

  // Stop loss danger check
  const nearSL =
    pos.stop_loss &&
    pos.current_price &&
    Math.abs((pos.current_price - pos.stop_loss) / pos.current_price) < 0.05;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/8 bg-card/60 overflow-hidden"
      style={nearSL ? { borderColor: "rgba(239,68,68,0.4)" } : undefined}
    >
      {nearSL && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          {t("portfolio_card_near_sl")}
        </div>
      )}

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            )}>
              {isLong ? "â–² LONG" : "â–¼ SHORT"}
            </span>
            <span className="font-bold text-base">{pos.symbol}</span>
            {pos.leverage && pos.leverage > 1 && (
              <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                x{pos.leverage}
              </span>
            )}
            {pos.broker && (
              <span className="text-xs text-muted-foreground">{pos.broker}</span>
            )}
          </div>
          {/* P&L badge */}
          <div className={cn(
            "text-right px-2 py-1 rounded-lg",
            isProfit ? "bg-emerald-500/10" : "bg-red-500/10"
          )}>
            <p className={cn("text-sm font-bold", isProfit ? "text-emerald-400" : "text-red-400")}>
              {isProfit ? "+" : ""}{fmt(pnl)} {pos.currency}
            </p>
            <p className={cn("text-xs", isProfit ? "text-emerald-400/70" : "text-red-400/70")}>
              {fmtPct(pnlPct)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">{t("journal_entry")}</p>
            <p className="text-sm font-medium">{fmt(pos.entry_price, 4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("portfolio_card_current")}</p>
            <p className="text-sm font-medium">{pos.current_price ? fmt(pos.current_price, 4) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("portfolio_card_qty")}</p>
            <p className="text-sm font-medium">{pos.quantity}</p>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? t("portfolio_card_less") : t("portfolio_card_details")}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2 border-t border-white/8 mt-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t("portfolio_card_value")} :</span>{" "}
                    <span>{pos.position_value ? fmt(pos.position_value) : "—"} {pos.currency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("portfolio_invested")} :</span>{" "}
                    <span>{pos.invested_value ? fmt(pos.invested_value) : "—"} {pos.currency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("portfolio_card_days")} :</span>{" "}
                    <span>{pos.days_held ?? 0} {t("dash_day_abbrev")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("portfolio_card_entry_date")} :</span>{" "}
                    <span>{pos.entry_date?.slice(0, 10)}</span>
                  </div>
                  {pos.stop_loss && (
                    <div>
                      <span className="text-muted-foreground">Stop Loss :</span>{" "}
                      <span className="text-red-400">{fmt(pos.stop_loss, 4)}</span>
                    </div>
                  )}
                  {pos.take_profit && (
                    <div>
                      <span className="text-muted-foreground">Take Profit :</span>{" "}
                      <span className="text-emerald-400">{fmt(pos.take_profit, 4)}</span>
                    </div>
                  )}
                </div>
                {pos.notes && (
                  <div className="p-2 rounded-lg bg-white/5 text-xs text-muted-foreground italic">
                    {pos.notes}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/8">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" /> {t("edit")}
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem("ai_position_context", JSON.stringify(pos));
            router.push(`/assistant?asset=${encodeURIComponent(pos.symbol)}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-purple-400 hover:bg-purple-500/10 transition-colors border-x border-white/8"
        >
          <Bot className="w-3.5 h-3.5" /> IA
        </button>
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:bg-primary/10 transition-colors border-r border-white/8"
        >
          <CheckCircle className="w-3.5 h-3.5" /> {t("close")}
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
        </button>
      </div>
    </motion.div>
  );
}

// â"€â"€ Closed position row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ClosedRow({ pos }: { pos: RealPosition }) {
  const entry = pos.entry_price;
  const exit = pos.exit_price ?? entry;
  const qty = pos.quantity;
  const lev = pos.leverage ?? 1;
  const pnl =
    pos.position_type === "long"
      ? (exit - entry) * qty * lev
      : (entry - exit) * qty * lev;
  const pnlPct = entry * qty ? (pnl / (entry * qty)) * 100 : 0;
  const isProfit = pnl >= 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 last:border-0 hover:bg-white/3 transition-colors">
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          pos.position_type === "long" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        )}>
          {pos.position_type === "long" ? "L" : "S"}
        </span>
        <span className="font-medium text-sm">{pos.symbol}</span>
        <span className="text-xs text-muted-foreground">{pos.exit_date?.slice(0, 10)}</span>
      </div>
      <div className={cn("text-right text-sm font-semibold", isProfit ? "text-emerald-400" : "text-red-400")}>
        {isProfit ? "+" : ""}{fmt(pnl)} <span className="text-xs font-normal">{pos.currency}</span>
        <span className="ml-1 text-xs opacity-70">({fmtPct(pnlPct)})</span>
      </div>
    </div>
  );
}

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export default function PortfolioPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [positions, setPositions] = useState<RealPosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<RealPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "closed">("open");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editPos, setEditPos] = useState<RealPosition | null>(null);
  const [closePos, setClosePos] = useState<RealPosition | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [openRes, closedRes, sumRes] = await Promise.all([
        portfolioAPI.getPositions("open"),
        portfolioAPI.getPositions("closed"),
        portfolioAPI.getSummary(),
      ]);
      setPositions(openRes.positions);
      setClosedPositions(closedRes.positions);
      setSummary(sumRes);
    } catch {
      // silently fail â€" user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    load();
  }, [user, router, load]);

  async function handleCreate(data: CreatePositionData) {
    await portfolioAPI.createPosition(data);
    await load();
  }

  async function handleUpdate(id: number, data: CreatePositionData) {
    await portfolioAPI.updatePosition(id, data);
    await load();
  }

  async function handleClose(id: number, exitPrice: number) {
    await portfolioAPI.closePosition(id, exitPrice);
    setClosePos(null);
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm(t("portfolio_delete_confirm"))) return;
    await portfolioAPI.deletePosition(id);
    await load();
  }

  // Allocation pie data
  const pieData = summary
    ? Object.entries(summary.allocation).map(([label, value], i) => ({
        label,
        value,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : [];

  const totalPnl = summary?.total_pnl ?? 0;
  const isGlobalProfit = totalPnl >= 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              {t("portfolio_real_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("portfolio_real_sub")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpGuide
              title={lang === "en" ? "Portfolio" : "Portefeuille"}
              intro={lang === "en" ? "Track your real investments: open positions, global performance and allocation analysis." : "Suis tes investissements réels : positions ouvertes, performance globale et analyse de ton allocation."}
              sections={lang === "en" ? [
                { title: "Add a position", desc: "Click '+ Add' to record a buy or sell. Enter the symbol, quantity and entry price." },
                { title: "Performance", desc: "Each position shows P&L (gain/loss) in value and %. Green = profit, red = loss." },
                { title: "Allocation", desc: "The pie chart shows your portfolio breakdown by asset and sector." },
                { title: "Close a position", desc: "Click 'Close' to record a sale. The result moves to history and impacts your total performance." },
                { title: "AI analysis", desc: "AI can analyze your portfolio and suggest rebalancing or concentration risk alerts." },
              ] : [
                { title: "Ajouter une position", desc: "Clique sur '+ Ajouter' pour enregistrer un achat ou une vente. Renseigne le symbole, la quantité et le prix d'entrée." },
                { title: "Performance", desc: "Chaque position affiche la P&L (gain/perte) en valeur et en %. La couleur verte = bénéfice, rouge = perte." },
                { title: "Répartition", desc: "Le graphique en camembert montre la répartition de ton portefeuille par actif et par secteur." },
                { title: "Clôturer une position", desc: "Clique sur 'Fermer' pour enregistrer une vente. Le résultat passe en historique et impacte ta performance totale." },
                { title: "Analyse IA", desc: "L'IA peut analyser ton portefeuille et suggérer des rééquilibrages ou des alertes de risque de concentration." },
              ]}
              tip={lang === "en" ? "Import your positions from a CSV file to save time if you have many assets to enter." : "Importe tes positions depuis un fichier CSV pour gagner du temps si tu as beaucoup d'actifs à saisir."}
            />
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("portfolio_add")}
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-500/15 text-xs text-blue-300/80">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {t("portfolio_disclaimer")}
        </div>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold">{t("portfolio_guide_title_full")}</h2>
                  <button onClick={() => setShowGuide(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4 text-sm text-muted-foreground">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="font-medium text-foreground">{t("portfolio_guide_why_title")}</p>
                    <p className="mt-1">{t("portfolio_guide_why_desc")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-2">{t("portfolio_guide_how_title")}</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><span className="text-foreground">{t("portfolio_guide_asset")}</span> : {t("portfolio_guide_asset_desc")}.</li>
                      <li><span className="text-foreground">Type</span> : {t("portfolio_guide_type_desc")}</li>
                      <li><span className="text-foreground">{t("portfolio_guide_qty")}</span> {t("portfolio_guide_and")} <span className="text-foreground">{t("portfolio_guide_entry")}</span> : {t("portfolio_guide_qty_desc")}</li>
                      <li><span className="text-foreground">{t("portfolio_guide_date")}</span> : {t("portfolio_guide_date_desc")}</li>
                      <li><span className="text-foreground">Stop Loss / Take Profit</span> : {t("portfolio_guide_sl_desc")}</li>
                      <li><span className="text-foreground">Notes</span> : {t("portfolio_guide_notes_desc")}</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-200">
                    {t("portfolio_guide_tip")}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setShowGuide(false)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {t("portfolio_guide_close")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/8 bg-card/60 p-4">
                  <p className="text-xs text-muted-foreground">{t("portfolio_total_val")}</p>
                  <p className="text-xl font-bold mt-1">{fmt(summary.total_current_value)} $</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("portfolio_invested")} : {fmt(summary.total_invested)} $
                  </p>
                </div>
                <div className={cn(
                  "rounded-xl border p-4",
                  isGlobalProfit ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
                )}>
                  <p className="text-xs text-muted-foreground">{t("portfolio_pnl_label")}</p>
                  <p className={cn("text-xl font-bold mt-1", isGlobalProfit ? "text-emerald-400" : "text-red-400")}>
                    {isGlobalProfit ? "+" : ""}{fmt(totalPnl)} $
                  </p>
                  <p className={cn("text-xs mt-0.5", isGlobalProfit ? "text-emerald-400/70" : "text-red-400/70")}>
                    {t("portfolio_latent")} : {summary.unrealized_pnl >= 0 ? "+" : ""}{fmt(summary.unrealized_pnl)} $
                    &nbsp;|&nbsp;{t("portfolio_realized")} : {summary.realized_pnl >= 0 ? "+" : ""}{fmt(summary.realized_pnl)} $
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-card/60 p-4">
                  <p className="text-xs text-muted-foreground">{t("portfolio_open_count")}</p>
                  <p className="text-xl font-bold mt-1">{summary.open_count}</p>
                  {summary.largest_position && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("portfolio_largest")} : {summary.largest_position.symbol}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-white/8 bg-card/60 p-4">
                  <p className="text-xs text-muted-foreground">{t("portfolio_best_worst")}</p>
                  {summary.best_position ? (
                    <p className="text-sm text-emerald-400 font-medium mt-1">
                      <ArrowUpRight className="inline w-3.5 h-3.5" />{summary.best_position.symbol}{" "}
                      {fmtPct(summary.best_position.pnl_percent)}
                    </p>
                  ) : <p className="text-sm text-muted-foreground mt-1">â€"</p>}
                  {summary.worst_position && (
                    <p className="text-sm text-red-400">
                      <ArrowDownRight className="inline w-3.5 h-3.5" />{summary.worst_position.symbol}{" "}
                      {fmtPct(summary.worst_position.pnl_percent)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Allocation + positions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pie */}
              {pieData.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-card/60 p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary" />
                    {t("portfolio_allocation")}
                  </h3>
                  <div className="flex items-center gap-4">
                    <PieChart2D data={pieData} />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {pieData.map((d) => (
                        <div key={d.label} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="truncate">{d.label}</span>
                          <span className="ml-auto text-muted-foreground">
                            {summary ? Math.round((d.value / summary.total_current_value) * 100) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Positions list */}
              <div className={cn("space-y-3", pieData.length > 0 ? "lg:col-span-2" : "lg:col-span-3")}>
                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
                  {(["open", "closed"] as const).map((tabKey) => (
                    <button
                      key={tabKey}
                      onClick={() => setTab(tabKey)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        tab === tabKey ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tabKey === "open" ? `${t("portfolio_open_tab")} (${positions.length})` : `${t("portfolio_closed_tab")} (${closedPositions.length})`}
                    </button>
                  ))}
                </div>

                {tab === "open" && (
                  <>
                    {positions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-white/10 text-muted-foreground">
                        <Layers className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-medium">{t("portfolio_empty")}</p>
                        <p className="text-sm mt-1">{t("portfolio_empty_open_sub")}</p>
                        <button
                          onClick={() => setShowAdd(true)}
                          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm hover:bg-primary/30 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> {t("add")}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {positions.map((p) => (
                          <PositionCard
                            key={p.id}
                            pos={p}
                            onEdit={() => setEditPos(p)}
                            onClose={() => setClosePos(p)}
                            onDelete={() => handleDelete(p.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {tab === "closed" && (
                  <div className="rounded-xl border border-white/8 bg-card/60 overflow-hidden">
                    {closedPositions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Activity className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">{t("portfolio_no_closed")}</p>
                      </div>
                    ) : (
                      closedPositions.map((p) => <ClosedRow key={p.id} pos={p} />)
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdd && (
          <PositionForm
            title={t("portfolio_new")}
            onClose={() => setShowAdd(false)}
            onSave={handleCreate}
          />
        )}
        {editPos && (
          <PositionForm
            title={`${t("edit")} ${editPos.symbol}`}
            initial={editPos}
            onClose={() => setEditPos(null)}
            onSave={(data) => handleUpdate(editPos.id, data)}
          />
        )}
        {closePos && (
          <CloseModal
            position={closePos}
            onClose={() => setClosePos(null)}
            onConfirm={(exitPrice) => handleClose(closePos.id, exitPrice)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
