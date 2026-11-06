"""Ce que les visiteurs-testeurs ont vu de faux sur l'analyse, et qui ne doit pas revenir."""

import numpy as np

from api.routes._scoring import plan_structurel
from api.routes._figures import statut_figure


def test_un_plan_ne_passe_jamais_sous_zero():
    # LVMH à 408 € en mensuel : un ATR énorme multiplié par 6 donnait un objectif négatif.
    p = plan_structurel(prix=408.0, atr=120.0, support=380.0, resistance=430.0,
                        vente=True, sl_atr=2.0, tp_atr=6.0, plafonner=False)
    assert p["degenere"] is True
    assert p["tp"] > 0 and p["sl"] > 0 and p["tp_structure"] > 0
    # Un plan ordinaire reste intact.
    q = plan_structurel(prix=100.0, atr=2.0, support=92.0, resistance=110.0,
                        vente=False, sl_atr=1.5, tp_atr=4.5, plafonner=False)
    assert q["degenere"] is False and q["sl"] == 97.0 and q["tp"] == 109.0


def test_un_actif_sans_cotation_n_a_pas_de_plan():
    p = plan_structurel(prix=0.0006, atr=0.0, support=0.0006, resistance=0.0006,
                        vente=False, sl_atr=1.5, tp_atr=4.5)
    assert p["degenere"] is True


def test_une_figure_annulee_le_dit():
    close = np.array([100, 102, 104, 103, 105, 101, 99, 98], dtype=float)
    high = close + 1
    low = close - 1
    fig = {"sens": "haussier", "i_fin": 4, "invalidation": 100.0, "objectif": 115.0}
    assert statut_figure(fig, close, high, low) == "annulee"
    fig2 = {"sens": "haussier", "i_fin": 4, "invalidation": 90.0, "objectif": 102.0}
    assert statut_figure(fig2, close, high, low) == "objectif_atteint"
    fig3 = {"sens": "haussier", "i_fin": 4, "invalidation": 90.0, "objectif": 130.0}
    assert statut_figure(fig3, close, high, low) == "en_cours"
    # Une figure achevée sur la dernière bougie n'a rien à relire.
    assert statut_figure({"sens": "baissier", "i_fin": 7, "invalidation": 110.0, "objectif": 80.0}, close, high, low) == "en_cours"
