"""La qualité des bougies, et une source de secours quand Yahoo se tait.

TOUT LE MOTEUR REPOSE SUR UNE SEULE SOURCE. Yahoo n'a pas d'accord de
service : il change ses pages, limite le débit, renvoie parfois un tableau
vide — et l'analyse tombait alors en « données insuffisantes ». Deux
secours, dans cet ordre :

  1. Twelve Data (série temporelle), si une clé est configurée — sauf pour
     les contrats à terme, que Twelve Data ne sert qu'au comptant : un autre
     prix que celui du moteur (voir _prices.py, « un seul prix, partout ») ;
  2. la dernière série valide gardée en mémoire, même expirée, DITE comme
     telle : mieux vaut une analyse d'il y a une heure qu'aucune, à
     condition de ne pas la faire passer pour fraîche.

ET UN CONTRÔLE. Une bougie au plus haut sous son plus bas, un cours à zéro,
un saut de 40 % qui s'annule à la bougie suivante : ce sont des erreurs de
cotation, et un indicateur ne les distingue pas d'un krach. Le contrôle les
compte ; au-delà d'un seuil, l'analyse le dit et le moteur ne propose pas.

Chaque source utilisée et chaque échec sont comptés : l'administration voit
d'un coup d'œil si Yahoo fléchit.
"""
from __future__ import annotations

import time
from collections import Counter, deque

import httpx
import numpy as np
import pandas as pd

# ── Suivi des sources ────────────────────────────────────────────────────────
COMPTEURS: Counter = Counter()
INCIDENTS: deque = deque(maxlen=50)
DEMARRAGE = time.time()


def noter(source: str, symbol: str | None = None, detail: str | None = None) -> None:
    COMPTEURS[source] += 1
    if source != "yahoo" and symbol:
        INCIDENTS.appendleft({"quand": time.time(), "source": source, "symbole": symbol, "detail": detail})


def etat_des_sources() -> dict:
    total = sum(COMPTEURS[k] for k in ("yahoo", "twelvedata", "cache_expire", "echec"))
    return {
        "depuis": DEMARRAGE,
        "compteurs": dict(COMPTEURS),
        "part_yahoo": round(COMPTEURS["yahoo"] / total, 3) if total else None,
        "incidents": list(INCIDENTS),
    }


# ── Secours : Twelve Data ────────────────────────────────────────────────────
_INTERVALLE_TD = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "60m": "1h",
                  "1d": "1day", "1wk": "1week", "1mo": "1month"}
_BOUGIES_PAR_JOUR = {"1m": 390, "5m": 78, "15m": 26, "30m": 13, "1h": 7, "60m": 7}
_JOURS_PERIODE = {"1d": 1, "5d": 5, "1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "2y": 504,
                  "5y": 1260, "10y": 2520, "max": 5000}


def symbole_td(symbol: str) -> str | None:
    from ._prices import INDEX_TO_TD, _crypto_to_td, _forex_to_td, _yf_to_td
    s = symbol.upper()
    if s.endswith("=F"):
        return None
    if s.startswith("^"):
        return INDEX_TO_TD.get(s)
    if s.endswith("=X"):
        return _forex_to_td(s)
    if "-USD" in s or "-EUR" in s or "-BTC" in s:
        return _crypto_to_td(s)
    base, place = _yf_to_td(s)
    if base and place:
        return f"{base}:{place}"
    if "." in s:
        return None
    return s


def _taille(period: str, interval: str) -> int:
    jours = _JOURS_PERIODE.get(period, 252)
    if interval in _BOUGIES_PAR_JOUR:
        n = jours * _BOUGIES_PAR_JOUR[interval]
    elif interval == "1wk":
        n = jours // 5
    elif interval == "1mo":
        n = jours // 21
    else:
        n = jours
    return int(max(30, min(5000, n)))


