"""Nimbo et les questions sur le site : l'IA est cadrée, et la page a un repli."""

import json
import time

from fastapi.testclient import TestClient

from main import app
from api.routes import aide
from api.routes._llm import LLMUnavailable

client = TestClient(app)


def _compte():
    n = int(time.time() * 1000)
    ip = {"X-Forwarded-For": f"10.11.{n % 250}.{(n // 250) % 250}"}
    d = client.post("/api/auth/register", headers=ip, json={
        "email": f"aide.{n}@example.com", "password": "Bonjour2026", "username": f"aide{n % 10**7}"}).json()
    return {"Authorization": f"Bearer {d['access_token']}"}


def test_reponse_cadree(monkeypatch):
    vu = {}

    async def fausse_ia(messages, **k):
        vu["messages"] = messages
        return json.dumps({"reponse": "Allez dans **Mon espace** — puis Wallet : « Recommencer ».",
                           "destinations": ["wallet", "inventee", "wallet", "contacter", "analyse"]})
    monkeypatch.setattr(aide, "llm_chat", fausse_ia)
    h = _compte()
    r = client.post("/api/aide/question", headers=h, json={
        "question": "Je veux repartir de zéro", "page": "/wallet",
        "historique": [{"role": "moi", "texte": "Bonjour"}, {"role": "nimbo", "texte": "Bonjour."}]}).json()
    assert r["source"] == "ia"
    assert r["reponse"] == "Allez dans Mon espace, puis Wallet : « Recommencer »."
    assert [d["libelle"] for d in r["destinations"]] == ["Mon wallet", "Écrire à l'équipe", "Ouvrir l'analyse"]
    systeme = vu["messages"][0]["content"]
    assert "Guide du site" in systeme and "le wallet de simulation" in systeme
    assert [m["role"] for m in vu["messages"]] == ["system", "user", "assistant", "user"]


def test_repli_quand_l_ia_ne_repond_pas(monkeypatch):
    async def panne(messages, **k):
        raise LLMUnavailable()
    monkeypatch.setattr(aide, "llm_chat", panne)
    r = client.post("/api/aide/question", headers=_compte(), json={"question": "Comment contacter l'équipe ?"}).json()
    assert r["source"] == "indisponible" and r["reponse"] is None


def test_reponse_illisible(monkeypatch):
    async def bavarde(messages, **k):
        return "Voici ma réponse sans JSON"
    monkeypatch.setattr(aide, "llm_chat", bavarde)
    r = client.post("/api/aide/question", headers=_compte(), json={"question": "Où est le journal ?"}).json()
    assert r["source"] == "indisponible"


def test_question_trop_longue_refusee():
    r = client.post("/api/aide/question", headers=_compte(), json={"question": "x" * 400})
    assert r.status_code == 422
