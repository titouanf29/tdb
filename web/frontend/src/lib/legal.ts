/**
 * QUI ÉDITE CE SITE, ET CE QUE ÇA AUTORISE.
 *
 * Une seule source pour une information qui commandait jusqu'ici deux choses
 * contradictoires. Les mentions légales annonçaient un éditeur « personne
 * physique » sans adresse ni SIREN — le régime de l'éditeur NON professionnel
 * — et affirmaient trois lignes plus bas qu'il agissait « en qualité de
 * professionnel » du fait de l'abonnement payant. Les deux ne peuvent pas être
 * vrais en même temps, et la page vendait un abonnement à 5 € pendant que
 * l'éditeur n'était pas immatriculé.
 *
 * LA RÈGLE, EN DEUX LIGNES.
 *
 * Éditer un site à titre non professionnel n'impose pas de publier son
 * identité : l'article 6 III 2° de la LCEN autorise le pseudonyme, à
 * condition d'avoir communiqué ses coordonnées à l'hébergeur et de publier
 * celles de l'hébergeur. C'est le régime d'un site gratuit.
 *
 * Proposer un abonnement payant de façon habituelle est en revanche une
 * activité commerciale. Elle suppose une immatriculation, et fait basculer
 * dans le régime professionnel : nom, adresse, e-mail, téléphone et SIREN
 * publics, CGV opposables, droit de rétractation, médiateur de la
 * consommation. Tenir le second discours sans la première situation n'est pas
 * une imprécision de rédaction.
 *
 * D'où ce module. Le statut est déclaré une fois ; les pages légales et
 * l'ouverture de l'offre payante en découlent. Le jour de l'immatriculation,
 * il y a une valeur à changer et cinq champs à remplir — pas quatre documents
 * à relire.
 *
 * LE CONTRÔLE RÉEL EST CÔTÉ SERVEUR. Ce fichier décide de ce qui s'AFFICHE.
 * Un écran qui masque un bouton n'empêche personne d'appeler l'API : c'est
 * `api/legal.py` qui refuse d'ouvrir un paiement, et c'est lui qui fait foi.
 */

export type StatutEditeur =
  /** Personne physique, pas d'activité déclarée. Aucune vente possible. */
  | "non_immatricule"
  /** Micro-entreprise / auto-entrepreneur immatriculé au RNE. */
  | "micro_entreprise"
  /** Société (SASU, EURL, SARL…). */
  | "societe";

/* Surchargeable par l'environnement pour que le basculement ne demande pas un
   déploiement. Le défaut est volontairement le plus restrictif : une variable
   oubliée doit fermer la vente, pas l'ouvrir. */
const STATUT = (process.env.NEXT_PUBLIC_EDITEUR_STATUT as StatutEditeur) || "non_immatricule";

export interface Editeur {
  statut: StatutEditeur;
  /** Le nom affiché. Un pseudonyme suffit tant que l'édition reste non professionnelle. */
  nomPublic: string;
  /** Prénom et nom civils. Obligatoires dès l'immatriculation. */
  identite: string;
  /** Adresse du siège ou du domicile déclaré. Obligatoire dès l'immatriculation. */
  adresse: string;
  /** Un e-mail de contact direct est exigé du professionnel — un formulaire ne suffit pas. */
  email: string;
  telephone: string;
  siren: string;
  /** Ville du greffe, pour une société. Vide pour une micro-entreprise. */
  rcs: string;
  /** Vide tant que la franchise en base s'applique — et il faut alors le dire. */
  tvaIntracom: string;
  pays: string;
}

export const EDITEUR: Editeur = {
  statut: STATUT,
  nomPublic: "CaptenQwark",
  identite: "",
  adresse: "",
  email: "",
  telephone: "",
  siren: "",
  rcs: "",
  tvaIntracom: "",
  pays: "France",
};

/** L'hébergeur, à publier dans tous les cas — c'est la contrepartie du pseudonyme. */
export const HEBERGEUR = {
  societe: "Railway Corp.",
  adresse: "548 Market St, PMB 68956, San Francisco, CA 94104, États-Unis",
  site: "https://railway.app",
};

/**
 * Peut-on proposer un abonnement payant ?
 *
 * Non tant que rien n'est immatriculé, et ce n'est pas un réglage prudentiel :
 * encaisser des abonnements sans activité déclarée est du travail dissimulé au
 * sens de l'article L.8221-3 du code du travail. Ce n'est pas non plus une
 * fatalité — l'immatriculation en micro-entreprise se fait en ligne, sans
 * frais, sur le guichet unique de l'INPI.
 */
export const OFFRE_PAYANTE_OUVERTE = EDITEUR.statut !== "non_immatricule";

/** Le régime applicable, qui décide du contenu des mentions légales. */
export const EST_PROFESSIONNEL = OFFRE_PAYANTE_OUVERTE;

/**
 * La phrase qui explique l'état actuel, là où l'utilisateur la rencontre.
 * Dire « indisponible » sans dire pourquoi laisse croire à une panne.
 */
export const PHRASE_OFFRE_FERMEE =
  "L'abonnement Premium ne peut pas être souscrit à ce jour : CaptenTDB est " +
  "édité à titre non professionnel et ne perçoit aucun paiement. Aucune " +
  "donnée bancaire n'est collectée. Les fonctionnalités décrites ci-dessous " +
  "existent et restent réservées aux comptes Premium ; elles ne sont " +
  "simplement pas en vente pour le moment.";
