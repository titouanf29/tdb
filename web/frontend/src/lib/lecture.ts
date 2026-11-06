"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * « Lecture confortable » : tout le texte un cran plus grand, et le ciel
 * animé coupé. Pour lire sur un petit écran ou avec une vue fatiguée.
 *
 * Le réglage est propre au navigateur (comme les animations). Il pose la
 * classe `lecture-confortable` sur <html>, avant le premier affichage (script
 * de app/layout.tsx) puis à chaque changement ; la feuille de style agrandit
 * la taille de base, et tout ce qui est en rem suit.
 */
export const CLE_LECTURE = "tdb_lecture";
const EVENEMENT = "tdb-lecture";

export function useLectureConfortable(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const lire = () => {
      let v = false;
      try { v = localStorage.getItem(CLE_LECTURE) === "1"; } catch { /* navigation privée */ }
      setOn(v);
      document.documentElement.classList.toggle("lecture-confortable", v);
    };
    lire();
    window.addEventListener(EVENEMENT, lire);
    return () => window.removeEventListener(EVENEMENT, lire);
  }, []);

  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(CLE_LECTURE, v ? "1" : "0"); } catch { /* navigation privée */ }
    window.dispatchEvent(new Event(EVENEMENT));
  }, []);

  return [on, set];
}
