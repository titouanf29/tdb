"use client";

import {
  Atmosphere, Button, Container, Course, Heading, Reveal, Section, Text,
} from "@/components/design-system";

/**
 * Section 8 — the close.
 *
 * Four words and one button, surrounded by space. Everything the visitor
 * needed to decide has already been said; repeating it here would only dilute
 * the sentence that matters.
 */
export function ClosingSection() {
  return (
    <Section id="arrivee" size="xl" className="relative overflow-hidden">
      <Atmosphere variant="base" />
      <Container width="text" className="relative text-center">
        <Reveal>
          <Heading level="display" as="p">
            Comprendre avant d'agir.
          </Heading>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-[22rem]">
          <Course height={90} delay={0.3} />
        </Reveal>

        <Reveal delay={0.16} className="mt-10">
          <Button href="/register" size="lg">
            Créer mon espace
          </Button>
        </Reveal>

        <Reveal delay={0.22}>
          <Text size="caption" tone="faint" className="mt-6">
            Gratuit · Argent virtuel uniquement · Aucun conseil en investissement
          </Text>
        </Reveal>
      </Container>
    </Section>
  );
}
