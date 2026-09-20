"""Web-side extensions to the asset universe.

MARKETS lives in the repo-root config.py, which is shared with the Telegram
bot, so assets the web scanner needs are added here instead of editing it.

Only established, liquid coins with a plain "XXX-USD" Yahoo ticker are listed.
Assets whose Yahoo symbol carries a disambiguating suffix (SUI20947-USD,
TON11419-USD, UNI7083-USD, GRT6719-USD, COMP5692-USD, STX4847-USD…) are left
out on purpose: the exact suffix could not be confirmed, and a wrong ticker
would silently return no data. A symbol that resolves to nothing is dropped
during the scan, and the gap between requested and analysed assets is reported
as `total_scanned` vs `total_analyzed` so a dead ticker is visible instead of
quietly shrinking the universe.
"""

# Layer-1s, DeFi blue chips and privacy coins — no memecoins.
EXTRA_CRYPTO: dict[str, str] = {
    "ETC-USD":   "Ethereum Classic",
    "XMR-USD":   "Monero",
    "XTZ-USD":   "Tezos",
    "EOS-USD":   "EOS",
    "DASH-USD":  "Dash",
    "ZEC-USD":   "Zcash",
    "NEO-USD":   "Neo",
    "VET-USD":   "VeChain",
    "HBAR-USD":  "Hedera",
    "ICP-USD":   "Internet Computer",
    "APT-USD":   "Aptos",
    "OP-USD":    "Optimism",
    "INJ-USD":   "Injective",
    "MKR-USD":   "Maker",
    "SNX-USD":   "Synthetix",
    "CRV-USD":   "Curve DAO",
    "LDO-USD":   "Lido DAO",
    "QNT-USD":   "Quant",
    "RUNE-USD":  "THORChain",
    "KAS-USD":   "Kaspa",
    "SEI-USD":   "Sei",
    "FTM-USD":   "Fantom",
    "EGLD-USD":  "MultiversX",
    "THETA-USD": "Theta Network",
    "FLOW-USD":  "Flow",
    "CHZ-USD":   "Chiliz",
    "ZIL-USD":   "Zilliqa",
    "KSM-USD":   "Kusama",
    "MINA-USD":  "Mina Protocol",
    "ROSE-USD":  "Oasis Network",
    # Polygon is deliberately absent: the backend config already carries it as
    # MATIC-USD, its pre-rename ticker. Adding POL-USD would list the same
    # asset twice in a scan. If MATIC-USD ever stops resolving — visible as a
    # gap between total_scanned and total_analyzed — swap the ticker there.
}


def extend_market(market_key: str, assets: list[str]) -> list[str]:
    """Append the web-side additions for a market, preserving order and
    dropping anything already present in the shared config."""
    if market_key != "CRYPTO":
        return assets
    seen = set(assets)
    return assets + [s for s in EXTRA_CRYPTO if s not in seen]


# ── Un univers composable ────────────────────────────────────────────────────
#
# Le scanner ne savait balayer qu'UN marché : Europe, ou USA, ou « tout ». Or
# les utilisateurs ne raisonnent pas en blocs de ce genre. « Je ne fais que du
# Paris », « tout sauf la crypto », « les actions européennes et l'or » sont
# des demandes normales, et aucune n'était exprimable.
#
# Le problème n'est pas le nombre de marchés mais leur forme : « EUROPE »
# mélange Paris, Francfort et Londres, et un utilisateur français qui ne veut
# que le CAC doit avaler les six valeurs allemandes et les six britanniques.
#
# D'où deux axes indépendants, qui se croisent :
#
#   LA PLACE   — où l'actif se négocie (Paris, Francfort, New York, Tokyo…),
#                déduite du suffixe Yahoo, qui est l'information de rattachement
#                la plus fiable dont on dispose ;
#   LA CLASSE  — ce que l'actif EST (action, indice, crypto, matière première).
#
# On coche ce qu'on veut sur chaque axe et l'intersection donne l'univers. Un
# axe vide signifie « tout », ce qui permet de n'exprimer que la contrainte à
# laquelle on tient : classes=[ACTION] sans place donne toutes les actions du
# monde, places=[PARIS] sans classe donne tout ce qui cote à Paris.

