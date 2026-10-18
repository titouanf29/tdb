"""Le pont avec CaptenTDB Studio : fermé sans clé, refuse une mauvaise clé, ne garde que les leçons."""

import pytest
from fastapi.testclient import TestClient

from main import app

CLE = "cle-de-test-du-pont-0123456789"
ENVOI = {"videos": [
    {"id": "lecon-01", "numero": 1, "titre": "Lire un graphique", "statut": "publiee", "date": "2026-10-11T19:30"},
    {"id": "edit-03", "titre": "Un édit", "statut": "publiee"},
    {"id": "lecon-02", "numero": 2, "titre": "Quel marché", "statut": "bizarre"},
], "plan": [{"numero": 1, "titre": "Lire un graphique", "apprend": "les axes", "mots": "chart"}]}


@pytest.fixture
def client():
    return TestClient(app)


def test_ferme_sans_cle(client, monkeypatch):
    monkeypatch.delenv("PONT_TIKTOK_CLE", raising=False)
    assert client.post("/api/pont/tiktok", json=ENVOI, headers={"X-Pont-Cle": CLE}).status_code == 503


def test_mauvaise_cle(client, monkeypatch):
    monkeypatch.setenv("PONT_TIKTOK_CLE", CLE)
    assert client.post("/api/pont/tiktok", json=ENVOI, headers={"X-Pont-Cle": "x" * 30}).status_code == 401
    assert client.post("/api/pont/tiktok", json=ENVOI).status_code == 401


def test_seulement_les_lecons(client, monkeypatch):
    monkeypatch.setenv("PONT_TIKTOK_CLE", CLE)
    r = client.post("/api/pont/tiktok", json=ENVOI, headers={"X-Pont-Cle": CLE})
    assert r.status_code == 200 and r.json()["lecons"] == 2


def test_lecture_reservee_aux_admins(client):
    assert client.get("/api/pont/tiktok").status_code in (401, 403)
