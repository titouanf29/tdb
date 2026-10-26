"""
Le statut de l'éditeur, côté serveur — et le refus d'encaisser sans lui.

LE SERVEUR DÉCIDE, LE SITE AFFICHE. Masquer un bouton n'empêche personne
d'appeler `POST /api/premium/checkout` directement ; c'est ici que la vente
est fermée, et c'est ici que ça compte. Les pages légales (mentions, CGV)
lisent la même chose par `GET /api/legal/editeur` : une seule source, posée
dans les variables d'environnement du service. Le jour de l'immatriculation,
on remplit des variables — on ne réécrit pas quatre documents.

Proposer un abonnement de façon habituelle sans activité déclarée est du
travail dissimulé (article L.8221-3 du code du travail). Le garde-fou ne vaut
donc pas « fonctionnalité désactivée en attendant » : il ferme une porte qui
n'aurait pas dû être ouverte.

L'OFFRE N'OUVRE QUE SI TOUT EST PRÊT. Déclarer le statut ne suffit pas :
encaisser sans SIREN publié, sans adresse, sans médiateur de la consommation
ou avec un Stripe à moitié configuré ouvrirait une vente irrégulière ou
cassée. `liste_de_controle()` dit ce qui manque ; `offre_payante_ouverte()`
ne répond oui que quand la liste est vide.

Le défaut est le plus restrictif. Une variable oubliée, mal orthographiée ou
perdue dans une migration ferme la vente, jamais ne l'ouvre.
"""

import os

STATUTS = ("non_immatricule", "micro_entreprise", "societe")


def _env(nom: str) -> str:
    return (os.getenv(nom, "") or "").strip()


def statut_editeur() -> str:
    """Le statut déclaré. Toute valeur inconnue retombe sur le plus restrictif."""
    v = _env("EDITEUR_STATUT").lower()
    return v if v in STATUTS else "non_immatricule"


def prix_mensuel_centimes() -> int:
    """Le prix affiché, en centimes (PREMIUM_PRIX_MENSUEL, « 5 » ou « 4,99 »).

    Il doit être celui du prix Stripe (STRIPE_PRICE_ID) : la page qui annonce
    5 € et la carte débitée de 6 € seraient une pratique trompeuse. La liste de
    contrôle compare les deux quand Stripe est joignable."""
    v = _env("PREMIUM_PRIX_MENSUEL").replace(",", ".") or "5"
    try:
        return max(0, round(float(v) * 100))
    except ValueError:
        return 500


def editeur() -> dict:
    """L'identité publiée. Vide tant que l'éditeur n'est pas immatriculé :
    le pseudonyme suffit alors (LCEN, art. 6 III 2°)."""
    statut = statut_editeur()
    identite = _env("EDITEUR_IDENTITE")
    # Depuis le 15 mai 2022, l'entrepreneur individuel fait suivre son nom de
    # « EI » sur tous ses documents (code de commerce, art. R.123-237).
    nom_commercial = identite + " EI" if statut == "micro_entreprise" and identite and not identite.endswith(" EI") else identite
    return {
        "statut": statut,
        "nom_public": _env("EDITEUR_NOM_PUBLIC") or "CaptenQwark",
        "identite": nom_commercial,
        "adresse": _env("EDITEUR_ADRESSE"),
        "email": _env("EDITEUR_EMAIL"),
        "telephone": _env("EDITEUR_TELEPHONE"),
        "siren": _env("EDITEUR_SIREN").replace(" ", ""),
        "rcs": _env("EDITEUR_RCS"),
        "tva_intracom": _env("EDITEUR_TVA"),
        # Franchise en base : pas de TVA facturée, et la mention est obligatoire.
        "mention_tva": "" if _env("EDITEUR_TVA") else "TVA non applicable, art. 293 B du CGI",
        "mediateur": {"nom": _env("MEDIATEUR_NOM"), "adresse": _env("MEDIATEUR_ADRESSE"),
                      "site": _env("MEDIATEUR_SITE")},
        "pays": "France",
    }


def _siren_valide(s: str) -> bool:
    """Neuf chiffres et la clé de Luhn : une coquille se voit avant d'être publiée."""
    if len(s) != 9 or not s.isdigit():
        return False
    total = 0
    for i, c in enumerate(reversed(s)):
        d = int(c) * (2 if i % 2 else 1)
        total += d - 9 if d > 9 else d
    return total % 10 == 0


