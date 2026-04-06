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

    Uses interval="1h" so we always get the most recent traded price
    (the daily interval would return yesterday's close during market hours
    because the current day's Close is NaN until the session ends).
    """
    if not symbols:
        return {}

    def _prev_close(closes: "pd.Series") -> float:  # type: ignore[name-defined]
        """
        Given a Series of hourly closes, return the last close of the
        *previous* trading day so that change% matches Yahoo Finance.
        """
        import pandas as pd

        closes = closes.dropna()
        if closes.empty:
            return 0.0

        idx = closes.index
        # Normalise timezone so .date() comparisons work across exchanges
        if hasattr(idx, "tz") and idx.tz is not None:
            idx = idx.tz_convert("UTC").tz_localize(None)

        dates = pd.Series(idx, index=closes.index).dt.date
        last_date = dates.iloc[-1]
        prev_mask = dates < last_date
        if prev_mask.any():
            return float(closes[prev_mask].iloc[-1])
        # Fallback: use the second-to-last bar (same day, different hour)
        return float(closes.iloc[-2]) if len(closes) >= 2 else float(closes.iloc[-1])

    def _fetch_sync(syms: list[str]) -> dict:
        import yfinance as yf
        import pandas as pd

        result: dict = {}
        try:
            tickers_str = " ".join(syms)
            # interval="5m" → last bar is the most recent completed 5-min candle,
            # giving a real-time price accurate to within 5 minutes.
            # period="2d" gives enough history to always find a previous close.
            data = yf.download(
                tickers=tickers_str,
                period="2d",
                interval="5m",
                auto_adjust=False,
                progress=False,
                threads=True,
            )

            if data.empty:
                return result

            # ── Single ticker → flat columns ──────────────────────────────
            if len(syms) == 1:
                sym = syms[0].upper()
                if "Close" not in data.columns:
                    return result
                closes = data["Close"].dropna()
                if closes.empty:
                    return result
                price  = float(closes.iloc[-1])
                prev   = _prev_close(closes)
                change = ((price - prev) / prev * 100) if prev else 0.0
                vol_series = data["Volume"].dropna() if "Volume" in data.columns else pd.Series(dtype=float)
                volume = int(vol_series.iloc[-1]) if not vol_series.empty else 0
                result[sym] = {
                    "price":  round(price, 4),
                    "change": round(change, 2),
                    "volume": volume,
                }

            # ── Multiple tickers → MultiIndex columns ─────────────────────
            else:
                close_df: "pd.DataFrame | None" = None  # type: ignore[name-defined]
                vol_df:   "pd.DataFrame | None" = None  # type: ignore[name-defined]

                if isinstance(data.columns, pd.MultiIndex):
                    lvl0 = data.columns.get_level_values(0)
                    if "Close"  in lvl0:
                        close_df = data["Close"]
                    if "Volume" in lvl0:
                        vol_df   = data["Volume"]
                else:
                    # yfinance returned a flat frame even though multiple
                    # tickers were requested (happens when only one resolves)
                    if "Close" in data.columns:
                        col = syms[0].upper()
                        close_df = data[["Close"]].rename(columns={"Close": col})
                        if "Volume" in data.columns:
                            vol_df = data[["Volume"]].rename(columns={"Volume": col})

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
                    prev   = _prev_close(closes)
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
            print(f"[prices] yfinance download error: {e}")

        # ── Fallback: yf.Ticker.fast_info (plus fiable que download) ──────
        if not result:
            for sym in syms:
                s = sym.upper()
                if s in result:
                    continue
                try:
                    ticker = yf.Ticker(sym)
                    fi = ticker.fast_info
                    price = float(fi.last_price or 0)
                    prev  = float(fi.previous_close or 0)
                    if price > 0:
                        change = ((price - prev) / prev * 100) if prev else 0.0
                        result[s] = {
                            "price":  round(price, 4),
                            "change": round(change, 2),
                            "volume": int(fi.three_month_average_volume or 0),
                        }
                except Exception as e2:
                    print(f"[prices] fast_info fallback error for {sym}: {e2}")

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