async def twelvedata_ohlcv(symbol: str, period: str, interval: str) -> pd.DataFrame:
    from config import TWELVEDATA_API_KEY
    td, iv = symbole_td(symbol), _INTERVALLE_TD.get(interval)
    if not TWELVEDATA_API_KEY or not td or not iv:
        return pd.DataFrame()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get("https://api.twelvedata.com/time_series", params={
                "symbol": td, "interval": iv, "outputsize": _taille(period, interval),
                "apikey": TWELVEDATA_API_KEY, "order": "ASC"})
        d = r.json() if r.status_code == 200 else {}
        valeurs = d.get("values") or []
        if not valeurs:
            return pd.DataFrame()
        df = pd.DataFrame(valeurs)
        df.index = pd.to_datetime(df.pop("datetime"))
        df = df.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"})
        if "Volume" not in df:
            df["Volume"] = 0
        df = df[["Open", "High", "Low", "Close", "Volume"]].astype(float).sort_index()
        df.index.name = None
        return df
    except Exception as e:
        print(f"[ohlcv/td] {symbol}: {e}")
        return pd.DataFrame()


# ── Contrôle ─────────────────────────────────────────────────────────────────
def controle(df: pd.DataFrame | None, symbol: str = "") -> dict | None:
    """Les bougies douteuses des 250 dernières, comptées par nature.

    {"bougies": n, "incoherentes": k, "nulles": k, "pics": k, "part": 0.01,
     "niveau": "ok" | "douteuse" | "mauvaise"}
    """
    if df is None or len(df) < 10:
        return None
    # La dernière bougie est souvent EN COURS (plus haut pas encore à jour) :
    # elle n'est pas jugée. Les lignes vides (semaine en cours, jour férié)
    # non plus — ce sont des trous, pas des erreurs.
    d = df.dropna(subset=["Close"]).iloc[:-1].tail(250)
    if len(d) < 10:
        return None
    o, h, l, c = (d[k].astype(float) for k in ("Open", "High", "Low", "Close"))
    # Une tolérance de 0,5 % : Yahoo arrondit et décale parfois l'ouverture
    # ou la clôture d'un cheveu hors de la fourchette (devises, crypto). Ce
    # n'est pas ce qu'on cherche.
    tol = 0.005 * c.abs()
    incoherentes = int(((h + tol < l) | (c > h + tol) | (c < l - tol) | (o > h + tol) | (o < l - tol)).sum())
    nulles = int((c <= 0).sum())
    # Un PIC : un saut énorme qui s'annule à la bougie suivante. Un vrai
    # krach ne revient pas d'où il vient le lendemain ; une erreur de
    # cotation, si. Seuil : 8 fois l'écart-type robuste des rendements, et
    # au moins 15 %.
    r = np.log(c.where(c > 0)).diff()
    mad = float((r - r.median()).abs().median() or 0) * 1.4826
    seuil = max(0.15, 8 * mad) if mad > 0 else 0.15
    pics = int(((r.abs() > seuil) & (r.shift(-1).abs() > seuil) & (np.sign(r) != np.sign(r.shift(-1)))).sum())
    n = len(d)
    mauvaises = incoherentes + nulles + pics
    part = mauvaises / n
    niveau = "mauvaise" if part >= 0.05 or nulles >= 3 else "douteuse" if mauvaises > 0 else "ok"
    return {"bougies": n, "incoherentes": incoherentes, "nulles": nulles, "pics": pics,
            "part": round(part, 3), "niveau": niveau}


def phrase(q: dict | None, source: str | None) -> tuple[str | None, str | None]:
    """(blocage, avertissement)."""
    bloc = av = None
    if q and q["niveau"] == "mauvaise":
        bloc = (f"Données douteuses : {q['incoherentes'] + q['nulles'] + q['pics']} bougies incohérentes sur les "
                f"{q['bougies']} dernières — les indicateurs calculés dessus ne sont pas fiables")
    elif q and q["niveau"] == "douteuse":
        av = (f"{q['incoherentes'] + q['nulles'] + q['pics']} bougie(s) incohérente(s) dans l'historique "
              "(erreur de cotation probable) — à lire avec prudence")
    if source == "cache_expire":
        av = ((av + ". ") if av else "") + ("Source de cours momentanément muette : analyse faite sur la "
                                            "dernière série reçue, peut-être en retard")
    elif source == "twelvedata":
        av = ((av + ". ") if av else "") + "Cours lus sur la source de secours (Twelve Data)"
    return bloc, av
