"""
De quoi parle cette opportunité, en une ou deux phrases.

Le scanner rendait une énumération d'indicateurs :

    « RSI survendu, MACD haussier — mais volume faible. »

C'est la liste des cases qui se sont allumées, pas une opportunité. Elle ne
dit ni ce qui se passe sur le graphique, ni ce qu'il faudrait voir pour y
croire, ni — et c'est le plus grave — à quoi on reconnaîtra qu'on s'est
trompé. Sans niveau d'invalidation, une « opportunité » n'est qu'une opinion.

Ce module produit deux phrases :

  1. CE QUI SE PASSE. La configuration dominante, nommée, avec le chiffre qui
     la justifie. Une seule configuration : celle qui explique le mieux
     l'actif maintenant, pas les quatre qui se chevauchent.
  2. CE QUI LA CONFIRME ET CE QUI LA TUE. Deux niveaux de prix. C'est la
     phrase actionnable, et c'est elle qui manquait entièrement.

Une règle tenue partout : on ne dit que ce qui est mesuré. Quand un élément
manque — pas de support identifiable, pas assez d'historique — la phrase se
raccourcit au lieu d'inventer.
"""


def _fmt(v: float) -> str:
    """Un prix, avec la précision que son ordre de grandeur mérite.

    Un stop à « 0,35 » sur un actif à 0,3463 ne veut rien dire : c'est ce
    genre d'arrondi qui a déjà fait afficher un stop égal à son objectif.
    """
    a = abs(v)
    if a >= 100:
        d = 2
    elif a >= 1:
        d = 3
    elif a >= 0.01:
        d = 5
    elif a >= 0.0001:
        d = 6
    else:
        d = 8
    return f"{v:,.{d}f}".replace(",", " ").replace(".", ",")


def _pct(v: float, d: int = 1) -> str:
    return f"{v:,.{d}f}".replace(",", " ").replace(".", ",")


# ── Les configurations, par ordre de priorité ────────────────────────────────
#
# L'ordre EST la décision. Un actif proche de son plus haut ET survendu ET en
# squeeze coche trois cases ; en nommer trois ne dit plus rien. On garde celle
# qui porte le plus d'information pour décider maintenant : une cassure
# imminente prime sur un momentum installé, parce qu'elle a une échéance.

