"""
Ce qu'on sait, et à quel point — sans jamais trancher entre vrai et faux.

Le cahier des charges est explicite : une information n'est pas un booléen. Le
moteur doit pouvoir dire « je comprends l'événement mais pas son impact », ou
« les sources se contredisent ». Une échelle à deux valeurs force à mentir
dans les deux sens : elle transforme une rumeur en fait, ou écarte une
information solide parce qu'elle n'est pas certifiée.

L'échelle repose sur les VOIX INDÉPENDANTES, jamais sur le nombre d'articles.
C'est la seule façon de ne pas récompenser la viralité : une dépêche reprise
quarante fois reste une dépêche.

Un cran supplémentaire — et un seul — est accordé à la présence d'une source
primaire. Quand l'acteur concerné parle lui-même, on ne dépend plus de
l'interprétation d'un tiers, et c'est le seul saut qualitatif réel de toute
l'échelle.
"""

from .sources import voix_effectives

# Les mots qui signalent que la presse elle-même n'est pas sûre. Leur présence
# empêche de monter au-dessus de « probable », quel que soit le nombre de
# voix : quarante journaux écrivant « selon des sources » ne rendent pas
# l'information certaine, ils rendent la rumeur populaire.
PRUDENCE = (
    "selon des sources", "aurait", "serait", "pourrait", "envisage",
    "envisagerait", "rumeur", "sans confirmation", "non confirmé",
    "reportedly", "allegedly", "sources say", "people familiar",
    "is said to", "may be", "could be", "considering", "weighing",
    "unconfirmed", "speculation",
)

# Ce qui indique une contradiction ouverte entre sources.
DEMENTI = (
    "dément", "démenti", "dementi", "réfute", "refute", "nie ", "conteste",
    "denies", "denied", "rejects", "rejected", "disputes", "no truth",
    "sans fondement", "unfounded", "inexact",
)

NIVEAUX = ("FALSE", "DISPUTED", "UNCERTAIN", "POSSIBLE", "PROBABLE", "CONFIRMED")


def _contient(articles: list[dict], mots) -> bool:
    for a in articles:
        texte = f"{a.get('title', '')} {a.get('summary', '')}".lower()
        if any(m in texte for m in mots):
            return True
    return False


def evaluer(articles: list[dict], analyse: dict) -> dict:
    """Le niveau de certitude FACTUELLE d'un événement.

    Attention : cela ne dit rien de son impact. Un fait parfaitement établi
    peut avoir des conséquences totalement indéterminées, et c'est un cas
    fréquent — le cahier des charges le dit, et les deux incertitudes sont
    donc mesurées séparément (voir impact.py).
    """
    voix = voix_effectives(analyse)
    prudence = _contient(articles, PRUDENCE)
    dementi = _contient(articles, DEMENTI)
    primaire = analyse.get("source_primaire", False)

    # La contradiction prime sur tout le reste : une information démentie par
    # l'un et affirmée par l'autre est contestée, même très reprise.
    if dementi and voix >= 2:
        niveau, base = "DISPUTED", 0.35
    elif voix >= 3:
        niveau, base = "PROBABLE", 0.62
    elif voix >= 2:
        niveau, base = "POSSIBLE", 0.48
    else:
        niveau, base = "UNCERTAIN", 0.30

    raisons: list[str] = []
    n = NIVEAUX.index(niveau)

    if primaire and niveau != "DISPUTED":
        n = min(n + 1, len(NIVEAUX) - 1)
        base += 0.18
        raisons.append("une source primaire est citée")

    if prudence and n > NIVEAUX.index("PROBABLE"):
        # Le plafond du conditionnel : la presse écrit « aurait », on ne peut
        # pas conclure « confirmé » à sa place.
        n = NIVEAUX.index("PROBABLE")
        base -= 0.10
        raisons.append("les sources emploient le conditionnel")
    elif prudence:
        base -= 0.08
        raisons.append("les sources emploient le conditionnel")

    if analyse.get("derive_probable"):
        base -= 0.06
        raisons.append(
            f"les reprises créditent la même agence ({', '.join(analyse.get('agences', [])[:2])})"
        )

    if analyse.get("voix", 0) >= 2:
        raisons.append(f"{analyse['voix']} rédactions distinctes")
    else:
        raisons.append("une seule rédaction")

    if dementi:
        raisons.append("une source dément ou conteste")

    return {
        "niveau": NIVEAUX[n],
        "confiance": round(max(0.05, min(0.95, base)), 2),
        "voix_effectives": round(voix, 2),
        "raisons": raisons,
    }
