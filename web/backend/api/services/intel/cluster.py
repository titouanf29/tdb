"""
Passer de l'article à l'ÉVÉNEMENT.

C'est la frontière que décrit le cahier des charges entre un agrégateur et un
moteur : un agrégateur empile des articles, un moteur tient des dossiers. Tant
que l'unité de travail est l'article, il n'y a ni croisement de sources, ni
nouveauté, ni suivi dans le temps — chaque reprise rouvre le même sujet à
zéro.

Le regroupement est délibérément SIMPLE et explicable, pas statistique. Un
modèle d'embeddings rapprocherait mieux « tensions au Moyen-Orient » et
« escalade dans le Golfe », mais on ne pourrait ni expliquer ni corriger un
rapprochement faux. Ici, deux articles se rejoignent quand ils partagent
assez de mots porteurs dans une fenêtre de temps — et quand c'est raté, on
voit immédiatement pourquoi.

La fenêtre de temps est aussi importante que la ressemblance. « La BCE relève
ses taux » en mars et en septembre, c'est deux événements. Sans borne
temporelle, ils fusionneraient et le dossier deviendrait un thème, ce qui ne
se suit pas.
"""

import re
import unicodedata

from . import entities

# Les mots qui ne portent pas de sens propre. Les garder ferait se ressembler
# tous les titres de presse, qui partagent la moitié de leur vocabulaire.
VIDES = {
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "au", "aux", "et",
    "ou", "a", "à", "en", "dans", "sur", "pour", "par", "avec", "sans", "que",
    "qui", "se", "sa", "son", "ses", "ce", "cet", "cette", "est", "sont", "ete",
    "plus", "moins", "apres", "avant", "entre", "vers", "chez", "leur", "leurs",
    "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "by", "from",
    "as", "is", "are", "was", "were", "be", "been", "it", "its", "this", "that",
    "and", "or", "but", "not", "no", "he", "she", "they", "we", "you", "will",
    "says", "said", "dit", "selon", "apres", "new", "nouveau", "nouvelle",
}

_MOT = re.compile(r"[a-z0-9]+")


