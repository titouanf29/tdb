"""Demain : la prochaine séance, et ce que l'écran en dit."""

import time
from datetime import datetime

from fastapi.testclient import TestClient

from main import app
from api.routes import demain as D
from api.temps import PARIS

client = TestClient(app)


def test_la_prochaine_seance_saute_le_week_end():
    assert D.prochaine_seance(datetime(2026, 11, 3, 10, 0, tzinfo=PARIS)).isoformat() == "2026-11-04"   # mardi → mercredi
    assert D.prochaine_seance(datetime(2026, 11, 6, 10, 0, tzinfo=PARIS)).isoformat() == "2026-11-09"   # vendredi → lundi
    assert D.prochaine_seance(datetime(2026, 11, 1, 10, 0, tzinfo=PARIS)).isoformat() == "2026-11-02"   # dimanche → lundi
    assert D.libelle(datetime(2026, 11, 1).date()) == "dimanche 1er novembre"
    assert D.libelle(datetime(2026, 11, 9).date()) == "lundi 9 novembre"


def test_l_ecran_de_demain():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.66.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"demain.{n}@example.com", "password": "Bonjour2026", "username": f"demain{n % 10**7}"}).json()
    h = {"Authorization": f"Bearer {d['access_token']}"}
    r = client.get("/api/demain", headers=h)
    assert r.status_code == 200
    j = r.json()
    assert j["jour"]["date"] > datetime.now(PARIS).date().isoformat()
    assert [s["place"] for s in j["seances"]] == ["Paris", "New York"]
    assert isinstance(j["agenda"], list) and j["plans"] == [] and j["sans_stop"] == 0
