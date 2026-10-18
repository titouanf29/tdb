"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BoutonLien, Verdict, useCalme } from "./ElementsRisque";

/**
 * Les cinq bons réflexes, à cocher avant d'entrer, chacun avec les leçons qui
 * l'expliquent. Tant qu'une case manque, le trade n'est pas prêt.
 */
const REFLEXES = [
  { titre: "Mon stop loss est posé avant d'entrer.", detail: "Là où mon idée devient fausse, sous le dernier creux pour un achat.", lecons: "Leçons 7 et 14" },
  { titre: "Ma taille est calculée sur mon risque.", detail: "1 % du compte : 20 $ sur 2 000 $, divisés par ce que coûte le stop pour un lot.", lecons: "Leçons 17, 18 et 19" },
  { titre: "Après une perte, je garde la même taille, ou je fais une pause.", detail: "Pas de mise doublée pour se refaire.", lecons: "Leçons 7 et 11" },
  { titre: "J'ai un plan : où j'entre, où est mon stop, combien je risque.", detail: "Et pas d'annonce forte dans les minutes qui viennent. Le spread compté.", lecons: "Leçons 13, 15 et 16" },
  { titre: "Mon stop ne reculera pas.", detail: "Il peut se rapprocher pour protéger un gain, jamais s'éloigner.", lecons: "Leçons 7 et 15" },
];

export function ChecklistReflexes() {
  const calme = useCalme();
  const [coches, setCoches] = useState<boolean[]>(REFLEXES.map(() => false));
  const n = coches.filter(Boolean).length;
  const basculer = (i: number) => setCoches((c) => c.map((v, j) => (j === i ? !v : v)));

  return (
    <div>
      <ul className="divide-y" style={{ borderColor: "var(--cap-line)" }}>
        {REFLEXES.map((r, i) => (
          <li key={i} style={{ borderColor: "var(--cap-line)" }}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3">
              <input type="checkbox" className="peer sr-only" checked={coches[i]} onChange={() => basculer(i)} />
              <span aria-hidden className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-[6px] peer-focus-visible:ring-2"
                style={{
                  backgroundColor: coches[i] ? "var(--cap-ink)" : "transparent",
                  boxShadow: coches[i] ? "none" : "inset 0 0 0 1.5px var(--cap-line-strong)",
                  transition: calme ? undefined : "background-color .2s ease",
                }}>
                {coches[i] && <Check size={15} strokeWidth={3} style={{ color: "var(--cap-ambre)" }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[1rem] font-semibold leading-snug" style={{ color: "var(--cap-ink)" }}>
                  <span className="mr-1.5 italic" style={{ color: "#c98a1e", fontFamily: "var(--cap-font-display)" }}>{i + 1}.</span>{r.titre}
                </span>
                <span className="mt-0.5 block text-[0.92rem] leading-snug" style={{ color: "var(--cap-ink-2)" }}>
                  {r.detail} <span className="italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>{r.lecons}.</span>
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Verdict ton={n === REFLEXES.length ? "bien" : "neutre"}>
        {n === REFLEXES.length
          ? "Les cinq réflexes sont là : le trade peut partir. Cela ne garantit pas un gain. Cela garantit que, s'il y a une perte, ce sera celle que vous aviez décidée."
          : `${n} sur ${REFLEXES.length}. Tant qu'une case manque, le trade attend.`}
      </Verdict>
      {n > 0 && <div className="mt-1"><BoutonLien onClick={() => setCoches(REFLEXES.map(() => false))}>Tout décocher</BoutonLien></div>}
    </div>
  );
}
