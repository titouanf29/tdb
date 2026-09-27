"use client";

import {
  Container, Course, Eyebrow, Heading, Section, Text,
} from "@/components/design-system";
import { Reveal, RevealGroup, RevealItem } from "./effets";

/**
 * Section 3 — three steps, in order.
 *
 * Numbered, connected by a hairline, and phrased as verbs. The course motif
 * draws itself underneath: origin, passage, destination.
 */

const STEPS = [
  {
    n: "01",
    title: "Observer",
    body: "Les marchés sont analysés en continu : prix, tendance, volumes, volatilité, et le contexte de l'indice auquel l'actif appartient.",
  },
  {
    n: "02",
    title: "Comprendre",
    body: "Les facteurs qui comptent sont isolés et expliqués en français. Pas un score opaque : la raison derrière le score.",
  },
  {
    n: "03",
    title: "S'entraîner",
    body: "La décision se teste avec de l'argent virtuel. Le résultat est mesuré, puis relu — c'est là que l'apprentissage a lieu.",
  },
];

export function HowItWorks() {
  return (
    <Section id="fonctionnement">
      <Container width="wide">
        <div className="max-w-[34rem]">
          <Reveal>
            <Eyebrow>Comment ça fonctionne</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <Heading level={1} className="mt-5">
              Trois gestes, toujours dans le même ordre.
            </Heading>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mx-auto mt-16 max-w-[40rem]">
          <Course height={110} delay={0.2} />
        </Reveal>

        <RevealGroup gap={0.14} className="mt-8 grid gap-px sm:grid-cols-3">
          {STEPS.map((s) => (
            <RevealItem key={s.n}>
              <div className="h-full px-0 py-8 sm:px-7">
                <span
                  className="cap-num text-[0.8rem]"
                  style={{ color: "var(--cap-ocean)" }}
                >
                  {s.n}
                </span>
                <Heading level={2} className="mt-4">
                  {s.title}
                </Heading>
                <Text size="body" className="mt-3">
                  {s.body}
                </Text>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </Section>
  );
}
