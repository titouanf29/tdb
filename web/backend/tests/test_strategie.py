"""Le moteur des stratégies utilisateur, sur des cours inventés."""

import numpy as np
import pandas as pd

from api.routes import _strategie as S


def cours(n=400, pente=0.001, bruit=0.01, graine=1):
    rng = np.random.default_rng(graine)
    c = 100 * np.exp(np.cumsum(pente + bruit * rng.standard_normal(n)))
    idx = pd.date_range("2020-01-01", periods=n, freq="B")
    return pd.DataFrame({"Open": c, "High": c * 1.01, "Low": c * 0.99, "Close": c,
                         "Volume": rng.integers(1_000, 2_000, n).astype(float)}, index=idx)


def cles(avis):
    return {a["cle"] for a in avis}


def test_normaliser_borne_les_reglages():
    s = S.normaliser({"stop_atr": 99, "objectif_r": -3, "risque_pct": "abc",
                      "conditions": [{"type": "inconnu"}, {"type": "rsi", "seuil": 500}], "actifs": ["aapl", "AAPL"]})
    assert s["stop_atr"] == 8.0 and s["objectif_r"] == 0.3 and s["risque_pct"] == 1.0
    assert s["conditions"] == [{"type": "rsi", "seuil": 99, "mode": "sous"}]
    assert s["actifs"] == ["AAPL"]


def test_conditions_contradictoires_bloquent():
    s = S.normaliser({"conditions": [{"type": "tendance_ma", "periode": 200, "position": "dessus"},
                                     {"type": "tendance_ma", "periode": 200, "position": "dessous"}],
                      "actifs": ["X"]})
    avis = S.verifier(s)
    assert S.bloquante(avis) and "ma_contradictoire" in cles(avis)
    assert sum(1 for a in avis if a["cle"] == "ma_contradictoire") == 1


def test_sans_condition_ni_actif():
    avis = S.verifier(S.normaliser({}))
    assert {"aucune_condition", "aucun_actif"} <= cles(avis)


def test_plan_incoherent_signale():
    s = S.normaliser({"conditions": [{"type": "rsi", "seuil": 30, "mode": "repasse_dessus"}], "actifs": ["X"],
                      "stop_atr": 0.5, "objectif_r": 0.6, "risque_pct": 8})
    assert {"objectif_court", "stop_serre", "risque_ruineux"} <= cles(S.verifier(s))


def test_strategie_saine_sans_remarque():
    s = S.normaliser({"conditions": [{"type": "tendance_ma", "periode": 200, "position": "dessus"},
                                     {"type": "rsi", "seuil": 40, "mode": "repasse_dessus"}], "actifs": ["X"],
                      "stop_atr": 2, "objectif_r": 2, "duree_max": 20, "risque_pct": 1})
    assert S.verifier(s) == []


def test_rejeu_une_position_a_la_fois_et_sans_futur():
    h = cours()
    s = S.normaliser({"conditions": [{"type": "tendance_ma", "periode": 50, "position": "dessus"}],
                      "actifs": ["X"], "stop_atr": 2, "objectif_r": 2, "duree_max": 20})
    r = S.rejouer(h, s, "X")
    assert r["trades"]
    # Aucune position ne commence avant la fermeture de la précédente.
    for a, b in zip(r["trades"], r["trades"][1:]):
        assert b["entree_le"] >= a["sortie_le"]
    # Le résultat d'une date ne dépend pas des cours qui suivent : couper la
    # fin ne change pas les premiers trades.
    r2 = S.rejouer(h.iloc[:300], s, "X")
    assert r2["trades"][0] == r["trades"][0]


def test_aucun_trade_nomme_la_condition_rare():
    h = cours()
    s = S.normaliser({"conditions": [{"type": "rsi", "seuil": 2, "mode": "sous"}], "actifs": ["X"]})
    syn = S.synthese([S.rejouer(h, s, "X")], s)
    assert syn["stats"]["trades"] == 0 and "le RSI est sous 2" in syn["lecture"][0]["texte"]


def test_signal_du_jour():
    h = cours(pente=0.003)
    s = S.normaliser({"conditions": [{"type": "tendance_ma", "periode": 50, "position": "dessus"}], "actifs": ["X"]})
    sig = S.signal_du_jour(h, s)
    assert sig["reunies"] is True and sig["plan"]["stop"] < sig["plan"]["entree"] < sig["plan"]["objectif"]


def test_film_coherent_avec_le_rejeu():
    h = cours()
    s = S.normaliser({"conditions": [{"type": "tendance_ma", "periode": 50, "position": "dessus"},
                                     {"type": "rsi", "seuil": 45, "mode": "dessus"}],
                      "actifs": ["X"], "stop_atr": 2, "objectif_r": 2, "duree_max": 20})
    f = S.film(h, s, "X")
    n = len(f["dates"])
    assert len(f["c"]) == n and all(len(x["masque"]) == n for x in f["conditions"])
    assert [x["cle"] for x in f["superpositions"]] == ["ema50"] and f["panneaux"][0]["type"] == "rsi"
    for t in f["trades"]:
        # Le jour de l'entrée, toutes les conditions étaient vraies.
        assert all(x["masque"][t["i_e"]] == "1" for x in f["conditions"])
        assert f["dates"][t["i_e"]] == t["entree_le"] and f["dates"][t["i_s"]] == t["sortie_le"]
        assert t["stop"] < t["entree"] < t["objectif"]
    import json
    json.dumps(f)
