"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PathMarker } from "./PathMarker";
import { CountUp } from "./Metric";
import { DUR, EASE, VIEWPORT } from "./motion";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * The score, drawn as a bearing rather than a gauge.
 *
 * An arc that sweeps from a fixed origin is the same gesture as a compass
 * needle settling — which is the product's whole metaphor — and it carries
 * information a number alone does not: how far round the dial 78 actually is.
 *
 * Deliberately not a full ring with a coloured track. A 270° arc leaves an
 * opening at the bottom, so the shape reads as an instrument face instead of
 * the progress donut every dashboard ships.
 */

const START = 135;   // degrees, measured from 3 o'clock going clockwise
const SWEEP = 270;

// Rounded on purpose. Node and the browser print the same float with a
// different number of digits (…2670293 vs …27003), and React reports that
// as a hydration mismatch on every tick of the dial.
const round = (n: number) => Math.round(n * 1000) / 1000;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function ScoreDial({
  score,
  size = 132,
  label = "/ 100",
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const reduce = useMouvementReduit();
  const R = 54;
  const C = 64;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  const track = arc(C, C, R, START, START + SWEEP);
  const value = arc(C, C, R, START, START + SWEEP * pct);

  // Ticks around the face — the instrument detail that makes it a dial.
  const ticks = Array.from({ length: 19 }, (_, i) => {
    const deg = START + (SWEEP * i) / 18;
    const inner = polar(C, C, R - (i % 3 === 0 ? 8 : 4.5), deg);
    const outer = polar(C, C, R - 1, deg);
    return { i, inner, outer, major: i % 3 === 0 };
  });

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" className="h-full w-full" role="img" aria-label={`Score ${score} sur 100`}>
        {ticks.map((t) => (
          <line
            key={t.i}
            x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
            stroke="var(--cap-line-strong)"
            strokeWidth={t.major ? 1 : 0.75}
            opacity={t.major ? 0.8 : 0.45}
          />
        ))}

        <path d={track} fill="none" stroke="var(--cap-line)" strokeWidth="3" strokeLinecap="round" />

        <motion.path
          d={value}
          fill="none"
          stroke="var(--cap-ocean)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: DUR.slow * 1.6, ease: EASE }}
        />

        {/* The needle head, landing where the arc stops. */}
        <PathMarker d={value} duration={DUR.slow * 1.6} r={3.5}
                    fill="var(--cap-ocean)" stroke="var(--cap-ocean)" fadeOut={false} />

      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp to={score} duration={1.6} className="text-[2rem] font-medium leading-none" />
        <span className="mt-1 text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
