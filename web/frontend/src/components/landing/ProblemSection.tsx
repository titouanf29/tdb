"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Atmosphere, Container, Eyebrow, Heading, Reveal, Section, Text, DUR, EASE,
} from "@/components/design-system";

/**
 * Section 2 — the problem, shown rather than argued.
 *
 * Forty scattered readings drift into four groups. The animation IS the
 * argument: nobody needs to be told that markets are noisy, they need to see
 * noise becoming structure. It runs once, slowly, and then stops.
 */

const GROUPS = ["Tendance", "Momentum", "Risque", "Contexte"];

// Fixed positions — a random scatter would re-roll on every render and,
// server-side, mismatch the client (the hydration bug the old page had).
const SCATTER = [
  [6, 18], [17, 9], [29, 24], [41, 12], [53, 27], [66, 8], [78, 21], [91, 15],
  [11, 42], [23, 55], [36, 38], [48, 61], [61, 44], [73, 57], [85, 40], [95, 63],
  [4, 72], [16, 86], [28, 69], [39, 91], [52, 74], [64, 88], [77, 71], [89, 84],
  [9, 31], [21, 78], [33, 51], [45, 33], [57, 95], [69, 36], [81, 66], [93, 49],
  [13, 60], [26, 16], [38, 82], [50, 47], [63, 20], [75, 93], [87, 29], [97, 76],
];

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduce = useReducedMotion();

  return (
    <Section id="probleme" tone="raised" className="relative overflow-hidden">
      <Atmosphere variant="side" />
      <Container width="wide">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20">
          <div>
            <Reveal>
              <Eyebrow>Le problème</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <Heading level={1} className="mt-5">
                Les marchés sont remplis de données.
              </Heading>
            </Reveal>
            <Reveal delay={0.12}>
              <Text size="lead" className="mt-6 max-w-[30rem]">
                Le problème n'est pas d'en trouver. Le problème est de savoir
                lesquelles regarder.
              </Text>
            </Reveal>
          </div>

          <div ref={ref} className="relative aspect-[4/3] w-full">
            {/* Phase 1 — scattered readings. */}
            {SCATTER.map(([x, y], i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute block h-[3px] w-[3px] rounded-full"
                style={{ left: `${x}%`, top: `${y}%`, backgroundColor: "var(--cap-ink-4)" }}
                initial={reduce ? { opacity: 0.5 } : { opacity: 0, scale: 0.4 }}
                animate={
                  reduce
                    ? { opacity: 0.25 }
                    : inView
                    ? {
                        opacity: [0, 1, 1, 0],
                        scale: [0.4, 1, 1, 0.6],
                        // Everything converges toward the column of groups.
                        left: [`${x}%`, `${x}%`, `${x}%`, "50%"],
                        top: [`${y}%`, `${y}%`, `${y}%`, `${18 + (i % 4) * 22}%`],
                      }
                    : {}
                }
                transition={{
                  duration: 3.4,
                  times: [0, 0.18, 0.55, 1],
                  delay: (i % 12) * 0.045,
                  ease: EASE,
                }}
              />
            ))}

            {/* Phase 2 — what is left once they are grouped. */}
            <div className="absolute inset-0 flex flex-col justify-center gap-4 sm:gap-5">
              {GROUPS.map((g, i) => (
                <motion.div
                  key={g}
                  className="flex items-center gap-4"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: DUR.slow, delay: reduce ? 0 : 2.6 + i * 0.16, ease: EASE }}
                >
                  <span
                    aria-hidden
                    className="h-px w-8 shrink-0"
                    style={{ backgroundColor: "var(--cap-ocean)" }}
                  />
                  <span
                    className="text-[1.15rem] font-semibold tracking-[-0.015em] sm:text-[1.35rem]"
                    style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
                  >
                    {g}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
