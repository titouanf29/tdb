"""
Par quel MÉCANISME un événement atteint un marché.

C'est le §10 du cahier des charges, et c'est ce qui sépare ce moteur d'un
classificateur de sentiment. « Sentiment de l'article : négatif » n'explique
rien et ne se vérifie pas. « Fermeture d'un détroit -> allongement des routes
-> coût du fret -> marges des importateurs » se lit, se discute, et surtout se
CONTREDIT si l'un des maillons ne tient pas.

Trois décisions assumées :

1. LA CARTE EST ÉCRITE À LA MAIN. Un modèle génératif produirait des chaînes
   plausibles à l'infini, y compris fausses, et personne ne pourrait dire
   laquelle corriger. Ici chaque lien est une ligne qu'on peut lire, dater et
   supprimer.

2. UNE CHAÎNE EST UNE HYPOTHÈSE, PAS UNE PRÉDICTION. Chaque maillon porte sa
   propre solidité : « hausse du pétrole -> coûts des compagnies aériennes »
   est mécanique ; « -> cours de l'action » dépend de la couverture, des
   contrats, du reste du marché. La chaîne s'affaiblit à mesure qu'elle
   s'éloigne du fait, et le calcul le reflète.

3. ON PRÉFÈRE NE RIEN DIRE. Un événement dont aucune règle ne parle ne reçoit
   pas de chaîne inventée : il ressort comme « transmission indéterminée »,
   ce que le §17 demande explicitement.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Maillon:
    """Un pas du raisonnement, et sa solidité.

    `force` n'est pas une probabilité : c'est la solidité du LIEN. 0,9 pour
    une relation comptable (le carburant est un coût pour un transporteur),
    0,4 pour une relation d'anticipation (ce coût se voit dans le cours).
    """
    texte: str
    force: float


@dataclass(frozen=True)
class Regle:
    """Une chaîne de transmission déclenchée par une combinaison d'entités."""
    cle: str
    # Toutes ces entités doivent être présentes pour déclencher la règle.
    requiert: tuple[str, ...]
    # Au moins une de celles-ci, quand la liste n'est pas vide.
    parmi: tuple[str, ...] = ()
    chaine: tuple[Maillon, ...] = ()
    # Les PANIERS D'ACTIFS exposés, et dans quel sens pour EUX :
    # +1 le panier en profite, -1 il en souffre.
    expose: tuple[tuple[str, int], ...] = ()
    # Les VARIABLES MACRO déplacées, et dans quel sens pour ELLES.
    #
    # La distinction n'est pas cosmétique. La première version mettait
    # INFLATION parmi les expositions, avec des actifs rattachés et le sens
    # « favorable » — ce qui faisait dire à l'écran que l'inflation en hausse
    # était favorable au S&P 500. Une variable macro n'a pas de panier : elle
    # a des conséquences, qui sont d'autres règles. Les mélanger produit
    # exactement le genre d'erreur que la séparation en couches du cahier des
    # charges doit empêcher.
    macro: tuple[tuple[str, int], ...] = ()
    horizon: str = "court terme"
    note: str = ""


M = Maillon

