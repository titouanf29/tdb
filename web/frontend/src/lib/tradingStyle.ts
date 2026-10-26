/**
 * Trading style — the single source of truth.
 *
 * The style already lived in `web_user_settings.trading_style` and in the
 * Settings screen, but nothing downstream read it: the Gold Hub kept its own
 * private copy (with a different key, "scalping" vs "scalp") and every other
 * page hard-coded a 1d timeframe. Everything style-dependent now resolves
 * through here so a scalper and a long-term investor genuinely get a
 * different product.
 */

import { useMemo } from "react";
import { useSettings } from "@/lib/SettingsContext";

export type TradingStyleId = "scalp" | "day" | "swing" | "long";

export interface TradingStyleProfile {
  id: TradingStyleId;
  emoji: string;
  label: { fr: string; en: string };
  horizon: { fr: string; en: string };
  /** One line, said the way a trader would say it — not a definition. */
  pitch: { fr: string; en: string };
  /** Chart timeframes this style actually reads. */
  timeframes: string[];
  defaultTimeframe: string;
  /** Fenêtre du graphique pour cet horizon : période demandée et unité.
   *
   *  Elle était figée à « 3 mois en journalier » quel que soit le style. En
   *  long terme, cela donnait treize bougies hebdomadaires — trop peu pour
   *  qu'une structure de tendance existe, et le graphique commenté renvoyait
   *  « pas assez de sommets et de creux ». Un horizon de plusieurs années
   *  regardé sur trois mois n'est pas un horizon de plusieurs années. */
  chartWindow: { period: string; interval: string };
  /**
   * Cadence de rafraîchissement des cours, en secondes.
   *
   * Elle était figée à 30 s partout. Pour un investisseur long terme c'est
   * déjà vingt fois trop souvent ; pour un scalpeur dont l'horizon entier
   * tient en cinq minutes, une demi-minute de retard est une éternité — le
   * graphique TradingView bougeait sous ses yeux pendant que le cours de sa
   * position restait figé à côté.
   *
   * Le rythme suit donc l'horizon, et c'est le backend qui protège le
   * fournisseur : un cache de quelques secondes sur les cotations découple
   * la cadence de l'écran du débit sortant (voir _prices.py).
   */
  refreshSeconds: number;
  /** What to look at first on the analysis screen. */
  focus: { fr: string[]; en: string[] };
  /** ATR multiples used for suggested stop / target distances. */
  atr: { sl: number; tp: number };
  /** Share of the fundamentals in the profile-weighted score, 0-0.5. A
   *  scalper's edge has nothing to do with a balance sheet; a multi-year
   *  investor's has a great deal. Applied server-side only when the data
   *  actually exists for the asset. */
  fundWeight: number;
  /** Advice written for this horizon — generic tips help nobody. */
  tips: { fr: string[]; en: string[] };
  /** Terminal palette. Gold stays the default (day); the rest differentiate. */
  accent: string;
  dot: string;
  chip: string;
}

export const TRADING_STYLE_IDS: TradingStyleId[] = ["scalp", "day", "swing", "long"];

