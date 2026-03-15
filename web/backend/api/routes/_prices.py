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
