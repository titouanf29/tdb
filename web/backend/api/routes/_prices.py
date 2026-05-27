"""
Shared price-fetching helper.

Priority chain per symbol type:
  - International stocks (.PA .DE .L .AS …) → Twelve Data /quote (real-time)
  - US stocks (plain ticker)                → Polygon.io snapshot  (real-time)
  - Crypto (-USD)                           → Twelve Data /quote   (real-time)
  - Forex (=X)                              → Twelve Data /quote   (real-time)
  - Indices (^…) / Commodities (=F)        → yfinance fast_info   (15-min delay)
  - Anything still missing                  → yfinance fast_info   (fallback)
"""
import asyncio
import httpx

# ── Exchange-suffix → Twelve Data exchange code ───────────────────────────────
EXCHANGE_MAP = {
    ".PA": "XPAR",  ".L":  "XLON",  ".DE": "XETR",
    ".AS": "XAMS",  ".BR": "XBRU",  ".LS": "XLIS",
    ".MC": "XMAD",  ".MI": "XMIL",  ".SW": "XSWX",
    ".T":  "XTKS",  ".HK": "XHKG",  ".KS": "XKRX",
    ".NS": "XNSE",  ".SS": "XSHG",
}


def _yf_to_td(symbol: str) -> tuple:
    """Convert yfinance symbol → (base, exchange_code) for Twelve Data.
    Returns ('', '') when no exchange suffix is found (US stocks).
    """
    s = symbol.upper()
    for suffix, exchange in EXCHANGE_MAP.items():
        if s.endswith(suffix.upper()):
            base = symbol[: len(symbol) - len(suffix)]
            return base, exchange
    return "", ""


def _classify(symbol: str) -> str:
    """Return the data-source category for a symbol."""
    s = symbol.upper()
    if s.startswith("^"):
        return "index"
    if s.endswith("=F"):
        return "commodity"
    if s.endswith("=X"):
        return "forex"
    if s.endswith("-USD") or s.endswith("-BTC"):
        return "crypto"
    for suffix in EXCHANGE_MAP:
        if s.endswith(suffix.upper()):
            return "intl"
    return "us"


def _forex_to_td(symbol: str) -> str:
    """EURUSD=X → EUR/USD"""
    base = symbol.replace("=X", "").replace("=x", "")
    if len(base) == 6:
        return f"{base[:3]}/{base[3:]}"
    return base


def _crypto_to_td(symbol: str) -> str:
    """BTC-USD → BTC/USD"""
    return symbol.replace("-", "/").replace("=X", "").upper()


# ── Twelve Data batch quote ───────────────────────────────────────────────────

async def _td_quotes(td_symbols: list[str], orig_map: dict[str, str], api_key: str) -> dict[str, dict]:
    """
    Fetch quotes from Twelve Data for a list of already-formatted TD symbols.
    orig_map: {td_symbol → original yf-style symbol}
    Returns {original_symbol: {price, change, volume}}
    """
    result = {}
    if not td_symbols or not api_key:
        return result

    # TD accepts comma-separated, max ~120 symbols per request on paid plans
    batch = ",".join(td_symbols)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://api.twelvedata.com/quote",
                params={"symbol": batch, "apikey": api_key},
            )
        if r.status_code != 200:
            return result
        data = r.json()

        # Single symbol → object; multiple → {symbol: object}
        if len(td_symbols) == 1:
            items = {td_symbols[0]: data}
        else:
            items = data if isinstance(data, dict) else {}

        for td_sym, d in items.items():
            if not isinstance(d, dict) or d.get("status") == "error":
                continue
            try:
                price  = float(d.get("close") or d.get("price") or 0)
                change = float(d.get("percent_change") or 0)
                volume = int(float(d.get("volume") or 0))
                if price <= 0:
                    continue
                orig = orig_map.get(td_sym, td_sym)
                result[orig.upper()] = {
                    "price":  round(price, 4),
                    "change": round(change, 2),
                    "volume": volume,
                }
            except Exception:
                continue
    except Exception as e:
        print(f"[prices/td] error: {e}")

    return result


# ── Polygon.io batch snapshot (US stocks) ────────────────────────────────────