PLACES: dict[str, dict] = {
    "PARIS":      {"label": "Paris",       "iso": "fr", "suffixes": (".PA",)},
    "FRANCFORT":  {"label": "Francfort",   "iso": "de", "suffixes": (".DE",)},
    "LONDRES":    {"label": "Londres",     "iso": "gb", "suffixes": (".L",)},
    "AMSTERDAM":  {"label": "Amsterdam",   "iso": "nl", "suffixes": (".AS",)},
    "BRUXELLES":  {"label": "Bruxelles",   "iso": "be", "suffixes": (".BR",)},
    "MILAN":      {"label": "Milan",       "iso": "it", "suffixes": (".MI",)},
    "MADRID":     {"label": "Madrid",      "iso": "es", "suffixes": (".MC",)},
    "ZURICH":     {"label": "Zurich",      "iso": "ch", "suffixes": (".SW",)},
    "LISBONNE":   {"label": "Lisbonne",    "iso": "pt", "suffixes": (".LS",)},
    "NEWYORK":    {"label": "New York",    "iso": "us", "suffixes": ()},   # sans suffixe
    "TOKYO":      {"label": "Tokyo",       "iso": "jp", "suffixes": (".T",)},
    "HONGKONG":   {"label": "Hong Kong",   "iso": "hk", "suffixes": (".HK",)},
    "SEOUL":      {"label": "Séoul",       "iso": "kr", "suffixes": (".KS",)},
    "SHANGHAI":   {"label": "Shanghai",    "iso": "cn", "suffixes": (".SS", ".SZ")},
    "MUMBAI":     {"label": "Mumbai",      "iso": "in", "suffixes": (".NS", ".BO")},
    # Un indice pan-européen ne cote sur aucune place en particulier, mais
    # l'exclure d'une sélection « toute l'Europe » serait un trou : c'est
    # précisément l'instrument que ce lecteur-là regarde en premier.
    "EUROPE":     {"label": "Europe",      "iso": "eu", "suffixes": ()},
    "MONDE":      {"label": "Mondial",     "iso": "",   "suffixes": ()},   # crypto, matières
}

# Les régions, qui ne servent qu'à proposer des raccourcis de sélection.
REGIONS: dict[str, tuple[str, ...]] = {
    "EUROPE": ("PARIS", "FRANCFORT", "LONDRES", "AMSTERDAM", "BRUXELLES",
               "MILAN", "MADRID", "ZURICH", "LISBONNE", "EUROPE"),
    "AMERIQUE": ("NEWYORK",),
    "ASIE": ("TOKYO", "HONGKONG", "SEOUL", "SHANGHAI", "MUMBAI"),
}

CLASSES: dict[str, str] = {
    "ACTION":  "Actions",
    "INDICE":  "Indices",
    "CRYPTO":  "Crypto",
    "MATIERE": "Matières premières",
}

_SUFFIX_TO_PLACE: dict[str, str] = {
    sfx: key for key, meta in PLACES.items() for sfx in meta["suffixes"]
}


