"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Three intents, and that is the whole set.
 *
 * Radii are 8–12px: enough to feel considered, never a capsule. Hover changes
 * the surface, not the size — nothing lifts, nothing glows.
 */

type Variant = "primary" | "secondary" | "quiet";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.85rem] rounded-[8px]",
  md: "h-11 px-5 text-[0.925rem] rounded-[10px]",
  lg: "h-[3.25rem] px-7 text-[1rem] rounded-[12px]",
};

function styles(variant: Variant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return { backgroundColor: "var(--cap-navy)", color: "#F2F5F7" };
    case "secondary":
      return {
        backgroundColor: "transparent",
        color: "var(--cap-ink)",
        boxShadow: "inset 0 0 0 1px var(--cap-line-strong)",
      };
    case "quiet":
      return { backgroundColor: "transparent", color: "var(--cap-ink-2)" };
  }
}

const HOVER: Record<Variant, string> = {
  primary: "hover:brightness-[1.18]",
  secondary: "hover:bg-[color:var(--cap-surface-2)]",
  quiet: "hover:text-[color:var(--cap-ink)]",
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium " +
  "transition-[background-color,color,filter,box-shadow] duration-200 " +
  "disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap";

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  type = "button",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const cls = cn(base, SIZES[size], HOVER[variant], className);

  if (href) {
    return (
      <Link href={href} className={cls} style={styles(variant)} aria-label={ariaLabel} data-btn={variant}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={styles(variant)}
      aria-label={ariaLabel}
      data-btn={variant}
    >
      {children}
    </button>
  );
}
