"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [isLoading, setIsLoading] = useState(false);

  // Mock analysis data
  const analysis = {
    symbol: "AAPL",
    price: { current: 182.52, change: 1.24 },
    score: { total: 78, technical: 82, volume: 71, momentum: 75 },
    signal: { text: "BUY", emoji: "🟢" },
    trend: "BULLISH",
    indicators: {
      rsi: { value: 58.4, signal: "neutral" },
      macd: { value: 0.85, histogram: 0.12, signal: "bullish" },
      ema: { ema20: 180.5, ema50: 175.2, ema200: 168.9 },
      bollinger: { upper: 188.5, middle: 181.2, lower: 173.9, position: "middle" },
      atr: 3.24,
      volumeRatio: 1.35,
    },
    levels: { support: 175.2, resistance: 190.5, pivot: 182.9 },
    risk: { suggestedSL: 175.8, suggestedTP: 195.2, riskReward: 1.9 },
  };

  const handleSearch = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Search */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Analyse IA</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Entrez un symbole (ex: AAPL, BTC-USD)"
              className="w-full input pl-11 text-lg"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Analyser
          </motion.button>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main score card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent" />
          <div className="relative">
            <p className="text-sm text-muted-foreground mb-2">Score Global</p>
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-white/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(analysis.score.total / 100) * 352} 352`}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{analysis.score.total}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">{analysis.signal.emoji}</span>
              <span className="text-xl font-bold text-profit">{analysis.signal.text}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tendance: <span className="text-profit">{analysis.trend}</span>
            </p>
          </div>
        </motion.div>

        {/* Score breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Détail du Score
          </h3>
          <div className="space-y-4">
            <ScoreBar label="Technique" score={analysis.score.technical} />
            <ScoreBar label="Volume" score={analysis.score.volume} />
            <ScoreBar label="Momentum" score={analysis.score.momentum} />
          </div>
        </motion.div>

        {/* Price info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Prix & Niveaux
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-muted-foreground">Prix actuel</span>
              <span className="font-bold text-lg">{formatCurrency(analysis.price.current)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Résistance</span>
              <span className="text-loss font-semibold">{formatCurrency(analysis.levels.resistance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pivot</span>
              <span className="font-semibold">{formatCurrency(analysis.levels.pivot)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Support</span>
              <span className="text-profit font-semibold">{formatCurrency(analysis.levels.support)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4">Indicateurs Techniques</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <IndicatorCard
            name="RSI"
            value={analysis.indicators.rsi.value.toFixed(1)}
            signal={analysis.indicators.rsi.signal}
          />
          <IndicatorCard
            name="MACD"
            value={analysis.indicators.macd.value.toFixed(2)}
            signal={analysis.indicators.macd.signal}
          />
          <IndicatorCard
            name="EMA 20"
            value={formatCurrency(analysis.indicators.ema.ema20)}
            signal={analysis.price.current > analysis.indicators.ema.ema20 ? "bullish" : "bearish"}
          />
          <IndicatorCard
            name="EMA 50"
            value={formatCurrency(analysis.indicators.ema.ema50)}
            signal={analysis.price.current > analysis.indicators.ema.ema50 ? "bullish" : "bearish"}
          />
          <IndicatorCard
            name="ATR"
            value={analysis.indicators.atr.toFixed(2)}
            signal="neutral"
          />
          <IndicatorCard
            name="Volume"
            value={`${analysis.indicators.volumeRatio.toFixed(2)}x`}
            signal={analysis.indicators.volumeRatio > 1 ? "bullish" : "neutral"}
          />
        </div>
      </motion.div>

      {/* Risk suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Suggestion de Trade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-profit/10 rounded-xl border border-profit/20">
            <p className="text-sm text-muted-foreground mb-1">Take Profit</p>
            <p className="text-xl font-bold text-profit">{formatCurrency(analysis.risk.suggestedTP)}</p>
            <p className="text-sm text-profit">+7%</p>
          </div>
          <div className="p-4 bg-loss/10 rounded-xl border border-loss/20">
            <p className="text-sm text-muted-foreground mb-1">Stop Loss</p>
            <p className="text-xl font-bold text-loss">{formatCurrency(analysis.risk.suggestedSL)}</p>
            <p className="text-sm text-loss">-3.7%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Risk/Reward</p>
            <p className="text-xl font-bold text-primary">1:{analysis.risk.riskReward}</p>
            <p className="text-sm text-primary">Excellent</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 btn-primary w-full flex items-center justify-center gap-2"
        >
          Ouvrir une Position
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = () => {
    if (score >= 75) return "from-profit to-green-400";
    if (score >= 60) return "from-green-400 to-emerald-400";
    if (score >= 40) return "from-warning to-yellow-400";
    return "from-loss to-red-400";
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{score}/100</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn("h-full rounded-full bg-gradient-to-r", getColor())}
        />
      </div>
    </div>
  );
}

function IndicatorCard({
  name,
  value,
  signal,
}: {
  name: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral";
}) {
  const signalColors = {
    bullish: "border-profit/30 bg-profit/10",
    bearish: "border-loss/30 bg-loss/10",
    neutral: "border-white/10 bg-white/5",
  };

  const signalIcons = {
    bullish: <TrendingUp className="w-4 h-4 text-profit" />,
    bearish: <TrendingDown className="w-4 h-4 text-loss" />,
    neutral: <Activity className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <div className={cn("p-4 rounded-xl border", signalColors[signal])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{name}</span>
        {signalIcons[signal]}
      </div>
      <p className="font-bold">{value}</p>
    </div>
  );
}