def describe(
    *,
    symbol: str,
    price: float,
    rsi: float,
    volume_ratio: float,
    macd_cross: bool,
    macd_above: bool,
    near_breakout: bool,
    bb_squeeze: bool,
    pct_from_high: float,
    support: float | None,
    resistance: float | None,
    ema20: float | None,
    ema50: float | None,
    chg_1w: float,
    chg_1m: float,
    trend: str,
    signal: str,
    score: float = 50.0,
    style: str = "day",
) -> dict:
    """Rend {setup, headline, action, family} pour un actif scoré.

    `family` range l'opportunité dans l'une des trois familles que le lecteur
    reconnaît — une cassure et un rebond ne se tradent pas au même moment, et
    un classement unique trié par score les mélange en permanence.
    """
    above20 = ema20 is not None and price > ema20
    above50 = ema50 is not None and price > ema50

    # LE SCORE EST ORIENTÉ À LA HAUSSE : 80 dit « bonne configuration
    # acheteuse », 37 dit l'inverse — pas « médiocre ». Décrire un actif à 37
    # avec les mots d'un candidat à l'achat (« il ressort sur la qualité de
    # ses signaux ») était donc faux dans le sens le plus trompeur qui soit :
    # la phrase recommandait implicitement ce que le score déconseille.
    baissier = score < 45

    setup = "momentum"
    family = "tendance"
    headline = ""

    # 1. La cassure imminente : le prix colle à son plus haut.
    if near_breakout and pct_from_high > -4:
        setup = "cassure"
        family = "cassure"
        # « à 0,0 % de son plus haut » est une périphrase pour « dessus ».
        ecart = abs(pct_from_high)
        où = "inscrit un nouveau plus haut" if ecart < 0.15 else f"est à {_pct(ecart)} % de son plus haut de la période"
        headline = (
            f"Le cours {où}"
            + (f", porté par un volume {_pct(volume_ratio)} fois supérieur à la moyenne" if volume_ratio >= 1.5 else "")
            + "."
        )

    # 2. La compression : les bandes se resserrent, la volatilité va revenir.
    elif bb_squeeze:
        setup = "compression"
        family = "cassure"
        headline = (
            "Les bandes de Bollinger se resserrent : la volatilité est au plus bas, "
            "et ces phases se terminent par un mouvement franc — dans un sens ou dans l'autre."
        )

    # 3. Le rebond : survendu, et près d'un support.
    elif rsi < 38:
        setup = "rebond"
        family = "rebond"
        near_sup = support is not None and support > 0 and price / support <= 1.08
        # Le RSI seul produisait vingt-trois phrases qui ne différaient que par
        # un nombre. Ce qui distingue vraiment deux surventes, c'est le CONTEXTE :
        # une survente dans une tendance haussière n'est pas une survente dans
        # une chute libre, et le lecteur a besoin de savoir laquelle il regarde.
        contexte = ""
        if above20 and above50:
            contexte = " — une respiration dans une tendance encore haussière"
        elif not above20 and not above50 and chg_1m < -5:
            contexte = f" — mais l'actif perd {_pct(abs(chg_1m))} % sur le mois : une survente peut durer"
        elif volume_ratio >= 1.5:
            contexte = f" — sur un volume {_pct(volume_ratio)} fois la moyenne, donc des vendeurs pressés"
        headline = (
            f"RSI à {_pct(rsi, 0)}, en zone de survente"
            + (f", et le cours revient sur son support à {_fmt(support)}" if near_sup else "")
            + contexte
            + "."
        )

    # 4. Le croisement MACD : un changement de rythme qui vient de se produire.
    elif macd_cross:
        setup = "croisement"
        family = "rebond"
        headline = (
            "Le MACD vient de croiser à la hausse — le rythme change, "
            f"après {'une semaine en baisse' if chg_1w < 0 else 'une consolidation'}."
        )

    # 5. La tendance installée : au-dessus de ses deux moyennes, et ça monte.
    elif above20 and above50 and chg_1m > 0:
        setup = "tendance"
        family = "tendance"
        headline = (
            f"Le cours tient au-dessus de ses moyennes 20 et 50, "
            f"avec {_pct(chg_1m)} % sur le mois."
        )

    # 6. LE FOURRE-TOUT, ÉCLATÉ.
    #
    # Mesuré sur un scan de quarante valeurs européennes : huit d'entre elles
    # portaient la MÊME phrase — « l'actif ressort par sa faiblesse : c'est
    # l'un des plus mal orientés de la sélection » — dont six au mot près.
    # Deux phrases couvraient tout ce qui ne tombait dans aucune des cinq
    # configurations nommées, c'est-à-dire la moitié des résultats.
    #
    # Le défaut n'était pas la formulation mais le regroupement : « rien de
    # saillant » mélange un actif qui glisse sous ses deux moyennes, un actif
    # qui a calé sous une résistance, et un actif qui monte sans volume. Ce
    # sont trois situations différentes, et les distinguer ne demandait aucune
    # donnée nouvelle — tout était déjà calculé et jeté.
    else:
        setup = "momentum"
        family = "tendance"
        if baissier:
            if not above20 and not above50 and ema50:
                ecart50 = (price / ema50 - 1) * 100
                headline = (
                    f"Le cours est passé sous ses moyennes 20 et 50 — {_pct(abs(ecart50))} % "
                    f"sous la moyenne 50 — et n'est jamais revenu les tester."
                )
            elif chg_1m < 0 and chg_1w > 0:
                headline = (
                    f"Baisse de fond — {_pct(chg_1m)} % sur le mois — avec un sursaut de "
                    f"{_pct(chg_1w)} % cette semaine : le genre de rebond qui sert à sortir, "
                    "pas à entrer."
                )
            elif resistance and price / resistance >= 0.97:
                headline = (
                    f"Le cours a buté sous {_fmt(resistance)} sans parvenir à passer, "
                    f"et retombe{f' ({_pct(chg_1w)} % sur la semaine)' if abs(chg_1w) >= 1 else ''}."
                )
            elif volume_ratio < 0.8:
                headline = (
                    f"Orientation négative et volume atone — {_pct(volume_ratio)} fois la "
                    "moyenne : personne ne défend le titre, mais personne ne le vend en masse non plus."
                )
            else:
                headline = (
                    "L'actif ressort par sa faiblesse d'ensemble : aucun signal ne le "
                    f"soutient{', ' + _pct(chg_1w) + ' % sur la semaine' if abs(chg_1w) >= 1 else ''}."
                )
        else:
            if above20 and above50 and chg_1w < 0:
                headline = (
                    f"Structure intacte au-dessus des deux moyennes, mais {_pct(chg_1w)} % "
                    "cette semaine : une respiration dans une tendance, pas une cassure."
                )
            elif volume_ratio >= 1.5:
                headline = (
                    f"Pas de figure nette, mais un volume {_pct(volume_ratio)} fois supérieur "
                    "à sa moyenne : il se passe quelque chose avant que le graphique ne le montre."
                )
            elif volume_ratio < 0.7:
                headline = (
                    f"Signaux correctement orientés, mais sur un volume de {_pct(volume_ratio)} "
                    "fois la moyenne : un mouvement sans échanges se défait aussi vite qu'il se forme."
                )
            elif abs(chg_1m) < 2 and abs(chg_1w) < 1.5:
                headline = (
                    f"L'actif fait du surplace — {_pct(chg_1m)} % sur le mois — avec des "
                    "signaux bien orientés. Rien à jouer tant qu'il ne sort pas de sa zone."
                )
            else:
                headline = (
                    "Pas de configuration marquée : l'actif ressort sur la qualité d'ensemble "
                    f"de ses signaux{', ' + _pct(chg_1w) + ' % sur la semaine' if abs(chg_1w) >= 1 else ''}."
                )

    # ── La phrase actionnable ────────────────────────────────────────────────
    #
    # Le niveau d'invalidation d'abord, parce que c'est celui qu'on oublie.
    # Il est CHOISI selon la configuration, pas pris au hasard : une cassure
    # s'invalide sous sa résistance redevenue plafond, un rebond sous le
    # support qu'il teste.
    bits: list[str] = []
    if baissier:
        if support:
            bits.append(f"À la baisse, ça se confirme sous {_fmt(support)}")
        if resistance:
            bits.append(f"au-dessus de {_fmt(resistance)} le scénario baissier tombe")
    elif family == "cassure" and resistance:
        bits.append(f"Ça se confirme au-dessus de {_fmt(resistance)}")
        if support:
            bits.append(f"sous {_fmt(support)} le scénario tombe")
    elif family == "rebond" and support:
        bits.append(f"Le support à {_fmt(support)} est le niveau à tenir")
        if resistance:
            bits.append(f"au-dessus de {_fmt(resistance)} la reprise est confirmée")
    elif ema20:
        bits.append(
            f"La moyenne 20 à {_fmt(ema20)} sert de repère : "
            f"{'la tenir maintient le scénario' if above20 else 'la repasser le relancerait'}"
        )

    action = ""
    if bits:
        action = bits[0] + (f" ; {bits[1]}." if len(bits) > 1 else ".")

    # Le désaccord est dit, pas lissé. Un actif bien noté dont le marché de
    # référence est baissier reste un actif à contre-courant.
    if not baissier and signal in ("SELL", "STRONG_SELL") and family != "rebond":
        action += " Le moteur reste vendeur malgré tout : à contre-courant."

    avis = conseiller_sens(
        setup=setup, family=family, score=score, trend=trend, signal=signal,
        style=style, above20=above20, above50=above50,
    )
    return {
        "setup": setup, "family": family, "headline": headline, "action": action,
        "sens": avis["sens"], "sens_phrase": avis["phrase"],
        # Les trois nombres du plan, quand la structure les donne.
        "plan": plan_entree(
            sens=avis["sens"], family=family, price=price,
            support=support, resistance=resistance, ema20=ema20,
        ),
    }


