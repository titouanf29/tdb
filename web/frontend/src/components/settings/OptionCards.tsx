"use client";

import { useRef, KeyboardEvent, ElementType, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OptionCard {
  id: string;
  label: string;
  description?: ReactNode;
  emoji?: string;
  badge?: string;
  icon?: ElementType;
  /** Optional swatch color (accent picker) rendered instead of an icon. */
  swatch?: string;
}

interface Props {
  options: OptionCard[];
  value: string | null | undefined;
  onSelect: (id: string) => void;
  /** Grid columns at the sm breakpoint. */
  columns?: 1 | 2 | 3 | 4 | 5;
  disabled?: boolean;
  /** Accessible name for the whole group. */
  label: string;
  className?: string;
  size?: "md" | "sm";
}

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  // 5 accent swatches: 3 across on a phone (a 5-col grid leaves ~33px of
  // content per cell at 390px and the labels collapse to one glyph)
  5: "grid-cols-3 sm:grid-cols-5",
};

/**
 * One generic radio-card grid — trading level, style, risk, leverage, currency,
 * theme, accent and recap all render through this. Real radiogroup semantics
 * with roving tabindex and arrow-key navigation.
 */
export function OptionCards({
  options, value, onSelect, columns = 2, disabled, label, className, size = "md",
}: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Move FOCUS only — never select. Selecting here has side effects (a PUT per
  // keypress, a theme flip, and on the Account tab it opens a modal), and the
  // ARIA radiogroup pattern explicitly allows focus-only movement when
  // selection triggers an action. Space/Enter activates the focused card.
  const move = (from: number, delta: number) => {
    if (!options.length) return;
    const next = (from + delta + options.length) % options.length;
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(i, 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(i, -1); }
  };

  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value));

  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2.5", COLS[columns], className)}>
      {options.map((opt, i) => {
        const Icon = opt.icon;
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === activeIndex ? 0 : -1}
            disabled={disabled}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "relative text-left rounded-xl border transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              size === "sm" ? "p-3" : "p-4",
              disabled ? "opacity-60 cursor-not-allowed" : "hover-lift",
              active
                ? "bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
          >
            <div className="flex items-center gap-2">
              {opt.swatch && (
                <span
                  aria-hidden="true"
                  className="w-5 h-5 rounded-full shadow-md shrink-0"
                  style={{ backgroundColor: opt.swatch, boxShadow: `0 0 10px ${opt.swatch}60` }}
                />
              )}
              {opt.emoji && <span className="text-lg leading-none" aria-hidden="true">{opt.emoji}</span>}
              {Icon && (
                <Icon
                  className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                  aria-hidden="true"
                />
              )}
              <span className={cn("font-semibold text-sm truncate", active && "text-primary")}>
                {opt.label}
              </span>
              {opt.badge && (
                <span className="ml-auto text-[10px] text-muted-foreground bg-white/10 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                  {opt.badge}
                </span>
              )}
              {active && !opt.badge && <Check className="w-4 h-4 ml-auto shrink-0 text-primary" aria-hidden="true" />}
            </div>
            {opt.description && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{opt.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
