"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { cn, formatPercent, formatVolume } from "@/lib/utils";
import { marketAPI, favoritesAPI, Market, Asset } from "@/lib/api";
import { getAssetInfo, getAssetLogo } from "@/lib/assetInfo";
import { isMarketOpen, getMarketHoursDisplay, getTimeUntilChange } from "@/lib/marketStatus";
import { useFormatCurrency } from "@/lib/SettingsContext";

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
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);

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

    const loadAssets = async () => {
      setIsLoadingAssets(true);
      setAssets([]);
      setHasMore(false);
      try {
        const data = await marketAPI.getAssets(selectedMarket, PAGE_SIZE, 0);
        setAssets(data.assets);
        setTotalAssets(data.total);
        setHasMore(data.offset + data.limit < data.total);
      } catch (error) {
        console.error("Error loading assets:", error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
  }, [selectedMarket]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await marketAPI.getAssets(selectedMarket, PAGE_SIZE, assets.length);
      setAssets((prev) => [...prev, ...data.assets]);
      setHasMore(data.offset + data.limit < data.total);
    } catch (error) {
      console.error("Error loading more assets:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarketSelect = (key: string) => {
    setSelectedMarket(key);
    setSearchQuery("");
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

  const filteredAssets = assets.filter((asset) => {
    const info = getAssetInfo(asset.symbol);
    return (
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      info.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marches</h1>
          <p className="text-muted-foreground">Explorez tous les marches disponibles</p>
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
                    {isOpen ? "Ouvert" : "Ferme"}
                  </span>
                </div>
              </div>
              <p className="font-semibold mt-2">{market.name}</p>
              <p className="text-xs text-muted-foreground">
                {market.asset_count} actifs
              </p>

              {/* Tooltip on hover */}
              <div className="absolute left-0 right-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-background/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl mx-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium">Horaires</span>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un actif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full input pl-10"
          />
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
                    <th className="text-left p-4 text-sm text-muted-foreground font-medium">Actif</th>
                    <th className="text-right p-4 text-sm text-muted-foreground font-medium">Prix</th>
                    <th className="text-right p-4 text-sm text-muted-foreground font-medium">24h</th>
                    <th className="text-right p-4 text-sm text-muted-foreground font-medium">Volume</th>
                    <th className="text-center p-4 text-sm text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset, index) => {
                    const assetInfo = getAssetInfo(asset.symbol);
                    const logoUrl = getAssetLogo(asset.symbol);

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
                                alt={assetInfo.name}
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
                            <p className="font-semibold">{assetInfo.name}</p>
                            <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold">
                        {asset.error ? "N/A" : formatCurrency(asset.price)}
                      </td>
                      <td className="p-4 text-right">
                        {asset.error ? (
                          <span className="text-muted-foreground">N/A</span>
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
                        {asset.error ? "N/A" : formatVolume(asset.volume)}
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
                  })}
                </tbody>
              </table>
            </div>

            {/* Load more / pagination info */}
            {!searchQuery && (
              <div className="flex flex-col items-center gap-3 py-5 border-t border-white/10">
                <p className="text-sm text-muted-foreground">
                  {assets.length} / {totalAssets} actifs chargés
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
                    {isLoadingMore ? "Chargement..." : "Charger plus"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
