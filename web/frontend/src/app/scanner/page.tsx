"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Radar, RotateCcw } from "lucide-react";
import {
  analysisAPI,
  type ScanEvent, type ScanIntent, type ScanQuota, type ScanResultItem, type ScanUniverse,
} from "@/lib/api";
import { fr, useSettings } from "@/lib/SettingsContext";
import { TRADING_STYLE_IDS, TRADING_STYLES, useTradingStyle } from "@/lib/tradingStyle";
import { NIVEAUX_RISQUE, RISQUE, niveauRisque } from "@/lib/risque";
import { useUserLevel } from "@/hooks/useUserLevel";
import {
  Button, EmptyState, FormError, Heading, Panel, SegmentedControl, Text,
  WeatherBackdrop, useAnimationsEnabled, DUR, EASE,
} from "@/components/design-system";
import { UniversePicker, SELECTION_VIDE, type Selection } from "@/components/scanner/UniversePicker";
import { IntentBox } from "@/components/scanner/IntentBox";
import { Sweep, type SweepState } from "@/components/scanner/Sweep";
import { Opportunity } from "@/components/scanner/Opportunity";
import { avertissementSeance } from "@/components/scanner/horaires";
import { enregistrerScan } from "@/lib/scanNote";

/**
 * Le scanner.
 *
 * L'outil le plus utilisé du site, et celui qui tenait le moins ses
 * promesses. Trois choses le bridaient, toutes corrigées ici et dans le
 * moteur :
 *
 *   – IL NE VISAIT QU'UN MARCHÉ. « Uniquement Paris », « tout sauf la
 *     crypto », « les actions européennes et l'or » n'étaient pas
 *     exprimables. L'univers se compose maintenant sur deux axes ;
 *   – IL RENDAIT UN TABLEAU DE CHIFFRES. Des colonnes se comparent bien et ne
 *     s'expliquent pas : il fallait déjà savoir ce qu'on cherchait. Chaque
 *     opportunité tient désormais en deux phrases, dont celle qui donne le
 *     niveau d'invalidation ;
 *   – IL ATTENDAIT EN SILENCE. Plusieurs minutes de sablier sur l'univers
 *     complet. Le scan est diffusé au fil de l'eau et l'écran montre le
 *     balayage réel.
 *
 * Les résultats sont rangés PAR FAMILLE, pas par score. Une cassure imminente
 * et un rebond sur support ne se tradent pas au même moment ; un classement
 * unique trié par score les mélange en permanence et place toujours le même
 * type de configuration en tête.
 */

type Famille = "cassure" | "rebond" | "tendance";

const FAMILLES: { key: Famille; titre: string; quoi: string }[] = [
  { key: "cassure", titre: "Cassures", quoi: "Le cours bute sur un plafond ou sort d'une compression. Ça a une échéance." },
  { key: "rebond", titre: "Rebonds", quoi: "Le cours revient sur un support, ou le rythme vient de changer." },
  { key: "tendance", titre: "Tendances établies", quoi: "Rien d'imminent : un mouvement déjà en place, qu'on rejoint en cours de route." },
];

const CLE_SELECTION = "tdb_scan_selection";

/* Les unités, dites en français. « 1d » est un code : il a sa place dans une
   URL, pas dans une phrase qui explique à quelqu'un ce que l'outil va faire. */
const UNITE_FR: Record<string, string> = {
  "5m": "5 minutes", "15m": "15 minutes", "30m": "30 minutes",
  "1h": "1 heure", "4h": "4 heures",
  "1d": "journalier", "3d": "3 jours", "1w": "hebdomadaire",
  "1wk": "hebdomadaire", "1mo": "mensuel",
};
const uniteFr = (tf: string) => UNITE_FR[tf] ?? tf;

