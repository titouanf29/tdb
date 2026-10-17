"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atmosphere, Container, CountUp, Eyebrow, Heading, Num, Progress, Section, SegmentedControl, Text, DUR, EASE,
} from "@/components/design-system";
import { Inclinaison, Reveal } from "./effets";
import { MotsAuScroll } from "./animations";
import { AnalysisVisual } from "./AnalysisVisual";
import { DEMO_ASSETS, LEVELS, type LevelId } from "./demoData";
import { useMouvementReduit } from "@/components/design-system/useMouvementReduit";

/**
 * Section 4 — the demo. The most important section of the page.
 *
 * It exists to prove one claim: depth is available but never imposed. The
 * visitor picks how much they want to see, and the same asset answers at three
 * different resolutions. Someone who wants a direction gets a sentence;
 * someone who wants the engine's internals gets them, one click away.
 */
export function DemoSection() {
  const [assetId, setAssetId] = useState(DEMO_ASSETS[0].id);
  const [level, setLevel] = useState<LevelId>("discover");
  const reduce = useMouvementReduit();

  const asset = DEMO_ASSETS.find((a) => a.id === assetId) ?? DEMO_ASSETS[0];
  const dirTone =
    asset.direction === "Haussier" ? "var(--cap-up)"
    : asset.direction === "Baissier" ? "var(--cap-down)"
    : "var(--cap-ink-2)";

  const fade = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -6 },
    transition: { duration: DUR.base, ease: EASE },
  };
  const defile = (delay: number) => reduce ? {} : {
    initial: { y: "100%", opacity: 0 },
    animate: { y: "0%", opacity: 1 },
    transition: { duration: 0.5, delay, ease: EASE },
  };
  // Les lignes du panneau arrivent l'une après l'autre.
  const ligne = (i: number) => reduce ? {} : {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.45, delay: 0.08 + i * 0.07, ease: EASE },
  };

  return (
    <Section id="demo" size="md" tone="raised" className="relative overflow-hidden">
      <Atmosphere variant="side" />
      <Container width="wide">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[36rem]">
          <Reveal>
            <Eyebrow>La démo</Eyebrow>
          </Reveal>
          <Heading level={1} className="mt-5">
            <MotsAuScroll texte="Choisissez ce que vous voulez voir." />
          </Heading>
          <Reveal delay={0.12}>
            <Text size="lead" className="mt-6">
              Le même actif, à trois niveaux de détail. C'est vous qui décidez
              jusqu'où aller.
            </Text>
          </Reveal>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <Reveal delay={0.16} className="lg:pb-1">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {DEMO_ASSETS.map((a) => {
              const active = a.id === assetId;
              return (
                <button
                  key={a.id}
                  onClick={() => setAssetId(a.id)}
                  aria-pressed={active}
                  className="relative rounded-[10px] px-4 py-2.5 text-[0.9rem] font-medium transition-colors duration-300"
                  style={{
                    color: active ? "#F2F5F7" : "var(--cap-ink-2)",
                    boxShadow: "inset 0 0 0 1px var(--cap-line)",
                  }}
                >
                  {/* La pastille glisse d'un actif à l'autre. */}
                  {active && (
                    <motion.span
                      layoutId="demo-actif"
                      className="absolute inset-0 rounded-[10px]"
                      style={{ backgroundColor: "var(--cap-navy)" }}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{a.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 lg:flex lg:justify-end">
            <SegmentedControl
              options={LEVELS}
              value={level}
              onChange={setLevel}
              aria-label="Niveau de détail"
            />
          </div>
        </Reveal>
        </div>

        {/* ── Panel ─────────────────────────────────────────────────────── */}
        <Reveal delay={0.2} className="mt-10">
          {/* La carte de démo s'incline doucement sous le curseur. */}
          <Inclinaison force={4}>
          <div
            className="overflow-hidden"
            style={{
              borderRadius: "var(--cap-r-xl)",
              backgroundColor: "var(--cap-bg)",
              boxShadow: "inset 0 0 0 1px var(--cap-line)",
            }}
          >
            <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              {/* Left: price and chart — constant across levels. */}
              <div className="p-6 sm:p-8">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    {/* Nom, cours et variation défilent d'un actif à l'autre,
                        comme sur un tableau d'affichage. */}
                    <div className="overflow-hidden">
                      <motion.div key={`n-${asset.id}`} {...defile(0)}
                        className="text-[1.2rem] font-semibold tracking-[-0.02em]"
                        style={{ fontFamily: "var(--cap-font-display)" }}
                      >
                        {asset.name}
                      </motion.div>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-3 overflow-hidden">
                      <motion.span key={`p-${asset.id}`} {...defile(0.05)}>
                        <Num className="text-[1.4rem] font-medium">{asset.price}</Num>
                      </motion.span>
                      <motion.span key={`c-${asset.id}`} {...defile(0.1)}>
                        <Num tone={asset.change >= 0 ? "up" : "down"} className="text-[0.9rem]">
                          {asset.change >= 0 ? "+" : ""}
                          {asset.change.toFixed(2)} %
                        </Num>
                      </motion.span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                      Direction
                    </div>
                    <div className="mt-1 overflow-hidden">
                      <motion.div key={`d-${asset.id}`} {...defile(0.15)}
                        className="text-[1rem] font-semibold"
                        style={{ fontFamily: "var(--cap-font-display)", color: dirTone }}
                      >
                        {asset.direction}
                      </motion.div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 h-[200px] w-full">
                  <AnalysisVisual
                    key={asset.id}
                    prix={asset.price}
                    series={{ points: asset.series, support: asset.support, resistance: asset.resistance }}
                    className="h-full w-full"
                    showLevels={level !== "discover"}
                  />
                </div>
              </div>

              {/* Right: the layer that changes. */}
              <div
                className="border-t p-6 sm:p-8 lg:border-l lg:border-t-0"
                style={{ borderColor: "var(--cap-line)" }}
              >
                <AnimatePresence mode="wait">
                  {level === "discover" && (
                    <motion.div key={`d-${asset.id}`} {...fade}>
                      <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                        Pourquoi
                      </div>
                      <ul className="mt-4 space-y-3">
                        {asset.reasons.map((r, i) => (
                          <motion.li key={r} className="flex gap-3" {...ligne(i)}>
                            <span
                              aria-hidden
                              className="mt-[0.55rem] h-px w-3 shrink-0"
                              style={{ backgroundColor: "var(--cap-ocean)" }}
                            />
                            <Text size="small" tone="ink" as="span">{r}</Text>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {level === "intermediate" && (
                    <motion.div key={`i-${asset.id}`} {...fade}>
                      <div className="flex items-baseline justify-between">
                        <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                          Score
                        </div>
                        <div className="flex items-baseline gap-1">
                          <CountUp to={asset.score} duration={1.2} className="text-[1.6rem] font-medium" />
                          <span className="text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>/ 100</span>
                        </div>
                      </div>
                      <div className="mt-6 space-y-5">
                        {asset.factors.map((f, i) => (
                          <Progress key={f.label} label={f.label} value={f.value} delay={i * 0.08} />
                        ))}
                      </div>
                      <div
                        className="mt-6 flex items-baseline justify-between border-t pt-4"
                        style={{ borderColor: "var(--cap-line)" }}
                      >
                        <Text size="small" as="span">Risque</Text>
                        <Text size="small" tone="ink" as="span" className="font-medium">{asset.risk}</Text>
                      </div>
                    </motion.div>
                  )}

                  {level === "advanced" && (
                    <motion.div key={`a-${asset.id}`} {...fade}>
                      <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                        Données du moteur
                      </div>
                      <dl className="mt-4">
                        {asset.advanced.map((row, i) => (
                          <motion.div
                            key={row.label}
                            {...ligne(i)}
                            className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0"
                            style={{ borderColor: "var(--cap-line)" }}
                          >
                            <dt className="text-[0.85rem]" style={{ color: "var(--cap-ink-2)" }}>
                              {row.label}
                            </dt>
                            <dd><Num className="text-[0.85rem]">{row.value}</Num></dd>
                          </motion.div>
                        ))}
                      </dl>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          </Inclinaison>

          <p className="mt-3 text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
            Données d'illustration — l'analyse réelle utilise les cours de marché.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
