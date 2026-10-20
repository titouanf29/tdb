"""Les stratégies des utilisateurs : règles, vérification, backtest, signal du jour.

Une stratégie, c'est ce qu'un débutant sait dire avec des mots simples :
« j'achète quand le prix est au-dessus de sa moyenne 200 et que le RSI
repasse au-dessus de 30 ; je sors à mon stop ou à mon objectif, au plus
tard après 20 séances ; je risque 1 % par trade ». Ce module en fait des
règles exactes, les vérifie comme Nimbo le ferait (et dit ce qui n'a pas de
sens), les rejoue sur des années de cours, et dit si elles se déclenchent
aujourd'hui sur un actif.

Les règles de rejeu sont celles du moteur (_backtest.py) : entrée à la
clôture de la bougie du signal, sans rien connaître de la suite ; stop
supposé touché en premier quand une bougie touche les deux ; écart
d'ouverture exécuté au cours d'ouverture ; 10 points de base de frais par
côté ; une seule position à la fois par actif.

Fonctions pures : aucune requête réseau ni base ici, pour qu'on puisse les
vérifier sur des cours inventés.
"""

from __future__ import annotations

import math
import re
from typing import Any, Optional

import numpy as np
import pandas as pd

from ._indicators import atr_wilder, rsi_wilder
from ._backtest import _walk_barriers

FRAIS_BPS = 10.0
UNITES = {"1d": "séance", "1wk": "semaine"}
ACTIFS_MAX = 5
SYMBOLE = re.compile(r"\^?[A-Z0-9][A-Z0-9.\-=]{0,19}")
SCORE_PAS = {"1d": 5, "1wk": 2}
CONDITIONS_MAX = 5

# ── Le catalogue des conditions ────────────────────────────────────────────
#
# Chaque condition a des réglages bornés : une valeur hors bornes ne doit pas
# produire un backtest faux, elle doit produire une explication.

TYPES = {
    "tendance_ma":  "Prix par rapport à une moyenne",
    "croisement_ma": "Moyenne rapide par rapport à la lente",
    "rsi":          "RSI",
    "cassure":      "Cassure d'un plus haut ou d'un plus bas",
    "macd":         "MACD",
    "volume":       "Volume",
    "score_nimbo":  "Score de Nimbo",
}


def _f(v, mini, maxi, defaut):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return defaut
    if not math.isfinite(x):
        return defaut
    return min(max(x, mini), maxi)


def normaliser(brut: dict) -> dict:
    """La stratégie nettoyée : types connus, réglages bornés, valeurs par défaut."""
    s = dict(brut or {})
    conds = []
    for c in (s.get("conditions") or [])[:CONDITIONS_MAX + 3]:
        t = (c or {}).get("type")
        if t not in TYPES:
            continue
        if t == "tendance_ma":
            conds.append({"type": t, "periode": int(_f(c.get("periode"), 10, 250, 200)),
                          "position": "dessous" if c.get("position") == "dessous" else "dessus"})
        elif t == "croisement_ma":
            r, l = int(_f(c.get("rapide"), 5, 100, 20)), int(_f(c.get("lente"), 10, 250, 50))
            conds.append({"type": t, "rapide": r, "lente": l,
                          "sens": "baissier" if c.get("sens") == "baissier" else "haussier"})
        elif t == "rsi":
            mode = c.get("mode") if c.get("mode") in ("sous", "dessus", "repasse_dessus", "repasse_dessous") else "sous"
            conds.append({"type": t, "seuil": round(_f(c.get("seuil"), 1, 99, 30)), "mode": mode})
        elif t == "cassure":
            conds.append({"type": t, "periode": int(_f(c.get("periode"), 5, 120, 20)),
                          "sens": "bas" if c.get("sens") == "bas" else "haut"})
        elif t == "macd":
            mode = c.get("mode") if c.get("mode") in ("croise_dessus", "croise_dessous", "dessus", "dessous") else "croise_dessus"
            conds.append({"type": t, "mode": mode})
        elif t == "volume":
            conds.append({"type": t, "multiple": round(_f(c.get("multiple"), 1.0, 5.0, 1.5), 2)})
        elif t == "score_nimbo":
            conds.append({"type": t, "min": round(_f(c.get("min"), 40, 90, 60))})
    actifs = []
    for a in (s.get("actifs") or []):
        a = str(a or "").strip().upper()
        # Un symbole de cotation, rien d'autre : il part ensuite dans une
        # requête vers le fournisseur de cours.
        if a and a not in actifs and SYMBOLE.fullmatch(a):
            actifs.append(a)
    return {
        "nom": str(s.get("nom") or "Ma stratégie").strip()[:60] or "Ma stratégie",
        "sens": "vente" if s.get("sens") == "vente" else "achat",
        "unite": s.get("unite") if s.get("unite") in UNITES else "1d",
        "conditions": conds,
        "stop_atr": round(_f(s.get("stop_atr"), 0.3, 8.0, 2.0), 2),
        "objectif_r": round(_f(s.get("objectif_r"), 0.3, 10.0, 2.0), 2),
        "duree_max": int(_f(s.get("duree_max"), 2, 200, 20)),
        "risque_pct": round(_f(s.get("risque_pct"), 0.1, 20.0, 1.0), 2),
        "actifs": actifs[:ACTIFS_MAX],
    }


