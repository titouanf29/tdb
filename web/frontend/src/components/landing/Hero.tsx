"use client";

import { motion } from "framer-motion";
import {
  Atmosphere, LiveBackdrop, Button, Container, Contours, Heading, Num, ScoreDial, Section, Text, Waypoint,
  DUR, EASE,
} from "@/components/design-system";
import { AnalysisVisual } from "./AnalysisVisual";
import { Aimant, Bouffees, Inclinaison, MiseAuPoint, Mots, PremierPlan, Redressement, useCielOuvert } from "./effets";
import { DEMO_ASSETS } from "./demoData";
import { useMouvementReduit } from "@/components/design-system/useMouvementReduit";

/**
 * Two sentences, two buttons, and the product's actual output.
 *
 * Everything a visitor needs to decide is above the fold, and the thing they
 * are deciding about is shown rather than claimed: the panel below the copy is
 * a real analysis layout, not a screenshot mock or a wall of statistics.
 */
export function Hero() {
  const reduce = useMouvementReduit();
  // La jauge, la courbe et les raisons attendent l'ouverture du ciel : la
  // clé les remonte à ce moment-là, et leur dessin se joue devant le visiteur.
  const ouvert = useCielOuvert();
  const cle = ouvert ? "ouvert" : "couvert";
  const apple = DEMO_ASSETS[0];

  // En mouvement réduit, l'état final est posé explicitement : le premier
  // rendu (serveur) part masqué, et un simple {} le laissait masqué.
  const pose = { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } };
  const enter = (delay: number) =>
    reduce
      ? pose
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

      {/* Au tout premier plan, des nuages flous qui passent devant la page. */}
      <PremierPlan />
      <MiseAuPoint className="relative">
      <Container width="wide" className="relative">
        <div className="mx-auto max-w-[48rem] text-center">
          <motion.p
            {...enter(0)}
            className="text-[0.78rem] font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--cap-ocean)" }}
          >
            CaptenTDB
          </motion.p>

          <div className="mt-6">
            <Heading level="display" as="h1">
              {/* Chaque mot sort de la brume, l'un après l'autre. */}
              <Mots texte="Comprendre les marchés." delai={0.35} />
              <br />
              {/* ink-2, not ink-3: the second half of the promise is not
                  secondary information, it just arrives second. */}
              <Mots texte="Apprendre sans risquer." delai={0.75} style={{ color: "var(--cap-ink-2)" }} />
            </Heading>
          </div>

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
            <Aimant className="w-full sm:w-auto">
            <Bouffees>
            <Button href="/register" size="lg" className="w-full sm:w-auto">
              Commencer gratuitement
            </Button>
            </Bouffees>
            </Aimant>
            <Aimant className="w-full sm:w-auto">
            <Button href="#demo" variant="secondary" size="lg" className="w-full sm:w-auto">
              Découvrir la démo
            </Button>
            </Aimant>
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
            ? pose
            : {
                initial: { opacity: 0, y: 40 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: DUR.slow, delay: 0.5, ease: EASE },
              })}
          className="mx-auto mt-20 max-w-[60rem] sm:mt-24"
        >
          {/* La carte arrive couchée et se redresse au défilement, puis
              s'incline sous le curseur, avec un reflet de lumière. */}
          <Redressement>
          <Inclinaison force={6}>
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
                  <ScoreDial key={cle} score={apple.score} size={124} />
                </div>
              </div>
            </div>

            <div className="mt-6 h-[240px] w-full sm:h-[280px]">
              <AnalysisVisual
                key={cle}
                prix={apple.price}
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
                {apple.reasons.map((r, i) => (
                  <motion.li key={`${cle}-${r}`} className="flex gap-3"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={ouvert ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.6, delay: 1.2 + i * 0.12, ease: EASE }}>
                    <span
                      aria-hidden
                      className="mt-[0.55rem] h-px w-3 shrink-0"
                      style={{ backgroundColor: "var(--cap-ocean)" }}
                    />
                    <Text size="small" tone="ink" as="span">
                      {r}
                    </Text>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
          </Inclinaison>
          </Redressement>

          <p className="mt-3 text-center text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
            Exemple d'analyse — données d'illustration
          </p>
        </motion.div>
      </Container>
      </MiseAuPoint>
    </Section>
  );
}
