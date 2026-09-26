"""
Les annonces macroéconomiques, par famille, et ce qu'elles font à chaque actif.

UNE ANNONCE N'A PAS UN EFFET, ELLE EN A PLUSIEURS, DE SIGNES OPPOSÉS. Une Fed
plus dure que prévu fait monter le dollar et baisser l'euro/dollar ; elle
pèse sur les valeurs de croissance, l'immobilier, l'or et la crypto ; elle
laisse les banques partagées entre des marges qui s'élargissent et un crédit
qui ralentit. Dire « la Fed est une mauvaise nouvelle pour les marchés » est
faux pour la moitié des actifs.

DEUX COUCHES, ET LA SECONDE COMMANDE. Ce fichier décrit le MÉCANISME — le sens
attendu, groupe par groupe, et pourquoi. `mesure.py` mesure ensuite, actif par
actif, ce qui s'est réellement passé les jours d'annonce. Quand la mesure est
fiable, c'est elle qu'on affiche ; quand elle contredit le mécanisme, on le
dit ; quand elle n'existe pas, on présente le mécanisme comme tel — un
raisonnement, pas un constat.

LA CONVENTION DE SIGNE. Tout est exprimé pour une surprise « restrictive »
(+1) : une banque centrale plus dure qu'attendu, une inflation plus forte, un
emploi plus solide — tout ce qui pousse les taux vers le haut. Une surprise
« accommodante » (−1) inverse chaque signe.
"""
from __future__ import annotations

import re

# ── Les familles ─────────────────────────────────────────────────────────
#
# `banque` : la banque centrale dont l'annonce informe la politique. C'est
# elle qui fixe les groupes d'actifs concernés et le sens de l'effet.
# `inverse` : une hausse du chiffre est une surprise ACCOMMODANTE (le chômage).
# `motifs` : les titres du calendrier ForexFactory rattachés à la famille, du
# plus précis au plus large ; le premier qui correspond l'emporte.

