"use client";

import { motion } from "framer-motion";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Bell,
  Trash2,
  Plus,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

const mockFavorites = [
  { symbol: "AAPL", name: "Apple Inc.", price: 182.52, change: 1.24, score: 72, alert: true },
  { symbol: "BTC-USD", name: "Bitcoin", price: 64521, change: 2.34, score: 78, alert: true },
  { symbol: "NVDA", name: "NVIDIA", price: 875.4, change: 3.45, score: 85, alert: false },
  { symbol: "TSLA", name: "Tesla", price: 175.21, change: -1.23, score: 58, alert: true },
  { symbol: "META", name: "Meta", price: 502.3, change: 2.15, score: 78, alert: false },
];

export default function FavoritesPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Mes Favoris
          </h1>
          <p className="text-muted-foreground">
            {mockFavorites.length} actifs suivis
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Performance moyenne</p>
          <p className="text-2xl font-bold text-profit">+2.1%</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Meilleure perf</p>
          <p className="text-2xl font-bold text-profit">NVDA +3.45%</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Score moyen</p>
          <p className="text-2xl font-bold text-primary">74</p>
        </div>
      </div>

      {/* Favorites list */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm text-muted-foreground">Actif</th>
              <th className="text-right p-4 text-sm text-muted-foreground">Prix</th>
              <th className="text-right p-4 text-sm text-muted-foreground">24h</th>
              <th className="text-center p-4 text-sm text-muted-foreground">Score</th>
              <th className="text-center p-4 text-sm text-muted-foreground">Alertes</th>
              <th className="text-center p-4 text-sm text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockFavorites.map((fav, index) => (
              <motion.tr
                key={fav.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <div>
                      <p className="font-semibold">{fav.symbol}</p>
                      <p className="text-xs text-muted-foreground">{fav.name}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right font-semibold">
                  {formatCurrency(fav.price)}
                </td>
                <td className="p-4 text-right">
                  <span
                    className={cn(
                      "flex items-center justify-end gap-1",
                      fav.change >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {fav.change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {formatPercent(fav.change)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-bold",
                        fav.score >= 75
                          ? "bg-profit/20 text-profit"
                          : fav.score >= 60
                          ? "bg-green-400/20 text-green-400"
                          : "bg-warning/20 text-warning"
                      )}
                    >
                      {fav.score}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <button
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        fav.alert
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-white/10 text-muted-foreground"
                      )}
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    <button className="btn-ghost text-sm">Analyser</button>
                    <button className="p-2 rounded-lg hover:bg-loss/20 text-loss transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
