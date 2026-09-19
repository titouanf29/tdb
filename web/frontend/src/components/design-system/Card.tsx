"use client";

import { cn } from "@/lib/utils";

/**
 * A surface, not a widget.
 *
 * Most content does not need a card at all — spacing separates ideas better
 * than boxes do. Reach for one only when something genuinely is a distinct
 * object: an analysis, a position, a panel that can be acted on.
 */
export function Card({
  children,
  tone = "surface",
  padding = "md",
  radius = "lg",
  interactive = false,
  className,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "surface" | "flat" | "outline";
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "md" | "lg" | "xl";
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const pad = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" }[padding];
  const r = { md: "var(--cap-r-md)", lg: "var(--cap-r-lg)", xl: "var(--cap-r-xl)" }[radius];

  const style: React.CSSProperties = {
    borderRadius: r,
    backgroundColor: tone === "flat" ? "transparent" : "var(--cap-surface)",
    boxShadow:
      tone === "outline"
        ? "inset 0 0 0 1px var(--cap-line)"
        : tone === "surface"
        ? "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)"
        : undefined,
  };

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={cn(
        pad,
        onClick && "w-full text-left",
        interactive && "transition-colors duration-200 hover:bg-[color:var(--cap-surface-2)]",
        className
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}