FAMILLES: dict[str, dict] = {
    "FED_DECISION": {
        "nom": "Décision de taux de la Fed",
        "banque": "FED", "type": "decision", "pays": "USD",
        "explication": "La Réserve fédérale fixe le coût de l'argent en dollars. Sa décision, et surtout ce "
                       "qu'elle laisse entendre des prochaines réunions, déplace le dollar, les taux, les "
                       "actions, l'or et la crypto dans les minutes qui suivent.",
        "restrictive": "taux relevés, ou baisses futures moins nombreuses qu'espéré",
        "motifs": ["Federal Funds Rate", "FOMC Statement", "FOMC Press Conference", "FOMC Economic Projections"],
        "presse": ["fed", "fomc", "federal reserve", "powell", "rate"],
    },
    "BCE_DECISION": {
        "nom": "Décision de taux de la BCE",
        "banque": "BCE", "type": "decision", "pays": "EUR",
        "explication": "La Banque centrale européenne fixe le coût de l'argent en euros. Sa décision fait "
                       "bouger l'euro, les banques européennes, les taux des États et les actions de la zone.",
        "restrictive": "taux relevés, ou ton plus ferme sur l'inflation",
        "motifs": ["Main Refinancing Rate", "Monetary Policy Statement", "ECB Press Conference", "Deposit Facility Rate"],
        "presse": ["ecb", "bce", "lagarde", "european central bank", "banque centrale européenne"],
    },
    "BOE_DECISION": {
        "nom": "Décision de taux de la Banque d'Angleterre",
        "banque": "BOE", "type": "decision", "pays": "GBP",
        "explication": "Elle fixe le coût de l'argent en livres : la livre et le FTSE réagissent en premier.",
        "restrictive": "taux relevés, ou vote plus ferme qu'attendu",
        "motifs": ["Official Bank Rate", "MPC Official Bank Rate Votes", "BOE Monetary Policy Report"],
        "presse": ["bank of england", "boe", "bailey"],
    },
    "BOJ_DECISION": {
        "nom": "Décision de la Banque du Japon",
        "banque": "BOJ", "type": "decision", "pays": "JPY",
        "explication": "Longtemps la seule grande banque centrale à taux nuls : chacun de ses gestes fait "
                       "bouger le yen, et par ricochet les marchés qui empruntent en yen.",
        "restrictive": "taux relevés, ou fin annoncée d'un soutien",
        "motifs": ["BOJ Policy Rate", "Monetary Policy Statement", "BOJ Press Conference"],
        "presse": ["bank of japan", "boj", "ueda"],
    },
    "US_CPI": {
        "nom": "Inflation américaine (CPI)",
        "banque": "FED", "type": "statistique", "pays": "USD",
        "explication": "La hausse des prix aux États-Unis, publiée chaque mois. C'est le chiffre qui décide le "
                       "plus directement de ce que fera la Fed : une inflation plus forte que prévu éloigne les "
                       "baisses de taux.",
        "restrictive": "inflation plus forte que prévu",
        "motifs": ["Core CPI", "CPI m/m", "CPI y/y"],
        "presse": ["consumer price", "cpi", "inflation"],
    },
    "US_PCE": {
        "nom": "Inflation PCE (États-Unis)",
        "banque": "FED", "type": "statistique", "pays": "USD",
        "explication": "La mesure de l'inflation que la Fed utilise pour sa cible de 2 %.",
        "restrictive": "inflation plus forte que prévu",
        "motifs": ["Core PCE Price Index", "PCE Price Index"],
        "presse": ["pce", "personal consumption", "inflation"],
    },
    "US_PPI": {
        "nom": "Prix à la production (États-Unis)",
        "banque": "FED", "type": "statistique", "pays": "USD",
        "explication": "L'inflation en amont, payée par les entreprises : elle annonce souvent celle des "
                       "prix à la consommation.",
        "restrictive": "prix plus forts que prévu",
        "motifs": ["Core PPI", "PPI m/m"],
        "presse": ["producer price", "ppi"],
    },
    "US_EMPLOI": {
        "nom": "Emploi américain (NFP)",
        "banque": "FED", "type": "statistique", "pays": "USD",
        "explication": "Les créations d'emplois du mois, publiées le premier vendredi. Un marché du travail "
                       "solide laisse la Fed garder des taux hauts ; un marché qui faiblit la pousse à baisser.",
        "restrictive": "plus d'emplois créés que prévu",
        "motifs": ["Non-Farm Employment Change", "Average Hourly Earnings"],
        "presse": ["payroll", "jobs report", "nonfarm", "employment"],
    },
    "US_CHOMAGE": {
        "nom": "Chômage américain",
        "banque": "FED", "type": "statistique", "pays": "USD", "inverse": True,
        "explication": "Un chômage qui monte pousse la Fed vers des baisses de taux.",
        "restrictive": "chômage plus bas que prévu",
        "motifs": ["Unemployment Rate", "Unemployment Claims", "JOLTS Job Openings"],
        "presse": ["unemployment", "jobless", "claims"],
    },
    "US_ACTIVITE": {
        "nom": "Activité américaine",
        "banque": "FED", "type": "statistique", "pays": "USD",
        "explication": "Croissance, consommation et moral des entreprises : une économie plus forte que prévu "
                       "retarde les baisses de taux.",
        "restrictive": "activité plus forte que prévu",
        "motifs": ["Advance GDP", "Prelim GDP", "Final GDP", "Retail Sales", "ISM Manufacturing PMI",
                   "ISM Services PMI", "Flash Manufacturing PMI", "Flash Services PMI", "Durable Goods Orders",
                   "Consumer Confidence", "UoM Consumer Sentiment", "Philly Fed Manufacturing Index",
                   "Empire State Manufacturing Index"],
        "presse": ["gdp", "retail sales", "ism", "pmi", "economy"],
    },
    "EZ_INFLATION": {
        "nom": "Inflation en zone euro",
        "banque": "BCE", "type": "statistique", "pays": "EUR",
        "explication": "La hausse des prix en zone euro, et en Allemagne ou en France qui la publient avant. "
                       "C'est le chiffre qui guide la BCE.",
        "restrictive": "inflation plus forte que prévu",
        "motifs": ["CPI Flash Estimate", "Core CPI Flash Estimate", "German Prelim CPI", "French Prelim CPI",
                   "Spanish Flash CPI", "Italian Prelim CPI", "Final CPI", "Final Core CPI"],
        "presse": ["euro zone inflation", "eurozone inflation", "inflation zone euro", "hicp"],
    },
    "EZ_ACTIVITE": {
        "nom": "Activité en zone euro",
        "banque": "BCE", "type": "statistique", "pays": "EUR",
        "explication": "Croissance et moral des entreprises européennes : une économie qui faiblit pousse la "
                       "BCE vers des baisses de taux.",
        "restrictive": "activité plus forte que prévu",
        "motifs": ["Flash Manufacturing PMI", "Flash Services PMI", "German Ifo Business Climate",
                   "German ZEW Economic Sentiment", "Prelim Flash GDP", "Flash GDP", "German Prelim GDP",
                   "Unemployment Rate"],
        "presse": ["eurozone", "zone euro", "pmi", "ifo", "zew"],
    },
    "UK_INFLATION": {
        "nom": "Inflation britannique",
        "banque": "BOE", "type": "statistique", "pays": "GBP",
        "explication": "Le chiffre qui guide la Banque d'Angleterre.",
        "restrictive": "inflation plus forte que prévu",
        "motifs": ["CPI y/y", "Core CPI y/y"],
        "presse": ["uk inflation", "british inflation"],
    },
    "DISCOURS": {
        "nom": "Discours de banquier central",
        "banque": None, "type": "discours", "pays": None,
        "explication": "Un discours ne change rien par lui-même ; il déplace le marché quand il laisse "
                       "entendre un changement de cap que la dernière décision ne disait pas.",
        "restrictive": "ton plus ferme qu'attendu sur l'inflation",
        "motifs": ["Speaks", "Testifies"],
        "presse": [],
    },
}

