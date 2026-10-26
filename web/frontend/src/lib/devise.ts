/**
 * La devise de COTATION d'un actif, et un cours écrit dans cette devise.
 *
 * Un cours est une cotation : celui d'Apple est en dollars, celui de LVMH en
 * euros, celui de Toyota en yens, celui d'AstraZeneca à Londres en PENCE. Le
 * site les écrivait tous « … € » sans rien convertir — l'or à « 4 194,50 € »
 * pour 4 194,50 dollars. Et la table qui devait distinguer les places rangeait
 * Copenhague, Stockholm, Oslo et Varsovie en euros.
 *
 * Règle, celle des courtiers : UN COURS S'ÉCRIT DANS SA DEVISE DE COTATION ;
 * une SOMME (solde, montant, perte au stop) dans la devise du compte. Les
 * champs de l'ordre — stop, objectif — se saisissent dans la devise de
 * cotation : convertir le cours affiché à côté les rendrait incomparables.
 *
 * Les indices s'expriment en POINTS et une paire de devises en unités de la
 * devise de cotation (EUR/USD 1,1712 : des dollars pour un euro) : ils
 * s'écrivent sans symbole.
 */
/**
 * Le nombre de décimales d'un PRIX, selon son ordre de grandeur.
 *
 * Deux décimales conviennent à une action à 336 €. Elles sont ruineuses pour
 * un actif à 0,34 € : sur TRX, une position affichait « entrée 0,34 € » et
 * « cours actuel 0,34 € » à côté d'un résultat de −0,88 €. Le calcul était
 * juste — l'entrée valait 0,34260 et le cours 0,34250, soit −0,029 % que le
 * levier ×10 transformait en −0,29 %. C'est l'affichage qui mentait, en
 * arrondissant deux nombres différents au même.
 *
 * Un écran qui montre deux fois le même prix à côté d'une perte se lit comme
 * un bug, et c'est bien un bug : il cache la seule chose qu'il devait
 * montrer.
 *
 * À NE PAS UTILISER POUR UNE SOMME D'ARGENT. Un solde, un montant engagé ou
 * un résultat s'écrivent toujours au centime : « 299,1245 € » de valeur de
 * position n'a pas de sens, alors que « 0,342500 € » de cours en a un.
 */
export function priceDecimals(value: number): number {
  const v = Math.abs(value);
  if (!Number.isFinite(v) || v === 0) return 2;
  if (v >= 100) return 2;
  if (v >= 1) return 3;
  if (v >= 0.01) return 5;
  if (v >= 0.0001) return 6;
  return 8;
}


export type Cotation =
  | { genre: "devise"; code: string }          // ISO 4217, formaté par Intl
  | { genre: "centimes"; suffixe: string }      // pence (Londres), cents (grains, café…)
  | { genre: "nu" };                            // indices (points), paires de devises

const PLACES: [string, string][] = [
  // Zone euro
  [".PA", "EUR"], [".DE", "EUR"], [".F", "EUR"], [".AS", "EUR"], [".BR", "EUR"], [".LS", "EUR"],
  [".MI", "EUR"], [".MC", "EUR"], [".AT", "EUR"], [".HE", "EUR"], [".IR", "EUR"], [".VI", "EUR"],
  // Europe hors euro
  [".SW", "CHF"], [".ST", "SEK"], [".CO", "DKK"], [".OL", "NOK"], [".WA", "PLN"],
  // Amériques, Asie, Océanie
  [".TO", "CAD"], [".V", "CAD"], [".SA", "BRL"], [".MX", "MXN"],
  [".T", "JPY"], [".HK", "HKD"], [".SS", "CNY"], [".SZ", "CNY"], [".KS", "KRW"], [".KQ", "KRW"],
  [".NS", "INR"], [".BO", "INR"], [".AX", "AUD"], [".NZ", "NZD"], [".SI", "SGD"], [".TW", "TWD"],
];

// Contrats cotés en CENTS de dollar (par boisseau ou par livre).
const EN_CENTS = new Set(["ZC=F", "ZW=F", "ZS=F", "ZL=F", "ZM=F", "KC=F", "CT=F", "SB=F", "OJ=F", "KE=F"]);

export function deviseCotation(symbol: string | null | undefined): Cotation {
  const s = (symbol || "").trim().toUpperCase();
  if (!s) return { genre: "devise", code: "USD" };
  if (s.startsWith("^")) return { genre: "nu" };
  if (s.endsWith("=X")) return { genre: "nu" };
  if (s.endsWith(".L") || s.endsWith(".IL")) return { genre: "centimes", suffixe: "p" };
  if (EN_CENTS.has(s)) return { genre: "centimes", suffixe: "¢" };
  if (s.endsWith("=F")) return { genre: "devise", code: "USD" };
  const crypto = s.match(/-(USD|EUR|GBP|JPY|BTC|ETH|USDT)$/);
  if (crypto) {
    const q = crypto[1];
    return q === "USDT" ? { genre: "devise", code: "USD" }
      : q === "BTC" || q === "ETH" ? { genre: "centimes", suffixe: q }
      : { genre: "devise", code: q };
  }
  for (const [suffixe, code] of PLACES) if (s.endsWith(suffixe)) return { genre: "devise", code };
  return { genre: "devise", code: "USD" };           // actions et ETF américains
}

/** Le code à afficher à côté d'un champ de saisie : « $ », « € », « p », ou rien. */
export function symboleCotation(symbol: string | null | undefined): string {
  const c = deviseCotation(symbol);
  if (c.genre === "nu") return "";
  if (c.genre === "centimes") return c.suffixe;
  try {
    const parts = new Intl.NumberFormat("fr-FR", { style: "currency", currency: c.code, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? c.code;
  } catch {
    return c.code;
  }
}

/** Un cours, dans sa devise de cotation, avec la précision de son ordre de grandeur. */
export function formatCours(value: number, symbol: string | null | undefined): string {
  if (!Number.isFinite(value)) return "—";
  const c = deviseCotation(symbol);
  const sym = (symbol || "").toUpperCase();
  // Une paire de devises se lit au cent-millième (1,17123) ; sinon, la
  // précision de l'ordre de grandeur du cours.
  const d = sym.endsWith("=X") && Math.abs(value) < 10 ? 5 : priceDecimals(value);
  const nombre = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  if (c.genre === "nu") return nombre(value);
  if (c.genre === "centimes") return `${nombre(value)} ${c.suffixe}`;
  try {
    // Symbole court (« $ », « ¥ ») plutôt que « $US », « JPY ».
    return new Intl.NumberFormat("fr-FR", {
      style: "currency", currency: c.code, currencyDisplay: "narrowSymbol",
      minimumFractionDigits: d, maximumFractionDigits: d,
    }).format(value);
  } catch {
    return `${nombre(value)} ${c.code}`;
  }
}
