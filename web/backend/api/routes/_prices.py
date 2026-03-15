"""
Shared price-fetching helper.
Priority: Polygon.io (US/Crypto, if key set) → Twelve Data (everything else).
Twelve Data handles: US stocks, international, indices, crypto, commodities.
"""
import httpx

EXCHANGE_MAP = {
    ".PA": "EURONEXT", ".AS": "EURONEXT", ".BR": "EURONEXT", ".LS": "EURONEXT",
    ".DE": "XETRA", ".L": "LSE", ".MI": "MIL", ".MC": "BMAD",
    ".SW": "SIX", ".KS": "KRX", ".HK": "HKEX", ".T": "TSE", ".NS": "NSE",
}

# Yahoo Finance index symbols → Twelve Data
INDEX_MAP = {
    "^GSPC": "SPX", "^DJI": "DJI", "^IXIC": "IXIC", "^RUT": "RUT",
    "^VIX": "VIX", "^STOXX50E": "STOXX50E", "^N225": "N225",
    "^TNX": "TNX", "^FTSE": "FTSE100",
    "^FCHI": "CAC40", "^SBF120": "SBF120", "^GDAXI": "DAX",
    "^AEX": "AEX", "^BFX": "BEL20", "^IBEX": "IBEX35",
    "^FTSEMIB": "FTSEMIB", "^SSMI": "SMI",
    "^HSI": "HSI", "^KOSPI": "KOSPI", "^BSESN": "SENSEX",
}

# Yahoo Finance commodity symbols → Twelve Data
COMMODITY_MAP = {
    "CL=F":  "WTI",       # Pétrole WTI
    "NG=F":  "NG1!",      # Gaz naturel
    "BZ=F":  "BRENT",     # Pétrole Brent
    "RB=F":  "RB1!",      # Essence
    "HO=F":  "HO1!",      # Fioul domestique
    "GC=F":  "XAU/USD",   # Or
    "SI=F":  "XAG/USD",   # Argent
    "PL=F":  "XPT/USD",   # Platine
    "PA=F":  "XPD/USD",   # Palladium
    "HG=F":  "COPPER",    # Cuivre
    "ZC=F":  "CORN",      # Maïs
    "ZW=F":  "WHEAT",     # Blé
    "ZS=F":  "SOYBEAN",   # Soja
    "KC=F":  "COFFEE",    # Café
    "SB=F":  "SUGAR",     # Sucre
    "CT=F":  "COTTON",    # Coton
    "CC=F":  "COCOA",     # Cacao
    "OJ=F":  "OJ1!",      # Jus d'orange
    "LE=F":  "LE1!",      # Bœuf
    "GF=F":  "GF1!",      # Bœuf (feeder)
    "HE=F":  "HE1!",      # Porc
    "ALI=F": "ALI1!",     # Aluminium
}


def _yf_to_td(sym: str):
    """Convert Yahoo Finance intl symbol (BNP.PA) → (BNP, EURONEXT)."""
    for suffix, exchange in EXCHANGE_MAP.items():
        if sym.endswith(suffix):
            return sym[:-len(suffix)], exchange
    return None, None