def decrire_condition(c: dict) -> str:
    """La condition en français, telle que Nimbo la relit à l'utilisateur."""
    t = c["type"]
    if t == "tendance_ma":
        return f"le prix est {'au-dessus' if c['position'] == 'dessus' else 'en dessous'} de sa moyenne {c['periode']}"
    if t == "croisement_ma":
        return (f"la moyenne {c['rapide']} est {'au-dessus' if c['sens'] == 'haussier' else 'en dessous'} "
                f"de la moyenne {c['lente']}")
    if t == "rsi":
        return {"sous": f"le RSI est sous {c['seuil']}", "dessus": f"le RSI est au-dessus de {c['seuil']}",
                "repasse_dessus": f"le RSI repasse au-dessus de {c['seuil']}",
                "repasse_dessous": f"le RSI repasse sous {c['seuil']}"}[c["mode"]]
    if t == "cassure":
        return (f"le prix clôture au-dessus du plus haut des {c['periode']} dernières bougies" if c["sens"] == "haut"
                else f"le prix clôture sous le plus bas des {c['periode']} dernières bougies")
    if t == "macd":
        return {"croise_dessus": "le MACD croise sa ligne de signal vers le haut",
                "croise_dessous": "le MACD croise sa ligne de signal vers le bas",
                "dessus": "le MACD est au-dessus de sa ligne de signal",
                "dessous": "le MACD est sous sa ligne de signal"}[c["mode"]]
    if t == "volume":
        return f"le volume dépasse {str(c['multiple']).replace('.', ',')} fois sa moyenne"
    if t == "score_nimbo":
        return f"le score de Nimbo atteint au moins {c['min']}"
    return t


# ── La vérification ────────────────────────────────────────────────────────

def _avis(niveau: str, cle: str, texte: str) -> dict:
    return {"niveau": niveau, "cle": cle, "texte": texte}


