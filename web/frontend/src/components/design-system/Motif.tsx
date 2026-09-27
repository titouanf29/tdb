"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DUR, EASE, VIEWPORT } from "./motion";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * The CaptenTDB motif: navigation, drawn as thin lines.
 *
 * The reference is a chart in the nautical sense — bearings, contour lines,
 * a plotted course between an origin and a destination. It is carried entirely
 * by line weight and geometry. No object is ever depicted: an anchor or a helm
 * would turn a considered product into a themed one.
 *
 * It appears three or four times across a page, never as wallpaper.
 */

/** Contour lines — a set of parallel curves, like depth on a chart. */
export function Contours({
  className,
  lines = 5,
  opacity = 1,
}: {
  className?: string;
  lines?: number;
  opacity?: number;
}) {
  const reduce = useMouvementReduit();
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 300"
      preserveAspectRatio="none"
      className={cn("pointer-events-none", className)}
      style={{
        opacity,
        // Fades to nothing at both ends, so the lines never compete with
        // whatever sits on top of them.
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%)",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%)",
      }}
    >
      {Array.from({ length: lines }).map((_, i) => {
        const y = 60 + i * 42;
        const amp = 26 - i * 2.5;
        return (
          <motion.path
            key={i}
            d={`M-20 ${y} C 140 ${y - amp}, 260 ${y + amp}, 420 ${y - amp * 0.6} S 700 ${y + amp * 0.8}, 820 ${y - amp * 0.3}`}
            fill="none"
            stroke="var(--cap-line-chart)"
            strokeWidth="1"
            // The opening: contours plotting themselves, one after another,
            // the way a chart is drawn rather than printed. It runs once on
            // load and then the lines are simply there.
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 2.6,
              delay: 0.15 + i * 0.13,
              ease: EASE,
              opacity: { duration: 0.6, delay: 0.15 + i * 0.13 },
            }}
          />
        );
      })}
    </svg>
  );
}

/** A waypoint: a filled centre inside a thin ring. */
export function Waypoint({
  size = 12,
  tone = "ocean",
  className,
}: {
  size?: number;
  tone?: "ocean" | "amber" | "ink";
  className?: string;
}) {
  const color = {
    ocean: "var(--cap-ocean)",
    amber: "var(--cap-amber)",
    ink: "var(--cap-ink-3)",
  }[tone];

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={cn("shrink-0", className)}
    >
      <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="1" opacity="0.45" />
      <circle cx="6" cy="6" r="2" fill={color} />
    </svg>
  );
}

/**
 * A course between two points, drawing itself once on entry.
 *
 * This is the one repeated animation of the identity: a line that arrives
 * rather than one that loops forever.
 */
export function Course({
  className,
  height = 120,
  delay = 0,
}: {
  className?: string;
  height?: number;
  delay?: number;
}) {
  const reduce = useMouvementReduit();
  const d = "M 8 96 C 90 96, 118 40, 200 44 C 268 47, 300 74, 392 26";

  return (
    <svg
      aria-hidden
      viewBox="0 0 400 120"
      height={height}
      className={cn("w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Bearing ticks along the baseline — the quiet part of the motif. */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={i}
          x1={8 + i * 55}
          y1={108}
          x2={8 + i * 55}
          y2={i % 2 === 0 ? 100 : 104}
          stroke="var(--cap-line-strong)"
          strokeWidth="1"
        />
      ))}

      <motion.path
        d={d}
        fill="none"
        stroke="var(--cap-ocean)"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.draw, delay, ease: EASE }}
      />

      <motion.circle
        cx="8" cy="96" r="3"
        fill="var(--cap-ocean)"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.quick, delay }}
      />
      <motion.circle
        cx="392" cy="26" r="4"
        fill="none" stroke="var(--cap-amber)" strokeWidth="1.75"
        initial={reduce ? false : { opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.base, delay: delay + DUR.draw * 0.85, ease: EASE }}
        style={{ transformOrigin: "392px 26px" }}
      />
    </svg>
  );
}

/** A hairline rule with a single tick — a section divider with a bearing. */
export function Rule({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-px w-full", className)} style={{ backgroundColor: "var(--cap-line)" }}>
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-[7px] w-px -translate-y-1/2"
        style={{ backgroundColor: "var(--cap-ocean)" }}
      />
    </div>
  );
}
