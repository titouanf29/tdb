"""Un nombre écrit en français, pour toutes les phrases que le moteur compose.

`f"{x:.1f}"` produit « 2.1 » : dans une interface française, c'est une faute,
et elle se répète dans chaque phrase où un nombre apparaît — « ATR 2.1 % »,
« 0.09 R perdus », « 4.3 sem ». Corrigées une par une, elles reviennent au
prochain message écrit ; un formateur qu'on attrape plus facilement que
`:.1f` est la seule correction qui tienne.
"""


def nombre_fr(x: float, decimales: int = 1, signe: bool = False) -> str:
    """« 2,1 », « +12,4 », « −0,09 » — virgule décimale, vrai signe moins."""
    try:
        v = float(x)
    except (TypeError, ValueError):
        return "—"
    texte = f"{abs(v):,.{decimales}f}".replace(",", " ").replace(".", ",")
    if v < 0 and texte.strip("0, "):
        return "−" + texte
    return ("+" if signe and v > 0 else "") + texte
