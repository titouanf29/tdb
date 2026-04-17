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
  Plus,
  Banknote,
  AlertTriangle,
  Crown,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, WalletBalance, Position, TradingStats } from "@/lib/api";
import { useFormatCurrency } from "@/lib/SettingsContext";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useLanguage } from "@/lib/LanguageContext";
import { HelpGuide } from "@/components/ui/HelpGuide";
import { usePremium } from "@/lib/PremiumContext";

export default function WalletPage() {
  const formatCurrency = useFormatCurrency();
  const { t, lang } = useLanguage();
  const { isPremium, isAdmin } = usePremium();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Position[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [closingPosition, setClosingPosition] = useState<number | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [addFundsError, setAddFundsError] = useState("");

  const canAddFunds = isPremium || isAdmin;
  const LOW_BALANCE_THRESHOLD = 1000;

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

  const addFunds = async () => {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) {
      setAddFundsError(t("wallet_err_invalid"));
      return;
    }
    if (amount > 100000) {
      setAddFundsError(t("wallet_err_max"));
      return;
    }

    setIsAddingFunds(true);
    setAddFundsError("");

    try {
      await walletAPI.addFunds(amount);
      await loadData();
      setShowAddFundsModal(false);
      setAddFundsAmount("");
    } catch (error) {
      setAddFundsError(error instanceof Error ? error.message : t("error_generic"));
    } finally {
      setIsAddingFunds(false);
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
          <h1 className="text-2xl font-bold">{t("wallet_title")}</h1>
          <p className="text-muted-foreground">{t("wallet_subtitle")}</p>
        </div>
        <div className="flex gap-3 items-center">
          <HelpGuide
            title={lang === "en" ? "Wallet" : "Wallet"}
            intro={lang === "en"
              ? "Your virtual trading account: available balance, transaction history and performance statistics."
              : "Ton compte de trading virtuel : solde disponible, historique des transactions et statistiques de performance."}
            sections={lang === "en" ? [
              { title: "Balance & equity", desc: "The available balance is what you can use to open new positions. Equity includes the P&L of open positions." },
              { title: "Add funds", desc: "Click '+ Add funds' to credit your virtual trading account and start trading." },
              { title: "Open positions", desc: "List of active trades with their real-time P&L. You can close them directly from here." },
              { title: "History", desc: "All your past trades with the date, direction (Long/Short), result and entry/exit levels." },
              { title: "Statistics", desc: "Win rate, average gain, average loss, profit factor and other key performance metrics." },
            ] : [
              { title: "Solde & équité", desc: "Le solde disponible est ce que tu peux utiliser pour ouvrir de nouvelles positions. L'équité inclut les P&L des positions ouvertes." },
              { title: "Ajouter des fonds", desc: "Clique sur '+ Ajouter des fonds' pour créditer ton compte de trading virtuel et commencer à trader." },
              { title: "Positions ouvertes", desc: "Liste des trades actifs avec leur P&L en temps réel. Tu peux les clôturer directement depuis ici." },
              { title: "Historique", desc: "Tous tes trades passés avec la date, le sens (Long/Short), le résultat et les niveaux d'entrée/sortie." },
              { title: "Statistiques", desc: "Taux de réussite, gain moyen, perte moyenne, facteur de profit et autres métriques clés de ta performance." },
            ]}
            tip={lang === "en"
              ? "Virtual trading carries no real financial risk. Use it to test your strategy before going live."
              : "Le trading virtuel ne comporte aucun risque financier réel. Utilise-le pour tester ta stratégie avant de passer au réel."}
          />
          <button
            onClick={() => canAddFunds ? setShowAddFundsModal(true) : setShowPremiumGate(true)}
            className={cn("btn-primary flex items-center gap-2", !canAddFunds && "opacity-90")}
          >
            {canAddFunds ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {t("wallet_add_funds")}
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          title={t("wallet_balance")}
          rawValue={balance?.balance || 0}
          formatter={formatCurrency}
          icon={Wallet}
          color="primary"
          index={0}
        />
        <BalanceCard
          title={t("wallet_positions_val")}
          rawValue={balance?.positions_value || 0}
          formatter={formatCurrency}
          icon={DollarSign}
          color="blue"
          index={1}
        />
        <BalanceCard
          title={t("wallet_pnl")}
          rawValue={balance?.total_pnl || 0}
          formatter={formatCurrency}
          icon={balance?.total_pnl && balance.total_pnl >= 0 ? TrendingUp : TrendingDown}
          color={balance?.total_pnl && balance.total_pnl >= 0 ? "green" : "red"}
          index={2}
        />
        <BalanceCard
          title={t("wallet_equity")}
          rawValue={balance?.total_equity ?? ((balance?.balance || 0) + (balance?.positions_value || 0))}
          formatter={formatCurrency}
          icon={Target}
          color="purple"
          index={3}
        />
      </div>

      {/* Low balance warning */}
      {balance && balance.balance < LOW_BALANCE_THRESHOLD && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-warning/40 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-warning/15 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-sm text-warning">
                {lang === "en" ? "Low balance" : "Solde faible"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "en"
                  ? `Your virtual balance is below ${formatCurrency(LOW_BALANCE_THRESHOLD)}. Add funds to keep trading.`
                  : `Ton solde virtuel est inférieur à ${formatCurrency(LOW_BALANCE_THRESHOLD)}. Recharge ton compte pour continuer à trader.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
            <Link
              href="/premium"
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Crown className="w-3.5 h-3.5" />
              {lang === "en" ? "Go Premium" : "Passer Premium"}
            </Link>
            <Link
              href="/premium"
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {lang === "en" ? "Contact admin" : "Contacter l'admin"}
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">{t("wallet_stats_title")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t("wallet_total_trades"), value: stats?.total_trades || 0 },
            { label: t("wallet_winning"), value: stats?.winning_trades || 0, color: "green" as const },
            { label: t("wallet_losing"), value: stats?.losing_trades || 0, color: "red" as const },
            { label: t("wallet_winrate"), value: `${stats?.win_rate || 0}%` },
            { label: t("wallet_total_pnl"), value: formatCurrency(stats?.total_pnl || 0), color: (stats?.total_pnl ?? 0) >= 0 ? "green" as const : "red" as const },
            { label: t("wallet_best_trade"), value: formatCurrency(stats?.best_trade || 0), color: "green" as const },
            { label: t("wallet_worst_trade"), value: formatCurrency(stats?.worst_trade || 0), color: "red" as const },
            { label: t("wallet_avg_pnl"), value: formatCurrency(stats?.avg_pnl || 0) },
          ].map((item, i) => (
            <StatItem key={item.label} index={i} {...item} />
          ))}
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
          {t("wallet_open_pos")} ({positions.length})
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
          {t("wallet_history")} ({history.length})
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
              <p className="text-muted-foreground">{t("wallet_no_positions")}</p>
            </div>
          ) : (
            positions.map((position, i) => (
              <PositionCard
                key={position.id}
                position={position}
                onClose={() => closePosition(position.id)}
                isClosing={closingPosition === position.id}
                formatCurrency={formatCurrency}
                index={i}
              />
            ))
          )
        ) : history.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t("wallet_no_history")}</p>
          </div>
        ) : (
          history.map((position, i) => (
            <HistoryCard key={position.id} position={position} formatCurrency={formatCurrency} index={i} />
          ))
        )}
      </div>

      {/* Premium Gate Modal */}
      {showPremiumGate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold mb-2">
              {lang === "en" ? "Premium Feature" : "Fonctionnalité Premium"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {lang === "en"
                ? "Adding virtual funds is exclusive to Premium members. Upgrade to reload your wallet whenever you need."
                : "L'ajout de fonds virtuels est réservé aux membres Premium. Passe Premium pour recharger ton wallet à tout moment."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPremiumGate(false)}
                className="flex-1 btn-secondary"
              >
                {t("cancel")}
              </button>
              <Link
                href="/premium"
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                {lang === "en" ? "Go Premium" : "Passer Premium"}
              </Link>
            </div>
            <Link
              href="/premium"
              onClick={() => setShowPremiumGate(false)}
              className="block mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === "en" ? "or contact an admin →" : "ou contacter un administrateur →"}
            </Link>
          </motion.div>
        </div>
      )}

      {/* Add Funds Modal */}
      {showAddFundsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("wallet_add_modal_title")}</h2>
                <p className="text-sm text-muted-foreground">{t("wallet_paper_label")}</p>
              </div>
            </div>

            {addFundsError && (
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/30 text-loss text-sm mb-4">
                {addFundsError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">{t("wallet_amount_label")}</label>
              <input
                type="number"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                placeholder={t("wallet_amount_ph")}
                className="w-full input"
                min="1"
                max="100000"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {[1000, 5000, 10000, 25000, 50000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setAddFundsAmount(String(amount))}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
                >
                  ${amount.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddFundsModal(false);
                  setAddFundsAmount("");
                  setAddFundsError("");
                }}
                className="flex-1 btn-secondary"
              >
                {t("cancel")}
              </button>
              <button
                onClick={addFunds}
                disabled={isAddingFunds || !addFundsAmount}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAddingFunds ? (
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
  );
}

function BalanceCard({
  title,
  rawValue,
  formatter,
  icon: Icon,
  color,
  index = 0,
}: {
  title: string;
  rawValue: number;
  formatter: (v: number) => string;
  icon: React.ElementType;
  color: "primary" | "blue" | "green" | "red" | "purple";
  index?: number;
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.09, duration: 0.45, ease: "easeOut" }}
      className="glass-card hover-lift p-5"
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <AnimatedNumber
            value={rawValue}
            formatter={formatter}
            className="text-xl font-bold"
          />
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({
  label,
  value,
  color,
  index = 0,
}: {
  label: string;
  value: string | number;
  color?: "green" | "red";
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-xl bg-white/5 cursor-default"
    >
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
    </motion.div>
  );
}

function PositionCard({
  position,
  onClose,
  isClosing,
  formatCurrency,
  index = 0,
}: {
  position: Position;
  onClose: () => void;
  isClosing: boolean;
  formatCurrency: (value: number) => string;
  index?: number;
}) {
  const { t } = useLanguage();
  const isProfit = (position.unrealized_pnl || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ scale: 1.005 }}
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
              <span>{t("wallet_entry")}: {formatCurrency(position.entry_price)}</span>
              <span>{t("wallet_qty")}: {position.quantity.toFixed(4)}</span>
              <span>{t("wallet_amount")}: {formatCurrency(position.amount)}</span>
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
            {t("wallet_close")}
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

function HistoryCard({ position, formatCurrency, index = 0 }: { position: Position; formatCurrency: (value: number) => string; index?: number }) {
  const { t } = useLanguage();
  const isProfit = (position.realized_pnl || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="glass-card p-4 opacity-80"
    >
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
              <span>{t("wallet_entry")}: {formatCurrency(position.entry_price)}</span>
              <span>{t("wallet_exit")}: {formatCurrency(position.exit_price || 0)}</span>
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
    </motion.div>
  );
}
