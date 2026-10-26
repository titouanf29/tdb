"""Le bilan de la semaine : ce qu'il dit, quand il part, et une seule fois."""

import asyncio
import time
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from main import app
from api.database import execute_write
from api.services import bilan as B
from api.temps import PARIS, aujourdhui_paris

client = TestClient(app)


def _semaine(**k):
    s = {"trades": 3, "resultat": 42.1, "gagnants": 2, "perdants": 1, "taux_reussite": 67, "sans_stop": 0,
         "fermetures_forcees": 0, "frais": 1.2, "meilleur": {"nom": "LVMH", "resultat": 30.0}, "pire": None,
         "journal": 3, "solde": 10042.1}
    s.update(k)
    return s


ACTIF = {"jours": 4, "analyses": 3, "lecons": 2, "serie": 4}


def test_une_bonne_semaine():
    l = B.lire(_semaine(), ACTIF)
    assert l["titre"] == "3 trades fermés, +42,10 €, et un stop posé à chacun."
    assert "Belle semaine" in l["conseil"]
    assert all(c["ton"] in ("bon", "neutre") for c in l["constats"])


def test_le_conseil_le_plus_utile_d_abord():
    assert "stop à chaque position" in B.lire(_semaine(sans_stop=1), ACTIF)["conseil"]
    assert "journal" in B.lire(_semaine(journal=1), ACTIF)["conseil"]
    sans_trade = B.lire(_semaine(trades=0, resultat=0, gagnants=0, journal=0, meilleur=None), ACTIF)
    assert sans_trade["titre"].startswith("Pas de trade fermé cette semaine : 4 jours sur le site")
    assert "petite position" in sans_trade["conseil"]
    calme = B.lire(_semaine(trades=0, resultat=0, gagnants=0, journal=0, meilleur=None),
                   {"jours": 0, "analyses": 0, "lecons": 0, "serie": 0})
    assert "pas passé" in calme["titre"]


def test_la_fenetre_d_envoi():
    vendredi = datetime(2026, 10, 30, 23, 0, tzinfo=PARIS)
    assert B.lundi_de_la_semaine(vendredi).isoformat() == "2026-10-26"
    assert B.lundi_de_la_semaine(vendredi.replace(hour=21)) is None
    assert B.lundi_de_la_semaine(datetime(2026, 10, 31, 11, 0, tzinfo=PARIS)).isoformat() == "2026-10-26"
    assert B.lundi_de_la_semaine(datetime(2026, 10, 29, 23, 0, tzinfo=PARIS)) is None


def test_envoye_une_seule_fois_aux_actifs():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.33.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"bilan.{n}@example.com", "password": "Bonjour2026", "username": f"bilan{n % 10**7}"}).json()
    uid, h = d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}
    client.post("/api/learn/progress/action", headers=h, json={"action": "daily_login"})
    maintenant = datetime.now(timezone.utc).isoformat()
    asyncio.run(execute_write(
        "INSERT INTO positions (user_id, symbol, direction, entry_price, quantity, amount, leverage, stop_loss, status, "
        "realized_pnl, created_at, closed_at) VALUES (?, 'AAPL', 'LONG', 100, 1, 100, 1, 95, 'closed', 12.5, ?, ?)",
        (f"web_{uid}", maintenant, maintenant)))

    # Le vendredi soir de la semaine en cours.
    aujourdhui = aujourdhui_paris()
    vendredi = aujourdhui - timedelta(days=aujourdhui.weekday()) + timedelta(days=4)
    soir = datetime(vendredi.year, vendredi.month, vendredi.day, 23, 0, tzinfo=PARIS)
    B._envoyes.clear()
    asyncio.run(B.envoyer(soir))
    B._envoyes.clear()
    asyncio.run(B.envoyer(soir))   # même semaine : la clé empêche le doublon
    notes = [x for x in client.get("/api/community/notifications", headers=h).json()["notifications"]
             if x["type"] == "bilan"]
    assert len(notes) == 1 and notes[0]["link"] == "/semaine"
    assert "1 trade fermé, +12,50 €, et un stop posé à chacun." in notes[0]["message"]
