"""La ligne du journal : écrite à l'ouverture, complétée à la clôture, jamais doublée."""
import time

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _compte():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.77.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"journal.{n}@example.com", "password": "Bonjour2026", "username": f"journal{n % 10**7}"}).json()
    return {"Authorization": f"Bearer {d['access_token']}", **ip}


def test_ouverture_puis_cloture_sur_la_meme_ligne(monkeypatch):
    from api.routes import wallet as W

    async def _prix(symbols, *a, **k):
        return {s: {"price": 100.0, "change": 0.0} for s in symbols}
    monkeypatch.setattr(W, "fetch_prices", _prix, raising=False)

    h = _compte()
    r = client.post("/api/wallet/positions/open", headers=h, json={
        "symbol": "AAPL", "direction": "LONG", "amount": 500, "leverage": 2, "stop_loss": 90})
    assert r.status_code == 200, r.text

    j = client.get("/api/journal", headers=h).json()
    entrees = j if isinstance(j, list) else j.get("entries") or j.get("entrees") or []
    assert len(entrees) == 1
    e = entrees[0]
    assert e["setup"] == "ouverture" and e["exit_time"] is None and e["result"] is None
    assert "Achat de" in (e["pre_trade_notes"] or "") and "stop à 90" in e["pre_trade_notes"]

    pos = client.get("/api/wallet/positions?status=open", headers=h).json()["positions"]
    assert len(pos) == 1
    r = client.post("/api/wallet/positions/close", headers=h, json={"position_id": pos[0]["id"]})
    assert r.status_code == 200, r.text
    assert r.json().get("journal_entry_id") == e["id"]

    j = client.get("/api/journal", headers=h).json()
    entrees = j if isinstance(j, list) else j.get("entries") or j.get("entrees") or []
    assert len(entrees) == 1, "la clôture complète la ligne, elle n'en crée pas une deuxième"
    e2 = entrees[0]
    assert e2["id"] == e["id"] and e2["setup"] == "manuel" and e2["exit_time"] and e2["result"] in ("win", "loss", "breakeven")
    assert "Achat de" in (e2["pre_trade_notes"] or "")
