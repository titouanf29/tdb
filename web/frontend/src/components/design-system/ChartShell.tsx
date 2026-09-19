"use client";

import { cn } from "@/lib/utils";

/**
 * The frame a chart lives in.
 *
 * Charts are the main visual material of this product, so the frame around one
 * stays quiet: a title, an optional figure, and the plot. No toolbar, no legend
 * of twenty series, no grid shouting through the data.
 */
export function ChartShell({
  title,
  subtitle,
  right,
  children,
  footer,
  height = 320,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{
        borderRadius: "var(--cap-r-xl)",
        backgroundColor: "var(--cap-surface)",
        boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
      }}
    >
      {(title || right) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            {title && (
              <div
                className="text-[1.05rem] font-semibold tracking-[-0.015em]"
                style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-1 text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
                {subtitle}
              </div>
            )}
          </div>
          {right && <div className="shrink-0 text-right">{right}</div>}
        </div>
      )}

      <div style={{ height }} className="relative w-full px-1 sm:px-2">
        {children}
      </div>

      {footer && (
        <div
          className="border-t px-5 py-4 sm:px-7"
          style={{ borderColor: "var(--cap-line)" }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
