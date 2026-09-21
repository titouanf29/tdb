"""
Retrouver un actif à partir de ce que les gens tapent vraiment.

La recherche testait trois sous-chaînes : le symbole, le début du symbole, le
nom. Mesuré sur cinquante-quatre requêtes réalistes, elle trouvait le bon
actif du premier coup dans 46 % des cas et NE RENDAIT RIEN DU TOUT une fois
sur deux.

Le plus révélateur n'était pas les fautes de frappe :

    « google »    rien          le nom stocké est « Alphabet A »
    « facebook »  rien          le nom stocké est « Meta Platforms »
    « société générale » rien   l'accent ne correspond à aucun caractère
    « total energies »   rien   le nom stocké est « TotalEnergies », sans espace
    « meta »      Rheinmetall   « meta » est une sous-chaîne de « RheinMETAll »
    « or »        ArcelorMittal l'or n'apparaissait nulle part

Trois de ces six requêtes sont ORTHOGRAPHIÉES CORRECTEMENT. Le problème
n'était donc pas la tolérance aux fautes, c'était qu'il n'y avait ni
normalisation, ni noms d'usage, ni classement — un test de sous-chaîne rend
tout ce qui contient la requête, dans l'ordre où le catalogue est parcouru.

QUATRE COUCHES, DANS CET ORDRE.

1. NORMALISER. Minuscules, accents retirés, tout ce qui n'est pas une lettre
   ou un chiffre supprimé. « CAC 40 », « cac40 » et « Cac-40 » deviennent la
   même chaîne, et « société » rejoint « societe ».

2. LES NOMS D'USAGE, écrits à la main. Personne ne cherche « Alphabet A » :
   on cherche Google. Une table automatique ne peut pas deviner ça — c'est de
   la connaissance du monde, pas une règle — et quand elle se trompe, on ne
   peut pas savoir laquelle corriger.

3. CLASSER. Un symbole exact bat un début de nom, qui bat une sous-chaîne.
   Sans cet ordre, « meta » sortait Rheinmetall avant Meta.

4. RATTRAPER LES FAUTES, en dernier seulement. La distance ne se déclenche
   que si les trois couches précédentes n'ont rien donné de mieux, et jamais
   sur moins de quatre caractères : sur deux lettres, tout ressemble à tout.
"""

import re
import unicodedata
from difflib import SequenceMatcher

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normaliser(t: str) -> str:
    """La forme comparable d'un texte : sans accent, sans ponctuation, sans espace."""
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return _NON_ALNUM.sub("", t)


def mots(t: str) -> list[str]:
    """Les mots d'un texte, normalisés un par un — pour « air liquide »."""
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return [m for m in _NON_ALNUM.split(t) if m]


# ── Les noms d'usage ────────────────────────────────────────────────────────
#
# nom tapé -> symbole. Écrits à la main, et cette table doit le rester : le
# lien entre « Facebook » et META est une information sur le monde, pas une
# règle qu'on peut déduire du catalogue.
#
# Elle porte trois familles : les entreprises rebaptisées (Google, Facebook),
# les marques plus connues que la raison sociale (Louis Vuitton pour LVMH), et
# les traductions (gold pour Or, oil pour Pétrole).
ALIAS: dict[str, str] = {
    # Renommages et marques
    "google": "GOOGL", "alphabet": "GOOGL",
    "facebook": "META", "instagram": "META", "whatsapp": "META",
    "louisvuitton": "MC.PA", "vuitton": "MC.PA",
    "socgen": "GLE.PA", "socgene": "GLE.PA",
    "total": "TTE.PA", "totalenergie": "TTE.PA",
    "tiktok": "BABA",          # approximation assumée : le plus proche coté
    "windows": "MSFT", "xbox": "MSFT", "azure": "MSFT",
    "iphone": "AAPL", "mac": "AAPL",
    "aws": "AMZN",
    "chatgpt": "MSFT", "openai": "MSFT",
    "youtube": "GOOGL",
    "playstation": "SONY", "sony": "SONY",
    # Traductions courantes
    "gold": "GC=F", "lingot": "GC=F",
    "silver": "SI=F", "argent": "SI=F",
    "oil": "CL=F", "petrole": "CL=F", "brut": "CL=F", "baril": "CL=F",
    "gaz": "NG=F", "naturalgas": "NG=F",
    "cuivre": "HG=F", "copper": "HG=F",
    "ble": "ZW=F", "wheat": "ZW=F",
    # Indices, tels qu'on en parle
    "cac": "^FCHI", "cac40": "^FCHI", "paris": "^FCHI",
    "dax": "^GDAXI", "francfort": "^GDAXI",
    "footsie": "^FTSE", "ftse": "^FTSE", "londres": "^FTSE",
    "sp500": "^GSPC", "spx": "^GSPC", "sandp": "^GSPC",
    "dowjones": "^DJI", "dow": "^DJI",
    "nasdaq": "^IXIC",
    "nikkei": "^N225", "tokyo": "^N225",
    # Cryptos par leur ticker parlé
    "bitcoin": "BTC-USD", "btc": "BTC-USD",
    "ethereum": "ETH-USD", "eth": "ETH-USD", "ether": "ETH-USD",
}

