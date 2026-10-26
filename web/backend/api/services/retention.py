"""Les chiffres de la rétention, calculés à partir du journal des gestes.

Les définitions, pour qu'on lise tous la même chose :

  · ACTIVATION : la part des inscrits qui ont fait une analyse ET pris une
    position dans les 24 heures suivant l'inscription ;
  · RETOUR À J1 : la part des inscrits revenus le lendemain ;
  · RETOUR À J7 : revenus entre le 6e et le 8e jour ;
  · RETOUR À J30 : revenus entre le 28e et le 32e jour ;
  · SEMAINES ACTIVES : les personnes qui, sur les 7 derniers jours, ont fait
    au moins une analyse ou une leçon (le chiffre à faire monter) ;
  · NOTIFICATIONS ACTIVÉES : parmi les actifs des 7 derniers jours, ceux qui
    ont au moins un appareil abonné.

Un inscrit n'entre dans un taux qu'une fois le délai écoulé (on ne compte pas
« pas revenu à J7 » quelqu'un inscrit avant-hier), et seulement s'il s'est
inscrit après le début de la mesure : avant, aucun geste n'était noté, et
tout le monde paraîtrait parti. Chaque taux vient avec son effectif, pour
qu'un 100 % sur deux personnes se lise comme tel.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone


def _jour(iso: str) -> date | None:
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).date()


def _instant(iso: str) -> datetime | None:
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _taux(oui: int, total: int) -> dict:
    return {"oui": oui, "total": total, "taux": round(oui / total * 100, 1) if total else None}


def calculer(inscrits: list[dict], gestes: list[dict], abonnes: set[int], debut: str | None,
             aujourdhui: date | None = None) -> dict:
    """`inscrits` : {id, created_at} ; `gestes` : {user_id, type, jour, cree_le} ;
    `abonnes` : identifiants avec un appareil abonné aux notifications."""
    aujourdhui = aujourdhui or datetime.now(timezone.utc).date()
    debut_j = _jour(debut) if debut else None

    jours = defaultdict(set)          # les jours où chacun est venu
    premiers = defaultdict(dict)      # le premier instant de chaque geste
    for g in gestes:
        uid = int(g["user_id"])
        j = _jour(g["jour"]) or _jour(g["cree_le"])
        if j:
            jours[uid].add(j)
        t = _instant(g["cree_le"])
        if t and (g["type"] not in premiers[uid] or t < premiers[uid][g["type"]]):
            premiers[uid][g["type"]] = t

    cohorte = []
    for u in inscrits:
        t = _instant(u["created_at"])
        if t and debut_j and t.astimezone(timezone.utc).date() >= debut_j:
            cohorte.append((int(u["id"]), t))

    def retour(de: int, a: int):
        eligibles = [(uid, t) for uid, t in cohorte if t.date() + timedelta(days=a) <= aujourdhui]
        revenus = [uid for uid, t in eligibles
                   if any(t.date() + timedelta(days=k) in jours[uid] for k in range(de, a + 1))]
        return _taux(len(revenus), len(eligibles))

    # Ceux dont les 24 premières heures sont passées (inscrits avant aujourd'hui).
    activables = [(uid, t) for uid, t in cohorte if t.date() < aujourdhui]
    actives = [uid for uid, t in activables
               if all(k in premiers[uid] and premiers[uid][k] <= t + timedelta(hours=24) for k in ("analyse", "position"))]

    semaine = aujourdhui - timedelta(days=6)
    actifs_7j = {int(g["user_id"]) for g in gestes
                 if g["type"] in ("analyse", "lecon") and (_jour(g["jour"]) or aujourdhui) >= semaine}
    venus_7j = {uid for uid, js in jours.items() if any(j >= semaine for j in js)}

    # Les huit dernières semaines, du lundi au dimanche.
    lundi = aujourdhui - timedelta(days=aujourdhui.weekday())
    semaines = []
    for k in range(7, -1, -1):
        d0 = lundi - timedelta(weeks=k)
        d1 = d0 + timedelta(days=6)
        semaines.append({
            "debut": d0.isoformat(),
            "inscriptions": sum(1 for u in inscrits if (j := _jour(u["created_at"])) and d0 <= j <= d1),
            "actifs": sum(1 for js in jours.values() if any(d0 <= j <= d1 for j in js)),
        })

    return {
        "debut_mesure": debut,
        "cohorte": len(cohorte),
        "activation": _taux(len(actives), len(activables)),
        "j1": retour(1, 1),
        "j7": retour(6, 8),
        "j30": retour(28, 32),
        "semaines_actives": len(actifs_7j),
        "venus_7j": len(venus_7j),
        "notifications": _taux(len(venus_7j & abonnes), len(venus_7j)),
        "semaines": semaines,
    }
