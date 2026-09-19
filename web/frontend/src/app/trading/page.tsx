"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  marketAPI, missionsAPI, walletAPI,
  type Quote, type WalletBalance,
} from "@/lib/api";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import {
  Button, Checkbox, Field, FormError, Heading, Num, Panel, SegmentedControl,
  Text, TextInput, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";

/**
 * Opening a position.
 *
 * The screen is arranged around the one question that decides everything:
 * where does this stop? Direction, entry and stop come first; the amount is
 * derived from them rather than typed, because a round "1 000 €" bears no
 * relation to the risk — the same amount risks 1% on one asset and 12% on
 * another.
 *
 * Two behaviours from the previous version are preserved exactly, because
 * both were bugs once:
 *
 *   * a plan carried over from the analysis screen (?direction, ?sl, ?tp) is
 *     never overwritten by the generic ±5% / ±3% fallback levels;
 *   * once the user edits a field by hand, the automatic sizing stops
 *     touching it.
 *
 * Both are tracked with refs rather than state: they record what the user has
 * done, not what the screen should show, and re-rendering on them would
 * change nothing.
 */

const RISK_PRESETS = [0.5, 1, 2, 5];

export default function TradingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { settings, eurUsd, isLoaded } = useSettings();
  const [animOn] = useAnimationsEnabled();

  // ── The plan, as handed over by the analysis screen ──────────────────────
  const planDirection = params.get("direction") === "SHORT" ? "SHORT" : "LONG";
  const planSl = Number(params.get("sl")) || null;
  const planTp = Number(params.get("tp")) || null;
  const fromAnalysis = params.get("from") === "analysis";

  const [symbol, setSymbol] = useState(params.get("symbol") || "AAPL");
  const [direction, setDirection] = useState<"LONG" | "SHORT">(planDirection);
  const [amount, setAmount] = useState(1000);
  const [leverage, setLeverage] = useState(1);
  const [takeProfit, setTakeProfit] = useState<number | null>(planTp);
  const [stopLoss, setStopLoss] = useState<number | null>(planSl);
  const [useTP, setUseTP] = useState(planTp != null);
  const [useSL, setUseSL] = useState(planSl != null);
  const [riskPct, setRiskPct] = useState(1);
  const [sizingOn, setSizingOn] = useState(planSl != null);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const levelsFromPlan = useRef(planSl != null || planTp != null);
  const levelsTouched = useRef(false);
  const amountTouched = useRef(false);
  const leverageTouched = useRef(false);

  const fallbackLevels = (px: number, dir: "LONG" | "SHORT") => ({
    tp: Math.round((dir === "LONG" ? px * 1.05 : px * 0.95) * 100) / 100,
    sl: Math.round((dir === "LONG" ? px * 0.97 : px * 1.03) * 100) / 100,
  });

  useEffect(() => {
    if (isLoaded && !leverageTouched.current) {
      setLeverage(Number(settings.defaultLeverage) || 1);
    }
  }, [isLoaded, settings.defaultLeverage]);

  useEffect(() => {
    walletAPI.getBalance().then(setBalance).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!symbol) return;
      setLoadingQuote(true);
      setQuoteError("");
      try {
        const d = await marketAPI.getQuote(symbol);
        if (!d.price || d.price <= 0) {
          setQuote(null);
          setQuoteError(`Prix indisponible pour ${symbol}.`);
          return;
        }
        setQuote(d);
        // Generic levels only when nothing better is already on screen.
        if (!levelsFromPlan.current && !levelsTouched.current) {
          const { tp, sl } = fallbackLevels(d.price, direction);
          setTakeProfit(tp);
          setStopLoss(sl);
        }
      } catch {
        setQuote(null);
        setQuoteError(`« ${symbol} » est introuvable.`);
      } finally {
        setLoadingQuote(false);
      }
    };
    const t = setTimeout(load, 500);
    return () => clearTimeout(t);
  }, [symbol, direction]);

  const price = quote?.price || 0;

  // Size = risk budget ÷ distance to the stop, capped by the balance and by
  // what the leverage allows. Reported below, so the arithmetic is visible
  // rather than hidden behind a number.
  const stopDistance = stopLoss != null && price > 0
    ? Math.abs(price - stopLoss) / price
    : null;
  const riskBudget = balance ? (balance.balance * riskPct) / 100 : 0;
  const suggested = stopDistance && stopDistance > 0.0005 && balance
    ? Math.max(10, Math.min(balance.balance, Math.round(riskBudget / (stopDistance * leverage))))
    : null;
  const actualRisk = stopDistance ? amount * leverage * stopDistance : null;
  const actualRiskPct = actualRisk && balance?.balance
    ? (actualRisk / balance.balance) * 100
    : null;

  useEffect(() => {
    if (sizingOn && !amountTouched.current && suggested) setAmount(suggested);
  }, [sizingOn, suggested]);

  const quantity = price > 0 ? (amount * leverage) / price : 0;

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote || price <= 0) return setError(quoteError || "Choisissez un actif valide.");
    if (amount > (balance?.balance ?? 0)) return setError("Solde insuffisant.");
    if (amount < 10) return setError("Le montant minimum est de 10 €.");

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const r = await walletAPI.openPosition({
        symbol: symbol.toUpperCase(),
        direction,
        amount,
        leverage,
        take_profit: useTP ? takeProfit ?? undefined : undefined,
        stop_loss: useSL ? stopLoss ?? undefined : undefined,
      });
      setSuccess(`Position ouverte à ${money(r.entry_price || price)}.`);
      if (balance) setBalance({ ...balance, balance: r.new_balance });
      missionsAPI.recordAction("position_open").catch(() => {});
      setTimeout(() => router.push("/wallet"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir la position.");
    } finally {
      setSubmitting(false);
    }
  };

  const riskTone = useMemo(() => {
    if (actualRiskPct == null) return "muted" as const;
    if (actualRiskPct > 5) return "down" as const;
    return "ink" as const;
  }, [actualRiskPct]);

  return (
    <>
      <WeatherBackdrop condition="cloudy" enabled={animOn} />

      <div className="relative space-y-8">
        <header className="pt-2">
          <Heading level={1}>Ouvrir une position</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            Argent virtuel. La question qui compte est « où est-ce que ça
            s&apos;arrête ? » — le reste en découle.
          </Text>
        </header>

        {fromAnalysis && (planSl != null || planTp != null) && (
          <div
            className="px-4 py-3.5"
            style={{
              borderRadius: "var(--cap-r-md)",
              backgroundColor: "var(--cap-surface)",
              boxShadow: "inset 0 0 0 1px var(--cap-ocean)",
            }}
          >
            <Text size="small" tone="ink">
              Plan repris de l&apos;analyse : {direction === "LONG" ? "achat" : "vente"}
              {planSl != null && <> · stop à <Num>{planSl}</Num></>}
              {planTp != null && <> · objectif à <Num>{planTp}</Num></>}
            </Text>
          </div>
        )}

        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" noValidate>
          {/* ── Left: the decision ──────────────────────────────────────── */}
          {/* min-w-0: a grid child will not shrink below its intrinsic width
              without it, so one wide row inside stretches the whole layout. */}
          <div className="min-w-0 space-y-5">
            <Panel title="L'actif et le sens">
              <div className="space-y-5">
                <Field
                  label="Symbole"
                  htmlFor="tr-symbol"
                  error={quoteError || undefined}
                  hint={
                    !quoteError && quote
                      ? `Dernier prix : ${money(price)}`
                      : "AAPL, BTC-USD, MC.PA…"
                  }
                >
                  <div className="relative">
                    <TextInput
                      id="tr-symbol"
                      value={symbol}
                      onChange={(v) => setSymbol(v.toUpperCase())}
                      placeholder="AAPL"
                      invalid={!!quoteError}
                      required
                    />
                    {loadingQuote && (
                      <Loader2
                        className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
                        style={{ color: "var(--cap-ink-4)" }}
                      />
                    )}
                  </div>
                </Field>

                <div>
                  <span className="mb-1.5 block text-[0.85rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    Sens
                  </span>
                  <SegmentedControl
                    options={[
                      // Short labels: the segmented control lays its options
                      // out with whitespace-nowrap, and at 390px the long
                      // wording forced the whole grid to 472px wide.
                      { value: "LONG", label: "Achat" },
                      { value: "SHORT", label: "Vente" },
                    ]}
                    value={direction}
                    onChange={(v) => {
                      // Changing direction invalidates levels that were
                      // computed for the other side.
                      levelsFromPlan.current = false;
                      setDirection(v);
                    }}
                    aria-label="Sens de la position"
                  />
                  <Text size="caption" className="mt-2">
                    {direction === "LONG"
                      ? "Vous pariez sur la hausse."
                      : "Vous pariez sur la baisse."}
                  </Text>
                </div>
              </div>
            </Panel>

            <Panel
              title="Où ça s'arrête"
              hint="Décidé maintenant, pas pendant. C'est tout l'intérêt."
            >
              <div className="space-y-5">
                <Checkbox checked={useSL} onChange={setUseSL}>
                  Stop de protection
                </Checkbox>
                {useSL && (
                  <Field label="Prix du stop" htmlFor="tr-sl">
                    <TextInput
                      id="tr-sl"
                      value={stopLoss?.toString() ?? ""}
                      onChange={(v) => {
                        levelsTouched.current = true;
                        levelsFromPlan.current = false;
                        setStopLoss(v === "" ? null : Number(v));
                      }}
                      placeholder="0.00"
                    />
                  </Field>
                )}

                <Checkbox checked={useTP} onChange={setUseTP}>
                  Objectif de gain
                </Checkbox>
                {useTP && (
                  <Field label="Prix de l'objectif" htmlFor="tr-tp">
                    <TextInput
                      id="tr-tp"
                      value={takeProfit?.toString() ?? ""}
                      onChange={(v) => {
                        levelsTouched.current = true;
                        levelsFromPlan.current = false;
                        setTakeProfit(v === "" ? null : Number(v));
                      }}
                      placeholder="0.00"
                    />
                  </Field>
                )}
              </div>
            </Panel>
          </div>

          {/* ── Right: the size, derived ────────────────────────────────── */}
          <div className="min-w-0 space-y-5">
            <Panel
              title="Combien engager"
              hint={
                sizingOn
                  ? "La taille se déduit du risque accepté et de la distance au stop."
                  : "Montant libre. Le risque réel est indiqué en dessous."
              }
            >
              <div className="space-y-5">
                <Checkbox checked={sizingOn} onChange={setSizingOn}>
                  Calculer la taille à partir de mon risque
                </Checkbox>

                {sizingOn && (
                  <div>
                    <span className="mb-2 block text-[0.85rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                      Risque accepté
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {RISK_PRESETS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { amountTouched.current = false; setRiskPct(r); }}
                          className="rounded-[9px] px-3 py-2 text-[0.85rem] transition-colors"
                          style={
                            riskPct === r
                              ? { backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }
                              : { color: "var(--cap-ink-2)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }
                          }
                        >
                          {r} %
                        </button>
                      ))}
                    </div>
                    {balance && (
                      <Text size="caption" className="mt-2.5">
                        {riskPct} % de {money(balance.balance)} = {money(riskBudget)}
                        {suggested != null && <> → taille suggérée {money(suggested)}</>}
                      </Text>
                    )}
                  </div>
                )}

                <Field label="Montant" htmlFor="tr-amount">
                  <TextInput
                    id="tr-amount"
                    value={String(amount)}
                    onChange={(v) => {
                      amountTouched.current = true;
                      setAmount(Number(v) || 0);
                    }}
                  />
                </Field>

                <Field label="Levier" htmlFor="tr-lev" hint="x1 = aucun levier.">
                  <TextInput
                    id="tr-lev"
                    value={String(leverage)}
                    onChange={(v) => {
                      leverageTouched.current = true;
                      setLeverage(Math.max(1, Number(v) || 1));
                    }}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Ce que ça engage">
              <dl className="space-y-3">
                <Line label="Quantité" value={price > 0 ? quantity.toFixed(4) : "—"} />
                <Line label="Exposition" value={money(amount * leverage)} />
                <Line
                  label="Risque si le stop est touché"
                  value={
                    actualRisk != null
                      ? `${money(actualRisk)}${actualRiskPct != null ? ` · ${actualRiskPct.toFixed(1)} %` : ""}`
                      : "non défini"
                  }
                  tone={riskTone}
                />
                {balance && <Line label="Solde disponible" value={money(balance.balance)} />}
              </dl>

              {actualRiskPct != null && actualRiskPct > 5 && (
                <div className="mt-4">
                  <Text size="caption" tone="down">
                    Plus de 5 % du capital sur une seule position. C&apos;est
                    beaucoup — même en virtuel, l&apos;habitude se prend ici.
                  </Text>
                </div>
              )}
            </Panel>

            {error && <FormError>{error}</FormError>}
            {success && (
              <div
                className="px-3.5 py-3 text-[0.85rem]"
                style={{
                  borderRadius: "var(--cap-r-md)",
                  backgroundColor: "rgba(23,138,88,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(23,138,88,0.25)",
                  color: "var(--cap-up)",
                }}
              >
                {success}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting || !quote || price <= 0}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ouverture…
                </>
              ) : (
                `Ouvrir la position ${direction === "LONG" ? "à l'achat" : "à la vente"}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function Line({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "muted" | "down";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>{label}</dt>
      <dd>
        <Num tone={tone} className="text-[0.9rem]">{value}</Num>
      </dd>
    </div>
  );
}
