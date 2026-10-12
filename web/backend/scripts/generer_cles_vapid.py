"""Fabrique la paire de clés VAPID des notifications push.

    python scripts/generer_cles_vapid.py

Affiche deux lignes à copier dans les variables d'environnement du service
(Railway → Variables), jamais dans le dépôt :

    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...

La clé privée signe chaque envoi : qui la détient peut envoyer des
notifications au nom du site. La changer désabonne tous les appareils (ils
se réabonnent à la prochaine visite, avec l'accord déjà donné).
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


if __name__ == "__main__":
    k = ec.generate_private_key(ec.SECP256R1())
    pub = k.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    print(f"VAPID_PUBLIC_KEY={b64u(pub)}")
    print(f"VAPID_PRIVATE_KEY={b64u(k.private_numbers().private_value.to_bytes(32, 'big'))}")
