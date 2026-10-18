/**
 * Le sommaire de la série : chaque leçon porte le numéro de sa vidéo TikTok
 * (celui que le visiteur a entendu : « la leçon 33 »), et elles sont rangées
 * par chapitres dans l'ordre où l'on progresse. Le contenu de chaque leçon
 * est chargé à la demande (lecons/NN.tsx).
 *
 * La source : le plan de la série (dépôt BotPc, branche videos-tiktok,
 * videos/PLAN.md). Une leçon ajoutée au plan s'ajoute ici et dans lecons/.
 */

export type ChapitreId = "lire" | "marches" | "ordres" | "risque" | "indicateurs" | "signaux" | "tenir";

export interface Chapitre { id: ChapitreId; titre: string; resume: string; lecons: number[] }

export interface FicheLecon {
  numero: number;
  slug: string;
  titre: string;
  /** Le titre court, pour les listes. */
  court: string;
  duree: string;
  resume: string;
}

export const CHAPITRES: Chapitre[] = [
  { id: "lire", titre: "Lire un graphique", resume: "Les axes, les bougies, la tendance, et les niveaux où le prix réagit.", lecons: [1, 3, 28, 29, 33, 34] },
  { id: "marches", titre: "Les marchés et leurs horaires", resume: "Ce qu'on achète, quand ça bouge, et pourquoi tout le monde regarde l'or.", lecons: [2, 12, 13, 5] },
  { id: "ordres", titre: "Passer un ordre, et ce qu'il coûte", resume: "Les ordres, acheter ou vendre, et chaque frais qui se cache dans un trade.", lecons: [14, 15, 16, 17, 18, 21, 22] },
  { id: "risque", titre: "Gérer son risque", resume: "Le stop, la taille de position, le plan : ce qui sépare le trader du joueur.", lecons: [7, 19, 20, 24, 23] },
  { id: "indicateurs", titre: "Les indicateurs", resume: "Moyennes mobiles, RSI, MACD, Bollinger, Fibonacci : ce qu'ils mesurent, et leurs pièges.", lecons: [6, 4, 8, 9, 25] },
  { id: "signaux", titre: "Les signaux du prix", resume: "Cassures, retours, pin bars et figures : lire ce que le prix raconte.", lecons: [30, 31, 32, 10] },
  { id: "tenir", titre: "Tester, se protéger, tenir", resume: "Tester une idée sur le passé, repérer les arnaques, et tenir face à ses émotions.", lecons: [26, 27, 11] },
];

