"""Le point du matin : ce qu'il dit, quand il part, et une seule fois."""

import asyncio
import time
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from main import app
from api.database import execute_write
from api.services import point_du_matin as M
from api.temps import PARIS

client = TestClient(app)

MARCHES = [("le CAC 40", 0.34), ("le S&P 500", -0.21), ("le bitcoin", 1.8)]
AGENDA = [{"nom": "Décision de la Fed", "heure": "20 h"}]


def test_avec_des_favoris_et_une_position():
    titre, message = M.rediger(
        [{"symbol": "MC.PA", "nom": "LVMH", "pct": 2.4}, {"symbol": "GC=F", "nom": "Or", "pct": -0.8}],
        {"n": 2, "pnl": 34.1}, ["LVMH"], AGENDA, MARCHES, 4)
    assert titre == "LVMH +2,4 % depuis hier"
    assert message == ("Vos actifs depuis hier : LVMH +2,4 % et Or −0,8 %. Vos 2 positions ouvertes sont à +34,10 €. "
                       "Nimbo propose un plan sur LVMH : à vous de juger. "
                       "À 20 h, décision de la Fed : les cours peuvent bouger vite autour. "
                       "Série en cours : 4 jours. Une analyse aujourd'hui la prolonge.")


def test_sans_rien_de_suivi_les_grands_marches():
    titre, message = M.rediger([], {"n": 0, "pnl": 0}, [], [], MARCHES, 0)
    assert titre == "Votre point du matin"
    assert message.startswith("Hier, le CAC 40 a fini à +0,3 %, le S&P 500 à −0,2 % et le bitcoin à +1,8 %.")
    assert "Séance calme" not in message  # il y a déjà quelque chose à lire


def test_le_titre_suit_la_proposition_quand_rien_ne_bouge_fort():
    titre, _ = M.rediger([{"symbol": "AAPL", "nom": "Apple", "pct": 0.4}], {"n": 0}, ["Apple"], [], MARCHES, 1)
    assert titre == "Nimbo propose un plan sur Apple"


def test_une_seule_position_au_singulier():
    _, message = M.rediger([], {"n": 1, "pnl": -5}, [], [], [], 0)
    assert message.startswith("Votre position ouverte est à −5,00 €.")
    assert "Séance calme" not in message


def test_la_fenetre_d_envoi():
    mardi = datetime(2026, 11, 3, 9, 0, tzinfo=PARIS)
    assert M.jour_d_envoi(mardi) == "2026-11-03"
    assert M.jour_d_envoi(mardi.replace(hour=8, minute=30)) is None
    assert M.jour_d_envoi(mardi.replace(hour=10, minute=5)) is None
    assert M.jour_d_envoi(datetime(2026, 11, 7, 9, 0, tzinfo=PARIS)) is None   # samedi


def test_envoye_une_seule_fois_a_ceux_qui_suivent_quelque_chose(monkeypatch):
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.44.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"matin.{n}@example.com", "password": "Bonjour2026", "username": f"matin{n % 10**7}"}).json()
    uid, h = d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}
    client.post("/api/favorites", headers=h, json={"symbol": "MC.PA"})

    async def faux_cours(symboles):
        return {s: {"price": 100.0, "change": 1.6 if s == "MC.PA" else 0.2, "volume": 0} for s in symboles}
    monkeypatch.setattr(M, "_cours", faux_cours)

    # Un mardi matin, dans la fenêtre.
    matin = datetime(2026, 11, 3, 8, 50, tzinfo=PARIS).astimezone(timezone.utc)
    M._envoyes.clear()
    asyncio.run(M.envoyer(matin))
    M._envoyes.clear()
    asyncio.run(M.envoyer(matin))   # même jour : la clé empêche le doublon
    notes = [x for x in client.get("/api/community/notifications", headers=h).json()["notifications"]
             if x["type"] == "matin"]
    assert len(notes) == 1 and notes[0]["link"] == "/dashboard"
    assert "LVMH +1,6 %" in notes[0]["message"]
