"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  Container, Eyebrow, Heading, Num, Progress, Section, SegmentedControl, Text, DUR, EASE,
} from "@/components/design-system";
import { Check } from "lucide-react";
import { Reveal, useEffetsActifs } from "./effets";
import { MotsAuScroll } from "./animations";
import { useMouvementReduit } from "@/components/design-system/useMouvementReduit";

/**
 * Section 6 — the same screen at two levels.
 *
 * Rather than two static mockups side by side, one panel morphs between them.
 * Seeing a screen gain detail says "this adapts to you" far more directly than
 * a comparison table, and it makes the point that the extra information was
 * always there, just folded away.
 *
 * It cycles once on its own to demonstrate, then hands control to the visitor.
 */

const QUESTIONS = [
  "Votre niveau",
  "Votre objectif",
  "Les marchés que vous suivez",
  "Votre horizon",
  "Le niveau de détail souhaité",
];

type Mode = "beginner" | "intermediate";

const CSS_QUESTIONS = `.cap-q-coche{transform:scale(.4);opacity:0;transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .3s}
.cap-q[data-ok="1"] .cap-q-coche{transform:none;opacity:1}
.cap-q-rond{transition:background-color .35s,box-shadow .35s}
.cap-q[data-ok="1"] .cap-q-rond{background-color:var(--cap-ocean);box-shadow:0 0 0 4px color-mix(in srgb, var(--cap-ocean) 16%, transparent)}
.cap-q-texte{transition:opacity .35s,transform .45s cubic-bezier(.16,1,.3,1)}
.cap-q[data-ok="0"] .cap-q-texte{opacity:.55}
.cap-q[data-ok="1"] .cap-q-texte{transform:translate3d(3px,0,0)}`;

export function PersonalisationSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useMouvementReduit();
  const actifs = useEffetsActifs();
  const [mode, setMode] = useState<Mode>("beginner");
  const [touched, setTouched] = useState(false);
  // Les cinq questions se cochent l'une après l'autre, comme si on y
  // répondait ; une fois la dernière cochée, l'écran s'ajuste.
  const [repondues, setRepondues] = useState(0);

  useEffect(() => {
    if (!actifs) { setRepondues(QUESTIONS.length); return; }
    if (!inView) return;
    let n = 0;
    const t = setInterval(() => {
      n += 1; setRepondues(n);
      if (n >= QUESTIONS.length) clearInterval(t);
    }, 380);
    return () => clearInterval(t);
  }, [inView, actifs]);

  // One demonstration pass, then it stops. A panel that keeps flipping by
  // itself becomes an animation the visitor has to wait out.
  useEffect(() => {
    if (!inView || touched || !actifs || repondues < QUESTIONS.length) return;
    const t = setTimeout(() => setMode("intermediate"), 700);
    return () => clearTimeout(t);
  }, [inView, touched, actifs, repondues]);

  const choose = (m: Mode) => { setTouched(true); setMode(m); };

  return (
    <Section id="personnalisation" size="md">
      <Container width="wide">
        <div ref={ref} className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20">
          <div>
            <Reveal><Eyebrow>Personnalisation</Eyebrow></Reveal>
            <Heading level={1} className="mt-5">
              <MotsAuScroll texte="Votre espace ne devrait pas ressembler à celui des autres." />
            </Heading>
            <Reveal delay={0.12}>
              <Text size="lead" className="mt-6 max-w-[30rem]">
                CaptenTDB pose cinq questions au départ, puis ajuste la quantité
                d'information affichée.
              </Text>
            </Reveal>

            <Reveal delay={0.18}>
              <ul className="mt-8 space-y-0">
                <style dangerouslySetInnerHTML={{ __html: CSS_QUESTIONS }} />
                {QUESTIONS.map((q, i) => (
                  <li
                    key={q}
                    className="cap-q flex items-center gap-3 border-b py-3 last:border-b-0"
                    data-ok={repondues > i ? "1" : "0"}
                    style={{ borderColor: "var(--cap-line)" }}
                  >
                    <span aria-hidden className="cap-q-rond relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ boxShadow: "inset 0 0 0 1px var(--cap-line-strong)" }}>
                      <Check className="cap-q-coche h-3 w-3" strokeWidth={3} style={{ color: "#fff" }} />
                    </span>
                    <Text size="small" tone="ink" as="span" className="cap-q-texte">{q}</Text>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div>
              <SegmentedControl
                options={[
                  { value: "beginner", label: "Débutant" },
                  { value: "intermediate", label: "Intermédiaire" },
                ]}
                value={mode}
                onChange={choose}
                aria-label="Niveau d'affichage"
              />

              <div
                className="mt-4 overflow-hidden"
                style={{
                  borderRadius: "var(--cap-r-xl)",
                  backgroundColor: "var(--cap-surface)",
                  boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow)",
                }}
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-baseline justify-between">
                    <span
                      className="text-[1.1rem] font-semibold tracking-[-0.02em]"
                      style={{ fontFamily: "var(--cap-font-display)" }}
                    >
                      Apple
                    </span>
                    <Num className="text-[1.1rem] font-medium">245,18 €</Num>
                  </div>

                  <div
                    className="mt-5 border-t pt-5"
                    style={{ borderColor: "var(--cap-line)" }}
                  >
                    <div className="flex items-baseline justify-between">
                      <Text size="small" as="span">Direction</Text>
                      <span className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-up)" }}>
                        Haussier
                      </span>
                    </div>
                  </div>

                  {/* The part that appears. Height animates, so the panel grows
                      instead of two panels swapping. */}
                  <AnimatePresence initial={false}>
                    {mode === "intermediate" && (
                      <motion.div
                        key="more"
                        initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: DUR.slow, ease: EASE }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          className="mt-5 space-y-5 border-t pt-5"
                          style={{ borderColor: "var(--cap-line)" }}
                        >
                          {[
                            { label: "Tendance", value: 86 },
                            { label: "Momentum", value: 74 },
                            { label: "Volume", value: 69 },
                          ].map((f, i) => (
                            <Progress key={f.label} label={f.label} value={f.value} delay={i * 0.1} />
                          ))}
                          <div className="flex items-baseline justify-between">
                            <Text size="small" as="span">Risque</Text>
                            <Text size="small" tone="ink" as="span" className="font-medium">Modéré</Text>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <Text size="caption" tone="faint" className="mt-3">
                {mode === "beginner"
                  ? "Débutant : l'essentiel, rien de plus."
                  : "Intermédiaire : les facteurs derrière la direction."}
              </Text>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
