"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BoutonTenir, ChiffreTenir, ResultatTenir, dollars, useAnimeTenir, useLargeur } from "./ElementsTenir";

/**
 * La courbe du capital d'un backtest, position après position. On recule de
 * 3 à 50 positions : au début, trois gains d'affilée ressemblent à une
 * méthode ; à cinquante, frais compris, l'idée perd 30 $. Avant les frais :
 * +20 $ (17 gains de 40 $, 33 pertes de 20 $) ; 1 $ de frais par position.
 */

const SUITE = "WWWLLWLLLWLLWLWLLLWLLWLLLWLWLLLWLLWLLLWLWLLLWLLWLL";
const GAIN = 40, PERTE = 20, FRAIS = 1;

export function CourbeCapital() {
  const anime = useAnimeTenir();
  const [boite, W] = useLargeur();
  const [nb, setNb] = useState(3);
  const [avecFrais, setAvecFrais] = useState(true);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  /** La caméra recule (ou avance) doucement jusqu'à k positions. */
  const aller = (k: number) => {
    cancelAnimationFrame(raf.current);
    if (!anime) { setNb(k); return; }
    const depart = nb, t0 = performance.now(), duree = Math.min(1600, 40 * Math.abs(k - depart) + 200);
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / duree);
      const e = 1 - Math.pow(1 - f, 3);
      setNb(Math.round(depart + (k - depart) * e));
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
  };

  const { brut, net } = useMemo(() => {
    const b = [0], nt = [0];
    for (const c of SUITE) {
      const r = c === "W" ? GAIN : -PERTE;
      b.push(b[b.length - 1] + r);
      nt.push(nt[nt.length - 1] + r - FRAIS);
    }
    return { brut: b, net: nt };
  }, []);

  const H = W < 520 ? 220 : 260;
  const G = 8, D = 54, HAUT = 14, BAS = 26;
  const vis = (avecFrais ? [...brut.slice(0, nb + 1), ...net.slice(0, nb + 1)] : brut.slice(0, nb + 1));
  const lo = Math.min(-10, ...vis), hi = Math.max(10, ...vis);
  const pad = (hi - lo) * 0.1;
  const X = (i: number) => G + (i / nb) * (W - G - D);
  const Y = (v: number) => HAUT + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - HAUT - BAS);
  const chemin = (s: number[]) => s.slice(0, nb + 1).map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const fin = avecFrais ? net[nb] : brut[nb];
  const pasY = (hi - lo) > 80 ? 50 : (hi - lo) > 40 ? 20 : 10;
  const grads: number[] = [];
  for (let v = Math.ceil((lo - pad) / pasY) * pasY; v <= hi + pad; v += pasY) grads.push(v);
  const gains = SUITE.slice(0, nb).split("").filter((c) => c === "W").length;

  return (
    <div>
      <div ref={boite}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Courbe du capital après ${nb} positions`}>
          {grads.map((v) => (
            <g key={v}>
              <line x1={G} x2={W - D} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? "var(--cap-line-strong)" : "var(--cap-line-chart)"} strokeWidth={v === 0 ? 1.5 : 1} />
              <text x={W - D + 6} y={Y(v) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{v > 0 ? "+" : v < 0 ? "−" : ""}{Math.abs(v)} $</text>
            </g>
          ))}
          <text x={G} y={H - 8} fontSize="11.5" fill="var(--cap-ink-3)">position 0</text>
          <text x={W - D} y={H - 8} fontSize="11.5" fill="var(--cap-ink-3)" textAnchor="end">position {nb}</text>
          <path d={chemin(brut)} fill="none" stroke={avecFrais ? "var(--cap-ink-3)" : "var(--cap-ink)"} strokeWidth={avecFrais ? 1.6 : 2.4} strokeDasharray={avecFrais ? "5 4" : undefined} strokeLinejoin="round" />
          {avecFrais && <path d={chemin(net)} fill="none" stroke="var(--cap-ink)" strokeWidth="2.4" strokeLinejoin="round" />}
          <circle cx={X(nb)} cy={Y(fin)} r="5" fill={fin < 0 ? "var(--cap-down)" : "var(--cap-up)"} stroke="var(--cap-surface)" strokeWidth="2" />
          {avecFrais && nb >= 10 && (
            <text x={X(nb) - 8} y={Y(brut[nb]) - 10} fontSize="11.5" fontWeight="600" fill="var(--cap-ink-3)" textAnchor="end" stroke="var(--cap-surface)" strokeWidth="3" paintOrder="stroke">avant frais</text>
          )}
        </svg>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="courbe-nb" className="flex-none text-[0.95rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{nb} positions</label>
        <input id="courbe-nb" type="range" min={3} max={50} value={nb} onChange={(e) => { cancelAnimationFrame(raf.current); setNb(Number(e.target.value)); }}
          className="h-11 min-w-0 flex-1" style={{ accentColor: "var(--cap-ambre)" }} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {[3, 10, 25].map((k) => (
          <button key={k} type="button" onClick={() => aller(k)} aria-pressed={nb === k}
            className="min-h-11 rounded-[10px] px-3 text-[0.95rem]"
            style={{ color: "var(--cap-ink)", fontWeight: nb === k ? 700 : 500, textDecorationLine: nb === k ? "underline" : "none", textDecorationColor: "var(--cap-ambre)", textDecorationThickness: 2, textUnderlineOffset: 6 }}>
            {k}
          </button>
        ))}
        <BoutonTenir onClick={() => aller(50)}>Reculer à 50 positions</BoutonTenir>
        <label className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-2 text-[0.95rem]" style={{ color: "var(--cap-ink-2)" }}>
          <input type="checkbox" checked={avecFrais} onChange={(e) => setAvecFrais(e.target.checked)} className="h-5 w-5" style={{ accentColor: "var(--cap-ambre)" }} />
          Frais compris
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <ChiffreTenir valeur={`${gains} / ${nb}`} legende="positions gagnantes" />
        <ChiffreTenir valeur={dollars(brut[nb])} legende="avant frais" />
        <ChiffreTenir valeur={dollars(-nb * FRAIS)} legende={`de frais (${FRAIS} $ × ${nb})`} />
        <ChiffreTenir valeur={dollars(net[nb])} legende="net" couleur={net[nb] < 0 ? "var(--cap-down)" : undefined} />
      </div>
      <ResultatTenir className="mt-3">
        {nb <= 5
          ? `Après ${nb} positions, ${dollars(net[nb])} net : on croirait tenir une méthode. Reculez.`
          : nb < 50
            ? `Après ${nb} positions, ${dollars(net[nb])} net. La courbe ne monte plus ; les frais grignotent un peu, position après position.`
            : "Cinquante positions : +20 $ avant les frais, mais 50 $ de frais, soit −30 $ au total. L'idée ne passe pas. Les trois premiers gains n'étaient qu'un coup de chance."}
      </ResultatTenir>
    </div>
  );
}
