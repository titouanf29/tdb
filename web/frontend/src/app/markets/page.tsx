"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Search, Star, StarOff,
  ChevronRight, Loader2, Clock, Circle, ChevronDown,
  RefreshCw, Timer, Crown, ArrowUpRight, ArrowDownRight, Zap,
} from "lucide-react";
import { cn, formatPercent, formatVolume } from "@/lib/utils";
import { marketAPI, favoritesAPI, Market, Asset } from "@/lib/api";
import { MARKET_SYMBOLS } from "@/lib/marketSymbols";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { authHeaders } from "@/lib/auth";
import { isMarketOpen, getMarketHoursDisplay, getTimeUntilChange } from "@/lib/marketStatus";
import { useFormatPrice, useSettings } from "@/lib/SettingsContext";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";
import { usePremium } from "@/lib/PremiumContext";

const PAGE_SIZE = 20;

const FREE_INTERVALS = [
  { label: "Off",    ms: 0 },
  { label: "10 min", ms: 600_000 },
  { label: "30 min", ms: 1_800_000 },
];
const PREMIUM_INTERVALS = [
  { label: "Off",    ms: 0 },
  { label: "1 min",  ms: 60_000 },
  { label: "2 min",  ms: 120_000 },
  { label: "5 min",  ms: 300_000 },
  { label: "10 min", ms: 600_000 },
  { label: "30 min", ms: 1_800_000 },
];

const marketIcons: Record<string, string> = {
  USA: "🇺🇸", EUROPE: "🇪🇺", ASIA: "🌏",
  CRYPTO: "₿", FOREX: "💱", COMMODITIES: "🥇",
};

