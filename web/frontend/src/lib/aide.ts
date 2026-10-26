/**
 * Ce que Nimbo sait répondre sur le site (components/app/AideNimbo.tsx).
 *
 * Des réponses écrites, pas un modèle de langage : elles disent exactement où
 * cliquer, et chacune mène à l'endroit ou lance la visite guidée qui le
 * montre. Pour une question sur les marchés ou sur ses propres données, Nimbo
 * renvoie vers l'Assistant, qui est fait pour ça.
 *
 * La recherche est volontairement simple : des mots-clés sans accents,
 * comptés dans la question. Une réponse ne sort que si au moins un mot-clé
 * est trouvé ; sinon Nimbo le dit, et propose l'Assistant ou l'équipe.
 */
import type { VisiteId } from "./visite";

export type ActionAide =
  | { libelle: string; lien: string }
  | { libelle: string; visite: VisiteId };

export interface ReponseAide {
  id: string;
  question: string;
  motsCles: string[];
  reponse: string[];
  actions: ActionAide[];
}

export const AIDE: ReponseAide[] = [
  {
    id: "contacter", question: "Comment contacter l'équipe ?",
    motsCles: ["contact", "equipe", "admin", "support", "bug", "probleme", "aide", "ecrire", "signaler un", "joindre", "message a"],
    reponse: [
      "Par « Mes demandes » : Communauté, puis Mes demandes, puis « Nouvelle demande ». Un sujet, ce qui se passe, et sur quel écran.",
      "L'équipe vous répond au même endroit, et une notification vous prévient. Une idée s'envoie de la même façon.",
    ],
    actions: [{ libelle: "Écrire à l'équipe", lien: "/support?nouveau=1" }, { libelle: "Me montrer le chemin", visite: "support" }],
  },
  {
    id: "analyser", question: "Comment analyser un actif ?",
    motsCles: ["analys", "actif", "action", "recherch", "trouver", "verdict", "cours de", "crypto", "bitcoin", "apple"],
    reponse: [
      "Tapez le nom de l'actif dans la recherche en haut de l'écran (la loupe sur téléphone) : « Apple », « bitcoin », « CAC 40 ». L'analyse s'ouvre directement.",
      "Elle commence par mon verdict et sa raison en une phrase, puis mon avis : je dis si je propose une position, avec son stop et son objectif, ou pourquoi je n'en propose pas.",
    ],
    actions: [{ libelle: "Ouvrir l'analyse", lien: "/analysis" }, { libelle: "Faire la visite guidée", visite: "decouverte" }],
  },
  {
    id: "score", question: "Que veut dire le score sur 100 ?",
    motsCles: ["score", "note", "sur 100", "/100", "chiffre"],
    reponse: [
      "Le score résume ce que je lis sur l'actif, de 0 à 100 : tendance, élan, volume, risque, et les fondamentaux selon votre horizon.",
      "Au-dessus de 60 environ, le signal penche à l'achat ; je ne propose une position que si l'historique de l'actif montre que ce type de signal a vraiment payé, frais compris.",
    ],
    actions: [{ libelle: "Ouvrir l'analyse", lien: "/analysis" }],
  },
  {
    id: "position", question: "Comment prendre une position ?",
    motsCles: ["position", "acheter", "vendre", "ordre", "trade", "trader", "investir", "prendre"],
    reponse: [
      "Depuis l'analyse d'un actif, le bouton « Prendre position » ouvre l'ordre déjà rempli avec mon stop et mon objectif : vous n'avez plus qu'à valider.",
      "Vous pouvez aussi passer par Mon espace, puis « Ouvrir une position ». C'est de l'argent virtuel : se tromper ici ne coûte rien.",
    ],
    actions: [{ libelle: "Ouvrir une position", lien: "/trading" }, { libelle: "Choisir un actif", lien: "/analysis" }],
  },
  {
    id: "fermer", question: "Comment fermer une position ?",
    motsCles: ["fermer", "cloturer", "cloture", "sortir", "couper", "arreter", "solder", "revendre", "position"],
    reponse: [
      "Dans le Wallet de simulation, chaque position en cours a un bouton « Clôturer » : confirmez, et elle se ferme au cours du moment.",
      "Elle se ferme aussi toute seule quand son stop ou son objectif est atteint, même site fermé, et une notification vous prévient.",
    ],
    actions: [{ libelle: "Ouvrir le wallet", lien: "/wallet" }],
  },
  {
    id: "argent", question: "C'est de l'argent réel ?",
    motsCles: ["reel", "vrai argent", "argent", "risque", "perdre", "payer", "gratuit", "euros"],
    reponse: [
      "Non. Vous avez 10 000 € fictifs, crédités à l'ouverture du compte. Les cours, eux, sont réels.",
      "Aucune somme réelle ne transite par le site, et rien de ce que vous faites ici n'est un conseil en investissement.",
    ],
    actions: [{ libelle: "Voir mon wallet", lien: "/wallet" }],
  },
  {
    id: "solde", question: "Comment recommencer avec 10 000 € ?",
    motsCles: ["solde", "recommencer", "reinitialiser", "remettre", "zero", "ajuster", "wallet", "portefeuille"],
    reponse: [
      "Dans le Wallet de simulation : « Recommencer » remet le compte à son solde de départ, « Ajuster le solde » ajoute ou retire des euros fictifs.",
      "Le Portefeuille réel, lui, est autre chose : un relevé de vos placements hors du site, que vous saisissez à la main.",
    ],
    actions: [{ libelle: "Ouvrir le wallet", lien: "/wallet" }],
  },
  {
    id: "stop", question: "C'est quoi un stop et un objectif ?",
    motsCles: ["stop", "objectif", "take profit", "stop loss", "sortie", "limite"],
    reponse: [
      "Le stop est le prix auquel la position se ferme toute seule si le cours va contre vous : c'est la perte maximale que vous acceptez, décidée avant d'entrer.",
      "L'objectif est le prix auquel elle se ferme en gain. Le serveur les surveille toutes les trois minutes, même quand le site est fermé.",
    ],
    actions: [{ libelle: "Le glossaire", lien: "/learn/glossaire" }, { libelle: "Le parcours", lien: "/learn" }],
  },
  {
    id: "alerte", question: "Comment être prévenu à un prix ?",
    motsCles: ["alerte", "prevenir", "prix", "seuil", "rappel"],
    reponse: [
      "Sur l'analyse d'un actif, sous mon avis : « Me prévenir à un prix ». Je vous propose l'objectif, le stop, la résistance et le support, ou le prix de votre choix.",
      "Je vérifie toutes les trois minutes, même site fermé, et je vous préviens dans la cloche et sur votre téléphone si vous avez activé les notifications.",
    ],
    actions: [{ libelle: "Choisir un actif", lien: "/analysis" }, { libelle: "Mes alertes", lien: "/settings?section=notifications" }],
  },
  {
    id: "notifications", question: "Comment recevoir les notifications sur mon téléphone ?",
    motsCles: ["notif", "telephone", "iphone", "android", "portable", "mobile", "push", "cloche", "recevoir", "prevenu", "silence", "heures calmes"],
    reponse: [
      "Dans Réglages, Notifications : « Activer » sur cet appareil, puis vous choisissez ce que vous recevez, catégorie par catégorie, et vos heures calmes.",
      "Sur iPhone, ajoutez d'abord le site à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil ») et ouvrez-le depuis l'icône.",
    ],
    actions: [{ libelle: "Régler mes notifications", lien: "/settings?section=notifications" }],
  },
  {
    id: "missions", question: "À quoi servent les missions et la série ?",
    motsCles: ["mission", "serie", "niveau", "points", "xp", "badge", "affilee", "jour du"],
    reponse: [
      "Chaque jour, trois missions courtes : une analyse, une leçon, un scan. Elles se cochent toutes seules sur l'accueil, avec votre série de jours d'affilée.",
      "Les missions rapportent des points et font monter votre niveau. Rien n'est obligatoire : c'est un fil pour progresser un peu chaque jour.",
    ],
    actions: [{ libelle: "Voir mes missions", lien: "/learn/missions" }],
  },
  {
    id: "apprendre", question: "Par où commencer pour apprendre ?",
    motsCles: ["apprendre", "lecon", "cours", "debut", "debutant", "parcours", "comprendre", "formation", "video"],
    reponse: [
      "Par le Parcours : des leçons courtes, rangées dans l'ordre, avec des graphiques à manipuler et un quiz. La première explique comment lire un graphique.",
      "Elles sont aussi lisibles sans compte, et chaque vidéo TikTok de la série a sa leçon complète.",
    ],
    actions: [{ libelle: "Ouvrir le parcours", lien: "/learn" }],
  },
  {
    id: "strategie", question: "Comment tester ma propre stratégie ?",
    motsCles: ["strategie", "regle", "backtest", "tester", "rejouer", "historique"],
    reponse: [
      "Dans Analyser, puis Ma stratégie : vous composez vos règles avec moi (tendance, RSI, cassure…), je les relis, puis vous les rejouez sur des années de cours.",
      "Une fois activée, je l'applique sur chaque analyse et je vous préviens quand elle se déclenche sur un de vos favoris.",
    ],
    actions: [{ libelle: "Ma stratégie", lien: "/strategie" }],
  },
  {
    id: "favoris", question: "Comment suivre un actif ?",
    motsCles: ["favori", "suivre", "etoile", "liste", "surveiller"],
    reponse: [
      "Sur l'analyse d'un actif, l'étoile à côté de son nom l'ajoute à vos favoris. Vous les retrouvez dans Mon espace, Favoris.",
      "Je les surveille pour vous : si je propose un achat sur l'un d'eux, je vous préviens.",
    ],
    actions: [{ libelle: "Mes favoris", lien: "/favorites" }],
  },
  {
    id: "journal", question: "À quoi sert le journal ?",
    motsCles: ["journal", "note", "relire", "historique des trades"],
    reponse: [
      "Le journal garde vos décisions : ce que vous attendiez avant d'entrer, et ce qui s'est passé. Quand une position se ferme, sa relecture y est écrite automatiquement.",
      "C'est en relisant qu'on voit ce qui se répète. Le bilan du vendredi compte vos notes.",
    ],
    actions: [{ libelle: "Ouvrir le journal", lien: "/journal" }],
  },
  {
    id: "communaute", question: "Comment fonctionne la Communauté ?",
    motsCles: ["communaute", "membre", "discuter", "partager", "defi", "classement", "chat"],
    reponse: [
      "Un fil commun : ma note du jour chaque matin de semaine, les mots de l'équipe, les analyses partagées et vos messages. On vous prévient quand on vous répond.",
      "Chaque semaine, un défi sur la discipline (stops, journal, leçons, régularité), avec un classement pour ceux qui veulent y participer. Jamais sur les gains.",
    ],
    actions: [{ libelle: "Ouvrir la Communauté", lien: "/community" }],
  },
  {
    id: "bilan", question: "C'est quoi le bilan de la semaine ?",
    motsCles: ["bilan", "semaine", "week-end", "weekend", "vendredi", "preparer"],
    reponse: [
      "Le vendredi à 22 h 30, je fais le point : vos trades, votre discipline (stops, journal), votre activité, et un conseil pour la semaine suivante.",
      "Il s'affiche dans l'espace « Préparer la semaine », ouvert du vendredi soir au lundi 9 h, avec l'agenda et vos actifs.",
    ],
    actions: [{ libelle: "Préparer la semaine", lien: "/semaine" }],
  },
  {
    id: "premium", question: "Qu'est-ce que Premium ?",
    motsCles: ["premium", "abonnement", "prix", "payer", "limite", "illimite"],
    reponse: [
      "Premium lève les limites sur ce qui coûte cher à calculer : scans, questions à l'Assistant, positions et favoris.",
      "Pour l'instant, l'abonnement n'est pas ouvert : tout le monde a gratuitement l'accès décrit sur la page Premium.",
    ],
    actions: [{ libelle: "Voir Premium", lien: "/premium" }],
  },
  {
    id: "compte", question: "Comment changer mon mot de passe ?",
    motsCles: ["mot de passe", "password", "compte", "email", "adresse", "supprimer", "pseudo", "profil", "donnees"],
    reponse: [
      "Dans Réglages, Mon profil : changer le mot de passe, voir votre adresse, télécharger vos données ou supprimer votre compte.",
      "Mot de passe oublié ? Sur la page de connexion, « Mot de passe oublié » vous envoie un lien par e-mail.",
    ],
    actions: [{ libelle: "Mon profil", lien: "/settings?section=profil" }],
  },
  {
    id: "assistant", question: "Quelle différence avec l'Assistant ?",
    motsCles: ["assistant", "ia", "intelligence", "question sur", "marche"],
    reponse: [
      "Ici, je réponds aux questions sur le site : où trouver quoi, comment faire.",
      "Pour une question sur les marchés, un indicateur ou vos propres positions, l'Assistant répond en s'appuyant sur vos données et sur le moteur d'analyse.",
    ],
    actions: [{ libelle: "Ouvrir l'Assistant", lien: "/assistant" }],
  },
  {
    id: "visite", question: "Je peux refaire la visite du site ?",
    motsCles: ["visite", "tour", "guide", "montrer", "decouvrir", "presentation", "perdu"],
    reponse: ["Oui : je vous emmène sur les vrais écrans, du plan du site jusqu'à votre première analyse. Deux minutes."],
    actions: [{ libelle: "Lancer la visite", visite: "decouverte" }],
  },
];

