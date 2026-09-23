"""Ce que l'analyse doit à la personne qui la lit.

LE PROBLÈME QUE CE MODULE RÉSOUT. L'analyse était personnalisée sur un seul
axe : l'horizon. Scalp, day, swing, long terme changeaient l'unité de temps,
les multiples d'ATR et le poids des fondamentaux — c'est réel et c'est
mesurable (sur AAPL, l'objectif passe de 338,75 € en scalp à 572,67 € en long
terme). Mais tout le reste de ce que le site sait de l'utilisateur ne servait
à rien : le niveau de risque déclaré dans les réglages n'était lu par aucun
calcul, et les préférences de profil (objectif, marchés, temps disponible)
n'orientaient que des écrans d'accueil.

Résultat : deux personnes aux antipodes — l'une qui engage 200 € et ne
supporte pas de perdre 2 %, l'autre qui en engage 10 000 et regarde ses
positions une fois par semaine — recevaient mot pour mot la même analyse dès
lors qu'elles avaient coché le même horizon.

CE QUI EST CALCULÉ ICI. Rien de décoratif : chaque sortie est un nombre tiré
du plan que le moteur vient de produire, confronté à une réponse donnée par
l'utilisateur.

  · la taille de position et l'argent réellement en jeu, à partir de la mise
    déclarée et de la distance au stop du plan ;
  · l'écart entre la perte que la personne dit accepter et celle que le stop
    du plan impose — deux nombres de même nature, donc comparables ;
  · la faisabilité de la fenêtre de trade au regard du moment où la personne
    peut réellement regarder un écran ;
  · la contradiction entre le comportement annoncé en cas de baisse et le
    plan proposé ;
  · les indicateurs à déplier, c'est-à-dire ceux que la personne n'a pas
    déclaré connaître.

CE QUI N'EST PAS FAIT ICI, ET POURQUOI. Rien n'est modifié dans le verdict.
Un utilisateur prudent ne doit pas recevoir un « vendre » là où le marché dit
« acheter » : ce serait remplacer une mesure par une flatterie. Ses réponses
changent ce qu'on lui montre, ce qu'on lui explique et ce qu'on l'avertit —
pas ce que le marché fait.
"""

from __future__ import annotations

import json
from typing import Any, Optional

from ..database import execute_query


# ── Les réponses possibles ──────────────────────────────────────────────────
#
# Fermées et validées : ces valeurs entrent dans des comparaisons numériques
# et dans des seuils. Une chaîne inattendue ne doit pas produire une phrase
# fausse, elle doit produire le silence.

DISPONIBILITES = {
    # clé          → intervalle réel entre deux regards, en minutes
    "continu":   5,
    "quotidien": 240,
    "soir":      1440,
    "weekend":   10080,
}

DISPONIBILITE_MOT = {
    "continu":   "devant l'écran en continu",
    "quotidien": "quelques fois par jour",
    "soir":      "le soir",
    "weekend":   "le week-end",
}

REACTIONS = {"coupe", "attend", "renforce", "inconnu"}
LECTURES = {"verdict", "raisons", "detail"}
PERTES = {2, 5, 10, 20}

# Les indicateurs qu'un écran d'analyse explique. La clé est celle du bloc
# `indicators` renvoyé par le moteur, pour que le front n'ait aucune table de
# correspondance à tenir.
INDICATEURS = ["rsi", "macd", "ema", "bollinger", "adx", "atr", "volume"]


def _fr(x: float, decimales: int = 1) -> str:
    """Un nombre écrit en français : virgule décimale, et les milliers
    séparés par une espace insécable étroite.

    `f"{x:.0f}"` produit « 10000 », qu'on relit en comptant les zéros — et
    c'est justement sur les sommes engagées que ça arrive. Le format est posé
    ici une fois plutôt que dans chaque phrase, où il finit toujours par
    manquer quelque part."""
    s = f"{x:,.{decimales}f}"          # 10,000.00
    return s.replace(",", "\u202f").replace(".", ",")


def _entier(v: Any, mini: int, maxi: int) -> Optional[int]:
    try:
        n = int(v)
    except (TypeError, ValueError):
        return None
    return n if mini <= n <= maxi else None