REGLES: tuple[Regle, ...] = (
    # ── Énergie et logistique ───────────────────────────────────────────────
    Regle(
        cle="detroit_energie",
        requiert=("MOYEN_ORIENT",),
        parmi=("CONFLIT", "SANCTIONS", "PETROLE"),
        chaine=(
            M("une voie maritime majeure du pétrole est menacée", 0.85),
            M("les navires allongent leur route ou renoncent", 0.75),
            M("le coût du fret et la prime de risque montent", 0.70),
            M("le baril intègre une prime géopolitique", 0.65),
            M("le carburant renchérit pour les transporteurs", 0.80),
            M("l'inflation importée remonte", 0.45),
        ),
        expose=(("PETROLE", +1), ("ENERGIE", +1), ("TRANSPORT", -1)),
        macro=(("INFLATION", +1),),
        horizon="court terme",
        note="La prime se dégonfle vite si la voie reste ouverte : ces mouvements "
             "se défont aussi brutalement qu'ils se forment.",
    ),
    Regle(
        cle="choc_petrole",
        requiert=("PETROLE",),
        parmi=("CONFLIT", "SANCTIONS", "RUSSIE", "MOYEN_ORIENT"),
        chaine=(
            M("l'offre de brut est perturbée ou menacée", 0.80),
            M("le prix du baril monte", 0.70),
            M("les producteurs voient leurs marges s'élargir", 0.75),
            M("les consommateurs d'énergie voient les leurs se réduire", 0.75),
            M("l'inflation énergétique se transmet aux prix", 0.50),
        ),
        expose=(("ENERGIE", +1), ("TRANSPORT", -1)),
        macro=(("INFLATION", +1),),
    ),

    # ── Politique monétaire ─────────────────────────────────────────────────
    Regle(
        cle="taux_hausse",
        requiert=("TAUX",),
        parmi=("FED", "BCE", "BOE", "BOJ", "INFLATION"),
        chaine=(
            M("le coût du financement change pour tout le monde", 0.90),
            M("les obligations se réévaluent en premier", 0.85),
            M("la valeur actuelle des bénéfices futurs est révisée", 0.70),
            M("les valeurs de croissance, dont les bénéfices sont lointains, "
              "réagissent le plus", 0.60),
            M("les banques voient leur marge d'intérêt évoluer", 0.65),
            M("l'immobilier suit le coût du crédit", 0.70),
            M("la devise réagit à l'écart de taux", 0.55),
        ),
        expose=(("BANQUES", +1), ("TECH", -1), ("IMMOBILIER", -1)),
        horizon="moyen terme",
        note="Le SENS dépend de la direction du taux, que la règle ne devine pas : "
             "elle nomme les canaux, pas l'issue.",
    ),
    Regle(
        cle="inflation_surprise",
        requiert=("INFLATION",),
        # Voir la note de la règle « emploi » : un thème macro seul ne suffit
        # pas à établir qu'un fait de marché vient d'avoir lieu.
        parmi=("USA", "UE", "CHINE", "JAPON", "FED", "BCE", "BOE", "BOJ",
               "TAUX", "CROISSANCE"),
        chaine=(
            M("l'écart aux anticipations déplace les attentes de taux", 0.80),
            M("la courbe obligataire se déforme", 0.75),
            M("les valorisations d'actions sont révisées", 0.60),
            M("le pouvoir d'achat et les marges des distributeurs sont touchés", 0.55),
        ),
        expose=(("BANQUES", +1), ("TECH", -1), ("IMMOBILIER", -1)),
        horizon="court terme",
    ),

    # ── Commerce et barrières ───────────────────────────────────────────────
    Regle(
        cle="douane",
        requiert=("DOUANE",),
        chaine=(
            M("le coût d'importation augmente pour les acheteurs visés", 0.85),
            M("les chaînes d'approvisionnement se réorganisent", 0.60),
            M("les marges des importateurs se réduisent", 0.70),
            M("une partie est répercutée sur les prix de vente", 0.55),
            M("des mesures de rétorsion deviennent possibles", 0.40),
        ),
        expose=(("TRANSPORT", -1), ("TECH", -1)),
        macro=(("INFLATION", +1),),
        horizon="moyen terme",
        note="L'effet dépend entièrement du périmètre exact des produits visés, "
             "que l'annonce précise rarement le premier jour.",
    ),
    Regle(
        cle="sanctions",
        requiert=("SANCTIONS",),
        chaine=(
            M("des flux commerciaux ou financiers sont coupés", 0.85),
            M("les acteurs exposés au pays visé perdent des débouchés", 0.70),
            M("les matières premières concernées se tendent", 0.60),
            M("des circuits de contournement se mettent en place", 0.45),
        ),
        expose=(("ENERGIE", +1), ("BANQUES", -1), ("TRANSPORT", -1)),
        horizon="moyen terme",
    ),

    # ── Conflits ────────────────────────────────────────────────────────────
    Regle(
        cle="conflit_general",
        requiert=("CONFLIT",),
        chaine=(
            M("l'incertitude monte et la prime de risque avec elle", 0.70),
            M("les capitaux se déplacent vers les actifs refuges", 0.60),
            M("l'énergie et les matières premières se tendent", 0.55),
            M("la volatilité augmente sur les actions", 0.55),
        ),
        expose=(("OR", +1), ("ENERGIE", +1), ("TRANSPORT", -1)),
        horizon="court terme",
        note="La réaction est souvent forte le premier jour puis se corrige : "
             "un conflit ne devient un régime de marché que s'il dure.",
    ),

    # ── Croissance et emploi ────────────────────────────────────────────────
    Regle(
        cle="croissance",
        requiert=("CROISSANCE",),
        parmi=("USA", "UE", "CHINE", "JAPON", "RUSSIE", "FED", "BCE", "BOE",
               "BOJ", "PBOC", "TAUX", "INFLATION", "EMPLOI"),
        chaine=(
            M("les attentes de bénéfices sont révisées", 0.70),
            M("les secteurs cycliques réagissent en premier", 0.65),
            M("la banque centrale ajuste sa lecture", 0.50),
        ),
        expose=(("BANQUES", +1), ("TRANSPORT", +1)),
        horizon="moyen terme",
    ),
    Regle(
        cle="emploi",
        requiert=("EMPLOI",),
        # UN THÈME MACRO SEUL NE FAIT PAS UN FAIT DE MARCHÉ. « La conférence
        # sur le travail, l'emploi et les retraites marque le retour du
        # clivage » — de la politique intérieure française — déclenchait cette
        # chaîne et faisait dire à l'écran que les banques en profitaient.
        # Le mot « emploi » dit le sujet ; il ne dit pas qu'une statistique
        # vient de sortir. On demande donc un ancrage : une économie, une
        # banque centrale, ou un autre thème macro qui situe la publication.
        parmi=("USA", "UE", "CHINE", "JAPON", "FED", "BCE", "BOE", "BOJ",
               "TAUX", "INFLATION", "CROISSANCE"),
        chaine=(
            M("le marché du travail informe sur les pressions salariales", 0.75),
            M("les anticipations d'inflation s'ajustent", 0.60),
            M("les attentes de taux suivent", 0.60),
        ),
        expose=(("BANQUES", +1), ("TECH", -1)),
        horizon="court terme",
    ),
)


