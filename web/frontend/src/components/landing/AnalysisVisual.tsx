"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE, VIEWPORT } from "@/components/design-system";

/**
 * The hero's visual: one asset, drawn the way this product reads a market.
 *
 * A price line, a trend, two levels, and nothing else. It is deliberately not
 * a dashboard — the point of the whole product is that the noise has already
 * been removed before you look, and the first thing a visitor sees should
 * demonstrate that rather than describe it.
 *
 * The series is fixed, illustrative data. The landing page is public and must
 * render with the API closed, and inventing a live quote on a marketing page
 * would be worse than drawing an honest example.
 */

export interface VisualSeries {
  points: number[];
  support: number;
  resistance: number;
}

export function buildPath(
  values: number[],
  w: number,
  h: number,
  padY = 10
): { d: string; x: (i: number) => number; y: (v: number) => number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => padY + (1 - (v - min) / span) * (h - padY * 2);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");
  return { d, x, y };
}

export function AnalysisVisual({
  series,
  className,
  showLevels = true,
}: {
  series: VisualSeries;
  className?: string;
  showLevels?: boolean;
}) {
  const reduce = useReducedMotion();
  const W = 800;
  const H = 300;
  // The page renders this twice. A shared gradient id is invalid HTML and
  // leaves the second instance depending on the first one's defs.
  const gradientId = `cap-fill-${useId().replace(/:/g, "")}`;

  const { d, y, areaD, trendD } = useMemo(() => {
    const { d, x, y } = buildPath(series.points, W, H);
    const areaD = `${d} L ${W} ${H} L 0 ${H} Z`;
    // A straight regression through the series: the trend, stated once.
    const n = series.points.length;
    const meanX = (n - 1) / 2;
    const meanY = series.points.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    series.points.forEach((v, i) => {
      num += (i - meanX) * (v - meanY);
      den += (i - meanX) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    const at = (i: number) => meanY + slope * (i - meanX);
    const trendD = `M ${x(0)} ${y(at(0))} L ${x(n - 1)} ${y(at(n - 1))}`;
    return { d, y, areaD, trendD };
  }, [series]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label="Exemple d'analyse : une courbe de prix avec sa tendance, un support et une résistance"
    >
      <defs>
        {/* userSpaceOnUse rather than the default. Mapped to the path's own
            bounding box, the gradient follows the line's height, so a rising
            series ends up tinted only on its right half. Anchored to the
            viewBox it washes evenly under the whole curve. */}
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0%" stopColor="var(--cap-ocean)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--cap-ocean)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {showLevels && (
        <>
          {/* Two levels, labelled by position rather than by a legend. */}
          <line
            x1="0" x2={W} y1={y(series.resistance)} y2={y(series.resistance)}
            stroke="var(--cap-down)" strokeWidth="1" strokeDasharray="4 5" opacity="0.5"
          />
          <line
            x1="0" x2={W} y1={y(series.support)} y2={y(series.support)}
            stroke="var(--cap-up)" strokeWidth="1" strokeDasharray="4 5" opacity="0.5"
          />
        </>
      )}

      <motion.path
        d={trendD}
        stroke="var(--cap-ink-4)"
        strokeWidth="1"
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.draw, delay: 0.5, ease: EASE }}
      />

      <motion.path
        d={areaD}
        fill={`url(#${gradientId})`}
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT}
        // Only once the line has finished. Fading the fill in underneath a
        // half-drawn line puts colour where no data has been plotted yet.
        transition={{ duration: DUR.slow, delay: DUR.draw }}
      />

      <motion.path
        d={d}
        fill="none"
        stroke="var(--cap-ocean)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.draw, ease: EASE }}
      />
    </svg>
  );
}
