import type { ReactNode } from "react";
import type { ConfigGraphique } from "@/components/cours/GraphiqueEcole";
import type { NimboHumeur } from "@/components/design-system";

/**
 * Une leçon de la série : la même que la vidéo TikTok du même numéro, en
 * complet. La vidéo donne l'idée en une minute ; la leçon donne le détail, les
 * exemples chiffrés, des graphiques à manipuler et de quoi vérifier qu'on a
 * compris.
 */

export interface QuestionQuiz {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export type Bloc =
  /** Un paragraphe. Balises permises : <b>, <em>, <span class="mot">. */
  | { t: "p"; html: string }
  | { t: "h"; texte: string }
  | { t: "liste"; items: string[]; numerotee?: boolean }
  | { t: "exemple"; titre?: string; html: string }
  | { t: "piege"; html: string }
  | { t: "nimbo"; texte: string; humeur?: NimboHumeur }
  | { t: "graphique"; cfg: ConfigGraphique; legende?: string }
  /** Un graphique qui avance d'étape en étape, chacune avec sa phrase. */
  | { t: "scenes"; titre?: string; scenes: { legende: string; cfg: ConfigGraphique }[] }
  /** Un outil interactif. */
  | { t: "outil"; titre: string; consigne?: string; el: ReactNode }
  | { t: "tableau"; entetes: string[]; lignes: string[][]; legende?: string }
  | { t: "qr"; items: { q: string; r: string }[] };

export interface Partie {
  /** Vide pour une leçon en une seule partie. */
  titre: string;
  blocs: Bloc[];
}

export interface LeconSerie {
  numero: number;
  /** La question qui ouvre la vidéo. */
  accroche: string;
  /** Ce qu'on saura faire à la fin. */
  promesse: string;
  parties: Partie[];
  /** Les mots des traders, en français et en anglais. */
  mots: { terme: string; en?: string; def: string }[];
  retenir: string[];
  quiz: QuestionQuiz[];
  /** Mettre en pratique sur le site. */
  pratique?: { texte: string; href: string; bouton: string }[];
}
