"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Search, Star } from "lucide-react";
import {
  analysisAPI, favoritesAPI, marketAPI,
  type Analysis, type ChartData,
} from "@/lib/api";
import { useSettings, convertCurrency } from "@/lib/SettingsContext";
import { useTradingStyle } from "@/lib/tradingStyle";
import { useUserLevel } from "@/hooks/useUserLevel";
import {
  buildReasons, directionLabel, edgeSentence, scenarioSentence,
} from "@/lib/explain";
import { lessonFor, lessonHref } from "@/lib/lessonLinks";
import {
  Button, CloudCurtain, EmptyState, FormError, Heading, Num, Panel, Progress,
  ScoreDial, SegmentedControl, Text, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";
import { PriceChart, type Level } from "@/components/analysis/PriceChart";
import { FactorBars, LevelScale } from "@/components/analysis/Gauges";

/**
 * The analysis screen — rebuilt around progressive depth.
 *
 * Three levels, and the reader chooses:
 *
 *   Découverte     direction, score, and why, in sentences
 *   Intermédiaire  the factors behind the score, the risk plan, the levels
 *   Avancé         the raw indicators, the historical edge, the fundamentals
 *
 * The previous screen was 6 194 lines and showed all of it at once, across
 * eight tabs. Everything was reachable and nothing was ranked, so a beginner
 * met forty numbers and an expert had to hunt through explanations. The depth
 * has not been removed — it has been ordered.
 *
 * Two rules the old screen broke and this one keeps:
 *
 *   * a contradiction between factors is stated, not smoothed over. "Il dit de
 *     vendre alors que l'EMA dit l'inverse" was a real user complaint, and the
 *     answer is to name the disagreement;
 *   * the historical edge is shown next to the verdict, including when it is
 *     negative. A verdict the engine's own backtest does not support is
 *     something the reader is entitled to know.
 */

type Depth = "discover" | "intermediate" | "advanced";

const DEPTHS: { value: Depth; label: string }[] = [
  { value: "discover", label: "Découverte" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

export default function AnalysisPage() {
  return (
    <Suspense fallback={<CloudCurtain active label="Chargement" />}>
      <AnalysisScreen />
    </Suspense>
  );
}

function AnalysisScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { settings, eurUsd } = useSettings();
  const style = useTradingStyle();
  const [animOn] = useAnimationsEnabled();

  const urlSymbol = (params.get("symbol") || "").toUpperCase();
  const [symbol, setSymbol] = useState(urlSymbol);
  const [query, setQuery] = useState(urlSymbol);
  const [timeframe, setTimeframe] = useState(style.defaultTimeframe);

  /**
   * La profondeur d'ouverture suit le niveau déclaré.
   *
   * L'écran s'ouvrait toujours sur « Découverte », quel que soit le profil :
   * un utilisateur qui s'était déclaré expert devait redescendre deux crans à
   * chaque actif consulté. Les Marchés lisaient déjà le niveau, pas l'Analyse
   * — et l'écran des paramètres promet noir sur blanc que le niveau expert
   * déplie les indicateurs par défaut. Une promesse faite dans les réglages
   * est une promesse à tenir dans l'écran.
   *
   * Le choix manuel reste souverain : dès que l'utilisateur touche au
   * contrôle, le niveau ne le réécrit plus.
   */
  const level = useUserLevel();
  const levelDepth: Depth =
    level.level === "expert" ? "advanced"
    : level.level === "intermediate" ? "intermediate"
    : "discover";
  const [depth, setDepth] = useState<Depth>(levelDepth);
  const [depthTouched, setDepthTouched] = useState(false);
  useEffect(() => {
    if (!depthTouched) setDepth(levelDepth);
  }, [levelDepth, depthTouched]);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    favoritesAPI.getFavorites()
      .then((d) => setFavorites(new Set((d.favorites || []).map((f) => f.symbol))))
      .catch(() => {});
  }, []);

  const run = useCallback(async (sym: string, tf: string) => {
    if (!sym) return;
    setLoading(true);
    setError("");
    try {
      // The profile drives the stop, the target and the weight given to
      // fundamentals, so the plan shown here is the plan the backtest
      // validated and the one the trading screen will receive.
      const a = await analysisAPI.analyze(sym, tf, style.atr.sl, style.atr.tp, style.fundWeight);
      setAnalysis(a);
      // The chart is secondary: a failure here must not lose the analysis.
      marketAPI.getChart(sym, "3mo", tf === "1mo" ? "1wk" : "1d")
        .then(setChart)
        .catch(() => setChart(null));
    } catch (err) {
      setAnalysis(null);
      setError(err instanceof Error ? err.message : "Analyse impossible.");
    } finally {
      setLoading(false);
    }
  }, [style.atr.sl, style.atr.tp, style.fundWeight]);

  useEffect(() => {
    if (symbol) run(symbol, timeframe);
  }, [symbol, timeframe, run]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = query.trim().toUpperCase();
    if (!s) return;
    setSymbol(s);
    router.replace(`/analysis?symbol=${encodeURIComponent(s)}`);
  };

  const toggleFavorite = async () => {
    if (!symbol) return;
    const has = favorites.has(symbol);
    setFavorites((f) => {
      const n = new Set(f);
      has ? n.delete(symbol) : n.add(symbol);
      return n;
    });
    try {
      has ? await favoritesAPI.removeFavorite(symbol) : await favoritesAPI.addFavorite(symbol);
    } catch {
      setFavorites((f) => {
        const n = new Set(f);
        has ? n.add(symbol) : n.delete(symbol);
        return n;
      });
    }
  };

  const money = useCallback(
    (v: number) =>
      convertCurrency(v, "EUR", settings.currency, eurUsd).toLocaleString("fr-FR", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 2,
      }),
    [settings.currency, eurUsd]
  );

  return (
    <>
      <WeatherBackdrop
        condition={analysis ? (analysis.price.change >= 0 ? "fair" : "overcast") : "cloudy"}
        enabled={animOn}
      />

      <div className="relative space-y-6">
        <header className="pt-2">
          <Heading level={1}>Analyse</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            Un actif, un verdict, et la raison du verdict — au niveau de détail
            que vous choisissez.
          </Text>
        </header>

        <Panel>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--cap-ink-4)" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                placeholder="AAPL, BTC-USD, MC.PA…"
                aria-label="Actif à analyser"
                className="h-12 w-full rounded-[12px] pl-10 pr-3.5 text-[0.95rem] outline-none placeholder:text-[color:var(--cap-ink-4)]"
                style={{
                  backgroundColor: "var(--cap-bg)",
                  color: "var(--cap-ink)",
                  boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
                }}
              />
            </div>
            <Button type="submit" size="md" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyser"}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SegmentedControl
              size="sm"
              options={style.timeframes.map((t) => ({ value: t, label: t }))}
              value={timeframe}
              onChange={setTimeframe}
              aria-label="Horizon"
            />
            <Text size="caption" as="span">
              Horizon {style.label.fr.toLowerCase()} — {style.horizon.fr.toLowerCase()}
            </Text>
          </div>
        </Panel>

        {error && <FormError>{error}</FormError>}

        {loading && !analysis && <CloudCurtain active label={`Analyse de ${symbol}`} />}

        {!symbol && !loading && (
          <Panel>
            <EmptyState
              title="Choisissez un actif"
              description="Commencez par une entreprise que vous connaissez — comprendre l'analyse compte plus que le choix de l'actif."
              action={{ label: "Analyser Apple", onClick: () => { setQuery("AAPL"); setSymbol("AAPL"); } }}
            />
          </Panel>
        )}

        {analysis && (
          <>
            <Verdict
              analysis={analysis}
              money={money}
              isFavorite={favorites.has(symbol)}
              onToggleFavorite={toggleFavorite}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Heading level={3} as="h2">Aller plus loin</Heading>
              <SegmentedControl
                size="sm"
                options={DEPTHS}
                value={depth}
                onChange={(d) => { setDepth(d); setDepthTouched(true); }}
                aria-label="Niveau de détail"
              />
            </div>

            {chart && chart.data?.length > 1 && (
              <Panel
                title="Le prix"
                hint={`${chart.data.length} points · ${chart.interval}`}
              >
                <PriceChart
                  closes={chart.data.map((c) => c.close)}
                  levels={chartLevels(analysis, depth)}
                />
              </Panel>
            )}

            {depth !== "discover" && <Intermediate analysis={analysis} money={money} />}
            {depth === "advanced" && <Advanced analysis={analysis} money={money} />}
          </>
        )}
      </div>
    </>
  );
}

