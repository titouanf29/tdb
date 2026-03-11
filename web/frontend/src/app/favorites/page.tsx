"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Trash2,
  Plus,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { favoritesAPI, Favorite } from "@/lib/api";

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadFavorites = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const data = await favoritesAPI.getFavorites();
      setFavorites(data.favorites);
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const addFavorite = async () => {
    if (!newSymbol.trim()) return;

    setAddError("");
    setIsAdding(true);

    try {
      await favoritesAPI.addFavorite(newSymbol.toUpperCase());
      setNewSymbol("");
      setShowAddModal(false);
      loadFavorites();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Erreur");
    } finally {
      setIsAdding(false);
    }
  };

  const removeFavorite = async (symbol: string) => {
    try {
      await favoritesAPI.removeFavorite(symbol);
      setFavorites((prev) => prev.filter((f) => f.symbol !== symbol));
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  // Calculate stats
  const avgChange = favorites.length > 0
    ? favorites.reduce((sum, f) => sum + f.change, 0) / favorites.length
    : 0;
  const bestPerf = favorites.length > 0
    ? favorites.reduce((best, f) => f.change > best.change ? f : best, favorites[0])
    : null;

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Mes Favoris
          </h1>
          <p className="text-muted-foreground">
            {favorites.length} actifs suivis
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadFavorites(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Summary */}
      {favorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Performance moyenne</p>
            <p className={cn(
              "text-2xl font-bold",
              avgChange >= 0 ? "text-profit" : "text-loss"
            )}>
              {formatPercent(avgChange)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Meilleure perf</p>
            {bestPerf && (
              <p className="text-2xl font-bold text-profit">
                {bestPerf.symbol} {formatPercent(bestPerf.change)}
              </p>
            )}
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Actifs suivis</p>
            <p className="text-2xl font-bold text-primary">{favorites.length}</p>
          </div>
        </div>
      )}

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">Aucun favori pour le moment</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Ajouter un favori
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm text-muted-foreground">Actif</th>
                <th className="text-right p-4 text-sm text-muted-foreground">Prix</th>
                <th className="text-right p-4 text-sm text-muted-foreground">24h</th>
                <th className="text-center p-4 text-sm text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {favorites.map((fav, index) => (
                <motion.tr
                  key={fav.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/analysis?symbol=${fav.symbol}`)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <div>
                        <p className="font-semibold">{fav.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          Ajoute le {new Date(fav.added_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-semibold">
                    {fav.error ? "N/A" : formatCurrency(fav.price)}
                  </td>
                  <td className="p-4 text-right">
                    {fav.error ? (
                      <span className="text-muted-foreground">N/A</span>
                    ) : (
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
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/trading?symbol=${fav.symbol}`);
                        }}
                        className="btn-ghost text-sm"
                      >
                        Trader
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(fav.symbol);
                        }}
                        className="p-2 rounded-lg hover:bg-loss/20 text-loss transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md"
          >
            <h2 className="text-lg font-semibold mb-4">Ajouter un favori</h2>

            {addError && (
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/30 text-loss text-sm mb-4">
                {addError}
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Symbole (ex: AAPL, BTC-USD)"
                className="w-full input pl-11"
                onKeyPress={(e) => e.key === "Enter" && addFavorite()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={addFavorite}
                disabled={isAdding || !newSymbol.trim()}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