# ── Long ou short, selon le profil ───────────────────────────────────────────
#
# Le scanner disait CE QU'IL VOYAIT et laissait le lecteur en tirer un sens.
# Or le score est orienté à la hausse — 80 dit « bonne configuration
# acheteuse », 37 dit l'inverse — et cette convention n'est écrite nulle part
# à l'écran. Quelqu'un qui découvre l'outil lit « RSI à 27, en zone de
# survente » sans savoir si on lui suggère d'acheter ou de fuir.
#
# ET L'HORIZON CHANGE LA RÉPONSE, pas seulement le confort. Un rebond contre
# la tendance est une opération de quelques séances : en scalping elle se joue
# ou se laisse, en long terme elle n'a simplement pas de sens — on ne détient
# pas six mois un actif qu'on achète parce qu'il est momentanément survendu.
# À l'inverse, une tendance installée au-dessus des deux moyennes est
# exactement ce qu'un horizon long cherche, et un scalpeur n'y trouve aucun
# déclencheur.
#
# D'où un avis explicite, avec sa raison, et le droit de n'en donner aucun.

HORIZONS = {
    "scalp": "scalping",
    "day":   "day trading",
    "swing": "swing",
    "long":  "long terme",
}

# Les configurations qui portent un DÉCLENCHEUR daté — utiles à court terme —
# et celles qui décrivent un RÉGIME, utiles quand on tient une position.
DECLENCHEUR = {"cassure", "compression", "croisement"}
REGIME = {"tendance", "momentum"}


