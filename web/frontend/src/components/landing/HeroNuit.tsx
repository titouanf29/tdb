"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpenCheck, Landmark, ShieldCheck } from "lucide-react";
import { marketAPI } from "@/lib/api";
import { Container, EASE } from "@/components/design-system";
import { NUIT } from "./nuit";

/**
 * Le haut de page. Il a trois secondes pour dire ce qu'est le site et pourquoi
 * il n'est pas comme les autres.
 *
 * CE QUI EST MONTRÉ EST VRAI. Le graphique est le cours réel d'Apple sur trois
 * mois, lu au chargement ; le prix est le dernier cours. Les cartes qui
 * flottent autour sont des aperçus d'écrans du site, avec des faits exacts :
 * l'effet mesuré de la Fed sur 46 décisions, un ordre turbo tel que le site le passe.
 * Une page qui vend un moteur honnête ne peut pas commencer par un faux
 * graphique.
 */

const SYMBOLE = "AAPL";

type Point = { t: number; c: number };

function chemin(points: Point[], w: number, h: number, marge = 8) {
  if (points.length < 2) return { ligne: "", aire: "", min: 0, max: 0, y: (_: number) => 0 };
  const cs = points.map((p) => p.c);
  const min = Math.min(...cs), max = Math.max(...cs);
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => marge + (1 - (v - min) / (max - min || 1)) * (h - 2 * marge);
  const ligne = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(" ");
  return { ligne, aire: `${ligne} L${w},${h} L0,${h} Z`, min, max, y };
}

