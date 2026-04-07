"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { cn, formatPercent } from "@/lib/utils";
import { favoritesAPI, Favorite } from "@/lib/api";
import { useFormatPrice } from "@/lib/SettingsContext";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { useLanguage } from "@/lib/LanguageContext";

export default function FavoritesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const formatPrice = useFormatPrice();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

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
      const sym = newSymbol.toUpperCase();
      await favoritesAPI.addFavorite(sym);
      setNewSymbol("");
      setShowAddModal(false);
      setLastAdded(sym);
      setTimeout(() => setLastAdded(null), 3000);
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
    <>
      <TopLoadingBar isLoading={isLoading || isRefreshing} />
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
            {t("fav_title")}
          </h1>
          <p className="text-muted-foreground">
            {favorites.length} {t("fav_subtitle")}
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
            {t("fav_add")}
          </button>
        </div>
      </div>

      {/* Summary */}
      {favorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: t("fav_avg_perf"),
              content: (
                <p className={cn("text-2xl font-bold", avgChange >= 0 ? "text-profit" : "text-loss")}>
                  {formatPercent(avgChange)}
                </p>
              ),
            },
            {
              label: t("fav_best_perf"),
              content: bestPerf ? (
                <p className="text-2xl font-bold text-profit">
                  {bestPerf.symbol} {formatPercent(bestPerf.change)}
                </p>
              ) : null,
            },
            {
              label: t("fav_count"),
              content: (
                <p className="text-2xl font-bold text-primary">{favorites.length}</p>
              ),
            },
          ].map(({ label, content }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="glass-card hover-lift p-4"
            >
              <p className="text-sm text-muted-foreground">{label}</p>
              {content}
            </motion.div>
          ))}
        </div>
      )}

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">{t("fav_empty")}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            {t("fav_add_first")}
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm text-muted-foreground">{t("asset")}</th>
                <th className="text-right p-4 text-sm text-muted-foreground">{t("price")}</th>
                <th className="text-right p-4 text-sm text-muted-foreground">{t("change_24h")}</th>
                <th className="text-center p-4 text-sm text-muted-foreground">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {favorites.map((fav, index) => (
                <motion.tr
                  key={fav.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(
                    "border-b border-white/5 transition-colors cursor-pointer",
                    lastAdded === fav.symbol ? "highlight-new" : "hover:bg-white/5"
                  )}
                  onClick={() => router.push(`/analysis?symbol=${fav.symbol}`)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <AnimatePresence mode="wait">
                        {lastAdded === fav.symbol ? (
                          <motion.span
                            key="new"
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                          </motion.span>
                        ) : (
                          <motion.span key="normal">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <div>
                        <p className="font-semibold">{fav.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("fav_added_on")} {new Date(fav.added_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-semibold">
                    {fav.error ? "N/A" : formatPrice(fav.price, fav.symbol)}
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
                        {t("trader")}
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
            <h2 className="text-lg font-semibold mb-4">{t("fav_add_modal_title")}</h2>

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
                placeholder={t("fav_add_placeholder")}
                className="w-full input pl-11"
                onKeyPress={(e) => e.key === "Enter" && addFavorite()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 btn-secondary"
              >
                {t("cancel")}
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
                    {t("add")}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
    </>
  );
}
