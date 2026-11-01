"""Le soir, relire ses trades : un rappel à 18 h 30 quand une position fermée
dans la journée n'a pas encore sa note au journal.

Le site enseigne qu'un trade s'apprend en le relisant, et le bilan du
vendredi compte les notes manquantes. Mais entre la clôture et le vendredi,
rien ne le rappelait : la position se fermait l'après-midi, la personne
n'était pas là, et le journal restait vide. Le rappel vient le soir même,
quand le trade est encore frais.

Une note existe quand une entrée du journal porte le même actif, a été
écrite ou modifiée le jour de la clôture, et contient quelque chose de la
personne. Une clôture automatique (stop, objectif) écrit déjà sa trace avec
les faits ; tant qu'elle n'a pas été reprise (modifiée après sa création),
elle compte comme « sans note » : c'est à la personne d'y mettre ce qu'elle
seule sait.

Un seul rappel par jour et par personne (clé « journal:AAAA-MM-JJ »), tous
les jours (la crypto se ferme aussi le week-end), et seulement s'il y a
quelque chose à relire. Chacun peut le couper dans ses réglages.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..database import execute_query
from ..temps import PARIS, jour_paris

logger = logging.getLogger(__name__)

HEURE_DEBUT, HEURE_FIN = 18.5, 20.0


def jour_d_envoi(maintenant: datetime | None = None) -> str | None:
    """Pendant la fenêtre du soir, le jour (ISO, Paris) ; sinon None."""
    n = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS)
    h = n.hour + n.minute / 60
    return n.date().isoformat() if HEURE_DEBUT <= h < HEURE_FIN else None


def sans_note(fermees: list[dict], notes: list[dict], jour: str) -> list[dict]:
    """Les positions fermées ce jour qui n'ont pas de note du jour sur leur actif.

    fermees : [{symbol, realized_pnl, closed_at}] ; notes : les entrées du
    journal de la personne [{symbol, created_at, updated_at, post_trade_notes}].
    """
    notees: set[str] = set()
    for n in notes:
        cree, maj = jour_paris(n.get("created_at")), jour_paris(n.get("updated_at"))
        du_jour = (cree and cree.isoformat() == jour) or (maj and maj.isoformat() == jour)
        if not du_jour:
            continue
        # Une trace automatique jamais reprise n'est pas une note.
        reprise = n.get("updated_at") and n.get("created_at") and n["updated_at"] != n["created_at"]
        if reprise or not (n.get("setup") in ("stop", "objectif")):
            notees.add(str(n.get("symbol") or "").upper())
    out = []
    for p in fermees:
        j = jour_paris(p.get("closed_at"))
        if j and j.isoformat() == jour and str(p.get("symbol") or "").upper() not in notees:
            out.append(p)
    return out


def rediger(manquantes: list[dict], noms) -> tuple[str, str]:
    n = len(manquantes)
    p = manquantes[0]
    nom = noms.get(p["symbol"], p["symbol"])
    pnl = float(p.get("realized_pnl") or 0)
    from ..routes._fr import nombre_fr
    resultat = f"{nombre_fr(pnl, 2, signe=True)} €"
    if n == 1:
        titre = f"Relisez votre trade sur {nom}"
        message = (f"Fermé aujourd'hui à {resultat}, sans note au journal. Deux lignes suffisent : "
                   "ce qui était prévu, ce qui s'est passé. C'est là que l'on progresse.")
    else:
        titre = f"{n} trades fermés aujourd'hui, sans note"
        message = (f"{nom} ({resultat}) et {n - 1} autre{'s' if n > 2 else ''}. Deux lignes par trade : "
                   "ce qui était prévu, ce qui s'est passé. C'est là que l'on progresse.")
    return titre, message


_envoyes: set[str] = set()


async def envoyer(maintenant: datetime | None = None) -> int:
    """Envoie le rappel à ceux qui ont fermé un trade aujourd'hui sans le noter. Une fois par jour."""
    jour = jour_d_envoi(maintenant)
    if not jour or jour in _envoyes:
        return 0
    from .notifications import notifier
    from ..routes.market import SYMBOL_NAMES

    # Les clôtures du jour, par personne (comptes du site seulement).
    debut = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = await execute_query(
        "SELECT user_id, symbol, realized_pnl, closed_at FROM positions WHERE status = 'closed' AND closed_at >= ?",
        (debut.astimezone(timezone.utc).isoformat(),)) or []
    par_personne: dict[int, list[dict]] = {}
    for r in rows:
        uid = str(r["user_id"])
        if not uid.startswith("web_"):
            continue
        par_personne.setdefault(int(uid[4:]), []).append(dict(r))

    n = 0
    for uid, fermees in sorted(par_personne.items()):
        try:
            notes = await execute_query(
                "SELECT symbol, setup, created_at, updated_at, post_trade_notes FROM trading_journal "
                "WHERE user_id = ? AND created_at >= ?", (f"web_{uid}", debut.astimezone(timezone.utc).isoformat())) or []
            manquantes = sans_note(fermees, [dict(x) for x in notes], jour)
            if not manquantes:
                continue
            titre, message = rediger(manquantes, SYMBOL_NAMES)
            if await notifier(uid, "journal", titre, message, "/journal", cle=f"journal:{jour}"):
                n += 1
        except Exception as e:
            logger.info("rappel du journal non envoyé à %s : %s", uid, e)
    _envoyes.add(jour)
    return n
