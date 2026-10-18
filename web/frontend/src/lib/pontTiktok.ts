/**
 * Les leçons TikTok (numérotées dans le plan de la série, dépôt BotPc) et ce
 * qui leur répond dans l'onglet Apprendre. « couverte » : une leçon du site
 * traite le même sujet ; « partielle » : le sujet n'y est qu'en passant.
 * Une leçon absente d'ici n'a encore rien sur le site.
 *
 * À tenir à jour quand une leçon est écrite côté site : c'est ce qui permet à
 * l'admin de dire ce qui manque, et à un visiteur venu d'une vidéo de
 * retrouver sa leçon.
 */

export type Couverture = { lecons: string[]; niveau: "couverte" | "partielle"; note?: string };

export const COUVERTURE: Record<number, Couverture> = {
  1: { lecons: ["reading-charts"], niveau: "couverte" },
  2: { lecons: ["stocks", "crypto", "forex"], niveau: "partielle", note: "l'or et les indices manquent" },
  3: { lecons: ["reading-charts"], niveau: "partielle", note: "les bougies n'ont pas leur leçon" },
  4: { lecons: ["rsi-divergence"], niveau: "partielle", note: "seulement les divergences" },
  6: { lecons: ["trend-indicators"], niveau: "partielle" },
  7: { lecons: ["risk-basics"], niveau: "couverte" },
  8: { lecons: ["trend-indicators"], niveau: "partielle", note: "le MACD en passant" },
  11: { lecons: ["emotions-trading"], niveau: "couverte" },
  14: { lecons: ["order-types", "market-vs-limit"], niveau: "couverte" },
  17: { lecons: ["forex"], niveau: "partielle" },
  19: { lecons: ["position-sizing"], niveau: "couverte" },
  24: { lecons: ["trading-plan"], niveau: "couverte" },
  26: { lecons: [], niveau: "partielle", note: "l'outil Ma stratégie, pas encore de leçon" },
  28: { lecons: ["trend-following"], niveau: "partielle" },
  33: { lecons: ["support-resistance"], niveau: "couverte" },
};
