"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  X,
  Loader2,
  RefreshCw,
  History,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, WalletBalance, Position, TradingStats } from "@/lib/api";
import { useFormatCurrency } from "@/lib/SettingsContext";

export default function WalletPage() {
  const formatCurrency = useFormatCurrency();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Position[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [closingPosition, setClosingPosition] = useState<number | null>(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [balanceData, positionsData, historyData, statsData] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getPositions("open"),
        walletAPI.getHistory(20),
        walletAPI.getStats(),
      ]);

      setBalance(balanceData);
      setPositions(positionsData.positions);
      setHistory(historyData.history);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading wallet:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const closePosition = async (positionId: number) => {
    setClosingPosition(positionId);
    try {
      await walletAPI.closePosition(positionId);
      await loadData();
    } catch (error) {
      console.error("Error closing position:", error);
    } finally {
      setClosingPosition(null);
    }
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
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Gerez votre portefeuille virtuel</p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          title="Solde Disponible"
          value={formatCurrency(balance?.balance || 0)}
          icon={Wallet}
          color="primary"
        />
        <BalanceCard
          title="Valeur Positions"
          value={formatCurrency(balance?.positions_value || 0)}
          icon={DollarSign}
          color="blue"
        />
        <BalanceCard
          title="P&L Non Realise"
          value={formatCurrency(balance?.total_pnl || 0)}
          icon={balance?.total_pnl && balance.total_pnl >= 0 ? TrendingUp : TrendingDown}
          color={balance?.total_pnl && balance.total_pnl >= 0 ? "green" : "red"}
        />
        <BalanceCard
          title="Equity Totale"
          value={formatCurrency(balance?.total_equity || (balance?.balance || 0) + (balance?.positions_value || 0))}
          icon={Target}
          color="purple"
        />
      </div>

      {/* Stats */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Statistiques de Trading</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Total Trades" value={stats?.total_trades || 0} />
          <StatItem label="Trades Gagnants" value={stats?.winning_trades || 0} color="green" />
          <StatItem label="Trades Perdants" value={stats?.losing_trades || 0} color="red" />
          <StatItem label="Win Rate" value={`${stats?.win_rate || 0}%`} />
          <StatItem label="P&L Total" value={formatCurrency(stats?.total_pnl || 0)} color={stats?.total_pnl && stats.total_pnl >= 0 ? "green" : "red"} />
          <StatItem label="Meilleur Trade" value={formatCurrency(stats?.best_trade || 0)} color="green" />
          <StatItem label="Pire Trade" value={formatCurrency(stats?.worst_trade || 0)} color="red" />
          <StatItem label="P&L Moyen" value={formatCurrency(stats?.avg_pnl || 0)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab("open")}
          className={cn(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === "open"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Positions Ouvertes ({positions.length})
          {activeTab === "open" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={cn(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === "closed"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Historique ({history.length})
          {activeTab === "closed" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
      </div>

      {/* Positions */}
      <div className="space-y-3">
        {activeTab === "open" ? (
          positions.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Aucune position ouverte</p>
            </div>
          ) : (
            positions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onClose={() => closePosition(position.id)}
                isClosing={closingPosition === position.id}
              />
            ))
          )
        ) : history.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun historique</p>
          </div>
        ) : (
          history.map((position) => (
            <HistoryCard key={position.id} position={position} />
          ))
        )}
      </div>
    </motion.div>
  );
}

function BalanceCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: "primary" | "blue" | "green" | "red" | "purple";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "green" | "red";
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold mt-1",
          color === "green" && "text-profit",
          color === "red" && "text-loss"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PositionCard({
  position,
  onClose,
  isClosing,
}: {
  position: Position;
  onClose: () => void;
  isClosing: boolean;
}) {
  const isProfit = (position.unrealized_pnl || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center font-bold">
            {position.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{position.symbol}</span>
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
            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
              <span>Entree: {formatCurrency(position.entry_price)}</span>
              <span>Qte: {position.quantity.toFixed(4)}</span>
              <span>Montant: {formatCurrency(position.amount)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-semibold text-lg">
              {formatCurrency(position.current_price || position.entry_price)}
            </p>
            <p
              className={cn(
                "flex items-center justify-end gap-1",
                isProfit ? "text-profit" : "text-loss"
              )}
            >
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {formatCurrency(position.unrealized_pnl || 0)} ({formatPercent(position.pnl_percent || 0)})
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isClosing}
            className="px-4 py-2 rounded-lg bg-loss/20 text-loss hover:bg-loss/30 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isClosing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Fermer
          </button>
        </div>
      </div>

      {/* TP/SL info */}
      {(position.take_profit || position.stop_loss) && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 text-sm">
          {position.take_profit && (
            <span className="text-profit">
              TP: {formatCurrency(position.take_profit)}
            </span>
          )}
          {position.stop_loss && (
            <span className="text-loss">
              SL: {formatCurrency(position.stop_loss)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function HistoryCard({ position }: { position: Position }) {
  const isProfit = (position.realized_pnl || 0) >= 0;

  return (
    <div className="glass-card p-4 opacity-80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center font-bold">
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
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
              <span>Entree: {formatCurrency(position.entry_price)}</span>
              <span>Sortie: {formatCurrency(position.exit_price || 0)}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p
            className={cn(
              "font-semibold text-lg flex items-center justify-end gap-1",
              isProfit ? "text-profit" : "text-loss"
            )}
          >
            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatCurrency(position.realized_pnl || 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {position.closed_at ? new Date(position.closed_at).toLocaleDateString() : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
