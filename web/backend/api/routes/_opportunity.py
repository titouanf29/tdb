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
        headline = (
            f"RSI à {_pct(rsi, 0)}, en zone de survente"
            + (f", et le cours revient sur son support à {_fmt(support)}" if near_sup else "")
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

    # 6. Rien de saillant : on le dit, plutôt que d'habiller un score.
    else:
        setup = "momentum"
        family = "tendance"
        if baissier:
            headline = (
                "L'actif ressort par sa FAIBLESSE : c'est l'un des plus mal orientés de "
                f"la sélection{', ' + _pct(chg_1w) + ' % sur la semaine' if abs(chg_1w) >= 1 else ''}."
            )
        else:
            headline = (
                f"Pas de configuration marquée : l'actif ressort sur la qualité d'ensemble "
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

    return {"setup": setup, "family": family, "headline": headline, "action": action}
