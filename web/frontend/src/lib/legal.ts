/**
 * CE QUI NE DÉPEND PAS DE L'ÉDITEUR.
 *
 * L'identité de l'éditeur, son statut, le prix et l'ouverture de la vente ne
 * sont PLUS écrits ici : ils viennent du serveur (backend api/legal.py,
 * variables EDITEUR_*), lus par `lib/legal-serveur.ts` pour les pages
 * légales et par `/api/premium/status` pour la page Premium. Ils vivaient
 * ici en double avec le serveur — le jour de l'immatriculation, il aurait
 * fallu changer les deux, et un oubli publiait des CGV sans vendeur.
 *
 * Pourquoi cette règle existe : éditer un site à titre non professionnel
 * autorise le pseudonyme (LCEN, art. 6 III 2°) ; vendre un abonnement de
 * façon habituelle est une activité commerciale qui impose l'immatriculation
 * et la publication de l'identité complète, sans quoi c'est du travail
 * dissimulé (art. L.8221-3 du code du travail). Le serveur ferme la vente
 * tant que tout n'est pas en place.
 */

/** L'hébergeur, à publier dans tous les cas — c'est la contrepartie du pseudonyme. */
export const HEBERGEUR = {
  societe: "Railway Corp.",
  adresse: "548 Market St, PMB 68956, San Francisco, CA 94104, États-Unis",
  site: "https://railway.app",
};

/**
 * La phrase qui explique l'état actuel, là où l'utilisateur la rencontre.
 * Dire « indisponible » sans dire pourquoi laisse croire à une panne.
 */
export const PHRASE_OFFRE_FERMEE =
  "L'abonnement Premium n'est pas encore ouvert : aucun paiement n'est " +
  "perçu et aucune donnée bancaire n'est collectée. En attendant, tous les " +
  "comptes ont gratuitement l'accès décrit ci-dessous.";
