"""La démo de l'accueil : la vraie analyse, traduite, gardée, et jamais un écran vide."""

import pandas as pd
from fastapi.testclient import TestClient

from main import app
from api.routes import demo

client = TestClient(app)

ANALYSE = {
    "price": {"current": 343.18, "change": -1.27},
    "score": {"total": 41.0, "trend": 79, "momentum": 50, "volume": 58},
    "volatility_context": {"percentile": 16.0},
    "factor_directions": {"trend": 0.58, "momentum": 0.0, "flow": 0.16},
    "indicators": {"rsi": {"value": 56.7}},
    "market_context": {"regime": "NEUTRAL"},
    "levels": {"support": 325.81, "resistance": 351.73},
    "nimbo": {"propose": False},
}


def test_traduction():
    d = demo.traduire("apple", ANALYSE, [300.0, 320.0, 343.18])
    assert d["price"] == "343,18 $" and d["direction"] == "Neutre" and d["score"] == 41
    assert d["reasons"][0] == "La tendance de fond est orientée à la hausse."
    assert "pas assez net" in d["reasons"][-1]
    assert d["risk"] == "Faible"
    assert {"label": "Plan proposé", "value": "Aucun aujourd'hui"} in d["advanced"]
    assert not any("—" in r for r in d["reasons"])


def test_route_et_cache(monkeypatch):
    appels = []

    async def fausse_analyse(**k):
        appels.append(k["symbol"])
        assert k["current_user"] is None and k["request"].headers.get("x-nimbo-scanner")
        return ANALYSE

    async def faux_cours(symbole, period, interval):
        return pd.DataFrame({"Close": [1.0, 2.0, 3.0]})

    monkeypatch.setattr(demo.analysis.analyze_asset, "__wrapped__", fausse_analyse)
    monkeypatch.setattr(demo, "fetch_ohlcv", faux_cours)
    demo._cache.pop("tesla", None)
    r1 = client.get("/api/demo/tesla").json()
    r2 = client.get("/api/demo/tesla").json()
    assert r1["name"] == "Tesla" and r1["series"] == [1.0, 2.0, 3.0] and r1["analyse_a"]
    assert r2 == r1 and appels == ["TSLA"]
    assert client.get("/api/demo/inconnu").status_code == 404


def test_la_liste_des_pages_publiques():
    r = client.get("/api/demo").json()
    ids = [a["id"] for a in r]
    assert ids[:5] == ["apple", "bitcoin", "tesla", "or", "sp500"] and all(a["demo"] for a in r[:5])
    assert {"lvmh", "cac40", "eur-usd"} <= set(ids) and len(ids) == len(set(ids))


def test_un_cours_de_change_garde_quatre_decimales():
    d = demo.traduire("eur-usd", {**ANALYSE, "price": {"current": 1.08421, "change": 0.1}}, [1.08, 1.0842])
    assert d["price"] == "1,0842" and d["categorie"] == "Devises"


def test_la_direction_suit_le_plan_de_nimbo_et_pas_le_score_seul():
    rebond = {**ANALYSE, "score": {**ANALYSE["score"], "total": 62.0}, "nimbo": {"propose": False}}
    assert demo.traduire("lvmh", rebond, [1.0, 2.0])["direction"] == "Neutre"
    achat = {**rebond, "nimbo": {"propose": True, "sens": "long"}}
    assert demo.traduire("lvmh", achat, [1.0, 2.0])["direction"] == "Haussier"
