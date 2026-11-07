"""Quand la lecture des cours en direct ne sert à rien : séances fermées."""
from datetime import datetime
from zoneinfo import ZoneInfo

from api.routes._seances import cours_en_direct_utiles, seance_ouverte

NY = ZoneInfo("America/New_York")
PARIS = ZoneInfo("Europe/Paris")


def test_vendredi_soir_les_actions_sont_fermees_la_crypto_cote():
    t = datetime(2026, 11, 6, 22, 10, tzinfo=PARIS)  # vendredi 22 h 10 à Paris, 16 h 10 à New York
    assert seance_ouverte("NVDA", t) is False
    assert seance_ouverte("MC.PA", t) is False
    assert seance_ouverte("BTC-USD", t) is True
    assert cours_en_direct_utiles(["NVDA", "AAPL", "MC.PA"], t) is False
    assert cours_en_direct_utiles(["NVDA", "BTC-USD"], t) is True


def test_en_seance():
    assert seance_ouverte("NVDA", datetime(2026, 11, 5, 11, 0, tzinfo=NY)) is True      # jeudi 11 h à New York
    assert seance_ouverte("MC.PA", datetime(2026, 11, 5, 11, 0, tzinfo=PARIS)) is True   # jeudi 11 h à Paris
    assert seance_ouverte("MC.PA", datetime(2026, 11, 5, 18, 0, tzinfo=PARIS)) is False  # Paris a fermé
    assert seance_ouverte("NVDA", datetime(2026, 11, 7, 11, 0, tzinfo=NY)) is False      # samedi


def test_matieres_premieres_le_week_end():
    assert seance_ouverte("GC=F", datetime(2026, 11, 7, 12, 0, tzinfo=PARIS)) is False   # samedi
    assert seance_ouverte("GC=F", datetime(2026, 11, 8, 23, 30, tzinfo=PARIS)) is True   # dimanche soir, réouverture
    assert seance_ouverte("GC=F", datetime(2026, 11, 4, 3, 0, tzinfo=PARIS)) is True     # nuit de semaine