async def fetch_prices(symbols: list[str]) -> dict[str, dict]:
    """
    Returns {symbol: {price, change, volume}} for each symbol where data is available.
    Missing symbols are simply absent from the result.
    """
    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY

    if not symbols:
        return {}

    upper = [s.upper() for s in symbols]
    prices: dict = {}

    crypto_syms    = [s for s in upper if s.endswith("-USD")]
    index_syms     = [s for s in upper if s.startswith("^")]
    commodity_syms = [s for s in upper if "=" in s]
    intl_syms      = [s for s in upper if any(s.endswith(sfx) for sfx in EXCHANGE_MAP)]
    us_syms        = [
        s for s in upper
        if not s.endswith("-USD") and not s.startswith("^")
        and "=" not in s and "." not in s
    ]

    async with httpx.AsyncClient(timeout=12.0) as client:

        # ── Polygon.io : US stocks ─────────────────────────────────────────
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
                        price  = day.get("c") or t.get("lastTrade", {}).get("p") or 0
                        prev_c = prev.get("c") or 0
                        change = ((price - prev_c) / prev_c * 100) if prev_c else 0
                        if price:
                            prices[sym] = {
                                "price": round(float(price), 4),
                                "change": round(change, 2),
                                "volume": int(day.get("v") or 0),
                            }
            except Exception:
                pass

        # ── Polygon.io : Crypto ────────────────────────────────────────────
        if crypto_syms and POLYGON_API_KEY:
            try:
                poly = ["X:" + s.replace("-USD", "USD") for s in crypto_syms]
                r = await client.get(
                    "https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers",
                    params={"tickers": ",".join(poly), "apiKey": POLYGON_API_KEY},
                )
                if r.status_code == 200:
                    for t in r.json().get("tickers", []):
                        psym  = t.get("ticker", "")
                        orig  = psym[2:-3] + "-USD"
                        day, prev = t.get("day", {}), t.get("prevDay", {})
                        price  = day.get("c") or 0
                        prev_c = prev.get("c") or 0
                        change = ((price - prev_c) / prev_c * 100) if prev_c else 0
                        if price:
                            prices[orig] = {
                                "price": round(float(price), 4),
                                "change": round(change, 2),
                                "volume": int(day.get("v") or 0),
                            }
            except Exception:
                pass

        # ── Twelve Data : tout le reste (+ fallback US/Crypto sans Polygon) ─
        if TWELVEDATA_API_KEY:
            td_batch: dict[str, str] = {}  # td_symbol → original_symbol

            # US stocks manquants (pas dans prices via Polygon)
            for s in us_syms:
                if s not in prices:
                    td_batch[s] = s

            # Crypto manquante  BTC-USD → BTC/USD
            for s in crypto_syms:
                if s not in prices:
                    td_batch[s.replace("-USD", "/USD")] = s

            # Actions internationales
            for sym in intl_syms:
                base, exchange = _yf_to_td(sym)
                if base and exchange:
                    td_batch[f"{base}:{exchange}"] = sym

            # Indices  ^GSPC → SPX
            for sym in index_syms:
                td_sym = INDEX_MAP.get(sym)
                if td_sym:
                    td_batch[td_sym] = sym

            # Matières premières  GC=F → XAU/USD
            for sym in commodity_syms:
                td_sym = COMMODITY_MAP.get(sym)
                if td_sym:
                    td_batch[td_sym] = sym

            # Envoi par blocs de 50 symboles
            td_items = list(td_batch.items())
            for i in range(0, len(td_items), 50):
                chunk       = td_items[i:i + 50]
                td_symbols  = [item[0] for item in chunk]
                td_orig_map = {item[0]: item[1] for item in chunk}

                try:
                    r = await client.get(
                        "https://api.twelvedata.com/quote",
                        params={"symbol": ",".join(td_symbols), "apikey": TWELVEDATA_API_KEY},
                    )
                    if r.status_code != 200:
                        continue

                    data = r.json()
                    # Réponse mono-symbole → dict direct avec "close"
                    if len(td_symbols) == 1 and isinstance(data, dict) and "close" in data:
                        data = {td_symbols[0]: data}

                    for td_sym, quote in data.items():
                        if not isinstance(quote, dict) or "close" not in quote:
                            continue
                        orig = td_orig_map.get(td_sym, "")
                        if not orig or orig in prices:  # ne pas écraser Polygon
                            continue
                        price  = float(quote.get("close") or 0)
                        change = float(quote.get("percent_change") or 0)
                        volume = int(float(quote.get("volume") or 0))
                        if price:
                            prices[orig] = {
                                "price":  round(price, 4),
                                "change": round(change, 2),
                                "volume": volume,
                            }
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

    period_days = {
        "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
        "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
    }
    days      = period_days.get(period, 30)
    date_from = (date.today() - timedelta(days=days)).isoformat()
    date_to   = date.today().isoformat()

    interval_map = {
        "1m": ("minute", 1), "5m": ("minute", 5), "15m": ("minute", 15),
        "1h": ("hour", 1),   "4h": ("hour", 4),   "1d":  ("day", 1),
        "1wk": ("week", 1),  "1mo": ("month", 1),
    }
    timespan, multiplier = interval_map.get(interval, ("day", 1))

    td_imap = {
        "1m": "1min", "5m": "5min", "15m": "15min",
        "1h": "1h",   "4h": "4h",   "1d":  "1day",
        "1wk": "1week", "1mo": "1month",
    }
    td_interval = td_imap.get(interval, "1day")

    sym   = symbol.upper()
    empty = pd.DataFrame()

    def _rows_from_td(values):
        return [{
            "Open":   float(v.get("open",   0)),
            "High":   float(v.get("high",   0)),
            "Low":    float(v.get("low",    0)),
            "Close":  float(v.get("close",  0)),
            "Volume": int(float(v.get("volume", 0))),
            "dt":     dt.fromisoformat(v["datetime"]),
        } for v in reversed(values)]

    async with httpx.AsyncClient(timeout=12.0) as client:

        # ── Index via Twelve Data ──────────────────────────────────────────
        if sym.startswith("^") and TWELVEDATA_API_KEY:
            td_sym = INDEX_MAP.get(sym)
            if td_sym:
                try:
                    r = await client.get(
                        "https://api.twelvedata.com/time_series",
                        params={
                            "symbol": td_sym, "interval": td_interval,
                            "start_date": date_from, "end_date": date_to,
                            "outputsize": 500, "apikey": TWELVEDATA_API_KEY,
                        },
                    )
                    if r.status_code == 200:
                        values = r.json().get("values", [])
                        if values:
                            df = pd.DataFrame(_rows_from_td(values)).set_index("dt")
                            df.index.name = None
                            return df
                except Exception:
                    pass
            return empty

        # ── Commodity via Twelve Data ──────────────────────────────────────
        if "=" in sym and TWELVEDATA_API_KEY:
            td_sym = COMMODITY_MAP.get(sym)
            if td_sym:
                try:
                    r = await client.get(
                        "https://api.twelvedata.com/time_series",
                        params={
                            "symbol": td_sym, "interval": td_interval,
                            "start_date": date_from, "end_date": date_to,
                            "outputsize": 500, "apikey": TWELVEDATA_API_KEY,
                        },
                    )
                    if r.status_code == 200:
                        values = r.json().get("values", [])
                        if values:
                            df = pd.DataFrame(_rows_from_td(values)).set_index("dt")
                            df.index.name = None
                            return df
                except Exception:
                    pass
            return empty

        # ── International via Twelve Data ─────────────────────────────────
        base, exchange = _yf_to_td(sym)
        if base and exchange and TWELVEDATA_API_KEY:
            try:
                r = await client.get(
                    "https://api.twelvedata.com/time_series",
                    params={
                        "symbol": f"{base}:{exchange}", "interval": td_interval,
                        "start_date": date_from, "end_date": date_to,
                        "outputsize": 500, "apikey": TWELVEDATA_API_KEY,
                    },
                )
                if r.status_code == 200:
                    values = r.json().get("values", [])
                    if values:
                        df = pd.DataFrame(_rows_from_td(values)).set_index("dt")
                        df.index.name = None
                        return df
            except Exception:
                pass

        # ── US stocks / Crypto via Polygon.io ─────────────────────────────
        if POLYGON_API_KEY:
            poly_sym = sym
            if sym.endswith("-USD"):
                poly_sym = "X:" + sym.replace("-USD", "USD")
            elif sym.startswith("^"):
                return empty  # indices non supportés sur free tier Polygon

            try:
                r = await client.get(
                    f"https://api.polygon.io/v2/aggs/ticker/{poly_sym}/range"
                    f"/{multiplier}/{timespan}/{date_from}/{date_to}",
                    params={"adjusted": "true", "sort": "asc", "limit": 500, "apiKey": POLYGON_API_KEY},
                )
                if r.status_code == 200:
                    results = r.json().get("results", [])
                    if results:
                        rows = [{
                            "Open":   float(bar.get("o", 0)),
                            "High":   float(bar.get("h", 0)),
                            "Low":    float(bar.get("l", 0)),
                            "Close":  float(bar.get("c", 0)),
                            "Volume": int(bar.get("v", 0)),
                            "dt":     pd.Timestamp(bar["t"], unit="ms", tz="UTC"),
                        } for bar in results]
                        df = pd.DataFrame(rows).set_index("dt")
                        df.index.name = None
                        return df
            except Exception:
                pass

        # ── Fallback US stocks via Twelve Data ────────────────────────────
        if TWELVEDATA_API_KEY and "." not in sym and "=" not in sym and not sym.startswith("^"):
            crypto_td = sym.replace("-USD", "/USD") if sym.endswith("-USD") else None
            td_sym = crypto_td or sym
            try:
                r = await client.get(
                    "https://api.twelvedata.com/time_series",
                    params={
                        "symbol": td_sym, "interval": td_interval,
                        "start_date": date_from, "end_date": date_to,
                        "outputsize": 500, "apikey": TWELVEDATA_API_KEY,
                    },
                )
                if r.status_code == 200:
                    values = r.json().get("values", [])
                    if values:
                        df = pd.DataFrame(_rows_from_td(values)).set_index("dt")
                        df.index.name = None
                        return df
            except Exception:
                pass

    return empty
