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
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatPercent, formatVolume } from "@/lib/utils";
import { marketAPI, favoritesAPI, Market, Asset } from "@/lib/api";

const marketIcons: Record<string, string> = {
  USA: "🇺🇸",
  EUROPE: "🇪🇺",
  ASIA: "🌏",
  CRYPTO: "🪙",
  MATIERES: "🛢️",
  OR: "🏆",
};

export default function MarketsPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

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

  // Load assets when market changes
  useEffect(() => {
    if (!selectedMarket) return;

    const loadAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const data = await marketAPI.getAssets(selectedMarket, 30);
        setAssets(data.assets);
      } catch (error) {
        console.error("Error loading assets:", error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
  }, [selectedMarket]);

  const toggleFavorite = async (symbol: string) => {
    try {
      if (favorites.has(symbol)) {
        await favoritesAPI.removeFavorite(symbol);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });
      } else {
        await favoritesAPI.addFavorite(symbol);
        setFavorites((prev) => new Set(prev).add(symbol));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const filteredAssets = assets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {markets.map((market) => (
          <motion.button
            key={market.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMarket(market.key)}
            className={cn(
              "p-4 rounded-xl text-left transition-all",
              selectedMarket === market.key
                ? "glass-card border-primary/50 shadow-glow-sm"
                : "bg-white/5 hover:bg-white/10 border border-transparent"
            )}
          >
            <span className="text-2xl">{marketIcons[market.key] || "📈"}</span>
            <p className="font-semibold mt-2">{market.name}</p>
            <p className="text-xs text-muted-foreground">
              {market.asset_count} actifs
            </p>
          </motion.button>
        ))}
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
                {filteredAssets.map((asset, index) => (
                  <motion.tr
                    key={asset.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/analysis?symbol=${asset.symbol}`)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{asset.symbol}</p>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
