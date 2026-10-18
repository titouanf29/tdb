"use client";

import { useState } from "react";
import type { Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Marque, type Note } from "../GraphiqueEcole";
import { BoutonLire, RecommencerLire, RetourLire } from "./ElementsLire";

/**
 * Retrouver des bougies sur un graphique : on touche celle qu'on pense être
 * le marteau (puis l'avalement, puis le doji), on vérifie, et la bonne est
 * nommée sur le graphique. Une bougie voisine est acceptée : au doigt, sur
 * un téléphone, viser une bougie fine au pixel près n'a rien d'un savoir.
 */
export function TrouveBougies({ bougies, cibles }: {
  bougies: Bougie[];
  cibles: { nom: string; i: number; signal: "achat" | "point"; expliquer: string }[];
}) {
  const [k, setK] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [verifie, setVerifie] = useState(false);
  const [trouvees, setTrouvees] = useState<boolean[]>([]);
  const c = cibles[k];
  const fini = k >= cibles.length;
  const juste = choix != null && c && Math.abs(choix - c.i) <= 1;

  const nommees = cibles.slice(0, verifie ? k + 1 : k);
  const marques: Marque[] = nommees.filter((t) => t.signal === "achat").map((t) => ({ i: t.i, type: "achat", label: t.nom }));
  // Les autres sont nommées sous leur mèche basse : au-dessus, l'étiquette sortirait du graphique.
  const notes: Note[] = nommees.filter((t) => t.signal === "point").map((t) => ({ i: t.i, prix: bougies[t.i].l, texte: t.nom, dessous: true, couleur: "var(--cap-ink)" }));

  return (
    <div>
      <GraphiqueEcole bougies={bougies} sansSurvol apparition={false} marques={marques} notes={notes}
        surligne={verifie && c ? [c.i] : choix != null ? [choix] : []}
        onClic={verifie || fini ? undefined : (_, i) => setChoix(i)}
        ariaLabel="Graphique d'exercice : touchez une bougie" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RetourLire ton={verifie ? (juste ? "juste" : "faux") : null}>
          {fini ? `Terminé : ${trouvees.filter(Boolean).length} sur ${cibles.length} du premier coup. Les trois sont nommées sur le graphique.` :
            !verifie ? (
              <span style={{ color: "var(--cap-ink)" }}>
                <b>{k + 1}/{cibles.length}. Touchez {c.nom === "Avalement" ? "la grande bougie de l'avalement" : c.nom === "Doji" ? "le doji" : `le ${c.nom.toLowerCase()}`}.</b>{" "}
                {choix != null ? "Bougie choisie (cadre ambre). Touchez-en une autre pour changer." : ""}
              </span>
            ) : (
              <><b>{juste ? "Trouvé." : "Pas celle-ci : la bonne est encadrée."}</b> <span style={{ color: "var(--cap-ink-2)" }}>{c.expliquer}</span></>
            )}
        </RetourLire>
        <div className="flex items-center gap-2">
          {fini && <RecommencerLire onClick={() => { setK(0); setChoix(null); setVerifie(false); setTrouvees([]); }} />}
          {!fini && !verifie && <BoutonLire disabled={choix == null} onClick={() => { setVerifie(true); setTrouvees((t) => [...t, Boolean(juste)]); }}>Vérifier</BoutonLire>}
          {!fini && verifie && <BoutonLire onClick={() => { setK(k + 1); setChoix(null); setVerifie(false); }}>{k < cibles.length - 1 ? "Bougie suivante" : "Terminer"}</BoutonLire>}
        </div>
      </div>
    </div>
  );
}
