"use client";

import {
  Atmosphere, Container, Eyebrow, Heading, Nimbo, Section, Text,
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
    <Section id="probleme" size="md" tone="raised" className="relative overflow-hidden">
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
          <div>
            <NuageDeDonnees />
            {/* La réponse au problème, juste sous le bruit : quelqu'un trie. */}
            <Reveal delay={0.2}>
              <div className="mt-10 flex items-center gap-4 rounded-[var(--cap-r-lg)] p-4 sm:p-5"
                style={{ backgroundColor: "color-mix(in srgb, var(--cap-surface) 80%, transparent)", boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-md, 0 8px 24px rgba(11,23,38,0.08))" }}>
                <Nimbo humeur="reflechit" taille={84} label="Nimbo" className="-my-2 shrink-0" />
                <Text size="small" tone="ink">
                  Je regarde ces quatre familles pour vous, sur chaque actif, et je vous dis lesquelles comptent
                  aujourd&apos;hui, en une phrase.
                </Text>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
