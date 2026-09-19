"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Atmosphere, LiveBackdrop, Button, Container, Contours, Heading, Num, ScoreDial, Section, Text, Waypoint,
  DUR, EASE,
} from "@/components/design-system";
import { AnalysisVisual } from "./AnalysisVisual";
import { DEMO_ASSETS } from "./demoData";

/**
 * Two sentences, two buttons, and the product's actual output.
 *
 * Everything a visitor needs to decide is above the fold, and the thing they
 * are deciding about is shown rather than claimed: the panel below the copy is
 * a real analysis layout, not a screenshot mock or a wall of statistics.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const apple = DEMO_ASSETS[0];

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: DUR.slow, delay, ease: EASE },
        };

  return (
    <Section id="depart" size="xl" className="relative overflow-hidden pt-32 sm:pt-40">
      {/* Three layers, deliberately unequal. The sky is now the loud one, so
          everything that shares the screen with it steps back: the contour
          lines drop from six to four at half strength, and the market line
          runs at 55%. Adding presence in one place means removing it in the
          others, or the opening just gets busy. */}
      <Atmosphere variant="top" />
      <LiveBackdrop clouds={false} opacity={0.55} />
      <Contours
        className="absolute inset-x-0 top-0 h-[420px] w-full"
        lines={4}
        opacity={0.45}
      />

      <Container width="wide" className="relative">
        <div className="mx-auto max-w-[48rem] text-center">
          <motion.p
            {...enter(0)}
            className="text-[0.78rem] font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--cap-ocean)" }}
          >
            CaptenTDB
          </motion.p>

          <motion.div {...enter(0.1)} className="mt-6">
            <Heading level="display" as="h1">
              Comprendre les marchés.
              <br />
              {/* ink-2, not ink-3: the second half of the promise is not
                  secondary information, it just arrives second. */}
              <span style={{ color: "var(--cap-ink-2)" }}>Apprendre sans risquer.</span>
            </Heading>
          </motion.div>

          <motion.div {...enter(0.2)} className="mx-auto mt-7 max-w-[34rem]">
            <Text size="lead">
              Une plateforme de paper trading éducatif qui transforme des données
              financières complexes en décisions compréhensibles.
            </Text>
          </motion.div>

          <motion.div
            {...enter(0.3)}
            className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          >
            {/* Equal width when stacked: two buttons of different lengths sitting
                one above the other read as a primary and an afterthought. */}
            <Button href="/register" size="lg" className="w-full sm:w-auto">
              Commencer gratuitement
            </Button>
            <Button href="#demo" variant="secondary" size="lg" className="w-full sm:w-auto">
              Découvrir la démo
            </Button>
          </motion.div>

          <motion.div {...enter(0.4)} className="mt-6">
            <Text size="caption" tone="faint">
              Gratuit · Aucune carte bancaire · Argent virtuel uniquement
            </Text>
          </motion.div>
        </div>

        {/* ── The product itself ─────────────────────────────────────────── */}
        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 40 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: DUR.slow, delay: 0.5, ease: EASE },
              })}
          className="mx-auto mt-20 max-w-[60rem] sm:mt-24"
        >
          <div
            className="overflow-hidden"
            style={{
              borderRadius: "var(--cap-r-xl)",
              backgroundColor: "var(--cap-surface)",
              boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)",
            }}
          >
            {/* Header: what, how much, which way. */}
            <div className="flex flex-wrap items-end justify-between gap-6 px-6 pt-6 sm:px-9 sm:pt-8">
              <div>
                <div className="flex items-center gap-2.5">
                  <Waypoint size={11} />
                  <span
                    className="text-[1.35rem] font-semibold tracking-[-0.02em]"
                    style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}
                  >
                    {apple.name}
                  </span>
                  <span className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>
                    {apple.ticker}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <Num className="text-[1.75rem] font-medium">{apple.price}</Num>
                  <Num tone="up" className="text-[0.95rem]">
                    +{apple.change.toFixed(2)} %
                  </Num>
                </div>
              </div>

              <div className="text-right">
                <div
                  className="text-[0.75rem] uppercase tracking-[0.14em]"
                  style={{ color: "var(--cap-ink-3)" }}
                >
                  Direction
                </div>
                <div
                  className="mt-1.5 text-[1.1rem] font-semibold"
                  style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-up)" }}
                >
                  {apple.direction}
                </div>
                <div className="mt-2 flex justify-end">
                  <ScoreDial score={apple.score} size={124} />
                </div>
              </div>
            </div>

            <div className="mt-6 h-[240px] w-full sm:h-[280px]">
              <AnalysisVisual
                series={{ points: apple.series, support: apple.support, resistance: apple.resistance }}
                className="h-full w-full"
              />
            </div>

            {/* The explanation. This is the product's actual claim. */}
            <div
              className="border-t px-6 py-6 sm:px-9 sm:py-7"
              style={{ borderColor: "var(--cap-line)" }}
            >
              <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                Pourquoi
              </div>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-x-10">
                {apple.reasons.map((r) => (
                  <li key={r} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-[0.55rem] h-px w-3 shrink-0"
                      style={{ backgroundColor: "var(--cap-ocean)" }}
                    />
                    <Text size="small" tone="ink" as="span">
                      {r}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-3 text-center text-[0.72rem]" style={{ color: "var(--cap-ink-4)" }}>
            Exemple d'analyse — données d'illustration
          </p>
        </motion.div>
      </Container>
    </Section>
  );
}
