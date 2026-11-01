"""Le rappel du soir : quels trades, quand, et une seule fois."""

import asyncio
import time
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from main import app
from api.database import execute_write
from api.services import rappel_journal as R
from api.temps import PARIS

client = TestClient(app)
NOMS = {"MC.PA": "LVMH", "GC=F": "Or"}


def test_la_fenetre_du_soir():
    soir = datetime(2026, 11, 3, 18, 45, tzinfo=PARIS)
    assert R.jour_d_envoi(soir) == "2026-11-03"
    assert R.jour_d_envoi(soir.replace(hour=18, minute=15)) is None
    assert R.jour_d_envoi(soir.replace(hour=20, minute=0)) is None
    assert R.jour_d_envoi(datetime(2026, 11, 8, 19, 0, tzinfo=PARIS)) == "2026-11-08"   # le dimanche aussi


def test_une_note_du_jour_compte_une_trace_automatique_non():
    jour = "2026-11-03"
    fermees = [{"symbol": "MC.PA", "realized_pnl": 12.0, "closed_at": "2026-11-03T14:00:00+00:00"},
               {"symbol": "GC=F", "realized_pnl": -4.0, "closed_at": "2026-11-03T15:00:00+00:00"},
               {"symbol": "AAPL", "realized_pnl": 1.0, "closed_at": "2026-11-02T15:00:00+00:00"}]
    notes = [
        # LVMH : écrite par la personne ce jour.
        {"symbol": "MC.PA", "setup": None, "created_at": "2026-11-03T14:30:00+00:00", "updated_at": "2026-11-03T14:30:00+00:00"},
        # Or : la trace automatique du stop, jamais reprise.
        {"symbol": "GC=F", "setup": "stop", "created_at": "2026-11-03T15:00:00+00:00", "updated_at": "2026-11-03T15:00:00+00:00"},
    ]
    manquantes = R.sans_note(fermees, notes, jour)
    assert [p["symbol"] for p in manquantes] == ["GC=F"]   # AAPL est d'hier, LVMH est noté
    # La trace reprise plus tard dans la journée devient une note.
    notes[1]["updated_at"] = "2026-11-03T18:00:00+00:00"
    assert R.sans_note(fermees, notes, jour) == []


def test_les_phrases():
    titre, message = R.rediger([{"symbol": "MC.PA", "realized_pnl": 12.5}], NOMS)
    assert titre == "Relisez votre trade sur LVMH" and message.startswith("Fermé aujourd'hui à +12,50 €, sans note")
    titre, message = R.rediger([{"symbol": "GC=F", "realized_pnl": -4}, {"symbol": "MC.PA", "realized_pnl": 1}], NOMS)
    assert titre == "2 trades fermés aujourd'hui, sans note" and message.startswith("Or (−4,00 €) et 1 autre.")


def test_envoye_une_seule_fois():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.55.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"soir.{n}@example.com", "password": "Bonjour2026", "username": f"soir{n % 10**7}"}).json()
    uid, h = d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}
    maintenant = datetime.now(timezone.utc)
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, status, "
        "realized_pnl, created_at, closed_at) VALUES (?, 'MC.PA', 'LONG', 100, 1, 100, 1, 'closed', -3.2, ?, ?)",
        (f"web_{uid}", maintenant.isoformat(), maintenant.isoformat())))
    soir = datetime.now(PARIS).replace(hour=19, minute=0)
    R._envoyes.clear()
    asyncio.run(R.envoyer(soir))
    R._envoyes.clear()
    asyncio.run(R.envoyer(soir))
    notes = [x for x in client.get("/api/community/notifications", headers=h).json()["notifications"]
             if x["type"] == "journal"]
    assert len(notes) == 1 and notes[0]["link"] == "/journal"
    assert notes[0]["title"] == "Relisez votre trade sur LVMH"
    # Une note écrite : plus rien à rappeler demain pour ce trade.
    client.post("/api/journal", headers=h, json={"symbol": "MC.PA", "direction": "LONG", "post_trade_notes": "Entré trop tôt."})
    R._envoyes.clear()
    asyncio.run(execute_write("DELETE FROM user_notifications WHERE user_id = ? AND type = 'journal'", (uid,)))
    asyncio.run(R.envoyer(soir))
    assert not [x for x in client.get("/api/community/notifications", headers=h).json()["notifications"] if x["type"] == "journal"]
