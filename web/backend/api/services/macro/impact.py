"""
Ce qu'une annonce change pour un actif précis — en réunissant le mécanisme et
la mesure.

LA RÈGLE DE PRÉSÉANCE.
  · Mesure fiable                    → c'est elle qui décide du sens. Le seuil
                                       est t ≥ 2 quand le mécanisme prévoit le
                                       sens observé, t ≥ 3 sinon (mesure.py) :
                                       un lien sans explication doit être très
                                       net pour ne pas être une coïncidence.
  · Mesure indicative, qui confirme → le sens du mécanisme, dit « conforté ».
  · Pas de mesure utilisable        → le mécanisme, présenté comme un
                                       raisonnement et non comme un constat.
  · Ni l'un ni l'autre              → « pas d'effet attendu », qui est une
                                       réponse, pas un silence.

Tout est exprimé pour une surprise RESTRICTIVE ; `lecture` (+1 restrictive,
−1 accommodante, 0 neutre), quand elle est connue après l'annonce, tourne le
sens vers ce qui s'est vraiment passé.
"""
from __future__ import annotations

from ._texte import pct
from .familles import FAMILLES, mecanisme
from .mesure import THERMOMETRE, sensibilite

NOM_BANQUE = {"FED": "la Fed", "BCE": "la BCE", "BOE": "la Banque d'Angleterre", "BOJ": "la Banque du Japon"}


async def pour_actif(banque: str | None, symbole: str, *, nom: str | None = None,
                     lecture: int | None = None, mouvement_thermo: float | None = None,
                     famille: str | None = None, cache_seul: bool = False) -> dict:
    nom = nom or symbole
    theorie = mecanisme(banque, symbole) if banque else None
    mesure = await sensibilite(symbole, banque, cache_seul=cache_seul) if banque in THERMOMETRE else None

    sens, source, conforte, contredit = 0, None, False, False
    if mesure and mesure.get("fiabilite") == "fiable":
        sens, source = mesure["sens_mesure"], "mesure"
        contredit = bool(theorie and theorie["sens"] and theorie["sens"] != sens)
    elif theorie and theorie["sens"]:
        sens, source = theorie["sens"], "mecanisme"
        conforte = bool(mesure and mesure.get("fiabilite") == "indicatif" and mesure.get("sens_mesure") == theorie["sens"])

    # Les annonces statistiques n'ont pas été mesurées elles-mêmes : la
    # sensibilité vient des jours de décision de la banque centrale qu'elles
    # informent. On le dit.
    mesure_par_procuration = bool(famille and FAMILLES.get(famille, {}).get("type") != "decision" and mesure)

    effectif = sens * lecture if lecture else None
    attendu = None
    if mesure and mesure.get("fiabilite") in ("fiable", "indicatif") and mouvement_thermo is not None:
        th = THERMOMETRE[banque]
        attendu = round(mesure["pente_par_pas"] * mouvement_thermo / th["pas"], 2)

    return {
        "symbole": symbole,
        "nom": nom,
        "banque": banque,
        "sens_si_restrictive": sens,
        "source": source,
        "conforte": conforte,
        "contredit_mecanisme": contredit,
        "pourquoi": theorie["pourquoi"] if theorie else None,
        "groupe": theorie["groupe"] if theorie else None,
        "mesure": mesure,
        "mesure_par_procuration": mesure_par_procuration,
        "sens_effectif": effectif,
        "mouvement_attendu_pct": attendu,
        "phrase": _phrase(banque, nom, sens, source, conforte, contredit, mesure, theorie, lecture, attendu),
    }


def _phrase(banque, nom, sens, source, conforte, contredit, mesure, theorie, lecture, attendu) -> str:
    qui = NOM_BANQUE.get(banque, "la banque centrale")
    if mesure and mesure.get("fiabilite") == "thermometre":
        return (f"Si {qui} surprend par sa fermeté, la paire {'monte' if sens > 0 else 'baisse'} : c'est "
                "précisément ce mouvement qui sert au moteur à lire si la décision a surpris.")
    if sens == 0:
        base = "Pas d'effet net attendu."
        if theorie and theorie.get("pourquoi"):
            return f"{base} {theorie['pourquoi']}"
        return f"{base} Ni le mécanisme ni l'historique ne le relient à {qui}."
    if lecture:
        s = sens * lecture
        tete = (f"Lue comme {'plus ferme' if lecture > 0 else 'plus souple'} qu'attendu, l'annonce est "
                f"{'plutôt favorable' if s > 0 else 'plutôt défavorable'} ici")
        if attendu is not None:
            tete += f" : de l'ordre de {pct(attendu)} d'après l'historique"
        tete += "."
    else:
        tete = (f"Si {qui} surprend par sa fermeté : tendance à la {'hausse' if sens > 0 else 'baisse'} ; "
                f"à la {'baisse' if sens > 0 else 'hausse'} si elle surprend par sa souplesse.")
    if source == "mesure":
        m = mesure
        detail = (f" Mesuré sur {m['n']} décisions : {pct(m['pente_par_pas'])} en moyenne quand "
                  f"{m.get('quand') or m['thermometre']}")
        if m.get("regularite") is not None and m.get("n_durs"):
            detail += f", dans ce sens {m['regularite']} % des jours de fermeté"
        detail += "."
        if contredit:
            detail += " C'est l'inverse de ce que le raisonnement habituel prévoit : l'historique l'emporte."
        return tete + detail
    if conforte:
        return tete + f" Le raisonnement est conforté par l'historique ({mesure['n']} décisions), sans être assez net pour être dit fiable."
    return tete + " C'est le mécanisme habituel ; l'historique ne permet pas de le confirmer pour cet actif."
