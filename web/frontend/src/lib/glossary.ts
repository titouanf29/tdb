import { TRADING_TOOLTIPS, type TooltipDefinition } from "@/components/LearnTooltip";

/**
 * Glossary entries that exist only here.
 *
 * Lifted out of the page component: a screen should decide how to show
 * definitions, not carry them. Everything the rest of the app explains in a
 * tooltip already lives in TRADING_TOOLTIPS, and the two are merged below so
 * a term is never defined twice with two different wordings.
 */
const EXTRA_TERMS: Record<string, TooltipDefinition> = {
  "Chandelier japonais": {
    simple: "Un graphique qui affiche l'ouverture, le haut, le bas et la fermeture d'un actif pour une période donnée.",
    standard: "Représentation visuelle des données de prix OHLC sur une période. Le corps montre ouv/clôt, les mèches montrent les extrêmes.",
    technical: "OHLC candle: corps = |Open − Close|, couleur = bullish (Close > Open) ou bearish. Mèche sup/inf = High/Low. Patterns: doji, marteau, englobante...",
    example: "Un marteau sur support = potentiel signal d'achat.",
    learnLink: "/learn",
  },
  "Volume": {
    simple: "Le nombre de transactions effectuées sur un actif pendant une période. Un fort volume confirme un mouvement de prix.",
    standard: "Volume = nb d'unités échangées. Volume élevé sur cassure = confirmation. Volume faible sur tendance = tendance fragile.",
    technical: "Volume Profile, VWAP, OBV (On-Balance Volume). Divergence volume/prix = signal de retournement.",
    example: "Cassure de résistance avec volume ×3 = signal haussier fiable.",
    learnLink: "/learn",
  },
  "Tendance": {
    simple: "La direction générale dans laquelle évolue le prix d'un actif : hausse, baisse ou horizontal.",
    standard: "Tendance haussière : sommets et creux plus hauts. Baissière : sommets et creux plus bas. Identification via EMA ou trendlines.",
    technical: "Théorie de Dow. Tendance primaire (mois-années), secondaire (semaines), tertiaire (jours). Structure en vagues (Elliott).",
    example: "Prix fait 3 plus hauts successifs → tendance haussière confirmée.",
    learnLink: "/learn",
  },
  "Levier": {
    simple: "Emprunter de l'argent au broker pour amplifier vos positions. x2 = gains et pertes doublés.",
    standard: "Levier = capital total / capital propre. x10 sur 1000€ = position 10 000€. Risque de liquidation si perte > capital.",
    technical: "Margin call = appel de marge quand equity < maintenance margin. Liquidation automatique = position fermée de force.",
    example: "Levier x10 sur BTC à 60k avec 1000€ = liquidation si BTC chute de 10%.",
    learnLink: "/learn",
  },
  "Swing Trading": {
    simple: "Garder des positions plusieurs jours à quelques semaines pour profiter des fluctuations de marché.",
    standard: "Horizon : 2 jours à 6 semaines. Analyse daily/H4. Objectif : capturer un swing complet (TP = prochain niveau clé).",
    technical: "Setup type : retracement sur support + confirmation chandelier + RSI divergence. R/R minimum 1:2. SL sous structure.",
    example: "BTC revient sur EMA 50 en daily avec RSI oversold → setup swing achat.",
    learnLink: "/learn",
  },
  "Scalping": {
    simple: "Ouvrir et fermer des positions très rapidement (secondes à minutes) pour cumuler de petits gains.",
    standard: "Timeframe : M1-M5. Nombreux trades par jour. Spread critique → broker ECN recommandé. Discipline extrême requise.",
    technical: "Focus sur Order Flow, DOM (Depth of Market), bid-ask spread. Indicateurs : VWAP, Level 2, tape reading.",
    example: "10 trades par jour à +0.2% chacun → +2% journalier (avant frais).",
    learnLink: "/learn",
  },
  "Day Trading": {
    simple: "Ouvrir et fermer toutes ses positions dans la même journée, sans garder de positions ouvertes la nuit.",
    standard: "Pas d'exposition overnight. Analyse M15-H1. Horaires clés : ouverture London (9h), ouverture NY (15h30).",
    technical: "Gap risk éliminé. Focus sur sessions liquides. PDH/PDL (Previous Day High/Low) comme niveaux clés.",
    example: "Achat EUR/USD à 9h30 Paris, vente à 11h → clôture avant 17h.",
    learnLink: "/learn",
  },
  "R/R (Risk/Reward)": {
    simple: "Le rapport entre ce que vous risquez de perdre et ce que vous espérez gagner. Un bon ratio est au moins 1:2.",
    standard: "R/R = distance TP / distance SL. Ratio 1:2 → 2€ gagnés pour 1€ risqué. Avec 50% de winrate, profitable à 1:2.",
    technical: "Expected Value = (WinRate × R) − ((1−WinRate) × 1). EV positif requis pour stratégie viable long terme.",
    example: "SL = 50 pips, TP = 150 pips → R/R = 1:3. Profitable même avec 40% de winrate.",
    learnLink: "/learn",
  },
  "Liquidité": {
    simple: "La facilité avec laquelle on peut acheter ou vendre un actif sans trop faire bouger son prix.",
    standard: "Actif liquide = spread serré, volume élevé, exécution rapide. Crypto small cap = faible liquidité = slippage élevé.",
    technical: "Market depth, bid-ask spread, market impact. Smart money chasse la liquidité (stops hunt, liquidity sweep).",
    example: "EUR/USD = très liquide (spread 0.1 pip). Petite crypto = illiquide (spread 5%).",
    learnLink: "/learn",
  },
  "PnL": {
    simple: "Profit and Loss, vos gains et pertes. PnL positif = vous gagnez, négatif = vous perdez.",
    standard: "PnL réalisé = clôtures. PnL non réalisé = positions ouvertes. PnL net = après frais et commissions.",
    technical: "PnL% = (Exit − Entry) / Entry × 100 × levier. Drawdown = max PnL négatif depuis le dernier pic.",
    example: "Achat BTC à 60k, vente à 63k → PnL = +5% (hors frais).",
    learnLink: "/learn",
  },
};

export const ALL_TERMS: Record<string, TooltipDefinition> = {
  ...TRADING_TOOLTIPS,
  ...EXTRA_TERMS,
};

export type { TooltipDefinition };
