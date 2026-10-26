"""Moteur de confluence technique — en SHADOW.

Une zone de Fibonacci seule ne dit presque rien. La question utile est :
COMBIEN D'INFORMATIONS RÉELLEMENT DIFFÉRENTES convergent sur cette zone, et
lesquelles la contredisent ?

FAMILLES, UNE VOIX CHACUNE. Le moteur a beaucoup d'indicateurs corrélés :
EMA20 > EMA50 > EMA200 n'est pas trois preuves, RSI + stochastique +
Williams %R non plus. Chaque famille rend donc UN verdict — alignée,
contraire ou neutre — quel que soit le nombre d'indicateurs qu'elle contient,
et la force d'une confluence se compte en familles, pas en indicateurs :

    FIBONACCI            le prix est-il dans une zone de retracement de la jambe primaire ?
    MULTI_UNITES         une autre échelle ou l'unité supérieure a-t-elle une zone au même endroit ?
    SUPPORT_RESISTANCE   la zone recouvre-t-elle un support/une résistance, un pivot passé, une moyenne longue ?
    STRUCTURE            HH/HL intact dans le sens de la jambe, ou rompu ?
    TENDANCE             moyennes et ADX/DI (une seule voix)
    MOMENTUM             RSI et histogramme MACD qui se retournent (une seule voix)
    VOLUME               OBV et CMF (une seule voix)
    VOLATILITE           régime extrême : une zone ne veut plus rien dire
    PRIX                 réaction de la dernière bougie dans la zone (rejet, ou traversée)

Les contradictions comptent autant que les confirmations : « zone importante
MAIS structure cassée » est plus utile qu'un score qui additionne.

Tout vient de `compute_score()` (RSI, MACD, OBV, CMF, ADX, DI, EMA, ATR,
percentile de volatilité) et de `_structure` : rien n'est recalculé.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from ._structure import PRIMAIRE, ZONE_DEMI_LARGEUR_ATR, VERSION, FIBONACCI_SHADOW_MODE

FAMILLES = ("FIBONACCI", "MULTI_UNITES", "SUPPORT_RESISTANCE", "STRUCTURE", "TENDANCE",
            "MOMENTUM", "VOLUME", "VOLATILITE", "PRIX")
CLUSTER_PORTEE_ATR = 1.5        # les zones regardées pour former un cluster, autour du prix


def _chevauche(z1, z2) -> bool:
    return z1[0] <= z2[1] and z2[0] <= z1[1]


def _dernier(s, defaut=None):
    try:
        v = s.dropna().iloc[-1]
        return float(v)
    except Exception:
        return defaut


def _pente(s: pd.Series, n: int = 3) -> Optional[float]:
    try:
        c = s.dropna()
        return float(c.iloc[-1] - c.iloc[-1 - n]) if len(c) > n else None
    except Exception:
        return None


def clusters(unites: list[dict], prix: float, atr: float) -> list[dict]:
    """Les zones de retracement (toutes échelles, toutes unités) qui se
    recouvrent près du prix. Un cluster réunit AU MOINS deux jambes
    différentes : deux ratios d'une même jambe ne se confirment pas."""
    zones = []
    for u in unites:
        if not u:
            continue
        for echelle, j in u["jambes"].items():
            if j["phase"] == "invalidee":
                continue
            for niv in j["niveaux"]:
                if niv["genre"] == "retracement" and abs(niv["prix"] - prix) <= CLUSTER_PORTEE_ATR * atr:
                    zones.append({"jambe": j["id"], "unite": u["unite"], "echelle": echelle,
                                  "ratio": niv["ratio"], "zone": niv["zone"], "prix": niv["prix"]})
    zones.sort(key=lambda z: z["prix"])
    # Pas de chaînage : de proche en proche, des zones qui se touchent deux à
    # deux finissaient par couvrir 3 ATR. Un cluster ne dépasse jamais la
    # largeur d'une zone, mesurée depuis son niveau le plus bas.
    largeur = 2 * ZONE_DEMI_LARGEUR_ATR * atr
    groupes: list[list[dict]] = []
    for z in zones:
        if groupes and z["prix"] - groupes[-1][0]["prix"] <= largeur:
            groupes[-1].append(z)
        else:
            groupes.append([z])
    sortie = []
    for g in groupes:
        jambes = {z["jambe"] for z in g}
        if len(jambes) < 2:
            continue
        sortie.append({
            "zone": [round(min(z["zone"][0] for z in g), 6), round(max(z["zone"][1] for z in g), 6)],
            "membres": [f"{z['unite']} {z['echelle']} {z['ratio']} %" for z in g],
            "jambes": len(jambes),
            "unites": sorted({z["unite"] for z in g}),
            "echelles": sorted({f"{z['unite']}:{z['echelle']}" for z in g}),
        })
    return sortie


