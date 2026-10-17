"use client";

import { Container, Eyebrow, Heading, Section, Text } from "@/components/design-system";
import { Reveal } from "./effets";
import { MotsAuScroll } from "./animations";

/**
 * Section 7 — the product as a path, not a feature list.
 *
 * Presented as a numbered progression rather than a grid of cards with an icon
 * each: the claim is that these parts follow one another, and a grid would say
 * the opposite.
 */

const STAGES = [
  { title: "Formation", body: "Les bases, puis les indicateurs, puis la gestion du risque. Dans cet ordre." },
  { title: "Analyse", body: "Un actif, un verdict, et la raison du verdict, au niveau de détail que vous avez choisi." },
  { title: "Scanner", body: "Les opportunités qui correspondent à votre profil, et pourquoi elles y correspondent." },
  { title: "Paper trading", body: "La décision se teste. Le risque est dimensionné avant l'entrée." },
  { title: "Journal", body: "Chaque position relue : la décision, le résultat, et l'écart entre les deux." },
  { title: "Missions", body: "Des objectifs courts qui transforment la lecture en pratique." },
  { title: "Assistant", body: "Une question en français, une réponse qui s'appuie sur vos données." },
  { title: "Glossaire", body: "Chaque terme défini, accessible depuis l'endroit où il apparaît." },
];

export function LearnSection() {
  return (
    <Section id="apprendre" size="md" tone="raised">
      <Container width="wide">
        <div className="max-w-[34rem]">
          <Reveal><Eyebrow>Apprendre</Eyebrow></Reveal>
          <Heading level={1} className="mt-5">
            <MotsAuScroll texte="Un parcours, pas une boîte à outils." />
          </Heading>
          <Reveal delay={0.12}>
            <Text size="lead" className="mt-6">
              Chaque partie du produit prépare la suivante. On peut entrer par
              n'importe laquelle, mais elles se tiennent.
            </Text>
          </Reveal>
        </div>

        {/* UN SOMMAIRE, PAS UNE GRILLE D'ICÔNES. Huit cases « pastille
            colorée, icône, titre, deux lignes » : c'est la section
            fonctionnalités de n'importe quel modèle. Le propos est que ces
            parties se suivent, donc elles sont écrites comme la table des
            matières d'un livre, avec leur numéro de chapitre. */}
        <Reveal delay={0.16} className="mt-14">
          <ol className="cap-sommaire grid gap-x-16 lg:grid-cols-2">
            {STAGES.map((s, i) => (
              <li key={s.title}>
                <span className="cap-sommaire-num" aria-hidden>{i + 1}</span>
                <span className="cap-sommaire-titre">{s.title}</span>
                <span className="cap-sommaire-texte">{s.body}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </Container>
    </Section>
  );
}