export default function ScannerPage() {
  const [animOn] = useAnimationsEnabled();
  const style = useTradingStyle();
  const { settings, saveSettings } = useSettings();
  const level = useUserLevel();
  const expert = level.level === "expert";

  const [universe, setUniverse] = useState<ScanUniverse | null>(null);
  const [sel, setSel] = useState<Selection>(SELECTION_VIDE);
  /* L'horizon peut venir de la phrase d'intention ; sinon c'est celui du
     profil. Une phrase ne doit pas modifier le réglage du compte, elle
     vaut pour ce scan-là. */
  const [horizonScan, setHorizonScan] = useState<string | null>(null);
  const [direction, setDirection] = useState<"long" | "short" | "both">("both");
  const [minScore, setMinScore] = useState(60);

  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState("");
  const [phase, setPhase] = useState("");
  const [sweep, setSweep] = useState<SweepState>({ symbols: [], done: new Map() });
  const [results, setResults] = useState<ScanResultItem[]>([]);
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [fini, setFini] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  /* LE PROFIL, CHANGEABLE ICI. Nimbo vérifie chaque opportunité avec
     l'horizon et le risque enregistrés : les changer change ce qu'il
     propose. On enregistre d'abord (le serveur relit le profil au moment du
     scan), puis on efface les résultats, qui ne valent plus pour ce profil.
     Le scan n'est pas relancé tout seul : il compte dans le quota du jour. */
  const [profilEnCours, setProfilEnCours] = useState(false);
  const [profilChange, setProfilChange] = useState(false);
  const changerProfil = async (patch: { tradingStyle?: string; riskLevel?: string }) => {
    setProfilEnCours(true);
    setErreur("");
    try {
      await saveSettings(patch);
      setHorizonScan(null);
      setResults([]);
      setFini(false);
      setProfilChange(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le profil n'a pas pu être enregistré.");
    } finally {
      setProfilEnCours(false);
    }
  };

  const abort = useRef<AbortController | null>(null);
  const t0 = useRef(0);

  /* L'univers et le quota, une fois. Le choix précédent est restauré : c'est
     un outil qu'on utilise tous les jours avec la même sélection, et la
     reposer à chaque visite serait une corvée quotidienne. */
  useEffect(() => {
    analysisAPI.getScanUniverse().then(setUniverse).catch(() => setUniverse(null));
    analysisAPI.getScanLimit().then(setQuota).catch(() => {});
    try {
      const brut = localStorage.getItem(CLE_SELECTION);
      if (brut) {
        const v = JSON.parse(brut);
        if (Array.isArray(v?.places) && Array.isArray(v?.classes))
          setSel({ zones: Array.isArray(v.zones) ? v.zones : [], places: v.places, classes: v.classes });
      }
    } catch { /* mode privé ou valeur abîmée : on garde le défaut */ }
  }, []);

  /* ON ENREGISTRE UN CHOIX, PAS UN ÉTAT.
   *
   * La sélection était sauvegardée par un effet dépendant de `sel`. Cet effet
   * s'exécutait au montage avec la valeur PAR DÉFAUT — capturée dans sa
   * clôture — et écrasait ce que l'effet de lecture venait tout juste de
   * lire. Poser un verrou levé par la lecture n'y changeait rien : les deux
   * effets tournent dans la même passe, le verrou était déjà levé.
   *
   * Mesuré deux fois : « Paris, 58 actifs » avant un rechargement, « 819
   * actifs » après. La persistance est maintenant déclenchée par l'action de
   * l'utilisateur, donc elle ne peut pas se produire quand il n'a rien fait. */
  /* Une intention pose des réglages, elle ne lance rien. L'utilisateur voit
     ce qui a changé et peut le reprendre avant de balayer, c'est la seule
     façon qu'un texte libre reste vérifiable. */
  const appliquerIntention = useCallback((it: ScanIntent) => {
    if (it.zones.length) {
      const s: Selection = { zones: it.zones, places: [], classes: [] };
      setSel(s);
      try { localStorage.setItem(CLE_SELECTION, JSON.stringify(s)); } catch { /* ignore */ }
    }
    if (it.timeframe) setHorizonScan(it.timeframe);
    if (it.min_score != null) setMinScore(it.min_score);
    setDirection(it.direction);
  }, []);

  const choisir = useCallback((s: Selection) => {
    setSel(s);
    try { localStorage.setItem(CLE_SELECTION, JSON.stringify(s)); }
    catch { /* mode privé : la sélection vaut pour cette visite */ }
  }, []);

  /* Combien d'actifs la sélection représente, calculé sur les effectifs que
     le serveur a donnés. Sans ce compte on coche à l'aveugle. */
  const compte = useMemo(() => {
    if (!universe) return null;
    // Les zones s'ADDITIONNENT — leurs effectifs se somment. Les places et
    // classes se CROISENT, il faut donc parcourir la grille des deux.
    if (sel.zones.length) {
      const z = universe.zones ?? [];
      return sel.zones.reduce((n, k) => n + (z.find((x) => x.key === k)?.count ?? 0), 0);
    }
    if (sel.places.length === 0 && sel.classes.length === 0) return universe.total;
    let n = 0;
    for (const pl of universe.places) {
      if (sel.places.length && !sel.places.includes(pl.key)) continue;
      for (const [cls, k] of Object.entries(pl.classes)) {
        if (sel.classes.length && !sel.classes.includes(cls)) continue;
        n += k;
      }
    }
    return n;
  }, [universe, sel]);

  /* L'avertissement de séance. Il se recalcule à la minute : une page laissée
     ouverte à 17 h 25 annoncerait sinon « Europe ouverte » jusqu'au
     lendemain, ce qui est pire que de ne rien dire. */
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinute((m) => m + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const seance = useMemo(() => {
    if (!universe) return null;
    const zones = universe.zones ?? [];
    // Aucune zone cochée = tout l'univers. Dire « l'Europe est fermée » d'un
    // balayage mondial serait faux : une partie de cet univers cote toujours,
    // ne serait-ce que la crypto.
    const choisies = sel.zones.length
      ? zones.filter((z) => sel.zones.includes(z.key))
      : [];
    return avertissementSeance(choisies);
    // `minute` est une dépendance volontaire : c'est l'horloge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universe, sel.zones, minute]);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setElapsed((Date.now() - t0.current) / 1000), 250);
    return () => clearInterval(id);
  }, [busy]);

  const lancer = useCallback(async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;

    setBusy(true);
    setFini(false);
    setErreur("");
    setResults([]);
    setSweep({ symbols: [], done: new Map() });
    setPhase("Préparation du balayage");
    t0.current = Date.now();
    setElapsed(0);

    try {
      await analysisAPI.scanStream(
        {
          zones: sel.zones,
          places: sel.places,
          classes: sel.classes,
          minScore,
          direction,
          limit: 40,
          timeframe: horizonScan ?? style.defaultTimeframe,
        },
        (e: ScanEvent) => {
          if (e.type === "start") {
            setSweep({ symbols: e.symbols, done: new Map() });
          } else if (e.type === "phase") {
            setPhase(e.label);
          } else if (e.type === "result") {
            // Une Map neuve à chaque événement : muter celle de l'état ne
            // déclencherait aucun rendu, et le balayage resterait figé.
            setSweep((s) => {
              const d = new Map(s.done);
              d.set(e.item.symbol, true);
              return { ...s, done: d };
            });
            setResults((r) => [...r, e.item]);
          } else if (e.type === "seen") {
            setSweep((s) => {
              const d = new Map(s.done);
              d.set(e.symbol, false);
              return { ...s, done: d };
            });
          } else if (e.type === "done") {
            // La liste finale du serveur fait foi : elle est triée et
            // tronquée à la limite demandée, ce que l'accumulation au fil de
            // l'eau ne peut pas être.
            setResults(e.results);
            // La sélection est gardée pour l'écran d'analyse : sans elle, on
            // y arrive sans savoir d'où l'on vient, et le plan d'entrée que
            // le scanner vient de calculer est perdu entre deux écrans.
            enregistrerScan(e.results, horizonScan ?? style.defaultTimeframe);
            if (e.quota) setQuota(e.quota);
            setPhase("Balayage terminé");
            setFini(true);
          }
        },
        ctrl.signal
      );
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setErreur(err instanceof Error ? err.message : "Le scan a échoué.");
      }
    } finally {
      setBusy(false);
    }
  }, [sel, minScore, direction, horizonScan, style.defaultTimeframe]);

  useEffect(() => () => abort.current?.abort(), []);

  /* Ce que Nimbo propose passe en tête, dans sa propre section : c'est ce
     qu'on vient chercher. Les familles ne gardent que le reste. */
  const proposes = useMemo(
    () => results.filter((r) => r.nimbo?.propose).sort((a, b) => b.score - a.score),
    [results],
  );
  const parFamille = useMemo(() => {
    const m: Record<Famille, ScanResultItem[]> = { cassure: [], rebond: [], tendance: [] };
    for (const r of results) if (!r.nimbo?.propose) m[(r.family ?? "tendance") as Famille]?.push(r);
    for (const k of Object.keys(m) as Famille[]) m[k].sort((a, b) => b.score - a.score);
    return m;
  }, [results]);

  /* Le niveau déclaré décide de la profondeur, comme partout ailleurs. Un
     débutant qui reçoit quarante opportunités n'en lit aucune. */
  const parFamilleMax = expert ? 12 : level.level === "intermediate" ? 6 : 3;
  const traites = sweep.done.size;

  return (
    <>
      <WeatherBackdrop condition="fair" enabled={animOn} />

      <div className="relative space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5 pt-2">
          <div>
            <Heading level={1}>Scanner</Heading>
            <Text className="mt-2.5 max-w-[38rem]">
              Choisissez ce que vous voulez balayer, et l&apos;outil vous dit où
              quelque chose se prépare, avec le niveau qui le confirme et celui
              qui l&apos;annule.
            </Text>
          </div>
          {quota && !quota.is_premium && quota.daily_limit > 0 && (
            <Text size="caption">
              {quota.remaining} scan{quota.remaining > 1 ? "s" : ""} restant
              {quota.remaining > 1 ? "s" : ""} aujourd&apos;hui
            </Text>
          )}
        </header>

        {/* Le bandeau du profil : ce avec quoi Nimbo juge chaque opportunité. */}
        <section
          aria-label="Votre profil"
          className="flex flex-wrap items-end gap-x-10 gap-y-4 border-y py-4"
          style={{ borderColor: "var(--cap-line-strong)", opacity: profilEnCours ? 0.6 : 1 }}
        >
          <p className="cap-dateline !border-0 !pb-0 self-center" style={{ fontSize: "1.02rem" }}>
            <time>Votre profil.</time> Nimbo juge chaque opportunité avec lui.
          </p>
          <div>
            <Text size="caption" className="mb-1">Horizon</Text>
            <SegmentedControl
              size="sm"
              options={TRADING_STYLE_IDS.map((id) => ({ value: id, label: TRADING_STYLES[id].label.fr }))}
              value={style.id}
              onChange={(v) => { if (v !== style.id) changerProfil({ tradingStyle: v }); }}
              aria-label="Horizon de trading"
            />
          </div>
          <div>
            <Text size="caption" className="mb-1">Risque par trade</Text>
            <SegmentedControl
              size="sm"
              options={NIVEAUX_RISQUE.map((n) => ({ value: n, label: `${RISQUE[n].label} ${fr(RISQUE[n].pct, 1)} %` }))}
              value={niveauRisque(settings.riskLevel)}
              onChange={(v) => { if (v !== settings.riskLevel) changerProfil({ riskLevel: v }); }}
              aria-label="Risque par trade"
            />
          </div>
          {(style.id === "scalp" || style.id === "day") && (
            <Text size="caption" className="basis-full italic">
              En {style.label.fr.toLowerCase()}, l&apos;analyse se fait en intraday : Nimbo lit le marché mais ne
              propose pas de position, ses signaux n&apos;y ont pas gagné après frais. Les propositions se font en Swing
              ou en Long terme.
            </Text>
          )}
          {profilChange && !busy && results.length === 0 && (
            <Text size="caption" tone="ink" className="basis-full">
              Profil enregistré : relancez le scan pour voir ce que Nimbo propose avec lui.
            </Text>
          )}
        </section>

        <Panel
          title="Ce que vous cherchez"
          hint={
            horizonScan
              ? `Horizon posé par votre phrase, le scan et l'analyse se feront en ${uniteFr(horizonScan)}.`
              : `Horizon ${style.label.fr}, l'analyse se fera en ${style.defaultTimeframe}, comme le scan.`
          }
        >
          <IntentBox onApply={appliquerIntention} />

          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--cap-line)" }}>
          <UniversePicker
            universe={universe}
            value={sel}
            onChange={choisir}
            count={compte}
          />

          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t pt-5"
               style={{ borderColor: "var(--cap-line)" }}>
            <div className="flex flex-wrap gap-6">
            <div>
              {/* Le sens n'est pas un filtre d'affichage : le score du moteur
                  est orienté à la hausse, donc chercher à la vente se fait de
                  l'autre côté de l'échelle, avec la même exigence. */}
              <Text size="caption" className="mb-2">Sens</Text>
              <SegmentedControl
                size="sm"
                options={[
                  { value: "both", label: "Les deux" },
                  { value: "long", label: "Achat" },
                  { value: "short", label: "Vente" },
                ]}
                value={direction}
                onChange={(v) => setDirection(v as "long" | "short" | "both")}
                aria-label="Sens recherché"
              />
            </div>
            <div>
              <Text size="caption" className="mb-2">Exigence</Text>
              <SegmentedControl
                size="sm"
                options={[
                  { value: "50", label: "Large" },
                  { value: "60", label: "Normale" },
                  { value: "70", label: "Stricte" },
                ]}
                value={String(minScore)}
                onChange={(v) => setMinScore(Number(v))}
                aria-label="Exigence du scan"
              />
            </div>
            </div>

            <div className="flex items-center gap-2.5">
              {busy && (
                <Button variant="quiet" size="md" onClick={() => abort.current?.abort()}>
                  Arrêter
                </Button>
              )}
              <Button
                size="md"
                onClick={lancer}
                disabled={busy || compte === 0 || (quota?.remaining === 0)}
              >
                {busy ? (
                  <>
                    <Radar className="h-4 w-4 animate-spin" />
                    Balayage…
                  </>
                ) : fini ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Relancer
                  </>
                ) : (
                  <>
                    <Radar className="h-4 w-4" />
                    Lancer le scan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* LA SÉANCE, DITE AVANT DE LANCER. Le scanner acceptait de balayer
              l'Europe un dimanche sans un mot : les résultats étaient corrects
              et inutilisables, calculés sur la clôture de vendredi. Ce n'est
              pas une erreur à empêcher, on prépare sa semaine le dimanche,
              c'est une condition à annoncer. */}
          {seance && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-[10px] px-3.5 py-3"
              style={{ backgroundColor: "var(--cap-bg)" }}
            >
              <Moon
                className="mt-[0.2rem] h-4 w-4 shrink-0"
                aria-hidden
                style={{ color: "var(--cap-ink-3)" }}
              />
              <Text size="small">{seance.phrase}</Text>
            </div>
          )}

          {quota?.remaining === 0 && (
            <div className="mt-4">
              <Text size="small">
                Vous avez utilisé vos scans du jour. Le compteur repart demain.
              </Text>
            </div>
          )}
          {erreur && <div className="mt-4"><FormError>{erreur}</FormError></div>}
        </Panel>

        {/* Le balayage en cours. Il disparaît une fois terminé : garder une
            grille figée sous les résultats n'apprendrait plus rien. */}
        <AnimatePresence>
          {(busy || (fini && traites > 0 && results.length === 0)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
            >
              <Panel>
                <Sweep
                  state={sweep}
                  phase={phase}
                  kept={results.length}
                  elapsed={elapsed}
                  enCours={busy}
                />
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>

        {proposes.length > 0 && (
          <Panel
            className="cap-apparait"
            title="Nimbo vous propose"
            hint={`Vérifiées avec le moteur de l'analyse, à votre profil ${style.label.fr.toLowerCase()} : le même plan vous attend au clic.`}
            aside={
              <Text size="caption" as="span">
                {proposes.length} position{proposes.length > 1 ? "s" : ""}
              </Text>
            }
          >
            <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
              {proposes.map((item, i) => (
                <Opportunity key={item.symbol} item={item} index={i} detailed={expert} timeframe={horizonScan ?? style.defaultTimeframe} />
              ))}
            </ul>
          </Panel>
        )}
        {fini && results.length > 0 && proposes.length === 0 && (
          <Panel className="cap-apparait" title="Nimbo ne propose rien sur ce scan">
            <Text size="small">
              Aucune des opportunités ci-dessous ne passe toutes ses vérifications pour l&apos;instant. Chaque carte dit
              pourquoi, et quand revenir voir.
            </Text>
          </Panel>
        )}

        {/* Les opportunités, rangées par famille. */}
        {results.length > 0 &&
          FAMILLES.map(({ key, titre, quoi }) => {
            const lot = parFamille[key];
            if (lot.length === 0) return null;
            const montres = lot.slice(0, parFamilleMax);
            return (
              <Panel
                key={key}
                // La famille arrive en douceur quand sa première opportunité
                // tombe, au lieu d'apparaître d'un bloc.
                className="cap-apparait"
                title={titre}
                hint={quoi}
                aside={
                  <Text size="caption" as="span">
                    {lot.length} actif{lot.length > 1 ? "s" : ""}
                  </Text>
                }
              >
                <ul className="[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]">
                  {montres.map((item, i) => (
                    <Opportunity key={item.symbol} item={item} index={i} detailed={expert} timeframe={horizonScan ?? style.defaultTimeframe} />
                  ))}
                </ul>
                {lot.length > montres.length && (
                  <Text size="caption" className="mt-4">
                    {lot.length - montres.length} autre
                    {lot.length - montres.length > 1 ? "s" : ""} dans cette famille,
                    passez au niveau supérieur dans les réglages pour les voir.
                  </Text>
                )}
              </Panel>
            );
          })}

        {fini && results.length === 0 && (
          <EmptyState
            title="Rien ne ressort sur cet univers"
            description={
              minScore > 50
                ? "Aucun actif n'atteint l'exigence demandée. Baissez-la, ou élargissez les places et les types d'actifs."
                : "Aucun actif ne ressort, même à l'exigence la plus large. C'est une information : le marché sélectionné ne propose rien en ce moment."
            }
          />
        )}

        {!busy && !fini && results.length === 0 && (
          <EmptyState
            title="Rien n'est encore balayé"
            description={
              compte
                ? `Lancez le scan pour passer ${fr(compte, 0)} actifs en revue. Comptez quelques secondes par dizaine d'actifs.`
                : "Choisissez au moins une place ou un type d'actif."
            }
          />
        )}
      </div>
    </>
  );
}