/* ── Level 1 : the verdict ────────────────────────────────────────────────── */

function Verdict({
  analysis: a,
  money,
  isFavorite,
  onToggleFavorite,
}: {
  analysis: Analysis;
  money: (v: number) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const dir = directionLabel(a);
  const reasons = useMemo(() => buildReasons(a), [a]);
  const edge = useMemo(() => edgeSentence(a), [a]);
  const scenario = useMemo(() => scenarioSentence(a), [a]);

  const planHref =
    `/trading?symbol=${encodeURIComponent(a.symbol)}` +
    `&direction=${a.risk?.direction ?? (dir.tone === "down" ? "SHORT" : "LONG")}` +
    (a.risk?.suggested_sl ? `&sl=${a.risk.suggested_sl}` : "") +
    (a.risk?.suggested_tp ? `&tp=${a.risk.suggested_tp}` : "") +
    "&from=analysis";

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[1.4rem] font-semibold tracking-[-0.02em]"
              style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
            >
              {a.company?.name || a.symbol}
            </span>
            <span className="text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
              {a.symbol}
            </span>
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Ne plus suivre" : "Suivre cet actif"}
              className="rounded-[8px] p-1.5 transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{ color: isFavorite ? "var(--cap-amber)" : "var(--cap-ink-4)" }}
            >
              <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-2.5 flex items-baseline gap-3">
            <Num className="text-[1.8rem] font-medium">{money(a.price.current)}</Num>
            <Num tone={a.price.change >= 0 ? "up" : "down"} className="text-[0.95rem]">
              {a.price.change >= 0 ? "+" : ""}{a.price.change.toFixed(2)} %
            </Num>
          </div>

          <div className="mt-4">
            <span className="text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
              Direction
            </span>
            <div
              className="mt-1 text-[1.25rem] font-semibold"
              style={{
                fontFamily: "var(--cap-font-display)",
                color: dir.tone === "up" ? "var(--cap-up)"
                  : dir.tone === "down" ? "var(--cap-down)" : "var(--cap-ink-2)",
              }}
            >
              {dir.text}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <ScoreDial score={Math.round(a.score.total)} size={124} />
        </div>
      </div>

      {/* The why. The part the product exists for. */}
      <div className="mt-7 border-t pt-6" style={{ borderColor: "var(--cap-line)" }}>
        <span className="text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
          Pourquoi
        </span>
        <ul className="mt-4 space-y-2.5">
          {reasons.map((r) => (
            <li key={r.text} className="flex gap-3">
              <span
                aria-hidden
                className="mt-[0.55rem] h-px w-3 shrink-0"
                style={{
                  backgroundColor:
                    r.tone === "up" ? "var(--cap-up)"
                    : r.tone === "down" ? "var(--cap-down)"
                    : r.tone === "warn" ? "var(--cap-amber)"
                    : "var(--cap-ocean)",
                }}
              />
              <Text size="small" tone="ink" as="span">{r.text}</Text>
            </li>
          ))}
        </ul>
      </div>

      {/* What the engine's own history says — including when it disagrees. */}
      {(edge || scenario) && (
        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
          <span className="text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
            Ce que dit l&apos;historique
          </span>
          {edge && (
            <Text
              size="small"
              tone={edge.tone === "down" ? "down" : edge.tone === "up" ? "up" : "ink"}
              className="mt-3"
            >
              {edge.text}
            </Text>
          )}
          {scenario && <Text size="small" className="mt-2">{scenario}</Text>}
        </div>
      )}

      {a.risk?.suggested_sl != null && a.risk?.suggested_tp != null && (
        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5"
          style={{ borderColor: "var(--cap-line)" }}
        >
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <RiskBit label="Stop" value={money(a.risk.suggested_sl)} tone="down" />
            <RiskBit label="Objectif" value={money(a.risk.suggested_tp)} tone="up" />
            <RiskBit label="Risque / rendement" value={`1 : ${a.risk.risk_reward.toFixed(1)}`} />
          </div>
          <Button href={planHref} size="md">
            Ouvrir avec ce plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Panel>
  );
}

function RiskBit({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "up" | "down";
}) {
  return (
    <div>
      <span className="block text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>{label}</span>
      <Num tone={tone} className="mt-0.5 block text-[0.95rem]">{value}</Num>
    </div>
  );
}

/* ── Level 2 : the factors ────────────────────────────────────────────────── */

function Intermediate({ analysis: a, money }: { analysis: Analysis; money: (v: number) => string }) {
  const subs = [
    { label: "Technique", value: a.score.technical },
    { label: "Volume", value: a.score.volume },
    { label: "Momentum", value: a.score.momentum },
    ...(a.score.fundamental != null ? [{ label: "Fondamentaux", value: a.score.fundamental }] : []),
  ].filter((s) => Number.isFinite(s.value));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Le détail du score" hint="Chaque famille, notée sur 100.">
        <div className="space-y-5">
          {subs.map((s, i) => (
            <Progress key={s.label} label={s.label} value={s.value} delay={i * 0.06} />
          ))}
        </div>
        {a.score.confidence != null && (
          <Text size="caption" className="mt-5">
            Confiance dans les données : {Math.round(a.score.confidence)} %
          </Text>
        )}
      </Panel>

      <Panel title="Où se situe le prix" hint={levelWindowLabel(a)}>
        <LevelScale
          support={a.levels.support}
          resistance={a.levels.resistance}
          price={a.price.current}
          pivot={a.levels.pivot}
          format={money}
        />
        {a.higher_timeframe?.interval && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            <Text size="small">
              Unité de temps supérieure ({a.higher_timeframe.interval}) :{" "}
              <strong style={{ color: "var(--cap-ink)" }}>
                {a.higher_timeframe.trend === "BULLISH" ? "haussière"
                  : a.higher_timeframe.trend === "BEARISH" ? "baissière" : "neutre"}
              </strong>
              {a.higher_timeframe.aligned === false && " — en désaccord avec l'horizon affiché."}
            </Text>
          </div>
        )}
      </Panel>

      {a.market_context && a.market_context.regime !== "UNKNOWN" && (
        <Panel title="Le contexte de marché">
          <dl className="space-y-3">
            <Row label="Référence" value={a.market_context.benchmark} />
            <Row
              label="Régime"
              value={
                a.market_context.regime === "BULL" ? "Haussier"
                : a.market_context.regime === "BEAR" ? "Baissier" : "Neutre"
              }
              tone={a.market_context.regime === "BULL" ? "up" : a.market_context.regime === "BEAR" ? "down" : "ink"}
            />
            {a.market_context.relative_strength != null && (
              <Row
                label="Force relative (20 périodes)"
                value={`${a.market_context.relative_strength >= 0 ? "+" : ""}${a.market_context.relative_strength.toFixed(1)} pts`}
                tone={a.market_context.relative_strength >= 0 ? "up" : "down"}
              />
            )}
            {a.market_context.correlation != null && (
              <Row label="Corrélation" value={a.market_context.correlation.toFixed(2)} />
            )}
          </dl>
        </Panel>
      )}

      {a.factor_directions && Object.keys(a.factor_directions).length > 0 && (
        <Panel
          title="Ce que dit chaque famille"
          hint="Quatre familles indépendantes. Quand elles divergent, le verdict est moins sûr."
        >
          <FactorBars directions={a.factor_directions} />
        </Panel>
      )}
    </div>
  );
}

