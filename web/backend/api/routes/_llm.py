"""
Parler à une IA sans dépendre d'un fournisseur, ni d'un nom de modèle.

CE QUI S'EST PASSÉ. Le nom du modèle était écrit en dur dans cinq fichiers
et onze appels :

    MODEL = "llama-3.3-70b-versatile"

Groq l'a retiré de son offre gratuite le 16 août 2026. Du jour au lendemain,
tout ce qui parle à l'IA a répondu 404 « the model does not exist or you do
not have access to it » : l'assistant, l'intention du jour, la préparation
hebdomadaire, les outils, la fabrique de contenu. Un fournisseur a décidé
quelque chose, et cinq fonctionnalités se sont arrêtées.

Le repli censé absorber ça — Mistral — ne servait à rien pour deux raisons :
il n'était déclenché que par un dépassement de débit, jamais par un modèle
disparu ; et son propre modèle, « mistral-small-latest », n'est lui non plus
plus un identifiant valide. Un filet de sécurité qu'on ne teste jamais n'est
pas un filet de sécurité.

CE QUE FAIT CE MODULE. Une seule fonction publique, llm_chat(), qui rend du
texte. Elle essaie les fournisseurs dans l'ordre et ne rend la main que
lorsqu'aucun ne répond. Pour chacun :

  1. le modèle vient de GROQ_MODEL / MISTRAL_MODEL si l'exploitant en a posé
     un — il tranche sans redéploiement ;
  2. sinon de ce que LA CLÉ peut réellement appeler, demandé au fournisseur
     lui-même (/v1/models). C'est la seule source qui ne mente pas : la
     documentation de Groq annonçait encore le modèle retiré comme
     disponible au moment où son API le refusait ;
  3. sinon d'un défaut, mémorisé une minute seulement pour réessayer vite.

Et un « model_not_found » en cours de route efface la résolution, puis
l'appel est refait. La panne se répare d'elle-même au lieu d'attendre un
correctif — sans cette seconde tentative, la première requête après un
retrait échouerait quand même, et c'est exactement celle-là que
l'utilisateur a vue échouer.
"""

import asyncio
import os
import time

import httpx


class LLMUnavailable(Exception):
    """Aucun fournisseur n'a pu répondre. Porte une phrase affichable."""

    def __init__(self, message: str = "L'assistant est momentanément indisponible. Réessayez dans un instant."):
        super().__init__(message)
        self.message = message


# ── Les fournisseurs ─────────────────────────────────────────────────────────
#
# L'ordre compte : Groq d'abord parce qu'il est nettement plus rapide, Mistral
# ensuite. Les listes de modèles ne sont que des PRÉFÉRENCES — ce que la clé a
# le droit d'appeler tranche toujours.

PROVIDERS = {
    "groq": {
        "env_key": "GROQ_API_KEY",
        "env_model": "GROQ_MODEL",
        "chat_url": "https://api.groq.com/openai/v1/chat/completions",
        "models_url": "https://api.groq.com/openai/v1/models",
        # openai/gpt-oss-120b est le remplaçant recommandé par Groq, et il est
        # sur le palier gratuit (30 req/min, 8 000 jetons/min, 1 000 req/jour).
        "preferred": ("openai/gpt-oss-120b", "openai/gpt-oss-20b",
                      "qwen/qwen3.8-27b", "llama-3.3-70b-versatile",
                      "llama-3.1-8b-instant"),
        "default": "openai/gpt-oss-120b",
    },
    "mistral": {
        "env_key": "MISTRAL_API_KEY",
        "env_model": "MISTRAL_MODEL",
        "chat_url": "https://api.mistral.ai/v1/chat/completions",
        "models_url": "https://api.mistral.ai/v1/models",
        "preferred": ("mistral-small-4", "ministral-3-8b", "mistral-medium-3-5",
                      "mistral-small-latest"),
        "default": "mistral-small-4",
    },
}

# Compatibilité : quelques modules importent encore ces noms.
GROQ_API_URL = PROVIDERS["groq"]["chat_url"]
MISTRAL_API_URL = PROVIDERS["mistral"]["chat_url"]

# Ce qui n'est pas un modèle de conversation et ne doit jamais être choisi par
# défaut, même quand la liste ne contient rien de connu.
_NOT_CHAT = ("whisper", "tts", "guard", "embed", "ocr", "moderation",
             "-vision-", "orpheus", "voxtral", "codestral")

_TTL_OK = 3600.0      # une résolution obtenue auprès du fournisseur tient une heure
_TTL_FAIL = 60.0      # un défaut de repli est réessayé dans la minute

_state: dict = {name: {"model": None, "at": 0.0, "ttl": _TTL_FAIL} for name in PROVIDERS}
_locks: dict = {name: asyncio.Lock() for name in PROVIDERS}


def api_key(provider: str) -> str:
    return os.getenv(PROVIDERS[provider]["env_key"], "").strip()


def configured_providers() -> list[str]:
    """Ceux dont la clé est posée, dans l'ordre d'essai."""
    return [p for p in PROVIDERS if api_key(p)]


