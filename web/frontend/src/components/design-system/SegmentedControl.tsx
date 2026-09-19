"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { DUR, EASE } from "./motion";

/**
 * A row of mutually exclusive choices.
 *
 * The selected state is a single filled shape that slides between options —
 * one object moving, rather than several lighting up. Slightly rounded, never
 * a set of capsules.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();

  const pad = size === "sm" ? "px-3 h-8 text-[0.82rem]" : "px-4 h-10 text-[0.9rem]";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex gap-1 rounded-[10px] p-1", className)}
      style={{ backgroundColor: "var(--cap-surface-2)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-[7px] font-medium transition-colors duration-200",
              pad
            )}
            style={{ color: active ? "var(--cap-ink)" : "var(--cap-ink-3)" }}
          >
            {active && (
              <motion.span
                layoutId={reduce ? undefined : `seg-${layoutId}`}
                className="absolute inset-0 rounded-[7px]"
                style={{
                  backgroundColor: "var(--cap-surface)",
                  boxShadow: "0 1px 2px rgba(11,23,38,0.06)",
                }}
                transition={{ duration: DUR.quick, ease: EASE }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
