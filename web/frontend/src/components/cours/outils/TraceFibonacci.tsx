"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole, type Marque, type Niveau, type Zone } from "../GraphiqueEcole";
import { BoutonSignal, LienSignal, RecommencerSignal, RetourSignal, useCalmeSignal } from "./ElementsSignaux";

/**
 * Tracer un retracement de Fibonacci comme sur une plateforme : un clic sur le
 * creux, un clic sur le sommet. L'outil s'accroche aux mèches (le plus bas ou
 * le plus haut des bougies voisines), trace 38,2 %, 50 % et 61,8 %, colore la
 * zone 50 à 61,8 %, puis montre la confluence avec un ancien niveau et la
 * suite du graphique.
 */
const RATIOS = [0.382, 0.5, 0.618];
const ECRIT: Record<number, string> = { 0.382: "38,2 %", 0.5: "50 %", 0.618: "61,8 %" };

export function TraceFibonacci({ bougies, jusqua, creux, sommet, ancien, decimales = 4 }: {
  bougies: Bougie[];
  /** La dernière bougie montrée pendant l'exercice. */
  jusqua: number;
  /** Les index du vrai creux et du vrai sommet du mouvement. */
  creux: number;
  sommet: number;
  /** Un ancien niveau qui tombe dans la zone (la confluence). */
  ancien?: { prix: number; label: string };
  decimales?: number;
}) {
  const calme = useCalmeSignal();
  const [pts, setPts] = useState<{ c?: number; s?: number }>({});
  const [verifie, setVerifie] = useState(false);
  const [reussi, setReussi] = useState(false);
  const [suite, setSuite] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fin, setFin] = useState(jusqua);
  const raf = useRef(0);
  const n = bougies.length;
  const ecr = (p: number) => fmt(p, decimales);

  useEffect(() => {
    if (!suite) { setFin(jusqua); return; }
    if (calme) { setFin(n - 1); return; }
    const t0 = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / 1500);
      setFin(Math.round(jusqua + (n - 1 - jusqua) * f));
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf.current);
  }, [suite, calme, jusqua, n]);

  const accroche = (i: number, bas: boolean) => {
    let best = Math.max(0, Math.min(jusqua, i));
    for (let j = Math.max(0, i - 3); j <= Math.min(jusqua, i + 3); j++) {
      if (bas ? bougies[j].l < bougies[best].l : bougies[j].h > bougies[best].h) best = j;
    }
    return best;
  };

  const clic = (_prix: number, i: number) => {
    if (verifie) return;
    if (pts.c == null || pts.s != null) {
      setPts({ c: accroche(i, true) });
      setMessage(null);
      return;
    }
    const s = accroche(i, false);
    if (s <= pts.c) { setMessage("Le sommet vient après le creux : cliquez plus à droite, sur le point le plus haut de la montée."); return; }
    setPts({ ...pts, s });
    setMessage(null);
  };

  const L = pts.c != null ? bougies[pts.c].l : null;
  const H = pts.s != null ? bougies[pts.s].h : null;
  const pret = L != null && H != null;
  const juste = pts.c === creux && pts.s === sommet;
  const prix = (r: number) => H! - r * (H! - L!);

  const niveaux: Niveau[] = [];
  const zones: Zone[] = [];
  const marques: Marque[] = [];
  if (pts.c != null) marques.push({ i: pts.c, type: "point", prix: bougies[pts.c].l });
  if (pts.s != null) marques.push({ i: pts.s, type: "point", prix: bougies[pts.s].h });
  if (pret) {
    niveaux.push({ prix: H!, couleur: "var(--cap-ink-3)", epaisseur: 1 });
    for (const r of RATIOS) niveaux.push({ prix: prix(r), label: `${ECRIT[r]} : ${ecr(prix(r))}`, couleur: r === 0.382 ? "var(--cap-ink-2)" : "var(--cap-amber-ink)", epaisseur: 1.4 });
    niveaux.push({ prix: L!, couleur: "var(--cap-ink-3)", epaisseur: 1 });
    zones.push({ i0: pts.s!, i1: n - 1, p0: prix(0.5), p1: prix(0.618), couleur: "var(--cap-amber-ink)" });
  }
  if (verifie && ancien) niveaux.push({ prix: ancien.prix, label: ancien.label, couleur: "var(--cap-ocean)", pointille: false, epaisseur: 2 });

  const corriger = (bon = false) => { setReussi(bon); setPts({ c: creux, s: sommet }); setVerifie(true); };

  let retour: React.ReactNode;
  let ton: "juste" | "faux" | null = null;
  if (message) retour = message;
  else if (pts.c == null) retour = "Étape 1 : cliquez sur le creux, le point le plus bas d'où part la montée. L'outil s'accroche à la mèche la plus basse autour de votre clic.";
  else if (pts.s == null) retour = `Creux posé à ${ecr(bougies[pts.c].l)}. Étape 2 : cliquez sur le sommet, le point le plus haut de la montée.`;
  else if (!verifie) retour = `Retracement tracé du creux (${ecr(L!)}) au sommet (${ecr(H!)}) : ${Math.round((H! - L!) * 10 ** decimales)} pips. La zone en ambre va de 50 à 61,8 %. Vérifiez.`;
  else {
    ton = reussi ? "juste" : null;
    retour = reussi
      ? `Votre mouvement est le bon : du creux à ${ecr(L!)} au sommet à ${ecr(H!)}. La zone 50 à 61,8 % va de ${ecr(prix(0.618))} à ${ecr(prix(0.5))}.${ancien ? ` Et l'${ancien.label.toLowerCase()} tombe dedans : deux raisons au même endroit, c'est une confluence.` : ""}`
      : `Voici le mouvement à mesurer : du plus bas d'où part la montée (${ecr(bougies[creux].l)}) au plus haut (${ecr(bougies[sommet].h)}). Partir d'un autre point donne d'autres niveaux : on choisit le mouvement avant, et on ne le change plus. La zone 50 à 61,8 % va de ${ecr(prix(0.618))} à ${ecr(prix(0.5))}.${ancien ? ` L'${ancien.label.toLowerCase()} tombe dedans : c'est une confluence.` : ""}`;
  }

  return (
    <div>
      <GraphiqueEcole bougies={bougies} jusqua={fin} niveaux={niveaux} zones={zones} marques={marques} apparition={false}
        sansSurvol={!suite} onClic={verifie ? undefined : clic}
        ariaLabel="Graphique de l'euro-dollar : cliquez sur le creux puis sur le sommet pour tracer le retracement" />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <RetourSignal ton={ton} className="flex-1">{retour}</RetourSignal>
        <div className="flex flex-none flex-wrap items-center justify-end gap-1">
          {(pts.c != null || verifie) && <RecommencerSignal onClick={() => { setPts({}); setVerifie(false); setSuite(false); setMessage(null); }} />}
          {!verifie && !pret && <LienSignal onClick={() => corriger(false)}>Montrer la réponse</LienSignal>}
          {!verifie && pret && <BoutonSignal onClick={() => corriger(juste)}>Vérifier</BoutonSignal>}
          {verifie && !suite && <BoutonSignal onClick={() => setSuite(true)}>Voir la suite</BoutonSignal>}
        </div>
      </div>
      {suite && (
        <p aria-live="polite" className="mt-2 text-[0.98rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
          Le prix est descendu dans la zone, une bougie à longue mèche basse l'a rejetée, puis la hausse est repartie. Ce jour-là, la zone a tenu. Elle aurait pu céder : c'est pour ça qu'on attend le signal, et qu'on place un stop sous la zone.
        </p>
      )}
    </div>
  );
}
