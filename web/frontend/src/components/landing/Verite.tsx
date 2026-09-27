"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { marketAPI, type FiguresMesure } from "@/lib/api";
import { Container, EASE } from "@/components/design-system";

/**
 * Ce qui distingue le site, dit par l'exemple le plus parlant.
 *
 * Tout le monde a vu passer « le double creux qui ne rate jamais ». On les a
 * mesurées, toutes, sur dix ans : aucune ne fait mieux que le hasard de façon
 * stable. Les chiffres sont lus sur le serveur au chargement — les mêmes que
 * ceux de la leçon et du graphique — et la barre de chaque figure montre son
 * écart au hasard avec sa marge d'erreur : quand la barre croise le zéro, la
 * figure ne prouve rien.
 */

const NOMS: Record<string, string> = {
  double_sommet: "Double sommet", double_creux: "Double creux",
  ete: "Épaule-tête-épaule", ete_inversee: "ETE inversée",
  triangle_ascendant: "Triangle ascendant", triangle_descendant: "Triangle descendant",
  triangle_symetrique: "Triangle symétrique",
  drapeau_haussier: "Drapeau haussier", drapeau_baissier: "Drapeau baissier",
};

const ECHELLE = 16; // points de pourcentage de part et d'autre du hasard

export function Verite() {
  const reduit = useReducedMotion();
  const [d, setD] = useState<FiguresMesure | null>(null);

  useEffect(() => {
    marketAPI.getFiguresMesure().then(setD).catch(() => {});
  }, []);

  const figures = d
    ? Object.entries(d.statistiques).sort((a, b) => b[1].n - a[1].n)
    : [];
  const battent = figures.filter(([, s]) => s.verdict === "favorable").length;

  return (
    <section id="moteur" className="cap relative py-24 sm:py-32" style={{ backgroundColor: "var(--cap-bg)" }}>
      <Container width="wide">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--cap-ocean)" }}>
              Ce qui nous distingue
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4.6vw,3.3rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
              style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
              Les figures de TikTok&nbsp;?<br />On les a mesurées.
            </h2>
            <p className="mt-6 max-w-[34rem] text-[1.05rem] leading-[1.7]" style={{ color: "var(--cap-ink-2)" }}>
              Double creux, épaule-tête-épaule, drapeaux… On a cherché chacune d&apos;elles sur{" "}
              <strong style={{ color: "var(--cap-ink)" }}>
                {d ? `${d.methode.panel} actifs et ${d.methode.annees} ans de cours` : "dix ans de cours"}
              </strong>
              , puis regardé ce qui s&apos;est vraiment passé ensuite.
            </p>

            <div className="mt-8 rounded-[18px] p-6" style={{ backgroundColor: "var(--cap-navy)", color: "#F2F5F7" }}>
              <div className="cap-num text-[3.2rem] font-medium leading-none" style={{ color: "#E8A820" }}>
                {d ? `${battent} sur ${figures.length}` : "—"}
              </div>
              <p className="mt-3 text-[1.02rem] leading-[1.55]">
                figures font mieux que le hasard de façon stable.
              </p>
              <p className="mt-3 text-[0.9rem] leading-[1.6]" style={{ color: "rgba(232,237,241,0.74)" }}>
                {battent === 0
                  ? "Notre moteur ne leur donne donc aucun poids dans ses verdicts. Il vous les montre quand même sur le graphique — avec ce qu'elles ont réellement donné."
                  : "Le moteur ne tient compte que de celles-là, au poids qu'elles ont mérité."}
              </p>
            </div>

            <Link href="/register"
              className="mt-8 inline-flex min-h-[48px] items-center gap-2 text-[0.98rem] font-semibold underline-offset-4 hover:underline"
              style={{ color: "var(--cap-ocean)" }}>
              Voir la leçon et les chiffres complets <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* ── Les barres ──────────────────────────────────────────────── */}
          <div className="rounded-[20px] p-5 sm:p-7"
            style={{ backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line), var(--cap-shadow-lg)" }}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>Écart au hasard, 20 jours après</p>
              <p className="text-[0.8rem]" style={{ color: "var(--cap-ink-3)" }}>{d ? `${d.methode.figures.toLocaleString("fr-FR")} figures` : ""}</p>
            </div>
            <div className="relative mt-5">
              {/* Le zéro : le hasard. */}
              <div aria-hidden className="absolute bottom-0 top-0 w-px" style={{ left: "calc(38% + (62% / 2))", backgroundColor: "var(--cap-ink-3)", opacity: 0.4 }} />
              <ul className="space-y-3.5">
                {(figures.length ? figures : Array.from({ length: 7 }, (_, i) => [String(i), null] as const)).map(([cle, s], i) => (
                  <li key={cle} className="grid grid-cols-[38%_62%] items-center">
                    <div className="pr-3">
                      <div className="text-[0.88rem] font-medium" style={{ color: "var(--cap-ink)" }}>{s ? NOMS[cle] ?? cle : "…"}</div>
                      {s && <div className="text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>{s.n} cas</div>}
                    </div>
                    <div className="relative h-7">
                      {s && (() => {
                        const pos = (v: number) => 50 + (Math.max(-ECHELLE, Math.min(ECHELLE, v)) / ECHELLE) * 50;
                        const bas = pos(s.ecart - 2 * s.erreur_type), haut = pos(s.ecart + 2 * s.erreur_type);
                        const croise = s.ecart - 2 * s.erreur_type < 0 && s.ecart + 2 * s.erreur_type > 0;
                        return (
                          <>
                            <motion.div
                              className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
                              style={{ left: `${bas}%`, width: `${haut - bas}%`, backgroundColor: croise ? "rgba(21,94,117,0.22)" : "rgba(9,114,65,0.3)", transformOrigin: "50% 50%" }}
                              {...(reduit ? {} : { initial: { scaleX: 0 }, whileInView: { scaleX: 1 }, viewport: { once: true }, transition: { duration: 0.6, delay: 0.1 + i * 0.06, ease: EASE } })}
                            />
                            <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                              style={{ left: `${pos(s.ecart)}%`, backgroundColor: "var(--cap-ocean)", boxShadow: "0 0 0 3px var(--cap-surface)" }} />
                          </>
                        );
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 grid grid-cols-[38%_62%] text-[0.75rem]" style={{ color: "var(--cap-ink-3)" }}>
              <span />
              <div className="flex justify-between"><span>pire que le hasard</span><span>hasard</span><span>mieux</span></div>
            </div>
            <p className="mt-5 text-[0.82rem] leading-[1.6]" style={{ color: "var(--cap-ink-3)" }}>
              Le point est l&apos;écart moyen, la barre sa marge d&apos;erreur. Quand la barre traverse la ligne du
              hasard, la figure ne prouve rien. {d?.methode.note}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
