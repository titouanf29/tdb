/**
 * Les questions du profil, et ce que chaque réponse déclenche.
 *
 * Elles vivent ici plutôt que dans l'écran parce qu'elles sont posées à deux
 * endroits — le dialogue d'accueil et les paramètres — et qu'une question
 * formulée différemment aux deux endroits donne l'impression de deux
 * réglages distincts.
 *
 * Le champ `effect` n'est pas une description commerciale : c'est ce qui est
 * affiché à l'utilisateur sous l'option, et il doit correspondre à du code.
 * Quand un effet disparaît du produit, la ligne disparaît d'ici.
 */

export interface ProfileOption {
  value: string;
  label: string;
  effect: string;
}

/** Pourquoi la personne est là. Décide de ce que l'accueil met en avant. */
export const GOALS: ProfileOption[] = [
  {
    value: "comprendre",
    label: "Comprendre comment ça marche",
    effect: "L'accueil ouvre sur le Parcours et la prochaine leçon.",
  },
  {
    value: "tester",
    label: "Tester des stratégies sans risque",
    effect: "L'accueil met en avant vos positions ouvertes et le wallet d'entraînement.",
  },
  {
    value: "suivre",
    label: "Suivre les actifs qui m'intéressent",
    effect: "L'accueil commence par vos favoris et l'état des marchés.",
  },
];

/** Ce qu'elle suit. Le premier choisi ouvre l'écran Marchés. */
export const MARKETS: ProfileOption[] = [
  { value: "europe", label: "Actions européennes", effect: "Paris, Francfort, Londres" },
  { value: "usa", label: "Actions américaines", effect: "Wall Street" },
  { value: "crypto", label: "Crypto", effect: "Ouvert en permanence" },
  { value: "devises", label: "Devises", effect: "Les paires de change" },
  { value: "matieres", label: "Matières premières", effect: "Or, pétrole, agricoles" },
];

/** Le temps disponible. Décide du rythme proposé au Parcours. */
export const TIMES: ProfileOption[] = [
  {
    value: "court",
    label: "Quelques minutes par jour",
    effect: "Le Parcours propose une leçon à la fois, jamais un module entier.",
  },
  {
    value: "moyen",
    label: "Une à deux heures par semaine",
    effect: "Le Parcours propose la suite d'un module.",
  },
  {
    value: "long",
    label: "Plusieurs heures par semaine",
    effect: "Le Parcours propose un module complet et les leçons avancées.",
  },
];

/** La clé de marché du site (MARKET_SYMBOLS / l'API) pour une préférence. */
export const MARKET_KEY: Record<string, string> = {
  europe: "EUROPE",
  usa: "USA",
  crypto: "CRYPTO",
  devises: "FOREX",
  matieres: "COMMODITIES",
};
