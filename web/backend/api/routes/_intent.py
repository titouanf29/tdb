"""
Une phrase en français, transformée en réglages de scan.

« J'ai 4 h devant moi, trouve-moi un trade en long ou short »
« J'aimerais une opportunité sur 4 semaines »

Ce sont deux demandes qui ne parlent PAS de la même durée, et c'est tout le
problème. La première dit combien de temps on peut surveiller un trade ; la
seconde, combien de temps on veut le porter. Confondre les deux donnerait du
scalping à quelqu'un qui cherche une position de quatre semaines.

On les distingue par la préposition, qui est le seul indice fiable :

    « j'ai 4 h devant moi », « je dispose de 2 heures »  -> temps DISPONIBLE
    « sur 4 semaines », « d'ici 3 mois », « pour 10 jours » -> temps de PORTAGE

Le portage l'emporte quand les deux sont exprimés : quelqu'un qui dit « j'ai
20 minutes pour trouver une position à six mois » parle d'une position à six
mois.

CE MODULE NE DEVINE RIEN QU'IL N'AIT LU. Tout ce qu'il a compris est rendu
phrase par phrase, pour être affiché et corrigé. Un réglage appliqué sans que
l'utilisateur sache d'où il sort est pire qu'un réglage qu'il aurait posé
lui-même : il ne peut ni le vérifier ni le reprendre.
"""

import re
import unicodedata

# ── Vocabulaire ──────────────────────────────────────────────────────────────

ZONE_MOTS: dict[str, tuple[str, ...]] = {
    "EUROPE": ("europe", "europeen", "europeenne", "cac", "cac40", "dax", "ftse",
               "paris", "francfort", "londres", "milan", "madrid", "zurich",
               "amsterdam", "bruxelles", "lisbonne", "euro stoxx", "eurostoxx"),
    "USA": ("us", "usa", "etats-unis", "etats unis", "americain", "americaine",
            "wall street", "nasdaq", "sp500", "s&p", "new york", "nyse"),
    "ASIE": ("asie", "asiatique", "japon", "japonais", "nikkei", "tokyo",
             "hong kong", "chine", "chinois", "coree", "inde", "indien"),
    "CRYPTO": ("crypto", "cryptos", "cryptomonnaie", "cryptomonnaies", "bitcoin",
               "btc", "ethereum", "eth", "altcoin", "altcoins"),
    "MATIERES": ("matiere premiere", "matieres premieres", "or", "gold", "petrole",
                 "argent metal", "cuivre", "gaz", "commodite", "commodites"),
    "INDICES": ("indice", "indices"),
}

# Les unités, en minutes. « mois » avant « moi » n'a pas d'importance ici :
# la recherche se fait sur des mots entiers.
UNITES: dict[str, float] = {
    "minute": 1, "minutes": 1, "min": 1, "mn": 1,
    "heure": 60, "heures": 60, "h": 60,
    "jour": 1440, "jours": 1440, "journee": 1440, "journees": 1440,
    "semaine": 10080, "semaines": 10080,
    "mois": 43200,
    "an": 525600, "ans": 525600, "annee": 525600, "annees": 525600,
}

NOMBRES_MOTS: dict[str, int] = {
    "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
    "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "douze": 12,
    "quinze": 15, "vingt": 20, "trente": 30,
}

# Ce qui précède une durée et dit de quelle durée il s'agit.
AVANT_PORTAGE = ("sur", "pour", "d'ici", "dici", "en", "a", "pendant", "durant",
                 "horizon", "de", "cette", "ce", "prochaine", "prochain")
AVANT_DISPO = ("ai", "j'ai", "jai", "dispose", "reste", "libre", "devant",
               "avant", "seulement", "que")

DIR_LONG = ("long", "longs", "achat", "acheter", "hausse", "haussier", "haussiere",
            "monte", "montee", "bull", "bullish")
DIR_SHORT = ("short", "shorts", "vente", "vendre", "baisse", "baissier", "baissiere",
             "descend", "bear", "bearish", "decouvert")

