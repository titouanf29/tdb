"""Le bilan de la semaine : le vendredi soir, ce que la semaine a donné.

La semaine de trading existait déjà dans l'espace du week-end (les trades
clôturés, le résultat, le journal), mais il fallait y aller de soi-même, et
rien n'en tirait une conclusion. Le bilan ajoute :

  · l'activité : les jours venus, les analyses, les leçons terminées, la série ;
  · la discipline, sur ce que le site enseigne : un stop posé à chaque
    position, une note au journal pour chaque trade fermé ;
  · une phrase qui résume, et UN conseil pour la semaine suivante, tirés de
    règles écrites ici (pas d'un modèle de langage) ;
  · une notification le vendredi à 22 h 30, à l'ouverture de l'espace du
    week-end, pour ceux qui ont été actifs dans la semaine.

Tout est mesuré sur la semaine qui se termine : du lundi 0 h au lundi suivant
9 h, heure de Paris, comme l'espace du week-end.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from ..database import execute_query
from ..routes._fr import nombre_fr
from ..temps import PARIS, aujourdhui_paris, jour_paris

logger = logging.getLogger(__name__)


def _eur(v: float) -> str:
    return f"{nombre_fr(v, 2, signe=True)} €"


def _pluriel(n: int, mot: str, pluriel: str | None = None) -> str:
    return f"{n} {mot if n <= 1 else (pluriel or mot + 's')}"


async def _activite(user_id: int, lundi: date, lundi_suivant: date) -> dict:
    try:
        from . import evenements
        await evenements.init()
        rows = await execute_query("SELECT type, jour FROM evenements WHERE user_id = ? AND jour >= ? AND jour < ?",
                                   (user_id, lundi.isoformat(), lundi_suivant.isoformat())) or []
    except Exception:
        rows = []
    jours = {r["jour"] for r in rows}
    analyses = {r["jour"] for r in rows if r["type"] == "analyse"}
    try:
        lecons = await execute_query("SELECT completed_at FROM user_lessons WHERE user_id = ?", (user_id,)) or []
        n_lecons = sum(1 for l in lecons if (j := jour_paris(l.get("completed_at"))) and lundi <= j < lundi_suivant)
    except Exception:
        n_lecons = 0
    prog = await execute_query("SELECT streak_days, last_activity_date FROM user_progress WHERE user_id = ?", (user_id,))
    serie = 0
    if prog and prog[0].get("last_activity_date"):
        try:
            ecart = (aujourdhui_paris() - date.fromisoformat(prog[0]["last_activity_date"])).days
            serie = int(prog[0]["streak_days"] or 0) if ecart <= 1 else 0
        except ValueError:
            serie = 0
    return {"jours": len(jours), "analyses": len(analyses), "lecons": n_lecons, "serie": serie}


def lire(semaine: dict, activite: dict) -> dict:
    """La phrase d'en-tête, les constats et le conseil, à partir des chiffres."""
    t = semaine["trades"]
    avec_stop = t - semaine["sans_stop"]
    constats: list[dict] = []

    if t:
        titre = (f"{_pluriel(t, 'trade fermé', 'trades fermés')}, {_eur(semaine['resultat'])}"
                 + (", et un stop posé à chacun." if semaine["sans_stop"] == 0 else "."))
        constats.append({"ton": "bon" if semaine["resultat"] > 0 else "neutre" if semaine["resultat"] == 0 else "attention",
                         "texte": f"{semaine['gagnants']} gagnant{'s' if semaine['gagnants'] > 1 else ''} sur {t}"
                                  + (f", meilleur trade sur {semaine['meilleur']['nom']} ({_eur(semaine['meilleur']['resultat'])})"
                                     if semaine.get("meilleur") else "") + "."})
        constats.append({"ton": "bon" if semaine["sans_stop"] == 0 else "attention",
                         "texte": f"Stop posé sur {avec_stop} trade{'s' if avec_stop > 1 else ''} sur {t}."})
        constats.append({"ton": "bon" if semaine["journal"] >= t else "attention",
                         "texte": (f"{_pluriel(semaine['journal'], 'note', 'notes')}" if semaine["journal"] else "Aucune note")
                                  + f" au journal pour {_pluriel(t, 'trade fermé', 'trades fermés')}."})
        if semaine.get("fermetures_forcees"):
            constats.append({"ton": "attention",
                             "texte": f"{_pluriel(semaine['fermetures_forcees'], 'position fermée d’office', 'positions fermées d’office')} : la perte a pris toute la mise."})
    elif activite["jours"]:
        titre = (f"Pas de trade fermé cette semaine : {_pluriel(activite['jours'], 'jour')} sur le site"
                 + (f", {_pluriel(activite['lecons'], 'leçon terminée', 'leçons terminées')}" if activite["lecons"] else "") + ".")
    else:
        titre = "Une semaine calme : vous n'êtes pas passé sur le site."

    morceaux = [f"{_pluriel(activite['jours'], 'jour')} sur le site" if activite["jours"] else "Aucune visite"]
    if activite["analyses"]:
        morceaux.append(f"{_pluriel(activite['analyses'], 'jour')} avec une analyse")
    if activite["lecons"]:
        morceaux.append(_pluriel(activite["lecons"], "leçon terminée", "leçons terminées"))
    if activite["jours"] and not activite["analyses"] and not activite["lecons"]:
        morceaux.append("sans analyse ni leçon")
    if activite["serie"] > 1:
        morceaux.append(f"série de {activite['serie']} jours d'affilée")
    constats.append({"ton": "neutre", "texte": ", ".join(morceaux) + "."})

    # Un seul conseil, le plus utile d'abord.
    if t and semaine["sans_stop"]:
        conseil = ("Posez un stop à chaque position : c'est la règle qui protège le compte quand on se trompe, "
                   "et elle se décide avant d'entrer, pas après.")
    elif semaine.get("fermetures_forcees"):
        conseil = "Une position a perdu toute sa mise : avec du levier, un stop plus proche aurait fermé plus tôt, et plus petit."
    elif t and semaine["journal"] < t:
        conseil = "Notez chaque trade au journal, gagnant ou perdant : c'est en relisant qu'on voit ce qui se répète."
    elif not t and activite["jours"]:
        conseil = "Prenez une petite position sur une analyse où Nimbo propose d'entrer : c'est de l'argent virtuel, l'erreur ne coûte rien."
    elif not activite["jours"]:
        conseil = "Dix minutes suffisent : une analyse ou une leçon, et la série recommence."
    else:
        conseil = "Belle semaine. Gardez les mêmes règles la semaine prochaine, et regardez l'agenda avant lundi."

    return {"titre": titre, "constats": constats, "conseil": conseil}


