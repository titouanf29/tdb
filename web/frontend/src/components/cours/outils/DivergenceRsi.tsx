"use client";

import { useMemo, useState } from "react";
import { rsi, type Bougie } from "@/lib/cours/marche";
import { BoutonInd, LectureInd, MiniGraphe, RecommencerInd, nf, type PointMini, type TraitMini } from "./ElementsIndicateurs";

/**
 * Repérer une divergence : on touche les deux sommets du prix que l'on veut
 * comparer, le RSI de chacun s'affiche, puis la correction trace les deux
 * pentes (le prix monte, le RSI descend) et montre la suite.
 */
export function DivergenceRsi({ bougies, attendus, finExercice }: {
  bougies: Bougie[];
  /** Les deux sommets du prix qui forment la divergence (indices). */
  attendus: [number, number];
  /** La dernière bougie montrée pendant l'exercice. */
  finExercice: number;
}) {
  const closes = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const r = useMemo(() => rsi(closes), [closes]);
  const [choix, setChoix] = useState<number[]>([]);
  const [verifie, setVerifie] = useState(false);

  // Les sommets possibles : le plus haut de sa bougie dépasse celui des trois voisines de chaque côté.
  const sommets = useMemo(() => {
    const out: number[] = [];
    for (let i = 3; i <= finExercice - 1; i++) {
      let ok = true;
      for (let j = i - 3; j <= Math.min(finExercice, i + 3); j++) if (j !== i && bougies[j].h >= bougies[i].h) ok = false;
      if (ok && r[i] != null) out.push(i);
    }
    return out;
  }, [bougies, finExercice, r]);

  const toucher = (i: number) => {
    if (verifie) return;
    const proche = sommets.reduce((a, s) => (Math.abs(s - i) < Math.abs(a - i) ? s : a), sommets[0]);
    if (Math.abs(proche - i) > 4) return;
    setChoix((c) => (c.includes(proche) ? c.filter((v) => v !== proche) : c.length >= 2 ? [c[1], proche] : [...c, proche]).sort((a, b) => a - b));
  };

  const juste = choix.length === 2 && choix[0] === attendus[0] && choix[1] === attendus[1];
  const [a, b] = attendus;
  const pointsPrix: PointMini[] = choix.map((i, k) => ({ i, v: bougies[i].h, couleur: "var(--cap-ink)", label: `${k + 1}` }));
  const pointsRsi: PointMini[] = choix.map((i) => ({ i, v: r[i]!, couleur: "var(--cap-ink)" }));
  const traitsPrix: TraitMini[] = verifie ? [{ i0: a, v0: bougies[a].h, i1: b, v1: bougies[b].h, couleur: "var(--cap-up)", label: "Prix : plus haut" }] : [];
  const traitsRsi: TraitMini[] = verifie ? [{ i0: a, v0: r[a]!, i1: b, v1: r[b]!, couleur: "var(--cap-down)", label: "RSI : plus bas" }] : [];
  const creuxEntre = Math.min(...closes.slice(a, b + 1).map((_, j) => bougies[a + j].l));
  const casse = bougies.findIndex((bg, i) => i > b && bg.c < creuxEntre);

  return (
    <div>
      <MiniGraphe bougies={bougies} fin={verifie ? bougies.length - 1 : finExercice} onTape={(i) => toucher(i)} apparition={false}
        points={pointsPrix} traits={traitsPrix}
        panneaux={[{ titre: "RSI (14)", hauteur: 130, min: 0, max: 100, seuils: [30, 70], series: [{ v: r, couleur: "var(--cap-ocean)" }], points: pointsRsi, traits: traitsRsi }]}
        ariaLabel="Graphique d'exercice : touchez deux sommets du prix" hauteur={230} etroitHauteur={180} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <LectureInd ton={verifie ? (juste ? "juste" : "faux") : "neutre"}>
            {!verifie && choix.length === 0 && <p>Touchez un sommet du prix, puis un deuxième. Toucher de nouveau un sommet l'enlève.</p>}
            {!verifie && choix.length > 0 && (
              <p className="tabular-nums">
                {choix.map((i, k) => <span key={i}>Sommet {k + 1} : prix {nf(bougies[i].h)} $, RSI {nf(r[i]!, 1)}. </span>)}
                {choix.length === 1 ? "Touchez le deuxième sommet." : "Le prix et le RSI vont-ils dans le même sens ?"}
              </p>
            )}
            {verifie && (
              <p className="tabular-nums">
                {juste ? <b style={{ color: "var(--cap-up)" }}>Bien vu. </b> : <b style={{ color: "var(--cap-down)" }}>Pas ces deux-là. </b>}
                Les deux grands sommets du mouvement : le prix monte de {nf(bougies[a].h)} $ à <b style={{ color: "var(--cap-ink)" }}>{nf(bougies[b].h)} $</b> (plus haut),
                le RSI descend de {nf(r[a]!, 1)} à <b style={{ color: "var(--cap-ink)" }}>{nf(r[b]!, 1)}</b> (plus bas). C'est une divergence : la hausse s'essouffle.
                {casse > 0 && <> La confirmation vient du prix : à la bougie {casse + 1}, il clôture sous le creux entre les deux sommets ({nf(creuxEntre, 1)} $). Avant ça, ce n'était qu'un avertissement.</>}
              </p>
            )}
          </LectureInd>
        </div>
        <div className="flex items-center gap-2">
          {(choix.length > 0 || verifie) && <RecommencerInd onClick={() => { setChoix([]); setVerifie(false); }} />}
          {!verifie && <BoutonInd disabled={choix.length < 2} onClick={() => setVerifie(true)}>Voir la correction</BoutonInd>}
        </div>
      </div>
    </div>
  );
}
