"""
Quel modèle Groq utiliser — et pourquoi ce n'est pas une constante.

Le nom du modèle était écrit en dur dans cinq fichiers et onze appels :

    MODEL = "llama-3.3-70b-versatile"

Groq l'a retiré des offres gratuites le 16 août 2026. Du jour au lendemain,
TOUT ce qui parle à l'IA a répondu 404 « the model does not exist or you do
not have access to it » : l'assistant d'analyse, l'intention du jour, la
préparation hebdomadaire, les outils, la fabrique de contenu. Un fournisseur
a décidé quelque chose, et cinq fonctionnalités se sont arrêtées.

Recoller un nouvel identifiant en dur à onze endroits, c'est reprogrammer la
même panne pour la prochaine fois — et il y aura une prochaine fois : Groq a
déjà retiré mixtral-8x7b, llama3-70b, gemma2-9b, deepseek-r1-distill et les
llama-3.2-preview par le même chemin.

Le modèle est donc RÉSOLU À L'EXÉCUTION, dans cet ordre :

  1. la variable d'environnement GROQ_MODEL, si elle est posée. L'exploitant
     garde le dernier mot, sans redéploiement de code ;
  2. sinon, ce que la clé peut RÉELLEMENT utiliser, demandé à Groq lui-même
     (/v1/models renvoie la liste propre à la clé, et non le catalogue de la
     documentation — qui annonçait encore le modèle retiré comme disponible
     au moment où l'API le refusait). On y prend le premier de nos préférés
     qui s'y trouve ;
  3. sinon, un défaut raisonnable, mémorisé brièvement pour réessayer vite.

Et quand un appel se prend quand même un « model_not_found », il appelle
forget_groq_model() : la résolution repart au coup suivant. La panne se
répare toute seule au lieu d'attendre un correctif.
"""

import asyncio
import os
import time

import httpx

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"

# Par ordre de préférence. Ce n'est qu'une préférence : ce que la clé a
# réellement le droit d'appeler tranche, et si aucun de ceux-ci n'y est on
# prend le premier modèle de conversation de la liste. Le premier est celui
# que Groq recommande en remplacement de llama-3.3-70b-versatile.
PREFERRED = (
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
)

DEFAULT_MODEL = "openai/gpt-oss-120b"

# Ce qui n'est pas un modèle de conversation et ne doit jamais être choisi
# par défaut, même si la liste ne contient rien de connu.
_NOT_CHAT = ("whisper", "tts", "guard", "embed", "prompt-guard", "-vision-")

_TTL_OK = 3600.0      # une résolution obtenue tient une heure
_TTL_FAIL = 60.0      # un défaut de repli est réessayé dans la minute

_state: dict = {"model": None, "at": 0.0, "ttl": _TTL_FAIL}
_lock = asyncio.Lock()


def get_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "")


async def _available_models(api_key: str) -> list[str]:
    """Ce que CETTE clé peut appeler, d'après Groq. Liste vide si on ne sait pas."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                GROQ_MODELS_URL, headers={"Authorization": f"Bearer {api_key}"}
            )
        if r.status_code != 200:
            print(f"[llm] /models a répondu {r.status_code}")
            return []
        return [m.get("id", "") for m in r.json().get("data", []) if m.get("id")]
    except Exception as exc:
        print(f"[llm] /models injoignable : {exc}")
        return []


def _pick(available: list[str]) -> str | None:
    for wanted in PREFERRED:
        if wanted in available:
            return wanted
    # Aucun préféré : le premier qui ressemble à un modèle de conversation.
    for mid in available:
        low = mid.lower()
        if not any(tag in low for tag in _NOT_CHAT):
            return mid
    return None


async def groq_model() -> str:
    """L'identifiant à envoyer à Groq maintenant."""
    override = os.getenv("GROQ_MODEL", "").strip()
    if override:
        return override

    now = time.monotonic()
    if _state["model"] and now - _state["at"] < _state["ttl"]:
        return _state["model"]

    # Un seul appel de résolution à la fois : sans ce verrou, une rafale de
    # requêtes au démarrage interrogerait /models autant de fois.
    async with _lock:
        now = time.monotonic()
        if _state["model"] and now - _state["at"] < _state["ttl"]:
            return _state["model"]

        key = get_groq_api_key()
        chosen, solid = DEFAULT_MODEL, False
        if key:
            picked = _pick(await _available_models(key))
            if picked:
                chosen, solid = picked, True

        if chosen != _state.get("model"):
            print(f"[llm] modèle Groq retenu : {chosen}" + ("" if solid else " (défaut, non confirmé)"))
        _state.update(model=chosen, at=time.monotonic(), ttl=_TTL_OK if solid else _TTL_FAIL)
        return chosen


def forget_groq_model() -> None:
    """À appeler quand Groq répond que le modèle n'existe pas : on re-résout."""
    _state.update(model=None, at=0.0, ttl=_TTL_FAIL)


def is_model_error(status_code: int, body: str) -> bool:
    """Ce 404 est-il « ce modèle n'existe plus » plutôt qu'une route inconnue ?"""
    if status_code not in (400, 404):
        return False
    low = (body or "").lower()
    return "model_not_found" in low or "does not exist" in low or "decommissioned" in low


async def groq_post(client: httpx.AsyncClient, api_key: str, payload: dict) -> httpx.Response:
    """Un appel à Groq, qui se rattrape si le modèle vient d'être retiré.

    `payload` ne porte PAS le champ "model" : c'est ici qu'il est posé, parce
    que c'est ici qu'on sait qu'il faut le re-résoudre. Sans cette seconde
    tentative, la toute première requête après un retrait échouerait quand
    même — et c'est précisément celle-là que l'utilisateur a vue échouer.
    """
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    resp = await client.post(GROQ_API_URL, headers=headers,
                             json={**payload, "model": await groq_model()})
    if is_model_error(resp.status_code, resp.text):
        print(f"[llm] modèle refusé par Groq ({resp.text[:160]}) — re-résolution et seconde tentative")
        forget_groq_model()
        resp = await client.post(GROQ_API_URL, headers=headers,
                                 json={**payload, "model": await groq_model()})
    return resp
