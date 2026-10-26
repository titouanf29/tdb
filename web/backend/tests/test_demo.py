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
