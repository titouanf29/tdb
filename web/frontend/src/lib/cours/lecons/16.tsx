import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { PiegeShort, SpreadVivant } from "@/components/cours/outils/SpreadVivant";

// L'euro-dollar autour de 1,1000, vu de très près (quelques pips).
const pres = serie([[0, 1.0997], [6, 1.0999], [12, 1.0996], [18, 1.1], [24, 1.0998], [30, 1.1], [36, 1.1003], [42, 1.1008]], { graine: 161, bruit: 0.0001, meche: 0.8 });
const IA = 30; // l'achat

const lecon: LeconSerie = {
  numero: 16,
  accroche: "Vous ouvrez un trade… et vous êtes déjà en perte. Pourquoi ?",
  promesse: "À la fin de cette leçon, vous saurez lire le bid et l'ask, ce que vous coûte le spread, quand il s'élargit, pourquoi il peut faire sauter le stop d'un short, et comment en payer moins.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Un prix sur le graphique, deux sur la plateforme" },
      { t: "p", html: "Sur le graphique, vous voyez un seul prix. Sur la plateforme, au moment de cliquer, il y en a <b>deux</b>. Le <span class=\"mot\">bid</span> est le prix auquel vous pouvez <b>vendre</b>. L'<span class=\"mot\">ask</span> est le prix auquel vous pouvez <b>acheter</b>, un peu plus haut. Les deux bougent ensemble, en permanence." },
      { t: "p", html: "Pourquoi deux prix ? Parce que, en face de vous, quelqu'un (le courtier, ou un grand intermédiaire qu'on appelle teneur de marché) est prêt à vous acheter un peu moins cher et à vous vendre un peu plus cher. C'est ainsi qu'il est payé. Le graphique, lui, montre en général <b>le bid</b>." },
      { t: "p", html: "L'écart entre les deux, c'est le <span class=\"mot\">spread</span>. Ce n'est pas un détail d'affichage : c'est <b>un coût, que vous payez à chaque trade</b>, gagnant ou perdant." },
      {
        t: "outil",
        titre: "Le bid et l'ask, en direct",
        consigne: "Choisissez un moment de la journée et regardez l'écart vivre. Puis réglez le nombre de trades par jour : c'est l'addition.",
        el: <SpreadVivant />,
      },

      { t: "h", texte: "Un trade démarre toujours en perte" },
      { t: "p", html: "Vous achetez à l'ask. Mais votre position se compte au prix auquel vous pourriez la revendre tout de suite : le bid, plus bas. <b>Dès l'ouverture, vous êtes en perte du spread.</b> Pour revenir à zéro, le prix doit d'abord monter de ce spread : c'est votre <span class=\"mot\">seuil de rentabilité</span> (<em>break-even</em>)." },
      {
        t: "scenes",
        titre: "Acheté à l'ask, compté au bid",
        scenes: [
          { legende: "Le graphique affiche <b>1,1000</b> : c'est le bid.", cfg: { bougies: pres, jusqua: IA, unite: "minute" } },
          { legende: "La plateforme propose d'acheter à <b>1,1001</b> : l'ask, 1 pip plus haut. Ce pip, c'est le spread.", cfg: { bougies: pres, jusqua: IA, niveaux: [{ prix: 1.1001, label: "Ask 1,1001 : pour acheter", couleur: "var(--cap-up)" }, { prix: 1.1, label: "Bid 1,1000 : pour vendre", couleur: "var(--cap-down)" }], unite: "minute" } },
          { legende: "Vous achetez à 1,1001. Votre position vaut ce que vous en tireriez en revendant, au bid : 1,1000. Avec 0,10 lot, vous êtes à <b>moins 1 $</b>.", cfg: { bougies: pres, jusqua: IA, niveaux: [{ prix: 1.1001, label: "Votre achat 1,1001", couleur: "var(--cap-up)" }, { prix: 1.1, label: "Bid 1,1000", couleur: "var(--cap-down)" }], marques: [{ i: IA, type: "achat", prix: 1.1, label: "Acheté" }], unite: "minute" } },
          { legende: "Le bid doit monter jusqu'à <b>1,1001</b> pour que vous soyez à zéro : c'est le seuil de rentabilité. Au-delà seulement, vous gagnez.", cfg: { bougies: pres, niveaux: [{ prix: 1.1001, label: "Seuil de rentabilité 1,1001", couleur: "var(--cap-ink)" }], marques: [{ i: IA, type: "achat", prix: 1.1 }], unite: "minute" } },
        ],
      },
      { t: "exemple", html: "Un spread de <b>1 pip</b> sur l'euro-dollar, 0,10 lot (1 $ par pip, leçon 17). Chaque trade coûte <b>1 $</b> d'entrée de jeu. Si vous visez 20 pips, le prix doit en faire 21 pour vous rapporter 20 $. À la vente, c'est pareil : vous vendez au bid, et vous rachèterez à l'ask." },

      { t: "h", texte: "Le spread n'est pas fixe" },
      { t: "p", html: "Le spread dépend du nombre de gens qui échangent à ce moment-là. Beaucoup d'acheteurs et de vendeurs : les prix se serrent. Peu de monde : l'écart s'ouvre." },
      {
        t: "tableau",
        entetes: ["Le moment", "Le spread (ordre d'idée, euro-dollar)", "Pourquoi"],
        lignes: [
          ["Londres et New York ouverts (en France, de 14 h à 17 h 30 environ)", "Serré, autour de 1 pip", "Le plus de monde de la journée"],
          ["La nuit en Europe", "Plus large, 2 à 3 pips", "Peu d'échanges sur l'euro"],
          ["L'ouverture du lundi (dimanche soir en France)", "Large, parfois 5 pips et plus", "Les premiers échanges après le week-end"],
          ["Une annonce forte (emploi américain, taux)", "Très large, imprévisible", "Les intermédiaires se protègent"],
        ],
        legende: "Des ordres d'idée pour un compte de particulier : chaque courtier a ses propres spreads, à lire sur la plateforme.",
      },

      { t: "h", texte: "Le piège du short" },
      { t: "p", html: "Rappel de la leçon 15 : un short, c'est vendre d'abord et racheter plus tard. Vous vendez au bid, et vous <b>rachetez à l'ask</b>. Le stop loss d'un short se déclenche donc quand <b>l'ask</b> touche son niveau." },
      { t: "p", html: "Or le graphique montre le bid. Si le spread s'élargit d'un coup, l'ask peut toucher votre stop <b>sans que le graphique y soit monté</b>. Vous voyez le prix sous votre stop, et pourtant votre position est fermée." },
      {
        t: "outil",
        titre: "Le stop touché par l'ask",
        consigne: "Un short vendu à 1,1000, stop loss à 1,1020. Réglez la largeur du spread pendant l'annonce, et comparez le graphique (le bid) et l'ask.",
        el: <PiegeShort />,
      },
      { t: "piege", html: "<b>Placer le stop d'un short pile au-dessus d'un sommet du graphique.</b> Le graphique est le bid : l'ask, lui, monte plus haut, d'un spread, et de beaucoup plus pendant une annonce. Laissez de la marge au-dessus du sommet, et évitez de garder un short serré au moment d'une annonce forte." },

      { t: "h", texte: "En payer moins" },
      {
        t: "liste", items: [
          "<b>Tradez aux heures actives</b> : quand Londres et New York sont ouverts, le spread est le plus serré.",
          "<b>Évitez les minutes autour d'une annonce</b> : le spread s'y élargit et les prix sautent. L'agenda économique vous dit quand elles tombent.",
          "<b>Regardez le spread avant de cliquer</b> : l'écart entre le bid et l'ask est affiché sur la plateforme. S'il est anormalement large, attendez.",
        ],
      },
      { t: "h", texte: "Plus de trades, plus de spread" },
      { t: "p", html: "Le spread se paie à chaque trade. Celui qui ouvre et ferme des dizaines de positions par jour pour quelques pips, le <span class=\"mot\">scalping</span>, le paie des dizaines de fois. Viser 5 pips avec 1 pip de spread, c'est laisser <b>un cinquième</b> de chaque gain en frais." },
      { t: "exemple", html: "Un compte de <b>2 000 $</b>, 0,10 lot, 1 pip de spread : <b>1 $ par trade</b>. À 20 trades par jour, c'est <b>20 $ par jour</b>, et <b>400 $ sur un mois</b> de 20 jours de bourse : 20 % du compte, perdus avant d'avoir gagné quoi que ce soit." },
      { t: "qr", items: [
        { q: "Un courtier « sans commission » est-il gratuit ?", r: "Non. Il se paie dans le spread. Un spread plus large remplace la commission : vous payez quand même, simplement c'est moins visible." },
        { q: "Pourquoi l'or ou les cryptos ont-ils un spread plus large ?", r: "Le spread se mesure en prix : quelques dizaines de centimes sur l'or, parfois bien plus sur une crypto. Ce qui compte, c'est son poids par rapport au mouvement que vous visez." },
        { q: "Le spread compte-t-il si je garde mes trades longtemps ?", r: "Il pèse moins : payé une fois, il est petit à côté d'un mouvement de 100 pips. Mais garder une position la nuit a d'autres frais, que la leçon 21 détaille." },
      ] },
      { t: "nimbo", texte: "L'Agenda macro du site liste les annonces de la semaine, avec leur heure. Jetez-y un œil avant d'ouvrir une position : c'est là que le spread s'envole.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Bid", en: "bid", def: "Le prix auquel vous pouvez vendre, le plus bas des deux. C'est souvent lui que montre le graphique." },
    { terme: "Ask", en: "ask, offer", def: "Le prix auquel vous pouvez acheter, un peu au-dessus du bid." },
    { terme: "Spread", en: "spread", def: "L'écart entre le bid et l'ask : un coût payé à chaque trade." },
    { terme: "Seuil de rentabilité", en: "break-even", def: "Le prix où un trade revient à zéro, spread compris." },
    { terme: "Scalping", en: "scalping", def: "Multiplier les trades très courts pour quelques pips : le spread s'y paie sans cesse." },
  ],
  retenir: [
    "Deux prix : le <b>bid</b> pour vendre, l'<b>ask</b> pour acheter, un peu plus haut. Le graphique montre le bid.",
    "Leur écart, le <b>spread</b>, est un coût payé à chaque trade.",
    "Acheté à l'ask, compté au bid : <b>un trade démarre en perte</b>, et le prix doit d'abord couvrir le spread (le break-even).",
    "Le spread est <b>serré</b> aux heures actives, <b>large</b> la nuit, à l'ouverture du lundi et pendant les annonces.",
    "Un short se rachète à l'ask : son stop peut sauter <b>sans que le graphique l'ait touché</b>.",
    "Plus de trades, plus de spread : c'est le piège du scalping.",
  ],
  quiz: [
    { question: "Vous voulez acheter. À quel prix êtes-vous servi ?", options: ["Au bid", "À l'ask", "Au milieu des deux"], correct: 1, explanation: "On achète à l'ask, le plus haut des deux prix, et on vend au bid. L'écart est le spread." },
    { question: "Bid 1,1000, ask 1,1002, 0,10 lot (1 $ par pip). Vous achetez. Où en êtes-vous à l'ouverture ?", options: ["À zéro", "En perte de 2 $", "En gain de 2 $"], correct: 1, explanation: "Acheté à 1,1002, revendable à 1,1000 : 2 pips de spread, soit 2 $ de perte dès le départ." },
    { question: "Quand le spread est-il le plus serré ?", options: ["La nuit", "À l'ouverture du lundi", "Quand Londres et New York sont ouverts"], correct: 2, explanation: "C'est le moment où le plus de monde échange : les prix d'achat et de vente se serrent." },
    { question: "Votre short a été fermé à son stop, mais le graphique n'y est jamais monté. Pourquoi ?", options: ["Un bug de la plateforme", "Le spread s'est élargi : l'ask a touché le stop", "Le take profit a été touché"], correct: 1, explanation: "Un short se rachète à l'ask. Le graphique montre le bid : si l'écart s'ouvre, l'ask peut toucher le stop alors que le bid reste dessous." },
    { question: "Pourquoi le scalping est-il pénalisé par le spread ?", options: ["Parce qu'il paie le spread à chaque trade, très souvent, pour de petits gains", "Parce que le spread est interdit en scalping", "Parce qu'il n'y a pas de spread"], correct: 0, explanation: "Viser quelques pips en payant un pip à chaque fois, des dizaines de fois par jour : le spread mange une grosse part des gains." },
  ],
  pratique: [
    { texte: "Repérez les annonces de la semaine et leur heure, pour éviter les spreads qui s'envolent.", href: "/macro", bouton: "Ouvrir l'agenda" },
    { texte: "Retrouvez le bid, l'ask, le spread et le scalping dans le glossaire.", href: "/learn/glossaire", bouton: "Ouvrir le glossaire" },
  ],
};

export default lecon;