def confluence(principale: Optional[dict], superieure: Optional[dict], S: dict,
               df: pd.DataFrame, prix: float, niveaux_moteur: dict[str, float]) -> dict:
    """Le contexte technique autour de la jambe primaire de l'unité affichée."""
    base = {"version": VERSION, "shadow": FIBONACCI_SHADOW_MODE, "poids": 0.0}
    if not principale or PRIMAIRE not in principale["jambes"]:
        return {**base, "situation": "E", "lecture": "Pas de mouvement significatif lisible : aucune zone à évaluer.",
                "familles": {}, "alignees": [], "contraires": [], "clusters": []}
    atr = principale["atr"]
    jambe = principale["jambes"][PRIMAIRE]
    # Le sens de la réaction qu'une zone de retracement pourrait porter : une
    # correction d'une jambe haussière, c'est une zone où la hausse pourrait
    # reprendre. En extension, il n'y a pas de zone de repli à juger.
    d = 1 if jambe["sens"] == "hausse" else -1
    en_correction = jambe["phase"] == "correction"
    niv = jambe["niveau_proche"]
    dans_zone = en_correction and niv["position"] == "dans la zone"
    f: dict[str, int] = {}
    pourquoi: dict[str, str] = {}

    # FIBONACCI
    f["FIBONACCI"] = 1 if dans_zone else 0
    pourquoi["FIBONACCI"] = (f"dans la zone {niv['ratio']} % de la jambe {jambe['sens']}" if dans_zone
                             else f"{jambe['phase']} ; niveau le plus proche {niv['ratio']} % à {abs(niv['distance_atr']):.1f} ATR")

    # MULTI_UNITES — les clusters qui contiennent la zone du prix
    cl = clusters([principale, superieure], prix, atr)
    # Un cluster ne compte que s'il réunit la jambe primaire et une échelle
    # SIGNIFICATIVE différente — la majeure, ou l'unité supérieure. Les
    # niveaux d'une petite jambe mineure sont si serrés qu'ils tombent
    # presque toujours quelque part : ce ne serait pas une confirmation.
    primaire_cle = f"{principale['unite']}:{PRIMAIRE}"
    ici = [c for c in cl if c["zone"][0] <= prix <= c["zone"][1]
           and primaire_cle in c["echelles"]
           and any(e != primaire_cle and not e.endswith(":mineure") for e in c["echelles"])]
    f["MULTI_UNITES"] = 1 if (dans_zone and ici) else 0
    pourquoi["MULTI_UNITES"] = (f"cluster {', '.join(ici[0]['membres'])}" if ici else "aucune autre échelle au même endroit")

    # SUPPORT_RESISTANCE — la zone recouvre-t-elle un niveau que le moteur connaît déjà ?
    zone = niv["zone"]
    marge = ZONE_DEMI_LARGEUR_ATR * atr
    touches = [nom for nom, v in niveaux_moteur.items()
               if v and _chevauche(zone, (v - marge, v + marge))]
    f["SUPPORT_RESISTANCE"] = 1 if (dans_zone and touches) else 0
    pourquoi["SUPPORT_RESISTANCE"] = (f"recouvre {', '.join(touches)}" if touches else "aucun niveau du moteur dans la zone")

    # STRUCTURE — intacte dans le sens de la jambe, ou rompue
    st = principale.get("structure", {})
    sens_st = {"haussiere": 1, "baissiere": -1}.get(st.get("etat"), 0)
    if st.get("rompue"):
        f["STRUCTURE"] = -1; pourquoi["STRUCTURE"] = "structure rompue : le dernier creux (ou sommet) est franchi"
    elif sens_st == d:
        f["STRUCTURE"] = 1; pourquoi["STRUCTURE"] = f"{st.get('sommets')}/{st.get('creux')} intact"
    elif sens_st == -d:
        f["STRUCTURE"] = -1; pourquoi["STRUCTURE"] = f"structure {st.get('etat')}, contraire à la jambe"
    else:
        f["STRUCTURE"] = 0; pourquoi["STRUCTURE"] = "range : pas de structure directionnelle"

    # TENDANCE — une voix pour les moyennes et l'ADX/DI
    e20, e50 = _dernier(S.get("ema20")), _dernier(S.get("ema50"))
    pdi, mdi, adx = S.get("current_plus_di"), S.get("current_minus_di"), S.get("adx_val")
    tend = 0
    if e20 and e50 and pdi is not None and mdi is not None:
        if e20 > e50 and pdi > mdi: tend = 1
        elif e20 < e50 and pdi < mdi: tend = -1
    f["TENDANCE"] = tend * d
    pourquoi["TENDANCE"] = {1: "moyennes et DI dans le sens de la jambe", -1: "moyennes et DI contre la jambe",
                            0: "moyennes et DI partagés"}[f["TENDANCE"]] + (f" (ADX {adx:.0f})" if adx else "")

    # MOMENTUM — une voix pour RSI et histogramme MACD : se retournent-ils dans le sens de la jambe ?
    p_rsi, p_hist = _pente(S.get("rsi", pd.Series(dtype=float))), _pente(S.get("macd_hist", pd.Series(dtype=float)))
    votes = [np.sign(x) * d for x in (p_rsi, p_hist) if x is not None and x != 0]
    f["MOMENTUM"] = 1 if votes and all(v > 0 for v in votes) else -1 if votes and all(v < 0 for v in votes) else 0
    pourquoi["MOMENTUM"] = {1: "RSI et MACD se retournent dans le sens de la jambe",
                            -1: "RSI et MACD continuent contre la jambe", 0: "momentum partagé"}[f["MOMENTUM"]]

    # VOLUME — une voix pour OBV et CMF
    obv = {"bullish": 1, "bearish": -1}.get(S.get("obv_trend"), 0)
    cmf = S.get("current_cmf")
    cmf_s = 0 if cmf is None else (1 if cmf > 0.05 else -1 if cmf < -0.05 else 0)
    vv = [x * d for x in (obv, cmf_s) if x]
    f["VOLUME"] = 1 if vv and all(v > 0 for v in vv) else -1 if vv and all(v < 0 for v in vv) else 0
    pourquoi["VOLUME"] = {1: "OBV et CMF confirment", -1: "OBV et CMF contredisent", 0: "volume neutre"}[f["VOLUME"]]

    # VOLATILITE — dans un régime extrême, une zone de ±0,25 ATR ne veut plus rien dire
    vp = S.get("vol_percentile")
    f["VOLATILITE"] = -1 if (vp is not None and vp >= 95) else 0
    pourquoi["VOLATILITE"] = f"volatilité au centile {vp:.0f}" if vp is not None else "volatilité inconnue"

    # PRIX — la réaction de la dernière bougie dans la zone
    try:
        o, h, l, c = (float(df[k].iloc[-1]) for k in ("Open", "High", "Low", "Close"))
        rng = max(h - l, 1e-12)
        if dans_zone:
            meche = ((min(o, c) - l) if d > 0 else (h - max(o, c))) / rng
            haut = ((c - l) if d > 0 else (h - c)) / rng
            f["PRIX"] = 1 if (meche >= 0.5 and haut >= 0.5) else 0
            pourquoi["PRIX"] = "rejet de la zone (longue mèche, clôture du bon côté)" if f["PRIX"] else "pas de rejet net"
        elif en_correction and ((d > 0 and c < zone[0]) or (d < 0 and c > zone[1])) and niv["ratio"] == "78.6":
            f["PRIX"] = -1; pourquoi["PRIX"] = "clôture au-delà de 78,6 % : le repli ressemble à une cassure"
        else:
            f["PRIX"] = 0; pourquoi["PRIX"] = "hors zone"
    except Exception:
        f["PRIX"] = 0; pourquoi["PRIX"] = "indisponible"

    alignees = [k for k in FAMILLES if f.get(k) == 1]
    contraires = [k for k in FAMILLES if f.get(k) == -1]
    autres = [k for k in alignees if k != "FIBONACCI"]

    # Les situations du brief, dans l'ordre où elles doivent primer.
    if principale.get("bruite") or jambe["confiance"] == "faible":
        situation, lecture = "E", "Marché bruité ou jambe peu fiable : faible confiance, aucune zone à retenir."
    elif not dans_zone:
        situation, lecture = "-", ("Prix hors des zones de repli de la jambe en cours : "
                                   f"{jambe['phase']} de la jambe {jambe['sens']}.")
    elif "STRUCTURE" in contraires:
        situation, lecture = "B", "Zone de repli importante, MAIS structure cassée : contexte contradictoire."
    elif not autres:
        situation, lecture = "C", "Niveau de Fibonacci seul, sans autre confirmation : information faible."
    elif {"MULTI_UNITES", "SUPPORT_RESISTANCE"} <= set(alignees) and {"VOLUME", "MOMENTUM"} & set(alignees) and not contraires:
        situation, lecture = "D", "Plusieurs échelles et un niveau connu convergent, avec confirmation : zone significative."
    elif len(autres) >= 2 and not contraires:
        situation, lecture = "A", "Plusieurs familles indépendantes convergent, sans contradiction : contexte cohérent."
    else:
        situation, lecture = "mitige", "Zone de repli avec des éléments pour et contre."

    return {
        **base,
        "situation": situation, "lecture": lecture,
        "jambe_primaire": jambe["id"],
        "zone": niv["zone"], "ratio": niv["ratio"] if dans_zone else None,
        "familles": {k: {"vote": f[k], "pourquoi": pourquoi[k]} for k in FAMILLES},
        "alignees": alignees, "contraires": contraires,
        "force": len(alignees) - len(contraires),
        "familles_independantes": len(alignees),
        "clusters": cl,
    }


