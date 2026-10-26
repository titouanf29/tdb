import type { Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { DetecteurArnaque } from "@/components/cours/outils/DetecteurArnaque";
import { PyramidePonzi } from "@/components/cours/outils/PyramidePonzi";
import { PromesseIntenable } from "@/components/cours/outils/PromesseIntenable";

// 1&nbsp;000&nbsp;€ à 10 % par semaine, semaine après semaine : la courbe qui crève le plafond.
const promesse: Bougie[] = Array.from({ length: 53 }, (_, w) => {
  const c = 1000 * Math.pow(1.1, w);
  return { o: c / 1.1, h: c, l: c / 1.1, c, v: 0 };
});

const lecon: LeconSerie = {
  numero: 27,
  accroche: "Dix pour cent par semaine, garanti ? C'est le piège classique.",
  promesse: "À la fin de cette leçon, vous saurez repérer une arnaque au trading en quelques secondes, grâce à quatre signes, comprendre la pyramide de Ponzi, et savoir où vérifier avant de confier un euro.",
  parties: [{
    titre: "",
    blocs: [
      { t: "p", html: "Le trading attire les escrocs pour une raison simple : il fait rêver, et peu de gens savent comment il fonctionne vraiment. Une <span class=\"mot\">arnaque</span> (en anglais <em>scam</em>) au trading vous promet de l'argent facile pour vous prendre le vôtre. Elles changent de visage tous les mois, mais elles se trahissent presque toujours par les mêmes <b>quatre signes</b>." },
      { t: "h", texte: "Premier signe : des gains garantis" },
      { t: "p", html: "« 10 % par semaine, garanti. » « Ma méthode ne perd jamais. » En trading, <b>rien n'est garanti, même pour les professionnels</b>. Tout trader honnête perd des trades, des semaines, parfois des mois. Le mot « garanti » à côté d'un gain suffit à fermer la page." },
      { t: "p", html: "Faites le calcul. Gagner 10 % par semaine en réinvestissant ses gains, c'est multiplier son argent par 1,1, cinquante-deux fois de suite : <b>plus de 140 fois la mise en un an</b>. 1&nbsp;000&nbsp;€ deviendraient 142&nbsp;000&nbsp;€. La deuxième année, plus de 20 millions." },
      {
        t: "graphique",
        cfg: { bougies: promesse, type: "ligne", unite: "semaine", notes: [{ i: 30, prix: 17449, texte: "Semaine 30 : 17 449 €" }, { i: 48, prix: 97017, texte: "Semaine 48 : 97 017 €" }], ariaLabel: "1 000 euros à 10 % par semaine pendant un an" },
        legende: "1&nbsp;000&nbsp;€ à 10 % par semaine, pendant 52 semaines. Pendant des mois la courbe semble raisonnable, puis elle explose : 142&nbsp;000&nbsp;€ à la fin de l'année. Aucun trader au monde ne fait ça.",
      },
      {
        t: "outil",
        titre: "Si la promesse était vraie",
        consigne: "Choisissez le gain promis par semaine, et regardez ce que deviendraient 1&nbsp;000&nbsp;€ en un an.",
        el: <PromesseIntenable />,
      },
      { t: "h", texte: "Deuxième signe : les fausses preuves" },
      { t: "p", html: "Des captures de comptes couverts de chiffres verts, des voitures de luxe, des montres, des vacances au soleil. Rien de tout cela n'est une preuve. <b>Une capture d'écran se truque en une minute</b>, ou vient d'un compte démo en argent fictif (leçon 23). <b>Une voiture se loue</b> à la journée, une villa aussi. Et un chiffre comme « 92 % de trades gagnants », que personne ne peut vérifier, ne prouve rien." },
      { t: "p", html: "Posez-vous la question à l'envers : si cette personne gagnait vraiment autant en tradant, pourquoi passerait-elle ses journées à vendre des formations ou des abonnements ? Souvent, son vrai revenu, c'est vous." },
      { t: "h", texte: "Troisième signe : l'urgence" },
      { t: "p", html: "« Plus que trois places. » « L'offre se termine ce soir à minuit. » « Répondez sous 24 heures. » On vous presse <b>pour que vous ne preniez pas le temps de vérifier</b>. Une offre honnête sera encore là demain, et la semaine prochaine. Une décision d'argent qui ne supporte pas une nuit de réflexion est une mauvaise décision." },
      { t: "h", texte: "Quatrième signe : un inconnu en privé" },
      { t: "p", html: "Quelqu'un vous écrit en message privé, après un commentaire, sur un réseau social ou une application de rencontre. Il est sympathique, il a réussi, et il propose de <b>placer votre argent à votre place</b>, ou de vous faire entrer dans un groupe « réservé ». <b>Un vrai professionnel ne fait jamais ça.</b> Gérer l'argent des autres demande un agrément officiel, et aucun professionnel agréé ne démarche des inconnus en messages privés." },
      {
        t: "tableau",
        entetes: ["Le signe", "Ce qu'on vous dit", "Ce qu'il faut entendre"],
        lignes: [
          ["Gains garantis", "« 10 % par semaine, sans risque »", "Rien n'est garanti en trading, jamais."],
          ["Fausses preuves", "Captures, voitures, « 92 % de réussite »", "Une capture se truque, une voiture se loue."],
          ["Urgence", "« Plus que 3 places, ce soir seulement »", "On veut vous empêcher de vérifier."],
          ["Inconnu en privé", "« Je trade pour vous, vous n'avez rien à faire »", "Un professionnel ne démarche pas ainsi."],
        ],
      },
      {
        t: "outil",
        titre: "Le détecteur d'arnaque",
        consigne: "Cinq messages inventés, et l'un d'eux est honnête. Touchez les phrases qui vous semblent suspectes, puis rendez votre verdict.",
        el: <DetecteurArnaque />,
      },
      { t: "h", texte: "La pyramide de Ponzi" },
      { t: "p", html: "L'arnaque la plus connue porte le nom de Charles Ponzi, qui l'a rendue célèbre aux États-Unis dans les années 1920 : la <span class=\"mot\">pyramide de Ponzi</span> (<em>Ponzi scheme</em>). Le principe : on promet un rendement régulier et élevé, mais <b>il n'y a aucun investissement</b>. Les « gains » des premiers sont payés <b>avec l'argent des nouveaux</b>." },
      { t: "p", html: "Au début, tout marche : les premiers sont payés à l'heure, ils en parlent, d'autres arrivent. Mais pour payer tout le monde, il faut toujours plus de nouveaux. <b>Quand les nouveaux n'arrivent plus, tout s'effondre</b>, d'un coup, et la plupart perdent tout. Faites-la tourner vous-même." },
      {
        t: "outil",
        titre: "Une pyramide, mois par mois",
        consigne: "Chacun verse 1&nbsp;000&nbsp;€, on lui promet 10 % par mois. Faites avancer les mois jusqu'au bout.",
        el: <PyramidePonzi />,
      },
      {
        t: "qr", items: [
          { q: "Mais des gens sont vraiment payés ?", r: "Oui, au début, et c'est ce qui rend la pyramide si efficace : les premiers reçoivent de l'argent réel, le racontent avec sincérité, et deviennent la meilleure publicité de l'escroc. Ils ne savent pas que cet argent vient des nouveaux." },
          { q: "Comment la reconnaître ?", r: "Un rendement régulier et élevé, qui ne baisse jamais, quel que soit le marché ; une façon de gagner floue (« un robot », « un algorithme secret ») ; et souvent une récompense pour faire venir des proches. Un vrai placement a des mois négatifs." },
          { q: "Et si je retire mes gains à temps ?", r: "Personne ne sait quand la pyramide tombera, et l'argent retiré est celui d'autres victimes. Dans les faits, les retraits sont souvent bloqués dès qu'ils deviennent importants, avec des excuses (« frais », « vérification »)." },
        ],
      },
      { t: "h", texte: "Avant de confier un euro : vérifier" },
      { t: "p", html: "En France, deux vérifications prennent deux minutes et évitent la plupart des arnaques. Cherchez le nom du site ou de la société sur les pages officielles, sans passer par un lien reçu par message :" },
      {
        t: "liste", items: [
          "<b>La liste noire de l'Autorité des marchés financiers (AMF)</b>, le gendarme de la bourse en France. Elle publie les sites et les sociétés qui proposent des placements <b>sans y être autorisés</b>. Si le nom y est, n'allez pas plus loin.",
          "<b>Le registre Regafi</b>, tenu par l'Autorité de contrôle prudentiel et de résolution (ACPR), rattachée à la Banque de France. Il dit <b>qui a le droit d'exercer</b> (banques, prestataires de services d'investissement…). Si le nom n'y est pas, cette société n'a pas le droit de gérer votre argent.",
        ],
      },
      { t: "p", html: "Attention : une absence de la liste noire ne prouve rien, les escrocs changent de nom tous les mois. C'est la <b>présence dans le registre officiel</b> qui compte. Et méfiez-vous des sites qui imitent le nom d'une vraie société agréée : vérifiez l'adresse exacte du site." },
      { t: "h", texte: "Ne jamais donner ses codes, ni payer pour « récupérer »" },
      { t: "p", html: "Deux règles sans exception. <b>Ne donnez jamais vos codes</b> (identifiants, mots de passe, codes reçus par SMS) à qui que ce soit : votre banque ne vous les demandera jamais, un courtier non plus. Et <b>ne confiez pas votre argent à un inconnu</b>, même s'il promet de récupérer ce que vous avez perdu." },
      { t: "p", html: "Ce dernier cas est fréquent : quelques semaines après une première arnaque, un « cabinet de récupération » ou un « avocat » vous contacte et promet de récupérer vos fonds, contre des frais payés d'avance. <b>C'est souvent la deuxième arnaque</b>, parfois par les mêmes escrocs. Si vous êtes victime, portez plainte, prévenez votre banque au plus vite, et signalez-le aux autorités." },
      { t: "piege", html: "<b>Se croire trop malin pour tomber dans le piège.</b> Les victimes ne sont pas naïves : ce sont souvent des gens instruits, à qui l'on a parlé au bon moment, avec patience, parfois pendant des semaines. L'escroc construit une relation de confiance avant de parler d'argent. La seule protection fiable, c'est la règle : jamais d'argent ni de codes à un inconnu, et toujours vérifier dans le registre officiel." },
      { t: "h", texte: "Le vrai trading est lent" },
      { t: "p", html: "La meilleure défense contre les arnaques, c'est de savoir à quoi ressemble le vrai trading. Il est <b>lent</b> : un plan écrit (leçon 24), des tests sur le passé (leçon 26), des semaines en démo (leçon 23), un petit risque par trade (leçon 19). Et <b>des pertes</b>, aussi, régulières et prévues. La plupart des particuliers qui tradent des CFD perdent de l'argent. Quiconque vous promet le contraire vous ment." },
      { t: "nimbo", texte: "Ici, tout est fictif, et c'est voulu : vous apprenez avec de l'argent qui n'existe pas. Je ne vous demanderai jamais d'argent, de codes, ni de passer par un courtier.", humeur: "prudent" },
    ],
  }],
  mots: [
    { terme: "Arnaque", en: "scam", def: "Une escroquerie qui promet de l'argent facile pour prendre le vôtre." },
    { terme: "Pyramide de Ponzi", en: "Ponzi scheme", def: "Une fausse promesse de rendement où les premiers sont payés avec l'argent des nouveaux ; elle s'effondre quand les nouveaux n'arrivent plus." },
    { terme: "Gain garanti", en: "guaranteed returns", def: "La promesse qui trahit l'arnaque : en trading, rien n'est garanti." },
    { terme: "Liste noire de l'AMF", en: "AMF blacklist", def: "La liste, publiée par l'Autorité des marchés financiers, des sites et sociétés qui proposent des placements sans autorisation." },
    { terme: "Regafi", en: "Regafi register", def: "Le registre officiel, tenu par l'ACPR (Banque de France), des sociétés qui ont le droit d'exercer." },
    { terme: "Arnaque à la récupération", en: "recovery scam", def: "La deuxième arnaque : on promet aux victimes de récupérer leur argent contre des frais payés d'avance." },
  ],
  retenir: [
    "Quatre signes : <b>des gains garantis</b>, <b>de fausses preuves</b>, <b>l'urgence</b>, <b>un inconnu en privé</b> qui veut placer votre argent.",
    "10 % par semaine, ce serait <b>plus de 140 fois la mise en un an</b> : impossible, donc mensonger.",
    "Une capture se truque en une minute, une voiture se loue : <b>ce ne sont pas des preuves</b>.",
    "La <b>pyramide de Ponzi</b> paie les premiers avec l'argent des nouveaux, et <b>s'effondre</b> quand ils n'arrivent plus.",
    "Avant de confier un euro : la <b>liste noire de l'AMF</b> et le <b>registre Regafi</b>.",
    "<b>Jamais vos codes</b>, jamais d'argent à un inconnu, même pour « récupérer » une perte. Le vrai trading est lent, et il a des pertes.",
  ],
  quiz: [
    { question: "Une publicité promet « 10 % par semaine, garanti ». Que vaut cette promesse ?", options: ["Elle est crédible si la personne montre ses gains", "C'est un signe d'arnaque : rien n'est garanti, et ce serait plus de 140 fois la mise en un an", "C'est un bon rendement, mais risqué"], correct: 1, explanation: "Aucun trader ne peut garantir un gain. Et 1,1 multiplié par lui-même 52 fois donne plus de 142 : une promesse impossible." },
    { question: "Un trader montre une capture de compte à +18 000 $ et une voiture de luxe. Qu'est-ce que ça prouve ?", options: ["Qu'il gagne beaucoup", "Rien : une capture se truque et une voiture se loue", "Que sa méthode marche pour tout le monde"], correct: 1, explanation: "Les fausses preuves sont le deuxième signe. Une capture peut venir d'un compte démo ou être retouchée en une minute." },
    { question: "Dans une pyramide de Ponzi, avec quel argent les premiers sont-ils payés ?", options: ["Avec les gains du trading", "Avec l'argent des nouveaux", "Avec l'argent de l'État"], correct: 1, explanation: "Il n'y a aucun investissement réel. Quand les nouveaux n'arrivent plus, la caisse ne peut plus payer, et tout s'effondre." },
    { question: "Où vérifier qu'une société a le droit de gérer votre argent en France ?", options: ["Dans les commentaires sous ses vidéos", "Dans le registre Regafi et sur la liste noire de l'AMF", "Sur son propre site"], correct: 1, explanation: "Le registre Regafi dit qui a le droit d'exercer ; la liste noire de l'AMF signale les sites non autorisés. Les avis et le site de la société ne prouvent rien." },
    { question: "Après une arnaque, un cabinet propose de récupérer votre argent contre 490 € de frais. Que faire ?", options: ["Payer vite, avant que le dossier soit clos", "Refuser : c'est souvent la deuxième arnaque ; porter plainte et prévenir sa banque", "Lui donner vos codes pour qu'il suive l'argent"], correct: 1, explanation: "Les arnaques à la récupération visent les victimes de la première. Ne payez rien d'avance, ne donnez jamais vos codes." },
  ],
  pratique: [
    { texte: "Entraînez-vous sans risque, en argent fictif : vous verrez à quoi ressemblent de vrais résultats, pertes comprises.", href: "/trading", bouton: "Trader en fictif" },
    { texte: "Relisez les mots à retenir pour reconnaître le vocabulaire des escrocs.", href: "/learn/glossaire", bouton: "Ouvrir le glossaire" },
  ],
};

export default lecon;
