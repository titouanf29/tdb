"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, Layers, Loader2, MoveRight, Star, TrendingDown, TrendingUp } from "lucide-react";
import {
  analysisAPI, favoritesAPI, marketAPI, walletAPI,
  type Analysis, type ChartData, type Figure,
} from "@/lib/api";
import { fr, useFormatAssetPrice, useFormatSomme, useSettings } from "@/lib/SettingsContext";
import {
  useTradingStyle, TRADING_STYLES, TRADING_STYLE_IDS, type TradingStyleId,
} from "@/lib/tradingStyle";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useProfile } from "@/lib/useProfile";
import { Intentions } from "@/components/analysis/Intentions";
import { PourVous } from "@/components/analysis/PourVous";
import {
  buildReasons, directionLabel, edgeSentence, scenarioSentence, tendanceExpliquee,
} from "@/lib/explain";
import { lessonFor, lessonHref } from "@/lib/lessonLinks";
import {
  Button, LigneDatee, CloudCurtain, EmptyState, FormError, Heading, LiveNum, Num, Panel,
  Progress, ScoreDial, SegmentedControl, Text, WeatherBackdrop,
  useAnimationsEnabled, Nimbo } from "@/components/design-system";
import { RefreshTimer, useAutoRefresh } from "@/components/app/RefreshTimer";
import { type Level } from "@/components/analysis/PriceChart";
import { AnnotatedChart, type PlanDessine } from "@/components/analysis/AnnotatedChart";
import { TradingViewChart } from "@/components/analysis/TradingViewChart";
import { estAuComptant, hasTradingView } from "@/lib/tradingViewSymbol";
import { quoteState } from "@/lib/marketOf";
import { FactorBars, LevelScale } from "@/components/analysis/Gauges";
import { AskAssistant } from "@/components/analysis/AskAssistant";
import { RoueRisque } from "@/components/analysis/RoueRisque";
import { StructureMouvement } from "@/components/analysis/StructureMouvement";
import { RISQUE, niveauRisque, tailleSelonRisque } from "@/lib/risque";
import { noterGeste } from "@/lib/parcours";
import { PressContext } from "@/components/analysis/PressContext";
import { ClimatMarche } from "@/components/analysis/ClimatMarche";
import { MacroContext } from "@/components/analysis/MacroContext";
import { MaStrategie } from "@/components/analysis/MaStrategie";
import { NoteScanner } from "@/components/analysis/NoteScanner";
import {
  ListeSuggestions, useAssetSuggestions, useFermetureExterieure,
} from "@/components/app/assetSearch";

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

