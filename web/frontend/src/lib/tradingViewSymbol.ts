/**
 * Traduction d'un symbole Yahoo vers un symbole TradingView.
 *
 * Tout le site parle le format Yahoo Finance — AAPL, MC.PA, BTC-USD, ^FCHI,
 * GC=F, EURUSD=X — parce que c'est ce que la source de cours renvoie.
 * TradingView attend BOURSE:SYMBOLE, et refuse silencieusement ce qu'il ne
 * reconnaît pas : son cadre affiche alors « Invalid symbol » à la place du
 * graphique.
 *
 * D'où le point important de ce fichier : il renvoie null quand il n'est pas
 * sûr, plutôt qu'un pari.
 *
 * Et « pas sûr » se mesure, il ne s'estime pas. Confronté à un symbole qu'il
 * ne connaît pas, le widget n'affiche AUCUNE erreur : il charge son actif par
 * défaut. Un utilisateur qui analysait l'or se retrouvait devant le graphique
 * d'Apple sans le moindre indice. Chaque valeur de ce fichier est donc
 * vérifiée contre le résolveur public de TradingView — scripts/verify-
 * tradingview.py, à relancer quand on ajoute une entrée.
 */

/** Suffixe Yahoo -> place TradingView, pour les actions hors États-Unis. */
const EXCHANGE_BY_SUFFIX: Record<string, string> = {
  ".PA": "EURONEXT",   // Paris
  ".AS": "EURONEXT",   // Amsterdam
  ".BR": "EURONEXT",   // Bruxelles
  ".LS": "EURONEXT",   // Lisbonne
  ".DE": "XETR",       // Francfort
  ".MI": "MIL",        // Milan
  ".MC": "BME",        // Madrid
  ".L": "LSE",         // Londres
  ".SW": "SIX",        // Zurich
  ".ST": "OMXSTO",     // Stockholm
  ".CO": "OMXCOP",     // Copenhague
  ".HE": "OMXHEX",     // Helsinki
  ".OL": "OSL",        // Oslo
  ".VI": "VIE",        // Vienne
  ".T": "TSE",         // Tokyo
  ".HK": "HKEX",       // Hong Kong
  ".TO": "TSX",        // Toronto
  ".AX": "ASX",        // Sydney
};

/** Indices : aucune règle ne s'en déduit, ils sont nommés un par un. */
const INDICES: Record<string, string> = {
  "^GSPC": "SP:SPX",
  "^IXIC": "NASDAQ:IXIC",
  "^DJI": "DJ:DJI",
  "^RUT": "TVC:RUT",
  "^VIX": "TVC:VIX",
  "^FCHI": "EURONEXT:PX1",
  "^GDAXI": "XETR:DAX",
  "^FTSE": "TVC:UKX",
  "^STOXX50E": "TVC:SX5E",
  "^AEX": "EURONEXT:AEX",
  "^IBEX": "BME:IBC",
  "^SSMI": "SIX:SMI",
  "^N225": "TVC:NI225",
  "^HSI": "TVC:HSI",
  "^KS11": "TVC:KOSPI",
  "^BFX": "EURONEXT:BEL20",
  "^FTSEMIB": "INDEX:FTSEMIB",
  "^SBF120": "EURONEXT:PX4",
};

/**
 * Matières premières — et la leçon la plus chère de ce fichier.
 *
 * La première version écrivait les contrats continus « COMEX:GC1! »,
 * « NYMEX:CL1! », etc. C'est la notation du site TradingView, mais le widget
 * ne la résout pas : confronté à un symbole inconnu, il n'affiche pas
 * d'erreur — il retombe sur son actif par défaut. Quelqu'un qui analysait
 * l'or obtenait donc le graphique d'Apple, sans rien pour lui signaler que
 * ce n'était pas le sien. Un repli silencieux sur un AUTRE actif est le pire
 * comportement possible dans un outil financier.
 *
 * Les valeurs ci-dessous sont maintenant vérifiées une à une contre le
 * résolveur public de TradingView (voir scripts/verify-tradingview.py), et
 * choisies cotées en dollar sur un flux neutre — TVC et FX sont les agrégats
 * de TradingView. Les contrats indiens en roupies que renvoyait la recherche
 * pour le cuivre et le gaz ont été écartés : un prix en INR à côté de notre
 * propre analyse en dollars se contredit à l'écran.
 *
 * Café, coton et cacao n'ont aucun flux neutre — seulement des CFD de
 * courtiers. Ils n'ont donc pas d'entrée, et gardent le graphique interne.
 */
// VIDE, depuis septembre 2026. Ces flux (TVC:GOLD, TVC:USOIL…) sont des prix
// AU COMPTANT, alors que le site analyse le CONTRAT À TERME (GC=F, CL=F…) :
// le stop et l'objectif, tracés sur un graphique qui cote quelques dizaines
// de dollars plus bas, ne tombaient pas sur les bons niveaux. Le widget ne
// sait pas afficher les contrats continus (voir plus haut) : les matières
// premières prennent donc le graphique interne, construit sur les mêmes
// bougies que l'analyse.
const COMMODITIES: Record<string, string> = {};

/**
 * Le symbole TradingView correspondant, ou null si la correspondance n'est
 * pas sûre.
 */
export function toTradingViewSymbol(symbol: string): string | null {
  const s = (symbol || "").trim().toUpperCase();
  if (!s) return null;

  if (INDICES[s]) return INDICES[s];
  if (COMMODITIES[s]) return COMMODITIES[s];

  // Un indice non répertorié : on ne devine pas. « ^ » suivi d'un nom
  // arbitraire n'a aucune règle de conversion.
  if (s.startsWith("^")) return null;

  // Devises : EURUSD=X -> FX:EURUSD. Certaines paires Yahoo s'écrivent
  // EURUSD=X, d'autres USDJPY=X ; les deux suivent la même règle.
  if (s.endsWith("=X")) {
    const pair = s.slice(0, -2);
    return /^[A-Z]{6}$/.test(pair) ? `FX:${pair}` : null;
  }

  // Un contrat à terme hors liste : les codes de place ne se déduisent pas.
  if (s.endsWith("=F")) return null;

  // Crypto : BTC-USD -> CRYPTO:BTCUSD, l'indice composite de TradingView,
  // qui existe pour les grandes paires et évite d'imposer une plateforme
  // particulière (BINANCE, COINBASE…) dont la cotation diffère un peu.
  if (s.endsWith("-USD")) {
    const base = s.slice(0, -4);
    return /^[A-Z0-9]{2,6}$/.test(base) ? `CRYPTO:${base}USD` : null;
  }

  // Action hors États-Unis, reconnue à son suffixe.
  const dot = s.lastIndexOf(".");
  if (dot > 0) {
    const suffix = s.slice(dot);
    const exchange = EXCHANGE_BY_SUFFIX[suffix];
    return exchange ? `${exchange}:${s.slice(0, dot)}` : null;
  }

  // Action américaine : TradingView résout un symbole nu sans préfixe, et
  // c'est plus sûr que de deviner entre NASDAQ et NYSE.
  if (/^[A-Z]{1,5}$/.test(s)) return s;

  return null;
}

/** Vrai quand l'actif peut être affiché dans TradingView. */
export function hasTradingView(symbol: string): boolean {
  return toTradingViewSymbol(symbol) !== null;
}
