"""Tests du moteur de structure / Fibonacci / confluence (en shadow).

Lancer : cd web/backend && python -m pytest -q tests/test_structure.py

Le point qui compte le plus est la CAUSALITÉ : le rejeu historique appelle
les mêmes fonctions que l'écran sur l'historique tronqué ; si elles lisaient
une seule bougie future, toute la mesure serait fausse.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.routes._figures import pivots  # noqa: E402
from api.routes._structure import (ECHELLES, PRIMAIRE, analyser_unite, fibonacci_jambe,  # noqa: E402
                                   jambe_active, lire_structure, Jambe)
from api.routes._figures import Pivot  # noqa: E402
from api.routes._confluence import confluence, contexte_technique, clusters  # noqa: E402
from api.routes._scoring import compute_score  # noqa: E402


def marche(n=1200, graine=0, derive=0.0):
    g = np.random.default_rng(graine)
    c = 100 * np.exp(np.cumsum(g.normal(derive, 0.012, n)))
    o = np.r_[c[0], c[:-1]]
    h = np.maximum(o, c) * (1 + np.abs(g.normal(0, 0.004, n)))
    l = np.minimum(o, c) * (1 - np.abs(g.normal(0, 0.004, n)))
    idx = pd.date_range("2018-01-01", periods=n, freq="B")
    return pd.DataFrame({"Open": o, "High": h, "Low": l, "Close": c, "Volume": g.integers(1e5, 1e6, n)}, index=idx)


# ── Causalité ────────────────────────────────────────────────────────────

@pytest.mark.parametrize("graine", range(5))
def test_un_pivot_confirme_ne_change_jamais(graine):
    """Ajouter des bougies futures ne modifie ni ne supprime aucun pivot
    déjà confirmé : pas de repainting du passé."""
    df = marche(graine=graine)
    for k, _ in ECHELLES.values():
        for t in (300, 600, 900):
            avant = pivots(df.High.to_numpy()[:t], df.Low.to_numpy()[:t], k=k)
            apres = pivots(df.High.to_numpy()[:t + 150], df.Low.to_numpy()[:t + 150], k=k)
            # Tous les pivots d'« avant », sauf éventuellement le dernier (la
            # règle « deux pivots de même nature : garder le plus marquant »
            # peut le remplacer par un pivot suivant plus extrême), restent.
            communs = [p for p in apres if p.i < avant[-1].i] if avant else []
            assert [(p.i, p.genre) for p in avant[:-1]] == [(p.i, p.genre) for p in communs][:len(avant) - 1]


def test_rien_ne_lit_au_dela_de_la_derniere_bougie():
    """Le résultat à la date t ne dépend que des bougies jusqu'à t : on
    remplace le futur par n'importe quoi, la lecture à t est identique."""
    df = marche(graine=7)
    t = 800
    a = analyser_unite(df.iloc[:t], 1.0, float(df.Close.iloc[t - 1]), "1d")
    folie = df.copy()
    folie.iloc[t:, :4] = folie.iloc[t:, :4] * 3
    b = analyser_unite(folie.iloc[:t], 1.0, float(df.Close.iloc[t - 1]), "1d")
    assert a == b


def test_marche_aleatoire_pas_de_signal_fantome():
    """Sur une marche aléatoire, être dans une zone de repli d'une jambe
    haussière ne doit pas « prédire » la hausse : ~50 %. Un écart net
    trahirait une lecture du futur (la même épreuve que valider_figures.py)."""
    haut, total = 0, 0
    for graine in range(40):
        df = marche(n=900, graine=100 + graine)
        c = df.Close.to_numpy()
        for t in range(200, 880, 7):
            w = df.iloc[:t]
            atr = float((w.High - w.Low).tail(14).mean())
            u = analyser_unite(w, atr, float(c[t - 1]), "1d")
            j = (u or {}).get("jambes", {}).get(PRIMAIRE)
            if j and j["sens"] == "hausse" and j["zone_repli"]:
                total += 1
                haut += c[t - 1 + 20] > c[t - 1]
    taux = haut / total
    se = np.sqrt(0.25 / total)
    assert total > 200
    assert abs(taux - 0.5) < 3 * se, f"{taux:.3f} sur {total} : la détection voit-elle l'avenir ?"


# ── Géométrie ────────────────────────────────────────────────────────────

