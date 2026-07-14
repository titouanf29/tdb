"use client";

import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Star, Activity, ArrowUpRight, ArrowDownRight,
  Target, RefreshCw, Loader2, Newspaper, Shield, Plus, Globe,
  Bot, BarChart3, Settings2, Eye, EyeOff, ExternalLink, Clock,
  Layers, ChevronUp, ChevronDown, Crown, Timer, Send, Sparkles, Trash2,
  GraduationCap, NotebookPen,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import {
  walletAPI, favoritesAPI, adminAPI, aiAPI, marketAPI, missionsAPI,
  WalletBalance, TradingStats, Favorite, MarketNews, SummaryPoint, Position,
  ChatMessage, AILimitStatus,
} from "@/lib/api";
import { useFormatCurrency, useFormatPrice } from "@/lib/SettingsContext";
import { usePremium } from "@/lib/PremiumContext";
import { useLanguage } from "@/lib/LanguageContext";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import dynamic from "next/dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITY — animated counter hook
// ─────────────────────────────────────────────────────────────────────────────
function useCounter(target: number, duration: number = 1.2) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

const SessionSummaryWidget = dynamic(
  () => import("@/components/dashboard/SessionSummary").then(m => ({ default: m.SessionSummaryWidget })),
  { ssr: false, loading: () => <div className="h-36 glass-card animate-pulse rounded-xl border border-white/8" /> }
);
const OpportunitiesWidget = dynamic(
  () => import("@/components/dashboard/OpportunitiesWidget").then(m => ({ default: m.OpportunitiesWidget })),
  { ssr: false, loading: () => <div className="h-48 glass-card animate-pulse rounded-xl border border-white/8" /> }
);
const TrendingWidget = dynamic(
  () => import("@/components/dashboard/TrendingWidget").then(m => ({ default: m.TrendingWidget })),
  { ssr: false, loading: () => <div className="h-48 glass-card animate-pulse rounded-xl border border-white/8" /> }
);
const WeeklyPrepWidget = dynamic(
  () => import("@/components/ui/WeeklyPrepWidget").then(m => ({ default: m.WeeklyPrepWidget })),
  { ssr: false, loading: () => null }
);
const IPOWatchWidget = dynamic(
  () => import("@/components/dashboard/IPOWatchWidget").then(m => ({ default: m.IPOWatchWidget })),
  { ssr: false, loading: () => <div className="h-48 glass-card animate-pulse rounded-xl border border-white/8" /> }
);
const ProgressWidget = dynamic(
  () => import("@/components/dashboard/ProgressWidget").then(m => ({ default: m.ProgressWidget })),
  { ssr: false, loading: () => <div className="h-32 glass-card animate-pulse rounded-xl border border-white/8" /> }
);

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────────────────

type WidgetId = "sessions" | "opportunities" | "trending" | "stats" | "positions" | "quickactions";
const DEFAULT_WIDGETS: WidgetId[] = [];
const DASHBOARD_STORAGE_KEY = "tdb_dashboard_config_v2";
const WIDGET_ICONS: Record<WidgetId, string> = {
  sessions: "🌍", stats: "🎯", positions: "💼",
  opportunities: "⚡", trending: "🔥", quickactions: "⚡",
};

const INDICES_SYMBOLS = ["^FCHI", "^GSPC", "^IXIC", "BTC-USD", "GC=F", "^VIX"];
const INDICES_LABELS: Record<string, string> = {
  "^FCHI": "CAC 40", "^GSPC": "S&P 500", "^IXIC": "NASDAQ",
  "BTC-USD": "Bitcoin", "^VIX": "VIX", "GC=F": "Or",
};
const FEATURED_INDICES = [
  { sym: "^GSPC",   label: "S&P 500", labelEn: "S&P 500", icon: "🇺🇸" },
  { sym: "BTC-USD", label: "Bitcoin", labelEn: "Bitcoin", icon: "₿" },
  { sym: "GC=F",    label: "Or",      labelEn: "Gold",    icon: "🥇" },
];
const SECONDARY_INDICES = ["^FCHI", "^IXIC", "^VIX"];

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28 } },
};

