"""
Du secteur exposé à l'ACTIF que nous suivons.

La chaîne de transmission s'arrête sur « le transport aérien est exposé ».
C'est vrai et inutilisable : il faut savoir QUELS actifs de notre univers sont
concernés, sinon le moteur produit de la culture générale.

La table est écrite à la main, là encore, et pour la même raison. Deviner le
secteur d'un symbole à partir de son nom donnerait « Delta Air Lines » dans
« transport » et raterait « LUV », « RYA.L » ou « AF.PA ». Pire : une erreur
serait invisible, puisqu'elle se contenterait de ne rien rapprocher.

LA COUVERTURE EST PARTIELLE ET ASSUMÉE. Elle porte les actifs pour lesquels le
lien est évident et vérifiable. Un actif absent de la table n'est pas relié —
ce qui est préférable à un rattachement approximatif que personne ne pourrait
contredire.
"""

# secteur / thème -> symboles de notre univers
#
# Un symbole peut apparaître dans plusieurs cibles : un pétrolier est exposé à
# l'énergie ET au pétrole, et les deux chaînes doivent pouvoir le trouver.
EXPOSITION: dict[str, tuple[str, ...]] = {
    "PETROLE": (
        "CL=F", "BZ=F",
        "XOM", "CVX", "COP", "OXY", "SLB", "HAL", "PSX", "VLO", "MPC",
        "SHEL.L", "BP.L", "TTE.PA", "ENI.MI", "EQNR.OL",
    ),
    "ENERGIE": (
        "XOM", "CVX", "COP", "OXY", "SLB", "PSX", "VLO", "MPC", "NG=F",
        "SHEL.L", "BP.L", "TTE.PA", "ENGI.PA", "ENI.MI", "RWE.DE", "EOAN.DE",
    ),
    "OR": ("GC=F", "SI=F", "NEM", "GOLD", "AEM"),
    "TRANSPORT": (
        # Aérien
        "DAL", "UAL", "AAL", "LUV", "AF.PA", "LHA.DE", "IAG.L", "RYA.L",
        # Maritime et logistique
        "FDX", "UPS", "MAERSK-B.CO", "DPW.DE", "ZIM", "MATX",
    ),
    "BANQUES": (
        "JPM", "BAC", "C", "WFC", "GS", "MS",
        "BNP.PA", "ACA.PA", "GLE.PA", "DBK.DE", "HSBA.L", "BARC.L", "SAN.MC",
        "UCG.MI", "ISP.MI", "UBSG.SW",
    ),
    "TECH": (
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AMD", "INTC", "AVGO",
        "TSM", "ASML.AS", "SAP.DE", "IFX.DE", "STMPA.PA", "CAP.PA",
    ),
    "IMMOBILIER": ("PLD", "AMT", "SPG", "O", "VNA.DE", "URW.PA", "LI.PA"),
}

# INFLATION et TAUX n'ont volontairement PAS de panier. Ce sont des variables
# macro : elles n'ont pas d'actifs « exposés » mais des conséquences, portées
# par d'autres règles de transmission. Leur donner une liste d'actifs a produit
# la phrase « inflation en hausse : favorable au S&P 500 », qui est fausse dans
# le sens le plus trompeur — l'écran recommandait ce que le mécanisme
# déconseille.


# ── Pourquoi CET actif, et ce que ça lui fait ────────────────────────────────
#
# La chaîne de transmission explique comment un fait atteint un SECTEUR. Elle
# ne dit pas ce qu'il arrive à l'actif qu'on a sous les yeux, et un écran qui
# affiche « plutôt favorable » sans le dire demande au lecteur de faire
# lui-même le dernier pas — celui qui compte, et le seul qu'il ne sait pas
# encore faire s'il débute.
#
# Trois phrases par exposition, et chacune répond à une question différente :
#
#   POURQUOI     ce qui rattache cet actif au panier — son métier ;
#   EFFET        ce que l'événement lui fait, dans le sens observé ;
#   SURVEILLER   ce qu'il faut regarder pour voir si la chaîne s'enclenche
#                vraiment, ou pour constater qu'elle ne s'enclenche pas.
#
# La troisième est celle qui empêche le panneau de devenir un oracle : elle
# donne au lecteur de quoi CONTREDIRE ce qu'on vient de lui dire.

# Formulées pour se lire APRÈS « il est concerné parce qu' » : c'est la place
# qu'elles occupent à l'écran, et répéter « cet actif » y donnait « Pourquoi
# cet actif : cet actif appartient au secteur de l'énergie ».
POURQUOI: dict[str, str] = {
    "PETROLE": "il tire son revenu du prix du brut",
    "ENERGIE": "il appartient au secteur de l'énergie",
    "OR": "il fait partie des valeurs refuges",
    "TRANSPORT": "il transporte des biens ou des personnes, et le carburant "
                 "est l'un de ses premiers postes de coût",
    "BANQUES": "c'est une banque, dont le métier est de prêter",
    "TECH": "c'est une valeur de croissance, dont l'essentiel des bénéfices "
            "est attendu dans plusieurs années",
    "IMMOBILIER": "il vit de l'immobilier, qui se finance à crédit",
}

