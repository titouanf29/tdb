"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { serie } from "@/lib/cours/marche";
import { Choix, Lien, nb, signe, useAnimer, useLargeur } from "./ElementsMarches";
import { RotateCcw } from "lucide-react";

/**
 * Trois marchés sur la même échelle, en pourcentage : une semaine d'euro-dollar,
 * d'or et de Bitcoin (cours d'exemple, heure par heure). Sur un graphique
 * normal, chacun remplirait toute la hauteur ; ici, on voit enfin qui bouge
 * le plus.
 */

const COURBES = [
  { cle: "fx", nom: "Euro-dollar", couleur: "var(--cap-ocean)", ancres: [[0, 100], [30, 100.4], [60, 99.8], [90, 100.5], [119, 100.3]] as [number, number][], bruit: 0.0006, graine: 21 },
  { cle: "or", nom: "Or", couleur: "var(--cap-amber-ink)", ancres: [[0, 100], [25, 101.4], [50, 99.4], [80, 101.8], [100, 100.9], [119, 102.2]] as [number, number][], bruit: 0.0016, graine: 22 },
  { cle: "btc", nom: "Bitcoin", couleur: "var(--cap-ink)", ancres: [[0, 100], [20, 96.5], [45, 102.5], [70, 98.5], [95, 105.5], [119, 103]] as [number, number][], bruit: 0.0045, graine: 23 },
] as const;

type Cle = (typeof COURBES)[number]["cle"];

export function VolatiliteComparee() {
  const animer = useAnimer();
  const [boite, W] = useLargeur(600);
  const [focus, setFocus] = useState<Cle | "tous">("tous");
  const [progres, setProgres] = useState(1);
  const raf = useRef(0);

  const donnees = useMemo(() => COURBES.map((c) => {
    const s = serie(c.ancres, { graine: c.graine, bruit: c.bruit }).map((b) => b.c - 100);
    return { ...c, s, haut: Math.max(...s), bas: Math.min(...s) };
  }), []);

  const rejouer = () => {
    cancelAnimationFrame(raf.current);
    if (!animer) { setProgres(1); return; }
    const t0 = performance.now();
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / 2200);
      setProgres(f);
      if (f < 1) raf.current = requestAnimationFrame(pas);
    };
    raf.current = requestAnimationFrame(pas);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const H = W < 480 ? 240 : 290;
  const G = 8, D = 48, HAUT = 12, BAS = 24;
  const lo = -5, hi = 7;
  const x = (i: number) => G + (i / 119) * (W - G - D);
  const y = (v: number) => HAUT + (1 - (v - lo) / (hi - lo)) * (H - HAUT - BAS);
  const fin = Math.round(119 * progres);

  return (
    <div>
      <div ref={boite} className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" role="img" aria-label="Une semaine d'euro-dollar, d'or et de Bitcoin, en pourcentage, sur la même échelle">
          {[-4, -2, 0, 2, 4, 6].map((g) => (
            <g key={g}>
              <line x1={G} x2={W - D} y1={y(g)} y2={y(g)} stroke={g === 0 ? "var(--cap-line-strong)" : "var(--cap-line-chart)"} />
              <text x={W - D + 6} y={y(g) + 4} fontSize="11.5" fill="var(--cap-ink-3)">{signe(g)} %</text>
            </g>
          ))}
          {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((j, k) => (
            <text key={j} x={x(k * 24 + 12)} y={H - 6} fontSize="11" textAnchor="middle" fill="var(--cap-ink-3)">{j}</text>
          ))}
          {donnees.map((c) => {
            const estompe = focus !== "tous" && focus !== c.cle;
            const d = c.s.slice(0, fin + 1).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
            return (
              <g key={c.cle} opacity={estompe ? 0.15 : 1} style={{ transition: animer ? "opacity .3s ease" : undefined }}>
                <path d={d} fill="none" stroke={c.couleur} strokeWidth={focus === c.cle ? 2.6 : 1.8} strokeLinejoin="round" />
                {fin > 0 && <circle cx={x(fin)} cy={y(c.s[fin])} r="3" fill={c.couleur} />}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <Choix label="Regarder" valeur={focus} onChange={setFocus} petit
          options={[{ v: "tous", t: "Les trois" }, ...COURBES.map((c) => ({ v: c.cle as Cle, t: c.nom }))]} />
        <Lien onClick={rejouer}><RotateCcw size={15} aria-hidden /> Rejouer la semaine</Lien>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3" aria-live="polite">
        {donnees.map((c) => (
          <li key={c.cle} className="border-l-[3px] pl-3 text-[0.93rem] leading-snug" style={{ borderColor: c.couleur, color: "var(--cap-ink-2)", opacity: focus !== "tous" && focus !== c.cle ? 0.45 : 1 }}>
            <b style={{ color: "var(--cap-ink)" }}>{c.nom}</b> : <b className="tabular-nums" style={{ color: "var(--cap-ink)" }}>{nb(c.haut - c.bas, 1)} %</b> entre le plus haut et le plus bas de la semaine
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--cap-ink-3)" }}>Cours d&apos;exemple, dans des proportions réalistes. Une vraie semaine peut être plus calme, ou bien plus agitée.</p>
    </div>
  );
}
