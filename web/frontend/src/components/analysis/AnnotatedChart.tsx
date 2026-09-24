"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { DUR, EASE, Text } from "@/components/design-system";
import { readStructure, type Bar } from "@/lib/trendStructure";
import type { Figure } from "@/lib/api";
import Link from "next/link";
import { lessonForFigure } from "@/lib/lessonLinks";

/**
 * Le graphique commenté — les annotations posées sur le prix lui-même.
 *
 * POURQUOI CE N'EST PAS SUR TRADINGVIEW. Leur graphique est un iframe sur une
 * autre origine : la règle d'origine du navigateur interdit d'y dessiner quoi
 * que ce soit, et c'est une bonne chose — c'est elle qui empêche aussi un
 * tiers de lire notre page. Annoter le prix impose donc de tracer le prix
 * nous-mêmes. Les deux vues coexistent : TradingView pour ses outils,
 * celle-ci pour comprendre.
 *
 * DEUX RÈGLES DE DESSIN, et elles décident de tout :
 *
 *   1. quatre annotations au maximum. Un graphique couvert d'étiquettes est
 *      un graphique qu'on ne lit pas — c'est le défaut de toutes les captures
 *      qui circulent. Ce qui est déjà dit en toutes lettres ailleurs sur la
 *      page n'est pas répété ici ;
 *   2. rien n'est dessiné qui ne soit mesuré. Les pivots viennent des
 *      données, les niveaux viennent du moteur, aucune ligne n'est placée à
 *      l'œil.
 *
 *  LES FIGURES CHARTISTES, ET CE QUI A CHANGÉ. Cette règle excluait les
 *  figures — double sommet, épaule-tête-épaule, triangles — parce qu'on ne
 *  savait pas ce qu'elles valaient. On le sait maintenant — plus de 1 500
 *  figures mesurées sur 31 actifs et dix ans (backend/scripts/mesurer_figures.py)
 *  — et la réponse est qu'aucune ne bat le hasard de façon stable. Elles sont
 *  donc dessinées, parce qu'on les voit partout et qu'il faut savoir les
 *  reconnaître, mais JAMAIS seules : chacune part avec ce qu'elle a réellement
 *  donné, comparé au hasard, pour que la forme ne suggère pas ce que les
 *  chiffres démentent.
 */

export interface ChartLevel {
  value: number;
  label: string;
  tone: "up" | "down" | "neutral" | "accent";
}

const TONE: Record<ChartLevel["tone"], string> = {
  up: "var(--cap-up)",
  down: "var(--cap-down)",
  neutral: "var(--cap-ink-4)",
  accent: "var(--cap-ocean)",
};

const TON_VERDICT: Record<Figure["verdict"]["ton"], string> = {
  favorable: "var(--cap-up)",
  defavorable: "var(--cap-down)",
  neutre: "var(--cap-ink-3)",
  inconnu: "var(--cap-ink-3)",
};

const MOT_VERDICT: Record<Figure["verdict"]["ton"], string> = {
  favorable: "Mieux que le hasard",
  defavorable: "Moins bien que le hasard",
  neutre: "Pas mieux que le hasard",
  // Couvre deux cas — trop peu d'exemples, ou une unité de temps sur laquelle
  // la mesure n'a pas été faite. La phrase en dessous dit lequel.
  inconnu: "Valeur non établie",
};

/* Ce qu'est la figure, en une phrase. Le verdict dit ce qu'elle VAUT ; sans
   cette ligne, quelqu'un qui n'a pas suivi le cours voit une zone teintée et
   un nom, sans savoir ce qu'il est censé y reconnaître. */
const DEFINITION: Record<string, string> = {
  double_sommet: "Deux sommets au même niveau ; la figure se confirme quand le prix casse le creux qui les sépare.",
  double_creux: "Deux creux au même niveau ; la figure se confirme quand le prix franchit le sommet qui les sépare.",
  ete: "Trois sommets, celui du milieu plus haut ; confirmée par la cassure de la ligne qui relie les deux creux.",
  ete_inversee: "Trois creux, celui du milieu plus bas ; confirmée par le franchissement de la ligne qui relie les deux sommets.",
  triangle_ascendant: "Un plafond plat et des creux de plus en plus hauts ; confirmé par la sortie au-dessus du plafond.",
  triangle_descendant: "Un plancher plat et des sommets de plus en plus bas ; confirmé par la sortie sous le plancher.",
  triangle_symetrique: "Des sommets qui baissent et des creux qui montent ; c'est le côté par lequel le prix sort qui donne le sens.",
  drapeau_haussier: "Une hausse brutale, puis une pause étroite ; confirmé par la sortie au-dessus de la pause.",
  drapeau_baissier: "Une baisse brutale, puis une pause étroite ; confirmé par la sortie sous la pause.",
};

