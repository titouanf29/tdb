"""
Shared price-fetching helper — uses yfinance for all symbol types.
Works for US stocks, indices (^GSPC), international (.PA, .L...),
crypto (-USD), commodities (=F), forex (=X).
"""
import asyncio

# Mapping yfinance exchange suffix → Twelve Data exchange code
EXCHANGE_MAP = {
    ".PA": "XPAR",   # Euronext Paris
    ".L":  "XLON",   # London Stock Exchange
    ".DE": "XETR",   # Deutsche Boerse XETRA
    ".AS": "XAMS",   # Euronext Amsterdam
    ".BR": "XBRU",   # Euronext Brussels
    ".LS": "XLIS",   # Euronext Lisbon
    ".MC": "XMAD",   # Bolsa de Madrid
    ".MI": "XMIL",   # Borsa Italiana
    ".SW": "XSWX",   # SIX Swiss Exchange
    ".T":  "XTKS",   # Tokyo Stock Exchange
    ".HK": "XHKG",   # Hong Kong Stock Exchange
    ".KS": "XKRX",   # Korea Exchange
    ".NS": "XNSE",   # NSE India
    ".SS": "XSHG",   # Shanghai Stock Exchange
}


def _yf_to_td(symbol: str) -> tuple:
    """Convert a yfinance symbol to (base_symbol, exchange_code) for Twelve Data.
    Returns ('', '') for US stocks (no suffix needed).
    Example: 'COFA.PA' → ('COFA', 'XPAR')
    """
    s = symbol.upper()
    for suffix, exchange in EXCHANGE_MAP.items():
        if s.endswith(suffix.upper()):
            base = symbol[: len(symbol) - len(suffix)]
            return base, exchange
    return "", ""


async def fetch_prices(symbols: list[str]) -> dict[str, dict]:
    """
    Returns {symbol: {price, change, volume}} for each symbol.
    Missing symbols are simply absent from the result.
    """
    if not symbols:
        return {}

    def _fetch_sync(syms: list[str]) -> dict:
        import yfinance as yf
        import pandas as pd

        result: dict = {}
        try:
            tickers_str = " ".join(syms)
            data = yf.download(
                tickers=tickers_str,
                period="5d",
                interval="1d",
                auto_adjust=False,
                progress=False,
                threads=True,
            )

            if data.empty:
                return result

            # Single ticker → flat columns (Open, High, Low, Close, Volume)
            if len(syms) == 1:
                sym = syms[0].upper()
                if "Close" in data.columns:
                    closes = data["Close"].dropna()
                    if closes.empty:
                        return result
                    price = float(closes.iloc[-1])
                    prev  = float(closes.iloc[-2]) if len(closes) >= 2 else price
                    change = ((price - prev) / prev * 100) if prev else 0.0
                    volume = int(data["Volume"].iloc[-1]) if "Volume" in data.columns else 0
                    result[sym] = {
                        "price":  round(price, 4),
                        "change": round(change, 2),
                        "volume": volume,
                    }

            # Multiple tickers → MultiIndex columns (metric, ticker)
            else:
                close_df = None
                vol_df   = None

                if isinstance(data.columns, pd.MultiIndex):
                    if "Close" in data.columns.get_level_values(0):
                        close_df = data["Close"]
                    if "Volume" in data.columns.get_level_values(0):
                        vol_df = data["Volume"]
                else:
                    # Fallback: flat (single ticker returned despite multiple requested)
                    if "Close" in data.columns:
                        close_df = data[["Close"]].rename(columns={"Close": syms[0].upper()})
                        vol_df   = data[["Volume"]].rename(columns={"Volume": syms[0].upper()}) if "Volume" in data.columns else None

                if close_df is None:
                    return result

                for sym in syms:
                    s = sym.upper()
                    if s not in close_df.columns:
                        continue
                    closes = close_df[s].dropna()
                    if closes.empty:
                        continue
                    price  = float(closes.iloc[-1])
                    prev   = float(closes.iloc[-2]) if len(closes) >= 2 else price
                    change = ((price - prev) / prev * 100) if prev else 0.0
                    volume = 0
                    if vol_df is not None and s in vol_df.columns:
                        v = vol_df[s].dropna()
                        volume = int(v.iloc[-1]) if not v.empty else 0
                    result[s] = {
                        "price":  round(price, 4),
                        "change": round(change, 2),
                        "volume": volume,
                    }

        except Exception as e:
            print(f"[prices] yfinance error: {e}")

        return result

    loop = asyncio.get_event_loop()
    prices = await loop.run_in_executor(None, _fetch_sync, symbols)
    return prices


async def fetch_ohlcv(symbol: str, period: str = "1mo", interval: str = "1d"):
    """
    Fetch OHLCV data as a pandas DataFrame for the given symbol.
    period: 1d|5d|1mo|3mo|6mo|1y|2y|5y
    interval: 1m|5m|15m|1h|1d|1wk|1mo
    Returns a DataFrame with columns Open, High, Low, Close, Volume and DatetimeIndex.
    """
    def _fetch_sync():
        import yfinance as yf
        import pandas as pd

        try:
            data = yf.download(
                tickers=symbol,
                period=period,
                interval=interval,
                auto_adjust=False,
                progress=False,
            )
            if data.empty:
                return pd.DataFrame()

            # Flatten MultiIndex if present (yfinance >= 0.2)
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)

            data.index.name = None
            return data[["Open", "High", "Low", "Close", "Volume"]]
        except Exception as e:
            print(f"[ohlcv] yfinance error: {e}")
            import pandas as pd
            return pd.DataFrame()

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_sync)
