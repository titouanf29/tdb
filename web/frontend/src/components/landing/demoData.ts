/**
 * Illustrative data for the public page.
 *
 * Fixed, not fetched. The landing page has to render with the API closed (and
 * during maintenance it is), and a marketing page that quotes a live price it
 * cannot guarantee is worse than one that shows a clearly framed example. The
 * UI labels these as an illustration wherever they appear.
 */

export type LevelId = "discover" | "intermediate" | "advanced";

export interface DemoAsset {
  id: string;
  name: string;
  ticker: string;
  price: string;
  change: number;
  direction: "Haussier" | "Baissier" | "Neutre";
  score: number;
  /** Plain sentences — the "why", said the way a person would say it. */
  reasons: string[];
  /** Named factors with a 0-100 reading. */
  factors: { label: string; value: number }[];
  risk: string;
  /** The advanced layer: what the engine actually computes. */
  advanced: { label: string; value: string }[];
  series: number[];
  support: number;
  resistance: number;
}

const s = (seed: number[], n = 48): number[] => {
  // Interpolate a handful of anchor points into a smooth-enough series.
  const out: number[] = [];
  const step = (seed.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) {
    const p = i * step;
    const a = Math.floor(p);
    const b = Math.min(seed.length - 1, a + 1);
    const t = p - a;
    const eased = t * t * (3 - 2 * t);
    out.push(seed[a] + (seed[b] - seed[a]) * eased);
  }
  return out;
};

