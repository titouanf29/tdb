# Ouvrir le Premium — le jour de l'immatriculation

Tout est prêt dans le code. La vente reste fermée tant qu'une condition manque,
et s'ouvre d'elle-même quand la dernière est remplie. Ici, ouvrir veut dire
poser des variables d'environnement sur Railway : aucune ligne de code à
changer.

L'état en direct se lit dans **Admin → Exploitation → « Ouverture du
Premium »**. On y voit chaque condition et la variable à poser.

> Ce guide décrit le fonctionnement du site. Pour les questions juridiques ou
> fiscales propres à ta situation (régime, cotisations, versement libératoire,
> franchise de TVA), la référence reste l'URSSAF, les impôts ou un
> professionnel.

---

## 0. Avant l'immatriculation : tout essayer en mode test

1. Dans Stripe, reste en **mode test** (bascule en haut à droite du tableau de
   bord).
2. Crée un produit « CaptenTDB Premium » avec un **prix récurrent mensuel** en
   EUR (par exemple 5,00 €). Copie l'identifiant `price_…`.
3. Développeurs → Webhooks → ajoute un point de terminaison :
   - adresse : celle affichée dans le panneau admin (`…/api/premium/webhook`) ;
   - événements : `checkout.session.completed`, `invoice.paid`,
     `invoice.payment_failed`, `customer.subscription.updated`,
     `customer.subscription.deleted`.

   Copie le secret de signature `whsec_…`.
4. Paramètres → Facturation → **Portail client** : active-le et enregistre la
   configuration. Sans cela, le bouton « Gérer le paiement et les factures »
   ne s'ouvre pas.
5. Sur Railway, dans le service **backend**, ajoute ces variables :

   ```
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_PRICE_ID=price_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   PREMIUM_PRIX_MENSUEL=5
   ```

6. Va sur la page Premium avec un compte administrateur. Un bandeau « Mode
   test Stripe » apparaît, et toi seul peux payer. Utilise la carte
   `4242 4242 4242 4242`, une date future et n'importe quel code. Vérifie
   ensuite :
   - le Premium s'active au retour de Stripe ;
   - l'e-mail de confirmation arrive (si l'envoi d'e-mails est configuré) ;
   - « Résilier » puis « Garder mon abonnement » ;
   - « Me rétracter » : l'abonnement s'arrête et le remboursement apparaît
     dans Stripe.

Le public, lui, ne voit rien : avec une clé `sk_test_`, l'offre reste fermée.

## 1. Le jour où l'avis de situation INSEE arrive

Pose sur Railway (service backend) :

| Variable | Exemple | Pourquoi |
|---|---|---|
| `EDITEUR_STATUT` | `micro_entreprise` | Fait passer les mentions légales au régime professionnel |
| `EDITEUR_IDENTITE` | `Prénom Nom` | « EI » est ajouté automatiquement (obligatoire pour un entrepreneur individuel) |
| `EDITEUR_ADRESSE` | adresse déclarée | Une domiciliation évite de publier ton domicile |
| `EDITEUR_EMAIL` | `contact@captentdb.fr` | Un professionnel doit donner un e-mail direct |
| `EDITEUR_TELEPHONE` | `06 …` | Exigé pour un professionnel (LCEN) |
| `EDITEUR_SIREN` | 9 chiffres | Vérifié (clé de Luhn) : une faute de frappe bloque l'ouverture |
| `EDITEUR_TVA` | *(vide)* | Vide = franchise en base : « TVA non applicable, art. 293 B du CGI » s'affiche partout et sur les factures |

## 2. Le médiateur de la consommation

C'est obligatoire pour vendre à des particuliers (art. L.612-1 du code de la
consommation), et l'offre ne s'ouvre pas sans lui. Il faut adhérer à un
médiateur référencé : la liste officielle est sur le site de la CECMC
(Commission d'évaluation et de contrôle de la médiation de la consommation).
Plusieurs proposent une adhésion annuelle adaptée aux micro-entreprises ;
compare leurs prix avant de choisir.

Ensuite, pose :

```
MEDIATEUR_NOM=…
MEDIATEUR_ADRESSE=…
MEDIATEUR_SITE=https://…
```

## 3. Passer Stripe en réel

1. Active ton compte Stripe : identité, SIREN, IBAN pour les virements.
2. Dans Paramètres → Image de marque / Factures, renseigne le nom de
   l'entreprise (Prénom Nom EI) et l'adresse. Le site ajoute de lui-même, en
   pied de chaque facture, ton identité, ton SIREN et la mention de TVA.
3. Refais en **mode réel** les étapes 0.2, 0.3 et 0.4 : produit et prix,
   webhook, portail client.
4. Remplace les trois variables Stripe par les valeurs réelles (`sk_live_…`,
   le `price_…` réel, le `whsec_…` réel).

## 4. Vérifier

Dans **Admin → Exploitation → Ouverture du Premium**, toutes les lignes
doivent être vertes. Une ligne en plus vérifie aussi, auprès de Stripe, que
le prix est actif, en EUR, mensuel et égal à `PREMIUM_PRIX_MENSUEL`. Dès que
tout est vert :

- la page Premium affiche l'offre et le bouton « S'abonner — payer 5 € par
  mois » ;
- les limites du compte gratuit (1 scan par jour, 10 questions, 5 positions,
  10 favoris) s'appliquent. Jusque-là, tout le monde avait l'accès complet ;
- les mentions légales et les CGV publient ton identité (relues toutes les 5
  minutes ; un redéploiement les met à jour aussitôt).

## Côté frontend

Rien à poser : les pages légales lisent tout sur le backend
(`/api/legal/editeur`). `NEXT_PUBLIC_EDITEUR_STATUT` n'est plus utilisée.

## Ce que le site fait déjà pour toi

- Il garde la preuve de l'acceptation des CGV : date et version.
- Il envoie par e-mail la confirmation du contrat, avec le formulaire de
  rétractation.
- La résiliation se fait en trois clics. Elle prend effet à la fin du mois
  payé et reste réversible jusque-là.
- La rétractation est possible pendant 14 jours, avec remboursement intégral
  automatique.
- Les impayés sont notifiés à l'abonné. Stripe réessaie la carte et met fin à
  l'abonnement s'il n'y arrive pas.
- Si un administrateur retire le Premium à quelqu'un, l'abonnement Stripe est
  annulé lui aussi.
- Le webhook reste actif pendant une maintenance et ne compte jamais deux fois
  le même événement.

## Garder en tête

- **Déclarer le chiffre d'affaires** à l'URSSAF, mois par mois ou trimestre
  par trimestre. Le montant encaissé se lit dans Stripe (Paiements) ; c'est
  le montant **avant** les frais Stripe qui compte.
- **Livre des recettes** : obligatoire en micro-entreprise. L'export des
  paiements Stripe peut servir de base.
- **Franchise de TVA** : si le chiffre d'affaires dépasse le seuil de la
  franchise en base, il faudra facturer la TVA. Il suffira alors de poser
  `EDITEUR_TVA`, et la mention disparaîtra des pages et des factures.
- **Changer le prix** : crée un nouveau prix dans Stripe, mets à jour
  `STRIPE_PRICE_ID` et `PREMIUM_PRIX_MENSUEL`, puis préviens les abonnés au
  moins 30 jours à l'avance (CGV, article 3). Les abonnements existants
  gardent l'ancien prix tant que tu ne les migres pas dans Stripe.
- **Modifier les CGV** : incrémente `CGV_VERSION`. Les nouvelles
  souscriptions enregistrent la nouvelle version.
