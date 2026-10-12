"""
Shared price-fetching helper.

Priority chain per symbol type (most → least accurate):
  1. Twelve Data /quote  — intl stocks, indices, crypto, forex, commodities
  2. Polygon.io snapshot — US stocks (+ fallback for US indices)
  3. yfinance fast_info  — last resort for anything that fails above
"""
import asyncio
import os

import httpx

# ── Exchange-suffix → Twelve Data exchange code ───────────────────────────────
EXCHANGE_MAP = {
    ".PA": "XPAR",  ".L":  "XLON",  ".DE": "XETR",
    ".AS": "XAMS",  ".BR": "XBRU",  ".LS": "XLIS",
    ".MC": "XMAD",  ".MI": "XMIL",  ".SW": "XSWX",
    ".T":  "XTKS",  ".HK": "XHKG",  ".KS": "XKRX",
    ".NS": "XNSE",  ".SS": "XSHG",
}

# ── yfinance index symbol → Twelve Data symbol ────────────────────────────────
INDEX_TO_TD: dict[str, str] = {
    "^GSPC":    "SPX",      "^IXIC":    "IXIC",     "^DJI":     "DJI",
    "^RUT":     "RUT",      "^VIX":     "VIX",      "^NDX":     "NDX",
    "^FCHI":    "CAC40",    "^GDAXI":   "DAX",      "^FTSE":    "FTSE100",
    "^STOXX50E":"SX5E",     "^AEX":     "AEX",      "^IBEX":    "IBEX35",
    "^N225":    "NI225",    "^HSI":     "HSI",      "^KS11":    "KOSPI",
    "^BSESN":   "SENSEX",   "^NSEI":    "NIFTY50",
}

# ── yfinance futures symbol → Twelve Data equivalent ─────────────────────────
# Spot prices are more real-time and accurate for display purposes.
COMMODITY_TO_TD: dict[str, str] = {
    "GC=F":  "XAU/USD",   # Gold spot
    "SI=F":  "XAG/USD",   # Silver spot
    "CL=F":  "WTI/USD",   # Crude oil WTI
    "BZ=F":  "BRENTOIL",  # Brent crude
    "NG=F":  "NATGAS",    # Natural gas
    "HG=F":  "COPPER",    # Copper
    "PL=F":  "XPT/USD",   # Platinum
    "PA=F":  "XPD/USD",   # Palladium
    "ZC=F":  "CORN",      # Corn
    "ZW=F":  "WHEAT",     # Wheat
    "ZS=F":  "SOYBN",     # Soybean
    "KC=F":  "COFFEE",    # Coffee
    "CT=F":  "COTTON",    # Cotton
    "SB=F":  "SUGAR",     # Sugar
    "CC=F":  "COCOA",     # Cocoa
}


def _yf_to_td(symbol: str) -> tuple[str, str]:
    """yfinance international symbol → (base, exchange_code) for Twelve Data."""
    s = symbol.upper()
    for suffix, exchange in EXCHANGE_MAP.items():
        if s.endswith(suffix.upper()):
            base = symbol[: len(symbol) - len(suffix)]
            return base, exchange
    return "", ""


def _forex_to_td(symbol: str) -> str:
    """EURUSD=X → EUR/USD"""
    base = symbol.upper().replace("=X", "")
    if len(base) == 6:
        return f"{base[:3]}/{base[3:]}"
    return base


def _crypto_to_td(symbol: str) -> str:
    """BTC-USD → BTC/USD"""
    return symbol.upper().replace("-", "/")


# ── Twelve Data batch /quote ──────────────────────────────────────────────────

async def _td_quotes(
    td_symbols: list[str],
    orig_map: dict[str, str],
    api_key: str,
) -> dict[str, dict]:
    """
    Batch-fetch quotes from Twelve Data.
    td_symbols : already-formatted TD symbols (e.g. "TTE:XPAR", "SPX", "BTC/USD")
    orig_map   : {td_symbol → original yf-style key used as result dict key}
    Returns    : {original_symbol.upper(): {price, change, volume}}
    """
    result: dict[str, dict] = {}
    if not td_symbols or not api_key:
        return result

    # Twelve Data recommends ≤ 120 symbols per request; split just in case.
    CHUNK = 80
    chunks = [td_symbols[i : i + CHUNK] for i in range(0, len(td_symbols), CHUNK)]

    async with httpx.AsyncClient(timeout=12.0) as client:
        for chunk in chunks:
            batch = ",".join(chunk)
            try:
                r = await client.get(
                    "https://api.twelvedata.com/quote",
                    params={"symbol": batch, "apikey": api_key},
                )
                if r.status_code != 200:
                    continue
                data = r.json()

                # Single symbol → plain object; multiple → {td_sym: object}
                items: dict = {chunk[0]: data} if len(chunk) == 1 else (
                    data if isinstance(data, dict) else {}
                )

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
                print(f"[prices/td] chunk error: {e}")

    return result


