"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Le mode d'affichage de l'interface reconstruite.
 *
 * Trois valeurs, pas deux : « système » est le défaut, parce que quelqu'un
 * qui a réglé son téléphone en sombre l'a déjà dit une fois et n'a pas à le
 * redire ici. Le choix explicite reste possible et prime.
 *
 * Volontairement distinct du réglage `theme` historique, qui pilote la
 * palette des huit écrans pas encore reconstruits. Les deux cohabitent le
 * temps de la migration ; les mélanger ferait basculer une moitié du site
 * sans l'autre, ce qui est pire que deux réglages.
 *
 * Stocké dans le navigateur plutôt que sur le compte, et c'est délibéré : le
 * mode sombre dépend de l'appareil et de l'heure, pas de la personne. Un
 * portable le soir et un écran de bureau en plein jour n'appellent pas le
 * même réglage.
 */

export type CapTheme = "light" | "dark" | "system";

export const CAP_THEME_KEY = "tdb_cap_theme";

/** Applique le mode au document. Utilisée aussi par le script anti-FOUC. */
export function applyCapTheme(theme: CapTheme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-cap-theme", dark ? "dark" : "light");
  // Indique au navigateur de teinter ses propres surfaces — barres de
  // défilement, champs natifs. Sans cela, une barre de défilement blanche
  // borde un écran sombre.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function read(): CapTheme {
  try {
    const v = localStorage.getItem(CAP_THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* navigation privée */
  }
  return "system";
}

export function useCapTheme(): {
  theme: CapTheme;
  /** Le mode réellement appliqué, « système » résolu. */
  resolved: "light" | "dark";
  setTheme: (t: CapTheme) => void;
} {
  const [theme, setThemeState] = useState<CapTheme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const sync = useCallback((t: CapTheme) => {
    applyCapTheme(t);
    setResolved(
      document.documentElement.getAttribute("data-cap-theme") === "dark" ? "dark" : "light"
    );
  }, []);

  useEffect(() => {
    const t = read();
    setThemeState(t);
    sync(t);
  }, [sync]);

  // En mode « système », suivre les changements en direct : beaucoup
  // d'environnements basculent seuls au coucher du soleil, et l'onglet
  // ouvert doit suivre plutôt que d'attendre un rechargement.
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => sync("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, sync]);

  const setTheme = useCallback(
    (t: CapTheme) => {
      setThemeState(t);
      try { localStorage.setItem(CAP_THEME_KEY, t); } catch { /* ignore */ }
      sync(t);
    },
    [sync]
  );

  return { theme, resolved, setTheme };
}
