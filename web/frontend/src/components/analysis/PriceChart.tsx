"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE } from "@/components/design-system";

/**
 * The price, and the three lines that matter.
 *
 * A close line, the support and resistance the engine measured, and the
 * suggested stop and target when a plan exists. Nothing else — no candles, no
 * stacked indicator panes, no grid. Everything the old chart drew on top of
 * the price is available lower down the page as a number, which is easier to
 * read than a coloured line among nine others.
 *
 * Deliberately not a charting library. lightweight-charts is 45 kB to draw
 * what a single path does here, and the moment a chart needs a legend to be
 * read, it has stopped being a picture of the price.
 */

export interface Level {
  value: number;
  label: string;
  tone: "up" | "down" | "neutral" | "accent";
}

/** Levels that are far enough apart to be labelled without colliding. */
function placeLabels(
  levels: Level[],
  y: (v: number) => number,
  viewH: number,
  pixelH: number
): (Level & { topPct: number })[] {
  const MIN_GAP_PX = 16;
  const sorted = [...levels].sort((a, b) => y(a.value) - y(b.value));
  const out: (Level & { topPct: number })[] = [];
  let lastPx = -Infinity;
  for (const l of sorted) {
    const px = (y(l.value) / viewH) * pixelH;
    if (px - lastPx < MIN_GAP_PX) continue;
    lastPx = px;
    out.push({ ...l, topPct: (y(l.value) / viewH) * 100 });
  }
  return out;
}

const TONE: Record<Level["tone"], string> = {
  up: "var(--cap-up)",
  down: "var(--cap-down)",
  neutral: "var(--cap-ink-4)",
  accent: "var(--cap-ocean)",
};

export function PriceChart({
  closes,
  levels = [],
  height = 260,
}: {
  closes: number[];
  levels?: Level[];
  height?: number;
}) {
  const reduce = useReducedMotion();
  const gid = `pc-${useId().replace(/:/g, "")}`;
  const W = 800;
  const H = 300;

  const { d, areaD, y, rising } = useMemo(() => {
    const pts = closes.filter((v) => Number.isFinite(v));
    if (pts.length < 2) return { d: "", areaD: "", y: () => 0, rising: true };

    // The scale must contain the levels too, or a stop just off-screen looks
    // like no stop at all.
    const all = [...pts, ...levels.map((l) => l.value)].filter(Number.isFinite);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;
    const pad = 14;

    const x = (i: number) => (i / (pts.length - 1)) * W;
    const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);

    const d = pts
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
      .join(" ");
    return {
      d,
      areaD: `${d} L ${W} ${H} L 0 ${H} Z`,
      y,
      rising: pts[pts.length - 1] >= pts[0],
    };
  }, [closes, levels]);

  if (!d) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height, color: "var(--cap-ink-3)" }}
      >
        <span className="text-[0.85rem]">Données de prix indisponibles</span>
      </div>
    );
  }

  const stroke = rising ? "var(--cap-up)" : "var(--cap-down)";

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Évolution du prix sur la période affichée"
      >
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
            <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {levels.map((l) => (
          <line
            key={l.label}
            x1="0"
            x2={W}
            y1={y(l.value)}
            y2={y(l.value)}
            stroke={TONE[l.tone]}
            strokeWidth="1"
            strokeDasharray="4 5"
            opacity="0.55"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <motion.path
          d={areaD}
          fill={`url(#${gid})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DUR.slow, delay: reduce ? 0 : DUR.draw * 0.8 }}
        />

        <motion.path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: DUR.draw, ease: EASE }}
        />
      </svg>

      {/* Labels sit outside the SVG so they are not stretched by
          preserveAspectRatio="none".

          Drawn top to bottom, and a label is skipped when the one above it is
          less than 16px away: a stop and a target that nearly coincide used to
          print "RéObjectifStopSupport" in a single illegible stack. Dropping
          the crowded one is better than showing four overlapping words, and
          the line itself stays visible either way. */}
      <div className="pointer-events-none absolute inset-0">
        {placeLabels(levels, y, H, height).map((l) => (
          <span
            key={l.label}
            className="absolute right-1 -translate-y-1/2 whitespace-nowrap px-1.5 text-[0.7rem]"
            style={{
              top: `${l.topPct}%`,
              color: TONE[l.tone],
              backgroundColor: "var(--cap-surface)",
            }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
