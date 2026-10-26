"""Sommes-nous en production ?

La réponse ne dépendait que de la variable ENV=production. Oubliée sur
l'hébergeur, elle laissait la documentation de l'API ouverte à tous, le
cookie de session sans l'attribut Secure et la réponse sans HSTS. Railway
pose lui-même RAILWAY_ENVIRONMENT : sa présence suffit désormais.

(L'arrêt du serveur faute de secret JWT, dans secret_jwt.py, reste réservé à
ENV=production explicite : il ne doit pas faire tomber un site déjà en ligne.)
"""
import os

EN_PRODUCTION = (
    os.getenv("ENV", "development").lower() == "production"
    or bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_ENVIRONMENT_NAME"))
)
