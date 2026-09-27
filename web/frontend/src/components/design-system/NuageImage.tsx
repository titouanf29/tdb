"use client";

import { useEffect, useState } from "react";

/**
 * Un nuage, sous forme d'image déjà prête.
 *
 * POURQUOI DES FICHIERS. Un nuage est une silhouette adoucie par un flou
 * gaussien. Dessiné en direct (SVG), ce flou était recalculé par le
 * navigateur à la taille d'affichage — jusqu'à deux écrans de large — et à
 * chaque changement ; converti à la volée en image, la conversion tombait
 * pendant l'arrivée sur la page, au pire moment. Les nuages sont donc
 * générés une fois pour toutes (scripts/generer-nuages.py → public/nuages/,
 * WebP, ~15 Ko chacun) : la page ne fait plus que les déplacer, les agrandir
 * et les estomper, ce que la carte graphique fait sans rien redessiner.
 */

export type Teinte = "clair" | "sombre";

/** Le thème des nuages, lu après le premier rendu (clair par défaut). */
export function useTeinteNuage(): Teinte {
  const [t, setT] = useState<Teinte>("clair");
  useEffect(() => {
    const lire = () => {
      const s = getComputedStyle(document.querySelector(".cap") ?? document.documentElement);
      const light = s.getPropertyValue("--cap-cloud-light").trim().toUpperCase();
      setT(light === "#3B4D63" ? "sombre" : "clair");
    };
    lire();
    const obs = new MutationObserver(lire);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => obs.disconnect();
  }, []);
  return t;
}

const FLOUS = [2.4, 3.5, 5, 7];

/** Le fichier le plus proche du flou demandé. */
export function nuageSrc(forme: number, flou: number, teinte: Teinte): string {
  const f = FLOUS.reduce((a, b) => (Math.abs(b - flou) < Math.abs(a - flou) ? b : a));
  return `/nuages/${forme % 4}-${String(f).replace(".", "_")}-${teinte}.webp`;
}

// L'image est plus grande que la silhouette (marge de 30 unités pour le flou,
// sur une silhouette de 200 × 100) ; elle déborde de la boîte sans la déformer.
const M = 30;

export function NuageImage({ forme = 0, retourne, flou = 2.4, className, style, prioritaire }: {
  forme?: number; retourne?: boolean; flou?: number; className?: string; style?: React.CSSProperties;
  /** Chargé et décodé en priorité (les nuages visibles dès l'arrivée). */
  prioritaire?: boolean;
}) {
  const teinte = useTeinteNuage();
  return (
    <div aria-hidden className={className} style={{ position: "relative", aspectRatio: "2 / 1", ...style, height: undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={nuageSrc(forme, flou, teinte)} alt="" draggable={false}
        // Toujours décodé hors du fil principal : un décodage « sync »
        // bloquait le démarrage de la page (tâches de 300 à 400 ms). Les
        // nuages de l'ouverture attendent leur décodage avant de bouger.
        decoding="async" loading={prioritaire ? "eager" : "lazy"}
        {...(prioritaire ? { fetchpriority: "high" } : {})}
        style={{ position: "absolute", left: `${-(M / 200) * 100}%`, top: `${-(M / 100) * 100}%`,
                 width: `${((200 + 2 * M) / 200) * 100}%`, height: `${((100 + 2 * M) / 100) * 100}%`,
                 maxWidth: "none", pointerEvents: "none", userSelect: "none",
                 transform: retourne ? "scaleX(-1)" : undefined }} />
    </div>
  );
}