BANQUE_DES_DISCOURS = [
    (re.compile(r"\bFed\b|FOMC|Powell", re.I), "FED"),
    (re.compile(r"ECB|Lagarde|Buba", re.I), "BCE"),
    (re.compile(r"BOE|Bailey|MPC", re.I), "BOE"),
    (re.compile(r"BOJ|Ueda", re.I), "BOJ"),
]


def famille_de(titre: str, pays: str) -> str | None:
    """La famille d'une ligne du calendrier, ou None si elle n'en a pas."""
    t = titre or ""
    for cle, f in FAMILLES.items():
        if f["pays"] and f["pays"] != pays:
            continue
        if cle == "DISCOURS":
            continue
        for motif in f["motifs"]:
            if motif.lower() in t.lower():
                # « CPI y/y » existe aux États-Unis ET au Royaume-Uni : le pays
                # a déjà tranché plus haut. « Unemployment Rate » existe en zone
                # euro : l'ordre des familles met les américaines d'abord, et
                # le filtre de pays écarte celles qui ne s'appliquent pas.
                return cle
    if "Speaks" in t or "Testifies" in t:
        return "DISCOURS"
    return None


def banque_du_discours(titre: str) -> str | None:
    for motif, banque in BANQUE_DES_DISCOURS:
        if motif.search(titre or ""):
            return banque
    return None


# ── Les groupes d'actifs ──────────────────────────────────────────────────

GROUPES_SYMBOLES: dict[str, tuple[str, ...]] = {
    "croissance_us": ("AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "AMD", "AVGO",
                      "NFLX", "ADBE", "CRM", "ORCL", "INTC", "TSM", "PLTR", "SHOP", "UBER", "COIN",
                      "^IXIC", "^NDX", "QQQ"),
    "indices_us": ("^GSPC", "^DJI", "^RUT", "SPY", "DIA", "IWM"),
    "immobilier": ("PLD", "AMT", "SPG", "O", "XLRE", "VNA.DE", "URW.PA", "LI.PA", "COV.PA", "GFC.PA"),
    "services_publics": ("XLU", "NEE", "DUK", "SO", "D", "ENGI.PA", "RWE.DE", "EOAN.DE", "IBE.MC",
                         "ENEL.MI", "VIE.PA"),
    "obligations": ("TLT", "IEF", "BND", "AGG"),
    "banques_us": ("JPM", "BAC", "C", "WFC", "GS", "MS", "XLF"),
    "banques_eu": ("BNP.PA", "ACA.PA", "GLE.PA", "DBK.DE", "CBK.DE", "SAN.MC", "BBVA.MC", "UCG.MI",
                   "ISP.MI", "INGA.AS", "HSBA.L", "BARC.L", "LLOY.L"),
    "metaux_precieux": ("GC=F", "SI=F", "NEM", "GOLD", "AEM", "GLD", "SLV"),
    "energie": ("CL=F", "BZ=F", "NG=F", "XOM", "CVX", "COP", "OXY", "SLB", "TTE.PA", "SHEL.L", "BP.L",
                "ENI.MI", "EQNR.OL", "REP.MC"),
    "exportateurs_eu": ("MC.PA", "RMS.PA", "KER.PA", "OR.PA", "AIR.PA", "SAF.PA", "RI.PA", "CDI.PA",
                        "ASML.AS", "SAP.DE", "SIE.DE", "VOW3.DE", "BMW.DE", "MBG.DE", "PUM.DE", "ADS.DE"),
    "indices_eu": ("^FCHI", "^GDAXI", "^STOXX50E", "^SBF120", "^AEX", "^IBEX", "^FTSEMIB"),
    "indices_uk": ("^FTSE",),
    "indices_jp": ("^N225",),
}


