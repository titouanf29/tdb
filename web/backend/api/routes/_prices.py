"""
Shared price-fetching helper using Polygon.io (US/Crypto) + Twelve Data (Europe/Asia).
Replaces yfinance which is blocked on Railway.
"""
import httpx

EXCHANGE_MAP = {
    ".PA": "EURONEXT", ".AS": "EURONEXT", ".BR": "EURONEXT", ".LS": "EURONEXT",
    ".DE": "XETRA", ".L": "LSE", ".MI": "MIL", ".MC": "BMAD",
    ".SW": "SIX", ".KS": "KRX", ".HK": "HKEX", ".T": "TSE", ".NS": "NSE",
}

# Yahoo Finance index symbols → Twelve Data index symbols
INDEX_MAP = {
    "^GSPC": "SPX", "^DJI": "DJI", "^IXIC": "IXIC", "^RUT": "RUT",
    "^VIX": "VIX", "^STOXX50E": "STOXX50E", "^N225": "N225",
    "^TNX": "TNX", "^FTSE": "FTSE",
}


def _yf_to_td(sym: str):
    for suffix, exchange in EXCHANGE_MAP.items():
        if sym.endswith(suffix):
            return sym[:-len(suffix)], exchange
    return None, None


async def fetch_prices(symbols: list[str]) -> dict[str, dict]:
    """
    Returns {symbol: {price, change, volume}} for each symbol where data is available.
    Missing symbols are simply absent from the result (caller should default to 0).
    """
    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY

    if not symbols:
        return {}

    upper = [s.upper() for s in symbols]
    prices: dict = {}

    crypto_syms = [s for s in upper if s.endswith("-USD")]
    us_syms = [
        s for s in upper
        if not s.endswith("-USD") and not s.startswith("^")
        and "." not in s and "=" not in s
    ]
    intl_syms = [s for s in upper if any(s.endswith(sfx) for sfx in EXCHANGE_MAP)]

    async with httpx.AsyncClient(timeout=8.0) as client:

        # Polygon.io — US Stocks
        if us_syms and POLYGON_API_KEY:
            try:
                r = await client.get(
                    "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers",
                    params={"tickers": ",".join(us_syms), "apiKey": POLYGON_API_KEY},
                )
                if r.status_code == 200:
                    for t in r.json().get("tickers", []):
                        sym = t.get("ticker", "")
                        day, prev = t.get("day", {}), t.get("prevDay", {})
                        price = day.get("c") or t.get("lastTrade", {}).get("p") or 0
                        prev_c = prev.get("c") or 0
                        change = ((price - prev_c) / prev_c * 100) if prev_c else 0
                        if price:
                            prices[sym] = {"price": round(float(price), 4), "change": round(change, 2), "volume": int(day.get("v") or 0)}
            except Exception:
                pass

        # Polygon.io — Crypto (BTC-USD → X:BTCUSD)
        if crypto_syms and POLYGON_API_KEY:
            try:
                poly = ["X:" + s.replace("-USD", "USD") for s in crypto_syms]
                r = await client.get(
                    "https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers",
                    params={"tickers": ",".join(poly), "apiKey": POLYGON_API_KEY},
                )
                if r.status_code == 200:
                    for t in r.json().get("tickers", []):
                        psym = t.get("ticker", "")
                        orig = psym[2:-3] + "-USD"
                        day, prev = t.get("day", {}), t.get("prevDay", {})
                        price = day.get("c") or 0
                        prev_c = prev.get("c") or 0
                        change = ((price - prev_c) / prev_c * 100) if prev_c else 0
                        if price:
                            prices[orig] = {"price": round(float(price), 4), "change": round(change, 2), "volume": int(day.get("v") or 0)}
            except Exception:
                pass

        # Twelve Data — Europe / Asia
        if intl_syms and TWELVEDATA_API_KEY:
            try:
                td_params, td_to_orig = [], {}
                for sym in intl_syms:
                    base, exchange = _yf_to_td(sym)
                    if base and exchange:
                        td_sym = f"{base}:{exchange}"
                        td_params.append(td_sym)
                        td_to_orig[td_sym] = sym
                if td_params:
                    r = await client.get(
                        "https://api.twelvedata.com/quote",
                        params={"symbol": ",".join(td_params), "apikey": TWELVEDATA_API_KEY},
                    )
                    if r.status_code == 200:
                        data = r.json()
                        if isinstance(data, dict) and "close" in data:
                            data = {td_params[0]: data}
                        for td_sym, quote in data.items():
                            if not isinstance(quote, dict) or "close" not in quote:
                                continue
                            orig = td_to_orig.get(td_sym, "")
                            price = float(quote.get("close") or 0)
                            change = float(quote.get("percent_change") or 0)
                            volume = int(float(quote.get("volume") or 0))
                            if price and orig:
                                prices[orig] = {"price": round(price, 4), "change": round(change, 2), "volume": volume}
            except Exception:
                pass

    return prices


