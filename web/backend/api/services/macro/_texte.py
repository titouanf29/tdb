"""Nombres écrits en français pour les phrases du moteur macro."""


def nombre(x: float, d: int = 2) -> str:
    s = f"{abs(x):,.{d}f}".replace(",", " ").replace(".", ",")
    return ("−" if x < 0 else "") + s


def pct(x: float, d: int = 2, signe: bool = True) -> str:
    s = nombre(x, d)
    if signe and x > 0:
        s = "+" + s
    return f"{s} %"


def pb(x: float) -> str:
    return f"{'+' if x > 0 else ''}{nombre(x, 0)} pb"
