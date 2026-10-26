"""Moteur de structure de marché et de Fibonacci — en SHADOW.

Question posée : OÙ SE SITUE LE PRIX DANS LA GÉOMÉTRIE DE SON MOUVEMENT ?
Quel est le dernier mouvement significatif, dans quel sens, le prix le
prolonge-t-il ou le corrige-t-il, jusqu'où, et la structure tient-elle ?

Fibonacci sert de LANGAGE pour décrire cette géométrie. Ses niveaux sont des
zones où chercher une réaction, jamais un signal : 61,8 % n'est pas
« acheter », 161,8 % n'est pas un objectif promis.

ARCHITECTURE (brief « Fibonacci / Market Structure / Confluence », v1.0)

    données ─► PIVOTS (_figures.pivots, réutilisé) ─► SWINGS par échelle
            ─► STRUCTURE (HH/HL/LH/LL, rupture) ─► JAMBE ACTIVE
            ─► FIBONACCI (retracements, extensions, zones) ─► [_confluence.py]

Rien n'est recalculé : les pivots viennent de `_figures.pivots()` (la même
fractale que le graphique de l'interface, `trendStructure.ts`), l'ATR de
`compute_score()` ou de `_indicators.atr_wilder()`, le rééchantillonnage de
`_scoring.resample_ohlcv()` et la table `HIGHER_TF`.

TROIS ÉCHELLES DE SWINGS, choisies a priori et non optimisées :

    mineure        voisinage 3 bougies, jambe ≥ 2 ATR
    intermédiaire  voisinage 5 bougies, jambe ≥ 3 ATR   (la jambe « primaire »)
    majeure        voisinage 10 bougies, jambe ≥ 6 ATR  (le scénario alternatif)

Les seuils sont en ATR, jamais en pourcentage : 1,5 % n'a pas le même sens
sur l'or, le Bitcoin ou une action.

CAUSALITÉ ET REPAINTING — le point qui décide de tout le reste.

  · Un pivot n'existe qu'une fois ses `k` bougies suivantes connues : c'est
    la définition de `pivots()`, qui ne regarde jamais au-delà de la dernière
    bougie fournie. Un pivot CONFIRMÉ ne change donc plus jamais.
  · La fin de la jambe active peut être un pivot confirmé OU un CANDIDAT :
    l'extrême atteint depuis le dernier pivot confirmé. Le candidat est connu
    à l'instant t (c'est un plus haut déjà réalisé), mais il PEUT ÊTRE
    DÉPASSÉ plus tard — c'est le seul endroit où la lecture évolue, et il
    est signalé (`fin_confirmee: False`). Ce n'est pas du repainting au sens
    d'un ZigZag : le passé n'est jamais réécrit, la jambe en cours s'allonge.
  · Aucun ZigZag rétrospectif. Le rejeu historique appelle la MÊME fonction
    sur l'historique tronqué à chaque date (voir tests/test_structure.py,
    qui vérifie qu'ajouter des bougies futures ne modifie aucun pivot passé).

SHADOW : `FIBONACCI_SHADOW_MODE` vaut True et `poids` vaut 0. Le score
officiel est inchangé tant que la mesure (scripts/mesurer_structure.py)
n'a pas montré un apport stable par rapport à ce que le moteur sait déjà.

MESURÉ (septembre 2026, 40 actifs, 1 h / journalier / 3 jours / hebdomadaire,
trois périodes, erreurs-types corrigées du chevauchement) : aucun apport
stable — ni sur les achats du moteur, ni sur la réaction aux zones, ni à
score égal. Le poids reste donc nul ; le moteur sert de description. Détail :
scripts/structure_rapport.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

from ._figures import Pivot, pivots

VERSION = "1.0"
FIBONACCI_SHADOW_MODE = True

ECHELLES = {                     # nom : (voisinage des pivots, jambe minimale en ATR)
    "mineure": (3, 2.0),
    "intermediaire": (5, 3.0),
    "majeure": (10, 6.0),
}
PRIMAIRE, ALTERNATIVE = "intermediaire", "majeure"

RETRACEMENTS = (0.236, 0.382, 0.5, 0.618, 0.786)     # 50 % : pas un ratio de Fibonacci, mais universellement utilisé
EXTENSIONS = (1.272, 1.618, 2.618)                   # zones d'extension possibles, jamais des objectifs promis
ZONE_DEMI_LARGEUR_ATR = 0.25                          # un niveau est une zone de ±0,25 ATR (fixé a priori ; sensibilité mesurée)


@dataclass(frozen=True)
class Jambe:
    depart: Pivot
    fin: Pivot
    fin_confirmee: bool          # False : la fin est l'extrême en cours, il peut encore s'étendre

    @property
    def hausse(self) -> bool:
        return self.fin.genre == "haut"

    @property
    def amplitude(self) -> float:
        return abs(self.fin.prix - self.depart.prix)


def _cle(r: float) -> str:
    return f"{r * 100:.1f}".rstrip("0").rstrip(".")


def lire_structure(ps: list[Pivot], prix: float) -> dict:
    """HH / HL / LH / LL des deux derniers sommets et creux confirmés — la règle
    de `trendStructure.ts` — et la rupture éventuelle par le prix actuel."""
    hauts = [p for p in ps if p.genre == "haut"]
    bas = [p for p in ps if p.genre == "bas"]
    if len(hauts) < 2 or len(bas) < 2:
        return {"etat": "indetermine", "sommets": None, "creux": None, "invalidation": None, "rompue": False}
    sommets = "HH" if hauts[-1].prix > hauts[-2].prix else "LH"
    creux = "HL" if bas[-1].prix > bas[-2].prix else "LL"
    etat = ("haussiere" if (sommets, creux) == ("HH", "HL")
            else "baissiere" if (sommets, creux) == ("LH", "LL") else "range")
    # Ce qui casse la structure : le dernier creux d'une structure haussière,
    # le dernier sommet d'une baissière. Franchi par le prix, elle est rompue
    # — « possible cassure structurelle », pas une prédiction de retournement.
    invalidation = bas[-1].prix if etat == "haussiere" else hauts[-1].prix if etat == "baissiere" else None
    rompue = invalidation is not None and (
        (etat == "haussiere" and prix < invalidation) or (etat == "baissiere" and prix > invalidation))
    return {"etat": etat, "sommets": sommets, "creux": creux,
            "dernier_sommet": hauts[-1].prix, "dernier_creux": bas[-1].prix,
            "invalidation": invalidation, "rompue": bool(rompue)}


def jambe_active(ps: list[Pivot], high: np.ndarray, low: np.ndarray, atr: float,
                 mini_atr: float) -> Optional[Jambe]:
    """Le dernier mouvement significatif (≥ mini_atr ATR), le candidat en cours
    compris. Causal : tout ce qui est lu est antérieur ou égal à la dernière bougie."""
    if not ps:
        return None
    points = list(ps)
    dernier = ps[-1]
    apres = slice(dernier.i + 1, len(high))
    if dernier.genre == "bas" and len(high[apres]):
        j = dernier.i + 1 + int(np.argmax(high[apres]))
        if high[j] > dernier.prix:
            points.append(Pivot(j, float(high[j]), "haut"))
    elif dernier.genre == "haut" and len(low[apres]):
        j = dernier.i + 1 + int(np.argmin(low[apres]))
        if low[j] < dernier.prix:
            points.append(Pivot(j, float(low[j]), "bas"))
    candidat = len(points) > len(ps)
    for k in range(len(points) - 1, 0, -1):
        a, b = points[k - 1], points[k]
        if a.genre != b.genre and abs(b.prix - a.prix) >= mini_atr * atr:
            return Jambe(a, b, fin_confirmee=not (candidat and k == len(points) - 1))
    return None


def _niveau(ratio_cle: str, px: float, prix: float, atr: float, genre: str, age: int, force: float) -> dict:
    zone = (px - ZONE_DEMI_LARGEUR_ATR * atr, px + ZONE_DEMI_LARGEUR_ATR * atr)
    return {
        "ratio": ratio_cle, "genre": genre, "prix": round(px, 6),
        "zone": [round(zone[0], 6), round(zone[1], 6)],
        "distance_abs": round(prix - px, 6),
        "distance_pct": round((prix - px) / px * 100, 3) if px else None,
        "distance_atr": round((prix - px) / atr, 2),
        "position": "au-dessus" if prix > zone[1] else "en dessous" if prix < zone[0] else "dans la zone",
        "age": age, "force_swing_atr": round(force, 1),
    }


def fibonacci_jambe(jambe: Jambe, prix: float, atr: float, n: int, echelle: str,
                    unite: str, duree_bougies: int) -> dict:
    """Retracements et extensions d'une jambe, orientés selon son sens."""
    a, b = jambe.depart.prix, jambe.fin.prix
    amp = jambe.amplitude
    age = n - 1 - jambe.fin.i
    force = amp / atr
    retrace = ((b - prix) / amp) if jambe.hausse else ((prix - b) / amp)
    # Le prix par rapport à la jambe : il la prolonge, la corrige, ou l'a
    # effacée (revenu au-delà de son départ : la jambe ne décrit plus rien).
    phase = "extension" if retrace < 0 else "correction" if retrace <= 1 else "invalidee"
    niveaux = [_niveau(_cle(r), b - r * (b - a), prix, atr, "retracement", age, force) for r in RETRACEMENTS]
    niveaux += [_niveau(_cle(e), a + e * (b - a), prix, atr, "extension", age, force) for e in EXTENSIONS]
    retr = [x for x in niveaux if x["genre"] == "retracement"]
    proche = min(retr, key=lambda x: abs(x["distance_atr"]))

    # Confiance de la jambe, explicable : chaque raison est dite.
    raisons = []
    points = 0
    if force >= 2 * ECHELLES[echelle][1]:
        points += 1; raisons.append(f"ample ({force:.1f} ATR)")
    if jambe.fin_confirmee:
        points += 1; raisons.append("fin confirmée")
    else:
        raisons.append("fin encore en cours (peut s'étendre)")
    if duree_bougies >= 5:
        points += 1; raisons.append(f"construite sur {duree_bougies} bougies")
    confiance = "haute" if points >= 3 else "moyenne" if points == 2 else "faible"

    return {
        "unite": unite, "echelle": echelle,
        "id": f"{unite}:{echelle}:{jambe.depart.i}-{jambe.fin.i}",
        "sens": "hausse" if jambe.hausse else "baisse",
        "depart": round(a, 6), "fin": round(b, 6), "fin_confirmee": jambe.fin_confirmee,
        "amplitude_atr": round(force, 1), "duree_bougies": duree_bougies,
        "age_bougies": age,
        "phase": phase, "retracement": round(float(retrace), 3),
        "zone_repli": bool(0.382 <= retrace <= 0.618),
        "niveaux": niveaux, "niveau_proche": proche,
        "confiance": confiance, "raisons_confiance": raisons,
        # Au-delà du départ, la jambe est effacée : ses niveaux ne comptent plus.
        "invalidation": round(a, 6),
    }


