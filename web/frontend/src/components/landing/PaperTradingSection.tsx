"use client";

import {
  Atmosphere, LiveBackdrop, Container, Eyebrow, Heading, Section, Text,
} from "@/components/design-system";
import { Etoiles } from "./animationsPlus";
import { Reveal } from "./effets";
import { MotsAuScroll, useProgressionCSS } from "./animations";

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

const CSS_FIL = `.cap-pt{--p:0}
.cap-pt-fil{transform:scaleY(var(--p))}
.cap-pt-etape{--q:clamp(0,(var(--p) - var(--s)) * 7 + 1,1)}
.cap-pt-texte{opacity:calc(.6 + var(--q) * .4);transform:translate3d(calc((1 - var(--q)) * 14px),0,0)}
.cap-pt-point{opacity:var(--q);transform:scale(calc(.3 + var(--q) * .7))}
.cap-pt-onde{opacity:var(--q)}
@keyframes cap-pt-onde{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.6);opacity:0}}
.cap-pt-onde > span{animation:cap-pt-onde 2.4s cubic-bezier(.2,.6,.3,1) infinite}
.anim-off .cap-pt-onde > span{animation:none;opacity:0}
@media (prefers-reduced-motion: reduce){.cap-pt-onde > span{animation:none;opacity:0}}`;

export function PaperTradingSection() {
  // Le fil doré avance avec le défilement : on suit le parcours du trade,
  // étape par étape, au rythme de la lecture. Une seule variable CSS (--p)
  // pilote le fil, les points et l'éclairage de chaque étape.
  const ref = useProgressionCSS<HTMLOListElement>(["start 75%", "end 55%"]);

  return (
    <Section id="paper-trading" size="md" tone="inverse" className="relative overflow-hidden">
      <Etoiles />
      <Atmosphere variant="top" />
      <LiveBackdrop />
      <Container width="wide" className="relative">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <Eyebrow>Le portefeuille virtuel</Eyebrow>
            </Reveal>
            <Heading level={1} className="mt-5">
              <MotsAuScroll texte="Apprenez avant de risquer votre argent." />
            </Heading>
            <Reveal delay={0.12}>
              <Text size="lead" className="mt-6 max-w-[28rem]">
                Chaque position est fictive. L'erreur ne coûte rien, sauf la
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

          <ol ref={ref} className="cap-pt relative">
            <style dangerouslySetInnerHTML={{ __html: CSS_FIL }} />
            {/* The spine: one line the whole sequence hangs from. */}
            <span
              aria-hidden
              className="absolute left-[7px] top-2 w-px"
              style={{ backgroundColor: "var(--cap-line-strong)", bottom: "2rem" }}
            />
            <span
              aria-hidden
              className="cap-pt-fil absolute left-[7px] top-2 w-[2px] -translate-x-[0.5px] origin-top"
              style={{ backgroundColor: "var(--cap-amber)", bottom: "2rem", boxShadow: "0 0 12px var(--cap-amber)" }}
            />

            {STEPS.map((s, i) => (
              <li
                key={s.label}
                className="cap-pt-etape relative flex gap-6 pb-10 last:pb-0"
                style={{ ["--s" as string]: (i / (STEPS.length - 1) * 0.96).toFixed(3) }}
              >
                <span
                  aria-hidden
                  className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--cap-bg)", boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}
                >
                  <span className="absolute inset-[4px] rounded-full" style={{ backgroundColor: "var(--cap-ink-4)" }} />
                  <span className="cap-pt-onde absolute inset-0">
                    <span className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 1.5px var(--cap-amber)" }} />
                  </span>
                  <span className="cap-pt-point absolute inset-[3px] rounded-full"
                    style={{ backgroundColor: "var(--cap-amber)", boxShadow: "0 0 10px var(--cap-amber)" }} />
                </span>

                <div className="cap-pt-texte min-w-0">
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
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
