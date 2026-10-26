"use client";

import { useMemo, useState } from "react";
import { sma, type Bougie } from "@/lib/cours/marche";
import { BoutonInd, LectureInd, LienInd, MiniGraphe, PastilleInd, RecommencerInd, nf } from "./ElementsIndicateurs";

/**
 * La moyenne mobile calculée à la main : une fenêtre de N clôtures qu'on fait
 * avancer d'une bougie. La plus ancienne sort, la nouvelle entre, et le point
 * de la moyenne se pose. On voit la ligne naître, point par point.
 */
export function FenetreMoyenne({ bougies, periode = 5, depart }: { bougies: Bougie[]; periode?: number; depart?: number }) {
  const premier = periode - 1;
  const [k, setK] = useState(depart ?? premier);
  const closes = useMemo(() => bougies.map((b) => b.c), [bougies]);
  const moy = useMemo(() => sma(closes, periode), [closes, periode]);
  const n = bougies.length;

  const fenetre = closes.slice(k - periode + 1, k + 1);
  const somme = fenetre.reduce((a, v) => a + v, 0);
  const valeur = somme / periode;
  const sortie = k > premier ? closes[k - periode] : null;
  const entree = k > premier ? closes[k] : null;
  const visible = moy.map((v, i) => (i <= k ? v : null));
  const decMoy = Number.isInteger(valeur) ? 0 : Number.isInteger(valeur * 10) ? 1 : 2;

  return (
    <div>
      <MiniGraphe bougies={bougies} bande={{ i0: k - periode + 1, i1: k }} curseur={k}
        series={[{ v: visible, couleur: "var(--cap-ocean)", epaisseur: 2.4 }]}
        points={[{ i: k, v: valeur, couleur: "var(--cap-ocean)", label: nf(valeur, decMoy) }]}
        ariaLabel={`Les ${n} bougies, la fenêtre des ${periode} dernières clôtures et la moyenne mobile`} hauteur={240} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <PastilleInd couleur="var(--cap-ocean)">Moyenne mobile {periode}</PastilleInd>
        <span className="inline-flex items-center gap-1.5 text-[0.88rem]" style={{ color: "var(--cap-ink-2)" }}>
          <span aria-hidden className="inline-block h-3 w-4 rounded-[3px]" style={{ backgroundColor: "var(--cap-ambre)", opacity: 0.3 }} />
          La fenêtre : les {periode} dernières bougies
        </span>
      </div>

      <div className="mt-4">
        <LectureInd>
          <p className="mb-2"><b style={{ color: "var(--cap-ink)" }}>Bougie {k + 1}.</b> Les {periode} dernières clôtures :</p>
          <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[1.02rem] tabular-nums" style={{ color: "var(--cap-ink)" }}>
            {fenetre.map((v, j) => (
              <span key={j}>
                <span style={j === periode - 1 && entree != null ? { color: "var(--cap-amber-ink)", fontWeight: 700 } : undefined}>{nf(v)}</span>
                {j < periode - 1 ? <span style={{ color: "var(--cap-ink-3)" }}> +</span> : null}
              </span>
            ))}
            <span style={{ color: "var(--cap-ink-3)" }}>=</span> <b>{nf(somme)}</b>
          </p>
          <p className="mt-1 tabular-nums">
            {nf(somme)} ÷ {periode} = <b style={{ color: "var(--cap-ocean)" }}>{nf(valeur, decMoy)}</b> : c'est le point de la moyenne, posé à la bougie {k + 1}.
          </p>
          {sortie != null && entree != null && (
            <p className="mt-2">
              Par rapport à la bougie d'avant, <b style={{ color: "var(--cap-ink)" }}>{nf(sortie)}</b> est sorti de la fenêtre et{" "}
              <b style={{ color: "var(--cap-amber-ink)" }}>{nf(entree)}</b> y est entré : la moyenne{" "}
              {entree > sortie ? "monte" : entree < sortie ? "baisse" : "ne bouge pas"}
              {entree !== sortie ? ` de ${nf(Math.abs(entree - sortie) / periode, Number.isInteger((entree - sortie) / periode) ? 0 : 1)} (l'écart ${nf(Math.abs(entree - sortie))}, divisé par ${periode})` : ""}.
            </p>
          )}
          {k === premier && <p className="mt-2">Avant la bougie {periode}, il n'y a pas encore {periode} clôtures : la moyenne n'existe pas.</p>}
        </LectureInd>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <LienInd onClick={() => setK(Math.max(premier, k - 1))} disabled={k === premier}>Bougie précédente</LienInd>
        {k < n - 1
          ? <BoutonInd onClick={() => setK(k + 1)}>Bougie suivante</BoutonInd>
          : <RecommencerInd onClick={() => setK(premier)} label="Revenir au début" />}
      </div>
    </div>
  );
}