def verifier(s: dict) -> list[dict]:
    """Ce que Nimbo relève dans la stratégie, avant tout test.

    « erreur » empêche le test (la stratégie ne peut pas fonctionner),
    « attention » le permet mais dit le risque, « conseil » éclaire.
    Chaque phrase dit le problème et sa conséquence, sans jargon."""
    avis: list[dict] = []
    conds = s["conditions"]
    unite = UNITES[s["unite"]]

    if not conds:
        avis.append(_avis("erreur", "aucune_condition",
                          "Il n'y a aucune condition d'entrée : la stratégie achèterait n'importe quand. "
                          "Choisissez au moins une raison d'entrer."))
    if len(conds) > CONDITIONS_MAX:
        avis.append(_avis("erreur", "trop_conditions",
                          f"Plus de {CONDITIONS_MAX} conditions à réunir en même temps : elles ne se "
                          "rencontreront presque jamais. Gardez les plus importantes."))
    elif len(conds) >= 4:
        avis.append(_avis("attention", "beaucoup_conditions",
                          "Quatre conditions ou plus à réunir le même jour, c'est rare : attendez-vous à peu "
                          "de trades, donc à un test difficile à interpréter."))
    if not s["actifs"]:
        avis.append(_avis("erreur", "aucun_actif", "Choisissez au moins un actif sur lequel tester la stratégie."))

    par_type: dict[str, list[dict]] = {}
    for c in conds:
        par_type.setdefault(c["type"], []).append(c)

    # Des conditions qui s'excluent : elles ne peuvent pas être vraies ensemble.
    tma = par_type.get("tendance_ma", [])
    for i, c1 in enumerate(tma):
        for c2 in tma[i + 1:]:
            if c1["periode"] == c2["periode"] and c1["position"] != c2["position"]:
                avis.append(_avis("erreur", "ma_contradictoire",
                                  f"Le prix ne peut pas être à la fois au-dessus et en dessous de sa moyenne "
                                  f"{c1['periode']} : ces deux conditions ne seront jamais réunies."))
    rsis = par_type.get("rsi", [])
    hauts = [c["seuil"] for c in rsis if c["mode"] in ("dessus", "repasse_dessus")]
    bas = [c["seuil"] for c in rsis if c["mode"] in ("sous", "repasse_dessous")]
    if hauts and bas and max(hauts) >= min(bas):
        avis.append(_avis("erreur", "rsi_contradictoire",
                          f"Le RSI ne peut pas être à la fois au-dessus de {max(hauts)} et sous {min(bas)} : "
                          "ces conditions s'excluent."))
    cass = par_type.get("cassure", [])
    if any(c["sens"] == "haut" for c in cass) and any(c["sens"] == "bas" for c in cass):
        avis.append(_avis("erreur", "cassure_contradictoire",
                          "Une cassure par le haut et une cassure par le bas le même jour, c'est impossible."))
    macds = par_type.get("macd", [])
    if (any(c["mode"] in ("croise_dessus", "dessus") for c in macds)
            and any(c["mode"] in ("croise_dessous", "dessous") for c in macds)):
        avis.append(_avis("erreur", "macd_contradictoire",
                          "Le MACD ne peut pas être au-dessus et en dessous de sa ligne de signal en même temps."))
    for c in par_type.get("croisement_ma", []):
        if c["rapide"] >= c["lente"]:
            avis.append(_avis("erreur", "croisement_inverse",
                              f"La moyenne « rapide » ({c['rapide']}) doit être plus courte que la « lente » "
                              f"({c['lente']}), sinon le croisement ne veut rien dire."))

    # Des conditions qui se contredisent sans s'exclure : presque jamais ensemble.
    survendu = any(c["mode"] == "sous" and c["seuil"] <= 40 for c in rsis)
    if survendu and any(c["sens"] == "haut" for c in cass):
        avis.append(_avis("attention", "rebond_et_cassure",
                          "Un RSI bas veut dire que le prix vient de baisser ; une cassure du plus haut veut dire "
                          "qu'il est au sommet. Les deux arrivent presque jamais le même jour : choisissez votre "
                          "idée, rebond ou cassure."))
    for c in rsis:
        if c["mode"] == "sous" and c["seuil"] < 15 or c["mode"] == "dessus" and c["seuil"] > 85:
            avis.append(_avis("attention", "rsi_extreme",
                              f"Un RSI {'sous' if c['mode'] == 'sous' else 'au-dessus de'} {c['seuil']} est "
                              "exceptionnel : quelques fois par an au mieux. Les repères habituels sont 30 et 70."))

    # Le plan de sortie.
    R = s["objectif_r"]
    seuil_gain = 1 / (1 + R) * 100
    if R < 1:
        avis.append(_avis("attention", "objectif_court",
                          f"Votre objectif ({str(R).replace('.', ',')} fois le risque) est plus proche que votre "
                          f"stop : pour gagner de l'argent, il faudra avoir raison plus de {seuil_gain:.0f} fois "
                          "sur 100, frais en plus. Peu de stratégies y arrivent."))
    elif R > 5:
        avis.append(_avis("attention", "objectif_lointain",
                          f"Un objectif à {str(R).replace('.', ',')} fois le risque sera rarement atteint : la "
                          "plupart des trades finiront au stop ou à la durée maximale."))
    if s["stop_atr"] < 1:
        avis.append(_avis("attention", "stop_serre",
                          f"Votre stop est à moins d'une « volatilité » (ATR) du prix : les variations normales "
                          f"d'une {unite} suffisent à le toucher, même si votre idée était juste."))
    elif s["stop_atr"] > 5:
        avis.append(_avis("attention", "stop_large",
                          "Un stop aussi large oblige à prendre de toutes petites positions pour respecter votre "
                          "risque, et laisse les pertes durer longtemps."))
    distance = s["stop_atr"] * R  # en ATR, jusqu'à l'objectif
    besoin = distance ** 2         # ordre de grandeur, en bougies, pour parcourir cette distance
    if s["duree_max"] < besoin * 0.5:
        avis.append(_avis("attention", "duree_courte",
                          f"Votre objectif est à environ {str(round(distance, 1)).replace('.', ',')} volatilités du prix ; en "
                          f"{s['duree_max']} {unite}s, le prix a rarement le temps d'y aller. Beaucoup de trades "
                          "sortiront à la durée maximale, ni gagnés ni perdus."))

    # Le risque.
    rp = s["risque_pct"]
    if rp > 5:
        avis.append(_avis("attention", "risque_ruineux",
                          f"Risquer {str(rp).replace('.', ',')} % du capital par trade : dix pertes d'affilée, ce "
                          f"qui arrive, retirent environ {100 * (1 - (1 - rp / 100) ** 10):.0f} % du compte. "
                          "La plupart des traders restent entre 0,5 et 2 %."))
    elif rp > 2:
        avis.append(_avis("attention", "risque_eleve",
                          f"{str(rp).replace('.', ',')} % par trade, c'est agressif : une série de pertes normale "
                          "fera mal. Entre 0,5 et 2 % laisse le temps d'apprendre."))

    if s["sens"] == "vente":
        avis.append(_avis("attention", "vente",
                          "Vendre à découvert : sur 40 actifs et 5 ans, les ventes du moteur de Nimbo ont perdu "
                          "en moyenne. Les marchés montent plus souvent qu'ils ne baissent sur la durée. "
                          "Le test vous dira si votre idée fait mieux."))
    # Le sens des conditions comparé au sens du trade.
    if s["sens"] == "achat" and any(c["sens"] == "bas" for c in cass):
        avis.append(_avis("attention", "achat_sur_cassure_basse",
                          "Acheter quand le prix casse son plus bas, c'est acheter pendant une chute. C'est "
                          "possible (un pari de rebond), mais le stop sera souvent touché."))
    if s["sens"] == "vente" and any(c["sens"] == "haut" for c in cass):
        avis.append(_avis("attention", "vente_sur_cassure_haute",
                          "Vendre quand le prix casse son plus haut, c'est parier contre un marché qui monte."))
    return avis


