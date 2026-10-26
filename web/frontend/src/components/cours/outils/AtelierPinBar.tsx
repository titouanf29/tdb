"use client";

import { useState } from "react";
import { ChoixSignal, CurseurSignal, LienSignal, nf, useCalmeSignal } from "./ElementsSignaux";

/**
 * L'atelier de la pin bar : on règle la mèche du haut, le corps, la mèche du
 * bas et la couleur, et l'outil dit si la bougie est une pin bar (une mèche
 * d'au moins les deux tiers de la bougie), un marteau ou une étoile filante.
 * La bougie est découpée en trois tiers pour voir le seuil.
 */
const MODELES: { nom: string; v: [number, number, number]; hausse: boolean }[] = [
  { nom: "Un marteau", v: [3, 4, 18], hausse: true },
  { nom: "Une étoile filante", v: [17, 4, 3], hausse: false },
  { nom: "Une mèche trop courte", v: [3, 9, 10], hausse: true },
  { nom: "Deux longues mèches", v: [14, 3, 14], hausse: false },
];

export function AtelierPinBar() {
  const calme = useCalmeSignal();
  const [haut, setHaut] = useState(3);
  const [corps, setCorps] = useState(4);
  const [bas, setBas] = useState(18);
  const [hausse, setHausse] = useState(0);

  const total = haut + corps + bas;
  const pHaut = haut / total, pBas = bas / total;
  const seuil = 2 / 3;
  const verdict = pBas >= seuil ? "marteau" : pHaut >= seuil ? "etoile" : "non";
  const plusLongue = Math.max(pHaut, pBas);

  // Le dessin : une échelle fixe, pour que la bougie grandisse vraiment.
  const H = 300, W = 300;
  const k = (H - 40) / Math.max(36, total);
  const cy = H / 2;
  const top = cy - (total * k) / 2;
  const yCorpsHaut = top + haut * k;
  const yCorpsBas = yCorpsHaut + corps * k;
  const yBas = yCorpsBas + bas * k;
  const cx = 110, larg = 46;
  const col = hausse === 0 ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
  const tiers = [top + (total * k) / 3, top + (2 * total * k) / 3];
  const transition = calme ? undefined : "all .25s ease";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
        <span className="mr-1 text-[0.94rem]" style={{ color: "var(--cap-ink-2)" }}>Modèles :</span>
        {MODELES.map((m) => (
          <LienSignal key={m.nom} onClick={() => { setHaut(m.v[0]); setCorps(m.v[1]); setBas(m.v[2]); setHausse(m.hausse ? 0 : 1); }}>{m.nom}</LienSignal>
        ))}
      </div>
      <div className="mt-2 grid items-center gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="mx-auto block max-w-[300px]" role="img"
          aria-label={`Une bougie : mèche du haut ${haut} pips, corps ${corps} pips, mèche du bas ${bas} pips`}>
          {/* Les trois tiers */}
          <rect x={cx - 70} width={140} y={top} height={total * k} fill="var(--cap-surface-2)" rx="6" style={{ transition }} />
          {tiers.map((t, j) => (
            <line key={j} x1={cx - 70} x2={cx + 70} y1={t} y2={t} stroke="var(--cap-line-strong)" strokeDasharray="4 4" style={{ transition }} />
          ))}
          <text x={cx - 64} y={top + 14} fontSize="11" fill="var(--cap-ink-3)" style={{ transition }}>1<tspan dy="-4" fontSize="8">er</tspan><tspan dy="4"> tiers</tspan></text>
          <text x={cx - 64} y={tiers[1] + 14} fontSize="11" fill="var(--cap-ink-3)" style={{ transition }}>3<tspan dy="-4" fontSize="8">e</tspan><tspan dy="4"> tiers</tspan></text>
          {/* La bougie */}
          <line x1={cx} x2={cx} y1={top} y2={yBas} stroke={col} strokeWidth="4" strokeLinecap="round" style={{ transition }} />
          <rect x={cx - larg / 2} width={larg} y={yCorpsHaut} height={Math.max(2, corps * k)} fill={col} rx="3" style={{ transition }} />
          {/* Les mesures, à droite */}
          {(() => {
            const segs = [
              { y0: top, y1: yCorpsHaut, t: `${haut} pips`, p: pHaut, fort: verdict === "etoile" },
              { y0: yCorpsHaut, y1: yCorpsBas, t: `corps ${corps}`, p: corps / total, fort: false },
              { y0: yCorpsBas, y1: yBas, t: `${bas} pips`, p: pBas, fort: verdict === "marteau" },
            ];
            // Des étiquettes qui ne se chevauchent pas : au moins 15 px entre deux.
            const ys: number[] = [];
            segs.forEach((m, j) => {
              let yy = (m.y0 + m.y1) / 2 + 4;
              if (j > 0 && yy - ys[j - 1] < 15) yy = ys[j - 1] + 15;
              ys.push(yy);
            });
            return segs.map((m, j) => (
              <g key={j} style={{ transition }}>
                {m.y1 - m.y0 >= 2 && <line x1={cx + 80} x2={cx + 80} y1={m.y0 + 1} y2={m.y1 - 1} stroke={m.fort ? "var(--cap-ambre)" : "var(--cap-ink-3)"} strokeWidth={m.fort ? 3 : 1.5} />}
                <line x1={cx + 75} x2={cx + 85} y1={m.y0 + 1} y2={m.y0 + 1} stroke="var(--cap-ink-3)" />
                <text x={cx + 92} y={ys[j]} fontSize="12" fontWeight={m.fort ? 700 : 500} fill={m.fort ? "var(--cap-amber-ink)" : "var(--cap-ink-2)"}>
                  {m.t} ({Math.round(m.p * 100)} %)
                </text>
              </g>
            ));
          })()}
        </svg>
        <div>
          <div className="grid gap-y-1">
            <CurseurSignal label="Mèche du haut" valeur={haut} min={0} max={40} onChange={setHaut} ecrire={(v) => `${v} pips`} />
            <CurseurSignal label="Corps" valeur={corps} min={1} max={30} onChange={setCorps} ecrire={(v) => `${v} pips`} />
            <CurseurSignal label="Mèche du bas" valeur={bas} min={0} max={40} onChange={setBas} ecrire={(v) => `${v} pips`} />
          </div>
          <p className="mt-2 mb-1 text-[0.94rem]" style={{ color: "var(--cap-ink-2)" }}>La couleur du corps</p>
          <ChoixSignal label="La couleur du corps" options={["Haussière (verte)", "Baissière (rouge)"]} valeur={hausse} onChange={setHausse} />
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-[1rem] leading-relaxed" style={{ color: "var(--cap-ink-2)" }}>
        {verdict === "marteau" && <><b style={{ color: "var(--cap-up)" }}>Un marteau, une pin bar haussière.</b> La mèche du bas fait {Math.round(pBas * 100)} % de la bougie (au moins 67 % : les deux tiers). Le prix est descendu de {bas} pips, puis il a été ramené en haut : le bas a été refusé.</>}
        {verdict === "etoile" && <><b style={{ color: "var(--cap-down)" }}>Une étoile filante, une pin bar baissière.</b> La mèche du haut fait {Math.round(pHaut * 100)} % de la bougie. Le prix est monté de {haut} pips, puis il a été ramené en bas : le haut a été refusé.</>}
        {verdict === "non" && <><b style={{ color: "var(--cap-ink)" }}>Pas une pin bar.</b> La plus longue mèche ne fait que {Math.round(plusLongue * 100)} % de la bougie : il en faut au moins les deux tiers (67 %).{pHaut > 0.35 && pBas > 0.35 ? " Deux longues mèches : le prix a été refusé des deux côtés, la bougie hésite, elle ne dit pas non." : ""}</>}
        {verdict !== "non" && <> Changez la couleur : le verdict ne bouge pas. <b>C'est la mèche qui compte</b>, pas la couleur.</>}
        {" "}<span style={{ color: "var(--cap-ink-3)" }}>Bougie de {total} pips au total, {nf((corps / total) * 100, 0)} % de corps.</span>
      </p>
    </div>
  );
}
