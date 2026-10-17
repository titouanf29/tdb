"use client";

import {
  Container, Eyebrow, Heading, Section,
} from "@/components/design-system";
import { Reveal } from "./effets";
import { MotsAuScroll, ParcoursDefilant } from "./animations";

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
    <Section id="fonctionnement" size="md">
      <Container width="wide">
        <div className="max-w-[34rem]">
          <Reveal>
            <Eyebrow>Comment ça fonctionne</Eyebrow>
          </Reveal>
          <Heading level={1} className="mt-5">
            <MotsAuScroll texte="Trois gestes, toujours dans le même ordre." />
          </Heading>
        </div>

        {/* La ligne se trace au défilement, un point la parcourt, et chaque
            étape s'allume quand il l'atteint. */}
        <ParcoursDefilant etapes={STEPS} />
      </Container>
    </Section>
  );
}