def _sans_accents(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


def jetons(texte: str) -> set[str]:
    """Les mots porteurs d'un texte, normalisés."""
    t = _sans_accents((texte or "").lower())
    return {m for m in _MOT.findall(t) if len(m) > 2 and m not in VIDES}


def ressemblance(a: set[str], b: set[str]) -> float:
    """Jaccard, mais pondéré vers le plus petit ensemble.

    Le Jaccard pur punit un titre court face à un titre long : « Sanctions
    contre la Russie » et un titre de vingt mots qui dit la même chose
    obtiennent un score faible alors qu'ils parlent du même fait. On mesure
    donc aussi la part du plus petit ensemble couverte par le plus grand, et
    on garde la plus favorable des deux — ce qui reste symétrique.
    """
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    union = len(a | b)
    couverture = inter / min(len(a), len(b))
    return max(inter / union, couverture * 0.85)


SEUIL = 0.42            # mesuré sur des titres réels, voir les tests
SEUIL_ENTITES = 0.75    # les entités sont bien plus discriminantes que les mots
FENETRE_HEURES = 72     # au-delà, deux faits qui se ressemblent sont deux faits


def proximite(a: dict, b: dict) -> float:
    """À quel point deux articles parlent du même fait.

    LES ENTITÉS D'ABORD, LES MOTS ENSUITE — et c'est une mesure qui l'a
    imposé. « Fed holds rates steady » et « Federal Reserve keeps rates
    unchanged » ne partagent qu'un mot : aucun seuil lexical ne les rapproche
    sans rapprocher n'importe quoi. Ils partagent en revanche FED et TAUX.
    Même chose entre « Oil prices surge » et « Le pétrole bondit », qui n'ont
    aucun mot commun et la même entité PETROLE.

    Les mots restent le repli : un événement dont aucune entité n'est connue
    doit quand même pouvoir se regrouper.
    """
    ea, eb = a.get("_entites") or set(), b.get("_entites") or set()
    lex = ressemblance(a["_jetons"], b["_jetons"])
    if not ea or not eb:
        return lex

    communes = ea & eb
    e = entities.ressemblance(ea, eb)

    # DEUX ENTITÉS COMMUNES AU MINIMUM POUR FUSIONNER SUR LES SEULES ENTITÉS.
    #
    # La première version fusionnait dès qu'un article à entité unique
    # recouvrait un autre — « RUSSIE » suffisait. Ces articles se comportaient
    # alors comme des ponts, et la chaîne se propageait : mesuré sur 70
    # articles réels, un seul « événement » avalait 15 articles couvrant la
    # Chine, la Russie, l'Ukraine, des élections, le pétrole et les banques.
    # Ce n'est pas un événement, c'est une rubrique.
    #
    # Deux entités partagées décrivent un fait ; une seule décrit un sujet.
    if len(communes) >= 2 and e >= SEUIL_ENTITES:
        return 1.0

    # Une entité commune ne décide pas : elle appuie les mots. Le plafond
    # l'empêche d'atteindre seule le seuil de regroupement.
    if communes:
        return max(lex, min(SEUIL - 0.02, e * 0.55))
    return lex


def _heures(a: str | None, b: str | None) -> float:
    """Écart en heures entre deux horodatages ISO. Infini si inexploitable."""
    from datetime import datetime, timezone
    if not a or not b:
        return 0.0            # sans date, on laisse la ressemblance décider
    try:
        da = datetime.fromisoformat(str(a).replace("Z", "+00:00"))
        db = datetime.fromisoformat(str(b).replace("Z", "+00:00"))
    except ValueError:
        return 0.0
    if da.tzinfo is None:
        da = da.replace(tzinfo=timezone.utc)
    if db.tzinfo is None:
        db = db.replace(tzinfo=timezone.utc)
    return abs((da - db).total_seconds()) / 3600.0


def grouper(articles: list[dict]) -> list[list[dict]]:
    """Regroupe des articles en dossiers d'événement.

    Un article rejoint le premier groupe avec lequel il dépasse le seuil, en
    comparant au MEILLEUR membre du groupe plutôt qu'à une moyenne : un
    dossier qui grossit finit sinon par se diluer et n'accepter plus personne.
    """
    groupes: list[list[dict]] = []

    for art in articles:
        texte = f"{art.get('title', '')} {art.get('summary', '')[:200]}"
        art["_jetons"] = jetons(texte)
        art["_entites"] = entities.extraire(texte)
        if not art["_jetons"]:
            continue
        place = False
        for i, membres in enumerate(groupes):
            meilleur = max(proximite(art, m) for m in membres)
            if meilleur >= SEUIL:
                proche = min(
                    _heures(art.get("iso_date"), g.get("iso_date"))
                    for g in groupes[i]
                )
                if proche <= FENETRE_HEURES:
                    groupes[i].append(art)
                    place = True
                    break
        if not place:
            groupes.append([art])

    return groupes


def entites_du_groupe(groupe: list[dict]) -> set[str]:
    """Les entités du dossier : celles citées par au moins un article."""
    out: set[str] = set()
    for a in groupe:
        out |= (a.get("_entites") or entities.extraire(
            f"{a.get('title','')} {a.get('summary','')[:200]}"))
    return out


def titre_du_groupe(groupe: list[dict]) -> str:
    """Le titre le plus représentatif : celui qui ressemble le plus aux autres.

    Prendre le premier arrivé donnerait au dossier le cadrage du flux le plus
    rapide, qui est souvent le plus approximatif.
    """
    if len(groupe) == 1:
        return groupe[0].get("title", "")
    js = [jetons(a.get("title", "")) for a in groupe]
    meilleur, score_max = groupe[0], -1.0
    for i, a in enumerate(groupe):
        score = sum(ressemblance(js[i], js[k]) for k in range(len(groupe)) if k != i)
        if score > score_max:
            meilleur, score_max = a, score
    return meilleur.get("title", "")
