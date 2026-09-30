"use client";

import { useRef } from "react";
import { NIVEAUX_RISQUE, RISQUE, type NiveauRisque } from "@/lib/risque";

/**
 * La roue du risque : combien du capital on accepte de perdre si le stop est
 * touché, de Prudent à Très agressif.
 *
 * Un demi-cadran en quatre secteurs, du vert au rouge, et une aiguille qui
 * pivote vers le secteur choisi — le même geste d'instrument que le cadran du
 * score, en plus franc. On la tourne en cliquant un secteur, un libellé, ou
 * au clavier (flèches) : les libellés forment un groupe radio, le dessin n'est
 * que leur illustration.
 */

const CX = 110, CY = 112, R = 88, EP = 20;         // centre, rayon, épaisseur
const ECART = 3;                                    // degrés entre secteurs
const COULEURS: Record<NiveauRisque, string> = {
  conservative: "var(--cap-up)",
  moderate: "var(--cap-ocean)",
  aggressive: "var(--cap-amber)",
  very_aggressive: "var(--cap-down)",
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Angle mesuré depuis midi, dans le sens horaire : -90 à gauche, 90 à droite. */
function point(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: arrondi(CX + r * Math.cos(rad)), y: arrondi(CY + r * Math.sin(rad)) };
}

function secteur(de: number, a: number) {
  const r1 = R, r0 = R - EP;
  const p1 = point(r1, de), p2 = point(r1, a), p3 = point(r0, a), p4 = point(r0, de);
  return `M ${p1.x} ${p1.y} A ${r1} ${r1} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r0} ${r0} 0 0 0 ${p4.x} ${p4.y} Z`;
}

const PAS = 180 / NIVEAUX_RISQUE.length;
const centre = (i: number) => -90 + PAS * (i + 0.5);

