"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * One course, plotted down the whole page.
 *
 * Instead of repeating a decorative motif section after section, the page has
 * a single continuous line running from its first screen to its last. It draws
 * itself in proportion to how far you have read, and each section is a
 * waypoint that fills as you reach it.
 *
 * So it is the identity and the progress indicator at once — which is the
 * only reason it earns its place. A scroll bar already says how far down you
 * are; this says how far along you are, and names where you stand. It moves
 * only when the reader moves: there is no loop, nothing pulses, and it stops
 * the moment scrolling stops.
 *
 * Shown only from 2xl up. Below that the content column already reaches the
 * viewport edge, so the rail would sit on top of the text rather than in the
 * margin — and a gutter narrow enough to fit would have nothing to say.
 */

export interface CourseStop {
  id: string;
  label: string;
}

const PATH =
  "M 20 8 C 20 90, 8 140, 12 220 C 16 300, 30 340, 26 420 " +
  "C 22 500, 8 540, 13 620 C 18 700, 30 740, 24 820 C 19 900, 20 940, 20 992";

export function PageCourse({ stops }: { stops: CourseStop[] }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // A little inertia so the line does not twitch with every wheel notch.
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const pathLength = useTransform(progress, [0, 0.97], [0, 1]);

  const [reached, setReached] = useState<number>(-1);

  // Which waypoint the reader has passed. Read from the sections themselves
  // rather than from a fraction of the page, so it stays correct when a
  // section's height changes.
  useEffect(() => {
    const onScroll = () => {
      const marker = window.innerHeight * 0.4;
      let current = -1;
      stops.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= marker) current = i;
      });
      setReached(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [stops]);

  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-6 z-30 hidden w-[100px] 2xl:block"
      aria-hidden
    >
      <div className="relative h-full">
        <svg
          viewBox="0 0 40 1000"
          preserveAspectRatio="none"
          className="absolute inset-y-0 left-0 h-full w-[40px]"
        >
          {/* The course not yet travelled. */}
          <path d={PATH} fill="none" stroke="var(--cap-line)" strokeWidth="1.25" />
          {/* The part behind you. */}
          <motion.path
            d={PATH}
            fill="none"
            stroke="var(--cap-ocean)"
            strokeWidth="1.25"
            strokeLinecap="round"
            style={reduce ? { pathLength: 1 } : { pathLength }}
            opacity={0.75}
          />
        </svg>

        {/* Waypoints, spaced down the viewport and labelled. */}
        <ul className="absolute inset-y-0 left-0 flex flex-col justify-center gap-7 pl-[9px]">
          {stops.map((s, i) => {
            const passed = i <= reached;
            const current = i === reached;
            return (
              <li key={s.id} className="flex items-center gap-3">
                <span
                  className="relative block h-[9px] w-[9px] rounded-full transition-colors duration-500"
                  style={{
                    backgroundColor: passed ? "var(--cap-ocean)" : "var(--cap-surface)",
                    boxShadow: `0 0 0 1px ${passed ? "var(--cap-ocean)" : "var(--cap-line-strong)"}`,
                  }}
                />
                <span
                  className="whitespace-nowrap text-[0.68rem] tracking-[0.04em] transition-opacity duration-500"
                  style={{
                    color: current ? "var(--cap-ink-2)" : "var(--cap-ink-3)",
                    opacity: current ? 1 : 0.45,
                  }}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