def contexte_technique(df: pd.DataFrame, S: dict, timeframe: str, prix: float,
                       niveaux_moteur: dict[str, float]) -> Optional[dict]:
    """Le bloc complet, stable et versionné, pour l'analyse (et plus tard l'IA).

    `S` est la sortie de compute_score() déjà calculée par l'appelant ; seules
    les bougies de l'unité supérieure demandent un ATR à part."""
    from ._indicators import atr_wilder
    from ._structure import ALTERNATIVE, analyser_unite, ohlc_superieure
    atr = float(S.get("atr") or 0)
    if not atr > 0:
        return None
    principale = analyser_unite(df, atr, prix, timeframe)
    superieure = None
    sup = ohlc_superieure(df, timeframe)
    if sup:
        unite_sup, d_sup = sup
        a_sup = _dernier(atr_wilder(d_sup["High"], d_sup["Low"], d_sup["Close"]))
        if a_sup:
            superieure = analyser_unite(d_sup, a_sup, prix, unite_sup)
    if not principale:
        return None
    jambes = principale["jambes"]
    return {
        "version": VERSION,
        "shadow": FIBONACCI_SHADOW_MODE,
        "unite": timeframe,
        "market_structure": {
            timeframe: principale.get("structure"),
            **({superieure["unite"]: superieure.get("structure")} if superieure else {}),
        },
        "fibonacci": {
            "primaire": jambes.get(PRIMAIRE),
            # Le scénario alternatif est conservé, pas supprimé : quand deux
            # jambes sont plausibles, les deux sont dites.
            "alternative": jambes.get(ALTERNATIVE) if jambes.get(ALTERNATIVE, {}).get("id") != (jambes.get(PRIMAIRE) or {}).get("id") else None,
            "mineure": jambes.get("mineure"),
            "superieure": (superieure or {}).get("jambes", {}).get(PRIMAIRE),
            "bruite": principale.get("bruite"),
        },
        "confluence": confluence(principale, superieure, S, df, prix, niveaux_moteur),
    }
