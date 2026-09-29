"""Le climat des marchés : la peur (VIX) et le prix de l'argent (taux US 10 ans).

CONTEXTE SEULEMENT — ces deux mesures n'entrent pas dans le score.

Mesuré en septembre 2026 sur 40 actifs et 5 ans : ni le niveau du VIX, ni sa
variation, ni celle des taux n'améliorent les signaux du moteur de façon
stable. Leur effet apparent tenait à deux crises (2022, avril 2025) et
s'inversait selon les années et selon l'état du marché. Les mettre dans le
calcul, ce serait apprendre deux épisodes par cœur.

Ils restent utiles à LIRE : savoir que le marché a peur, ou que les taux
grimpent vite, change la façon de regarder un plan. C'est ce que ce bloc
dit, en mots, sans rien promettre.
"""
from __future__ import annotations

import time
import logging

from ._prices import fetch_ohlcv
from ._fr import nombre_fr

logger = logging.getLogger(__name__)

_CACHE: dict = {"t": 0.0, "v": None}
_TTL = 15 * 60  # le climat ne change pas à la minute


def _lecture_vix(niveau: float) -> tuple[str, str]:
    """(état, phrase) — repères usuels du VIX, pas des seuils du moteur."""
    if niveau < 15:
        return "calme", "Le marché est calme : les options anticipent de petits mouvements."
    if niveau < 20:
        return "normal", "Nervosité ordinaire : ni euphorie ni inquiétude marquée."
    if niveau < 30:
        return "nerveux", "Le marché est nerveux : attendez-vous à des mouvements plus amples que d'habitude."
    return "stress", "Le marché est en stress : les écarts de prix peuvent être brutaux, les stops touchés plus souvent."


def _bloc(serie, unite: str) -> dict | None:
    c = serie.dropna()
    if len(c) < 30:
        return None
    niveau = float(c.iloc[-1])
    ref = float(c.iloc[-21]) if len(c) > 21 else float(c.iloc[0])
    an = c.tail(252)
    bas, haut = float(an.min()), float(an.max())
    return {
        "niveau": round(niveau, 2),
        "variation_20": round(niveau - ref, 2),
        "variation_20_pct": round((niveau / ref - 1) * 100, 1) if ref else None,
        "bas_1an": round(bas, 2),
        "haut_1an": round(haut, 2),
        # Position dans la fourchette d'un an, 0 = plus bas, 1 = plus haut.
        "position_1an": round((niveau - bas) / (haut - bas), 3) if haut > bas else None,
        "unite": unite,
        "date": str(c.index[-1].date()),
    }


async def climat_marche() -> dict | None:
    """VIX et taux US 10 ans, avec une lecture en mots. None si indisponible."""
    if _CACHE["v"] is not None and time.monotonic() - _CACHE["t"] < _TTL:
        return _CACHE["v"]
    out: dict = {"dans_le_score": False}
    try:
        vix = await fetch_ohlcv("^VIX", period="1y", interval="1d")
        if vix is not None and not vix.empty:
            b = _bloc(vix["Close"], "points")
            if b:
                b["etat"], b["phrase"] = _lecture_vix(b["niveau"])
                if b["variation_20_pct"] is not None and b["variation_20_pct"] >= 25:
                    b["phrase"] += f" La peur a nettement monté en un mois (+{nombre_fr(b['variation_20_pct'], 0)} %)."
                out["vix"] = b
    except Exception as exc:
        logger.warning("climat: VIX indisponible: %s", exc)
    try:
        tnx = await fetch_ohlcv("^TNX", period="1y", interval="1d")
        if tnx is not None and not tnx.empty:
            b = _bloc(tnx["Close"], "%")
            if b:
                pb = round(b["variation_20"] * 100)   # en points de base
                b["variation_20_pb"] = pb
                if pb >= 25:
                    b["etat"], b["phrase"] = "hausse", (
                        f"Les taux américains ont monté de {pb} points de base en un mois : "
                        "l'argent coûte plus cher, ce qui pèse souvent sur les actions de croissance.")
                elif pb <= -25:
                    b["etat"], b["phrase"] = "baisse", (
                        f"Les taux américains ont baissé de {abs(pb)} points de base en un mois : "
                        "l'argent coûte moins cher, un soutien fréquent pour les actions.")
                else:
                    b["etat"], b["phrase"] = "stable", "Les taux américains bougent peu sur le mois."
                out["taux_10ans"] = b
    except Exception as exc:
        logger.warning("climat: taux indisponibles: %s", exc)
    if "vix" not in out and "taux_10ans" not in out:
        return None
    _CACHE.update(t=time.monotonic(), v=out)
    return out
