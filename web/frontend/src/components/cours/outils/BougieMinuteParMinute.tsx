"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { fmt, hasard } from "@/lib/cours/marche";
import { CurseurLire, useAnimLire, useLargeurLire } from "./ElementsLire";

/**
 * Une bougie d'une heure qui se forme, minute par minute : à gauche le prix
 * minute après minute, à droite la bougie qui suit. Le plus haut et le plus bas
 * ne reviennent jamais en arrière : ce sont eux qui laissent les mèches.
 */

const OUV = 4000;
const ANCRES: [number, number][] = [[0, 4000], [6, 4004], [15, 4019], [22, 4007], [30, 3996], [38, 3982], [46, 3995], [53, 4003], [60, 4010]];

function chemin() {
  const r = hasard(303);
  const out: number[] = [];
  for (let m = 0; m <= 60; m++) {
    const k = ANCRES.findIndex(([t]) => t >= m);
    const [t1, p1] = ANCRES[k];
    const [t0, p0] = ANCRES[Math.max(0, k - 1)];
    const base = t1 === t0 ? p1 : p0 + ((p1 - p0) * (m - t0)) / (t1 - t0);
    const pres = ANCRES.some(([t]) => t === m);
    out.push(pres ? base : base + (r() - 0.5) * 5);
  }
  return out;
}

export function BougieMinuteParMinute() {
  const prix = useMemo(chemin, []);
  const [m, setM] = useState(0);
  const [lecture, setLecture] = useState(false);
  const reduce = !useAnimLire();
  const [ref, W] = useLargeurLire();

  useEffect(() => {
    if (!lecture) return;
    const id = setInterval(() => {
      setM((v) => {
        const n = Math.min(60, v + (reduce ? 10 : 1));
        if (n >= 60) setLecture(false);
        return n;
      });
    }, reduce ? 900 : 220);
    return () => clearInterval(id);
  }, [lecture, reduce]);

  const vus = prix.slice(0, m + 1);
  const h = Math.max(...vus), l = Math.min(...vus), c = vus[vus.length - 1];
  const verte = c >= OUV;
  const col = verte ? "var(--cap-up-fill)" : "var(--cap-down-fill)";
  const H = 250, top = 14, bas = H - 26;
  const lo = 3972, hi = 4026;
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (bas - top);
  const xC = W - 70;
  const largeurLigne = xC - 70;
  const x = (t: number) => 8 + (t / 60) * largeurLigne;
  const d = vus.map((v, t) => `${t ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const fini = m >= 60;

  let phrase: string;
  if (m === 0) phrase = "Minute 0 : la bougie s'ouvre à 4 000 $. Pour l'instant, ce n'est qu'un trait.";
  else if (fini) phrase = `L'heure est finie : la bougie se fige. Ouverture 4 000 $, plus haut ${fmt(h, 0)} $, plus bas ${fmt(l, 0)} $, clôture ${fmt(c, 0)} $. Une bougie verte avec deux mèches : les deux camps ont attaqué, les acheteurs ont fini devant.`;
  else if (m <= 15) phrase = `Le prix monte : la bougie est verte, et son plus haut grimpe avec lui (${fmt(h, 0)} $).`;
  else if (c >= OUV) phrase = `Le prix redescend depuis ${fmt(h, 0)} $. Le plus haut reste marqué : l'écart entre le haut du corps et ce plus haut devient la mèche haute.`;
  else if (m <= 40) phrase = "Le prix passe sous l'ouverture : la bougie devient rouge. Si l'heure finissait maintenant, les vendeurs auraient gagné.";
  else phrase = `Les acheteurs reviennent depuis ${fmt(l, 0)} $. Le plus bas reste marqué : il laissera une mèche basse, quoi qu'il arrive.`;

  return (
    <div>
      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Minute ${m} sur 60 : prix ${fmt(c, 0)} dollars`}>
          <line x1={x(0)} x2={xC + 30} y1={y(OUV)} y2={y(OUV)} stroke="var(--cap-line-strong)" strokeDasharray="3 3" />
          <text x={xC - 26} y={y(OUV) + 15} textAnchor="end" fontSize="11.5" fill="var(--cap-ink-3)">ouverture 4 000</text>
          {m > 0 && <>
            <line x1={x(prix.indexOf(h))} x2={xC} y1={y(h)} y2={y(h)} stroke="var(--cap-amber-ink)" strokeDasharray="2 3" />
            <line x1={x(prix.indexOf(l))} x2={xC} y1={y(l)} y2={y(l)} stroke="var(--cap-amber-ink)" strokeDasharray="2 3" />
          </>}
          <path d={d} fill="none" stroke="var(--cap-ink)" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx={x(m)} cy={y(c)} r="4" fill="var(--cap-ambre)" />
          <line x1={xC} x2={xC} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="2.5" />
          <rect x={xC - 17} width={34} y={Math.min(y(OUV), y(c))} height={Math.max(2, Math.abs(y(OUV) - y(c)))} fill={col} rx="2" />
          <text x={xC + 22} y={y(h) + 4} fontSize="11.5" fill="var(--cap-ink-2)" className="tabular-nums">{fmt(h, 0)}</text>
          {Math.abs(y(l) - y(h)) > 14 && <text x={xC + 22} y={y(l) + 4} fontSize="11.5" fill="var(--cap-ink-2)" className="tabular-nums">{fmt(l, 0)}</text>}
          <text x={x(0)} y={H - 6} fontSize="11.5" fill="var(--cap-ink-3)">minute 0</text>
          <text x={x(60)} y={H - 6} fontSize="11.5" textAnchor="end" fill="var(--cap-ink-3)">minute 60</text>
          <text x={xC} y={H - 6} fontSize="11.5" textAnchor="middle" fontWeight="600" fill="var(--cap-ink-2)">la bougie</text>
        </svg>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <button type="button" onClick={() => { if (fini) setM(0); setLecture((v) => !v); }}
          aria-label={lecture ? "Pause" : fini ? "Revoir depuis le début" : "Lecture"}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--cap-ink)", color: "var(--cap-on-inverse)" }}>
          {lecture ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <CurseurLire label="Le temps" valeur={m} min={0} max={60} onChange={(v) => { setLecture(false); setM(v); }} ecrire={(v) => `minute ${v}`} />
        </div>
      </div>
      <p aria-live={lecture ? "off" : "polite"} className="mt-2 min-h-[3.2em] text-[1rem] leading-snug" style={{ color: "var(--cap-ink)" }}>{phrase}</p>
    </div>
  );
}
