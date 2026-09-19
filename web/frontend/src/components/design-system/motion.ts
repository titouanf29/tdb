/**
 * Motion vocabulary.
 *
 * Animation here is a way of explaining something, never decoration. Every
 * value is deliberately slow: a movement the eye can follow reads as control,
 * a fast one reads as a glitch. Only `transform` and `opacity` are animated,
 * so nothing triggers layout.
 */
import type { Transition, Variants } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const DUR = {
  quick: 0.24,
  base: 0.52,
  slow: 0.9,
  draw: 1.8,
} as const;

export const transition = (duration = DUR.base, delay = 0): Transition => ({
  duration,
  delay,
  ease: EASE,
});

/** The single reveal used site-wide: rise a little, fade in. Nothing else. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0 },
};

/** Children appear one after another, slowly enough to read as a sequence. */
export const stagger = (gap = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: gap, delayChildren } },
});

/** Viewport rule shared by every reveal, so the whole page breathes in time. */
export const VIEWPORT = { once: true, amount: 0.3 } as const;
