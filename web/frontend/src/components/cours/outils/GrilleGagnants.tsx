"use client";

import { useState } from "react";
import { Bouton, BoutonLien, Choix, Curseur, Ligne, Lignes, Verdict, nb, usd } from "./ElementsRisque";

/**
 * Cent trades, une grille de cent cases. Avec un ratio de 1 pour X, combien
 * de gagnants faut-il pour ne pas perdre d'argent ? L'élève devine, puis voit
 * le compte : gains d'un côté, pertes de l'autre.
 */
const RATIOS = [1, 1.5, 2, 3] as const;

export function GrilleGagnants({ risque = 20 }: { risque?: number }) {
  const [ratio, setRatio] = useState<number>(2);
  const [n, setN] = useState(50);
  const [vu, setVu] = useState(false);

  // Le plus petit nombre de gagnants qui ne perd pas : n × ratio ≥ 100 − n.
  const seuil = Math.ceil(100 / (1 + ratio) - 1e-9);
  const pointMort = 100 / (1 + ratio);
  const gains = n * ratio * risque;
  const pertes = (100 - n) * risque;
  const solde = gains - pertes;

  const changerRatio = (r: number) => { setRatio(r); setVu(false); };

  return (
    <div>
      <Choix label="Votre ratio risque / rendement" valeur={ratio} onChange={changerRatio}
        options={RATIOS.map((r) => ({ v: r, texte: `1 pour ${nb(r, 1)}` }))} />

      <div className="mt-3 grid gap-5 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)] sm:items-start">
        <div>
          <div className="grid grid-cols-10 gap-[3px]" role="img"
            aria-label={`${n} trades gagnants sur 100, en vert, et ${100 - n} perdants, en rouge`}>
            {Array.from({ length: 100 }, (_, k) => {
              const gagne = k < n;
              const marque = vu && k === seuil - 1;
              return (
                <button key={k} type="button" tabIndex={-1} aria-hidden onClick={() => setN(k + 1)}
                  className="aspect-square w-full rounded-[3px] transition-colors"
                  style={{
                    backgroundColor: gagne ? "var(--cap-up-fill)" : "var(--cap-down-fill)",
                    opacity: gagne ? 0.9 : 0.35,
                    outline: marque ? "2px solid var(--cap-ambre)" : undefined,
                    outlineOffset: 1,
                  }} />
              );
            })}
          </div>
          <p className="mt-1.5 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>
            Une case, un trade. Touchez une case pour fixer le nombre de gagnants.
          </p>
        </div>

        <div>
          <Curseur label="Gagnants sur 100 trades" valeur={n} texte={`${n} sur 100`} min={0} max={100} pas={1}
            onChange={setN} aide={`Chaque perte coûte ${usd(risque)} (le risque). Chaque gain rapporte ${nb(ratio, 1)} fois plus : ${usd(risque * ratio)}.`} />

          {!vu ? (
            <div className="mt-3">
              <p className="mb-3 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>
                Placez le curseur sur le <b style={{ color: "var(--cap-ink)" }}>plus petit nombre de gagnants</b> qui, selon vous, ne fait pas perdre d'argent. Puis vérifiez.
              </p>
              <Bouton onClick={() => setVu(true)}>Vérifier</Bouton>
            </div>
          ) : (
            <>
              <Lignes>
                <Ligne label={`${n} gains de ${usd(risque * ratio)}`} valeur={`+ ${usd(gains)}`} couleur="var(--cap-up)" />
                <Ligne label={`${100 - n} pertes de ${usd(risque)}`} valeur={`− ${usd(pertes)}`} couleur="var(--cap-down)" />
                <Ligne label="Résultat des 100 trades" fort valeur={`${solde > 0 ? "+ " : solde < 0 ? "− " : ""}${usd(Math.abs(solde))}`}
                  couleur={solde > 0 ? "var(--cap-up)" : solde < 0 ? "var(--cap-down)" : undefined} />
              </Lignes>
              <Verdict ton={n === seuil ? "bien" : "neutre"}>
                {n === seuil ? "Exactement. " : n > seuil ? "Ça ne perd pas, mais on peut descendre plus bas. " : "Encore en perte. "}
                Avec 1 pour {nb(ratio, 1)}, le point mort tombe à {nb(pointMort, 1)} gagnants sur 100 :
                {Number.isInteger(pointMort) ? ` à ${seuil}, vous êtes à zéro, et au-delà, en gain.` : ` il faut ${seuil} gagnants pour finir au-dessus de zéro.`}
                {" "}La case cerclée d'ambre marque ce seuil. Frais non compris : ils le remontent un peu (leçons 16 et 21).
              </Verdict>
              <div className="mt-2"><BoutonLien onClick={() => setVu(false)}>Essayer un autre nombre</BoutonLien></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
