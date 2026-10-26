/**
 * Le premier parcours avec Nimbo : analyser, prendre une première position
 * virtuelle, la suivre.
 *
 * Deux étapes se lisent dans le compte (une position existe ou a existé) ;
 * les deux autres sont des GESTES — avoir lu une analyse jusqu'à la
 * proposition de Nimbo, avoir ouvert la fiche de sa position — que rien ne
 * garde côté serveur. Ils sont notés sur cet appareil : au pire, un autre
 * appareil repropose une étape déjà faite, ce qui ne coûte rien.
 */
const CLES = {
  analyse: "tdb_parcours_analyse",
  suivi: "tdb_parcours_suivi",
  termine: "tdb_parcours_termine",
} as const;

export type GesteParcours = keyof typeof CLES;

export function noterGeste(g: GesteParcours): void {
  try { localStorage.setItem(CLES[g], "1"); } catch { /* navigation privée */ }
}

export function gesteFait(g: GesteParcours): boolean {
  try { return localStorage.getItem(CLES[g]) === "1"; } catch { return false; }
}