async def _poly_quotes(symbols: list[str], api_key: str) -> dict[str, dict]:
    """Fetch US stock quotes from Polygon.io snapshot endpoint."""
    result = {}
    if not symbols or not api_key:
        return result
    tickers = ",".join(s.upper() for s in symbols)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers",
                params={"tickers": tickers, "apiKey": api_key},
            )
        if r.status_code != 200:
            return result
        data = r.json()
        for t in data.get("tickers", []):
            sym   = t.get("ticker", "").upper()
            day   = t.get("day", {})
            prev  = t.get("prevDay", {})
            price = float(day.get("c") or t.get("lastTrade", {}).get("p") or 0)
            prev_c = float(prev.get("c") or 0)
            if price <= 0:
                continue
            change = float(t.get("todaysChangePerc") or (
                ((price - prev_c) / prev_c * 100) if prev_c else 0
            ))
            volume = int(day.get("v") or 0)
            result[sym] = {
                "price":  round(price, 4),
                "change": round(change, 2),
                "volume": volume,
            }
    except Exception as e:
        print(f"[prices/poly] error: {e}")
    return result


# ── yfinance fallback (indices, commodities, anything missed) ─────────────────

def _yf_fast_info(symbols: list[str]) -> dict[str, dict]:
    """Use yfinance fast_info for symbols not covered by paid APIs."""
    import yfinance as yf
    result = {}
    for sym in symbols:
        s = sym.upper()
        try:
            fi = yf.Ticker(sym).fast_info
            price = float(fi.last_price or 0)
            prev  = float(fi.previous_close or 0)
            if price <= 0:
                continue
            change = ((price - prev) / prev * 100) if prev else 0.0
            result[s] = {
                "price":  round(price, 4),
                "change": round(change, 2),
                "volume": int(getattr(fi, "three_month_average_volume", 0) or 0),
            }
        except Exception as e:
            print(f"[prices/yf] fast_info error {sym}: {e}")
    return result


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_prices(symbols: list[str]) -> dict[str, dict]:
    """
    Returns {symbol: {price, change, volume}} for each symbol.
    Uses the most accurate source available per symbol type.
    """
    if not symbols:
        return {}

    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY

    # ── Classify ──────────────────────────────────────────────────────────────
    intl:      list[str] = []
    us:        list[str] = []
    crypto:    list[str] = []
    forex_syms: list[str] = []
    yf_syms:   list[str] = []  # indices + commodities

    for sym in symbols:
        cat = _classify(sym)
        if cat == "intl":
            intl.append(sym)
        elif cat == "us":
            us.append(sym)
        elif cat == "crypto":
            crypto.append(sym)
        elif cat == "forex":
            forex_syms.append(sym)
        else:
            yf_syms.append(sym)  # index, commodity

    # ── Build Twelve Data request maps ────────────────────────────────────────
    # intl: TTE.PA → TTE:XPAR
    intl_td_map: dict[str, str] = {}  # td_sym → original
    for sym in intl:
        base, exchange = _yf_to_td(sym)
        if base and exchange:
            td_sym = f"{base}:{exchange}"
            intl_td_map[td_sym] = sym

    # crypto: BTC-USD → BTC/USD
    crypto_td_map: dict[str, str] = {}
    for sym in crypto:
        td_sym = _crypto_to_td(sym)
        crypto_td_map[td_sym] = sym

    # forex: EURUSD=X → EUR/USD
    forex_td_map: dict[str, str] = {}
    for sym in forex_syms:
        td_sym = _forex_to_td(sym)
        forex_td_map[td_sym] = sym

    # ── Fetch in parallel ─────────────────────────────────────────────────────
    td_all_syms  = list(intl_td_map) + list(crypto_td_map) + list(forex_td_map)
    td_all_map   = {**intl_td_map, **crypto_td_map, **forex_td_map}

    async def _empty() -> dict:
        return {}

    td_task   = _td_quotes(td_all_syms, td_all_map, TWELVEDATA_API_KEY) if td_all_syms else _empty()
    poly_task = _poly_quotes(us, POLYGON_API_KEY) if us else _empty()

    td_result, poly_result = await asyncio.gather(td_task, poly_task, return_exceptions=True)
    if isinstance(td_result, Exception):
        td_result = {}
    if isinstance(poly_result, Exception):
        poly_result = {}

    result: dict[str, dict] = {**td_result, **poly_result}

    # ── yfinance for indices/commodities + anything still missing ─────────────
    still_missing = [
        s for s in symbols
        if s.upper() not in result
    ]
    yf_needed = list(set(yf_syms + still_missing))

    if yf_needed:
        loop = asyncio.get_event_loop()
        yf_res = await loop.run_in_executor(None, _yf_fast_info, yf_needed)
        result.update(yf_res)

    return result


# ── OHLCV (unchanged — used by analysis engine) ───────────────────────────────

async def fetch_ohlcv(symbol: str, period: str = "1mo", interval: str = "1d"):
    """
    Fetch OHLCV data as a pandas DataFrame.
    period: 1d|5d|1mo|3mo|6mo|1y|2y|5y
    interval: 1m|5m|15m|1h|1d|1wk|1mo
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
