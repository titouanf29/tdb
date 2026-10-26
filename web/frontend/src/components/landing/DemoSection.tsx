"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atmosphere, Container, CountUp, Eyebrow, Heading, Num, Progress, Section, SegmentedControl, Text, DUR, EASE,
} from "@/components/design-system";
import { Inclinaison, Reveal } from "./effets";
import { MotsAuScroll } from "./animations";
import { AnalysisVisual } from "./AnalysisVisual";
import { DEMO_ASSETS, LEVELS, type DemoAsset, type LevelId } from "./demoData";
import { useMouvementReduit } from "@/components/design-system/useMouvementReduit";

/**
 * Section 4 — the demo. The most important section of the page.
 *
 * It exists to prove one claim: depth is available but never imposed. The
 * visitor picks how much they want to see, and the same asset answers at three
 * different resolutions. Someone who wants a direction gets a sentence;
 * someone who wants the engine's internals gets them, one click away.
 *
 * EN DIRECT. Chaque actif est la vraie analyse du moteur, sur les cours du
 * jour (backend : routes/demo.py, gardée dix minutes). Elle est demandée un
 * peu avant que la section n'arrive à l'écran. Tant qu'elle n'est pas là, ou
 * si le serveur ne répond pas, la page montre l'exemple fixe, et le dit.
 */

/** « 2026-10-26T20:13+01:00 » → « 20 h 13 ». */
function heure(iso: string): string {
  const [h, m] = iso.slice(11, 16).split(":");
  return `${Number(h)} h ${m}`;
}
export function DemoSection() {
  const [assetId, setAssetId] = useState(DEMO_ASSETS[0].id);
  const [level, setLevel] = useState<LevelId>("discover");
  const reduce = useMouvementReduit();
  const section = useRef<HTMLDivElement>(null);
  const [proche, setProche] = useState(false);
  const [vivants, setVivants] = useState<Record<string, DemoAsset>>({});
  const demandes = useRef(new Set<string>());

  // La section approche de l'écran : la démo peut aller chercher ses cours.
  useEffect(() => {
    const el = section.current;
    if (!el || typeof IntersectionObserver === "undefined") { setProche(true); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setProche(true); obs.disconnect(); }
    }, { rootMargin: "600px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Une seule demande par actif et par visite ; un échec laisse l'exemple.
  useEffect(() => {
    if (!proche || demandes.current.has(assetId)) return;
    demandes.current.add(assetId);
    fetch(`/api/demo/${assetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((a: DemoAsset | null) => {
        if (a && Array.isArray(a.series) && a.series.length > 1) setVivants((v) => ({ ...v, [a.id]: a }));
      })
      .catch(() => {});
  }, [proche, assetId]);

  const exemple = DEMO_ASSETS.find((a) => a.id === assetId) ?? DEMO_ASSETS[0];
  const asset = vivants[assetId] ?? exemple;
  const direct = !!asset.analyse_a;
  // Change quand l'exemple cède la place aux vrais cours : les chiffres
  // défilent et la courbe se retrace au lieu de sauter.
  const cle = `${asset.id}-${direct ? "v" : "e"}`;
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
        <div ref={section} />
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
          <div className="flex flex-wrap items-center gap-x-3 lg:justify-end">
            {DEMO_ASSETS.map((a) => {
              const active = a.id === assetId;
              return (
                <button
                  key={a.id}
                  onClick={() => setAssetId(a.id)}
                  aria-pressed={active}
                  className="relative min-h-[44px] px-2.5 py-2.5 text-[0.95rem] transition-colors duration-300 hover:text-[color:var(--cap-ink)]"
                  style={{
                    color: active ? "var(--cap-ink)" : "var(--cap-ink-3)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {/* La pastille glisse d'un actif à l'autre. */}
                  {active && (
                    <motion.span
                      layoutId="demo-actif"
                      className="absolute inset-x-2 bottom-1 h-[2px] rounded-full"
                      style={{ backgroundColor: "#e5a83a" }}
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
                      <motion.div key={`n-${cle}`} {...defile(0)}
                        className="text-[1.2rem] font-semibold tracking-[-0.02em]"
                        style={{ fontFamily: "var(--cap-font-display)" }}
                      >
                        {asset.name}
                      </motion.div>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-3 overflow-hidden">
                      <motion.span key={`p-${cle}`} {...defile(0.05)}>
                        <Num className="text-[1.4rem] font-medium">{asset.price}</Num>
                      </motion.span>
                      <motion.span key={`c-${cle}`} {...defile(0.1)}>
                        <Num tone={asset.change >= 0 ? "up" : "down"} className="text-[0.9rem]">
                          {asset.change >= 0 ? "+" : ""}
                          {asset.change.toFixed(2).replace(".", ",")} %
                        </Num>
                      </motion.span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.75rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
                      Direction
                    </div>
                    <div className="mt-1 overflow-hidden">
                      <motion.div key={`d-${cle}`} {...defile(0.15)}
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
                    key={cle}
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
                    <motion.div key={`d-${cle}`} {...fade}>
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
                    <motion.div key={`i-${cle}`} {...fade}>
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
                    <motion.div key={`a-${cle}`} {...fade}>
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="flex items-baseline gap-2 text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }} aria-live="polite">
              {direct ? (
                <>
                  <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ backgroundColor: "var(--cap-ambre)" }} />
                  <span>
                    Analyse réelle du moteur, cours de {heure(asset.analyse_a!)}, heure de Paris.
                    Une lecture du marché, pas un conseil en investissement.
                  </span>
                </>
              ) : (
                <span>Exemple d&apos;illustration, le temps de charger les cours du jour.</span>
              )}
            </p>
            <Link href="/register" className="shrink-0 text-[0.92rem] font-medium underline decoration-[color:var(--cap-ambre)] underline-offset-[5px]"
              style={{ color: "var(--cap-ink)" }}>
              Analyser l&apos;actif de votre choix, gratuitement
            </Link>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
