"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Star,
  ChevronRight,
} from "lucide-react";
import { cn, formatCurrency, formatPercent, formatVolume } from "@/lib/utils";

const markets = [
  { key: "USA", name: "USA", icon: "🇺🇸", description: "NYSE, NASDAQ" },
  { key: "EUROPE", name: "Europe", icon: "🇪🇺", description: "Euronext, DAX" },
  { key: "ASIA", name: "Asie", icon: "🌏", description: "Tokyo, Hong Kong" },
  { key: "CRYPTO", name: "Crypto", icon: "🪙", description: "24h/24" },
  { key: "FOREX", name: "Forex", icon: "💱", description: "Devises" },
  { key: "COMMODITIES", name: "Matières", icon: "🛢️", description: "Or, Pétrole" },
];

const mockAssets = [
  { symbol: "AAPL", name: "Apple Inc.", price: 182.52, change: 1.24, volume: 52000000, score: 72 },
  { symbol: "MSFT", name: "Microsoft", price: 415.28, change: 0.89, volume: 23000000, score: 68 },
  { symbol: "GOOGL", name: "Alphabet", price: 141.80, change: -0.32, volume: 18000000, score: 65 },
  { symbol: "NVDA", name: "NVIDIA", price: 875.40, change: 3.45, volume: 45000000, score: 85 },
  { symbol: "TSLA", name: "Tesla", price: 175.21, change: -1.23, volume: 98000000, score: 58 },
  { symbol: "META", name: "Meta", price: 502.30, change: 2.15, volume: 15000000, score: 78 },
  { symbol: "AMZN", name: "Amazon", price: 178.25, change: 0.56, volume: 35000000, score: 71 },
  { symbol: "AMD", name: "AMD", price: 178.90, change: 4.21, volume: 62000000, score: 82 },
];

export default function MarketsPage() {
  const [selectedMarket, setSelectedMarket] = useState("USA");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = mockAssets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marchés</h1>
          <p className="text-muted-foreground">Explorez tous les marchés disponibles</p>
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
            <span className="text-2xl">{market.icon}</span>
            <p className="font-semibold mt-2">{market.name}</p>
            <p className="text-xs text-muted-foreground">{market.description}</p>
          </motion.button>
        ))}
      </div>

      {/* Search and filters */}
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
        <button className="btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Assets table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm text-muted-foreground font-medium">Actif</th>
                <th className="text-right p-4 text-sm text-muted-foreground font-medium">Prix</th>
                <th className="text-right p-4 text-sm text-muted-foreground font-medium">24h</th>
                <th className="text-right p-4 text-sm text-muted-foreground font-medium">Volume</th>
                <th className="text-center p-4 text-sm text-muted-foreground font-medium">Score IA</th>
                <th className="text-center p-4 text-sm text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset, index) => (
                <motion.tr
                  key={asset.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-semibold">
                    {formatCurrency(asset.price)}
                  </td>
                  <td className="p-4 text-right">
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
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {formatVolume(asset.volume)}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <ScoreBadge score={asset.score} />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <Star className="w-4 h-4 text-muted-foreground" />
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
      </div>
    </motion.div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 75) return "bg-profit/20 text-profit border-profit/30";
    if (score >= 60) return "bg-green-400/20 text-green-400 border-green-400/30";
    if (score >= 40) return "bg-warning/20 text-warning border-warning/30";
    return "bg-loss/20 text-loss border-loss/30";
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-sm font-bold border", getColor())}>
      {score}
    </span>
  );
}
