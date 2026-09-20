"""
Les dossiers qui survivent à un redémarrage — donc la nouveauté et le changement.

Sans persistance, le moteur relit les flux toutes les heures et redécouvre les
mêmes faits, indéfiniment. C'est précisément ce que le §14 interdit : « une
actualité ancienne ne doit pas être traitée comme une nouvelle information ».
Et sans mémoire, le §15 — « qu'est-ce qui vient de CHANGER ? » — n'a aucun
sens : on ne peut comparer un état à rien.

Ce que la persistance apporte, et qu'aucun calcul instantané ne peut donner :

  NOUVEAUTÉ        un fait vu pour la première fois n'a pas le même poids
                   qu'un fait dont on parle depuis trois jours ;
  ABSORPTION       plus un événement est couvert longtemps, plus le marché a
                   eu le temps de l'intégrer ;
  CHANGEMENT       l'arrivée d'une source primaire ou d'un démenti fait
                   bouger un dossier ouvert, et c'est ce mouvement qui est
                   l'information, pas l'état.

L'IDENTITÉ D'UN DOSSIER est son problème central. Deux passages successifs
doivent reconnaître le même fait malgré des titres qui changent, et distinguer
« la BCE relève ses taux » en mars de la même phrase en septembre. On combine
donc une empreinte d'entités et une fenêtre de temps, exactement comme le
regroupement — mais appliquée entre deux lectures au lieu de l'être au sein
d'une seule.
"""

import hashlib
import json
from datetime import datetime, timedelta, timezone

from ...database import USE_POSTGRES, execute_query, execute_write

# Au-delà, un fait qui ressemble à un ancien est un fait nouveau. Plus large
# que la fenêtre de regroupement : un dossier VIT plusieurs jours, il est
# normal qu'un article du jour 3 rejoigne un dossier ouvert le jour 1.
FENETRE_JOURS = 5

_pret = False


