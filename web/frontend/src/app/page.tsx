"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Flame,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { walletAPI, analysisAPI, WalletBalance, Position, TradingStats } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [balanceData, positionsData, statsData, scanData] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getPositions("open"),
        walletAPI.getStats(),
        analysisAPI.scan("USA", 60, 5).catch(() => ({ results: [] })),
      ]);

      setBalance(balanceData);
      setPositions(positionsData.positions);
      setStats(statsData);
      setOpportunities(scanData.results || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bienvenue sur <span className="gradient-text">TDB</span>
            </h1>
            <p className="text-muted-foreground">
              Votre assistant de trading IA - Paper Trading
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          title="Solde Total"
          value={formatCurrency(balance?.total_equity || balance?.balance || 0)}
          change={balance?.total_pnl ? (balance.total_pnl / (balance.balance || 1)) * 100 : 0}
          icon={DollarSign}
        />
        <StatCard
          title="P&L Total"
          value={formatCurrency(balance?.total_pnl || 0)}
          change={balance?.total_pnl ? (balance.total_pnl > 0 ? 1 : -1) : 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Positions Ouvertes"
          value={String(positions.length)}
          subtitle={`${formatCurrency(balance?.positions_value || 0)} investis`}
          icon={Activity}
        />
        <StatCard
          title="Win Rate"
          value={`${stats?.win_rate || 0}%`}
          subtitle={`${stats?.total_trades || 0} trades`}
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
              <Link href="/wallet" className="btn-ghost text-sm">
                Voir tout
              </Link>
            </div>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune position ouverte</p>
                <Link href="/trading" className="text-primary hover:underline text-sm">
                  Ouvrir une position
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.slice(0, 5).map((pos) => (
                  <PositionCard key={pos.id} position={pos} />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Hot opportunities */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Opportunites</h2>
            </div>
            {opportunities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Scanner en cours...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {opportunities.map((opp, i) => (
                  <OpportunityCard key={i} opportunity={opp} />
                ))}
              </div>
            )}
            <Link href="/scanner" className="block mt-4 text-center text-sm text-primary hover:underline">
              Voir le scanner complet
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/markets">
              <QuickActionCard title="Explorer les Marches" icon="globe" />
            </Link>
            <Link href="/trading">
              <QuickActionCard title="Ouvrir un Trade" icon="trade" />
            </Link>
            <Link href="/analysis">
              <QuickActionCard title="Analyser un Actif" icon="chart" />
            </Link>
            <Link href="/assistant">
              <QuickActionCard title="Poser une Question" icon="bot" />
            </Link>
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
          {change !== undefined && change !== 0 ? (
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
              <span>{formatPercent(Math.abs(change))}</span>
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

function PositionCard({ position }: { position: Position }) {
  const isProfit = (position.unrealized_pnl || 0) >= 0;

  return (
    <Link href={`/wallet`}>
      <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
              {position.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{position.symbol}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    position.direction === "LONG"
                      ? "bg-profit/20 text-profit"
                      : "bg-loss/20 text-loss"
                  )}
                >
                  {position.direction}
                </span>
                {position.leverage > 1 && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                    {position.leverage}x
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Entree: {formatCurrency(position.entry_price)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {formatCurrency(position.current_price || position.entry_price)}
            </p>
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
              {formatCurrency(position.unrealized_pnl || 0)} ({formatPercent(position.pnl_percent || 0)})
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function OpportunityCard({ opportunity }: { opportunity: any }) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-profit border-profit/30 bg-profit/10";
    if (s >= 60) return "text-green-400 border-green-400/30 bg-green-400/10";
    if (s >= 40) return "text-warning border-warning/30 bg-warning/10";
    return "text-loss border-loss/30 bg-loss/10";
  };

  const getSignal = (score: number) => {
    if (score >= 75) return "STRONG BUY";
    if (score >= 60) return "BUY";
    if (score >= 40) return "HOLD";
    return "SELL";
  };

  return (
    <Link href={`/analysis?symbol=${opportunity.symbol}`}>
      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-bold border",
                getScoreColor(opportunity.score)
              )}
            >
              {opportunity.score}
            </div>
            <div>
              <p className="font-semibold">{opportunity.symbol}</p>
              <p className="text-xs text-muted-foreground">{getSignal(opportunity.score)}</p>
            </div>
          </div>
          <div
            className={cn(
              "text-sm font-medium",
              opportunity.change >= 0 ? "text-profit" : "text-loss"
            )}
          >
            {formatPercent(opportunity.change)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({ title, icon }: { title: string; icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    globe: <Activity className="w-6 h-6" />,
    trade: <TrendingUp className="w-6 h-6" />,
    chart: <Target className="w-6 h-6" />,
    bot: <Flame className="w-6 h-6" />,
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] text-center cursor-pointer">
      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icons[icon]}
      </div>
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}
