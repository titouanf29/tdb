"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fiche } from "@/lib/cours/catalogue";
import { CHARGEURS } from "@/lib/cours/lecons";
import type { LeconSerie } from "@/lib/cours/types";
import { EmptyState, Nimbo, Text } from "@/components/design-system";
import { LeconVue } from "@/components/cours/LeconVue";

export function LeconChargee({ numero }: { numero: number }) {
  const [lecon, setLecon] = useState<LeconSerie | null>(null);
  const [erreur, setErreur] = useState(false);
  const f = fiche(numero);
  const charger = CHARGEURS[numero];

  useEffect(() => {
    setLecon(null);
    window.scrollTo(0, 0);
    charger?.().then((m) => setLecon(m.default)).catch(() => setErreur(true));
  }, [charger]);

  if (!f) {
    return <div className="mx-auto max-w-xl py-20"><EmptyState title="Cette leçon n'existe pas" description="Retrouvez toutes les leçons dans Apprendre." /></div>;
  }
  if (!charger || erreur) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <Nimbo humeur="reflechit" taille={80} label="" className="mx-auto" />
        <h1 className="mt-4 text-[1.8rem] font-medium" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>Leçon {numero} : {f.titre}</h1>
        <Text className="mt-3">{erreur ? "La leçon n'a pas pu se charger. Rechargez la page." : "Elle arrive très bientôt sur le site."}</Text>
        <Link href="/learn" className="cap-lien mt-6 inline-block">Voir toutes les leçons</Link>
      </div>
    );
  }
  if (!lecon) return <div className="py-24 text-center"><Text size="small">Chargement de la leçon {numero}…</Text></div>;
  return <LeconVue lecon={lecon} />;
}
