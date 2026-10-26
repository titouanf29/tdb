"""La stratégie active prévient quand elle se déclenche, une seule fois."""

import asyncio
import json
import time
from datetime import datetime, timezone

import pandas as pd
from fastapi.testclient import TestClient

from main import app
from api.database import execute_query, execute_write
from api.routes import _prices, _strategie
from api.services import veille_strategies

client = TestClient(app)


def _compte():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.44.{n % 250}.{(n // 250) % 250}"}
    r = client.post("/api/auth/register", headers=ip, json={
        "email": f"strat.{n}@example.com", "password": "Bonjour2026", "username": f"strat{n % 10**7}"})
    d = r.json()
    return d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}


def _historique(n=120):
    jours = pd.date_range("2026-01-01", periods=n, freq="D")
    prix = [100 + i * 0.1 for i in range(n)]
    return pd.DataFrame({"Open": prix, "High": [p + 1 for p in prix], "Low": [p - 1 for p in prix],
                         "Close": prix, "Volume": [1000] * n}, index=jours)


def _creer_strategie(uid):
    regles = json.dumps({"nom": "Rebond test", "actifs": ["AAPL"], "unite": "1d", "sens": "achat"})
    now = datetime.now(timezone.utc).isoformat()
    asyncio.run(execute_write("INSERT INTO strategies (user_id, nom, regles, active, created_at, updated_at) "
                              "VALUES (?, 'Rebond test', ?, 1, ?, ?)", (uid, regles, now, now)))
    return asyncio.run(execute_query("SELECT * FROM strategies WHERE user_id = ?", (uid,)))[0]


def _notes(h):
    return [n for n in client.get("/api/community/notifications", headers=h).json()["notifications"]
            if n["type"] == "strategie"]


def test_prevenu_le_jour_ou_les_conditions_se_reunissent(monkeypatch):
    uid, h = _compte()
    asyncio.run(veille_strategies.tour())  # crée la table au besoin
    st = _creer_strategie(uid)
    hist = _historique()

    async def faux(symbol, period="1mo", interval="1d"):
        return hist
    monkeypatch.setattr(_prices, "fetch_ohlcv", faux)

    # Réunies sur la dernière bougie seulement.
    def signal(h_, s, prix=None):
        reunies = len(h_) == len(hist)
        return {"possible": True, "reunies": reunies, "conditions": [], "manquantes": 0 if reunies else 1,
                "plan": {"direction": "LONG", "entree": 111.9, "stop": 108.0, "objectif": 119.7, "rr": 2}}
    monkeypatch.setattr(_strategie, "signal_du_jour", signal)

    asyncio.run(veille_strategies.verifier_une(st))
    asyncio.run(veille_strategies.verifier_une(st))   # deuxième passage : rien de plus
    n = _notes(h)
    assert len(n) == 1
    assert "Rebond test" in n[0]["title"] and "stop 108,00, objectif 119,70" in n[0]["message"]


def test_rien_si_les_conditions_l_etaient_deja(monkeypatch):
    uid, h = _compte()
    asyncio.run(veille_strategies.tour())
    st = _creer_strategie(uid)
    hist = _historique()

    async def faux(symbol, period="1mo", interval="1d"):
        return hist
    monkeypatch.setattr(_prices, "fetch_ohlcv", faux)
    monkeypatch.setattr(_strategie, "signal_du_jour",
                        lambda h_, s, prix=None: {"possible": True, "reunies": True, "conditions": [], "plan": None})
    asyncio.run(veille_strategies.verifier_une(st))
    assert _notes(h) == []
