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
 * sûr, plutôt qu'un pari. L'écran retombe alors sur le graphique interne, qui
 * fonctionne pour n'importe quel symbole. Afficher un cadre en erreur serait
 * pire que l'absence de TradingView, parce que l'utilisateur ne saurait pas
 * si c'est l'actif ou le site qui pose problème.
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
  "^FTSEMIB": "MIL:FTSEMIB",
  "^SBF120": "EURONEXT:SBF120",
};

/** Matières premières : contrats continus, notés « 1! » chez TradingView. */
const COMMODITIES: Record<string, string> = {
  "GC=F": "COMEX:GC1!",
  "SI=F": "COMEX:SI1!",
  "HG=F": "COMEX:HG1!",
  "CL=F": "NYMEX:CL1!",
  "NG=F": "NYMEX:NG1!",
  "ZC=F": "CBOT:ZC1!",
  "ZW=F": "CBOT:ZW1!",
  "ZS=F": "CBOT:ZS1!",
  "KC=F": "ICEUS:KC1!",
  "CT=F": "ICEUS:CT1!",
  "SB=F": "ICEUS:SB1!",
  "CC=F": "ICEUS:CC1!",
};

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
