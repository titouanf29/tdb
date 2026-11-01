"""Le point du matin : chaque matin de semaine, trois phrases sur ce que la
personne suit, envoyées avant l'ouverture de Paris.

Le site savait prévenir quand quelque chose arrivait (un stop touché, une
proposition de Nimbo, une annonce), et faire le bilan le vendredi. Entre les
deux, rien ne donnait de raison de revenir UN MATIN ORDINAIRE : la plupart des
jours, il ne se passe rien d'assez gros pour une alerte, et c'est justement
là que l'habitude se perd. Le point du matin est ce rendez-vous : à 8 h 45
(Paris), du lundi au vendredi, une notification qui dit en trois phrases ce
que ses actifs ont fait depuis la veille, où en sont ses positions, et ce qui
est au programme. Puis une invitation à venir voir.

Tout est écrit par des règles, à partir des cours et de l'agenda en base ;
aucun modèle de langage. Une seule fois par jour et par personne (clé
« matin:AAAA-MM-JJ »), seulement à ceux qui ont quelque chose à y lire :
des favoris, une position ouverte, ou un passage sur le site dans le mois.
Chacun peut la couper dans ses réglages (catégorie « Le point du matin »).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from ..database import execute_query
from ..routes._fr import nombre_fr
from ..temps import PARIS

logger = logging.getLogger(__name__)

# Les grands repères, pour ceux qui ne suivent encore rien.
MARCHES = [("^FCHI", "le CAC 40"), ("^GSPC", "le S&P 500"), ("BTC-USD", "le bitcoin"), ("GC=F", "l'or")]
# L'heure d'envoi : après les cours de clôture de la veille et des premières
# cotations, avant l'ouverture de Paris (9 h). Jusqu'à 10 h, pour qu'un
# serveur redémarré dans l'intervalle envoie quand même.
HEURE_DEBUT, HEURE_FIN = 8.75, 10.0
JOURS_ACTIVITE = 30


def _pct(v: float) -> str:
    return f"{nombre_fr(v, 1, signe=True)} %"


def _eur(v: float) -> str:
    return f"{nombre_fr(v, 2, signe=True)} €"


def _liste(morceaux: list[str]) -> str:
    return morceaux[0] if len(morceaux) == 1 else ", ".join(morceaux[:-1]) + " et " + morceaux[-1]


def jour_d_envoi(maintenant: datetime | None = None) -> str | None:
    """Pendant la fenêtre d'envoi d'un matin de semaine, le jour (ISO) ; sinon None."""
    n = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS)
    h = n.hour + n.minute / 60
    if n.weekday() > 4 or not (HEURE_DEBUT <= h < HEURE_FIN):
        return None
    return n.date().isoformat()


def rediger(favoris: list[dict], positions: dict, propositions: list[str], agenda: list[dict],
            marches: list[tuple[str, float]], serie: int) -> tuple[str, str]:
    """Le titre et le message, à partir des chiffres seuls.

    favoris : [{nom, pct}], triés par mouvement ; positions : {n, pnl} ;
    propositions : les noms des favoris sur lesquels Nimbo propose un plan
    aujourd'hui ; agenda : [{nom, heure}] ; marches : [(nom, pct)].
    """
    phrases: list[str] = []

    if favoris:
        gros = favoris[:3]
        phrases.append("Vos actifs depuis hier : "
                       + _liste([f"{f['nom']} {_pct(f['pct'])}" for f in gros]) + ".")
    elif marches:
        phrases.append("Hier, " + _liste([f"{nom} a fini à {_pct(v)}" if i == 0 else f"{nom} à {_pct(v)}"
                                           for i, (nom, v) in enumerate(marches[:3])]) + ".")

    n = int(positions.get("n") or 0)
    if n:
        pnl = float(positions.get("pnl") or 0.0)
        phrases.append(f"{'Votre position ouverte est' if n == 1 else f'Vos {n} positions ouvertes sont'} à {_eur(pnl)}.")

    if propositions:
        phrases.append(f"Nimbo propose un plan sur {_liste(propositions[:2])} : à vous de juger.")

    if agenda:
        a = agenda[0]
        phrases.append(f"À {a['heure']}, {a['nom'][:1].lower() + a['nom'][1:]} : les cours peuvent bouger vite autour.")

    if serie >= 2:
        phrases.append(f"Série en cours : {serie} jours. Une analyse aujourd'hui la prolonge.")
    elif not phrases:
        phrases.append("Séance calme en vue. Dix minutes pour une analyse ou une leçon, et la journée est faite.")

    if favoris and abs(favoris[0]["pct"]) >= 2:
        titre = f"{favoris[0]['nom']} {_pct(favoris[0]['pct'])} depuis hier"
    elif propositions:
        titre = f"Nimbo propose un plan sur {propositions[0]}"
    else:
        titre = "Votre point du matin"
    return titre, " ".join(phrases)


# ── Les données ──────────────────────────────────────────────────────────


async def _cours(symboles: list[str]) -> dict[str, dict]:
    """Isolé pour les tests, qui remplacent la source de cours."""
    from ..routes._prices import fetch_prices
    return await fetch_prices(symboles) if symboles else {}


async def _destinataires(jour: str) -> list[int]:
    """Ceux qui ont quelque chose à lire : une visite dans le mois, une
    position ouverte ou un favori. Comptes actifs seulement."""
    from . import evenements
    await evenements.init()
    depuis = (datetime.fromisoformat(jour) - timedelta(days=JOURS_ACTIVITE)).date().isoformat()
    ids: set[int] = set()
    for r in (await execute_query("SELECT DISTINCT user_id FROM evenements WHERE jour >= ?", (depuis,)) or []):
        ids.add(int(r["user_id"]))
    for r in (await execute_query(
            "SELECT DISTINCT user_id FROM positions WHERE status = 'open' AND (archived IS NULL OR archived = 0)") or []):
        if str(r["user_id"]).startswith("web_"):
            ids.add(int(str(r["user_id"])[4:]))
    for r in (await execute_query("SELECT DISTINCT user_id FROM web_favorites") or []):
        try:
            ids.add(int(r["user_id"]))
        except (TypeError, ValueError):
            continue
    if not ids:
        return []
    actifs = await execute_query(
        "SELECT id FROM web_users WHERE COALESCE(is_active, 1) != 0") or []
    vivants = {int(r["id"]) for r in actifs}
    return sorted(i for i in ids if i in vivants)


async def _favoris(uid: int, cours: dict[str, dict], noms) -> list[dict]:
    rows = await execute_query("SELECT symbol FROM web_favorites WHERE user_id = ?", (uid,)) or []
    out = []
    for r in rows:
        c = cours.get(r["symbol"]) or {}
        if c.get("change") is None:
            continue
        out.append({"symbol": r["symbol"], "nom": noms.get(r["symbol"], r["symbol"]), "pct": float(c["change"])})
    out.sort(key=lambda f: -abs(f["pct"]))
    return out


async def _positions(uid: int) -> dict:
    from ..routes import wallet as W
    rows = await execute_query(
        "SELECT * FROM positions WHERE user_id = ? AND status = 'open' AND (archived IS NULL OR archived = 0)",
        (f"web_{uid}",)) or []
    if not rows:
        return {"n": 0, "pnl": 0.0}
    try:
        await W._price_positions(rows)
    except Exception as e:
        logger.info("positions de %s sans cours : %s", uid, e)
    pnl = sum(float(p.get("unrealized_pnl") or 0) for p in rows if p.get("price_available"))
    return {"n": len(rows), "pnl": round(pnl, 2)}


async def _propositions_du_jour(jour: str, symboles: list[str], noms) -> list[str]:
    """Les favoris sur lesquels Nimbo a noté un plan aujourd'hui (horizon journalier)."""
    if not symboles:
        return []
    try:
        from ..routes import nimbo_suivi
        await nimbo_suivi.init()
        rows = await execute_query(
            "SELECT symbol FROM nimbo_propositions WHERE timeframe = '1d' AND cree_le >= ? AND statut = 'en_cours'",
            (jour,)) or []
    except Exception:
        return []
    voulus = {s.upper() for s in symboles}
    return [noms.get(r["symbol"], r["symbol"]) for r in rows if r["symbol"].upper() in voulus]


