"use client";

import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Star, Activity, ArrowUpRight, ArrowDownRight,
  Target, RefreshCw, Loader2, Newspaper, Shield, Plus, Globe,
  Bot, BarChart3, Settings2, Eye, EyeOff, ExternalLink, Clock,
  Layers, ChevronUp, ChevronDown, Timer, BookOpen, Wallet, Zap,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, favoritesAPI, adminAPI, aiAPI, marketAPI, settingsAPI, WalletBalance, TradingStats, Favorite, MarketNews, SummaryPoint, Position } from "@/lib/api";
import { useFormatCurrency, useFormatPrice } from "@/lib/SettingsContext";
import { useLanguage } from "@/lib/LanguageContext";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import dynamic from "next/dynamic";

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

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD CONFIG
// ─────────────────────────────────────────────────────────────────────────────

type WidgetId = "sessions" | "opportunities" | "trending" | "stats";

const DEFAULT_WIDGETS: WidgetId[] = ["stats", "sessions"];
const DASHBOARD_STORAGE_KEY = "tdb_dashboard_config_v3";
const REFRESH_STORAGE_KEY   = "tdb_dash_refresh";
const SORT_STORAGE_KEY      = "tdb_dash_sort";

const WIDGET_META: Record<WidgetId, { icon: string; color: string }> = {
  sessions:      { icon: "🌍", color: "text-blue-400" },
  stats:         { icon: "🎯", color: "text-primary" },
  opportunities: { icon: "⚡", color: "text-yellow-400" },
  trending:      { icon: "🔥", color: "text-orange-400" },
};

