"""Les notifications : choix respectés, pas de doublon, veille du serveur."""

import asyncio
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from main import app
from api.database import execute_query, execute_write
from api.services import notifications as N
from api.services import veille_notifs
from api.routes import _prices

client = TestClient(app)


def _compte():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.88.{n % 250}.{(n // 250) % 250}"}
    r = client.post("/api/auth/register", headers=ip, json={
        "email": f"notif.{n}@example.com", "password": "Bonjour2026", "username": f"notif{n % 10**7}"})
    assert r.status_code == 201, r.text
    d = r.json()
    return d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}


def _fil(h):
    return client.get("/api/community/notifications", headers=h).json()


def test_preferences_par_defaut_et_verrou():
    uid, h = _compte()
    p = client.get("/api/notifications/preferences", headers=h).json()
    assert [c["id"] for c in p["categories"]] == ["positions", "alertes", "nimbo", "macro", "support", "compte"]
    assert all(c["site"] and c["appareil"] for c in p["categories"])
    # « Compte » reste toujours dans le site, même si on demande le contraire.
    cats = {c["id"]: {"site": False, "appareil": False} for c in p["categories"]}
    p = client.put("/api/notifications/preferences", headers=h,
                   json={"categories": cats, "calme": {"actif": True, "debut": 22, "fin": 7}}).json()
    compte = next(c for c in p["categories"] if c["id"] == "compte")
    assert compte["site"] is True and compte["appareil"] is False
    assert p["calme"] == {"actif": True, "debut": 22, "fin": 7}


def test_pas_de_doublon_et_choix_respectes():
    uid, h = _compte()
    for _ in range(2):
        asyncio.run(N.notifier(uid, "position_closed", "Stop touché sur AAPL", "Clôturée.", "/journal", cle="position:t1"))
    assert _fil(h)["unread_count"] == 1
    client.put("/api/notifications/preferences", headers=h,
               json={"categories": {"positions": {"site": False, "appareil": True}}})
    asyncio.run(N.notifier(uid, "position_closed", "Stop touché sur MSFT", "Clôturée.", "/journal", cle="position:t2"))
    asyncio.run(N.notifier(uid, "nimbo", "Nimbo propose un achat", "Un favori.", "/analysis"))
    titres = [n["title"] for n in _fil(h)["notifications"]]
    assert "Stop touché sur MSFT" not in titres and "Nimbo propose un achat" in titres


def test_heures_calmes():
    calme = {"actif": True, "debut": 22, "fin": 8}
    paris = ZoneInfo("Europe/Paris")
    assert N.en_heures_calmes(calme, datetime(2026, 3, 2, 23, 30, tzinfo=paris))
    assert N.en_heures_calmes(calme, datetime(2026, 3, 2, 6, 0, tzinfo=paris))
    assert not N.en_heures_calmes(calme, datetime(2026, 3, 2, 12, 0, tzinfo=paris))
    assert not N.en_heures_calmes({**calme, "actif": False}, datetime(2026, 3, 2, 23, 0, tzinfo=paris))
    assert N.en_heures_calmes({"actif": True, "debut": 13, "fin": 14}, datetime(2026, 3, 2, 13, 5, tzinfo=paris))


def test_pastille_juste_au_dela_de_50_et_effacement():
    uid, h = _compte()
    for i in range(55):
        asyncio.run(N.notifier(uid, "macro", f"Annonce {i}", "…", None))
    d = _fil(h)
    assert d["unread_count"] == 55 and len(d["notifications"]) == 50
    premiere = d["notifications"][0]["id"]
    client.delete(f"/api/community/notifications/{premiere}", headers=h)
    assert _fil(h)["unread_count"] == 54
    client.post("/api/community/notifications/read-all", headers=h)
    client.delete("/api/community/notifications", headers=h)
    assert _fil(h)["notifications"] == []


def test_veille_declenche_les_alertes_une_seule_fois(monkeypatch):
    uid, h = _compte()
    r = client.post("/api/alerts", headers=h, json={"symbol": "AAPL", "direction": "above", "target": 150})
    assert r.status_code in (200, 201), r.text

    async def faux_cours(symboles, *a, **k):
        return {s: {"price": 210.5} for s in symboles}
    monkeypatch.setattr(_prices, "fetch_prices", faux_cours)
    asyncio.run(veille_notifs.verifier_alertes())
    asyncio.run(veille_notifs.verifier_alertes())
    alertes = [n for n in _fil(h)["notifications"] if n["type"] == "price_alert"]
    assert len(alertes) == 1
    assert "150,00" in alertes[0]["title"] and "210,50" in alertes[0]["message"]


def test_veille_execute_un_stop_site_ferme(monkeypatch):
    uid, h = _compte()
    maintenant = datetime.now(timezone.utc).isoformat()
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, stop_loss, "
        "take_profit, status, created_at) VALUES (?, 'AAPL', 'LONG', 200, 1, 200, 1, 190, 260, 'open', ?)",
        (f"web_{uid}", maintenant)))

    async def faux_cours(symboles, *a, **k):
        return {s: {"price": 185.0} for s in symboles}
    monkeypatch.setattr(_prices, "fetch_prices", faux_cours)
    asyncio.run(veille_notifs.verifier_positions())
    asyncio.run(veille_notifs.verifier_positions())
    pos = asyncio.run(execute_query("SELECT status, exit_price FROM positions WHERE user_id = ?", (f"web_{uid}",)))
    assert pos[0]["status"] == "closed" and pos[0]["exit_price"] == 190
    stops = [n for n in _fil(h)["notifications"] if n["type"] == "position_closed"]
    assert len(stops) == 1 and "AAPL" in stops[0]["title"]
