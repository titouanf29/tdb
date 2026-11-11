"""La lecture précédente d'une analyse : rendue si elle date d'un autre jour."""
import asyncio
from datetime import datetime, timedelta, timezone

from api.routes import _lectures


def relire(*a):
    return asyncio.run(_lectures.relire(*a))


def test_premiere_lecture_ne_rend_rien():
    t = datetime(2026, 11, 5, 9, 0, tzinfo=timezone.utc)
    assert relire(901, "AAPL", "1d", 51, "NEUTRE", False, 100.0, t) is None


def test_meme_jour_ne_rend_rien_mais_note():
    t = datetime(2026, 11, 5, 9, 0, tzinfo=timezone.utc)
    relire(902, "AAPL", "1d", 51, "NEUTRE", False, 100.0, t)
    assert relire(902, "AAPL", "1d", 58, "HAUSSIER", True, 101.0, t + timedelta(hours=6)) is None
    # Le lendemain, c'est la lecture de l'après-midi qui sert de référence.
    d = relire(902, "AAPL", "1d", 60, "HAUSSIER", True, 102.0, t + timedelta(days=1))
    assert d is not None and d["score"] == 58 and d["propose"] is True and d["prix"] == 101.0


def test_autre_jour_rend_la_precedente_et_par_unite_de_temps():
    t = datetime(2026, 11, 5, 9, 0, tzinfo=timezone.utc)
    relire(903, "BTC-USD", "1d", 40, "BAISSIER", False, 70000.0, t)
    assert relire(903, "BTC-USD", "1w", 70, "HAUSSIER", True, 70000.0, t + timedelta(days=2)) is None
    d = relire(903, "BTC-USD", "1d", 45, "NEUTRE", False, 71000.0, t + timedelta(days=2))
    assert d == {"lu_le": "2026-11-05T09:00+00:00", "score": 40, "trend": "BAISSIER", "propose": False, "prix": 70000.0}
