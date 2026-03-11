"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  Info,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { walletAPI, marketAPI, WalletBalance, Quote } from "@/lib/api";

export default function TradingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "AAPL");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [amount, setAmount] = useState(1000);
  const [leverage, setLeverage] = useState(1);
  const [takeProfit, setTakeProfit] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [useTP, setUseTP] = useState(false);
  const [useSL, setUseSL] = useState(false);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load balance
  useEffect(() => {
    walletAPI.getBalance().then(setBalance).catch(console.error);
  }, []);

  // Load quote when symbol changes
  useEffect(() => {
    const loadQuote = async () => {
      if (!symbol || symbol.length < 1) return;
      setIsLoadingQuote(true);
      try {
        const data = await marketAPI.getQuote(symbol);
        setQuote(data);

        // Set suggested TP/SL
        const tp = direction === "LONG" ? data.price * 1.05 : data.price * 0.95;
        const sl = direction === "LONG" ? data.price * 0.97 : data.price * 1.03;
        setTakeProfit(Math.round(tp * 100) / 100);
        setStopLoss(Math.round(sl * 100) / 100);
      } catch (error) {
        console.error("Error loading quote:", error);
        setQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const debounce = setTimeout(loadQuote, 500);
    return () => clearTimeout(debounce);
  }, [symbol, direction]);

  const currentPrice = quote?.price || 0;
  const quantity = currentPrice > 0 ? (amount * leverage) / currentPrice : 0;

  const handleSubmit = async () => {
    if (!quote || currentPrice <= 0) {
      setError("Veuillez entrer un symbole valide");
      return;
    }

    if (amount > (balance?.balance || 0)) {
      setError("Solde insuffisant");
      return;
    }

    if (amount < 10) {
      setError("Montant minimum: $10");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result = await walletAPI.openPosition({
        symbol: symbol.toUpperCase(),
        direction,
        amount,
        leverage,
        take_profit: useTP ? takeProfit : undefined,
        stop_loss: useSL ? stopLoss : undefined,
      });

      setSuccess(`Position ouverte ! Entree: ${formatCurrency(result.entry_price || currentPrice)}`);
      setBalance({ ...balance!, balance: result.new_balance });

      // Redirect to wallet after 2 seconds
      setTimeout(() => router.push("/wallet"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {balance && (
          <p className="text-sm mt-2">
            Solde disponible:{" "}
            <span className="font-semibold text-primary">
              {formatCurrency(balance.balance)}
            </span>
          </p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-loss/10 border border-loss/30 flex items-center gap-3 text-loss"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-profit/10 border border-profit/30 flex items-center gap-3 text-profit"
        >
          <Check className="w-5 h-5" />
          {success}
        </motion.div>
      )}

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
              {isLoadingQuote && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
              {quote && !isLoadingQuote && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(quote.price)}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      quote.change >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatPercent(quote.change)}
                  </span>
                </div>
              )}
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
                Levier eleve = risque eleve
              </p>
            )}
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting || !quote || currentPrice <= 0}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50",
              direction === "LONG"
                ? "bg-profit hover:bg-profit/90 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                : "bg-loss hover:bg-loss/90 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {direction === "LONG" ? "Acheter" : "Vendre"} {symbol}
              </>
            )}
          </motion.button>
        </div>

        {/* Order preview */}
        <div className="space-y-4">
          {/* Position preview */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Apercu de la Position
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Actif</span>
                <span className="font-semibold">{symbol || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Direction</span>
                <span
                  className={cn(
                    "font-semibold",
                    direction === "LONG" ? "text-profit" : "text-loss"
                  )}
                >
                  {direction}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Prix d'entree</span>
                <span className="font-semibold">
                  {quote ? formatCurrency(currentPrice) : "-"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Quantite</span>
                <span className="font-semibold">{quantity.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Valeur totale</span>
                <span className="font-semibold">{formatCurrency(amount * leverage)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Marge utilisee</span>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useTP}
                      onChange={(e) => setUseTP(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-muted-foreground">Take Profit</span>
                  </label>
                  <span className="text-profit font-semibold">
                    {takeProfit ? formatCurrency(takeProfit) : "-"}
                  </span>
                </div>
                {useTP && (
                  <input
                    type="number"
                    value={takeProfit || ""}
                    onChange={(e) => setTakeProfit(Number(e.target.value))}
                    className="w-full input text-sm"
                    step={0.01}
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useSL}
                      onChange={(e) => setUseSL(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-muted-foreground">Stop Loss</span>
                  </label>
                  <span className="text-loss font-semibold">
                    {stopLoss ? formatCurrency(stopLoss) : "-"}
                  </span>
                </div>
                {useSL && (
                  <input
                    type="number"
                    value={stopLoss || ""}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="w-full input text-sm"
                    step={0.01}
                  />
                )}
              </div>

              {useTP && useSL && takeProfit && stopLoss && currentPrice > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ratio risque/recompense</span>
                    <span className="font-bold text-primary">
                      1:
                      {(
                        Math.abs(takeProfit - currentPrice) /
                        Math.abs(stopLoss - currentPrice)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
