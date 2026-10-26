"""Les missions se valident vraiment, et le récapitulatif raconte l'absence."""

import asyncio
import time
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from main import app
from api.database import execute_query, execute_write
from api.routes import _prices
from api.temps import aujourdhui_paris

client = TestClient(app)


def _compte():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.99.{n % 250}.{(n // 250) % 250}"}
    r = client.post("/api/auth/register", headers=ip, json={
        "email": f"mission.{n}@example.com", "password": "Bonjour2026", "username": f"mission{n % 10**7}"})
    assert r.status_code == 201, r.text
    d = r.json()
    return d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}


def _action(h, action, value=1):
    return client.post("/api/learn/progress/action", headers=h, json={"action": action, "value": value})


def _statut(h, mission_id):
    return next(m for m in client.get("/api/learn/missions", headers=h).json()["missions"] if m["id"] == mission_id)


def test_les_missions_d_analyse_de_scan_et_d_assistant_se_valident():
    uid, h = _compte()
    for action in ("analysis_open", "scanner_run", "ai_chat"):
        assert _action(h, action).status_code == 200
    for mid in ("first_analysis", "daily_analysis", "first_scanner", "daily_scan", "first_ai_chat"):
        assert _statut(h, mid)["status"] == "completed", mid


def test_action_inconnue_et_valeur_plafonnee():
    uid, h = _compte()
    assert _action(h, "nimporte_quoi").status_code == 400
    _action(h, "lesson_complete", value=1000)
    assert _statut(h, "complete_3_lessons")["progress"] == 1


def test_barre_du_niveau_en_cours():
    uid, h = _compte()
    client.get("/api/learn/progress", headers=h)
    asyncio.run(execute_write("UPDATE user_progress SET xp = 600, level = 2 WHERE user_id = ?", (uid,)))
    p = client.get("/api/learn/progress", headers=h).json()
    assert p["xp_for_next_level"] == 500 and p["xp_in_current_level"] == 100


def test_la_serie_demande_des_jours_consecutifs():
    uid, h = _compte()
    client.get("/api/learn/progress", headers=h)
    aujourdhui = aujourdhui_paris()
    # Six jours d'affilée jusqu'à hier, puis la visite d'aujourd'hui : la série atteint 7.
    asyncio.run(execute_write("UPDATE user_progress SET streak_days = 6, last_activity_date = ? WHERE user_id = ?",
                              ((aujourdhui - timedelta(days=1)).isoformat(), uid)))
    _action(h, "daily_login")
    assert _statut(h, "streak_7")["status"] == "completed"

    uid2, h2 = _compte()
    client.get("/api/learn/progress", headers=h2)
    # Six visites mais un trou de trois jours : la série repart de 1.
    asyncio.run(execute_write("UPDATE user_progress SET streak_days = 6, last_activity_date = ? WHERE user_id = ?",
                              ((aujourdhui - timedelta(days=3)).isoformat(), uid2)))
    _action(h2, "daily_login")
    s = _statut(h2, "streak_7")
    assert s["status"] != "completed" and s["progress"] == 1


def test_les_points_ne_se_perdent_pas_entre_deux_gestes():
    uid, h = _compte()
    _action(h, "analysis_open")   # première analyse + analyse du jour
    _action(h, "scanner_run")     # premier scan + scan du jour
    xp = client.get("/api/learn/progress", headers=h).json()["xp"]
    attendu = sum(m["xp"] for m in client.get("/api/learn/missions", headers=h).json()["missions"]
                  if m["status"] == "completed")
    assert xp == attendu


def test_recapitulatif_apres_une_absence(monkeypatch):
    uid, h = _compte()

    async def faux_cours(symboles, *a, **k):
        return {s: {"price": 110.0} for s in symboles}
    monkeypatch.setattr(_prices, "fetch_prices", faux_cours)

    maintenant = datetime.now(timezone.utc)
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, status, created_at) "
        "VALUES (?, 'AAPL', 'LONG', 100, 2, 200, 1, 'open', ?)", (f"web_{uid}", maintenant.isoformat())))
    # Première visite : la photo du compte est prise, rien à raconter.
    assert client.get("/api/dashboard/welcome-back", headers=h).json()["has_summary"] is False
    # Un rechargement juste après ne raconte rien non plus.
    assert client.get("/api/dashboard/welcome-back", headers=h).json()["has_summary"] is False

    # Deux jours plus tard : le cours a monté, une position a été fermée, une alerte est arrivée.
    avant = (maintenant - timedelta(days=2)).isoformat()
    asyncio.run(execute_write("UPDATE dashboard_snapshots SET snapshot_at = ? WHERE user_id = ?", (avant, str(uid))))

    async def cours_montes(symboles, *a, **k):
        return {s: {"price": 120.0} for s in symboles}
    monkeypatch.setattr(_prices, "fetch_prices", cours_montes)
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, status, "
        "realized_pnl, created_at, closed_at) VALUES (?, 'MSFT', 'LONG', 300, 1, 300, 1, 'closed', 42.5, ?, ?)",
        (f"web_{uid}", avant, maintenant.isoformat())))
    asyncio.run(execute_write(
        "INSERT INTO user_notifications (user_id, type, title, message, link, is_read, created_at) "
        "VALUES (?, 'price_alert', 'Apple est passé au-dessus de 115,00', '…', '/analysis?symbol=AAPL', 0, ?)",
        (uid, maintenant.isoformat())))

    r = client.get("/api/dashboard/welcome-back", headers=h).json()
    assert r["has_summary"] is True
    assert r["away_label"] == "2 jours"
    assert r["fermees"][0]["realized_pnl"] == 42.5
    assert "1 position fermée" in r["titre"] and "+42,50 €" in r["titre"]
    assert r["positions"][0]["pnl_delta"] == 20.0
    assert r["notifications"][0]["title"].startswith("Apple est passé")
    assert "—" not in r["titre"]
    # Montré une fois : la visite suivante ne le rejoue pas.
    assert client.get("/api/dashboard/welcome-back", headers=h).json()["has_summary"] is False


