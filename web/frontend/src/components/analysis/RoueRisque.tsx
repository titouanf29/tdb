"use client";

import { NIVEAUX_RISQUE, RISQUE, type NiveauRisque } from "@/lib/risque";

/**
 * Le bouton du risque : combien du capital on accepte de perdre si le stop
 * est touché, de Prudent (0,5 %) à Très agressif (5 %).
 *
 * Un petit bouton rotatif, posé à côté du choix d'horizon — les deux réglages
 * qui décident d'un plan, côte à côte. Discret : un disque neutre, un repère,
 * quatre crans colorés. On le TOURNE : glisser (souris ou doigt) autour du
 * centre, cliquer un cran, ou les flèches du clavier (c'est un curseur au
 * sens de l'accessibilité, qui annonce « Modéré, 1 % du capital »).
 */

const T = 64;                 // taille du dessin, en px
const C = T / 2;
const CRANS = [-120, -40, 40, 120];   // angle de chaque niveau, depuis midi
const COULEURS: Record<NiveauRisque, string> = {
  conservative: "var(--cap-up)",
  moderate: "var(--cap-ocean)",
  aggressive: "var(--cap-amber)",
  very_aggressive: "var(--cap-down)",
};

const arrondi = (n: number) => Math.round(n * 100) / 100;
function point(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: arrondi(C + r * Math.cos(rad)), y: arrondi(C + r * Math.sin(rad)) };
}

export function RoueRisque({
  niveau,
  onChange,
  className,
}: {
  niveau: NiveauRisque;
  onChange: (n: NiveauRisque) => void;
  className?: string;
}) {
  const i = NIVEAUX_RISQUE.indexOf(niveau);
  const aller = (k: number) => {
    const j = Math.max(0, Math.min(NIVEAUX_RISQUE.length - 1, k));
    if (j !== i) onChange(NIVEAUX_RISQUE[j]);
  };

  // L'angle du pointeur autour du centre désigne le cran le plus proche.
  const tourner = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (b.left + b.width / 2);
    const y = e.clientY - (b.top + b.height / 2);
    const deg = (Math.atan2(x, -y) * 180) / Math.PI;
    let k = 0;
    CRANS.forEach((a, j) => { if (Math.abs(a - deg) < Math.abs(CRANS[k] - deg)) k = j; });
    aller(k);
  };

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Risque accepté par trade"
        aria-valuemin={0}
        aria-valuemax={NIVEAUX_RISQUE.length - 1}
        aria-valuenow={i}
        aria-valuetext={`${RISQUE[niveau].label}, ${RISQUE[niveau].pct.toLocaleString("fr-FR")} % du capital`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); aller(i + 1); }
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); aller(i - 1); }
          if (e.key === "Home") { e.preventDefault(); aller(0); }
          if (e.key === "End") { e.preventDefault(); aller(NIVEAUX_RISQUE.length - 1); }
        }}
        // `touch-action: none` : le doigt tourne le bouton au lieu de faire
        // défiler la page.
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); tourner(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) tourner(e); }}
        className="relative shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        // Le contour de focus du site suit l'arrondi : ici, un cercle.
        style={{ width: T, height: T, borderRadius: "50%" }}
      >
        <svg viewBox={`0 0 ${T} ${T}`} width={T} height={T} aria-hidden className="block">
          {/* Les crans, autour du disque. */}
          {CRANS.map((a, k) => {
            const p = point(C - 4, a);
            return (
              <circle
                key={k}
                cx={p.x} cy={p.y} r={k === i ? 3 : 2}
                fill={COULEURS[NIVEAUX_RISQUE[k]]}
                opacity={k === i ? 1 : 0.4}
                style={{ transition: "opacity .3s" }}
              />
            );
          })}
          {/* Le disque, en relief léger, et son repère qui tourne. */}
          <circle cx={C} cy={C} r={C - 11} fill="var(--cap-surface)" stroke="var(--cap-line-strong)" strokeWidth={1} />
          <circle cx={C} cy={C} r={C - 14} fill="none" stroke="var(--cap-line)" strokeWidth={1} />
          <g className="bouton-risque" style={{ transform: `rotate(${CRANS[i]}deg)`, transformOrigin: `${C}px ${C}px` }}>
            <line x1={C} y1={C - 6} x2={C} y2={15} stroke={COULEURS[niveau]} strokeWidth={3} strokeLinecap="round"
              style={{ transition: "stroke .3s" }} />
          </g>
        </svg>
      </div>

      <div className="min-w-0 leading-tight">
        <span className="block text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>Risque par trade</span>
        <span className="mt-0.5 block text-[0.95rem]" style={{ color: "var(--cap-ink)" }}>
          <span className="cap-num font-medium" style={{ color: COULEURS[niveau] }}>
            {RISQUE[niveau].pct.toLocaleString("fr-FR")} %
          </span>{" "}
          <span className="font-semibold">{RISQUE[niveau].label}</span>
        </span>
        <span className="block text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>du capital, si le stop est touché</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .bouton-risque { transition: transform .5s cubic-bezier(.34,1.56,.64,1); }
        .anim-off .bouton-risque { transition: none; }
        @media (prefers-reduced-motion: reduce) { .bouton-risque { transition: none; } }
      ` }} />
    </div>
  );
}