/* ── Level 3 : the raw material ───────────────────────────────────────────── */

function Advanced({ analysis: a, money }: { analysis: Analysis; money: (v: number) => string }) {
  const ind = a.indicators;
  const f = a.fundamentals;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Les indicateurs"
        hint="Chacun avec ce qu'il dit, pas seulement ce qu'il vaut."
      >
        <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
          <Indicator
            name="RSI"
            value={ind.rsi.value.toFixed(1)}
            meaning={
              ind.rsi.value >= 70 ? "Au-dessus de 70 : l'actif a beaucoup monté vite, un repli est fréquent."
              : ind.rsi.value <= 30 ? "Sous 30 : l'actif a beaucoup baissé vite, un rebond est fréquent."
              : "Entre 30 et 70 : ni suracheté ni survendu."
            }
          />
          <Indicator
            name="MACD"
            value={ind.macd.histogram.toFixed(4)}
            tone={ind.macd.histogram >= 0 ? "up" : "down"}
            meaning={
              ind.macd.histogram >= 0
                ? "L'histogramme est positif : la dynamique courte dépasse la dynamique longue."
                : "L'histogramme est négatif : la dynamique courte passe sous la longue."
            }
          />
          <Indicator
            name="Moyennes mobiles"
            value={`${money(ind.ema.ema20)} / ${money(ind.ema.ema50)}${ind.ema.ema200 != null ? ` / ${money(ind.ema.ema200)}` : ""}`}
            meaning={
              ind.ema.ema20 > ind.ema.ema50
                ? "La moyenne courte est au-dessus de la longue : structure haussière."
                : "La moyenne courte est sous la longue : structure baissière."
            }
          />
          {ind.adx && (
            <Indicator
              name="ADX"
              value={ind.adx.value.toFixed(1)}
              meaning={
                ind.adx.value >= 25
                  ? "Au-dessus de 25 : il y a une vraie tendance, dans un sens ou dans l'autre."
                  : "Sous 25 : pas de tendance nette — le prix oscille."
              }
            />
          )}
          <Indicator
            name="ATR"
            value={ind.atr.toFixed(4)}
            meaning="L'amplitude moyenne d'une bougie. C'est ce qui dimensionne le stop : trop près, il saute sur du bruit."
          />
          <Indicator
            name="Volume"
            value={`${ind.volume_ratio.toFixed(2)}×`}
            tone={ind.volume_ratio >= 1.2 ? "up" : ind.volume_ratio <= 0.7 ? "down" : "ink"}
            meaning={
              ind.volume_ratio >= 1.2 ? "Au-dessus de la moyenne : le mouvement est soutenu par les échanges."
              : ind.volume_ratio <= 0.7 ? "Sous la moyenne : peu de participants derrière ce mouvement."
              : "Dans la moyenne."
            }
          />
          <Indicator
            name="Bandes de Bollinger"
            value={`${money(ind.bollinger.lower)} — ${money(ind.bollinger.upper)}`}
            meaning="L'enveloppe dans laquelle le prix évolue habituellement. Des bandes resserrées précèdent souvent un mouvement."
          />
          {ind.stochastic && (
            <Indicator
              name="Stochastique"
              value={`${ind.stochastic.k.toFixed(1)} / ${ind.stochastic.d.toFixed(1)}`}
              meaning="Où se situe la clôture dans la fourchette récente. Croisement des deux lignes = signal court terme."
            />
          )}
        </ul>
      </Panel>

      <Panel title="Qualité et méthode" hint="De quoi juger le verdict plutôt que le croire.">
        <dl className="space-y-3">
          {a.engine_version && <Row label="Version du moteur" value={a.engine_version} />}
          {a.risk_multiples && (
            <Row label="Multiples ATR" value={`stop ${a.risk_multiples.sl_atr} · objectif ${a.risk_multiples.tp_atr}`} />
          )}
          {a.volatility_context && (
            <Row
              label="Volatilité"
              value={
                a.volatility_context.percentile != null
                  ? `${Math.round(a.volatility_context.percentile)}ᵉ percentile · ${a.volatility_context.regime}`
                  : a.volatility_context.regime
              }
            />
          )}
          {a.data_quality && (
            <>
              <Row
                label="Dernière bougie"
                value={`${Math.round(a.data_quality.last_bar_age_minutes)} min`}
                tone={a.data_quality.stale ? "down" : "ink"}
              />
              <Row label="Données manquantes" value={`${(a.data_quality.nan_ratio * 100).toFixed(1)} %`} />
            </>
          )}
          {a.signal_quality && <Row label="Qualité du signal" value={`${Math.round(a.signal_quality.score)} / 100`} />}
        </dl>

        {a.signal_quality?.notes && a.signal_quality.notes.length > 0 && (
          <ul className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            {a.signal_quality.notes.map((n) => (
              <li key={n}>
                <Text size="caption" as="span">{n}</Text>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {a.historical_edge?.by_regime && Object.keys(a.historical_edge.by_regime).length > 0 && (
        <Panel
          title="Par régime de marché"
          hint="Chaque cellule avec son nombre de trades — un échantillon de douze n'est pas un échantillon de quarante."
        >
          <dl className="space-y-3">
            {Object.entries(a.historical_edge.by_regime).map(([reg, s]) => (
              <Row
                key={reg}
                label={`${reg} · ${s.n_trades} trades`}
                value={
                  s.enough
                    ? `${s.expectancy_net_r >= 0 ? "+" : ""}${s.expectancy_net_r.toFixed(2)} R · ${s.win_rate.toFixed(0)} %`
                    : "échantillon trop mince"
                }
                tone={s.enough ? (s.expectancy_net_r >= 0 ? "up" : "down") : "ink"}
              />
            ))}
          </dl>
        </Panel>
      )}

      {f && Object.keys(f).length > 0 && (
        <Panel title="Fondamentaux">
          <dl className="space-y-3">
            {f.market_cap != null && <Row label="Capitalisation" value={compact(f.market_cap)} />}
            {f.pe_ratio != null && <Row label="PER" value={f.pe_ratio.toFixed(1)} />}
            {f.forward_pe != null && <Row label="PER prévisionnel" value={f.forward_pe.toFixed(1)} />}
            {f.dividend_yield != null && <Row label="Rendement du dividende" value={`${(f.dividend_yield * 100).toFixed(2)} %`} />}
            {f.profit_margin != null && <Row label="Marge nette" value={`${(f.profit_margin * 100).toFixed(1)} %`} />}
            {f.revenue_growth != null && <Row label="Croissance du CA" value={`${(f.revenue_growth * 100).toFixed(1)} %`} tone={f.revenue_growth >= 0 ? "up" : "down"} />}
            {f.roe != null && <Row label="ROE" value={`${(f.roe * 100).toFixed(1)} %`} />}
            {f.debt_to_equity != null && <Row label="Dette / capitaux propres" value={f.debt_to_equity.toFixed(2)} />}
            {f.beta != null && <Row label="Bêta" value={f.beta.toFixed(2)} />}
          </dl>
        </Panel>
      )}

      {a.performance && (
        <Panel title="Performance">
          <dl className="space-y-3">
            {(["1d", "1w", "1m", "3m", "6m", "ytd"] as const).map((k) =>
              a.performance?.[k] != null ? (
                <Row
                  key={k}
                  label={PERF_LABELS[k]}
                  value={`${a.performance[k]! >= 0 ? "+" : ""}${a.performance[k]!.toFixed(2)} %`}
                  tone={a.performance[k]! >= 0 ? "up" : "down"}
                />
              ) : null
            )}
          </dl>
        </Panel>
      )}
    </div>
  );
}

const PERF_LABELS: Record<string, string> = {
  "1d": "1 jour", "1w": "1 semaine", "1m": "1 mois",
  "3m": "3 mois", "6m": "6 mois", ytd: "Depuis janvier",
};

/* ── helpers ──────────────────────────────────────────────────────────────── */

/**
 * One indicator: its name, its value, and what that value means here.
 *
 * The meaning is computed from the value rather than being a fixed
 * definition — "au-dessus de 70" only belongs on screen when the RSI actually
 * is. A glossary entry explains what an indicator is; this explains what it
 * is saying right now, which is the thing a list of numbers never does.
 */
function Indicator({
  name,
  value,
  meaning,
  tone = "ink",
}: {
  name: string;
  value: string;
  meaning: string;
  tone?: "ink" | "up" | "down";
}) {
  const lesson = lessonFor(name);
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[0.9rem] font-medium" style={{ color: "var(--cap-ink)" }}>
          {name}
        </span>
        <Num tone={tone} className="text-[0.9rem]">{value}</Num>
      </div>
      <Text size="caption" className="mt-1">{meaning}</Text>
      {/* Le cours, là où la question se pose. Un lien vers la leçon qui
          explique cet indicateur précis vaut mieux qu'un onglet « Formation »
          que l'utilisateur devra fouiller une fois l'analyse quittée. */}
      {lesson && (
        <Link
          href={lessonHref(lesson.key)}
          className="mt-2 inline-flex items-center gap-1.5 text-[0.78rem] transition-colors"
          style={{ color: "var(--cap-ocean)" }}
        >
          {lesson.label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </li>
  );
}

function Row({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "up" | "down";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>{label}</dt>
      <dd><Num tone={tone} className="text-[0.88rem]">{value}</Num></dd>
    </div>
  );
}

function chartLevels(a: Analysis, depth: Depth): Level[] {
  const out: Level[] = [
    { value: a.levels.resistance, label: "Résistance", tone: "down" },
    { value: a.levels.support, label: "Support", tone: "up" },
  ];
  // The plan only appears once the reader has asked for that much.
  if (depth !== "discover" && a.risk?.suggested_sl && a.risk?.suggested_tp) {
    out.push({ value: a.risk.suggested_sl, label: "Stop", tone: "neutral" });
    out.push({ value: a.risk.suggested_tp, label: "Objectif", tone: "accent" });
  }
  return out.filter((l) => Number.isFinite(l.value));
}

function levelWindowLabel(a: Analysis): string | undefined {
  const n = a.levels.window_bars;
  const iv = a.levels.window_interval;
  if (!n || !iv) return undefined;
  // "20 bars" means 20 months on a monthly chart, and the label has to say so.
  return `Mesurés sur les ${n} dernières bougies ${iv}.`;
}

function compact(v: number): string {
  if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(2)} T`;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)} Md`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} M`;
  return v.toLocaleString("fr-FR");
}
