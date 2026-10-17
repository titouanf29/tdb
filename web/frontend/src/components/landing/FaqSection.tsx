"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Container, Eyebrow, Heading, Section, Text, DUR, EASE } from "@/components/design-system";
import { Reveal } from "./effets";

/**
 * Les questions qu'on se pose avant de créer un compte — avec des réponses
 * franches. Une page sérieuse répond à ses objections au lieu de les laisser
 * en suspens jusqu'au bouton d'inscription.
 */
const QUESTIONS: { q: string; r: React.ReactNode }[] = [
  {
    q: "Est-ce que je risque de l'argent réel ?",
    r: "Non, jamais. Le solde, les positions et les résultats sont virtuels. Aucun dépôt n'est possible et aucune carte bancaire n'est demandée pour utiliser le site.",
  },
  {
    q: "Les cours sont-ils réels ?",
    r: "Oui : les analyses portent sur les vrais cours des marchés (actions, indices, crypto, devises, matières premières). Seul l'argent est fictif.",
  },
  {
    q: "Est-ce un conseil en investissement ?",
    r: (
      <>
        Non. CaptenTDB est un outil éducatif : il n&apos;est pas prestataire de services d&apos;investissement et
        ne donne aucun conseil personnalisé. Quand Nimbo « propose » une position, c&apos;est un exercice, chiffré
        et expliqué. Détails dans les{" "}
        <Link href="/mentions-legales" className="underline underline-offset-2" style={{ color: "var(--cap-ocean)" }}>mentions légales</Link>.
      </>
    ),
  },
  {
    q: "Faut-il déjà s'y connaître ?",
    r: "Non. Au départ, le site vous demande votre niveau, puis adapte la quantité d'informations. Un premier parcours guidé par Nimbo vous fait faire une analyse, une position virtuelle, puis son suivi.",
  },
  {
    q: "Nimbo a-t-il toujours raison ?",
    r: "Non, et il le dit. Sur dix achats comparables, il montre combien ont atteint l'objectif, combien ont touché le stop et combien sont sortis à l'échéance, mesuré sur des années de données. Et chacune de ses vraies propositions est suivie jusqu'au bout : le bilan est consultable dans votre espace.",
  },
  {
    q: "Ça marche sur téléphone ?",
    r: "Oui. Le site s'installe comme une application sur l'écran d'accueil, et peut vous prévenir quand Nimbo propose un achat sur un de vos favoris.",
  },
];

export function FaqSection() {
  const [ouvert, setOuvert] = useState<number | null>(0);
  return (
    <Section id="faq" size="md">
      <Container width="wide">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <Reveal><Eyebrow>Questions fréquentes</Eyebrow></Reveal>
            <Heading level={1} className="mt-5">Avant de commencer.</Heading>
            <Reveal delay={0.1}>
              <Text size="lead" className="mt-6 max-w-[26rem]">
                Les réponses franches aux questions que tout le monde se pose.
              </Text>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <ul className="overflow-hidden" style={{ borderRadius: "var(--cap-r-xl)", backgroundColor: "var(--cap-surface)", boxShadow: "inset 0 0 0 1px var(--cap-line)" }}>
              {QUESTIONS.map((x, i) => {
                const actif = ouvert === i;
                return (
                  <li key={x.q} style={{ borderTop: i ? "1px solid var(--cap-line)" : undefined }}>
                    <button type="button" onClick={() => setOuvert(actif ? null : i)} aria-expanded={actif}
                      className="flex min-h-[64px] w-full items-center justify-between gap-6 px-6 py-4 text-left transition-colors hover:bg-[color:var(--cap-surface-2)] sm:px-8">
                      <span className="text-[1.02rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{x.q}</span>
                      <Plus aria-hidden className="h-5 w-5 shrink-0 transition-transform duration-300"
                        style={{ color: "var(--cap-ocean)", transform: actif ? "rotate(45deg)" : undefined }} />
                    </button>
                    <AnimatePresence initial={false}>
                      {actif && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: DUR.base, ease: EASE }} style={{ overflow: "hidden" }}>
                          <Text className="px-6 pb-6 sm:px-8">{x.r}</Text>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
