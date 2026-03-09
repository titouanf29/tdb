"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  Filter,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

const mockResults = [
  { symbol: "SOL-USD", score: 92, change: 8.5, signal: "STRONG BUY", price: 142.5 },
  { symbol: "NVDA", score: 87, change: 4.2, signal: "STRONG BUY", price: 875.4 },
  { symbol: "AMD", score: 82, change: 3.8, signal: "BUY", price: 178.9 },
  { symbol: "META", score: 78, change: 2.1, signal: "BUY", price: 502.3 },
  { symbol: "AAPL", score: 72, change: 1.2, signal: "BUY", price: 182.5 },
];

export default function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState("ALL");
  const [minScore, setMinScore] = useState(60);

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
            <ScanLine className="w-6 h-6 text-primary" />
            Scanner de Marchés
          </h1>
          <p className="text-muted-foreground">
            Détection automatique des meilleures opportunités
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsScanning(!isScanning)}
          className={cn(
            "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
            isScanning
              ? "bg-loss text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              : "bg-profit text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          )}
        >
          {isScanning ? (
            <>
              <Pause className="w-5 h-5" />
              Arrêter
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Lancer le Scan
            </>
          )}
        </motion.button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtres:</span>
          </div>

          <div className="flex gap-2">
            {["ALL", "USA", "CRYPTO", "EUROPE", "FOREX"].map((market) => (
              <button
                key={market}
                onClick={() => setSelectedMarket(market)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedMarket === market
                    ? "bg-primary text-white"
                    : "bg-white/5 hover:bg-white/10"
                )}
              >
                {market}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Score min:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm font-bold w-8">{minScore}</span>
          </div>
        </div>
      </div>

      {/* Scanning animation */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-6 text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary/30 rounded-full border-t-primary"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-lg font-semibold">Scan en cours...</p>
          <p className="text-sm text-muted-foreground">
            Analyse de 150+ actifs sur {selectedMarket}
          </p>
        </motion.div>
      )}

      {/* Results */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" />
          Opportunités Détectées ({mockResults.length})
        </h2>

        <div className="space-y-3">
          {mockResults.map((result, index) => (
            <motion.div
              key={result.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg border-2",
                      result.score >= 80
                        ? "bg-profit/20 border-profit text-profit"
                        : result.score >= 60
                        ? "bg-green-400/20 border-green-400 text-green-400"
                        : "bg-warning/20 border-warning text-warning"
                    )}
                  >
                    {result.score}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{result.symbol}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.signal}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(result.price)}</p>
                    <p
                      className={cn(
                        "text-sm flex items-center justify-end gap-1",
                        result.change >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {result.change >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {formatPercent(result.change)}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Analyser
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
