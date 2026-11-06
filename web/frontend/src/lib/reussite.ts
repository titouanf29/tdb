import { useCallback, useEffect, useState } from "react";
import type { ActionResult } from "./api";

/**
 * Les réussites que Nimbo vient annoncer : une position ouverte, une mission
 * terminée, un badge, un niveau.
 *
 * Un événement de fenêtre plutôt qu'un contexte React : ceux qui annoncent
 * (lib/api.ts, une page qui redirige juste après) n'ont pas à connaître celui
 * qui affiche. Une réussite annoncée avant que l'hôte soit monté — la mission
 * de connexion du jour, envoyée pendant le chargement — attend dans la file au
 * lieu de se perdre.
 */
export interface Reussite {
  titre: string;
  detail?: string;
}

export const EVENEMENT_REUSSITE = "tdb-reussite";

/**
 * Les cartes se coupent, par appareil, dans les réglages. Un lecteur qui
 * voulait qu'on lui parle du risque comme à un adulte n'a pas envie qu'un
 * badge tombe à chaque clic. Les points continuent de compter ; seules les
 * cartes se taisent.
 */
export const CLE_FELICITATIONS = "tdb_felicitations";
export const EVENEMENT_FELICITATIONS = "tdb-felicitations";

export function felicitationsActives(): boolean {
  try { return localStorage.getItem(CLE_FELICITATIONS) !== "off"; } catch { return true; }
}

export function reglerFelicitations(actives: boolean) {
  try { localStorage.setItem(CLE_FELICITATIONS, actives ? "on" : "off"); } catch { /* navigation privée */ }
  window.dispatchEvent(new Event(EVENEMENT_FELICITATIONS));
}

/** Pour les réglages : l'état, et de quoi le changer. */
export function useFelicitations(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const lire = () => setOn(felicitationsActives());
    lire();
    window.addEventListener(EVENEMENT_FELICITATIONS, lire);
    return () => window.removeEventListener(EVENEMENT_FELICITATIONS, lire);
  }, []);
  const set = useCallback((v: boolean) => reglerFelicitations(v), []);
  return [on, set];
}

const enAttente: Reussite[] = [];
let hoteMonte = false;

export function annoncerReussite(r: Reussite) {
  if (typeof window === "undefined") return;
  if (!felicitationsActives()) return;
  if (!hoteMonte) {
    enAttente.push(r);
    return;
  }
  window.dispatchEvent(new CustomEvent<Reussite>(EVENEMENT_REUSSITE, { detail: r }));
}

/** Pour l'hôte : se déclarer monté et reprendre ce qui attendait. */
export function brancherHote(): () => void {
  hoteMonte = true;
  const enFile = enAttente.splice(0);
  queueMicrotask(() => enFile.forEach(annoncerReussite));
  return () => {
    hoteMonte = false;
  };
}

/** Ce que rapporte une action : missions, badges, niveau. Rien s'il n'y a rien. */
export function annoncerRecompenses(res: Partial<ActionResult> | null | undefined) {
  if (!res) return;
  const xp = res.xp_gained ? ` · +${res.xp_gained} XP` : "";
  const missions = res.mission_titles ?? [];
  if (missions.length) {
    annoncerReussite({
      titre: missions.length > 1 ? `${missions.length} missions accomplies` : "Mission accomplie",
      detail: missions.join(" · ") + xp,
    });
  } else if (res.missions_completed?.length) {
    annoncerReussite({ titre: "Mission accomplie", detail: xp.replace(/^ · /, "") || undefined });
  }
  for (const b of res.new_badges ?? []) {
    if (b?.name) annoncerReussite({ titre: "Nouveau badge", detail: b.name });
  }
  if (res.level_up && res.new_level) {
    annoncerReussite({ titre: `Niveau ${res.new_level} atteint`, detail: "Continuez comme ça." });
  }
}
