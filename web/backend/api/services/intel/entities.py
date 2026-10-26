"""
Les entités du monde financier, et leurs noms.

Née d'un échec mesuré. Le regroupement lexical n'a pas rapproché :

    « Fed holds rates steady at December meeting »
    « Federal Reserve keeps rates unchanged »

Ces deux titres parlent du même fait et ne partagent qu'un mot : « rates ».
Aucun réglage de seuil ne répare ça — le problème n'est pas la sensibilité,
c'est que les mots ne sont pas la bonne unité. Même chose, en pire, entre
« Oil prices surge » et « Le pétrole bondit » : zéro mot commun pour un fait
identique.

D'où cette couche, qui est aussi le premier morceau du graphe décrit au §11
du cahier des charges. Un dictionnaire ÉCRIT À LA MAIN, volontairement : une
extraction automatique d'entités serait plus large et impossible à corriger
quand elle se trompe. Ici, quand un rapprochement est faux, on voit quelle
ligne l'a produit.

La couverture est assumée comme partielle. Elle porte ce qui déplace les
marchés — banques centrales, matières premières, grandes économies, secteurs —
et pas l'actualité générale. Un événement sans entité connue reste un
événement ; il est simplement regroupé sur les mots, comme avant.
"""

import re
import unicodedata

# ── Le dictionnaire ──────────────────────────────────────────────────────────
#
# clé canonique -> (type, formes de surface en FR et EN)
#
# Les formes sont recherchées sur des frontières de mots, donc « or » (le
# métal) ne se déclenche pas dans « report ». Les formes ambiguës courtes sont
# évitées quand le risque de faux positif dépasse l'utilité.

ENTITES: dict[str, tuple[str, tuple[str, ...]]] = {
    # ── Banques centrales ───────────────────────────────────────────────────
    "FED":  ("banque_centrale", ("fed", "federal reserve", "reserve federale",
                                 "fomc", "powell")),
    "BCE":  ("banque_centrale", ("bce", "ecb", "european central bank",
                                 "banque centrale europeenne", "lagarde")),
    "BOE":  ("banque_centrale", ("boe", "bank of england", "banque d'angleterre")),
    "BOJ":  ("banque_centrale", ("boj", "bank of japan", "banque du japon")),
    "PBOC": ("banque_centrale", ("pboc", "people's bank of china",
                                 "banque populaire de chine")),

    # ── Matières premières ──────────────────────────────────────────────────
    "PETROLE": ("matiere", ("oil", "crude", "petrole", "brent", "wti",
                            "petroleum", "baril", "barrel")),
    "GAZ":     ("matiere", ("natural gas", "gaz naturel", "lng", "gnl")),
    "OR":      ("matiere", ("gold", "bullion", "once d'or", "lingot")),
    "BLE":     ("matiere", ("wheat", "ble", "grain", "cereales")),
    "CUIVRE":  ("matiere", ("copper", "cuivre")),

    # ── Zones et pays ───────────────────────────────────────────────────────
    "USA":    ("pays", ("united states", "etats-unis", "us ", "u.s.", "america",
                        "washington", "american")),
    "CHINE":  ("pays", ("china", "chine", "chinese", "chinois", "beijing", "pekin")),
    "RUSSIE": ("pays", ("russia", "russie", "russian", "russe", "moscow", "moscou",
                        "kremlin")),
    "UE":     ("pays", ("european union", "union europeenne", "brussels",
                        "bruxelles", "eurozone", "zone euro")),
    "MOYEN_ORIENT": ("zone", ("middle east", "moyen-orient", "moyen orient",
                              "gulf", "golfe", "israel", "iran", "hormuz",
                              "red sea", "mer rouge")),
    "UKRAINE": ("pays", ("ukraine", "ukrainian", "ukrainien", "kyiv", "kiev")),
    "JAPON":  ("pays", ("japan", "japon", "japanese", "japonais", "tokyo")),

    # ── Thèmes macro ────────────────────────────────────────────────────────
    "TAUX":      ("macro", ("interest rate", "rate hike", "rate cut", "taux directeur",
                            "taux d'interet", "rates steady", "rates unchanged",
                            "monetary policy", "politique monetaire", "rates")),
    "INFLATION": ("macro", ("inflation", "cpi", "consumer price", "prix a la consommation",
                            "desinflation", "hausse des prix")),
    "EMPLOI":    ("macro", ("unemployment", "jobs report", "nonfarm", "chomage",
                            "emploi", "payrolls")),
    "CROISSANCE":("macro", ("gdp", "pib", "recession", "growth forecast",
                            "croissance economique")),

    # ── Mesures politiques ──────────────────────────────────────────────────
    "SANCTIONS": ("politique", ("sanction", "sanctions", "embargo")),
    "DOUANE":    ("politique", ("tariff", "tariffs", "droits de douane", "taxe a l'import",
                                "customs duty", "surtaxe")),
    "ELECTION":  ("politique", ("election", "elections", "scrutin", "vote",
                                "referendum")),
    "CONFLIT":   ("politique", ("war", "guerre", "conflict", "conflit", "strike on",
                                "frappe", "offensive", "escalation", "escalade")),

    # ── Secteurs ────────────────────────────────────────────────────────────
    "BANQUES":   ("secteur", ("bank", "banks", "banque", "banques", "lender",
                              "banking sector")),
    "TECH":      ("secteur", ("tech", "technology", "semiconductor", "chip",
                              "puce", "semi-conducteur", "software")),
    "ENERGIE":   ("secteur", ("energy sector", "secteur energetique", "utilities",
                              "producteur d'energie")),
    "TRANSPORT": ("secteur", ("airline", "airlines", "compagnie aerienne", "shipping",
                              "fret", "freight", "supply chain", "chaine d'approvisionnement",
                              "logistics", "logistique")),
    "IMMOBILIER":("secteur", ("real estate", "immobilier", "housing market",
                              "marche immobilier")),
}


