"""Les figures chartistes : les trouver géométriquement, sans rien leur promettre.

CE MODULE EXISTE PARCE QU'ON A DÉCIDÉ DE MESURER PLUTÔT QUE DE TRANCHER.

Jusqu'ici le projet refusait de dessiner des figures, et le commentaire de
`trendStructure.ts` disait pourquoi : « la littérature qui a tenté de les
tester ne leur trouve pas d'avantage stable une fois les frais déduits ».
C'était une position raisonnable, mais c'était une position d'autorité : on
citait la littérature au lieu de regarder nos propres données.

Ce module fait donc la moitié géométrique du travail — trouver les figures,
exactement, de façon reproductible — et `scripts/mesurer_figures.py` fait
l'autre : compter ce qui s'est réellement passé APRÈS chacune, sur des
milliers de cas, et le comparer au hasard. Ce que l'écran affiche ensuite est
décidé par ce comptage, pas par ce module.

TROIS RÈGLES DE DÉTECTION, et elles évitent les trois façons de se tromper :

  1. aucune figure n'est cherchée dans le futur, et c'est plus subtil qu'il
     n'y paraît. Une figure est complétée par une cassure (`i_fin`), mais les
     pivots qui la dessinent viennent d'un voisinage CENTRÉ : un sommet à
     l'indice i n'est confirmé qu'à i + w. Si la cassure arrive avant, la
     figure n'était pas encore visible au moment où on prétend l'avoir vue.
     Chaque figure porte donc aussi `i_connu` — la première bougie où tout ce
     qui la compose était réellement connu — et c'est CELLE-LÀ que la mesure
     utilise. Sans cette distinction on mesure sa propre prescience, et on
     trouve des figures qui marchent admirablement ;
  2. les tolérances sont EXPLICITES et exprimées en pourcentage du prix, pas
     en points — sinon la même figure se détecte sur une action à 300 € et
     se rate sur une crypto à 0,3 € ;
  3. une figure sans point d'invalidation n'est pas rendue. Une lecture qui
     ne dit pas ce qui l'annule n'est pas une lecture, et c'est la règle que
     le reste du projet applique déjà.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

import numpy as np
import pandas as pd


# ── Les tolérances ──────────────────────────────────────────────────────────
#
# Toutes en fraction du prix. Elles sont posées ici pour qu'une mesure puisse
# les faire varier et voir si le résultat y est sensible — un seuil choisi au
# jugé qu'on ne peut pas bouger est un seuil qu'on ne peut pas vérifier.

TOL_EGALITE = 0.030      # deux sommets « au même niveau » : 3 % d'écart maxi
TOL_EPAULES = 0.050      # les deux épaules d'une ETE, plus permissif
CREUX_MINI = 0.025       # le creux entre deux sommets doit être franc
TETE_MINI = 0.015        # la tête dépasse les épaules d'au moins 1,5 %
# Un côté de triangle est « plat » s'il bouge de moins d'un quart de la
# hauteur initiale du triangle sur toute sa durée. Mesurer la platitude en
# pente PAR BOUGIE — c'était la première version, 0,15 % par bougie — rendait
# le triangle symétrique indétectable : ses deux côtés convergent de 0,1 %
# par bougie, donc tous deux « plats », alors qu'ils se rapprochent de 10 %
# sur la figure. Le test de rappel l'a montré : 0 % de détection.
PLAT_RELATIF = 0.25
IMPULSION_MINI = 0.06    # le mât d'un drapeau : 6 % sur peu de bougies


Sens = Literal["haussier", "baissier"]


@dataclass(frozen=True)
class Pivot:
    i: int
    prix: float
    genre: Literal["haut", "bas"]


def pivots(high: np.ndarray, low: np.ndarray, k: Optional[int] = None) -> list[Pivot]:
    """Les sommets et les creux marquants, à la fractale.

    Un sommet est une bougie dont le plus haut domine ses `k` voisines de
    chaque côté. La même définition que côté interface (`trendStructure.ts`),
    volontairement : deux définitions du mot « sommet » dans un produit, c'est
    deux dessins différents du même graphique.
    """
    n = len(high)
    if n < 12:
        return []
    # LE VOISINAGE EST PLAFONNÉ, et c'est nécessaire.
    #
    # `n / 22` vient de l'affichage, où la série fait 60 à 200 bougies : le
    # voisinage y vaut 3 à 9, ce qui retient la poignée de pivots qu'un œil
    # désignerait. Appliquée telle quelle à dix ans d'historique — 2 500
    # bougies — la même formule donne ±114 bougies de chaque côté : quatre
    # pivots en dix ans, et une mesure qui ne porte sur rien. Mesuré : 69
    # figures sur 31 actifs et 78 000 bougies avant le plafond.
    w = k if k is not None else max(2, min(8, round(n / 22)))
    brut: list[Pivot] = []

    for i in range(w, n - w):
        fenetre = slice(i - w, i + w + 1)
        if high[i] == high[fenetre].max() and (high[fenetre] == high[i]).sum() == 1:
            brut.append(Pivot(i, float(high[i]), "haut"))
        elif low[i] == low[fenetre].min() and (low[fenetre] == low[i]).sum() == 1:
            brut.append(Pivot(i, float(low[i]), "bas"))

    # Deux pivots de même nature qui se suivent : on garde le plus marquant.
    # Sans cela une zone agitée produit trois « sommets » collés qui ne
    # décrivent rien.
    propre: list[Pivot] = []
    for p in brut:
        if propre and propre[-1].genre == p.genre:
            garder = (p.prix > propre[-1].prix) if p.genre == "haut" else (p.prix < propre[-1].prix)
            if garder:
                propre[-1] = p
            continue
        propre.append(p)
    return propre


def _proche(a: float, b: float, tol: float) -> bool:
    ref = max(abs(a), abs(b))
    return ref > 0 and abs(a - b) / ref <= tol


def _pente(xs: list[int], ys: list[float]) -> float:
    """Pente d'une droite des moindres carrés, normalisée par le prix moyen —
    donc comparable d'un actif à l'autre."""
    if len(xs) < 2:
        return 0.0
    p = np.polyfit(np.array(xs, dtype=float), np.array(ys, dtype=float), 1)[0]
    moyen = float(np.mean(ys))
    return float(p / moyen) if moyen else 0.0


def _cassure(close: np.ndarray, high: np.ndarray, low: np.ndarray, depuis: int,
             niveau, invalidation: float, baissier: bool, delai: int) -> Optional[int]:
    """La bougie qui CONFIRME la figure — si elle arrive à temps, et avant que
    la figure ait été annulée.

    La première version cherchait seulement « la première clôture sous la
    ligne de cou », aussi loin qu'il le fallait. Elle trouvait donc des
    doubles sommets dont le prix était monté bien AU-DESSUS des deux sommets
    avant de « casser » cinq mois plus tard : une figure déjà annulée, confirmée
    par une cassure qui n'avait plus rien à voir avec elle. Le graphique les
    dessinait, et la mesure les comptait.

    Deux conditions, donc :
      · l'invalidation n'est pas franchie avant la cassure (sur la mèche, pas
        seulement la clôture : un prix qui a touché le niveau l'a franchi) ;
      · la cassure arrive dans un délai proportionné à la figure elle-même.

    `niveau` peut être une fonction de l'indice — la ligne de cou d'une ETE
    est inclinée.
    """
    lv = niveau if callable(niveau) else (lambda _j: niveau)
    for j in range(depuis + 1, min(len(close), depuis + 1 + delai)):
        if baissier:
            if high[j] > invalidation:
                return None
            if close[j] < lv(j):
                return j
        else:
            if low[j] < invalidation:
                return None
            if close[j] > lv(j):
                return j
    return None


def _dessin(zone, traces, cassure) -> dict:
    """La géométrie à dessiner, décidée ICI, là où la figure est comprise.

    L'interface ne sait pas qu'un triangle a deux côtés ajustés ou qu'une
    ligne de cou d'ETE est inclinée ; si elle devait le reconstruire à partir
    de points en vrac, elle le reconstruirait mal — c'est exactement ce qui
    s'est produit avec le premier tracé des triangles.

      zone      polygone à teinter (la figure elle-même)
      traces    segments nommés : « cou », « cote_haut », « cote_bas »,
                « mat », « borne »
      cassure   la bougie et le cours où la figure s'est confirmée
    """
    return {
        "zone": [{"i": int(i), "prix": round(float(p), 6)} for i, p in zone],
        "traces": [{"role": r, "i1": int(i1), "p1": round(float(p1), 6),
                    "i2": int(i2), "p2": round(float(p2), 6)} for r, i1, p1, i2, p2 in traces],
        "cassure": {"i": int(cassure[0]), "prix": round(float(cassure[1]), 6)},
    }


# ── Les figures ─────────────────────────────────────────────────────────────


def _doubles(ps: list[Pivot], close: np.ndarray, high: np.ndarray, low: np.ndarray,
             w: int) -> list[dict]:
    """Double sommet et double creux.

    Deux extrêmes au même niveau séparés par un retour franc. La figure est
    DATÉE de la cassure du niveau intermédiaire, pas du second sommet : avant
    la cassure il n'y a qu'un dessin, et c'est exactement la nuance que les
    captures d'écran effacent.
    """
    out: list[dict] = []
    for a in range(len(ps) - 2):
        p1, p2, p3 = ps[a], ps[a + 1], ps[a + 2]
        if p1.genre != p3.genre or p1.genre == p2.genre:
            continue
        if not _proche(p1.prix, p3.prix, TOL_EGALITE):
            continue

        amplitude = abs(p1.prix - p2.prix) / max(p1.prix, p2.prix)
        if amplitude < CREUX_MINI:
            continue

        # La cassure doit venir dans un délai de l'ordre de la largeur de la
        # figure : au-delà, ce n'est plus elle qui la produit.
        delai = max(5, p3.i - p1.i)
        if p1.genre == "haut":
            sens: Sens = "baissier"
            objectif = p2.prix - (max(p1.prix, p3.prix) - p2.prix)
            invalidation = max(p1.prix, p3.prix)
            cassure = _cassure(close, high, low, p3.i, p2.prix, invalidation, True, delai)
            cle, nom = "double_sommet", "Double sommet"
        else:
            sens = "haussier"
            objectif = p2.prix + (p2.prix - min(p1.prix, p3.prix))
            invalidation = min(p1.prix, p3.prix)
            cassure = _cassure(close, high, low, p3.i, p2.prix, invalidation, False, delai)
            cle, nom = "double_creux", "Double creux"

        if cassure is None:
            continue
        out.append({
            "cle": cle, "nom": nom, "sens": sens,
            "points": [{"i": p.i, "prix": p.prix} for p in (p1, p2, p3)],
            "ligne": {"i1": p1.i, "p1": p2.prix, "i2": cassure, "p2": p2.prix},
            "dessin": _dessin(
                # La zone suit la COURBE (les clôtures, celles que le graphique
                # trace) entre le premier et le second extrême, puis revient par
                # la ligne de cou. Un polygone joignant seulement les pivots
                # dessinait des « ailerons » qui ne ressemblaient pas au prix.
                zone=[(j, close[j]) for j in range(p1.i, p3.i + 1)]
                     + [(p3.i, p2.prix), (p1.i, p2.prix)],
                traces=[("cou", p1.i, p2.prix, cassure, p2.prix)],
                cassure=(cassure, close[cassure])),
            "i_fin": cassure,
            "i_connu": max(cassure, p3.i + w),
            "objectif": round(float(objectif), 6),
            "invalidation": round(float(invalidation), 6),
        })
    return out


def _tetes_epaules(ps: list[Pivot], close: np.ndarray, high: np.ndarray, low: np.ndarray,
                   w: int) -> list[dict]:
    """Épaule-tête-épaule, et son inverse.

    Cinq pivots alternés : épaule, creux, tête, creux, épaule. La ligne de cou
    joint les deux creux et peut être inclinée — c'est le cas général, et le
    forcer à l'horizontale est la simplification qui fait rater la moitié des
    cas réels.
    """
    out: list[dict] = []
    for a in range(len(ps) - 4):
        e1, c1, tete, c2, e2 = ps[a:a + 5]
        if e1.genre != tete.genre or e1.genre != e2.genre or c1.genre == e1.genre:
            continue
        if not _proche(e1.prix, e2.prix, TOL_EPAULES):
            continue

        haut = e1.genre == "haut"
        if haut:
            if not (tete.prix > e1.prix * (1 + TETE_MINI) and tete.prix > e2.prix * (1 + TETE_MINI)):
                continue
        else:
            if not (tete.prix < e1.prix * (1 - TETE_MINI) and tete.prix < e2.prix * (1 - TETE_MINI)):
                continue

        # La ligne de cou, prolongée jusqu'à la bougie testée.
        pente = (c2.prix - c1.prix) / max(1, (c2.i - c1.i))
        cou = lambda j: c1.prix + pente * (j - c1.i)  # noqa: E731

        # Invalidée si le prix repasse la tête avant de casser le cou ; délai
        # de l'ordre d'une épaule à l'autre.
        cassure = _cassure(close, high, low, e2.i, cou, tete.prix, haut, max(5, e2.i - e1.i))
        if cassure is None:
            continue

        hauteur = abs(tete.prix - cou(tete.i))
        niveau = cou(cassure)
        out.append({
            "cle": "ete" if haut else "ete_inversee",
            "nom": "Épaule-tête-épaule" if haut else "Épaule-tête-épaule inversée",
            "sens": "baissier" if haut else "haussier",
            "points": [{"i": p.i, "prix": p.prix} for p in (e1, c1, tete, c2, e2)],
            "ligne": {"i1": c1.i, "p1": c1.prix, "i2": cassure, "p2": float(niveau)},
            "dessin": _dessin(
                zone=[(j, close[j]) for j in range(e1.i, e2.i + 1)]
                     + [(e2.i, cou(e2.i)), (e1.i, cou(e1.i))],
                traces=[("cou", e1.i, cou(e1.i), cassure, cou(cassure))],
                cassure=(cassure, close[cassure])),
            "i_fin": cassure,
            "i_connu": max(cassure, e2.i + w),
            "objectif": round(float(niveau - hauteur if haut else niveau + hauteur), 6),
            "invalidation": round(float(tete.prix), 6),
        })
    return out


def _triangles(ps: list[Pivot], close: np.ndarray, high: np.ndarray,
               low: np.ndarray, w: int) -> list[dict]:
    """Triangles : ascendant, descendant, symétrique.

    Deux droites qui se rapprochent, ajustées aux moindres carrés sur les
    trois derniers sommets et les trois derniers creux. La figure est datée de
    la sortie du triangle — un triangle non sorti n'annonce rien, il décrit
    seulement une compression.
    """
    out: list[dict] = []
    hauts = [p for p in ps if p.genre == "haut"]
    bas = [p for p in ps if p.genre == "bas"]
    if len(hauts) < 3 or len(bas) < 3:
        return out

    for fin in range(2, min(len(hauts), len(bas))):
        hs = hauts[fin - 2:fin + 1]
        ls = bas[fin - 2:fin + 1]
        debut = min(hs[0].i, ls[0].i)
        dernier = max(hs[-1].i, ls[-1].i)
        if dernier - debut < 10:
            continue

        # Convergence : l'écart entre les deux côtés doit se resserrer.
        ecart_debut = hs[0].prix - ls[0].prix
        ecart_fin = hs[-1].prix - ls[-1].prix
        if ecart_debut <= 0 or ecart_fin <= 0 or ecart_fin >= ecart_debut * 0.85:
            continue

        # Le déplacement de chaque côté sur TOUTE la durée de la figure, en
        # prix, rapporté à la hauteur de départ. C'est une mesure sans unité
        # de temps : le même triangle se classe pareil en 15 minutes et en
        # journalier.
        duree = dernier - debut
        dh = np.polyfit([p.i for p in hs], [p.prix for p in hs], 1)[0] * duree / ecart_debut
        dl = np.polyfit([p.i for p in ls], [p.prix for p in ls], 1)[0] * duree / ecart_debut
        plat_h, plat_l = abs(dh) < PLAT_RELATIF, abs(dl) < PLAT_RELATIF

        if plat_h and dl >= PLAT_RELATIF:
            cle, nom, sens = "triangle_ascendant", "Triangle ascendant", "haussier"
        elif plat_l and dh <= -PLAT_RELATIF:
            cle, nom, sens = "triangle_descendant", "Triangle descendant", "baissier"
        elif dh <= -PLAT_RELATIF and dl >= PLAT_RELATIF:
            cle, nom, sens = "triangle_symetrique", "Triangle symétrique", None
        else:
            continue

        resistance = max(p.prix for p in hs)
        support = min(p.prix for p in ls)
        sortie, direction = None, None
        # La sortie doit venir avant que les côtés se rejoignent : un
        # triangle dont le prix sort des mois plus tard n'est plus un triangle.
        for j in range(dernier + 1, min(len(close), dernier + 1 + max(5, dernier - debut))):
            if close[j] > resistance:
                sortie, direction = j, "haussier"
                break
            if close[j] < support:
                sortie, direction = j, "baissier"
                break
        if sortie is None:
            continue

        # Un triangle symétrique ne dit rien avant sa sortie : c'est la sortie
        # qui donne le sens, et c'est pour ça qu'on ne le date pas avant.
        sens_final = sens or direction
        hauteur = ecart_debut

        # Les deux côtés, tels qu'ajustés, prolongés jusqu'à la sortie. La
        # première version renvoyait comme « ligne » une diagonale du support
        # du début à la résistance de la sortie : un trait qui ne correspondait
        # à aucun côté, et qui partait en travers du graphique.
        ah, bh = np.polyfit([p.i for p in hs], [p.prix for p in hs], 1)
        al, bl = np.polyfit([p.i for p in ls], [p.prix for p in ls], 1)
        haut_ = lambda j: float(ah * j + bh)  # noqa: E731
        bas_ = lambda j: float(al * j + bl)  # noqa: E731
        cote = haut_ if direction == "haussier" else bas_
        out.append({
            "cle": cle, "nom": nom, "sens": sens_final,
            "points": [{"i": p.i, "prix": p.prix} for p in sorted(hs + ls, key=lambda x: x.i)],
            "ligne": {"i1": debut, "p1": cote(debut), "i2": sortie, "p2": cote(sortie)},
            "dessin": _dessin(
                zone=[(debut, haut_(debut)), (dernier, haut_(dernier)),
                      (dernier, bas_(dernier)), (debut, bas_(debut))],
                traces=[("cote_haut", debut, haut_(debut), sortie, haut_(sortie)),
                        ("cote_bas", debut, bas_(debut), sortie, bas_(sortie))],
                cassure=(sortie, close[sortie])),
            "i_fin": sortie,
            "i_connu": max(sortie, dernier + w),
            "objectif": round(float(close[sortie] + hauteur if sens_final == "haussier"
                                    else close[sortie] - hauteur), 6),
            "invalidation": round(float(support if sens_final == "haussier" else resistance), 6),
            "sortie_conforme": sens is None or direction == sens,
        })
    return out


def _drapeaux(close: np.ndarray, high: np.ndarray, low: np.ndarray,
              mat: int = 8, repos: int = 10) -> list[dict]:
    """Drapeaux : une impulsion franche, puis une pause étroite.

    Pas de pivots ici — un drapeau se définit par des PROPORTIONS : un mât
    d'au moins `IMPULSION_MINI`, puis une consolidation dont l'amplitude ne
    dépasse pas le tiers du mât et qui dérive contre l'impulsion.
    """
    out: list[dict] = []
    n = len(close)
    for i in range(mat, n - repos - 1):
        depart, sommet = close[i - mat], close[i]
        if depart <= 0:
            continue
        variation = (sommet - depart) / depart
        if abs(variation) < IMPULSION_MINI:
            continue

        # La pause se mesure sur les CLÔTURES, pas sur les mèches. Les mèches
        # sont la partie la plus bruitée d'une bougie : mesurée sur elles, une
        # pause parfaitement nette dépassait le tiers du mât dès 1,5 % de
        # bruit, et le test de rappel tombait à 0 %.
        zone = slice(i, i + repos + 1)
        haut_zone, bas_zone = float(close[zone].max()), float(close[zone].min())
        amplitude_mat = abs(sommet - depart)
        if (haut_zone - bas_zone) > amplitude_mat / 3:
            continue

        haussier = variation > 0
        # La sortie du drapeau, dans le sens du mât.
        # La sortie dans le sens du mât, AVANT une sortie par l'autre côté de
        # la pause, et sans traîner : un drapeau est une pause, pas un range.
        # Sur les CLÔTURES, comme la pause elle-même : jugée sur les mèches,
        # la moindre mèche sous une pause mesurée en clôtures l'annulerait.
        sortie = _cassure(close, close, close, i + repos - 1,
                          haut_zone if haussier else bas_zone,
                          bas_zone if haussier else haut_zone,
                          not haussier, repos * 2)
        if sortie is None:
            continue

        out.append({
            "cle": "drapeau_haussier" if haussier else "drapeau_baissier",
            "nom": "Drapeau haussier" if haussier else "Drapeau baissier",
            "sens": "haussier" if haussier else "baissier",
            "points": [
                {"i": i - mat, "prix": float(depart)},
                {"i": i, "prix": float(sommet)},
                {"i": i + repos, "prix": float(close[i + repos])},
            ],
            "ligne": {"i1": i, "p1": haut_zone if haussier else bas_zone,
                      "i2": sortie, "p2": haut_zone if haussier else bas_zone},
            "dessin": _dessin(
                zone=[(i, haut_zone), (i + repos, haut_zone), (i + repos, bas_zone), (i, bas_zone)],
                traces=[("mat", i - mat, depart, i, sommet),
                        ("borne", i, haut_zone if haussier else bas_zone,
                         sortie, haut_zone if haussier else bas_zone)],
                cassure=(sortie, close[sortie])),
            "i_fin": sortie,
            # Un drapeau ne se lit sur aucun pivot : il est connu dès la sortie.
            "i_connu": sortie,
            "objectif": round(float(close[sortie] + amplitude_mat if haussier
                                    else close[sortie] - amplitude_mat), 6),
            "invalidation": round(float(bas_zone if haussier else haut_zone), 6),
        })
    return out


def detecter(df: pd.DataFrame, k: Optional[int] = None) -> list[dict]:
    """Toutes les figures d'une série, datées de leur bougie d'achèvement.

    Rendues triées par date d'achèvement. L'appelant décide de ce qu'il garde
    — l'écran ne montre que les plus récentes, la mesure les prend toutes.
    """
    if df is None or len(df) < 30:
        return []
    high = df["High"].to_numpy(dtype=float)
    low = df["Low"].to_numpy(dtype=float)
    close = df["Close"].to_numpy(dtype=float)

    w = k if k is not None else max(2, min(8, round(len(close) / 22)))
    ps = pivots(high, low, w)
    figures = (_doubles(ps, close, high, low, w) + _tetes_epaules(ps, close, high, low, w)
               + _triangles(ps, close, high, low, w) + _drapeaux(close, high, low))

    # Deux figures achevées sur la même bougie avec le même sens sont la même
    # lecture comptée deux fois ; on garde la plus spécifique (celle qui a le
    # plus de points).
    figures.sort(key=lambda f: (f["i_connu"], -len(f["points"])))
    vues: set[tuple] = set()
    uniques = []
    for f in figures:
        cle = (f["i_connu"], f["sens"])
        if cle in vues:
            continue
        vues.add(cle)
        uniques.append(f)
    return uniques


# ═══════════════════════════════════════════════════════════════════════════
#  CE QUE CES FIGURES ONT RÉELLEMENT DONNÉ
# ═══════════════════════════════════════════════════════════════════════════
#
# Produit par `scripts/mesurer_figures.py` : 31 actifs — actions US et
# européennes, indices, ETF, matières premières, devises, crypto — dix ans de
# bougies journalières (80 326 bougies), 1 527 figures.
# Détecteur validé par `scripts/valider_figures.py` : chaque figure dessinée
# volontairement est retrouvée (80 à 100 % même sous fort bruit), et sur une
# marche aléatoire les figures « réussissent » 50,4 % du temps — le hasard
# exact, donc la détection ne regarde pas l'avenir.
#
# LA RÉPONSE : AUCUNE FIGURE NE BAT LE HASARD DE FAÇON STABLE.
#
# Le critère est exigeant, et il doit l'être : l'écart au hasard doit dépasser
# deux erreurs-types sur CHACUNE des deux moitiés de l'historique. Une
# première mesure, sur une seule période et avec un détecteur de triangles
# défectueux, donnait le triangle ascendant gagnant de 8,9 points. Corrigé et
# recoupé, il fait −2,9 sur la première moitié et +12,8 sur la seconde : ce
# n'était pas un signal, c'était du bruit tombé du bon côté. C'est exactement
# le mécanisme qui fabrique les « astuces » qui circulent.
#
# Deux autres faits, tout aussi parlants :
#   · une marche aléatoire dessine AU MOINS AUTANT de figures que les vrais
#     marchés (environ 20 contre 19 pour 1 000 bougies) : les formes existent,
#     mais le hasard les produit tout seul ;
#   · l'objectif théorique d'une figure est rarement atteint avant son propre
#     point d'invalidation.
#
# LIMITES : dix ans très haussiers ; journalier uniquement ; frais non déduits.

BASE_HAUSSE_20 = 58.8   # part des cas où le prix monte à 20 séances, panel entier
ECHANTILLON_MINI = 100  # en dessous, on ne conclut pas
MESURE = {"actifs": 31, "bougies": 80326, "figures": 1527}

STATISTIQUES: dict[str, dict] = {
    "double_sommet": {"n": 362, "sens_20": 40.9, "ecart": -0.3, "erreur_type": 2.6,
        "ecart_A": -1.2, "ecart_B": 0.7, "moy_20": -0.28, "objectif": 39.8, "invalide": 29.6, "verdict": "neutre"},
    "double_creux": {"n": 398, "sens_20": 54.8, "ecart": -4.0, "erreur_type": 2.5,
        "ecart_A": -1.0, "ecart_B": -7.3, "moy_20": 0.55, "objectif": 40.7, "invalide": 22.6, "verdict": "neutre"},
    "ete": {"n": 91, "sens_20": 44.0, "ecart": 2.8, "erreur_type": 5.2,
        "ecart_A": 7.1, "ecart_B": -1.4, "moy_20": -0.92, "objectif": 25.3, "invalide": 28.6, "verdict": "trop_peu"},
    "ete_inversee": {"n": 131, "sens_20": 58.0, "ecart": -0.8, "erreur_type": 4.3,
        "ecart_A": 1.8, "ecart_B": -1.8, "moy_20": 1.09, "objectif": 26.0, "invalide": 19.1, "verdict": "neutre"},
    "triangle_ascendant": {"n": 143, "sens_20": 63.6, "ecart": 4.8, "erreur_type": 4.1,
        "ecart_A": -2.9, "ecart_B": 12.8, "moy_20": 1.9, "objectif": 14.7, "invalide": 21.7, "verdict": "neutre"},
    "triangle_descendant": {"n": 117, "sens_20": 47.9, "ecart": 6.7, "erreur_type": 4.6,
        "ecart_A": 13.0, "ecart_B": 1.7, "moy_20": -1.68, "objectif": 7.7, "invalide": 45.3, "verdict": "neutre"},
    "triangle_symetrique": {"n": 42, "sens_20": 52.4, "ecart": -6.4, "erreur_type": 7.6,
        "ecart_A": -16.8, "ecart_B": 3.4, "moy_20": 1.89, "objectif": 14.3, "invalide": 2.4, "verdict": "trop_peu"},
    "drapeau_haussier": {"n": 175, "sens_20": 62.3, "ecart": 3.5, "erreur_type": 3.7,
        "ecart_A": 1.1, "ecart_B": 5.9, "moy_20": 2.25, "objectif": 26.3, "invalide": 54.3, "verdict": "neutre"},
    "drapeau_baissier": {"n": 68, "sens_20": 42.6, "ecart": 1.5, "erreur_type": 6.0,
        "ecart_A": -9.6, "ecart_B": 8.2, "moy_20": 0.02, "objectif": 16.2, "invalide": 73.5, "verdict": "trop_peu"},
}


def _fr(x: float, d: int = 1) -> str:
    return f"{x:.{d}f}".replace(".", ",").replace("-", "−")


def _fr_signe(x: float) -> str:
    """Un écart s'écrit avec son signe : « 12,2 » à côté de « −4,1 » se lit
    comme une valeur et une différence, pas comme deux différences."""
    return ("+" if x > 0 else "") + _fr(x)


def verdict(cle: str, sens: str) -> dict:
    """Ce que cette figure a donné, dit sans l'enjoliver ni le noircir.

    La phrase porte toujours le nombre de cas, le taux, le repère du hasard et
    la marge d'erreur : un taux sans son repère est un chiffre décoratif, et
    un écart sans sa marge d'erreur ne permet pas de savoir s'il existe.
    """
    st = STATISTIQUES.get(cle)
    if not st:
        return {"ton": "inconnu", "phrase": "Figure non mesurée.", "n": 0}

    repere = BASE_HAUSSE_20 if sens == "haussier" else round(100 - BASE_HAUSSE_20, 1)
    fin = (
        f" Son objectif théorique n'a été atteint avant son propre point d'invalidation "
        f"que dans {_fr(st['objectif'])} % des cas ({_fr(st['invalide'])} % d'invalidations d'abord)."
    )

    if st["verdict"] == "trop_peu":
        return {
            "ton": "inconnu", "n": st["n"], "ecart": st["ecart"],
            "phrase": (f"Trop peu de cas pour conclure : {st['n']} seulement sur dix ans et "
                       f"{MESURE['actifs']} actifs. Ce qui est affiché est la forme, pas une prévision."),
        }

    corps = (
        f"Sur {st['n']} cas mesurés, le prix est allé dans le sens annoncé "
        f"{_fr(st['sens_20'])} % du temps à 20 séances, contre {_fr(repere)} % par simple "
        f"tendance du marché — un écart de {_fr_signe(st['ecart'])} point(s), avec une marge d'erreur "
        f"de ±{_fr(2 * st['erreur_type'])}. Sur deux périodes séparées, l'écart vaut "
        f"{_fr_signe(st['ecart_A'])} puis {_fr_signe(st['ecart_B'])} point(s)."
    )
    if st["verdict"] == "favorable":
        ton, tete = "favorable", "Fait mieux que le hasard, de façon stable."
    elif st["verdict"] == "defavorable":
        ton, tete = "defavorable", "Fait moins bien que le hasard, de façon stable."
    else:
        ton, tete = "neutre", "Ne se distingue pas du hasard."
    return {"ton": ton, "n": st["n"], "ecart": st["ecart"], "phrase": f"{tete} {corps}{fin}"}


# ═══════════════════════════════════════════════════════════════════════════
#  LES FIGURES DANS LE SCORE : UN POIDS DÉCIDÉ PAR LA MESURE
# ═══════════════════════════════════════════════════════════════════════════
#
# Le moteur connaît les figures ; la question est de savoir combien elles
# doivent peser. La réponse n'est pas choisie ici, elle est LUE dans
# STATISTIQUES :
#
#   · une figure dont le verdict n'est pas « favorable » pèse zéro. C'est le
#     cas de toutes aujourd'hui. Les ajouter quand même au score, ce serait
#     ajouter un signal que la mesure dit aléatoire : le verdict bougerait
#     davantage sans être plus juste — moins précis, donc, pas plus ;
#   · une figure « favorable » — écart au hasard de plus de deux erreurs-types
#     sur les DEUX moitiés de l'historique — pèse en proportion de la plus
#     prudente des deux périodes, avec un plafond. Si la mesure est relancée
#     un jour et qu'une figure passe ce test, elle entre dans le calcul toute
#     seule, sans qu'une ligne de code change ;
#   · une figure « défavorable » pèse zéro aussi. Parier CONTRE une figure
#     parce qu'elle fait moins bien que le hasard, c'est construire une règle
#     sur l'échec d'une autre, et le moindre changement de période la
#     retourne. On ne l'a pas mesuré, donc on ne le fait pas.
#
# CONDITIONS POUR QU'UNE FIGURE COMPTE, et chacune reprend une condition de la
# mesure — sinon on appliquerait un chiffre hors du cadre où il a été établi :
#   · bougies journalières uniquement ;
#   · figure devenue visible dans les 20 dernières séances (l'horizon mesuré) ;
#   · point d'invalidation pas encore franchi.

POIDS_PAR_POINT = 0.5   # 1 point de score pour 2 points d'écart au hasard prouvé
POIDS_MAXI = 8.0        # une figure ne peut pas, seule, faire basculer un verdict
FRAICHEUR = 20          # séances — l'horizon de la mesure


def poids_mesure(cle: str) -> float:
    """Points de score qu'une figure a gagnés par la mesure. Zéro par défaut."""
    st = STATISTIQUES.get(cle)
    if not st or st.get("verdict") != "favorable":
        return 0.0
    a, b = st.get("ecart_A"), st.get("ecart_B")
    if a is None or b is None:
        return 0.0
    return round(min(POIDS_MAXI, max(0.0, min(a, b)) * POIDS_PAR_POINT), 1)


def figures_actives() -> bool:
    """Au moins une figure a-t-elle gagné un poids par la mesure ?

    Le scanner n'affiche pas les figures, il n'en utilise que le poids. Tant
    qu'aucune n'en a, les chercher lui coûte ~2 ms par actif — une seconde
    sur un scan de 500 — pour un score strictement identique. Il saute donc
    l'étape, et la reprend tout seul le jour où la mesure en justifie une.
    """
    return any(poids_mesure(c) > 0 for c in STATISTIQUES)


def _age(i: int, n: int) -> str:
    j = n - 1 - i
    return "aujourd'hui" if j <= 0 else ("hier" if j == 1 else f"il y a {j} séances")


def appliquer_figures(score: float, df: pd.DataFrame, timeframe: str,
                      prix: float) -> tuple[float, list[str], list[str], list[dict]]:
    """La porte des figures, sur le modèle des portes d'unité supérieure et de
    contexte : (score, notes haussières, notes baissières, bloc descriptif).

    Le bloc est rendu même quand le poids est nul : l'analyse doit pouvoir
    dire « j'ai vu un double sommet, et voici pourquoi il ne compte pas ».
    Se taire ferait croire que le moteur ne l'a pas vu.
    """
    try:
        figures = detecter(df)
    except Exception:
        return score, [], [], []
    n = len(df)
    hausse, baisse, bloc = [], [], []

    recentes = [f for f in figures if f["i_connu"] >= n - FRAICHEUR]
    types = set()
    for f in sorted(recentes, key=lambda x: -x["i_connu"]):
        if f["cle"] in types:
            continue
        types.add(f["cle"])

        inv = f.get("invalidation")
        invalidee = inv is not None and (
            (f["sens"] == "haussier" and prix <= inv) or (f["sens"] == "baissier" and prix >= inv))

        if timeframe != "1d":
            poids, raison = 0.0, "non_mesuree"
        elif invalidee:
            poids, raison = 0.0, "invalidee"
        else:
            poids = poids_mesure(f["cle"])
            st = STATISTIQUES.get(f["cle"], {})
            raison = "mesuree" if poids > 0 else (
                "trop_peu" if st.get("verdict") == "trop_peu" else "pas_mieux_que_le_hasard")

        if poids > 0:
            if f["sens"] == "haussier":
                score = min(100.0, score + poids)
                hausse.append(f"{f['nom']} ({_age(f['i_connu'], n)}) — avantage mesuré, +{poids:g} pts")
            else:
                score = max(0.0, score - poids)
                baisse.append(f"{f['nom']} ({_age(f['i_connu'], n)}) — avantage mesuré, −{poids:g} pts")

        bloc.append({
            "cle": f["cle"], "nom": f["nom"], "sens": f["sens"],
            "age": _age(f["i_connu"], n), "poids": poids, "raison": raison,
            "invalidation": inv, "objectif": f.get("objectif"),
            "n_mesure": STATISTIQUES.get(f["cle"], {}).get("n"),
        })
    return score, hausse, baisse, bloc
