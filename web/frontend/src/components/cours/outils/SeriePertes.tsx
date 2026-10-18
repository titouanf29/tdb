"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/cours/marche";
import { Bouton, BoutonLien, Choix, Ligne, Lignes, Verdict, pct, usd, useLargeur, useCalme } from "./ElementsRisque";

/**
 * Dix pertes de suite : à 1 % du capital par trade, puis à un risque plus
 * gros. La courbe du capital, et surtout le gain qu'il faut ensuite pour
 * revenir au point de départ.
 */
export function SeriePertes({ capital = 2000 }: { capital?: number }) {
  const reduce = useCalme();
  const { ref, w } = useLargeur();
  const [gros, setGros] = useState(10);
  const [k, setK] = useState(0);
  const anim = useRef<number | null>(null);

  useEffect(() => () => { if (anim.current) clearInterval(anim.current); }, []);

  const courbe = (r: number) => Array.from({ length: 11 }, (_, i) => capital * Math.pow(1 - r / 100, i));
  const petit = courbe(1);
  const grand = courbe(gros);
  const apres = (c: number[]) => ({ cap: c[k], baisse: (1 - c[k] / capital) * 100, retour: (capital / c[k] - 1) * 100 });
  const a1 = apres(petit), aG = apres(grand);

  const uneDePlus = () => setK((x) => Math.min(10, x + 1));
  const toutes = () => {
    if (anim.current) clearInterval(anim.current);
    if (reduce) { setK(10); return; }
    anim.current = window.setInterval(() => {
      setK((x) => {
        if (x >= 9 && anim.current) { clearInterval(anim.current); anim.current = null; }
        return Math.min(10, x + 1);
      });
    }, 180);
  };
  const recommencer = () => { if (anim.current) clearInterval(anim.current); anim.current = null; setK(0); };

  // Le dessin.
  const H = w < 520 ? 210 : 250;
  const g = 46, d = 16, h0 = 14, b0 = 30;
  const X = (i: number) => g + (i / 10) * (w - g - d);
  const Y = (v: number) => h0 + (1 - v / capital) * (H - h0 - b0);
  const chemin = (c: number[]) => c.slice(0, k + 1).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");

  return (
    <div>
      <Choix label="Comparer 1 % par trade avec" valeur={gros} onChange={(v) => setGros(v)}
        options={[2, 5, 10].map((r) => ({ v: r, texte: `${r} %` }))} />

      <div ref={ref} className="mt-2 w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" className="block"
          aria-label={`Courbe du capital après ${k} pertes : ${usd(a1.cap, 0)} à 1 %, ${usd(aG.cap, 0)} à ${gros} %`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={g} x2={w - d} y1={Y(capital * f)} y2={Y(capital * f)} stroke="var(--cap-line-chart)" />
              <text x={g - 6} y={Y(capital * f) + 4} textAnchor="end" fontSize="11.5" fill="var(--cap-ink-3)">{fmt(capital * f, 0)}</text>
            </g>
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontSize="11.5" fill="var(--cap-ink-3)">{i}</text>
          ))}
          <path d={chemin(petit)} fill="none" stroke="var(--cap-ink)" strokeWidth="2.4" strokeLinejoin="round" />
          <path d={chemin(grand)} fill="none" stroke="var(--cap-down)" strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx={X(k)} cy={Y(petit[k])} r="4.5" fill="var(--cap-ink)" stroke="var(--cap-surface)" strokeWidth="1.5" />
          <circle cx={X(k)} cy={Y(grand[k])} r="4.5" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="1.5" />
          {k > 0 && <text x={Math.min(X(k) + 8, w - d - 4)} y={Y(petit[k]) - 9} textAnchor={k > 7 ? "end" : "start"} fontSize="12" fontWeight="700" fill="var(--cap-ink)"
            stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">1 %</text>}
          {k > 0 && <text x={Math.min(X(k) + 8, w - d - 4)} y={Y(grand[k]) + 17} textAnchor={k > 7 ? "end" : "start"} fontSize="12" fontWeight="700" fill="var(--cap-down)"
            stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">{gros} %</text>}
        </svg>
        <p className="text-center text-[0.84rem]" style={{ color: "var(--cap-ink-3)" }}>Nombre de pertes de suite</p>
      </div>

      <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <Lignes>
          <Ligne label={`Pertes de suite`} valeur={`${k} sur 10`} />
          <Ligne label="Capital, à 1 % par trade" valeur={k ? `${usd(a1.cap, 0)} (−${pct(a1.baisse, 1)})` : usd(a1.cap, 0)} />
          <Ligne label={`Capital, à ${gros} % par trade`} valeur={k ? `${usd(aG.cap, 0)} (−${pct(aG.baisse, 1)})` : usd(aG.cap, 0)} couleur={k ? "var(--cap-down)" : undefined} />
        </Lignes>
        <Lignes>
          <Ligne label={`Pour revenir à ${usd(capital, 0)}, à 1 %`} valeur={k ? `+ ${pct(a1.retour, 1)}` : "rien"} />
          <Ligne label={`Pour revenir à ${usd(capital, 0)}, à ${gros} %`} fort valeur={k ? `+ ${pct(aG.retour, 1)}` : "rien"} couleur={k ? "var(--cap-down)" : undefined} />
        </Lignes>
      </div>

      <Verdict ton={k === 10 ? "mal" : "neutre"}>
        {k === 0
          ? `Le compte part de ${usd(capital, 0)}. Chaque perte retire un pourcentage du capital du moment. Faites perdre le compte, une fois, puis dix.`
          : k < 10
            ? `Après ${k} perte${k > 1 ? "s" : ""}, le compte à 1 % a perdu ${pct(a1.baisse, 1)}. À ${gros} %, ${pct(aG.baisse, 1)}.`
            : `Dix pertes à 1 % : environ ${pct(a1.baisse, 0)} du compte, et ${pct(a1.retour, 1)} de gain suffisent pour revenir. Dix pertes à ${gros} % : ${pct(aG.baisse, 0)} du compte, et il faudrait ensuite gagner ${pct(aG.retour, 0)} pour revenir à ${usd(capital, 0)}. Plus la chute est profonde, plus la remontée est longue.`}
      </Verdict>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Bouton onClick={uneDePlus} disabled={k >= 10}>Une perte de plus</Bouton>
        {k < 10 && <BoutonLien onClick={toutes}>Les dix d'un coup</BoutonLien>}
        {k > 0 && <BoutonLien onClick={recommencer}>Recommencer</BoutonLien>}
      </div>
    </div>
  );
}
