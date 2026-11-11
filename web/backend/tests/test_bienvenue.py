"""La fenêtre de bienvenue fermée est retenue côté compte."""
import time

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_bienvenue_vue_fait_le_tour():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.88.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"bienvenue.{n}@example.com", "password": "Bonjour2026", "username": f"bienv{n % 10**7}"}).json()
    h = {"Authorization": f"Bearer {d['access_token']}", **ip}
    assert client.get("/api/users/profile-preferences", headers=h).json()["bienvenue_vue"] is None
    r = client.put("/api/users/profile-preferences", headers=h, json={"bienvenue_vue": "2026-11-07T10:00:00.000Z"})
    assert r.status_code == 200, r.text
    assert r.json()["bienvenue_vue"] == "2026-11-07T10:00:00.000Z"
    # Un autre champ modifié ne l'efface pas.
    client.put("/api/users/profile-preferences", headers=h, json={"goal": "comprendre"})
    p = client.get("/api/users/profile-preferences", headers=h).json()
    assert p["bienvenue_vue"] == "2026-11-07T10:00:00.000Z" and p["goal"] == "comprendre"
    assert client.put("/api/users/profile-preferences", headers=h, json={"bienvenue_vue": "<script>"}).status_code == 400
