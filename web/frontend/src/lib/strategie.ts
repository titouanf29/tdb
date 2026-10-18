/**
 * Ce que Nimbo sait dire d'une stratégie, côté écran : les idées de départ,
 * et pour chaque brique, une explication simple. Les règles exactes et leur
 * vérification sont calculées par le serveur (backend _strategie.py) ; ce
 * fichier ne décide rien, il explique.
 */

import type { ConditionStrategie, ReglesStrategie } from "./api";

export type TypeCondition = ConditionStrategie["type"];

export const IDEES: Array<{
  cle: string; titre: string; phrase: string; nimbo: string;
  conditions: ConditionStrategie[]; stop_atr: number; objectif_r: number; duree_max: number;
}> = [
  {
    cle: "tendance",
    titre: "Suivre la tendance",
    phrase: "Acheter ce qui monte déjà, tant que ça monte.",
    nimbo: "L'idée la plus simple : on ne cherche pas à deviner le retournement, on monte dans le train quand il roule. "
      + "On vérifie que le prix est au-dessus de sa moyenne longue, et que la moyenne courte est passée au-dessus de la longue.",
    conditions: [
      { type: "tendance_ma", periode: 200, position: "dessus" },
      { type: "croisement_ma", rapide: 20, lente: 50, sens: "haussier" },
    ],
    stop_atr: 2.5, objectif_r: 2.5, duree_max: 40,
  },
  {
    cle: "rebond",
    titre: "Acheter un rebond",
    phrase: "Profiter d'un repli dans une tendance qui reste bonne.",
    nimbo: "On attend qu'un actif solide recule un peu, puis qu'il reparte. Le RSI mesure si la baisse a été forte : "
      + "quand il repasse au-dessus de 40, le repli s'essouffle. La moyenne 200 garde le contexte : on n'achète que dans une tendance haussière.",
    conditions: [
      { type: "tendance_ma", periode: 200, position: "dessus" },
      { type: "rsi", seuil: 40, mode: "repasse_dessus" },
    ],
    stop_atr: 2, objectif_r: 2, duree_max: 20,
  },
  {
    cle: "cassure",
    titre: "Jouer une cassure",
    phrase: "Acheter quand le prix dépasse un plafond.",
    nimbo: "Quand le prix clôture au-dessus de son plus haut des 20 dernières séances, il sort d'une zone où il bloquait. "
      + "Un volume plus fort que d'habitude montre que des acheteurs suivent vraiment.",
    conditions: [
      { type: "cassure", periode: 20, sens: "haut" },
      { type: "volume", multiple: 1.5 },
    ],
    stop_atr: 2, objectif_r: 3, duree_max: 30,
  },
  {
    cle: "zero",
    titre: "Partir de zéro",
    phrase: "Composer ses propres règles, brique par brique.",
    nimbo: "Ajoutez les conditions une par une. Je vous dis à chaque fois ce qu'elles veulent dire, et si elles vont ensemble.",
    conditions: [],
    stop_atr: 2, objectif_r: 2, duree_max: 20,
  },
];

export const CATALOGUE: Record<TypeCondition, { titre: string; nimbo: string; defaut: ConditionStrategie }> = {
  tendance_ma: {
    titre: "Le prix par rapport à sa moyenne",
    nimbo: "Une moyenne lisse le prix sur plusieurs séances. Au-dessus de sa moyenne 200 (environ dix mois), un actif est "
      + "dans une tendance haussière de fond ; en dessous, baissière. La moyenne 50 dit la même chose sur deux mois et demi.",
    defaut: { type: "tendance_ma", periode: 200, position: "dessus" },
  },
  croisement_ma: {
    titre: "Une moyenne courte au-dessus d'une longue",
    nimbo: "Quand la moyenne des 20 dernières séances passe au-dessus de celle des 50, les prix récents sont plus hauts "
      + "que ceux d'avant : la tendance s'est retournée à la hausse. C'est plus lent qu'un signal, mais plus fiable.",
    defaut: { type: "croisement_ma", rapide: 20, lente: 50, sens: "haussier" },
  },
  rsi: {
    titre: "Le RSI (la force du mouvement)",
    nimbo: "Le RSI va de 0 à 100 et mesure la force des hausses récentes face aux baisses. Sous 30, l'actif a beaucoup "
      + "baissé (« survendu ») ; au-dessus de 70, beaucoup monté. « Repasse au-dessus de 30 » attend que la baisse s'arrête, "
      + "au lieu d'acheter en pleine chute.",
    defaut: { type: "rsi", seuil: 30, mode: "repasse_dessus" },
  },
  cassure: {
    titre: "La cassure d'un plus haut",
    nimbo: "Le plus haut des 20 dernières séances, c'est un plafond où les vendeurs ont repris la main. Quand le prix "
      + "clôture au-dessus, il est sorti de cette zone. Beaucoup de cassures échouent : le stop est indispensable.",
    defaut: { type: "cassure", periode: 20, sens: "haut" },
  },
  macd: {
    titre: "Le MACD",
    nimbo: "Le MACD compare une moyenne rapide et une moyenne lente. Quand il croise sa ligne de signal vers le haut, "
      + "l'élan redevient haussier. Il réagit vite, donc il donne aussi de faux départs.",
    defaut: { type: "macd", mode: "croise_dessus" },
  },
  volume: {
    titre: "Un volume plus fort que d'habitude",
    nimbo: "Le volume, c'est le nombre de titres échangés. Un mouvement avec un volume 1,5 fois supérieur à la moyenne "
      + "est soutenu par beaucoup d'acheteurs ; sans volume, il est fragile.",
    defaut: { type: "volume", multiple: 1.5 },
  },
  score_nimbo: {
    titre: "Mon score (Nimbo)",
    nimbo: "Mon score de 0 à 100 résume tendance, élan, volume et volatilité. À partir de 60, je vois une configuration "
      + "acheteuse. L'ajouter à vos règles, c'est me demander mon avis avant chaque entrée. Le test prend alors un peu plus de temps.",
    defaut: { type: "score_nimbo", min: 60 },
  },
};

export const REGLES_VIDES: ReglesStrategie = {
  nom: "Ma stratégie",
  sens: "achat",
  unite: "1d",
  conditions: [],
  stop_atr: 2,
  objectif_r: 2,
  duree_max: 20,
  risque_pct: 1,
  actifs: [],
};

/** « 2,5 » plutôt que « 2.5 ». */
export const v = (x: number, d = 1) => x.toLocaleString("fr-FR", { maximumFractionDigits: d });

/** Le pourcentage de trades à gagner pour ne pas perdre, avec cet objectif. */
export const seuilGain = (r: number) => Math.round((1 / (1 + r)) * 100);
