"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Star,
  StarOff,
  ChevronRight,
  Loader2,
  Clock,
  Circle,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { cn, formatPercent, formatVolume } from "@/lib/utils";
import { marketAPI, favoritesAPI, Market, Asset } from "@/lib/api";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { authHeaders } from "@/lib/auth";
import { isMarketOpen, getMarketHoursDisplay, getTimeUntilChange } from "@/lib/marketStatus";
import { useFormatPrice } from "@/lib/SettingsContext";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";

const PAGE_SIZE = 20;

const marketIcons: Record<string, string> = {
  USA: "🇺🇸",
  EUROPE: "🇪🇺",
  ASIA: "🌏",
  CRYPTO: "🪙",
  FOREX: "💱",
  COMMODITIES: "🛢️",
};

export default function MarketsPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const formatPrice = useFormatPrice();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [priceFlash, setPriceFlash] = useState<Record<string, "up" | "down">>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load markets
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const data = await marketAPI.getMarkets();
        setMarkets(data.markets);
        if (data.markets.length > 0) {
          setSelectedMarket(data.markets[0].key);
        }
      } catch (error) {
        console.error("Error loading markets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadFavorites = async () => {
      try {
        const data = await favoritesAPI.getFavorites();
        setFavorites(new Set(data.favorites.map((f) => f.symbol)));
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };

    loadMarkets();
    loadFavorites();
  }, []);

  // Load first page when market changes
  useEffect(() => {
    if (!selectedMarket) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const loadAssets = async () => {
      setIsLoadingAssets(true);
      setAssets([]);
      setHasMore(false);
      try {
        const data = await marketAPI.getAssets(selectedMarket, PAGE_SIZE, 0);
        setAssets(data.assets);
        setTotalAssets(data.total);
        setHasMore(data.offset + data.limit < data.total);

        // Charger les prix en arrière-plan via Polygon.io
        const symbols = data.assets.map((a: Asset) => a.symbol);
        if (symbols.length > 0) {
          setIsLoadingPrices(true);
          marketAPI.getPrices(symbols)
            .then((priceData) => {
              const flashes: Record<string, "up" | "down"> = {};
              setAssets((prev) => prev.map((a) => {
                const p = priceData.prices[a.symbol];
                if (p) {
                  const prev = prevPricesRef.current[a.symbol];
                  if (prev !== undefined && p.price !== prev) {
                    flashes[a.symbol] = p.price > prev ? "up" : "down";
                  }
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
      } catch (error) {
        console.error("Error loading assets:", error);
      } finally {
        clearTimeout(timer);
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [selectedMarket]);

  // Auto-refresh prices every 30s
  const refreshPrices = useCallback(async () => {
    if (!selectedMarket || assets.length === 0) return;
    const symbols = assets.map((a) => a.symbol);
    if (symbols.length === 0) return;
    setIsLoadingPrices(true);
    try {
      const priceData = await marketAPI.getPrices(symbols);
      const flashes: Record<string, "up" | "down"> = {};
      setAssets((prev) => prev.map((a) => {
        const p = priceData.prices[a.symbol];
        if (p) {
          const prevPrice = prevPricesRef.current[a.symbol];
          if (prevPrice !== undefined && p.price !== prevPrice) {
            flashes[a.symbol] = p.price > prevPrice ? "up" : "down";
          }
          prevPricesRef.current[a.symbol] = p.price;
          return { ...a, price: p.price, change: p.change, volume: p.volume };
        }
        return a;
      }));
      if (Object.keys(flashes).length > 0) {
        setPriceFlash(flashes);
        setTimeout(() => setPriceFlash({}), 800);
      }
    } catch { /* ignore */ } finally {
      setIsLoadingPrices(false);
    }
  }, [selectedMarket, assets]);

  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(refreshPrices, 30000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [refreshPrices]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await marketAPI.getAssets(selectedMarket, PAGE_SIZE, assets.length);
      setAssets((prev) => [...prev, ...data.assets]);
      setHasMore(data.offset + data.limit < data.total);

      // Fetch prices for the newly loaded assets
      const symbols = data.assets.map((a: Asset) => a.symbol);
      if (symbols.length > 0) {
        marketAPI.getPrices(symbols)
          .then((priceData) => {
            setAssets((prev) => prev.map((a) => {
              const p = priceData.prices[a.symbol];
              return p ? { ...a, price: p.price, change: p.change, volume: p.volume } : a;
            }));
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error("Error loading more assets:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
    } catch { /* ignore */ } finally {
      setIsSearchingBackend(false);
    }
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
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
    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(symbol); else next.add(symbol);
      return next;
    });
    try {
      if (wasFavorite) {
        await favoritesAPI.removeFavorite(symbol);
      } else {
        await favoritesAPI.addFavorite(symbol);
      }
    } catch (error) {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(symbol); else next.delete(symbol);
        return next;
      });
      console.error("Error toggling favorite:", error);
    }
  };

  // When searchQuery >= 2 chars, use backend results; otherwise filter loaded assets locally
  const isGlobalSearch = searchQuery.length >= 2;

  const filteredAssets = isGlobalSearch
    ? [] // replaced by searchResults display
    : assets.filter((asset) => {
        if (!searchQuery) return true;
        const info = getAssetInfo(asset.symbol);
        return (
          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (asset.name && asset.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <TopLoadingBar isLoading={isLoadingAssets || isLoadingPrices} />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("markets_title")}</h1>
          <p className="text-muted-foreground">{t("markets_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpGuide
            title={lang === "en" ? "Markets" : "Marchés"}
            intro={lang === "en" ? "Explore all available assets: stocks, crypto, indices, commodities and forex." : "Explore tous les actifs disponibles : actions, crypto, indices, matières premières et forex."}
            sections={lang === "en" ? [
              { title: "Market selection", desc: "Click on a market (Stocks, Crypto, etc.) to filter assets. Prices update automatically." },
              { title: "Search", desc: "Use the search bar to find an asset by name or symbol (e.g. AAPL, BTC, CAC)." },
              { title: "Favorites", desc: "Click the star next to an asset to add it to your favorites and track it from the dashboard." },
              { title: "Market hours", desc: "The green/red indicator at the top of each market shows whether it is currently open or closed." },
              { title: "Analysis", desc: "Click on an asset to access its full analysis: chart, indicators, AI and key levels." },
            ] : [
              { title: "Sélection du marché", desc: "Clique sur un marché (Actions, Crypto, etc.) pour filtrer les actifs. Les prix se mettent à jour automatiquement." },
              { title: "Recherche", desc: "Utilise la barre de recherche pour trouver un actif par nom ou symbole (ex: AAPL, BTC, CAC)." },
              { title: "Favoris", desc: "Clique sur l'étoile à côté d'un actif pour l'ajouter à tes favoris et le suivre depuis le dashboard." },
              { title: "Horaires de marché", desc: "L'indicateur vert/rouge en haut de chaque marché indique si celui-ci est ouvert ou fermé en ce moment." },
              { title: "Analyse", desc: "Clique sur un actif pour accéder à son analyse complète : graphique, indicateurs, IA et niveaux clés." },
            ]}
            tip={lang === "en" ? "Prices update in real time. Click 'Refresh' to force a manual update." : "Les prix sont actualisés en temps réel. Clique sur 'Actualiser' si tu veux forcer une mise à jour manuelle."}
          />
          <button
            onClick={refreshPrices}
          disabled={isLoadingPrices}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-muted-foreground"
          title={t("markets_refresh_title")}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoadingPrices && "animate-spin")} />
          <span className="hidden sm:inline">{t("markets_refresh")}</span>
        </button>
        </div>
      </div>

      {/* Market selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {markets.map((market) => {
          const isOpen = isMarketOpen(market.key);
          const hoursDisplay = getMarketHoursDisplay(market.key);
          const timeUntil = getTimeUntilChange(market.key);

          return (
            <motion.button
              key={market.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleMarketSelect(market.key)}
              className={cn(
                "p-4 rounded-xl text-left transition-all relative group",
                selectedMarket === market.key
                  ? "glass-card border-primary/50 shadow-glow-sm"
                  : "bg-white/5 hover:bg-white/10 border border-transparent"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{marketIcons[market.key] || "📈"}</span>
                <div className="flex items-center gap-1.5">
                  <Circle
                    className={cn(
                      "w-2.5 h-2.5 fill-current",
                      isOpen ? "text-profit" : "text-loss"
                    )}
                  />
                  <span className={cn(
                    "text-xs font-medium",
                    isOpen ? "text-profit" : "text-loss"
                  )}>
                    {isOpen ? t("open") : t("closed")}
                  </span>
                </div>
              </div>
              <p className="font-semibold mt-2">{market.name}</p>
              <p className="text-xs text-muted-foreground">
                {market.asset_count} {t("asset")}
              </p>

              {/* Tooltip on hover */}
              <div className="absolute left-0 right-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-background/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl mx-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium">{t("markets_hours")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{hoursDisplay}</p>
                  {timeUntil && (
                    <p className={cn(
                      "text-xs mt-1 font-medium",
                      isOpen ? "text-yellow-400" : "text-profit"
                    )}>
                      {timeUntil}
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          {isSearchingBackend ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <input
            type="text"
            placeholder={t("markets_search_ph")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full input pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Assets table */}
      <div className="glass-card overflow-hidden">
        {isLoadingAssets ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm text-muted-foreground font-medium">{t("asset")}</th>
                    <th className="text-right p-4 text-sm text-muted-foreground font-medium">{t("price")}</th>
                    <th className="text-right p-4 text-sm text-muted-foreground font-medium">{t("change_24h")}</th>
                    <th className="text-right p-4 text-sm text-muted-foreground font-medium">{t("volume")}</th>
                    <th className="text-center p-4 text-sm text-muted-foreground font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {isGlobalSearch ? (
                    // Backend search results
                    searchResults.length === 0 && !isSearchingBackend ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          {t("markets_no_results")} « {searchQuery} »
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((result, index) => {
                        const logoUrl = getAssetLogo(result.symbol);
                        return (
                          <motion.tr
                            key={result.symbol}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.5) }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => router.push(`/analysis?symbol=${result.symbol}`)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {logoUrl ? (
                                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                                    <img src={logoUrl} alt={result.name} className="w-7 h-7 object-contain"
                                      onError={(e) => {
                                        const t = e.target as HTMLImageElement;
                                        t.style.display = "none";
                                        t.parentElement!.innerHTML = `<span class="font-bold text-sm">${result.symbol.slice(0, 2)}</span>`;
                                      }} />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
                                    {result.symbol.slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold">{result.name}</p>
                                  <p className="text-xs text-muted-foreground">{result.symbol} · {result.exchange}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right text-muted-foreground" colSpan={3}>
                              <span className="text-xs">{t("markets_click_analyze")}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(result.symbol); }}
                                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                  {favorites.has(result.symbol) ? (
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                  ) : (
                                    <StarOff className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </button>
                                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )
                  ) : (
                    // Normal market assets
                    filteredAssets.map((asset, index) => {
                      const assetInfo = getAssetInfo(asset.symbol);
                      const logoUrl = getAssetLogo(asset.symbol);
                      const displayName = asset.name || assetInfo.name;

                      return (
                      <motion.tr
                        key={asset.symbol}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.5) }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => router.push(`/analysis?symbol=${asset.symbol}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {logoUrl ? (
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                                <img
                                  src={logoUrl}
                                  alt={displayName}
                                  className="w-7 h-7 object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `<span class="font-bold text-sm">${asset.symbol.slice(0, 2)}</span>`;
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
                                {asset.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">{displayName}</p>
                              <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right font-semibold">
                          {(asset.error || !asset.price) ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={cn(
                              "transition-colors duration-300",
                              priceFlash[asset.symbol] === "up" && "price-up",
                              priceFlash[asset.symbol] === "down" && "price-down",
                            )}>
                              {formatPrice(asset.price, asset.symbol)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {(asset.error || asset.change === 0) ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span
                              className={cn(
                                "flex items-center justify-end gap-1",
                                asset.change >= 0 ? "text-profit" : "text-loss"
                              )}
                            >
                              {asset.change >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {formatPercent(asset.change)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {(asset.error || !asset.volume) ? <span className="text-muted-foreground">—</span> : formatVolume(asset.volume)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(asset.symbol);
                              }}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              {favorites.has(asset.symbol) ? (
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ) : (
                                <StarOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Load more / pagination info */}
            {!isGlobalSearch && (
              <div className="flex flex-col items-center gap-3 py-5 border-t border-white/10">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {assets.length} / {totalAssets} {t("markets_loaded")}
                  {isLoadingPrices && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                </p>
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {isLoadingMore ? t("loading") : t("markets_load_more")}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
    </>
  );
}