def test_encart_aujourdhui():
    uid, h = _compte()
    client.get("/api/learn/progress", headers=h)
    aujourdhui = aujourdhui_paris()
    # Une vieille série de 5 jours, mais pas venu depuis 3 jours : elle ne tient plus.
    asyncio.run(execute_write("UPDATE user_progress SET streak_days = 5, last_activity_date = ? WHERE user_id = ?",
                              ((aujourdhui - timedelta(days=3)).isoformat(), uid)))
    d = client.get("/api/learn/aujourdhui", headers=h).json()
    assert d["serie"] == 0 and len(d["semaine"]) == 7 and d["semaine"][-1]["aujourdhui"]
    assert [m["fait"] for m in d["missions"]] == [False, False, False]
    # La visite du jour relance la série ; l'analyse coche sa mission.
    _action(h, "daily_login")
    _action(h, "analysis_open")
    d = client.get("/api/learn/aujourdhui", headers=h).json()
    assert d["serie"] == 1 and d["semaine"][-1]["venu"]
    fait = {m["id"]: m["fait"] for m in d["missions"]}
    assert fait == {"daily_analysis": True, "daily_lesson": False, "daily_scan": False}
    assert next(m for m in d["missions"] if m["id"] == "daily_analysis")["lien"].startswith("/analysis?symbol=")


def test_les_journees_sont_celles_de_paris():
    from api.temps import jour_paris
    # 23 h 30 UTC en hiver, c'est déjà le lendemain à Paris (0 h 30).
    assert jour_paris("2026-03-01T23:30:00+00:00").isoformat() == "2026-03-02"
    # En été (UTC+2), 22 h 30 UTC est aussi le lendemain.
    assert jour_paris("2026-07-01T22:30:00+00:00").isoformat() == "2026-07-02"
    assert jour_paris("2026-07-01T21:30:00+00:00").isoformat() == "2026-07-01"
