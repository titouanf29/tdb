"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ScanLine,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Zap,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { analysisAPI, marketAPI, Market } from "@/lib/api";

interface ScanResult {
  symbol: string;
  price: number;
  change: number;
  score: number;
  rsi: number;
}

export default function ScannerPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState("USA");
  const [minScore, setMinScore] = useState(60);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoScan, setAutoScan] = useState(false);

  // Load markets
  useEffect(() => {
    marketAPI.getMarkets().then((data) => {
      setMarkets(data.markets);
      setIsLoading(false);
    }).catch(console.error);
  }, []);

  // Scan function
  const runScan = async () => {
    setIsScanning(true);
    try {
      const data = await analysisAPI.scan(selectedMarket, minScore, 20);
      setResults(data.results);
    } catch (error) {
      console.error("Error scanning:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan
  useEffect(() => {
    if (!autoScan) return;

    runScan();
    const interval = setInterval(runScan, 60000); // Every minute
    return () => clearInterval(interval);
  }, [autoScan, selectedMarket, minScore]);

  const getSignal = (score: number) => {
    if (score >= 75) return "STRONG BUY";
    if (score >= 60) return "BUY";
    if (score >= 40) return "HOLD";
    return "SELL";
  };

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
            <ScanLine className="w-6 h-6 text-primary" />
            Scanner de Marches
          </h1>
          <p className="text-muted-foreground">
            Detection automatique des meilleures opportunites
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Scanner
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAutoScan(!autoScan)}
            className={cn(
              "px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all",
              autoScan
                ? "bg-loss text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                : "bg-profit text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            )}
          >
            {autoScan ? (
              <>
                <Pause className="w-5 h-5" />
                Arreter
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Auto-Scan
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Marche:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {markets.map((market) => (
              <button
                key={market.key}
                onClick={() => setSelectedMarket(market.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedMarket === market.key
                    ? "bg-primary text-white"
                    : "bg-white/5 hover:bg-white/10"
                )}
              >
                {market.name}
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
      {isScanning && autoScan && (
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
            Analyse des actifs sur {selectedMarket}
          </p>
        </motion.div>
      )}

      {/* Results */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" />
          Opportunites Detectees ({results.length})
        </h2>

        {results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ScanLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Cliquez sur "Scanner" pour detecter les opportunites</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <motion.div
                key={result.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/analysis?symbol=${result.symbol}`)}
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
                        {getSignal(result.score)} | RSI: {result.rsi.toFixed(1)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/trading?symbol=${result.symbol}`);
                      }}
                    >
                      Trader
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
