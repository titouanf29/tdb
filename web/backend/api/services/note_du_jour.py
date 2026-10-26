"""La note du jour de Nimbo, publiée chaque matin dans la Communauté.

Un fil vide fait fuir : « Personne n'a encore écrit » dit que personne ne
reste. Chaque matin de semaine, entre 8 h et 11 h (Paris), Nimbo y publie
ce qui a bougé à la dernière séance sur les grands marchés et les annonces
économiques du jour, puis invite à répondre.

Rien n'est rédigé par un modèle de langage : les chiffres viennent des cours
(fetch_prices) et de l'agenda économique en base (macro_calendar), les
phrases de règles écrites ici. Une seule note par jour.
"""
from __future__ import annotations

import logging
from datetime import datetime, time, timedelta, timezone

from ..database import execute_query
from ..routes._fr import nombre_fr
from ..temps import PARIS

logger = logging.getLogger(__name__)

MARCHES = [
    ("^FCHI", "le CAC 40"), ("^GSPC", "le S&P 500"), ("^IXIC", "le Nasdaq"),
    ("BTC-USD", "le bitcoin"), ("GC=F", "l'or"), ("EURUSD=X", "l'euro face au dollar"),
]
INDICES = {"^FCHI", "^GSPC", "^IXIC"}


def _pct(v: float) -> str:
    return f"{nombre_fr(v, 1, signe=True)} %"


def _minuscule(nom: str) -> str:
    """« Décision de la BCE » devient « décision de la BCE » ; un sigle reste tel quel."""
    return nom if len(nom) > 1 and nom[1].isupper() else nom[:1].lower() + nom[1:]


def _liste(morceaux: list[str]) -> str:
    """« a, b et c »."""
    return morceaux[0] if len(morceaux) == 1 else ", ".join(morceaux[:-1]) + " et " + morceaux[-1]


def rediger(variations: dict[str, float], agenda: list[dict], maintenant: datetime) -> tuple[str, dict]:
    """Le texte de la note et ses données, à partir des chiffres seuls."""
    veille = "vendredi" if maintenant.astimezone(PARIS).weekday() == 0 else "hier"
    indices = [(nom, variations[s]) for s, nom in MARCHES if s in INDICES and s in variations]
    autres = [(nom, variations[s]) for s, nom in MARCHES if s not in INDICES and s in variations]
    phrases = ["Bonjour."]
    if indices:
        morceaux = [f"{nom} a terminé à {_pct(v)}" if i == 0 else f"{nom} à {_pct(v)}" for i, (nom, v) in enumerate(indices)]
        phrases.append(f"{veille.capitalize()}, {_liste(morceaux)}.")
    if autres:
        phrases.append("Sur la dernière journée, "
                       + _liste([f"{nom} fait {_pct(v)}" if i == 0 else f"{nom} {_pct(v)}" for i, (nom, v) in enumerate(autres)]) + ".")
    if variations:
        sym, v = max(variations.items(), key=lambda kv: abs(kv[1]))
        nom = dict(MARCHES)[sym]
        if abs(v) >= 1.5:
            phrases.append(f"Le mouvement le plus net : {nom}, à {_pct(v)}.")
    if agenda:
        phrases.append("Au programme aujourd'hui : " + _liste([f"{_minuscule(a['nom'])} à {a['heure']}" for a in agenda[:3]])
                       + ". Autour de ces annonces, les cours peuvent bouger vite.")
    else:
        phrases.append("Pas d'annonce économique majeure au calendrier aujourd'hui.")
    phrases.append("Et vous, quel actif regardez-vous aujourd'hui ?")
    donnees = {
        "titre": "La note du jour",
        "marches": [{"nom": nom, "variation": round(variations[s], 2)} for s, nom in MARCHES if s in variations],
        "agenda": agenda[:3],
    }
    return " ".join(phrases), donnees


async def _agenda_du_jour(maintenant: datetime) -> list[dict]:
    from .macro.familles import FAMILLES
    jour = maintenant.astimezone(PARIS).date()
    debut = datetime.combine(jour, time(0), tzinfo=PARIS).astimezone(timezone.utc).isoformat()
    fin = datetime.combine(jour + timedelta(days=1), time(0), tzinfo=PARIS).astimezone(timezone.utc).isoformat()
    try:
        rows = await execute_query(
            "SELECT quand, famille FROM macro_calendar WHERE quand >= ? AND quand < ? AND importance = 'High' ORDER BY quand",
            (debut, fin)) or []
    except Exception:
        return []
    vus, out = set(), []
    for r in rows:
        f = FAMILLES.get(r.get("famille") or "")
        if not f or f["nom"] in vus:
            continue
        vus.add(f["nom"])
        h = datetime.fromisoformat(r["quand"]).astimezone(PARIS)
        out.append({"nom": f["nom"], "heure": f"{h.hour} h {h.minute:02d}" if h.minute else f"{h.hour} h"})
    return out


async def deja_publiee(maintenant: datetime) -> bool:
    """Le jour de la note est écrit dans ses données : la vérification ne
    dépend pas de l'heure exacte d'écriture en base."""
    jour = maintenant.astimezone(PARIS).date().isoformat()
    r = await execute_query("SELECT id FROM community_messages WHERE genre = 'note' AND donnees LIKE ? LIMIT 1",
                            (f'%"jour": "{jour}"%',))
    return bool(r)


async def publier_si_besoin(maintenant: datetime | None = None) -> bool:
    """Publie la note du jour si c'est un matin de semaine et qu'elle n'existe pas encore."""
    maintenant = maintenant or datetime.now(timezone.utc)
    paris = maintenant.astimezone(PARIS)
    if paris.weekday() > 4 or not (8 <= paris.hour < 11):
        return False
    from ..routes.community import init_communaute, publier
    from ..routes._prices import fetch_prices
    await init_communaute()
    if await deja_publiee(maintenant):
        return False
    try:
        cours = await fetch_prices([s for s, _ in MARCHES])
    except Exception as e:
        logger.info("note du jour : cours indisponibles (%s)", e)
        return False
    variations = {s: float(c["change"]) for s, c in cours.items() if c and c.get("change") is not None}
    if len(variations) < 3:
        return False
    texte, donnees = rediger(variations, await _agenda_du_jour(maintenant), maintenant)
    # Le lundi, la note annonce aussi le défi de la semaine.
    if paris.weekday() == 0:
        from .defi import defi_de, lundi_de
        d = defi_de(lundi_de(paris.date()))
        texte += f" Le défi de la semaine : {d['titre'].lower()}. {d['texte']}"
        donnees["defi"] = d["titre"]
    donnees["jour"] = paris.date().isoformat()
    await publier(0, texte, "note", donnees)
    return True
