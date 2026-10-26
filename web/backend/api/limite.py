"""L'adresse du visiteur, telle que la limitation de débit doit la compter.

Derrière l'hébergeur et le proxy du frontend, `request.client` est l'adresse
du proxy : avec `get_remote_address`, tous les visiteurs partageaient un seul
compteur. Dix connexions ratées par minute, d'où qu'elles viennent, fermaient
la connexion pour tout le site. Et faire confiance au premier élément de
X-Forwarded-For aurait laissé chacun choisir son adresse.

On lit donc l'élément le plus À DROITE de X-Forwarded-For : c'est celui
qu'ajoute le dernier proxy (l'hébergeur), au bout de ce que le client a pu
écrire lui-même. Sans en-tête (développement local), l'adresse de la
connexion.
"""
from starlette.requests import Request


def cle_client(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for") or ""
    morceaux = [m.strip() for m in xff.split(",") if m.strip()]
    if morceaux:
        return morceaux[-1][:64]
    return request.client.host if request.client else "inconnu"
