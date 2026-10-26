"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { DUR, EASE } from "./motion";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * A marker that travels along an SVG path.
 *
 * Built on getPointAtLength rather than CSS `offset-path`. The CSS property
 * looks tidier but is not animatable through React's SVG prop handling —
 * `offsetDistance` is forwarded to the DOM as an unknown attribute and React
 * warns on every render — and its SVG support is uneven. Sampling the path
 * geometry works everywhere and stays exact.
 *
 * The marker exists to make a drawing animation readable: the eye follows a
 * moving object and arrives where the data arrives, instead of watching a
 * stroke grow. It runs once and fades; anything that keeps circling is
 * decoration.
 */
export function PathMarker({
  d,
  duration = DUR.draw,
  delay = 0,
  r = 4.5,
  fill = "var(--cap-surface)",
  stroke = "var(--cap-ocean)",
  fadeOut = true,
}: {
  d: string;
  duration?: number;
  delay?: number;
  r?: number;
  fill?: string;
  stroke?: string;
  fadeOut?: boolean;
}) {
  const reduce = useMouvementReduit();
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const inView = useInView(groupRef, { once: true, amount: 0.3 });

  const [length, setLength] = useState(0);
  const progress = useMotionValue(0);
  const opacity = useMotionValue(0);

  useEffect(() => {
    if (pathRef.current) setLength(pathRef.current.getTotalLength());
  }, [d]);

  useEffect(() => {
    if (!inView || reduce || length === 0) return;
    const a = animate(progress, 1, { duration, delay, ease: EASE });
    const b = animate(opacity, fadeOut ? [0, 1, 1, 0] : [0, 1], {
      duration: duration + (fadeOut ? 0.45 : 0),
      delay,
      times: fadeOut ? [0, 0.06, 0.86, 1] : [0, 0.1],
      ease: "linear",
    });
    return () => { a.stop(); b.stop(); };
  }, [inView, reduce, length, duration, delay, fadeOut, progress, opacity]);

  // Written out rather than produced by a helper: two hook calls in a fixed
  // order is the rule, and a factory that returns useTransform hides that.
  const cx = useTransform(progress, (t) => {
    const p = pathRef.current;
    return !p || length === 0 ? 0 : p.getPointAtLength(t * length).x;
  });
  const cy = useTransform(progress, (t) => {
    const p = pathRef.current;
    return !p || length === 0 ? 0 : p.getPointAtLength(t * length).y;
  });

  return (
    <g ref={groupRef}>
      {/* Geometry only — never painted. It is the ruler the marker reads. */}
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      {!reduce && (
        <motion.circle
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ cx, cy, opacity }}
        />
      )}
    </g>
  );
}
