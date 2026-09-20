"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { DUR, EASE, Text } from "@/components/design-system";
import { readStructure, type Bar } from "@/lib/trendStructure";

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
 *      données, les niveaux viennent du moteur. Aucune figure n'est
 *      « reconnue », aucune ligne n'est placée à l'œil.
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

/* Le rapport du viewBox doit approcher celui du panneau rendu, sinon le
   navigateur ajuste « en hauteur » et centre le dessin entre deux bandes
   vides — c'est ce qui laissait un sixième de la largeur inutilisé de chaque
   côté. On ne peut pas recourir à preserveAspectRatio="none" ici : il
   étirerait les pivots en ovales, erreur déjà commise ailleurs dans ce
   projet. */
const W = 1240;
const H = 340;
const PAD_R = 128;  // la colonne des étiquettes de niveau
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
  height = 360,
  format,
}: {
  bars: Bar[];
  levels?: ChartLevel[];
  height?: number;
  format: (v: number) => string;
}) {
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

    return { pts, struct, x, y, line, rising: pts[pts.length - 1].close >= pts[0].close };
  }, [complet, fenetre, levels]);

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
  }, []);

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
      <div className="flex items-center justify-center" style={{ height, color: "var(--cap-ink-3)" }}>
        <span className="text-[0.85rem]">Pas assez de données pour annoter ce graphique.</span>
      </div>
    );
  }

  const { pts, struct, x, y, line, rising } = model;

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
    <div>
      <div
        ref={zone}
        className="relative w-full select-none"
        style={{ height, cursor: "col-resize", touchAction: "pan-y" }}
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
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap pl-2 text-[0.72rem]"
              style={{ top: `${(y(l.value) / H) * 100}%`, color: TONE[l.tone] }}
            >
              {l.label} {format(l.value)}
            </span>
          ))}
          {/* À gauche, délibérément : le seuil d'invalidation tombe souvent
              à quelques euros d'un support, et les deux étiquettes se
              chevauchaient dans la colonne de droite. Le côté opposé les
              sépare et dit au passage que ce repère n'est pas de la même
              nature que les niveaux du moteur. */}
          {struct.invalidation != null && (
            <span
              className="absolute left-0 -translate-y-1/2 whitespace-nowrap pr-2 text-[0.72rem]"
              style={{ top: `${(y(struct.invalidation) / H) * 100}%`, color: "var(--cap-ink-2)" }}
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
        <div className="flex items-center gap-1.5">
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
    </div>
  );
}
