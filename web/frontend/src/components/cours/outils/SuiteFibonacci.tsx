"use client";

import { useMemo, useState } from "react";
import { BoutonSignal, RecommencerSignal, nf, useCalmeSignal, useLargeurSignal } from "./ElementsSignaux";

/**
 * La suite de Fibonacci qui se construit, un nombre à la fois (chaque nombre
 * est la somme des deux d'avant), et le rapport entre deux voisins qui se
 * rapproche du nombre d'or, 1,618. En touchant un nombre, on voit d'où
 * sortent 61,8 %, 38,2 % et 23,6 %.
 */
const SUITE = (() => {
  const s = [0, 1];
  while (s.length < 26) s.push(s[s.length - 1] + s[s.length - 2]);
  return s;
})();
const OR = (1 + Math.sqrt(5)) / 2;

export function SuiteFibonacci() {
  const calme = useCalmeSignal();
  const [nb, setNb] = useState(8);
  const [choisi, setChoisi] = useState<number | null>(null);
  const { ref, w } = useLargeurSignal(520);
  const max = 20;
  const sel = choisi != null && choisi < nb ? choisi : nb - 1;
  const v = SUITE[sel];

  // Les rapports « un nombre divisé par celui d'avant », à partir de 1 ÷ 1.
  const rapports = useMemo(() => SUITE.slice(2, nb).map((x, k) => x / SUITE[k + 1]), [nb]);

  const H = 150, G = 34, D = 10;
  const iw = w - G - D;
  const lo = 0.9, hi = 2.1;
  const y = (r: number) => 10 + (1 - (r - lo) / (hi - lo)) * (H - 30);
  const x = (k: number) => G + (rapports.length <= 1 ? iw / 2 : (k / (max - 3)) * iw);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="La suite de Fibonacci">
        {SUITE.slice(0, nb).map((n, k) => {
          const actif = k === sel;
          const nouveau = k === nb - 1 && nb > 8;
          return (
            <button key={k} type="button" role="listitem" onClick={() => setChoisi(k)} aria-pressed={actif}
              aria-label={`${nf(n)}${k >= 2 ? `, la somme de ${nf(SUITE[k - 2])} et ${nf(SUITE[k - 1])}` : ""}`}
              className="relative min-h-11 min-w-11 rounded-[8px] px-2.5 text-[1rem] tabular-nums transition-colors hover:bg-[color:var(--cap-surface-2)]"
              style={{
                color: "var(--cap-ink)", fontWeight: actif ? 700 : 500,
                animation: nouveau && !calme ? "cap-fibo-entre .45s ease-out" : undefined,
              }}>
              {nf(n)}
              <span aria-hidden className="absolute bottom-1 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: "var(--cap-ambre)", opacity: actif ? 1 : 0 }} />
            </button>
          );
        })}
      </div>
      <style>{"@keyframes cap-fibo-entre { from { opacity: 0; transform: translateY(6px) scale(.9); } to { opacity: 1; transform: none; } }"}</style>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BoutonSignal onClick={() => { setNb(Math.min(max, nb + 1)); setChoisi(null); }} disabled={nb >= max}>
          Ajouter le suivant
        </BoutonSignal>
        {nb > 8 && <RecommencerSignal onClick={() => { setNb(8); setChoisi(null); }} />}
        <p aria-live="polite" className="text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>
          {nb >= max ? "Assez : la suite continue à l'infini." : <>Le suivant : <b style={{ color: "var(--cap-ink)" }}>{nf(SUITE[nb - 2])} + {nf(SUITE[nb - 1])} = {nf(SUITE[nb])}</b></>}
        </p>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-[0.98rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Divisé par celui d'avant</p>
          <p aria-live="polite" className="mt-1 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>
            {sel >= 2
              ? <>{nf(v)} ÷ {nf(SUITE[sel - 1])} = <b className="tabular-nums" style={{ color: "var(--cap-amber-ink)" }}>{nf(v / SUITE[sel - 1], 4)}</b>
                {Math.abs(v / SUITE[sel - 1] - OR) < 0.0005 ? ", presque exactement le nombre d'or." : ", pas encore tout à fait 1,618."}</>
              : "Choisissez un nombre plus loin dans la suite."}
          </p>
          <div ref={ref} className="mt-2 w-full">
            <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label="Le rapport entre deux nombres voisins se rapproche de 1,618">
              {[1, 1.5, 2].map((g) => (
                <g key={g}>
                  <line x1={G} x2={G + iw} y1={y(g)} y2={y(g)} stroke="var(--cap-line-chart)" />
                  <text x={G - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--cap-ink-3)">{nf(g, 1)}</text>
                </g>
              ))}
              <line x1={G} x2={G + iw} y1={y(OR)} y2={y(OR)} stroke="var(--cap-ambre)" strokeWidth="1.5" strokeDasharray="5 4" />
              <text x={G + iw} y={y(OR) - 6} textAnchor="end" fontSize="11.5" fontWeight="700" fill="var(--cap-amber-ink)">1,618 : le nombre d'or</text>
              <path d={rapports.map((r, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(r).toFixed(1)}`).join("")} fill="none" stroke="var(--cap-ink)" strokeWidth="1.8" />
              {rapports.map((r, k) => (
                <circle key={k} cx={x(k)} cy={y(r)} r={k + 2 === sel ? 5 : 3} fill={k + 2 === sel ? "var(--cap-ambre)" : "var(--cap-ink)"} />
              ))}
              <text x={G} y={H - 4} fontSize="11" fill="var(--cap-ink-3)">plus on avance dans la suite →</text>
            </svg>
          </div>
        </div>
        <div>
          <p className="text-[0.98rem] font-semibold" style={{ color: "var(--cap-ink)", fontFamily: "var(--cap-font-display)" }}>Divisé par les nombres suivants</p>
          {sel >= 5 ? (
            <ul className="mt-1 space-y-1.5 text-[0.98rem] tabular-nums" style={{ color: "var(--cap-ink-2)" }} aria-live="polite">
              {[1, 2, 3].map((d) => {
                const r = v / SUITE[sel + d];
                const cible = d === 1 ? "61,8 %" : d === 2 ? "38,2 %" : "23,6 %";
                return (
                  <li key={d} className="flex items-baseline justify-between gap-3 border-b py-1.5" style={{ borderColor: "var(--cap-line)" }}>
                    <span>{nf(v)} ÷ {nf(SUITE[sel + d])} <span style={{ color: "var(--cap-ink-3)" }}>({d === 1 ? "le suivant" : d === 2 ? "deux plus loin" : "trois plus loin"})</span></span>
                    <span className="whitespace-nowrap">{nf(r, 3)} : <b style={{ color: "var(--cap-amber-ink)" }}>{nf(r * 100, 1)} %</b></span>
                    <span className="sr-only">proche de {cible}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[0.98rem]" style={{ color: "var(--cap-ink-2)" }}>Touchez un nombre à partir de 5 : les premiers sont trop petits pour tomber juste.</p>
          )}
          <p className="mt-2 text-[0.92rem]" style={{ color: "var(--cap-ink-3)" }}>
            Plus le nombre est grand, plus on tombe près de 61,8 %, 38,2 % et 23,6 %. Le 50 % n'en fait pas partie : on l'ajoute parce que beaucoup de traders surveillent la moitié du mouvement.
          </p>
        </div>
      </div>
    </div>
  );
}