# « sûr » et « sûres » sont volontairement ABSENTS : les accents sont retirés
# avant comparaison, donc ils deviendraient « sur » et « sures » — et « sur »
# est la préposition la plus courante de ces phrases. Mesuré : l'exigence
# stricte se déclenchait sur « une opportunité SUR 4 semaines ».
STRICT = ("meilleur", "meilleurs", "meilleure", "meilleures", "selectif",
          "selective", "strict", "stricte", "solide", "solides")
LARGE = ("large", "largement", "tout", "toutes", "maximum", "beaucoup", "idees")


def _sans_accents(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


def _normalise(t: str) -> str:
    t = _sans_accents((t or "").lower())
    # L'apostrophe typographique et la droite doivent se valoir : « d'ici » et
    # « d’ici » sont le même mot pour qui écrit, et deux mots pour qui compare.
    t = t.replace("’", "'")
    return re.sub(r"\s+", " ", t).strip()


# ── Durées ───────────────────────────────────────────────────────────────────

_DUREE = re.compile(
    r"(?:(\d+(?:[.,]\d+)?)|(" + "|".join(NOMBRES_MOTS) + r"))\s*"
    r"(" + "|".join(sorted(UNITES, key=len, reverse=True)) + r")\b"
)


# Des durées que personne n'écrit avec un chiffre.
IMPLICITES: tuple[tuple[str, float], ...] = (
    ("cette semaine", 10080), ("la semaine", 10080), ("ce mois", 43200),
    ("la journee", 1440), ("aujourd'hui", 1440), ("aujourdhui", 1440),
    ("dans la journee", 1440), ("cette annee", 525600),
)


def _durees(t: str) -> list[tuple[float, str, str]]:
    """Toutes les durées du texte : (minutes, unité, mot qui précède)."""
    out = []
    for mot, minutes in IMPLICITES:
        if mot in t:
            out.append((minutes, "implicite", "sur"))
    for m in _DUREE.finditer(t):
        n = float((m.group(1) or "").replace(",", ".")) if m.group(1) else NOMBRES_MOTS[m.group(2)]
        unite = m.group(3)
        avant = t[: m.start()].split()
        mot_avant = avant[-1] if avant else ""
        out.append((n * UNITES[unite], unite, mot_avant))
    return out


def _horizon_depuis_portage(minutes: float) -> tuple[str, str]:
    """Un temps de PORTAGE -> le style de trading qui lui correspond."""
    if minutes <= 60:
        return "scalp", "5m"
    if minutes <= 1440:
        return "day", "1h"
    if minutes <= 45 * 1440:
        return "swing", "1d"
    return "long", "1wk"


def _horizon_depuis_dispo(minutes: float) -> tuple[str, str]:
    """Un temps DISPONIBLE devant soi.

    Ce n'est pas la même échelle : quelqu'un qui a quatre heures devant lui ne
    cherche pas une position de quatre heures, il cherche un trade qu'il
    pourra suivre et clore dans cette fenêtre. Une demi-heure disponible mène
    au scalping, une journée au day trading ; au-delà, on ne surveille plus,
    on porte.
    """
    if minutes <= 45:
        return "scalp", "5m"
    if minutes <= 12 * 60:
        return "day", "1h"
    if minutes <= 5 * 1440:
        return "swing", "1d"
    return "long", "1wk"


STYLE_LABEL = {"scalp": "scalping", "day": "day trading", "swing": "swing", "long": "long terme"}


def _duree_humaine(minutes: float) -> str:
    if minutes < 60:
        return f"{minutes:.0f} min".replace(".0", "")
    if minutes < 1440:
        return f"{minutes / 60:.0f} h"
    # L'accord du pluriel : « ~1 semaines » trahit un texte fabriqué.
    if minutes < 10080:
        n = round(minutes / 1440)
        return f"{n} jour{'s' if n > 1 else ''}"
    if minutes < 43200:
        n = round(minutes / 10080)
        return f"{n} semaine{'s' if n > 1 else ''}"
    if minutes < 525600:
        return f"{round(minutes / 43200)} mois"
    n = round(minutes / 525600)
    return f"{n} an{'s' if n > 1 else ''}"


def parse(texte: str) -> dict:
    """La phrase -> des réglages, et la liste de ce qui a été compris."""
    t = _normalise(texte)
    compris: list[str] = []

    if not t:
        return {"zones": [], "horizon": None, "timeframe": None,
                "direction": "both", "min_score": None,
                "understood": [], "recognised": False}

    # ── Zones ────────────────────────────────────────────────────────────────
    zones: list[str] = []
    for zone, mots in ZONE_MOTS.items():
        for mot in mots:
            # Frontières de mots : « or » ne doit pas se déclencher sur
            # « short », ni « us » sur « surveiller ».
            if re.search(rf"(?<![a-z0-9]){re.escape(mot)}(?![a-z0-9])", t):
                zones.append(zone)
                break
    if zones:
        from ._universe import ZONES
        compris.append("Zones : " + ", ".join(ZONES[z]["label"] for z in zones))

    # ── Durées ───────────────────────────────────────────────────────────────
    horizon = timeframe = None
    portage = dispo = None
    for minutes, _unite, avant in _durees(t):
        if avant in AVANT_PORTAGE:
            portage = minutes if portage is None else max(portage, minutes)
        elif avant in AVANT_DISPO or "devant" in t:
            dispo = minutes if dispo is None else min(dispo, minutes)
        else:
            # Sans préposition, on ne devine pas : une durée seule dans une
            # phrase de recherche d'opportunité désigne le portage bien plus
            # souvent que le temps libre.
            portage = minutes if portage is None else max(portage, minutes)

    # Le portage l'emporte : « j'ai 20 min pour trouver une position à six
    # mois » parle d'une position à six mois.
    if portage is not None:
        horizon, timeframe = _horizon_depuis_portage(portage)
        compris.append(f"Position tenue ~{_duree_humaine(portage)} → {STYLE_LABEL[horizon]}")
    elif dispo is not None:
        horizon, timeframe = _horizon_depuis_dispo(dispo)
        compris.append(f"{_duree_humaine(dispo)} devant vous → {STYLE_LABEL[horizon]}")

    # ── Direction ────────────────────────────────────────────────────────────
    # « long terme » désigne un horizon, pas un sens de position : sans cette
    # exception, « une position long terme sur l'or » se lisait comme un achat
    # explicitement demandé, alors que rien n'a été dit du sens.
    t_dir = re.sub(r"\blongs?\s+termes?\b", " ", t)
    a_long = any(re.search(rf"(?<![a-z]){m}(?![a-z])", t_dir) for m in DIR_LONG)
    a_short = any(re.search(rf"(?<![a-z]){m}(?![a-z])", t_dir) for m in DIR_SHORT)
    direction = "both" if (a_long and a_short) or (not a_long and not a_short) \
        else "long" if a_long else "short"
    if a_long and a_short:
        compris.append("Les deux sens : achat comme vente à découvert")
    elif a_long:
        compris.append("Sens : à l'achat")
    elif a_short:
        compris.append("Sens : à la vente à découvert")

    # ── Exigence ─────────────────────────────────────────────────────────────
    min_score = None
    if any(re.search(rf"(?<![a-z]){m}(?![a-z])", t) for m in STRICT):
        min_score = 70
        compris.append("Exigence stricte : seulement les configurations les plus nettes")
    elif any(re.search(rf"(?<![a-z]){m}(?![a-z])", t) for m in LARGE):
        min_score = 50
        compris.append("Exigence large : un maximum de pistes")

    return {
        "zones": zones,
        "horizon": horizon,
        "timeframe": timeframe,
        "direction": direction,
        "min_score": min_score,
        "understood": compris,
        "recognised": bool(compris),
    }