# ── Polygon.io batch snapshot ─────────────────────────────────────────────────

async def _poly_stocks(symbols: list[str], api_key: str) -> dict[str, dict]:
    """Fetch US equity quotes from Polygon.io snapshot."""
    result: dict[str, dict] = {}
    if not symbols or not api_key:
        return result

    # Polygon accepts up to 250 tickers per call
    CHUNK = 200
    async with httpx.AsyncClient(timeout=12.0) as client:
        for i in range(0, len(symbols), CHUNK):
            chunk = symbols[i : i + CHUNK]
            tickers = ",".join(s.upper() for s in chunk)
            try:
                r = await client.get(
                    "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers",
                    params={"tickers": tickers, "apiKey": api_key},
                )
                if r.status_code != 200:
                    continue
                for t in r.json().get("tickers", []):
                    sym    = t.get("ticker", "").upper()
                    day    = t.get("day", {})
                    prev   = t.get("prevDay", {})
                    price  = float(day.get("c") or t.get("lastTrade", {}).get("p") or 0)
                    prev_c = float(prev.get("c") or 0)
                    if price <= 0:
                        continue
                    change = float(t.get("todaysChangePerc") or (
                        ((price - prev_c) / prev_c * 100) if prev_c else 0
                    ))
                    result[sym] = {
                        "price":  round(price, 4),
                        "change": round(change, 2),
                        "volume": int(day.get("v") or 0),
                    }
            except Exception as e:
                print(f"[prices/poly] chunk error: {e}")

    return result


# ── yfinance fallback ─────────────────────────────────────────────────────────

def _yf_one(sym: str) -> tuple[str, dict] | None:
    import yfinance as yf
    try:
        fi    = yf.Ticker(sym).fast_info
        price = float(fi.last_price or 0)
        prev  = float(fi.previous_close or 0)
        if price <= 0:
            return None
        change = ((price - prev) / prev * 100) if prev else 0.0
        return sym.upper(), {
            "price":  round(price, 4),
            "change": round(change, 2),
            "volume": int(getattr(fi, "three_month_average_volume", None) or 0),
        }
    except Exception as e:
        print(f"[prices/yf] {sym}: {e}")
        return None


def _yf_fast_info(symbols: list[str]) -> dict[str, dict]:
    """Repli, en parallèle.

    Il interrogeait yfinance SYMBOLE PAR SYMBOLE, dans une seule boucle. Sans
    clé Twelve Data, lire les cours de 95 valeurs européennes prenait ainsi
    49 secondes — mesuré au départ d'un scan, qui restait bloqué là avant même
    d'avoir analysé quoi que ce soit. Chaque appel est une attente réseau,
    donc ils s'empilent au lieu de se recouvrir.

    Le parallélisme est borné : yfinance tape Yahoo, qui limite le débit, et
    lancer 800 requêtes d'un coup ferait remplacer l'attente par des refus.
    """
    from concurrent.futures import ThreadPoolExecutor
    if not symbols:
        return {}
    workers = min(16, max(1, len(symbols)))
    result: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for got in pool.map(_yf_one, symbols):
            if got:
                result[got[0]] = got[1]
    return result