async def lire_profil(user_id: int) -> dict:
    """Les réponses de la personne, nettoyées. Jamais d'exception vers l'appelant.

    Une préférence absente ou abîmée doit dégrader l'analyse vers la version
    générique, pas la faire échouer : c'est un enrichissement, pas une
    dépendance.
    """
    vide = {
        "mise_eur": None, "perte_max_pct": None, "disponibilite": None,
        "reaction": None, "lecture": None, "connait": [], "repondu": False,
    }
    try:
        rows = await execute_query(
            "SELECT mise_eur, perte_max_pct, disponibilite, reaction, lecture, "
            "connait, intentions_at FROM user_profile WHERE user_id = ?",
            (user_id,),
        )
    except Exception:
        return vide
    if not rows:
        return vide

    r = rows[0]
    try:
        connait = json.loads(r.get("connait") or "[]")
    except (ValueError, TypeError):
        connait = []

    perte = _entier(r.get("perte_max_pct"), 1, 100)
    dispo = r.get("disponibilite")
    reaction = r.get("reaction")
    lecture = r.get("lecture")

    return {
        "mise_eur": _entier(r.get("mise_eur"), 1, 10_000_000),
        "perte_max_pct": perte,
        "disponibilite": dispo if dispo in DISPONIBILITES else None,
        "reaction": reaction if reaction in REACTIONS else None,
        "lecture": lecture if lecture in LECTURES else None,
        "connait": [c for c in connait if c in INDICATEURS],
        "repondu": bool(r.get("intentions_at")),
    }


# ── Les constats ────────────────────────────────────────────────────────────


def _taille(profil: dict, prix: Optional[float], stop: Optional[float],
            objectif: Optional[float]) -> Optional[dict]:
    """La mise déclarée, traduite en parts, en euros risqués et en euros visés.

    C'est la traduction qui manquait le plus : un plan qui dit « stop à
    327,22 $ » ne dit pas à quelqu'un qui engage 500 € qu'il joue 21 € — et
    c'est ce nombre-là, pas le niveau, qui décide s'il tiendra la position.
    """
    mise = profil.get("mise_eur")
    if not mise or not prix or prix <= 0 or not stop:
        return None

    parts = mise / prix
    perte_unitaire = abs(prix - stop)
    risque_eur = parts * perte_unitaire
    out = {
        "mise_eur": round(mise),
        "parts": round(parts, 4),
        "risque_eur": round(risque_eur, 2),
        "risque_pct": round(risque_eur / mise * 100, 1) if mise else None,
    }
    if objectif:
        gain_eur = parts * abs(objectif - prix)
        out["gain_eur"] = round(gain_eur, 2)
        out["gain_pct"] = round(gain_eur / mise * 100, 1)
    return out


def _stop_contre_perte_acceptee(profil: dict, stop_pct: Optional[float],
                                taille: Optional[dict]) -> Optional[dict]:
    """Le stop du plan, comparé à la perte que la personne dit accepter.

    Les deux nombres sont de même nature — un pourcentage du montant engagé —
    donc la comparaison est honnête. Quand le stop est plus large, il ne
    s'agit pas de le resserrer : un stop resserré sous la volatilité de
    l'actif se fait toucher par le bruit. Il s'agit de dire que ce plan-là
    demande plus que ce qui a été annoncé.
    """
    accepte = profil.get("perte_max_pct")
    if not accepte or stop_pct is None:
        return None

    euros = (f" — soit {_fr(taille['risque_eur'], 0)} € sur {_fr(taille['mise_eur'], 0)} €"
             if taille else "")
    if stop_pct > accepte * 1.15:
        return {
            "cle": "stop_plus_large_que_prevu",
            "ton": "attention",
            "titre": f"Ce stop demande {_fr(stop_pct)} %, vous en acceptez {accepte} %",
            "texte": (
                f"Le stop du plan est à {_fr(stop_pct)} % du prix d'entrée{euros}. "
                "C'est plus que ce que vous avez dit accepter de perdre sur une position. "
                "Le resserrer ne règle rien : sous la volatilité de cet actif, un stop plus "
                "proche se fait toucher par le bruit avant que le mouvement ait eu lieu. "
                "La variable qui reste à votre main, c'est la taille."
            ),
        }
    if stop_pct < accepte * 0.4:
        return {
            "cle": "stop_bien_en_deca",
            "ton": "info",
            "titre": f"Ce stop ne demande que {_fr(stop_pct)} % de votre limite de {accepte} %",
            "texte": (
                f"Le plan risque {_fr(stop_pct)} % là où vous acceptez {accepte} %{euros}. "
                "Rien à corriger — c'est seulement une position confortable au regard de "
                "ce que vous vous êtes fixé."
            ),
        }
    return None