# Une faute doit rester une faute : en dessous, on ne devine pas.
LONGUEUR_MIN_APPROX = 4
SEUIL_APPROX = 0.72


def _ressemblance(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


class Entree:
    """Un actif, déjà normalisé.

    Normaliser à la volée refaisait huit cents fois le même travail à chaque
    frappe : retirer les accents, supprimer la ponctuation, redécouper les
    mots — pour un catalogue qui ne change pas entre deux requêtes. La
    préparation est faite une fois, la recherche ne fait plus que comparer.
    """
    __slots__ = ("symbole", "nom", "s_norm", "n_norm", "n_mots")

    def __init__(self, symbole: str, nom: str):
        self.symbole = symbole
        self.nom = nom or symbole
        self.s_norm = normaliser(symbole)
        self.n_norm = normaliser(self.nom)
        self.n_mots = mots(self.nom)


def preparer(catalogue) -> list[Entree]:
    """L'index, à construire une fois puis à garder."""
    return [Entree(s, n) for s, n in catalogue]


def score_litteral(q_norm: str, e: Entree) -> float:
    """Les paliers qui ne coûtent qu'une comparaison de chaînes.

    Séparés de l'approximation parce qu'ils sont mille fois moins chers, et
    que la plupart des requêtes s'y arrêtent : quelqu'un qui tape « appl »
    n'a pas besoin qu'on calcule une distance contre huit cents noms.
    """
    s_norm, n_norm = e.s_norm, e.n_norm
    if q_norm == s_norm:
        return 1.0
    if q_norm == n_norm:
        return 0.97
    if ALIAS.get(q_norm) == e.symbole:
        return 0.95
    if s_norm.startswith(q_norm):
        return 0.94 if n_norm.startswith(q_norm) else 0.90
    if n_norm.startswith(q_norm):
        return 0.86
    for i, m in enumerate(e.n_mots):
        if m.startswith(q_norm):
            return 0.80 - min(i, 3) * 0.02
    if q_norm in n_norm:
        return 0.66
    if q_norm in s_norm:
        return 0.60
    return 0.0


def score(q_norm: str, q_mots: list[str], e: Entree) -> float:
    """À quel point cet actif répond à cette requête, entre 0 et 1.

    Les paliers sont larges et séparés à dessein : il faut qu'un symbole exact
    reste devant un nom qui commence pareil, même si l'approximation donne à
    ce dernier un très bon ratio. Un classement où les paliers se chevauchent
    produit des résultats qui changent d'ordre pour des raisons invisibles.
    """
    s_norm, n_norm, n_mots = e.s_norm, e.n_norm, e.n_mots

    if not q_norm:
        return 0.0

    # Palier 1 — l'identité.
    if q_norm == s_norm:
        return 1.0
    if q_norm == n_norm:
        return 0.97
    if ALIAS.get(q_norm) == e.symbole:
        return 0.95

    # Palier 2 — le début. C'est ce que fait quelqu'un qui tape vite.
    if s_norm.startswith(q_norm):
        # Le nom commence pareil ? Alors ce n'est plus une coïncidence de
        # ticker. Mesuré : « bnp » rendait Danone (BN.PA) avant BNP Paribas,
        # les deux symboles commençant par « bnp » une fois normalisés et le
        # plus court gagnant le départage. Seul BNP Paribas s'APPELLE bnp.
        return 0.94 if n_norm.startswith(q_norm) else 0.90
    if n_norm.startswith(q_norm):
        return 0.86
    # « air liq » doit trouver Air Liquide : chaque mot du nom est un début
    # possible, et les mots suivants comptent un peu moins que le premier.
    for i, m in enumerate(n_mots):
        if m.startswith(q_norm):
            return 0.80 - min(i, 3) * 0.02

    # Palier 4 — l'approximation.
    #
    # Elle est calculée AVANT le palier 3 alors qu'elle lui est inférieure, et
    # c'est voulu : une quasi-identité doit pouvoir passer devant une
    # sous-chaîne fortuite. Mesuré : « aple » rendait XLP en premier, parce
    # que « aple » se trouve au milieu de « Consumer STAPLES » — une
    # sous-chaîne à 0,66 battait « apple » à une lettre près. Une faute de
    # frappe sur un nom court est un indice bien plus fort qu'une syllabe
    # commune au milieu d'un autre mot.
    approx = 0.0
    if len(q_norm) >= LONGUEUR_MIN_APPROX:
        approx = max(_ressemblance(q_norm, n_norm), _ressemblance(q_norm, s_norm))
        # La comparaison MOT À MOT, y compris pour une requête d'un seul mot.
        # « nasdac » ne ressemble pas à « nasdaqcomposite » pris en bloc — la
        # longueur écrase le ratio — mais ressemble beaucoup à « nasdaq ».
        # Même chose pour « shneider » dans « Schneider Electric ».
        if n_mots:
            par_mot = sum(max(_ressemblance(qm, nm) for nm in n_mots)
                          for qm in q_mots) / max(1, len(q_mots))
            approx = max(approx, par_mot)

    if approx >= 0.85:
        # Quasi-identité : au-dessus de la sous-chaîne, sous le début de nom.
        return 0.68 + (approx - 0.85) / 0.15 * 0.10

    # Palier 3 — la requête est quelque part dedans.
    if q_norm in n_norm:
        return 0.66
    if q_norm in s_norm:
        return 0.60

    if approx >= SEUIL_APPROX:
        # Ramené dans [0,30 ; 0,58] : une ressemblance moyenne ne doit jamais
        # concurrencer une correspondance littérale.
        return 0.30 + (approx - SEUIL_APPROX) / (1.0 - SEUIL_APPROX) * 0.28
    return 0.0


def chercher(q: str, index: list[Entree], limite: int = 15) -> list[tuple[str, float]]:
    """Les meilleurs actifs pour cette requête.

    `index` vient de `preparer()`. Le tri secondaire est le
    symbole lui-même : à score égal, l'ordre doit être stable d'un appel à
    l'autre, sinon la même requête rend deux classements différents selon
    l'ordre de parcours d'un dictionnaire.
    """
    q_norm = normaliser(q)
    q_mots = mots(q)
    if not q_norm:
        return []

    # PREMIÈRE PASSE, LITTÉRALE. Elle ne coûte que des comparaisons de
    # chaînes et suffit à la grande majorité des requêtes.
    litteral: list[tuple[str, float]] = []
    meilleur = 0.0
    for e in index:
        s = score_litteral(q_norm, e)
        if s > 0:
            litteral.append((e.symbole, s))
            meilleur = max(meilleur, s)

    # SECONDE PASSE, APPROCHÉE, seulement si la première n'a pas trouvé de
    # correspondance franche. Sans ce garde-fou, chaque frappe déclenchait
    # huit cents calculs de distance — 27 ms par requête sur ce catalogue,
    # pour une réponse déjà connue.
    if meilleur >= 0.86 and len(litteral) >= 3:
        litteral.sort(key=lambda x: (-x[1], len(x[0]), x[0]))
        return litteral[:limite]

    out: list[tuple[str, float]] = []
    for e in index:
        s = score(q_norm, q_mots, e)
        if s > 0:
            out.append((e.symbole, s))

    out.sort(key=lambda x: (-x[1], len(x[0]), x[0]))
    return out[:limite]