const NUMERO = ["①", "②", "③", "④"];

/* Le rapport du viewBox doit approcher celui du panneau rendu, sinon le
   navigateur ajuste « en hauteur » et centre le dessin entre deux bandes
   vides — c'est ce qui laissait un sixième de la largeur inutilisé de chaque
   côté. On ne peut pas recourir à preserveAspectRatio="none" ici : il
   étirerait les pivots en ovales, erreur déjà commise ailleurs dans ce
   projet. */
/* DEUX GÉOMÉTRIES, choisies sur la largeur réellement disponible.
   Au format large, 1240 × 340 donne sur un téléphone de 390 px un dessin
   d'une centaine de pixels de haut : les pivots se touchent et une figure
   ne se lit plus. Le format compact est presque carré et rend la colonne des
   étiquettes au tracé — elles passent par-dessus, sur un fond qui les garde
   lisibles. */
const LARGE = { W: 1240, H: 340, PAD_R: 128 };
const COMPACT = { W: 640, H: 440, PAD_R: 6 };
const SEUIL_COMPACT = 640; // px de largeur rendue
const PAD_T = 26;
const PAD_B = 26;

/* En dessous, `readStructure` n'a plus assez de bougies pour trouver des
   pivots, et le graphique se viderait de ses annotations au moment précis où
   l'utilisateur cherche à les voir de plus près. */
const MIN_FENETRE = 12;

/* Les libellés de dates, en français et sans l'heure quand la fenêtre couvre
   plusieurs jours : « 12 sept. – 20 sept. » se lit, « 12/09/2026 09:00 –
   20/09/2026 17:30 » se déchiffre. */
function etiquetteDate(ts: number, avecHeure: boolean): string {
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime())) return "";
  return avecHeure
    ? d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
}

