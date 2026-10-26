"use client";

import { fmt } from "@/lib/cours/marche";
import { useState } from "react";
import { Curseur, Verdict, usd, useLargeur } from "./ElementsRisque";

/**
 * Le gap du week-end. Achat de 0,10 lot à 1,1000, stop à 1,0980 (20 $). Le
 * marché ferme le vendredi soir à 1,0995. L'élève choisit le prix de
 * réouverture du lundi : s'il tombe sous le stop, le stop part au premier
 * prix disponible, l'ouverture.
 */
const VENDREDI = [0, 4, 2, 6, 3, -1, 1, -3, -2, -6, -4, -5];
const STOP = -20;

export function GapStop() {
  const { ref, w } = useLargeur();
  const [ouverture, setOuverture] = useState(-30);

  const touche = ouverture <= STOP;
  const perte = touche ? -ouverture : 0;
  const lundi = [0, -2, 1, -3, -1, -4, -2].map((d) => ouverture + d);

  const H = w < 520 ? 220 : 250;
  const g = 10, d = 62, h0 = 12, b0 = 26;
  const lo = -64, hi = 26;
  const Y = (p: number) => h0 + ((hi - p) / (hi - lo)) * (H - h0 - b0);
  const larg = w - g - d;
  const xV = (i: number) => g + (i / (VENDREDI.length - 1)) * larg * 0.46;
  const x0W = g + larg * 0.49, x1W = g + larg * 0.63;
  const xL = (i: number) => g + larg * 0.66 + (i / (lundi.length - 1)) * larg * 0.34;
  const cheminV = VENDREDI.map((p, i) => `${i ? "L" : "M"}${xV(i).toFixed(1)},${Y(p).toFixed(1)}`).join("");
  const cheminL = lundi.map((p, i) => `${i ? "L" : "M"}${xL(i).toFixed(1)},${Y(p).toFixed(1)}`).join("");
  const prix = (p: number) => fmt(1.1 + p / 10000, 4);

  return (
    <div>
      <div ref={ref} className="w-full">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} className="block" role="img"
          aria-label={`Vendredi, clôture à ${prix(-5)}. Lundi, ouverture à ${prix(ouverture)}. Stop à 1,0980.`}>
          <rect x={x0W} y={h0} width={x1W - x0W} height={H - h0 - b0} fill="var(--cap-ink-3)" opacity="0.08" rx="4" />
          <text x={(x0W + x1W) / 2} y={H - 9} textAnchor="middle" fontSize="11.5" fontStyle="italic" fill="var(--cap-ink-3)" style={{ fontFamily: "var(--cap-font-display)" }}>week-end</text>
          <text x={xV(5)} y={H - 9} textAnchor="middle" fontSize="11.5" fill="var(--cap-ink-3)">vendredi</text>
          <text x={xL(3)} y={H - 9} textAnchor="middle" fontSize="11.5" fill="var(--cap-ink-3)">lundi</text>

          <line x1={g} x2={w - d} y1={Y(0)} y2={Y(0)} stroke="var(--cap-ink)" strokeWidth="1.4" />
          <text x={w - d + 6} y={Y(0) + 4} fontSize="11.5" fontWeight="700" fill="var(--cap-ink)">1,1000</text>
          <line x1={g} x2={w - d} y1={Y(STOP)} y2={Y(STOP)} stroke="var(--cap-down)" strokeWidth="2" />
          <text x={w - d + 6} y={Y(STOP) + 4} fontSize="11.5" fontWeight="700" fill="var(--cap-down)">1,0980</text>
          <text x={g + 4} y={Y(STOP) + 16} fontSize="12" fontWeight="700" fill="var(--cap-down)" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">Stop : 20 $ prévus</text>

          <path d={cheminV} fill="none" stroke="var(--cap-ink)" strokeWidth="2.2" strokeLinejoin="round" />
          <line x1={xV(VENDREDI.length - 1)} x2={xL(0)} y1={Y(-5)} y2={Y(ouverture)} stroke="var(--cap-ink-3)" strokeWidth="1.4" strokeDasharray="3 4" />
          <g>
            <path d={cheminL} fill="none" stroke={touche ? "var(--cap-ink-3)" : "var(--cap-ink)"} strokeWidth="2.2" strokeLinejoin="round" strokeDasharray={touche ? "4 3" : undefined} />
            <circle cx={xL(0)} cy={Y(ouverture)} r="5" fill={touche ? "var(--cap-down)" : "var(--cap-ambre)"} stroke="var(--cap-surface)" strokeWidth="1.5" />
            <text x={Math.min(xL(0) + 4, w - d - 4)} textAnchor={w < 520 ? "end" : "start"} y={Y(ouverture) + (ouverture < -45 ? -12 : 20)} fontSize="12" fontWeight="700" fill={touche ? "var(--cap-down)" : "var(--cap-ink)"}
              stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">
              {touche ? `Exécuté à ${prix(ouverture)}` : `Ouverture ${prix(ouverture)}`}
            </text>
          </g>
          {touche && (
            <rect x={xL(0) - 5} width="10" y={Y(STOP)} height={Math.max(0, Y(ouverture) - Y(STOP))} fill="var(--cap-down)" opacity="0.25" />
          )}
        </svg>
      </div>

      <Curseur label="Prix d'ouverture du lundi" valeur={ouverture} texte={prix(ouverture)} min={-60} max={20} pas={1} onChange={setOuverture}
        aide="Le vendredi, le marché a fermé à 1,0995. Pendant le week-end, une nouvelle est tombée." />
      <Verdict ton={touche ? "mal" : "neutre"}>
        {!touche
          ? `Le lundi, le prix rouvre à ${prix(ouverture)}, au-dessus du stop : rien ne se passe à l'ouverture. Le stop reste en place, à 20 $.`
          : ouverture === STOP
            ? "Le prix rouvre pile sur le stop : il part à 1,0980, perte de 20 $, comme prévu."
            : `Le prix rouvre à ${prix(ouverture)}, sans passer par 1,0980. Le stop part au premier prix disponible : perte de ${usd(perte)} au lieu de 20 $, soit ${usd(perte - 20)} de slippage.`}
      </Verdict>
    </div>
  );
}
