"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import {
  marketAPI, missionsAPI, walletAPI,
  type DevisTurbo, type Quote, type WalletBalance,
} from "@/lib/api";
import { annoncerReussite } from "@/lib/reussite";
// `fr` : la virgule décimale. « 0.4 % » et « 6.6689 » dans un écran français
// sont la faute qui revient le plus souvent dès qu'un nombre est affiché.
import { fr, useSettings, convertCurrency, useFormatAssetPrice, BROKER_PRESETS } from "@/lib/SettingsContext";
import {
  Button, Checkbox, Field, FormError, Heading, Nimbo, Num, Panel, SegmentedControl,
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
const TURBO_LEVIER_MINI = 1.5;
const TURBO_LEVIER_MAXI = 50;

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

  // ── Le produit : CFD (montant × levier) ou turbo (titres entiers) ────────
  // Repris du courtier enregistré dans les réglages, modifiable à chaque trade.
  const [produit, setProduit] = useState<"cfd" | "turbo">("cfd");
  const produitTouched = useRef(false);
  const [unites, setUnites] = useState(0);
  const unitesTouched = useRef(false);
  const [devis, setDevis] = useState<DevisTurbo | null>(null);
  const [devisError, setDevisError] = useState("");
  const turbo = produit === "turbo";
  const fraisOrdre = Number(settings.orderFee) || 0;
  // Le levier d'un turbo vient de sa barrière : sous ×1,5 il n'y a pas de
  // produit, et le levier ×1 d'un achat comptant n'a pas d'équivalent.
  const levierTurbo = Math.min(TURBO_LEVIER_MAXI, Math.max(TURBO_LEVIER_MINI, leverage));
  const levierEffectif = turbo ? levierTurbo : leverage;

  useEffect(() => {
    if (isLoaded && !produitTouched.current) setProduit(settings.orderMode);
  }, [isLoaded, settings.orderMode]);

  // Un turbo ×1 n'existe pas : le levier par défaut d'un achat comptant est
  // remplacé par ×5 en passant au turbo — jamais pendant la saisie.
  useEffect(() => {
    if (turbo) setLeverage((l) => (l < TURBO_LEVIER_MINI ? 5 : l));
    else setLeverage((l) => Math.max(1, Math.round(l)));
  }, [turbo]);

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
    ? Math.max(10, Math.min(balance.balance, Math.round(riskBudget / (stopDistance * levierEffectif))))
    : null;

  useEffect(() => {
    if (sizingOn && !amountTouched.current && suggested) setAmount(suggested);
  }, [sizingOn, suggested]);


  // Le turbo proposé au cours du moment. Le serveur le recalcule à
  // l'exécution : entre les deux, le cours a pu bouger, comme en vrai.
  useEffect(() => {
    if (!turbo || !quote || price <= 0) { setDevis(null); return; }
    let vivant = true;
    const t = setTimeout(() => {
      walletAPI.devisTurbo({ symbol: symbol.toUpperCase(), direction, levier: levierTurbo, montant: 0 })
        .then((d) => { if (vivant) { setDevis(d); setDevisError(""); } })
        .catch((e) => { if (vivant) { setDevis(null); setDevisError(e instanceof Error ? e.message : "Turbo indisponible."); } });
    }, 400);
    return () => { vivant = false; clearTimeout(t); };
  }, [turbo, quote, price, symbol, direction, levierTurbo]);

  const prixTitre = devis?.prix_titre ?? 0;
  // Le budget donne le nombre de titres, tant que l'utilisateur n'a pas tapé
  // lui-même un nombre de titres.
  useEffect(() => {
    if (turbo && prixTitre > 0 && !unitesTouched.current) {
      setUnites(Math.max(0, Math.floor(amount / prixTitre + 1e-9)));
    }
  }, [turbo, prixTitre, amount]);

  const coutTitres = Math.round(unites * prixTitre * 100) / 100;
  const exposition = turbo ? unites * (devis?.parite ?? 0) * price : amount * leverage;
  const totalDebite = (turbo ? coutTitres : amount) + fraisOrdre;
  const quantity = turbo
    ? unites * (devis?.parite ?? 0)
    : price > 0 ? (amount * leverage) / price : 0;
  const risqueStop = stopDistance != null && price > 0
    ? quantity * price * stopDistance + fraisOrdre * 2 + (turbo ? unites * (devis?.ecart_titre ?? 0) : 0)
    : null;
  const risqueStopPct = risqueStop != null && balance?.balance ? (risqueStop / balance.balance) * 100 : null;
  const stopSousBarriere = turbo && devis && useSL && stopLoss != null && (
    direction === "LONG" ? stopLoss <= devis.barriere : stopLoss >= devis.barriere
  );

  /**
   * Le cours auquel la marge est entièrement consommée.
   *
   * C'est la seule chose que le levier fait réellement, et l'écran ne la
   * disait nulle part : on lisait « exposition 20 000 € » sans jamais lire
   * « à 132,12 € vous avez tout perdu ». Le calcul est celui du serveur —
   * un mouvement de 1 ÷ levier contre soi — pour qu'un seul nombre circule.
   */
  const liquidation = turbo
    ? devis?.barriere ?? null
    : leverage > 1 && price > 0
      ? (direction === "LONG" ? price - price / leverage : price + price / leverage)
      : null;

  // Un COURS, pas une somme : sur un actif à 0,34 €, deux décimales
  // affichent la même valeur avant et après un mouvement réel.
  const assetPrice = useFormatAssetPrice();

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  /** Le prix d'un titre : au millième sous 1 €, sinon « 0,055 € » s'affiche 0,06 €. */
  const moneyTitre = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        minimumFractionDigits: v < 1 ? 3 : 2,
        maximumFractionDigits: v < 1 ? 3 : 2,
      }),
    [settings.currency, eurUsd]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote || price <= 0) return setError(quoteError || "Choisissez un actif valide.");
    if (totalDebite > (balance?.balance ?? 0)) return setError("Solde insuffisant.");
    if (turbo) {
      if (!devis) return setError(devisError || "Le turbo n'est pas encore calculé.");
      if (unites < 1) return setError(`Il faut au moins un titre (${moneyTitre(prixTitre)} l'unité).`);
      if (stopSousBarriere) return setError("Ce stop est au-delà de la barrière : le turbo serait désactivé avant.");
    } else if (amount < 10) return setError("Le montant minimum est de 10 €.");

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const r = await walletAPI.openPosition({
        symbol: symbol.toUpperCase(),
        direction,
        amount: turbo ? coutTitres : amount,
        leverage: turbo ? levierTurbo : leverage,
        instrument: produit,
        unites: turbo ? unites : undefined,
        take_profit: useTP ? takeProfit ?? undefined : undefined,
        stop_loss: useSL ? stopLoss ?? undefined : undefined,
      });
      const fait = turbo && r.turbo
        ? `${r.turbo.unites} titres achetés à ${moneyTitre(r.turbo.prix_titre)}${r.frais ? `, plus ${money(r.frais)} de frais` : ""}.`
        : `Position ouverte à ${money(r.entry_price || price)}.`;
      setSuccess(fait);
      // Le message de la page disparaît avec la redirection vers le
      // portefeuille ; celui de Nimbo la suit.
      annoncerReussite({
        titre: `${direction === "SHORT" ? "Vente" : "Achat"} ${symbol.toUpperCase()} en place`,
        detail: fait,
      });
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
    if (risqueStopPct == null) return "muted" as const;
    if (risqueStopPct > 5) return "down" as const;
    return "ink" as const;
  }, [risqueStopPct]);

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
              {/* Un prix passé par l'URL arrive en nombre brut : rendu tel
                  quel, il s'écrit « 156.2 » au milieu d'une phrase française.
                  Le formateur des cours le rend dans l'unité de l'écran. */}
              {planSl != null && <> · stop à <Num>{assetPrice(planSl)}</Num></>}
              {planTp != null && <> · objectif à <Num>{assetPrice(planTp)}</Num></>}
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
                    <SaisieNombre
                      id="tr-sl"
                      value={stopLoss}
                      decimales={8}
                      onChange={(n) => {
                        levelsTouched.current = true;
                        levelsFromPlan.current = false;
                        setStopLoss(n);
                      }}
                    />
                  </Field>
                )}

                <Checkbox checked={useTP} onChange={setUseTP}>
                  Objectif de gain
                </Checkbox>
                {useTP && (
                  <Field label="Prix de l'objectif" htmlFor="tr-tp">
                    <SaisieNombre
                      id="tr-tp"
                      value={takeProfit}
                      decimales={8}
                      onChange={(n) => {
                        levelsTouched.current = true;
                        levelsFromPlan.current = false;
                        setTakeProfit(n);
                      }}
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
                <div>
                  <span className="mb-1.5 block text-[0.85rem] font-medium" style={{ color: "var(--cap-ink)" }}>
                    Produit
                  </span>
                  <SegmentedControl
                    options={[
                      { value: "cfd", label: "Montant × levier" },
                      { value: "turbo", label: "Turbo" },
                    ]}
                    value={produit}
                    onChange={(v) => {
                      produitTouched.current = true;
                      setProduit(v as "cfd" | "turbo");
                    }}
                    aria-label="Produit"
                  />
                  <Text size="caption" className="mt-2">
                    {turbo
                      ? "Des titres entiers d'un produit à barrière, comme chez Trade Republic ou Boursorama."
                      : "Une somme multipliée par le levier, comme un CFD."}
                    {settings.broker !== "none" && <> · {BROKER_PRESETS[settings.broker].label}</>}
                    {fraisOrdre > 0 && <>, {money(fraisOrdre)} par ordre</>}
                    {" · "}
                    <Link href="/settings?section=trading" className="underline underline-offset-2">Mon courtier</Link>
                  </Text>
                </div>

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

                <Field label={turbo ? "Budget" : "Montant"} htmlFor="tr-amount"
                  hint={turbo ? "Converti en nombre entier de titres." : undefined}>
                  <SaisieNombre
                    id="tr-amount"
                    value={amount}
                    decimales={2}
                    onChange={(n) => {
                      amountTouched.current = true;
                      unitesTouched.current = false;
                      setAmount(n ?? 0);
                    }}
                  />
                </Field>

                <Field
                  label={turbo ? "Levier du turbo" : "Levier"}
                  htmlFor="tr-lev"
                  hint={turbo
                    ? `De ×${fr(TURBO_LEVIER_MINI, 1)} à ×${TURBO_LEVIER_MAXI}. Il fixe la barrière.`
                    : "Nombre entier, x1 = aucun levier."}
                >
                  <SaisieNombre
                    id="tr-lev"
                    value={leverage}
                    decimales={turbo ? 2 : 0}
                    onChange={(n) => {
                      leverageTouched.current = true;
                      if (n != null && n > 0) setLeverage(n);
                    }}
                    // Les bornes s'appliquent quand on quitte le champ, pas
                    // pendant la frappe : taper « 10,02 » passe par « 1 ».
                    onCommit={(n) => {
                      const borne = turbo
                        ? Math.min(TURBO_LEVIER_MAXI, Math.max(TURBO_LEVIER_MINI, n))
                        : Math.min(100, Math.max(1, Math.round(n)));
                      setLeverage(borne);
                      return borne;
                    }}
                  />
                </Field>

                {turbo && (
                  <Field
                    label="Nombre de titres"
                    htmlFor="tr-units"
                    error={devisError || undefined}
                    hint={devis ? `${moneyTitre(prixTitre)} le titre` : "Calcul du turbo…"}
                  >
                    <SaisieNombre
                      id="tr-units"
                      value={unites}
                      decimales={0}
                      onChange={(n) => {
                        unitesTouched.current = true;
                        setUnites(Math.max(0, Math.floor(n ?? 0)));
                      }}
                    />
                  </Field>
                )}
              </div>
            </Panel>

            <Panel title="Ce que ça engage">
              <dl className="space-y-3">
                {turbo ? (
                  <>
                    <Line label="Prix d'un titre" value={devis ? moneyTitre(prixTitre) : "—"} />
                    <Line label="Titres" value={devis ? `${unites} × ${moneyTitre(prixTitre)}` : "—"} />
                    <Line label="Coût des titres" value={money(coutTitres)} />
                  </>
                ) : (
                  <Line label="Quantité" value={price > 0 ? fr(quantity, 4) : "—"} />
                )}
                {fraisOrdre > 0 && <Line label="Frais d'achat" value={money(fraisOrdre)} />}
                {(turbo || fraisOrdre > 0) && <Line label="Total débité" value={money(totalDebite)} />}
                <Line label="Exposition" value={money(exposition)} />
                <Line
                  label="Risque si le stop est touché"
                  value={
                    risqueStop != null && !stopSousBarriere
                      ? `${money(risqueStop)}${risqueStopPct != null ? ` · ${fr(risqueStopPct, 1)} %` : ""}`
                      : stopSousBarriere ? "stop au-delà de la barrière" : "non défini"
                  }
                  tone={stopSousBarriere ? "down" : riskTone}
                />
                {liquidation != null && (
                  <Line
                    // Le signe suit le sens : sur une VENTE, c'est le cours
                    // qui MONTE qui consomme la marge. « Liquidation (−20 %) »
                    // à côté d'un prix supérieur au cours se lit comme une
                    // erreur — et c'en serait une.
                    label={`${turbo ? "Barrière" : "Liquidation"} (${direction === "LONG" ? "−" : "+"}${fr(100 / (turbo ? levierTurbo : leverage), turbo ? 1 : 0)} %)`}
                    value={assetPrice(liquidation)}
                    tone="down"
                  />
                )}
                {balance && <Line label="Solde disponible" value={money(balance.balance)} />}
              </dl>

              {turbo && liquidation != null && (
                <div className="mt-4">
                  <Text size="caption">
                    Si le cours touche la barrière, le turbo est désactivé : les{" "}
                    {money(coutTitres)} de titres ne valent plus rien, et il n&apos;y a
                    rien à vendre. Vous ne pouvez pas perdre plus que ce que vous avez payé.
                    {devis && devis.parite < 1 && (
                      <> Parité {devis.parite.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} :
                        il faut {Math.round(1 / devis.parite).toLocaleString("fr-FR")} titres pour suivre
                        une unité de {symbol.toUpperCase()}.</>
                    )}
                  </Text>
                </div>
              )}

              {!turbo && liquidation != null && (
                <div className="mt-4">
                  <Text size="caption">
                    À ce cours, la totalité des {money(amount)} engagés est perdue et la
                    position est fermée d&apos;office — c&apos;est ce qu&apos;un courtier
                    appelle un appel de marge. Un stop placé au-delà ne servirait à rien :
                    il ne serait jamais atteint.
                  </Text>
                </div>
              )}

              {risqueStopPct != null && risqueStopPct > 5 && (
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
                role="status"
                className="px-3 py-2.5 text-[0.85rem]"
                style={{
                  borderRadius: "var(--cap-r-md)",
                  backgroundColor: "rgba(23,138,88,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(23,138,88,0.25)",
                  color: "var(--cap-up)",
                }}
              >
                <span className="flex items-center gap-3">
                  <Nimbo humeur="fete" taille={48} />
                  <span>
                    <span className="block font-semibold">Bravo, c&apos;est fait !</span>
                    {success} Direction le portefeuille…
                  </span>
                </span>
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
                turbo
                  ? `Acheter ${unites} titre${unites > 1 ? "s" : ""} · turbo ${direction === "LONG" ? "long" : "short"}`
                  : `Ouvrir la position ${direction === "LONG" ? "à l'achat" : "à la vente"}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

/**
 * Un champ numérique qui garde ce qu'on tape.
 *
 * Relié directement au nombre, le champ se réécrivait à chaque touche :
 * « 10, » redevenait « 10 » et la virgule disparaissait, si bien qu'on ne
 * pouvait pas saisir 10,02. Le texte vit donc à part ; le nombre suit dès
 * qu'il est lisible, et le champ n'est remis au propre qu'en le quittant.
 */
function SaisieNombre({
  id,
  value,
  onChange,
  onCommit,
  decimales,
}: {
  id: string;
  /** null = champ vide (un stop pas encore saisi). */
  value: number | null;
  onChange: (n: number | null) => void;
  /** Appelé en quittant le champ ; rend la valeur retenue (bornée). */
  onCommit?: (n: number) => number;
  decimales: number;
}) {
  const ecrire = (n: number | null) =>
    n == null ? "" : n.toLocaleString("fr-FR", { maximumFractionDigits: decimales, useGrouping: false });
  const [texte, setTexte] = useState(() => ecrire(value));
  const enSaisie = useRef(false);

  useEffect(() => {
    if (!enSaisie.current) setTexte(ecrire(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimales]);

  const lire = (t: string) => {
    const n = Number(t.replace(/\s/g, "").replace(",", "."));
    return t.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
  };

  return (
    <div
      onFocus={() => { enSaisie.current = true; }}
      onBlur={() => {
        enSaisie.current = false;
        const n = lire(texte) ?? value;
        const retenu = onCommit && n != null ? onCommit(n) : n;
        setTexte(ecrire(retenu));
      }}
    >
      <TextInput
        id={id}
        value={texte}
        onChange={(t) => {
          // Chiffres, une virgule ou un point : le reste est ignoré.
          if (!/^[\d\s]*[.,]?\d*$/.test(t)) return;
          setTexte(t);
          const n = lire(t);
          if (n != null) onChange(n);
          else if (t.trim() === "") onChange(null);
        }}
      />
    </div>
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
      <dd className="shrink-0 whitespace-nowrap">
        <Num tone={tone} className="text-[0.9rem]">{value}</Num>
      </dd>
    </div>
  );
}
