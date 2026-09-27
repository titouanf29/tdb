"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { marketAPI } from "@/lib/api";
import { NUIT } from "./nuit";

/**
 * Les cours du moment, qui défilent. La preuve la plus simple que le site
 * travaille sur de vraies données : elles bougent sous les yeux du visiteur.
 *
 * Un contenu qui défile doit pouvoir s'arrêter (WCAG 2.2.2) : bouton pause,
 * arrêt au survol et au focus, et rien ne bouge si le système demande de
 * réduire les animations — la liste est alors simplement posée.
 */

const ACTIFS: [string, string][] = [
  ["^FCHI", "CAC 40"], ["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq"], ["BTC-USD", "Bitcoin"],
  ["ETH-USD", "Ether"], ["GC=F", "Or"], ["CL=F", "Pétrole"], ["EURUSD=X", "Euro / dollar"],
  ["AAPL", "Apple"], ["NVDA", "Nvidia"], ["MC.PA", "LVMH"], ["TTE.PA", "TotalEnergies"],
  ["AIR.PA", "Airbus"], ["TSLA", "Tesla"],
];

export function Bandeau() {
  const reduit = useReducedMotion();
  const [prix, setPrix] = useState<Record<string, { price: number; change: number }>>({});
  const [pause, setPause] = useState(false);

  useEffect(() => {
    marketAPI.getPrices(ACTIFS.map(([s]) => s)).then((d) => setPrix(d.prices ?? {})).catch(() => {});
  }, []);

  const lignes = ACTIFS.filter(([s]) => prix[s]?.price);
  if (lignes.length < 4) return <div className="h-[52px]" style={{ backgroundColor: NUIT.fond }} />;

  const item = ([s, nom]: [string, string], k: string) => {
    const p = prix[s];
    const hausse = p.change >= 0;
    return (
      <li key={k} className="flex shrink-0 items-center gap-2.5 px-6 text-[0.88rem]">
        <span style={{ color: NUIT.texte2 }}>{nom}</span>
        <span className="cap-num" style={{ color: NUIT.texte }}>
          {p.price.toLocaleString("fr-FR", { maximumFractionDigits: p.price < 10 ? 4 : 2 })}
        </span>
        <span className="cap-num" style={{ color: hausse ? NUIT.hausse : NUIT.baisse }}>
          {hausse ? "▲" : "▼"} {Math.abs(p.change).toFixed(2).replace(".", ",")} %
        </span>
      </li>
    );
  };

  const anime = !reduit && !pause;

  return (
    <div className="group relative flex items-center overflow-hidden border-y"
      style={{ backgroundColor: NUIT.fond, borderColor: NUIT.ligne, color: NUIT.texte }}
      onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}
      onFocus={() => setPause(true)} onBlur={() => setPause(false)}>
      <span className="sr-only">Cours du moment</span>
      <div className="flex min-w-0 flex-1 overflow-hidden py-3.5" aria-live="off">
        <ul className={`flex ${anime ? "animate-[defile_60s_linear_infinite]" : ""}`}>
          {lignes.map((l, i) => item(l, `a${i}`))}
          {/* La seconde copie ferme la boucle ; elle est cachée aux lecteurs d'écran. */}
          {!reduit && <li aria-hidden className="contents">{lignes.map((l, i) => item(l, `b${i}`))}</li>}
        </ul>
      </div>
      {!reduit && (
        <button type="button" onClick={() => setPause((v) => !v)}
          aria-label={pause ? "Relancer le défilement des cours" : "Mettre en pause le défilement des cours"}
          className="relative z-10 flex h-[44px] w-[44px] shrink-0 items-center justify-center border-l transition-colors hover:bg-white/5"
          style={{ borderColor: NUIT.ligne, color: NUIT.texte2, backgroundColor: NUIT.fond }}>
          {pause ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
      )}
      <style>{`@keyframes defile { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