export default function MarketsPage() {
  const { t, lang } = useLanguage();
  const router      = useRouter();
  const formatPrice = useFormatPrice();
  const { settings, setCurrency } = useSettings();
  const { isPremium, isAdmin }    = usePremium();

  const [markets, setMarkets]               = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [assets, setAssets]                 = useState<Asset[]>([]);
  const [favorites, setFavorites]           = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery]       = useState("");
  const [isLoading, setIsLoading]           = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingMore, setIsLoadingMore]   = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [hasMore, setHasMore]               = useState(false);
  const [totalAssets, setTotalAssets]       = useState(0);
  const [searchResults, setSearchResults]   = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [priceFlash, setPriceFlash]         = useState<Record<string, "up" | "down">>({});
  const [refreshRate, setRefreshRate]       = useState<number>(0);
  const [topMovers, setTopMovers]           = useState<{ gainers: Asset[]; losers: Asset[] } | null>(null);

  const prevPricesRef      = useRef<Record<string, number>>({});
  const autoRefreshRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervals          = (isPremium || isAdmin) ? PREMIUM_INTERVALS : FREE_INTERVALS;

  // ── Load markets + favorites ─────────────────────────────────────────────
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const data = await marketAPI.getMarkets();
        setMarkets(data.markets);
        if (data.markets.length > 0) setSelectedMarket(data.markets[0].key);
      } catch { /* ignore */ } finally { setIsLoading(false); }
    };
    const loadFavorites = async () => {
      try {
        const data = await favoritesAPI.getFavorites();
        setFavorites(new Set(data.favorites.map(f => f.symbol)));
      } catch { /* ignore */ }
    };
    loadMarkets();
    loadFavorites();
  }, []);

  // ── Load assets when market changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedMarket) return;
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 20000);

    const loadAssets = async () => {
      setIsLoadingAssets(true);
      setAssets([]);
      setHasMore(false);
      try {
        const data = await marketAPI.getAssets(selectedMarket, PAGE_SIZE, 0);
        setAssets(data.assets);
        setTotalAssets(data.total);
        setHasMore(data.offset + data.limit < data.total);
        const symbols = data.assets.map((a: Asset) => a.symbol);
        if (symbols.length > 0) {
          setIsLoadingPrices(true);
          marketAPI.getPrices(symbols)
            .then(priceData => {
              const flashes: Record<string, "up" | "down"> = {};
              setAssets(prev => prev.map(a => {
                const p = priceData.prices[a.symbol];
                if (p) {
                  const prev = prevPricesRef.current[a.symbol];
                  if (prev !== undefined && p.price !== prev)
                    flashes[a.symbol] = p.price > prev ? "up" : "down";
                  prevPricesRef.current[a.symbol] = p.price;
                  return { ...a, price: p.price, change: p.change, volume: p.volume };
                }
                return a;
              }));
              if (Object.keys(flashes).length > 0) {
                setPriceFlash(flashes);
                setTimeout(() => setPriceFlash({}), 800);
              }
            })
            .catch(() => {})
            .finally(() => setIsLoadingPrices(false));
        }
      } catch { /* ignore */ } finally {
        clearTimeout(timer);
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [selectedMarket]);

  // ── Top movers — fetch from curated symbol list (same as dashboard) ──────
  useEffect(() => {
    if (!selectedMarket) return;
    const symbols = MARKET_SYMBOLS[selectedMarket];
    if (!symbols || symbols.length === 0) { setTopMovers(null); return; }
    marketAPI.getPrices(symbols)
      .then(priceData => {
        const items: Asset[] = symbols
          .map(sym => {
            const p = priceData.prices[sym];
            if (!p || typeof p.change !== "number") return null;
            const info = getAssetInfo(sym);
            return { symbol: sym, name: info?.name ?? sym, price: p.price, change: p.change } as Asset;
          })
          .filter((a): a is Asset => a !== null && a.change !== 0);
        if (items.length < 3) { setTopMovers(null); return; }
        const sorted = [...items].sort((a, b) => b.change - a.change);
        setTopMovers({ gainers: sorted.slice(0, 3), losers: sorted.slice(-3).reverse() });
      })
      .catch(() => setTopMovers(null));
  }, [selectedMarket]);

  // ── Auto-refresh prices ──────────────────────────────────────────────────
  const refreshPrices = useCallback(async () => {
    if (!selectedMarket || assets.length === 0) return;
    const symbols = assets.map(a => a.symbol);
    setIsLoadingPrices(true);
    try {
      const priceData = await marketAPI.getPrices(symbols);
      const flashes: Record<string, "up" | "down"> = {};
      setAssets(prev => prev.map(a => {
        const p = priceData.prices[a.symbol];
        if (p) {
          const prevPrice = prevPricesRef.current[a.symbol];
          if (prevPrice !== undefined && p.price !== prevPrice)
            flashes[a.symbol] = p.price > prevPrice ? "up" : "down";
          prevPricesRef.current[a.symbol] = p.price;
          return { ...a, price: p.price, change: p.change, volume: p.volume };
        }
        return a;
      }));
      if (Object.keys(flashes).length > 0) {
        setPriceFlash(flashes);
        setTimeout(() => setPriceFlash({}), 800);
      }
    } catch { /* ignore */ } finally { setIsLoadingPrices(false); }
  }, [selectedMarket, assets]);

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (refreshRate > 0) autoRefreshRef.current = setInterval(refreshPrices, refreshRate);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [refreshPrices, refreshRate]);

  // ── Load more ────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await marketAPI.getAssets(selectedMarket, PAGE_SIZE, assets.length);
      setAssets(prev => [...prev, ...data.assets]);
      setHasMore(data.offset + data.limit < data.total);
      const symbols = data.assets.map((a: Asset) => a.symbol);
      if (symbols.length > 0) {
        marketAPI.getPrices(symbols)
          .then(priceData => setAssets(prev => prev.map(a => {
            const p = priceData.prices[a.symbol];
            return p ? { ...a, price: p.price, change: p.change, volume: p.volume } : a;
          })))
          .catch(() => {});
      }
    } catch { /* ignore */ } finally { setIsLoadingMore(false); }
  };

  // ── Search ───────────────────────────────────────────────────────────────
  const fetchBackendSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setIsSearchingBackend(true);
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders() as HeadersInit,
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch { /* ignore */ } finally { setIsSearchingBackend(false); }
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(() => fetchBackendSearch(searchQuery), 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, fetchBackendSearch]);

  const handleMarketSelect = (key: string) => {
    setSelectedMarket(key);
    setSearchQuery("");
    setSearchResults([]);
  };

  const toggleFavorite = async (symbol: string) => {
    const wasFavorite = favorites.has(symbol);
    setFavorites(prev => { const n = new Set(prev); wasFavorite ? n.delete(symbol) : n.add(symbol); return n; });
    try {
      wasFavorite ? await favoritesAPI.removeFavorite(symbol) : await favoritesAPI.addFavorite(symbol);
    } catch {
      setFavorites(prev => { const n = new Set(prev); wasFavorite ? n.add(symbol) : n.delete(symbol); return n; });
    }
  };

  const isGlobalSearch = searchQuery.length >= 2;
  const filteredAssets = isGlobalSearch
    ? []
    : assets.filter(asset => {
        if (!searchQuery) return true;
        const info = getAssetInfo(asset.symbol);
        return (
          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (asset.name && asset.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <TopLoadingBar isLoading={isLoadingAssets || isLoadingPrices} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{t("markets_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("markets_subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency toggle */}
            <div className="flex items-center rounded-xl bg-white/5 border border-white/8 p-0.5 text-xs">
              {(["EUR", "USD"] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={cn("px-3 py-1.5 rounded-lg transition-all font-semibold",
                    settings.currency === c ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {c === "EUR" ? "€ EUR" : "$ USD"}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button onClick={refreshPrices} disabled={isLoadingPrices}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 transition-colors text-sm text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn("w-3.5 h-3.5", isLoadingPrices && "animate-spin")} />
              <span className="hidden sm:inline">{lang === "en" ? "Refresh" : "Actualiser"}</span>
            </button>

            {/* Auto-refresh */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs text-muted-foreground">
              <Timer className={cn("w-3.5 h-3.5 flex-shrink-0", refreshRate > 0 && "text-profit")} />
              <select value={refreshRate} onChange={e => setRefreshRate(Number(e.target.value))}
                className="bg-transparent text-xs cursor-pointer outline-none">
                {intervals.map(opt => (
                  <option key={opt.ms} value={opt.ms} className="bg-card text-foreground">{opt.label}</option>
                ))}
              </select>
              {!(isPremium || isAdmin) && (
                <span className="hidden md:flex items-center gap-0.5 text-[10px] text-yellow-500/70"
                  title={lang === "en" ? "Premium: down to 1 min" : "Premium: jusqu'à 1 min"}>
                  <Crown className="w-2.5 h-2.5" />1min
                </span>
              )}
            </div>

            <HelpGuide
              title={lang === "en" ? "Markets" : "Marchés"}
              intro={lang === "en" ? "Explore all available assets." : "Explore tous les actifs disponibles."}
              sections={lang === "en" ? [
                { title: "Market selection", desc: "Click on a market to filter assets." },
                { title: "Search",           desc: "Find an asset by name or symbol (AAPL, BTC…)." },
                { title: "Favorites",        desc: "Click the star to add an asset to your watchlist." },
                { title: "Analysis",         desc: "Click an asset row to open its full analysis." },
              ] : [
                { title: "Sélection du marché", desc: "Clique sur un marché pour filtrer les actifs." },
                { title: "Recherche",           desc: "Trouve un actif par nom ou symbole (AAPL, BTC…)." },
                { title: "Favoris",             desc: "Clique sur l'étoile pour ajouter un actif à ta watchlist." },
                { title: "Analyse",             desc: "Clique sur une ligne pour ouvrir l'analyse complète." },
              ]}
              tip={lang === "en" ? "Prices are slightly delayed (~1 min). Click Refresh for the latest data." : "Prix en léger différé (~1 min). Clique sur Actualiser pour forcer la mise à jour."}
            />
          </div>
        </div>

        {/* ── Market selector ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {markets.map(market => {
            const isOpen       = isMarketOpen(market.key);
            const hoursDisplay = getMarketHoursDisplay(market.key);
            const timeUntil    = getTimeUntilChange(market.key);
            const isSelected   = selectedMarket === market.key;
            return (
              <motion.button key={market.key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleMarketSelect(market.key)}
                className={cn("p-4 rounded-xl text-left transition-all border",
                  isSelected
                    ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.12)]"
                    : "bg-white/5 hover:bg-white/8 border-white/6 hover:border-white/12"
                )}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-2xl">{marketIcons[market.key] || "📈"}</span>
                  <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    isOpen ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                      isOpen ? "bg-profit animate-pulse" : "bg-loss")} />
                    {isOpen ? t("open") : t("closed")}
                  </div>
                </div>
                <p className={cn("font-semibold text-sm", isSelected && "text-primary")}>{market.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {market.asset_count} {t("asset")}
                </p>
                {timeUntil && (
                  <p className={cn("text-[10px] mt-1 font-medium", isOpen ? "text-yellow-400/80" : "text-profit/80")}>
                    {timeUntil}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <div className="relative">
          {isSearchingBackend ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <input type="text" placeholder={t("markets_search_ph")}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/40 outline-none text-sm transition-colors placeholder:text-muted-foreground/50" />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* ── Top Movers ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {topMovers && !isGlobalSearch && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Gainers */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-profit/15 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-profit" />
                  </div>
                  <span className="text-xs font-bold text-profit uppercase tracking-wider">
                    {lang === "fr" ? "Meilleures hausses" : "Top Gainers"}
                  </span>
                </div>
                <div className="space-y-2">
                  {topMovers.gainers.map(asset => {
                    const info    = getAssetInfo(asset.symbol);
                    const logoUrl = getAssetLogo(asset.symbol);
                    return (
                      <button key={asset.symbol} onClick={() => router.push(`/analysis?symbol=${asset.symbol}`)}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          {logoUrl ? (
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img src={logoUrl} alt={info.name} className="w-5 h-5 object-contain"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {asset.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs font-semibold leading-none group-hover:text-primary transition-colors">
                              {info.name !== asset.symbol ? info.name : asset.symbol}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{asset.symbol}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-profit">+{formatPercent(asset.change)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Losers */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-loss/15 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-loss" />
                  </div>
                  <span className="text-xs font-bold text-loss uppercase tracking-wider">
                    {lang === "fr" ? "Principales baisses" : "Top Losers"}
                  </span>
                </div>
                <div className="space-y-2">
                  {topMovers.losers.map(asset => {
                    const info    = getAssetInfo(asset.symbol);
                    const logoUrl = getAssetLogo(asset.symbol);
                    return (
                      <button key={asset.symbol} onClick={() => router.push(`/analysis?symbol=${asset.symbol}`)}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          {logoUrl ? (
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img src={logoUrl} alt={info.name} className="w-5 h-5 object-contain"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {asset.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs font-semibold leading-none group-hover:text-primary transition-colors">
                              {info.name !== asset.symbol ? info.name : asset.symbol}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{asset.symbol}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-loss">{formatPercent(asset.change)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Asset table ──────────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isLoadingPrices && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{lang === "fr" ? "Actualisation…" : "Updating…"}</span>
                </div>
              )}
              {!isLoadingPrices && !isGlobalSearch && (
                <span className="text-xs text-muted-foreground">
                  {assets.length} / {totalAssets} {t("markets_loaded")}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/50">
              Yahoo Finance · ~1min {lang === "fr" ? "différé" : "delay"}
            </span>
          </div>

          {isLoadingAssets ? (
            <SkeletonTable />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="w-10 p-3 pl-5 text-left text-xs text-muted-foreground font-medium">#</th>
                      <th className="p-3 text-left text-xs text-muted-foreground font-medium">{t("asset")}</th>
                      <th className="p-3 text-right text-xs text-muted-foreground font-medium">{t("price")}</th>
                      <th className="p-3 text-right text-xs text-muted-foreground font-medium">{t("change_24h")}</th>
                      <th className="p-3 text-right text-xs text-muted-foreground font-medium hidden md:table-cell">{t("volume")}</th>
                      <th className="p-3 pr-5 text-center text-xs text-muted-foreground font-medium w-20">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isGlobalSearch ? (
                      searchResults.length === 0 && !isSearchingBackend ? (
                        <tr>
                          <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                            {t("markets_no_results")} «&nbsp;{searchQuery}&nbsp;»
                          </td>
                        </tr>
                      ) : (
                        searchResults.map((result, index) => {
                          const logoUrl = getAssetLogo(result.symbol);
                          return (
                            <tr key={result.symbol}
                              className="border-b border-white/5 hover:bg-white/4 transition-colors cursor-pointer group"
                              onClick={() => router.push(`/analysis?symbol=${result.symbol}`)}>
                              <td className="p-3 pl-5 text-xs text-muted-foreground tabular-nums">{index + 1}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  {logoUrl ? (
                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      <img src={logoUrl} alt={result.name} className="w-6 h-6 object-contain"
                                        onError={e => {
                                          const el = e.target as HTMLImageElement;
                                          el.style.display = "none";
                                          el.parentElement!.innerHTML = `<span class="font-bold text-xs">${result.symbol.slice(0,2)}</span>`;
                                        }} />
                                    </div>
                                  ) : (
                                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      {result.symbol.slice(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{result.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{result.symbol} · {result.exchange}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-right text-sm text-muted-foreground" colSpan={2}>
                                <span className="text-xs italic">{t("markets_click_analyze")}</span>
                              </td>
                              <td className="p-3 hidden md:table-cell" />
                              <td className="p-3 pr-5">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={e => { e.stopPropagation(); toggleFavorite(result.symbol); }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                    {favorites.has(result.symbol)
                                      ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                      : <StarOff className="w-4 h-4 text-muted-foreground" />}
                                  </button>
                                  <div className="p-1.5 text-muted-foreground">
                                    <ChevronRight className="w-4 h-4" />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      filteredAssets.map((asset, index) => {
                        const assetInfo   = getAssetInfo(asset.symbol);
                        const logoUrl     = getAssetLogo(asset.symbol);
                        const displayName = asset.name || assetInfo.name;
                        const isUp        = asset.change >= 0;
                        const hasPrice    = !asset.error && asset.price;
                        const hasChange   = !asset.error && asset.change !== 0;

                        return (
                          <tr key={asset.symbol}
                            className="border-b border-white/5 hover:bg-white/4 transition-colors cursor-pointer group"
                            onClick={() => router.push(`/analysis?symbol=${asset.symbol}`)}>
                            <td className="p-3 pl-5 text-xs text-muted-foreground/50 tabular-nums font-medium">
                              {index + 1}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {logoUrl ? (
                                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img src={logoUrl} alt={displayName} className="w-6 h-6 object-contain"
                                      onError={e => {
                                        const el = e.target as HTMLImageElement;
                                        el.style.display = "none";
                                        el.parentElement!.innerHTML = `<span class="font-bold text-xs">${asset.symbol.slice(0,2)}</span>`;
                                      }} />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {asset.symbol.slice(0, 2)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{displayName}</p>
                                  <p className="text-[11px] text-muted-foreground">{asset.symbol}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              {hasPrice ? (
                                <span className={cn("font-bold text-sm tabular-nums transition-colors",
                                  priceFlash[asset.symbol] === "up" && "price-up",
                                  priceFlash[asset.symbol] === "down" && "price-down")}>
                                  {formatPrice(asset.price, asset.symbol)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {hasChange ? (
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold",
                                  isUp ? "bg-profit/12 text-profit" : "bg-loss/12 text-loss"
                                )}>
                                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {isUp ? "+" : ""}{formatPercent(asset.change)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right text-sm text-muted-foreground hidden md:table-cell">
                              {!asset.error && asset.volume ? formatVolume(asset.volume) : <span>—</span>}
                            </td>
                            <td className="p-3 pr-5">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={e => { e.stopPropagation(); toggleFavorite(asset.symbol); }}
                                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                  {favorites.has(asset.symbol)
                                    ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    : <StarOff className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                                <div className="p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Load more */}
              {!isGlobalSearch && hasMore && (
                <div className="flex items-center justify-center py-5 border-t border-white/8">
                  <button onClick={loadMore} disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/8 hover:border-white/15 transition-all font-medium text-sm disabled:opacity-50">
                    {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                    {isLoadingMore ? t("loading") : t("markets_load_more")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </motion.div>
    </>
  );
}

// ── Skeleton table ────────────────────────────────────────────────────────────
function SkeletonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/8">
            <th className="w-10 p-3 pl-5" />
            <th className="p-3" />
            <th className="p-3" />
            <th className="p-3" />
            <th className="p-3 hidden md:table-cell" />
            <th className="p-3 pr-5 w-20" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }).map((_, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="p-3 pl-5">
                <div className="w-5 h-3 rounded bg-white/6 animate-pulse" />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/8 animate-pulse flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="w-28 h-3.5 rounded bg-white/8 animate-pulse" />
                    <div className="w-16 h-2.5 rounded bg-white/6 animate-pulse" />
                  </div>
                </div>
              </td>
              <td className="p-3">
                <div className="w-20 h-4 rounded bg-white/8 animate-pulse ml-auto" />
              </td>
              <td className="p-3">
                <div className="w-14 h-5 rounded-full bg-white/8 animate-pulse ml-auto" />
              </td>
              <td className="p-3 hidden md:table-cell">
                <div className="w-16 h-3.5 rounded bg-white/6 animate-pulse ml-auto" />
              </td>
              <td className="p-3 pr-5">
                <div className="w-14 h-7 rounded-lg bg-white/6 animate-pulse mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
