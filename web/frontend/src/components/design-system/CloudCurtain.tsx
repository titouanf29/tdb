"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SILHOUETTES } from "./CloudLayer";
import { EASE } from "./motion";
import { useMouvementReduit } from "./useMouvementReduit";

/**
 * Weather closing over the screen while something loads, then parting.
 *
 * A spinner says "wait". This says "the sky is being read" — and it is the
 * same sky as the landing page, so moving from the public site into the app
 * feels like walking through one building rather than two.
 *
 * Two banks: one sweeps down from the top, one up from the bottom. They meet,
 * hold for as long as the work takes, then draw apart. The middle is opaque,
 * so whatever is rendering underneath is never seen half-built.
 *
 * Under prefers-reduced-motion it becomes a plain fade of the same colour —
 * a full-screen wipe is exactly what that setting is for.
 */

const TOP_BANK = [0, 2, 1, 3, 0, 2];
const BOTTOM_BANK = [2, 1, 3, 0, 2, 1];

function Mass({
  shape,
  flip,
  invert,
  index,
}: {
  shape: number;
  flip: boolean;
  /** Upside down, for the bank coming from the top. */
  invert: boolean;
  index: number;
}) {
  const id = useId().replace(/:/g, "");
  const { lobes, base } = SILHOUETTES[shape];

  return (
    <svg
      viewBox="0 0 200 100"
      className="shrink-0"
      style={{
        width: "19%",
        marginLeft: "-2%",
        // Staggered heights, so the meeting line is a skyline and not a ruler.
        marginTop: invert ? `${-2 - (index % 3) * 2}vh` : undefined,
        marginBottom: invert ? undefined : `${-2 - (index % 3) * 2}vh`,
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cap-cloud-light)" />
          <stop offset="52%" stopColor="var(--cap-cloud-mid)" />
          <stop offset="100%" stopColor="var(--cap-cloud-shade)" />
        </linearGradient>
        <filter id={`${id}-s`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <g
        filter={`url(#${id}-s)`}
        fill={`url(#${id}-f)`}
        transform={[
          flip ? "translate(200,0) scale(-1,1)" : "",
          invert ? "translate(0,100) scale(1,-1)" : "",
        ].filter(Boolean).join(" ") || undefined}
      >
        <ellipse cx={base[0]} cy={base[1]} rx={base[2]} ry={base[3]} />
        {lobes.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

export function CloudCurtain({
  active,
  label = "Chargement",
}: {
  active: boolean;
  label?: string;
}) {
  const reduce = useMouvementReduit();

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[70]"
          initial={{ opacity: reduce ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduce ? 0 : 1 }}
          transition={{ duration: reduce ? 0.25 : 0 }}
          role="status"
          aria-live="polite"
          aria-label={label}
        >
          {/* The opaque middle. It is what actually hides the page; the banks
              are the edges that make it read as cloud. */}
          <motion.div
            className="absolute inset-x-0"
            style={{ backgroundColor: "var(--cap-cloud-mid)" }}
            initial={reduce ? { top: 0, bottom: 0 } : { top: "38%", bottom: "38%" }}
            animate={{ top: "0%", bottom: "0%" }}
            exit={reduce ? {} : { top: "-60%", bottom: "-60%" }}
            transition={{ duration: 0.62, ease: EASE }}
          />

          {!reduce && (
            <>
              <motion.div
                className="absolute inset-x-0 top-0 flex w-full items-start"
                initial={{ y: "-100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-120%" }}
                transition={{ duration: 0.62, ease: EASE }}
              >
                <div className="flex w-full items-start" style={{ transform: "translateY(-1px)" }}>
                  {TOP_BANK.map((s, i) => (
                    <Mass key={i} shape={s} flip={i % 2 === 0} invert index={i} />
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="absolute inset-x-0 bottom-0 flex w-full items-end"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "120%" }}
                transition={{ duration: 0.62, ease: EASE }}
              >
                <div className="flex w-full items-end" style={{ transform: "translateY(1px)" }}>
                  {BOTTOM_BANK.map((s, i) => (
                    <Mass key={i} shape={s} flip={i % 2 === 1} invert={false} index={i} />
                  ))}
                </div>
              </motion.div>
            </>
          )}

          {/* One line in the middle of the weather. It appears late, so a fast
              load never flashes a word nobody had time to read. */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <span
              className="text-[0.82rem] tracking-[0.06em]"
              style={{ color: "var(--cap-ink-3)" }}
            >
              {label}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Plays the curtain for a moment whenever the route changes.
 *
 * `key` is the caller's pathname; the hook returns whether the curtain should
 * be up. Deliberately brief — a transition that outlasts the navigation turns
 * a fast app into a slow one.
 */
export function useRouteCurtain(key: string, ms = 620): boolean {
  const [active, setActive] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setActive(true);
    const t = setTimeout(() => setActive(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);

  return active;
}