def _norm(t: str) -> str:
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", t)


# Les motifs sont compilés une fois : la détection tourne sur chaque article
# de chaque flux, plusieurs fois par heure.
_MOTIFS: dict[str, re.Pattern] = {
    cle: re.compile(
        "|".join(rf"(?<![a-z0-9]){re.escape(f)}(?![a-z0-9])" for f in formes)
    )
    for cle, (_t, formes) in ENTITES.items()
}


def extraire(texte: str) -> set[str]:
    """Les entités canoniques citées dans un texte."""
    t = _norm(texte)
    return {cle for cle, motif in _MOTIFS.items() if motif.search(t)}


def extraire_article(article: dict) -> tuple[set[str], set[str]]:
    """(centrales, mentionnées) — et la distinction est cruciale.

    Une entité du TITRE dit de quoi parle l'article. Une entité présente
    seulement dans le résumé dit ce qu'il mentionne, ce qui n'est pas la même
    chose du tout.

    Mesuré sur les flux réels : « Ed Davey calls for immediate 10p cut to fuel
    duty » — un article de politique intérieure britannique — ressortait avec
    MOYEN_ORIENT, CONFLIT, PETROLE et BANQUES, et déclenchait une chaîne de
    blocus pétrolier. Ces entités venaient du résumé d'un live-blog de la BBC,
    qui empile des sujets sans rapport dans un seul bloc de texte.

    Les mécanismes de transmission ne se déclenchent donc que sur les entités
    CENTRALES. Les mentionnées servent encore au regroupement — deux articles
    qui citent les mêmes acteurs parlent souvent du même fait — mais elles ne
    peuvent plus, à elles seules, faire dire au moteur qu'un détroit est
    bloqué.
    """
    titre = article.get("title", "") or ""
    resume = (article.get("summary", "") or "")[:300]
    centrales = extraire(titre)
    mentionnees = extraire(f"{titre} {resume}") - centrales
    return centrales, mentionnees


def type_de(cle: str) -> str:
    return ENTITES.get(cle, ("inconnu", ()))[0]


def par_type(cles: set[str]) -> dict[str, list[str]]:
    """Les entités rangées par nature — pays, secteur, matière…"""
    out: dict[str, list[str]] = {}
    for c in sorted(cles):
        out.setdefault(type_de(c), []).append(c)
    return out


def ressemblance(a: set[str], b: set[str]) -> float:
    """Proximité de deux ensembles d'entités.

    Plus exigeante que la ressemblance lexicale : deux articles qui partagent
    FED et TAUX parlent presque certainement du même fait, alors que deux
    articles qui partagent vingt mots courants peuvent parler d'autre chose.
    On demande donc un recouvrement fort du plus petit ensemble.
    """
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    return inter / min(len(a), len(b))
