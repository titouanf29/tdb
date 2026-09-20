"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

  const model = useMemo(() => {
    const pts = bars.filter((b) => Number.isFinite(b.close));
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
  }, [bars, levels]);

  if (!model) {
    return (
      <div className="flex items-center justify-center" style={{ height, color: "var(--cap-ink-3)" }}>
        <span className="text-[0.85rem]">Pas assez de données pour annoter ce graphique.</span>
      </div>
    );
  }

  const { pts, struct, x, y, line, rising } = model;
  const stroke = rising ? "var(--cap-up)" : "var(--cap-down)";
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
      <div className="relative w-full" style={{ height }}>
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
