"""
Ce que le moteur sait d'UN actif, en ce moment.

C'est le point d'entrée que consomme l'écran d'analyse. Toute la complexité —
soixante-dix articles, soixante événements, des chaînes de transmission, des
décomptes de sources — vit derrière ; ce qui sort tient en quelques phrases.
C'est la règle fondamentale du cahier des charges : le moteur ne doit pas
montrer son intelligence, il doit s'en servir pour simplifier.

L'ORDRE DE SORTIE SUIT LA QUESTION QU'ON SE POSE :

    ce qui se passe -> pourquoi ça le concerne -> ce qui reste incertain
                    -> ce que le marché en fait

Et une contrainte tenue partout : quand rien ne relie l'actualité à cet actif,
on le DIT. Un écran qui trouve toujours quelque chose à dire sur chaque actif
ment sur la moitié d'entre eux.
"""

import time
from datetime import datetime, timezone

from . import cluster, confidence, exposure, reaction, sources, store, transmission
from ..news_fetcher import collect_all

# Le moteur ne relit pas les flux à chaque consultation : les flux changent
# toutes les quelques minutes, les consultations toutes les secondes.
_CACHE: dict = {"at": 0.0, "dossiers": []}
_TTL = 600.0

# Ce que la dernière lecture a réellement vu. Sert à répondre honnêtement quand
# le moteur ne trouve rien : « rien à signaler » ne veut rien dire tant qu'on
# ignore si l'on a lu soixante-dix articles ou zéro.
_VEILLE: dict = {"articles": 0, "redactions": 0, "groupes": 0, "dossiers": 0,
                 "lu_a": None}


def veille() -> dict:
    """L'état de la dernière lecture de presse. Copie, pour ne pas être muté."""
    return dict(_VEILLE)


async def _dossiers(force: bool = False) -> list[dict]:
    """Les dossiers du moment, montés une fois puis réutilisés."""
    if not force and _CACHE["dossiers"] and time.monotonic() - _CACHE["at"] < _TTL:
        return _CACHE["dossiers"]

    try:
        articles = await collect_all()
    except Exception:
        return _CACHE["dossiers"]

    groupes = cluster.grouper(articles)
    out = []
    for groupe in groupes:
        centrales = cluster.entites_du_groupe(groupe, centrales_seulement=True)
        t = transmission.analyser(centrales)
        if t["indetermine"]:
            continue
        a = sources.analyser(groupe)
        c = confidence.evaluer(groupe, a)
        titre = cluster.titre_du_groupe(groupe)

        # La persistance donne la nouveauté : sans elle, un fait de la semaine
        # dernière pèserait autant qu'un fait de ce matin.
        try:
            suivi = await store.enregistrer({
                "titre": titre,
                "entites": sorted(centrales),
                "niveau": c["niveau"],
                "confiance": c["confiance"],
                "voix": a["voix"],
                "articles": a["articles"],
                "source_primaire": a["source_primaire"],
                "details": {"agences": a["agences"]},
            })
        except Exception:
            suivi = {"nouveau": True, "nouveaute": 1.0, "absorption": 0.0,
                     "age_heures": 0.0, "changements": []}

        out.append({
            "titre": titre,
            "entites": sorted(centrales),
            "fait": c,
            "sources": a,
            "transmission": t,
            "suivi": suivi,
        })

    _CACHE["dossiers"] = out
    _CACHE["at"] = time.monotonic()
    _VEILLE.update({
        "articles": len(articles),
        "redactions": len({a.get("source") for a in articles if a.get("source")}),
        "groupes": len(groupes),
        "dossiers": len(out),
        "lu_a": datetime.now(timezone.utc).isoformat(),
    })
    return out


def _concerne(dossier: dict, symbole: str) -> dict | None:
    """Ce dossier touche-t-il cet actif, et par quelle exposition ?

    Un même actif peut être atteint par plusieurs cibles — un pétrolier est
    exposé au PÉTROLE et à l'ÉNERGIE. On garde la plus solide : prendre la
    première rencontrée ferait dépendre l'affichage de l'ordre d'un
    dictionnaire.
    """
    candidats = [
        {"cible": cible, **d}
        for cible, d in dossier["transmission"]["exposes"].items()
        if symbole in exposure.actifs_pour(cible)
    ]
    if not candidats:
        return None
    return max(candidats, key=lambda c: c.get("poids", 0.0))


def _chaine_du_lien(dossier: dict, lien: dict) -> dict:
    """La chaîne qui relie VRAIMENT le dossier à cet actif.

    Afficher `chaines[0]` — la plus solide du dossier — était faux dès qu'un
    événement déclenchait deux règles : le transport aérien, exposé par la
    règle du détroit, se voyait expliquer par la chaîne du choc pétrolier.
    Le raisonnement affiché doit être celui qui produit le lien, sinon
    l'utilisateur ne peut pas le contredire — et c'est tout l'intérêt de
    montrer un mécanisme plutôt qu'une étiquette.
    """
    via = lien.get("via") or []
    for c in dossier["transmission"]["chaines"]:
        if c["cle"] in via:
            return c
    return dossier["transmission"]["chaines"][0]