async def _available_models(provider: str, key: str) -> list[str]:
    """Ce que CETTE clé peut appeler. Liste vide si on ne sait pas."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(PROVIDERS[provider]["models_url"],
                                 headers={"Authorization": f"Bearer {key}"})
        if r.status_code != 200:
            print(f"[llm] {provider}/models a répondu {r.status_code}")
            return []
        return [m.get("id", "") for m in r.json().get("data", []) if m.get("id")]
    except Exception as exc:
        print(f"[llm] {provider}/models injoignable : {exc}")
        return []


def _pick(provider: str, available: list[str]) -> str | None:
    for wanted in PROVIDERS[provider]["preferred"]:
        if wanted in available:
            return wanted
    # Aucun préféré : le premier qui ressemble à un modèle de conversation.
    for mid in available:
        if not any(tag in mid.lower() for tag in _NOT_CHAT):
            return mid
    return None


async def resolve_model(provider: str) -> str:
    """L'identifiant à envoyer à ce fournisseur maintenant."""
    override = os.getenv(PROVIDERS[provider]["env_model"], "").strip()
    if override:
        return override

    st = _state[provider]
    if st["model"] and time.monotonic() - st["at"] < st["ttl"]:
        return st["model"]

    # Un seul appel de résolution à la fois : sans ce verrou, une rafale de
    # requêtes au démarrage interrogerait /models autant de fois.
    async with _locks[provider]:
        if st["model"] and time.monotonic() - st["at"] < st["ttl"]:
            return st["model"]

        chosen, solid = PROVIDERS[provider]["default"], False
        key = api_key(provider)
        if key:
            picked = _pick(provider, await _available_models(provider, key))
            if picked:
                chosen, solid = picked, True

        if chosen != st["model"]:
            print(f"[llm] modèle {provider} retenu : {chosen}"
                  + ("" if solid else " (défaut, non confirmé)"))
        st.update(model=chosen, at=time.monotonic(), ttl=_TTL_OK if solid else _TTL_FAIL)
        return chosen


def forget_model(provider: str) -> None:
    """Le fournisseur refuse ce modèle : on re-résout au coup suivant."""
    _state[provider].update(model=None, at=0.0, ttl=_TTL_FAIL)


def is_model_error(status_code: int, body: str) -> bool:
    """Ce 404 est-il « ce modèle n'existe plus » plutôt qu'une route inconnue ?"""
    if status_code not in (400, 404, 422):
        return False
    low = (body or "").lower()
    return any(t in low for t in
               ("model_not_found", "does not exist", "decommissioned",
                "invalid model", "unknown model", "model not found"))


# ── L'appel ──────────────────────────────────────────────────────────────────

async def _call(provider: str, messages: list, temperature: float, max_tokens: int,
                response_format: dict | None, timeout: float) -> str:
    """Un fournisseur, avec une seconde tentative si le modèle vient d'être retiré."""
    key = api_key(provider)
    if not key:
        raise LLMUnavailable(f"{provider} non configuré")

    url = PROVIDERS[provider]["chat_url"]
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    base = {"messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    if response_format:
        base["response_format"] = response_format

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers,
                                 json={**base, "model": await resolve_model(provider)})
        if is_model_error(resp.status_code, resp.text):
            print(f"[llm] {provider} refuse le modèle ({resp.text[:160]}) — re-résolution")
            forget_model(provider)
            resp = await client.post(url, headers=headers,
                                     json={**base, "model": await resolve_model(provider)})

    if resp.status_code != 200:
        raise LLMUnavailable(f"{provider} a répondu {resp.status_code}: {resp.text[:200]}")

    try:
        return resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as exc:
        raise LLMUnavailable(f"{provider} a rendu une réponse illisible : {exc}") from exc


async def llm_one(
    provider: str,
    messages: list,
    *,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    response_format: dict | None = None,
    timeout: float = 60.0,
) -> str:
    """Un fournisseur nommé, quand l'appelant a besoin de savoir lequel a
    répondu — la fabrique de contenu affiche la source de chaque texte."""
    return await _call(provider, messages, temperature, max_tokens,
                       response_format, timeout)


async def llm_chat(
    messages: list,
    *,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    response_format: dict | None = None,
    timeout: float = 60.0,
) -> str:
    """Du texte, depuis le premier fournisseur qui répond.

    Lève LLMUnavailable quand aucun n'a répondu — avec une phrase affichable,
    sans jamais recopier le corps de la réponse d'un fournisseur : une erreur
    de fournisseur n'est pas une information pour l'utilisateur, et l'exposer
    telle quelle a déjà mis un 404 en JSON brut dans la bulle de l'assistant.
    """
    providers = configured_providers()
    if not providers:
        raise LLMUnavailable("L'assistant n'est pas configuré sur ce site.")

    causes = []
    for provider in providers:
        try:
            return await _call(provider, messages, temperature, max_tokens,
                               response_format, timeout)
        except LLMUnavailable as exc:
            causes.append(str(exc))
            print(f"[llm] {provider} indisponible : {exc}")
        except Exception as exc:  # réseau, délai dépassé, JSON illisible
            causes.append(f"{provider}: {exc}")
            print(f"[llm] {provider} a échoué : {exc}")

    print(f"[llm] aucun fournisseur n'a répondu — {' | '.join(causes)}")
    raise LLMUnavailable()


async def probe(provider: str) -> dict:
    """L'état réel de ce fournisseur, pour le diagnostic d'administration.

    On ne devine pas : on lui demande son modèle et on lui fait dire un mot.
    """
    out: dict = {"provider": provider, "key": bool(api_key(provider)),
                 "model": None, "ok": False, "detail": ""}
    if not out["key"]:
        out["detail"] = f"{PROVIDERS[provider]['env_key']} absente"
        return out
    try:
        out["model"] = await resolve_model(provider)
        t0 = time.monotonic()
        await _call(provider, [{"role": "user", "content": "Réponds uniquement : ok"}],
                    0.0, 5, None, 15.0)
        out["ok"] = True
        out["detail"] = f"{round((time.monotonic() - t0) * 1000)} ms"
    except Exception as exc:
        out["detail"] = str(exc)[:200]
    return out
