"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  Info,
  ChevronDown,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export default function TradingPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [amount, setAmount] = useState(1000);
  const [leverage, setLeverage] = useState(1);

  const currentPrice = 182.52;
  const quantity = (amount * leverage) / currentPrice;
  const suggestedTP = direction === "LONG" ? currentPrice * 1.05 : currentPrice * 0.95;
  const suggestedSL = direction === "LONG" ? currentPrice * 0.97 : currentPrice * 1.03;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Trading Companion</h1>
        <p className="text-muted-foreground">Ouvrez une nouvelle position</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading form */}
        <div className="glass-card p-6 space-y-6">
          {/* Symbol selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Actif</label>
            <div className="relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full input text-lg font-bold"
                placeholder="Ex: AAPL, BTC-USD"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatCurrency(currentPrice)}</span>
                <span className="text-sm text-profit">+1.24%</span>
              </div>
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium mb-2">Direction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDirection("LONG")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold",
                  direction === "LONG"
                    ? "border-profit bg-profit/10 text-profit"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <TrendingUp className="w-5 h-5" />
                LONG
              </button>
              <button
                onClick={() => setDirection("SHORT")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold",
                  direction === "SHORT"
                    ? "border-loss bg-loss/10 text-loss"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <TrendingDown className="w-5 h-5" />
                SHORT
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">Montant (USD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full input text-lg font-bold"
              min={10}
              step={100}
            />
            <div className="flex gap-2 mt-2">
              {[100, 500, 1000, 2500].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm transition-all",
                    amount === val
                      ? "bg-primary text-white"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                Levier
              </span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 10].map((lev) => (
                <button
                  key={lev}
                  onClick={() => setLeverage(lev)}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold transition-all",
                    leverage === lev
                      ? lev > 3
                        ? "bg-warning text-black"
                        : "bg-primary text-white"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {lev}x
                </button>
              ))}
            </div>
            {leverage > 3 && (
              <p className="text-warning text-xs mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Levier élevé = risque élevé
              </p>
            )}
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-lg transition-all",
              direction === "LONG"
                ? "bg-profit hover:bg-profit/90 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                : "bg-loss hover:bg-loss/90 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            )}
          >
            {direction === "LONG" ? "Acheter" : "Vendre"} {symbol}
          </motion.button>
        </div>

        {/* Order preview */}
        <div className="space-y-4">
          {/* Position preview */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Aperçu de la Position
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Actif</span>
                <span className="font-semibold">{symbol}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Direction</span>
                <span className={cn("font-semibold", direction === "LONG" ? "text-profit" : "text-loss")}>
                  {direction}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Prix d'entrée</span>
                <span className="font-semibold">{formatCurrency(currentPrice)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Quantité</span>
                <span className="font-semibold">{quantity.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Valeur totale</span>
                <span className="font-semibold">{formatCurrency(amount * leverage)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Marge utilisée</span>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Risk management */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Gestion du Risque
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Take Profit suggéré</span>
                  <span className="text-profit font-semibold">{formatCurrency(suggestedTP)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-profit/50 to-profit rounded-full" />
                </div>
                <p className="text-xs text-profit mt-1">+{formatPercent(5)}</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Stop Loss suggéré</span>
                  <span className="text-loss font-semibold">{formatCurrency(suggestedSL)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-loss/50 to-loss rounded-full" />
                </div>
                <p className="text-xs text-loss mt-1">{formatPercent(-3)}</p>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ratio risque/récompense</span>
                  <span className="font-bold text-primary">1:1.67</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