const INDICES_SYMBOLS = ["^FCHI", "^GSPC", "^IXIC", "BTC-USD", "GC=F", "^VIX"];
const INDICES_LABELS_BASE: Record<string, string> = {
  "^FCHI": "CAC 40", "^GSPC": "S&P 500", "^IXIC": "NASDAQ", "BTC-USD": "Bitcoin", "^VIX": "VIX",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const listItemVariants = {
  hidden: { opacity: 0, x: -14, scale: 0.97 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};
const newsItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useLanguage();
  const formatCurrency = useFormatCurrency();
  const formatPrice = useFormatPrice();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [indices, setIndices] = useState<Record<string, { price: number; change: number }>>({});
  const [isLoadingIndices, setIsLoadingIndices] = useState(false);
  const [favSort, setFavSort] = useState<"change_desc" | "change_asc" | "alpha">("change_desc");
  const [favFilter, setFavFilter] = useState<"all" | "profit" | "loss">("all");
  const [newsFilter, setNewsFilter] = useState<"all" | "mine">("all");
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [dashRefreshRate, setDashRefreshRate] = useState(180_000);
  const dashRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load ALL prefs on mount: backend first, localStorage fallback
  useEffect(() => {
    const storedRefresh = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (storedRefresh) setDashRefreshRate(Number(storedRefresh));
    const storedSort = localStorage.getItem(SORT_STORAGE_KEY) as typeof favSort | null;
    if (storedSort) setFavSort(storedSort);

    settingsAPI.get().then(s => {
      if (s.dashboard_widgets) {
        try { setActiveWidgets(JSON.parse(s.dashboard_widgets)); return; } catch {}
      }
      const local = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (local) { try { setActiveWidgets(JSON.parse(local)); } catch {} }
    }).catch(() => {
      const local = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (local) { try { setActiveWidgets(JSON.parse(local)); } catch {} }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveWidgetConfig = useCallback((widgets: WidgetId[]) => {
    setActiveWidgets(widgets);
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(widgets));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      settingsAPI.update({ dashboard_widgets: JSON.stringify(widgets) }).catch(() => {});
    }, 800);
  }, []);

  const handleRefreshRateChange = (ms: number) => {
    setDashRefreshRate(ms);
    localStorage.setItem(REFRESH_STORAGE_KEY, String(ms));
  };

  const handleFavSortChange = (s: typeof favSort) => {
    setFavSort(s);
    localStorage.setItem(SORT_STORAGE_KEY, s);
  };

  const toggleWidget = (id: WidgetId) => {
    saveWidgetConfig(
      activeWidgets.includes(id) ? activeWidgets.filter(w => w !== id) : [...activeWidgets, id]
    );
  };

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
    try {
      const data = await marketAPI.getPrices(INDICES_SYMBOLS);
      setIndices(data.prices);
    } catch { /* ignore */ } finally {
      setIsLoadingIndices(false);
    }
  }, []);

  const loadMarketNews = useCallback(async () => {
    setIsLoadingNews(true);
    try {
      const newsData = await aiAPI.getMarketNews();
      setMarketNews(newsData);
    } catch { /* ignore */ } finally {
      setIsLoadingNews(false);
    }
  }, []);

  const loadData = useCallback((showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    // Fire every call independently — UI updates as each one resolves
    walletAPI.getBalance().then(d => setBalance(d)).catch(() => {});
    walletAPI.getStats().then(d => setStats(d)).catch(() => {});
    favoritesAPI.getFavorites().then(d => setFavorites(d.favorites || [])).catch(() => setFavorites([]));
    adminAPI.checkAdmin().then(d => setIsAdmin(d.is_admin)).catch(() => {});
    walletAPI.getPositions("open").then(d => setOpenPositions(d.positions || [])).catch(() => setOpenPositions([]));
    loadIndices();
    loadMarketNews();
    if (showRefresh) setTimeout(() => setIsRefreshing(false), 1500);
  }, [loadIndices, loadMarketNews]);

  useEffect(() => {
    setIsLoading(false); // Show page immediately — data fills in as it arrives
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (dashRefreshIntervalRef.current) clearInterval(dashRefreshIntervalRef.current);
    if (dashRefreshRate > 0) {
      dashRefreshIntervalRef.current = setInterval(() => loadData(), dashRefreshRate);
    }
    return () => { if (dashRefreshIntervalRef.current) clearInterval(dashRefreshIntervalRef.current); };
  }, [dashRefreshRate, loadData]);

  const avgFavChange = useMemo(() => favorites.length > 0
    ? favorites.filter(f => !f.error).reduce((sum, f) => sum + f.change, 0) / Math.max(1, favorites.filter(f => !f.error).length)
    : 0, [favorites]);

  const totalUnrealizedPnl = useMemo(() =>
    openPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0),
  [openPositions]);

  const sortedFavorites = useMemo(() => [...favorites]
    .filter(f => favFilter === "all" ? true : favFilter === "profit" ? f.change >= 0 : f.change < 0)
    .sort((a, b) => {
      if (favSort === "change_desc") return b.change - a.change;
      if (favSort === "change_asc") return a.change - b.change;
      return a.symbol.localeCompare(b.symbol);
    }), [favorites, favFilter, favSort]);

  const filteredNews = useMemo(() => {
    if (newsFilter !== "mine" || !marketNews) return marketNews;
    const favoriteSymbols = new Set(favorites.map(f => f.symbol.replace(/-USD$/, "").replace(/\..*/, "")));
    return { ...marketNews, news: marketNews.news.filter(n => favoriteSymbols.has(n.related?.toUpperCase() || "")) };
  }, [newsFilter, marketNews, favorites]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">

      {/* ── Hero block ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="glass-card p-5 relative overflow-hidden">
        <motion.div
          className="absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.13) 0%, transparent 65%)" }}
        />
        <div className="relative flex items-start justify-between gap-4">
          {/* Left: balance + stats */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("dash_wallet_balance")}</p>
            <p className="text-3xl md:text-4xl font-bold tabular-nums">
              <AnimatedNumber
                value={balance?.total_equity || balance?.balance || 0}
                duration={1100}
                formatter={formatCurrency}
              />
            </p>

            {/* Portfolio split row — visible when positions are held */}
            {(balance?.positions_value || 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.1 }}
                className="flex items-center gap-4 mt-3 pt-3 border-t border-white/8"
              >
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Cash</p>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(balance?.balance || 0)}</p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{t("dash_open_positions")}</p>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(balance?.positions_value || 0)}</p>
                </div>
                {totalUnrealizedPnl !== 0 && (
                  <>
                    <div className="w-px h-6 bg-white/10" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{t("dash_unrealized_pnl")}</p>
                      <p className={cn("text-sm font-semibold tabular-nums", totalUnrealizedPnl >= 0 ? "text-profit" : "text-loss")}>
                        {totalUnrealizedPnl >= 0 ? "+" : ""}{formatCurrency(totalUnrealizedPnl)}
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Inline badges — s'affichent uniquement quand il y a de la donnée */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {avgFavChange !== 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                    avgFavChange >= 0 ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss")}
                >
                  {avgFavChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatPercent(Math.abs(avgFavChange))}
                  <span className="font-normal opacity-80">{t("dash_avg_abbrev").toLowerCase()}</span>
                </motion.span>
              )}
              {(stats?.win_rate || 0) > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.05 }}
                  className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                    (stats?.win_rate || 0) >= 50 ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss")}
                >
                  <Target className="w-3.5 h-3.5" />
                  {stats?.win_rate}% win rate
                </motion.span>
              )}
              {(stats?.total_pnl || 0) !== 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.08 }}
                  className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                    (stats?.total_pnl || 0) >= 0 ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss")}
                >
                  {(stats?.total_pnl || 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatCurrency(Math.abs(stats?.total_pnl || 0))} P&L
                </motion.span>
              )}
              {openPositions.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 }}>
                  <Link href="/trading"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
                    <Layers className="w-3.5 h-3.5" />
                    {openPositions.length} {openPositions.length > 1 ? "positions" : "position"}
                  </Link>
                </motion.div>
              )}
              {favorites.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.12 }}>
                  <Link href="/favorites"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/8 text-muted-foreground hover:text-foreground hover:bg-white/12 transition-colors">
                    <Star className="w-3.5 h-3.5" />
                    {favorites.length} {t("dash_tracked_count")}
                  </Link>
                </motion.div>
              )}
              {!stats?.total_trades && openPositions.length === 0 && favorites.length === 0 && (
                <Link href="/trading"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                  <Zap className="w-3.5 h-3.5" />
                  {t("dash_start_trading")}
                </Link>
              )}
            </div>
          </div>
          {/* Right: controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isAdmin && (
              <Link href="/admin" title="Panel Admin"
                className="p-2 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 transition-colors">
                <Shield className="w-4 h-4" />
              </Link>
            )}
            <button onClick={() => setEditMode(!editMode)} title={editMode ? t("dash_done") : t("dash_customize")}
              className={cn("p-2 rounded-lg transition-colors",
                editMode ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
              )}>
              <Settings2 className="w-4 h-4" />
            </button>
            <button onClick={() => loadData(true)} disabled={isRefreshing} title={t("dash_refresh_btn")}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </button>
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-muted-foreground">
              <Timer className={cn("w-3.5 h-3.5 flex-shrink-0", dashRefreshRate > 0 && "text-profit")} />
              <select value={dashRefreshRate} onChange={(e) => handleRefreshRateChange(Number(e.target.value))}
                className="bg-transparent text-xs cursor-pointer outline-none">
                {[{ label: "Off", ms: 0 }, { label: "3min", ms: 180_000 }, { label: "5min", ms: 300_000 }, { label: "10min", ms: 600_000 }].map(o => (
                  <option key={o.ms} value={o.ms} className="bg-card text-foreground">{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Indices bar ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <IndicesBar indices={indices} isLoading={isLoadingIndices} onRefresh={loadIndices} />
      </motion.div>

      {/* ── Quick Actions Bar ───────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <QuickActionsBar />
      </motion.div>

      {/* ── Weekly prep (conditional window) ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <WeeklyPrepWidget />
      </motion.div>

      {/* ── Open positions (only if user has some) ───────────────────────────── */}
      {openPositions.length > 0 && (
        <motion.div variants={itemVariants}>
          <OpenPositionsWidget positions={openPositions} formatCurrency={formatCurrency} />
        </motion.div>
      )}

      {/* ── Main 2-col: Favorites + News ────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <FavoritesWidget
            favorites={sortedFavorites}
            favSort={favSort}
            setFavSort={handleFavSortChange}
            favFilter={favFilter}
            setFavFilter={setFavFilter}
            formatCurrency={formatCurrency}
            formatPrice={formatPrice}
          />
        </div>
        <div className="lg:col-span-1">
          <NewsWidget
            marketNews={filteredNews}
            isLoadingNews={isLoadingNews}
            newsFilter={newsFilter}
            setNewsFilter={setNewsFilter}
            hasFavorites={favorites.length > 0}
            onRefresh={loadMarketNews}
            compact
          />
        </div>
      </motion.div>

      {/* ── Optional widgets ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeWidgets.map((widgetId) => {
          if (widgetId === "sessions") return (
            <motion.div key="sessions" variants={itemVariants} initial="hidden" animate="show" exit={{ opacity: 0, height: 0 }}>
              <SessionSummaryWidget />
            </motion.div>
          );
          if (widgetId === "opportunities") return (
            <motion.div key="opportunities" variants={itemVariants} initial="hidden" animate="show" exit={{ opacity: 0, height: 0 }}>
              <OpportunitiesWidget />
            </motion.div>
          );
          if (widgetId === "trending") return (
            <motion.div key="trending" variants={itemVariants} initial="hidden" animate="show" exit={{ opacity: 0, height: 0 }}>
              <TrendingWidget />
            </motion.div>
          );
          if (widgetId === "stats" && (stats?.total_trades || 0) > 0) return (
            <motion.div key="stats" variants={itemVariants} initial="hidden" animate="show" exit={{ opacity: 0, height: 0 }}>
              <TradingStatsWidget stats={stats} formatCurrency={formatCurrency} />
            </motion.div>
          );
          return null;
        })}
      </AnimatePresence>

      {/* ── Widget picker (tous les utilisateurs) ────────────────────────────── */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
          >
            <div className="glass-card p-5 border border-white/12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">{t("dash_customize_dash")}</h3>
                </div>
                <span className="text-xs text-muted-foreground">{t("dash_auto_saved")}</span>
              </div>
              <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3" variants={listVariants} initial="hidden" animate="show">
                {(Object.keys(WIDGET_META) as WidgetId[]).map((id) => {
                  const isActive = activeWidgets.includes(id);
                  const idx = activeWidgets.indexOf(id);
                  const labelKey = `widget_${id}_label` as Parameters<typeof t>[0];
                  const descKey  = `widget_${id}_desc`  as Parameters<typeof t>[0];
                  return (
                    <motion.div key={id} variants={newsItemVariants}>
                      <motion.button
                        onClick={() => toggleWidget(id)}
                        className={cn(
                          "w-full p-3 rounded-xl border text-left transition-colors",
                          isActive ? "border-primary/40 bg-primary/8" : "border-white/10 bg-white/3"
                        )}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 26 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-base">{WIDGET_META[id].icon}</span>
                          <motion.div
                            className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              isActive ? "border-primary bg-primary" : "border-white/30")}
                            animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.25 }}
                          >
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </motion.div>
                        </div>
                        <p className="text-xs font-semibold">{t(labelKey)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t(descKey)}</p>
                        {isActive && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/8">
                            <button onClick={(e) => { e.stopPropagation(); moveWidget(id, -1); }} disabled={idx <= 0}
                              className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); moveWidget(id, 1); }} disabled={idx >= activeWidgets.length - 1}
                              className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] text-muted-foreground ml-auto">#{idx + 1}</span>
                          </div>
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const QuickActionsBar = memo(function QuickActionsBar() {
  const { t } = useLanguage();
  const actions = [
    { href: "/trading",   Icon: TrendingUp, label: "Trading",           bg: "bg-primary/15",     icon: "text-primary"       },
    { href: "/analysis",  Icon: BarChart3,  label: t("qa_analyze"),     bg: "bg-blue-500/15",    icon: "text-blue-400"      },
    { href: "/assistant", Icon: Bot,        label: t("qa_ai_assistant"),bg: "bg-purple-500/15",  icon: "text-purple-400"    },
    { href: "/scanner",   Icon: Activity,   label: "Scanner",           bg: "bg-yellow-500/15",  icon: "text-yellow-400"    },
    { href: "/markets",   Icon: Globe,      label: t("qa_markets"),     bg: "bg-green-500/15",   icon: "text-green-400"     },
    { href: "/journal",   Icon: BookOpen,   label: "Journal",           bg: "bg-orange-500/15",  icon: "text-orange-400"    },
    { href: "/wallet",    Icon: Wallet,     label: "Wallet",            bg: "bg-teal-500/15",    icon: "text-teal-400"      },
    { href: "/favorites", Icon: Star,       label: t("qa_favorites"),   bg: "bg-yellow-500/15",  icon: "text-yellow-500"    },
  ];
  return (
    <div className="glass-card px-3 py-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {actions.map((a, i) => (
          <motion.div key={a.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }} className="flex-shrink-0">
            <Link href={a.href}>
              <motion.div
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl cursor-pointer min-w-[64px]"
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", a.bg)}>
                  <a.Icon className={cn("w-4.5 h-4.5", a.icon)} style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{a.label}</span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
});