async def fetch_ohlcv(symbol: str, period: str = "1mo", interval: str = "1d"):
    """
    Fetch OHLCV data as a pandas DataFrame for the given symbol.
    period: 1d|5d|1mo|3mo|6mo|1y|2y|5y
    interval: 1m|5m|15m|1h|1d|1wk|1mo
    Returns a DataFrame with columns Open, High, Low, Close, Volume and DatetimeIndex.
    Returns empty DataFrame on failure.
    """
    import pandas as pd
    from datetime import date, timedelta, datetime as dt
    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY

    period_days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180,
                   "1y": 365, "2y": 730, "5y": 1825}
    days = period_days.get(period, 30)
    date_from = (date.today() - timedelta(days=days)).isoformat()
    date_to = date.today().isoformat()

    # Polygon interval mapping
    interval_map = {"1m": ("minute", 1), "5m": ("minute", 5), "15m": ("minute", 15),
                    "1h": ("hour", 1), "4h": ("hour", 4), "1d": ("day", 1),
                    "1wk": ("week", 1), "1mo": ("month", 1)}
    timespan, multiplier = interval_map.get(interval, ("day", 1))

    sym = symbol.upper()
    empty = pd.DataFrame()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Index symbols (^GSPC etc.) via Twelve Data
        if sym.startswith("^") and TWELVEDATA_API_KEY:
            td_sym = INDEX_MAP.get(sym)
            if td_sym:
                td_imap = {"1m": "1min", "5m": "5min", "15m": "15min",
                           "1h": "1h", "4h": "4h", "1d": "1day", "1wk": "1week", "1mo": "1month"}
                td_interval = td_imap.get(interval, "1day")
                try:
                    r = await client.get(
                        "https://api.twelvedata.com/time_series",
                        params={"symbol": td_sym, "interval": td_interval,
                                "start_date": date_from, "end_date": date_to,
                                "outputsize": 500, "apikey": TWELVEDATA_API_KEY}
                    )
                    if r.status_code == 200:
                        values = r.json().get("values", [])
                        if values:
                            rows = [{
                                "Open": float(v.get("open", 0)),
                                "High": float(v.get("high", 0)),
                                "Low": float(v.get("low", 0)),
                                "Close": float(v.get("close", 0)),
                                "Volume": int(float(v.get("volume", 0))),
                                "dt": dt.fromisoformat(v["datetime"])
                            } for v in reversed(values)]
                            df = pd.DataFrame(rows).set_index("dt")
                            df.index.name = None
                            return df
                except Exception:
                    pass
            return empty

        # International via Twelve Data
        base, exchange = _yf_to_td(sym)
        if base and exchange and TWELVEDATA_API_KEY:
            td_imap = {"1m": "1min", "5m": "5min", "15m": "15min",
                       "1h": "1h", "4h": "4h", "1d": "1day", "1wk": "1week", "1mo": "1month"}
            td_interval = td_imap.get(interval, "1day")
            try:
                r = await client.get(
                    "https://api.twelvedata.com/time_series",
                    params={"symbol": f"{base}:{exchange}", "interval": td_interval,
                            "start_date": date_from, "end_date": date_to,
                            "outputsize": 500, "apikey": TWELVEDATA_API_KEY}
                )
                if r.status_code == 200:
                    values = r.json().get("values", [])
                    if values:
                        rows = [{
                            "Open": float(v.get("open", 0)),
                            "High": float(v.get("high", 0)),
                            "Low": float(v.get("low", 0)),
                            "Close": float(v.get("close", 0)),
                            "Volume": int(float(v.get("volume", 0))),
                            "dt": dt.fromisoformat(v["datetime"])
                        } for v in reversed(values)]
                        df = pd.DataFrame(rows).set_index("dt")
                        df.index.name = None
                        return df
            except Exception:
                pass

        # US/Crypto via Polygon.io
        if POLYGON_API_KEY:
            poly_sym = sym
            if sym.endswith("-USD"):
                poly_sym = "X:" + sym.replace("-USD", "USD")
                locale, market = "global", "crypto"
            elif sym.startswith("^"):
                return empty  # indices not supported in Polygon free tier
            else:
                locale, market = "us", "stocks"
            try:
                r = await client.get(
                    f"https://api.polygon.io/v2/aggs/ticker/{poly_sym}/range/{multiplier}/{timespan}/{date_from}/{date_to}",
                    params={"adjusted": "true", "sort": "asc", "limit": 500, "apiKey": POLYGON_API_KEY}
                )
                if r.status_code == 200:
                    results = r.json().get("results", [])
                    if results:
                        rows = [{
                            "Open": float(bar.get("o", 0)),
                            "High": float(bar.get("h", 0)),
                            "Low": float(bar.get("l", 0)),
                            "Close": float(bar.get("c", 0)),
                            "Volume": int(bar.get("v", 0)),
                            "dt": pd.Timestamp(bar["t"], unit="ms", tz="UTC")
                        } for bar in results]
                        df = pd.DataFrame(rows).set_index("dt")
                        df.index.name = None
                        return df
            except Exception:
                pass

    return empty