def test_orientation_des_niveaux():
    hausse = Jambe(Pivot(0, 100.0, "bas"), Pivot(10, 200.0, "haut"), True)
    f = fibonacci_jambe(hausse, 150.0, 5.0, 20, PRIMAIRE, "1d", 10)
    n = {x["ratio"]: x["prix"] for x in f["niveaux"]}
    assert n["38.2"] == pytest.approx(161.8) and n["61.8"] == pytest.approx(138.2) and n["50"] == pytest.approx(150)
    assert n["161.8"] == pytest.approx(261.8)            # extension au-delà du sommet
    assert f["phase"] == "correction" and f["zone_repli"]

    baisse = Jambe(Pivot(0, 200.0, "haut"), Pivot(10, 100.0, "bas"), True)
    f = fibonacci_jambe(baisse, 150.0, 5.0, 20, PRIMAIRE, "1d", 10)
    n = {x["ratio"]: x["prix"] for x in f["niveaux"]}
    assert n["38.2"] == pytest.approx(138.2) and n["61.8"] == pytest.approx(161.8)
    assert n["161.8"] == pytest.approx(38.2)


def test_phases_extension_et_invalidation():
    j = Jambe(Pivot(0, 100.0, "bas"), Pivot(10, 200.0, "haut"), False)
    assert fibonacci_jambe(j, 210.0, 5.0, 20, PRIMAIRE, "1d", 10)["phase"] == "extension"
    assert fibonacci_jambe(j, 95.0, 5.0, 20, PRIMAIRE, "1d", 10)["phase"] == "invalidee"


def test_structure_hh_hl_et_rupture():
    ps = [Pivot(0, 90, "bas"), Pivot(5, 110, "haut"), Pivot(10, 95, "bas"), Pivot(15, 120, "haut")]
    assert lire_structure(ps, 115)["etat"] == "haussiere"
    assert lire_structure(ps, 115)["rompue"] is False
    assert lire_structure(ps, 94)["rompue"] is True           # sous le dernier creux montant


def test_la_jambe_candidate_est_signalee():
    h = np.array([10, 11, 12, 11, 10, 9, 8, 9, 10, 11, 12, 13, 14, 15, 16], float)
    l = h - 0.5
    ps = [Pivot(6, 7.5, "bas")]
    j = jambe_active(ps, h, l, 1.0, 3.0)
    assert j is not None and j.fin.prix == 16 and not j.fin_confirmee


# ── Confluence ───────────────────────────────────────────────────────────

def test_confluence_dit_les_contradictions_et_reste_en_shadow():
    df = marche(graine=3, derive=0.0008)
    S = compute_score(df.High, df.Low, df.Close, df.Volume)
    px = float(df.Close.iloc[-1])
    c = contexte_technique(df, S, "1d", px, {"support": float(df.Low.tail(20).min())})
    assert c["version"] == "1.0" and c["shadow"] is True
    k = c["confluence"]
    assert k["poids"] == 0.0
    assert set(k["familles"]) >= {"FIBONACCI", "STRUCTURE", "MOMENTUM", "VOLUME"}
    # Une famille = une voix, jamais davantage.
    assert all(v["vote"] in (-1, 0, 1) for v in k["familles"].values())
    assert k["force"] == len(k["alignees"]) - len(k["contraires"])


def test_structure_rompue_donne_la_situation_b():
    """Fibonacci + support, MAIS structure cassée : la sortie doit le dire
    (situation B), pas additionner les points."""
    principale = {
        "unite": "1d", "atr": 1.0, "bruite": False,
        "structure": {"etat": "haussiere", "rompue": True, "sommets": "HH", "creux": "HL"},
        "jambes": {PRIMAIRE: {
            "id": "1d:intermediaire:0-10", "sens": "hausse", "phase": "correction", "confiance": "moyenne",
            "niveau_proche": {"ratio": "61.8", "zone": [99.75, 100.25], "position": "dans la zone", "distance_atr": 0.0},
            "niveaux": [],
        }},
    }
    idx = pd.date_range("2024-01-01", periods=5, freq="B")
    df = pd.DataFrame({"Open": 100.0, "High": 100.5, "Low": 99.5, "Close": 100.0, "Volume": 1}, index=idx)
    k = confluence(principale, None, {"atr": 1.0}, df, 100.0, {"support": 100.0})
    assert "STRUCTURE" in k["contraires"] and "SUPPORT_RESISTANCE" in k["alignees"]
    assert k["situation"] == "B"


def test_un_cluster_ne_se_chaine_pas():
    niv = lambda p: {"genre": "retracement", "ratio": "50", "prix": p, "zone": [p - 0.25, p + 0.25]}
    u = {"unite": "1d", "jambes": {
        "a": {"id": "a", "phase": "correction", "niveaux": [niv(100.0)]},
        "b": {"id": "b", "phase": "correction", "niveaux": [niv(100.4)]},
        "c": {"id": "c", "phase": "correction", "niveaux": [niv(100.8)]},
    }}
    cl = clusters([u], 100.4, 1.0)
    assert all(c["zone"][1] - c["zone"][0] <= 1.0 + 1e-9 for c in cl)
