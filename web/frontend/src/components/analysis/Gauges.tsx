"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE, Num, Text } from "@/components/design-system";

/**
 * Two small pictures that replace two lists.
 *
 * A row reading "trend +0.92" asks the reader to hold a scale in their head
 * and place the number on it. A bar does that for them. Same data, same
 * precision — the figure is still printed — but the comparison between
 * families becomes a glance instead of an arithmetic exercise.
 *
 * This is the difference between showing data and dumping it, and it is the
 * whole reason the deeper levels exist rather than a raw JSON view.
 */

const FACTOR_LABELS: Record<string, string> = {
  trend: "Tendance",
  momentum: "Momentum",
  flow: "Flux",
  oscillators: "Oscillateurs",
  volume: "Volume",
};

/** Diverging bars, centred on zero: left is bearish, right is bullish. */
export function FactorBars({ directions }: { directions: Record<string, number> }) {
  const reduce = useReducedMotion();
  const rows = Object.entries(directions).filter(([, v]) => Number.isFinite(v));
  if (rows.length === 0) return null;

  return (
    <div className="space-y-4">
      {rows.map(([key, v], i) => {
        const pct = Math.min(1, Math.abs(v)) * 50; // half the track at most
        const bullish = v >= 0;
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-4">
              <span className="text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
                {FACTOR_LABELS[key] ?? key}
              </span>
              <Num tone={v > 0.1 ? "up" : v < -0.1 ? "down" : "muted"} className="text-[0.82rem]">
                {v >= 0 ? "+" : ""}{v.toFixed(2)}
              </Num>
            </div>

            <div className="relative h-[6px] w-full rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
              {/* The zero mark. Without it a short bar reads as "small value"
                  instead of "close to neutral".

                  2px at ink-4: a hairline at line-strong (navy, 15 %) was
                  invisible against the track it sits on. */}
              <span
                aria-hidden
                className="absolute left-1/2 top-[-4px] h-[14px] w-[2px] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: "var(--cap-ink-4)" }}
              />
              <motion.span
                className="absolute top-0 h-full rounded-full"
                style={{
                  backgroundColor: bullish ? "var(--cap-up)" : "var(--cap-down)",
                  left: bullish ? "50%" : undefined,
                  right: bullish ? undefined : "50%",
                }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: DUR.slow, delay: i * 0.06, ease: EASE }}
              />
            </div>
          </div>
        );
      })}
      <Text size="caption" className="pt-1">
        À gauche du repère : baissier. À droite : haussier. Plus la barre est
        longue, plus la famille est franche.
      </Text>
    </div>
  );
}

/**
 * Where the price stands between its support and its resistance.
 *
 * The three numbers alone never answered the question people actually ask —
 * "suis-je proche d'un niveau ?" — because answering it meant subtracting two
 * of them. Here the position is the picture.
 */
export function LevelScale({
  support,
  resistance,
  price,
  pivot,
  format,
}: {
  support: number;
  resistance: number;
  price: number;
  pivot?: number;
  format: (v: number) => string;
}) {
  const reduce = useReducedMotion();
  const span = resistance - support;
  if (!Number.isFinite(span) || span <= 0) return null;

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const pos = clamp(((price - support) / span) * 100);
  const pivotPos = pivot != null ? clamp(((pivot - support) / span) * 100) : null;

  const toRes = ((resistance - price) / price) * 100;
  const toSup = ((price - support) / price) * 100;

  return (
    <div>
      <div className="relative h-[46px]">
        {/* The track runs support → resistance, so left is the floor. */}
        <div
          className="absolute inset-x-0 top-[22px] h-[6px] rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--cap-up) 0%, var(--cap-line-strong) 50%, var(--cap-down) 100%)",
            opacity: 0.35,
          }}
        />

        {pivotPos != null && (
          <span
            aria-hidden
            className="absolute top-[17px] h-[16px] w-px"
            style={{ left: `${pivotPos}%`, backgroundColor: "var(--cap-ink-4)" }}
          />
        )}

        <motion.span
          className="absolute top-[16px] h-[18px] w-[18px] -translate-x-1/2 rounded-full"
          style={{
            backgroundColor: "var(--cap-surface)",
            boxShadow: "inset 0 0 0 2px var(--cap-ocean)",
          }}
          initial={reduce ? false : { left: "50%", opacity: 0 }}
          animate={{ left: `${pos}%`, opacity: 1 }}
          transition={{ duration: DUR.slow, ease: EASE }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <div>
          <Num tone="up" className="block text-[0.9rem]">{format(support)}</Num>
          <span className="text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>Support</span>
        </div>
        <div className="text-center">
          <Num className="block text-[0.9rem]">{format(price)}</Num>
          <span className="text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>Prix</span>
        </div>
        <div className="text-right">
          <Num tone="down" className="block text-[0.9rem]">{format(resistance)}</Num>
          <span className="text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>Résistance</span>
        </div>
      </div>

      <Text size="caption" className="mt-4">
        {toRes < toSup
          ? `La résistance est plus proche : ${toRes.toFixed(1)} % au-dessus, contre ${toSup.toFixed(1)} % jusqu'au support.`
          : `Le support est plus proche : ${toSup.toFixed(1)} % en dessous, contre ${toRes.toFixed(1)} % jusqu'à la résistance.`}
      </Text>
    </div>
  );
}
