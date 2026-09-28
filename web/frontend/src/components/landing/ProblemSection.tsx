"use client";

import {
  Atmosphere, Container, Eyebrow, Heading, Section, Text,
} from "@/components/design-system";
import { Reveal } from "./effets";
import { MotsAuScroll, NuageDeDonnees } from "./animations";

/**
 * Section 2 — the problem, shown rather than argued.
 *
 * Scattered market readings (RSI, rates, volume, the Fed…) join their family
 * as the reader scrolls: nobody needs to be told that markets are noisy, they
 * need to see noise becoming structure — and here they make it happen.
 */



export function ProblemSection() {
  return (
    <Section id="probleme" tone="raised" className="relative overflow-hidden">
      <Atmosphere variant="side" />
      <Container width="wide">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20">
          <div>
            <Reveal>
              <Eyebrow>Le problème</Eyebrow>
            </Reveal>
            <Heading level={1} className="mt-5">
              <MotsAuScroll texte="Les marchés sont remplis de données." />
            </Heading>
            <Reveal delay={0.12}>
              <Text size="lead" className="mt-6 max-w-[30rem]">
                Le problème n'est pas d'en trouver. Le problème est de savoir
                lesquelles regarder.
              </Text>
            </Reveal>
          </div>

          {/* Des lectures éparpillées qui rejoignent leur famille au fil du
              défilement : le bruit devient une grille de lecture. */}
          <NuageDeDonnees />
        </div>
      </Container>
    </Section>
  );
}
