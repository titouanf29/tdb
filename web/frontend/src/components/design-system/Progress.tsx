"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DUR, EASE, VIEWPORT } from "./motion";
import { Num } from "./Text";

/**
 * A factor bar. Thin, single-colour, no gradient.
 *
 * The bar exists to make several factors comparable at a glance — so they all
 * share one scale and one colour. Tinting each one differently would turn a
 * comparison into a decoration.
 */
export function Progress({
  value,
  label,
  max = 100,
  showValue = true,
  delay = 0,
  className,
}: {
  value: number;
  label?: string;
  max?: number;
  showValue?: boolean;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-baseline justify-between gap-4">
          {label && (
            <span className="text-[0.875rem]" style={{ color: "var(--cap-ink-2)" }}>
              {label}
            </span>
          )}
          {showValue && <Num className="text-[0.875rem]">{Math.round(value)}</Num>}
        </div>
      )}
      <div
        className="h-[3px] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--cap-line)" }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "var(--cap-ocean)" }}
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={VIEWPORT}
          transition={{ duration: DUR.slow, delay, ease: EASE }}
        />
      </div>
    </div>
  );
}
