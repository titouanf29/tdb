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

const enAttente: Reussite[] = [];
let hoteMonte = false;

export function annoncerReussite(r: Reussite) {
  if (typeof window === "undefined") return;
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