// ─────────────────────────────────────────────────────────────────────────────
//  PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const formatCurrency = useFormatCurrency();
  const formatPrice = useFormatPrice();
  const { isPremium } = usePremium();

  const [balance, setBalance]               = useState<WalletBalance | null>(null);
  const [stats, setStats]                   = useState<TradingStats | null>(null);
  const [favorites, setFavorites]           = useState<Favorite[]>([]);
  const [openPositions, setOpenPositions]   = useState<Position[]>([]);
  const [isAdmin, setIsAdmin]               = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [marketNews, setMarketNews]         = useState<MarketNews | null>(null);
  const [isLoadingNews, setIsLoadingNews]   = useState(false);
  const [indices, setIndices]               = useState<Record<string, { price: number; change: number }>>({});
  const [isLoadingIndices, setIsLoadingIndices] = useState(false);
  const [favSort, setFavSort]               = useState<"change_desc" | "change_asc" | "alpha">("change_desc");
  const [favFilter, setFavFilter]           = useState<"all" | "profit" | "loss">("all");
  const [newsFilter, setNewsFilter]         = useState<"all" | "mine">("all");
  const [activeWidgets, setActiveWidgets]   = useState<WidgetId[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode]             = useState(false);
  const [dashRefreshRate, setDashRefreshRate] = useState(180_000);
  const dashRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (stored) { try { setActiveWidgets(JSON.parse(stored)); } catch { /* ignore */ } }
  }, []);

  const saveWidgetConfig = (widgets: WidgetId[]) => {
    setActiveWidgets(widgets);
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(widgets));
  };
  const toggleWidget = (id: WidgetId) =>
    saveWidgetConfig(activeWidgets.includes(id) ? activeWidgets.filter(w => w !== id) : [...activeWidgets, id]);
  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const idx = activeWidgets.indexOf(id);
    if (idx < 0) return;
    const next = [...activeWidgets];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveWidgetConfig(next);
  };

  const loadIndices = useCallback(async () => {
    setIsLoadingIndices(true);
    try { const d = await marketAPI.getPrices(INDICES_SYMBOLS); setIndices(d.prices); }
    catch { /* ignore */ } finally { setIsLoadingIndices(false); }
  }, []);

  const loadMarketNews = useCallback(async () => {
    setIsLoadingNews(true);
    try { const d = await aiAPI.getMarketNews(); setMarketNews(d); }
    catch { /* ignore */ } finally { setIsLoadingNews(false); }
  }, []);

  const loadData = useCallback((showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    walletAPI.getBalance().then(d => setBalance(d)).catch(() => {});
    walletAPI.getStats().then(d => setStats(d)).catch(() => {});
    favoritesAPI.getFavorites().then(d => setFavorites(d.favorites || [])).catch(() => setFavorites([]));
    adminAPI.checkAdmin().then(d => setIsAdmin(d.is_admin)).catch(() => {});
    walletAPI.getPositions("open").then(d => setOpenPositions(d.positions || [])).catch(() => setOpenPositions([]));
    loadIndices();
    loadMarketNews();
    if (showRefresh) setTimeout(() => setIsRefreshing(false), 1500);
  }, [loadIndices, loadMarketNews]);

  useEffect(() => { setIsLoading(false); loadData(); }, [loadData]);

  useEffect(() => {
    if (dashRefreshIntervalRef.current) clearInterval(dashRefreshIntervalRef.current);
    if (dashRefreshRate > 0) dashRefreshIntervalRef.current = setInterval(() => loadData(), dashRefreshRate);
    return () => { if (dashRefreshIntervalRef.current) clearInterval(dashRefreshIntervalRef.current); };
  }, [dashRefreshRate, loadData]);

  const avgFavChange = useMemo(() =>
    favorites.length > 0
      ? favorites.filter(f => !f.error).reduce((s, f) => s + f.change, 0) / Math.max(1, favorites.filter(f => !f.error).length)
      : 0,
  [favorites]);

  const sortedFavorites = useMemo(() => [...favorites]
    .filter(f => favFilter === "all" ? true : favFilter === "profit" ? f.change >= 0 : f.change < 0)
    .sort((a, b) => {
      if (favSort === "change_desc") return b.change - a.change;
      if (favSort === "change_asc")  return a.change - b.change;
      return a.symbol.localeCompare(b.symbol);
    }), [favorites, favFilter, favSort]);

  const filteredNews = useMemo(() => {
    if (newsFilter !== "mine" || !marketNews) return marketNews;
    const syms = new Set(favorites.map(f => f.symbol.replace(/-USD$/, "").replace(/\..*/, "")));
    return { ...marketNews, news: marketNews.news.filter(n => syms.has(n.related?.toUpperCase() || "")) };
  }, [newsFilter, marketNews, favorites]);

  if (isLoading) return (
    <div className="space-y-4">
      <div className="animate-pulse bg-white/5 rounded-xl h-12 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 animate-pulse bg-white/5 rounded-xl h-48" />
        <div className="lg:col-span-3 animate-pulse bg-white/5 rounded-xl h-48" />
      </div>
      <div className="animate-pulse bg-white/5 rounded-xl h-16 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 animate-pulse bg-white/5 rounded-xl h-64" />
        <div className="lg:col-span-1 animate-pulse bg-white/5 rounded-xl h-64" />
      </div>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">

      {/* ── Live Ticker ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <LiveTicker indices={indices} favorites={favorites} />
      </motion.div>

      {/* ── Portfolio Hero + Market Cards ───────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <PortfolioCard
            balance={balance} stats={stats} avgFavChange={avgFavChange}
            openPositions={openPositions} favorites={favorites}
            isAdmin={isAdmin} isPremium={isPremium}
            editMode={editMode} setEditMode={setEditMode}
            isRefreshing={isRefreshing} dashRefreshRate={dashRefreshRate}
            setDashRefreshRate={setDashRefreshRate}
            onRefresh={() => loadData(true)}
            formatCurrency={formatCurrency} lang={lang}
          />
        </div>
        <div className="lg:col-span-3">
          <MarketCardsRow indices={indices} isLoading={isLoadingIndices} onRefresh={loadIndices} lang={lang} />
        </div>
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <QuickActionsBar />
      </motion.div>

      {/* ── Progression (streak, XP, missions) ──────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <ProgressWidget />
      </motion.div>

      {/* ── Weekly prep ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <WeeklyPrepWidget />
      </motion.div>

      {/* ── IPO en Veille ───────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <IPOWatchWidget />
      </motion.div>

      {/* ── Open positions ───────────────────────────────────────────────────── */}
      {openPositions.length > 0 && (
        <motion.div variants={itemVariants}>
          <OpenPositionsWidget positions={openPositions} formatCurrency={formatCurrency} />
        </motion.div>
      )}

      {/* ── Watchlist + Chat | News ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <FavoritesWidget
            favorites={sortedFavorites} favSort={favSort} setFavSort={setFavSort}
            favFilter={favFilter} setFavFilter={setFavFilter}
            formatCurrency={formatCurrency} formatPrice={formatPrice}
          />
          <DashAIChatWidget />
        </div>
        <div className="lg:col-span-1">
          <NewsWidget
            marketNews={filteredNews} isLoadingNews={isLoadingNews}
            newsFilter={newsFilter} setNewsFilter={setNewsFilter}
            hasFavorites={favorites.length > 0} onRefresh={loadMarketNews} compact
          />
        </div>
      </motion.div>

      {/* ── Optional premium widgets ─────────────────────────────────────────── */}
      {activeWidgets.map((id) => {
        if (id === "sessions")      return <motion.div key="sessions"      variants={itemVariants}><SessionSummaryWidget /></motion.div>;
        if (id === "opportunities") return <motion.div key="opportunities" variants={itemVariants}><OpportunitiesWidget /></motion.div>;
        if (id === "trending")      return <motion.div key="trending"      variants={itemVariants}><TrendingWidget /></motion.div>;
        if (id === "stats" && (stats?.total_trades || 0) > 0) return (
          <motion.div key="stats" variants={itemVariants}>
            <TradingStatsWidget stats={stats} balance={balance} formatCurrency={formatCurrency} />
          </motion.div>
        );
        return null;
      })}

      {/* ── Premium widget picker ────────────────────────────────────────────── */}
      <AnimatePresence>
        {editMode && isPremium && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-5 border border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold">{t("dash_premium_title")}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{t("dash_premium_hint")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(["sessions", "opportunities", "trending", "stats"] as WidgetId[]).map((id) => {
                  const isActive = activeWidgets.includes(id);
                  const idx      = activeWidgets.indexOf(id);
                  const labelKey = `widget_${id}_label` as Parameters<typeof t>[0];
                  const descKey  = `widget_${id}_desc`  as Parameters<typeof t>[0];
                  return (
                    <div key={id} className={cn("p-3 rounded-xl border transition-all",
                      isActive ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/3 opacity-60")}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{WIDGET_ICONS[id]}</span>
                          <div>
                            <p className="text-sm font-medium">{t(labelKey)}</p>
                            <p className="text-[11px] text-muted-foreground">{t(descKey)}</p>
                          </div>
                        </div>
                        <button onClick={() => toggleWidget(id)}
                          className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0 ml-2",
                            isActive ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-white/10")}>
                          {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 mt-2">
                          <button onClick={() => moveWidget(id, -1)} disabled={idx <= 0}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => moveWidget(id, 1)} disabled={idx >= activeWidgets.length - 1}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-muted-foreground ml-1">pos. {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const LiveTicker = memo(function LiveTicker({
  indices, favorites,
}: {
  indices: Record<string, { price: number; change: number }>;
  favorites: Favorite[];
}) {
  const fmt = (p: number) =>
    p > 1000
      ? p.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
      : p.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const items = [
    ...INDICES_SYMBOLS.filter(s => indices[s]).map(s => ({
      label: INDICES_LABELS[s] || s,
      price: indices[s].price,
      change: indices[s].change,
      symbol: s,
    })),
    ...favorites.slice(0, 6).filter(f => !f.error && f.price > 0).map(f => ({
      label: f.symbol.replace(/-USD$/, "").replace(/\..*/, ""),
      price: f.price,
      change: f.change,
      symbol: f.symbol,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-black/25 backdrop-blur-sm">
      <div className="flex" style={{ animation: "ticker 55s linear infinite", width: "max-content" }}>
        {[...items, ...items].map((item, i) => (
          <Link key={i} href={`/analysis?symbol=${item.symbol}`}
            className="flex items-center gap-2.5 px-5 py-2.5 whitespace-nowrap group border-r border-white/5 last:border-r-0">
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              {item.label}
            </span>
            <span className="text-xs font-bold tabular-nums">{fmt(item.price)}</span>
            <span className={cn("text-[11px] font-bold flex items-center gap-0.5",
              item.change >= 0 ? "text-profit" : "text-loss"
            )}>
              {item.change >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(item.change))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
});

const PortfolioCard = memo(function PortfolioCard({
  balance, stats, avgFavChange, openPositions, favorites,
  isAdmin, isPremium, editMode, setEditMode, isRefreshing,
  dashRefreshRate, setDashRefreshRate, onRefresh, formatCurrency, lang,
}: {
  balance: WalletBalance | null;
  stats: TradingStats | null;
  avgFavChange: number;
  openPositions: Position[];
  favorites: Favorite[];
  isAdmin: boolean;
  isPremium: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  isRefreshing: boolean;
  dashRefreshRate: number;
  setDashRefreshRate: (v: number) => void;
  onRefresh: () => void;
  formatCurrency: (v: number) => string;
  lang: string;
}) {
  const totalBalance = balance?.total_equity || balance?.balance || 0;

  return (
    <div className="glass-card p-5 relative overflow-hidden h-full flex flex-col">
      {/* Radial glow */}
      <div className="absolute top-0 right-0 w-56 h-56 pointer-events-none"
        style={{ background: "radial-gradient(circle at 100% 0%, hsl(var(--primary)/0.18) 0%, transparent 65%)" }} />

      <div className="relative flex flex-col flex-1">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              {lang === "fr" ? "Portefeuille" : "Portfolio"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link href="/admin" title="Admin"
                className="p-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 transition-colors">
                <Shield className="w-3.5 h-3.5" />
              </Link>
            )}
            {isPremium && (
              <button onClick={() => setEditMode(!editMode)}
                className={cn("p-1.5 rounded-lg transition-colors",
                  editMode ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground")}>
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onRefresh} disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </button>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/8">
              <Timer className={cn("w-3 h-3 flex-shrink-0", dashRefreshRate > 0 ? "text-profit" : "text-muted-foreground")} />
              <select value={dashRefreshRate} onChange={e => setDashRefreshRate(Number(e.target.value))}
                className="bg-transparent text-xs cursor-pointer outline-none text-muted-foreground">
                {[{ l: "Off", ms: 0 }, { l: "3m", ms: 180_000 }, { l: "5m", ms: 300_000 }, { l: "10m", ms: 600_000 }].map(o => (
                  <option key={o.ms} value={o.ms} className="bg-card text-foreground">{o.l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Balance */}
        <p className="text-4xl md:text-5xl font-bold tabular-nums leading-none mb-1">
          {formatCurrency(totalBalance)}
        </p>
        <p className="text-xs text-muted-foreground mb-4">{lang === "fr" ? "Solde total" : "Total balance"}</p>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2 mt-auto">
          {openPositions.length > 0 && (
            <Link href="/trading"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all text-xs font-semibold text-primary">
              <Layers className="w-3.5 h-3.5" />
              {openPositions.length} {lang === "fr" ? `position${openPositions.length > 1 ? "s" : ""}` : `position${openPositions.length > 1 ? "s" : ""}`}
            </Link>
          )}
          {favorites.length > 0 && (
            <Link href="/favorites"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 transition-all text-xs">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              {favorites.length} {lang === "fr" ? "actifs" : "assets"}
            </Link>
          )}
          {(stats?.total_trades || 0) > 0 && (
            <Link href="/wallet"
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold",
                (stats?.win_rate || 0) >= 50
                  ? "bg-profit/10 hover:bg-profit/20 border-profit/20 text-profit"
                  : "bg-white/5 hover:bg-white/10 border-white/8 text-muted-foreground")}>
              <Target className="w-3.5 h-3.5" />
              {stats?.win_rate || 0}% win
            </Link>
          )}
          {avgFavChange !== 0 && (
            <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold",
              avgFavChange >= 0 ? "bg-profit/10 border-profit/20 text-profit" : "bg-loss/10 border-loss/20 text-loss")}>
              {avgFavChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {avgFavChange >= 0 ? "+" : ""}{formatPercent(avgFavChange)} {lang === "fr" ? "moy." : "avg"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const MarketCardsRow = memo(function MarketCardsRow({
  indices, isLoading, onRefresh, lang,
}: {
  indices: Record<string, { price: number; change: number }>;
  isLoading: boolean;
  onRefresh: () => void;
  lang: string;
}) {
  const fmt = (p: number) =>
    p > 1000
      ? p.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
      : p.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {lang === "fr" ? "Marchés clés" : "Key Markets"}
          </h2>
        </div>
        <button onClick={onRefresh} disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* 3 featured cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
        {FEATURED_INDICES.map(({ sym, label, labelEn, icon }) => {
          const d    = indices[sym];
          const isUp = d ? d.change >= 0 : true;
          return (
            <Link key={sym} href={`/analysis?symbol=${sym}`}>
              <div className="p-2.5 sm:p-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/12 transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{icon}</span>
                  {d ? (
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      isUp ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss")}>
                      {isUp ? "+" : ""}{formatPercent(d.change)}
                    </span>
                  ) : (
                    <div className="w-10 h-4 bg-white/10 rounded-full animate-pulse" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase tracking-wider">
                  {lang === "fr" ? label : labelEn}
                </p>
                {d ? (
                  <>
                    <p className="text-base font-bold tabular-nums group-hover:text-primary transition-colors">
                      {fmt(d.price)}
                    </p>
                    {/* Trend bar */}
                    <div className="mt-2.5 h-[2px] rounded-full bg-white/8 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.abs(d.change) * 15 + 20)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn("h-full rounded-full", isUp ? "bg-profit" : "bg-loss")}
                      />
                    </div>
                  </>
                ) : (
                  <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Secondary indices */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-auto">
        {SECONDARY_INDICES.map(sym => {
          const d    = indices[sym];
          const isUp = d ? d.change >= 0 : true;
          return (
            <Link key={sym} href={`/analysis?symbol=${sym}`}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 hover:border-white/10 transition-all">
              <span className="text-xs font-semibold text-muted-foreground">{INDICES_LABELS[sym] || sym}</span>
              {d ? (
                <>
                  <span className="text-xs font-bold tabular-nums">{fmt(d.price)}</span>
                  <span className={cn("text-[11px] font-bold", isUp ? "text-profit" : "text-loss")}>
                    {isUp ? "+" : ""}{formatPercent(d.change)}
                  </span>
                </>
              ) : (
                <span className="w-10 h-3 bg-white/10 rounded animate-pulse inline-block" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
});

const QuickActionsBar = memo(function QuickActionsBar() {
  const { t, lang } = useLanguage();
  const actions = [
    { href: "/analysis",  Icon: BarChart3,  label: t("qa_analyze"),      iconCls: "text-primary",     bgCls: "bg-primary/12 group-hover:bg-primary/22" },
    { href: "/markets",   Icon: Globe,      label: t("qa_markets"),      iconCls: "text-cyan-400",    bgCls: "bg-cyan-400/12 group-hover:bg-cyan-400/22" },
    { href: "/scanner",   Icon: Activity,   label: "Scanner",            iconCls: "text-profit",      bgCls: "bg-profit/12 group-hover:bg-profit/22" },
    { href: "/assistant", Icon: Bot,        label: t("qa_ai_assistant"), iconCls: "text-purple-400",  bgCls: "bg-purple-400/12 group-hover:bg-purple-400/22" },
    { href: "/trading",   Icon: TrendingUp, label: t("nav_positions"),   iconCls: "text-yellow-400",  bgCls: "bg-yellow-400/12 group-hover:bg-yellow-400/22" },
    { href: "/favorites", Icon: Star,       label: t("qa_favorites"),    iconCls: "text-orange-400",  bgCls: "bg-orange-400/12 group-hover:bg-orange-400/22" },
    { href: "/learn",     Icon: GraduationCap, label: lang === "fr" ? "Formation" : "Learn", iconCls: "text-emerald-400", bgCls: "bg-emerald-400/12 group-hover:bg-emerald-400/22" },
    { href: "/journal",   Icon: NotebookPen,   label: "Journal",         iconCls: "text-pink-400",    bgCls: "bg-pink-400/12 group-hover:bg-pink-400/22" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-0.5">
      {actions.map(({ href, Icon, label, iconCls, bgCls }) => (
        <Link key={href} href={href} className="flex-shrink-0 group">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/14 transition-all">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", bgCls)}>
              <Icon className={cn("w-4 h-4", iconCls)} />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">{label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
});

const FavoriteCard = memo(function FavoriteCard({
  favorite, formatPrice,
}: { favorite: Favorite; formatPrice: (v: number, symbol: string) => string }) {
  const isProfit = favorite.change >= 0;
  const info     = getAssetInfo(favorite.symbol);
  const logoUrl  = getAssetLogo(favorite.symbol);

  return (
    <Link href={`/analysis?symbol=${favorite.symbol}`}>
      <div className="relative p-3 pl-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/12 transition-all cursor-pointer group overflow-hidden">
        {/* Left accent */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all",
          isProfit ? "bg-profit/70 group-hover:bg-profit" : "bg-loss/70 group-hover:bg-loss")} />

        <div className="flex items-center gap-2.5">
          {/* Logo */}
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={logoUrl} alt={info.name} className="w-5 h-5 object-contain"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.parentElement!.innerHTML = `<span class="text-xs font-bold">${favorite.symbol.slice(0, 2)}</span>`;
                }} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {favorite.symbol.slice(0, 2)}
            </div>
          )}

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs leading-tight truncate">
              {info.name !== favorite.symbol ? info.name : favorite.symbol}
            </p>
            <p className="text-[10px] text-muted-foreground">{favorite.symbol}</p>
          </div>

          {/* Price + change */}
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-xs tabular-nums">
              {favorite.error ? "—" : formatPrice(favorite.price, favorite.symbol)}
            </p>
            {!favorite.error && (
              <span className={cn("text-[10px] font-bold tabular-nums",
                isProfit ? "text-profit" : "text-loss")}>
                {isProfit ? "+" : ""}{formatPercent(favorite.change)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

const FavoritesWidget = memo(function FavoritesWidget({
  favorites, favSort, setFavSort, favFilter, setFavFilter, formatCurrency: _fc, formatPrice,
}: {
  favorites: Favorite[];
  favSort: "change_desc" | "change_asc" | "alpha";
  setFavSort: (s: "change_desc" | "change_asc" | "alpha") => void;
  favFilter: "all" | "profit" | "loss";
  setFavFilter: (f: "all" | "profit" | "loss") => void;
  formatCurrency: (v: number) => string;
  formatPrice: (v: number, symbol: string) => string;
}) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const MAX = 12;
  const displayed = showAll ? favorites : favorites.slice(0, MAX);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Star className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/80" />
          <h2 className="font-semibold">{t("dash_my_favorites")}</h2>
          {favorites.length > 0 && (
            <span className="text-xs bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">
              {favorites.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
            {(["all", "profit", "loss"] as const).map((val) => (
              <button key={val} onClick={() => setFavFilter(val)}
                className={cn("px-2.5 py-1 rounded text-xs transition-colors font-medium",
                  favFilter === val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {val === "all" ? t("dash_all") : val === "profit" ? "📈" : "📉"}
              </button>
            ))}
          </div>
          <select value={favSort} onChange={e => setFavSort(e.target.value as typeof favSort)}
            className="text-xs bg-white/5 rounded-lg px-2 py-1.5 text-muted-foreground border border-white/10 cursor-pointer outline-none">
            <option value="change_desc">Perf ↓</option>
            <option value="change_asc">Perf ↑</option>
            <option value="alpha">A → Z</option>
          </select>
          <Link href="/favorites" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t("dash_manage")}
          </Link>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
            <Star className="w-8 h-8 opacity-30" />
          </div>
          <p className="font-medium">{t("dash_no_tracked")}</p>
          <p className="text-sm mt-1">{t("dash_add_fav_hint")}</p>
          <Link href="/markets"
            className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline">
            <Plus className="w-4 h-4" /> {t("dash_explore_markets")}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {displayed.map(fav => (
              <FavoriteCard key={fav.symbol} favorite={fav} formatPrice={formatPrice} />
            ))}
          </div>
          {favorites.length > MAX && (
            <button onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-white/5 flex items-center justify-center gap-1.5">
              {showAll
                ? <><ChevronUp className="w-4 h-4" /> {t("dash_collapse")}</>
                : <><ChevronDown className="w-4 h-4" /> +{favorites.length - MAX} {t("dash_more_assets")}</>}
            </button>
          )}
        </>
      )}
    </div>
  );
});

const NewsWidget = memo(function NewsWidget({
  marketNews, isLoadingNews, newsFilter, setNewsFilter, hasFavorites, onRefresh, compact = false,
}: {
  marketNews: MarketNews | null;
  isLoadingNews: boolean;
  newsFilter: "all" | "mine";
  setNewsFilter: (f: "all" | "mine") => void;
  hasFavorites: boolean;
  onRefresh: () => void;
  compact?: boolean;
}) {
  const { t, lang } = useLanguage();
  const timeAgo = (ts: number) => {
    const diff = Date.now() / 1000 - ts;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}${lang === "fr" ? "j" : "d"}`;
  };

  return (
    <div className="glass-card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <Newspaper className="w-4.5 h-4.5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-profit rounded-full animate-pulse" />
          </div>
          <h2 className="font-semibold">{t("dash_news")}</h2>
          <span className="text-[9px] font-bold bg-profit/15 text-profit px-1.5 py-0.5 rounded uppercase tracking-wider">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasFavorites && (
            <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
              {(["all", "mine"] as const).map(val => (
                <button key={val} onClick={() => setNewsFilter(val)}
                  className={cn("px-2 py-1 rounded text-xs transition-colors font-medium",
                    newsFilter === val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {val === "all" ? t("dash_all") : t("dash_my_assets")}
                </button>
              ))}
            </div>
          )}
          <button onClick={onRefresh} disabled={isLoadingNews}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingNews && "animate-spin")} />
          </button>
        </div>
      </div>

      {isLoadingNews && !marketNews ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : marketNews ? (
        <div className={cn("space-y-1.5 overflow-y-auto pr-0.5", compact ? "max-h-[540px]" : "max-h-[380px]")}>
          {!compact && (marketNews.summary_points || marketNews.summary) && (
            <div className="mb-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{t("dash_ai_summary")}</span>
              </div>
              {marketNews.summary_points ? (
                <div className="space-y-3">
                  {marketNews.summary_points.map((point: SummaryPoint, idx: number) => (
                    <div key={idx} className="flex gap-2.5">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight mb-0.5">{point.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                        {point.assets && point.assets.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {point.assets.map((asset) => (
                              <Link key={asset.symbol} href={`/analysis?symbol=${asset.symbol}`}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 hover:bg-primary/30 border border-primary/30 text-primary text-[10px] font-medium transition-colors">
                                {asset.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{marketNews.summary}</p>
              )}
            </div>
          )}

          {(marketNews.news || []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">{t("dash_no_news")}</p>
          ) : (
            (marketNews.news || []).slice(0, compact ? 12 : 15).map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/3 hover:bg-white/8 transition-colors group border border-transparent hover:border-white/8">
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium group-hover:text-primary transition-colors leading-snug",
                    compact ? "text-xs line-clamp-2" : "text-sm line-clamp-2")}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {item.related && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase">
                        {item.related}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("dash_refresh_news")}</p>
        </div>
      )}
    </div>
  );
});

const TradingStatsWidget = memo(function TradingStatsWidget({
  stats, balance, formatCurrency,
}: { stats: TradingStats | null; balance: WalletBalance | null; formatCurrency: (v: number) => string }) {
  const { t } = useLanguage();
  const winRate    = useCounter(stats?.win_rate || 0);
  const totalTrades = useCounter(stats?.total_trades || 0);
  const delays = [0, 0.1, 0.2, 0.3];
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("dash_trading_stats")}</h2>
        </div>
        <Link href="/wallet" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {t("dash_view_wallet")}
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: t("wallet_winrate"),      value: `${winRate}%`,                          color: (stats?.win_rate || 0) >= 50 ? "text-profit" : "text-loss" },
          { label: t("wallet_total_trades"), value: String(totalTrades),                    color: "text-foreground" },
          { label: t("wallet_total_pnl"),    value: formatCurrency(stats?.total_pnl || 0),  color: (stats?.total_pnl || 0) >= 0 ? "text-profit" : "text-loss" },
          { label: t("dash_balance"),        value: formatCurrency(balance?.balance || 0),  color: "text-foreground" },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delays[idx] }}
            className="p-4 rounded-xl bg-white/5 border border-white/5"
          >
            <p className="text-xs text-muted-foreground mb-1.5">{item.label}</p>
            <p className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

const OpenPositionsWidget = memo(function OpenPositionsWidget({
  positions, formatCurrency,
}: { positions: Position[]; formatCurrency: (v: number) => string }) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">{t("dash_open_positions")}</h2>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
            {positions.length}
          </span>
        </div>
        <Link href="/trading" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {t("dash_view_all")}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {positions.slice(0, 6).map((pos) => {
          const pnl      = pos.unrealized_pnl || 0;
          const isProfit = pnl >= 0;
          return (
            <Link key={pos.id} href="/trading">
              <div className="relative flex items-center justify-between p-3 pl-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/10 transition-all overflow-hidden group">
                <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl",
                  pos.direction === "LONG" ? "bg-profit/60 group-hover:bg-profit" : "bg-loss/60 group-hover:bg-loss")} />
                <div>
                  <p className="font-bold text-sm">{pos.symbol}</p>
                  <p className="text-xs text-muted-foreground">{pos.direction} · {pos.leverage}x</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold text-sm tabular-nums", isProfit ? "text-profit" : "text-loss")}>
                    {isProfit ? "+" : ""}{formatCurrency(pnl)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("dash_entry")} {formatCurrency(pos.entry_price)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

// ── Markdown renderer for chat messages ──────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i} className="italic opacity-90">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code key={i} className="bg-black/30 px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderChatMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let k = 0;

  const flushList = () => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={k++} className="space-y-1 my-1.5 pl-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed">
            <span className="text-primary/70 mt-0.5 flex-shrink-0 text-[10px]">▸</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const li = line.match(/^[-*•] (.+)/);

    if (h1 || h2) {
      flushList();
      nodes.push(
        <p key={k++} className="font-bold text-foreground text-sm mt-3 mb-1 first:mt-0">
          {renderInline((h1 || h2)![1])}
        </p>
      );
    } else if (h3) {
      flushList();
      nodes.push(
        <p key={k++} className="font-semibold text-foreground/90 text-xs mt-2 mb-0.5">
          {renderInline(h3[1])}
        </p>
      );
    } else if (li) {
      listBuffer.push(li[1]);
    } else if (line.trim() === "") {
      flushList();
      if (nodes.length > 0) nodes.push(<div key={k++} className="h-1" />);
    } else {
      flushList();
      nodes.push(
        <p key={k++} className="text-xs leading-relaxed">{renderInline(line)}</p>
      );
    }
  }
  flushList();

  return <div className="space-y-0.5">{nodes}</div>;
}

const DashAIChatWidget = memo(function DashAIChatWidget() {
  const { lang, t } = useLanguage();
  const [messages, setMessages]                 = useState<ChatMessage[]>([]);
  const [input, setInput]                       = useState("");
  const [isLoading, setIsLoading]               = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isClearing, setIsClearing]             = useState(false);
  const [limitStatus, setLimitStatus]           = useState<AILimitStatus | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([aiAPI.getHistory(10), aiAPI.getLimit()])
      .then(([hist, limit]) => { setMessages(hist.messages); setLimitStatus(limit); })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    if (limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0) return;
    setMessages(prev => [...prev, { role: "user", content: msg, created_at: new Date().toISOString() }]);
    setInput("");
    setIsLoading(true);
    try {
      const res = await aiAPI.chat(msg);
      setMessages(prev => [...prev, { role: "assistant", content: res.response, created_at: new Date().toISOString() }]);
      missionsAPI.recordAction("ai_chat").catch(() => {});
      setLimitStatus(prev => (!prev || prev.is_premium) ? prev : {
        ...prev, remaining: Math.max(0, prev.remaining - 1), messages_today: prev.messages_today + 1,
      });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const errMsg = status === 429
        ? (limitStatus?.is_premium ? t("assistant_err_rate") : t("assistant_err_limit"))
        : t("assistant_err_generic");
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${errMsg}`, created_at: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try { await aiAPI.clearHistory(); } catch { /* API error — still clear locally */ }
    setMessages([]);
    setIsClearing(false);
  };

  const QUICK_PROMPTS = lang === "fr"
    ? [
        { label: "📊 Marché du jour",  text: "Résume le marché financier d'aujourd'hui" },
        { label: "💡 Idée de trade",   text: "Quelle est ta meilleure idée de trading en ce moment ?" },
        { label: "₿ Analyse Bitcoin",  text: "Analyse le Bitcoin : tendance, supports, résistances." },
        { label: "⚠️ Risques marché",  text: "Quels sont les principaux risques à surveiller sur les marchés ?" },
      ]
    : [
        { label: "📊 Market summary",  text: "Summarize today's financial market" },
        { label: "💡 Trade idea",      text: "What's your best trading idea right now?" },
        { label: "₿ Bitcoin analysis", text: "Analyze Bitcoin: trend, supports, resistances." },
        { label: "⚠️ Market risks",   text: "What are the main market risks to watch right now?" },
      ];

  const reachedLimit = limitStatus && !limitStatus.is_premium && limitStatus.remaining === 0;
  const showEmpty    = !isLoadingHistory && messages.length === 0;

  return (
    <div className="glass-card flex flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-profit rounded-full border border-card animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm leading-none">Assistant IA</span>
              <Sparkles className="w-3 h-3 text-primary/50" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
              {limitStatus && !limitStatus.is_premium
                ? `${limitStatus.remaining}/${limitStatus.daily_limit} msg`
                : lang === "fr" ? "Trading & Marchés" : "Trading & Markets"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button onClick={clearHistory} disabled={isClearing}
              title={lang === "fr" ? "Effacer l'historique" : "Clear history"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition-all disabled:opacity-40">
              {isClearing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <Link href="/assistant"
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg">
            {lang === "fr" ? "Tout voir" : "Open"} <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div ref={messagesContainerRef} className="overflow-y-auto px-4 py-3 space-y-3 flex-1"
        style={{ maxHeight: showEmpty ? "auto" : "320px", minHeight: "160px" }}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : showEmpty ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold">
              {lang === "fr" ? "Bonjour ! 👋" : "Hello! 👋"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {lang === "fr"
                ? "Posez une question sur les marchés ou choisissez une suggestion"
                : "Ask a question about markets or pick a suggestion"}
            </p>
          </div>
        ) : (
          messages.slice(-10).map((msg, i) => (
            <div key={i} className={cn("flex gap-2 items-end", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="w-2.5 h-2.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-none"
                  : "bg-white/8 border border-white/8 text-foreground/90 rounded-bl-none"
              )}>
                {msg.role === "user" ? msg.content : renderChatMarkdown(msg.content)}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2 items-end justify-start">
            <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mb-0.5">
              <Bot className="w-2.5 h-2.5 text-primary" />
            </div>
            <div className="bg-white/8 border border-white/8 rounded-2xl rounded-bl-none px-3.5 py-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick prompts ────────────────────────────────────────────── */}
      {showEmpty && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => send(p.text)} disabled={isLoading}
              className="text-left text-[11px] px-2.5 py-2 rounded-xl bg-white/4 hover:bg-primary/12 hover:text-primary border border-white/8 hover:border-primary/25 transition-all disabled:opacity-50 leading-tight font-medium">
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 border-t border-white/6">
        {reachedLimit ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
            <Crown className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{lang === "fr" ? "Limite quotidienne atteinte." : "Daily limit reached."}</span>
            <Link href="/premium" className="underline font-bold whitespace-nowrap">Premium</Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={lang === "fr" ? "Posez votre question…" : "Ask a question…"}
              disabled={isLoading}
              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/40 outline-none text-xs transition-colors placeholder:text-muted-foreground/50 disabled:opacity-60"
            />
            <button onClick={() => send()} disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0">
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
