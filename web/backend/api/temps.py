"""Les journées du site sont celles de Paris.

Missions du jour, série de jours d'affilée, journal des gestes : tout ce qui
dit « aujourd'hui » se découpait à minuit UTC, soit 1 h ou 2 h du matin à
Paris. Une visite à 0 h 30 comptait pour la veille, et une série pouvait
sauter sans que personne ait manqué un jour.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

PARIS = ZoneInfo("Europe/Paris")


def aujourdhui_paris() -> date:
    return datetime.now(PARIS).date()


def jour_paris(instant) -> date | None:
    """Le jour, à Paris, d'un instant (datetime ou texte ISO). Sans fuseau, il est lu en UTC."""
    if instant is None:
        return None
    if isinstance(instant, datetime):
        d = instant
    else:
        try:
            d = datetime.fromisoformat(str(instant).replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(PARIS).date()