export const FICHES: FicheLecon[] = [
  { numero: 1, slug: "lire-un-graphique", titre: "Comment lire un graphique", court: "Lire un graphique", duree: "12 min", resume: "Les deux axes, la ligne et les bougies, la tendance, et l'unité de temps." },
  { numero: 2, slug: "quel-marche", titre: "Forex, or, crypto, actions : quel marché choisir ?", court: "Quel marché choisir", duree: "12 min", resume: "Ce qu'on achète sur chaque marché, ses horaires, sa façon de bouger." },
  { numero: 3, slug: "les-bougies", titre: "Les bougies japonaises, bien expliquées", court: "Les bougies japonaises", duree: "14 min", resume: "Les quatre prix, le corps, les mèches, et trois bougies à connaître." },
  { numero: 4, slug: "le-rsi", titre: "Le RSI, simplement", court: "Le RSI", duree: "12 min", resume: "La force des hausses face aux baisses, 70 et 30, et la divergence." },
  { numero: 5, slug: "l-or", titre: "Le gold (l'or) pour les débutants", court: "L'or", duree: "20 min", resume: "Ce qu'est l'or en trading, pourquoi il bouge, ses risques, et une méthode." },
  { numero: 6, slug: "moyennes-mobiles", titre: "Les moyennes mobiles", court: "Les moyennes mobiles", duree: "12 min", resume: "La 20, la 50, la 200, et les croisements : la tendance lissée." },
  { numero: 7, slug: "gerer-son-risque", titre: "Gérer son risque", court: "Gérer son risque", duree: "14 min", resume: "Le stop loss, le take profit, le ratio risque / rendement, le 1 %." },
  { numero: 8, slug: "le-macd", titre: "Le MACD", court: "Le MACD", duree: "12 min", resume: "Deux moyennes, leur écart, la ligne de signal et l'histogramme." },
  { numero: 9, slug: "bandes-de-bollinger", titre: "Les bandes de Bollinger", court: "Les bandes de Bollinger", duree: "12 min", resume: "La volatilité qui s'écarte et se resserre, le squeeze, la cassure." },
  { numero: 10, slug: "figures-chartistes", titre: "Les figures chartistes", court: "Les figures chartistes", duree: "16 min", resume: "Double sommet, tête et épaules, triangle : les dessins que le prix refait." },
  { numero: 11, slug: "psychologie", titre: "La psychologie du trader", court: "La psychologie du trader", duree: "14 min", resume: "Peur, avidité, FOMO, revanche : les émotions qui décident à votre place." },
  { numero: 12, slug: "les-sessions", titre: "Les sessions : Tokyo, Londres, New York", court: "Les sessions", duree: "10 min", resume: "Le marché qui passe de ville en ville, et l'heure où il s'agite." },
  { numero: 13, slug: "les-annonces", titre: "Les annonces économiques", court: "Les annonces économiques", duree: "12 min", resume: "Le calendrier, le précédent, le prévu, le publié : la surprise qui fait bouger." },
  { numero: 14, slug: "les-ordres", titre: "Les ordres : au marché, à cours limité, stop", court: "Les ordres", duree: "14 min", resume: "Quel ordre pour quel besoin, et comment chacun se déclenche." },
  { numero: 15, slug: "long-et-short", titre: "Acheter ou vendre : long et short", court: "Long et short", duree: "10 min", resume: "Gagner à la hausse comme à la baisse, et ce qui change pour le stop." },
  { numero: 16, slug: "le-spread", titre: "Le spread : ce que vous coûte chaque trade", court: "Le spread", duree: "10 min", resume: "Le bid, l'ask, l'écart entre les deux, et le seuil de rentabilité." },
  { numero: 17, slug: "pip-et-lot", titre: "Le pip et le lot", court: "Le pip et le lot", duree: "12 min", resume: "Le petit pas du prix, la taille d'une position, et ce que vaut un pip." },
  { numero: 18, slug: "effet-de-levier", titre: "L'effet de levier", court: "L'effet de levier", duree: "12 min", resume: "La marge, le levier, l'appel de marge, et le vrai piège." },
  { numero: 19, slug: "taille-de-position", titre: "Calculer la taille de sa position", court: "La taille de position", duree: "12 min", resume: "Le calcul en trois étapes pour ne jamais risquer plus que prévu." },
  { numero: 20, slug: "erreurs-debutants", titre: "Les erreurs qui coûtent cher aux débutants", court: "Les erreurs des débutants", duree: "12 min", resume: "Cinq erreurs et le bon réflexe pour chacune." },
  { numero: 21, slug: "commission-et-swap", titre: "Les autres frais : la commission et le swap", court: "Commission et swap", duree: "10 min", resume: "Ce que coûte vraiment un trade gardé plusieurs jours." },
  { numero: 22, slug: "le-slippage", titre: "Le slippage : quand votre prix vous échappe", court: "Le slippage", duree: "10 min", resume: "L'écart entre le prix demandé et le prix obtenu, et le gap." },
  { numero: 23, slug: "le-compte-demo", titre: "Le compte démo : s'entraîner sans risquer son argent", court: "Le compte démo", duree: "10 min", resume: "Bien s'en servir, ses limites, et quand passer au réel." },
  { numero: 24, slug: "plan-de-trading", titre: "Le plan de trading, étape par étape", court: "Le plan de trading", duree: "14 min", resume: "Six questions, six réponses, écrites avant de trader." },
  { numero: 25, slug: "fibonacci", titre: "Fibonacci", court: "Fibonacci", duree: "18 min", resume: "D'où viennent les chiffres, tracer un retracement, viser une extension." },
  { numero: 26, slug: "le-backtest", titre: "Le backtest : tester une idée sur le passé", court: "Le backtest", duree: "12 min", resume: "Rejouer son plan sur le passé, sans tricher, avant d'y mettre de l'argent." },
  { numero: 27, slug: "reperer-une-arnaque", titre: "Repérer une arnaque au trading", court: "Repérer une arnaque", duree: "10 min", resume: "Les quatre signes, la pyramide de Ponzi, et où vérifier." },
  { numero: 28, slug: "structure-du-marche", titre: "La structure du marché : sommets et creux", court: "La structure du marché", duree: "12 min", resume: "Le zigzag du prix, l'escalier qui monte, et le creux à surveiller." },
  { numero: 29, slug: "ligne-de-tendance", titre: "Tracer une ligne de tendance", court: "La ligne de tendance", duree: "12 min", resume: "Deux creux, une règle, la confirmation, et la cassure." },
  { numero: 30, slug: "cassure-et-fausse-cassure", titre: "La cassure et la fausse cassure", court: "La cassure", duree: "12 min", resume: "La vraie cassure se voit à la clôture ; la fausse est un piège." },
  { numero: 31, slug: "le-pullback", titre: "Le pullback : le retour sur la cassure", court: "Le pullback", duree: "12 min", resume: "Le retour sur le niveau cassé, et comment y entrer." },
  { numero: 32, slug: "la-pin-bar", titre: "La pin bar : la bougie qui dit non", court: "La pin bar", duree: "10 min", resume: "Une longue mèche sur un niveau : le prix a été refusé." },
  { numero: 33, slug: "supports-et-resistances", titre: "Les supports et les résistances, en détail", court: "Supports et résistances", duree: "14 min", resume: "Pourquoi le prix rebondit au même endroit, et comment tracer ses zones." },
  { numero: 34, slug: "le-range", titre: "Le range : quand le prix ne choisit pas", court: "Le range", duree: "12 min", resume: "Un couloir entre un plancher et un plafond, et comment le trader." },
];

export function fiche(numero: number): FicheLecon | undefined {
  return FICHES.find((f) => f.numero === numero);
}

export function chapitreDe(numero: number): Chapitre | undefined {
  return CHAPITRES.find((c) => c.lecons.includes(numero));
}

/** L'ordre de lecture conseillé : chapitre après chapitre. */
export const ORDRE: number[] = CHAPITRES.flatMap((c) => c.lecons);

export function voisines(numero: number): { avant?: FicheLecon; apres?: FicheLecon } {
  const i = ORDRE.indexOf(numero);
  return { avant: i > 0 ? fiche(ORDRE[i - 1]) : undefined, apres: i >= 0 && i < ORDRE.length - 1 ? fiche(ORDRE[i + 1]) : undefined };
}