const FavoriteCard = memo(function FavoriteCard({ favorite, formatPrice }: { favorite: Favorite; formatPrice: (v: number, symbol: string) => string }) {
  const isProfit = favorite.change >= 0;
  const info = getAssetInfo(favorite.symbol);
  const logoUrl = getAssetLogo(favorite.symbol);

  return (
    <motion.div variants={listItemVariants}>
      <Link href={`/analysis?symbol=${favorite.symbol}`}>
        <motion.div
          className="p-3 rounded-xl bg-white/5 cursor-pointer group"
          whileHover={{ backgroundColor: "rgba(255,255,255,0.09)", scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={logoUrl} alt={info.name} className="w-6 h-6 object-contain"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = "none";
                    t.parentElement!.innerHTML = `<span class="text-xs font-bold">${favorite.symbol.slice(0,2)}</span>`;
                  }} />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {favorite.symbol.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{info.name !== favorite.symbol ? info.name : favorite.symbol}</p>
              <p className="text-[11px] text-muted-foreground">{favorite.symbol}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm">{favorite.error ? "—" : formatPrice(favorite.price, favorite.symbol)}</p>
              {!favorite.error && (
                <motion.div
                  className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium mt-0.5",
                    isProfit ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
                  )}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.05 }}
                >
                  {isProfit ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {formatPercent(favorite.change)}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
});

const IndicesBar = memo(function IndicesBar({ indices, isLoading, onRefresh }: {
  indices: Record<string, { price: number; change: number }>;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const indicesLabels: Record<string, string> = { ...INDICES_LABELS_BASE, "GC=F": t("dash_gold") };
  return (
    <div className="glass-card px-4 py-3">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {/* Label + refresh */}
        <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
          <Activity className="w-3.5 h-3.5" />
          <button onClick={onRefresh} disabled={isLoading} className="p-0.5 hover:text-foreground transition-colors">
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </button>
        </div>
        <div className="w-px h-5 bg-white/10 flex-shrink-0" />
        {/* Pills */}
        {INDICES_SYMBOLS.map((sym, i) => {
          const d = indices[sym];
          const isUp = d ? d.change >= 0 : true;
          return (
            <motion.div
              key={sym}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
            >
              <Link href={`/analysis?symbol=${sym}`}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 hover:scale-[1.04] transition-all duration-150"
              >
                <span className="text-xs font-semibold text-muted-foreground">{indicesLabels[sym] || sym}</span>
                {d ? (
                  <>
                    <span className="text-xs font-bold">
                      {d.price > 1000
                        ? d.price.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                        : d.price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", isUp ? "text-profit" : "text-loss")}>
                      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {formatPercent(d.change)}
                    </span>
                  </>
                ) : (
                  <span className="w-12 h-3 bg-white/10 rounded animate-pulse inline-block" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

const FavoritesWidget = memo(function FavoritesWidget({ favorites, favSort, setFavSort, favFilter, setFavFilter, formatCurrency, formatPrice }: {
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
  const displayed = showAll ? favorites : favorites.slice(0, 8);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h2 className="text-lg font-semibold">{t("dash_my_favorites")}</h2>
          {favorites.length > 0 && (
            <span className="text-xs bg-white/10 text-muted-foreground px-2 py-0.5 rounded-full">{favorites.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
            {([["all", t("dash_all")], ["profit", "📈"], ["loss", "📉"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFavFilter(val as typeof favFilter)}
                className={cn("px-2 py-1 rounded text-xs transition-colors", favFilter === val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
              >{label}</button>
            ))}
          </div>
          <select value={favSort} onChange={e => setFavSort(e.target.value as typeof favSort)}
            className="text-xs bg-white/5 rounded-lg px-2 py-1.5 text-muted-foreground border border-white/10 cursor-pointer">
            <option value="change_desc">Perf ↓</option>
            <option value="change_asc">Perf ↑</option>
            <option value="alpha">A → Z</option>
          </select>
          <Link href="/favorites" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("dash_manage")}</Link>
        </div>
      </div>
      {favorites.length === 0 ? (
        <div className="py-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
            <p className="font-semibold text-sm">{t("dash_no_tracked")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dash_add_fav_hint")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/markets",  Icon: Globe,     label: t("dash_browse_markets"), sub: t("dash_stocks_crypto"),  bg: "bg-green-500/10",  ic: "text-green-400"  },
              { href: "/scanner",  Icon: Activity,  label: t("dash_scan_signals"),   sub: t("dash_realtime_opp"),   bg: "bg-yellow-500/10", ic: "text-yellow-400" },
              { href: "/analysis", Icon: BarChart3, label: t("dash_analyze_asset"),  sub: t("dash_technical_ind"),  bg: "bg-blue-500/10",   ic: "text-blue-400"   },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className="p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", item.bg)}>
                    <item.Icon className={cn("w-4 h-4", item.ic)} />
                  </div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            {displayed.map((fav) => (
              <FavoriteCard key={fav.symbol} favorite={fav} formatPrice={formatPrice} />
            ))}
          </motion.div>
          {favorites.length > 8 && (
            <button onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-white/5 flex items-center justify-center gap-1"
            >
              {showAll ? <><ChevronUp className="w-4 h-4" /> {t("dash_collapse")}</> : <><ChevronDown className="w-4 h-4" /> +{favorites.length - 8} {t("dash_more_assets")}</>}
            </button>
          )}
        </>
      )}
    </div>
  );
});

const NewsWidget = memo(function NewsWidget({ marketNews, isLoadingNews, newsFilter, setNewsFilter, hasFavorites, onRefresh, compact = false }: {
  marketNews: MarketNews | null;
  isLoadingNews: boolean;
  newsFilter: "all" | "mine";
  setNewsFilter: (f: "all" | "mine") => void;
  hasFavorites: boolean;
  onRefresh: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const timeAgo = (ts: number) => {
    const diff = (Date.now() / 1000) - ts;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}${t("dash_day_abbrev")}`;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("dash_news")}</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasFavorites && (
            <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
              {([["all", t("dash_all")], ["mine", t("dash_my_assets")]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setNewsFilter(val as typeof newsFilter)}
                  className={cn("px-2 py-1 rounded text-xs transition-colors", newsFilter === val ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                >{label}</button>
              ))}
            </div>
          )}
          <button onClick={onRefresh} disabled={isLoadingNews} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground">
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingNews && "animate-spin")} />
          </button>
        </div>
      </div>
      {isLoadingNews && !marketNews ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : marketNews ? (
        <div>
          {/* AI summary — hidden in compact (sidebar) mode */}
          {!compact && (marketNews.summary_points || marketNews.summary) && (
            <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t("dash_ai_summary")}</span>
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
          <motion.div
            className={cn("space-y-2 overflow-y-auto pr-1", compact ? "max-h-[520px]" : "max-h-[360px]")}
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            {(marketNews.news || []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("dash_no_news")}</p>
            ) : (
              (marketNews.news || []).slice(0, compact ? 10 : 12).map((item, i) => (
                <motion.a
                  key={i}
                  variants={newsItemVariants}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 group"
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.09)" }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium group-hover:text-primary transition-colors", compact ? "text-xs line-clamp-2" : "text-sm line-clamp-2")}>{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.related && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{item.related}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
              ))
            )}
          </motion.div>
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

const TradingStatsWidget = memo(function TradingStatsWidget({ stats, formatCurrency }: {
  stats: TradingStats | null;
  formatCurrency: (v: number) => string;
}) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("dash_trading_stats")}</h2>
        </div>
        <Link href="/wallet" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("dash_view_wallet")}</Link>
      </div>
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {[
          { label: t("wallet_winrate"),      num: stats?.win_rate || 0,       fmt: (v: number) => `${Math.round(v)}%`,    color: (stats?.win_rate || 0) >= 50 ? "text-profit" : "text-loss",  sub: `${stats?.winning_trades || 0}W / ${stats?.losing_trades || 0}L` },
          { label: t("wallet_total_trades"), num: stats?.total_trades || 0,   fmt: (v: number) => String(Math.round(v)),  color: "text-foreground",                                              sub: t("dash_closed_trades") },
          { label: t("wallet_total_pnl"),    num: stats?.total_pnl || 0,      fmt: (v: number) => `${v >= 0 ? "+" : ""}${formatCurrency(v)}`,  color: (stats?.total_pnl || 0) >= 0 ? "text-profit" : "text-loss", sub: `${t("dash_avg_abbrev")} ${formatCurrency(stats?.avg_pnl || 0)}` },
          { label: t("dash_best_trade"),     num: stats?.best_trade || 0,     fmt: (v: number) => `+${formatCurrency(Math.abs(v))}`,            color: "text-profit",                                              sub: `${t("dash_worst_abbrev")} ${formatCurrency(stats?.worst_trade || 0)}` },
        ].map(item => (
          <motion.div key={item.label} variants={newsItemVariants} className="p-4 rounded-xl bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={cn("text-xl font-bold tabular-nums", item.color)}>
              <AnimatedNumber value={item.num} formatter={item.fmt} duration={900} />
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{item.sub}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

const OpenPositionsWidget = memo(function OpenPositionsWidget({ positions, formatCurrency }: {
  positions: Position[];
  formatCurrency: (v: number) => string;
}) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("dash_open_positions")}</h2>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{positions.length}</span>
        </div>
        <Link href="/trading" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("dash_view_all")}</Link>
      </div>
      <motion.div className="space-y-2" variants={listVariants} initial="hidden" animate="show">
        {positions.slice(0, 5).map((pos, i) => {
          const pnl = pos.unrealized_pnl || 0;
          const isProfit = pnl >= 0;
          return (
            <motion.div
              key={pos.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 280, damping: 24 }}
            >
              <Link href="/trading">
                <motion.div
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.09)", x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className={cn("w-2 h-2 rounded-full flex-shrink-0", pos.direction === "LONG" ? "bg-profit" : "bg-loss")}
                      animate={isProfit ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div>
                      <p className="font-semibold text-sm">{pos.symbol}</p>
                      <p className="text-xs text-muted-foreground">{pos.direction} · {pos.leverage}x</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-semibold text-sm", isProfit ? "text-profit" : "text-loss")}>
                      {isProfit ? "+" : ""}{formatCurrency(pnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("dash_entry")} {formatCurrency(pos.entry_price)}</p>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
});
