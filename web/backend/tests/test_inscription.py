"""L'inscription : les pseudos avec espaces passent, les refus sont dits en français."""

import time

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _ip():
    return {"X-Forwarded-For": f"10.77.{int(time.time() * 1000) % 250}.{int(time.time() * 997) % 250}"}


def test_pseudo_avec_espaces_accepte():
    n = int(time.time() * 1000)
    r = client.post("/api/auth/register", headers=_ip(), json={
        "email": f"  jean.{n}@example.com ", "password": "Bonjour2026", "username": f"  Jean   Dupont {n % 100000} "})
    assert r.status_code == 201, r.text
    assert r.json()["user"]["username"].lower() == f"jean dupont {n % 100000}"


def test_refus_en_francais():
    r = client.post("/api/auth/register", headers=_ip(), json={"email": "pas-une-adresse", "password": "x", "username": "Jo"})
    assert r.status_code == 422
    messages = " ".join(e["msg"] for e in r.json()["detail"])
    assert "Le pseudo doit contenir au moins 3 caractères." in messages
    assert "L'adresse e-mail n'est pas valide." in messages
    assert "Le mot de passe doit contenir au moins 6 caractères." in messages


def test_mot_de_passe_sans_chiffre_explique():
    n = int(time.time() * 1000)
    r = client.post("/api/auth/register", headers=_ip(), json={
        "email": f"sans.chiffre.{n}@example.com", "password": "motdepasse", "username": f"sanschiffre{n % 10000}"})
    assert r.status_code == 400 and "un chiffre" in r.json()["detail"]
