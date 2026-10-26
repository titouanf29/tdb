"""
Ce que les décisions de la Fed et de la BCE ont RÉELLEMENT fait à un actif.

LA QUESTION. Le mécanisme (familles.py) dit « une Fed plus dure fait baisser
les valeurs de croissance ». Est-ce vrai pour CET actif, et de combien ? On le
mesure sur toutes les décisions depuis 2021 (Fed) et 2022 (BCE).

COMMENT ON LIT LA SURPRISE. On ne connaît pas, pour chaque décision passée, ce
que le marché attendait. Mais le marché le dit lui-même : le jour d'une
décision de la Fed, le taux américain à 5 ans monte si la décision est lue
comme plus dure qu'attendu, et baisse dans le cas contraire. Pour la BCE, c'est
l'euro contre le dollar. C'est ce « thermomètre » qu'on confronte à l'actif.

CE QUI EST CALCULÉ, pour chaque actif :

  · l'amplification : son mouvement moyen les jours de décision, rapporté à
    celui des autres jours — l'annonce le fait-elle bouger plus que d'habitude ?
  · la sensibilité : de combien il bouge quand le thermomètre bouge (pente
    d'une régression), avec sa statistique t ;
  · les moyennes des jours « durs » et des jours « doux », et leur nombre ;
  · la régularité : la part des jours durs où l'actif est allé dans le sens de
    sa sensibilité.

LE DÉCALAGE HORAIRE COMPTE. La Fed annonce à 14 h à New York, 20 h à Paris :
les Bourses européennes sont fermées, elles réagissent le LENDEMAIN. La BCE
annonce à 14 h 15 à Francfort : tout le monde est ouvert sauf l'Asie.

LE SEUIL DE CONFIANCE est celui du reste du site : une sensibilité n'est dite
« fiable » que si |t| ≥ 2 sur au moins vingt décisions. En dessous, on
l'affiche comme indicative, ou on dit qu'elle n'est pas mesurable — ce qui est
une information, pas un échec.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import date, datetime, timedelta, timezone

import numpy as np

from ...database import USE_POSTGRES, execute_query, execute_write
from . import calendrier
from .familles import mecanisme

logger = logging.getLogger(__name__)

THERMOMETRE = {
    "FED": {"symbole": "^FVX", "unite": "pb", "echelle": 100.0, "pas": 10.0, "seuil": 3.0,
            "nom": "le taux américain à 5 ans", "mot_pas": "+10 points de base",
            "quand": "le taux américain à 5 ans prend 10 points de base"},
    "BCE": {"symbole": "EURUSD=X", "unite": "%", "echelle": 1.0, "pas": 0.5, "seuil": 0.2,
            "nom": "l'euro face au dollar", "mot_pas": "+0,5 % de l'euro",
            "quand": "l'euro prend 0,5 % face au dollar"},
}
TTL_JOURS = 7
_pret = False


async def _init() -> None:
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS macro_sensibilite (
            id {cle},
            symbole TEXT NOT NULL,
            banque TEXT NOT NULL,
            calcule_le TEXT NOT NULL,
            contenu TEXT NOT NULL
        )
    """)
    _pret = True


def _europe_ou_asie(symbole: str) -> str | None:
    s = symbole.upper()
    if s in ("^FCHI", "^GDAXI", "^STOXX50E", "^SBF120", "^AEX", "^IBEX", "^FTSE", "^FTSEMIB") or \
            s.endswith((".PA", ".DE", ".AS", ".MI", ".MC", ".BR", ".LS", ".L", ".SW", ".CO", ".ST", ".OL", ".HE")):
        return "europe"
    if s in ("^N225", "^HSI", "^KOSPI", "^AXJO") or s.endswith((".T", ".HK", ".KS", ".AX", ".SS", ".SZ")):
        return "asie"
    return None


def _decalage(banque: str, symbole: str) -> int:
    """0 : l'actif réagit le jour même ; 1 : le jour de Bourse suivant."""
    zone = _europe_ou_asie(symbole)
    if banque == "FED":
        return 1 if zone in ("europe", "asie") else 0
    return 1 if zone == "asie" else 0