const euro = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HeroNuit() {
  const reduit = useReducedMotion();
  const [points, setPoints] = useState<Point[]>([]);
  const [prix, setPrix] = useState<{ price: number; change: number } | null>(null);

  useEffect(() => {
    let vivant = true;
    marketAPI.getChart(SYMBOLE, "3mo", "1d")
      .then((d) => {
        if (!vivant) return;
        const pts = (d.data ?? []).map((b: { timestamp: number; close: number }) => ({ t: b.timestamp, c: b.close }))
          .filter((p) => Number.isFinite(p.c));
        setPoints(pts);
      })
      .catch(() => {});
    marketAPI.getPrices([SYMBOLE])
      .then((d) => { if (vivant && d.prices?.[SYMBOLE]) setPrix(d.prices[SYMBOLE]); })
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  const W = 560, H = 190;
  const g = useMemo(() => chemin(points, W, H), [points]);
  const dernier = prix?.price ?? points[points.length - 1]?.c;
  const variation3m = points.length > 1 ? (points[points.length - 1].c / points[0].c - 1) * 100 : null;

  const apparait = (delai: number) =>
    reduit ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: delai, ease: EASE } };
  const flotte = (amplitude: number, duree: number) =>
    reduit ? {} : { animate: { y: [0, -amplitude, 0] }, transition: { duration: duree, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <section
      id="depart"
      className="relative overflow-hidden pb-20 pt-28 sm:pb-28 sm:pt-36"
      style={{ background: `radial-gradient(1200px 600px at 75% 10%, #12304D 0%, ${NUIT.fond2} 45%, ${NUIT.fond} 100%)`, color: NUIT.texte }}
    >
      {/* La grille : un repère de graphique, pas une décoration de plus. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${NUIT.ligne} 1px, transparent 1px), linear-gradient(90deg, ${NUIT.ligne} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 60% 30%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 60% 30%, black 20%, transparent 75%)",
          opacity: 0.6,
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full"
        style={{ background: `radial-gradient(circle, ${NUIT.orDoux} 0%, transparent 65%)` }} />

      <Container width="wide" className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
          {/* ── Le texte ───────────────────────────────────────────────── */}
          <div>
            <motion.div {...apparait(0)}>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8rem] font-medium"
                style={{ backgroundColor: NUIT.orDoux, color: NUIT.or, boxShadow: `inset 0 0 0 1px rgba(232,168,32,0.35)` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: NUIT.or }} />
                Simulateur de trading éducatif · gratuit
              </span>
            </motion.div>

            <motion.h1 {...apparait(0.08)}
              className="mt-6 text-[clamp(2.3rem,5.8vw,4.1rem)] font-semibold leading-[1.03] tracking-[-0.035em]"
              style={{ fontFamily: "var(--cap-font-display)" }}>
              Apprenez à trader avec un moteur{" "}
              <span style={{ color: NUIT.or }}>qui ne vous ment pas.</span>
            </motion.h1>

            <motion.p {...apparait(0.16)} className="mt-6 max-w-[36rem] text-[1.08rem] leading-[1.65]" style={{ color: NUIT.texte2 }}>
              Des analyses expliquées en français sur 819 actifs, un portefeuille virtuel de 10 000 €, et des
              chiffres <strong style={{ color: NUIT.texte }}>mesurés</strong> — jamais des promesses. Entraînez-vous
              comme sur votre vrai courtier, sans risquer un euro.
            </motion.p>

            <motion.div {...apparait(0.24)} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] px-7 text-[1rem] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: NUIT.or, color: "#1A1204", outlineColor: NUIT.or, boxShadow: "0 10px 30px -10px rgba(232,168,32,0.55)" }}>
                Commencer gratuitement
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <a href="#moteur"
                className="inline-flex min-h-[52px] items-center justify-center rounded-[12px] px-7 text-[1rem] font-medium transition-colors duration-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: NUIT.texte, boxShadow: `inset 0 0 0 1px ${NUIT.ligneForte}`, outlineColor: NUIT.texte }}>
                Voir ce qui nous distingue
              </a>
            </motion.div>

            <motion.ul {...apparait(0.32)} className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[0.88rem]" style={{ color: NUIT.texte3 }}>
              {[
                { I: ShieldCheck, t: "Argent virtuel uniquement" },
                { I: BookOpenCheck, t: "Chaque verdict expliqué" },
                { I: Landmark, t: "Fed et BCE suivies en direct" },
              ].map(({ I, t }) => (
                <li key={t} className="flex items-center gap-2"><I className="h-4 w-4" style={{ color: NUIT.or }} aria-hidden />{t}</li>
              ))}
            </motion.ul>
          </div>

          {/* ── Le produit ─────────────────────────────────────────────── */}
          <motion.div {...(reduit ? {} : { initial: { opacity: 0, y: 30, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.8, delay: 0.25, ease: EASE } })}
            className="relative mx-auto w-full max-w-[34rem] lg:mx-0 lg:ml-auto">
            {/* La carte principale : le vrai cours. */}
            <div className="relative rounded-[20px] p-5 sm:p-6"
              style={{ backgroundColor: NUIT.carte, boxShadow: `inset 0 0 0 1px ${NUIT.ligneForte}, 0 40px 80px -30px rgba(0,0,0,0.7)` }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[1.05rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)" }}>Apple</span>
                    <span className="text-[0.8rem]" style={{ color: NUIT.texte3 }}>AAPL</span>
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem]"
                      style={{ backgroundColor: "rgba(62,216,144,0.12)", color: NUIT.hausse }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: NUIT.hausse }} /> cours réel
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="cap-num text-[1.9rem] font-medium">{dernier ? `${euro(dernier)} $` : "—"}</span>
                    {prix && (
                      <span className="cap-num text-[0.95rem]" style={{ color: prix.change >= 0 ? NUIT.hausse : NUIT.baisse }}>
                        {prix.change >= 0 ? "+" : "−"}{Math.abs(prix.change).toFixed(2).replace(".", ",")} %
                      </span>
                    )}
                  </div>
                  {variation3m != null && (
                    <div className="cap-num mt-1 text-[0.8rem]" style={{ color: NUIT.texte3 }}>
                      sur 3 mois{" "}
                      <span style={{ color: variation3m >= 0 ? NUIT.hausse : NUIT.baisse }}>
                        {variation3m >= 0 ? "+" : "−"}{Math.abs(variation3m).toFixed(1).replace(".", ",")} %
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mt-5 h-[170px] sm:h-[190px]">
                {points.length > 1 ? (
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full" role="img"
                    aria-label={`Cours d'Apple sur trois mois, entre ${euro(g.min)} et ${euro(g.max)} dollars`}>
                    <defs>
                      <linearGradient id="aire-hero" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={NUIT.or} stopOpacity="0.32" />
                        <stop offset="100%" stopColor={NUIT.or} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" x2={W} y1={g.y(g.max)} y2={g.y(g.max)} stroke={NUIT.baisse} strokeOpacity="0.45" strokeDasharray="4 5" />
                    <line x1="0" x2={W} y1={g.y(g.min)} y2={g.y(g.min)} stroke={NUIT.hausse} strokeOpacity="0.45" strokeDasharray="4 5" />
                    <path d={g.aire} fill="url(#aire-hero)" />
                    <motion.path d={g.ligne} fill="none" stroke={NUIT.or} strokeWidth="2.2" strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      {...(reduit ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 1.6, delay: 0.5, ease: "easeOut" } })} />
                  </svg>
                ) : (
                  <div className="h-full w-full animate-pulse rounded-[12px]" style={{ backgroundColor: NUIT.carte2 }} />
                )}
                {points.length > 1 && (
                  <>
                    <span className="absolute left-1 top-0 text-[0.75rem]" style={{ color: NUIT.baisse }}>plus haut {euro(g.max)}</span>
                    <span className="absolute bottom-0 left-1 text-[0.75rem]" style={{ color: NUIT.hausse }}>plus bas {euro(g.min)}</span>
                  </>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { k: "Tendance", v: "lue et expliquée" },
                  { k: "Risque", v: "stop calculé" },
                  { k: "Pourquoi", v: "en français" },
                ].map((x) => (
                  <div key={x.k} className="rounded-[10px] px-3 py-2.5" style={{ backgroundColor: NUIT.carte2 }}>
                    <div className="text-[0.75rem]" style={{ color: NUIT.texte3 }}>{x.k}</div>
                    <div className="mt-0.5 text-[0.85rem] font-medium">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Les aperçus : des écrans du site, des faits exacts. */}
            <motion.div {...flotte(8, 6)}
              className="absolute -bottom-16 -left-4 hidden w-[15.5rem] rounded-[14px] p-3.5 sm:block lg:-left-20"
              style={{ backgroundColor: "rgba(19,38,61,0.92)", backdropFilter: "blur(10px)", boxShadow: `inset 0 0 0 1px ${NUIT.ligneForte}, 0 20px 40px -20px rgba(0,0,0,0.8)` }}>
              <div className="flex items-center gap-2 text-[0.75rem]" style={{ color: NUIT.texte3 }}>
                <Landmark className="h-3.5 w-3.5" style={{ color: NUIT.or }} aria-hidden /> Agenda macro · à chaque décision
              </div>
              <div className="mt-1.5 text-[0.88rem] font-semibold">Décision de la Fed</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
                <span className="rounded-[6px] px-1.5 py-0.5" style={{ backgroundColor: "rgba(240,113,103,0.14)", color: NUIT.baisse }}>Immobilier US ↓</span>
                <span className="rounded-[6px] px-1.5 py-0.5" style={{ backgroundColor: "rgba(240,113,103,0.14)", color: NUIT.baisse }}>S&amp;P 500 ↓</span>
              </div>
              <div className="mt-1.5 text-[0.75rem]" style={{ color: NUIT.texte3 }}>si la Fed surprend par sa fermeté · mesuré sur 46 décisions</div>
            </motion.div>

            <motion.div {...flotte(7, 7)}
              className="absolute -right-8 -top-20 hidden w-[13.5rem] rounded-[14px] p-3.5 sm:block"
              style={{ backgroundColor: "rgba(19,38,61,0.94)", backdropFilter: "blur(10px)", boxShadow: `inset 0 0 0 1px ${NUIT.ligneForte}, 0 20px 40px -20px rgba(0,0,0,0.8)` }}>
              <div className="text-[0.75rem]" style={{ color: NUIT.texte3 }}>Ordre · comme chez votre courtier</div>
              <div className="mt-1.5 text-[0.88rem] font-semibold">Turbo long · 11 titres</div>
              <div className="cap-num mt-1 text-[0.8rem]" style={{ color: NUIT.texte2 }}>16,80 € le titre · 1 € de frais</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: NUIT.carte }}>
                <div className="h-full w-[80%] rounded-full" style={{ background: `linear-gradient(90deg, ${NUIT.hausse}, ${NUIT.or})` }} />
              </div>
              <div className="mt-1 text-[0.75rem]" style={{ color: NUIT.texte3 }}>barrière à −20 %</div>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