def liste_de_controle() -> list[dict]:
    """Chaque condition d'ouverture, faite ou non, avec ce qu'il faut faire.

    [{"cle", "libelle", "ok", "comment"}] — affichée telle quelle dans
    l'administration.
    """
    e = editeur()
    sk = _env("STRIPE_SECRET_KEY")
    items = [
        ("statut", "Statut déclaré (micro-entreprise ou société)",
         e["statut"] != "non_immatricule",
         "EDITEUR_STATUT=micro_entreprise, une fois l'immatriculation confirmée (avis de situation INSEE reçu)."),
        ("identite", "Nom et prénom de l'entrepreneur", bool(_env("EDITEUR_IDENTITE")),
         "EDITEUR_IDENTITE=Prénom Nom — « EI » est ajouté automatiquement."),
        ("adresse", "Adresse de domiciliation", bool(e["adresse"]),
         "EDITEUR_ADRESSE=… — celle déclarée à l'immatriculation (une domiciliation évite de publier son domicile)."),
        ("email", "E-mail de contact direct", "@" in e["email"],
         "EDITEUR_EMAIL=… — un formulaire ne suffit pas pour un professionnel."),
        ("telephone", "Téléphone", bool(e["telephone"]), "EDITEUR_TELEPHONE=…"),
        ("siren", "SIREN valide", _siren_valide(e["siren"]),
         "EDITEUR_SIREN=123456789 — les 9 chiffres de l'avis de situation."),
        ("mediateur", "Médiateur de la consommation", bool(e["mediateur"]["nom"] and e["mediateur"]["site"]),
         "MEDIATEUR_NOM, MEDIATEUR_SITE (et MEDIATEUR_ADRESSE) — obligatoire pour vendre à des particuliers "
         "(code de la consommation, art. L.612-1). Adhésion à prendre auprès d'un médiateur agréé (CM2C, "
         "Médicys, CNPM…)."),
        ("stripe_cle", "Clé secrète Stripe", sk.startswith("sk_"),
         "STRIPE_SECRET_KEY=sk_live_… (sk_test_… pour essayer : seuls les administrateurs peuvent alors payer)."),
        ("stripe_prix", "Prix d'abonnement Stripe", _env("STRIPE_PRICE_ID").startswith("price_"),
         "STRIPE_PRICE_ID=price_… — un prix récurrent mensuel créé dans Stripe → Catalogue de produits."),
        ("stripe_webhook", "Secret du webhook Stripe", _env("STRIPE_WEBHOOK_SECRET").startswith("whsec_"),
         "STRIPE_WEBHOOK_SECRET=whsec_… — webhook vers https://<api>/api/premium/webhook (voir le guide)."),
        ("prix", "Prix affiché", prix_mensuel_centimes() > 0, "PREMIUM_PRIX_MENSUEL=5 — le même que le prix Stripe."),
    ]
    return [{"cle": c, "libelle": l, "ok": bool(ok), "comment": comment} for c, l, ok, comment in items]


def stripe_en_test() -> bool:
    return _env("STRIPE_SECRET_KEY").startswith("sk_test_")


def offre_payante_ouverte() -> bool:
    """Peut-on encaisser ? Seulement quand toute la liste de contrôle est faite,
    et jamais avec une clé Stripe de test (une vente « pour de faux » n'est
    pas une vente)."""
    return all(i["ok"] for i in liste_de_controle()) and not stripe_en_test()


def essai_admin_possible() -> bool:
    """Le parcours de paiement complet, en mode test Stripe, réservé aux
    administrateurs : de quoi tout vérifier AVANT l'immatriculation, avec les
    cartes de test de Stripe, sans qu'aucun visiteur puisse payer."""
    return stripe_en_test() and _env("STRIPE_PRICE_ID").startswith("price_")


def version_cgv() -> str:
    """La version des CGV acceptée à la souscription, gardée en preuve."""
    return _env("CGV_VERSION") or "2.0"


# Le message rendu à l'appelant. Il dit la raison, parce qu'un 503 muet se lit
# comme une panne et fait réessayer — ou écrire au support pour un problème
# qui n'en est pas un.
MESSAGE_OFFRE_FERMEE = (
    "L'abonnement Premium n'est pas encore ouvert : aucun paiement n'est "
    "perçu, et tous les comptes ont gratuitement l'accès complet."
)
