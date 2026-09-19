"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Num } from "./Text";

/**
 * A line of data — the workhorse that replaces the grid of little stat cards.
 *
 * A list reads faster than a mosaic: the eye runs down one column of names and
 * one column of figures instead of hopping between fifteen boxes. Separation
 * is a hairline between rows, nothing more.
 */
export function DataRow({
  label,
  sub,
  value,
  change,
  href,
  onClick,
  className,
}: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  value?: React.ReactNode;
  /** Signed percentage. Colour is applied from the sign, never passed in. */
  change?: number | null;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <div className="truncate text-[0.925rem] font-medium" style={{ color: "var(--cap-ink)" }}>
          {label}
        </div>
        {sub != null && (
          <div className="mt-0.5 truncate text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>
            {sub}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-baseline gap-4 sm:gap-6">
        {value != null && <Num className="text-[0.95rem]">{value}</Num>}
        {change != null && (
          <Num
            tone={change >= 0 ? "up" : "down"}
            className="w-[4.5rem] text-right text-[0.9rem]"
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)} %
          </Num>
        )}
      </div>
    </>
  );

  const cls = cn(
    "flex w-full items-center justify-between gap-4 py-3.5 text-left",
    (href || onClick) && "transition-colors duration-150 hover:bg-[color:var(--cap-surface-2)] -mx-3 px-3 rounded-[8px]",
    className
  );

  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Hairline-separated stack of rows. */
export function DataList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "[&>*+*]:border-t [&>*+*]:border-[color:var(--cap-line)]",
        className
      )}
    >
      {children}
    </div>
  );
}
