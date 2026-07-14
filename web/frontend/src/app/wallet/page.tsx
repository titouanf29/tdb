"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  X,
  Loader2,
  RefreshCw,
  History,
  NotebookPen,
  Plus,
  Banknote,
  AlertTriangle,
  Crown,
  Lock,
  ChevronRight,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Check,
  BarChart2,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, marketAPI, WalletBalance, Position, TradingStats } from "@/lib/api";
import { useFormatCurrency, useFormatPrice } from "@/lib/SettingsContext";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";
import { usePremium } from "@/lib/PremiumContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 28 } },
};

// ── Position evolution chart ──────────────────────────────────────────────────

function PositionChart({
  symbol,
  createdAt,
  entryPrice,
  currentPrice,
  tpVal,
  slVal,
  isProfit,
  formatPrice,
  lang,
}: {
  symbol: string;
  createdAt?: string;
  entryPrice: number;
  currentPrice: number;
  tpVal: number | null;
  slVal: number | null;
  isProfit: boolean;
  formatPrice: (v: number, sym: string) => string;
  lang: string;
}) {
  const [hist, setHist] = useState<{ ts: number; price: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const openedMs = createdAt ? new Date(createdAt).getTime() : Date.now() - 30 * 86400000;
  const ageDays = (Date.now() - openedMs) / 86400000;
  const isIntraday = ageDays <= 30;

  useEffect(() => {
    let cancelled = false;
    // Pick a period covering the whole trade age, with sensible granularity.
    const [period, interval] =
      ageDays <= 1.5 ? ["5d", "15m"] :
      ageDays <= 30 ? ["1mo", "1h"] :
      ageDays <= 90 ? ["3mo", "1d"] :
      ["1y", "1d"];

    setLoading(true);
    setFailed(false);
    marketAPI.getChart(symbol, period, interval)
      .then((res) => {
        if (cancelled) return;
        const pts = (res.data ?? [])
          .filter((d) => d.close > 0)
          .map((d) => ({ ts: d.timestamp, price: d.close }));
        if (pts.length === 0) { setFailed(true); setHist(null); }
        else setHist(pts);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, createdAt]);

  const color = isProfit ? "#34d399" : "#fb7185";

  // Build the displayed series: only since the position was opened, anchored at
  // the entry price and ending at the live current price. Recomputed on price
  // tick without refetching history.
  const data = useMemo(() => {
    if (!hist) return null;
    const fmt = (ms: number) =>
      isIntraday
        ? new Date(ms).toLocaleString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : new Date(ms).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "2-digit" });
    const since = hist
      .filter((p) => p.ts >= openedMs)
      .map((p) => ({ ts: p.ts, label: fmt(p.ts), price: p.price }));
    const nowMs = Date.now();
    return [
      { ts: openedMs, label: fmt(openedMs), price: entryPrice },
      ...since,
      { ts: nowMs, label: fmt(nowMs), price: currentPrice },
    ];
  }, [hist, openedMs, isIntraday, entryPrice, currentPrice, lang]);

  // Y domain that always includes entry / TP / SL reference lines.
  const domain = (() => {
    if (!data) return undefined;
    const vals = data.map((d) => d.price);
    const extra = [entryPrice, currentPrice, tpVal, slVal].filter((v): v is number => v != null && v > 0);
    const lo = Math.min(...vals, ...extra);
    const hi = Math.max(...vals, ...extra);
    const pad = (hi - lo) * 0.08 || hi * 0.01 || 1;
    return [lo - pad, hi + pad] as [number, number];
  })();

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5" />
        {lang === "en" ? "Trade evolution" : "Évolution du trade"}
      </p>

      {loading ? (
        <div className="h-[240px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : failed || !data ? (
        <div className="h-[120px] flex flex-col items-center justify-center text-center gap-1">
          <BarChart2 className="w-7 h-7 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            {lang === "en" ? "Price history unavailable" : "Historique des prix indisponible"}
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="posPriceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                orientation="right"
                domain={domain}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={62}
                tickFormatter={(v: number) => formatPrice(v, symbol)}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value: number) => [formatPrice(value, symbol), lang === "en" ? "Price" : "Prix"]}
              />
              <ReferenceLine
                y={entryPrice}
                stroke="rgba(255,255,255,0.55)"
                strokeDasharray="5 4"
                label={{ value: lang === "en" ? "Entry" : "Entrée", position: "insideTopLeft", fill: "rgba(255,255,255,0.7)", fontSize: 10 }}
              />
              {tpVal && (
                <ReferenceLine
                  y={tpVal}
                  stroke="#22c55e"
                  strokeDasharray="5 4"
                  label={{ value: "TP", position: "insideTopLeft", fill: "#22c55e", fontSize: 10 }}
                />
              )}
              {slVal && (
                <ReferenceLine
                  y={slVal}
                  stroke="#ef4444"
                  strokeDasharray="5 4"
                  label={{ value: "SL", position: "insideTopLeft", fill: "#ef4444", fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill="url(#posPriceFill)"
                dot={false}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white/55 inline-block" />{lang === "en" ? "Entry" : "Entrée"}</span>
            {tpVal && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" />TP</span>}
            {slVal && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-500 inline-block" />SL</span>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Position Tracker Modal ────────────────────────────────────────────────────

function PositionTracker({
  position,
  onClose,
  onClosePosition,
  onUpdate,
  isClosing,
  formatCurrency,
}: {
  position: Position;
  onClose: () => void;
  onClosePosition: () => void;
  onUpdate: (pos: Position) => void;
  isClosing: boolean;
  formatCurrency: (v: number) => string;
}) {
  const { lang } = useLanguage();
  const formatPrice = useFormatPrice();
  const router = useRouter();

  const [tp, setTp] = useState(position.take_profit ? String(position.take_profit) : "");
  const [sl, setSl] = useState(position.stop_loss ? String(position.stop_loss) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLong = position.direction === "LONG";
  const entryPrice = position.entry_price;
  const currentPrice = livePrice ?? position.current_price ?? entryPrice;
  const pnl = position.unrealized_pnl ?? 0;
  const pnlPct = position.pnl_percent ?? 0;
  const isProfit = pnl >= 0;

  const openedAt = position.created_at ? new Date(position.created_at) : null;
  const duration = openedAt ? Math.floor((Date.now() - openedAt.getTime()) / 60000) : null;
  const durationStr = duration === null ? "—"
    : duration < 60 ? `${duration}min`
    : duration < 1440 ? `${Math.floor(duration / 60)}h ${duration % 60}min`
    : `${Math.floor(duration / 1440)}j ${Math.floor((duration % 1440) / 60)}h`;

  // Fetch live price every 10s
  const fetchPrice = async () => {
    try {
      const d = await marketAPI.getPrices([position.symbol]);
      const p = d.prices[position.symbol];
      if (p?.price) setLivePrice(p.price);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchPrice();
    refreshRef.current = setInterval(fetchPrice, 10000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.symbol]);

  const saveTPSL = async () => {
    setIsSaving(true);
    try {
      const takeProfit = tp ? parseFloat(tp) : null;
      const stopLoss = sl ? parseFloat(sl) : null;
      await walletAPI.updatePosition(position.id, { take_profit: takeProfit, stop_loss: stopLoss });
      onUpdate({ ...position, take_profit: takeProfit ?? undefined, stop_loss: stopLoss ?? undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally {
      setIsSaving(false);
    }
  };

  // TP / SL values (used by the trade evolution chart + risk metrics)
  const tpVal = tp ? parseFloat(tp) : null;
  const slVal = sl ? parseFloat(sl) : null;

  const priceChangePct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border overflow-hidden",
          isLong
            ? "bg-gradient-to-b from-emerald-950/80 to-card/95 border-emerald-500/25"
            : "bg-gradient-to-b from-rose-950/80 to-card/95 border-rose-500/25"
        )}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-4 flex items-center justify-between border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center",
              isLong ? "bg-emerald-500/15 border-emerald-500/30" : "bg-rose-500/15 border-rose-500/30"
            )}>
              {isLong
                ? <TrendingUp className="w-5 h-5 text-emerald-400" />
                : <TrendingDown className="w-5 h-5 text-rose-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{position.symbol}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-semibold",
                  isLong ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                )}>
                  {position.direction}
                </span>
                {position.leverage > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold">
                    {position.leverage}×
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "en" ? "Open for" : "Ouvert depuis"} <span className="text-foreground/70 font-medium">{durationStr}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/analysis?symbol=${position.symbol}`)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
              title={lang === "en" ? "Analyze" : "Analyser"}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[80vh] sm:max-h-[82vh] overflow-y-auto no-scrollbar">

          {/* P&L hero */}
          <div className={cn(
            "rounded-xl p-4 border",
            isProfit ? "bg-emerald-500/8 border-emerald-500/20" : "bg-rose-500/8 border-rose-500/20"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{lang === "en" ? "Unrealized P&L" : "P&L non réalisé"}</p>
                <div className="flex items-center gap-2">
                  {isProfit
                    ? <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    : <ArrowDownRight className="w-5 h-5 text-rose-400" />}
                  <span className={cn("text-2xl font-bold tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
                    {isProfit ? "+" : ""}{formatCurrency(pnl)}
                  </span>
                  <span className={cn("text-sm font-semibold", isProfit ? "text-emerald-400/80" : "text-rose-400/80")}>
                    ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">{lang === "en" ? "Current price" : "Prix actuel"}</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatPrice(currentPrice, position.symbol)}
                </p>
                <p className={cn("text-xs font-semibold tabular-nums", priceChangePct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}% {lang === "en" ? "vs entry" : "vs entrée"}
                </p>
              </div>
            </div>

            {/* P&L progress bar */}
            <div className="space-y-1.5">
              <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(pnlPct) * 2, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn("h-full rounded-full", isProfit ? "bg-emerald-400" : "bg-rose-400")}
                />
              </div>
            </div>
          </div>

          {/* Trade evolution chart */}
          <PositionChart
            symbol={position.symbol}
            createdAt={position.created_at}
            entryPrice={entryPrice}
            currentPrice={currentPrice}
            tpVal={tpVal}
            slVal={slVal}
            isProfit={isProfit}
            formatPrice={formatPrice}
            lang={lang}
          />

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: lang === "en" ? "Entry" : "Entrée", value: formatPrice(entryPrice, position.symbol), color: "text-foreground/80" },
              { label: lang === "en" ? "Amount" : "Montant", value: formatCurrency(position.amount), color: "text-foreground/80" },
              { label: lang === "en" ? "Quantity" : "Quantité", value: position.quantity.toFixed(4), color: "text-foreground/80" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-white/[0.03] border border-white/6 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground/60 mb-1">{label}</p>
                <p className={cn("text-xs font-bold tabular-nums", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* TP/SL edit */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                {lang === "en" ? "Take Profit & Stop Loss" : "Take Profit & Stop Loss"}
              </p>
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-emerald-400 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {lang === "en" ? "Saved" : "Sauvegardé"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-emerald-400 mb-1.5 block font-semibold">
                  Take Profit {lang === "en" ? "(optional)" : "(optionnel)"}
                </label>
                <input
                  type="number"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  placeholder="—"
                  className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-muted-foreground/40"
                />
              </div>
              <div>
                <label className="text-[10px] text-rose-400 mb-1.5 block font-semibold">
                  Stop Loss {lang === "en" ? "(optional)" : "(optionnel)"}
                </label>
                <input
                  type="number"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  placeholder="—"
                  className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-500/50 placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            {tpVal && slVal && entryPrice > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{lang === "en" ? "R/R ratio:" : "Ratio R/R:"}</span>
                <span className={cn("font-bold", (() => {
                  const risk = Math.abs(entryPrice - slVal);
                  const reward = Math.abs(tpVal - entryPrice);
                  const rr = reward / risk;
                  return rr >= 2 ? "text-emerald-400" : rr >= 1.5 ? "text-amber-400" : "text-rose-400";
                })())}>
                  {(() => {
                    const risk = Math.abs(entryPrice - slVal);
                    const reward = Math.abs(tpVal - entryPrice);
                    return risk > 0 ? `1:${(reward / risk).toFixed(1)}` : "—";
                  })()}
                </span>
              </div>
            )}
            <button
              onClick={saveTPSL}
              disabled={isSaving}
              className="w-full py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              {lang === "en" ? "Update TP/SL" : "Mettre à jour TP/SL"}
            </button>
          </div>

          {/* Close position */}
          <button
            onClick={onClosePosition}
            disabled={isClosing}
            className="w-full py-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-sm hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isClosing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <X className="w-4 h-4" />}
            {lang === "en" ? "Close position at market price" : "Clôturer au prix du marché"}
          </button>

          <p className="text-center text-[10px] text-muted-foreground/40 pb-1">
            {lang === "en" ? "Simulation only — no real money." : "Simulation uniquement — aucun argent réel."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const formatCurrency = useFormatCurrency();
  const { t, lang } = useLanguage();
  const { isPremium, isAdmin } = usePremium();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Position[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [closingPosition, setClosingPosition] = useState<number | null>(null);
  const [justClosed, setJustClosed] = useState<Position | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [addFundsError, setAddFundsError] = useState("");
  const [trackedPosition, setTrackedPosition] = useState<Position | null>(null);

  const canAddFunds = isPremium || isAdmin;
  const LOW_BALANCE_THRESHOLD = 1000;

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [balanceData, positionsData, historyData, statsData] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getPositions("open"),
        walletAPI.getHistory(20),
        walletAPI.getStats(),
      ]);
      setBalance(balanceData);
      setPositions(positionsData.positions);
      setHistory(historyData.history);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading wallet:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const closePosition = async (positionId: number) => {
    setClosingPosition(positionId);
    const closing = positions.find(p => p.id === positionId);
    try {
      const result = await walletAPI.closePosition(positionId);
      setTrackedPosition(null);
      if (closing) {
        setJustClosed({
          ...closing,
          exit_price: result.exit_price ?? closing.current_price,
          realized_pnl: result.realized_pnl,
          closed_at: new Date().toISOString(),
        });
      }
      await loadData();
    } catch (error) {
      console.error("Error closing position:", error);
    } finally {
      setClosingPosition(null);
    }
  };

  const addFunds = async () => {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) {
      setAddFundsError(t("wallet_err_invalid"));
      return;
    }
    if (amount > 100000) {
      setAddFundsError(t("wallet_err_max"));
      return;
    }
    setIsAddingFunds(true);
    setAddFundsError("");
    try {
      await walletAPI.addFunds(amount);
      await loadData();
      setShowAddFundsModal(false);
      setAddFundsAmount("");
    } catch (error) {
      setAddFundsError(error instanceof Error ? error.message : t("error_generic"));
    } finally {
      setIsAddingFunds(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        </motion.div>
      </div>
    );
  }

  const totalPnl = balance?.total_pnl ?? 0;

  return (
    <>
      {/* Position tracker modal */}
      <AnimatePresence>
        {trackedPosition && (
          <PositionTracker
            position={trackedPosition}
            onClose={() => setTrackedPosition(null)}
            onClosePosition={() => closePosition(trackedPosition.id)}
            onUpdate={(updated) => {
              setPositions(prev => prev.map(p => p.id === updated.id ? updated : p));
              setTrackedPosition(updated);
            }}
            isClosing={closingPosition === trackedPosition.id}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-5xl mx-auto"
        data-module-id="portfolio-panel"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-primary/8 via-transparent to-transparent p-6">
          <div className="absolute top-0 right-0 w-56 h-56 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("wallet_title")}</h1>
                <p className="text-muted-foreground text-sm">{t("wallet_subtitle")}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <HelpGuide
                title={lang === "en" ? "Wallet" : "Wallet"}
                intro={lang === "en" ? "Your virtual trading account: available balance, transaction history and performance statistics." : "Ton compte de trading virtuel : solde disponible, historique des transactions et statistiques de performance."}
                sections={lang === "en" ? [
                  { title: "Balance & equity", desc: "The available balance is what you can use to open new positions. Equity includes the P&L of open positions." },
                  { title: "Add funds", desc: "Click '+ Add funds' to credit your virtual trading account and start trading." },
                  { title: "Position tracker", desc: "Click any open position to see its evolution, edit TP/SL and close it." },
                  { title: "History", desc: "All your past trades with the date, direction (Long/Short), result and entry/exit levels." },
                  { title: "Statistics", desc: "Win rate, average gain, average loss, profit factor and other key performance metrics." },
                ] : [
                  { title: "Solde & équité", desc: "Le solde disponible est ce que tu peux utiliser pour ouvrir de nouvelles positions. L'équité inclut les P&L des positions ouvertes." },
                  { title: "Ajouter des fonds", desc: "Clique sur '+ Ajouter des fonds' pour créditer ton compte de trading virtuel et commencer à trader." },
                  { title: "Position tracker", desc: "Clique sur une position ouverte pour voir son évolution, modifier TP/SL et la clôturer." },
                  { title: "Historique", desc: "Tous tes trades passés avec la date, le sens (Long/Short), le résultat et les niveaux d'entrée/sortie." },
                  { title: "Statistiques", desc: "Taux de réussite, gain moyen, perte moyenne, facteur de profit et autres métriques clés de ta performance." },
                ]}
                tip={lang === "en" ? "Virtual trading carries no real financial risk. Use it to test your strategy before going live." : "Le trading virtuel ne comporte aucun risque financier réel. Utilise-le pour tester ta stratégie avant de passer au réel."}
              />
              <button
                onClick={() => canAddFunds ? setShowAddFundsModal(true) : setShowPremiumGate(true)}
                className={cn("btn-primary flex items-center gap-2 text-sm", !canAddFunds && "opacity-90")}
              >
                {canAddFunds ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {t("wallet_add_funds")}
              </button>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Balance cards ────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BalanceCard
            title={t("wallet_balance")}
            rawValue={balance?.balance || 0}
            formatter={formatCurrency}
            icon={Wallet}
            color="primary"
            index={0}
          />
          <BalanceCard
            title={t("wallet_positions_val")}
            rawValue={balance?.positions_value || 0}
            formatter={formatCurrency}
            icon={DollarSign}
            color="blue"
            index={1}
          />
          <BalanceCard
            title={t("wallet_pnl")}
            rawValue={totalPnl}
            formatter={formatCurrency}
            icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
            color={totalPnl >= 0 ? "green" : "red"}
            index={2}
          />
          <BalanceCard
            title={t("wallet_equity")}
            rawValue={balance?.total_equity ?? ((balance?.balance || 0) + (balance?.positions_value || 0))}
            formatter={formatCurrency}
            icon={Target}
            color="purple"
            index={3}
          />
        </motion.div>

        {/* ── Low balance warning ────────────────────────────────────────── */}
        {balance && balance.balance < LOW_BALANCE_THRESHOLD && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-amber-500/15 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-400">
                  {lang === "en" ? "Low balance" : "Solde faible"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "en"
                    ? `Your virtual balance is below ${formatCurrency(LOW_BALANCE_THRESHOLD)}. Add funds to keep trading.`
                    : `Ton solde virtuel est inférieur à ${formatCurrency(LOW_BALANCE_THRESHOLD)}. Recharge ton compte pour continuer à trader.`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href="/premium"
                className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-yellow-500/25"
              >
                <Crown className="w-3.5 h-3.5" />
                {lang === "en" ? "Go Premium" : "Passer Premium"}
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {t("wallet_stats_title")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("wallet_total_trades"), value: stats?.total_trades || 0 },
              { label: t("wallet_winning"), value: stats?.winning_trades || 0, color: "green" as const },
              { label: t("wallet_losing"), value: stats?.losing_trades || 0, color: "red" as const },
              { label: t("wallet_winrate"), value: `${stats?.win_rate || 0}%` },
              { label: t("wallet_total_pnl"), value: formatCurrency(stats?.total_pnl || 0), color: (stats?.total_pnl ?? 0) >= 0 ? "green" as const : "red" as const },
              { label: t("wallet_best_trade"), value: formatCurrency(stats?.best_trade || 0), color: "green" as const },
              { label: t("wallet_worst_trade"), value: formatCurrency(stats?.worst_trade || 0), color: "red" as const },
              { label: t("wallet_avg_pnl"), value: formatCurrency(stats?.avg_pnl || 0) },
            ].map((item, i) => (
              <StatItem key={item.label} index={i} {...item} />
            ))}
          </div>
        </motion.div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/8 w-full sm:w-fit overflow-x-auto no-scrollbar">
            {[
              { id: "open" as const, label: `${t("wallet_open_pos")} (${positions.length})`, icon: Activity },
              { id: "closed" as const, label: `${t("wallet_history")} (${history.length})`, icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Debrief nudge after closing a trade ─────────────────────────── */}
        <AnimatePresence>
          {justClosed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <NotebookPen className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm">
                  {lang === "en"
                    ? <>Trade <span className="font-semibold">{justClosed.symbol}</span> closed{justClosed.realized_pnl != null && <> ({justClosed.realized_pnl >= 0 ? "+" : ""}{formatCurrency(justClosed.realized_pnl)})</>}. What did you learn?</>
                    : <>Trade <span className="font-semibold">{justClosed.symbol}</span> clôturé{justClosed.realized_pnl != null && <> ({justClosed.realized_pnl >= 0 ? "+" : ""}{formatCurrency(justClosed.realized_pnl)})</>}. Qu'avez-vous appris ?</>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={journalPrefillUrl(justClosed)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  {lang === "en" ? "Debrief in journal" : "Débriefer au journal"}
                </Link>
                <button
                  onClick={() => setJustClosed(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-white/8 transition-colors"
                  aria-label={lang === "en" ? "Dismiss" : "Fermer"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Positions / History ────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="space-y-2">
          {activeTab === "open" ? (
            positions.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-14 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <Wallet className="w-7 h-7 opacity-30" />
                </div>
                <p className="font-semibold text-muted-foreground">{t("wallet_no_positions")}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {lang === "en" ? "Open positions from the trading page or market scanner." : "Ouvrez des positions depuis la page trading ou le scanner."}
                </p>
              </div>
            ) : (
              positions.map((position, i) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onOpen={() => setTrackedPosition(position)}
                  onClose={() => closePosition(position.id)}
                  isClosing={closingPosition === position.id}
                  formatCurrency={formatCurrency}
                  index={i}
                />
              ))
            )
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-14 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <History className="w-7 h-7 opacity-30" />
              </div>
              <p className="font-semibold text-muted-foreground">{t("wallet_no_history")}</p>
            </div>
          ) : (
            history.map((position, i) => (
              <HistoryCard key={position.id} position={position} formatCurrency={formatCurrency} index={i} />
            ))
          )}
        </motion.div>

        {/* ── Premium Gate Modal ────────────────────────────────────────── */}
        {showPremiumGate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPremiumGate(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-yellow-500/20 bg-card p-6 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-lg font-bold mb-2">
                {lang === "en" ? "Premium Feature" : "Fonctionnalité Premium"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {lang === "en"
                  ? "Adding virtual funds is exclusive to Premium members."
                  : "L'ajout de fonds virtuels est réservé aux membres Premium."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowPremiumGate(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
                <Link href="/premium" className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  {lang === "en" ? "Go Premium" : "Passer Premium"}
                </Link>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Add Funds Modal ───────────────────────────────────────────── */}
        {showAddFundsModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddFundsModal(false); setAddFundsAmount(""); setAddFundsError(""); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border border-white/10 bg-card p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                  <Banknote className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t("wallet_add_modal_title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("wallet_paper_label")}</p>
                </div>
              </div>
              {addFundsError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-4">
                  {addFundsError}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">{t("wallet_amount_label")}</label>
                <input
                  type="number"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder={t("wallet_amount_ph")}
                  className="w-full input"
                  min="1"
                  max="100000"
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {[1000, 5000, 10000, 25000, 50000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setAddFundsAmount(String(amount))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-sm transition-all font-medium",
                      addFundsAmount === String(amount)
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-white/5 border-white/8 hover:bg-white/10"
                    )}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowAddFundsModal(false); setAddFundsAmount(""); setAddFundsError(""); }} className="flex-1 btn-secondary">{t("cancel")}</button>
                <button onClick={addFunds} disabled={isAddingFunds || !addFundsAmount} className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                  {isAddingFunds ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />{t("add")}</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BalanceCard({ title, rawValue, formatter, icon: Icon, color, index = 0 }: {
  title: string; rawValue: number; formatter: (v: number) => string;
  icon: React.ElementType; color: "primary" | "blue" | "green" | "red" | "purple"; index?: number;
}) {
  const colorMap = {
    primary: { bg: "bg-primary/15", text: "text-primary", border: "border-primary/20" },
    blue:    { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/20" },
    green:   { bg: "bg-emerald-500/15",text: "text-emerald-400",border: "border-emerald-500/20" },
    red:     { bg: "bg-rose-500/15",   text: "text-rose-400",   border: "border-rose-500/20" },
    purple:  { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/20" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 28 }}
      className={cn("rounded-xl border bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all", c.border)}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl border", c.bg, c.border)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <AnimatedNumber value={rawValue} formatter={formatter} className={cn("text-xl font-bold font-display tracking-tight", c.text)} />
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, color, index = 0 }: {
  label: string; value: string | number; color?: "green" | "red"; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/6 hover:bg-white/[0.05] transition-all"
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-base font-bold tabular-nums", color === "green" && "text-emerald-400", color === "red" && "text-rose-400")}>
        {value}
      </p>
    </motion.div>
  );
}

function PositionCard({ position, onOpen, onClose, isClosing, formatCurrency, index = 0 }: {
  position: Position; onOpen: () => void; onClose: () => void;
  isClosing: boolean; formatCurrency: (value: number) => string; index?: number;
}) {
  const { t, lang } = useLanguage();
  const formatPrice = useFormatPrice();
  const isLong = position.direction === "LONG";
  const pnl = position.unrealized_pnl ?? 0;
  const pnlPct = position.pnl_percent ?? 0;
  const isProfit = pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 28 }}
      onClick={onOpen}
      className={cn(
        "group rounded-xl border bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer p-4",
        isLong ? "border-emerald-500/15 hover:border-emerald-500/30" : "border-rose-500/15 hover:border-rose-500/30"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Direction badge */}
        <div className={cn(
          "w-12 h-12 rounded-xl border flex-shrink-0 flex flex-col items-center justify-center",
          isLong ? "bg-emerald-500/10 border-emerald-500/25" : "bg-rose-500/10 border-rose-500/25"
        )}>
          {isLong
            ? <TrendingUp className="w-5 h-5 text-emerald-400" />
            : <TrendingDown className="w-5 h-5 text-rose-400" />}
          <span className={cn("text-[9px] font-bold mt-0.5", isLong ? "text-emerald-400" : "text-rose-400")}>
            {position.direction}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{position.symbol}</span>
            {position.leverage > 1 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary font-semibold">
                {position.leverage}×
              </span>
            )}
            {(position.take_profit || position.stop_loss) && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-muted-foreground/60">
                {position.take_profit ? "TP ✓" : ""}{position.take_profit && position.stop_loss ? " · " : ""}{position.stop_loss ? "SL ✓" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{lang === "en" ? "Entry" : "Entrée"}: <span className="text-foreground/70 font-medium tabular-nums">{formatPrice(position.entry_price, position.symbol)}</span></span>
            <span>{lang === "en" ? "Now" : "Actuel"}: <span className="text-foreground/70 font-medium tabular-nums">{formatPrice(position.current_price ?? position.entry_price, position.symbol)}</span></span>
          </div>
        </div>

        {/* P&L */}
        <div className="text-right flex-shrink-0">
          <p className={cn("text-base font-bold tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
            {isProfit ? "+" : ""}{formatCurrency(pnl)}
          </p>
          <p className={cn("text-xs font-medium tabular-nums", isProfit ? "text-emerald-400/80" : "text-rose-400/80")}>
            {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
          </p>
        </div>

        {/* Tracker cue */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* TP/SL row */}
      {(position.take_profit || position.stop_loss) && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/6 text-xs">
          {position.take_profit && (
            <span className="text-emerald-400/70">TP: <span className="font-mono font-semibold">{formatPrice(position.take_profit, position.symbol)}</span></span>
          )}
          {position.stop_loss && (
            <span className="text-rose-400/70">SL: <span className="font-mono font-semibold">{formatPrice(position.stop_loss, position.symbol)}</span></span>
          )}
          <span className="ml-auto text-muted-foreground/40 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {position.created_at ? new Date(position.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function HistoryCard({ position, formatCurrency, index = 0 }: {
  position: Position; formatCurrency: (value: number) => string; index?: number;
}) {
  const { lang } = useLanguage();
  const formatPrice = useFormatPrice();
  const isLong = position.direction === "LONG";
  const pnl = position.realized_pnl ?? 0;
  const isProfit = pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="rounded-xl border border-white/6 bg-white/[0.02] p-4 opacity-80 hover:opacity-100 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl border flex-shrink-0 flex items-center justify-center",
          isLong ? "bg-emerald-500/8 border-emerald-500/15" : "bg-rose-500/8 border-rose-500/15"
        )}>
          {isLong ? <TrendingUp className="w-4 h-4 text-emerald-400/70" /> : <TrendingDown className="w-4 h-4 text-rose-400/70" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{position.symbol}</span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded-full border font-medium",
              isLong ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-400/70" : "bg-rose-500/8 border-rose-500/15 text-rose-400/70"
            )}>
              {position.direction}
            </span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{lang === "en" ? "Entry" : "Entrée"}: <span className="font-mono">{formatPrice(position.entry_price, position.symbol)}</span></span>
            {position.exit_price && (
              <span>{lang === "en" ? "Exit" : "Sortie"}: <span className="font-mono">{formatPrice(position.exit_price, position.symbol)}</span></span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn("font-bold text-base tabular-nums", isProfit ? "text-emerald-400" : "text-rose-400")}>
            {isProfit ? "+" : ""}{formatCurrency(pnl)}
          </p>
          <p className="text-xs text-muted-foreground">
            {position.closed_at ? new Date(position.closed_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" }) : ""}
          </p>
        </div>
        <Link
          href={journalPrefillUrl(position)}
          title={lang === "en" ? "Debrief this trade in your journal" : "Débriefer ce trade dans votre journal"}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/4 hover:bg-primary/10 hover:border-primary/30 text-xs text-muted-foreground hover:text-primary transition-all"
        >
          <NotebookPen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{lang === "en" ? "Journal" : "Journal"}</span>
        </Link>
      </div>
    </motion.div>
  );
}

function journalPrefillUrl(position: Position): string {
  const params = new URLSearchParams({ prefill: "1", symbol: position.symbol, direction: position.direction });
  params.set("entry_price", String(position.entry_price));
  if (position.exit_price != null) params.set("exit_price", String(position.exit_price));
  params.set("quantity", String(position.quantity));
  if (position.realized_pnl != null) params.set("pnl", String(position.realized_pnl));
  if (position.created_at) params.set("entry_time", position.created_at);
  if (position.closed_at) params.set("exit_time", position.closed_at);
  return `/journal?${params.toString()}`;
}
