"""Ce qui arrive, en vrai, aux achats que le moteur propose.

Un score de 68 ne dit pas combien de fois l'objectif est atteint. Cette table
le dit, pour les horizons où le moteur propose des positions, mesurée avec le
PLAN DE L'ÉCRAN (portes, stop, objectif, R/R ≥ 1,2 jusqu'au premier obstacle,
durée de détention du profil), frais compris, sur 40 actifs.

Mesuré en septembre 2026, trois périodes successives (40 / 30 / 30 %) :

  journalier, score ≥ 60 (1 017 achats, 39 actifs)
      objectif 22 / 29 / 23 %   stop 48 / 60 / 42 %   le reste à l'échéance
      (20 séances), dont 82 % en gain ; +0,44 R par trade en moyenne.
  journalier, score 55–59 (profils agressifs, 1 738 achats)
      objectif 17 / 24 / 19 %   stop 54 / 53 / 47 % ; +0,30 R.
  3 jours, score ≥ 60 (150 achats)
      objectif 51 / 47 / 56 %   stop 37 / 43 / 25 % ; +1,25 R.
  hebdomadaire : 135 achats sur 15 actifs, presque tous sur une seule
      période — trop peu pour afficher un chiffre.

LE SCORE NE CHANGE PRESQUE RIEN À CES PROPORTIONS (en journalier, 17 à 29 %
d'objectifs atteints selon la tranche et la période, sans ordre stable) :
une probabilité « par score » serait une précision inventée. Une seule
proportion par horizon, donc, et arrondie « sur 10 ».

Ce que la table apprend à l'utilisateur est capital : LE STOP SERA SOUVENT
TOUCHÉ, et c'est normal. Le moteur gagne parce qu'il vise trois fois ce
qu'il risque, et que les positions sorties à l'échéance le sont le plus
souvent en gain — pas parce qu'il a souvent raison.
"""
from __future__ import annotations

# horizon : (clé, étiquette de l'horizon)
CALIBRAGE: dict[str, dict] = {
    "1d": {"objectif": 0.23, "stop": 0.48, "echeance": 0.29, "echeance_en_gain": 0.82,
           "duree_objectif_seances": 10, "echeance_seances": 20, "r_moyen": 0.44,
           "n": 1017, "actifs": 39, "libelle": "journalier"},
    "1d_agressif": {"objectif": 0.19, "stop": 0.51, "echeance": 0.29, "echeance_en_gain": 0.83,
                    "duree_objectif_seances": 11, "echeance_seances": 20, "r_moyen": 0.30,
                    "n": 1738, "actifs": 39, "libelle": "journalier, score 55 à 59"},
    "3d": {"objectif": 0.50, "stop": 0.37, "echeance": 0.13, "echeance_en_gain": 0.79,
           "duree_objectif_seances": 33, "echeance_seances": 60, "r_moyen": 1.25,
           "n": 150, "actifs": 18, "libelle": "3 jours"},
}


def sur_dix(p_obj: float, p_stop: float) -> dict:
    """Les proportions ramenées à dix achats, en entiers qui font bien dix."""
    obj = round(p_obj * 10)
    stop = round(p_stop * 10)
    stop = min(stop, 10 - obj)
    return {"objectif": obj, "stop": stop, "echeance": 10 - obj - stop}


def probabilites(timeframe: str | None, score: float, seuil_abaisse: bool = False) -> dict | None:
    """La table pour cet horizon (et ce seuil), ou None si rien n'est mesuré."""
    tf = timeframe or "1d"
    cle = "1d_agressif" if (tf == "1d" and seuil_abaisse) else tf
    c = CALIBRAGE.get(cle)
    if not c:
        return None
    return {**c, "sur_dix": sur_dix(c["objectif"], c["stop"])}
