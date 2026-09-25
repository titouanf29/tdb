"""Les turbos : le levier tel qu'on l'achète chez Trade Republic, Boursorama…

DEUX FAÇONS D'AVOIR DU LEVIER, et elles ne se manipulent pas pareil.

  · Le CFD (IG, eToro…) : on engage un MONTANT, on choisit un levier, et
    l'exposition vaut montant × levier. C'est ce que le simulateur faisait.

  · Le turbo — ou certificat à barrière désactivante — (Trade Republic,
    Boursorama, Degiro…) : on achète un NOMBRE ENTIER DE TITRES d'un produit
    émis par une banque. Chaque titre coûte quelques centimes ou quelques
    euros, et le levier est INCLUS dans le produit : il vient de son
    « prix d'exercice », qui est aussi sa barrière. Si le cours du sous-jacent
    touche la barrière, le produit est désactivé et ne vaut plus rien.

LE CALCUL, pour un turbo classique (barrière = prix d'exercice) :

  valeur d'un titre   = (cours − exercice) × parité      [turbo long]
                      = (exercice − cours) × parité      [turbo short]
  levier              = cours ÷ |cours − exercice|
  désactivation       = le cours touche l'exercice

Choisir un levier ×10, c'est donc choisir un exercice à 10 % du cours. La
PARITÉ (1, 0,1, 0,01…) ne change rien au risque : elle ramène le prix d'un
titre dans une zone manipulable, comme le font les émetteurs.

SIMPLIFICATIONS ASSUMÉES, parce qu'un simulateur doit rester lisible :
  · pas de frais de financement (un turbo « infini » en a, faibles) ;
  · un écart achat / vente d'un « tick » (1 centime, ou 0,1 centime sous
    1 €), payé à l'achat ;
  · pas de conversion de devise : le simulateur compte tout dans une seule
    monnaie, comme le reste du Wallet.
"""
from __future__ import annotations

import math

PARITES = (1.0, 0.1, 0.01, 0.001, 0.0001)
PRIX_TITRE_MAXI = 25.0      # au-delà, l'émetteur aurait choisi une parité plus petite
LEVIER_MINI, LEVIER_MAXI = 1.5, 50.0


def _tick(prix: float) -> float:
    return 0.001 if prix < 1 else 0.01


def conditions(cours: float, direction: str, levier: float) -> dict:
    """Le turbo qu'un émetteur proposerait pour ce levier, à ce cours."""
    if cours is None or cours <= 0:
        raise ValueError("cours invalide")
    lev = max(LEVIER_MINI, min(LEVIER_MAXI, float(levier)))
    long = (direction or "LONG").upper() == "LONG"
    ecart_cours = cours / lev
    exercice = cours - ecart_cours if long else cours + ecart_cours

    parite = PARITES[-1]
    for p in PARITES:
        if ecart_cours * p <= PRIX_TITRE_MAXI:
            parite = p
            break

    juste = ecart_cours * parite
    tick = _tick(juste)
    # Prix d'achat : la valeur juste plus un tick, arrondi au tick supérieur.
    achat = math.ceil((juste + tick) / tick - 1e-9) * tick
    decimales = 3 if tick < 0.01 else 2
    return {
        "direction": "LONG" if long else "SHORT",
        "levier": round(lev, 2),
        "exercice": round(exercice, 6),
        "barriere": round(exercice, 6),
        "parite": parite,
        "prix_juste": round(juste, 6),
        "prix_titre": round(achat, decimales),
        "ecart_titre": round(achat - juste, 6),
        "mouvement_desactivation_pct": round(100 / lev, 2),
    }


def titres_pour(montant: float, prix_titre: float) -> int:
    """Combien de titres entiers pour un montant donné. Jamais plus que le montant."""
    if not prix_titre or prix_titre <= 0 or not montant or montant <= 0:
        return 0
    return int(math.floor(montant / prix_titre + 1e-9))


def prix_titre_fr(v) -> str:
    """Le prix d'un titre en euros, avec le millième sous 1 € (0,045 €)."""
    try:
        v = float(v)
    except (TypeError, ValueError):
        return "—"
    d = 3 if abs(v) < 1 else 2
    return f"{v:,.{d}f} €".replace(",", " ").replace(".", ",")
