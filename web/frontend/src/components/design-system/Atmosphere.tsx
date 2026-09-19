"use client";

import { cn } from "@/lib/utils";

/**
 * Weather behind the page.
 *
 * Three washes, each far wider than the viewport, at 3–6% opacity. The width
 * is the whole point: a soft shape you can locate is a blob, and blobs are
 * exactly the "AI dashboard" cue this rebuild is avoiding. At this scale the
 * eye reads uneven light instead, which is what makes a white page feel like
 * air rather than like a sheet of paper.
 *
 * Nothing moves. Nothing is blurred — these are plain radial gradients, so
 * there is no backdrop-filter cost and no shimmering behind text.
 */
export function Atmosphere({
  className,
  variant = "top",
}: {
  className?: string;
  /** Where the light comes from. One per section at most. */
  variant?: "top" | "side" | "base";
}) {
  const layers = {
    top: [
      "radial-gradient(120% 70% at 50% -10%, var(--cap-mist-cool), transparent 62%)",
      "radial-gradient(90% 55% at 12% 8%, var(--cap-mist-warm), transparent 58%)",
      "radial-gradient(110% 80% at 88% 20%, var(--cap-mist-deep), transparent 66%)",
    ],
    side: [
      "radial-gradient(85% 120% at -8% 50%, var(--cap-mist-cool), transparent 60%)",
      "radial-gradient(75% 100% at 105% 35%, var(--cap-mist-warm), transparent 58%)",
    ],
    base: [
      "radial-gradient(130% 75% at 50% 110%, var(--cap-mist-cool), transparent 64%)",
      "radial-gradient(90% 60% at 20% 95%, var(--cap-mist-deep), transparent 60%)",
    ],
  }[variant];

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ backgroundImage: layers.join(", ") }}
    />
  );
}
