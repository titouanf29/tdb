"use client";

import { useState } from "react";
import type { Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Marque, type Note, type Trait } from "../GraphiqueEcole";
import { BoutonLire, ChoixLire, RecommencerLire, RetourLire } from "./ElementsLire";

/**
 * Classer les sommets et les creux : chaque point numéroté est comparé au
 * précédent du même genre (un sommet au sommet d'avant, un creux au creux
 * d'avant). Puis la correction écrit HH, HL, LH, LL sur le graphique et relie
 * le zigzag.
 */
export interface PointStructure { i: number; prix: number; genre: "sommet" | "creux" }

export function ClasseSommetsCreux({ bougies, points, conclusion }: {
  bougies: Bougie[];
  /** Dans l'ordre du temps. Le premier sommet et le premier creux servent de départ. */
  points: PointStructure[];
  conclusion: string;
}) {
  // La bonne réponse de chaque point : plus haut ou plus bas que le précédent du même genre.
  const bonnes = points.map((p, k) => {
    const avant = points.slice(0, k).reverse().find((q) => q.genre === p.genre);
    return avant ? (p.prix > avant.prix ? "haut" : "bas") : null;
  });
  const aClasser = points.map((_, k) => k).filter((k) => bonnes[k] != null);
  const [rep, setRep] = useState<Record<number, "haut" | "bas">>({});
  const [verifie, setVerifie] = useState(false);
  const justes = aClasser.filter((k) => rep[k] === bonnes[k]).length;
  const tout = aClasser.every((k) => rep[k]);
  const sigle = (k: number) => {
    const p = points[k];
    if (bonnes[k] == null) return "départ";
    return p.genre === "sommet" ? (bonnes[k] === "haut" ? "HH" : "LH") : (bonnes[k] === "haut" ? "HL" : "LL");
  };
  const num = (k: number) => aClasser.indexOf(k) + 1;

  const marques: Marque[] = points.map((p) => ({ i: p.i, prix: p.prix, type: "point" }));
  const notes: Note[] = points.map((p, k) => ({
    i: p.i, prix: p.prix, dessous: p.genre === "creux",
    texte: verifie ? sigle(k) : bonnes[k] == null ? "départ" : String(num(k)),
    couleur: !verifie || bonnes[k] == null ? "var(--cap-ink)" : bonnes[k] === "haut" ? "var(--cap-up)" : "var(--cap-down)",
  }));
  const traits: Trait[] = verifie ? points.slice(1).map((p, k) => ({ de: [points[k].i, points[k].prix], a: [p.i, p.prix], couleur: "var(--cap-ink-3)" })) : [];

  return (
    <div>
      <GraphiqueEcole bougies={bougies} sansSurvol apparition={false} marques={marques} notes={notes} traits={traits}
        ariaLabel="Graphique d'exercice : des sommets et des creux numérotés" />
      <div className="mt-3">
        {aClasser.map((k) => {
          const p = points[k];
          return (
            <div key={k} className="flex flex-wrap items-center justify-between gap-x-2 border-b py-1" style={{ borderColor: "var(--cap-line)" }}>
              <span className="text-[0.95rem]" style={{ color: "var(--cap-ink)" }}>
                <b className="tabular-nums">{num(k)}.</b> {p.genre === "sommet" ? "Sommet" : "Creux"}
              </span>
              <ChoixLire label={`Point ${num(k)}`} valeur={rep[k] ?? null} desactive={verifie}
                onChange={(v) => setRep((r) => ({ ...r, [k]: v }))}
                etat={(v) => (!verifie ? null : v === bonnes[k] ? "juste" : v === rep[k] ? "faux" : null)}
                options={[{ v: "haut", texte: "plus haut" }, { v: "bas", texte: "plus bas" }]} />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RetourLire ton={verifie ? (justes === aClasser.length ? "juste" : "faux") : null}>
          {!verifie
            ? "Comparez chaque point au précédent du même genre : un sommet au sommet d'avant, un creux au creux d'avant."
            : <><b>{justes} sur {aClasser.length}.</b> <span style={{ color: "var(--cap-ink-2)" }}>HH : sommet plus haut (higher high). HL : creux plus haut (higher low). LH : sommet plus bas (lower high). LL : creux plus bas (lower low). {conclusion}</span></>}
        </RetourLire>
        <div className="flex items-center gap-2">
          {(verifie || Object.keys(rep).length > 0) && <RecommencerLire onClick={() => { setRep({}); setVerifie(false); }} />}
          {!verifie && <BoutonLire disabled={!tout} onClick={() => setVerifie(true)}>Voir la correction</BoutonLire>}
        </div>
      </div>
    </div>
  );
}
