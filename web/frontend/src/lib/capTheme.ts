"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Le mode d'affichage — UN seul interrupteur pour tout le site.
 *
 * La première version en exposait deux : celui-ci pour les écrans
 * reconstruits, et le réglage `theme` historique pour les sept autres. Les
 * deux portaient les mots « Clair » et « Sombre », dans la même section des
 * paramètres. Résultat prévisible : on actionne l'un, la moitié du site ne
 * bouge pas, et on conclut que la bascule est cassée. C'est exactement ce
 * qui est arrivé.
 *
 * Les deux mécanismes fonctionnent — vérifié : le fond des écrans hérités
 * passe bien de #0A0A0B à #F7F6F2. Ils n'auraient jamais dû être deux
 * contrôles. Ce module pilote donc les deux : `data-cap-theme` pour la
 * nouvelle interface, et le réglage serveur `theme` pour l'ancienne, écrits
 * ensemble. La distinction technique existe toujours ; elle a cessé d'être
 * le problème de l'utilisateur.
 *
 * Le défaut est « clair ». Suivre le système paraissait attentionné, mais
 * l'identité du produit est un ciel de jour : c'est ce qu'on doit voir en
 * arrivant, quitte à passer en sombre d'un clic.
 */

export type CapTheme = "light" | "dark" | "system";

/** Le mode appliqué quand rien n'a été choisi. */
export const DEFAULT_CAP_THEME: CapTheme = "light";

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
  return DEFAULT_CAP_THEME;
}

/**
 * Répercute le mode sur les écrans pas encore reconstruits.
 *
 * Silencieux à dessein : c'est une conséquence du choix de l'utilisateur, pas
 * une action qu'il a demandée. Un échec ici ne doit ni bloquer la bascule ni
 * afficher une erreur — la nouvelle interface, elle, a déjà basculé.
 */
async function mirrorToLegacy(resolved: "light" | "dark") {
  try {
    const { settingsAPI } = await import("@/lib/api");
    await settingsAPI.update({ theme: resolved });
    // Le cache que lit le script anti-scintillement au prochain chargement.
    const raw = localStorage.getItem("tdb_settings");
    const cur = raw ? JSON.parse(raw) : {};
    localStorage.setItem("tdb_settings", JSON.stringify({ ...cur, theme: resolved }));
    document.documentElement.setAttribute("data-theme", resolved);
  } catch {
    /* les écrans hérités garderont leur palette actuelle */
  }
}

export function useCapTheme(): {
  theme: CapTheme;
  /** Le mode réellement appliqué, « système » résolu. */
  resolved: "light" | "dark";
  setTheme: (t: CapTheme) => void;
} {
  const [theme, setThemeState] = useState<CapTheme>(DEFAULT_CAP_THEME);
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
      const dark =
        t === "dark" ||
        (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      mirrorToLegacy(dark ? "dark" : "light");
    },
    [sync]
  );

  return { theme, resolved, setTheme };
}
