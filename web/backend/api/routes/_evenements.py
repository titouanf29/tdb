"""Ce qui tombe PENDANT le plan : publications de résultats, décisions des banques centrales.

Un plan à 20 séances qui enjambe une publication de résultats n'est pas le
même pari qu'un plan qui n'en enjambe pas : le cours peut ouvrir 8 % plus bas
le lendemain, par-dessus le stop. Le moteur ne le voyait pas.

MESURÉ AVANT D'AGIR (octobre 2026, 24 actions du panel de 40, dates de
publication lues sur Yahoo, plan de l'écran en journalier, frais compris) :

  932 achats du moteur (score ≥ 55), dont 40 % enjambent une publication.
                       n     R moyen   5e centile   stop sauté (R < −1,3)
  avec publication    369    +0,85      −1,24          4,1 %
  sans publication    563    +0,17      −1,25          3,7 %
  Le « stop sauté » n'a pas de sens stable : 6,0 % contre 2,4 % sur la
  première période, 0,0 % contre 6,8 % sur la dernière.

Ces achats n'ont PAS fait pire en moyenne — plutôt mieux, sans que l'écart
tienne d'une période à l'autre. Bloquer serait jeter des trades qui ont payé.
Ce qui change, c'est la dispersion : décision, AVERTIR, ne pas bloquer.

Les décisions de la Fed et de la BCE viennent du calendrier macro (dates
officielles), filtrées par la sensibilité de l'actif mesurée ou expliquée
(services/macro/impact.py) : une décision de la BCE n'est pas signalée sur
Apple si rien ne la relie au titre.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone

from ..services.macro import calendrier, impact
from ..services.macro.libelles import presenter

logger = logging.getLogger(__name__)

# Durée du plan en jours CALENDAIRES, selon l'horizon : l'échéance du rejeu
# (20 séances en journalier, 20 bougies de 3 jours, 40 semaines) ramenée au
# calendrier, 7 jours pour 5 séances. Plafonnée à 120 jours : au-delà, une
# publication tombe presque toujours, et la signaler n'apprend rien.
_JOURS_PLAN = {"1d": 28, "3d": 84, "1w": 120, "1mo": 120}

_RESULTATS_CACHE: dict[str, tuple[float, datetime | None]] = {}
_RESULTATS_TTL = 12 * 3600.0


def jours_du_plan(timeframe: str | None) -> int:
    return _JOURS_PLAN.get(timeframe or "1d", 3)


def _a_une_publication(symbol: str) -> bool:
    """Seules les actions publient des résultats."""
    u = symbol.upper()
    return not (u.startswith("^") or "=" in u or u.endswith("-USD") or u.endswith("-EUR")
                or u.endswith("-BTC") or u.endswith("-USDT"))


def _prochaine_publication_sync(symbol: str, info: dict | None) -> datetime | None:
    """La prochaine date de publication connue, ou None. Bloquant."""
    hit = _RESULTATS_CACHE.get(symbol)
    if hit and time.monotonic() - hit[0] < _RESULTATS_TTL:
        return hit[1]
    maintenant = datetime.now(timezone.utc)
    trouvee: datetime | None = None
    # 1. Ce que l'analyse a déjà lu (`.info`) : gratuit.
    for cle in ("earningsTimestamp", "earningsTimestampStart"):
        ts = (info or {}).get(cle)
        if isinstance(ts, (int, float)) and ts > 0:
            d = datetime.fromtimestamp(ts, tz=timezone.utc)
            if d >= maintenant - timedelta(hours=12):
                trouvee = d
                break
    # 2. Sinon, le calendrier des publications : `.info` garde parfois la
    #    publication PASSÉE pendant des semaines (LVMH, Nestlé).
    if trouvee is None:
        try:
            import yfinance as yf
            df = yf.Ticker(symbol).get_earnings_dates(limit=6)
            if df is not None and len(df):
                futures = [d.to_pydatetime().astimezone(timezone.utc) for d in df.index
                           if d.to_pydatetime().astimezone(timezone.utc) >= maintenant - timedelta(hours=12)]
                trouvee = min(futures) if futures else None
        except Exception as e:  # réseau, page changée : on ne sait pas, on ne dit rien
            logger.debug("publication %s illisible : %s", symbol, e)
    _RESULTATS_CACHE[symbol] = (time.monotonic(), trouvee)
    return trouvee


def _dans(d: datetime, maintenant: datetime) -> int:
    return max(0, (d.date() - maintenant.date()).days)


async def pendant_le_plan(symbol: str, timeframe: str | None, *, info: dict | None = None,
                          nom: str | None = None) -> dict:
    """Les événements qui tombent avant l'échéance du plan.

    {"jours": 28, "resultats": {...} | None, "macro": [...], "phrases": [...]}
    Ne lève jamais : une source muette donne une liste vide.
    """
    s = symbol.upper()
    jours = jours_du_plan(timeframe)
    maintenant = datetime.now(timezone.utc)
    fin = maintenant + timedelta(days=jours)
    out: dict = {"jours": jours, "resultats": None, "macro": [], "phrases": []}

    if _a_une_publication(s):
        try:
            loop = asyncio.get_running_loop()
            d = await asyncio.wait_for(loop.run_in_executor(None, _prochaine_publication_sync, s, info), 8)
        except Exception:
            d = None
        if d and d <= fin:
            v = presenter({"titre": "Earnings", "pays": "", "quand": d.isoformat()})
            out["resultats"] = {"quand": d.isoformat(), "date_longue": v["date_longue"],
                                "dans_jours": _dans(d, maintenant)}

    try:
        evs = await calendrier.evenements(maintenant - timedelta(hours=2), fin, importance_min="High")
    except Exception as e:
        logger.debug("calendrier macro indisponible : %s", e)
        evs = []
    vus: set[str] = set()
    for e in evs:
        b = e.get("banque")
        fam = e.get("famille") or ""
        # Les DÉCISIONS seulement : une statistique de la semaine (inflation,
        # emploi) ne se connaît que sept jours à l'avance, et n'apprendrait
        # rien sur un plan de quatre semaines.
        if b not in ("FED", "BCE") or fam != f"{b}_DECISION" or b in vus:
            continue
        try:
            base = await impact.pour_actif(b, s, nom=nom, cache_seul=True)
        except Exception:
            continue
        if not base.get("sens_si_restrictive"):
            continue
        q = datetime.fromisoformat(str(e["quand"]).replace("Z", "+00:00"))
        if q.tzinfo is None:
            q = q.replace(tzinfo=timezone.utc)
        v = presenter(e)
        vus.add(b)
        out["macro"].append({"banque": b, "titre": v["titre"], "quand": v["quand"], "date_longue": v["date_longue"],
                             "dans_jours": _dans(q, maintenant), "officiel": v["officiel"],
                             "sens_si_restrictive": base["sens_si_restrictive"]})

    out["phrases"] = phrases(out)
    return out


def _quand(dans: int, date_longue: str) -> str:
    if dans == 0:
        return "aujourd'hui"
    if dans == 1:
        return "demain"
    if dans <= 6:
        return f"dans {dans} jours ({date_longue.lower()})"
    return f"le {date_longue.lower()}"


def phrases(ev: dict) -> list[str]:
    """Les avertissements, en clair, pour la liste du verdict."""
    out = []
    r = ev.get("resultats")
    if r:
        out.append(f"Publication de résultats {_quand(r['dans_jours'], r['date_longue'])}, pendant le plan : "
                   "le cours peut sauter, y compris par-dessus le stop")
    for m in ev.get("macro") or []:
        qui = "la Fed" if m["banque"] == "FED" else "la BCE"
        out.append(f"Décision de {qui} {_quand(m['dans_jours'], m['date_longue'])}, pendant le plan")
    return out
