"use client";

import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  /** Accessible name — required, the control has no visible text of its own. */
  label: string;
  id?: string;
}

/** Accessible switch: real <button role="switch">, keyboard-operable, focus ring. */
export function Toggle({ checked, onChange, disabled, label, id }: Props) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "opacity-50 cursor-not-allowed",
        // Explicit colours rather than white-alpha: in light mode a
        // 15%-white track carrying a white knob is invisible on a near-white
        // card, which hid the state of the Alerts tab's main control.
        checked ? "bg-primary" : "bg-[hsl(var(--muted-foreground)/0.35)]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-5 w-5 transform rounded-full shadow transition-transform",
          "bg-white ring-1 ring-black/10",
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
