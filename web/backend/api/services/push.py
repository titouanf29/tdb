"""Les notifications push du navigateur et de l'application installée.

Écrit à la main plutôt qu'avec pywebpush : sa dépendance http-ece se compile
à l'installation et échoue sur une image Python allégée. Le protocole tient
en deux pièces, toutes deux normalisées et faites avec `cryptography`, déjà
présente :

  · le CHIFFREMENT du message (RFC 8291, « aes128gcm ») : seul le navigateur
    abonné peut le lire — le service de push de Google ou de Mozilla le
    transporte sans le voir ;
  · la SIGNATURE du serveur (VAPID, RFC 8292) : un jeton ES256 qui prouve au
    service de push que c'est bien CaptenTDB qui envoie.

Les clés VAPID se posent dans l'environnement (VAPID_PUBLIC_KEY,
VAPID_PRIVATE_KEY, en base64url) ; scripts/generer_cles_vapid.py les
fabrique. Sans elles, rien n'est envoyé et rien ne casse : les
notifications restent dans le site.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import struct
import time
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ..database import USE_POSTGRES, execute_query, execute_write

logger = logging.getLogger(__name__)
_pret = False


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def b64u_dec(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def cle_publique() -> str | None:
    return os.getenv("VAPID_PUBLIC_KEY") or None


def actif() -> bool:
    return bool(os.getenv("VAPID_PUBLIC_KEY") and os.getenv("VAPID_PRIVATE_KEY"))


# ── Chiffrement (RFC 8291) ───────────────────────────────────────────────────
def _hkdf(sel: bytes, ikm: bytes, info: bytes, n: int) -> bytes:
    prk = hmac.new(sel, ikm, hashlib.sha256).digest()
    return hmac.new(prk, info + b"\x01", hashlib.sha256).digest()[:n]


def chiffrer(message: bytes, p256dh: str, auth: str) -> bytes:
    """Le corps aes128gcm d'un message push, pour un abonnement donné."""
    ua_pub = b64u_dec(p256dh)
    secret = b64u_dec(auth)
    eph = ec.generate_private_key(ec.SECP256R1())
    as_pub = eph.public_key().public_bytes(serialization.Encoding.X962,
                                           serialization.PublicFormat.UncompressedPoint)
    partage = eph.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_pub))
    ikm = _hkdf(secret, partage, b"WebPush: info\x00" + ua_pub + as_pub, 32)
    sel = os.urandom(16)
    cek = _hkdf(sel, ikm, b"Content-Encoding: aes128gcm\x00", 16)
    nonce = _hkdf(sel, ikm, b"Content-Encoding: nonce\x00", 12)
    chiffre = AESGCM(cek).encrypt(nonce, message + b"\x02", None)
    return sel + struct.pack("!IB", 4096, len(as_pub)) + as_pub + chiffre


# ── Signature VAPID (RFC 8292) ───────────────────────────────────────────────
def _cle_privee() -> ec.EllipticCurvePrivateKey:
    d = int.from_bytes(b64u_dec(os.environ["VAPID_PRIVATE_KEY"]), "big")
    return ec.derive_private_key(d, ec.SECP256R1())


def jeton_vapid(endpoint: str) -> str:
    u = urlparse(endpoint)
    entete = b64u(json.dumps({"typ": "JWT", "alg": "ES256"}).encode())
    corps = b64u(json.dumps({
        "aud": f"{u.scheme}://{u.netloc}",
        "exp": int(time.time()) + 12 * 3600,
        "sub": os.getenv("VAPID_SUJET", "mailto:contact@captentdb.fr"),
    }).encode())
    signe = f"{entete}.{corps}".encode()
    r, s = decode_dss_signature(_cle_privee().sign(signe, ec.ECDSA(hashes.SHA256())))
    return f"{entete}.{corps}.{b64u(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))}"


# ── Abonnements ──────────────────────────────────────────────────────────────
async def init() -> None:
    global _pret
    if _pret:
        return
    cle = "SERIAL PRIMARY KEY" if USE_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    await execute_write(f"""
        CREATE TABLE IF NOT EXISTS push_abonnements (
            id {cle},
            user_id INTEGER NOT NULL,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            cree_le TEXT NOT NULL
        )
    """)
    _pret = True


async def envoyer(user_id: int, titre: str, message: str, lien: str | None = None) -> int:
    """Envoie à tous les appareils abonnés de cette personne ; rend le nombre d'envois réussis."""
    if not actif():
        return 0
    await init()
    abos = await execute_query("SELECT * FROM push_abonnements WHERE user_id = ?", (user_id,)) or []
    if not abos:
        return 0
    corps = json.dumps({"titre": titre, "message": message, "lien": lien or "/dashboard"},
                       ensure_ascii=False).encode()
    ok = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        for a in abos:
            try:
                r = await client.post(a["endpoint"], content=chiffrer(corps, a["p256dh"], a["auth"]), headers={
                    "Content-Encoding": "aes128gcm",
                    "Content-Type": "application/octet-stream",
                    "TTL": "86400",
                    "Urgency": "normal",
                    "Authorization": f"vapid t={jeton_vapid(a['endpoint'])}, k={cle_publique()}",
                })
                if r.status_code in (404, 410):
                    # L'abonnement n'existe plus (application désinstallée,
                    # autorisation retirée) : on l'oublie.
                    await execute_write("DELETE FROM push_abonnements WHERE id = ?", (a["id"],))
                elif r.status_code < 300:
                    ok += 1
                else:
                    logger.info("push refusé (%s) : %s", r.status_code, r.text[:200])
            except Exception as e:
                logger.info("push impossible : %s", e)
    return ok


def envoyer_plus_tard(user_id: int, titre: str, message: str, lien: str | None = None) -> None:
    """Sans attendre : une notification ne doit jamais ralentir la requête qui la déclenche."""
    if not actif():
        return
    try:
        asyncio.get_running_loop().create_task(envoyer(user_id, titre, message, lien))
    except RuntimeError:
        pass
