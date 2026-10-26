"""Cet actif s'échange-t-il assez pour que le plan soit jouable ?

Le moteur a été mesuré sur 40 actifs très échangés — de grandes actions,
des indices, l'or, le bitcoin. Sur ces marchés, l'écart entre le prix
d'achat et le prix de vente est de quelques centimes, et les frais simulés
(0,1 % par côté) disent à peu près la vérité.

Sur une petite valeur qui échange 50 000 € par jour, c'est faux : l'écart
achat / vente peut faire 1 à 3 %, le stop est exécuté bien plus bas que son
niveau, et ce coût dépasse à lui seul ce que les signaux ont gagné en
moyenne (+0,2 à +0,4 R par trade). Le résultat mesuré NE S'APPLIQUE PAS.

D'où deux seuils, sur la valeur échangée médiane des 20 dernières séances,
ramenée en euros :
  · sous 1 M€ / jour   → avertissement : frais réels plus hauts que simulés ;
  · sous 150 k€ / jour → le moteur ne propose pas : hors du terrain mesuré.
Et un signe qui ne trompe pas : des séances sans aucun échange.

Les indices, les paires de devises et les contrats à terme n'ont pas de
volume comparable (ou pas de volume du tout) et sont tous très liquides :
ils ne sont pas jugés ici.
"""
from __future__ import annotations

import pandas as pd

AVERTIR_EUR = 1_000_000
BLOQUER_EUR = 150_000

# Approximations suffisantes pour un seuil, pas pour un prix.
_EN_EUR = {
    "EUR": 1.0, "USD": 0.86, "GBp": 0.0115, "CHF": 1.07, "SEK": 0.09, "DKK": 0.134, "NOK": 0.085,
    "PLN": 0.235, "CAD": 0.62, "BRL": 0.16, "MXN": 0.046, "JPY": 0.0058, "HKD": 0.11, "CNY": 0.12,
    "KRW": 0.00062, "INR": 0.0103, "AUD": 0.57, "NZD": 0.51, "SGD": 0.66, "TWD": 0.027,
}
_PLACES = [
    (".PA", "EUR"), (".DE", "EUR"), (".F", "EUR"), (".AS", "EUR"), (".BR", "EUR"), (".LS", "EUR"),
    (".MI", "EUR"), (".MC", "EUR"), (".AT", "EUR"), (".HE", "EUR"), (".IR", "EUR"), (".VI", "EUR"),
    (".SW", "CHF"), (".ST", "SEK"), (".CO", "DKK"), (".OL", "NOK"), (".WA", "PLN"),
    (".L", "GBp"), (".IL", "GBp"),
    (".TO", "CAD"), (".V", "CAD"), (".SA", "BRL"), (".MX", "MXN"),
    (".T", "JPY"), (".HK", "HKD"), (".SS", "CNY"), (".SZ", "CNY"), (".KS", "KRW"), (".KQ", "KRW"),
    (".NS", "INR"), (".BO", "INR"), (".AX", "AUD"), (".NZ", "NZD"), (".SI", "SGD"), (".TW", "TWD"),
]


def _jugeable(s: str) -> bool:
    return not (s.startswith("^") or s.endswith("=X") or s.endswith("=F"))


def _devise(s: str) -> str:
    for suffixe, code in _PLACES:
        if s.endswith(suffixe):
            return code
    return "USD"


def liquidite(hist, symbol: str, par_bougie: float = 1.0) -> dict | None:
    """par_bougie : séances couvertes par une bougie quotidienne ou plus longue
    (5 en hebdomadaire, 21 en mensuel).

    {"valeur_jour_eur", "seances_sans_echange", "niveau": ok|faible|insuffisante} ou None."""
    s = (symbol or "").upper()
    if not _jugeable(s) or hist is None or len(hist) == 0 or "Volume" not in hist:
        return None
    df = hist[["Close", "Volume"]].dropna()
    if df.empty or float(df["Volume"].sum()) <= 0:
        return None          # pas de volume publié : on ne sait pas, on ne dit rien
    crypto = "-" in s
    # Le volume d'une crypto, chez Yahoo, est déjà une valeur en devise de
    # cotation ; celui d'une action est un nombre de titres.
    valeur = df["Volume"] if crypto else df["Close"] * df["Volume"]
    idx = pd.to_datetime(valeur.index)
    jours = valeur.groupby(idx.date).sum() / par_bougie
    jours = jours.tail(max(5, int(round(20 / par_bougie))))
    if len(jours) < 4:
        return None
    devise = s.rsplit("-", 1)[1] if crypto else _devise(s)
    taux = _EN_EUR.get(devise, _EN_EUR["USD"] if devise in ("USDT", "USDC") else None)
    if taux is None:
        return None
    med = float(jours.median()) * taux
    sans = int((jours <= 0).sum())
    niveau = "insuffisante" if med < BLOQUER_EUR or sans >= 3 else "faible" if med < AVERTIR_EUR else "ok"
    return {"valeur_jour_eur": round(med), "seances_sans_echange": sans, "seances": int(len(jours)),
            "niveau": niveau}


def _montant(v: float) -> str:
    if v >= 1e6:
        return f"{v / 1e6:.1f} M€".replace(".", ",")
    return f"{round(v / 1000)} k€"


def blocage(liq: dict | None) -> str | None:
    if not liq or liq["niveau"] != "insuffisante":
        return None
    sans = liq["seances_sans_echange"]
    pourquoi = (f"{sans} séances sans aucun échange sur les {liq['seances']} dernières"
                if sans >= 3 else f"environ {_montant(liq['valeur_jour_eur'])} échangés par jour")
    return (f"Trop peu échangé ({pourquoi}) : l'écart entre prix d'achat et de vente coûte plus que ce "
            "que les signaux du moteur ont gagné, mesurés sur des actifs très échangés. Il analyse, il ne "
            "propose pas de trade")


def avertissement(liq: dict | None) -> str | None:
    if not liq or liq["niveau"] != "faible":
        return None
    return (f"Peu échangé (environ {_montant(liq['valeur_jour_eur'])} par jour) : l'écart achat / vente et "
            "l'exécution du stop coûteront plus que les frais simulés")
