import type { ScanResultItem } from "@/lib/api";

/**
 * Ce que le scanner a vu, reporté sur l'écran d'analyse.
 *
 * Le scanner classait, expliquait, donnait un plan — puis le lien vers
 * l'analyse jetait tout : on arrivait sur une page qui ne savait pas d'où on
 * venait, et qui recommençait son raisonnement de zéro. L'utilisateur devait
 * garder de tête le rang, le niveau d'entrée et l'invalidation pendant le
 * trajet entre deux écrans.
 *
 * LA NOTE VOYAGE PAR LE NAVIGATEUR, PAS PAR L'URL. Un plan tient en cinq
 * nombres et trois phrases : les passer en paramètres donnerait une adresse
 * illisible et impossible à partager. Le scan est déjà dans le client, il
 * suffit de le garder.
 *
 * ELLE PÉRIME. Un plan d'entrée calculé sur la clôture de mardi n'a plus de
 * sens jeudi : les niveaux ont bougé, la sélection aussi. Passé le délai, la
 * note disparaît au lieu de vieillir en silence — et tant qu'elle vit, elle
 * affiche l'heure du scan, pour que le lecteur juge lui-même de sa fraîcheur.
 *
 * `sessionStorage` et non `localStorage` : la note appartient à la session de
 * travail en cours. Rouvrir le site demain doit rendre un écran d'analyse
 * propre, pas ressortir le plan d'une session oubliée.
 */

const CLE = "tdb_scan_note";
const DUREE_MS = 6 * 60 * 60 * 1000; // six heures : une demi-séance

export interface NoteScan {
  /** Quand le scan a tourné. Affiché, parce que la fraîcheur se juge. */
  at: string;
  /** L'unité de temps et l'horizon du scan — le plan n'a de sens qu'avec eux. */
  timeframe: string;
  /** Le rang de l'actif dans la sélection, et la taille de celle-ci. */
  rang: number;
  total: number;
  item: ScanResultItem;
}

/** Range le résultat d'un scan, indexé par symbole. */
export function enregistrerScan(items: ScanResultItem[], timeframe: string): void {
  try {
    const at = new Date().toISOString();
    const par_symbole: Record<string, NoteScan> = {};
    items.forEach((item, i) => {
      par_symbole[item.symbol] = { at, timeframe, rang: i + 1, total: items.length, item };
    });
    sessionStorage.setItem(CLE, JSON.stringify(par_symbole));
  } catch {
    /* navigation privée ou quota : la note est un confort, pas une donnée */
  }
}

/** La note pour cet actif, si elle existe et n'a pas périmé. */
export function lireNote(symbole: string): NoteScan | null {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const tout = JSON.parse(brut) as Record<string, NoteScan>;
    const n = tout[symbole.toUpperCase()];
    if (!n) return null;
    if (Date.now() - new Date(n.at).getTime() > DUREE_MS) return null;
    return n;
  } catch {
    return null;
  }
}

/** « il y a 12 min » — la fraîcheur, dite comme on la dit. */
export function fraicheur(iso: string): string {
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (!Number.isFinite(min) || min < 0) return "";
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${Math.round(min)} min`;
  const h = Math.round(min / 60);
  return `il y a ${h} h`;
}
