"use client";

/**
 * La barre stop · cours · objectif : où en est le cours entre les deux
 * niveaux. Sur l'analyse pour le plan proposé, sur la fiche de position pour
 * le plan en cours.
 */
export function PlanBar({ stop, objectif, cours }: { stop: number; objectif: number; cours: number }) {
  const bas = Math.min(stop, objectif), haut = Math.max(stop, objectif);
  if (haut <= bas || !Number.isFinite(cours)) return null;
  const pos = Math.min(0.96, Math.max(0.04, (cours - bas) / (haut - bas)));
  const stopAGauche = stop < objectif;
  const gauche = stopAGauche ? "var(--cap-down)" : "var(--cap-up)";
  const droite = stopAGauche ? "var(--cap-up)" : "var(--cap-down)";
  const pct = `${(pos * 100).toFixed(1)}%`;
  return (
    <div aria-hidden className="w-full pt-1">
      <div className="relative h-[6px] rounded-full" style={{ backgroundColor: "var(--cap-line)" }}>
        <span className="cap-plan-seg absolute inset-y-0 left-0 rounded-l-full"
          style={{ width: pct, backgroundColor: gauche, opacity: 0.85, ["--o" as string]: "100%" }} />
        <span className="cap-plan-seg absolute inset-y-0 right-0 rounded-r-full"
          style={{ left: pct, backgroundColor: droite, opacity: 0.85, ["--o" as string]: "0%" }} />
        {/* Deux étages : le centrage (translate) et l'apparition (scale)
            ne peuvent pas partager la même propriété transform. */}
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2" style={{ left: pct }}>
          <span className="cap-pop block h-full w-full rounded-full"
            style={{ backgroundColor: "var(--cap-surface)", boxShadow: "0 0 0 2px var(--cap-ink), 0 2px 6px rgba(11,23,38,.25)", ["--d" as string]: ".9s" }} />
        </span>
      </div>
      <div className="relative mt-2 flex justify-between text-[0.72rem]" style={{ color: "var(--cap-ink-3)" }}>
        <span>{stopAGauche ? "Stop" : "Objectif"}</span>
        {/* Sous le point du cours, tant qu'il ne chevauche pas les bouts. */}
        {pos > 0.14 && pos < 0.86 && (
          <span className="absolute top-0 -translate-x-1/2" style={{ left: pct, color: "var(--cap-ink-2)" }}>Cours</span>
        )}
        <span>{stopAGauche ? "Objectif" : "Stop"}</span>
      </div>
    </div>
  );
}