async def init() -> None:
    """Crée la table si besoin. Une seule fois par processus.

    Le type de la clé primaire diffère selon le moteur — `AUTOINCREMENT` est
    une erreur de syntaxe pour PostgreSQL, `SERIAL` n'existe pas en SQLite.
    Le reste du site règle ce problème dans `database.py` ; ici la table vit
    avec le module qui l'utilise, donc la distinction est faite sur place.
    """
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS intel_events (
            id {cle},
            fingerprint TEXT NOT NULL,
            titre TEXT NOT NULL,
            entites TEXT NOT NULL,
            niveau TEXT NOT NULL,
            confiance REAL NOT NULL,
            voix INTEGER NOT NULL,
            articles INTEGER NOT NULL,
            source_primaire INTEGER DEFAULT 0,
            premiere_vue TEXT NOT NULL,
            derniere_vue TEXT NOT NULL,
            vues INTEGER DEFAULT 1,
            details TEXT
        )
    """)
    await execute_write(
        "CREATE INDEX IF NOT EXISTS idx_intel_fp ON intel_events(fingerprint)"
    )
    await execute_write(
        "CREATE INDEX IF NOT EXISTS idx_intel_vue ON intel_events(derniere_vue)"
    )
    _pret = True


def empreinte(entites: set[str], titre: str) -> str:
    """L'identité d'un fait.

    Les entités d'abord : ce sont elles qui survivent aux reformulations d'un
    titre à l'autre. Quand il n'y en a pas assez pour identifier quoi que ce
    soit, on retombe sur les mots du titre — moins stable, mais c'est la seule
    prise disponible.
    """
    if len(entites) >= 2:
        base = "|".join(sorted(entites))
    else:
        mots = sorted(w for w in (titre or "").lower().split() if len(w) > 4)[:6]
        base = "|".join(sorted(entites)) + "#" + "|".join(mots)
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]


async def enregistrer(dossier: dict) -> dict:
    """Range un dossier et rend ce qui a CHANGÉ depuis la dernière lecture.

    Le retour ne décrit pas l'état mais le mouvement : première apparition,
    montée en certitude, arrivée d'une source primaire. C'est ce qui permet au
    moteur de ne signaler que ce qui bouge, au lieu de rejouer chaque heure le
    même bulletin.
    """
    await init()
    maintenant = datetime.now(timezone.utc)
    fp = empreinte(set(dossier["entites"]), dossier["titre"])
    limite = (maintenant - timedelta(days=FENETRE_JOURS)).isoformat()

    lignes = await execute_query(
        """SELECT * FROM intel_events
           WHERE fingerprint = ? AND derniere_vue > ?
           ORDER BY derniere_vue DESC LIMIT 1""",
        (fp, limite),
    )

    if not lignes:
        await execute_write(
            """INSERT INTO intel_events
               (fingerprint, titre, entites, niveau, confiance, voix, articles,
                source_primaire, premiere_vue, derniere_vue, vues, details)
               VALUES (?,?,?,?,?,?,?,?,?,?,1,?)""",
            (fp, dossier["titre"], json.dumps(sorted(dossier["entites"])),
             dossier["niveau"], dossier["confiance"], dossier["voix"],
             dossier["articles"], 1 if dossier.get("source_primaire") else 0,
             maintenant.isoformat(), maintenant.isoformat(),
             json.dumps(dossier.get("details") or {})),
        )
        return {
            "nouveau": True,
            "age_heures": 0.0,
            "nouveaute": 1.0,
            "absorption": 0.0,
            "changements": ["première apparition"],
        }

    av = lignes[0]
    try:
        premiere = datetime.fromisoformat(str(av["premiere_vue"]).replace("Z", "+00:00"))
        if premiere.tzinfo is None:
            premiere = premiere.replace(tzinfo=timezone.utc)
    except ValueError:
        premiere = maintenant
    age = max(0.0, (maintenant - premiere).total_seconds() / 3600.0)

    changements: list[str] = []
    ordre = ("FALSE", "DISPUTED", "UNCERTAIN", "POSSIBLE", "PROBABLE", "CONFIRMED")
    try:
        avant_i, apres_i = ordre.index(av["niveau"]), ordre.index(dossier["niveau"])
        if apres_i > avant_i:
            changements.append(f"certitude en hausse : {av['niveau']} → {dossier['niveau']}")
        elif apres_i < avant_i:
            changements.append(f"certitude en baisse : {av['niveau']} → {dossier['niveau']}")
    except ValueError:
        pass

    if dossier["voix"] > (av["voix"] or 0):
        changements.append(
            f"{dossier['voix'] - av['voix']} rédaction(s) de plus le couvrent"
        )
    if dossier.get("source_primaire") and not av["source_primaire"]:
        changements.append("une source primaire est apparue")

    await execute_write(
        """UPDATE intel_events
           SET titre = ?, niveau = ?, confiance = ?, voix = ?, articles = ?,
               source_primaire = ?, derniere_vue = ?, vues = vues + 1, details = ?
           WHERE id = ?""",
        (dossier["titre"], dossier["niveau"], dossier["confiance"], dossier["voix"],
         dossier["articles"], 1 if dossier.get("source_primaire") else 0,
         maintenant.isoformat(), json.dumps(dossier.get("details") or {}), av["id"]),
    )

    return {
        "nouveau": False,
        "age_heures": round(age, 1),
        "nouveaute": nouveaute(age),
        "absorption": absorption(age, av["vues"] + 1),
        "changements": changements,
    }


def nouveaute(age_heures: float) -> float:
    """Combien il reste de neuf dans un fait, entre 1 et 0.

    Décroissance par demi-vie de douze heures : un fait de la nuit garde
    l'essentiel de sa valeur au matin, un fait de la semaine dernière n'en a
    presque plus. Ce n'est pas la vérité qui s'évapore — c'est la part que le
    marché n'a pas encore vue.
    """
    return round(0.5 ** (age_heures / 12.0), 3)


def absorption(age_heures: float, vues: int) -> float:
    """À quel point le marché a eu le temps d'intégrer le fait.

    Le temps compte, mais la RÉPÉTITION aussi : un fait revu à dix lectures
    successives a été martelé, et son effet de surprise est épuisé bien avant
    qu'un simple compteur d'heures ne le dise.
    """
    par_temps = 1.0 - 0.5 ** (age_heures / 24.0)
    par_repetition = min(1.0, vues / 12.0)
    return round(min(1.0, 0.65 * par_temps + 0.35 * par_repetition), 3)


async def actifs_recents(heures: int = 48, minimum_voix: int = 1) -> list[dict]:
    """Les dossiers encore vivants, du plus récemment vu au plus ancien."""
    await init()
    limite = (datetime.now(timezone.utc) - timedelta(hours=heures)).isoformat()
    lignes = await execute_query(
        """SELECT * FROM intel_events
           WHERE derniere_vue > ? AND voix >= ?
           ORDER BY derniere_vue DESC LIMIT 100""",
        (limite, minimum_voix),
    )
    out = []
    for l in lignes or []:
        try:
            ents = json.loads(l["entites"] or "[]")
            det = json.loads(l["details"] or "{}")
        except (ValueError, TypeError):
            ents, det = [], {}
        out.append({**dict(l), "entites": ents, "details": det})
    return out
