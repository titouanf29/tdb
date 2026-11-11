"""Les séances : quel marché cote en ce moment, actif par actif.

Le scanner lisait les cours en direct de tout l'univers avant d'analyser
quoi que ce soit : une dizaine de secondes pendant lesquelles l'écran
affichait « 0 / 423 », un vendredi soir où aucune action américaine ne
cote. Quand la séance d'un actif est fermée, sa dernière clôture EST son
cours : la lecture en direct ne change rien, elle coûte seulement l'attente.

Les horaires sont ceux des places, dans leur fuseau ; les cryptos cotent
toujours, les matières premières et devises du dimanche soir au vendredi
soir (heure de Paris), comme le dit l'écran des marchés.
"""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from ._universe import classify

# place → (fuseau, ouverture en minutes, fermeture en minutes)
PLACES = {
    "NEWYORK":   ("America/New_York", 9 * 60 + 30, 16 * 60),
    "PARIS":     ("Europe/Paris", 9 * 60, 17 * 60 + 30),
    "FRANCFORT": ("Europe/Paris", 9 * 60, 17 * 60 + 30),
    "AMSTERDAM": ("Europe/Paris", 9 * 60, 17 * 60 + 30),
    "MADRID":    ("Europe/Paris", 9 * 60, 17 * 60 + 30),
    "ZURICH":    ("Europe/Paris", 9 * 60, 17 * 60 + 30),
    "EUROPE":    ("Europe/Paris", 9 * 60, 17 * 60 + 30),
    "LONDRES":   ("Europe/London", 8 * 60, 16 * 60 + 30),
    "TOKYO":     ("Asia/Tokyo", 9 * 60, 15 * 60),
    "HONGKONG":  ("Asia/Hong_Kong", 9 * 60 + 30, 16 * 60),
    "SEOUL":     ("Asia/Seoul", 9 * 60, 15 * 60 + 30),
}
PARIS = ZoneInfo("Europe/Paris")


def seance_ouverte(symbol: str, maintenant: datetime | None = None) -> bool:
    """La séance de cet actif est-elle en cours ?"""
    now = maintenant or datetime.now(timezone.utc)
    classe, place = classify(symbol)
    if classe == "CRYPTO":
        return True
    if place == "MONDE" or classe in ("MATIERE", "DEVISE", "FOREX"):
        # Du dimanche 23 h au vendredi 22 h, heure de Paris.
        p = now.astimezone(PARIS)
        j, h = p.weekday(), p.hour
        if j == 5:
            return False
        if j == 6:
            return h >= 23
        if j == 4:
            return h < 22
        return True
    fuseau, ouvre, ferme = PLACES.get(place, PLACES["NEWYORK"])
    loc = now.astimezone(ZoneInfo(fuseau))
    if loc.weekday() >= 5:
        return False
    minute = loc.hour * 60 + loc.minute
    return ouvre <= minute < ferme


def cours_en_direct_utiles(symbols, maintenant: datetime | None = None) -> bool:
    """Vrai dès qu'un actif de la liste a sa séance ouverte."""
    return any(seance_ouverte(s, maintenant) for s in symbols or [])
