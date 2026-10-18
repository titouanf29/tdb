"""Les actifs ajoutés à l'univers depuis l'administration.

Quand un administrateur accepte une demande d'actif, l'actif doit
réellement apparaître : dans la liste des marchés, dans le scanner. Avant,
« Accepter » changeait un statut et rien d'autre, puisque l'univers (MARKETS)
est écrit dans config.py, partagé avec le bot Telegram, qu'on ne modifie pas.

Les ajouts sont donc gardés dans leur propre table et greffés en mémoire sur
MARKETS côté web, au démarrage puis à chaque acceptation. Le bot n'en voit
rien, et un redéploiement ne les perd pas.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from config import MARKETS

from ..database import execute_query, execute_write

_SUFFIXES_EUROPE = (".PA", ".AS", ".BR", ".LS", ".DE", ".MI", ".MC", ".L", ".SW",
                    ".ST", ".CO", ".HE", ".OL", ".VI", ".IR")
_SUFFIXES_ASIE = (".T", ".HK", ".KS", ".SS", ".SZ", ".TW", ".SI", ".AX", ".NS", ".BO")


def marche_de(symbol: str, asset_type: Optional[str] = None) -> Optional[str]:
    """Le marché de MARKETS où ranger un symbole Yahoo, d'après sa forme."""
    s = symbol.upper()
    t = (asset_type or "").lower()
    if s.endswith("-USD") or s.endswith("-EUR") or t == "crypto":
        return "CRYPTO"
    if s.endswith("=F") or t == "commodity":
        return "COMMODITIES"
    if s.endswith("=X") or t == "forex":
        return None  # pas de marché « devises » dans l'univers : analysable, pas listé
    if s.endswith(_SUFFIXES_EUROPE):
        return "EUROPE"
    if s.endswith(_SUFFIXES_ASIE):
        return "ASIA"
    return "USA"


async def _table() -> None:
    await execute_write("""
        CREATE TABLE IF NOT EXISTS actifs_ajoutes (
            symbol TEXT PRIMARY KEY,
            marche TEXT,
            nom TEXT,
            demande_id INTEGER,
            ajoute_par INTEGER,
            ajoute_le TEXT NOT NULL
        )
    """)


def _greffer(symbol: str, marche: Optional[str], nom: Optional[str]) -> None:
    if marche and marche in MARKETS:
        actifs = MARKETS[marche]["assets"]
        if symbol not in actifs:
            actifs.append(symbol)
    try:
        from . import market as _m
        if nom:
            _m.SYMBOL_NAMES.setdefault(symbol, nom)
        # L'index de recherche est construit une fois, au premier appel : on
        # le vide pour que l'actif ajouté s'y trouve à la frappe suivante.
        _m._INDEX.clear()
    except Exception:
        pass


async def charger() -> int:
    """Au démarrage : remet en place les ajouts enregistrés. Ne lève jamais."""
    try:
        await _table()
        rows = await execute_query("SELECT symbol, marche, nom FROM actifs_ajoutes") or []
    except Exception:
        return 0
    for r in rows:
        _greffer(r["symbol"], r.get("marche"), r.get("nom"))
    return len(rows)


MARCHES = ("EUROPE", "USA", "ASIA", "CRYPTO", "COMMODITIES")


async def lister() -> list[dict]:
    try:
        await _table()
        return await execute_query("SELECT * FROM actifs_ajoutes ORDER BY ajoute_le DESC") or []
    except Exception:
        return []


async def ajouter(symbol: str, nom: Optional[str], asset_type: Optional[str],
                  demande_id: Optional[int], admin_id: int, marche: Optional[str] = None) -> Optional[str]:
    """Ajoute l'actif à l'univers web et renvoie le marché retenu (ou None).

    Le marché choisi par l'administrateur l'emporte ; à défaut, il se déduit
    de la forme du symbole."""
    symbol = symbol.upper()
    marche = marche if marche in MARCHES else marche_de(symbol, asset_type)
    await _table()
    deja = await execute_query("SELECT symbol FROM actifs_ajoutes WHERE symbol = ?", (symbol,))
    if not deja:
        await execute_write(
            "INSERT INTO actifs_ajoutes (symbol, marche, nom, demande_id, ajoute_par, ajoute_le) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (symbol, marche, nom, demande_id, admin_id, datetime.now(timezone.utc).isoformat()),
        )
    _greffer(symbol, marche, nom)
    return marche
