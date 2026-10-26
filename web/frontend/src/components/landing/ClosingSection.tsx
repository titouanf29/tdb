"use client";

import {
  Atmosphere, CaptenMark, CloudBank, LiveBackdrop, Button, Container, Heading, Section, Text,
} from "@/components/design-system";
import { Aimant, Bouffees, Reveal } from "./effets";
import { MotsAuScroll, useProgressionCSS } from "./animations";

// La mer de nuages monte à mesure qu'on arrive, et une lueur s'ouvre derrière
// la phrase : on sort au-dessus de la couche, dans la lumière.
const CSS_FIN = `.cap-fin{--p:0}
.cap-fin-banc{transform:translate3d(0,calc((1 - var(--p)) * 38%),0)}
.cap-fin-lueur{opacity:calc(var(--p) * .9);transform:translate3d(-50%,-50%,0) scale(calc(.55 + var(--p) * .45))}`;

/**
 * Section 8 — the close.
 *
 * Four words and one button, surrounded by space. Everything the visitor
 * needed to decide has already been said; repeating it here would only dilute
 * the sentence that matters.
 */
export function ClosingSection() {
  const ref = useProgressionCSS<HTMLDivElement>(["start end", "end end"]);
  return (
    <Section id="arrivee" size="xl" className="relative overflow-hidden">
      <Atmosphere variant="base" />
      <LiveBackdrop clouds={false} opacity={0.5} />
      {/* Closes the arc: the page opened under the weather, it ends above it. */}
      <div ref={ref} aria-hidden className="cap-fin pointer-events-none absolute inset-0">
        <style dangerouslySetInnerHTML={{ __html: CSS_FIN }} />
        <div className="cap-fin-lueur absolute left-1/2 top-[38%] h-[70vmin] w-[110vmin] rounded-full"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--cap-cloud-light) 95%, transparent), color-mix(in srgb, var(--cap-cloud-light) 45%, transparent) 45%, transparent)", willChange: "transform, opacity" }} />
        <div className="cap-fin-banc absolute inset-0" style={{ willChange: "transform" }}>
          <CloudBank />
        </div>
      </div>
      <Container width="text" className="relative text-center">
        {/* Le logo, sobrement : la fin de page signe, elle ne joue pas. */}
        <Reveal className="mx-auto w-fit">
          <CaptenMark size={64} className="text-[color:var(--cap-ink)]" />
        </Reveal>
        <Heading level="display" as="p" className="mt-6">
          <MotsAuScroll texte="Comprendre avant d'agir." />
        </Heading>

        <Reveal delay={0.1}>
          <Text size="lead" className="mx-auto mt-6 max-w-[30rem]">
            10 000 € virtuels, de vrais marchés, et Nimbo pour vous expliquer chaque décision.
            Une minute pour créer votre espace.
          </Text>
        </Reveal>

        <Reveal delay={0.16} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Aimant>
            <Bouffees>
              <Button href="/register" size="lg">
                Créer mon espace gratuit
              </Button>
            </Bouffees>
          </Aimant>
          <Button href="/login" variant="secondary" size="lg">J&apos;ai déjà un compte</Button>
        </Reveal>

        <Reveal delay={0.22}>
          <Text size="caption" tone="faint" className="mt-6">
            Gratuit. L&apos;argent est virtuel, et rien ici n&apos;est un conseil en investissement.
          </Text>
        </Reveal>
      </Container>
    </Section>
  );
}
