"""L'administration voit vraiment les comptes, et apprend chaque inscription."""

import asyncio
import time
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from main import app
from api.database import execute_query, execute_write

client = TestClient(app)


def _compte(prefixe="admintest"):
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.55.{n % 250}.{(n // 250) % 250}"}
    r = client.post("/api/auth/register", headers=ip, json={
        "email": f"{prefixe}.{n}@example.com", "password": "Bonjour2026", "username": f"{prefixe}{n % 10**7}"})
    assert r.status_code == 201, r.text
    d = r.json()
    return d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}


def _admin():
    uid, h = _compte("chef")
    asyncio.run(execute_write("UPDATE web_users SET is_admin = 1 WHERE id = ?", (uid,)))
    return uid, h


def test_l_equipe_est_prevenue_de_chaque_inscription():
    aid, ah = _admin()
    uid, _ = _compte("nouveau")
    notes = client.get("/api/community/notifications", headers=ah).json()["notifications"]
    n = next((x for x in notes if x["type"] == "admin_inscription"), None)
    assert n and n["title"].startswith("Nouvelle inscription") and f"compte={uid}" in n["link"]
    # La catégorie n'apparaît que pour l'équipe.
    cats = [c["id"] for c in client.get("/api/notifications/preferences", headers=ah).json()["categories"]]
    assert "admin" in cats


def test_la_fiche_montre_le_wallet_les_positions_et_l_activite():
    aid, ah = _admin()
    uid, h = _compte("suivi")
    maintenant = datetime.now(timezone.utc).isoformat()
    # Le wallet est créé à l'inscription ; on lui donne un solde reconnaissable.
    client.get("/api/wallet/balance", headers=h)
    asyncio.run(execute_write("UPDATE wallet SET balance = 9500 WHERE user_id = ?", (f"web_{uid}",)))
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, status, created_at) "
        "VALUES (?, 'AAPL', 'LONG', 100, 5, 500, 1, 'open', ?)", (f"web_{uid}", maintenant)))
    client.post("/api/learn/progress/action", headers=h, json={"action": "analysis_open"})

    liste = client.get(f"/api/admin/users?search=suivi", headers=ah).json()["users"]
    ligne = next(u for u in liste if u["id"] == uid)
    assert ligne["balance"] == 9500 and ligne["open_positions"] == 1

    fiche = client.get(f"/api/admin/users/{uid}", headers=ah).json()
    assert fiche["wallet"]["balance"] == 9500 and len(fiche["positions"]) == 1

    act = client.get(f"/api/admin/users/{uid}/activite", headers=ah).json()
    assert act["gestes"].get("analyse") == 1 and act["gestes"].get("inscription") == 1
    textes = [f["texte"] for f in act["fil"]]
    assert any("Achat sur AAPL" in t for t in textes) and "A analysé un actif" in textes

    r = client.post(f"/api/admin/users/{uid}/adjust-wallet", headers=ah, json={"amount": 250, "reason": "test"})
    assert r.status_code == 200, r.text
    w = asyncio.run(execute_query("SELECT balance FROM wallet WHERE user_id = ?", (f"web_{uid}",)))
    assert w[0]["balance"] == 9750

    # Un compte ordinaire n'y a pas accès.
    assert client.get(f"/api/admin/users/{uid}/activite", headers=h).status_code in (401, 403)