export const DEMO_ASSETS: DemoAsset[] = [
  {
    id: "apple",
    name: "Apple",
    ticker: "AAPL",
    price: "245,18 €",
    change: 1.42,
    direction: "Haussier",
    score: 78,
    reasons: [
      "La tendance de fond est orientée à la hausse.",
      "Le momentum accompagne le mouvement, sans excès.",
      "Les volumes confirment les dernières séances.",
      "Une résistance se trouve à proximité — c'est le point de vigilance.",
    ],
    factors: [
      { label: "Tendance", value: 86 },
      { label: "Momentum", value: 74 },
      { label: "Volume", value: 69 },
      { label: "Volatilité", value: 41 },
    ],
    risk: "Modéré",
    advanced: [
      { label: "Trend factor", value: "+0,82" },
      { label: "Momentum factor", value: "+0,61" },
      { label: "Flow factor", value: "+0,44" },
      { label: "Volatilité (percentile)", value: "38ᵉ" },
      { label: "Régime de marché", value: "Haussier" },
      { label: "Probabilité estimée", value: "61 %" },
      { label: "Espérance", value: "+0,34 R" },
      { label: "Risque / rendement", value: "1 : 2,1" },
    ],
    series: s([100, 98, 103, 101, 107, 112, 109, 116, 121, 119, 127, 131]),
    support: 101,
    resistance: 130,
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    ticker: "BTC",
    price: "97 420 €",
    change: 2.18,
    direction: "Haussier",
    score: 71,
    reasons: [
      "La dynamique reste positive sur l'horizon observé.",
      "Le momentum s'essouffle légèrement par rapport au mois dernier.",
      "La volatilité est nettement au-dessus de sa normale.",
      "Le dimensionnement de la position compte plus que la direction ici.",
    ],
    factors: [
      { label: "Tendance", value: 79 },
      { label: "Momentum", value: 58 },
      { label: "Volume", value: 72 },
      { label: "Volatilité", value: 84 },
    ],
    risk: "Élevé",
    advanced: [
      { label: "Trend factor", value: "+0,64" },
      { label: "Momentum factor", value: "+0,22" },
      { label: "Flow factor", value: "+0,51" },
      { label: "Volatilité (percentile)", value: "87ᵉ" },
      { label: "Régime de marché", value: "Haussier" },
      { label: "Probabilité estimée", value: "54 %" },
      { label: "Espérance", value: "+0,19 R" },
      { label: "Risque / rendement", value: "1 : 2,4" },
    ],
    series: s([100, 112, 104, 121, 114, 132, 126, 141, 133, 148, 140, 152]),
    support: 108,
    resistance: 150,
  },
  {
    id: "tesla",
    name: "Tesla",
    ticker: "TSLA",
    price: "254,88 €",
    change: -1.07,
    direction: "Neutre",
    score: 48,
    reasons: [
      "Les signaux se contredisent : la tendance courte s'oppose à la tendance longue.",
      "Le momentum est plat.",
      "Les volumes sont en retrait.",
      "Dans ce cas, ne rien faire est une décision valable.",
    ],
    factors: [
      { label: "Tendance", value: 46 },
      { label: "Momentum", value: 49 },
      { label: "Volume", value: 38 },
      { label: "Volatilité", value: 62 },
    ],
    risk: "Modéré",
    advanced: [
      { label: "Trend factor", value: "−0,08" },
      { label: "Momentum factor", value: "+0,03" },
      { label: "Flow factor", value: "−0,21" },
      { label: "Volatilité (percentile)", value: "64ᵉ" },
      { label: "Régime de marché", value: "Neutre" },
      { label: "Probabilité estimée", value: "49 %" },
      { label: "Espérance", value: "−0,02 R" },
      { label: "Risque / rendement", value: "1 : 1,6" },
    ],
    series: s([100, 106, 99, 108, 101, 104, 97, 105, 100, 103, 98, 101]),
    support: 97,
    resistance: 108,
  },
  {
    id: "gold",
    name: "Or",
    ticker: "GC=F",
    price: "2 412 €",
    change: 0.38,
    direction: "Haussier",
    score: 66,
    reasons: [
      "La tendance longue est solide et régulière.",
      "Le momentum est modéré — le mouvement est lent, pas faible.",
      "La volatilité reste sous sa moyenne.",
      "C'est un profil d'horizon long plutôt que de séance.",
    ],
    factors: [
      { label: "Tendance", value: 81 },
      { label: "Momentum", value: 55 },
      { label: "Volume", value: 51 },
      { label: "Volatilité", value: 28 },
    ],
    risk: "Faible",
    advanced: [
      { label: "Trend factor", value: "+0,71" },
      { label: "Momentum factor", value: "+0,18" },
      { label: "Flow factor", value: "+0,09" },
      { label: "Volatilité (percentile)", value: "22ᵉ" },
      { label: "Régime de marché", value: "Haussier" },
      { label: "Probabilité estimée", value: "57 %" },
      { label: "Espérance", value: "+0,21 R" },
      { label: "Risque / rendement", value: "1 : 1,9" },
    ],
    series: s([100, 102, 101, 105, 104, 108, 110, 109, 113, 115, 114, 118]),
    support: 103,
    resistance: 117,
  },
  {
    id: "sp500",
    name: "S&P 500",
    ticker: "^GSPC",
    price: "5 842",
    change: 0.61,
    direction: "Haussier",
    score: 74,
    reasons: [
      "L'indice de référence est lui-même en régime haussier.",
      "La progression est large, portée par l'ensemble de la cote.",
      "La volatilité est faible.",
      "C'est le contexte dans lequel les autres actifs sont évalués.",
    ],
    factors: [
      { label: "Tendance", value: 83 },
      { label: "Momentum", value: 68 },
      { label: "Volume", value: 60 },
      { label: "Volatilité", value: 31 },
    ],
    risk: "Faible",
    advanced: [
      { label: "Trend factor", value: "+0,77" },
      { label: "Momentum factor", value: "+0,42" },
      { label: "Flow factor", value: "+0,28" },
      { label: "Volatilité (percentile)", value: "26ᵉ" },
      { label: "Régime de marché", value: "Haussier" },
      { label: "Probabilité estimée", value: "59 %" },
      { label: "Espérance", value: "+0,26 R" },
      { label: "Risque / rendement", value: "1 : 2,0" },
    ],
    series: s([100, 101, 104, 103, 107, 106, 110, 113, 112, 117, 119, 122]),
    support: 104,
    resistance: 121,
  },
];

export const LEVELS: { value: LevelId; label: string }[] = [
  { value: "discover", label: "Découverte" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];
