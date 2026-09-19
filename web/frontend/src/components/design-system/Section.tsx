"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { reveal, stagger, transition, VIEWPORT, DUR } from "./motion";

/* ── Container ──────────────────────────────────────────────────────────── */

const WIDTHS = {
  text: "max-w-[42rem]",   // a comfortable measure — ~70 characters
  content: "max-w-[68rem]",
  wide: "max-w-[82rem]",
} as const;

export function Container({
  children,
  width = "content",
  className,
}: {
  children: React.ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    // `relative` by default: sections lay an absolutely-positioned Atmosphere
    // underneath, and a static container would be painted behind it.
    <div className={cn("relative mx-auto w-full px-6 sm:px-8", WIDTHS[width], className)}>
      {children}
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────────────── */

/**
 * One section, one idea.
 *
 * Vertical rhythm is the main structural tool: sections are separated by space,
 * not by rules and boxes. `tone="inverse"` flips to the navy surface for the
 * few moments that deserve a change of register.
 */
export function Section({
  children,
  id,
  tone = "default",
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  id?: string;
  tone?: "default" | "raised" | "inverse";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const pad = {
    sm: "py-16 sm:py-20",
    md: "py-20 sm:py-28",
    lg: "py-24 sm:py-36",
    xl: "py-28 sm:py-44",
  }[size];

  return (
    <section
      id={id}
      className={cn(
        pad,
        tone === "inverse" && "cap-dark",
        className
      )}
      style={
        tone === "raised"
          ? { backgroundColor: "var(--cap-surface)" }
          : tone === "inverse"
          ? { backgroundColor: "var(--cap-bg)", color: "var(--cap-ink)" }
          : undefined
      }
    >
      {children}
    </section>
  );
}

/* ── Reveal ─────────────────────────────────────────────────────────────── */

/** Scroll reveal. The only entrance animation in the system. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];

  if (reduce) return <Comp className={className}>{children}</Comp>;

  return (
    <Comp
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      transition={transition(DUR.base, delay)}
    >
      {children}
    </Comp>
  );
}

/** Wraps a group whose children reveal in sequence. */
export function RevealGroup({
  children,
  gap = 0.09,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  gap?: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={stagger(gap, delay)}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

/** A child of RevealGroup. Inherits the parent's stagger timing. */
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={reveal} transition={transition()}>
      {children}
    </motion.div>
  );
}
