import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { SimulateurOrdres } from "@/components/cours/outils/SimulateurOrdres";
import { Situations } from "@/components/cours/outils/ElementsOrdres";

// L'euro-dollar autour de 1,1000 (les prix d'exemple communs aux leçons).
const repli = serie([[0, 1.1012], [4, 1.1006], [8, 1.1], [13, 1.0991], [18, 1.098, "bas"], [25, 1.0998], [33, 1.1016], [40, 1.1023]], { graine: 141, bruit: 0.0005 });
const attente = serie([[0, 1.1012], [8, 1.1], [14, 1.099, "bas"], [22, 1.101], [30, 1.103], [40, 1.1046]], { graine: 142, bruit: 0.0005 });
const cassure = serie([[0, 1.099], [6, 1.1018, "haut"], [12, 1.0998], [18, 1.1019, "haut"], [23, 1.1003], [27, 1.1014], [31, 1.1034], [38, 1.1049], [44, 1.1058]], { graine: 143, bruit: 0.0005 });

const toucheTp = repli.findIndex((b, i) => i > 18 && b.h >= 1.102);

const situations = [
  { situation: "Une annonce vient de tomber, le prix part. Vous voulez <b>être dedans tout de suite</b>, quel que soit le prix exact.", options: ["Au marché", "Buy limit", "Buy stop"], correct: 0, pourquoi: "Pressé : au marché. Vous êtes servi aussitôt, mais au prix du moment, spread compris, et peut-être avec un peu de slippage." },
  { situation: "L'euro-dollar est à 1,1000. Vous aimeriez acheter, mais <b>moins cher, à 1,0980</b>, sur un support.", options: ["Buy stop à 1,0980", "Buy limit à 1,0980", "Au marché"], correct: 1, pourquoi: "Acheter sous le prix actuel, à votre prix ou mieux : c'est un buy limit. S'il n'y descend jamais, l'ordre ne passe pas." },
  { situation: "Le prix bute depuis des jours sous 1,1020. Vous voulez acheter <b>seulement s'il casse</b> ce plafond.", options: ["Buy limit à 1,1025", "Buy stop à 1,1025", "Sell limit à 1,1025"], correct: 1, pourquoi: "Acheter au-dessus du prix, quand il franchit un niveau : c'est un buy stop. Il se déclenche à 1,1025 et part au marché." },
  { situation: "Vous avez acheté à 1,1000. Vous voulez <b>couper la perte</b> si le prix descend à 1,0980.", options: ["Un take profit à 1,0980", "Un stop loss à 1,0980", "Un buy limit à 1,0980"], correct: 1, pourquoi: "Le stop loss est un ordre stop qui vend sous votre achat (un sell stop). Un buy limit, lui, vous ferait acheter une seconde fois." },
  { situation: "Vous avez acheté à 1,1000. Vous voulez <b>encaisser le gain</b> automatiquement à 1,1040.", options: ["Un take profit à 1,1040", "Un buy stop à 1,1040", "Un stop loss à 1,1040"], correct: 0, pourquoi: "Le take profit est un ordre limite qui vend au-dessus (un sell limit) : il ferme le trade à votre objectif, ou mieux." },
  { situation: "Vous placez un buy limit à 1,0980. Le prix descend à 1,0983, puis remonte à 1,1050. Que s'est-il passé ?", options: ["Vous avez acheté à 1,0983", "L'ordre n'est pas passé : il attend toujours", "Vous avez acheté à 1,0980"], correct: 1, pourquoi: "Il manquait 3 pips. Un ordre limite ne passe qu'à son prix ou mieux : le prix n'y est pas venu, l'ordre reste en attente. Vous avez raté la hausse, mais vous n'avez rien perdu." },
];

