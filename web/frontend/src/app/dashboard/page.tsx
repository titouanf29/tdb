"use client";

import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Star, Activity, ArrowUpRight, ArrowDownRight,
  Target, RefreshCw, Loader2, Newspaper, Shield, Plus, Globe,
  Bot, BarChart3, Settings2, Eye, EyeOff, ExternalLink, Clock,
  Layers, ChevronUp, ChevronDown, Crown, Timer,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, favoritesAPI, adminAPI, aiAPI, marketAPI, WalletBalance, TradingStats, Favorite, MarketNews, SummaryPoint, Position } from "@/lib/api";
import { useFormatCurrency, useFormatPrice } from "@/lib/SettingsContext";
import { usePremium } from "@/lib/PremiumContext";
import { useLanguage } from "@/lib/LanguageContext";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
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

type WidgetId = "sessions" | "opportunities" | "trending" | "stats" | "positions" | "quickactions";

const DEFAULT_WIDGETS: WidgetId[] = [];
const DASHBOARD_STORAGE_KEY = "tdb_dashboard_config_v2";

const WIDGET_ICONS: Record<WidgetId, string> = {
  sessions: "🌍", stats: "🎯", positions: "💼",
  opportunities: "⚡", trending: "🔥", quickactions: "⚡",
};

const INDICES_SYMBOLS = ["^FCHI", "^GSPC", "^IXIC", "BTC-USD", "GC=F", "^VIX"];
const INDICES_LABELS_BASE: Record<string, string> = {
  "^FCHI": "CAC 40", "^GSPC": "S&P 500", "^IXIC": "NASDAQ", "BTC-USD": "Bitcoin", "^VIX": "VIX",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const formatCurrency = useFormatCurrency();
  const formatPrice = useFormatPrice();
  const { isPremium } = usePremium();
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
  const [dashRefreshRate, setDashRefreshRate] = useState(180_000); // 3 min default
  const dashRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (stored) {
      try { setActiveWidgets(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const saveWidgetConfig = (widgets: WidgetId[]) => {
    setActiveWidgets(widgets);
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(widgets));
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
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.10) 0%, transparent 65%)" }} />
        <div className="relative flex items-start justify-between gap-4">
          {/* Left: balance + stats */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("dash_wallet_balance")}</p>
            <p className="text-3xl md:text-4xl font-bold tabular-nums">
              {formatCurrency(balance?.total_equity || balance?.balance || 0)}
            </p>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {avgFavChange !== 0 && (
                <span className={cn("flex items-center gap-1 text-sm font-medium", avgFavChange >= 0 ? "text-profit" : "text-loss")}>
                  {avgFavChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {formatPercent(Math.abs(avgFavChange))}
                  <span className="text-muted-foreground font-normal">{lang === "fr" ? "moy. actifs" : "avg assets"}</span>
                </span>
              )}
              {openPositions.length > 0 && (
                <Link href="/trading" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <Layers className="w-3.5 h-3.5" />
                  {openPositions.length} {lang === "fr" ? `position${openPositions.length > 1 ? "s" : ""} ouverte${openPositions.length > 1 ? "s" : ""}` : `open position${openPositions.length > 1 ? "s" : ""}`}
                </Link>
              )}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="w-3.5 h-3.5" />
                {favorites.length} {lang === "fr" ? "actifs suivis" : "tracked"}
              </span>
              {(stats?.total_trades || 0) > 0 && (
                <span className={cn("flex items-center gap-1 text-sm font-medium", (stats?.win_rate || 0) >= 50 ? "text-profit" : "text-loss")}>
                  <Target className="w-3.5 h-3.5" />
                  {stats?.win_rate || 0}% win rate
                </span>
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
            {isPremium && (
              <button onClick={() => setEditMode(!editMode)} title={editMode ? t("dash_done") : t("dash_customize")}
                className={cn("p-2 rounded-lg transition-colors",
                  editMode ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                )}>
                <Settings2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => loadData(true)} disabled={isRefreshing} title={lang === "en" ? "Refresh" : "Actualiser"}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </button>
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-muted-foreground">
              <Timer className={cn("w-3.5 h-3.5 flex-shrink-0", dashRefreshRate > 0 && "text-profit")} />
              <select value={dashRefreshRate} onChange={(e) => setDashRefreshRate(Number(e.target.value))}
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
            setFavSort={setFavSort}
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

      {/* ── Optional extra widgets (premium) ────────────────────────────────── */}
      {activeWidgets.map((widgetId) => {
        if (widgetId === "sessions") return (
          <motion.div key="sessions" variants={itemVariants}><SessionSummaryWidget /></motion.div>
        );
        if (widgetId === "opportunities") return (
          <motion.div key="opportunities" variants={itemVariants}><OpportunitiesWidget /></motion.div>
        );
        if (widgetId === "trending") return (
          <motion.div key="trending" variants={itemVariants}><TrendingWidget /></motion.div>
        );
        if (widgetId === "stats" && (stats?.total_trades || 0) > 0) return (
          <motion.div key="stats" variants={itemVariants}>
            <TradingStatsWidget stats={stats} balance={balance} formatCurrency={formatCurrency} />
          </motion.div>
        );
        if (widgetId === "quickactions") return (
          <motion.div key="quickactions" variants={itemVariants}><QuickActionsWidget isPremium={isPremium} /></motion.div>
        );
        return null;
      })}

      {/* ── Premium widget picker ───────────────────────────────────────────── */}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.keys(WIDGET_ICONS) as WidgetId[]).map((id) => {
                  const isActive = activeWidgets.includes(id);
                  const idx = activeWidgets.indexOf(id);
                  const labelKey = `widget_${id}_label` as Parameters<typeof t>[0];
                  const descKey = `widget_${id}_desc` as Parameters<typeof t>[0];
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
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({ title, value, change, subtitle, icon: Icon, href }: {
  title: string; value: string; change?: number; subtitle?: string;
  icon: React.ElementType; href?: string;
}) {
  const isPositive = change !== undefined ? change >= 0 : true;
  const content = (
    <div className={cn("glass-card-hover p-5", href && "cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && change !== 0 ? (
            <div className={cn("flex items-center gap-1 mt-2 text-sm", isPositive ? "text-profit" : "text-loss")}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{formatPercent(Math.abs(change))}</span>
            </div>
          ) : (subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>)}
        </div>
        <div className="p-3 rounded-xl bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
});

const FavoriteCard = memo(function FavoriteCard({ favorite, formatPrice }: { favorite: Favorite; formatPrice: (v: number, symbol: string) => string }) {
  const isProfit = favorite.change >= 0;
  const info = getAssetInfo(favorite.symbol);
  const logoUrl = getAssetLogo(favorite.symbol);

  return (
    <Link href={`/analysis?symbol=${favorite.symbol}`}>
      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
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
              <div className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium mt-0.5",
                isProfit ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
              )}>
                {isProfit ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {formatPercent(favorite.change)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

const IndicesBar = memo(function IndicesBar({ indices, isLoading, onRefresh }: {
  indices: Record<string, { price: number; change: number }>;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { t, lang } = useLanguage();
  const indicesLabels: Record<string, string> = { ...INDICES_LABELS_BASE, "GC=F": lang === "fr" ? "Or" : "Gold" };
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
        {INDICES_SYMBOLS.map((sym) => {
          const d = indices[sym];
          const isUp = d ? d.change >= 0 : true;
          return (
            <Link key={sym} href={`/analysis?symbol=${sym}`}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
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
        <div className="text-center py-10 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("dash_no_tracked")}</p>
          <p className="text-sm mt-1">{t("dash_add_fav_hint")}</p>
          <Link href="/markets" className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline">
            <Plus className="w-4 h-4" /> {t("dash_explore_markets")}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayed.map((fav) => (
              <FavoriteCard key={fav.symbol} favorite={fav} formatPrice={formatPrice} />
            ))}
          </div>
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
  const { t, lang } = useLanguage();
  const timeAgo = (ts: number) => {
    const diff = (Date.now() / 1000) - ts;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}${lang === "fr" ? "j" : "d"}`;
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
          <div className={cn("space-y-2 overflow-y-auto pr-1", compact ? "max-h-[520px]" : "max-h-[360px]")}>
            {(marketNews.news || []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("dash_no_news")}</p>
            ) : (
              (marketNews.news || []).slice(0, compact ? 10 : 12).map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
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
                </a>
              ))
            )}
          </div>
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

const TradingStatsWidget = memo(function TradingStatsWidget({ stats, balance, formatCurrency }: {
  stats: TradingStats | null;
  balance: WalletBalance | null;
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("wallet_winrate"),        value: `${stats?.win_rate || 0}%`,           color: (stats?.win_rate || 0) >= 50 ? "text-profit" : "text-loss" },
          { label: t("wallet_total_trades"),   value: String(stats?.total_trades || 0),      color: "text-foreground" },
          { label: t("wallet_total_pnl"),      value: formatCurrency(stats?.total_pnl || 0), color: (stats?.total_pnl || 0) >= 0 ? "text-profit" : "text-loss" },
          { label: t("dash_balance"),          value: formatCurrency(balance?.balance || 0), color: "text-foreground" },
        ].map(item => (
          <div key={item.label} className="p-4 rounded-xl bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
          </div>
        ))}
      </div>
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
      <div className="space-y-2">
        {positions.slice(0, 5).map((pos) => {
          const pnl = pos.unrealized_pnl || 0;
          const isProfit = pnl >= 0;
          return (
            <Link key={pos.id} href="/trading">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", pos.direction === "LONG" ? "bg-profit" : "bg-loss")} />
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
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

const QuickActionsWidget = memo(function QuickActionsWidget({ isPremium: _ }: { isPremium: boolean }) {
  const { t } = useLanguage();
  const actions = [
    { href: "/analysis",  icon: <BarChart3 className="w-5 h-5" />,  label: t("qa_analyze"),      sub: t("qa_asset") },
    { href: "/markets",   icon: <Globe className="w-5 h-5" />,      label: t("qa_markets"),      sub: t("qa_explore") },
    { href: "/scanner",   icon: <Activity className="w-5 h-5" />,   label: "Scanner",            sub: t("qa_opportunities") },
    { href: "/assistant", icon: <Bot className="w-5 h-5" />,        label: t("qa_ai_assistant"), sub: t("qa_advice") },
    { href: "/trading",   icon: <TrendingUp className="w-5 h-5" />, label: t("dash_positions"),  sub: "Paper trading" },
    { href: "/favorites", icon: <Star className="w-5 h-5" />,       label: t("qa_favorites"),    sub: "Watchlist" },
  ];

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-4">{t("widget_quickactions_label")}</h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {actions.map(a => (
          <Link key={a.href} href={a.href}>
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.03] text-center cursor-pointer group">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                {a.icon}
              </div>
              <p className="text-xs font-semibold">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});
