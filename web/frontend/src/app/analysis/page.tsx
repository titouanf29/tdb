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
import {
  useTradingStyle, TRADING_STYLES, TRADING_STYLE_IDS, type TradingStyleId,
} from "@/lib/tradingStyle";
import { useUserLevel } from "@/hooks/useUserLevel";
import {
  buildReasons, directionLabel, edgeSentence, scenarioSentence,
} from "@/lib/explain";
import { lessonFor, lessonHref } from "@/lib/lessonLinks";
import {
  Button, CloudCurtain, EmptyState, FormError, Heading, Num, Panel, Progress,
  ScoreDial, SegmentedControl, Text, WeatherBackdrop, useAnimationsEnabled,
} from "@/components/design-system";
import { type Level } from "@/components/analysis/PriceChart";
import { AnnotatedChart } from "@/components/analysis/AnnotatedChart";
import { TradingViewChart } from "@/components/analysis/TradingViewChart";
import { hasTradingView } from "@/lib/tradingViewSymbol";
import { quoteState } from "@/lib/marketOf";
import { FactorBars, LevelScale } from "@/components/analysis/Gauges";
import { AskAssistant } from "@/components/analysis/AskAssistant";

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
  const { settings, eurUsd, saveSettings } = useSettings();
  const style = useTradingStyle();
  const [switching, setSwitching] = useState(false);

  /**
   * Changer d'horizon change le modèle, pas seulement l'affichage.
   *
   * Le style pilote les multiples d'ATR envoyés au moteur, le poids des
   * fondamentaux et les unités de temps disponibles. L'analyse est donc
   * relancée, et l'unité repositionnée sur celle du nouvel horizon — sans
   * quoi on demanderait une analyse « long terme » en bougies de 5 minutes.
   */
  const changeStyle = useCallback(
    async (id: string) => {
      setSwitching(true);
      try {
        await saveSettings({ tradingStyle: id });
        const next = TRADING_STYLES[id as TradingStyleId];
        if (next) setTimeframe(next.defaultTimeframe);
      } catch {
        /* le réglage précédent est conservé par saveSettings */
      } finally {
        setSwitching(false);
      }
    },
    [saveSettings]
  );
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

  // Deux vues, plus une bascule de moteur de rendu. Le graphique interne
  // était proposé à côté de TradingView comme une alternative ; il ne l'est
  // plus — TradingView fait tout ce qu'il faisait et davantage. Il reste
  // comme REPLI pour les actifs que TradingView ne référence pas, ce qui est
  // un cas de fonctionnement, pas un choix offert à l'utilisateur.
  const [chartMode, setChartMode] = useState<"annotated" | "chart" | "howto">("annotated");
  const tvAvailable = hasTradingView(symbol);

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
      // Le graphique est secondaire : un échec ici ne doit pas perdre
      // l'analyse. Sa fenêtre suit l'horizon — « 3 mois en journalier » pour
      // tout le monde donnait treize bougies en long terme, et le graphique
      // commenté n'y trouvait aucune structure à lire.
      marketAPI.getChart(sym, style.chartWindow.period, style.chartWindow.interval)
        .then(setChart)
        .catch(() => setChart(null));
    } catch (err) {
      setAnalysis(null);
      setError(err instanceof Error ? err.message : "Analyse impossible.");
    } finally {
      setLoading(false);
    }
  }, [style.atr.sl, style.atr.tp, style.fundWeight, style.chartWindow.period, style.chartWindow.interval]);

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

  // L'état de cotation vient de la DERNIÈRE BOUGIE reçue, pas d'un calendrier
  // que nous tiendrions : la donnée est sa propre preuve.
  const quote = useMemo(
    () =>
      quoteState(
        symbol,
        chart?.data?.length ? chart.data[chart.data.length - 1].timestamp : null,
        style.chartWindow.interval
      ),
    [symbol, chart, style.chartWindow.interval]
  );

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

          {/* L'horizon, et c'est un vrai changement de modèle.
              Le moteur y répond réellement — vérifié sur AAPL : le stop passe
              de 335,86 en scalping à 220,71 en long terme, le rapport
              gain/risque de 1,67 à 2,00 et le score de 55 à 77. Le réglage
              existait déjà mais n'était modifiable que dans les paramètres,
              trois écrans plus loin, alors que c'est ici qu'on se pose la
              question. Il écrit le même réglage : changer ici change partout. */}
          <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text size="caption" as="span">Sur quel horizon analysez-vous ?</Text>
              {switching && <Text size="caption" as="span" tone="accent">Nouveau modèle appliqué…</Text>}
            </div>
            <div className="mt-2.5 -mx-1 overflow-x-auto px-1 pb-1">
              <SegmentedControl
                size="md"
                options={TRADING_STYLE_IDS.map((id) => ({
                  value: id,
                  label: TRADING_STYLES[id].label.fr,
                }))}
                value={settings.tradingStyle as TradingStyleId}
                onChange={changeStyle}
                aria-label="Horizon d'analyse"
              />
            </div>
            <Text size="caption" className="mt-2.5">
              {style.horizon.fr} · stop à {style.atr.sl.toLocaleString("fr-FR")}× l&apos;ATR,
              objectif à {style.atr.tp.toLocaleString("fr-FR")}×
              {style.fundWeight > 0
                ? ` · fondamentaux ${Math.round(style.fundWeight * 100)} % du score`
                : " · fondamentaux ignorés"}
            </Text>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SegmentedControl
              size="sm"
              options={style.timeframes.map((t) => ({ value: t, label: t }))}
              value={timeframe}
              onChange={setTimeframe}
              aria-label="Unité de temps"
            />
            <Text size="caption" as="span">
              Unité du graphique, dans cet horizon.
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

            {(chart?.data?.length ?? 0) > 1 && (
              <Panel
                title="Le prix"
                hint={
                  chartMode === "howto"
                    ? "Ce qu'on regarde sur un graphique, et dans quel ordre."
                    : chartMode === "annotated"
                      ? "La structure et les niveaux, tracés sur le prix. Quatre repères, pas quarante."
                      : tvAvailable
                        ? "Graphique TradingView — outils de dessin et indicateurs complets."
                        : `${chart!.data.length} points · ${chart!.interval}`
                }
                aside={
                  <SegmentedControl
                    size="sm"
                    options={[
                      { value: "annotated", label: "Commenté" },
                      { value: "chart", label: "Complet" },
                      { value: "howto", label: "Comment le lire" },
                    ]}
                    value={chartMode}
                    onChange={setChartMode}
                    aria-label="Affichage du graphique"
                  />
                }
              >
                {/* L'état du marché, avant le graphique et dans les trois
                    vues. Un graphique qui s'arrête le vendredi soir se lit
                    comme une panne quand rien ne dit que c'est le week-end —
                    c'est exactement la conclusion qu'un utilisateur a tirée.
                    La phrase distingue aussi le seul cas qui mérite qu'on
                    s'inquiète : des données en retard marché OUVERT. */}
                {chartMode !== "howto" && (
                  <div
                    className="mb-4 flex items-start gap-2.5 rounded-[10px] px-3.5 py-2.5"
                    style={{ backgroundColor: "var(--cap-bg)" }}
                  >
                    <span
                      aria-hidden
                      className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: quote.suspicious
                          ? "var(--cap-down)"
                          : quote.open ? "var(--cap-up)" : "var(--cap-ink-4)",
                      }}
                    />
                    <Text size="caption" as="span" tone={quote.suspicious ? "down" : "muted"}>
                      {quote.sentence}
                    </Text>
                  </div>
                )}

                {chartMode === "howto" ? (
                  <ChartGuide analysis={analysis} money={money} />
                ) : chartMode === "annotated" ? (
                  <AnnotatedChart
                    bars={chart!.data}
                    levels={chartLevels(analysis, depth)}
                    format={money}
                  />
                ) : tvAvailable ? (
                  <>
                    <TradingViewChart symbol={symbol} interval={tvInterval(timeframe)} />
                    <Text size="caption" className="mt-3">
                      Graphique fourni par TradingView. Il se charge depuis leurs
                      serveurs, à qui le symbole consulté est donc transmis.
                    </Text>
                  </>
                ) : (
                  <>
                    {/* TradingView ne connaît pas tous les symboles que ce
                        site analyse. Plutôt qu'un cadre vide — ou pire, le
                        graphique d'un autre actif — on montre la vue
                        commentée et on dit pourquoi. */}
                    <AnnotatedChart
                      bars={chart!.data}
                      levels={chartLevels(analysis, depth)}
                      format={money}
                    />
                    <Text size="caption" className="mt-3">
                      TradingView ne référence pas cet actif — voici la vue
                      commentée à la place.
                    </Text>
                  </>
                )}
              </Panel>
            )}

            {depth !== "discover" && <Intermediate analysis={analysis} money={money} />}
            {depth === "advanced" && <Advanced analysis={analysis} money={money} />}

            {/* L'assistant en dernier, et à tous les niveaux. C'est la
                question qu'on se pose APRÈS avoir lu, pas avant. */}
            <AskAssistant analysis={analysis} money={money} />
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
          {/* Le score PONDÉRÉ PAR LE PROFIL, pas le générique.
              L'écran envoyait déjà les paramètres du style de trading —
              multiples d'ATR et poids des fondamentaux — et le moteur
              renvoyait les deux scores. Seul le générique était affiché : sur
              AAPL, 69 alors que le score du profil valait 71. Les paramètres
              promettent noir sur blanc que le style « change le poids des
              fondamentaux dans le score » ; la promesse était tenue par le
              moteur et perdue à l'affichage. */}
          <ScoreDial score={Math.round(a.profile_score?.total ?? a.score.total)} size={124} />
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

  const w = a.trade_window;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Combien de temps tenir. Le moteur le calculait — bornes, durée
          optimale, niveau de risque, raisons et avertissements, tout en
          français — et rien ne l'affichait. Dans un outil de trading, « je
          garde ça combien de temps » est une question de premier plan, pas
          un détail. */}
      {w?.label_optimal && (
        <Panel
          title="Combien de temps tenir"
          hint={`Estimé à partir de la volatilité et de la force de la tendance, en bougies de ${w.bar_label ?? a.timeframe}.`}
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
            <div>
              <Num tone="accent" className="text-[1.9rem]">{w.label_optimal}</Num>
              <Text size="caption" className="mt-1">Durée typique</Text>
            </div>
            <div>
              <Num className="text-[1.05rem]">{w.label_min} – {w.label_max}</Num>
              <Text size="caption" className="mt-1">Fourchette</Text>
            </div>
            {w.risk_level && (
              <div>
                <Num
                  tone={w.risk_level === "high" ? "down" : w.risk_level === "low" ? "up" : "ink"}
                  className="text-[1.05rem]"
                >
                  {w.risk_level === "high" ? "Élevé" : w.risk_level === "low" ? "Faible" : "Modéré"}
                </Num>
                <Text size="caption" className="mt-1">Risque sur la période</Text>
              </div>
            )}
          </div>

          {w.unreliable && (
            <Text size="small" tone="down" className="mt-5">
              Cette estimation est peu fiable sur cet actif — les données ne
              permettent pas de trancher.
            </Text>
          )}

          {(w.reasons?.length || w.warnings?.length) && (
            <ul className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
              {w.reasons?.map((r) => (
                <li key={r} className="flex gap-3">
                  <span aria-hidden className="mt-[0.55rem] h-px w-3 shrink-0" style={{ backgroundColor: "var(--cap-ink-4)" }} />
                  <Text size="small" as="span">{r}</Text>
                </li>
              ))}
              {w.warnings?.map((r) => (
                <li key={r} className="flex gap-3">
                  <span aria-hidden className="mt-[0.55rem] h-px w-3 shrink-0" style={{ backgroundColor: "var(--cap-down)" }} />
                  <Text size="small" as="span" tone="down">{r}</Text>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

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

  const t = a.targets;
  const vol = a.volatility;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Les trois scénarios de prix et l'avis des analystes. Calculés depuis
          toujours, jamais montrés. Ils vont au niveau Avancé parce qu'une
          cible chiffrée se lit comme une promesse quand on débute — alors que
          c'est une projection, et elle est présentée comme telle. */}
      {t && (t.bull != null || t.base != null || t.bear != null) && (
        <Panel
          title="Trois scénarios"
          hint="Des projections issues de la volatilité et des niveaux, pas des prédictions."
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-end gap-x-12 gap-y-5">
            {t.bear != null && (
              <div>
                <Num tone="down" className="text-[1.15rem]">{money(t.bear)}</Num>
                <Text size="caption" className="mt-1">Défavorable</Text>
              </div>
            )}
            {t.base != null && (
              <div>
                <Num className="text-[1.3rem]">{money(t.base)}</Num>
                <Text size="caption" className="mt-1">Central</Text>
              </div>
            )}
            {t.bull != null && (
              <div>
                <Num tone="up" className="text-[1.15rem]">{money(t.bull)}</Num>
                <Text size="caption" className="mt-1">Favorable</Text>
              </div>
            )}
            {t.analyst_mean != null && (
              <div className="border-l pl-8" style={{ borderColor: "var(--cap-line)" }}>
                <Num tone="accent" className="text-[1.15rem]">{money(t.analyst_mean)}</Num>
                <Text size="caption" className="mt-1">
                  Moyenne des analystes
                  {a.fundamentals?.num_analysts ? ` (${a.fundamentals.num_analysts})` : ""}
                </Text>
              </div>
            )}
          </div>

          {(vol?.["20d"] != null || vol?.["60d"] != null) && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            <Text size="caption">
              Volatilité annualisée : {vol["20d"] != null ? `${vol["20d"].toFixed(1)} % sur 20 jours` : ""}
              {vol["20d"] != null && vol["60d"] != null ? ", " : ""}
              {vol["60d"] != null ? `${vol["60d"].toFixed(1)} % sur 60 jours` : ""}
              {vol["20d"] != null && vol["60d"] != null && vol["20d"] > vol["60d"] * 1.2
                ? " — l'agitation récente dépasse la normale de cet actif."
                : ""}
            </Text>
            </div>
          )}
        </Panel>
      )}

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

/**
 * « Comment le lire » — un guide nourri par l'analyse ouverte.
 *
 * Un onglet d'aide générique est une notice : on le lit une fois, jamais deux.
 * Celui-ci cite les niveaux, la tendance et l'horizon de l'actif affiché, donc
 * il dit à chaque fois quelque chose de différent et reste utile après la
 * vingtième visite. Les chiffres viennent du moteur, pas d'un exemple.
 */
function ChartGuide({ analysis: a, money }: { analysis: Analysis; money: (v: number) => string }) {
  const dir = directionLabel(a);
  const steps: { title: string; body: string }[] = [
    {
      title: "1. La forme d'ensemble, avant les détails",
      body: `Reculez jusqu'à voir plusieurs mois. Ce qui compte d'abord n'est pas la dernière bougie mais la pente : une suite de sommets et de creux de plus en plus hauts est une tendance haussière, l'inverse une baissière. Ici le moteur la lit comme ${dir.text.toLowerCase()}.`,
    },
    {
      title: "2. Les paliers où le prix a déjà réagi",
      body: `Les zones où le cours a buté plusieurs fois comptent plus que les autres. Sur cet actif, le support mesuré est à ${money(a.levels.support)} et la résistance à ${money(a.levels.resistance)} — deux repères, pas deux certitudes : ils cèdent régulièrement.`,
    },
    {
      title: "3. Le volume, sous le prix",
      body:
        a.indicators?.volume_ratio != null
          ? `La barre du bas dit combien d'échanges ont eu lieu. Un mouvement sans volume est fragile. Ici le volume vaut ${a.indicators.volume_ratio.toFixed(1)} fois sa moyenne${a.indicators.volume_ratio >= 1.3 ? " — le mouvement est confirmé par les échanges." : a.indicators.volume_ratio <= 0.6 ? " — peu d'échanges derrière ce mouvement." : "."}`
          : "La barre du bas dit combien d'échanges ont eu lieu. Un mouvement de prix accompagné d'un fort volume est plus fiable qu'un mouvement dans le vide.",
    },
    {
      title: "4. L'unité de temps change tout",
      body: `Le même actif paraît haussier en 1 jour et baissier en 5 minutes. Choisissez l'unité qui correspond à la durée pendant laquelle vous comptez rester${a.trade_window?.label_optimal ? ` — pour cet actif, le moteur estime ${a.trade_window.label_optimal}` : ""}. Les boutons d'horizon en haut de page la règlent pour toute l'analyse.`,
    },
    {
      title: "5. Ce qu'un graphique ne dit pas",
      body: "Il montre le passé. Aucune figure ne garantit la suite, et le moteur lui-même affiche quand son historique ne soutient pas son verdict. Le graphique sert à situer une décision, pas à la prendre.",
    },
  ];

  return (
    <div className="space-y-5">
      {steps.map((st) => (
        <div key={st.title}>
          <span className="block text-[0.93rem] font-medium" style={{ color: "var(--cap-ink)" }}>
            {st.title}
          </span>
          <Text size="small" className="mt-1.5">{st.body}</Text>
        </div>
      ))}
      <div className="border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
        <Link
          href={lessonHref("technical-analysis/reading-charts")}
          className="inline-flex items-center gap-1.5 text-[0.85rem]"
          style={{ color: "var(--cap-ocean)" }}
        >
          La leçon complète sur la lecture d'un graphique
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** Unité de temps du site -> unité TradingView. */
function tvInterval(timeframe: string): string {
  const map: Record<string, string> = {
    "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "4h": "240",
    "1d": "D", "1wk": "W", "1mo": "M",
  };
  return map[timeframe] ?? "D";
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