export const TRADING_STYLES: Record<TradingStyleId, TradingStyleProfile> = {
  scalp: {
    id: "scalp",
    emoji: "⚡",
    label: { fr: "Scalping", en: "Scalping" },
    horizon: { fr: "1 – 15 min", en: "1 – 15 min" },
    pitch: {
      fr: "Des dizaines d'allers-retours par séance. Le spread et l'exécution décident du résultat.",
      en: "Dozens of round trips a session. Spread and execution decide the outcome.",
    },
    timeframes: ["5m", "15m", "30m"],
    defaultTimeframe: "5m",
    chartWindow: { period: "5d", interval: "15m" },
    refreshSeconds: 5,
    focus: {
      fr: ["Volume", "RSI 5 min", "Spread", "Niveaux intraday"],
      en: ["Volume", "5-min RSI", "Spread", "Intraday levels"],
    },
    // Stop à 4 ATR (et non 0,6). Mesuré sur 40 actifs, 60 jours de bougies de
    // 5 min, frais de 10 points de base par côté : avec 0,6 ATR, les frais
    // valaient à eux seuls 5 fois le risque, et le plan perdait ~5 R par
    // trade. À 4 ATR, la perte tombe vers 0,6 R. Aucun réglage testé n'est
    // gagnant après frais : le profil le dit (tips).
    atr: { sl: 4.0, tp: 6.0 },
    fundWeight: 0,
    tips: {
      fr: [
        "Le spread est votre premier adversaire. Sur 20 trades à 0,05 %, vous avez perdu 1 % avant d'avoir eu raison une seule fois.",
        "Mesuré sur 40 actifs : en bougies de 5 minutes, avec des frais de 0,1 % par ordre, aucun plan testé n'a été gagnant. Un stop serré (0,6 ATR) fait payer aux frais 5 fois le risque pris, d'où un stop large ici.",
        "Les 30 premières minutes après l'ouverture concentrent le volume. Le reste de la séance, vous payez le spread pour rien.",
        "Un RSI en 5 min repasse sous 30 dix fois par séance. Ce n'est pas un signal, c'est du bruit.",
        "Sortez sur objectif, pas sur espoir. Le trade qui « va revenir » ne revient jamais assez vite.",
        "Trois pertes d'affilée : coupez l'écran. En scalp, la spirale se referme en dix minutes.",
      ],
      en: [
        "Spread is your first opponent. Twenty trades at 0.05% and you're down 1% before being right once.",
        "Measured on 40 assets: on 5-minute bars, with 0.1% fees per order, no tested plan was profitable. A tight stop (0.6 ATR) makes fees cost 5 times the risk taken, hence a wide stop here.",
        "The first 30 minutes after the open hold the volume. The rest of the session you pay spread for nothing.",
        "A 5-min RSI dips under 30 ten times a session. That's not a signal, that's noise.",
        "Exit on target, not on hope. The trade that's \"coming back\" never comes back fast enough.",
        "Three losses in a row: close the screen. In scalping the spiral takes ten minutes to shut.",
      ],
    },
    accent: "text-[hsl(var(--accent))]",
    dot: "bg-[hsl(var(--accent))]",
    chip: "border-[hsl(var(--accent))]/35 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
  },

  day: {
    id: "day",
    emoji: "📈",
    label: { fr: "Day Trading", en: "Day Trading" },
    horizon: { fr: "15 min – 1 h", en: "15 min – 1 h" },
    pitch: {
      fr: "Une séance, un plan. Tout est fermé avant la cloche.",
      en: "One session, one plan. Everything closed before the bell.",
    },
    timeframes: ["15m", "30m", "1h", "4h"],
    defaultTimeframe: "1h",
    chartWindow: { period: "1mo", interval: "1h" },
    refreshSeconds: 15,
    focus: {
      fr: ["VWAP", "Range d'ouverture", "MACD 15 min", "Volume"],
      en: ["VWAP", "Opening range", "15-min MACD", "Volume"],
    },
    // Stop à 4 ATR, objectif 6 ATR (et non 1 et 2). Mesuré sur 40 actifs,
    // 2 ans de bougies d'une heure, sortie à 10 bougies, frais de 10 points
    // de base par côté : −0,12 R par trade au lieu de −0,50 R sur la période
    // jamais vue. Les frais coûtaient 0,59 R avec un stop à 1 ATR, 0,15 R à
    // 4 ATR. Toujours pas gagnant après frais : le profil le dit (tips).
    atr: { sl: 4.0, tp: 6.0 },
    fundWeight: 0.05,
    tips: {
      fr: [
        "Mesuré sur 40 actifs et 2 ans de bougies d'une heure : avec des frais de 0,1 % par ordre, aucun plan testé n'a été gagnant. Un stop serré (1 ATR) laisse aux frais 0,6 fois le risque à chaque trade, d'où un stop large ici.",
        "Le biais du jour se décide avant l'ouverture, pas pendant. Sans plan à 9 h, vous réagissez au lieu de trader.",
        "Le VWAP n'a rien de magique : c'est le prix moyen payé aujourd'hui. Au-dessus, les acheteurs mènent.",
        "Clôturez avant la fin de séance. Garder une position day sur la nuit, c'est changer de métier sans l'avoir décidé.",
        "Le range de la première heure encadre souvent toute la journée. Notez-le, tradez ses bords.",
        "Une cassure sans volume à l'ouverture US se rétracte presque toujours.",
        "Deux bons trades valent mieux que huit corrects. Le sur-trading est la maladie du day trader.",
      ],
      en: [
        "Measured on 40 assets over 2 years of hourly bars: with 0.1% fees per order, no tested plan was profitable. A tight stop (1 ATR) leaves fees 0.6 times the risk on every trade, hence a wide stop here.",
        "The day's bias is set before the open, not during. Without a plan at 9am you're reacting, not trading.",
        "VWAP isn't magic: it's the average price paid today. Above it, buyers are in charge.",
        "Close before the session ends. Holding a day trade overnight is changing jobs without deciding to.",
        "The first hour's range frames the whole day more often than not. Mark it, trade its edges.",
        "A breakout on no volume at the US open almost always fades.",
        "Two good trades beat eight decent ones. Overtrading is the day trader's disease.",
      ],
    },
    accent: "text-primary",
    dot: "bg-primary",
    chip: "border-primary/35 bg-primary/10 text-primary",
  },

  swing: {
    id: "swing",
    emoji: "🌊",
    label: { fr: "Swing", en: "Swing" },
    horizon: { fr: "Jours – semaines", en: "Days – weeks" },
    pitch: {
      fr: "Quelques jours de portage. Le calendrier macro compte autant que le graphique.",
      en: "A few days of carry. The macro calendar matters as much as the chart.",
    },
    timeframes: ["4h", "1d", "3d"],
    defaultTimeframe: "1d",
    chartWindow: { period: "6mo", interval: "1d" },
    refreshSeconds: 60,
    focus: {
      fr: ["EMA 20 / 50", "RSI daily", "ATR", "Figures techniques"],
      en: ["EMA 20 / 50", "Daily RSI", "ATR", "Chart patterns"],
    },
    // Objectif à 4,5 ATR (et non 3), tenu jusqu'à 20 séances : mesuré sur
    // 40 actifs et 5 ans, les achats du moteur 2.1 — qui achète les replis —
    // rapportent +0,33 R par trade sur la période jamais vue, contre +0,20 R
    // avec l'ancien réglage (3 ATR, 10 séances). Un rebond prend du temps.
    atr: { sl: 1.5, tp: 4.5 },
    fundWeight: 0.2,
    tips: {
      fr: [
        "Une position ouverte la veille d'un CPI est un pari, pas un trade. Regardez le calendrier avant le graphique.",
        "Le daily décide, le 4 h exécute. Inverser les deux, c'est prendre du bruit pour un signal.",
        "Un R/R sous 1:2 ne paie pas en swing : vous immobilisez du capital plusieurs jours pour une miette.",
        "Le gap d'ouverture est le prix à payer du swing. Dimensionnez en pensant au pire lundi matin.",
        "Une figure met des jours à se former. La regarder toutes les heures ne l'accélère pas.",
        "Si la tendance daily est baissière, un rebond en 4 h reste un rebond, pas un retournement.",
      ],
      en: [
        "A position opened the day before a CPI print is a bet, not a trade. Check the calendar before the chart.",
        "The daily decides, the 4h executes. Swap them and you're trading noise as if it were signal.",
        "Anything under 1:2 R/R doesn't pay in swing: you tie up capital for days to collect crumbs.",
        "The opening gap is the price of swing trading. Size for the worst Monday morning.",
        "A pattern takes days to form. Checking it hourly doesn't speed it up.",
        "If the daily trend is down, a 4h bounce is still a bounce, not a reversal.",
      ],
    },
    accent: "text-neon-purple",
    dot: "bg-neon-purple",
    chip: "border-neon-purple/35 bg-neon-purple/10 text-neon-purple",
  },

  long: {
    id: "long",
    emoji: "🏔",
    label: { fr: "Long terme", en: "Long term" },
    horizon: { fr: "Plusieurs années", en: "Multiple years" },
    pitch: {
      fr: "Vous achetez une trajectoire sur plusieurs années. Ni le bruit quotidien ni le trimestre en cours ne vous concernent.",
      en: "You're buying a multi-year trajectory. Neither daily noise nor this quarter is your problem.",
    },
    timeframes: ["1w", "1mo"],
    defaultTimeframe: "1mo",
    chartWindow: { period: "2y", interval: "1wk" },
    refreshSeconds: 300,
    focus: {
      fr: ["EMA 200", "Tendance mensuelle", "Contexte macro", "Fondamentaux"],
      en: ["EMA 200", "Monthly trend", "Macro backdrop", "Fundamentals"],
    },
    // Deliberately wide: on a multi-year horizon an ATR-tight stop is noise,
    // and the real invalidation is structural (a durable loss of the EMA200).
    // Stop 2 ATR, objectif 6 ATR, tenu jusqu'à 40 bougies (et non 4 / 8 / 10).
    // Mesuré sur 40 actifs (hebdomadaire 10 ans, mensuel historiques
    // complets) : +0,59 R et +1,03 R par trade sur la période jamais vue,
    // contre +0,16 R et +0,26 R. À cet horizon, la durée paie plus que le
    // moment d'entrée — aucun score n'y bat l'achat systématique.
    atr: { sl: 2.0, tp: 6.0 },
    fundWeight: 0.45,
    tips: {
      fr: [
        "Sur plusieurs années, le point d'entrée compte moins que le fait d'y être resté.",
        "Le RSI journalier ne vous sert à rien sur cinq ans. Regardez le mensuel, ou ne regardez rien.",
        "Un DCA régulier bat statistiquement la plupart des tentatives de timing. Y compris les vôtres.",
        "Une position long terme se dimensionne pour survivre à une baisse de 30 %, pas pour maximiser le rebond.",
        "Les banques centrales déplacent plus les marchés sur un an que n'importe quelle figure chartiste.",
        "Consulter son portefeuille tous les jours sur un horizon de 5 ans, c'est du stress sans un euro de plus.",
      ],
      en: [
        "Over years, where you entered matters less than the fact you stayed in.",
        "Daily RSI tells you nothing over five years. Read the monthly, or read nothing.",
        "Steady DCA statistically beats most attempts at timing. Including yours.",
        "Size a long-term position to survive a 30% drawdown, not to maximise the bounce.",
        "Central banks move markets over a year more than any chart pattern ever will.",
        "Checking your portfolio daily on a 5-year horizon is stress with no extra euro attached.",
      ],
    },
    accent: "text-profit",
    dot: "bg-profit",
    chip: "border-profit/35 bg-profit/10 text-profit",
  },
};

/** Accepts anything stored historically ("scalping" from the Gold Hub, an old
 *  value, undefined) and always lands on a valid style. */
export function resolveStyleId(raw: string | null | undefined): TradingStyleId {
  const v = (raw ?? "").toLowerCase().trim();
  if (v === "scalp" || v === "scalping") return "scalp";
  if (v === "swing") return "swing";
  if (v === "long" || v === "long_term" || v === "longterm") return "long";
  return "day";
}

export function getStyle(raw: string | null | undefined): TradingStyleProfile {
  return TRADING_STYLES[resolveStyleId(raw)];
}

/** Deterministic per-day rotation so the tip is stable within a session but
 *  changes tomorrow — a tip that reshuffles on every render reads as noise. */
export function dailyTip(style: TradingStyleProfile, lang: "fr" | "en", offset = 0): string {
  const pool = style.tips[lang];
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[(day + offset) % pool.length];
}

/** The active style for the signed-in user. */
export function useTradingStyle(): TradingStyleProfile {
  const { settings } = useSettings();
  return useMemo(() => getStyle(settings.tradingStyle), [settings.tradingStyle]);
}