async def _serie(uid: int) -> int:
    from ..temps import aujourdhui_paris
    from datetime import date
    prog = await execute_query("SELECT streak_days, last_activity_date FROM user_progress WHERE user_id = ?", (uid,))
    if not prog or not prog[0].get("last_activity_date"):
        return 0
    try:
        ecart = (aujourdhui_paris() - date.fromisoformat(prog[0]["last_activity_date"])).days
    except ValueError:
        return 0
    return int(prog[0]["streak_days"] or 0) if ecart <= 1 else 0


# ── L'envoi ──────────────────────────────────────────────────────────────

_envoyes: set[str] = set()


async def envoyer(maintenant: datetime | None = None) -> int:
    """Envoie le point du matin à ceux qui ont quelque chose à y lire. Une fois par jour."""
    jour = jour_d_envoi(maintenant)
    if not jour or jour in _envoyes:
        return 0
    from .notifications import notifier
    from .note_du_jour import _agenda_du_jour
    from ..routes.market import SYMBOL_NAMES

    destinataires = await _destinataires(jour)
    if not destinataires:
        _envoyes.add(jour)
        return 0

    favoris_de: dict[int, list[str]] = {}
    for r in (await execute_query("SELECT user_id, symbol FROM web_favorites") or []):
        try:
            favoris_de.setdefault(int(r["user_id"]), []).append(r["symbol"])
        except (TypeError, ValueError):
            continue
    symboles = sorted({s for uid in destinataires for s in favoris_de.get(uid, [])} | {s for s, _ in MARCHES})
    try:
        cours = await _cours(symboles)
    except Exception as e:
        logger.info("point du matin : cours indisponibles (%s)", e)
        return 0
    marches = [(nom, float(cours[s]["change"])) for s, nom in MARCHES
               if cours.get(s) and cours[s].get("change") is not None]
    agenda = await _agenda_du_jour(maintenant or datetime.now(timezone.utc))

    n = 0
    for uid in destinataires:
        try:
            favoris = await _favoris(uid, cours, SYMBOL_NAMES)
            positions = await _positions(uid)
            propositions = await _propositions_du_jour(jour, [f["symbol"] for f in favoris], SYMBOL_NAMES)
            serie = await _serie(uid)
            titre, message = rediger(favoris, positions, propositions, agenda, marches, serie)
            if await notifier(uid, "matin", titre, message, "/dashboard", cle=f"matin:{jour}"):
                n += 1
        except Exception as e:
            logger.info("point du matin non envoyé à %s : %s", uid, e)
    _envoyes.add(jour)
    logger.info("point du matin du %s : %d envoi(s)", jour, n)
    return n