/** Les questions proposées d'emblée, selon la page où l'on est. */
export function suggestions(chemin: string): ReponseAide[] {
  const parId = (ids: string[]) => ids.map((i) => AIDE.find((a) => a.id === i)!).filter(Boolean);
  if (chemin.startsWith("/analysis")) return parId(["score", "position", "alerte", "favoris", "contacter"]);
  if (chemin.startsWith("/wallet") || chemin.startsWith("/trading")) return parId(["stop", "solde", "argent", "journal", "contacter"]);
  if (chemin.startsWith("/learn") || chemin.startsWith("/lecon")) return parId(["apprendre", "missions", "analyser", "contacter"]);
  if (chemin.startsWith("/community") || chemin.startsWith("/support")) return parId(["communaute", "contacter", "notifications"]);
  if (chemin.startsWith("/strategie")) return parId(["strategie", "notifications", "contacter"]);
  return parId(["contacter", "analyser", "argent", "notifications", "visite"]);
}

function normaliser(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ");
}

/** Un mot-clé d'un seul mot reconnaît ses variantes : « fermer », « ferme », « fermé ». */
function racine(mot: string): string {
  return mot.length > 5 ? mot.slice(0, mot.length - 1) : mot;
}

function correspond(motCle: string, q: string, mots: string[]): boolean {
  const m = normaliser(motCle).trim();
  if (m.includes(" ") || m.includes("/")) return q.includes(m);
  const r = racine(m);
  return mots.some((w) => w.startsWith(r) || (w.length >= 4 && m.startsWith(w)));
}

// Un mot-clé propre à une seule réponse pèse plus qu'un mot partagé.
const FREQUENCE = new Map<string, number>();
for (const a of AIDE) for (const m of a.motsCles) FREQUENCE.set(m, (FREQUENCE.get(m) ?? 0) + 1);

/** La réponse la plus proche d'une question tapée, ou null. */
export function chercher(question: string): ReponseAide | null {
  const q = ` ${normaliser(question)} `;
  const mots = q.split(/[^a-z0-9/]+/).filter((w) => w.length >= 3);
  let meilleure: ReponseAide | null = null;
  let score = 0;
  for (const a of AIDE) {
    const s = a.motsCles.reduce((n, m) => n + (correspond(m, q, mots) ? ((FREQUENCE.get(m) ?? 1) > 1 ? 1 : 2) : 0), 0);
    if (s > score) { score = s; meilleure = a; }
  }
  return score > 0 ? meilleure : null;
}
