"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * A figure that counts up when it first comes into view.
 *
 * The movement is the point: watching 0 → 78 says "this was computed" in a way
 * that printing 78 does not. It runs once, then the number is simply a number.
 */
export function CountUp({
  to,
  duration = 1.1,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      // Decelerating: fast at first, settling at the end.
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={cn("cap-num", className)}>
      {prefix}
      {/* À la française : « 1 527 », « 12,5 » — toFixed écrivait « 1527 » et « 12.5 ». */}
      {value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/**
 * A labelled figure. Label below the value, not above: the number is what the
 * eye should land on first.
 */
export function Metric({
  value,
  label,
  tone = "ink",
  size = "md",
  className,
}: {
  value: React.ReactNode;
  label: string;
  tone?: "ink" | "up" | "down" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-[1.15rem]",
    md: "text-[1.6rem]",
    lg: "text-[clamp(2rem,4vw,2.75rem)]",
  }[size];

  const color = {
    ink: "var(--cap-ink)",
    up: "var(--cap-up)",
    down: "var(--cap-down)",
    accent: "var(--cap-ocean)",
  }[tone];

  return (
    <div className={className}>
      <div className={cn("cap-num font-medium leading-none", sizes)} style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
        {label}
      </div>
    </div>
  );
}
