"""Le secret qui signe les jetons de connexion, défini une seule fois.

Il était recopié dans trois fichiers, avec la même valeur de repli connue de
tous (« dev-only-insecure-secret… ») dès que JWT_SECRET manquait et que ENV
n'était pas « production ». Une variable ENV oubliée sur l'hébergeur suffisait
donc à rendre les jetons forgeables : n'importe qui signait {"sub": "1"} et
entrait comme administrateur.

Désormais :
  · en production, un secret absent, trop court (< 32 caractères) ou laissé à
    la valeur d'exemple arrête le serveur ;
  · ailleurs, faute de secret, un secret ALÉATOIRE est tiré au démarrage : les
    sessions ne survivent pas à un redémarrage, mais personne ne peut forger
    de jeton.
"""
import os
import secrets
import sys

_EXEMPLES = {
    "dev-only-insecure-secret-do-not-use-in-prod",
    "your-secret-key-min-32-chars-change-this",
    "change-me", "changeme", "secret",
}

_brut = (os.getenv("JWT_SECRET") or "").strip()
_prod = os.getenv("ENV", "development").lower() == "production"

if _prod and (not _brut or len(_brut) < 32 or _brut in _EXEMPLES):
    print("[FATAL] JWT_SECRET absent, trop court (32 caractères minimum) ou laissé à une valeur "
          "d'exemple. Arrêt en production.", flush=True)
    sys.exit(1)

if not _brut or _brut in _EXEMPLES:
    print("⚠️ JWT_SECRET non défini : secret aléatoire pour cette exécution "
          "(les sessions ne survivront pas au redémarrage).", flush=True)
    _brut = secrets.token_urlsafe(48)

SECRET = _brut
