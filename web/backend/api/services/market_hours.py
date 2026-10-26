"""
Market hours utility — compute whether each market is currently open or closed,
using each market's REAL timezone (not a hardcoded Paris-equivalent).

Used to ground the AI assistant with accurate, real-time market status so it
never wrongly claims markets are closed mid-week.
"""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

try:
    from config import MARKETS
except Exception:  # pragma: no cover - defensive
    MARKETS = {}

PARIS_TZ = ZoneInfo("Europe/Paris")

# Human-readable labels per market key (fallback to config "name")
_LABELS = {
    "EUROPE": "🇪🇺 Europe",
    "USA": "🇺🇸 USA",
    "ASIA": "🌏 Asie",
    "CRYPTO": "🪙 Crypto",
    "COMMODITIES": "🛢️ Matières premières",
    "FOREX": "💱 Forex",
}

_FR_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
_FR_MONTHS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]


def _parse_hm(value: str) -> int:
    """'09:30' -> minutes since midnight (570)."""
    h, m = value.split(":")
    return int(h) * 60 + int(m)


def is_market_open(market_key: str, now_utc: datetime | None = None) -> bool:
    """Return True if the given market is open right now, using its real timezone."""
    market = MARKETS.get(market_key)
    if not market:
        return False

    # Crypto / explicitly always-open markets
    if market.get("always_open"):
        return True

    tz_name = market.get("timezone", "Europe/Paris")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = PARIS_TZ

    now = (now_utc or datetime.now(ZoneInfo("UTC"))).astimezone(tz)
    weekday = now.weekday()  # Mon=0 .. Sun=6

    # Equity / commodity markets are closed on weekends
    if weekday >= 5:  # Saturday or Sunday
        return False

    open_min = _parse_hm(market.get("open_time", "09:00"))
    close_min = _parse_hm(market.get("close_time", "17:30"))
    cur_min = now.hour * 60 + now.minute

    if close_min <= open_min:
        # Overnight session (wraps past midnight)
        return cur_min >= open_min or cur_min < close_min
    return open_min <= cur_min < close_min


def get_markets_status(now_utc: datetime | None = None) -> list[dict]:
    """Return open/closed status for every configured market."""
    now = now_utc or datetime.now(ZoneInfo("UTC"))
    out = []
    for key, market in MARKETS.items():
        is_open = is_market_open(key, now)
        tz_name = market.get("timezone", "Europe/Paris")
        out.append({
            "key": key,
            "label": _LABELS.get(key, market.get("name", key)),
            "is_open": is_open,
            "open_time": market.get("open_time"),
            "close_time": market.get("close_time"),
            "timezone": tz_name,
            "always_open": bool(market.get("always_open")),
        })
    return out


def build_market_context(now_utc: datetime | None = None) -> str:
    """Build a French, human-readable market-status block to ground the AI assistant."""
    now = now_utc or datetime.now(ZoneInfo("UTC"))
    paris = now.astimezone(PARIS_TZ)
    day = _FR_DAYS[paris.weekday()]
    month = _FR_MONTHS[paris.month - 1]
    date_str = f"{day} {paris.day} {month} {paris.year}, {paris.strftime('%H:%M')} (heure de Paris)"

    lines = [f"Date et heure actuelles : {date_str}.", "État des marchés en ce moment :"]
    for m in get_markets_status(now):
        if m["always_open"]:
            state = "OUVERT (24h/24, 7j/7)"
        elif m["is_open"]:
            state = f"OUVERT (clôture à {m['close_time']} {m['timezone']})"
        else:
            state = f"FERMÉ (horaires {m['open_time']}–{m['close_time']} {m['timezone']}, fermé le week-end)"
        lines.append(f"- {m['label']} : {state}")

    lines.append(
        "Utilise impérativement ces informations pour toute question sur "
        "l'ouverture/fermeture des marchés ou la date. Ne devine jamais la date."
    )
    return "\n".join(lines)
