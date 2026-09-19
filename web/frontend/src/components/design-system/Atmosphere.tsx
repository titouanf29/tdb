"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Weather behind the page.
 *
 * Three washes, each far wider than the viewport, at 3–7% opacity. The width
 * is the whole point: a soft shape you can locate is a blob, and blobs are
 * exactly the "AI dashboard" cue this rebuild is avoiding. At this scale the
 * eye reads uneven light instead, which is what makes the page feel like air
 * rather than like a sheet of paper.
 *
 * The layers drift at different speeds as the section passes — near weather
 * moves more than far weather, so scrolling reads as travelling through depth
 * instead of sliding a flat image. This is the one continuous movement on the
 * page, and it is driven entirely by scroll position: it stops the instant the
 * reader stops, and never runs on its own.
 *
 * Nothing is blurred — these are plain radial gradients, so there is no
 * backdrop-filter cost and no shimmering behind text.
 */
export function Atmosphere({
  className,
  variant = "top",
  depth = 1,
}: {
  className?: string;
  /** Where the light comes from. One per section at most. */
  variant?: "top" | "side" | "base";
  /** Multiplies the drift. 0 disables it. */
  depth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const layers = {
    top: [
      "radial-gradient(120% 70% at 50% -10%, var(--cap-mist-cool), transparent 62%)",
      "radial-gradient(90% 55% at 12% 8%, var(--cap-mist-warm), transparent 58%)",
      "radial-gradient(110% 80% at 88% 20%, var(--cap-mist-deep), transparent 66%)",
    ],
    side: [
      "radial-gradient(85% 120% at -8% 50%, var(--cap-mist-cool), transparent 60%)",
      "radial-gradient(75% 100% at 105% 35%, var(--cap-mist-warm), transparent 58%)",
      "radial-gradient(95% 90% at 40% 110%, var(--cap-mist-deep), transparent 64%)",
    ],
    base: [
      "radial-gradient(130% 75% at 50% 110%, var(--cap-mist-cool), transparent 64%)",
      "radial-gradient(90% 60% at 20% 95%, var(--cap-mist-deep), transparent 60%)",
      "radial-gradient(80% 70% at 85% 60%, var(--cap-mist-warm), transparent 58%)",
    ],
  }[variant];

  // Three planes: the furthest barely moves, the nearest moves most.
  const far = useTransform(scrollYProgress, [0, 1], [-14 * depth, 14 * depth]);
  const mid = useTransform(scrollYProgress, [0, 1], [-46 * depth, 46 * depth]);
  const near = useTransform(scrollYProgress, [0, 1], [-96 * depth, 96 * depth]);
  const planes = [far, mid, near];

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          // Oversized so the drift never exposes an edge.
          className="absolute -inset-x-[12%] -inset-y-[24%]"
          style={{
            backgroundImage: layer,
            y: reduce ? 0 : planes[i] ?? far,
            willChange: reduce ? undefined : "transform",
          }}
        />
      ))}
    </div>
  );
}