def conseiller_sens(
    *,
    setup: str,
    family: str,
    score: float,
    trend: str,
    signal: str,
    style: str = "day",
    above20: bool = False,
    above50: bool = False,
) -> dict:
    """Faut-il envisager un achat, une vente, ou rien — pour CE profil.

    Rend {sens, phrase}. `sens` vaut "long", "short" ou "aucun", et le
    troisième cas est le plus important : un actif dont le score est au milieu
    ne dit rien, et le forcer dans une direction serait inventer un avis.
    """
    horizon = HORIZONS.get(style, "day trading")
    court = style in ("scalp", "day")

    # Le score porte le sens. Les seuils sont ceux que le moteur utilise
    # partout ailleurs — 60 et 40 — pour que l'écran ne dise pas autre chose
    # que ce que le backtest a mesuré.
    if score >= 60:
        sens = "long"
    elif score < 40:
        sens = "short"
    else:
        return {
            "sens": "aucun",
            "phrase": (
                f"Score au milieu de l'échelle : le moteur ne penche ni à l'achat ni à la "
                f"vente. En {horizon}, mieux vaut passer que forcer une direction."
            ),
        }

    # UN SCORE BAS, PAS UNE VENTE.
    #
    # Mesurées en septembre 2026 sur 40 actifs et 5 ans (frais inclus, sans
    # regard vers le futur), les ventes à découvert de ce moteur ont perdu
    # 0,16 R par trade, sur 36 actifs sur 40, sur les deux moitiés de la
    # période. La carte garde son sens — l'actif est faible, c'est une
    # information — mais elle ne propose plus de le vendre.
    if sens == "short":
        return {
            "sens": "short",
            "phrase": (
                "Score bas : ce n'est pas le moment d'acheter — cours trop étiré ou "
                "trop faible, selon les raisons ci-dessus. Le moteur ne propose pas de "
                "le vendre à découvert : ses signaux de vente n'ont pas payé par le "
                "passé (−0,16 R par trade en moyenne, sur 5 ans et 40 actifs)."
            ),
        }

    contre_tendance = (
        (sens == "long" and trend.upper().startswith("BEAR"))
        or (sens == "short" and trend.upper().startswith("BULL"))
    )

    # ── Ce qui rend l'avis inadapté à l'horizon ──────────────────────────────
    if not court and family == "rebond" and contre_tendance:
        return {
            "sens": "aucun",
            "phrase": (
                f"Un rebond à contre-tendance se joue en quelques séances. Sur un horizon "
                f"{horizon}, ce n'est pas une position à tenir : le moteur ne conseille "
                "rien ici."
            ),
        }

    if court and setup in REGIME and not contre_tendance:
        mot = "un achat" if sens == "long" else "une vente"
        return {
            "sens": sens,
            "phrase": (
                f"Plutôt {mot}, mais sans déclencheur daté : c'est un régime installé, pas "
                f"un signal. En {horizon}, attendez un point d'entrée précis plutôt que "
                "d'entrer au marché."
            ),
        }

    # ── L'avis, avec ce qui le porte ─────────────────────────────────────────
    mot = "un achat" if sens == "long" else "une vente"
    pourquoi = ""

    # UNE SURVENTE DANS UNE BAISSE INSTALLÉE N'EST PAS UN REBOND À JOUER.
    #
    # Mesuré sur un scan européen : Adyen ressortait avec « RSI à 35, en zone
    # de survente » — configuration « rebond », donc une idée acheteuse — et
    # l'avis disait « vente », avec la phrase du rebond : « c'est une
    # opération de quelques séances, à surveiller de près ». Le lecteur
    # recevait deux messages contraires dans la même carte.
    #
    # Le moteur n'avait pas tort : à 17/100 et -18 % sur le mois, la survente
    # accompagne la baisse au lieu de l'arrêter. C'est la FORMULATION qui
    # empruntait au rebond haussier un vocabulaire qui ne s'applique pas.
    if family == "rebond" and sens == "short":
        return {
            "sens": "short",
            "phrase": (
                "La survente n'est pas un signal d'achat ici : elle accompagne une baisse "
                "installée, et un indicateur peut rester en zone extrême longtemps. Le "
                f"moteur penche pour une vente — en {horizon}, n'achetez pas le creux avant "
                "qu'un support tienne réellement."
            ),
        }

    if setup in DECLENCHEUR:
        pourquoi = (
            " Le déclencheur est daté, ce qui convient à votre horizon."
            if court else
            " Le déclencheur est court terme : sur votre horizon, laissez-le confirmer avant d'entrer."
        )
    elif family == "rebond":
        pourquoi = (
            " C'est une opération de quelques séances, à surveiller de près."
            if court else
            " Attendez que le support tienne sur plusieurs séances avant d'y croire."
        )
    elif setup == "tendance":
        pourquoi = (
            " Le mouvement est déjà en place : on le rejoint en cours de route."
            if not court else
            " La tendance porte, mais vous entrez en cours de route — le stop doit en tenir compte."
        )

    phrase = f"Plutôt {mot} pour un profil {horizon}.{pourquoi}"

    if contre_tendance:
        phrase += (
            " Attention : cela va contre la tendance de fond de l'actif, "
            "ce qui demande un stop plus serré et une taille réduite."
        )
    elif not contre_tendance and above20 and above50 and sens == "long":
        phrase += " La structure de prix va dans le même sens."

    return {"sens": sens, "phrase": phrase}


