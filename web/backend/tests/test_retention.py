"""La mesure des retours : les gestes sont notés, les taux se calculent juste."""

import asyncio
import time
from datetime import date

from fastapi.testclient import TestClient

from main import app
from api.database import execute_query
from api.services.retention import calculer

client = TestClient(app)


def _g(uid, type_, jour, heure="10:00:00"):
    return {"user_id": uid, "type": type_, "jour": jour, "cree_le": f"{jour}T{heure}+00:00"}


def test_les_taux_et_leurs_effectifs():
    auj = date(2026, 3, 31)
    inscrits = [
        {"id": 1, "created_at": "2026-03-01T09:00:00+00:00"},   # revient à J1, J7 et J30, activé
        {"id": 2, "created_at": "2026-03-01T09:00:00+00:00"},   # ne revient pas, analyse sans position
        {"id": 3, "created_at": "2026-03-30T09:00:00+00:00"},   # trop récent pour J7 et J30
        {"id": 4, "created_at": "2026-02-01T09:00:00+00:00"},   # inscrit avant le début de la mesure
    ]
    gestes = [
        _g(1, "analyse", "2026-03-01"), _g(1, "position", "2026-03-01", "11:00:00"),
        _g(1, "visite", "2026-03-02"), _g(1, "visite", "2026-03-08"), _g(1, "lecon", "2026-03-30"),
        _g(2, "analyse", "2026-03-01"),
        _g(3, "visite", "2026-03-31"),
    ]
    r = calculer(inscrits, gestes, abonnes={1}, debut="2026-03-01T00:00:00+00:00", aujourdhui=auj)
    assert r["cohorte"] == 3
    assert r["activation"] == {"oui": 1, "total": 3, "taux": 33.3}
    assert r["j1"] == {"oui": 2, "total": 3, "taux": 66.7}       # 1 le 2 mars, 3 le 31 mars
    assert r["j7"] == {"oui": 1, "total": 2, "taux": 50.0}       # 3 pas encore éligible
    assert r["j30"]["total"] == 0                                # personne n'a 32 jours de recul
    assert r["semaines_actives"] == 1                            # la leçon du 30 mars
    assert r["notifications"] == {"oui": 1, "total": 2, "taux": 50.0}
    assert len(r["semaines"]) == 8


def test_les_gestes_sont_notes_et_lisibles_par_l_administration():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.66.{n % 250}.{(n // 250) % 250}"}
    r = client.post("/api/auth/register", headers=ip, json={
        "email": f"retour.{n}@example.com", "password": "Bonjour2026", "username": f"retour{n % 10**7}"})
    d = r.json()
    uid, h = d["user"]["id"], {"Authorization": f"Bearer {d['access_token']}"}
    for action in ("daily_login", "daily_login", "analysis_open"):
        client.post("/api/learn/progress/action", headers=h, json={"action": action})
    lignes = asyncio.run(execute_query("SELECT type FROM evenements WHERE user_id = ? ORDER BY type", (uid,)))
    # Une ligne par sorte de geste et par jour, même si le signal arrive deux fois.
    assert [l["type"] for l in lignes] == ["analyse", "inscription", "visite"]
    # La route est réservée à l'administration.
    assert client.get("/api/admin/retention", headers=h).status_code in (401, 403)


def test_l_entonnoir_par_etape_et_par_semaine():
    auj = date(2026, 3, 31)
    inscrits = [
        {"id": 1, "created_at": "2026-03-02T09:00:00+00:00", "email_verified": 1},  # tout le parcours
        {"id": 2, "created_at": "2026-03-03T09:00:00+00:00", "email_verified": 1},  # analyse, pas d'ordre
        {"id": 3, "created_at": "2026-03-04T09:00:00+00:00", "email_verified": 0},  # rien
        {"id": 4, "created_at": "2026-03-30T09:00:00+00:00", "email_verified": 1},  # trop récent pour J7
    ]
    gestes = [
        _g(1, "analyse", "2026-03-02"), _g(1, "position", "2026-03-02", "11:00:00"),
        _g(1, "visite", "2026-03-03"), _g(1, "visite", "2026-03-09"),
        _g(2, "analyse", "2026-03-03"),
        _g(4, "analyse", "2026-03-30"), _g(4, "visite", "2026-03-31"),
    ]
    r = calculer(inscrits, gestes, abonnes=set(), debut="2026-03-01T00:00:00+00:00", aujourdhui=auj)
    e = {x["cle"]: x for x in r["entonnoir"]["etapes"]}
    assert r["entonnoir"]["inscrits"] == 4
    assert (e["email"]["oui"], e["analyse"]["oui"], e["position"]["oui"]) == (3, 3, 1)
    assert (e["j1"]["oui"], e["j1"]["total"]) == (2, 4)      # 1 le 3 mars, 4 le 31 mars
    assert (e["j7"]["oui"], e["j7"]["total"]) == (1, 3)      # 4 pas encore éligible
    semaines = {s["debut"]: s["inscrits"] for s in r["entonnoir_semaines"]}
    assert semaines == {"2026-03-02": 3, "2026-03-30": 1}
