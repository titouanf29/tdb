"""Ce que les visiteurs-testeurs ont vu de faux à la clôture et au journal."""

import asyncio
import time
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from main import app
from api.database import execute_write
from api.routes._trade_review import build_advice, review

client = TestClient(app)


def _pos(**k):
    p = {"symbol": "NVDA", "direction": "LONG", "entry_price": 187.29, "amount": 1600.0, "quantity": 8.54,
         "stop_loss": 180.0, "take_profit": 210.0, "leverage": 1, "created_at": datetime.now(timezone.utc).isoformat()}
    p.update(k)
    return p


def test_une_sortie_a_la_main_avant_le_stop_n_est_pas_le_plan():
    conseils = build_advice(_pos(), exit_price=187.0, pnl=-2.48, style="swing", minutes=7, closed_by=None)
    assert any("fermé à la main" in c and "avant le stop" in c for c in conseils)
    assert not any("suivi le plan" in c for c in conseils)
    # Le stop touché, lui, est bien une perte dans les règles.
    conseils = build_advice(_pos(), exit_price=180.0, pnl=-62.0, style="swing", minutes=4000, closed_by="stop_loss")
    assert any("a été touché" in c for c in conseils)
    assert not any("fermé à la main" in c for c in conseils)


def test_le_dossier_dit_comment_la_position_s_est_fermee():
    r = review(_pos(), 187.0, -2.48, style="swing", closed_by=None)
    assert "Clôture à la main, avant le stop et l'objectif." in r["pre_trade_notes"]
    r2 = review(_pos(), 180.0, -62.0, style="swing", closed_by="stop_loss")
    assert "Clôture automatique sur le stop." in r2["pre_trade_notes"]


def test_une_cloture_manuelle_ecrit_sa_ligne_au_journal():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.77.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"journal.{n}@example.com", "password": "Bonjour2026", "username": f"journal{n % 10**7}"}).json()
    uid, h = d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}
    now = datetime.now(timezone.utc).isoformat()
    # Une position posée en base, pour ne pas dépendre d'un cours en direct à l'ouverture.
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, stop_loss, take_profit, "
        "status, created_at) VALUES (?, 'AAPL', 'LONG', 100, 10, 1000, 1, 95, 110, 'open', ?)", (f"web_{uid}", now)))
    from api.database import execute_query
    pid = asyncio.run(execute_query("SELECT id FROM positions WHERE user_id = ? AND status = 'open'", (f"web_{uid}",)))[0]["id"]
    r = client.post("/api/wallet/positions/close", headers=h, json={"position_id": pid})
    assert r.status_code == 200, r.text
    corps = r.json()
    assert corps["journal_entry_id"]
    entrees = client.get("/api/journal", headers=h).json()["entries"]
    assert len(entrees) == 1 and entrees[0]["id"] == corps["journal_entry_id"] and entrees[0]["setup"] == "manuel"
    # La note complète la ligne, elle n'en crée pas une seconde.
    client.put(f"/api/journal/{corps['journal_entry_id']}", headers=h, json={"post_trade_notes": "Sorti trop tôt."})
    entrees = client.get("/api/journal", headers=h).json()["entries"]
    assert len(entrees) == 1 and entrees[0]["post_trade_notes"] == "Sorti trop tôt."
    # Une entrée sans résultat ne compte pas dans la réussite.
    client.post("/api/journal", headers=h, json={"symbol": "MC.PA", "direction": "LONG", "post_trade_notes": "Idée."})
    s = client.get("/api/journal/stats", headers=h).json()
    assert s["total"] == 1 and s["entrees"] == 2
