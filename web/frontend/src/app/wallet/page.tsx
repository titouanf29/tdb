"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  History,
  PieChart,
  Target,
  Percent,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

const mockPositions = [
  {
    id: 1,
    symbol: "AAPL",
    name: "Apple Inc.",
    direction: "LONG",
    entryPrice: 178.5,
    currentPrice: 182.3,
    quantity: 10,
    amount: 1785,
    pnl: 38,
    pnlPercent: 2.13,
    leverage: 1,
    openedAt: "2024-01-15 10:30",
  },
  {
    id: 2,
    symbol: "BTC-USD",
    name: "Bitcoin",
    direction: "LONG",
    entryPrice: 62500,
    currentPrice: 64200,
    quantity: 0.05,
    amount: 3125,
    pnl: 85,
    pnlPercent: 2.72,
    leverage: 2,
    openedAt: "2024-01-14 15:45",
  },
  {
    id: 3,
    symbol: "NVDA",
    name: "NVIDIA",
    direction: "SHORT",
    entryPrice: 890,
    currentPrice: 875,
    quantity: 5,
    amount: 4450,
    pnl: 75,
    pnlPercent: 1.69,
    leverage: 1,
    openedAt: "2024-01-13 09:15",
  },
];

const mockHistory = [
  { symbol: "TSLA", direction: "LONG", pnl: 156.5, pnlPercent: 3.2, closedAt: "2024-01-12" },
  { symbol: "META", direction: "SHORT", pnl: -45.2, pnlPercent: -1.8, closedAt: "2024-01-11" },
  { symbol: "AMD", direction: "LONG", pnl: 89.0, pnlPercent: 2.1, closedAt: "2024-01-10" },
  { symbol: "GOOGL", direction: "LONG", pnl: 234.5, pnlPercent: 4.5, closedAt: "2024-01-09" },
];

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");

  const totalBalance = 12450.5;
  const totalPnL = mockPositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalInvested = mockPositions.reduce((sum, p) => sum + p.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:col-span-2"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-glow">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Solde Total</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("flex items-center gap-1 text-sm", totalPnL >= 0 ? "text-profit" : "text-loss")}>
                  {totalPnL >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {formatCurrency(Math.abs(totalPnL))} ({formatPercent(totalPnL / totalBalance * 100)})
                </span>
                <span className="text-muted-foreground text-sm">aujourd'hui</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Positions</p>
            <PieChart className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{mockPositions.length}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(totalInvested)} investis
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <Target className="w-4 h-4 text-profit" />
          </div>
          <p className="text-2xl font-bold">68%</p>
          <p className="text-sm text-muted-foreground mt-1">34 trades fermés</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("positions")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all",
            activeTab === "positions"
              ? "bg-primary text-white"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Positions Ouvertes
          </span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all",
            activeTab === "history"
              ? "bg-primary text-white"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historique
          </span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "positions" ? (
        <div className="space-y-4">
          {mockPositions.map((position, index) => (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center font-bold">
                    {position.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{position.symbol}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          position.direction === "LONG"
                            ? "bg-profit/20 text-profit"
                            : "bg-loss/20 text-loss"
                        )}
                      >
                        {position.direction}
                      </span>
                      {position.leverage > 1 && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary">
                          {position.leverage}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{position.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-8 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Entrée</p>
                    <p className="font-semibold">{formatCurrency(position.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Actuel</p>
                    <p className="font-semibold">{formatCurrency(position.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantité</p>
                    <p className="font-semibold">{position.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P&L</p>
                    <p
                      className={cn(
                        "font-bold flex items-center justify-end gap-1",
                        position.pnl >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {position.pnl >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {formatCurrency(position.pnl)}
                      <span className="text-xs">({formatPercent(position.pnlPercent)})</span>
                    </p>
                  </div>
                </div>

                <button className="btn-secondary ml-4">Fermer</button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm text-muted-foreground">Trade</th>
                <th className="text-right p-4 text-sm text-muted-foreground">P&L</th>
                <th className="text-right p-4 text-sm text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((trade, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{trade.symbol}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          trade.direction === "LONG"
                            ? "bg-profit/20 text-profit"
                            : "bg-loss/20 text-loss"
                        )}
                      >
                        {trade.direction}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        trade.pnl >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {formatCurrency(trade.pnl)} ({formatPercent(trade.pnlPercent)})
                    </span>
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {trade.closedAt}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
