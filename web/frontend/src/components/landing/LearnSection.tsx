"use client";

import {
  Container, Eyebrow, Heading, Rule, Section, Text,
} from "@/components/design-system";
import { Reveal, RevealGroup, RevealItem } from "./effets";
import {
  BookOpen, BookText, LineChart, MessageCircle, NotebookPen, Radar, Target, Wallet,
} from "lucide-react";
import { MotsAuScroll } from "./animations";

/**
 * Section 7 — the product as a path, not a feature list.
 *
 * Presented as a numbered progression rather than a grid of cards with an icon
 * each: the claim is that these parts follow one another, and a grid would say
 * the opposite.
 */

// Une icône par étape : on reconnaît d'un coup d'œil l'outil qu'on retrouvera
// dans le site.
const ICONES = [BookOpen, LineChart, Radar, Wallet, NotebookPen, Target, MessageCircle, BookText];

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

        {/* Au survol, l'étape se soulève et son icône s'anime : on sent
            qu'elle mène quelque part. */}
        <style dangerouslySetInnerHTML={{ __html: `.cap-etape-apprendre{transition:transform .45s cubic-bezier(.16,1,.3,1)}
.cap-etape-apprendre:hover{transform:translate3d(0,-4px,0)}
.cap-icone-apprendre{transition:transform .45s cubic-bezier(.16,1,.3,1),background-color .3s,color .3s}
.cap-etape-apprendre:hover .cap-icone-apprendre{transform:rotate(-8deg) scale(1.12);background-color:var(--cap-ocean)!important;color:#fff!important}
@media (prefers-reduced-motion: reduce){.cap-etape-apprendre,.cap-icone-apprendre{transition:none}.cap-etape-apprendre:hover{transform:none}}` }} />
        <Reveal delay={0.16} className="mt-14">
          <Rule />
        </Reveal>

        <RevealGroup gap={0.07} className="grid sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, i) => (
            <RevealItem
              key={s.title}
              // The vertical rule separates columns, so the one at the right
              // edge of each row has nothing to separate and reads as an
              // unclosed box. Dropped per breakpoint, since the column count
              // changes.
              className={
                "[&>div]:sm:border-r " +
                "sm:[&:nth-child(2n)>div]:border-r-0 " +
                "lg:[&:nth-child(2n)>div]:border-r lg:[&:nth-child(4n)>div]:border-r-0"
              }
            >
              <div
                className="cap-etape-apprendre group h-full border-b py-7 pr-8 transition-transform duration-300 ease-out hover:-translate-y-1.5"
                style={{ borderColor: "var(--cap-line)" }}
              >
                <div className="flex items-center gap-3">
                  {(() => { const I = ICONES[i]; return (
                    <span className="cap-icone-apprendre inline-flex h-9 w-9 items-center justify-center rounded-[11px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                      style={{ backgroundColor: "color-mix(in srgb, var(--cap-ocean) 10%, transparent)", color: "var(--cap-ocean)" }}>
                      <I className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                  ); })()}
                  <span className="cap-num text-[0.78rem]" style={{ color: "var(--cap-ocean)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <Heading level={3} className="mt-3">{s.title}</Heading>
                <Text size="small" className="mt-2">{s.body}</Text>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </Section>
  );
}
