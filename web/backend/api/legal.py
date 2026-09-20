"""
Le statut de l'éditeur, côté serveur — et le refus d'encaisser sans lui.

Le pendant de `web/frontend/src/lib/legal.ts`, avec une différence qui est
tout l'intérêt de ce fichier : LE FRONT DÉCIDE DE CE QUI S'AFFICHE, CELUI-CI
DÉCIDE DE CE QUI SE PASSE. Masquer un bouton n'empêche personne d'appeler
`POST /api/premium/checkout` directement ; c'est ici que la vente est fermée,
et c'est ici que ça compte.

Proposer un abonnement de façon habituelle sans activité déclarée est du
travail dissimulé (article L.8221-3 du code du travail). Le garde-fou ne vaut
donc pas « fonctionnalité désactivée en attendant » : il ferme une porte qui
n'aurait pas dû être ouverte.

Le défaut est le plus restrictif. Une variable d'environnement oubliée, mal
orthographiée ou perdue dans une migration doit fermer la vente, jamais
l'ouvrir.
"""

import os

STATUTS = ("non_immatricule", "micro_entreprise", "societe")


def statut_editeur() -> str:
    """Le statut déclaré. Toute valeur inconnue retombe sur le plus restrictif."""
    v = (os.getenv("EDITEUR_STATUT", "") or "").strip().lower()
    return v if v in STATUTS else "non_immatricule"


def offre_payante_ouverte() -> bool:
    """Peut-on encaisser ? Non tant que rien n'est immatriculé."""
    return statut_editeur() != "non_immatricule"


# Le message rendu à l'appelant. Il dit la raison, parce qu'un 503 muet se lit
# comme une panne et fait réessayer — ou écrire au support pour un problème
# qui n'en est pas un.
MESSAGE_OFFRE_FERMEE = (
    "L'abonnement Premium n'est pas ouvert. CaptenTDB est édité à titre non "
    "professionnel et ne perçoit aucun paiement : les fonctionnalités "
    "annoncées sont accessibles gratuitement."
)