# ── Quote cache ───────────────────────────────────────────────────────────────
#
# Un cache de quelques secondes, qui règle deux problèmes d'un coup.
#
#   1. LA COHÉRENCE. Le wallet appelle /balance ET /positions dans le même
#      rafraîchissement. Chacun interrogeait le fournisseur de son côté, à
#      quelques centaines de millisecondes d'écart : on a vu /balance rendre
#      un résultat total de 0 pendant que /positions rendait -1,75 sur la même
#      position, simplement parce que les deux lectures étaient tombées sur
#      des instants différents. Deux appels dans la même seconde lisent
#      maintenant le même cours.
#
#   2. LA CADENCE. Un scalpeur rafraîchit toutes les 5 secondes, et il a
#      raison de le vouloir — mais son écran déclenche deux appels par tour,
#      soit 24 requêtes par minute et par symbole. Le quota gratuit de Twelve
#      Data est de 8 crédits par minute. Le cache découple la cadence de
#      l'écran du débit vers le fournisseur : l'utilisateur peut demander
#      toutes les 5 secondes, on ne sort en amont qu'une fois par TTL.
#
# La durée est volontairement plus courte que la cadence la plus rapide de
# l'interface (5 s en scalping) : le cache dédoublonne une rafale, il ne
# retarde pas une lecture. Et seuls les cours OBTENUS sont mémorisés — un
# symbole qui a échoué doit être réessayé au tour suivant, pas mis en cache
# comme absent pendant quatre secondes.
_QUOTE_CACHE: dict[str, tuple[float, dict]] = {}
_QUOTE_TTL = float(os.getenv("QUOTE_CACHE_TTL", "4"))
_QUOTE_CACHE_MAX = int(os.getenv("QUOTE_CACHE_MAX", "1000"))


def _quote_cache_get(symbols: list[str]) -> tuple[dict[str, dict], list[str]]:
    """Partage les symboles entre ceux encore frais en cache et ceux à relire."""
    import time as _time
    if _QUOTE_TTL <= 0:
        return {}, list(symbols)
    now = _time.monotonic()
    fresh: dict[str, dict] = {}
    stale: list[str] = []
    for sym in symbols:
        hit = _QUOTE_CACHE.get(sym.upper())
        if hit is not None and now - hit[0] < _QUOTE_TTL:
            fresh[sym.upper()] = dict(hit[1])
        else:
            stale.append(sym)
    return fresh, stale


def _quote_cache_put(quotes: dict[str, dict]) -> None:
    import time as _time
    if _QUOTE_TTL <= 0 or not quotes:
        return
    now = _time.monotonic()
    if len(_QUOTE_CACHE) + len(quotes) > _QUOTE_CACHE_MAX:
        for key in sorted(_QUOTE_CACHE, key=lambda k: _QUOTE_CACHE[k][0])[: len(quotes)]:
            _QUOTE_CACHE.pop(key, None)
    for sym, data in quotes.items():
        _QUOTE_CACHE[sym.upper()] = (now, dict(data))


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_prices(symbols: list[str]) -> dict[str, dict]:
    """
    Returns {symbol: {price, change, volume}} for each symbol.
    Uses the most accurate real-time source available per symbol type.
    """
    if not symbols:
        return {}

    cached, symbols = _quote_cache_get(symbols)
    if not symbols:
        return cached

    from config import POLYGON_API_KEY, TWELVEDATA_API_KEY

    # ── Build Twelve Data request map ─────────────────────────────────────────
    # td_map: {td_formatted_symbol → original_symbol}
    td_map:  dict[str, str] = {}
    us_syms: list[str]      = []    # Polygon
    yf_only: list[str]      = []    # true last resort

    for sym in symbols:
        s = sym.upper()

        # Indices
        if s.startswith("^"):
            td_sym = INDEX_TO_TD.get(s)
            if td_sym:
                td_map[td_sym] = sym
            else:
                yf_only.append(sym)
            continue

        # Contrats à terme : le contrat lui-même, jamais le comptant.
        #
        # GC=F passait par Twelve Data en XAU/USD — l'or AU COMPTANT — alors
        # que les bougies, l'analyse, le stop et l'objectif sont ceux du
        # CONTRAT À TERME. Le contrat cote au-dessus du comptant (le coût de
        # portage, quelques dizaines de dollars sur l'or) : une position
        # s'ouvrait au comptant avec un stop calculé sur le contrat, décalé
        # parfois de la moitié de la distance au stop. Un seul prix, partout.
        if s.endswith("=F"):
            yf_only.append(sym)
            continue

        # Forex  EURUSD=X → EUR/USD
        if s.endswith("=X"):
            td_map[_forex_to_td(sym)] = sym
            continue

        # Crypto  BTC-USD → BTC/USD
        if "-USD" in s or "-BTC" in s:
            td_map[_crypto_to_td(sym)] = sym
            continue

        # International stocks  TTE.PA → TTE:XPAR
        base, exchange = _yf_to_td(sym)
        if base and exchange:
            td_map[f"{base}:{exchange}"] = sym
            continue

        # US stocks / ETFs → Polygon
        us_syms.append(sym)

    # ── Parallel fetch: Twelve Data + Polygon ─────────────────────────────────
    async def _empty() -> dict:
        return {}

    td_task   = _td_quotes(list(td_map), td_map, TWELVEDATA_API_KEY) if td_map   else _empty()
    poly_task = _poly_stocks(us_syms, POLYGON_API_KEY)                if us_syms else _empty()

    td_res, poly_res = await asyncio.gather(td_task, poly_task, return_exceptions=True)
    if isinstance(td_res,   Exception): td_res   = {}
    if isinstance(poly_res, Exception): poly_res = {}

    result: dict[str, dict] = {**td_res, **poly_res}

    # ── yfinance for anything still missing ───────────────────────────────────
    missing = [s for s in symbols if s.upper() not in result]
    needed  = list(set(yf_only + missing))
    if needed:
        loop   = asyncio.get_event_loop()
        yf_res = await loop.run_in_executor(None, _yf_fast_info, needed)
        result.update(yf_res)

    _quote_cache_put(result)
    return {**cached, **result}


