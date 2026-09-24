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
 *  savait pas ce qu'elles valaient. On le sait maintenant — plus de 2 000
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
  const [voirFigures, setVoirFigures] = useState(true);

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
    const all = [
      ...pts.map((b) => b.high),
      ...pts.map((b) => b.low),
      ...levels.map((l) => l.value),
    ].filter(Number.isFinite);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;

    const x = (i: number) => ((i / (pts.length - 1)) * (W - PAD_R));
    const y = (v: number) => PAD_T + (1 - (v - min) / span) * (H - PAD_T - PAD_B);

    const line = pts
      .map((b, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(b.close).toFixed(1)}`)
      .join(" ");

    /* LES FIGURES, RAMENÉES DANS LA FENÊTRE VISIBLE.
     *
     * Leurs indices pointent dans `bars` brut ; la courbe, elle, est tracée
     * sur `pts` — la série filtrée des clôtures invalides, puis découpée par
     * le zoom. Passer par l'horodatage plutôt que par un décalage d'indice
     * est ce qui garantit qu'une bougie manquante ne décale pas tout le
     * dessin d'un cran. Une figure dont un seul point sort de la fenêtre
     * n'est pas dessinée : à moitié hors champ, elle se lit comme une erreur. */
    // Par horodatage, jamais par indice : le graphique et les figures
    // arrivent par deux requêtes, et une bougie ajoutée entre les deux
    // décalerait tout le dessin d'un cran.
    const rang = new Map<number, number>();
    pts.forEach((b, i) => rang.set(b.timestamp, i));
    const versPts = (ts: number): number | null => rang.get(ts) ?? null;
    const visibles = figures.flatMap((f) => {
      const points = f.points.map((p) => ({ i: versPts(p.ts), prix: p.prix }));
      if (points.some((p) => p.i === null)) return [];
      let ligne: { i1: number; p1: number; i2: number; p2: number } | null = null;
      if (f.ligne) {
        const a = versPts(f.ligne.ts1), b = versPts(f.ligne.ts2);
        if (a !== null && b !== null) ligne = { i1: a, p1: f.ligne.p1, i2: b, p2: f.ligne.p2 };
      }
      return [{ f, points: points as { i: number; prix: number }[], ligne }];
    });

    return { pts, struct, x, y, line, visibles, rising: pts[pts.length - 1].close >= pts[0].close };
  }, [complet, fenetre, levels, figures, W, H, PAD_R]);

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

  const { pts, struct, x, y, line, rising, visibles } = model;
  const figuresDessinees = voirFigures ? visibles : [];

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
              opacity="0.5"
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

          {/* LES FIGURES. La forme en trait continu épais et translucide —
              elle doit se voir sans masquer le prix qu'elle résume — et la
              ligne de cou (ou la borne cassée) en tirets. La couleur dit le
              SENS annoncé, pas la qualité : la qualité est écrite sous le
              graphique, en toutes lettres et chiffrée. */}
          {figuresDessinees.map(({ f, points, ligne }, k) => {
            const c = f.sens === "haussier" ? "var(--cap-up)" : "var(--cap-down)";
            return (
              <g key={`fig-${f.cle}-${f.i_fin}-${k}`}>
                <polyline
                  points={points.map((p) => `${x(p.i)},${y(p.prix)}`).join(" ")}
                  fill="none"
                  stroke={c}
                  strokeWidth="5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.28"
                />
                {points.map((p, j) => (
                  <circle key={j} cx={x(p.i)} cy={y(p.prix)} r="4.5"
                          fill="var(--cap-surface)" stroke={c} strokeWidth="2" />
                ))}
                {ligne && (
                  <line
                    x1={x(ligne.i1)} y1={y(ligne.p1)} x2={x(ligne.i2)} y2={y(ligne.p2)}
                    stroke={c} strokeWidth="1.6" strokeDasharray="7 4" opacity="0.9"
                  />
                )}
              </g>
            );
          })}

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
          {placed.map((l) => (
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
          {figuresDessinees.map(({ f, points }, k) => {
            // Au-dessus du point le plus haut pour une figure baissière, sous
            // le plus bas pour une haussière : l'étiquette ne recouvre pas la
            // forme qu'elle nomme.
            const prefereDessus = f.sens === "baissier";
            const ancre = points.reduce((a, p) =>
              (prefereDessus ? (p.prix > a.prix ? p : a) : (p.prix < a.prix ? p : a)));
            const hauteurPct = (y(ancre.prix) / H) * 100;
            // L'étiquette ne sort jamais du cadre : trop près du bord, elle
            // passe de l'autre côté de la figure. Sortie du cadre, elle
            // recouvrait le texte sous le graphique.
            const haut = prefereDessus ? hauteurPct > 14 : hauteurPct > 84;
            const gauche = Math.min(78, Math.max(0, (x(ancre.i) / W) * 100 - 6));
            return (
              <span
                key={`lbl-${k}`}
                className="absolute whitespace-nowrap rounded-[6px] px-1.5 py-0.5 text-[0.7rem] font-medium"
                style={{
                  left: `${gauche}%`,
                  top: `${(y(ancre.prix) / H) * 100}%`,
                  transform: haut ? "translateY(-150%)" : "translateY(60%)",
                  color: f.sens === "haussier" ? "var(--cap-up)" : "var(--cap-down)",
                  // Translucide : l'étiquette nomme la figure sans cacher le
                  // prix qui passe dessous.
                  backgroundColor: "color-mix(in srgb, var(--cap-surface) 72%, transparent)",
                  boxShadow: "0 0 0 1px var(--cap-line)",
                }}
              >
                {f.nom}
              </span>
            );
          })}
          {struct.invalidation != null && (
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
          {figures.length > 0 && (
            <button
              type="button"
              onClick={() => setVoirFigures((v) => !v)}
              aria-pressed={voirFigures}
              className="rounded-[8px] px-2.5 py-1 text-[0.76rem] transition-colors"
              style={{
                color: voirFigures ? "var(--cap-ink)" : "var(--cap-ink-3)",
                backgroundColor: voirFigures ? "var(--cap-surface-2)" : "transparent",
                boxShadow: "inset 0 0 0 1px var(--cap-line)",
              }}
            >
              Figures {voirFigures ? "affichées" : "masquées"}
            </button>
          )}
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

      {/* CE QUE VALENT LES FIGURES DESSINÉES.
          C'est la partie qui manque à toutes les captures qui circulent : la
          forme est montrée, jamais ce qu'elle a donné. Ici la phrase vient
          avant le reste, avec le nombre de cas et le repère du hasard — un
          taux de réussite sans son repère est un chiffre décoratif. */}
      {figuresDessinees.length > 0 && (
        <div className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: "var(--cap-line)" }}>
          {figuresDessinees.map(({ f }, k) => (
            <div key={`v-${k}`}>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-[0.88rem] font-semibold"
                      style={{ color: f.sens === "haussier" ? "var(--cap-up)" : "var(--cap-down)" }}>
                  {f.nom}
                </span>
                <span className="text-[0.76rem]" style={{ color: "var(--cap-ink-3)" }}>
                  annonce une {f.sens === "haussier" ? "hausse" : "baisse"}
                  {f.objectif != null ? ` vers ${format(f.objectif)}` : ""}
                  {f.invalidation != null ? ` · annulée au-delà de ${format(f.invalidation)}` : ""}
                </span>
                <span className="rounded-[6px] px-1.5 py-0.5 text-[0.72rem] font-medium"
                      style={{ color: TON_VERDICT[f.verdict.ton], boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
                  {MOT_VERDICT[f.verdict.ton]}
                </span>
              </div>
              <Text size="caption" className="mt-1">{f.verdict.phrase}</Text>
              {lessonForFigure(f.cle) && (
                <Link
                  href={lessonForFigure(f.cle)!}
                  className="mt-1.5 inline-block text-[0.78rem] underline underline-offset-4"
                  style={{ color: "var(--cap-ocean)" }}
                >
                  Comprendre cette figure — le cours
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      {figures.length > 0 && voirFigures && visibles.length === 0 && (
        <Text size="caption" className="mt-3">
          Les figures trouvées sur cette période sont hors de la fenêtre zoomée — « Tout voir » les
          fait réapparaître.
        </Text>
      )}
    </div>
  );
}