def analyser_unite(df: pd.DataFrame, atr: float, prix: float, unite: str) -> Optional[dict]:
    """Structure et Fibonacci d'UNE unité de temps. Les unités ne sont jamais
    mélangées : chacune a ses pivots, ses jambes et ses niveaux."""
    if df is None or len(df) < 40 or not atr or atr <= 0:
        return None
    h = df["High"].to_numpy(float); l = df["Low"].to_numpy(float)
    n = len(df)
    sortie: dict = {"unite": unite, "atr": round(atr, 6), "jambes": {}}
    for echelle, (k, mini) in ECHELLES.items():
        ps = pivots(h, l, k=k)
        if echelle == PRIMAIRE:
            sortie["structure"] = lire_structure(ps, prix)
            sortie["n_pivots"] = len(ps)
        j = jambe_active(ps, h, l, atr, mini)
        if j is not None:
            sortie["jambes"][echelle] = fibonacci_jambe(
                j, prix, atr, n, echelle, unite, duree_bougies=j.fin.i - j.depart.i)
    # MARCHÉ BRUITÉ : pas de structure lisible et pas de jambe primaire, ou
    # des jambes mineure et primaire de sens opposés sur une structure en
    # range. Le moteur le dit au lieu de fabriquer un Fibonacci de plus.
    prim = sortie["jambes"].get(PRIMAIRE)
    mineure = sortie["jambes"].get("mineure")
    sortie["bruite"] = bool(prim is None or (
        sortie.get("structure", {}).get("etat") == "range"
        and mineure is not None and mineure["sens"] != prim["sens"]))
    return sortie


def ohlc_superieure(df: pd.DataFrame, timeframe: str) -> tuple[str, pd.DataFrame] | None:
    """Les bougies de l'unité supérieure, tirées de l'historique déjà en main —
    même table que la porte de tendance (HIGHER_TF), aucun second téléchargement."""
    from ._scoring import HIGHER_TF, _HTF_RESAMPLE, resample_ohlcv
    spec = HIGHER_TF.get(timeframe)
    if not spec:
        return None
    regle = _HTF_RESAMPLE.get(spec[0])
    if not regle:
        return None
    import warnings
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)   # « origin » sans effet hors intraday : attendu
            sup = resample_ohlcv(df, regle).dropna(subset=["High", "Low", "Close"])
    except Exception:
        return None
    return (spec[0], sup) if len(sup) >= 40 else None
