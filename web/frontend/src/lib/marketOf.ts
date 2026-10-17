/**
 * De quel marché relève un symbole, et ce que cela dit de la dernière cotation.
 *
 * Née d'une confusion réelle : un utilisateur a vu le graphique d'Apple
 * s'arrêter le vendredi 18 septembre à 22 h et en a conclu que les données
 * étaient cassées. Elles ne l'étaient pas — c'était le week-end. La preuve
 * tenait dans une autre ligne du même relevé : au même instant, la dernière
 * bougie de BTC-USD datait d'une heure, parce que la crypto cote le dimanche.
 *
 * Le pipeline allait bien. Ce qui manquait, c'est que l'écran ne disait rien.
 * Un graphique qui s'arrête deux jours plus tôt sans un mot se lit comme une
 * panne, et aucun « graphique plus précis » n'y changerait quoi que ce soit :
 * rien ne s'échange le samedi.
 *
 * Ce module répond donc à la question que l'utilisateur se posait vraiment :
 * est-ce normal, et quand est-ce que ça repart.
 */

import { isMarketOpen, getTimeUntilChange } from "@/lib/marketStatus";

export type MarketKey = "USA" | "EUROPE" | "ASIA" | "CRYPTO" | "FOREX" | "COMMODITIES";

const SUFFIX_MARKET: Record<string, MarketKey> = {
  ".PA": "EUROPE", ".AS": "EUROPE", ".BR": "EUROPE", ".LS": "EUROPE",
  ".DE": "EUROPE", ".MI": "EUROPE", ".MC": "EUROPE", ".L": "EUROPE",
  ".SW": "EUROPE", ".ST": "EUROPE", ".CO": "EUROPE", ".HE": "EUROPE",
  ".OL": "EUROPE", ".VI": "EUROPE",
  ".T": "ASIA", ".HK": "ASIA", ".KS": "ASIA",
};

/** Le marché d'un symbole Yahoo, déduit de sa forme. */
export function marketOf(symbol: string): MarketKey {
  const s = (symbol || "").toUpperCase();
  if (s.endsWith("-USD")) return "CRYPTO";
  if (s.endsWith("=X")) return "FOREX";
  if (s.endsWith("=F")) return "COMMODITIES";

  // Les indices suivent la place qu'ils mesurent.
  if (s.startsWith("^")) {
    if (/FCHI|GDAXI|FTSE|STOXX|AEX|IBEX|SSMI|BFX|SBF/.test(s)) return "EUROPE";
    if (/N225|HSI|KS11/.test(s)) return "ASIA";
    return "USA";
  }

  const dot = s.lastIndexOf(".");
  if (dot > 0) {
    const m = SUFFIX_MARKET[s.slice(dot)];
    if (m) return m;
  }
  return "USA";
}

export interface QuoteState {
  /** Le marché est-il ouvert en ce moment ? */
  open: boolean;
  /** « ouvre lun à 15:30 » / « ferme dans 2 h », ou vide. */
  until: string;
  /** La dernière bougie, formulée en français. */
  lastQuote: string;
  /**
   * Vrai quand l'écart est anormal MÊME en tenant compte de la fermeture :
   * c'est le seul cas où il y a lieu de s'inquiéter.
   */
  suspicious: boolean;
  /** Une phrase complète, prête à afficher. */
  sentence: string;
}

/** Durée d'une bougie, en minutes. */
function intervalMinutes(interval: string): number {
  const m = /^(\d+)(m|h|d|wk|mo)$/.exec(interval);
  if (!m) return 1440;
  const n = Number(m[1]);
  return n * ({ m: 1, h: 60, d: 1440, wk: 10080, mo: 43200 }[m[2]] ?? 1440);
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
  "août", "septembre", "octobre", "novembre", "décembre"];

export function quoteState(
  symbol: string,
  lastBarMs: number | null,
  interval: string
): QuoteState {
  const key = marketOf(symbol);
  const open = isMarketOpen(key);
  const until = getTimeUntilChange(key) || "";

  if (!lastBarMs) {
    return { open, until, lastQuote: "", suspicious: false,
      sentence: open ? "Marché ouvert." : `Marché fermé${until ? ` · ${until}` : ""}.` };
  }

  const d = new Date(lastBarMs);
  const ageMin = (Date.now() - lastBarMs) / 60000;
  const mins = intervalMinutes(interval);

  /*
   * Ce que désigne l'horodatage d'une bougie dépend de son unité, et
   * l'ignorer produit une phrase fausse.
   *
   * Une bougie hebdomadaire porte la date de son PREMIER jour : en horizon
   * long, la dernière bougie de vendredi 18 s'annonçait « dernière cotation
   * lundi 14 septembre à 00:00 ». Littéralement exact, et trompeur — ça se
   * lit comme « plus rien ne cote depuis lundi » alors que la semaine
   * entière est dedans.
   *
   * L'heure n'est donc citée que pour les unités intrajournalières, les
   * seules où elle désigne un instant de cotation.
   */
  const jour = `${JOURS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  const lastQuote =
    mins < 1440
      ? `dernière cotation ${jour} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      : mins < 10080
        ? `dernière séance ${jour}`
        : mins < 43200
          ? `dernière bougie : semaine du ${d.getDate()} ${MOIS[d.getMonth()]}`
          : `dernière bougie : ${MOIS[d.getMonth()]} ${d.getFullYear()}`;

  // Marché ouvert : on attend une bougie récente. Trois intervalles de retard
  // est le seuil — un de plus que la bougie en cours, plus une marge pour le
  // différé du fournisseur.
  const tolerance = mins * 3;
  const suspicious = open && ageMin > Math.max(tolerance, 20);

  const majuscule = lastQuote.charAt(0).toUpperCase() + lastQuote.slice(1);
  const sentence = suspicious
    ? `${majuscule}, alors que le marché est ouvert, les données ont du retard.`
    : open
      ? `Marché ouvert · ${lastQuote}${until ? ` · ${until}` : ""}.`
      : `Marché fermé · ${lastQuote}${until ? ` · ${until}` : ""}. ` +
        `Le graphique s'arrête là tant que les échanges n'ont pas repris.`;

  return { open, until, lastQuote, suspicious, sentence };
}
