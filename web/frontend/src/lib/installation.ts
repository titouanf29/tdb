/**
 * L'installation du site comme application.
 *
 * Chrome (Android, ordinateur) annonce qu'il peut installer la page par un
 * événement `beforeinstallprompt`, souvent AVANT que React ait monté quoi
 * que ce soit. On le garde ici, au chargement du module, pour que le bouton
 * « Installer » de l'accueil puisse le rejouer plus tard. Safari sur iPhone
 * n'a pas d'événement : on explique le geste à la main.
 */
type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let differe: EvenementInstallation | null = null;
const abonnes = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    differe = e as EvenementInstallation;
    abonnes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => { differe = null; abonnes.forEach((f) => f()); });
}

export function installationPossible(): boolean {
  return differe != null;
}

export function surChangement(f: () => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

/** Vrai quand la page tourne déjà comme une application installée. */
export function dejaInstalle(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Safari sur iPhone ou iPad : l'installation passe par « Partager ». */
export function estIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
}

export async function installer(): Promise<"accepted" | "dismissed" | "indisponible"> {
  if (!differe) return "indisponible";
  const e = differe;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === "accepted") differe = null;
  return outcome;
}
