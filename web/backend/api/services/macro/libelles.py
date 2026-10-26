"""
Les annonces en français : libellé, pays, importance, chiffres.

Le calendrier économique est publié en anglais et à l'anglaise (« Core CPI
m/m », « 54.1 », « 201K »). Tout ce que le site en montre passe par ici.
"""
from __future__ import annotations

# Les annonces qui reviennent chaque mois, en clair. Le titre d'origine reste
# affiché à côté : il est celui qu'on retrouve dans la presse.
LIBELLES = [
    ("Non-Farm Employment Change", "Créations d'emplois américaines (NFP)",
     "Le chiffre qui fait le plus bouger le dollar et les indices US : il dit si l'économie embauche, donc si la Fed peut baisser ses taux."),
    ("Unemployment Rate", "Taux de chômage",
     "Un chômage qui monte pousse la banque centrale vers des baisses de taux."),
    ("Core CPI", "Inflation sous-jacente (hors énergie et alimentation)",
     "La mesure que les banques centrales surveillent le plus : une surprise à la hausse éloigne les baisses de taux."),
    ("CPI", "Inflation (indice des prix)",
     "Plus d'inflation que prévu, c'est des taux plus hauts plus longtemps : mauvais pour les actions de croissance, bon pour la devise."),
    ("Core PCE", "Inflation PCE sous-jacente",
     "L'indicateur d'inflation préféré de la Fed."),
    ("PPI", "Prix à la production",
     "L'inflation en amont, qui annonce souvent celle des prix à la consommation."),
    ("Federal Funds Rate", "Décision de taux de la Fed",
     "Le rendez-vous le plus important du mois pour tous les marchés."),
    ("FOMC", "Fed (FOMC)",
     "Tout ce que dit la Fed sur ses prochains taux déplace le dollar, l'or et les indices."),
    ("Main Refinancing Rate", "Décision de taux de la BCE",
     "Le taux directeur de la zone euro : il fait bouger l'euro et les banques européennes."),
    ("ECB", "BCE",
     "Les mots de la BCE sur l'inflation et les taux font bouger l'euro et les actions européennes."),
    ("Official Bank Rate", "Décision de taux de la Banque d'Angleterre", "Fait bouger la livre et le FTSE."),
    ("BOJ", "Banque du Japon", "Fait bouger le yen, et par ricochet tous les marchés quand elle surprend."),
    ("GDP", "Croissance (PIB)", "La santé de l'économie sur le trimestre."),
    ("Retail Sales", "Ventes au détail", "La consommation des ménages, moteur de l'économie."),
    ("ISM Manufacturing PMI", "Indice ISM manufacturier (États-Unis)", "Au-dessus de 50, l'industrie accélère ; en dessous, elle ralentit."),
    ("ISM Services PMI", "Indice ISM des services (États-Unis)", "Le secteur qui pèse le plus dans l'économie américaine."),
    ("Manufacturing PMI", "Indice PMI manufacturier", "Au-dessus de 50, l'industrie accélère ; en dessous, elle ralentit."),
    ("Services PMI", "Indice PMI des services", "Le moral des entreprises de services."),
    ("Unemployment Claims", "Inscriptions hebdomadaires au chômage (US)", "Le thermomètre le plus rapide du marché du travail américain."),
    ("JOLTS", "Offres d'emploi (JOLTS)", "Le nombre de postes à pourvoir aux États-Unis."),
    ("Consumer Confidence", "Confiance des consommateurs", "Ce que les ménages pensent de l'économie."),
    ("Consumer Sentiment", "Moral des ménages (Michigan)", "Ce que les ménages pensent de l'économie, et de l'inflation à venir."),
    ("German Ifo", "Climat des affaires allemand (Ifo)", "Le baromètre de la première économie européenne."),
    ("ZEW", "Sentiment économique (ZEW)", "Le moral des investisseurs sur l'Allemagne."),
    ("Crude Oil Inventories", "Stocks de pétrole américains", "Des stocks qui baissent plus que prévu font monter le pétrole."),
    ("Policy Rate", "Décision de taux", "La banque centrale fixe le coût de l'argent dans sa devise."),
    ("Monetary Policy Assessment", "Évaluation de politique monétaire", "Le communiqué qui accompagne la décision de taux."),
    ("Press Conference", "Conférence de presse", "Les réponses du gouverneur précisent souvent la suite, et déplacent la devise."),
    ("Employment Change", "Variation de l'emploi", "Le nombre d'emplois créés ou perdus sur la période."),
    ("Trade Balance", "Balance commerciale", "La différence entre exportations et importations."),
    ("Speaks", "Discours", "Un discours peut déplacer le marché s'il laisse entendre un changement de politique."),
    ("Bank Holiday", "Jour férié", "Marché fermé ou peu actif dans ce pays."),
]
PAYS = {"USD": "États-Unis", "EUR": "Zone euro", "GBP": "Royaume-Uni", "JPY": "Japon",
        "CHF": "Suisse", "CAD": "Canada", "AUD": "Australie", "NZD": "Nouvelle-Zélande",
        "CNY": "Chine"}