async def pour_symbole(
    symbole: str,
    *,
    variation_pct: float | None = None,
    volume_ratio: float | None = None,
    volatilite_jour: float | None = None,
) -> dict:
    """Le contexte de presse d'un actif, prêt à afficher.

    Les données de marché sont fournies par l'appelant, qui les a déjà : les
    redemander ici doublerait les appels au fournisseur de cours pour rien.
    """
    symbole = (symbole or "").upper()
    dossiers = await _dossiers()

    concernes = []
    for d in dossiers:
        lien = _concerne(d, symbole)
        if not lien:
            continue

        # Ce qui mérite d'être montré : un fait crédible, récent, relié par un
        # mécanisme qui tient. Les trois se multiplient — un seul faible suffit
        # à rendre le dossier anecdotique pour cet actif.
        poids = (d["fait"]["confiance"]
                 * max(0.15, d["suivi"]["nouveaute"])
                 * (lien["poids"] ** 0.5))

        chaine = _chaine_du_lien(d, lien)
        # Le dernier pas, celui que la chaîne de transmission ne fait pas :
        # du secteur exposé à CET actif, et ce que ça lui fait.
        clair = exposure.expliquer(lien["cible"], lien["sens"])
        item = {
            **clair,
            "titre": d["titre"],
            "niveau": d["fait"]["niveau"],
            "confiance": d["fait"]["confiance"],
            "raisons": d["fait"]["raisons"],
            "voix": d["sources"]["voix"],
            "articles": d["sources"]["articles"],
            "nouveaute": d["suivi"]["nouveaute"],
            "absorption": d["suivi"]["absorption"],
            "age_heures": d["suivi"]["age_heures"],
            "changements": d["suivi"]["changements"],
            "cible": lien["cible"],
            "sens": lien["sens"],
            "conteste": lien.get("conteste", False),
            "mecanisme": chaine["etapes"],
            "solidite": lien["poids"],
            "qualite_mecanisme": transmission.qualifier(lien["poids"]),
            "horizon": chaine["horizon"],
            "reserve": chaine["note"],
            "poids": round(poids, 4),
        }

        # La confrontation au prix, quand l'appelant nous l'a donné.
        if variation_pct is not None:
            item["marche"] = reaction.comparer(
                sens_attendu=lien["sens"],
                solidite=lien["poids"],
                variation_pct=variation_pct,
                volume_ratio=volume_ratio,
                volatilite_jour=volatilite_jour,
                nouveaute=d["suivi"]["nouveaute"],
            )
        concernes.append(item)

    concernes.sort(key=lambda x: x["poids"], reverse=True)

    if not concernes:
        return {
            "symbole": symbole,
            "couvert": False,
            "resume": "Rien dans l'actualité suivie ne se rattache à cet actif "
                      "par un mécanisme connu.",
            "evenements": [],
            "surveille": _surveille(symbole),
            "veille": veille(),
        }

    tete = concernes[0]
    sens = ("plutôt favorable" if tete["sens"] > 0
            else "plutôt défavorable" if tete["sens"] < 0 else "à double sens")
    # Le résumé dit POURQUOI l'actif est concerné — son métier — et laisse à
    # chaque événement le soin de dire ce qu'il lui fait. Faire porter l'effet
    # au résumé le répétait mot pour mot dans la ligne juste en dessous :
    # « plutôt favorable : l'énergie se vend plus cher », deux fois de suite.
    # « Par un enchaînement indirect », en revanche, décrivait la qualité de
    # notre raisonnement et ne disait rien de l'actif.
    n = len(concernes)
    motif = f", parce {_que(tete['pourquoi'])}" if tete["pourquoi"] else ""
    resume = (f"{n} événement{'s' if n > 1 else ''} de l'actualité "
              f"touche{'nt' if n > 1 else ''} cet actif{motif}. "
              f"Le plus pesant lui est {sens}.")

    return {
        "symbole": symbole,
        "couvert": True,
        "resume": resume,
        "evenements": concernes[:4],
        "surveille": _surveille(symbole),
        "veille": veille(),
    }


def _que(phrase: str) -> str:
    """« qu'il tire son revenu… » mais « que c'est une banque »."""
    return f"qu'{phrase}" if phrase[:1].lower() in "aeiouyâàéèêëîïôöûù" else f"que {phrase}"


def _surveille(symbole: str) -> list[str]:
    """Ce que le moteur surveille pour cet actif, qu'il ait trouvé ou non.

    Le §23 demande que l'utilisateur sache ce qui est SOUS surveillance, pas
    seulement ce qui est trouvé. Un silence dont on ignore la portée ne
    rassure pas : « rien à signaler » ne vaut que si l'on sait sur quoi.
    """
    cibles = [c for c in exposure.EXPOSITION if symbole in exposure.actifs_pour(c)]
    if not cibles:
        return []
    noms = {
        "PETROLE": "les chocs pétroliers", "ENERGIE": "le secteur énergétique",
        "OR": "les mouvements de valeur refuge", "TRANSPORT": "la logistique et le fret",
        "BANQUES": "la politique monétaire et le crédit", "TECH": "les barrières commerciales et les taux",
        "IMMOBILIER": "le coût du crédit",
    }
    return [noms.get(c, c.lower()) for c in cibles]
