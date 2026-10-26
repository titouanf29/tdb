"""Les erreurs serveur qui s'enchaînent préviennent l'équipe, une fois par heure."""

import asyncio
import time

from fastapi.testclient import TestClient

from main import app
from api.database import execute_query, execute_write
from api.services import surveillance

client = TestClient(app, raise_server_exceptions=False)


async def _panne(symbole: str):
    raise RuntimeError(f"panne sur {symbole}")

app.add_api_route("/api/test-panne/{symbole}", _panne, methods=["GET"])


def _admin():
    n = int(time.time() * 1000)
    d = client.post("/api/auth/register", headers={"X-Forwarded-For": f"10.77.{n % 250}.{(n // 250) % 250}"}, json={
        "email": f"surv.{n}@example.com", "password": "Bonjour2026", "username": f"surv{n % 10**7}"}).json()
    asyncio.run(execute_write("UPDATE web_users SET is_admin = 1 WHERE id = ?", (d["user"]["id"],)))
    return d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}


def test_cinq_erreurs_previennent_l_equipe_une_fois():
    surveillance._recentes.clear()
    surveillance._derniere_alerte = 0.0
    uid, h = _admin()
    # Une boucle qui reste ouverte, comme celle du serveur : l'alerte part
    # dans une tâche de fond.
    with TestClient(app, raise_server_exceptions=False) as c:
        for s in ["AAPL", "TSLA", "MC.PA", "BTC", "GLE.PA", "SAN.PA"]:
            assert c.get(f"/api/test-panne/{s}").status_code == 500
        time.sleep(1.0)
    notes = asyncio.run(execute_query(
        "SELECT title, message FROM user_notifications WHERE user_id = ? AND type = 'admin_erreurs'", (uid,)))
    assert len(notes) == 1
    # Le modèle de la route : six symboles différents restent une seule panne.
    assert "GET /api/test-panne/{symbole}" in notes[0]["message"] and "RuntimeError" in notes[0]["message"]
    liste = client.get("/api/admin/erreurs", headers=h).json()
    assert liste[0]["route"] == "GET /api/test-panne/{symbole}" and liste[0]["detail"] == "panne sur SAN.PA"
