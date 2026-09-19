"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Cumulus at the top of the page, parting as you descend.
 *
 * This is the page's opening statement, and it is an argument rather than a
 * decoration: you arrive under cloud — which is what a market looks like
 * before anything has been sorted — and by the time you have read one screen
 * the sky is clear. The product's whole claim, performed instead of written.
 *
 * Built from overlapping lobes rather than soft gradients. A radial gradient
 * fading to nothing is haze; a cloud needs a silhouette — a flat base, a few
 * rounded swells on top, and a shaded underside. The shapes are drawn hard and
 * then blurred a little, which is what gives an edge that is soft without
 * being absent.
 *
 * Mechanics: one fixed layer behind everything, driven by absolute scroll
 * position. Each mass has its own drift, swell and fade, so they part rather
 * than dimming in unison. All of it is gone by 1.3 viewport heights and costs
 * nothing after that.
 *
 * Only transform and opacity animate; the silhouettes themselves never change,
 * so the blur is rasterised once. Under prefers-reduced-motion the layer is
 * absent entirely — a full-screen element that reacts to scroll is precisely
 * what that setting exists to suppress.
 */

/** Lobes of one cumulus, in a 200 × 100 box. */
type Lobe = [cx: number, cy: number, r: number];

interface Silhouette {
  lobes: Lobe[];
  /** The flat-ish base, as an ellipse: [cx, cy, rx, ry].
   *  An ellipse, not a rounded rectangle — a rect leaves two straight
   *  shoulders that survive the blur and read as a cut-out. */
  base: [number, number, number, number];
}

const SILHOUETTES: Silhouette[] = [
  // Broad and low — the classic fair-weather cumulus.
  { lobes: [[58, 60, 26], [92, 46, 32], [126, 56, 28], [152, 64, 20], [38, 68, 18]],
    base: [96, 70, 66, 14] },
  // Taller, piled up on one side.
  { lobes: [[64, 52, 28], [96, 36, 26], [124, 50, 26], [148, 62, 20], [40, 64, 18]],
    base: [96, 68, 62, 13] },
  // Long and flat, the kind that sits on a horizon.
  { lobes: [[54, 64, 22], [86, 54, 28], [118, 52, 26], [148, 60, 24], [174, 68, 15]],
    base: [108, 71, 72, 12] },
  // Small and compact.
  { lobes: [[78, 56, 26], [106, 44, 24], [132, 58, 22], [56, 66, 18]],
    base: [96, 68, 50, 12] },
];

interface Cloud {
  /** Percentages of the viewport. */
  x: number;
  y: number;
  /** Width in vw. */
  w: number;
  shape: number;
  /** Where it drifts to as the sky clears. */
  dx: number;
  dy: number;
  grow: number;
  o: number;
  /** Fraction of the clearing distance after which it is gone. */
  out: number;
  flip?: boolean;
}

/**
 * Five masses, placed around the edges.
 *
 * An earlier arrangement used six larger clouds spread evenly, which filled
 * the viewport and left the headline sitting on a busy sky. These frame the
 * centre instead: two along the top, two low on the sides, one beneath. The
 * copy keeps a clear band to sit in and the sky still reads as covered.
 */
const CLOUDS: Cloud[] = [
  { x: 14, y: 1,  w: 42, shape: 0, dx: -34, dy: -18, grow: 0.26, o: 1,    out: 0.70 },
  { x: 84, y: -2, w: 48, shape: 1, dx:  36, dy: -22, grow: 0.30, o: 0.95, out: 0.78, flip: true },
  { x: 2,  y: 44, w: 36, shape: 3, dx: -42, dy:  10, grow: 0.34, o: 0.7,  out: 0.90, flip: true },
  { x: 99, y: 48, w: 38, shape: 2, dx:  44, dy:  14, grow: 0.30, o: 0.65, out: 1.0 },
  { x: 56, y: 72, w: 46, shape: 2, dx:   8, dy:  30, grow: 0.24, o: 0.55, out: 0.84 },
];

export function CloudLayer() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [span, setSpan] = useState(0);

  // The sky clears over 1.3 screens, whatever the screen is.
  useEffect(() => {
    const measure = () => setSpan(window.innerHeight * 1.3);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const raw = useTransform(scrollY, [0, Math.max(span, 1)], [0, 1], { clamp: true });
  // Smoothed, so a trackpad flick does not make the sky stutter.
  const progress = useSpring(raw, { stiffness: 80, damping: 30, mass: 0.35 });

  if (reduce || span === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {CLOUDS.map((c, i) => (
        <CloudMass key={i} cloud={c} progress={progress} />
      ))}
    </div>
  );
}

function CloudMass({
  cloud,
  progress,
}: {
  cloud: Cloud;
  progress: ReturnType<typeof useSpring>;
}) {
  const id = useId().replace(/:/g, "");
  const { lobes, base } = SILHOUETTES[cloud.shape];

  const opacity = useTransform(
    progress,
    [0, cloud.out * 0.5, cloud.out],
    [cloud.o, cloud.o * 0.4, 0]
  );
  const x = useTransform(progress, [0, 1], ["0%", `${cloud.dx}%`]);
  const y = useTransform(progress, [0, 1], ["0%", `${cloud.dy}%`]);
  const scale = useTransform(progress, [0, 1], [1, 1 + cloud.grow]);

  return (
    <motion.svg
      viewBox="0 0 200 100"
      className="absolute"
      style={{
        left: `${cloud.x}%`,
        top: `${cloud.y}%`,
        width: `${cloud.w}vw`,
        height: `${cloud.w * 0.5}vw`,
        marginLeft: `-${cloud.w / 2}vw`,
        opacity,
        x,
        y,
        scale,
        willChange: "transform, opacity",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Bright crown over a cooler underside. A single flat fill reads as a
            paper cut-out; the offset between the two stops is what gives the
            mass a top and a bottom. */}
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="var(--cap-cloud-light)" />
          <stop offset="58%" stopColor="var(--cap-cloud-light)" />
          <stop offset="100%" stopColor="var(--cap-cloud-shade)" />
        </linearGradient>
        {/* Drawn hard, then softened. Blurring a silhouette keeps the shape;
            fading a gradient loses it.
            The region is generous on purpose: at the default -10% the blur was
            clipped to a rectangle, leaving straight edges across the masses. */}
        <filter id={`${id}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* The mirror lives in SVG user space, not in the style: framer-motion
          writes `transform` itself from x/y/scale, so a CSS transform here
          would simply be overwritten. Four silhouettes go further when half
          of them can be flipped. */}
      <g
        filter={`url(#${id}-soft)`}
        fill={`url(#${id}-fill)`}
        transform={cloud.flip ? "translate(200,0) scale(-1,1)" : undefined}
      >
        {/* The flat base first, so the swells sit on top of it. */}
        <ellipse cx={base[0]} cy={base[1]} rx={base[2]} ry={base[3]} />
        {lobes.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </motion.svg>
  );
}
