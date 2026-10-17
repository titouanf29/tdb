"use client";

import { motion } from "framer-motion";
import {
  Atmosphere, LiveBackdrop, Button, Container, Contours, Heading, Nimbo, Num, ScoreDial, Section, Text, Waypoint,
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
    <Section id="depart" size="xl" className="relative overflow-hidden pt-28 sm:pt-32 lg:min-h-[100svh] lg:pt-36">
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
        {/* DEUX COLONNES : LA PROMESSE, ET CE QU'ELLE PRODUIT.
            Le titre centré flottait seul dans un grand ciel, et le produit
            n'apparaissait qu'après avoir défilé. Ici, on lit la promesse à
            gauche et on voit à droite une vraie analyse — avec Nimbo, qui est
            l'âme du site et n'apparaissait nulle part sur cette page. */}
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:gap-10">
          <div className="text-center lg:text-left">
            <motion.p
              {...enter(0)}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.78rem] font-medium"
              style={{ color: "var(--cap-ocean)", backgroundColor: "color-mix(in srgb, var(--cap-surface) 70%, transparent)",
                boxShadow: "inset 0 0 0 1px var(--cap-line)", backdropFilter: "blur(6px)" }}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cap-up)" }} />
              <span className="sm:hidden">Simulateur éducatif · 100 % virtuel</span>
              <span className="hidden sm:inline">Simulateur de trading éducatif · argent 100 % virtuel</span>
            </motion.p>

            <div className="mt-6">
              <Heading level="display" as="h1" className="!text-[clamp(2.5rem,4.6vw,4.4rem)] !leading-[1.03]">
                {/* Chaque mot sort de la brume, l'un après l'autre. */}
                <Mots texte="Apprenez la bourse." delai={0.35} />
                <br />
                <Mots texte="Sans risquer un euro." delai={0.75} style={{ color: "var(--cap-ocean)" }} />
              </Heading>
            </div>

            <motion.div {...enter(0.2)} className="mx-auto mt-7 max-w-[34rem] lg:mx-0">
              <Text size="lead">
                Analysez de vrais marchés, prenez position avec 10 000 € virtuels, et laissez Nimbo
                vous expliquer chaque décision — y compris quand il vous conseille d&apos;attendre.
              </Text>
            </motion.div>

            <motion.div
              {...enter(0.3)}
              className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
            >
              <Aimant className="w-full sm:w-auto">
              <Bouffees>
              <Button href="/register" size="lg" className="w-full sm:w-auto">
                Commencer gratuitement
              </Button>
              </Bouffees>
              </Aimant>
              <Aimant className="w-full sm:w-auto">
              <Button href="#demo" variant="secondary" size="lg" className="w-full sm:w-auto">
                Voir une analyse
              </Button>
              </Aimant>
            </motion.div>

            <motion.ul {...enter(0.4)} className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 lg:justify-start">
              {["Gratuit", "Sans carte bancaire", "Expliqué en français"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
                  <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] text-white"
                    style={{ backgroundColor: "var(--cap-ocean)" }}>✓</span>
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

        {/* ── Le produit, avec Nimbo ─────────────────────────────────────── */}
        <motion.div
          {...(reduce
            ? pose
            : {
                initial: { opacity: 0, y: 40 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: DUR.slow, delay: 0.5, ease: EASE },
              })}
          className="relative mx-auto w-full max-w-[36rem] pt-14 lg:pt-10"
        >
          {/* Nimbo, assis sur le bord de la carte, et ce qu'il dit. */}
          <div className="pointer-events-none absolute -top-2 left-1/2 z-20 flex -translate-x-1/2 items-end gap-2 sm:left-auto sm:right-6 sm:translate-x-0 lg:-top-6">
            <Nimbo humeur="cap" taille={124} label="Nimbo" />
            <div className="mb-14 hidden max-w-[14rem] rounded-[16px] rounded-bl-[4px] px-3.5 py-2.5 text-[0.85rem] leading-snug sm:block"
              style={{ backgroundColor: "var(--cap-surface)", color: "var(--cap-ink)", boxShadow: "var(--cap-shadow-md, 0 8px 24px rgba(11,23,38,0.12)), inset 0 0 0 1px var(--cap-line)" }}>
              Je vous propose d&apos;acheter Apple — <strong>et je vous dis pourquoi.</strong>
            </div>
          </div>
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
            <div className="flex flex-wrap items-end justify-between gap-5 px-6 pt-6 sm:px-8 sm:pt-7">
              <div>
                <div className="flex items-center gap-2.5">
                  <Waypoint size={11} />
                  <span className="text-[1.25rem] font-semibold tracking-[-0.02em]"
                    style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
                    {apple.name}
                  </span>
                  <span className="text-[0.82rem]" style={{ color: "var(--cap-ink-3)" }}>{apple.ticker}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <Num className="text-[1.6rem] font-medium">{apple.price}</Num>
                  <Num tone="up" className="text-[0.95rem]">+{apple.change.toFixed(2)} %</Num>
                </div>
                <div className="mt-2 text-[0.95rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-up)" }}>
                  {apple.direction}
                </div>
              </div>
              <ScoreDial key={cle} score={apple.score} size={108} />
            </div>

            <div className="mt-5 h-[190px] w-full sm:h-[220px]">
              <AnalysisVisual
                key={cle}
                prix={apple.price}
                series={{ points: apple.series, support: apple.support, resistance: apple.resistance }}
                className="h-full w-full"
              />
            </div>

            <div className="border-t px-6 py-5 sm:px-8" style={{ borderColor: "var(--cap-line)" }}>
              <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>Pourquoi</div>
              <ul className="mt-3 grid gap-2">
                {apple.reasons.slice(0, 3).map((r, i) => (
                  <motion.li key={`${cle}-${r}`} className="flex gap-3"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={ouvert ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.6, delay: 1.2 + i * 0.12, ease: EASE }}>
                    <span aria-hidden className="mt-[0.55rem] h-px w-3 shrink-0" style={{ backgroundColor: "var(--cap-ocean)" }} />
                    <Text size="small" tone="ink" as="span">{r}</Text>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
          </Inclinaison>
          </Redressement>

          <p className="mt-3 text-center text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
            Exemple d&apos;analyse — données d&apos;illustration
          </p>
        </motion.div>
        </div>
      </Container>
      </MiseAuPoint>
    </Section>
  );
}
