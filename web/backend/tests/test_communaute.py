"""La Communauté : un fil jamais vide, des réponses qui préviennent, de quoi le garder sain."""

import asyncio
import time
from datetime import datetime

from fastapi.testclient import TestClient

from main import app
from api.database import execute_query, execute_write
from api.routes import _prices
from api.services import defi, note_du_jour
from api.temps import PARIS

client = TestClient(app)
_n = [0]


def _compte(prefixe="membre"):
    _n[0] += 1
    n = int(time.time() * 1000) + _n[0]
    ip = {"X-Forwarded-For": f"10.22.{n % 250}.{(n // 250) % 250}"}
    r = client.post("/api/auth/register", headers=ip, json={
        "email": f"{prefixe}.{n}@example.com", "password": "Bonjour2026", "username": f"{prefixe}{n % 10**7}"})
    assert r.status_code == 201, r.text
    d = r.json()
    return d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}


def _ecrire(h, texte, reply_to=None):
    return client.post("/api/community/messages", headers=h, json={"content": texte, "reply_to": reply_to})


def _notifs(h, type_="communaute"):
    return [n for n in client.get("/api/community/notifications", headers=h).json()["notifications"] if n["type"] == type_]


def test_repondre_et_aimer_previennent_l_auteur():
    a, ha = _compte()
    b, hb = _compte()
    m = _ecrire(ha, "Quelqu'un suit LVMH cette semaine ?").json()["message"]
    assert m["genre"] == "message"
    assert _ecrire(hb, "Oui, j'attends la cassure.", reply_to=m["id"]).status_code == 200
    client.post(f"/api/community/messages/{m['id']}/like", headers=hb)
    client.post(f"/api/community/messages/{m['id']}/like", headers=hb)   # retiré
    client.post(f"/api/community/messages/{m['id']}/like", headers=hb)   # remis : pas de 2e notification le même jour
    titres = [n["title"] for n in _notifs(ha)]
    assert any("vous a répondu" in t for t in titres)
    assert titres.count("Votre message a été aimé") == 1


def test_trois_signalements_masquent_et_l_equipe_tranche():
    auteur, ha = _compte()
    m = _ecrire(ha, "Message à signaler pour le test").json()["message"]
    assert client.post(f"/api/community/messages/{m['id']}/signaler", headers=ha, json={}).status_code == 400
    for _ in range(3):
        _, h = _compte()
        r = client.post(f"/api/community/messages/{m['id']}/signaler", headers=h, json={"motif": "hors sujet"})
    assert r.json()["masque"] is True
    fil = client.get("/api/community/messages", headers=ha).json()["messages"]
    assert all(x["id"] != m["id"] for x in fil)

    admin, hadm = _compte("chef")
    asyncio.run(execute_write("UPDATE web_users SET is_admin = 1 WHERE id = ?", (admin,)))
    liste = client.get("/api/community/admin/signalements", headers=hadm).json()["signalements"]
    s = next(x for x in liste if x["message_id"] == m["id"])
    assert s["nb"] == 3 and s["masque"] and "hors sujet" in s["motifs"]
    client.post(f"/api/community/admin/signalements/{m['id']}", headers=hadm, json={"action": "garder"})
    fil = client.get("/api/community/messages", headers=ha).json()["messages"]
    assert any(x["id"] == m["id"] for x in fil)


def test_partager_une_analyse_et_garde_fous():
    _, h = _compte()
    r = client.post("/api/community/partages", headers=h, json={
        "symbol": "mc.pa", "nom": "LVMH", "verdict": "Plutôt haussier", "score": 140, "commentaire": "Je surveille."})
    p = r.json()["message"]
    assert p["genre"] == "partage" and p["donnees"]["symbol"] == "MC.PA" and p["donnees"]["score"] == 100
    assert client.post("/api/community/partages", headers=h, json={"symbol": "pas un symbole !"}).status_code == 400
    assert _ecrire(h, "http://a.fr http://b.fr http://c.fr").status_code == 400


def test_le_defi_et_son_classement():
    uid, h = _compte()
    client.post("/api/learn/progress/action", headers=h, json={"action": "daily_login"})
    e = client.get("/api/community/defi", headers=h).json()
    assert e["defi"]["id"] in {"stops", "journal", "lecons", "regularite"} and e["participe"] is False
    e = client.post("/api/community/defi/participer", headers=h).json()
    assert e["participe"] is True and any(c["moi"] for c in e["classement"])
    regularite = next(d for d in defi.DEFIS if d["id"] == "regularite")
    assert asyncio.run(defi.progression(uid, regularite, defi.lundi_de())) == 1
    assert client.post("/api/community/defi/participer", headers=h).json()["participe"] is False


def test_la_note_du_jour_une_fois_les_matins_de_semaine(monkeypatch):
    _, h = _compte()

    async def faux(symboles):
        return {s: {"price": 100, "change": 0.8} for s in symboles}
    monkeypatch.setattr(_prices, "fetch_prices", faux)
    asyncio.run(execute_write("DELETE FROM community_messages WHERE genre = 'note'"))
    mardi = datetime(2026, 10, 27, 9, 0, tzinfo=PARIS)
    assert asyncio.run(note_du_jour.publier_si_besoin(mardi)) is True
    assert asyncio.run(note_du_jour.publier_si_besoin(mardi)) is False
    assert asyncio.run(note_du_jour.publier_si_besoin(datetime(2026, 10, 31, 9, 0, tzinfo=PARIS))) is False
    note = next(x for x in client.get("/api/community/messages", headers=h).json()["messages"] if x["genre"] == "note")
    assert note["username"] == "Nimbo" and note["content"].startswith("Bonjour. Hier, le CAC 40 a terminé à +0,8 %")


def test_les_mots_de_l_equipe_vont_dans_le_fil():
    admin, hadm = _compte("chef")
    asyncio.run(execute_write("UPDATE web_users SET is_admin = 1 WHERE id = ?", (admin,)))
    client.post("/api/admin/broadcast", headers=hadm, json={"title": "Nouvelle leçon", "message": "Le RSI expliqué.", "type": "info"})
    fil = client.get("/api/community/messages", headers=hadm).json()["messages"]
    eq = [x for x in fil if x["genre"] == "equipe"]
    assert eq and eq[-1]["donnees"]["titre"] == "Nouvelle leçon"