async def bilan(user: dict, lundi: date) -> dict:
    """Le bilan de la semaine qui commence au lundi donné (heure de Paris)."""
    from ..routes.semaine import _ma_semaine
    debut = datetime(lundi.year, lundi.month, lundi.day, tzinfo=PARIS)
    suivant = lundi + timedelta(days=7)
    fin = datetime(suivant.year, suivant.month, suivant.day, 9, tzinfo=PARIS)
    semaine = await _ma_semaine({**user, "user_type": "email"}, debut, fin)
    semaine.pop("_ouvertes", None)
    activite = await _activite(int(user["id"]), lundi, suivant)
    return {"lundi": lundi.isoformat(), "semaine": semaine, "activite": activite, **lire(semaine, activite)}


# ── L'envoi du vendredi soir ─────────────────────────────────────────────

_envoyes: set[str] = set()


def lundi_de_la_semaine(maintenant: datetime | None = None) -> date | None:
    """Pendant la fenêtre d'envoi (vendredi 22 h 30 → samedi midi, Paris),
    le lundi de la semaine qui se termine ; sinon None."""
    n = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS)
    h = n.hour + n.minute / 60
    if not ((n.weekday() == 4 and h >= 22.5) or (n.weekday() == 5 and h < 12)):
        return None
    return n.date() - timedelta(days=n.weekday())


async def envoyer(maintenant: datetime | None = None) -> int:
    """Envoie le bilan à ceux qui ont été actifs dans la semaine. Une fois par semaine."""
    lundi = lundi_de_la_semaine(maintenant)
    if not lundi or lundi.isoformat() in _envoyes:
        return 0
    from . import evenements
    from .notifications import notifier
    await evenements.init()
    suivant = lundi + timedelta(days=7)
    actifs = {int(r["user_id"]) for r in (await execute_query(
        "SELECT DISTINCT user_id FROM evenements WHERE jour >= ? AND jour < ?",
        (lundi.isoformat(), suivant.isoformat())) or [])}
    for r in (await execute_query("SELECT DISTINCT user_id FROM positions WHERE status = 'open'") or []):
        if str(r["user_id"]).startswith("web_"):
            actifs.add(int(str(r["user_id"])[4:]))
    n = 0
    for uid in sorted(actifs):
        try:
            u = await execute_query("SELECT id, username, email FROM web_users WHERE id = ? AND COALESCE(is_active, 1) != 0", (uid,))
            if not u:
                continue
            b = await bilan(dict(u[0]), lundi)
            if await notifier(uid, "bilan", "Votre bilan de la semaine", f"{b['titre']} {b['conseil']}",
                              "/semaine", cle=f"bilan:{lundi.isoformat()}"):
                n += 1
        except Exception as e:
            logger.info("bilan non envoyé à %s : %s", uid, e)
    _envoyes.add(lundi.isoformat())
    return n
