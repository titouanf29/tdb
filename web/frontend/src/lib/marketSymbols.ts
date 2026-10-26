/**
 * Curated symbol lists per market — shared between the dashboard SessionSummary
 * widget and the markets page top-movers section so both display identical rankings.
 */
export const MARKET_SYMBOLS: Record<string, string[]> = {
  EUROPE: [
    "^FCHI", "^GDAXI", "^FTSE", "^STOXX50E",
    "MC.PA", "AI.PA", "TTE.PA", "SAP.DE", "ASML",
    "AIR.PA", "OR.PA", "SIE.DE", "BNP.PA", "SAN.PA",
  ],
  USA: [
    "^GSPC", "^IXIC", "^DJI", "^RUT",
    "AAPL", "NVDA", "MSFT", "AMZN", "META",
    "GOOGL", "TSLA", "NFLX", "AMD", "JPM", "SPCX",
  ],
  ASIA: [
    "^N225", "^HSI", "^KS11",
    "BABA", "9984.T", "7203.T", "TCEHY", "NIO", "JD",
  ],
  CRYPTO: [
    "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD",
    "XRP-USD", "ADA-USD", "DOGE-USD", "AVAX-USD",
  ],
  FOREX: [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
    "AUDUSD=X", "USDCAD=X", "NZDUSD=X", "EURGBP=X",
  ],
  COMMODITIES: [
    "GC=F", "SI=F", "CL=F", "NG=F",
    "HG=F", "ZC=F", "ZW=F", "KC=F",
  ],
};