EFFET: dict[tuple[str, int], str] = {
    ("PETROLE", +1): "un baril plus cher gonfle son chiffre d'affaires sans "
                     "augmenter ses coûts d'extraction : la marge s'élargit",
    ("PETROLE", -1): "un baril moins cher comprime la marge, les coûts "
                     "d'extraction ne baissant pas avec lui",
    ("ENERGIE", +1): "l'énergie se vend plus cher, ce qui se retrouve "
                     "directement dans les revenus du secteur",
    ("ENERGIE", -1): "l'énergie se vend moins cher et les revenus du secteur "
                     "suivent",
    ("OR", +1): "quand le risque monte, les capitaux cherchent un abri et l'or "
                "est le premier servi",
    ("OR", -1): "quand le risque retombe, l'or perd de son attrait et les "
                "capitaux repartent vers les actifs rémunérateurs",
    ("TRANSPORT", +1): "moins de coût de carburant ou plus de volumes à "
                       "déplacer : les deux jouent en faveur des marges",
    ("TRANSPORT", -1): "le carburant et les détours renchérissent la course, "
                       "et ces coûts se répercutent lentement sur les tarifs",
    ("BANQUES", +1): "une banque gagne sur l'écart entre ce qu'elle prête et "
                     "ce qu'elle rémunère ; cet écart s'élargit",
    ("BANQUES", -1): "moins de crédit distribué ou des flux coupés, c'est "
                     "moins de revenus et plus de risque de défaut",
    ("TECH", +1): "un financement moins cher revalorise des bénéfices attendus "
                  "loin dans le temps",
    ("TECH", -1): "un financement plus cher — ou des composants qui circulent "
                  "moins bien — fait baisser la valeur d'aujourd'hui de "
                  "bénéfices attendus loin dans le temps",
    ("IMMOBILIER", +1): "un crédit moins cher soutient la demande et les "
                        "valorisations",
    ("IMMOBILIER", -1): "un crédit plus cher réduit le nombre d'acheteurs "
                        "solvables et pèse sur les valorisations",
}

SURVEILLER: dict[str, str] = {
    "PETROLE": "le cours du brut : sans mouvement du baril, la chaîne n'a pas "
               "démarré",
    "ENERGIE": "le cours du brut et du gaz, qui commandent les revenus du "
               "secteur",
    "OR": "le cours de l'or et la volatilité des actions, qui montent ensemble "
          "quand la fuite vers l'abri est réelle",
    "TRANSPORT": "le prix du carburant, et les surcharges annoncées par les "
                 "transporteurs — c'est là que le coût devient visible",
    "BANQUES": "les taux à deux et dix ans : c'est leur écart qui fait la "
               "marge des banques",
    "TECH": "les taux longs, et le périmètre exact des mesures douanières "
            "quand il y en a",
    "IMMOBILIER": "les taux des crédits immobiliers, qui réagissent avec "
                  "quelques semaines de retard",
}


def expliquer(cible: str, sens: int) -> dict:
    """Ce que cette exposition veut dire pour l'actif, en clair.

    Rend des chaînes vides plutôt que d'inventer quand la combinaison n'est
    pas prévue : une phrase approximative sur le métier d'un actif est pire
    qu'un silence, parce qu'elle a l'air de venir d'un dossier.
    """
    return {
        "pourquoi": POURQUOI.get(cible, ""),
        "effet": EFFET.get((cible, sens), ""),
        "a_surveiller": SURVEILLER.get(cible, ""),
    }


def actifs_pour(cible: str, univers: set[str] | None = None) -> list[str]:
    """Les symboles exposés à une cible, restreints à l'univers quand il est
    fourni : proposer un actif que le scanner ne connaît pas serait une
    promesse que le reste du site ne peut pas tenir."""
    liste = EXPOSITION.get(cible, ())
    if univers is None:
        return list(liste)
    return [s for s in liste if s in univers]


def resoudre(exposes: dict, univers: set[str] | None = None) -> list[dict]:
    """Transforme les cibles d'une analyse de transmission en actifs concrets.

    Trié par solidité de la chaîne qui les désigne : ce qui repose sur un
    raisonnement court passe devant ce qui repose sur six étapes.
    """
    out = []
    for cible, d in exposes.items():
        actifs = actifs_pour(cible, univers)
        if not actifs:
            continue
        out.append({
            "cible": cible,
            "sens": d.get("sens", 0),
            "conteste": d.get("conteste", False),
            "solidite": d.get("poids", 0.0),
            "via": d.get("via", []),
            "actifs": actifs[:12],
            "total_actifs": len(actifs),
        })
    out.sort(key=lambda x: x["solidite"], reverse=True)
    return out
