"use client";

import { useMemo, useState } from "react";
import { fmt, type Bougie } from "@/lib/cours/marche";
import { GraphiqueEcole } from "../GraphiqueEcole";
import { ChiffreSignal, CurseurSignal, nf } from "./ElementsSignaux";

/**
 * Le volume de la bougie de cassure, réglable : on le compare à la moyenne
 * des 20 bougies d'avant, on le voit grandir sous le graphique, et l'outil dit
 * ce qu'on peut en penser. Un indice, jamais une preuve.
 */
export function VolumeCassure({ bougies, ib, niveau, decimales = 0 }: {
  bougies: Bougie[];
  /** L'index de la bougie de cassure. */
  ib: number;
  niveau: number;
  decimales?: number;
}) {
  const [mult, setMult] = useState(2.5);
  const moyenne = useMemo(() => {
    const f = bougies.slice(Math.max(0, ib - 20), ib);
    return f.reduce((a, b) => a + b.v, 0) / f.length;
  }, [bougies, ib]);
  const b2 = useMemo(() => bougies.map((b, i) => (i === ib ? { ...b, v: Math.round(moyenne * mult) } : b)), [bougies, ib, moyenne, mult]);
  const v = Math.round(moyenne * mult);
  const ton = mult >= 1.5 ? "fort" : mult >= 0.9 ? "moyen" : "faible";

  return (
    <div>
      <GraphiqueEcole bougies={b2} jusqua={ib} panneaux={["volume"]} surligne={[ib]} apparition={false}
        niveaux={[{ prix: niveau, label: `Résistance ${fmt(niveau, decimales)} $`, couleur: "var(--cap-down)", zone: niveau * 0.0015 }]}
        ariaLabel={`La bougie de cassure et son volume, ${nf(mult, 1)} fois la moyenne`} unite="heure" />
      <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <CurseurSignal label="Volume de la bougie de cassure" valeur={mult} min={0.4} max={3} pas={0.1} onChange={setMult}
          ecrire={(x) => `${nf(x, 1)} fois la moyenne`} />
        <div>
          <ChiffreSignal label="Moyenne des 20 bougies d'avant" valeur={nf(Math.round(moyenne))} />
          <ChiffreSignal label="Volume de la cassure" valeur={<span style={{ color: "var(--cap-amber-ink)" }}>{nf(v)}</span>} fort />
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-[0.98rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        {ton === "fort" && <><b style={{ color: "var(--cap-ink)" }}>Beaucoup d'échanges.</b> Il s'est échangé {nf(mult, 1)} fois plus que d'habitude pendant cette bougie : beaucoup de monde a participé à la sortie. La cassure est <b>plus crédible</b>.</>}
        {ton === "moyen" && <><b style={{ color: "var(--cap-ink)" }}>Un volume ordinaire.</b> Ni plus ni moins que d'habitude : le volume ne confirme rien, ne dément rien. Regardez la clôture et le retour sur le niveau.</>}
        {ton === "faible" && <><b style={{ color: "var(--cap-ink)" }}>Peu d'échanges.</b> Le prix sort, mais presque personne ne suit : moins que d'habitude. Cassure <b>à surveiller</b> : attendez une confirmation, le retour sur le niveau par exemple.</>}
        {" "}<span style={{ color: "var(--cap-ink-3)" }}>Dans tous les cas, un indice, pas une preuve.</span>
      </p>
    </div>
  );
}
