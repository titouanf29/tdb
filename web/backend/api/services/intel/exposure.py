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
