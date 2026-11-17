"""La performance « 1 semaine » se lit au calendrier, quelle que soit l'unité des bougies."""

import pandas as pd
import pytest

from api.routes.analysis import perf_calendaire


def test_semaine_en_hebdomadaire():
    # Bougies hebdomadaires : la semaine est la bougie d'avant, pas cinq semaines plus tôt.
    idx = pd.date_range("2026-01-02", periods=10, freq="W-FRI")
    close = pd.Series([100, 102, 104, 106, 108, 110, 112, 114, 116, 120.0], index=idx)
    assert perf_calendaire(close, pd.DateOffset(days=7)) == pytest.approx((120 / 116 - 1) * 100)


def test_semaine_en_journalier():
    idx = pd.bdate_range("2026-03-02", periods=12)
    close = pd.Series(range(100, 112), index=idx, dtype=float)
    # Une semaine de bourse : cinq séances plus tôt.
    assert perf_calendaire(close, pd.DateOffset(days=7)) == pytest.approx((111 / 106 - 1) * 100)


def test_historique_trop_court():
    idx = pd.bdate_range("2026-03-02", periods=3)
    assert perf_calendaire(pd.Series([1.0, 2.0, 3.0], index=idx), pd.DateOffset(months=1)) is None