def classify(symbol: str) -> tuple[str, str]:
    """(classe, place) d'un symbole Yahoo, déduits de sa forme.

    L'ordre des tests compte : un indice commence par « ^ » quel que soit son
    suffixe, et une crypto se termine par « -USD » sans en avoir. Tester le
    point en premier rangerait « 000001.SS » avant d'avoir vu que c'est un
    indice chinois.
    """
    s = (symbol or "").upper()
    if not s:
        return "ACTION", "MONDE"

    if s.endswith("-USD"):
        return "CRYPTO", "MONDE"
    if s.endswith("=F"):
        return "MATIERE", "MONDE"
    if s.endswith("=X"):
        return "MATIERE", "MONDE"

    if s.startswith("^"):
        cls = "INDICE"
    else:
        cls = "ACTION"

    dot = s.rfind(".")
    if dot > 0:
        place = _SUFFIX_TO_PLACE.get(s[dot:])
        if place:
            return cls, place
    # Un indice sans suffixe connu : on le rattache à sa place par son nom.
    if cls == "INDICE":
        if any(t in s for t in ("FCHI", "SBF")):        return cls, "PARIS"
        if "GDAXI" in s:                                return cls, "FRANCFORT"
        if "FTSE" in s:                                 return cls, "LONDRES"
        if "AEX" in s:                                  return cls, "AMSTERDAM"
        if "IBEX" in s:                                 return cls, "MADRID"
        if "SSMI" in s:                                 return cls, "ZURICH"
        if "STOXX" in s or "BFX" in s:                  return cls, "EUROPE"
        if "N225" in s:                                 return cls, "TOKYO"
        if "HSI" in s:                                  return cls, "HONGKONG"
        if "KS11" in s:                                 return cls, "SEOUL"
        return cls, "NEWYORK"
    return cls, "NEWYORK"


def full_universe() -> list[str]:
    """Tous les actifs connus, dédoublonnés, dans un ordre stable."""
    from config import MARKETS
    seen: set[str] = set()
    out: list[str] = []
    for key, m in MARKETS.items():
        for s in extend_market(key, list(m["assets"])):
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


def resolve_universe(
    places: list[str] | None = None,
    classes: list[str] | None = None,
    markets: list[str] | None = None,
) -> list[str]:
    """Les actifs qui satisfont TOUTES les contraintes données.

    Un axe laissé vide ne contraint rien. Les trois vides rendent l'univers
    entier — c'est le comportement de l'ancien « ALL », conservé pour que rien
    d'existant ne change de sens.
    """
    from config import MARKETS

    base = full_universe()

    if markets:
        wanted = {m.upper() for m in markets}
        allowed: set[str] = set()
        for key, m in MARKETS.items():
            if key.upper() in wanted:
                allowed.update(extend_market(key, list(m["assets"])))
        base = [s for s in base if s in allowed]

    want_places = {p.upper() for p in places or []}
    want_classes = {c.upper() for c in classes or []}
    if not want_places and not want_classes:
        return base

    out = []
    for s in base:
        cls, place = classify(s)
        if want_classes and cls not in want_classes:
            continue
        if want_places and place not in want_places:
            continue
        out.append(s)
    return out


def universe_summary() -> dict:
    """De quoi peupler les sélecteurs du scanner : ce qui existe RÉELLEMENT.

    Les compteurs sont calculés à partir de l'univers, jamais écrits à la
    main : une place proposée mais vide est une promesse que le scan ne
    tiendra pas.
    """
    counts_place: dict[str, int] = {}
    counts_class: dict[str, int] = {}
    pairs: dict[str, dict[str, int]] = {}
    for s in full_universe():
        cls, place = classify(s)
        counts_place[place] = counts_place.get(place, 0) + 1
        counts_class[cls] = counts_class.get(cls, 0) + 1
        pairs.setdefault(place, {})
        pairs[place][cls] = pairs[place].get(cls, 0) + 1

    return {
        "total": sum(counts_class.values()),
        "places": [
            {"key": k, "label": PLACES[k]["label"], "iso": PLACES[k]["iso"],
             "count": counts_place[k], "classes": pairs.get(k, {})}
            for k in PLACES if counts_place.get(k)
        ],
        "classes": [
            {"key": k, "label": CLASSES[k], "count": counts_class[k]}
            for k in CLASSES if counts_class.get(k)
        ],
        "regions": [
            {"key": k, "places": [p for p in v if counts_place.get(p)]}
            for k, v in REGIONS.items()
        ],
    }
