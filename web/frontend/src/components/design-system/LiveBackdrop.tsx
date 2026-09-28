"use client";

import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * The background, alive.
 *
 * Two things drift, very slowly, behind everything:
 *
 *   * cloud bands — wide horizontal washes at 3–5% opacity, three planes at
 *     three speeds;
 *   * a market line — a hairline price series crossing the page, with its
 *     grid, at 4%.
 *
 * The line is the part that makes it this product's background rather than a
 * generic one: the market keeps moving whether or not anyone is looking, and
 * that is literally what the page is about.
 *
 * Everything here obeys three rules, which is what keeps it from becoming the
 * floating decoration this rebuild set out to avoid:
 *
 *   1. Only `transform` is animated, so nothing triggers layout or paint.
 *   2. Every shape is wider than the viewport. A soft form you can locate is
 *      a blob; one you cannot is weather.
 *   3. It is opacity 0.03–0.05 and never crosses text contrast. If you have to
 *      ask whether it is moving, it is at the right speed.
 *
 * Under prefers-reduced-motion the layers render in place and never move.
 */

/* A deterministic series. Two identical periods laid end to end, so the
   translation by exactly one period loops with no seam and no random(). */
const SEED = [
  52, 48, 55, 50, 58, 54, 61, 57, 53, 60, 64, 59,
  66, 62, 69, 65, 61, 68, 72, 67, 63, 70, 66, 58,
  54, 60, 56, 51, 57, 53, 49, 55, 50, 46, 52, 48,
];

const PERIOD = 1200; // user units for one full cycle

function buildSeries(): string {
  const step = PERIOD / SEED.length;
  const pt = (i: number, v: number) => `${(i * step).toFixed(1)} ${(120 - v).toFixed(1)}`;
  // Two periods: 0…PERIOD and PERIOD…2·PERIOD, identical.
  const all = [...SEED, ...SEED, SEED[0]];
  return all.map((v, i) => `${i === 0 ? "M" : "L"} ${pt(i, v)}`).join(" ");
}

export function LiveBackdrop({
  className,
  opacity = 1,
  clouds = true,
}: {
  className?: string;
  /** Scales the whole layer. The section decides how present it should be. */
  opacity?: number;
  /** Off where CloudLayer already supplies the weather, so the two do not
   *  stack into a haze nobody asked for. */
  clouds?: boolean;
}) {
  const reduce = useMouvementReduit();
  const d = useMemo(buildSeries, []);
  const ref = useRef<HTMLDivElement>(null);
  // Not `once`: the point is to stop again on the way out. Three sections
  // carry this layer, and leaving twelve loops running for sections nobody is
  // looking at keeps a rAF loop alive for nothing — which on a laptop is
  // measured in battery, not in frames.
  const inView = useInView(ref, { amount: 0 });
  const running = inView && !reduce;

  // Slow enough that the movement is felt rather than watched.
  // La dérive est une animation CSS : elle tourne sur la carte graphique,
  // sans solliciter le JavaScript de la page à chaque image (une animation
  // framer-motion infinie sur `x` recalculait la position en JS, en
  // permanence, et se disputait le fil principal avec le défilement).
  const drift = (seconds: number, _distance: string) => ({
    style: running
      ? { animation: `cap-derive-bande ${seconds}s linear infinite`, willChange: "transform" as const }
      : { transform: "translate3d(0,0,0)" },
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity }}
    >
      {/* ── Cloud bands ──────────────────────────────────────────────────
          Wide and flat. An early version used tall lobes (70% × 120%) and
          read as vertical streaks rather than cloud; weather spreads
          sideways, so the gradients have to be wider than they are high. */}
      {clouds && [
        { top: "-6%", h: "58%", o: 0.05,  s: 190, size: "58% 44%" },
        { top: "26%", h: "62%", o: 0.04,  s: 130, size: "66% 38%" },
        { top: "56%", h: "56%", o: 0.055, s: 95,  size: "52% 46%" },
      ].map((band, i) => (
        <motion.div
          key={i}
          className="absolute left-0 w-[200%]"
          style={{
            top: band.top,
            height: band.h,
            opacity: band.o,
            backgroundImage:
              `radial-gradient(${band.size} at 9% 46%, var(--cap-ocean), transparent 68%),` +
              `radial-gradient(${band.size} at 34% 58%, var(--cap-ink), transparent 66%),` +
              `radial-gradient(${band.size} at 59% 42%, var(--cap-ocean), transparent 68%),` +
              `radial-gradient(${band.size} at 84% 56%, var(--cap-ink), transparent 66%)`,
            ...drift(band.s, "-50%").style,
          }}
        />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes cap-derive-bande{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}` }} />

      {/* ── The market line ────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-[12%] h-[38vh]">
        <motion.svg
          viewBox={`0 0 ${PERIOD * 2} 120`}
          preserveAspectRatio="none"
          className="absolute left-0 h-full w-[200%]"
          style={drift(150, "-50%").style}
        >
          {/* Its grid, drifting with it — a chart, not a decorative squiggle. */}
          {/* Half as many rules, half as strong. At 25 lines the grid stopped
              being a texture and became a visible cage behind the copy. */}
          {Array.from({ length: 13 }).map((_, i) => (
            <line
              key={i}
              x1={i * (PERIOD / 6)} x2={i * (PERIOD / 6)}
              y1="0" y2="120"
              stroke="var(--cap-ink)"
              strokeWidth="1"
              opacity="0.016"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={d}
            fill="none"
            stroke="var(--cap-ocean)"
            strokeWidth="1.25"
            strokeLinejoin="round"
            opacity="0.075"
            vectorEffect="non-scaling-stroke"
          />
        </motion.svg>
      </div>
    </div>
  );
}
