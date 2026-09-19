"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Atmosphere, LiveBackdrop, Container, Eyebrow, Heading, Num, Reveal, Section, Text, DUR, EASE,
} from "@/components/design-system";

/**
 * Section 5 — paper trading, presented as practice.
 *
 * The tone matters more than the visuals here: this is a page about money, so
 * it must teach rather than tempt. No performance figures, no "turn 10 000 €
 * into…", no urgency. A sequence of six steps, drawn as a descent.
 */

const STEPS = [
  { label: "10 000 € virtuels", note: "Le point de départ, identique pour tout le monde." },
  { label: "Choisir un actif", note: "Une action, une crypto, un indice, une matière première." },
  { label: "Construire un scénario", note: "Une direction, un objectif, un niveau d'invalidation." },
  { label: "Entrer en position", note: "La taille se déduit du risque accepté, pas de l'envie." },
  { label: "Gérer le risque", note: "Le stop et l'objectif sont décidés avant, pas pendant." },
  { label: "Analyser le résultat", note: "Ce qui a fonctionné, ce qui relevait de la chance." },
];

export function PaperTradingSection() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion();

  return (
    <Section id="paper-trading" tone="inverse" className="relative overflow-hidden">
      <Atmosphere variant="top" />
      <LiveBackdrop />
      <Container width="wide">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <Eyebrow>Le portefeuille virtuel</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <Heading level={1} className="mt-5">
                Apprenez avant de risquer votre argent.
              </Heading>
            </Reveal>
            <Reveal delay={0.12}>
              <Text size="lead" className="mt-6 max-w-[28rem]">
                Chaque position est fictive. L'erreur ne coûte rien — sauf la
                leçon qu'elle vous apprend.
              </Text>
            </Reveal>
            <Reveal delay={0.18}>
              <Text size="small" tone="faint" className="mt-8 max-w-[26rem]">
                CaptenTDB n'est pas un courtier et ne donne pas de conseil en
                investissement. Aucune somme réelle ne transite par la
                plateforme.
              </Text>
            </Reveal>
          </div>

          <ol ref={ref} className="relative">
            {/* The spine: one line the whole sequence hangs from. */}
            <motion.span
              aria-hidden
              className="absolute left-[7px] top-2 w-px origin-top"
              style={{ backgroundColor: "var(--cap-line-strong)", bottom: "2rem" }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.6, ease: EASE }}
            />

            {STEPS.map((s, i) => (
              <motion.li
                key={s.label}
                className="relative flex gap-6 pb-10 last:pb-0"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: DUR.base, delay: 0.25 + i * 0.16, ease: EASE }}
              >
                <span
                  aria-hidden
                  className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: "var(--cap-bg)",
                    boxShadow: `inset 0 0 0 1px ${i === 0 ? "var(--cap-amber)" : "var(--cap-line-strong)"}`,
                  }}
                >
                  <span
                    className="absolute inset-[4px] rounded-full"
                    style={{ backgroundColor: i === 0 ? "var(--cap-amber)" : "var(--cap-ink-4)" }}
                  />
                </span>

                <div className="min-w-0">
                  <div
                    className={i === 0 ? "cap-num text-[1.15rem] font-medium" : "text-[1.05rem] font-semibold"}
                    style={{
                      fontFamily: i === 0 ? undefined : "var(--cap-font-display)",
                      color: "var(--cap-ink)",
                    }}
                  >
                    {s.label}
                  </div>
                  <Text size="small" className="mt-1.5">{s.note}</Text>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
