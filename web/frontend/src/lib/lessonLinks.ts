/**
 * Le pont entre l'outil et le cours.
 *
 * Un module d'apprentissage rangé dans son propre onglet n'est pas intégré :
 * il est rangé. L'utilisateur qui a besoin d'une leçon sur le RSI n'est pas
 * dans l'onglet Parcours à ce moment-là, il est devant une analyse en train
 * de lire « RSI 71,4 » sans savoir si c'est beaucoup. C'est là que le lien
 * doit se trouver, et c'est ce que cette table fait.
 *
 * Elle ne couvre volontairement que ce que le catalogue traite vraiment. Une
 * entrée qui pointe vers une leçon ne parlant pas du sujet est pire que pas
 * de lien : elle coûte un aller-retour et détruit la confiance dans tous les
 * autres liens. L'ADX et le Stochastique ne sont pas dans les vingt-trois
 * leçons, ils n'ont donc pas d'entrée — et l'Analyse n'affiche simplement
 * rien pour eux.
 */

export interface LessonLink {
  /** "moduleId/lessonId" — la clé qu'attend /learn?lecon=… */
  key: string;
  /** Le texte du lien, à la première personne du lecteur. */
  label: string;
}

const LESSONS: Record<string, LessonLink> = {
  RSI: { key: "lecon/4", label: "Comprendre le RSI" },
  MACD: { key: "lecon/8", label: "Comprendre le MACD" },
  "Moyennes mobiles": {
    key: "lecon/6",
    label: "Comprendre les moyennes mobiles",
  },
  Volume: { key: "lecon/37", label: "Ce que dit le volume" },
  Support: { key: "lecon/33", label: "Supports et résistances" },
  Résistance: { key: "lecon/33", label: "Supports et résistances" },
  Stop: { key: "lecon/7", label: "Pourquoi un stop" },
  "Taille de position": {
    key: "lecon/19",
    label: "Dimensionner une position",
  },
};

/** La leçon qui explique ce terme, si le catalogue la contient. */
export function lessonFor(term: string): LessonLink | null {
  return LESSONS[term] ?? null;
}

/** L'URL d'une leçon, pour un lien direct depuis n'importe quel écran. */
export function lessonHref(key: string): string {
  // Les leçons de la série ont leur adresse propre : /lecon/33.
  if (key.startsWith("lecon/")) return `/${key}`;
  return `/learn?lecon=${encodeURIComponent(key)}`;
}

/* Les figures chartistes, vers leur leçon. Le graphique de l'Analyse dessine
   la forme et dit ce qu'elle a donné ; la leçon explique comment elle se
   trace et pourquoi on la voit partout. */
const LECONS_FIGURES: Record<string, string> = {
  double_sommet: "doubles", double_creux: "doubles",
  ete: "ete", ete_inversee: "ete",
  triangle_ascendant: "triangles", triangle_descendant: "triangles", triangle_symetrique: "triangles",
  drapeau_haussier: "drapeaux", drapeau_baissier: "drapeaux",
};

export function lessonForFigure(cle: string): string | null {
  const l = LECONS_FIGURES[cle];
  // La leçon 10 de la série traite double sommet, tête et épaules et triangle ;
  // les drapeaux restent dans l'ancien module.
  // Les drapeaux ne sont pas (encore) dans la série : pas de lien plutôt
  // qu'un lien vers une leçon qui n'en parle pas.
  if (l && l !== "drapeaux") return lessonHref("lecon/10");
  return null;
}
