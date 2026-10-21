/**
 * Les visites guidées : le site montré sur ses vrais écrans.
 *
 * Une visite est une suite d'étapes. Chacune désigne un élément de la page
 * par son attribut `data-visite`, et le guide (components/app/VisiteGuidee)
 * l'éclaire, le reste de l'écran s'assombrit, et Nimbo explique à côté.
 * Plusieurs cibles possibles par étape : la première visible gagne, ce qui
 * couvre l'ordinateur (les sections en haut) et le téléphone (le menu en
 * bas) sans deux visites différentes.
 *
 * L'étape en cours vit dans le sessionStorage : une visite qui change de page
 * ou un rechargement reprend où l'on en était, et elle ne revient pas le
 * lendemain.
 */

export type VisiteId = "decouverte" | "support";

export interface EtapeVisite {
  /** Valeurs de `data-visite`, essayées dans l'ordre. */
  cibles: string[];
  /** La page où se trouve la cible ; le guide y emmène s'il n'y est pas. */
  route?: string;
  /** Ce qu'il faut ouvrir avant de chercher la cible. */
  ouvrir?: "communaute";
  titre: string;
  texte: string;
  /** Le texte sur téléphone, quand l'écran n'est pas le même. */
  texteMobile?: string;
  /** Sur la dernière étape : un bouton qui mène à la suite. */
  suite?: { label: string; href: string };
}

export const VISITES: Record<VisiteId, { nom: string; etapes: EtapeVisite[] }> = {
  support: {
    nom: "Contacter le support",
    etapes: [
      {
        cibles: ["zone-communaute", "menu-mobile"],
        titre: "Ouvrez Communauté",
        texte: "Tout part d'ici : la section Communauté, en haut de l'écran. Elle réunit les échanges entre membres et ceux avec l'équipe.",
        texteMobile: "Sur téléphone, tout le site est derrière Menu, en bas à droite. Communauté s'y trouve, avec les autres sections.",
      },
      {
        cibles: ["lien-/support"],
        ouvrir: "communaute",
        titre: "Choisissez Mes demandes",
        texte: "Ce sont vos échanges avec l'équipe. Chaque réponse s'affiche là, et une notification vous prévient.",
      },
      {
        cibles: ["support-nouvelle"],
        route: "/support?nouveau=1",
        titre: "Écrivez votre message",
        texte: "Un sujet, puis ce qui se passe : l'écran concerné, ce que vous avez fait, ce que vous attendiez. Une idée s'envoie de la même façon : nous lisons tout.",
      },
    ],
  },
  decouverte: {
    nom: "Visite du site",
    etapes: [
      {
        cibles: ["sections", "onglets"],
        route: "/dashboard",
        titre: "Le plan du site",
        texte: "Cinq sections : Mon espace, Analyser, Parcours, Assistant et Communauté. Chacune ouvre ses écrans juste en dessous.",
        texteMobile: "En bas, les quatre écrans qui servent le plus. Menu ouvre tout le reste du site.",
      },
      {
        cibles: ["recherche"],
        titre: "Chercher un actif",
        texte: "Tapez un nom, pas forcément un symbole : « Apple », « bitcoin », « CAC 40 ». L'analyse s'ouvre directement.",
      },
      {
        cibles: ["wallet-compte"],
        route: "/wallet",
        titre: "Votre wallet de simulation",
        texte: "10 000 € fictifs, crédités à l'ouverture. Solde, positions et résultats se lisent ici. L'argent est fictif, les cours sont réels.",
      },
      {
        cibles: ["analyse-verdict"],
        route: "/analysis?symbol=AAPL",
        titre: "Analyser un actif",
        texte: "Voici Apple. Pour chaque actif, je donne un verdict et sa raison en une phrase. Le détail suit, au niveau que vous choisissez.",
      },
      {
        cibles: ["analyse-position"],
        titre: "Prendre position",
        texte: "Quand je propose une position, elle arrive avec son stop et son objectif. Ce bouton ouvre l'ordre déjà rempli : vous n'avez plus qu'à valider.",
      },
      {
        cibles: ["parcours"],
        route: "/learn",
        titre: "Apprendre à votre rythme",
        texte: "Des leçons courtes, des exercices sur de vrais graphiques et des missions, des bases jusqu'aux stratégies.",
      },
      {
        cibles: ["zone-communaute", "menu-mobile"],
        titre: "Un souci, une idée ?",
        texte: "Le site est en développement. Si quelque chose coince, ou si une idée vous vient, écrivez à l'équipe : Communauté, puis Mes demandes.",
        texteMobile: "Le site est en développement. Si quelque chose coince, ou si une idée vous vient, écrivez à l'équipe : Menu, puis Mes demandes.",
        suite: { label: "Analyser mon premier actif", href: "/analysis" },
      },
    ],
  },
};

const CLE = "tdb_visite";
export const EVT_VISITE = "tdb:visite";
/** Ouvrir un menu de la navigation pour qu'une étape puisse l'éclairer. */
export const EVT_OUVRIR = "tdb:visite-ouvrir";

export interface EtatVisite { id: VisiteId; etape: number }

export function lireVisite(): EtatVisite | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE) || "null");
    if (v && v.id in VISITES && Number.isInteger(v.etape)) return v;
  } catch { /* navigation privée */ }
  return null;
}

export function ecrireVisite(e: EtatVisite | null) {
  try {
    if (e) sessionStorage.setItem(CLE, JSON.stringify(e));
    else sessionStorage.removeItem(CLE);
  } catch { /* navigation privée */ }
  window.dispatchEvent(new CustomEvent(EVT_VISITE, { detail: e }));
}

/** Lance une visite depuis n'importe quel écran. */
export function lancerVisite(id: VisiteId) {
  ecrireVisite({ id, etape: 0 });
}