const TIMEFRAMES_VALIDES = ["5m", "15m", "30m", "1h", "4h", "1d", "3d", "1w", "1mo"];

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
  const { settings, saveSettings, isLoaded: reglagesLus } = useSettings();
  const style = useTradingStyle();
  const [switching, setSwitching] = useState(false);

  /**
   * Changer d'horizon change le modèle, pas seulement l'affichage.
   *
   * Le style pilote les multiples d'ATR envoyés au moteur, le poids des
   * fondamentaux et les unités de temps disponibles. L'analyse est donc
   * relancée, et l'unité repositionnée sur celle du nouvel horizon — sans
   * quoi on demanderait une analyse « long terme » en bougies de 5 minutes.
   *
   * L'UNITÉ EST POSÉE AVANT L'ENREGISTREMENT, et c'est tout le correctif.
   *
   * Elle l'était après un `await` : le réglage partait, le contexte se
   * mettait à jour de façon optimiste, une première analyse était demandée
   * avec le NOUVEAU profil et l'ANCIENNE unité, puis l'unité changeait et une
   * seconde partait. Deux requêtes en vol, et rien pour les ordonner : la
   * réponse la plus lente gagnait. Or la requête longue est justement celle
   * du long terme — mesuré sur AAPL, passer en « Long terme » affichait un
   * objectif de 341,80 € (la réponse en bougies de 5 minutes, arrivée en
   * dernier) là où le moteur en mensuel répondait 572,67 €.
   *
   * Posées dans le même gestionnaire, les deux mises à jour sont groupées par
   * React : un seul rendu, une seule requête, la bonne.
   */
  const changeStyle = useCallback(
    async (id: string) => {
      const next = TRADING_STYLES[id as TradingStyleId];
      if (!next) return;
      const unitePrecedente = timeframeRef.current;
      setSwitching(true);
      setUniteChoisie(false);
      setTimeframe(next.defaultTimeframe);
      try {
        await saveSettings({ tradingStyle: id });
        // CHANGER D'HORIZON EST LE BON MOMENT POUR DEMANDER LE RESTE.
        //
        // Quelqu'un qui vient de dire « en fait je suis plutôt long terme »
        // est en train de décrire sa façon de faire : c'est là que les cinq
        // questions tombent juste, et pas au milieu d'une lecture. Une fois
        // répondues — même par « passer » — on ne redemande plus.
        if (!profileRef.current?.intentions_at) setQuestionsOuvertes(true);
      } catch {
        // saveSettings a annulé le profil ; l'unité doit revenir avec lui,
        // sans quoi l'écran resterait en mensuel avec un profil day trading.
        setTimeframe(unitePrecedente);
      } finally {
        setSwitching(false);
      }
    },
    [saveSettings]
  );
  const [animOn] = useAnimationsEnabled();

  // ── Ce que la personne a dit d'elle ──────────────────────────────────────
  //
  // L'horizon change les nombres du moteur ; ces réponses-là changent ce que
  // ces nombres VEULENT DIRE pour elle : l'argent réellement risqué, le stop
  // comparé à sa limite, la fenêtre comparée à ses disponibilités. Le bloc
  // `personnel` de l'analyse est calculé côté serveur à partir d'elles.
  // Une somme engagée s'écrit au centime, pas avec la précision d'un cours :
  // `assetPrice` rendait « 15,800 € » là où il faut lire « 15,80 € ».
  const somme = useFormatSomme();
  const { profile, save: saveProfile } = useProfile();
  const [questionsOuvertes, setQuestionsOuvertes] = useState(false);
  // En ref : `changeStyle` le lit sans se redéclarer à chaque réponse
  // enregistrée, ce qui relancerait l'analyse pour rien.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const urlSymbol = (params.get("symbol") || "").toUpperCase();
  const [symbol, setSymbol] = useState(urlSymbol);
  const [query, setQuery] = useState(urlSymbol);

  const [timeframe, setTimeframe] = useState(style.defaultTimeframe);
  // Miroir en ref : `changeStyle` doit pouvoir revenir à l'unité précédente
  // sans se redéclarer à chaque frappe sur le sélecteur d'unité.
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  /**
   * L'UNITÉ SUIT L'HORIZON TANT QU'ON N'Y A PAS TOUCHÉ.
   *
   * `useState(style.defaultTimeframe)` ne vaut qu'au montage — or au montage
   * les réglages ne sont pas encore lus, donc `style` est le défaut « day » et
   * l'unité se figeait à 1 h. Les réglages arrivaient ensuite avec « swing » :
   * les multiples d'ATR passaient bien à 1,5 / 3, mais l'analyse continuait
   * d'être demandée EN BOUGIES D'UNE HEURE. Mesuré tel quel :
   * `timeframe=1h&sl_atr=1.5&tp_atr=3&style=swing` — un plan de swing calculé
   * sur des heures, et une fenêtre de trade de 8 h annoncée à quelqu'un qui
   * avait choisi « jours – semaines ».
   *
   * Le choix manuel reste souverain, comme pour la profondeur : dès qu'on
   * touche au sélecteur d'unité, l'horizon ne le réécrit plus — jusqu'au
   * prochain changement d'horizon, qui reprend la main.
   */
  // Depuis le scanner, l'unité du scan arrive dans l'adresse (`tf`) : Nimbo
  // y a déjà vérifié l'opportunité, l'analyse doit s'ouvrir sur la même.
  const urlTf = params.get("tf");
  const [uniteChoisie, setUniteChoisie] = useState(!!urlTf && TIMEFRAMES_VALIDES.includes(urlTf));
  useEffect(() => {
    if (urlTf && TIMEFRAMES_VALIDES.includes(urlTf)) { setTimeframe(urlTf); setUniteChoisie(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTf]);
  useEffect(() => {
    if (!uniteChoisie) setTimeframe(style.defaultTimeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.id, uniteChoisie]);

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
  // La réponse donnée dans « Votre façon de faire » l'emporte sur le niveau
  // déclaré : elle est plus récente, plus précise, et elle porte sur CET
  // écran — « le verdict, c'est tout » est une demande, pas une estimation
  // de compétence.
  const level = useUserLevel();
  const depuisLecture: Depth | null =
    profile.lecture === "detail" ? "advanced"
    : profile.lecture === "raisons" ? "intermediate"
    : profile.lecture === "verdict" ? "discover"
    : null;
  const levelDepth: Depth =
    depuisLecture ??
    (level.level === "expert" ? "advanced"
     : level.level === "intermediate" ? "intermediate"
     : "discover");
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
  const [figures, setFigures] = useState<Figure[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    favoritesAPI.getFavorites()
      .then((d) => setFavorites(new Set((d.favorites || []).map((f) => f.symbol))))
      .catch(() => {});
  }, []);

  /**
   * Un compteur de demandes, et rien de plus compliqué.
   *
   * Deux analyses peuvent être en vol en même temps — on change d'horizon
   * pendant qu'une requête tourne, on tape un autre symbole. Sans ordre, la
   * réponse la plus LENTE écrase la plus récente, et l'écran affiche une
   * analyse qu'on n'a pas demandée. Ce n'est pas théorique : le mensuel met
   * plus longtemps à revenir que le 5 minutes, donc passer à un horizon long
   * perdait systématiquement la course.
   */
  const demande = useRef(0);

  // Le risque par trade part au moteur avec la demande. Il ne change le
  // verdict qu'en passant d'un profil prudent/modéré à un profil agressif (le
  // seuil d'achat en journalier) : l'analyse n'est relancée que dans ce cas,
  // pas à chaque cran du bouton.
  const risqueRef = useRef(settings.riskLevel);
  risqueRef.current = settings.riskLevel;
  const profilAgressif = settings.riskLevel === "aggressive" || settings.riskLevel === "very_aggressive";

  const run = useCallback(async (sym: string, tf: string) => {
    if (!sym) return;
    const n = ++demande.current;
    setLoading(true);
    setError("");
    try {
      // The profile drives the stop, the target and the weight given to
      // fundamentals, so the plan shown here is the plan the backtest
      // validated and the one the trading screen will receive.
      const a = await analysisAPI.analyze(sym, tf, style.atr.sl, style.atr.tp,
                                          style.fundWeight, style.id, risqueRef.current);
      if (n !== demande.current) return; // une demande plus récente a pris la main
      setAnalysis(a);
      // Le graphique est secondaire : un échec ici ne doit pas perdre
      // l'analyse. Sa fenêtre suit l'horizon — « 3 mois en journalier » pour
      // tout le monde donnait treize bougies en long terme, et le graphique
      // commenté n'y trouvait aucune structure à lire.
      marketAPI.getChart(sym, style.chartWindow.period, style.chartWindow.interval)
        .then((c) => { if (n === demande.current) setChart(c); })
        .catch(() => { if (n === demande.current) setChart(null); });
      // Les figures sur la MÊME fenêtre que le graphique : leurs indices
      // pointent dans ses bougies. Un échec les efface, il ne casse rien —
      // le graphique commenté se lit très bien sans.
      setFigures([]);
      marketAPI.getFigures(sym, style.chartWindow.period, style.chartWindow.interval)
        .then((r) => { if (n === demande.current) setFigures(r.figures ?? []); })
        .catch(() => { if (n === demande.current) setFigures([]); });
    } catch (err) {
      if (n !== demande.current) return;
      setAnalysis(null);
      setError(err instanceof Error ? err.message : "Analyse impossible.");
    } finally {
      if (n === demande.current) setLoading(false);
    }
  }, [style.id, style.atr.sl, style.atr.tp, style.fundWeight,
      style.chartWindow.period, style.chartWindow.interval, profilAgressif]);

  useEffect(() => {
    // Deux conditions, deux raisons.
    //
    // `reglagesLus` : tant que les réglages ne sont pas lus, `style` est le
    // défaut et non celui de l'utilisateur — lancer l'analyse ici, c'est la
    // lancer sur le mauvais horizon puis la refaire une seconde plus tard.
    //
    // L'unité appartenant à l'horizon : c'est l'invariant qui avait sauté.
    // Un horizon « swing » avec une unité « 1h » n'est pas un cas de
    // transition acceptable, c'est un plan de swing calculé sur des heures.
    // Le rendu où les deux ne correspondent pas encore est sauté ; l'effet
    // d'au-dessus repose l'unité juste après.
    if (symbol && reglagesLus && style.timeframes.includes(timeframe)) {
      run(symbol, timeframe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, run, reglagesLus, style.id]);

  /**
   * Le cours, suivi en direct — à la cadence de l'horizon.
   *
   * L'écran chargeait son analyse une fois et n'y revenait jamais. Le
   * graphique TradingView, lui, est branché sur son propre flux : il bougeait
   * sous les yeux de l'utilisateur pendant que le prix affiché juste au-dessus
   * restait celui du chargement de la page. En scalping, ce décalage se
   * comptait en minutes.
   *
   * Seule la COTATION est relue à cette cadence, pas l'analyse entière :
   * recalculer les indicateurs toutes les cinq secondes retéléchargerait des
   * bougies qui ne changent qu'au quart d'heure, pour rendre exactement le
   * même verdict. Les niveaux tiennent la séance ; le prix, non.
   */
  const [live, setLive] = useState<{ price: number; change: number } | null>(null);
  useEffect(() => { setLive(null); }, [symbol]);

  const pollQuote = useCallback(async () => {
    if (!symbol) return;
    const d = await marketAPI.getPrices([symbol]);
    const q = d.prices?.[symbol.toUpperCase()];
    if (q && q.price > 0) setLive({ price: q.price, change: q.change });
  }, [symbol]);

  const ticker = useAutoRefresh(
    pollQuote,
    style.refreshSeconds,
    Boolean(symbol) && Boolean(analysis)
  );

  /* La recherche d'actif, partagée avec l'en-tête. */
  const sugg = useAssetSuggestions(query);
  const formRef = useRef<HTMLFormElement>(null);
  useFermetureExterieure(formRef, sugg.ouvert, () => sugg.setOuvert(false));

  /* L'ADRESSE FAIT FOI. `useState(urlSymbol)` ne lit l'adresse qu'au montage :
     depuis une analyse déjà ouverte, choisir un actif dans la recherche de
     l'en-tête changeait l'URL (/analysis?symbol=TTE.PA) sans changer l'écran,
     qui restait sur l'actif précédent, le clic semblait ne rien faire. Même
     chose avec les boutons précédent / suivant du navigateur. */
  useEffect(() => {
    if (urlSymbol && urlSymbol !== symbol) {
      sugg.poser(urlSymbol);
      setSymbol(urlSymbol);
      setQuery(urlSymbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  const choisirActif = useCallback((s: string) => {
    sugg.poser(s);
    setQuery(s);
    setSymbol(s);
    router.replace(`/analysis?symbol=${encodeURIComponent(s)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // La proposition retenue, pas le texte brut. Et s'il n'y en a aucune, le
    // texte majusculé reste le repli : quelqu'un qui tape un symbole que le
    // catalogue ne connaît pas encore doit pouvoir l'analyser quand même.
    if (sugg.choisi) { choisirActif(sugg.choisi.symbol); return; }
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

  /* Un COURS et une SOMME ne se formatent pas pareil, et cet écran ne montre
     que des cours : stop, objectif, EMA, bandes de Bollinger, supports,
     objectifs de prix. Tous passaient par le formateur des sommes, figé à
     deux décimales, sur un actif sous l'euro, le plan affichait
     « stop 0,35 € / objectif 0,35 € », deux nombres différents rendus
     identiques. Le contexte envoyé à l'assistant portait les mêmes valeurs
     arrondies : il raisonnait sur un stop égal à son objectif. */
  // Dans la devise de cotation de l'actif (dollars pour Apple, euros pour LVMH…).
  const assetPrice = useFormatAssetPrice(analysis?.symbol ?? symbol);

  return (
    <>
      <WeatherBackdrop
        condition={analysis ? (analysis.price.change >= 0 ? "fair" : "overcast") : "cloudy"}
        enabled={animOn}
      />

      <div className="relative space-y-6">
        <header className="pt-2">
          {/* La signature du site : le jour et l'état des marchés. */}
          <p className="cap-dateline mb-4 text-[0.92rem]"><LigneDatee /></p>
          <Heading level={1}>Analyse</Heading>
          <Text className="mt-2.5 max-w-[36rem]">
            Un actif, un verdict, et la raison du verdict, au niveau de détail
            que vous choisissez.
          </Text>
        </header>

        <Panel>
          {/* CE CHAMP AVAIT LE MÊME DÉFAUT QUE CELUI DE L'EN-TÊTE, et il a
              survécu à sa correction : il forçait les majuscules à chaque
              frappe et envoyait le texte tel quel comme symbole. Taper
              « apple » ouvrait donc l'analyse d'un APPLE qui n'existe pas.

              Ce n'était pas une redite bénigne : le champ de l'en-tête était
              masqué sous 640 px, donc celui-ci était LA SEULE recherche
              disponible sur téléphone. Le correctif ne tenait que sur grand
              écran. Les deux partagent maintenant le même comportement.

              Le libellé aussi a changé. « AAPL, BTC-USD, MC.PA… » enseignait
              qu'il fallait connaître le code, ce qui était exact, et c'est
              précisément ce qu'on corrige. */}
          <form
            ref={formRef}
            onSubmit={submit}
            className="relative flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="relative min-w-0 flex-1">
              <label htmlFor="analyse-actif" className="vitrine-italique mb-1 block text-[0.95rem]"
                style={{ fontFamily: "var(--cap-font-display)", fontStyle: "italic", color: "var(--cap-ink-3)" }}>
                Quel actif voulez-vous comprendre ?
              </label>
              <input
                id="analyse-actif"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={sugg.touche}
                onFocus={() => sugg.hits.length && sugg.setOuvert(true)}
                placeholder="Apple, bitcoin, Société Générale…"
                aria-label="Actif à analyser"
                role="combobox"
                aria-expanded={sugg.ouvert}
                aria-autocomplete="list"
                // Une ligne d'écriture en serif, soulignée, qui passe à l'ambre
                // quand on écrit : la question se pose comme dans un carnet.
                className="cap-champ-ligne h-12 w-full bg-transparent px-0.5 text-[1.35rem] outline-none placeholder:italic placeholder:text-[color:var(--cap-ink-4)]"
                style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}
              />
            </div>
            <Button type="submit" size="md" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyser"}
            </Button>

            <AnimatePresence>
              {sugg.ouvert && query.trim().length >= 2 && (
                <ListeSuggestions
                  requete={query}
                  hits={sugg.hits}
                  actif={sugg.actif}
                  cherche={sugg.cherche}
                  onSurvol={sugg.setActif}
                  onChoisir={choisirActif}
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden p-1.5 sm:right-auto sm:w-[24rem]"
                />
              )}
            </AnimatePresence>
          </form>

          {/* L'horizon, et c'est un vrai changement de modèle.
              Le moteur y répond réellement, vérifié sur AAPL : le stop passe
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
            {/* L'horizon et, juste à côté, le risque par trade : les deux
                réglages qui décident d'un plan. Le bouton se tourne ; il
                règle la taille de la position, jamais le stop ni l'objectif. */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
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
              <RoueRisque
                niveau={niveauRisque(settings.riskLevel)}
                onChange={(n) => { saveSettings({ riskLevel: n }).catch(() => {}); }}
              />
            </div>
            <Text size="caption" className="mt-2.5">
              Un horizon de {style.horizon.fr.toLowerCase()}. Le stop se place à {style.atr.sl.toLocaleString("fr-FR")} fois
              l&apos;ATR, l&apos;objectif à {style.atr.tp.toLocaleString("fr-FR")} fois
              {style.fundWeight > 0
                ? `, et les fondamentaux comptent pour ${Math.round(style.fundWeight * 100)} % du score.`
                : ", et les fondamentaux ne comptent pas."}
            </Text>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SegmentedControl
              size="sm"
              options={style.timeframes.map((t) => ({ value: t, label: t }))}
              value={timeframe}
              onChange={(t) => { setTimeframe(t); setUniteChoisie(true); }}
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
              description="Commencez par une entreprise que vous connaissez, comprendre l'analyse compte plus que le choix de l'actif."
              action={{ label: "Analyser Apple", onClick: () => { setQuery("AAPL"); setSymbol("AAPL"); } }}
            />
          </Panel>
        )}

        {analysis && (
          <>
            <div data-visite="analyse-verdict">
            <Verdict
              // Un nouvel actif rejoue l'arrivée du verdict : sans clé, les
              // chiffres changeaient sous les yeux sans que rien le signale.
              key={`${analysis.symbol}-${analysis.timeframe}`}
              analysis={analysis}
              assetPrice={assetPrice}
              live={live}
              ticker={ticker}
              tickerHint={`Cadence ${style.label.fr}, toutes les ${style.refreshSeconds} s. Elle suit votre horizon de trading, modifiable dans Réglages.`}
              isFavorite={favorites.has(symbol)}
              onToggleFavorite={toggleFavorite}
              onPasserEnSwing={() => changeStyle("swing")}
            />
            </div>


            {/* CE QUE CE PLAN VEUT DIRE POUR VOUS.
                Placé juste sous le verdict et son plan, parce que c'est là
                qu'il se lit : « stop à 327,22 $ » ne dit rien à quelqu'un qui
                engage 500 €, « 21 € risqués » si. Tant qu'aucune intention
                n'a été donnée, le panneau ne raconte rien, il propose de
                poser les questions. */}
            <PourVous
              bloc={analysis.personnel}
              devise={somme}
              onOuvrirQuestions={() => setQuestionsOuvertes(true)}
              onChangerHorizon={changeStyle}
            />

            {(chart?.data?.length ?? 0) > 1 && (
              <Panel
                title="Le prix"
                hint={
                  chartMode === "howto"
                    ? "Ce qu'on regarde sur un graphique, et dans quel ordre."
                    : chartMode === "annotated"
                      ? "La structure et les niveaux, tracés sur le prix. Quatre repères, pas quarante."
                      : tvAvailable
                        ? "Graphique TradingView, outils de dessin et indicateurs complets."
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
                    comme une panne quand rien ne dit que c'est le week-end,
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
                  <ChartGuide analysis={analysis} assetPrice={assetPrice} />
                ) : chartMode === "annotated" ? (
                  <AnnotatedChart
                    bars={chart!.data}
                    levels={chartLevels(analysis, depth)}
                    figures={figures}
                    format={assetPrice}
                    plan={planDessine(analysis)}
                  />
                ) : tvAvailable ? (
                  <>
                    <TradingViewChart symbol={symbol} interval={tvInterval(timeframe)} />
                    {estAuComptant(symbol) && (
                      <Text size="caption" className="mt-3" tone="ink">
                        Ce graphique TradingView montre le prix AU COMPTANT : leur widget ne sait pas
                        afficher le contrat à terme ({symbol}) sur lequel sont calculés l&apos;analyse,
                        le stop et l&apos;objectif. Le contrat cote en général un peu au-dessus : pour les
                        niveaux exacts, voyez le graphique « Commenté ».
                      </Text>
                    )}
                    <Text size="caption" className="mt-3">
                      Graphique fourni par TradingView. Il se charge depuis leurs
                      serveurs, à qui le symbole consulté est donc transmis.
                    </Text>
                  </>
                ) : (
                  <>
                    {/* TradingView ne connaît pas tous les symboles que ce
                        site analyse. Plutôt qu'un cadre vide, ou pire, le
                        graphique d'un autre actif, on montre la vue
                        commentée et on dit pourquoi. */}
                    <AnnotatedChart
                      bars={chart!.data}
                      levels={chartLevels(analysis, depth)}
                      figures={figures}
                      format={assetPrice}
                      plan={planDessine(analysis)}
                    />
                    <Text size="caption" className="mt-3">
                      TradingView ne référence pas cet actif, voici la vue
                      commentée à la place.
                    </Text>
                  </>
                )}
              </Panel>
            )}

            {/* CE QUE LE SCANNER A VU, quand on arrive de là.
                Le trajet scanner → analyse perdait le rang, le niveau
                d'entrée et l'invalidation que le scanner venait de calculer :
                on atterrissait sur une page qui refaisait son raisonnement de
                zéro. Le panneau s'efface de lui-même si l'on n'est pas passé
                par le scanner, ou si le scan date de plus de six heures. */}
            <NoteScanner symbol={analysis.symbol} format={assetPrice} />

            {/* La stratégie de l'utilisateur, appliquée à cet actif : Nimbo dit
                si elle se déclenche, et s'il est d'accord. */}
            <MaStrategie symbol={analysis.symbol} assetPrice={assetPrice}
              nimboPropose={!!analysis.nimbo?.propose} nimboSens={analysis.nimbo?.sens ?? null} />


            {/* ── Aller plus loin : le détail qu'on choisit de voir. ─────── */}
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

            {depth !== "discover" && <Intermediate analysis={analysis} assetPrice={assetPrice} />}
            {depth === "advanced" && <Advanced analysis={analysis} assetPrice={assetPrice} />}

            {/* ── Les compléments, repliés. ──────────────────────────────
                La page empilait tout au même niveau : presse, banques
                centrales, climat, assistant, sous le verdict et le prix.
                Ils restent là, en bas, fermés, leur titre et leur phrase
                disent ce qu'il y a dedans, un clic les ouvre, et le site
                retient ceux qu'on a laissés ouverts. */}
            <div className="pt-2">
              <Heading level={3} as="h2">Compléments</Heading>
            </div>
            <div className="cap-rubriques">
            {/* La presse, à tous les niveaux de détail. Un débutant a plus
                besoin qu'un expert de savoir POURQUOI un actif bouge, et
                c'est la seule partie de l'écran qui répond à cette
                question-là. L'ATR rapporté au prix sert de seuil de
                réaction : 2 % n'est pas le même événement sur un service aux
                collectivités et sur une crypto. */}
            <PressContext
              symbol={analysis.symbol}
              variationPct={live?.change ?? analysis.price.change}
              volumeRatio={analysis.indicators?.volume_ratio ?? undefined}
              volatiliteJour={
                analysis.indicators?.atr && analysis.price.current
                  ? (analysis.indicators.atr / analysis.price.current) * 100
                  : undefined
              }
            />

            {/* Les banques centrales : ce que le graphique ne peut pas savoir,
                la date de la prochaine décision et le sens habituel de la
                réaction de CET actif. */}
            <MacroContext symbol={analysis.symbol} />

            {/* La géométrie du mouvement : structure, dernière jambe, où en
                est le prix. Une description, mesurée, elle n'aide pas à
                décider, donc elle est ici, fermée, et le dit. */}
            <StructureMouvement contexte={analysis.contexte_technique} assetPrice={assetPrice} />

            {/* La peur et les taux : le climat dans lequel le plan se joue.
                Contexte à lire, hors score. */}
            <ClimatMarche climat={analysis.climat_marche} />

            {/* L'assistant en dernier, et à tous les niveaux. C'est la
                question qu'on se pose APRÈS avoir lu, pas avant. */}
            <AskAssistant analysis={analysis} assetPrice={assetPrice} />
            </div>
          </>
        )}
      </div>

      {/* Le questionnaire. L'analyse est RELANCÉE après enregistrement : le
          bloc « Pour vous » est calculé côté serveur à partir des réponses,
          donc sans nouvelle requête il resterait celui d'avant, et le
          questionnaire n'aurait visiblement rien changé, ce qui est
          exactement l'impression à ne pas donner. */}
      <Intentions
        open={questionsOuvertes}
        onClose={() => setQuestionsOuvertes(false)}
        profil={profile}
        enregistrer={saveProfile}
        onEnregistre={() => { if (symbol) run(symbol, timeframe); }}
      />
    </>
  );
}

/* ── Level 1 : the verdict ────────────────────────────────────────────────── */

function Verdict({
  analysis: a,
  assetPrice,
  live,
  ticker,
  tickerHint,
  isFavorite,
  onToggleFavorite,
  onPasserEnSwing,
}: {
  analysis: Analysis;
  /** Un cours n'a pas la précision d'une somme : sur un actif à 0,34 €, deux
   *  décimales affichent le même nombre avant et après un mouvement réel. */
  assetPrice: (v: number) => string;
  /** La dernière cotation lue depuis le chargement de l'analyse, s'il y en a. */
  live: { price: number; change: number } | null;
  ticker: { remaining: number; busy: boolean; paused: boolean; refreshNow: () => void };
  tickerHint: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPasserEnSwing?: () => void;
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
              className="text-[1.4rem] font-semibold tracking-[-0.01em]"
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

          {/* Un contrat à terme n'est pas le prix au comptant qu'affiche un
              courtier CFD (GC=F contre XAU/USD) : l'écart est petit mais réel,
              et quelqu'un qui compare avec son courtier doit le savoir. */}
          {a.symbol.toUpperCase().endsWith("=F") && (
            <p className="mt-1 max-w-[34rem] text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
              Contrat à terme ({a.symbol}){COMPTANT[a.symbol.toUpperCase()] ? `, pas le prix au comptant ${COMPTANT[a.symbol.toUpperCase()]}` : ""}.
              Il cote en général un peu au-dessus (coût de portage) ; analyse, stop et objectif sont tous
              calculés sur ce contrat.
            </p>
          )}

          {/* Le prix affiché est la DERNIÈRE cotation connue, pas celle du
              chargement de la page. Les deux chiffres défilent au lieu de
              sauter, et la pastille colorée dit le sens du mouvement à
              quelqu'un qui regardait le graphique à cet instant. */}
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <LiveNum
              value={live?.price ?? a.price.current}
              format={assetPrice}
              className="text-[1.8rem] font-medium"
            />
            <LiveNum
              value={live?.change ?? a.price.change}
              /* toFixed rend « 1.23 », qui n'est pas du français. */
              format={(v) =>
                `${v >= 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
              }
              tone={(live?.change ?? a.price.change) >= 0 ? "up" : "down"}
              className="text-[0.95rem]"
            />
            <RefreshTimer
              remaining={ticker.remaining}
              busy={ticker.busy}
              paused={ticker.paused}
              onRefresh={ticker.refreshNow}
              hint={tickerHint}
            />
          </div>

          <div className="mt-4">
            {/* « Tendance de fond », pas « Direction » : le mot mesure
                l'alignement du cours et de ses moyennes, pas le verdict. Sous
                un score de 71 et une proposition d'achat, « Direction :
                Neutre » se lisait comme une contradiction. */}
            <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
              Tendance de fond
            </span>
            <div
              className="cap-apparait mt-1 flex items-center gap-2 text-[1.25rem] font-semibold"
              style={{
                fontFamily: "var(--cap-font-display)",
                color: dir.tone === "up" ? "var(--cap-up)"
                  : dir.tone === "down" ? "var(--cap-down)" : "var(--cap-ink-2)",
                ["--d" as string]: ".25s",
              }}
            >
              {/* Le sens, dit aussi par un signe qui bouge doucement dans ce
                  sens : vers le haut, vers le bas, ou de côté. */}
              {dir.tone === "up" ? (
                <TrendingUp aria-hidden className="cap-dir-fleche h-5 w-5" style={{ ["--fy" as string]: "-3px" }} />
              ) : dir.tone === "down" ? (
                <TrendingDown aria-hidden className="cap-dir-fleche h-5 w-5" style={{ ["--fy" as string]: "3px" }} />
              ) : (
                <MoveRight aria-hidden className="cap-dir-fleche h-5 w-5" style={{ ["--fx" as string]: "3px", ["--fy" as string]: "0px" }} />
              )}
              {dir.text}
            </div>
            {tendanceExpliquee(a, assetPrice) && (
              <Text size="small" className="mt-1 max-w-[36rem]">{tendanceExpliquee(a, assetPrice)}</Text>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {/* Le score PONDÉRÉ PAR LE PROFIL, pas le générique.
              L'écran envoyait déjà les paramètres du style de trading,
              multiples d'ATR et poids des fondamentaux, et le moteur
              renvoyait les deux scores. Seul le générique était affiché : sur
              AAPL, 69 alors que le score du profil valait 71. Les paramètres
              promettent noir sur blanc que le style « change le poids des
              fondamentaux dans le score » ; la promesse était tenue par le
              moteur et perdue à l'affichage. */}
          <ScoreDial score={Math.round(a.profile_score?.total ?? a.score.total)} size={124} />
        </div>
      </div>

      {/* Nimbo propose — ou dit pourquoi il ne propose pas. Juste sous le
          verdict, avant les raisons : c'est la question que se pose celui qui
          ouvre une analyse (« j'y vais ? »), la réponse ne doit pas attendre
          au bas de la carte. */}
      <PropositionNimbo analysis={a} assetPrice={assetPrice} cours={live?.price ?? a.price.current} planHref={planHref}
        onPasserEnSwing={onPasserEnSwing} />

      {/* The why. The part the product exists for. */}
      <div className="mt-7 border-t pt-6" style={{ borderColor: "var(--cap-line)" }}>
        <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
          Pourquoi
        </span>
        <ul className="cap-liste mt-4 space-y-2.5">
          {reasons.map((r, i) => (
            <li key={r.text} className="flex gap-3">
              <span
                aria-hidden
                className="cap-trait mt-[0.55rem] h-px w-3 shrink-0"
                style={{
                  ["--d" as string]: `${(0.2 + i * 0.07).toFixed(2)}s`,
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
        <div className="cap-apparait mt-6 border-t pt-5" style={{ borderColor: "var(--cap-line)", ["--d" as string]: ".35s" }}>
          <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
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

    </Panel>
  );
}

/**
 * Nimbo propose de prendre position.
 *
 * Quand le plan tient (aucun blocage, plan non illustratif), Nimbo le dit à la
 * première personne, avec les niveaux et un gros bouton qui ouvre l'ordre
 * pré-rempli. Sinon il dit qu'il ne propose rien et pourquoi — la première
 * raison bloquante — mais la prise de position reste possible depuis sa
 * carte : un bouton secondaire, « quand même », et un avertissement clair.
 */
function PropositionNimbo({
  analysis: a,
  assetPrice,
  cours,
  planHref,
  onPasserEnSwing,
}: {
  analysis: Analysis;
  assetPrice: (v: number) => string;
  cours: number;
  planHref: string;
  onPasserEnSwing?: () => void;
}) {
  const nom = a.company?.name || a.symbol;
  const plan = a.risk?.suggested_sl != null && a.risk?.suggested_tp != null ? a.risk : null;
  const blocage = a.tradeability?.blockers?.[0];
  // L'intraday, mesuré sans avantage après frais : Nimbo ne propose rien et
  // le dit sans détour — la raison n'est pas CET actif, c'est l'horizon.
  const intraday = !!blocage?.startsWith("Intraday");
  // Le cas qui déroute : un bon score, et pourtant rien. Le plus souvent,
  // l'objectif bute sur un niveau tout proche (plafonné à la résistance) et
  // le rapport gain / risque tombe sous 1,2. Nimbo le dit avec les chiffres
  // plutôt que de citer la règle : bon signal, mauvais endroit.
  const butee =
    !!plan && (!!plan.tp_capped_at_level || !!plan.obstacle) && !!blocage?.startsWith("Rapport gain/risque") && !!a.levels
      ? {
          niveau: plan.direction === "SHORT" ? a.levels.support : a.levels.resistance,
          repli: plan.direction === "SHORT" ? a.levels.resistance : a.levels.support,
          marge: Math.abs((plan.tp_structure ?? plan.suggested_tp) - cours),
          risque: Math.abs(cours - plan.suggested_sl),
        }
      : null;
  const score = Math.round(a.profile_score?.total ?? a.score.total);
  // L'autre cas qui déroute : le signal seul passerait, mais une porte de
  // contexte le ramène au neutre — le plus souvent la tendance de l'unité
  // supérieure. Nimbo le dit, avec la mesure qui justifie la porte.
  const seuil = a.seuil_achat?.valeur ?? 60;
  const portes = a.portes;
  const freine =
    !!portes && !!blocage?.startsWith("Verdict neutre") && portes.score_avant >= seuil
    && a.score.total < seuil && (portes.unite_superieure < 0 || portes.contexte < 0)
      ? {
          avant: Math.round(portes.score_avant),
          retire: Math.round(-(portes.unite_superieure + portes.contexte)),
          raisons: [
            portes.unite_superieure < 0 && a.higher_timeframe?.interval
              ? `la tendance ${UNITE_SUP[a.higher_timeframe.interval] ?? "de fond"} est baissière`
              : null,
            portes.contexte < 0 && a.market_context
              ? a.market_context.regime === "BEAR"
                ? `le marché de référence (${NOM_INDICE[a.market_context.benchmark] ?? a.market_context.benchmark}) baisse`
                : `l'actif fait moins bien que son marché (${NOM_INDICE[a.market_context.benchmark] ?? a.market_context.benchmark})`
              : null,
          ].filter(Boolean).join(", et "),
        }
      : null;
  const proposeMoteur = !!plan && !plan.illustratif && !blocage;
  const vente = plan?.direction === "SHORT";
  const ton = directionLabel(a).tone;

  // Le risque que l'utilisateur accepte : son réglage, que le bouton rotatif
  // du haut de page modifie. Il règle la taille de la position, pas le plan.
  const { settings } = useSettings();
  const niveau = niveauRisque(settings.riskLevel);
  const [capital, setCapital] = useState<number | null>(null);
  useEffect(() => {
    walletAPI.getBalance().then((b) => setCapital(b.balance)).catch(() => {});
  }, []);
  const somme = useFormatSomme();
  const pct = RISQUE[niveau].pct;
  const taille = capital != null && plan ? tailleSelonRisque(capital, pct, cours, plan.suggested_sl) : null;
  const perte = taille ? taille.perte : capital != null ? (capital * pct) / 100 : null;
  // C'est le MOTEUR qui décide : pour un profil agressif en journalier, il
  // propose l'achat dès 55 (voir _risque.py côté serveur) et le dit ici.
  const scoreMoteur = a.score.total;
  const parSeuilAgressif = proposeMoteur && !!a.seuil_achat?.abaisse;
  const propose = proposeMoteur;
  const href = `${planHref}&risk=${pct}`;
  const humeur = propose ? "cap" : ton !== "up" && ton !== "down" ? "reflechit" : "prudent";

  const teinte = propose ? "var(--cap-up)" : "var(--cap-amber)";

  // Le premier parcours (lib/parcours.ts) : l'étape « analyser avec Nimbo »
  // est faite quand son avis a été VU, pas seulement chargé en bas de page.
  const carte = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = carte.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { noterGeste("analyse"); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section
      ref={carte}
      aria-label={propose ? "Proposition de Nimbo" : "Nimbo ne propose pas de position"}
      className="cap-apparait mt-6 rounded-[var(--cap-r-lg)] p-4 sm:p-5"
      style={{
        backgroundColor: `color-mix(in srgb, ${teinte} ${propose ? 8 : 7}%, var(--cap-surface))`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${teinte} 32%, transparent)`,
        ["--d" as string]: ".15s",
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Nimbo humeur={humeur} taille={104} className="-my-2 -ml-2 hidden sm:inline-flex" />
        <Nimbo humeur={humeur} taille={64} className="-my-1 -ml-1 sm:hidden" />
        <div className="min-w-0 flex-1">
          <span className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
            {propose ? "Nimbo vous propose" : "L'avis de Nimbo"}
          </span>
          <p className="mt-1 text-[1.05rem] font-semibold leading-snug sm:text-[1.15rem]" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
            {propose && plan
              ? `${vente ? "Vendre à découvert" : "Acheter"} ${nom} : je vous propose de prendre position.`
              : intraday
                ? "Je ne propose pas de position en intraday."
                : `Je ne vous propose pas de position sur ${nom} pour l'instant.`}
          </p>
          <Text size="small" className="mt-1.5">
            {propose && plan
              ? <>
                  Stop à {assetPrice(plan.suggested_sl)}, objectif à {assetPrice(plan.suggested_tp)} : vous risquez 1 pour viser {fr(plan.risk_reward, 1)}.
                  {/* UN ACHAT CONTRE LA TENDANCE DE FOND, DIT COMME TEL. Le
                      score peut porter un achat quand la tendance n'est pas
                      encore retournée (un rebond porté par le momentum) : la
                      carte le dit, au lieu de laisser « Neutre » au-dessus
                      faire douter de la proposition. */}
                  {(vente ? ton !== "down" : ton !== "up") && (
                    <> {vente
                      ? "C'est une vente sur un essoufflement : la tendance de fond n'est pas encore baissière."
                      : "C'est un achat de rebond : la tendance de fond n'est pas encore haussière."}{" "}
                      Le signal vient {a.score.momentum >= 60 ? `surtout du momentum (${Math.round(a.score.momentum)}/100)` : "de l'ensemble des signaux"},
                      et le stop borne la perte si le mouvement échoue.</>
                  )}
                  {plan.obstacle && !plan.tp_capped_at_level && plan.tp_structure != null && (
                    <> {vente ? "Un support" : "Une résistance"} à {assetPrice(plan.tp_structure)} est sur la route : je vise
                      au-delà, mesuré sur 40 actifs, ça a mieux payé que de s&apos;y arrêter.</>
                  )}
                  {parSeuilAgressif && (
                    <> Le score ({Math.round(scoreMoteur)}) est sous 60, mais avec votre profil {RISQUE[niveau].label.toLowerCase()} je
                      propose aussi les achats dès {a.seuil_achat?.valeur} en journalier : sur 40 actifs, ils ont rapporté +0,21 et +0,26 R
                      par trade sur deux périodes, un peu moins que les signaux plus nets.</>
                  )}
                  {taille?.position != null && (
                    <> Avec votre risque {RISQUE[niveau].label.toLowerCase()}, la position fait environ {somme(taille.position)}
                      {taille.plafonnee ? ", tout votre capital, le plafond" : ""}.</>
                  )}
                </>
              : intraday
                ? <>
                    J&apos;ai rejoué mes signaux sur 40 actifs : sur des mouvements de quelques minutes ou
                    quelques heures, les frais mangent le gain. En 5 minutes, même mes meilleurs signaux
                    perdaient en moyenne le tiers de la somme risquée à chaque trade ; en 1 h et en 4 h, ils ne
                    gagnaient rien une fois les frais payés. Ici, vous pouvez analyser et vous entraîner
                    (« quand même » ci-dessous), les positions que je propose, c&apos;est en Swing, sur
                    plusieurs jours, là où mes signaux ont gagné.
                    {onPasserEnSwing && (
                      <button
                        type="button"
                        onClick={onPasserEnSwing}
                        className="ml-1 inline font-medium underline underline-offset-2"
                        style={{ color: "var(--cap-ocean)" }}
                      >
                        Passer en Swing
                      </button>
                    )}
                  </>
              : freine
                ? <>
                    Le signal seul serait à {freine.avant}/100, mais {freine.raisons} : le moteur retire{" "}
                    {freine.retire} points et attend que le vent tourne.
                    {a.timeframe === "1d" && portes && portes.unite_superieure < 0 && (
                      <> Mesuré sur 40 actifs, les achats qu&apos;il écarte ainsi ont rapporté moins que ceux
                        qu&apos;il garde : +0,13 et +0,30 R par trade sur deux périodes, contre +0,43 et +0,40 R.</>
                    )}
                  </>
              : butee
                ? <>
                    Le signal est bon ({score}/100), mais le cours est juste {vente ? "au-dessus d'un support" : "sous une résistance"} à{" "}
                    {assetPrice(butee.niveau)} : {pctEcart(butee.marge, cours)} de marge pour {pctEcart(butee.risque, cours)} de risque.
                    Si {vente ? "ce support cède" : "cette résistance cède"}, ou si le cours revient vers {assetPrice(butee.repli)},
                    le calcul change, revenez voir.
                  </>
              : blocage
                ? <>{blocage}.</>
                : "Le moteur ne voit pas de plan assez net."}
          </Text>
          {/* Quand revenir : calculé par le serveur (_revoir.py), la même
              phrase que sur la carte du scanner. */}
          {!propose && a.nimbo?.revoir && (
            <p className="mt-2 text-[0.92rem] italic" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>
              {a.nimbo.revoir.texte}
            </p>
          )}
        </div>
      </div>

      {plan && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <RiskBit label="Stop" value={assetPrice(plan.suggested_sl)} tone="down" />
            <RiskBit label="Objectif" value={assetPrice(plan.suggested_tp)} tone="up" />
            <RiskBit label="Risque / rendement" value={`1 : ${fr(plan.risk_reward, 1)}`} />
            {taille?.position != null && <RiskBit label="Taille de position" value={somme(taille.position)} />}
            {perte != null && (
              <RiskBit label={`Perte au stop (${RISQUE[niveau].pct.toLocaleString("fr-FR")} %)`} value={somme(perte)} tone="down" />
            )}
          </div>
          <div className="mt-3">
            <PlanBar stop={plan.suggested_sl} objectif={plan.suggested_tp} cours={cours} />
          </div>
        </div>
      )}

      {/* Ce qui tombe PENDANT le trade : une publication de résultats, une
          décision de la Fed ou de la BCE. Un avertissement, pas un refus. */}
      {plan && a.evenements_plan && (a.evenements_plan.resultats || a.evenements_plan.macro.length > 0) && (
        <PendantLeTrade ev={a.evenements_plan} />
      )}

      {/* Le même pari, deux fois : des positions ouvertes qui bougent comme
          celle-ci. Les stops sautent ensemble le jour où ça se retourne. */}
      {plan && (a.correlation_positions?.proches.length ?? 0) > 0 && (
        <MemePari c={a.correlation_positions!} vente={plan.direction === "SHORT"} />
      )}

      {/* Ce qui arrive EN VRAI aux achats comparables : l'utilisateur doit
          savoir, avant d'entrer, que le stop sera souvent touché, et que
          l'ensemble gagne quand même. Seulement quand Nimbo propose. */}
      {propose && a.probabilites && <DixAchats p={a.probabilites} />}

      {/* La prise de position passe TOUJOURS par Nimbo. Quand il propose,
          bouton plein ; quand il ne propose pas, le bouton reste là, en
          retrait, et Nimbo dit franchement qu'il ne le conseille pas, c'est
          de l'argent virtuel, se tromper ici fait partie de l'apprentissage. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2" data-visite="analyse-position">
        <Button href={href} size="lg" variant={propose ? "primary" : "secondary"} className="w-full sm:w-auto">
          {propose ? "Prendre position" : "Prendre position quand même"}
          <ArrowRight className="cap-fleche h-4 w-4" />
        </Button>
        <Text size="caption" className="max-w-[30rem]">
          {propose
            ? "Argent virtuel, l'ordre s'ouvre pré-rempli, vous validez."
            : plan
              ? "Je ne vous le conseille pas, mais c'est vous qui décidez : l'ordre s'ouvre avec ce plan d'exemple, modifiable. Argent virtuel."
              : "Je ne vous le conseille pas, mais c'est vous qui décidez : l'ordre s'ouvre sans niveaux, à vous de poser stop et objectif. Argent virtuel."}
        </Text>
      </div>
    </section>
  );
}

function quandRelatif(dans: number, dateLongue: string): string {
  if (dans === 0) return "aujourd'hui";
  if (dans === 1) return "demain";
  if (dans <= 6) return `dans ${dans} jours`;
  return `le ${dateLongue}`;
}

/**
 * Les rendez-vous qui tombent avant l'échéance du plan. Mesuré (backend
 * _evenements.py) : les achats qui enjambent une publication n'ont pas fait
 * pire en moyenne, mais leurs écarts sont plus grands — d'où un
 * avertissement, et pas un refus.
 */
function PendantLeTrade({ ev }: { ev: NonNullable<Analysis["evenements_plan"]> }) {
  const lignes: { cle: string; titre: string; texte: string }[] = [];
  if (ev.resultats) {
    lignes.push({
      cle: "res",
      titre: `Résultats ${quandRelatif(ev.resultats.dans_jours, ev.resultats.date_longue)}`,
      texte: "Le cours peut ouvrir loin de la veille, y compris par-dessus votre stop. Sur 24 actions, ces trades n'ont pas fait pire en moyenne, mais avec des écarts plus grands, dans les deux sens.",
    });
  }
  for (const m of ev.macro) {
    lignes.push({
      cle: m.banque,
      titre: `Décision de ${m.banque === "FED" ? "la Fed" : "la BCE"} ${quandRelatif(m.dans_jours, m.date_longue)}`,
      texte: `Une surprise sur les taux le pousse plutôt à la ${m.sens_si_restrictive > 0 ? "hausse" : "baisse"} si elle durcit le ton, l'inverse sinon : ce jour-là, le cours peut bouger fort.`,
    });
  }
  return (
    <div className="cap-encart mt-5" style={{ borderLeftColor: "var(--cap-ambre)" }}>
      <p className="cap-encart-titre">Pendant votre trade</p>
      <ul className="mt-2 space-y-2">
        {lignes.map((l) => (
          <li key={l.cle}>
            <span className="text-[0.9rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{l.titre}</span>
            <Text size="small" as="span"> : {l.texte.charAt(0).toLowerCase() + l.texte.slice(1)}</Text>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Les positions déjà ouvertes qui gagnent et perdent avec celle-ci —
 * corrélation des rendements journaliers sur 90 séances, au-dessus de 0,7.
 */
function MemePari({ c, vente }: { c: NonNullable<Analysis["correlation_positions"]>; vente: boolean }) {
  const n = c.proches.length;
  return (
    <div className="mt-3 rounded-[var(--cap-r-md)] p-3.5"
      style={{ backgroundColor: "color-mix(in srgb, var(--cap-amber) 7%, var(--cap-surface))", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--cap-amber) 30%, transparent)" }}>
      <p className="flex items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
        <Layers aria-hidden className="h-3.5 w-3.5" />
        Déjà dans votre portefeuille
      </p>
      <Text size="small" className="mt-2">
        {n === 1 ? "Une de vos positions ouvertes bouge" : `${n} de vos positions ouvertes bougent`} presque comme
        celle-ci :{" "}
        {c.proches.slice(0, 4).map((p, i) => (
          <span key={p.symbol}>
            {i > 0 && ", "}
            <Link href={`/analysis?symbol=${encodeURIComponent(p.symbol)}`} className="font-semibold underline underline-offset-2"
              style={{ color: "var(--cap-ink)" }}>{p.nom || p.symbol}</Link>
            {" "}({p.direction === "SHORT" ? "vente, " : ""}corrélation {fr(p.correlation, 2)})
          </span>
        ))}
        . {vente ? "Vendre" : "Acheter"} celle-ci, c&apos;est surtout renforcer le même pari : si le marché se retourne, les
        stops risquent de sauter ensemble. Réduisez la taille{n === 1 ? ", ou gardez la meilleure des deux" : ""}.
      </Text>
    </div>
  );
}

/**
 * Sur dix achats comparables : combien ont atteint l'objectif, touché le
 * stop, ou sont sortis à l'échéance. Une rangée de dix points plutôt qu'un
 * pourcentage : « 2 sur 10 » se retient, « 23 % » se lit comme une note.
 */
function DixAchats({ p }: { p: NonNullable<Analysis["probabilites"]> }) {
  const { objectif, stop, echeance } = p.sur_dix;
  const points = [
    ...Array(objectif).fill("var(--cap-up)"),
    ...Array(stop).fill("var(--cap-down)"),
    ...Array(echeance).fill("var(--cap-ink-4)"),
  ];
  const gain = Math.round(p.echeance_en_gain * 10);
  return (
    <div className="cap-encart mt-5">
      <p className="cap-encart-titre">Sur 10 achats comparables</p>
      <div className="mt-2 flex gap-1.5" role="img"
        aria-label={`${objectif} objectifs atteints, ${stop} stops touchés, ${echeance} sorties à l'échéance, sur dix achats`}>
        {points.map((c, i) => (
          <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </div>
      <Text size="small" tone="ink" className="mt-2.5">
        <strong style={{ color: "var(--cap-up)" }}>{objectif}</strong> ont atteint l&apos;objectif (en {p.duree_objectif_seances} séances
        environ), <strong style={{ color: "var(--cap-down)" }}>{stop}</strong> ont touché le stop
        {echeance > 0 && <>, <strong>{echeance}</strong> sont sortis au bout de {p.echeance_seances} séances, {gain} fois sur 10 en gain</>}.
        Le stop sera donc souvent touché : c&apos;est normal. Au total, ces achats ont gagné, parce que l&apos;objectif
        vise bien plus loin que le stop.
      </Text>
      <Text size="caption" className="mt-1.5">
        Mesuré sur {p.n.toLocaleString("fr-FR")} achats du moteur, {p.actifs} actifs, horizon {p.libelle}, frais compris,
        sur l&apos;ensemble des actifs, pas sur celui-ci en particulier.{" "}
        <Link href="/nimbo" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>
          Et en vrai, depuis que je propose ?
        </Link>
      </Text>
    </div>
  );
}

/** Le prix au comptant qu'un courtier affiche pour ces contrats à terme. */
const COMPTANT: Record<string, string> = {
  "GC=F": "XAU/USD", "SI=F": "XAG/USD", "PL=F": "XPT/USD", "PA=F": "XPD/USD",
  "CL=F": "WTI au comptant", "BZ=F": "Brent au comptant", "NG=F": "gaz naturel au comptant",
};

/** L'unité supérieure, dite en français. */
const UNITE_SUP: Record<string, string> = {
  "1h": "horaire", "1d": "journalière", "1wk": "hebdomadaire", "1mo": "mensuelle",
};
const NOM_INDICE: Record<string, string> = {
  "^GSPC": "S&P 500", "^STOXX50E": "Euro Stoxx 50", "^N225": "Nikkei 225", "BTC-USD": "Bitcoin",
};

/** Un écart de prix en pourcentage du cours — lisible quel que soit l'actif,
 *  là où « 0,51000 € » garde toutes les décimales d'un cours. */
function pctEcart(ecart: number, cours: number): string {
  const v = (ecart / cours) * 100;
  return `${fr(v, v < 1 ? 2 : 1)} %`;
}

/**
 * Le plan, dessiné : de l'invalidation à l'objectif, avec le cours entre les
 * deux. Le rapport risque / rendement se lit alors d'un coup d'œil — la part
 * rouge contre la part verte — au lieu d'un « 1 : 2,1 » à décoder. Les deux
 * segments se tracent depuis le cours, qui apparaît ensuite.
 */
function PlanBar({ stop, objectif, cours }: { stop: number; objectif: number; cours: number }) {
  const bas = Math.min(stop, objectif), haut = Math.max(stop, objectif);
  if (!(haut > bas) || !Number.isFinite(cours)) return null;
  const pos = Math.min(0.96, Math.max(0.04, (cours - bas) / (haut - bas)));
  const stopAGauche = stop < objectif;
  const gauche = stopAGauche ? "var(--cap-down)" : "var(--cap-up)";
  const droite = stopAGauche ? "var(--cap-up)" : "var(--cap-down)";
  const pct = `${(pos * 100).toFixed(1)}%`;
  return (
    <div aria-hidden className="w-full pt-1">
      <div className="relative h-[6px] rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
        <span className="cap-plan-seg absolute inset-y-0 left-0 rounded-l-full"
          style={{ width: pct, backgroundColor: gauche, opacity: 0.85, ["--o" as string]: "100%" }} />
        <span className="cap-plan-seg absolute inset-y-0 right-0 rounded-r-full"
          style={{ left: pct, backgroundColor: droite, opacity: 0.85, ["--o" as string]: "0%" }} />
        {/* Deux étages : le centrage (translate) et l'apparition (scale)
            ne peuvent pas partager la même propriété transform. */}
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2" style={{ left: pct }}>
          <span className="cap-pop block h-full w-full rounded-full"
            style={{ backgroundColor: "var(--cap-surface)", boxShadow: "0 0 0 2px var(--cap-ink), 0 2px 6px rgba(11,23,38,.25)", ["--d" as string]: ".9s" }} />
        </span>
      </div>
      <div className="relative mt-2 flex justify-between text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>
        <span>{stopAGauche ? "Stop" : "Objectif"}</span>
        {/* Sous le point du cours, tant qu'il ne chevauche pas les bouts. */}
        {pos > 0.14 && pos < 0.86 && (
          <span className="absolute top-0 -translate-x-1/2" style={{ left: pct, color: "var(--cap-ink-2)" }}>Cours</span>
        )}
        <span>{stopAGauche ? "Objectif" : "Stop"}</span>
      </div>
    </div>
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

function Intermediate({ analysis: a, assetPrice }: { analysis: Analysis; assetPrice: (v: number) => string }) {
  const subs = [
    { label: "Technique", value: a.score.technical },
    { label: "Volume", value: a.score.volume },
    { label: "Momentum", value: a.score.momentum },
    // La composante la plus lourde depuis le moteur 2.1 : sans elle, les
    // barres ci-dessous ne pesaient plus que 40 % du score affiché.
    ...(a.indicators?.extension?.score != null
      ? [{ label: "Écart à la moyenne 200 (60 % du score)", value: a.indicators.extension.score }]
      : []),
    ...(a.score.fundamental != null ? [{ label: "Fondamentaux", value: a.score.fundamental }] : []),
  ].filter((s) => Number.isFinite(s.value));

  const w = a.trade_window;

  return (
    <div className="cap-apparait grid gap-5 lg:grid-cols-2">
      {/* Combien de temps tenir. Le moteur le calculait — bornes, durée
          optimale, niveau de risque, raisons et avertissements, tout en
          français, et rien ne l'affichait. Dans un outil de trading, « je
          garde ça combien de temps » est une question de premier plan, pas
          un détail. */}
      {w?.label_optimal && (
        <Panel
          title="Combien de temps tenir"
          hint={["1d", "1w", "1mo"].includes(w.bar_label ?? a.timeframe)
            ? "Mesuré sur 40 actifs : le temps qu'il a fallu, en pratique, aux trades de ce moteur."
            : `Estimé à partir de la volatilité et de la force de la tendance, en bougies de ${w.bar_label ?? a.timeframe}.`}
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
              Cette estimation est peu fiable sur cet actif, les données ne
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
          format={assetPrice}
        />
        {a.higher_timeframe?.interval && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
            <Text size="small">
              Unité de temps supérieure ({a.higher_timeframe.interval}) :{" "}
              <strong style={{ color: "var(--cap-ink)" }}>
                {a.higher_timeframe.trend === "BULLISH" ? "haussière"
                  : a.higher_timeframe.trend === "BEARISH" ? "baissière" : "neutre"}
              </strong>
              {a.higher_timeframe.aligned === false && ", en désaccord avec l'horizon affiché."}
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
                value={`${a.market_context.relative_strength >= 0 ? "+" : ""}${fr(a.market_context.relative_strength, 1)} pts`}
                tone={a.market_context.relative_strength >= 0 ? "up" : "down"}
              />
            )}
            {a.market_context.correlation != null && (
              <Row label="Corrélation" value={fr(a.market_context.correlation, 2)} />
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

function Advanced({ analysis: a, assetPrice }: { analysis: Analysis; assetPrice: (v: number) => string }) {
  const aExpliquer = a.personnel?.a_expliquer;
  const ind = a.indicators;
  const f = a.fundamentals;

  const t = a.targets;
  const vol = a.volatility;

  return (
    <div className="cap-apparait grid gap-5 lg:grid-cols-2">
      {/* Les trois scénarios de prix et l'avis des analystes. Calculés depuis
          toujours, jamais montrés. Ils vont au niveau Avancé parce qu'une
          cible chiffrée se lit comme une promesse quand on débute, alors que
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
                <Num tone="down" className="text-[1.15rem]">{assetPrice(t.bear)}</Num>
                <Text size="caption" className="mt-1">Défavorable</Text>
              </div>
            )}
            {t.base != null && (
              <div>
                <Num className="text-[1.3rem]">{assetPrice(t.base)}</Num>
                <Text size="caption" className="mt-1">Central</Text>
              </div>
            )}
            {t.bull != null && (
              <div>
                <Num tone="up" className="text-[1.15rem]">{assetPrice(t.bull)}</Num>
                <Text size="caption" className="mt-1">Favorable</Text>
              </div>
            )}
            {t.analyst_mean != null && (
              <div className="border-l pl-8" style={{ borderColor: "var(--cap-line)" }}>
                <Num tone="accent" className="text-[1.15rem]">{assetPrice(t.analyst_mean)}</Num>
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
              Volatilité annualisée : {vol["20d"] != null ? `${fr(vol["20d"], 1)} % sur 20 jours` : ""}
              {vol["20d"] != null && vol["60d"] != null ? ", " : ""}
              {vol["60d"] != null ? `${fr(vol["60d"], 1)} % sur 60 jours` : ""}
              {vol["20d"] != null && vol["60d"] != null && vol["20d"] > vol["60d"] * 1.2
                ? ", l'agitation récente dépasse la normale de cet actif."
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
            cle="rsi"
            aExpliquer={aExpliquer}
            value={fr(ind.rsi.value, 1)}
            meaning={
              ind.rsi.value >= 70 ? "Au-dessus de 70 : l'actif a beaucoup monté vite, un repli est fréquent."
              : ind.rsi.value <= 30 ? "Sous 30 : l'actif a beaucoup baissé vite, un rebond est fréquent."
              : "Entre 30 et 70 : ni suracheté ni survendu."
            }
          />
          <Indicator
            name="MACD"
            cle="macd"
            aExpliquer={aExpliquer}
            value={fr(ind.macd.histogram, 4)}
            tone={ind.macd.histogram >= 0 ? "up" : "down"}
            meaning={
              ind.macd.histogram >= 0
                ? "L'histogramme est positif : la dynamique courte dépasse la dynamique longue."
                : "L'histogramme est négatif : la dynamique courte passe sous la longue."
            }
          />
          <Indicator
            name="Moyennes mobiles"
            cle="ema"
            aExpliquer={aExpliquer}
            value={`${assetPrice(ind.ema.ema20)} / ${assetPrice(ind.ema.ema50)}${ind.ema.ema200 != null ? ` / ${assetPrice(ind.ema.ema200)}` : ""}`}
            meaning={
              ind.ema.ema20 > ind.ema.ema50
                ? "La moyenne courte est au-dessus de la longue : structure haussière."
                : "La moyenne courte est sous la longue : structure baissière."
            }
          />
          {ind.adx && (
            <Indicator
              name="ADX"
            cle="adx"
            aExpliquer={aExpliquer}
              value={fr(ind.adx.value, 1)}
              meaning={
                ind.adx.value >= 25
                  ? "Au-dessus de 25 : il y a une vraie tendance, dans un sens ou dans l'autre."
                  : "Sous 25 : pas de tendance nette, le prix oscille."
              }
            />
          )}
          <Indicator
            name="ATR"
            cle="atr"
            aExpliquer={aExpliquer}
            value={fr(ind.atr, 4)}
            meaning="L'amplitude moyenne d'une bougie. C'est ce qui dimensionne le stop : trop près, il saute sur du bruit."
          />
          <Indicator
            name="Volume"
            cle="volume"
            aExpliquer={aExpliquer}
            value={`${fr(ind.volume_ratio, 2)}×`}
            tone={ind.volume_ratio >= 1.2 ? "up" : ind.volume_ratio <= 0.7 ? "down" : "ink"}
            meaning={
              ind.volume_ratio >= 1.2 ? "Au-dessus de la moyenne : le mouvement est soutenu par les échanges."
              : ind.volume_ratio <= 0.7 ? "Sous la moyenne : peu de participants derrière ce mouvement."
              : "Dans la moyenne."
            }
          />
          <Indicator
            name="Bandes de Bollinger"
            cle="bollinger"
            aExpliquer={aExpliquer}
            value={`${assetPrice(ind.bollinger.lower)}, ${assetPrice(ind.bollinger.upper)}`}
            meaning="L'enveloppe dans laquelle le prix évolue habituellement. Des bandes resserrées précèdent souvent un mouvement."
          />
          {ind.stochastic && (
            <Indicator
              name="Stochastique"
              value={`${fr(ind.stochastic.k, 1)} / ${fr(ind.stochastic.d, 1)}`}
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
              <Row label="Données manquantes" value={`${fr(a.data_quality.nan_ratio * 100, 1)} %`} />
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
          hint="Chaque cellule avec son nombre de trades, un échantillon de douze n'est pas un échantillon de quarante."
        >
          <dl className="space-y-3">
            {Object.entries(a.historical_edge.by_regime).map(([reg, s]) => (
              <Row
                key={reg}
                label={`${reg} · ${s.n_trades} trades`}
                value={
                  s.enough
                    ? `${s.expectancy_net_r >= 0 ? "+" : ""}${fr(s.expectancy_net_r, 2)} R · ${fr(s.win_rate, 0)} %`
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
            {f.pe_ratio != null && <Row label="PER" value={fr(f.pe_ratio, 1)} />}
            {f.forward_pe != null && <Row label="PER prévisionnel" value={fr(f.forward_pe, 1)} />}
            {f.dividend_yield != null && <Row label="Rendement du dividende" value={`${fr(f.dividend_yield * 100, 2)} %`} />}
            {f.profit_margin != null && <Row label="Marge nette" value={`${fr(f.profit_margin * 100, 1)} %`} />}
            {f.revenue_growth != null && <Row label="Croissance du CA" value={`${fr(f.revenue_growth * 100, 1)} %`} tone={f.revenue_growth >= 0 ? "up" : "down"} />}
            {f.roe != null && <Row label="ROE" value={`${fr(f.roe * 100, 1)} %`} />}
            {f.debt_to_equity != null && <Row label="Dette / capitaux propres" value={fr(f.debt_to_equity, 2)} />}
            {f.beta != null && <Row label="Bêta" value={fr(f.beta, 2)} />}
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
                  value={`${a.performance[k]! >= 0 ? "+" : ""}${fr(a.performance[k]!, 2)} %`}
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
  cle,
  aExpliquer,
}: {
  name: string;
  value: string;
  meaning: string;
  tone?: "ink" | "up" | "down";
  /** La clé du moteur (`rsi`, `macd`, …), pour croiser avec ce que la
   *  personne a déclaré connaître. */
  cle?: string;
  /** Les indicateurs à expliquer. `undefined` = aucune réponse donnée, donc
   *  on explique tout — le comportement d'avant. */
  aExpliquer?: string[];
}) {
  // CE QUI EST MASQUÉ, C'EST LE COURS, PAS LA LECTURE.
  //
  // `meaning` dit ce que l'indicateur raconte AUJOURD'HUI sur CET actif :
  // ça, personne ne le sait d'avance, expert compris. Le lien vers la leçon,
  // lui, est une invitation à apprendre ce qu'est un RSI — inutile et un peu
  // vexante pour quelqu'un qui vient de cocher « je connais le RSI ».
  const connu = cle != null && aExpliquer != null && !aExpliquer.includes(cle);
  const lesson = connu ? null : lessonFor(name);
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
function ChartGuide({ analysis: a, assetPrice }: { analysis: Analysis; assetPrice: (v: number) => string }) {
  const dir = directionLabel(a);
  const steps: { title: string; body: string }[] = [
    {
      title: "1. La forme d'ensemble, avant les détails",
      body: `Reculez jusqu'à voir plusieurs mois. Ce qui compte d'abord n'est pas la dernière bougie mais la pente : une suite de sommets et de creux de plus en plus hauts est une tendance haussière, l'inverse une baissière. Ici le moteur la lit comme ${dir.text.toLowerCase()}.`,
    },
    {
      title: "2. Les paliers où le prix a déjà réagi",
      body: `Les zones où le cours a buté plusieurs fois comptent plus que les autres. Sur cet actif, le support mesuré est à ${assetPrice(a.levels.support)} et la résistance à ${assetPrice(a.levels.resistance)}, deux repères, pas deux certitudes : ils cèdent régulièrement.`,
    },
    {
      title: "3. Le volume, sous le prix",
      body:
        a.indicators?.volume_ratio != null
          ? `La barre du bas dit combien d'échanges ont eu lieu. Un mouvement sans volume est fragile. Ici le volume vaut ${fr(a.indicators.volume_ratio, 1)} fois sa moyenne${a.indicators.volume_ratio >= 1.3 ? ", le mouvement est confirmé par les échanges." : a.indicators.volume_ratio <= 0.6 ? ", peu d'échanges derrière ce mouvement." : "."}`
          : "La barre du bas dit combien d'échanges ont eu lieu. Un mouvement de prix accompagné d'un fort volume est plus fiable qu'un mouvement dans le vide.",
    },
    {
      title: "4. L'unité de temps change tout",
      body: `Le même actif paraît haussier en 1 jour et baissier en 5 minutes. Choisissez l'unité qui correspond à la durée pendant laquelle vous comptez rester${a.trade_window?.label_optimal ? `, pour cet actif, le moteur estime ${a.trade_window.label_optimal}` : ""}. Les boutons d'horizon en haut de page la règlent pour toute l'analyse.`,
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
          href={lessonHref("lecon/1")}
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

/** Le plan à dessiner sur le graphique commenté : celui de la proposition. */
function planDessine(a: Analysis): PlanDessine | null {
  const r = a.risk;
  if (!r?.suggested_sl || !r?.suggested_tp || !a.price?.current) return null;
  return {
    entree: a.price.current,
    stop: r.suggested_sl,
    objectif: r.suggested_tp,
    propose: !r.illustratif && !a.tradeability?.blockers?.length,
  };
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
  if (Math.abs(v) >= 1e12) return `${fr(v / 1e12, 2)} T`;
  if (Math.abs(v) >= 1e9) return `${fr(v / 1e9, 2)} Md`;
  if (Math.abs(v) >= 1e6) return `${fr(v / 1e6, 1)} M`;
  return v.toLocaleString("fr-FR");
}
