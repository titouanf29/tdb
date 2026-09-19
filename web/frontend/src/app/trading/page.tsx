"use client";

import { useState, useEffect, useRef } from "react";
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
import { cn, formatPercent } from "@/lib/utils";
import { walletAPI, marketAPI, WalletBalance, Quote, missionsAPI } from "@/lib/api";
import { useFormatCurrency, useSettings } from "@/lib/SettingsContext";
import { HelpGuide } from "@/components/ui/HelpGuide";
import { useLanguage } from "@/lib/LanguageContext";

export default function TradingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const { t, lang } = useLanguage();
  const { settings, isLoaded } = useSettings();

  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "AAPL");
  // The analysis page hands over the plan it just computed (direction, stop,
  // target). Arriving with only a symbol meant retyping the two numbers that
  // define the risk, from a screen the user had just left.
  const planDirection = searchParams.get("direction") === "SHORT" ? "SHORT" : "LONG";
  const planSl = Number(searchParams.get("sl")) || null;
  const planTp = Number(searchParams.get("tp")) || null;
  const fromAnalysis = searchParams.get("from") === "analysis";

  const [direction, setDirection] = useState<"LONG" | "SHORT">(planDirection);
  const [amount, setAmount] = useState(1000);
  const [leverage, setLeverage] = useState(1);
  // Seed from "Levier par défaut" (/settings) once the preferences land, but
  // never overwrite a value the user has already picked in this form.
  const leverageTouched = useRef(false);
  const amountTouched = useRef(false);
  // Where the stop/target on screen came from. The generic ±5%/±3% suggestion
  // must not overwrite a plan carried from the analysis, nor a value the user
  // typed — it only fills the blanks.
  const levelsFromPlan = useRef(planSl != null || planTp != null);
  const levelsTouched = useRef(false);

  /** Generic fallback levels: +5% / -3% of the price, mirrored for a short. */
  const fallbackLevels = (px: number, dir: "LONG" | "SHORT") => ({
    tp: Math.round((dir === "LONG" ? px * 1.05 : px * 0.95) * 100) / 100,
    sl: Math.round((dir === "LONG" ? px * 0.97 : px * 1.03) * 100) / 100,
  });
  const [takeProfit, setTakeProfit] = useState<number | null>(planTp);
  const [stopLoss, setStopLoss] = useState<number | null>(planSl);
  const [useTP, setUseTP] = useState(planTp != null);
  const [useSL, setUseSL] = useState(planSl != null);

  // Risk-based sizing. Typing an arbitrary "1000" bears no relation to the
  // stop: the same amount risks 1% on one asset and 12% on another. Here the
  // user picks what they accept to LOSE, and the size follows from the stop.
  const [riskPct, setRiskPct] = useState(1);
  const [sizingOn, setSizingOn] = useState(planSl != null);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isLoaded && !leverageTouched.current) {
      setLeverage(Number(settings.defaultLeverage) || 1);
    }
  }, [isLoaded, settings.defaultLeverage]);


  // Load balance
  useEffect(() => {
    walletAPI.getBalance().then(setBalance).catch(console.error);
  }, []);

  // Load quote when symbol changes
  useEffect(() => {

    const loadQuote = async () => {
      if (!symbol || symbol.length < 1) return;
      setIsLoadingQuote(true);
      setQuoteError("");
      try {
        const data = await marketAPI.getQuote(symbol);
        if (!data.price || data.price <= 0) {
          setQuote(null);
          setQuoteError(`${t("trade_price_unavail")} ${symbol}`);
          return;
        }
        setQuote(data);


        // Generic fallback levels, only when nothing better is on screen.
        if (!levelsFromPlan.current && !levelsTouched.current) {
          const { tp, sl } = fallbackLevels(data.price, direction);
          setTakeProfit(tp);
          setStopLoss(sl);
        }

      } catch {
        setQuote(null);
        setQuoteError(`"${symbol}" ${t("trade_symbol_not_found")}`);
      } finally {
        setIsLoadingQuote(false);
      }
    };


    const debounce = setTimeout(loadQuote, 500);
    return () => clearTimeout(debounce);
  }, [symbol, direction, retryCount]);

  const currentPrice = quote?.price || 0;

  // Size = risk budget / distance to the stop. Capped by the balance and by
  // what the leverage allows, and reported so the arithmetic is visible
  // rather than hidden behind a number.
  const stopDistance = stopLoss != null && currentPrice > 0
    ? Math.abs(currentPrice - stopLoss) / currentPrice
    : null;
  const riskBudget = balance ? (balance.balance * riskPct) / 100 : 0;
  const suggestedAmount = stopDistance && stopDistance > 0.0005 && balance
    ? Math.max(10, Math.min(balance.balance, Math.round(riskBudget / (stopDistance * leverage))))
    : null;
  // What the position actually risks at the amount currently entered.
  const actualRisk = stopDistance ? amount * leverage * stopDistance : null;
  const actualRiskPct = actualRisk && balance?.balance ? (actualRisk / balance.balance) * 100 : null;

  // Keep the amount aligned with the risk budget while sizing is on and the
  // user has not overridden it by hand.
  useEffect(() => {
    if (sizingOn && !amountTouched.current && suggestedAmount) {
      setAmount(suggestedAmount);
    }
  }, [sizingOn, suggestedAmount]);
  const quantity = currentPrice > 0 ? (amount * leverage) / currentPrice : 0;

  const handleSubmit = async () => {
    if (!quote || currentPrice <= 0) {
      setError(quoteError || t("trade_symbol_invalid"));
      return;
    }

    if (amount > (balance?.balance || 0)) {
      setError(t("trade_insufficient"));
      return;
    }

    if (amount < 10) {
      setError(t("trade_min_amount"));
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
        take_profit: useTP ? takeProfit ?? undefined : undefined,
        stop_loss: useSL ? stopLoss ?? undefined : undefined,
      });

      setSuccess(`${t("trade_success")} ${formatCurrency(result.entry_price || currentPrice)}`);
      setBalance({ ...balance!, balance: result.new_balance });
      missionsAPI.recordAction("position_open").catch(() => {});

      // Redirect to wallet after 2 seconds
      setTimeout(() => router.push("/wallet"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("trade_err_opening"));
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
      <div className="text-center relative">
        <h1 className="text-xl sm:text-2xl font-bold inline-flex items-center gap-2">
          {t("trade_title")}
          <HelpGuide
            title={t("trade_help_title")}
            intro={t("trade_help_intro")}
            sections={[
              { title: t("trade_help_asset"), desc: t("trade_help_asset_desc") },
              { title: t("trade_help_dir"), desc: t("trade_help_dir_desc") },
              { title: t("trade_help_amount"), desc: t("trade_help_amount_desc") },
              { title: t("trade_help_lev"), desc: t("trade_help_lev_desc") },
              { title: t("trade_help_tpsl"), desc: t("trade_help_tpsl_desc") },
            ]}
            tip={t("trade_help_tip")}
          />
        </h1>
        <p className="text-muted-foreground">{t("trade_subtitle")}</p>
        {balance && (
          <p className="text-sm mt-2">
            {t("trade_balance")}:{" "}
            <span className="font-semibold text-primary">
              {formatCurrency(balance.balance)}
            </span>
          </p>
        )}
      </div>

      {/* The plan carried over from the analysis, stated so the user can see
          what was pre-filled rather than wonder where the numbers came from. */}
      {fromAnalysis && (planSl != null || planTp != null) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-primary/30 bg-primary/[0.07] p-3"
        >
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
            <Zap className="w-4 h-4 shrink-0" />
            {lang === "fr" ? "Plan repris de l'analyse" : "Plan carried over from the analysis"}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {planDirection}
            {planSl != null && ` · stop ${planSl}`}
            {planTp != null && ` · ${lang === "fr" ? "objectif" : "target"} ${planTp}`}
            {" · "}
            {lang === "fr" ? "modifiable ci-dessous" : "editable below"}
          </p>
        </motion.div>
      )}

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
            <label className="block text-sm font-medium mb-2">{t("asset")}</label>
            <div className="relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full input text-lg font-bold"
                placeholder={t("trade_symbol_ph")}
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
              {!quote && !isLoadingQuote && quoteError && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-loss" />
              )}
            </div>
            {quote && (
              <p className="text-xs text-muted-foreground/50 mt-1">
                Source : Yahoo Finance · ~1 min de différé · Des écarts avec votre broker sont normaux sur un simulateur.
              </p>
            )}
          </div>


          {/* Direction */}
          <div>
            <label className="block text-sm font-medium mb-2">{t("trade_direction")}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (direction !== "LONG") {
                    setDirection("LONG");
                    // A plan carried from the analysis was built for the other
                    // side; its stop would now sit on the wrong side of the
                    // price, which the backend rejects. Rebuild it.
                    levelsFromPlan.current = false;
                    levelsTouched.current = false;
                    const px = quote?.price ?? 0;
                    if (px > 0) {
                      const next = fallbackLevels(px, "LONG");
                      setTakeProfit(next.tp);
                      setStopLoss(next.sl);
                    }
                  }
                }}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold",
                  direction === "LONG"
                    ? "border-profit bg-profit/10 text-profit"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <TrendingUp className="w-5 h-5" />
                {t("trade_long")}
              </button>
              <button
                onClick={() => {
                  if (direction !== "SHORT") {
                    setDirection("SHORT");
                    // A plan carried from the analysis was built for the other
                    // side; its stop would now sit on the wrong side of the
                    // price, which the backend rejects. Rebuild it.
                    levelsFromPlan.current = false;
                    levelsTouched.current = false;
                    const px = quote?.price ?? 0;
                    if (px > 0) {
                      const next = fallbackLevels(px, "SHORT");
                      setTakeProfit(next.tp);
                      setStopLoss(next.sl);
                    }
                  }
                }}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold",
                  direction === "SHORT"
                    ? "border-loss bg-loss/10 text-loss"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <TrendingDown className="w-5 h-5" />
                {t("trade_short")}
              </button>
            </div>
          </div>

          {/* Risk-based sizing — the link between the stop and the size */}
          {stopLoss != null && currentPrice > 0 && (
            <div className="border border-border bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sizingOn}
                    onChange={(e) => { setSizingOn(e.target.checked); amountTouched.current = false; }}
                    className="accent-primary"
                  />
                  {lang === "fr" ? "Calculer la taille par le risque" : "Size from risk"}
                </label>
                {sizingOn && (
                  <div className="flex gap-1">
                    {[0.5, 1, 2, 3].map((r) => (
                      <button
                        key={r}
                        onClick={() => { setRiskPct(r); amountTouched.current = false; }}
                        className={cn("px-2 py-0.5 font-mono text-[11px] border transition-all",
                          riskPct === r ? "border-primary/50 bg-primary/15 text-primary"
                                        : "border-border text-muted-foreground hover:text-foreground")}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {sizingOn ? (
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {lang === "fr"
                    ? `risque ${riskPct} % de ${formatCurrency(balance?.balance ?? 0)} = ${formatCurrency(riskBudget)}`
                    : `risking ${riskPct}% of ${formatCurrency(balance?.balance ?? 0)} = ${formatCurrency(riskBudget)}`}
                  {stopDistance != null && ` · ${lang === "fr" ? "stop à" : "stop"} ${(stopDistance * 100).toFixed(2)} %`}
                  {suggestedAmount != null && ` → ${formatCurrency(suggestedAmount)}`}
                </p>
              ) : (
                actualRiskPct != null && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {lang === "fr" ? "au montant saisi, vous risquez " : "at this amount you risk "}
                    <span className={cn("font-bold", actualRiskPct > 5 ? "text-loss" : actualRiskPct > 2 ? "text-warning" : "text-foreground")}>
                      {formatCurrency(actualRisk ?? 0)} ({actualRiskPct.toFixed(1)} %)
                    </span>
                  </p>
                )
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">{t("trade_amount_usd")}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { amountTouched.current = true; setAmount(Number(e.target.value)); }}
              className="w-full input text-lg font-bold"
              min={10}
              step={100}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[100, 500, 1000, 2500].map((val) => (
                <button
                  key={val}
                  onClick={() => { amountTouched.current = true; setAmount(val); }}
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
                {t("trade_leverage")}
              </span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 10].map((lev) => (
                <button
                  key={lev}
                  onClick={() => { leverageTouched.current = true; setLeverage(lev); }}
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
                {t("trade_leverage_risk")}
              </p>
            )}
          </div>

          {/* Quote error */}
          {quoteError && !isLoadingQuote && (
            <div className="p-3 rounded-lg bg-loss/10 border border-loss/30 flex items-center justify-between gap-3 text-sm text-loss">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {quoteError}
              </div>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="text-xs underline shrink-0 hover:opacity-80"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting || !quote || currentPrice <= 0}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
              direction === "LONG"
                ? "bg-profit hover:bg-profit/90 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                : "bg-loss hover:bg-loss/90 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLoadingQuote ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("trade_loading_price")}
              </>
            ) : (
              <>
                {direction === "LONG" ? t("trade_buy") : t("trade_sell")} {symbol}
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
              {t("trade_preview")}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">{t("asset")}</span>
                <span className="font-semibold">{symbol || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">{t("trade_direction")}</span>
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
                <span className="text-muted-foreground">{t("trade_entry_price")}</span>
                <span className="font-semibold">
                  {quote ? formatCurrency(currentPrice) : "-"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">{t("trade_quantity")}</span>
                <span className="font-semibold">{quantity.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">{t("trade_total_value")}</span>
                <span className="font-semibold">{formatCurrency(amount * leverage)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">{t("trade_margin")}</span>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Risk management */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t("trade_risk_mgmt")}
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
                    <span className="text-sm text-muted-foreground">{t("trade_tp")}</span>
                  </label>
                  <span className="text-profit font-semibold">
                    {takeProfit ? formatCurrency(takeProfit) : "-"}
                  </span>
                </div>
                {useTP && (
                  <input
                    type="number"
                    value={takeProfit || ""}
                    onChange={(e) => { levelsTouched.current = true; setTakeProfit(Number(e.target.value)); }}
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
                    <span className="text-sm text-muted-foreground">{t("trade_sl")}</span>
                  </label>
                  <span className="text-loss font-semibold">
                    {stopLoss ? formatCurrency(stopLoss) : "-"}
                  </span>
                </div>
                {useSL && (
                  <input
                    type="number"
                    value={stopLoss || ""}
                    onChange={(e) => { levelsTouched.current = true; setStopLoss(Number(e.target.value)); }}
                    className="w-full input text-sm"
                    step={0.01}
                  />
                )}
              </div>

              {useTP && useSL && takeProfit && stopLoss && currentPrice > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("trade_rr")}</span>
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
