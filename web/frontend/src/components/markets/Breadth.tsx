"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE, Num, Text } from "@/components/design-system";

/**
 * Two pictures of a market's day.
 *
 * "Combien montent, combien baissent" is the first question anyone asks about
 * a market, and the old screen answered it by printing twenty rows and letting
 * the reader count green ones. Counting is not reading. A bar whose green part
 * is two-thirds of its length says the same thing in the time it takes to
 * glance at it, and the figures stay printed underneath for anyone who wants
 * them exactly.
 */

export interface Move {
  symbol: string;
  name: string;
  change: number;
}

/** How much of the market is up, as one bar. */
export function BreadthBar({
  up,
  down,
  flat = 0,
  height = 5,
}: {
  up: number;
  down: number;
  flat?: number;
  height?: number;
}) {
  const total = up + down + flat;
  if (total === 0) return null;
  const pct = (n: number) => (n / total) * 100;

  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height, backgroundColor: "var(--cap-line)" }}
      role="img"
      aria-label={`${up} en hausse, ${down} en baisse`}
    >
      {up > 0 && <span style={{ width: `${pct(up)}%`, backgroundColor: "var(--cap-up)" }} />}
      {flat > 0 && <span style={{ width: `${pct(flat)}%`, backgroundColor: "var(--cap-ink-4)" }} />}
      {down > 0 && <span style={{ width: `${pct(down)}%`, backgroundColor: "var(--cap-down)" }} />}
    </div>
  );
}

/**
 * The day's moves, as bars either side of zero.
 *
 * The previous screen put gainers in one box and losers in another, each with
 * a logo, a name, a symbol and a percentage. Two boxes make the two lists look
 * like two subjects; they are one subject — the spread of the day — and a
 * single axis shows the spread. The longest bar is the biggest move whichever
 * way it went, which is the comparison that was impossible before.
 */
export function MoveBars({
  items,
  onSelect,
}: {
  items: Move[];
  onSelect?: (symbol: string) => void;
}) {
  const reduce = useReducedMotion();
  if (items.length === 0) return null;

  // Scaled to the biggest absolute move on screen, with a 1 % floor so a calm
  // day does not blow a 0.04 % move up into a full-width bar.
  const peak = Math.max(1, ...items.map((m) => Math.abs(m.change)));

  return (
    <div className="space-y-3">
      {items.map((m, i) => {
        const width = (Math.abs(m.change) / peak) * 50;
        const bullish = m.change >= 0;
        const row = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-[0.85rem]" style={{ color: "var(--cap-ink)" }}>
                {m.name}
              </span>
              <Num tone={bullish ? "up" : "down"} className="shrink-0 text-[0.82rem]">
                {bullish ? "+" : ""}
                {m.change.toFixed(2)} %
              </Num>
            </div>
            <div className="relative h-[5px] w-full rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
              {/* Zero. Without the mark, a short bar reads as "small" rather
                  than "close to flat", and the two mean different things. */}
              <span
                aria-hidden
                className="absolute left-1/2 top-[-3px] h-[11px] w-px"
                style={{ backgroundColor: "var(--cap-line-strong)" }}
              />
              <motion.span
                className="absolute top-0 h-full rounded-full"
                style={{
                  backgroundColor: bullish ? "var(--cap-up)" : "var(--cap-down)",
                  left: bullish ? "50%" : undefined,
                  right: bullish ? undefined : "50%",
                }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: DUR.slow, delay: i * 0.05, ease: EASE }}
              />
            </div>
          </>
        );

        return onSelect ? (
          <button
            key={m.symbol}
            onClick={() => onSelect(m.symbol)}
            className="-mx-3 block w-full rounded-[9px] px-3 py-1.5 text-left transition-colors hover:bg-[color:var(--cap-surface-2)]"
          >
            {row}
          </button>
        ) : (
          <div key={m.symbol} className="px-0 py-1.5">
            {row}
          </div>
        );
      })}
      <Text size="caption" className="pt-1">
        À gauche du repère : en baisse. À droite : en hausse. La plus longue
        barre est le plus gros mouvement de la journée.
      </Text>
    </div>
  );
}