# ── OHLCV (used by analysis engine — yfinance historical bars) ────────────────

# In-process OHLCV cache. The scanner hits dozens of symbols in bursts and
# Yahoo rate-limits hard, so every avoided download matters.
#
# The lifetime depends on the interval. A single 90 s TTL for everything
# meant a daily series — which only gains one bar per session — was
# re-downloaded every scan, while the only thing that had changed was the
# last, still-forming candle. Intraday bars stay short-lived; daily and
# slower bars can be held for a long time without going stale.
_OHLCV_CACHE: dict = {}
# Sized above the largest scannable universe so a full scan does not
# evict its own entries; a frame is tens of KB, so this stays modest.
_OHLCV_CACHE_MAX = int(os.getenv("OHLCV_CACHE_MAX", "1000"))
_OHLCV_TTL_BY_INTERVAL = {
    "1m": 45.0, "2m": 60.0, "5m": 90.0, "15m": 120.0, "30m": 180.0,
    "60m": 300.0, "90m": 300.0, "1h": 300.0,
    "1d": 1800.0, "5d": 3600.0, "1wk": 7200.0, "1mo": 21600.0, "3mo": 21600.0,
}
_OHLCV_TTL_DEFAULT = 90.0


def _ohlcv_ttl(interval: str) -> float:
    return _OHLCV_TTL_BY_INTERVAL.get(interval, _OHLCV_TTL_DEFAULT)


def _cache_put(symbol: str, period: str, interval: str, df) -> None:
    """Store one frame, evicting the oldest when full."""
    import time as _time
    if len(_OHLCV_CACHE) >= _OHLCV_CACHE_MAX:
        oldest = min(_OHLCV_CACHE, key=lambda k: _OHLCV_CACHE[k][0])
        _OHLCV_CACHE.pop(oldest, None)
    _OHLCV_CACHE[(symbol.upper(), period, interval)] = (_time.monotonic(), df.copy())


def _download_ohlcv_sync(symbol: str, period: str, interval: str):
    """The one place that talks to Yahoo for bars. Module-level so tests and
    harnesses can swap the download while keeping the cache logic real."""
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
        print(f"[ohlcv] {symbol}: {e}")
        return pd.DataFrame()


async def _download_ohlcv(symbol: str, period: str, interval: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _download_ohlcv_sync, symbol, period, interval)


# Yahoo serves many tickers in ONE request. A scan of the full universe was
# issuing 819 separate downloads — the single heaviest thing the backend does.
# Batching them turns that into ~17 requests, and the per-symbol code path
# below is left untouched: the batch simply pre-warms the same cache it reads.
_OHLCV_BATCH_SIZE = int(os.getenv("OHLCV_BATCH_SIZE", "50"))