def groupes_de(symbole: str) -> list[str]:
    """Les groupes d'un actif — souvent plusieurs, du plus précis au plus large."""
    s = (symbole or "").upper()
    out = [g for g, syms in GROUPES_SYMBOLES.items() if s in syms]
    if s.endswith("-USD") or s.endswith("-EUR"):
        out.append("crypto")
    if s.endswith("=X"):
        out.append("devise")
    if not out:
        if s.endswith((".PA", ".DE", ".AS", ".MI", ".MC", ".BR", ".LS")):
            out.append("actions_eu")
        elif s.endswith(".L"):
            out.append("actions_uk")
        elif "." not in s and not s.startswith("^") and not s.endswith("=F"):
            out.append("actions_us")
    return out


# ── Le mécanisme ──────────────────────────────────────────────────────────
#
# Pour une surprise RESTRICTIVE (+1) de chaque banque centrale : le sens
# attendu par groupe (+1 hausse, −1 baisse, 0 partagé), sa force (1 faible,
# 2 net), et la raison, écrite pour être lue par quelqu'un qui débute.

MECANISMES: dict[str, dict[str, tuple[int, int, str]]] = {
    "FED": {
        "croissance_us": (-1, 2, "Leurs bénéfices sont attendus loin dans le temps : quand l'argent coûte plus cher, ces bénéfices futurs valent moins aujourd'hui."),
        "indices_us": (-1, 2, "Des taux plus hauts renchérissent le crédit des entreprises et rendent les obligations plus attractives que les actions."),
        "actions_us": (-1, 1, "Des taux plus hauts pèsent en général sur les actions américaines, plus ou moins selon le secteur."),
        "immobilier": (-1, 2, "Secteur très endetté, et dont les loyers se comparent au rendement des obligations : il souffre directement des taux hauts."),
        "services_publics": (-1, 2, "Achetés pour leur dividende régulier : quand les obligations rapportent davantage, ce dividende devient moins attractif."),
        "obligations": (-1, 2, "Quand les taux montent, le prix des obligations déjà émises baisse mécaniquement."),
        "banques_us": (0, 1, "Les banques sont partagées : des taux plus hauts élargissent leur marge sur les prêts, mais ralentissent le crédit et fragilisent les emprunteurs."),
        "metaux_precieux": (-1, 2, "L'or ne rapporte aucun intérêt : quand les taux montent, le garder coûte plus cher, et le dollar fort le renchérit pour le reste du monde."),
        "crypto": (-1, 2, "Actif spéculatif, sans revenu : il souffre quand l'argent devient cher et que le dollar se renforce."),
        "energie": (0, 1, "Peu d'effet direct sur l'énergie : le pétrole dépend d'abord de l'offre et de la demande mondiales."),
        "indices_eu": (-1, 1, "Par contagion : Wall Street donne le ton, mais l'effet est plus faible et arrive le lendemain, l'Europe étant fermée à l'annonce."),
        "exportateurs_eu": (0, 1, "Les exportateurs européens sont partagés : Wall Street en baisse pèse, mais un dollar fort rend leurs ventes aux États-Unis plus rentables une fois converties en euros."),
        "banques_eu": (0, 1, "Les banques européennes sont peu concernées directement : leurs marges dépendent des taux de la BCE."),
        "actions_eu": (-1, 1, "Effet indirect et faible, par contagion de Wall Street le lendemain."),
        "indices_uk": (-1, 1, "Effet indirect, par contagion de Wall Street."),
        "indices_jp": (-1, 1, "Effet indirect ; le yen affaibli face au dollar soutient toutefois les exportateurs japonais."),
        "devise": (0, 0, ""),  # traité par la devise elle-même, voir `effet_devise`
    },
    "BCE": {
        "banques_eu": (+1, 2, "Des taux plus hauts élargissent la marge entre ce qu'elles paient sur les dépôts et ce qu'elles gagnent sur les prêts."),
        "indices_eu": (-1, 1, "Le crédit plus cher freine l'économie de la zone ; l'effet est atténué par le poids des banques dans les indices."),
        "exportateurs_eu": (-1, 2, "Un euro plus fort rend leurs produits plus chers hors de la zone euro, et réduit la valeur en euros de leurs ventes à l'étranger."),
        "actions_eu": (-1, 1, "Le crédit plus cher pèse en général sur les actions européennes."),
        "immobilier": (-1, 2, "Secteur endetté, directement pénalisé par des taux plus hauts."),
        "services_publics": (-1, 2, "Leur dividende devient moins attractif quand les obligations d'État rapportent davantage."),
        "croissance_us": (0, 1, "Peu d'effet direct sur les valeurs de croissance américaines : c'est la Fed qui compte pour elles."),
        "indices_us": (0, 1, "Peu d'effet direct : c'est la Fed qui compte pour Wall Street."),
        "actions_us": (0, 1, "Peu d'effet direct sur les actions américaines : c'est la Fed qui compte pour elles."),
        "metaux_precieux": (+1, 1, "Effet faible : un euro fort, c'est un dollar plus faible, ce qui soutient légèrement l'or coté en dollars."),
        "crypto": (0, 1, "Peu d'effet direct sur la crypto, qui suit surtout le dollar et la Fed."),
        "energie": (0, 1, "Peu d'effet direct sur l'énergie."),
        "devise": (0, 0, ""),
    },
    "BOE": {
        "indices_uk": (-1, 2, "Le FTSE réunit surtout des multinationales : une livre plus forte réduit la valeur en livres de leurs ventes à l'étranger."),
        "actions_uk": (-1, 1, "Le crédit plus cher pèse sur les actions britanniques."),
        "banques_eu": (0, 1, "Les banques britanniques voient leurs marges s'élargir ; peu d'effet sur celles de la zone euro."),
        "devise": (0, 0, ""),
    },
    "BOJ": {
        "indices_jp": (-1, 2, "Un yen plus fort pénalise les grands exportateurs japonais qui dominent le Nikkei."),
        "crypto": (-1, 1, "Effet possible mais indirect : des taux japonais plus hauts peuvent pousser à rembourser des emprunts en yen qui finançaient des placements risqués."),
        "devise": (0, 0, ""),
    },
}

