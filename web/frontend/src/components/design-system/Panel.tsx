"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A compartment: one titled box holding one subject.
 *
 * The landing page could separate ideas with space alone, because the reader
 * moves through it once, top to bottom. A workspace is scanned, not read — the
 * eye jumps to the thing it came for — and a jump needs edges to land on. So
 * inside the app, sections become panels: a title, an optional aside on the
 * right, the content, and an optional link out at the bottom.
 *
 * The same four slots every time. Predictable furniture is what makes a tool
 * feel learned after one visit instead of five.
 */
export function Panel({
  title,
  hint,
  aside,
  children,
  action,
  tone = "surface",
  className,
}: {
  title?: string;
  /** One line under the title. Says what the panel is for, when it is not obvious. */
  hint?: string;
  /** Top-right slot: a control, a figure, a timestamp. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  action?: { label: string; href: string };
  tone?: "surface" | "quiet";
  className?: string;
}) {
  return (
    <section
      className={cn("flex flex-col overflow-hidden", className)}
      style={{
        borderRadius: "var(--cap-r-xl)",
        backgroundColor: tone === "quiet" ? "transparent" : "var(--cap-surface)",
        boxShadow:
          tone === "quiet"
            ? "inset 0 0 0 1px var(--cap-line)"
            : "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
      }}
    >
      {(title || aside) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {title && (
              <h2
                className="text-[1.02rem] font-semibold tracking-[-0.015em]"
                style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
              >
                {title}
              </h2>
            )}
            {hint && (
              <p className="mt-1 text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
                {hint}
              </p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </header>
      )}

      <div className="flex-1 px-5 py-5 sm:px-6 sm:py-6">{children}</div>

      {action && (
        <Link
          href={action.href}
          className="flex items-center justify-between gap-2 border-t px-5 py-3.5 text-[0.85rem] transition-colors hover:bg-[color:var(--cap-surface-2)] sm:px-6"
          style={{ borderColor: "var(--cap-line)", color: "var(--cap-ocean)" }}
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