def _split_batch_frame(data, symbols: list[str]) -> dict:
    """Split a multi-ticker download into one clean OHLCV frame per symbol.

    yfinance returns different shapes depending on the request: MultiIndex
    columns (ticker, field) with group_by="ticker", the transposed pairing,
    or flat columns when a single ticker survives. All three are handled —
    a wrong guess here would silently return empty frames for everything.
    """
    import pandas as pd
    out: dict = {}
    if data is None or len(data) == 0:
        return out

    cols = ["Open", "High", "Low", "Close", "Volume"]
    if isinstance(data.columns, pd.MultiIndex):
        lvl0 = set(data.columns.get_level_values(0))
        ticker_on_level0 = bool(lvl0 & {s.upper() for s in symbols})
        for sym in symbols:
            u = sym.upper()
            try:
                df = data[u] if ticker_on_level0 else data.xs(u, axis=1, level=1)
            except (KeyError, IndexError):
                continue
            if df is None or df.empty:
                continue
            missing = [c for c in cols if c not in df.columns]
            if missing:
                continue
            df = df[cols].dropna(how="all")
            if not df.empty:
                df.index.name = None
                out[u] = df
    elif len(symbols) == 1 and all(c in data.columns for c in cols):
        df = data[cols].dropna(how="all")
        if not df.empty:
            df.index.name = None
            out[symbols[0].upper()] = df
    return out


def _download_ohlcv_batch_sync(symbols: list[str], period: str, interval: str) -> dict:
    import yfinance as yf
    try:
        data = yf.download(
            tickers=" ".join(symbols),
            period=period,
            interval=interval,
            auto_adjust=False,
            progress=False,
            group_by="ticker",
            threads=True,
        )
    except Exception as e:
        print(f"[ohlcv/batch] {len(symbols)} symbols: {e}")
        return {}
    return _split_batch_frame(data, symbols)


async def _download_ohlcv_batch(symbols: list[str], period: str, interval: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _download_ohlcv_batch_sync, symbols, period, interval)


async def prewarm_ohlcv(symbols: list[str], period: str = "1mo", interval: str = "1d") -> dict:
    """Fetch many symbols in batched requests and RETURN their frames.

    The caller gets the data directly rather than trusting it to still be in
    the cache: a scan of the full universe asks for more symbols than the
    cache holds, so it would evict its own earliest entries and every one of
    those symbols would then be re-downloaded individually — 836 requests
    instead of 17. Anything the batch does not return is simply absent, and
    the caller falls back to the per-symbol path for it.
    """
    import time as _time

    ttl = _ohlcv_ttl(interval)
    now = _time.monotonic()
    have: dict = {}
    todo: list[str] = []
    for sym in symbols:
        u = sym.upper()
        hit = _OHLCV_CACHE.get((u, period, interval))
        if hit is not None and now - hit[0] < ttl:
            have[u] = hit[1].copy()
        else:
            todo.append(u)

    if todo:
        chunks = [todo[i:i + _OHLCV_BATCH_SIZE] for i in range(0, len(todo), _OHLCV_BATCH_SIZE)]
        results = await asyncio.gather(
            *[_download_ohlcv_batch(c, period, interval) for c in chunks],
            return_exceptions=True,
        )
        for res in results:
            if isinstance(res, Exception) or not res:
                continue
            for sym, df in res.items():
                if df is None or df.empty:
                    continue
                have[sym] = df
                _cache_put(sym, period, interval, df)
    return have


async def fetch_ohlcv(symbol: str, period: str = "1mo", interval: str = "1d"):
    """
    Fetch OHLCV DataFrame for chart / analysis, through the cache.
    period:   1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|max
    interval: 1m|5m|15m|30m|1h|1d|1wk|1mo
    """
    import time as _time

    key = (symbol.upper(), period, interval)
    hit = _OHLCV_CACHE.get(key)
    if hit is not None and _time.monotonic() - hit[0] < _ohlcv_ttl(interval):
        return hit[1].copy()

    from . import _qualite
    df = await _download_ohlcv(symbol, period, interval)
    if df is not None and not df.empty:
        _qualite.noter("yahoo")
        _cache_put(symbol.upper(), period, interval, df)
        df.attrs["source"] = "yahoo"
        return df

    # Yahoo s'est tu : la source de secours, puis la dernière série valide,
    # même expirée, marquée comme telle (voir _qualite.py).
    df = await _qualite.twelvedata_ohlcv(symbol, period, interval)
    if df is not None and not df.empty:
        _qualite.noter("twelvedata", symbol, f"{period}/{interval}")
        _cache_put(symbol.upper(), period, interval, df)
        df.attrs["source"] = "twelvedata"
        return df
    if hit is not None:
        _qualite.noter("cache_expire", symbol, f"{period}/{interval}")
        old = hit[1].copy()
        old.attrs["source"] = "cache_expire"
        return old
    _qualite.noter("echec", symbol, f"{period}/{interval}")
    return df
