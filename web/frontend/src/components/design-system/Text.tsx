"use client";

import { cn } from "@/lib/utils";

/**
 * Type scale.
 *
 * One family, Public Sans, for headings, prose and figures (see
 * app/layout.tsx); hierarchy comes from size and weight. Sizes are fluid so the hierarchy
 * survives from a phone to a large monitor without a stack of breakpoints.
 */

const HEADING = {
  // Capped at 4rem: past that a two-line headline breaks in the wrong place on
  // a laptop, and the sentence stops reading as one thought.
  display: "text-[clamp(2.4rem,5.2vw,4rem)] leading-[1.06] tracking-[-0.02em] font-bold",
  1: "text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08] tracking-[-0.018em] font-bold",
  2: "text-[clamp(1.5rem,2.8vw,2.25rem)] leading-[1.15] tracking-[-0.012em] font-bold",
  3: "text-[clamp(1.125rem,1.7vw,1.4rem)] leading-[1.3] tracking-[-0.004em] font-semibold",
  4: "text-[0.95rem] leading-[1.4] tracking-[0em] font-semibold",
} as const;

export function Heading({
  children,
  level = 2,
  as,
  className,
  tone = "ink",
}: {
  children: React.ReactNode;
  level?: keyof typeof HEADING;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div";
  className?: string;
  tone?: "ink" | "muted" | "accent";
}) {
  const Tag = as ?? (level === "display" ? "h1" : (`h${level}` as "h2"));
  return (
    <Tag
      className={cn(HEADING[level], "text-balance", className)}
      style={{
        fontFamily: "var(--cap-font-display)",
        color:
          tone === "muted" ? "var(--cap-ink-2)"
          : tone === "accent" ? "var(--cap-ocean)"
          : "var(--cap-ink)",
      }}
    >
      {children}
    </Tag>
  );
}

const TEXT = {
  lead: "text-[clamp(1.05rem,1.6vw,1.3rem)] leading-[1.6]",
  body: "text-[1rem] leading-[1.65]",
  small: "text-[0.9rem] leading-[1.55]",
  caption: "text-[0.82rem] leading-[1.45]",
} as const;

export function Text({
  children,
  size = "body",
  tone = "muted",
  className,
  as = "p",
}: {
  children: React.ReactNode;
  size?: keyof typeof TEXT;
  tone?: "ink" | "muted" | "faint" | "accent" | "up" | "down";
  className?: string;
  as?: "p" | "span" | "div" | "li";
}) {
  const Tag = as;
  const color = {
    ink: "var(--cap-ink)",
    muted: "var(--cap-ink-2)",
    faint: "var(--cap-ink-3)",
    accent: "var(--cap-ocean)",
    up: "var(--cap-up)",
    down: "var(--cap-down)",
  }[tone];

  return (
    <Tag className={cn(TEXT[size], "text-pretty", className)} style={{ color }}>
      {children}
    </Tag>
  );
}

/**
 * The small label above a section title. Sentence case, letter-spaced, never
 * a monospace chip — that was the old terminal tic this rebuild drops.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      data-eyebrow
      className={cn("text-[0.75rem] font-medium tracking-[0.14em] uppercase", className)}
      style={{ color: "var(--cap-ocean)" }}
    >
      {children}
    </p>
  );
}

/** Figures. The only place the monospace is allowed. */
export function Num({
  children,
  className,
  tone = "ink",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "ink" | "muted" | "up" | "down" | "accent";
}) {
  const color = {
    ink: "var(--cap-ink)",
    muted: "var(--cap-ink-2)",
    up: "var(--cap-up)",
    down: "var(--cap-down)",
    accent: "var(--cap-ocean)",
  }[tone];
  return (
    <span className={cn("cap-num", className)} style={{ color }}>
      {children}
    </span>
  );
}
