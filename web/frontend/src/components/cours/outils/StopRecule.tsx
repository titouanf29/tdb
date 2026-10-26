"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/cours/marche";
import { Bouton, BoutonLien, Curseur, Verdict, usd, useCalme, useLargeur } from "./ElementsRisque";

/**
 * Le stop reculé. Le prix s'approche du stop : l'élève peut le laisser, le
 * rapprocher ou l'éloigner, et lit son risque changer. Puis la suite se joue.
 * 0,10 lot sur l'euro-dollar : 1 pip = 1 $.
 */
const AVANT = [0, -2, 1, -3, -5, -4, -7, -6, -9, -8, -11, -12];
const APRES = [-14, -17, -16, -21, -25, -23, -29, -34, -31, -38, -44, -41, -48, -53, -50, -57, -62, -65, -61, -58, -55, -52, -50];
const CHEMIN = [...AVANT, ...APRES];
const PREVU = 20;

export function StopRecule() {
  const calme = useCalme();
  const { ref, w } = useLargeur();
  const [stop, setStop] = useState(PREVU);
  const [vu, setVu] = useState(AVANT.length - 1);
  const anim = useRef(0);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const joue = vu > AVANT.length - 1;
  const fini = vu === CHEMIN.length - 1;
  const iTouche = CHEMIN.findIndex((p, i) => i >= AVANT.length && p <= -stop);

  const jouer = () => {
    const fin = CHEMIN.length - 1, depart = AVANT.length - 1;
    if (calme) { setVu(fin); return; }
    const t0 = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / 2200);
      setVu(Math.round(depart + (fin - depart) * f));
      if (f < 1) anim.current = requestAnimationFrame(pas);
    };
    anim.current = requestAnimationFrame(pas);
  };
  const recommencer = () => { cancelAnimationFrame(anim.current); setVu(AVANT.length - 1); setStop(PREVU); };

  // Le dessin : en pips sous l'entrée.
  const H = w < 520 ? 220 : 260;
  const g = 10, d = 64, h0 = 12, b0 = 12;
  const lo = -70, hi = 6;
  const X = (i: number) => g + (i / (CHEMIN.length - 1)) * (w - g - d);
  const Y = (p: number) => h0 + ((hi - p) / (hi - lo)) * (H - h0 - b0);
  const fin = iTouche >= 0 && vu >= iTouche ? iTouche : vu;
  const trace = CHEMIN.slice(0, fin + 1).map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join("");
  const prix = (p: number) => fmt(1.1 + p / 10000, 4);

  const ton = stop > PREVU ? "mal" : stop < PREVU ? "bien" : "neutre";
  let avis = "";
  if (!joue) {
    if (stop === PREVU) avis = `Le prix s'approche de votre stop, à ${prix(-PREVU)}. Votre risque : ${usd(PREVU)}, 1 % du compte, décidé avant d'entrer. Que faites-vous ?`;
    else if (stop < PREVU) avis = `Vous rapprochez le stop à ${prix(-stop)} : votre risque baisse à ${usd(stop)}. C'est permis : un stop peut se rapprocher.`;
    else avis = `Vous reculez le stop à ${prix(-stop)} : votre risque passe de ${usd(PREVU)} à ${usd(stop)}, ${(stop / PREVU).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} fois ce que vous aviez décidé. Sans l'avoir décidé à froid.`;
  }
  let suite = "";
  if (fini && iTouche >= 0) {
    suite = stop > PREVU
      ? `Le prix a continué. Votre stop reculé est touché à ${prix(-stop)} : perte de ${usd(stop)} au lieu de ${usd(PREVU)}. Reculer n'a pas évité la perte, il l'a agrandie.`
      : stop === PREVU
        ? `Le stop est touché à ${prix(-PREVU)} : perte de ${usd(PREVU)}, exactement celle que vous aviez prévue. Le prix a continué de baisser bien plus bas : vous êtes dehors.`
        : `Le stop rapproché est touché à ${prix(-stop)} : perte de ${usd(stop)}, moins que prévu. Le prix a continué bien plus bas.`;
  }

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} className="block" role="img"
          aria-label={`Achat à 1,1000, stop à ${prix(-stop)}, le prix est à ${prix(CHEMIN[fin])}`}>
          <line x1={g} x2={w - d} y1={Y(0)} y2={Y(0)} stroke="var(--cap-ink)" strokeWidth="1.5" />
          <text x={w - d + 6} y={Y(0) + 4} fontSize="11.5" fontWeight="700" fill="var(--cap-ink)">1,1000</text>
          {stop !== PREVU && (
            <g>
              <line x1={g} x2={w - d} y1={Y(-PREVU)} y2={Y(-PREVU)} stroke="var(--cap-ink-3)" strokeDasharray="5 4" />
              <text x={g + 4} y={Y(-PREVU) - 6} fontSize="11.5" fill="var(--cap-ink-3)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Stop prévu</text>
            </g>
          )}
          <rect x={g} width={w - g - d} y={Y(0)} height={Y(-stop) - Y(0)} fill="var(--cap-down)" opacity={stop > PREVU ? 0.14 : 0.08} />
          <line x1={g} x2={w - d} y1={Y(-stop)} y2={Y(-stop)} stroke="var(--cap-down)" strokeWidth="2" />
          <text x={w - d + 6} y={Y(-stop) + 4} fontSize="11.5" fontWeight="700" fill="var(--cap-down)">{prix(-stop)}</text>
          <text x={g + 4} y={Y(-stop) + 16} fontSize="12" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">
            Votre stop : {usd(stop)} de risque
          </text>
          <text x={w - d + 6} y={Y(-60) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{prix(-60)}</text>
          <path d={trace} fill="none" stroke="var(--cap-ink)" strokeWidth="2.2" strokeLinejoin="round" />
          {!fini && <circle cx={X(fin)} cy={Y(CHEMIN[fin])} r="4.5" fill="var(--cap-ambre)" stroke="var(--cap-surface)" strokeWidth="1.5" />}
          {fini && iTouche >= 0 && (
            <path d={`M${X(iTouche) - 6},${Y(-stop) - 6} l12,12 M${X(iTouche) + 6},${Y(-stop) - 6} l-12,12`} stroke="var(--cap-down)" strokeWidth="2.6" />
          )}
          {fini && iTouche >= 0 && (
            <path d={CHEMIN.slice(iTouche).map((p, j) => `${j ? "L" : "M"}${X(iTouche + j).toFixed(1)},${Y(p).toFixed(1)}`).join("")}
              fill="none" stroke="var(--cap-ink-3)" strokeWidth="1.6" strokeDasharray="3 3" />
          )}
        </svg>
      </div>

      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
        <Curseur label="Votre stop, sous l'entrée" valeur={stop} texte={`${stop} pips, ${usd(stop)}`} min={13} max={60} pas={1}
          onChange={(v) => { if (!joue) setStop(v); }}
          aide={joue ? "Le trade est joué : recommencez pour déplacer le stop." : "À gauche, vous le rapprochez ; à droite, vous le reculez."} />
        <div>
          {avis && <Verdict ton={ton}>{avis}</Verdict>}
          {suite && <Verdict ton={stop > PREVU ? "mal" : "neutre"}>{suite}</Verdict>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {!joue && <Bouton onClick={jouer}>Voir la suite</Bouton>}
        {(joue || stop !== PREVU) && <BoutonLien onClick={recommencer}>Recommencer</BoutonLien>}
      </div>
    </div>
  );
}