def bloquante(avis: list[dict]) -> bool:
    return any(a["niveau"] == "erreur" for a in avis)


# ── Les signaux ────────────────────────────────────────────────────────────

def _ema(x: pd.Series, n: int) -> pd.Series:
    return x.ewm(span=n, adjust=False).mean()


def masques(hist: pd.DataFrame, conds: list[dict]) -> dict[str, pd.Series]:
    """Pour chaque condition (hors score de Nimbo), un vrai/faux par bougie,
    calculé avec les seules données connues à la clôture de cette bougie."""
    h, l, c = hist["High"].astype(float), hist["Low"].astype(float), hist["Close"].astype(float)
    v = hist["Volume"].astype(float) if "Volume" in hist else pd.Series(np.nan, index=hist.index)
    out: dict[str, pd.Series] = {}
    rsi = None
    macd = sig = None
    for i, cd in enumerate(conds):
        t = cd["type"]; cle = f"{i}:{t}"
        if t == "tendance_ma":
            ma = _ema(c, cd["periode"])
            m = c > ma if cd["position"] == "dessus" else c < ma
            m &= np.arange(len(c)) >= cd["periode"]
        elif t == "croisement_ma":
            r, lt = _ema(c, cd["rapide"]), _ema(c, cd["lente"])
            m = r > lt if cd["sens"] == "haussier" else r < lt
            m &= np.arange(len(c)) >= cd["lente"]
        elif t == "rsi":
            rsi = rsi if rsi is not None else rsi_wilder(c)
            s = cd["seuil"]
            if cd["mode"] == "sous":
                m = rsi < s
            elif cd["mode"] == "dessus":
                m = rsi > s
            elif cd["mode"] == "repasse_dessus":
                m = (rsi > s) & (rsi.shift(1) <= s)
            else:
                m = (rsi < s) & (rsi.shift(1) >= s)
        elif t == "cassure":
            n = cd["periode"]
            if cd["sens"] == "haut":
                m = c > h.shift(1).rolling(n).max()
            else:
                m = c < l.shift(1).rolling(n).min()
        elif t == "macd":
            if macd is None:
                macd = _ema(c, 12) - _ema(c, 26)
                sig = _ema(macd, 9)
            if cd["mode"] == "croise_dessus":
                m = (macd > sig) & (macd.shift(1) <= sig.shift(1))
            elif cd["mode"] == "croise_dessous":
                m = (macd < sig) & (macd.shift(1) >= sig.shift(1))
            elif cd["mode"] == "dessus":
                m = macd > sig
            else:
                m = macd < sig
            m &= np.arange(len(c)) >= 35
        elif t == "volume":
            moy = v.shift(1).rolling(20).mean()
            m = v > cd["multiple"] * moy
        else:
            continue
        out[cle] = pd.Series(np.asarray(m, dtype=bool), index=hist.index).fillna(False)
    return out


