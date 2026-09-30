"""L'appétit pour le risque de l'utilisateur, tel que le moteur le prend en compte.

Il règle deux choses, et seulement deux :

* la TAILLE de la position (0,5 % à 5 % du capital perdu au stop) — calculée
  à l'écran, à partir du capital ;
* le SEUIL D'ACHAT, pour les profils agressifs, là où c'est mesuré.

Jamais le stop, l'objectif ni le score : ceux-là dépendent de l'horizon et ont
été mesurés — un stop resserré « par prudence » se fait sortir par le bruit.

Le seuil abaissé, mesuré en septembre 2026 sur 40 actifs, avec le plan de
l'écran (objectif plafonné à la résistance, R/R ≥ 1,2) et 10 points de base
de frais par côté : en journalier, les achats de score 55 à 59 ont rapporté
+0,21 R par trade sur la période A et +0,26 R sur la période jamais vue B
(74 % et 64 % des actifs positifs) — à peine moins que les scores ≥ 60
(+0,22 et +0,35), pour deux fois plus de signaux. En 3 jours (+0,24 puis
+0,02) et en hebdomadaire (+0,04 puis +0,62) la tranche est instable ; en
intraday elle perd davantage encore. Là, le seuil reste 60 pour tout le monde.
"""
from ..database import execute_query

NIVEAUX = ("conservative", "moderate", "aggressive", "very_aggressive")
AGRESSIFS = ("aggressive", "very_aggressive")

SEUIL_ACHAT = 60
SEUIL_ACHAT_AGRESSIF = 55
UNITES_SEUIL_AGRESSIF = ("1d",)
ETUDE_SEUIL_AGRESSIF = "+0,21 R et +0,26 R par trade sur deux périodes, 40 actifs, frais compris"


def niveau_risque(v: str | None) -> str:
    return v if v in NIVEAUX else "moderate"


def seuil_achat(niveau: str | None, timeframe: str | None) -> int:
    """Le score à partir duquel un achat est proposé, pour ce profil et cette unité."""
    if niveau_risque(niveau) in AGRESSIFS and (timeframe or "1d") in UNITES_SEUIL_AGRESSIF:
        return SEUIL_ACHAT_AGRESSIF
    return SEUIL_ACHAT


async def risque_utilisateur(current_user: dict | None) -> str:
    """Le niveau enregistré dans les réglages ; « moderate » faute de mieux —
    une analyse ne doit jamais échouer parce qu'une préférence manque."""
    if not current_user:
        return "moderate"
    try:
        rows = await execute_query(
            "SELECT risk_level FROM web_user_settings WHERE user_id = ?",
            (current_user.get("id"),),
        )
        if rows:
            return niveau_risque(rows[0].get("risk_level"))
    except Exception:
        pass
    return "moderate"
