"""
Ce que le marché a fait de l'information — §13 du cahier des charges.

C'est la couche la plus falsifiable de tout le moteur, et c'est pour ça
qu'elle compte. Tout le reste — l'indépendance des sources, la solidité d'une
chaîne — repose sur des jugements qu'on peut discuter. Ici on confronte une
hypothèse à un prix : soit le marché a bougé dans le sens attendu, soit non.

L'ÉCART EST L'INFORMATION, pas la réaction elle-même. Trois situations, et
seule la première est banale :

  attendu ≈ observé    le marché a lu l'événement comme nous ;
  attendu >> observé   le marché ne suit pas. Soit il avait déjà intégré
                       l'information, soit notre mécanisme est faux — et
                       distinguer les deux demande la nouveauté (§14) ;
  attendu << observé   le marché en fait plus que nous. Il sait quelque chose
                       que notre chaîne ignore.

LE MOTEUR NE TRANCHE PAS entre « déjà anticipé » et « nous nous trompons ». Il
nomme les deux lectures possibles, avec l'élément qui permet de les
départager. Trancher sans en avoir les moyens serait exactement l'invention
que le §17 interdit.
"""


def _seuil_mouvement(volatilite_jour: float | None) -> float:
    """À partir de quand un mouvement mérite d'être appelé une réaction.

    Un seuil fixe ne peut pas marcher : 2 % sur une action de services aux
    collectivités est un événement, 2 % sur une crypto est un mardi. On se
    cale donc sur la volatilité propre de l'actif quand on la connaît.
    """
    if volatilite_jour and volatilite_jour > 0:
        return max(0.6, volatilite_jour * 0.9)
    return 1.5


def comparer(
    *,
    sens_attendu: int,
    solidite: float,
    variation_pct: float,
    volume_ratio: float | None = None,
    volatilite_jour: float | None = None,
    nouveaute: float = 1.0,
) -> dict:
    """Confronte l'attente issue du mécanisme à ce que le prix a fait.

    `sens_attendu` : +1, -1 ou 0. `solidite` : celle de la chaîne.
    `nouveaute` : 1 = fait du jour, proche de 0 = fait connu depuis longtemps.
    """
    seuil = _seuil_mouvement(volatilite_jour)
    ampleur = abs(variation_pct)
    sens_observe = 1 if variation_pct > 0 else -1 if variation_pct < 0 else 0

    bouge = ampleur >= seuil
    accord = bouge and sens_observe == sens_attendu and sens_attendu != 0
    desaccord = bouge and sens_attendu != 0 and sens_observe == -sens_attendu

    lectures: list[str] = []

    if sens_attendu == 0:
        etat = "sans attente"
        phrase = "Le mécanisme ne donne pas de sens attendu pour cet actif."
    elif accord:
        etat = "confirme"
        phrase = (f"Le marché va dans le sens du mécanisme "
                  f"({variation_pct:+.2f} %, au-delà du seuil de {seuil:.1f} %).")
        if volume_ratio and volume_ratio >= 1.5:
            lectures.append(
                f"le volume est {volume_ratio:.1f} fois la moyenne : le mouvement "
                "est porté par des échanges réels"
            )
        elif volume_ratio and volume_ratio < 0.8:
            lectures.append(
                "le volume reste faible : un mouvement sans échanges se défait "
                "souvent aussi vite"
            )
    elif desaccord:
        etat = "contredit"
        phrase = (f"Le marché va À L'INVERSE du mécanisme "
                  f"({variation_pct:+.2f} %).")
        lectures.append("le mécanisme est peut-être faux pour cet actif")
        lectures.append("ou un autre facteur, plus fort, domine aujourd'hui")
    elif not bouge:
        etat = "sans reaction"
        phrase = (f"Le marché ne réagit pas ({variation_pct:+.2f} %, sous le seuil "
                  f"de {seuil:.1f} %).")
        # C'est ici que la nouveauté départage les deux lectures. Sans elle,
        # on ne pourrait qu'énumérer.
        if nouveaute < 0.35:
            lectures.append(
                "l'information n'est plus neuve : le marché l'avait probablement "
                "déjà intégrée"
            )
        else:
            lectures.append(
                "l'information est récente et le marché ne bouge pas : soit il ne "
                "la juge pas importante, soit le mécanisme ne s'applique pas ici"
            )
        if solidite < 0.15:
            lectures.append(
                "la chaîne de transmission est longue — son absence d'effet "
                "visible n'a rien d'anormal"
            )
    else:
        etat = "indetermine"
        phrase = f"Mouvement de {variation_pct:+.2f} %, sans rapport clair avec le mécanisme."

    # L'écart entre ce qu'on attendait et ce qu'on voit, borné à 1. C'est lui
    # qui mérite l'attention, pas l'ampleur brute.
    #
    # L'observation est SIGNÉE par rapport à l'attente : sans ça, un marché qui
    # monte de 2,4 % quand on attendait une hausse et un marché qui baisse de
    # 2,4 % quand on attendait la même hausse donnaient exactement la même
    # surprise — mesuré, les deux sortaient à 0,58. Aller à l'inverse du
    # mécanisme est pourtant l'événement le plus informatif de tous.
    attendu = solidite * nouveaute
    ampleur_relative = min(1.0, ampleur / max(seuil, 0.1))
    observe = -ampleur_relative if desaccord else ampleur_relative
    surprise = round(min(1.0, abs(observe - attendu)), 3)

    return {
        "etat": etat,
        "phrase": phrase,
        "lectures": lectures,
        "seuil_pct": round(seuil, 2),
        "variation_pct": round(variation_pct, 2),
        "attendu": round(attendu, 3),
        "observe": round(observe, 3),
        "surprise": surprise,
    }
