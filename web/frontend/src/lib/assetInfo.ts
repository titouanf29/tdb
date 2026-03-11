/**
 * Asset information - Names and logos for all trading assets
 */

export interface AssetInfo {
  name: string;
  logo?: string;
  sector?: string;
}

// Logo URLs using reliable CDN sources
const LOGO_BASE = "https://logo.clearbit.com";
const CRYPTO_LOGO_BASE = "https://cryptologos.cc/logos";

export const assetInfoMap: Record<string, AssetInfo> = {
  // ============ INDICES ============
  "^FCHI": { name: "CAC 40", sector: "Index" },
  "^GDAXI": { name: "DAX", sector: "Index" },
  "^STOXX50E": { name: "Euro Stoxx 50", sector: "Index" },
  "^FTSE": { name: "FTSE 100", sector: "Index" },
  "^GSPC": { name: "S&P 500", sector: "Index" },
  "^DJI": { name: "Dow Jones", sector: "Index" },
  "^IXIC": { name: "NASDAQ", sector: "Index" },
  "^N225": { name: "Nikkei 225", sector: "Index" },
  "^HSI": { name: "Hang Seng", sector: "Index" },
  "000001.SS": { name: "Shanghai Composite", sector: "Index" },

  // ============ ETFs ============
  "SPY": { name: "SPDR S&P 500 ETF", logo: `${LOGO_BASE}/ssga.com`, sector: "ETF" },
  "QQQ": { name: "Invesco QQQ Trust", logo: `${LOGO_BASE}/invesco.com`, sector: "ETF" },
  "DIA": { name: "SPDR Dow Jones ETF", logo: `${LOGO_BASE}/ssga.com`, sector: "ETF" },
  "IWM": { name: "iShares Russell 2000", logo: `${LOGO_BASE}/ishares.com`, sector: "ETF" },

  // ============ FRANCE ============
  "MC.PA": { name: "LVMH", logo: `${LOGO_BASE}/lvmh.com`, sector: "Luxury" },
  "OR.PA": { name: "L'Oreal", logo: `${LOGO_BASE}/loreal.com`, sector: "Consumer" },
  "AIR.PA": { name: "Airbus", logo: `${LOGO_BASE}/airbus.com`, sector: "Aerospace" },
  "SAN.PA": { name: "Sanofi", logo: `${LOGO_BASE}/sanofi.com`, sector: "Healthcare" },
  "BNP.PA": { name: "BNP Paribas", logo: `${LOGO_BASE}/bnpparibas.com`, sector: "Banking" },
  "SU.PA": { name: "Schneider Electric", logo: `${LOGO_BASE}/se.com`, sector: "Industrial" },
  "TTE.PA": { name: "TotalEnergies", logo: `${LOGO_BASE}/totalenergies.com`, sector: "Energy" },
  "EN.PA": { name: "Bouygues", logo: `${LOGO_BASE}/bouygues.com`, sector: "Construction" },
  "CA.PA": { name: "Carrefour", logo: `${LOGO_BASE}/carrefour.com`, sector: "Retail" },
  "SAF.PA": { name: "Safran", logo: `${LOGO_BASE}/safran-group.com`, sector: "Aerospace" },
  "AI.PA": { name: "Air Liquide", logo: `${LOGO_BASE}/airliquide.com`, sector: "Chemicals" },
  "COFA.PA": { name: "Coface", logo: `${LOGO_BASE}/coface.com`, sector: "Insurance" },
  "ALRIS.PA": { name: "Alris", sector: "Technology" },
  "FDJU.PA": { name: "La Francaise des Jeux", logo: `${LOGO_BASE}/groupefdj.com`, sector: "Gaming" },

  // ============ GERMANY ============
  "VOW3.DE": { name: "Volkswagen", logo: `${LOGO_BASE}/volkswagen.com`, sector: "Automotive" },
  "SIE.DE": { name: "Siemens", logo: `${LOGO_BASE}/siemens.com`, sector: "Industrial" },
  "BAS.DE": { name: "BASF", logo: `${LOGO_BASE}/basf.com`, sector: "Chemicals" },
  "BAYN.DE": { name: "Bayer", logo: `${LOGO_BASE}/bayer.com`, sector: "Healthcare" },
  "ALV.DE": { name: "Allianz", logo: `${LOGO_BASE}/allianz.com`, sector: "Insurance" },
  "MBG.DE": { name: "Mercedes-Benz", logo: `${LOGO_BASE}/mercedes-benz.com`, sector: "Automotive" },

  // ============ UK ============
  "ULVR.L": { name: "Unilever", logo: `${LOGO_BASE}/unilever.com`, sector: "Consumer" },
  "SHEL.L": { name: "Shell", logo: `${LOGO_BASE}/shell.com`, sector: "Energy" },
  "AZN.L": { name: "AstraZeneca", logo: `${LOGO_BASE}/astrazeneca.com`, sector: "Healthcare" },
  "HSBA.L": { name: "HSBC", logo: `${LOGO_BASE}/hsbc.com`, sector: "Banking" },
  "BP.L": { name: "BP", logo: `${LOGO_BASE}/bp.com`, sector: "Energy" },
  "GSK.L": { name: "GSK", logo: `${LOGO_BASE}/gsk.com`, sector: "Healthcare" },

  // ============ USA - MEGA CAPS ============
  "AAPL": { name: "Apple", logo: `${LOGO_BASE}/apple.com`, sector: "Technology" },
  "MSFT": { name: "Microsoft", logo: `${LOGO_BASE}/microsoft.com`, sector: "Technology" },
  "GOOGL": { name: "Alphabet", logo: `${LOGO_BASE}/google.com`, sector: "Technology" },
  "AMZN": { name: "Amazon", logo: `${LOGO_BASE}/amazon.com`, sector: "E-Commerce" },
  "META": { name: "Meta", logo: `${LOGO_BASE}/meta.com`, sector: "Technology" },
  "NVDA": { name: "NVIDIA", logo: `${LOGO_BASE}/nvidia.com`, sector: "Semiconductors" },
  "TSLA": { name: "Tesla", logo: `${LOGO_BASE}/tesla.com`, sector: "Automotive" },

  // ============ USA - TECH ============
  "AMD": { name: "AMD", logo: `${LOGO_BASE}/amd.com`, sector: "Semiconductors" },
  "INTC": { name: "Intel", logo: `${LOGO_BASE}/intel.com`, sector: "Semiconductors" },
  "NFLX": { name: "Netflix", logo: `${LOGO_BASE}/netflix.com`, sector: "Entertainment" },
  "CRM": { name: "Salesforce", logo: `${LOGO_BASE}/salesforce.com`, sector: "Software" },
  "ORCL": { name: "Oracle", logo: `${LOGO_BASE}/oracle.com`, sector: "Software" },
  "ADBE": { name: "Adobe", logo: `${LOGO_BASE}/adobe.com`, sector: "Software" },
  "AVGO": { name: "Broadcom", logo: `${LOGO_BASE}/broadcom.com`, sector: "Semiconductors" },
  "QCOM": { name: "Qualcomm", logo: `${LOGO_BASE}/qualcomm.com`, sector: "Semiconductors" },
  "TXN": { name: "Texas Instruments", logo: `${LOGO_BASE}/ti.com`, sector: "Semiconductors" },
  "CSCO": { name: "Cisco", logo: `${LOGO_BASE}/cisco.com`, sector: "Networking" },

  // ============ USA - FINANCE ============
  "JPM": { name: "JPMorgan Chase", logo: `${LOGO_BASE}/jpmorganchase.com`, sector: "Banking" },
  "BAC": { name: "Bank of America", logo: `${LOGO_BASE}/bankofamerica.com`, sector: "Banking" },
  "WFC": { name: "Wells Fargo", logo: `${LOGO_BASE}/wellsfargo.com`, sector: "Banking" },
  "GS": { name: "Goldman Sachs", logo: `${LOGO_BASE}/goldmansachs.com`, sector: "Banking" },
  "MS": { name: "Morgan Stanley", logo: `${LOGO_BASE}/morganstanley.com`, sector: "Banking" },
  "C": { name: "Citigroup", logo: `${LOGO_BASE}/citigroup.com`, sector: "Banking" },
  "BLK": { name: "BlackRock", logo: `${LOGO_BASE}/blackrock.com`, sector: "Asset Management" },
  "V": { name: "Visa", logo: `${LOGO_BASE}/visa.com`, sector: "Payments" },
  "MA": { name: "Mastercard", logo: `${LOGO_BASE}/mastercard.com`, sector: "Payments" },
  "AXP": { name: "American Express", logo: `${LOGO_BASE}/americanexpress.com`, sector: "Payments" },

  // ============ USA - HEALTHCARE ============
  "JNJ": { name: "Johnson & Johnson", logo: `${LOGO_BASE}/jnj.com`, sector: "Healthcare" },
  "UNH": { name: "UnitedHealth", logo: `${LOGO_BASE}/unitedhealthgroup.com`, sector: "Healthcare" },
  "PFE": { name: "Pfizer", logo: `${LOGO_BASE}/pfizer.com`, sector: "Pharma" },
  "ABBV": { name: "AbbVie", logo: `${LOGO_BASE}/abbvie.com`, sector: "Pharma" },
  "LLY": { name: "Eli Lilly", logo: `${LOGO_BASE}/lilly.com`, sector: "Pharma" },
  "MRK": { name: "Merck", logo: `${LOGO_BASE}/merck.com`, sector: "Pharma" },
  "TMO": { name: "Thermo Fisher", logo: `${LOGO_BASE}/thermofisher.com`, sector: "Life Sciences" },
  "ABT": { name: "Abbott", logo: `${LOGO_BASE}/abbott.com`, sector: "Healthcare" },

  // ============ USA - CONSUMER ============
  "KO": { name: "Coca-Cola", logo: `${LOGO_BASE}/coca-cola.com`, sector: "Beverages" },
  "PEP": { name: "PepsiCo", logo: `${LOGO_BASE}/pepsico.com`, sector: "Beverages" },
  "WMT": { name: "Walmart", logo: `${LOGO_BASE}/walmart.com`, sector: "Retail" },
  "HD": { name: "Home Depot", logo: `${LOGO_BASE}/homedepot.com`, sector: "Retail" },
  "MCD": { name: "McDonald's", logo: `${LOGO_BASE}/mcdonalds.com`, sector: "Restaurant" },
  "NKE": { name: "Nike", logo: `${LOGO_BASE}/nike.com`, sector: "Apparel" },
  "SBUX": { name: "Starbucks", logo: `${LOGO_BASE}/starbucks.com`, sector: "Restaurant" },
  "DIS": { name: "Disney", logo: `${LOGO_BASE}/disney.com`, sector: "Entertainment" },
  "COST": { name: "Costco", logo: `${LOGO_BASE}/costco.com`, sector: "Retail" },

  // ============ USA - ENERGY ============
  "XOM": { name: "ExxonMobil", logo: `${LOGO_BASE}/exxonmobil.com`, sector: "Energy" },
  "CVX": { name: "Chevron", logo: `${LOGO_BASE}/chevron.com`, sector: "Energy" },
  "COP": { name: "ConocoPhillips", logo: `${LOGO_BASE}/conocophillips.com`, sector: "Energy" },
  "SLB": { name: "Schlumberger", logo: `${LOGO_BASE}/slb.com`, sector: "Energy Services" },

  // ============ USA - INDUSTRIAL ============
  "BA": { name: "Boeing", logo: `${LOGO_BASE}/boeing.com`, sector: "Aerospace" },
  "CAT": { name: "Caterpillar", logo: `${LOGO_BASE}/caterpillar.com`, sector: "Industrial" },
  "GE": { name: "General Electric", logo: `${LOGO_BASE}/ge.com`, sector: "Industrial" },
  "MMM": { name: "3M", logo: `${LOGO_BASE}/3m.com`, sector: "Industrial" },
  "HON": { name: "Honeywell", logo: `${LOGO_BASE}/honeywell.com`, sector: "Industrial" },

  // ============ JAPAN ============
  "7203.T": { name: "Toyota", logo: `${LOGO_BASE}/toyota.com`, sector: "Automotive" },
  "9984.T": { name: "SoftBank", logo: `${LOGO_BASE}/softbank.jp`, sector: "Technology" },
  "6758.T": { name: "Sony", logo: `${LOGO_BASE}/sony.com`, sector: "Electronics" },
  "6861.T": { name: "Keyence", logo: `${LOGO_BASE}/keyence.com`, sector: "Industrial" },
  "7974.T": { name: "Nintendo", logo: `${LOGO_BASE}/nintendo.com`, sector: "Gaming" },
  "9433.T": { name: "KDDI", logo: `${LOGO_BASE}/kddi.com`, sector: "Telecom" },

  // ============ HONG KONG / CHINA ============
  "9988.HK": { name: "Alibaba", logo: `${LOGO_BASE}/alibaba.com`, sector: "E-Commerce" },
  "0700.HK": { name: "Tencent", logo: `${LOGO_BASE}/tencent.com`, sector: "Technology" },
  "0941.HK": { name: "China Mobile", logo: `${LOGO_BASE}/chinamobileltd.com`, sector: "Telecom" },
  "1299.HK": { name: "AIA Group", logo: `${LOGO_BASE}/aia.com`, sector: "Insurance" },
  "0939.HK": { name: "CCB", logo: `${LOGO_BASE}/ccb.com`, sector: "Banking" },
  "9618.HK": { name: "JD.com", logo: `${LOGO_BASE}/jd.com`, sector: "E-Commerce" },

  // ============ KOREA ============
  "005930.KS": { name: "Samsung", logo: `${LOGO_BASE}/samsung.com`, sector: "Electronics" },
  "000660.KS": { name: "SK Hynix", logo: `${LOGO_BASE}/skhynix.com`, sector: "Semiconductors" },
  "035420.KS": { name: "Naver", logo: `${LOGO_BASE}/navercorp.com`, sector: "Technology" },
  "051910.KS": { name: "LG Chem", logo: `${LOGO_BASE}/lgchem.com`, sector: "Chemicals" },

  // ============ INDIA ============
  "RELIANCE.NS": { name: "Reliance Industries", logo: `${LOGO_BASE}/ril.com`, sector: "Conglomerate" },
  "TCS.NS": { name: "Tata Consultancy", logo: `${LOGO_BASE}/tcs.com`, sector: "IT Services" },
  "INFY.NS": { name: "Infosys", logo: `${LOGO_BASE}/infosys.com`, sector: "IT Services" },
  "HDFCBANK.NS": { name: "HDFC Bank", logo: `${LOGO_BASE}/hdfcbank.com`, sector: "Banking" },

  // ============ FOREX ============
  "EURUSD=X": { name: "EUR/USD", sector: "Forex" },
  "GBPUSD=X": { name: "GBP/USD", sector: "Forex" },
  "USDJPY=X": { name: "USD/JPY", sector: "Forex" },
  "USDCHF=X": { name: "USD/CHF", sector: "Forex" },
  "AUDUSD=X": { name: "AUD/USD", sector: "Forex" },
  "USDCAD=X": { name: "USD/CAD", sector: "Forex" },
  "NZDUSD=X": { name: "NZD/USD", sector: "Forex" },
  "EURGBP=X": { name: "EUR/GBP", sector: "Forex" },
  "EURJPY=X": { name: "EUR/JPY", sector: "Forex" },
  "GBPJPY=X": { name: "GBP/JPY", sector: "Forex" },
  "EURCHF=X": { name: "EUR/CHF", sector: "Forex" },
  "AUDJPY=X": { name: "AUD/JPY", sector: "Forex" },
  "USDMXN=X": { name: "USD/MXN", sector: "Forex" },
  "USDZAR=X": { name: "USD/ZAR", sector: "Forex" },
  "USDTRY=X": { name: "USD/TRY", sector: "Forex" },
  "USDSEK=X": { name: "USD/SEK", sector: "Forex" },
  "USDNOK=X": { name: "USD/NOK", sector: "Forex" },

  // ============ CRYPTO ============
  "BTC-USD": { name: "Bitcoin", logo: `${CRYPTO_LOGO_BASE}/bitcoin-btc-logo.png`, sector: "Crypto" },
  "ETH-USD": { name: "Ethereum", logo: `${CRYPTO_LOGO_BASE}/ethereum-eth-logo.png`, sector: "Crypto" },
  "BNB-USD": { name: "BNB", logo: `${CRYPTO_LOGO_BASE}/bnb-bnb-logo.png`, sector: "Crypto" },
  "XRP-USD": { name: "XRP", logo: `${CRYPTO_LOGO_BASE}/xrp-xrp-logo.png`, sector: "Crypto" },
  "SOL-USD": { name: "Solana", logo: `${CRYPTO_LOGO_BASE}/solana-sol-logo.png`, sector: "Crypto" },
  "ADA-USD": { name: "Cardano", logo: `${CRYPTO_LOGO_BASE}/cardano-ada-logo.png`, sector: "Crypto" },
  "AVAX-USD": { name: "Avalanche", logo: `${CRYPTO_LOGO_BASE}/avalanche-avax-logo.png`, sector: "Crypto" },
  "DOT-USD": { name: "Polkadot", logo: `${CRYPTO_LOGO_BASE}/polkadot-new-dot-logo.png`, sector: "Crypto" },
  "ATOM-USD": { name: "Cosmos", logo: `${CRYPTO_LOGO_BASE}/cosmos-atom-logo.png`, sector: "Crypto" },
  "NEAR-USD": { name: "NEAR Protocol", logo: `${CRYPTO_LOGO_BASE}/near-protocol-near-logo.png`, sector: "Crypto" },
  "TRX-USD": { name: "TRON", logo: `${CRYPTO_LOGO_BASE}/tron-trx-logo.png`, sector: "Crypto" },
  "LINK-USD": { name: "Chainlink", logo: `${CRYPTO_LOGO_BASE}/chainlink-link-logo.png`, sector: "Crypto" },
  "AAVE-USD": { name: "Aave", logo: `${CRYPTO_LOGO_BASE}/aave-aave-logo.png`, sector: "Crypto" },
  "FIL-USD": { name: "Filecoin", logo: `${CRYPTO_LOGO_BASE}/filecoin-fil-logo.png`, sector: "Crypto" },
  "ARB-USD": { name: "Arbitrum", logo: `${CRYPTO_LOGO_BASE}/arbitrum-arb-logo.png`, sector: "Crypto" },
  "DOGE-USD": { name: "Dogecoin", logo: `${CRYPTO_LOGO_BASE}/dogecoin-doge-logo.png`, sector: "Crypto" },
  "SHIB-USD": { name: "Shiba Inu", logo: `${CRYPTO_LOGO_BASE}/shiba-inu-shib-logo.png`, sector: "Crypto" },
  "LTC-USD": { name: "Litecoin", logo: `${CRYPTO_LOGO_BASE}/litecoin-ltc-logo.png`, sector: "Crypto" },
  "BCH-USD": { name: "Bitcoin Cash", logo: `${CRYPTO_LOGO_BASE}/bitcoin-cash-bch-logo.png`, sector: "Crypto" },
  "XLM-USD": { name: "Stellar", logo: `${CRYPTO_LOGO_BASE}/stellar-xlm-logo.png`, sector: "Crypto" },
  "ALGO-USD": { name: "Algorand", logo: `${CRYPTO_LOGO_BASE}/algorand-algo-logo.png`, sector: "Crypto" },

  // ============ COMMODITIES ============
  "CL=F": { name: "Crude Oil WTI", sector: "Energy" },
  "NG=F": { name: "Natural Gas", sector: "Energy" },
  "BZ=F": { name: "Brent Crude", sector: "Energy" },
  "GC=F": { name: "Gold", sector: "Precious Metals" },
  "SI=F": { name: "Silver", sector: "Precious Metals" },
  "PL=F": { name: "Platinum", sector: "Precious Metals" },
  "PA=F": { name: "Palladium", sector: "Precious Metals" },
  "HG=F": { name: "Copper", sector: "Industrial Metals" },
  "ALI=F": { name: "Aluminum", sector: "Industrial Metals" },
  "ZC=F": { name: "Corn", sector: "Agriculture" },
  "ZW=F": { name: "Wheat", sector: "Agriculture" },
  "ZS=F": { name: "Soybeans", sector: "Agriculture" },
  "KC=F": { name: "Coffee", sector: "Agriculture" },
  "SB=F": { name: "Sugar", sector: "Agriculture" },
  "CT=F": { name: "Cotton", sector: "Agriculture" },
};

/**
 * Get asset info by symbol
 */
export function getAssetInfo(symbol: string): AssetInfo {
  return assetInfoMap[symbol] || { name: symbol, sector: "Unknown" };
}

/**
 * Get display name for an asset
 */
export function getAssetName(symbol: string): string {
  return assetInfoMap[symbol]?.name || symbol;
}

/**
 * Get logo URL for an asset
 */
export function getAssetLogo(symbol: string): string | undefined {
  return assetInfoMap[symbol]?.logo;
}