def _declenchees(entites: set[str]) -> list[Regle]:
    out = []
    for r in REGLES:
        if not all(e in entites for e in r.requiert):
            continue
        if r.parmi and not any(e in entites for e in r.parmi):
            continue
        out.append(r)
    return out


def _solidite(chaine: tuple[Maillon, ...]) -> float:
    """La solidité d'une chaîne complète.

    Les forces se MULTIPLIENT, et c'est le point : une chaîne longue est
    mécaniquement plus fragile qu'une chaîne courte, même quand chaque maillon
    semble solide. Six maillons à 0,7 donnent 0,12 — et c'est exactement ce
    qu'il faut afficher plutôt que de laisser croire qu'un raisonnement en six
    étapes vaut un fait observé.
    """
    p = 1.0
    for m in chaine:
        p *= m.force
    return p


def analyser(entites: set[str]) -> dict:
    """Les chaînes de transmission qu'un événement déclenche.

    Rend `indetermine` quand aucune règle ne s'applique — ce qui est une
    réponse, pas un échec.
    """
    regles = _declenchees(entites)
    if not regles:
        return {
            "indetermine": True,
            "chaines": [],
            "exposes": {},
            "raison": "Aucun mécanisme connu ne relie cet événement aux marchés "
                      "que nous suivons.",
        }

    chaines = []
    exposes: dict[str, dict] = {}
    macro: dict[str, dict] = {}
    for r in regles:
        sol = _solidite(r.chaine)
        chaines.append({
            "cle": r.cle,
            "etapes": [m.texte for m in r.chaine],
            "solidite": round(sol, 3),
            "horizon": r.horizon,
            "note": r.note,
        })
        for cible, sens in r.expose:
            cur = exposes.setdefault(cible, {"sens": 0, "poids": 0.0, "via": []})
            cur["sens"] += sens
            cur["poids"] = max(cur["poids"], sol)
            cur["via"].append(r.cle)
        for variable, sens in r.macro:
            cur = macro.setdefault(variable, {"sens": 0, "poids": 0.0, "via": []})
            cur["sens"] += sens
            cur["poids"] = max(cur["poids"], sol)
            cur["via"].append(r.cle)

    # Un secteur tiré dans les deux sens par deux règles n'est pas « neutre » :
    # il est CONTESTÉ, et le dire vaut mieux que d'additionner à zéro.
    for cible, d in exposes.items():
        via = d["via"]
        d["conteste"] = d["sens"] == 0 and len(via) > 1
        d["sens"] = 1 if d["sens"] > 0 else -1 if d["sens"] < 0 else 0
        d["poids"] = round(d["poids"], 3)

    for d in macro.values():
        d["sens"] = 1 if d["sens"] > 0 else -1 if d["sens"] < 0 else 0
        d["poids"] = round(d["poids"], 3)

    chaines.sort(key=lambda c: c["solidite"], reverse=True)
    return {"indetermine": False, "chaines": chaines, "exposes": exposes,
            "macro": macro, "raison": ""}


# ── Dire la solidité en mots ────────────────────────────────────────────────
#
# Le produit des forces est honnête et illisible : une chaîne parfaitement
# raisonnable en cinq étapes donne 0,08, ce qu'un lecteur interprète comme
# « quasi nul » alors que cela veut dire « hypothèse plausible mais indirecte ».
# Le chiffre reste disponible ; l'écran affiche le mot.

def qualifier(solidite: float) -> str:
    if solidite >= 0.40:
        return "mécanisme direct"
    if solidite >= 0.20:
        return "mécanisme plausible"
    if solidite >= 0.08:
        return "enchaînement indirect"
    return "lien très indirect"
