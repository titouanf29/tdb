"use client";

import { useState } from "react";
import { Bouton, BoutonLien, Verdict, lots, pct, usd, useCalme } from "./ElementsRisque";

/**
 * Vouloir se refaire : doubler la mise après chaque perte, contre garder la
 * même taille. Perte après perte, les deux comptes s'écartent : 1 + 2 + 4 + 8
 * = 15 % en quatre pertes, contre 4 %.
 */
const MAX = 6;

export function DoublerMise({ capital = 2000 }: { capital?: number }) {
  const calme = useCalme();
  const [k, setK] = useState(0);

  const double = Array.from({ length: MAX }, (_, i) => Math.pow(2, i));
  const fixe = Array.from({ length: MAX }, () => 1);
  const total = (l: number[]) => l.slice(0, k).reduce((a, v) => a + v, 0);
  const tD = total(double), tF = total(fixe);
  const echelle = 32; // la plus grosse perte, en %
  const transition = calme ? undefined : "width .45s cubic-bezier(.2,.8,.2,1)";

  const Barre = ({ v, couleur, visible }: { v: number; couleur: string; visible: boolean }) => (
    <div className="h-3.5 rounded-[3px]" style={{ width: visible ? `${Math.max(1.5, (v / echelle) * 100)}%` : "0%", backgroundColor: couleur, transition }} />
  );

  return (
    <div>
      <div className="grid grid-cols-[4.2rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-[0.88rem]">
        <span />
        <p className="font-semibold" style={{ color: "var(--cap-down)" }}>Doubler après chaque perte</p>
        <p className="font-semibold" style={{ color: "var(--cap-ink)" }}>Garder la même taille</p>
      </div>
      <ol className="mt-2 space-y-2.5" aria-label="Les pertes, une à une">
        {double.map((v, i) => {
          const visible = i < k;
          return (
            <li key={i} className="grid grid-cols-[4.2rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3" style={{ opacity: visible ? 1 : 0.35 }}>
              <span className="text-[0.86rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Perte {i + 1}</span>
              <div>
                <Barre v={v} couleur="var(--cap-down-fill)" visible={visible} />
                <p className="mt-0.5 text-[0.84rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>{pct(v)}, {usd((capital * v) / 100)} ({lots(0.1 * v)})</p>
              </div>
              <div>
                <Barre v={fixe[i]} couleur="var(--cap-ink-3)" visible={visible} />
                <p className="mt-0.5 text-[0.84rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }}>1 %, {usd(capital / 100)} (0,10 lot)</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid grid-cols-[4.2rem_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-3 border-t pt-3" style={{ borderColor: "var(--cap-line-strong)" }}>
        <span className="text-[0.86rem] italic" style={{ color: "var(--cap-ink-3)", fontFamily: "var(--cap-font-display)" }}>Total</span>
        <p className="text-[1.5rem] font-semibold tabular-nums" style={{ fontFamily: "var(--cap-font-display)", color: k ? "var(--cap-down)" : "var(--cap-ink)" }}>
          {k ? "−" : ""}{pct(tD)} <span className="text-[0.95rem] font-medium">({usd((capital * tD) / 100)})</span>
        </p>
        <p className="text-[1.5rem] font-semibold tabular-nums" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>
          {k ? "−" : ""}{pct(tF)} <span className="text-[0.95rem] font-medium">({usd((capital * tF) / 100)})</span>
        </p>
      </div>

      <Verdict ton={k >= 4 ? "mal" : "neutre"}>
        {k === 0 && "Chaque trade risque au départ 1 % (20 $, 0,10 lot avec un stop à 20 pips). Le stop est touché : que faites-vous au trade suivant ?"}
        {k > 0 && k < 4 && `${k} perte${k > 1 ? "s" : ""} : en doublant, ${pct(tD)} du compte est parti ; à taille égale, ${pct(tF)}. Le prochain trade doublé risquerait ${pct(double[k])}.`}
        {k === 4 && "Quatre pertes : 1 + 2 + 4 + 8 = 15 % du compte en doublant, contre 4 % à taille égale. Et la cinquième mise serait de 16 % à elle seule."}
        {k > 4 && `${k} pertes : ${pct(tD)} du compte en doublant, contre ${pct(tF)}. Une série de ${k} pertes n'a rien d'exceptionnel : elle arrive à tout le monde.`}
      </Verdict>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Bouton onClick={() => setK((x) => Math.min(MAX, x + 1))} disabled={k >= MAX}>{k === 0 ? "Première perte" : "Encore une perte"}</Bouton>
        {k > 0 && <BoutonLien onClick={() => setK(0)}>Recommencer</BoutonLien>}
      </div>
    </div>
  );
}
