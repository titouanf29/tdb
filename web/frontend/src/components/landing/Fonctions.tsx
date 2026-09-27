"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpenCheck, CalendarDays, Landmark, LineChart, NotebookPen, Wallet,
} from "lucide-react";
import { Container, EASE } from "@/components/design-system";
import { NUIT } from "./nuit";

/**
 * Tout ce que le site sait faire, en six tuiles. Chaque tuile porte un
 * fragment de l'écran qu'elle décrit — pas une illustration générique — pour
 * qu'on reconnaisse le produit en s'inscrivant.
 */

function Tuile({ i, grande, pleine, icone: I, titre, texte, children }: {
  i: number; grande?: boolean; pleine?: boolean; icone: typeof Wallet; titre: string; texte: string; children?: React.ReactNode;
}) {
  const reduit = useReducedMotion();
  return (
    <motion.article
      {...(reduit ? {} : { initial: { opacity: 0, y: 20, scale: 0.97 }, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.45, delay: (i % 3) * 0.07, ease: EASE } })}
      className={`group relative flex flex-col overflow-hidden rounded-[20px] p-6 transition-colors duration-300 sm:p-7 ${grande ? "lg:col-span-2" : ""} ${pleine ? "md:col-span-2 lg:col-span-3" : ""}`}
      style={{ backgroundColor: NUIT.carte, boxShadow: `inset 0 0 0 1px ${NUIT.ligne}` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[11px]" style={{ backgroundColor: NUIT.orDoux }}>
        <I className="h-5 w-5" style={{ color: NUIT.or }} aria-hidden />
      </div>
      <h3 className="mt-5 text-[1.2rem] font-semibold tracking-[-0.01em]" style={{ fontFamily: "var(--cap-font-display)" }}>{titre}</h3>
      <p className="mt-2 text-[0.95rem] leading-[1.6]" style={{ color: NUIT.texte2 }}>{texte}</p>
      {children && <div className="mt-6 flex-1">{children}</div>}
    </motion.article>
  );
}

const Pill = ({ ton, children }: { ton: "h" | "b" | "n"; children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-[7px] px-2 py-1 text-[0.8rem]"
    style={{
      backgroundColor: ton === "h" ? "rgba(62,216,144,0.12)" : ton === "b" ? "rgba(240,113,103,0.13)" : "rgba(232,237,241,0.08)",
      color: ton === "h" ? NUIT.hausse : ton === "b" ? NUIT.baisse : NUIT.texte2,
    }}>{children}</span>
);

export function Fonctions() {
  return (
    <section id="fonctions" className="py-24 sm:py-32" style={{ backgroundColor: NUIT.fond, color: NUIT.texte }}>
      <Container width="wide">
        <div className="max-w-[46rem]">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ color: NUIT.or }}>Tout au même endroit</p>
          <h2 className="mt-4 text-[clamp(2rem,4.6vw,3.3rem)] font-semibold leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: "var(--cap-font-display)" }}>
            De la première analyse au trade relu.
          </h2>
          <p className="mt-5 text-[1.05rem] leading-[1.7]" style={{ color: NUIT.texte2 }}>
            Comprendre un actif, décider, s&apos;entraîner, puis apprendre de ce qui s&apos;est passé. Chaque étape a
            son outil, et tous se parlent.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Tuile i={0} grande icone={LineChart} titre="Une analyse qui explique son verdict"
            texte="Tendance, momentum, risque, fondamentaux : chaque note est justifiée en français, avec le stop et l'objectif calculés pour votre horizon — du scalping au long terme.">
            <div className="rounded-[14px] p-4" style={{ backgroundColor: NUIT.carte2 }}>
              <div className="flex flex-wrap items-center gap-2">
                <Pill ton="h">Tendance haussière</Pill><Pill ton="n">Momentum neutre</Pill><Pill ton="b">Volatilité élevée</Pill>
              </div>
              <div className="mt-3 space-y-2">
                {["La tendance de fond est orientée à la hausse.", "Les volumes ne confirment pas encore le mouvement.", "Le stop est placé sous le dernier creux."].map((t) => (
                  <div key={t} className="flex gap-2.5 text-[0.88rem]" style={{ color: NUIT.texte2 }}>
                    <span aria-hidden className="mt-[0.6rem] h-px w-3 shrink-0" style={{ backgroundColor: NUIT.or }} />{t}
                  </div>
                ))}
              </div>
            </div>
          </Tuile>

          <Tuile i={1} icone={Landmark} titre="La Fed et la BCE, décodées"
            texte="Les dates officielles, le communiqué lu dès sa publication, et l'effet mesuré sur chacun de vos actifs — certains montent, d'autres baissent.">
            <div className="flex flex-wrap gap-1.5">
              <Pill ton="b">Obligations ↓</Pill><Pill ton="b">Immobilier ↓</Pill><Pill ton="n">Banques =</Pill><Pill ton="b">Or ↓</Pill>
            </div>
          </Tuile>

          <Tuile i={2} icone={Wallet} titre="10 000 € virtuels, vrais ordres"
            texte="Montant × levier comme un CFD, ou turbos en titres entiers comme chez Trade Republic, avec vos frais de courtage. Stop, objectif et barrière s'exécutent tout seuls.">
            <div className="cap-num flex items-baseline justify-between rounded-[12px] px-4 py-3 text-[0.9rem]" style={{ backgroundColor: NUIT.carte2 }}>
              <span style={{ color: NUIT.texte2 }}>11 × 16,80 €</span><span style={{ color: NUIT.hausse }}>+4,2 %</span>
            </div>
          </Tuile>

          <Tuile i={3} icone={NotebookPen} titre="Chaque trade relu pour vous"
            texte="Quand un stop saute, le bilan s'écrit tout seul dans votre journal : ce qui s'est passé, ce qui a coûté, ce qu'il faut changer.">
            <div className="rounded-[12px] p-3.5 text-[0.86rem] leading-[1.55]" style={{ backgroundColor: NUIT.carte2, color: NUIT.texte2 }}>
              « Aucun stop n&apos;était posé : la perte n&apos;avait pas de plancher. »
            </div>
          </Tuile>

          <Tuile i={4} icone={CalendarDays} titre="Le week-end, on prépare lundi"
            texte="Quand les marchés ferment : votre semaine en chiffres, l'agenda macro qui arrive, l'actualité de vos actifs et ce qu'il faut régler avant l'ouverture." />

          <Tuile i={5} pleine icone={BookOpenCheck} titre="Un parcours qui s'adapte à vous"
            texte="Des leçons courtes, un glossaire, des missions et un assistant qui répond sur vos propres données. Cinq questions suffisent pour personnaliser tout le site." />
        </div>
      </Container>
    </section>
  );
}