IMPORTANCE = {"High": "forte", "Medium": "moyenne", "Low": "faible", "Holiday": "férié"}


QUALIFICATIFS = [("French ", "France"), ("German ", "Allemagne"), ("Spanish ", "Espagne"),
                 ("Italian ", "Italie"), ("Flash ", "première estimation"), ("Revised ", "révisé"),
                 ("Prelim ", "préliminaire"), ("Final ", "définitif")]


def libelle(titre: str) -> tuple[str, str]:
    for motif, fr, pourquoi in LIBELLES:
        if motif.lower() in titre.lower():
            if motif == "Speaks":
                qui = titre.replace("Speaks", "").strip()
                return f"Discours : {qui}", pourquoi
            precisions = [mot for cle, mot in QUALIFICATIFS if cle in f"{titre} "]
            return (f"{fr} ({', '.join(precisions)})" if precisions else fr), pourquoi
    return titre, ""



def chiffre(v) -> str | None:
    """« 54.1 » → « 54,1 », « 201K » → « 201 k » : le calendrier est publié à l'anglaise."""
    if not v:
        return None
    v = str(v).replace(".", ",")
    v = v.replace("%", "\u202f%")
    for suffixe, fr in (("K", "\u202fk"), ("M", "\u202fM"), ("B", "\u202fMd")):
        if v.endswith(suffixe):
            v = v[:-1] + fr
    return v




# ── Une annonce, telle que l'écran la montre ──────────────────────────────

from datetime import datetime, timezone  # noqa: E402
from zoneinfo import ZoneInfo  # noqa: E402

from .familles import FAMILLES  # noqa: E402

PARIS = ZoneInfo("Europe/Paris")
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]


def presenter(r: dict) -> dict:
    q = datetime.fromisoformat(str(r["quand"]).replace("Z", "+00:00"))
    if q.tzinfo is None:
        q = q.replace(tzinfo=timezone.utc)
    quand = q.astimezone(PARIS)
    fr, pourquoi = libelle(r["titre"])
    fam = FAMILLES.get(r.get("famille") or "")
    if fam and fam["type"] == "decision":
        fr, pourquoi = fam["nom"], fam["explication"]
    elif fam and not pourquoi:
        pourquoi = fam["explication"]
    res = r.get("resultat") or {}
    return {
        "id": r.get("id"),
        "titre": fr,
        "titre_origine": r["titre"],
        "pourquoi": pourquoi,
        "famille": r.get("famille"),
        "famille_nom": fam["nom"] if fam else None,
        "banque": r.get("banque"),
        "pays": r["pays"],
        "pays_nom": PAYS.get(r["pays"], r["pays"]),
        "quand": quand.isoformat(),
        "jour": f"{JOURS[quand.weekday()]} {quand.day}",
        "date_longue": f"{JOURS[quand.weekday()]} {quand.day} {MOIS[quand.month - 1]}",
        "heure": quand.strftime("%H:%M") if (quand.hour, quand.minute) != (0, 0) else "journée",
        "importance": IMPORTANCE.get(r.get("importance") or "", "faible"),
        "prevision": chiffre(r.get("prevision")),
        "precedent": chiffre(r.get("precedent")),
        "officiel": bool(r.get("officiel")),
        "source": r.get("source"),
        "note": r.get("note"),
        "statut": r.get("statut") or "a_venir",
        "resume": res.get("resume"),
        "lecture": (res.get("lecture") or {}).get("sens"),
    }
