"""Le défi de la semaine, dans la Communauté.

Chaque lundi, un défi tiré de ce que le site enseigne, à tour de rôle :
tenir ses stops, tenir son journal, apprendre, revenir chaque jour. La
progression se lit sur ce que le site sait déjà (positions, journal, leçons,
journal des gestes) : rien à déclarer, rien à tricher.

LE CLASSEMENT PORTE SUR LA DISCIPLINE, JAMAIS SUR LES GAINS. Classer sur le
résultat pousserait à prendre des risques, l'inverse de ce qu'on apprend ici.
On n'y apparaît que si l'on a choisi de participer, sous son pseudo.

Les semaines sont celles de Paris, du lundi 0 h au dimanche soir.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from ..database import USE_POSTGRES, execute_query, execute_write
from ..temps import PARIS, aujourdhui_paris, jour_paris

DEFIS = [
    {"id": "stops", "titre": "Tenir ses stops",
     "texte": "Fermer 3 trades qui avaient un stop posé dès l'entrée.", "cible": 3, "unite": "trades"},
    {"id": "journal", "titre": "Tenir son journal",
     "texte": "Écrire 3 notes au journal de trading : avant d'entrer, ou après la sortie.", "cible": 3, "unite": "notes"},
    {"id": "lecons", "titre": "Apprendre",
     "texte": "Terminer 3 leçons du parcours.", "cible": 3, "unite": "leçons"},
    {"id": "regularite", "titre": "Revenir chaque jour",
     "texte": "Venir sur le site 5 jours dans la semaine.", "cible": 5, "unite": "jours"},
]

_pret = False


async def init() -> None:
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS defi_participants (
            id {cle},
            user_id INTEGER NOT NULL,
            semaine TEXT NOT NULL,
            rejoint_le TEXT NOT NULL,
            UNIQUE (user_id, semaine)
        )
    """)
    _pret = True


def lundi_de(jour: date | None = None) -> date:
    jour = jour or aujourdhui_paris()
    return jour - timedelta(days=jour.weekday())


def defi_de(lundi: date) -> dict:
    return DEFIS[lundi.isocalendar()[1] % len(DEFIS)]


def _bornes(lundi: date) -> tuple[str, str]:
    debut = datetime.combine(lundi, time(0), tzinfo=PARIS).astimezone(timezone.utc)
    return debut.isoformat(), (debut + timedelta(days=7)).isoformat()


async def progression(user_id: int, defi: dict, lundi: date) -> int:
    debut, fin = _bornes(lundi)
    wuid = f"web_{int(user_id)}"
    if defi["id"] == "stops":
        r = await execute_query("SELECT COUNT(*) AS n FROM positions WHERE user_id = ? AND status = 'closed' "
                                "AND stop_loss IS NOT NULL AND closed_at >= ? AND closed_at < ?", (wuid, debut, fin))
    elif defi["id"] == "journal":
        try:
            r = await execute_query("SELECT COUNT(*) AS n FROM trading_journal WHERE user_id = ? AND created_at >= ? "
                                    "AND created_at < ?", (wuid, debut, fin))
        except Exception:
            r = None
    elif defi["id"] == "lecons":
        try:
            rows = await execute_query("SELECT completed_at FROM user_lessons WHERE user_id = ?", (user_id,)) or []
        except Exception:
            rows = []
        return sum(1 for l in rows if (j := jour_paris(l.get("completed_at"))) and lundi <= j < lundi + timedelta(days=7))
    else:
        try:
            r = await execute_query("SELECT COUNT(DISTINCT jour) AS n FROM evenements WHERE user_id = ? AND jour >= ? "
                                    "AND jour < ?", (user_id, lundi.isoformat(), (lundi + timedelta(days=7)).isoformat()))
        except Exception:
            r = None
    return int((r or [{"n": 0}])[0]["n"] or 0)


async def participe(user_id: int, lundi: date) -> bool:
    await init()
    r = await execute_query("SELECT id FROM defi_participants WHERE user_id = ? AND semaine = ?",
                            (user_id, lundi.isoformat()))
    return bool(r)


async def basculer(user_id: int, lundi: date) -> bool:
    """Rejoindre le classement de la semaine, ou le quitter. Rend l'état final."""
    await init()
    if await participe(user_id, lundi):
        await execute_write("DELETE FROM defi_participants WHERE user_id = ? AND semaine = ?", (user_id, lundi.isoformat()))
        return False
    await execute_write("INSERT INTO defi_participants (user_id, semaine, rejoint_le) VALUES (?, ?, ?)",
                        (user_id, lundi.isoformat(), datetime.now(timezone.utc).isoformat()))
    return True


async def etat(user_id: int, lundi: date | None = None) -> dict:
    await init()
    lundi = lundi or lundi_de()
    defi = defi_de(lundi)
    rows = await execute_query("""
        SELECT p.user_id, p.rejoint_le, u.username FROM defi_participants p
        LEFT JOIN web_users u ON u.id = p.user_id WHERE p.semaine = ?""", (lundi.isoformat(),)) or []
    classement = []
    for r in rows:
        prog = await progression(r["user_id"], defi, lundi)
        classement.append({"user_id": r["user_id"], "pseudo": r["username"] or "Membre",
                           "progression": min(prog, defi["cible"]), "reussi": prog >= defi["cible"],
                           "rejoint_le": r["rejoint_le"]})
    classement.sort(key=lambda c: (-c["progression"], c["rejoint_le"]))
    ma = await progression(user_id, defi, lundi)
    rang = next((i + 1 for i, c in enumerate(classement) if c["user_id"] == user_id), None)
    return {
        "semaine": lundi.isoformat(),
        "fin": (lundi + timedelta(days=6)).isoformat(),
        "defi": defi,
        "ma_progression": min(ma, defi["cible"]),
        "reussi": ma >= defi["cible"],
        "participe": rang is not None,
        "rang": rang,
        "participants": len(classement),
        "classement": [{k: c[k] for k in ("pseudo", "progression", "reussi")} | {"moi": c["user_id"] == user_id}
                       for c in classement[:10]],
    }


async def prevenir_les_reussites() -> int:
    """Les participants qui viennent de réussir le défi l'apprennent (une fois)."""
    from .notifications import notifier
    await init()
    lundi = lundi_de()
    defi = defi_de(lundi)
    rows = await execute_query("SELECT user_id FROM defi_participants WHERE semaine = ?", (lundi.isoformat(),)) or []
    n = 0
    for r in rows:
        if await progression(r["user_id"], defi, lundi) >= defi["cible"]:
            if await notifier(r["user_id"], "communaute", f"Défi réussi : {defi['titre'].lower()}",
                              f"{defi['texte']} C'est fait. Votre nom est coché dans le classement de la semaine.",
                              "/community", cle=f"defi:{lundi.isoformat()}"):
                n += 1
    return n