export function RoueRisque({
  niveau,
  onChange,
  perte,
  capital,
  className,
}: {
  niveau: NiveauRisque;
  onChange: (n: NiveauRisque) => void;
  /** Ce qu'on perd au stop, déjà mis en forme (« 54,47 € »), si le capital est connu. */
  perte?: string | null;
  /** Le capital de référence, mis en forme. */
  capital?: string | null;
  className?: string;
}) {
  const i = NIVEAUX_RISQUE.indexOf(niveau);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);

  const tourner = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 220 - CX;
    const y = ((e.clientY - box.top) / box.height) * 124 - CY;
    // Angle depuis midi, sens horaire ; sous le moyeu, on garde le bord le plus proche.
    const deg = Math.max(-90, Math.min(90, (Math.atan2(x, -y) * 180) / Math.PI));
    const k = Math.min(NIVEAUX_RISQUE.length - 1, Math.floor((deg + 90) / PAS));
    if (k !== i) onChange(NIVEAUX_RISQUE[k]);
  };

  const choisir = (j: number) => {
    const k = (j + NIVEAUX_RISQUE.length) % NIVEAUX_RISQUE.length;
    onChange(NIVEAUX_RISQUE[k]);
    boutons.current[k]?.focus();
  };

  return (
    <div
      className={`rounded-[var(--cap-r-lg)] px-3 pb-3 pt-3 ${className ?? ""}`}
      style={{ backgroundColor: "var(--cap-surface)", boxShadow: "0 1px 2px rgba(11,23,38,.06), inset 0 0 0 1px var(--cap-line)" }}
    >
      <p className="text-center text-[0.72rem] uppercase tracking-[0.14em]" style={{ color: "var(--cap-ink-3)" }}>
        Votre risque par trade
      </p>
      <div className="relative mx-auto mt-1 w-full max-w-[15rem]">
        {/* On la tourne aussi en faisant glisser : l'angle du pointeur autour
            du moyeu désigne le secteur. `touch-action: none` pour que le doigt
            tourne la roue au lieu de faire défiler la page. */}
        <svg
          viewBox="0 0 220 124"
          className="block h-auto w-full cursor-grab touch-none select-none active:cursor-grabbing"
          aria-hidden
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); tourner(e); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) tourner(e); }}
        >
          {/* Graduations fines à l'extérieur : un instrument, pas un camembert. */}
          {Array.from({ length: 25 }, (_, k) => {
            const d = -90 + (180 * k) / 24;
            const a = point(R + 4, d), b = point(R + (k % 6 === 0 ? 10 : 7), d);
            return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--cap-line-strong)" strokeWidth={k % 6 === 0 ? 1 : 0.7} opacity={k % 6 === 0 ? 0.8 : 0.45} />;
          })}

          <defs>
            <filter id="roue-halo" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <path
            d={secteur(-90 + PAS * i + ECART / 2, -90 + PAS * (i + 1) - ECART / 2)}
            fill={COULEURS[niveau]}
            filter="url(#roue-halo)"
            opacity={0.45}
          />
          {NIVEAUX_RISQUE.map((n, k) => {
            const actif = k === i;
            return (
              <path
                key={n}
                d={secteur(-90 + PAS * k + ECART / 2, -90 + PAS * (k + 1) - ECART / 2)}
                fill={COULEURS[n]}
                style={{
                  opacity: actif ? 1 : k < i ? 0.42 : 0.18,
                  transition: "opacity .35s var(--cap-ease)",
                }}
              />
            );
          })}

          {/* L'aiguille : elle pivote autour du moyeu, avec un léger
              dépassement à l'arrivée, comme une aiguille qui se pose. */}
          <g
            className="roue-aiguille"
            style={{
              transform: `rotate(${centre(i)}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transformBox: "view-box",
            }}
          >
            <path d={`M ${CX - 4} ${CY} L ${CX} ${CY - R + EP + 6} L ${CX + 4} ${CY} Z`} fill="var(--cap-ink)" />
          </g>
          <circle cx={CX} cy={CY} r={9} fill="var(--cap-surface)" stroke="var(--cap-ink)" strokeWidth={2.5} />
          <circle cx={CX} cy={CY} r={3} fill={COULEURS[niveau]} style={{ transition: "fill .35s var(--cap-ease)" }} />
        </svg>
      </div>

      <div className="mt-1 text-center" aria-live="polite">
        <div className="flex items-baseline justify-center gap-2">
          <span className="cap-num text-[1.9rem] font-medium leading-none" style={{ color: COULEURS[niveau] }}>
            {RISQUE[niveau].pct.toLocaleString("fr-FR")} %
          </span>
          <span className="text-[0.85rem] font-semibold" style={{ color: "var(--cap-ink)" }}>{RISQUE[niveau].label}</span>
        </div>
        <p className="mt-1 text-[0.8rem] leading-snug" style={{ color: "var(--cap-ink-3)" }}>
          {perte && capital
            ? <>du capital ({capital}) — <strong style={{ color: "var(--cap-ink)" }}>{perte}</strong> perdus si le stop est touché</>
            : "du capital perdu si le stop est touché"}
        </p>
      </div>

      <div role="radiogroup" aria-label="Risque accepté par trade" className="mt-3 grid grid-cols-4 gap-1">
        {NIVEAUX_RISQUE.map((n, k) => {
          const actif = k === i;
          return (
            <button
              key={n}
              ref={(el) => { boutons.current[k] = el; }}
              type="button"
              role="radio"
              aria-checked={actif}
              tabIndex={actif ? 0 : -1}
              onClick={() => onChange(n)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); choisir(i + 1); }
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); choisir(i - 1); }
              }}
              className="flex min-h-[44px] flex-col items-center justify-center rounded-[10px] px-1 text-[0.72rem] leading-tight transition-colors"
              style={actif
                ? { backgroundColor: `color-mix(in srgb, ${COULEURS[n]} 14%, transparent)`, color: "var(--cap-ink)", boxShadow: `inset 0 0 0 1.5px ${COULEURS[n]}` }
                : { color: "var(--cap-ink-3)" }}
            >
              <span className="font-semibold">{RISQUE[n].label}</span>
              <span className="cap-num">{RISQUE[n].pct.toLocaleString("fr-FR")} %</span>
            </button>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .roue-aiguille { transition: transform .7s cubic-bezier(.34,1.56,.64,1); }
        .anim-off .roue-aiguille { transition: none; }
        @media (prefers-reduced-motion: reduce) { .roue-aiguille { transition: none; } }
      ` }} />
    </div>
  );
}
