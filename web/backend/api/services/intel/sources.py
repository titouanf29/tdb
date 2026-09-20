"""
Combien de sources INDÉPENDANTES, et pas combien d'articles.

C'est le piège central que décrit le cahier des charges, et il est très
concret ici. Nos huit flux se réduisent à six éditeurs : BBC Business et BBC
World sont la même rédaction, Le Monde Économie et Le Monde International
aussi. Compter « 4 sources » quand la même salle de rédaction a publié deux
fois est déjà une erreur de facteur deux — et elle se produit tous les jours,
puisque ces flux se recoupent massivement.

Le second niveau est plus subtil : six éditeurs différents qui reprennent
tous la même dépêche Reuters ne sont pas six sources. Ce sont six diffusions
d'UNE source. On ne peut pas reconstruire la chaîne complète de propagation
avec des flux RSS — ils ne la portent pas — mais on peut détecter l'attribution
quand elle est écrite, et c'est le cas le plus fréquent.

Ce qu'on rend donc n'est PAS « la source originelle » : c'est le nombre de
voix réellement distinctes, et l'aveu qu'elles peuvent toutes descendre de la
même. La différence est essentielle pour ne pas transformer une reprise en
confirmation.
"""

import re

# ── Les éditeurs ─────────────────────────────────────────────────────────────
#
# Deux flux d'une même maison comptent pour une voix. La table est écrite à la
# main et doit le rester : deviner l'éditeur depuis le nom du flux marcherait
# jusqu'au jour où deux marques du même groupe portent des noms sans rapport.
EDITEUR: dict[str, str] = {
    "BBC Business": "bbc",
    "BBC World": "bbc",
    "MarketWatch": "dowjones",
    "CNBC Markets": "nbcuniversal",
    "NYT Business": "nyt",
    "FXStreet": "fxstreet",
    "Le Monde Économie": "lemonde",
    "Le Monde International": "lemonde",
}

# Les agences de presse. Quand plusieurs éditeurs les citent, ils ne se
# confirment pas l'un l'autre : ils relaient la même dépêche.
AGENCES = (
    "reuters", "associated press", "(ap)", "afp", "bloomberg", "dow jones",
    "agence france-presse", "press association", "efe", "dpa", "ansa", "kyodo",
    "xinhua", "tass", "interfax",
)

# Ce qui ressemble à une source PRIMAIRE : l'acteur parle lui-même, au lieu
# qu'on rapporte ses propos. C'est la seule chose qui fasse vraiment monter la
# certitude d'un cran.
PRIMAIRES = (
    "communiqué", "press release", "statement", "déclaration officielle",
    "official statement", "annonce officielle", "a annoncé", "announced that",
    "selon un communiqué", "in a filing", "sec filing", "8-k", "10-q", "10-k",
    "confirme dans un communiqué",
)

_DOMAINE = re.compile(r"https?://(?:www\.)?([^/]+)")


def editeur_de(article: dict) -> str:
    """L'éditeur derrière un article. Le domaine sert de repli."""
    nom = (article.get("source") or "").strip()
    if nom in EDITEUR:
        return EDITEUR[nom]
    m = _DOMAINE.search(article.get("link") or "")
    if m:
        # « bbc.co.uk » et « bbc.com » sont le même éditeur : on garde
        # l'étiquette la plus significative du domaine.
        parties = m.group(1).lower().split(".")
        return parties[-3] if len(parties) >= 3 and parties[-2] in ("co", "com") else parties[0]
    return nom.lower() or "inconnu"


def agences_citees(article: dict) -> set[str]:
    """Les agences explicitement créditées dans un article."""
    texte = f"{article.get('title', '')} {article.get('summary', '')}".lower()
    return {a for a in AGENCES if a in texte}


def a_source_primaire(articles: list[dict]) -> bool:
    """L'un des articles s'appuie-t-il sur un document ou une parole directe ?"""
    for a in articles:
        texte = f"{a.get('title', '')} {a.get('summary', '')}".lower()
        if any(p in texte for p in PRIMAIRES):
            return True
    return False


def analyser(articles: list[dict]) -> dict:
    """Le décompte honnête des voix derrière un ensemble d'articles.

    Rend :
      editeurs          — les maisons distinctes ;
      voix              — leur nombre, qui n'est PAS le nombre d'articles ;
      agences           — les agences citées, toutes maisons confondues ;
      derive_probable   — vrai quand la majorité des éditeurs crédite la même
                          agence : les « confirmations » sont alors des
                          reprises d'une seule dépêche ;
      source_primaire   — un document ou une parole directe est cité.
    """
    editeurs: dict[str, int] = {}
    agences: dict[str, set[str]] = {}
    for a in articles:
        e = editeur_de(a)
        editeurs[e] = editeurs.get(e, 0) + 1
        cites = agences_citees(a)
        if cites:
            agences.setdefault(e, set()).update(cites)

    toutes = set().union(*agences.values()) if agences else set()

    # Une dérive est probable quand au moins deux éditeurs créditent la même
    # agence : ils ne s'apportent alors aucune confirmation mutuelle.
    derive = False
    for ag in toutes:
        porteurs = [e for e, s in agences.items() if ag in s]
        if len(porteurs) >= 2:
            derive = True
            break

    return {
        "editeurs": sorted(editeurs),
        "voix": len(editeurs),
        "articles": len(articles),
        "agences": sorted(toutes),
        "derive_probable": derive,
        "source_primaire": a_source_primaire(articles),
    }


def voix_effectives(analyse: dict) -> float:
    """Le nombre de voix une fois la dérive prise en compte.

    Quand plusieurs éditeurs relaient la même dépêche, leurs reprises ne
    valent pas des confirmations indépendantes. On ne les efface pas — la
    diffusion large reste un fait — mais elles cessent de compter chacune pour
    une voix. La racine carrée donne la forme voulue : deux reprises valent
    nettement plus qu'une, six ne valent pas six.
    """
    v = float(analyse.get("voix", 0))
    if v <= 1:
        return v
    if analyse.get("derive_probable"):
        return 1.0 + (v - 1.0) ** 0.5
    return v
