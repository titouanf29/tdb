"use client";

import { useMemo, useState } from "react";
import { bollinger, serie, type Ancre } from "@/lib/cours/marche";
import { GraphiqueEcole } from "../GraphiqueEcole";
import { ChiffreSignal, ChoixSignal, CurseurSignal, nf } from "./ElementsSignaux";

/**
 * L'atelier des bandes de Bollinger : on change l'humeur du marché (calme,
 * normal, agité, ou changeante) et les deux réglages de l'indicateur (la
 * période de la moyenne, le nombre d'écarts-types), et on voit les bandes
 * s'écarter, se resserrer, et combien de clôtures restent dedans.
 */
const ANCRES: Ancre[] = [[0, 4000], [12, 4018], [24, 3992], [36, 4030], [48, 4006], [60, 4036], [72, 4012], [89, 4040]];
const CHANGE: Ancre[] = [[0, 4000], [10, 4010], [20, 3996], [28, 4006], [31, 4060], [34, 4012], [37, 4078], [40, 4022], [43, 4092], [47, 4040], [52, 4064], [60, 4056], [70, 4062], [80, 4058], [89, 4061]];

const HUMEURS = [
  { nom: "Calme", b: () => serie(ANCRES, { graine: 901, bruit: 0.0012 }), mot: "Le marché est calme : les prix restent près de leur moyenne, l'écart-type est petit, les bandes sont serrées." },
  { nom: "Normal", b: () => serie(ANCRES, { graine: 901, bruit: 0.003 }), mot: "Un marché ordinaire : les bandes laissent de la place au prix, sans plus." },
  { nom: "Agité", b: () => serie(ANCRES, { graine: 901, bruit: 0.007 }), mot: "Le marché s'agite : les prix s'éloignent beaucoup de leur moyenne, l'écart-type grandit, les bandes s'écartent." },
  { nom: "Il change d'humeur", b: () => serie(CHANGE, { graine: 91, bruit: 0.0015 }), mot: "Calme, puis agité, puis calme : les bandes s'écartent pendant l'agitation et se resserrent quand le prix se calme." },
];

// Une seule échelle pour toutes les humeurs : on voit vraiment les bandes s'écarter.
const ECHELLE = (() => {
  let lo = Infinity, hi = -Infinity;
  for (const h of HUMEURS) {
    const b = h.b();
    for (const n of [10, 20, 35, 50]) {
      const bo = bollinger(b.map((x) => x.c), n, 3);
      b.forEach((x, i) => {
        lo = Math.min(lo, x.l, bo.bas[i] ?? Infinity);
        hi = Math.max(hi, x.h, bo.haut[i] ?? -Infinity);
      });
    }
  }
  return [lo, hi];
})();

export function AtelierBollinger() {
  const [h, setH] = useState(3);
  const [n, setN] = useState(20);
  const [k, setK] = useState(2);
  const bougies = useMemo(() => HUMEURS[h].b(), [h]);

  const mesure = useMemo(() => {
    const closes = bougies.map((b) => b.c);
    const bo = bollinger(closes, n, k);
    let dedans = 0, total = 0;
    closes.forEach((c, i) => {
      const hh = bo.haut[i], bb = bo.bas[i];
      if (hh == null || bb == null) return;
      total++;
      if (c <= hh && c >= bb) dedans++;
    });
    const i = closes.length - 1;
    const largeurs = bo.haut.map((v, j) => (v != null && bo.bas[j] != null ? v - bo.bas[j]! : null)).filter((v): v is number => v != null);
    return {
      milieu: bo.milieu[i]!, haut: bo.haut[i]!, bas: bo.bas[i]!,
      ecart: (bo.haut[i]! - bo.milieu[i]!) / k,
      pct: total ? Math.round((dedans / total) * 100) : 0,
      min: Math.min(...largeurs), max: Math.max(...largeurs),
    };
  }, [bougies, n, k]);

  return (
    <div>
      <p className="mb-1 text-[0.94rem]" style={{ color: "var(--cap-ink-2)" }}>L'humeur du marché</p>
      <ChoixSignal label="L'humeur du marché" options={HUMEURS.map((x) => x.nom)} valeur={h} onChange={setH} />
      <div className="mt-3">
        <GraphiqueEcole bougies={bougies} bollinger={{ n, k }} unite="heure"
          niveaux={ECHELLE.map((prix) => ({ prix, couleur: "transparent" }))}
          ariaLabel={`Graphique de l'or avec les bandes de Bollinger (${n} bougies, ${nf(k, 1)} écarts-types), marché ${HUMEURS[h].nom.toLowerCase()}`} />
      </div>
      <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <CurseurSignal label="Période de la moyenne" valeur={n} min={10} max={50} onChange={setN}
          ecrire={(v) => `${v} bougies`} aide="Le réglage habituel : 20." />
        <CurseurSignal label="Écart des bandes" valeur={k} min={1} max={3} pas={0.5} onChange={setK}
          ecrire={(v) => `${nf(v, 1)} écart${v > 1 ? "s" : ""}-type${v > 1 ? "s" : ""}`} aide="Le réglage habituel : 2." />
      </div>
      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <div>
          <ChiffreSignal label="Bande du haut, à la fin" valeur={`${nf(mesure.haut, 1)} $`} />
          <ChiffreSignal label="Bande du milieu" valeur={`${nf(mesure.milieu, 1)} $`} />
          <ChiffreSignal label="Bande du bas" valeur={`${nf(mesure.bas, 1)} $`} />
        </div>
        <div>
          <ChiffreSignal label="Un écart-type, en ce moment" valeur={`${nf(mesure.ecart, 1)} $`} />
          <ChiffreSignal label="Largeur des bandes sur le graphique" valeur={`${nf(mesure.min, 0)} à ${nf(mesure.max, 0)} $`} />
          <ChiffreSignal label="Clôtures restées dans les bandes" valeur={<span style={{ color: "var(--cap-amber-ink)" }}>{mesure.pct} %</span>} fort />
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-[0.98rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        {HUMEURS[h].mot}{" "}
        {k <= 1
          ? "Avec un seul écart-type, les bandes sont étroites : le prix en sort souvent, elles ne disent plus grand-chose."
          : k >= 3
            ? "Avec trois écarts-types, les bandes sont si larges que le prix ne les touche presque jamais."
            : n < 15
              ? "Avec une période courte, la moyenne colle au prix et les bandes bougent beaucoup."
              : n > 35
                ? "Avec une période longue, la moyenne est lente : les bandes réagissent en retard."
                : "Avec les réglages habituels (20 bougies, 2 écarts-types), la grande majorité des clôtures reste entre les bandes."}
      </p>
    </div>
  );
}