def calculer(serie_actif, serie_thermo, dates: list[date], banque: str, symbole: str) -> dict:
    """Le calcul pur, sur deux séries de clôtures indexées par date."""
    th = THERMOMETRE[banque]
    ret = serie_actif.pct_change() * 100
    if th["unite"] == "pb":
        d_th = serie_thermo.diff() * th["echelle"]
    else:
        d_th = serie_thermo.pct_change() * 100
    jours_actif = [ts.date() for ts in ret.index]
    jours_th = {ts.date(): v for ts, v in d_th.items()}
    ret_par_jour = dict(zip(jours_actif, ret.values))
    decal = _decalage(banque, symbole)

    xs, ys, jours_ev = [], [], set()
    for d in dates:
        s = jours_th.get(d)
        if s is None or not np.isfinite(s):
            continue
        suivants = [j for j in jours_actif if (j > d if decal else j >= d)]
        if not suivants:
            continue
        j = suivants[0]
        if (j - d).days > 4:
            continue
        r = ret_par_jour.get(j)
        if r is None or not np.isfinite(r):
            continue
        xs.append(float(s))
        ys.append(float(r))
        jours_ev.add(j)

    n = len(xs)
    if n < 12:
        return {"n": n, "fiabilite": "non_mesurable", "raison": "trop peu de décisions avec des cours"}
    x, y = np.array(xs), np.array(ys)
    autres = np.array([v for j, v in ret_par_jour.items() if j not in jours_ev and np.isfinite(v)])
    ampli = float(np.mean(np.abs(y)) / np.mean(np.abs(autres))) if len(autres) and np.mean(np.abs(autres)) else None

    xc = x - x.mean()
    sxx = float((xc ** 2).sum())
    if sxx <= 0:
        return {"n": n, "fiabilite": "non_mesurable", "raison": "le thermomètre n'a pas bougé"}
    pente = float((xc * (y - y.mean())).sum() / sxx)
    res = y - y.mean() - pente * xc
    se = math.sqrt(float((res ** 2).sum()) / (n - 2) / sxx) if n > 2 else float("inf")
    t = pente / se if se > 0 else 0.0

    durs = y[x > th["seuil"]]
    doux = y[x < -th["seuil"]]
    sens = 1 if pente > 0 else -1
    regulier = float(np.mean(np.sign(durs) == sens)) if len(durs) else None

    # UN LIEN SANS EXPLICATION EXIGE UNE PREUVE PLUS FORTE. On teste des
    # dizaines d'actifs contre deux banques centrales : au seuil de t = 2,
    # environ un test sur vingt passe par pur hasard. Quand le mécanisme
    # prévoit le sens observé, t ≥ 2 suffit — la mesure confirme une raison.
    # Quand aucun mécanisme ne relie l'actif à la banque, ou qu'il prévoit
    # l'inverse, il faut t ≥ 3 sur au moins trente décisions ; en dessous, on
    # ne dit rien plutôt que d'afficher une coïncidence comme un constat.
    theorie = mecanisme(banque, symbole)
    explique = bool(theorie and theorie["sens"] and (theorie["sens"] > 0) == (pente > 0))
    if explique:
        fiab = "fiable" if abs(t) >= 2 and n >= 20 else "indicatif" if abs(t) >= 1.5 else "non_mesurable"
    else:
        fiab = "fiable" if abs(t) >= 3 and n >= 30 else "non_mesurable"
    accord = None
    if theorie and theorie["sens"] != 0 and fiab != "non_mesurable":
        accord = (theorie["sens"] > 0) == (pente > 0)

    return {
        "n": n,
        "premiere": min(dates).isoformat() if dates else None,
        "amplification": round(ampli, 2) if ampli else None,
        "pente_par_pas": round(pente * th["pas"], 3),
        "t": round(t, 2),
        "moyenne_durs": round(float(durs.mean()), 2) if len(durs) else None,
        "n_durs": int(len(durs)),
        "moyenne_doux": round(float(doux.mean()), 2) if len(doux) else None,
        "n_doux": int(len(doux)),
        "regularite": round(regulier * 100) if regulier is not None else None,
        "fiabilite": fiab,
        "sens_mesure": 0 if fiab == "non_mesurable" else (1 if pente > 0 else -1),
        "accord_mecanisme": accord,
        "decalage_jours": _decalage(banque, symbole),
        "thermometre": th["nom"],
        "pas": th["mot_pas"],
        "quand": th["quand"],
    }


async def sensibilite(symbole: str, banque: str, *, forcer: bool = False, cache_seul: bool = False) -> dict:
    """La sensibilité mesurée de cet actif aux décisions de cette banque, en cache une semaine."""
    symbole = (symbole or "").upper()
    if banque not in THERMOMETRE:
        return {"fiabilite": "non_mesurable", "raison": "pas d'historique pour cette banque centrale"}
    if symbole == THERMOMETRE[banque]["symbole"]:
        # Le mesurer contre lui-même donnerait une corrélation parfaite et vide.
        return {"fiabilite": "thermometre", "banque": banque, "symbole": symbole,
                "raison": f"C'est lui qui sert à lire la décision : son mouvement dit si elle a surpris."}
    await _init()
    if not forcer:
        rows = await execute_query(
            "SELECT contenu, calcule_le FROM macro_sensibilite WHERE symbole = ? AND banque = ? ORDER BY id DESC LIMIT 1",
            (symbole, banque))
        if rows:
            try:
                age = datetime.now(timezone.utc) - datetime.fromisoformat(rows[0]["calcule_le"])
                if age < timedelta(days=TTL_JOURS):
                    return json.loads(rows[0]["contenu"])
            except (ValueError, TypeError):
                pass

    if cache_seul:
        # Pour les listes : on ne télécharge pas dix ans de cours pendant qu'un
        # écran attend. La mesure sera prête à la prochaine lecture.
        return {"fiabilite": "en_calcul", "raison": "mesure pas encore calculée"}

    from ...routes._prices import fetch_ohlcv
    dates = await (calendrier.dates_fed() if banque == "FED" else calendrier.dates_bce())
    try:
        actif = await fetch_ohlcv(symbole, "10y", "1d")
        thermo = await fetch_ohlcv(THERMOMETRE[banque]["symbole"], "10y", "1d")
    except Exception as exc:
        logger.warning("macro : cours indisponibles pour %s (%s)", symbole, exc)
        actif = thermo = None
    if actif is None or thermo is None or getattr(actif, "empty", True) or getattr(thermo, "empty", True):
        return {"n": 0, "fiabilite": "non_mesurable", "raison": "cours historiques indisponibles"}

    try:
        res = calculer(actif["Close"].dropna(), thermo["Close"].dropna(), dates, banque, symbole)
    except Exception as exc:
        logger.warning("macro : mesure impossible pour %s (%s)", symbole, exc)
        return {"n": 0, "fiabilite": "non_mesurable", "raison": "calcul impossible"}
    res["banque"] = banque
    res["symbole"] = symbole
    await execute_write("DELETE FROM macro_sensibilite WHERE symbole = ? AND banque = ?", (symbole, banque))
    await execute_write(
        "INSERT INTO macro_sensibilite (symbole, banque, calcule_le, contenu) VALUES (?, ?, ?, ?)",
        (symbole, banque, datetime.now(timezone.utc).isoformat(), json.dumps(res)))
    return res