export function AnnotatedChart({
  bars,
  levels = [],
  figures = [],
  height = 360,
  format,
}: {
  bars: Bar[];
  levels?: ChartLevel[];
  /** Placées par horodatage sur `bars`. */
  figures?: Figure[];
  height?: number;
  format: (v: number) => string;
}) {
  /* UNE FIGURE À LA FOIS.
   *
   * Deux figures se chevauchent souvent — un double sommet dans un triangle
   * descendant, sur les mêmes pivots — et, dessinées ensemble, avec les
   * mêmes couleurs que la structure, on ne savait plus quelle ligne
   * appartenait à quoi. La plus récente est affichée d'office ; les autres
   * sont à un clic, et « Aucune » rend le graphique commenté habituel. */
  const [choix, setChoix] = useState<number | null>(0);
  useEffect(() => { setChoix(figures.length ? 0 : null); }, [figures]);
  const figureChoisie = choix !== null ? figures[choix] ?? null : null;
  const [detailVerdict, setDetailVerdict] = useState(false);
  useEffect(() => { setDetailVerdict(false); }, [choix]);

  const racine = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = racine.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setCompact(e.contentRect.width < SEUIL_COMPACT));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { W, H, PAD_R } = compact ? COMPACT : LARGE;
  const reduce = useReducedMotion();
  const gid = `ac-${useId().replace(/:/g, "")}`;

  /* ── LE ZOOM ──────────────────────────────────────────────────────────────
   *
   * Une fenêtre sur la série, en indices de bougies. `null` = tout voir.
   *
   * CE QUI COMPTE N'EST PAS L'AGRANDISSEMENT, C'EST LE RECALCUL. Zoomer en
   * étirant le dessin existant donnerait les mêmes pivots, la même pente, le
   * même seuil d'invalidation — simplement plus gros. Ici la fenêtre est
   * découpée AVANT la lecture de structure : les sommets et les creux sont
   * cherchés dans la période visible, l'échelle des prix se recale dessus, et
   * la phrase du bas décrit ce morceau-là. Regarder les trois derniers jours
   * d'un graphique d'un an, c'est poser une autre question — l'écran doit y
   * répondre, pas grossir la réponse précédente.
   */
  const complet = useMemo(() => bars.filter((b) => Number.isFinite(b.close)), [bars]);
  const [fenetre, setFenetre] = useState<[number, number] | null>(null);

  // Un changement d'actif ou d'unité de temps remet la vue à plat : garder la
  // fenêtre d'un graphique sur le suivant montrerait une période choisie pour
  // des données qui n'existent plus.
  useEffect(() => { setFenetre(null); }, [complet.length, complet[0]?.timestamp]);

  const model = useMemo(() => {
    const pts = fenetre ? complet.slice(fenetre[0], fenetre[1] + 1) : complet;
    if (pts.length < 8) return null;

    const struct = readStructure(pts);

    // Par horodatage, jamais par indice : le graphique et les figures
    // arrivent par deux requêtes, et une bougie ajoutée entre les deux
    // décalerait tout le dessin d'un cran.
    const rang = new Map<number, number>();
    pts.forEach((b, i) => rang.set(b.timestamp, i));
    const versPts = (ts: number): number | null => rang.get(ts) ?? null;

    /* LA FIGURE CHOISIE, RAMENÉE DANS LA FENÊTRE VISIBLE. Un seul point hors
       champ et elle n'est pas dessinée : à moitié coupée, elle se lit comme
       une erreur. L'écran propose alors de tout revoir. */
    let fig: null | {
      zone: { i: number; prix: number }[];
      traces: { role: string; i1: number; p1: number; i2: number; p2: number }[];
      cassure: { i: number; prix: number };
    } = null;
    if (figureChoisie?.dessin) {
      const d = figureChoisie.dessin;
      const zoneP = d.zone.map((z) => ({ i: versPts(z.ts), prix: z.prix }));
      const tracesP = d.traces.map((t) => ({ ...t, i1: versPts(t.ts1), i2: versPts(t.ts2) }));
      const cass = versPts(d.cassure.ts);
      if (cass !== null && zoneP.every((z) => z.i !== null)
          && tracesP.every((t) => t.i1 !== null && t.i2 !== null)) {
        fig = {
          zone: zoneP as { i: number; prix: number }[],
          traces: tracesP as { role: string; i1: number; p1: number; i2: number; p2: number }[],
          cassure: { i: cass, prix: d.cassure.prix },
        };
      }
    }

    // L'échelle englobe l'objectif et l'invalidation de la figure affichée :
    // la projection est la raison d'être du dessin, elle ne doit pas sortir
    // du cadre.
    const projection = fig && figureChoisie
      ? [figureChoisie.objectif, figureChoisie.invalidation].filter((v): v is number => v != null)
      : [];
    const all = [
      ...pts.map((b) => b.high),
      ...pts.map((b) => b.low),
      ...levels.map((l) => l.value),
      ...projection,
    ].filter(Number.isFinite);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;

    const x = (i: number) => ((i / (pts.length - 1)) * (W - PAD_R));
    const y = (v: number) => PAD_T + (1 - (v - min) / span) * (H - PAD_T - PAD_B);

    const line = pts
      .map((b, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(b.close).toFixed(1)}`)
      .join(" ");

    return { pts, struct, x, y, line, fig, rising: pts[pts.length - 1].close >= pts[0].close };
  }, [complet, fenetre, levels, figureChoisie, W, H, PAD_R]);

  /* Le tirer-pour-zoomer. La sélection se mesure en FRACTION de la largeur du
     tracé, pas en pixels : le SVG est mis à l'échelle par son viewBox, donc
     un pixel d'écran ne vaut pas un pixel de dessin, et le rapport change
     avec la fenêtre du navigateur. */
  const zone = useRef<HTMLDivElement | null>(null);
  const [trace, setTrace] = useState<{ a: number; b: number } | null>(null);
  const tracant = useRef(false);

  const fraction = useCallback((clientX: number): number => {
    const r = zone.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    // La colonne des étiquettes n'appartient pas au tracé : sans cette
    // correction, relâcher tout à droite désignait une bougie qui n'est pas
    // sous le curseur.
    const largeurTrace = r.width * ((W - PAD_R) / W);
    return Math.min(1, Math.max(0, (clientX - r.left) / largeurTrace));
  }, [W, PAD_R]);

  const finirTrace = useCallback(() => {
    if (!tracant.current) return;
    tracant.current = false;
    setTrace((t) => {
      if (!t) return null;
      const base = fenetre ? fenetre[0] : 0;
      const visibles = (fenetre ? fenetre[1] - fenetre[0] : complet.length - 1) || 1;
      const i1 = base + Math.round(Math.min(t.a, t.b) * visibles);
      const i2 = base + Math.round(Math.max(t.a, t.b) * visibles);
      // Un simple clic, ou une sélection trop courte pour que la structure
      // reste lisible, n'est pas un zoom — on ne fait rien plutôt que de
      // rendre un graphique vide d'annotations.
      if (i2 - i1 + 1 >= MIN_FENETRE) setFenetre([i1, i2]);
      return null;
    });
  }, [complet.length, fenetre]);

  useEffect(() => {
    // Le relâchement est écouté sur la fenêtre : un geste qui sort du cadre
    // laisserait sinon la sélection collée au curseur pour toujours.
    const up = () => finirTrace();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [finirTrace]);

  if (!model) {
    return (
      <div ref={racine} className="flex items-center justify-center" style={{ height, color: "var(--cap-ink-3)" }}>
        <span className="text-[0.85rem]">Pas assez de données pour annoter ce graphique.</span>
      </div>
    );
  }

  const { pts, struct, x, y, line, rising, fig } = model;
  // Le mode focus : la figure passe au premier plan, le reste s'efface sans
  // disparaître — on garde le repère, on perd la concurrence visuelle.
  const focus = fig !== null && figureChoisie !== null;
  const couleurFig = figureChoisie?.sens === "haussier" ? "var(--cap-up)" : "var(--cap-down)";

  /* Zoomer sur la figure : de quelques bougies avant son début jusqu'au
     dernier cours, pour voir à la fois la forme et ce qui a suivi. */
  const zoomerSurFigure = () => {
    if (!figureChoisie?.dessin) return;
    const idx = new Map<number, number>();
    complet.forEach((b, i) => idx.set(b.timestamp, i));
    const debuts = figureChoisie.dessin.zone
      .concat(figureChoisie.dessin.traces.map((t) => ({ i: t.i1, prix: t.p1, ts: t.ts1 })))
      .map((z) => idx.get(z.ts))
      .filter((v): v is number => v !== undefined);
    if (!debuts.length) return;
    const debut = Math.min(...debuts);
    const pad = Math.max(3, Math.round((complet.length - debut) * 0.12));
    const a = Math.max(0, debut - pad);
    if (complet.length - 1 - a + 1 >= MIN_FENETRE) setFenetre([a, complet.length - 1]);
  };

  /* LA COURBE SUIT LA STRUCTURE, PAS LES DEUX EXTRÉMITÉS. Elle était colorée
     en comparant la dernière clôture à la première, ce qui est une autre
     mesure — et le zoom l'a rendu visible : sur une fenêtre où le prix finit
     plus haut qu'il n'a commencé mais enchaîne des sommets de plus en plus
     bas, l'écran affichait une grande courbe verte sous la phrase « structure
     baissière ». Les deux énoncés étaient exacts et se contredisaient à
     l'œil. Quand la structure n'a pas d'avis — un range — on retombe sur le
     sens du mouvement, qui reste le moins arbitraire des deux. */
  const stroke =
    struct.kind === "up" ? "var(--cap-up)"
    : struct.kind === "down" ? "var(--cap-down)"
    : rising ? "var(--cap-up)" : "var(--cap-down)";
  const highs = struct.swings.filter((s) => s.kind === "high");
  const lows = struct.swings.filter((s) => s.kind === "low");

  // Les niveaux trop proches les uns des autres ne reçoivent qu'une étiquette :
  // « RéObjectifStop » empilé en un seul bloc illisible est le défaut classique.
  const placed: ChartLevel[] = [];
  for (const l of [...levels].sort((a, b) => y(a.value) - y(b.value))) {
    const last = placed[placed.length - 1];
    if (last && Math.abs(y(l.value) - y(last.value)) < 15) continue;
    placed.push(l);
  }

  return (
    <div ref={racine}>
      {/* LES FIGURES REPÉRÉES, au-dessus du graphique : on choisit ce qu'on
          regarde avant de regarder. La plus récente est affichée d'office. */}
      {figures.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.76rem]" style={{ color: "var(--cap-ink-3)" }}>
            Figures repérées
          </span>
          {figures.map((f, k) => {
            const actif = choix === k;
            const c = f.sens === "haussier" ? "var(--cap-up)" : "var(--cap-down)";
            return (
              <button
                key={`${f.cle}-${f.i_fin}`}
                type="button"
                onClick={() => setChoix(k)}
                aria-pressed={actif}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] transition-colors"
                style={{
                  color: actif ? c : "var(--cap-ink-2)",
                  backgroundColor: actif ? "color-mix(in srgb, currentColor 9%, transparent)" : "transparent",
                  boxShadow: `inset 0 0 0 1px ${actif ? c : "var(--cap-line)"}`,
                  fontWeight: actif ? 600 : 400,
                }}
              >
                <span aria-hidden>{NUMERO[k] ?? ""}</span>
                {f.nom}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setChoix(null)}
            aria-pressed={choix === null}
            className="rounded-full px-2.5 py-1 text-[0.78rem]"
            style={{
              color: choix === null ? "var(--cap-ink)" : "var(--cap-ink-3)",
              boxShadow: `inset 0 0 0 1px ${choix === null ? "var(--cap-ink-3)" : "var(--cap-line)"}`,
            }}
          >
            Aucune
          </button>
          {figureChoisie && (
            <button
              type="button"
              onClick={zoomerSurFigure}
              className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[0.76rem]"
              style={{ color: "var(--cap-ocean)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
            >
              <Maximize2 className="h-3 w-3" />
              Zoomer sur la figure
            </button>
          )}
        </div>
      )}
      <div
        ref={zone}
        className="relative w-full select-none"
        // LA BOÎTE A LES PROPORTIONS DU DESSIN, pas une hauteur fixe.
        //
        // Le SVG garde son rapport largeur/hauteur (l'étirer déformerait les
        // pivots) ; dans une boîte de hauteur fixe il se centrait donc entre
        // deux bandes vides dès que l'écran rétrécissait. Or les étiquettes,
        // posées hors du SVG, se placent en POURCENTAGE de la boîte : sur un
        // téléphone, « Résistance », « Support » et le nom des figures
        // flottaient à plusieurs centimètres de ce qu'ils désignaient. Avec
        // le même rapport pour la boîte et le dessin, un pourcentage de l'un
        // est un pourcentage de l'autre, à toutes les largeurs.
        style={{ aspectRatio: `${W} / ${H}`, cursor: "col-resize", touchAction: "pan-y" }}
        onPointerDown={(e) => {
          // Bouton principal seulement : un clic droit ouvre le menu
          // contextuel, il n'a pas à laisser une sélection derrière lui.
          if (e.button !== 0) return;
          tracant.current = true;
          const f = fraction(e.clientX);
          setTrace({ a: f, b: f });
        }}
        onPointerMove={(e) => {
          if (!tracant.current) return;
          const f = fraction(e.clientX);
          setTrace((t) => (t ? { ...t, b: f } : null));
        }}
        onDoubleClick={() => setFenetre(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full"
          role="img"
          aria-label={`Graphique commenté : ${struct.sentence}`}
        >
          <defs>
            <marker id={`${gid}-fleche`} viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={couleurFig} />
            </marker>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1={PAD_T} x2="0" y2={H}>
              <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Les niveaux du moteur, derrière le prix. */}
          {levels.map((l) => (
            <line
              key={l.label}
              x1="0"
              x2={W - PAD_R}
              y1={y(l.value)}
              y2={y(l.value)}
              stroke={TONE[l.tone]}
              strokeWidth="1"
              strokeDasharray="5 5"
              opacity={focus ? 0.18 : 0.5}
            />
          ))}

          <motion.path
            d={`${line} L ${W - PAD_R} ${H} L 0 ${H} Z`}
            fill={`url(#${gid})`}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DUR.slow, delay: reduce ? 0 : DUR.draw * 0.7 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: DUR.draw, ease: EASE }}
          />

          {/* LA STRUCTURE : les pivots, reliés. C'est le seul « schéma » que
              nous posons, parce que c'est le seul qui soit une description et
              non une prédiction. Les sommets entre eux, les creux entre eux —
              la pente de ces deux lignes EST la tendance. */}
          <g opacity={focus ? 0.16 : 1} style={{ transition: "opacity 200ms" }}>
          {highs.length > 1 && (
            <polyline
              points={highs.map((s) => `${x(s.i)},${y(s.price)}`).join(" ")}
              fill="none"
              stroke="var(--cap-down)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.75"
            />
          )}
          {lows.length > 1 && (
            <polyline
              points={lows.map((s) => `${x(s.i)},${y(s.price)}`).join(" ")}
              fill="none"
              stroke="var(--cap-up)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.75"
            />
          )}
          {struct.swings.map((s) => (
            <circle
              key={`${s.kind}-${s.i}`}
              cx={x(s.i)}
              cy={y(s.price)}
              r="3.5"
              fill={s.kind === "high" ? "var(--cap-down)" : "var(--cap-up)"}
            />
          ))}

          {/* Le seuil d'invalidation, en trait plein : c'est le prix qui
              change la lecture, donc il ne se confond pas avec les autres. */}
          {struct.invalidation != null && (
            <line
              x1="0"
              x2={W - PAD_R}
              y1={y(struct.invalidation)}
              y2={y(struct.invalidation)}
              stroke="var(--cap-ink-3)"
              strokeWidth="1.4"
            />
          )}
          </g>

          {/* ── LA FIGURE CHOISIE ────────────────────────────────────────────
              Une zone teintée plutôt qu'un trait épais posé sur le prix : la
              courbe reste lisible, et la forme se voit comme une forme. Ses
              lignes (cou, côtés, mât) en trait net ; la cassure marquée ; et,
              depuis la cassure, ce qu'elle annonce — l'objectif — et ce qui
              l'annulerait. C'est la projection qui donne son sens au dessin :
              sans elle, on voit une forme sans savoir ce qu'elle promet. */}
          {focus && fig && figureChoisie && (() => {
            const xc = x(fig.cassure.i), yc = y(fig.cassure.prix);
            const xfin = W - PAD_R;
            const obj = figureChoisie.objectif, inv = figureChoisie.invalidation;
            return (
              <g>
                <polygon
                  points={fig.zone.map((z) => `${x(z.i)},${y(z.prix)}`).join(" ")}
                  fill={couleurFig}
                  opacity="0.13"
                />
                <polygon
                  points={fig.zone.map((z) => `${x(z.i)},${y(z.prix)}`).join(" ")}
                  fill="none"
                  stroke={couleurFig}
                  strokeWidth="1"
                  strokeLinejoin="round"
                  opacity="0.45"
                />
                {fig.traces.map((t, k) => (
                  <line key={k}
                        x1={x(t.i1)} y1={y(t.p1)} x2={x(t.i2)} y2={y(t.p2)}
                        stroke={couleurFig}
                        strokeWidth={t.role === "mat" ? 1.4 : 2}
                        strokeDasharray={t.role === "mat" ? "3 3" : undefined}
                        strokeLinecap="round" />
                ))}
                {obj != null && (
                  <line x1={xc} x2={xfin} y1={y(obj)} y2={y(obj)}
                        stroke={couleurFig} strokeWidth="1.6" strokeDasharray="7 5" />
                )}
                {inv != null && (
                  <line x1={xc} x2={xfin} y1={y(inv)} y2={y(inv)}
                        stroke="var(--cap-ink-2)" strokeWidth="1.3" strokeDasharray="2 4" />
                )}
                {/* La flèche : de la cassure vers l'objectif, pour dire le sens
                    d'un coup d'œil. */}
                {obj != null && (
                  <line x1={xc} y1={yc} x2={xc + Math.min(60, (xfin - xc) * 0.5)} y2={y(obj)}
                        stroke={couleurFig} strokeWidth="1.4" opacity="0.7"
                        markerEnd={`url(#${gid}-fleche)`} />
                )}
                <circle cx={xc} cy={yc} r="7" fill={couleurFig} opacity="0.18" />
                <circle cx={xc} cy={yc} r="4" fill={couleurFig} stroke="var(--cap-surface)" strokeWidth="1.5" />
              </g>
            );
          })()}
        </svg>

        {/* La sélection en cours, pendant le geste. Sans ce rectangle, on tire
            à l'aveugle et on découvre la période choisie une fois le bouton
            relâché — ce qui oblige à recommencer presque à chaque fois. */}
        {trace && Math.abs(trace.a - trace.b) > 0.004 && (
          <div
            className="pointer-events-none absolute top-0 h-full"
            style={{
              left: `${Math.min(trace.a, trace.b) * ((W - PAD_R) / W) * 100}%`,
              width: `${Math.abs(trace.a - trace.b) * ((W - PAD_R) / W) * 100}%`,
              backgroundColor: "var(--cap-ocean)",
              opacity: 0.12,
              boxShadow: "inset 1px 0 0 var(--cap-ocean), inset -1px 0 0 var(--cap-ocean)",
            }}
          />
        )}

        {/* Les étiquettes hors du SVG : à l'intérieur elles seraient étirées
            par la mise à l'échelle et changeraient de taille avec la fenêtre. */}
        <div className="pointer-events-none absolute inset-0">
          {!focus && placed.map((l) => (
            <span
              key={l.label}
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap rounded-[5px] px-1.5 text-[0.72rem]"
              style={{ top: `${(y(l.value) / H) * 100}%`, color: TONE[l.tone],
                       backgroundColor: compact ? "color-mix(in srgb, var(--cap-surface) 72%, transparent)" : "transparent" }}
            >
              {l.label} {format(l.value)}
            </span>
          ))}
          {/* À gauche, délibérément : le seuil d'invalidation tombe souvent
              à quelques euros d'un support, et les deux étiquettes se
              chevauchaient dans la colonne de droite. Le côté opposé les
              sépare et dit au passage que ce repère n'est pas de la même
              nature que les niveaux du moteur. */}
          {focus && fig && figureChoisie && (() => {
            // Le nom, au-dessus de la zone (ou dessous si elle touche le haut
            // du cadre), centré sur elle et gardé dans le cadre.
            const xs = fig.zone.map((z) => x(z.i));
            const ys = fig.zone.map((z) => y(z.prix));
            const cx = ((Math.min(...xs) + Math.max(...xs)) / 2 / W) * 100;
            const haut = Math.min(...ys), bas = Math.max(...ys);
            const dessus = haut / H > 0.14;
            const obj = figureChoisie.objectif, inv = figureChoisie.invalidation;
            // Objectif et invalidation dans la colonne de droite ; trop proches,
            // la seconde s'écarte pour que les deux restent lisibles.
            let yObj = obj != null ? (y(obj) / H) * 100 : null;
            let yInv = inv != null ? (y(inv) / H) * 100 : null;
            if (yObj != null && yInv != null && Math.abs(yObj - yInv) < 7) {
              if (yObj < yInv) yInv = yObj + 7; else yObj = yInv + 7;
            }
            const fond = "color-mix(in srgb, var(--cap-surface) 82%, transparent)";
            return (
              <>
                {/* Sur téléphone, pas d'étiquette dans le tracé : elle
                    chevauchait celle de l'invalidation, et la pastille
                    sélectionnée juste au-dessus nomme déjà la figure. */}
                {!compact && <span
                  className="absolute whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[0.72rem] font-semibold"
                  style={{
                    left: `${Math.min(80, Math.max(0, cx))}%`,
                    top: `${((dessus ? haut : bas) / H) * 100}%`,
                    transform: `translate(-50%, ${dessus ? "-135%" : "35%"})`,
                    color: couleurFig, backgroundColor: fond,
                    boxShadow: `0 0 0 1px ${couleurFig}`,
                  }}
                >
                  {NUMERO[choix ?? 0] ?? ""} {figureChoisie.nom}
                </span>}
                {yObj != null && (
                  <span className="absolute right-0 -translate-y-1/2 whitespace-nowrap rounded-[5px] px-1.5 text-[0.72rem] font-medium"
                        style={{ top: `${yObj}%`, color: couleurFig, backgroundColor: fond }}>
                    Objectif {format(obj!)}
                  </span>
                )}
                {yInv != null && (
                  <span className="absolute right-0 -translate-y-1/2 whitespace-nowrap rounded-[5px] px-1.5 text-[0.72rem]"
                        style={{ top: `${yInv}%`, color: "var(--cap-ink-2)", backgroundColor: fond }}>
                    Annulée {figureChoisie.sens === "haussier" ? "sous" : "au-dessus de"} {format(inv!)}
                  </span>
                )}
              </>
            );
          })()}
          {!focus && struct.invalidation != null && (
            <span
              className="absolute left-0 -translate-y-1/2 whitespace-nowrap rounded-[5px] px-1.5 text-[0.72rem]"
              style={{ top: `${(y(struct.invalidation) / H) * 100}%`, color: "var(--cap-ink-2)",
                       backgroundColor: compact ? "color-mix(in srgb, var(--cap-surface) 72%, transparent)" : "transparent" }}
            >
              Invalidation {format(struct.invalidation)}
            </span>
          )}
        </div>
      </div>

      {/* ── La période regardée, et comment en changer ─────────────────────
          Les raccourcis portent un nombre de bougies, pas une durée : l'unité
          de temps du graphique est déjà choisie plus haut, donc « les 30
          dernières » veut dire trente séances en journalier et trente heures
          en horaire. Traduire en jours ici obligerait à connaître l'unité et
          donnerait des libellés faux une fois sur deux. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Text size="caption">
          {fenetre
            ? `${pts.length} bougies affichées · ${etiquetteDate(pts[0].timestamp, pts.length <= 40)} → ${etiquetteDate(pts[pts.length - 1].timestamp, pts.length <= 40)}`
            : "Tirez sur le graphique pour zoomer sur une période — tout se recalcule dessus."}
        </Text>
        <div className="flex flex-wrap items-center gap-1.5">
          {[30, 60, 120].map((n) =>
            complet.length > n + 4 ? (
              <button
                key={n}
                type="button"
                onClick={() => setFenetre([complet.length - n, complet.length - 1])}
                className="rounded-[8px] px-2.5 py-1 text-[0.76rem] transition-colors"
                style={{
                  color: "var(--cap-ink-2)",
                  boxShadow: "inset 0 0 0 1px var(--cap-line)",
                }}
              >
                {n} dernières
              </button>
            ) : null,
          )}
          {fenetre && (
            <button
              type="button"
              onClick={() => setFenetre(null)}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[0.76rem] transition-colors"
              style={{ color: "var(--cap-ocean)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}
            >
              <Maximize2 className="h-3 w-3" />
              Tout voir
            </button>
          )}
        </div>
      </div>

      {/* Une phrase, pas un paragraphe. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-[3px] w-4 rounded-full" style={{ backgroundColor: "var(--cap-down)" }} />
          <Text size="caption" as="span">Les sommets</Text>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-[3px] w-4 rounded-full" style={{ backgroundColor: "var(--cap-up)" }} />
          <Text size="caption" as="span">Les creux</Text>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-[2px] w-4" style={{ backgroundColor: "var(--cap-ink-3)" }} />
          <Text size="caption" as="span">Le seuil qui casse la lecture</Text>
        </span>
      </div>
      <Text size="small" className="mt-3">{struct.sentence}</Text>

      {/* CE QUE VAUT LA FIGURE AFFICHÉE.
          C'est la partie qui manque à toutes les captures qui circulent : la
          forme est montrée, jamais ce qu'elle a donné. Trois lignes : ce que
          c'est, ce qu'elle annonce, ce qu'elle a réellement donné — le détail
          chiffré est à un clic, pour qu'un paragraphe de statistiques ne
          noie pas la réponse. */}
      {figureChoisie && (
        <div className="mt-5 rounded-[12px] px-4 py-3.5"
             style={{ boxShadow: `inset 3px 0 0 ${couleurFig}, inset 0 0 0 1px var(--cap-line)` }}>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[0.92rem] font-semibold" style={{ color: couleurFig }}>
              {NUMERO[choix ?? 0] ?? ""} {figureChoisie.nom}
            </span>
            <span className="rounded-[6px] px-1.5 py-0.5 text-[0.72rem] font-medium"
                  style={{ color: TON_VERDICT[figureChoisie.verdict.ton], boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
              {MOT_VERDICT[figureChoisie.verdict.ton]}
            </span>
          </div>
          {DEFINITION[figureChoisie.cle] && (
            <Text size="caption" className="mt-1.5">{DEFINITION[figureChoisie.cle]}</Text>
          )}
          <p className="mt-1.5 text-[0.84rem]" style={{ color: "var(--cap-ink-2)" }}>
            Elle annonce une <strong style={{ color: couleurFig }}>
              {figureChoisie.sens === "haussier" ? "hausse" : "baisse"}
            </strong>
            {figureChoisie.objectif != null ? <> vers <strong>{format(figureChoisie.objectif)}</strong></> : null}
            {figureChoisie.invalidation != null
              ? <>, et elle est annulée {figureChoisie.sens === "haussier" ? "sous" : "au-dessus de"}{" "}
                  <strong>{format(figureChoisie.invalidation)}</strong></>
              : null}.
          </p>
          <p className="mt-1.5 text-[0.84rem]" style={{ color: "var(--cap-ink-2)" }}>
            {figureChoisie.verdict.phrase.split(/(?<=\.)\s/)[0]}{" "}
            <button type="button" onClick={() => setDetailVerdict((v) => !v)}
                    className="underline underline-offset-4" style={{ color: "var(--cap-ink-3)" }}>
              {detailVerdict ? "Moins" : "Le détail"}
            </button>
          </p>
          {detailVerdict && (
            <Text size="caption" className="mt-1.5">
              {figureChoisie.verdict.phrase.split(/(?<=\.)\s/).slice(1).join(" ")}
            </Text>
          )}
          {lessonForFigure(figureChoisie.cle) && (
            <Link
              href={lessonForFigure(figureChoisie.cle)!}
              className="mt-2 inline-block text-[0.78rem] underline underline-offset-4"
              style={{ color: "var(--cap-ocean)" }}
            >
              Comprendre cette figure — le cours
            </Link>
          )}
          {!fig && (
            <Text size="caption" className="mt-2">
              Cette figure est hors de la période affichée —{" "}
              <button type="button" onClick={zoomerSurFigure} className="underline underline-offset-4"
                      style={{ color: "var(--cap-ocean)" }}>
                zoomer dessus
              </button>.
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
