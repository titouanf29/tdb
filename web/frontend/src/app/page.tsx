"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Flame,
} from "lucide-react";
import { cn, formatCurrency, formatPercent, formatVolume } from "@/lib/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome banner */}
      <motion.div
        variants={itemVariants}
        className="glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold mb-2">
            Bienvenue sur <span className="gradient-text">TDB</span>
          </h1>
          <p className="text-muted-foreground">
            Votre assistant de trading IA synchronisé avec Telegram
          </p>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          title="Solde Total"
          value={formatCurrency(12450.5)}
          change={5.2}
          icon={DollarSign}
        />
        <StatCard
          title="P&L Aujourd'hui"
          value={formatCurrency(234.5)}
          change={2.4}
          icon={TrendingUp}
        />
        <StatCard
          title="Positions Ouvertes"
          value="3"
          subtitle="$2,450 investis"
          icon={Activity}
        />
        <StatCard
          title="Win Rate"
          value="68%"
          subtitle="34 trades"
          icon={Target}
        />
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open positions */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Positions Ouvertes</h2>
              <button className="btn-ghost text-sm">Voir tout</button>
            </div>
            <div className="space-y-3">
              <PositionCard
                symbol="AAPL"
                name="Apple Inc."
                direction="LONG"
                entry={178.5}
                current={182.3}
                quantity={10}
                pnl={38}
                pnlPercent={2.13}
              />
              <PositionCard
                symbol="BTC-USD"
                name="Bitcoin"
                direction="LONG"
                entry={62500}
                current={64200}
                quantity={0.05}
                pnl={85}
                pnlPercent={2.72}
              />
              <PositionCard
                symbol="NVDA"
                name="NVIDIA"
                direction="SHORT"
                entry={890}
                current={875}
                quantity={5}
                pnl={75}
                pnlPercent={1.69}
              />
            </div>
          </div>
        </motion.div>

        {/* Hot opportunities */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Opportunités</h2>
            </div>
            <div className="space-y-3">
              <OpportunityCard
                symbol="SOL-USD"
                score={87}
                signal="STRONG BUY"
                change={5.4}
              />
              <OpportunityCard
                symbol="META"
                score={82}
                signal="BUY"
                change={3.2}
              />
              <OpportunityCard
                symbol="AMD"
                score={78}
                signal="BUY"
                change={2.8}
              />
              <OpportunityCard
                symbol="TSLA"
                score={65}
                signal="HOLD"
                change={-0.5}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Market overview */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Aperçu des Marchés</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MarketCard name="S&P 500" value="5,123.41" change={0.45} />
            <MarketCard name="NASDAQ" value="16,091.92" change={0.82} />
            <MarketCard name="BTC" value="$64,521" change={2.34} />
            <MarketCard name="ETH" value="$3,421" change={1.87} />
            <MarketCard name="Or" value="$2,156.30" change={-0.23} />
            <MarketCard name="EUR/USD" value="1.0923" change={0.12} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ElementType;
}) {
  const isPositive = change !== undefined ? change >= 0 : true;

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined ? (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{formatPercent(change)}</span>
            </div>
          ) : (
            subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function PositionCard({
  symbol,
  name,
  direction,
  entry,
  current,
  quantity,
  pnl,
  pnlPercent,
}: {
  symbol: string;
  name: string;
  direction: "LONG" | "SHORT";
  entry: number;
  current: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
}) {
  const isProfit = pnl >= 0;

  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{symbol}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  direction === "LONG"
                    ? "bg-profit/20 text-profit"
                    : "bg-loss/20 text-loss"
                )}
              >
                {direction}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(current)}</p>
          <p
            className={cn(
              "text-sm flex items-center justify-end gap-1",
              isProfit ? "text-profit" : "text-loss"
            )}
          >
            {isProfit ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {formatCurrency(pnl)} ({formatPercent(pnlPercent)})
          </p>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({
  symbol,
  score,
  signal,
  change,
}: {
  symbol: string;
  score: number;
  signal: string;
  change: number;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-profit border-profit/30 bg-profit/10";
    if (s >= 60) return "text-green-400 border-green-400/30 bg-green-400/10";
    if (s >= 40) return "text-warning border-warning/30 bg-warning/10";
    return "text-loss border-loss/30 bg-loss/10";
  };

  return (
    <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center font-bold border",
              getScoreColor(score)
            )}
          >
            {score}
          </div>
          <div>
            <p className="font-semibold">{symbol}</p>
            <p className="text-xs text-muted-foreground">{signal}</p>
          </div>
        </div>
        <div
          className={cn(
            "text-sm font-medium",
            change >= 0 ? "text-profit" : "text-loss"
          )}
        >
          {formatPercent(change)}
        </div>
      </div>
    </div>
  );
}

function MarketCard({
  name,
  value,
  change,
}: {
  name: string;
  value: string;
  change: number;
}) {
  const isPositive = change >= 0;

  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-center">
      <p className="text-xs text-muted-foreground mb-1">{name}</p>
      <p className="font-semibold">{value}</p>
      <p
        className={cn(
          "text-xs mt-1",
          isPositive ? "text-profit" : "text-loss"
        )}
      >
        {formatPercent(change)}
      </p>
    </div>
  );
}