# La devise de chaque banque centrale. Une paire se lit « base/cotation » :
# EURUSD=X monte quand l'euro se renforce contre le dollar.
DEVISE_DE = {"FED": "USD", "BCE": "EUR", "BOE": "GBP", "BOJ": "JPY"}


def paire(symbole: str) -> tuple[str, str] | None:
    s = (symbole or "").upper()
    if not s.endswith("=X"):
        return None
    core = s[:-2]
    if len(core) == 6:
        return core[:3], core[3:]
    if len(core) == 3:           # « JPY=X » : dollar contre yen
        return "USD", core
    return None


def effet_devise(banque: str, symbole: str) -> tuple[int, int, str] | None:
    """Une surprise restrictive renforce la devise de la banque centrale."""
    p = paire(symbole)
    dev = DEVISE_DE.get(banque)
    if not p or not dev or dev not in p:
        return None
    base, cot = p
    sens = +1 if base == dev else -1
    nom_dev = {"USD": "le dollar", "EUR": "l'euro", "GBP": "la livre", "JPY": "le yen"}[dev]
    return (sens, 2, f"Des taux plus hauts attirent les capitaux vers {nom_dev}, qui se renforce : "
                     f"la paire {'monte' if sens > 0 else 'baisse'}.")


def mecanisme(banque: str | None, symbole: str) -> dict | None:
    """Le sens attendu de cet actif pour une surprise restrictive de cette banque."""
    if not banque:
        return None
    dev = effet_devise(banque, symbole)
    if dev:
        s, f, pourquoi = dev
        return {"sens": s, "force": f, "pourquoi": pourquoi, "groupe": "devise"}
    table = MECANISMES.get(banque, {})
    for g in groupes_de(symbole):
        if g in table and g != "devise":
            s, f, pourquoi = table[g]
            return {"sens": s, "force": f, "pourquoi": pourquoi, "groupe": g}
    return None