# ── Le plan d'entrée ─────────────────────────────────────────────────────────
#
# Le scanner disait où le scénario se confirme et où il tombe, dans une phrase.
# C'est juste, et ce n'est pas un plan : pour agir il faut trois nombres — à
# partir d'où on entre, jusqu'où on vise, à partir d'où on renonce — et savoir
# lequel est lequel.
#
# CE PLAN N'INVENTE AUCUN NIVEAU. Les trois sortent de la structure déjà
# mesurée : le support et la résistance de la période, et la moyenne 20 comme
# repère de repli. Quand l'un manque, la ligne correspondante disparaît au
# lieu d'être extrapolée — un objectif inventé est pire qu'un objectif absent,
# parce qu'il a l'air d'un calcul.
#
# L'OBJECTIF EST UN MOUVEMENT MESURÉ, pas un pourcentage rond. Sur une
# cassure, on projette la hauteur de la zone franchie au-dessus du point de
# sortie : c'est la convention la plus ancienne et la plus vérifiable de
# l'analyse graphique, et surtout elle s'explique en une phrase.


def plan_entree(
    *,
    sens: str,
    family: str,
    price: float,
    support: float | None,
    resistance: float | None,
    ema20: float | None,
) -> dict | None:
    """Les trois niveaux du plan, ou None quand la structure ne les donne pas.

    LES MARGES SONT RELATIVES À LA HAUTEUR DE LA ZONE, jamais un pourcentage
    fixe. Un stop « à 1,5 % » n'a pas le même sens sur une action de services
    aux collectivités et sur une crypto ; une marge exprimée en part de la
    zone que l'actif vient de parcourir s'adapte d'elle-même à sa volatilité,
    et s'explique en une phrase.

    L'INVALIDATION D'UNE CASSURE N'EST PAS L'AUTRE BOUT DE LA ZONE. Première
    version : entrée en haut, stop en bas, objectif une hauteur plus haut —
    ce qui donne un rapport gain/risque de 1,0 PAR CONSTRUCTION, sur toutes
    les cassures, toujours. Un chiffre constant n'est pas une mesure. Une
    cassure est démentie quand le cours repasse franchement sous le niveau
    franchi, pas quand il retraverse toute la zone.
    """
    if sens not in ("long", "short"):
        return None

    haut, bas = resistance, support
    if haut is None or bas is None or haut <= bas:
        return None

    hauteur = haut - bas
    marge = hauteur * 0.25          # la cassure est démentie
    marge_support = hauteur * 0.15  # le support est enfoncé
    milieu = bas + hauteur / 2

    if sens == "long":
        if family == "cassure":
            entree, condition = haut, "à la clôture au-dessus"
            invalidation = haut - marge
            objectif = haut + hauteur
            comment = ("L'objectif projette la hauteur de la zone franchie. La cassure est "
                       "démentie si le cours revient nettement sous le niveau franchi.")
        elif family == "rebond":
            entree, condition = bas, "sur une tenue de ce niveau"
            invalidation = bas - marge_support
            # Le PREMIER obstacle au retour, pas le sommet de la zone : viser
            # le haut d'emblée gonfle le rapport et décrit rarement ce qui
            # arrive.
            objectif = ema20 if (ema20 and bas < ema20 < haut) else milieu
            comment = ("L'objectif est le premier obstacle sur le chemin du retour, pas le "
                       "sommet de la zone.")
        else:
            entree = ema20 if (ema20 and bas < ema20 < price) else milieu
            condition = "sur un repli jusque-là"
            invalidation = bas
            objectif = haut
            comment = ("On rejoint une tendance en cours sur un repli, et le haut de zone "
                       "reste l'obstacle à franchir.")
    else:
        if family == "cassure":
            entree, condition = bas, "à la clôture en dessous"
            invalidation = bas + marge
            objectif = bas - hauteur
            comment = ("L'objectif projette la hauteur de la zone sous le point de sortie. La "
                       "cassure est démentie si le cours revient nettement au-dessus.")
        elif family == "rebond":
            entree, condition = haut, "sur un retour à ce niveau"
            invalidation = haut + marge_support
            objectif = ema20 if (ema20 and bas < ema20 < haut) else milieu
            comment = ("L'objectif est le premier soutien sur le chemin de la baisse, pas le "
                       "plancher de la zone.")
        else:
            entree = ema20 if (ema20 and price < ema20 < haut) else milieu
            condition = "sur un rebond jusque-là"
            invalidation = haut
            objectif = bas
            comment = ("On rejoint une baisse en cours sur un rebond, et le bas de zone reste "
                       "le premier soutien.")

    if objectif is None or invalidation is None or entree <= 0:
        return None

    risque = abs(entree - invalidation)
    gain = abs(objectif - entree)
    if risque <= 0 or gain <= 0:
        return None
    rr = round(gain / risque, 2)

    return {
        "sens": sens,
        "entree": round(entree, 6),
        "entree_condition": condition,
        "invalidation": round(invalidation, 6),
        "objectif": round(objectif, 6),
        "rapport": rr,
        "commentaire": comment,
        # Le rapport gain/risque est le seul juge du plan, et il peut etre
        # mauvais : le dire vaut mieux que de le taire.
        "verdict": (
            "Le plan rémunère mal le risque à ce niveau d'entrée." if rr is not None and rr < 1.2
            else "Le rapport gain/risque tient." if rr is not None and rr < 2
            else "Le rapport gain/risque est confortable." if rr is not None
            else ""
        ),
    }