const lecon: LeconSerie = {
  numero: 14,
  accroche: "Acheter tout de suite, ou attendre votre prix ? Tout dépend de l'ordre que vous choisissez.",
  promesse: "À la fin de cette leçon, vous saurez ce que fait chaque ordre (au marché, à cours limité, stop), comment il se déclenche, et lequel choisir selon ce que vous voulez.",
  parties: [{
    titre: "",
    blocs: [
      { t: "p", html: "Un <span class=\"mot\">ordre</span>, c'est l'instruction que vous donnez à la plateforme : acheter ou vendre, combien, et <b>à quelle condition</b>. Il en existe trois familles. Elles ne disent pas la même chose : « maintenant », « à mon prix ou mieux », ou « si le prix touche ce niveau ». Tous nos exemples sont sur l'euro-dollar, à <b>1,1000</b>." },

      { t: "h", texte: "L'ordre au marché : tout de suite" },
      { t: "p", html: "L'<span class=\"mot\">ordre au marché</span> (<em>market order</em>) achète ou vend <b>immédiatement, au prix du moment</b>. Vous cliquez, c'est fait. C'est le plus simple et le plus rapide." },
      { t: "p", html: "Il a deux coûts. D'abord, vous achetez au prix de la vente, un peu plus haut que le prix affiché sur le graphique : c'est le <span class=\"mot\">spread</span>, l'écart entre les deux prix (leçon 16). Ensuite, quand le marché va très vite, le prix peut bouger entre votre clic et l'exécution : vous êtes servi un peu plus loin. Ce glissement s'appelle le <span class=\"mot\">slippage</span>." },
      { t: "exemple", html: "Le graphique affiche <b>1,1000</b>. Vous achetez au marché et vous êtes servi à <b>1,1001</b> : 1 pip de spread. Avec 0,10 lot, un pip vaut 1 $ : ce trade démarre à <b>moins 1 $</b>. Un jour d'annonce, le même clic peut vous servir à 1,1004 : 3 pips de slippage en plus." },

      { t: "h", texte: "L'ordre à cours limité : votre prix, ou mieux" },
      { t: "p", html: "L'<span class=\"mot\">ordre à cours limité</span> (<em>limit order</em>) fixe un prix. Il ne passe <b>qu'à ce prix, ou à un meilleur</b>. Pour acheter, « meilleur » veut dire moins cher : on le place donc <b>sous le prix actuel</b>. C'est le <span class=\"mot\">buy limit</span>. Vous attendez que le prix redescende vers vous." },
      {
        t: "scenes",
        titre: "Un buy limit à 1,0980",
        scenes: [
          { legende: "Le prix est à 1,1000. Vous pensez qu'il va d'abord reculer vers 1,0980 : vous y placez un <b>buy limit</b>. Rien ne se passe pour l'instant : l'ordre attend.", cfg: { bougies: repli, jusqua: 8, niveaux: [{ prix: 1.098, label: "Buy limit 1,0980", couleur: "var(--cap-ink)" }], unite: "heure" } },
          { legende: "Le prix descend et touche 1,0980 : l'ordre passe, <b>à votre prix</b>. Vous êtes acheteur.", cfg: { bougies: repli, jusqua: 18, niveaux: [{ prix: 1.098, label: "Buy limit 1,0980", couleur: "var(--cap-ink)" }], marques: [{ i: 18, type: "achat", prix: 1.098, label: "Acheté" }], unite: "heure" } },
          { legende: "Puis il remonte. Vous avez acheté 20 pips moins cher qu'au marché. Mais rien ne garantissait ce recul.", cfg: { bougies: repli, niveaux: [{ prix: 1.098, label: "Entrée 1,0980", couleur: "var(--cap-ink)" }], marques: [{ i: 18, type: "achat", prix: 1.098 }], unite: "heure" } },
        ],
      },
      { t: "p", html: "Le revers : <b>si le prix n'y vient jamais, l'ordre ne passe jamais</b>. Il reste là, en attente. C'est pour ça qu'on parle d'<span class=\"mot\">ordre en attente</span> (<em>pending order</em>) : un ordre posé, qui attend sa condition." },
      {
        t: "graphique",
        cfg: { bougies: attente, niveaux: [{ prix: 1.098, label: "Buy limit 1,0980, jamais touché", couleur: "var(--cap-ink-3)" }], marques: [{ i: 14, type: "point" }], unite: "heure" },
        legende: "Le prix descend jusqu'à 1,0990, à 10 pips de l'ordre, puis s'envole. Le buy limit n'est jamais passé : pas de perte, mais la hausse s'est faite sans vous.",
      },

      { t: "h", texte: "L'ordre stop : il attend un niveau, puis part au marché" },
      { t: "p", html: "L'<span class=\"mot\">ordre stop</span> (<em>stop order</em>) fonctionne à l'envers. Il ne promet pas un prix : il attend que le prix <b>touche un niveau</b>. À ce moment, il se déclenche et devient un <b>ordre au marché</b>. Il passe donc au prix du moment, juste après le niveau, avec un éventuel slippage." },
      { t: "p", html: "Pour acheter, on le place <b>au-dessus du prix actuel</b> : c'est le <span class=\"mot\">buy stop</span>. Pourquoi acheter plus cher ? Pour n'acheter <b>que si le prix casse un plafond</b>, et prouve ainsi sa force. C'est l'ordre des cassures (leçon 30)." },
      {
        t: "scenes",
        titre: "Un buy stop au-dessus d'une résistance",
        scenes: [
          { legende: "Deux fois, le prix bute sous 1,1020. Vous ne voulez acheter que s'il passe au-dessus : vous placez un <b>buy stop</b> à 1,1025, un peu au-delà.", cfg: { bougies: cassure, jusqua: 26, niveaux: [{ prix: 1.102, label: "Résistance", couleur: "var(--cap-down)" }, { prix: 1.1025, label: "Buy stop 1,1025", couleur: "var(--cap-ink)" }], unite: "heure" } },
          { legende: "Le prix franchit 1,1025 : l'ordre se <b>déclenche</b> et achète au marché.", cfg: { bougies: cassure, jusqua: 31, niveaux: [{ prix: 1.102, label: "Résistance", couleur: "var(--cap-down)" }, { prix: 1.1025, label: "Buy stop 1,1025", couleur: "var(--cap-ink)" }], marques: [{ i: 30, type: "achat", prix: 1.1025, label: "Déclenché" }], unite: "heure" } },
          { legende: "La cassure tient, et le prix continue. Si elle avait échoué, l'ordre aurait acheté quand même : un stop ne juge pas, il exécute.", cfg: { bougies: cassure, niveaux: [{ prix: 1.102, label: "Résistance", couleur: "var(--cap-down)" }, { prix: 1.1025, label: "Entrée 1,1025", couleur: "var(--cap-ink)" }], marques: [{ i: 30, type: "achat", prix: 1.1025 }], unite: "heure" } },
        ],
      },
      { t: "exemple", titre: "Le slippage d'un ordre stop", html: "Votre buy stop est à <b>1,1025</b>. Le prix passe de 1,1022 à 1,1028 en une seconde, sur une annonce. L'ordre se déclenche, part au marché, et vous êtes servi à <b>1,1028</b> : 3 pips de slippage, soit 3 $ avec 0,10 lot. Un ordre limite, lui, n'aurait jamais acheté plus cher que son prix." },

      { t: "h", texte: "Le stop loss et le take profit sont des ordres" },
      { t: "p", html: "Les deux ordres que vous poserez le plus souvent sont des ordres de sortie. Une fois acheteur, vous voulez revendre, soit pour couper une perte, soit pour encaisser un gain." },
      {
        t: "liste", items: [
          "Le <span class=\"mot\">stop loss</span> est un <b>ordre stop qui vend sous votre achat</b> (un <em>sell stop</em>). Si le prix descend jusqu'à lui, il se déclenche et vend au marché : la perte est coupée.",
          "Le <span class=\"mot\">take profit</span> est un <b>ordre limite qui vend au-dessus</b> (un <em>sell limit</em>). Si le prix monte jusqu'à lui, il vend à votre objectif, ou mieux.",
          "Ils vont ensemble : <b>quand l'un passe, la plateforme annule l'autre</b>. Votre position est fermée une seule fois.",
        ],
      },
      {
        t: "graphique",
        cfg: { bougies: repli, niveaux: [{ prix: 1.102, label: "Take profit 1,1020 (sell limit)", couleur: "var(--cap-up)" }, { prix: 1.098, label: "Entrée 1,0980", couleur: "var(--cap-ink)" }, { prix: 1.096, label: "Stop loss 1,0960 (sell stop)", couleur: "var(--cap-down)" }], marques: [{ i: 18, type: "achat", prix: 1.098 }, { i: toucheTp, type: "point", prix: 1.102 }], unite: "heure" },
        legende: "Acheté à 1,0980, stop loss 20 pips dessous, take profit 40 pips dessus. Le prix atteint 1,1020 : le take profit vend, le stop loss est annulé.",
      },
      { t: "exemple", html: "Un compte de <b>2 000 $</b>, 0,10 lot (1 $ par pip). Buy limit à 1,0980, stop loss à 1,0960, take profit à 1,1020. Si le stop passe : 20 pips, soit <b>20 $ de perte, 1 % du compte</b>. Si le take profit passe : 40 pips, soit <b>40 $ de gain</b>. Le gain visé vaut deux fois le risque (leçon 7)." },
      { t: "piege", html: "<b>Croire que le stop loss garantit le prix.</b> C'est un ordre stop : déclenché, il part au marché. Si le prix saute par-dessus (une annonce, l'ouverture du lundi), vous sortez plus loin que prévu. Le stop limite la perte, il ne la fixe pas au pip près. La leçon 22 y revient." },

      { t: "h", texte: "Les quatre ordres en attente, d'un coup d'œil" },
      { t: "p", html: "Pour vendre, tout se retourne. Le <em>sell limit</em> vend plus cher que le prix actuel, le <em>sell stop</em> vend si le prix casse vers le bas. Vendre pour ouvrir une position, c'est le short : c'est la leçon 15." },
      {
        t: "tableau",
        entetes: ["L'ordre", "Où on le place", "Il passe…", "À quoi il sert"],
        lignes: [
          ["<b>Buy limit</b>", "Sous le prix", "à son prix ou moins cher", "Acheter sur un recul, sur un support"],
          ["<b>Buy stop</b>", "Au-dessus du prix", "au marché, une fois le niveau touché", "Acheter une cassure vers le haut"],
          ["<b>Sell limit</b>", "Au-dessus du prix", "à son prix ou plus cher", "Le take profit d'un achat ; vendre sur une résistance"],
          ["<b>Sell stop</b>", "Sous le prix", "au marché, une fois le niveau touché", "Le stop loss d'un achat ; vendre une cassure vers le bas"],
        ],
        legende: "Limite : votre prix ou mieux, et peut-être jamais. Stop : déclenché au niveau, puis au marché, sans garantie de prix.",
      },

      { t: "h", texte: "Essayez : placez un ordre et lancez le prix" },
      {
        t: "outil",
        titre: "Le simulateur d'ordres",
        consigne: "Choisissez un ordre d'achat, réglez le stop loss et le take profit, puis lancez le prix. Essayez le même ordre sur plusieurs trajets : le journal dit ce qui se déclenche, à quel prix, et pourquoi.",
        el: <SimulateurOrdres />,
      },
      { t: "qr", items: [
        { q: "Un ordre en attente peut-il rester là des jours ?", r: "Oui, tant que vous ne l'annulez pas, ou jusqu'à la date que vous avez fixée. Pensez à le relire : un buy limit oublié peut passer une semaine plus tard, quand votre idée ne tient plus." },
        { q: "Pourquoi mon ordre limite n'est pas passé alors que le prix est venu tout près ?", r: "Parce qu'il doit atteindre votre prix. À un pip près, c'est non. C'est la règle : votre prix ou mieux, jamais un peu moins bien." },
        { q: "Buy limit ou buy stop, je les confonds.", r: "Regardez où est le prix. Sous le prix, pour acheter moins cher : limit. Au-dessus du prix, pour acheter une cassure : stop. Une plateforme refuse d'ailleurs souvent un buy limit placé au-dessus du prix." },
      ] },

      { t: "h", texte: "Lequel choisir ?" },
      {
        t: "liste", items: [
          "<b>Pressé</b> : au marché. Vous êtes servi tout de suite, et vous payez le spread, parfois du slippage.",
          "<b>Un meilleur prix</b> : à cours limité. Vous choisissez votre prix, et vous acceptez que l'ordre ne passe peut-être jamais.",
          "<b>Une cassure, ou vous protéger</b> : un stop. Il se déclenche à un niveau, et part au marché.",
        ],
      },
      {
        t: "outil",
        titre: "Quel ordre pour quelle situation ?",
        consigne: "Six situations. Choisissez l'ordre qui convient, puis lisez l'explication.",
        el: <Situations items={situations} />,
      },
      { t: "nimbo", texte: "Sur la page Trading, chaque position fictive peut porter un stop loss et un take profit. Posez-les avant de cliquer : c'est la meilleure habitude à prendre.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Ordre au marché", en: "market order", def: "Acheter ou vendre tout de suite, au prix du moment." },
    { terme: "Ordre à cours limité", en: "limit order", def: "Un ordre qui ne passe qu'à son prix, ou à un meilleur prix." },
    { terme: "Ordre stop", en: "stop order", def: "Un ordre qui attend que le prix touche un niveau, puis part au marché." },
    { terme: "Buy limit, sell limit", en: "buy limit, sell limit", def: "Acheter sous le prix actuel, ou vendre au-dessus, à son prix ou mieux." },
    { terme: "Buy stop, sell stop", en: "buy stop, sell stop", def: "Acheter si le prix monte jusqu'au niveau, ou vendre s'il y descend." },
    { terme: "Stop loss", en: "stop loss", def: "L'ordre stop qui ferme une position perdante à un niveau fixé à l'avance." },
    { terme: "Take profit", en: "take profit", def: "L'ordre limite qui ferme une position gagnante à son objectif." },
    { terme: "Glissement", en: "slippage", def: "L'écart entre le prix voulu et le prix obtenu, quand le marché va vite." },
    { terme: "Ordre en attente", en: "pending order", def: "Un ordre posé qui n'est pas encore passé, parce que sa condition n'est pas remplie." },
  ],
  retenir: [
    "<b>Au marché</b> : tout de suite, au prix du moment. Rapide, mais vous payez le spread, et parfois du slippage.",
    "<b>À cours limité</b> : votre prix ou mieux. Le <b>buy limit</b> se place sous le prix ; si le prix n'y vient jamais, il ne passe pas.",
    "<b>Stop</b> : il attend un niveau, se déclenche, puis part au marché. Le <b>buy stop</b> se place au-dessus, pour acheter une cassure.",
    "Le <b>stop loss</b> est un sell stop sous l'achat, le <b>take profit</b> un sell limit au-dessus : quand l'un passe, l'autre est annulé.",
    "Un stop limite la perte, il ne garantit pas le prix : il peut glisser si le marché saute.",
    "Pressé : au marché. Un meilleur prix : limite. Une cassure ou vous protéger : stop.",
  ],
  quiz: [
    { question: "L'euro-dollar est à 1,1000. Vous voulez acheter à 1,0980. Quel ordre ?", options: ["Un buy stop à 1,0980", "Un buy limit à 1,0980", "Un ordre au marché"], correct: 1, explanation: "Acheter moins cher que le prix actuel, à votre prix ou mieux : c'est un ordre à cours limité, le buy limit, placé sous le prix." },
    { question: "Votre buy limit est à 1,0980. Le prix descend à 1,0985 puis remonte. Que se passe-t-il ?", options: ["Vous achetez à 1,0985", "Rien : l'ordre reste en attente", "Vous achetez à 1,0980"], correct: 1, explanation: "Un ordre limite ne passe qu'à son prix ou mieux. Le prix n'est pas venu à 1,0980 : l'ordre n'est pas exécuté, il attend toujours." },
    { question: "Que fait un ordre stop quand le prix touche son niveau ?", options: ["Il passe exactement à ce prix, garanti", "Il se déclenche et part au marché", "Il s'annule"], correct: 1, explanation: "Déclenché, un ordre stop devient un ordre au marché : il passe au prix du moment, avec un éventuel slippage si le marché va vite." },
    { question: "Vous avez acheté. Votre stop loss, sous l'achat, est de quel type ?", options: ["Un sell stop", "Un sell limit", "Un buy limit"], correct: 0, explanation: "Le stop loss vend si le prix descend jusqu'à lui : c'est un ordre stop de vente, un sell stop. Le take profit, au-dessus, est un sell limit." },
    { question: "Pourquoi placer un buy stop au-dessus du prix actuel ?", options: ["Pour acheter moins cher", "Pour n'acheter que si le prix casse un niveau", "Pour couper une perte"], correct: 1, explanation: "On accepte de payer un peu plus cher pour n'acheter que si le prix franchit un plafond : c'est l'ordre des cassures." },
  ],
  pratique: [
    { texte: "Ouvrez une position fictive avec un stop loss et un take profit posés avant de cliquer.", href: "/trading", bouton: "Prendre position" },
    { texte: "Retrouvez tous les mots des ordres dans le glossaire.", href: "/learn/glossaire", bouton: "Ouvrir le glossaire" },
  ],
};

export default lecon;