def _score_nimbo_a(hist: pd.DataFrame, t: int) -> Optional[float]:
    """Le score du moteur à la clôture de la bougie t-1, sur l'historique d'alors."""
    from ._scoring import compute_score
    w = hist.iloc[max(0, t - 800):t]
    try:
        S = compute_score(w["High"], w["Low"], w["Close"], w["Volume"], current_price=float(w["Close"].iloc[-1]))
        return float(S["final_score"])
    except Exception:
        return None


# ── Le backtest ────────────────────────────────────────────────────────────

def rejouer(hist: pd.DataFrame, s: dict, symbol: str = "") -> dict:
    """Rejoue la stratégie sur un actif. Une position à la fois."""
    hist = hist.dropna(subset=["High", "Low", "Close"])
    n = len(hist)
    if n < 80:
        return {"symbol": symbol, "trades": [], "erreur": "Historique trop court pour tester."}
    hi, lo, cl = (hist[k].to_numpy(float) for k in ("High", "Low", "Close"))
    op = hist["Open"].to_numpy(float) if "Open" in hist else None
    atr = atr_wilder(hist["High"].astype(float), hist["Low"].astype(float), hist["Close"].astype(float)).to_numpy(float)
    M = masques(hist, s["conditions"])
    tous = np.ones(n, dtype=bool)
    for m in M.values():
        tous &= m.to_numpy()
    score_min = next((c["min"] for c in s["conditions"] if c["type"] == "score_nimbo"), None)
    # Le score coûte une dizaine de millisecondes ; le recalculer à chaque
    # jour candidat demandait près de mille calculs par actif (une minute et
    # demie pour cinq actifs). Il est recalculé une fois par semaine de cours
    # et réutilisé jusqu'au suivant : toujours sur des clôtures passées, donc
    # sans regarder le futur, au prix de quelques jours de retard au plus.
    pas_score = SCORE_PAS.get(s["unite"], 1)
    scores: dict[int, Optional[float]] = {}
    achat = s["sens"] == "achat"
    debut = 60
    trades = []
    refus = []  # tout était réuni, sauf le score de Nimbo
    t = debut
    while t < n - 1:
        # La bougie t-1 vient de clôturer : on regarde si tout y est réuni.
        if not tous[t - 1] or not np.isfinite(atr[t - 1]) or atr[t - 1] <= 0:
            t += 1
            continue
        if score_min is not None:
            b = ((t - 1) // pas_score) * pas_score + 1  # la dernière date de calcul, au plus t
            if b not in scores:
                scores[b] = _score_nimbo_a(hist, b)
            sc = scores[b]
            if sc is None or sc < score_min:
                refus.append({"i": t - 1, "score": round(sc) if sc is not None else None})
                t += 1
                continue
        entree = cl[t - 1]
        risque = s["stop_atr"] * atr[t - 1]
        stop = entree - risque if achat else entree + risque
        cible = entree + s["objectif_r"] * risque if achat else entree - s["objectif_r"] * risque
        issue, sortie, duree = _walk_barriers(hi, lo, cl, t, s["duree_max"], entree, stop, cible, achat, op)
        brut = (sortie - entree) if achat else (entree - sortie)
        r = brut / risque - 2 * (FRAIS_BPS / 10_000) * entree / risque
        trades.append({
            "symbol": symbol,
            "entree_le": str(hist.index[t - 1])[:10],
            "sortie_le": str(hist.index[min(t - 1 + duree, n - 1)])[:10],
            "entree": round(float(entree), 6), "sortie": round(float(sortie), 6),
            "issue": {"target": "objectif", "stop": "stop", "timeout": "durée"}[issue],
            "r": round(float(r), 3), "bougies": int(duree),
            "stop": round(float(stop), 6), "objectif": round(float(cible), 6),
            "i_e": int(t - 1), "i_s": int(min(t - 1 + duree, n - 1)),
        })
        t = t + duree  # la position suivante ne commence qu'une fois celle-ci fermée
    # Combien de fois chaque condition était vraie : ce qui rend la stratégie rare.
    frequences = {k: round(float(m.iloc[debut:].mean()) * 100, 1) for k, m in M.items()}
    return {
        "symbol": symbol, "trades": trades, "frequences": frequences, "refus": refus, "masques": M, "i_debut": debut,
        "debut": str(hist.index[debut])[:10], "fin": str(hist.index[-1])[:10],
        "achat_conserve_pct": round(float((cl[-1] / cl[debut] - 1) * 100), 1),
    }


def _liste(x) -> list:
    """Une série en liste JSON : six chiffres significatifs, None pour les trous."""
    out = []
    for v in np.asarray(x, dtype=float):
        out.append(float(f"{v:.6g}") if np.isfinite(v) else None)
    return out


def film(hist: pd.DataFrame, s: dict, symbol: str = "") -> dict:
    """Tout ce qu'il faut pour rejouer la stratégie bougie par bougie : les
    cours, les indicateurs que ses conditions regardent, chaque condition
    vraie ou fausse à chaque clôture, et les trades avec leur stop et leur
    objectif. Les valeurs d'une bougie ne dépendent que du passé : le rejeu
    peut s'arrêter n'importe où sans dévoiler la suite."""
    hist = hist.dropna(subset=["High", "Low", "Close"])
    r = rejouer(hist, s, symbol)
    if r.get("erreur"):
        return {"symbol": symbol, "erreur": r["erreur"]}
    h, l, c = hist["High"].astype(float), hist["Low"].astype(float), hist["Close"].astype(float)
    o = hist["Open"].astype(float) if "Open" in hist else c
    v = hist["Volume"].astype(float) if "Volume" in hist else pd.Series(np.nan, index=hist.index)

    superpositions: dict[str, dict] = {}
    panneaux: dict[str, dict] = {}
    conditions = []
    for i, cd in enumerate(s["conditions"]):
        t = cd["type"]
        cle_valeur = None
        if t == "tendance_ma":
            k = f"ema{cd['periode']}"
            superpositions.setdefault(k, {"cle": k, "label": f"Moyenne {cd['periode']}", "valeurs": _liste(_ema(c, cd["periode"]))})
            cle_valeur = k
        elif t == "croisement_ma":
            for p in (cd["rapide"], cd["lente"]):
                k = f"ema{p}"
                superpositions.setdefault(k, {"cle": k, "label": f"Moyenne {p}", "valeurs": _liste(_ema(c, p))})
            cle_valeur = f"ema{cd['rapide']}"
        elif t == "cassure":
            n = cd["periode"]
            k = f"{'haut' if cd['sens'] == 'haut' else 'bas'}{n}"
            serie = h.shift(1).rolling(n).max() if cd["sens"] == "haut" else l.shift(1).rolling(n).min()
            label = f"Plus haut des {n} dernières" if cd["sens"] == "haut" else f"Plus bas des {n} dernières"
            superpositions.setdefault(k, {"cle": k, "label": label, "valeurs": _liste(serie)})
            cle_valeur = k
        elif t == "rsi":
            p = panneaux.setdefault("rsi", {"type": "rsi", "label": "RSI (14)", "seuils": [],
                                            "series": [{"cle": "rsi", "label": "RSI", "valeurs": _liste(rsi_wilder(c))}]})
            if cd["seuil"] not in p["seuils"]:
                p["seuils"].append(cd["seuil"])
            cle_valeur = "rsi"
        elif t == "macd":
            m = _ema(c, 12) - _ema(c, 26)
            panneaux.setdefault("macd", {"type": "macd", "label": "MACD (12, 26, 9)", "seuils": [0], "series": [
                {"cle": "macd", "label": "MACD", "valeurs": _liste(m)},
                {"cle": "signal", "label": "Signal", "valeurs": _liste(_ema(m, 9))}]})
            cle_valeur = "macd"
        elif t == "volume":
            p = panneaux.setdefault("volume", {"type": "volume", "label": "Volume", "seuils": [], "series": [
                {"cle": "volume", "label": "Volume", "valeurs": _liste(v)}]})
            k = f"vol{cd['multiple']}"
            if not any(x["cle"] == k for x in p["series"]):
                p["series"].append({"cle": k, "label": f"{str(cd['multiple']).replace('.', ',')} fois la moyenne",
                                    "valeurs": _liste(cd["multiple"] * v.shift(1).rolling(20).mean())})
            cle_valeur = "volume"
        m = r["masques"].get(f"{i}:{t}")
        conditions.append({
            "texte": decrire_condition(cd), "type": t, "valeur": cle_valeur,
            # Le score de Nimbo coûte cher : il n'est calculé que les jours où
            # le reste est réuni (voir `refus`).
            "masque": "".join("1" if x else "0" for x in m.to_numpy()) if m is not None else None,
        })

    return {
        "symbol": symbol, "unite": UNITES[s["unite"]], "debut": r["i_debut"],
        "sens": s["sens"], "risque_pct": s["risque_pct"], "stop_atr": s["stop_atr"],
        "objectif_r": s["objectif_r"], "duree_max": s["duree_max"],
        "dates": [str(d)[:10] for d in hist.index],
        "o": _liste(o), "h": _liste(h), "l": _liste(l), "c": _liste(c),
        "superpositions": list(superpositions.values()), "panneaux": list(panneaux.values()),
        "conditions": conditions, "trades": r["trades"], "refus": r["refus"],
        "achat_conserve_pct": r["achat_conserve_pct"],
    }


def _drawdown_r(rs: list[float]) -> float:
    pic, cumul, pire = 0.0, 0.0, 0.0
    for r in rs:
        cumul += r
        pic = max(pic, cumul)
        pire = min(pire, cumul - pic)
    return round(pire, 2)


def synthese(resultats: list[dict], s: dict) -> dict:
    """Les chiffres de tous les actifs réunis, et la lecture qu'en fait Nimbo."""
    trades = sorted([t for r in resultats for t in r.get("trades", [])], key=lambda t: t["sortie_le"])
    rs = [t["r"] for t in trades]
    n = len(rs)
    stats: dict[str, Any] = {"trades": n}
    lecture: list[dict] = []
    if n:
        gagnants = [r for r in rs if r > 0]
        perdants = [r for r in rs if r <= 0]
        total = sum(rs)
        rp = s["risque_pct"] / 100
        capital, courbe = 1.0, []
        for t in trades:
            capital *= 1 + rp * t["r"]
            courbe.append({"date": t["sortie_le"], "capital": round(capital * 100, 2), "r": t["r"], "symbol": t["symbol"]})
        dd_pct, pic = 0.0, 1.0
        c = 1.0
        for t in trades:
            c *= 1 + rp * t["r"]
            pic = max(pic, c)
            dd_pct = min(dd_pct, c / pic - 1)
        issues = {k: sum(1 for t in trades if t["issue"] == k) for k in ("objectif", "stop", "durée")}
        moitie = n // 2
        stats.update({
            "taux_gagnants": round(len(gagnants) / n * 100, 1),
            "r_moyen": round(total / n, 3),
            "r_total": round(total, 2),
            "gain_moyen_r": round(sum(gagnants) / len(gagnants), 2) if gagnants else 0,
            "perte_moyenne_r": round(sum(perdants) / len(perdants), 2) if perdants else 0,
            "facteur_profit": round(sum(gagnants) / -sum(perdants), 2) if perdants and sum(perdants) < 0 else None,
            "pire_serie_r": _drawdown_r(rs),
            "capital_final_pct": round((capital - 1) * 100, 1),
            "baisse_max_pct": round(dd_pct * 100, 1),
            "issues": issues,
            "duree_moyenne": round(sum(t["bougies"] for t in trades) / n, 1),
            "r_moyen_1re_moitie": round(sum(rs[:moitie]) / moitie, 3) if moitie else None,
            "r_moyen_2e_moitie": round(sum(rs[moitie:]) / (n - moitie), 3) if n - moitie else None,
            "courbe": courbe,
        })
        conserve = [r["achat_conserve_pct"] for r in resultats if r.get("trades") is not None and "achat_conserve_pct" in r]
        if conserve:
            stats["achat_conserve_pct"] = round(float(sum(conserve) / len(conserve)), 1)

        # La lecture de Nimbo : ce que les chiffres veulent dire, simplement.
        rm = total / n
        if n < 20:
            lecture.append(_avis("attention", "peu_de_trades",
                                 f"Seulement {n} trades : c'est trop peu pour savoir si la stratégie marche ou si "
                                 "elle a eu de la chance. Ajoutez des actifs ou assouplissez une condition."))
        if rm > 0.15:
            lecture.append(_avis("bien", "positif",
                                 f"En moyenne, chaque trade a rapporté {str(round(rm, 2)).replace('.', ',')} fois ce "
                                 "qu'il risquait, frais compris. C'est un bon signe, à confirmer en simulation."))
        elif rm > 0:
            lecture.append(_avis("conseil", "faible",
                                 f"Chaque trade a rapporté en moyenne {str(round(rm, 2)).replace('.', ',')} fois le "
                                 "risque : à peine positif. Une petite différence de marché ou de frais suffirait à "
                                 "l'effacer."))
        else:
            lecture.append(_avis("attention", "negatif",
                                 f"En moyenne, chaque trade a perdu {str(round(-rm, 2)).replace('.', ',')} fois ce "
                                 "qu'il risquait. Sur ces actifs et cette période, la stratégie aurait coûté de "
                                 "l'argent."))
        if gagnants and total > 2 and max(rs) > 0.5 * total:
            lecture.append(_avis("attention", "un_seul_trade",
                                 "Plus de la moitié du gain vient d'un seul trade : sans lui, le résultat serait bien "
                                 "plus faible. Ne comptez pas qu'il se reproduise."))
        if stats["r_moyen_1re_moitie"] is not None and stats["r_moyen_2e_moitie"] is not None:
            a, b = stats["r_moyen_1re_moitie"], stats["r_moyen_2e_moitie"]
            if (a > 0.1 and b < -0.05) or (a < -0.05 and b > 0.1):
                lecture.append(_avis("attention", "instable",
                                     "La stratégie a gagné sur une moitié de la période et perdu sur l'autre : son "
                                     "résultat dépend du moment. Méfiance."))
        if issues["durée"] > 0.5 * n:
            lecture.append(_avis("conseil", "trop_de_durees",
                                 "Plus de la moitié des trades sont sortis à la durée maximale : l'objectif est sans "
                                 "doute trop loin, ou la durée trop courte."))
        if stats["baisse_max_pct"] < -20:
            lecture.append(_avis("attention", "baisse_forte",
                                 f"Au pire moment, le compte aurait reculé de {abs(stats['baisse_max_pct']):.0f} % "
                                 "depuis son plus haut. Réduire le risque par trade réduirait d'autant ce creux."))
        if "achat_conserve_pct" in stats and s["sens"] == "achat":
            if stats["achat_conserve_pct"] > stats["capital_final_pct"] + 10:
                lecture.append(_avis("conseil", "moins_que_conserver",
                                     f"Acheter ces actifs au début et les garder aurait fait "
                                     f"{stats['achat_conserve_pct']:+.0f} % contre {stats['capital_final_pct']:+.0f} % "
                                     "pour la stratégie. Elle risque moins, mais rapporte moins."))
    else:
        # Aucun trade : dire quelle condition est la plus rare.
        freq: dict[str, list[float]] = {}
        for r in resultats:
            for k, v in (r.get("frequences") or {}).items():
                freq.setdefault(k, []).append(v)
        if freq:
            k, vals = min(freq.items(), key=lambda kv: sum(kv[1]) / len(kv[1]))
            i = int(k.split(":")[0])
            cd = s["conditions"][i] if i < len(s["conditions"]) else None
            lecture.append(_avis("attention", "aucun_trade",
                                 "Aucun trade en cinq ans : les conditions n'ont jamais été réunies le même jour."
                                 + (f" La plus rare : « {decrire_condition(cd)} » (vraie "
                                    f"{str(round(sum(vals) / len(vals), 1)).replace('.', ',')} % du temps)." if cd else "")))
        else:
            lecture.append(_avis("attention", "aucun_trade", "Aucun trade sur la période testée."))
    return {"stats": stats, "lecture": lecture, "trades": trades[-60:]}


# ── Le signal du jour ──────────────────────────────────────────────────────

def signal_du_jour(hist: pd.DataFrame, s: dict, prix: Optional[float] = None) -> dict:
    """La stratégie se déclenche-t-elle sur la dernière bougie close, et avec quel plan ?"""
    hist = hist.dropna(subset=["High", "Low", "Close"])
    if len(hist) < 60:
        return {"possible": False, "raison": "Historique trop court."}
    M = masques(hist, s["conditions"])
    etat = []
    for i, cd in enumerate(s["conditions"]):
        if cd["type"] == "score_nimbo":
            sc = _score_nimbo_a(hist, len(hist))
            ok = sc is not None and sc >= cd["min"]
            etat.append({"texte": decrire_condition(cd), "ok": bool(ok),
                         "valeur": round(sc) if sc is not None else None})
        else:
            m = M.get(f"{i}:{cd['type']}")
            etat.append({"texte": decrire_condition(cd), "ok": bool(m.iloc[-1]) if m is not None else False})
    reunies = all(e["ok"] for e in etat) and bool(etat)
    atr = float(atr_wilder(hist["High"].astype(float), hist["Low"].astype(float), hist["Close"].astype(float)).iloc[-1])
    c = float(prix or hist["Close"].iloc[-1])
    achat = s["sens"] == "achat"
    risque = s["stop_atr"] * atr
    plan = {
        "direction": "LONG" if achat else "SHORT",
        "entree": c,
        "stop": c - risque if achat else c + risque,
        "objectif": c + s["objectif_r"] * risque if achat else c - s["objectif_r"] * risque,
        "rr": s["objectif_r"],
    } if atr > 0 else None
    return {"possible": True, "reunies": reunies, "conditions": etat, "plan": plan,
            "manquantes": sum(1 for e in etat if not e["ok"])}