def _fenetre_contre_disponibilite(profil: dict, fenetre: Optional[dict],
                                  style_horizon: str) -> Optional[dict]:
    """Une fenêtre de trade plus courte que l'intervalle entre deux regards.

    C'est la contradiction la plus coûteuse du site, et personne ne la
    signalait : une fenêtre de 40 minutes pour quelqu'un qui ouvre l'écran le
    soir, ce n'est pas un trade serré, c'est un trade qu'il ne verra ni
    atteindre son objectif ni toucher son stop.
    """
    dispo = profil.get("disponibilite")
    if not dispo or not fenetre:
        return None
    ecart = DISPONIBILITES.get(dispo)
    maxi = fenetre.get("max_minutes")
    if not ecart or not maxi:
        return None
    if maxi >= ecart:
        return None

    return {
        "cle": "fenetre_plus_courte_que_vos_passages",
        "ton": "attention",
        "titre": f"Ce mouvement se joue en {fenetre.get('label_max') or '?'}, vous regardez {DISPONIBILITE_MOT[dispo]}",
        "texte": (
            f"D'après le moteur, ce mouvement se termine sous {fenetre.get('label_max')}. "
            f"Vous avez indiqué ouvrir l'écran {DISPONIBILITE_MOT[dispo]} : entre deux de vos "
            f"passages, l'objectif comme le stop auront eu le temps d'être franchis sans que "
            f"vous puissiez agir. Soit l'ordre part avec son stop et son objectif posés "
            f"d'avance, soit c'est l'horizon qu'il faut allonger — pas la position qu'il faut "
            f"surveiller."
        ),
        "suggerer_horizon": _horizon_pour(ecart, style_horizon),
    }


# Durée maximale typique d'un mouvement, par horizon, en minutes. Ce sont les
# ordres de grandeur que le moteur rend réellement — mesurés sur AAPL : 35 min
# en scalp, 8 h en day, 4 j en swing, 8,6 semaines en long terme. Ils varient
# d'un actif à l'autre, donc ils servent à ORIENTER une proposition, jamais à
# affirmer une durée.
FENETRE_TYPE = {"scalp": 40, "day": 480, "swing": 5760, "long": 86400}


def _horizon_pour(ecart_minutes: int, actuel: str) -> Optional[str]:
    """Le plus court horizon dont le mouvement dure plus longtemps que
    l'intervalle entre deux regards. Rendu seulement s'il diffère de l'actuel.

    La comparaison porte sur les MÊMES durées que le constat qui l'accompagne.
    Un premier jet découpait des seuils à la main et proposait le swing à
    quelqu'un qui ne regarde que le week-end — or un mouvement de swing se
    termine en quatre jours, donc la proposition reconduisait exactement le
    problème qu'elle prétendait résoudre.
    """
    for cle in ("scalp", "day", "swing", "long"):
        if FENETRE_TYPE[cle] >= ecart_minutes:
            return cle if cle != actuel else None
    return "long" if actuel != "long" else None


