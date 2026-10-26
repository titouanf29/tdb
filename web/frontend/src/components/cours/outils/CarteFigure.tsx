"use client";

import { useState } from "react";
import { GraphiqueEcole, type ConfigGraphique } from "../GraphiqueEcole";
import { BoutonTenir, ResultatTenir, useAnimeTenir } from "./ElementsTenir";

/**
 * Une figure et sa version à l'envers, sur les deux faces d'une carte. On la
 * retourne : le graphique tourne autour de son milieu, les couleurs
 * s'échangent, les étiquettes restent à l'endroit. On voit que c'est le même
 * dessin, la tête en bas.
 */
export type FaceFigure = { titre: string; texte: string; cfg: ConfigGraphique };

export function CarteFigure({ face, dos }: { face: FaceFigure; dos: FaceFigure }) {
  const [retournee, setRetournee] = useState(false);
  const reduce = !useAnimeTenir();
  const visible = retournee ? dos : face;

  const faceStyle = (estDos: boolean): React.CSSProperties => ({
    gridArea: "1 / 1",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    transform: estDos ? "rotateX(180deg)" : undefined,
    pointerEvents: retournee === estDos ? "auto" : "none",
    backgroundColor: "var(--cap-surface)",
  });

  return (
    <div>
      <div style={{ perspective: "1400px" }}>
        <div className="grid" style={{
          transformStyle: "preserve-3d",
          transition: reduce ? "none" : "transform 0.9s cubic-bezier(.45,.05,.25,1)",
          transform: retournee ? "rotateX(180deg)" : "none",
        }}>
          {[face, dos].map((f, k) => (
            <div key={k} style={faceStyle(k === 1)} aria-hidden={retournee !== (k === 1)}>
              <p className="mb-2 text-[1.05rem] font-semibold" style={{ fontFamily: "var(--cap-font-display)", color: "var(--cap-ink)" }}>{f.titre}</p>
              <GraphiqueEcole {...f.cfg} sansSurvol ariaLabel={f.titre} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ResultatTenir className="min-w-0 flex-1">
          <span dangerouslySetInnerHTML={{ __html: visible.texte }} />
        </ResultatTenir>
        <div className="flex-none">
          <BoutonTenir onClick={() => setRetournee((r) => !r)}>
            {retournee ? "La retourner encore" : "Retourner la carte"}
          </BoutonTenir>
        </div>
      </div>
    </div>
  );
}
