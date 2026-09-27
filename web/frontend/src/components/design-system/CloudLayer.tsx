"use client";

import { useEffect, useState } from "react";
import { NuageImage } from "./NuageImage";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useMouvementReduit } from "./useMouvementReduit";

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
 * than dimming in unison. All of it is gone by 1.7 viewport heights and costs
 * nothing after that.
 *
 * Only transform and opacity animate; the silhouettes themselves never change,
 * so the blur is rasterised once. Under prefers-reduced-motion the layer is
 * absent entirely — a full-screen element that reacts to scroll is precisely
 * what that setting exists to suppress.
 */

/** Lobes of one cumulus, in a 200 × 100 box. */
type Lobe = [cx: number, cy: number, r: number];

export interface Silhouette {
  lobes: Lobe[];
  /** The flat-ish base, as an ellipse: [cx, cy, rx, ry].
   *  An ellipse, not a rounded rectangle — a rect leaves two straight
   *  shoulders that survive the blur and read as a cut-out. */
  base: [number, number, number, number];
}

export const SILHOUETTES: Silhouette[] = [
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
 * Eight masses, in two ranks.
 *
 * The arrangement is what keeps a fuller sky readable. Four large clouds run
 * along the top and down the sides; four smaller, paler ones sit further back
 * and fill the gaps between them, so the cover reads as deep rather than as a
 * row of shapes. Both ranks avoid the horizontal band the headline occupies —
 * the sky is crowded, the sentence is not.
 *
 * `out` staggers the clearing: the back rank goes first, which is what makes
 * the sky open up rather than simply fade.
 */
const CLOUDS: Cloud[] = [
  // Front rank — large, fully opaque, framing.
  { x: 12, y: -4, w: 58, shape: 0, dx: -34, dy: -20, grow: 0.26, o: 1,    out: 0.84 },
  { x: 86, y: -7, w: 64, shape: 1, dx:  36, dy: -24, grow: 0.30, o: 1,    out: 0.92, flip: true },
  { x: -2, y: 38, w: 50, shape: 3, dx: -44, dy:  12, grow: 0.34, o: 1,    out: 1.0,  flip: true },
  { x: 102,y: 44, w: 52, shape: 2, dx:  46, dy:  16, grow: 0.30, o: 1,    out: 1.06 },
  // Back rank. Still behind, but no longer ghosts: at 0.5 they only tinted
  // the page, which is what made the whole sky read as washed out.
  { x: 44, y: 2,  w: 46, shape: 2, dx:   6, dy: -30, grow: 0.22, o: 0.84, out: 0.58 },
  { x: 68, y: 30, w: 38, shape: 3, dx:  22, dy: -14, grow: 0.28, o: 0.76, out: 0.66, flip: true },
  { x: 26, y: 34, w: 40, shape: 1, dx: -20, dy: -10, grow: 0.28, o: 0.78, out: 0.62 },
  { x: 58, y: 74, w: 54, shape: 2, dx:  10, dy:  32, grow: 0.24, o: 0.88, out: 0.96 },
];

export function CloudLayer() {
  const reduce = useMouvementReduit();
  const { scrollY } = useScroll();
  const [span, setSpan] = useState(0);

  // The sky clears over 1.7 screens, whatever the screen is. Longer than the
  // 1.3 it started at: with a fuller sky the clearing is worth watching, and
  // rushing it turns the opening into a flicker.
  useEffect(() => {
    const measure = () => setSpan(window.innerHeight * 1.7);
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

/**
 * A bank of cloud tops along the bottom of a section.
 *
 * The other half of the arc. The page opens underneath the weather and, by
 * the closing line, you are looking down at it — the same masses, seen from
 * above, drifting slowly past. Nothing says so in words; the sky does it.
 *
 * Not scroll-driven: this one belongs to its section, so it drifts on its own
 * clock, slowly enough to read as distance rather than as movement.
 */
export function CloudBank({ className }: { className?: string }) {
  const reduce = useMouvementReduit();

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] overflow-hidden ${className ?? ""}`}
    >
      {/* Dérive en CSS : sur la carte graphique, pas en JavaScript. */}
      <style>{`@keyframes cap-derive-banc{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}`}</style>
      <div
        className="absolute bottom-0 left-0 flex w-[200%] items-end"
        style={reduce ? undefined : { animation: "cap-derive-banc 240s linear infinite", willChange: "transform" }}
      >
        {/* Two identical runs, so the translation by exactly one run loops
            with no seam. */}
        {[0, 1].map((run) => (
          <div key={run} className="flex w-1/2 shrink-0 items-end">
            {[0, 2, 1, 3, 2, 0, 1, 3].map((shape, i) => (
              <BankMass key={i} shape={shape} flip={i % 2 === 1} width={14} lift={i % 3} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BankMass({
  shape,
  flip,
  width,
  lift,
}: {
  shape: number;
  flip: boolean;
  width: number;
  lift: number;
}) {
  return (
    <NuageImage
      forme={shape}
      retourne={flip}
      flou={2.2}
      className="shrink-0"
      style={{
        width: `${width}%`,
        // vh, not %. A percentage margin resolves against the containing
        // block's WIDTH — on a 2880px-wide row that pushed every mass some
        // 200px below the fold, leaving a bank nobody could see.
        marginBottom: `${-3 - lift * 2}vh`,
        marginLeft: "-2%",
        opacity: 0.88 + lift * 0.04,
      }}
    />
  );
}

function CloudMass({
  cloud,
  progress,
}: {
  cloud: Cloud;
  progress: ReturnType<typeof useSpring>;
}) {
  const opacity = useTransform(
    progress,
    [0, cloud.out * 0.5, cloud.out],
    [cloud.o, cloud.o * 0.4, 0]
  );
  const x = useTransform(progress, [0, 1], ["0%", `${cloud.dx}%`]);
  const y = useTransform(progress, [0, 1], ["0%", `${cloud.dy}%`]);
  const scale = useTransform(progress, [0, 1], [1, 1 + cloud.grow]);

  // Le nuage est une image pré-dessinée : le grossir ou le déplacer au
  // défilement ne recalcule plus son flou à chaque image (c'était la
  // principale cause des saccades en haut de la page).
  return (
    <motion.div
      aria-hidden
      className="absolute"
      style={{
        left: `${cloud.x}%`,
        top: `${cloud.y}%`,
        width: `${cloud.w}vw`,
        marginLeft: `-${cloud.w / 2}vw`,
        opacity,
        x,
        y,
        scale,
        willChange: "transform, opacity",
      }}
    >
      <NuageImage forme={cloud.shape} retourne={cloud.flip} flou={2.2} style={{ width: "100%" }} />
    </motion.div>
  );
}