def _reaction_contre_plan(profil: dict, stop_pct: Optional[float]) -> Optional[dict]:
    """Ce que la personne dit qu'elle FERA, confronté à ce que le plan EXIGE.

    Un plan n'existe que s'il est tenu. Quelqu'un qui coupe à la première
    vraie baisse et qui reçoit un stop à 17 % ne jouera jamais ce plan : il
    sortira avant, à une perte que le plan n'a pas prévue et dont le backtest
    ne dit donc rien.
    """
    reaction = profil.get("reaction")
    if not reaction or stop_pct is None:
        return None

    if reaction == "coupe" and stop_pct >= 12:
        return {
            "cle": "vous_couperez_avant_le_stop",
            "ton": "attention",
            "titre": f"Un stop à {_fr(stop_pct)} % quand vous coupez à la première vraie baisse",
            "texte": (
                "Vous avez répondu que vous coupez quand une position part contre vous. "
                f"Ce plan place son invalidation à {_fr(stop_pct)} % : vous serez sorti bien avant "
                "qu'elle soit atteinte, à un prix que le plan n'a pas prévu — et sur lequel "
                "l'historique affiché ici ne dit donc rien. Un horizon plus court porte des "
                "stops plus proches, et correspondrait mieux à ce que vous faites vraiment."
            ),
        }
    if reaction == "renforce" and stop_pct is not None:
        return {
            "cle": "renforcer_contre_un_stop",
            "ton": "attention",
            "titre": "Renforcer à la baisse annule le stop de ce plan",
            "texte": (
                "Vous avez répondu que vous renforcez quand une position baisse. Dans ce plan, "
                f"le passage sous {_fr(stop_pct)} % est le signal que l'idée était fausse : y ajouter "
                "de l'argent, c'est augmenter la mise sur une hypothèse que le marché vient de "
                "démentir. Si vous voulez vraiment renforcer, décidez les paliers MAINTENANT et "
                "comptez-les dans la mise totale, pas dans l'instant."
            ),
        }
    if reaction == "attend" and stop_pct is not None and stop_pct < 5:
        return {
            "cle": "attendre_avec_un_stop_serre",
            "ton": "info",
            "titre": "Vous attendez que ça remonte, ce plan ne le permet pas",
            "texte": (
                f"L'invalidation est proche ({_fr(stop_pct)} %) : sur cet horizon, « attendre que ça "
                "remonte » revient à laisser courir une perte que le plan considère déjà comme "
                "tranchée. La patience se paie sur des horizons longs, pas sur celui-ci."
            ),
        }
    return None


def adapter(profil: dict, analyse: dict, style: str) -> Optional[dict]:
    """Le bloc `personnel` attaché à l'analyse. None si rien n'a été répondu.

    L'absence de bloc est un état normal et le front doit le traiter comme
    tel : on ne remplit pas l'écran de conseils génériques pour faire croire
    qu'on connaît quelqu'un dont on ne sait rien.
    """
    if not profil or not any([
        profil.get("mise_eur"), profil.get("perte_max_pct"),
        profil.get("disponibilite"), profil.get("reaction"),
        profil.get("lecture"), profil.get("connait"),
    ]):
        return None

    prix = (analyse.get("price") or {}).get("current")
    risque = analyse.get("risk") or {}
    stop = risque.get("suggested_sl")
    objectif = risque.get("suggested_tp")
    stop_pct = risque.get("atr_stop_pct")

    taille = _taille(profil, prix, stop, objectif)

    constats = [
        _stop_contre_perte_acceptee(profil, stop_pct, taille),
        _fenetre_contre_disponibilite(profil, analyse.get("trade_window"), style),
        _reaction_contre_plan(profil, stop_pct),
    ]
    constats = [c for c in constats if c]

    # Les indicateurs à déplier : ceux qui existent dans cette analyse et que
    # la personne n'a pas déclaré connaître. Tout cocher revient à demander
    # l'écran compact, et c'est un choix légitime.
    presents = [k for k in INDICATEURS if k in (analyse.get("indicators") or {})]
    a_expliquer = [k for k in presents if k not in (profil.get("connait") or [])]

    return {
        "taille": taille,
        "constats": constats,
        "a_expliquer": a_expliquer,
        "deja_connus": [k for k in presents if k in (profil.get("connait") or [])],
        "lecture": profil.get("lecture"),
        "disponibilite": profil.get("disponibilite"),
        "repondu": profil.get("repondu", False),
    }
